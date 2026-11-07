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
  var MAX_NUMBER_LINE_UNIT = 1000;

  // The 15 lesson problems. Each one is built by the same kind builder as
  // the generated practice, so it carries misconception traps, worked steps
  // and a prediction; its own wording, key and explanation override the
  // builder's. CHALLENGES (English) is assigned once the kinds exist.
  function buildFixedChallenges(t) {
    t = tOf(t);
    function fixed(base, kind, params) { return buildKindProblem(kind, params, t, base); }
    return {
      ratioTable: [
        fixed({ id: 'ratio-paint', ratioPair: [3, 5, 12, 20], prompt: t('stem.ratios.ch_paint_prompt', 'A paint mix uses 3 cups blue for every 5 cups white. If there are 20 cups of white, how many cups of blue are needed?'), answer: 12, suffix: t('stem.ratios.unit_cups', 'cups'), hint: t('stem.ratios.ch_paint_hint', 'Five was multiplied by 4, so multiply three by 4 too.'), explain: t('stem.ratios.ch_paint_explain', '3:5 and 12:20 are equivalent because both quantities were multiplied by 4.') }, 'missingValue', { a: 3, b: 5, k: 4, ctx: 'paint', askSecond: false }),
        fixed({ id: 'ratio-simplify', prompt: t('stem.ratios.ch_simplify_prompt', 'Simplify the ratio 18:24. Enter your answer with a colon.'), answers: ['3:4', '3/4'], hint: t('stem.ratios.ch_simplify_hint', 'Divide both terms by their greatest common factor, 6.'), explain: t('stem.ratios.ch_simplify_explain', '18 ÷ 6 = 3 and 24 ÷ 6 = 4, so the simplest ratio is 3:4.') }, 'simplify', { a: 3, b: 4, g: 6 }),
        fixed({ id: 'ratio-scale', prompt: t('stem.ratios.ch_scale_prompt', 'Scale the ratio 7:4 by a factor of 6. What is the second quantity?'), answer: 24, hint: t('stem.ratios.ch_scale_hint', 'Multiply the second quantity by the scale factor.'), explain: t('stem.ratios.ch_scale_explain', '4 × 6 = 24, while the first quantity becomes 7 × 6 = 42.') }, 'scale', { a: 7, b: 4, k: 6 })
      ],
      numberLine: [
        fixed({ id: 'line-tickets', prompt: t('stem.ratios.ch_tickets_prompt', 'Five tickets cost $15. On a double number line, what cost aligns with 8 tickets?'), answer: 24, prefix: '$', hint: t('stem.ratios.ch_tickets_hint', 'First find the cost for one ticket.'), explain: t('stem.ratios.ch_tickets_explain', '$15 ÷ 5 = $3 per ticket, and 8 × $3 = $24.') }, 'lineMissing', { ctx: 'tickets', a: 5, rate: 3, c: 8 }),
        fixed({ id: 'line-running', prompt: t('stem.ratios.ch_running_prompt', 'A runner covers 3 kilometers in 18 minutes at a steady pace. How many minutes align with 7 kilometers?'), answer: 42, suffix: t('stem.ratios.unit_minutes', 'minutes'), hint: t('stem.ratios.ch_running_hint', 'Use the aligned value for 1 kilometer.'), explain: t('stem.ratios.ch_running_explain', '18 ÷ 3 = 6 minutes per kilometer, so 7 kilometers take 42 minutes.') }, 'lineMissing', { ctx: 'running', a: 3, rate: 6, c: 7 }),
        fixed({ id: 'line-batches', prompt: t('stem.ratios.ch_batches_prompt', 'Two batches use 5 cups of flour. How many cups align with 6 batches?'), answer: 15, suffix: t('stem.ratios.unit_cups', 'cups'), hint: t('stem.ratios.ch_batches_hint', 'Six batches is three groups of two batches.'), explain: t('stem.ratios.ch_batches_explain', 'The scale factor from 2 batches to 6 batches is 3, so 5 × 3 = 15 cups.') }, 'lineMissing', { ctx: 'batches', a: 2, rate: 2.5, c: 6 })
      ],
      unitRates: [
        fixed({ id: 'unit-snacks', prompt: t('stem.ratios.ch_snacks_prompt', 'Option A is 12 oz for $3.60. Option B is 20 oz for $5.40. Which has the lower cost per ounce? Enter A or B.'), answers: ['b', 'option b'], hint: t('stem.ratios.ch_snacks_hint', 'Divide each price by its number of ounces.'), explain: t('stem.ratios.ch_snacks_explain', 'A costs $0.30/oz and B costs $0.27/oz, so B is the better price per ounce.') }, 'betterBuy', { qa: 12, pa: 3.6, qb: 20, pb: 5.4 }),
        fixed({ id: 'unit-speed', prompt: t('stem.ratios.ch_speed_prompt', 'A car travels 180 miles in 3 hours. What is its unit rate in miles per hour?'), answer: 60, suffix: t('stem.ratios.unit_mph', 'mph'), hint: t('stem.ratios.ch_speed_hint', 'Divide the distance by the time.'), explain: t('stem.ratios.ch_speed_explain', '180 ÷ 3 = 60 miles per hour.') }, 'unitRate', { ctx: 'car', D: 180, n: 3 }),
        fixed({ id: 'unit-printing', prompt: t('stem.ratios.ch_printing_prompt', 'Printer A makes 84 pages in 6 minutes. Printer B makes 105 pages in 7 minutes. Which is faster? Enter A or B.'), answers: ['b', 'printer b'], hint: t('stem.ratios.ch_printing_hint', 'Compare pages per one minute.'), explain: t('stem.ratios.ch_printing_explain', 'A prints 14 pages/minute and B prints 15 pages/minute, so B is faster.') }, 'compareRates', { pa: 84, ma: 6, pb: 105, mb: 7 })
      ],
      percent: [
        fixed({ id: 'percent-part', prompt: t('stem.ratios.ch_percent_part_prompt', 'What is 35% of 240?'), answer: 84, hint: t('stem.ratios.ch_percent_part_hint', 'Write 35% as 0.35, then multiply by the whole.'), explain: t('stem.ratios.ch_percent_part_explain', '0.35 × 240 = 84.') }, 'percentPart', { p: 35, W: 240, ctx: 'plain' }),
        fixed({ id: 'percent-rate', prompt: t('stem.ratios.ch_percent_rate_prompt', '45 is what percent of 180?'), answer: 25, suffix: '%', hint: t('stem.ratios.ch_percent_rate_hint', 'Divide the part by the whole, then multiply by 100.'), explain: t('stem.ratios.ch_percent_rate_explain', '45 ÷ 180 = 0.25, which is 25%.') }, 'percentRate', { P: 45, W: 180, ctx: 'plain' }),
        fixed({ id: 'percent-whole', prompt: t('stem.ratios.ch_percent_whole_prompt', '30 is 20% of what whole?'), answer: 150, hint: t('stem.ratios.ch_percent_whole_hint', 'Divide the part by the percent written as a decimal.'), explain: t('stem.ratios.ch_percent_whole_explain', '30 ÷ 0.20 = 150.') }, 'percentWhole', { P: 30, p: 20, ctx: 'plain' })
      ],
      proportional: [
        fixed({ id: 'prop-yes-table', prompt: t('stem.ratios.ch_prop_yes_prompt', 'Does the table x = 1, 2, 4 and y = 3, 6, 12 show a proportional relationship? Enter yes or no.'), answers: ['yes', 'y'], hint: t('stem.ratios.ch_prop_yes_hint', 'Compare y ÷ x in every row.'), explain: t('stem.ratios.ch_prop_yes_explain', 'Yes. Every row has y ÷ x = 3, so the constant of proportionality is 3.') }, 'propTable', { xs: [1, 2, 4], ys: [3, 6, 12] }),
        fixed({ id: 'prop-no-table', prompt: t('stem.ratios.ch_prop_no_prompt', 'Does the table x = 1, 2, 3 and y = 4, 8, 13 show a proportional relationship? Enter yes or no.'), answers: ['no', 'n'], hint: t('stem.ratios.ch_prop_no_hint', 'One unequal unit rate is enough to disprove proportionality.'), explain: t('stem.ratios.ch_prop_no_explain', 'No. The rates are 4, 4, and 13/3, so they are not constant.') }, 'propTable', { xs: [1, 2, 3], ys: [4, 8, 13] }),
        fixed({ id: 'prop-origin', prompt: t('stem.ratios.ch_prop_origin_prompt', 'A straight graph passes through (0,0), (2,7), and (4,14). Is the relationship proportional? Enter yes or no.'), answers: ['yes', 'y'], hint: t('stem.ratios.ch_prop_origin_hint', 'A proportional graph is a straight line through the origin.'), explain: t('stem.ratios.ch_prop_origin_explain', 'Yes. The nonzero points both have y ÷ x = 3.5, and the line passes through the origin.') }, 'propOrigin', { pts: [[0, 0], [2, 7], [4, 14]] })
      ]
    };
  }

  var MODE_IDS = MODES.map(function(mode) { return mode.id; });

  // Mode names in the student's language (MODES keeps the ids and icons).
  function localModes(t) {
    t = tOf(t);
    var text = {
      ratioTable: { short: t('stem.ratios.mode_ratio_tables_short', 'Ratio Tables'), title: t('stem.ratios.mode_ratio_tables_title', 'Ratio Tables'), desc: t('stem.ratios.mode_ratio_tables_desc', 'Scale both quantities by the same factor.') },
      numberLine: { short: t('stem.ratios.mode_double_line_short', 'Double Line'), title: t('stem.ratios.mode_double_line_title', 'Double Number Line'), desc: t('stem.ratios.mode_double_line_desc', 'Align equivalent quantities on two connected scales.') },
      unitRates: { short: t('stem.ratios.mode_unit_rates_short', 'Unit Rates'), title: t('stem.ratios.mode_unit_rates_title', 'Unit Rates & Comparison'), desc: t('stem.ratios.mode_unit_rates_desc', 'Compare every situation using the same one-unit benchmark.') },
      percent: { short: t('stem.ratios.mode_percents_short', 'Percents'), title: t('stem.ratios.mode_percents_title', 'Percent Problems'), desc: t('stem.ratios.mode_percents_desc', 'Connect the part, whole, and percent.') },
      proportional: { short: t('stem.ratios.mode_proportional_short', 'Proportional?'), title: t('stem.ratios.mode_proportional_title', 'Proportional or Not?'), desc: t('stem.ratios.mode_proportional_desc', 'Use tables, unit rates, and graphs as evidence.') }
    };
    return MODES.map(function(mode) { return Object.assign({}, mode, text[mode.id]); });
  }

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
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return fallback;
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

  function formatSignificantNumber(value, significantDigits) {
    var number = finiteNumber(value, null);
    if (number === null) return '\u2014';
    if (number === 0) return '0';
    var digits = clamp(Math.floor(finiteNumber(significantDigits, 3)), 1, 17);
    var rounded = Number(number.toPrecision(digits));
    return isFinite(rounded) ? String(Object.is(rounded, -0) ? 0 : rounded) : '\u2014';
  }

  function formatUnitRate(value, significantDigits) {
    return formatSignificantNumber(value, significantDigits == null ? 3 : significantDigits);
  }

  function unitRateIsRepresentable(pair, rate) {
    return !!pair && isFinite(rate) && !(rate === 0 && pair.y !== 0);
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

  function percentTapeSummary(model, t) {
    t = tOf(t);
    var values = { p: formatNumber(model.percent), r: formatNumber(model.remainderPercent), n: model.wholeCount };
    if (model.percent === 0) return fill(t('stem.ratios.tape_sum_none', '{p}% fills none of the whole.'), values);
    if (model.wholeCount === 0) return fill(t('stem.ratios.tape_sum_part', '{p}% fills {r}% of one whole.'), values);
    if (model.remainderPercent === 0) return fill(model.wholeCount === 1 ? t('stem.ratios.tape_sum_one_whole', '{p}% equals 1 complete whole.') : t('stem.ratios.tape_sum_wholes', '{p}% equals {n} complete wholes.'), values);
    return fill(model.wholeCount === 1 ? t('stem.ratios.tape_sum_one_whole_plus', '{p}% equals 1 complete whole plus {r}% of another whole.') : t('stem.ratios.tape_sum_wholes_plus', '{p}% equals {n} complete wholes plus {r}% of another whole.'), values);
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

  function formatUnitRateEvidence(pairs) {
    var usablePairs = (pairs || []).filter(function(pair) {
      return pair && pair.x !== 0 && [pair.x, pair.y].every(isFinite);
    });
    var rates = usablePairs.map(function(pair) { return pair.y / pair.x; });
    var representable = rates.map(function(rate, index) { return unitRateIsRepresentable(usablePairs[index], rate); });
    var digits = 3;
    var displays = rates.map(function(rate, index) { return representable[index] ? formatUnitRate(rate, digits) : '\u2014'; });
    var hasCollision = false;

    function findCollision() {
      for (var i = 0; i < usablePairs.length; i++) {
        for (var j = i + 1; j < usablePairs.length; j++) {
          if (representable[i] && representable[j] && !pairsShareUnitRate(usablePairs[i], usablePairs[j]) && displays[i] === displays[j]) return true;
        }
      }
      return false;
    }

    while (digits < 17 && findCollision()) {
      digits += 1;
      displays = rates.map(function(rate, index) { return representable[index] ? formatUnitRate(rate, digits) : '\u2014'; });
    }
    hasCollision = findCollision();
    if (hasCollision) {
      displays = displays.map(function(display, index) {
        var collides = usablePairs.some(function(otherPair, otherIndex) {
          return representable[index] && representable[otherIndex] && otherIndex !== index && !pairsShareUnitRate(usablePairs[index], otherPair) && displays[otherIndex] === display;
        });
        return collides
          ? display + ' (' + formatSignificantNumber(usablePairs[index].y, 17) + ' \u00F7 ' + formatSignificantNumber(usablePairs[index].x, 17) + ')'
          : display;
      });
    }
    return { digits: digits, displays: displays, rates: rates, representable: representable, collisionFallback: hasCollision };
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
    // Kitchen and mixture answers read best as fractions: "1 1/8", "2/5".
    if (challenge.answer != null && typeof challenge.answerText === 'string' && challenge.answerText) return challenge.answerText;
    if (challenge.answer != null) return challenge.prefix === '$' && isFinite(challenge.answer) ? money(challenge.answer) : String(challenge.answer);
    return challenge.answers && challenge.answers.length ? String(challenge.answers[0]) : '';
  }

  function normalizeAnswer(value) {
    // "$ 24" and "25 %" are the same answers as "$24" and "25%".
    return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*([:/])\s*/g, '$1')
      .replace(/\$ (?=[\d.+-])/g, function() { return '$'; }).replace(/(\d) %$/, function(whole, digit) { return digit + '%'; });
  }

  function parseNumericChallengeAnswer(value, options) {
    options = options || {};
    var normalized = normalizeAnswer(value);
    if (!normalized) return null;
    var match = normalized.match(/^(\$)?([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+))(%?)$/);
    if (!match) return null;
    if (match[1] && match[3]) return null;
    if (match[1] && options.allowCurrency === false) return null;
    if (match[3] && options.allowPercent === false) return null;
    var numeric = Number(match[2].replace(/,/g, ''));
    return isFinite(numeric) ? numeric : null;
  }

  // The unit a numeric challenge asks for: the $ or % the answer box shows,
  // otherwise a plain number (possibly labelled, e.g. "cups").
  function expectedChallengeUnit(challenge) {
    if (!challenge) return 'number';
    if (challenge.prefix === '$') return 'dollars';
    if (challenge.suffix === '%') return 'percent';
    return 'number';
  }

  // ctx.gradeLevel arrives as "Kindergarten", "5th Grade", "College"...;
  // a number or a host band ('k2'|'g35'|'g68'|'g912') also works. Null if unknown.
  function gradeNumberFromLevel(gradeLevel, gradeBand) {
    if (typeof gradeLevel === 'number' && isFinite(gradeLevel)) return gradeLevel;
    var g = String(gradeLevel == null ? '' : gradeLevel).trim().toLowerCase();
    if (g) {
      if (/^(k|pre-?k|tk)\b|kinder|preschool/.test(g)) return 0;
      var m = g.match(/(\d{1,2})\s*(st|nd|rd|th)\b/) || g.match(/grade\s*(\d{1,2})\b/) || g.match(/^(\d{1,2})\b/);
      if (m) return Number(m[1]);
      if (/college|university|graduate|adult/.test(g)) return 13;
      if (/high school/.test(g)) return 9;
      if (/middle school/.test(g)) return 6;
    }
    var band = String(gradeBand == null ? '' : gradeBand).toLowerCase();
    if (band === 'k2') return 0;
    if (band === 'g35') return 3;
    if (band === 'g68') return 6;
    if (band === 'g912') return 9;
    return null;
  }

  // Grade 6 up: a $ or % that does not match the question is not accepted.
  // Below grade 6, and when the grade is unknown, the sign is ignored.
  function strictUnitsForGrade(gradeLevel, gradeBand) {
    var grade = gradeNumberFromLevel(gradeLevel, gradeBand);
    return grade != null && grade >= 6;
  }

  // A $ or % sign that is not the unit the question asks for: null when the
  // sign fits (or there is none), else what was expected, what was typed, and
  // the answer box's label for a plain number (e.g. "cups").
  function challengeUnitProblem(challenge, rawAnswer) {
    if (!challenge || challenge.answers) return null;
    var match = stripAnswerUnit(challenge, rawAnswer).match(/^(\$)?([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+))(%?)$/);
    if (!match || (match[1] && match[3])) return null;
    var typed = match[1] ? 'dollars' : (match[3] ? 'percent' : null);
    var expected = expectedChallengeUnit(challenge);
    if (!typed || typed === expected) return null;
    var label = expected === 'number' && typeof challenge.suffix === 'string' ? challenge.suffix.trim() : '';
    return { expected: expected, typed: typed, unit: label };
  }

  // Numeric answers also accept a fraction ("3/4") or a mixed number ("1 1/2").
  function parseNumberWithFraction(value, options) {
    var plain = parseNumericChallengeAnswer(value, options);
    if (plain !== null) return plain;
    var normalized = normalizeAnswer(value);
    // Huge digit strings overflow to Infinity: "1/999...9" must not read as 0.
    var simple = normalized.match(/^([+-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (simple && Number(simple[2]) !== 0 && [Number(simple[1]), Number(simple[2])].every(isFinite)) return Number(simple[1]) / Number(simple[2]);
    var mixed = normalized.match(/^(\d+) (\d+)\/(\d+)$/);
    if (mixed && Number(mixed[3]) !== 0 && [Number(mixed[1]), Number(mixed[2]), Number(mixed[3])].every(isFinite)) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
    return null;
  }
  // "12 cups" for a box labelled cups reads as 12: the unit word is the one asked for.
  function stripAnswerUnit(challenge, rawAnswer) {
    var normalized = normalizeAnswer(rawAnswer);
    var unit = challenge && typeof challenge.suffix === 'string' && challenge.suffix !== '%' ? normalizeAnswer(challenge.suffix) : '';
    if (unit && normalized.length > unit.length + 1 && normalized.slice(-(unit.length + 1)) === ' ' + unit) return normalized.slice(0, -(unit.length + 1)).trim();
    return normalized;
  }

  // "3:4", "3/4" and "3 to 4" are the same ratio.
  function parseRatioAnswer(value) {
    var match = normalizeAnswer(value).match(/^(\d+(?:\.\d+)?)(?::|\/| to )(\d+(?:\.\d+)?)$/);
    if (!match) return null;
    var pair = [Number(match[1]), Number(match[2])];
    return pair.every(isFinite) ? pair : null;
  }

  // Ratio answers: an equivalent ratio is accepted (and named when it is not
  // the simplest form). A "simplify" problem (it carries ratioOriginal) needs
  // the simplest form: "18:24" is not simpler at all, "9:12" is only part way.
  function ratioAnswerStatus(challenge, rawAnswer) {
    if (!challenge || !Array.isArray(challenge.ratioAnswer)) return null;
    var pair = parseRatioAnswer(rawAnswer);
    if (!pair) return { parsed: false };
    var a = challenge.ratioAnswer[0], b = challenge.ratioAnswer[1];
    var equivalent = pair[0] > 0 && pair[1] > 0 && nearlyEqual(pair[0] * b, pair[1] * a);
    var reversed = !equivalent && pair[0] > 0 && pair[1] > 0 && nearlyEqual(pair[1] * b, pair[0] * a);
    var original = challenge.ratioOriginal;
    var simplifyTask = Array.isArray(original);
    var notSimplified = equivalent && simplifyTask && pair[0] >= original[0];
    var simplest = equivalent && Number.isInteger(pair[0]) && Number.isInteger(pair[1]) && gcd(pair[0], pair[1]) === 1;
    var partlySimplified = equivalent && simplifyTask && !notSimplified && !simplest;
    return { parsed: true, pair: pair, equivalent: equivalent, reversed: reversed, notSimplified: notSimplified, partlySimplified: partlySimplified, simplest: simplest, accepted: equivalent && !notSimplified && !partlySimplified };
  }

  // Choice answers: "B.", "Option B" and "b" match; "y"/"n" read as yes/no.
  function normalizeChoice(value) {
    var text = normalizeAnswer(value).replace(/[.!?]+$/, '').trim();
    var labelled = text.match(/^(?:option|printer|relationship|choice|mix|paint) ([a-z])$/);
    if (labelled) text = labelled[1];
    if (text === 'y') return 'yes';
    if (text === 'n') return 'no';
    if (text === 'equal' || text === 'the same' || text === 'both' || text === 'same strength') return 'same';
    return text;
  }

  // A trap matches the exact value or the value rounded to 0-3 places, since
  // students round (240 / 35 typed as 6.86). Rounding to a whole number counts
  // only within 5% of the trap: 3.2 typed as 3, or 0.75 typed as 1, is not
  // that mistake. A rounding to 1-3 decimal places that is not whole counts.
  function trapMatches(trapValue, typed) {
    if (!isFinite(trapValue) || !isFinite(typed)) return false;
    if (nearlyEqual(trapValue, typed)) return true;
    if (Number.isInteger(trapValue)) return false;
    for (var places = 0; places <= 3; places++) {
      var rounded = roundTo(trapValue, places);
      var plausible = !Number.isInteger(rounded) || Math.abs(rounded - trapValue) <= 0.05 * Math.abs(trapValue);
      if (plausible && nearlyEqual(rounded, typed)) return true;
    }
    return false;
  }

  // Wrong answers returned the same static hint forever, no matter what the
  // student actually did. Every problem now carries named traps (additive
  // reasoning, multiplying instead of dividing, part-to-part for
  // part-to-whole, decimal for percent...) built from its own numbers, and
  // this names the error instead of restating the hint. It returns null
  // unless it is confident, so a plain slip still falls through to the hint.
  // A ratio answer that is equivalent but not simplest returns
  // { accepted: true } with a note: it counts, and the student is told so.
  function diagnoseRatioAnswer(challenge, rawAnswer, t) {
    if (!challenge || typeof challenge !== 'object') return null;
    t = tOf(t || challenge._t);
    if (Array.isArray(challenge.ratioAnswer)) {
      var status = ratioAnswerStatus(challenge, rawAnswer);
      var target = challenge.ratioAnswer;
      if (status && status.parsed) {
        var ratioValues = { typed: num(status.pair[0]) + ':' + num(status.pair[1]), simplest: target[0] + ':' + target[1] };
        if (status.accepted && !status.simplest) return { kind: 'notSimplest', accepted: true, message: fill(t('stem.ratios.mc_not_simplest', '{typed} is equivalent, so it counts. It is not in simplest form yet: the simplest form is {simplest}.'), ratioValues) };
        if (status.accepted) return null;
        if (status.equivalent && !(Number.isInteger(status.pair[0]) && Number.isInteger(status.pair[1]))) return { kind: 'decimalTerms', message: fill(t('stem.ratios.mc_ratio_decimal_terms', '{typed} is equivalent, but the simplest form uses whole numbers. Multiply both terms by the same number to clear the decimals, then simplify.'), ratioValues) };
        if (status.reversed && !(nearlyEqual(status.pair[0], target[1]) && nearlyEqual(status.pair[1], target[0]))) return { kind: 'reversedRatio', message: t('stem.ratios.mc_reversed_order', 'Check the order: the first quantity in the question comes first in the ratio. Then make sure the ratio is in simplest form.') };
        if (status.partlySimplified) return { kind: 'partlySimplified', message: fill(t('stem.ratios.mc_partly_simplified', '{typed} is equivalent and simpler, but not the simplest form yet. Look for a number that still goes into both terms.'), ratioValues) };
        if (status.notSimplified) return { kind: 'notSimplified', message: t('stem.ratios.mc_not_simplified', 'That ratio is equivalent, but it is not simpler than the one you started with. Divide both terms by a number that goes into both.') };
        if (status.reversed) return { kind: 'reversedRatio', message: t('stem.ratios.mc_reversed_ratio', 'Check the order. The terms are the right size but swapped: the first quantity in the question comes first in the ratio.') };
        return null;
      }
      var quotient = parseNumberWithFraction(rawAnswer);
      if (quotient !== null && target[1] !== 0 && nearlyEqual(quotient, target[0] / target[1])) {
        return { kind: 'quotientNotRatio', message: t('stem.ratios.mc_quotient_not_ratio', 'That is the value of the division. Write the answer as a ratio with a colon, such as 2:3.') };
      }
      return null;
    }
    if (challenge.answers) {
      if (challengeIsCorrect(challenge, rawAnswer)) return null;
      var choice = normalizeChoice(rawAnswer);
      var traps = challenge.choiceTraps && typeof challenge.choiceTraps === 'object' ? challenge.choiceTraps : {};
      var choiceTrap = Object.prototype.hasOwnProperty.call(traps, choice) ? traps[choice] : null;
      return choiceTrap && choiceTrap.message ? { kind: choiceTrap.kind || 'other', message: choiceTrap.message } : null;
    }
    var numeric = parseNumberWithFraction(stripAnswerUnit(challenge, rawAnswer));
    if (numeric == null || !isFinite(numeric)) return null;
    var key = Number(challenge.answer);
    if (!isFinite(key) || nearlyEqual(numeric, key)) return null;
    // "-25" for a percent decrease: the size is right, the sign is not.
    if (numeric < 0 && key > 0 && nearlyEqual(-numeric, key)) {
      var decrease = challenge.kind === 'percentChange' && challenge.params && challenge.params.up === false;
      return { kind: 'signOnly', message: decrease ? t('stem.ratios.mc_pc_decrease_sign', 'The size is right. The question asks for the percent decrease, which already means a drop, so write it without a minus sign.') : t('stem.ratios.mc_sign_flipped', 'The size is right, but the sign is not. Check whether the answer should be positive.') };
    }
    var named = Array.isArray(challenge.traps) ? challenge.traps : [];
    for (var i = 0; i < named.length; i++) {
      if (named[i] && !nearlyEqual(named[i].value, key) && trapMatches(named[i].value, numeric)) {
        return { kind: named[i].kind || 'other', message: named[i].message, added: named[i].added, factor: named[i].factor };
      }
    }
    var pair = challenge.ratioPair;
    if (pair && pair.length === 4) {
      var a = Number(pair[0]), b = Number(pair[1]), d = Number(pair[3]);
      // Additive: the student added (d - b) to a instead of scaling by d / b.
      if (isFinite(a) && isFinite(b) && isFinite(d) && b !== 0) {
        var additive = a + (d - b);
        if (numeric === additive && additive !== key) {
          return { kind: 'additive', added: d - b, factor: d / b,
            message: fill(t('stem.ratios.mc_additive', 'You added {diff} to both parts. Ratios keep the same multiplier, not the same difference: {base} was multiplied by {k}, so multiply {other} by {k} too.'), { diff: num(d - b), base: num(b), k: num(d / b), other: num(a) }) };
        }
      }
    }
    // A decimal for a percent, or a percent for a decimal.
    if (expectedChallengeUnit(challenge) === 'percent' && nearlyEqual(numeric * 100, key)) {
      return { kind: 'decimalPercent', message: t('stem.ratios.mc_decimal_for_percent', 'That is a decimal. A percent counts hundredths, so multiply the decimal by 100 to write it as a percent.') };
    }
    if (challenge.decimalAnswer && nearlyEqual(numeric / 100, key)) {
      return { kind: 'decimalPercent', message: t('stem.ratios.mc_percent_for_decimal', 'That is the percent number. To write a percent as a decimal, divide it by 100.') };
    }
    // Off by a power of ten: the relationship is right, the place value is not.
    for (var e = -3; e <= 3; e++) {
      if (e === 0) continue;
      if (Math.abs(numeric * Math.pow(10, e) - key) <= 1e-9 * Math.max(1, Math.abs(key))) {
        return { kind: 'placeValue', message: fill(t('stem.ratios.mc_place_value', 'Your reasoning gives the right digits, but the value is off by a factor of {factor}. Check where the decimal point or the zeros belong.'), { factor: num(Math.pow(10, Math.abs(e))) }) };
      }
    }
    // Inverted: the student scaled the wrong way round.
    if (key !== 0 && Math.abs(numeric - 1 / key) <= 1e-9) {
      return { kind: 'inverted', message: t('stem.ratios.mc_reciprocal', 'That is the reciprocal. Check which quantity you are scaling up and which you are scaling down.') };
    }
    return null;
  }
  // options.strictUnits (grade 6 up): only the question's own unit sign counts.
  function challengeIsCorrect(challenge, rawAnswer, options) {
    if (!challenge || typeof challenge !== 'object') return false;
    var normalized = normalizeAnswer(rawAnswer);
    if (!normalized) return false;
    if (Array.isArray(challenge.ratioAnswer)) {
      var status = ratioAnswerStatus(challenge, rawAnswer);
      if (status && status.accepted) return true;
    }
    if (challenge.answers) {
      var choice = normalizeChoice(rawAnswer);
      return challenge.answers.some(function(answer) {
        var expected = normalizeAnswer(answer);
        return normalized === expected || (!Array.isArray(challenge.ratioAnswer) && choice === normalizeChoice(expected));
      });
    }
    var unit = options && options.strictUnits ? expectedChallengeUnit(challenge) : null;
    var numeric = parseNumberWithFraction(stripAnswerUnit(challenge, rawAnswer), unit ? { allowCurrency: unit === 'dollars', allowPercent: unit === 'percent' } : null);
    return numeric !== null && nearlyEqual(numeric, challenge.answer);
  }

  function parsePairInput(xText, yText, t) {
    t = tOf(t);
    var xs = String(xText == null ? '' : xText).split(',');
    var ys = String(yText == null ? '' : yText).split(',');
    var pairs = [];
    var errors = [];
    var rowCount = Math.max(xs.length, ys.length);
    if (xs.length !== ys.length) errors.push(t('stem.ratios.pairs_same_count', 'Enter the same number of x-values and y-values.'));
    for (var i = 0; i < rowCount; i++) {
      var xRaw = i < xs.length ? xs[i].trim() : '';
      var yRaw = i < ys.length ? ys[i].trim() : '';
      var rowValues = { n: i + 1 };
      if (!xRaw || !yRaw) {
        errors.push(fill(t('stem.ratios.pairs_row_both', 'Row {n}: enter both an x-value and a y-value.'), rowValues));
        continue;
      }
      var x = Number(xRaw);
      var y = Number(yRaw);
      if (!isFinite(x) || !isFinite(y)) {
        errors.push(fill(t('stem.ratios.pairs_row_numbers', 'Row {n}: use numbers only.'), rowValues));
        continue;
      }
      if (x < 0 || y < 0) {
        errors.push(fill(t('stem.ratios.pairs_row_nonnegative', 'Row {n}: this first-quadrant graph requires nonnegative values.'), rowValues));
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

  function analyzeProportionalPairs(input, t) {
    t = tOf(t);
    var diagnostic = Array.isArray(input) ? { pairs: input, errors: [], complete: true } : (input || { pairs: [], errors: [t('stem.ratios.pairs_no_data', 'No coordinate data supplied.')], complete: false });
    var pairs = Array.isArray(diagnostic.pairs) ? diagnostic.pairs : [];
    var errors = Array.isArray(diagnostic.errors) ? diagnostic.errors : [];
    var nonzeroPairs = pairs.filter(function(pair) { return pair.x !== 0; });
    var hasInvalidOrigin = pairs.some(function(pair) { return pair.x === 0 && pair.y !== 0; });
    var rates = nonzeroPairs.map(function(pair) { return pair.y / pair.x; });
    var hasUnrepresentableRate = nonzeroPairs.some(function(pair, index) {
      return !isFinite(rates[index]) || (rates[index] === 0 && pair.y !== 0);
    });
    var analysisErrors = errors.slice();
    if (hasUnrepresentableRate) analysisErrors.push(t('stem.ratios.pairs_magnitudes', 'Coordinate magnitudes are too far apart to calculate a reliable unit rate. Use less extreme values.'));
    var complete = diagnostic.complete !== false && analysisErrors.length === 0;
    var valid = complete && pairs.length >= 2 && nonzeroPairs.length > 0;
    var constantRate = valid && nonzeroPairs.every(function(pair) { return pairsShareUnitRate(nonzeroPairs[0], pair); });
    return {
      valid: valid,
      proportional: constantRate && !hasInvalidOrigin,
      rates: rates,
      constant: constantRate && !hasInvalidOrigin && isFinite(rates[0]) ? rates[0] : null,
      hasInvalidOrigin: hasInvalidOrigin,
      hasUnrepresentableRate: hasUnrepresentableRate,
      errors: analysisErrors,
      complete: complete
    };
  }

  function buildUnitComparison(amountA, costA, amountB, costB, quantity) {
    var values = [amountA, costA, amountB, costB, quantity];
    if (!values.every(function(value) { return typeof value === 'number' && isFinite(value) && value >= 0 && value <= MAX_UNIT_RATE_VALUE; })) return { ok: false, reason: 'range' };
    if (amountA === 0 || amountB === 0 || quantity === 0) return { ok: false, reason: 'quantity' };
    var pairs = [{ x: amountA, y: costA }, { x: amountB, y: costB }];
    var rates = pairs.map(function(pair) { return pair.y / pair.x; });
    var costs = rates.map(function(rate) { return rate * quantity; });
    if (!rates.every(function(rate, index) { return unitRateIsRepresentable(pairs[index], rate); }) || !costs.every(function(cost, index) { return isFinite(cost) && !(cost === 0 && rates[index] !== 0); })) return { ok: false, reason: 'scale' };
    var same = pairsShareUnitRate(pairs[0], pairs[1]);
    // Compare the unrounded rates. Display rounding never decides the winner.
    var winner = same ? 'same' : rates[0] < rates[1] ? 'a' : 'b';
    var maximum = Math.max(costs[0], costs[1]);
    return {
      ok: true, quantity: quantity, rates: rates, costs: costs, winner: winner,
      rateEvidence: formatUnitRateEvidence(pairs),
      costEvidence: formatUnitRateEvidence(costs.map(function(cost) { return { x: 1, y: cost }; })),
      widths: costs.map(function(cost) { return maximum === 0 ? 0 : cost / maximum * 100; }),
      maximum: maximum,
      stickerWinner: costA === costB ? 'same' : costA < costB ? 'a' : 'b'
    };
  }

  // Pure form of the double-number-line scaffold, so a test can read the value
  // the diagram actually shows. Computing it inside the render closure meant
  // the only gate possible was one that recomputed it independently -- which
  // passes no matter what the code does.
  //
  // Shows the UNIT RATE, not the scale factor between the two known marks.
  // The scale factor for 3 km -> 7 km is 2.333 once rounded for display, and
  // 18 x 2.333 = 41.994, which the grader rejects against a key of 42.
  function numberLineScaffold(model, problem, t) {
    var rows = model && model[1], labels = (model && model[0]) || [];
    if (!Array.isArray(rows) || rows.length < 2) return null;
    var known = rows[1];
    if (!Array.isArray(known) || !known[0]) return null;
    var unitRate = known[1] / known[0];
    if (!isFinite(unitRate)) return null;
    // "Cost ($)" is a quantity name plus its unit. The old scaffold kept only
    // the names and printed "1 Tickets -> 3 Cost": no unit, wrong number.
    function split(v) {
      var out = String(v == null ? '' : v).trim(), unit = '';
      if (out.charAt(out.length - 1) === ')') {
        var open = out.lastIndexOf('(');
        if (open > 0) { unit = out.slice(open + 1, -1).trim(); out = out.slice(0, open).trim(); }
      }
      return { name: out, unit: unit };
    }
    var top = split(labels[0]), bottom = split(labels[1]);
    var scaffold = { unitRate: unitRate, shown: roundTo(unitRate, 6), unitLabel: top.name, valueLabel: bottom.name, unitUnit: top.unit, valueUnit: bottom.unit };
    t = tOf(t);
    // Each number-line problem carries a whole sentence with its own units
    // ("For 1 ticket, the cost is ${rate}."); the generic one names no unit.
    scaffold.text = problem && problem.scaffoldTemplate
      ? fill(problem.scaffoldTemplate, { rate: problem.prefix === '$' ? money(scaffold.shown) : num(scaffold.shown) })
      : fill(t('stem.ratios.scaffold_generic', 'For 1 on the top line, the bottom line shows {rate}.'), { rate: num(scaffold.shown) });
    return scaffold;
  }

  // ===== Practice generator =====
  // Every problem, lesson or generated, is built by one kind below, so each
  // carries named misconception traps from its own numbers, worked steps, a
  // prediction and a model. A seed regenerates the same problem.
  function identityT(key, fallback) { return fallback; }
  function tOf(t) {
    if (typeof t !== 'function') return identityT;
    return function(key, fallback) {
      try { var value = t(key, fallback); return value == null ? fallback : value; } catch (error) { return fallback; }
    };
  }
  // {name} placeholders; a function replacement, so "$" in values stays literal.
  // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
  function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
  function fill(template, values) {
    return __alloOneWord(String(template == null ? '' : template).replace(/\{(\w+)\}/g, function(whole, name) {
      return values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole;
    }));
  }
  function num(value) { return formatNumber(value, 4); }
  function money(value) {
    var rounded = roundTo(value, 2);
    return Math.abs(rounded - Math.round(rounded)) < 1e-9 ? String(Math.round(rounded)) : rounded.toFixed(2);
  }
  function listText(values) { return values.map(function(value) { return typeof value === 'number' ? num(value) : String(value); }).join(', '); }
  function hashString(text) {
    var hash = 2166136261;
    var s = String(text == null ? '' : text);
    for (var i = 0; i < s.length; i++) { hash ^= s.charCodeAt(i); hash = Math.imul(hash, 16777619) >>> 0; }
    return hash >>> 0;
  }
  function makeRng(seed) {
    var state = (Math.floor(Math.abs(finiteNumber(seed, 1))) % 4294967296) >>> 0;
    if (!state) state = 1;
    return function() {
      state = (state + 0x6D2B79F5) >>> 0;
      var x = state;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randInt(rng, lo, hi) { return lo + Math.min(hi - lo, Math.floor(rng() * (hi - lo + 1))); }
  function pickOne(rng, list) { return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; }
  function coprimePair(rng, lo, hi) {
    for (var guard = 0; guard < 80; guard++) {
      var a = randInt(rng, lo, hi), b = randInt(rng, lo, hi);
      if (a !== b && gcd(a, b) === 1) return [a, b];
    }
    return [2, 3];
  }

  var BANDS = ['g45', 'g6', 'g7', 'g8'];
  // ctx.gradeBand is only k2/g35/g68/g912, so grades 6, 7 and 8 come from ctx.gradeLevel.
  function bandForGrade(gradeLevel, gradeBand) {
    var grade = gradeNumberFromLevel(gradeLevel, gradeBand);
    if (grade == null) return 'g6';
    if (grade <= 5) return 'g45';
    if (grade === 6) return 'g6';
    if (grade === 7) return 'g7';
    return 'g8';
  }

  function moreLessPredict(t, answer, reference, referenceText) {
    var values = { ref: referenceText };
    var correct = nearlyEqual(answer, reference) ? 'same' : (answer > reference ? 'more' : 'less');
    return {
      question: fill(t('stem.ratios.pr_more_less', 'Before you solve: will the answer be more than, less than, or equal to {ref}?'), values),
      options: [{ id: 'more', label: t('stem.ratios.pr_more', 'More') }, { id: 'less', label: t('stem.ratios.pr_less', 'Less') }, { id: 'same', label: t('stem.ratios.pr_equal', 'Equal') }],
      correct: correct,
      why: fill(correct === 'more' ? t('stem.ratios.pr_why_more', 'The answer is more than {ref}.') : correct === 'less' ? t('stem.ratios.pr_why_less', 'The answer is less than {ref}.') : t('stem.ratios.pr_why_same', 'The answer is exactly {ref}.'), values)
    };
  }
  function halfPredict(t, answer, whole, wholeText) {
    var values = { ref: wholeText };
    var correct = nearlyEqual(answer, whole / 2) ? 'same' : (answer > whole / 2 ? 'more' : 'less');
    return {
      question: fill(t('stem.ratios.pr_half', 'Before you solve: will the answer be more than, less than, or exactly half of {ref}?'), values),
      options: [{ id: 'more', label: t('stem.ratios.pr_more_than_half', 'More than half') }, { id: 'less', label: t('stem.ratios.pr_less_than_half', 'Less than half') }, { id: 'same', label: t('stem.ratios.pr_exactly_half', 'Exactly half') }],
      correct: correct,
      why: fill(correct === 'more' ? t('stem.ratios.pr_why_more_half', 'The answer is more than half of {ref}.') : correct === 'less' ? t('stem.ratios.pr_why_less_half', 'The answer is less than half of {ref}.') : t('stem.ratios.pr_why_exactly_half', 'The answer is exactly half of {ref}.'), values)
    };
  }
  function addOrMultiplyPredict(t) {
    return { question: t('stem.ratios.pr_add_or_multiply', 'Before you solve: is this an adding situation or a multiplying situation?'),
      options: [{ id: 'add', label: t('stem.ratios.pr_adding', 'Adding') }, { id: 'multiply', label: t('stem.ratios.pr_multiplying', 'Multiplying') }],
      correct: 'multiply', why: t('stem.ratios.pr_why_multiplying', 'Ratios and "times as many" compare by multiplying, so both quantities change by the same factor.') };
  }
  function compareWhatPredict(t, unitLabel, totalLabel) {
    return { question: t('stem.ratios.pr_compare_what', 'Before you calculate: what should you compare to decide?'),
      options: [{ id: 'total', label: totalLabel }, { id: 'unit', label: unitLabel }],
      correct: 'unit', why: t('stem.ratios.pr_why_compare_unit', 'Comparing one unit is fair: both options are measured against the same amount.') };
  }
  function divisionPredict(t, rightLabel, wrongLabel, why) {
    return { question: t('stem.ratios.pr_which_division', 'Before you solve: which division gives the answer?'),
      options: [{ id: 'right', label: rightLabel }, { id: 'wrong', label: wrongLabel }], correct: 'right', why: why };
  }
  function step(q, a) { return { q: q, a: a }; }

  var KINDS = {
    // 4.OA.2 / 5.NF.5: "times as many" is multiplication.
    multCompare: {
      make: function(rng) { return { s: randInt(rng, 2, 12), m: randInt(rng, 2, 9), ctx: pickOne(rng, ['ribbon', 'stickers']) }; },
      build: function(p, t) {
        var answer = p.s * p.m, v = { s: num(p.s), m: num(p.m), answer: num(answer) };
        var ribbon = p.ctx !== 'stickers';
        return {
          prompt: fill(ribbon ? t('stem.ratios.g_mc_ribbon', 'A red ribbon is {s} centimeters long. A blue ribbon is {m} times as long. How long is the blue ribbon?') : t('stem.ratios.g_mc_stickers', 'Sam has {s} stickers. Lea has {m} times as many stickers as Sam. How many stickers does Lea have?'), v),
          answer: answer,
          suffix: ribbon ? t('stem.ratios.unit_cm', 'cm') : t('stem.ratios.unit_stickers', 'stickers'),
          hint: fill(t('stem.ratios.g_mc_hint', '"{m} times as many" means {m} groups the size of {s}.'), v),
          explain: fill(t('stem.ratios.g_mc_explain', '{m} × {s} = {answer}. "Times as many" compares by multiplying.'), v),
          steps: [
            step(fill(t('stem.ratios.st_mc_meaning_q', 'What does "{m} times as many" mean?'), v), fill(t('stem.ratios.st_mc_meaning_a', 'It means {m} equal groups, each the size of {s}.'), v)),
            step(t('stem.ratios.st_mc_compute_q', 'Which operation finds the size of all the groups together?'), fill(t('stem.ratios.st_mc_compute_a', 'Multiply: {m} × {s} = {answer}.'), v))
          ],
          traps: [{ value: p.s + p.m, kind: 'additive', message: fill(t('stem.ratios.mc_times_as_many_added', 'You added {s} and {m}. "{m} times as many" means multiply: {m} groups of {s}.'), v) }],
          predict: addOrMultiplyPredict(t),
          tape: { rows: [{ label: ribbon ? t('stem.ratios.tape_red_ribbon', 'Red ribbon') : t('stem.ratios.tape_sam', 'Sam'), units: 1, text: num(p.s) }, { label: ribbon ? t('stem.ratios.tape_blue_ribbon', 'Blue ribbon') : t('stem.ratios.tape_lea', 'Lea'), units: p.m, text: '?' }], unitText: num(p.s) }
        };
      }
    },
    multCompareDivide: {
      make: function(rng) { return { s: randInt(rng, 2, 12), m: randInt(rng, 2, 9), ctx: pickOne(rng, ['tree', 'savings']) }; },
      build: function(p, t) {
        var big = p.s * p.m, v = { big: num(big), m: num(p.m), answer: num(p.s), bigMoney: money(big) };
        var tree = p.ctx !== 'savings';
        return {
          prompt: fill(tree ? t('stem.ratios.g_mcd_tree', 'A tree is {big} feet tall. It is {m} times as tall as a bush. How tall is the bush?') : t('stem.ratios.g_mcd_savings', 'Ana saved ${bigMoney}. That is {m} times as much as Ben saved. How much did Ben save?'), v),
          answer: p.s,
          prefix: tree ? undefined : '$',
          suffix: tree ? t('stem.ratios.unit_feet', 'feet') : undefined,
          hint: fill(t('stem.ratios.g_mcd_hint', 'The larger amount is {m} copies of the unknown. Split it into {m} equal parts.'), v),
          explain: fill(t('stem.ratios.g_mcd_explain', '{big} ÷ {m} = {answer}, because {m} × {answer} = {big}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_mcd_q1', 'The larger amount is {m} copies of what?'), v), t('stem.ratios.st_mcd_a1', 'Of the unknown amount, so the unknown is the smaller one.')),
            step(t('stem.ratios.st_mcd_q2', 'Which operation undoes "times as many"?'), fill(t('stem.ratios.st_mcd_a2', 'Divide: {big} ÷ {m} = {answer}.'), v))
          ],
          traps: [
            { value: big * p.m, kind: 'multiplyNotDivide', message: fill(t('stem.ratios.mc_mcd_multiplied', 'You multiplied, but the unknown is the smaller amount: {big} is {m} times the unknown. Divide by {m}.'), v) },
            { value: big - p.m, kind: 'subtracted', message: fill(t('stem.ratios.mc_mcd_subtracted', 'You subtracted {m}. "{m} times as much" is a multiplying comparison, so undo it by dividing.'), v) }
          ],
          predict: moreLessPredict(t, p.s, big, tree ? num(big) : '$' + money(big)),
          tape: { rows: [{ label: tree ? t('stem.ratios.tape_bush', 'Bush') : t('stem.ratios.tape_ben', 'Ben'), units: 1, text: '?' }, { label: tree ? t('stem.ratios.tape_tree', 'Tree') : t('stem.ratios.tape_ana', 'Ana'), units: p.m, text: tree ? num(big) : '$' + money(big) }], unitText: '?' }
        };
      }
    },
    // 6.RP.3a missing value in equivalent ratios.
    missingValue: {
      make: function(rng, band) {
        var pair = coprimePair(rng, band === 'g45' ? 1 : 2, band === 'g45' ? 6 : 9);
        return { a: pair[0], b: pair[1], k: randInt(rng, 2, band === 'g45' ? 5 : (band === 'g6' ? 8 : 12)), ctx: pickOne(rng, ['paint', 'juice']), askSecond: rng() < 0.4 };
      },
      build: function(p, t) {
        var base = p.askSecond ? p.a : p.b, other = p.askSecond ? p.b : p.a, given = base * p.k, answer = other * p.k;
        var v = { a: num(p.a), b: num(p.b), given: num(given), base: num(base), other: num(other), k: num(p.k), answer: num(answer), c: num(p.a * p.k), d: num(p.b * p.k), diff: num(given - base) };
        var juice = p.ctx === 'juice';
        var prompt = juice
          ? (p.askSecond ? t('stem.ratios.g_mv_juice_second', 'A punch recipe uses {a} cups of orange juice for every {b} cups of sparkling water. How many cups of sparkling water go with {given} cups of orange juice?') : t('stem.ratios.g_mv_juice_first', 'A punch recipe uses {a} cups of orange juice for every {b} cups of sparkling water. How many cups of orange juice go with {given} cups of sparkling water?'))
          : (p.askSecond ? t('stem.ratios.g_mv_paint_second', 'A paint mix uses {a} cups of blue for every {b} cups of white. How many cups of white go with {given} cups of blue?') : t('stem.ratios.g_mv_paint_first', 'A paint mix uses {a} cups of blue for every {b} cups of white. How many cups of blue go with {given} cups of white?'));
        var labels = juice ? [t('stem.ratios.model_orange_juice_cups', 'Orange juice (cups)'), t('stem.ratios.model_sparkling_water_cups', 'Sparkling water (cups)')] : [t('stem.ratios.model_blue_paint_cups', 'Blue paint (cups)'), t('stem.ratios.model_white_paint_cups', 'White paint (cups)')];
        return {
          prompt: fill(prompt, v), answer: answer, suffix: t('stem.ratios.unit_cups', 'cups'),
          hint: fill(t('stem.ratios.g_mv_hint', 'Find what {base} was multiplied by to get {given}. Multiply {other} by the same number.'), v),
          explain: fill(t('stem.ratios.g_mv_explain', '{a}:{b} and {c}:{d} are equivalent because both quantities were multiplied by {k}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_factor_q', 'What was {base} multiplied by to get {given}?'), v), fill(t('stem.ratios.st_factor_a', '{given} ÷ {base} = {k}, so the scale factor is {k}.'), v)),
            step(fill(t('stem.ratios.st_apply_q', 'What is {other} times that scale factor?'), v), fill(t('stem.ratios.st_apply_a', '{other} × {k} = {answer}.'), v))
          ],
          traps: [
            { value: other + (given - base), kind: 'additive', added: given - base, factor: p.k, message: fill(t('stem.ratios.mc_additive', 'You added {diff} to both parts. Ratios keep the same multiplier, not the same difference: {base} was multiplied by {k}, so multiply {other} by {k} too.'), v) },
            { value: given * base / other, kind: 'inverted', message: fill(t('stem.ratios.mc_scaled_wrong_way', 'The ratio got turned upside down. {given} goes with {base}, so the answer goes with {other}: scale {other} by the same factor.'), v) },
            { value: p.k, kind: 'stoppedEarly', message: fill(t('stem.ratios.mc_scale_factor_only', '{k} is the scale factor, not the answer. Use it: multiply {other} by {k}.'), v) }
          ],
          predict: moreLessPredict(t, answer, given, num(given)),
          model: { labels: labels, rows: [[p.a, p.b], p.askSecond ? [given, '?'] : ['?', given]] }
        };
      }
    },
    simplify: {
      make: function(rng) { var pair = coprimePair(rng, 1, 9); return { a: pair[0], b: pair[1], g: randInt(rng, 2, 9) }; },
      build: function(p, t) {
        var A = p.a * p.g, B = p.b * p.g, v = { A: num(A), B: num(B), a: num(p.a), b: num(p.b), g: num(p.g) };
        var distractors = [];
        for (var c = 2; c <= 12 && distractors.length < 2; c++) if (c !== p.g && !(A % c === 0 && B % c === 0)) distractors.push(c);
        var options = [p.g].concat(distractors).sort(function(x, y) { return x - y; }).map(function(value) { return { id: String(value), label: num(value) }; });
        return {
          prompt: fill(t('stem.ratios.g_simplify_prompt', 'Simplify the ratio {A}:{B}. Enter your answer with a colon, such as 2:3.'), v),
          answers: [p.a + ':' + p.b, p.a + '/' + p.b], ratioAnswer: [p.a, p.b], ratioOriginal: [A, B],
          hint: fill(t('stem.ratios.g_simplify_hint', 'Divide both terms by their greatest common factor, {g}.'), v),
          explain: fill(t('stem.ratios.g_simplify_explain', '{A} ÷ {g} = {a} and {B} ÷ {g} = {b}, so the simplest ratio is {a}:{b}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_gcf_q', 'What is the greatest common factor of {A} and {B}?'), v), fill(t('stem.ratios.st_gcf_a', 'The greatest common factor is {g}.'), v)),
            step(t('stem.ratios.st_divide_both_q', 'What do you get when you divide both terms by it?'), fill(t('stem.ratios.st_divide_both_a', '{A} ÷ {g} = {a} and {B} ÷ {g} = {b}, so the ratio is {a}:{b}.'), v))
          ],
          traps: [],
          predict: { question: fill(t('stem.ratios.pr_common_factor', 'Before you solve: which number divides both {A} and {B} exactly?'), v), options: options, correct: String(p.g), why: fill(t('stem.ratios.pr_why_common_factor', '{g} divides both: {A} ÷ {g} = {a} and {B} ÷ {g} = {b}.'), v) },
          model: { labels: [t('stem.ratios.model_first_quantity', 'First quantity'), t('stem.ratios.model_second_quantity', 'Second quantity')], rows: [[A, B], ['?', '?']] }
        };
      }
    },
    scale: {
      make: function(rng, band) { var pair = coprimePair(rng, 2, 9); return { a: pair[0], b: pair[1], k: randInt(rng, 3, band === 'g45' ? 6 : 12) }; },
      build: function(p, t) {
        var answer = p.b * p.k, v = { a: num(p.a), b: num(p.b), k: num(p.k), answer: num(answer), first: num(p.a * p.k) };
        return {
          prompt: fill(t('stem.ratios.g_scale_prompt', 'Scale the ratio {a}:{b} by a factor of {k}. What is the second quantity?'), v),
          answer: answer,
          hint: t('stem.ratios.g_scale_hint', 'Multiply the second quantity by the scale factor.'),
          explain: fill(t('stem.ratios.g_scale_explain', '{b} × {k} = {answer}, while the first quantity becomes {a} × {k} = {first}.'), v),
          steps: [
            step(t('stem.ratios.st_scale_q1', 'What does a scale factor do to each quantity?'), fill(t('stem.ratios.st_scale_a1', 'It multiplies both quantities by {k}.'), v)),
            step(t('stem.ratios.st_scale_q2', 'What is the second quantity after scaling?'), fill(t('stem.ratios.st_scale_a2', '{b} × {k} = {answer}.'), v))
          ],
          traps: [
            { value: p.b + p.k, kind: 'additive', message: fill(t('stem.ratios.mc_scale_added', 'You added {k}. A scale factor multiplies: the second quantity becomes {b} × {k}.'), v) },
            { value: p.a * p.k, kind: 'otherQuantity', message: fill(t('stem.ratios.mc_scale_first', '{first} is the first quantity after scaling. The question asks for the second quantity.'), v) }
          ],
          predict: addOrMultiplyPredict(t),
          model: { labels: [t('stem.ratios.model_first_quantity', 'First quantity'), t('stem.ratios.model_second_quantity', 'Second quantity')], rows: [[p.a, p.b], [num(p.a) + ' × ' + num(p.k), '?']] }
        };
      }
    },
    // Part-part-whole: a tape diagram splits the whole into equal parts.
    mixtureTotal: {
      make: function(rng, band) { var pair = coprimePair(rng, 1, 5); return { a: pair[0], b: pair[1], k: randInt(rng, 2, band === 'g45' ? 5 : 9), ctx: pickOne(rng, ['trail', 'class']) }; },
      build: function(p, t) {
        var w = p.a + p.b, total = w * p.k, answer = p.a * p.k, v = { a: num(p.a), b: num(p.b), w: num(w), total: num(total), k: num(p.k), answer: num(answer) };
        var trail = p.ctx !== 'class';
        return {
          prompt: fill(trail ? t('stem.ratios.g_mt_trail', 'A trail mix uses {a} cups of raisins for every {b} cups of peanuts. A batch has {total} cups in all. How many cups of raisins are in the batch?') : t('stem.ratios.g_mt_class', 'In a class, the ratio of students who walk to school to students who ride is {a}:{b}. There are {total} students. How many students walk?'), v),
          answer: answer,
          suffix: trail ? t('stem.ratios.unit_cups', 'cups') : t('stem.ratios.unit_students', 'students'),
          hint: fill(t('stem.ratios.g_mt_hint', 'The whole is {a} + {b} = {w} equal parts. Find one part first.'), v),
          explain: fill(t('stem.ratios.g_mt_explain', '{total} ÷ {w} = {k} for each part, and {a} parts × {k} = {answer}.'), v),
          steps: [
            step(t('stem.ratios.st_parts_q', 'How many equal parts make up the whole?'), fill(t('stem.ratios.st_parts_a', '{a} + {b} = {w} parts.'), v)),
            step(t('stem.ratios.st_one_part_q', 'How much is one part?'), fill(t('stem.ratios.st_one_part_a', '{total} ÷ {w} = {k}.'), v)),
            step(fill(t('stem.ratios.st_n_parts_q', 'How much are {a} parts?'), v), fill(t('stem.ratios.st_n_parts_a', '{a} × {k} = {answer}.'), v))
          ],
          traps: [
            { value: total * p.a / p.b, kind: 'partToPart', message: fill(t('stem.ratios.mc_part_to_part_total', 'You used the part-to-part ratio {a}:{b} as if {b} were the whole. The whole is {a} + {b} = {w} parts, so split {total} into {w} equal parts.'), v) },
            { value: p.k, kind: 'stoppedEarly', message: fill(t('stem.ratios.mc_one_part_only', 'That is the size of one part. The question asks for {a} parts.'), v) },
            { value: p.b * p.k, kind: 'otherQuantity', message: t('stem.ratios.mc_other_part', 'That is the other part of the whole. Check which quantity the question asks about.') }
          ],
          predict: halfPredict(t, answer, total, num(total)),
          tape: { rows: [{ label: trail ? t('stem.ratios.tape_raisins', 'Raisins') : t('stem.ratios.tape_walk', 'Walk'), units: p.a, text: '?' }, { label: trail ? t('stem.ratios.tape_peanuts', 'Peanuts') : t('stem.ratios.tape_ride', 'Ride'), units: p.b, text: '' }], unitText: '?', totalText: fill(t('stem.ratios.tape_whole_is', 'Whole: {total}'), v) }
        };
      }
    },
    mixturePercent: {
      make: function(rng) { var pair = pickOne(rng, [[1, 1], [1, 3], [3, 1], [1, 4], [4, 1], [2, 3], [3, 2], [1, 9], [3, 7], [7, 3], [9, 1], [1, 19], [3, 17], [7, 13], [9, 11], [1, 24], [4, 21], [6, 19]]); return { a: pair[0], b: pair[1] }; },
      build: function(p, t) {
        var w = p.a + p.b, answer = p.a * 100 / w, v = { a: num(p.a), b: num(p.b), w: num(w), answer: num(answer), frac: num(p.a) + '/' + num(w) };
        return {
          prompt: fill(t('stem.ratios.g_mp_prompt', 'A trail mix uses {a} cups of raisins for every {b} cups of peanuts. What percent of the mix is raisins?'), v),
          answer: answer, suffix: '%',
          hint: fill(t('stem.ratios.g_mp_hint', 'Raisins are {a} parts out of a whole of {a} + {b} = {w} parts.'), v),
          explain: fill(t('stem.ratios.g_mp_explain', 'Raisins are {frac} of the mix, and {frac} = {answer}%.'), v),
          steps: [
            step(t('stem.ratios.st_parts_q', 'How many equal parts make up the whole?'), fill(t('stem.ratios.st_parts_a', '{a} + {b} = {w} parts.'), v)),
            step(t('stem.ratios.st_fraction_whole_q', 'What fraction of the whole are the raisins?'), fill(t('stem.ratios.st_fraction_whole_a', '{a} out of {w}, so {frac}.'), v)),
            step(t('stem.ratios.st_to_percent_q', 'What is that fraction as a percent?'), fill(t('stem.ratios.st_to_percent_a', '{frac} × 100 = {answer}%.'), v))
          ],
          traps: [
            { value: p.a * 100 / p.b, kind: 'partToPart', message: fill(t('stem.ratios.mc_part_to_part_percent', 'You compared raisins to peanuts, part to part. A percent of the mix compares raisins to the whole mix: {a} out of {w} parts.'), v) },
            { value: p.a / w, kind: 'decimalPercent', message: t('stem.ratios.mc_decimal_for_percent', 'That is a decimal. A percent counts hundredths, so multiply the decimal by 100 to write it as a percent.') }
          ],
          predict: moreLessPredict(t, answer, 50, '50%'),
          tape: { rows: [{ label: t('stem.ratios.tape_raisins', 'Raisins'), units: p.a, text: '?' }, { label: t('stem.ratios.tape_peanuts', 'Peanuts'), units: p.b, text: '' }], unitText: '', totalText: t('stem.ratios.tape_whole_100', 'Whole: 100%') }
        };
      }
    },
    // Double number line: a constant rate between two quantities.
    lineMissing: {
      make: function(rng, band) {
        var rate, a, c;
        if (band === 'g45') { rate = randInt(rng, 2, 9); a = randInt(rng, 2, 5); c = randInt(rng, a + 1, 10); }
        else {
          var den = band === 'g6' ? pickOne(rng, [1, 1, 2]) : pickOne(rng, [2, 4]);
          rate = den === 1 ? randInt(rng, 2, 12) : pickOne(rng, den === 2 ? [1.5, 2.5, 3.5, 4.5, 0.5] : [0.75, 1.25, 1.75, 2.25]);
          a = den * randInt(rng, 1, den === 4 ? 2 : 4);
          if (a < 2) a = 2 * den;
          do { c = randInt(rng, 1, 12); } while (c === a);
        }
        return { ctx: pickOne(rng, ['tickets', 'running', 'batches', 'earning']), a: a, rate: rate, c: c };
      },
      build: function(p, t) {
        var b = p.a * p.rate, answer = p.c * p.rate, isMoney = p.ctx === 'tickets' || p.ctx === 'earning';
        var f = isMoney ? money : num;
        var v = { a: num(p.a), b: f(b), c: num(p.c), rate: f(p.rate), answer: f(answer), diff: num(Math.abs(p.c - p.a)) };
        var text = {
          tickets: { prompt: t('stem.ratios.g_line_tickets', '{a} tickets cost ${b}. On a double number line, what cost aligns with {c} tickets?'), labels: [t('stem.ratios.model_tickets', 'Tickets'), t('stem.ratios.model_cost', 'Cost ($)')], scaffold: t('stem.ratios.scaffold_tickets', 'For 1 ticket, the cost is ${rate}.') },
          running: { prompt: t('stem.ratios.g_line_running', 'A runner covers {a} kilometers in {b} minutes at a steady pace. How many minutes align with {c} kilometers?'), labels: [t('stem.ratios.model_distance_km', 'Distance (km)'), t('stem.ratios.model_time_min', 'Time (min)')], scaffold: t('stem.ratios.scaffold_running', 'For 1 kilometer, the time is {rate} minutes.'), suffix: t('stem.ratios.unit_minutes', 'minutes') },
          batches: { prompt: t('stem.ratios.g_line_batches', '{a} batches use {b} cups of flour. How many cups of flour align with {c} batches?'), labels: [t('stem.ratios.model_batches', 'Batches'), t('stem.ratios.model_flour_cups', 'Flour (cups)')], scaffold: t('stem.ratios.scaffold_batches', 'For 1 batch, you need {rate} cups of flour.'), suffix: t('stem.ratios.unit_cups', 'cups') },
          earning: { prompt: t('stem.ratios.g_line_earning', 'Maya earns ${b} for {a} hours of work. On a double number line, how much does she earn for {c} hours?'), labels: [t('stem.ratios.model_hours', 'Hours'), t('stem.ratios.model_earnings', 'Earnings ($)')], scaffold: t('stem.ratios.scaffold_earning', 'For 1 hour, she earns ${rate}.') }
        }[p.ctx] || null;
        if (!text) text = { prompt: '', labels: ['', ''], scaffold: '' };
        return {
          prompt: fill(text.prompt, v), answer: answer, prefix: isMoney ? '$' : undefined, suffix: text.suffix,
          hint: fill(t('stem.ratios.g_line_hint', 'Find the value that lines up with 1 first: {b} ÷ {a}.'), v),
          explain: fill(t('stem.ratios.g_line_explain', '{b} ÷ {a} = {rate} for each 1, so {c} × {rate} = {answer}.'), v),
          steps: [
            step(t('stem.ratios.st_line_one_q', 'What value lines up with 1 on the top line?'), fill(t('stem.ratios.st_line_one_a', '{b} ÷ {a} = {rate}.'), v)),
            step(fill(t('stem.ratios.st_line_scale_q', 'What lines up with {c}?'), v), fill(t('stem.ratios.st_line_scale_a', '{c} × {rate} = {answer}.'), v))
          ],
          traps: [
            { value: b + (p.c - p.a), kind: 'additive', message: fill(p.c >= p.a ? t('stem.ratios.mc_line_added', 'You added {diff} to both lines. A double number line scales both lines by the same factor; it does not shift them by the same amount.') : t('stem.ratios.mc_line_subtracted', 'You subtracted {diff} from both lines. A double number line scales both lines by the same factor; it does not shift them by the same amount.'), v) },
            { value: p.c * b, kind: 'unitRateSkipped', message: fill(t('stem.ratios.mc_line_skipped_unit', 'You multiplied {c} by {b}, but {b} goes with {a}, not with 1. Find the value for 1 first.'), v) },
            { value: p.c * p.a / b, kind: 'inverted', message: fill(t('stem.ratios.mc_line_inverted', 'You divided the wrong way. The value for 1 on the top line is {b} ÷ {a}, not {a} ÷ {b}.'), v) },
            { value: p.rate, kind: 'stoppedEarly', message: fill(t('stem.ratios.mc_line_unit_only', 'That is the value for 1. Now scale it to {c}.'), v) }
          ],
          predict: moreLessPredict(t, answer, b, isMoney ? '$' + money(b) : num(b)),
          model: { labels: text.labels, rows: [[0, 0], [p.a, b], [p.c, '?']] },
          line: true,
          scaffoldTemplate: text.scaffold
        };
      }
    },
    unitRate: {
      make: function(rng, band) {
        var n = randInt(rng, 2, band === 'g45' ? 6 : 8);
        var r = band === 'g45' ? randInt(rng, 3, 12) : (rng() < 0.3 ? randInt(rng, 3, 30) + 0.5 : randInt(rng, 4, 60));
        if (!Number.isInteger(r) && n % 2) n += 1;
        return { ctx: pickOne(rng, ['car', 'printer', 'faucet', 'wage']), D: r * n, n: n };
      },
      build: function(p, t) {
        var answer = p.D / p.n, isMoney = p.ctx === 'wage';
        var v = { D: isMoney ? money(p.D) : num(p.D), n: num(p.n), answer: isMoney ? money(answer) : num(answer) };
        var text = {
          car: { prompt: t('stem.ratios.g_ur_car', 'A car travels {D} miles in {n} hours at a steady speed. What is its unit rate in miles per hour?'), suffix: t('stem.ratios.unit_mph', 'mph'), labels: [t('stem.ratios.model_distance_miles', 'Distance (miles)'), t('stem.ratios.model_time_hours', 'Time (hours)')] },
          printer: { prompt: t('stem.ratios.g_ur_printer', 'A printer prints {D} pages in {n} minutes. How many pages does it print per minute?'), suffix: t('stem.ratios.unit_pages_per_minute', 'pages per minute'), labels: [t('stem.ratios.model_pages', 'Pages'), t('stem.ratios.model_minutes', 'Minutes')] },
          faucet: { prompt: t('stem.ratios.g_ur_faucet', 'A faucet fills a {D}-liter tub in {n} minutes. How many liters flow per minute?'), suffix: t('stem.ratios.unit_liters_per_minute', 'liters per minute'), labels: [t('stem.ratios.model_liters', 'Water (liters)'), t('stem.ratios.model_minutes', 'Minutes')] },
          wage: { prompt: t('stem.ratios.g_ur_wage', 'Leo earns ${D} for {n} hours of work. How much does he earn per hour?'), labels: [t('stem.ratios.model_earnings', 'Earnings ($)'), t('stem.ratios.model_hours', 'Hours')] }
        }[p.ctx] || { prompt: '', labels: ['', ''] };
        return {
          prompt: fill(text.prompt, v), answer: answer, prefix: isMoney ? '$' : undefined, suffix: text.suffix,
          hint: t('stem.ratios.g_ur_hint', 'A unit rate is the amount for 1. Divide the total by the number of hours or minutes.'),
          explain: fill(t('stem.ratios.g_ur_explain', '{D} ÷ {n} = {answer} for each 1.'), v),
          steps: [
            step(t('stem.ratios.st_ur_q1', 'Which quantity should become 1?'), fill(t('stem.ratios.st_ur_a1', 'The time. {n} becomes 1, so divide both quantities by {n}.'), v)),
            step(t('stem.ratios.st_ur_q2', 'What is the other quantity divided by the same number?'), fill(t('stem.ratios.st_ur_a2', '{D} ÷ {n} = {answer}.'), v))
          ],
          traps: [
            { value: p.D * p.n, kind: 'multiplyNotDivide', message: fill(t('stem.ratios.mc_ur_multiplied', 'You multiplied. A unit rate is the amount for 1, so here it is smaller than the total: divide {D} by {n}.'), v) },
            { value: p.n / p.D, kind: 'inverted', message: fill(t('stem.ratios.mc_ur_inverted', 'You divided {n} by {D}. Put the amount you want for each 1 on top: {D} ÷ {n}.'), v) }
          ],
          predict: moreLessPredict(t, answer, p.D, isMoney ? '$' + money(p.D) : num(p.D)),
          model: { labels: text.labels, rows: [[p.D, p.n], ['?', 1]] },
          link: p.ctx === 'car' ? { tool: 'unitConvert', category: 'speed', from: 'mph', to: 'km/h', value: answer } : undefined
        };
      }
    },
    betterBuy: {
      make: function(rng) {
        var sizes = [6, 8, 10, 12, 15, 16, 20, 24, 30, 32], qa = 12, qb = 20, ua = 30, ub = 27;
        for (var guard = 0; guard < 300; guard++) {
          qa = pickOne(rng, sizes); qb = pickOne(rng, sizes); ua = randInt(rng, 15, 60); ub = randInt(rng, 15, 60);
          if (qa !== qb && ua !== ub && qa * ua !== qb * ub && ((qa * ua < qb * ub) !== (ua < ub))) break;
        }
        return { qa: qa, pa: qa * ua / 100, qb: qb, pb: qb * ub / 100 };
      },
      build: function(p, t) {
        var ua = p.pa / p.qa, ub = p.pb / p.qb, winner = ua < ub ? 'a' : 'b', loser = winner === 'a' ? 'b' : 'a';
        var sticker = p.pa === p.pb ? null : (p.pa < p.pb ? 'a' : 'b');
        var v = { qa: num(p.qa), qb: num(p.qb), pa: money(p.pa), pb: money(p.pb), ua: formatUnitRate(ua, 3), ub: formatUnitRate(ub, 3), w: winner.toUpperCase(), x: loser.toUpperCase() };
        var traps = {};
        traps[loser] = sticker === loser
          ? { kind: 'stickerPrice', message: fill(t('stem.ratios.mc_sticker_price', 'Option {x} has the lower total price, but it is a different-size package. Compare the price of 1 ounce for each option.'), v) }
          : { kind: 'totalNotRate', message: t('stem.ratios.mc_compare_unit_price', 'Divide each price by its number of ounces, then compare the prices for 1 ounce.') };
        return {
          prompt: fill(t('stem.ratios.g_bb_prompt', 'Option A is {qa} oz for ${pa}. Option B is {qb} oz for ${pb}. Which has the lower cost per ounce? Enter A or B.'), v),
          answers: [winner, 'option ' + winner], choiceTraps: traps,
          hint: t('stem.ratios.g_bb_hint', 'Divide each price by its number of ounces.'),
          explain: fill(t('stem.ratios.g_bb_explain', 'A costs ${ua} per ounce and B costs ${ub} per ounce, so {w} has the lower cost per ounce.'), v),
          steps: [
            step(t('stem.ratios.st_bb_q1', 'What does 1 ounce of option A cost?'), fill(t('stem.ratios.st_bb_a1', '${pa} ÷ {qa} = ${ua}.'), v)),
            step(t('stem.ratios.st_bb_q2', 'What does 1 ounce of option B cost?'), fill(t('stem.ratios.st_bb_a2', '${pb} ÷ {qb} = ${ub}.'), v)),
            step(t('stem.ratios.st_bb_q3', 'Which price for 1 ounce is lower?'), fill(t('stem.ratios.st_bb_a3', 'Option {w}.'), v))
          ],
          predict: compareWhatPredict(t, t('stem.ratios.pr_price_one_ounce', 'The price of 1 ounce'), t('stem.ratios.pr_total_prices', 'The total prices')),
          model: { labels: [t('stem.ratios.model_option', 'Option'), t('stem.ratios.model_mass_oz', 'Mass (oz)'), t('stem.ratios.model_price', 'Price ($)'), t('stem.ratios.model_price_per_oz', 'Price per oz')], rows: [['A', p.qa, money(p.pa), '?'], ['B', p.qb, money(p.pb), '?']] }
        };
      }
    },
    compareRates: {
      make: function(rng) {
        var ra = 14, rb = 15, ma = 6, mb = 7;
        for (var guard = 0; guard < 300; guard++) {
          ra = randInt(rng, 8, 20); rb = randInt(rng, 8, 20); ma = randInt(rng, 3, 9); mb = randInt(rng, 3, 9);
          if (ra !== rb && ra * ma !== rb * mb && ((ra > rb) === (ra * ma < rb * mb))) break;
        }
        return { pa: ra * ma, ma: ma, pb: rb * mb, mb: mb };
      },
      build: function(p, t) {
        var ra = p.pa / p.ma, rb = p.pb / p.mb, winner = ra > rb ? 'a' : 'b', loser = winner === 'a' ? 'b' : 'a';
        var v = { pa: num(p.pa), ma: num(p.ma), pb: num(p.pb), mb: num(p.mb), ra: num(ra), rb: num(rb), w: winner.toUpperCase(), x: loser.toUpperCase() };
        var loserTotal = loser === 'a' ? p.pa : p.pb, winnerTotal = winner === 'a' ? p.pa : p.pb;
        var traps = {};
        traps[loser] = loserTotal > winnerTotal
          ? { kind: 'totalNotRate', message: fill(t('stem.ratios.mc_more_pages_total', 'Printer {x} makes more pages in all, but it also runs for more minutes. Compare the pages made in 1 minute.'), v) }
          : { kind: 'other', message: t('stem.ratios.mc_compare_per_minute', 'Divide each number of pages by its minutes, then compare the pages made in 1 minute.') };
        return {
          prompt: fill(t('stem.ratios.g_cr_prompt', 'Printer A makes {pa} pages in {ma} minutes. Printer B makes {pb} pages in {mb} minutes. Which is faster? Enter A or B.'), v),
          answers: [winner, 'printer ' + winner], choiceTraps: traps,
          hint: t('stem.ratios.g_cr_hint', 'Compare pages per one minute.'),
          explain: fill(t('stem.ratios.g_cr_explain', 'A prints {ra} pages per minute and B prints {rb} pages per minute, so {w} is faster.'), v),
          steps: [
            step(t('stem.ratios.st_cr_q1', 'How many pages does printer A make in 1 minute?'), fill(t('stem.ratios.st_cr_a1', '{pa} ÷ {ma} = {ra}.'), v)),
            step(t('stem.ratios.st_cr_q2', 'How many pages does printer B make in 1 minute?'), fill(t('stem.ratios.st_cr_a2', '{pb} ÷ {mb} = {rb}.'), v)),
            step(t('stem.ratios.st_cr_q3', 'Which makes more pages in 1 minute?'), fill(t('stem.ratios.st_cr_a3', 'Printer {w}.'), v))
          ],
          predict: compareWhatPredict(t, t('stem.ratios.pr_pages_one_minute', 'The pages made in 1 minute'), t('stem.ratios.pr_total_pages', 'The total pages')),
          model: { labels: [t('stem.ratios.model_printer', 'Printer'), t('stem.ratios.model_pages', 'Pages'), t('stem.ratios.model_minutes', 'Minutes'), t('stem.ratios.model_pages_per_minute', 'Pages per minute')], rows: [['A', p.pa, p.ma, '?'], ['B', p.pb, p.mb, '?']] }
        };
      }
    },
    // 7.RP.1 unit rates with fractions.
    fractionRate: {
      make: function(rng) {
        var pair = pickOne(rng, [[[1, 2], [1, 4]], [[3, 4], [1, 2]], [[2, 3], [1, 3]], [[1, 3], [1, 6]], [[5, 8], [1, 4]], [[3, 5], [3, 10]], [[1, 2], [2, 3]], [[3, 4], [1, 4]], [[1, 4], [1, 2]], [[2, 5], [4, 5]], [[3, 8], [3, 4]], [[7, 10], [1, 5]], [[1, 2], [1, 8]], [[5, 6], [1, 3]]]);
        return { f1: pair[0], f2: pair[1], ctx: pickOne(rng, ['snail', 'paint']) };
      },
      build: function(p, t) {
        var x = p.f1[0] / p.f1[1], y = p.f2[0] / p.f2[1], answer = x / y;
        var v = { f1: p.f1[0] + '/' + p.f1[1], f2: p.f2[0] + '/' + p.f2[1], recip: p.f2[1] + '/' + p.f2[0], answer: num(answer) };
        var snail = p.ctx !== 'paint';
        return {
          prompt: fill(snail ? t('stem.ratios.g_fr_snail', 'A snail crawls {f1} of a meter in {f2} of an hour. At this rate, how many meters does it crawl in 1 hour? Enter a fraction or a decimal.') : t('stem.ratios.g_fr_paint', 'Jo paints {f1} of a wall in {f2} of an hour. At this rate, how many walls can Jo paint in 1 hour? Enter a fraction or a decimal.'), v),
          answer: answer, suffix: snail ? t('stem.ratios.unit_meters', 'meters') : t('stem.ratios.unit_walls', 'walls'),
          hint: fill(t('stem.ratios.g_fr_hint', 'Divide the amount by the time: ({f1}) ÷ ({f2}).'), v),
          explain: fill(t('stem.ratios.g_fr_explain', '({f1}) ÷ ({f2}) = {f1} × {recip} = {answer} for each hour.'), v),
          steps: [
            step(t('stem.ratios.st_fr_q1', 'Which division gives the amount for 1 hour?'), fill(t('stem.ratios.st_fr_a1', 'Amount ÷ time: ({f1}) ÷ ({f2}).'), v)),
            step(t('stem.ratios.st_fr_q2', 'How do you divide by a fraction?'), fill(t('stem.ratios.st_fr_a2', 'Multiply by its reciprocal: {f1} × {recip} = {answer}.'), v))
          ],
          traps: [
            { value: x * y, kind: 'multiplyNotDivide', message: fill(t('stem.ratios.mc_fr_multiplied', 'You multiplied the fractions. The amount for 1 hour divides: ({f1}) ÷ ({f2}).'), v) },
            { value: y / x, kind: 'inverted', message: fill(t('stem.ratios.mc_fr_inverted', 'You divided the time by the amount. Divide the amount by the time: ({f1}) ÷ ({f2}).'), v) }
          ],
          predict: moreLessPredict(t, answer, x, v.f1),
          model: { labels: [snail ? t('stem.ratios.model_distance_m', 'Distance (m)') : t('stem.ratios.model_walls', 'Walls painted'), t('stem.ratios.model_time_hours', 'Time (hours)')], rows: [[v.f1, v.f2], ['?', 1]] }
        };
      }
    },
    percentPart: {
      make: function(rng, band) {
        if (band === 'g45') return { p: pickOne(rng, [10, 20, 25, 50, 75]), W: randInt(rng, 1, 10) * 20, ctx: pickOne(rng, ['plain', 'school']) };
        return { p: randInt(rng, 1, 19) * 5, W: randInt(rng, 2, 30) * 20, ctx: pickOne(rng, ['plain', 'school']) };
      },
      build: function(p, t) {
        var answer = p.p * p.W / 100, v = { p: num(p.p), W: num(p.W), dec: num(p.p / 100), answer: num(answer), q: num(100 - p.p) };
        var school = p.ctx === 'school';
        return {
          prompt: fill(school ? t('stem.ratios.g_pp_school', 'A school has {W} students. {p}% of them walk to school. How many students walk?') : t('stem.ratios.g_pp_plain', 'What is {p}% of {W}?'), v),
          answer: answer, suffix: school ? t('stem.ratios.unit_students', 'students') : undefined,
          hint: fill(t('stem.ratios.g_pp_hint', 'Write {p}% as the decimal {dec}, then multiply by the whole.'), v),
          explain: fill(t('stem.ratios.g_pp_explain', '{dec} × {W} = {answer}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_pct_dec_q', 'What is {p}% as a decimal?'), v), fill(t('stem.ratios.st_pct_dec_a', '{p}% = {p} hundredths = {dec}.'), v)),
            step(t('stem.ratios.st_pp_q2', 'What is that decimal times the whole?'), fill(t('stem.ratios.st_pp_a2', '{dec} × {W} = {answer}.'), v))
          ],
          traps: [
            { value: p.W * p.p, kind: 'decimalPercent', message: fill(t('stem.ratios.mc_pp_forgot_hundredths', 'You multiplied by {p}, but {p}% means {p} hundredths. Multiply by {dec} instead.'), v) },
            { value: p.W / p.p, kind: 'divideNotMultiply', message: fill(t('stem.ratios.mc_pp_divided', 'You divided. Finding a percent of a number multiplies: {p}% of {W} is {dec} × {W}.'), v) },
            p.p !== 50 ? { value: p.W * (100 - p.p) / 100, kind: 'complement', message: fill(t('stem.ratios.mc_pp_complement', 'That is the other {q}%. The question asks for {p}%.'), v) } : null
          ].filter(Boolean),
          predict: halfPredict(t, answer, p.W, num(p.W)),
          model: { labels: [t('stem.ratios.model_part', 'Part'), t('stem.ratios.model_whole', 'Whole'), t('stem.ratios.model_percent', 'Percent')], rows: [['?', p.W, num(p.p) + '%']] }
        };
      }
    },
    percentRate: {
      make: function(rng) {
        var W = pickOne(rng, [20, 25, 40, 50, 80, 120, 200, 250, 400, 500]), pct = 25;
        for (var guard = 0; guard < 60; guard++) { pct = randInt(rng, 1, 19) * 5; if (Number.isInteger(W * pct / 100)) break; }
        if (!Number.isInteger(W * pct / 100)) pct = 50;
        return { P: W * pct / 100, W: W, ctx: pickOne(rng, ['plain', 'quiz']) };
      },
      build: function(p, t) {
        var answer = p.P / p.W * 100, v = { P: num(p.P), W: num(p.W), dec: num(p.P / p.W), answer: num(answer) };
        return {
          prompt: fill(p.ctx === 'quiz' ? t('stem.ratios.g_pr_quiz', 'Mia answered {P} of {W} questions correctly. What percent did she answer correctly?') : t('stem.ratios.g_pr_plain', '{P} is what percent of {W}?'), v),
          answer: answer, suffix: '%',
          hint: t('stem.ratios.g_pr_hint', 'Divide the part by the whole, then multiply by 100.'),
          explain: fill(t('stem.ratios.g_pr_explain', '{P} ÷ {W} = {dec}, which is {answer}%.'), v),
          steps: [
            step(t('stem.ratios.st_pr_q1', 'What is the part divided by the whole?'), fill(t('stem.ratios.st_pr_a1', '{P} ÷ {W} = {dec}.'), v)),
            step(t('stem.ratios.st_pr_q2', 'What is that decimal as a percent?'), fill(t('stem.ratios.st_pr_a2', '{dec} × 100 = {answer}%.'), v))
          ],
          traps: [
            { value: p.P / p.W, kind: 'decimalPercent', message: t('stem.ratios.mc_decimal_for_percent', 'That is a decimal. A percent counts hundredths, so multiply the decimal by 100 to write it as a percent.') },
            { value: p.W / p.P * 100, kind: 'inverted', message: t('stem.ratios.mc_pr_inverted', 'You divided the whole by the part. A percent of the whole is part ÷ whole × 100.') }
          ],
          predict: moreLessPredict(t, answer, 50, '50%'),
          model: { labels: [t('stem.ratios.model_part', 'Part'), t('stem.ratios.model_whole', 'Whole'), t('stem.ratios.model_percent', 'Percent')], rows: [[p.P, p.W, '?']] }
        };
      }
    },
    percentWhole: {
      make: function(rng) {
        var W = 200, pct = 20;
        for (var guard = 0; guard < 60; guard++) {
          W = pickOne(rng, [40, 50, 60, 80, 120, 150, 200, 240, 300, 400]); pct = pickOne(rng, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75]);
          if (Number.isInteger(W * pct / 100)) break;
        }
        if (!Number.isInteger(W * pct / 100)) { W = 200; pct = 20; }
        return { P: W * pct / 100, p: pct, ctx: pickOne(rng, ['plain', 'store']) };
      },
      build: function(p, t) {
        var answer = p.P * 100 / p.p, v = { P: num(p.P), p: num(p.p), dec: num(p.p / 100), answer: num(answer) };
        var store = p.ctx === 'store';
        return {
          prompt: fill(store ? t('stem.ratios.g_pw_store', 'A store sold {P} shirts on Monday. That was {p}% of all its shirts. How many shirts did the store have?') : t('stem.ratios.g_pw_plain', '{P} is {p}% of what number?'), v),
          answer: answer, suffix: store ? t('stem.ratios.unit_shirts', 'shirts') : undefined,
          hint: t('stem.ratios.g_pw_hint', 'Divide the part by the percent written as a decimal.'),
          explain: fill(t('stem.ratios.g_pw_explain', '{P} ÷ {dec} = {answer}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_pct_dec_q', 'What is {p}% as a decimal?'), v), fill(t('stem.ratios.st_pct_dec_a', '{p}% = {p} hundredths = {dec}.'), v)),
            step(t('stem.ratios.st_pw_q2', 'The part is that decimal times the whole. How do you undo the multiplication?'), fill(t('stem.ratios.st_pw_a2', 'Divide: {P} ÷ {dec} = {answer}.'), v))
          ],
          traps: [
            { value: p.P * p.p / 100, kind: 'multiplyNotDivide', message: fill(t('stem.ratios.mc_pw_multiplied', 'You multiplied. {P} is only {p}% of the whole, so the whole must be bigger than {P}. Divide by {dec}.'), v) },
            { value: p.P * p.p, kind: 'multiplyNotDivide', message: fill(t('stem.ratios.mc_pw_multiplied_percent', 'You multiplied by {p}. The whole must be bigger than {P}, and {p}% means {dec}: divide {P} by {dec}.'), v) },
            { value: p.P / p.p, kind: 'decimalPercent', message: fill(t('stem.ratios.mc_pw_divided_percent', 'You divided by {p}, but {p}% means {dec}. Divide by {dec} instead.'), v) }
          ],
          predict: moreLessPredict(t, answer, p.P, num(p.P)),
          model: { labels: [t('stem.ratios.model_part', 'Part'), t('stem.ratios.model_whole', 'Whole'), t('stem.ratios.model_percent', 'Percent')], rows: [[p.P, '?', num(p.p) + '%']] }
        };
      }
    },
    decimalPercent: {
      make: function(rng) { return { pct: pickOne(rng, [35, 8, 60, 125, 12.5, 4, 90, 45, 250, 1.5, 70, 3]), toPercent: rng() < 0.5 }; },
      build: function(p, t) {
        var d = p.pct / 100, v = { d: num(d), p: num(p.pct) };
        var toPercent = !!p.toPercent;
        return {
          prompt: fill(toPercent ? t('stem.ratios.g_dp_to_percent', 'Write {d} as a percent.') : t('stem.ratios.g_dp_to_decimal', 'Write {p}% as a decimal.'), v),
          answer: toPercent ? p.pct : d, suffix: toPercent ? '%' : undefined, decimalAnswer: !toPercent,
          hint: toPercent ? t('stem.ratios.g_dp_hint_percent', 'A percent counts hundredths. Multiply the decimal by 100.') : t('stem.ratios.g_dp_hint_decimal', 'A percent counts hundredths. Divide the percent by 100.'),
          explain: fill(toPercent ? t('stem.ratios.g_dp_explain_percent', '{d} × 100 = {p}, so {d} = {p}%.') : t('stem.ratios.g_dp_explain_decimal', '{p} ÷ 100 = {d}, so {p}% = {d}.'), v),
          steps: [
            step(t('stem.ratios.st_dp_q1', 'What does "percent" mean?'), t('stem.ratios.st_dp_a1', 'Per hundred: 1% is one hundredth, 0.01.')),
            step(toPercent ? t('stem.ratios.st_dp_q2_percent', 'How many hundredths is the decimal?') : t('stem.ratios.st_dp_q2_decimal', 'What is that many hundredths as a decimal?'), fill(toPercent ? t('stem.ratios.st_dp_a2_percent', '{d} × 100 = {p}, so it is {p}%.') : t('stem.ratios.st_dp_a2_decimal', '{p} ÷ 100 = {d}.'), v))
          ],
          traps: toPercent
            ? [{ value: d, kind: 'decimalPercent', message: t('stem.ratios.mc_dp_no_change', 'You copied the decimal. A percent counts hundredths, so multiply the decimal by 100.') }, { value: d * 10, kind: 'placeValue', message: t('stem.ratios.mc_dp_one_place_percent', 'Move the decimal point two places, not one: multiply by 100.') }]
            : [{ value: p.pct, kind: 'decimalPercent', message: t('stem.ratios.mc_percent_for_decimal', 'That is the percent number. To write a percent as a decimal, divide it by 100.') }, { value: p.pct / 10, kind: 'placeValue', message: t('stem.ratios.mc_dp_one_place_decimal', 'Move the decimal point two places, not one: divide by 100.') }],
          predict: { question: t('stem.ratios.pr_dp_question', 'Before you solve: do you multiply or divide by 100?'), options: [{ id: 'multiply', label: t('stem.ratios.pr_multiply_100', 'Multiply by 100') }, { id: 'divide', label: t('stem.ratios.pr_divide_100', 'Divide by 100') }], correct: toPercent ? 'multiply' : 'divide', why: toPercent ? t('stem.ratios.pr_why_multiply_100', 'A decimal becomes a percent when you count its hundredths: multiply by 100.') : t('stem.ratios.pr_why_divide_100', 'A percent becomes a decimal when you divide it into hundredths: divide by 100.') },
          model: { labels: [t('stem.ratios.model_decimal', 'Decimal'), t('stem.ratios.model_percent', 'Percent')], rows: [toPercent ? [num(d), '?'] : ['?', num(p.pct) + '%']] }
        };
      }
    },
    // 7.RP.3 percent change.
    percentChange: {
      make: function(rng) {
        var o = 80, pct = 25, up = true;
        for (var guard = 0; guard < 80; guard++) {
          o = pickOne(rng, [20, 25, 40, 50, 60, 80, 120, 200, 250, 400]); pct = pickOne(rng, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75]); up = rng() < 0.5;
          if (Number.isInteger(o * pct / 100)) break;
        }
        if (!Number.isInteger(o * pct / 100)) { o = 80; pct = 25; }
        return { o: o, pct: pct, up: up, ctx: pickOne(rng, ['price', 'club']) };
      },
      build: function(p, t) {
        var diff = p.o * p.pct / 100, n = p.up ? p.o + diff : p.o - diff, price = p.ctx === 'price';
        var v = { o: price ? money(p.o) : num(p.o), n: price ? money(n) : num(n), diff: price ? money(diff) : num(diff), answer: num(p.pct), dec: num(p.pct / 100) };
        var prompt = price
          ? (p.up ? t('stem.ratios.g_pc_price_up', 'The price of a bike rises from ${o} to ${n}. What is the percent increase?') : t('stem.ratios.g_pc_price_down', 'The price of a jacket drops from ${o} to ${n}. What is the percent decrease?'))
          : (p.up ? t('stem.ratios.g_pc_club_up', 'A club grows from {o} members to {n} members. What is the percent increase?') : t('stem.ratios.g_pc_club_down', 'A club shrinks from {o} members to {n} members. What is the percent decrease?'));
        return {
          prompt: fill(prompt, v), answer: p.pct, suffix: '%',
          hint: t('stem.ratios.g_pc_hint', 'Find the amount of change, then divide it by the original amount.'),
          explain: fill(t('stem.ratios.g_pc_explain', 'The change is {diff}, and {diff} ÷ {o} = {dec} = {answer}%.'), v),
          steps: [
            step(t('stem.ratios.st_pc_q1', 'How much did the amount change?'), fill(t('stem.ratios.st_pc_a1', 'The change is {diff}.'), v)),
            step(t('stem.ratios.st_pc_q2', 'What is the change divided by the original amount?'), fill(t('stem.ratios.st_pc_a2', '{diff} ÷ {o} = {dec}.'), v)),
            step(t('stem.ratios.st_to_percent_q', 'What is that fraction as a percent?'), fill(t('stem.ratios.st_pc_a3', '{dec} = {answer}%.'), v))
          ],
          traps: [
            { value: diff / n * 100, kind: 'wrongBase', message: t('stem.ratios.mc_pc_new_base', 'You divided by the new amount. Percent change always compares the change with the original amount.') },
            { value: diff, kind: 'difference', message: t('stem.ratios.mc_pc_difference', 'That is the amount of change. The question asks for the change as a percent of the original amount.') },
            { value: p.pct / 100, kind: 'decimalPercent', message: t('stem.ratios.mc_decimal_for_percent', 'That is a decimal. A percent counts hundredths, so multiply the decimal by 100 to write it as a percent.') },
            { value: n / p.o * 100, kind: 'wholeNotChange', message: t('stem.ratios.mc_pc_whole', 'That is the new amount as a percent of the original. The percent change is how far that is from 100%.') }
          ],
          predict: { question: t('stem.ratios.pr_pc_base', 'Before you solve: which amount do you divide the change by?'), options: [{ id: 'original', label: t('stem.ratios.pr_original', 'The original amount') }, { id: 'new', label: t('stem.ratios.pr_new', 'The new amount') }], correct: 'original', why: t('stem.ratios.pr_why_original', 'Percent change compares the change with where you started, the original amount.') },
          model: { labels: [t('stem.ratios.model_original', 'Original'), t('stem.ratios.model_new', 'New'), t('stem.ratios.model_change', 'Change'), t('stem.ratios.model_percent_change', 'Percent change')], rows: [[v.o, v.n, '?', '?']] }
        };
      }
    },
    // 7.RP.3 tax and tips add to the price.
    taxTip: {
      make: function(rng) { return { P: pickOne(rng, [12, 16, 20, 24, 30, 36, 40, 48, 60, 80]), r: pickOne(rng, [5, 6, 8, 10, 15, 18, 20, 25]), ctx: pickOne(rng, ['tax', 'tip']) }; },
      build: function(p, t) {
        var amount = p.P * p.r / 100, answer = p.P + amount, v = { P: money(p.P), r: num(p.r), amount: money(amount), answer: money(answer), dec: num(p.r / 100) };
        var tax = p.ctx !== 'tip';
        return {
          prompt: fill(tax ? t('stem.ratios.g_tt_tax', 'A jacket costs ${P}. The sales tax is {r}%. What is the total cost with tax?') : t('stem.ratios.g_tt_tip', 'A meal costs ${P}. You leave a {r}% tip. What is the total, including the tip?'), v),
          answer: answer, prefix: '$',
          hint: fill(t('stem.ratios.g_tt_hint', 'Find {r}% of ${P}, then add it to the price.'), v),
          explain: fill(t('stem.ratios.g_tt_explain', '{dec} × ${P} = ${amount}, and ${P} + ${amount} = ${answer}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_tt_q1', 'What is {r}% of ${P}?'), v), fill(t('stem.ratios.st_tt_a1', '{dec} × ${P} = ${amount}.'), v)),
            step(t('stem.ratios.st_tt_q2', 'Is that amount added to or taken off the price?'), fill(t('stem.ratios.st_tt_a2', 'Added: ${P} + ${amount} = ${answer}.'), v))
          ],
          traps: [
            { value: amount, kind: 'partOnly', message: tax ? t('stem.ratios.mc_tax_only', 'That is the tax by itself. The question asks for the total the customer pays.') : t('stem.ratios.mc_tip_only', 'That is the tip by itself. The question asks for the total, including the meal.') },
            { value: p.P + p.r, kind: 'addedPercent', message: fill(t('stem.ratios.mc_added_percent_dollars', 'You added {r} dollars. {r}% means {r} hundredths of the price, not {r} dollars.'), v) },
            { value: p.P - amount, kind: 'wrongDirection', message: fill(t('stem.ratios.mc_subtracted_tax', 'You subtracted. Tax and tips are added, so the total is more than ${P}.'), v) }
          ],
          predict: moreLessPredict(t, answer, p.P, '$' + money(p.P)),
          model: { labels: [t('stem.ratios.model_price', 'Price ($)'), t('stem.ratios.model_rate', 'Rate'), t('stem.ratios.model_amount', 'Amount ($)'), t('stem.ratios.model_total', 'Total ($)')], rows: [[money(p.P), num(p.r) + '%', '?', '?']] }
        };
      }
    },
    // 7.RP.3 discounts subtract; markups add.
    discountMarkup: {
      make: function(rng) { var discount = rng() < 0.5; return { P: pickOne(rng, [12, 16, 20, 24, 30, 36, 40, 48, 60, 80]), r: pickOne(rng, discount ? [10, 15, 20, 25, 30, 40, 50, 75] : [20, 25, 30, 40, 50, 60, 75, 100]), ctx: discount ? 'discount' : 'markup' }; },
      build: function(p, t) {
        var discount = p.ctx === 'discount', amount = p.P * p.r / 100, answer = discount ? p.P - amount : p.P + amount;
        var v = { P: money(p.P), r: num(p.r), amount: money(amount), answer: money(answer), dec: num(p.r / 100) };
        return {
          prompt: fill(discount ? t('stem.ratios.g_dm_discount', 'A game costs ${P}. It is on sale for {r}% off. What is the sale price?') : t('stem.ratios.g_dm_markup', 'A store buys a lamp for ${P} and marks the price up {r}%. What is the selling price?'), v),
          answer: answer, prefix: '$',
          hint: discount ? fill(t('stem.ratios.g_dm_hint_discount', 'Find {r}% of ${P}, then take it off the price.'), v) : fill(t('stem.ratios.g_dm_hint_markup', 'Find {r}% of ${P}, then add it to the price.'), v),
          explain: fill(discount ? t('stem.ratios.g_dm_explain_discount', '{dec} × ${P} = ${amount}, and ${P} − ${amount} = ${answer}.') : t('stem.ratios.g_dm_explain_markup', '{dec} × ${P} = ${amount}, and ${P} + ${amount} = ${answer}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_tt_q1', 'What is {r}% of ${P}?'), v), fill(t('stem.ratios.st_tt_a1', '{dec} × ${P} = ${amount}.'), v)),
            step(t('stem.ratios.st_tt_q2', 'Is that amount added to or taken off the price?'), fill(discount ? t('stem.ratios.st_dm_a2_discount', 'Taken off: ${P} − ${amount} = ${answer}.') : t('stem.ratios.st_dm_a2_markup', 'Added: ${P} + ${amount} = ${answer}.'), v))
          ],
          traps: [
            { value: amount, kind: 'partOnly', message: discount ? t('stem.ratios.mc_discount_only', 'That is the discount by itself, the amount you save. The question asks for the price you pay.') : t('stem.ratios.mc_markup_only', 'That is the markup by itself. The question asks for the new selling price.') },
            { value: discount ? p.P - p.r : p.P + p.r, kind: 'addedPercent', message: fill(t('stem.ratios.mc_percent_as_dollars', 'You used {r} dollars. {r}% means {r} hundredths of the price, not {r} dollars.'), v) },
            { value: discount ? p.P + amount : p.P - amount, kind: 'wrongDirection', message: discount ? fill(t('stem.ratios.mc_discount_added', 'You added the discount. A sale takes money off, so the price is less than ${P}.'), v) : fill(t('stem.ratios.mc_markup_subtracted', 'You subtracted the markup. A markup raises the price, so it is more than ${P}.'), v) }
          ],
          predict: moreLessPredict(t, answer, p.P, '$' + money(p.P)),
          model: { labels: [t('stem.ratios.model_price', 'Price ($)'), t('stem.ratios.model_rate', 'Rate'), t('stem.ratios.model_amount', 'Amount ($)'), t('stem.ratios.model_new_price', 'New price ($)')], rows: [[money(p.P), num(p.r) + '%', '?', '?']] }
        };
      }
    },
    propTable: {
      make: function(rng, band) {
        var k = band === 'g45' ? randInt(rng, 2, 5) : pickOne(rng, [2, 3, 4, 5, 1.5, 2.5]);
        var pool = [], hi = band === 'g45' ? 6 : 10;
        for (var x = 1; x <= hi; x++) pool.push(x);
        var xs = [];
        while (xs.length < 3) { var pickX = pool.splice(Math.floor(rng() * pool.length), 1)[0]; xs.push(pickX); }
        xs.sort(function(a, b) { return a - b; });
        var variant = rng() < 0.5 ? 'prop' : (rng() < 0.5 ? 'intercept' : 'oneOff');
        var b0 = randInt(rng, 1, 4), bad = randInt(rng, 1, 2);
        var ys = xs.map(function(xv, i) { return variant === 'intercept' ? k * xv + b0 : (variant === 'oneOff' && i === bad ? k * xv + 1 : k * xv); });
        return { xs: xs, ys: ys };
      },
      build: function(p, t) {
        var pairs = p.xs.map(function(xv, i) { return { x: xv, y: p.ys[i] }; });
        var yes = analyzeProportionalPairs(pairs).proportional;
        var slope = (p.ys[1] - p.ys[0]) / (p.xs[1] - p.xs[0]);
        var linear = pairs.every(function(pair) { return nearlyEqual(pair.y - p.ys[0], slope * (pair.x - p.xs[0])); });
        var v = { xs: listText(p.xs), ys: listText(p.ys), rates: pairs.map(function(pair) { return formatUnitRate(pair.y / pair.x, 3); }).join(', ') };
        var traps = {};
        if (yes) traps.no = { kind: 'other', message: t('stem.ratios.mc_prop_check_rows', 'Find y ÷ x in every row. Are any of them different?') };
        else traps.yes = linear
          ? { kind: 'interceptProportional', message: fill(t('stem.ratios.mc_prop_intercept', 'y goes up by the same amount each step, but y ÷ x is {rates}, which is not the same in every row. A line that misses (0, 0) is not proportional.'), v) }
          : { kind: 'oneRowCheck', message: fill(t('stem.ratios.mc_prop_one_row', 'Check every row, not just the first ones: y ÷ x is {rates}.'), v) };
        return {
          prompt: fill(t('stem.ratios.g_pt_prompt', 'Does the table x = {xs} and y = {ys} show a proportional relationship? Enter yes or no.'), v),
          answers: yes ? ['yes', 'y'] : ['no', 'n'], choiceTraps: traps,
          hint: t('stem.ratios.g_pt_hint', 'Compare y ÷ x in every row. One different rate is enough to say no.'),
          explain: fill(yes ? t('stem.ratios.g_pt_explain_yes', 'Yes. y ÷ x is {rates}: the same in every row.') : t('stem.ratios.g_pt_explain_no', 'No. y ÷ x is {rates}: not the same in every row.'), v),
          steps: [
            step(t('stem.ratios.st_pt_q1', 'What is y ÷ x in each row?'), fill(t('stem.ratios.st_pt_a1', 'The rates are {rates}.'), v)),
            step(t('stem.ratios.st_pt_q2', 'Are all the rates the same?'), yes ? t('stem.ratios.st_pt_a2_yes', 'Yes, so the relationship is proportional.') : t('stem.ratios.st_pt_a2_no', 'No, so the relationship is not proportional.'))
          ],
          predict: { question: t('stem.ratios.pr_prop_check', 'Before you decide: what will you check in every row?'), options: [{ id: 'ratio', label: t('stem.ratios.pr_y_over_x', 'y ÷ x') }, { id: 'up', label: t('stem.ratios.pr_y_goes_up', 'Whether y goes up') }, { id: 'diff', label: t('stem.ratios.pr_y_differences', 'How much y goes up each row') }], correct: 'ratio', why: t('stem.ratios.pr_why_y_over_x', 'A proportional relationship has the same y ÷ x in every row.') },
          model: { labels: ['x', 'y'], rows: pairs.map(function(pair) { return [pair.x, pair.y]; }) }
        };
      }
    },
    propOrigin: {
      make: function(rng) {
        var k = pickOne(rng, [1.5, 2, 2.5, 3, 3.5]), x1 = randInt(rng, 1, 3), shift = rng() < 0.5 ? 0 : randInt(rng, 1, 3);
        return { pts: [[0, shift], [x1, shift + k * x1], [2 * x1, shift + 2 * k * x1]] };
      },
      build: function(p, t) {
        var pts = p.pts, yes = pts[0][0] === 0 && pts[0][1] === 0;
        var v = { p1: '(' + num(pts[0][0]) + ', ' + num(pts[0][1]) + ')', p2: '(' + num(pts[1][0]) + ', ' + num(pts[1][1]) + ')', p3: '(' + num(pts[2][0]) + ', ' + num(pts[2][1]) + ')', k: num(pts[1][1] / pts[1][0]) };
        var traps = {};
        if (yes) traps.no = { kind: 'other', message: t('stem.ratios.mc_origin_check', 'Check y ÷ x for the points that are not (0, 0), and check whether the line passes through the origin.') };
        else traps.yes = { kind: 'interceptProportional', message: t('stem.ratios.mc_origin_missed', 'The graph is a straight line, but it does not pass through (0, 0). A proportional graph must go through the origin.') };
        return {
          prompt: fill(t('stem.ratios.g_po_prompt', 'A straight graph passes through {p1}, {p2}, and {p3}. Is the relationship proportional? Enter yes or no.'), v),
          answers: yes ? ['yes', 'y'] : ['no', 'n'], choiceTraps: traps,
          hint: t('stem.ratios.g_po_hint', 'A proportional graph is a straight line through the origin.'),
          explain: yes ? fill(t('stem.ratios.g_po_explain_yes', 'Yes. The line passes through (0, 0) and y ÷ x = {k} for the other points.'), v) : t('stem.ratios.g_po_explain_no', 'No. The line does not pass through (0, 0).'),
          steps: [
            step(t('stem.ratios.st_po_q1', 'Does the line pass through (0, 0)?'), yes ? t('stem.ratios.st_po_a1_yes', 'Yes, (0, 0) is one of the points.') : t('stem.ratios.st_po_a1_no', 'No, at x = 0 the value of y is not 0.')),
            step(t('stem.ratios.st_po_q2', 'Is it proportional?'), yes ? t('stem.ratios.st_pt_a2_yes', 'Yes, so the relationship is proportional.') : t('stem.ratios.st_pt_a2_no', 'No, so the relationship is not proportional.'))
          ],
          predict: { question: t('stem.ratios.pr_graph_features', 'Before you decide: what must a proportional graph have?'), options: [{ id: 'origin', label: t('stem.ratios.pr_line_origin', 'A straight line through (0, 0)') }, { id: 'line', label: t('stem.ratios.pr_any_line', 'Any straight line') }, { id: 'up', label: t('stem.ratios.pr_line_up', 'A line that goes up') }], correct: 'origin', why: t('stem.ratios.pr_why_origin', 'y = kx is 0 when x is 0, so the line must pass through the origin.') },
          graph: { points: pts, xLabel: 'x', yLabel: 'y' },
          model: { labels: ['x', 'y'], rows: pts.map(function(pt) { return [pt[0], pt[1]]; }) }
        };
      }
    },
    // 6.RP.3a missing values in a table of equivalent ratios.
    tableMissing: {
      make: function(rng) { return { a: randInt(rng, 1, 5), b: randInt(rng, 2, 9), m: randInt(rng, 5, 8) }; },
      build: function(p, t) {
        var xs = [p.a, 2 * p.a, 3 * p.a, p.m * p.a], ys = [p.b, 2 * p.b, 3 * p.b, '?'], answer = p.m * p.b;
        var v = { xs: listText(xs), ys: listText(ys), a: num(p.a), b: num(p.b), x3: num(3 * p.a), x4: num(p.m * p.a), rate: num(p.b / p.a), answer: num(answer), m: num(p.m) };
        return {
          prompt: fill(t('stem.ratios.g_tm_prompt', 'This table shows equivalent ratios: x = {xs} and y = {ys}. What is the missing y-value?'), v),
          answer: answer,
          hint: fill(t('stem.ratios.g_tm_hint', 'How many times bigger is {x4} than {a}? Multiply {b} by the same number.'), v),
          explain: fill(t('stem.ratios.g_tm_explain', '{x4} is {m} × {a}, so the missing value is {m} × {b} = {answer}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_tm_q1', 'How many times bigger is {x4} than {a}?'), v), fill(t('stem.ratios.st_tm_a1', '{x4} ÷ {a} = {m}.'), v)),
            step(t('stem.ratios.st_tm_q2', 'What is the matching y-value?'), fill(t('stem.ratios.st_tm_a2', '{m} × {b} = {answer}.'), v))
          ],
          traps: [
            { value: 4 * p.b, kind: 'patternNotRate', message: fill(t('stem.ratios.mc_tm_pattern', 'You added {b} again, as if x went up by {a}. But x jumped from {x3} to {x4}. Use the rate, not the pattern.'), v) },
            { value: 3 * p.b + (p.m * p.a - 3 * p.a), kind: 'additive', message: fill(t('stem.ratios.mc_tm_additive', 'You added the same amount to y as x went up. Equivalent ratios multiply both quantities by the same number.'), v) }
          ],
          predict: moreLessPredict(t, answer, 3 * p.b, num(3 * p.b)),
          model: { labels: ['x', 'y'], rows: xs.map(function(xv, i) { return [xv, ys[i]]; }) }
        };
      }
    },
    // 7.RP.2b the constant of proportionality from a table.
    kFromTable: {
      make: function(rng) {
        var k = pickOne(rng, [1.5, 2.5, 0.5, 3, 4, 0.75, 1.25, 6, 3.5]);
        var pool = [2, 4, 6, 8, 10, 12], xs = [];
        while (xs.length < 3) xs.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
        xs.sort(function(a, b) { return a - b; });
        return { k: k, xs: xs, ctx: pickOne(rng, ['plain', 'recipe']) };
      },
      build: function(p, t) {
        var ys = p.xs.map(function(xv) { return p.k * xv; }), diff = ys[1] - ys[0];
        var v = { xs: listText(p.xs), ys: listText(ys), k: num(p.k), x0: num(p.xs[0]), y0: num(ys[0]) };
        return {
          prompt: fill(p.ctx === 'recipe' ? t('stem.ratios.g_kt_recipe', 'A recipe uses flour and sugar in a proportional relationship. Cups of sugar x = {xs} go with cups of flour y = {ys}. What is the constant of proportionality k in y = kx?') : t('stem.ratios.g_kt_plain', 'The table shows a proportional relationship: x = {xs} and y = {ys}. What is the constant of proportionality k in y = kx?'), v),
          answer: p.k,
          hint: t('stem.ratios.g_kt_hint', 'k is y ÷ x. Use any row.'),
          explain: fill(t('stem.ratios.g_kt_explain', '{y0} ÷ {x0} = {k}, and every row gives the same value, so k = {k}.'), v),
          steps: [
            step(t('stem.ratios.st_kt_q1', 'What does k measure?'), t('stem.ratios.st_kt_a1', 'k is the value of y for each 1 of x, so k = y ÷ x.')),
            step(t('stem.ratios.st_kt_q2', 'What is y ÷ x in the first row?'), fill(t('stem.ratios.st_kt_a2', '{y0} ÷ {x0} = {k}.'), v))
          ],
          traps: [
            { value: 1 / p.k, kind: 'inverted', message: t('stem.ratios.mc_k_inverted', 'You found x ÷ y. The constant of proportionality in y = kx is y ÷ x.') },
            { value: diff, kind: 'differenceNotRate', message: t('stem.ratios.mc_k_difference', 'That is how much y changes from one row to the next. k is y ÷ x, the value of y for each 1 of x.') }
          ],
          predict: divisionPredict(t, t('stem.ratios.pr_y_over_x', 'y ÷ x'), t('stem.ratios.pr_x_over_y', 'x ÷ y'), t('stem.ratios.pr_why_k', 'In y = kx, k is how much y there is for each 1 of x: y ÷ x.')),
          model: { labels: ['x', 'y'], rows: p.xs.map(function(xv, i) { return [xv, ys[i]]; }) },
          link: { tool: 'graphCalc', expr: num(p.k) + '*x' }
        };
      }
    },
    // 7.RP.2 the constant of proportionality from a graph.
    kFromGraph: {
      make: function(rng) {
        var k = pickOne(rng, [1.5, 2, 2.5, 3, 0.5, 4, 1.25]), x = pickOne(rng, [2, 4, 6, 8]);
        if (k * x > 40) x = 2;
        return { k: k, x: x, ctx: pickOne(rng, ['apples', 'tank']) };
      },
      build: function(p, t) {
        var y = p.k * p.x, apples = p.ctx !== 'tank';
        var v = { x: num(p.x), y: num(y), k: num(p.k) };
        return {
          prompt: fill(apples ? t('stem.ratios.g_kg_apples', 'The graph shows the cost of apples. The line passes through (0, 0) and ({x}, {y}), with pounds on the x-axis and dollars on the y-axis. What is the constant of proportionality in dollars per pound?') : t('stem.ratios.g_kg_tank', 'The graph shows water filling a tank. The line passes through (0, 0) and ({x}, {y}), with minutes on the x-axis and liters on the y-axis. What is the constant of proportionality in liters per minute?'), v),
          answer: p.k, suffix: apples ? t('stem.ratios.unit_dollars_per_pound', 'dollars per pound') : t('stem.ratios.unit_liters_per_minute', 'liters per minute'),
          hint: t('stem.ratios.g_kg_hint', 'Read a point on the line and find y ÷ x.'),
          explain: fill(t('stem.ratios.g_kg_explain', '{y} ÷ {x} = {k}, so k = {k}: the line rises {k} for every 1 to the right.'), v),
          steps: [
            step(t('stem.ratios.st_kg_q1', 'Which point on the line can you read exactly?'), fill(t('stem.ratios.st_kg_a1', 'The point ({x}, {y}).'), v)),
            step(t('stem.ratios.st_kt_q2b', 'What is y ÷ x for that point?'), fill(t('stem.ratios.st_kg_a2', '{y} ÷ {x} = {k}.'), v))
          ],
          traps: [
            { value: p.x / y, kind: 'inverted', message: t('stem.ratios.mc_k_inverted', 'You found x ÷ y. The constant of proportionality in y = kx is y ÷ x.') },
            { value: y, kind: 'readValueOnly', message: fill(t('stem.ratios.mc_k_read_y', 'That is the y-value of the point. k is y ÷ x: the y-value for each 1 of x.'), v) }
          ],
          predict: divisionPredict(t, t('stem.ratios.pr_y_over_x', 'y ÷ x'), t('stem.ratios.pr_x_over_y', 'x ÷ y'), t('stem.ratios.pr_why_k', 'In y = kx, k is how much y there is for each 1 of x: y ÷ x.')),
          graph: { points: [[0, 0], [p.x, y]], xLabel: apples ? t('stem.ratios.axis_pounds', 'Pounds') : t('stem.ratios.axis_minutes', 'Minutes'), yLabel: apples ? t('stem.ratios.axis_dollars', 'Dollars') : t('stem.ratios.axis_liters', 'Liters'), line: true },
          link: { tool: 'graphCalc', expr: num(p.k) + '*x' }
        };
      }
    },
    // 8.EE.5 the unit rate is the slope of the graph.
    slope: {
      make: function(rng) { return { t: randInt(rng, 2, 10), k: pickOne(rng, [150, 200, 250, 300, 120, 180]), ctx: pickOne(rng, ['cyclist', 'savings']) }; },
      build: function(p, t) {
        var cyclist = p.ctx !== 'savings', k = cyclist ? p.k : p.k / 10, d = k * p.t;
        var v = { t: num(p.t), d: num(d), k: num(k) };
        return {
          prompt: fill(cyclist ? t('stem.ratios.g_sl_cyclist', 'A cyclist rides at a constant speed. Her distance-time graph is a straight line through (0, 0) and ({t}, {d}), with time in minutes on the x-axis and distance in meters on the y-axis. What is the slope of the line?') : t('stem.ratios.g_sl_savings', 'Dev saves the same amount every week. His savings graph is a straight line through (0, 0) and ({t}, {d}), with weeks on the x-axis and dollars on the y-axis. What is the slope of the line?'), v),
          answer: k, suffix: cyclist ? t('stem.ratios.unit_meters_per_minute', 'meters per minute') : t('stem.ratios.unit_dollars_per_week', 'dollars per week'),
          hint: t('stem.ratios.g_sl_hint', 'Slope is rise ÷ run: the change in y divided by the change in x.'),
          explain: fill(cyclist ? t('stem.ratios.g_sl_explain_cyclist', 'Rise ÷ run = {d} ÷ {t} = {k}. The slope is the unit rate: {k} meters every minute.') : t('stem.ratios.g_sl_explain_savings', 'Rise ÷ run = {d} ÷ {t} = {k}. The slope is the unit rate: {k} dollars every week.'), v),
          steps: [
            step(t('stem.ratios.st_sl_q1', 'What are the rise and the run from (0, 0) to the other point?'), fill(t('stem.ratios.st_sl_a1', 'The rise is {d} and the run is {t}.'), v)),
            step(t('stem.ratios.st_sl_q2', 'What is rise ÷ run?'), fill(t('stem.ratios.st_sl_a2', '{d} ÷ {t} = {k}.'), v))
          ],
          traps: [
            { value: p.t / d, kind: 'runOverRise', message: t('stem.ratios.mc_run_over_rise', 'You divided the run by the rise. Slope is rise ÷ run: the change in y over the change in x.') },
            { value: d, kind: 'readValueOnly', message: t('stem.ratios.mc_slope_read_y', 'That is the y-value of the point. Slope is how much y changes for each 1 of x.') }
          ],
          predict: divisionPredict(t, t('stem.ratios.pr_rise_over_run', 'rise ÷ run'), t('stem.ratios.pr_run_over_rise', 'run ÷ rise'), t('stem.ratios.pr_why_slope', 'Slope measures how much y changes for each 1 of x: rise ÷ run.')),
          graph: { points: [[0, 0], [p.t, d]], xLabel: cyclist ? t('stem.ratios.axis_minutes', 'Minutes') : t('stem.ratios.axis_weeks', 'Weeks'), yLabel: cyclist ? t('stem.ratios.axis_meters', 'Meters') : t('stem.ratios.axis_dollars', 'Dollars'), line: true },
          link: { tool: 'graphCalc', expr: num(k) + '*x' }
        };
      }
    },
    // 8.EE.5 compare two proportional relationships shown in different ways.
    compareSlopes: {
      make: function(rng) {
        var ks = [1.5, 2, 2.5, 3, 4], k1 = pickOne(rng, ks), k2 = k1;
        while (k2 === k1) k2 = pickOne(rng, ks);
        return { k1: k1, k2: k2 };
      },
      build: function(p, t) {
        var xs = [10, 20, 30], ys = xs.map(function(xv) { return p.k2 * xv; }), winner = p.k1 > p.k2 ? 'a' : 'b', loser = winner === 'a' ? 'b' : 'a';
        var v = { k1: num(p.k1), k2: num(p.k2), xs: listText(xs), ys: listText(ys), w: winner.toUpperCase() };
        var traps = {};
        traps[loser] = loser === 'b'
          ? { kind: 'biggerNumbers', message: t('stem.ratios.mc_bigger_numbers', 'The table has bigger numbers, but its x-values are bigger too. Compare y ÷ x, not the size of the numbers.') }
          : { kind: 'other', message: t('stem.ratios.mc_compare_rates_table', 'Find y ÷ x for the table before you compare it with the equation.') };
        return {
          prompt: fill(t('stem.ratios.g_cs_prompt', 'Relationship A is y = {k1}x. Relationship B is the table x = {xs} and y = {ys}. Which has the greater rate of change? Enter A or B.'), v),
          answers: [winner, 'relationship ' + winner], choiceTraps: traps,
          hint: t('stem.ratios.g_cs_hint', 'For y = kx the rate is k. For the table, find y ÷ x.'),
          explain: fill(t('stem.ratios.g_cs_explain', 'A has rate {k1} and B has rate {k2}, so {w} has the greater rate of change.'), v),
          steps: [
            step(t('stem.ratios.st_cs_q1', 'What is the rate of change of relationship A?'), fill(t('stem.ratios.st_cs_a1', 'In y = {k1}x, the rate is {k1}.'), v)),
            step(t('stem.ratios.st_cs_q2', 'What is y ÷ x for the table?'), fill(t('stem.ratios.st_cs_a2', 'Every row gives {k2}.'), v)),
            step(t('stem.ratios.st_cs_q3', 'Which rate is greater?'), fill(t('stem.ratios.st_cs_a3', 'Relationship {w}.'), v))
          ],
          predict: compareWhatPredict(t, t('stem.ratios.pr_rate_each', 'The rate y ÷ x for each one'), t('stem.ratios.pr_biggest_y', 'The biggest y-value')),
          model: { labels: ['x', 'y'], rows: xs.map(function(xv, i) { return [xv, ys[i]]; }) },
          link: { tool: 'graphCalc', expr: num(p.k1) + '*x' }
        };
      }
    },
    // ---- Stage B kinds. Builders take the safe translator as `t` so every
    // key below is a literal t('stem.ratios.*') call the i18n scanner can see.
    // 6.RP.3 / 7.RP.1 recipe scaling by a non-integer factor (1.5, 3/4, 2.5...).
    recipeScale: {
      make: function(rng) {
        var plans = [[4, 6], [2, 3], [6, 9], [8, 12], [4, 3], [8, 6], [4, 5], [8, 10], [2, 5], [4, 10], [6, 3], [8, 4]];
        var amounts = { flour: [1.5, 2, 2.25, 3], sugar: [0.5, 0.75, 1], milk: [1, 1.25, 1.5], oats: [1, 1.5, 2], powder: [1, 1.5, 2], salt: [0.5, 1] };
        var ing = pickOne(rng, ['flour', 'sugar', 'milk', 'oats', 'powder', 'salt']);
        var plan = pickOne(rng, plans), q = pickOne(rng, amounts[ing]);
        for (var guard = 0; guard < 60 && !isEighths(q * plan[1] / plan[0]); guard++) { plan = pickOne(rng, plans); q = pickOne(rng, amounts[ing]); }
        if (!isEighths(q * plan[1] / plan[0])) { plan = [4, 6]; q = amounts[ing][amounts[ing].length - 1]; }
        return { ing: ing, S: plan[0], T: plan[1], q: q };
      },
      build: function(p, t) {
        var f = p.T / p.S, answer = p.q * f, cups = p.ing !== 'powder' && p.ing !== 'salt';
        var v = { S: num(p.S), T: num(p.T), q: mixedText(p.q), f: mixedText(f), answer: mixedText(answer), diff: num(Math.abs(p.T - p.S)) };
        var prompts = {
          flour: t('stem.ratios.g_rs_flour', 'A pancake recipe for {S} servings uses {q} cups of flour. How many cups of flour do you need for {T} servings?'),
          sugar: t('stem.ratios.g_rs_sugar', 'A muffin recipe for {S} servings uses {q} cups of sugar. How many cups of sugar do you need for {T} servings?'),
          milk: t('stem.ratios.g_rs_milk', 'A pancake recipe for {S} servings uses {q} cups of milk. How many cups of milk do you need for {T} servings?'),
          oats: t('stem.ratios.g_rs_oats', 'An oatmeal recipe for {S} servings uses {q} cups of oats. How many cups of oats do you need for {T} servings?'),
          powder: t('stem.ratios.g_rs_powder', 'A muffin recipe for {S} servings uses {q} teaspoons of baking powder. How many teaspoons of baking powder do you need for {T} servings?'),
          salt: t('stem.ratios.g_rs_salt', 'A soup recipe for {S} servings uses {q} teaspoons of salt. How many teaspoons of salt do you need for {T} servings?')
        };
        return {
          prompt: fill(prompts[p.ing] || prompts.flour, v),
          answer: answer, answerText: isEighths(answer) ? mixedText(answer) : undefined,
          suffix: cups ? t('stem.ratios.unit_cups', 'cups') : t('stem.ratios.unit_teaspoons', 'teaspoons'),
          hint: fill(t('stem.ratios.g_rs_hint', 'The scale factor is the new servings divided by the old servings, {T} ÷ {S}. Multiply the amount by it.'), v),
          explain: fill(t('stem.ratios.g_rs_explain', 'The scale factor is {T} ÷ {S} = {f}, so you need {q} × {f} = {answer}.'), v),
          steps: [
            step(fill(t('stem.ratios.st_rs_q1', 'What is the scale factor from {S} servings to {T} servings?'), v), fill(t('stem.ratios.st_rs_a1', '{T} ÷ {S} = {f}.'), v)),
            step(fill(t('stem.ratios.st_rs_q2', 'What is {q} times the scale factor?'), v), fill(t('stem.ratios.st_rs_a2', '{q} × {f} = {answer}.'), v))
          ],
          traps: [
            { value: p.q + (p.T - p.S), kind: 'additive', message: fill(p.T > p.S ? t('stem.ratios.mc_rs_added', 'You added {diff} because there are {diff} more servings. Servings and amounts change by the same factor, not the same number: multiply {q} by {f}.') : t('stem.ratios.mc_rs_subtracted', 'You subtracted {diff} because there are {diff} fewer servings. Servings and amounts change by the same factor, not the same number: multiply {q} by {f}.'), v) },
            { value: p.q * p.T, kind: 'unitRateSkipped', message: fill(t('stem.ratios.mc_rs_times_servings', 'You multiplied {q} by {T}, but {q} is the amount for {S} servings, not for 1. Multiply by the scale factor {f} instead.'), v) },
            { value: p.q * p.S / p.T, kind: 'inverted', message: fill(t('stem.ratios.mc_rs_inverted', 'You scaled the wrong way. The factor is new ÷ old, {T} ÷ {S}, not {S} ÷ {T}.'), v) }
          ],
          predict: moreLessPredict(t, answer, p.q, mixedText(p.q)),
          model: { labels: [t('stem.ratios.model_servings', 'Servings'), cups ? t('stem.ratios.model_amount_cups', 'Amount (cups)') : t('stem.ratios.model_amount_teaspoons', 'Amount (teaspoons)')], rows: [[p.S, mixedText(p.q)], [1, '?'], [p.T, '?']] },
          link: cups ? { tool: 'unitConvert', category: 'volume', from: 'cup', to: 'mL', value: answer } : undefined
        };
      }
    },
    // The scale factor for a recipe (recipe mission, step 1).
    recipeFactor: {
      make: function(rng) { var plan = pickOne(rng, [[4, 6], [8, 6], [4, 10], [4, 5], [6, 3]]); return { S: plan[0], T: plan[1] }; },
      build: function(p, t) {
        var f = p.T / p.S, v = { S: num(p.S), T: num(p.T), f: mixedText(f), diff: num(Math.abs(p.T - p.S)) };
        return {
          prompt: fill(t('stem.ratios.g_rf_prompt', 'The recipe serves {S}, and you need {T} servings. What number do you multiply every amount by?'), v),
          answer: f, answerText: mixedText(f),
          hint: fill(t('stem.ratios.g_rf_hint', 'Divide the new number of servings by the old number: {T} ÷ {S}.'), v),
          explain: fill(t('stem.ratios.g_rf_explain', '{T} ÷ {S} = {f}, so every amount is multiplied by {f}.'), v),
          steps: [step(t('stem.ratios.st_rf_q1', 'Which number of servings is new, and which is old?'), fill(t('stem.ratios.st_rf_a1', '{T} servings are new and {S} are old.'), v)), step(t('stem.ratios.st_rf_q2', 'What is new ÷ old?'), fill(t('stem.ratios.st_rf_a2', '{T} ÷ {S} = {f}.'), v))],
          traps: [
            { value: Math.abs(p.T - p.S), kind: 'additive', message: fill(t('stem.ratios.mc_rf_difference', '{diff} is how many servings more or fewer, a difference. A scale factor multiplies: new ÷ old = {T} ÷ {S}.'), v) },
            { value: p.S / p.T, kind: 'inverted', message: fill(t('stem.ratios.mc_rf_inverted', 'That is old ÷ new. The scale factor is new ÷ old: {T} ÷ {S}.'), v) }
          ],
          predict: moreLessPredict(t, f, 1, '1'),
          model: { labels: [t('stem.ratios.model_servings', 'Servings'), t('stem.ratios.model_factor', 'Scale factor')], rows: [[p.S, 1], [p.T, '?']] }
        };
      }
    },
    // 7.G.1 scale drawings: lengths.
    scaleLength: {
      make: function(rng) {
        var map = rng() < 0.5;
        return { ctx: map ? 'map' : 'plan', k: map ? pickOne(rng, [2, 5, 10, 20, 25, 50]) : pickOne(rng, [2, 4, 5, 8, 10]), d: randInt(rng, 3, 24) / 2, toDrawing: rng() < 0.35 };
      },
      build: function(p, t) {
        var actual = p.d * p.k, toDrawing = !!p.toDrawing && p.ctx !== 'room', answer = toDrawing ? p.d : actual;
        var v = { k: num(p.k), d: num(p.d), actual: num(actual), answer: num(answer) };
        var text = {
          map: { real: t('stem.ratios.g_sd_map', 'On a map, 1 centimeter represents {k} kilometers. Two towns are {d} centimeters apart on the map. How many kilometers apart are the towns?'), draw: t('stem.ratios.g_sd_map_draw', 'On a map, 1 centimeter represents {k} kilometers. Two towns are {actual} kilometers apart. How many centimeters apart are they on the map?'), realUnit: t('stem.ratios.unit_km', 'km'), drawUnit: t('stem.ratios.unit_cm', 'cm'), labels: [t('stem.ratios.model_map_cm', 'Map (cm)'), t('stem.ratios.model_actual_km', 'Actual (km)')], scaffold: t('stem.ratios.scaffold_map', 'For 1 centimeter on the map, the real distance is {rate} kilometers.'), link: { category: 'length', from: 'km', to: 'mi' } },
          plan: { real: t('stem.ratios.g_sd_plan', 'A floor plan uses the scale 1 inch to {k} feet. A wall is {d} inches long on the plan. How long is the real wall in feet?'), draw: t('stem.ratios.g_sd_plan_draw', 'A floor plan uses the scale 1 inch to {k} feet. A real wall is {actual} feet long. How many inches long is it on the plan?'), realUnit: t('stem.ratios.unit_feet', 'feet'), drawUnit: t('stem.ratios.unit_inches', 'inches'), labels: [t('stem.ratios.model_plan_in', 'Plan (in)'), t('stem.ratios.model_actual_ft', 'Actual (ft)')], scaffold: t('stem.ratios.scaffold_plan', 'For 1 inch on the plan, the real length is {rate} feet.'), link: { category: 'length', from: 'ft', to: 'm' } },
          room: { real: t('stem.ratios.g_sd_room', 'On the floor plan, 1 centimeter stands for {k} meters. The room is {d} centimeters long on the plan. How long is the real room in meters?'), realUnit: t('stem.ratios.unit_m', 'm'), labels: [t('stem.ratios.model_plan_cm', 'Plan (cm)'), t('stem.ratios.model_actual_m', 'Actual (m)')], scaffold: t('stem.ratios.scaffold_room', 'For 1 centimeter on the plan, the real length is {rate} meters.'), link: { category: 'length', from: 'm', to: 'ft' } }
        }[p.ctx] || null;
        if (!text) return { prompt: '', answer: 0, steps: [], traps: [] };
        return {
          prompt: fill(toDrawing ? text.draw : text.real, v), answer: answer, suffix: toDrawing ? text.drawUnit : text.realUnit,
          hint: fill(toDrawing ? t('stem.ratios.g_sd_hint_draw', 'Every {k} real units shrink to 1 unit on the drawing, so divide the real length by {k}.') : t('stem.ratios.g_sd_hint', 'Each 1 unit on the drawing stands for {k} real units, so multiply the drawing length by {k}.'), v),
          explain: fill(toDrawing ? t('stem.ratios.g_sd_explain_draw', '{actual} ÷ {k} = {answer}, because every {k} real units are 1 unit on the drawing.') : t('stem.ratios.g_sd_explain', '{d} × {k} = {answer}, because every unit on the drawing stands for {k} real units.'), v),
          steps: [
            step(t('stem.ratios.st_sd_q1', 'What does 1 unit on the drawing stand for?'), fill(t('stem.ratios.st_sd_a1', 'It stands for {k} real units.'), v)),
            toDrawing ? step(fill(t('stem.ratios.st_sd_q2_draw', 'How many groups of {k} are in {actual}?'), v), fill(t('stem.ratios.st_sd_a2_draw', '{actual} ÷ {k} = {answer}.'), v))
              : step(fill(t('stem.ratios.st_sd_q2', 'What are {d} groups of {k}?'), v), fill(t('stem.ratios.st_sd_a2', '{d} × {k} = {answer}.'), v))
          ],
          traps: toDrawing ? [
            { value: actual * p.k, kind: 'multiplyNotDivide', message: fill(t('stem.ratios.mc_sd_multiplied', 'You multiplied. The drawing is smaller than the real thing, so divide {actual} by {k}.'), v) },
            { value: actual - p.k, kind: 'subtracted', message: fill(t('stem.ratios.mc_sd_subtracted', 'You subtracted {k}. A scale is a multiplying relationship: divide {actual} by {k}.'), v) }
          ] : [
            { value: p.d + p.k, kind: 'additive', message: fill(t('stem.ratios.mc_sd_added', 'You added {k}. A scale multiplies: each unit on the drawing stands for {k} real units, so multiply {d} by {k}.'), v) },
            { value: p.d / p.k, kind: 'divideNotMultiply', message: fill(t('stem.ratios.mc_sd_divided', 'You divided. The real length is longer than the drawing, so multiply {d} by {k}.'), v) }
          ],
          predict: moreLessPredict(t, answer, toDrawing ? actual : p.d, toDrawing ? num(actual) : num(p.d)),
          model: { labels: text.labels, rows: [[0, 0], [1, p.k], toDrawing ? ['?', actual] : [p.d, '?']] },
          line: !toDrawing,
          scaffoldTemplate: text.scaffold,
          link: { tool: 'unitConvert', category: text.link.category, from: text.link.from, to: text.link.to, value: actual }
        };
      }
    },
    // 7.G.1 scale drawings: areas grow by k squared, not by k.
    scaleArea: {
      make: function(rng) {
        var park = rng() < 0.4;
        return { ctx: park ? 'park' : 'room', k: park ? pickOne(rng, [10, 20, 50]) : pickOne(rng, [3, 4, 5]), w: randInt(rng, 2, 6), l: randInt(rng, 3, 9) };
      },
      build: function(p, t) {
        var A = p.w * p.l, k2 = p.k * p.k, answer = A * k2;
        var v = { k: num(p.k), w: num(p.w), l: num(p.l), A: num(A), k2: num(k2), twoK: num(2 * p.k), answer: num(answer), W: num(p.w * p.k), L: num(p.l * p.k) };
        var cm = function(n) { return fill(t('stem.ratios.qty_cm', '{n} cm'), { n: num(n) }); };
        return {
          prompt: fill(p.ctx === 'park' ? t('stem.ratios.g_sa_park', 'A map of a park uses the scale 1 centimeter to {k} meters. A rectangular field is {l} centimeters by {w} centimeters on the map. What is the real area of the field in square meters?') : t('stem.ratios.g_sa_room', 'A floor plan uses the scale 1 centimeter to {k} meters. A rectangular room is {l} centimeters by {w} centimeters on the plan. What is the real area of the room in square meters?'), v),
          answer: answer, suffix: t('stem.ratios.unit_square_meters', 'square meters'),
          hint: fill(t('stem.ratios.g_sa_hint', 'Find each real length first: multiply both sides by {k}. Then multiply the real lengths.'), v),
          explain: fill(t('stem.ratios.g_sa_explain', 'The real rectangle is {L} m by {W} m, so its area is {L} × {W} = {answer} square meters: {k} × {k} = {k2} times the drawing\'s {A} square centimeters.'), v),
          steps: [
            step(t('stem.ratios.st_sa_q1', 'How long are the real sides?'), fill(t('stem.ratios.st_sa_a1', '{l} × {k} = {L} m and {w} × {k} = {W} m.'), v)),
            step(t('stem.ratios.st_sa_q2', 'What is the real area?'), fill(t('stem.ratios.st_sa_a2', '{L} × {W} = {answer} square meters.'), v)),
            step(t('stem.ratios.st_sa_q3', 'How many times the drawing\'s area is that?'), fill(t('stem.ratios.st_sa_a3', '{k} × {k} = {k2} times, because both the length and the width were multiplied by {k}.'), v))
          ],
          traps: [
            { value: A * p.k, kind: 'areaScaleK', message: fill(t('stem.ratios.mc_sa_times_k', 'You multiplied the drawing\'s area by {k}. Area does not scale by k: the length and the width both grow {k} times, so the area grows {k} × {k} = {k2} times.'), v) },
            { value: A, kind: 'drawingAreaOnly', message: t('stem.ratios.mc_sa_drawing_area', 'That is the area on the drawing, in square centimeters. Use the scale to find the real side lengths first.') },
            { value: 2 * (p.w + p.l) * p.k, kind: 'perimeterNotArea', message: t('stem.ratios.mc_sa_perimeter', 'That is the real perimeter, the distance around the rectangle. Area is length × width.') },
            { value: A * 2 * p.k, kind: 'areaScaleK', message: fill(t('stem.ratios.mc_sa_times_2k', 'You multiplied the area by 2 × {k}. Area grows by {k} × {k} = {k2}, because the length and the width are each multiplied by {k}.'), v) }
          ],
          predict: { question: fill(t('stem.ratios.pr_area_factor', 'Before you solve: the real lengths are {k} times the drawing. How many times as large is the real area?'), v),
            options: [{ id: 'k', label: fill(t('stem.ratios.pr_n_times', '{n} times'), { n: num(p.k) }) }, { id: 'double', label: fill(t('stem.ratios.pr_n_times', '{n} times'), { n: num(2 * p.k) }) }, { id: 'square', label: fill(t('stem.ratios.pr_n_times', '{n} times'), { n: num(k2) }) }],
            correct: 'square', why: fill(t('stem.ratios.pr_why_area_factor', 'The length and the width are both multiplied by {k}, so the area is multiplied by {k} × {k} = {k2}.'), v) },
          model: { labels: [t('stem.ratios.model_measure', 'Measure'), t('stem.ratios.model_drawing', 'Drawing'), t('stem.ratios.model_real', 'Real')], rows: [[t('stem.ratios.model_length', 'Length'), cm(p.l), '?'], [t('stem.ratios.model_width', 'Width'), cm(p.w), '?'], [t('stem.ratios.model_area', 'Area'), fill(t('stem.ratios.qty_cm2', '{n} square cm'), { n: num(A) }), '?']] },
          link: { tool: 'unitConvert', category: 'area', from: 'm²', to: 'ft²', value: answer }
        };
      }
    },
    // 7.G.1 reproduce a scale drawing at a different scale.
    scaleRedraw: {
      make: function(rng) {
        for (var guard = 0; guard < 80; guard++) {
          var k1 = pickOne(rng, [2, 3, 4, 5, 6, 10]), w = randInt(rng, 2, 12), k2 = pickOne(rng, [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
          var out = w * k1 / k2;
          if (k2 !== k1 && Number.isInteger(roundTo(out * 2, 9)) && out >= 1 && out <= 30) return { ctx: 'garden', k1: k1, w: w, k2: k2 };
        }
        return { ctx: 'garden', k1: 2, w: 6, k2: 3 };
      },
      build: function(p, t) {
        var actual = p.w * p.k1, answer = actual / p.k2;
        var v = { k1: num(p.k1), k2: num(p.k2), w: num(p.w), actual: num(actual), answer: num(answer) };
        var prompts = {
          garden: t('stem.ratios.g_rd_garden', 'A scale drawing of a garden uses 1 centimeter to {k1} meters, and the garden is {w} centimeters long on it. You redraw it with 1 centimeter to {k2} meters. How long is the garden in the new drawing?'),
          roomLong: t('stem.ratios.g_rd_room_long', 'The room is {w} centimeters long on a plan with 1 centimeter to {k1} meters. On a new plan with 1 centimeter to {k2} meters, how long is it?'),
          roomWide: t('stem.ratios.g_rd_room_wide', 'The room is {w} centimeters wide on a plan with 1 centimeter to {k1} meters. On a new plan with 1 centimeter to {k2} meters, how wide is it?')
        };
        return {
          prompt: fill(prompts[p.ctx] || prompts.garden, v), answer: answer, suffix: t('stem.ratios.unit_cm', 'cm'),
          hint: fill(t('stem.ratios.g_rd_hint', 'Find the real length first, then use the new scale: divide the real length by {k2}.'), v),
          explain: fill(t('stem.ratios.g_rd_explain', 'The real length is {w} × {k1} = {actual} meters, and {actual} ÷ {k2} = {answer} centimeters in the new drawing.'), v),
          steps: [
            step(t('stem.ratios.st_rd_q1', 'How long is the real thing?'), fill(t('stem.ratios.st_rd_a1', '{w} × {k1} = {actual} meters.'), v)),
            step(t('stem.ratios.st_rd_q2', 'How many centimeters is that at the new scale?'), fill(t('stem.ratios.st_rd_a2', '{actual} ÷ {k2} = {answer} centimeters.'), v))
          ],
          traps: [
            { value: p.w * p.k2 / p.k1, kind: 'inverted', message: fill(t('stem.ratios.mc_rd_inverted', 'You flipped the scales. Go through the real length: {w} × {k1} = {actual} meters, then divide by the new scale, {k2}.'), v) },
            { value: actual, kind: 'stoppedEarly', message: fill(t('stem.ratios.mc_rd_real_only', '{actual} is the real length in meters. Now draw it at the new scale: divide by {k2}.'), v) },
            { value: actual * p.k2, kind: 'multiplyNotDivide', message: fill(t('stem.ratios.mc_rd_multiplied', 'You multiplied by the new scale. On a drawing, every {k2} meters shrink to 1 centimeter, so divide.'), v) },
            { value: p.w + p.k1 - p.k2, kind: 'additive', message: fill(t('stem.ratios.mc_rd_additive', 'You changed the length by the change in the scale. Scales multiply: find the real length, then divide by {k2}.'), v) }
          ],
          predict: moreLessPredict(t, answer, p.w, num(p.w)),
          model: { labels: [t('stem.ratios.model_drawing', 'Drawing'), t('stem.ratios.model_scale', 'Scale'), t('stem.ratios.model_length_cm', 'Length on the drawing (cm)'), t('stem.ratios.model_real_m', 'Real length (m)')], rows: [[t('stem.ratios.model_old_drawing', 'Old drawing'), fill(t('stem.ratios.scale_cm_to_m', '1 cm to {n} m'), { n: num(p.k1) }), p.w, '?'], [t('stem.ratios.model_new_drawing', 'New drawing'), fill(t('stem.ratios.scale_cm_to_m', '1 cm to {n} m'), { n: num(p.k2) }), '?', '?']] }
        };
      }
    },
    // Part-to-whole: what fraction of a mixture is one ingredient?
    mixtureFraction: {
      make: function(rng) { var pair = pickOne(rng, [[1, 3], [2, 3], [1, 4], [3, 5], [1, 7], [3, 7], [1, 9], [2, 2], [3, 2], [2, 6], [5, 3]]); return { a: pair[0], b: pair[1], ctx: pickOne(rng, ['juice', 'paint']) }; },
      build: function(p, t) {
        var w = p.a + p.b, answer = p.a / w, juice = p.ctx !== 'paint';
        var v = { a: num(p.a), b: num(p.b), w: num(w), frac: fracText(p.a, w), dec: num(answer) };
        return {
          prompt: fill(juice ? t('stem.ratios.g_mf_juice', 'A juice mix uses {a} cups of orange concentrate and {b} cups of water. What fraction of the whole mix is concentrate? Enter a fraction or a decimal.') : t('stem.ratios.g_mf_paint', 'A paint mix uses {a} cups of red paint and {b} cups of white paint. What fraction of the whole mix is red? Enter a fraction or a decimal.'), v),
          answer: answer, answerText: fracText(p.a, w),
          hint: fill(t('stem.ratios.g_mf_hint', 'The whole mix is {a} + {b} = {w} cups. Compare the part you are asked about to the whole mix.'), v),
          explain: fill(t('stem.ratios.g_mf_explain', '{a} of the {w} cups is {frac} of the mix, which is {dec}.'), v),
          steps: [
            step(t('stem.ratios.st_mf_q1', 'How many cups are in the whole mix?'), fill(t('stem.ratios.st_mf_a1', '{a} + {b} = {w} cups.'), v)),
            step(t('stem.ratios.st_mf_q2', 'What fraction of the whole is the part?'), fill(t('stem.ratios.st_mf_a2', '{a} out of {w}, so {frac} = {dec}.'), v))
          ],
          traps: [
            { value: p.a / p.b, kind: 'partToPart', message: fill(t('stem.ratios.mc_mf_part_part', 'You compared the two parts, {a} to {b}. A fraction of the mix compares one part to the whole mix: {a} out of {w}.'), v) },
            { value: p.b / w, kind: 'otherPart', message: fill(t('stem.ratios.mc_mf_other_part', 'That is the fraction of the mix that is the other ingredient. The question asks about the {a} cups.'), v) },
            { value: w / p.a, kind: 'inverted', message: fill(t('stem.ratios.mc_mf_inverted', 'That is the whole divided by the part. The fraction of the mix is part ÷ whole: {a} ÷ {w}.'), v) }
          ],
          predict: (function() {
            var half = nearlyEqual(answer, 0.5) ? 'same' : (answer > 0.5 ? 'more' : 'less');
            return { question: t('stem.ratios.pr_mf_half', 'Before you solve: is the part more than, less than, or exactly half of the whole mix?'),
              options: [{ id: 'more', label: t('stem.ratios.pr_more_than_half', 'More than half') }, { id: 'less', label: t('stem.ratios.pr_less_than_half', 'Less than half') }, { id: 'same', label: t('stem.ratios.pr_exactly_half', 'Exactly half') }],
              correct: half, why: fill(half === 'more' ? t('stem.ratios.pr_why_mf_more', '{a} is more than half of {w}.') : half === 'less' ? t('stem.ratios.pr_why_mf_less', '{a} is less than half of {w}.') : t('stem.ratios.pr_why_mf_half', '{a} is exactly half of {w}.'), v) };
          })(),
          tape: { rows: [{ label: juice ? t('stem.ratios.tape_concentrate', 'Concentrate') : t('stem.ratios.tape_red', 'Red'), units: p.a, text: '' }, { label: juice ? t('stem.ratios.tape_water', 'Water') : t('stem.ratios.tape_white', 'White'), units: p.b, text: '' }], unitText: '1', totalText: fill(t('stem.ratios.tape_whole_cups', 'Whole: {w} cups'), v) }
        };
      }
    },
    // Which mixture is stronger? Part-to-whole, not additive, comparison.
    mixtureCompare: {
      make: function(rng) {
        var a, b, c, e;
        if (rng() < 0.55) {
          // Same difference, different strength: the additive trap says "same".
          var dlt = randInt(rng, 1, 3); a = randInt(rng, 1, 4); b = a + dlt; c = a + randInt(rng, 1, 4); e = c + dlt;
        } else {
          // Same strength, different difference: the additive trap picks the smaller mix.
          var k = randInt(rng, 2, 3); a = randInt(rng, 1, 3); b = a + randInt(rng, 1, 3); c = k * a; e = k * b;
        }
        if (rng() < 0.5) { var ta = a, tb = b; a = c; b = e; c = ta; e = tb; }
        return { a: a, b: b, c: c, e: e, ctx: pickOne(rng, ['juice', 'paint']) };
      },
      build: function(p, t) {
        var wa = p.a + p.b, wb = p.c + p.e, fa = p.a / wa, fb = p.c / wb, juice = p.ctx !== 'paint';
        var same = nearlyEqual(p.a * wb, p.c * wa), winner = same ? 'same' : (fa > fb ? 'a' : 'b');
        var v = { a: num(p.a), b: num(p.b), c: num(p.c), e: num(p.e), wa: num(wa), wb: num(wb), fa: fracText(p.a, wa), fb: fracText(p.c, wb), da: formatUnitRate(fa, 3), db: formatUnitRate(fb, 3) };
        var dA = p.b - p.a, dB = p.e - p.c, additivePick = dA === dB ? 'same' : (dA < dB ? 'a' : 'b');
        var amountPick = p.a === p.c ? 'same' : (p.a > p.c ? 'a' : 'b');
        var traps = {};
        if (additivePick !== winner) traps[additivePick] = { kind: 'additiveComparison', message: dA === dB ? t('stem.ratios.mc_mx_same_difference', 'Both mixes have the same difference between the two ingredients, but a difference is an additive comparison. Compare each part to its whole mix instead.') : t('stem.ratios.mc_mx_smaller_difference', 'That mix has a smaller difference between the two ingredients, but comparing differences is additive. Compare each part to its whole mix instead.') };
        if (amountPick !== winner && !traps[amountPick]) traps[amountPick] = { kind: 'absoluteAmount', message: t('stem.ratios.mc_mx_more_amount', 'That mix has more of the ingredient, but it is also a bigger mix. Compare the share of the whole, not the number of cups.') };
        ['a', 'b', 'same'].forEach(function(choice) {
          if (choice !== winner && !traps[choice]) traps[choice] = { kind: 'partToPart', message: fill(t('stem.ratios.mc_mx_compare_shares', 'Find each mix as a fraction of its whole: A is {fa} and B is {fb}. Then compare.'), v) };
        });
        return {
          prompt: fill(juice ? t('stem.ratios.g_mx_juice', 'Mix A uses {a} cups of orange concentrate and {b} cups of water. Mix B uses {c} cups of orange concentrate and {e} cups of water. Which mix tastes more strongly of orange? Enter A, B, or same.') : t('stem.ratios.g_mx_paint', 'Paint A mixes {a} cups of red with {b} cups of white. Paint B mixes {c} cups of red with {e} cups of white. Which paint is a deeper red? Enter A, B, or same.'), v),
          answers: winner === 'same' ? ['same', 'equal', 'the same'] : [winner, 'mix ' + winner, 'paint ' + winner], choiceTraps: traps,
          hint: t('stem.ratios.g_mx_hint', 'For each mix, divide the ingredient you care about by the whole mix, then compare those fractions.'),
          explain: fill(winner === 'same' ? t('stem.ratios.g_mx_explain_same', 'A is {fa} of its whole and B is {fb} of its whole. Those are equal ({da}), so both have the same strength.') : winner === 'a' ? t('stem.ratios.g_mx_explain_a', 'A is {fa} of its whole ({da}) and B is {fb} ({db}), so A has the bigger share and is stronger.') : t('stem.ratios.g_mx_explain_b', 'A is {fa} of its whole ({da}) and B is {fb} ({db}), so B has the bigger share and is stronger.'), v),
          steps: [
            step(t('stem.ratios.st_mx_q1', 'What fraction of mix A is the first ingredient?'), fill(t('stem.ratios.st_mx_a1', '{a} out of {wa} cups, so {fa} ({da}).'), v)),
            step(t('stem.ratios.st_mx_q2', 'What fraction of mix B is the first ingredient?'), fill(t('stem.ratios.st_mx_a2', '{c} out of {wb} cups, so {fb} ({db}).'), v)),
            step(t('stem.ratios.st_mx_q3', 'Which share is bigger?'), winner === 'same' ? t('stem.ratios.st_mx_a3_same', 'Neither: the shares are equal.') : fill(winner === 'a' ? t('stem.ratios.st_mx_a3_a', 'A, so A is stronger.') : t('stem.ratios.st_mx_a3_b', 'B, so B is stronger.'), v))
          ],
          predict: compareWhatPredict(t, t('stem.ratios.pr_share_of_whole', 'Each mix as a share of its whole'), t('stem.ratios.pr_difference_ingredients', 'How many more cups of one ingredient there are')),
          model: { labels: [t('stem.ratios.model_mix', 'Mix'), juice ? t('stem.ratios.tape_concentrate', 'Concentrate') : t('stem.ratios.tape_red', 'Red'), juice ? t('stem.ratios.tape_water', 'Water') : t('stem.ratios.tape_white', 'White'), t('stem.ratios.model_whole', 'Whole'), t('stem.ratios.model_share', 'Share of the whole')], rows: [['A', p.a, p.b, wa, '?'], ['B', p.c, p.e, wb, '?']] },
          mixTapes: [{ id: 'a', a: p.a, b: p.b }, { id: 'b', a: p.c, b: p.e }]
        };
      }
    },
    // 7.RP.2a proportional or not, from a graph or a story (tables: propTable).
    propDetective: {
      make: function(rng) { return makeDetectiveParams(rng, pickOne(rng, ['graphOrigin', 'graphIntercept', 'storyRate', 'storyFee'])); },
      build: function(p, t) {
        var c = buildDetectiveCase(p, t);
        var yes = c.proportional;
        return {
          prompt: c.prompt,
          answers: yes ? ['yes', 'y'] : ['no', 'n'], choiceTraps: c.traps,
          hint: t('stem.ratios.g_dt_hint', 'Ask two questions: does 0 of x go with 0 of y, and is y ÷ x always the same?'),
          explain: c.evidenceNote,
          steps: [
            step(t('stem.ratios.st_dt_q1', 'What happens when x is 0?'), c.zeroNote),
            step(t('stem.ratios.st_po_q2', 'Is it proportional?'), yes ? t('stem.ratios.st_pt_a2_yes', 'Yes, so the relationship is proportional.') : t('stem.ratios.st_pt_a2_no', 'No, so the relationship is not proportional.'))
          ],
          predict: { question: t('stem.ratios.pr_dt_check', 'Before you decide: which check settles it?'), options: [{ id: 'origin', label: t('stem.ratios.pr_dt_origin', 'Whether 0 goes with 0 and y ÷ x stays the same') }, { id: 'up', label: t('stem.ratios.pr_line_up', 'A line that goes up') }, { id: 'line', label: t('stem.ratios.pr_dt_straight', 'Whether the graph is straight') }], correct: 'origin', why: t('stem.ratios.pr_why_dt', 'A proportional relationship is y = kx: 0 goes with 0, and y ÷ x is always k. A straight or rising graph is not enough.') },
          graph: c.graph || undefined
        };
      }
    }
  };

  // Which kinds each mode practises at each grade band.
  var PRACTICE_KINDS = {
    ratioTable: { g45: ['multCompare', 'multCompareDivide', 'missingValue', 'scale'], g6: ['missingValue', 'simplify', 'mixtureTotal', 'scale', 'mixtureFraction', 'mixtureCompare', 'recipeScale'], g7: ['missingValue', 'mixturePercent', 'mixtureTotal', 'simplify', 'mixtureCompare', 'recipeScale'], g8: ['mixturePercent', 'mixtureTotal', 'missingValue', 'simplify', 'mixtureCompare', 'recipeScale'] },
    numberLine: { g45: ['lineMissing'], g6: ['lineMissing'], g7: ['lineMissing', 'scaleLength', 'scaleArea', 'scaleRedraw'], g8: ['lineMissing', 'scaleLength', 'scaleArea', 'scaleRedraw'] },
    unitRates: { g45: ['unitRate'], g6: ['unitRate', 'betterBuy', 'compareRates'], g7: ['fractionRate', 'betterBuy', 'unitRate'], g8: ['fractionRate', 'betterBuy', 'compareRates'] },
    percent: { g45: ['percentPart'], g6: ['percentPart', 'percentRate', 'percentWhole', 'decimalPercent'], g7: ['percentChange', 'taxTip', 'discountMarkup', 'percentWhole'], g8: ['percentChange', 'taxTip', 'discountMarkup', 'percentRate'] },
    proportional: { g45: ['propTable'], g6: ['propTable', 'tableMissing'], g7: ['kFromTable', 'kFromGraph', 'propTable', 'propDetective'], g8: ['slope', 'compareSlopes', 'kFromGraph', 'propDetective'] }
  };

  function buildKindProblem(kind, params, t, extra) {
    t = tOf(t);
    var spec = KINDS[kind];
    if (!spec) return null;
    var built = spec.build(params, t);
    Object.keys(built).forEach(function(key) { if (built[key] === undefined) delete built[key]; });
    built.kind = kind;
    built.params = params;
    built.traps = cleanTraps(built.traps || [], built.answer);
    Object.keys(extra || {}).forEach(function(key) { if (extra[key] !== undefined) built[key] = extra[key]; });
    // The problem remembers its language for diagnoseRatioAnswer(challenge, answer).
    Object.defineProperty(built, '_t', { value: t, enumerable: false, configurable: true, writable: true });
    return built;
  }
  function cleanTraps(traps, key) {
    var seen = [];
    return traps.filter(function(trap) {
      if (!trap || !isFinite(trap.value) || trap.value < 0 || nearlyEqual(trap.value, key)) return false;
      if (seen.some(function(value) { return nearlyEqual(value, trap.value); })) return false;
      seen.push(trap.value);
      return true;
    });
  }

  function practiceId(mode, band, seed) { return 'gen-' + mode + '-' + band + '-' + (Math.floor(Math.abs(finiteNumber(seed, 1))) >>> 0); }
  function practiceKindFor(mode, band, seed) {
    var kinds = (PRACTICE_KINDS[mode] || PRACTICE_KINDS.ratioTable)[BANDS.indexOf(band) >= 0 ? band : 'g6'];
    return kinds[hashString(mode + ':' + seed) % kinds.length];
  }
  // A generated problem is a pure function of (mode, band, seed).
  function generateProblem(mode, band, seed, t) {
    var safeBand = BANDS.indexOf(band) >= 0 ? band : 'g6';
    var safeMode = PRACTICE_KINDS[mode] ? mode : 'ratioTable';
    var kind = practiceKindFor(safeMode, safeBand, seed);
    var params = KINDS[kind].make(makeRng(seed), safeBand);
    return buildKindProblem(kind, params, t, { id: practiceId(safeMode, safeBand, seed), mode: safeMode, band: safeBand, seed: Math.floor(Math.abs(finiteNumber(seed, 1))) >>> 0, generated: true });
  }
  function answerKey(problem) {
    if (!problem) return '';
    if (problem.answer != null) return String(roundTo(problem.answer, 6));
    return problem.answers && problem.answers.length ? String(problem.answers[0]) : '';
  }
  // A parallel problem of the same kind with different numbers, for the
  // worked example. It never shows the current problem's own answer.
  function workedSibling(problem, band, t) {
    if (!problem || !KINDS[problem.kind]) return null;
    var safeBand = BANDS.indexOf(band) >= 0 ? band : 'g6';
    var base = hashString('worked:' + problem.id);
    for (var attempt = 0; attempt < 12; attempt++) {
      var params = KINDS[problem.kind].make(makeRng(base + attempt * 7919), safeBand);
      var sibling = buildKindProblem(problem.kind, params, t, { id: problem.id + '-worked-' + attempt });
      if (sibling && sibling.prompt !== problem.prompt && answerKey(sibling) !== answerKey(problem)) return sibling;
    }
    return null;
  }
  // New-problem seed that changes the kind when the band offers more than one.
  function nextPracticeSeed(mode, band, currentSeed, random) {
    var rand = typeof random === 'function' ? random : Math.random;
    var currentKind = currentSeed == null ? null : practiceKindFor(mode, band, currentSeed);
    var seed = 1;
    for (var attempt = 0; attempt < 8; attempt++) {
      seed = 1 + Math.floor(rand() * 2147483646);
      if (seed !== currentSeed && practiceKindFor(mode, band, seed) !== currentKind) return seed;
    }
    return seed === currentSeed ? seed + 1 : seed;
  }

  // Ratio table rows: scale down by each common factor, the usual scale-up
  // rows, and the two unit-rate rows (per 1 of each quantity).
  function ratioTableRows(first, second, selectedFactor) {
    var rows = [];
    var common = gcd(first, second);
    var divisors = [];
    for (var dv = common; dv >= 2; dv--) if (common % dv === 0) divisors.push(dv);
    divisors.forEach(function(dv) { rows.push({ kind: 'divide', factor: dv, first: first / dv, second: second / dv }); });
    var factors = [1, 2, 3, 4, 5];
    if (factors.indexOf(selectedFactor) === -1) factors.push(selectedFactor);
    factors.sort(function(a, b) { return a - b; });
    factors.forEach(function(factor) { rows.push({ kind: 'multiply', factor: factor, first: first * factor, second: second * factor, selected: factor === selectedFactor }); });
    if (first !== 1) rows.push({ kind: 'unitFirst', first: 1, second: second / first });
    if (second !== 1) rows.push({ kind: 'unitSecond', first: first / second, second: 1 });
    return rows;
  }

  // Tape diagram: the whole split into first + second equal units.
  function tapeModel(first, second, total) {
    var a = Math.max(0, Math.round(finiteNumber(first, 0))), b = Math.max(0, Math.round(finiteNumber(second, 0)));
    var whole = finiteNumber(total, null);
    if (!(a + b > 0) || whole == null || whole < 0) return null;
    var unit = whole / (a + b);
    return { a: a, b: b, units: a + b, unit: unit, partA: unit * a, partB: unit * b, total: whole, boxes: a + b <= 24 };
  }

  // Graphing Calculator handoff: y = kx goes into its first empty function
  // slot (or the first slot); nothing else of its state changes.
  function graphCalcHandoff(previous, expr) {
    previous = previous && typeof previous === 'object' ? previous : {};
    var gc = previous.graphCalc && typeof previous.graphCalc === 'object' ? previous.graphCalc : {};
    var defaults = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'].map(function(color) { return { expr: '', color: color }; });
    var funcs = (Array.isArray(gc.funcs) && gc.funcs.length ? gc.funcs : defaults).map(function(fn) { return Object.assign({}, fn); });
    var already = funcs.some(function(fn) { return fn && String(fn.expr || '').replace(/\s+/g, '') === expr; });
    if (!already) {
      var slot = funcs.findIndex(function(fn) { return !fn || !String(fn.expr || '').trim(); });
      if (slot < 0) slot = 0;
      funcs[slot] = Object.assign({}, funcs[slot] || {}, { expr: expr });
    }
    return Object.assign({}, previous, { graphCalc: Object.assign({}, gc, { funcs: funcs }) });
  }

  function misconceptionLabel(kind, t) {
    t = tOf(t);
    var labels = {
      additive: t('stem.ratios.mk_additive', 'Additive reasoning (added instead of scaling)'),
      inverted: t('stem.ratios.mk_inverted', 'Ratio or rate turned upside down'),
      stoppedEarly: t('stem.ratios.mk_stopped_early', 'Stopped at the scale factor or the value for 1'),
      multiplyNotDivide: t('stem.ratios.mk_multiply_not_divide', 'Multiplied instead of dividing'),
      divideNotMultiply: t('stem.ratios.mk_divide_not_multiply', 'Divided instead of multiplying'),
      partToPart: t('stem.ratios.mk_part_to_part', 'Part-to-part used for part-to-whole'),
      decimalPercent: t('stem.ratios.mk_decimal_percent', 'Decimal and percent mixed up'),
      notSimplest: t('stem.ratios.mk_not_simplest', 'Equivalent but not simplest (accepted)'),
      notSimplified: t('stem.ratios.mk_not_simplified', 'Ratio not simplified'),
      partlySimplified: t('stem.ratios.mk_partly_simplified', 'Simplified part way, not to simplest form'),
      reversedRatio: t('stem.ratios.mk_reversed_ratio', 'Ratio terms reversed'),
      decimalTerms: t('stem.ratios.mk_decimal_terms', 'Equivalent ratio with decimal terms'),
      signOnly: t('stem.ratios.mk_sign_only', 'Right size, wrong sign'),
      quotientNotRatio: t('stem.ratios.mk_quotient', 'Wrote the quotient instead of the ratio'),
      placeValue: t('stem.ratios.mk_place_value', 'Place value slip'),
      complement: t('stem.ratios.mk_complement', 'Found the other percent'),
      partOnly: t('stem.ratios.mk_part_only', 'Found the tax, tip, discount or markup only'),
      addedPercent: t('stem.ratios.mk_added_percent', 'Used the percent as dollars'),
      wrongDirection: t('stem.ratios.mk_wrong_direction', 'Added when it should subtract, or the reverse'),
      wrongBase: t('stem.ratios.mk_wrong_base', 'Percent change divided by the new amount'),
      difference: t('stem.ratios.mk_difference', 'Gave the amount of change, not the percent'),
      wholeNotChange: t('stem.ratios.mk_whole_not_change', 'Gave the new amount as a percent'),
      stickerPrice: t('stem.ratios.mk_sticker_price', 'Compared total prices, not unit prices'),
      totalNotRate: t('stem.ratios.mk_total_not_rate', 'Compared totals, not rates'),
      interceptProportional: t('stem.ratios.mk_intercept', 'Called a line that misses (0, 0) proportional'),
      oneRowCheck: t('stem.ratios.mk_one_row', 'Checked only some rows'),
      patternNotRate: t('stem.ratios.mk_pattern', 'Continued a pattern instead of using the rate'),
      runOverRise: t('stem.ratios.mk_run_over_rise', 'Slope as run over rise'),
      readValueOnly: t('stem.ratios.mk_read_value', 'Read a value instead of the rate'),
      differenceNotRate: t('stem.ratios.mk_difference_not_rate', 'Used the change in y instead of y ÷ x'),
      biggerNumbers: t('stem.ratios.mk_bigger_numbers', 'Compared the size of numbers, not rates'),
      unitRateSkipped: t('stem.ratios.mk_unit_rate_skipped', 'Skipped finding the value for 1'),
      otherQuantity: t('stem.ratios.mk_other_quantity', 'Gave the other quantity'),
      subtracted: t('stem.ratios.mk_subtracted', 'Subtracted instead of dividing'),
      unit: t('stem.ratios.mk_unit', 'Wrong unit sign'),
      areaScaleK: t('stem.ratios.mk_area_scale_k', 'Area scaled by k, not k²'),
      drawingAreaOnly: t('stem.ratios.mk_drawing_area', 'Gave the area on the drawing'),
      perimeterNotArea: t('stem.ratios.mk_perimeter', 'Found the perimeter, not the area'),
      additiveComparison: t('stem.ratios.mk_additive_comparison', 'Compared mixtures by a difference (additive comparison)'),
      absoluteAmount: t('stem.ratios.mk_absolute_amount', 'Compared amounts, not shares of the whole'),
      otherPart: t('stem.ratios.mk_other_part', 'Found the other part of the mixture'),
      constantDifference: t('stem.ratios.mk_constant_difference', 'Took a constant change as proof of proportionality'),
      originMustBeListed: t('stem.ratios.mk_origin_listed', 'Expected the table to list (0, 0)'),
      evidenceFalse: t('stem.ratios.mk_evidence_false', 'Chose evidence that is not true for the case'),
      other: t('stem.ratios.mk_other', 'No named misconception')
    };
    return labels[kind] || labels.other;
  }

  // ===== Stage B helpers: fractions, detective cases, missions, handoffs =====
  function isEighths(value) { return isFinite(value) && Math.abs(Math.round(value * 8) - value * 8) < 1e-9; }
  function isHalves(value) { return isFinite(value) && Math.abs(Math.round(value * 2) - value * 2) < 1e-9; }
  function fracText(n, d) { var g = gcd(n, d); return d / g === 1 ? String(n / g) : (n / g) + '/' + (d / g); }
  // Kitchen amounts as mixed numbers: 1.125 -> "1 1/8", 0.75 -> "3/4".
  function mixedText(value) {
    if (!isFinite(value)) return '—';
    var sign = value < 0 ? '-' : '', v = Math.abs(value), dens = [1, 2, 3, 4, 8, 16];
    for (var i = 0; i < dens.length; i++) {
      var n = Math.round(v * dens[i]);
      if (Math.abs(n - v * dens[i]) < 1e-9) {
        var whole = Math.floor(n / dens[i]), rem = n - whole * dens[i];
        if (!rem) return sign + whole;
        var g = gcd(rem, dens[i]);
        return sign + (whole ? whole + ' ' : '') + (rem / g) + '/' + (dens[i] / g);
      }
    }
    return sign + num(v);
  }

  // Proportional relationship detective (7.RP.2a). Every case names its
  // evidence, and two cases are linear but miss (0, 0).
  var DETECTIVE_TYPES = ['tableProp', 'tableLinear', 'tableOneOff', 'graphOrigin', 'graphIntercept', 'storyRate', 'storyFee'];
  function makeDetectiveParams(rng, type) {
    var start = randInt(rng, 1, 3), gap = randInt(rng, 1, 3);
    return { type: DETECTIVE_TYPES.indexOf(type) >= 0 ? type : 'tableProp', k: pickOne(rng, [1.5, 2, 2.5, 3, 4, 5]), xs: [start, start + gap, start + 2 * gap], b0: randInt(rng, 1, 6), x1: pickOne(rng, [2, 4, 6]), r: pickOne(rng, [1.5, 2, 2.5, 3, 4, 6]), fee: pickOne(rng, [3, 5, 8, 10, 12]), ctx: pickOne(rng, ['a', 'b']) };
  }
  function detectiveEvidenceLabel(id, t) {
    t = tOf(t);
    var labels = {
      ratioSame: t('stem.ratios.ev_ratio_same', 'y ÷ x is the same in every row'),
      ratioChanges: t('stem.ratios.ev_ratio_changes', 'y ÷ x is not the same in every row'),
      sameStep: t('stem.ratios.ev_same_step', 'y goes up by the same amount each step'),
      lineOrigin: t('stem.ratios.ev_line_origin', 'The graph is a straight line through (0, 0)'),
      lineMisses: t('stem.ratios.ev_line_misses', 'The graph is a straight line, but it misses (0, 0)'),
      noStart: t('stem.ratios.ev_no_start', 'Zero items cost $0, and each one adds the same amount'),
      startAmount: t('stem.ratios.ev_start_amount', 'There is a starting amount you pay even for zero')
    };
    return labels[id] || id;
  }
  function buildDetectiveCase(p, t) {
    t = tOf(t);
    var type = DETECTIVE_TYPES.indexOf(p && p.type) >= 0 ? p.type : 'tableProp';
    var k = p.k, xs = (p.xs || [1, 2, 3]).slice(), rep = type.indexOf('table') === 0 ? 'table' : type.indexOf('graph') === 0 ? 'graph' : 'story';
    var proportional = type === 'tableProp' || type === 'graphOrigin' || type === 'storyRate';
    var c = { type: type, rep: rep, proportional: proportional };
    if (rep === 'table') {
      var ys = xs.map(function(x, i) { return type === 'tableLinear' ? k * x + p.b0 : (type === 'tableOneOff' && i === 2 ? k * x + 1 : k * x); });
      var v = { xs: listText(xs), ys: listText(ys), k: num(k), b0: num(p.b0), d: num(ys[1] - ys[0]), rates: xs.map(function(x, i) { return formatUnitRate(ys[i] / x, 3); }).join(', ') };
      c.rows = xs.map(function(x, i) { return [x, ys[i]]; });
      c.prompt = fill(t('stem.ratios.g_pt_prompt', 'Does the table x = {xs} and y = {ys} show a proportional relationship? Enter yes or no.'), v);
      c.text = fill(t('stem.ratios.dt_table_text', 'A table shows x = {xs} and y = {ys}.'), v);
      c.evidenceOptions = ['ratioSame', 'ratioChanges', 'sameStep'];
      c.evidence = proportional ? 'ratioSame' : 'ratioChanges';
      c.evidenceTrue = { ratioSame: proportional, ratioChanges: !proportional, sameStep: type !== 'tableOneOff' };
      if (type === 'tableProp') {
        c.traps = { no: { kind: 'originMustBeListed', message: fill(t('stem.ratios.mc_dt_table_prop', 'Find y ÷ x in each row: it is {k} every time. A table does not have to list (0, 0) to be proportional.'), v) } };
        c.evidenceNote = fill(t('stem.ratios.dt_note_table_prop', 'Proportional. y ÷ x = {k} in every row ({rates}), so y = {k}x.'), v);
        c.zeroNote = fill(t('stem.ratios.dt_zero_table_prop', 'y ÷ x is {k} in every row, so at x = 0, y would be 0.'), v);
      } else if (type === 'tableLinear') {
        c.traps = { yes: { kind: 'constantDifference', message: fill(t('stem.ratios.mc_dt_table_linear', 'y goes up by {d} each step, but y ÷ x is {rates}. A constant change is not a constant ratio: this line misses (0, 0).'), v) } };
        c.evidenceNote = fill(t('stem.ratios.dt_note_table_linear', 'Not proportional. y goes up by {d} each step, but y ÷ x is {rates}. It is linear, but at x = 0 the pattern gives y = {b0}, not 0.'), v);
        c.zeroNote = fill(t('stem.ratios.dt_zero_table_linear', 'The pattern gives y = {b0} at x = 0, not 0.'), v);
      } else {
        c.traps = { yes: { kind: 'oneRowCheck', message: fill(t('stem.ratios.mc_dt_table_one_off', 'The first rows share y ÷ x = {k}, but check every row: y ÷ x is {rates}.'), v) } };
        c.evidenceNote = fill(t('stem.ratios.dt_note_table_one_off', 'Not proportional. y ÷ x is {rates}: the last row breaks the pattern.'), v);
        c.zeroNote = fill(t('stem.ratios.dt_zero_table_one_off', 'y ÷ x is {rates}, so there is no single k.'), v);
      }
    } else if (rep === 'graph') {
      var y0 = type === 'graphOrigin' ? 0 : p.b0, y1 = y0 + k * p.x1;
      var gv = { x0: '0', y0: num(y0), x1: num(p.x1), y1: num(y1), k: num(k), b: num(y0) };
      c.graph = { points: [[0, y0], [p.x1, y1]], xLabel: 'x', yLabel: 'y', line: true };
      c.prompt = fill(t('stem.ratios.g_dt_graph', 'A graph shows a straight line through ({x0}, {y0}) and ({x1}, {y1}). Is the relationship proportional? Enter yes or no.'), gv);
      c.text = fill(t('stem.ratios.dt_graph_text', 'A straight-line graph passes through ({x0}, {y0}) and ({x1}, {y1}).'), gv);
      c.evidenceOptions = ['lineOrigin', 'lineMisses', 'sameStep'];
      c.evidence = proportional ? 'lineOrigin' : 'lineMisses';
      c.evidenceTrue = { lineOrigin: proportional, lineMisses: !proportional, sameStep: true };
      if (proportional) {
        c.traps = { no: { kind: 'other', message: fill(t('stem.ratios.mc_dt_graph_origin', 'This straight line passes through (0, 0), and y ÷ x = {k} at ({x1}, {y1}). That is proportional.'), gv) } };
        c.evidenceNote = fill(t('stem.ratios.dt_note_graph_origin', 'Proportional. The graph is a straight line through (0, 0), and y ÷ x = {k} at ({x1}, {y1}).'), gv);
        c.zeroNote = t('stem.ratios.dt_zero_graph_origin', 'At x = 0 the line is at y = 0.');
      } else {
        c.traps = { yes: { kind: 'interceptProportional', message: fill(t('stem.ratios.mc_dt_graph_intercept', 'The graph is a straight line, but at x = 0 it is at y = {b}, not 0. A line has to pass through (0, 0) to be proportional.'), gv) } };
        c.evidenceNote = fill(t('stem.ratios.dt_note_graph_intercept', 'Not proportional. The graph is a straight line, but it crosses the y-axis at (0, {b}), not at (0, 0). Linear is not enough.'), gv);
        c.zeroNote = fill(t('stem.ratios.dt_zero_graph_intercept', 'At x = 0 the line is at y = {b}, not 0.'), gv);
      }
    } else {
      var sv = { r: money(p.r), fee: money(p.fee) };
      var b = p.ctx === 'b';
      if (type === 'storyRate') {
        c.prompt = fill(b ? t('stem.ratios.g_dt_rate_b', 'A print shop charges ${r} per poster, with no setup fee. Is the total cost proportional to the number of posters? Enter yes or no.') : t('stem.ratios.g_dt_rate_a', 'Pears cost ${r} per pound, with no other charge. Is the total cost proportional to the number of pounds? Enter yes or no.'), sv);
        c.text = fill(b ? t('stem.ratios.dt_rate_b', 'A print shop charges ${r} per poster, with no setup fee.') : t('stem.ratios.dt_rate_a', 'Pears cost ${r} per pound, with no other charge.'), sv);
        c.traps = { no: { kind: 'other', message: fill(t('stem.ratios.mc_dt_rate', 'With no other charge, zero costs $0 and each one adds ${r}: cost = {r} × amount, so it is proportional.'), sv) } };
        c.evidenceNote = fill(t('stem.ratios.dt_note_rate', 'Proportional. Zero costs $0 and each one adds ${r}, so cost = {r} × amount.'), sv);
        c.zeroNote = t('stem.ratios.dt_zero_rate', 'Buying zero costs $0.');
      } else {
        c.prompt = fill(b ? t('stem.ratios.g_dt_fee_b', 'A climbing gym charges a ${fee} entry fee plus ${r} for each hour. Is the total cost proportional to the number of hours? Enter yes or no.') : t('stem.ratios.g_dt_fee_a', 'A bike rental costs a ${fee} fee plus ${r} for each hour. Is the total cost proportional to the number of hours? Enter yes or no.'), sv);
        c.text = fill(b ? t('stem.ratios.dt_fee_b', 'A climbing gym charges a ${fee} entry fee plus ${r} for each hour.') : t('stem.ratios.dt_fee_a', 'A bike rental costs a ${fee} fee plus ${r} for each hour.'), sv);
        c.traps = { yes: { kind: 'interceptProportional', message: fill(t('stem.ratios.mc_dt_fee', 'Each hour adds ${r}, but you pay ${fee} even for 0 hours. With a starting amount the graph misses (0, 0), so it is not proportional.'), sv) } };
        c.evidenceNote = fill(t('stem.ratios.dt_note_fee', 'Not proportional. The cost is linear, since each hour adds ${r}, but it starts at ${fee}, so the graph misses (0, 0).'), sv);
        c.zeroNote = fill(t('stem.ratios.dt_zero_fee', 'Even 0 hours costs the ${fee} fee.'), sv);
      }
      c.evidenceOptions = ['noStart', 'startAmount', 'sameStep'];
      c.evidence = proportional ? 'noStart' : 'startAmount';
      c.evidenceTrue = { noStart: proportional, startAmount: !proportional, sameStep: true };
    }
    c.params = p;
    return c;
  }
  // Verdict AND evidence must both be right. Returns the named mistake.
  function checkDetectiveAnswer(c, verdict, evidence, t) {
    t = tOf(t);
    if (!c) return { correct: false, complete: false, kind: 'other', message: '' };
    if ((verdict !== 'yes' && verdict !== 'no') || c.evidenceOptions.indexOf(evidence) < 0) return { correct: false, complete: false, kind: 'other', message: t('stem.ratios.dt_choose_both', 'Choose a verdict and one piece of evidence first.') };
    var verdictOk = (verdict === 'yes') === c.proportional;
    if (verdictOk && evidence === c.evidence) return { correct: true, complete: true };
    if (!verdictOk) {
      var trap = c.traps[verdict] || { kind: 'other', message: c.evidenceNote };
      return { correct: false, complete: true, kind: trap.kind, message: trap.message };
    }
    if (evidence === 'sameStep' && c.evidenceTrue.sameStep) return { correct: false, complete: true, kind: 'constantDifference', message: t('stem.ratios.dt_same_step_not_enough', 'Your verdict is right. "y goes up by the same amount each step" is true here, but it does not settle it: a straight line that misses (0, 0) does that too. Choose the evidence that decides it.') };
    if (!c.evidenceTrue[evidence]) return { correct: false, complete: true, kind: 'evidenceFalse', message: t('stem.ratios.dt_evidence_false', 'Your verdict is right, but that evidence is not true for this case. Look at the case again.') };
    return { correct: false, complete: true, kind: 'other', message: t('stem.ratios.dt_evidence_other', 'Your verdict is right. Choose the evidence that decides it.') };
  }

  // ---- Missions: a fresh, seed-regenerable instance each time ----
  var MISSION_IDS = ['scale', 'mixture', 'recipe', 'detective'];
  function missionRng(id, seed) { return makeRng(hashString('mission:' + id + ':' + seed)); }
  function buildScaleMission(seed, t) {
    t = tOf(t);
    var rng = missionRng('scale', seed), plan = null;
    for (var guard = 0; guard < 200 && !plan; guard++) {
      var k1 = pickOne(rng, [3, 4, 5]), l = randInt(rng, 4, 10), w = randInt(rng, 3, l - 1), k2 = pickOne(rng, [1, 2, 6, 8, 10, 12, 15]);
      var L2 = l * k1 / k2, W2 = w * k1 / k2;
      if (k2 !== k1 && isHalves(L2) && isHalves(W2) && W2 >= 1 && L2 <= 24) plan = { k1: k1, l: l, w: w, k2: k2 };
    }
    if (!plan) plan = { k1: 4, l: 6, w: 3, k2: 2 };
    var area = buildKindProblem('scaleArea', { ctx: 'room', k: plan.k1, w: plan.w, l: plan.l }, t, { id: 'scale-area' });
    return {
      id: 'scale', seed: seed, predictStep: 'area', k1: plan.k1, k2: plan.k2, l: plan.l, w: plan.w, L2: plan.l * plan.k1 / plan.k2, W2: plan.w * plan.k1 / plan.k2,
      predict: area.predict,
      steps: [
        { id: 'length', problem: buildKindProblem('scaleLength', { ctx: 'room', k: plan.k1, d: plan.l, toDrawing: false }, t, { id: 'scale-length' }) },
        { id: 'area', needsPredict: true, problem: area },
        { id: 'redrawL', problem: buildKindProblem('scaleRedraw', { ctx: 'roomLong', k1: plan.k1, w: plan.l, k2: plan.k2 }, t, { id: 'scale-redraw-l' }) },
        { id: 'redrawW', problem: buildKindProblem('scaleRedraw', { ctx: 'roomWide', k1: plan.k1, w: plan.w, k2: plan.k2 }, t, { id: 'scale-redraw-w' }) }
      ]
    };
  }
  function buildMixtureMission(seed, t) {
    t = tOf(t);
    var p = KINDS.mixtureCompare.make(missionRng('mixture', seed)), juice = p.ctx !== 'paint';
    var compare = buildKindProblem('mixtureCompare', p, t, { id: 'mixture-compare', prompt: juice ? t('stem.ratios.ms_mx_compare_juice', 'Which mix tastes more strongly of orange?') : t('stem.ratios.ms_mx_compare_paint', 'Which paint is a deeper red?') });
    var choices = [{ id: 'a', label: juice ? t('stem.ratios.ms_mix_a', 'Mix A') : t('stem.ratios.ms_paint_a', 'Paint A') }, { id: 'b', label: juice ? t('stem.ratios.ms_mix_b', 'Mix B') : t('stem.ratios.ms_paint_b', 'Paint B') }, { id: 'same', label: t('stem.ratios.ms_same_strength', 'Same strength') }];
    var correct = compare.answers[0] === 'same' ? 'same' : compare.answers[0];
    return {
      id: 'mixture', seed: seed, predictStep: 'compare', params: p, juice: juice,
      predict: { question: juice ? t('stem.ratios.ms_mx_predict_juice', 'First impression, before any math: which mix tastes more strongly of orange?') : t('stem.ratios.ms_mx_predict_paint', 'First impression, before any math: which paint is a deeper red?'), options: choices, correct: correct, why: compare.explain },
      steps: [
        { id: 'fracA', needsPredict: true, problem: buildKindProblem('mixtureFraction', { a: p.a, b: p.b, ctx: p.ctx }, t, { id: 'mixture-frac-a', prompt: juice ? t('stem.ratios.ms_mx_frac_a_juice', 'What fraction of mix A is orange concentrate? Enter a fraction or a decimal.') : t('stem.ratios.ms_mx_frac_a_paint', 'What fraction of paint A is red? Enter a fraction or a decimal.') }) },
        { id: 'fracB', needsPredict: true, problem: buildKindProblem('mixtureFraction', { a: p.c, b: p.e, ctx: p.ctx }, t, { id: 'mixture-frac-b', prompt: juice ? t('stem.ratios.ms_mx_frac_b_juice', 'What fraction of mix B is orange concentrate? Enter a fraction or a decimal.') : t('stem.ratios.ms_mx_frac_b_paint', 'What fraction of paint B is red? Enter a fraction or a decimal.') }) },
        { id: 'compare', needsPredict: true, choices: choices, problem: compare }
      ]
    };
  }
  var RECIPE_ITEMS = ['flour', 'sugar', 'milk', 'powder'];
  function buildRecipeMission(seed, t) {
    t = tOf(t);
    var rng = missionRng('recipe', seed);
    var plan = pickOne(rng, [[4, 6], [8, 6], [4, 10], [4, 5], [6, 9], [8, 12], [4, 3], [2, 5], [8, 4]]);
    var S = plan[0], T = plan[1], f = T / S;
    var amounts = { flour: [1.5, 2, 2.25, 3], sugar: [0.5, 0.75, 1], milk: [1, 1.25, 1.5], powder: [1, 1.5, 2] };
    var rowPrompts = {
      flour: t('stem.ratios.ms_rc_flour', 'Flour: {q} cups for {S} servings. How many cups for {T} servings?'),
      sugar: t('stem.ratios.ms_rc_sugar', 'Sugar: {q} cups for {S} servings. How many cups for {T} servings?'),
      milk: t('stem.ratios.ms_rc_milk', 'Milk: {q} cups for {S} servings. How many cups for {T} servings?'),
      powder: t('stem.ratios.ms_rc_powder', 'Baking powder: {q} teaspoons for {S} servings. How many teaspoons for {T} servings?')
    };
    var names = { flour: t('stem.ratios.ing_flour', 'Flour'), sugar: t('stem.ratios.ing_sugar', 'Sugar'), milk: t('stem.ratios.ing_milk', 'Milk'), powder: t('stem.ratios.ing_powder', 'Baking powder') };
    var items = RECIPE_ITEMS.map(function(ing) {
      var options = amounts[ing].filter(function(q) { return isEighths(q * f); });
      var q = options.length ? pickOne(rng, options) : 2;
      var problem = buildKindProblem('recipeScale', { ing: ing, S: S, T: T, q: q }, t, { id: 'recipe-' + ing, prompt: fill(rowPrompts[ing], { q: mixedText(q), S: num(S), T: num(T) }) });
      return { ing: ing, name: names[ing], q: q, scaled: q * f, problem: problem };
    });
    var fv = { f: mixedText(f) };
    return {
      id: 'recipe', seed: seed, predictStep: 'factor', S: S, T: T, f: f, items: items,
      predict: { question: fill(t('stem.ratios.ms_rc_predict', 'Before you scale from {S} to {T} servings: will every amount get bigger or smaller?'), { S: num(S), T: num(T) }), options: [{ id: 'more', label: t('stem.ratios.ms_bigger', 'Bigger') }, { id: 'less', label: t('stem.ratios.ms_smaller', 'Smaller') }], correct: f > 1 ? 'more' : 'less', why: fill(f > 1 ? t('stem.ratios.ms_rc_why_more', 'You are making more servings, so the scale factor {f} is more than 1 and every amount grows.') : t('stem.ratios.ms_rc_why_less', 'You are making fewer servings, so the scale factor {f} is less than 1 and every amount shrinks.'), fv) },
      steps: [{ id: 'factor', needsPredict: true, problem: buildKindProblem('recipeFactor', { S: S, T: T }, t, { id: 'recipe-factor' }) }].concat(items.map(function(item) { return { id: item.ing, needsPredict: true, problem: item.problem }; }))
    };
  }
  function buildDetectiveMission(seed, t) {
    t = tOf(t);
    var rng = missionRng('detective', seed), order = DETECTIVE_TYPES.slice();
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var swap = order[i]; order[i] = order[j]; order[j] = swap; }
    var cases = order.map(function(type, index) { var c = buildDetectiveCase(makeDetectiveParams(rng, type), t); c.id = 'case' + (index + 1); return c; });
    return { id: 'detective', seed: seed, cases: cases, steps: cases.map(function(c) { return { id: c.id, detective: c }; }) };
  }
  function buildMission(id, seed, t) {
    var s = Math.max(1, Math.floor(Math.abs(finiteNumber(seed, 1))) >>> 0);
    if (id === 'mixture') return buildMixtureMission(s, t);
    if (id === 'recipe') return buildRecipeMission(s, t);
    if (id === 'detective') return buildDetectiveMission(s, t);
    return buildScaleMission(s, t);
  }

  // Unit Converter handoff: fills ONLY its conversion inputs (category,
  // value, from and to units) and opens its Convert tab. Badges, quiz,
  // history and teacher settings are left as they were.
  var UNIT_CONVERT_UNITS = { length: ['km', 'mi', 'm', 'ft'], area: ['m²', 'ft²'], volume: ['cup', 'mL'], speed: ['mph', 'km/h'] };
  function unitConvertHandoff(previous, spec) {
    previous = previous && typeof previous === 'object' ? previous : {};
    if (!spec || !UNIT_CONVERT_UNITS[spec.category] || UNIT_CONVERT_UNITS[spec.category].indexOf(spec.from) < 0 || UNIT_CONVERT_UNITS[spec.category].indexOf(spec.to) < 0) return previous;
    var value = finiteNumber(spec.value, null);
    if (value == null || value < 0) return previous;
    value = roundTo(value, 6);
    var uc = previous.unitConvert && typeof previous.unitConvert === 'object' ? previous.unitConvert : {};
    return Object.assign({}, previous, { unitConvert: Object.assign({}, uc, { category: spec.category, value: value, valueDraft: String(value), fromUnit: spec.from, toUnit: spec.to, tab: 'convert' }) });
  }

  // ===== Stage C: learning path, band-ordered tabs, wrapped tape labels =====
  // The band's core activities come first; every mode and mission stays reachable.
  var BAND_MODE_ORDER = {
    g45: ['ratioTable', 'numberLine', 'unitRates', 'percent', 'proportional'],
    g6: ['ratioTable', 'unitRates', 'percent', 'numberLine', 'proportional'],
    g7: ['proportional', 'percent', 'numberLine', 'ratioTable', 'unitRates'],
    g8: ['proportional', 'unitRates', 'percent', 'numberLine', 'ratioTable']
  };
  var BAND_MISSION_ORDER = {
    g45: ['mixture', 'recipe', 'scale', 'detective'],
    g6: ['mixture', 'recipe', 'scale', 'detective'],
    g7: ['detective', 'scale', 'recipe', 'mixture'],
    g8: ['detective', 'scale', 'recipe', 'mixture']
  };
  function modeOrderFor(band) { return BAND_MODE_ORDER[band] || BAND_MODE_ORDER.g6; }
  function missionOrderFor(band) { return BAND_MISSION_ORDER[band] || BAND_MISSION_ORDER.g6; }
  // "Start here": 3 to 6 ordered steps per band. A practice step is done when
  // the kindStats of one of its kinds has a credited solve (no reveal); a
  // mission step when missionsDone holds a finished, unrevealed mission.
  var LEARNING_PATHS = {
    g45: [
      { id: 'timesMultiply', mode: 'ratioTable', kinds: ['multCompare'] },
      { id: 'timesTape', mode: 'ratioTable', kinds: ['multCompareDivide'], openModel: true },
      { id: 'ratioTableGroups', mode: 'ratioTable', kinds: ['missingValue', 'scale'] },
      { id: 'doubleLine', mode: 'numberLine', kinds: ['lineMissing'] }
    ],
    g6: [
      { id: 'ratioTables', mode: 'ratioTable', kinds: ['missingValue', 'simplify', 'scale'] },
      { id: 'unitRates', mode: 'unitRates', kinds: ['unitRate', 'betterBuy', 'compareRates'] },
      { id: 'percents', mode: 'percent', kinds: ['percentPart', 'percentRate', 'percentWhole', 'decimalPercent'] },
      { id: 'mixtures', mission: 'mixture' }
    ],
    g7: [
      { id: 'detective', mission: 'detective' },
      { id: 'percentChange', mode: 'percent', kinds: ['percentChange'] },
      { id: 'scaleDrawings', mission: 'scale' },
      { id: 'recipes', mission: 'recipe' }
    ],
    g8: [
      { id: 'slopeRate', mode: 'proportional', kinds: ['slope'] },
      { id: 'compareSlopes', mode: 'proportional', kinds: ['compareSlopes'] },
      { id: 'kFromGraph', mode: 'proportional', kinds: ['kFromGraph'] },
      { id: 'detectiveReview', mission: 'detective' }
    ]
  };
  function learningPathFor(band) { return (LEARNING_PATHS[band] || LEARNING_PATHS.g6).map(function(step) { return Object.assign({}, step); }); }
  function pathStepDone(step, data) {
    data = data && typeof data === 'object' ? data : {};
    if (step.mission) {
      var done = data.missionsDone && typeof data.missionsDone === 'object' ? data.missionsDone : {};
      return Object.keys(done).some(function(key) { return done[key] === true && key.indexOf(step.mission + ':') === 0; });
    }
    var stats = data.kindStats && typeof data.kindStats === 'object' ? data.kindStats : {};
    return (step.kinds || []).some(function(kind) {
      var entry = stats[kind];
      return !!entry && typeof entry === 'object' && Math.floor(finiteNumber(entry.correct, 0)) >= 1;
    });
  }
  // A practice seed whose problem is of the given kind and not solved yet.
  function seedForKind(mode, band, kind, startSeed, solvedPractice) {
    var solved = solvedPractice && typeof solvedPractice === 'object' ? solvedPractice : {};
    var start = Math.max(1, Math.floor(Math.abs(finiteNumber(startSeed, 1))) % 2147483646);
    var fallback = null;
    for (var i = 0; i < 4000; i++) {
      var seed = 1 + ((start - 1 + i * 7) % 2147483646);
      if (practiceKindFor(mode, band, seed) !== kind) continue;
      if (fallback == null) fallback = seed;
      if (!solved[practiceId(mode, band, seed)]) return seed;
    }
    return fallback;
  }
  // Grades 4-5 open the ratio table on "times as many" (4.OA.2), the first
  // step of their path, not on a grade 6 lesson problem.
  var DEFAULT_PRACTICE_KIND = { 'ratioTable:g45': { kind: 'multCompare', step: 'timesMultiply' } };
  function defaultPracticeSeed(mode, band) {
    var spec = DEFAULT_PRACTICE_KIND[mode + ':' + band];
    if (spec) {
      var seed = seedForKind(mode, band, spec.kind, hashString('path:' + spec.step + ':' + band), {});
      if (seed != null) return seed;
    }
    return hashString(mode + ':' + band + ':start') || 1;
  }
  function opensOnPractice(mode, band) { return !!DEFAULT_PRACTICE_KIND[mode + ':' + band]; }
  // Mixtures (6.RP.3) sits behind Grade 6: grades 4-5 see it only on request.
  function missionsShownFor(band, showGrade6, lockMission) {
    return missionOrderFor(band).filter(function(id) { return !(band === 'g45' && id === 'mixture' && !showGrade6 && lockMission !== 'mixture'); });
  }
  // Phone width: a tape is drawn on a 260-unit canvas instead of 500, so its labels
  // are not scaled down to 5 px. Read at render time (this render holds no hooks).
  function phoneWidthNow() { try { var mq = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 639px)'); return !!(mq && mq.matches && /max-width/.test(String(mq.media))); } catch (e) { return false; } }

  // Tape-row labels wrap onto up to maxLines lines of maxChars; a label that
  // still does not fit ends in an ellipsis (the full text is in the <desc>).
  function wrapTapeLabel(label, maxChars, maxLines) {
    var width = Math.max(4, Math.floor(finiteNumber(maxChars, 14)));
    var limit = Math.max(1, Math.floor(finiteNumber(maxLines, 2)));
    var words = String(label == null ? '' : label).trim().split(/\s+/).filter(Boolean);
    var lines = [], current = '';
    words.forEach(function(word) {
      while (word.length > width) {
        if (current) { lines.push(current); current = ''; }
        lines.push(word.slice(0, width - 1) + '-');
        word = word.slice(width - 1);
      }
      if (!current) current = word;
      else if ((current + ' ' + word).length <= width) current += ' ' + word;
      else { lines.push(current); current = word; }
    });
    if (current) lines.push(current);
    if (!lines.length) return { lines: [''], truncated: false };
    if (lines.length <= limit) return { lines: lines, truncated: false };
    var kept = lines.slice(0, limit);
    var last = kept[limit - 1].replace(/-$/, '');
    kept[limit - 1] = (last.length >= width ? last.slice(0, width - 1) : last) + '…';
    return { lines: kept, truncated: true };
  }

  // ===== Engagement build (2026-11-04) =====
  // Free exploration opens on numbers chosen so that the open problem's
  // answer appears nowhere in the workspace (no input, row, tape or result),
  // and so that the workspace never models the problem's own ratio or rates.
  var EXPLORE_FIXED = {
    ratioTable: [[3, 5, 4], [2, 7, 3], [4, 9, 5], [5, 8, 6], [7, 4, 3], [9, 2, 7], [5, 3, 7], [8, 5, 9]],
    numberLine: [[2, 5, 5], [3, 7, 4], [4, 9, 6], [5, 11, 3], [6, 13, 7], [7, 3, 4]],
    unitRates: [[12, 3.6, 20, 5.4], [10, 4, 16, 5.6], [8, 3.2, 25, 8.75], [6, 1.5, 9, 2.97]],
    percent: [[25, 80], [40, 70], [15, 60], [70, 90], [35, 120]],
    proportional: [['0, 1, 2, 4', '0, 3, 6, 12'], ['0, 1, 3, 5', '0, 2, 6, 10'], ['0, 2, 4, 5', '0, 7, 14, 17.5'], ['0, 1, 2, 3', '0, 5, 10, 15'], ['0, 2, 3, 6', '0, 9, 13.5, 27']]
  };
  // Examples behind the explore buttons: each list keeps its teaching point.
  var EXPLORE_EXAMPLES = {
    package: [[12, 3.6, 20, 5.4], [10, 4, 16, 5.6], [8, 3.2, 25, 8.75], [6, 2.7, 14, 5.6]],
    sameUnit: [[6, 2.4, 15, 6], [4, 2, 10, 5], [8, 2, 12, 3], [5, 3.5, 9, 6.3]],
    zeroCost: [[4, 0, 10, 1.5], [5, 0, 8, 2], [6, 0, 9, 2.7]],
    proportional: [['0, 1, 2, 4', '0, 3, 6, 12'], ['0, 1, 3, 5', '0, 2, 6, 10'], ['0, 2, 4, 5', '0, 7, 14, 17.5'], ['0, 1, 2, 3', '0, 5, 10, 15']],
    nonProportional: [['0, 1, 2, 4', '0, 3, 7, 12'], ['0, 1, 2, 3', '0, 2, 5, 6'], ['0, 2, 4, 6', '1, 5, 9, 13'], ['0, 1, 3, 4', '0, 4, 10, 18']]
  };
  var exploreCandidateCache = {};
  function exploreCandidates(mode) {
    if (exploreCandidateCache[mode]) return exploreCandidateCache[mode];
    var list = (EXPLORE_FIXED[mode] || []).slice();
    var a, b, f;
    if (mode === 'ratioTable') {
      for (a = 2; a <= 13; a++) for (b = 2; b <= 13; b++) if (a !== b && gcd(a, b) === 1) for (f = 2; f <= 9; f++) list.push([a, b, f]);
    } else if (mode === 'numberLine') {
      for (a = 2; a <= 9; a++) for (b = 3; b <= 17; b++) if (a !== b) for (f = 3; f <= 8; f++) list.push([a, b, f]);
    } else if (mode === 'unitRates') {
      [6, 8, 10, 14].forEach(function(qa) { [0.35, 0.45, 0.55].forEach(function(ra) { [9, 15, 18].forEach(function(qb) { [0.3, 0.4, 0.5].forEach(function(rb) { list.push([qa, roundTo(qa * ra, 2), qb, roundTo(qb * rb, 2)]); }); }); }); });
    } else if (mode === 'percent') {
      [10, 20, 30, 45, 55, 60, 65, 75, 85, 95].forEach(function(p) { [40, 50, 90, 110, 140, 160].forEach(function(w) { list.push([p, w]); }); });
    } else if (mode === 'proportional') {
      [1.5, 2.5, 4, 6, 7, 8, 9, 1.25, 3.5, 4.5, 11, 12, 13].forEach(function(k) { [[0, 1, 2, 4], [0, 2, 3, 5], [0, 3, 5, 6], [0, 1, 3, 7]].forEach(function(xs) { list.push([xs.join(', '), xs.map(function(x) { return num(k * x); }).join(', ')]); }); });
    }
    exploreCandidateCache[mode] = list;
    return list;
  }
  // Every number a default workspace would show, from the same model
  // functions the workspace renders with. Row-operation labels (x 1 ... x 5)
  // and the 1 of a unit-rate row are structure, not results.
  function exploreShownNumbers(mode, c) {
    var out = [];
    function push(v) { if (typeof v === 'number' && isFinite(v)) out.push(v, roundTo(v, 2), Number(formatSignificantNumber(v, 3)), Number(formatNumber(v, 4))); }
    if (mode === 'ratioTable') {
      var g = gcd(c[0], c[1]);
      [c[0], c[1], c[2], c[0] / g, c[1] / g].forEach(push);
      if (g > 1) push(g);
      ratioTableRows(c[0], c[1], c[2]).forEach(function(row) {
        if (row.kind !== 'unitFirst') push(row.first);
        if (row.kind !== 'unitSecond') push(row.second);
        if (row.kind === 'divide') push(row.factor);
      });
      var tape = tapeModel(c[0] / g, c[1] / g, (c[0] + c[1]) * c[2]);
      if (tape) [tape.total, tape.unit, tape.partA, tape.partB, tape.units].forEach(push);
    } else if (mode === 'numberLine') {
      [c[0], c[1], c[2], c[1] / c[0]].forEach(push);
      for (var i = 1; i <= c[2]; i++) { push(i * c[0]); push(i * c[1]); }
    } else if (mode === 'unitRates') {
      c.forEach(push);
      var cmp = buildUnitComparison(c[0], c[1], c[2], c[3], 1);
      if (cmp.ok) cmp.rates.forEach(push);
    } else if (mode === 'percent') {
      push(c[0]); push(c[1]); push(c[1] * c[0] / 100);
      // The percent tape's description: full 10% sections and the partial one.
      var full = Math.floor(c[0] / 10 + 1e-9), rest = roundTo(c[0] - full * 10, 6);
      if (c[0] <= 100) { push(full); if (rest > 0) { push(roundTo(rest * 10, 6)); push(rest); } }
    } else if (mode === 'proportional') {
      var pairs = parsePairs(c[0], c[1]);
      pairs.forEach(function(p) { push(p.x); push(p.y); if (p.x) push(p.y / p.x); });
      // The graph's axis ticks: half and all of each axis maximum.
      [positiveAxisMaximum(pairs.map(function(p) { return p.x; })), positiveAxisMaximum(pairs.map(function(p) { return p.y; }))].forEach(function(max) { push(max); push(max / 2); });
    }
    return out;
  }
  function explorePairs(mode, c) {
    if (mode === 'ratioTable' || mode === 'numberLine') return [[c[0], c[1]]];
    if (mode === 'unitRates') return [[c[0], c[1]], [c[2], c[3]]];
    if (mode === 'proportional') return parsePairs(c[0], c[1]).filter(function(p) { return p.x !== 0; }).map(function(p) { return [p.x, p.y]; });
    return [];
  }
  // The pairs a problem is about: its model rows, its parameters, its graph.
  function problemPairs(problem) {
    var pairs = [];
    function add(x, y) { if (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y) && x !== 0) pairs.push([x, y]); }
    var rows = problem && problem.model && Array.isArray(problem.model.rows) ? problem.model.rows : [];
    rows.forEach(function(row) {
      var nums = (Array.isArray(row) ? row : []).map(function(cell) { return typeof cell === 'number' ? cell : parseNumberWithFraction(String(cell == null ? '' : cell).replace(/[$%]/g, '')); }).filter(function(v) { return v != null && isFinite(v); });
      if (nums.length >= 2) add(nums[0], nums[1]);
    });
    var p = problem && problem.params && typeof problem.params === 'object' ? problem.params : {};
    add(p.a, p.b); add(p.c, p.e);
    if (problem && problem.graph && Array.isArray(problem.graph.points)) problem.graph.points.forEach(function(pt) { add(pt[0], pt[1]); });
    if (problem && Array.isArray(problem.ratioAnswer)) add(problem.ratioAnswer[0], problem.ratioAnswer[1]);
    if (problem && Array.isArray(problem.ratioOriginal)) add(problem.ratioOriginal[0], problem.ratioOriginal[1]);
    return pairs;
  }
  function exploreLeaks(mode, cand, problem) {
    if (!problem || !cand) return false;
    var key = typeof problem.answer === 'number' ? problem.answer : null;
    if (key != null && exploreShownNumbers(mode, cand).some(function(v) { return nearlyEqual(v, key); })) return true;
    // Same percent of the same amount: the workspace would show the problem's first step.
    if (mode === 'percent') {
      var given = (String(problem.prompt == null ? '' : problem.prompt).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).map(Number);
      if (given.indexOf(cand[0]) >= 0 && given.indexOf(cand[1]) >= 0) return true;
    }
    var mine = explorePairs(mode, cand), theirs = problemPairs(problem);
    return mine.some(function(cp) {
      return cp[0] !== 0 && theirs.some(function(pp) { return nearlyEqual(cp[1] / cp[0], pp[1] / pp[0]) || nearlyEqual(cp[0] / (cp[1] || NaN), pp[1] / pp[0]); });
    });
  }
  function exploreDefaultsFor(mode, problem) {
    var list = exploreCandidates(mode);
    for (var i = 0; i < list.length; i++) if (!exploreLeaks(mode, list[i], problem)) return list[i].slice();
    return (list[0] || []).slice();
  }
  function exploreExampleFor(listId, mode, problem) {
    var list = (EXPLORE_EXAMPLES[listId] || []).slice();
    // Proportional examples can fall back on the generated proportional
    // defaults; non-proportional ones on lines that miss (0, 0).
    if (listId === 'proportional') list = list.concat(exploreCandidates('proportional'));
    if (listId === 'nonProportional') [2.5, 4, 6, 7, 9, 11].forEach(function(k) { [1, 3, 5].forEach(function(b) { [[0, 1, 2, 4], [0, 1, 3, 5], [0, 3, 5, 6], [0, 1, 3, 7]].forEach(function(xs) { list.push([xs.join(', '), xs.map(function(x) { return num(k * x + b); }).join(', ')]); }); }); });
    for (var i = 0; i < list.length; i++) if (!exploreLeaks(mode, list[i], problem)) return list[i].slice();
    return null;
  }

  // ---- "Model this problem": the student builds the model ----
  // A two-column model with exactly one unknown ("?") is built as a table:
  // the student types the problem's given rows and the Find row's known
  // amount; the unknown cell stays "?" until a check settles it.
  function modelCellValue(cell) {
    if (cell === '?') return '?';
    if (typeof cell === 'number') return isFinite(cell) ? cell : null;
    return parseNumberWithFraction(String(cell == null ? '' : cell).replace(/^\$/, ''));
  }
  function buildableTableSpec(model, problem) {
    if (!model || !Array.isArray(model[0]) || model[0].length !== 2 || !Array.isArray(model[1])) return null;
    var givens = [], find = null, zero = false;
    for (var i = 0; i < model[1].length; i++) {
      var row = model[1][i];
      if (!Array.isArray(row) || row.length !== 2) return null;
      var a = modelCellValue(row[0]), b = modelCellValue(row[1]);
      if (a === '?' || b === '?') {
        if (find || (a === '?' && b === '?')) return null;
        var known = a === '?' ? b : a;
        if (known == null) return null;
        find = { col: a === '?' ? 0 : 1, known: known };
      } else {
        if (a == null || b == null) return null;
        if (a === 0 && b === 0) { zero = true; continue; }
        givens.push([a, b]);
      }
    }
    if (!find || !givens.some(function(g) { return g[0] !== 0 && g[1] !== 0; })) return null;
    return { labels: model[0].slice(), givens: givens, find: find, zero: zero, line: !!(problem && problem.line) };
  }
  // Reads the student's own table. Nothing here is shown before a check.
  function checkModelTable(spec, build) {
    build = build && typeof build === 'object' ? build : {};
    var ref = spec.givens.filter(function(g) { return g[0] !== 0 && g[1] !== 0; })[0];
    var rows = Array.isArray(build.rows) ? build.rows : [];
    var out = { filled: false, rows: [], hasGiven: false, find: 'empty', ok: false };
    function text(v) { return String(v == null ? '' : v).trim(); }
    rows.forEach(function(row, index) {
      var raw = Array.isArray(row) ? row : [];
      var any = !!(text(raw[0]) || text(raw[1]));
      var x = parseNumberWithFraction(text(raw[0])), y = parseNumberWithFraction(text(raw[1]));
      var status;
      if (!any) status = 'empty';
      else if (x == null || y == null) status = 'incomplete';
      else if (spec.givens.some(function(g) { return nearlyEqual(g[0], x) && nearlyEqual(g[1], y); })) status = 'given';
      else if (!nearlyEqual(x, y) && spec.givens.some(function(g) { return nearlyEqual(g[0], y) && nearlyEqual(g[1], x); })) status = 'swapped';
      else if (x === 0 && y === 0) status = 'zero';
      else if (x < 0 || y < 0) status = 'notEquivalent';
      else if (nearlyEqual(x * ref[1], y * ref[0])) status = 'equivalent';
      else if (nearlyEqual(x - ref[0], y - ref[1])) status = 'additive';
      else status = 'notEquivalent';
      if (any) out.filled = true;
      if (status === 'given') out.hasGiven = true;
      out.rows.push({ index: index, x: x, y: y, status: status, factor: (status === 'given' || status === 'equivalent') ? x / ref[0] : null, added: status === 'additive' ? x - ref[0] : null });
    });
    var findText = text(build.find);
    if (findText) out.filled = true;
    var fv = parseNumberWithFraction(findText);
    out.find = !findText ? 'empty' : fv == null ? 'invalid' : nearlyEqual(fv, spec.find.known) ? 'ok' : 'wrong';
    out.ok = out.hasGiven && out.find === 'ok' && out.rows.every(function(r) { return r.status === 'given' || r.status === 'equivalent' || r.status === 'zero' || r.status === 'empty'; });
    return out;
  }
  // A tape is right when its bars keep the problem's unit counts in proportion.
  function checkModelTape(tape, units) {
    var want = tape.rows.map(function(row) { return Math.max(1, Math.round(finiteNumber(row.units, 1))); });
    var got = want.map(function(w, i) { return clamp(Math.round(finiteNumber(units && units[i], 1)), 1, 24); });
    return { want: want, got: got, ok: got.every(function(g, i) { return g * want[0] === want[i] * got[0]; }) };
  }
  // The colour of a mix: the concentrate's share of the whole sets how far
  // the water colour moves toward the concentrate colour.
  function mixColor(share, strong, weak) {
    var s = clamp(finiteNumber(share, 0), 0, 1);
    function rgb(hex) { var n = parseInt(String(hex).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    var a = rgb(strong), b = rgb(weak);
    return '#' + [0, 1, 2].map(function(i) { var v = Math.round(b[i] + (a[i] - b[i]) * s); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  function reducedMotionNow() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (error) { return false; }
  }
  // Phone drawings are laid out at the real width of their box, 1 unit to 1 px: host padding leaves 146 to 244 px at a
  // 320 px viewport, so a fixed viewBox can not promise a text size.
  var fitWidthCache = null;
  function fitWidthComponent(React) {
    if (fitWidthCache && fitWidthCache.react === React) return fitWidthCache.comp;
    var Comp = function(props) {
      var widthState = React.useState(0), boxRef = React.useRef(null);
      var setWidth = widthState[1];
      React.useLayoutEffect(function() {
        var box = boxRef.current;
        if (!box) return undefined;
        var read = function() { var w = Math.round(box.clientWidth); if (w > 0) setWidth(w); };
        read();
        if (typeof root.ResizeObserver !== 'function') return undefined;
        var watcher = new root.ResizeObserver(read);
        watcher.observe(box);
        return function() { watcher.disconnect(); };
      }, []);
      return React.createElement('div', { ref: boxRef, style: { width: '100%', minWidth: 0 } }, props.render(widthState[0] || props.fallback));
    };
    fitWidthCache = { react: React, comp: Comp };
    return Comp;
  }
  // The pour animation lives in its own component so its frame loop has a
  // cleanup; it checks reduced motion on every frame.
  var mixPourCache = null;
  function mixPourComponent(React) {
    if (mixPourCache && mixPourCache.react === React) return mixPourCache.comp;
    var Comp = function(props) {
      var progressState = React.useState(reducedMotionNow() ? 1 : 0);
      var replayState = React.useState(0);
      var setProgress = progressState[1], replayId = replayState[0];
      React.useEffect(function() {
        var raf = root.requestAnimationFrame, caf = root.cancelAnimationFrame;
        if (typeof raf !== 'function' || reducedMotionNow()) { setProgress(1); return undefined; }
        var alive = true, start = null, frame = null;
        setProgress(0);
        function step(stamp) {
          if (!alive) return;
          if (reducedMotionNow()) { setProgress(1); return; }
          if (start == null) start = stamp;
          var p = Math.min(1, (stamp - start) / 2400);
          setProgress(p);
          if (p < 1) frame = raf.call(root, step);
        }
        frame = raf.call(root, step);
        return function() { alive = false; if (frame != null && typeof caf === 'function') caf.call(root, frame); };
      }, [replayId]);
      return props.draw(progressState[0], function() { replayState[1](replayId + 1); });
    };
    mixPourCache = { react: React, comp: Comp };
    return Comp;
  }

  var CHALLENGES = buildFixedChallenges(identityT);
  var CHALLENGE_IDS = [];
  Object.keys(CHALLENGES).forEach(function(mode) {
    CHALLENGES[mode].forEach(function(challenge) { CHALLENGE_IDS.push(challenge.id); });
  });
  root.RatioLabPure = {
    buildUnitComparison: buildUnitComparison,
    gcd: gcd,
    parsePairs: parsePairs,
    parsePairInput: parsePairInput,
    analyzeProportionalPairs: analyzeProportionalPairs,
    pairsShareUnitRate: pairsShareUnitRate,
    unitRateIsRepresentable: unitRateIsRepresentable,
    formatSignificantNumber: formatSignificantNumber,
    formatUnitRate: formatUnitRate,
    formatUnitRateEvidence: formatUnitRateEvidence,
    positiveAxisMaximum: positiveAxisMaximum,
    roundTo: roundTo,
    numberLineScaffold: numberLineScaffold,
    percentSegmentFills: percentSegmentFills,
    percentTapeModel: percentTapeModel,
    percentTapeSummary: percentTapeSummary,
    parseNumericChallengeAnswer: parseNumericChallengeAnswer,
    challengeIsCorrect: challengeIsCorrect,
    expectedChallengeUnit: expectedChallengeUnit,
    gradeNumberFromLevel: gradeNumberFromLevel,
    strictUnitsForGrade: strictUnitsForGrade,
    challengeUnitProblem: challengeUnitProblem,
    diagnoseRatioAnswer: diagnoseRatioAnswer,
    canonicalChallengeAnswer: canonicalChallengeAnswer,
    challenges: CHALLENGES,
    buildFixedChallenges: buildFixedChallenges,
    parseNumberWithFraction: parseNumberWithFraction,
    parseRatioAnswer: parseRatioAnswer,
    ratioAnswerStatus: ratioAnswerStatus,
    normalizeChoice: normalizeChoice,
    bandForGrade: bandForGrade,
    bands: BANDS,
    kinds: Object.keys(KINDS),
    practiceKinds: PRACTICE_KINDS,
    makeKindParams: function(kind, seed, band) { return KINDS[kind] ? KINDS[kind].make(makeRng(seed), band) : null; },
    buildKindProblem: buildKindProblem,
    generateProblem: generateProblem,
    practiceKindFor: practiceKindFor,
    nextPracticeSeed: nextPracticeSeed,
    workedSibling: workedSibling,
    ratioTableRows: ratioTableRows,
    tapeModel: tapeModel,
    graphCalcHandoff: graphCalcHandoff,
    misconceptionLabel: misconceptionLabel,
    localModes: localModes,
    mixedText: mixedText,
    fracText: fracText,
    detectiveTypes: DETECTIVE_TYPES,
    makeDetectiveParams: function(type, seed) { return makeDetectiveParams(makeRng(seed), type); },
    buildDetectiveCase: buildDetectiveCase,
    checkDetectiveAnswer: checkDetectiveAnswer,
    detectiveEvidenceLabel: detectiveEvidenceLabel,
    missionIds: MISSION_IDS,
    buildMission: buildMission,
    unitConvertHandoff: unitConvertHandoff,
    modeOrderFor: modeOrderFor,
    missionOrderFor: missionOrderFor,
    learningPathFor: learningPathFor,
    pathStepDone: pathStepDone,
    seedForKind: seedForKind,
    wrapTapeLabel: wrapTapeLabel,
    exploreDefaultsFor: exploreDefaultsFor,
    exploreExampleFor: exploreExampleFor,
    exploreLeaks: exploreLeaks,
    buildableTableSpec: buildableTableSpec,
    checkModelTable: checkModelTable,
    checkModelTape: checkModelTape,
    mixColor: mixColor,
    defaultPracticeSeed: defaultPracticeSeed,
    missionsShownFor: missionsShownFor
  };

  // Quest labels are read by the host outside render; they use the language
  // of the most recent render.
  var questT = identityT;

  var TEACHER_DEFAULTS = { lockMode: null, problemSet: 'both', band: 'auto', allowReveal: true, lockMission: null };
  function normalizeTeacher(raw) {
    var source = raw && typeof raw === 'object' ? raw : {};
    return {
      lockMode: MODE_IDS.indexOf(source.lockMode) >= 0 ? source.lockMode : null,
      lockMission: MISSION_IDS.indexOf(source.lockMission) >= 0 ? source.lockMission : null,
      problemSet: ['both', 'fixed', 'practice'].indexOf(source.problemSet) >= 0 ? source.problemSet : TEACHER_DEFAULTS.problemSet,
      band: source.band === 'auto' || BANDS.indexOf(source.band) >= 0 ? source.band : TEACHER_DEFAULTS.band,
      allowReveal: source.allowReveal !== false
    };
  }
  function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

  window.StemLab.registerTool('ratioLab', {
    icon: '➗',
    label: 'Ratios, Rates & Proportions Lab',
    desc: 'Explore ratio tables, double number lines, unit rates, percents, and proportional relationships.',
    color: 'indigo',
    category: 'math',
    questHooks: [
      {
        id: 'ratio_explorer',
        get label() { var t = tOf(questT); return t('stem.ratios.quest_explorer', 'Explore all 5 representations'); },
        icon: '🧭',
        check: function(d) { return visitedCount(d) >= 5; },
        progress: function(d) { var t = tOf(questT); return fill(t('stem.ratios.quest_explorer_progress', '{n}/5 modes'), { n: visitedCount(d) }); }
      },
      {
        id: 'ratio_challenger',
        get label() { var t = tOf(questT); return t('stem.ratios.quest_challenger', 'Solve 5 unique challenges'); },
        icon: '🏆',
        check: function(d) { return solvedCount(d) >= 5; },
        progress: function(d) { var t = tOf(questT); return fill(t('stem.ratios.quest_challenger_progress', '{n}/5 solved'), { n: solvedCount(d) }); }
      },
      {
        id: 'proportion_detective',
        get label() { var t = tOf(questT); return t('stem.ratios.quest_detective', 'Solve a proportionality challenge'); },
        icon: '🔎',
        check: function(d) { return solvedInMode(d, 'proportional'); },
        progress: function(d) { var t = tOf(questT); return solvedInMode(d, 'proportional') ? t('stem.ratios.quest_solved', 'Solved!') : t('stem.ratios.quest_not_yet', 'Not yet'); }
      }
    ],
    render: function(ctx) {
      var t = function (key, fallback) {
        try { var translated = typeof ctx.t === 'function' ? ctx.t(key, fallback) : null; return translated == null ? fallback : translated; }
        catch (_) { return fallback; }
      };
      ctx = ctx || {};
      questT = t;
      var React = ctx.React;
      if (!React || typeof React.createElement !== 'function') return null;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = typeof ctx.setToolData === 'function' ? ctx.setToolData : function() {};
      var d = labToolData._ratioLab || {};
      var strictUnits = strictUnitsForGrade(ctx.gradeLevel, ctx.gradeBand);
      var isTeacher = ctx.isTeacherMode === true;
      var teacher = normalizeTeacher(d.teacher);
      var MODES_L = localModes(t);
      var autoBand = bandForGrade(ctx.gradeLevel, ctx.gradeBand);
      var band = teacher.band !== 'auto' ? teacher.band : (BANDS.indexOf(d.band) >= 0 ? d.band : autoBand);
      // Tabs in the band's order; a first visit opens the band's core mode.
      var modeOrder = modeOrderFor(band), missionOrder = missionsShownFor(band, d.showGrade6Missions === true, teacher.lockMission);
      // Practice or Missions: one section at a time keeps the page short.
      var labView = d.labView === 'missions' || (d.labView !== 'practice' && teacher.lockMission) ? 'missions' : 'practice';
      var mode = teacher.lockMode || (CHALLENGES[d.mode] ? d.mode : modeOrder[0]);
      var LOCAL_CHALLENGES = buildFixedChallenges(t);
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
        if (teacher.lockMode && nextMode !== teacher.lockMode) {
          announce(t('stem.ratios.mode_locked_note', 'Your teacher has set the mode for this lesson.'));
          return;
        }
        update(function(current) {
          var visited = Object.assign({}, current.modesVisited || {});
          var cursors = Object.assign({}, current.challengeCursorByMode || {});
          visited[mode] = true;
          visited[nextMode] = true;
          if (challenge && !challenge.generated) cursors[mode] = challenge.id;
          var nextChallenges = CHALLENGES[nextMode] || [];
          var savedCursor = cursors[nextMode];
          var nextIndex = typeof savedCursor === 'string'
            ? nextChallenges.findIndex(function(item) { return item.id === savedCursor; })
            : -1;
          if (nextIndex < 0) nextIndex = clamp(Math.floor(finiteNumber(savedCursor, 0)), 0, Math.max(0, nextChallenges.length - 1));
          var nextChallenge = nextChallenges[nextIndex] || nextChallenges[0];
          // A mode that opens on practice keeps doing so: no lesson cursor is written for it.
          var keepsPractice = opensOnPractice(nextMode, band) && typeof savedCursor !== 'string' && !plainObject(current.sourceByMode)[nextMode];
          if (nextChallenge && !keepsPractice) cursors[nextMode] = nextChallenge.id;
          return { mode: nextMode, modesVisited: visited, challengeCursorByMode: cursors,
            challengeId: nextChallenge ? nextChallenge.id : null, challengeIndex: nextIndex,
            challengeAnswer: '', challengeAnswerId: null, challengeFeedback: null };
        });
        var selected = MODES_L.filter(function(item) { return item.id === nextMode; })[0];
        announce(fill(t('stem.ratios.mode_opened', '{mode} opened.'), { mode: selected ? selected.title : nextMode }));
      }

      function moveMode(event, index) {
        var nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % modeOrder.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + modeOrder.length) % modeOrder.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = modeOrder.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        if (teacher.lockMode) return;
        var nextMode = modeOrder[nextIndex];
        chooseMode(nextMode);
        if (typeof document !== 'undefined') {
          var nextTab = document.getElementById('ratio-tab-' + nextMode);
          if (nextTab) nextTab.focus();
        }
      }

      function validateNumericDraft(raw, options) {
        options = options || {};
        var normalized = String(raw == null ? '' : raw).trim();
        if (!normalized) return { valid: false, code: 'required', value: null };
        var parsed = Number(normalized);
        if (!isFinite(parsed)) return { valid: false, code: 'number', value: null };
        if (options.integer && !Number.isInteger(parsed)) return { valid: false, code: 'integer', value: parsed };
        if (options.min != null && parsed < options.min) return { valid: false, code: 'min', value: parsed };
        if (options.max != null && parsed > options.max) return { valid: false, code: 'max', value: parsed };
        return { valid: true, code: null, value: parsed };
      }

      function numericDraftState(key, options) {
        var draftKey = key + 'Draft';
        var hasDraft = d[draftKey] !== null && d[draftKey] !== undefined;
        if (!hasDraft) return { hasDraft: false, valid: true, code: null, value: null };
        return Object.assign({ hasDraft: true }, validateNumericDraft(d[draftKey], options));
      }

      function numericFieldsReady(fields) {
        return fields.every(function(field) { return numericDraftState(field.key, field.options).valid; });
      }

      function numericDraftMessage(label, state, options) {
        var values = { label: label, min: formatNumber(options.min), max: formatNumber(options.max) };
        if (state.code === 'integer') return fill(t('stem.ratios.draft_whole_number', 'Enter a whole number for {label}.'), values);
        if (state.code === 'min') return fill(t('stem.ratios.draft_at_least', '{label} must be at least {min}.'), values);
        if (state.code === 'max') return fill(t('stem.ratios.draft_no_more_than', '{label} must be no more than {max}.'), values);
        if (state.code === 'number') return fill(t('stem.ratios.draft_valid_number', 'Enter a valid number for {label}.'), values);
        return fill(t('stem.ratios.draft_value', 'Enter a value for {label}.'), values);
      }

      function numericField(label, value, key, options) {
        options = options || {};
        var draftKey = key + 'Draft';
        var state = numericDraftState(key, options);
        var hasDraft = state.hasDraft;
        var errorId = 'ratio-field-error-' + key;
        return h('label', { className: 'block text-xs font-semibold', key: key },
          h('span', { className: 'block mb-1', style: { color: muted } }, label),
          h('input', {
            type: 'number',
            value: hasDraft ? d[draftKey] : value,
            min: options.min,
            max: options.max,
            step: options.step == null ? 1 : options.step,
            onChange: function(event) {
              var raw = event.target.value;
              var patch = typeof options.editPatch === 'function' ? options.editPatch() : {}; patch[draftKey] = raw;
              var nextState = validateNumericDraft(raw, options);
              if (nextState.valid) patch[key] = nextState.value;
              update(patch);
            },
            onBlur: function(event) {
              // Nothing typed: tabbing through must not freeze the problem-safe default.
              if (!hasDraft) return;
              if (options.preserveInvalid && !validateNumericDraft(event.target.value, options).valid) return;
              var nextValue = finiteNumber(event.target.value, value);
              if (options.integer) nextValue = Math.round(nextValue);
              if (options.min != null) nextValue = Math.max(options.min, nextValue);
              if (options.max != null) nextValue = Math.min(options.max, nextValue);
              var patch = {}; patch[key] = nextValue; patch[draftKey] = null; update(patch);
            },
            className: 'w-full rounded-lg px-3 py-2 text-sm',
            style: Object.assign({ minHeight: 44, minWidth: 0 }, inputStyle),
            'aria-label': label,
            'aria-invalid': hasDraft && !state.valid ? 'true' : undefined,
            'aria-describedby': hasDraft && !state.valid ? errorId : undefined,
            'data-draft-valid': hasDraft ? String(state.valid) : undefined
          }),
          hasDraft && !state.valid && h('span', {
            id: errorId,
            role: 'status',
            'aria-live': 'polite',
            className: 'block mt-1 text-xs font-semibold',
            style: { color: warning }
          }, numericDraftMessage(label, state, options))
        );
      }

      var srOnlyStyle = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };
      var buttonStyle = { background: soft, color: text, border: '1px solid ' + border, minHeight: 44 };

      // ---- Predict first in the exploration workspaces ----
      // With the toggle on, the student commits a prediction before the model
      // shows the result. Changing the inputs starts a fresh prediction.
      var explorePredictFirst = !!d.explorePredictFirst;
      var explorePredictions = plainObject(d.explorePredictions);
      function explorePrediction(modeId, key) {
        var entry = explorePredictions[modeId];
        return entry && entry.key === key ? entry : null;
      }
      function setExplorePrediction(modeId, entry) {
        update(function(current) {
          var all = Object.assign({}, plainObject(current.explorePredictions));
          all[modeId] = entry;
          return { explorePredictions: all };
        });
      }
      function predictFirstToggle() {
        return h('label', { className: 'flex items-center gap-2 text-sm font-bold', style: { minHeight: 44 } },
          h('input', { type: 'checkbox', checked: explorePredictFirst, 'data-explore-predict-toggle': true, onChange: function(event) { update({ explorePredictFirst: event.target.checked }); }, style: { width: 20, height: 20, accentColor: accent } }),
          t('stem.ratios.explore_predict_first', 'Predict before the model shows the result'));
      }
      // A number prediction. Returns { revealed, node }.
      function numberPredictGate(modeId, key, question, target, diagnose) {
        if (!explorePredictFirst) return { revealed: true, node: null };
        var entry = explorePrediction(modeId, key);
        var checked = !!(entry && entry.checked);
        var draft = entry && entry.value != null ? String(entry.value) : '';
        var inputId = 'ratio-explore-predict-' + modeId;
        var feedback = null;
        if (checked) {
          var typed = parseNumberWithFraction(draft);
          var values = { p: draft, v: formatNumber(target, 4) };
          if (typed == null) feedback = fill(t('stem.ratios.explore_shown_no_prediction', 'Shown without a prediction. The model gives {v}.'), values);
          else if (nearlyEqual(typed, target)) feedback = fill(t('stem.ratios.explore_prediction_exact', 'Your prediction, {p}, matches the model exactly.'), values);
          else {
            var named = typeof diagnose === 'function' ? diagnose(typed) : null;
            feedback = (Math.abs(typed - target) <= 0.1 * Math.abs(target)
              ? fill(t('stem.ratios.explore_prediction_close', 'Close: your prediction, {p}, is within 10% of {v}.'), values)
              : fill(t('stem.ratios.explore_prediction_off', 'Your prediction was {p}; the model shows {v}.'), values)) + (named ? ' ' + named : '');
          }
        }
        var node = h('fieldset', { className: 'rounded-lg p-3 space-y-2', 'data-explore-prediction': modeId, style: { background: soft, border: '1px solid ' + border, minWidth: 0 } },
          h('legend', { className: 'px-1 text-sm font-bold' }, question),
          !checked && h('div', { className: 'flex flex-wrap items-end gap-2' },
            h('label', { htmlFor: inputId, className: 'text-xs font-semibold', style: { color: muted } }, t('stem.ratios.explore_your_prediction', 'Your prediction'),
              h('input', { id: inputId, type: 'text', inputMode: 'decimal', value: draft, onChange: function(event) { setExplorePrediction(modeId, { key: key, value: event.target.value, checked: false }); }, className: 'block w-32 rounded-lg px-3 py-2 text-sm', style: Object.assign({ minHeight: 44 }, inputStyle) })),
            h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-60', style: buttonStyle, disabled: parseNumberWithFraction(draft) == null, onClick: function() { setExplorePrediction(modeId, { key: key, value: draft, checked: true }); announce(t('stem.ratios.explore_prediction_locked', 'Prediction locked in. The model now shows the result.')); } }, t('stem.ratios.explore_check_prediction', 'Check my prediction')),
            h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm', style: buttonStyle, onClick: function() { setExplorePrediction(modeId, { key: key, value: null, checked: true }); } }, t('stem.ratios.explore_show_without', 'Show without predicting'))
          ),
          checked && h('p', { role: 'status', 'aria-live': 'polite', className: 'text-sm font-semibold', 'data-explore-prediction-feedback': modeId }, feedback)
        );
        return { revealed: checked, node: node };
      }
      // A choice prediction (yes / no). Returns { revealed, node }.
      function choicePredictGate(modeId, key, question, options, correct, whyText) {
        if (!explorePredictFirst) return { revealed: true, node: null };
        var entry = explorePrediction(modeId, key);
        var checked = !!(entry && entry.checked);
        var choice = entry ? entry.value : null;
        var feedback = !checked ? null : choice == null ? t('stem.ratios.explore_shown_no_choice', 'Shown without a prediction.')
          : choice === correct ? t('stem.ratios.explore_choice_right', 'Your prediction matches the evidence.') + ' ' + whyText
          : t('stem.ratios.explore_choice_wrong', 'Your prediction does not match the evidence.') + ' ' + whyText;
        var node = h('fieldset', { className: 'rounded-lg p-3 space-y-2', 'data-explore-prediction': modeId, style: { background: soft, border: '1px solid ' + border, minWidth: 0 } },
          h('legend', { className: 'px-1 text-sm font-bold' }, question),
          !checked && h('div', { className: 'flex flex-wrap gap-2' }, options.map(function(option) {
            return h('label', { key: option.id, className: 'rounded-lg px-3 py-2 flex items-center gap-2 text-sm', style: buttonStyle },
              h('input', { type: 'radio', name: 'ratio-explore-choice-' + modeId, value: option.id, checked: choice === option.id, onChange: function() { setExplorePrediction(modeId, { key: key, value: option.id, checked: false }); }, style: { accentColor: accent } }), option.label);
          })),
          !checked && h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-60', style: buttonStyle, disabled: !choice, onClick: function() { setExplorePrediction(modeId, { key: key, value: choice, checked: true }); announce(t('stem.ratios.explore_prediction_locked', 'Prediction locked in. The model now shows the result.')); } }, t('stem.ratios.explore_check_prediction', 'Check my prediction')),
            h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm', style: buttonStyle, onClick: function() { setExplorePrediction(modeId, { key: key, value: null, checked: true }); } }, t('stem.ratios.explore_show_without', 'Show without predicting'))
          ),
          checked && h('p', { role: 'status', 'aria-live': 'polite', className: 'text-sm font-semibold', 'data-explore-prediction-feedback': modeId }, feedback)
        );
        return { revealed: checked, node: node };
      }

      // ---- Tape diagram: rows of equal units (part : part : whole) ----
      // Phone tape: 1 unit to 1 px at the box's width (120-244 px at a 320 viewport), each label on its own line over a
      // full-width bar. Row and unit text is placed from what is shown only, so a ? takes the same room whatever it stands for.
      function phoneTapeSvg(W, spec, maxUnits, boxes, colors, titleId, descId, description) {
        var charW = 7.2, lineH = 15, chars = Math.max(8, Math.floor((W - 4) / charW)), unitWidth = (W - 4) / maxUnits, y = 0;
        var showUnit = !!spec.unitText && String(spec.unitText).length * charW + 2 <= unitWidth;
        var parts = spec.rows.map(function(row, rowIndex) {
          var color = colors[rowIndex % colors.length], units = Math.max(0, row.units);
          var wrapped = wrapTapeLabel(row.label, chars, 2), lines = wrapped.lines, rowText = row.text ? String(row.text) : '';
          var inline = !!rowText && (lines[lines.length - 1].length + rowText.length) * charW + 10 <= W;
          var textLines = rowText && !inline ? wrapTapeLabel(rowText, chars, 3).lines : [];
          var top = y, barY = top + (lines.length + textLines.length) * lineH + 3;
          y = barY + 28 + 10;
          return h('g', { key: rowIndex, 'aria-hidden': 'true' },
            h('text', { x: 2, y: top + 12, fill: text, fontSize: 12, fontWeight: 700, 'data-tape-label': rowIndex, 'data-truncated': wrapped.truncated ? 'true' : undefined },
              lines.map(function(line, lineIndex) { return h('tspan', { key: lineIndex, x: 2, dy: lineIndex ? lineH : 0 }, line); })),
            inline && h('text', { x: W - 2, y: top + 12 + (lines.length - 1) * lineH, textAnchor: 'end', fill: text, fontSize: 12, fontWeight: 700 }, rowText),
            textLines.map(function(line, i) { return h('text', { key: 't' + i, x: 2, y: top + 12 + (lines.length + i) * lineH, fill: text, fontSize: 12, fontWeight: 700 }, line); }),
            boxes ? Array.apply(null, Array(units)).map(function(_, index) {
              return h('g', { key: index },
                h('rect', { x: 2 + index * unitWidth, y: barY, width: unitWidth, height: 28, fill: soft, stroke: color, strokeWidth: unitWidth < 9 ? 1 : 2 }),
                showUnit && h('text', { x: 2 + index * unitWidth + unitWidth / 2, y: barY + 19, textAnchor: 'middle', fill: text, fontSize: 12, fontWeight: 700 }, spec.unitText));
            }) : h('rect', { x: 2, y: barY, width: unitWidth * units, height: 28, fill: soft, stroke: color, strokeWidth: 2 }));
        });
        var totalLines = spec.totalText ? wrapTapeLabel(spec.totalText, chars, 4).lines : [], totalY = y;
        y += totalLines.length * lineH;
        return h('svg', { viewBox: '0 0 ' + W + ' ' + Math.max(1, y + 2), role: 'img', 'aria-labelledby': titleId + ' ' + descId, style: { width: '100%', maxWidth: W, display: 'block' } },
          h('title', { id: titleId }, spec.title || t('stem.ratios.tape_title', 'Tape diagram')),
          h('desc', { id: descId }, description),
          parts,
          totalLines.map(function(line, i) { return h('text', { key: 'total' + i, x: 2, y: totalY + 12 + i * lineH, fill: text, fontSize: 12, fontWeight: 700, 'aria-hidden': 'true' }, line); }));
      }
      function renderTape(spec, idBase) {
        if (!spec || !Array.isArray(spec.rows) || !spec.rows.length) return null;
        var maxUnits = Math.max.apply(null, spec.rows.map(function(row) { return Math.max(1, row.units); }));
        var boxes = maxUnits <= 24;
        // Labels wrap to two lines of 14 characters; the label column is only
        // as wide as the longest line, so short labels leave the bars more room.
        var wrapped = spec.rows.map(function(row) { return wrapTapeLabel(row.label, 14, 2); });
        var longestLine = Math.max.apply(null, wrapped.map(function(w) { return Math.max.apply(null, w.lines.map(function(line) { return line.length; })); }));
        var barStart = clamp(Math.round(longestLine * 7) + 10, 56, 110);
        var tapePhone = phoneWidthNow(), tapeW = 500;
        var unitWidth = (tapeW - 20 - barStart) / maxUnits;
        var rowHeight = 46, height = spec.rows.length * rowHeight + (spec.totalText ? 30 : 10);
        var colors = [accentStrong, success, warning];
        var titleId = idBase + '-title', descId = idBase + '-desc';
        var description = spec.rows.map(function(row) {
          var template = row.units === 1
            ? (row.text ? t('stem.ratios.tape_row_one_with_total', '{label}: 1 unit, worth {text}.') : t('stem.ratios.tape_row_one', '{label}: 1 unit.'))
            : (row.text ? t('stem.ratios.tape_row_with_total', '{label}: {units} equal units, together {text}.') : t('stem.ratios.tape_row', '{label}: {units} equal units.'));
          return fill(template, { label: row.label, units: num(row.units), text: row.text });
        }).join(' ');
        if (spec.unitText === '?') description += ' ' + t('stem.ratios.tape_unit_unknown', 'The value of one unit is the unknown to find.');
        else if (spec.unitText) description += ' ' + fill(t('stem.ratios.tape_unit_known', 'Each unit is worth {unit}.'), { unit: spec.unitText });
        if (spec.totalText) description += ' ' + spec.totalText + '.';
        return h('figure', { className: 'space-y-2', 'data-ratio-tape': idBase },
          tapePhone ? h(fitWidthComponent(React), { fallback: 260, render: function(boxWidth) { return phoneTapeSvg(Math.max(120, Math.min(420, boxWidth)), spec, maxUnits, boxes, colors, titleId, descId, description); } }) :
          h('svg', { viewBox: '0 0 ' + tapeW + ' ' + height, role: 'img', 'aria-labelledby': titleId + ' ' + descId, style: { width: '100%', maxWidth: 560, display: 'block' } },
            h('title', { id: titleId }, spec.title || t('stem.ratios.tape_title', 'Tape diagram')),
            h('desc', { id: descId }, description),
            spec.rows.map(function(row, rowIndex) {
              var y = 8 + rowIndex * rowHeight, color = colors[rowIndex % colors.length], units = Math.max(0, row.units);
              var labelLines = wrapped[rowIndex].lines;
              return h('g', { key: rowIndex, 'aria-hidden': 'true' },
                h('text', { x: 4, y: y + (labelLines.length > 1 ? 14 : 22), fill: text, fontSize: 12, fontWeight: 700, 'data-tape-label': rowIndex, 'data-truncated': wrapped[rowIndex].truncated ? 'true' : undefined },
                  labelLines.map(function(line, lineIndex) { return h('tspan', { key: lineIndex, x: 4, dy: lineIndex ? 14 : 0 }, line); })),
                boxes ? Array.apply(null, Array(units)).map(function(_, index) {
                  return h('g', { key: index },
                    h('rect', { x: barStart + index * unitWidth, y: y, width: unitWidth, height: 32, fill: soft, stroke: color, strokeWidth: 2 }),
                    unitWidth >= 22 && spec.unitText && h('text', { x: barStart + index * unitWidth + unitWidth / 2, y: y + 21, textAnchor: 'middle', fill: text, fontSize: 11, fontWeight: 700 }, spec.unitText));
                }) : h('rect', { x: barStart, y: y, width: unitWidth * units, height: 32, fill: soft, stroke: color, strokeWidth: 2 }),
                row.text && h('text', { x: Math.min(tapeW - 8, barStart + 4 + unitWidth * units), y: y + 22, fill: text, fontSize: 12, fontWeight: 700, textAnchor: barStart + unitWidth * units > tapeW - 40 ? 'end' : 'start' }, row.text));
            }),
            spec.totalText && h('text', { x: barStart, y: height - 8, fill: text, fontSize: 12, fontWeight: 700, 'aria-hidden': 'true' }, spec.totalText)
          ),
          !boxes && h('p', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.tape_too_many_units', 'There are too many units to draw one by one, so each part is drawn as one bar of the right length.'))
        );
      }

      // ---- A small first-quadrant graph for constant-of-proportionality problems ----
      function renderMiniGraph(spec, idBase) {
        if (!spec || !Array.isArray(spec.points) || !spec.points.length) return null;
        var maxX = positiveAxisMaximum(spec.points.map(function(pt) { return pt[0]; })) * 1.25;
        var maxY = positiveAxisMaximum(spec.points.map(function(pt) { return pt[1]; })) * 1.25;
        function sx(value) { return 46 + value / maxX * 240; }
        function sy(value) { return 180 - value / maxY * 150; }
        var ticks = [0, 0.25, 0.5, 0.75, 1];
        var pointsText = spec.points.map(function(pt) { return '(' + num(pt[0]) + ', ' + num(pt[1]) + ')'; }).join(', ');
        var last = spec.points[spec.points.length - 1];
        var slope = last[0] ? (last[1] - spec.points[0][1]) / (last[0] - spec.points[0][0]) : 0;
        var x0 = spec.points[0][0], y0 = spec.points[0][1];
        var endX = maxX, endY = y0 + slope * (endX - x0);
        if (endY > maxY) { endY = maxY; endX = x0 + (maxY - y0) / slope; }
        var titleId = idBase + '-title', descId = idBase + '-desc';
        return h('figure', { className: 'space-y-2', 'data-ratio-mini-graph': idBase },
          h('svg', { viewBox: '0 0 300 220', role: 'img', 'aria-labelledby': titleId + ' ' + descId, style: { width: '100%', maxWidth: 360, display: 'block' } },
            h('title', { id: titleId }, t('stem.ratios.mini_graph_title', 'Graph of the relationship')),
            h('desc', { id: descId }, fill(t('stem.ratios.mini_graph_desc', 'A straight line through the points {points}. The x-axis shows {x} and the y-axis shows {y}.'), { points: pointsText, x: spec.xLabel, y: spec.yLabel })),
            ticks.map(function(f, index) {
              return h('g', { key: index, 'aria-hidden': 'true' },
                h('line', { x1: sx(f * maxX), y1: 30, x2: sx(f * maxX), y2: 180, stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                h('line', { x1: 46, y1: sy(f * maxY), x2: 286, y2: sy(f * maxY), stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                h('text', { x: sx(f * maxX), y: 196, textAnchor: 'middle', fill: muted, fontSize: 9 }, formatSignificantNumber(f * maxX, 3)),
                h('text', { x: 40, y: sy(f * maxY) + 3, textAnchor: 'end', fill: muted, fontSize: 9 }, formatSignificantNumber(f * maxY, 3)));
            }),
            h('line', { x1: 46, y1: 180, x2: 290, y2: 180, stroke: text, strokeWidth: 2, 'aria-hidden': 'true' }),
            h('line', { x1: 46, y1: 180, x2: 46, y2: 24, stroke: text, strokeWidth: 2, 'aria-hidden': 'true' }),
            h('text', { x: 290, y: 214, textAnchor: 'end', fill: muted, fontSize: 10, fontWeight: 700, 'aria-hidden': 'true' }, spec.xLabel),
            h('text', { x: 6, y: 16, fill: muted, fontSize: 10, fontWeight: 700, 'aria-hidden': 'true' }, spec.yLabel),
            spec.line !== false && slope > 0 && h('line', { x1: sx(x0), y1: sy(y0), x2: sx(endX), y2: sy(endY), stroke: success, strokeWidth: 3, 'aria-hidden': 'true' }),
            spec.points.map(function(pt, index) {
              return h('g', { key: index, 'aria-hidden': 'true' },
                h('circle', { cx: sx(pt[0]), cy: sy(pt[1]), r: 5, fill: accentStrong, stroke: panel, strokeWidth: 2 }),
                h('text', { x: sx(pt[0]) + 7, y: sy(pt[1]) - 7, fill: text, fontSize: 10, fontWeight: 700 }, '(' + num(pt[0]) + ', ' + num(pt[1]) + ')'));
            })
          ),
          h('table', { style: srOnlyStyle },
            h('caption', null, t('stem.ratios.mini_graph_table', 'Points on the graph')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, spec.xLabel), h('th', { scope: 'col' }, spec.yLabel))),
            h('tbody', null, spec.points.map(function(pt, index) { return h('tr', { key: index }, h('td', null, num(pt[0])), h('td', null, num(pt[1]))); }))
          )
        );
      }

      function renderRatioTable() {
        var ratioFields = [
          { key: 'ratioA', options: { min: 1, max: 100, integer: true } },
          { key: 'ratioB', options: { min: 1, max: 100, integer: true } },
          { key: 'ratioFactor', options: { min: 1, max: 12, integer: true } }
        ];
        var ratioReady = numericFieldsReady(ratioFields);
        var first = clamp(Math.round(finiteNumber(d.ratioA, exploreDefaults[0])), 1, 100);
        var second = clamp(Math.round(finiteNumber(d.ratioB, exploreDefaults[1])), 1, 100);
        var selectedFactor = clamp(Math.round(finiteNumber(d.ratioFactor, exploreDefaults[2])), 1, 12);
        var divisor = gcd(first, second);
        var rows = ratioTableRows(first, second, selectedFactor);
        var target = second * selectedFactor;
        var gate = ratioReady ? numberPredictGate('ratioTable', first + ':' + second + 'x' + selectedFactor,
          fill(t('stem.ratios.predict_ratio_question', 'Predict: what is the second quantity after scaling {a}:{b} by {f}?'), { a: first, b: second, f: selectedFactor }), target,
          function(typed) { return nearlyEqual(typed, second + first * (selectedFactor - 1)) ? t('stem.ratios.predict_ratio_additive', 'Your prediction adds the same amount to both quantities. Scaling multiplies both by the same factor.') : null; })
          : { revealed: true, node: null };
        var revealed = gate.revealed;
        var tapeTotalOptions = { min: 0, max: 1000000, step: 'any' };
        var tapeReady = ratioReady && numericFieldsReady([{ key: 'tapeTotal', options: tapeTotalOptions }]);
        var tapeTotal = clamp(finiteNumber(d.tapeTotal, (first + second) * selectedFactor), 0, 1000000);
        // The tape uses the simplest form: 12:18 is 2 units to 3 units.
        var tape = tapeReady ? tapeModel(first / divisor, second / divisor, tapeTotal) : null;
        function rowLabel(row) {
          if (row.kind === 'divide') return fill(t('stem.ratios.row_divide', '÷ {f}'), { f: row.factor });
          if (row.kind === 'unitFirst') return t('stem.ratios.row_unit_first', 'Unit rate: 1 of the first quantity');
          if (row.kind === 'unitSecond') return t('stem.ratios.row_unit_second', 'Unit rate: 1 of the second quantity');
          return fill(row.selected ? t('stem.ratios.row_multiply_selected', '× {f} (selected)') : t('stem.ratios.row_multiply', '× {f}'), { f: row.factor });
        }
        return h('div', { className: 'space-y-4' },
          predictFirstToggle(),
          h('div', { className: 'grid lg:grid-cols-[minmax(230px,0.8fr)_minmax(300px,1.2fr)] gap-4' },
            h('div', { className: 'rounded-xl p-4 space-y-3', style: cardStyle },
              h('h3', { className: 'font-bold' }, t('stem.ratios.build_an_equivalent_ratio_family', "Build an equivalent-ratio family")),
              h('div', { className: 'grid grid-cols-2 gap-3' },
                numericField(t('stem.ratios.first_quantity', "First quantity"), first, 'ratioA', { min: 1, max: 100, integer: true }),
                numericField(t('stem.ratios.second_quantity', "Second quantity"), second, 'ratioB', { min: 1, max: 100, integer: true })
              ),
              numericField(t('stem.ratios.scale_factor', "Scale factor"), selectedFactor, 'ratioFactor', { min: 1, max: 12, integer: true }),
              gate.node,
              ratioReady ? h('div', { className: 'rounded-lg p-3 text-center', style: { background: soft, border: '1px solid ' + border } },
                h('div', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.scaled_ratio', "Scaled ratio")),
                h('div', { className: 'text-2xl font-black', style: { color: accent } }, revealed ? (first * selectedFactor) + ':' + (second * selectedFactor) : (first * selectedFactor) + ':?'),
                h('div', { className: 'text-xs mt-1', style: { color: muted } }, fill(t('stem.ratios.scaled_ratio_work', '{a} × {f} and {b} × {f}'), { a: first, b: second, f: selectedFactor }))
              ) : h('div', { role: 'status', className: 'rounded-lg p-3 text-sm font-semibold', style: { background: soft, color: warning, border: '1px solid ' + warning } }, t('stem.ratios.finish_valid_inputs', "Finish the highlighted inputs to update the ratio model.")),
              ratioReady && h('p', { className: 'text-sm' }, fill(t('stem.ratios.simplest_form_sentence', 'Simplest form: {ratio}. Divide both quantities by {g}.'), { ratio: (first / divisor) + ':' + (second / divisor), g: divisor }))
            ),
            h('div', { className: 'rounded-xl p-4 overflow-x-auto', tabIndex: 0, role: 'region', 'aria-label': fill(t('stem.ratios.equivalent_ratio_table_caption', 'Equivalent ratio table for {ratio}'), { ratio: first + ':' + second }), style: cardStyle },
              ratioReady ? h(React.Fragment, null,
                h('table', { className: 'w-full text-sm border-collapse', 'data-ratio-table': true },
                h('caption', { className: 'text-left font-bold mb-3' }, fill(t('stem.ratios.equivalent_ratio_table_caption', 'Equivalent ratio table for {ratio}'), { ratio: first + ':' + second })),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'p-2 text-left', style: { borderBottom: '2px solid ' + border } }, t('stem.ratios.row_operation', 'Scale step')),
                  h('th', { scope: 'col', className: 'p-2 text-right', style: { borderBottom: '2px solid ' + border } }, t('stem.ratios.first_quantity', "First quantity")),
                  h('th', { scope: 'col', className: 'p-2 text-right', style: { borderBottom: '2px solid ' + border } }, t('stem.ratios.second_quantity', "Second quantity"))
                )),
                h('tbody', null, rows.map(function(row, index) {
                  var active = !!row.selected;
                  var unitRow = row.kind === 'unitFirst' || row.kind === 'unitSecond';
                  var hide = active && !revealed;
                  return h('tr', { key: row.kind + '-' + index, 'data-ratio-row': row.kind, style: { background: active ? (isContrast ? '#000000' : (isDark ? '#312e81' : '#eef2ff')) : 'transparent', color: text, outline: active && isContrast ? '2px solid ' + accent : undefined, outlineOffset: active && isContrast ? -2 : undefined, borderTop: unitRow && (index === 0 || (rows[index - 1].kind !== 'unitFirst' && rows[index - 1].kind !== 'unitSecond')) ? '2px solid ' + border : undefined } },
                    h('th', { scope: 'row', className: 'p-2 text-left' + (unitRow ? ' italic' : '') }, rowLabel(row)),
                    h('td', { className: 'p-2 text-right font-mono' }, formatNumber(row.first, 4)),
                    h('td', { className: 'p-2 text-right font-mono' }, hide ? '?' : formatNumber(row.second, 4))
                  );
                }))
                ),
                h('p', { className: 'text-xs mt-3', style: { color: muted } }, t('stem.ratios.ratio_table_note', 'Equivalent ratios preserve the multiplicative relationship: both columns use the same scale factor. Rows above × 1 scale down by dividing both quantities; the unit-rate rows show the amount for 1.'))
              ) : h('p', { role: 'status', className: 'p-4 text-center text-sm font-semibold', style: { color: warning } }, t('stem.ratios.ratio_table_waiting_for_valid_inputs', "The equivalent-ratio table is waiting for valid whole-number inputs."))
            )
          ),
          h('section', { className: 'rounded-xl p-4 space-y-3', style: cardStyle, 'aria-labelledby': 'ratio-tape-heading', 'data-ratio-tape-explorer': true },
            h('h3', { id: 'ratio-tape-heading', className: 'font-bold' }, t('stem.ratios.tape_heading', 'Tape diagram: part, part and whole')),
            h('p', { className: 'text-sm', style: { color: muted } }, t('stem.ratios.tape_intro', 'For a mixture, the ratio splits the whole into equal units. Enter the whole amount to see what one unit and each part are worth.')),
            ratioReady && numericField(t('stem.ratios.tape_whole_amount', 'Whole amount'), tapeTotal, 'tapeTotal', tapeTotalOptions),
            tape ? h(React.Fragment, null,
              divisor > 1 && h('p', { className: 'text-sm' }, fill(t('stem.ratios.tape_simplified_note', 'The ratio {ratio} simplifies to {simple}, so the tape uses {a} + {b} equal units.'), { ratio: first + ':' + second, simple: tape.a + ':' + tape.b, a: tape.a, b: tape.b })),
              renderTape({ title: fill(t('stem.ratios.tape_explorer_title', 'Tape diagram for the ratio {ratio}'), { ratio: first + ':' + second }), rows: [{ label: t('stem.ratios.tape_first_part', 'First'), units: tape.a, text: formatNumber(tape.partA, 4) }, { label: t('stem.ratios.tape_second_part', 'Second'), units: tape.b, text: formatNumber(tape.partB, 4) }], unitText: formatNumber(tape.unit, 3), totalText: fill(t('stem.ratios.tape_whole_is', 'Whole: {total}'), { total: formatNumber(tape.total, 4) }) }, 'ratio-tape-explorer'),
              h('p', { role: 'status', 'aria-live': 'polite', className: 'text-sm font-semibold', 'data-tape-summary': true }, fill(t('stem.ratios.tape_summary', '{total} split into {units} equal units is {unit} per unit, so the first part is {a} and the second part is {b}.'), { total: formatNumber(tape.total, 4), units: tape.units, unit: formatNumber(tape.unit, 4), a: formatNumber(tape.partA, 4), b: formatNumber(tape.partB, 4) }))
            ) : h('p', { role: 'status', className: 'text-sm font-semibold', style: { color: warning } }, t('stem.ratios.tape_waiting', 'The tape diagram is waiting for valid inputs.'))
          )
        );
      }

      function renderNumberLine() {
        var lineFields = [
          { key: 'lineTopUnit', options: { min: 0.1, max: MAX_NUMBER_LINE_UNIT } },
          { key: 'lineBottomUnit', options: { min: 0.1, max: MAX_NUMBER_LINE_UNIT } },
          { key: 'lineSteps', options: { min: 2, max: 8, integer: true } }
        ];
        var lineReady = numericFieldsReady(lineFields);
        var topUnit = clamp(finiteNumber(d.lineTopUnit, exploreDefaults[0]), 0.1, MAX_NUMBER_LINE_UNIT);
        var bottomUnit = clamp(finiteNumber(d.lineBottomUnit, exploreDefaults[1]), 0.1, MAX_NUMBER_LINE_UNIT);
        var steps = clamp(Math.round(finiteNumber(d.lineSteps, exploreDefaults[2])), 2, 8);
        var ticks = [];
        for (var i = 0; i <= steps; i++) ticks.push(i);
        var target = steps * bottomUnit;
        var gate = lineReady ? numberPredictGate('numberLine', [topUnit, bottomUnit, steps].join('|'),
          fill(t('stem.ratios.predict_line_question', 'Predict: which bottom value lines up with {top} on the top line?'), { top: formatNumber(steps * topUnit) }), target,
          function(typed) { return nearlyEqual(typed, bottomUnit + (steps * topUnit - topUnit)) ? t('stem.ratios.predict_line_additive', 'Your prediction shifts the bottom line by the same amount as the top line. Both lines grow by the same factor instead.') : null; })
          : { revealed: true, node: null };
        var revealed = gate.revealed;
        // A 500-unit drawing on a 320 px phone read at 5.4 px. Phones get a 260-unit drawing with names above and below
        // the lines; labels that would touch take turns on two rows, measured only from what is shown (never hidden values).
        var linePhone = phoneWidthNow();
        var topLabel = function(tick) { return formatNumber(tick * topUnit); };
        var bottomLabel = function(tick) { return revealed || tick <= 1 ? formatNumber(tick * bottomUnit) : (tick === steps ? '?' : ''); };
        var drawExplorerLine = function(boxWidth) {
          var W = linePhone ? Math.max(140, Math.min(325, boxWidth)) : 500;
          var lineX0 = linePhone ? 20 : 55, lineSpan = linePhone ? W - 46 : 410, lineX1 = lineX0 + lineSpan;
          var rowsFor = function(label) {
            if (!linePhone) return 1;
            var longest = Math.max.apply(null, ticks.map(function(tick) { return String(label(tick)).length; }));
            return Math.max(1, Math.min(5, Math.ceil((longest * 7 + 6) / (lineSpan / steps))));
          };
          var topRows = rowsFor(topLabel), bottomRows = rowsFor(bottomLabel), rowGap = 17;
          var lineTopY = linePhone ? 30 + topRows * rowGap : 60, lineBottomY = linePhone ? lineTopY + 80 : 140, lineFont = linePhone ? '12px' : '11px';
          var bottomNameY = lineBottomY + 24 + (bottomRows - 1) * rowGap + 20;
          return h('svg', {
            viewBox: linePhone ? '0 0 ' + W + ' ' + (bottomNameY + 4) : '0 0 500 190',
            className: linePhone ? 'w-full' : 'w-full min-h-[190px]',
            style: linePhone ? { maxWidth: 325, display: 'block', margin: '0 auto' } : undefined,
            role: 'img',
            'aria-labelledby': 'ratio-line-title ratio-line-desc'
          },
                h('title', { id: 'ratio-line-title' }, t('stem.ratios.double_number_line', "Double number line")),
                h('desc', { id: 'ratio-line-desc' }, revealed
                  ? fill(t('stem.ratios.line_desc', 'The top line increases by {top} per interval and the bottom line increases by {bottom} per interval for {steps} intervals.'), { top: formatNumber(topUnit), bottom: formatNumber(bottomUnit), steps: steps })
                  : fill(t('stem.ratios.line_desc_hidden', 'The top line increases by {top} per interval for {steps} intervals. The bottom line shows 0 and {bottom}; the other bottom values are hidden until you check your prediction.'), { top: formatNumber(topUnit), bottom: formatNumber(bottomUnit), steps: steps })),
                h('text', { x: linePhone ? 4 : 12, y: linePhone ? 14 : 55, style: { fill: text, fontSize: '12px', fontWeight: 'bold' } }, t('stem.ratios.top', 'Top')),
                h('text', { x: linePhone ? 4 : 12, y: linePhone ? bottomNameY : 135, style: { fill: text, fontSize: '12px', fontWeight: 'bold' } }, t('stem.ratios.bottom', "Bottom")),
                h('line', { x1: lineX0, y1: lineTopY, x2: lineX1, y2: lineTopY, stroke: accent, strokeWidth: 4, strokeLinecap: 'round' }),
                h('line', { x1: lineX0, y1: lineBottomY, x2: lineX1, y2: lineBottomY, stroke: success, strokeWidth: 4, strokeLinecap: 'round' }),
                ticks.map(function(tick) {
                  var x = lineX0 + tick * (lineSpan / steps);
                  var topRow = tick % topRows, bottomRow = tick % bottomRows;
                  var topY = linePhone ? lineTopY - 14 - topRow * rowGap : 42;
                  var bottomY = linePhone ? lineBottomY + 24 + bottomRow * rowGap : 170;
                  var halo = linePhone ? { paintOrder: 'stroke', stroke: panel, strokeWidth: 3 } : {};
                  return h('g', { key: 'tick-' + tick },
                    h('line', { x1: x, y1: lineTopY - 9, x2: x, y2: lineTopY + 9, stroke: text, strokeWidth: 2 }),
                    h('line', { x1: x, y1: lineBottomY - 9, x2: x, y2: lineBottomY + 9, stroke: text, strokeWidth: 2 }),
                    h('line', { x1: x, y1: lineTopY + 10, x2: x, y2: lineBottomY - 10, stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                    topRow > 0 && h('line', { x1: x, y1: topY + 3, x2: x, y2: lineTopY - 9, stroke: border, strokeWidth: 1 }),
                    bottomRow > 0 && bottomLabel(tick) && h('line', { x1: x, y1: lineBottomY + 9, x2: x, y2: bottomY - 11, stroke: border, strokeWidth: 1 }),
                    h('text', Object.assign({ x: x, y: topY, textAnchor: 'middle', style: Object.assign({ fill: text, fontSize: lineFont }, halo) }), topLabel(tick)),
                    h('text', Object.assign({ x: x, y: bottomY, textAnchor: 'middle', style: Object.assign({ fill: text, fontSize: lineFont }, halo) }), bottomLabel(tick))
                  );
                }));
        };
        return h('div', { className: 'space-y-4' },
          predictFirstToggle(),
          h('div', { className: "grid lg:grid-cols-[250px_1fr] gap-4" },
            h('div', { className: 'rounded-xl p-4 space-y-3', style: cardStyle },
              h('h3', { className: 'font-bold' }, t('stem.ratios.set_one_aligned_interval', "Set one aligned interval")),
              numericField(t('stem.ratios.top_line_value_per_interval', "Top-line value per interval"), topUnit, 'lineTopUnit', { min: 0.1, max: MAX_NUMBER_LINE_UNIT, step: 0.1 }),
              numericField(t('stem.ratios.bottom_line_value_per_interval', "Bottom-line value per interval"), bottomUnit, 'lineBottomUnit', { min: 0.1, max: MAX_NUMBER_LINE_UNIT, step: 0.1 }),
              numericField(t('stem.ratios.number_of_intervals', "Number of intervals"), steps, 'lineSteps', { min: 2, max: 8, integer: true }),
              h('div', { className: 'rounded-lg p-3 text-sm', style: { background: soft, border: '1px solid ' + border } },
                lineReady ? fill(t('stem.ratios.unit_relationship_sentence', 'Unit relationship: 1 top unit corresponds to {v} bottom units.'), { v: formatNumber(bottomUnit / topUnit) }) : h('span', { role: 'status', style: { color: warning } }, t('stem.ratios.finish_valid_inputs', "Finish the highlighted inputs to update the ratio model."))
              ),
              h('p', { className: 'text-xs', role: 'note', style: { color: muted } }, t('stem.ratios.number_line_learning_range', "Interval values range from 0.1 to 1,000; use 2 to 8 whole-number intervals.")),
              gate.node
            ),
            h('div', { className: 'rounded-xl p-3 sm:p-4', style: cardStyle },
              lineReady ? h(React.Fragment, null, linePhone ? h(fitWidthComponent(React), { fallback: 260, render: drawExplorerLine }) : drawExplorerLine(0),
              h('p', { className: 'text-xs text-center', style: { color: muted } }, t('stem.ratios.line_guides_note', 'Each vertical guide connects values produced by the same scale factor.'))) : h('div', { role: 'status', className: 'min-h-[190px] flex items-center justify-center p-4 text-center text-sm font-semibold', style: { color: warning } }, t('stem.ratios.double_number_line_waiting', "The double number line is waiting for valid interval values."))
            )
          )
        );
      }

      function renderUnitRates() {
        function resetPrediction() { return { unitPredictionChoice: null, unitPredictionChecked: null }; }
        var amountOptions = { min: 0, max: MAX_UNIT_RATE_VALUE, step: 'any', preserveInvalid: true, editPatch: resetPrediction };
        var costOptions = { min: 0, max: MAX_UNIT_RATE_VALUE, step: 'any', preserveInvalid: true, editPatch: resetPrediction };
        var quantityOptions = { min: 0.01, max: MAX_UNIT_RATE_VALUE, step: 'any', preserveInvalid: true };
        var optionAReady = numericFieldsReady([{ key: 'amountA', options: amountOptions }, { key: 'costA', options: costOptions }]);
        var optionBReady = numericFieldsReady([{ key: 'amountB', options: amountOptions }, { key: 'costB', options: costOptions }]);
        var amountA = clamp(finiteNumber(d.amountA, exploreDefaults[0]), 0, MAX_UNIT_RATE_VALUE);
        var costA = clamp(finiteNumber(d.costA, exploreDefaults[1]), 0, MAX_UNIT_RATE_VALUE);
        var amountB = clamp(finiteNumber(d.amountB, exploreDefaults[2]), 0, MAX_UNIT_RATE_VALUE);
        var costB = clamp(finiteNumber(d.costB, exploreDefaults[3]), 0, MAX_UNIT_RATE_VALUE);
        var quantity = clamp(finiteNumber(d.unitCompareQuantity, 1), 0.01, MAX_UNIT_RATE_VALUE);
        var baseModel = buildUnitComparison(amountA, costA, amountB, costB, 1);
        var ready = optionAReady && optionBReady && baseModel.ok;
        var model = buildUnitComparison(amountA, costA, amountB, costB, quantity);
        var modelReady = ready && numericDraftState('unitCompareQuantity', quantityOptions).valid && model.ok;
        var predictionKey = [amountA, costA, amountB, costB].join('|');
        var checked = ready && d.unitPredictionChecked && d.unitPredictionChecked.key === predictionKey ? d.unitPredictionChecked : null;
        var revealed = !d.unitPredictFirst || !!checked;
        var names = [t('stem.ratios.option_a', 'Option A'), t('stem.ratios.option_b', 'Option B')];
        var actions = { background: panel, color: text, border: '1px solid ' + muted, minHeight: 44 };
        var comparison = !optionAReady || !optionBReady
          ? t('stem.ratios.finish_valid_inputs_before_comparing', 'Finish the highlighted inputs before comparing the options.')
          : amountA === 0 || amountB === 0
          ? t('stem.ratios.enter_an_amount_greater_than_zero_for_', 'Enter an amount greater than zero for both options.')
          : !baseModel.ok
          ? t('stem.ratios.adjust_the_values_so_both_unit_rates_s', 'Adjust the values so both unit rates stay within the learning-model range.')
          : baseModel.winner === 'same'
          ? t('stem.ratios.both_options_have_the_same_cost_per_un', 'Both options have the same cost per unit.')
          : baseModel.winner === 'a'
          ? t('stem.ratios.option_a_has_the_lower_cost_per_unit', 'Option A has the lower cost per unit.')
          : t('stem.ratios.option_b_has_the_lower_cost_per_unit', 'Option B has the lower cost per unit.');

        function precise(value) { return formatSignificantNumber(value, 15); }
        function rateText(index) { return '$' + baseModel.rateEvidence.displays[index]; }
        function costText(index) { return '$' + model.costEvidence.displays[index]; }
        function pickExample(values) {
          update(Object.assign(resetPrediction(), { amountA: values[0], costA: values[1], amountB: values[2], costB: values[3], amountADraft: null, costADraft: null, amountBDraft: null, costBDraft: null, unitCompareQuantity: 1, unitCompareQuantityDraft: null }));
        }
        function optionCard(index, amount, cost, amountKey, costKey) {
          var optionReady = index === 0 ? optionAReady : optionBReady;
          var rate = optionReady && amount > 0 ? cost / amount : null;
          if (rate !== null && !unitRateIsRepresentable({ x: amount, y: cost }, rate)) rate = null;
          return h('fieldset', { className: 'rounded-xl p-4 space-y-3', style: Object.assign({ minWidth: 0 }, cardStyle) },
            h('legend', { className: 'px-2 font-bold' }, names[index]),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              numericField(fill(t('stem.ratios.option_quantity', '{option} quantity'), { option: names[index] }), amount, amountKey, amountOptions),
              numericField(fill(t('stem.ratios.option_cost_dollars', '{option} cost in dollars'), { option: names[index] }), cost, costKey, costOptions)
            ),
            revealed && h('div', { className: 'rounded-lg p-3 text-center', 'data-unit-rate-card': index, style: { background: soft, border: '1px solid ' + border, overflowWrap: 'anywhere' } },
              h('div', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.cost_for_1_unit', 'Cost for 1 unit')),
              h('div', { className: 'text-2xl font-black', style: { color: rate === null ? warning : accent } }, !optionReady ? t('stem.ratios.finish_the_inputs', 'Finish the inputs') : rate === null ? amount > 0 ? t('stem.ratios.rate_outside_model_range', 'Rate outside model range') : t('stem.ratios.needs_a_quantity', 'Needs a quantity') : ready ? rateText(index) : '$' + formatUnitRate(rate)),
              rate !== null && h('div', { className: 'text-xs', style: { color: muted } }, '$' + precise(cost) + ' ÷ ' + precise(amount))
            )
          );
        }

        return h('div', { className: 'space-y-4', 'data-unit-comparison': true },
          h('p', { className: 'text-sm', style: { color: muted } }, t('stem.ratios.fair_same_unit', 'Use the same unit for both quantities, such as ounces for both options. A lower package price does not always mean a lower cost per unit.')),
          h('details', { className: 'rounded-xl p-3', style: cardStyle },
            h('summary', { className: 'cursor-pointer text-sm font-bold' }, t('stem.ratios.fair_examples', 'Try a comparison')),
            h('div', { className: 'flex flex-wrap gap-2 mt-3' },
              [['package', t('stem.ratios.fair_example_package', 'Different package sizes')], ['sameUnit', t('stem.ratios.fair_example_equal', 'Same unit price')], ['zeroCost', t('stem.ratios.fair_example_zero', 'An option with zero cost')]].map(function(item) {
                // An example never loads the open problem's own numbers or rates.
                var values = exploreExampleFor(item[0], 'unitRates', challenge);
                return values && h('button', { key: item[0], type: 'button', 'data-unit-example': item[0], className: 'rounded-lg px-3 py-2 text-sm', style: actions, onClick: function() { pickExample(values); } }, item[1]);
              })
            )
          ),
          h('label', { className: 'flex items-center gap-2 text-sm font-bold', style: { minHeight: 44 } },
            h('input', { type: 'checkbox', checked: !!d.unitPredictFirst, onChange: function(event) { update(Object.assign(resetPrediction(), { unitPredictFirst: event.target.checked })); }, style: { width: 20, height: 20, accentColor: accent } }),
            t('stem.ratios.fair_predict_first', 'Predict before comparing')
          ),
          h('div', { className: 'grid md:grid-cols-2 gap-4' }, optionCard(0, amountA, costA, 'amountA', 'costA'), optionCard(1, amountB, costB, 'amountB', 'costB')),
          d.unitPredictFirst && h('fieldset', { className: 'rounded-xl p-4 space-y-3', 'data-unit-prediction': true, style: cardStyle },
            h('legend', { className: 'px-2 text-sm font-bold' }, t('stem.ratios.fair_predict_question', 'Which has the lower cost for the same quantity?')),
            h('div', { className: 'flex flex-wrap gap-2' }, [['a', names[0]], ['b', names[1]], ['same', t('stem.ratios.fair_same_cost', 'Same cost')]].map(function(choice) {
              return h('label', { key: choice[0], className: 'rounded-lg px-3 py-2 flex items-center gap-2 text-sm', style: actions },
                h('input', { type: 'radio', name: 'unit-rate-prediction', value: choice[0], checked: d.unitPredictionChoice === choice[0], onChange: function() { update({ unitPredictionChoice: choice[0], unitPredictionChecked: null }); }, style: { accentColor: accent } }), choice[1]);
            })),
            h('div', { className: 'flex flex-wrap gap-2' },
              h('button', { type: 'button', className: 'rounded-lg px-3 py-2 font-bold text-sm disabled:opacity-60', style: actions, disabled: !ready || ['a', 'b', 'same'].indexOf(d.unitPredictionChoice) < 0, onClick: function() { update({ unitPredictionChecked: { key: predictionKey, choice: d.unitPredictionChoice } }); } }, t('stem.ratios.fair_check_prediction', 'Check prediction')),
              h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm disabled:opacity-60', style: actions, disabled: !ready, onClick: function() { update({ unitPredictionChoice: null, unitPredictionChecked: { key: predictionKey, choice: null } }); } }, t('stem.ratios.fair_reveal', 'Show the comparison'))
            ),
            checked && h('p', { role: 'status', 'aria-live': 'polite', 'data-unit-prediction-feedback': true, className: 'text-sm font-bold' }, checked.choice === null ? t('stem.ratios.fair_worked_support', 'Use the equal quantities below to explain the comparison.') : checked.choice === baseModel.winner ? t('stem.ratios.fair_prediction_confirmed', 'Prediction confirmed. Compare the equal quantities below.') : t('stem.ratios.fair_prediction_revisit', 'Revisit your prediction using the equal quantities below.'))
          ),
          (!ready || revealed) && h('div', { className: 'rounded-xl p-4 text-sm', role: 'status', 'aria-live': 'polite', 'data-unit-verdict': true, style: { background: soft, border: '1px solid ' + border } },
            h('p', { className: 'font-bold' }, comparison),
            ready && baseModel.stickerWinner !== baseModel.winner && h('p', { className: 'mt-2', 'data-unit-package-insight': true }, baseModel.winner === 'same' ? t('stem.ratios.fair_equal_explanation', 'The package totals differ because the quantities differ. At the same quantity, the costs match.') : t('stem.ratios.fair_package_explanation', 'Package totals alone give a different comparison. Divide by each quantity first so both prices describe one unit.')),
            ready && h('p', { className: 'mt-2 text-xs', style: { color: muted } }, t('stem.ratios.a_fair_comparison_divides_each_cost_by', 'A fair comparison divides each cost by its own quantity. Context may also involve quality, waste, or other needs.'))
          ),
          ready && revealed && h('section', { className: 'rounded-xl p-4 space-y-4', 'aria-labelledby': 'unit-fair-title', 'data-unit-worked-model': true, style: cardStyle },
            h('h3', { id: 'unit-fair-title', className: 'font-bold' }, t('stem.ratios.fair_model_title', 'Compare equal quantities')),
            h('p', { className: 'text-sm', style: { color: muted } }, t('stem.ratios.fair_model_scope', 'This model assumes a constant price per unit and allows portions of a package. Buying only whole packages may lead to a different checkout total.')),
            numericField(t('stem.ratios.fair_quantity_label', 'Quantity to compare for both options'), quantity, 'unitCompareQuantity', quantityOptions),
            h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.ratios.fair_benchmarks', 'Comparison quantities') },
              [{ q: 1, label: t('stem.ratios.fair_one_unit', '1 unit') }, { q: amountA, label: t('stem.ratios.fair_use_a_quantity', 'Use A quantity') }, { q: amountB, label: t('stem.ratios.fair_use_b_quantity', 'Use B quantity') }].map(function(item, index) {
                return h('button', { key: index, type: 'button', className: 'rounded-lg px-3 py-2 text-sm', style: actions, 'aria-pressed': modelReady && quantity === item.q, disabled: item.q < quantityOptions.min, onClick: function() { update({ unitCompareQuantity: item.q, unitCompareQuantityDraft: null }); } }, item.label);
              })
            ),
            !modelReady ? h('p', { role: 'status', className: 'text-sm', style: { color: warning } }, model.ok ? t('stem.ratios.fair_finish_quantity', 'Finish the comparison quantity to update the model.') : t('stem.ratios.fair_adjust_scale', 'Choose less extreme values to show both scaled costs reliably.')) : h('div', { className: 'space-y-4', 'data-unit-normalized': true },
              h('div', { className: 'grid md:grid-cols-2 gap-3' }, [0, 1].map(function(index) {
                var amount = index === 0 ? amountA : amountB, cost = index === 0 ? costA : costB;
                return h('div', { key: index, className: 'rounded-lg p-3 space-y-2 text-sm', style: { background: soft, border: '1px solid ' + border, minWidth: 0, overflowWrap: 'anywhere' }, 'data-unit-scaling': index },
                  h('h4', { className: 'font-bold' }, names[index]),
                  h('p', null, fill(t('stem.ratios.fair_row_package', '{q} units ↔ ${cost}'), { q: precise(amount), cost: precise(cost) })),
                  h('p', { className: 'font-bold', style: { color: accent } }, fill(t('stem.ratios.fair_row_divide', '÷ {q} → both quantities'), { q: precise(amount) })),
                  h('p', null, fill(t('stem.ratios.fair_row_one_unit', '1 unit ↔ {rate}'), { rate: rateText(index) })),
                  quantity !== 1 && h(React.Fragment, null,
                    h('p', { className: 'font-bold', style: { color: accent } }, fill(t('stem.ratios.fair_row_multiply', '× {q} → both quantities'), { q: precise(quantity) })),
                    h('p', null, fill(t('stem.ratios.fair_row_scaled', '{q} units ↔ {cost}'), { q: precise(quantity), cost: costText(index) }))
                  )
                );
              })),
              h('figure', { className: 'space-y-3', 'data-unit-cost-bars': true },
                h('figcaption', { className: 'text-sm font-bold' }, fill(t('stem.ratios.fair_cost_at_units', 'Cost at {q} units'), { q: precise(quantity) })),
                [0, 1].map(function(index) {
                  return h('div', { key: index, className: 'space-y-1' },
                    h('div', { className: 'flex flex-wrap justify-between gap-2 text-sm font-bold', style: { overflowWrap: 'anywhere' } }, h('span', null, names[index]), h('span', null, costText(index))),
                    h('div', { 'aria-hidden': true, style: { height: 28, borderLeft: '2px solid ' + text, background: soft, position: 'relative' } },
                      h('div', { 'data-unit-cost-bar': index, style: { height: '100%', width: model.widths[index] + '%', background: index === 0 ? accent : success } })
                    )
                  );
                }),
                h('div', { className: 'flex justify-between gap-2 text-xs', style: { overflowWrap: 'anywhere' } }, h('span', null, '$0'), h('span', null, '$' + precise(model.maximum))),
                h('p', { className: 'text-xs', style: { color: muted } }, model.maximum === 0 ? t('stem.ratios.fair_zero_bars', 'Both costs are zero, so neither bar has a filled length.') : t('stem.ratios.fair_bar_scale', 'Both bars start at zero and use the same dollar scale. Very close prices may look equal; use the numbers to compare.'))
              ),
              h('p', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.fair_rounding', 'Displayed rates and scaled costs may be rounded. Calculations use the unrounded values; the divisions above retain the original quantities.')),
              h('p', { className: 'text-sm font-bold' }, t('stem.ratios.fair_reflect', 'Change the comparison quantity. Explain why scaling both costs by the same positive amount preserves their order.'))
            )
          )
        );
      }


      function renderPercent() {
        var kind = ['findPart', 'findPercent', 'findWhole'].indexOf(d.percentKind) >= 0 ? d.percentKind : 'findPart';
        var wholeOptions = { min: 0, max: MAX_PERCENT_QUANTITY, step: 0.1 };
        var percentOptions = { min: 0, max: MAX_PERCENT, step: 0.1 };
        var partOptions = { min: 0, max: MAX_PERCENT_QUANTITY, step: 0.1 };
        var percentFields = [];
        if (kind !== 'findWhole') percentFields.push({ key: 'percentWhole', options: wholeOptions });
        if (kind !== 'findPercent') percentFields.push({ key: 'percentValue', options: percentOptions });
        if (kind !== 'findPart') percentFields.push({ key: 'percentPart', options: partOptions });
        var percentReady = numericFieldsReady(percentFields);
        var percent = clamp(finiteNumber(d.percentValue, exploreDefaults[0]), 0, MAX_PERCENT);
        var whole = clamp(finiteNumber(d.percentWhole, exploreDefaults[1]), 0, MAX_PERCENT_QUANTITY);
        var part = clamp(finiteNumber(d.percentPart, roundTo(exploreDefaults[0] * exploreDefaults[1] / 100, 6)), 0, MAX_PERCENT_QUANTITY);
        var result;
        var formula;
        var resultLabel;
        var resultIssue = '';
        if (kind === 'findPercent') {
          result = percentReady && whole > 0 ? part / whole * 100 : null;
          formula = t('stem.ratios.part_whole_100', "part ÷ whole × 100");
          resultLabel = t('stem.ratios.percent', "Percent");
        } else if (kind === 'findWhole') {
          result = percentReady && percent > 0 ? part / (percent / 100) : null;
          formula = t('stem.ratios.part_percent_100', "part ÷ (percent ÷ 100)");
          resultLabel = t('stem.ratios.whole', "Whole");
        } else {
          result = percentReady ? whole * (percent / 100) : null;
          formula = t('stem.ratios.whole_percent_100', "whole × (percent ÷ 100)");
          resultLabel = t('stem.ratios.part', "Part");
        }
        var resultLimit = kind === 'findPercent' ? MAX_PERCENT : MAX_PERCENT_QUANTITY;
        if (!percentReady) {
          resultIssue = t('stem.ratios.finish_valid_inputs', "Finish the highlighted inputs to update the ratio model.");
        } else if (result != null && (!isFinite(result) || result > resultLimit)) {
          result = null;
          resultIssue = kind === 'findPercent'
            ? t('stem.ratios.this_example_is_above_the_1000_learnin', "This example is above the 1000% learning-model limit. Adjust the part or whole.")
            : t('stem.ratios.this_result_is_above_the_1_000_000_qua', "This result is above the 1,000,000 quantity limit. Adjust the example values.");
        }
        var tapePercent = kind === 'findPercent' ? (result == null ? 0 : result) : percent;
        var tapeCanRender = percentReady && !(kind === 'findPercent' && result == null);
        var tapeModel = tapeCanRender ? percentTapeModel(tapePercent, 6) : null;
        var tapeSummary = !percentReady ? resultIssue : (resultIssue || (result == null
          ? (kind === 'findPercent' ? t('stem.ratios.the_percent_is_not_defined_when_the_wh', "The percent is not defined when the whole is zero. Enter a positive whole to build the tape.") : t('stem.ratios.the_whole_is_not_defined_when_the_perc', "The whole is not defined when the percent is zero. Enter a positive percent to build the tape."))
          : percentTapeSummary(tapeModel, t)));
        var predictValues = { p: formatNumber(percent), W: formatNumber(whole), P: formatNumber(part) };
        var gate = percentReady && result != null ? numberPredictGate('percent', [kind, whole, percent, part].join('|'),
          fill(kind === 'findPercent' ? t('stem.ratios.predict_percent_rate', 'Predict: {P} is what percent of {W}?') : kind === 'findWhole' ? t('stem.ratios.predict_percent_whole', 'Predict: {P} is {p}% of what whole?') : t('stem.ratios.predict_percent_part', 'Predict: what is {p}% of {W}?'), predictValues),
          result,
          function(typed) {
            if (kind === 'findPart' && nearlyEqual(typed, whole * percent)) return t('stem.ratios.mc_predict_forgot_hundredths', 'Your prediction multiplies by the percent number itself. A percent counts hundredths.');
            if (kind === 'findPercent' && nearlyEqual(typed, part / whole)) return t('stem.ratios.mc_decimal_for_percent', 'That is a decimal. A percent counts hundredths, so multiply the decimal by 100 to write it as a percent.');
            if (kind === 'findWhole' && nearlyEqual(typed, part * percent / 100)) return t('stem.ratios.mc_predict_whole_multiplied', 'Your prediction multiplies, but the part is only a piece of the whole, so the whole is bigger than the part when the percent is under 100%.');
            return null;
          }) : { revealed: true, node: null };
        var percentRevealed = gate.revealed;

        function changePercentKind(nextKind) {
          if (['findPart', 'findPercent', 'findWhole'].indexOf(nextKind) < 0 || nextKind === kind) return;
          var patch = {
            percentKind: nextKind,
            percentWholeDraft: null,
            percentValueDraft: null,
            percentPartDraft: null
          };
          if (percentReady && result !== null && isFinite(result)) {
            var transferred = roundTo(result, 6);
            if (kind === 'findPercent') patch.percentValue = clamp(transferred, 0, MAX_PERCENT);
            else if (kind === 'findWhole') patch.percentWhole = clamp(transferred, 0, MAX_PERCENT_QUANTITY);
            else patch.percentPart = clamp(transferred, 0, MAX_PERCENT_QUANTITY);
          }
          update(patch);
          var nextLabel = nextKind === 'findPercent' ? t('stem.ratios.percent', "Percent") : (nextKind === 'findWhole' ? t('stem.ratios.whole', "Whole") : t('stem.ratios.part', "Part"));
          announce(fill(t('stem.ratios.now_finding_sentence', 'Now finding {label}.'), { label: nextLabel }));
        }

        function renderPercentTape(tape, tapeIndex) {
          var wholeNumber = tape.complete ? tapeIndex + 1 : tapeModel.wholeCount + 1;
          var titleId = 'ratio-percent-tape-title-' + tapeIndex;
          var descId = 'ratio-percent-tape-desc-' + tapeIndex;
          var fullSegments = tape.fills.filter(function(amount) { return amount === 1; }).length;
          var partialSegment = tape.fills.filter(function(amount) { return amount > 0 && amount < 1; })[0];
          var description = fill(t('stem.ratios.tape_desc_sections', 'Ten equal sections each represent 10% of one whole. {n} sections are completely filled.'), { n: fullSegments });
          if (partialSegment != null) {
            description += ' ' + fill(t('stem.ratios.tape_desc_partial', 'The next section is {p}% filled, representing {q}% of the whole.'), { p: formatNumber(partialSegment * 100), q: formatNumber(partialSegment * 10) });
          }
          if (!fullSegments && partialSegment == null) description += ' ' + t('stem.ratios.tape_desc_none', 'No sections are filled.');
          var filledText = fill(t('stem.ratios.tape_percent_filled', '{p}% filled'), { p: formatNumber(tape.percent) });
          var pctPhone = phoneWidthNow();
          // Phones draw at the box's width and label as many tenths as fit at 12 px.
          var drawPercentTape = function(boxWidth) {
            var pctW = pctPhone ? Math.max(100, Math.min(420, boxWidth)) : 500, pctCell = pctW / 10;
            var pctEvery = pctCell * 2 >= 40 ? 2 : 5;
            return h('svg', {
              viewBox: '0 0 ' + pctW + ' 62',
              className: 'w-full min-h-[62px]',
              role: 'img',
              'aria-labelledby': titleId + ' ' + descId,
              'data-tape-percent': formatNumber(tape.percent),
              preserveAspectRatio: "xMidYMid meet"
            },
              h('title', { id: titleId }, fill(t('stem.ratios.tape_percent_title', 'Whole {n} percent tape: {p}% filled'), { n: wholeNumber, p: formatNumber(tape.percent) })),
              h('desc', { id: descId }, description),
              tape.fills.map(function(amount, segmentIndex) {
                var x = segmentIndex * pctCell + 1;
                return h('g', { key: 'percent-segment-' + segmentIndex, 'data-percent-segment': segmentIndex + 1 },
                  h('rect', { x: x, y: 8, width: pctCell - 2, height: 32, rx: 2, fill: soft }),
                  amount > 0 && h('rect', {
                    x: x,
                    y: 8,
                    width: roundTo((pctCell - 2) * amount, 3),
                    height: 32,
                    rx: amount === 1 ? 2 : 0,
                    fill: accentStrong,
                    'data-fill-fraction': formatNumber(amount, 6),
                    'aria-hidden': 'true'
                  }),
                  h('rect', { x: x, y: 8, width: pctCell - 2, height: 32, rx: 2, fill: 'none', stroke: border, strokeWidth: 1.5, 'aria-hidden': 'true' }),
                  // Phone: a readable size only fits every second label.
                  (!pctPhone || (segmentIndex + 1) % pctEvery === 0) && h('text', { x: pctPhone && segmentIndex === 9 ? x + pctCell - 2 : x + (pctCell - 2) / 2, y: 55, textAnchor: pctPhone && segmentIndex === 9 ? 'end' : 'middle', fontSize: pctPhone ? 12 : 8, fontWeight: '700', fill: muted, 'aria-hidden': 'true' }, (segmentIndex + 1) * 10 + '%')
                );
              })
            );
          };

          return h('div', {
            key: 'percent-tape-' + tapeIndex,
            className: 'rounded-lg p-3 space-y-2',
            style: { background: soft, border: '1px solid ' + border },
            'data-percent-tape': tapeIndex + 1,
            'data-tape-percent': formatNumber(tape.percent)
          },
            h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2 text-xs' },
              h('strong', null, fill(t('stem.ratios.tape_whole_number', 'Whole {n}'), { n: wholeNumber })),
              h('span', { style: { color: muted } }, filledText)
            ),
            pctPhone ? h(fitWidthComponent(React), { fallback: 300, render: drawPercentTape }) : drawPercentTape(0)
          );
        }

        var shownWholeTapes = tapeModel ? tapeModel.tapes.length - (tapeModel.remainderPercent > 0 ? 1 : 0) : 0;
        return h('div', { className: 'space-y-4' },
          predictFirstToggle(),
          h('div', { className: "grid lg:grid-cols-[280px_1fr] gap-4" },
            h('div', { className: 'rounded-xl p-4 space-y-3', style: cardStyle },
              h('label', { className: 'block text-xs font-semibold', htmlFor: 'ratio-percent-kind' },
                h('span', { className: 'block mb-1', style: { color: muted } }, t('stem.ratios.choose_the_unknown', "Choose the unknown")),
                h('select', { id: 'ratio-percent-kind', value: kind, onChange: function(event) { changePercentKind(event.target.value); }, className: 'w-full rounded-lg px-3 py-2 text-sm', style: Object.assign({ minHeight: 44 }, inputStyle) },
                  h('option', { value: 'findPart' }, t('stem.ratios.find_the_part', "Find the part")),
                  h('option', { value: 'findPercent' }, t('stem.ratios.find_the_percent', "Find the percent")),
                  h('option', { value: 'findWhole' }, t('stem.ratios.find_the_whole', "Find the whole"))
                )
              ),
              kind !== 'findWhole' && numericField(t('stem.ratios.whole', "Whole"), whole, 'percentWhole', wholeOptions),
              kind !== 'findPercent' && numericField(t('stem.ratios.percent', "Percent"), percent, 'percentValue', percentOptions),
              kind !== 'findPart' && numericField(t('stem.ratios.part', "Part"), part, 'percentPart', partOptions),
              h('p', { className: 'text-xs', style: { color: muted }, role: 'note' }, t('stem.ratios.learning_model_range_0_to_1000_quantit', "Learning-model range: 0% to 1000%; quantities up to 1,000,000.")),
              gate.node
            ),
            h('div', { className: 'rounded-xl p-4 space-y-4', style: cardStyle },
              h('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
                h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'aria-labelledby': 'ratio-percent-result-label ratio-percent-result-value' },
                  h('div', { id: 'ratio-percent-result-label', className: 'text-xs', style: { color: muted } }, resultLabel),
                  h('div', { id: 'ratio-percent-result-value', className: 'text-3xl font-black', style: { color: result == null ? warning : accent } }, !percentReady ? t('stem.ratios.finish_the_inputs', "Finish the inputs") : (result == null ? t('stem.ratios.not_defined', "Not defined") : !percentRevealed ? '?' : formatNumber(result) + (kind === 'findPercent' ? '%' : '')))
                ),
                h('code', { className: 'rounded-lg px-3 py-2 text-xs', style: { background: soft, border: '1px solid ' + border } }, formula)
              ),
              !percentRevealed ? h('p', { role: 'status', className: 'rounded-lg p-4 text-center text-sm font-semibold', style: { background: soft, border: '1px solid ' + border } }, t('stem.ratios.percent_hidden_until_prediction', 'The result and the percent tape appear after you check your prediction.'))
              : tapeModel ? h('div', { className: 'space-y-3', 'data-percent-tape-total': formatNumber(tapeModel.percent), 'data-percent-tape-count': tapeModel.totalTapeCount },
                h('p', { id: 'ratio-percent-tape-summary', className: 'text-sm font-semibold', style: { color: text } }, tapeSummary),
                h('p', { id: 'ratio-percent-tape-key', className: 'text-xs', style: { color: muted } }, t('stem.ratios.each_outlined_section_is_exactly_10_of', "Each outlined section is exactly 10% of one whole. A partially filled section shows the exact fraction of that 10% section.")),
                h('div', { className: 'space-y-3', 'aria-describedby': 'ratio-percent-tape-summary ratio-percent-tape-key' }, tapeModel.tapes.map(renderPercentTape)),
                tapeModel.hiddenWholeCount > 0 && h('p', { className: 'text-xs font-semibold', style: { color: muted }, role: 'note' }, fill(tapeModel.hiddenWholeCount === 1 ? t('stem.ratios.tape_showing_one_hidden', 'Showing {shown} complete whole tapes; 1 additional complete whole is summarized above.') : t('stem.ratios.tape_showing_hidden', 'Showing {shown} complete whole tapes; {hidden} additional complete wholes are summarized above.'), { shown: shownWholeTapes, hidden: tapeModel.hiddenWholeCount }))
              ) : h('div', { role: 'status', className: 'rounded-lg p-4 text-center text-sm font-semibold', style: { background: soft, color: warning, border: '1px solid ' + warning } }, tapeSummary)
            )
          )
        );
      }

      function renderProportional() {
        var xText = d.propX == null ? exploreDefaults[0] : d.propX;
        var yText = d.propY == null ? exploreDefaults[1] : d.propY;
        var pairInput = parsePairInput(xText, yText, t);
        var pairs = pairInput.pairs;
        var analysis = analyzeProportionalPairs(pairInput, t);
        var analysisErrors = analysis.errors;
        var nonzeroPairs = pairs.filter(function(pair) { return pair.x !== 0; });
        var rateEvidence = formatUnitRateEvidence(nonzeroPairs);
        var rateDisplayIndex = 0;
        var pairRateDisplays = pairs.map(function(pair) {
          if (pair.x === 0) return pair.y === 0 ? t('stem.ratios.rate_origin', 'origin') : t('stem.ratios.rate_not_defined', 'not defined');
          var display = rateEvidence.displays[rateDisplayIndex];
          rateDisplayIndex += 1;
          return display;
        });
        var proportional = analysis.proportional;
        var validForDecision = analysis.valid;
        var graphPairs = analysis.complete ? pairs.slice().sort(function(a, b) { return a.x - b.x; }) : [];
        var maxX = positiveAxisMaximum(graphPairs.map(function(pair) { return pair.x; }));
        var maxY = positiveAxisMaximum(graphPairs.map(function(pair) { return pair.y; }));
        function scaleX(value) { return 42 + (value / maxX) * 290; }
        function scaleY(value) { return 185 - (value / maxY) * 145; }
        var xTicks = [0, maxX / 2, maxX];
        var yTicks = [0, maxY / 2, maxY];
        var includesOrigin = graphPairs.some(function(pair) { return pair.x === 0 && pair.y === 0; });
        var verdict = analysisErrors.length ? analysisErrors[0] : !validForDecision ? t('stem.ratios.enter_at_least_two_valid_coordinate_pa', "Enter at least two valid coordinate pairs, including one with a nonzero x-value.") : (proportional ? t('stem.ratios.proportional_the_unit_rate_is_constant', "Proportional: the unit rate is constant.") : t('stem.ratios.not_proportional_the_evidence_does_not', "Not proportional: the evidence does not show one constant unit rate through the origin."));
        var gate = validForDecision ? choicePredictGate('proportional', xText + '|' + yText,
          t('stem.ratios.predict_prop_question', 'Predict: is this relationship proportional?'),
          [{ id: 'yes', label: t('stem.ratios.yes', 'Yes') }, { id: 'no', label: t('stem.ratios.no', 'No') }],
          proportional ? 'yes' : 'no', verdict) : { revealed: true, node: null };
        var revealed = gate.revealed;
        var evidenceText = !validForDecision ? '' : proportional
          ? fill(includesOrigin ? t('stem.ratios.evidence_with_origin', 'Table evidence: all defined y ÷ x values equal {k}. Graph evidence: the entered points include (0,0) and follow the model ray.') : t('stem.ratios.evidence_without_origin', 'Table evidence: all defined y ÷ x values equal {k}. Graph evidence: the model ray extends the constant relationship through (0,0), even though the origin was not entered.'), { k: rateEvidence.displays[0] })
          : t('stem.ratios.check_for_changing_y_x_values_a_nonzer', "Check for changing y ÷ x values, a nonzero y-value when x = 0, or points that do not lie on one straight line through the origin.");
        var graphDesc = graphPairs.length
          ? fill(t('stem.ratios.graph_desc_points', 'Graph of {n} plotted table points.'), { n: graphPairs.length }) + ' ' + (revealed && proportional && !includesOrigin ? t('stem.ratios.graph_desc_ray', 'A proportional model ray is extended through the origin.') + ' ' : '') + (revealed ? verdict : t('stem.ratios.graph_desc_hidden', 'The verdict appears after you check your prediction.'))
          : t('stem.ratios.no_complete_set_of_points_is_available_sentence', 'No complete set of points is available to graph.') + ' ' + verdict;

        var propExample = exploreExampleFor('proportional', 'proportional', challenge) || exploreDefaults;
        var nonPropExample = exploreExampleFor('nonProportional', 'proportional', challenge) || EXPLORE_EXAMPLES.nonProportional[0];
        function setExample(isProportional) {
          var pair = isProportional ? propExample : nonPropExample;
          update({ propX: pair[0], propY: pair[1] });
          announce(isProportional ? t('stem.ratios.example_loaded_proportional', 'Proportional example loaded.') : t('stem.ratios.example_loaded_non_proportional', 'Non-proportional example loaded.'));
        }

        return h('div', { className: 'space-y-4' },
          predictFirstToggle(),
          h('div', { className: 'rounded-xl p-4', style: cardStyle },
            h('div', { className: 'flex flex-wrap justify-between items-center gap-2 mb-3' },
              h('h3', { className: 'font-bold' }, t('stem.ratios.test_a_relationship', "Test a relationship")),
              h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.ratios.load_table_example', "Load table example") },
                h('button', { type: 'button', onClick: function() { setExample(true); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { border: '1px solid ' + border, background: soft, color: text, minHeight: 44 } }, t('stem.ratios.load_proportional', "Load proportional")),
                h('button', { type: 'button', onClick: function() { setExample(false); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { border: '1px solid ' + border, background: soft, color: text, minHeight: 44 } }, t('stem.ratios.load_non_proportional', "Load non-proportional"))
              )
            ),
            h('div', { className: 'grid sm:grid-cols-2 gap-3' },
              h('label', { className: 'text-xs font-semibold' },
                h('span', { className: 'block mb-1', style: { color: muted } }, t('stem.ratios.x_values_comma_separated', "x-values (comma separated)")),
                h('input', { value: xText, onChange: function(event) { update({ propX: event.target.value }); }, className: 'w-full rounded-lg px-3 py-2 text-sm font-mono', style: Object.assign({ minHeight: 44 }, inputStyle), 'aria-label': t('stem.ratios.x_values_comma_separated_2', "x-values, comma separated") })
              ),
              h('label', { className: 'text-xs font-semibold' },
                h('span', { className: 'block mb-1', style: { color: muted } }, t('stem.ratios.y_values_comma_separated', "y-values (comma separated)")),
                h('input', { value: yText, onChange: function(event) { update({ propY: event.target.value }); }, className: 'w-full rounded-lg px-3 py-2 text-sm font-mono', style: Object.assign({ minHeight: 44 }, inputStyle), 'aria-label': t('stem.ratios.y_values_comma_separated_2', "y-values, comma separated") })
              )
            ),
            h('p', { className: 'text-xs mt-2', style: { color: muted } }, t('stem.ratios.use_the_same_number_of_x_and_y_values_', "Use the same number of x- and y-values. This first-quadrant graph requires a nonnegative number in every row.")),
            analysisErrors.length > 0 && h('div', { role: 'alert', className: 'mt-3 rounded-lg p-3 text-xs font-semibold', style: { background: soft, color: warning, border: '1px solid ' + warning } },
              h('p', { className: 'font-bold' }, t('stem.ratios.fix_the_coordinate_list_before_making_', "Fix the coordinate list before making a proportionality decision:")),
              h('ul', { className: 'mt-1 list-disc pl-5 space-y-1' }, analysisErrors.map(function(error, index) { return h('li', { key: index }, error); }))
            ),
            gate.node && h('div', { className: 'mt-3' }, gate.node)
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
                    h('td', { className: 'p-2 font-mono' }, formatSignificantNumber(pair.x, 6)),
                    h('td', { className: 'p-2 font-mono' }, formatSignificantNumber(pair.y, 6)),
                    h('td', { className: 'p-2 font-mono' }, revealed ? pairRateDisplays[index] : '?')
                  );
                }) : h('tr', null, h('td', { colSpan: 3, className: 'p-4 text-center', style: { color: muted } }, t('stem.ratios.no_valid_paired_rows_yet', "No valid paired rows yet."))))
              )
            ),
            h('div', { className: 'rounded-xl p-3', style: cardStyle },
              h('svg', { viewBox: '0 0 360 220', className: 'w-full min-h-[220px]', role: 'img', 'aria-labelledby': 'ratio-graph-title ratio-graph-desc', 'data-axis-max-x': formatNumber(maxX, 6), 'data-axis-max-y': formatNumber(maxY, 6) },
                h('title', { id: 'ratio-graph-title' }, t('stem.ratios.relationship_graph', "Relationship graph")),
                h('desc', { id: 'ratio-graph-desc' }, graphDesc),
                xTicks.map(function(value, index) {
                  return h('g', { key: 'x-tick-' + index },
                    h('line', { x1: scaleX(value), y1: 40, x2: scaleX(value), y2: 185, stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                    h('text', { x: scaleX(value), y: 201, textAnchor: 'middle', style: { fill: muted, fontSize: '9px' } }, formatSignificantNumber(value, 6))
                  );
                }),
                yTicks.map(function(value, index) {
                  return h('g', { key: 'y-tick-' + index },
                    h('line', { x1: 42, y1: scaleY(value), x2: 332, y2: scaleY(value), stroke: border, strokeWidth: 1, strokeDasharray: '3 4' }),
                    h('text', { x: 36, y: scaleY(value) + 3, textAnchor: 'end', style: { fill: muted, fontSize: '9px' } }, formatSignificantNumber(value, 6))
                  );
                }),
                h('line', { x1: 42, y1: 185, x2: 340, y2: 185, stroke: text, strokeWidth: 2 }),
                h('line', { x1: 42, y1: 185, x2: 42, y2: 28, stroke: text, strokeWidth: 2 }),
                h('text', { x: 340, y: 216, textAnchor: 'end', style: { fill: muted, fontSize: '10px', fontWeight: 'bold' } }, t('stem.ratios.x_quantity', "x quantity")),
                h('text', { x: 8, y: 24, style: { fill: muted, fontSize: '10px', fontWeight: 'bold' } }, t('stem.ratios.y_quantity', "y quantity")),
                revealed && validForDecision && proportional && analysis.constant !== null && h('line', { x1: scaleX(0), y1: scaleY(0), x2: scaleX(maxX), y2: scaleY(analysis.constant * maxX), stroke: success, strokeWidth: 3, 'data-proportional-ray': 'true' }),
                graphPairs.map(function(pair, index) {
                  return h('g', { key: index },
                    h('circle', { cx: scaleX(pair.x), cy: scaleY(pair.y), r: 5, fill: accentStrong, stroke: panel, strokeWidth: 2 }, h('title', null, '(' + pair.x + ', ' + pair.y + ')')),
                    h('text', { x: scaleX(pair.x) + 6, y: scaleY(pair.y) - 7, style: { fill: text, fontSize: '9px' } }, '(' + formatSignificantNumber(pair.x, 6) + ',' + formatSignificantNumber(pair.y, 6) + ')')
                  );
                })
              )
            )
          ),
          revealed ? h('div', { className: 'rounded-xl p-4', role: 'status', 'aria-live': 'polite', style: { background: soft, border: '1px solid ' + border } },
            h('div', { className: 'font-bold', style: { color: validForDecision ? (proportional ? success : warning) : muted } }, verdict),
            validForDecision && h('p', { className: 'text-xs mt-1', style: { color: muted } }, evidenceText)
          ) : h('p', { className: 'rounded-xl p-4 text-sm font-semibold', role: 'status', style: { background: soft, border: '1px solid ' + border } }, t('stem.ratios.prop_hidden_until_prediction', 'The y ÷ x evidence and the verdict appear after you check your prediction.'))
        );
      }

      function renderModeContent() {
        if (mode === 'numberLine') return renderNumberLine();
        if (mode === 'unitRates') return renderUnitRates();
        if (mode === 'percent') return renderPercent();
        if (mode === 'proportional') return renderProportional();
        return renderRatioTable();
      }

      var modeInfo = MODES_L.filter(function(item) { return item.id === mode; })[0] || MODES_L[0];
      var modeChallenges = LOCAL_CHALLENGES[mode];
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

      // Lesson problems (the 15 fixed ones) or endless generated practice.
      var sourceByMode = plainObject(d.sourceByMode);
      // A student who already worked on this mode's lesson problems stays on them.
      var usedLessons = typeof savedModeCursor === 'string' || modeChallenges.some(function(item) { return !!((d.solvedChallenges || {})[item.id] || (d.missedChallenges || {})[item.id]); });
      var source = teacher.problemSet === 'fixed' ? 'fixed' : teacher.problemSet === 'practice' ? 'practice'
        : sourceByMode[mode] === 'practice' ? 'practice' : sourceByMode[mode] === 'fixed' ? 'fixed' : (opensOnPractice(mode, band) && !usedLessons ? 'practice' : 'fixed');
      var practiceSeeds = plainObject(d.practiceSeedByMode);
      var seedKey = mode + ':' + band;
      var storedSeed = finiteNumber(practiceSeeds[seedKey], null);
      var practiceSeed = storedSeed != null && storedSeed >= 1 ? Math.floor(storedSeed) : defaultPracticeSeed(mode, band);
      var challenge = source === 'practice' ? generateProblem(mode, band, practiceSeed, t) : modeChallenges[challengeIndex];
      // The free-exploration workspace starts on numbers that cannot show this problem's answer.
      var exploreDefaults = exploreDefaultsFor(mode, challenge);
      var isPractice = !!challenge.generated;
      var solvedPractice = plainObject(d.solvedPractice);
      var challengeSolved = isPractice ? !!solvedPractice[challenge.id] : !!((d.solvedChallenges || {})[challenge.id]);
      var revealedItems = plainObject(d.revealedItems);
      var challengeRevealed = !!revealedItems[challenge.id];
      var triesById = plainObject(d.triesById);
      var wrongTries = Math.max(0, Math.floor(finiteNumber(triesById[challenge.id], 0)));
      var predictById = plainObject(d.predictById);
      var prediction = typeof predictById[challenge.id] === 'string' ? predictById[challenge.id] : null;
      var predictionRequired = isPractice;
      var predictionLocked = wrongTries > 0 || challengeSolved || challengeRevealed;
      var kindStats = plainObject(d.kindStats);
      var kindCorrect = Math.max(0, Math.floor(finiteNumber(plainObject(kindStats[challenge.kind]).correct, 0)));
      var xpCredited = plainObject(d.xpCredited);
      var missLog = Array.isArray(d.missLog) ? d.missLog.filter(function(entry) { return entry && typeof entry === 'object' && typeof entry.id === 'string'; }) : [];
      var challengeHintStage = d.challengeHintId === challenge.id ? clamp(Math.floor(finiteNumber(d.challengeHintStage, 0)), 0, 2) : 0;
      var strategyHint = mode === 'numberLine' ? t('stem.ratios.hint_align_known_values_first', "First align the known values, then locate a helpful unit or scale step.") :
        mode === 'unitRates' ? t('stem.ratios.hint_rewrite_each_situation_per_one', "Rewrite each situation per one unit before comparing.") :
        mode === 'percent' ? t('stem.ratios.hint_identify_part_percent_and_whole', "Identify the part, percent, and whole before choosing an operation.") :
        mode === 'proportional' ? t('stem.ratios.hint_compare_y_divided_by_x', "Compare y divided by x and check whether the graph follows one line through the origin.") :
        t('stem.ratios.hint_find_a_common_scale_factor', "Look for one scale factor that changes both quantities together.");
      var missedChallengeIds = modeChallenges.filter(function(item) {
        return !!((d.missedChallenges || {})[item.id]) && !((d.solvedChallenges || {})[item.id]);
      }).map(function(item) { return item.id; });
      var missedPractice = missLog.filter(function(entry) {
        return entry.seed != null && entry.mode === mode && entry.band === band && !entry.solvedLater && !entry.accepted && !solvedPractice[entry.id] && entry.id !== challenge.id;
      }).filter(function(entry, index, list) { return list.findIndex(function(other) { return other.id === entry.id; }) === index; });
      var feedback = d.challengeFeedback;
      if (feedback && feedback.challengeId !== challenge.id) feedback = null;
      if (challengeSolved && (!feedback || !feedback.correct)) {
        feedback = { challengeId: challenge.id, correct: true, message: t('stem.ratios.solved_previously', "Solved previously. ") + challenge.explain };
      }
      var scopedChallengeAnswer = d.challengeAnswerId === challenge.id && d.challengeAnswer != null ? d.challengeAnswer : '';
      var displayedChallengeAnswer = challengeSolved ? canonicalChallengeAnswer(challenge) : scopedChallengeAnswer;
      var challengeCheckPending = false;
      function answerWithUnit(problem) {
        var core = canonicalChallengeAnswer(problem);
        var withPrefix = problem.prefix === '$' ? '$' + core : core;
        if (!problem.suffix) return withPrefix;
        return problem.suffix === '%' ? withPrefix + '%' : withPrefix + ' ' + problem.suffix;
      }
      function bandLabel(id) {
        return id === 'g45' ? t('stem.ratios.band_g45', 'Grades 4–5') : id === 'g6' ? t('stem.ratios.band_g6', 'Grade 6') : id === 'g7' ? t('stem.ratios.band_g7', 'Grade 7') : t('stem.ratios.band_g8', 'Grade 8');
      }

      // One hint ladder for the problem and for every mission step:
      // hint 1 is the strategy, hint 2 the problem's own hint, then hide.
      function renderHintLadder(panelId, stage, onAdvance, strategyText, specificText, extraButton) {
        return h('div', { className: 'flex flex-wrap items-start gap-2', 'data-ratio-hint-ladder': panelId },
          h('button', { type: 'button', onClick: onAdvance, 'aria-expanded': stage > 0, 'aria-controls': panelId, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: soft, color: text, border: '1px solid ' + border, minHeight: 44 } }, stage === 0 ? t('stem.ratios.show_hint_1', "Show hint 1") : stage === 1 ? t('stem.ratios.show_hint_2', "Show hint 2") : t('stem.ratios.hide_hints', "Hide hints")),
          extraButton || null,
          stage > 0 && h('div', { id: panelId, role: 'note', className: 'flex-1 rounded-lg p-3 text-sm', style: { background: panel, border: '1px solid ' + border } },
            h('p', { className: 'font-semibold' }, h('strong', null, t('stem.ratios.hint_1', "Hint 1: ")), strategyText),
            stage > 1 && h('p', { className: 'mt-2 font-semibold' }, h('strong', null, t('stem.ratios.hint_2', "Hint 2: ")), specificText)
          )
        );
      }

      function advanceChallengeHint() {
        var nextStage = challengeHintStage >= 2 ? 0 : challengeHintStage + 1;
        update({ challengeHintId: nextStage ? challenge.id : null, challengeHintStage: nextStage });
        announce(nextStage ? t('stem.ratios.hint_revealed', "Hint revealed.") : t('stem.ratios.hints_hidden', "Hints hidden."));
      }

      function unitProblemText(problem) {
        var got = problem.typed;
        var text = problem.expected === 'dollars' ? t('stem.ratios.unit_want_dollars_got_percent', "Check the unit: this question asks for dollars, not a percent.")
          : problem.expected === 'percent' ? t('stem.ratios.unit_want_percent_got_dollars', "Check the unit: this question asks for a percent, not dollars.")
          : problem.unit ? (got === 'dollars' ? t('stem.ratios.unit_want_named_got_dollars', "Check the unit: this question asks for {unit}, not dollars.") : t('stem.ratios.unit_want_named_got_percent', "Check the unit: this question asks for {unit}, not a percent."))
          : (got === 'dollars' ? t('stem.ratios.unit_want_number_got_dollars', "Check the unit: this question asks for a plain number, not dollars.") : t('stem.ratios.unit_want_number_got_percent', "Check the unit: this question asks for a plain number, not a percent."));
        return String(text).replace('{unit}', function() { return problem.unit; });
      }

      function logEntry(answer, kindOfMiss, accepted) {
        return { id: challenge.id, mode: mode, kind: challenge.kind, band: isPractice ? challenge.band : null, seed: isPractice ? challenge.seed : null,
          prompt: String(challenge.prompt || '').slice(0, 300), typed: String(answer == null ? '' : answer).slice(0, 60), misconception: kindOfMiss || 'other', accepted: !!accepted, at: Date.now() };
      }

      function checkChallenge() {
        if (challengeSolved || challengeCheckPending) return;
        if (!normalizeAnswer(scopedChallengeAnswer)) {
          update({ challengeId: challenge.id, challengeIndex: challengeIndex,
            challengeFeedback: { challengeId: challenge.id, correct: false, message: t('stem.ratios.enter_an_answer_before_checking', "Enter an answer before checking.") } });
          announce(t('stem.ratios.enter_an_answer_before_checking', "Enter an answer before checking."));
          return;
        }
        if (predictionRequired && !prediction && !challengeRevealed) {
          var predictFirst = t('stem.ratios.predict_before_checking', 'Make your prediction above before you check your answer.');
          update({ challengeFeedback: { challengeId: challenge.id, correct: false, message: predictFirst } });
          announce(predictFirst);
          return;
        }
        var correct = challengeIsCorrect(challenge, scopedChallengeAnswer, { strictUnits: strictUnits });
        // Check reads the student's own model too (and only now, at a check).
        var modelNote = challengeRevealed ? '' : modelCheckNote(correct);
        var modelNoteText = modelNote ? ' ' + modelNote : '';
        if (tableSpec || tapeSpec) setModelBuild(function() { return { checked: true }; });
        if (correct) {
          challengeCheckPending = true;
          if (challengeRevealed) {
            // No credit for copying a solution that was shown.
            var copied = t('stem.ratios.correct_after_reveal', 'That matches the worked solution. It does not count as solved because the solution was shown. Try a new problem to earn credit.');
            update({ challengeFeedback: { challengeId: challenge.id, correct: true, message: copied } });
            announce(copied);
            return;
          }
          var note = diagnoseRatioAnswer(challenge, scopedChallengeAnswer);
          var noteText = note && note.accepted ? ' ' + note.message : '';
          var firstSolve = isPractice ? !solvedPractice[challenge.id] : !((d.solvedChallenges || {})[challenge.id]);
          // Choice items (A/B, yes/no) count for mastery only on the first try.
          var choiceItem = !!challenge.answers && !Array.isArray(challenge.ratioAnswer);
          var credit = choiceItem ? wrongTries === 0 : wrongTries <= 1;
          // A lesson A/B or yes/no item answered after a wrong pick was found by
          // elimination: it is solved, but the 15 XP is for a right first try.
          var lessonXp = !isPractice && firstSolve && (!choiceItem || wrongTries === 0);
          if (!isPractice && firstSolve && !lessonXp) noteText += ' ' + t('stem.ratios.choice_no_xp', 'It counts as solved. With only a few choices, XP is for a right first try.');
          var newKindCorrect = kindCorrect + (credit ? 1 : 0);
          var masteryKey = 'mastery:' + challenge.kind;
          var earnsMastery = isPractice && credit && newKindCorrect >= 3 && !xpCredited[masteryKey];
          var acceptedEntry = note && note.accepted ? logEntry(scopedChallengeAnswer, note.kind, true) : null;
          update(function(current) {
            var patch = { challengeAttempts: (current.challengeAttempts || 0) + 1,
              challengeFeedback: { challengeId: challenge.id, correct: true, message: t('stem.ratios.correct', "Correct! ") + challenge.explain + noteText + modelNoteText } };
            if (isPractice) {
              var practiceDone = Object.assign({}, plainObject(current.solvedPractice));
              practiceDone[challenge.id] = true;
              patch.solvedPractice = practiceDone;
            } else {
              var solved = Object.assign({}, current.solvedChallenges || {});
              var missed = Object.assign({}, current.missedChallenges || {});
              solved[challenge.id] = true;
              delete missed[challenge.id];
              patch.solvedChallenges = solved;
              patch.missedChallenges = missed;
            }
            var stats = Object.assign({}, plainObject(current.kindStats));
            var entry = Object.assign({ correct: 0, attempts: 0 }, plainObject(stats[challenge.kind]));
            entry.attempts = Math.max(0, Math.floor(finiteNumber(entry.attempts, 0))) + 1;
            entry.correct = Math.max(0, Math.floor(finiteNumber(entry.correct, 0))) + (credit ? 1 : 0);
            stats[challenge.kind] = entry;
            patch.kindStats = stats;
            var log = (Array.isArray(current.missLog) ? current.missLog : []).map(function(item) { return item && item.id === challenge.id ? Object.assign({}, item, { solvedLater: true }) : item; });
            if (acceptedEntry) log.push(acceptedEntry);
            patch.missLog = log.slice(-60);
            if (earnsMastery) {
              var credited = Object.assign({}, plainObject(current.xpCredited));
              credited[masteryKey] = true;
              patch.xpCredited = credited;
            }
            return patch;
          });
          announce(t('stem.ratios.correct_2', "Correct. ") + challenge.explain + noteText + modelNoteText);
          if (lessonXp && typeof ctx.awardXP === 'function') {
            try { ctx.awardXP('ratioLab', 15, t('stem.ratios.ratio_lab_challenge', "Ratio Lab challenge")); } catch (error) {}
          }
          if (lessonXp) notify(t('stem.ratios.challenge_solved_15_xp', "Challenge solved! +15 XP"), 'success');
          if (earnsMastery) {
            if (typeof ctx.awardXP === 'function') {
              try { ctx.awardXP('ratioLab', 10, t('stem.ratios.xp_mastery', 'Ratio Lab practice mastery')); } catch (error) {}
            }
            notify(t('stem.ratios.mastery_toast', 'Three solved on your own: practice mastery! +10 XP'), 'success');
          }
        } else {
          // Name the specific error when it can be proved; otherwise keep the
          // challenge's own hint rather than guessing at what went wrong.
          // Grade 6 up, a wrong $ or % names the expected unit; when the number
          // itself is right, that is the whole message.
          var unitProblem = strictUnits ? challengeUnitProblem(challenge, scopedChallengeAnswer) : null;
          var unitHelp = unitProblem ? unitProblemText(unitProblem) : '';
          var numberRight = !!unitProblem && challengeIsCorrect(challenge, scopedChallengeAnswer);
          var diagnosis = diagnoseRatioAnswer(challenge, scopedChallengeAnswer);
          var wrongAnswerHelp = numberRight ? unitHelp : (unitHelp ? unitHelp + ' ' : '') + (diagnosis ? diagnosis.message : challenge.hint);
          var tries = wrongTries + 1;
          var offerReveal = tries >= 2 && teacher.allowReveal && !challengeRevealed;
          var nextStep = offerReveal ? ' ' + t('stem.ratios.try_again_or_reveal', 'Try again, or show the worked solution below.') : (tries === 1 ? ' ' + t('stem.ratios.try_again', 'Try again.') : '');
          var missEntry = logEntry(scopedChallengeAnswer, numberRight ? 'unit' : (diagnosis ? diagnosis.kind : (unitProblem ? 'unit' : 'other')), false);
          update(function(current) {
            var missed = Object.assign({}, current.missedChallenges || {});
            if (!isPractice) missed[challenge.id] = true;
            var triesMap = Object.assign({}, plainObject(current.triesById));
            triesMap[challenge.id] = tries;
            var log = (Array.isArray(current.missLog) ? current.missLog : []).concat([missEntry]).slice(-60);
            return { missedChallenges: missed, challengeAttempts: (current.challengeAttempts || 0) + 1, triesById: triesMap, missLog: log,
              challengeFeedback: { challengeId: challenge.id, correct: false, message: t('stem.ratios.not_yet', "Not yet. ") + wrongAnswerHelp + nextStep + modelNoteText } };
          });
          announce(t('stem.ratios.not_yet', "Not yet. ") + wrongAnswerHelp + nextStep + modelNoteText);
        }
      }

      function revealSolution() {
        if (!teacher.allowReveal || wrongTries < 2) return;
        update(function(current) {
          var shown = Object.assign({}, plainObject(current.revealedItems));
          shown[challenge.id] = true;
          return { revealedItems: shown };
        });
        announce(t('stem.ratios.solution_shown', 'Worked solution shown. This problem will not count as solved.'));
      }

      function selectChallenge(next, message) {
        var nextChallengeItem = modeChallenges[next];
        update(function(current) {
          var cursors = Object.assign({}, current.challengeCursorByMode || {});
          cursors[mode] = nextChallengeItem.id;
          return { challengeCursorByMode: cursors, challengeId: nextChallengeItem.id,
            challengeIndex: next, challengeAnswer: '', challengeAnswerId: null, challengeFeedback: null, challengeHintId: null, challengeHintStage: 0 };
        });
        announce(message || fill(t('stem.ratios.challenge_n_of_total_sentence', 'Challenge {n} of {total}.'), { n: next + 1, total: modeChallenges.length }));
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

      function usePracticeSeed(seed, message) {
        update(function(current) {
          var seeds = Object.assign({}, plainObject(current.practiceSeedByMode));
          seeds[seedKey] = seed;
          return { practiceSeedByMode: seeds, challengeAnswer: '', challengeAnswerId: null, challengeFeedback: null, challengeHintId: null, challengeHintStage: 0 };
        });
        announce(message);
      }
      function newPracticeProblem() { usePracticeSeed(nextPracticeSeed(mode, band, practiceSeed), t('stem.ratios.new_problem_ready', 'New problem ready.')); }
      function retryMissedPractice() {
        if (!missedPractice.length) return;
        usePracticeSeed(missedPractice[0].seed, t('stem.ratios.retrying_missed_challenge', "Retrying missed challenge."));
      }
      function chooseSource(next) {
        if (teacher.problemSet !== 'both') return;
        update(function(current) {
          var sources = Object.assign({}, plainObject(current.sourceByMode));
          sources[mode] = next;
          return { sourceByMode: sources, challengeAnswer: '', challengeAnswerId: null, challengeFeedback: null, challengeHintId: null, challengeHintStage: 0 };
        });
        announce(next === 'practice' ? t('stem.ratios.source_practice_on', 'Endless practice: a new problem at your level.') : t('stem.ratios.source_lesson_on', 'Lesson problems.'));
      }
      function setPrediction(choice) {
        if (predictionLocked) return;
        update(function(current) {
          var all = Object.assign({}, plainObject(current.predictById));
          all[challenge.id] = choice;
          return { predictById: all };
        });
      }

      // ---- Cross-links ----
      function toolAvailable(id) {
        try { if (root.StemLab && typeof root.StemLab.isRegistered === 'function' && root.StemLab.isRegistered(id)) return true; } catch (error) {}
        try { return typeof root.__alloEnsureStemPluginLoaded === 'function' && root.__alloEnsureStemPluginLoaded(id) !== false; } catch (error2) { return false; }
      }
      // handoff: a y = kx string for the Graphing Calculator, or a function
      // that returns the next toolData (the Unit Converter handoff).
      function openTool(id, name, handoff) {
        if (typeof ctx.setStemLabTool !== 'function' || !toolAvailable(id)) {
          announce(fill(t('stem.ratios.tool_unavailable', '{name} is not available in this build.'), { name: name }));
          return;
        }
        if (typeof handoff === 'function') setLabToolData(function(previous) { return handoff(previous || {}); });
        else if (handoff) setLabToolData(function(previous) { return graphCalcHandoff(previous, handoff); });
        update(function(current) {
          var linked = Object.assign({}, plainObject(current.toolsLinked));
          linked[id] = true;
          return { toolsLinked: linked };
        });
        ctx.setStemLabTool(id);
      }

      // ---- Start here: the band's learning path ----
      function pathStepText(id) {
        switch (id) {
          case 'timesMultiply': return { title: t('stem.ratios.path_times_multiply', 'Times as many: multiply'), why: t('stem.ratios.path_times_multiply_why', 'Solve a "times as many" problem. Times as many means equal groups, so multiply.') };
          case 'timesTape': return { title: t('stem.ratios.path_times_tape', 'Times as many with a tape diagram'), why: t('stem.ratios.path_times_tape_why', 'Use the tape diagram to find the smaller amount: split the larger amount into equal parts.') };
          case 'ratioTableGroups': return { title: t('stem.ratios.path_ratio_groups', 'Ratio tables: equal groups'), why: t('stem.ratios.path_ratio_groups_why', 'Scale both quantities by the same number to find a missing value.') };
          case 'doubleLine': return { title: t('stem.ratios.path_double_line', 'Double number lines'), why: t('stem.ratios.path_double_line_why', 'Line up equal amounts on two scales, then find the value for 1.') };
          case 'ratioTables': return { title: t('stem.ratios.path_ratio_tables', 'Ratio tables'), why: t('stem.ratios.path_ratio_tables_why', 'Find a missing value or the simplest form by scaling both quantities together.') };
          case 'unitRates': return { title: t('stem.ratios.path_unit_rates', 'Unit rates'), why: t('stem.ratios.path_unit_rates_why', 'Find the amount for 1 and use it to compare fairly.') };
          case 'percents': return { title: t('stem.ratios.path_percents', 'Percents'), why: t('stem.ratios.path_percents_why', 'Connect the part, the whole and the percent.') };
          case 'mixtures': return { title: t('stem.ratios.path_mixtures', 'Mixtures mission'), why: t('stem.ratios.path_mixtures_why', 'Decide which mix is stronger by comparing each part to its whole.') };
          case 'detective': return { title: t('stem.ratios.path_detective', 'Proportional detective mission'), why: t('stem.ratios.path_detective_why', 'Decide "proportional or not" for tables, graphs and stories, and name the evidence.') };
          case 'percentChange': return { title: t('stem.ratios.path_percent_change', 'Percent change'), why: t('stem.ratios.path_percent_change_why', 'Divide the amount of change by the original amount.') };
          case 'scaleDrawings': return { title: t('stem.ratios.path_scale', 'Scale drawings mission'), why: t('stem.ratios.path_scale_why', 'Find real lengths and areas from a floor plan, then redraw it.') };
          case 'recipes': return { title: t('stem.ratios.path_recipes', 'Recipe scaling mission'), why: t('stem.ratios.path_recipes_why', 'Scale a recipe by a fraction factor in a ratio table.') };
          case 'slopeRate': return { title: t('stem.ratios.path_slope', 'Slope as a rate'), why: t('stem.ratios.path_slope_why', 'Read the slope of a line through (0, 0) as the unit rate.') };
          case 'compareSlopes': return { title: t('stem.ratios.path_compare_slopes', 'Compare two rates'), why: t('stem.ratios.path_compare_slopes_why', 'Compare relationships given as an equation and a table by their rates.') };
          case 'kFromGraph': return { title: t('stem.ratios.path_k_graph', 'k from a graph'), why: t('stem.ratios.path_k_graph_why', 'Find the constant of proportionality from a point on the line.') };
          default: return { title: t('stem.ratios.path_detective_review', 'Proportional detective review'), why: t('stem.ratios.path_detective_review_why', 'Check tables, graphs and stories for y = kx, and name the evidence.') };
        }
      }
      var learningPath = learningPathFor(band).map(function(step) { return Object.assign(step, { done: pathStepDone(step, d) }, pathStepText(step.id)); });
      function focusLater(id) {
        if (typeof document === 'undefined') return;
        var run = function() { var el = document.getElementById(id); if (el && typeof el.focus === 'function') el.focus(); };
        if (typeof root.setTimeout === 'function') root.setTimeout(run, 0); else run();
      }
      // Start lands on the first thing to do: the section scrolls into view
      // and focus goes to the required prediction, else the answer (for a
      // mission, its first open control).
      function focusFirstTask(sectionId, pickTarget) {
        if (typeof document === 'undefined') return;
        var attempts = 0;
        var run = function() {
          var section = document.getElementById(sectionId);
          var target = pickTarget();
          // Some hosts re-render a tick later: wait (briefly) for the section to exist.
          if (!section && attempts++ < 20 && typeof root.setTimeout === 'function') { root.setTimeout(run, 50); return; }
          try { if (section && typeof section.scrollIntoView === 'function') section.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (error) {}
          if (!target || typeof target.focus !== 'function') { if (section && typeof section.focus === 'function') section.focus(); return; }
          try { target.focus({ preventScroll: true }); } catch (error2) { target.focus(); }
          try {
            var box = target.getBoundingClientRect();
            if (root.innerHeight && box.bottom > root.innerHeight && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center', behavior: 'auto' });
          } catch (error3) {}
        };
        if (typeof root.setTimeout === 'function') root.setTimeout(run, 0); else run();
      }
      function focusProblemTask() {
        focusFirstTask('ratio-challenge-section', function() {
          return document.querySelector('[data-prediction-needed="true"] input[type="radio"]') || document.getElementById('ratio-challenge-answer');
        });
      }
      function focusMissionTask() {
        focusFirstTask('ratio-missions-section', function() {
          return document.querySelector('#ratio-mission-panel [data-ratio-mission-body] input:not([disabled])') || document.getElementById('ratio-missions-heading');
        });
      }
      function goToPathStep(step) {
        if (step.mission) {
          if (teacher.lockMission && teacher.lockMission !== step.mission) { announce(t('stem.ratios.ms_locked', 'Your teacher has set the mission for this lesson.')); return; }
          update({ missionTab: step.mission, labView: 'missions' });
          announce(fill(t('stem.ratios.path_opened', '{step} opened.'), { step: step.title }));
          focusMissionTask();
          return;
        }
        if (teacher.lockMode && teacher.lockMode !== step.mode) { announce(t('stem.ratios.mode_locked_note', 'Your teacher has set the mode for this lesson.')); return; }
        if (labView !== 'practice') update({ labView: 'practice' });
        chooseMode(step.mode);
        if (teacher.problemSet !== 'fixed') {
          update(function(current) {
            var seed = seedForKind(step.mode, band, step.kinds[0], hashString('path:' + step.id + ':' + band), plainObject(current.solvedPractice));
            if (seed == null) return {};
            var sources = Object.assign({}, plainObject(current.sourceByMode)); sources[step.mode] = 'practice';
            var seeds = Object.assign({}, plainObject(current.practiceSeedByMode)); seeds[step.mode + ':' + band] = seed;
            return { sourceByMode: sources, practiceSeedByMode: seeds, challengeAnswer: '', challengeAnswerId: null, challengeFeedback: null, challengeHintId: null, challengeHintStage: 0 };
          });
        }
        announce(fill(t('stem.ratios.path_opened', '{step} opened.'), { step: step.title }));
        focusProblemTask();
      }
      function renderLearningPath() {
        var doneCount = learningPath.filter(function(step) { return step.done; }).length;
        var nextStep = learningPath.filter(function(step) { return !step.done; })[0] || null;
        // Folded to one "Next" line; the full list opens on request.
        var expanded = d.pathExpanded === true;
        function lockedOutOf(step) { return step.mission ? !!teacher.lockMission && teacher.lockMission !== step.mission : !!teacher.lockMode && teacher.lockMode !== step.mode; }
        var nextIndex = nextStep ? learningPath.indexOf(nextStep) : -1;
        return h('section', { className: 'rounded-2xl p-4 space-y-3', 'aria-labelledby': 'ratio-path-heading', 'data-ratio-path': band, style: { background: panel, border: '2px solid ' + accent } },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
            h('div', null,
              h('h2', { id: 'ratio-path-heading', className: 'font-black' }, fill(t('stem.ratios.path_heading', 'Start here: your path for {band}'), { band: bandLabel(band) })),
              h('p', { className: 'text-xs', style: { color: muted }, 'data-ratio-path-progress': doneCount }, fill(t('stem.ratios.path_progress', '{n} of {total} steps done'), { n: doneCount, total: learningPath.length }))),
            h('button', { type: 'button', 'aria-expanded': expanded, 'aria-controls': 'ratio-path-steps', 'data-ratio-path-toggle': true, onClick: function() { update({ pathExpanded: !expanded }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: buttonStyle },
              expanded ? t('stem.ratios.path_hide_steps', 'Hide the steps') : fill(t('stem.ratios.path_show_steps', 'Show all {n} steps'), { n: learningPath.length }))),
          !expanded && nextStep && h('div', { className: 'flex flex-wrap items-center gap-3 rounded-lg p-3', 'data-ratio-path-next': nextStep.id, style: { background: soft, border: '1px solid ' + accent } },
            h('p', { className: 'text-sm font-bold flex-1', style: { minWidth: 160 } }, fill(t('stem.ratios.path_next_line', 'Next: {title}'), { title: nextStep.title })),
            lockedOutOf(nextStep) && h('p', { className: 'text-xs font-semibold', role: 'note' }, nextStep.mission ? t('stem.ratios.ms_locked', 'Your teacher has set the mission for this lesson.') : t('stem.ratios.mode_locked_note', 'Your teacher has set the mode for this lesson.')),
            h('button', { type: 'button', disabled: lockedOutOf(nextStep), 'data-ratio-path-go': nextStep.id, 'aria-label': fill(t('stem.ratios.path_go_label', 'Start step {n}: {title}'), { n: nextIndex + 1, title: nextStep.title }),
              onClick: function() { goToPathStep(nextStep); }, className: 'rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-60', style: { background: accentStrong, color: accentText, border: isContrast ? '2px solid #ffffff' : 'none', minHeight: 44, minWidth: 88 } },
              t('stem.ratios.path_go', 'Start'))),
          !expanded && !nextStep && h('p', { role: 'status', className: 'text-sm font-bold', style: { color: success }, 'data-ratio-path-complete': true }, t('stem.ratios.path_complete', 'Path complete! Keep practising, or explore the other tabs and missions.')),
          expanded && h('div', { id: 'ratio-path-steps', className: 'space-y-2' },
            h('p', { className: 'text-sm', style: { color: muted } }, t('stem.ratios.path_intro', 'Work through these in order. A step is ticked when you solve one on your own, without showing the solution. Every other tab stays open to explore.')),
            h('ol', { className: 'space-y-2' }, learningPath.map(function(step, index) {
              var lockedOut = step.mission ? !!teacher.lockMission && teacher.lockMission !== step.mission : !!teacher.lockMode && teacher.lockMode !== step.mode;
              var isNext = nextStep && nextStep.id === step.id;
              return h('li', { key: step.id, 'data-path-step': step.id, 'data-done': step.done ? 'true' : 'false', className: 'flex flex-wrap items-center gap-3 rounded-lg p-3', style: { background: soft, border: '1px solid ' + (step.done ? success : isNext ? accent : border) } },
                h('span', { 'aria-hidden': 'true', className: 'inline-flex items-center justify-center rounded-full font-black text-sm', style: { width: 32, height: 32, flex: '0 0 32px', background: step.done ? success : panel, color: step.done ? (isContrast || isDark ? '#000000' : '#ffffff') : text, border: '2px solid ' + (step.done ? success : border) } }, step.done ? '✓' : String(index + 1)),
                h('div', { className: 'flex-1', style: { minWidth: 180 } },
                  h('p', { className: 'text-sm font-bold', id: 'ratio-path-title-' + step.id }, step.title,
                    h('span', { style: srOnlyStyle }, ' ' + (step.done ? t('stem.ratios.path_done_sr', '(done)') : t('stem.ratios.path_not_done_sr', '(not done yet)'))),
                    isNext && h('span', { className: 'ml-2 rounded-full px-2 py-0.5 text-xs', style: isContrast ? { background: '#000000', color: accent, border: '1px solid ' + accent } : { background: accentStrong, color: accentText } }, t('stem.ratios.path_next', 'Next'))),
                  h('p', { className: 'text-xs', style: { color: muted } }, step.why),
                  lockedOut && h('p', { className: 'text-xs font-semibold', role: 'note' }, step.mission ? t('stem.ratios.ms_locked', 'Your teacher has set the mission for this lesson.') : t('stem.ratios.mode_locked_note', 'Your teacher has set the mode for this lesson.'))),
                h('button', { type: 'button', disabled: lockedOut, 'data-ratio-path-go': step.id, 'aria-label': fill(step.done ? t('stem.ratios.path_go_again_label', 'Practise again: step {n}, {title}') : t('stem.ratios.path_go_label', 'Start step {n}: {title}'), { n: index + 1, title: step.title }),
                  onClick: function() { goToPathStep(step); }, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60', style: isNext ? { background: accentStrong, color: accentText, border: isContrast ? '2px solid #ffffff' : 'none', minHeight: 44 } : buttonStyle },
                  step.done ? t('stem.ratios.path_go_again', 'Practise again') : t('stem.ratios.path_go', 'Start')));
            })),
            !nextStep && h('p', { role: 'status', className: 'text-sm font-bold', style: { color: success }, 'data-ratio-path-complete': true }, t('stem.ratios.path_complete', 'Path complete! Keep practising, or explore the other tabs and missions.'))));
      }

      // ---- Teacher tools (ctx.isTeacherMode only) ----
      function setTeacher(patch) {
        update(function(current) { return { teacher: Object.assign({}, normalizeTeacher(current.teacher), patch) }; });
      }
      function renderTeacherPanel() {
        if (!isTeacher) return null;
        var fieldStyle = Object.assign({ minHeight: 44 }, inputStyle);
        var misses = missLog.filter(function(entry) { return !entry.accepted; });
        var problemsMissed = {};
        misses.forEach(function(entry) { problemsMissed[entry.id] = problemsMissed[entry.id] || !!entry.solvedLater; });
        var missedIds = Object.keys(problemsMissed);
        var laterSolved = missedIds.filter(function(id) { return problemsMissed[id]; }).length;
        var counts = {};
        missLog.forEach(function(entry) { var key = entry.misconception || 'other'; counts[key] = (counts[key] || 0) + 1; });
        var countRows = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
        var recent = missLog.slice().reverse().slice(0, 30);
        var confirming = !!d.teacherConfirmClear;
        return h('section', { className: 'rounded-2xl p-4 sm:p-5 space-y-4', 'aria-labelledby': 'ratio-teacher-heading', 'data-ratio-teacher': true, style: { background: panel, border: '2px dashed ' + accent } },
          h('h2', { id: 'ratio-teacher-heading', className: 'font-black' }, t('stem.ratios.teacher_title', 'Teacher tools')),
          h('p', { className: 'text-sm', style: { color: muted } }, t('stem.ratios.teacher_intro', 'Only teachers see this panel. Settings apply on this device right away.')),
          h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-4 gap-3' },
            h('label', { className: 'text-xs font-semibold', htmlFor: 'ratio-teacher-lock' }, t('stem.ratios.teacher_lock', 'Lock the mode'),
              h('select', { id: 'ratio-teacher-lock', value: teacher.lockMode || '', onChange: function(event) { setTeacher({ lockMode: event.target.value || null }); if (event.target.value) update({ mode: event.target.value }); }, className: 'block w-full rounded-lg px-3 py-2 text-sm mt-1', style: fieldStyle },
                h('option', { value: '' }, t('stem.ratios.teacher_lock_none', 'No lock: students choose')),
                modeOrder.map(function(id) { var item = MODES_L.filter(function(m) { return m.id === id; })[0]; return h('option', { key: id, value: id }, item.title); }))),
            h('label', { className: 'text-xs font-semibold', htmlFor: 'ratio-teacher-set' }, t('stem.ratios.teacher_problem_set', 'Problem set'),
              h('select', { id: 'ratio-teacher-set', value: teacher.problemSet, onChange: function(event) { setTeacher({ problemSet: event.target.value }); }, className: 'block w-full rounded-lg px-3 py-2 text-sm mt-1', style: fieldStyle },
                h('option', { value: 'both' }, t('stem.ratios.teacher_set_both', 'Students choose')),
                h('option', { value: 'fixed' }, t('stem.ratios.teacher_set_fixed', 'Lesson problems only')),
                h('option', { value: 'practice' }, t('stem.ratios.teacher_set_practice', 'Endless practice only')))),
            h('label', { className: 'text-xs font-semibold', htmlFor: 'ratio-teacher-band' }, t('stem.ratios.teacher_range', 'Practice range'),
              h('select', { id: 'ratio-teacher-band', value: teacher.band, onChange: function(event) { setTeacher({ band: event.target.value }); }, className: 'block w-full rounded-lg px-3 py-2 text-sm mt-1', style: fieldStyle },
                h('option', { value: 'auto' }, fill(t('stem.ratios.teacher_range_auto', "Match the student's grade ({band})"), { band: bandLabel(autoBand) })),
                BANDS.map(function(id) { return h('option', { key: id, value: id }, bandLabel(id)); }))),
            h('label', { className: 'text-xs font-semibold', htmlFor: 'ratio-teacher-mission' }, t('stem.ratios.teacher_lock_mission', 'Lock the mission'),
              h('select', { id: 'ratio-teacher-mission', value: teacher.lockMission || '', onChange: function(event) { setTeacher({ lockMission: event.target.value || null }); if (event.target.value) update({ missionTab: event.target.value }); }, className: 'block w-full rounded-lg px-3 py-2 text-sm mt-1', style: fieldStyle },
                h('option', { value: '' }, t('stem.ratios.teacher_lock_none', 'No lock: students choose')),
                missionOrder.map(function(id) { return h('option', { key: id, value: id }, missionInfo(id).title); }))),
            h('label', { className: 'flex items-center gap-2 text-sm font-semibold', style: { minHeight: 44 } },
              h('input', { type: 'checkbox', checked: teacher.allowReveal, onChange: function(event) { setTeacher({ allowReveal: event.target.checked }); }, style: { width: 20, height: 20, accentColor: accent } }),
              t('stem.ratios.teacher_allow_reveal', 'Allow the worked solution after two tries'))
          ),
          h('h3', { className: 'font-bold' }, t('stem.ratios.teacher_missed_title', 'Missed-items summary')),
          h('p', { className: 'text-sm', 'data-ratio-teacher-summary': true }, missLog.length
            ? fill(t('stem.ratios.teacher_missed_summary', '{misses} wrong attempts on {problems} problems; {solved} of those problems were solved later.'), { misses: misses.length, problems: missedIds.length, solved: laterSolved })
            : t('stem.ratios.teacher_missed_none', 'No missed attempts yet on this device.')),
          countRows.length > 0 && h('ul', { className: 'text-sm list-disc pl-5 space-y-1', 'aria-label': t('stem.ratios.teacher_misconception_counts', 'Misconceptions seen') }, countRows.map(function(key) {
            return h('li', { key: key }, fill(t('stem.ratios.teacher_count_item', '{name}: {n}'), { name: misconceptionLabel(key, t), n: counts[key] }));
          })),
          recent.length > 0 && h('div', { className: 'overflow-x-auto', tabIndex: 0, role: 'region', 'aria-label': t('stem.ratios.teacher_missed_table', 'Missed items') },
            h('table', { className: 'w-full text-xs border-collapse', 'data-ratio-teacher-table': true },
              h('caption', { className: 'text-left font-bold mb-2' }, t('stem.ratios.teacher_missed_table', 'Missed items')),
              h('thead', null, h('tr', null, [t('stem.ratios.teacher_col_problem', 'Problem'), t('stem.ratios.teacher_col_mode', 'Mode'), t('stem.ratios.teacher_col_answer', 'Answer given'), t('stem.ratios.teacher_col_misconception', 'Misconception'), t('stem.ratios.teacher_col_status', 'Status')].map(function(label, index) {
                return h('th', { key: index, scope: 'col', className: 'p-2 text-left', style: { borderBottom: '2px solid ' + border } }, label);
              }))),
              h('tbody', null, recent.map(function(entry, index) {
                var modeTitle = entry.mode === 'missions' ? missionInfo(String(entry.kind || '').replace(/^mission:/, '')).title : ((MODES_L.filter(function(item) { return item.id === entry.mode; })[0] || {}).title || '');
                var status = entry.accepted ? t('stem.ratios.teacher_status_accepted', 'Accepted with a note') : entry.solvedLater ? t('stem.ratios.teacher_status_solved', 'Solved later') : t('stem.ratios.teacher_status_open', 'Not solved yet');
                return h('tr', { key: index },
                  h('td', { className: 'p-2 align-top', style: { borderBottom: '1px solid ' + border } }, entry.prompt),
                  h('td', { className: 'p-2 align-top', style: { borderBottom: '1px solid ' + border } }, modeTitle),
                  h('td', { className: 'p-2 align-top font-mono', style: { borderBottom: '1px solid ' + border } }, entry.typed),
                  h('td', { className: 'p-2 align-top', style: { borderBottom: '1px solid ' + border } }, misconceptionLabel(entry.misconception, t)),
                  h('td', { className: 'p-2 align-top', style: { borderBottom: '1px solid ' + border } }, status));
              }))
            )
          ),
          missLog.length > 0 && (confirming
            ? h('div', { className: 'flex flex-wrap items-center gap-2', role: 'group', 'aria-label': t('stem.ratios.teacher_clear_confirm_group', 'Confirm clearing the summary') },
                h('p', { className: 'text-sm font-semibold' }, fill(t('stem.ratios.teacher_clear_confirm', 'Clear all {n} entries? This cannot be undone.'), { n: missLog.length })),
                h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm font-bold', style: buttonStyle, onClick: function() { update({ missLog: [], teacherConfirmClear: false }); announce(t('stem.ratios.teacher_cleared', 'Summary cleared.')); } }, t('stem.ratios.teacher_clear_yes', 'Yes, clear it')),
                h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm', style: buttonStyle, onClick: function() { update({ teacherConfirmClear: false }); } }, t('stem.ratios.cancel', 'Cancel')))
            : h('button', { type: 'button', className: 'rounded-lg px-3 py-2 text-sm', style: buttonStyle, onClick: function() { update({ teacherConfirmClear: true }); } }, t('stem.ratios.teacher_clear', 'Clear the summary')))
        );
      }

      // ---- The problem's model: table, number line, tape or graph ----
      function problemModelFor(problem) {
        var model = {
          'ratio-paint': [[t('stem.ratios.model_blue_paint_cups', 'Blue paint (cups)'),t('stem.ratios.model_white_paint_cups', 'White paint (cups)')], [[3,5],['?',20]]],
          'ratio-simplify': [[t('stem.ratios.model_first_quantity', 'First quantity'),t('stem.ratios.model_second_quantity', 'Second quantity')], [[18,24],['?','?']]],
          'ratio-scale': [[t('stem.ratios.model_first_quantity', 'First quantity'),t('stem.ratios.model_second_quantity', 'Second quantity')], [[7,4],['7 × 6','?']]],
          'line-tickets': [[t('stem.ratios.model_tickets', 'Tickets'),t('stem.ratios.model_cost', 'Cost ($)')], [[0,0],[5,15],[8,'?']]],
          'line-running': [[t('stem.ratios.model_distance_km', 'Distance (km)'),t('stem.ratios.model_time_min', 'Time (min)')], [[0,0],[3,18],[7,'?']]],
          'line-batches': [[t('stem.ratios.model_batches', 'Batches'),t('stem.ratios.model_flour_cups', 'Flour (cups)')], [[0,0],[2,5],[6,'?']]],
          'unit-snacks': [[t('stem.ratios.model_option', 'Option'),t('stem.ratios.model_mass_oz', 'Mass (oz)'),t('stem.ratios.model_price', 'Price ($)'),t('stem.ratios.model_price_per_oz', 'Price per oz')], [['A',12,'3.60','?'],['B',20,'5.40','?']]],
          'unit-speed': [[t('stem.ratios.model_distance_miles', 'Distance (miles)'),t('stem.ratios.model_time_hours', 'Time (hours)')], [[180,3],['?',1]]],
          'unit-printing': [[t('stem.ratios.model_printer', 'Printer'),t('stem.ratios.model_pages', 'Pages'),t('stem.ratios.model_minutes', 'Minutes'),t('stem.ratios.model_pages_per_minute', 'Pages per minute')], [['A',84,6,'?'],['B',105,7,'?']]],
          'percent-part': [[t('stem.ratios.model_part', 'Part'),t('stem.ratios.model_whole', 'Whole'),t('stem.ratios.model_percent', 'Percent')], [['?',240,'35%']]],
          'percent-rate': [[t('stem.ratios.model_part', 'Part'),t('stem.ratios.model_whole', 'Whole'),t('stem.ratios.model_percent', 'Percent')], [[45,180,'?']]],
          'percent-whole': [[t('stem.ratios.model_part', 'Part'),t('stem.ratios.model_whole', 'Whole'),t('stem.ratios.model_percent', 'Percent')], [[30,'?','20%']]],
          'prop-yes-table': [['x','y'], [[1,3],[2,6],[4,12]]],
          'prop-no-table': [['x','y'], [[1,4],[2,8],[3,13]]],
          'prop-origin': [['x','y'], [[0,0],[2,7],[4,14]]]
        }[problem.id];
        if (!model && problem.model) model = [problem.model.labels, problem.model.rows];
        return model || null;
      }
      // The student builds a table (one unknown in two columns) or a tape
      // from the problem's numbers. The model never fills in the unknown:
      // it stays "?" until a correct check, and Check reads the student's model.
      var problemModel = problemModelFor(challenge);
      var tableSpec = buildableTableSpec(problemModel, challenge);
      var tapeSpec = !tableSpec && challenge.tape && Array.isArray(challenge.tape.rows) && challenge.tape.rows.length ? challenge.tape : null;
      var modelBuild = plainObject(plainObject(d.modelBuild)[challenge.id]);
      var modelIdSafe = String(challenge.id).replace(/[^a-zA-Z0-9_-]/g, '-');
      function cellText(value) { return value == null ? '' : String(value).slice(0, 12); }
      function currentRows(m) {
        return (Array.isArray(m.rows) && m.rows.length ? m.rows : [['', '']]).slice(0, 6).map(function(row) { row = Array.isArray(row) ? row : []; return [cellText(row[0]), cellText(row[1])]; });
      }
      var buildRows = currentRows(modelBuild);
      var tapeUnits = tapeSpec ? tapeSpec.rows.map(function(row, i) { return clamp(Math.round(finiteNumber((Array.isArray(modelBuild.units) ? modelBuild.units : [])[i], 1)), 1, 24); }) : [];
      function setModelBuild(fn) {
        update(function(current) {
          var all = Object.assign({}, plainObject(current.modelBuild));
          var mine = plainObject(all[challenge.id]);
          delete all[challenge.id];
          var keys = Object.keys(all);
          if (keys.length >= 30) keys.slice(0, keys.length - 29).forEach(function(k) { delete all[k]; });
          all[challenge.id] = Object.assign({}, mine, fn(mine) || {});
          return { modelBuild: all };
        });
      }
      // What a check says about the student's own model. Nothing is said before a check.
      function modelCheckNote(answerRight) {
        if (tableSpec) {
          var report = checkModelTable(tableSpec, { rows: buildRows, find: modelBuild.find });
          if (!report.filled) return '';
          var parts = [], heldBack = false;
          report.rows.forEach(function(row) {
            var values = { n: row.index + 1, d: num(Math.abs(row.added || 0)) };
            // A row on the Find amount is a candidate answer: judging it would answer the problem.
            if (!answerRight && row.x != null && row.y != null && row.status !== 'given' && nearlyEqual(tableSpec.find.col === 1 ? row.x : row.y, tableSpec.find.known)) { heldBack = true; return; }
            if (row.status === 'incomplete') parts.push(fill(t('stem.ratios.model_note_incomplete', 'Row {n} needs both amounts.'), values));
            else if (row.status === 'swapped') parts.push(fill(t('stem.ratios.model_note_swapped', 'Row {n} has the two amounts in the wrong columns.'), values));
            else if (row.status === 'additive') parts.push(fill(row.added >= 0 ? t('stem.ratios.model_note_additive', 'Row {n} adds {d} to both amounts. Equal ratios multiply both amounts by the same number.') : t('stem.ratios.model_note_subtractive', 'Row {n} subtracts {d} from both amounts. Equal ratios divide both amounts by the same number.'), values));
            else if (row.status === 'notEquivalent') parts.push(fill(t('stem.ratios.model_note_not_equal', 'Row {n} does not keep the same ratio as the problem.'), values));
          });
          if (!report.hasGiven) parts.push(t('stem.ratios.model_note_no_given', "Put the problem's known pair in one row."));
          if (report.find === 'wrong') parts.push(t('stem.ratios.model_note_find_wrong', 'Check the Find row: it holds the amount the question gives.'));
          else if (report.find !== 'ok') parts.push(t('stem.ratios.model_note_no_find', 'Write the amount the question gives in the Find row.'));
          if (!parts.length) { if (heldBack) return ''; parts.push(t('stem.ratios.model_note_ok', 'Every row keeps the same ratio as the problem.')); }
          return t('stem.ratios.model_note_prefix', 'Your table:') + ' ' + parts.join(' ');
        }
        if (tapeSpec && modelBuild.touched) {
          var tapeCheck = checkModelTape(tapeSpec, tapeUnits);
          var list = tapeSpec.rows.map(function(row, i) { return fill(tapeCheck.got[i] === 1 ? t('stem.ratios.model_tape_row_one', '{label} 1 unit') : t('stem.ratios.model_tape_row', '{label} {n} units'), { label: row.label, n: tapeCheck.got[i] }); }).join(', ');
          return fill(tapeCheck.ok ? t('stem.ratios.model_tape_ok', 'Your tape diagram ({list}) matches the problem.') : t('stem.ratios.model_tape_off', 'Your tape diagram ({list}) does not match the problem yet. Read it again: how many equal units does each bar need?'), { list: list });
        }
        return '';
      }
      // A problem's two lines. Marks whose labels would touch step down a row, the same row on both lines so a
      // pair still reads straight down; phones get a narrower drawing so every label stays at 11 px or more.
      function drawAlignedLine(titleId, titleText, labels, marks, cell, scaffoldText, dataId) {
        if (phoneWidthNow()) return h(fitWidthComponent(React), { fallback: 300, render: function(boxWidth) { return alignedLineSvg(Math.max(140, Math.min(420, boxWidth)), titleId, titleText, labels, marks, cell, scaffoldText, dataId); } });
        return alignedLineSvg(0, titleId, titleText, labels, marks, cell, scaffoldText, dataId);
      }
      function alignedLineSvg(phoneW, titleId, titleText, labels, marks, cell, scaffoldText, dataId) {
        var phone = phoneW > 0, W = phone ? phoneW : 360, rowH = phone ? 20 : 24;
        var valueFont = phone ? 14 : 17, nameFont = phone ? 13 : 15, charW = phone ? 8.2 : 9.6;
        var domain = Math.max.apply(null, marks.map(function(row) { return finiteNumber(row[0], 0); }).concat([1]));
        var xAt = function(row) { return 35 + finiteNumber(row[0], 0) / domain * (W - 70); };
        var widthOf = function(value) { return String(cell(value)).length * charW + 4; };
        var rowOf = [], rowEnds = [];
        marks.map(function(row, index) { return { index: index, x: xAt(row), w: Math.max(widthOf(row[0]), widthOf(row[1])) }; })
          .sort(function(a, b) { return a.x - b.x || a.index - b.index; })
          .forEach(function(mark) {
            var r = 0;
            while (r < rowEnds.length && mark.x - mark.w / 2 < rowEnds[r]) r++;
            rowEnds[r] = mark.x + mark.w / 2;
            rowOf[mark.index] = r;
          });
        var extra = Math.max(0, rowEnds.length - 1) * rowH;
        var scaffoldLines = !scaffoldText ? [] : phone ? wrapTapeLabel(scaffoldText, Math.max(12, Math.floor((W - 8) / 6.6)), 6).lines : [scaffoldText];
        var hintRoom = phone ? Math.max(0, scaffoldLines.length - 1) * 16 : 0;
        var ys = [65, 170 + extra + hintRoom];
        return h('svg', { viewBox: '0 0 ' + W + ' ' + (220 + 2 * extra + hintRoom), role: 'img', 'aria-labelledby': titleId, style: phone ? { width: '100%', maxWidth: W, display: 'block' } : { width: '100%', minWidth: 240, maxWidth: 560, display: 'block' }, 'data-linked-ratio-line': dataId },
          h('title', { id: titleId }, titleText),
          [0, 1].map(function(axis) {
            var y = ys[axis];
            return h('g', { key: axis },
              h('text', { x: phone ? 4 : 25, y: y - 25, fill: text, fontSize: nameFont, fontWeight: 700 }, labels[axis]),
              h('line', { x1: 25, y1: y, x2: W - 15, y2: y, stroke: accent, strokeWidth: 3 }),
              marks.map(function(row, index) {
                var x = xAt(row), half = widthOf(row[axis]) / 2;
                return h('g', { key: index },
                  h('line', { x1: x, x2: x, y1: y - 8, y2: y + 8, stroke: accent, strokeWidth: 2 }),
                  h('text', { x: Math.max(half, Math.min(W - half, x)), y: y + 28 + rowOf[index] * rowH, fill: text, textAnchor: 'middle', fontSize: valueFont, fontWeight: 700 }, cell(row[axis])));
              }));
          }),
          marks.map(function(row, index) { var x = xAt(row); return h('line', { key: index, x1: x, x2: x, y1: 99 + extra, y2: 130 + extra + hintRoom, stroke: muted, strokeDasharray: '4 4' }); }),
          scaffoldLines.length > 0 && h('text', { x: W / 2, y: (phone ? 120 : 118) + extra, textAnchor: 'middle', fill: text, fontSize: phone ? 12 : 13, fontWeight: 700, 'data-line-scaffold': true },
            scaffoldLines.length === 1 ? scaffoldLines[0] : scaffoldLines.map(function(line, i) { return h('tspan', { key: i, x: W / 2, dy: i ? 16 : 0 }, line); })));
      }
      // The student's table drawn as a double number line.
      function renderModelLine(spec, marks, showScaffold) {
        var scaffold = showScaffold ? numberLineScaffold(problemModel, challenge, t) : null;
        if (scaffold && !challengeSolved && !challengeRevealed && nearlyEqual(scaffold.shown, finiteNumber(challenge.answer, NaN))) scaffold = null;
        var scaffoldText = scaffold ? scaffold.text : '';
        var placed = marks.filter(function(row) { return !(row[0] === 0 && row[1] === 0); });
        var described = placed.length
          ? placed.map(function(row) { return fill(t('stem.ratios.model_line_pair', '{top} lines up with {bottom}'), { top: num(row[0]), bottom: row[1] === '?' ? '?' : num(row[1]) }); }).join('; ') + '.'
          : t('stem.ratios.model_line_empty', 'No marks yet: fill in your table to place them.');
        return h('div', { className: 'overflow-x-auto', tabIndex: 0, role: 'region', 'aria-label': t('stem.ratios.aligned_line_region', 'Aligned quantities on a double number line') },
          drawAlignedLine('ratio-model-title-' + modelIdSafe, spec.labels.join(' / ') + '. ' + t('stem.ratios.model_line_description', 'Your table drawn as a double number line: marks that line up are equal ratios.') + ' ' + described + (scaffoldText ? ' ' + scaffoldText : ''),
            spec.labels, marks, function(value) { return value === '?' ? '?' : num(value); }, scaffoldText, challenge.id));
      }
      function renderTableBuilder(spec) {
        var report = checkModelTable(spec, { rows: buildRows, find: modelBuild.find });
        var checkedOnce = modelBuild.checked === true || challengeSolved || challengeRevealed;
        var unknownCol = spec.find.col;
        var cellStyle = { borderColor: border, background: panel, color: text };
        var fieldStyle = Object.assign({ minHeight: 44, minWidth: 0, width: '100%' }, inputStyle);
        function cellId(row, col) { return 'ratio-model-cell-' + modelIdSafe + '-' + row + '-' + col; }
        function setCell(rowIndex, col, value) {
          var v = cellText(value);
          setModelBuild(function(m) { var rows = currentRows(m); while (rows.length <= rowIndex) rows.push(['', '']); rows[rowIndex][col] = v; return { rows: rows }; });
        }
        var answerShown = challengeSolved ? canonicalChallengeAnswer(challenge) : '?';
        var findValue = parseNumberWithFraction(modelBuild.find);
        var marks = [];
        if (spec.line) {
          if (spec.zero) marks.push([0, 0]);
          report.rows.forEach(function(row) { if (row.x != null && row.y != null && row.x >= 0 && row.y >= 0) marks.push([row.x, row.y]); });
          if (findValue != null && findValue >= 0 && unknownCol === 1) marks.push([findValue, challengeSolved ? finiteNumber(challenge.answer, '?') : '?']);
        }
        return h('div', { className: 'space-y-3 mt-3', 'data-ratio-model-builder': challenge.id },
          h('p', { className: 'text-sm' }, t('stem.ratios.model_build_intro', 'Build the problem as a table. Type the pair the problem gives in a row, then the amount the question gives in the Find row. The ? is what you are finding: it stays a ? until you check your answer.')),
          h('div', { className: 'overflow-x-auto' }, h('table', { className: 'text-sm border-collapse', 'data-ratio-model-table': challenge.id, style: { width: '100%' } },
            h('caption', { className: 'text-left mb-2 font-bold', style: { color: text } }, t('stem.ratios.model_table_caption', 'Your table for this problem')),
            h('thead', null, h('tr', null,
              h('th', { scope: 'col', className: 'border p-2 text-left', style: cellStyle }, t('stem.ratios.model_col_row', 'Row')),
              spec.labels.map(function(label, i) { return h('th', { key: i, scope: 'col', className: 'border p-2 text-left', style: cellStyle }, label); }))),
            h('tbody', null,
              buildRows.map(function(row, r) {
                var info = report.rows[r] || {};
                var factorText = (challengeSolved || challengeRevealed) && info.factor != null && !nearlyEqual(info.factor, 1) ? ' ' + fill(t('stem.ratios.model_row_factor', '(× {f})'), { f: formatSignificantNumber(info.factor, 4) }) : '';
                return h('tr', { key: r, 'data-model-row': r },
                  h('th', { scope: 'row', className: 'border p-2 text-left whitespace-nowrap', style: cellStyle }, fill(t('stem.ratios.model_row_n', 'Row {n}'), { n: r + 1 }) + factorText),
                  [0, 1].map(function(col) {
                    return h('td', { key: col, className: 'border p-1', style: cellStyle },
                      h('input', { id: cellId(r, col), type: 'text', inputMode: 'decimal', value: row[col], autoComplete: 'off', 'data-model-cell': r + ':' + col,
                        'aria-label': fill(t('stem.ratios.model_cell_label', 'Row {n}, {label}'), { n: r + 1, label: spec.labels[col] }),
                        onChange: function(event) { setCell(r, col, event.target.value); }, className: 'rounded-lg px-2 py-2 font-mono', style: fieldStyle }));
                  }));
              }),
              h('tr', { 'data-model-find-row': true },
                h('th', { scope: 'row', className: 'border p-2 text-left', style: cellStyle }, t('stem.ratios.model_find_row', 'Find')),
                [0, 1].map(function(col) {
                  if (col === unknownCol) {
                    return h('td', { key: col, className: 'border p-2 font-mono font-black text-center', style: cellStyle, 'data-model-unknown': challengeSolved ? 'solved' : 'open' },
                      h('span', { 'aria-hidden': 'true' }, answerShown),
                      h('span', { style: srOnlyStyle }, challengeSolved
                        ? fill(t('stem.ratios.model_unknown_solved', '{label}: {value}, solved.'), { label: spec.labels[col], value: answerShown })
                        : fill(t('stem.ratios.model_unknown_open', '{label}: the unknown you are finding.'), { label: spec.labels[col] })));
                  }
                  return h('td', { key: col, className: 'border p-1', style: cellStyle },
                    h('input', { id: cellId('find', col), type: 'text', inputMode: 'decimal', value: cellText(modelBuild.find), autoComplete: 'off', 'data-model-find': true,
                      'aria-label': fill(t('stem.ratios.model_find_label', 'Find row, {label}'), { label: spec.labels[col] }),
                      onChange: function(event) { var v = cellText(event.target.value); setModelBuild(function() { return { find: v }; }); }, className: 'rounded-lg px-2 py-2 font-mono', style: fieldStyle }));
                })))
          )),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { id: 'ratio-model-add-' + modelIdSafe, type: 'button', 'data-model-add-row': true, 'aria-disabled': buildRows.length >= 6 ? 'true' : undefined, onClick: function() {
              if (buildRows.length >= 6) { announce(t('stem.ratios.model_rows_full', 'The table has room for 6 rows.')); return; }
              var n = buildRows.length + 1;
              setModelBuild(function(m) { var rows = currentRows(m); rows.push(['', '']); return { rows: rows }; });
              announce(fill(t('stem.ratios.model_row_added', 'Row {n} added.'), { n: n }));
              focusLater(cellId(n - 1, 0));
            }, className: 'rounded-lg px-3 py-2 text-sm font-bold', style: buttonStyle }, t('stem.ratios.model_add_row', 'Add a row')),
            buildRows.length > 1 && h('button', { type: 'button', 'data-model-remove-row': true, onClick: function() {
              var n = buildRows.length;
              setModelBuild(function(m) { var rows = currentRows(m); rows.pop(); return { rows: rows.length ? rows : [['', '']] }; });
              announce(fill(t('stem.ratios.model_row_removed', 'Row {n} removed.'), { n: n }));
              focusLater('ratio-model-add-' + modelIdSafe);
            }, className: 'rounded-lg px-3 py-2 text-sm', style: buttonStyle }, t('stem.ratios.model_remove_row', 'Remove the last row'))),
          spec.line && renderModelLine(spec, marks, checkedOnce));
      }
      function renderTapeBuilder(spec) {
        function setUnits(i, next) {
          if (next < 1 || next > 24) return;
          setModelBuild(function(m) {
            var units = spec.rows.map(function(row, j) { return clamp(Math.round(finiteNumber((Array.isArray(m.units) ? m.units : [])[j], 1)), 1, 24); });
            units[i] = next;
            return { units: units, touched: true };
          });
          announce(fill(next === 1 ? t('stem.ratios.model_units_now_one', '{label}: 1 unit.') : t('stem.ratios.model_units_now', '{label}: {n} units.'), { label: spec.rows[i].label, n: next }));
        }
        var solvedText = challengeSolved ? (challenge.prefix === '$' ? '$' : '') + canonicalChallengeAnswer(challenge) + (challenge.suffix === '%' ? '%' : '') : null;
        var unitIsAnswer = spec.unitText === '?' && spec.rows.some(function(row) { return row.units === 1 && row.text === '?'; });
        var drawn = Object.assign({ title: t('stem.ratios.problem_tape_title', 'Tape diagram for this problem') }, spec, {
          rows: spec.rows.map(function(row, i) { return Object.assign({}, row, { units: tapeUnits[i], text: row.text === '?' && solvedText ? solvedText : row.text }); }),
          unitText: unitIsAnswer && solvedText ? solvedText : spec.unitText
        });
        var smallButton = Object.assign({}, buttonStyle, { minWidth: 44 });
        return h('div', { className: 'space-y-3 mt-3', 'data-ratio-tape-builder': challenge.id },
          h('p', { className: 'text-sm' }, t('stem.ratios.model_tape_intro', 'Build the tape diagram: give each bar the number of equal units the problem describes. The ? is what you are finding: it stays a ? until you check your answer.')),
          h('div', { className: 'space-y-2', role: 'group', 'aria-label': t('stem.ratios.model_tape_group', 'Units in each bar') }, spec.rows.map(function(row, i) {
            var n = tapeUnits[i];
            return h('div', { key: i, className: 'flex flex-wrap items-center gap-2', 'data-tape-units-row': i },
              h('span', { className: 'text-sm font-bold', style: { minWidth: 110 } }, row.label),
              h('button', { type: 'button', 'data-tape-fewer': i, 'aria-label': fill(t('stem.ratios.model_fewer_units', 'Fewer units in {label}'), { label: row.label }), 'aria-disabled': n <= 1 ? 'true' : undefined, onClick: function() { setUnits(i, n - 1); }, className: 'rounded-lg font-black text-lg', style: smallButton }, '−'),
              h('span', { className: 'font-mono font-bold text-sm', 'data-tape-units': i, style: { minWidth: 64, textAlign: 'center' } }, fill(n === 1 ? t('stem.ratios.model_units_one', '1 unit') : t('stem.ratios.model_units_count', '{n} units'), { n: n })),
              h('button', { type: 'button', 'data-tape-more': i, 'aria-label': fill(t('stem.ratios.model_more_units', 'More units in {label}'), { label: row.label }), 'aria-disabled': n >= 24 ? 'true' : undefined, onClick: function() { setUnits(i, n + 1); }, className: 'rounded-lg font-black text-lg', style: smallButton }, '+'));
          })),
          renderTape(drawn, 'ratio-problem-tape-' + modelIdSafe));
      }
      // Open by default. Tables and tapes are built by the student; other
      // models (comparisons, percents, graphs) show the givens with "?".
      function renderProblemModel() {
        var model = problemModel;
        if (!model && !challenge.tape && !challenge.graph) return null;
        var idSafe = modelIdSafe;
        var built = tableSpec ? renderTableBuilder(tableSpec) : tapeSpec ? renderTapeBuilder(tapeSpec) : null;
        return h('details', { key: challenge.id, open: true, className: 'rounded-xl border p-3', 'data-ratio-problem-model': challenge.id, 'data-model-build': tableSpec ? 'table' : tapeSpec ? 'tape' : 'view', style: { borderColor: border } },
          h('summary', { className: 'cursor-pointer text-sm font-bold', style: { minHeight: 24 } }, t('stem.ratios.model_this_problem', 'Model this problem')),
          built,
          !built && model && challenge.line && h('div', { className: 'overflow-x-auto mt-3', tabIndex: 0, role: 'region', 'aria-label': t('stem.ratios.aligned_line_region', 'Aligned quantities on a double number line') },
            drawAlignedLine('ratio-model-title-' + idSafe, model[0].join(' / ') + '. ' + t('stem.ratios.aligned_line_description', 'Vertically aligned marks represent equivalent quantities. The missing value remains a question mark.'),
              model[0], model[1], function(value) { return value === '?' ? '?' : (typeof value === 'number' ? num(value) : value); }, '', challenge.id)),
          // The factor in "Scale 7:4 by a factor of 6" is given in the prompt.
          !built && challenge.id === 'ratio-scale' && model && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3', 'data-ratio-scaling': challenge.id }, model[0].map(function(label, index) {
            return h('div', { key: index, className: 'rounded-lg border p-3', style: { background: panel, color: text, borderColor: border } },
              h('p', { className: 'text-xs font-bold mb-2' }, label),
              h('p', { className: 'text-base font-mono font-bold' }, model[1][0][index] + '  → × 6 →  ' + model[1][1][index]));
          })),
          !built && challenge.tape && h('div', { className: 'mt-3' }, renderTape(Object.assign({ title: t('stem.ratios.problem_tape_title', 'Tape diagram for this problem') }, challenge.tape), 'ratio-problem-tape-' + idSafe)),
          !built && challenge.graph && h('div', { className: 'mt-3' }, renderMiniGraph(challenge.graph, 'ratio-problem-graph-' + idSafe)),
          !built && model && h('div', { className: 'overflow-x-auto mt-3' }, h('table', { className: 'w-full text-sm border-collapse' },
            h('caption', { className: 'text-left mb-2', style: { color: text } }, t('stem.ratios.known_and_unknown', 'Known quantities and the unknown (?)')),
            h('thead', null, h('tr', null, model[0].map(function(label, i) { return h('th', { key: i, scope: 'col', className: 'border p-2 text-left', style: { color: text, background: panel, borderColor: border } }, label); }))),
            h('tbody', null, model[1].map(function(row, i) { return h('tr', { key: i }, row.map(function(value, j) { return h('td', { key: j, className: 'border p-2 font-mono', style: { color: text, background: panel, borderColor: border } }, typeof value === 'number' ? num(value) : value); })); }))
          )),
          h('p', { className: 'mt-2 text-sm' }, t('stem.ratios.model_reasoning_prompt', 'What stays constant? Use the same multiplier or divisor for both quantities. For unit rates, compare one unit; for percents, identify the whole.'))
        );
      }

      // ---- Prediction before solving ----
      function renderProblemPrediction() {
        var spec = challenge.predict;
        if (!spec || !Array.isArray(spec.options)) return null;
        var settled = challengeSolved || challengeRevealed;
        var chosen = spec.options.filter(function(option) { return option.id === prediction; })[0];
        return h('fieldset', { className: 'rounded-xl p-3 space-y-2', 'data-ratio-problem-prediction': challenge.id, 'data-prediction-needed': predictionRequired && !prediction && !predictionLocked ? 'true' : undefined, style: { background: panel, border: '1px solid ' + border, minWidth: 0 } },
          h('legend', { className: 'px-1 text-sm font-bold' }, spec.question),
          h('p', { className: 'text-xs', style: { color: muted } }, predictionRequired ? t('stem.ratios.prediction_required', 'Commit to a prediction before you check. It locks after your first check.') : t('stem.ratios.prediction_optional', 'Optional: commit to a prediction first. It locks after your first check.')),
          h('div', { className: 'flex flex-wrap gap-2' }, spec.options.map(function(option) {
            return h('label', { key: option.id, className: 'rounded-lg px-3 py-2 flex items-center gap-2 text-sm', style: Object.assign({}, buttonStyle, predictionLocked ? { opacity: 0.85 } : null) },
              h('input', { type: 'radio', name: 'ratio-problem-predict', value: 'predict-' + option.id, checked: prediction === option.id, disabled: predictionLocked, onChange: function() { setPrediction(option.id); }, style: { accentColor: accent } }), option.label);
          })),
          settled && h('p', { className: 'text-sm font-semibold', 'data-ratio-prediction-verdict': true },
            !chosen ? fill(t('stem.ratios.prediction_none', 'You did not make a prediction. {why}'), { why: spec.why })
              : chosen.id === spec.correct ? fill(t('stem.ratios.prediction_right', 'Your prediction was right. {why}'), { why: spec.why })
              : fill(t('stem.ratios.prediction_wrong', 'Your prediction did not match. {why}'), { why: spec.why }))
        );
      }

      // ---- Worked example of a parallel problem; steps fade as the student masters the kind ----
      function renderWorkedExample() {
        var sibling = workedSibling(challenge, band, t);
        if (!sibling || !Array.isArray(sibling.steps) || !sibling.steps.length) return null;
        var total = sibling.steps.length;
        var fade = Math.min(total, kindCorrect);
        var shown = total - fade;
        return h('details', { key: 'worked-' + challenge.id, className: 'rounded-xl border p-3', 'data-ratio-worked-example': challenge.kind, 'data-fade-level': fade, style: { borderColor: border } },
          h('summary', { className: 'cursor-pointer text-sm font-bold', style: { minHeight: 24 } }, t('stem.ratios.worked_example_summary', 'Worked example: a similar problem')),
          h('p', { className: 'text-sm mt-2 font-semibold' }, sibling.prompt),
          h('ol', { className: 'mt-2 space-y-2 text-sm list-decimal pl-5' }, sibling.steps.map(function(item, index) {
            var visible = index < shown;
            return h('li', { key: index, 'data-worked-step': visible ? 'shown' : 'faded' },
              h('span', { className: 'font-semibold' }, item.q), ' ',
              visible ? h('span', null, item.a) : h('span', { style: { color: muted } }, t('stem.ratios.worked_your_turn', 'Your turn: work out this step on your own problem.')));
          })),
          h('p', { className: 'text-xs mt-2', style: { color: muted } }, fade >= total
            ? t('stem.ratios.worked_fully_faded', 'You have solved several of these, so every step is now yours. The hints are still there if you need them.')
            : fade > 0 ? t('stem.ratios.worked_fading', 'Each problem of this kind you solve hides one more step of the example.')
            : t('stem.ratios.worked_full', 'This example shows every step. As you solve problems of this kind, the steps fade so you do more of the work.'))
        );
      }

      function renderSolution() {
        if (!challengeRevealed || challengeSolved) return null;
        return h('section', { className: 'rounded-xl p-3 space-y-2', 'aria-labelledby': 'ratio-solution-heading', 'data-ratio-solution': challenge.id, style: { background: panel, border: '1px solid ' + warning } },
          h('h3', { id: 'ratio-solution-heading', className: 'text-sm font-bold' }, t('stem.ratios.solution_heading', 'Worked solution')),
          h('ol', { className: 'space-y-1 text-sm list-decimal pl-5' }, (challenge.steps || []).map(function(item, index) {
            return h('li', { key: index }, h('span', { className: 'font-semibold' }, item.q), ' ', item.a);
          })),
          h('p', { className: 'text-sm font-bold' }, fill(t('stem.ratios.solution_answer', 'Answer: {answer}'), { answer: answerWithUnit(challenge) })),
          h('p', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.solution_no_credit', 'Because the solution was shown, this problem will not count as solved. Try a new one.'))
        );
      }

      // ---- Unit Converter handoff (fills only its conversion inputs) ----
      function unitLinkButton(link, idKey) {
        if (!link || link.tool !== 'unitConvert') return null;
        return h('button', { type: 'button', key: 'unit-' + idKey, 'data-ratio-unit-link': idKey, onClick: function() { openTool('unitConvert', t('stem.ratios.unit_converter', 'Unit Converter'), function(previous) { return unitConvertHandoff(previous, link); }); }, className: 'rounded-lg px-3 py-2 text-sm font-bold', style: buttonStyle },
          fill(t('stem.ratios.unit_link', 'Convert {value} {from} to {to} in the Unit Converter'), { value: num(link.value), from: link.from, to: link.to }));
      }

      // ---- AI hint: only through the host's guarded ctx.getHint, after two tries ----
      var aiAvailable = typeof ctx.getHint === 'function' && ctx.aiHintsEnabled !== false && ctx.aiAvailable !== false; // AI-off: hidden when text AI is unusable
      var aiHints = plainObject(d.aiHints), aiAsked = plainObject(d.aiHintAsked);
      function askAiHint(id, question, wrong, correct, tries) {
        if (!aiAvailable) return;
        function mark(value) { update(function(current) { var asked = Object.assign({}, plainObject(current.aiHintAsked)); asked[id] = value; return { aiHintAsked: asked }; }); }
        mark('asked');
        announce(t('stem.ratios.ai_hint_asked', 'Asking for an AI hint. The hints above always work too.'));
        try {
          ctx.getHint('ratioLab', String(question || ''), String(wrong == null ? '' : wrong), String(correct == null ? '' : correct), tries, function(text) {
            var clean = String(text == null ? '' : text).trim().slice(0, 600);
            if (!clean) return;
            update(function(current) { var all = Object.assign({}, plainObject(current.aiHints)); all[id] = clean; return { aiHints: all }; });
            announce(clean);
          });
        } catch (error) {
          mark('failed');
          announce(t('stem.ratios.ai_hint_unavailable', 'The AI hint is not available right now. Use the hints above.'));
        }
      }
      function renderAiHint(id, question, wrong, correct, tries, settled) {
        var text = typeof aiHints[id] === 'string' ? aiHints[id] : '';
        if (text) return h('p', { key: 'ai-' + id, role: 'status', 'aria-live': 'polite', 'data-ratio-ai-hint': id, className: 'rounded-lg p-3 text-sm', style: { background: panel, border: '1px dashed ' + accent } }, text);
        if (!aiAvailable || tries < 2 || settled) return null;
        var state = aiAsked[id];
        if (state === 'failed') return h('p', { key: 'ai-' + id, role: 'status', className: 'text-sm', 'data-ratio-ai-hint-state': 'failed', style: { color: muted } }, t('stem.ratios.ai_hint_unavailable', 'The AI hint is not available right now. Use the hints above.'));
        if (state) return h('p', { key: 'ai-' + id, role: 'status', className: 'text-sm', 'data-ratio-ai-hint-state': 'waiting', style: { color: muted } }, t('stem.ratios.ai_hint_waiting', 'If an AI hint is available, it appears here. The hints above always work.'));
        return h('button', { key: 'ai-' + id, type: 'button', 'data-ratio-ai-ask': id, onClick: function() { askAiHint(id, question, wrong, correct, tries); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: buttonStyle }, t('stem.ratios.ai_hint_ask', 'Ask for an AI hint'));
      }

      // ---- Missions: scale drawings, mixtures, recipes, proportional detective ----
      var missionsState = plainObject(d.missions);
      var missionTab = teacher.lockMission || (missionOrder.indexOf(d.missionTab) >= 0 ? d.missionTab : missionOrder[0]);
      var missionsDone = plainObject(d.missionsDone), missionXp = plainObject(d.missionXp);
      function missionInfo(id) {
        if (id === 'mixture') return { title: t('stem.ratios.ms_mixture_title', 'Mixtures: which is stronger?'), short: t('stem.ratios.ms_mixture_short', 'Mixtures'), goal: t('stem.ratios.ms_mixture_goal', 'Decide which mix is stronger by comparing each part to its whole mix, using tape diagrams. (6.RP.3)') };
        if (id === 'recipe') return { title: t('stem.ratios.ms_recipe_title', 'Recipe scaling'), short: t('stem.ratios.ms_recipe_short', 'Recipes'), goal: t('stem.ratios.ms_recipe_goal', 'Scale a real recipe by a fraction factor in a ratio table. (6.RP.3, 7.RP.1)') };
        if (id === 'detective') return { title: t('stem.ratios.ms_detective_title', 'Proportional relationship detective'), short: t('stem.ratios.ms_detective_short', 'Detective'), goal: t('stem.ratios.ms_detective_goal', 'Decide "proportional or not" for tables, graphs and stories, and name the evidence that settles each case. (7.RP.2)') };
        return { title: t('stem.ratios.ms_scale_title', 'Scale drawings'), short: t('stem.ratios.ms_scale_short', 'Scale drawings'), goal: t('stem.ratios.ms_scale_goal', 'Find real lengths and areas from a floor plan, then redraw it at a new scale. (7.G.1)') };
      }
      // Hint 1 for every step of a mission: its strategy, never the answer.
      function missionStrategy(id) {
        if (id === 'mixture') return t('stem.ratios.ms_hint_mixture', 'Compare each part to its whole mix, not to the other part. Equal shares of the whole taste the same.');
        if (id === 'recipe') return t('stem.ratios.ms_hint_recipe', 'Find the scale factor first: new servings ÷ old servings. Then multiply every amount by that same factor.');
        if (id === 'detective') return t('stem.ratios.ms_hint_detective', 'Check every row or point, not just one. A single exception is enough to say "not proportional".');
        return t('stem.ratios.ms_hint_scale', 'One unit on the plan stands for a fixed number of real units. Find real lengths first, then use them for anything else.');
      }
      function missionState(id) { return plainObject(missionsState[id]); }
      function missionSeedOf(id) { var s = finiteNumber(missionState(id).seed, null); return s != null && s >= 1 ? Math.floor(s) : (hashString('mission-start:' + id) || 1); }
      function updateMission(id, fn) {
        update(function(current) {
          var all = Object.assign({}, plainObject(current.missions));
          var m = plainObject(all[id]);
          all[id] = Object.assign({}, m, fn(m) || {});
          return { missions: all };
        });
      }
      function subMap(m, key) { return plainObject(m[key]); }
      function missionStepKey(mission, step) { return 'mission-' + mission.id + '-' + mission.seed + '-' + step.id; }
      function setMissionFeedback(mission, step, entry) {
        updateMission(mission.id, function(m) { var fbs = Object.assign({}, subMap(m, 'fb')); fbs[step.id] = entry; return { fb: fbs }; });
      }
      function missionPredictLocked(mission, m) {
        var tries = subMap(m, 'tries'), solved = subMap(m, 'solved'), revealed = subMap(m, 'revealed');
        return mission.steps.some(function(s) { return s.needsPredict && (finiteNumber(tries[s.id], 0) > 0 || solved[s.id] || revealed[s.id]); });
      }
      function checkMissionStep(mission, step) {
        var m = missionState(mission.id);
        var solved = subMap(m, 'solved'), revealed = subMap(m, 'revealed'), tries = subMap(m, 'tries'), ans = subMap(m, 'ans');
        if (solved[step.id]) return;
        var typed, result, question;
        if (step.detective) {
          var c = step.detective;
          result = checkDetectiveAnswer(c, ans[step.id + ':v'], ans[step.id + ':e'], t);
          typed = String(ans[step.id + ':v'] || '') + ' / ' + (ans[step.id + ':e'] ? detectiveEvidenceLabel(ans[step.id + ':e'], t) : '');
          question = c.text;
          if (!result.complete) { setMissionFeedback(mission, step, { correct: false, message: result.message }); announce(result.message); return; }
        } else {
          typed = ans[step.id] == null ? '' : String(ans[step.id]);
          question = step.problem.prompt;
          if (!normalizeAnswer(typed)) {
            var empty = step.choices ? t('stem.ratios.ms_choose_first', 'Choose an answer before checking.') : t('stem.ratios.enter_an_answer_before_checking', 'Enter an answer before checking.');
            setMissionFeedback(mission, step, { correct: false, message: empty }); announce(empty); return;
          }
          if (step.needsPredict && mission.predict && typeof m.predict !== 'string') {
            var predictFirst = t('stem.ratios.ms_predict_first', 'Make your prediction at the top of the mission before you check.');
            setMissionFeedback(mission, step, { correct: false, message: predictFirst }); announce(predictFirst); return;
          }
          // The comparison's feedback and the share tapes show both fractions,
          // so it opens only once steps 1 and 2 are settled.
          if (mission.id === 'mixture' && step.id === 'compare' && !((solved.fracA || revealed.fracA) && (solved.fracB || revealed.fracB))) {
            var fractionsFirst = t('stem.ratios.ms_mx_fractions_first', 'Find both fractions in steps 1 and 2 first, then compare them here.');
            setMissionFeedback(mission, step, { correct: false, message: fractionsFirst }); announce(fractionsFirst); return;
          }
          if (challengeIsCorrect(step.problem, typed, { strictUnits: strictUnits })) result = { correct: true };
          else {
            var unitProblem = strictUnits ? challengeUnitProblem(step.problem, typed) : null;
            var numberRight = !!unitProblem && challengeIsCorrect(step.problem, typed);
            var diag = diagnoseRatioAnswer(step.problem, typed, t);
            result = { correct: false, kind: numberRight ? 'unit' : (diag ? diag.kind : (unitProblem ? 'unit' : 'other')),
              message: numberRight ? unitProblemText(unitProblem) : ((unitProblem ? unitProblemText(unitProblem) + ' ' : '') + (diag ? diag.message : step.problem.hint)) };
          }
        }
        var key = missionStepKey(mission, step);
        var explain = step.detective ? step.detective.evidenceNote : step.problem.explain;
        if (result.correct) {
          if (revealed[step.id]) {
            var copied = t('stem.ratios.correct_after_reveal', 'That matches the worked solution. It does not count as solved because the solution was shown. Try a new problem to earn credit.');
            setMissionFeedback(mission, step, { correct: true, message: copied }); announce(copied); return;
          }
          // A choice or verdict found after a wrong pick is solved, but by
          // elimination (a yes/no verdict is settled by one wrong pick), so the
          // mission no longer counts as done on your own.
          var guessed = subMap(m, 'guessed');
          var byElimination = !!(step.detective || step.choices) && finiteNumber(tries[step.id], 0) > 0;
          var finished = !byElimination && mission.steps.every(function(s) { return s.id === step.id || solved[s.id]; }) && !mission.steps.some(function(s) { return revealed[s.id] || guessed[s.id]; });
          var earnsXp = finished && !missionXp[mission.id];
          var message = t('stem.ratios.correct', 'Correct! ') + explain + (byElimination ? ' ' + t('stem.ratios.ms_choice_after_miss', 'This choice came after a wrong pick, so it does not count toward finishing the mission on your own.') : '');
          updateMission(mission.id, function(cur) {
            var done = Object.assign({}, subMap(cur, 'solved')); done[step.id] = true;
            var fbs = Object.assign({}, subMap(cur, 'fb')); fbs[step.id] = { correct: true, message: message };
            var patch = { solved: done, fb: fbs };
            // A solved detective case stays on screen with its feedback until the student moves on.
            if (step.detective) patch.caseIndex = mission.steps.indexOf(step);
            if (byElimination) { var gs = Object.assign({}, subMap(cur, 'guessed')); gs[step.id] = true; patch.guessed = gs; }
            return patch;
          });
          update(function(current) {
            var patch = { missLog: (Array.isArray(current.missLog) ? current.missLog : []).map(function(item) { return item && item.id === key ? Object.assign({}, item, { solvedLater: true }) : item; }) };
            if (finished) { var flags = Object.assign({}, plainObject(current.missionsDone)); flags[mission.id + ':' + mission.seed] = true; patch.missionsDone = flags; }
            if (earnsXp) { var xpFlags = Object.assign({}, plainObject(current.missionXp)); xpFlags[mission.id] = true; patch.missionXp = xpFlags; }
            return patch;
          });
          announce(finished ? message + ' ' + t('stem.ratios.ms_complete', 'Mission complete!') : message);
          // The solved case's Check button is disabled now: keep focus on the way forward.
          if (step.detective) focusQueryLater(['[data-ratio-next-case]', '#ratio-case-dot-' + step.id]);
          if (earnsXp) {
            if (typeof ctx.awardXP === 'function') { try { ctx.awardXP('ratioLab', 10, t('stem.ratios.xp_mission', 'Ratio Lab mission complete')); } catch (error) {} }
            notify(t('stem.ratios.ms_xp_toast', 'Mission complete on your own! +10 XP'), 'success');
          }
          return;
        }
        var count = Math.max(0, Math.floor(finiteNumber(tries[step.id], 0))) + 1;
        var offerReveal = count >= 2 && teacher.allowReveal && !revealed[step.id];
        // The named diagnosis (or the step's hint) is the help the student sees.
        var wrongAnswerHelpForStep = result.message;
        var wrongText = t('stem.ratios.not_yet', 'Not yet. ') + wrongAnswerHelpForStep + (offerReveal ? ' ' + t('stem.ratios.try_again_or_reveal', 'Try again, or show the worked solution below.') : (count === 1 ? ' ' + t('stem.ratios.try_again', 'Try again.') : ''));
        var miss = { id: key, mode: 'missions', kind: 'mission:' + mission.id, band: null, seed: null, prompt: String(question || '').slice(0, 300), typed: String(typed).slice(0, 60), misconception: result.kind || 'other', accepted: false, at: Date.now() };
        updateMission(mission.id, function(cur) {
          var tr = Object.assign({}, subMap(cur, 'tries')); tr[step.id] = count;
          var fbs = Object.assign({}, subMap(cur, 'fb')); fbs[step.id] = { correct: false, message: wrongText, wrong: String(typed).slice(0, 60) };
          return { tries: tr, fb: fbs };
        });
        update(function(current) { return { missLog: (Array.isArray(current.missLog) ? current.missLog : []).concat([miss]).slice(-60) }; });
        announce(wrongText);
      }
      function revealMissionStep(mission, step) {
        var m = missionState(mission.id);
        if (!teacher.allowReveal || finiteNumber(subMap(m, 'tries')[step.id], 0) < 2) return;
        updateMission(mission.id, function(cur) { var shown = Object.assign({}, subMap(cur, 'revealed')); shown[step.id] = true; return { revealed: shown }; });
        announce(t('stem.ratios.solution_shown', 'Worked solution shown. This problem will not count as solved.'));
      }
      function newMission(id) {
        var current = missionSeedOf(id), seed = current;
        while (seed === current) seed = 1 + Math.floor(Math.random() * 2147483646);
        updateMission(id, function() { return { seed: seed, ans: {}, tries: {}, solved: {}, revealed: {}, guessed: {}, fb: {}, hint: {}, predict: null, caseIndex: null }; });
        announce(t('stem.ratios.ms_new_ready', 'New mission ready.'));
      }
      function radioGroup(name, legend, options, selected, disabled, onPick, attrs) {
        return h('fieldset', Object.assign({ className: 'space-y-1', style: { minWidth: 0, border: 0, padding: 0, margin: 0 } }, attrs || {}),
          h('legend', { className: 'text-xs font-bold mb-1' }, legend),
          h('div', { className: 'flex flex-wrap gap-2' }, options.map(function(option) {
            return h('label', { key: option.id, className: 'rounded-lg px-3 py-2 flex items-center gap-2 text-sm', style: Object.assign({}, buttonStyle, disabled ? { opacity: 0.85 } : null) },
              h('input', { type: 'radio', name: name, value: option.id, checked: selected === option.id, disabled: disabled, onChange: function() { onPick(option.id); }, style: { accentColor: accent } }), option.label);
          })));
      }
      function renderMissionPredict(mission) {
        var spec = mission.predict;
        if (!spec) return null;
        var m = missionState(mission.id), chosen = typeof m.predict === 'string' ? m.predict : null;
        var locked = missionPredictLocked(mission, m);
        var verdictStep = mission.steps.filter(function(s) { return s.id === mission.predictStep; })[0];
        var settled = verdictStep && (subMap(m, 'solved')[verdictStep.id] || subMap(m, 'revealed')[verdictStep.id]);
        var pick = spec.options.filter(function(o) { return o.id === chosen; })[0];
        return h('div', { className: 'rounded-lg p-3 space-y-2', 'data-ratio-mission-predict': mission.id, style: { background: panel, border: '1px solid ' + border } },
          radioGroup('ratio-ms-predict-' + mission.id, spec.question, spec.options, chosen, locked, function(id) { if (!locked) updateMission(mission.id, function() { return { predict: id }; }); }),
          h('p', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.prediction_required', 'Commit to a prediction before you check. It locks after your first check.')),
          settled && h('p', { className: 'text-sm font-semibold', 'data-ratio-mission-predict-verdict': mission.id },
            !pick ? fill(t('stem.ratios.prediction_none', 'You did not make a prediction. {why}'), { why: spec.why })
              : pick.id === spec.correct ? fill(t('stem.ratios.prediction_right', 'Your prediction was right. {why}'), { why: spec.why })
              : fill(t('stem.ratios.prediction_wrong', 'Your prediction did not match. {why}'), { why: spec.why })));
      }
      function renderMissionStep(mission, step, index) {
        var m = missionState(mission.id);
        var solved = !!subMap(m, 'solved')[step.id], revealed = !!subMap(m, 'revealed')[step.id];
        var tries = Math.max(0, Math.floor(finiteNumber(subMap(m, 'tries')[step.id], 0)));
        var ans = subMap(m, 'ans'), fb = plainObject(subMap(m, 'fb')[step.id]);
        var hintStage = clamp(Math.floor(finiteNumber(subMap(m, 'hint')[step.id], 0)), 0, 2);
        var base = 'ratio-ms-' + mission.id + '-' + step.id;
        function setAns(key, value) {
          updateMission(mission.id, function(cur) { var a = Object.assign({}, subMap(cur, 'ans')); a[key] = value; var f = Object.assign({}, subMap(cur, 'fb')); delete f[step.id]; return { ans: a, fb: f }; });
        }
        var c = step.detective, problem = step.problem;
        var control;
        if (c) {
          control = h('div', { className: 'flex flex-col gap-3 w-full' },
            radioGroup(base + '-v', t('stem.ratios.dt_question', 'Is this relationship proportional?'), [{ id: 'yes', label: t('stem.ratios.yes', 'Yes') }, { id: 'no', label: t('stem.ratios.no', 'No') }], ans[step.id + ':v'] || null, solved, function(id) { setAns(step.id + ':v', id); }, { 'data-ratio-detective-verdict': step.id }),
            radioGroup(base + '-e', t('stem.ratios.dt_evidence_question', 'Which evidence settles it?'), c.evidenceOptions.map(function(id) { return { id: id, label: detectiveEvidenceLabel(id, t) }; }), ans[step.id + ':e'] || null, solved, function(id) { setAns(step.id + ':e', id); }, { 'data-ratio-detective-evidence': step.id }));
        } else if (step.choices) {
          control = radioGroup(base + '-choice', t('stem.ratios.ms_your_answer', 'Your answer'), step.choices, ans[step.id] || null, solved, function(id) { setAns(step.id, id); }, { 'data-ratio-mission-choice': step.id });
        } else {
          control = h('label', { htmlFor: base + '-input', className: 'flex-1', style: { minWidth: 160 } },
            h('span', { id: base + '-label', className: 'block text-xs font-bold mb-1' }, t('stem.ratios.ms_your_answer', 'Your answer')),
            h('span', { className: 'flex items-center rounded-lg', style: inputStyle },
              h('input', { id: base + '-input', type: 'text', inputMode: 'decimal', value: solved ? canonicalChallengeAnswer(problem) : (ans[step.id] == null ? '' : String(ans[step.id])), readOnly: solved, 'aria-readonly': solved, 'aria-labelledby': base + '-prompt ' + base + '-label', 'aria-describedby': fb.message ? base + '-fb' : undefined, 'aria-invalid': fb.message && !fb.correct ? 'true' : undefined, onChange: function(event) { if (!solved) setAns(step.id, event.target.value); }, className: 'ratio-challenge-answer w-full rounded-lg px-3 py-2 bg-transparent', style: { color: text, minHeight: 44, '--ratio-focus-color': accent } }),
              problem.suffix && h('span', { className: 'pr-3 text-xs font-bold', 'aria-hidden': 'true' }, problem.suffix)));
        }
        var answerText = c ? fill(t('stem.ratios.dt_solution', '{verdict}. Evidence: {evidence}.'), { verdict: c.proportional ? t('stem.ratios.yes', 'Yes') : t('stem.ratios.no', 'No'), evidence: detectiveEvidenceLabel(c.evidence, t) }) : answerWithUnit(problem);
        return h('div', { key: step.id, className: 'rounded-lg p-3 space-y-2', 'data-ratio-mission-step': step.id, 'data-solved': solved ? 'true' : 'false', style: { background: soft, border: '1px solid ' + (solved ? success : border) } },
          h('p', { id: base + '-prompt', className: 'text-sm font-semibold' }, fill(t('stem.ratios.ms_step_label', 'Step {n}: {text}'), { n: index + 1, text: c ? c.text : problem.prompt })),
          c && c.rows && h('table', { className: 'text-sm border-collapse', 'data-ratio-detective-table': step.id },
            h('caption', { className: 'text-left text-xs mb-1', style: { color: muted } }, t('stem.ratios.dt_table_caption', 'Table of values')),
            h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'border px-3 py-1', style: { borderColor: border } }, 'x'), h('th', { scope: 'col', className: 'border px-3 py-1', style: { borderColor: border } }, 'y'))),
            h('tbody', null, c.rows.map(function(row, i) { return h('tr', { key: i }, h('td', { className: 'border px-3 py-1 font-mono', style: { borderColor: border } }, num(row[0])), h('td', { className: 'border px-3 py-1 font-mono', style: { borderColor: border } }, num(row[1]))); }))),
          c && c.graph && renderMiniGraph(c.graph, base + '-graph'),
          h('form', { className: 'flex flex-wrap items-end gap-2', 'aria-labelledby': base + '-prompt', onSubmit: function(event) { event.preventDefault(); checkMissionStep(mission, step); } },
            control,
            h('button', { type: 'submit', disabled: solved, 'data-ratio-mission-check': step.id, className: 'rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-70', style: { background: accentStrong, color: accentText, border: isContrast ? '2px solid #ffffff' : 'none', minHeight: 44 } }, solved ? t('stem.ratios.solved_2', 'Solved') : t('stem.ratios.check_answer', 'Check answer'))),
          fb.message && h('p', { id: base + '-fb', role: 'status', 'aria-live': 'polite', 'data-ratio-mission-feedback': step.id, className: 'text-sm font-semibold', style: { color: fb.correct ? success : warning } }, fb.message),
          (solved || revealed) && c && h('p', { className: 'text-sm', 'data-ratio-detective-note': step.id }, c.evidenceNote),
          !solved && renderHintLadder(base + '-hints', hintStage, function() {
            var next = hintStage >= 2 ? 0 : hintStage + 1;
            updateMission(mission.id, function(cur) { var hs = Object.assign({}, subMap(cur, 'hint')); hs[step.id] = next; return { hint: hs }; });
            announce(next ? t('stem.ratios.hint_revealed', "Hint revealed.") : t('stem.ratios.hints_hidden', "Hints hidden."));
          }, missionStrategy(mission.id), c ? t('stem.ratios.g_dt_hint', 'Ask two questions: does 0 of x go with 0 of y, and is y ÷ x always the same?') : problem.hint,
            tries >= 2 && teacher.allowReveal && !revealed && h('button', { type: 'button', 'data-ratio-mission-reveal': step.id, onClick: function() { revealMissionStep(mission, step); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: soft, color: text, border: '1px solid ' + warning, minHeight: 44 } }, t('stem.ratios.show_solution', 'Show the worked solution'))),
          revealed && !solved && h('div', { className: 'rounded-lg p-3 space-y-1 text-sm', 'data-ratio-mission-solution': step.id, style: { background: panel, border: '1px solid ' + warning } },
            problem && h('ol', { className: 'list-decimal pl-5 space-y-1' }, (problem.steps || []).map(function(item, i) { return h('li', { key: i }, h('span', { className: 'font-semibold' }, item.q), ' ', item.a); })),
            h('p', { className: 'font-bold' }, fill(t('stem.ratios.solution_answer', 'Answer: {answer}'), { answer: answerText })),
            h('p', { className: 'text-xs', style: { color: muted } }, t('stem.ratios.ms_solution_no_credit', 'Because this step was shown, the mission will not count. Start a new mission to earn it.'))),
          renderAiHint(missionStepKey(mission, step), c ? c.text : problem.prompt, fb.wrong || '', c ? (c.proportional ? 'yes' : 'no') : canonicalChallengeAnswer(problem), tries, solved || revealed),
          solved && problem && problem.link && problem.link.tool === 'unitConvert' && unitLinkButton(problem.link, missionStepKey(mission, step)));
      }
      // Two mixes drawn with the same unit size, so a bigger mix is a longer bar.
      function renderMixTapes(mission, showShares) {
        var p = mission.params, juice = mission.juice;
        var mixes = [{ id: 'a', name: juice ? t('stem.ratios.ms_mix_a', 'Mix A') : t('stem.ratios.ms_paint_a', 'Paint A'), a: p.a, b: p.b }, { id: 'b', name: juice ? t('stem.ratios.ms_mix_b', 'Mix B') : t('stem.ratios.ms_paint_b', 'Paint B'), a: p.c, b: p.e }];
        var mixPhone = phoneWidthNow(), mixW = 500, mixBar = 360;
        var maxUnits = Math.max(p.a + p.b, p.c + p.e), unit = mixBar / maxUnits;
        var first = juice ? t('stem.ratios.tape_concentrate', 'Concentrate') : t('stem.ratios.tape_red', 'Red');
        var second = juice ? t('stem.ratios.tape_water', 'Water') : t('stem.ratios.tape_white', 'White');
        var desc = mixes.map(function(mix) { return fill(t('stem.ratios.ms_mix_desc', '{name}: {a} cups of {first} and {b} cups of {second}, {w} cups in all.'), { name: mix.name, a: num(mix.a), b: num(mix.b), w: num(mix.a + mix.b), first: first, second: second }); }).join(' ');
        var shareDesc = mixes.map(function(mix) { return fill(t('stem.ratios.ms_share_desc', '{name}: {first} is {frac} of the whole, about {pct}%.'), { name: mix.name, first: first, frac: fracText(mix.a, mix.a + mix.b), pct: num(roundTo(mix.a / (mix.a + mix.b) * 100, 1)) }); }).join(' ');
        var fillStrong = accentStrong;
        function mixLabel(name, x, y) {
          var w = wrapTapeLabel(name, 12, 2);
          return h('text', { x: x, y: w.lines.length > 1 ? y - 7 : y, fill: text, fontSize: 12, fontWeight: 700, 'data-tape-label': name },
            w.lines.map(function(line, i) { return h('tspan', { key: i, x: x, dy: i ? 14 : 0 }, line); }));
        }
        // Phone: at the box's real width, each name on its own line over a full-width bar, as renderTape does.
        function phoneMixSvg(W) {
          var chars = Math.max(8, Math.floor((W - 4) / 7.2)), mixUnit = (W - 4) / maxUnits, y = 0;
          function nameLines(name, top, right) {
            var lines = wrapTapeLabel(name, chars, 2).lines;
            return { height: lines.length * 15 + 3, node: h('text', { x: 2, y: top + 12, fill: text, fontSize: 12, fontWeight: 700, 'data-tape-label': name }, lines.map(function(line, i) { return h('tspan', { key: i, x: 2, dy: i ? 15 : 0 }, line); })), right: right && h('text', { x: W - 2, y: top + 12, textAnchor: 'end', fill: text, fontSize: 12, fontWeight: 700 }, right) };
          }
          var tapes = mixes.map(function(mix) {
            var top = y, label = nameLines(mix.name, top), barY = top + label.height;
            y = barY + 28 + 10;
            return h('g', { key: mix.id, 'aria-hidden': 'true' }, label.node,
              Array.apply(null, Array(mix.a + mix.b)).map(function(_, i) {
                var isFirst = i < mix.a;
                return h('rect', { key: i, x: 2 + i * mixUnit, y: barY, width: mixUnit, height: 28, fill: isFirst ? fillStrong : soft, stroke: isFirst ? panel : muted, strokeWidth: mixUnit < 9 ? 1 : 1.5 });
              }));
          });
          var shares = showShares ? mixes.map(function(mix) {
            var top = y, label = nameLines(mix.name, top, fracText(mix.a, mix.a + mix.b)), barY = top + label.height, share = mix.a / (mix.a + mix.b);
            y = barY + 24 + 8;
            return h('g', { key: 'share-' + mix.id, 'aria-hidden': 'true' }, label.node, label.right,
              h('rect', { x: 2, y: barY, width: W - 4, height: 24, fill: soft, stroke: muted, strokeWidth: 1.5 }),
              h('rect', { x: 2, y: barY, width: (W - 4) * share, height: 24, fill: fillStrong }));
          }) : null;
          return h('svg', { viewBox: '0 0 ' + W + ' ' + Math.max(1, y), role: 'img', 'aria-labelledby': 'ratio-mix-title ratio-mix-desc', style: { width: '100%', maxWidth: W, display: 'block' } },
            h('title', { id: 'ratio-mix-title' }, t('stem.ratios.ms_mix_title', 'Tape diagrams of the two mixes')),
            h('desc', { id: 'ratio-mix-desc' }, desc + (showShares ? ' ' + shareDesc : '')),
            tapes, shares);
        }
        return h('figure', { className: 'space-y-2', 'data-ratio-mix-tapes': mission.id },
          // On a phone this sentence is too long for the drawing, so it sits above it.
          mixPhone && showShares && h('p', { className: 'text-xs font-bold', style: { color: muted } }, t('stem.ratios.ms_same_length', 'Each mix stretched to the same length: compare the shares')),
          mixPhone ? h(fitWidthComponent(React), { fallback: 260, render: function(boxWidth) { return phoneMixSvg(Math.max(120, Math.min(420, boxWidth))); } }) :
          h('svg', { viewBox: '0 0 ' + mixW + ' ' + (showShares ? 210 : 110), role: 'img', 'aria-labelledby': 'ratio-mix-title ratio-mix-desc', style: { width: '100%', maxWidth: 560, display: 'block' } },
            h('title', { id: 'ratio-mix-title' }, t('stem.ratios.ms_mix_title', 'Tape diagrams of the two mixes')),
            h('desc', { id: 'ratio-mix-desc' }, desc + (showShares ? ' ' + shareDesc : '')),
            mixes.map(function(mix, row) {
              var y = 10 + row * 48;
              return h('g', { key: mix.id, 'aria-hidden': 'true' },
                mixLabel(mix.name, 4, y + 22),
                Array.apply(null, Array(mix.a + mix.b)).map(function(_, i) {
                  var isFirst = i < mix.a;
                  return h('rect', { key: i, x: 90 + i * unit, y: y, width: unit, height: 32, fill: isFirst ? fillStrong : soft, stroke: isFirst ? panel : muted, strokeWidth: 1.5 });
                }));
            }),
            !mixPhone && showShares && h('text', { x: 4, y: 118, fill: muted, fontSize: 11, fontWeight: 700, 'aria-hidden': 'true' }, t('stem.ratios.ms_same_length', 'Each mix stretched to the same length: compare the shares')),
            showShares && mixes.map(function(mix, row) {
              var y = 128 + row * 38, share = mix.a / (mix.a + mix.b);
              return h('g', { key: 'share-' + mix.id, 'aria-hidden': 'true' },
                mixLabel(mix.name, 4, y + 18),
                h('rect', { x: 90, y: y, width: mixBar, height: 26, fill: soft, stroke: muted, strokeWidth: 1.5 }),
                h('rect', { x: 90, y: y, width: mixBar * share, height: 26, fill: fillStrong }),
                h('text', { x: 96 + mixBar, y: y + 18, fill: text, fontSize: 12, fontWeight: 700 }, fracText(mix.a, mix.a + mix.b)));
            })),
          h('p', { className: 'text-xs', style: { color: muted } }, fill(t('stem.ratios.ms_mix_key', 'Filled boxes are {first}; open boxes are {second}. Each box is 1 cup.'), { first: first, second: second })));
      }
      function renderScalePlan(mission) {
        var m = missionState(mission.id), ans = subMap(m, 'ans'), solved = subMap(m, 'solved');
        function typedLength(key) { var v = parseNumberWithFraction(ans[key]); return v != null && v > 0 && v <= 40 ? v : null; }
        var L2 = solved.redrawL ? mission.L2 : typedLength('redrawL'), W2 = solved.redrawW ? mission.W2 : typedLength('redrawW');
        var hasRedraw = L2 != null && W2 != null;
        var widthUnits = mission.l + (hasRedraw ? L2 : 0) + 3, heightUnits = Math.max(mission.w, hasRedraw ? W2 : 0) + 2;
        var cell = Math.max(4, Math.min(22, 440 / widthUnits, 220 / heightUnits));
        var ox = 20, oy = 26, nx = ox + (mission.l + 2) * cell;
        var grid = [];
        for (var gx = 0; gx <= Math.floor(460 / cell); gx++) grid.push(h('line', { key: 'gx' + gx, x1: gx * cell, y1: 16, x2: gx * cell, y2: 16 + (heightUnits + 1) * cell, stroke: border, strokeWidth: 0.5 }));
        for (var gy = 0; gy <= heightUnits + 1; gy++) grid.push(h('line', { key: 'gy' + gy, x1: 0, y1: 16 + gy * cell, x2: 460, y2: 16 + gy * cell, stroke: border, strokeWidth: 0.5 }));
        var desc = fill(t('stem.ratios.ms_plan_desc', 'On a centimeter grid, the old plan is a rectangle {l} cm long and {w} cm wide, at 1 cm to {k1} m.'), { l: num(mission.l), w: num(mission.w), k1: num(mission.k1) }) + ' ' + (hasRedraw
          ? fill(t('stem.ratios.ms_plan_desc_new', 'Your new plan, at 1 cm to {k2} m, is {L} cm long and {W} cm wide.'), { k2: num(mission.k2), L: num(L2), W: num(W2) })
          : fill(t('stem.ratios.ms_plan_desc_none', 'Your new plan at 1 cm to {k2} m appears when you enter its length and width.'), { k2: num(mission.k2) }));
        var bothDone = !!(solved.redrawL && solved.redrawW);
        var r = mission.k1 / mission.k2;
        return h('figure', { className: 'space-y-2', 'data-ratio-scale-plan': mission.id },
          h('svg', { viewBox: '0 0 460 ' + Math.round(26 + (heightUnits + 1) * cell), role: 'img', 'aria-labelledby': 'ratio-plan-title ratio-plan-desc', style: { width: '100%', maxWidth: 620, display: 'block' } },
            h('title', { id: 'ratio-plan-title' }, t('stem.ratios.ms_plan_title', 'Floor plan and your redraw')),
            h('desc', { id: 'ratio-plan-desc' }, desc),
            h('g', { 'aria-hidden': 'true' }, grid),
            h('text', { x: ox, y: 12, fill: text, fontSize: 11, fontWeight: 700, 'aria-hidden': 'true' }, fill(t('stem.ratios.ms_plan_old', 'Old plan, 1 cm to {k} m'), { k: num(mission.k1) })),
            h('rect', { x: ox, y: oy, width: mission.l * cell, height: mission.w * cell, fill: 'none', stroke: accentStrong, strokeWidth: 3, 'aria-hidden': 'true' }),
            hasRedraw && h('text', { x: nx, y: 12, fill: text, fontSize: 11, fontWeight: 700, 'aria-hidden': 'true' }, fill(t('stem.ratios.ms_plan_new', 'Your plan, 1 cm to {k} m'), { k: num(mission.k2) })),
            hasRedraw && h('rect', { x: nx, y: oy, width: L2 * cell, height: W2 * cell, fill: 'none', stroke: bothDone ? success : warning, strokeWidth: 3, strokeDasharray: bothDone ? undefined : '6 4', 'data-ratio-redraw': 'true', 'aria-hidden': 'true' })),
          h('table', { className: 'text-sm border-collapse', 'data-ratio-scale-table': true },
            h('caption', { className: 'text-left text-xs mb-1', style: { color: muted } }, t('stem.ratios.ms_plan_table', 'The plans as numbers')),
            h('thead', null, h('tr', null, [t('stem.ratios.model_measure', 'Measure'), t('stem.ratios.ms_old_plan_col', 'Old plan (cm)'), t('stem.ratios.ms_new_plan_col', 'Your plan (cm)')].map(function(label, i) { return h('th', { key: i, scope: 'col', className: 'border px-3 py-1 text-left', style: { borderColor: border } }, label); }))),
            h('tbody', null,
              h('tr', null, h('th', { scope: 'row', className: 'border px-3 py-1 text-left', style: { borderColor: border } }, t('stem.ratios.model_length', 'Length')), h('td', { className: 'border px-3 py-1 font-mono', style: { borderColor: border } }, num(mission.l)), h('td', { className: 'border px-3 py-1 font-mono', style: { borderColor: border } }, L2 == null ? '?' : num(L2))),
              h('tr', null, h('th', { scope: 'row', className: 'border px-3 py-1 text-left', style: { borderColor: border } }, t('stem.ratios.model_width', 'Width')), h('td', { className: 'border px-3 py-1 font-mono', style: { borderColor: border } }, num(mission.w)), h('td', { className: 'border px-3 py-1 font-mono', style: { borderColor: border } }, W2 == null ? '?' : num(W2))))),
          bothDone && h('p', { className: 'text-sm font-semibold', role: 'status', 'data-ratio-scale-summary': true }, fill(t('stem.ratios.ms_plan_summary', 'Your new plan is {r} times as long and {r} times as wide as the old one, so its area is {r} × {r} = {r2} times as large. Lengths scale by a factor, areas by the factor squared.'), { r: num(r), r2: num(r * r) })));
      }
      function renderRecipeTable(mission) {
        var m = missionState(mission.id), solved = subMap(m, 'solved');
        var factorKnown = !!solved.factor;
        var recipeCaption = fill(t('stem.ratios.ms_rc_caption', 'Ratio table: from {S} servings to {T} servings'), { S: num(mission.S), T: num(mission.T) });
        return h('div', { className: 'overflow-x-auto', tabIndex: 0, role: 'region', 'aria-label': recipeCaption }, h('table', { className: 'w-full text-sm border-collapse', 'data-ratio-recipe-table': true },
          h('caption', { className: 'text-left font-bold mb-2' }, recipeCaption),
          h('thead', null, h('tr', null, [t('stem.ratios.ms_rc_ingredient', 'Ingredient'), fill(t('stem.ratios.ms_rc_for_n', 'For {n} servings'), { n: num(mission.S) }), factorKnown ? fill(t('stem.ratios.ms_rc_times', 'Multiply by {f}'), { f: mixedText(mission.f) }) : t('stem.ratios.ms_rc_times_unknown', 'Multiply by ?'), fill(t('stem.ratios.ms_rc_for_n', 'For {n} servings'), { n: num(mission.T) })].map(function(label, i) { return h('th', { key: i, scope: 'col', className: 'border p-2 text-left', style: { borderColor: border } }, label); }))),
          h('tbody', null, mission.items.map(function(item) {
            var unit = item.ing === 'powder' ? t('stem.ratios.unit_teaspoons', 'teaspoons') : t('stem.ratios.unit_cups', 'cups');
            return h('tr', { key: item.ing, 'data-ratio-recipe-row': item.ing },
              h('th', { scope: 'row', className: 'border p-2 text-left', style: { borderColor: border } }, item.name),
              h('td', { className: 'border p-2 font-mono', style: { borderColor: border } }, fill(t('stem.ratios.qty_unit', '{n} {unit}'), { n: mixedText(item.q), unit: unit })),
              h('td', { className: 'border p-2 font-mono', style: { borderColor: border } }, factorKnown ? '× ' + mixedText(mission.f) : '× ?'),
              h('td', { className: 'border p-2 font-mono', style: { borderColor: border } }, solved[item.ing] ? fill(t('stem.ratios.qty_unit', '{n} {unit}'), { n: mixedText(item.scaled), unit: unit }) : '?'));
          }))));
      }
      function focusQueryLater(selectors) {
        if (typeof document === 'undefined') return;
        var run = function() {
          for (var i = 0; i < selectors.length; i++) { var el = document.querySelector(selectors[i]); if (el && typeof el.focus === 'function') { el.focus(); return; } }
        };
        if (typeof root.setTimeout === 'function') root.setTimeout(run, 0); else run();
      }
      // Detective: one case at a time, with progress dots as a one-stop tab list.
      function renderDetectiveCases(mission) {
        var m = missionState(mission.id), solved = subMap(m, 'solved');
        var total = mission.steps.length;
        var firstOpen = mission.steps.findIndex(function(s) { return !solved[s.id]; });
        var stored = finiteNumber(m.caseIndex, null);
        var current = stored != null ? clamp(Math.floor(stored), 0, total - 1) : (firstOpen >= 0 ? firstOpen : 0);
        var step = mission.steps[current];
        var nextOpen = -1;
        for (var k = 1; k < total; k++) { var j = (current + k) % total; if (!solved[mission.steps[j].id]) { nextOpen = j; break; } }
        function showCase(index, focusDot) {
          updateMission(mission.id, function() { return { caseIndex: index }; });
          announce(fill(t('stem.ratios.dt_case_opened', 'Case {n} of {total}.'), { n: index + 1, total: total }));
          if (focusDot) focusLater('ratio-case-dot-' + mission.steps[index].id);
          else focusQueryLater(['input[name="ratio-ms-detective-' + mission.steps[index].id + '-v"]:not([disabled])', '#ratio-case-dot-' + mission.steps[index].id]);
        }
        return h('div', { className: 'space-y-3', 'data-ratio-detective-cases': mission.seed },
          h('div', { className: 'flex flex-wrap gap-2', role: 'tablist', 'aria-label': t('stem.ratios.dt_cases_label', 'Detective cases') }, mission.steps.map(function(s, index) {
            var selected = index === current, isSolved = !!solved[s.id];
            return h('button', { key: s.id, id: 'ratio-case-dot-' + s.id, type: 'button', role: 'tab', 'aria-selected': selected, 'aria-controls': 'ratio-case-panel', tabIndex: selected ? 0 : -1, 'data-ratio-case-dot': s.id, 'data-solved': isSolved ? 'true' : 'false',
              'aria-label': fill(isSolved ? t('stem.ratios.dt_case_dot_solved', 'Case {n}, solved') : t('stem.ratios.dt_case_dot', 'Case {n}'), { n: index + 1 }),
              onClick: function() { showCase(index, true); },
              onKeyDown: function(event) {
                var to = event.key === 'ArrowRight' ? (index + 1) % total : event.key === 'ArrowLeft' ? (index - 1 + total) % total : event.key === 'Home' ? 0 : event.key === 'End' ? total - 1 : null;
                if (to == null) return;
                event.preventDefault();
                showCase(to, true);
              },
              className: 'rounded-full font-black text-sm inline-flex items-center justify-center',
              style: { width: 44, height: 44, background: isSolved ? success : selected ? accentStrong : soft, color: isSolved ? (isContrast || isDark ? '#000000' : '#ffffff') : selected ? accentText : text, border: '2px solid ' + (selected ? text : isSolved ? success : border) } },
              isSolved ? '✓' : String(index + 1));
          })),
          h('p', { className: 'text-xs font-semibold', style: { color: muted }, 'data-ratio-case-count': current + 1 }, fill(t('stem.ratios.dt_case_of', 'Case {n} of {total}'), { n: current + 1, total: total })),
          h('div', { id: 'ratio-case-panel', role: 'tabpanel', 'aria-labelledby': 'ratio-case-dot-' + step.id }, renderMissionStep(mission, step, current)),
          solved[step.id] && nextOpen >= 0 && h('button', { type: 'button', 'data-ratio-next-case': mission.steps[nextOpen].id, onClick: function() { showCase(nextOpen, false); }, className: 'rounded-lg px-4 py-2 text-sm font-bold', style: { background: accentStrong, color: accentText, border: isContrast ? '2px solid #ffffff' : 'none', minHeight: 44 } },
            fill(t('stem.ratios.dt_next_case', 'Next case: case {n}'), { n: nextOpen + 1 })));
      }
      // Mixtures: both mixes poured to the same cup scale, then stirred. The
      // colour is the concentrate's share of the whole (mixColor), so the
      // stronger mix is the deeper one. Shown only once step 3 is settled.
      function renderMixPour(mission) {
        var p = mission.params, juice = mission.juice;
        var strong = juice ? '#ea580c' : '#dc2626', weak = juice ? '#e0f2fe' : '#ffffff';
        var mixes = [{ id: 'a', name: juice ? t('stem.ratios.ms_mix_a', 'Mix A') : t('stem.ratios.ms_paint_a', 'Paint A'), a: p.a, b: p.b }, { id: 'b', name: juice ? t('stem.ratios.ms_mix_b', 'Mix B') : t('stem.ratios.ms_paint_b', 'Paint B'), a: p.c, b: p.e }];
        var firstWord = juice ? t('stem.ratios.ms_pour_first_juice', 'orange concentrate') : t('stem.ratios.ms_pour_first_paint', 'red paint');
        var maxCups = Math.max(p.a + p.b, p.c + p.e);
        var desc = mixes.map(function(mix) {
          return fill(t('stem.ratios.ms_pour_desc', '{name}: {a} of its {w} cups are {first}, so its colour is {frac} of full strength.'), { name: mix.name, a: num(mix.a), w: num(mix.a + mix.b), first: firstWord, frac: fracText(mix.a, mix.a + mix.b) });
        }).join(' ') + ' ' + t('stem.ratios.ms_pour_rule', 'The larger share of the whole makes the deeper colour.');
        function draw(progress, replay) {
          var p1 = clamp(progress / 0.4, 0, 1), p2 = clamp((progress - 0.4) / 0.4, 0, 1), p3 = clamp((progress - 0.8) / 0.2, 0, 1);
          return h('figure', { className: 'space-y-2', 'data-ratio-mix-pour': mission.id, 'data-pour-state': progress >= 1 ? 'done' : 'pouring' },
            h('svg', { viewBox: '0 0 360 210', role: 'img', 'aria-labelledby': 'ratio-pour-title ratio-pour-desc', style: { width: '100%', maxWidth: 420, display: 'block' } },
              h('title', { id: 'ratio-pour-title' }, t('stem.ratios.ms_pour_title', 'The two mixes poured and stirred')),
              h('desc', { id: 'ratio-pour-desc' }, desc),
              mixes.map(function(mix, i) {
                var x = 40 + i * 170, w = 110, top = 16, bottom = 160;
                var cups = mix.a + mix.b, liquid = (bottom - top) * 0.92 * cups / maxCups;
                var hA = liquid * mix.a / cups * p1, hB = liquid * mix.b / cups * p2;
                var mixed = mixColor(mix.a / cups, strong, weak);
                return h('g', { key: mix.id, 'aria-hidden': 'true', 'data-pour-glass': mix.id, 'data-mixed-color': mixed },
                  hA > 0 && h('rect', { x: x, y: bottom - hA, width: w, height: hA, fill: mixColor(p3, mixed, strong) }),
                  hB > 0 && h('rect', { x: x, y: bottom - hA - hB, width: w, height: hB, fill: mixColor(p3, mixed, weak) }),
                  hA + hB > 0 && h('line', { x1: x, x2: x + w, y1: bottom - hA - hB, y2: bottom - hA - hB, stroke: text, strokeWidth: 2, 'data-pour-surface': mix.id }),
                  h('path', { d: 'M' + x + ' ' + top + ' L' + x + ' ' + bottom + ' L' + (x + w) + ' ' + bottom + ' L' + (x + w) + ' ' + top, fill: 'none', stroke: text, strokeWidth: 3 }),
                  h('text', { x: x + w / 2, y: 180, textAnchor: 'middle', fill: text, fontSize: 13, fontWeight: 700 }, mix.name),
                  h('text', { x: x + w / 2, y: 198, textAnchor: 'middle', fill: text, fontSize: 12 }, fill(t('stem.ratios.ms_pour_share', '{frac} of the mix'), { frac: fracText(mix.a, cups) })));
              })),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('p', { className: 'text-xs flex-1', style: { color: muted, minWidth: 180 } }, t('stem.ratios.ms_pour_caption', 'Both glasses use the same cup scale. The colour comes from the share of the whole, not from the number of cups.')),
              h('button', { type: 'button', 'data-ratio-pour-replay': true, onClick: replay, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: buttonStyle }, t('stem.ratios.ms_pour_replay', 'Pour again'))));
        }
        return h(mixPourComponent(React), { key: 'pour-' + mission.seed, draw: draw });
      }
      function renderMissionBody(mission) {
        var m = missionState(mission.id), solved = subMap(m, 'solved'), revealed = subMap(m, 'revealed');
        var solvedCountM = mission.steps.filter(function(s) { return solved[s.id]; }).length;
        var allSolved = solvedCountM === mission.steps.length;
        var anyRevealed = mission.steps.some(function(s) { return revealed[s.id]; });
        var guessedSteps = subMap(m, 'guessed');
        var anyGuessed = mission.steps.some(function(s) { return guessedSteps[s.id]; });
        var visual = null;
        var mixSettled = mission.id === 'mixture' && !!(solved.compare || revealed.compare);
        if (mission.id === 'scale') visual = renderScalePlan(mission);
        else if (mission.id === 'mixture') visual = renderMixTapes(mission, mixSettled);
        else if (mission.id === 'recipe') visual = renderRecipeTable(mission);
        return h('div', { className: 'space-y-3', 'data-ratio-mission-body': mission.id },
          h('p', { className: 'text-sm font-semibold', 'data-ratio-mission-progress': mission.id }, fill(t('stem.ratios.ms_progress', '{n} of {total} steps solved'), { n: solvedCountM, total: mission.steps.length })),
          visual,
          // The pour shows which mix is stronger, so it waits until step 3 is settled.
          mixSettled && renderMixPour(mission),
          renderMissionPredict(mission),
          mission.id === 'detective' ? renderDetectiveCases(mission) : mission.steps.map(function(step, index) { return renderMissionStep(mission, step, index); }),
          allSolved && anyGuessed && h('p', { role: 'note', className: 'text-sm', 'data-ratio-mission-guessed': mission.id, style: { color: muted } }, t('stem.ratios.ms_guessed_note', 'Every step is solved, but a choice was found after a wrong pick, so this mission does not count. Start a new mission to earn it.')),
          allSolved && !anyGuessed && h('p', { role: 'status', className: 'rounded-lg p-3 text-sm font-bold', 'data-ratio-mission-complete': mission.id, style: { background: panel, border: '1px solid ' + success, color: success } }, t('stem.ratios.ms_complete_note', 'Mission complete! Every step solved on your own. Try a new mission for new numbers.')),
          anyRevealed && h('p', { role: 'note', className: 'text-sm', style: { color: muted } }, t('stem.ratios.ms_revealed_note', 'A worked solution was shown in this mission, so it will not count. Start a new mission to earn it.')));
      }
      function chooseMission(id) {
        if (teacher.lockMission && id !== teacher.lockMission) { announce(t('stem.ratios.ms_locked', 'Your teacher has set the mission for this lesson.')); return; }
        update({ missionTab: id });
        announce(fill(t('stem.ratios.mode_opened', '{mode} opened.'), { mode: missionInfo(id).title }));
      }
      function moveMission(event, index) {
        var next = null;
        if (event.key === 'ArrowRight') next = (index + 1) % missionOrder.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + missionOrder.length) % missionOrder.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = missionOrder.length - 1;
        if (next === null) return;
        event.preventDefault();
        if (teacher.lockMission) return;
        chooseMission(missionOrder[next]);
        if (typeof document !== 'undefined') { var tab = document.getElementById('ratio-mission-tab-' + missionOrder[next]); if (tab) tab.focus(); }
      }
      var currentMission = buildMission(missionTab, missionSeedOf(missionTab), t);
      function renderMissions() {
        var mission = currentMission;
        var info = missionInfo(missionTab);
        var doneCount = Object.keys(missionsDone).length;
        var grade6Hidden = band === 'g45' && !teacher.lockMission && missionOrder.indexOf('mixture') < 0;
        return h('section', { id: 'ratio-missions-section', className: 'rounded-2xl p-4 sm:p-5 space-y-4', 'aria-labelledby': 'ratio-missions-heading', 'data-ratio-missions': true, style: { background: panel, border: '2px solid ' + border, scrollMarginTop: 12 } },
          h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2' },
            h('h2', { id: 'ratio-missions-heading', tabIndex: -1, className: 'font-black' }, t('stem.ratios.ms_heading', 'Missions')),
            h('p', { className: 'text-xs', style: { color: muted } }, fill(t('stem.ratios.ms_done_count', '{n} missions completed'), { n: doneCount }))),
          h('p', { className: 'text-sm', style: { color: muted } }, t('stem.ratios.ms_intro', 'Longer investigations with real contexts. Each one has new numbers every time you start it.')),
          h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-2', role: 'tablist', 'aria-label': t('stem.ratios.ms_tablist', 'Missions') }, missionOrder.map(function(id, index) {
            var selected = id === missionTab, locked = !!teacher.lockMission && !selected;
            return h('button', { key: id, id: 'ratio-mission-tab-' + id, type: 'button', role: 'tab', 'aria-selected': selected, 'aria-controls': 'ratio-mission-panel', 'aria-disabled': locked ? 'true' : undefined, tabIndex: selected ? 0 : -1,
              onKeyDown: function(event) { moveMission(event, index); }, onClick: function() { chooseMission(id); },
              className: 'rounded-lg px-2 py-2 text-xs font-bold', style: { minHeight: 44, background: selected ? accentStrong : soft, color: selected ? accentText : text, border: '1px solid ' + (selected ? accentStrong : border), opacity: locked ? 0.6 : 1 } }, missionInfo(id).short);
          })),
          h('div', { id: 'ratio-mission-panel', role: 'tabpanel', 'aria-labelledby': 'ratio-mission-tab-' + missionTab, className: 'space-y-3', 'data-ratio-mission': missionTab, 'data-mission-seed': mission.seed },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-2' },
              h('div', null,
                h('h3', { className: 'font-bold', style: { color: accent } }, info.title),
                h('p', { className: 'text-sm', style: { color: muted } }, info.goal)),
              h('button', { type: 'button', 'data-ratio-new-mission': missionTab, onClick: function() { newMission(missionTab); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: buttonStyle }, t('stem.ratios.ms_new', 'New mission'))),
            teacher.lockMission && h('p', { className: 'text-sm font-semibold', role: 'note' }, t('stem.ratios.ms_locked', 'Your teacher has set the mission for this lesson.')),
            renderMissionBody(mission)),
          grade6Hidden && h('div', { className: 'flex flex-wrap items-center gap-2 text-sm', 'data-ratio-grade6-missions': true },
            h('p', { style: { color: muted } }, t('stem.ratios.ms_grade6_note', 'Mixtures is a Grade 6 mission: it compares each part with its whole mix.')),
            h('button', { type: 'button', 'data-ratio-show-grade6': true, onClick: function() {
              update({ showGrade6Missions: true, missionTab: 'mixture' });
              announce(t('stem.ratios.ms_grade6_opened', 'The Grade 6 Mixtures mission is open.'));
              focusLater('ratio-mission-tab-mixture');
            }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: buttonStyle }, t('stem.ratios.ms_grade6_show', 'Try the Grade 6 mission'))));
      }

      // Practice | Missions: one tab stop, arrow keys move between the two.
      var VIEW_IDS = ['practice', 'missions'];
      function chooseView(id, focusTab) {
        if (VIEW_IDS.indexOf(id) < 0) return;
        if (id !== labView) update({ labView: id });
        announce(id === 'missions' ? t('stem.ratios.view_missions_opened', 'Missions opened.') : t('stem.ratios.view_practice_opened', 'Practice opened.'));
        if (focusTab && typeof document !== 'undefined') { var tab = document.getElementById('ratio-view-tab-' + id); if (tab) tab.focus(); }
      }
      function renderViewTabs() {
        var labels = { practice: t('stem.ratios.view_practice', 'Practice problems'), missions: t('stem.ratios.view_missions', 'Missions') };
        return h('div', { className: 'grid grid-cols-2 gap-2 rounded-xl p-2', role: 'tablist', 'aria-label': t('stem.ratios.view_tablist', 'Ratio Lab sections'), style: cardStyle }, VIEW_IDS.map(function(id, index) {
          var selected = id === labView;
          return h('button', { key: id, id: 'ratio-view-tab-' + id, type: 'button', role: 'tab', 'aria-selected': selected, 'aria-controls': 'ratio-view-panel', tabIndex: selected ? 0 : -1, 'data-ratio-view-tab': id,
            onClick: function() { chooseView(id, false); },
            onKeyDown: function(event) {
              var next = event.key === 'ArrowRight' || event.key === 'ArrowLeft' ? VIEW_IDS[(index + 1) % 2] : event.key === 'Home' ? VIEW_IDS[0] : event.key === 'End' ? VIEW_IDS[1] : null;
              if (!next) return;
              event.preventDefault();
              chooseView(next, true);
            },
            className: 'rounded-lg px-3 py-2 text-sm font-bold', style: { minHeight: 44, background: selected ? accentStrong : soft, color: selected ? accentText : text, border: '1px solid ' + (selected ? accentStrong : border) } },
            labels[id]);
        }));
      }

      var practiceSolvedCount = Object.keys(solvedPractice).length;
      var linkExpr = challenge.link && challenge.link.tool === 'graphCalc' && (challengeSolved || challengeRevealed) ? challenge.link.expr : null;
      var unitLink = challenge.link && challenge.link.tool === 'unitConvert' && (challengeSolved || challengeRevealed) ? challenge.link : null;
      // The link card hands over the current solved rate: the problem's, or
      // else the first solved step of the open mission that has one.
      var missionSolvedNow = subMap(missionState(currentMission.id), 'solved');
      var missionLinkStep = currentMission.steps.filter(function(s) { return s.problem && s.problem.link && s.problem.link.tool === 'unitConvert' && missionSolvedNow[s.id]; })[0];
      var cardUnitLink = unitLink || (missionLinkStep ? missionLinkStep.problem.link : null);

      return h('div', { className: 'p-3 sm:p-5 space-y-4', style: { color: text, background: isContrast ? '#000000' : (isDark ? '#0c1322' : '#f8fafc') } },
        h('header', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
          h('div', { className: 'flex items-start gap-3' },
            h('button', {
              type: 'button',
              onClick: function() {
                // Only the tool closes: the Lab has one tab ('explore'), and 'tools' blanked it.
                if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null);
              },
              className: 'rounded-lg px-3 py-2 text-sm font-bold shrink-0',
              style: { background: soft, color: text, border: '1px solid ' + border, minHeight: 44 },
              'aria-label': t('stem.ratios.back_to_stem_tools', "Back to STEM tools")
            }, t('stem.ratios.back', "← Back")),
            h('div', null,
              h('h2', { className: 'text-xl sm:text-2xl font-black' }, t('stem.ratios.ratios_rates_proportions_lab', "📊 Ratios, Rates & Proportions Lab")),
              h('p', { className: 'text-sm mt-1', style: { color: muted } }, t('stem.ratios.move_between_representations_and_expla', "Move between representations and explain the multiplicative relationship."))
            )
          ),
          h('div', { className: 'flex flex-wrap gap-2 text-xs', role: 'group', 'aria-label': t('stem.ratios.lab_progress', "Lab progress") },
            h('span', { className: "rounded-full px-3 py-1.5 font-bold", style: { background: soft, border: '1px solid ' + border } }, fill(t('stem.ratios.progress_modes', '{n}/5 modes'), { n: visitedCount(d) })),
            h('span', { className: "rounded-full px-3 py-1.5 font-bold", style: { background: soft, border: '1px solid ' + border } }, fill(t('stem.ratios.progress_solved', '{n} solved'), { n: solvedCount(d) })),
            h('span', { className: "rounded-full px-3 py-1.5 font-bold", style: { background: soft, border: '1px solid ' + border } }, fill(t('stem.ratios.progress_practice', '{n} practice solved'), { n: practiceSolvedCount }))
          )
        ),

        renderLearningPath(),

        renderViewTabs(),

        h('div', { id: 'ratio-view-panel', role: 'tabpanel', 'aria-labelledby': 'ratio-view-tab-' + labView, className: 'space-y-4', 'data-ratio-view': labView },
        labView === 'practice' && h('nav', { className: 'rounded-xl p-2', style: cardStyle, 'aria-label': t('stem.ratios.ratio_lab_learning_modes', "Ratio Lab learning modes") },
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2', role: 'tablist', 'aria-label': t('stem.ratios.learning_mode', "Learning mode") }, modeOrder.map(function(id) { return MODES_L.filter(function(item) { return item.id === id; })[0]; }).map(function(item, index) {
            var selected = item.id === mode;
            var locked = !!teacher.lockMode && !selected;
            return h('button', {
              key: item.id,
              id: 'ratio-tab-' + item.id,
              type: 'button',
              role: 'tab',
              'aria-selected': selected,
              'aria-controls': 'ratio-mode-panel',
              'aria-disabled': locked ? 'true' : undefined,
              tabIndex: selected ? 0 : -1,
              onKeyDown: function(event) { moveMode(event, index); },
              onClick: function() { chooseMode(item.id); },
              className: 'rounded-lg px-2 py-3 text-xs font-bold min-h-[54px]',
              style: { background: selected ? accentStrong : soft, color: selected ? accentText : text, border: '1px solid ' + (selected ? accentStrong : border), opacity: locked ? 0.6 : 1 }
            }, h('span', { className: 'block text-base mb-1', 'aria-hidden': 'true' }, item.icon), item.short);
          }))
        ),

        labView === 'practice' && h('section', {
          id: 'ratio-mode-panel',
          role: 'tabpanel',
          'aria-labelledby': 'ratio-tab-' + mode,
          className: 'space-y-4'
        },
          h('div', { className: 'flex flex-wrap items-baseline gap-x-3 gap-y-1' },
            h('h2', { className: 'text-lg font-black', style: { color: accent } }, modeInfo.title),
            h('p', { className: 'text-sm', style: { color: muted } }, modeInfo.desc)
          ),
          teacher.lockMode && h('p', { className: 'text-sm font-semibold', role: 'note', 'data-ratio-mode-locked': true }, t('stem.ratios.mode_locked_note', 'Your teacher has set the mode for this lesson.')),
          h('details', { key: mode, className: 'rounded-xl border p-3', 'data-ratio-exploration': true, style: { borderColor: border } },
            h('summary', { className: 'cursor-pointer text-sm font-bold', style: { minHeight: 24 } }, t('stem.ratios.free_exploration', 'Free exploration — choose your own quantities')),
            h('p', { className: 'text-sm my-2' }, t('stem.ratios.independent_workspace_v2', 'This workspace is separate from the problem below. Build the problem itself in “Model this problem”.')),
            renderModeContent()
          ),

          h('section', { id: 'ratio-challenge-section', className: 'rounded-2xl p-4 sm:p-5 space-y-4', 'aria-labelledby': 'ratio-challenge-heading', style: { background: isContrast ? '#000000' : (isDark ? '#191d36' : '#eef2ff'), border: '2px solid ' + accent, scrollMarginTop: 12 } },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('div', null,
                h('h2', { id: 'ratio-challenge-heading', tabIndex: -1, className: 'font-black' }, t('stem.ratios.try_problem', "🎯 Try a problem")),
                h('p', { className: 'text-xs', style: { color: muted } }, isPractice
                  ? fill(t('stem.ratios.practice_subtitle', '{mode} • Endless practice • {band}'), { mode: modeInfo.title, band: bandLabel(band) })
                  : fill(t('stem.ratios.lesson_subtitle', '{mode} • Challenge {n} of {total}'), { mode: modeInfo.title, n: challengeIndex + 1, total: modeChallenges.length }))
              ),
              !isPractice ? h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: function() { moveChallenge(-1); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: panel, color: text, border: '1px solid ' + border, minHeight: 44 } }, t('stem.ratios.previous_challenge', "Previous challenge")),
                h('button', { type: 'button', onClick: function() { moveChallenge(1); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: panel, color: text, border: '1px solid ' + border, minHeight: 44 } }, t('stem.ratios.next_challenge', "Next challenge")),
                h('button', { type: 'button', onClick: retryMissedChallenge, disabled: !missedChallengeIds.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50', style: { background: soft, color: text, border: '1px solid ' + border, minHeight: 44 } }, fill(t('stem.ratios.retry_missed_count', 'Retry missed ({n})'), { n: missedChallengeIds.length })))
              : h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: newPracticeProblem, 'data-ratio-new-problem': true, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: panel, color: text, border: '1px solid ' + border, minHeight: 44 } }, t('stem.ratios.new_problem', 'New problem')),
                h('button', { type: 'button', onClick: retryMissedPractice, disabled: !missedPractice.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50', style: { background: soft, color: text, border: '1px solid ' + border, minHeight: 44 } }, fill(t('stem.ratios.retry_missed_practice', 'Retry a missed problem ({n})'), { n: missedPractice.length })))
            ),
            h('div', { className: 'flex flex-wrap items-end gap-3' },
              teacher.problemSet === 'both' && h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.ratios.problem_source', 'Problem set') },
                h('button', { type: 'button', 'aria-pressed': !isPractice, onClick: function() { chooseSource('fixed'); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: !isPractice ? accentStrong : panel, color: !isPractice ? accentText : text, border: '1px solid ' + border, minHeight: 44 } }, t('stem.ratios.source_lesson', 'Lesson problems')),
                h('button', { type: 'button', 'aria-pressed': isPractice, 'data-ratio-source-practice': true, onClick: function() { chooseSource('practice'); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: isPractice ? accentStrong : panel, color: isPractice ? accentText : text, border: '1px solid ' + border, minHeight: 44 } }, t('stem.ratios.source_practice', 'Endless practice'))),
              isPractice && (teacher.band === 'auto'
                ? h('label', { className: 'text-xs font-semibold', htmlFor: 'ratio-practice-band' }, t('stem.ratios.practice_level', 'Level'),
                    h('select', { id: 'ratio-practice-band', value: band, onChange: function(event) { update({ band: event.target.value, challengeFeedback: null, challengeAnswer: '', challengeAnswerId: null }); }, className: 'block rounded-lg px-3 py-2 text-sm mt-1', style: Object.assign({ minHeight: 44 }, inputStyle) },
                      BANDS.map(function(id) { return h('option', { key: id, value: id }, bandLabel(id)); })))
                : h('p', { className: 'text-xs font-semibold', role: 'note' }, fill(t('stem.ratios.band_set_by_teacher', 'Level set by your teacher: {band}.'), { band: bandLabel(band) })))
            ),
            h('p', { id: 'ratio-challenge-prompt', className: 'text-sm sm:text-base font-semibold' }, challenge.prompt),
            // Predict, then model, then answer.
            renderProblemPrediction(),
            renderProblemModel(),
            h('form', { className: 'flex flex-col sm:flex-row gap-2', 'aria-labelledby': 'ratio-challenge-prompt', onSubmit: function(event) { event.preventDefault(); checkChallenge(); } },
              h('label', { className: 'flex-1', htmlFor: 'ratio-challenge-answer' },
                h('span', { id: 'ratio-challenge-answer-label', className: 'block text-sm font-bold mb-1' }, t('stem.ratios.challenge_answer', "Challenge answer")),
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
                        if (!isPractice) cursors[mode] = challenge.id;
                        return { challengeCursorByMode: cursors, challengeId: isPractice ? current.challengeId : challenge.id,
                          challengeIndex: isPractice ? current.challengeIndex : challengeIndex, challengeAnswer: nextAnswer,
                          challengeAnswerId: challenge.id, challengeFeedback: null };
                      });
                    },
                    readOnly: challengeSolved,
                    'aria-readonly': challengeSolved,
                    inputMode: challenge.answer != null ? 'decimal' : 'text',
                    className: "ratio-challenge-answer w-full rounded-lg px-3 py-2.5 bg-transparent",
                    style: { color: text, '--ratio-focus-color': accent, minHeight: 44 },
                    placeholder: challenge.answers ? t('stem.ratios.type_your_answer', "Type your answer") : t('stem.ratios.enter_a_number', "Enter a number"),
                    'aria-labelledby': 'ratio-challenge-prompt ratio-challenge-answer-label',
                    'aria-describedby': feedback ? 'ratio-challenge-feedback' : undefined,
                    'aria-invalid': feedback && !feedback.correct ? 'true' : undefined,
                    'data-solved-answer': challengeSolved ? 'true' : undefined
                  }),
                  challenge.suffix && h('span', { className: 'pr-3 text-xs font-bold', 'aria-hidden': 'true' }, challenge.suffix)
                )
              ),
              h('button', { type: 'submit', disabled: challengeSolved, className: "rounded-lg px-5 py-2.5 font-bold disabled:opacity-70", style: { background: accentStrong, color: accentText, border: isContrast ? '2px solid #ffffff' : 'none', minHeight: 44 } }, challengeSolved ? t('stem.ratios.solved_2', "Solved") : t('stem.ratios.check_answer', "Check answer"))
            ),
            renderHintLadder('ratio-challenge-hints', challengeHintStage, advanceChallengeHint, strategyHint, challenge.hint,
              wrongTries >= 2 && teacher.allowReveal && !challengeSolved && !challengeRevealed && h('button', { type: 'button', onClick: revealSolution, 'data-ratio-reveal': true, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: soft, color: text, border: '1px solid ' + warning, minHeight: 44 } }, t('stem.ratios.show_solution', 'Show the worked solution'))),
            feedback && h('div', { id: 'ratio-challenge-feedback', role: 'status', 'aria-live': 'polite', className: 'rounded-lg p-3 text-sm font-semibold', style: { background: panel, border: '1px solid ' + (feedback.correct ? success : warning), color: feedback.correct ? success : warning } }, feedback.message),
            renderSolution(),
            renderAiHint(challenge.id, challenge.prompt, scopedChallengeAnswer, canonicalChallengeAnswer(challenge), wrongTries, challengeSolved || challengeRevealed),
            unitLink && unitLinkButton(unitLink, challenge.id),
            linkExpr && h('button', { type: 'button', 'data-ratio-graph-link': linkExpr, onClick: function() { openTool('graphCalc', t('stem.ratios.graphing_calculator', 'Graphing Calculator'), linkExpr); }, className: 'rounded-lg px-3 py-2 text-sm font-bold', style: buttonStyle }, fill(t('stem.ratios.graph_this_line', 'Graph y = {expr} in the Graphing Calculator'), { expr: linkExpr.replace('*', '') })),
            renderWorkedExample()
          )
        ),

        labView === 'missions' && renderMissions()),

        renderTeacherPanel(),

        h('section', { className: 'rounded-xl p-4 space-y-3', 'aria-labelledby': 'ratio-links-heading', style: cardStyle, 'data-ratio-links': true },
          h('h2', { id: 'ratio-links-heading', className: 'font-bold' }, t('stem.ratios.links_heading', 'Connect to other tools')),
          h('div', { className: 'grid sm:grid-cols-2 gap-3' },
            h('div', { className: 'space-y-2' },
              h('button', { type: 'button', 'data-ratio-link': 'unitConvert', 'data-ratio-link-handoff': cardUnitLink ? 'true' : undefined, onClick: function() { if (cardUnitLink) openTool('unitConvert', t('stem.ratios.unit_converter', 'Unit Converter'), function(previous) { return unitConvertHandoff(previous, cardUnitLink); }); else openTool('unitConvert', t('stem.ratios.unit_converter', 'Unit Converter')); }, className: 'w-full text-left rounded-lg p-3 text-sm', style: buttonStyle },
                h('strong', { className: 'block' }, cardUnitLink
                  ? fill(t('stem.ratios.unit_link', 'Convert {value} {from} to {to} in the Unit Converter'), { value: num(cardUnitLink.value), from: cardUnitLink.from, to: cardUnitLink.to })
                  : t('stem.ratios.open_unit_converter', 'Open the Unit Converter')),
                h('span', { style: { color: muted } }, cardUnitLink
                  ? t('stem.ratios.link_unit_converter_handoff_why', 'Your solved rate goes in as the value to convert. Converting is multiplying by a rate equal to 1.')
                  : t('stem.ratios.link_unit_converter_why', 'Converting units is multiplying by a rate equal to 1, such as 100 centimeters per 1 meter: a unit rate at work.'))),
              cardUnitLink && h('button', { type: 'button', 'data-ratio-link-plain': 'unitConvert', onClick: function() { openTool('unitConvert', t('stem.ratios.unit_converter', 'Unit Converter')); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: buttonStyle }, t('stem.ratios.open_unit_converter_empty', 'Open the Unit Converter without a value'))),
            h('button', { type: 'button', 'data-ratio-link': 'graphCalc', onClick: function() { openTool('graphCalc', t('stem.ratios.graphing_calculator', 'Graphing Calculator')); }, className: 'text-left rounded-lg p-3 text-sm', style: buttonStyle },
              h('strong', { className: 'block' }, t('stem.ratios.open_graphing_calculator', 'Open the Graphing Calculator')),
              h('span', { style: { color: muted } }, t('stem.ratios.link_graphcalc_why', 'A proportional relationship y = kx graphs as a line through the origin, and its slope is the unit rate k.')))
          )
        ),

        h('details', { className: 'rounded-xl p-4', style: cardStyle },
          h('summary', { className: 'font-bold cursor-pointer', style: { color: accent, minHeight: 24 } }, t('stem.ratios.representation_strategy_guide', "Representation strategy guide")),
          h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 text-sm' },
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.ratio_table', "Ratio table")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.best_for_listing_equivalent_pairs', "Best for listing many equivalent pairs and spotting a common scale factor."))),
            h('div', { className: 'rounded-lg p-3', style: { background: soft } }, h('strong', null, t('stem.ratios.tape_diagram', "Tape diagram")), h('p', { className: 'mt-1', style: { color: muted } }, t('stem.ratios.best_for_part_part_whole', "Best for mixtures and part-part-whole problems: the whole splits into equal units."))),
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
