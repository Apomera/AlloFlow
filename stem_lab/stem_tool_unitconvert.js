window.StemLab = window.StemLab || { registerTool: function(){}, registerModule: function(){} };
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

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-unitconvert')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-unitconvert';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── Sound effects (badge fanfare only — quiz uses ctx.beep) ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }
  function playBadgeSound() {
    try {
      var ac = getAudioCtx();
      var notes = [440, 554, 659, 880];
      notes.forEach(function(f, i) {
        var o = ac.createOscillator(); var g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.value = f; o.type = 'sine';
        var t0 = ac.currentTime + 0.1 * i;
        g.gain.setValueAtTime(0.1, t0);
        g.gain.exponentialRampToValueAtTime(0.01, t0 + 0.15);
        o.start(t0); o.stop(t0 + 0.15);
      });
    } catch (e) { /* audio not available */ }
  }

  // ── Badge definitions ──
  var BADGES = [
    { id: 'firstConvert',   icon: '\u2B50',       label: 'First Convert',    desc: 'Make your first unit conversion' },
    { id: 'quizStreak5',    icon: '\uD83D\uDD25', label: 'On Fire',          desc: '5 quiz answers in a row' },
    { id: 'quizStreak10',   icon: '\u26A1',       label: 'Lightning',        desc: '10 quiz answers in a row' },
    { id: 'quizMaster',     icon: '\uD83E\uDDE0', label: 'Quiz Master',      desc: 'Answer 20 quiz questions' },
    { id: 'allCategories',  icon: '\uD83C\uDF0D', label: 'World Explorer',   desc: 'Use all 9 unit categories' },
    { id: 'speedster',      icon: '\uD83D\uDE80', label: 'Speedster',        desc: 'Answer a quiz in under 3 seconds' },
    { id: 'wordProblem',    icon: '\uD83D\uDCDD', label: 'Word Wizard',      desc: 'Generate an AI word problem' },
    { id: 'pinCollector',   icon: '\uD83D\uDCCC', label: 'Pin Collector',    desc: 'Pin 5 conversions' },
    { id: 'historian',      icon: '\uD83D\uDCBE', label: 'Historian',        desc: 'Save 10 conversions to history' },
    { id: 'tempMaster',     icon: '\uD83C\uDF21\uFE0F', label: 'Temp Master', desc: 'Convert between all 3 temperature units' }
  ];

  window.StemLab.registerTool('unitConvert', {
    icon: '\uD83D\uDCCF',
    label: 'Unit Converter',
    desc: 'Convert units with visual comparison, quiz, AI word problems, badges & keyboard shortcuts',
    color: 'cyan',
    category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var setToolSnapshots = ctx.setToolSnapshots;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;

      return (function() {
        var d = labToolData.unitConvert || {};

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, typeof key === 'object' ? key : { [key]: val }) });
          });
        };

        // ── CATEGORIES ──
        var CATEGORIES = {
          length:      { label: '\uD83D\uDCCF Length',   units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, 'in': 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 } },
          weight:      { label: '\u2696\uFE0F Weight',   units: { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ton: 907185 } },
          temperature: { label: '\uD83C\uDF21\uFE0F Temp', units: { '\u00B0C': 'C', '\u00B0F': 'F', K: 'K' } },
          speed:       { label: '\uD83D\uDE80 Speed',    units: { 'm/s': 1, 'km/h': 0.27778, mph: 0.44704, knots: 0.51444 } },
          volume:      { label: '\uD83E\uDDEA Volume',   units: { mL: 0.001, L: 1, gal: 3.78541, qt: 0.946353, cup: 0.236588, 'fl oz': 0.0295735 } },
          time:        { label: '\u23F0 Time',           units: { sec: 1, min: 60, hr: 3600, day: 86400, week: 604800, year: 31536000 } },
          area:        { label: '\uD83D\uDDD2\uFE0F Area', units: { 'cm\u00B2': 0.0001, 'm\u00B2': 1, 'km\u00B2': 1000000, 'in\u00B2': 0.00064516, 'ft\u00B2': 0.092903, acre: 4046.86 } },
          pressure:    { label: '\uD83D\uDCA8 Pressure', units: { Pa: 1, kPa: 1000, bar: 100000, psi: 6894.76, atm: 101325 } },
          energy:      { label: '\u26A1 Energy',         units: { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3600000 } },
        };

        var cat = CATEGORIES[d.category] || CATEGORIES.length;

        // ── CONVERSION ──
        var convert = function(val, from, to, catKey) {
          catKey = catKey || d.category;
          if (catKey === 'temperature') {
            if (from === to) return val;
            if (from === '\u00B0C' && to === '\u00B0F') return val * 9 / 5 + 32;
            if (from === '\u00B0F' && to === '\u00B0C') return (val - 32) * 5 / 9;
            if (from === '\u00B0C' && to === 'K') return val + 273.15;
            if (from === 'K' && to === '\u00B0C') return val - 273.15;
            if (from === '\u00B0F' && to === 'K') return (val - 32) * 5 / 9 + 273.15;
            if (from === 'K' && to === '\u00B0F') return (val - 273.15) * 9 / 5 + 32;
            return val;
          }
          var units = CATEGORIES[catKey].units;
          return val * (units[from] || 1) / (units[to] || 1);
        };

        var fmt = function(n) {
          if (typeof n !== 'number') return String(n);
          if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(4);
          return parseFloat(n.toFixed(6)).toString();
        };

        var result = convert(d.value, d.fromUnit, d.toUnit);
        var fmtResult = fmt(result);

        // ── FORMULA ──
        var getFormula = function() {
          if (d.category === 'temperature') {
            if (d.fromUnit === '\u00B0C' && d.toUnit === '\u00B0F') return 'F = C \u00D7 9/5 + 32';
            if (d.fromUnit === '\u00B0F' && d.toUnit === '\u00B0C') return 'C = (F \u2212 32) \u00D7 5/9';
            if (d.fromUnit === '\u00B0C' && d.toUnit === 'K')       return 'K = C + 273.15';
            if (d.fromUnit === 'K' && d.toUnit === '\u00B0C')       return 'C = K \u2212 273.15';
            if (d.fromUnit === '\u00B0F' && d.toUnit === 'K')       return 'K = (F \u2212 32) \u00D7 5/9 + 273.15';
            if (d.fromUnit === 'K' && d.toUnit === '\u00B0F')       return 'F = (K \u2212 273.15) \u00D7 9/5 + 32';
            return 'Same unit';
          }
          var fF = cat.units[d.fromUnit] || 1;
          var tF = cat.units[d.toUnit] || 1;
          if (fF === tF) return 'Same unit \u2014 result equals input';
          return d.value + ' ' + d.fromUnit + ' \u00D7 ' + fmt(fF / tF) + ' = ' + fmtResult + ' ' + d.toUnit;
        };

        // ── REAL-WORLD REFERENCES ──
        var REFS = {
          length: function(m) {
            if (m < 0.01) return '\uD83D\uDC1C About ' + (m * 1000).toFixed(1) + ' ant lengths';
            if (m < 1)    return '\uD83D\uDCCF About ' + (m * 100).toFixed(0) + ' cm \u2014 a ruler is 30 cm';
            if (m < 10)   return '\uD83D\uDEB6 About ' + (m / 0.75).toFixed(0) + ' walking steps';
            if (m < 100)  return '\uD83C\uDFCA An Olympic pool is 50 m \u2014 that\'s ' + (m / 50).toFixed(1) + ' pools';
            if (m < 1000) return '\u26BD A soccer field is 100 m \u2014 that\'s ' + (m / 100).toFixed(1) + ' fields';
            return '\uD83D\uDE97 ' + (m / 1609.34).toFixed(1) + ' miles, ~' + (m / 400).toFixed(0) + ' track laps';
          },
          weight: function(g) {
            if (g < 1)     return '\uD83D\uDC1D A bee weighs ~0.1 g \u2014 that\'s ' + (g / 0.1).toFixed(0) + ' bees';
            if (g < 100)   return '\uD83E\uDD55 A carrot weighs ~60 g \u2014 that\'s ' + (g / 60).toFixed(1) + ' carrots';
            if (g < 1000)  return '\uD83C\uDF4E An apple weighs ~180 g \u2014 that\'s ' + (g / 180).toFixed(1) + ' apples';
            if (g < 10000) return '\uD83D\uDCDA A textbook weighs ~1 kg \u2014 that\'s ' + (g / 1000).toFixed(1) + ' textbooks';
            return '\uD83D\uDC18 An elephant weighs ~5000 kg \u2014 that\'s ' + (g / 5000000).toFixed(4) + ' elephants';
          },
          speed: function(ms) {
            if (ms < 2)   return '\uD83D\uDEB6 Walking speed is ~1.4 m/s';
            if (ms < 12)  return '\uD83C\uDFC3 Usain Bolt peaks at ~12 m/s \u2014 you\'re at ' + (ms / 12 * 100).toFixed(0) + '%';
            if (ms < 100) return '\uD83D\uDE97 Highway speed ~30 m/s \u2014 you\'re at ' + (ms / 30 * 100).toFixed(0) + '%';
            return '\u2708\uFE0F A jet is ~250 m/s \u2014 you\'re at ' + (ms / 250 * 100).toFixed(0) + '%';
          },
          volume: function(L) {
            if (L < 0.5) return '\u2615 A teacup holds ~0.24 L \u2014 that\'s ' + (L / 0.24).toFixed(1) + ' cups';
            if (L < 5)   return '\uD83E\uDD5B A water bottle is 1 L \u2014 that\'s ' + L.toFixed(1) + ' bottles';
            return '\uD83D\uDEC1 A bathtub holds ~300 L \u2014 that\'s ' + (L / 300).toFixed(2) + ' tubs';
          },
          time: function(s) {
            if (s < 60)    return '\uD83D\uDCA8 A sneeze lasts ~0.5 s \u2014 that\'s ' + (s / 0.5).toFixed(0) + ' sneezes';
            if (s < 3600)  return '\u23F0 A class period ~50 min \u2014 that\'s ' + (s / 3000).toFixed(1) + ' classes';
            if (s < 86400) return '\uD83C\uDF1E A day has 24 hrs \u2014 that\'s ' + (s / 86400).toFixed(2) + ' days';
            return '\uD83D\uDCC5 A year has 365 days \u2014 that\'s ' + (s / 31536000).toFixed(3) + ' years';
          },
          area: function(m2) {
            if (m2 < 1)    return '\uD83D\uDCF1 A phone screen ~0.01 m\u00B2 \u2014 that\'s ' + (m2 / 0.01).toFixed(0) + ' screens';
            if (m2 < 100)  return '\uD83C\uDFE0 A room is ~20 m\u00B2 \u2014 that\'s ' + (m2 / 20).toFixed(1) + ' rooms';
            if (m2 < 5000) return '\u26BD A soccer field ~7140 m\u00B2 \u2014 that\'s ' + (m2 / 7140).toFixed(3) + ' fields';
            return '\uD83C\uDFD9\uFE0F Central Park is ~3.4 km\u00B2';
          },
          pressure: function(Pa) {
            if (Pa < 200000) return '\uD83C\uDF0A Sea level is 101,325 Pa \u2014 you\'re at ' + (Pa / 101325 * 100).toFixed(0) + '%';
            return '\uD83D\uDE97 A car tire ~220,000 Pa \u2014 you\'re at ' + (Pa / 220000 * 100).toFixed(0) + '%';
          },
          energy: function(J) {
            if (J < 1000) return '\uD83D\uDCA1 A 60W bulb uses 60 J per second';
            if (J < 1000000) return '\uD83C\uDF6A A candy bar ~630,000 J (150 kcal)';
            return '\u26A1 A lightning bolt releases ~1 billion J';
          },
        };

        // ── FUN FACTS ──
        var FACTS = {
          length:      ['\uD83C\uDF1F A light-year is 9.46 trillion km', '\uD83E\uDDAB Human DNA stretched out: ~2 m long', '\uD83D\uDE80 ISS orbits at 408 km altitude'],
          weight:      ['\uD83E\uDD8B A blue whale\'s heart weighs ~180 kg', '\uD83C\uDF6B A M&M weighs exactly 1 gram', '\uD83C\uDF0D Earth\'s atmosphere weighs 5.15 \u00D7 10\u00B9\u2078 kg'],
          temperature: ['\uD83D\uDD25 The sun\'s core is 15 million \u00B0C', '\u2744\uFE0F Coldest natural temp: \u221289.2\u00B0C (Antarctica)', '\uD83C\uDF21\uFE0F Body temp: 37\u00B0C = 98.6\u00B0F = 310.15 K'],
          speed:       ['\uD83D\uDCA1 Light travels at 299,792,458 m/s', '\uD83E\uDD85 Peregrine falcon dives at 390 km/h', '\uD83C\uDF0E Earth orbits the sun at 29.8 km/s'],
          volume:      ['\uD83E\uDD71 A raindrop is ~0.05 mL', '\uD83C\uDF0A The Pacific Ocean holds 710 million km\u00B3', '\uD83C\uDF7C A human body is ~60% water (~42 L)'],
          time:        ['\uD83E\uDD2F A hummingbird beats wings 70\u00D7/sec', '\u2764\uFE0F Your heart beats ~100,000\u00D7/day', '\uD83C\uDF10 Moonlight takes 1.28 s to reach Earth'],
          area:        ['\uD83C\uDF0D Russia: 17.1 million km\u00B2 (largest country)', '\uD83D\uDCF3 A credit card is 85.6 \u00D7 53.98 mm', '\uD83C\uDFC0 An NBA court is 436 m\u00B2'],
          pressure:    ['\uD83E\uDD1F Mariana Trench: ~1,100 atm pressure', '\uD83D\uDE80 A space suit maintains ~29.6 kPa internally', '\uD83C\uDF2A\uFE0F A hurricane\'s eye drops to ~90 kPa'],
          energy:      ['\uD83C\uDF31 A tree absorbs ~22 kg CO\u2082/year via photosynthesis', '\uD83E\uDDB4 The human brain uses ~20 W', '\u26A1 Lightning heats air to ~30,000 K'],
        };

        // ── QUIZ QUESTIONS ──
        var QUIZ_QS = [
          { q: 'How many centimeters in 1 meter?',              a: 100,    unit: 'cm'  },
          { q: 'How many grams in 1 kilogram?',                 a: 1000,   unit: 'g'   },
          { q: 'How many inches in 1 foot?',                    a: 12,     unit: 'in'  },
          { q: 'How many seconds in 1 minute?',                 a: 60,     unit: 'sec' },
          { q: 'How many seconds in 1 hour?',                   a: 3600,   unit: 'sec' },
          { q: 'How many mL in 1 liter?',                       a: 1000,   unit: 'mL'  },
          { q: 'How many ounces in 1 pound?',                   a: 16,     unit: 'oz'  },
          { q: 'How many feet in 1 mile?',                      a: 5280,   unit: 'ft'  },
          { q: 'How many minutes in 1 day?',                    a: 1440,   unit: 'min' },
          { q: 'How many mm in 1 cm?',                          a: 10,     unit: 'mm'  },
          { q: 'How many meters in 1 km?',                      a: 1000,   unit: 'm'   },
          { q: 'How many feet in 1 yard?',                      a: 3,      unit: 'ft'  },
          { q: 'How many hours in 1 week?',                     a: 168,    unit: 'hr'  },
          { q: 'How many days in 1 year?',                      a: 365,    unit: 'days'},
          { q: 'How many cm in 1 inch? (approx)',               a: 2.54,   unit: 'cm',   tol: 0.05 },
          { q: 'How many liters in 1 gallon? (approx)',         a: 3.785,  unit: 'L',    tol: 0.05 },
          { q: 'How many grams in 1 ounce? (approx)',           a: 28.35,  unit: 'g',    tol: 0.5  },
          { q: 'How many kg in 1 metric ton?',                  a: 1000,   unit: 'kg'  },
          { q: 'How many m/s is 1 km/h? (3 decimal places)',    a: 0.278,  unit: 'm/s',  tol: 0.001 },
          { q: '0\u00B0C in Fahrenheit?',                       a: 32,     unit: '\u00B0F' },
          { q: '100\u00B0C in Fahrenheit?',                     a: 212,    unit: '\u00B0F' },
          { q: 'Body temp 37\u00B0C in Fahrenheit?',            a: 98.6,   unit: '\u00B0F', tol: 0.1 },
        ];

        var tab = d.tab || 'convert';
        var facts = FACTS[d.category] || [];
        var factIdx = d.factIdx || 0;
        var currentFact = facts[factIdx % facts.length];
        var baseValue = d.category === 'temperature' ? d.value : d.value * (cat.units[d.fromUnit] || 1);
        var refText = REFS[d.category] ? REFS[d.category](baseValue) : null;

        // ── Badge state ──
        var badges = d.badges || {};
        var showBadges = d.showBadges || false;
        var showTutor = d.showTutor || false;
        var tutorResponse = d.tutorResponse || '';
        var tutorLoading = d.tutorLoading || false;
        var catsUsed = d.catsUsed || {};
        var tempUnitsUsed = d.tempUnitsUsed || {};
        var quizTotal = d.quizTotal || 0;
        var historySaveCount = d.historySaveCount || 0;

        // ── Badge checker ──
        function checkBadges(updates) {
          var changed = {};
          var newBadges = Object.assign({}, badges);
          Object.keys(updates).forEach(function(key) {
            if (updates[key] && !newBadges[key]) {
              changed[key] = true;
              newBadges[key] = true;
            }
          });
          if (Object.keys(changed).length > 0) {
            upd('badges', newBadges);
            Object.keys(changed).forEach(function(bid) {
              var badge = BADGES.find(function(b) { return b.id === bid; });
              if (badge) {
                playBadgeSound();
                addToast(badge.icon + ' Badge: ' + badge.label + '!', 'success');
                if (typeof awardStemXP === 'function') awardStemXP('unitConvert', 15, 'badge');
              }
            });
          }
        }

        // Track category usage for badge
        function trackCategory(catKey) {
          var newCats = Object.assign({}, catsUsed);
          newCats[catKey] = true;
          upd('catsUsed', newCats);
          if (Object.keys(newCats).length >= 9) checkBadges({ allCategories: true });
        }

        // ── AI Tutor ──
        function askTutor() {
          if (tutorLoading) return;
          upd({ showTutor: true, tutorLoading: true, tutorResponse: '' });
          var catLabel = cat.label.replace(/[^\w\s]/g, '').trim();
          var prompt = 'You are a friendly math tutor helping a student learn unit conversions. ';
          prompt += 'They are converting ' + catLabel + ' units: ' + d.value + ' ' + d.fromUnit + ' to ' + d.toUnit + ' (= ' + fmtResult + '). ';
          if (d.quiz && d.quiz.answered && !d.quiz.correct) {
            prompt += 'They just got a quiz question wrong: "' + d.quiz.q + '". The answer was ' + d.quiz.a + ' ' + d.quiz.unit + '. ';
            prompt += 'Explain this conversion step by step with a memory trick. Keep it to 2-3 sentences.';
          } else {
            prompt += 'Give a helpful tip about converting ' + catLabel + ' units, or share an interesting real-world application. Keep it to 2-3 sentences.';
          }
          callGemini(prompt, false, false, 0.7).then(function(resp) {
            upd({ tutorResponse: resp || 'No response received.', tutorLoading: false });
          }).catch(function() {
            upd({ tutorResponse: 'AI tutor is unavailable right now. Try again later!', tutorLoading: false });
          });
        }

        // ── Keyboard shortcuts (no hooks — plain render function) ──
        function handleKey(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
          var key = e.key;
          if (key === '1') { e.preventDefault(); upd('tab', 'convert'); }
          if (key === '2') { e.preventDefault(); upd('tab', 'table'); }
          if (key === '3') { e.preventDefault(); upd('tab', 'quiz'); }
          if (key === '4') { e.preventDefault(); upd('tab', 'wordproblem'); }
          if (key.toLowerCase() === 'n' && tab === 'quiz') {
            e.preventDefault();
            var q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];
            upd('quiz', { q: q.q, a: q.a, unit: q.unit, tol: q.tol || 0.01, answered: false, startTime: Date.now() });
            stemBeep && stemBeep('click');
          }
          if (key === '?' || (e.shiftKey && key === '/')) { e.preventDefault(); askTutor(); }
          if (key.toLowerCase() === 'b') { e.preventDefault(); upd('showBadges', !showBadges); }
        }

        // ── Earned badges count ──
        var earnedBadges = BADGES.filter(function(b) { return badges[b.id]; });
        var earnedCount = earnedBadges.length;

        // ── CSS ANIMATIONS ──
        var css = '@keyframes ucResultPop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}' +
          '@keyframes ucCorrect{0%{background:#dcfce7}50%{background:#86efac}100%{background:#dcfce7}}' +
          '@keyframes ucWrong{0%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}100%{transform:translateX(0)}}' +
          '@keyframes ucFactSlide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}' +
          '@keyframes spin{to{transform:rotate(360deg)}}';

        // ── RENDER ──
        return h('div', { className: 'max-w-2xl mx-auto animate-in fade-in duration-200 outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1', onKeyDown: handleKey, tabIndex: -1 },

          h('style', null, css),

          // Header
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
              h(ArrowLeft, { size: 18, className: 'text-slate-600' })
            ),
            h('h3', { className: 'text-lg font-bold text-slate-800' }, '\uD83D\uDCCF Unit Converter'),
            h('span', { className: 'px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[11px] font-bold rounded-full' }, 'INTERACTIVE'),
            (d.score || 0) > 0 && h('span', { className: 'px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full' }, '\u2B50 ' + d.score + ' XP'),
            (d.streak || 0) >= 2 && h('span', { className: 'px-2 py-0.5 bg-orange-100 text-orange-600 text-[11px] font-bold rounded-full animate-pulse' }, '\uD83D\uDD25 ' + d.streak),
            earnedCount > 0 && h('button', { onClick: function() { upd('showBadges', !showBadges); },
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-600 text-amber-700 hover:bg-amber-100 transition-all',
              title: 'View badges (B)'
            }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
            h('button', { onClick: askTutor,
              'aria-label': tutorLoading ? 'AI Tutor thinking' : 'Ask AI Tutor',
              'aria-busy': !!tutorLoading,
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-600 text-purple-600 hover:bg-purple-100 transition-all',
              title: 'AI Tutor (?)'
            }, '\uD83E\uDDE0 AI')
          ),

          // ── Badge panel ──
          showBadges && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200 mb-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 Badges (' + earnedCount + '/' + BADGES.length + ')'),
              h('button', { onClick: function() { upd('showBadges', false); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
            ),
            h('div', { className: 'grid grid-cols-3 sm:grid-cols-5 gap-2' },
              BADGES.map(function(badge) {
                var earned = !!badges[badge.id];
                return h('div', {
                  key: badge.id,
                  className: 'text-center p-2 rounded-lg border transition-all ' +
                    (earned ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'),
                  title: badge.desc
                },
                  h('div', { className: 'text-xl' }, earned ? badge.icon : '\uD83D\uDD12'),
                  h('div', { className: 'text-[11px] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-600') }, badge.label)
                );
              })
            )
          ),

          // ── AI Tutor panel ──
          showTutor && h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200 mb-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-sm font-bold text-purple-800' }, '\uD83E\uDDE0 AI Unit Tutor'),
              h('button', { 'aria-label': 'Ask Tutor', onClick: function() { upd('showTutor', false); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
            ),
            tutorLoading
              ? h('div', { className: 'flex items-center gap-2' },
                  h('div', { className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' }),
                  h('span', { className: 'text-xs text-purple-600' }, 'Thinking...')
                )
              : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, tutorResponse),
            !tutorLoading && h('button', { 'aria-label': 'Ask Again',
              onClick: askTutor,
              className: 'mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-600 transition-all'
            }, '\uD83D\uDD04 Ask Again')
          ),

          // Category selector
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.entries(CATEGORIES).map(function(e) {
              var k = e[0], v = e[1];
              return h('button', { key: k,
                onClick: function() {
                  var units = Object.keys(v.units);
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { category: k, fromUnit: units[0], toUnit: units[1] || units[0] }) });
                  });
                  trackCategory(k);
                  checkBadges({ firstConvert: true });
                },
                className: 'px-2.5 py-1 rounded-lg text-xs font-bold transition-all ' + (d.category === k ? 'bg-cyan-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50')
              }, v.label);
            })
          ),

          // Tool tabs
          h('div', { className: 'flex gap-0 mb-3 border-b border-slate-200', role: 'tablist', 'aria-label': 'Unit Converter sections' },
            [['convert', '\uD83D\uDD04 Convert'], ['table', '\uD83D\uDCCA All Units'], ['quiz', '\uD83E\uDDE0 Quiz'], ['wordproblem', '\uD83D\uDCDD Word Problem']].map(function(item, idx) {
              return h('button', { key: item[0],
                onClick: function() { upd('tab', item[0]); },
                role: 'tab', 'aria-selected': tab === item[0],
                className: 'px-3 py-1.5 text-xs font-bold transition-all ' + (tab === item[0] ? 'border-b-2 border-cyan-600 text-cyan-700 -mb-px' : 'text-slate-600 hover:text-slate-700'),
                title: (idx + 1) + ' key'
              }, item[1]);
            })
          ),

          // ═══ TAB: CONVERT ═══
          tab === 'convert' && h('div', { key: 'convert' },

            h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-6 shadow-sm' },

              h('div', { className: 'flex items-center gap-4 justify-center' },

                h('div', { className: 'text-center' },
                  h('input', {
                    type: 'number', value: d.value,
                    onChange: function(e) {
                      upd('value', parseFloat(e.target.value) || 0);
                      checkBadges({ firstConvert: true });
                      // Track temp units for badge
                      if (d.category === 'temperature') {
                        var tu = Object.assign({}, tempUnitsUsed);
                        tu[d.fromUnit] = true; tu[d.toUnit] = true;
                        upd('tempUnitsUsed', tu);
                        if (Object.keys(tu).length >= 3) checkBadges({ tempMaster: true });
                      }
                    },
                    'aria-label': 'Value to convert',
                    className: 'w-32 text-center text-2xl font-bold border-b-2 border-cyan-300 outline-none focus:ring-2 focus:ring-cyan-500 py-1',
                    step: '0.01'
                  }),
                  h('select', {
                    'aria-label': 'From unit', value: d.fromUnit,
                    onChange: function(e) { upd('fromUnit', e.target.value); },
                    className: 'block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-600 rounded-lg py-1'
                  }, Object.keys(cat.units).map(function(u) { return h('option', { key: u, value: u }, u); }))
                ),

                h('button', { 'aria-label': 'Swap units',
                  onClick: function() {
                    stemBeep && stemBeep('click');
                    setLabToolData(function(prev) {
                      return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { fromUnit: d.toUnit, toUnit: d.fromUnit }) });
                    });
                  },
                  className: 'text-2xl text-cyan-400 font-bold hover:scale-125 transition-transform px-2',
                  title: 'Swap units'
                }, '\u21C4'),

                h('div', { className: 'text-center' },
                  h('p', {
                    className: 'text-2xl font-black text-cyan-700 py-1',
                    style: { animation: 'ucResultPop 0.3s ease-out' }
                  }, fmtResult),
                  h('select', {
                    'aria-label': 'To unit', value: d.toUnit,
                    onChange: function(e) { upd('toUnit', e.target.value); },
                    className: 'block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-600 rounded-lg py-1'
                  }, Object.keys(cat.units).map(function(u) { return h('option', { key: u, value: u }, u); }))
                )
              ),

              // Formula row
              h('div', { className: 'mt-3 bg-slate-50 rounded-lg p-2 text-center' },
                h('span', { className: 'text-[11px] font-mono text-slate-600' }, '\uD83D\uDCCA ' + getFormula())
              ),

              // Save / Pin / AI buttons
              h('div', { className: 'flex justify-center gap-2 mt-3' },
                h('button', { 'aria-label': 'Save',
                  onClick: function() {
                    var entry = { from: d.value + ' ' + d.fromUnit, to: fmtResult + ' ' + d.toUnit, ts: Date.now() };
                    var newSaveCount = historySaveCount + 1;
                    setLabToolData(function(prev) {
                      return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { history: [entry].concat((prev.unitConvert.history || []).slice(0, 9)), historySaveCount: newSaveCount }) });
                    });
                    stemBeep && stemBeep('success');
                    addToast('\u2705 Saved to history', 'success');
                    if (newSaveCount >= 10) checkBadges({ historian: true });
                  },
                  className: 'px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-all'
                }, '\uD83D\uDCBE Save'),
                h('button', { 'aria-label': 'Pin',
                  onClick: function() {
                    var pinned = d.pinnedConversions || [];
                    if (pinned.length >= 10) { addToast('Max 10 pinned conversions', 'warning'); return; }
                    var key = d.category + '_' + d.fromUnit + '_' + d.toUnit;
                    if (pinned.find(function(p) { return p.key === key; })) { addToast('Already pinned', 'warning'); return; }
                    var newPinned = pinned.concat([{ key: key, from: d.fromUnit, to: d.toUnit, category: d.category, label: d.fromUnit + ' \u2192 ' + d.toUnit }]);
                    upd('pinnedConversions', newPinned);
                    addToast('\uD83D\uDCCC Pinned!', 'success');
                    if (newPinned.length >= 5) checkBadges({ pinCollector: true });
                  },
                  className: 'px-4 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold hover:bg-amber-100 transition-all'
                }, '\uD83D\uDCCC Pin'),
                h('button', { 'aria-label': 'Tutor',
                  onClick: askTutor,
                  className: 'px-4 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold hover:bg-purple-100 transition-all'
                }, '\uD83E\uDDE0 Tutor')
              )
            ),

            // Visual comparison bars (non-temperature)
            d.category !== 'temperature' && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-3' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA Visual Comparison'),
              (function() {
                var fF = cat.units[d.fromUnit] || 1;
                var tF = cat.units[d.toUnit] || 1;
                var ratio = fF / tF;
                var rawFrom = 100, rawTo = Math.min(Math.max(rawFrom * (1 / ratio), 5), 300);
                var maxV = Math.max(rawFrom, rawTo);
                var normF = rawFrom / maxV * 100, normT = rawTo / maxV * 100;
                return h('div', { className: 'space-y-2' },
                  h('div', null,
                    h('p', { className: 'text-[11px] font-bold text-cyan-600 mb-1' }, d.value + ' ' + d.fromUnit),
                    h('div', { className: 'h-5 rounded-full overflow-hidden bg-slate-200' },
                      h('div', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(normF), 'aria-label': 'From value: ' + d.value + ' ' + d.fromUnit, className: 'h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-500', style: { width: normF + '%' } })
                    )
                  ),
                  h('div', null,
                    h('p', { className: 'text-[11px] font-bold text-indigo-600 mb-1' }, fmtResult + ' ' + d.toUnit),
                    h('div', { className: 'h-5 rounded-full overflow-hidden bg-slate-200' },
                      h('div', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(normT), 'aria-label': 'Converted to: ' + fmtResult + ' ' + d.toUnit, className: 'h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500', style: { width: normT + '%' } })
                    )
                  )
                );
              })()
            ),

            // Temperature thermometer visual
            d.category === 'temperature' && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-4 flex items-center justify-center gap-10' },
              (function() {
                var fromVal = d.value;
                var toVal = parseFloat(fmtResult);
                var toCelsius = function(val, unit) {
                  if (unit === '\u00B0C') return val;
                  if (unit === '\u00B0F') return (val - 32) * 5 / 9;
                  return val - 273.15;
                };
                var thermo = function(val, unit, color) {
                  var pct = Math.min(100, Math.max(2, ((toCelsius(val, unit) + 50) / 150) * 100));
                  return h('div', { key: unit, className: 'text-center' },
                    h('p', { className: 'text-xs font-bold mb-1', style: { color: color } }, val.toFixed(1) + ' ' + unit),
                    h('div', { className: 'relative w-8 h-28 mx-auto bg-slate-200 rounded-full overflow-hidden' },
                      h('div', { className: 'absolute bottom-0 left-0 right-0 rounded-full transition-all duration-700', style: { backgroundColor: color, height: pct + '%' } })
                    ),
                    h('div', { className: 'w-8 h-8 rounded-full mx-auto mt-1', style: { backgroundColor: color } })
                  );
                };
                return [
                  thermo(fromVal, d.fromUnit, '#06b6d4'),
                  h('span', { key: 'arr', className: 'text-2xl text-slate-600 mt-8' }, '\u2192'),
                  thermo(toVal, d.toUnit, '#6366f1')
                ];
              })()
            ),

            // Real-world reference
            refText && h('div', { className: 'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3 text-center' },
              h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1' }, '\uD83C\uDF0D Real-World Reference'),
              h('p', { className: 'text-sm font-bold text-amber-800' }, refText)
            ),

            // Fun fact
            facts.length > 0 && h('div', { className: 'mt-3 bg-violet-50 rounded-xl border border-violet-200 p-3 flex items-start gap-2' },
              h('div', { className: 'flex-1' },
                h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1' }, '\uD83D\uDCA1 Fun Fact'),
                h('p', { key: factIdx, className: 'text-sm text-violet-800', style: { animation: 'ucFactSlide 0.4s ease-out' } }, currentFact)
              ),
              h('button', { onClick: function() { upd('factIdx', ((d.factIdx || 0) + 1) % facts.length); },
                className: 'text-violet-400 hover:text-violet-600 text-xs font-bold shrink-0 pt-0.5'
              }, '\u27A1\uFE0F')
            ),

            // Pinned conversions
            d.pinnedConversions && d.pinnedConversions.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-3' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCCC Pinned Conversions'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                d.pinnedConversions.map(function(p, i) {
                  return h('button', { key: p.key,
                    onClick: function() {
                      var c2 = CATEGORIES[p.category];
                      if (!c2) return;
                      setLabToolData(function(prev) {
                        return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { category: p.category, fromUnit: p.from, toUnit: p.to }) });
                      });
                    },
                    className: 'flex items-center gap-1 px-2 py-1 bg-white border border-amber-600 rounded-full text-xs font-bold text-amber-700 hover:bg-amber-50'
                  },
                    p.label,
                    h('span', { 
                      onClick: function(e) {
                        e.stopPropagation();
                        upd('pinnedConversions', d.pinnedConversions.filter(function(_, j) { return j !== i; }));
                      },
                      className: 'ml-1 text-slate-600 hover:text-red-500 cursor-pointer font-bold'
                    }, '\u00D7')
                  );
                })
              )
            ),

            // Conversion history
            d.history && d.history.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider' }, '\uD83D\uDCDD History'),
                h('button', { 'aria-label': 'Clear', onClick: function() { upd('history', []); }, className: 'text-[11px] text-red-400 hover:text-red-600 font-bold' }, 'Clear')
              ),
              h('div', { className: 'space-y-1' },
                d.history.map(function(item, i) {
                  return h('div', { key: i, className: 'flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5 border' },
                    h('span', { className: 'text-cyan-600 font-bold' }, item.from),
                    h('span', { className: 'text-slate-600' }, '\u2192'),
                    h('span', { className: 'text-indigo-600 font-bold' }, item.to)
                  );
                })
              )
            ),

            // Snapshot
            h('button', { 'aria-label': 'Snapshot',
              onClick: function() {
                setToolSnapshots(function(prev) {
                  return prev.concat([{ id: 'uc-' + Date.now(), tool: 'unitConvert', label: d.value + ' ' + d.fromUnit + ' \u2192 ' + d.toUnit, data: Object.assign({}, d), timestamp: Date.now() }]);
                });
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
              },
              className: 'mt-3 ml-auto block px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all'
            }, '\uD83D\uDCF8 Snapshot')

          ),

          // ═══ TAB: ALL UNITS TABLE ═══
          tab === 'table' && h('div', { key: 'table' },
            h('div', { className: 'bg-white rounded-xl border border-slate-400 overflow-hidden' },
              h('div', { className: 'bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between' },
                h('p', { className: 'text-xs font-bold text-slate-600' }, 'All ' + cat.label.replace(/[^\w\s]/g, '').trim() + ' conversions for:'),
                h('div', { className: 'flex items-center gap-2' },
                  h('input', {
                    type: 'number', value: d.value,
                    onChange: function(e) { upd('value', parseFloat(e.target.value) || 0); },
                    className: 'w-24 text-right text-sm font-bold border border-slate-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-cyan-500',
                    step: '0.01'
                  }),
                  h('span', { className: 'text-xs font-bold text-slate-600' }, d.fromUnit),
                  h('button', { 'aria-label': 'Change',
                    onClick: function() { upd('tab', 'convert'); },
                    className: 'text-xs text-cyan-600 hover:underline font-bold'
                  }, 'Change \u2192')
                )
              ),
              h('table', { className: 'w-full text-sm' },
                h('caption', { className: 'sr-only' }, 'Change \u2192'), h('thead', null,
                  h('tr', { className: 'bg-cyan-50' },
                    h('th', { scope: 'col', className: 'text-left px-4 py-2 text-xs font-bold text-cyan-700' }, 'Unit'),
                    h('th', { scope: 'col', className: 'text-right px-4 py-2 text-xs font-bold text-cyan-700' }, 'Value'),
                    h('th', { scope: 'col', className: 'text-right px-4 py-2 text-xs font-bold text-cyan-700' }, '')
                  )
                ),
                h('tbody', null,
                  Object.keys(cat.units).map(function(u, i) {
                    var val = convert(d.value, d.fromUnit, u);
                    var isFrom = u === d.fromUnit;
                    return h('tr', {
                      key: u,
                      className: (isFrom ? 'bg-cyan-50 ' : i % 2 === 0 ? 'bg-white ' : 'bg-slate-50 ') + 'border-b border-slate-100'
                    },
                      h('td', { className: 'px-4 py-2 font-bold ' + (isFrom ? 'text-cyan-700' : 'text-slate-700') },
                        u + (isFrom ? ' \u2190' : '')
                      ),
                      h('td', { className: 'px-4 py-2 text-right font-mono ' + (isFrom ? 'text-cyan-700 font-bold' : 'text-slate-600') }, fmt(val)),
                      h('td', { className: 'px-4 py-2 text-right' },
                        !isFrom && h('button', { 'aria-label': 'Use',
                          onClick: function() { upd('toUnit', u); upd('tab', 'convert'); },
                          className: 'text-[11px] font-bold text-cyan-600 hover:underline'
                        }, 'Use \u2192')
                      )
                    );
                  })
                )
              )
            ),
            refText && h('div', { className: 'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3 text-center' },
              h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase mb-1' }, '\uD83C\uDF0D Reference'),
              h('p', { className: 'text-sm font-bold text-amber-800' }, refText)
            )
          ),

          // ═══ TAB: QUIZ ═══
          tab === 'quiz' && h('div', { key: 'quiz' },

            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full' }, '\u2B50 ' + (d.score || 0) + ' XP'),
                h('span', { className: 'px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full' }, '\uD83D\uDD25 ' + (d.streak || 0)),
                (d.bestStreak || 0) > 0 && h('span', { className: 'px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full' }, '\uD83C\uDFC6 Best: ' + d.bestStreak)
              ),
              h('button', { 'aria-label': 'Next question (N)',
                onClick: function() {
                  var q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];
                  upd('quiz', { q: q.q, a: q.a, unit: q.unit, tol: q.tol || 0.01, answered: false, startTime: Date.now() });
                  stemBeep && stemBeep('click');
                },
                className: 'px-3 py-1.5 bg-cyan-700 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-all',
                title: 'Next question (N)'
              }, d.quiz ? '\uD83D\uDD04 Next' : '\uD83E\uDDE0 Start Quiz')
            ),

            !d.quiz && h('div', { className: 'text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200' },
              h('p', { className: 'text-4xl mb-3' }, '\uD83E\uDDE0'),
              h('p', { className: 'text-sm font-bold text-slate-600' }, 'Test your unit conversion knowledge!'),
              h('p', { className: 'text-xs text-slate-600 mt-1' }, '22 questions \u2022 Speed bonus \u2022 Streak rewards')
            ),

            d.quiz && h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-5 shadow-sm' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1' }, '\uD83E\uDDE0 Question'),
              h('p', { className: 'text-lg font-bold text-slate-800 mb-4' }, d.quiz.q),

              !d.quiz.answered
                ? h('div', { className: 'flex gap-2 items-center' },
                    h('input', {
                      type: 'number', placeholder: 'Your answer...', autoFocus: true,
                      step: '0.01',
                      'aria-label': 'Quiz answer',
                      className: 'flex-1 px-3 py-2 border-2 border-cyan-600 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400',
                      onKeyDown: function(e) {
                        if (e.key !== 'Enter') return;
                        var ans = parseFloat(e.target.value);
                        var tol = d.quiz.tol || 0.01;
                        var correct = Math.abs(ans - d.quiz.a) <= Math.max(tol, Math.abs(d.quiz.a) * tol);
                        var elapsed = (Date.now() - d.quiz.startTime) / 1000;
                        var xp = correct ? (elapsed < 5 ? 3 : elapsed < 10 ? 2 : 1) : 0;
                        var newStreak = correct ? (d.streak || 0) + 1 : 0;
                        var newBest = Math.max(d.bestStreak || 0, newStreak);
                        var newQTotal = quizTotal + 1;
                        if (correct) {
                          stemBeep && stemBeep('success');
                          if (newStreak >= 5) { stemCelebrate && stemCelebrate(); }
                          awardStemXP && awardStemXP(xp);
                          addToast(xp === 3 ? '\u26A1 Lightning fast! +3 XP' : xp === 2 ? '\uD83D\uDE80 Quick! +2 XP' : '\u2705 Correct! +1 XP', 'success');
                        } else {
                          stemBeep && stemBeep('error');
                          addToast('\u274C Answer: ' + d.quiz.a + ' ' + d.quiz.unit, 'error');
                        }
                        setLabToolData(function(prev) {
                          return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, {
                            score: (prev.unitConvert.score || 0) + xp,
                            streak: newStreak,
                            bestStreak: newBest,
                            quizTotal: newQTotal,
                            quiz: Object.assign({}, prev.unitConvert.quiz, { answered: true, userAns: ans, correct: correct, xp: xp, elapsed: elapsed.toFixed(1) })
                          }) });
                        });
                        // Badge checks
                        checkBadges({
                          quizStreak5: correct && newStreak >= 5,
                          quizStreak10: correct && newStreak >= 10,
                          speedster: correct && elapsed < 3,
                          quizMaster: newQTotal >= 20
                        });
                      }
                    }),
                    h('span', { className: 'text-xs text-slate-600 shrink-0' }, d.quiz.unit + ' \u2014 Enter'),
                    h('button', { 'aria-label': 'Ask Tutor',
                      onClick: askTutor,
                      className: 'px-2 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-sm',
                      title: 'Get a hint from AI'
                    }, '\uD83E\uDDE0')
                  )
                : h('div', { style: { animation: d.quiz.correct ? 'ucCorrect 0.5s ease' : 'ucWrong 0.4s ease' } },
                    h('p', { className: 'text-base font-bold mb-1 ' + (d.quiz.correct ? 'text-emerald-600' : 'text-red-500') },
                      d.quiz.correct
                        ? '\u2705 Correct! ' + (d.quiz.xp === 3 ? '\u26A1 Lightning!' : d.quiz.xp === 2 ? '\uD83D\uDE80 Quick!' : '') + ' (' + d.quiz.elapsed + 's)'
                        : '\u274C Answer was: ' + d.quiz.a + ' ' + d.quiz.unit
                    ),
                    d.quiz.correct && d.quiz.xp > 0 && h('p', { className: 'text-xs text-emerald-400 mb-2' }, '+' + d.quiz.xp + ' XP earned'),
                    h('div', { className: 'flex gap-2' },
                      h('button', { 'aria-label': 'Next Question',
                        onClick: function() {
                          var q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];
                          upd('quiz', { q: q.q, a: q.a, unit: q.unit, tol: q.tol || 0.01, answered: false, startTime: Date.now() });
                          stemBeep && stemBeep('click');
                        },
                        className: 'px-4 py-2 bg-cyan-700 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-all'
                      }, '\uD83D\uDD04 Next Question'),
                      !d.quiz.correct && h('button', { 'aria-label': 'Explain',
                        onClick: askTutor,
                        className: 'px-4 py-2 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-200 transition-all'
                      }, '\uD83E\uDDE0 Explain')
                    )
                  )
            )

          ),

          // ═══ TAB: WORD PROBLEM ═══
          tab === 'wordproblem' && h('div', { key: 'wp' },

            h('div', { className: 'flex items-center justify-between mb-3' },
              h('p', { className: 'text-sm text-slate-600' }, 'AI generates a real-world word problem for ' + (cat.label.replace(/[^\w\s]/g, '').trim()) + '.'),
              h('button', { disabled: !!d.loadingWP,
                onClick: function() {
                  if (d.loadingWP) return;
                  upd('loadingWP', true);
                  upd('wordProblem', null);
                  var catLabel = cat.label.replace(/[^\w\s]/g, '').trim();
                  var unitList = Object.keys(cat.units).join(', ');
                  var prompt = 'Create a short, engaging, grade 5-8 math word problem about ' + catLabel + ' unit conversion. ' +
                    'Use a fun real-world context (sports, cooking, travel, science, nature). ' +
                    'The student must convert between two of these units: ' + unitList + '. ' +
                    'Provide step-by-step solution. Format exactly:\nPROBLEM: [problem text]\nSOLUTION:\n[step 1]\n[step 2]\nANSWER: [final answer with unit]';
                  callGemini(prompt, { temperature: 0.8, maxTokens: 300 }).then(function(resp) {
                    upd('wordProblem', resp);
                    upd('loadingWP', false);
                    awardStemXP && awardStemXP(2);
                    checkBadges({ wordProblem: true });
                  }).catch(function() {
                    upd('loadingWP', false);
                    addToast('Could not generate problem. Try again.', 'error');
                  });
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold transition-all ' + (d.loadingWP ? 'bg-slate-200 text-slate-600 cursor-not-allowed' : 'bg-cyan-700 text-white hover:bg-cyan-700')
              }, d.loadingWP ? '\u23F3 Generating...' : '\u2728 Generate')
            ),

            d.loadingWP && h('div', { className: 'text-center py-12' },
              h('div', { className: 'inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full', style: { animation: 'spin 1s linear infinite' } }),
              h('p', { className: 'text-sm text-slate-600 mt-3' }, 'Crafting your word problem...')
            ),

            !d.wordProblem && !d.loadingWP && h('div', { className: 'text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200' },
              h('p', { className: 'text-4xl mb-3' }, '\uD83D\uDCDD'),
              h('p', { className: 'text-sm font-bold text-slate-600' }, 'Click Generate for an AI-crafted word problem'),
              h('p', { className: 'text-xs text-slate-600 mt-1' }, 'Category: ' + cat.label)
            ),

            d.wordProblem && h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-5 shadow-sm animate-in fade-in duration-300' },
              d.wordProblem.split('\n').filter(function(line) { return line.trim(); }).map(function(line, i) {
                var bold = line.startsWith('PROBLEM:') || line.startsWith('SOLUTION') || line.startsWith('ANSWER:');
                return h('p', { key: i, className: 'mb-2 text-sm ' + (bold ? 'font-bold text-cyan-800' : 'text-slate-700') }, line);
              }),
              h('div', { className: 'mt-4 flex gap-2' },
                h('button', { 'aria-label': 'New Problem',
                  disabled: !!d.loadingWP,
                  onClick: function() {
                    if (d.loadingWP) return;
                    upd('loadingWP', true);
                    upd('wordProblem', null);
                    var catLabel = cat.label.replace(/[^\w\s]/g, '').trim();
                    var unitList = Object.keys(cat.units).join(', ');
                    var prompt = 'Create a short, engaging, grade 5-8 math word problem about ' + catLabel + ' unit conversion. ' +
                      'Use a fun real-world context (sports, cooking, travel, science, nature). ' +
                      'The student must convert between two of these units: ' + unitList + '. ' +
                      'Provide step-by-step solution. Format exactly:\nPROBLEM: [problem text]\nSOLUTION:\n[step 1]\n[step 2]\nANSWER: [final answer with unit]';
                    callGemini(prompt, { temperature: 0.8, maxTokens: 300 }).then(function(resp) {
                      upd('wordProblem', resp);
                      upd('loadingWP', false);
                      awardStemXP && awardStemXP(2);
                    }).catch(function() {
                      upd('loadingWP', false);
                      addToast('Could not generate. Try again.', 'error');
                    });
                  },
                  className: 'px-4 py-2 bg-cyan-50 text-cyan-600 rounded-lg text-xs font-bold hover:bg-cyan-100 transition-all'
                }, '\uD83D\uDD04 New Problem'),
                h('button', { 'aria-label': 'Save',
                  onClick: function() {
                    setToolSnapshots(function(prev) {
                      return prev.concat([{ id: 'ucwp-' + Date.now(), tool: 'unitConvert', label: 'Word Problem: ' + cat.label, data: { wordProblem: d.wordProblem }, timestamp: Date.now() }]);
                    });
                    addToast('\uD83D\uDCF8 Problem saved!', 'success');
                  },
                  className: 'px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all'
                }, '\uD83D\uDCBE Save')
              )
            )

          ),

          // ── Keyboard shortcuts legend ──
          h('div', { className: 'text-[11px] text-slate-600 text-center mt-3 space-x-3' },
            h('span', null, '1-4 Tabs'),
            h('span', null, 'N Next Quiz'),
            h('span', null, 'B Badges'),
            h('span', null, '? AI Tutor')
          )

        );
      })();
    }
  });

  console.log('[StemLab] stem_tool_unitconvert.js loaded');
})();