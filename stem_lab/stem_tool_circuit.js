// ═══════════════════════════════════════════
// stem_tool_circuit.js - Circuit Builder Plugin (Enhanced v2)
// Interactive series & parallel circuit builder with Ohm's Law,
// 7 component types (resistor, bulb, switch, LED, ammeter, voltmeter, capacitor),
// electron animation, 10 challenges, quiz, presets, badges, AI tutor,
// Kirchhoff's Laws panel, grade-band content, sound effects & snapshots.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) - shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-circuit')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-circuit';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };
  var gradeText = function(k2, g35, g68, g912) {
    return function(band) {
      if (band === 'k2') return k2;
      if (band === 'g35') return g35;
      if (band === 'g68') return g68;
      return g912;
    };
  };

  // ── Circuit Builder CSS animations ──
  if (!document.getElementById('circuit-css-anims')) {
    var circStyle = document.createElement('style');
    circStyle.id = 'circuit-css-anims';
    circStyle.textContent = [
      '@keyframes circuitPulse { 0%, 100% { box-shadow: 0 0 4px rgba(59,130,246,0.15); } 50% { box-shadow: 0 0 12px rgba(59,130,246,0.3); } }',
      '@keyframes circuitZap { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }',
      '@keyframes circuitSlideIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }',
      '@keyframes circuitShortSpark { 0% { opacity: 0; } 20% { opacity: 1; background: rgba(239,68,68,0.15); } 100% { opacity: 0; } }',
      '@keyframes electronGlow { 0%, 100% { filter: drop-shadow(0 0 2px rgba(59,130,246,0.4)); } 50% { filter: drop-shadow(0 0 6px rgba(59,130,246,0.8)); } }',
      '@keyframes circuitBadgePop { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }',
      '@keyframes neonPulse { 0%, 100% { border-color: rgba(234, 179, 8, 0.4); box-shadow: 0 0 8px rgba(234, 179, 8, 0.2); } 50% { border-color: rgba(234, 179, 8, 0.8); box-shadow: 0 0 16px rgba(234, 179, 8, 0.4); } }',
      '@keyframes shortRedFlash { 0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); } 50% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 16px rgba(239, 68, 68, 0.5); } }',
      // Drift-vs-field paradox: the signal RACES (fast sweep), electrons CRAWL (slow drift).
      '@keyframes circSignalRace { 0% { transform: translateX(-14px); opacity: 0; } 8% { opacity: 1; } 78% { opacity: 1; } 100% { transform: translateX(360px); opacity: 0; } }',
      '@keyframes circElectronDrift { 0% { transform: translateX(0); } 100% { transform: translateX(52px); } }',
      '.circ-signal-pulse { animation: circSignalRace 0.9s linear infinite; }',
      '.circ-electron-drift { animation: circElectronDrift 6s linear infinite; }',
      '.circuit-card { animation: circuitSlideIn 0.3s ease-out; }',
      '.circuit-badge { animation: circuitBadgePop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }',
      '.circuit-active { animation: circuitPulse 2s ease-in-out infinite; }',
      '.circuit-short { animation: circuitShortSpark 0.8s ease-out; }',
      '*:focus-visible { outline: 2px solid #eab308 !important; outline-offset: 2px !important; box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.4) !important; }',
      '.glass-panel { background: var(--allo-stem-deeper, rgba(15, 23, 42, 0.6)) !important; backdrop-filter: blur(12px) !important; border: 1px solid var(--allo-stem-border, rgba(255, 255, 255, 0.08)) !important; }',
      '.short-active-flash { animation: shortRedFlash 1s ease-in-out infinite !important; }',
      '.glow-button { transition: all 0.2s ease; }',
      '.glow-button:hover { transform: translateY(-1px); box-shadow: 0 0 10px currentColor; }'
    ].join('\n');
    document.head.appendChild(circStyle);
  }

  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* audio not available */ }
    }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch (e) { /* audio not available */ }
  }
  function circuitSound(type) {
    switch (type) {
      case 'addComp':
        playTone(440, 0.08, 'sine', 0.1);
        setTimeout(function() { playTone(554, 0.12, 'sine', 0.12); }, 70);
        break;
      case 'removeComp':
        playTone(440, 0.12, 'triangle', 0.08);
        setTimeout(function() { playTone(330, 0.15, 'triangle', 0.06); }, 80);
        break;
      case 'switchToggle':
        playTone(1200, 0.03, 'square', 0.06);
        setTimeout(function() { playTone(800, 0.04, 'square', 0.05); }, 30);
        break;
      case 'shortCircuit':
        // Intense spark + crackle
        playTone(150, 0.3, 'sawtooth', 0.1);
        playTone(160, 0.3, 'sawtooth', 0.08);
        // Spark noise
        (function() {
          var ac = getAudioCtx(); if (!ac) return;
          try {
            var bufSize = Math.floor(ac.sampleRate * 0.15);
            var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.2));
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 3000; filt.Q.value = 1.5;
            var g = ac.createGain(); g.gain.setValueAtTime(0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
            src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start();
          } catch(e) {}
        })();
        break;
      case 'challengeComplete':
        playTone(523, 0.1, 'sine', 0.1);
        setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100);
        setTimeout(function() { playTone(784, 0.1, 'sine', 0.12); }, 200);
        setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 300);
        break;
      case 'correct':
        playTone(523, 0.1, 'sine', 0.12);
        setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
        setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
        break;
      case 'wrong':
        playTone(220, 0.25, 'sawtooth', 0.08);
        break;
      case 'badge':
        playTone(523, 0.08, 'sine', 0.1);
        setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
        setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
        setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
        break;
      case 'electricHum':
        // 60Hz mains hum - brief pulse
        playTone(60, 0.3, 'sine', 0.04);
        playTone(120, 0.25, 'sine', 0.02); // 2nd harmonic
        break;
      case 'capacitorCharge':
        // Rising pitch - charging sound
        (function() {
          var ac = getAudioCtx(); if (!ac) return;
          try {
            var osc = ac.createOscillator(); var g = ac.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(200, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2000, ac.currentTime + 0.4);
            g.gain.setValueAtTime(0.06, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
            osc.connect(g); g.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.4);
          } catch(e) {}
        })();
        break;
      case 'resistorHiss':
        // Gentle thermal noise
        (function() {
          var ac = getAudioCtx(); if (!ac) return;
          try {
            var bufSize = Math.floor(ac.sampleRate * 0.06);
            var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1500; filt.Q.value = 3;
            var g = ac.createGain(); g.gain.setValueAtTime(0.025, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
            src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start();
          } catch(e) {}
        })();
        break;
      default:
        playTone(440, 0.08, 'sine', 0.06);
    }
  }

  // ── Badge definitions (10) ──
  var BADGES = [
    { id: 'firstCircuit', icon: '\uD83D\uDD0C', name: 'First Circuit', desc: 'Build your first circuit', check: function(u) { return u.compAdded >= 1; } },
    { id: 'seriesMaster', icon: '\u2192', name: 'Series Master', desc: 'Build a 3+ component series circuit', check: function(u) { return u.seriesBuilt; } },
    { id: 'parallelPro', icon: '\u2261', name: 'Parallel Pro', desc: 'Build a 3+ component parallel circuit', check: function(u) { return u.parallelBuilt; } },
    { id: 'switchWizard', icon: '\uD83D\uDD18', name: 'Switch Wizard', desc: 'Toggle a switch 5 times', check: function(u) { return u.switchToggles >= 5; } },
    { id: 'allComponents', icon: '\uD83E\uDDE9', name: 'Component Collector', desc: 'Use all 7 component types', check: function(u) { return Object.keys(u.typesUsed || {}).length >= 7; } },
    { id: 'challengeChamp', icon: '\uD83C\uDFC6', name: 'Challenge Champ', desc: 'Complete 5 circuit challenges', check: function(u) { return u.challengesDone >= 5; } },
    { id: 'quizAce', icon: '\u26A1', name: 'Ohm Ace', desc: 'Score 5+ on Ohm\'s Law quiz', check: function(u) { return u.quizScore >= 5; } },
    { id: 'quizStreak', icon: '\uD83D\uDD25', name: 'Hot Streak', desc: 'Get 3 quiz answers in a row', check: function(u) { return u.quizStreak >= 3; } },
    { id: 'shortCircuitSurvivor', icon: '\u26A0\uFE0F', name: 'Short Survivor', desc: 'Trigger a short circuit', check: function(u) { return u.shortTriggered; } },
    { id: 'presetExplorer', icon: '\uD83D\uDCCB', name: 'Preset Explorer', desc: 'Load 3 different preset circuits', check: function(u) { return u.presetsLoaded >= 3; } }
  ];

  // ── Circuit presets (5) ──
  var CIRCUIT_PRESETS = [
    { id: 'led_basic', label: '\uD83D\uDD34 LED Circuit', desc: 'Basic LED with current-limiting resistor',
      mode: 'series', voltage: 9, components: [
        { type: 'resistor', value: 330, id: 1 },
        { type: 'led', value: 40, id: 2, ledColor: '#ef4444' },
        { type: 'switch', value: 0, id: 3, closed: true }
      ]
    },
    { id: 'voltage_divider', label: '\u2696 Voltage Divider', desc: 'Two resistors sharing voltage',
      mode: 'series', voltage: 12, components: [
        { type: 'resistor', value: 200, id: 1 },
        { type: 'resistor', value: 100, id: 2 },
        { type: 'voltmeter', value: 0, id: 3 }
      ]
    },
    { id: 'parallel_bulbs', label: '\uD83D\uDCA1 Parallel Bulbs', desc: 'Three bulbs in parallel - remove one, others stay lit',
      mode: 'parallel', voltage: 12, components: [
        { type: 'bulb', value: 100, id: 1 },
        { type: 'bulb', value: 100, id: 2 },
        { type: 'bulb', value: 100, id: 3 }
      ]
    },
    { id: 'ammeter_test', label: '\u26A1 Current Measurement', desc: 'Series ammeter reads total current',
      mode: 'series', voltage: 9, components: [
        { type: 'resistor', value: 100, id: 1 },
        { type: 'ammeter', value: 0, id: 2 },
        { type: 'resistor', value: 200, id: 3 }
      ]
    },
    { id: 'christmas_lights', label: '\uD83C\uDF84 Christmas Lights', desc: 'Series LEDs - if one fails, all go dark!',
      mode: 'series', voltage: 12, components: [
        { type: 'led', value: 40, id: 1, ledColor: '#ef4444' },
        { type: 'led', value: 40, id: 2, ledColor: '#22c55e' },
        { type: 'led', value: 40, id: 3, ledColor: '#3b82f6' },
        { type: 'switch', value: 0, id: 4, closed: true }
      ]
    }
  ];

  // ── Challenge definitions (10) ──
  var CHALLENGES = [
    { label: 'Get 2A current', target: 2, type: 'current', unit: 'A' },
    { label: 'Get 0.5A current', target: 0.5, type: 'current', unit: 'A' },
    { label: 'Total R = 200\u03A9', target: 200, type: 'resistance', unit: '\u03A9' },
    { label: 'Power = 24W', target: 24, type: 'power', unit: 'W' },
    { label: 'Total R = 50\u03A9', target: 50, type: 'resistance', unit: '\u03A9' },
    { label: 'Get exactly 0.1A', target: 0.1, type: 'current', unit: 'A' },
    { label: 'Power = 1W', target: 1, type: 'power', unit: 'W' },
    { label: 'Total R = 500\u03A9', target: 500, type: 'resistance', unit: '\u03A9' },
    { label: 'Get 3A current', target: 3, type: 'current', unit: 'A' },
    { label: 'Power = 100W', target: 100, type: 'power', unit: 'W' }
  ];

  // ── Quiz question generators (8 types) ──
  function makeOhmQuestion() {
    var qTypes = [
      // Type 1: Find current (I = V/R)
      function() {
        var V = [3, 5, 6, 9, 12, 24][Math.floor(Math.random() * 6)];
        var R = [10, 20, 50, 100, 200, 500][Math.floor(Math.random() * 6)];
        var I = V / R;
        return { q: 'A ' + V + 'V battery drives current through a ' + R + '\u03A9 resistor. What is the current?', a: parseFloat(I.toFixed(3)), unit: 'A', formula: 'I = V/R = ' + V + '/' + R + ' = ' + I.toFixed(3) + 'A' };
      },
      // Type 2: Find voltage (V = IR)
      function() {
        var I = [0.1, 0.2, 0.5, 1, 2, 3][Math.floor(Math.random() * 6)];
        var R = [10, 20, 50, 100, 200][Math.floor(Math.random() * 5)];
        var V = I * R;
        return { q: 'A current of ' + I + 'A flows through a ' + R + '\u03A9 resistor. What voltage is required?', a: parseFloat(V.toFixed(1)), unit: 'V', formula: 'V = IR = ' + I + '\u00D7' + R + ' = ' + V.toFixed(1) + 'V' };
      },
      // Type 3: Find resistance (R = V/I)
      function() {
        var V = [6, 9, 12, 24][Math.floor(Math.random() * 4)];
        var I = [0.1, 0.2, 0.5, 1, 2][Math.floor(Math.random() * 5)];
        var R = V / I;
        return { q: 'A ' + V + 'V source pushes ' + I + 'A of current. What is the resistance?', a: parseFloat(R.toFixed(1)), unit: '\u03A9', formula: 'R = V/I = ' + V + '/' + I + ' = ' + R.toFixed(1) + '\u03A9' };
      },
      // Type 4: Find power (P = IV)
      function() {
        var V = [6, 9, 12][Math.floor(Math.random() * 3)];
        var I = [0.5, 1, 2, 3][Math.floor(Math.random() * 4)];
        var P = V * I;
        return { q: 'A ' + V + 'V circuit draws ' + I + 'A. What is the power consumed?', a: parseFloat(P.toFixed(1)), unit: 'W', formula: 'P = IV = ' + I + '\u00D7' + V + ' = ' + P.toFixed(1) + 'W' };
      },
      // Type 5: Series total resistance
      function() {
        var Ra = [50, 100, 200][Math.floor(Math.random() * 3)];
        var Rb = [50, 100, 200][Math.floor(Math.random() * 3)];
        var Rtot = Ra + Rb;
        return { q: 'Two resistors (' + Ra + '\u03A9 and ' + Rb + '\u03A9) are in series. What is the total resistance?', a: parseFloat(Rtot.toFixed(1)), unit: '\u03A9', formula: 'R_total = R1 + R2 = ' + Ra + ' + ' + Rb + ' = ' + Rtot + '\u03A9' };
      },
      // Type 6: Parallel total resistance
      function() {
        var Ra = [100, 200, 300][Math.floor(Math.random() * 3)];
        var Rb = [100, 200, 300][Math.floor(Math.random() * 3)];
        var Rpar = (Ra * Rb) / (Ra + Rb);
        return { q: 'Two resistors (' + Ra + '\u03A9 and ' + Rb + '\u03A9) are in parallel. What is the total resistance?', a: parseFloat(Rpar.toFixed(1)), unit: '\u03A9', formula: 'R = (R1\u00D7R2)/(R1+R2) = (' + Ra + '\u00D7' + Rb + ')/(' + Ra + '+' + Rb + ') = ' + Rpar.toFixed(1) + '\u03A9' };
      },
      // Type 7: Power from R (P = V^2/R)
      function() {
        var V = [6, 9, 12][Math.floor(Math.random() * 3)];
        var R = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
        var P = (V * V) / R;
        return { q: 'A ' + V + 'V source is connected to a ' + R + '\u03A9 resistor. What power is dissipated?', a: parseFloat(P.toFixed(1)), unit: 'W', formula: 'P = V\u00B2/R = ' + V + '\u00B2/' + R + ' = ' + P.toFixed(1) + 'W' };
      },
      // Type 8: Find current from power (I = P/V)
      function() {
        var V = [6, 9, 12, 24][Math.floor(Math.random() * 4)];
        var P = [6, 12, 24, 36, 48][Math.floor(Math.random() * 5)];
        var I = P / V;
        return { q: 'A ' + P + 'W device runs on ' + V + 'V. How much current does it draw?', a: parseFloat(I.toFixed(3)), unit: 'A', formula: 'I = P/V = ' + P + '/' + V + ' = ' + I.toFixed(3) + 'A' };
      }
    ];

    var gen = qTypes[Math.floor(Math.random() * qTypes.length)]();
    var decimals = gen.unit === 'A' ? 3 : 1;
    var wrong1 = parseFloat((gen.a * (1.5 + Math.random())).toFixed(decimals));
    var wrong2 = parseFloat((gen.a * (0.2 + Math.random() * 0.5)).toFixed(decimals));
    var wrong3 = parseFloat((gen.a + (Math.random() > 0.5 ? 1 : -1) * (gen.a * 0.3 + 5)).toFixed(decimals));
    if (wrong2 <= 0) wrong2 = parseFloat((gen.a * 2.5).toFixed(decimals));
    // Distractors must be positive and distinct from the correct answer AND each other, else a negative
    // option could appear (~21% of questions) or a distractor within tolerance would score as correct
    // (inflating XP). Repair any bad option with deterministic fallback multipliers.
    var _qTol = 0.01;
    var _qFallback = [2.5, 0.4, 1.7, 3.3, 0.6, 1.25];
    var _qSeen = {}; _qSeen[gen.a.toFixed(decimals)] = true;
    var _fixOpt = function (w) {
      var fi = 0;
      while ((!(w > 0) || Math.abs(w - gen.a) < _qTol || _qSeen[w.toFixed(decimals)]) && fi < _qFallback.length) {
        w = parseFloat((gen.a * _qFallback[fi]).toFixed(decimals)); fi++;
      }
      _qSeen[w.toFixed(decimals)] = true;
      return w;
    };
    wrong1 = _fixOpt(wrong1); wrong2 = _fixOpt(wrong2); wrong3 = _fixOpt(wrong3);
    var opts = [gen.a, wrong1, wrong2, wrong3].sort(function() { return Math.random() - 0.5; });
    return { text: gen.q, answer: gen.a, unit: gen.unit, formula: gen.formula, opts: opts, answered: false };
  }

  // ══════════════════════════════════════════════════
  // Register the Circuit Builder tool
  // ══════════════════════════════════════════════════
  // --- Helper functions for Branching Electron Paths ---
  function getSeriesPath(components, spacing) {
    var path = [{ x: 35, y: 20 }];
    if (components.length === 0) {
      path.push({ x: 400, y: 20 });
      path.push({ x: 400, y: 140 });
      path.push({ x: 35, y: 140 });
      return path;
    }
    for (var i = 0; i < components.length; i++) {
      var cx = 80 + i * spacing;
      var comp = components[i];
      var compTopY = 55;
      var compBottomY = comp.type === 'resistor' ? 100 : (comp.type === 'switch' ? 95 : (comp.type === 'ammeter' || comp.type === 'voltmeter' ? 90 : (comp.type === 'capacitor' ? 100 : 92)));
      
      if (i % 2 === 0) {
        path.push({ x: cx, y: 20 });
        path.push({ x: cx, y: compTopY });
        path.push({ x: cx, y: compBottomY });
        path.push({ x: cx, y: 140 });
      } else {
        path.push({ x: cx, y: 140 });
        path.push({ x: cx, y: compBottomY });
        path.push({ x: cx, y: compTopY });
        path.push({ x: cx, y: 20 });
      }
    }
    var lastCx = 80 + (components.length - 1) * spacing;
    if ((components.length - 1) % 2 === 0) {
      path.push({ x: 35, y: 140 });
    } else {
      path.push({ x: 400, y: 20 });
      path.push({ x: 400, y: 140 });
      path.push({ x: 35, y: 140 });
    }
    return path;
  }

  function getParallelPath(cy) {
    return [
      { x: 35, y: 20 },
      { x: 180, y: 20 },
      { x: 180, y: cy },
      { x: 200, y: cy },
      { x: 240, y: cy },
      { x: 260, y: cy },
      { x: 260, y: 140 },
      { x: 35, y: 140 }
    ];
  }

  function getPositionAlongPath(path, fraction) {
    if (path.length === 0) return { x: 0, y: 0 };
    if (path.length === 1) return path[0];
    var segs = [];
    var totalLen = 0;
    for (var i = 0; i < path.length - 1; i++) {
      var dx = path[i+1].x - path[i].x;
      var dy = path[i+1].y - path[i].y;
      var len = Math.sqrt(dx*dx + dy*dy);
      segs.push(len);
      totalLen += len;
    }
    var targetDist = fraction * totalLen;
    var accumDist = 0;
    for (var i = 0; i < segs.length; i++) {
      if (accumDist + segs[i] >= targetDist) {
        var segFrac = segs[i] > 0 ? (targetDist - accumDist) / segs[i] : 0;
        var p1 = path[i];
        var p2 = path[i+1];
        return {
          x: p1.x + (p2.x - p1.x) * segFrac,
          y: p1.y + (p2.y - p1.y) * segFrac
        };
      }
      accumDist += segs[i];
    }
    return path[path.length - 1];
  }

  window.StemLab.registerTool('circuit', {
    icon: '\uD83D\uDD0C',
    label: 'Circuit Builder',
    desc: 'Build series & parallel circuits with Ohm\'s Law',
    color: 'yellow',
    category: 'science',
    questHooks: [
      { id: 'build_3_components', label: 'Build a circuit with 3+ components', icon: '\uD83D\uDD0C', check: function(d) { return (d.components || []).length >= 3; }, progress: function(d) { return (d.components || []).length + '/3 components'; } },
      { id: 'build_5_components', label: 'Build a circuit with 5+ components', icon: '\u26A1', check: function(d) { return (d.components || []).length >= 5; }, progress: function(d) { return (d.components || []).length + '/5 components'; } },
      { id: 'ohm_score_3', label: 'Score 3+ on Ohm\'s Law quiz', icon: '\uD83E\uDDE0', check: function(d) { return (d.ohmScore || 0) >= 3; }, progress: function(d) { return (d.ohmScore || 0) + '/3'; } },
      { id: 'complete_challenge', label: 'Complete a circuit challenge', icon: '\uD83C\uDFAF', check: function(d) { return (d.challengesDone || 0) >= 1; }, progress: function(d) { return (d.challengesDone || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 circuit challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d.challengesDone || 0) >= 3; }, progress: function(d) { return (d.challengesDone || 0) + '/3'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;

      if (!this._CircuitComponent) {
        this._CircuitComponent = function CircuitLab(props) {
          var ctx = props.ctx;
          var React = ctx.React;
          var h = React.createElement;
          var ArrowLeft = ctx.icons.ArrowLeft;
          var addToast = ctx.addToast;
          var awardXP = ctx.awardXP;
          var announceToSR = ctx.announceToSR;
          var a11yClick = ctx.a11yClick;
          var callGemini = ctx.callGemini;
          var callTTS = ctx.callTTS;
          var setToolSnapshots = ctx.setToolSnapshots;
          var setStemLabTool = ctx.setStemLabTool;
          var setStemLabTab = ctx.setStemLabTab;

          var band = getGradeBand(ctx);

          // ── State via labToolData ──
          var ld = ctx.toolData || {};
          var d = ld._circuit || {};
          var upd = function(key, val) {
            if (typeof ctx.setToolData === 'function') {
              ctx.setToolData(function(prev) {
                var circ = Object.assign({}, (prev && prev._circuit) || {});
                circ[key] = val;
                return Object.assign({}, prev, { _circuit: circ });
              });
            }
          };
          var updMulti = function(obj) {
            if (typeof ctx.setToolData === 'function') {
              ctx.setToolData(function(prev) {
                var circ = Object.assign({}, (prev && prev._circuit) || {}, obj);
                return Object.assign({}, prev, { _circuit: circ });
              });
            }
          };

          // ── State defaults ──
          var mode = d.mode || 'series';
          var components = d.components || [];
          var voltage = d.voltage != null ? d.voltage : 9;
          var tick = d.tick || 0;
          var showBadges = d.showBadges || false;
          var showAI = d.showAI || false;
          var showKirchhoff = d.showKirchhoff || false;
          var showPresets = d.showPresets != null ? d.showPresets : true;
          var badges = d.badges || {};
          var aiQuestion = d.aiQuestion || '';
          var aiResponse = d._aiResponse || '';
          var aiLoading = d._aiLoading || false;

          // Badge tracking state
          var compAdded = d.compAdded || 0;
          var switchToggles = d.switchToggles || 0;
          var typesUsed = d.typesUsed || {};
          var challengesDone = d.challengesDone || 0;
          var ohmScore = d.ohmScore || 0;
          var ohmStreak = d.ohmStreak || 0;
          var shortTriggered = d.shortTriggered || false;
          var _prefersReducedMotion = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
          var presetsLoaded = d.presetsLoaded || 0;
          var presetsLoadedSet = d.presetsLoadedSet || {};
          var challengesDoneSet = d.challengesDoneSet || {};

          // Ohm quiz state
          var ohmQuiz = d.ohmQuiz || null;

          // ── Badge checker ──
          var checkBadges = function(updates) {
            var newBadges = Object.assign({}, badges);
            var awarded = false;
            BADGES.forEach(function(b) {
              if (!newBadges[b.id] && b.check(updates)) {
                newBadges[b.id] = true;
                awarded = true;
                circuitSound('badge');
                if (typeof addToast === 'function') addToast(b.icon + ' Badge: ' + b.name + ' - ' + b.desc, 'success');
                if (typeof awardXP === 'function') awardXP('circuitBadge', 15, b.name);
              }
            });
            if (awarded) upd('badges', newBadges);
          };

          var getBadgeUpdates = function(extra) {
            var base = {
              compAdded: compAdded,
              seriesBuilt: mode === 'series' && components.length >= 3,
              parallelBuilt: mode === 'parallel' && components.length >= 3,
              switchToggles: switchToggles,
              typesUsed: typesUsed,
              challengesDone: challengesDone,
              quizScore: ohmScore,
              quizStreak: ohmStreak,
              shortTriggered: shortTriggered,
              presetsLoaded: presetsLoaded
            };
            if (extra) {
              var keys = Object.keys(extra);
              for (var i = 0; i < keys.length; i++) {
                base[keys[i]] = extra[keys[i]];
              }
            }
            return base;
          };

          // ── Component resistance helper ──
          var getCompR = function(c) {
            if (c.type === 'switch') return c.closed ? 0.001 : 1e9;
            if (c.type === 'ammeter') return 0.001;
            if (c.type === 'voltmeter') return 1e9;
            if (c.type === 'capacitor') return 1e9; // DC steady state: a capacitor blocks DC (acts as an open branch)
            return c.value || 1;
          };

          // ── Toggle switch ──
          var toggleSwitch = function(compId) {
            var newComps = components.map(function(c) {
              if (c.id === compId) return Object.assign({}, c, { closed: !c.closed });
              return c;
            });
            var newToggles = switchToggles + 1;
            updMulti({ components: newComps, switchToggles: newToggles });
            circuitSound('switchToggle');
            checkBadges(getBadgeUpdates({ switchToggles: newToggles }));
          };

          // ── Cycle LED color ──
          var LED_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#f8fafc'];
          var cycleLedColor = function(compId) {
            var newComps = components.map(function(c) {
              if (c.id !== compId) return c;
              var ci = LED_COLORS.indexOf(c.ledColor || '#ef4444');
              return Object.assign({}, c, { ledColor: LED_COLORS[(ci + 1) % LED_COLORS.length] });
            });
            upd('components', newComps);
            if (typeof addToast === 'function') addToast('💡 LED color changed', 'info');
          };

          // ── Circuit calculations ──
          var hasOpenSwitch = mode === 'series' && components.some(function(c) { return c.type === 'switch' && !c.closed; });

          var totalR;
          // Ideal meters are part of the network: an ammeter has nearly zero
          // resistance and belongs in series; a voltmeter has extremely high
          // resistance and belongs in parallel. Wrong placement must change the
          // circuit so learners can observe the open/short consequence.
          var networkComps = components.slice();
          var noLoadPath = networkComps.length === 0;
          if (noLoadPath) {
            totalR = 1e9;
          } else if (mode === 'series') {
            totalR = networkComps.reduce(function(sum, comp) {
              return sum + getCompR(comp);
            }, 0) || 0.001;
          } else {
            var invSum = networkComps.reduce(function(sum, comp) {
              return sum + 1 / getCompR(comp);
            }, 0);
            totalR = invSum > 0 ? 1 / invSum : 1e9;
          }

          var current = noLoadPath ? 0 : voltage / totalR;
          var power = voltage * current;
          var isShort = !noLoadPath && totalR < 1;
          var isOpen = noLoadPath || totalR >= 1e8;
          var hasAmmeter = components.some(function(comp) { return comp.type === 'ammeter'; });
          var hasVoltmeter = components.some(function(comp) { return comp.type === 'voltmeter'; });
          var meterIssue = mode === 'parallel' && hasAmmeter ? 'ammeter-short' :
            mode === 'series' && hasVoltmeter ? 'voltmeter-open' : '';
          var meterStatus = meterIssue === 'ammeter-short' ? __alloT('stem.circuit.meter_status_ammeter_short', 'Unsafe placement: short-circuit path') :
            meterIssue === 'voltmeter-open' ? __alloT('stem.circuit.meter_status_voltmeter_open', 'Incorrect placement: circuit is nearly open') :
            hasAmmeter || hasVoltmeter ? __alloT('stem.circuit.meter_status_correct', 'Measurement placement is correct') : '';
          var meterGuidance = meterIssue === 'ammeter-short'
            ? __alloT('stem.circuit.meter_guidance_ammeter_short', 'An ammeter has nearly zero resistance. Across parallel nodes it bypasses the load and draws extremely high current. Move it into the series path.')
            : meterIssue === 'voltmeter-open'
            ? __alloT('stem.circuit.meter_guidance_voltmeter_open', 'A voltmeter has extremely high resistance. In series it nearly stops current. Connect it across the component whose voltage difference you want.')
            : hasAmmeter
            ? __alloT('stem.circuit.meter_guidance_ammeter_ok', 'The ammeter is in series, so circuit current passes through it.')
            : hasVoltmeter
            ? __alloT('stem.circuit.meter_guidance_voltmeter_ok', 'The voltmeter is in parallel, so it compares electric potential across the branch while drawing negligible current.')
            : '';
          // Check short circuit badge
          if (isShort && !shortTriggered) {
            updMulti({ shortTriggered: true });
            circuitSound('shortCircuit');
            checkBadges(getBadgeUpdates({ shortTriggered: true }));
          }

          // Check series/parallel badges (inline, no useEffect)
          if (mode === 'series' && components.length >= 3) {
            checkBadges(getBadgeUpdates({ seriesBuilt: true }));
          }
          if (mode === 'parallel' && components.length >= 3) {
            checkBadges(getBadgeUpdates({ parallelBuilt: true }));
          }

          // ── Electron animation (managed without useEffect) ──
          var W = 440, H = 200;

          if (current > 0.001 && !isShort && !_prefersReducedMotion) {
            if (window._circuitAnimTimer) clearTimeout(window._circuitAnimTimer);
            window._circuitAnimTimer = setTimeout(function() {
              upd('tick', (tick + 1) % 400);
            }, 60);
          }

          var electronDots = [];
          if (current > 0.001 && !isShort) {
            if (mode === 'series') {
              var spacing = Math.min(70, 280 / Math.max(components.length, 1));
              var path = getSeriesPath(components, spacing);
              var numDots = Math.min(Math.ceil(current * 10), 30);
              var speed = 0.02 * current;
              for (var ei = 0; ei < numDots; ei++) {
                var fraction = ((tick * speed + ei * (1 / numDots)) % 1);
                var pt = getPositionAlongPath(path, fraction);
                electronDots.push(pt);
              }
            } else {
              // Parallel mode: split dots proportional to branch current
              var maxCy = 40 + (components.length - 1) * Math.min(30, 80 / Math.max(components.length, 1));
              for (var ci = 0; ci < components.length; ci++) {
                var comp = components[ci];
                var compR = getCompR(comp);
                var compI = voltage / compR;
                if (compI > 0.001) {
                  var cy = 40 + ci * Math.min(30, 80 / Math.max(components.length, 1));
                  var path = getParallelPath(cy);
                  var numDots = Math.min(Math.ceil(compI * 8), 15);
                  var speed = 0.025 * compI;
                  for (var ei = 0; ei < numDots; ei++) {
                    var fraction = ((tick * speed + ei * (1 / numDots)) % 1);
                    var pt = getPositionAlongPath(path, fraction);
                    electronDots.push(pt);
                  }
                }
              }
            }
          }

          // ── Add component helper ──
          var addComponent = function(type, value, extra) {
            var newComp = Object.assign({ type: type, value: value, id: Date.now() + Math.floor(Math.random() * 1000) }, extra || {});
            var newComps = components.concat([newComp]);
            var newTypesUsed = Object.assign({}, typesUsed);
            newTypesUsed[type] = true;
            var newCount = compAdded + 1;
            updMulti({ components: newComps, typesUsed: newTypesUsed, compAdded: newCount });
            circuitSound('addComp');
            checkBadges(getBadgeUpdates({ compAdded: newCount, typesUsed: newTypesUsed }));
          };

          // ── Remove component ──
          var removeComponent = function(idx) {
            // Confirm only when removing from a substantial circuit (5+ components),
            // so quick early-stage edits stay frictionless.
            if (components.length >= 5) {
              var comp = components[idx];
              var name = comp && comp.type ? comp.type : 'component';
              if (!window.confirm('Remove this ' + name + '? You can undo by adding it back from the toolbox.')) return;
            }
            var newComps = components.filter(function(_, j) { return j !== idx; });
            upd('components', newComps);
            circuitSound('removeComp');
          };

          // ── Clear components ──
          var clearComponents = function() {
            // Always confirm — this wipes the entire circuit with no undo.
            if (components.length === 0) return; // nothing to clear, no need to ask
            if (!window.confirm('Clear all ' + components.length + ' components from the circuit? This cannot be undone.')) return;
            upd('components', []);
            circuitSound('removeComp');
          };

          // ── Load preset ──
          var loadPreset = function(preset) {
            var newSet = Object.assign({}, presetsLoadedSet);
            newSet[preset.id] = true;
            var newCount = Object.keys(newSet).length;
            // Deep copy components
            var presetComps = preset.components.map(function(c) {
              return Object.assign({}, c, { id: Date.now() + Math.floor(Math.random() * 10000) + c.id });
            });
            updMulti({
              mode: preset.mode,
              voltage: preset.voltage,
              components: presetComps,
              presetsLoaded: newCount,
              presetsLoadedSet: newSet
            });
            circuitSound('addComp');
            if (typeof addToast === 'function') addToast('\uD83D\uDCCB Loaded: ' + preset.label, 'info');
            checkBadges(getBadgeUpdates({ presetsLoaded: newCount }));
          };

          // ── AI Tutor ──
          var askAI = function() {
            if (aiLoading) return;
            if (!aiQuestion || !aiQuestion.trim()) return;
            updMulti({ _aiLoading: true, _aiResponse: '' });
            var prompt = 'You are a friendly electronics tutor. ' +
              'The student is building ' + mode + ' circuits in the Circuit Builder. ' +
              'Current circuit: ' + components.length + ' components, ' + voltage + 'V. ' +
              'Their question: "' + aiQuestion + '"\n\n' +
              'Give a clear explanation appropriate for grade level (' + band + '). Use Ohm\'s Law examples. Keep under 150 words.';
            if (typeof callGemini === 'function') {
              callGemini(prompt, false, false, 0.7).then(function(resp) {
                updMulti({ _aiResponse: resp, _aiLoading: false });
              }).catch(function() {
                updMulti({ _aiResponse: 'Sorry, could not connect to the AI tutor.', _aiLoading: false });
              });
            } else {
              updMulti({ _aiResponse: 'AI tutor is not available in this environment.', _aiLoading: false });
            }
          };

          // ── LED glow color helper ──
          var getLedGlowColor = function(ledColor, opacity) {
            var map = {
              '#ef4444': 'rgba(239,68,68,' + opacity + ')',
              '#22c55e': 'rgba(34,197,94,' + opacity + ')',
              '#3b82f6': 'rgba(59,130,246,' + opacity + ')',
              '#eab308': 'rgba(234,179,8,' + opacity + ')',
              '#f8fafc': 'rgba(248,250,252,' + opacity + ')'
            };
            return map[ledColor] || 'rgba(239,68,68,' + opacity + ')';
          };

          // ── Component icon helper ──
          var getCompIcon = function(type) {
            if (type === 'resistor') return '\u2AE8';
            if (type === 'bulb') return '\uD83D\uDCA1';
            if (type === 'switch') return '\uD83D\uDD18';
            if (type === 'led') return '\uD83D\uDD34';
            if (type === 'ammeter') return '\u26A1';
            if (type === 'voltmeter') return '\uD83D\uDD0B';
            if (type === 'capacitor') return '\u2E28';
            return '\u2AE8';
          };

          // ── Component label helper ──
          var getCompLabel = function(comp) {
            if (comp.type === 'resistor') return 'R';
            if (comp.type === 'bulb') return __alloT('stem.circuit.comp_bulb', 'Bulb');
            if (comp.type === 'switch') return comp.closed ? __alloT('stem.circuit.switch_on', 'ON') : __alloT('stem.circuit.switch_off', 'OFF');
            if (comp.type === 'led') return __alloT('stem.circuit.comp_led', 'LED');
            if (comp.type === 'ammeter') return __alloT('stem.circuit.comp_ammeter', 'Ammeter');
            if (comp.type === 'voltmeter') return __alloT('stem.circuit.comp_voltmeter', 'Voltmeter');
            if (comp.type === 'capacitor') return __alloT('stem.circuit.comp_cap_abbrev', 'Cap');
            return comp.type;
          };

          // ── Grade-band intro text ──
          var introText = gradeText(
            __alloT('stem.circuit.intro_g_low', 'Build a circuit! Connect parts to make electricity flow and light up bulbs.'),
            __alloT('stem.circuit.intro_g_mid', 'Build series and parallel circuits. Add resistors, bulbs, and switches. Watch how changing voltage affects current!'),
            __alloT('stem.circuit.intro_g_high', 'Explore Ohm\'s Law (V=IR) by building circuits. Compare series vs parallel. Measure with ammeter and voltmeter.'),
            __alloT('stem.circuit.intro_g_adv', 'Analyze DC circuits using Ohm\'s Law, Kirchhoff\'s Laws, and power dissipation. Series, parallel, and mixed configurations.')
          )(band);
          var earnedBadgeCount = Object.keys(badges).length;
          var challengeProgress = Object.keys(challengesDoneSet || {}).length;
          var circuitState = isShort ? {
            label: __alloT('stem.circuit.state_short_risk', 'Short risk'),
            tone: '#f87171',
            soft: 'rgba(127,29,29,0.38)',
            note: __alloT('stem.circuit.state_short_risk_note', 'Add resistance before current spikes.')
          } : (components.length === 0 || noLoadPath || hasOpenSwitch) ? {
            label: components.length === 0 ? __alloT('stem.circuit.state_ready_to_build', 'Ready to build') : __alloT('stem.circuit.state_open_path', 'Open path'),
            tone: '#fbbf24',
            soft: 'rgba(120,53,15,0.34)',
            note: components.length === 0 ? __alloT('stem.circuit.state_ready_note', 'Start with a load, then close the loop.') : __alloT('stem.circuit.state_open_note', 'Close switches or add a real load.')
          } : {
            label: __alloT('stem.circuit.state_current_flowing', 'Current flowing'),
            tone: '#22d3ee',
            soft: 'rgba(8,145,178,0.20)',
            note: __alloT('stem.circuit.state_current_flowing_note', 'Use the meters and readouts to test the model.')
          };
          var benchStats = [
            { label: __alloT('stem.circuit.stat_parts', 'Parts'), value: String(components.length), hint: mode + ' circuit' },
            { label: __alloT('stem.circuit.stat_voltage', 'Voltage'), value: voltage + 'V', hint: __alloT('stem.circuit.stat_voltage_hint', 'battery source') },
            { label: __alloT('stem.circuit.stat_current', 'Current'), value: current.toFixed(3) + 'A', hint: isShort ? __alloT('stem.circuit.stat_current_too_high', 'too high') : __alloT('stem.circuit.stat_current_live_flow', 'live flow') },
            { label: __alloT('stem.circuit.badges', 'Badges'), value: earnedBadgeCount + '/' + BADGES.length, hint: challengeProgress + ' challenges' }
          ];
          var benchRoutes = [
            { title: __alloT('stem.circuit.route_load_starter', 'Load Starter Circuit'), icon: '\uD83D\uDD34', note: __alloT('stem.circuit.route_load_starter_note', 'LED + resistor baseline'), action: function() { loadPreset(CIRCUIT_PRESETS[0]); }, tone: '#f97316' },
            { title: __alloT('stem.circuit.route_open_presets', 'Open Presets'), icon: '\uD83D\uDCCB', note: __alloT('stem.circuit.route_open_presets_note', 'Voltage dividers, meters, short demo'), action: function() { upd('showPresets', true); }, tone: '#facc15' },
            { title: __alloT('stem.circuit.route_advanced_sim', 'Advanced Simulator'), icon: '\uD83D\uDD0C', note: __alloT('stem.circuit.route_advanced_sim_note', 'CircuitJS meters and real-world challenges'), action: function() { if (typeof ctx.setToolData === 'function') ctx.setToolData(function(prev) { var cur = Object.assign({}, (prev && prev._circuitShelf) || {}); cur.returnTool = 'circuit'; var next = Object.assign({}, prev); next._circuitShelf = cur; return next; }); if (typeof setStemLabTab === 'function') setStemLabTab('explore'); if (typeof setStemLabTool === 'function') { setStemLabTool('circuitShelf'); if (typeof announceToSR === 'function') announceToSR('Opening Circuit Shelf advanced simulator.'); } else if (typeof addToast === 'function') addToast('Advanced simulator is not available right now.', 'info'); }, tone: '#fb923c' },
            { title: __alloT('stem.circuit.route_try_target', 'Try a Target'), icon: '\uD83C\uDFAF', note: challengeProgress + '/' + CHALLENGES.length + ' solved', action: function() { upd('challenge', CHALLENGES[0]); if (typeof addToast === 'function') addToast('Target ready: ' + CHALLENGES[0].label, 'info'); }, tone: '#34d399' },
            { title: band === 'g68' || band === 'g912' ? __alloT('stem.circuit.route_show_laws', 'Show Laws') : __alloT('stem.circuit.route_ask_tutor', 'Ask Tutor'), icon: band === 'g68' || band === 'g912' ? '\u2696' : '\uD83E\uDD16', note: band === 'g68' || band === 'g912' ? __alloT('stem.circuit.route_kirchhoff_support', 'Kirchhoff support') : __alloT('stem.circuit.route_circuit_hint', 'Get a circuit hint'), action: function() { if (band === 'g68' || band === 'g912') upd('showKirchhoff', true); else upd('showAI', true); }, tone: '#a78bfa' }
          ];
          var renderCircuitBench = function() {
            return h('section', {
              'data-circuit-bench': 'true',
              'aria-labelledby': 'circuit-bench-title',
              className: 'mb-4 rounded-2xl border border-cyan-500/25 bg-slate-900/70 p-4 shadow-xl shadow-cyan-950/20',
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }
            },
              h('div', { style: { minWidth: 0 } },
                h('div', { className: 'text-[11px] font-black uppercase tracking-wider text-cyan-300 mb-2' }, __alloT('stem.circuit.electronics_bench', 'Electronics bench')),
                h('h2', { id: 'circuit-bench-title', className: 'text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight mb-2' }, __alloT('stem.circuit.bench_headline', 'Build the loop, then prove the numbers')),
                h('p', { className: 'text-sm text-slate-300 leading-relaxed mb-3' }, introText),
                h('div', { className: 'rounded-xl border p-3', style: { borderColor: circuitState.tone + '66', background: circuitState.soft } },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { 'aria-hidden': 'true', className: 'text-lg' }, isShort ? '\u26A0\uFE0F' : current > 0.001 ? '\u26A1' : '\uD83D\uDD0C'),
                    h('span', { className: 'text-sm font-black uppercase tracking-wide', style: { color: circuitState.tone } }, circuitState.label)
                  ),
                  h('p', { className: 'text-xs text-slate-300 leading-snug' }, circuitState.note)
                ),
                h('div', { className: 'mt-3 grid gap-2', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))' } },
                  benchStats.map(function(stat) {
                    return h('div', { key: stat.label, className: 'rounded-xl border border-slate-700/70 bg-slate-950/55 p-2.5' },
                      h('div', { className: 'text-base font-black text-white font-mono leading-none' }, stat.value),
                      h('div', { className: 'mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400' }, stat.label),
                      h('div', { className: 'mt-0.5 text-[10px] text-slate-500' }, stat.hint)
                    );
                  })
                )
              ),
              h('div', { style: { minWidth: 0 } },
                h('div', { className: 'rounded-xl border border-slate-700 bg-slate-950/60 p-3 mb-3' },
                  h('svg', { viewBox: '0 0 330 164', width: '100%', role: 'img', 'aria-label': __alloT('stem.circuit.aria_bench_visual', 'Circuit bench visual showing battery, wire loop, load, and live meter readouts') },
                    h('rect', { x: 0, y: 0, width: 330, height: 164, rx: 18, fill: '#0f172a' }),
                    h('path', { d: 'M46 48 H112 V34 H232 V48 H284 V122 H46 Z', fill: 'none', stroke: current > 0.001 && !isShort ? '#22d3ee' : '#64748b', strokeWidth: 5, strokeLinejoin: 'round' }),
                    h('rect', { x: 28, y: 58, width: 36, height: 52, rx: 6, fill: '#ca8a04', stroke: '#facc15', strokeWidth: 2 }),
                    h('text', { x: 46, y: 88, textAnchor: 'middle', fill: '#fff', fontSize: 12, fontWeight: 900 }, voltage + 'V'),
                    h('rect', { x: 128, y: 22, width: 88, height: 30, rx: 8, fill: '#1e293b', stroke: isShort ? '#f87171' : '#facc15', strokeWidth: 2 }),
                    h('path', { d: 'M140 37 h9 l5 -8 l8 16 l7 -16 l8 16 l5 -8 h20', fill: 'none', stroke: isShort ? '#f87171' : '#facc15', strokeWidth: 2.5, strokeLinecap: 'round' }),
                    h('circle', { cx: 246, cy: 122, r: 25, fill: '#082f49', stroke: '#38bdf8', strokeWidth: 2 }),
                    h('text', { x: 246, y: 118, textAnchor: 'middle', fill: '#7dd3fc', fontSize: 10, fontWeight: 900 }, 'I'),
                    h('text', { x: 246, y: 132, textAnchor: 'middle', fill: '#e0f2fe', fontSize: 11, fontWeight: 900 }, current.toFixed(2) + 'A'),
                    current > 0.001 && !isShort && [0, 1, 2, 3].map(function(i) {
                      return h('circle', { key: i, cx: 84 + i * 42, cy: i % 2 ? 122 : 48, r: 4, fill: '#67e8f9', opacity: 0.85 });
                    }),
                    isShort && h('g', null,
                      h('path', { d: 'M154 74 l18 18 l-10 2 l16 22 l-32 -26 l12 -2 z', fill: '#f87171', opacity: 0.85 }),
                      h('text', { x: 166, y: 134, textAnchor: 'middle', fill: '#fecaca', fontSize: 11, fontWeight: 900 }, __alloT('stem.circuit.add_resistance', 'Add resistance'))
                    ),
                    h('text', { x: 22, y: 146, fill: '#94a3b8', fontSize: 10, fontWeight: 700 }, mode === 'series' ? __alloT('stem.circuit.svg_series_caption', 'Series: same current through every part') : __alloT('stem.circuit.svg_parallel_caption', 'Parallel: branches share voltage'))
                  )
                ),
                h('div', { className: 'grid gap-2', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))' } },
                  benchRoutes.map(function(route) {
                    return h('button', { key: route.title, type: 'button', onClick: route.action, className: 'text-left rounded-xl border bg-slate-950/55 p-3 transition-all hover:-translate-y-0.5 hover:bg-slate-900 active:scale-[0.98]', style: { borderColor: route.tone + '66' } },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('span', { 'aria-hidden': 'true', className: 'text-lg' }, route.icon),
                        h('span', { className: 'text-xs font-black text-white' }, route.title)
                      ),
                      h('div', { className: 'text-[11px] text-slate-400 leading-snug' }, route.note)
                    );
                  })
                )
              )
            );
          };

          // ──────────────────────────────────────────
          // RENDER
          // ──────────────────────────────────────────
          return h('div', { className: 'max-w-4xl mx-auto p-5 rounded-2xl border bg-slate-950/90 border-slate-800 text-slate-100 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200' },

            // ── Header ──
            h('div', { className: 'flex items-center gap-3 mb-3 flex-wrap' },
              h('button', {
                onClick: function() { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
                className: 'p-1.5 hover:bg-slate-800 rounded-lg transition-all active:scale-[0.97]',
                'aria-label': __alloT('stem.circuit.back_to_tools', 'Back to tools')
              }, h(ArrowLeft, { size: 18, className: 'text-slate-400' })),

              h('h3', { className: 'text-lg font-bold text-white tracking-tight' }, '\uD83D\uDD0C ' + __alloT('stem.circuit.circuit_builder', 'Circuit Builder')),

              h('span', { className: 'px-2 py-0.5 bg-yellow-950/60 text-yellow-400 text-[10px] font-black rounded-full border border-yellow-500/20' }, __alloT('stem.circuit.interactive_badge', 'INTERACTIVE')),

              isShort && h('span', { className: 'px-2 py-0.5 bg-red-950/60 text-red-400 text-[10px] font-black rounded-full border border-red-500/30 animate-pulse' }, '\u26A0 ' + __alloT('stem.circuit.short_circuit_banner', 'SHORT CIRCUIT!')),

              // Badge toggle
              h('button', { 'aria-label': __alloT('stem.circuit.badges', 'Badges'),
                onClick: function() { upd('showBadges', !showBadges); },
                className: 'px-2.5 py-1 text-xs rounded-lg transition-all font-semibold ' + (showBadges ? 'bg-amber-950/40 text-amber-400 border border-amber-600/40' : 'transition-colors bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white active:scale-[0.97]')
              }, '\uD83C\uDFC5 ' + __alloT('stem.circuit.badges', 'Badges')),

              // AI toggle
              h('button', { 'aria-label': __alloT('stem.circuit.ai_tutor', 'AI Tutor'),
                onClick: function() { upd('showAI', !showAI); },
                className: 'px-2.5 py-1 text-xs rounded-lg transition-all font-semibold ' + (showAI ? 'bg-blue-950/40 text-blue-400 border border-blue-600/40' : 'transition-colors bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white active:scale-[0.97]')
              }, '\uD83E\uDD16 ' + __alloT('stem.circuit.ai_tutor', 'AI Tutor')),

              // Mode buttons
              h('div', { className: 'flex gap-1 ml-auto' },
                ['series', 'parallel'].map(function(m) {
                  return h('button', { key: m, 'aria-pressed': mode === m,
                    onClick: function() { upd('mode', m); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ' + (mode === m ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/25' : 'transition-colors bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200 active:scale-[0.97]')
                  }, m);
                })
              )
            ),

            // ── Grade-band intro ──
            renderCircuitBench(),

            // ══════════════════════════════════════
            // SVG Schematic
            // ══════════════════════════════════════
            h('div', { className: 'relative' },
              h('svg', {
                viewBox: '0 0 ' + W + ' ' + H,
                className: 'w-full rounded-xl border transition-all ' + (isShort ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-500/10' : 'bg-slate-900 border-slate-800 shadow-inner'),
                role: 'img',
                'aria-label': 'Interactive ' + mode + ' circuit schematic. Battery ' + voltage + ' volts, ' + components.length + ' components, current ' + current.toFixed(3) + ' amps, source power ' + power.toFixed(2) + ' watts. ' + (isShort ? 'Warning: short circuit.' : (current > 0.001 ? 'Circuit energized; animated charge carriers show current flow.' : 'No current is flowing.')),
                style: { maxHeight: '220px' }
              },
                // Definitions for gradients & patterns
                h('defs', null,
                  h('pattern', { id: 'grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' },
                    h('path', { d: 'M 20 0 L 0 0 0 20', fill: 'none', stroke: 'rgba(255,255,255,0.03)', strokeWidth: 1 })
                  ),
                  h('radialGradient', { id: 'circuit-ambient', cx: '42%', cy: '48%', r: '72%' },
                    h('stop', { offset: '0%', stopColor: isShort ? '#ef4444' : '#0891b2', stopOpacity: current > 0.001 ? 0.18 : 0.04 }),
                    h('stop', { offset: '62%', stopColor: isShort ? '#7f1d1d' : '#172554', stopOpacity: current > 0.001 ? 0.12 : 0.03 }),
                    h('stop', { offset: '100%', stopColor: '#020617', stopOpacity: 0 })
                  ),
                  h('linearGradient', { id: 'circuit-battery', x1: '0', y1: '0', x2: '1', y2: '1' },
                    h('stop', { offset: '0%', stopColor: isShort ? '#f87171' : '#fde047' }),
                    h('stop', { offset: '48%', stopColor: isShort ? '#991b1b' : '#ca8a04' }),
                    h('stop', { offset: '100%', stopColor: isShort ? '#450a0a' : '#713f12' })
                  ),
                  h('filter', { id: 'circuit-wire-glow', x: '-30%', y: '-80%', width: '160%', height: '260%' },
                    h('feGaussianBlur', { stdDeviation: isShort ? '2.8' : '1.8', result: 'wireBlur' }),
                    h('feMerge', null,
                      h('feMergeNode', { in: 'wireBlur' }),
                      h('feMergeNode', { in: 'SourceGraphic' })
                    )
                  ),
                  // LED Gradients
                  components.map(function(c) {
                    if (c.type !== 'led') return null;
                    return h('linearGradient', { key: 'led-grad-' + c.id, id: 'led-grad-' + c.id, x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: c.ledColor || '#ef4444', stopOpacity: 0.7 }),
                      h('stop', { offset: '100%', stopColor: c.ledColor || '#ef4444', stopOpacity: 0 })
                    );
                  })
                ),
                
                // Grid Background
                h('rect', { width: W, height: H, fill: 'url(#grid)', rx: 12 }),
                h('rect', { width: W, height: H, fill: 'url(#circuit-ambient)', rx: 12, pointerEvents: 'none' }),
                
                // Battery
                h('rect', { x: 11, y: 36, width: 48, height: 68, fill: isShort ? '#ef4444' : '#eab308', opacity: current > 0.001 ? 0.18 : 0.08, rx: 10, filter: 'url(#circuit-wire-glow)' }),
                h('rect', { x: 15, y: 40, width: 40, height: 60, fill: 'url(#circuit-battery)', stroke: isShort ? '#fca5a5' : '#fde047', strokeWidth: 2, rx: 6 }),
                // Highlight on battery
                h('rect', { x: 17, y: 42, width: 12, height: 56, fill: 'rgba(255,255,255,0.08)', rx: 3 }),
                h('text', { x: 35, y: 74, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: '900', fontFamily: 'system-ui' }, fill: '#ffffff' }, voltage + 'V'),
                h('text', { x: 35, y: 30, textAnchor: 'middle', style: { fontSize: '12px' } }, '\uD83D\uDD0B'),
                h('text', { x: 20, y: 38, fill: '#ef4444', style: { fontSize: '12px', fontWeight: 'bold' } }, '+'),
                h('text', { x: 20, y: 110, fill: '#3b82f6', style: { fontSize: '12px', fontWeight: 'bold' } }, '\u2212'),

                // Dynamic Wires
                (function() {
                  var wires = [];
                  var wireColor = isShort ? '#fb7185' : (current > 0.001 ? '#22d3ee' : '#64748b');
                  var wWidth = isShort ? 2.5 : 2;
                  
                  if (components.length === 0) {
                    wires.push(h('line', { key: 'w0', x1: 35, y1: 20, x2: 400, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w1', x1: 400, y1: 20, x2: 400, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w2', x1: 400, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                  } else if (mode === 'series') {
                    var spacing = Math.min(70, 280 / Math.max(components.length, 1));
                    var cx0 = 80;
                    wires.push(h('line', { key: 'w0', x1: 35, y1: 20, x2: cx0, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                    
                    for (var i = 0; i < components.length; i++) {
                      var cx = 80 + i * spacing;
                      var comp = components[i];
                      var compTopY = 55;
                      var compBottomY = comp.type === 'resistor' ? 100 : (comp.type === 'switch' ? 95 : (comp.type === 'ammeter' || comp.type === 'voltmeter' ? 90 : (comp.type === 'capacitor' ? 100 : 92)));
                      
                      wires.push(h('line', { key: 'wv1-' + i, x1: cx, y1: 20, x2: cx, y2: compTopY, stroke: wireColor, strokeWidth: wWidth }));
                      wires.push(h('line', { key: 'wv2-' + i, x1: cx, y1: compBottomY, x2: cx, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                      
                      if (i < components.length - 1) {
                        var nextCx = 80 + (i + 1) * spacing;
                        if (i % 2 === 0) {
                          wires.push(h('line', { key: 'wh-' + i, x1: cx, y1: 140, x2: nextCx, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                        } else {
                          wires.push(h('line', { key: 'wh-' + i, x1: cx, y1: 20, x2: nextCx, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                        }
                      }
                    }
                    
                    var lastCx = 80 + (components.length - 1) * spacing;
                    if ((components.length - 1) % 2 === 0) {
                      wires.push(h('line', { key: 'wret', x1: lastCx, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    } else {
                      wires.push(h('line', { key: 'wret1', x1: lastCx, y1: 20, x2: 400, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                      wires.push(h('line', { key: 'wret2', x1: 400, y1: 20, x2: 400, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                      wires.push(h('line', { key: 'wret3', x1: 400, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    }
                  } else {
                    // Parallel mode
                    var maxCy = 40 + (components.length - 1) * Math.min(30, 80 / Math.max(components.length, 1));
                    wires.push(h('line', { key: 'w0', x1: 35, y1: 20, x2: 180, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w1', x1: 180, y1: 20, x2: 180, y2: maxCy, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w2', x1: 260, y1: maxCy, x2: 260, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w3', x1: 260, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                  }
                  return h('g', { filter: current > 0.001 || isShort ? 'url(#circuit-wire-glow)' : null, opacity: current > 0.001 ? 0.95 : 1 }, wires);
                })(),

                // Battery connections
                h('line', { x1: 35, y1: 40, x2: 35, y2: 20, stroke: isShort ? '#ef4444' : '#475569', strokeWidth: 2 }),
                h('line', { x1: 35, y1: 100, x2: 35, y2: 140, stroke: isShort ? '#ef4444' : '#475569', strokeWidth: 2 }),

                // Electric-field signal pulse: it races around the conductor while
                // individual charge carriers below remain discrete and visibly slower.
                !isShort && current > 0.001 && h('g', { 'aria-hidden': 'true', pointerEvents: 'none' },
                  h('g', { className: 'circ-signal-pulse' },
                    h('rect', { x: 45, y: 16, width: 24, height: 8, rx: 4, fill: '#67e8f9', opacity: 0.24, filter: 'url(#circuit-wire-glow)' }),
                    h('circle', { cx: 57, cy: 20, r: 3.2, fill: '#ecfeff', stroke: '#22d3ee', strokeWidth: 1 }),
                    h('path', { d: 'M51 20 H63', stroke: '#ffffff', strokeWidth: 1.2, opacity: 0.9 })
                  ),
                  h('text', { x: 302, y: 15, fill: '#a5f3fc', style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' } }, __alloT('stem.circuit.field_signal_light_speed', 'field signal ≈ light speed'))
                ),
                // Current direction arrow
                !isShort && current > 0.01 && h('g', null,
                  h('polygon', { points: '210,12 220,8 220,16', fill: '#06b6d4', filter: 'drop-shadow(0 0 2px #06b6d4)' }),
                  h('text', { x: 225, y: 15, fill: '#06b6d4', style: { fontSize: '8px', fontWeight: 'bold', fontFamily: 'monospace' } }, 'I = ' + current.toFixed(2) + 'A')
                ),

                // ── Components: Series layout ──
                mode === 'series'
                  ? components.map(function(comp, i) {
                      var spacing = Math.min(70, 280 / Math.max(components.length, 1));
                      var cx = 80 + i * spacing;
                      var compI = current;
                      var compR = getCompR(comp);
                      var compV = current * compR;
                      var compP = compV * compI;
                      var bulbBright = comp.type === 'bulb' ? Math.min(compP / 12, 1) : 0;
                      var ledGlow = comp.type === 'led' && current > 0.005 ? Math.min(current * 20, 1) : 0;
                      var chargeLvl = Math.min(tick / 120, 1);

                      return h('g', { key: comp.id },
                        // Power aura scales with P = VI, revealing where energy becomes heat or light.
                        compP > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('ellipse', {
                          cx: cx, cy: 78, rx: 18 + Math.min(compP, 20) * 0.7, ry: 25 + Math.min(compP, 20) * 0.8,
                          fill: comp.type === 'bulb' ? '#fde047' : (comp.type === 'led' ? (comp.ledColor || '#ef4444') : '#fb923c'),
                          opacity: Math.min(0.08 + compP / 55, 0.34), filter: 'blur(6px)', 'aria-hidden': 'true'
                        }),
                        // Component body
                        comp.type === 'resistor'
                          ? h('g', null,
                              h('rect', { x: cx - 12, y: 55, width: 24, height: 45, fill: '#1e293b', stroke: '#eab308', strokeWidth: 1.5, rx: 4 }),
                              // Color bands
                              h('rect', { x: cx - 12, y: 62, width: 24, height: 4, fill: '#d97706' }),
                              h('rect', { x: cx - 12, y: 70, width: 24, height: 4, fill: '#4f46e5' }),
                              h('rect', { x: cx - 12, y: 78, width: 24, height: 4, fill: '#0891b2' }),
                              h('rect', { x: cx - 12, y: 86, width: 24, height: 4, fill: '#ca8a04' })
                            )

                          : comp.type === 'switch'
                          ? h('g', { onClick: function() { toggleSwitch(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'Switch ' + comp.id + ' (currently ' + (comp.closed ? 'closed/ON' : 'open/OFF') + '). Press Enter to toggle.', 'aria-pressed': !!comp.closed, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSwitch(comp.id); } }, style: { cursor: 'pointer' } },
                              h('rect', { x: cx - 14, y: 55, width: 28, height: 40, fill: comp.closed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 1.5, rx: 5 }),
                              h('circle', { cx: cx - 6, cy: 75, r: 3, fill: '#94a3b8' }),
                              h('circle', { cx: cx + 6, cy: 75, r: 3, fill: '#94a3b8' }),
                              // Animated rotating switch arm
                              h('line', { x1: cx - 6, y1: 75, x2: cx + 8, y2: 75, stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 2.5, style: { transform: comp.closed ? 'none' : 'rotate(-35deg)', transformOrigin: (cx - 6) + 'px 75px', transition: 'transform 0.25s ease' } }),
                              h('text', { x: cx, y: 66, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: '900', fontFamily: 'system-ui' }, fill: comp.closed ? '#10b981' : '#ef4444' }, comp.closed ? __alloT('stem.circuit.switch_on', 'ON') : __alloT('stem.circuit.switch_off', 'OFF'))
                            )

                          : comp.type === 'led'
                          ? h('g', { onClick: function() { cycleLedColor(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'LED ' + comp.id + ' (color ' + (comp.ledColor || '#ef4444') + '). Press Enter to cycle color.', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleLedColor(comp.id); } }, style: { cursor: 'pointer' } },
                              // Glow light cone
                              ledGlow > 0.1 && h('polygon', { points: (cx - 14) + ',78 ' + (cx + 14) + ',78 ' + cx + ',115', fill: 'url(#led-grad-' + comp.id + ')', pointerEvents: 'none' }),
                              ledGlow > 0.1 && h('circle', { cx: cx, cy: 75, r: 14 + ledGlow * 6, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow * 0.35).toFixed(2)), filter: 'blur(2px)' }),
                              h('polygon', { points: (cx - 10) + ',65 ' + (cx + 10) + ',65 ' + cx + ',85', fill: ledGlow > 0.2 ? (comp.ledColor || '#ef4444') : '#475569', stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 }),
                              h('line', { x1: cx - 10, y1: 85, x2: cx + 10, y2: 85, stroke: comp.ledColor || '#ef4444', strokeWidth: 2 })
                            )

                          : comp.type === 'ammeter'
                          ? h('g', null,
                              h('circle', { cx: cx, cy: 75, r: 15, fill: '#0f172a', stroke: '#06b6d4', strokeWidth: 2 }),
                              h('text', { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: '900', fontFamily: 'monospace' }, fill: '#06b6d4' }, 'A'),
                              current > 0.001 && h('text', { x: cx, y: 66, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#22d3ee' }, current.toFixed(3) + 'A')
                            )

                          : comp.type === 'voltmeter'
                          ? h('g', null,
                              h('circle', { cx: cx, cy: 75, r: 15, fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 2 }),
                              h('text', { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: '900', fontFamily: 'monospace' }, fill: '#f59e0b' }, 'V'),
                              h('text', { x: cx, y: 66, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#fbbf24' }, voltage.toFixed(1) + 'V')
                            )

                          : comp.type === 'capacitor'
                          ? h('g', null,
                              h('rect', { x: cx - 14, y: 55, width: 28, height: 45, fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 1.5, rx: 4 }),
                              // Parallel plates
                              h('line', { x1: cx - 8, y1: 72, x2: cx + 8, y2: 72, stroke: '#38bdf8', strokeWidth: 2.5 }),
                              h('line', { x1: cx - 8, y1: 80, x2: cx + 8, y2: 80, stroke: '#38bdf8', strokeWidth: 2.5 }),
                              h('text', { x: cx, y: 64, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#38bdf8' }, 'C'),
                              // Charge accumulation signs (+ / -)
                              current > 0.001 && h('g', { opacity: chargeLvl },
                                h('text', { x: cx - 10, y: 70, fill: '#ef4444', style: { fontSize: '8px', fontWeight: 'bold' } }, '+'),
                                h('text', { x: cx + 5, y: 70, fill: '#ef4444', style: { fontSize: '8px', fontWeight: 'bold' } }, '+'),
                                h('text', { x: cx - 10, y: 88, fill: '#3b82f6', style: { fontSize: '8px', fontWeight: 'bold' } }, '\u2212'),
                                h('text', { x: cx + 5, y: 88, fill: '#3b82f6', style: { fontSize: '8px', fontWeight: 'bold' } }, '\u2212')
                              )
                            )

                          // Bulb
                          : h('g', null,
                              bulbBright > 0.1 && h('circle', { cx: cx, cy: 77, r: 18 + bulbBright * 15, fill: 'rgba(251,191,36,' + (bulbBright * 0.35).toFixed(2) + ')', filter: 'blur(3px)' }),
                              h('circle', { cx: cx, cy: 77, r: 15, fill: bulbBright > 0.2 ? 'rgba(253,224,71,' + (0.3 + bulbBright * 0.7).toFixed(2) + ')' : '#334155', stroke: '#eab308', strokeWidth: 1.5 }),
                              // filament
                              h('path', { d: 'M ' + (cx - 4) + ' 82 Q ' + cx + ' 68 ' + (cx + 4) + ' 82', fill: 'none', stroke: bulbBright > 0.2 ? '#ffffff' : '#94a3b8', strokeWidth: 1.5 })
                            ),

                        // Value label
                        comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                          && h('text', {
                            x: cx,
                            y: comp.type === 'resistor' ? 112 : (comp.type === 'led' ? 104 : (comp.type === 'capacitor' ? 112 : 100)),
                            textAnchor: 'middle',
                            style: { fontSize: '8px', fontWeight: 'bold', fontFamily: 'monospace' },
                            fill: '#cbd5e1'
                          }, comp.type === 'led' ? '~40\u03A9' : (comp.type === 'capacitor' ? comp.value + '\u00B5F' : comp.value + '\u03A9')),

                        // Voltage drop label
                        current > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                          && h('text', {
                            x: cx,
                            y: comp.type === 'resistor' ? 120 : (comp.type === 'led' ? 112 : (comp.type === 'capacitor' ? 120 : 108)),
                            textAnchor: 'middle',
                            style: { fontSize: '7px', fontFamily: 'monospace' },
                            fill: '#38bdf8'
                          }, compV.toFixed(1) + 'V')
                      );
                    })

                  // ── Components: Parallel layout ──
                  : components.map(function(comp, i) {
                      var cy = 40 + i * Math.min(30, 80 / Math.max(components.length, 1));
                      var compR2 = getCompR(comp);
                      var compI2 = voltage / compR2;
                      var compP2 = voltage * compI2;
                      var branchStrength = Math.min(1, Math.log10(1 + Math.max(0, compI2)) / 1.4);
                      var isIdealParallelBranch2 = mode === 'parallel' && compR2 < 0.01;
                      var bulbBright2 = comp.type === 'bulb' ? Math.min(compP2 / 12, 1) : 0;
                      var ledGlow2 = comp.type === 'led' && compI2 > 0.005 ? Math.min(compI2 * 20, 1) : 0;
                      var chargeLvl = Math.min(tick / 120, 1);

                      return h('g', { key: comp.id },
                        // Each branch gets its own P = VI aura, making parallel power sharing visible.
                        compP2 > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('ellipse', {
                          cx: 220, cy: cy, rx: 28 + Math.min(compP2, 20) * 0.55, ry: 13 + Math.min(compP2, 20) * 0.35,
                          fill: comp.type === 'bulb' ? '#fde047' : (comp.type === 'led' ? (comp.ledColor || '#ef4444') : '#fb923c'),
                          opacity: Math.min(0.08 + compP2 / 55, 0.34), filter: 'blur(5px)', 'aria-hidden': 'true'
                        }),
                        // Branch glow and junction nodes encode how total current divides.
                        !isShort && compI2 > 0.001 && h('g', { 'aria-hidden': 'true', pointerEvents: 'none', filter: 'url(#circuit-wire-glow)' },
                          h('line', { x1: 180, y1: cy, x2: 202, y2: cy, stroke: '#22d3ee', strokeWidth: 2 + branchStrength * 4, opacity: 0.24 + branchStrength * 0.6 }),
                          h('line', { x1: 238, y1: cy, x2: 260, y2: cy, stroke: '#22d3ee', strokeWidth: 2 + branchStrength * 4, opacity: 0.24 + branchStrength * 0.6 }),
                          h('circle', { cx: 180, cy: cy, r: 2.5 + branchStrength * 1.8, fill: '#a5f3fc', stroke: '#0891b2', strokeWidth: 1 }),
                          h('circle', { cx: 260, cy: cy, r: 2.5 + branchStrength * 1.8, fill: '#a5f3fc', stroke: '#0891b2', strokeWidth: 1 })
                        ),                        // Leads connecting to bus lines
                        h('line', { x1: 180, y1: cy, x2: 200, y2: cy, stroke: '#475569', strokeWidth: 1.5 }),
                        h('line', { x1: 240, y1: cy, x2: 260, y2: cy, stroke: '#475569', strokeWidth: 1.5 }),

                        // Component body (parallel - horizontal)
                        comp.type === 'resistor'
                          ? h('g', null,
                              h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: '#1e293b', stroke: '#eab308', strokeWidth: 1.5, rx: 3 }),
                              h('rect', { x: 208, y: cy - 8, width: 3, height: 16, fill: '#d97706' }),
                              h('rect', { x: 216, y: cy - 8, width: 3, height: 16, fill: '#4f46e5' }),
                              h('rect', { x: 224, y: cy - 8, width: 3, height: 16, fill: '#0891b2' })
                            )

                          : comp.type === 'switch'
                          ? h('g', { onClick: function() { toggleSwitch(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'Switch ' + comp.id + ' (currently ' + (comp.closed ? 'closed/ON' : 'open/OFF') + '). Press Enter to toggle.', 'aria-pressed': !!comp.closed, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSwitch(comp.id); } }, style: { cursor: 'pointer' } },
                              h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: comp.closed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 1.5, rx: 3 }),
                              h('circle', { cx: 208, cy: cy, r: 2.5, fill: '#94a3b8' }),
                              h('circle', { cx: 232, cy: cy, r: 2.5, fill: '#94a3b8' }),
                              h('line', { x1: 208, y1: cy, x2: 232, y2: cy, stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 2, style: { transform: comp.closed ? 'none' : 'rotate(-35deg)', transformOrigin: '208px ' + cy + 'px', transition: 'transform 0.25s ease' } }),
                              h('text', { x: 220, y: cy - 10, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: '900' }, fill: comp.closed ? '#10b981' : '#ef4444' }, comp.closed ? __alloT('stem.circuit.switch_on', 'ON') : __alloT('stem.circuit.switch_off', 'OFF'))
                            )

                          : comp.type === 'led'
                          ? h('g', { onClick: function() { cycleLedColor(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'LED ' + comp.id + ' (color ' + (comp.ledColor || '#ef4444') + '). Press Enter to cycle color.', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleLedColor(comp.id); } }, style: { cursor: 'pointer' } },
                              ledGlow2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 12 + ledGlow2 * 5, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow2 * 0.35).toFixed(2)), filter: 'blur(2px)' }),
                              h('polygon', { points: '212,' + (cy - 5) + ' 228,' + (cy - 5) + ' 220,' + (cy + 7), fill: ledGlow2 > 0.2 ? (comp.ledColor || '#ef4444') : '#475569', stroke: comp.ledColor || '#ef4444', strokeWidth: 1.2 }),
                              h('line', { x1: 212, y1: cy + 7, x2: 228, y2: cy + 7, stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 })
                            )

                          : comp.type === 'ammeter'
                          ? h('g', null,
                              h('circle', { cx: 220, cy: cy, r: 10, fill: '#0f172a', stroke: '#06b6d4', strokeWidth: 1.5 }),
                              h('text', { x: 220, y: cy + 3.5, textAnchor: 'middle', style: { fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#06b6d4' }, 'A')
                            )

                          : comp.type === 'voltmeter'
                          ? h('g', null,
                              h('circle', { cx: 220, cy: cy, r: 10, fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 1.5 }),
                              h('text', { x: 220, y: cy + 3.5, textAnchor: 'middle', style: { fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#f59e0b' }, 'V')
                            )

                          : comp.type === 'capacitor'
                          ? h('g', null,
                              h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 1.5, rx: 3 }),
                              h('line', { x1: 216, y1: cy - 6, x2: 216, y2: cy + 6, stroke: '#38bdf8', strokeWidth: 2 }),
                              h('line', { x1: 224, y1: cy - 6, x2: 224, y2: cy + 6, stroke: '#38bdf8', strokeWidth: 2 })
                            )

                          // bulb
                          : h('g', null,
                              bulbBright2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 12 + bulbBright2 * 5, fill: 'rgba(251,191,36,' + (bulbBright2 * 0.25).toFixed(2) + ')', filter: 'blur(3px)' }),
                              h('circle', { cx: 220, cy: cy, r: 10, fill: bulbBright2 > 0.2 ? 'rgba(253,224,71,' + (0.3 + bulbBright2 * 0.7).toFixed(2) + ')' : '#334155', stroke: '#eab308', strokeWidth: 1.2 })
                            ),

                        // Value/reading labels (parallel)
                        comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                          && h('text', { x: 220, y: cy - 10, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#cbd5e1' }, comp.type === 'led' ? '~40\u03A9' : (comp.type === 'capacitor' ? comp.value + '\u00B5F' : comp.value + '\u03A9')),

                        comp.type === 'ammeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#22d3ee' }, isIdealParallelBranch2 ? __alloT('stem.circuit.meter_reading_short', 'short') : compI2.toFixed(3) + 'A'),
                        comp.type === 'voltmeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#fbbf24' }, voltage.toFixed(1) + 'V'),
                        comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontFamily: 'monospace' }, fill: '#38bdf8' }, isIdealParallelBranch2 ? __alloT('stem.circuit.meter_reading_short', 'short') : compI2.toFixed(2) + 'A')
                      );
                    }),

                // Persistent schematic fault marker: visible even without canvas animation.
                isShort && h('g', { 'aria-hidden': 'true', pointerEvents: 'none', className: 'circuit-short' },
                  h('circle', { cx: 70, cy: 69, r: 30, fill: '#ef4444', opacity: 0.12, filter: 'url(#circuit-wire-glow)' }),
                  h('path', { d: 'M55 43 L68 58 L61 65 L78 82 L72 64 L81 58 L67 43 Z', fill: '#fef2f2', stroke: '#fb7185', strokeWidth: 1.4, filter: 'url(#circuit-wire-glow)' }),
                  h('path', { d: 'M91 48 L85 55 L92 61 L84 69', fill: 'none', stroke: '#fda4af', strokeWidth: 2, strokeLinecap: 'round' }),
                  h('path', { d: 'M48 83 L42 89 L49 95', fill: 'none', stroke: '#fda4af', strokeWidth: 2, strokeLinecap: 'round' }),
                  h('rect', { x: 105, y: 50, width: 130, height: 34, rx: 8, fill: '#450a0a', stroke: '#fb7185', strokeWidth: 1.2, opacity: 0.96 }),
                  h('text', { x: 170, y: 64, textAnchor: 'middle', fill: '#fecaca', style: { fontSize: '9px', fontWeight: '900', fontFamily: 'system-ui' } }, __alloT('stem.circuit.short_circuit_label', 'SHORT CIRCUIT')),
                  h('text', { x: 170, y: 76, textAnchor: 'middle', fill: '#fda4af', style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' } }, __alloT('stem.circuit.short_circuit_detail', 'near-zero resistance • current surge'))
                ),
                // Electron dots
                electronDots.map(function(dot, i) {
                  return h('circle', { key: 'e' + i, cx: dot.x, cy: dot.y, r: 3, fill: '#06b6d4', opacity: 0.8, filter: 'drop-shadow(0 0 2px #06b6d4)', 'aria-hidden': 'true' });
                }),

                // Empty state
                components.length === 0 && h('text', { x: W / 2, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' } }, __alloT('stem.circuit.add_components_below', 'Add components below'))
              ),

              // Transparent HTML5 canvas overlay for short circuit particles
              isShort && h('canvas', {
                ref: function(canvas) {
                  if (!canvas) {
                    if (typeof window !== 'undefined' && window._circuitCanvasCleanup) window._circuitCanvasCleanup();
                    return;
                  }
                  if (canvas._circuitSparkInit) {
                    if (canvas._circuitSparkResize) canvas._circuitSparkResize();
                    if (canvas._circuitSparkSchedule) canvas._circuitSparkSchedule();
                    return;
                  }
                  if (typeof window !== 'undefined' && window._circuitCanvasCleanup) window._circuitCanvasCleanup();
                  var ctx2d = canvas.getContext('2d');
                  if (!ctx2d) return;
                  canvas._circuitSparkInit = true;
                  var w = 0;
                  var h = 0;
                  var sparkActive = true;
                  var sparkRaf = null;

                  function resizeCircuitSparkCanvas() {
                    w = canvas.width = canvas.offsetWidth || W;
                    h = canvas.height = canvas.offsetHeight || H;
                  }

                  function isCircuitSparkHidden() {
                    return typeof document !== 'undefined' && !!document.hidden;
                  }

                  function cancelCircuitSparkFrame() {
                    if (sparkRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(sparkRaf);
                    sparkRaf = null;
                  }

                  function scheduleCircuitSparkFrame() {
                    if (!sparkActive || sparkRaf || _prefersReducedMotion || isCircuitSparkHidden()) return;
                    if (typeof requestAnimationFrame !== 'function') return;
                    sparkRaf = requestAnimationFrame(loop);
                  }

                  function cleanupCircuitSparkCanvas() {
                    sparkActive = false;
                    cancelCircuitSparkFrame();
                    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onCircuitSparkVisibilityChange);
                    canvas._circuitSparkInit = false;
                    canvas._circuitSparkCleanup = null;
                    canvas._circuitSparkResize = null;
                    canvas._circuitSparkSchedule = null;
                    if (typeof window !== 'undefined' && window._circuitCanvasCleanup === cleanupCircuitSparkCanvas) window._circuitCanvasCleanup = null;
                  }

                  function onCircuitSparkVisibilityChange() {
                    if (!sparkActive) return;
                    if (!canvas.isConnected) { cleanupCircuitSparkCanvas(); return; }
                    if (isCircuitSparkHidden()) cancelCircuitSparkFrame();
                    else { cancelCircuitSparkFrame(); loop(); }
                  }

                  resizeCircuitSparkCanvas();
                  
                  if (!canvas.particles) {
                    canvas.particles = [];
                    for (var p = 0; p < 20; p++) {
                      canvas.particles.push({
                        x: w / 2 + (Math.random() - 0.5) * 60,
                        y: h / 2 + (Math.random() - 0.5) * 60,
                        vx: (Math.random() - 0.5) * 5,
                        vy: -Math.random() * 3 - 2,
                        life: Math.random() * 25 + 10,
                        maxLife: 35,
                        type: Math.random() > 0.45 ? 'spark' : 'smoke',
                        size: Math.random() * 2.5 + 1
                      });
                    }
                  }
                  
                  function loop() {
                    if (!sparkActive) return;
                    sparkRaf = null;
                    if (!canvas.isConnected) { cleanupCircuitSparkCanvas(); return; }
                    if (isCircuitSparkHidden()) { cancelCircuitSparkFrame(); return; }
                    ctx2d.clearRect(0, 0, w, h);
                    
                    // Spawn sparks near battery / short components
                    if (Math.random() < 0.4) {
                      canvas.particles.push({
                        x: 35 + (Math.random() - 0.5) * 15,
                        y: 40 + Math.random() * 60,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 4 - 2,
                        life: 30,
                        maxLife: 30,
                        type: 'spark',
                        size: Math.random() * 2.5 + 1.5
                      });
                    }
                    if (Math.random() < 0.25) {
                      canvas.particles.push({
                        x: 35 + Math.random() * (w - 70),
                        y: 20 + (Math.random() - 0.5) * 8,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -Math.random() * 2 - 1,
                        life: 45,
                        maxLife: 45,
                        type: 'smoke',
                        size: Math.random() * 6 + 3
                      });
                    }
                    
                    for (var p = 0; p < canvas.particles.length; p++) {
                      var pt = canvas.particles[p];
                      pt.x += pt.vx;
                      pt.y += pt.vy;
                      pt.life--;
                      
                      if (pt.type === 'spark') {
                        ctx2d.save();
                        ctx2d.shadowColor = 'rgba(251,146,60,0.9)'; ctx2d.shadowBlur = 6;
                        ctx2d.fillStyle = 'rgba(251, 146, 60, ' + (pt.life / pt.maxLife).toFixed(2) + ')';
                        ctx2d.beginPath();
                        ctx2d.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                        ctx2d.fill();
                        ctx2d.strokeStyle = 'rgba(239, 68, 68, ' + (pt.life / pt.maxLife * 0.4).toFixed(2) + ')';
                        ctx2d.lineWidth = 1;
                        ctx2d.stroke();
                        ctx2d.restore();
                      } else {
                        // smoke
                        ctx2d.fillStyle = 'rgba(148, 163, 184, ' + (pt.life / pt.maxLife * 0.15).toFixed(2) + ')';
                        ctx2d.beginPath();
                        ctx2d.arc(pt.x, pt.y, pt.size + (1 - pt.life / pt.maxLife) * 8, 0, Math.PI * 2);
                        ctx2d.fill();
                      }
                    }
                    
                    canvas.particles = canvas.particles.filter(function(pt) { return pt.life > 0; });
                    scheduleCircuitSparkFrame();
                  }
                  
                  canvas._circuitSparkCleanup = cleanupCircuitSparkCanvas;
                  canvas._circuitSparkResize = resizeCircuitSparkCanvas;
                  canvas._circuitSparkSchedule = scheduleCircuitSparkFrame;
                  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onCircuitSparkVisibilityChange);
                  if (typeof window !== 'undefined') window._circuitCanvasCleanup = cleanupCircuitSparkCanvas;
                  loop();
                },
                className: 'absolute inset-0 w-full h-full pointer-events-none'
              })
            ),

            // ══════════════════════════════════════
            // Component buttons
            // ══════════════════════════════════════
            h('div', { className: 'flex flex-wrap gap-2 mt-4 mb-4 justify-center sm:justify-start' },
              h('button', { 'aria-label': __alloT('stem.circuit.comp_resistor', 'Resistor'),
                onClick: function() { addComponent('resistor', 100); },
                className: 'px-3 py-1.5 bg-yellow-950/20 hover:bg-yellow-500/20 text-yellow-400 font-bold rounded-lg text-xs border border-yellow-500/30 hover:border-yellow-400 transition-all glow-button active:scale-[0.97]'
              }, '\u2795 ' + __alloT('stem.circuit.comp_resistor', 'Resistor')),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_bulb', 'Bulb'),
                onClick: function() { addComponent('bulb', 50); },
                className: 'px-3 py-1.5 bg-amber-950/20 hover:bg-amber-500/20 text-amber-400 font-bold rounded-lg text-xs border border-amber-500/30 hover:border-amber-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDCA1 ' + __alloT('stem.circuit.comp_bulb', 'Bulb')),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_switch', 'Switch'),
                onClick: function() { addComponent('switch', 0, { closed: true }); },
                className: 'px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-lg text-xs border border-emerald-500/30 hover:border-emerald-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDD18 ' + __alloT('stem.circuit.comp_switch', 'Switch')),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_led', 'LED'),
                onClick: function() { addComponent('led', 40, { ledColor: '#ef4444' }); },
                className: 'px-3 py-1.5 bg-rose-950/20 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg text-xs border border-rose-500/30 hover:border-rose-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDD34 ' + __alloT('stem.circuit.comp_led', 'LED')),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_ammeter', 'Ammeter'),
                onClick: function() { addComponent('ammeter', 0); },
                className: 'px-3 py-1.5 bg-cyan-950/20 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded-lg text-xs border border-cyan-500/30 hover:border-cyan-400 transition-all glow-button active:scale-[0.97]'
              }, '\u26A1 ' + __alloT('stem.circuit.comp_ammeter', 'Ammeter')),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_voltmeter', 'Voltmeter'),
                onClick: function() { addComponent('voltmeter', 0); },
                className: 'px-3 py-1.5 bg-orange-950/20 hover:bg-orange-500/20 text-orange-400 font-bold rounded-lg text-xs border border-orange-500/30 hover:border-orange-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDD0B ' + __alloT('stem.circuit.comp_voltmeter', 'Voltmeter')),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_capacitor', 'Capacitor'),
                onClick: function() { addComponent('capacitor', 100); },
                className: 'px-3 py-1.5 bg-sky-950/20 hover:bg-sky-500/20 text-sky-400 font-bold rounded-lg text-xs border border-sky-500/30 hover:border-sky-400 transition-all glow-button active:scale-[0.97]'
              }, '\u2E28 ' + __alloT('stem.circuit.comp_capacitor', 'Capacitor')),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_clear', 'Clear'),
                onClick: clearComponents,
                className: 'px-3 py-1.5 bg-red-950/30 hover:bg-red-500/30 text-red-400 font-bold rounded-lg text-xs border border-red-500/30 hover:border-red-400 transition-all active:scale-[0.97]'
              }, '\uD83D\uDDD1 ' + __alloT('stem.circuit.comp_clear', 'Clear')),

              components.length > 0 && h('span', { className: 'self-center text-xs text-slate-400 ml-auto font-mono' }, components.length + ' component' + (components.length > 1 ? 's' : ''))
            ),

            // ══════════════════════════════════════
            // Voltage slider + component editor
            // ══════════════════════════════════════
            h('div', { className: 'bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md mt-4' },
              // Voltage slider row
              h('div', { className: 'flex items-center gap-3 mb-4' },
                h('span', { className: 'text-xl' }, '\uD83D\uDD0B'),
                h('input', {
                  type: 'range', 'aria-label': __alloT('stem.circuit.aria_voltage_slider', 'Voltage slider'), min: 1, max: 24, step: 0.5,
                  value: voltage,
                  'aria-valuetext': voltage + ' volts. ' + (current === 0 ? 'Open circuit, no current flows.' : ((isShort ? 'Short circuit! ' : '') + 'Total resistance ' + totalR.toFixed(1) + ' ohms, current ' + current.toFixed(3) + ' amps.')),
                  onChange: function(e) { upd('voltage', parseFloat(e.target.value)); },
                  className: 'flex-1 accent-yellow-500 bg-slate-800 rounded-lg h-1.5 appearance-none cursor-pointer'
                }),
                h('span', { className: 'font-bold text-yellow-500 w-12 text-right font-mono' }, voltage + 'V')
              ),

              // Component editor list
              components.length > 0 && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                components.map(function(comp, i) {
                  var compIcon = getCompIcon(comp.type);
                  var compLabel = getCompLabel(comp);

                  return h('div', { key: comp.id, className: 'flex items-center gap-2 bg-slate-950/60 rounded-lg px-3 py-2 border border-slate-800/80 hover:border-slate-700 transition-all' },
                    h('span', { className: 'text-base' }, compIcon),
                    h('span', { className: 'text-xs font-bold text-slate-300 min-w-[50px] truncate' }, compLabel),

                    // Resistor/Bulb value input
                    (comp.type === 'resistor' || comp.type === 'bulb') && h('input', {
                      type: 'number', min: 1, max: 10000, value: comp.value,
                      'aria-label': compLabel + ' resistance in ohms',
                      onChange: function(e) {
                        var val = parseInt(e.target.value) || 1;
                        var newComps = components.map(function(c, j) {
                          if (j === i) return Object.assign({}, c, { value: val });
                          return c;
                        });
                        upd('components', newComps);
                      },
                      onKeyDown: function(e) {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          var val = Math.min(comp.value + 10, 10000);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' ohms');
                        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          var val = Math.max(comp.value - 10, 1);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' ohms');
                        }
                      },
                      className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono bg-slate-900 border-slate-800 text-slate-100 focus:ring-1 focus:ring-yellow-500 focus:outline-none'
                    }),
                    (comp.type === 'resistor' || comp.type === 'bulb') && h('span', { className: 'text-xs text-slate-400' }, '\u03A9'),

                    // Capacitor value input (in uF)
                    comp.type === 'capacitor' && h('input', {
                      type: 'number', min: 1, max: 10000, value: comp.value,
                      'aria-label': compLabel + ' capacitance in microfarads',
                      onChange: function(e) {
                        var val = parseInt(e.target.value) || 1;
                        var newComps = components.map(function(c, j) {
                          if (j === i) return Object.assign({}, c, { value: val });
                          return c;
                        });
                        upd('components', newComps);
                      },
                      onKeyDown: function(e) {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          var val = Math.min(comp.value + 10, 10000);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' microfarads');
                        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          var val = Math.max(comp.value - 10, 1);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' microfarads');
                        }
                      },
                      className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono bg-slate-900 border-slate-800 text-slate-100 focus:ring-1 focus:ring-yellow-500 focus:outline-none'
                    }),
                    comp.type === 'capacitor' && h('span', { className: 'text-xs text-slate-400' }, '\u00B5F'),

                    // Switch toggle button
                    comp.type === 'switch' && h('button', { 'aria-label': __alloT('stem.circuit.aria_toggle_switch', 'Toggle Switch'),
                      onClick: function() { toggleSwitch(comp.id); },
                      className: 'px-2 py-1 text-xs font-bold rounded border transition-all ' + (comp.closed ? 'transition-colors bg-emerald-950/30 text-emerald-400 border-emerald-800 hover:bg-emerald-900/40 active:scale-[0.97]' : 'transition-colors bg-red-950/30 text-red-400 border-red-800 hover:bg-red-900/40 active:scale-[0.97]')
                    }, comp.closed ? __alloT('stem.circuit.btn_close', 'Close') : __alloT('stem.circuit.btn_open', 'Open')),

                    // LED color cycle button
                    comp.type === 'led' && h('button', { 'aria-label': __alloT('stem.circuit.aria_cycle_led_color', 'Cycle LED Color'),
                      onClick: function() { cycleLedColor(comp.id); },
                      className: 'w-8 h-8 rounded-full border-2 border-slate-700 hover:scale-110 transition-transform',
                      style: { backgroundColor: comp.ledColor || '#ef4444' }
                    }),

                    // Remove button
                    h('button', { 'aria-label': __alloT('stem.circuit.aria_remove_component', 'Remove Component'),
                      onClick: function() { removeComponent(i); },
                      className: 'transition-colors text-slate-500 hover:text-red-400 ml-auto font-bold text-lg px-1 tracking-tight'
                    }, '\u00D7')
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Readout cards (4 metrics)
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2', role: 'status', 'aria-live': 'polite' },
              [
                { label: __alloT('stem.circuit.readout_mode', 'Mode'), val: mode, color: 'slate', icon: mode === 'series' ? '\u2192' : '\u2261', textCls: 'text-slate-400', valCls: 'text-slate-200', borderCls: 'border-slate-800 bg-slate-900/40' },
                { label: __alloT('stem.circuit.readout_resistance', 'Resistance'), val: totalR >= 1e8 ? '\u221E' : totalR.toFixed(1) + '\u03A9', color: 'yellow', icon: '\u2AE8', textCls: 'text-yellow-400/80', valCls: 'text-yellow-400', borderCls: 'border-yellow-500/20 bg-yellow-950/10' },
                { label: __alloT('stem.circuit.stat_current', 'Current'), val: current.toFixed(3) + 'A', color: 'blue', icon: '\u26A1', textCls: 'text-blue-400/80', valCls: 'text-blue-400', borderCls: 'border-blue-500/20 bg-blue-950/10' },
                { label: __alloT('stem.circuit.readout_power', 'Power'), val: power.toFixed(2) + 'W', color: 'red', icon: '\uD83D\uDD25', textCls: 'text-rose-400/80', valCls: 'text-rose-400', borderCls: 'border-rose-500/20 bg-rose-950/10' }
              ].map(function(m) {
                var isSh = isShort && m.label !== __alloT('stem.circuit.readout_mode', 'Mode');
                return h('div', {
                  key: m.label,
                  className: 'text-center p-3 rounded-xl border backdrop-blur-sm transition-all ' + (isSh ? 'bg-red-950/20 border-red-500/40 short-active-flash' : m.borderCls)
                },
                  h('p', { className: 'text-[10px] font-bold uppercase tracking-wider mb-1 ' + (isSh ? 'text-red-400' : m.textCls) }, m.icon + ' ' + m.label),
                  h('p', { className: 'text-sm font-black font-mono ' + (isSh ? 'text-red-300' : m.valCls) }, m.val)
                );
              })
            ),

            (hasAmmeter || hasVoltmeter) && h('section', {
              className: 'mt-3 rounded-xl border p-3 ' + (meterIssue ? 'bg-red-950/20 border-red-500/40' : 'bg-emerald-950/20 border-emerald-500/30'),
              'aria-labelledby': 'circuitMeterCoachTitle',
              'data-circuit-meter-coach': meterIssue || 'correct'
            },
              h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[10px] font-bold uppercase tracking-wider ' + (meterIssue ? 'text-red-400' : 'text-emerald-400') }, __alloT('stem.circuit.meter_safety_coach', 'Meter Safety Coach')),
                  h('h4', { id: 'circuitMeterCoachTitle', className: 'text-sm font-black ' + (meterIssue ? 'text-red-200' : 'text-emerald-200') }, meterStatus)
                ),
                h('span', {
                  className: 'px-2 py-1 rounded text-[10px] font-bold border ' + (meterIssue ? 'text-red-200 border-red-500/40' : 'text-emerald-200 border-emerald-500/40'),
                  role: 'status',
                  'aria-live': 'polite'
                }, meterIssue ? __alloT('stem.circuit.fix_placement', 'Fix placement') : __alloT('stem.circuit.connected_correctly', 'Connected correctly'))
              ),
              h('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-300' }, meterGuidance),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[10px]' },
                h('div', { className: 'border-l-2 border-cyan-500 pl-2' },
                  h('strong', { className: 'block text-cyan-300' }, __alloT('stem.circuit.ammeter_rule', 'Ammeter rule')),
                  h('span', { className: 'text-slate-400' }, __alloT('stem.circuit.ammeter_rule_desc', 'Series connection; very low internal resistance.'))
                ),
                h('div', { className: 'border-l-2 border-yellow-500 pl-2' },
                  h('strong', { className: 'block text-yellow-300' }, __alloT('stem.circuit.voltmeter_rule', 'Voltmeter rule')),
                  h('span', { className: 'text-slate-400' }, __alloT('stem.circuit.voltmeter_rule_desc', 'Parallel connection; very high internal resistance.'))
                )
              )
            ),

            // Ohm's-law I-V characteristic — current vs voltage is a line through the origin (slope 1/R).
            current > 0 && totalR < 1e8 && (function() {
              var Vmax = Math.max(voltage * 1.5, voltage + 1), Imax = Vmax / totalR;
              var W = 300, H = 130, pl = 38, pb = 22, pt = 10, pr = 10;
              var sx = function(v) { return pl + (v / Vmax) * (W - pl - pr); };
              var sy = function(i) { return pt + (1 - i / Imax) * (H - pt - pb); };
              return h('div', { className: 'mt-3 bg-slate-900/40 border border-blue-500/20 rounded-xl p-3' },
                h('p', { className: 'text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1' }, "⚡ " + __alloT('stem.circuit.ohm_iv_title', "Ohm's law: I–V characteristic")),
                h('p', { className: 'text-[10px] text-slate-400 mb-2' }, __alloT('stem.circuit.ohm_iv_desc', 'For a fixed resistance, current rises in a straight line with voltage (slope = 1/R). Steeper = lower resistance.')),
                h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Current versus voltage is a straight line through the origin; at ' + voltage + ' volts the current is ' + current.toFixed(3) + ' amps.' },
                  h('line', { x1: pl, y1: pt, x2: pl, y2: H - pb, stroke: '#334155', strokeWidth: 1 }),
                  h('line', { x1: pl, y1: H - pb, x2: W - pr, y2: H - pb, stroke: '#334155', strokeWidth: 1 }),
                  h('line', { x1: sx(0), y1: sy(0), x2: sx(Vmax), y2: sy(Imax), stroke: '#3b82f6', strokeWidth: 2 }),
                  h('line', { x1: sx(voltage), y1: sy(0), x2: sx(voltage), y2: sy(current), stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 2' }),
                  h('line', { x1: sx(0), y1: sy(current), x2: sx(voltage), y2: sy(current), stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 2' }),
                  h('circle', { cx: sx(voltage), cy: sy(current), r: 4, fill: '#60a5fa', stroke: '#0f172a', strokeWidth: 1 }),
                  h('text', { x: sx(voltage) - 4, y: sy(current) - 4, textAnchor: 'end', fontSize: 8, fill: '#93c5fd', fontWeight: 'bold' }, voltage + 'V, ' + current.toFixed(2) + 'A'),
                  h('text', { x: (pl + W - pr) / 2, y: H - 4, textAnchor: 'middle', fontSize: 8, fill: '#94a3b8' }, __alloT('stem.circuit.axis_voltage', 'Voltage (V) →')),
                  h('text', { x: 8, y: pt + 6, fontSize: 8, fill: '#94a3b8' }, 'I (A)')
                )
              );
            })(),
            // ══════════════════════════════════════
            // Per-component analysis table
            // ══════════════════════════════════════
            components.length > 0 && !noLoadPath && h('div', { className: 'mt-3 bg-slate-900/40 border border-cyan-500/20 rounded-xl p-3 backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5' }, '\uD83E\uDDE0 ' + __alloT('stem.circuit.mental_model_checks', 'Mental-model checks')),
              h('ul', { className: 'space-y-1 text-[11px] text-slate-300 leading-snug list-disc list-inside marker:text-cyan-500' },
                h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_electrons_bold', 'Electrons crawl; the signal races. ')), __alloT('stem.circuit.mmc_electrons_body', 'The glowing dots move fast for visibility, but real electrons drift at only about 0.1 mm/s. The electric field that pushes them travels near light speed, so every bulb lights essentially the instant you connect the battery.')),
                mode === 'series'
                  ? h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_series_bold', 'Current is not used up. ')), 'The very same ' + current.toFixed(3) + ' A flows through every component in series \u2014 an ammeter reads the same value before AND after each bulb. Energy gets spent along the way; charge does not.')
                  : h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_parallel_bold', 'A parallel branch LOWERS total resistance. ')), 'Adding paths gives charge more ways to flow, so total current rises. Total R (' + (totalR >= 1e8 ? '\u221E' : totalR.toFixed(1) + '\u03A9') + ') is always smaller than the smallest single branch \u2014 counter-intuitive but true.'),
                h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_battery_bold', 'The battery sets voltage, not current. ')), 'It holds ' + voltage + ' V steady; the ' + current.toFixed(3) + ' A you read is whatever Ohm\'s law gives for the resistance you built. Lower the resistance and the current climbs \u2014 the battery does not "decide" the current.')
              )
            ),

            // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
            // Per-component analysis table
            // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
            components.length > 0 && h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-yellow-500 uppercase tracking-wider mb-2' }, '\u26A1 ' + __alloT('stem.circuit.per_component_analysis', 'Per-Component Analysis')),
              h('div', { className: 'space-y-1.5' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compI = mode === 'series' ? current : voltage / compR;
                  var compV = mode === 'series' ? current * compR : voltage;
                  var compP = compV * compI;
                  var isIdealParallelBranch = mode === 'parallel' && compR < 0.01; // ammeter / closed switch as its own branch reads a meaningless ~V/0 current
                  var typeIcon = comp.type === 'resistor' ? '\u2AE8 R' : comp.type === 'bulb' ? '\uD83D\uDCA1 B' : comp.type === 'switch' ? '\uD83D\uDD18 S' : comp.type === 'led' ? '\uD83D\uDD34 L' : comp.type === 'ammeter' ? '\u26A1 A' : comp.type === 'voltmeter' ? '\uD83D\uDD0B V' : '\u2E28 C';
                  var rDisplay = comp.type === 'switch' ? (comp.closed ? '~0\u03A9' : '\u221E') : comp.type === 'ammeter' ? '~0\u03A9' : comp.type === 'voltmeter' ? '\u221E' : comp.type === 'led' ? '~40\u03A9' : comp.type === 'capacitor' ? '\u221E' : comp.value + '\u03A9';

                  return h('div', { key: comp.id, className: 'flex items-center gap-2 text-xs bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-800/60' },
                    h('span', { className: 'font-bold text-yellow-500 w-16' }, typeIcon + (i + 1)),
                    h('span', { className: 'text-slate-400 w-20 font-mono' }, rDisplay),

                    comp.type === 'ammeter'
                      ? h('span', { className: 'text-cyan-400 w-40 font-mono font-bold' }, isIdealParallelBranch ? '\u26A0 ' + __alloT('stem.circuit.connect_ammeters_series', 'connect ammeters in series') : '\u27A1 ' + compI.toFixed(3) + 'A (reads current)')
                      : comp.type === 'voltmeter'
                      ? h('span', { className: 'text-yellow-400 w-40 font-mono font-bold' }, mode === 'series' ? '\u26A0 ' + __alloT('stem.circuit.connect_voltmeters_parallel', 'connect voltmeters in parallel') : '\u27A1 ' + voltage.toFixed(1) + 'V (reads voltage)')
                      : isIdealParallelBranch ? h('span', { className: 'text-red-400 w-40 font-mono font-bold' }, '\u26A0 ' + __alloT('stem.circuit.short_branch', 'short branch (~0 \u03A9)')) : h(React.Fragment, null,
                          h('span', { className: 'text-cyan-400 w-20 font-mono' }, compV.toFixed(2) + 'V'),
                          h('span', { className: 'text-emerald-400 w-20 font-mono' }, compI.toFixed(3) + 'A'),
                          h('span', { className: 'text-rose-400 w-20 font-mono font-bold' }, compP.toFixed(2) + 'W')
                        ),

                    comp.type === 'bulb' && h('span', { className: 'text-yellow-400 ml-auto' }, compP > 10 ? '\uD83D\uDD06' : compP > 3 ? '\uD83D\uDCA1' : '\uD83D\uDD05'),
                    comp.type === 'switch' && h('span', { className: 'ml-auto ' + (comp.closed ? 'text-emerald-400' : 'text-red-400') }, comp.closed ? '\u2705 ' + __alloT('stem.circuit.status_closed', 'Closed') : '\u274C ' + __alloT('stem.circuit.status_open', 'Open')),
                    comp.type === 'led' && h('span', { className: 'ml-auto', style: { color: comp.ledColor || '#ef4444' } }, compI > 0.005 ? '\u2B50 ' + __alloT('stem.circuit.status_lit', 'Lit') : '\u26AB ' + __alloT('stem.circuit.status_off', 'Off')),
                    comp.type === 'capacitor' && h('span', { className: 'text-sky-400 ml-auto font-mono text-[10px]' }, comp.value + '\u00B5F (blocks DC)')
                  );
                })
              ),

              // Formula reminder
              h('div', { className: 'mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-medium' },
                h('span', null, '\u2696 V = IR'),
                h('span', null, '\u2022'),
                h('span', null, 'P = IV'),
                h('span', null, '\u2022'),
                h('span', null, mode === 'series' ? __alloT('stem.circuit.formula_series_note', 'Series: same current through all') : __alloT('stem.circuit.formula_parallel_note', 'Parallel: same voltage across all'))
              )
            ),

            // ══════════════════════════════════════
            // Energy budget — where the battery's power goes (P = ΣI²R)
            // ══════════════════════════════════════
            current > 0.001 && !isShort && !noLoadPath && (function() {
              // Power delivered by the battery is shared out among the loads. In series each
              // dissipates I²R; in parallel each dissipates V²/R. They must sum to VI — energy
              // is conserved, which is the whole point of the panel.
              var loads = components.filter(function(c) { return c.type !== 'ammeter' && c.type !== 'voltmeter' && c.type !== 'capacitor'; });
              var segs = loads.map(function(c) {
                var r = getCompR(c);
                var p = mode === 'series' ? (current * current * r) : (voltage * voltage / (r || 1));
                var name = c.type === 'resistor' ? 'Resistor ' + c.value + 'Ω' : c.type === 'bulb' ? 'Bulb ' + c.value + 'Ω' : c.type === 'led' ? __alloT('stem.circuit.comp_led', 'LED') : c.type;
                var col = c.type === 'bulb' ? '#f59e0b' : c.type === 'led' ? (c.ledColor || '#ef4444') : c.type === 'switch' ? '#10b981' : '#eab308';
                return { name: name, p: p, col: col, type: c.type };
              }).filter(function(s) { return s.p > 1e-6; });
              var totP = segs.reduce(function(a, s) { return a + s.p; }, 0) || power || 1e-6;
              // Real-world equivalence for the delivered power
              var eq = power < 0.05 ? 'about a digital watch (' + (power * 1000).toFixed(0) + ' mW)'
                : power < 0.5 ? __alloT('stem.circuit.eq_hearing_aid', 'a hearing-aid battery load')
                : power < 3 ? __alloT('stem.circuit.eq_led_nightlight', 'a small LED night-light')
                : power < 10 ? __alloT('stem.circuit.eq_phone_charger', 'a phone fast-charger')
                : power < 40 ? __alloT('stem.circuit.eq_desk_lamp', 'a bright desk lamp')
                : power < 100 ? __alloT('stem.circuit.eq_laptop', 'a laptop under load')
                : __alloT('stem.circuit.eq_appliance', 'a household appliance');
              return h('div', { className: 'circuit-card mt-4 bg-slate-900/40 border border-rose-500/25 rounded-xl p-4 backdrop-blur-md' },
                h('p', { className: 'text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1' }, '🔥 ' + __alloT('stem.circuit.energy_budget_title', 'Energy budget — where the power goes')),
                h('p', { className: 'text-[11px] text-slate-400 mb-2 leading-snug' },
                  __alloT('stem.circuit.energy_budget_intro', 'The battery pours out '), h('b', { className: 'text-rose-300' }, 'P = V×I = ' + power.toFixed(2) + ' W'),
                  ' (like ' + eq + '). Every load turns its share into heat or light — and the shares must add back up to the total. Energy is never destroyed, only spent.'),
                // Segmented power bar
                h('div', { className: 'flex w-full h-7 rounded-lg overflow-hidden border border-slate-700', role: 'img', 'aria-label': 'Power split: ' + segs.map(function(s){ return s.name + ' ' + (s.p/totP*100).toFixed(0) + ' percent'; }).join(', ') },
                  segs.length === 0 ? h('div', { className: 'flex-1 flex items-center justify-center text-[10px] text-slate-500' }, __alloT('stem.circuit.no_dissipating_load', 'no dissipating load'))
                  : segs.map(function(s, i) {
                      var pct = s.p / totP * 100;
                      return h('div', { key: i, style: { width: pct + '%', background: s.col + '33', borderRight: i < segs.length - 1 ? '1px solid rgba(15,23,42,0.6)' : 'none' }, className: 'flex flex-col items-center justify-center overflow-hidden' },
                        pct > 12 && h('span', { className: 'text-[10px] font-black leading-none', style: { color: s.col } }, s.p.toFixed(2) + 'W'),
                        pct > 20 && h('span', { className: 'text-[8px] text-slate-400 leading-none mt-0.5 truncate px-1', style: { maxWidth: '100%' } }, s.name)
                      );
                    })
                ),
                h('div', { className: 'flex justify-between mt-1.5 text-[10px]' },
                  h('span', { className: 'text-slate-500' }, mode === 'series' ? __alloT('stem.circuit.dissipate_series_note', 'Biggest resistor dissipates the most (P = I²R, same I)') : __alloT('stem.circuit.dissipate_parallel_note', 'Smallest resistor dissipates the most (P = V²/R, same V)')),
                  h('span', { className: 'font-mono font-bold text-rose-300' }, 'Σ = ' + totP.toFixed(2) + ' W')
                )
              );
            })(),

            // ══════════════════════════════════════
            // Drift vs. field — the great circuit paradox (made visible)
            // ══════════════════════════════════════
            current > 0.001 && !isShort && !noLoadPath && (function() {
              // Honest physics: v_drift = I / (n·A·e) for copper, assuming a 1 mm² wire.
              // n = 8.5e28 free electrons/m³, e = 1.602e-19 C, A = 1e-6 m².
              var vDrift = current / (8.5e28 * 1e-6 * 1.602e-19); // m/s
              var vDriftMm = vDrift * 1000; // mm/s
              // Time for ONE electron to drift 1 m:
              var driftSecs = 1 / vDrift;
              var driftTime = driftSecs > 3600 ? (driftSecs / 3600).toFixed(1) + ' hours'
                : driftSecs > 60 ? (driftSecs / 60).toFixed(0) + ' minutes'
                : driftSecs.toFixed(0) + ' seconds';
              // Field/signal in copper ≈ 2/3 c → time to cross 1 m:
              var signalSecs = 1 / (2e8);
              var reduced = _prefersReducedMotion;
              function lane(y, label, sub) {
                return h('g', null,
                  h('text', { x: 4, y: y - 12, fontSize: 9, fontWeight: 700, fill: '#cbd5e1' }, label),
                  h('text', { x: 356, y: y - 12, fontSize: 8, fill: '#64748b', textAnchor: 'end' }, sub),
                  h('rect', { x: 4, y: y - 8, width: 352, height: 16, rx: 8, fill: 'rgba(15,23,42,0.7)', stroke: 'rgba(100,116,139,0.4)' })
                );
              }
              return h('div', { className: 'circuit-card mt-4 bg-gradient-to-br from-slate-900 to-blue-950/40 border border-cyan-500/25 rounded-xl p-4 backdrop-blur-md' },
                h('p', { className: 'text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1' }, '🐌⚡ ' + __alloT('stem.circuit.paradox_title', 'The paradox: electrons crawl, the signal races')),
                h('p', { className: 'text-[11px] text-slate-400 mb-2 leading-snug' }, __alloT('stem.circuit.paradox_body', 'The blue dots in the schematic move fast so you can see them — but real electrons barely creep. So why does the bulb light instantly? Because flipping the switch launches an electric field down the wire at nearly light speed, nudging every electron at once.')),
                h('svg', { viewBox: '0 0 360 120', width: '100%', role: 'img', 'aria-label': __alloT('stem.circuit.aria_paradox_svg', 'Two wires. In the top wire the electric field pulse races across almost instantly. In the bottom wire individual electrons drift very slowly.') },
                  lane(32, '⚡ ' + __alloT('stem.circuit.lane_field_label', 'Electric field / signal'), '≈ 200,000 km/s'),
                  // fast signal pulse
                  h('g', { className: reduced ? '' : 'circ-signal-pulse' },
                    h('rect', { x: 4, y: 24, width: 16, height: 16, rx: 8, fill: '#22d3ee', opacity: 0.9, filter: 'drop-shadow(0 0 5px #22d3ee)' })
                  ),
                  lane(84, '🔵 ' + __alloT('stem.circuit.lane_electrons_label', 'Actual electrons'), '≈ ' + (vDriftMm < 0.1 ? vDriftMm.toFixed(3) : vDriftMm.toFixed(2)) + ' mm/s'),
                  // slow drifting electrons
                  [0, 1, 2, 3, 4, 5].map(function(k) {
                    return h('g', { key: k, className: reduced ? '' : 'circ-electron-drift', style: reduced ? {} : { animationDelay: (-k * 1.0) + 's' } },
                      h('circle', { cx: 12 + k * 52, cy: 84, r: 3.5, fill: '#60a5fa', opacity: 0.9 })
                    );
                  })
                ),
                h('div', { className: 'grid grid-cols-2 gap-2 mt-1' },
                  h('div', { className: 'bg-cyan-950/30 border border-cyan-500/20 rounded-lg p-2 text-center' },
                    h('p', { className: 'text-[10px] uppercase tracking-wider text-cyan-500/80 font-bold' }, __alloT('stem.circuit.signal_crosses_label', 'Signal crosses 1 m in')),
                    h('p', { className: 'text-sm font-black font-mono text-cyan-300' }, '~5 nanoseconds')
                  ),
                  h('div', { className: 'bg-blue-950/30 border border-blue-500/20 rounded-lg p-2 text-center' },
                    h('p', { className: 'text-[10px] uppercase tracking-wider text-blue-400/80 font-bold' }, __alloT('stem.circuit.electron_crosses_label', 'One electron crosses 1 m in')),
                    h('p', { className: 'text-sm font-black font-mono text-blue-300' }, '~' + driftTime)
                  )
                ),
                h('p', { className: 'text-[10px] text-slate-500 italic mt-1.5 leading-snug' }, 'Drift speed computed from your ' + current.toFixed(3) + ' A through an assumed 1 mm² copper wire (v = I ÷ n·A·e). Turn up the voltage and the electrons speed up — but they never come close to the signal.')
              );
            })(),

            // ══════════════════════════════════════
            // How big is your current? — log-scale real-world ladder
            // ══════════════════════════════════════
            current > 0.0005 && !isShort && (function() {
              // Log10 scale from 1 µA (1e-6 A) to 100 kA (1e5 A).
              var lo = -6, hi = 5;
              var frac = function(amps) { return Math.max(0, Math.min(1, (Math.log(Math.max(amps, 1e-7)) / Math.LN10 - lo) / (hi - lo))); };
              var marks = [
                { a: 0.00002, label: 'nerve impulse' },
                { a: 0.02, label: 'LED' },
                { a: 2, label: 'phone charger' },
                { a: 15, label: 'wall outlet trips' },
                { a: 200, label: 'car starter' },
                { a: 30000, label: 'lightning bolt' }
              ];
              return h('div', { className: 'circuit-card mt-4 bg-slate-900/40 border border-amber-500/25 rounded-xl p-4 backdrop-blur-md' },
                h('p', { className: 'text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1' }, '📏 How big is ' + current.toFixed(3) + ' A, really?'),
                h('p', { className: 'text-[11px] text-slate-400 mb-3 leading-snug' }, 'Current spans an enormous range — this ladder is logarithmic (each step is 10× bigger). Your circuit sits here compared with things you know.'),
                h('svg', { viewBox: '0 0 360 78', width: '100%', role: 'img', 'aria-label': 'Logarithmic current ladder from a microamp to 100 kiloamps. Your circuit draws ' + current.toFixed(3) + ' amps, between ' + (function(){ var below=marks[0].label; marks.forEach(function(m){ if (m.a <= current) below = m.label; }); return below; })() + ' and larger loads.' },
                  h('defs', null,
                    h('linearGradient', { id: 'circAmpGrad', x1: 0, y1: 0, x2: 1, y2: 0 },
                      h('stop', { offset: '0%', stopColor: '#0891b2' }),
                      h('stop', { offset: '50%', stopColor: '#eab308' }),
                      h('stop', { offset: '100%', stopColor: '#ef4444' }))),
                  h('rect', { x: 6, y: 30, width: 348, height: 8, rx: 4, fill: 'url(#circAmpGrad)', opacity: 0.65 }),
                  marks.map(function(m, i) {
                    var x = 6 + frac(m.a) * 348;
                    return h('g', { key: i },
                      h('line', { x1: x, y1: 27, x2: x, y2: 41, stroke: '#475569', strokeWidth: 1 }),
                      h('text', { x: x, y: 54, fontSize: 7.5, fill: '#94a3b8', textAnchor: i === 0 ? 'start' : i === marks.length - 1 ? 'end' : 'middle' }, m.label),
                      h('text', { x: x, y: 64, fontSize: 6.5, fill: '#64748b', textAnchor: i === 0 ? 'start' : i === marks.length - 1 ? 'end' : 'middle' }, m.a >= 1000 ? (m.a / 1000) + 'kA' : m.a >= 1 ? m.a + 'A' : (m.a * 1000) + 'mA')
                    );
                  }),
                  // "you are here" pointer
                  (function() {
                    var x = 6 + frac(current) * 348;
                    return h('g', null,
                      h('polygon', { points: (x - 5) + ',18 ' + (x + 5) + ',18 ' + x + ',27', fill: '#f43f5e' }),
                      h('circle', { cx: x, cy: 34, r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 1.2 }),
                      h('text', { x: x, y: 13, fontSize: 8, fontWeight: 800, fill: '#fb7185', textAnchor: 'middle' }, 'your circuit')
                    );
                  })()
                )
              );
            })(),

            // ══════════════════════════════════════
            // KVL Verification (g68 / g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && components.length > 0 && mode === 'series' && current > 0.001 && h('div', { className: 'mt-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2' }, '\u2696 ' + __alloT('stem.circuit.kvl_title', 'Kirchhoff\'s Voltage Law (KVL) Verification')),
              h('p', { className: 'text-xs text-slate-300 mb-2' }, __alloT('stem.circuit.kvl_desc', 'The sum of voltage drops around any closed loop equals the source voltage. The same current flows through every series component, so this isn\'t a lucky coincidence — Ohm\'s law forces it to balance.')),
              h('div', { className: 'space-y-1' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compV = current * compR;
                  if (comp.type === 'ammeter' || comp.type === 'voltmeter') return null;
                  return h('div', { key: comp.id, className: 'flex items-center gap-2 text-xs font-mono text-slate-400' },
                    h('span', null, 'V' + (i + 1) + ' = I \u00D7 R = ' + current.toFixed(3) + ' \u00D7 ' + compR.toFixed(1) + ' = ' + compV.toFixed(2) + 'V')
                  );
                }),
                h('div', { className: 'border-t border-indigo-500/20 mt-2 pt-2' },
                  (function() {
                    var vSum = 0;
                    components.forEach(function(comp) {
                      if (comp.type !== 'ammeter' && comp.type !== 'voltmeter') {
                        vSum += current * getCompR(comp);
                      }
                    });
                    return h('div', { className: 'flex items-center gap-2 text-xs font-bold' },
                      h('span', { className: 'text-indigo-300' }, '\u2211 V_drops = ' + vSum.toFixed(2) + 'V'),
                      h('span', { className: 'text-indigo-400' }, '\u2248'),
                      h('span', { className: 'text-indigo-300' }, 'V_source = ' + voltage + 'V'),
                      h('span', { className: Math.abs(vSum - voltage) < 0.1 ? 'text-emerald-400' : 'text-rose-400' }, Math.abs(vSum - voltage) < 0.1 ? '\u2713 ' + __alloT('stem.circuit.must_balance', 'must balance: \u03A3V = I\u00D7\u03A3R = V') : '\u26A0\uFE0F')
                    );
                  })()
                )
              )
            ),

            // ══════════════════════════════════════
            // Open/Short circuit warnings
            // ══════════════════════════════════════
            isOpen && h('div', { role: 'alert', className: 'mt-4 bg-amber-950/20 rounded-xl border border-amber-500/40 p-4 text-center' },
              h('p', { className: 'text-base font-black text-amber-400' }, '\uD83D\uDD13 ' + __alloT('stem.circuit.circuit_open_title', 'CIRCUIT OPEN')),
              h('p', { className: 'text-xs text-amber-500/90 mt-1' }, __alloT('stem.circuit.circuit_open_desc', 'A switch is open - no current flows. Close all switches to complete the circuit.'))
            ),

            isShort && h('div', { role: 'alert', className: 'mt-4 bg-red-950/30 rounded-xl border border-red-500/40 p-4 text-center short-active-flash' },
              h('p', { className: 'text-base font-black text-red-400' }, '\u26A0\uFE0F ' + __alloT('stem.circuit.short_circuit_detected_title', 'SHORT CIRCUIT DETECTED')),
              h('p', { className: 'text-xs text-red-400/90 mt-1' }, __alloT('stem.circuit.short_circuit_detected_desc', 'Total resistance is below 1\u03A9! In real life, this could damage components or cause a fire. Add more resistance.'))
            ),

            // ══════════════════════════════════════
            // Circuit Presets
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('button', { 'aria-label': __alloT('stem.circuit.circuit_presets', 'Circuit Presets'), 'aria-expanded': showPresets,
                onClick: function() { upd('showPresets', !showPresets); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[11px] font-bold text-slate-300 uppercase tracking-wider' }, '\uD83D\uDCCB ' + __alloT('stem.circuit.circuit_presets', 'Circuit Presets')),
                h('span', { className: 'ml-auto text-slate-400 text-xs' }, showPresets ? '\u25B2' : '\u25BC')
              ),
              showPresets && h('div', { className: 'flex flex-wrap gap-2 mt-3' },
                CIRCUIT_PRESETS.map(function(preset) {
                  return h('button', { 'aria-label': __alloT('stem.circuit.aria_load_preset', 'Load Preset'),
                    key: preset.id,
                    onClick: function() { loadPreset(preset); },
                    className: 'px-3 py-2 rounded-lg text-xs border border-slate-800 bg-slate-950/60 hover:bg-slate-800 transition-all text-left w-full sm:w-auto active:scale-[0.97]',
                    title: __alloT('stem.circuit.' + (preset.id) + '_desc', preset.desc)
                  },
                    h('span', { className: 'font-bold text-slate-200 block' }, preset.label),
                    h('span', { className: 'text-[10px] text-slate-400 mt-0.5 block' }, __alloT('stem.circuit.' + (preset.id) + '_desc', preset.desc))
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Circuit Challenges (10)
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-amber-950/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-2' }, '\uD83C\uDFAF ' + __alloT('stem.circuit.circuit_challenges_title', 'Circuit Challenges')),
              h('div', { className: 'flex flex-wrap gap-2' },
                CHALLENGES.map(function(ch, ci) {
                  var actual = ch.type === 'current' ? current : ch.type === 'resistance' ? totalR : power;
                  var close = Math.abs(actual - ch.target) < ch.target * 0.05;

                  return h('button', { key: ci,
                    onClick: function() {
                      if (close) {
                        var newDoneSet = Object.assign({}, challengesDoneSet);
                        if (!newDoneSet[ci]) {
                          newDoneSet[ci] = true;
                          var newDone = Object.keys(newDoneSet).length;
                          updMulti({ challengesDone: newDone, challengesDoneSet: newDoneSet, challenge: ch });
                          circuitSound('challengeComplete');
                          if (typeof addToast === 'function') addToast('\u2705 Challenge complete! You hit ' + actual.toFixed(3) + ch.unit + ' (target: ' + ch.target + ch.unit + ')', 'success');
                          if (typeof awardXP === 'function') awardXP('circuitChallenge', 10, ch.label);
                          checkBadges(getBadgeUpdates({ challengesDone: newDone }));
                        } else {
                          if (typeof addToast === 'function') addToast('\u2705 Already completed! ' + actual.toFixed(3) + ch.unit, 'info');
                        }
                      } else {
                        if (typeof addToast === 'function') addToast('\uD83C\uDFAF Target: ' + ch.target + ch.unit + ' | Current: ' + actual.toFixed(3) + ch.unit + '. Adjust components!', 'info');
                        upd('challenge', ch);
                      }
                    },
                    className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ' + (close ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40 shadow-sm' : challengesDoneSet[ci] ? 'bg-emerald-950/20 text-emerald-400/80 border-emerald-700' : 'transition-colors bg-slate-900 border-slate-800 text-amber-500 hover:bg-slate-800 active:scale-[0.97]')
                  }, (close || challengesDoneSet[ci] ? '\u2705 ' : '\uD83C\uDFAF ') + ch.label);
                })
              )
            ),

            // ══════════════════════════════════════
            // Ohm's Law Quiz
            // ══════════════════════════════════════
            (function() {
              return h('div', { className: 'mt-4 bg-blue-950/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-md' },
                h('div', { className: 'flex items-center gap-2 mb-3' },
                  h('button', { onClick: function() { var q = makeOhmQuestion(); upd('ohmQuiz', q); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (ohmQuiz ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-[0.97]')
                  }, ohmQuiz ? '\uD83D\uDD04 ' + __alloT('stem.circuit.next_question', 'Next Question') : '\u26A1 ' + __alloT('stem.circuit.ohm_law_quiz', 'Ohm\'s Law Quiz')),
                  ohmScore > 0 && h('span', { className: 'text-xs font-bold text-emerald-400' }, '\u2B50 ' + ohmScore + ' correct'),
                  ohmStreak > 1 && h('span', { className: 'text-xs font-bold text-orange-400 animate-pulse' }, '\uD83D\uDD25 ' + ohmStreak + ' streak')
                ),

                // Unanswered question
                ohmQuiz && !ohmQuiz.answered && h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-blue-900/50' },
                  h('p', { className: 'text-sm font-bold text-blue-200 mb-3' }, ohmQuiz.text),
                  h('div', { className: 'grid grid-cols-2 gap-2' },
                    ohmQuiz.opts.map(function(opt, oi) {
                      return h('button', { key: oi,
                        onClick: function() {
                          var correct = Math.abs(opt - ohmQuiz.answer) < 0.01;
                          var newScore = ohmScore + (correct ? 1 : 0);
                          var newStreak = correct ? ohmStreak + 1 : 0;
                          updMulti({
                            ohmQuiz: Object.assign({}, ohmQuiz, { answered: true, chosen: opt }),
                            ohmScore: newScore,
                            ohmStreak: newStreak
                          });
                          if (correct) {
                            circuitSound('correct');
                            if (typeof addToast === 'function') addToast('\u26A1 Correct! ' + ohmQuiz.formula, 'success');
                            if (typeof awardXP === 'function') awardXP('circuit', 10, 'Ohm\'s Law Quiz');
                          } else {
                            circuitSound('wrong');
                            if (typeof addToast === 'function') addToast('\u274C ' + ohmQuiz.formula, 'error');
                          }
                          checkBadges(getBadgeUpdates({ quizScore: newScore, quizStreak: newStreak }));
                        },
                        className: 'px-3 py-2 rounded-lg text-xs font-bold border border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-500 hover:bg-blue-950/30 transition-all active:scale-[0.97]'
                      }, opt + ohmQuiz.unit);
                    })
                  )
                ),

                // Answered question (feedback)
                ohmQuiz && ohmQuiz.answered && h('div', {
                  className: 'p-3 rounded-lg text-sm font-bold ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/20 text-red-400 border border-red-900/30')
                },
                  Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? '\u2705 ' + __alloT('stem.circuit.quiz_correct', 'Correct!') : '\u274C Answer: ' + ohmQuiz.answer + ohmQuiz.unit,
                  h('p', {
                    className: 'text-xs font-normal mt-1 ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'text-emerald-500' : 'text-red-500')
                  }, '\uD83D\uDD0D ' + ohmQuiz.formula)
                )
              );
            })(),

            // ══════════════════════════════════════
            // Badge panel (collapsible)
            // ══════════════════════════════════════
            showBadges && h('div', { className: 'mt-4 bg-amber-950/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 ' + __alloT('stem.circuit.badges', 'Badges') + ' (' + Object.keys(badges).length + '/' + BADGES.length + ')'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                BADGES.map(function(b) {
                  var earned = badges[b.id];
                  return h('div', {
                    key: b.id,
                    className: 'flex items-center gap-2.5 p-2 rounded-lg border text-xs ' + (earned ? 'bg-slate-950/60 border-amber-500/30 text-amber-300' : 'bg-slate-900/20 border-slate-900 opacity-40')
                  },
                    h('span', { className: 'text-base' }, earned ? b.icon : '\uD83D\uDD12'),
                    h('div', null,
                      h('p', { className: 'font-bold ' + (earned ? 'text-amber-300' : 'text-slate-500') }, b.name),
                      h('p', { className: 'text-[10px] ' + (earned ? 'text-amber-400/80' : 'text-slate-600') }, __alloT('stem.circuit.' + (b.id) + '_desc', b.desc))
                    )
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // AI Tutor panel (collapsible)
            // ══════════════════════════════════════
            showAI && h('div', { className: 'mt-4 bg-blue-950/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2' }, '\uD83E\uDD16 ' + __alloT('stem.circuit.ai_circuit_tutor', 'AI Circuit Tutor')),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  id: 'circuit-ai-question',
                  type: 'text',
                  'aria-label': __alloT('stem.circuit.ai_question_label', 'Question for the AI Circuit Tutor'),
                  placeholder: __alloT('stem.circuit.placeholder_ask', "Ask about circuits, Ohm's Law, components..."),
                  value: aiQuestion,
                  onChange: function(e) { upd('aiQuestion', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') askAI(); },
                  className: 'flex-1 px-3 py-2 text-xs border border-blue-800 bg-slate-950/80 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
                }),
                h('button', { 'aria-label': aiLoading ? __alloT('stem.circuit.aria_ai_thinking', 'AI is thinking') : __alloT('stem.circuit.aria_ask_ai_tutor', 'Ask the AI tutor'), 'aria-busy': aiLoading,
                  onClick: askAI,
                  disabled: aiLoading,
                  className: 'px-4 py-2 text-xs font-bold rounded-lg transition-all ' + (aiLoading ? 'bg-slate-800 text-slate-600' : 'transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/10 active:scale-[0.97]')
                }, aiLoading ? __alloT('stem.circuit.thinking_ellipsis', 'Thinking...') : __alloT('stem.circuit.ask_btn', 'Ask'))
              ),
              aiLoading && h('div', { className: 'mt-2 text-xs text-blue-400 animate-pulse' }, __alloT('stem.circuit.ai_is_thinking', 'AI is thinking...')),
              aiResponse && h('div', { role: 'status', 'aria-live': 'polite', className: 'mt-2 bg-slate-950/80 rounded-lg p-3 border border-blue-900/50 text-xs text-blue-200 whitespace-pre-wrap leading-relaxed' }, aiResponse),
              // Quick-ask suggestions
              h('div', { className: 'flex flex-wrap gap-1.5 mt-2' },
                [__alloT('stem.circuit.qa_ohms_law', "What is Ohm's Law?"), __alloT('stem.circuit.qa_series_parallel', 'Series vs parallel?'), __alloT('stem.circuit.qa_short_circuit', 'What is a short circuit?'), __alloT('stem.circuit.qa_capacitors', 'How do capacitors work?'), __alloT('stem.circuit.qa_ammeter', 'What does an ammeter measure?')].map(function(q) {
                  return h('button', { 'aria-label': __alloT('stem.circuit.aria_ask_question', 'Ask question'),
                    key: q,
                    onClick: function() { updMulti({ aiQuestion: q }); },
                    className: 'px-2.5 py-1 text-[10px] bg-slate-950/60 text-blue-400 border border-blue-900/50 rounded-full hover:bg-blue-950/30 hover:text-blue-300 transition-all active:scale-[0.97]'
                  }, q);
                })
              )
            ),

            // ══════════════════════════════════════
            // Kirchhoff's Laws educational panel (g68/g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && h('div', { className: 'mt-4 bg-violet-950/10 border border-violet-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('button', { 'aria-label': __alloT('stem.circuit.aria_kirchhoff_laws', 'Kirchhoff Laws'), 'aria-expanded': showKirchhoff, onClick: function() { upd('showKirchhoff', !showKirchhoff); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[11px] font-bold text-violet-400 uppercase tracking-wider' }, '\u2696 ' + __alloT('stem.circuit.kirchhoff_laws_title', "Kirchhoff's Laws")),
                h('span', { className: 'ml-auto text-violet-400 text-xs' }, showKirchhoff ? '\u25B2' : '\u25BC')
              ),
              showKirchhoff && h('div', { className: 'mt-3 space-y-3' },
                // KCL
                h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.kcl_title', "Kirchhoff's Current Law (KCL)")),
                  h('p', { className: 'text-xs text-slate-400' }, __alloT('stem.circuit.kcl_desc', 'The total current entering a junction equals the total current leaving that junction.')),
                  h('p', { className: 'text-xs text-violet-400 font-mono mt-1' }, '\u2211 I_in = \u2211 I_out'),
                  mode === 'parallel' && components.length > 0 && h('div', { className: 'mt-2 bg-violet-950/20 rounded p-2 border border-violet-900/30' },
                    h('p', { className: 'text-[10px] font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.your_circuit_label', 'Your circuit:')),
                    h('p', { className: 'text-[10px] text-slate-400 font-mono' }, 'Total current from source: ' + current.toFixed(3) + 'A'),
                    h('p', { className: 'text-[10px] text-slate-400 font-mono mt-0.5' }, 'Branch currents: ' + components.map(function(c, i) {
                      var cR = getCompR(c);
                      var cI = voltage / cR;
                      return 'I' + (i + 1) + '=' + cI.toFixed(3) + 'A';
                    }).join(' + ')),
                    (function() {
                      var branchSum = 0;
                      components.forEach(function(c) { branchSum += voltage / getCompR(c); });
                      return h('p', { className: 'text-[10px] font-bold text-violet-300 font-mono mt-1' }, 'Sum of branch currents: ' + branchSum.toFixed(3) + 'A ' + (Math.abs(branchSum - current) < 0.001 ? '\u2705' : ''));
                    })()
                  )
                ),

                // KVL
                h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.kvl_law_title', "Kirchhoff's Voltage Law (KVL)")),
                  h('p', { className: 'text-xs text-slate-400' }, __alloT('stem.circuit.kvl_law_desc', 'The sum of all voltage drops around any closed loop equals the source voltage (EMF).')),
                  h('p', { className: 'text-xs text-violet-400 font-mono mt-1' }, '\u2211 V_drops = V_source'),
                  mode === 'series' && components.length > 0 && current > 0.001 && h('div', { className: 'mt-2 bg-violet-950/20 rounded p-2 border border-violet-900/30' },
                    h('p', { className: 'text-[10px] font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.your_circuit_label', 'Your circuit:')),
                    components.map(function(c, i) {
                      if (c.type === 'ammeter' || c.type === 'voltmeter') return null;
                      var cR = getCompR(c);
                      var cV = current * cR;
                      return h('p', { key: c.id, className: 'text-[10px] text-slate-400 font-mono' }, 'V' + (i + 1) + ' = ' + current.toFixed(3) + ' \u00D7 ' + cR.toFixed(1) + ' = ' + cV.toFixed(2) + 'V');
                    }),
                    (function() {
                      var vSum = 0;
                      components.forEach(function(c) {
                        if (c.type !== 'ammeter' && c.type !== 'voltmeter') {
                          vSum += current * getCompR(c);
                        }
                      });
                      return h('p', { className: 'text-[10px] font-bold text-violet-300 font-mono mt-1' }, '\u2211 = ' + vSum.toFixed(2) + 'V \u2248 ' + voltage + 'V ' + (Math.abs(vSum - voltage) < 0.1 ? '\u2705' : '\u26A0\uFE0F'));
                    })()
                  )
                ),

                // Additional formulas for g912
                band === 'g912' && h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.key_relationships', 'Key Relationships')),
                  h('div', { className: 'grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono' },
                    h('p', null, 'V = IR (Ohm\'s Law)'),
                    h('p', null, 'P = IV = I\u00B2R = V\u00B2/R'),
                    h('p', null, 'R_series = R1 + R2 + ...'),
                    h('p', null, '1/R_par = 1/R1 + 1/R2 + ...'),
                    h('p', null, 'Xc = 1/(2\u03C0fC)'),
                    h('p', null, 'Energy = P \u00D7 t (Joules)')
                  )
                )
              )
            ),

            // ══════════════════════════════════════
            // Oscilloscope / Waveform Display
            // ══════════════════════════════════════
            components.length > 0 && !isOpen ? h('div', { className: 'mt-4 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl' },
              h('div', { className: 'px-3 py-2 flex items-center gap-2 border-b border-slate-800 bg-slate-950/60' },
                h('div', { className: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' }),
                h('span', { className: 'text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono' }, __alloT('stem.circuit.oscilloscope_label', 'Oscilloscope')),
                h('span', { className: 'ml-auto text-[10px] text-slate-500 font-mono' },
                  voltage.toFixed(1) + 'V  ' + current.toFixed(3) + 'A  ' + totalR.toFixed(1) + '\u03A9')
              ),
              h('canvas', { role: 'img', tabIndex: 0, 'aria-label': __alloT('stem.circuit.aria_oscilloscope', 'Circuit oscilloscope visualization showing voltage, current, and capacitor charge traces'),
                ref: function(canvas) {
                  if (!canvas) return;
                  var oc = canvas.getContext('2d');
                  var dpr = window.devicePixelRatio || 1;
                  var ow = canvas.offsetWidth || 400;
                  var oh = 120;
                  canvas.width = ow * dpr; canvas.height = oh * dpr;
                  canvas.style.height = oh + 'px'; oc.scale(dpr, dpr);

                  // Dark CRT background
                  oc.fillStyle = '#050a12'; oc.fillRect(0, 0, ow, oh);

                  // CRT grid pattern
                  oc.strokeStyle = 'rgba(16, 185, 129, 0.08)'; oc.lineWidth = 0.5;
                  for (var gx = 0; gx < ow; gx += ow / 10) {
                    oc.beginPath(); oc.moveTo(gx, 0); oc.lineTo(gx, oh); oc.stroke();
                  }
                  for (var gy = 0; gy < oh; gy += oh / 6) {
                    oc.beginPath(); oc.moveTo(0, gy); oc.lineTo(ow, gy); oc.stroke();
                  }

                  // Center division lines
                  oc.strokeStyle = 'rgba(16, 185, 129, 0.2)'; oc.lineWidth = 1;
                  oc.beginPath(); oc.moveTo(0, oh / 2); oc.lineTo(ow, oh / 2); oc.stroke();
                  oc.beginPath(); oc.moveTo(ow / 2, 0); oc.lineTo(ow / 2, oh); oc.stroke();

                  // 1. Draw capacitor charge wave if present
                  if (components.some(function(c) { return c.type === 'capacitor'; })) {
                    var cap = components.find(function(c) { return c.type === 'capacitor'; });
                    var capVal = cap.value || 100;
                    var period = 100;
                    oc.strokeStyle = '#38bdf8'; oc.lineWidth = 2;
                    oc.shadowColor = '#38bdf8'; oc.shadowBlur = 6;
                    oc.beginPath();
                    for (var sx = 0; sx < ow; sx++) {
                      var phase = (sx + tick * 1.5) % period;
                      var isCharging = phase < period / 2;
                      var t = phase % (period / 2);
                      var normVal;
                      if (isCharging) {
                        normVal = 1 - Math.exp(-t / (capVal * 0.08 + 2));
                      } else {
                        normVal = Math.exp(-t / (capVal * 0.08 + 2));
                      }
                      var sy = oh * 0.75 - normVal * oh * 0.5;
                      if (sx === 0) oc.moveTo(sx, sy); else oc.lineTo(sx, sy);
                    }
                    oc.stroke(); oc.shadowBlur = 0;
                  }

                  // 2. Voltage trace (green, DC flat line at voltage level with noise jitter)
                  var vNorm = Math.min(voltage / 24, 1);
                  var vY = oh * 0.8 - vNorm * oh * 0.6;
                  oc.strokeStyle = '#10b981'; oc.lineWidth = 2;
                  oc.shadowColor = '#10b981'; oc.shadowBlur = 6;
                  oc.beginPath();
                  for (var sx = 0; sx < ow; sx++) {
                    var jitter = (Math.random() - 0.5) * 0.4;
                    if (sx === 0) oc.moveTo(sx, vY + jitter); else oc.lineTo(sx, vY + jitter);
                  }
                  oc.stroke(); oc.shadowBlur = 0;

                  // 3. Current trace (cyan, with slight noise to look realistic)
                  if (!isShort) {
                    var iNorm = Math.min(current / 2, 1);
                    var iY = oh * 0.8 - iNorm * oh * 0.6;
                    oc.strokeStyle = '#06b6d4'; oc.lineWidth = 1.5;
                    oc.shadowColor = '#06b6d4'; oc.shadowBlur = 4;
                    oc.beginPath();
                    for (var sx = 0; sx < ow; sx++) {
                      var noise = (Math.random() - 0.5) * 0.8;
                      if (sx === 0) oc.moveTo(sx, iY + noise); else oc.lineTo(sx, iY + noise);
                    }
                    oc.stroke(); oc.shadowBlur = 0;
                  }

                  // Scanlines overlay for CRT effect
                  oc.fillStyle = 'rgba(255, 255, 255, 0.03)';
                  for (var sy = 0; sy < oh; sy += 3) {
                    oc.fillRect(0, sy, ow, 1.2);
                  }

                  // CRT Vignette glow overlay
                  var vig = oc.createRadialGradient(ow / 2, oh / 2, oh / 2, ow / 2, oh / 2, ow * 0.6);
                  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
                  vig.addColorStop(1, 'rgba(5, 10, 18, 0.7)');
                  oc.fillStyle = vig; oc.fillRect(0, 0, ow, oh);

                  // Legend
                  oc.font = '9px monospace'; oc.textAlign = 'left';
                  oc.fillStyle = '#10b981'; oc.fillText('\u2588 Voltage', 10, oh - 8);
                  oc.fillStyle = '#06b6d4'; oc.fillText('\u2588 Current', 80, oh - 8);
                  if (components.some(function(c) { return c.type === 'capacitor'; })) {
                    oc.fillStyle = '#38bdf8'; oc.fillText('\u2588 Cap-Charge', 150, oh - 8);
                  }

                  // Short circuit warning overlay
                  if (isShort) {
                    oc.fillStyle = 'rgba(127, 29, 29, 0.4)'; oc.fillRect(0, 0, ow, oh);
                    oc.fillStyle = '#f87171'; oc.font = 'bold 13px monospace'; oc.textAlign = 'center';
                    oc.fillText('\u26A0 CRITICAL SHORT DETECTED', ow / 2, oh / 2 + 4);
                  }
                },
                className: 'w-full block', style: { height: '120px' }
              })
            ) : null,

            // ══════════════════════════════════════
            // Component Physics Explainer
            // ══════════════════════════════════════
            (function() {
              var COMP_PHYSICS = {
                resistor: {
                  icon: '\u2AE8', name: __alloT('stem.circuit.comp_resistor', 'Resistor'), color: '#eab308',
                  how: __alloT('stem.circuit.physics_resistor_how', 'Electrons collide with atoms in the resistive material, converting electrical energy into heat. The more collisions (higher resistance), the less current flows.'),
                  equation: 'V = I \u00D7 R (Ohm\'s Law)',
                  analogy: __alloT('stem.circuit.physics_resistor_analogy', 'Like a narrow section of pipe - it restricts water flow and creates pressure difference.')
                },
                bulb: {
                  icon: '\uD83D\uDCA1', name: __alloT('stem.circuit.comp_light_bulb', 'Light Bulb'), color: '#fbbf24',
                  how: __alloT('stem.circuit.physics_bulb_how', "Current heats a thin wire (filament) to ~2,500\u00B0C until it glows white-hot. The filament's resistance increases with temperature."),
                  equation: 'Brightness \u221D Power = I\u00B2 \u00D7 R',
                  analogy: __alloT('stem.circuit.physics_bulb_analogy', 'Like rubbing your hands together fast - friction (resistance) creates heat and light.')
                },
                switch: {
                  icon: '\uD83D\uDD18', name: __alloT('stem.circuit.comp_switch', 'Switch'), color: '#10b981',
                  how: __alloT('stem.circuit.physics_switch_how', 'A physical gap in the conductor. When closed, electrons flow freely. When open, the air gap has near-infinite resistance, stopping current completely.'),
                  equation: 'R_open \u2248 \u221E, R_closed \u2248 0\u03A9',
                  analogy: __alloT('stem.circuit.physics_switch_analogy', 'Like a drawbridge - when up, nothing crosses. When down, traffic flows.')
                },
                led: {
                  icon: '\uD83D\uDD34', name: __alloT('stem.circuit.comp_led', 'LED'), color: '#f43f5e',
                  how: __alloT('stem.circuit.physics_led_how', 'A semiconductor diode that emits photons when electrons drop from a high energy band to a low one. Different materials produce different colors.'),
                  equation: 'V_forward \u2248 1.8-3.3V (varies by color)',
                  analogy: __alloT('stem.circuit.physics_led_analogy', 'Like a one-way door with a light - electrons can only go one direction, and they release light as they pass.')
                },
                ammeter: {
                  icon: '\u26A1', name: __alloT('stem.circuit.comp_ammeter', 'Ammeter'), color: '#06b6d4',
                  how: __alloT('stem.circuit.physics_ammeter_how', 'Measures current by detecting the magnetic field created by flowing electrons. Connected in series so all current passes through it. Has very low internal resistance.'),
                  equation: 'I = reading in Amperes (A)',
                  analogy: __alloT('stem.circuit.physics_ammeter_analogy', 'Like a turnstile counting how many people pass per second.')
                },
                voltmeter: {
                  icon: '\uD83D\uDD0B', name: __alloT('stem.circuit.comp_voltmeter', 'Voltmeter'), color: '#f59e0b',
                  how: __alloT('stem.circuit.physics_voltmeter_how', "Measures potential difference (voltage) between two points. Connected in parallel with very high internal resistance so it doesn't affect the circuit."),
                  equation: 'V = reading in Volts (V)',
                  analogy: __alloT('stem.circuit.physics_voltmeter_analogy', 'Like a pressure gauge on a water pipe - measures the push without blocking flow.')
                },
                capacitor: {
                  icon: '\u2E28', name: __alloT('stem.circuit.comp_capacitor', 'Capacitor'), color: '#38bdf8',
                  how: __alloT('stem.circuit.physics_capacitor_how', 'Two metal plates separated by an insulator. Electrons accumulate on one plate and leave the other, storing energy in an electric field. Releases energy quickly when discharged.'),
                  equation: 'Q = C \u00D7 V, Energy = \u00BDCV\u00B2',
                  analogy: __alloT('stem.circuit.physics_capacitor_analogy', 'Like a water tank - it fills up slowly and can release all its stored water at once.')
                }
              };

              var selectedComp = d._selectedComp || null;
              var physics = selectedComp ? COMP_PHYSICS[selectedComp] : null;

              if (components.length === 0) return null;

              return h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
                h('p', { className: 'text-[11px] font-bold text-yellow-500 uppercase tracking-wider mb-2' }, '\u269B How Components Work'),
                h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
                  ['resistor', 'bulb', 'switch', 'led', 'ammeter', 'voltmeter', 'capacitor'].map(function(type) {
                    var info = COMP_PHYSICS[type];
                    var active = selectedComp === type;
                    return h('button', { key: type,
                      onClick: function() { upd('_selectedComp', active ? null : type); },
                      className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ' +
                        (active ? 'text-slate-950 font-extrabold shadow-sm' : 'transition-colors bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'),
                      style: active ? { background: info.color, borderColor: info.color } : {}
                    }, info.icon + ' ' + info.name);
                  })
                ),
                physics ? h('div', { className: 'bg-slate-950/60 rounded-xl border border-slate-800/80 p-3 animate-in fade-in duration-200' },
                  h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                    h('span', { className: 'text-xl' }, physics.icon),
                    h('h4', { className: 'font-bold text-slate-200 text-sm' }, physics.name),
                    h('span', { className: 'ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-yellow-500 border border-slate-800' }, physics.equation)
                  ),
                  h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, physics.how),
                  h('div', { className: 'bg-cyan-950/20 rounded-lg p-2.5 border border-cyan-900/30' },
                    h('span', { className: 'text-[10px] font-bold text-cyan-400' }, '\uD83D\uDCA1 ' + __alloT('stem.circuit.analogy_label', 'Analogy: ')),
                    h('span', { className: 'text-[10px] text-cyan-300 leading-normal' }, physics.analogy)
                  ),
                  typeof callTTS === 'function' ? h('button', { 'aria-label': __alloT('stem.circuit.aria_read_aloud', 'Read aloud'),
                    onClick: function() { callTTS(physics.name + '. ' + physics.how + ' ' + physics.analogy); },
                    className: 'transition-colors mt-2 text-[10px] text-yellow-500 hover:text-yellow-400 font-bold'
                  }, '\uD83D\uDD0A ' + __alloT('stem.circuit.read_aloud', 'Read aloud')) : null
                ) : h('p', { className: 'text-[10px] text-slate-500 italic' }, __alloT('stem.circuit.tap_component_hint', 'Tap a component above to learn how it works inside!'))
              );
            })(),

            // ══════════════════════════════════════
            // Real-World Circuit Applications
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2' }, '\uD83C\uDF0D ' + __alloT('stem.circuit.real_world_circuits_title', 'Real-World Circuits')),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
                [
                  { emoji: '\uD83D\uDD26', name: __alloT('stem.circuit.app_flashlight_name', 'Flashlight'), circuit: __alloT('stem.circuit.circuit_type_series', 'Series'), desc: __alloT('stem.circuit.app_flashlight_desc', 'Battery + switch + bulb in series. Switch breaks circuit to turn off.'), comps: __alloT('stem.circuit.app_flashlight_comps', 'Switch, Bulb') },
                  { emoji: '\uD83D\uDCF1', name: __alloT('stem.circuit.app_phone_charger_name', 'Phone Charger'), circuit: __alloT('stem.circuit.circuit_type_series_parallel', 'Series + Parallel'), desc: __alloT('stem.circuit.app_phone_charger_desc', 'Transformer reduces 120V to 5V. Capacitors smooth the current for steady charging.'), comps: __alloT('stem.circuit.app_phone_charger_comps', 'Resistor, Capacitor') },
                  { emoji: '\uD83D\uDE97', name: __alloT('stem.circuit.app_car_headlights_name', 'Car Headlights'), circuit: __alloT('stem.circuit.circuit_type_parallel', 'Parallel'), desc: __alloT('stem.circuit.app_car_headlights_desc', 'Headlights wired in parallel so if one burns out, the other stays on.'), comps: __alloT('stem.circuit.app_car_headlights_comps', 'Bulb, Switch') },
                  { emoji: '\uD83C\uDFB5', name: __alloT('stem.circuit.app_guitar_pedal_name', 'Guitar Pedal'), circuit: __alloT('stem.circuit.circuit_type_series_parallel', 'Series + Parallel'), desc: __alloT('stem.circuit.app_guitar_pedal_desc', 'Resistors and capacitors filter frequencies to create distortion or reverb effects.'), comps: __alloT('stem.circuit.app_guitar_pedal_comps', 'Resistor, Capacitor') },
                  { emoji: '\uD83D\uDEA6', name: __alloT('stem.circuit.app_traffic_light_name', 'Traffic Light'), circuit: __alloT('stem.circuit.circuit_type_parallel', 'Parallel'), desc: __alloT('stem.circuit.app_traffic_light_desc', 'Three LED groups in parallel, controlled by a timer circuit switching between them.'), comps: __alloT('stem.circuit.app_traffic_light_comps', 'LED, Switch') },
                  { emoji: '\u2764\uFE0F', name: __alloT('stem.circuit.app_heart_monitor_name', 'Heart Monitor'), circuit: __alloT('stem.circuit.circuit_type_series', 'Series'), desc: __alloT('stem.circuit.app_heart_monitor_desc', 'Amplifies tiny electrical signals from heart muscle. Resistors set gain, capacitors filter noise.'), comps: __alloT('stem.circuit.app_heart_monitor_comps', 'Resistor, Ammeter') }
                ].map(function(app) {
                  var expanded = d._expandedApp === app.name;
                  return h('button', { key: app.name, 'aria-expanded': expanded,
                    onClick: function() { upd('_expandedApp', expanded ? null : app.name); },
                    className: 'text-left rounded-lg p-2.5 border transition-all ' +
                      (expanded ? 'bg-slate-950/80 border-cyan-500/40 shadow-md shadow-cyan-500/5' : 'transition-colors bg-slate-950/40 border-slate-800 hover:border-slate-700')
                  },
                    h('div', { className: 'flex items-center gap-2.5 mb-1.5' },
                      h('span', { className: 'text-base' }, app.emoji),
                      h('div', null,
                        h('span', { className: 'text-xs font-bold text-slate-200 block' }, app.name),
                        h('span', { className: 'text-[10px] text-cyan-400 font-bold uppercase tracking-wider' }, app.circuit)
                      )
                    ),
                    expanded ? h('div', { className: 'animate-in fade-in duration-200 mt-1' },
                      h('p', { className: 'text-[10px] text-slate-400 leading-normal mb-1.5' }, app.desc),
                      h('span', { className: 'text-[10px] text-slate-300 font-bold block' }, '\uD83D\uDD27 ' + __alloT('stem.circuit.key_parts_label', 'Key parts: ') + app.comps)
                    ) : null
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Snapshot + Footer
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 flex items-center gap-2 justify-end' },
              h('button', { 'aria-label': __alloT('stem.circuit.snapshot', 'Snapshot'),
                onClick: function() {
                  if (typeof setToolSnapshots === 'function') {
                    setToolSnapshots(function(prev) {
                      return prev.concat([{
                        id: 'ci-' + Date.now(),
                        tool: 'circuit',
                        label: components.length + ' parts ' + voltage + 'V ' + mode,
                        data: (function () { var _s = Object.assign({}, d, { mode: mode }); delete _s.tick; delete _s._aiLoading; delete _s._aiResponse; return _s; })(),
                        timestamp: Date.now()
                      }]);
                    });
                  }
                  if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
                },
                className: 'px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all'
              }, '\uD83D\uDCF8 ' + __alloT('stem.circuit.snapshot', 'Snapshot')),

              // TTS button
              typeof callTTS === 'function' && h('button', { 'aria-label': __alloT('stem.circuit.read_aloud_btn', 'Read Aloud'),
                onClick: function() {
                  var summary = 'Circuit Builder: ' + mode + ' mode, ' + voltage + ' volts, ' +
                    components.length + ' components. Total resistance ' + totalR.toFixed(1) + ' ohms. ' +
                    'Current ' + current.toFixed(3) + ' amps. Power ' + power.toFixed(2) + ' watts.';
                  if (isShort) summary += ' Warning: short circuit detected!';
                  if (isOpen) summary += ' Circuit is open, no current flowing.';
                  callTTS(summary);
                },
                className: 'px-4 py-2 text-xs font-bold text-slate-300 bg-slate-900/60 rounded-full hover:bg-slate-800 transition-all border border-slate-800 active:scale-[0.97]'
              }, '\uD83D\uDD0A ' + __alloT('stem.circuit.read_aloud_btn', 'Read Aloud'))
            ),

            // Footer
            h('p', { className: 'text-[10px] text-center text-slate-400 mt-4 mb-2 font-mono font-bold' }, '\uD83D\uDD0C ' + __alloT('stem.circuit.circuit_builder', 'Circuit Builder') + ' \u2022 ' + __alloT('stem.circuit.footer_ohm', "Ohm's Law: V = IR") + ' \u2022 ' + __alloT('stem.circuit.footer_power', 'Power: P = IV'))
          );
        };
      }
      var __circuitMainView = h(this._CircuitComponent, { ctx: ctx });

      // ═══════════════════════════════════════════════════════════════════
      // CIRCUIT EXPANSION SECTIONS — interactive electronics reference (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var React = ctx.React;
      var d2 = (labToolData && labToolData.circuit) || {};
      var workspaceTab = d2.workspaceTab || 'build';
      var expSection = d2.expSection || null;
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.circuit) || {};
          return Object.assign({}, prev, { circuit: Object.assign({}, prior, patch) });
        });
      }
      function renderWorkspaceSwitch() {
        var tabs = [
          { id: 'build', label: __alloT('stem.circuit.reference_tab_build', 'Build'), icon: '\uD83D\uDD0C' },
          { id: 'reference', label: __alloT('stem.circuit.reference_tab_reference', 'Reference'), icon: '\uD83D\uDCD8' }
        ];
        return h('div', {
          className: 'max-w-3xl mx-auto mb-3 flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800 shadow-lg',
          role: 'tablist',
          'aria-label': __alloT('stem.circuit.aria_workspace', 'Circuit Builder workspace')
        }, tabs.map(function(tab) {
          var active = workspaceTab === tab.id;
          return h('button', {
            key: tab.id,
            type: 'button',
            role: 'tab',
            'aria-selected': active,
            'aria-controls': tab.id === 'reference' ? 'circuit-reference-panel' : 'circuit-build-panel',
            onClick: function() { setExp({ workspaceTab: tab.id }); },
            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
              (active ? 'bg-yellow-400 text-slate-950 shadow-sm' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white')
          },
            h('span', { 'aria-hidden': 'true' }, tab.icon),
            h('span', null, tab.label)
          );
        }));
      }

      var CIRCUIT_LAWS = [
        { name: 'Ohm\'s law', formula: 'V = I × R', desc: 'Voltage across a resistor equals current × resistance. Linear relationship for ohmic materials.', example: 'A 100 Ω resistor with 12 V across it → I = 0.12 A.' },
        { name: 'Kirchhoff\'s current law (KCL)', formula: 'Σ I_in = Σ I_out', desc: 'Sum of currents into a node = sum of currents out. Conservation of charge.', example: 'If 3 A enters a junction and one branch takes 1 A, the other branch carries 2 A.' },
        { name: 'Kirchhoff\'s voltage law (KVL)', formula: 'Σ V around loop = 0', desc: 'Sum of voltage drops around any closed loop = 0. Conservation of energy.', example: '9V battery + 4Ω + 5Ω in series: voltage drops 4×I + 5×I = 9 → I = 1A.' },
        { name: 'Power formula', formula: 'P = V × I = I² × R = V²/R', desc: 'Three equivalent forms. Pick the one matching what you know.', example: '100 W bulb on 120 V mains: I = 0.83 A; R = 144 Ω.' },
        { name: 'Series resistance', formula: 'R_total = R₁ + R₂ + R₃ + ...', desc: 'Resistors in series simply add. Same current through each.', example: '100 Ω + 220 Ω + 470 Ω in series = 790 Ω.' },
        { name: 'Parallel resistance', formula: '1/R_total = 1/R₁ + 1/R₂ + ...', desc: 'Inverses add. Parallel total is ALWAYS less than smallest. Same voltage across each.', example: '100 Ω || 100 Ω = 50 Ω. 100 Ω || 1000 Ω ≈ 91 Ω.' },
        { name: 'Capacitance', formula: 'Q = C × V; I = C × dV/dt', desc: 'Charge stored proportional to voltage. Current = capacitance × rate of voltage change.', example: '100 µF capacitor charged to 10 V holds 1 mC of charge.' },
        { name: 'RC time constant', formula: 'τ = R × C', desc: 'Time to charge to ~63% (or discharge to ~37%). Reaches ~99% in 5τ.', example: '10 kΩ × 100 µF = 1 second. After 5 s, capacitor is fully (>99%) charged.' },
        { name: 'Inductance', formula: 'V = L × dI/dt', desc: 'Inductor resists current changes. Voltage = inductance × rate of current change.', example: '1 mH inductor with current changing at 1000 A/s → 1 V across it.' },
        { name: 'AC reactance', formula: 'X_L = 2πfL; X_C = 1/(2πfC)', desc: 'Frequency-dependent "resistance" of L and C. Combined as impedance Z.', example: '1 µF cap at 60 Hz: X_C = 2.65 kΩ. At 60 kHz: 2.65 Ω.' }
      ];

      var CIRCUIT_COMPONENTS = [
        { name: 'Resistor', symbol: '⏛', units: 'Ω (ohms)', role: 'Limits current, drops voltage, divides voltage. Most common passive component.', colors: 'Color bands: Black=0, Brown=1, Red=2, Orange=3, Yellow=4, Green=5, Blue=6, Violet=7, Gray=8, White=9.' },
        { name: 'Capacitor', symbol: '||', units: 'F (farads)', role: 'Stores charge. Blocks DC, passes AC. Filtering, timing, energy storage.', colors: 'Common sizes: µF (10⁻⁶), nF (10⁻⁹), pF (10⁻¹²). Electrolytic caps polarized.' },
        { name: 'Inductor', symbol: '⌇', units: 'H (henries)', role: 'Stores energy in magnetic field. Resists current changes. Filtering, transformers, motors.', colors: 'Common sizes: mH, µH, nH. Coil of wire, often on a ferrite core.' },
        { name: 'Diode', symbol: '▷|', units: 'V_f (forward voltage)', role: 'One-way valve for current. Conducts when V > V_f (~0.7 V for Si, 0.3 V for Ge).', colors: 'LED V_f varies by color: red ~1.8 V, green ~2.1 V, blue ~3.2 V, white ~3.0 V.' },
        { name: 'Transistor (BJT)', symbol: '3 terminals', units: 'β (gain)', role: 'Current amplifier. Small base current controls large collector current. NPN or PNP.', colors: 'Common: 2N3904 (NPN), 2N3906 (PNP). β often 100-300.' },
        { name: 'Transistor (MOSFET)', symbol: '3 terminals + gate', units: 'V_GS threshold', role: 'Voltage amplifier. Gate voltage controls drain-source current. Very high input impedance.', colors: 'Dominant in modern ICs. Logic levels: V_GS > V_threshold turns on.' },
        { name: 'Op-amp', symbol: '▷', units: 'gain (often 10⁵+)', role: 'High-gain differential amplifier. With feedback, makes amplifiers, filters, comparators.', colors: 'Iconic: 741, LM358, TL072. Modern rail-to-rail: MCP6022.' },
        { name: 'Switch', symbol: '|/', units: '—', role: 'Manual open/close of circuit. SPST, SPDT, DPDT, momentary, toggle, slide, rocker.', colors: 'Mechanical or solid-state (transistor switching).' },
        { name: 'LED', symbol: 'D with arrows', units: 'mcd (millicandela)', role: 'Light-emitting diode. Efficient lighting + indicators. Need current-limiting resistor.', colors: 'Common drop ~2 V; current ~10-20 mA. R = (V_supply − V_LED) / I_LED.' },
        { name: 'Battery', symbol: '|||−', units: 'V + Ah', role: 'DC voltage source. Capacity (Ah) × voltage = energy. Internal resistance limits current.', colors: 'AA: 1.5 V × ~2.5 Ah = 3.75 Wh. 9V: 9 V × ~0.5 Ah = 4.5 Wh.' },
        { name: 'Fuse', symbol: '~', units: 'A (amps) rating', role: 'Sacrifices itself to protect circuit. Wire that melts above rated current.', colors: 'Slow-blow vs fast-blow. Always replace with same or LOWER rating.' },
        { name: 'Crystal oscillator', symbol: '⊙', units: 'Hz', role: 'Provides precise frequency reference. Common: 32.768 kHz (watches), 16 MHz (Arduinos).', colors: 'Stability: ppm or ppb. Temperature-compensated (TCXO) for tighter specs.' }
      ];

      var SERIES_VS_PARALLEL = [
        { aspect: 'Current', series: 'Same through all components', parallel: 'Divides between branches inversely with R' },
        { aspect: 'Voltage', series: 'Divides across components proportional to R', parallel: 'Same across all branches' },
        { aspect: 'Resistance', series: 'Sum: R₁ + R₂ + R₃', parallel: 'Reciprocal: 1/(1/R₁ + 1/R₂ + 1/R₃); always less than smallest' },
        { aspect: 'Single component fails (open)', series: 'Entire circuit stops (like Christmas lights)', parallel: 'Other branches keep working' },
        { aspect: 'Single component fails (short)', series: 'Other components see more current (may burn out)', parallel: 'That branch sees full current; others unaffected' },
        { aspect: 'Power dissipation', series: 'P = I²R; larger R dissipates more (same I)', parallel: 'P = V²/R; smaller R dissipates more (same V)' },
        { aspect: 'Typical use', series: 'Current limiting (resistor + LED)', parallel: 'Independent loads (every outlet in your house)' }
      ];

      var SAFETY_RULES = [
        { rule: 'Power off before working', detail: 'Disconnect battery / unplug from mains. Discharge large capacitors (a CRT cap can hold lethal voltage for weeks).' },
        { rule: '"Right-hand rule" for high-voltage work', detail: 'Keep one hand in pocket. Prevents current flow across chest. Adopted from electric utility safety.' },
        { rule: 'GFCI in wet locations', detail: 'Ground Fault Circuit Interrupter trips in <30 ms if current leaks. Required by code in kitchens, bathrooms, outdoors.' },
        { rule: 'AFCI for electrical fire prevention', detail: 'Arc Fault Circuit Interrupter detects dangerous arcs in damaged wiring. Required in bedrooms in newer codes.' },
        { rule: 'Mains voltage is lethal', detail: '120 V AC can kill at ~10 mA across heart. Voltage drives current through skin resistance (~10-100 kΩ dry, much lower wet).' },
        { rule: 'Battery short circuit', detail: 'Li-ion batteries shorted = fire / explosion. Lead-acid car batteries = molten metal sparks. Even AAs can heat up significantly.' },
        { rule: 'Capacitor discharge before service', detail: 'Use a 10 kΩ resistor with insulated leads, never a screwdriver across terminals (the latter can vaporize the conductor + your eyes).' },
        { rule: 'ESD (electrostatic discharge)', detail: 'Static can destroy ICs. Use wrist strap + ESD mat when handling chips. Walk on carpet → easily 10+ kV body charge.' }
      ];

      var CIRCUIT_PATTERNS = [
        { name: 'Voltage divider', purpose: 'Get fraction of V_in', formula: 'V_out = V_in × R₂ / (R₁ + R₂)', notes: 'Two resistors in series. V_out tapped between them. Common for ADC scaling, biasing.' },
        { name: 'Current divider', purpose: 'Split current between parallel branches', formula: 'I_n = I_total × R_total / R_n', notes: 'More current flows through smaller resistance.' },
        { name: 'Low-pass filter (RC)', purpose: 'Pass low frequencies, block high', formula: 'f_cutoff = 1 / (2π × R × C)', notes: 'Resistor in series with cap to ground. Used for noise filtering, audio.' },
        { name: 'High-pass filter (RC)', purpose: 'Pass high frequencies, block low (incl. DC)', formula: 'f_cutoff = 1 / (2π × R × C)', notes: 'Cap in series with resistor to ground. Same cutoff formula, swapped topology.' },
        { name: 'LED with current limit', purpose: 'Light an LED safely', formula: 'R = (V_supply − V_LED) / I_LED', notes: 'V_LED ~2V, I_LED ~10-20 mA. From 5V: R = (5-2)/0.015 = 200Ω → use 220Ω standard.' },
        { name: 'Pull-up / pull-down resistor', purpose: 'Define logic level when switch open', formula: 'Typically 4.7-10 kΩ', notes: 'Pull-up: switch connects to ground; otherwise input reads HIGH. Pull-down: opposite.' },
        { name: 'Bypass capacitor (decoupling)', purpose: 'Suppress noise on power rails', formula: '0.1 µF ceramic near each IC', notes: 'Provides local energy reservoir for fast current demands. CRITICAL for digital circuits.' },
        { name: 'Common-emitter amplifier (BJT)', purpose: 'Voltage amplification', formula: 'Gain ≈ −R_C / R_E (with emitter degen)', notes: 'Classic textbook amp. Inverts signal. Modern use: still common in audio.' },
        { name: 'Inverting op-amp', purpose: 'Amplify (inverted) with precise gain', formula: 'V_out = −R_f / R_in × V_in', notes: 'Negative input, feedback resistor sets gain. Positive input grounded.' },
        { name: 'Non-inverting op-amp', purpose: 'Amplify (in phase) with precise gain', formula: 'V_out = (1 + R_f / R_g) × V_in', notes: 'Positive input is signal. Gain always ≥ 1.' },
        { name: '555 timer (astable)', purpose: 'Generate square wave', formula: 'f = 1.44 / ((R_a + 2R_b) × C)', notes: 'Iconic chip. Two resistors + cap set frequency. Duty cycle depends on R ratio.' },
        { name: 'Voltage regulator (7805)', purpose: 'Constant 5 V output from higher V_in', formula: 'Input >7V, output 5V, drop = V_in - 5', notes: 'Drop × current = heat dissipation. Add bypass caps in + out. Modern switching regs >90% efficient.' }
      ];

      var DIGITAL_LOGIC = [
        { gate: 'AND', symbol: 'D-shape', truth: '1 only if BOTH inputs = 1', formula: 'Y = A · B', uses: 'Permission logic ("OK to proceed if all conditions met")' },
        { gate: 'OR', symbol: 'Curved', truth: '1 if EITHER input = 1', formula: 'Y = A + B', uses: 'Alarm triggers ("alert if any sensor fires")' },
        { gate: 'NOT', symbol: 'Triangle + bubble', truth: 'Inverts input', formula: 'Y = ¬A', uses: 'Active-low signals, complementary signals' },
        { gate: 'NAND', symbol: 'AND + bubble', truth: '0 only if BOTH inputs = 1', formula: 'Y = ¬(A · B)', uses: 'Universal gate — any logic can be built from NAND alone' },
        { gate: 'NOR', symbol: 'OR + bubble', truth: '1 only if BOTH inputs = 0', formula: 'Y = ¬(A + B)', uses: 'Universal gate. RS latch building block.' },
        { gate: 'XOR', symbol: '⊕ in curved', truth: '1 if inputs DIFFER', formula: 'Y = A ⊕ B', uses: 'Adders, parity checking, encryption' },
        { gate: 'XNOR', symbol: 'XOR + bubble', truth: '1 if inputs MATCH', formula: 'Y = ¬(A ⊕ B)', uses: 'Equality detector' }
      ];

      var CIRCUIT_GLOSSARY = [
        { term: 'Voltage (V)', def: 'Electric potential difference. Drives current through a circuit. Measured in volts.' },
        { term: 'Current (I)', def: 'Flow rate of electric charge. Measured in amperes (A = C/s).' },
        { term: 'Resistance (R)', def: 'Opposition to current flow. Measured in ohms (Ω = V/A).' },
        { term: 'Power (P)', def: 'Energy per unit time. Watts (W = J/s = V·A).' },
        { term: 'Charge (Q)', def: 'Quantity of electricity. Coulombs (C). 1 e⁻ = 1.6 × 10⁻¹⁹ C.' },
        { term: 'Capacitance (C)', def: 'Ability to store charge per volt. Farads (F = C/V). Most caps are µF or pF.' },
        { term: 'Inductance (L)', def: 'Resistance to change in current. Henries (H = V·s/A).' },
        { term: 'Impedance (Z)', def: 'AC equivalent of resistance. Complex: includes resistance + reactance.' },
        { term: 'Frequency (f)', def: 'Cycles per second. Hertz (Hz). AC mains: 50 Hz (Europe) or 60 Hz (US).' },
        { term: 'Period (T)', def: 'Time for one cycle. T = 1/f. 60 Hz → 16.67 ms.' },
        { term: 'Ground (GND)', def: 'Reference point for voltage measurement (often 0 V). Earth ground for safety.' },
        { term: 'Open circuit', def: 'Break in the circuit; no current flows. Infinite resistance.' },
        { term: 'Short circuit', def: 'Path with near-zero resistance; very large current. Often unintended; dangerous.' },
        { term: 'Polarity', def: 'Direction of conventional current flow. Some components (electrolytic caps, batteries, diodes) are polarized; reversing damages them.' },
        { term: 'AC (alternating current)', def: 'Current that reverses direction periodically. Used for power distribution (lower transmission losses).' },
        { term: 'DC (direct current)', def: 'Current flowing in one direction. Batteries, USB, electronic devices internally.' },
        { term: 'Multimeter', def: 'Measures V, I, R (and often more). Auto-ranging multimeters pick the right scale automatically.' },
        { term: 'Oscilloscope', def: 'Visualizes voltage vs time. Bandwidth (MHz) is the key spec.' },
        { term: 'Breadboard', def: 'Prototyping board with sockets connected in standard patterns. No soldering required.' },
        { term: 'PCB', def: 'Printed Circuit Board. Permanent platform with copper traces. Cheap to manufacture even in small quantities.' },
        { term: 'Solder', def: 'Low-melting metal alloy that joins components to PCB. Modern: lead-free (SAC305).' },
        { term: 'Datasheet', def: 'Manufacturer document detailing a component\'s electrical, mechanical, and thermal specifications. Always check before designing.' }
      ];

      function expHeader() {
        return h('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200' },
          h('div', null,
            h('h3', { className: 'text-base font-black text-amber-900' }, '⚡ ' + __alloT('stem.circuit.reference_library_title', 'Circuit Reference Library')),
            h('div', { className: 'text-[11px] text-amber-700 mt-0.5' }, __alloT('stem.circuit.reference_library_subtitle', 'Interactive references — pick a topic below to explore.'))
          ),
          expSection && h('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'transition-colors px-3 py-1 rounded-md text-xs font-bold bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 active:scale-[0.97]'
          }, '✕ ' + __alloT('stem.circuit.close_section', 'Close section'))
        );
      }

      function expTabBar() {
        // 42 circuits/electronics sections grouped into 6 cohesive domains.
        // All IDs preserved. Groups: Fundamentals · Components · Systems &
        // Computing · Power & Energy · Practical & Reference · History &
        // Careers.
        var TAB_GROUPS = [
          { id: 'fundamentals', label: __alloT('stem.circuit.navgroup_fundamentals', 'Fundamentals'), color: 'amber', tabs: [
            { id: 'laws', label: __alloT('stem.circuit.nav_laws', 'Laws + formulas'), icon: 'V=IR' },
            { id: 'units', label: __alloT('stem.circuit.nav_units', 'Units & constants'), icon: '∑' },
            { id: 'sp', label: __alloT('stem.circuit.nav_sp', 'Series vs parallel'), icon: '⇊' },
            { id: 'patterns', label: __alloT('stem.circuit.nav_patterns', 'Common circuits'), icon: '🔌' },
            { id: 'symbols', label: __alloT('stem.circuit.nav_symbols', 'Schematic symbols'), icon: '⊜' },
            { id: 'fields', label: __alloT('stem.circuit.nav_fields', 'E & M fields'), icon: '⚡' },
            { id: 'ohmInquiry', label: __alloT('stem.circuit.nav_ohm_inquiry', 'Ohm Inquiry'), icon: '🔬' }
          ] },
          { id: 'components', label: __alloT('stem.circuit.navgroup_components', 'Components'), color: 'sky', tabs: [
            { id: 'components', label: __alloT('stem.circuit.nav_components', 'Components'), icon: '⏛' },
            { id: 'resistor', label: __alloT('stem.circuit.nav_resistor_colors', 'Resistor colors'), icon: '🎨' },
            { id: 'capacitor', label: __alloT('stem.circuit.nav_capacitors', 'Capacitors'), icon: '⎮⎮' },
            { id: 'inductor', label: __alloT('stem.circuit.nav_inductors', 'Inductors'), icon: '∿∿' },
            { id: 'semicon', label: __alloT('stem.circuit.nav_semiconductors', 'Semiconductors'), icon: '⌐' },
            { id: 'opamp', label: __alloT('stem.circuit.nav_opamps', 'Op-amps'), icon: '▷' },
            { id: 'filters', label: __alloT('stem.circuit.nav_filters', 'Filters'), icon: '⌒' },
            { id: 'sensors', label: __alloT('stem.circuit.nav_sensors', 'Sensors'), icon: '◉' },
            { id: 'actuators', label: __alloT('stem.circuit.nav_actuators', 'Actuators'), icon: '🔧' },
            { id: 'connectors', label: __alloT('stem.circuit.nav_connectors', 'Connectors'), icon: '🔗' }
          ] },
          { id: 'systems', label: __alloT('stem.circuit.navgroup_systems', 'Systems & Computing'), color: 'violet', tabs: [
            { id: 'logic', label: __alloT('stem.circuit.nav_logic', 'Digital logic'), icon: '0/1' },
            { id: 'micro', label: __alloT('stem.circuit.nav_micro', 'Microcontrollers'), icon: '🧠' },
            { id: 'ics', label: __alloT('stem.circuit.nav_ics', 'Common ICs'), icon: '⬚' },
            { id: 'protos', label: __alloT('stem.circuit.nav_protos', 'Comm protocols'), icon: '↔' },
            { id: 'pcb', label: __alloT('stem.circuit.nav_pcb', 'PCB design'), icon: '▦' },
            { id: 'simulation', label: __alloT('stem.circuit.nav_simulation', 'Circuit sim'), icon: '🖥' }
          ] },
          { id: 'power', label: __alloT('stem.circuit.navgroup_power', 'Power & Energy'), color: 'rose', tabs: [
            { id: 'power', label: __alloT('stem.circuit.nav_power', 'Power supplies'), icon: '🔌' },
            { id: 'batteries', label: __alloT('stem.circuit.nav_batteries', 'Battery types'), icon: '🔋' },
            { id: 'energy', label: __alloT('stem.circuit.nav_energy', 'Energy sources'), icon: '⚡' },
            { id: 'motors', label: __alloT('stem.circuit.nav_motors', 'Motors & gens'), icon: '⚙' },
            { id: 'wireless', label: __alloT('stem.circuit.nav_wireless', 'Wireless power'), icon: '📶' },
            { id: 'fuses', label: __alloT('stem.circuit.nav_fuses', 'Fuses + breakers'), icon: '⌧' },
            { id: 'safety', label: __alloT('stem.circuit.nav_safety', 'Safety'), icon: '⚠' }
          ] },
          { id: 'practical', label: __alloT('stem.circuit.navgroup_practical', 'Practical & Reference'), color: 'emerald', tabs: [
            { id: 'standards', label: __alloT('stem.circuit.nav_standards', 'Standards + plugs'), icon: '🔌' },
            { id: 'wire', label: __alloT('stem.circuit.nav_wire', 'Wire gauges'), icon: '〰' },
            { id: 'lights', label: __alloT('stem.circuit.nav_lights', 'Light bulbs'), icon: '💡' },
            { id: 'household_app', label: __alloT('stem.circuit.nav_household_app', 'Appliance watts'), icon: '🏠' },
            { id: 'circuit_lab', label: __alloT('stem.circuit.nav_circuit_lab', 'Lab equipment'), icon: '🔬' },
            { id: 'common_circuits', label: __alloT('stem.circuit.nav_common_circuits', 'Project circuits'), icon: '⚒' },
            { id: 'troubleshoot', label: __alloT('stem.circuit.nav_troubleshoot', 'Troubleshooting'), icon: '🛠' },
            { id: 'glossary', label: __alloT('stem.circuit.nav_glossary', 'Glossary'), icon: '📖' }
          ] },
          { id: 'history', label: __alloT('stem.circuit.navgroup_history', 'History & Careers'), color: 'slate', tabs: [
            { id: 'famous', label: __alloT('stem.circuit.nav_famous', 'History'), icon: '🕰' },
            { id: 'famouscirc', label: __alloT('stem.circuit.nav_famouscirc', 'Famous circuits'), icon: '🎛' },
            { id: 'computers', label: __alloT('stem.circuit.nav_computers', 'Computer history'), icon: '💻' },
            { id: 'world', label: __alloT('stem.circuit.nav_world', 'World electrification'), icon: '🌐' },
            { id: 'careers', label: __alloT('stem.circuit.nav_careers', 'Careers'), icon: '💼' }
, { id: 'poebulb', label: __alloT('stem.circuit.nav_poebulb', 'Predict bulb'), icon: '💡' }
, { id: 'failDx', label: __alloT('stem.circuit.nav_faildx', 'Why did it fail?'), icon: '🛠' }
          ] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return h('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'transition-colors bg-white text-slate-700 border-slate-300 hover:bg- active:scale-[0.97]' + accent + 'transition-colors -50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        return h('div', { className: 'mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5' },
          TAB_GROUPS.map(function(g) {
            return h('div', { key: g.id, role: 'group', 'aria-label': g.label + ' tabs', className: 'flex items-center gap-2 flex-wrap' },
              h('span', { 'aria-hidden': 'true', className: 'text-[10px] font-extrabold tracking-widest uppercase text-' + g.color + '-700 min-w-[120px] text-right pr-1 border-r border-' + g.color + '-200 shrink-0' }, g.label),
              g.tabs.map(function(s) { return renderBtn(s, g.color); })
            );
          })
        );
      }

      function renderLawsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'V=IR Core laws + formulas'),
          h('div', { className: 'space-y-2' },
            CIRCUIT_LAWS.map(function(l, i) {
              return h('div', { key: 'l'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, l.name),
                  h('span', { className: 'text-sm font-bold ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono' }, l.formula)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1 leading-relaxed' }, l.desc),
                h('div', { className: 'text-[11px] text-slate-600 italic' }, 'Example: ', l.example)
              );
            })
          )
        );
      }

      function renderComponentsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏛ Common components'),
          h('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            CIRCUIT_COMPONENTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-base font-black text-amber-700' }, c.symbol),
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[10px] font-mono ml-auto px-1.5 py-0.5 rounded bg-amber-100 text-amber-800' }, c.units)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1 leading-relaxed' }, c.role),
                h('div', { className: 'text-[10px] text-slate-600 italic' }, c.colors)
              );
            })
          )
        );
      }

      function renderSpSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⇊ Series vs parallel circuits'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Series and parallel circuit comparison'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Aspect', 'Series', 'Parallel'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SERIES_VS_PARALLEL.map(function(r, i) {
                  return h('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left text-slate-800 font-bold' }, r.aspect),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, r.series),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, r.parallel)
                  );
                })
              )
            )
          )
        );
      }

      function renderPatternsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔌 Common circuit patterns'),
          h('div', { className: 'space-y-2' },
            CIRCUIT_PATTERNS.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, p.name),
                  h('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-800' }, p.purpose)
                ),
                h('div', { className: 'text-[11px] font-mono text-indigo-800 bg-indigo-50 px-2 py-1 rounded mb-1' }, p.formula),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, p.notes)
              );
            })
          )
        );
      }

      function renderLogicSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '0/1 Digital logic gates'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Every digital circuit is built from logic gates. Combinational logic computes; sequential logic remembers. NAND or NOR alone is functionally complete (can build all others).'),
          h('div', { className: 'space-y-2' },
            DIGITAL_LOGIC.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[14px] font-black text-amber-700' }, g.gate),
                  h('span', { className: 'text-[11px] font-mono ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-800' }, g.formula)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Truth: '), g.truth),
                h('div', { className: 'text-[11px] text-slate-600 italic' }, 'Uses: ', g.uses)
              );
            })
          )
        );
      }

      function renderSafetySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚠ Electrical safety'),
          h('div', { className: 'space-y-2' },
            SAFETY_RULES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-red-50 border border-red-200' },
                h('div', { className: 'text-[12px] font-black text-red-900 mb-1' }, '🛡 ' + s.rule),
                h('div', { className: 'text-[11px] text-red-900 leading-relaxed' }, s.detail)
              );
            })
          )
        );
      }

      // ── Cycle 1 of the inquiry-learning study: Predict-Observe-Explain ──
      // Pattern: learner sees a circuit, predicts brightness, then sees the answer with V=IR
      // reasoning. Productive struggle from explicit pre-commitment.
      var POE_SCENARIOS = [
        {
          id: 's1',
          title: 'One bulb, 1.5 V battery',
          svg: { battery: 1.5, bulbs: [{ R: 5 }], topology: 'simple' },
          predict: { question: 'How bright will the bulb be?', options: ['Off (no current)', 'Very dim', 'Medium', 'Bright', 'Burns out'] },
          answerIndex: 2,
          explanation: 'Current I = V/R = 1.5 V ÷ 5 Ω = 0.3 A. Power = V·I = 0.45 W — a medium glow for a small bulb. The bulb conducts because the circuit is closed, and V=IR splits the energy across the only resistor.'
        },
        {
          id: 's2',
          title: 'Two bulbs in SERIES, same battery',
          svg: { battery: 1.5, bulbs: [{ R: 5 }, { R: 5 }], topology: 'series' },
          predict: { question: 'How does each bulb compare to scenario 1?', options: ['Brighter than s1', 'Same as s1', 'Half as bright', 'Quarter as bright', 'Off'] },
          answerIndex: 3,
          explanation: 'In series, resistances add: 10 Ω total. Current drops to 0.15 A. Each bulb gets only 0.75 V (half the battery) and 0.11 W — about ¼ the power of s1. Series circuits split voltage; that\'s why old Christmas-light strings dimmed when you added bulbs.'
        },
        {
          id: 's3',
          title: 'Two bulbs in PARALLEL, same battery',
          svg: { battery: 1.5, bulbs: [{ R: 5 }, { R: 5 }], topology: 'parallel' },
          predict: { question: 'How does each parallel bulb compare to s1?', options: ['Brighter than s1', 'Same as s1', 'Half as bright', 'Quarter as bright', 'Off'] },
          answerIndex: 1,
          explanation: 'In parallel, each bulb sees the full 1.5 V. Each draws 0.3 A independently and glows just as brightly as in s1 — but now the battery delivers 0.6 A total and drains twice as fast. Parallel splits current; voltage stays.'
        },
        {
          id: 's4',
          title: 'Swap one bulb for a 1 Ω resistor (in series with a 10 Ω bulb)',
          svg: { battery: 1.5, bulbs: [{ R: 10, isBulb: true }, { R: 1, isBulb: false }], topology: 'series' },
          predict: { question: 'How bright is the 10 Ω bulb?', options: ['Off', 'Very dim', 'Dim', 'Medium', 'Bright']  },
          answerIndex: 3,
          explanation: 'Total R = 11 Ω, so I ≈ 0.136 A. Voltage across the bulb is I·R_bulb = 1.36 V; voltage across the small resistor is just 0.14 V. The bulb gets most of the voltage because it has most of the resistance — a key insight: voltage divides in proportion to resistance.'
        }
      ];

      function renderPoebulbSection() {
        var state = d2.poeb || { stage: {}, score: 0 };
        function setPoe(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.circuit) || {};
            var pb = Object.assign({}, prior.poeb || { stage: {}, score: 0 }, patch);
            return Object.assign({}, prev, { circuit: Object.assign({}, prior, { poeb: pb }) });
          });
        }
        // Tiny SVG schematic generator — kept lightweight so the lesson stays the focus
        function drawSchematic(scenario) {
          var s = scenario.svg;
          var bulbs = s.bulbs;
          var svgChildren = [];
          // Battery
          svgChildren.push(h('line', { x1: 20, y1: 50, x2: 20, y2: 70, stroke: '#fbbf24', strokeWidth: 3 }));
          svgChildren.push(h('line', { x1: 14, y1: 53, x2: 26, y2: 53, stroke: '#fbbf24', strokeWidth: 3 }));
          svgChildren.push(h('line', { x1: 17, y1: 67, x2: 23, y2: 67, stroke: '#fbbf24', strokeWidth: 2 }));
          svgChildren.push(h('text', { x: 30, y: 64, fill: '#fbbf24', fontSize: 10, fontWeight: 'bold' }, s.battery + ' V'));
          // Wire connections vary by topology
          if (s.topology === 'simple') {
            svgChildren.push(h('line', { x1: 20, y1: 70, x2: 20, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 110, x2: 180, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 180, y1: 110, x2: 180, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 180, y1: 60, x2: 145, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 50, x2: 95, y2: 50, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 95, y1: 50, x2: 95, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('circle', { cx: 120, cy: 60, r: 14, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 120, y: 63, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[0].R + 'Ω'));
          } else if (s.topology === 'series') {
            svgChildren.push(h('line', { x1: 20, y1: 70, x2: 20, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 110, x2: 220, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 220, y1: 110, x2: 220, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 220, y1: 60, x2: 195, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 165, y1: 60, x2: 115, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 85, y1: 60, x2: 20, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 60, x2: 20, y2: 50, stroke: '#cbd5e1', strokeWidth: 2 }));
            // bulb 1
            svgChildren.push(h('circle', { cx: 100, cy: 60, r: 14, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 100, y: 63, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[0].R + 'Ω'));
            // bulb / resistor 2
            if (bulbs[1].isBulb === false) {
              svgChildren.push(h('rect', { x: 165, y: 53, width: 30, height: 14, fill: '#94a3b8', stroke: '#475569', strokeWidth: 2 }));
              svgChildren.push(h('text', { x: 180, y: 63, textAnchor: 'middle', fontSize: 9, fill: 'white', fontWeight: 'bold' }, bulbs[1].R + 'Ω'));
            } else {
              svgChildren.push(h('circle', { cx: 180, cy: 60, r: 14, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
              svgChildren.push(h('text', { x: 180, y: 63, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[1].R + 'Ω'));
            }
          } else if (s.topology === 'parallel') {
            // Top + bottom wires
            svgChildren.push(h('line', { x1: 20, y1: 50, x2: 200, y2: 50, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 70, x2: 200, y2: 70, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 100, y1: 50, x2: 100, y2: 38, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 100, y1: 70, x2: 100, y2: 82, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 170, y1: 50, x2: 170, y2: 38, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 170, y1: 70, x2: 170, y2: 82, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('circle', { cx: 100, cy: 28, r: 12, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 100, y: 31, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[0].R + 'Ω'));
            svgChildren.push(h('circle', { cx: 100, cy: 92, r: 12, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 100, y: 95, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[1].R + 'Ω'));
            // close circuit via battery
          }
          return h('svg', { viewBox: '0 0 250 130', width: '100%', style: { maxWidth: 280, height: 'auto', background: 'var(--allo-stem-deeper, rgba(15,23,42,0.85))', borderRadius: 8, padding: 4 } }, svgChildren);
        }
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '💡 Predict the bulb'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            'Look at the circuit. Predict what you think will happen ', h('em', null, 'before'), ' clicking "Show answer". This is how scientists work — commit to a hypothesis first; the result is more memorable.'),
          POE_SCENARIOS.map(function(scenario, i) {
            var stg = state.stage[scenario.id] || { picked: null, revealed: false };
            return h('div', { key: scenario.id, className: 'mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200' },
              h('div', { className: 'flex items-baseline gap-2 mb-2' },
                h('span', { className: 'text-[10px] font-mono text-amber-700 font-bold' }, '#' + (i + 1)),
                h('span', { className: 'text-[12px] font-black text-slate-800' }, scenario.title)
              ),
              drawSchematic(scenario),
              h('div', { className: 'mt-2 text-[11px] font-bold text-slate-700' }, scenario.predict.question),
              h('div', { className: 'flex flex-wrap gap-1 mt-1' },
                scenario.predict.options.map(function(opt, oi) {
                  var picked = stg.picked === oi;
                  var revealed = stg.revealed;
                  var correct = scenario.answerIndex === oi;
                  var bg = revealed
                    ? (correct ? 'bg-green-600 text-white border-green-700' : (picked ? 'bg-red-100 text-red-800 border-red-300 line-through' : 'bg-white text-slate-500 border-slate-200'))
                    : (picked ? 'bg-amber-200 text-amber-900 border-amber-400' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:bg-amber-50 active:scale-[0.97]');
                  return h('button', {
                    key: oi,
                    disabled: revealed,
                    onClick: function() {
                      var newStage = Object.assign({}, state.stage);
                      newStage[scenario.id] = { picked: oi, revealed: false };
                      setPoe({ stage: newStage });
                    },
                    'aria-pressed': picked ? 'true' : 'false',
                    className: 'px-2 py-1 rounded text-[11px] font-bold border transition-colors ' + bg
                  }, opt);
                })
              ),
              h('div', { className: 'mt-2 flex items-center gap-2' },
                h('button', {
                  disabled: stg.picked == null || stg.revealed,
                  onClick: function() {
                    var newStage = Object.assign({}, state.stage);
                    newStage[scenario.id] = { picked: stg.picked, revealed: true };
                    var bonus = scenario.answerIndex === stg.picked ? 1 : 0;
                    setPoe({ stage: newStage, score: (state.score || 0) + bonus });
                  },
                  className: 'transition-colors px-3 py-1 rounded-md text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber-400 focus:outline-none active:scale-[0.97]'
                }, stg.revealed ? '✓ Revealed' : 'Show answer'),
                stg.revealed && h('span', { className: 'text-[11px] ' + (scenario.answerIndex === stg.picked ? 'text-green-700 font-bold' : 'text-rose-700 font-bold') },
                  scenario.answerIndex === stg.picked ? '✓ Correct' : '✗ Try the reasoning')
              ),
              stg.revealed && h('div', { className: 'mt-2 p-2 rounded bg-amber-50 border-l-4 border-l-amber-400 text-[11px] text-slate-700 leading-relaxed' },
                h('strong', { className: 'text-amber-900' }, 'Why: '), __alloT('stem.circuit.' + (scenario.id) + '_explanation', scenario.explanation))
            );
          }),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2' },
            h('span', null, '🎯'),
            h('strong', null, 'Score: ' + (state.score || 0) + ' / ' + POE_SCENARIOS.length),
            h('span', { className: 'text-slate-500 ml-2 italic' }, 'Each scenario commits you to a prediction; getting the reasoning matters more than the score.')
          )
        );
      }

      // ── Cycle 6 of the inquiry-learning study: MULTI-STEP SOCRATIC REVEAL ──
      // Addresses the recurrent critic complaint across cycles 2-5: "single-sentence reveal,
      // no scaffolded hint progression." When the learner answers wrong, the reveal is not
      // the answer — it's a follow-up sub-question that elicits the missing reasoning step.
      // Only after 2 wrong attempts does the actual explanation surface.
      var FAIL_DX_CASES = [
        {
          id: 'd1',
          title: 'A 9V battery powering a 5V LED — no resistor in the circuit.',
          symptom: 'The LED flashes brightly for ~half a second, then goes dark and stays dark even after reconnecting.',
          rootCause: 'overcurrent_burnout',
          // Level 0: top-level question
          q0: {
            ask: 'What killed the LED?',
            options: [
              { id: 'voltage_too_low', label: 'The battery voltage was too low' },
              { id: 'overcurrent_burnout', label: 'Overcurrent burnt out the LED (no current-limiting resistor)' },
              { id: 'battery_dead', label: 'The battery is dead' },
              { id: 'wires_disconnected', label: 'A wire came loose' }
            ]
          },
          // Level 1: after wrong, dig into the relationship
          q1: {
            ask: 'Right idea to investigate. Now: the LED is rated for 5V at 20mA. The battery puts out 9V. What does Ohm’s law say about current when more voltage is forced through the same resistance?',
            options: [
              { id: 'current_drops', label: 'Current decreases (V↑ → I↓)' },
              { id: 'current_rises', label: 'Current rises (V↑ → I↑)' },
              { id: 'current_constant', label: 'Current stays the same' }
            ]
          },
          // Level 2: scaffold the final reveal
          q2: {
            ask: 'Exactly — current scales with voltage. What’s missing from this circuit that should have prevented the overcurrent?',
            options: [
              { id: 'fuse', label: 'A fuse' },
              { id: 'resistor', label: 'A current-limiting resistor in series with the LED' },
              { id: 'switch', label: 'A switch' }
            ]
          },
          finalExplanation: 'Without a series resistor, the LED sees the full 9V. Ohm’s law: I = (9V − V_LED) / R. With R≈0, current rockets to hundreds of mA — far past the 20mA rating — and the LED dies of thermal damage in milliseconds. A small resistor (e.g., 220Ω) drops the excess voltage and limits current to safe levels.',
          q1CorrectId: 'current_rises',
          q2CorrectId: 'resistor'
        },
        {
          id: 'd2',
          title: 'Two bulbs in series — but one is much dimmer than the other.',
          symptom: 'Bulb A glows brightly. Bulb B (same brand, same rating supposedly) glows so dimly you can barely see it.',
          rootCause: 'mismatched_resistance',
          q0: {
            ask: 'Why is bulb B much dimmer?',
            options: [
              { id: 'mismatched_resistance', label: 'Bulb B has LOWER resistance. In series both bulbs share the same current, and power = I² × R, so the lower-resistance bulb dissipates less power and glows dimmer.' },
              { id: 'farther_from_battery', label: 'Bulb B is farther from the battery — voltage drops over the wire' },
              { id: 'wrong_polarity', label: 'Bulb B is wired backward' },
              { id: 'bulb_dying', label: 'Bulb B is about to burn out' }
            ]
          },
          q1: {
            ask: 'Series circuits share the same CURRENT through every component. If bulb B has different resistance from bulb A, which statement is true?',
            options: [
              { id: 'voltage_splits_by_R', label: 'Voltage across each bulb splits in proportion to its resistance (more R → more V)' },
              { id: 'voltage_equal', label: 'Each bulb gets the same voltage regardless of resistance' },
              { id: 'voltage_inverse', label: 'Voltage splits inversely with resistance (more R → less V)' }
            ]
          },
          q2: {
            ask: 'V_bulb = I × R_bulb, and P = I² × R. Bulb B is the dimmer one. Compared with bulb A, what must be true of bulb B?',
            options: [
              { id: 'B_more_power', label: 'Bulb B dissipates more power than A and should be brighter' },
              { id: 'B_lower_power', label: 'Bulb B has lower resistance, so with the shared current it dissipates less power (P = I² × R) and drops less voltage, which is why it is dimmer' },
              { id: 'same_power', label: 'Same power, same brightness' }
            ]
          },
          finalExplanation: 'In series, the SAME current flows through both bulbs. Power follows P = I²R, so with the current shared, the bulb with the LOWER resistance dissipates LESS power and glows dimmer. Bulb B is dimmer because it has the lower resistance: it also drops less voltage (V = I × R). The higher-resistance bulb (A) drops more voltage AND dissipates more power, so it is brighter. The counterintuitive part of series circuits: with a shared current, the lower-resistance bulb is the dim one, because brightness here tracks power (I²R).',
          q1CorrectId: 'voltage_splits_by_R',
          q2CorrectId: 'B_lower_power'
        },
        {
          id: 'd3',
          title: 'A circuit with a "missing wire" — but the multimeter shows continuity everywhere.',
          symptom: 'Schematic shows three components on a single wire from + to −. Visually you check: all components connected, no breaks in any wire. Yet the bulb doesn’t light, and the multimeter beeps continuity from end to end.',
          rootCause: 'short_circuit',
          q0: {
            ask: 'What’s the most likely fault?',
            options: [
              { id: 'short_circuit', label: 'A short circuit somewhere — current is bypassing the bulb' },
              { id: 'open_circuit', label: 'An open circuit — current can’t flow' },
              { id: 'low_battery', label: 'Battery is dead' },
              { id: 'bulb_burnt', label: 'Bulb is burnt out' }
            ]
          },
          q1: {
            ask: 'Multimeter beeps continuity, which means there IS a complete current path. If the bulb itself isn’t lighting up, what does that tell you about where the current is actually flowing?',
            options: [
              { id: 'current_through_bulb', label: 'Current is flowing through the bulb (just too little)' },
              { id: 'current_bypassing', label: 'Current is taking a path that BYPASSES the bulb' },
              { id: 'no_current', label: 'No current is flowing' }
            ]
          },
          q2: {
            ask: 'Yes — current always takes the path of least resistance. If a stray wire (or solder bridge) connects the two ends of the bulb directly, what does that wire offer compared to the bulb’s filament?',
            options: [
              { id: 'higher_R', label: 'Higher resistance — current still goes through the bulb' },
              { id: 'much_lower_R', label: 'Much lower resistance — current bypasses the bulb almost entirely' },
              { id: 'same_R', label: 'Same resistance — current splits 50/50' }
            ]
          },
          finalExplanation: 'A short circuit across the bulb gives current a near-zero-resistance bypass. By V = IR, almost all current flows through the short (lots of current, almost no voltage drop) and virtually none through the bulb (tiny current, but the bulb still has its full resistance). The multimeter beeps because the overall circuit IS continuous — it just doesn’t test which path the current prefers. Always check for stray solder, frayed wires, or accidental shorts touching across components.',
          q1CorrectId: 'current_bypassing',
          q2CorrectId: 'much_lower_R'
        }
      ];

      function renderFailDxSection() {
        var state = d2.failDx || { cases: {}, score: 0, depthBonus: 0 };
        function setFD(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.circuit) || {};
            var st = Object.assign({}, prior.failDx || state, patch);
            return Object.assign({}, prev, { circuit: Object.assign({}, prior, { failDx: st }) });
          });
        }
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '🛠 Why did it fail? — Socratic diagnostics'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            'Three broken circuits. Diagnose the root cause. If you’re wrong, you don’t get the answer — you get a follow-up question to fill the missing reasoning step. After two wrong attempts you’ll see the explanation. Right on the first try? Bonus points + the explanation.'),
          FAIL_DX_CASES.map(function(c, idx) {
            var st = state.cases[c.id] || { depth: 0, picks: [], resolved: false, firstTryCorrect: false };
            var depth = st.depth || 0;
            var picks = st.picks || [];
            var currentQ = depth === 0 ? c.q0 : (depth === 1 ? c.q1 : c.q2);
            var isAtFinal = st.resolved;
            function handlePick(optionId) {
              var newPicks = picks.concat([{ depth: depth, picked: optionId }]);
              var newCases = Object.assign({}, state.cases);
              if (depth === 0) {
                if (optionId === c.rootCause) {
                  newCases[c.id] = { depth: 0, picks: newPicks, resolved: true, firstTryCorrect: true };
                  setFD({ cases: newCases, score: (state.score || 0) + 1, depthBonus: (state.depthBonus || 0) + 2 });
                } else {
                  newCases[c.id] = { depth: 1, picks: newPicks, resolved: false, firstTryCorrect: false };
                  setFD({ cases: newCases });
                }
              } else if (depth === 1) {
                if (optionId === c.q1CorrectId) {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: false, firstTryCorrect: false };
                } else {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: false, firstTryCorrect: false };
                }
                setFD({ cases: newCases });
              } else {
                if (optionId === c.q2CorrectId) {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: true, firstTryCorrect: false };
                  setFD({ cases: newCases, score: (state.score || 0) + 0.5, depthBonus: (state.depthBonus || 0) + 1 });
                } else {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: true, firstTryCorrect: false };
                  setFD({ cases: newCases });
                }
              }
            }
            return h('div', { key: c.id, className: 'mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200' },
              h('div', { className: 'flex items-baseline gap-2 mb-1' },
                h('span', { className: 'text-[10px] font-mono text-amber-700 font-bold' }, '#' + (idx + 1)),
                h('span', { className: 'text-[12px] font-black text-slate-800' }, c.title)
              ),
              h('div', { className: 'text-[11px] text-slate-700 italic mb-2' }, h('strong', null, 'Observed: '), c.symptom),
              !isAtFinal && h('div', null,
                depth > 0 && h('div', { className: 'mb-1 text-[10px] uppercase tracking-wider text-amber-700 font-bold' }, 'Scaffold question ' + depth + ' of 2'),
                h('div', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, currentQ.ask),
                h('div', { className: 'flex flex-wrap gap-1 mb-2' },
                  currentQ.options.map(function(opt) {
                    return h('button', {
                      key: opt.id,
                      onClick: function() { handlePick(opt.id); },
                      className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold border bg-white text-slate-600 border-slate-300 hover:bg-amber-50 hover:border-amber-300 focus:ring-2 focus:ring-amber-400 focus:outline-none active:scale-[0.97]'
                    }, opt.label);
                  })
                ),
                depth > 0 && h('p', { className: 'text-[10px] text-amber-700 italic' }, '(Your previous answer triggered this follow-up. The next reveal will explain.)')
              ),
              isAtFinal && h('div', null,
                h('div', { className: 'p-2 rounded bg-amber-50 border-l-4 border-l-amber-400 mb-2' },
                  h('div', { className: 'text-[12px] font-black text-amber-900 mb-1' },
                    st.firstTryCorrect ? '✓ First-try diagnosis correct! (+1 case score, +2 depth bonus)' : 'Resolved after ' + picks.length + ' attempts (+ partial credit)'
                  ),
                  h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, h('strong', null, 'Root cause + reasoning: '), c.finalExplanation)
                ),
                h('div', { className: 'text-[10px] text-slate-500 italic' },
                  'Your reasoning path: ' + picks.map(function(p) { return p.picked; }).join(' → ')
                )
              )
            );
          }),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2 flex-wrap' },
            h('span', null, '🎯'),
            h('strong', null, 'Case score: ' + (state.score || 0).toFixed(1) + ' / ' + FAIL_DX_CASES.length),
            h('strong', { className: 'ml-2 text-amber-700' }, 'Depth bonus: +' + (state.depthBonus || 0)),
            h('span', { className: 'text-slate-500 ml-2 italic' }, 'Multi-step reveals — wrong answers earn follow-up questions, not just corrections.')
          )
        );
      }

      function renderGlossarySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📖 Circuit glossary'),
          h('div', { className: 'space-y-1' },
            CIRCUIT_GLOSSARY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-amber-900' }, g.term),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — Additional circuits references (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var RESISTOR_COLORS = [
        { color: 'Black', value: 0, mult: '×1', tol: '' },
        { color: 'Brown', value: 1, mult: '×10', tol: '±1%' },
        { color: 'Red', value: 2, mult: '×100', tol: '±2%' },
        { color: 'Orange', value: 3, mult: '×1k', tol: '' },
        { color: 'Yellow', value: 4, mult: '×10k', tol: '' },
        { color: 'Green', value: 5, mult: '×100k', tol: '±0.5%' },
        { color: 'Blue', value: 6, mult: '×1M', tol: '±0.25%' },
        { color: 'Violet', value: 7, mult: '×10M', tol: '±0.1%' },
        { color: 'Gray', value: 8, mult: '×100M', tol: '±0.05%' },
        { color: 'White', value: 9, mult: '×1G', tol: '' },
        { color: 'Gold', value: '—', mult: '×0.1', tol: '±5%' },
        { color: 'Silver', value: '—', mult: '×0.01', tol: '±10%' },
        { color: 'None', value: '—', mult: '—', tol: '±20%' }
      ];

      var CAPACITOR_TYPES = [
        { type: 'Ceramic', range: 'pF – µF', voltage: 'up to ~5 kV', notes: 'Cheap, small. Non-polarized. Used for decoupling, RF.' },
        { type: 'Electrolytic (aluminum)', range: 'µF – F', voltage: 'low to medium (~600 V)', notes: 'Polarized! Marked + and −. Power supply filtering. Dries out over time.' },
        { type: 'Tantalum', range: '0.1 µF – 100 µF', voltage: 'low (~50 V)', notes: 'Polarized. More stable than aluminum. Don\'t exceed voltage rating — can catch fire.' },
        { type: 'Film (polyester, polypropylene)', range: 'pF – µF', voltage: 'wide range', notes: 'Non-polarized. Stable. Audio, timing circuits.' },
        { type: 'Mica', range: 'pF – nF', voltage: 'high', notes: 'Very stable. RF circuits, oscillators.' },
        { type: 'Supercapacitor (EDLC)', range: '0.1 F – kF', voltage: 'low (~2.7 V per cell)', notes: 'Stores enormous energy. Backup power, regenerative braking, KERS in F1.' }
      ];

      var CAPACITOR_FORMULAS = [
        { name: 'Charge', formula: 'Q = C·V', plain: 'Total charge stored = capacitance × voltage.' },
        { name: 'Energy', formula: 'E = ½·C·V²', plain: 'Energy in joules stored on a charged cap.' },
        { name: 'Parallel combination', formula: 'C_total = C₁ + C₂ + ...', plain: 'Capacitors in parallel ADD (opposite of resistors).' },
        { name: 'Series combination', formula: '1/C_total = 1/C₁ + 1/C₂ + ...', plain: 'Capacitors in series — reciprocal sum (opposite of resistors).' },
        { name: 'RC time constant', formula: 'τ = R·C', plain: 'After τ, capacitor charged to ~63% of supply voltage. ~5τ → fully charged.' },
        { name: 'Impedance (AC)', formula: 'X_C = 1/(2π·f·C)', plain: 'Impedance decreases with frequency. Caps block DC, pass AC.' }
      ];

      var INDUCTOR_NOTES = [
        { topic: 'What it does', detail: 'Stores energy in a magnetic field. Resists changes in current (Lenz\'s law).' },
        { topic: 'Henry (H)', detail: 'Unit: 1 H = 1 V·s/A. Typical values: μH (radios) to H (transformers).' },
        { topic: 'Voltage formula', detail: 'V = L·(di/dt). Sudden current change → big voltage spike.' },
        { topic: 'Energy stored', detail: 'E = ½·L·I². Like ½CV² but for inductors.' },
        { topic: 'Series', detail: 'L_total = L₁ + L₂ + ... (like resistors).' },
        { topic: 'Parallel', detail: '1/L_total = 1/L₁ + 1/L₂ + ... (like resistors).' },
        { topic: 'RL time constant', detail: 'τ = L/R. Current grows to ~63% after τ seconds.' },
        { topic: 'Impedance (AC)', detail: 'X_L = 2π·f·L. Increases with frequency — opposite of capacitors.' },
        { topic: 'Resonance', detail: 'LC circuit resonates at f₀ = 1/(2π·√(LC)). Used in radio tuners.' },
        { topic: 'Real-world: transformers', detail: 'Two coupled inductors. V₂/V₁ = N₂/N₁ (turns ratio). Step up or step down AC voltage.' },
        { topic: 'Real-world: ignition coil', detail: 'Stores energy in primary, releases to plug via collapsing field — 20,000 V+ spark.' },
        { topic: 'Real-world: switching power supplies', detail: 'Buck/boost converters use inductors to efficiently change DC voltage.' }
      ];

      var SEMICONDUCTORS = [
        { device: 'Diode', symbol: '▷|', behavior: 'Conducts in one direction (anode → cathode); blocks the other.', use: 'Rectifiers, signal demodulation, reverse-polarity protection. ~0.7 V forward drop (Si).' },
        { device: 'LED (light-emitting diode)', symbol: '▷| with arrows', behavior: 'Diode that emits photons when forward biased. Voltage drop depends on color (red ~1.8 V, blue ~3.3 V).', use: 'Indicators, lighting, displays.' },
        { device: 'Zener diode', symbol: '▷ǁ', behavior: 'Breaks down at a specific reverse voltage (Vz). Used in reverse mode.', use: 'Voltage references, regulation.' },
        { device: 'Schottky diode', symbol: '▷| with hooks', behavior: 'Metal-semiconductor junction. Low forward drop (~0.3 V), fast switching.', use: 'High-efficiency rectifiers, RF.' },
        { device: 'BJT (NPN)', symbol: 'three terminals', behavior: 'Base current controls collector→emitter current. Active when V_BE ≈ 0.7 V.', use: 'Amplifiers, switches. Current gain (β or h_FE) typically 50-300.' },
        { device: 'BJT (PNP)', symbol: 'three terminals (arrow in)', behavior: 'Complement of NPN. Current flows emitter→collector.', use: 'High-side switching, complementary pairs.' },
        { device: 'MOSFET (N-channel)', symbol: 'three terminals + gate insulated', behavior: 'Gate voltage controls drain-source channel. Very high input impedance.', use: 'Modern logic (CMOS), power switching. Used in nearly every integrated circuit.' },
        { device: 'MOSFET (P-channel)', symbol: 'three terminals (complementary)', behavior: 'Complement of N-channel.', use: 'Paired with N-channel for CMOS logic.' },
        { device: 'JFET', symbol: 'three terminals', behavior: 'Junction FET. Depletion-mode (normally ON).', use: 'High-impedance amplifiers, oscillators. Less common today than MOSFETs.' },
        { device: 'IGBT', symbol: 'BJT-MOSFET hybrid', behavior: 'MOSFET gate + BJT-like output. High-power switching.', use: 'EV inverters, induction cookers, welders.' },
        { device: 'Thyristor (SCR)', symbol: 'four-layer device', behavior: 'Once triggered, stays on until current drops to zero.', use: 'AC power control, motor control.' },
        { device: 'Triac', symbol: 'bidirectional thyristor', behavior: 'Like SCR but works in both directions.', use: 'Light dimmers, AC motor speed control.' }
      ];

      var OPAMP_CONFIGS = [
        { name: 'Voltage follower (buffer)', gain: '1', use: 'Impedance matching. Output exactly tracks input. No loading on the source.' },
        { name: 'Inverting amplifier', gain: '−R_f/R_in', use: 'Inverts signal, scales by ratio of feedback to input resistor.' },
        { name: 'Non-inverting amplifier', gain: '1 + R_f/R_g', use: 'Same phase as input, gain always ≥ 1.' },
        { name: 'Summing amplifier', gain: '−(V₁/R₁ + V₂/R₂ + ...)·R_f', use: 'Add multiple signals (with optional scaling). Used in audio mixers.' },
        { name: 'Difference amplifier', gain: '(V₂ − V₁) × R_f/R_in', use: 'Subtract two signals. Sensor differential measurements.' },
        { name: 'Integrator', gain: '−1/(RC) ∫', use: 'Output = time-integral of input. Triangle from square wave.' },
        { name: 'Differentiator', gain: '−RC × d/dt', use: 'Output ∝ rate of change. Noisy in practice without filtering.' },
        { name: 'Comparator', gain: '∞ (open loop)', use: 'Output saturates high or low. Used for threshold detection.' },
        { name: 'Schmitt trigger', gain: 'comparator with hysteresis', use: 'Cleans up noisy signals. Two thresholds (rising vs falling).' },
        { name: 'Instrumentation amp', gain: '1 + 2R/R_gain', use: 'High input impedance differential amp. Strain gauges, biomedical sensors.' }
      ];

      var FILTERS = [
        { type: 'Passive RC low-pass', cutoff: 'f_c = 1/(2π·RC)', behavior: 'Passes DC + low frequencies; attenuates high.', use: 'Anti-aliasing before ADC. Smoothing.' },
        { type: 'Passive RC high-pass', cutoff: 'f_c = 1/(2π·RC)', behavior: 'Passes high frequencies; blocks DC.', use: 'AC coupling (block DC offset). DC blocker for speakers.' },
        { type: 'LC bandpass', cutoff: 'centered on resonance', behavior: 'Passes a narrow frequency band.', use: 'Radio receiver tuning.' },
        { type: 'LC band-reject (notch)', cutoff: 'centered on resonance', behavior: 'Blocks a narrow band.', use: 'Remove 50/60 Hz mains hum.' },
        { type: 'Active op-amp low-pass', cutoff: 'designed', behavior: 'Sharper rolloff than passive. Can have gain.', use: 'Audio filters, signal conditioning.' },
        { type: 'Butterworth filter', cutoff: 'designed', behavior: 'Maximally flat passband.', use: 'When passband flatness matters.' },
        { type: 'Chebyshev filter', cutoff: 'designed', behavior: 'Steeper roll-off with passband ripple.', use: 'When sharp transition matters more than ripple.' },
        { type: 'Bessel filter', cutoff: 'designed', behavior: 'Maximally flat group delay (linear phase).', use: 'Audio. Pulse waveform integrity.' },
        { type: 'Digital FIR/IIR', cutoff: 'designed', behavior: 'Implemented in software/DSP.', use: 'Modern audio, comms, sensor data. Linear-phase FIR is unconditionally stable.' }
      ];

      var POWER_SUPPLIES = [
        { type: 'Linear regulator', efficiency: '~30-60%', notes: 'Burns off excess voltage as heat. Quiet output. LM7805, LM317 classics.' },
        { type: 'Switching regulator (buck)', efficiency: '~85-95%', notes: 'Steps voltage DOWN. PWM + inductor.' },
        { type: 'Switching regulator (boost)', efficiency: '~85-95%', notes: 'Steps voltage UP. Single-cell devices that need 5 V from 1.5 V.' },
        { type: 'Switching regulator (buck-boost)', efficiency: '~80-92%', notes: 'Can step up or down. Output can be inverted in some topologies.' },
        { type: 'Flyback converter', efficiency: '~75-90%', notes: 'Isolated. Common in laptop chargers and most low-power wall warts.' },
        { type: 'Forward converter', efficiency: '~75-90%', notes: 'Like flyback but transformer stores no energy. Better for medium power.' },
        { type: 'Half/full-bridge converter', efficiency: '~85-95%', notes: 'High-power. Server power supplies, EV chargers.' },
        { type: 'Charge pump', efficiency: '~75-95%', notes: 'No inductor — uses caps to multiply voltage. Common in chips that need internal high voltage from low-V supply.' },
        { type: 'Linear AC transformer', efficiency: 'varies', notes: 'Heavy, big. Was standard before switching supplies took over. Still used in audio for low noise.' }
      ];

      var MOTORS_GENERATORS = [
        { type: 'DC brushed motor', use: 'Toys, small fans, drills', notes: 'Commutator + brushes reverse current. Simple, cheap. Brushes wear out.' },
        { type: 'DC brushless (BLDC)', use: 'Drones, EVs, computer fans', notes: 'Electronic commutation. No brush wear. Higher efficiency.' },
        { type: 'AC induction motor', use: 'Most industrial motors, EV traction', notes: 'Workhorse motor. Rotor follows rotating stator field. Tesla invented (1888).' },
        { type: 'AC synchronous motor', use: 'High-precision, generators in power plants', notes: 'Rotor rotates exactly with stator field. Used in clocks, large industrial.' },
        { type: 'Stepper motor', use: 'Printers, CNC, 3D printers', notes: 'Steps discrete angles per pulse. Open-loop position control without feedback.' },
        { type: 'Servo motor', use: 'Robotics, RC vehicles', notes: 'Motor + feedback + controller. Precise position/speed.' },
        { type: 'Linear motor', use: 'Maglev trains, CNC tables', notes: 'Force in straight line, no rotation. Same physics as rotary unrolled flat.' },
        { type: 'Generator (alternator)', use: 'Power plants, cars', notes: 'Mechanical → electrical. Faraday\'s law: changing magnetic flux induces voltage.' },
        { type: 'Piezo motor', use: 'Microscopes, camera lenses', notes: 'No magnets. Tiny ultrasonic vibrations move slider. Very precise + quiet.' }
      ];

      var FIELD_NOTES = [
        { topic: 'Electric field (E)', detail: 'Units V/m. Force per unit charge: F = qE. Points from + to − charge.' },
        { topic: 'Magnetic field (B)', detail: 'Units tesla (T) or gauss (1 T = 10,000 G). Force on moving charge: F = qv×B.' },
        { topic: 'Coulomb\'s law', detail: 'F = k·q₁·q₂/r². k ≈ 9×10⁹ N·m²/C². Inverse-square — same form as gravity.' },
        { topic: 'Gauss\'s law', detail: 'Total electric flux through closed surface = enclosed charge / ε₀.' },
        { topic: 'Ampère\'s law', detail: 'Line integral of B around closed loop = μ₀ × enclosed current.' },
        { topic: 'Faraday\'s law', detail: 'EMF = −dΦ_B/dt. Changing magnetic flux induces voltage. Basis of generators, transformers.' },
        { topic: 'Lenz\'s law', detail: 'Induced current opposes the change that caused it (negative sign in Faraday).' },
        { topic: 'Right-hand rule', detail: 'For B from current: thumb in current direction, fingers curl in B direction. For F on charge: thumb F, index v, middle B (orthogonal).' },
        { topic: 'Maxwell\'s equations', detail: 'Four equations completely describe classical electromagnetism. Predict EM waves at c.' },
        { topic: 'Permittivity (ε₀)', detail: '8.854×10⁻¹² F/m. Determines E-field strength.' },
        { topic: 'Permeability (μ₀)', detail: '4π×10⁻⁷ T·m/A. Determines B-field strength.' },
        { topic: 'Speed of light', detail: 'c = 1/√(ε₀·μ₀) ≈ 3×10⁸ m/s. Maxwell\'s amazing derivation.' }
      ];

      var WIRELESS_POWER = [
        { type: 'Inductive coupling (Qi standard)', range: '~1 cm', efficiency: '~60-80%', use: 'Phone wireless charging. Two coils, mutual inductance.' },
        { type: 'Resonant inductive coupling', range: '~10s of cm', efficiency: '~50-70%', use: 'WiTricity, mid-range wireless power.' },
        { type: 'Radio frequency (RF) harvesting', range: 'meters', efficiency: '< 10%', use: 'Powering tiny RFID tags. Very low power.' },
        { type: 'Microwave power transmission', range: 'km (line of sight)', efficiency: '~50%', use: 'Concept for space solar power. Demonstrated experimentally.' },
        { type: 'Laser power transmission', range: 'km', efficiency: '~30-50%', use: 'Powering drones, UAVs in flight. Direct beam — needs line-of-sight.' },
        { type: 'Capacitive coupling', range: 'mm-cm', efficiency: 'high (short range)', use: 'Used for some implantable devices. Less common than inductive.' }
      ];

      var UNITS_CONSTANTS = [
        { quantity: 'Charge (Q)', unit: 'coulomb (C)', notes: '1 C = 6.24×10¹⁸ electrons. AA battery delivers ~0.5 C/sec at 0.5 A.' },
        { quantity: 'Current (I)', unit: 'ampere (A)', notes: '1 A = 1 C/sec. Lethal current threshold: ~100 mA through chest.' },
        { quantity: 'Voltage (V)', unit: 'volt (V)', notes: '1 V = 1 J/C. AA: 1.5 V. Mains: 120/240 V. Tesla coil: kV-MV.' },
        { quantity: 'Resistance (R)', unit: 'ohm (Ω)', notes: '1 Ω = 1 V/A. Human skin (dry): ~100 kΩ. Wet: ~1 kΩ — much more dangerous.' },
        { quantity: 'Conductance (G)', unit: 'siemens (S)', notes: '1 S = 1 / Ω. Used in some calculations (admittance).' },
        { quantity: 'Power (P)', unit: 'watt (W)', notes: '1 W = 1 J/s = 1 V·A. Light bulb: ~10 W (LED). Hair dryer: ~1500 W.' },
        { quantity: 'Energy (E)', unit: 'joule (J), kWh', notes: '1 kWh = 3.6×10⁶ J. US household: ~30 kWh/day.' },
        { quantity: 'Capacitance (C)', unit: 'farad (F)', notes: '1 F is huge — most caps are µF, nF, pF.' },
        { quantity: 'Inductance (L)', unit: 'henry (H)', notes: 'Big in transformers; mH-µH in RF.' },
        { quantity: 'Frequency (f)', unit: 'hertz (Hz)', notes: 'Cycles per second. Mains: 50 Hz (most world) or 60 Hz (Americas).' },
        { quantity: 'Magnetic flux (Φ)', unit: 'weber (Wb)', notes: '1 Wb = 1 V·s. Voltage induced when flux changes.' },
        { quantity: 'Magnetic flux density (B)', unit: 'tesla (T)', notes: 'Earth\'s field: ~50 µT. MRI: 1.5-7 T. Strongest lab magnets: ~45 T continuous.' },
        { quantity: 'Elementary charge (e)', unit: '1.602×10⁻¹⁹ C', notes: 'Smallest unit of free charge.' },
        { quantity: 'Electron mass', unit: '9.109×10⁻³¹ kg', notes: '1/1836 of proton mass.' },
        { quantity: 'Planck constant (h)', unit: '6.626×10⁻³⁴ J·s', notes: 'Quantum of action. Connects energy + frequency: E = hf.' },
        { quantity: 'Boltzmann constant (k_B)', unit: '1.381×10⁻²³ J/K', notes: 'Connects temperature + energy. Thermal voltage at 300 K: ~26 mV.' }
      ];

      var ELECTRICITY_HISTORY = [
        { year: '1600', who: 'William Gilbert', what: 'Coined "electricity" (Latin: electricus, "like amber"). Distinguished electricity from magnetism.' },
        { year: '1745', who: 'von Kleist + van Musschenbroek', what: 'Leyden jar — first capacitor. Stored electrical charge.' },
        { year: '1752', who: 'Benjamin Franklin', what: 'Kite experiment showed lightning is electricity. Invented lightning rod.' },
        { year: '1799', who: 'Alessandro Volta', what: 'Invented voltaic pile — first chemical battery. "Voltage" named for him.' },
        { year: '1820', who: 'Hans Christian Ørsted', what: 'Showed current creates magnetic field. United electricity + magnetism.' },
        { year: '1827', who: 'Georg Ohm', what: 'Ohm\'s law: V = IR.' },
        { year: '1831', who: 'Michael Faraday', what: 'Electromagnetic induction. Basis for generators + transformers.' },
        { year: '1864', who: 'James Clerk Maxwell', what: 'Maxwell\'s equations unified electromagnetism. Predicted light as EM wave.' },
        { year: '1879', who: 'Thomas Edison', what: 'Practical incandescent bulb. Built DC power systems.' },
        { year: '1888', who: 'Nikola Tesla', what: 'Practical AC induction motor + polyphase power systems. AC won "War of the Currents".' },
        { year: '1897', who: 'J.J. Thomson', what: 'Discovered the electron. First subatomic particle.' },
        { year: '1947', who: 'Bardeen, Brattain, Shockley (Bell Labs)', what: 'Invented the transistor. Started semiconductor revolution.' },
        { year: '1958', who: 'Jack Kilby + Robert Noyce', what: 'Integrated circuit — multiple transistors on one chip.' },
        { year: '1971', who: 'Intel', what: 'Intel 4004 — first commercial microprocessor (2,300 transistors).' },
        { year: '2010s+', who: 'Many', what: 'Renewable + storage scale rapidly. Lithium-ion batteries → EVs at scale.' }
      ];

      function renderResistorSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 Resistor color code'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'For 4-band resistors: first 2 bands = digits, 3rd = multiplier, 4th = tolerance. Mnemonic: "Big Boys Race Our Young Girls But Violet Generally Wins".'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Resistor color code reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Color', 'Digit', 'Multiplier', 'Tolerance'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                RESISTOR_COLORS.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, c.color),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold' }, c.value),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.mult),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-600' }, c.tol)
                  );
                })
              )
            )
          ),
          h('div', { className: 'mt-3 p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            h('strong', null, 'Example: '), 'Red-Red-Brown-Gold = 22 × 10 = 220 Ω, ±5% tolerance.'
          )
        );
      }

      function renderCapacitorSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⎮⎮ Capacitors'),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Common types'),
            h('div', { className: 'space-y-1' },
              CAPACITOR_TYPES.map(function(c, i) {
                return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-0.5 flex-wrap' },
                    h('span', { className: 'text-[11px] font-black text-slate-800' }, c.type),
                    h('span', { className: 'text-[10px] font-mono text-amber-700 ml-auto' }, c.range),
                    h('span', { className: 'text-[10px] font-mono text-slate-600' }, c.voltage)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700' }, c.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Key formulas'),
          h('div', { className: 'space-y-1' },
            CAPACITOR_FORMULAS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[11px] font-black text-slate-800' }, f.name),
                  h('span', { className: 'text-[11px] font-mono ml-auto text-amber-700 font-bold' }, f.formula)
                ),
                h('div', { className: 'text-[10px] text-slate-700' }, f.plain)
              );
            })
          )
        );
      }

      function renderInductorSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∿∿ Inductors'),
          h('div', { className: 'space-y-1' },
            INDUCTOR_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-amber-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderSemiconSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌐ Semiconductor devices'),
          h('div', { className: 'space-y-2' },
            SEMICONDUCTORS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, s.device),
                  h('span', { className: 'text-[10px] font-mono text-amber-700 ml-auto px-2 py-0.5 rounded bg-amber-100' }, s.symbol)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Behavior: '), s.behavior),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Use: '), s.use)
              );
            })
          )
        );
      }

      function renderOpampSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '▷ Op-amp configurations'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Op-amp = operational amplifier. High gain (~100,000+), high input impedance, low output impedance. Used with feedback for predictable behavior.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Operational amplifier configurations'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Configuration', 'Gain', 'Use'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                OPAMP_CONFIGS.map(function(o, i) {
                  return h('tr', { key: 'o'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, o.name),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold' }, o.gain),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, o.use)
                  );
                })
              )
            )
          )
        );
      }

      function renderFiltersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌒ Filters'),
          h('div', { className: 'space-y-2' },
            FILTERS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, f.type),
                  h('span', { className: 'text-[10px] font-mono text-amber-700 ml-auto' }, f.cutoff)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Behavior: '), f.behavior),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Use: '), f.use)
              );
            })
          )
        );
      }

      function renderPowerSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔋 Power supply topologies'),
          h('div', { className: 'space-y-2' },
            POWER_SUPPLIES.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, p.type),
                  h('span', { className: 'text-[10px] font-mono text-amber-700 ml-auto px-2 py-0.5 rounded bg-amber-100 font-bold' }, p.efficiency)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, p.notes)
              );
            })
          )
        );
      }

      function renderMotorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚙ Motors & generators'),
          h('div', { className: 'space-y-2' },
            MOTORS_GENERATORS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, m.type),
                h('div', { className: 'text-[10px] text-amber-700 italic mb-1' }, '→ ' + m.use),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.notes)
              );
            })
          )
        );
      }

      function renderFieldsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ Electric & magnetic fields'),
          h('div', { className: 'space-y-1' },
            FIELD_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-amber-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderWirelessSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📶 Wireless power transmission'),
          h('div', { className: 'space-y-2' },
            WIRELESS_POWER.map(function(w, i) {
              return h('div', { key: 'w'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, w.type),
                  h('span', { className: 'text-[10px] font-mono text-amber-700' }, 'Range: ' + w.range),
                  h('span', { className: 'text-[10px] font-mono text-slate-600' }, 'η: ' + w.efficiency)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, w.use)
              );
            })
          )
        );
      }

      function renderUnitsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∑ Units & constants'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Electrical units and constants'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Quantity', 'Unit', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                UNITS_CONSTANTS.map(function(u, i) {
                  return h('tr', { key: 'u'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, u.quantity),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold' }, u.unit),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, u.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderFamousSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 History of electricity & electronics'),
          h('div', { className: 'space-y-2' },
            ELECTRICITY_HISTORY.map(function(e, i) {
              return h('div', { key: 'e'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  h('span', { className: 'text-[10px] font-mono text-amber-700 font-bold' }, e.year),
                  h('span', { className: 'text-[12px] font-black text-amber-900' }, e.who)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, e.what)
              );
            })
          )
        );
      }

      function renderOhmInquirySection() {
        var iq = d2.ohmInquiry || { voltage: 9, resistance: 100, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { setExp({ ohmInquiry: Object.assign({}, iq, patch) }); }
        function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
        var current = iq.voltage / Math.max(0.01, iq.resistance); // A
        var power = iq.voltage * current; // W
        var mA = current * 1000;
        // discrete safety state
        var state = power < 0.25 ? 'tiny' : power < 1 ? 'lowpower' : power < 5 ? 'midpower' : power < 25 ? 'hot' : 'dangerous';
        var sm = ({
          tiny: { label: 'Tiny load', color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: 'Sub-watt. Anything from a quarter-watt resistor will handle this fine.' },
          lowpower: { label: 'Low power', color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: 'Up to ~1 W. Use a half-watt resistor or larger. Battery-friendly.' },
          midpower: { label: 'Mid power', color: '#facc15', bg: '#2a2410', border: '#eab308', desc: '1–5 W. Resistor will warm; consider 5 W component or heatsink.' },
          hot: { label: 'Hot', color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: '5–25 W. Resistor will get hot enough to burn skin. Mount on heatsink.' },
          dangerous: { label: 'Dangerous', color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: '>25 W in a small resistor will smoke or fail. Redesign to limit current.' }
        })[state];
        // SVG: linear I vs R curve at current V
        var rs = [];
        for (var r = 1; r <= 1000; r += 25) { rs.push(r); }
        var pts = rs.map(function(r) {
          var i = iq.voltage / r;
          var x = (r / 1000) * 280 + 30;
          var y = 130 - Math.min(120, i * 100);
          return x + ',' + y;
        }).join(' ');
        var hereX = (Math.min(1000, iq.resistance) / 1000) * 280 + 30;
        var hereY = 130 - Math.min(120, current * 100);
        return h('div', { className: 'rounded-xl p-4', style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
          h('h3', { style: { margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, '🔬 Ohm Inquiry — V/I/R/P Discovery'),
          h('p', { style: { margin: '0 0 8px', fontSize: 11, opacity: 0.85, lineHeight: 1.4 } }, 'Set voltage and resistance. Predict where the dissipation crosses from harmless to component-killing. No score, no reveal — you mark your own understanding.'),
          h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: sm.color, color: '#000', fontSize: 11, fontWeight: 800, marginBottom: 6 } }, sm.label),
          h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 } },
            [
              { label: 'Current', val: (mA >= 1 ? mA.toFixed(1) + ' mA' : (mA * 1000).toFixed(0) + ' µA') },
              { label: 'Power', val: power.toFixed(3) + ' W' },
              { label: 'Ohm check', val: (iq.voltage).toFixed(2) + 'V = ' + current.toFixed(3) + 'A × ' + iq.resistance + 'Ω' }
            ].map(function(m) {
              return h('div', { key: m.label, style: { padding: 6, borderRadius: 4, background: 'var(--allo-stem-deeper, #0a0a1a)', border: '1px solid ' + sm.border, textAlign: 'center' } },
                h('div', { style: { fontSize: 9, opacity: 0.6 } }, m.label),
                h('div', { style: { fontSize: 11, fontWeight: 700, color: sm.color, fontFamily: 'monospace' } }, m.val)
              );
            })
          ),
          h('svg', { width: '100%', height: 160, viewBox: '0 0 320 160', style: { background: 'var(--allo-stem-deeper, #0a0a1a)', borderRadius: 6, marginBottom: 10 } },
            h('line', { x1: 30, y1: 130, x2: 310, y2: 130, stroke: '#1e293b' }),
            h('line', { x1: 30, y1: 10, x2: 30, y2: 130, stroke: '#1e293b' }),
            [0, 250, 500, 750, 1000].map(function(r, i) { return h('text', { key: 'rx' + i, x: 30 + (r / 1000) * 280, y: 145, fill: '#64748b', fontSize: 8, textAnchor: 'middle' }, r + 'Ω'); }),
            [0, 0.3, 0.6, 0.9, 1.2].map(function(i, j) { return h('text', { key: 'iy' + j, x: 24, y: 132 - i * 100, fill: '#64748b', fontSize: 8, textAnchor: 'end' }, i + 'A'); }),
            h('polyline', { points: pts, fill: 'none', stroke: sm.color, strokeWidth: 1.5, opacity: 0.7 }),
            h('circle', { cx: hereX, cy: hereY, r: 5, fill: sm.color, stroke: '#fff', strokeWidth: 1 }),
            h('text', { x: hereX + 8, y: hereY - 4, fill: sm.color, fontSize: 10, fontWeight: 700 }, '↘ now'),
            h('text', { x: 160, y: 158, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'I = V/R at V = ' + iq.voltage + 'V')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 } },
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, 'Voltage'), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.voltage + ' V')),
              h('input', { type: 'range', 'aria-label': 'Voltage', 'aria-valuetext': iq.voltage + ' volts, current ' + current.toFixed(3) + ' amps, power ' + power.toFixed(3) + ' watts', min: 1, max: 48, step: 0.5, value: iq.voltage, onChange: function(e) { setKey('voltage', parseFloat(e.target.value)); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, 'Resistance'), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.resistance + ' Ω')),
              h('input', { type: 'range', 'aria-label': 'Resistance', 'aria-valuetext': iq.resistance + ' ohms, current ' + current.toFixed(3) + ' amps, power ' + power.toFixed(3) + ' watts', min: 1, max: 1000, step: 1, value: iq.resistance, onChange: function(e) { setKey('resistance', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('button', { onClick: function() {
              var t = new Date().toISOString().slice(11, 19);
              setIQ({ log: iq.log.concat([{ t: t, V: iq.voltage, R: iq.resistance, I: current.toFixed(3), P: power.toFixed(3), state: sm.label }]) });
            }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, '📋 Log this V/R/I/P snapshot'),
            h('button', { onClick: function() { setIQ({ voltage: 9, resistance: 100 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: 'var(--allo-stem-deeper, #0a0a1a)', color: '#94a3b8', cursor: 'pointer' } }, 'Reset')
          ),
          iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: 'var(--allo-stem-deeper, #0a0a1a)', border: '1px solid #1e293b', marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
            iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · V' + e.V + ' R' + e.R + ' I' + e.I + ' P' + e.P); })
          ),
          h('label', { htmlFor: 'circuit-ohm-hypothesis', style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, 'Your hypothesis (which moves dissipation fastest — voltage or resistance? In which direction?)'),
          h('textarea', { id: 'circuit-ohm-hypothesis', value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: 'e.g., doubling voltage quadruples power; halving resistance also quadruples — wait, does it?', style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: 'var(--allo-stem-deeper, #0a0a1a)', color: '#e8f0f5', fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
          !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: 'var(--allo-stem-deeper, #0a0a1a)', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, "🤔 I'm stuck — show open questions"),
          iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: 'var(--allo-stem-deeper, #0a0a1a)', border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
            h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, 'Open questions (no answer key)'),
            h('ul', { style: { margin: 0, paddingLeft: 16 } },
              h('li', null, 'P = V²/R and P = I²R both express power. When does each form make intuition easier?'),
              h('li', null, 'If you double V and double R, what happens to I? to P?'),
              h('li', null, 'A 1 kΩ resistor at 48 V — what state? What about a 10 Ω resistor at 5 V?'),
              h('li', null, 'When does heat dissipation become the binding constraint on a circuit design?')
            )
          ),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
            h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
            h('span', null, 'I can explain why this V/R combination yields this dissipation state.')
          ),
          iq.understood && h('label', { htmlFor: 'circuit-ohm-explanation', style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, 'Explain the dissipation state in your own words'),
          iq.understood && h('textarea', { id: 'circuit-ohm-explanation', value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: 'Explain in your own words...', style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 6, resize: 'vertical' } }),
          h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, 'Inquiry widget — no score, no reveal, no answer dump. P/Resistor wattage thresholds are typical for through-hole carbon-film; SMD and wirewound differ.')
        );
      }

      function renderActiveSection() {
        if (expSection === 'ohmInquiry') return renderOhmInquirySection();
        if (expSection === 'laws') return renderLawsSection();
        if (expSection === 'components') return renderComponentsSection();
        if (expSection === 'sp') return renderSpSection();
        if (expSection === 'patterns') return renderPatternsSection();
        if (expSection === 'logic') return renderLogicSection();
        if (expSection === 'safety') return renderSafetySection();
        if (expSection === 'resistor') return renderResistorSection();
        if (expSection === 'capacitor') return renderCapacitorSection();
        if (expSection === 'inductor') return renderInductorSection();
        if (expSection === 'semicon') return renderSemiconSection();
        if (expSection === 'opamp') return renderOpampSection();
        if (expSection === 'filters') return renderFiltersSection();
        if (expSection === 'power') return renderPowerSection();
        if (expSection === 'motors') return renderMotorsSection();
        if (expSection === 'fields') return renderFieldsSection();
        if (expSection === 'wireless') return renderWirelessSection();
        if (expSection === 'units') return renderUnitsSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'micro') return renderMicroSection();
        if (expSection === 'ics') return renderIcsSection();
        if (expSection === 'protos') return renderProtosSection();
        if (expSection === 'sensors') return renderSensorsSection();
        if (expSection === 'actuators') return renderActuatorsSection();
        if (expSection === 'pcb') return renderPcbSection();
        if (expSection === 'troubleshoot') return renderTroubleshootSection();
        if (expSection === 'simulation') return renderSimulationSection();
        if (expSection === 'standards') return renderStandardsSection();
        if (expSection === 'careers') return renderCareersSection();
        if (expSection === 'batteries') return renderBatteriesSection();
        if (expSection === 'energy') return renderEnergySection();
        if (expSection === 'famouscirc') return renderFamouscircSection();
        if (expSection === 'computers') return renderComputersSection();
        if (expSection === 'world') return renderWorldSection();
        if (expSection === 'wire') return renderWireSection();
        if (expSection === 'fuses') return renderFusesSection();
        if (expSection === 'lights') return renderLightsSection();
        if (expSection === 'household_app') return renderHouseholdAppSection();
        if (expSection === 'circuit_lab') return renderCircuitLabSection();
        if (expSection === 'common_circuits') return renderCommonCircuitsSection();
        if (expSection === 'connectors') return renderConnectorsSection();
        if (expSection === 'symbols') return renderSymbolsSection();
        if (expSection === 'poebulb') return renderPoebulbSection();
        if (expSection === 'failDx') return renderFailDxSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var SCHEMATIC_SYMBOLS = [
        { name: 'Resistor', us: 'Zigzag line', eu: 'Rectangle', notes: 'IEEE/ANSI uses zigzag; IEC uses rectangle. Both globally understood.' },
        { name: 'Capacitor (non-polarized)', us: 'Two parallel straight lines', eu: 'Same', notes: 'Universal symbol.' },
        { name: 'Capacitor (polarized)', us: 'One straight + one curved line', eu: 'Same with + marker', notes: '+ side = anode. Curved side = cathode.' },
        { name: 'Inductor', us: 'Loops/coils', eu: 'Filled rectangle', notes: 'IEEE: curves like a spring. IEC: filled bar.' },
        { name: 'Battery', us: 'Long line (+) + short line (−)', eu: 'Same', notes: 'Multi-cell shown with multiple line pairs. Universal.' },
        { name: 'Ground (earth)', us: 'Lines decreasing in length', eu: 'Same', notes: 'Multiple variants for chassis, earth, signal ground.' },
        { name: 'LED', us: 'Diode with two arrows pointing OUT', eu: 'Same', notes: 'Arrows = emitted light. Photodiode has arrows pointing IN.' },
        { name: 'Diode', us: 'Triangle pointing to bar', eu: 'Same', notes: 'Triangle = anode side. Current flows in direction of triangle.' },
        { name: 'Transistor (NPN)', us: 'Circle with 3 leads, arrow OUT on emitter', eu: 'Same', notes: 'PNP has arrow pointing IN.' },
        { name: 'MOSFET (N-channel)', us: 'Symbol with gate insulated, arrow IN on body', eu: 'Same', notes: 'Many variations — enhancement vs depletion, with vs without body terminal.' },
        { name: 'Op-amp', us: 'Triangle with + and − inputs + output', eu: 'Same', notes: 'Power supply pins often hidden for clarity.' },
        { name: 'Logic gates', us: 'Distinctive shapes (AND = D-shape, OR = curved)', eu: 'Rectangle with label (&, ≥1, =1)', notes: 'US: graphical. EU: rectangle + Boolean operator symbol.' },
        { name: 'Wire crossing (no connection)', us: 'One wire jumps over other', eu: 'Crossed lines (no dot)', notes: 'Dot = connection. No dot = wires cross without touching.' },
        { name: 'Wire junction (connection)', us: 'Dot at intersection', eu: 'Same', notes: 'T-junctions usually shown without dot; 4-way always with dot.' },
        { name: 'Switch (SPST)', us: 'Hinged line on contact', eu: 'Same', notes: 'SPDT, DPDT, etc. add more contacts.' },
        { name: 'Speaker', us: 'Square + curved triangle', eu: 'Same', notes: 'Loudspeaker, headphone — same basic symbol.' },
        { name: 'Microphone', us: 'Circle with vertical line', eu: 'Same', notes: 'Or circle with diagonal lines.' },
        { name: 'Transformer', us: 'Two coils with bar between', eu: 'Same', notes: 'Bar = iron core. Air-core transformers omit it.' },
        { name: 'Fuse', us: 'Rectangle with curve, or zigzag with line', eu: 'Rectangle', notes: 'Multiple variants. All indicate breakable link.' },
        { name: 'Lamp / bulb', us: 'Circle with X (×) inside', eu: 'Same', notes: 'Or circle with crossed loop.' }
      ];

      function renderSymbolsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⊜ Schematic symbols (US vs EU style)'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Most schematics use IEEE/ANSI (US) or IEC (European) symbols. Both are clear once you learn them, but mixing in one schematic is confusing.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Schematic symbols comparison'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Component', 'US (IEEE)', 'EU (IEC)', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SCHEMATIC_SYMBOLS.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, s.name),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, s.us),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, s.eu),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      var CONNECTORS = [
        { name: 'USB-A', pins: '4 (USB 2.0) / 9 (USB 3.0)', use: 'Computer host ports. Being phased out for USB-C.', notes: 'Rectangular, "only fits one way" — but Murphy says it takes 3 tries.' },
        { name: 'USB-C', pins: '24 (16 + power/data)', use: 'Modern phones, laptops, peripherals. Reversible.', notes: 'Power up to 240W, data up to 80 Gbps. EU mandate for new phones.' },
        { name: 'USB Micro-B', pins: '5', use: 'Older Android phones, small electronics', notes: 'Replaced by USB-C in most new products. Easy to wear out.' },
        { name: 'USB Mini-B', pins: '5', use: 'Older cameras, MP3 players', notes: 'Mostly obsolete.' },
        { name: 'HDMI Type A (standard)', pins: 19, use: 'TVs, monitors, game consoles', notes: 'Audio + video. HDMI 2.1: 48 Gbps, 8K@60.' },
        { name: 'HDMI Mini (Type C)', pins: 19, use: 'Tablets, some cameras', notes: 'Smaller form factor.' },
        { name: 'HDMI Micro (Type D)', pins: 19, use: 'Phones, GoPro, small cameras', notes: 'Even smaller.' },
        { name: 'DisplayPort', pins: 20, use: 'Computer monitors', notes: 'DP 2.0: 80 Gbps. Common on graphics cards + pro displays.' },
        { name: 'Mini DisplayPort', pins: 20, use: 'MacBooks, Surface (older)', notes: 'Largely replaced by USB-C/Thunderbolt.' },
        { name: 'Thunderbolt 3/4 (over USB-C)', pins: 24, use: 'High-speed external storage, eGPUs, docks', notes: 'TB4: 40 Gbps. Same connector as USB-C but more capability.' },
        { name: 'VGA (DE-15)', pins: 15, use: 'Older monitors, projectors', notes: 'Analog. Largely obsolete but still common in education.' },
        { name: 'DVI', pins: '24+5 (DVI-I) / 24 (DVI-D)', use: 'Older flat-panel monitors', notes: 'Digital (DVI-D) or hybrid (DVI-I). Replaced by HDMI + DP.' },
        { name: 'RJ45 (Ethernet)', pins: 8, use: 'Wired networking', notes: 'Cat 5e (1 Gbps), Cat 6 (10 Gbps short), Cat 8 (40 Gbps).' },
        { name: 'RJ11 (telephone)', pins: '4-6', use: 'Landline phones, DSL', notes: 'Smaller than RJ45.' },
        { name: '3.5mm TRS audio', pins: '3 contacts', use: 'Headphones, speakers, line in/out', notes: 'Tip-Ring-Sleeve. 4-contact (TRRS) adds microphone for headsets.' },
        { name: '1/4" TRS', pins: '3 contacts', use: 'Pro audio, guitar cables', notes: 'Same idea as 3.5mm but bigger. Guitar = TS (no ring).' },
        { name: 'XLR (3-pin)', pins: 3, use: 'Professional microphones, mixing boards', notes: 'Balanced audio — rejects noise. Locking connector.' },
        { name: 'RCA (composite)', pins: '1 (+ground shield)', use: 'Old AV equipment', notes: 'Yellow=video, red/white=stereo audio. Mostly obsolete.' },
        { name: 'Banana plug', pins: 1, use: 'Test leads, speakers', notes: 'Single conductor. Common in lab instruments.' },
        { name: 'BNC', pins: 1, use: 'Coax video, RF lab equipment', notes: 'Bayonet locking. Used on oscilloscope probes.' },
        { name: 'F-connector (coax TV)', pins: 1, use: 'Cable TV, satellite, antenna', notes: 'Threaded. 75-ohm impedance.' },
        { name: 'SMA', pins: 1, use: 'RF + microwave equipment, antennas', notes: 'Threaded coax connector. 50-ohm.' },
        { name: 'IEC C13/C14 (kettle plug)', pins: 3, use: 'Computer power supplies, monitors', notes: 'Standard PC cord. International compatibility.' },
        { name: 'Barrel jack (DC)', pins: 2, use: 'Wall warts, small electronics', notes: 'Multiple sizes (5.5×2.1mm common). Center pin polarity varies — check datasheet!' },
        { name: 'JST (PH, XH, etc.)', pins: '2-15+', use: 'Internal connections in electronics', notes: 'Many series. Common in hobby + Arduino projects.' },
        { name: 'Molex (4-pin Mate-N-Lok)', pins: 4, use: 'Old IDE drives, fans', notes: 'PC peripheral power. Largely replaced by SATA power.' },
        { name: 'SATA data + power', pins: '7 + 15', use: 'Internal storage drives', notes: 'Standard since mid-2000s. NVMe replacing for high-end.' },
        { name: 'M.2 (NVMe)', pins: 'B + M keys, varies', use: 'Modern SSDs', notes: 'Direct PCIe connection. Tiny + fast.' },
        { name: 'Lightning (Apple)', pins: 8, use: 'iPhones pre-2024, iPads, accessories', notes: 'Reversible. Being replaced by USB-C across Apple line.' }
      ];

      function renderConnectorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔌 Common connectors + cables'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Common electrical connectors and cables'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Connector', 'Pins', 'Use', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                CONNECTORS.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, c.name),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold text-[10px]' }, c.pins),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, c.use),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final circuit data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var PROJECT_CIRCUITS = [
        { project: 'LED + battery', difficulty: 'Beginner', components: 'LED, resistor (220-470 Ω), 9V battery (or AA holder)', skills: 'Polarity, current-limit resistor calculation' },
        { project: 'Series + parallel LEDs', difficulty: 'Beginner', components: 'Multiple LEDs, resistors, battery', skills: 'Series adds voltage drops. Parallel needs separate resistors per branch.' },
        { project: '555 timer LED blink', difficulty: 'Beginner', components: '555 IC, 2 resistors, 1 cap, LED, battery', skills: 'Astable multivibrator. Frequency calc. Reading datasheets.' },
        { project: 'Light-sensing alarm (LDR + 555)', difficulty: 'Beginner-intermediate', components: 'LDR, transistor, 555, speaker', skills: 'Voltage divider with variable R. Transistor switching.' },
        { project: 'Arduino + LED + button', difficulty: 'Beginner', components: 'Arduino, LED, resistor, button, breadboard', skills: 'Digital I/O, pull-up/down resistors, basic programming.' },
        { project: 'Servo motor sweep', difficulty: 'Beginner', components: 'Arduino, servo, power supply', skills: 'PWM signal generation. Library use (Servo.h).' },
        { project: 'Temperature display', difficulty: 'Intermediate', components: 'Arduino, DHT22 sensor, OLED screen', skills: 'I²C, library installation, sensor calibration.' },
        { project: 'Bluetooth speaker (DIY)', difficulty: 'Intermediate', components: 'Bluetooth module, amp board, speaker, battery, switch', skills: 'Audio signal flow. Power management. Enclosure design.' },
        { project: 'Motion-sensing light', difficulty: 'Intermediate', components: 'PIR sensor, MOSFET, LED strip, power supply', skills: 'Digital sensors. High-current switching with MOSFET.' },
        { project: 'Robot car (basic)', difficulty: 'Intermediate', components: 'Arduino, motor driver, 2 DC motors, wheels, chassis, battery, ultrasonic sensor', skills: 'H-bridge motor control. Sensor integration. Mechanical assembly.' },
        { project: 'Weather station (data logger)', difficulty: 'Intermediate-advanced', components: 'ESP32, BME280, DHT22, SD card, OLED, battery', skills: 'Multi-sensor I²C, SD card filesystem, real-time clock, low-power sleep modes.' },
        { project: 'Home automation switch (Wi-Fi)', difficulty: 'Intermediate-advanced', components: 'ESP32/ESP8266, relay, USB power, enclosure', skills: 'AC mains safety (!), Wi-Fi APIs, MQTT or HTTP, mobile app integration.' },
        { project: 'CNC machine controller', difficulty: 'Advanced', components: 'Stepper drivers, steppers, controller board (e.g., GRBL), power supply', skills: 'Stepper microstepping, G-code, mechanical alignment.' },
        { project: '3D printer firmware', difficulty: 'Advanced', components: 'Marlin/Klipper firmware, board (e.g., SKR), endstops, thermistors, fans', skills: 'Firmware compilation, PID tuning for hot end + bed, stepper calibration.' },
        { project: 'Drone build', difficulty: 'Advanced', components: 'Frame, motors (brushless), ESCs, flight controller, receiver, props, LiPo battery', skills: 'PID control, RF binding, safety (props off until ready), regulations.' },
        { project: 'Custom keyboard', difficulty: 'Intermediate-advanced', components: 'Switches, diodes, PCB (custom), USB controller (RP2040/Pro Micro), keycaps', skills: 'Matrix scanning, QMK firmware, PCB design (or hand-wired).' },
        { project: 'Software-defined radio (SDR)', difficulty: 'Advanced', components: 'RTL-SDR dongle (or HackRF), antenna, computer', skills: 'Signal processing, frequency analysis, modulation/demodulation.' },
        { project: 'Custom PCB project', difficulty: 'Advanced', components: 'KiCad/Altium, manufacturer (JLCPCB, PCBWay), parts (DigiKey/Mouser)', skills: 'Schematic capture, layout, ordering, assembly, debugging.' },
        { project: 'Battery management system (BMS)', difficulty: 'Advanced', components: 'Cells, balancing IC, current sensor, MCU, safety FETs', skills: 'Cell balancing, overcurrent + thermal protection, safety!' },
        { project: 'Quadruped robot', difficulty: 'Advanced', components: '12 servos (3 per leg), MCU, IMU, power, chassis', skills: 'Inverse kinematics, gait planning, balance algorithms.' }
      ];

      function renderCommonCircuitsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚒ Hands-on project ideas'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'A learning ladder from "blink an LED" to "build a quadruped robot." Each project builds on skills from earlier ones.'),
          h('div', { className: 'space-y-2' },
            PROJECT_CIRCUITS.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, p.project),
                  h('span', { className: 'text-[10px] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, p.difficulty)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Components: '), p.components),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, h('strong', null, 'Skills: '), p.skills)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var APPLIANCES = [
        { device: 'LED light bulb (typical)', watts: '5-15 W', notes: 'Replaces 40-100W incandescent. ~10× more efficient.' },
        { device: 'Incandescent bulb (60W)', watts: '60 W', notes: 'Mostly heat. Phased out in many countries.' },
        { device: 'Fluorescent ceiling tube (4 ft)', watts: '32 W', notes: 'Office standard for decades.' },
        { device: 'Laptop computer', watts: '15-60 W', notes: 'Higher under load. Charging draws more than running.' },
        { device: 'Desktop PC (typical)', watts: '60-250 W', notes: 'Gaming PCs can hit 500-800 W under load.' },
        { device: 'CRT TV (old, 32")', watts: '~150 W', notes: 'Mostly obsolete.' },
        { device: 'LCD TV (40")', watts: '~75 W', notes: 'Big improvement over CRT.' },
        { device: 'OLED TV (65")', watts: '~120 W', notes: 'Per-pixel emission.' },
        { device: 'Refrigerator', watts: '100-400 W when running', notes: 'Cycles on/off. ~1-2 kWh/day typical.' },
        { device: 'Freezer (chest)', watts: '50-150 W when running', notes: 'More insulated than fridge. Cycles less.' },
        { device: 'Microwave oven', watts: '700-1500 W', notes: '"700 W output" = actual cooking power; input may be 1000+ W.' },
        { device: 'Electric kettle', watts: '1500 W (US) / 3000 W (EU/UK)', notes: 'Higher voltage in EU/UK allows faster boil.' },
        { device: 'Toaster', watts: '800-1500 W', notes: 'Pure resistive heating.' },
        { device: 'Hair dryer', watts: '1200-1875 W', notes: 'Heating element + small motor.' },
        { device: 'Coffee maker (drip)', watts: '600-1200 W', notes: 'Heats water, keeps hot.' },
        { device: 'Espresso machine', watts: '1000-1500 W', notes: 'Brief high-power bursts.' },
        { device: 'Dishwasher', watts: '1200-1500 W during cycle', notes: 'Mostly heating water + pump.' },
        { device: 'Clothes washer', watts: '300-500 W (cold) / ~2000 W (hot)', notes: 'Cold wash much more efficient.' },
        { device: 'Clothes dryer (electric)', watts: '1800-5000 W', notes: 'One of the biggest household loads.' },
        { device: 'Vacuum cleaner', watts: '500-1500 W', notes: 'Motor + air movement.' },
        { device: 'Iron (clothing)', watts: '1000-1800 W', notes: 'Resistive heating.' },
        { device: 'Window AC (5,000 BTU)', watts: '~450 W', notes: '~1 kWh per 2.5 hr of cooling.' },
        { device: 'Central AC (3 ton)', watts: '3500-5000 W', notes: 'Biggest summer load. SEER rating matters.' },
        { device: 'Electric furnace', watts: '10,000-25,000 W', notes: 'Mostly replaced by heat pumps in efficient homes.' },
        { device: 'Heat pump (3 ton)', watts: '1500-3000 W', notes: '~3× more efficient than resistive heat.' },
        { device: 'Water heater (electric tank)', watts: '4500 W', notes: 'On/off cycling. ~3-5 kWh/day for typical household.' },
        { device: 'EV charging (Level 1, 120V)', watts: '1400 W', notes: 'Slow — adds ~4-5 miles/hour of charging.' },
        { device: 'EV charging (Level 2, 240V)', watts: '7000-12,000 W', notes: 'Home garage charger. Adds 20-40 mi/hr.' },
        { device: 'EV DC fast charger', watts: '50,000-350,000 W', notes: 'Highway charging. Can add 200+ mi in 20 min.' },
        { device: 'Phone charger', watts: '5-65 W', notes: 'USB-PD 3.1 allows up to 240 W (laptop charging).' },
        { device: 'Wi-Fi router', watts: '5-20 W', notes: '24/7 — small per hour but adds up.' },
        { device: 'Game console (PS5/Xbox)', watts: '160-200 W gaming / 20 W idle', notes: 'Modern consoles are efficient by default.' },
        { device: 'Treadmill', watts: '600-2000 W', notes: 'Motor scales with speed + incline.' }
      ];

      var LAB_EQUIPMENT = [
        { instrument: 'Digital multimeter (DMM)', use: 'Measures V, I, R (and often continuity, capacitance, frequency).', notes: 'Basic tool. Auto-ranging models common. Higher-end: true RMS for non-sine AC.' },
        { instrument: 'Oscilloscope', use: 'Visualize voltage vs time. See waveform shape, frequency, glitches.', notes: 'Bandwidth (MHz/GHz) determines fastest signals you can see. 4 channels common.' },
        { instrument: 'Logic analyzer', use: 'Capture many digital signals simultaneously.', notes: 'For debugging digital protocols (I²C, SPI, USB).' },
        { instrument: 'Function/arbitrary waveform generator', use: 'Output sine, square, triangle, custom waves.', notes: 'For stimulating circuits during testing.' },
        { instrument: 'Bench DC power supply', use: 'Adjustable voltage + current limit.', notes: 'Multi-output models common. Current limit protects circuits during testing.' },
        { instrument: 'Spectrum analyzer', use: 'Frequency-domain view of signals.', notes: 'Used in RF design, EMI testing.' },
        { instrument: 'Network analyzer', use: 'Measures S-parameters (impedance + transmission) over frequency.', notes: 'Vector network analyzer (VNA) gives phase + magnitude.' },
        { instrument: 'LCR meter', use: 'Measures inductance, capacitance, resistance at various frequencies.', notes: 'Better than multimeter for these parameters.' },
        { instrument: 'Soldering iron', use: 'Joins components via molten solder.', notes: '~350°C typical. Temperature-controlled stations preferred.' },
        { instrument: 'Hot air rework station', use: 'Desolder + place SMT components.', notes: 'Adjustable temp + airflow.' },
        { instrument: 'Solder reflow oven', use: 'Mass-solders PCB assemblies.', notes: 'Toaster ovens can be modified for hobby use.' },
        { instrument: 'Microscope (stereo)', use: 'Inspect SMT components + solder joints.', notes: '10-40× typical. 0603 + smaller require microscope.' },
        { instrument: 'PCB drill / mill', use: 'Make holes + cut traces in prototype boards.', notes: 'CNC machines like Bantam Tools for low-volume.' },
        { instrument: 'Wire strippers', use: 'Remove insulation cleanly.', notes: 'Multi-gauge selectable. Avoid nicking conductors.' },
        { instrument: 'Crimping tool', use: 'Compress connectors onto wires.', notes: 'Right tool for the connector matters — wrong crimp = unreliable.' },
        { instrument: 'Heat gun', use: 'Shrinks heat-shrink tubing. Hot air rework.', notes: '~200-400°C. Don\'t aim at flammable insulation.' },
        { instrument: 'Continuity tester', use: 'Beeps when circuit complete.', notes: 'DMMs have this built-in. Quick wire + trace checks.' },
        { instrument: 'Clamp meter', use: 'Measures current without breaking circuit.', notes: 'Hall-effect sensor reads magnetic field around conductor.' },
        { instrument: 'Insulation tester (megger)', use: 'Tests insulation with high voltage (500-1000+ V DC).', notes: 'For mains wiring + motor windings.' },
        { instrument: 'Earth ground tester', use: 'Verifies grounding system resistance.', notes: '<25 Ω typically required for safety.' },
        { instrument: 'IR thermometer / thermal camera', use: 'Spot hot components or failing connections.', notes: 'Useful for finding hot solder joints or overloaded wires.' },
        { instrument: 'ESD wrist strap', use: 'Prevent static damage to sensitive components.', notes: '1 MΩ resistor to ground. Essential for MOSFETs, modern ICs.' }
      ];

      function renderHouseholdAppSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏠 Household appliance power'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Typical wattage of common devices. Watts × hours = watt-hours of energy used. 1 kWh costs ~$0.10-0.30 in most regions.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Household appliance power reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Device', 'Power', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                APPLIANCES.map(function(a, i) {
                  return h('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, a.device),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold text-[10px]' }, a.watts),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderCircuitLabSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔬 Electronics lab equipment'),
          h('div', { className: 'space-y-2' },
            LAB_EQUIPMENT.map(function(L, i) {
              return h('div', { key: 'L'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, L.instrument),
                h('div', { className: 'text-[11px] text-amber-700 font-bold mb-1' }, 'Use: ' + L.use),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, L.notes)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — Dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var WIRE_GAUGES = [
        { awg: 0, dia: '8.25 mm', amps: '195 A', use: 'Large feeder cables.' },
        { awg: 2, dia: '6.54 mm', amps: '130 A', use: 'Battery cables (cars).' },
        { awg: 4, dia: '5.19 mm', amps: '95 A', use: 'Range/cooktop circuits.' },
        { awg: 6, dia: '4.11 mm', amps: '65 A', use: 'Electric clothes dryers.' },
        { awg: 8, dia: '3.26 mm', amps: '50 A', use: 'Electric dryers, ranges.' },
        { awg: 10, dia: '2.59 mm', amps: '30 A', use: 'Water heaters, air conditioners.' },
        { awg: 12, dia: '2.05 mm', amps: '20 A', use: 'Kitchen + bathroom outlets (US).' },
        { awg: 14, dia: '1.63 mm', amps: '15 A', use: 'General lighting + outlets (US).' },
        { awg: 16, dia: '1.29 mm', amps: '10 A', use: 'Extension cords (light duty).' },
        { awg: 18, dia: '1.02 mm', amps: '7 A', use: 'Lamp cords, small appliances.' },
        { awg: 20, dia: '0.81 mm', amps: '5 A', use: 'Speaker wires (low current).' },
        { awg: 22, dia: '0.64 mm', amps: '3 A', use: 'Hookup wire, breadboarding.' },
        { awg: 24, dia: '0.51 mm', amps: '2 A', use: 'Ethernet (Cat 5e). Small hobby projects.' },
        { awg: 26, dia: '0.40 mm', amps: '1 A', use: 'Magnet wire, fine signal wire.' },
        { awg: 28, dia: '0.32 mm', amps: '0.6 A', use: 'Thin signal wire, jumpers.' },
        { awg: 30, dia: '0.25 mm', amps: '0.4 A', use: 'Wire-wrap. Thin transformers.' },
        { awg: 32, dia: '0.20 mm', amps: '0.2 A', use: 'Very fine work.' }
      ];

      var WIRE_NOTES = [
        { topic: 'AWG counterintuitive', detail: 'Lower number = THICKER wire. AWG 0 (0000) = ~12 mm. AWG 36 = ~0.13 mm.' },
        { topic: 'Solid vs stranded', detail: 'Solid: single conductor, cheaper, stiffer. Stranded: multiple thin strands, more flexible.' },
        { topic: 'Insulation ratings', detail: 'THHN (90°C dry), THWN (75°C wet), NM-B (Romex, 90°C). Higher rating = higher temp tolerance.' },
        { topic: 'Voltage drop', detail: 'V = I × R. Long runs need bigger wire to keep drop < ~3%. Online calculators help.' },
        { topic: 'Skin effect', detail: 'At high freq, current concentrates near wire surface. Litz wire (many fine insulated strands) reduces loss.' },
        { topic: 'Color code (US residential)', detail: 'Black: hot. White: neutral. Green/bare: ground. Red: 2nd hot (240V).' },
        { topic: 'Color code (EU)', detail: 'Brown: live. Blue: neutral. Green/yellow stripe: ground.' }
      ];

      var FUSES_BREAKERS = [
        { device: 'Ceramic fuse (5×20 mm)', rating: '~100 mA to ~30 A', notes: 'Common in electronics. Fast (F) or slow-blow (T) variants.' },
        { device: 'Glass fuse (3AG, 6×30 mm)', rating: '~100 mA to ~30 A', notes: 'Older equipment. Easy to inspect (visible filament).' },
        { device: 'Cartridge fuse (auto)', rating: '~5 A to ~80 A', notes: 'Color-coded ATC/ATO blade fuses in modern cars.' },
        { device: 'Resettable fuse (polyfuse, PTC)', rating: '~50 mA to ~10 A', notes: 'Heats up + resets when fault clears. No replacement needed.' },
        { device: 'Thermal fuse', rating: 'temp-rated', notes: 'Opens at specific temp. Coffee makers, hair dryers.' },
        { device: 'Circuit breaker (residential)', rating: '15-200 A', notes: 'Thermal-magnetic. Trips on overcurrent or short. Resettable.' },
        { device: 'GFCI / RCD', rating: 'trips at ~5 mA imbalance', notes: 'Ground Fault Circuit Interrupter. Required in bathrooms, kitchens, outdoors.' },
        { device: 'AFCI', rating: 'detects arcing patterns', notes: 'Arc Fault Circuit Interrupter. Required in bedroom outlets (US).' },
        { device: 'HRC fuse (industrial)', rating: '~10-2000 A', notes: 'High Rupturing Capacity. Industrial equipment, transformers.' }
      ];

      var LIGHT_BULBS = [
        { type: 'Incandescent (Edison)', efficiency: '~2% (15 lm/W)', life: '~1000 hr', notes: 'Tungsten filament glowing hot. Mostly heat, little light. Banned for general lighting in many countries.' },
        { type: 'Halogen', efficiency: '~3% (25 lm/W)', life: '~2000 hr', notes: 'Incandescent variant with halogen gas + quartz envelope. Slightly more efficient.' },
        { type: 'CFL (compact fluorescent)', efficiency: '~10% (60 lm/W)', life: '~10,000 hr', notes: 'Mercury vapor + phosphor coating. Slow warm-up. Mercury disposal concern.' },
        { type: 'Linear fluorescent (T8)', efficiency: '~10% (~85 lm/W)', life: '~20,000 hr', notes: 'Office + commercial standard. Being replaced by LED.' },
        { type: 'LED (white)', efficiency: '~15-30% (~100-150 lm/W)', life: '~25,000-50,000 hr', notes: 'Blue LED + yellow phosphor (or RGB). Most efficient general lighting.' },
        { type: 'LED (filament-style)', efficiency: '~12% (~90 lm/W)', life: '~15,000 hr', notes: 'Mimics incandescent look. Slightly less efficient than standard LED.' },
        { type: 'High-pressure sodium', efficiency: '~25% (~150 lm/W)', life: '~24,000 hr', notes: 'Yellow-orange. Old streetlights. Being replaced by LED.' },
        { type: 'Metal halide', efficiency: '~20% (~100 lm/W)', life: '~15,000 hr', notes: 'White light. Stadiums, parking lots, retail.' },
        { type: 'Mercury vapor', efficiency: '~15%', life: '~24,000 hr', notes: 'Bluish-white. Largely phased out due to mercury + low efficiency vs newer options.' },
        { type: 'Xenon arc', efficiency: '~5-10%', life: '~2000 hr', notes: 'Movie projectors, car HID headlights, IMAX.' },
        { type: 'OLED panel', efficiency: '~15%', life: '~10,000-30,000 hr', notes: 'Flat panel lighting. Architectural use. Expensive.' },
        { type: 'Carbon arc', efficiency: 'high luminance', life: 'short (consumes electrodes)', notes: 'Old movie projection, searchlights. Obsolete.' }
      ];

      var LIGHT_FACTS = [
        { fact: 'Lumens vs watts', detail: '60W incandescent ≈ 800 lumens. Same lumens from LED uses ~9W.' },
        { fact: 'Color temperature', detail: '2700 K (warm/incandescent-like), 3000 K (soft white), 4000 K (neutral), 5000 K+ (daylight/cool).' },
        { fact: 'Color rendering index (CRI)', detail: 'How accurately colors appear. 100 = sunlight. >90 = high quality. Cheap LEDs ~70.' },
        { fact: 'Lumen', detail: 'Total light emitted. Brightness perceived by human eye.' },
        { fact: 'Lux', detail: 'Lumens per square meter. Brightness AT a surface. Office: ~500 lux. Sunlight: ~100,000 lux.' },
        { fact: 'Candela', detail: 'Luminous intensity in one direction. Replaced "candlepower". One candle ≈ 1 cd.' },
        { fact: 'Photopic vs scotopic vision', detail: 'Day (cones) vs night (rods). Peak sensitivity shifts from 555 nm (yellow-green) to 505 nm (blue-green) in dim light.' },
        { fact: 'Blue light + sleep', detail: '~480 nm suppresses melatonin. Why screens late at night affect sleep. "Night mode" shifts to warmer colors.' }
      ];

      function renderWireSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '〰 Wire gauges (AWG)'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'American Wire Gauge. Lower number = THICKER. Doubles in cross-section every 3 gauges. Current capacity depends on insulation + ambient temp.'),
          h('div', { className: 'overflow-x-auto mb-3' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'American Wire Gauge reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['AWG', 'Diameter', 'Max amps (chassis)', 'Typical use'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                WIRE_GAUGES.map(function(w, i) {
                  return h('tr', { key: 'w'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 font-mono font-black text-amber-700 text-center' }, w.awg),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, w.dia),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, w.amps),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, w.use)
                  );
                })
              )
            )
          ),
          h('div', { className: 'space-y-1' },
            WIRE_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[11px] font-black text-amber-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderFusesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌧ Fuses + circuit protection'),
          h('div', { className: 'space-y-2' },
            FUSES_BREAKERS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, f.device),
                  h('span', { className: 'text-[10px] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, f.rating)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.notes)
              );
            })
          )
        );
      }

      function renderLightsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💡 Light bulb technologies'),
          h('div', { className: 'mb-3' },
            h('div', { className: 'space-y-2' },
              LIGHT_BULBS.map(function(L, i) {
                return h('div', { key: 'L'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[12px] font-black text-slate-800' }, L.type),
                    h('span', { className: 'text-[10px] text-amber-700 font-mono' }, L.efficiency),
                    h('span', { className: 'text-[10px] text-slate-600 font-mono ml-auto' }, 'Life: ' + L.life)
                  ),
                  h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, L.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Lighting essentials'),
          h('div', { className: 'space-y-1' },
            LIGHT_FACTS.map(function(L, i) {
              return h('div', { key: 'L'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[11px] font-black text-amber-900 mb-0.5' }, L.fact),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, L.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var BATTERY_TYPES = [
        { type: 'Alkaline (AA, AAA, C, D, 9V)', voltage: '1.5 V (9V for 9V)', energy: '~100-150 Wh/kg', notes: 'Non-rechargeable. ~10-year shelf life. Most common consumer battery.' },
        { type: 'Carbon-zinc', voltage: '1.5 V', energy: '~40-60 Wh/kg', notes: 'Cheap, lower performance than alkaline. Older "heavy duty" batteries.' },
        { type: 'Lithium primary (CR2032, etc.)', voltage: '3.0 V', energy: '~250 Wh/kg', notes: 'Long shelf life (~10 yr). Coin cells in watches, motherboards.' },
        { type: 'NiCd (nickel-cadmium)', voltage: '1.2 V', energy: '~40-60 Wh/kg', notes: 'Rechargeable. Memory effect. Now mostly replaced by NiMH (Cd is toxic).' },
        { type: 'NiMH (nickel-metal hydride)', voltage: '1.2 V', energy: '~60-120 Wh/kg', notes: 'Rechargeable. Replaced NiCd. Used in older hybrid cars, low-self-discharge variants in remotes.' },
        { type: 'Lead-acid', voltage: '~2.1 V/cell (12 V = 6 cells)', energy: '~30-50 Wh/kg', notes: 'Heavy + cheap. Cars, UPS, off-grid solar. Invented 1859.' },
        { type: 'Li-ion (LiCoO₂)', voltage: '~3.7 V', energy: '~150-250 Wh/kg', notes: 'Phones, laptops. High energy density. Sensitive to overcharge/discharge.' },
        { type: 'Li-ion (LiFePO₄)', voltage: '~3.2 V', energy: '~90-160 Wh/kg', notes: 'Safer (no thermal runaway). EVs (BYD, Tesla LFP), home solar. Long cycle life.' },
        { type: 'Li-ion (NMC, NCA)', voltage: '~3.6 V', energy: '~200-280 Wh/kg', notes: 'Most EV batteries (Tesla, GM). High energy density.' },
        { type: 'Lithium polymer (LiPo)', voltage: '~3.7 V', energy: '~150-200 Wh/kg', notes: 'Pouch cells. Drones, RC. Less safe if punctured/damaged.' },
        { type: 'Solid-state lithium', voltage: '~3.7 V', energy: '~400 Wh/kg (claimed)', notes: 'Emerging. Replace liquid electrolyte with solid. Safer + higher density. Toyota + others aim for 2027+ production.' },
        { type: 'Sodium-ion', voltage: '~3 V', energy: '~140-160 Wh/kg', notes: 'Emerging alternative. Sodium more abundant than lithium. CATL launched 2023.' },
        { type: 'Zinc-air', voltage: '~1.4 V', energy: '~400+ Wh/kg (theoretical)', notes: 'Hearing aids (long runtime). Air activates when tab pulled.' },
        { type: 'Silver-oxide', voltage: '~1.55 V', energy: '~130 Wh/kg', notes: 'Watch batteries. Stable voltage curve.' },
        { type: 'Flow battery (vanadium)', voltage: '~1.4 V/cell', energy: '~25 Wh/kg', notes: 'Grid storage. Tanks scale separately from cells. 20+ yr life.' }
      ];

      var ENERGY_SOURCES = [
        { source: 'Coal', share: '~26% global electricity (2024)', cost: 'low fuel, high external cost', notes: 'Highest CO₂ per kWh. Pollutants: SOx, NOx, mercury, PM2.5. Declining in OECD, still growing in some Asia.' },
        { source: 'Natural gas', share: '~22%', cost: 'low-medium', notes: '~½ CO₂ of coal. Methane leaks during extraction offset some benefit. Fast-ramping for grid balancing.' },
        { source: 'Nuclear', share: '~10%', cost: 'high upfront, low fuel', notes: 'Zero CO₂. Long-lived radioactive waste. New small modular reactors (SMRs) in development.' },
        { source: 'Hydroelectric', share: '~16%', cost: 'high upfront, near-zero fuel', notes: 'Mature. Ecological + community impacts (Three Gorges, Itaipu). Pumped storage = grid battery.' },
        { source: 'Wind (onshore + offshore)', share: '~7-8% rising', cost: 'low operating', notes: 'Variable. Offshore typically more consistent + larger turbines.' },
        { source: 'Solar PV', share: '~5-6% rising fast', cost: 'low operating', notes: 'Modular. Costs dropped ~10× in last decade. Often paired with batteries.' },
        { source: 'Solar thermal (CSP)', share: '<1%', cost: 'medium', notes: 'Mirrors concentrate sunlight to heat fluid → steam turbine. Can store heat overnight.' },
        { source: 'Geothermal', share: '<1%', cost: 'medium', notes: 'Limited to volcanically active regions. Iceland 65% geothermal.' },
        { source: 'Biomass', share: '~2%', cost: 'medium', notes: 'Burning wood, crops. Carbon-neutral IF sustainably grown. Air pollution issues.' },
        { source: 'Tidal + wave', share: '<1%', cost: 'high', notes: 'Predictable (tides) but limited sites + high engineering cost.' },
        { source: 'Hydrogen (storage/carrier)', share: 'minimal', cost: 'high', notes: 'Not a primary source — must be produced (from gas, electrolysis). Heavy industry decarbonization role.' },
        { source: 'Fusion (research)', share: '0%', cost: 'still experimental', notes: 'ITER + private companies (CFS, Helion, TAE). Net energy gain announced 2022. Commercial: still distant.' }
      ];

      var FAMOUS_CIRCUITS = [
        { name: 'Wheatstone bridge', use: 'Measure unknown resistance via null detection', notes: 'Strain gauges, sensor interfaces. Invented 1833 (Hunter Christie), popularized by Charles Wheatstone.' },
        { name: 'Voltage divider', use: 'Split voltage in known ratio', notes: 'V_out = V_in × R₂/(R₁+R₂). Used everywhere.' },
        { name: 'Current mirror', use: 'Copy current from one branch to another', notes: 'Basic op-amp building block.' },
        { name: 'Schmitt trigger', use: 'Clean noisy digital signals via hysteresis', notes: 'Two thresholds prevent rapid toggling on noisy edge.' },
        { name: '555 timer (astable)', use: 'Generate square wave / clock', notes: 'Frequency set by R + C. Was rumored to make up >1% of all chips made (probably exaggerated but iconic).' },
        { name: '555 timer (monostable)', use: 'Single pulse of defined duration', notes: 'One-shot. Pulse length T = 1.1 × R × C.' },
        { name: 'Class A amplifier', use: 'Linear amplification', notes: 'Always on. Low distortion, low efficiency (~25%). Audiophile single-ended designs.' },
        { name: 'Class AB amplifier', use: 'Linear amplification', notes: 'Push-pull. ~50-70% efficient. Most audio amps.' },
        { name: 'Class D amplifier', use: 'Switching amplification', notes: 'PWM. ~90%+ efficient. Modern portable + auto audio.' },
        { name: 'Common emitter (BJT)', use: 'Voltage amplification', notes: 'Standard amplifier configuration. Inverts signal.' },
        { name: 'Common collector (emitter follower)', use: 'Buffer (current gain, voltage gain ≈ 1)', notes: 'High input Z, low output Z. Impedance matching.' },
        { name: 'H-bridge', use: 'Drive motor in either direction', notes: '4 switches (often MOSFETs). Reverses motor polarity.' },
        { name: 'Boost converter', use: 'DC-DC step-up', notes: 'Inductor + switch + diode + capacitor. Powers higher-V circuits from lower-V battery.' },
        { name: 'Buck converter', use: 'DC-DC step-down', notes: 'Most efficient way to reduce DC voltage. Dominant in modern electronics.' },
        { name: 'Phase-locked loop (PLL)', use: 'Lock onto + multiply frequency', notes: 'CPU clocks, FM demodulation, radio synthesis.' },
        { name: 'Sample-and-hold', use: 'Capture momentary voltage for ADC', notes: 'Switch + capacitor. Holds voltage while ADC measures.' },
        { name: 'Charge pump', use: 'Generate higher voltage with no inductor', notes: 'Caps + switches. Used inside chips for internal high voltage.' },
        { name: 'Cockcroft-Walton multiplier', use: 'Very high voltage from low AC', notes: 'Cascade of diodes + caps. Old TV CRT supplies, particle accelerators.' },
        { name: 'Power-over-Ethernet (PoE)', use: 'Power + data on one Ethernet cable', notes: 'Up to 100 W (PoE++) on Cat 5+ cable. Used for IP phones, cameras, access points.' }
      ];

      var COMPUTER_HISTORY = [
        { year: '~150 BCE', what: 'Antikythera mechanism', detail: 'Ancient Greek bronze analog computer for astronomical calculations. Discovered 1901.' },
        { year: '1642', what: 'Pascal\'s calculator', detail: 'Mechanical adder using gears. One of first calculating machines.' },
        { year: '1837', what: 'Analytical Engine (Babbage)', detail: 'Programmable mechanical computer design. Never fully built. Ada Lovelace wrote first algorithm.' },
        { year: '1936', what: 'Turing machine concept', detail: 'Alan Turing\'s mathematical model of computation. Foundation of computer science.' },
        { year: '1937', what: 'Z1 (Konrad Zuse)', detail: 'First programmable mechanical computer. Used binary.' },
        { year: '1944', what: 'Mark I (Harvard, IBM)', detail: 'Electromechanical. 16 m long, 5 tons. Programmed via punched paper tape.' },
        { year: '1945', what: 'ENIAC', detail: 'First general-purpose electronic computer. 17,000+ vacuum tubes. Programmed by physically rewiring.' },
        { year: '1947', what: 'Transistor (Bell Labs)', detail: 'Bardeen, Brattain, Shockley. Replaced vacuum tubes. Nobel 1956.' },
        { year: '1958', what: 'Integrated circuit', detail: 'Jack Kilby (TI) + Robert Noyce (Fairchild). Multiple transistors on one chip.' },
        { year: '1971', what: 'Intel 4004', detail: 'First commercial microprocessor. 2,300 transistors. 4-bit CPU.' },
        { year: '1973', what: 'Xerox Alto', detail: 'First computer with GUI, mouse, ethernet. Inspired Macintosh + Windows.' },
        { year: '1975', what: 'Altair 8800', detail: 'First commercial PC kit. Bill Gates + Paul Allen wrote BASIC for it.' },
        { year: '1976', what: 'Apple I', detail: 'Jobs + Wozniak. Hand-built. Sold for $666.66.' },
        { year: '1977', what: 'Apple II, TRS-80, Commodore PET', detail: 'Personal computer revolution begins.' },
        { year: '1981', what: 'IBM PC', detail: 'Open architecture. Spawned the PC industry.' },
        { year: '1983', what: 'TCP/IP', detail: 'Internet protocol standardized. ARPANET converted in January.' },
        { year: '1984', what: 'Macintosh', detail: 'First mass-market GUI computer. "1984" Super Bowl ad.' },
        { year: '1989', what: 'World Wide Web', detail: 'Tim Berners-Lee at CERN proposes WWW. Released publicly 1991.' },
        { year: '1991', what: 'Linux 0.01', detail: 'Linus Torvalds posts to comp.os.minix. Now powers most servers, Android.' },
        { year: '1993', what: 'Mosaic browser', detail: 'First popular web browser with images. Led to Netscape (1994).' },
        { year: '1995', what: 'JavaScript, Java, Windows 95', detail: 'Pivotal year. Brendan Eich writes JS in 10 days for Netscape.' },
        { year: '1998', what: 'Google founded', detail: 'PageRank algorithm. Search becomes lucrative.' },
        { year: '2007', what: 'iPhone', detail: 'Modern smartphone. Capacitive touch + responsive UI standard.' },
        { year: '2008', what: 'Bitcoin whitepaper', detail: 'Satoshi Nakamoto. Proof-of-work blockchain.' },
        { year: '2012', what: 'AlexNet', detail: 'Deep CNN wins ImageNet by huge margin. Modern AI era begins.' },
        { year: '2017', what: 'Transformer architecture', detail: '"Attention is All You Need". Foundation of GPT, BERT, modern LLMs.' },
        { year: '2022', what: 'ChatGPT', detail: 'Mass-market LLM. 100M users in 2 months.' }
      ];

      var WORLD_ELECTRIC = [
        { region: 'Per capita electricity (US)', detail: '~12,500 kWh/yr per person. Among highest globally.' },
        { region: 'Per capita (Iceland)', detail: '~55,000 kWh/yr — highest globally. Cheap geothermal + hydro.' },
        { region: 'Per capita (Germany)', detail: '~7,000 kWh/yr.' },
        { region: 'Per capita (China)', detail: '~5,500 kWh/yr — risen rapidly from <500 in 1990.' },
        { region: 'Per capita (India)', detail: '~1,300 kWh/yr.' },
        { region: 'Per capita (sub-Saharan Africa avg)', detail: '~500 kWh/yr — many regions still developing grid access.' },
        { region: 'Without electricity', detail: '~675 million people lack reliable access (2024 IEA). Most in sub-Saharan Africa.' },
        { region: 'Top renewable share', detail: 'Iceland ~100%, Norway ~98% (hydro + small geothermal). Costa Rica ~95%.' },
        { region: 'Biggest CO₂ per kWh', detail: 'Coal-heavy grids: India, China, South Africa, Australia, Poland. ~800-1100 g CO₂/kWh.' },
        { region: 'Cleanest grids', detail: 'France ~50 g CO₂/kWh (nuclear). Iceland + Norway near zero (hydro/geo).' },
        { region: 'Grid voltage standards', detail: '120/240 V (Americas, Japan), 220/240 V (rest). 50 Hz almost everywhere except Americas (60 Hz).' },
        { region: 'Plug types', detail: '15+ standards. EU pushing for universal USB-C for devices.' },
        { region: 'Transmission voltages', detail: '~110-765 kV AC for long-distance. HVDC up to ±1100 kV (China). Higher V → less loss for same power.' },
        { region: 'Largest power plants', detail: 'Three Gorges (China): 22.5 GW hydro. Tarbela (Pakistan): 6 GW hydro. Kashiwazaki-Kariwa (Japan): 7.9 GW nuclear (idle since 2011).' }
      ];

      function renderBatteriesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔋 Battery technologies'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Battery technology comparison'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Type', 'Voltage', 'Energy density', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                BATTERY_TYPES.map(function(b, i) {
                  return h('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, b.type),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold text-[10px]' }, b.voltage),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, b.energy),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, b.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderEnergySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ Electricity generation sources'),
          h('div', { className: 'space-y-2' },
            ENERGY_SOURCES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, s.source),
                  h('span', { className: 'text-[10px] text-amber-700 font-mono ml-auto' }, s.share)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Cost: '), s.cost),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderFamouscircSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎛 Famous circuit building blocks'),
          h('div', { className: 'space-y-2' },
            FAMOUS_CIRCUITS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, c.name),
                h('div', { className: 'text-[11px] text-amber-700 font-bold mb-1' }, 'Use: ' + c.use),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderComputersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💻 Computer history timeline'),
          h('div', { className: 'space-y-1' },
            COMPUTER_HISTORY.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[10px] font-mono text-amber-700 font-bold' }, c.year),
                  h('span', { className: 'text-[12px] font-black text-amber-900' }, c.what)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      function renderWorldSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌐 Electricity around the world'),
          h('div', { className: 'space-y-2' },
            WORLD_ELECTRIC.map(function(w, i) {
              return h('div', { key: 'w'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-amber-900 mb-0.5' }, w.region),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, w.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var MICROCONTROLLERS = [
        { name: 'Arduino Uno (ATmega328P)', specs: '8-bit, 16 MHz, 32 KB flash, 2 KB RAM', notes: 'Most popular education board. 14 digital, 6 analog I/O. 5 V logic.' },
        { name: 'ESP32', specs: '32-bit dual-core, 240 MHz, 4 MB flash', notes: 'Wi-Fi + Bluetooth built in. Hugely popular in IoT. Inexpensive.' },
        { name: 'Raspberry Pi Pico (RP2040)', specs: '32-bit dual-core ARM, 133 MHz, 264 KB RAM', notes: '$4. PIO state machines for custom I/O. MicroPython or C/C++.' },
        { name: 'STM32 (ARM Cortex-M)', specs: 'Wide range: M0 to M7, 32 KB to 2 MB flash', notes: 'Industry standard for embedded. Powerful peripherals.' },
        { name: 'Teensy 4.x', specs: '32-bit ARM Cortex-M7, 600 MHz', notes: 'Very fast. Arduino-compatible. Used in pro audio, DIY MIDI.' },
        { name: 'Raspberry Pi (full)', specs: '64-bit ARM, 1.5+ GHz, runs Linux', notes: 'Single-board computer, not microcontroller. Pi 5 = real desktop performance.' },
        { name: 'BBC micro:bit', specs: '32-bit ARM, 16 MHz', notes: 'Education-focused. Built-in LEDs, accelerometer, Bluetooth. Block-based + Python coding.' },
        { name: 'PIC microcontrollers', specs: '8 to 32-bit, varies', notes: 'Microchip Technology. Common in industrial + consumer products.' },
        { name: 'AVR (Atmel)', specs: '8-bit, various', notes: 'ATmega + ATtiny families. Arduino built on these.' },
        { name: 'ESP8266', specs: '32-bit, 80 MHz, Wi-Fi', notes: 'Predecessor of ESP32. Cheap Wi-Fi MCU.' }
      ];

      var COMMON_ICS = [
        { ic: 'NE555 (timer)', use: 'Oscillator, PWM, monostable. Iconic chip.', notes: 'Released 1972. Billions sold. Easy to learn, infinitely useful.' },
        { ic: '741 op-amp', use: 'General-purpose amplifier.', notes: 'Classic but now superseded. LM358, MCP6002 better choices for new designs.' },
        { ic: '74HC00 series (logic)', use: 'NAND, NOR, AND, OR, flip-flops, counters.', notes: 'Modern CMOS replacements for older 74LS series.' },
        { ic: 'LM7805 (voltage regulator)', use: 'Linear 5 V regulator.', notes: '~1 A output. Heat sink needed for higher currents. Newer switching alternatives are more efficient.' },
        { ic: 'LM317 (adjustable regulator)', use: 'Adjustable 1.25-37 V output.', notes: 'Two resistors set output voltage.' },
        { ic: 'ULN2003 (Darlington array)', use: 'Drive relays, motors, LEDs from logic-level signals.', notes: '7 channels at up to 500 mA each.' },
        { ic: 'L298N (motor driver)', use: 'Drive 2 DC motors or 1 stepper.', notes: 'H-bridge. Common in robotics. Replaced by more efficient MOSFET drivers in newer designs.' },
        { ic: 'DS18B20 (digital thermometer)', use: 'Temperature sensor with 1-wire interface.', notes: 'Range −55 to +125°C. 9-12 bit resolution.' },
        { ic: 'MCP3008 (8-channel ADC)', use: 'Add analog input to a digital MCU.', notes: '10-bit, SPI. Common with Raspberry Pi (which has no built-in ADC).' },
        { ic: 'MAX7219 (LED matrix driver)', use: 'Drive 8×8 LED matrix or 7-segment displays.', notes: 'SPI interface. Cascade multiple modules.' },
        { ic: 'WS2812 (Neopixel)', use: 'Individually addressable RGB LEDs.', notes: 'Single data line. Chain hundreds together.' },
        { ic: 'CD4017 (decade counter)', use: 'Sequence through 10 outputs.', notes: 'Common in chaser-light projects.' }
      ];

      var DIGITAL_PROTOCOLS = [
        { protocol: 'GPIO', wires: '1+ per signal', notes: 'General-purpose I/O. Read/write digital high/low. Simplest.' },
        { protocol: 'PWM', wires: '1', notes: 'Pulse-width modulation. Vary average voltage by changing duty cycle. Used for motors, LEDs, audio.' },
        { protocol: 'I²C', wires: '2 (SDA, SCL) + power + ground', notes: 'Multi-device bus. Each device has 7-bit address. Slow (~100 kHz, 400 kHz, 1 MHz, 5 MHz).' },
        { protocol: 'SPI', wires: '4 (MOSI, MISO, SCK, SS) + power', notes: 'Faster than I²C (up to 50+ MHz). Requires extra SS pin per device.' },
        { protocol: 'UART (serial)', wires: '2 (TX, RX) + power', notes: 'Asynchronous. Common baud rates: 9600, 115200. Used for debug consoles.' },
        { protocol: 'USB', wires: '4 (D+, D−, VBUS, GND)', notes: '1.5 Mbps (Low) to 80 Gbps (USB4 v2). Hot-pluggable, powered.' },
        { protocol: 'CAN bus', wires: '2 differential', notes: 'Used in cars + industrial. Robust to noise.' },
        { protocol: '1-Wire', wires: '1 (+ ground)', notes: 'Dallas/Maxim. Power + data on same wire (parasitic power). DS18B20 thermometer uses it.' },
        { protocol: 'I²S', wires: '3 (BCLK, LRCLK, DATA)', notes: 'Digital audio between chips. 16/24/32-bit samples at various rates.' },
        { protocol: 'Ethernet', wires: '4 twisted pairs (RJ45)', notes: '10 Mbps to 100+ Gbps. PoE can deliver up to 100 W.' }
      ];

      var SENSORS = [
        { sensor: 'Potentiometer', measures: 'Position (angle or linear)', notes: 'Variable resistor. Volume knobs, joysticks.' },
        { sensor: 'Photoresistor (LDR)', measures: 'Light intensity', notes: 'Resistance drops with brighter light. Cheap, slow.' },
        { sensor: 'Photodiode', measures: 'Light intensity', notes: 'Fast. Used in optical receivers, sun trackers, solar cells.' },
        { sensor: 'Thermistor (NTC)', measures: 'Temperature', notes: 'Resistance decreases with temperature. Cheap. Non-linear.' },
        { sensor: 'RTD (Pt100, Pt1000)', measures: 'Temperature', notes: 'Very accurate + linear. More expensive than thermistors.' },
        { sensor: 'Thermocouple (J, K, T types)', measures: 'Temperature', notes: 'Wide range (−200 to +1700°C). Self-generates voltage from temperature difference.' },
        { sensor: 'Infrared (PIR)', measures: 'Motion (warm objects)', notes: 'Passive — detects changes in IR. Cheap motion sensor in security lights.' },
        { sensor: 'Ultrasonic (HC-SR04)', measures: 'Distance (~2 cm - 4 m)', notes: 'Measures time-of-flight of 40 kHz pulses. Cheap, popular for robotics.' },
        { sensor: 'Time-of-flight (VL53L0X)', measures: 'Distance via laser', notes: 'mm-resolution. Less interference than ultrasonic.' },
        { sensor: 'IMU (MPU-6050, BNO055)', measures: 'Acceleration + rotation', notes: '6 or 9-axis. Drones, AR/VR, motion tracking.' },
        { sensor: 'Hall effect sensor', measures: 'Magnetic field', notes: 'Voltage proportional to field. Speed sensors, contactless switches.' },
        { sensor: 'Pressure (BMP280)', measures: 'Air pressure', notes: 'Used as altimeter (1 hPa ≈ 8 m elevation change).' },
        { sensor: 'Humidity (DHT22, SHT3x)', measures: 'Relative humidity + temperature', notes: 'Common in HVAC + weather stations.' },
        { sensor: 'pH probe', measures: 'pH of liquid', notes: 'Glass-electrode based. Used in aquaponics, water quality.' },
        { sensor: 'CO₂ (MH-Z19, SCD30)', measures: 'CO₂ concentration', notes: 'NDIR-based. Used for ventilation control (CO₂ proxies for human exhalation).' }
      ];

      var ACTUATORS = [
        { actuator: 'LED', purpose: 'Visual indicator', notes: 'Forward voltage 1.8-3.3 V. Always use current-limit resistor.' },
        { actuator: 'Buzzer (piezo)', purpose: 'Audio alert', notes: 'Active buzzer = built-in oscillator. Passive needs driving frequency.' },
        { actuator: 'Speaker', purpose: 'Audio output', notes: 'Needs amplifier for most volumes. Impedance matters (typically 4-8 Ω).' },
        { actuator: 'DC motor', purpose: 'Continuous rotation', notes: 'Speed via PWM. Direction via H-bridge.' },
        { actuator: 'Servo (RC)', purpose: 'Position control 0-180° (typically)', notes: 'PWM 50 Hz, 1-2 ms pulse width. Internal feedback + controller.' },
        { actuator: 'Stepper motor', purpose: 'Precise position steps', notes: 'Step-and-direction or full 4-coil drive. Open-loop precision.' },
        { actuator: 'Relay (electromechanical)', purpose: 'High-power switching', notes: 'Logic signal switches separate AC/DC circuit. Audible click.' },
        { actuator: 'Solid-state relay (SSR)', purpose: 'Silent, fast switching', notes: 'Triac or MOSFET inside. Zero-crossing types for AC.' },
        { actuator: 'Solenoid', purpose: 'Linear push/pull', notes: 'Coil pulls iron core when energized. Door locks, pinball flippers.' },
        { actuator: 'Linear actuator', purpose: 'Slow, powerful linear motion', notes: 'Motor + lead screw. TV mounts, standing desks.' },
        { actuator: 'Heating element', purpose: 'Generate heat', notes: 'Resistive (Joule heating). Used with PID control for precise temperature.' },
        { actuator: 'Peltier (thermoelectric)', purpose: 'Cool or heat by electric current', notes: 'One side gets cold, other hot. Mini coolers, thermal cycling.' },
        { actuator: 'Pump (DC)', purpose: 'Move fluid', notes: 'Centrifugal, peristaltic, diaphragm. Hydroponics, dosing.' },
        { actuator: 'LCD display', purpose: 'Show text or graphics', notes: '16×2 character LCDs (HD44780) very common. Graphic OLEDs cheaper now.' },
        { actuator: 'OLED display (SSD1306)', purpose: 'Show graphics', notes: 'Tiny (0.96") I²C. Sharp, no backlight.' }
      ];

      var PCB_TOPICS = [
        { topic: 'Layers', detail: 'Most PCBs: 2 layers (top + bottom). High-density: 4, 6, 8+ layers. Inner layers often power + ground planes.' },
        { topic: 'Vias', detail: 'Plated holes connecting layers. Through-hole (full thickness), blind (surface to inner), buried (inner to inner).' },
        { topic: 'Traces', detail: 'Copper paths. Width determines current capacity (12 mil ~ 1 A on 1 oz copper).' },
        { topic: 'Ground plane', detail: 'Large copper area. Provides low-impedance return path + reduces EMI.' },
        { topic: 'Soldermask', detail: 'Insulating layer (usually green) over copper. Prevents bridging during assembly.' },
        { topic: 'Silkscreen', detail: 'Printed labels (usually white) on top of soldermask. Helps assembly + debug.' },
        { topic: 'Surface mount (SMT)', detail: 'Components soldered onto pads (no leads through holes). Smaller, mass-produced.' },
        { topic: 'Through-hole (THT)', detail: 'Component leads pass through holes + soldered on opposite side. Bigger, easier to hand-solder, mechanically stronger.' },
        { topic: 'Decoupling capacitors', detail: 'Small caps (typically 0.1 μF) near every IC power pin. Smooth supply, reduce noise.' },
        { topic: 'EMI/EMC', detail: 'Electromagnetic interference + compatibility. Shielding, ferrite beads, careful routing.' },
        { topic: 'Impedance control', detail: 'High-speed traces need controlled impedance (50 Ω typical). Trace width + layer stackup determine it.' },
        { topic: 'Differential pairs', detail: 'Two traces routed together. Used for USB, Ethernet, LVDS. Common-mode noise rejected.' },
        { topic: 'Design rules', detail: 'Minimum trace width, spacing, hole size. Determined by manufacturer + cost.' },
        { topic: 'Assembly file', detail: 'BOM (bill of materials), CPL (component placement list), Gerbers (per-layer artwork). Sent to manufacturer.' }
      ];

      var TROUBLESHOOTING = [
        { problem: 'No power', steps: 'Check battery/supply voltage with multimeter. Check fuse. Verify polarity. Check power switch.' },
        { problem: 'Burning smell or smoke', steps: 'Disconnect IMMEDIATELY. Often reversed polarity, shorted component, or under-rated part.' },
        { problem: 'Component getting hot', steps: 'Check current vs rating. Check for short circuit nearby. Add heat sink if appropriate.' },
        { problem: 'Intermittent operation', steps: 'Often a cold solder joint or loose connector. Wiggle test (gently!) while powered.' },
        { problem: 'Voltage drops under load', steps: 'Power supply current limit, undersized wires, or weak battery.' },
        { problem: 'Noisy signal', steps: 'Add decoupling caps, twist signal pairs, ferrite bead. Move away from switching power supplies.' },
        { problem: 'LED not lighting', steps: 'Check polarity (anode = +). Check current-limit resistor value. Probe forward voltage.' },
        { problem: 'Microcontroller not running', steps: 'Check 3.3 V or 5 V supply at MCU pin. Check reset line. Check crystal/clock if external.' },
        { problem: 'Code uploads but no execution', steps: 'Check programming setup, BOOT/RESET pins, oscillator. Power-on reset issue?' },
        { problem: 'Communication failure', steps: 'Verify baud rate match. Check TX↔RX cross. Add ground reference between devices.' },
        { problem: 'Motor runs the wrong direction', steps: 'Swap two of the motor leads (DC) or fix code (servo/stepper).' },
        { problem: 'Capacitor explodes', steps: 'Either exceeded voltage rating or reversed polarity. ALWAYS check before powering.' }
      ];

      var SIM_TOOLS = [
        { tool: 'LTspice', use: 'Analog circuit simulation. Free. Industry standard for switching power supply design.' },
        { tool: 'KiCad', use: 'Open-source PCB design. Free. Schematic, layout, 3D viewer, autorouter.' },
        { tool: 'Altium Designer', use: 'Industry-leading PCB design. Commercial. Used for complex products.' },
        { tool: 'Eagle (Autodesk)', use: 'PCB design. Was popular for hobbyists. Discontinued; transitioning to Fusion Electronics.' },
        { tool: 'CircuitJS / Falstad', use: 'Browser-based interactive circuit simulator. Great for visualizing current + voltage.' },
        { tool: 'Tinkercad Circuits', use: 'Beginner-friendly. Drag-and-drop. Simulates Arduino code.' },
        { tool: 'Multisim (NI)', use: 'Educational circuit simulator. Often used in college labs.' },
        { tool: 'Proteus', use: 'PCB + microcontroller co-simulation. Commercial.' },
        { tool: 'Wokwi', use: 'Browser-based Arduino/ESP32 simulator. Good for learning + testing without hardware.' },
        { tool: 'PSpice', use: 'Industrial-grade analog simulator. Now owned by Cadence.' }
      ];

      var STANDARDS = [
        { standard: 'AC mains: 120 V / 60 Hz', region: 'US, Canada, Mexico, parts of South America + Asia', notes: 'Type A/B plugs (US). Hot, neutral, ground.' },
        { standard: 'AC mains: 230 V / 50 Hz', region: 'Europe, most of Asia + Africa + Australia', notes: 'Various plug types (C, F, G/UK, I/AU).' },
        { standard: 'AC mains: 100 V / 50-60 Hz', region: 'Japan', notes: '50 Hz east, 60 Hz west (Tokyo vs Osaka).' },
        { standard: 'USB Type-A', region: 'Worldwide', notes: 'Traditional rectangular. USB 1.0-3.0. Being replaced by Type-C.' },
        { standard: 'USB Type-C', region: 'Worldwide', notes: 'Reversible. Up to 240 W (USB-PD 3.1). Up to 80 Gbps (USB4 v2). EU mandates for new mobiles.' },
        { standard: 'Lightning (Apple)', region: 'Apple devices (pre-2024)', notes: 'Apple proprietary. iPhone 15+ switched to USB-C (EU regulation).' },
        { standard: 'XLR', region: 'Pro audio', notes: '3-pin (balanced microphone), 4-7 pin variants. Locking connector.' },
        { standard: '1/4" TRS / TS', region: 'Musical instruments + headphones', notes: 'Guitar cables, headphone jacks (also 3.5 mm version).' },
        { standard: 'RJ45 (Ethernet)', region: 'Worldwide', notes: '8 pins, 4 pairs. Cat 5e (1 Gbps), Cat 6 (10 Gbps short runs), Cat 8 (40 Gbps).' },
        { standard: 'HDMI', region: 'Worldwide', notes: 'Audio + video. HDMI 2.1: 48 Gbps, 8K@60.' },
        { standard: 'DisplayPort', region: 'Worldwide', notes: 'Computer displays. DP 2.0: 80 Gbps. Common on monitors.' },
        { standard: 'GPIB / IEEE-488', region: 'Test equipment', notes: 'Old but persistent. Bench multimeters, scopes.' }
      ];

      var ELEC_CAREERS = [
        { career: 'Electrical engineer', detail: 'Design power systems, motors, transformers. Utility scale to portable devices.' },
        { career: 'Electronics engineer', detail: 'Design circuit boards, embedded systems. Signal processing, power electronics.' },
        { career: 'Embedded software engineer', detail: 'Firmware for microcontrollers. C/C++, RTOS. Bridges hardware + software.' },
        { career: 'PCB designer', detail: 'Schematic capture + board layout. Trace routing, signal integrity.' },
        { career: 'Power systems engineer', detail: 'Grid design, generation, transmission. Renewable integration.' },
        { career: 'RF engineer', detail: 'Antennas, wireless systems, radar. Touches everything from satellites to Wi-Fi chips.' },
        { career: 'Field service technician', detail: 'Install + repair industrial equipment, telecom systems, medical devices.' },
        { career: 'Lineworker', detail: 'Install + maintain power lines. Demanding + dangerous; well-paid skilled trade.' },
        { career: 'Electrician', detail: 'Install + maintain building wiring. Residential, commercial, industrial. Licensed trade.' },
        { career: 'Robotics engineer', detail: 'Combines electrical + mechanical + software. Industrial robots, drones, self-driving.' },
        { career: 'Test engineer', detail: 'Validates products. ESD, EMC, environmental, life testing.' },
        { career: 'Audio engineer', detail: 'Equipment design, mixing, mastering. Live sound + studio.' },
        { career: 'Maker / hobbyist', detail: 'Open path with Arduino, RPi, ESP32. Some become professionals; many enjoy as creative outlet.' }
      ];

      function renderMicroSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧠 Microcontrollers'),
          h('div', { className: 'space-y-2' },
            MICROCONTROLLERS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, m.name),
                  h('span', { className: 'text-[10px] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, m.specs)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.notes)
              );
            })
          )
        );
      }

      function renderIcsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⬚ Common integrated circuits'),
          h('div', { className: 'space-y-2' },
            COMMON_ICS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, c.ic),
                h('div', { className: 'text-[11px] text-amber-700 font-bold mb-1' }, c.use),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderProtosSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↔ Digital communication protocols'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Digital communication protocols'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Protocol', 'Wires', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                DIGITAL_PROTOCOLS.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, p.protocol),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 text-[10px]' }, p.wires),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderSensorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '◉ Sensors'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Electronic sensor reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Sensor', 'Measures', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SENSORS.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, s.sensor),
                    h('td', { className: 'px-2 py-1 text-amber-700 font-medium text-[10px]' }, s.measures),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderActuatorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚙ Actuators + outputs'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Electronic actuator reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Actuator', 'Purpose', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                ACTUATORS.map(function(a, i) {
                  return h('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, a.actuator),
                    h('td', { className: 'px-2 py-1 text-amber-700 font-medium text-[10px]' }, a.purpose),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderPcbSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '▦ PCB design concepts'),
          h('div', { className: 'space-y-1' },
            PCB_TOPICS.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-amber-900 mb-0.5' }, p.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, p.detail)
              );
            })
          )
        );
      }

      function renderTroubleshootSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🛠 Troubleshooting checklist'),
          h('div', { className: 'space-y-2' },
            TROUBLESHOOTING.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-amber-900 mb-0.5' }, t.problem),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.steps)
              );
            })
          )
        );
      }

      function renderSimulationSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🖥 Circuit simulation tools'),
          h('div', { className: 'space-y-2' },
            SIM_TOOLS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, s.tool),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.use)
              );
            })
          )
        );
      }

      function renderStandardsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔌 Standards, plugs, and connectors'),
          h('div', { className: 'space-y-2' },
            STANDARDS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, s.standard),
                  h('span', { className: 'text-[10px] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, s.region)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderCareersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💼 Careers in electronics'),
          h('div', { className: 'space-y-2' },
            ELEC_CAREERS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-amber-900 mb-0.5' }, c.career),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      var __circuitExpansions = h('div', { id: 'circuit-reference-panel', role: 'tabpanel', className: 'mt-4 max-w-3xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && h('div', { className: 'mt-2' }, renderActiveSection())
      );

      return h(React.Fragment, null,
        renderWorkspaceSwitch(),
        workspaceTab === 'reference' ? __circuitExpansions : h('div', { id: 'circuit-build-panel', role: 'tabpanel' }, __circuitMainView)
      );
    }
  });

  console.log('[StemLab] stem_tool_circuit.js loaded - Circuit Builder');
})();
