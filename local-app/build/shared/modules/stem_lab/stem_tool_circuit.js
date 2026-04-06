// ═══════════════════════════════════════════
// stem_tool_circuit.js — Circuit Builder Plugin (Enhanced v2)
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
        playTone(150, 0.3, 'sawtooth', 0.1);
        setTimeout(function() { playTone(160, 0.3, 'sawtooth', 0.08); }, 50);
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
  window.StemLab.registerTool('circuit', {
    icon: '\uD83D\uDD0C',
    label: 'Circuit Builder',
    desc: 'Build series & parallel circuits with Ohm\'s Law',
    color: 'yellow',
    category: 'science',
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
                if (typeof addToast === 'function') addToast(b.icon + ' Badge: ' + b.name + ' \u2014 ' + b.desc, 'success');
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
            var numDots = Math.min(Math.ceil(current * 3), 12);
            for (var ei = 0; ei < numDots; ei++) {
              var phase = ((tick * 2 + ei * (400 / numDots)) % 400) / 400;
              var ex, ey;
              if (phase < 0.3) {
                ex = 35 + (380 - 35) * (phase / 0.3);
                ey = 20;
              } else if (phase < 0.4) {
                ex = 380;
                ey = 20 + 120 * ((phase - 0.3) / 0.1);
              } else if (phase < 0.7) {
                ex = 380 - (380 - 35) * ((phase - 0.4) / 0.3);
                ey = 140;
              } else {
                ex = 35;
                ey = 140 - 120 * ((phase - 0.7) / 0.3);
              }
              electronDots.push({ x: ex, y: ey });
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
          return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'max-w-3xl mx-auto animate-in fade-in duration-200' },

            // ── Header ──
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mb-3 flex-wrap' },
              h('button', {
                onClick: function() { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
                className: 'p-1.5 hover:bg-slate-100 rounded-lg',
                'aria-label': 'Back to tools'
              }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),

              h('h3', { className: 'text-lg font-bold text-slate-800' }, '\uD83D\uDD0C Circuit Builder'),

              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full' }, 'INTERACTIVE'),

              isShort && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse' }, '\u26A0 SHORT CIRCUIT!'),

              // Badge toggle
              h('button', { 'aria-label': 'Badges',
                onClick: function() { upd('showBadges', !showBadges); },
                className: 'px-2 py-1 text-xs rounded-lg transition-all ' + (showBadges ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-amber-50')
              }, '\uD83C\uDFC5 Badges'),

              // AI toggle
              h('button', { 'aria-label': 'AI Tutor',
                onClick: function() { upd('showAI', !showAI); },
                className: 'px-2 py-1 text-xs rounded-lg transition-all ' + (showAI ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-blue-50')
              }, '\uD83E\uDD16 AI Tutor'),

              // Mode buttons
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1 ml-auto' },
                ['series', 'parallel'].map(function(m) {
                  return h('button', { 'aria-label': 'Change mode',
                    key: m,
                    onClick: function() { upd('mode', m); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ' + (mode === m ? 'bg-yellow-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-yellow-50')
                  }, m);
                })
              )
            ),

            // ── Grade-band intro ──
            h('p', { className: 'text-xs text-slate-500 italic -mt-1 mb-3' }, introText),

            // ══════════════════════════════════════
            // SVG Schematic
            // ══════════════════════════════════════
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H,
              className: 'w-full rounded-xl border-2 shadow-sm transition-colors ' + (isShort ? 'bg-red-50 border-red-300' : 'bg-gradient-to-b from-yellow-50 to-white border-yellow-200'),
              style: { maxHeight: '220px' }
            },
              // Battery
              h('rect', { x: 15, y: 40, width: 40, height: 60, fill: isShort ? '#fca5a5' : '#fbbf24', stroke: isShort ? '#dc2626' : '#92400e', strokeWidth: 2, rx: 5 }),
              h('text', { x: 35, y: 72, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: isShort ? '#dc2626' : '#92400e' }, voltage + 'V'),
              h('text', { x: 35, y: 32, textAnchor: 'middle', style: { fontSize: '12px' }, fill: '#92400e' }, '\uD83D\uDD0B'),
              // + / - terminals
              h('text', { x: 20, y: 38, fill: '#dc2626', style: { fontSize: '12px', fontWeight: 'bold' } }, '+'),
              h('text', { x: 20, y: 110, fill: '#3b82f6', style: { fontSize: '12px', fontWeight: 'bold' } }, '\u2212'),
              // Wires
              h('line', { x1: 35, y1: 40, x2: 35, y2: 20, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),
              h('line', { x1: 35, y1: 20, x2: 400, y2: 20, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),
              h('line', { x1: 35, y1: 100, x2: 35, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),
              h('line', { x1: 35, y1: 140, x2: 400, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),
              h('line', { x1: 400, y1: 20, x2: 400, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              // Current direction arrow
              !isShort && current > 0.01 && h('g', null,
                h('polygon', { points: '210,12 220,8 220,16', fill: '#3b82f6' }),
                h('text', { x: 225, y: 15, fill: '#3b82f6', style: { fontSize: '7px', fontWeight: 'bold' } }, 'I = ' + current.toFixed(2) + 'A')
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
                    var bulbBright = comp.type === 'bulb' ? Math.min(compP / 10, 1) : 0;
                    var ledGlow = comp.type === 'led' && current > 0.005 ? Math.min(current * 20, 1) : 0;

                    return h('g', { key: comp.id },
                      // Top lead
                      h('line', { x1: cx, y1: 20, x2: cx, y2: 55, stroke: '#1e293b', strokeWidth: 2 }),

                      // Component body
                      comp.type === 'resistor'
                        ? h('g', null,
                            h('rect', { x: cx - 12, y: 55, width: 24, height: 45, fill: '#fef9c3', stroke: '#ca8a04', strokeWidth: 1.5, rx: 3 }),
                            h('line', { x1: cx - 8, y1: 65, x2: cx + 8, y2: 65, stroke: '#ca8a04', strokeWidth: 1 }),
                            h('line', { x1: cx - 8, y1: 72, x2: cx + 8, y2: 72, stroke: '#ca8a04', strokeWidth: 1 }),
                            h('line', { x1: cx - 8, y1: 79, x2: cx + 8, y2: 79, stroke: '#ca8a04', strokeWidth: 1 }),
                            h('line', { x1: cx - 8, y1: 86, x2: cx + 8, y2: 86, stroke: '#ca8a04', strokeWidth: 1 })
                          )

                        : comp.type === 'switch'
                        ? h('g', { onClick: function() { toggleSwitch(comp.id); }, style: { cursor: 'pointer' } },
                            h('rect', { x: cx - 14, y: 55, width: 28, height: 40, fill: comp.closed ? '#d1fae5' : '#fee2e2', stroke: comp.closed ? '#059669' : '#dc2626', strokeWidth: 1.5, rx: 4 }),
                            h('circle', { cx: cx - 6, cy: 75, r: 3, fill: '#1e293b' }),
                            h('circle', { cx: cx + 6, cy: 75, r: 3, fill: '#1e293b' }),
                            comp.closed
                              ? h('line', { x1: cx - 6, y1: 75, x2: cx + 6, y2: 75, stroke: '#059669', strokeWidth: 2.5 })
                              : h('line', { x1: cx - 6, y1: 75, x2: cx + 4, y2: 62, stroke: '#dc2626', strokeWidth: 2.5 }),
                            h('text', { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: comp.closed ? '#059669' : '#dc2626' }, comp.closed ? 'ON' : 'OFF')
                          )

                        : comp.type === 'led'
                        ? h('g', { onClick: function() { cycleLedColor(comp.id); }, style: { cursor: 'pointer' } },
                            ledGlow > 0.1 && h('circle', { cx: cx, cy: 75, r: 18 + ledGlow * 8, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow * 0.3).toFixed(2)) }),
                            h('polygon', { points: (cx - 10) + ',65 ' + (cx + 10) + ',65 ' + cx + ',88', fill: ledGlow > 0.2 ? (comp.ledColor || '#ef4444') : '#fecaca', stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 }),
                            h('line', { x1: cx - 10, y1: 88, x2: cx + 10, y2: 88, stroke: comp.ledColor || '#ef4444', strokeWidth: 2 }),
                            h('line', { x1: cx + 7, y1: 70, x2: cx + 13, y2: 63, stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),
                            h('polygon', { points: (cx + 13) + ',63 ' + (cx + 11) + ',66 ' + (cx + 14) + ',65', fill: comp.ledColor || '#ef4444' }),
                            h('line', { x1: cx + 10, y1: 74, x2: cx + 16, y2: 67, stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),
                            h('polygon', { points: (cx + 16) + ',67 ' + (cx + 14) + ',70 ' + (cx + 17) + ',69', fill: comp.ledColor || '#ef4444' })
                          )

                        : comp.type === 'ammeter'
                        ? h('g', null,
                            h('circle', { cx: cx, cy: 75, r: 15, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 2 }),
                            h('text', { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: 'bold' }, fill: '#2563eb' }, 'A'),
                            current > 0.001 && h('text', { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#1d4ed8' }, current.toFixed(3) + 'A')
                          )

                        : comp.type === 'voltmeter'
                        ? h('g', null,
                            h('circle', { cx: cx, cy: 75, r: 15, fill: '#fefce8', stroke: '#ca8a04', strokeWidth: 2 }),
                            h('text', { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: 'bold' }, fill: '#ca8a04' }, 'V'),
                            h('text', { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#a16207' }, voltage.toFixed(1) + 'V')
                          )

                        : comp.type === 'capacitor'
                        ? h('g', null,
                            h('rect', { x: cx - 14, y: 55, width: 28, height: 45, fill: '#f0f9ff', stroke: '#0284c7', strokeWidth: 1.5, rx: 3 }),
                            // Two parallel plates (capacitor symbol)
                            h('line', { x1: cx - 8, y1: 70, x2: cx + 8, y2: 70, stroke: '#0284c7', strokeWidth: 2.5 }),
                            h('line', { x1: cx - 8, y1: 80, x2: cx + 8, y2: 80, stroke: '#0284c7', strokeWidth: 2.5 }),
                            h('text', { x: cx, y: 64, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#0284c7' }, 'C')
                          )

                        // Default: bulb
                        : h('g', null,
                            bulbBright > 0.1 && h('circle', { cx: cx, cy: 77, r: 20 + bulbBright * 8, fill: 'rgba(251,191,36,' + (bulbBright * 0.25).toFixed(2) + ')' }),
                            h('circle', { cx: cx, cy: 77, r: 15, fill: bulbBright > 0.3 ? 'rgba(251,191,36,' + (0.3 + bulbBright * 0.7).toFixed(2) + ')' : '#fef3c7', stroke: '#f59e0b', strokeWidth: 1.5 }),
                            h('line', { x1: cx - 5, y1: 72, x2: cx + 5, y2: 82, stroke: '#92400e', strokeWidth: 1 }),
                            h('line', { x1: cx + 5, y1: 72, x2: cx - 5, y2: 82, stroke: '#92400e', strokeWidth: 1 })
                          ),

                      // Value label
                      comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                        && h('text', {
                          x: cx,
                          y: comp.type === 'resistor' ? 110 : (comp.type === 'led' ? 104 : (comp.type === 'capacitor' ? 110 : 100)),
                          textAnchor: 'middle',
                          style: { fontSize: '8px', fontWeight: 'bold' },
                          fill: '#78350f'
                        }, comp.type === 'led' ? '~2V drop' : (comp.type === 'capacitor' ? comp.value + '\u00B5F' : comp.value + '\u03A9')),

                      // Voltage drop label
                      current > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                        && h('text', {
                          x: cx,
                          y: comp.type === 'resistor' ? 118 : (comp.type === 'led' ? 112 : (comp.type === 'capacitor' ? 118 : 108)),
                          textAnchor: 'middle',
                          style: { fontSize: '7px' },
                          fill: '#3b82f6'
                        }, compV.toFixed(1) + 'V'),

                      // Bottom lead
                      h('line', {
                        x1: cx,
                        y1: comp.type === 'resistor' ? 100 : (comp.type === 'switch' ? 95 : (comp.type === 'ammeter' || comp.type === 'voltmeter' ? 90 : (comp.type === 'capacitor' ? 100 : 92))),
                        x2: cx,
                        y2: 140,
                        stroke: '#1e293b',
                        strokeWidth: 2
                      })
                    );
                  })

                // ── Components: Parallel layout ──
                : components.map(function(comp, i) {
                    var cy = 40 + i * Math.min(30, 80 / Math.max(components.length, 1));
                    var compR2 = getCompR(comp);
                    var compI2 = voltage / compR2;
                    var compP2 = voltage * compI2;
                    var bulbBright2 = comp.type === 'bulb' ? Math.min(compP2 / 10, 1) : 0;
                    var ledGlow2 = comp.type === 'led' && compI2 > 0.005 ? Math.min(compI2 * 20, 1) : 0;

                    return h('g', { key: comp.id },
                      // Left lead
                      h('line', { x1: 180, y1: cy, x2: 200, y2: cy, stroke: '#1e293b', strokeWidth: 1.5 }),

                      // Component body (parallel - horizontal)
                      comp.type === 'resistor'
                        ? h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: '#fef9c3', stroke: '#ca8a04', strokeWidth: 1.5, rx: 2 })

                        : comp.type === 'switch'
                        ? h('g', { onClick: function() { toggleSwitch(comp.id); }, style: { cursor: 'pointer' } },
                            h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: comp.closed ? '#d1fae5' : '#fee2e2', stroke: comp.closed ? '#059669' : '#dc2626', strokeWidth: 1.5, rx: 3 }),
                            h('text', { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: comp.closed ? '#059669' : '#dc2626' }, comp.closed ? 'ON' : 'OFF')
                          )

                        : comp.type === 'led'
                        ? h('g', { onClick: function() { cycleLedColor(comp.id); }, style: { cursor: 'pointer' } },
                            ledGlow2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 14 + ledGlow2 * 5, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow2 * 0.25).toFixed(2)) }),
                            h('polygon', { points: '210,' + (cy - 6) + ' 230,' + (cy - 6) + ' 220,' + (cy + 8), fill: ledGlow2 > 0.2 ? (comp.ledColor || '#ef4444') : '#fecaca', stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),
                            h('line', { x1: 210, y1: cy + 8, x2: 230, y2: cy + 8, stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 })
                          )

                        : comp.type === 'ammeter'
                        ? h('g', null,
                            h('circle', { cx: 220, cy: cy, r: 10, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 1.5 }),
                            h('text', { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#2563eb' }, 'A')
                          )

                        : comp.type === 'voltmeter'
                        ? h('g', null,
                            h('circle', { cx: 220, cy: cy, r: 10, fill: '#fefce8', stroke: '#ca8a04', strokeWidth: 1.5 }),
                            h('text', { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#ca8a04' }, 'V')
                          )

                        : comp.type === 'capacitor'
                        ? h('g', null,
                            h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: '#f0f9ff', stroke: '#0284c7', strokeWidth: 1.5, rx: 2 }),
                            h('line', { x1: 215, y1: cy - 6, x2: 215, y2: cy + 6, stroke: '#0284c7', strokeWidth: 2 }),
                            h('line', { x1: 225, y1: cy - 6, x2: 225, y2: cy + 6, stroke: '#0284c7', strokeWidth: 2 })
                          )

                        // bulb
                        : h('g', null,
                            bulbBright2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 15 + bulbBright2 * 5, fill: 'rgba(251,191,36,' + (bulbBright2 * 0.25).toFixed(2) + ')' }),
                            h('circle', { cx: 220, cy: cy, r: 10, fill: bulbBright2 > 0.3 ? 'rgba(251,191,36,' + (0.3 + bulbBright2 * 0.7).toFixed(2) + ')' : '#fef3c7', stroke: '#f59e0b', strokeWidth: 1.5 })
                          ),

                      // Value/reading labels (parallel)
                      comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                        && h('text', { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: '#78350f' }, comp.type === 'led' ? '~2V' : (comp.type === 'capacitor' ? comp.value + '\u00B5F' : comp.value + '\u03A9')),

                      comp.type === 'ammeter' && h('text', { x: 250, y: cy + 3, style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#2563eb' }, compI2.toFixed(3) + 'A'),
                      comp.type === 'voltmeter' && h('text', { x: 250, y: cy + 3, style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#ca8a04' }, voltage.toFixed(1) + 'V'),
                      comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('text', { x: 250, y: cy + 3, style: { fontSize: '6px' }, fill: '#3b82f6' }, compI2.toFixed(2) + 'A'),

                      // Right lead
                      h('line', { x1: 240, y1: cy, x2: 260, y2: cy, stroke: '#1e293b', strokeWidth: 1.5 })
                    );
                  }),

              // Electron dots
              electronDots.map(function(dot, i) {
                return h('circle', { key: 'e' + i, cx: dot.x, cy: dot.y, r: 3, fill: '#3b82f6', opacity: 0.8 });
              }),

              // Empty state
              components.length === 0 && h('text', { x: W / 2, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '12px' } }, 'Add components below')
            ),

            // ══════════════════════════════════════
            // Component buttons
            // ══════════════════════════════════════
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2 mt-3 mb-3' },
              h('button', { 'aria-label': 'Resistor',
                onClick: function() { addComponent('resistor', 100); },
                className: 'px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm border border-yellow-300 hover:bg-yellow-200 transition-all'
              }, '\u2795 Resistor'),

              h('button', { 'aria-label': 'Bulb',
                onClick: function() { addComponent('bulb', 50); },
                className: 'px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm border border-amber-300 hover:bg-amber-200 transition-all'
              }, '\uD83D\uDCA1 Bulb'),

              h('button', { 'aria-label': 'Switch',
                onClick: function() { addComponent('switch', 0, { closed: true }); },
                className: 'px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-sm border border-emerald-300 hover:bg-emerald-200 transition-all'
              }, '\uD83D\uDD18 Switch'),

              h('button', { 'aria-label': 'LED',
                onClick: function() { addComponent('led', 40, { ledColor: '#ef4444' }); },
                className: 'px-3 py-1.5 bg-rose-100 text-rose-800 font-bold rounded-lg text-sm border border-rose-300 hover:bg-rose-200 transition-all'
              }, '\uD83D\uDD34 LED'),

              h('button', { 'aria-label': 'Ammeter',
                onClick: function() { addComponent('ammeter', 0); },
                className: 'px-3 py-1.5 bg-blue-100 text-blue-800 font-bold rounded-lg text-sm border border-blue-300 hover:bg-blue-200 transition-all'
              }, '\u26A1 Ammeter'),

              h('button', { 'aria-label': 'Voltmeter',
                onClick: function() { addComponent('voltmeter', 0); },
                className: 'px-3 py-1.5 bg-orange-100 text-orange-800 font-bold rounded-lg text-sm border border-orange-300 hover:bg-orange-200 transition-all'
              }, '\uD83D\uDD0B Voltmeter'),

              h('button', { 'aria-label': 'Capacitor',
                onClick: function() { addComponent('capacitor', 100); },
                className: 'px-3 py-1.5 bg-sky-100 text-sky-800 font-bold rounded-lg text-sm border border-sky-300 hover:bg-sky-200 transition-all'
              }, '\u2E28 Capacitor'),

              h('button', { 'aria-label': 'Clear',
                onClick: clearComponents,
                className: 'px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100 transition-all'
              }, '\uD83D\uDDD1 Clear'),

              components.length > 0 && h('span', { className: 'self-center text-xs text-slate-500 ml-auto' }, components.length + ' component' + (components.length > 1 ? 's' : ''))
            ),

            // ══════════════════════════════════════
            // Voltage slider + component editor
            // ══════════════════════════════════════
            h('div', { className: 'bg-white rounded-xl border border-yellow-200 p-3' },
              // Voltage slider row
              h('div', { className: 'flex items-center gap-3 mb-3' },
                h('span', { className: 'text-xl' }, '\uD83D\uDD0B'),
                h('input', {
                  type: 'range', min: 1, max: 24, step: 0.5,
                  value: voltage,
                  onChange: function(e) { upd('voltage', parseFloat(e.target.value)); },
                  className: 'flex-1 accent-yellow-600'
                }),
                h('span', { className: 'font-bold text-yellow-700 w-12 text-right' }, voltage + 'V')
              ),

              // Component editor list
              h('div', { className: 'flex flex-wrap gap-2' },
                components.map(function(comp, i) {
                  var compIcon = getCompIcon(comp.type);
                  var compLabel = getCompLabel(comp);

                  return h('div', { key: comp.id, className: 'flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200' },
                    h('span', null, compIcon),
                    h('span', { className: 'text-xs font-bold text-slate-600 min-w-[40px]' }, compLabel),

                    // Resistor/Bulb value input
                    (comp.type === 'resistor' || comp.type === 'bulb') && h('input', {
                      type: 'number', min: 1, max: 10000, value: comp.value,
                      onChange: function(e) {
                        var newComps = components.map(function(c, j) {
                          if (j === i) return Object.assign({}, c, { value: parseInt(e.target.value) || 1 });
                          return c;
                        });
                        upd('components', newComps);
                      },
                      className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono'
                    }),
                    (comp.type === 'resistor' || comp.type === 'bulb') && h('span', { className: 'text-xs text-slate-500' }, '\u03A9'),

                    // Capacitor value input (in uF)
                    comp.type === 'capacitor' && h('input', {
                      type: 'number', min: 1, max: 10000, value: comp.value,
                      onChange: function(e) {
                        var newComps = components.map(function(c, j) {
                          if (j === i) return Object.assign({}, c, { value: parseInt(e.target.value) || 1 });
                          return c;
                        });
                        upd('components', newComps);
                      },
                      className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono'
                    }),
                    comp.type === 'capacitor' && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-slate-500' }, '\u00B5F'),

                    // Switch toggle button
                    comp.type === 'switch' && h('button', { 'aria-label': 'Toggle Switch',
                      onClick: function() { toggleSwitch(comp.id); },
                      className: 'px-2 py-1 text-xs font-bold rounded border transition-all ' + (comp.closed ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300')
                    }, comp.closed ? 'Close' : 'Open'),

                    // LED color cycle button
                    comp.type === 'led' && h('button', { 'aria-label': 'Cycle Led Color',
                      onClick: function() { cycleLedColor(comp.id); },
                      className: 'w-5 h-5 rounded-full border-2 border-slate-300',
                      style: { backgroundColor: comp.ledColor || '#ef4444' }
                    }),

                    // Remove button
                    h('button', { 'aria-label': 'Remove Component',
                      onClick: function() { removeComponent(i); },
                      className: 'text-red-400 hover:text-red-600 ml-auto'
                    }, '\u00D7')
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Readout cards (4 metrics)
            // ══════════════════════════════════════
            h('div', { className: 'mt-3 grid grid-cols-4 gap-2' },
              [
                { label: 'Mode', val: mode, color: 'slate', icon: mode === 'series' ? '\u2192' : '\u2261' },
                { label: 'Resistance', val: totalR >= 1e8 ? '\u221E' : totalR.toFixed(1) + '\u03A9', color: 'yellow', icon: '\u2AE8' },
                { label: 'Current', val: current.toFixed(3) + 'A', color: 'blue', icon: '\u26A1' },
                { label: 'Power', val: power.toFixed(2) + 'W', color: 'red', icon: '\uD83D\uDD25' }
              ].map(function(m) {
                return h('div', {
                  key: m.label,
                  className: 'text-center p-2 rounded-xl border transition-all ' + (isShort && m.label !== 'Mode' ? 'bg-red-50 border-red-200' : 'bg-' + m.color + '-50 border-' + m.color + '-200')
                },
                  h('p', { className: 'text-[10px] font-bold uppercase ' + (isShort && m.label !== 'Mode' ? 'text-red-600' : 'text-' + m.color + '-600') }, m.icon + ' ' + m.label),
                  h('p', { className: 'text-sm font-bold ' + (isShort && m.label !== 'Mode' ? 'text-red-800' : 'text-' + m.color + '-800') }, m.val)
                );
              })
            ),

            // ══════════════════════════════════════
            // Per-component analysis table
            // ══════════════════════════════════════
            components.length > 0 && h('div', { className: 'mt-3 bg-yellow-50 rounded-xl border border-yellow-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-2' }, '\u26A1 Per-Component Analysis'),
              h('div', { className: 'space-y-1' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compI = mode === 'series' ? current : voltage / compR;
                  var compV = mode === 'series' ? current * compR : voltage;
                  var compP = compV * compI;
                  var typeIcon = comp.type === 'resistor' ? '\u2AE8 R' : comp.type === 'bulb' ? '\uD83D\uDCA1 B' : comp.type === 'switch' ? '\uD83D\uDD18 S' : comp.type === 'led' ? '\uD83D\uDD34 L' : comp.type === 'ammeter' ? '\u26A1 A' : comp.type === 'voltmeter' ? '\uD83D\uDD0B V' : '\u2E28 C';
                  var rDisplay = comp.type === 'switch' ? (comp.closed ? '~0\u03A9' : '\u221E') : comp.type === 'ammeter' ? '~0\u03A9' : comp.type === 'voltmeter' ? '\u221E' : comp.type === 'led' ? '~40\u03A9' : comp.type === 'capacitor' ? Math.round(getCompR(comp)) + '\u03A9 Xc' : comp.value + '\u03A9';

                  return h('div', { key: comp.id, className: 'flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5 border' },
                    h('span', { className: 'font-bold text-yellow-700 w-16' }, typeIcon + (i + 1)),
                    h('span', { className: 'text-slate-500 w-20' }, rDisplay),

                    comp.type === 'ammeter'
                      ? h('span', { className: 'text-blue-600 w-40 font-mono font-bold' }, '\u27A1 ' + compI.toFixed(3) + 'A (reads current)')
                      : comp.type === 'voltmeter'
                      ? h('span', { className: 'text-amber-600 w-40 font-mono font-bold' }, '\u27A1 ' + voltage.toFixed(1) + 'V (reads voltage)')
                      : h(React.Fragment, null,
                          h('span', { className: 'text-blue-600 w-20 font-mono' }, compV.toFixed(2) + 'V'),
                          h('span', { className: 'text-emerald-600 w-20 font-mono' }, compI.toFixed(3) + 'A'),
                          h('span', { className: 'text-red-600 w-20 font-mono font-bold' }, compP.toFixed(2) + 'W')
                        ),

                    comp.type === 'bulb' && h('span', { className: 'text-yellow-500' }, compP > 10 ? '\uD83D\uDD06' : compP > 3 ? '\uD83D\uDCA1' : '\uD83D\uDD05'),
                    comp.type === 'switch' && h('span', { className: comp.closed ? 'text-emerald-500' : 'text-red-500' }, comp.closed ? '\u2705 Closed' : '\u274C Open'),
                    comp.type === 'led' && h('span', { style: { color: comp.ledColor || '#ef4444' } }, compI > 0.005 ? '\u2B50 Lit' : '\u26AB Off'),
                    comp.type === 'capacitor' && h('span', { className: 'text-sky-500' }, comp.value + '\u00B5F @ 60Hz')
                  );
                })
              ),

              // Formula reminder
              h('div', { className: 'mt-2 flex items-center gap-2 text-[10px] text-slate-500' },
                h('span', null, '\u2696 V = IR'),
                h('span', null, '\u2022'),
                h('span', null, 'P = IV'),
                h('span', null, '\u2022'),
                h('span', null, mode === 'series' ? 'Series: same current through all' : 'Parallel: same voltage across all')
              )
            ),

            // ══════════════════════════════════════
            // KVL Verification (g68 / g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && components.length > 0 && mode === 'series' && current > 0.001 && h('div', { className: 'mt-3 bg-indigo-50 rounded-xl border border-indigo-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2' }, '\u2696 Kirchhoff\'s Voltage Law (KVL) Verification'),
              h('p', { className: 'text-xs text-indigo-600 mb-2' }, 'The sum of voltage drops around any closed loop equals the source voltage.'),
              h('div', { className: 'space-y-1' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compV = current * compR;
                  if (comp.type === 'ammeter' || comp.type === 'voltmeter') return null;
                  return h('div', { key: comp.id, className: 'flex items-center gap-2 text-xs' },
                    h('span', { className: 'text-indigo-600 font-mono' }, 'V' + (i + 1) + ' = I \u00D7 R = ' + current.toFixed(3) + ' \u00D7 ' + compR.toFixed(1) + ' = ' + compV.toFixed(2) + 'V')
                  );
                }),
                h('div', { className: 'border-t border-indigo-200 mt-2 pt-2' },
                  (function() {
                    var vSum = 0;
                    components.forEach(function(comp) {
                      if (comp.type !== 'ammeter' && comp.type !== 'voltmeter') {
                        vSum += current * getCompR(comp);
                      }
                    });
                    return h('div', { className: 'flex items-center gap-2 text-xs font-bold' },
                      h('span', { className: 'text-indigo-800' }, '\u2211 V_drops = ' + vSum.toFixed(2) + 'V'),
                      h('span', { className: 'text-indigo-400' }, '\u2248'),
                      h('span', { className: 'text-indigo-800' }, 'V_source = ' + voltage + 'V'),
                      h('span', { className: Math.abs(vSum - voltage) < 0.1 ? 'text-emerald-600' : 'text-red-600' }, Math.abs(vSum - voltage) < 0.1 ? '\u2705' : '\u26A0\uFE0F')
                    );
                  })()
                )
              )
            ),

            // ══════════════════════════════════════
            // Open circuit warning
            // ══════════════════════════════════════
            isOpen && h('div', { className: 'mt-3 bg-amber-100 rounded-xl border-2 border-amber-400 p-3 text-center' },
              h('p', { className: 'text-lg font-black text-amber-700' }, '\uD83D\uDD13 CIRCUIT OPEN'),
              h('p', { className: 'text-xs text-amber-600 mt-1' }, 'A switch is open \u2014 no current flows. Close all switches to complete the circuit.')
            ),

            // ══════════════════════════════════════
            // Short circuit warning
            // ══════════════════════════════════════
            isShort && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-red-100 rounded-xl border-2 border-red-400 p-3 text-center animate-pulse' },
              h('p', { className: 'text-lg font-black text-red-700' }, '\u26A0\uFE0F SHORT CIRCUIT DETECTED'),
              h('p', { className: 'text-xs text-red-600 mt-1' }, 'Total resistance is below 1\u03A9! In real life, this could damage components or cause a fire. Add more resistance.')
            ),

            // ══════════════════════════════════════
            // Circuit Presets
            // ══════════════════════════════════════
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-slate-50 rounded-xl border border-slate-200 p-3' },
              h('button', { 'aria-label': 'Circuit Presets',
                onClick: function() { upd('showPresets', !showPresets); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[10px] font-bold text-slate-600 uppercase tracking-wider' }, '\uD83D\uDCCB Circuit Presets'),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'ml-auto text-slate-500 text-xs' }, showPresets ? '\u25B2' : '\u25BC')
              ),
              showPresets && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2 mt-2' },
                CIRCUIT_PRESETS.map(function(preset) {
                  return h('button', { 'aria-label': 'Load Preset',
                    key: preset.id,
                    onClick: function() { loadPreset(preset); },
                    className: 'px-3 py-2 rounded-lg text-xs border bg-white hover:bg-slate-100 transition-all text-left',
                    title: preset.desc
                  },
                    h('span', { className: 'font-bold text-slate-700 block' }, preset.label),
                    h('span', { className: 'text-[10px] text-slate-500' }, preset.desc)
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Circuit Challenges (10)
            // ══════════════════════════════════════
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2' }, '\uD83C\uDFAF Circuit Challenges'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2' },
                CHALLENGES.map(function(ch, ci) {
                  var actual = ch.type === 'current' ? current : ch.type === 'resistance' ? totalR : power;
                  var close = Math.abs(actual - ch.target) < ch.target * 0.05;

                  return h('button', { 'aria-label': 'Circuit action',
                    key: ci,
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
                    className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ' + (close ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : challengesDoneSet[ci] ? 'bg-emerald-50 text-emerald-500 border-emerald-200' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50')
                  }, (close || challengesDoneSet[ci] ? '\u2705 ' : '\uD83C\uDFAF ') + ch.label);
                })
              )
            ),

            // ══════════════════════════════════════
            // Ohm's Law Quiz
            // ══════════════════════════════════════
            (function() {
              return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-blue-50 rounded-xl border border-blue-200 p-3' },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mb-2' },
                  h('button', { 'aria-label': 'Circuit action',
                    onClick: function() { var q = makeOhmQuestion(); upd('ohmQuiz', q); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (ohmQuiz ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700')
                  }, ohmQuiz ? '\uD83D\uDD04 Next Question' : '\u26A1 Ohm\'s Law Quiz'),
                  ohmScore > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + ohmScore + ' correct'),
                  ohmStreak > 1 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + ohmStreak + ' streak')
                ),

                // Unanswered question
                ohmQuiz && !ohmQuiz.answered && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-lg p-3 border border-blue-200' },
                  h('p', { className: 'text-sm font-bold text-blue-800 mb-3' }, ohmQuiz.text),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2' },
                    ohmQuiz.opts.map(function(opt, oi) {
                      return h('button', { 'aria-label': 'Circuit action',
                        key: oi,
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
                        className: 'px-3 py-2.5 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all'
                      }, opt + ohmQuiz.unit);
                    })
                  )
                ),

                // Answered question (feedback)
                ohmQuiz && ohmQuiz.answered && h('div', {
                  className: 'p-3 rounded-lg text-sm font-bold ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')
                },
                  Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? '\u2705 Correct!' : '\u274C Answer: ' + ohmQuiz.answer + ohmQuiz.unit,
                  h('p', {
                    className: 'text-xs font-normal mt-1 ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'text-emerald-600' : 'text-red-600')
                  }, '\uD83D\uDD0D ' + ohmQuiz.formula)
                )
              );
            })(),

            // ══════════════════════════════════════
            // Badge panel (collapsible)
            // ══════════════════════════════════════
            showBadges && h('div', { className: 'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Badges (' + Object.keys(badges).length + '/' + BADGES.length + ')'),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                BADGES.map(function(b) {
                  var earned = badges[b.id];
                  return h('div', {
                    key: b.id,
                    className: 'flex items-center gap-2 p-2 rounded-lg border text-xs ' + (earned ? 'bg-white border-amber-300' : 'bg-slate-50 border-slate-200 opacity-50')
                  },
                    h('span', { className: 'text-lg' }, earned ? b.icon : '\uD83D\uDD12'),
                    h('div', null,
                      h('p', { className: 'font-bold ' + (earned ? 'text-amber-700' : 'text-slate-500') }, b.name),
                      h('p', { className: 'text-[10px] ' + (earned ? 'text-amber-600' : 'text-slate-500') }, b.desc)
                    )
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // AI Tutor panel (collapsible)
            // ══════════════════════════════════════
            showAI && h('div', { className: 'mt-3 bg-blue-50 rounded-xl border border-blue-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2' }, '\uD83E\uDD16 AI Circuit Tutor'),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'text',
                  placeholder: 'Ask about circuits, Ohm\'s Law, components...',
                  value: aiQuestion,
                  onChange: function(e) { upd('aiQuestion', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') askAI(); },
                  className: 'flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300'
                }),
                h('button', { 'aria-label': 'AI is thinking...',
                  onClick: askAI,
                  disabled: aiLoading,
                  className: 'px-4 py-2 text-sm font-bold rounded-lg transition-all ' + (aiLoading ? 'bg-blue-200 text-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700')
                }, aiLoading ? 'Thinking...' : 'Ask')
              ),
              aiLoading && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-2 text-xs text-blue-500 animate-pulse' }, 'AI is thinking...'),
              aiResponse && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-2 bg-white rounded-lg p-3 border border-blue-200 text-sm text-blue-800 whitespace-pre-wrap' }, aiResponse),
              // Quick-ask suggestions
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1 mt-2' },
                ['What is Ohm\'s Law?', 'Series vs parallel?', 'What is a short circuit?', 'How do capacitors work?', 'What does an ammeter measure?'].map(function(q) {
                  return h('button', { 'aria-label': 'Ask question',
                    key: q,
                    onClick: function() { updMulti({ aiQuestion: q }); },
                    className: 'px-2 py-1 text-[10px] bg-white text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 transition-all'
                  }, q);
                })
              )
            ),

            // ══════════════════════════════════════
            // Kirchhoff's Laws educational panel (g68/g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-violet-50 rounded-xl border border-violet-200 p-3' },
              h('button', { 'aria-label': 'Change show kirchhoff',
                onClick: function() { upd('showKirchhoff', !showKirchhoff); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[10px] font-bold text-violet-700 uppercase tracking-wider' }, '\u2696 Kirchhoff\'s Laws'),
                h('span', { className: 'ml-auto text-violet-400 text-xs' }, showKirchhoff ? '\u25B2' : '\u25BC')
              ),
              showKirchhoff && h('div', { className: 'mt-2 space-y-3' },
                // KCL
                h('div', { className: 'bg-white rounded-lg p-3 border border-violet-200' },
                  h('p', { className: 'text-xs font-bold text-violet-800 mb-1' }, 'Kirchhoff\'s Current Law (KCL)'),
                  h('p', { className: 'text-xs text-violet-600' }, 'The total current entering a junction equals the total current leaving that junction.'),
                  h('p', { className: 'text-xs text-violet-500 italic mt-1' }, '\u2211 I_in = \u2211 I_out'),
                  mode === 'parallel' && components.length > 0 && h('div', { className: 'mt-2 bg-violet-50 rounded p-2' },
                    h('p', { className: 'text-[10px] font-bold text-violet-700 mb-1' }, 'Your circuit:'),
                    h('p', { className: 'text-[10px] text-violet-600' }, 'Total current from source: ' + current.toFixed(3) + 'A'),
                    h('p', { className: 'text-[10px] text-violet-600' }, 'Branch currents: ' + components.map(function(c, i) {
                      var cR = getCompR(c);
                      var cI = voltage / cR;
                      return 'I' + (i + 1) + '=' + cI.toFixed(3) + 'A';
                    }).join(' + ')),
                    (function() {
                      var branchSum = 0;
                      components.forEach(function(c) { branchSum += voltage / getCompR(c); });
                      return h('p', { className: 'text-[10px] font-bold text-violet-700' }, 'Sum of branch currents: ' + branchSum.toFixed(3) + 'A ' + (Math.abs(branchSum - current) < 0.001 ? '\u2705' : ''));
                    })()
                  )
                ),

                // KVL
                h('div', { className: 'bg-white rounded-lg p-3 border border-violet-200' },
                  h('p', { className: 'text-xs font-bold text-violet-800 mb-1' }, 'Kirchhoff\'s Voltage Law (KVL)'),
                  h('p', { className: 'text-xs text-violet-600' }, 'The sum of all voltage drops around any closed loop equals the source voltage (EMF).'),
                  h('p', { className: 'text-xs text-violet-500 italic mt-1' }, '\u2211 V_drops = V_source'),
                  mode === 'series' && components.length > 0 && current > 0.001 && h('div', { className: 'mt-2 bg-violet-50 rounded p-2' },
                    h('p', { className: 'text-[10px] font-bold text-violet-700 mb-1' }, 'Your circuit:'),
                    components.map(function(c, i) {
                      if (c.type === 'ammeter' || c.type === 'voltmeter') return null;
                      var cR = getCompR(c);
                      var cV = current * cR;
                      return h('p', { key: c.id, className: 'text-[10px] text-violet-600' }, 'V' + (i + 1) + ' = ' + current.toFixed(3) + ' \u00D7 ' + cR.toFixed(1) + ' = ' + cV.toFixed(2) + 'V');
                    }),
                    (function() {
                      var vSum = 0;
                      components.forEach(function(c) {
                        if (c.type !== 'ammeter' && c.type !== 'voltmeter') {
                          vSum += current * getCompR(c);
                        }
                      });
                      return h('p', { className: 'text-[10px] font-bold text-violet-700 mt-1' }, '\u2211 = ' + vSum.toFixed(2) + 'V \u2248 ' + voltage + 'V ' + (Math.abs(vSum - voltage) < 0.1 ? '\u2705' : '\u26A0\uFE0F'));
                    })()
                  )
                ),

                // Additional formulas for g912
                band === 'g912' && h('div', { className: 'bg-white rounded-lg p-3 border border-violet-200' },
                  h('p', { className: 'text-xs font-bold text-violet-800 mb-1' }, 'Key Relationships'),
                  h('div', { className: 'grid grid-cols-2 gap-2 text-[10px] text-violet-600' },
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
            components.length > 0 && !isOpen ? h('div', { className: 'mt-4 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden' },
              h('div', { className: 'px-3 py-2 flex items-center gap-2 border-b border-slate-700' },
                h('div', { className: 'w-2 h-2 rounded-full bg-emerald-400' }),
                h('span', { className: 'text-[10px] font-bold text-emerald-400 uppercase tracking-wider' }, 'Oscilloscope'),
                h('span', { className: 'ml-auto text-[11px] text-slate-500 font-mono' },
                  voltage.toFixed(1) + 'V  ' + current.toFixed(3) + 'A  ' + totalR.toFixed(1) + '\u03A9')
              ),
              h('canvas', {
                ref: function(canvas) {
                  if (!canvas) return;
                  var oc = canvas.getContext('2d');
                  var dpr = window.devicePixelRatio || 1;
                  var ow = canvas.offsetWidth || 400;
                  var oh = 120;
                  canvas.width = ow * dpr; canvas.height = oh * dpr;
                  canvas.style.height = oh + 'px'; oc.scale(dpr, dpr);

                  // Dark CRT background
                  oc.fillStyle = '#0a0f1a'; oc.fillRect(0, 0, ow, oh);

                  // Grid lines
                  oc.strokeStyle = 'rgba(34,197,94,0.1)'; oc.lineWidth = 0.5;
                  for (var gx = 0; gx < ow; gx += ow / 10) {
                    oc.beginPath(); oc.moveTo(gx, 0); oc.lineTo(gx, oh); oc.stroke();
                  }
                  for (var gy = 0; gy < oh; gy += oh / 6) {
                    oc.beginPath(); oc.moveTo(0, gy); oc.lineTo(ow, gy); oc.stroke();
                  }

                  // Center line
                  oc.strokeStyle = 'rgba(34,197,94,0.25)'; oc.lineWidth = 1;
                  oc.beginPath(); oc.moveTo(0, oh / 2); oc.lineTo(ow, oh / 2); oc.stroke();

                  // Voltage trace (green, DC flat line at voltage level)
                  var vNorm = Math.min(voltage / 24, 1);
                  var vY = oh * 0.5 - vNorm * oh * 0.35;
                  oc.strokeStyle = '#22c55e'; oc.lineWidth = 2;
                  oc.shadowColor = '#22c55e'; oc.shadowBlur = 6;
                  oc.beginPath(); oc.moveTo(0, vY); oc.lineTo(ow, vY); oc.stroke();
                  oc.shadowBlur = 0;

                  // Current trace (cyan, with slight noise to look realistic)
                  if (!isShort) {
                    var iNorm = Math.min(current / 2, 1);
                    var iY = oh * 0.5 - iNorm * oh * 0.35;
                    oc.strokeStyle = '#06b6d4'; oc.lineWidth = 1.5;
                    oc.shadowColor = '#06b6d4'; oc.shadowBlur = 4;
                    oc.beginPath();
                    for (var sx = 0; sx < ow; sx++) {
                      var noise = (Math.random() - 0.5) * 2;
                      var sy = iY + noise;
                      if (sx === 0) oc.moveTo(sx, sy); else oc.lineTo(sx, sy);
                    }
                    oc.stroke(); oc.shadowBlur = 0;
                  }

                  // Per-component voltage drops (small ticks on voltage line)
                  if (mode === 'series' && components.length > 0) {
                    var dropX = ow * 0.1;
                    var dropW = ow * 0.8;
                    components.forEach(function(comp, ci) {
                      var compV = current * getCompR(comp);
                      var frac = compV / voltage;
                      var barEnd = dropX + dropW * ((ci + 1) / components.length);
                      oc.strokeStyle = 'rgba(251,191,36,0.5)'; oc.lineWidth = 1;
                      oc.setLineDash([2, 2]);
                      oc.beginPath(); oc.moveTo(barEnd, oh * 0.1); oc.lineTo(barEnd, oh * 0.9); oc.stroke();
                      oc.setLineDash([]);
                      // Drop label
                      oc.fillStyle = '#fbbf24'; oc.font = '8px monospace'; oc.textAlign = 'center';
                      oc.fillText(compV.toFixed(1) + 'V', barEnd, oh * 0.08);
                    });
                  }

                  // Legend
                  oc.font = '8px system-ui, sans-serif'; oc.textAlign = 'left';
                  oc.fillStyle = '#22c55e'; oc.fillText('\u2588 Voltage', 6, oh - 6);
                  oc.fillStyle = '#06b6d4'; oc.fillText('\u2588 Current', 60, oh - 6);
                  if (mode === 'series') { oc.fillStyle = '#fbbf24'; oc.fillText('\u2508 V-drops', 114, oh - 6); }

                  // Short circuit warning
                  if (isShort) {
                    oc.fillStyle = 'rgba(239,68,68,0.3)'; oc.fillRect(0, 0, ow, oh);
                    oc.fillStyle = '#ef4444'; oc.font = 'bold 14px system-ui'; oc.textAlign = 'center';
                    oc.fillText('\u26A0 SHORT CIRCUIT', ow / 2, oh / 2 + 5);
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
                  icon: '\u2237', name: 'Resistor', color: '#d97706',
                  how: 'Electrons collide with atoms in the resistive material, converting electrical energy into heat. The more collisions (higher resistance), the less current flows.',
                  equation: 'V = I \u00D7 R (Ohm\'s Law)',
                  analogy: 'Like a narrow section of pipe \u2014 it restricts water flow and creates pressure difference.'
                },
                bulb: {
                  icon: '\uD83D\uDCA1', name: 'Light Bulb', color: '#eab308',
                  how: 'Current heats a thin wire (filament) to ~2,500\u00B0C until it glows white-hot. The filament\'s resistance increases with temperature.',
                  equation: 'Brightness \u221D Power = I\u00B2 \u00D7 R',
                  analogy: 'Like rubbing your hands together fast \u2014 friction (resistance) creates heat and light.'
                },
                switch: {
                  icon: '\uD83D\uDD18', name: 'Switch', color: '#64748b',
                  how: 'A physical gap in the conductor. When closed, electrons flow freely. When open, the air gap has near-infinite resistance, stopping current completely.',
                  equation: 'R_open \u2248 \u221E, R_closed \u2248 0\u03A9',
                  analogy: 'Like a drawbridge \u2014 when up, nothing crosses. When down, traffic flows.'
                },
                led: {
                  icon: '\uD83D\uDD34', name: 'LED', color: '#ef4444',
                  how: 'A semiconductor diode that emits photons when electrons drop from a high energy band to a low one. Different materials produce different colors.',
                  equation: 'V_forward \u2248 1.8-3.3V (depends on color)',
                  analogy: 'Like a one-way door with a light \u2014 electrons can only go one direction, and they release light as they pass.'
                },
                ammeter: {
                  icon: '\uD83D\uDCCF', name: 'Ammeter', color: '#3b82f6',
                  how: 'Measures current by detecting the magnetic field created by flowing electrons. Connected in series so all current passes through it. Has very low internal resistance.',
                  equation: 'I = reading in Amperes (A)',
                  analogy: 'Like a turnstile counting how many people pass per second.'
                },
                voltmeter: {
                  icon: '\uD83D\uDCCA', name: 'Voltmeter', color: '#f59e0b',
                  how: 'Measures potential difference (voltage) between two points. Connected in parallel with very high internal resistance so it doesn\'t affect the circuit.',
                  equation: 'V = reading in Volts (V)',
                  analogy: 'Like a pressure gauge on a water pipe \u2014 measures the push without blocking flow.'
                },
                capacitor: {
                  icon: '\u2550', name: 'Capacitor', color: '#6366f1',
                  how: 'Two metal plates separated by an insulator. Electrons accumulate on one plate and leave the other, storing energy in an electric field. Releases energy quickly when discharged.',
                  equation: 'Q = C \u00D7 V, Energy = \u00BDCV\u00B2',
                  analogy: 'Like a water tank \u2014 it fills up slowly and can release all its stored water at once.'
                }
              };

              var selectedComp = d._selectedComp || null;
              var physics = selectedComp ? COMP_PHYSICS[selectedComp] : null;

              // Only show if there are components
              if (components.length === 0) return null;

              return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3' },
                h('p', { className: 'text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2' }, '\u269B How Components Work'),
                // Component selector chips
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5 mb-2' },
                  ['resistor', 'bulb', 'switch', 'led', 'ammeter', 'voltmeter', 'capacitor'].map(function(type) {
                    var info = COMP_PHYSICS[type];
                    var active = selectedComp === type;
                    return h('button', { 'aria-label': 'Change _selected comp',
                      key: type,
                      onClick: function() { upd('_selectedComp', active ? null : type); },
                      className: 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all ' +
                        (active ? 'text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'),
                      style: active ? { background: info.color } : {}
                    }, info.icon + ' ' + info.name);
                  })
                ),
                // Explainer card
                physics ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-lg border border-amber-200 p-3' },
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mb-2' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-2xl' }, physics.icon),
                    h('h4', { className: 'font-bold text-slate-800 text-sm' }, physics.name),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'ml-auto px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200' }, physics.equation)
                  ),
                  h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, physics.how),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-sky-50 rounded-lg p-2 border border-sky-200' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-sky-600' }, '\uD83D\uDCA1 Think of it as: '),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-sky-800' }, physics.analogy)
                  ),
                  typeof callTTS === 'function' ? h('button', { 'aria-label': 'Read aloud',
                    onClick: function() { callTTS(physics.name + '. ' + physics.how + ' ' + physics.analogy); },
                    className: 'mt-2 text-[10px] text-amber-600 hover:text-amber-800 font-bold'
                  }, '\uD83D\uDD0A Read aloud') : null
                ) : h('p', { className: 'text-[10px] text-amber-500 italic' }, 'Tap a component above to learn how it works inside!')
              );
            })(),


            // ══════════════════════════════════════
            // Real-World Circuit Applications
            // ══════════════════════════════════════
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-2' }, '\uD83C\uDF0D Real-World Circuits'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
                [
                  { emoji: '\uD83D\uDD26', name: 'Flashlight', circuit: 'Series', desc: 'Battery + switch + bulb in series. Switch breaks circuit to turn off.', comps: 'Switch, Bulb' },
                  { emoji: '\uD83D\uDCF1', name: 'Phone Charger', circuit: 'Series + Parallel', desc: 'Transformer reduces 120V to 5V. Capacitors smooth the current for steady charging.', comps: 'Resistor, Capacitor' },
                  { emoji: '\uD83D\uDE97', name: 'Car Headlights', circuit: 'Parallel', desc: 'Headlights wired in parallel so if one burns out, the other stays on.', comps: 'Bulb, Switch' },
                  { emoji: '\uD83C\uDFB5', name: 'Guitar Pedal', circuit: 'Series + Parallel', desc: 'Resistors and capacitors filter frequencies to create distortion or reverb effects.', comps: 'Resistor, Capacitor' },
                  { emoji: '\uD83D\uDEA6', name: 'Traffic Light', circuit: 'Parallel', desc: 'Three LED groups in parallel, controlled by a timer circuit switching between them.', comps: 'LED, Switch' },
                  { emoji: '\u2764\uFE0F', name: 'Heart Monitor', circuit: 'Series', desc: 'Amplifies tiny electrical signals from heart muscle. Resistors set gain, capacitors filter noise.', comps: 'Resistor, Ammeter' }
                ].map(function(app) {
                  var expanded = d._expandedApp === app.name;
                  return h('button', { 'aria-label': 'Change _expanded app',
                    key: app.name,
                    onClick: function() { upd('_expandedApp', expanded ? null : app.name); },
                    className: 'text-left rounded-lg p-2 border transition-all ' +
                      (expanded ? 'bg-white border-cyan-400 shadow-sm' : 'bg-white/60 border-cyan-100 hover:border-cyan-300')
                  },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-lg' }, app.emoji),
                      h('div', null,
                        h('span', { className: 'text-xs font-bold text-slate-800 block' }, app.name),
                        h('span', { className: 'text-[11px] text-cyan-600 font-bold' }, app.circuit)
                      )
                    ),
                    expanded ? h('div', null,
                      h('p', { className: 'text-[10px] text-slate-600 leading-relaxed mb-1' }, app.desc),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] text-slate-500 font-bold' }, '\uD83D\uDD27 Key parts: ' + app.comps)
                    ) : null
                  );
                })
              )
            ),


            // ══════════════════════════════════════
            // Snapshot + Footer
            // ══════════════════════════════════════
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 flex items-center gap-2' },
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
                  if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
                },
                className: 'ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all'
              }, '\uD83D\uDCF8 Snapshot'),

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
                className: 'px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-all border border-slate-200'
              }, '\uD83D\uDD0A Read Aloud')
            ),

            // Footer
            h('p', { className: 'text-[10px] text-center text-slate-500 mt-3 mb-2' }, '\uD83D\uDD0C Circuit Builder \u2022 Ohm\'s Law: V = IR \u2022 Power: P = IV')
          );
        };
      }
      return h(this._CircuitComponent, { ctx: ctx });
    }
  });

  console.log('[StemLab] stem_tool_circuit.js loaded \u2014 Circuit Builder');
})();
