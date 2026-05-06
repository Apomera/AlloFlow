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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-singing')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-singing';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


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

    c.strokeStyle = isDark ? '#94a3b8' : '#94a3b8';
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
        c.fillStyle = isDark ? '#94a3b8' : '#94a3b8';
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
      c.fillStyle = isDark ? '#94a3b8' : '#94a3b8';
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
    c.fillStyle = isDark ? '#94a3b8' : '#94a3b8';
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
      c.fillStyle = isDark ? '#94a3b8' : '#94a3b8';
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
    c.fillStyle = isDark ? '#94a3b8' : '#94a3b8';
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
        c.fillStyle = isDark ? '#1e293b' : '#94a3b8';
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
          c.strokeStyle = isDark ? '#334155' : '#94a3b8';
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
  // Vocal anatomy region definitions
  // ═══════════════════════════════════════════

  var ANATOMY_REGIONS = [
    { id: 'lungs', label: 'Lungs & Diaphragm', color: '#60a5fa',
      what: 'Your lungs are like two spongy bags that hold air. The diaphragm is a big dome-shaped muscle underneath them.',
      singing: 'The diaphragm is your engine! When it contracts, it pulls air into your lungs. Good breath support means using your diaphragm to control a steady stream of air.',
      funFact: 'Your diaphragm moves about 1 inch when you breathe quietly, but up to 4 inches when you sing!',
      tryThis: 'Put your hand on your belly. Breathe in deeply \u2014 your belly should push OUT (that\'s your diaphragm contracting). This is called diaphragmatic breathing.',
      injuries: 'Shallow "chest breathing" (not using the diaphragm) forces the throat muscles to compensate, leading to vocal strain and fatigue. Chronic tension in the shoulders and upper chest can also restrict lung capacity.',
      prevention: 'Practice diaphragmatic breathing daily. Lie on your back with a book on your belly \u2014 it should rise when you inhale. Before singing, do 10 slow belly breaths to activate the diaphragm.' },
    { id: 'larynx', label: 'Larynx & Vocal Folds', color: '#f472b6',
      what: 'Your larynx (voice box) sits in your throat and contains two small bands of muscle called vocal folds (or vocal cords).',
      singing: 'When air from your lungs passes through your vocal folds, they vibrate hundreds of times per second to create sound. Faster vibrations = higher pitch!',
      funFact: 'Your vocal folds are only about 15\u201320mm long (smaller than a penny!) but they can vibrate over 1,000 times per second for high notes.',
      tryThis: 'Gently place your fingers on the front of your throat and hum. You can feel the vibrations of your vocal folds!',
      injuries: 'The vocal folds are the most vulnerable part of the voice. Common injuries include: vocal nodules (callous-like bumps from chronic overuse), polyps (fluid-filled swellings, often from a single traumatic event like screaming), hemorrhage (bleeding from burst blood vessels), and contact ulcers (sores from forceful fold collision). These cause hoarseness, breathiness, reduced range, and vocal fatigue.',
      prevention: 'Always warm up before singing or extended speaking. Never sing through pain or hoarseness. Stay hydrated (vocal folds need moisture to vibrate freely). Avoid whispering (it actually increases fold tension). Take vocal rest days, especially after heavy use. Stop singing immediately if you feel pain, scratchiness, or sudden voice loss.' },
    { id: 'pharynx', label: 'Pharynx (Throat)', color: '#a78bfa',
      what: 'The pharynx is the tube-shaped passage behind your mouth and nose that connects to your larynx.',
      singing: 'Think of the pharynx as a resonating chamber \u2014 like the body of a guitar. A relaxed, open throat creates a richer, fuller sound.',
      funFact: 'Opera singers learn to "open their throat" to create more resonance space, which is why they can project over an orchestra without a microphone!',
      tryThis: 'Yawn gently and notice how your throat opens up. Try to sing a note with that open feeling.',
      injuries: 'Chronic throat tension (called muscle tension dysphonia) is extremely common in teachers, singers, and people who use their voice professionally. It causes the muscles around the larynx to squeeze, constricting the sound and leading to pain, fatigue, and a strained quality.',
      prevention: 'Keep the throat relaxed while singing \u2014 the "inner smile" or "beginning of a yawn" feeling helps. Avoid pushing or straining for high notes; instead, use proper breath support. Gentle massage of the neck and jaw muscles before and after singing can release tension.' },
    { id: 'mouth', label: 'Oral Cavity', color: '#34d399',
      what: 'Your mouth contains your tongue, teeth, hard palate (roof of mouth), and lips \u2014 all of which shape the sound.',
      singing: 'Your tongue is the most important articulator! Its position determines which vowel sound you make. Lips also help shape "OO" and "OH" sounds.',
      funFact: 'Your tongue has 8 muscles and is one of the most flexible parts of your body. Singers spend years learning precise tongue control!',
      tryThis: 'Say "EE-AH-OO" slowly and notice how your tongue moves: high-front for EE, low-back for AH, high-back for OO.',
      injuries: 'Jaw tension (TMJ/TMD) is common in singers who clench while singing or sleeping. A tight jaw restricts mouth opening, muffles sound, and can cause clicking, pain, and headaches. Tongue tension \u2014 where the tongue bunches at the root \u2014 constricts the throat and affects tone quality.',
      prevention: 'Practice singing with a relaxed, dropped jaw. Massage the jaw joints (in front of your ears) before practice. Avoid chewing gum excessively. Do tongue stretches: stick your tongue out, move it side to side, and practice keeping the back of the tongue relaxed while singing.' },
    { id: 'nasal', label: 'Nasal Cavity', color: '#fbbf24',
      what: 'The nasal cavity is the air-filled space above the roof of your mouth, inside your nose.',
      singing: 'When the soft palate is lowered, sound vibrates through your nasal cavity, creating nasal resonance (like humming or "ng" sounds).',
      funFact: 'The French language uses nasal vowels (like in "bon") where air flows through both the mouth AND nose at the same time!',
      tryThis: 'Pinch your nose and say "mama." Notice how it sounds different? That\'s because M and N need nasal airflow!',
      injuries: 'Chronic nasal congestion from allergies, sinusitis, or environmental irritants can block resonance and force mouth breathing, which dries out the vocal folds. Post-nasal drip irritates the larynx and causes frequent throat clearing \u2014 which slams the vocal folds together and can cause swelling.',
      prevention: 'Treat allergies proactively. Use a humidifier, especially in dry Maine winters. Stay hydrated. Avoid throat clearing \u2014 instead, swallow or take a sip of water. Use saline nasal rinses to keep passages clear.' },
    { id: 'velum', label: 'Soft Palate (Velum)', color: '#fb923c',
      what: 'The soft palate is the fleshy, moveable tissue at the back of the roof of your mouth.',
      singing: 'The soft palate acts like a gate between your mouth and nose. Raising it directs all sound through your mouth (oral sounds). Lowering it lets sound into your nose (nasal sounds).',
      funFact: 'When you gag, your soft palate automatically raises \u2014 that\'s the same lifting motion singers use for clear, non-nasal tone!',
      tryThis: 'Say "AH" with your mouth wide open. Now say "NG" (like the end of "sing"). Feel how your soft palate moves between those two sounds?',
      injuries: 'An overly tense soft palate blocks nasal resonance entirely, creating a "tight" or "pinched" quality. Conversely, insufficient palate lift causes excessive nasality on non-nasal sounds. Neither causes tissue injury per se, but both contribute to compensatory strain elsewhere.',
      prevention: 'Practice alternating between nasal ("ng") and oral ("ah") sounds to develop palate awareness and control. Gentle humming warms up the palate. Avoid forcing the palate up by tensing the throat \u2014 it should rise naturally with an open, lifted feeling.' }
  ];

  // ── Common Vocal Injuries Reference ──
  var VOCAL_INJURIES = [
    { name: 'Vocal Nodules', emoji: '\u26A0\uFE0F', severity: 'moderate',
      what: 'Small, callous-like growths on both vocal folds, usually at the midpoint where they collide hardest.',
      causes: 'Chronic voice overuse or misuse: yelling, talking loudly in noisy environments, singing without proper technique, excessive throat clearing.',
      symptoms: 'Hoarseness, breathiness, reduced vocal range (especially high notes), voice fatigue, feeling of "something in the throat."',
      treatment: 'Voice therapy with an SLP is the primary treatment. Surgery is rarely needed. Rest, hydration, and correcting the abusive vocal behaviors that caused them.',
      whoGetsIt: 'Very common in teachers, singers, coaches, cheerleaders, and children who yell frequently. Sometimes called "singer\'s nodes."' },
    { name: 'Vocal Polyps', emoji: '\uD83D\uDCA7', severity: 'moderate',
      what: 'Fluid-filled or blood-filled swelling on one vocal fold, usually larger and softer than nodules.',
      causes: 'Often caused by a single episode of vocal trauma (screaming at a concert, intense coughing) or chronic irritation from smoking, reflux, or allergies.',
      symptoms: 'Similar to nodules but often more sudden onset. Hoarseness, a "split" sound in the voice, reduced range, vocal fatigue.',
      treatment: 'Small polyps may resolve with voice therapy. Larger ones often require microsurgery followed by voice therapy. Excellent prognosis with proper treatment.',
      whoGetsIt: 'Adults more than children. Associated with smoking, gastric reflux (GERD/LPR), and sudden vocal strain.' },
    { name: 'Vocal Hemorrhage', emoji: '\uD83D\uDEA8', severity: 'serious',
      what: 'A burst blood vessel on the vocal fold surface, causing sudden voice loss. This is a vocal emergency.',
      causes: 'Singing or shouting with extreme force, heavy coughing or sneezing, use of blood-thinning medications, singing while sick.',
      symptoms: 'Sudden voice loss or dramatic voice change during or immediately after vocal effort. The voice may cut out mid-sentence.',
      treatment: 'Immediate and complete vocal rest (no talking, no whispering). See an ENT (otolaryngologist) urgently. Usually heals in 1\u20132 weeks with strict rest. Singing too soon risks permanent scarring.',
      whoGetsIt: 'Can happen to anyone during intense vocal effort. Higher risk during illness, menstruation (hormonal changes affect fold vascularity), or when taking aspirin/ibuprofen.' },
    { name: 'Laryngitis', emoji: '\uD83E\uDD27', severity: 'mild',
      what: 'Inflammation and swelling of the vocal folds, usually from infection or overuse. The most common voice problem.',
      causes: 'Upper respiratory infections (colds, flu), voice overuse, exposure to irritants (smoke, dry air, pollution), acid reflux.',
      symptoms: 'Hoarseness, weak or lost voice, scratchy throat, dry cough, sore throat.',
      treatment: 'Vocal rest, hydration, warm (not hot) liquids, steam inhalation, humidifier. Acute laryngitis usually resolves in 1\u20132 weeks. If hoarseness lasts more than 2\u20133 weeks, see a doctor.',
      whoGetsIt: 'Extremely common \u2014 nearly everyone experiences it. More frequent in winter, in dry climates, and among heavy voice users.' },
    { name: 'Muscle Tension Dysphonia (MTD)', emoji: '\uD83D\uDCAA', severity: 'moderate',
      what: 'Excessive tension in the muscles around the larynx that constricts the voice. No structural damage to the folds themselves.',
      causes: 'Stress, poor vocal technique, talking over background noise, compensating for another voice problem (like laryngitis \u2014 the tension "sticks" even after the original problem heals).',
      symptoms: 'Strained or effortful voice, neck/jaw pain while speaking, voice fatigue by end of day, feeling like you\'re "pushing" to talk.',
      treatment: 'Voice therapy with an SLP is highly effective. Laryngeal massage, relaxation techniques, breath support training. Stress management. Usually resolves with therapy.',
      whoGetsIt: 'Very common in teachers, call center workers, and anyone under vocal or emotional stress. Often misdiagnosed or overlooked.' },
    { name: 'Acid Reflux (LPR)', emoji: '\uD83D\uDD25', severity: 'mild',
      what: 'Stomach acid travels up to the throat and irritates the vocal folds. Called LPR (Laryngopharyngeal Reflux) when it reaches the voice box.',
      causes: 'Eating close to bedtime, spicy/acidic/fatty foods, caffeine, alcohol, obesity, stress. Unlike typical heartburn, LPR often has no chest burning.',
      symptoms: 'Morning hoarseness, chronic throat clearing, sensation of mucus in the throat, bitter taste, chronic cough, voice worse after meals.',
      treatment: 'Dietary changes (avoid triggers 3+ hours before bed), elevate head of bed, antacid medications, smaller meals. Voice therapy can help break the throat-clearing habit.',
      whoGetsIt: 'Extremely common and often undiagnosed. Affects singers significantly because acid damages the delicate vocal fold lining.' }
  ];

  var PREVENTION_TIPS = [
    { icon: '\uD83D\uDCA7', title: 'Stay Hydrated', tip: 'Drink 6\u20138 glasses of water daily. Your vocal folds need a thin layer of mucus to vibrate smoothly. Caffeine and alcohol are dehydrating \u2014 drink extra water to compensate.', priority: 'essential' },
    { icon: '\uD83C\uDFB5', title: 'Always Warm Up', tip: 'Never sing "cold." Start with gentle humming, lip trills, or sirens for 5\u201310 minutes before any singing. This increases blood flow to the vocal folds and reduces injury risk.', priority: 'essential' },
    { icon: '\uD83E\uDD2B', title: 'Rest Your Voice', tip: 'After heavy vocal use (concerts, long rehearsals, teaching all day), give your voice recovery time. Aim for 10 minutes of silence for every 1 hour of heavy use. Complete vocal rest days are important.', priority: 'essential' },
    { icon: '\u26D4', title: 'Never Sing Through Pain', tip: 'Pain is your body\'s alarm system. If singing hurts, stop immediately. Pushing through pain causes real tissue damage. Hoarseness lasting more than 2 weeks needs medical evaluation.', priority: 'critical' },
    { icon: '\uD83D\uDE45', title: 'Avoid Vocal Abuse', tip: 'Yelling, screaming, excessive throat clearing, loud whispering, and talking over noise all slam the vocal folds together with damaging force. Find alternatives: clap for attention, use a microphone, sip water instead of clearing.', priority: 'essential' },
    { icon: '\uD83C\uDF2C\uFE0F', title: 'Humidify Your Space', tip: 'Dry air dries out vocal folds. Use a humidifier (especially in winter), avoid air conditioning drafts, and breathe through your nose (it warms and humidifies air before it reaches the throat).', priority: 'helpful' },
    { icon: '\uD83C\uDF4E', title: 'Watch Your Diet', tip: 'Acid reflux is a hidden voice killer. Avoid eating 2\u20133 hours before bed. Limit spicy, acidic, and fried foods. Caffeine and chocolate relax the stomach valve, increasing reflux risk.', priority: 'helpful' },
    { icon: '\uD83D\uDE34', title: 'Get Enough Sleep', tip: 'Vocal folds heal during sleep. 7\u20139 hours is ideal. Sleep deprivation leads to increased muscle tension and reduced vocal stamina. Elevate your head slightly if you have reflux.', priority: 'helpful' },
    { icon: '\uD83E\uDDD8', title: 'Manage Stress', tip: 'Stress directly increases laryngeal muscle tension. Practice deep breathing, progressive relaxation, or mindfulness before performances. Physical exercise also helps release tension.', priority: 'helpful' },
    { icon: '\uD83D\uDC68\u200D\u2695\uFE0F', title: 'See an ENT if Concerned', tip: 'An otolaryngologist (ENT doctor) can examine your vocal folds with a tiny camera. Get checked if you have hoarseness lasting 2+ weeks, pain while singing, sudden voice changes, or persistent throat clearing.', priority: 'critical' }
  ];

  var VOWEL_SHAPES = [
    { id: 'ah', label: 'AH (\u0251)', tongueX: 0.4, tongueY: 0.8, mouthOpen: 0.9, lipRound: 0.1 },
    { id: 'ee', label: 'EE (i)', tongueX: 0.8, tongueY: 0.3, mouthOpen: 0.3, lipRound: 0.0 },
    { id: 'oo', label: 'OO (u)', tongueX: 0.3, tongueY: 0.3, mouthOpen: 0.3, lipRound: 0.9 },
    { id: 'eh', label: 'EH (\u025B)', tongueX: 0.7, tongueY: 0.5, mouthOpen: 0.6, lipRound: 0.1 },
    { id: 'oh', label: 'OH (o)', tongueX: 0.35, tongueY: 0.5, mouthOpen: 0.5, lipRound: 0.7 }
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
      c.fillStyle = isDk ? '#94a3b8' : '#94a3b8';
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
  // Vocal Anatomy Canvas Drawing
  // ═══════════════════════════════════════════

  /**
   * Draw interactive sagittal cross-section of the vocal tract.
   * @param {HTMLCanvasElement} canvas
   * @param {string|null} activeRegion - id of highlighted region
   * @param {number} animFrame - current animation frame counter
   * @param {boolean} isDark - dark mode flag
   * @param {string} animMode - 'none'|'breathing'|'phonation'|'vowel'
   * @param {object} opts - { breathPhase, pitchHigh, vowelShape }
   */
  function drawVocalAnatomy(canvas, activeRegion, animFrame, isDark, animMode, opts) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var W = canvas.width;
    var H = canvas.height;
    var dpr = window.devicePixelRatio || 1;

    // HiDPI setup
    if (canvas.getAttribute('data-dpr') !== String(dpr)) {
      canvas.width = 500 * dpr;
      canvas.height = 400 * dpr;
      canvas.style.width = '500px';
      canvas.style.height = '400px';
      canvas.setAttribute('data-dpr', String(dpr));
      W = canvas.width;
      H = canvas.height;
      ctx.scale(dpr, dpr);
    }

    // Work in logical pixels
    var LW = 500;
    var LH = 400;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    var o = opts || {};
    var breathPhase = o.breathPhase || 0; // 0..1 cycle
    var pitchHigh = o.pitchHigh || false;
    var vowelShape = o.vowelShape || null; // { tongueX, tongueY, mouthOpen, lipRound }

    // Animation offsets
    var breathOffset = 0;
    var foldOpen = 0.5; // 0=closed, 1=fully open
    var foldWave = 0;
    if (animMode === 'breathing') {
      // 0..0.5 = inhale (diaphragm down, lungs expand)
      // 0.5..1 = exhale (diaphragm up, lungs compress)
      breathOffset = Math.sin(breathPhase * Math.PI * 2) * 8;
      foldOpen = 0.8; // mostly open during breathing
    } else if (animMode === 'phonation') {
      var vibSpeed = pitchHigh ? 0.3 : 0.15;
      foldOpen = 0.1 + Math.abs(Math.sin(animFrame * vibSpeed)) * 0.35;
      foldWave = Math.sin(animFrame * vibSpeed * 0.7) * 2;
    } else if (animMode === 'vowel') {
      foldOpen = 0.3; // slightly open for phonation
    } else {
      foldOpen = 0.5; // neutral resting
    }

    // Region alpha helper
    function regionAlpha(id) {
      if (!activeRegion) return 1.0;
      return id === activeRegion ? 1.0 : 0.3;
    }
    function regionColor(id, baseColor) {
      var a = regionAlpha(id);
      // Parse hex color and apply alpha
      var r = parseInt(baseColor.slice(1, 3), 16);
      var g = parseInt(baseColor.slice(3, 5), 16);
      var b = parseInt(baseColor.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    function regionStroke(id, baseColor) {
      var a = regionAlpha(id);
      var r = parseInt(baseColor.slice(1, 3), 16);
      var g = parseInt(baseColor.slice(3, 5), 16);
      var b = parseInt(baseColor.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.min(1, a + 0.2) + ')';
    }
    function fillAlpha(id) {
      return regionAlpha(id) * 0.35;
    }
    function regionFill(id, baseColor) {
      var a = fillAlpha(id);
      var r = parseInt(baseColor.slice(1, 3), 16);
      var g = parseInt(baseColor.slice(3, 5), 16);
      var b = parseInt(baseColor.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    // === COORDINATE SYSTEM ===
    // Sagittal view: left = front of body, right = back (spine side)
    // We draw: lungs/diaphragm at bottom, trachea going up, larynx, pharynx, mouth/nose at top
    // The tract curves forward from the throat to the mouth

    // ── 1. LUNGS & DIAPHRAGM (bottom) ──
    var lungColor = '#60a5fa';
    var lungScale = animMode === 'breathing' ? (1 + breathOffset * 0.01) : 1;

    ctx.save();
    // Left lung
    ctx.beginPath();
    ctx.moveTo(120, 355 - breathOffset * 0.5);
    ctx.bezierCurveTo(80, 340 - breathOffset, 75, 300 * lungScale, 110, 290);
    ctx.bezierCurveTo(130, 280, 155, 300, 155, 320);
    ctx.bezierCurveTo(155, 340, 140, 355 - breathOffset * 0.5, 120, 355 - breathOffset * 0.5);
    ctx.fillStyle = regionFill('lungs', lungColor);
    ctx.strokeStyle = regionStroke('lungs', lungColor);
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Right lung
    ctx.beginPath();
    ctx.moveTo(230, 355 - breathOffset * 0.5);
    ctx.bezierCurveTo(250, 340 - breathOffset, 255, 300 * lungScale, 240, 290);
    ctx.bezierCurveTo(220, 280, 195, 300, 195, 320);
    ctx.bezierCurveTo(195, 340, 210, 355 - breathOffset * 0.5, 230, 355 - breathOffset * 0.5);
    ctx.fillStyle = regionFill('lungs', lungColor);
    ctx.strokeStyle = regionStroke('lungs', lungColor);
    ctx.fill();
    ctx.stroke();

    // Diaphragm muscle (curved line below lungs)
    var diaY = 365 + breathOffset;
    ctx.beginPath();
    ctx.moveTo(65, diaY);
    ctx.bezierCurveTo(120, diaY - 15 + breathOffset * 0.5, 230, diaY - 15 + breathOffset * 0.5, 285, diaY);
    ctx.strokeStyle = regionStroke('lungs', lungColor);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Diaphragm label hash marks
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    for (var di = 0; di < 5; di++) {
      var dx = 90 + di * 40;
      ctx.beginPath();
      ctx.moveTo(dx, diaY - 5);
      ctx.lineTo(dx + 8, diaY + 8);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── 2. TRACHEA (windpipe) ──
    var tracheaTop = 220;
    var tracheaBottom = 285;
    var tracheaX = 175;
    var tracheaW = 24;

    ctx.fillStyle = regionFill('lungs', lungColor);
    ctx.strokeStyle = regionStroke('lungs', lungColor);
    ctx.lineWidth = 1.5;
    ctx.fillRect(tracheaX - tracheaW / 2, tracheaTop, tracheaW, tracheaBottom - tracheaTop);
    ctx.strokeRect(tracheaX - tracheaW / 2, tracheaTop, tracheaW, tracheaBottom - tracheaTop);

    // Cartilage rings on trachea
    ctx.strokeStyle = regionStroke('lungs', lungColor);
    ctx.lineWidth = 1;
    for (var ri = 0; ri < 6; ri++) {
      var ry = tracheaTop + 8 + ri * 10;
      ctx.beginPath();
      ctx.moveTo(tracheaX - tracheaW / 2 + 2, ry);
      ctx.bezierCurveTo(tracheaX - 4, ry - 3, tracheaX + 4, ry - 3, tracheaX + tracheaW / 2 - 2, ry);
      ctx.stroke();
    }

    // ── 3. LARYNX (voice box) ──
    var larynxColor = '#f472b6';
    var larynxTop = 190;
    var larynxBottom = 222;
    var larynxX = 175;
    var larynxW = 38;

    // Thyroid cartilage (shield shape)
    ctx.beginPath();
    ctx.moveTo(larynxX - larynxW / 2, larynxTop + 5);
    ctx.lineTo(larynxX - larynxW / 2 - 5, larynxTop + 16);
    ctx.lineTo(larynxX - larynxW / 2, larynxBottom);
    ctx.lineTo(larynxX + larynxW / 2, larynxBottom);
    ctx.lineTo(larynxX + larynxW / 2 + 5, larynxTop + 16);
    ctx.lineTo(larynxX + larynxW / 2, larynxTop + 5);
    ctx.closePath();
    ctx.fillStyle = regionFill('larynx', larynxColor);
    ctx.strokeStyle = regionStroke('larynx', larynxColor);
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Cricoid cartilage (ring below thyroid)
    ctx.beginPath();
    ctx.ellipse(larynxX, larynxBottom + 3, larynxW / 2 - 2, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = regionFill('larynx', larynxColor);
    ctx.strokeStyle = regionStroke('larynx', larynxColor);
    ctx.fill();
    ctx.stroke();

    // Vocal folds inside larynx
    var foldY = larynxTop + 18;
    var foldGap = foldOpen * 8;
    // Left fold
    ctx.beginPath();
    ctx.moveTo(larynxX - larynxW / 2 + 5, foldY);
    ctx.bezierCurveTo(
      larynxX - 8, foldY - 2 + foldWave,
      larynxX - 4, foldY - 1 + foldWave,
      larynxX - foldGap / 2, foldY
    );
    ctx.lineWidth = 3;
    ctx.strokeStyle = activeRegion === 'larynx'
      ? (isDark ? '#f9a8d4' : '#ec4899')
      : regionStroke('larynx', '#ec4899');
    ctx.stroke();

    // Right fold
    ctx.beginPath();
    ctx.moveTo(larynxX + larynxW / 2 - 5, foldY);
    ctx.bezierCurveTo(
      larynxX + 8, foldY - 2 - foldWave,
      larynxX + 4, foldY - 1 - foldWave,
      larynxX + foldGap / 2, foldY
    );
    ctx.stroke();

    // Arytenoid cartilages (small triangles at back of folds)
    ctx.fillStyle = regionStroke('larynx', larynxColor);
    // Left arytenoid
    ctx.beginPath();
    ctx.moveTo(larynxX + larynxW / 2 - 6, foldY - 4);
    ctx.lineTo(larynxX + larynxW / 2 - 2, foldY + 2);
    ctx.lineTo(larynxX + larynxW / 2 - 10, foldY + 2);
    ctx.closePath();
    ctx.fill();
    // Right arytenoid
    ctx.beginPath();
    ctx.moveTo(larynxX - larynxW / 2 + 6, foldY - 4);
    ctx.lineTo(larynxX - larynxW / 2 + 2, foldY + 2);
    ctx.lineTo(larynxX - larynxW / 2 + 10, foldY + 2);
    ctx.closePath();
    ctx.fill();

    // Phonation: sound waves emanating upward from folds
    if (animMode === 'phonation' && foldOpen < 0.4) {
      ctx.save();
      var waveAlpha = 0.15 + Math.abs(Math.sin(animFrame * 0.1)) * 0.3;
      ctx.strokeStyle = 'rgba(244,114,182,' + waveAlpha + ')';
      ctx.lineWidth = 1;
      for (var wi = 0; wi < 4; wi++) {
        var wy = foldY - 10 - wi * 12;
        var wAmp = 4 + wi * 2;
        ctx.beginPath();
        for (var wx = -15; wx <= 15; wx++) {
          var sy = wy + Math.sin((wx + animFrame * 3) * 0.3) * wAmp;
          if (wx === -15) ctx.moveTo(larynxX + wx, sy);
          else ctx.lineTo(larynxX + wx, sy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 4. EPIGLOTTIS (leaf flap above larynx) ──
    ctx.beginPath();
    ctx.moveTo(larynxX - 6, larynxTop);
    ctx.bezierCurveTo(larynxX - 10, larynxTop - 12, larynxX - 5, larynxTop - 20, larynxX, larynxTop - 18);
    ctx.bezierCurveTo(larynxX + 5, larynxTop - 20, larynxX + 10, larynxTop - 12, larynxX + 6, larynxTop);
    ctx.fillStyle = regionFill('larynx', '#e879a0');
    ctx.strokeStyle = regionStroke('larynx', '#e879a0');
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // ── 5. PHARYNX (throat tube above larynx) ──
    var pharynxColor = '#a78bfa';
    var pharynxTop = 115;
    var pharynxBottom = larynxTop - 16;
    var pharynxX = 175;
    var pharynxW = 30;

    ctx.beginPath();
    ctx.moveTo(pharynxX - pharynxW / 2, pharynxBottom);
    ctx.bezierCurveTo(
      pharynxX - pharynxW / 2 - 3, (pharynxTop + pharynxBottom) / 2,
      pharynxX - pharynxW / 2 + 2, pharynxTop + 10,
      pharynxX - pharynxW / 2 + 5, pharynxTop
    );
    ctx.lineTo(pharynxX + pharynxW / 2 - 5, pharynxTop);
    ctx.bezierCurveTo(
      pharynxX + pharynxW / 2 - 2, pharynxTop + 10,
      pharynxX + pharynxW / 2 + 3, (pharynxTop + pharynxBottom) / 2,
      pharynxX + pharynxW / 2, pharynxBottom
    );
    ctx.closePath();
    ctx.fillStyle = regionFill('pharynx', pharynxColor);
    ctx.strokeStyle = regionStroke('pharynx', pharynxColor);
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // ── 6. ORAL CAVITY (mouth) ──
    var mouthColor = '#34d399';
    // The oral cavity curves forward from the pharynx top
    var mouthOpen = vowelShape ? vowelShape.mouthOpen : 0.6;
    var lipRound = vowelShape ? vowelShape.lipRound : 0.2;
    var tongueX = vowelShape ? vowelShape.tongueX : 0.5;
    var tongueY = vowelShape ? vowelShape.tongueY : 0.6;

    // Hard palate (roof of mouth) — curved arch from pharynx forward
    var palateStartX = pharynxX - pharynxW / 2 + 5;
    var palateStartY = pharynxTop;
    var palateEndX = 75;
    var palateEndY = 90 + (1 - mouthOpen) * 5;

    ctx.beginPath();
    ctx.moveTo(palateStartX, palateStartY);
    ctx.bezierCurveTo(
      140, 75,
      110, 70,
      palateEndX, palateEndY
    );
    ctx.strokeStyle = regionStroke('mouth', mouthColor);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Teeth (small rectangles at front)
    var teethX = palateEndX - 2;
    var teethY = palateEndY;
    ctx.fillStyle = regionColor('mouth', isDark ? '#e2e8f0' : '#f1f5f9');
    ctx.strokeStyle = regionStroke('mouth', isDark ? '#cbd5e1' : '#94a3b8');
    ctx.lineWidth = 1;
    // Upper teeth
    ctx.fillRect(teethX - 5, teethY, 8, 6);
    ctx.strokeRect(teethX - 5, teethY, 8, 6);
    // Lower teeth
    var lowerTeethY = teethY + 20 + mouthOpen * 15;
    ctx.fillRect(teethX - 4, lowerTeethY, 7, 5);
    ctx.strokeRect(teethX - 4, lowerTeethY, 7, 5);

    // Lips
    var lipX = teethX - 8;
    var upperLipY = teethY - 2;
    var lowerLipY = lowerTeethY + 5;
    var lipW = lipRound * 4 + 4;

    ctx.beginPath();
    ctx.moveTo(lipX, upperLipY);
    ctx.bezierCurveTo(lipX - lipW, upperLipY - 3, lipX - lipW, upperLipY + 3, lipX, upperLipY + 4);
    ctx.fillStyle = regionFill('mouth', '#fb7185');
    ctx.strokeStyle = regionStroke('mouth', '#fb7185');
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lipX, lowerLipY);
    ctx.bezierCurveTo(lipX - lipW, lowerLipY - 3, lipX - lipW, lowerLipY + 3, lipX, lowerLipY + 4);
    ctx.fill();
    ctx.stroke();

    // Lower jaw line (floor of mouth)
    ctx.beginPath();
    ctx.moveTo(palateStartX + 10, pharynxTop + 40);
    ctx.bezierCurveTo(
      130, 140 + mouthOpen * 10,
      100, 130 + mouthOpen * 12,
      lipX, lowerLipY
    );
    ctx.strokeStyle = regionStroke('mouth', mouthColor);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tongue (curved shape inside mouth)
    var tBaseX = palateStartX;
    var tBaseY = pharynxTop + 30;
    // tongueX: 0=back, 1=front; tongueY: 0=high, 1=low
    var tTipX = tBaseX - 60 + (1 - tongueX) * 20;
    var tTipY = tBaseY - 20 + tongueY * 25;
    var tPeakX = tBaseX - 30 - tongueX * 25;
    var tPeakY = tBaseY - 10 + tongueY * 15 - (1 - tongueY) * 18;

    ctx.beginPath();
    ctx.moveTo(tBaseX, tBaseY);
    ctx.bezierCurveTo(
      tBaseX - 15, tBaseY - 5,
      tPeakX + 15, tPeakY + 10,
      tPeakX, tPeakY
    );
    ctx.bezierCurveTo(
      tPeakX - 10, tPeakY - 3,
      tTipX + 10, tTipY + 2,
      tTipX, tTipY
    );
    ctx.bezierCurveTo(
      tTipX - 5, tTipY + 8,
      tTipX + 5, tTipY + 15,
      tBaseX - 30, tBaseY + 10
    );
    ctx.lineTo(tBaseX, tBaseY);
    ctx.fillStyle = regionFill('mouth', '#f87171');
    ctx.strokeStyle = regionStroke('mouth', '#f87171');
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // ── 7. SOFT PALATE (velum) ──
    var velumColor = '#fb923c';
    // Connects at the back of the hard palate, hangs down
    var velumStartX = palateStartX + 2;
    var velumStartY = palateStartY + 2;
    // When lowered, opens nasal passage; when raised, closes it
    var velumDrop = (animMode === 'breathing') ? 8 : 3;

    ctx.beginPath();
    ctx.moveTo(velumStartX, velumStartY);
    ctx.bezierCurveTo(
      velumStartX - 8, velumStartY + 5,
      velumStartX - 12, velumStartY + 12 + velumDrop,
      velumStartX - 8, velumStartY + 18 + velumDrop
    );
    ctx.bezierCurveTo(
      velumStartX - 4, velumStartY + 22 + velumDrop,
      velumStartX + 2, velumStartY + 18 + velumDrop,
      velumStartX + 3, velumStartY + 10
    );
    ctx.fillStyle = regionFill('velum', velumColor);
    ctx.strokeStyle = regionStroke('velum', velumColor);
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // ── 8. NASAL CAVITY ──
    var nasalColor = '#fbbf24';
    // Above hard palate
    ctx.beginPath();
    ctx.moveTo(palateEndX, palateEndY - 8);
    ctx.bezierCurveTo(
      95, 55,
      130, 45,
      velumStartX, velumStartY - 10
    );
    ctx.lineTo(velumStartX + 5, velumStartY - 25);
    ctx.bezierCurveTo(
      130, 30,
      95, 35,
      palateEndX - 5, palateEndY - 22
    );
    ctx.closePath();
    ctx.fillStyle = regionFill('nasal', nasalColor);
    ctx.strokeStyle = regionStroke('nasal', nasalColor);
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Turbinates (wavy ridges inside nasal cavity)
    ctx.strokeStyle = regionStroke('nasal', nasalColor);
    ctx.lineWidth = 1;
    for (var ti = 0; ti < 3; ti++) {
      var tx = palateEndX + 15 + ti * 25;
      var ty = 50 + ti * 3;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(tx + 5, ty - 6, tx + 10, ty - 6, tx + 15, ty);
      ctx.stroke();
    }

    // Nostril opening at front
    ctx.beginPath();
    ctx.ellipse(palateEndX - 8, palateEndY - 18, 4, 6, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = regionFill('nasal', nasalColor);
    ctx.strokeStyle = regionStroke('nasal', nasalColor);
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // ── 9. SPINE (reference line on the right) ──
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.3)' : 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(220, 50);
    ctx.bezierCurveTo(225, 120, 225, 200, 220, 280);
    ctx.stroke();
    // Vertebrae marks
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.3)';
    for (var vi = 0; vi < 12; vi++) {
      var vy = 55 + vi * 20;
      ctx.beginPath();
      ctx.moveTo(216, vy);
      ctx.lineTo(224, vy);
      ctx.stroke();
    }
    ctx.restore();

    // ── AIR FLOW PARTICLES (breathing animation) ──
    if (animMode === 'breathing') {
      ctx.save();
      var isInhale = breathPhase < 0.5;
      var particleColor = isInhale ? 'rgba(96,165,250,' : 'rgba(96,165,250,';
      // Draw particles along the airway
      var particleCount = 8;
      for (var pi = 0; pi < particleCount; pi++) {
        var pPhase = ((breathPhase * 2 + pi / particleCount) % 1);
        var pAlpha = 0.3 + Math.sin(pPhase * Math.PI) * 0.5;
        var pSize = 2 + Math.sin(pPhase * Math.PI) * 1.5;
        ctx.fillStyle = particleColor + pAlpha + ')';

        // Path: from diaphragm up through trachea, larynx, pharynx, out mouth
        var py, px;
        if (isInhale) {
          // Particles move inward: mouth → lungs
          var t = pPhase;
          if (t < 0.3) {
            // In the mouth/pharynx area
            px = 75 + t * 300;
            py = 90 + t * 150;
          } else if (t < 0.6) {
            // Through pharynx/larynx
            px = tracheaX + (Math.random() - 0.5) * 8;
            py = pharynxTop + (t - 0.3) * 400;
          } else {
            // Into lungs
            px = tracheaX + (Math.random() - 0.5) * 40;
            py = 280 + (t - 0.6) * 200;
          }
        } else {
          // Particles move outward: lungs → mouth
          var t2 = pPhase;
          if (t2 < 0.3) {
            px = tracheaX + (Math.random() - 0.5) * 30;
            py = 330 - t2 * 200;
          } else if (t2 < 0.6) {
            px = tracheaX + (Math.random() - 0.5) * 8;
            py = 220 - (t2 - 0.3) * 300;
          } else {
            px = 175 - (t2 - 0.6) * 250;
            py = 120 - (t2 - 0.6) * 80;
          }
        }

        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // INHALE / EXHALE label
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isInhale
        ? (isDark ? '#93c5fd' : '#3b82f6')
        : (isDark ? '#fca5a5' : '#ef4444');
      ctx.fillText(isInhale ? 'INHALE' : 'EXHALE', 340, 360);

      // Arrow
      ctx.beginPath();
      if (isInhale) {
        ctx.moveTo(340, 370);
        ctx.lineTo(340, 385);
        ctx.moveTo(335, 380);
        ctx.lineTo(340, 385);
        ctx.lineTo(345, 380);
      } else {
        ctx.moveTo(340, 385);
        ctx.lineTo(340, 370);
        ctx.moveTo(335, 375);
        ctx.lineTo(340, 370);
        ctx.lineTo(345, 375);
      }
      ctx.stroke();

      ctx.restore();
    }

    // ── LABELS WITH LEADER LINES ──
    ctx.save();
    var labelFont = '10px sans-serif';
    var labelBold = 'bold 10px sans-serif';
    ctx.textAlign = 'left';

    var labels = [
      { id: 'nasal', text: 'Nasal Cavity', x: 270, y: 45, anchorX: 140, anchorY: 50 },
      { id: 'velum', text: 'Soft Palate', x: 270, y: 110, anchorX: velumStartX - 5, anchorY: velumStartY + 12 },
      { id: 'mouth', text: 'Oral Cavity', x: 10, y: 130, anchorX: 110, anchorY: 115 },
      { id: 'pharynx', text: 'Pharynx', x: 270, y: 155, anchorX: pharynxX + pharynxW / 2 + 3, anchorY: (pharynxTop + pharynxBottom) / 2 },
      { id: 'larynx', text: 'Larynx', x: 270, y: 200, anchorX: larynxX + larynxW / 2 + 3, anchorY: (larynxTop + larynxBottom) / 2 },
      { id: 'larynx', text: 'Vocal Folds', x: 270, y: 215, anchorX: larynxX + larynxW / 2 + 3, anchorY: foldY },
      { id: 'lungs', text: 'Trachea', x: 270, y: 260, anchorX: tracheaX + tracheaW / 2 + 3, anchorY: (tracheaTop + tracheaBottom) / 2 },
      { id: 'lungs', text: 'Lungs', x: 270, y: 320, anchorX: 240, anchorY: 320 },
      { id: 'lungs', text: 'Diaphragm', x: 270, y: 375, anchorX: 260, anchorY: diaY }
    ];

    labels.forEach(function(lbl) {
      var a = regionAlpha(lbl.id);
      var region = ANATOMY_REGIONS.find(function(r) { return r.id === lbl.id; });
      var color = region ? region.color : '#94a3b8';

      // Leader line
      ctx.beginPath();
      ctx.moveTo(lbl.anchorX, lbl.anchorY);
      ctx.lineTo(lbl.x - 2, lbl.y - 3);
      ctx.strokeStyle = isDark
        ? 'rgba(148,163,184,' + (a * 0.4) + ')'
        : 'rgba(100,116,139,' + (a * 0.35) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Small dot at anchor
      ctx.beginPath();
      ctx.arc(lbl.anchorX, lbl.anchorY, 2, 0, Math.PI * 2);
      ctx.fillStyle = regionColor(lbl.id, color);
      ctx.fill();

      // Label text
      if (activeRegion === lbl.id) {
        ctx.font = labelBold;
        ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
      } else {
        ctx.font = labelFont;
        ctx.fillStyle = isDark
          ? 'rgba(203,213,225,' + a + ')'
          : 'rgba(51,65,85,' + a + ')';
      }
      ctx.fillText(lbl.text, lbl.x, lbl.y);
    });
    ctx.restore();

    // ── TITLE ──
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('Sagittal Cross-Section of the Vocal Tract', LW / 2, 18);
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

        // ── Vocal anatomy state ──
        var anatomyOpenState = React.useState(false);
        var anatomyOpen = anatomyOpenState[0];
        var setAnatomyOpen = anatomyOpenState[1];

        var anatomyRegionState = React.useState(null);
        var anatomyRegion = anatomyRegionState[0];
        var setAnatomyRegion = anatomyRegionState[1];

        var anatomyAnimState = React.useState('none'); // 'none'|'breathing'|'phonation'|'vowel'
        var anatomyAnim = anatomyAnimState[0];
        var setAnatomyAnim = anatomyAnimState[1];

        var anatomyPitchHighState = React.useState(false);
        var anatomyPitchHigh = anatomyPitchHighState[0];
        var setAnatomyPitchHigh = anatomyPitchHighState[1];

        var anatomyVowelIdxState = React.useState(0);
        var anatomyVowelIdx = anatomyVowelIdxState[0];
        var setAnatomyVowelIdx = anatomyVowelIdxState[1];

        var anatomyCanvasRef = React.useRef(null);
        var anatomyAnimFrameRef = React.useRef(0);
        var anatomyRafRef = React.useRef(null);
        var anatomyBreathPhaseRef = React.useRef(0);

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

        // Vocal anatomy animation loop
        React.useEffect(function() {
          if (anatomyAnim === 'none') {
            // Static draw
            var vowel = (anatomyAnim === 'vowel') ? VOWEL_SHAPES[anatomyVowelIdx] : null;
            drawVocalAnatomy(anatomyCanvasRef.current, anatomyRegion, 0, isDark, 'none', {
              breathPhase: 0,
              pitchHigh: anatomyPitchHigh,
              vowelShape: vowel
            });
            return;
          }

          var running = true;
          var lastTime = 0;
          var BREATH_CYCLE_MS = 3000; // 3 second breathing cycle

          function tick(timestamp) {
            if (!running) return;
            anatomyAnimFrameRef.current++;
            var frame = anatomyAnimFrameRef.current;

            var breathPhase = 0;
            if (anatomyAnim === 'breathing') {
              anatomyBreathPhaseRef.current = (timestamp % BREATH_CYCLE_MS) / BREATH_CYCLE_MS;
              breathPhase = anatomyBreathPhaseRef.current;
            }

            var vowelShape = null;
            if (anatomyAnim === 'vowel') {
              // Cycle through vowels every 2 seconds, or use selected
              var cycleIdx = Math.floor((timestamp / 2000) % VOWEL_SHAPES.length);
              vowelShape = VOWEL_SHAPES[anatomyVowelIdx !== undefined ? anatomyVowelIdx : cycleIdx];
            }

            drawVocalAnatomy(anatomyCanvasRef.current, anatomyRegion, frame, isDark, anatomyAnim, {
              breathPhase: breathPhase,
              pitchHigh: anatomyPitchHigh,
              vowelShape: vowelShape
            });

            anatomyRafRef.current = requestAnimationFrame(tick);
          }

          anatomyAnimFrameRef.current = 0;
          anatomyRafRef.current = requestAnimationFrame(tick);

          return function() {
            running = false;
            if (anatomyRafRef.current) {
              cancelAnimationFrame(anatomyRafRef.current);
              anatomyRafRef.current = null;
            }
          };
        }, [anatomyAnim, anatomyRegion, isDark, anatomyPitchHigh, anatomyVowelIdx]);

        // Static redraw when region changes and no animation is active
        React.useEffect(function() {
          if (anatomyAnim !== 'none') return;
          drawVocalAnatomy(anatomyCanvasRef.current, anatomyRegion, 0, isDark, 'none', {});
        }, [anatomyRegion, isDark, anatomyAnim]);

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
          : 'bg-white border border-slate-400 rounded-xl p-4 shadow-sm';
        var headingClass = isDark ? 'text-white font-bold' : 'text-slate-900 font-bold';
        var subTextClass = isDark ? 'text-slate-200 text-xs' : 'text-slate-600 text-xs';
        var btnPrimary = 'px-4 py-2 rounded-lg font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
          (isDark ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-400' : 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500');
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
          var noteColor = currentNote.midi <= 0 ? (isDark ? '#94a3b8' : '#94a3b8')
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
              h('canvas', { 'aria-label': 'Singing visualization',
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
              h('canvas', { 'aria-label': 'Singing visualization',
                ref: pitchRollCanvasRef,
                width: 600,
                height: 200,
                className: 'w-full rounded border ' + (isDark ? 'border-slate-600' : 'border-slate-200'),
                role: 'img',
                'aria-label': 'Piano roll showing pitch history. Green line indicates on-pitch singing (within 10 cents), yellow indicates close (within 25 cents), red indicates off-pitch (beyond 25 cents).'
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
                        ? 'bg-rose-700 text-white ring-2 ring-rose-300'
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
                  'aria-label': 'Cancel pitch match game',
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
                  'aria-label': 'Cancel vocal range test (low range)',
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
                  'aria-label': 'Cancel vocal range test (high range)',
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
                  'aria-label': 'Restart vocal range test',
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
              h('canvas', { 'aria-label': 'Singing visualization',
                ref: rangeKeyboardCanvasRef,
                width: 600,
                height: 80,
                tabIndex: 0,
                className: 'w-full rounded border ' + (isDark ? 'border-slate-600' : 'border-slate-200') + ' focus:outline-none focus:ring-2 focus:ring-rose-400',
                role: 'img',
                'aria-label': 'Piano keyboard showing vocal range. Use Left/Right arrows to navigate notes, Enter or Space to play.',
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
                },
                onKeyDown: function(e) {
                  var cvs = rangeKeyboardCanvasRef.current;
                  if (!cvs || !cvs._keyRects || cvs._keyRects.length === 0) return;
                  // Initialize focused key index if not set
                  if (typeof cvs._focusedKeyIdx !== 'number') cvs._focusedKeyIdx = 0;
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    cvs._focusedKeyIdx = Math.min(cvs._focusedKeyIdx + 1, cvs._keyRects.length - 1);
                    var kr = cvs._keyRects[cvs._focusedKeyIdx];
                    if (announceToSR) announceToSR(midiToNoteName(kr.midi).str);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    cvs._focusedKeyIdx = Math.max(cvs._focusedKeyIdx - 1, 0);
                    var kr = cvs._keyRects[cvs._focusedKeyIdx];
                    if (announceToSR) announceToSR(midiToNoteName(kr.midi).str);
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var kr = cvs._keyRects[cvs._focusedKeyIdx];
                    if (kr) {
                      playMidiNote(kr.midi, 1.5, 0.12);
                      setRefTonePlaying(kr.midi);
                      setTimeout(function() { setRefTonePlaying(null); }, 1600);
                    }
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
          var quality = { label: 'No Signal', color: '#94a3b8', desc: 'Start singing a sustained note.' };
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
              h('canvas', { 'aria-label': 'Singing visualization',
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
                    'aria-label': 'Vibrato exercise: ' + ex.label + ' — ' + ex.desc,
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
                            ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-700 text-white')
                            : (isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600')),
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
                          : (isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600')),
                      'aria-label': 'Set interval direction to up',
                      onClick: function() { setIntervalDirection('up'); }
                    }, '\u2B06 UP'),
                    h('button', {
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                        (intervalDirection === 'down'
                          ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                          : (isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600')),
                      'aria-label': 'Set interval direction to down',
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
                h('canvas', { 'aria-label': 'Singing visualization',
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
                    'aria-label': 'Skip this interval',
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

            // ── Interactive Vocal Anatomy ──
            h('div', { className: cardClass },
              h('button', {
                className: 'w-full flex items-center justify-between text-left',
                onClick: function() { setAnatomyOpen(!anatomyOpen); },
                'aria-expanded': anatomyOpen ? 'true' : 'false',
                'aria-controls': 'anatomy-panel'
              },
                h('h3', { className: headingClass + ' text-sm flex items-center gap-2' },
                  '\uD83E\uDEC1', 'Vocal Anatomy Explorer'),
                h('span', { className: subTextClass + ' text-lg transition-transform ' + (anatomyOpen ? 'rotate-180' : '') },
                  '\u25BC')),

              anatomyOpen && h('div', {
                id: 'anatomy-panel',
                className: 'mt-4 space-y-4'
              },
                h('p', { className: subTextClass + ' mb-2' },
                  'Explore how your body makes sound. Click a region to learn about it, or turn on animations to see it in action.'),

                // Canvas diagram
                h('div', { className: 'flex justify-center' },
                  h('canvas', { 'aria-label': 'Singing visualization',
                    ref: anatomyCanvasRef,
                    width: 500,
                    height: 400,
                    tabIndex: 0,
                    role: 'img',
                    'aria-label': 'Sagittal cross-section diagram of the human vocal tract. Use Left/Right arrows to cycle regions, Enter or Space to select.',
                    className: 'rounded-lg border ' + (isDark ? 'border-slate-600' : 'border-slate-200') + ' focus:outline-none focus:ring-2 focus:ring-rose-400',
                    style: { maxWidth: '100%', height: 'auto', cursor: 'pointer' },
                    onClick: function(e) {
                      // Click-to-select region based on canvas position
                      var rect = e.target.getBoundingClientRect();
                      var x = (e.clientX - rect.left) / rect.width * 500;
                      var y = (e.clientY - rect.top) / rect.height * 400;
                      // Hit test regions by approximate bounding boxes
                      var hit = null;
                      if (y > 280 && y < 395) hit = 'lungs';
                      else if (y > 185 && y < 230) hit = 'larynx';
                      else if (y > 110 && y < 185 && x > 150) hit = 'pharynx';
                      else if (y < 70 && x < 200) hit = 'nasal';
                      else if (y > 70 && y < 140 && x < 170) hit = 'mouth';
                      else if (y > 95 && y < 130 && x > 150 && x < 190) hit = 'velum';
                      setAnatomyRegion(hit === anatomyRegion ? null : hit);
                    },
                    onKeyDown: function(e) {
                      var regionIds = ANATOMY_REGIONS.map(function(r) { return r.id; });
                      var currentIdx = anatomyRegion ? regionIds.indexOf(anatomyRegion) : -1;
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        var nextIdx = (currentIdx + 1) % regionIds.length;
                        setAnatomyRegion(regionIds[nextIdx]);
                        if (announceToSR) announceToSR(ANATOMY_REGIONS[nextIdx].label);
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        var prevIdx = (currentIdx - 1 + regionIds.length) % regionIds.length;
                        setAnatomyRegion(regionIds[prevIdx]);
                        if (announceToSR) announceToSR(ANATOMY_REGIONS[prevIdx].label);
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (currentIdx >= 0) {
                          // Toggle current region off/on
                          setAnatomyRegion(null);
                        } else {
                          setAnatomyRegion(regionIds[0]);
                          if (announceToSR) announceToSR(ANATOMY_REGIONS[0].label);
                        }
                      }
                    }
                  })
                ),

                // Animation controls
                h('div', { className: 'space-y-2' },
                  h('div', { className: headingClass + ' text-xs mb-1' }, 'Animations'),
                  h('div', { className: 'flex flex-wrap gap-2' },
                    ['none', 'breathing', 'phonation', 'vowel'].map(function(mode) {
                      var labels = { none: 'None', breathing: 'Breathing', phonation: 'Phonation', vowel: 'Vowel Shaping' };
                      var icons = { none: '\u23F9', breathing: '\uD83C\uDF2C\uFE0F', phonation: '\uD83C\uDFB5', vowel: '\uD83D\uDDE3\uFE0F' };
                      var isActive = anatomyAnim === mode;
                      return h('button', {
                        key: mode,
                        className: 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ' +
                          (isActive
                            ? (isDark ? 'bg-rose-600 border-rose-500 text-white' : 'bg-rose-600 border-rose-500 text-white')
                            : (isDark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')),
                        onClick: function() { setAnatomyAnim(mode); }
                      }, icons[mode] + ' ' + labels[mode]);
                    })
                  ),

                  // Phonation sub-controls: pitch toggle
                  anatomyAnim === 'phonation' && h('div', { className: 'flex items-center gap-3 mt-2 pl-1' },
                    h('span', { className: subTextClass }, 'Pitch:'),
                    h('button', {
                      className: 'px-3 py-1 rounded text-xs font-semibold transition-colors ' +
                        (!anatomyPitchHigh
                          ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white')
                          : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')),
                      onClick: function() { setAnatomyPitchHigh(false); }
                    }, 'Low Pitch (slow vibration)'),
                    h('button', {
                      className: 'px-3 py-1 rounded text-xs font-semibold transition-colors ' +
                        (anatomyPitchHigh
                          ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white')
                          : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')),
                      onClick: function() { setAnatomyPitchHigh(true); }
                    }, 'High Pitch (fast vibration)')
                  ),

                  // Vowel sub-controls: vowel selector
                  anatomyAnim === 'vowel' && h('div', { className: 'flex items-center gap-2 mt-2 pl-1 flex-wrap' },
                    h('span', { className: subTextClass }, 'Vowel:'),
                    VOWEL_SHAPES.map(function(v, vi) {
                      var isActive = anatomyVowelIdx === vi;
                      return h('button', {
                        key: v.id,
                        className: 'px-3 py-1 rounded text-xs font-semibold transition-colors ' +
                          (isActive
                            ? (isDark ? 'bg-emerald-700 text-white' : 'bg-emerald-700 text-white')
                            : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')),
                        onClick: function() { setAnatomyVowelIdx(vi); }
                      }, v.label);
                    })
                  )
                ),

                // Region selector buttons
                h('div', { className: 'space-y-2' },
                  h('div', { className: headingClass + ' text-xs mb-1' }, 'Explore a Region'),
                  h('div', { className: 'flex flex-wrap gap-2' },
                    ANATOMY_REGIONS.map(function(region) {
                      var isActive = anatomyRegion === region.id;
                      return h('button', {
                        key: region.id,
                        className: 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ' +
                          (isActive
                            ? 'text-white shadow-md'
                            : (isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900')),
                        style: isActive
                          ? { backgroundColor: region.color, borderColor: region.color }
                          : { borderColor: region.color + '60', backgroundColor: 'transparent' },
                        onClick: function() {
                          setAnatomyRegion(isActive ? null : region.id);
                        }
                      }, region.label);
                    })
                  )
                ),

                // Region explanation panel
                anatomyRegion && (function() {
                  var region = ANATOMY_REGIONS.find(function(r) { return r.id === anatomyRegion; });
                  if (!region) return null;
                  return h('div', {
                    className: 'p-4 rounded-lg border-l-4 ' +
                      (isDark ? 'bg-slate-700/50' : 'bg-slate-50'),
                    style: { borderLeftColor: region.color },
                    role: 'region',
                    'aria-label': region.label + ' information'
                  },
                    h('h4', {
                      className: headingClass + ' text-sm mb-2',
                      style: { color: region.color }
                    }, region.label),
                    h('div', { className: 'space-y-2 text-xs ' + (isDark ? 'text-slate-300' : 'text-slate-700') },
                      h('div', null,
                        h('span', { className: 'font-bold' }, 'What is it? '),
                        region.what),
                      h('div', null,
                        h('span', { className: 'font-bold' }, 'Role in singing: '),
                        region.singing),
                      h('div', {
                        className: 'p-2 rounded ' + (isDark ? 'bg-amber-900/30' : 'bg-amber-50')
                      },
                        h('span', { className: 'font-bold' }, '\u2728 Fun fact: '),
                        region.funFact),
                      h('div', {
                        className: 'p-2 rounded ' + (isDark ? 'bg-green-900/30' : 'bg-green-50')
                      },
                        h('span', { className: 'font-bold' }, '\uD83C\uDFAF Try this: '),
                        region.tryThis),
                      region.injuries && h('div', {
                        className: 'p-2 rounded mt-1 ' + (isDark ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-50 border border-red-200')
                      },
                        h('span', { className: 'font-bold ' + (isDark ? 'text-red-300' : 'text-red-700') }, '\u26A0\uFE0F Common injuries: '),
                        region.injuries),
                      region.prevention && h('div', {
                        className: 'p-2 rounded mt-1 ' + (isDark ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-200')
                      },
                        h('span', { className: 'font-bold ' + (isDark ? 'text-blue-300' : 'text-blue-700') }, '\uD83D\uDEE1\uFE0F Prevention: '),
                        region.prevention)
                    )
                  );
                })()
              )
            ),

            // Vocal Injuries & Prevention
            h('div', { className: cardClass },
              h('button', {
                className: 'w-full flex items-center justify-between text-left ' + headingClass + ' text-sm',
                'aria-expanded': d.injuriesOpen || false,
                onClick: function() { upd('injuriesOpen', !(d.injuriesOpen || false)); }
              },
                h('span', { className: 'flex items-center gap-2' }, '\uD83C\uDFE5', 'Vocal Injuries & Prevention'),
                h('span', { className: 'text-lg' }, (d.injuriesOpen ? '\u25B2' : '\u25BC'))),
              (d.injuriesOpen || false) && h('div', { className: 'mt-4 space-y-4' },
                // Prevention tips grid
                h('div', null,
                  h('h4', { className: headingClass + ' text-xs mb-2 flex items-center gap-2' },
                    '\uD83D\uDEE1\uFE0F', 'Top Prevention Tips'),
                  h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                    PREVENTION_TIPS.map(function(tip) {
                      var priorityColor = tip.priority === 'critical'
                        ? (isDark ? 'border-red-500 bg-red-900/20' : 'border-red-300 bg-red-50')
                        : tip.priority === 'essential'
                          ? (isDark ? 'border-amber-500 bg-amber-900/20' : 'border-amber-300 bg-amber-50')
                          : (isDark ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50');
                      return h('div', {
                        key: tip.title,
                        className: 'p-3 rounded-lg border ' + priorityColor
                      },
                        h('div', { className: 'flex items-center gap-2 mb-1' },
                          h('span', { className: 'text-lg' }, tip.icon),
                          h('span', { className: 'font-bold text-xs ' + (isDark ? 'text-white' : 'text-slate-800') }, tip.title),
                          tip.priority === 'critical' && h('span', {
                            className: 'text-[11px] font-bold uppercase px-1.5 py-0.5 rounded ' +
                              (isDark ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700')
                          }, 'Critical')),
                        h('p', { className: 'text-[11px] leading-relaxed ' + (isDark ? 'text-slate-300' : 'text-slate-600') }, tip.tip));
                    }))),
                // Common injuries reference
                h('div', { className: 'mt-3' },
                  h('h4', { className: headingClass + ' text-xs mb-2 flex items-center gap-2' },
                    '\u26A0\uFE0F', 'Common Vocal Injuries'),
                  h('p', { className: subTextClass + ' text-[11px] mb-2 italic' },
                    'Understanding these conditions helps you recognize warning signs early. If you experience persistent symptoms, see a doctor.'),
                  h('div', { className: 'space-y-2' },
                    VOCAL_INJURIES.map(function(injury) {
                      var isExpanded = d.expandedInjury === injury.name;
                      var sevColor = injury.severity === 'serious'
                        ? (isDark ? 'text-red-400' : 'text-red-600')
                        : injury.severity === 'moderate'
                          ? (isDark ? 'text-amber-400' : 'text-amber-600')
                          : (isDark ? 'text-blue-400' : 'text-blue-600');
                      return h('div', {
                        key: injury.name,
                        className: 'rounded-lg border ' + (isDark ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-white')
                      },
                        h('button', {
                          className: 'w-full p-3 flex items-center justify-between text-left',
                          'aria-expanded': isExpanded,
                          onClick: function() { upd('expandedInjury', isExpanded ? null : injury.name); }
                        },
                          h('span', { className: 'flex items-center gap-2' },
                            h('span', { className: 'text-lg' }, injury.emoji),
                            h('span', { className: 'font-bold text-xs ' + (isDark ? 'text-white' : 'text-slate-800') }, injury.name),
                            h('span', {
                              className: 'text-[11px] font-bold uppercase px-1.5 py-0.5 rounded ml-1 ' +
                                (injury.severity === 'serious' ? (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700')
                                  : injury.severity === 'moderate' ? (isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700')
                                    : (isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'))
                            }, injury.severity)),
                          h('span', { className: 'text-xs' }, isExpanded ? '\u25B2' : '\u25BC')),
                        isExpanded && h('div', {
                          className: 'px-3 pb-3 space-y-2 text-[11px] leading-relaxed ' + (isDark ? 'text-slate-300' : 'text-slate-600')
                        },
                          h('div', null, h('span', { className: 'font-bold' }, 'What is it? '), injury.what),
                          h('div', null, h('span', { className: 'font-bold' }, 'Causes: '), injury.causes),
                          h('div', null, h('span', { className: 'font-bold' }, 'Symptoms: '), injury.symptoms),
                          h('div', null, h('span', { className: 'font-bold' }, 'Who gets it? '), injury.whoGetsIt),
                          h('div', {
                            className: 'p-2 rounded ' + (isDark ? 'bg-green-900/30 border border-green-800/50' : 'bg-green-50 border border-green-200')
                          },
                            h('span', { className: 'font-bold ' + (isDark ? 'text-green-300' : 'text-green-700') }, '\uD83D\uDC8A Treatment: '),
                            injury.treatment)));
                    })),
                  h('div', {
                    className: 'mt-3 p-3 rounded-lg text-center text-xs italic ' +
                      (isDark ? 'bg-violet-900/30 text-violet-300 border border-violet-700' : 'bg-violet-50 text-violet-700 border border-violet-200')
                  },
                    '\uD83D\uDC68\u200D\u2695\uFE0F This information is educational only. It is not medical advice. If you have concerns about your voice, see an otolaryngologist (ENT doctor) or speech-language pathologist.'))
              )
            ),

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
                    'aria-label': 'Cancel warm-up exercise',
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
                      ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-700 text-white')
                      : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
                  onClick: function() { setSrSource('generate'); }
                }, 'Random'),
                h('button', {
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                    (srSource === 'melody'
                      ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-700 text-white')
                      : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')),
                  onClick: function() { setSrSource('melody'); }
                }, 'Melodies'),
                callGemini && h('button', {
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                    (srSource === 'ai'
                      ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-700 text-white')
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
                          ? (isDark ? 'bg-rose-600 text-white' : 'bg-rose-700 text-white')
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
              h('canvas', { 'aria-label': 'Singing visualization',
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
                    type: 'range', 'aria-label': 'Singing slider',
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
                      : (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-400')),
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
                    : (isDark ? 'text-slate-200 hover:text-slate-200' : 'text-slate-600 hover:text-slate-700')),
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

          // ── Topic-accent hero band (per tab) ──
          (function() {
            var TAB_META = {
              pitch:     { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '🎯', title: 'Pitch Detective',           hint: 'Sing into the mic; the lab tracks frequency in real time. Trained singers hold pitch within ±5 cents (1/20th of a semitone) — that is what perfect-pitch matching looks like.' },
              range:     { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '🎹', title: 'Vocal Range — your tessitura', hint: 'Most untrained voices span 1.5–2 octaves; trained classical singers reach 3+. Range expansion is mostly about REGISTER blending, not just stretching higher and lower.' },
              vibrato:   { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '🌊', title: 'Vibrato Lab',                hint: 'Healthy vibrato: 5–7 Hz oscillation, ~60–100 cents wide. Slower = wobble; faster = tremor. Vibrato is a function of relaxed breath support, not a separate technique.' },
              intervals: { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '🎵', title: 'Interval Singer — ear training', hint: 'Major 3rd vs minor 3rd is the single most-confused interval pair for beginners. Mnemonics: M3 = "Oh when the saints," m3 = "Greensleeves." Builds relative pitch.' },
              warmups:   { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '❤️', title: 'Warm-ups',                  hint: 'Lip trills + sirens before any sustained singing. 5–10 minutes of low-intensity warm-up halves the risk of vocal-fold strain. Skipping warm-ups is the #1 cause of preventable vocal injury.' },
              sightread: { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '🎼', title: 'Sight reading',              hint: 'Solfège (do-re-mi) > letter names for sight-singing because the syllables encode interval relationships, not just pitch labels. Movable do beats fixed do for tonal music.' }
            };
            var meta = TAB_META[activeTab] || TAB_META.pitch;
            return h('div', {
              className: 'mt-2',
              style: {
                padding: '12px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                border: '1px solid ' + meta.accent + '55',
                borderLeft: '4px solid ' + meta.accent,
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }
            },
              h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                h('p', { style: { margin: '3px 0 0', color: isDark ? '#cbd5e1' : '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
              )
            );
          })(),

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
