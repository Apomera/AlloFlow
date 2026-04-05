// ═══════════════════════════════════════════
// stem_tool_singing.js — Singing & Vocal Lab
// Pitch training, vocal range finder, vibrato analysis, interval singing,
// vocal warm-ups & health. Ported from Rachel Pomeranz's vocal studio tools.
// Web Audio API + Canvas rendering.
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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('singing'))) {

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

  // ═══════════════════════════════════════════
  // Music theory functions
  // ═══════════════════════════════════════════

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /**
   * Convert frequency to note information.
   * Returns { note, octave, cents, midi, freq }
   */
  function frequencyToNote(freq) {
    if (freq <= 0) return { note: '--', octave: 0, cents: 0, midi: 0, freq: 0 };
    var midi = 69 + 12 * Math.log2(freq / 440);
    var midiRounded = Math.round(midi);
    var cents = Math.round((midi - midiRounded) * 100);
    var noteIdx = ((midiRounded % 12) + 12) % 12;
    var octave = Math.floor(midiRounded / 12) - 1;
    return {
      note: NOTE_NAMES[noteIdx],
      octave: octave,
      cents: cents,
      midi: midiRounded,
      freq: freq
    };
  }

  /** Convert MIDI note number to frequency */
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** Convert MIDI note number to note name */
  function midiToNoteName(midi) {
    var noteIdx = ((midi % 12) + 12) % 12;
    var octave = Math.floor(midi / 12) - 1;
    return {
      note: NOTE_NAMES[noteIdx],
      octave: octave,
      str: NOTE_NAMES[noteIdx] + octave
    };
  }

  // ═══════════════════════════════════════════
  // Vibrato analysis — ported from Rachel's biofeedback tools
  // ═══════════════════════════════════════════

  function analyzeVibrato(history) {
    if (!history || history.length < 10) return { rate: 0, depth: 0 };
    var midiValues = history.map(function(h) { return h.midi; });
    var mean = midiValues.reduce(function(a, b) { return a + b; }, 0) / midiValues.length;
    var deviations = midiValues.map(function(m) { return (m - mean) * 100; });
    var variance = deviations.reduce(function(sum, d) { return sum + d * d; }, 0) / deviations.length;
    var depth = Math.sqrt(variance) * 2;
    var crossings = 0;
    for (var i = 1; i < deviations.length; i++) {
      if ((deviations[i] >= 0 && deviations[i - 1] < 0) || (deviations[i] < 0 && deviations[i - 1] >= 0)) crossings++;
    }
    var durationSec = (history[history.length - 1].time - history[0].time) / 1000;
    var rate = durationSec > 0 ? (crossings / 2) / durationSec : 0;
    return { rate: rate, depth: depth };
  }

  // ═══════════════════════════════════════════
  // Reference tone synthesis (shared AudioContext)
  // ═══════════════════════════════════════════

  var _sharedAudioCtx = null;
  var _activeOscillator = null;
  var _activeGain = null;

  function getSharedAudioCtx() {
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_sharedAudioCtx.state === 'suspended') {
      _sharedAudioCtx.resume();
    }
    return _sharedAudioCtx;
  }

  function stopRefTone() {
    if (_activeOscillator) {
      try { _activeOscillator.stop(); } catch(e) { /* ignore */ }
      _activeOscillator = null;
    }
    if (_activeGain) {
      try { _activeGain.disconnect(); } catch(e) { /* ignore */ }
      _activeGain = null;
    }
  }

  /**
   * Play a reference tone at given frequency.
   * duration: seconds (0 = indefinite until stopped)
   * volume: 0-1 (default 0.12)
   */
  function playRefTone(freq, duration, volume) {
    stopRefTone();
    var ctx = getSharedAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime);
    // Soft attack to avoid click
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume || 0.12, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    _activeOscillator = osc;
    _activeGain = gain;
    if (duration && duration > 0) {
      // Soft release
      gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
      setTimeout(function() {
        if (_activeOscillator === osc) {
          _activeOscillator = null;
          _activeGain = null;
        }
      }, duration * 1000 + 100);
    }
    return osc;
  }

  /** Convenience: play a MIDI note */
  function playMidiNote(midi, duration, volume) {
    return playRefTone(midiToFreq(midi), duration, volume);
  }

  /**
   * Play a sequence of MIDI notes (for warm-up exercises).
   * notes: array of { midi, duration } objects
   * Returns a promise that resolves when done.
   */
  function playNoteSequence(notes, volume) {
    return new Promise(function(resolve) {
      var idx = 0;
      function playNext() {
        if (idx >= notes.length) {
          stopRefTone();
          resolve();
          return;
        }
        var n = notes[idx];
        idx++;
        playRefTone(midiToFreq(n.midi), n.duration, volume || 0.12);
        setTimeout(playNext, n.duration * 1000);
      }
      playNext();
    });
  }

  // ═══════════════════════════════════════════
  // Staff notation drawing — ported from Rachel's tools-advanced.js
  // ═══════════════════════════════════════════

  /**
   * Draw a treble clef staff.
   * opts: { x, y, width, lineGap }
   */
  function drawStaff(canvas, opts) {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    var x = opts.x || 20;
    var y = opts.y || 40;
    var w = opts.width || (canvas.width - 40);
    var lineGap = opts.lineGap || 10;
    var isDark = opts.isDark;

    c.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    c.lineWidth = 1;

    // 5 staff lines
    for (var i = 0; i < 5; i++) {
      var ly = y + i * lineGap;
      c.beginPath();
      c.moveTo(x, ly);
      c.lineTo(x + w, ly);
      c.stroke();
    }

    // Treble clef symbol (simplified)
    c.font = (lineGap * 5.5) + 'px serif';
    c.fillStyle = isDark ? '#94a3b8' : '#475569';
    c.textAlign = 'left';
    c.fillText('\u{1D11E}', x + 2, y + lineGap * 4);

    return { staffTop: y, staffBottom: y + lineGap * 4 };
  }

  /**
   * Convert note name + octave to staff Y position.
   * Treble clef: bottom line = E4, top line = F5.
   * Returns Y coordinate.
   */
  function noteToStaffY(noteName, octave, staffTop, lineGap) {
    // Position mapping: each note gets a half-lineGap
    // F5 = staffTop (line 1)
    // E5 = staffTop + lineGap * 0.5
    // D5 = staffTop + lineGap * 1
    // C5 = staffTop + lineGap * 1.5
    // B4 = staffTop + lineGap * 2
    // A4 = staffTop + lineGap * 2.5
    // G4 = staffTop + lineGap * 3
    // F4 = staffTop + lineGap * 3.5
    // E4 = staffTop + lineGap * 4 (bottom line)
    // D4 = staffTop + lineGap * 4.5 (below staff)
    // C4 = staffTop + lineGap * 5 (middle C, one ledger line below)

    // Map note to diatonic position (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
    var diatonicMap = { 'C': 0, 'C#': 0, 'D': 1, 'D#': 1, 'E': 2, 'F': 3, 'F#': 3, 'G': 4, 'G#': 4, 'A': 5, 'A#': 5, 'B': 6 };
    var diatonic = diatonicMap[noteName] !== undefined ? diatonicMap[noteName] : 0;

    // F5 reference: octave 5, diatonic 3 => position 0
    var refOctave = 5;
    var refDiatonic = 3; // F
    var refY = staffTop;
    var halfStep = lineGap / 2;

    var stepsFromRef = (octave - refOctave) * 7 + (diatonic - refDiatonic);
    return refY - stepsFromRef * halfStep;
  }

  /**
   * Draw a note on the staff.
   */
  function drawNoteOnStaff(ctx2d, x, noteName, octave, staffTop, lineGap, color) {
    var y = noteToStaffY(noteName, octave, staffTop, lineGap);
    var r = lineGap * 0.42;
    var halfStep = lineGap / 2;

    // Draw ledger lines if needed
    ctx2d.strokeStyle = color || '#1e293b';
    ctx2d.lineWidth = 1;
    var staffBottom = staffTop + lineGap * 4;

    // Ledger lines above staff
    if (y < staffTop - halfStep) {
      for (var ly = staffTop - lineGap; ly >= y - halfStep; ly -= lineGap) {
        ctx2d.beginPath();
        ctx2d.moveTo(x - r * 1.8, ly);
        ctx2d.lineTo(x + r * 1.8, ly);
        ctx2d.stroke();
      }
    }

    // Ledger lines below staff
    if (y > staffBottom + halfStep) {
      for (var ly = staffBottom + lineGap; ly <= y + halfStep; ly += lineGap) {
        ctx2d.beginPath();
        ctx2d.moveTo(x - r * 1.8, ly);
        ctx2d.lineTo(x + r * 1.8, ly);
        ctx2d.stroke();
      }
    }

    // Note head (filled ellipse)
    ctx2d.fillStyle = color || '#1e293b';
    ctx2d.beginPath();
    ctx2d.ellipse(x, y, r * 1.2, r, -0.3, 0, 2 * Math.PI);
    ctx2d.fill();

    // Stem
    var stemDir = y > staffTop + lineGap * 2 ? -1 : 1; // up if below middle, down if above
    var stemLen = lineGap * 3.5;
    ctx2d.beginPath();
    ctx2d.moveTo(x + (stemDir === -1 ? r * 1.1 : -r * 1.1), y);
    ctx2d.lineTo(x + (stemDir === -1 ? r * 1.1 : -r * 1.1), y + stemDir * stemLen);
    ctx2d.strokeStyle = color || '#1e293b';
    ctx2d.lineWidth = 1.5;
    ctx2d.stroke();

    // Sharp symbol if needed
    if (noteName.indexOf('#') !== -1) {
      ctx2d.font = (lineGap * 1.4) + 'px sans-serif';
      ctx2d.fillStyle = color || '#1e293b';
      ctx2d.textAlign = 'right';
      ctx2d.fillText('#', x - r * 1.6, y + lineGap * 0.35);
    }
  }

  // ═══════════════════════════════════════════
  // Canvas visualization functions
  // ═══════════════════════════════════════════

  /**
   * Draw the piano roll — pitch over time mapped to musical notes.
   */
  function drawPitchRoll(canvas, history, opts) {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var isDark = opts && opts.isDark;
    var minMidi = (opts && opts.minMidi) || 36; // C2
    var maxMidi = (opts && opts.maxMidi) || 84; // C6

    c.clearRect(0, 0, W, H);
    c.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
    c.fillRect(0, 0, W, H);

    var labelW = 32;
    var plotX = labelW;
    var plotW = W - labelW;
    var plotH = H;
    var midiRange = maxMidi - minMidi;

    // Horizontal gridlines at each note with labels
    c.font = '8px monospace';
    c.textAlign = 'right';
    for (var m = minMidi; m <= maxMidi; m++) {
      var noteInfo = midiToNoteName(m);
      var noteY = plotH - ((m - minMidi) / midiRange) * plotH;

      // Only draw C and E and G and A lines for readability
      var isC = noteInfo.note === 'C';
      var isNatural = noteInfo.note.indexOf('#') === -1;

      if (isC) {
        c.strokeStyle = isDark ? '#334155' : '#cbd5e1';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(plotX, noteY);
        c.lineTo(W, noteY);
        c.stroke();
        c.fillStyle = isDark ? '#94a3b8' : '#64748b';
        c.fillText(noteInfo.str, labelW - 3, noteY + 3);
      } else if (isNatural) {
        c.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
        c.lineWidth = 0.5;
        c.beginPath();
        c.moveTo(plotX, noteY);
        c.lineTo(W, noteY);
        c.stroke();
      }
    }

    // Draw pitch history line
    if (!history || history.length < 2) {
      c.fillStyle = isDark ? '#64748b' : '#94a3b8';
      c.textAlign = 'center';
      c.font = '13px sans-serif';
      c.fillText('Start singing to see your pitch', W / 2, H / 2);
      return;
    }

    // Glow effect
    c.shadowColor = '#f43f5e';
    c.shadowBlur = 6;

    c.beginPath();
    c.lineWidth = 2.5;
    c.strokeStyle = '#f43f5e';
    var started = false;
    for (var i = 0; i < history.length; i++) {
      var entry = history[i];
      if (!entry || entry.midi <= 0) { started = false; continue; }
      var px = plotX + (i / (history.length - 1)) * plotW;
      var py = plotH - ((entry.midi - minMidi) / midiRange) * plotH;
      if (py < 0 || py > H) { started = false; continue; }
      if (!started) {
        c.stroke();
        c.beginPath();
        var centsAbs = Math.abs(entry.cents || 0);
        c.strokeStyle = centsAbs <= 10 ? '#22c55e' : centsAbs <= 25 ? '#eab308' : '#ef4444';
        c.moveTo(px, py);
        started = true;
      } else {
        var centsAbs = Math.abs(entry.cents || 0);
        c.strokeStyle = centsAbs <= 10 ? '#22c55e' : centsAbs <= 25 ? '#eab308' : '#ef4444';
        c.lineTo(px, py);
      }
    }
    c.stroke();
    c.shadowBlur = 0;

    // Current pitch dot
    var last = history[history.length - 1];
    if (last && last.midi > 0) {
      var dotY = plotH - ((last.midi - minMidi) / midiRange) * plotH;
      var cAbs = Math.abs(last.cents || 0);
      var dotColor = cAbs <= 10 ? '#22c55e' : cAbs <= 25 ? '#eab308' : '#ef4444';
      c.beginPath();
      c.arc(W - 8, dotY, 5, 0, 2 * Math.PI);
      c.fillStyle = dotColor;
      c.fill();

      // Note label near dot
      c.font = 'bold 11px sans-serif';
      c.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      c.textAlign = 'right';
      c.fillText(last.noteStr || '', W - 18, dotY - 8);
    }
  }

  /**
   * Draw cents meter — horizontal needle gauge from -50 to +50.
   */
  function drawCentsMeter(canvas, cents, isDark) {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    c.clearRect(0, 0, W, H);

    c.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    c.fillRect(0, 0, W, H);

    var barY = 14;
    var barH = 14;
    var barX = 30;
    var barW = W - 60;
    var center = barX + barW / 2;

    // Background track
    c.fillStyle = isDark ? '#334155' : '#e2e8f0';
    c.fillRect(barX, barY, barW, barH);

    // Green zone in center (±10 cents)
    var greenW = (10 / 50) * (barW / 2);
    c.fillStyle = isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.2)';
    c.fillRect(center - greenW, barY, greenW * 2, barH);

    // Yellow zone (±10 to ±25)
    var yellowW = (25 / 50) * (barW / 2);
    c.fillStyle = isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.12)';
    c.fillRect(center - yellowW, barY, yellowW - greenW, barH);
    c.fillRect(center + greenW, barY, yellowW - greenW, barH);

    // Center line
    c.strokeStyle = isDark ? '#94a3b8' : '#475569';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(center, barY - 2);
    c.lineTo(center, barY + barH + 2);
    c.stroke();

    // Labels
    c.font = '8px sans-serif';
    c.fillStyle = isDark ? '#64748b' : '#94a3b8';
    c.textAlign = 'center';
    c.fillText('Flat', barX + 10, barY + barH + 12);
    c.fillText('Sharp', barX + barW - 10, barY + barH + 12);
    c.fillText('0', center, barY + barH + 12);

    // Needle
    var clampedCents = Math.min(50, Math.max(-50, cents || 0));
    var needleX = center + (clampedCents / 50) * (barW / 2);
    var cAbs = Math.abs(clampedCents);
    var needleColor = cAbs <= 10 ? '#22c55e' : cAbs <= 25 ? '#eab308' : '#ef4444';

    c.beginPath();
    c.moveTo(needleX, barY - 4);
    c.lineTo(needleX - 4, barY - 10);
    c.lineTo(needleX + 4, barY - 10);
    c.closePath();
    c.fillStyle = needleColor;
    c.fill();

    // Cents value
    c.font = 'bold 10px sans-serif';
    c.fillStyle = needleColor;
    c.textAlign = 'center';
    c.fillText((clampedCents > 0 ? '+' : '') + Math.round(clampedCents) + '\u00A2', needleX, barY - 13);
  }

  /**
   * Draw vibrato trace — ±50 cents deviation from mean pitch.
   */
  function drawVibratoTrace(canvas, history, isDark) {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    c.clearRect(0, 0, W, H);

    c.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
    c.fillRect(0, 0, W, H);

    if (!history || history.length < 10) {
      c.fillStyle = isDark ? '#64748b' : '#94a3b8';
      c.textAlign = 'center';
      c.font = '12px sans-serif';
      c.fillText('Sustain a note to see vibrato waveform', W / 2, H / 2);
      return;
    }

    // Calculate mean MIDI for the window
    var midiVals = history.map(function(h) { return h.midi; });
    var mean = midiVals.reduce(function(a, b) { return a + b; }, 0) / midiVals.length;

    // Center line at 0
    var centerY = H / 2;
    var scaleY = H / 100; // ±50 cents maps to full height

    // Grid lines
    c.strokeStyle = isDark ? '#334155' : '#e2e8f0';
    c.lineWidth = 0.5;
    c.setLineDash([3, 3]);
    var gridCents = [-40, -20, 0, 20, 40];
    c.font = '8px sans-serif';
    c.textAlign = 'right';
    c.fillStyle = isDark ? '#64748b' : '#94a3b8';
    for (var gi = 0; gi < gridCents.length; gi++) {
      var gy = centerY - gridCents[gi] * scaleY;
      c.beginPath();
      c.moveTo(30, gy);
      c.lineTo(W, gy);
      c.stroke();
      c.fillText(gridCents[gi] + '\u00A2', 28, gy + 3);
    }
    c.setLineDash([]);

    // Center line (bolder)
    c.strokeStyle = isDark ? '#475569' : '#94a3b8';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(30, centerY);
    c.lineTo(W, centerY);
    c.stroke();

    // Draw deviation waveform
    c.beginPath();
    c.strokeStyle = '#8b5cf6';
    c.lineWidth = 2;
    c.shadowColor = '#8b5cf6';
    c.shadowBlur = 4;
    for (var i = 0; i < history.length; i++) {
      var deviation = (history[i].midi - mean) * 100; // in cents
      var px = 30 + (i / (history.length - 1)) * (W - 30);
      var py = centerY - deviation * scaleY;
      py = Math.max(4, Math.min(H - 4, py));
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    c.shadowBlur = 0;
  }

  /**
   * Draw piano keyboard visualization with highlighted range.
   */
  function drawPianoKeyboard(canvas, lowMidi, highMidi, highlightLow, highlightHigh, isDark, clickCallback) {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    c.clearRect(0, 0, W, H);

    c.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    c.fillRect(0, 0, W, H);

    var totalWhiteKeys = 0;
    var whiteKeyMidis = [];
    for (var m = lowMidi; m <= highMidi; m++) {
      var n = midiToNoteName(m);
      if (n.note.indexOf('#') === -1) {
        totalWhiteKeys++;
        whiteKeyMidis.push(m);
      }
    }

    if (totalWhiteKeys === 0) return;

    var keyW = Math.min(28, (W - 4) / totalWhiteKeys);
    var keyH = H - 20;
    var startX = (W - totalWhiteKeys * keyW) / 2;
    var blackKeyW = keyW * 0.6;
    var blackKeyH = keyH * 0.6;

    // Store key rects for click handling
    var keyRects = [];

    // White keys
    var whiteIdx = 0;
    for (var m = lowMidi; m <= highMidi; m++) {
      var n = midiToNoteName(m);
      if (n.note.indexOf('#') !== -1) continue;

      var x = startX + whiteIdx * keyW;
      var isHighlighted = highlightLow && highlightHigh && m >= highlightLow && m <= highlightHigh;

      // Key background
      c.fillStyle = isHighlighted
        ? (isDark ? '#166534' : '#bbf7d0')
        : '#ffffff';
      c.fillRect(x + 1, 0, keyW - 2, keyH);

      // Key border
      c.strokeStyle = isDark ? '#475569' : '#94a3b8';
      c.lineWidth = 1;
      c.strokeRect(x + 1, 0, keyW - 2, keyH);

      // Label on C notes
      if (n.note === 'C') {
        c.font = '7px sans-serif';
        c.fillStyle = isDark ? '#1e293b' : '#64748b';
        c.textAlign = 'center';
        c.fillText(n.str, x + keyW / 2, keyH - 4);
      }

      keyRects.push({ midi: m, x: x + 1, y: 0, w: keyW - 2, h: keyH, black: false });
      whiteIdx++;
    }

    // Black keys (overlay)
    whiteIdx = 0;
    for (var m = lowMidi; m <= highMidi; m++) {
      var n = midiToNoteName(m);
      if (n.note.indexOf('#') !== -1) continue;

      var x = startX + whiteIdx * keyW;

      // Check if there's a sharp above this note
      if (m + 1 <= highMidi) {
        var nextN = midiToNoteName(m + 1);
        if (nextN.note.indexOf('#') !== -1) {
          var bx = x + keyW - blackKeyW / 2;
          var isHighlighted = highlightLow && highlightHigh && (m + 1) >= highlightLow && (m + 1) <= highlightHigh;

          c.fillStyle = isHighlighted
            ? (isDark ? '#15803d' : '#4ade80')
            : (isDark ? '#0f172a' : '#1e293b');
          c.fillRect(bx, 0, blackKeyW, blackKeyH);
          c.strokeStyle = isDark ? '#334155' : '#64748b';
          c.lineWidth = 0.5;
          c.strokeRect(bx, 0, blackKeyW, blackKeyH);

          keyRects.push({ midi: m + 1, x: bx, y: 0, w: blackKeyW, h: blackKeyH, black: true });
        }
      }
      whiteIdx++;
    }

    // Store key rects on canvas for click handling
    canvas._keyRects = keyRects;
  }

  /**
   * Draw interval staff — shows reference note and target note on a staff.
   */
  function drawIntervalStaff(canvas, refMidi, targetMidi, studentMidi, isDark) {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    c.clearRect(0, 0, W, H);

    c.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    c.fillRect(0, 0, W, H);

    var lineGap = 12;
    var staffTop = 30;
    var staffWidth = W - 80;

    // Draw staff
    drawStaff(canvas, { x: 30, y: staffTop, width: staffWidth, lineGap: lineGap, isDark: isDark });

    // Draw reference note
    if (refMidi > 0) {
      var refNote = midiToNoteName(refMidi);
      drawNoteOnStaff(c, W * 0.35, refNote.note, refNote.octave, staffTop, lineGap, isDark ? '#3b82f6' : '#2563eb');
      c.font = '10px sans-serif';
      c.fillStyle = isDark ? '#3b82f6' : '#2563eb';
      c.textAlign = 'center';
      c.fillText('Reference', W * 0.35, H - 4);
      c.fillText(refNote.str, W * 0.35, staffTop - 8);
    }

    // Draw target note
    if (targetMidi > 0) {
      var targetNote = midiToNoteName(targetMidi);
      drawNoteOnStaff(c, W * 0.6, targetNote.note, targetNote.octave, staffTop, lineGap, isDark ? '#22c55e' : '#16a34a');
      c.font = '10px sans-serif';
      c.fillStyle = isDark ? '#22c55e' : '#16a34a';
      c.textAlign = 'center';
      c.fillText('Target', W * 0.6, H - 4);
      c.fillText(targetNote.str, W * 0.6, staffTop - 8);
    }

    // Draw student pitch (if singing)
    if (studentMidi && studentMidi > 0) {
      var stuNote = midiToNoteName(Math.round(studentMidi));
      var stuDiff = targetMidi ? Math.abs(studentMidi - targetMidi) * 100 : 999;
      var stuColor = stuDiff <= 10 ? '#22c55e' : stuDiff <= 25 ? '#eab308' : '#ef4444';
      drawNoteOnStaff(c, W * 0.8, stuNote.note, stuNote.octave, staffTop, lineGap, stuColor);
      c.font = '10px sans-serif';
      c.fillStyle = stuColor;
      c.textAlign = 'center';
      c.fillText('You', W * 0.8, H - 4);
      c.fillText(stuNote.str, W * 0.8, staffTop - 8);
    }
  }

  // ═══════════════════════════════════════════
  // Interval definitions
  // ═══════════════════════════════════════════

  var INTERVALS = [
    { name: 'Unison', semitones: 0, level: 1 },
    { name: 'Octave', semitones: 12, level: 1 },
    { name: 'Perfect 5th', semitones: 7, level: 2 },
    { name: 'Perfect 4th', semitones: 5, level: 2 },
    { name: 'Major 3rd', semitones: 4, level: 3 },
    { name: 'Minor 3rd', semitones: 3, level: 3 },
    { name: 'Major 2nd', semitones: 2, level: 4 },
    { name: 'Minor 2nd', semitones: 1, level: 4 },
    { name: 'Major 6th', semitones: 9, level: 5 },
    { name: 'Minor 6th', semitones: 8, level: 5 },
    { name: 'Tritone', semitones: 6, level: 5 },
    { name: 'Major 7th', semitones: 11, level: 6 },
    { name: 'Minor 7th', semitones: 10, level: 6 }
  ];

  // ═══════════════════════════════════════════
  // Voice type classification
  // ═══════════════════════════════════════════

  function classifyVoiceType(lowMidi) {
    if (lowMidi <= 52) return { type: 'Bass', range: 'E2 - E4', color: '#3b82f6' };
    if (lowMidi <= 57) return { type: 'Baritone', range: 'A2 - A4', color: '#6366f1' };
    if (lowMidi <= 60) return { type: 'Tenor', range: 'C3 - C5', color: '#8b5cf6' };
    if (lowMidi <= 65) return { type: 'Alto', range: 'F3 - F5', color: '#a855f7' };
    if (lowMidi <= 69) return { type: 'Mezzo-soprano', range: 'A3 - A5', color: '#d946ef' };
    return { type: 'Soprano', range: 'C4 - C6', color: '#ec4899' };
  }

  // ═══════════════════════════════════════════
  // Warm-up exercise definitions
  // ═══════════════════════════════════════════

  var WARMUP_EXERCISES = [
    {
      id: 'lip_trills',
      label: 'Lip Trills',
      icon: '\uD83D\uDCA8',
      desc: 'Blow air through loosely closed lips while descending in pitch. This relaxes your vocal folds and warms up your airflow.',
      notes: [
        { midi: 67, duration: 0.5 }, { midi: 65, duration: 0.5 }, { midi: 64, duration: 0.5 },
        { midi: 62, duration: 0.5 }, { midi: 60, duration: 1.0 }
      ],
      duration: 15
    },
    {
      id: 'five_note_scale',
      label: '5-Note Scale',
      icon: '\uD83C\uDFB6',
      desc: 'Sing Do-Re-Mi-Fa-Sol ascending, then descending. Match the reference tones. This builds pitch accuracy.',
      notes: [
        { midi: 60, duration: 0.6 }, { midi: 62, duration: 0.6 }, { midi: 64, duration: 0.6 },
        { midi: 65, duration: 0.6 }, { midi: 67, duration: 0.8 },
        { midi: 65, duration: 0.6 }, { midi: 64, duration: 0.6 }, { midi: 62, duration: 0.6 },
        { midi: 60, duration: 1.0 }
      ],
      duration: 20
    },
    {
      id: 'octave_slides',
      label: 'Octave Slides',
      icon: '\uD83C\uDF99\uFE0F',
      desc: 'Glide smoothly from C4 up to C5 and back down. Use an "ooh" or "ahh" vowel. This stretches your range gently.',
      notes: [
        { midi: 60, duration: 2.0 }, { midi: 72, duration: 2.0 }, { midi: 60, duration: 2.0 }
      ],
      duration: 20
    },
    {
      id: 'staccato_ha',
      label: 'Staccato Ha\'s',
      icon: '\uD83D\uDCAA',
      desc: 'Sing short, detached "Ha!" on each note of an ascending scale. This strengthens your diaphragm support.',
      notes: [
        { midi: 60, duration: 0.3 }, { midi: 62, duration: 0.3 }, { midi: 64, duration: 0.3 },
        { midi: 65, duration: 0.3 }, { midi: 67, duration: 0.3 }, { midi: 69, duration: 0.3 },
        { midi: 71, duration: 0.3 }, { midi: 72, duration: 0.6 }
      ],
      duration: 15
    },
    {
      id: 'messa_di_voce',
      label: 'Messa di Voce',
      icon: '\uD83C\uDF0A',
      desc: 'Start singing a note very quietly, gradually get louder, then gradually get quieter again. This builds dynamic control.',
      notes: [
        { midi: 64, duration: 8.0 }
      ],
      duration: 15
    }
  ];

  // ═══════════════════════════════════════════
  // Reference tone grid notes
  // ═══════════════════════════════════════════

  var REF_TONE_NOTES = [];
  // C3 (48) through G5 (79)
  for (var _m = 48; _m <= 79; _m++) {
    var _n = midiToNoteName(_m);
    // Only natural notes for the grid (sharps accessible via keyboard)
    if (_n.note.indexOf('#') === -1) {
      REF_TONE_NOTES.push({ midi: _m, label: _n.str });
    }
  }

  // ═══════════════════════════════════════════
  // Sight Reading — melody library & exercise generator
  // ═══════════════════════════════════════════

  var SIGHT_READ_MELODIES = [
    {
      id: 'mary', label: 'Mary Had a Little Lamb',
      notes: [
        { midi: 64, dur: 1 }, { midi: 62, dur: 1 }, { midi: 60, dur: 1 }, { midi: 62, dur: 1 },
        { midi: 64, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 2 },
        { midi: 62, dur: 1 }, { midi: 62, dur: 1 }, { midi: 62, dur: 2 },
        { midi: 64, dur: 1 }, { midi: 67, dur: 1 }, { midi: 67, dur: 2 },
        { midi: 64, dur: 1 }, { midi: 62, dur: 1 }, { midi: 60, dur: 1 }, { midi: 62, dur: 1 },
        { midi: 64, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 1 },
        { midi: 62, dur: 1 }, { midi: 62, dur: 1 }, { midi: 64, dur: 1 }, { midi: 62, dur: 1 },
        { midi: 60, dur: 4 }
      ]
    },
    {
      id: 'twinkle', label: 'Twinkle Twinkle',
      notes: [
        { midi: 60, dur: 1 }, { midi: 60, dur: 1 }, { midi: 67, dur: 1 }, { midi: 67, dur: 1 },
        { midi: 69, dur: 1 }, { midi: 69, dur: 1 }, { midi: 67, dur: 2 },
        { midi: 65, dur: 1 }, { midi: 65, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 1 },
        { midi: 62, dur: 1 }, { midi: 62, dur: 1 }, { midi: 60, dur: 2 }
      ]
    },
    {
      id: 'ode', label: 'Ode to Joy',
      notes: [
        { midi: 64, dur: 1 }, { midi: 64, dur: 1 }, { midi: 65, dur: 1 }, { midi: 67, dur: 1 },
        { midi: 67, dur: 1 }, { midi: 65, dur: 1 }, { midi: 64, dur: 1 }, { midi: 62, dur: 1 },
        { midi: 60, dur: 1 }, { midi: 60, dur: 1 }, { midi: 62, dur: 1 }, { midi: 64, dur: 1 },
        { midi: 64, dur: 1.5 }, { midi: 62, dur: 0.5 }, { midi: 62, dur: 2 }
      ]
    },
    {
      id: 'hotcross', label: 'Hot Cross Buns',
      notes: [
        { midi: 64, dur: 1 }, { midi: 62, dur: 1 }, { midi: 60, dur: 2 },
        { midi: 64, dur: 1 }, { midi: 62, dur: 1 }, { midi: 60, dur: 2 },
        { midi: 60, dur: 0.5 }, { midi: 60, dur: 0.5 }, { midi: 60, dur: 0.5 }, { midi: 60, dur: 0.5 },
        { midi: 62, dur: 0.5 }, { midi: 62, dur: 0.5 }, { midi: 62, dur: 0.5 }, { midi: 62, dur: 0.5 },
        { midi: 64, dur: 1 }, { midi: 62, dur: 1 }, { midi: 60, dur: 2 }
      ]
    },
    {
      id: 'frere', label: 'Fr\u00e8re Jacques',
      notes: [
        { midi: 60, dur: 1 }, { midi: 62, dur: 1 }, { midi: 64, dur: 1 }, { midi: 60, dur: 1 },
        { midi: 60, dur: 1 }, { midi: 62, dur: 1 }, { midi: 64, dur: 1 }, { midi: 60, dur: 1 },
        { midi: 64, dur: 1 }, { midi: 65, dur: 1 }, { midi: 67, dur: 2 },
        { midi: 64, dur: 1 }, { midi: 65, dur: 1 }, { midi: 67, dur: 2 }
      ]
    },
    {
      id: 'jingle', label: 'Jingle Bells (Chorus)',
      notes: [
        { midi: 64, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 2 },
        { midi: 64, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 2 },
        { midi: 64, dur: 1 }, { midi: 67, dur: 1 }, { midi: 60, dur: 1 }, { midi: 62, dur: 1 },
        { midi: 64, dur: 4 },
        { midi: 65, dur: 1 }, { midi: 65, dur: 1 }, { midi: 65, dur: 1 }, { midi: 65, dur: 1 },
        { midi: 65, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 1 }, { midi: 64, dur: 1 },
        { midi: 67, dur: 1 }, { midi: 67, dur: 1 }, { midi: 65, dur: 1 }, { midi: 62, dur: 1 },
        { midi: 60, dur: 4 }
      ]
    }
  ];

  /**
   * Procedurally generate a sight-reading exercise.
   * difficulty: 'easy' | 'medium' | 'hard'
   * Returns array of { midi, dur } objects.
   */
  function generateSightReadExercise(difficulty) {
    var config = {
      easy:   { min: 60, max: 72, count: [4, 8],  sharps: false, durs: [1] },
      medium: { min: 59, max: 79, count: [6, 12], sharps: true,  durs: [1, 2] },
      hard:   { min: 57, max: 81, count: [8, 16], sharps: true,  durs: [1, 2, 4] }
    };
    var cfg = config[difficulty] || config.easy;
    var count = cfg.count[0] + Math.floor(Math.random() * (cfg.count[1] - cfg.count[0] + 1));
    var notes = [];
    var current = cfg.min + Math.floor(Math.random() * (cfg.max - cfg.min));

    // Natural note MIDI values (no sharps/flats) for easy mode filtering
    var naturalMidis = {};
    for (var _nm = cfg.min; _nm <= cfg.max; _nm++) {
      if (NOTE_NAMES[_nm % 12].indexOf('#') === -1) naturalMidis[_nm] = true;
    }

    for (var _gi = 0; _gi < count; _gi++) {
      // Prefer stepwise motion (70%), allow leaps (30%)
      var step;
      if (Math.random() < 0.7) {
        // Stepwise: 1-2 semitones
        step = (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.6 ? 2 : 1);
      } else {
        // Leap: 3-7 semitones
        step = (Math.random() < 0.5 ? 1 : -1) * (3 + Math.floor(Math.random() * 5));
      }
      var next = current + step;
      // Clamp to range
      if (next < cfg.min) next = cfg.min + Math.floor(Math.random() * 4);
      if (next > cfg.max) next = cfg.max - Math.floor(Math.random() * 4);

      // Filter sharps in easy mode
      if (!cfg.sharps) {
        // Snap to nearest natural note
        while (next >= cfg.min && next <= cfg.max && !naturalMidis[next]) next++;
        if (next > cfg.max) next = current; // fallback
      }

      current = next;
      var dur = cfg.durs[Math.floor(Math.random() * cfg.durs.length)];
      notes.push({ midi: current, dur: dur });
    }
    return notes;
  }

  /**
   * Draw the sight-reading staff with notes, current highlight, and results.
   */
  function drawSightReadStaff(canvas, notes, currentIdx, results, studentPitchMidi, opts) {
    if (!canvas || !notes || notes.length === 0) return;
    var c = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var isDk = opts && opts.isDark;
    var lineGap = (opts && opts.lineGap) || 12;
    var staffTop = (opts && opts.staffTop) || 40;

    c.clearRect(0, 0, W, H);
    c.fillStyle = isDk ? '#0f172a' : '#f8fafc';
    c.fillRect(0, 0, W, H);

    var staffWidth = W - 60;

    // Draw treble clef staff
    drawStaff(canvas, { x: 20, y: staffTop, width: staffWidth, lineGap: lineGap, isDark: isDk });

    // Calculate horizontal spacing
    var noteAreaX = 70; // after treble clef
    var noteAreaW = W - noteAreaX - 20;
    var spacing = noteAreaW / Math.max(notes.length, 1);

    // Draw each note
    for (var ni = 0; ni < notes.length; ni++) {
      var n = notes[ni];
      var info = midiToNoteName(n.midi);
      var nx = noteAreaX + ni * spacing + spacing / 2;
      var ny = noteToStaffY(info.note, info.octave, staffTop, lineGap);
      var r = lineGap * 0.42;
      var halfStep = lineGap / 2;
      var staffBottom = staffTop + lineGap * 4;

      // Determine note color
      var noteColor;
      if (ni < currentIdx && results && results[ni]) {
        // Completed note
        noteColor = results[ni].correct ? '#22c55e' : '#ef4444';
      } else if (ni === currentIdx) {
        // Current active note — gold
        noteColor = '#eab308';
      } else if (ni < currentIdx) {
        // Skipped / no result
        noteColor = '#94a3b8';
      } else {
        // Upcoming — default
        noteColor = isDk ? '#94a3b8' : '#475569';
      }

      // Ledger lines
      c.strokeStyle = noteColor;
      c.lineWidth = 1;
      if (ny < staffTop - halfStep) {
        for (var ly = staffTop - lineGap; ly >= ny - halfStep; ly -= lineGap) {
          c.beginPath();
          c.moveTo(nx - r * 1.8, ly);
          c.lineTo(nx + r * 1.8, ly);
          c.stroke();
        }
      }
      if (ny > staffBottom + halfStep) {
        for (var ly = staffBottom + lineGap; ly <= ny + halfStep; ly += lineGap) {
          c.beginPath();
          c.moveTo(nx - r * 1.8, ly);
          c.lineTo(nx + r * 1.8, ly);
          c.stroke();
        }
      }

      // Note head
      var isHalf = n.dur === 2;
      var isWhole = n.dur >= 4;

      if (isWhole || isHalf) {
        // Open note head (outlined ellipse)
        c.strokeStyle = noteColor;
        c.lineWidth = 1.8;
        c.beginPath();
        c.ellipse(nx, ny, r * 1.2, r, -0.3, 0, 2 * Math.PI);
        c.stroke();
      } else {
        // Filled note head (quarter or shorter)
        c.fillStyle = noteColor;
        c.beginPath();
        c.ellipse(nx, ny, r * 1.2, r, -0.3, 0, 2 * Math.PI);
        c.fill();
      }

      // Stem (no stem on whole notes)
      if (!isWhole) {
        var stemDir = ny > staffTop + lineGap * 2 ? -1 : 1;
        var stemLen = lineGap * 3.5;
        c.beginPath();
        c.moveTo(nx + (stemDir === -1 ? r * 1.1 : -r * 1.1), ny);
        c.lineTo(nx + (stemDir === -1 ? r * 1.1 : -r * 1.1), ny + stemDir * stemLen);
        c.strokeStyle = noteColor;
        c.lineWidth = 1.5;
        c.stroke();
      }

      // Sharp/flat symbol
      if (info.note.indexOf('#') !== -1) {
        c.font = (lineGap * 1.4) + 'px sans-serif';
        c.fillStyle = noteColor;
        c.textAlign = 'right';
        c.fillText('#', nx - r * 1.6, ny + lineGap * 0.35);
      }

      // Current note highlight ring
      if (ni === currentIdx) {
        c.strokeStyle = '#eab308';
        c.lineWidth = 2.5;
        c.setLineDash([3, 2]);
        c.beginPath();
        c.arc(nx, ny, r * 2, 0, 2 * Math.PI);
        c.stroke();
        c.setLineDash([]);
      }

      // Result dot below staff
      if (ni < currentIdx && results && results[ni]) {
        var dotColor = results[ni].correct ? '#22c55e' : '#ef4444';
        c.beginPath();
        c.arc(nx, staffBottom + lineGap * 2.5, 3, 0, 2 * Math.PI);
        c.fillStyle = dotColor;
        c.fill();
      }

      // Note name label below
      c.font = '9px sans-serif';
      c.fillStyle = isDk ? '#64748b' : '#94a3b8';
      c.textAlign = 'center';
      c.fillText(info.str, nx, staffBottom + lineGap * 3.5);
    }

    // Real-time student pitch indicator (small triangle on right side of staff)
    if (studentPitchMidi && studentPitchMidi > 0 && currentIdx >= 0) {
      var stuInfo = midiToNoteName(Math.round(studentPitchMidi));
      var stuY = noteToStaffY(stuInfo.note, stuInfo.octave, staffTop, lineGap);
      // Clamp to visible range
      stuY = Math.max(staffTop - lineGap * 3, Math.min(staffBottom + lineGap * 3, stuY));
      c.fillStyle = '#f43f5e';
      c.beginPath();
      c.moveTo(W - 15, stuY);
      c.lineTo(W - 5, stuY - 5);
      c.lineTo(W - 5, stuY + 5);
      c.closePath();
      c.fill();
      // Label
      c.font = 'bold 9px sans-serif';
      c.fillStyle = '#f43f5e';
      c.textAlign = 'right';
      c.fillText(stuInfo.str, W - 18, stuY + 3);
    }
  }

  // ═══════════════════════════════════════════
  // Tool Registration
  // ═══════════════════════════════════════════

  window.StemLab.registerTool('singing', {
    icon: '\uD83C\uDFA4',
    label: 'Singing Lab',
    desc: 'Pitch training, vocal range, vibrato analysis, interval singing & music theory',
    color: 'rose',
    category: 'art',
    questHooks: [
      { id: 'find_range', label: 'Discover your vocal range', icon: '\uD83C\uDFBC',
        check: function(d) { return d.rangeLow && d.rangeHigh; },
        progress: function(d) { return (d.rangeLow && d.rangeHigh) ? '\u2713' : '\u2014'; } },
      { id: 'sing_5_intervals', label: 'Sing 5 intervals correctly', icon: '\uD83C\uDFB5',
        check: function(d) { return (d.intervalsCorrect || 0) >= 5; },
        progress: function(d) { return (d.intervalsCorrect || 0) + '/5'; } },
      { id: 'healthy_vibrato', label: 'Achieve healthy vibrato rating', icon: '\uD83C\uDF0A',
        check: function(d) { return d.achievedHealthyVibrato; },
        progress: function(d) { return d.achievedHealthyVibrato ? '\u2713' : '\u2014'; } }
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
        var d = (labToolData.singing) || {};
        var upd = function(key, val) {
          var _k = {};
          _k[key] = val;
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { singing: Object.assign({}, prev.singing || {}, _k) });
          });
        };
        var updAll = function(patch) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { singing: Object.assign({}, prev.singing || {}, patch) });
          });
        };

        // Canvas narration
        if (typeof canvasNarrate === 'function') {
          canvasNarrate('singing', 'init', {
            first: 'Singing and Vocal Lab loaded. This tool helps you train your pitch, discover your vocal range, analyze vibrato, and practice singing intervals. Start by clicking the microphone button.',
            repeat: 'Singing Lab active.',
            terse: 'Singing Lab.'
          }, { debounce: 800 });
        }

        // ── Persisted state ──
        var rangeLow = d.rangeLow || null;
        var rangeHigh = d.rangeHigh || null;
        var rangeHistory = d.rangeHistory || [];
        var intervalsCorrect = d.intervalsCorrect || 0;
        var intervalScores = d.intervalScores || {};
        var achievedHealthyVibrato = d.achievedHealthyVibrato || false;
        var warmUpsCompleted = d.warmUpsCompleted || 0;
        var bestStreak = d.bestStreak || 0;

        // ── Tab state ──
        var TABS = [
          { id: 'pitch', label: 'Pitch Detective', icon: '\uD83C\uDFAF' },
          { id: 'range', label: 'Vocal Range', icon: '\uD83C\uDFB9' },
          { id: 'vibrato', label: 'Vibrato Lab', icon: '\uD83C\uDF0A' },
          { id: 'intervals', label: 'Interval Singer', icon: '\uD83C\uDFB5' },
          { id: 'warmups', label: 'Warm-ups', icon: '\u2764\uFE0F' },
          { id: 'sightread', label: 'Sight Reading', icon: '\uD83C\uDFBC' }
        ];

        var tabState = React.useState('pitch');
        var activeTab = tabState[0];
        var setActiveTab = tabState[1];

        // ── Audio engine refs ──
        var audioCtxRef = React.useRef(null);
        var analyserRef = React.useRef(null);
        var streamRef = React.useRef(null);
        var animFrameRef = React.useRef(null);
        var sourceRef = React.useRef(null);

        // ── Recording state ──
        var recordingState = React.useState(false);
        var isRecording = recordingState[0];
        var setIsRecording = recordingState[1];

        var micErrorState = React.useState(null);
        var micError = micErrorState[0];
        var setMicError = micErrorState[1];

        // ── Real-time pitch data ──
        var pitchHistoryState = React.useState([]);
        var pitchHistory = pitchHistoryState[0];
        var setPitchHistory = pitchHistoryState[1];

        var currentNoteState = React.useState({ note: '--', octave: 0, cents: 0, midi: 0, freq: 0 });
        var currentNote = currentNoteState[0];
        var setCurrentNote = currentNoteState[1];

        // ── Canvas refs ──
        var pitchRollCanvasRef = React.useRef(null);
        var centsMeterCanvasRef = React.useRef(null);
        var vibratoCanvasRef = React.useRef(null);
        var rangeKeyboardCanvasRef = React.useRef(null);
        var intervalStaffCanvasRef = React.useRef(null);

        // ── Ref tone state ──
        var refTonePlayingState = React.useState(null);
        var refTonePlaying = refTonePlayingState[0];
        var setRefTonePlaying = refTonePlayingState[1];

        // ── Pitch match game state ──
        var pitchMatchState = React.useState('idle'); // 'idle' | 'playing' | 'matched'
        var pitchMatchMode = pitchMatchState[0];
        var setPitchMatchMode = pitchMatchState[1];

        var pitchMatchTargetState = React.useState(null);
        var pitchMatchTarget = pitchMatchTargetState[0];
        var setPitchMatchTarget = pitchMatchTargetState[1];

        var pitchMatchScoreState = React.useState(null);
        var pitchMatchScore = pitchMatchScoreState[0];
        var setPitchMatchScore = pitchMatchScoreState[1];

        var pitchMatchTimerRef = React.useRef(null);
        var pitchMatchStartRef = React.useRef(null);
        var pitchMatchLockedRef = React.useRef(0);

        // ── Vocal range finder state ──
        var rangeStepState = React.useState(0); // 0=idle, 1=finding low, 2=finding high, 3=done
        var rangeStep = rangeStepState[0];
        var setRangeStep = rangeStepState[1];

        var rangeLowTempState = React.useState(null);
        var rangeLowTemp = rangeLowTempState[0];
        var setRangeLowTemp = rangeLowTempState[1];

        var rangeHighTempState = React.useState(null);
        var rangeHighTemp = rangeHighTempState[0];
        var setRangeHighTemp = rangeHighTempState[1];

        var rangeStableCountRef = React.useRef(0);
        var rangeLastMidiRef = React.useRef(0);

        // ── Vibrato state ──
        var vibratoHistoryState = React.useState([]);
        var vibratoHistory = vibratoHistoryState[0];
        var setVibratoHistory = vibratoHistoryState[1];

        var vibratoResultState = React.useState({ rate: 0, depth: 0 });
        var vibratoResult = vibratoResultState[0];
        var setVibratoResult = vibratoResultState[1];

        var vibratoExerciseState = React.useState(null);
        var vibratoExercise = vibratoExerciseState[0];
        var setVibratoExercise = vibratoExerciseState[1];

        // ── Interval singer state ──
        var intervalLevelState = React.useState(1);
        var intervalLevel = intervalLevelState[0];
        var setIntervalLevel = intervalLevelState[1];

        var intervalDirectionState = React.useState('up');
        var intervalDirection = intervalDirectionState[0];
        var setIntervalDirection = intervalDirectionState[1];

        var intervalActiveState = React.useState(null); // { interval, refMidi, targetMidi, direction }
        var intervalActive = intervalActiveState[0];
        var setIntervalActive = intervalActiveState[1];

        var intervalResultState = React.useState(null);
        var intervalResult = intervalResultState[0];
        var setIntervalResult = intervalResultState[1];

        var intervalStreakState = React.useState(0);
        var intervalStreak = intervalStreakState[0];
        var setIntervalStreak = intervalStreakState[1];

        var intervalStartRef = React.useRef(null);
        var intervalLockedRef = React.useRef(0);

        // ── Warm-up state ──
        var warmupActiveState = React.useState(null);
        var warmupActive = warmupActiveState[0];
        var setWarmupActive = warmupActiveState[1];

        var warmupTimerState = React.useState(0);
        var warmupTimer = warmupTimerState[0];
        var setWarmupTimer = warmupTimerState[1];

        var warmupTimerRefId = React.useRef(null);
        var warmupPlayingRef = React.useRef(false);

        // ── Vocal health tips state ──
        var healthTipsState = React.useState(null);
        var healthTips = healthTipsState[0];
        var setHealthTips = healthTipsState[1];

        var healthLoadingState = React.useState(false);
        var healthLoading = healthLoadingState[0];
        var setHealthLoading = healthLoadingState[1];

        // ── Sight reading state ──
        var srDifficultyState = React.useState('easy');
        var srDifficulty = srDifficultyState[0];
        var setSrDifficulty = srDifficultyState[1];

        var srSourceState = React.useState('generate'); // 'generate' | 'melody' | 'ai'
        var srSource = srSourceState[0];
        var setSrSource = srSourceState[1];

        var srMelodyIdState = React.useState('mary');
        var srMelodyId = srMelodyIdState[0];
        var setSrMelodyId = srMelodyIdState[1];

        var srNotesState = React.useState(null); // array of {midi, dur} or null
        var srNotes = srNotesState[0];
        var setSrNotes = srNotesState[1];

        var srModeState = React.useState('idle'); // 'idle' | 'preview' | 'singing' | 'done'
        var srMode = srModeState[0];
        var setSrMode = srModeState[1];

        var srCurrentIdxState = React.useState(-1);
        var srCurrentIdx = srCurrentIdxState[0];
        var setSrCurrentIdx = srCurrentIdxState[1];

        var srResultsState = React.useState([]); // [{correct, cents, attempts}]
        var srResults = srResultsState[0];
        var setSrResults = srResultsState[1];

        var srTempoState = React.useState(60);
        var srTempo = srTempoState[0];
        var setSrTempo = srTempoState[1];

        var srStartTimeState = React.useState(null);
        var srStartTime = srStartTimeState[0];
        var setSrStartTime = srStartTimeState[1];

        var srLockedRef = React.useRef(0);
        var srAttemptsRef = React.useRef(0);
        var srCentsAccRef = React.useRef(0);
        var srPreviewTimerRef = React.useRef(null);
        var srAiLoadingState = React.useState(false);
        var srAiLoading = srAiLoadingState[0];
        var setSrAiLoading = srAiLoadingState[1];

        var sightReadCanvasRef = React.useRef(null);

        // ════════════════════════════════════════
        // Audio Engine: Start / Stop
        // ══���═════════════════════════════════════

        var startMic = React.useCallback(function() {
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

              setIsRecording(true);

              if (announceToSR) announceToSR('Microphone active. Sing or hum to see your pitch visualized.');

              var bufLen = analyser.fftSize;
              var buf = new Float32Array(bufLen);
              var sampleRate = audioCtx.sampleRate;

              function analyzeLoop() {
                analyser.getFloatTimeDomainData(buf);
                var rms = calculateRMS(buf);
                var pitch = autoCorrelate(buf, sampleRate);

                if (pitch > 0 && pitch > 50 && pitch < 2000) {
                  var noteInfo = frequencyToNote(pitch);
                  noteInfo.noteStr = noteInfo.note + noteInfo.octave;
                  noteInfo.time = Date.now();
                  // Fractional MIDI for smooth vibrato tracking
                  noteInfo.midi = 69 + 12 * Math.log2(pitch / 440);

                  setCurrentNote(noteInfo);
                  setPitchHistory(function(prev) {
                    var next = prev.concat([noteInfo]);
                    if (next.length > 300) next = next.slice(-300);
                    return next;
                  });

                  // Feed vibrato history (last ~3 seconds at ~30fps = ~90 samples)
                  setVibratoHistory(function(prev) {
                    var next = prev.concat([{ midi: noteInfo.midi, time: noteInfo.time }]);
                    if (next.length > 120) next = next.slice(-120);
                    return next;
                  });
                } else {
                  setCurrentNote({ note: '--', octave: 0, cents: 0, midi: 0, freq: 0, time: Date.now() });
                }

                animFrameRef.current = requestAnimationFrame(analyzeLoop);
              }

              analyzeLoop();
            })
            .catch(function(err) {
              console.error('[Singing] Mic error:', err);
              setMicError('Could not access microphone. Please allow microphone permissions and try again.');
              if (announceToSR) announceToSR('Microphone access denied. Please allow microphone permissions.');
            });
        }, [isRecording]);

        var stopMic = React.useCallback(function() {
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
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
        }, []);

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
            stopRefTone();
            if (warmupTimerRefId.current) clearInterval(warmupTimerRefId.current);
            if (pitchMatchTimerRef.current) clearTimeout(pitchMatchTimerRef.current);
            if (srPreviewTimerRef.current) clearTimeout(srPreviewTimerRef.current);
          };
        }, []);

        // ════════════════════════════════════════
        // Canvas redraw effects
        // ════════════════════════════════════════

        // Pitch roll canvas
        React.useEffect(function() {
          drawPitchRoll(pitchRollCanvasRef.current, pitchHistory, { isDark: isDark });
        }, [pitchHistory, isDark]);

        // Cents meter canvas
        React.useEffect(function() {
          drawCentsMeter(centsMeterCanvasRef.current, currentNote.cents, isDark);
        }, [currentNote, isDark]);

        // Vibrato trace canvas
        React.useEffect(function() {
          drawVibratoTrace(vibratoCanvasRef.current, vibratoHistory, isDark);
          // Live vibrato analysis
          if (vibratoHistory.length >= 20) {
            var result = analyzeVibrato(vibratoHistory);
            setVibratoResult(result);

            // Check for healthy vibrato achievement
            if (!achievedHealthyVibrato && result.rate >= 5 && result.rate <= 7 && result.depth >= 30 && result.depth <= 80) {
              upd('achievedHealthyVibrato', true);
              if (addToast) addToast('Healthy vibrato achieved!', 'success');
              if (stemCelebrate) stemCelebrate();
              if (awardStemXP) awardStemXP(15, 'Singing: healthy vibrato');
            }
          }
        }, [vibratoHistory, isDark]);

        // Range keyboard canvas
        React.useEffect(function() {
          if (rangeKeyboardCanvasRef.current) {
            drawPianoKeyboard(
              rangeKeyboardCanvasRef.current,
              36, 84, // C2 to C6
              rangeLow || rangeLowTemp,
              rangeHigh || rangeHighTemp,
              isDark
            );
          }
        }, [rangeLow, rangeHigh, rangeLowTemp, rangeHighTemp, isDark]);

        // Interval staff canvas
        React.useEffect(function() {
          if (intervalStaffCanvasRef.current && intervalActive) {
            drawIntervalStaff(
              intervalStaffCanvasRef.current,
              intervalActive.refMidi,
              intervalActive.targetMidi,
              currentNote.midi > 0 ? currentNote.midi : null,
              isDark
            );
          }
        }, [intervalActive, currentNote, isDark]);

        // Sight reading staff canvas
        React.useEffect(function() {
          if (sightReadCanvasRef.current && srNotes) {
            drawSightReadStaff(
              sightReadCanvasRef.current,
              srNotes,
              srCurrentIdx,
              srResults,
              (srMode === 'singing' && currentNote.midi > 0) ? currentNote.midi : null,
              { isDark: isDark }
            );
          }
        }, [srNotes, srCurrentIdx, srResults, currentNote, isDark, srMode]);

        // Sight reading pitch detection logic
        React.useEffect(function() {
          if (srMode !== 'singing' || !srNotes || srCurrentIdx < 0 || srCurrentIdx >= srNotes.length) return;
          if (currentNote.midi <= 0) {
            srLockedRef.current = Math.max(0, srLockedRef.current - 1);
            return;
          }

          var targetMidi = srNotes[srCurrentIdx].midi;
          var diff = Math.abs(currentNote.midi - targetMidi);
          var centsOff = diff * 100;

          if (centsOff <= 25) {
            // Within tolerance
            srLockedRef.current++;
            srCentsAccRef.current += centsOff;

            if (srLockedRef.current >= 30) {
              // Note matched — advance
              var avgCents = Math.round(srCentsAccRef.current / 30);
              var isCorrect = srAttemptsRef.current === 0;
              var result = { correct: isCorrect, cents: avgCents, attempts: srAttemptsRef.current };

              setSrResults(function(prev) { return prev.concat([result]); });

              var nextIdx = srCurrentIdx + 1;
              if (nextIdx >= srNotes.length) {
                // Exercise complete
                setSrCurrentIdx(nextIdx);
                setSrMode('done');
                stopRefTone();
                if (stemBeep) stemBeep('coin');
                if (stemCelebrate) stemCelebrate();
                if (awardStemXP) awardStemXP(15, 'Singing: sight reading complete');
              } else {
                setSrCurrentIdx(nextIdx);
                srLockedRef.current = 0;
                srAttemptsRef.current = 0;
                srCentsAccRef.current = 0;
                if (stemBeep) stemBeep('coin');
              }
            }
          } else {
            // Outside tolerance — count as missed frame
            if (srLockedRef.current > 0) {
              srLockedRef.current = Math.max(0, srLockedRef.current - 2);
            }
            if (centsOff > 50) {
              srAttemptsRef.current++;
            }
          }
        }, [currentNote, srMode, srCurrentIdx, srNotes]);

        // ════════════════════════════════════════
        // Pitch match game logic
        // ════════════════════════════════════════

        React.useEffect(function() {
          if (pitchMatchMode !== 'playing' || !pitchMatchTarget) return;
          if (currentNote.midi <= 0) {
            pitchMatchLockedRef.current = 0;
            return;
          }
          var diff = Math.abs(currentNote.midi - pitchMatchTarget);
          if (diff * 100 <= 10) { // within 10 cents
            pitchMatchLockedRef.current++;
            // Need ~30 frames of lock (about 1 second)
            if (pitchMatchLockedRef.current >= 30) {
              var elapsed = (Date.now() - pitchMatchStartRef.current) / 1000;
              var score = Math.max(0, Math.round(100 - elapsed * 10));
              setPitchMatchScore(score);
              setPitchMatchMode('matched');
              stopRefTone();
              if (addToast) addToast('Pitch matched! Score: ' + score, 'success');
              if (stemCelebrate) stemCelebrate();
              if (awardStemXP) awardStemXP(5, 'Singing: pitch match');
              if (stemBeep) stemBeep('coin');
            }
          } else {
            pitchMatchLockedRef.current = Math.max(0, pitchMatchLockedRef.current - 2);
          }
        }, [currentNote, pitchMatchMode, pitchMatchTarget]);

        // ════════════════════════════════════════
        // Vocal range detection logic
        // ════════════════════════════════════════

        React.useEffect(function() {
          if (rangeStep === 0 || rangeStep === 3) return;
          if (currentNote.midi <= 0) {
            rangeStableCountRef.current = 0;
            return;
          }

          var roundedMidi = Math.round(currentNote.midi);
          if (Math.abs(roundedMidi - rangeLastMidiRef.current) <= 1) {
            rangeStableCountRef.current++;
          } else {
            rangeStableCountRef.current = 0;
            rangeLastMidiRef.current = roundedMidi;
          }

          // Stable for ~30 frames (~1 second)
          if (rangeStableCountRef.current >= 30) {
            if (rangeStep === 1) {
              setRangeLowTemp(roundedMidi);
              setRangeStep(2);
              rangeStableCountRef.current = 0;
              rangeLastMidiRef.current = 0;
              if (addToast) addToast('Lowest note captured: ' + midiToNoteName(roundedMidi).str, 'success');
              if (stemBeep) stemBeep('coin');
            } else if (rangeStep === 2) {
              setRangeHighTemp(roundedMidi);
              setRangeStep(3);
              rangeStableCountRef.current = 0;

              // Save to persistent state
              var low = rangeLowTemp || roundedMidi;
              var high = roundedMidi;
              if (low > high) { var tmp = low; low = high; high = tmp; }
              updAll({
                rangeLow: low,
                rangeHigh: high,
                rangeHistory: (rangeHistory || []).concat([{
                  date: new Date().toISOString().slice(0, 10),
                  low: low,
                  high: high,
                  span: high - low
                }])
              });
              if (addToast) addToast('Vocal range found! ' + midiToNoteName(low).str + ' to ' + midiToNoteName(high).str, 'success');
              if (stemCelebrate) stemCelebrate();
              if (awardStemXP) awardStemXP(20, 'Singing: vocal range discovered');
            }
          }
        }, [currentNote, rangeStep]);

        // ════════════════════════════════════════
        // Interval singing detection logic
        // ════════════════════════════════════════

        React.useEffect(function() {
          if (!intervalActive || intervalResult) return;
          if (currentNote.midi <= 0) {
            intervalLockedRef.current = 0;
            return;
          }

          var diff = Math.abs(currentNote.midi - intervalActive.targetMidi);
          if (diff * 100 <= 15) { // within 15 cents = correct
            intervalLockedRef.current++;
            if (intervalLockedRef.current >= 25) { // ~0.8 sec locked
              var elapsed = (Date.now() - intervalStartRef.current) / 1000;
              var centsOff = Math.round(diff * 100);
              var score = Math.max(0, Math.round(100 - centsOff - elapsed * 5));

              setIntervalResult({ correct: true, centsOff: centsOff, time: elapsed, score: score });
              var newStreak = intervalStreak + 1;
              setIntervalStreak(newStreak);
              stopRefTone();

              var newCorrect = intervalsCorrect + 1;
              var scorePatch = {};
              var intName = intervalActive.interval.name;
              var prev = intervalScores[intName] || { attempts: 0, correct: 0 };
              scorePatch[intName] = { attempts: prev.attempts + 1, correct: prev.correct + 1 };
              updAll({
                intervalsCorrect: newCorrect,
                intervalScores: Object.assign({}, intervalScores, scorePatch),
                bestStreak: Math.max(bestStreak, newStreak)
              });

              if (stemBeep) stemBeep('coin');
              if (newCorrect >= 5 && newCorrect - 1 < 5) {
                if (stemCelebrate) stemCelebrate();
                if (addToast) addToast('Quest complete: 5 intervals!', 'success');
                if (awardStemXP) awardStemXP(25, 'Singing: 5 intervals correct');
              } else {
                if (awardStemXP) awardStemXP(5, 'Singing: correct interval');
              }
            }
          } else {
            intervalLockedRef.current = Math.max(0, intervalLockedRef.current - 2);
          }
        }, [currentNote, intervalActive, intervalResult]);

        // ════════════════════════════════════════
        // Shared styles
        // ════════════════════════════════════════

        var cardClass = isDark
          ? 'bg-slate-800 border border-slate-700 rounded-xl p-4'
          : 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm';
        var headingClass = isDark ? 'text-white font-bold' : 'text-slate-900 font-bold';
        var subTextClass = isDark ? 'text-slate-400 text-xs' : 'text-slate-500 text-xs';
        var btnPrimary = 'px-4 py-2 rounded-lg font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
          (isDark ? 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-400' : 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500');
        var btnSecondary = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 ' +
          (isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 focus:ring-slate-500' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400');
        var btnDanger = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 ' +
          (isDark ? 'bg-red-700 hover:bg-red-600 text-white focus:ring-red-400' : 'bg-red-100 hover:bg-red-200 text-red-700 focus:ring-red-400');

        // ════════════════════════════════════════
        // Mic toggle button (shared across tabs)
        // ════════════════════════════════════════

        function renderMicToggle() {
          return h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', {
              className: isRecording
                ? (btnDanger + ' flex items-center gap-2')
                : (btnPrimary + ' flex items-center gap-2'),
              onClick: function() {
                if (isRecording) stopMic();
                else startMic();
              },
              'aria-label': isRecording ? 'Stop microphone' : 'Start microphone'
            },
              h('span', null, isRecording ? '\u23F9' : '\uD83C\uDFA4'),
              isRecording ? 'Stop Mic' : 'Start Mic'),
            isRecording && h('div', {
              className: 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ' +
                (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-50 text-red-600'),
              role: 'status',
              'aria-live': 'polite'
            }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse' }), 'Listening'),
            micError && h('div', {
              className: 'text-xs text-red-500 ml-2',
              role: 'alert'
            }, micError)
          );
        }

        // ════════════════════════════════════════
        // Tab 1: Pitch Detective
        // ════════════════════════════════════════

        function renderPitchDetective() {
          // Note display color
          var centsAbs = Math.abs(currentNote.cents || 0);
          var noteColor = currentNote.midi <= 0 ? (isDark ? '#64748b' : '#94a3b8')
            : centsAbs <= 10 ? '#22c55e'
            : centsAbs <= 25 ? '#eab308'
            : '#ef4444';
          var noteLabel = currentNote.midi <= 0 ? '--'
            : centsAbs <= 10 ? 'On Pitch'
            : centsAbs <= 25 ? 'Close'
            : 'Off Pitch';

          return h('div', { className: 'space-y-4' },
            renderMicToggle(),

            // Note display
            h('div', { className: cardClass + ' text-center' },
              h('div', {
                className: 'text-5xl font-black mb-1',
                style: { color: noteColor },
                role: 'status',
                'aria-live': 'polite',
                'aria-label': 'Current note: ' + (currentNote.note || '--') + (currentNote.octave || '')
              }, currentNote.note !== '--' ? currentNote.note + currentNote.octave : '--'),
              h('div', {
                className: 'text-sm font-semibold mb-2',
                style: { color: noteColor }
              }, noteLabel),
              currentNote.freq > 0 && h('div', { className: subTextClass },
                Math.round(currentNote.freq) + ' Hz')
            ),

            // Cents meter
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\u2194\uFE0F', 'Cents Meter'),
              h('p', { className: subTextClass + ' mb-2' },
                'How sharp or flat you are. Aim for the green center zone (\u00B110 cents).'),
              h('canvas', {
                ref: centsMeterCanvasRef,
                width: 400,
                height: 40,
                className: 'w-full rounded',
                role: 'img',
                'aria-label': 'Cents deviation meter showing ' + (currentNote.cents || 0) + ' cents'
              })
            ),

            // Piano roll
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83C\uDFB9', 'Piano Roll'),
              h('p', { className: subTextClass + ' mb-2' },
                'Your pitch over time, mapped to musical notes. Green = on pitch, yellow = close, red = off.'),
              h('canvas', {
                ref: pitchRollCanvasRef,
                width: 600,
                height: 200,
                className: 'w-full rounded border ' + (isDark ? 'border-slate-600' : 'border-slate-200'),
                role: 'img',
                'aria-label': 'Piano roll showing pitch history over time'
              })
            ),

            // Reference tone generator
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83D\uDD0A', 'Reference Tones'),
              h('p', { className: subTextClass + ' mb-2' },
                'Click a note to hear the tone. Try to match it with your voice!'),
              h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                REF_TONE_NOTES.map(function(rn) {
                  var isActive = refTonePlaying === rn.midi;
                  return h('button', {
                    key: rn.midi,
                    className: 'px-2 py-1.5 rounded text-xs font-mono font-bold transition-colors ' +
                      (isActive
                        ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                        : (isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')),
                    onClick: function() {
                      if (isActive) {
                        stopRefTone();
                        setRefTonePlaying(null);
                      } else {
                        playMidiNote(rn.midi, 0, 0.12);
                        setRefTonePlaying(rn.midi);
                      }
                    },
                    'aria-label': 'Play reference tone ' + rn.label
                  }, rn.label);
                })
              ),
              refTonePlaying !== null && h('button', {
                className: btnSecondary,
                onClick: function() {
                  stopRefTone();
                  setRefTonePlaying(null);
                }
              }, '\u23F9 Stop Tone')
            ),

            // Pitch match game
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83C\uDFAE', 'Pitch Match Game'),
              h('p', { className: subTextClass + ' mb-2' },
                'A tone plays \u2014 match it with your voice! Hold the correct pitch for 1 second. Score is based on speed.'),

              pitchMatchMode === 'idle' && h('button', {
                className: btnPrimary,
                onClick: function() {
                  if (!isRecording) {
                    if (addToast) addToast('Start your microphone first!', 'warning');
                    return;
                  }
                  // Pick a random note in comfortable range
                  var targetMidi = 55 + Math.floor(Math.random() * 20); // G3 to D5
                  setPitchMatchTarget(targetMidi);
                  setPitchMatchMode('playing');
                  setPitchMatchScore(null);
                  pitchMatchLockedRef.current = 0;
                  pitchMatchStartRef.current = Date.now();
                  playMidiNote(targetMidi, 0, 0.12);
                  setRefTonePlaying(targetMidi);
                  if (announceToSR) announceToSR('Match this note: ' + midiToNoteName(targetMidi).str);
                }
              }, '\uD83C\uDFB2 Play Round'),

              pitchMatchMode === 'playing' && h('div', { className: 'space-y-2' },
                h('div', {
                  className: 'text-center text-3xl font-black ' + (isDark ? 'text-rose-300' : 'text-rose-600'),
                  role: 'status'
                }, 'Match: ' + (pitchMatchTarget ? midiToNoteName(pitchMatchTarget).str : '')),
                h('div', { className: 'text-center ' + subTextClass },
                  'Sing this note and hold it within 10 cents for 1 second'),
                h('button', {
                  className: btnSecondary,
                  onClick: function() {
                    stopRefTone();
                    setRefTonePlaying(null);
                    setPitchMatchMode('idle');
                  }
                }, 'Cancel')
              ),

              pitchMatchMode === 'matched' && h('div', { className: 'space-y-2 text-center' },
                h('div', {
                  className: 'text-2xl font-black ' + (isDark ? 'text-green-400' : 'text-green-600')
                }, '\u2705 Matched!'),
                h('div', { className: headingClass + ' text-lg' },
                  'Score: ' + pitchMatchScore),
                h('button', {
                  className: btnPrimary + ' mt-2',
                  onClick: function() {
                    setPitchMatchMode('idle');
                    setPitchMatchScore(null);
                    setRefTonePlaying(null);
                  }
                }, 'Play Again')
              )
            )
          );
        }

        // ════════════════════════════════════════
        // Tab 2: Vocal Range Finder
        // ════════════════════════════════════════

        function renderVocalRange() {
          var voiceType = (rangeLow || rangeLowTemp) ? classifyVoiceType(rangeLow || rangeLowTemp) : null;
          var displayLow = rangeLow || rangeLowTemp;
          var displayHigh = rangeHigh || rangeHighTemp;
          var span = (displayLow && displayHigh) ? displayHigh - displayLow : 0;

          return h('div', { className: 'space-y-4' },
            renderMicToggle(),

            // Range finder flow
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-3 flex items-center gap-2' },
                '\uD83C\uDFBC', 'Find Your Range'),

              rangeStep === 0 && h('div', { className: 'space-y-3' },
                h('p', { className: subTextClass },
                  'This will guide you through finding your lowest and highest comfortable notes. Make sure your microphone is on.'),
                h('button', {
                  className: btnPrimary,
                  onClick: function() {
                    if (!isRecording) {
                      if (addToast) addToast('Start your microphone first!', 'warning');
                      return;
                    }
                    setRangeStep(1);
                    setRangeLowTemp(null);
                    setRangeHighTemp(null);
                    rangeStableCountRef.current = 0;
                    rangeLastMidiRef.current = 0;
                    if (announceToSR) announceToSR('Step 1: Sing your lowest comfortable note and hold it.');
                  }
                }, '\uD83C\uDFAF Start Range Test')
              ),

              rangeStep === 1 && h('div', { className: 'space-y-2' },
                h('div', {
                  className: 'text-center p-4 rounded-lg ' + (isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200')
                },
                  h('div', { className: 'text-2xl mb-2' }, '\u2B07\uFE0F'),
                  h('div', { className: headingClass + ' text-lg', role: 'status', 'aria-live': 'polite' },
                    'Sing your LOWEST comfortable note'),
                  h('div', { className: subTextClass + ' mt-1' },
                    'Hold the note steady for about 1 second.'),
                  currentNote.midi > 0 && h('div', {
                    className: 'mt-2 text-lg font-bold',
                    style: { color: '#3b82f6' }
                  }, 'Detecting: ' + currentNote.note + currentNote.octave)
                ),
                h('button', {
                  className: btnSecondary,
                  onClick: function() { setRangeStep(0); }
                }, 'Cancel')
              ),

              rangeStep === 2 && h('div', { className: 'space-y-2' },
                h('div', {
                  className: 'text-center p-4 rounded-lg ' + (isDark ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-200')
                },
                  h('div', { className: 'text-2xl mb-2' }, '\u2B06\uFE0F'),
                  h('div', { className: headingClass + ' text-lg', role: 'status', 'aria-live': 'polite' },
                    'Now sing your HIGHEST comfortable note'),
                  h('div', { className: subTextClass + ' mt-1' },
                    'Hold it steady for about 1 second. Low note captured: ' +
                    (rangeLowTemp ? midiToNoteName(rangeLowTemp).str : '...')),
                  currentNote.midi > 0 && h('div', {
                    className: 'mt-2 text-lg font-bold',
                    style: { color: '#a855f7' }
                  }, 'Detecting: ' + currentNote.note + currentNote.octave)
                ),
                h('button', {
                  className: btnSecondary,
                  onClick: function() { setRangeStep(0); }
                }, 'Cancel')
              ),

              rangeStep === 3 && h('div', { className: 'space-y-3' },
                h('div', {
                  className: 'text-center p-4 rounded-lg ' + (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200')
                },
                  h('div', { className: 'text-2xl mb-2' }, '\u2705'),
                  h('div', { className: headingClass + ' text-lg' }, 'Range Found!'),
                  h('div', { className: 'flex justify-center gap-6 mt-3' },
                    h('div', null,
                      h('div', { className: subTextClass }, 'Lowest'),
                      h('div', { className: headingClass + ' text-xl' },
                        displayLow ? midiToNoteName(displayLow).str : '--')),
                    h('div', null,
                      h('div', { className: subTextClass }, 'Highest'),
                      h('div', { className: headingClass + ' text-xl' },
                        displayHigh ? midiToNoteName(displayHigh).str : '--')),
                    h('div', null,
                      h('div', { className: subTextClass }, 'Span'),
                      h('div', { className: headingClass + ' text-xl' },
                        span + ' semitones'))
                  ),
                  voiceType && h('div', { className: 'mt-3' },
                    h('span', { className: subTextClass }, 'Voice Type: '),
                    h('span', {
                      className: 'font-bold text-sm',
                      style: { color: voiceType.color }
                    }, voiceType.type),
                    h('span', { className: subTextClass + ' ml-2' }, '(' + voiceType.range + ')'))
                ),
                h('button', {
                  className: btnPrimary + ' mt-2',
                  onClick: function() { setRangeStep(0); }
                }, '\uD83D\uDD01 Test Again')
              )
            ),

            // Piano keyboard visualization
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83C\uDFB9', 'Your Range on the Keyboard'),
              h('p', { className: subTextClass + ' mb-2' },
                displayLow && displayHigh
                  ? 'Green keys show your vocal range from ' + midiToNoteName(displayLow).str + ' to ' + midiToNoteName(displayHigh).str + '.'
                  : 'Complete the range test above to see your range highlighted.'),
              h('canvas', {
                ref: rangeKeyboardCanvasRef,
                width: 600,
                height: 80,
                className: 'w-full rounded border ' + (isDark ? 'border-slate-600' : 'border-slate-200'),
                role: 'img',
                'aria-label': 'Piano keyboard showing vocal range',
                onClick: function(e) {
                  var cvs = rangeKeyboardCanvasRef.current;
                  if (!cvs || !cvs._keyRects) return;
                  var rect = cvs.getBoundingClientRect();
                  var scaleX = cvs.width / rect.width;
                  var scaleY = cvs.height / rect.height;
                  var cx = (e.clientX - rect.left) * scaleX;
                  var cy = (e.clientY - rect.top) * scaleY;
                  // Check black keys first (they're on top)
                  var clicked = null;
                  for (var ki = cvs._keyRects.length - 1; ki >= 0; ki--) {
                    var kr = cvs._keyRects[ki];
                    if (cx >= kr.x && cx <= kr.x + kr.w && cy >= kr.y && cy <= kr.y + kr.h) {
                      clicked = kr;
                      break;
                    }
                  }
                  if (clicked) {
                    playMidiNote(clicked.midi, 1.5, 0.12);
                    setRefTonePlaying(clicked.midi);
                    setTimeout(function() { setRefTonePlaying(null); }, 1600);
                  }
                }
              })
            ),

            // Range history
            (rangeHistory && rangeHistory.length > 0) && h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83D\uDCCA', 'Range History'),
              h('div', { className: 'space-y-1' },
                rangeHistory.map(function(entry, idx) {
                  return h('div', {
                    key: idx,
                    className: 'flex items-center justify-between text-xs p-2 rounded ' +
                      (isDark ? 'bg-slate-700' : 'bg-slate-50')
                  },
                    h('span', { className: subTextClass }, entry.date),
                    h('span', { className: headingClass },
                      midiToNoteName(entry.low).str + ' \u2014 ' + midiToNoteName(entry.high).str),
                    h('span', { className: subTextClass }, entry.span + ' semitones')
                  );
                })
              )
            )
          );
        }

        // ════════════════════════════════════════
        // Tab 3: Vibrato Lab
        // ════════════════════════════════════════

        function renderVibratoLab() {
          var rate = vibratoResult.rate;
          var depth = vibratoResult.depth;

          // Quality assessment
          var quality = { label: 'No Signal', color: '#64748b', desc: 'Start singing a sustained note.' };
          if (vibratoHistory.length >= 20 && currentNote.midi > 0) {
            if (depth < 10) {
              quality = { label: 'Straight Tone', color: '#6366f1', desc: 'Very little pitch variation. Good for choral blend!' };
            } else if (rate > 8) {
              quality = { label: 'Too Fast (Tremolo)', color: '#f97316', desc: 'Vibrato rate is above 8 Hz. Try to relax and slow down.' };
            } else if (rate < 4 && depth > 10) {
              quality = { label: 'Too Slow (Wobble)', color: '#f97316', desc: 'Vibrato rate is below 4 Hz. Try to energize your airflow.' };
            } else if (depth > 100) {
              quality = { label: 'Too Wide', color: '#f97316', desc: 'Vibrato width exceeds 100 cents. Try for a narrower oscillation.' };
            } else if (rate >= 5 && rate <= 7 && depth >= 30 && depth <= 80) {
              quality = { label: 'Healthy Vibrato', color: '#22c55e', desc: 'Beautiful! Rate and depth are in the ideal range.' };
            } else if (rate >= 4 && rate <= 8 && depth >= 15 && depth <= 100) {
              quality = { label: 'Developing Vibrato', color: '#eab308', desc: 'Getting there! Aim for 5-7 Hz rate and 30-80 cents depth.' };
            }
          }

          // Vibrato exercises
          var exercises = [
            { id: 'straight', label: 'Steady Tone', desc: 'Sustain a note with NO vibrato. Practice controlling your voice to hold it perfectly still.', target: 'Straight tone (< 10\u00A2 variation)' },
            { id: 'add', label: 'Add Vibrato', desc: 'Sustain a note and let your natural vibrato emerge. Don\'t force it \u2014 relax and let it happen.', target: 'Natural vibrato (5-7 Hz, 30-80\u00A2)' },
            { id: 'speed', label: 'Speed Control', desc: 'Try to vibrate at exactly 6 Hz (6 oscillations per second). Watch the rate readout.', target: 'Rate: 6 Hz' },
            { id: 'width', label: 'Width Control', desc: 'Try to keep vibrato depth around 50 cents. Not too wide, not too narrow.', target: 'Depth: ~50\u00A2' }
          ];

          return h('div', { className: 'space-y-4' },
            renderMicToggle(),

            // Vibrato trace
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83C\uDF0A', 'Vibrato Waveform'),
              h('p', { className: subTextClass + ' mb-2' },
                'Sustain a note to see your vibrato pattern. The center line is your average pitch.'),
              h('canvas', {
                ref: vibratoCanvasRef,
                width: 600,
                height: 160,
                className: 'w-full rounded border ' + (isDark ? 'border-slate-600' : 'border-slate-200'),
                role: 'img',
                'aria-label': 'Vibrato waveform trace showing pitch deviation over time'
              })
            ),

            // Rate + Depth + Quality display
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('div', { className: cardClass + ' text-center' },
                h('div', { className: subTextClass + ' mb-1' }, 'Rate'),
                h('div', { className: headingClass + ' text-2xl' }, rate.toFixed(1) + ' Hz'),
                h('div', { className: subTextClass }, 'Ideal: 5-7 Hz')),
              h('div', { className: cardClass + ' text-center' },
                h('div', { className: subTextClass + ' mb-1' }, 'Depth'),
                h('div', { className: headingClass + ' text-2xl' }, Math.round(depth) + '\u00A2'),
                h('div', { className: subTextClass }, 'Ideal: 30-80\u00A2')),
              h('div', { className: cardClass + ' text-center' },
                h('div', { className: subTextClass + ' mb-1' }, 'Quality'),
                h('div', {
                  className: 'text-lg font-bold',
                  style: { color: quality.color }
                }, quality.label),
                h('div', { className: subTextClass }, quality.desc))
            ),

            // Exercises
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-3 flex items-center gap-2' },
                '\uD83C\uDFAF', 'Vibrato Exercises'),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                exercises.map(function(ex) {
                  var isActive = vibratoExercise === ex.id;
                  return h('button', {
                    key: ex.id,
                    className: 'text-left p-3 rounded-lg border transition-colors ' +
                      (isActive
                        ? (isDark ? 'border-rose-500 bg-rose-900/30' : 'border-rose-400 bg-rose-50')
                        : (isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600' : 'border-slate-200 bg-slate-50 hover:bg-slate-100')),
                    onClick: function() {
                      setVibratoExercise(isActive ? null : ex.id);
                      setVibratoHistory([]);
                    }
                  },
                    h('div', { className: headingClass + ' text-xs mb-1' }, ex.label),
                    h('div', { className: subTextClass }, ex.desc),
                    h('div', {
                      className: 'mt-1 text-xs font-mono ' + (isDark ? 'text-rose-300' : 'text-rose-600')
                    }, 'Target: ' + ex.target)
                  );
                })
              )
            )
          );
        }

        // ════════════════════════════════════════
        // Tab 4: Interval Singer
        // ════════════════════════════════════════

        function renderIntervalSinger() {
          // Available intervals for selected level
          var availableIntervals = INTERVALS.filter(function(iv) { return iv.level <= intervalLevel; });

          function startNewInterval() {
            if (!isRecording) {
              if (addToast) addToast('Start your microphone first!', 'warning');
              return;
            }
            // Pick random interval from available
            var interval = availableIntervals[Math.floor(Math.random() * availableIntervals.length)];
            // Pick random starting note in comfortable range
            var refMidi;
            if (intervalDirection === 'up') {
              refMidi = 55 + Math.floor(Math.random() * 12); // G3 to F#4
            } else {
              refMidi = 62 + Math.floor(Math.random() * 12); // D4 to C#5
            }
            var semitones = interval.semitones;
            var targetMidi = intervalDirection === 'up' ? refMidi + semitones : refMidi - semitones;

            setIntervalActive({
              interval: interval,
              refMidi: refMidi,
              targetMidi: targetMidi,
              direction: intervalDirection
            });
            setIntervalResult(null);
            intervalLockedRef.current = 0;
            intervalStartRef.current = Date.now();

            // Play the reference note
            playMidiNote(refMidi, 2, 0.12);
            setRefTonePlaying(refMidi);
            setTimeout(function() { setRefTonePlaying(null); }, 2100);

            if (announceToSR) {
              announceToSR('Sing a ' + interval.name + ' ' + intervalDirection + ' from ' + midiToNoteName(refMidi).str);
            }
          }

          return h('div', { className: 'space-y-4' },
            renderMicToggle(),

            // Controls
            h('div', { className: cardClass },
              h('div', { className: 'flex flex-wrap items-center gap-4 mb-3' },
                // Level selector
                h('div', null,
                  h('label', { className: subTextClass + ' block mb-1' }, 'Difficulty Level'),
                  h('div', { className: 'flex gap-1' },
                    [1, 2, 3, 4, 5, 6].map(function(lvl) {
                      return h('button', {
                        key: lvl,
                        className: 'w-8 h-8 rounded-lg text-xs font-bold transition-colors ' +
                          (intervalLevel >= lvl
                            ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white')
                            : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')),
                        onClick: function() { setIntervalLevel(lvl); },
                        'aria-label': 'Set level to ' + lvl
                      }, lvl.toString());
                    })
                  )
                ),
                // Direction selector
                h('div', null,
                  h('label', { className: subTextClass + ' block mb-1' }, 'Direction'),
                  h('div', { className: 'flex gap-1' },
                    h('button', {
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                        (intervalDirection === 'up'
                          ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                          : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')),
                      onClick: function() { setIntervalDirection('up'); }
                    }, '\u2B06 UP'),
                    h('button', {
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                        (intervalDirection === 'down'
                          ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                          : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')),
                      onClick: function() { setIntervalDirection('down'); }
                    }, '\u2B07 DOWN')
                  )
                ),
                // Streak
                h('div', { className: 'text-center' },
                  h('div', { className: subTextClass }, 'Streak'),
                  h('div', { className: headingClass + ' text-xl' }, intervalStreak.toString()),
                  bestStreak > 0 && h('div', { className: subTextClass }, 'Best: ' + bestStreak))
              ),

              // Available intervals display
              h('div', { className: 'flex flex-wrap gap-1 mb-3' },
                availableIntervals.map(function(iv) {
                  var sc = intervalScores[iv.name];
                  var accuracy = sc && sc.attempts > 0 ? Math.round((sc.correct / sc.attempts) * 100) : null;
                  return h('span', {
                    key: iv.name,
                    className: 'px-2 py-1 rounded text-xs ' +
                      (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'),
                    title: accuracy !== null ? accuracy + '% accuracy' : 'Not attempted'
                  }, iv.name + (accuracy !== null ? ' (' + accuracy + '%)' : ''));
                })
              ),

              // Start button
              !intervalActive && h('button', {
                className: btnPrimary + ' w-full',
                onClick: startNewInterval
              }, '\uD83C\uDFB5 New Interval'),

              // Active interval challenge
              intervalActive && !intervalResult && h('div', { className: 'space-y-3' },
                h('div', {
                  className: 'text-center p-4 rounded-lg ' +
                    (isDark ? 'bg-rose-900/30 border border-rose-700' : 'bg-rose-50 border border-rose-200')
                },
                  h('div', { className: 'text-lg font-bold ' + (isDark ? 'text-rose-300' : 'text-rose-600') },
                    'Sing a ' + intervalActive.interval.name + ' ' + intervalActive.direction.toUpperCase()),
                  h('div', { className: headingClass + ' text-2xl mt-2' },
                    'From: ' + midiToNoteName(intervalActive.refMidi).str + ' \u2192 Target: ' + midiToNoteName(intervalActive.targetMidi).str),
                  currentNote.midi > 0 && h('div', {
                    className: 'mt-2 text-sm',
                    style: { color: Math.abs(currentNote.midi - intervalActive.targetMidi) * 100 <= 15 ? '#22c55e' : '#ef4444' }
                  }, 'You: ' + currentNote.note + currentNote.octave +
                    ' (' + Math.round(Math.abs(currentNote.midi - intervalActive.targetMidi) * 100) + '\u00A2 off)')
                ),
                // Staff canvas
                h('canvas', {
                  ref: intervalStaffCanvasRef,
                  width: 400,
                  height: 120,
                  className: 'w-full rounded border ' + (isDark ? 'border-slate-600' : 'border-slate-200'),
                  role: 'img',
                  'aria-label': 'Staff notation showing reference, target, and your current note'
                }),
                h('div', { className: 'flex gap-2' },
                  h('button', {
                    className: btnSecondary,
                    onClick: function() {
                      playMidiNote(intervalActive.refMidi, 1.5, 0.12);
                      setRefTonePlaying(intervalActive.refMidi);
                      setTimeout(function() { setRefTonePlaying(null); }, 1600);
                    }
                  }, '\uD83D\uDD0A Replay Reference'),
                  h('button', {
                    className: btnSecondary,
                    onClick: function() {
                      playMidiNote(intervalActive.targetMidi, 1.5, 0.12);
                      setRefTonePlaying(intervalActive.targetMidi);
                      setTimeout(function() { setRefTonePlaying(null); }, 1600);
                    }
                  }, '\uD83D\uDCA1 Hear Target'),
                  h('button', {
                    className: btnSecondary,
                    onClick: function() {
                      stopRefTone();
                      setRefTonePlaying(null);
                      setIntervalActive(null);
                      setIntervalStreak(0);
                    }
                  }, 'Skip')
                )
              ),

              // Result
              intervalResult && h('div', { className: 'space-y-3' },
                h('div', {
                  className: 'text-center p-4 rounded-lg ' +
                    (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200')
                },
                  h('div', { className: 'text-2xl mb-1' }, '\u2705'),
                  h('div', { className: headingClass + ' text-lg' },
                    intervalActive.interval.name + ' ' + intervalActive.direction.toUpperCase() + ' \u2014 Correct!'),
                  h('div', { className: 'flex justify-center gap-6 mt-2' },
                    h('div', null,
                      h('div', { className: subTextClass }, 'Accuracy'),
                      h('div', { className: headingClass }, intervalResult.centsOff + '\u00A2 off')),
                    h('div', null,
                      h('div', { className: subTextClass }, 'Time'),
                      h('div', { className: headingClass }, intervalResult.time.toFixed(1) + 's')),
                    h('div', null,
                      h('div', { className: subTextClass }, 'Score'),
                      h('div', { className: headingClass }, intervalResult.score))
                  )
                ),
                h('button', {
                  className: btnPrimary + ' w-full',
                  onClick: function() {
                    setIntervalActive(null);
                    setIntervalResult(null);
                    setTimeout(startNewInterval, 100);
                  }
                }, '\u27A1\uFE0F Next Interval')
              )
            ),

            // Score tracking per interval
            Object.keys(intervalScores).length > 0 && h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83D\uDCCA', 'Interval Accuracy'),
              h('div', { className: 'space-y-1.5' },
                Object.keys(intervalScores).map(function(name) {
                  var sc = intervalScores[name];
                  var pct = sc.attempts > 0 ? Math.round((sc.correct / sc.attempts) * 100) : 0;
                  return h('div', {
                    key: name,
                    className: 'flex items-center gap-2'
                  },
                    h('span', { className: headingClass + ' text-xs w-28' }, name),
                    h('div', {
                      className: 'flex-1 h-3 rounded-full overflow-hidden ' + (isDark ? 'bg-slate-700' : 'bg-slate-200')
                    },
                      h('div', {
                        className: 'h-full rounded-full transition-all',
                        style: {
                          width: pct + '%',
                          backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'
                        }
                      })
                    ),
                    h('span', { className: subTextClass + ' w-14 text-right' },
                      sc.correct + '/' + sc.attempts + ' (' + pct + '%)')
                  );
                })
              )
            )
          );
        }

        // ════════════════════════════════════════
        // Tab 5: Vocal Health & Warm-ups
        // ════════════════════════════════════════

        function renderWarmups() {
          function startWarmup(exercise) {
            setWarmupActive(exercise);
            setWarmupTimer(0);
            warmupPlayingRef.current = true;

            // Start timer
            if (warmupTimerRefId.current) clearInterval(warmupTimerRefId.current);
            warmupTimerRefId.current = setInterval(function() {
              setWarmupTimer(function(prev) { return prev + 1; });
            }, 1000);

            // Play reference tones
            if (exercise.notes && exercise.notes.length > 0) {
              playNoteSequence(exercise.notes, 0.10);
            }
          }

          function completeWarmup() {
            if (warmupTimerRefId.current) {
              clearInterval(warmupTimerRefId.current);
              warmupTimerRefId.current = null;
            }
            stopRefTone();
            warmupPlayingRef.current = false;

            var newCount = warmUpsCompleted + 1;
            upd('warmUpsCompleted', newCount);
            setWarmupActive(null);
            setWarmupTimer(0);

            if (addToast) addToast('Warm-up complete!', 'success');
            if (stemBeep) stemBeep('coin');
            if (awardStemXP) awardStemXP(5, 'Singing: warm-up completed');
          }

          function cancelWarmup() {
            if (warmupTimerRefId.current) {
              clearInterval(warmupTimerRefId.current);
              warmupTimerRefId.current = null;
            }
            stopRefTone();
            warmupPlayingRef.current = false;
            setWarmupActive(null);
            setWarmupTimer(0);
          }

          function loadHealthTips() {
            if (healthLoading || !callGemini) return;
            setHealthLoading(true);
            var prompt = 'Give 6 short vocal health tips appropriate for a grade ' +
              (gradeLevel || 5) + ' student learning to sing. ' +
              'Cover: hydration, vocal rest, warning signs of strain, posture, breathing, and warm-up importance. ' +
              'Use simple, encouraging language. Format as a numbered list. Keep each tip to 1-2 sentences.';
            callGemini(prompt).then(function(response) {
              setHealthTips(response);
              setHealthLoading(false);
            }).catch(function(err) {
              console.error('[Singing] Health tips error:', err);
              setHealthTips('1. Drink water often to keep your vocal cords hydrated.\n2. Rest your voice if it feels tired or scratchy.\n3. If your throat hurts when singing, stop and rest.\n4. Stand up straight with shoulders relaxed for better breath support.\n5. Take deep belly breaths before singing.\n6. Always warm up before singing loudly or for a long time.');
              setHealthLoading(false);
            });
          }

          return h('div', { className: 'space-y-4' },
            renderMicToggle(),

            // Warm-up exercises
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-3 flex items-center gap-2' },
                '\uD83C\uDFB6', 'Vocal Warm-ups'),
              h('p', { className: subTextClass + ' mb-3' },
                'Complete a warm-up before singing practice. Reference tones play to guide you. ' +
                '(' + warmUpsCompleted + ' completed so far)'),

              warmupActive && h('div', {
                className: 'p-4 rounded-lg mb-3 ' +
                  (isDark ? 'bg-rose-900/30 border border-rose-700' : 'bg-rose-50 border border-rose-200')
              },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, warmupActive.icon),
                  h('span', { className: headingClass + ' text-sm' }, warmupActive.label)),
                h('p', { className: subTextClass + ' mb-2 italic' }, warmupActive.desc),
                h('div', { className: 'flex items-center gap-4' },
                  h('div', null,
                    h('span', { className: subTextClass }, 'Time: '),
                    h('span', { className: headingClass }, warmupTimer + 's')),
                  h('div', {
                    className: 'flex-1 h-2 rounded-full ' + (isDark ? 'bg-slate-700' : 'bg-slate-200')
                  },
                    h('div', {
                      className: 'h-full rounded-full bg-rose-500 transition-all',
                      style: { width: Math.min(100, (warmupTimer / warmupActive.duration) * 100) + '%' }
                    })
                  )
                ),
                h('div', { className: 'flex gap-2 mt-3' },
                  h('button', {
                    className: btnPrimary,
                    onClick: completeWarmup
                  }, '\u2705 Complete'),
                  h('button', {
                    className: btnSecondary,
                    onClick: function() {
                      // Replay reference tones
                      if (warmupActive.notes && warmupActive.notes.length > 0) {
                        playNoteSequence(warmupActive.notes, 0.10);
                      }
                    }
                  }, '\uD83D\uDD01 Replay Tones'),
                  h('button', {
                    className: btnSecondary,
                    onClick: cancelWarmup
                  }, 'Cancel'))
              ),

              !warmupActive && h('div', { className: 'grid gap-2' },
                WARMUP_EXERCISES.map(function(ex) {
                  return h('button', {
                    key: ex.id,
                    className: 'text-left p-3 rounded-lg border transition-colors ' +
                      (isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'),
                    onClick: function() { startWarmup(ex); }
                  },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-lg' }, ex.icon),
                      h('span', { className: headingClass + ' text-sm' }, ex.label),
                      h('span', { className: subTextClass + ' ml-auto' }, '~' + ex.duration + 's')),
                    h('div', { className: subTextClass }, ex.desc)
                  );
                })
              )
            ),

            // Vocal health tips
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-3 flex items-center gap-2' },
                '\u2764\uFE0F', 'Vocal Health Tips'),

              !healthTips && !healthLoading && h('div', { className: 'space-y-2' },
                h('p', { className: subTextClass },
                  'Get personalized vocal health tips appropriate for your grade level.'),
                h('button', {
                  className: btnPrimary,
                  onClick: loadHealthTips
                }, '\uD83D\uDCA1 Get Tips')
              ),

              healthLoading && h('div', {
                className: 'text-center py-4 ' + subTextClass,
                role: 'status'
              }, 'Loading tips...'),

              healthTips && h('div', { className: 'space-y-2' },
                h('div', {
                  className: 'text-sm whitespace-pre-wrap ' + (isDark ? 'text-slate-300' : 'text-slate-700'),
                  style: { lineHeight: '1.6' }
                }, healthTips),
                h('button', {
                  className: btnSecondary + ' mt-2',
                  onClick: function() {
                    setHealthTips(null);
                    loadHealthTips();
                  }
                }, '\uD83D\uDD01 Refresh Tips')
              )
            ),

            // Quick reference: breathing diagram
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83C\uDF2C\uFE0F', 'Breathing for Singing'),
              h('div', { className: 'grid grid-cols-3 gap-3 text-center' },
                h('div', {
                  className: 'p-3 rounded-lg ' + (isDark ? 'bg-blue-900/30' : 'bg-blue-50')
                },
                  h('div', { className: 'text-2xl mb-1' }, '\u2B07\uFE0F'),
                  h('div', { className: headingClass + ' text-xs' }, '1. Inhale'),
                  h('div', { className: subTextClass }, 'Breathe deep into your belly (diaphragm), not your chest.')),
                h('div', {
                  className: 'p-3 rounded-lg ' + (isDark ? 'bg-green-900/30' : 'bg-green-50')
                },
                  h('div', { className: 'text-2xl mb-1' }, '\u23F8\uFE0F'),
                  h('div', { className: headingClass + ' text-xs' }, '2. Support'),
                  h('div', { className: subTextClass }, 'Keep your core engaged to control airflow while singing.')),
                h('div', {
                  className: 'p-3 rounded-lg ' + (isDark ? 'bg-purple-900/30' : 'bg-purple-50')
                },
                  h('div', { className: 'text-2xl mb-1' }, '\uD83C\uDF0A'),
                  h('div', { className: headingClass + ' text-xs' }, '3. Release'),
                  h('div', { className: subTextClass }, 'Let the air flow smoothly and evenly through your vocal folds.'))
              )
            ),

            // Posture tips
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83E\uDDD1\u200D\uD83C\uDFA4', 'Singing Posture'),
              h('div', { className: 'space-y-2' },
                h('div', { className: 'flex items-start gap-2' },
                  h('span', null, '\u2705'),
                  h('span', { className: 'text-xs ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                    'Feet shoulder-width apart, weight balanced evenly')),
                h('div', { className: 'flex items-start gap-2' },
                  h('span', null, '\u2705'),
                  h('span', { className: 'text-xs ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                    'Shoulders relaxed and rolled back (not hunched)')),
                h('div', { className: 'flex items-start gap-2' },
                  h('span', null, '\u2705'),
                  h('span', { className: 'text-xs ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                    'Chin level \u2014 not tilted up or down')),
                h('div', { className: 'flex items-start gap-2' },
                  h('span', null, '\u2705'),
                  h('span', { className: 'text-xs ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                    'Jaw relaxed and slightly dropped when singing')),
                h('div', { className: 'flex items-start gap-2' },
                  h('span', null, '\u274C'),
                  h('span', { className: 'text-xs ' + (isDark ? 'text-slate-300' : 'text-slate-600') },
                    'Avoid: locking knees, tensing neck, or clenching jaw'))
              )
            )
          );
        }

        // ════════════════════════════════════════
        // Tab 6: Sight Reading
        // ════════════════════════════════════════

        function renderSightReading() {
          // Persisted scores
          var srScores = d.sightReadScores || {}; // { easy: {stars, time}, medium: ..., hard: ... }

          function loadExercise() {
            var notes;
            if (srSource === 'melody') {
              var mel = SIGHT_READ_MELODIES.find(function(m) { return m.id === srMelodyId; });
              notes = mel ? mel.notes.slice() : SIGHT_READ_MELODIES[0].notes.slice();
            } else {
              notes = generateSightReadExercise(srDifficulty);
            }
            setSrNotes(notes);
            setSrMode('idle');
            setSrCurrentIdx(-1);
            setSrResults([]);
            srLockedRef.current = 0;
            srAttemptsRef.current = 0;
            srCentsAccRef.current = 0;
            setSrStartTime(null);
          }

          function loadAiExercise() {
            if (!callGemini || srAiLoading) return;
            setSrAiLoading(true);
            var prompt = 'Generate a sight-reading singing exercise for a grade ' +
              (gradeLevel || 5) + ' student. Difficulty: ' + srDifficulty + '. ' +
              'Return ONLY a JSON array of objects, each with "midi" (MIDI note number, e.g. 60=C4) and "dur" (duration in beats, 1=quarter, 2=half, 4=whole). ' +
              'Use notes in C major (no sharps/flats for easy, some for medium/hard). ' +
              'Easy: 4-8 notes C4-C5. Medium: 6-12 notes B3-G5. Hard: 8-16 notes A3-A5. ' +
              'Prefer stepwise motion with occasional leaps. Return ONLY the JSON array, no other text.';
            callGemini(prompt).then(function(response) {
              try {
                // Extract JSON from response
                var jsonStr = response;
                var match = response.match(/\[[\s\S]*\]/);
                if (match) jsonStr = match[0];
                var parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].midi) {
                  setSrNotes(parsed);
                  setSrMode('idle');
                  setSrCurrentIdx(-1);
                  setSrResults([]);
                  if (addToast) addToast('AI exercise generated!', 'success');
                } else {
                  throw new Error('Invalid format');
                }
              } catch(e) {
                console.error('[Singing] AI exercise parse error:', e);
                if (addToast) addToast('Could not parse AI response. Using random exercise.', 'warning');
                setSrNotes(generateSightReadExercise(srDifficulty));
                setSrMode('idle');
                setSrCurrentIdx(-1);
                setSrResults([]);
              }
              setSrAiLoading(false);
            }).catch(function(err) {
              console.error('[Singing] AI exercise error:', err);
              if (addToast) addToast('AI unavailable. Using random exercise.', 'warning');
              setSrNotes(generateSightReadExercise(srDifficulty));
              setSrMode('idle');
              setSrCurrentIdx(-1);
              setSrResults([]);
              setSrAiLoading(false);
            });
          }

          function startPreview() {
            if (!srNotes || srNotes.length === 0) return;
            setSrMode('preview');
            setSrCurrentIdx(0);
            var beatDur = 60 / srTempo; // seconds per beat
            var idx = 0;

            function playNext() {
              if (idx >= srNotes.length) {
                setSrMode('idle');
                setSrCurrentIdx(-1);
                stopRefTone();
                srPreviewTimerRef.current = null;
                return;
              }
              var note = srNotes[idx];
              var durSec = note.dur * beatDur;
              setSrCurrentIdx(idx);
              playMidiNote(note.midi, durSec * 0.9, 0.12);
              idx++;
              srPreviewTimerRef.current = setTimeout(playNext, durSec * 1000);
            }
            playNext();
          }

          function stopPreview() {
            if (srPreviewTimerRef.current) {
              clearTimeout(srPreviewTimerRef.current);
              srPreviewTimerRef.current = null;
            }
            stopRefTone();
            setSrMode('idle');
            setSrCurrentIdx(-1);
          }

          function startSinging() {
            if (!srNotes || srNotes.length === 0) return;
            if (!isRecording) {
              if (addToast) addToast('Start your microphone first!', 'warning');
              return;
            }
            setSrMode('singing');
            setSrCurrentIdx(0);
            setSrResults([]);
            setSrStartTime(Date.now());
            srLockedRef.current = 0;
            srAttemptsRef.current = 0;
            srCentsAccRef.current = 0;
            if (announceToSR) announceToSR('Sight reading started. Sing each note shown on the staff.');
          }

          function stopSinging() {
            setSrMode('idle');
            setSrCurrentIdx(-1);
            stopRefTone();
          }

          // Compute final score when done
          var finalScore = null;
          if (srMode === 'done' && srResults.length > 0 && srNotes) {
            var correctFirst = srResults.filter(function(r) { return r.correct; }).length;
            var totalNotes = srNotes.length;
            var elapsed = srStartTime ? Math.round((Date.now() - srStartTime) / 1000) : 0;
            var avgCents = Math.round(srResults.reduce(function(s, r) { return s + r.cents; }, 0) / srResults.length);
            var errors = totalNotes - correctFirst;
            var stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1;

            finalScore = {
              correctFirst: correctFirst,
              total: totalNotes,
              time: elapsed,
              avgCents: avgCents,
              stars: stars
            };

            // Persist best score
            var diffKey = srSource === 'melody' ? srMelodyId : srDifficulty;
            var prevBest = srScores[diffKey];
            if (!prevBest || stars > prevBest.stars || (stars === prevBest.stars && elapsed < prevBest.time)) {
              var newScores = Object.assign({}, srScores);
              newScores[diffKey] = { stars: stars, time: elapsed, correctFirst: correctFirst, total: totalNotes };
              upd('sightReadScores', newScores);
            }
          }

          // Current target note info
          var currentTargetInfo = (srNotes && srCurrentIdx >= 0 && srCurrentIdx < srNotes.length)
            ? midiToNoteName(srNotes[srCurrentIdx].midi)
            : null;

          return h('div', { className: 'space-y-4' },
            renderMicToggle(),

            // Exercise source selector
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-3 flex items-center gap-2' },
                '\uD83C\uDFBC', 'Sight Reading Trainer'),
              h('p', { className: subTextClass + ' mb-3' },
                'Read the notes on the staff and sing them in order. Real-time pitch detection checks your accuracy.'),

              // Source tabs
              h('div', { className: 'flex gap-1 mb-3' },
                h('button', {
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                    (srSource === 'generate'
                      ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white')
                      : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
                  onClick: function() { setSrSource('generate'); }
                }, 'Random'),
                h('button', {
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                    (srSource === 'melody'
                      ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white')
                      : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
                  onClick: function() { setSrSource('melody'); }
                }, 'Melodies'),
                callGemini && h('button', {
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                    (srSource === 'ai'
                      ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white')
                      : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
                  onClick: function() { setSrSource('ai'); }
                }, 'AI Generate')
              ),

              // Difficulty selector (for generate & ai modes)
              (srSource === 'generate' || srSource === 'ai') && h('div', { className: 'flex items-center gap-3 mb-3' },
                h('label', { className: subTextClass }, 'Difficulty:'),
                h('div', { className: 'flex gap-1' },
                  ['easy', 'medium', 'hard'].map(function(lvl) {
                    var colors = { easy: '#22c55e', medium: '#eab308', hard: '#ef4444' };
                    var isActive = srDifficulty === lvl;
                    return h('button', {
                      key: lvl,
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                        (isActive
                          ? 'text-white'
                          : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
                      style: isActive ? { backgroundColor: colors[lvl] } : {},
                      onClick: function() { setSrDifficulty(lvl); }
                    }, lvl.charAt(0).toUpperCase() + lvl.slice(1));
                  })
                ),
                // Show best score badge
                srScores[srDifficulty] && h('span', {
                  className: 'text-xs font-bold ' + (isDark ? 'text-yellow-300' : 'text-yellow-600')
                }, '\u2B50'.repeat(srScores[srDifficulty].stars))
              ),

              // Melody selector (for melody mode)
              srSource === 'melody' && h('div', { className: 'mb-3' },
                h('label', { className: subTextClass + ' block mb-1' }, 'Choose a melody:'),
                h('div', { className: 'grid grid-cols-2 gap-1.5' },
                  SIGHT_READ_MELODIES.map(function(mel) {
                    var isActive = srMelodyId === mel.id;
                    var bestMel = srScores[mel.id];
                    return h('button', {
                      key: mel.id,
                      className: 'text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ' +
                        (isActive
                          ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white')
                          : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
                      onClick: function() { setSrMelodyId(mel.id); }
                    },
                      h('span', null, mel.label),
                      bestMel && h('span', { className: 'ml-2' }, '\u2B50'.repeat(bestMel.stars)),
                      h('span', { className: 'ml-1 opacity-60' }, '(' + mel.notes.length + ' notes)')
                    );
                  })
                )
              ),

              // Generate / Load button
              h('div', { className: 'flex gap-2' },
                srSource !== 'ai' && h('button', {
                  className: btnPrimary,
                  onClick: loadExercise
                }, srNotes ? '\uD83D\uDD01 New Exercise' : '\uD83C\uDFBC Load Exercise'),
                srSource === 'ai' && h('button', {
                  className: btnPrimary,
                  disabled: srAiLoading,
                  onClick: loadAiExercise
                }, srAiLoading ? 'Generating...' : '\u2728 Generate with AI')
              )
            ),

            // Staff notation canvas
            srNotes && h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83C\uDFB5', 'Staff'),
              h('canvas', {
                ref: sightReadCanvasRef,
                width: 700,
                height: 160,
                className: 'w-full rounded border ' + (isDark ? 'border-slate-600' : 'border-slate-200'),
                role: 'img',
                'aria-label': 'Staff notation showing sight reading exercise with ' + srNotes.length + ' notes'
              }),

              // Current note display during singing
              srMode === 'singing' && currentTargetInfo && h('div', {
                className: 'flex items-center justify-between mt-2'
              },
                h('div', null,
                  h('span', { className: subTextClass }, 'Target: '),
                  h('span', { className: headingClass + ' text-lg', style: { color: '#eab308' } },
                    currentTargetInfo.str)),
                currentNote.midi > 0 && h('div', null,
                  h('span', { className: subTextClass }, 'You: '),
                  h('span', {
                    className: 'font-bold text-lg',
                    style: { color: Math.abs(currentNote.midi - srNotes[srCurrentIdx].midi) * 100 <= 25 ? '#22c55e' : '#ef4444' }
                  }, currentNote.note + currentNote.octave)),
                h('div', null,
                  h('span', { className: subTextClass }, 'Note '),
                  h('span', { className: headingClass }, (srCurrentIdx + 1) + '/' + srNotes.length))
              )
            ),

            // Controls: Preview + Sing
            srNotes && h('div', { className: cardClass },
              h('div', { className: 'flex flex-wrap items-center gap-3' },
                // Preview controls
                srMode === 'idle' && h('button', {
                  className: btnSecondary + ' flex items-center gap-1',
                  onClick: startPreview
                }, '\uD83D\uDD0A', ' Preview'),

                srMode === 'preview' && h('button', {
                  className: btnDanger + ' flex items-center gap-1',
                  onClick: stopPreview
                }, '\u23F9', ' Stop Preview'),

                // Sing controls
                (srMode === 'idle' || srMode === 'done') && h('button', {
                  className: btnPrimary + ' flex items-center gap-1',
                  onClick: startSinging
                }, '\uD83C\uDFA4', srMode === 'done' ? ' Try Again' : ' Start Singing'),

                srMode === 'singing' && h('button', {
                  className: btnDanger + ' flex items-center gap-1',
                  onClick: stopSinging
                }, '\u23F9', ' Stop'),

                // Tempo slider
                h('div', { className: 'flex items-center gap-2 ml-auto' },
                  h('label', { className: subTextClass }, 'Tempo:'),
                  h('input', {
                    type: 'range',
                    min: 40,
                    max: 120,
                    value: srTempo,
                    onChange: function(e) { setSrTempo(parseInt(e.target.value, 10)); },
                    className: 'w-24 accent-rose-500',
                    'aria-label': 'Preview tempo'
                  }),
                  h('span', { className: headingClass + ' text-xs w-12 text-right' }, srTempo + ' BPM')
                )
              ),

              // Hear current target note button during singing
              srMode === 'singing' && currentTargetInfo && h('div', { className: 'mt-2' },
                h('button', {
                  className: btnSecondary + ' text-xs',
                  onClick: function() {
                    if (srNotes && srCurrentIdx >= 0 && srCurrentIdx < srNotes.length) {
                      playMidiNote(srNotes[srCurrentIdx].midi, 1.5, 0.12);
                    }
                  }
                }, '\uD83D\uDCA1 Hear Target Note')
              )
            ),

            // Score display when done
            srMode === 'done' && finalScore && h('div', { className: cardClass },
              h('div', {
                className: 'text-center p-4 rounded-lg ' +
                  (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200')
              },
                h('div', { className: 'text-3xl mb-2' },
                  '\u2B50'.repeat(finalScore.stars) + '\u2606'.repeat(3 - finalScore.stars)),
                h('div', { className: headingClass + ' text-lg mb-3' }, 'Exercise Complete!'),
                h('div', { className: 'grid grid-cols-4 gap-4' },
                  h('div', null,
                    h('div', { className: subTextClass }, 'Correct 1st Try'),
                    h('div', { className: headingClass + ' text-xl' },
                      finalScore.correctFirst + '/' + finalScore.total)),
                  h('div', null,
                    h('div', { className: subTextClass }, 'Avg. Deviation'),
                    h('div', { className: headingClass + ' text-xl' },
                      finalScore.avgCents + '\u00A2')),
                  h('div', null,
                    h('div', { className: subTextClass }, 'Time'),
                    h('div', { className: headingClass + ' text-xl' },
                      finalScore.time + 's')),
                  h('div', null,
                    h('div', { className: subTextClass }, 'Stars'),
                    h('div', { className: headingClass + ' text-xl' },
                      finalScore.stars + '/3'))
                ),
                h('div', { className: 'mt-3 ' + subTextClass },
                  finalScore.stars === 3 ? 'Perfect! All notes correct on the first try!' :
                  finalScore.stars === 2 ? 'Great job! Only a couple of tricky spots.' :
                  'You finished it! Keep practicing and you will get better.')
              )
            ),

            // Per-note result breakdown when done
            srMode === 'done' && srResults.length > 0 && srNotes && h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83D\uDCCA', 'Note-by-Note Results'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                srResults.map(function(r, idx) {
                  var nInfo = midiToNoteName(srNotes[idx].midi);
                  return h('div', {
                    key: idx,
                    className: 'flex flex-col items-center p-2 rounded-lg text-xs ' +
                      (r.correct
                        ? (isDark ? 'bg-green-900/40 border border-green-700' : 'bg-green-50 border border-green-200')
                        : (isDark ? 'bg-red-900/40 border border-red-700' : 'bg-red-50 border border-red-200')),
                    title: r.correct ? 'Correct first try' : 'Needed ' + r.attempts + ' extra attempts'
                  },
                    h('div', { className: 'font-bold ' + (r.correct ? 'text-green-500' : 'text-red-500') },
                      nInfo.str),
                    h('div', { className: subTextClass }, r.cents + '\u00A2'),
                    h('div', { className: 'text-xs' }, r.correct ? '\u2705' : '\u274C')
                  );
                })
              )
            ),

            // High scores
            Object.keys(srScores).length > 0 && h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                '\uD83C\uDFC6', 'Best Scores'),
              h('div', { className: 'space-y-1.5' },
                Object.keys(srScores).map(function(key) {
                  var sc = srScores[key];
                  // Try to find a melody label for the key
                  var mel = SIGHT_READ_MELODIES.find(function(m) { return m.id === key; });
                  var label = mel ? mel.label : key.charAt(0).toUpperCase() + key.slice(1);
                  return h('div', {
                    key: key,
                    className: 'flex items-center justify-between p-2 rounded ' +
                      (isDark ? 'bg-slate-700' : 'bg-slate-50')
                  },
                    h('span', { className: headingClass + ' text-xs' }, label),
                    h('span', null, '\u2B50'.repeat(sc.stars)),
                    h('span', { className: subTextClass },
                      sc.correctFirst + '/' + sc.total + ' in ' + sc.time + 's')
                  );
                })
              )
            )
          );
        }

        // ════════════════════════════════════════
        // Quests summary (sidebar card)
        // ════════════════════════════════════════

        function renderQuestSummary() {
          var quests = [
            { icon: '\uD83C\uDFBC', label: 'Discover your vocal range',
              done: !!(rangeLow && rangeHigh),
              progress: (rangeLow && rangeHigh) ? '\u2713' : '\u2014' },
            { icon: '\uD83C\uDFB5', label: 'Sing 5 intervals correctly',
              done: intervalsCorrect >= 5,
              progress: intervalsCorrect + '/5' },
            { icon: '\uD83C\uDF0A', label: 'Achieve healthy vibrato',
              done: !!achievedHealthyVibrato,
              progress: achievedHealthyVibrato ? '\u2713' : '\u2014' }
          ];

          return h('div', { className: cardClass },
            h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
              '\uD83C\uDFC6', 'Quests'),
            h('div', { className: 'space-y-1.5', role: 'list' },
              quests.map(function(q, idx) {
                return h('div', {
                  key: idx,
                  className: 'flex items-center gap-3 p-2 rounded-lg ' +
                    (q.done
                      ? (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200')
                      : (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-200')),
                  role: 'listitem'
                },
                  h('span', { className: 'text-lg' }, q.done ? '\u2705' : q.icon),
                  h('div', { className: 'flex-1' },
                    h('div', { className: headingClass + ' text-xs' }, q.label),
                    h('div', { className: subTextClass }, q.progress)),
                  q.done && h('span', { className: 'text-green-500 font-bold text-xs' }, 'DONE')
                );
              })
            )
          );
        }

        // ════════════════════════════════════════
        // Main render: header + tabs + content
        // ════════════════════════════════════════

        return h('div', {
          className: 'space-y-4 max-w-4xl mx-auto pb-8',
          role: 'main',
          'aria-label': 'Singing and Vocal Lab'
        },
          // Header
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                className: btnSecondary + ' flex items-center gap-1',
                onClick: function() {
                  if (isRecording) stopMic();
                  stopRefTone();
                  setStemLabTool(null);
                },
                'aria-label': 'Go back to STEM Lab tool list'
              },
                ArrowLeft && h(ArrowLeft, { size: 14 }),
                'Back'),
              h('div', null,
                h('h2', { className: headingClass + ' text-lg flex items-center gap-2' },
                  h('span', null, '\uD83C\uDFA4'), 'Singing Lab'),
                h('p', { className: subTextClass },
                  'Pitch training, vocal range, vibrato & interval singing'))),
            // Recording indicator
            isRecording && h('div', {
              className: 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ' +
                (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-50 text-red-600'),
              role: 'status',
              'aria-live': 'polite'
            }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse' }), 'Listening')),

          // Tab navigation
          h('div', {
            className: 'flex gap-1 p-1 rounded-xl overflow-x-auto ' + (isDark ? 'bg-slate-800' : 'bg-slate-100'),
            role: 'tablist',
            'aria-label': 'Singing Lab sections'
          },
            TABS.map(function(tab) {
              var isActive = activeTab === tab.id;
              return h('button', {
                key: tab.id,
                role: 'tab',
                'aria-selected': isActive ? 'true' : 'false',
                'aria-controls': 'singing-panel-' + tab.id,
                tabIndex: isActive ? 0 : -1,
                className: 'flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-rose-400 ' +
                  (isActive
                    ? (isDark ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-700 shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')),
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

          // Quest summary
          renderQuestSummary(),

          // Tab panels
          h('div', {
            id: 'singing-panel-' + activeTab,
            role: 'tabpanel',
            'aria-label': (TABS.find(function(t) { return t.id === activeTab; }) || {}).label + ' panel'
          },
            activeTab === 'pitch' && renderPitchDetective(),
            activeTab === 'range' && renderVocalRange(),
            activeTab === 'vibrato' && renderVibratoLab(),
            activeTab === 'intervals' && renderIntervalSinger(),
            activeTab === 'warmups' && renderWarmups(),
            activeTab === 'sightread' && renderSightReading()
          ),

          // Bottom info
          h('div', { className: cardClass + ' text-center' },
            h('p', { className: subTextClass + ' italic' },
              'This singing lab uses real-time pitch detection via the Web Audio API. ' +
              'All processing happens locally in your browser \u2014 no audio is recorded or transmitted.'),
            h('p', { className: subTextClass + ' mt-1' },
              'Ported from Rachel Pomeranz\'s vocal studio tools. ' +
              'For professional vocal training, please consult a qualified voice teacher.'))
        );
      })();
    }
  });

})();

}
