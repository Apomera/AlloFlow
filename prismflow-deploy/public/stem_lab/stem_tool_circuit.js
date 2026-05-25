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
      '.circuit-card { animation: circuitSlideIn 0.3s ease-out; }',
      '.circuit-badge { animation: circuitBadgePop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }',
      '.circuit-active { animation: circuitPulse 2s ease-in-out infinite; }',
      '.circuit-short { animation: circuitShortSpark 0.8s ease-out; }',
      '*:focus-visible { outline: 2px solid #eab308 !important; outline-offset: 2px !important; box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.4) !important; }',
      '.glass-panel { background: rgba(15, 23, 42, 0.6) !important; backdrop-filter: blur(12px) !important; border: 1px solid rgba(255, 255, 255, 0.08) !important; }',
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
            if (c.type === 'capacitor') return 1 / (2 * Math.PI * 60 * (c.value || 1) * 1e-6);
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
          };

          // ── Circuit calculations ──
          var hasOpenSwitch = mode === 'series' && components.some(function(c) { return c.type === 'switch' && !c.closed; });

          var totalR;
          if (hasOpenSwitch) {
            totalR = 1e9;
          } else if (mode === 'series') {
            totalR = components.reduce(function(s, c) { return s + getCompR(c); }, 0) || 0.001;
          } else {
            if (components.length > 0) {
              var invSum = components.reduce(function(s, c) { return s + 1 / (getCompR(c) || 1); }, 0);
              totalR = invSum > 0 ? 1 / invSum : 0.001;
            } else {
              totalR = 0.001;
            }
          }

          var current = hasOpenSwitch ? 0 : voltage / totalR;
          var power = voltage * current;
          var isShort = components.length > 0 && totalR < 1 && !hasOpenSwitch;
          var isOpen = hasOpenSwitch;

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

          if (current > 0.001 && !isShort) {
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
            var newComps = components.filter(function(_, j) { return j !== idx; });
            upd('components', newComps);
            circuitSound('removeComp');
          };

          // ── Clear components ──
          var clearComponents = function() {
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
            if (comp.type === 'bulb') return 'Bulb';
            if (comp.type === 'switch') return comp.closed ? 'ON' : 'OFF';
            if (comp.type === 'led') return 'LED';
            if (comp.type === 'ammeter') return 'Ammeter';
            if (comp.type === 'voltmeter') return 'Voltmeter';
            if (comp.type === 'capacitor') return 'Cap';
            return comp.type;
          };

          // ── Grade-band intro text ──
          var introText = gradeText(
            'Build a circuit! Connect parts to make electricity flow and light up bulbs.',
            'Build series and parallel circuits. Add resistors, bulbs, and switches. Watch how changing voltage affects current!',
            'Explore Ohm\'s Law (V=IR) by building circuits. Compare series vs parallel. Measure with ammeter and voltmeter.',
            'Analyze DC circuits using Ohm\'s Law, Kirchhoff\'s Laws, and power dissipation. Series, parallel, and mixed configurations.'
          )(band);

          // ──────────────────────────────────────────
          // RENDER
          // ──────────────────────────────────────────
          return h('div', { className: 'max-w-3xl mx-auto p-5 rounded-2xl border bg-slate-950/90 border-slate-800 text-slate-100 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200' },

            // ── Header ──
            h('div', { className: 'flex items-center gap-3 mb-3 flex-wrap' },
              h('button', {
                onClick: function() { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
                className: 'p-1.5 hover:bg-slate-800 rounded-lg transition-all',
                'aria-label': 'Back to tools'
              }, h(ArrowLeft, { size: 18, className: 'text-slate-400' })),

              h('h3', { className: 'text-lg font-bold text-white' }, '\\uD83D\\uDD0C Circuit Builder'),

              h('span', { className: 'px-2 py-0.5 bg-yellow-950/60 text-yellow-400 text-[10px] font-black rounded-full border border-yellow-500/20' }, 'INTERACTIVE'),

              isShort && h('span', { className: 'px-2 py-0.5 bg-red-950/60 text-red-400 text-[10px] font-black rounded-full border border-red-500/30 animate-pulse' }, '\\u26A0 SHORT CIRCUIT!'),

              // Badge toggle
              h('button', { 'aria-label': 'Badges',
                onClick: function() { upd('showBadges', !showBadges); },
                className: 'px-2.5 py-1 text-xs rounded-lg transition-all font-semibold ' + (showBadges ? 'bg-amber-950/40 text-amber-400 border border-amber-600/40' : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white')
              }, '\\uD83C\\uDFC5 Badges'),

              // AI toggle
              h('button', { 'aria-label': 'AI Tutor',
                onClick: function() { upd('showAI', !showAI); },
                className: 'px-2.5 py-1 text-xs rounded-lg transition-all font-semibold ' + (showAI ? 'bg-blue-950/40 text-blue-400 border border-blue-600/40' : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white')
              }, '\\uD83E\\uDD16 AI Tutor'),

              // Mode buttons
              h('div', { className: 'flex gap-1 ml-auto' },
                ['series', 'parallel'].map(function(m) {
                  return h('button', { key: m,
                    onClick: function() { upd('mode', m); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ' + (mode === m ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/25' : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200')
                  }, m);
                })
              )
            ),

            // ── Grade-band intro ──
            h('p', { className: 'text-xs text-slate-400 font-medium italic -mt-1 mb-4' }, introText),

            // ══════════════════════════════════════
            // SVG Schematic
            // ══════════════════════════════════════
            h('div', { className: 'relative' },
              h('svg', {
                viewBox: '0 0 ' + W + ' ' + H,
                className: 'w-full rounded-xl border transition-all ' + (isShort ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-500/10' : 'bg-slate-900 border-slate-800 shadow-inner'),
                style: { maxHeight: '220px' }
              },
                // Definitions for gradients & patterns
                h('defs', null,
                  h('pattern', { id: 'grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' },
                    h('path', { d: 'M 20 0 L 0 0 0 20', fill: 'none', stroke: 'rgba(255,255,255,0.03)', strokeWidth: 1 })
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
                
                // Battery
                h('rect', { x: 15, y: 40, width: 40, height: 60, fill: isShort ? '#7f1d1d' : '#ca8a04', stroke: isShort ? '#ef4444' : '#eab308', strokeWidth: 2, rx: 6 }),
                // Highlight on battery
                h('rect', { x: 17, y: 42, width: 12, height: 56, fill: 'rgba(255,255,255,0.08)', rx: 3 }),
                h('text', { x: 35, y: 74, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: '900', fontFamily: 'system-ui' }, fill: '#ffffff' }, voltage + 'V'),
                h('text', { x: 35, y: 30, textAnchor: 'middle', style: { fontSize: '12px' } }, '\\uD83D\\uDD0B'),
                h('text', { x: 20, y: 38, fill: '#ef4444', style: { fontSize: '12px', fontWeight: 'bold' } }, '+'),
                h('text', { x: 20, y: 110, fill: '#3b82f6', style: { fontSize: '12px', fontWeight: 'bold' } }, '\\u2212'),

                // Dynamic Wires
                (function() {
                  var wires = [];
                  var wireColor = isShort ? '#ef4444' : '#475569';
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
                  return wires;
                })(),

                // Battery connections
                h('line', { x1: 35, y1: 40, x2: 35, y2: 20, stroke: isShort ? '#ef4444' : '#475569', strokeWidth: 2 }),
                h('line', { x1: 35, y1: 100, x2: 35, y2: 140, stroke: isShort ? '#ef4444' : '#475569', strokeWidth: 2 }),

                // Current direction arrow
                !isShort && current > 0.01 && h('g', null,
                  h('polygon', { points: '210,12 220,8 220,16', fill: '#06b6d4' }),
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
                              h('text', { x: cx, y: 66, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: '900', fontFamily: 'system-ui' }, fill: comp.closed ? '#10b981' : '#ef4444' }, comp.closed ? 'ON' : 'OFF')
                            )

                          : comp.type === 'led'
                          ? h('g', { onClick: function() { cycleLedColor(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'LED ' + comp.id + ' (color ' + (comp.ledColor || '#ef4444') + '). Press Enter to cycle color.', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleLedColor(comp.id); } }, style: { cursor: 'pointer' } },
                              // Glow light cone
                              ledGlow > 0.1 && h('polygon', { points: (cx - 14) + ',78 ' + (cx + 14) + ',78 ' + cx + ',115', fill: 'url(#led-grad-' + comp.id + ')', pointerEvents: 'none' }),
                              ledGlow > 0.1 && h('circle', { cx: cx, cy: 75, r: 14 + ledGlow * 6, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow * 0.35).toFixed(2)) }),
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
                                h('text', { x: cx - 10, y: 88, fill: '#3b82f6', style: { fontSize: '8px', fontWeight: 'bold' } }, '\\u2212'),
                                h('text', { x: cx + 5, y: 88, fill: '#3b82f6', style: { fontSize: '8px', fontWeight: 'bold' } }, '\\u2212')
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
                          }, comp.type === 'led' ? '~2V drop' : (comp.type === 'capacitor' ? comp.value + '\\u00B5F' : comp.value + '\\u03A9')),

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
                      var bulbBright2 = comp.type === 'bulb' ? Math.min(compP2 / 12, 1) : 0;
                      var ledGlow2 = comp.type === 'led' && compI2 > 0.005 ? Math.min(compI2 * 20, 1) : 0;
                      var chargeLvl = Math.min(tick / 120, 1);

                      return h('g', { key: comp.id },
                        // Leads connecting to bus lines
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
                              h('text', { x: 220, y: cy - 10, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: '900' }, fill: comp.closed ? '#10b981' : '#ef4444' }, comp.closed ? 'ON' : 'OFF')
                            )

                          : comp.type === 'led'
                          ? h('g', { onClick: function() { cycleLedColor(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'LED ' + comp.id + ' (color ' + (comp.ledColor || '#ef4444') + '). Press Enter to cycle color.', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleLedColor(comp.id); } }, style: { cursor: 'pointer' } },
                              ledGlow2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 12 + ledGlow2 * 5, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow2 * 0.35).toFixed(2)) }),
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
                              bulbBright2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 12 + bulbBright2 * 5, fill: 'rgba(251,191,36,' + (bulbBright2 * 0.25).toFixed(2) + ')' }),
                              h('circle', { cx: 220, cy: cy, r: 10, fill: bulbBright2 > 0.2 ? 'rgba(253,224,71,' + (0.3 + bulbBright2 * 0.7).toFixed(2) + ')' : '#334155', stroke: '#eab308', strokeWidth: 1.2 })
                            ),

                        // Value/reading labels (parallel)
                        comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                          && h('text', { x: 220, y: cy - 10, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#cbd5e1' }, comp.type === 'led' ? '~2V' : (comp.type === 'capacitor' ? comp.value + '\\u00B5F' : comp.value + '\\u03A9')),

                        comp.type === 'ammeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#22d3ee' }, compI2.toFixed(3) + 'A'),
                        comp.type === 'voltmeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#fbbf24' }, voltage.toFixed(1) + 'V'),
                        comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontFamily: 'monospace' }, fill: '#38bdf8' }, compI2.toFixed(2) + 'A')
                      );
                    }),

                // Electron dots
                electronDots.map(function(dot, i) {
                  return h('circle', { key: 'e' + i, cx: dot.x, cy: dot.y, r: 3, fill: '#06b6d4', opacity: 0.8, filter: 'drop-shadow(0 0 2px #06b6d4)' });
                }),

                // Empty state
                components.length === 0 && h('text', { x: W / 2, y: H / 2, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' } }, 'Add components below')
              ),

              // Transparent HTML5 canvas overlay for short circuit particles
              isShort && h('canvas', {
                ref: function(canvas) {
                  if (!canvas) {
                    if (window._circuitCanvasCleanup) window._circuitCanvasCleanup();
                    return;
                  }
                  var ctx2d = canvas.getContext('2d');
                  var w = canvas.width = canvas.offsetWidth || W;
                  var h = canvas.height = canvas.offsetHeight || H;
                  
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
                  
                  var active = true;
                  function loop() {
                    if (!active) return;
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
                        ctx2d.fillStyle = 'rgba(251, 146, 60, ' + (pt.life / pt.maxLife).toFixed(2) + ')';
                        ctx2d.beginPath();
                        ctx2d.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                        ctx2d.fill();
                        ctx2d.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                        ctx2d.lineWidth = 1;
                        ctx2d.stroke();
                      } else {
                        // smoke
                        ctx2d.fillStyle = 'rgba(148, 163, 184, ' + (pt.life / pt.maxLife * 0.15).toFixed(2) + ')';
                        ctx2d.beginPath();
                        ctx2d.arc(pt.x, pt.y, pt.size + (1 - pt.life / pt.maxLife) * 8, 0, Math.PI * 2);
                        ctx2d.fill();
                      }
                    }
                    
                    canvas.particles = canvas.particles.filter(function(pt) { return pt.life > 0; });
                    requestAnimationFrame(loop);
                  }
                  
                  requestAnimationFrame(loop);
                  window._circuitCanvasCleanup = function() { active = false; };
                },
                className: 'absolute inset-0 w-full h-full pointer-events-none'
              })
            ),

            // ══════════════════════════════════════
            // Component buttons
            // ══════════════════════════════════════
            h('div', { className: 'flex flex-wrap gap-2 mt-4 mb-4 justify-center sm:justify-start' },
              h('button', { 'aria-label': 'Resistor',
                onClick: function() { addComponent('resistor', 100); },
                className: 'px-3 py-1.5 bg-yellow-950/20 hover:bg-yellow-500/20 text-yellow-400 font-bold rounded-lg text-xs border border-yellow-500/30 hover:border-yellow-400 transition-all glow-button'
              }, '\\u2795 Resistor'),

              h('button', { 'aria-label': 'Bulb',
                onClick: function() { addComponent('bulb', 50); },
                className: 'px-3 py-1.5 bg-amber-950/20 hover:bg-amber-500/20 text-amber-400 font-bold rounded-lg text-xs border border-amber-500/30 hover:border-amber-400 transition-all glow-button'
              }, '\\uD83D\\uDCA1 Bulb'),

              h('button', { 'aria-label': 'Switch',
                onClick: function() { addComponent('switch', 0, { closed: true }); },
                className: 'px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-lg text-xs border border-emerald-500/30 hover:border-emerald-400 transition-all glow-button'
              }, '\\uD83D\\uDD18 Switch'),

              h('button', { 'aria-label': 'LED',
                onClick: function() { addComponent('led', 40, { ledColor: '#ef4444' }); },
                className: 'px-3 py-1.5 bg-rose-950/20 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg text-xs border border-rose-500/30 hover:border-rose-400 transition-all glow-button'
              }, '\\uD83D\\uDD34 LED'),

              h('button', { 'aria-label': 'Ammeter',
                onClick: function() { addComponent('ammeter', 0); },
                className: 'px-3 py-1.5 bg-cyan-950/20 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded-lg text-xs border border-cyan-500/30 hover:border-cyan-400 transition-all glow-button'
              }, '\\u26A1 Ammeter'),

              h('button', { 'aria-label': 'Voltmeter',
                onClick: function() { addComponent('voltmeter', 0); },
                className: 'px-3 py-1.5 bg-orange-950/20 hover:bg-orange-500/20 text-orange-400 font-bold rounded-lg text-xs border border-orange-500/30 hover:border-orange-400 transition-all glow-button'
              }, '\\uD83D\\uDD0B Voltmeter'),

              h('button', { 'aria-label': 'Capacitor',
                onClick: function() { addComponent('capacitor', 100); },
                className: 'px-3 py-1.5 bg-sky-950/20 hover:bg-sky-500/20 text-sky-400 font-bold rounded-lg text-xs border border-sky-500/30 hover:border-sky-400 transition-all glow-button'
              }, '\\u2E28 Capacitor'),

              h('button', { 'aria-label': 'Clear',
                onClick: clearComponents,
                className: 'px-3 py-1.5 bg-red-950/30 hover:bg-red-500/30 text-red-400 font-bold rounded-lg text-xs border border-red-500/30 hover:border-red-400 transition-all'
              }, '\\uD83D\\uDDD1 Clear'),

              components.length > 0 && h('span', { className: 'self-center text-xs text-slate-400 ml-auto font-mono' }, components.length + ' component' + (components.length > 1 ? 's' : ''))
            ),

            // ══════════════════════════════════════
            // Voltage slider + component editor
            // ══════════════════════════════════════
            h('div', { className: 'bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md mt-4' },
              // Voltage slider row
              h('div', { className: 'flex items-center gap-3 mb-4' },
                h('span', { className: 'text-xl' }, '\\uD83D\\uDD0B'),
                h('input', {
                  type: 'range', 'aria-label': 'Voltage slider', min: 1, max: 24, step: 0.5,
                  value: voltage,
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
                    (comp.type === 'resistor' || comp.type === 'bulb') && h('span', { className: 'text-xs text-slate-400' }, '\\u03A9'),

                    // Capacitor value input (in uF)
                    comp.type === 'capacitor' && h('input', {
                      type: 'number', min: 1, max: 10000, value: comp.value,
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
                    comp.type === 'capacitor' && h('span', { className: 'text-xs text-slate-400' }, '\\u00B5F'),

                    // Switch toggle button
                    comp.type === 'switch' && h('button', { 'aria-label': 'Toggle Switch',
                      onClick: function() { toggleSwitch(comp.id); },
                      className: 'px-2 py-1 text-xs font-bold rounded border transition-all ' + (comp.closed ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800 hover:bg-emerald-900/40' : 'bg-red-950/30 text-red-400 border-red-800 hover:bg-red-900/40')
                    }, comp.closed ? 'Close' : 'Open'),

                    // LED color cycle button
                    comp.type === 'led' && h('button', { 'aria-label': 'Cycle LED Color',
                      onClick: function() { cycleLedColor(comp.id); },
                      className: 'w-5 h-5 rounded-full border-2 border-slate-700 hover:scale-110 transition-transform',
                      style: { backgroundColor: comp.ledColor || '#ef4444' }
                    }),

                    // Remove button
                    h('button', { 'aria-label': 'Remove Component',
                      onClick: function() { removeComponent(i); },
                      className: 'text-slate-500 hover:text-red-400 ml-auto font-bold text-lg px-1'
                    }, '\\u00D7')
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Readout cards (4 metrics)
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2' },
              [
                { label: 'Mode', val: mode, color: 'slate', icon: mode === 'series' ? '\\u2192' : '\\u2261', textCls: 'text-slate-400', valCls: 'text-slate-200', borderCls: 'border-slate-800 bg-slate-900/40' },
                { label: 'Resistance', val: totalR >= 1e8 ? '\\u221E' : totalR.toFixed(1) + '\\u03A9', color: 'yellow', icon: '\\u2AE8', textCls: 'text-yellow-500/80', valCls: 'text-yellow-400', borderCls: 'border-yellow-500/20 bg-yellow-950/10' },
                { label: 'Current', val: current.toFixed(3) + 'A', color: 'blue', icon: '\\u26A1', textCls: 'text-blue-500/80', valCls: 'text-blue-400', borderCls: 'border-blue-500/20 bg-blue-950/10' },
                { label: 'Power', val: power.toFixed(2) + 'W', color: 'red', icon: '\\uD83D\\uDD25', textCls: 'text-rose-500/80', valCls: 'text-rose-400', borderCls: 'border-rose-500/20 bg-rose-950/10' }
              ].map(function(m) {
                var isSh = isShort && m.label !== 'Mode';
                return h('div', {
                  key: m.label,
                  className: 'text-center p-3 rounded-xl border backdrop-blur-sm transition-all ' + (isSh ? 'bg-red-950/20 border-red-500/40 short-active-flash' : m.borderCls)
                },
                  h('p', { className: 'text-[10px] font-bold uppercase tracking-wider mb-1 ' + (isSh ? 'text-red-400' : m.textCls) }, m.icon + ' ' + m.label),
                  h('p', { className: 'text-sm font-black font-mono ' + (isSh ? 'text-red-300' : m.valCls) }, m.val)
                );
              })
            ),

            // ══════════════════════════════════════
            // Per-component analysis table
            // ══════════════════════════════════════
            components.length > 0 && h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-yellow-500 uppercase tracking-wider mb-2' }, '\\u26A1 Per-Component Analysis'),
              h('div', { className: 'space-y-1.5' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compI = mode === 'series' ? current : voltage / compR;
                  var compV = mode === 'series' ? current * compR : voltage;
                  var compP = compV * compI;
                  var typeIcon = comp.type === 'resistor' ? '\\u2AE8 R' : comp.type === 'bulb' ? '\\uD83D\\uDCA1 B' : comp.type === 'switch' ? '\\uD83D\\uDD18 S' : comp.type === 'led' ? '\\uD83D\\uDD34 L' : comp.type === 'ammeter' ? '\\u26A1 A' : comp.type === 'voltmeter' ? '\\uD83D\\uDD0B V' : '\\u2E28 C';
                  var rDisplay = comp.type === 'switch' ? (comp.closed ? '~0\\u03A9' : '\\u221E') : comp.type === 'ammeter' ? '~0\\u03A9' : comp.type === 'voltmeter' ? '\\u221E' : comp.type === 'led' ? '~40\\u03A9' : comp.type === 'capacitor' ? Math.round(getCompR(comp)) + '\\u03A9 Xc' : comp.value + '\\u03A9';

                  return h('div', { key: comp.id, className: 'flex items-center gap-2 text-xs bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-800/60' },
                    h('span', { className: 'font-bold text-yellow-500 w-16' }, typeIcon + (i + 1)),
                    h('span', { className: 'text-slate-400 w-20 font-mono' }, rDisplay),

                    comp.type === 'ammeter'
                      ? h('span', { className: 'text-cyan-400 w-40 font-mono font-bold' }, '\\u27A1 ' + compI.toFixed(3) + 'A (reads current)')
                      : comp.type === 'voltmeter'
                      ? h('span', { className: 'text-yellow-400 w-40 font-mono font-bold' }, '\\u27A1 ' + voltage.toFixed(1) + 'V (reads voltage)')
                      : h(React.Fragment, null,
                          h('span', { className: 'text-cyan-400 w-20 font-mono' }, compV.toFixed(2) + 'V'),
                          h('span', { className: 'text-emerald-400 w-20 font-mono' }, compI.toFixed(3) + 'A'),
                          h('span', { className: 'text-rose-400 w-20 font-mono font-bold' }, compP.toFixed(2) + 'W')
                        ),

                    comp.type === 'bulb' && h('span', { className: 'text-yellow-400 ml-auto' }, compP > 10 ? '\\uD83D\\uDD06' : compP > 3 ? '\\uD83D\\uDCA1' : '\\uD83D\\uDD05'),
                    comp.type === 'switch' && h('span', { className: 'ml-auto ' + (comp.closed ? 'text-emerald-400' : 'text-red-400') }, comp.closed ? '\\u2705 Closed' : '\\u274C Open'),
                    comp.type === 'led' && h('span', { className: 'ml-auto', style: { color: comp.ledColor || '#ef4444' } }, compI > 0.005 ? '\\u2B50 Lit' : '\\u26AB Off'),
                    comp.type === 'capacitor' && h('span', { className: 'text-sky-400 ml-auto font-mono text-[10px]' }, comp.value + '\\u00B5F @ 60Hz')
                  );
                })
              ),

              // Formula reminder
              h('div', { className: 'mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-medium' },
                h('span', null, '\\u2696 V = IR'),
                h('span', null, '\\u2022'),
                h('span', null, 'P = IV'),
                h('span', null, '\\u2022'),
                h('span', null, mode === 'series' ? 'Series: same current through all' : 'Parallel: same voltage across all')
              )
            ),

            // ══════════════════════════════════════
            // KVL Verification (g68 / g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && components.length > 0 && mode === 'series' && current > 0.001 && h('div', { className: 'mt-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2' }, '\\u2696 Kirchhoff\'s Voltage Law (KVL) Verification'),
              h('p', { className: 'text-xs text-slate-300 mb-2' }, 'The sum of voltage drops around any closed loop equals the source voltage.'),
              h('div', { className: 'space-y-1' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compV = current * compR;
                  if (comp.type === 'ammeter' || comp.type === 'voltmeter') return null;
                  return h('div', { key: comp.id, className: 'flex items-center gap-2 text-xs font-mono text-slate-400' },
                    h('span', null, 'V' + (i + 1) + ' = I \\u00D7 R = ' + current.toFixed(3) + ' \\u00D7 ' + compR.toFixed(1) + ' = ' + compV.toFixed(2) + 'V')
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
                      h('span', { className: 'text-indigo-300' }, '\\u2211 V_drops = ' + vSum.toFixed(2) + 'V'),
                      h('span', { className: 'text-indigo-400' }, '\\u2248'),
                      h('span', { className: 'text-indigo-300' }, 'V_source = ' + voltage + 'V'),
                      h('span', { className: Math.abs(vSum - voltage) < 0.1 ? 'text-emerald-400' : 'text-rose-400' }, Math.abs(vSum - voltage) < 0.1 ? '\\u2705 Validated' : '\\u26A0\\uFE0F')
                    );
                  })()
                )
              )
            ),

            // ══════════════════════════════════════
            // Open/Short circuit warnings
            // ══════════════════════════════════════
            isOpen && h('div', { className: 'mt-4 bg-amber-950/20 rounded-xl border border-amber-500/40 p-4 text-center' },
              h('p', { className: 'text-base font-black text-amber-400' }, '\\uD83D\\uDD13 CIRCUIT OPEN'),
              h('p', { className: 'text-xs text-amber-500/90 mt-1' }, 'A switch is open - no current flows. Close all switches to complete the circuit.')
            ),

            isShort && h('div', { className: 'mt-4 bg-red-950/30 rounded-xl border border-red-500/40 p-4 text-center short-active-flash' },
              h('p', { className: 'text-base font-black text-red-400' }, '\\u26A0\\uFE0F SHORT CIRCUIT DETECTED'),
              h('p', { className: 'text-xs text-red-400/90 mt-1' }, 'Total resistance is below 1\\u03A9! In real life, this could damage components or cause a fire. Add more resistance.')
            ),

            // ══════════════════════════════════════
            // Circuit Presets
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('button', { 'aria-label': 'Circuit Presets',
                onClick: function() { upd('showPresets', !showPresets); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[11px] font-bold text-slate-300 uppercase tracking-wider' }, '\\uD83D\\uDCCB Circuit Presets'),
                h('span', { className: 'ml-auto text-slate-400 text-xs' }, showPresets ? '\\u25B2' : '\\u25BC')
              ),
              showPresets && h('div', { className: 'flex flex-wrap gap-2 mt-3' },
                CIRCUIT_PRESETS.map(function(preset) {
                  return h('button', { 'aria-label': 'Load Preset',
                    key: preset.id,
                    onClick: function() { loadPreset(preset); },
                    className: 'px-3 py-2 rounded-lg text-xs border border-slate-800 bg-slate-950/60 hover:bg-slate-800 transition-all text-left w-full sm:w-auto',
                    title: preset.desc
                  },
                    h('span', { className: 'font-bold text-slate-200 block' }, preset.label),
                    h('span', { className: 'text-[10px] text-slate-400 mt-0.5 block' }, preset.desc)
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Circuit Challenges (10)
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-amber-950/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-2' }, '\\uD83C\\uDFAF Circuit Challenges'),
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
                          if (typeof addToast === 'function') addToast('\\u2705 Challenge complete! You hit ' + actual.toFixed(3) + ch.unit + ' (target: ' + ch.target + ch.unit + ')', 'success');
                          if (typeof awardXP === 'function') awardXP('circuitChallenge', 10, ch.label);
                          checkBadges(getBadgeUpdates({ challengesDone: newDone }));
                        } else {
                          if (typeof addToast === 'function') addToast('\\u2705 Already completed! ' + actual.toFixed(3) + ch.unit, 'info');
                        }
                      } else {
                        if (typeof addToast === 'function') addToast('\\uD83C\\uDFAF Target: ' + ch.target + ch.unit + ' | Current: ' + actual.toFixed(3) + ch.unit + '. Adjust components!', 'info');
                        upd('challenge', ch);
                      }
                    },
                    className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ' + (close ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40 shadow-sm' : challengesDoneSet[ci] ? 'bg-emerald-950/20 text-emerald-500/60 border-emerald-800' : 'bg-slate-900 border-slate-800 text-amber-500 hover:bg-slate-800')
                  }, (close || challengesDoneSet[ci] ? '\\u2705 ' : '\\uD83C\\uDFAF ') + ch.label);
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
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (ohmQuiz ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20')
                  }, ohmQuiz ? '\\uD83D\\uDD04 Next Question' : '\\u26A1 Ohm\'s Law Quiz'),
                  ohmScore > 0 && h('span', { className: 'text-xs font-bold text-emerald-400' }, '\\u2B50 ' + ohmScore + ' correct'),
                  ohmStreak > 1 && h('span', { className: 'text-xs font-bold text-orange-400 animate-pulse' }, '\\uD83D\\uDD25 ' + ohmStreak + ' streak')
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
                            if (typeof addToast === 'function') addToast('\\u26A1 Correct! ' + ohmQuiz.formula, 'success');
                            if (typeof awardXP === 'function') awardXP('circuit', 10, 'Ohm\'s Law Quiz');
                          } else {
                            circuitSound('wrong');
                            if (typeof addToast === 'function') addToast('\\u274C ' + ohmQuiz.formula, 'error');
                          }
                          checkBadges(getBadgeUpdates({ quizScore: newScore, quizStreak: newStreak }));
                        },
                        className: 'px-3 py-2 rounded-lg text-xs font-bold border border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-500 hover:bg-blue-950/30 transition-all'
                      }, opt + ohmQuiz.unit);
                    })
                  )
                ),

                // Answered question (feedback)
                ohmQuiz && ohmQuiz.answered && h('div', {
                  className: 'p-3 rounded-lg text-sm font-bold ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/20 text-red-400 border border-red-900/30')
                },
                  Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? '\\u2705 Correct!' : '\\u274C Answer: ' + ohmQuiz.answer + ohmQuiz.unit,
                  h('p', {
                    className: 'text-xs font-normal mt-1 ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'text-emerald-500' : 'text-red-500')
                  }, '\\uD83D\\uDD0D ' + ohmQuiz.formula)
                )
              );
            })(),

            // ══════════════════════════════════════
            // Badge panel (collapsible)
            // ══════════════════════════════════════
            showBadges && h('div', { className: 'mt-4 bg-amber-950/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2' }, '\\uD83C\\uDFC5 Badges (' + Object.keys(badges).length + '/' + BADGES.length + ')'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                BADGES.map(function(b) {
                  var earned = badges[b.id];
                  return h('div', {
                    key: b.id,
                    className: 'flex items-center gap-2.5 p-2 rounded-lg border text-xs ' + (earned ? 'bg-slate-950/60 border-amber-500/30 text-amber-300' : 'bg-slate-900/20 border-slate-900 opacity-40')
                  },
                    h('span', { className: 'text-base' }, earned ? b.icon : '\\uD83D\\uDD12'),
                    h('div', null,
                      h('p', { className: 'font-bold ' + (earned ? 'text-amber-300' : 'text-slate-500') }, b.name),
                      h('p', { className: 'text-[10px] ' + (earned ? 'text-amber-400/80' : 'text-slate-600') }, b.desc)
                    )
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // AI Tutor panel (collapsible)
            // ══════════════════════════════════════
            showAI && h('div', { className: 'mt-4 bg-blue-950/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2' }, '\\uD83E\\uDD16 AI Circuit Tutor'),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'text',
                  placeholder: "Ask about circuits, Ohm's Law, components...",
                  value: aiQuestion,
                  onChange: function(e) { upd('aiQuestion', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') askAI(); },
                  className: 'flex-1 px-3 py-2 text-xs border border-blue-800 bg-slate-950/80 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
                }),
                h('button', { 'aria-label': 'AI is thinking...',
                  onClick: askAI,
                  disabled: aiLoading,
                  className: 'px-4 py-2 text-xs font-bold rounded-lg transition-all ' + (aiLoading ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/10')
                }, aiLoading ? 'Thinking...' : 'Ask')
              ),
              aiLoading && h('div', { className: 'mt-2 text-xs text-blue-400 animate-pulse' }, 'AI is thinking...'),
              aiResponse && h('div', { className: 'mt-2 bg-slate-950/80 rounded-lg p-3 border border-blue-900/50 text-xs text-blue-200 whitespace-pre-wrap leading-relaxed' }, aiResponse),
              // Quick-ask suggestions
              h('div', { className: 'flex flex-wrap gap-1.5 mt-2' },
                ["What is Ohm's Law?", 'Series vs parallel?', 'What is a short circuit?', 'How do capacitors work?', 'What does an ammeter measure?'].map(function(q) {
                  return h('button', { 'aria-label': 'Ask question',
                    key: q,
                    onClick: function() { updMulti({ aiQuestion: q }); },
                    className: 'px-2.5 py-1 text-[10px] bg-slate-950/60 text-blue-400 border border-blue-900/50 rounded-full hover:bg-blue-950/30 hover:text-blue-300 transition-all'
                  }, q);
                })
              )
            ),

            // ══════════════════════════════════════
            // Kirchhoff's Laws educational panel (g68/g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && h('div', { className: 'mt-4 bg-violet-950/10 border border-violet-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('button', { onClick: function() { upd('showKirchhoff', !showKirchhoff); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[11px] font-bold text-violet-400 uppercase tracking-wider' }, '\\u2696 Kirchhoff\'s Laws'),
                h('span', { className: 'ml-auto text-violet-400 text-xs' }, showKirchhoff ? '\\u25B2' : '\\u25BC')
              ),
              showKirchhoff && h('div', { className: 'mt-3 space-y-3' },
                // KCL
                h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, 'Kirchhoff\'s Current Law (KCL)'),
                  h('p', { className: 'text-xs text-slate-400' }, 'The total current entering a junction equals the total current leaving that junction.'),
                  h('p', { className: 'text-xs text-violet-400 font-mono mt-1' }, '\\u2211 I_in = \\u2211 I_out'),
                  mode === 'parallel' && components.length > 0 && h('div', { className: 'mt-2 bg-violet-950/20 rounded p-2 border border-violet-900/30' },
                    h('p', { className: 'text-[10px] font-bold text-violet-300 mb-1' }, 'Your circuit:'),
                    h('p', { className: 'text-[10px] text-slate-400 font-mono' }, 'Total current from source: ' + current.toFixed(3) + 'A'),
                    h('p', { className: 'text-[10px] text-slate-400 font-mono mt-0.5' }, 'Branch currents: ' + components.map(function(c, i) {
                      var cR = getCompR(c);
                      var cI = voltage / cR;
                      return 'I' + (i + 1) + '=' + cI.toFixed(3) + 'A';
                    }).join(' + ')),
                    (function() {
                      var branchSum = 0;
                      components.forEach(function(c) { branchSum += voltage / getCompR(c); });
                      return h('p', { className: 'text-[10px] font-bold text-violet-300 font-mono mt-1' }, 'Sum of branch currents: ' + branchSum.toFixed(3) + 'A ' + (Math.abs(branchSum - current) < 0.001 ? '\\u2705' : ''));
                    })()
                  )
                ),

                // KVL
                h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, 'Kirchhoff\'s Voltage Law (KVL)'),
                  h('p', { className: 'text-xs text-slate-400' }, 'The sum of all voltage drops around any closed loop equals the source voltage (EMF).'),
                  h('p', { className: 'text-xs text-violet-400 font-mono mt-1' }, '\\u2211 V_drops = V_source'),
                  mode === 'series' && components.length > 0 && current > 0.001 && h('div', { className: 'mt-2 bg-violet-950/20 rounded p-2 border border-violet-900/30' },
                    h('p', { className: 'text-[10px] font-bold text-violet-300 mb-1' }, 'Your circuit:'),
                    components.map(function(c, i) {
                      if (c.type === 'ammeter' || c.type === 'voltmeter') return null;
                      var cR = getCompR(c);
                      var cV = current * cR;
                      return h('p', { key: c.id, className: 'text-[10px] text-slate-400 font-mono' }, 'V' + (i + 1) + ' = ' + current.toFixed(3) + ' \\u00D7 ' + cR.toFixed(1) + ' = ' + cV.toFixed(2) + 'V');
                    }),
                    (function() {
                      var vSum = 0;
                      components.forEach(function(c) {
                        if (c.type !== 'ammeter' && c.type !== 'voltmeter') {
                          vSum += current * getCompR(c);
                        }
                      });
                      return h('p', { className: 'text-[10px] font-bold text-violet-300 font-mono mt-1' }, '\\u2211 = ' + vSum.toFixed(2) + 'V \\u2248 ' + voltage + 'V ' + (Math.abs(vSum - voltage) < 0.1 ? '\\u2705' : '\\u26A0\\uFE0F'));
                    })()
                  )
                ),

                // Additional formulas for g912
                band === 'g912' && h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, 'Key Relationships'),
                  h('div', { className: 'grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono' },
                    h('p', null, 'V = IR (Ohm\'s Law)'),
                    h('p', null, 'P = IV = I\\u00B2R = V\\u00B2/R'),
                    h('p', null, 'R_series = R1 + R2 + ...'),
                    h('p', null, '1/R_par = 1/R1 + 1/R2 + ...'),
                    h('p', null, 'Xc = 1/(2\\u03C0fC)'),
                    h('p', null, 'Energy = P \\u00D7 t (Joules)')
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
                h('span', { className: 'text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono' }, 'Oscilloscope'),
                h('span', { className: 'ml-auto text-[10px] text-slate-500 font-mono' },
                  voltage.toFixed(1) + 'V  ' + current.toFixed(3) + 'A  ' + totalR.toFixed(1) + '\\u03A9')
              ),
              h('canvas', { 'aria-label': 'Circuit visualization', 
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
                  oc.fillStyle = '#10b981'; oc.fillText('\\u2588 Voltage', 10, oh - 8);
                  oc.fillStyle = '#06b6d4'; oc.fillText('\\u2588 Current', 80, oh - 8);
                  if (components.some(function(c) { return c.type === 'capacitor'; })) {
                    oc.fillStyle = '#38bdf8'; oc.fillText('\\u2588 Cap-Charge', 150, oh - 8);
                  }

                  // Short circuit warning overlay
                  if (isShort) {
                    oc.fillStyle = 'rgba(127, 29, 29, 0.4)'; oc.fillRect(0, 0, ow, oh);
                    oc.fillStyle = '#f87171'; oc.font = 'bold 13px monospace'; oc.textAlign = 'center';
                    oc.fillText('\\u26A0 CRITICAL SHORT DETECTED', ow / 2, oh / 2 + 4);
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
                  icon: '\\u2AE8', name: 'Resistor', color: '#eab308',
                  how: 'Electrons collide with atoms in the resistive material, converting electrical energy into heat. The more collisions (higher resistance), the less current flows.',
                  equation: 'V = I \\u00D7 R (Ohm\'s Law)',
                  analogy: 'Like a narrow section of pipe - it restricts water flow and creates pressure difference.'
                },
                bulb: {
                  icon: '\\uD83D\\uDCA1', name: 'Light Bulb', color: '#fbbf24',
                  how: 'Current heats a thin wire (filament) to ~2,500\\u00B0C until it glows white-hot. The filament\'s resistance increases with temperature.',
                  equation: 'Brightness \\u221D Power = I\\u00B2 \\u00D7 R',
                  analogy: 'Like rubbing your hands together fast - friction (resistance) creates heat and light.'
                },
                switch: {
                  icon: '\\uD83D\\uDD18', name: 'Switch', color: '#10b981',
                  how: 'A physical gap in the conductor. When closed, electrons flow freely. When open, the air gap has near-infinite resistance, stopping current completely.',
                  equation: 'R_open \\u2248 \\u221E, R_closed \\u2248 0\\u03A9',
                  analogy: 'Like a drawbridge - when up, nothing crosses. When down, traffic flows.'
                },
                led: {
                  icon: '\\uD83D\\uDD34', name: 'LED', color: '#f43f5e',
                  how: 'A semiconductor diode that emits photons when electrons drop from a high energy band to a low one. Different materials produce different colors.',
                  equation: 'V_forward \\u2248 1.8-3.3V (varies by color)',
                  analogy: 'Like a one-way door with a light - electrons can only go one direction, and they release light as they pass.'
                },
                ammeter: {
                  icon: '\\u26A1', name: 'Ammeter', color: '#06b6d4',
                  how: 'Measures current by detecting the magnetic field created by flowing electrons. Connected in series so all current passes through it. Has very low internal resistance.',
                  equation: 'I = reading in Amperes (A)',
                  analogy: 'Like a turnstile counting how many people pass per second.'
                },
                voltmeter: {
                  icon: '\\uD83D\\uDD0B', name: 'Voltmeter', color: '#f59e0b',
                  how: 'Measures potential difference (voltage) between two points. Connected in parallel with very high internal resistance so it doesn\'t affect the circuit.',
                  equation: 'V = reading in Volts (V)',
                  analogy: 'Like a pressure gauge on a water pipe - measures the push without blocking flow.'
                },
                capacitor: {
                  icon: '\\u2E28', name: 'Capacitor', color: '#38bdf8',
                  how: 'Two metal plates separated by an insulator. Electrons accumulate on one plate and leave the other, storing energy in an electric field. Releases energy quickly when discharged.',
                  equation: 'Q = C \\u00D7 V, Energy = \\u00BDCV\\u00B2',
                  analogy: 'Like a water tank - it fills up slowly and can release all its stored water at once.'
                }
              };

              var selectedComp = d._selectedComp || null;
              var physics = selectedComp ? COMP_PHYSICS[selectedComp] : null;

              if (components.length === 0) return null;

              return h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
                h('p', { className: 'text-[11px] font-bold text-yellow-500 uppercase tracking-wider mb-2' }, '\\u269B How Components Work'),
                h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
                  ['resistor', 'bulb', 'switch', 'led', 'ammeter', 'voltmeter', 'capacitor'].map(function(type) {
                    var info = COMP_PHYSICS[type];
                    var active = selectedComp === type;
                    return h('button', { key: type,
                      onClick: function() { upd('_selectedComp', active ? null : type); },
                      className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ' +
                        (active ? 'text-slate-950 font-extrabold shadow-sm' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'),
                      style: active ? { background: info.color, borderColor: info.color } : {}
                    }, info.icon + ' ' + info.name);
                  })
                ),
                physics ? h('div', { className: 'bg-slate-950/60 rounded-xl border border-slate-800/80 p-3 animate-in fade-in duration-200' },
                  h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                    h('span', { className: 'text-xl' }, physics.icon),
                    h('h4', { className: 'font-bold text-slate-200 text-sm' }, physics.name),
                    h('span', { className: 'ml-auto px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-900 text-yellow-500 border border-slate-800' }, physics.equation)
                  ),
                  h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, physics.how),
                  h('div', { className: 'bg-cyan-950/20 rounded-lg p-2.5 border border-cyan-900/30' },
                    h('span', { className: 'text-[10px] font-bold text-cyan-400' }, '\\uD83D\\uDCA1 Analogy: '),
                    h('span', { className: 'text-[10px] text-cyan-300 leading-normal' }, physics.analogy)
                  ),
                  typeof callTTS === 'function' ? h('button', { 'aria-label': 'Read aloud',
                    onClick: function() { callTTS(physics.name + '. ' + physics.how + ' ' + physics.analogy); },
                    className: 'mt-2 text-[10px] text-yellow-500 hover:text-yellow-400 font-bold'
                  }, '\\uD83D\\uDD0A Read aloud') : null
                ) : h('p', { className: 'text-[10px] text-slate-500 italic' }, 'Tap a component above to learn how it works inside!')
              );
            })(),

            // ══════════════════════════════════════
            // Real-World Circuit Applications
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2' }, '\\uD83C\\uDF0D Real-World Circuits'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
                [
                  { emoji: '\\uD83D\\uDD26', name: 'Flashlight', circuit: 'Series', desc: 'Battery + switch + bulb in series. Switch breaks circuit to turn off.', comps: 'Switch, Bulb' },
                  { emoji: '\\uD83D\\uDCF1', name: 'Phone Charger', circuit: 'Series + Parallel', desc: 'Transformer reduces 120V to 5V. Capacitors smooth the current for steady charging.', comps: 'Resistor, Capacitor' },
                  { emoji: '\\uD83D\\uDE97', name: 'Car Headlights', circuit: 'Parallel', desc: 'Headlights wired in parallel so if one burns out, the other stays on.', comps: 'Bulb, Switch' },
                  { emoji: '\\uD83C\\uDFB5', name: 'Guitar Pedal', circuit: 'Series + Parallel', desc: 'Resistors and capacitors filter frequencies to create distortion or reverb effects.', comps: 'Resistor, Capacitor' },
                  { emoji: '\\uD83D\\uDEA6', name: 'Traffic Light', circuit: 'Parallel', desc: 'Three LED groups in parallel, controlled by a timer circuit switching between them.', comps: 'LED, Switch' },
                  { emoji: '\\u2764\\uFE0F', name: 'Heart Monitor', circuit: 'Series', desc: 'Amplifies tiny electrical signals from heart muscle. Resistors set gain, capacitors filter noise.', comps: 'Resistor, Ammeter' }
                ].map(function(app) {
                  var expanded = d._expandedApp === app.name;
                  return h('button', { key: app.name,
                    onClick: function() { upd('_expandedApp', expanded ? null : app.name); },
                    className: 'text-left rounded-lg p-2.5 border transition-all ' +
                      (expanded ? 'bg-slate-950/80 border-cyan-500/40 shadow-md shadow-cyan-500/5' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700')
                  },
                    h('div', { className: 'flex items-center gap-2.5 mb-1.5' },
                      h('span', { className: 'text-base' }, app.emoji),
                      h('div', null,
                        h('span', { className: 'text-xs font-bold text-slate-200 block' }, app.name),
                        h('span', { className: 'text-[9px] text-cyan-400 font-bold uppercase tracking-wider' }, app.circuit)
                      )
                    ),
                    expanded ? h('div', { className: 'animate-in fade-in duration-200 mt-1' },
                      h('p', { className: 'text-[10px] text-slate-400 leading-normal mb-1.5' }, app.desc),
                      h('span', { className: 'text-[10px] text-slate-300 font-bold block' }, '\\uD83D\\uDD27 Key parts: ' + app.comps)
                    ) : null
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Snapshot + Footer
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 flex items-center gap-2 justify-end' },
              h('button', { 'aria-label': 'Snapshot',
                onClick: function() {
                  if (typeof setToolSnapshots === 'function') {
                    setToolSnapshots(function(prev) {
                      return prev.concat([{
                        id: 'ci-' + Date.now(),
                        tool: 'circuit',
                        label: components.length + ' parts ' + voltage + 'V ' + mode,
                        data: Object.assign({}, d, { mode: mode }),
                        timestamp: Date.now()
                      }]);
                    });
                  }
                  if (typeof addToast === 'function') addToast('\\uD83D\\uDCF8 Snapshot saved!', 'success');
                },
                className: 'px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all'
              }, '\\uD83D\\uDCF8 Snapshot'),

              // TTS button
              typeof callTTS === 'function' && h('button', { 'aria-label': 'Read Aloud',
                onClick: function() {
                  var summary = 'Circuit Builder: ' + mode + ' mode, ' + voltage + ' volts, ' +
                    components.length + ' components. Total resistance ' + totalR.toFixed(1) + ' ohms. ' +
                    'Current ' + current.toFixed(3) + ' amps. Power ' + power.toFixed(2) + ' watts.';
                  if (isShort) summary += ' Warning: short circuit detected!';
                  if (isOpen) summary += ' Circuit is open, no current flowing.';
                  callTTS(summary);
                },
                className: 'px-4 py-2 text-xs font-bold text-slate-300 bg-slate-900/60 rounded-full hover:bg-slate-800 transition-all border border-slate-800'
              }, '\\uD83D\\uDD0A Read Aloud')
            ),

            // Footer
            h('p', { className: 'text-[9px] text-center text-slate-500 mt-4 mb-2 font-mono font-bold' }, '\\uD83D\\uDD0C Circuit Builder \\u2022 Ohm\'s Law: V = IR \\u2022 Power: P = IV')
          );
        };
      }
      return h(this._CircuitComponent, { ctx: ctx });
    }
  });

  console.log('[StemLab] stem_tool_circuit.js loaded - Circuit Builder');
})();
