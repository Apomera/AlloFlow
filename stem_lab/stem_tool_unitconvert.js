window.StemLab = window.StemLab || { registerTool: function(){}, registerModule: function(){} };
(function() {
  'use strict';

  var _unitConvertWordProblemRequestId = 0;
  // â”€â”€ Reduced motion CSS (WCAG 2.3.3) â€” shared across all STEM Lab tools â”€â”€
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


  // â”€â”€ Sound effects (badge fanfare only â€” quiz uses ctx.beep) â”€â”€
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

  // â”€â”€ Badge definitions â”€â”€
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

  var UNIT_FACTORS = {
    length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, 'in': 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
    weight: { mg: 0.001, g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237, ton: 907184.74 },
    temperature: { '\u00B0C': 'C', '\u00B0F': 'F', K: 'K' },
    speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knots: 1852 / 3600 },
    volume: { mL: 0.001, L: 1, gal: 3.785411784, qt: 0.946352946, cup: 0.2365882365, 'fl oz': 0.0295735295625 },
    time: { sec: 1, min: 60, hr: 3600, day: 86400, week: 604800, year: 31536000 },
    area: { 'cm\u00B2': 0.0001, 'm\u00B2': 1, 'km\u00B2': 1000000, 'in\u00B2': 0.00064516, 'ft\u00B2': 0.09290304, acre: 4046.8564224 },
    pressure: { Pa: 1, kPa: 1000, bar: 100000, psi: 6894.757293168, atm: 101325 },
    energy: { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3600000 }
  };

  function validateTemperatureValue(value, unit) {
    var numericValue = Number(value);
    var minimums = { '°C': -273.15, '°F': -459.67, K: 0 };
    if (!Number.isFinite(numericValue) || !Object.prototype.hasOwnProperty.call(minimums, unit)) {
      return { valid: false, message: 'Enter a valid temperature.' };
    }
    if (numericValue < minimums[unit]) {
      return { valid: false, message: 'Temperatures cannot be below absolute zero (-273.15 °C, -459.67 °F, or 0 K).' };
    }
    return { valid: true, message: '' };
  }

  function formatTemperatureNumber(value) {
    if (!Number.isFinite(value)) return '';
    return parseFloat(value.toFixed(6)).toString();
  }

  function describeTemperatureConversion(value, from, to) {
    var check = validateTemperatureValue(value, from);
    if (!check.valid || !Object.prototype.hasOwnProperty.call(UNIT_FACTORS.temperature, to)) {
      return { valid: false, result: NaN, steps: [], message: check.message || 'Choose a valid temperature scale.' };
    }
    var numericValue = Number(value);
    var result = convertUnitValue(numericValue, from, to, 'temperature');
    var inputText = formatTemperatureNumber(numericValue);
    var resultText = formatTemperatureNumber(result);
    var celsius;

    if (from === to) {
      return {
        valid: true,
        result: result,
        steps: [inputText + ' ' + from + ' = ' + resultText + ' ' + to + ' (same scale)'],
        message: 'The scale did not change, so neither an offset nor a scale factor is needed.'
      };
    }

    var steps = [];
    if (from === '°C' && to === '°F') {
      steps.push(inputText + ' °C × 9/5 + 32 = ' + resultText + ' °F');
    } else if (from === '°F' && to === '°C') {
      steps.push('(' + inputText + ' °F − 32) × 5/9 = ' + resultText + ' °C');
    } else if (from === '°C' && to === 'K') {
      steps.push(inputText + ' °C + 273.15 = ' + resultText + ' K');
    } else if (from === 'K' && to === '°C') {
      steps.push(inputText + ' K − 273.15 = ' + resultText + ' °C');
    } else if (from === '°F' && to === 'K') {
      celsius = (numericValue - 32) * 5 / 9;
      steps.push('(' + inputText + ' °F − 32) × 5/9 = ' + formatTemperatureNumber(celsius) + ' °C');
      steps.push(formatTemperatureNumber(celsius) + ' °C + 273.15 = ' + resultText + ' K');
    } else if (from === 'K' && to === '°F') {
      celsius = numericValue - 273.15;
      steps.push(inputText + ' K − 273.15 = ' + formatTemperatureNumber(celsius) + ' °C');
      steps.push(formatTemperatureNumber(celsius) + ' °C × 9/5 + 32 = ' + resultText + ' °F');
    }

    return {
      valid: true,
      result: result,
      steps: steps,
      message: 'Temperature scales have different zero points, so the conversion needs an offset as well as a scale factor.'
    };
  }

  function convertUnitValue(value, from, to, category) {
    var numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return NaN;
    if (category === 'temperature') {
      if (!Object.prototype.hasOwnProperty.call(UNIT_FACTORS.temperature, from) || !Object.prototype.hasOwnProperty.call(UNIT_FACTORS.temperature, to)) return NaN;
      if (!validateTemperatureValue(numericValue, from).valid) return NaN;
      if (from === to) return numericValue;
      var celsius = from === '\u00B0C' ? numericValue : from === '\u00B0F' ? (numericValue - 32) * 5 / 9 : numericValue - 273.15;
      return to === '\u00B0C' ? celsius : to === '\u00B0F' ? celsius * 9 / 5 + 32 : celsius + 273.15;
    }
    var units = UNIT_FACTORS[category];
    if (!units || !Object.prototype.hasOwnProperty.call(units, from) || !Object.prototype.hasOwnProperty.call(units, to)) return NaN;
    return numericValue * units[from] / units[to];
  }

  function formatUnitNumber(value, significantFigures) {
    var numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '—';
    var sig = Number(significantFigures);
    if (Number.isInteger(sig) && sig >= 2 && sig <= 6) return numericValue.toPrecision(sig);
    if (Math.abs(numericValue) < 0.001 && numericValue !== 0) return numericValue.toExponential(4);
    return parseFloat(numericValue.toFixed(6)).toString();
  }

  function cleanWordProblemText(value, maximumLength) {
    var cleaned = String(value == null ? '' : value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/[*_#>]/g, ' ')
      .split(String.fromCharCode(96)).join(' ')
      .trim();
    return cleaned.split(' ').filter(Boolean).join(' ').slice(0, maximumLength);
  }

  function buildVerifiedPracticeHints(category, from, to) {
    if (category === 'temperature') {
      return [
        'Temperature scales have different zero points, so a single conversion ratio is not enough.',
        'Identify the scale change and the zero-point offset, then apply them in the correct order.'
      ];
    }
    return [
      'Arrange a conversion factor so ' + from + ' cancels and ' + to + ' remains.',
      'Compare each unit to the category base unit, then multiply the two conversion ratios.'
    ];
  }

  function buildVerifiedConversionExplanation(value, from, to, category, result) {
    if (category === 'temperature') {
      var reasoning = describeTemperatureConversion(value, from, to);
      return reasoning.steps.join(' Then ') + '.';
    }
    var factor = UNIT_FACTORS[category][from] / UNIT_FACTORS[category][to];
    return formatUnitNumber(value, 'auto') + ' ' + from + ' × ' + formatUnitNumber(factor, 'auto') + ' = ' + formatUnitNumber(result, 'auto') + ' ' + to + '.';
  }

  function parseWordProblemResponse(rawResponse, category, allowedUnits) {
    var units = UNIT_FACTORS[category];
    if (!units) return null;
    var fence = String.fromCharCode(96).repeat(3);
    var text = String(rawResponse == null ? '' : rawResponse)
      .split(fence).join('')
      .slice(0, 4000);
    var fields = {};
    var current = '';
    text.split(String.fromCharCode(10)).forEach(function(line) {
      var match = line.match(/^ *(CONTEXT|INPUT_VALUE|FROM_UNIT|TO_UNIT|ANSWER_VALUE|ANSWER_UNIT) *: *(.*)$/i);
      if (match) {
        current = match[1].toUpperCase();
        fields[current] = match[2] || '';
      } else if (current && line.trim()) {
        fields[current] += ' ' + line.trim();
      }
    });

    var context = cleanWordProblemText(fields.CONTEXT, 320);
    var inputValue = Number(String(fields.INPUT_VALUE || '').replace(/,/g, '').trim());
    var fromUnit = cleanWordProblemText(fields.FROM_UNIT, 24);
    var toUnit = cleanWordProblemText(fields.TO_UNIT, 24);
    var reportedAnswer = Number(String(fields.ANSWER_VALUE || '').replace(/,/g, '').trim());
    var answerUnit = cleanWordProblemText(fields.ANSWER_UNIT, 24);
    var permitted = Array.isArray(allowedUnits) && allowedUnits.length ? allowedUnits : Object.keys(units);

    if (!context || /[0-9]/.test(context) || !Number.isFinite(inputValue) || !Number.isFinite(reportedAnswer)) return null;
    if (fromUnit === toUnit || permitted.indexOf(fromUnit) === -1 || permitted.indexOf(toUnit) === -1) return null;
    if (!Object.prototype.hasOwnProperty.call(units, fromUnit) || !Object.prototype.hasOwnProperty.call(units, toUnit)) return null;
    if (answerUnit !== toUnit) return null;

    var verifiedAnswer = convertUnitValue(inputValue, fromUnit, toUnit, category);
    if (!Number.isFinite(verifiedAnswer)) return null;
    var verificationTolerance = Math.max(0.001, Math.abs(verifiedAnswer) * 0.001);
    if (Math.abs(reportedAnswer - verifiedAnswer) > verificationTolerance) return null;

    return {
      source: 'ai',
      verified: true,
      context: context,
      inputValue: inputValue,
      fromUnit: fromUnit,
      toUnit: toUnit,
      problem: context + ' The measurement is ' + formatUnitNumber(inputValue, 'auto') + ' ' + fromUnit + '. What is this value in ' + toUnit + '?',
      hints: buildVerifiedPracticeHints(category, fromUnit, toUnit),
      answer: verifiedAnswer,
      unit: toUnit,
      explanation: buildVerifiedConversionExplanation(inputValue, fromUnit, toUnit, category, verifiedAnswer)
    };
  }

  function makeOfflineWordProblem(category, from, to) {
    var safeCategory = Object.prototype.hasOwnProperty.call(UNIT_FACTORS, category) ? category : 'length';
    var units = Object.keys(UNIT_FACTORS[safeCategory]);
    var safeFrom = units.indexOf(from) >= 0 ? from : units[0];
    var safeTo = units.indexOf(to) >= 0 && to !== safeFrom ? to : (units.find(function(unit) { return unit !== safeFrom; }) || safeFrom);
    var amounts = { length: 3, weight: 2, temperature: 20, speed: 60, volume: 2, time: 3, area: 2, pressure: 2, energy: 5 };
    var amount = amounts[safeCategory] || 2;
    if (safeCategory === 'temperature') {
      if (safeFrom === '°F') amount = 68;
      else if (safeFrom === 'K') amount = 293.15;
    }
    var answer = convertUnitValue(amount, safeFrom, safeTo, safeCategory);
    var contexts = {
      length: 'A design team is measuring material for a model.',
      weight: 'A science class is measuring the mass of a sample.',
      temperature: 'A weather station is comparing temperature scales.',
      speed: 'A robotics team is checking a vehicle speed.',
      volume: 'A kitchen lab is measuring a liquid.',
      time: 'A space mission is planning an activity.',
      area: 'A garden team is measuring a plot.',
      pressure: 'An engineering team is checking a pressure reading.',
      energy: 'A sustainability team is tracking energy use.'
    };
    var context = contexts[safeCategory] || contexts.length;
    return {
      source: 'offline',
      verified: true,
      context: context,
      inputValue: amount,
      fromUnit: safeFrom,
      toUnit: safeTo,
      problem: context + ' The measurement is ' + amount + ' ' + safeFrom + '. What is this value in ' + safeTo + '?',
      hints: buildVerifiedPracticeHints(safeCategory, safeFrom, safeTo),
      answer: answer,
      unit: safeTo,
      explanation: buildVerifiedConversionExplanation(amount, safeFrom, safeTo, safeCategory, answer)
    };
  }
  function diagnosePracticeAnswer(answer, expected, unit) {
    if (!Number.isFinite(answer)) return 'Enter a valid number before checking your answer.';
    var inverse = expected === 0 ? NaN : 1 / expected;
    if (Number.isFinite(inverse) && Math.abs(answer - inverse) <= Math.max(0.01, Math.abs(inverse) * 0.02)) {
      return 'The conversion ratio may be reversed. Flip it so the starting unit cancels.';
    }
    var slip = null;
    [10, 100, 1000, 0.1, 0.01, 0.001].forEach(function(factor) {
      if (slip === null && expected !== 0 && Math.abs(answer / expected - factor) <= Math.abs(factor) * 0.02) slip = factor;
    });
    if (slip !== null) return 'Check the decimal place or metric prefix before trying again.';
    if (unit === '°F' || unit === '°C' || unit === 'K') {
      return 'Remember that temperature conversions use an offset as well as a scale factor.';
    }
    return 'Not yet. Check that the starting unit cancels and the requested unit remains.';
  }

  function evaluateNumericAnswer(rawAnswer, expected, absoluteTolerance) {
    var rawText = rawAnswer === null || rawAnswer === undefined ? '' : String(rawAnswer).trim();
    var answer = rawText === '' ? NaN : Number(rawText);
    var target = Number(expected);
    var tolerance = Math.max(0, Number(absoluteTolerance) || 0.01);
    if (!Number.isFinite(answer) || !Number.isFinite(target)) return { valid: false, correct: false, answer: answer, expected: target, tolerance: tolerance, error: NaN };
    var error = Math.abs(answer - target);
    return { valid: true, correct: error <= tolerance, answer: answer, expected: target, tolerance: tolerance, error: error };
  }

  function diagnoseNumericAnswer(answer, expected, unit, tolerance) {
    if (!Number.isFinite(answer)) return 'Enter a valid number before checking your answer.';
    var inverse = expected === 0 ? NaN : 1 / expected;
    if (Number.isFinite(inverse) && Math.abs(answer - inverse) <= Math.max(0.01, Math.abs(inverse) * 0.02)) {
      return 'The ratio is reversed. Flip the conversion factor so the starting unit cancels. The answer is ' + expected + ' ' + unit + '.';
    }
    var slip = null;
    [10, 100, 1000, 0.1, 0.01, 0.001].forEach(function(factor) {
      if (slip === null && expected !== 0 && Math.abs(answer / expected - factor) <= Math.abs(factor) * 0.02) slip = factor;
    });
    if (slip !== null) return 'The answer is off by ' + (slip >= 1 ? slip : '1/' + Math.round(1 / slip)) + ', which suggests a decimal-place or metric-prefix slip. The answer is ' + expected + ' ' + unit + '.';
    if (unit === '\u00B0F' || unit === '\u00B0C' || unit === 'K') return 'Temperature uses an offset as well as a scale factor, so a simple ratio will not work. The answer is ' + expected + ' ' + unit + '.';
    return 'Set up a conversion factor so the starting unit cancels and the requested unit remains. The answer is ' + expected + ' ' + unit + '.';
  }

  window.__UnitConvertCore = Object.assign({}, window.__UnitConvertCore || {}, {
    factors: UNIT_FACTORS,
    validateTemperatureValue: validateTemperatureValue,
    describeTemperatureConversion: describeTemperatureConversion,
    convertUnitValue: convertUnitValue,
    formatUnitNumber: formatUnitNumber,
    parseWordProblemResponse: parseWordProblemResponse,
    makeOfflineWordProblem: makeOfflineWordProblem,
    diagnosePracticeAnswer: diagnosePracticeAnswer,
    evaluateNumericAnswer: evaluateNumericAnswer,
    diagnoseNumericAnswer: diagnoseNumericAnswer
  });

  window.StemLab.registerTool('unitConvert', {
    icon: '\uD83D\uDCCF',
    label: 'Unit Converter',
    desc: 'Convert units with visual comparison, quiz, AI word problems, badges & keyboard shortcuts',
    color: 'cyan',
    category: 'math',
    questHooks: [
      { id: 'explore_4_categories', label: 'Convert in 4 different unit categories', icon: 'ðŸŒ', check: function(d) { return Object.keys(d.catsUsed || {}).length >= 4; }, progress: function(d) { return Object.keys(d.catsUsed || {}).length + '/4 categories'; } },
      { id: 'quiz_10', label: 'Answer 10 quiz questions', icon: 'ðŸ§ ', check: function(d) { return (d.quizTotal || 0) >= 10; }, progress: function(d) { return (d.quizTotal || 0) + '/10 answered'; } },
      { id: 'streak_5', label: 'Reach a 5-answer streak', icon: 'ðŸ”¥', check: function(d) { return (d.bestStreak || 0) >= 5; }, progress: function(d) { return 'best ' + (d.bestStreak || 0) + '/5'; } }
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
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var setToolSnapshots = ctx.setToolSnapshots;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;

      return (function() {
        var d = Object.assign({}, labToolData.unitConvert || {});

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, typeof key === 'object' ? key : { [key]: val }) });
          });
        };

        // â”€â”€ CATEGORIES â”€â”€
        var CATEGORIES = {
          length:      { label: t('stem.unitconvert.length', '\uD83D\uDCCF Length'), units: UNIT_FACTORS.length },
          weight:      { label: t('stem.unitconvert.weight', '\u2696\uFE0F Mass'), units: UNIT_FACTORS.weight },
          temperature: { label: t('stem.unitconvert.temp', '\uD83C\uDF21\uFE0F Temp'), units: UNIT_FACTORS.temperature },
          speed:       { label: t('stem.unitconvert.speed', '\uD83D\uDE80 Speed'), units: UNIT_FACTORS.speed },
          volume:      { label: t('stem.unitconvert.volume', '\uD83E\uDDEA Volume'), units: UNIT_FACTORS.volume },
          time:        { label: t('stem.unitconvert.time', '\u23F0 Time'), units: UNIT_FACTORS.time },
          area:        { label: t('stem.unitconvert.area', '\uD83D\uDDD2\uFE0F Area'), units: UNIT_FACTORS.area },
          pressure:    { label: t('stem.unitconvert.pressure', '\uD83D\uDCA8 Pressure'), units: UNIT_FACTORS.pressure },
          energy:      { label: t('stem.unitconvert.energy', '\u26A1 Energy'), units: UNIT_FACTORS.energy }
        };

        d.category = CATEGORIES[d.category] ? d.category : 'length';
        var cat = CATEGORIES[d.category];
        var validUnits = Object.keys(cat.units);
        d.value = Number.isFinite(Number(d.value)) ? Number(d.value) : 1;
        d.fromUnit = Object.prototype.hasOwnProperty.call(cat.units, d.fromUnit) ? d.fromUnit : validUnits[0];
        d.toUnit = Object.prototype.hasOwnProperty.call(cat.units, d.toUnit) ? d.toUnit : (validUnits[1] || validUnits[0]);

        // â”€â”€ CONVERSION â”€â”€
        var convert = function(val, from, to, catKey) {
          return convertUnitValue(val, from, to, catKey || d.category);
        };

        var significantFigures = d.significantFigures || 'auto';
        var fmt = function(n) {
          return formatUnitNumber(n, significantFigures);
        };

        var temperatureCheck = d.category === 'temperature'
          ? validateTemperatureValue(d.value, d.fromUnit)
          : { valid: true, message: '' };
        var result = convert(d.value, d.fromUnit, d.toUnit);
        var fmtResult = Number.isFinite(result) ? fmt(result) : '—';
        var temperatureReasoning = d.category === 'temperature' && temperatureCheck.valid
          ? describeTemperatureConversion(d.value, d.fromUnit, d.toUnit)
          : null;

        // â”€â”€ FORMULA â”€â”€
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

        // â”€â”€ REAL-WORLD REFERENCES â”€â”€
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

        // â”€â”€ FUN FACTS â”€â”€
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

        // â”€â”€ QUIZ QUESTIONS â”€â”€
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

        // â”€â”€ Badge state â”€â”€
        var badges = d.badges || {};
        var showBadges = d.showBadges || false;
        var showTutor = d.showTutor || false;
        var tutorResponse = d.tutorResponse || '';
        var tutorLoading = d.tutorLoading || false;
        var catsUsed = d.catsUsed || {};
        var tempUnitsUsed = d.tempUnitsUsed || {};
        var quizTotal = d.quizTotal || 0;
        var historySaveCount = d.historySaveCount || 0;
        var wordProblem = d.wordProblem && typeof d.wordProblem === 'object' ? d.wordProblem : null;

        // â”€â”€ Badge checker â”€â”€
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
                addToast(badge.icon + t('stem.unitconvert.badge_toast', ' Badge: ') + t('stem.unitconvert.badge_' + badge.id, badge.label) + '!', 'success');
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

        // â”€â”€ AI Tutor â”€â”€
        function askTutor() {
          if (tutorLoading) return;
          if (!temperatureCheck.valid) {
            addToast(temperatureCheck.message, 'error');
            if (typeof announceToSR === 'function') announceToSR(temperatureCheck.message);
            return;
          }
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

        function useOfflineWordProblem(notice, request) {
          if (request && request.id !== _unitConvertWordProblemRequestId) return;
          var requestCategory = request ? request.category : d.category;
          var requestFrom = request ? request.fromUnit : d.fromUnit;
          var requestTo = request ? request.toUnit : d.toUnit;
          var fallback = makeOfflineWordProblem(requestCategory, requestFrom, requestTo);
          upd({
            wordProblem: fallback,
            loadingWP: false,
            wordProblemAttempt: '',
            wordProblemFeedback: notice || '',
            wordProblemSolved: false,
            wordProblemRevealed: false,
            wordProblemHintLevel: 0
          });
          if (notice && addToast) addToast(notice, 'info');
          if (typeof announceToSR === 'function') announceToSR('Offline practice problem ready. Math verified locally.');
        }

        function generateWordProblem() {
          if (d.loadingWP) return;
          var request = {
            id: ++_unitConvertWordProblemRequestId,
            category: d.category,
            fromUnit: d.fromUnit,
            toUnit: d.toUnit,
            unitList: Object.keys(cat.units),
            categoryLabel: cat.label.replace(/[^A-Za-z0-9 ]/g, '').trim()
          };
          upd({
            loadingWP: true,
            wordProblem: null,
            wordProblemAttempt: '',
            wordProblemFeedback: '',
            wordProblemSolved: false,
            wordProblemRevealed: false,
            wordProblemHintLevel: 0
          });

          if (typeof callGemini !== 'function') {
            useOfflineWordProblem(t('stem.unitconvert.offline_problem_ready', 'AI is unavailable, so an offline practice problem is ready.'), request);
            return;
          }

          var prompt = [
            'Create one safe, engaging grade 5-8 real-world context for a unit-conversion practice problem.',
            'Category: ' + request.categoryLabel + '. Allowed units: ' + request.unitList.join(', ') + '.',
            'Choose two different allowed units and a physically valid finite input value.',
            'CONTEXT must be one short sentence with no numbers, unit symbols, answer, or calculation instructions.',
            'Compute the conversion carefully. ANSWER_VALUE must be a finite decimal number with at least six significant digits when needed.',
            'ANSWER_UNIT must exactly equal TO_UNIT, and all unit fields must exactly match an allowed unit.',
            'Return exactly these six labeled lines with no markdown or extra text:',
            'CONTEXT: [safe scenario only]',
            'INPUT_VALUE: [number only]',
            'FROM_UNIT: [one allowed unit]',
            'TO_UNIT: [a different allowed unit]',
            'ANSWER_VALUE: [number only]',
            'ANSWER_UNIT: [must exactly equal TO_UNIT]'
          ].join(String.fromCharCode(10));

          Promise.resolve().then(function() {
            return callGemini(prompt, false, false, 0.7);
          }).then(function(response) {
            if (request.id !== _unitConvertWordProblemRequestId) return;
            var raw = typeof response === 'string'
              ? response
              : ((response && (response.text || response.output || response.response)) || '');
            var parsed = parseWordProblemResponse(raw, request.category, request.unitList);
            if (!parsed) {
              useOfflineWordProblem(t('stem.unitconvert.ai_problem_invalid', 'The AI problem could not be verified, so an offline practice problem is ready.'), request);
              return;
            }
            upd({
              wordProblem: parsed,
              loadingWP: false,
              wordProblemAttempt: '',
              wordProblemFeedback: '',
              wordProblemSolved: false,
              wordProblemRevealed: false,
              wordProblemHintLevel: 0
            });
            awardStemXP && awardStemXP('unitConvert', 2, 'word problem');
            checkBadges({ wordProblem: true });
            if (typeof announceToSR === 'function') announceToSR('New word problem ready. The answer is hidden and the math is verified locally.');
          }).catch(function() {
            useOfflineWordProblem(t('stem.unitconvert.offline_problem_ready', 'AI is unavailable, so an offline practice problem is ready.'), request);
          });
        }
        function gradeWordProblemAttempt() {
          if (!wordProblem || d.wordProblemSolved) return;
          var tolerance = Math.max(0.01, Math.abs(wordProblem.answer) * 0.005);
          var evaluation = evaluateNumericAnswer(d.wordProblemAttempt, wordProblem.answer, tolerance);
          if (!evaluation.valid) {
            upd('wordProblemFeedback', t('stem.unitconvert.enter_valid_attempt', 'Enter a valid number before checking your answer.'));
            return;
          }
          if (evaluation.correct) {
            var success = t('stem.unitconvert.word_problem_correct', 'Correct! Your conversion and unit match.');
            upd({ wordProblemSolved: true, wordProblemFeedback: success });
            stemBeep && stemBeep(784, 0.12);
            awardStemXP && awardStemXP('unitConvert', 3, 'word problem solved');
            if (typeof announceToSR === 'function') announceToSR(success);
            return;
          }
          var feedback = diagnosePracticeAnswer(evaluation.answer, wordProblem.answer, wordProblem.unit);
          upd('wordProblemFeedback', feedback);
          if (typeof announceToSR === 'function') announceToSR(feedback);
        }

        function showNextWordProblemHint() {
          if (!wordProblem) return;
          var nextLevel = Math.min(2, (d.wordProblemHintLevel || 0) + 1);
          upd('wordProblemHintLevel', nextLevel);
          var hint = wordProblem.hints[nextLevel - 1];
          if (hint && typeof announceToSR === 'function') announceToSR('Hint ' + nextLevel + ': ' + hint);
        }

        function revealWordProblemAnswer() {
          if (!wordProblem) return;
          upd({ wordProblemRevealed: true, wordProblemHintLevel: 2 });
          if (typeof announceToSR === 'function') {
            announceToSR('Answer revealed: ' + fmt(wordProblem.answer) + ' ' + wordProblem.unit + '.');
          }
        }

        function startQuizQuestion() {
          var question = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];
          upd({ quiz: { q: question.q, a: question.a, unit: question.unit, tol: question.tol || 0.01, answered: false, startTime: Date.now() }, quizDraft: '', quizDraftError: '' });
          stemBeep && stemBeep(600, 0.06);
        }

        function gradeQuizAnswer(rawAnswer) {
          if (!d.quiz || d.quiz.answered) return;
          var evaluation = evaluateNumericAnswer(rawAnswer, d.quiz.a, d.quiz.tol || 0.01);
          if (!evaluation.valid) {
            var inputMessage = 'Enter a valid number before checking your answer.';
            upd('quizDraftError', inputMessage);
            if (typeof announceToSR === 'function') announceToSR(inputMessage);
            return;
          }

          var answer = evaluation.answer;
          var correct = evaluation.correct;
          var feedback = correct ? '' : diagnoseNumericAnswer(answer, d.quiz.a, d.quiz.unit, evaluation.tolerance);
          var elapsed = d.quiz.startTime ? (Date.now() - d.quiz.startTime) / 1000 : 0;
          var xp = correct ? (elapsed < 5 ? 3 : elapsed < 10 ? 2 : 1) : 0;
          var newStreak = correct ? (d.streak || 0) + 1 : 0;
          var newBest = Math.max(d.bestStreak || 0, newStreak);
          var newQTotal = quizTotal + 1;

          if (correct) {
            stemBeep && stemBeep(784, 0.15);
            if (newStreak >= 5) { stemCelebrate && stemCelebrate(); }
            awardStemXP && awardStemXP('unitConvert', xp, 'quiz correct');
            addToast(xp === 3 ? '\u26A1 Lightning fast! +3 XP' : xp === 2 ? '\uD83D\uDE80 Quick! +2 XP' : '\u2705 Correct! +1 XP', 'success');
            if (typeof announceToSR === 'function') announceToSR('Correct. The answer is ' + d.quiz.a + ' ' + d.quiz.unit + '.');
          } else {
            stemBeep && stemBeep(220, 0.2);
            if (typeof announceToSR === 'function') announceToSR('Not quite. ' + feedback);
            addToast('Not quite - see why below', 'error');
          }

          setLabToolData(function(prev) {
            var previous = prev.unitConvert || {};
            return Object.assign({}, prev, { unitConvert: Object.assign({}, previous, {
              score: (previous.score || 0) + xp,
              streak: newStreak,
              bestStreak: newBest,
              quizTotal: newQTotal,
              quizDraftError: '',
              quiz: Object.assign({}, previous.quiz, { answered: true, userAns: answer, correct: correct, xp: xp, elapsed: elapsed.toFixed(1), fb: feedback })
            }) });
          });
          checkBadges({
            quizStreak5: correct && newStreak >= 5,
            quizStreak10: correct && newStreak >= 10,
            speedster: correct && elapsed < 3,
            quizMaster: newQTotal >= 20
          });
        }

        // â”€â”€ Keyboard shortcuts (no hooks â€” plain render function) â”€â”€
        function handleKey(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
          var key = e.key;
          if (key === '1') { e.preventDefault(); upd('tab', 'convert'); }
          if (key === '2') { e.preventDefault(); upd('tab', 'table'); }
          if (key === '3') { e.preventDefault(); upd('tab', 'quiz'); }
          if (key === '4') { e.preventDefault(); upd('tab', 'wordproblem'); }
          if (key.toLowerCase() === 'n' && tab === 'quiz') {
            e.preventDefault();
            startQuizQuestion();
          }
          if (key === '?' || (e.shiftKey && key === '/')) { e.preventDefault(); askTutor(); }
          if (key.toLowerCase() === 'b') { e.preventDefault(); upd('showBadges', !showBadges); }
        }

        // â”€â”€ Earned badges count â”€â”€
        var earnedBadges = BADGES.filter(function(b) { return badges[b.id]; });
        var earnedCount = earnedBadges.length;
        var tabLabel = { convert: 'Convert', table: 'All units', quiz: 'Quiz', wordproblem: 'Word problem', magHunt: 'Magnitude' }[tab] || 'Convert';
        var unitNext = tab === 'convert' && historySaveCount === 0
          ? 'Choose compatible units, estimate the scale, then save one conversion.'
          : tab === 'table'
            ? 'Compare units in one category and identify the base-unit relationship.'
            : tab === 'quiz'
              ? 'Solve with a conversion factor and check that unwanted units cancel.'
              : tab === 'wordproblem'
                ? 'Underline the given unit and target unit before calculating.'
                : 'Use powers of ten to explain the size difference between scales.';

        // â”€â”€ CSS ANIMATIONS â”€â”€
        var css = '@keyframes ucResultPop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}' +
          '@keyframes ucCorrect{0%{background:#dcfce7}50%{background:#86efac}100%{background:#dcfce7}}' +
          '@keyframes ucWrong{0%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}100%{transform:translateX(0)}}' +
          '@keyframes ucFactSlide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}' +
          '@keyframes spin{to{transform:rotate(360deg)}}';

        // â”€â”€ RENDER â”€â”€
        return h('div', { className: 'max-w-5xl mx-auto animate-in fade-in duration-200 outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1', onKeyDown: handleKey, tabIndex: -1 },

          h('style', null, css),

          // Header
          h('section', { 'data-unitconvert-command': 'true', className: 'mb-4 overflow-hidden rounded-2xl border border-teal-300/40 bg-gradient-to-br from-slate-950 via-teal-950 to-cyan-950 text-white shadow-xl' },
            h('div', { className: 'p-4 sm:p-5' },
              h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
                h('div', { className: 'min-w-0' },
                  h('div', { className: 'flex flex-wrap items-center gap-2' },
                    h('button', { onClick: function() { setStemLabTool(null); }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-teal-300', 'aria-label': t('stem.unitconvert.back', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
                    h('span', { className: 'rounded-full bg-teal-300/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-teal-100 ring-1 ring-teal-200/30' }, 'Measurement workbench'),
                    earnedCount > 0 && h('button', { onClick: function() { upd('showBadges', !showBadges); }, className: 'rounded-full border border-amber-300/40 bg-amber-300/15 px-2.5 py-1 text-[10px] font-bold text-amber-100', title: t('stem.unitconvert.view_badges_b', 'View badges (B)') }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
                    h('button', { onClick: askTutor, 'aria-label': tutorLoading ? 'AI Tutor thinking' : 'Ask AI Tutor', 'aria-busy': !!tutorLoading, className: 'rounded-full border border-violet-300/40 bg-violet-300/15 px-2.5 py-1 text-[10px] font-bold text-violet-100' }, t('stem.unitconvert.ai', '\uD83E\uDDE0 AI'))
                  ),
                  h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, t('stem.unitconvert.unit_converter', '\uD83D\uDCCF Unit Converter')),
                  h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-teal-100' }, 'Preserve the quantity while changing its unit, and verify every step through dimensional reasoning.'),
                  h('div', { className: 'mt-3 rounded-xl border border-white/15 bg-white/10 p-3' },
                    h('p', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-teal-200' }, 'Recommended next move'),
                    h('p', { className: 'mt-1 text-sm font-semibold text-white' }, unitNext)
                  )
                ),
                h('div', { className: 'grid grid-cols-3 gap-2 lg:w-[22rem]' },
                  [
                    { label: 'Focus', value: tabLabel },
                    { label: 'Category', value: cat.label },
                    { label: 'Saved', value: String(historySaveCount) }
                  ].map(function(metric) {
                    return h('div', { key: metric.label, className: 'min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center' },
                      h('div', { className: 'truncate text-sm font-black text-white', title: metric.value }, metric.value),
                      h('div', { className: 'mt-1 text-[10px] font-bold uppercase tracking-wider text-teal-200' }, metric.label)
                    );
                  })
                )
              ),
              h('ol', { className: 'mt-4 grid gap-2 text-xs sm:grid-cols-3', 'aria-label': 'Unit conversion reasoning pathway' },
                [
                  { n: '1', title: 'Select', detail: 'Name the given and target units.' },
                  { n: '2', title: 'Convert', detail: 'Apply a factor equal to one.' },
                  { n: '3', title: 'Verify', detail: 'Check units, scale, and context.' }
                ].map(function(step) {
                  return h('li', { key: step.n, className: 'flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5' },
                    h('span', { className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-300 font-black text-slate-950' }, step.n),
                    h('span', null, h('strong', { className: 'block text-white' }, step.title), h('span', { className: 'text-teal-200' }, step.detail))
                  );
                })
              )
            )
          ),

          // â”€â”€ Badge panel â”€â”€
          showBadges && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200 mb-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 Badges (' + earnedCount + '/' + BADGES.length + ')'),
              h('button', { onClick: function() { upd('showBadges', false); }, className: 'transition-colors text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
            ),
            h('div', { className: 'grid grid-cols-3 sm:grid-cols-5 gap-2' },
              BADGES.map(function(badge) {
                var earned = !!badges[badge.id];
                return h('div', {
                  key: badge.id,
                  className: 'text-center p-2 rounded-lg border transition-all ' +
                    (earned ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'),
                  title: t('stem.unitconvert.badgedesc_' + badge.id, badge.desc)
                },
                  h('div', { className: 'text-xl' }, earned ? badge.icon : '\uD83D\uDD12'),
                  h('div', { className: 'text-[11px] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-600') }, t('stem.unitconvert.badge_' + badge.id, badge.label))
                );
              })
            )
          ),

          // â”€â”€ AI Tutor panel â”€â”€
          showTutor && h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200 mb-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-sm font-bold text-purple-800' }, t('stem.unitconvert.ai_unit_tutor', '\uD83E\uDDE0 AI Unit Tutor')),
              h('button', { 'aria-label': t('stem.unitconvert.ask_tutor', 'Ask Tutor'), onClick: function() { upd('showTutor', false); }, className: 'transition-colors text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
            ),
            tutorLoading
              ? h('div', { className: 'flex items-center gap-2' },
                  h('div', { className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' }),
                  h('span', { className: 'text-xs text-purple-600' }, 'Thinking...')
                )
              : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, tutorResponse),
            !tutorLoading && h('button', { 'aria-label': t('stem.unitconvert.ask_again', 'Ask Again'),
              onClick: askTutor,
              className: 'mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-600 transition-all active:scale-[0.97]'
            }, t('stem.unitconvert.ask_again_2', '\uD83D\uDD04 Ask Again'))
          ),

          // Category selector
          h('div', { className: 'mb-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm' },
            h('div', { className: 'grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5', role: 'group', 'aria-label': 'Measurement categories' },
            Object.entries(CATEGORIES).map(function(e) {
              var k = e[0], v = e[1];
              return h('button', { key: k,
                onClick: function() {
                  var units = Object.keys(v.units);
                  _unitConvertWordProblemRequestId += 1;
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, {
                      category: k,
                      fromUnit: units[0],
                      toUnit: units[1] || units[0],
                      loadingWP: false,
                      wordProblem: null,
                      wordProblemFeedback: '',
                      wordProblemHintLevel: 0
                    }) });
                  });
                  trackCategory(k);
                  checkBadges({ firstConvert: true });
                },
                className: 'min-h-[2.5rem] px-2.5 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ' + (d.category === k ? 'bg-cyan-700 text-white shadow-md' : 'transition-colors bg-slate-100 text-slate-700 hover:bg-cyan-50 active:scale-[0.97]')
              }, v.label);
            })
            )
          ),

          // Tool tabs
          h('div', { className: 'flex gap-0 mb-3 overflow-x-auto border-b border-slate-200', role: 'tablist', 'aria-label': t('stem.unitconvert.unit_converter_sections', 'Unit Converter sections') },
            [['convert', '\uD83D\uDD04 Convert'], ['table', '\uD83D\uDCCA All Units'], ['quiz', '\uD83E\uDDE0 Quiz'], ['wordproblem', '\uD83D\uDCDD Word Problem'], ['magHunt', '\u2699\uFE0F Magnitude']].map(function(item, idx) {
              return h('button', { key: item[0],
                onClick: function() { upd('tab', item[0]); },
                role: 'tab', 'aria-selected': tab === item[0],
                className: 'min-h-[2.5rem] whitespace-nowrap px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ' + (tab === item[0] ? 'border-b-2 border-cyan-600 text-cyan-700 -mb-px' : 'transition-colors text-slate-600 hover:text-slate-700'),
                title: (idx + 1) + ' key'
              }, item[1]);
            })
          ),

          // â”€â”€ Topic-accent hero band per tab â”€â”€
          (function() {
            var TAB_META = {
              convert:     { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: '\uD83D\uDD04', title: t('stem.unitconvert.convert_the_math_behind_units', 'Convert \u2014 the math behind units'),  hint: t('stem.unitconvert.conversion_factor_ratio_equal_to_1_e_g', 'Conversion factor = ratio equal to 1 (e.g., 1 ft = 12 in \u2192 12 in / 1 ft). Multiplying by it changes the unit without changing the value. SI prefixes (kilo, milli) are powers of 10 \u2014 just shift the decimal.') },
              table:       { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCCA', title: t('stem.unitconvert.all_units_reference_table', 'All units \u2014 reference table'),     hint: t('stem.unitconvert.length_mass_volume_temperature_time_en', 'Length, mass, volume, temperature, time, energy, pressure. The single rule that matters: track units through every step. If your final answer is in m\u00b2 when you wanted seconds, you made an error somewhere upstream.') },
              quiz:        { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83E\uDDE0', title: t('stem.unitconvert.quiz_conversion_practice', 'Quiz \u2014 conversion practice'),      hint: t('stem.unitconvert.daily_life_conversions_f_c_mph_km_h_lb', 'Daily-life conversions (\u00b0F\u2194\u00b0C, mph\u2194km/h, lb\u2194kg) plus AP / SAT / lab measurements. Each question shows the conversion factor after answering so you build the muscle memory.') },
              wordproblem: { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83D\uDCDD', title: t('stem.unitconvert.word_problem_apply_in_context', 'Word problem \u2014 apply in context'),  hint: t('stem.unitconvert.real_world_unit_conversion_scenarios_g', 'Real-world unit-conversion scenarios: gas mileage, recipe scaling, dosage calculations, travel-distance estimates. Word problems are 80% reading comprehension + 20% conversion math.') },
              magHunt:     { accent: '#0d9488', soft: 'rgba(13,148,136,0.10)', icon: '\u2699\uFE0F', title: t('stem.unitconvert.magnitude_orders_of_magnitude_discover', 'Magnitude \u2014 orders of magnitude discovery'), hint: t('stem.unitconvert.every_si_prefix_is_a_power_of_10_slide', 'Every SI prefix is a power of 10. Slide the source and target exponents to feel how far apart scales really are \u2014 the core skill behind scientific notation and Fermi estimates.') }
            };
            var meta = TAB_META[tab] || TAB_META.convert;
            return h('div', {
              style: {
                margin: '0 0 12px',
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
                h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
              )
            );
          })(),

          // â•â•â• TAB: CONVERT â•â•â•
          tab === 'convert' && h('div', { key: 'convert' },

            h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-6 shadow-sm' },

              h('div', { className: 'flex items-center gap-4 justify-center' },

                h('div', { className: 'text-center' },
                  h('input', {
                    type: 'number', value: d.value,
                    min: d.category === 'temperature' ? ({ '°C': -273.15, '°F': -459.67, K: 0 })[d.fromUnit] : undefined,
                    'aria-invalid': temperatureCheck.valid ? undefined : 'true',
                    'aria-describedby': temperatureCheck.valid ? undefined : 'unitconvert-temperature-error',
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
                    'aria-label': t('stem.unitconvert.value_to_convert', 'Value to convert'),
                    className: 'w-32 text-center text-2xl font-bold border-b-2 border-cyan-600 outline-none focus:ring-2 focus:ring-cyan-500 py-1 tracking-tight',
                    step: '0.01'
                  }),
                  h('select', {
                    'aria-label': t('stem.unitconvert.from_unit', 'From unit'), value: d.fromUnit,
                    onChange: function(e) { upd('fromUnit', e.target.value); },
                    className: 'block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-600 rounded-lg py-1'
                  }, Object.keys(cat.units).map(function(u) { return h('option', { key: u, value: u }, u); }))
                ),

                h('button', { 'aria-label': t('stem.unitconvert.swap_units', 'Swap units'),
                  onClick: function() {
                    stemBeep && stemBeep(600, 0.06);
                    setLabToolData(function(prev) {
                      return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { fromUnit: d.toUnit, toUnit: d.fromUnit }) });
                    });
                  },
                  className: 'text-2xl text-cyan-400 font-bold hover:scale-125 transition-transform px-2 tracking-tight',
                  title: t('stem.unitconvert.swap_units_2', 'Swap units')
                }, '\u21C4'),

                h('div', { className: 'text-center' },
                  h('p', {
                    key: fmtResult,
                    role: 'status',
                    'aria-live': 'polite',
                    'aria-atomic': 'true',
                    'aria-label': temperatureCheck.valid ? 'Converted result: ' + fmtResult + ' ' + d.toUnit : temperatureCheck.message,
                    className: 'text-2xl font-black text-cyan-700 py-1 tracking-tight',
                    style: { animation: 'ucResultPop 0.3s ease-out' }
                  }, fmtResult),
                  h('select', {
                    'aria-label': t('stem.unitconvert.to_unit', 'To unit'), value: d.toUnit,
                    onChange: function(e) { upd('toUnit', e.target.value); },
                    className: 'block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-600 rounded-lg py-1'
                  }, Object.keys(cat.units).map(function(u) { return h('option', { key: u, value: u }, u); }))
                )
              ),

              !temperatureCheck.valid && h('div', {
                id: 'unitconvert-temperature-error',
                role: 'alert',
                className: 'mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-center text-sm font-bold text-red-800'
              }, '⚠️ ' + temperatureCheck.message),

              // Formula + display precision
              h('div', { className: 'mt-3 flex flex-wrap items-center justify-center gap-3 rounded-lg bg-slate-50 p-2' },
                h('span', { className: 'text-[11px] font-mono text-slate-600' }, '📊 ' + getFormula()),
                h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-slate-600' },
                  t('stem.unitconvert.display_precision', 'Display:'),
                  h('select', {
                    value: significantFigures,
                    onChange: function(event) { upd('significantFigures', event.target.value); },
                    'aria-label': t('stem.unitconvert.significant_figures', 'Significant figures'),
                    className: 'rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700'
                  },
                    h('option', { value: 'auto' }, t('stem.unitconvert.precision_auto', 'Auto')),
                    [2, 3, 4, 5, 6].map(function(figureCount) {
                      return h('option', { key: figureCount, value: String(figureCount) }, figureCount + ' sig figs');
                    })
                  )
                )
              ),
              // \u2500\u2500 Dimensional-analysis cancellation card \u2500\u2500
              // Shows the canonical chem/physics technique: multiply by (1 toUnit / N fromUnit)
              // and watch the fromUnit cancel. Skipped for temperature (additive offset).
              d.category !== 'temperature' && (function() {
                var fF = cat.units[d.fromUnit] || 1;
                var tF = cat.units[d.toUnit] || 1;
                if (fF === tF) return null;
                // Express conversion factor as (1 toUnit / X fromUnit) when possible.
                // Find a clean integer "X" such that X fromUnit = 1 toUnit (i.e., X = tF/fF).
                var ratioOver = tF / fF;
                var ratioUnder = fF / tF;
                var topNum, botNum, topUnit, botUnit;
                if (ratioOver >= 1) {
                  topNum = '1';
                  botNum = fmt(ratioOver);
                  topUnit = d.toUnit;
                  botUnit = d.fromUnit;
                } else {
                  topNum = fmt(1 / ratioOver);
                  botNum = '1';
                  topUnit = d.toUnit;
                  botUnit = d.fromUnit;
                }
                return h('div', { className: 'mt-2 bg-cyan-50 rounded-lg p-2.5 border border-cyan-200' },
                  h('p', { className: 'text-[10px] font-bold text-cyan-700 uppercase tracking-wider text-center mb-1.5' }, t('stem.unitconvert.dimensional_analysis', '\uD83D\uDD2C Dimensional Analysis')),
                  h('div', { className: 'flex items-center justify-center gap-2 font-mono text-sm' },
                    h('span', { className: 'font-bold text-cyan-900' }, d.value),
                    h('span', { className: 'text-cyan-600 line-through decoration-2 decoration-amber-500' }, d.fromUnit),
                    h('span', { className: 'text-cyan-600 font-bold' }, '\u00D7'),
                    h('div', { className: 'inline-flex flex-col items-center' },
                      h('div', { className: 'flex items-baseline gap-1' },
                        h('span', { className: 'text-cyan-900 font-bold' }, topNum),
                        h('span', { className: 'text-cyan-700' }, topUnit)
                      ),
                      h('div', { className: 'border-t-2 border-cyan-700 w-full my-0.5' }),
                      h('div', { className: 'flex items-baseline gap-1' },
                        h('span', { className: 'text-cyan-900 font-bold' }, botNum),
                        h('span', { className: 'text-cyan-700 line-through decoration-2 decoration-amber-500' }, botUnit)
                      )
                    ),
                    h('span', { className: 'text-cyan-600 font-bold' }, '='),
                    h('span', { className: 'font-bold text-emerald-700' }, fmtResult),
                    h('span', { className: 'text-emerald-700' }, d.toUnit)
                  ),
                  h('p', { className: 'text-[10px] text-cyan-600 italic text-center mt-1.5' },
                    'The "' + d.fromUnit + '" cancels on the diagonal \u2014 only "' + d.toUnit + '" remains.')
                );
              })(),

              temperatureReasoning && h('section', {
                className: 'mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3',
                role: 'region',
                'aria-labelledby': 'unitconvert-temperature-reasoning-title'
              },
                h('p', {
                  id: 'unitconvert-temperature-reasoning-title',
                  className: 'text-[10px] font-bold uppercase tracking-wider text-amber-800 text-center'
                }, '🌡️ Why temperature is different'),
                h('p', { className: 'mt-1 text-xs text-amber-900 text-center' }, temperatureReasoning.message),
                h('ol', {
                  className: 'mt-2 space-y-1 rounded-md bg-white/70 p-2 font-mono text-xs text-slate-800',
                  'aria-label': 'Temperature conversion steps'
                }, temperatureReasoning.steps.map(function(step, index) {
                  return h('li', { key: 'temperature-step-' + index }, (index + 1) + '. ' + step);
                }))
              ),

              // Save / Pin / AI buttons
              h('div', { className: 'flex justify-center gap-2 mt-3' },
                h('button', { 'aria-label': t('stem.unitconvert.save', 'Save'),
                  disabled: !temperatureCheck.valid,
                  onClick: function() {
                    if (!temperatureCheck.valid) return;
                    var entry = { from: d.value + ' ' + d.fromUnit, to: fmtResult + ' ' + d.toUnit, ts: Date.now() };
                    var newSaveCount = historySaveCount + 1;
                    setLabToolData(function(prev) {
                      return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { history: [entry].concat((prev.unitConvert.history || []).slice(0, 9)), historySaveCount: newSaveCount }) });
                    });
                    stemBeep && stemBeep(784, 0.15);
                    addToast('\u2705 Saved to history', 'success');
                    if (newSaveCount >= 10) checkBadges({ historian: true });
                  },
                  className: 'px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-all active:scale-[0.97]'
                }, t('stem.unitconvert.save_2', '\uD83D\uDCBE Save')),
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
                  className: 'px-4 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold hover:bg-amber-100 transition-all active:scale-[0.97]'
                }, t('stem.unitconvert.pin', '\uD83D\uDCCC Pin')),
                h('button', { 'aria-label': t('stem.unitconvert.tutor', 'Tutor'),
                  onClick: askTutor,
                  className: 'px-4 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold hover:bg-purple-100 transition-all active:scale-[0.97]'
                }, t('stem.unitconvert.tutor_2', '\uD83E\uDDE0 Tutor'))
              )
            ),

            // Visual comparison bars (non-temperature)
            d.category !== 'temperature' && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-3' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.unitconvert.visual_comparison', '\uD83D\uDCCA Visual Comparison')),
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
            d.category === 'temperature' && temperatureCheck.valid && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-4 flex items-center justify-center gap-10' },
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
              h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1' }, t('stem.unitconvert.real_world_reference', '\uD83C\uDF0D Real-World Reference')),
              h('p', { className: 'text-sm font-bold text-amber-800' }, refText)
            ),

            // Fun fact
            facts.length > 0 && h('div', { className: 'mt-3 bg-violet-50 rounded-xl border border-violet-200 p-3 flex items-start gap-2' },
              h('div', { className: 'flex-1' },
                h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1' }, t('stem.unitconvert.fun_fact', '\uD83D\uDCA1 Fun Fact')),
                h('p', { key: factIdx, className: 'text-sm text-violet-800', style: { animation: 'ucFactSlide 0.4s ease-out' } }, currentFact)
              ),
              h('button', { type: 'button', 'aria-label': 'Show next unit fact', title: 'Next fact', onClick: function() { upd('factIdx', ((d.factIdx || 0) + 1) % facts.length); },
                className: 'transition-colors text-violet-500 hover:text-violet-700 text-xs font-bold shrink-0 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-1'
              }, '\u27A1\uFE0F')
            ),

            // Pinned conversions
            d.pinnedConversions && d.pinnedConversions.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-3' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.unitconvert.pinned_conversions', '\uD83D\uDCCC Pinned Conversions')),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                d.pinnedConversions.map(function(p, i) {
                  return h('button', { key: p.key,
                    onClick: function() {
                      var c2 = CATEGORIES[p.category];
                      if (!c2) return;
                      _unitConvertWordProblemRequestId += 1;
                      setLabToolData(function(prev) {
                        return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, {
                          category: p.category,
                          fromUnit: p.from,
                          toUnit: p.to,
                          loadingWP: false,
                          wordProblem: null,
                          wordProblemFeedback: '',
                          wordProblemHintLevel: 0
                        }) });
                      });
                    },
                    className: 'transition-colors flex items-center gap-1 px-2 py-1 bg-white border border-amber-600 rounded-full text-xs font-bold text-amber-700 hover:bg-amber-50 active:scale-[0.97]'
                  },
                    p.label,
                    h('span', { 
                      onClick: function(e) {
                        e.stopPropagation();
                        upd('pinnedConversions', d.pinnedConversions.filter(function(_, j) { return j !== i; }));
                      },
                      className: 'transition-colors ml-1 text-slate-600 hover:text-red-500 cursor-pointer font-bold'
                    }, '\u00D7')
                  );
                })
              )
            ),

            // Conversion history
            d.history && d.history.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-xl border p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider' }, t('stem.unitconvert.history', '\uD83D\uDCDD History')),
                h('button', { 'aria-label': t('stem.unitconvert.clear', 'Clear'), onClick: function() { upd('history', []); }, className: 'transition-colors text-[11px] text-red-400 hover:text-red-600 font-bold' }, t('stem.unitconvert.clear_2', 'Clear'))
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
            h('button', { 'aria-label': t('stem.unitconvert.snapshot', 'Snapshot'),
              onClick: function() {
                setToolSnapshots(function(prev) {
                  return prev.concat([{ id: 'uc-' + Date.now(), tool: 'unitConvert', label: d.value + ' ' + d.fromUnit + ' \u2192 ' + d.toUnit, data: Object.assign({}, d), timestamp: Date.now() }]);
                });
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
              },
              className: 'mt-3 ml-auto block px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all'
            }, t('stem.unitconvert.snapshot_2', '\uD83D\uDCF8 Snapshot'))

          ),

          // â•â•â• TAB: ALL UNITS TABLE â•â•â•
          tab === 'table' && h('div', { key: 'table' },
            h('div', { className: 'bg-white rounded-xl border border-slate-400 overflow-hidden' },
              h('div', { className: 'bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between' },
                h('p', { className: 'text-xs font-bold text-slate-600' }, 'All ' + cat.label.replace(/[^\w\s]/g, '').trim() + ' conversions for:'),
                h('div', { className: 'flex items-center gap-2' },
                  h('input', {
                    type: 'number', value: d.value,
                    min: d.category === 'temperature' ? ({ '°C': -273.15, '°F': -459.67, K: 0 })[d.fromUnit] : undefined,
                    'aria-invalid': temperatureCheck.valid ? undefined : 'true',
                    'aria-describedby': temperatureCheck.valid ? undefined : 'unitconvert-temperature-error',
                    onChange: function(e) { upd('value', parseFloat(e.target.value) || 0); },
                    className: 'w-24 text-right text-sm font-bold border border-slate-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-cyan-500',
                    step: '0.01'
                  }),
                  h('span', { className: 'text-xs font-bold text-slate-600' }, d.fromUnit),
                  h('button', { 'aria-label': t('stem.unitconvert.change', 'Change'),
                    onClick: function() { upd('tab', 'convert'); },
                    className: 'text-xs text-cyan-600 hover:underline font-bold'
                  }, t('stem.unitconvert.change_2', 'Change \u2192'))
                )
              ),
              !temperatureCheck.valid && h('div', {
                id: 'unitconvert-temperature-error',
                role: 'alert',
                className: 'm-3 rounded-lg border border-red-300 bg-red-50 p-3 text-center text-sm font-bold text-red-800'
              }, '⚠️ ' + temperatureCheck.message),
              temperatureCheck.valid && h('table', { className: 'w-full text-sm' },
                h('caption', { className: 'sr-only' }, t('stem.unitconvert.change_3', 'Change \u2192')), h('thead', null,
                  h('tr', { className: 'bg-cyan-50' },
                    h('th', { scope: 'col', className: 'text-left px-4 py-2 text-xs font-bold text-cyan-700' }, t('stem.unitconvert.unit', 'Unit')),
                    h('th', { scope: 'col', className: 'text-right px-4 py-2 text-xs font-bold text-cyan-700' }, t('stem.unitconvert.value', 'Value')),
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
                        }, t('stem.unitconvert.use', 'Use \u2192'))
                      )
                    );
                  })
                )
              )
            ),
            refText && h('div', { className: 'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3 text-center' },
              h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase mb-1' }, t('stem.unitconvert.reference', '\uD83C\uDF0D Reference')),
              h('p', { className: 'text-sm font-bold text-amber-800' }, refText)
            )
          ),

          // â•â•â• TAB: QUIZ â•â•â•
          tab === 'quiz' && h('div', { key: 'quiz' },

            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full' }, '\u2B50 ' + (d.score || 0) + ' XP'),
                h('span', { className: 'px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full' }, '\uD83D\uDD25 ' + (d.streak || 0)),
                (d.bestStreak || 0) > 0 && h('span', { className: 'px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full' }, '\uD83C\uDFC6 Best: ' + d.bestStreak)
              ),
              h('button', { 'aria-label': t('stem.unitconvert.next_question_n', 'Next question (N)'),
                onClick: startQuizQuestion,
                className: 'px-3 py-1.5 bg-cyan-700 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-all active:scale-[0.97]',
                title: t('stem.unitconvert.next_question_n_2', 'Next question (N)')
              }, d.quiz ? '\uD83D\uDD04 Next' : '\uD83E\uDDE0 Start Quiz')
            ),

            !d.quiz && h('div', { className: 'text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200' },
              h('p', { className: 'text-4xl mb-3' }, '\uD83E\uDDE0'),
              h('p', { className: 'text-sm font-bold text-slate-600' }, t('stem.unitconvert.test_your_unit_conversion_knowledge', 'Test your unit conversion knowledge!')),
              h('p', { className: 'text-xs text-slate-600 mt-1' }, t('stem.unitconvert.22_questions_speed_bonus_streak_reward', '22 questions \u2022 Speed bonus \u2022 Streak rewards'))
            ),

            d.quiz && h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-5 shadow-sm' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1' }, t('stem.unitconvert.question', '\uD83E\uDDE0 Question')),
              h('p', { className: 'text-lg font-bold text-slate-800 mb-4 tracking-tight' }, d.quiz.q),

              !d.quiz.answered
                ? h('div', { className: 'flex flex-wrap gap-2 items-center' },
                    h('input', {
                      type: 'number', placeholder: t('stem.unitconvert.your_answer', 'Your answer...'), autoFocus: true,
                      step: '0.01',
                      'aria-label': t('stem.unitconvert.quiz_answer', 'Quiz answer'),
                      className: 'flex-1 px-3 py-2 border-2 border-cyan-600 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400',
                      value: d.quizDraft === undefined || d.quizDraft === null ? '' : d.quizDraft,
                      onChange: function(e) { upd({ quizDraft: e.target.value, quizDraftError: '' }); },
                      onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); gradeQuizAnswer(e.currentTarget.value); } }
                    }),
                    h('span', { className: 'text-xs text-slate-600 shrink-0' }, d.quiz.unit),
                    h('button', { type: 'button', onClick: function() { gradeQuizAnswer(d.quizDraft); }, className: 'px-3 py-2 rounded-lg bg-cyan-700 text-white text-xs font-black hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1' }, 'Check answer'),
                    h('button', { type: 'button', 'aria-label': t('stem.unitconvert.ask_tutor_2', 'Ask Tutor'),
                      onClick: askTutor,
                      className: 'px-2 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-sm active:scale-[0.97]',
                      title: t('stem.unitconvert.get_a_hint_from_ai', 'Get a hint from AI')
                    }, '\uD83E\uDDE0'),
                    d.quizDraftError && h('p', { role: 'alert', className: 'w-full text-xs font-bold text-red-700 mt-1' }, d.quizDraftError)
                  )
                : h('div', { style: { animation: d.quiz.correct ? 'ucCorrect 0.5s ease' : 'ucWrong 0.4s ease' } },
                    h('p', { className: 'text-base font-bold mb-1 ' + (d.quiz.correct ? 'text-emerald-600' : 'text-red-500') },
                      d.quiz.correct
                        ? '\u2705 Correct! ' + (d.quiz.xp === 3 ? '\u26A1 Lightning!' : d.quiz.xp === 2 ? '\uD83D\uDE80 Quick!' : '') + ' (' + d.quiz.elapsed + 's)'
                        : '\u274C Answer was: ' + d.quiz.a + ' ' + d.quiz.unit
                    ),
                    !d.quiz.correct && d.quiz.fb && h('p', { className: 'text-xs leading-relaxed text-red-700 mb-2' }, d.quiz.fb),
                    d.quiz.correct && d.quiz.xp > 0 && h('p', { className: 'text-xs text-emerald-400 mb-2' }, '+' + d.quiz.xp + ' XP earned'),
                    h('div', { className: 'flex gap-2' },
                      h('button', { 'aria-label': t('stem.unitconvert.next_question', 'Next Question'),
                        onClick: function() {
                          var q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];
                          upd('quiz', { q: q.q, a: q.a, unit: q.unit, tol: q.tol || 0.01, answered: false, startTime: Date.now() });
                          stemBeep && stemBeep(600, 0.06);
                        },
                        className: 'px-4 py-2 bg-cyan-700 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-all active:scale-[0.97]'
                      }, t('stem.unitconvert.next_question_2', '\uD83D\uDD04 Next Question')),
                      !d.quiz.correct && h('button', { 'aria-label': t('stem.unitconvert.explain', 'Explain'),
                        onClick: askTutor,
                        className: 'px-4 py-2 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-200 transition-all active:scale-[0.97]'
                      }, t('stem.unitconvert.explain_2', '\uD83E\uDDE0 Explain'))
                    )
                  )
            )

          ),

          // â•â•â• TAB: WORD PROBLEM â•â•â•
          tab === 'wordproblem' && h('div', { key: 'wp' },

            h('div', { className: 'flex items-center justify-between gap-3 mb-3' },
              h('div', null,
                h('p', { className: 'text-sm font-bold text-slate-700' },
                  t('stem.unitconvert.practice_before_reveal', 'Practice first, then reveal')),
                h('p', { className: 'text-xs text-slate-600 mt-0.5' },
                  t('stem.unitconvert.word_problem_flow_description', 'Try the conversion, request up to two hints, and reveal the worked answer only when you choose.'))
              ),
              h('button', {
                type: 'button',
                disabled: !!d.loadingWP,
                onClick: generateWordProblem,
                'aria-label': wordProblem ? t('stem.unitconvert.new_problem', 'New Problem') : t('stem.unitconvert.generate_problem', 'Generate practice problem'),
                className: 'shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all ' + (d.loadingWP ? 'bg-slate-200 text-slate-600 cursor-not-allowed' : 'bg-cyan-700 text-white hover:bg-cyan-600 active:scale-[0.97]')
              }, d.loadingWP
                ? t('stem.unitconvert.generating_problem', '⏳ Generating...')
                : wordProblem
                  ? t('stem.unitconvert.new_problem_2', '🔄 New Problem')
                  : t('stem.unitconvert.generate_problem_2', '✨ Generate Problem'))
            ),

            d.loadingWP && h('div', {
              className: 'text-center py-12',
              role: 'status',
              'aria-live': 'polite'
            },
              h('div', {
                className: 'inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full',
                style: { animation: 'spin 1s linear infinite' },
                'aria-hidden': 'true'
              }),
              h('p', { className: 'text-sm text-slate-600 mt-3' },
                t('stem.unitconvert.crafting_your_word_problem', 'Crafting your word problem...'))
            ),

            !wordProblem && !d.loadingWP && h('div', {
              className: 'text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300'
            },
              h('p', { className: 'text-4xl mb-3', 'aria-hidden': 'true' }, '📝'),
              h('p', { className: 'text-sm font-bold text-slate-700' },
                t('stem.unitconvert.generate_or_use_offline_problem', 'Generate a practice problem. If AI is unavailable, an offline problem appears automatically.')),
              h('p', { className: 'text-xs text-slate-600 mt-1' },
                t('stem.unitconvert.current_category', 'Current category: ') + cat.label)
            ),

            wordProblem && !d.loadingWP && h('article', {
              className: 'bg-white rounded-xl border-2 border-cyan-200 p-5 shadow-sm animate-in fade-in duration-300',
              'aria-labelledby': 'unitconvert-word-problem-title'
            },
              h('div', { className: 'flex items-center justify-between gap-2 mb-3' },
                h('h3', {
                  id: 'unitconvert-word-problem-title',
                  className: 'text-sm font-black text-cyan-800'
                }, t('stem.unitconvert.practice_problem', '📝 Practice Problem')),
                h('div', { className: 'flex flex-wrap justify-end gap-1.5' },
                  h('span', {
                    className: 'rounded-full px-2 py-1 text-[10px] font-bold ' + (wordProblem.source === 'offline' ? 'bg-amber-100 text-amber-800' : 'bg-violet-100 text-violet-700')
                  }, wordProblem.source === 'offline'
                    ? t('stem.unitconvert.offline_practice', 'Offline practice')
                    : t('stem.unitconvert.ai_practice', 'AI practice')),
                  wordProblem.verified && h('span', {
                    className: 'rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800',
                    'aria-label': t('stem.unitconvert.math_verified_detail', 'Math verified locally. The app independently calculated the answer, hints, and explanation.')
                  }, t('stem.unitconvert.math_verified', '✓ Math verified locally'))
                )
              ),

              h('p', { className: 'rounded-lg bg-cyan-50 p-4 text-base font-bold leading-relaxed text-slate-800' }, wordProblem.problem),

              !d.wordProblemSolved && h('div', { className: 'mt-4' },
                h('label', {
                  htmlFor: 'unitconvert-word-problem-attempt',
                  className: 'block text-xs font-bold text-slate-700 mb-1'
                }, t('stem.unitconvert.your_conversion_answer', 'Your conversion answer')),
                h('div', { className: 'flex flex-wrap items-center gap-2' },
                  h('input', {
                    id: 'unitconvert-word-problem-attempt',
                    type: 'number',
                    step: 'any',
                    value: d.wordProblemAttempt == null ? '' : d.wordProblemAttempt,
                    onChange: function(event) {
                      upd({ wordProblemAttempt: event.target.value, wordProblemFeedback: '' });
                    },
                    onKeyDown: function(event) {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        gradeWordProblemAttempt();
                      }
                    },
                    'aria-label': t('stem.unitconvert.word_problem_numeric_answer', 'Numeric answer for the word problem'),
                    className: 'min-w-0 flex-1 rounded-lg border-2 border-cyan-300 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300'
                  }),
                  h('span', { className: 'text-sm font-bold text-slate-700' }, wordProblem.unit),
                  h('button', {
                    type: 'button',
                    onClick: gradeWordProblemAttempt,
                    className: 'rounded-lg bg-cyan-700 px-4 py-2 text-xs font-black text-white hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1'
                  }, t('stem.unitconvert.check_attempt', 'Check attempt'))
                )
              ),

              d.wordProblemFeedback && h('p', {
                role: 'status',
                'aria-live': 'polite',
                'aria-atomic': 'true',
                className: 'mt-3 rounded-lg border p-3 text-sm font-bold ' + (d.wordProblemSolved ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900')
              }, d.wordProblemFeedback),

              (d.wordProblemHintLevel || 0) > 0 && h('div', {
                className: 'mt-3 space-y-2',
                'aria-label': t('stem.unitconvert.revealed_hints', 'Revealed hints')
              }, wordProblem.hints.slice(0, d.wordProblemHintLevel || 0).map(function(hint, index) {
                return h('div', {
                  key: 'word-problem-hint-' + index,
                  className: 'rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900'
                },
                  h('span', { className: 'font-black' }, t('stem.unitconvert.hint', 'Hint') + ' ' + (index + 1) + ': '),
                  hint
                );
              })),

              (d.wordProblemSolved || d.wordProblemRevealed) && h('section', {
                className: 'mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4',
                'aria-labelledby': 'unitconvert-worked-answer-title'
              },
                h('h4', {
                  id: 'unitconvert-worked-answer-title',
                  className: 'text-xs font-black uppercase tracking-wider text-emerald-800'
                }, t('stem.unitconvert.worked_answer', 'Worked answer')),
                h('p', { className: 'mt-1 text-lg font-black text-emerald-900' },
                  fmt(wordProblem.answer) + ' ' + wordProblem.unit),
                h('p', { className: 'mt-2 text-sm leading-relaxed text-slate-700' }, wordProblem.explanation)
              ),

              h('div', { className: 'mt-4 flex flex-wrap gap-2' },
                !d.wordProblemSolved && (d.wordProblemHintLevel || 0) < 2 && h('button', {
                  type: 'button',
                  onClick: showNextWordProblemHint,
                  className: 'rounded-lg bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-200'
                }, t('stem.unitconvert.show_hint', '💡 Show Hint ') + ((d.wordProblemHintLevel || 0) + 1)),
                !d.wordProblemSolved && !d.wordProblemRevealed && h('button', {
                  type: 'button',
                  onClick: revealWordProblemAnswer,
                  className: 'rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-200'
                }, t('stem.unitconvert.reveal_answer', '👀 Reveal Answer')),
                h('button', {
                  type: 'button',
                  'aria-label': t('stem.unitconvert.save_3', 'Save'),
                  onClick: function() {
                    setToolSnapshots(function(prev) {
                      return prev.concat([{
                        id: 'ucwp-' + Date.now(),
                        tool: 'unitConvert',
                        label: 'Word Problem: ' + cat.label,
                        data: {
                          wordProblem: wordProblem,
                          solved: !!d.wordProblemSolved,
                          revealed: !!d.wordProblemRevealed,
                          hintLevel: d.wordProblemHintLevel || 0
                        },
                        timestamp: Date.now()
                      }]);
                    });
                    addToast(t('stem.unitconvert.problem_saved', '📸 Problem saved!'), 'success');
                  },
                  className: 'rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100'
                }, t('stem.unitconvert.save_4', '💾 Save'))
              )
            )

          ),
          tab === 'magHunt' && (function() {
            var iq = d.magHunt || { sourceExp: 0, targetExp: 3, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
            function setIQ(patch) { upd('magHunt', Object.assign({}, iq, patch)); }
            var diff = Math.abs(iq.targetExp - iq.sourceExp);
            var mag;
            if (diff < 2) mag = 'tiny';
            else if (diff < 5) mag = 'small';
            else if (diff < 9) mag = 'medium';
            else if (diff < 13) mag = 'large';
            else mag = 'massive';
            var mm = {
              tiny:    { label: t('stem.unitconvert.tiny_scale_change', 'ðŸœ Tiny scale change'), color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', desc: t('stem.unitconvert.2_orders_of_magnitude_close_cousins_cm', '<2 orders of magnitude â€” close cousins (cmâ†’m).') },
              small:   { label: t('stem.unitconvert.small_scale_change', 'ðŸŸ¢ Small scale change'), color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: t('stem.unitconvert.2_4_oom_same_domain_g_kg', '2-4 OOM â€” same domain (gâ†’kg).') },
              medium:  { label: t('stem.unitconvert.medium_scale_change', 'ðŸŸ¡ Medium scale change'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: t('stem.unitconvert.5_8_oom_biology_to_geology_scales', '5-8 OOM â€” biology to geology scales.') },
              large:   { label: t('stem.unitconvert.large_scale_change', 'ðŸ”´ Large scale change'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: t('stem.unitconvert.9_12_oom_micro_to_macro_span', '9-12 OOM â€” micro to macro span.') },
              massive: { label: t('stem.unitconvert.massive_scale_change', 'ðŸŒŒ Massive scale change'), color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: t('stem.unitconvert.13_oom_atomic_to_cosmic', '13+ OOM â€” atomic to cosmic.') }
            }[mag];
            return h('div', { key: 'mh', className: 'p-3' },
              h('div', { className: 'p-4 rounded-xl bg-white border border-cyan-300 space-y-3' },
                h('h3', { className: 'text-sm font-black text-cyan-700' }, t('stem.unitconvert.magnitude_discovery', 'âš™ï¸ Magnitude discovery')),
                h('p', { className: 'text-[12px] text-slate-700 leading-relaxed' }, t('stem.unitconvert.adjust_source_and_target_exponents_10_', 'Adjust source and target exponents (10^N). Widget classifies magnitude change into 5 discrete bands. No score, no reveal.')),
                h('div', { className: 'p-3 rounded-lg text-center', style: { background: mm.bg, border: '2px solid ' + mm.border } },
                  h('div', { className: 'text-base font-black', style: { color: mm.color } }, mm.label),
                  h('div', { className: 'text-[11px] text-slate-700 mt-1' }, mm.desc),
                  h('div', { className: 'text-[10px] text-slate-600 mt-1 font-mono' }, '10^' + iq.sourceExp + ' â†’ 10^' + iq.targetExp + ' (Î” ' + diff + ' OOM)')
                ),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  [{ k: 'sourceExp', l: 'source 10^' }, { k: 'targetExp', l: 'target 10^' }].map(function(s) {
                    return h('div', { key: s.k },
                      h('label', { htmlFor: 'mh-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-cyan-700' }, iq[s.k])),
                      h('input', { id: 'mh-' + s.k, type: 'range', min: -18, max: 24, step: 1, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ s: iq.sourceExp, t: iq.targetExp, m: mag }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, t('stem.unitconvert.log', 'ðŸ“‹ Log')),
                  h('button', { onClick: function() { setIQ({ sourceExp: 0, targetExp: 3, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, t('stem.unitconvert.reset', 'â†º Reset'))
                ),
                h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.unitconvert.hypothesis_what_real_world_examples_sp', 'Hypothesis: What real-world examples span each magnitude band?'),
                  className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, t('stem.unitconvert.stuck_show_open_prompts', 'ðŸ¤” Stuck â€” show open prompts')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, t('stem.unitconvert.compare_cm_km_mm_light_year_how_many_o', 'Compare cmâ†’km, mmâ†’light-year. How many OOM each?')),
                    h('li', null, t('stem.unitconvert.why_are_scientists_trained_in_orders_o', 'Why are scientists trained in orders of magnitude?')))),
                h('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-800 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                  t('stem.unitconvert.i_understand_explain_in_own_words', 'I understand â€” explain in own words')),
                iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.unitconvert.explain_why_dimensional_reasoning_acro', 'Explain why dimensional reasoning across many OOM is hard.'),
                  className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
                h('div', { className: 'text-[10px] italic text-slate-500' }, t('stem.unitconvert.design_note_discrete_5_state_magnitude', 'Design note: discrete 5-state magnitude marker; no error score; no reveal â€” by design.'))
              )
            );
          })(),

          // â”€â”€ Keyboard shortcuts legend â”€â”€
          h('div', { className: 'text-[11px] text-slate-600 text-center mt-3 space-x-3' },
            h('span', null, t('stem.unitconvert.1_4_tabs', '1-4 Tabs')),
            h('span', null, t('stem.unitconvert.n_next_quiz', 'N Next Quiz')),
            h('span', null, t('stem.unitconvert.b_badges', 'B Badges')),
            h('span', null, t('stem.unitconvert.ai_tutor_2', '? AI Tutor'))
          ),

          // â•â•â• METRIC PREFIXES â•â•â•
          h('div', { className: 'mt-5 rounded-2xl border border-blue-300 bg-white p-3 shadow-sm' },
            h('h4', { className: 'text-sm font-bold text-blue-700 mb-2' }, t('stem.unitconvert.metric_prefixes_powers_of_10_from_atom', 'ðŸ”¬ Metric Prefixes â€” Powers of 10 from atoms to galaxies')),
            h('div', { className: 'rounded-xl overflow-hidden border border-blue-200', style: { background: '#0c1a2e', aspectRatio: '16/5' } },
              h('canvas', {
                role: 'img', tabIndex: 0, 'aria-label': 'Unit conversion scale visualization.',
                ref: function(cvEl) {
                  if (!cvEl) {
                    try { if (window.__alloMetricPrefixCleanup) window.__alloMetricPrefixCleanup(); } catch (e) {}
                    return;
                  }
                  if (cvEl._mpCleanup) cvEl._mpCleanup();
                  else if (cvEl._mpAnim) { cancelAnimationFrame(cvEl._mpAnim); cvEl._mpAnim = null; }
                  try { if (window.__alloMetricPrefixCleanup && window.__alloMetricPrefixCleanup !== cvEl._mpCleanup) window.__alloMetricPrefixCleanup(); } catch (e) {}
                  var c2 = cvEl.getContext('2d');
                  if (!c2) return;
                  var W = cvEl.offsetWidth || 600;
                  var H = cvEl.offsetHeight || 180;
                  cvEl.width = W * 2; cvEl.height = H * 2;
                  if (c2.setTransform) c2.setTransform(2, 0, 0, 2, 0, 0);
                  else c2.scale(2, 2);
                  var start = performance.now();
                  var alive = true;
                  var reducedMotion = false;
                  var ro = null;
                  try { reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
                  function isMetricPrefixHidden() { return typeof document !== 'undefined' && !!document.hidden; }
                  function cancelMetricPrefixFrame() {
                    if (cvEl._mpAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(cvEl._mpAnim);
                    cvEl._mpAnim = null;
                  }
                  function scheduleMetricPrefixFrame() {
                    if (!alive || reducedMotion || cvEl._mpAnim || isMetricPrefixHidden()) return;
                    if (typeof requestAnimationFrame !== 'function') return;
                    cvEl._mpAnim = requestAnimationFrame(drawMp);
                  }
                  function cleanupMetricPrefixCanvas() {
                    alive = false;
                    cancelMetricPrefixFrame();
                    if (ro) ro.disconnect();
                    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onMetricPrefixVisibilityChange);
                    if (window.__alloMetricPrefixCleanup === cvEl._mpCleanup) window.__alloMetricPrefixCleanup = null;
                    cvEl._mpCleanup = null;
                    cvEl._mpRO = null;
                  }
                  function onMetricPrefixVisibilityChange() {
                    if (!alive) return;
                    if (!cvEl.isConnected) { cleanupMetricPrefixCanvas(); return; }
                    if (isMetricPrefixHidden()) cancelMetricPrefixFrame();
                    else { cancelMetricPrefixFrame(); drawMp(); }
                  }
                  function resizeMetricPrefixCanvas() {
                    if (!alive || !cvEl.isConnected) { cleanupMetricPrefixCanvas(); return; }
                    cancelMetricPrefixFrame();
                    W = cvEl.offsetWidth || 600; H = cvEl.offsetHeight || 180;
                    cvEl.width = W * 2; cvEl.height = H * 2;
                    if (c2.setTransform) c2.setTransform(2, 0, 0, 2, 0, 0);
                    else c2.scale(2, 2);
                    drawMp();
                  }
                  cvEl._mpCleanup = cleanupMetricPrefixCanvas;
                  try { window.__alloMetricPrefixCleanup = cvEl._mpCleanup; } catch (e) {}
                  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onMetricPrefixVisibilityChange);
                  var prefixes = [
                    { sym: 'p', name: 'pico', exp: -12, color: '#a855f7' },
                    { sym: 'n', name: 'nano', exp: -9, color: '#3b82f6' },
                    { sym: 'Âµ', name: 'micro', exp: -6, color: '#22d3ee' },
                    { sym: 'm', name: 'milli', exp: -3, color: '#86efac' },
                    { sym: '', name: 'base', exp: 0, color: '#fff' },
                    { sym: 'k', name: 'kilo', exp: 3, color: '#fde047' },
                    { sym: 'M', name: 'mega', exp: 6, color: '#fb923c' },
                    { sym: 'G', name: 'giga', exp: 9, color: '#fb7185' },
                    { sym: 'T', name: 'tera', exp: 12, color: '#dc2626' }
                  ];
                  function drawMp() {
                    if (!alive) return;
                    cvEl._mpAnim = null;
                    if (!cvEl.isConnected) { cleanupMetricPrefixCanvas(); return; }
                    if (isMetricPrefixHidden()) { cancelMetricPrefixFrame(); return; }
                    var t = reducedMotion ? 8 : (performance.now() - start) / 1000;
                    c2.fillStyle = '#0c1a2e';
                    c2.fillRect(0, 0, W, H);
                    var cellW = (W - 30) / prefixes.length;
                    var blink = Math.floor((t * 0.5) % prefixes.length);
                    prefixes.forEach(function(p, i) {
                      var x = 15 + i * cellW;
                      var y = H * 0.2;
                      var sel = i === blink;
                      c2.save();
                      if (sel) { c2.shadowColor = p.color; c2.shadowBlur = 16; }
                      c2.fillStyle = p.color;
                      c2.globalAlpha = sel ? 1 : 0.7;
                      c2.fillRect(x, y, cellW - 4, H * 0.5);
                      c2.restore();
                      c2.fillStyle = sel ? '#0c1a2e' : (p.exp === 0 ? '#0c1a2e' : 'rgba(0,0,0,0.7)');
                      c2.font = 'bold 14px serif';
                      c2.textAlign = 'center';
                      c2.fillText(p.sym || 'â€”', x + cellW / 2, y + 22);
                      c2.font = 'bold 9px sans-serif';
                      c2.fillText(p.name, x + cellW / 2, y + 38);
                      c2.font = 'bold 10px monospace';
                      c2.fillText('10' + (p.exp >= 0 ? '+' : '') + p.exp, x + cellW / 2, y + 54);
                    });
                    // Selected info
                    var cur = prefixes[blink];
                    c2.fillStyle = cur.color;
                    c2.font = 'bold 12px sans-serif';
                    c2.textAlign = 'center';
                    var examples = {
                      'pico': 'pm = bond lengths',
                      'nano': 'nm = wavelengths',
                      'micro': 'Âµm = bacteria',
                      'milli': 'mm = grains of sand',
                      'base': 'meter, second, gram, ampere',
                      'kilo': 'km = walking distance',
                      'mega': 'Mm = continents',
                      'giga': 'Gm = Sun-Earth',
                      'tera': 'Tm = Jupiter-Sun'
                    };
                    c2.fillText('Example: ' + (examples[cur.name] || ''), W / 2, H - 24);
                    c2.fillStyle = 'rgba(0,0,0,0.85)';
                    c2.fillRect(8, H - 14, W - 16, 12);
                    c2.font = 'bold 8px sans-serif'; c2.fillStyle = '#93c5fd'; c2.textAlign = 'center';
                    c2.fillText('SI metric system â€” every prefix steps by 1000. Used everywhere except weird corners of US measurement.', W / 2, H - 5);
                    scheduleMetricPrefixFrame();
                  }
                  drawMp();
                  if (typeof ResizeObserver === 'function') {
                    ro = new ResizeObserver(resizeMetricPrefixCanvas);
                    cvEl._mpRO = ro;
                    ro.observe(cvEl);
                  }
                },
                style: { width: '100%', height: '100%', display: 'block' }
              })
            )
          )

        );
      })();
    }
  });

  console.log('[StemLab] stem_tool_unitconvert.js loaded');
})();
