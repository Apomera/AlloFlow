// Ratios, Rates & Proportions Lab
// Interactive ratio tables, double number lines, unit rates, percents, and proportional reasoning.

(function(root) {
  'use strict';

  if (!root) return;

  // Defensive registry guard for independently loaded STEM tool modules.
  root.StemLab = root.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function(id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    getRegisteredTools: function() {
      var self = this;
      return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
    },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) {
      var tool = this._registry[id];
      if (!tool || typeof tool.render !== 'function') return null;
      try { return tool.render(ctx); } catch (error) {
        if (root.console && typeof root.console.error === 'function') root.console.error('[StemLab] Error rendering ' + id, error);
        return null;
      }
    }
  };

  // Shared accessibility helpers are installed only when a document is available.
  if (typeof document !== 'undefined') {
    if (!document.getElementById('allo-stem-motion-reduce-css')) {
      var motionStyle = document.createElement('style');
      motionStyle.id = 'allo-stem-motion-reduce-css';
      motionStyle.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
      document.head.appendChild(motionStyle);
    }
    if (!document.getElementById('allo-ratio-lab-focus-css')) {
      var focusStyle = document.createElement('style');
      focusStyle.id = 'allo-ratio-lab-focus-css';
      focusStyle.textContent = '.ratio-challenge-answer:focus-visible{outline:3px solid var(--ratio-focus-color,#4f46e5);outline-offset:2px;}';
      document.head.appendChild(focusStyle);
    }
    if (!document.getElementById('allo-live-ratio-lab')) {
      var liveRegion = document.createElement('div');
      liveRegion.id = 'allo-live-ratio-lab';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('role', 'status');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      document.body.appendChild(liveRegion);
    }
  }

  var MODES = [
    { id: 'ratioTable', icon: '\uD83E\uDDEE', short: 'Ratio Tables', title: 'Ratio Tables', desc: 'Scale both quantities by the same factor.' },
    { id: 'numberLine', icon: '\u2194\uFE0F', short: 'Double Line', title: 'Double Number Line', desc: 'Align equivalent quantities on two connected scales.' },
    { id: 'unitRates', icon: '\u2696\uFE0F', short: 'Unit Rates', title: 'Unit Rates & Comparison', desc: 'Compare every situation using the same one-unit benchmark.' },
    { id: 'percent', icon: '%', short: 'Percents', title: 'Percent Problems', desc: 'Connect the part, whole, and percent.' },
    { id: 'proportional', icon: '\uD83D\uDCC8', short: 'Proportional?', title: 'Proportional or Not?', desc: 'Use tables, unit rates, and graphs as evidence.' }
  ];

  var MAX_PERCENT = 1000;
  var MAX_PERCENT_QUANTITY = 1000000;
  var MAX_UNIT_RATE_VALUE = 1000000;

  var CHALLENGES = {
    ratioTable: [
      { id: 'ratio-paint', prompt: 'A paint mix uses 3 cups blue for every 5 cups white. If there are 20 cups of white, how many cups of blue are needed?', answer: 12, suffix: 'cups', hint: 'Five was multiplied by 4, so multiply three by 4 too.', explain: '3:5 and 12:20 are equivalent because both quantities were multiplied by 4.' },
      { id: 'ratio-simplify', prompt: 'Simplify the ratio 18:24. Enter your answer with a colon.', answers: ['3:4', '3/4'], hint: 'Divide both terms by their greatest common factor, 6.', explain: '18 \u00F7 6 = 3 and 24 \u00F7 6 = 4, so the simplest ratio is 3:4.' },
      { id: 'ratio-scale', prompt: 'Scale the ratio 7:4 by a factor of 6. What is the second quantity?', answer: 24, hint: 'Multiply the second quantity by the scale factor.', explain: '4 \u00D7 6 = 24, while the first quantity becomes 7 \u00D7 6 = 42.' }
    ],
    numberLine: [
      { id: 'line-tickets', prompt: 'Five tickets cost $15. On a double number line, what cost aligns with 8 tickets?', answer: 24, prefix: '$', hint: 'First find the cost for one ticket.', explain: '$15 \u00F7 5 = $3 per ticket, and 8 \u00D7 $3 = $24.' },
      { id: 'line-running', prompt: 'A runner covers 3 kilometers in 18 minutes at a steady pace. How many minutes align with 7 kilometers?', answer: 42, suffix: 'minutes', hint: 'Use the aligned value for 1 kilometer.', explain: '18 \u00F7 3 = 6 minutes per kilometer, so 7 kilometers take 42 minutes.' },
      { id: 'line-batches', prompt: 'Two batches use 5 cups of flour. How many cups align with 6 batches?', answer: 15, suffix: 'cups', hint: 'Six batches is three groups of two batches.', explain: 'The scale factor from 2 batches to 6 batches is 3, so 5 \u00D7 3 = 15 cups.' }
    ],
    unitRates: [
      { id: 'unit-snacks', prompt: 'Option A is 12 oz for $3.60. Option B is 20 oz for $5.40. Which has the lower cost per ounce? Enter A or B.', answers: ['b', 'option b'], hint: 'Divide each price by its number of ounces.', explain: 'A costs $0.30/oz and B costs $0.27/oz, so B is the better price per ounce.' },
      { id: 'unit-speed', prompt: 'A car travels 180 miles in 3 hours. What is its unit rate in miles per hour?', answer: 60, suffix: 'mph', hint: 'Divide the distance by the time.', explain: '180 \u00F7 3 = 60 miles per hour.' },
      { id: 'unit-printing', prompt: 'Printer A makes 84 pages in 6 minutes. Printer B makes 105 pages in 7 minutes. Which is faster? Enter A or B.', answers: ['b', 'printer b'], hint: 'Compare pages per one minute.', explain: 'A prints 14 pages/minute and B prints 15 pages/minute, so B is faster.' }
    ],
    percent: [
      { id: 'percent-part', prompt: 'What is 35% of 240?', answer: 84, hint: 'Write 35% as 0.35, then multiply by the whole.', explain: '0.35 \u00D7 240 = 84.' },
      { id: 'percent-rate', prompt: '45 is what percent of 180?', answer: 25, suffix: '%', hint: 'Divide the part by the whole, then multiply by 100.', explain: '45 \u00F7 180 = 0.25, which is 25%.' },
      { id: 'percent-whole', prompt: '30 is 20% of what whole?', answer: 150, hint: 'Divide the part by the percent written as a decimal.', explain: '30 \u00F7 0.20 = 150.' }
    ],
    proportional: [
      { id: 'prop-yes-table', prompt: 'Does the table x = 1, 2, 4 and y = 3, 6, 12 show a proportional relationship? Enter yes or no.', answers: ['yes', 'y'], hint: 'Compare y \u00F7 x in every row.', explain: 'Yes. Every row has y \u00F7 x = 3, so the constant of proportionality is 3.' },
      { id: 'prop-no-table', prompt: 'Does the table x = 1, 2, 3 and y = 4, 8, 13 show a proportional relationship? Enter yes or no.', answers: ['no', 'n'], hint: 'One unequal unit rate is enough to disprove proportionality.', explain: 'No. The rates are 4, 4, and 13/3, so they are not constant.' },
      { id: 'prop-origin', prompt: 'A straight graph passes through (0,0), (2,7), and (4,14). Is the relationship proportional? Enter yes or no.', answers: ['yes', 'y'], hint: 'A proportional graph is a straight line through the origin.', explain: 'Yes. The nonzero points both have y \u00F7 x = 3.5, and the line passes through the origin.' }
    ]
  };

  var MODE_IDS = MODES.map(function(mode) { return mode.id; });
  var CHALLENGE_IDS = [];
  Object.keys(CHALLENGES).forEach(function(mode) {
    CHALLENGES[mode].forEach(function(challenge) { CHALLENGE_IDS.push(challenge.id); });
  });

  function visitedCount(d) {
    var visited = Object.assign({ ratioTable: true }, (d && d.modesVisited) || {});
    return MODE_IDS.filter(function(id) { return !!visited[id]; }).length;
  }

  function solvedCount(d) {
    var solved = (d && d.solvedChallenges) || {};
    return CHALLENGE_IDS.filter(function(id) { return !!solved[id]; }).length;
  }

  function solvedInMode(d, mode) {
    var solved = (d && d.solvedChallenges) || {};
    return (CHALLENGES[mode] || []).some(function(challenge) { return !!solved[challenge.id]; });
  }

  function finiteNumber(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundTo(value, places) {
    var power = Math.pow(10, places == null ? 2 : places);
    if (!isFinite(value) || !isFinite(power) || power === 0) return value;
    var adjusted = value + Number.EPSILON;
    if (!isFinite(adjusted)) adjusted = value;
    var scaled = adjusted * power;
    if (!isFinite(scaled)) return value;
    return Math.round(scaled) / power;
  }

  function formatNumber(value, places) {
    if (!isFinite(value)) return '\u2014';
    var rounded = roundTo(value, places == null ? 3 : places);
    return String(Object.is(rounded, -0) ? 0 : rounded);
  }

  function percentSegmentFills(tapePercent) {
    var bounded = clamp(finiteNumber(tapePercent, 0), 0, 100);
    var fills = [];
    for (var segment = 0; segment < 10; segment++) {
      fills.push(roundTo(clamp((bounded - segment * 10) / 10, 0, 1), 6));
    }
    return fills;
  }

  function percentTapeModel(value, maxTapes) {
    var requestedPercent = Math.max(0, finiteNumber(value, 0));
    var percent = clamp(requestedPercent, 0, MAX_PERCENT);
    var visibleLimit = clamp(Math.floor(finiteNumber(maxTapes, 6)), 1, 12);
    var wholeCount = Math.floor(percent / 100);
    var remainderPercent = roundTo(percent - wholeCount * 100, 6);
    if (nearlyEqual(remainderPercent, 100)) {
      wholeCount += 1;
      remainderPercent = 0;
    } else if (nearlyEqual(remainderPercent, 0)) {
      remainderPercent = 0;
    }

    var reserveForPartial = remainderPercent > 0 ? 1 : 0;
    var visibleWholeCount = Math.min(wholeCount, visibleLimit - reserveForPartial);
    var tapes = [];
    for (var wholeIndex = 0; wholeIndex < visibleWholeCount; wholeIndex++) {
      tapes.push({ percent: 100, fills: percentSegmentFills(100), complete: true });
    }
    if (remainderPercent > 0) {
      tapes.push({ percent: remainderPercent, fills: percentSegmentFills(remainderPercent), complete: false });
    }
    if (!tapes.length) tapes.push({ percent: 0, fills: percentSegmentFills(0), complete: false });

    return {
      percent: percent,
      limited: requestedPercent > MAX_PERCENT,
      wholeCount: wholeCount,
      remainderPercent: remainderPercent,
      totalTapeCount: Math.max(1, wholeCount + reserveForPartial),
      hiddenWholeCount: Math.max(0, wholeCount - visibleWholeCount),
      tapes: tapes
    };
  }

  function percentTapeSummary(model) {
    var percentLabel = formatNumber(model.percent) + '%';
    if (model.percent === 0) return percentLabel + ' fills none of the whole.';
    if (model.wholeCount === 0) return percentLabel + ' fills ' + formatNumber(model.remainderPercent) + '% of one whole.';
    if (model.remainderPercent === 0) return percentLabel + ' equals ' + model.wholeCount + ' complete ' + (model.wholeCount === 1 ? 'whole.' : 'wholes.');
    return percentLabel + ' equals ' + model.wholeCount + ' complete ' + (model.wholeCount === 1 ? 'whole' : 'wholes') + ' plus ' + formatNumber(model.remainderPercent) + '% of another whole.';
  }

  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) { var next = a % b; a = b; b = next; }
    return a || 1;
  }

  function nearlyEqual(a, b) {
    if (!isFinite(a) || !isFinite(b)) return false;
    return Math.abs(a - b) <= 0.000001 * Math.max(1, Math.abs(a), Math.abs(b));
  }

  function pairsShareUnitRate(reference, candidate) {
    if (!reference || !candidate || reference.x === 0 || candidate.x === 0) return false;
    if (![reference.x, reference.y, candidate.x, candidate.y].every(isFinite)) return false;
    if (reference.y === 0 || candidate.y === 0) return reference.y === candidate.y;
    var referenceScale = Math.max(Math.abs(reference.x), Math.abs(reference.y));
    var candidateScale = Math.max(Math.abs(candidate.x), Math.abs(candidate.y));
    var left = (reference.y / referenceScale) * (candidate.x / candidateScale);
    var right = (candidate.y / candidateScale) * (reference.x / referenceScale);
    var magnitude = Math.max(Math.abs(left), Math.abs(right));
    if (magnitude === 0) {
      var referenceLogRate = Math.log(Math.abs(reference.y)) - Math.log(Math.abs(reference.x));
      var candidateLogRate = Math.log(Math.abs(candidate.y)) - Math.log(Math.abs(candidate.x));
      return Math.abs(referenceLogRate - candidateLogRate) <= 64 * Number.EPSILON * Math.max(1, Math.abs(referenceLogRate), Math.abs(candidateLogRate));
    }
    return Math.abs(left - right) <= 64 * Number.EPSILON * magnitude;
  }

  function positiveAxisMaximum(values) {
    var maximum = 0;
    (values || []).forEach(function(value) {
      if (isFinite(value) && value > maximum) maximum = value;
    });
    return maximum > 0 ? maximum : 1;
  }

  function canonicalChallengeAnswer(challenge) {
    if (!challenge) return '';
    if (challenge.answer != null) return String(challenge.answer);
    return challenge.answers && challenge.answers.length ? String(challenge.answers[0]) : '';
  }

  function normalizeAnswer(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
  }

  function challengeIsCorrect(challenge, rawAnswer) {
    var normalized = normalizeAnswer(rawAnswer);
    if (!normalized) return false;
    if (challenge.answers) {
      return challenge.answers.some(function(answer) { return normalized === normalizeAnswer(answer); });
    }
    var numeric = Number(normalized.replace(/[$%]/g, ''));
    return isFinite(numeric) && nearlyEqual(numeric, challenge.answer);
  }

  function parsePairInput(xText, yText) {
    var xs = String(xText == null ? '' : xText).split(',');
    var ys = String(yText == null ? '' : yText).split(',');
    var pairs = [];
    var errors = [];
    var rowCount = Math.max(xs.length, ys.length);
    if (xs.length !== ys.length) errors.push('Enter the same number of x-values and y-values.');
    for (var i = 0; i < rowCount; i++) {
      var xRaw = i < xs.length ? xs[i].trim() : '';
      var yRaw = i < ys.length ? ys[i].trim() : '';
      if (!xRaw || !yRaw) {
        errors.push('Row ' + (i + 1) + ': enter both an x-value and a y-value.');
        continue;
      }
      var x = Number(xRaw);
      var y = Number(yRaw);
      if (!isFinite(x) || !isFinite(y)) {
        errors.push('Row ' + (i + 1) + ': use numbers only.');
        continue;
      }
      if (x < 0 || y < 0) {
        errors.push('Row ' + (i + 1) + ': this first-quadrant graph requires nonnegative values.');
        continue;
      }
      pairs.push({ x: x, y: y });
    }
    return { pairs: pairs, errors: errors, complete: errors.length === 0, rowCount: rowCount };
  }

  function parsePairs(xText, yText) {
    var diagnostic = parsePairInput(xText, yText);
    return diagnostic.complete ? diagnostic.pairs : [];
  }

  function analyzeProportionalPairs(input) {
    var diagnostic = Array.isArray(input) ? { pairs: input, errors: [], complete: true } : (input || { pairs: [], errors: ['No coordinate data supplied.'], complete: false });
    var pairs = Array.isArray(diagnostic.pairs) ? diagnostic.pairs : [];
    var errors = Array.isArray(diagnostic.errors) ? diagnostic.errors : [];
    var nonzeroPairs = pairs.filter(function(pair) { return pair.x !== 0; });
    var hasInvalidOrigin = pairs.some(function(pair) { return pair.x === 0 && pair.y !== 0; });
    var rates = nonzeroPairs.map(function(pair) { return pair.y / pair.x; });
    var complete = diagnostic.complete !== false && errors.length === 0;
    var valid = complete && pairs.length >= 2 && nonzeroPairs.length > 0;
    var constantRate = valid && nonzeroPairs.every(function(pair) { return pairsShareUnitRate(nonzeroPairs[0], pair); });
    return {
      valid: valid,
      proportional: constantRate && !hasInvalidOrigin,
      rates: rates,
      constant: constantRate && !hasInvalidOrigin && isFinite(rates[0]) ? rates[0] : null,
      hasInvalidOrigin: hasInvalidOrigin,
      errors: errors.slice(),
      complete: complete
    };
  }

  root.RatioLabPure = {
    gcd: gcd,
    parsePairs: parsePairs,
    parsePairInput: parsePairInput,
    analyzeProportionalPairs: analyzeProportionalPairs,
    pairsShareUnitRate: pairsShareUnitRate,
    positiveAxisMaximum: positiveAxisMaximum,
    roundTo: roundTo,
    percentSegmentFills: percentSegmentFills,
    percentTapeModel: percentTapeModel,
    percentTapeSummary: percentTapeSummary,
    challengeIsCorrect: challengeIsCorrect,
    canonicalChallengeAnswer: canonicalChallengeAnswer,
    challenges: CHALLENGES
  };

  window.StemLab.registerTool('ratioLab', {
    icon: '\uD83D\uDCCA',
    label: 'Ratios, Rates & Proportions Lab',
    desc: 'Explore ratio tables, double number lines, unit rates, percents, and proportional relationships.',
    color: 'indigo',
    category: 'math',
    questHooks: [
      {
        id: 'ratio_explorer',
        label: 'Explore all 5 representations',
        icon: '\uD83E\uDDED',
        check: function(d) { return visitedCount(d) >= 5; },
        progress: function(d) { return visitedCount(d) + '/5 modes'; }
      },
      {
        id: 'ratio_challenger',
        label: 'Solve 5 unique challenges',
        icon: '\uD83C\uDFC6',
        check: function(d) { return solvedCount(d) >= 5; },
        progress: function(d) { return solvedCount(d) + '/5 solved'; }
      },
      {
        id: 'proportion_detective',
        label: 'Solve a proportionality challenge',
        icon: '\uD83D\uDD0E',
        check: function(d) { return solvedInMode(d, 'proportional'); },
        progress: function(d) { return solvedInMode(d, 'proportional') ? 'Solved!' : 'Not yet'; }
      }
    ],
    render: function(ctx) {
      var t = function (key, fallback) {
        try { var translated = typeof ctx.t === 'function' ? ctx.t(key, fallback) : null; return translated == null ? fallback : translated; }
        catch (_) { return fallback; }
      };
      ctx = ctx || {};
      var React = ctx.React;
      if (!React || typeof React.createElement !== 'function') return null;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = typeof ctx.setToolData === 'function' ? ctx.setToolData : function() {};
      var d = labToolData._ratioLab || {};
      var mode = CHALLENGES[d.mode] ? d.mode : 'ratioTable';
      var isDark = !!ctx.isDark;
      var isContrast = !!ctx.isContrast;
      var text = isContrast ? '#ffffff' : (isDark ? '#e2e8f0' : '#172033');
      var muted = isContrast ? '#f8fafc' : (isDark ? '#a9b7ca' : '#56657a');
      var panel = isContrast ? '#000000' : (isDark ? '#162033' : '#ffffff');
      var soft = isContrast ? '#101010' : (isDark ? '#101827' : '#f4f7ff');
      var border = isContrast ? '#ffffff' : (isDark ? '#3a4961' : '#cbd5e1');
      var accent = isContrast ? '#ffff00' : (isDark ? '#a5b4fc' : '#4f46e5');
      var accentStrong = isContrast ? '#ffff00' : (isDark ? '#a5b4fc' : '#4338ca');
      var accentText = isContrast ? '#000000' : (isDark ? '#111827' : '#ffffff');
      var success = isContrast ? '#00ff66' : (isDark ? '#6ee7b7' : '#047857');
      var warning = isContrast ? '#ffff00' : (isDark ? '#fcd34d' : '#a16207');
      var cardStyle = { background: panel, border: '1px solid ' + border };
      var inputStyle = { background: isDark || isContrast ? '#0b1220' : '#ffffff', color: text, border: '1px solid ' + border };

      function update(patch) {
        setLabToolData(function(previous) {
          previous = previous || {};
          var current = previous._ratioLab || {};
          var changes = typeof patch === 'function' ? patch(current) : patch;
          return Object.assign({}, previous, {
            _ratioLab: Object.assign({}, current, changes || {})
          });
        });
      }

      function announce(message) {
        if (typeof ctx.announceToSR === 'function') {
          try { ctx.announceToSR(message); return; } catch (error) {}
        }
        if (typeof document !== 'undefined') {
          var region = document.getElementById('allo-live-ratio-lab');
          if (region) region.textContent = message;
        }
      }

      function notify(message, kind) {
        if (typeof ctx.addToast === 'function') {
          try { ctx.addToast(message, kind || 'info'); } catch (error) {}
        }
      }

      function chooseMode(nextMode) {
        update(function(current) {
          var visited = Object.assign({}, current.modesVisited || {});
          var cursors = Object.assign({}, current.challengeCursorByMode || {});
          visited[mode] = true;
          visited[nextMode] = true;
          cursors[mode] = challenge.id;
          var nextChallenges = CHALLENGES[nextMode] || [];
          var savedCursor = cursors[nextMode];
          var nextIndex = typeof savedCursor === 'string'
            ? nextChallenges.findIndex(function(item) { return item.id === savedCursor; })
            : -1;
          if (nextIndex < 0) nextIndex = clamp(Math.floor(finiteNumber(savedCursor, 0)), 0, Math.max(0, nextChallenges.length - 1));
          var nextChallenge = nextChallenges[nextIndex] || nextChallenges[0];
          if (nextChallenge) cursors[nextMode] = nextChallenge.id;
          return { mode: nextMode, modesVisited: visited, challengeCursorByMode: cursors,
            challengeId: nextChallenge ? nextChallenge.id : null, challengeIndex: nextIndex,
            challengeAnswer: '', challengeAnswerId: null, challengeFeedback: null };
        });
        var selected = MODES.filter(function(item) { return item.id === nextMode; })[0];
        announce((selected ? selected.title : nextMode) + t('stem.ratios.opened', " opened."));
      }

      function moveMode(event, index) {
        var nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % MODES.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + MODES.length) % MODES.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = MODES.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        var nextMode = MODES[nextIndex].id;
        chooseMode(nextMode);
        if (typeof document !== 'undefined') {
          var nextTab = document.getElementById('ratio-tab-' + nextMode);
          if (nextTab) nextTab.focus();
        }
      }

      function numericField(label, value, key, options) {
        options = options || {};
        return h('label', { className: 'block text-xs font-semibold', key: key },
          h('span', { className: 'block mb-1', style: { color: muted } }, label),
          h('input', {
            type: 'number',
            value: value,
            min: options.min,
            max: options.max,
            step: options.step || 1,
            onChange: function(event) {
              var nextValue = finiteNumber(event.target.value, 0);
              if (options.min != null) nextValue = Math.max(options.min, nextValue);
              if (options.max != null) nextValue = Math.min(options.max, nextValue);
              var patch = {}; patch[key] = nextValue; update(patch);
            },
            className: 'w-full rounded-lg px-3 py-2 text-sm',
            style: inputStyle,
            'aria-label': label
          })
        );
      }

      function renderRatioTable() {
        var first = clamp(Math.round(finiteNumber(d.ratioA, 3)), 1, 100);
        var second = clamp(Math.round(finiteNumber(d.ratioB, 5)), 1, 100);
        var selectedFactor = clamp(Math.round(finiteNumber(d.ratioFactor, 4)), 1, 12);
        var divisor = gcd(first, second);
        var factors = [1, 2, 3, 4, 5];
        if (factors.indexOf(selectedFactor) === -1) factors.push(selectedFactor);
        factors.sort(function(a, b) { return a - b; });
        return h('div', { className: 'grid lg:grid-cols-[minmax(230px,0.8fr)_minmax(300px,1.2fr)] gap-4' },
          h('div', { className: 'rounded-xl p-4 space-y-3', style: cardStyle },
            h('h3', { className: 'font-bold' }, t('stem.ratios.build_an_equivalent_ratio_family', "Build an equivalent-ratio family")),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              numericField(t('stem.ratios.first_quantity', "First quantity"), first, 'ratioA', { min: 1, max: 100 }),
              numericField(t('stem.ratios.second_quantity', "Second quantity"), second, 'ratioB', { min: 1, max: 100 })
            ),
            numericField(t('stem.ratios.scale_factor', "Scale factor"), selectedFactor, 'ratioFactor', { min: 1, max: 12 }),
            h('div', { className: 'rounded-lg p-3 text-center', style: { background: soft, border: '1px solid ' + border } },
              h('div', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.scaled_ratio', "Scaled ratio")),
              h('div', { className: 'text-2xl font-black', style: { color: accent } }, (first * selectedFactor) + ':' + (second * selectedFactor)),
              h('div', { className: 'text-xs mt-1', style: { color: muted } }, first + ' \u00D7 ' + selectedFactor + t('stem.ratios.and', " and ") + second + ' \u00D7 ' + selectedFactor)
            ),
            h('p', { className: 'text-sm' },
              h('strong', null, t('stem.ratios.simplest_form', "Simplest form: ")), (first / divisor) + ':' + (second / divisor), t('stem.ratios.divide_both_quantities_by', ". Divide both quantities by "), divisor, '.'
            )
          ),
          h('div', { className: 'rounded-xl p-4 overflow-x-auto', style: cardStyle },
            h('table', { className: 'w-full text-sm border-collapse' },
              h('caption', { className: 'text-left font-bold mb-3' }, t('stem.ratios.equivalent_ratio_table_for', "Equivalent ratio table for ") + first + ':' + second),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col', className: 'p-2 text-left', style: { borderBottom: '2px solid ' + border } }, t('stem.ratios.scale_factor', "Scale factor")),
                h('th', { scope: 'col', className: 'p-2 text-right', style: { borderBottom: '2px solid ' + border } }, t('stem.ratios.first_quantity', "First quantity")),
                h('th', { scope: 'col', className: 'p-2 text-right', style: { borderBottom: '2px solid ' + border } }, t('stem.ratios.second_quantity', "Second quantity"))
              )),
              h('tbody', null, factors.map(function(factor) {
                var active = factor === selectedFactor;
                return h('tr', { key: factor, style: { background: active ? (isContrast ? accentStrong : (isDark ? '#312e81' : '#eef2ff')) : 'transparent', color: active && isContrast ? accentText : text } },
                  h('th', { scope: 'row', className: 'p-2 text-left' }, '\u00D7' + factor + (active ? t('stem.ratios.selected', " (selected)") : '')),
                  h('td', { className: 'p-2 text-right font-mono' }, first * factor),
                  h('td', { className: 'p-2 text-right font-mono' }, second * factor)
                );
              }))
            ),
            h('p', { className: 'text-xs mt-3', style: { color: muted } }, 'Equivalent ratios preserve the multiplicative relationship: both columns must use the same scale factor.')
          )
        );
      }

      function renderNumberLine() {
        var topUnit = clamp(finiteNumber(d.lineTopUnit, 2), 0.1, 1000);
        var bottomUnit = clamp(finiteNumber(d.lineBottomUnit, 5), 0.1, 1000);
        var steps = clamp(Math.round(finiteNumber(d.lineSteps, 5)), 2, 8);
        var ticks = [];
        for (var i = 0; i <= steps; i++) ticks.push(i);
        return h('div', { className: "grid lg:grid-cols-[250px_1fr] gap-4" },
          h('div', { className: 'rounded-xl p-4 space-y-3', style: cardStyle },
            h('h3', { className: 'font-bold' }, t('stem.ratios.set_one_aligned_interval', "Set one aligned interval")),
            numericField(t('stem.ratios.top_line_value_per_interval', "Top-line value per interval"), topUnit, 'lineTopUnit', { min: 0.1, step: 0.1 }),
            numericField(t('stem.ratios.bottom_line_value_per_interval', "Bottom-line value per interval"), bottomUnit, 'lineBottomUnit', { min: 0.1, step: 0.1 }),
            numericField(t('stem.ratios.number_of_intervals', "Number of intervals"), steps, 'lineSteps', { min: 2, max: 8 }),
            h('div', { className: 'rounded-lg p-3 text-sm', style: { background: soft, border: '1px solid ' + border } },
              h('strong', null, t('stem.ratios.unit_relationship', "Unit relationship: ")), t('stem.ratios.n_1_top_unit_corresponds_to', "1 top unit corresponds to "), formatNumber(bottomUnit / topUnit), t('stem.ratios.bottom_units', " bottom units.")
            )
          ),
          h('div', { className: 'rounded-xl p-3 sm:p-4', style: cardStyle },
            h('svg', {
              viewBox: '0 0 500 190',
              className: 'w-full min-h-[190px]',
              role: 'img',
              'aria-labelledby': 'ratio-line-title ratio-line-desc'
            },
              h('title', { id: 'ratio-line-title' }, t('stem.ratios.double_number_line', "Double number line")),
              h('desc', { id: 'ratio-line-desc' }, t('stem.ratios.the_top_line_increases_by', "The top line increases by ") + topUnit + t('stem.ratios.per_interval_and_the_bottom_line_incre', " per interval and the bottom line increases by ") + bottomUnit + t('stem.ratios.per_interval_for', " per interval for ") + steps + t('stem.ratios.intervals', " intervals.")),
              h('text', { x: 12, y: 55, style: { fill: text, fontSize: '12px', fontWeight: 'bold' } }, 'Top'),
              h('text', { x: 12, y: 135, style: { fill: text, fontSize: '12px', fontWeight: 'bold' } }, t('stem.ratios.bottom', "Bottom")),
              h('line', { x1: 55, y1: 60, x2: 465, y2: 60, stroke: accent, strokeWidth: 4, strokeLinecap: 'round' }),
              h('line', { x1: 55, y1: 140, x2: 465, y2: 140, stroke: success, strokeWidth: 4, strokeLinecap: 'round' }),
              ticks.map(function(tick) {
                var x = 55 + tick * (410 / steps);
                return h('g', { key: 'tick-' + tick },
                  h('line', { x1: x, y1: 51, x2: x, y2: 69, stroke: text, strokeWidth: 2 }),
                  h('line', { x1: x, y1: 131, x2: x, y2: 149, stroke: text, strokeWidth: 2 }),
                  h('line', { x1: x, y1: 70, x2: x, y2: 130, stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                  h('text', { x: x, y: 42, textAnchor: 'middle', style: { fill: text, fontSize: '11px' } }, formatNumber(tick * topUnit)),
                  h('text', { x: x, y: 170, textAnchor: 'middle', style: { fill: text, fontSize: '11px' } }, formatNumber(tick * bottomUnit))
                );
              })
            ),
            h('p', { className: 'text-xs text-center', style: { color: muted } }, 'Each vertical guide connects values produced by the same scale factor.')
          )
        );
      }

      function renderUnitRates() {
        var amountA = clamp(finiteNumber(d.amountA, 12), 0, MAX_UNIT_RATE_VALUE);
        var costA = clamp(finiteNumber(d.costA, 3.6), 0, MAX_UNIT_RATE_VALUE);
        var amountB = clamp(finiteNumber(d.amountB, 20), 0, MAX_UNIT_RATE_VALUE);
        var costB = clamp(finiteNumber(d.costB, 5.4), 0, MAX_UNIT_RATE_VALUE);
        var computedRateA = amountA > 0 ? costA / amountA : null;
        var computedRateB = amountB > 0 ? costB / amountB : null;
        var rateA = computedRateA !== null && isFinite(computedRateA) ? computedRateA : null;
        var rateB = computedRateB !== null && isFinite(computedRateB) ? computedRateB : null;
        var comparison = t('stem.ratios.enter_an_amount_greater_than_zero_for_', "Enter an amount greater than zero for both options.");
        if (rateA !== null && rateB !== null) {
          comparison = nearlyEqual(rateA, rateB) ? t('stem.ratios.both_options_have_the_same_cost_per_un', "Both options have the same cost per unit.") : (rateA < rateB ? t('stem.ratios.option_a_has_the_lower_cost_per_unit', "Option A has the lower cost per unit.") : t('stem.ratios.option_b_has_the_lower_cost_per_unit', "Option B has the lower cost per unit."));
        } else if (amountA > 0 && amountB > 0) {
          comparison = t('stem.ratios.adjust_the_values_so_both_unit_rates_s', "Adjust the values so both unit rates stay within the learning-model range.");
        }

        function optionCard(name, amount, cost, amountKey, costKey, rate) {
          return h('fieldset', { className: 'rounded-xl p-4 space-y-3', style: cardStyle },
            h('legend', { className: 'px-2 font-bold' }, name),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              numericField(name + t('stem.ratios.quantity', " quantity"), amount, amountKey, { min: 0, max: MAX_UNIT_RATE_VALUE, step: 0.1 }),
              numericField(name + t('stem.ratios.cost_in_dollars', " cost in dollars"), cost, costKey, { min: 0, max: MAX_UNIT_RATE_VALUE, step: 0.01 })
            ),
            h('div', { className: 'rounded-lg p-3 text-center', style: { background: soft, border: '1px solid ' + border } },
              h('div', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.cost_for_1_unit', "Cost for 1 unit")),
              h('div', { className: 'text-2xl font-black', style: { color: rate === null ? warning : accent } }, rate === null ? (amount > 0 ? t('stem.ratios.rate_outside_model_range', "Rate outside model range") : t('stem.ratios.needs_a_quantity', "Needs a quantity")) : '$' + formatNumber(rate)),
              rate !== null && h('div', { className: 'text-xs', style: { color: muted } }, '$' + formatNumber(cost) + ' \u00F7 ' + formatNumber(amount))
            )
          );
        }

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'grid md:grid-cols-2 gap-4' },
            optionCard(t('stem.ratios.option_a', "Option A"), amountA, costA, 'amountA', 'costA', rateA),
            optionCard(t('stem.ratios.option_b', "Option B"), amountB, costB, 'amountB', 'costB', rateB)
          ),
          h('div', { className: 'rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2', role: 'status', 'aria-live': 'polite', style: { background: soft, border: '1px solid ' + border } },
            h('span', { className: 'text-xl', 'aria-hidden': 'true' }, '\u2696\uFE0F'),
            h('div', null,
              h('div', { className: 'font-bold' }, comparison),
              h('div', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.a_fair_comparison_divides_each_cost_by', "A fair comparison divides each cost by its own quantity. Context may also involve quality, waste, or other needs."))
            )
          )
        );
      }

      function renderPercent() {
        var kind = ['findPart', 'findPercent', 'findWhole'].indexOf(d.percentKind) >= 0 ? d.percentKind : 'findPart';
        var percent = clamp(finiteNumber(d.percentValue, 25), 0, MAX_PERCENT);
        var whole = clamp(finiteNumber(d.percentWhole, 80), 0, MAX_PERCENT_QUANTITY);
        var part = clamp(finiteNumber(d.percentPart, 20), 0, MAX_PERCENT_QUANTITY);
        var result;
        var formula;
        var resultLabel;
        var resultIssue = '';
        if (kind === 'findPercent') {
          result = whole > 0 ? part / whole * 100 : null;
          formula = t('stem.ratios.part_whole_100', "part ÷ whole × 100");
          resultLabel = t('stem.ratios.percent', "Percent");
        } else if (kind === 'findWhole') {
          result = percent > 0 ? part / (percent / 100) : null;
          formula = t('stem.ratios.part_percent_100', "part ÷ (percent ÷ 100)");
          resultLabel = t('stem.ratios.whole', "Whole");
        } else {
          result = whole * (percent / 100);
          formula = t('stem.ratios.whole_percent_100', "whole × (percent ÷ 100)");
          resultLabel = t('stem.ratios.part', "Part");
        }
        var resultLimit = kind === 'findPercent' ? MAX_PERCENT : MAX_PERCENT_QUANTITY;
        if (result != null && (!isFinite(result) || result > resultLimit)) {
          result = null;
          resultIssue = kind === 'findPercent'
            ? t('stem.ratios.this_example_is_above_the_1000_learnin', "This example is above the 1000% learning-model limit. Adjust the part or whole.")
            : t('stem.ratios.this_result_is_above_the_1_000_000_qua', "This result is above the 1,000,000 quantity limit. Adjust the example values.");
        }
        var tapePercent = kind === 'findPercent' ? (result == null ? 0 : result) : percent;
        var tapeModel = percentTapeModel(tapePercent, 6);
        var tapeSummary = resultIssue || (result == null
          ? (kind === 'findPercent' ? t('stem.ratios.the_percent_is_not_defined_when_the_wh', "The percent is not defined when the whole is zero. Enter a positive whole to build the tape.") : t('stem.ratios.the_whole_is_not_defined_when_the_perc', "The whole is not defined when the percent is zero. Enter a positive percent to build the tape."))
          : percentTapeSummary(tapeModel));

        function renderPercentTape(tape, tapeIndex) {
          var wholeNumber = tape.complete ? tapeIndex + 1 : tapeModel.wholeCount + 1;
          var titleId = 'ratio-percent-tape-title-' + tapeIndex;
          var descId = 'ratio-percent-tape-desc-' + tapeIndex;
          var fullSegments = tape.fills.filter(function(fill) { return fill === 1; }).length;
          var partialSegment = tape.fills.filter(function(fill) { return fill > 0 && fill < 1; })[0];
          var description = t('stem.ratios.ten_equal_sections_each_represent_10_o', "Ten equal sections each represent 10% of one whole. ") + fullSegments + t('stem.ratios.sections_are_completely_filled', " sections are completely filled.");
          if (partialSegment != null) {
            description += t('stem.ratios.the_next_section_is', " The next section is ") + formatNumber(partialSegment * 100) + t('stem.ratios.filled_representing', "% filled, representing ") + formatNumber(partialSegment * 10) + t('stem.ratios.of_the_whole', "% of the whole.");
          }
          if (!fullSegments && partialSegment == null) description += t('stem.ratios.no_sections_are_filled', " No sections are filled.");

          return h('div', {
            key: 'percent-tape-' + tapeIndex,
            className: 'rounded-lg p-3 space-y-2',
            style: { background: soft, border: '1px solid ' + border },
            'data-percent-tape': tapeIndex + 1,
            'data-tape-percent': formatNumber(tape.percent)
          },
            h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2 text-xs' },
              h('strong', null, t('stem.ratios.whole_2', "Whole ") + wholeNumber),
              h('span', { style: { color: muted } }, formatNumber(tape.percent) + t('stem.ratios.filled', "% filled"))
            ),
            h('svg', {
              viewBox: '0 0 500 62',
              className: 'w-full min-h-[62px]',
              role: 'img',
              'aria-labelledby': titleId + ' ' + descId,
              'data-tape-percent': formatNumber(tape.percent),
              preserveAspectRatio: "xMidYMid meet"
            },
              h('title', { id: titleId }, t('stem.ratios.whole_2', "Whole ") + wholeNumber + ' percent tape: ' + formatNumber(tape.percent) + t('stem.ratios.filled', "% filled")),
              h('desc', { id: descId }, description),
              tape.fills.map(function(fill, segmentIndex) {
                var x = segmentIndex * 50 + 1;
                return h('g', { key: 'percent-segment-' + segmentIndex, 'data-percent-segment': segmentIndex + 1 },
                  h('rect', { x: x, y: 8, width: 48, height: 32, rx: 2, fill: soft }),
                  fill > 0 && h('rect', {
                    x: x,
                    y: 8,
                    width: roundTo(48 * fill, 3),
                    height: 32,
                    rx: fill === 1 ? 2 : 0,
                    fill: accentStrong,
                    'data-fill-fraction': formatNumber(fill, 6),
                    'aria-hidden': 'true'
                  }),
                  h('rect', { x: x, y: 8, width: 48, height: 32, rx: 2, fill: 'none', stroke: border, strokeWidth: 1.5, 'aria-hidden': 'true' }),
                  h('text', { x: x + 24, y: 55, textAnchor: 'middle', fontSize: 8, fontWeight: '700', fill: muted, 'aria-hidden': 'true' }, (segmentIndex + 1) * 10 + '%')
                );
              })
            )
          );
        }

        return h('div', { className: "grid lg:grid-cols-[280px_1fr] gap-4" },
          h('div', { className: 'rounded-xl p-4 space-y-3', style: cardStyle },
            h('label', { className: 'block text-xs font-semibold' },
              h('span', { className: 'block mb-1', style: { color: muted } }, t('stem.ratios.choose_the_unknown', "Choose the unknown")),
              h('select', { value: kind, onChange: function(event) { update({ percentKind: event.target.value }); }, className: 'w-full rounded-lg px-3 py-2 text-sm', style: inputStyle },
                h('option', { value: 'findPart' }, t('stem.ratios.find_the_part', "Find the part")),
                h('option', { value: 'findPercent' }, t('stem.ratios.find_the_percent', "Find the percent")),
                h('option', { value: 'findWhole' }, t('stem.ratios.find_the_whole', "Find the whole"))
              )
            ),
            kind !== 'findWhole' && numericField(t('stem.ratios.whole', "Whole"), whole, 'percentWhole', { min: 0, max: MAX_PERCENT_QUANTITY, step: 0.1 }),
            kind !== 'findPercent' && numericField(t('stem.ratios.percent', "Percent"), percent, 'percentValue', { min: 0, max: MAX_PERCENT, step: 0.1 }),
            kind !== 'findPart' && numericField(t('stem.ratios.part', "Part"), part, 'percentPart', { min: 0, max: MAX_PERCENT_QUANTITY, step: 0.1 }),
            h('p', { className: 'text-xs', style: { color: muted }, role: 'note' }, t('stem.ratios.learning_model_range_0_to_1000_quantit', "Learning-model range: 0% to 1000%; quantities up to 1,000,000."))
          ),
          h('div', { className: 'rounded-xl p-4 space-y-4', style: cardStyle },
            h('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
              h('div', null,
                h('div', { className: 'text-xs', style: { color: muted } }, resultLabel),
                h('div', { className: 'text-3xl font-black', style: { color: result == null ? warning : accent } }, result == null ? t('stem.ratios.not_defined', "Not defined") : formatNumber(result) + (kind === 'findPercent' ? '%' : ''))
              ),
              h('code', { className: 'rounded-lg px-3 py-2 text-xs', style: { background: soft, border: '1px solid ' + border } }, formula)
            ),
            h('div', { className: 'space-y-3', 'data-percent-tape-total': formatNumber(tapeModel.percent), 'data-percent-tape-count': tapeModel.totalTapeCount },
              h('p', { id: 'ratio-percent-tape-summary', className: 'text-sm font-semibold', style: { color: text } }, tapeSummary),
              h('p', { id: 'ratio-percent-tape-key', className: 'text-xs', style: { color: muted } }, t('stem.ratios.each_outlined_section_is_exactly_10_of', "Each outlined section is exactly 10% of one whole. A partially filled section shows the exact fraction of that 10% section.")),
              h('div', { className: 'space-y-3', 'aria-describedby': 'ratio-percent-tape-summary ratio-percent-tape-key' }, tapeModel.tapes.map(renderPercentTape)),
              tapeModel.hiddenWholeCount > 0 && h('p', { className: 'text-xs font-semibold', style: { color: muted }, role: 'note' }, t('stem.ratios.showing', "Showing ") + (tapeModel.tapes.length - (tapeModel.remainderPercent > 0 ? 1 : 0)) + t('stem.ratios.complete_whole_tapes', " complete whole tapes; ") + tapeModel.hiddenWholeCount + t('stem.ratios.additional_complete', " additional complete ") + (tapeModel.hiddenWholeCount === 1 ? t('stem.ratios.whole_is', "whole is") : t('stem.ratios.wholes_are', "wholes are")) + t('stem.ratios.summarized_above', " summarized above."))
            )
          )
        );
      }

      function renderProportional() {
        var xText = d.propX == null ? '0, 1, 2, 4' : d.propX;
        var yText = d.propY == null ? '0, 3, 6, 12' : d.propY;
        var pairInput = parsePairInput(xText, yText);
        var pairs = pairInput.pairs;
        var analysis = analyzeProportionalPairs(pairInput);
        var rates = analysis.rates;
        var proportional = analysis.proportional;
        var validForDecision = analysis.valid;
        var graphPairs = pairInput.complete ? pairs.slice().sort(function(a, b) { return a.x - b.x; }) : [];
        var maxX = positiveAxisMaximum(graphPairs.map(function(pair) { return pair.x; }));
        var maxY = positiveAxisMaximum(graphPairs.map(function(pair) { return pair.y; }));
        function scaleX(value) { return 42 + (value / maxX) * 290; }
        function scaleY(value) { return 185 - (value / maxY) * 145; }
        var xTicks = [0, maxX / 2, maxX];
        var yTicks = [0, maxY / 2, maxY];
        var includesOrigin = graphPairs.some(function(pair) { return pair.x === 0 && pair.y === 0; });
        var verdict = pairInput.errors.length ? pairInput.errors[0] : !validForDecision ? t('stem.ratios.enter_at_least_two_valid_coordinate_pa', "Enter at least two valid coordinate pairs, including one with a nonzero x-value.") : (proportional ? t('stem.ratios.proportional_the_unit_rate_is_constant', "Proportional: the unit rate is constant.") : t('stem.ratios.not_proportional_the_evidence_does_not', "Not proportional: the evidence does not show one constant unit rate through the origin."));

        function setExample(isProportional) {
          update(isProportional ? { propX: '0, 1, 2, 4', propY: '0, 3, 6, 12' } : { propX: '0, 1, 2, 4', propY: '0, 3, 7, 12' });
          announce((isProportional ? t('stem.ratios.proportional', "Proportional") : t('stem.ratios.non_proportional', "Non-proportional")) + t('stem.ratios.example_loaded', " example loaded."));
        }

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'rounded-xl p-4', style: cardStyle },
            h('div', { className: 'flex flex-wrap justify-between items-center gap-2 mb-3' },
              h('h3', { className: 'font-bold' }, t('stem.ratios.test_a_relationship', "Test a relationship")),
              h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.ratios.load_table_example', "Load table example") },
                h('button', { type: 'button', onClick: function() { setExample(true); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { border: '1px solid ' + border, background: soft, color: text } }, t('stem.ratios.load_proportional', "Load proportional")),
                h('button', { type: 'button', onClick: function() { setExample(false); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { border: '1px solid ' + border, background: soft, color: text } }, t('stem.ratios.load_non_proportional', "Load non-proportional"))
              )
            ),
            h('div', { className: 'grid sm:grid-cols-2 gap-3' },
              h('label', { className: 'text-xs font-semibold' },
                h('span', { className: 'block mb-1', style: { color: muted } }, t('stem.ratios.x_values_comma_separated', "x-values (comma separated)")),
                h('input', { value: xText, onChange: function(event) { update({ propX: event.target.value }); }, className: 'w-full rounded-lg px-3 py-2 text-sm font-mono', style: inputStyle, 'aria-label': t('stem.ratios.x_values_comma_separated_2', "x-values, comma separated") })
              ),
              h('label', { className: 'text-xs font-semibold' },
                h('span', { className: 'block mb-1', style: { color: muted } }, t('stem.ratios.y_values_comma_separated', "y-values (comma separated)")),
                h('input', { value: yText, onChange: function(event) { update({ propY: event.target.value }); }, className: 'w-full rounded-lg px-3 py-2 text-sm font-mono', style: inputStyle, 'aria-label': t('stem.ratios.y_values_comma_separated_2', "y-values, comma separated") })
              )
            ),
            h('p', { className: 'text-xs mt-2', style: { color: muted } }, t('stem.ratios.use_the_same_number_of_x_and_y_values_', "Use the same number of x- and y-values. This first-quadrant graph requires a nonnegative number in every row.")),
            pairInput.errors.length > 0 && h('div', { role: 'alert', className: 'mt-3 rounded-lg p-3 text-xs font-semibold', style: { background: soft, color: warning, border: '1px solid ' + warning } },
              h('p', { className: 'font-bold' }, t('stem.ratios.fix_the_coordinate_list_before_making_', "Fix the coordinate list before making a proportionality decision:")),
              h('ul', { className: 'mt-1 list-disc pl-5 space-y-1' }, pairInput.errors.map(function(error, index) { return h('li', { key: index }, error); }))
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: 'rounded-xl p-4 overflow-x-auto', style: cardStyle },
              h('table', { className: 'w-full text-sm' },
                h('caption', { className: 'text-left font-bold mb-2' }, t('stem.ratios.table_and_unit_rate_evidence', "Table and unit-rate evidence")),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'p-2 text-left', style: { borderBottom: '2px solid ' + border } }, 'x'),
                  h('th', { scope: 'col', className: 'p-2 text-left', style: { borderBottom: '2px solid ' + border } }, 'y'),
                  h('th', { scope: 'col', className: 'p-2 text-left', style: { borderBottom: '2px solid ' + border } }, t('stem.ratios.y_x', "y ÷ x"))
                )),
                h('tbody', null, pairs.length ? pairs.map(function(pair, index) {
                  return h('tr', { key: index },
                    h('td', { className: 'p-2 font-mono' }, formatNumber(pair.x)),
                    h('td', { className: 'p-2 font-mono' }, formatNumber(pair.y)),
                    h('td', { className: 'p-2 font-mono' }, pair.x === 0 ? (pair.y === 0 ? 'origin' : 'undefined') : formatNumber(pair.y / pair.x))
                  );
                }) : h('tr', null, h('td', { colSpan: 3, className: 'p-4 text-center', style: { color: muted } }, t('stem.ratios.no_valid_paired_rows_yet', "No valid paired rows yet."))))
              )
            ),
            h('div', { className: 'rounded-xl p-3', style: cardStyle },
              h('svg', { viewBox: '0 0 360 220', className: 'w-full min-h-[220px]', role: 'img', 'aria-labelledby': 'ratio-graph-title ratio-graph-desc', 'data-axis-max-x': formatNumber(maxX, 6), 'data-axis-max-y': formatNumber(maxY, 6) },
                h('title', { id: 'ratio-graph-title' }, t('stem.ratios.relationship_graph', "Relationship graph")),
                h('desc', { id: 'ratio-graph-desc' }, graphPairs.length ? t('stem.ratios.graph_of', "Graph of ") + graphPairs.length + t('stem.ratios.plotted_table_points', " plotted table points. ") + (proportional && !includesOrigin ? t('stem.ratios.a_proportional_model_ray_is_extended_t', "A proportional model ray is extended through the origin. ") : '') + verdict : t('stem.ratios.no_complete_set_of_points_is_available', "No complete set of points is available to graph. ") + verdict),
                xTicks.map(function(value, index) {
                  return h('g', { key: 'x-tick-' + index },
                    h('line', { x1: scaleX(value), y1: 40, x2: scaleX(value), y2: 185, stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                    h('text', { x: scaleX(value), y: 201, textAnchor: 'middle', style: { fill: muted, fontSize: '9px' } }, formatNumber(value))
                  );
                }),
                yTicks.map(function(value, index) {
                  return h('g', { key: 'y-tick-' + index },
                    h('line', { x1: 42, y1: scaleY(value), x2: 332, y2: scaleY(value), stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                    h('text', { x: 36, y: scaleY(value) + 3, textAnchor: 'end', style: { fill: muted, fontSize: '9px' } }, formatNumber(value))
                  );
                }),
                h('line', { x1: 42, y1: 185, x2: 340, y2: 185, stroke: text, strokeWidth: 2 }),
                h('line', { x1: 42, y1: 185, x2: 42, y2: 28, stroke: text, strokeWidth: 2 }),
                h('text', { x: 340, y: 216, textAnchor: 'end', style: { fill: muted, fontSize: '10px', fontWeight: 'bold' } }, t('stem.ratios.x_quantity', "x quantity")),
                h('text', { x: 8, y: 24, style: { fill: muted, fontSize: '10px', fontWeight: 'bold' } }, t('stem.ratios.y_quantity', "y quantity")),
                validForDecision && proportional && analysis.constant !== null && h('line', { x1: scaleX(0), y1: scaleY(0), x2: scaleX(maxX), y2: scaleY(analysis.constant * maxX), stroke: success, strokeWidth: 3, 'data-proportional-ray': 'true' }),
                graphPairs.map(function(pair, index) {
                  return h('g', { key: index },
                    h('circle', { cx: scaleX(pair.x), cy: scaleY(pair.y), r: 5, fill: accentStrong, stroke: panel, strokeWidth: 2 }, h('title', null, '(' + pair.x + ', ' + pair.y + ')')),
                    h('text', { x: scaleX(pair.x) + 6, y: scaleY(pair.y) - 7, style: { fill: text, fontSize: '9px' } }, '(' + formatNumber(pair.x) + ',' + formatNumber(pair.y) + ')')
                  );
                })
              )
            )
          ),
          h('div', { className: 'rounded-xl p-4', role: 'status', 'aria-live': 'polite', style: { background: soft, border: '1px solid ' + border } },
            h('div', { className: 'font-bold', style: { color: validForDecision ? (proportional ? success : warning) : muted } }, verdict),
            validForDecision && h('p', { className: 'text-xs mt-1', style: { color: muted } }, proportional ? t('stem.ratios.table_evidence_all_defined_y_x_values_', "Table evidence: all defined y ÷ x values equal ") + formatNumber(rates[0]) + t('stem.ratios.graph_evidence', ". Graph evidence: ") + (includesOrigin ? t('stem.ratios.the_entered_points_include_0_0_and_fol', "the entered points include (0,0) and follow the model ray.") : t('stem.ratios.the_model_ray_extends_the_constant_rel', "the model ray extends the constant relationship through (0,0), even though the origin was not entered.")) : t('stem.ratios.check_for_changing_y_x_values_a_nonzer', "Check for changing y ÷ x values, a nonzero y-value when x = 0, or points that do not lie on one straight line through the origin."))
          )
        );
      }

      function renderModeContent() {
        if (mode === 'numberLine') return renderNumberLine();
        if (mode === 'unitRates') return renderUnitRates();
        if (mode === 'percent') return renderPercent();
        if (mode === 'proportional') return renderProportional();
        return renderRatioTable();
      }

      var modeInfo = MODES.filter(function(item) { return item.id === mode; })[0] || MODES[0];
      var modeChallenges = CHALLENGES[mode];
      var savedModeCursor = (d.challengeCursorByMode || {})[mode];
      var cursorChallengeIndex = typeof savedModeCursor === 'string'
        ? modeChallenges.findIndex(function(item) { return item.id === savedModeCursor; })
        : -1;
      var directChallengeIndex = typeof d.challengeId === 'string'
        ? modeChallenges.findIndex(function(item) { return item.id === d.challengeId; })
        : -1;
      var legacyCursor = cursorChallengeIndex < 0 && (typeof savedModeCursor === 'number' || /^\d+$/.test(String(savedModeCursor == null ? '' : savedModeCursor)))
        ? savedModeCursor : d.challengeIndex;
      var legacyChallengeIndex = clamp(Math.floor(finiteNumber(legacyCursor, 0)), 0, modeChallenges.length - 1);
      var challengeIndex = cursorChallengeIndex >= 0 ? cursorChallengeIndex : (directChallengeIndex >= 0 ? directChallengeIndex : legacyChallengeIndex);
      var challenge = modeChallenges[challengeIndex];
      var challengeSolved = !!((d.solvedChallenges || {})[challenge.id]);
      var challengeHintStage = d.challengeHintId === challenge.id ? clamp(Math.floor(finiteNumber(d.challengeHintStage, 0)), 0, 2) : 0;
      var strategyHint = mode === 'numberLine' ? t('stem.ratios.hint_align_known_values_first', "First align the known values, then locate a helpful unit or scale step.") :
        mode === 'unitRates' ? t('stem.ratios.hint_rewrite_each_situation_per_one', "Rewrite each situation per one unit before comparing.") :
        mode === 'percent' ? t('stem.ratios.hint_identify_part_percent_and_whole', "Identify the part, percent, and whole before choosing an operation.") :
        mode === 'proportional' ? t('stem.ratios.hint_compare_y_divided_by_x', "Compare y divided by x and check whether the graph follows one line through the origin.") :
        t('stem.ratios.hint_find_a_common_scale_factor', "Look for one scale factor that changes both quantities together.");
      var missedChallengeIds = modeChallenges.filter(function(item) {
        return !!((d.missedChallenges || {})[item.id]) && !((d.solvedChallenges || {})[item.id]);
      }).map(function(item) { return item.id; });
      var feedback = d.challengeFeedback;
      if (feedback && feedback.challengeId !== challenge.id) feedback = null;
      if (challengeSolved && (!feedback || !feedback.correct)) {
        feedback = { challengeId: challenge.id, correct: true, message: t('stem.ratios.solved_previously', "Solved previously. ") + challenge.explain };
      }
      var scopedChallengeAnswer = d.challengeAnswerId === challenge.id && d.challengeAnswer != null ? d.challengeAnswer : '';
      var displayedChallengeAnswer = challengeSolved ? canonicalChallengeAnswer(challenge) : scopedChallengeAnswer;
      var challengeCheckPending = false;

      function advanceChallengeHint() {
        var nextStage = challengeHintStage >= 2 ? 0 : challengeHintStage + 1;
        update({ challengeHintId: nextStage ? challenge.id : null, challengeHintStage: nextStage });
        announce(nextStage ? t('stem.ratios.hint_revealed', "Hint revealed.") : t('stem.ratios.hints_hidden', "Hints hidden."));
      }

      function checkChallenge() {
        if (challengeSolved || challengeCheckPending) return;
        if (!normalizeAnswer(scopedChallengeAnswer)) {
          update({ challengeId: challenge.id, challengeIndex: challengeIndex,
            challengeFeedback: { challengeId: challenge.id, correct: false, message: t('stem.ratios.enter_an_answer_before_checking', "Enter an answer before checking.") } });
          announce(t('stem.ratios.enter_an_answer_before_checking', "Enter an answer before checking."));
          return;
        }
        var correct = challengeIsCorrect(challenge, scopedChallengeAnswer);
        if (correct) {
          challengeCheckPending = true;
          var firstSolve = !((d.solvedChallenges || {})[challenge.id]);
          update(function(current) {
            var solved = Object.assign({}, current.solvedChallenges || {});
            var missed = Object.assign({}, current.missedChallenges || {});
            solved[challenge.id] = true;
            delete missed[challenge.id];
            return { solvedChallenges: solved, missedChallenges: missed,
              challengeAttempts: (current.challengeAttempts || 0) + 1,
              challengeFeedback: { challengeId: challenge.id, correct: true, message: t('stem.ratios.correct', "Correct! ") + challenge.explain } };
          });
          announce(t('stem.ratios.correct_2', "Correct. ") + challenge.explain);
          if (firstSolve && typeof ctx.awardXP === 'function') {
            try { ctx.awardXP('ratioLab', 15, t('stem.ratios.ratio_lab_challenge', "Ratio Lab challenge")); } catch (error) {}
          }
          if (firstSolve) notify(t('stem.ratios.challenge_solved_15_xp', "Challenge solved! +15 XP"), 'success');
        } else {
          update(function(current) {
            var missed = Object.assign({}, current.missedChallenges || {});
            missed[challenge.id] = true;
            return { missedChallenges: missed, challengeAttempts: (current.challengeAttempts || 0) + 1,
              challengeFeedback: { challengeId: challenge.id, correct: false, message: t('stem.ratios.not_yet', "Not yet. ") + challenge.hint } };
          });
          announce(t('stem.ratios.not_yet', "Not yet. ") + challenge.hint);
        }
      }

      function selectChallenge(next, message) {
        var nextChallengeItem = modeChallenges[next];
        update(function(current) {
          var cursors = Object.assign({}, current.challengeCursorByMode || {});
          cursors[mode] = nextChallengeItem.id;
          return { challengeCursorByMode: cursors, challengeId: nextChallengeItem.id,
            challengeIndex: next, challengeAnswer: '', challengeAnswerId: null, challengeFeedback: null, challengeHintId: null, challengeHintStage: 0 };
        });
        announce(message || (t('stem.ratios.challenge', "Challenge ") + (next + 1) + t('stem.ratios.of', " of ") + modeChallenges.length + '.'));
      }

      function moveChallenge(direction) {
        selectChallenge((challengeIndex + direction + modeChallenges.length) % modeChallenges.length);
      }

      function retryMissedChallenge() {
        if (!missedChallengeIds.length) return;
        var currentPosition = missedChallengeIds.indexOf(challenge.id);
        var nextId = missedChallengeIds[currentPosition < 0 ? 0 : (currentPosition + 1) % missedChallengeIds.length];
        var next = modeChallenges.findIndex(function(item) { return item.id === nextId; });
        selectChallenge(next, t('stem.ratios.retrying_missed_challenge', "Retrying missed challenge."));
      }

      return h('div', { className: 'p-3 sm:p-5 space-y-4', style: { color: text, background: isContrast ? '#000000' : (isDark ? '#0c1322' : '#f8fafc') } },
        h('header', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
          h('div', { className: 'flex items-start gap-3' },
            h('button', {
              type: 'button',
              onClick: function() {
                if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null);
                if (typeof ctx.setStemLabTab === 'function') ctx.setStemLabTab('tools');
              },
              className: 'rounded-lg px-3 py-2 text-sm font-bold shrink-0',
              style: { background: soft, color: text, border: '1px solid ' + border },
              'aria-label': t('stem.ratios.back_to_stem_tools', "Back to STEM tools")
            }, t('stem.ratios.back', "← Back")),
            h('div', null,
              h('h2', { className: 'text-xl sm:text-2xl font-black' }, t('stem.ratios.ratios_rates_proportions_lab', "📊 Ratios, Rates & Proportions Lab")),
              h('p', { className: 'text-sm mt-1', style: { color: muted } }, t('stem.ratios.move_between_representations_and_expla', "Move between representations and explain the multiplicative relationship."))
            )
          ),
          h('div', { className: 'flex gap-2 text-xs', 'aria-label': t('stem.ratios.lab_progress', "Lab progress") },
            h('span', { className: "rounded-full px-3 py-1.5 font-bold", style: { background: soft, border: '1px solid ' + border } }, visitedCount(d) + t('stem.ratios.n_5_modes', "/5 modes")),
            h('span', { className: "rounded-full px-3 py-1.5 font-bold", style: { background: soft, border: '1px solid ' + border } }, solvedCount(d) + t('stem.ratios.solved', " solved"))
          )
        ),

        h('nav', { className: 'rounded-xl p-2', style: cardStyle, 'aria-label': t('stem.ratios.ratio_lab_learning_modes', "Ratio Lab learning modes") },
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2', role: 'tablist', 'aria-label': t('stem.ratios.learning_mode', "Learning mode") }, MODES.map(function(item, index) {
            var selected = item.id === mode;
            return h('button', {
              key: item.id,
              id: 'ratio-tab-' + item.id,
              type: 'button',
              role: 'tab',
              'aria-selected': selected,
              'aria-controls': 'ratio-mode-panel',
              tabIndex: selected ? 0 : -1,
              onKeyDown: function(event) { moveMode(event, index); },
              onClick: function() { chooseMode(item.id); },
              className: 'rounded-lg px-2 py-3 text-xs font-bold min-h-[54px]',
              style: { background: selected ? accentStrong : soft, color: selected ? accentText : text, border: '1px solid ' + (selected ? accentStrong : border) }
            }, h('span', { className: 'block text-base mb-1', 'aria-hidden': 'true' }, item.icon), item.short);
          }))
        ),

        h('section', {
          id: 'ratio-mode-panel',
          role: 'tabpanel',
          'aria-labelledby': 'ratio-tab-' + mode,
          className: 'space-y-3'
        },
          h('div', { className: 'flex flex-wrap items-baseline gap-x-3 gap-y-1' },
            h('h2', { className: 'text-lg font-black', style: { color: accent } }, modeInfo.title),
            h('p', { className: 'text-sm', style: { color: muted } }, modeInfo.desc)
          ),
          renderModeContent()
        ),

        h('section', { className: 'rounded-2xl p-4 sm:p-5 space-y-4', 'aria-labelledby': 'ratio-challenge-heading', style: { background: isContrast ? '#000000' : (isDark ? '#191d36' : '#eef2ff'), border: '2px solid ' + accent } },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
            h('div', null,
              h('h2', { id: 'ratio-challenge-heading', className: 'font-black' }, t('stem.ratios.deterministic_challenge', "🎯 Deterministic challenge")),
              h('p', { className: 'text-xs', style: { color: muted } }, modeInfo.title + t('stem.ratios.challenge_2', " • Challenge ") + (challengeIndex + 1) + t('stem.ratios.of', " of ") + modeChallenges.length)
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              h('button', { type: 'button', onClick: function() { moveChallenge(-1); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: panel, color: text, border: '1px solid ' + border } }, t('stem.ratios.previous_challenge', "Previous challenge")),
              h('button', { type: 'button', onClick: function() { moveChallenge(1); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: panel, color: text, border: '1px solid ' + border } }, t('stem.ratios.next_challenge', "Next challenge")),
              h('button', { type: 'button', onClick: retryMissedChallenge, disabled: !missedChallengeIds.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50', style: { background: soft, color: text, border: '1px solid ' + border } }, t('stem.ratios.retry_missed', "Retry missed (") + missedChallengeIds.length + ')'))
          ),
          h('p', { id: 'ratio-challenge-prompt', className: 'text-sm sm:text-base font-semibold' }, challenge.prompt),
          h('form', { className: 'flex flex-col sm:flex-row gap-2', 'aria-labelledby': 'ratio-challenge-prompt', onSubmit: function(event) { event.preventDefault(); checkChallenge(); } },
            h('label', { className: 'flex-1', htmlFor: 'ratio-challenge-answer' },
              h('span', { id: 'ratio-challenge-answer-label', className: 'sr-only' }, t('stem.ratios.challenge_answer', "Challenge answer")),
              h('div', { className: 'flex items-center rounded-lg', style: inputStyle },
                challenge.prefix && h('span', { className: 'pl-3 font-bold', 'aria-hidden': 'true' }, challenge.prefix),
                h('input', {
                  id: 'ratio-challenge-answer',
                  value: displayedChallengeAnswer,
                  onChange: function(event) {
                    if (challengeSolved) return;
                    var nextAnswer = event.target.value;
                    update(function(current) {
                      var cursors = Object.assign({}, current.challengeCursorByMode || {});
                      cursors[mode] = challenge.id;
                      return { challengeCursorByMode: cursors, challengeId: challenge.id,
                        challengeIndex: challengeIndex, challengeAnswer: nextAnswer,
                        challengeAnswerId: challenge.id, challengeFeedback: null };
                    });
                  },
                  readOnly: challengeSolved,
                  'aria-readonly': challengeSolved,
                  inputMode: challenge.answer != null ? 'decimal' : 'text',
                  className: "ratio-challenge-answer w-full rounded-lg px-3 py-2.5 bg-transparent",
                  style: { color: text, '--ratio-focus-color': accent },
                  placeholder: challenge.answers ? t('stem.ratios.type_your_answer', "Type your answer") : t('stem.ratios.enter_a_number', "Enter a number"),
                  'aria-labelledby': 'ratio-challenge-prompt ratio-challenge-answer-label',
                  'aria-describedby': feedback ? 'ratio-challenge-feedback' : undefined,
                  'aria-invalid': feedback && !feedback.correct ? 'true' : undefined,
                  'data-solved-answer': challengeSolved ? 'true' : undefined
                }),
                challenge.suffix && h('span', { className: 'pr-3 text-xs font-bold', 'aria-hidden': 'true' }, challenge.suffix)
              )
            ),
            h('button', { type: 'submit', disabled: challengeSolved, className: "rounded-lg px-5 py-2.5 font-bold disabled:opacity-70", style: { background: accentStrong, color: accentText, border: isContrast ? '2px solid #ffffff' : 'none' } }, challengeSolved ? t('stem.ratios.solved_2', "Solved") : t('stem.ratios.check_answer', "Check answer"))
          ),
          h('div', { className: 'flex flex-wrap items-start gap-2' },
            h('button', { type: 'button', onClick: advanceChallengeHint, 'aria-expanded': challengeHintStage > 0, 'aria-controls': 'ratio-challenge-hints', className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: soft, color: text, border: '1px solid ' + border } }, challengeHintStage === 0 ? t('stem.ratios.show_hint_1', "Show hint 1") : challengeHintStage === 1 ? t('stem.ratios.show_hint_2', "Show hint 2") : t('stem.ratios.hide_hints', "Hide hints")),
            challengeHintStage > 0 && h('div', { id: 'ratio-challenge-hints', role: 'note', className: 'flex-1 rounded-lg p-3 text-sm', style: { background: panel, border: '1px solid ' + border } },
              h('p', { className: 'font-semibold' }, h('strong', null, t('stem.ratios.hint_1', "Hint 1: ")), strategyHint),
              challengeHintStage > 1 && h('p', { className: 'mt-2 font-semibold' }, h('strong', null, t('stem.ratios.hint_2', "Hint 2: ")), challenge.hint)
            )
          ),
          feedback && h('div', { id: 'ratio-challenge-feedback', role: 'status', 'aria-live': 'polite', className: 'rounded-lg p-3 text-sm font-semibold', style: { background: panel, border: '1px solid ' + (feedback.correct ? success : warning), color: feedback.correct ? success : warning } }, feedback.message)
        ),

        h('details', { className: 'rounded-xl p-4', style: cardStyle },
          h('summary', { className: 'font-bold cursor-pointer', style: { color: accent } }, t('stem.ratios.representation_strategy_guide', "Representation strategy guide")),
          h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 text-sm' },
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.ratio_table', "Ratio table")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.best_for_listing_equivalent_pairs', "Best for listing many equivalent pairs and spotting a common scale factor."))),
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.double_number_line', "Double number line")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.best_for_aligned_quantities', "Best for seeing aligned quantities, intermediate values, and how far each scale travels."))),
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.unit_rate', "Unit rate")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.best_for_fair_comparisons_because_ever', "Best for fair comparisons because every situation is rewritten per one unit."))),
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.percent', "Percent")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.a_ratio_measured_against_a_whole_of_10', "A ratio measured against a whole of 100; use part = percent × whole."))),
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.proportional_graph', "Proportional graph")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.a_straight_line_through_the_origin_sho', "A straight line through the origin shows one constant multiplier from x to y."))),
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.reasonableness_check', "Reasonableness check")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.estimate_first_preserve_units_and_ask_', "Estimate first, preserve units, and ask whether both quantities changed multiplicatively.")))
          )
        )
      );
    }
  });
})(typeof window !== 'undefined' ? window : null);
