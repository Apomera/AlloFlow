// Arithmetic Strategy Studio - whole-number operations with visual reasoning.
(function () {
  'use strict';

  window.StemLab = window.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    getRegisteredTools: function () {
      var self = this;
      return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
    }
  };

  if (window.StemLab.isRegistered && window.StemLab.isRegistered('arithmeticStudio')) return;

  var OPERATIONS = {
    add: { symbol: '+', label: 'Addition', color: '#2563eb', soft: '#dbeafe', darkText: '#93c5fd' },
    subtract: { symbol: '\u2212', label: 'Subtraction', color: '#dc2626', soft: '#fee2e2', darkText: '#fca5a5' },
    multiply: { symbol: '\u00d7', label: 'Multiplication', color: '#7c3aed', soft: '#ede9fe', darkText: '#c4b5fd' },
    divide: { symbol: '\u00f7', label: 'Division', color: '#047857', soft: '#d1fae5', darkText: '#6ee7b7' }
  };

  var PRACTICE = [
    { id: 'a1', op: 'add', level: 1, a: 27, b: 35, answer: 62, estimate: 60 },
    { id: 'a2', op: 'add', level: 1, a: 46, b: 28, answer: 74, estimate: 70 },
    { id: 'a3', op: 'add', level: 2, a: 368, b: 457, answer: 825, estimate: 800 },
    { id: 'a4', op: 'add', level: 2, a: 1249, b: 875, answer: 2124, estimate: 2100 },
    { id: 'a5', op: 'add', level: 3, a: 12458, b: 7896, answer: 20354, estimate: 20000 },
    { id: 's1', op: 'subtract', level: 1, a: 73, b: 28, answer: 45, estimate: 40 },
    { id: 's2', op: 'subtract', level: 1, a: 91, b: 46, answer: 45, estimate: 40 },
    { id: 's3', op: 'subtract', level: 2, a: 502, b: 187, answer: 315, estimate: 300 },
    { id: 's4', op: 'subtract', level: 2, a: 1400, b: 675, answer: 725, estimate: 700 },
    { id: 's5', op: 'subtract', level: 3, a: 12003, b: 4786, answer: 7217, estimate: 7000 },
    { id: 'm1', op: 'multiply', level: 1, a: 7, b: 8, answer: 56, estimate: 60 },
    { id: 'm2', op: 'multiply', level: 1, a: 9, b: 6, answer: 54, estimate: 50 },
    { id: 'm3', op: 'multiply', level: 2, a: 23, b: 14, answer: 322, estimate: 300 },
    { id: 'm4', op: 'multiply', level: 2, a: 47, b: 26, answer: 1222, estimate: 1200 },
    { id: 'm5', op: 'multiply', level: 3, a: 308, b: 24, answer: 7392, estimate: 7200 },
    { id: 'd1', op: 'divide', level: 1, a: 42, b: 6, answer: 7, remainder: 0, estimate: 7 },
    { id: 'd2', op: 'divide', level: 1, a: 53, b: 5, answer: 10, remainder: 3, estimate: 10 },
    { id: 'd3', op: 'divide', level: 2, a: 156, b: 12, answer: 13, remainder: 0, estimate: 13 },
    { id: 'd4', op: 'divide', level: 2, a: 347, b: 8, answer: 43, remainder: 3, estimate: 40 },
    { id: 'd5', op: 'divide', level: 3, a: 2496, b: 24, answer: 104, remainder: 0, estimate: 100 }
  ];

  var ERROR_CASES = [
    { id: 'e1', prompt: 'A learner says 58 + 27 = 715.', work: '8 + 7 = 15, then 5 + 2 = 7', answer: 'regroup', choices: [
      { id: 'place', label: 'The digits were aligned incorrectly.' },
      { id: 'regroup', label: 'The ten from 15 was not regrouped into the tens place.' },
      { id: 'operation', label: 'The learner should have subtracted.' }
    ], explain: '15 ones is 1 ten and 5 ones. Regroup the ten, then add 5 + 2 + 1 = 8 tens, giving 85.' },
    { id: 'e2', prompt: 'A learner says 402 \u2212 186 = 384.', work: 'They subtracted the smaller digit from the larger digit in every column.', answer: 'direction', choices: [
      { id: 'zero', label: 'Zero can never appear in subtraction.' },
      { id: 'direction', label: 'They ignored place value and subtraction direction instead of decomposing.' },
      { id: 'estimate', label: 'They rounded too early.' }
    ], explain: 'Decompose 402 as 3 hundreds, 9 tens, and 12 ones. Then 12\u22126=6, 9\u22128=1, and 3\u22121=2, so the answer is 216.' },
    { id: 'e3', prompt: 'A learner says 24 \u00d7 13 = 72.', work: '24 \u00d7 3 = 72 and they stopped.', answer: 'partial', choices: [
      { id: 'partial', label: 'They found only one partial product and omitted 24 \u00d7 10.' },
      { id: 'add', label: 'They should add 24 + 13.' },
      { id: 'decimal', label: 'A decimal point is missing.' }
    ], explain: '13 is 10 + 3. The product is 24\u00d710 + 24\u00d73 = 240 + 72 = 312.' },
    { id: 'e4', prompt: 'A learner says 65 \u00f7 6 = 10 exactly.', work: '6 \u00d7 10 = 60, so they wrote 10.', answer: 'remainder', choices: [
      { id: 'remainder', label: 'They did not account for the 5 left over.' },
      { id: 'inverse', label: 'They should multiply 65 by 6.' },
      { id: 'round', label: 'They should round 65 to 70.' }
    ], explain: '65 = 6\u00d710 + 5, so the whole-number result is 10 remainder 5.' }
  ];

  var WORD_PROBLEMS = [
    { id: 'w1', op: 'add', story: 'A library has 248 graphic novels and receives 175 more. How many does it have now?', a: 248, b: 175, answer: 423, unit: 'graphic novels' },
    { id: 'w2', op: 'subtract', story: 'A trail is 950 meters long. Maya has walked 385 meters. How many meters remain?', a: 950, b: 385, answer: 565, unit: 'meters' },
    { id: 'w3', op: 'multiply', story: 'There are 18 tables with 24 science kits at each table. How many kits are there?', a: 18, b: 24, answer: 432, unit: 'kits' },
    { id: 'w4', op: 'divide', divisionContext: 'report-remainder', story: 'A teacher shares 157 markers equally among 12 groups. How many markers does each group receive, and how many remain?', a: 157, b: 12, answer: 13, remainder: 1, unit: 'markers per group' },
    { id: 'full-teams', op: 'divide', divisionContext: 'discard-remainder', story: 'Sixty-seven students form teams of 8. How many complete teams can enter the tournament?', a: 67, b: 8, answer: 8, remainder: 3, unit: 'complete teams' },
    { id: 'supply-boxes', op: 'divide', divisionContext: 'round-up', story: 'A science club must pack 67 samples into boxes that hold 8 samples each. How many boxes are needed so every sample is packed?', a: 67, b: 8, answer: 9, remainder: 3, unit: 'boxes' }
  ];

  var TAB_IDS = ['learn', 'practice', 'errors', 'apply'];
  var PRACTICE_IDS = PRACTICE.map(function (item) { return item.id; });
  var ERROR_IDS = ERROR_CASES.map(function (item) { return item.id; });
  var WORD_IDS = WORD_PROBLEMS.map(function (item) { return item.id; });

  function countSolved(map, allowedIds) {
    var ids = allowedIds || Object.keys(map || {});
    return ids.filter(function (id) { return !!(map || {})[id]; }).length;
  }

  function successfulOperationMap(data) {
    var completed = Object.assign({}, (data && data.operationsCompleted) || {});
    PRACTICE.forEach(function (problem) {
      if (data && data.practiceSolved && data.practiceSolved[problem.id]) completed[problem.op] = true;
    });
    WORD_PROBLEMS.forEach(function (problem) {
      if (data && data.wordSolvedCases && data.wordSolvedCases[problem.id]) completed[problem.op] = true;
    });
    return completed;
  }

  function successfulOperationCount(data) {
    var completed = successfulOperationMap(data);
    return Object.keys(OPERATIONS).filter(function (op) { return !!completed[op]; }).length;
  }

  function wordProblemById(id) {
    return WORD_PROBLEMS.filter(function (problem) { return problem.id === id; })[0] || null;
  }

  function wordProblemFromState(data) {
    var selected = wordProblemById(data && data.wordProblemId);
    if (selected) return selected;
    var legacyCandidates = data && OPERATIONS[data.operation]
      ? WORD_PROBLEMS.filter(function (problem) { return problem.op === data.operation; })
      : WORD_PROBLEMS;
    var legacyIndex = clampInt(data && data.wordIndex, 0, legacyCandidates.length - 1, 0);
    return legacyCandidates[legacyIndex];
  }

  function expectedWordResponse(problem) {
    var result = calculate(problem.op, problem.a, problem.b);
    if (problem.op !== 'divide') {
      return { answer: result.answer, remainder: 0, requiresRemainder: false, divisionContext: null };
    }
    var context = problem.divisionContext || 'report-remainder';
    if (context === 'round-up') {
      return { answer: result.answer + (result.remainder ? 1 : 0), remainder: 0, requiresRemainder: false, divisionContext: context };
    }
    return {
      answer: result.answer,
      remainder: context === 'report-remainder' ? result.remainder : 0,
      requiresRemainder: context === 'report-remainder',
      divisionContext: context
    };
  }

  function missedWordProblemIds(data) {
    var missed = (data && data.wordMissedCases) || {};
    var solved = (data && data.wordSolvedCases) || {};
    return WORD_IDS.filter(function (id) { return !!missed[id] && !solved[id]; });
  }

  function nextWordProblemId(currentId, allowedIds) {
    var allowed = allowedIds || WORD_IDS;
    var pool = WORD_IDS.filter(function (id) { return allowed.indexOf(id) >= 0; });
    if (!pool.length) return wordProblemById(currentId) ? currentId : WORD_IDS[0];
    var currentIndex = pool.indexOf(currentId);
    return pool[currentIndex < 0 ? 0 : (currentIndex + 1) % pool.length];
  }

  function wordResultExplanation(problem) {
    var expected = expectedWordResponse(problem);
    if (problem.op !== 'divide') return strategySteps(problem.op, problem.a, problem.b).join(' ');
    var raw = calculate('divide', problem.a, problem.b);
    var equation = problem.a + ' = ' + problem.b + ' \u00d7 ' + raw.answer + ' + ' + raw.remainder + '. ';
    if (expected.divisionContext === 'round-up') {
      return equation + raw.answer + ' boxes fill completely, and the ' + raw.remainder + ' remaining item' + (raw.remainder === 1 ? '' : 's') + ' require one more. The context answer is ' + expected.answer + '.';
    }
    if (expected.divisionContext === 'discard-remainder') {
      return equation + 'Only complete groups count, so the context answer is ' + expected.answer + '; the ' + raw.remainder + ' left over do not make another complete group.';
    }
    return equation + 'Report both parts: ' + expected.answer + ' in each group with ' + expected.remainder + ' left over.';
  }

  function clampInt(value, min, max, fallback) {
    var n = Math.round(Number(value));
    return isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function splitPlaceValue(n) {
    var value = Math.abs(Math.round(n));
    var parts = [];
    var place = 1;
    while (value > 0) {
      var digit = value % 10;
      if (digit) parts.unshift(digit * place);
      value = Math.floor(value / 10);
      place *= 10;
    }
    return parts.length ? parts : [0];
  }

  function calculate(op, a, b) {
    a = Math.round(Number(a)); b = Math.round(Number(b));
    if (op === 'add') return { answer: a + b, remainder: 0 };
    if (op === 'subtract') return { answer: a - b, remainder: 0 };
    if (op === 'multiply') return { answer: a * b, remainder: 0 };
    if (b === 0) return { answer: null, remainder: null };
    return { answer: Math.floor(a / b), remainder: a % b };
  }

  function strategySteps(op, a, b) {
    var result = calculate(op, a, b);
    if (op === 'add') {
      var ap = splitPlaceValue(a), bp = splitPlaceValue(b);
      return [
        'Decompose by place value: ' + a + ' = ' + ap.join(' + ') + '; ' + b + ' = ' + bp.join(' + ') + '.',
        'Combine equal places, beginning with the ones. Trade every 10 of a place for 1 of the next place.',
        'The sum is ' + result.answer + '. Check that it is close to an estimate.'
      ];
    }
    if (op === 'subtract') {
      return [
        'Align equal place values in ' + a + ' and ' + b + '.',
        'When a place does not have enough, decompose 1 from the place to its left into 10 of the current place.',
        'Subtract each place: ' + a + ' \u2212 ' + b + ' = ' + result.answer + '. Check by adding ' + result.answer + ' + ' + b + '.'
      ];
    }
    if (op === 'multiply') {
      var aTens = Math.floor(a / 10) * 10, aOnes = a % 10;
      var bTens = Math.floor(b / 10) * 10, bOnes = b % 10;
      if (a < 10 || b < 10) return [
        'Interpret ' + a + ' \u00d7 ' + b + ' as ' + a + ' equal groups of ' + b + '.',
        'Use an array, skip counting, or a known fact.',
        'The product is ' + result.answer + '.'
      ];
      return [
        'Decompose: ' + a + ' = ' + aTens + ' + ' + aOnes + ' and ' + b + ' = ' + bTens + ' + ' + bOnes + '.',
        'Find partial products: ' + aTens + '\u00d7' + bTens + ', ' + aTens + '\u00d7' + bOnes + ', ' + aOnes + '\u00d7' + bTens + ', and ' + aOnes + '\u00d7' + bOnes + '.',
        'Add the partial products to get ' + result.answer + '.'
      ];
    }
    return [
      'Ask how many groups of ' + b + ' fit in ' + a + '.',
      'Use multiplication facts or partial quotients. ' + b + ' \u00d7 ' + result.answer + ' = ' + (b * result.answer) + '.',
      'Subtract from the dividend. ' + a + ' \u2212 ' + (b * result.answer) + ' = ' + result.remainder + '. Result: ' + result.answer + (result.remainder ? ' remainder ' + result.remainder : ' exactly') + '.'
    ];
  }

  function roundFriendly(value, place) {
    return Math.round(value / place) * place;
  }

  function estimatePlan(op, a, b) {
    a = Number(a); b = Number(b);
    if (!isFinite(a)) a = 0;
    if (!isFinite(b)) b = 0;
    var symbol = OPERATIONS[op] ? OPERATIONS[op].symbol : '?';
    if (op === 'add' || op === 'subtract') {
      var largest = Math.max(Math.abs(a), Math.abs(b));
      var place = largest < 100 ? 10 : largest < 1000 ? 100 : largest < 10000 ? 100 : 1000;
      var friendlyA = roundFriendly(a, place);
      var friendlyB = roundFriendly(b, place);
      var estimate = op === 'add' ? friendlyA + friendlyB : friendlyA - friendlyB;
      return { estimate: estimate, left: friendlyA, right: friendlyB, expression: friendlyA + ' ' + symbol + ' ' + friendlyB };
    }
    if (op === 'multiply') {
      if (a === 0 || b === 0) return { estimate: 0, left: a, right: b, expression: a + ' ' + symbol + ' ' + b };
      function oneDigitFriendly(value) {
        var absolute = Math.abs(value);
        var place = absolute < 10 ? 5 : Math.pow(10, Math.max(1, String(Math.floor(absolute)).length - 1));
        var rounded = roundFriendly(absolute, place);
        if (!rounded) rounded = place;
        return value < 0 ? -rounded : rounded;
      }
      var roundedA = oneDigitFriendly(a), roundedB = oneDigitFriendly(b);
      var relativeA = Math.abs(roundedA - a) / Math.max(1, Math.abs(a));
      var relativeB = Math.abs(roundedB - b) / Math.max(1, Math.abs(b));
      var planA = relativeA <= relativeB ? roundedA : a;
      var planB = relativeA <= relativeB ? b : roundedB;
      return { estimate: planA * planB, left: planA, right: planB, expression: planA + ' ' + symbol + ' ' + planB };
    }
    if (b === 0) return { estimate: null, left: a, right: b, expression: 'Division by zero is undefined' };
    if (Math.abs(a) < Math.abs(b)) return { estimate: 0, left: 0, right: b, expression: '0 ' + symbol + ' ' + b };
    var rawQuotient = a / b;
    var magnitude = Math.abs(rawQuotient);
    var step = magnitude < 10 ? 1 : magnitude < 20 ? 5 : magnitude < 100 ? 10 : Math.pow(10, Math.max(1, String(Math.floor(magnitude)).length - 1));
    var friendlyQuotient = roundFriendly(rawQuotient, step);
    var compatibleDividend = friendlyQuotient * b;
    return { estimate: friendlyQuotient, left: compatibleDividend, right: b, expression: compatibleDividend + ' ' + symbol + ' ' + b };
  }

  function estimateFor(op, a, b) {
    return estimatePlan(op, a, b).estimate;
  }

  function assessEstimate(op, a, b, estimate, benchmark) {
    var target = benchmark == null ? estimateFor(op, a, b) : Number(benchmark);
    if (estimate === '' || estimate === null || typeof estimate === 'undefined') {
      return { status: 'missing', reasonable: false, benchmark: target, tolerance: 0 };
    }
    var value = Number(estimate);
    if (!isFinite(value) || !isFinite(target)) {
      return { status: 'invalid', reasonable: false, benchmark: target, tolerance: 0 };
    }
    var tolerance = Math.max(1, Math.abs(target) * 0.25);
    var reasonable = Math.abs(value - target) <= tolerance;
    return { status: reasonable ? 'reasonable' : 'far', reasonable: reasonable, benchmark: target, tolerance: tolerance };
  }

  window.ArithmeticStrategyPure = {
    calculate: calculate,
    splitPlaceValue: splitPlaceValue,
    strategySteps: strategySteps,
    estimateFor: estimateFor,
    estimatePlan: estimatePlan,
    assessEstimate: assessEstimate,
    expectedWordResponse: expectedWordResponse,
    missedWordProblemIds: missedWordProblemIds,
    nextWordProblemId: nextWordProblemId,
    wordResultExplanation: wordResultExplanation,
    successfulOperationMap: successfulOperationMap,
    practice: PRACTICE.slice(),
    errors: ERROR_CASES.slice(),
    wordProblems: WORD_PROBLEMS.slice()
  };

  window.StemLab.registerTool('arithmeticStudio', {
    icon: '\ud83e\uddee',
    label: 'Arithmetic Strategy Studio',
    desc: 'Learn addition, subtraction, multiplication, and division through models, strategies, estimation, and mistake analysis.',
    color: 'blue',
    category: 'math',
    questHooks: [
      { id: 'practice_5', label: 'Solve 5 arithmetic challenges', icon: '\ud83c\udfaf', check: function (d) { return countSolved(d.practiceSolved, PRACTICE_IDS) >= 5; }, progress: function (d) { return countSolved(d.practiceSolved, PRACTICE_IDS) + '/5 correct'; } },
      { id: 'all_operations', label: 'Successfully use all four operations', icon: '\ud83c\udf08', check: function (d) { return successfulOperationCount(d) >= 4; }, progress: function (d) { return successfulOperationCount(d) + '/4 operations'; } },
      { id: 'error_detective', label: 'Explain 3 common mistakes', icon: '\ud83d\udd0e', check: function (d) { return countSolved(d.errorSolvedCases, ERROR_IDS) >= 3; }, progress: function (d) { return countSolved(d.errorSolvedCases, ERROR_IDS) + '/3 mistakes'; } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var rootData = ctx.toolData || {};
      var d = rootData._arithmeticStudio || {};
      var t = function (key, fallback) {
        try { var translated = typeof ctx.t === 'function' ? ctx.t(key, fallback) : null; return translated == null ? fallback : translated; }
        catch (_) { return fallback; }
      };
      var isDark = !!ctx.isDark;
      var bg = isDark ? '#0f172a' : '#f8fafc';
      var card = isDark ? '#1e293b' : '#ffffff';
      var text = isDark ? '#f8fafc' : '#0f172a';
      var muted = isDark ? '#cbd5e1' : '#475569';
      var border = isDark ? '#475569' : '#cbd5e1';
      var tab = TAB_IDS.indexOf(d.tab) >= 0 ? d.tab : 'learn';
      var operation = OPERATIONS[d.operation] ? d.operation : 'add';
      var opMeta = OPERATIONS[operation];
      var accentText = isDark ? opMeta.darkText : opMeta.color;
      var level = clampInt(d.level, 1, 3, 1);
      var a = clampInt(d.a, 0, 99999, 58);
      var bMax = operation === 'subtract' ? Math.min(9999, a) : 9999;
      var b = clampInt(d.b, operation === 'divide' ? 1 : 0, bMax, operation === 'divide' ? 6 : Math.min(27, bMax));
      var customResult = calculate(operation, a, b);
      var customEstimate = estimatePlan(operation, a, b);
      var customSteps = strategySteps(operation, a, b);
      var showModel = d.showModel !== false;
      var showSteps = !!d.showSteps;
      var candidates = PRACTICE.filter(function (p) { return p.op === operation && p.level === level; });
      var hasPracticeProblemId = typeof d.practiceProblemId === 'string' && d.practiceProblemId !== '';
      var requestedPracticeProblemId = PRACTICE_IDS.indexOf(d.practiceProblemId) >= 0 ? d.practiceProblemId : null;
      var requestedPracticeIndex = requestedPracticeProblemId ? candidates.findIndex(function (p) { return p.id === requestedPracticeProblemId; }) : -1;
      var practiceIndex = requestedPracticeIndex >= 0 ? requestedPracticeIndex : clampInt(d.practiceIndex, 0, Math.max(0, candidates.length - 1), 0);
      var problem = candidates[practiceIndex % candidates.length];
      var legacyCandidates = PRACTICE.filter(function (p) { return p.op === operation && p.level <= level; });
      var legacyPracticeIndex = clampInt(d.practiceIndex, 0, Math.max(0, legacyCandidates.length - 1), 0);
      var legacyPracticeProblem = legacyCandidates[legacyPracticeIndex % legacyCandidates.length];
      var practiceStateMatches = hasPracticeProblemId
        ? requestedPracticeProblemId === problem.id
        : !!(legacyPracticeProblem && legacyPracticeProblem.id === problem.id);
      var errorIndex = clampInt(d.errorIndex, 0, ERROR_CASES.length - 1, 0);
      var errorCase = ERROR_CASES[errorIndex];
      var wordProblem = wordProblemFromState(d);
      var wordProblemIndex = WORD_IDS.indexOf(wordProblem.id);
      var wordExpected = expectedWordResponse(wordProblem);
      var selectedWordOperation = OPERATIONS[d.wordOperation] ? d.wordOperation : null;
      var wordAnswerInput = d.wordAnswer == null ? '' : String(d.wordAnswer);
      var wordRemainderInput = d.wordRemainder == null ? '' : String(d.wordRemainder);
      var wordMissedIds = missedWordProblemIds(d);
      var practiceMissedIds = candidates.filter(function(item) {
        return !!((d.practiceMissed || {})[item.id]) && !((d.practiceSolved || {})[item.id]);
      }).map(function(item) { return item.id; });
      var errorMissedIds = ERROR_CASES.filter(function(item) {
        return !!((d.errorMissedCases || {})[item.id]) && !((d.errorSolvedCases || {})[item.id]);
      }).map(function(item) { return item.id; });
      var practiceEstimateInput = practiceStateMatches && d.estimateInput != null ? String(d.estimateInput) : '';
      var practiceAnswerInput = practiceStateMatches && d.answerInput != null ? String(d.answerInput) : '';
      var practiceRemainderInput = practiceStateMatches && d.remainderInput != null ? String(d.remainderInput) : '';
      var practiceFeedback = practiceStateMatches ? d.feedback : null;

      function update(patch) {
        if (typeof ctx.setToolData !== 'function') return;
        ctx.setToolData(function (prev) {
          var current = (prev && prev._arithmeticStudio) || {};
          var changes = typeof patch === 'function' ? patch(current) : patch;
          var next = Object.assign({}, current, changes || {});
          return Object.assign({}, prev || {}, { _arithmeticStudio: next });
        });
      }

      function updatePracticeInput(key, value) {
        var patch = { practiceProblemId: problem.id, practiceIndex: practiceIndex, feedback: null };
        if (!practiceStateMatches) {
          patch.estimateInput = '';
          patch.answerInput = '';
          patch.remainderInput = '';
        }
        patch[key] = value;
        update(patch);
      }

      function announce(message) {
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(message);
      }

      function markOperation(op) {
        update(function (current) {
          var nextB = op === 'subtract' ? Math.min(clampInt(current.b, 0, 9999, 27), clampInt(current.a, 0, 99999, 58)) : current.b;
          return { operation: op, b: nextB, practiceIndex: 0, practiceProblemId: null, answerInput: '', remainderInput: '', estimateInput: '', feedback: null, wordAnswer: '', wordRemainder: '', wordFeedback: null };
        });
        announce(OPERATIONS[op].label + t('stem.arithmetic.selected', " selected."));
      }

      var practiceCheckPending = false;
      function checkPractice() {
        if (practiceCheckPending || (d.practiceSolved && d.practiceSolved[problem.id])) return;
        practiceCheckPending = true;
        var answer = Number(practiceAnswerInput);
        var remainder = problem.op === 'divide' ? (practiceRemainderInput === '' ? null : Number(practiceRemainderInput)) : 0;
        var exactCorrect = answer === problem.answer && remainder === (problem.remainder || 0);
        var estimateCheck = assessEstimate(problem.op, problem.a, problem.b, practiceEstimateInput, estimateFor(problem.op, problem.a, problem.b));
        var complete = exactCorrect && estimateCheck.reasonable;
        var feedback = complete ? 'correct' : exactCorrect ? 'estimate' : 'try';
        var firstSolve = complete && !(d.practiceSolved && d.practiceSolved[problem.id]);
        update(function (current) {
          var solved = Object.assign({}, current.practiceSolved || {});
          var missed = Object.assign({}, current.practiceMissed || {});
          var used = Object.assign({}, current.operationsUsed || {});
          var completedOperations = Object.assign({}, current.operationsCompleted || {});
          if (complete) {
            solved[problem.id] = true;
            used[problem.op] = true;
            completedOperations[problem.op] = true;
            delete missed[problem.id];
          } else {
            missed[problem.id] = true;
          }
          return {
            attempts: (current.attempts || 0) + 1,
            correct: countSolved(solved, PRACTICE_IDS),
            feedback: feedback,
            practiceProblemId: problem.id,
            practiceIndex: practiceIndex,
            practiceSolved: solved,
            practiceMissed: missed,
            operationsUsed: used,
            operationsCompleted: completedOperations
          };
        });
        if (firstSolve && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 4, t('stem.arithmetic.arithmetic_strategy_challenge', "Arithmetic strategy challenge"));
        announce(complete ? t('stem.arithmetic.correct_the_exact_answer_and_estimate_', "Correct. The exact answer and estimate are consistent.") : exactCorrect ? t('stem.arithmetic.your_exact_answer_is_correct_revise_th', "Your exact answer is correct. Revise the estimate so it is close enough to check reasonableness.") : t('stem.arithmetic.not_yet_compare_your_answer_with_your_', "Not yet. Compare your answer with your estimate and try a strategy."));
      }

      function selectPractice(nextIndex, message) {
        update({ practiceIndex: nextIndex, practiceProblemId: candidates[nextIndex].id, answerInput: '', remainderInput: '', estimateInput: '', feedback: null, showPracticeHint: false });
        if (message) announce(message);
      }

      function nextPractice() {
        selectPractice((practiceIndex + 1) % candidates.length);
      }

      function retryMissedPractice() {
        if (!practiceMissedIds.length) return;
        var currentPosition = practiceMissedIds.indexOf(problem.id);
        var nextId = practiceMissedIds[currentPosition < 0 ? 0 : (currentPosition + 1) % practiceMissedIds.length];
        var nextIndex = candidates.findIndex(function(item) { return item.id === nextId; });
        selectPractice(nextIndex, t('stem.arithmetic.retrying_missed_problem', "Retrying a missed practice problem."));
      }

      var errorCheckPending = false;
      function checkError(choice) {
        if (errorCheckPending || (d.errorSolvedCases && d.errorSolvedCases[errorCase.id])) return;
        var correct = choice === errorCase.answer;
        var firstSolve = correct && !(d.errorSolvedCases && d.errorSolvedCases[errorCase.id]);
        if (correct) errorCheckPending = true;
        update(function (current) {
          var solved = Object.assign({}, current.errorSolvedCases || {});
          var missed = Object.assign({}, current.errorMissedCases || {});
          if (correct) { solved[errorCase.id] = true; delete missed[errorCase.id]; }
          else missed[errorCase.id] = true;
          return { errorChoice: choice, errorFeedback: correct ? 'correct' : 'try', errorSolvedCases: solved, errorMissedCases: missed, errorSolved: countSolved(solved, ERROR_IDS) };
        });
        if (firstSolve && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 2, t('stem.arithmetic.arithmetic_error_detective', "Arithmetic error detective"));
        announce(correct ? t('stem.arithmetic.correct_diagnosis', "Correct diagnosis. ") + errorCase.explain : t('stem.arithmetic.that_is_not_the_key_error_read_the_wor', "That is not the key error. Read the work one place at a time."));
      }

      function selectError(nextIndex, message) {
        update({ errorIndex: nextIndex, errorChoice: null, errorFeedback: null });
        if (message) announce(message);
      }

      function retryMissedError() {
        if (!errorMissedIds.length) return;
        var currentPosition = errorMissedIds.indexOf(errorCase.id);
        var nextId = errorMissedIds[currentPosition < 0 ? 0 : (currentPosition + 1) % errorMissedIds.length];
        selectError(ERROR_IDS.indexOf(nextId), t('stem.arithmetic.retrying_missed_diagnosis', "Retrying a missed diagnosis."));
      }

      var wordCheckPending = false;
      function checkWord() {
        if (wordCheckPending || (d.wordSolvedCases && d.wordSolvedCases[wordProblem.id])) return;
        wordCheckPending = true;
        var operationCorrect = selectedWordOperation === wordProblem.op;
        var answerCorrect = Number(wordAnswerInput) === wordExpected.answer;
        var remainderCorrect = !wordExpected.requiresRemainder || Number(wordRemainderInput) === wordExpected.remainder;
        var correct = operationCorrect && answerCorrect && remainderCorrect;
        var feedback = correct ? 'correct' : !operationCorrect ? 'operation' : answerCorrect ? 'remainder' : 'try';
        var firstSolve = correct && !(d.wordSolvedCases && d.wordSolvedCases[wordProblem.id]);
        update(function (current) {
          var solved = Object.assign({}, current.wordSolvedCases || {});
          var missed = Object.assign({}, current.wordMissedCases || {});
          var attempts = Object.assign({}, current.wordAttempts || {});
          var used = Object.assign({}, current.operationsUsed || {});
          var completedOperations = Object.assign({}, current.operationsCompleted || {});
          attempts[wordProblem.id] = (attempts[wordProblem.id] || 0) + 1;
          if (correct) {
            solved[wordProblem.id] = true;
            delete missed[wordProblem.id];
            used[wordProblem.op] = true;
            completedOperations[wordProblem.op] = true;
          } else {
            missed[wordProblem.id] = true;
          }
          return {
            wordProblemId: wordProblem.id,
            wordIndex: wordProblemIndex,
            wordFeedback: feedback,
            wordSolvedCases: solved,
            wordMissedCases: missed,
            wordAttempts: attempts,
            wordSolved: countSolved(solved, WORD_IDS),
            operationsUsed: used,
            operationsCompleted: completedOperations
          };
        });
        if (firstSolve && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 3, t('stem.arithmetic.arithmetic_word_problem', "Arithmetic word problem"));
        announce(correct ? t('stem.arithmetic.correct_the_operation_and_context_answ', "Correct. The operation and context answer both fit the story.") : !operationCorrect ? t('stem.arithmetic.reconsider_which_operation_represents_', "Reconsider which operation represents the relationship in the story.") : t('stem.arithmetic.the_operation_fits_recheck_how_the_con', "The operation fits. Recheck how the context changes the numerical result."));
      }

      function chooseWordOperation(op) {
        update({ wordProblemId: wordProblem.id, wordIndex: wordProblemIndex, wordOperation: op, wordFeedback: null });
        announce(OPERATIONS[op].label + t('stem.arithmetic.chosen_for_this_story', " chosen for this story."));
      }

      function moveToWord(id) {
        var nextId = wordProblemById(id) ? id : WORD_IDS[0];
        update({
          wordProblemId: nextId,
          wordIndex: WORD_IDS.indexOf(nextId),
          wordOperation: null,
          wordAnswer: '',
          wordRemainder: '',
          wordFeedback: null,
          showWordPlan: false
        });
      }

      function nextWord() {
        moveToWord(nextWordProblemId(wordProblem.id, WORD_IDS));
      }

      function retryMissedWords() {
        if (!wordMissedIds.length) return;
        moveToWord(nextWordProblemId(wordProblem.id, wordMissedIds));
        announce(t('stem.arithmetic.opening_a_missed_story_for_another_try', "Opening a missed story for another try."));
      }

      function readCurrent() {
        if (typeof ctx.callTTS !== 'function') return;
        ctx.callTTS(opMeta.label + '. ' + a + ' ' + opMeta.symbol + ' ' + b + '. ' + customSteps.join(' '));
      }

      function moveTab(event, index) {
        var nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % TAB_IDS.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TAB_IDS.length) % TAB_IDS.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = TAB_IDS.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        var nextId = TAB_IDS[nextIndex];
        update({ tab: nextId });
        if (typeof document !== 'undefined') {
          var nextTab = document.getElementById('arithmetic-studio-tab-' + nextId);
          if (nextTab) nextTab.focus();
        }
      }

      function renderOperationPicker() {
        return h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2', role: 'group', 'aria-label': t('stem.arithmetic.choose_an_operation', "Choose an operation") },
          Object.keys(OPERATIONS).map(function (op) {
            var meta = OPERATIONS[op], active = operation === op;
            return h('button', { key: op, onClick: function () { markOperation(op); }, 'aria-pressed': active,
              className: 'rounded-xl px-3 py-2 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-offset-2',
              style: { background: active ? meta.color : card, color: active ? '#fff' : text, border: '2px solid ' + meta.color } }, meta.symbol + ' ' + meta.label);
          })
        );
      }

      function renderEquation(left, right, op) {
        var meta = OPERATIONS[op];
        return h('div', { className: 'rounded-2xl p-4 text-center', style: { background: meta.soft, color: '#0f172a', border: '2px solid ' + meta.color } },
          h('div', { className: 'text-3xl sm:text-4xl font-black font-mono', 'aria-label': left + ' ' + meta.label + ' ' + right }, left + ' ' + meta.symbol + ' ' + right),
          op === 'divide' && h('p', { className: 'mt-1 text-xs font-semibold' }, t('stem.arithmetic.think_how_many_groups_of', "Think: how many groups of ") + right + t('stem.arithmetic.fit_in', " fit in ") + left + '?')
        );
      }

      function renderPlaceTable(left, right, op) {
        var maxDigits = Math.max(String(Math.abs(left)).length, String(Math.abs(right)).length);
        var places = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'].slice(0, maxDigits).reverse();
        function digits(n) { return String(Math.abs(n)).padStart(maxDigits, '0').split(''); }
        return h('details', { className: 'rounded-xl p-2', style: { border: '1px solid ' + border } },
          h('summary', { className: 'cursor-pointer text-xs font-bold', style: { color: accentText } }, t('stem.arithmetic.place_value_table_and_text_alternative', "Place-value table and text alternative")),
          h('div', { className: 'overflow-x-auto mt-2' },
            h('table', { className: 'w-full text-center text-xs' },
              h('caption', { className: 'sr-only' }, t('stem.arithmetic.place_value_alignment_for', "Place-value alignment for ") + left + t('stem.arithmetic.and', " and ") + right),
              h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'p-1' }, t('stem.arithmetic.number', "Number")), places.map(function (p) { return h('th', { key: p, scope: 'col', className: 'p-1' }, p); }))),
              h('tbody', null,
                [left, right].map(function (n, row) { return h('tr', { key: row }, h('th', { scope: 'row', className: 'p-1' }, row ? opMeta.symbol + t('stem.arithmetic.second', " second") : 'first'), digits(n).map(function (digit, i) { return h('td', { key: i, className: 'p-1 font-mono font-bold' }, digit); })); })
              )
            )
          )
        );
      }

      function renderModel(op, left, right) {
        if (!showModel) return null;
        if (op === 'add' || op === 'subtract') {
          var leftParts = splitPlaceValue(left), rightParts = splitPlaceValue(right);
          return h('div', { className: 'rounded-xl p-3', role: 'img', 'aria-label': t('stem.arithmetic.place_value_decomposition', "Place-value decomposition: ") + left + t('stem.arithmetic.equals', " equals ") + leftParts.join(t('stem.arithmetic.plus', " plus ")) + '; ' + right + t('stem.arithmetic.equals', " equals ") + rightParts.join(t('stem.arithmetic.plus', " plus ")) + '.', style: { background: card, border: '1px solid ' + border } },
            h('h3', { className: 'text-sm font-black mb-2', style: { color: accentText } }, t('stem.arithmetic.place_value_model', "Place-value model")),
            h('p', { className: 'font-mono text-sm' }, left + ' = ' + leftParts.join(' + ')),
            h('p', { className: 'font-mono text-sm' }, right + ' = ' + rightParts.join(' + ')),
            h('div', { className: 'mt-2 flex flex-wrap gap-1' }, leftParts.concat(rightParts).map(function (part, i) {
              return h('span', { key: i, className: 'rounded-lg px-2 py-1 text-xs font-bold', style: { background: i < leftParts.length ? opMeta.soft : '#e2e8f0', color: '#0f172a' } }, part);
            }))
          );
        }
        if (op === 'multiply') {
          if (left === 0 || right === 0) {
            return h('div', { className: 'rounded-xl p-3', style: { background: card, border: '1px solid ' + border } },
              h('h3', { className: 'text-sm font-black mb-2', style: { color: accentText } }, t('stem.arithmetic.zero_product_model', "Zero-product model")),
              h('div', { role: 'img', 'aria-label': left + t('stem.arithmetic.times', " times ") + right + t('stem.arithmetic.has_no_dots_because_one_factor_is_zero', " has no dots because one factor is zero; the product is zero."), className: 'rounded-lg p-4 text-center text-sm font-bold', style: { background: opMeta.soft, color: '#0f172a' } }, t('stem.arithmetic.one_factor_is_0_so_there_are_no_equal_', "One factor is 0, so there are no equal groups to draw. Product: 0."))
            );
          }
          var rows = Math.min(left, 12), cols = Math.min(right, 12);
          return h('div', { className: 'rounded-xl p-3', style: { background: card, border: '1px solid ' + border } },
            h('h3', { className: 'text-sm font-black mb-2', style: { color: accentText } }, left <= 12 && right <= 12 ? t('stem.arithmetic.array_model', "Array model") : t('stem.arithmetic.area_model_decomposition', "Area-model decomposition")),
            left <= 12 && right <= 12 ? h('div', { role: 'img', 'aria-label': rows + t('stem.arithmetic.rows_of', " rows of ") + cols + t('stem.arithmetic.dots', " dots, ") + (rows * cols) + t('stem.arithmetic.total', " total"), style: { display: 'grid', gridTemplateColumns: 'repeat(' + cols + ', minmax(8px, 18px))', gap: 4, justifyContent: 'center' } },
              Array.from({ length: rows * cols }).map(function (_, i) { return h('span', { key: i, style: { width: 12, height: 12, borderRadius: '50%', background: opMeta.color } }); })
            ) : h('div', { role: 'img', 'aria-label': t('stem.arithmetic.area_model_showing_partial_products_fo', "Area model showing partial products for ") + left + t('stem.arithmetic.times', " times ") + right, className: 'grid grid-cols-2 gap-1 text-center text-xs font-bold', style: { color: '#0f172a' } },
              h('div', { className: 'p-3', style: { background: '#ddd6fe' } }, Math.floor(left / 10) * 10 + ' \u00d7 ' + Math.floor(right / 10) * 10),
              h('div', { className: 'p-3', style: { background: '#ede9fe' } }, Math.floor(left / 10) * 10 + ' \u00d7 ' + right % 10),
              h('div', { className: 'p-3', style: { background: '#ede9fe' } }, left % 10 + ' \u00d7 ' + Math.floor(right / 10) * 10),
              h('div', { className: 'p-3', style: { background: '#f5f3ff' } }, left % 10 + ' \u00d7 ' + right % 10)
            )
          );
        }
        var division = calculate('divide', left, right);
        return h('div', { className: 'rounded-xl p-3', role: 'img', 'aria-label': left + t('stem.arithmetic.objects_divided_into_groups_of', " objects divided into groups of ") + right + t('stem.arithmetic.gives', " gives ") + division.answer + t('stem.arithmetic.groups_with', " groups with ") + division.remainder + t('stem.arithmetic.left_over', " left over"), style: { background: card, border: '1px solid ' + border } },
          h('h3', { className: 'text-sm font-black mb-2', style: { color: accentText } }, t('stem.arithmetic.equal_groups_model', "Equal-groups model")),
          h('div', { className: 'h-6 rounded-full overflow-hidden flex', style: { background: '#e2e8f0' } },
            h('div', { style: { width: (left > 0 ? ((left - division.remainder) / left * 100) : 0) + '%', background: opMeta.color } }),
            division.remainder > 0 && h('div', { style: { flex: 1, background: '#f59e0b' } })
          ),
          h('p', { className: 'mt-2 text-xs font-semibold' }, division.answer + t('stem.arithmetic.complete_groups_of', " complete groups of ") + right + (division.remainder ? t('stem.arithmetic.with', ", with ") + division.remainder + t('stem.arithmetic.left_over_2', " left over.") : t('stem.arithmetic.with_none_left_over', ", with none left over.")))
        );
      }

      function feedbackBox(kind, success, retry, explanation) {
        if (!kind) return null;
        var ok = kind === 'correct';
        return h('div', { role: ok ? 'status' : 'alert', className: 'rounded-xl p-3 text-sm font-bold', style: { background: ok ? '#dcfce7' : '#fef3c7', color: ok ? '#166534' : '#92400e', border: '1px solid ' + (ok ? '#86efac' : '#fcd34d') } }, ok ? success : retry, ok && explanation ? h('p', { className: 'mt-1 text-xs font-normal' }, explanation) : null);
      }

      function renderLearn() {
        return h(React.Fragment, null,
          h('div', { className: 'grid sm:grid-cols-2 gap-3' },
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.first_number', "First number"), h('input', { type: 'number', min: 0, max: 99999, value: a, onChange: function (e) {
              var nextA = clampInt(e.target.value, 0, 99999, a);
              update(function (current) {
                var changes = { a: nextA, showSteps: false };
                if (operation === 'subtract') changes.b = Math.min(clampInt(current.b, 0, 9999, b), nextA);
                return changes;
              });
            }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: { background: card, color: text, border: '1px solid ' + border } })),
            h('label', { className: 'text-xs font-bold' }, operation === 'divide' ? t('stem.arithmetic.divisor', "Divisor") : t('stem.arithmetic.second_number', "Second number"), h('input', { type: 'number', min: operation === 'divide' ? 1 : 0, max: bMax, value: b, onChange: function (e) { update({ b: clampInt(e.target.value, operation === 'divide' ? 1 : 0, bMax, b), showSteps: false }); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: { background: card, color: text, border: '1px solid ' + border } }))
          ),
          operation === 'subtract' && h('p', { className: 'text-xs font-semibold', style: { color: muted } }, t('stem.arithmetic.this_whole_number_workspace_keeps_the_', "This whole-number workspace keeps the second number at or below the first. Use an integer number line when a negative result is the learning goal.")),
          renderEquation(a, b, operation),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { onClick: function () { update({ showModel: !showModel }); }, 'aria-pressed': showModel, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: showModel ? opMeta.color : card, color: showModel ? '#fff' : text, border: '1px solid ' + opMeta.color } }, showModel ? t('stem.arithmetic.hide_model', "Hide model") : t('stem.arithmetic.show_model', "Show model")),
            h('button', { onClick: function () { update({ showSteps: !showSteps }); }, 'aria-expanded': showSteps, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: showSteps ? opMeta.color : card, color: showSteps ? '#fff' : text, border: '1px solid ' + opMeta.color } }, showSteps ? t('stem.arithmetic.hide_strategy_steps', "Hide strategy steps") : t('stem.arithmetic.reveal_strategy_steps', "Reveal strategy steps")),
            typeof ctx.callTTS === 'function' && h('button', { onClick: readCurrent, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: card, color: accentText, border: '1px solid ' + opMeta.color }, 'aria-label': t('stem.arithmetic.read_strategy_aloud', "Read strategy aloud") }, t('stem.arithmetic.read_aloud', "Read aloud"))
          ),
          renderModel(operation, a, b),
          showSteps && h('ol', { className: 'space-y-2', 'aria-label': t('stem.arithmetic.strategy_steps', "Strategy steps") }, customSteps.map(function (step, i) { return h('li', { key: i, className: 'rounded-xl p-3 text-sm flex gap-3', style: { background: card, border: '1px solid ' + border } }, h('span', { className: 'shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-white', style: { background: opMeta.color } }, i + 1), h('span', null, step)); })),
          renderPlaceTable(a, b, operation),
          h('p', { className: 'rounded-xl p-3 text-xs', style: { background: opMeta.soft, color: '#0f172a' } }, t('stem.arithmetic.reasonableness_check_use_friendly_oper', "Reasonableness check: use friendly operands "), h('strong', null, customEstimate.expression + t('stem.arithmetic.is_about', " is about ") + customEstimate.estimate), t('stem.arithmetic.the_exact_result_is', ". The exact result is "), h('strong', null, customResult.answer + (customResult.remainder ? t('stem.arithmetic.remainder', " remainder ") + customResult.remainder : '')), '.')
        );
      }

      function renderPractice() {
        var solved = !!(d.practiceSolved && d.practiceSolved[problem.id]);
        var displayedPracticeEstimate = solved ? String(problem.estimate == null ? estimateFor(problem.op, problem.a, problem.b) : problem.estimate) : practiceEstimateInput;
        var displayedPracticeAnswer = solved ? String(problem.answer) : practiceAnswerInput;
        var displayedPracticeRemainder = solved && problem.op === 'divide' ? String(problem.remainder || 0) : practiceRemainderInput;
        var visiblePracticeFeedback = solved ? 'correct' : practiceFeedback;
        return h(React.Fragment, null,
          h('div', { className: 'flex items-center justify-between gap-2' },
            h('div', null, h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.estimate_solve_and_check', "Estimate, solve, and check")), h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.estimation_is_a_safety_check_not_a_rep', "Estimation is a safety check, not a replacement for exact reasoning."))),
            h('span', { className: 'rounded-full px-3 py-1 text-xs font-bold', style: { background: opMeta.soft, color: '#0f172a' } }, countSolved(d.practiceSolved, PRACTICE_IDS) + '/' + (d.attempts || 0) + t('stem.arithmetic.correct', " correct"))
          ),
          h('div', { 'data-practice-problem-id': problem.id }, renderEquation(problem.a, problem.b, problem.op)),
          h('div', { className: 'grid sm:grid-cols-3 gap-2' },
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.estimate', "Estimate"), h('input', { type: 'number', required: true, 'aria-required': 'true', value: displayedPracticeEstimate, disabled: solved, onChange: function (e) { updatePracticeInput('estimateInput', e.target.value); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: { background: card, color: text, border: '1px solid ' + border } })),
            h('label', { className: 'text-xs font-bold' }, problem.op === 'divide' ? t('stem.arithmetic.quotient', "Quotient") : t('stem.arithmetic.exact_answer', "Exact answer"), h('input', { type: 'number', required: true, 'aria-required': 'true', value: displayedPracticeAnswer, disabled: solved, onChange: function (e) { updatePracticeInput('answerInput', e.target.value); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: { background: card, color: text, border: '1px solid ' + border } })),
            problem.op === 'divide' && h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.remainder_2', "Remainder"), h('input', { type: 'number', min: 0, max: problem.b - 1, required: true, 'aria-required': 'true', value: displayedPracticeRemainder, disabled: solved, onChange: function (e) { updatePracticeInput('remainderInput', e.target.value); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: { background: card, color: text, border: '1px solid ' + border } }))
          ),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: checkPractice, disabled: practiceAnswerInput === '' || practiceEstimateInput === '' || (problem.op === 'divide' && practiceRemainderInput === '') || solved, className: 'rounded-lg px-4 py-2 text-sm font-black text-white disabled:opacity-40', style: { background: opMeta.color } }, solved ? t('stem.arithmetic.solved', "Solved") : t('stem.arithmetic.check_answer', "Check answer")),
            h('button', { onClick: function () { update({ showPracticeHint: !d.showPracticeHint }); }, 'aria-expanded': !!d.showPracticeHint, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: card, color: accentText, border: '1px solid ' + opMeta.color } }, d.showPracticeHint ? t('stem.arithmetic.hide_hint', "Hide hint") : t('stem.arithmetic.strategy_hint', "Strategy hint")),
            h('button', { onClick: nextPractice, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: card, color: text, border: '1px solid ' + border } }, t('stem.arithmetic.next_problem', "Next problem")),
            h('button', { onClick: retryMissedPractice, disabled: !practiceMissedIds.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' } }, t('stem.arithmetic.retry_missed', "Retry missed (") + practiceMissedIds.length + ')')
          ),
          d.showPracticeHint && h('div', { className: 'rounded-xl p-3 text-sm', style: { background: opMeta.soft, color: '#0f172a' } }, strategySteps(problem.op, problem.a, problem.b)[0]),
          feedbackBox(visiblePracticeFeedback, t('stem.arithmetic.correct_your_exact_answer_and_estimate', "Correct. Your exact answer and estimate support each other."), visiblePracticeFeedback === 'estimate' ? t('stem.arithmetic.your_exact_answer_is_right_revise_the_', "Your exact answer is right. Revise the estimate so it is within a reasonable range of about ") + estimateFor(problem.op, problem.a, problem.b) + '.' : t('stem.arithmetic.not_yet_recheck_each_place_and_compare', "Not yet. Recheck each place and compare with your estimate."), visiblePracticeFeedback === 'correct' ? strategySteps(problem.op, problem.a, problem.b).join(' ') : null)
        );
      }

      function renderErrors() {
        var errorSolved = !!(d.errorSolvedCases && d.errorSolvedCases[errorCase.id]);
        var visibleErrorChoice = errorSolved ? errorCase.answer : d.errorChoice;
        var visibleErrorFeedback = errorSolved ? 'correct' : d.errorFeedback;
        return h(React.Fragment, null,
          h('div', null, h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.error_detective', "Error Detective")), h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.diagnose_the_reasoning_not_the_learner', "Diagnose the reasoning, not the learner. Mistakes are evidence about the next useful model."))),
          h('div', { className: 'rounded-xl p-4', 'data-error-case-id': errorCase.id, style: { background: card, border: '1px solid ' + border } },
            h('p', { className: 'font-black' }, errorCase.prompt),
            h('p', { className: 'mt-2 rounded-lg p-2 font-mono text-sm', style: { background: bg } }, errorCase.work)
          ),
          h('div', { role: 'group', 'aria-label': t('stem.arithmetic.choose_the_most_important_error', "Choose the most important error"), className: 'space-y-2' }, errorCase.choices.map(function (choice) {
            var selected = visibleErrorChoice === choice.id;
            return h('button', { key: choice.id, type: 'button', 'data-error-choice': choice.id, onClick: function () { checkError(choice.id); }, 'aria-pressed': selected, disabled: errorSolved, className: 'w-full rounded-xl p-3 text-left text-sm font-semibold disabled:opacity-70', style: { background: selected ? opMeta.soft : card, color: selected ? '#0f172a' : text, border: '1px solid ' + (selected ? opMeta.color : border) } }, choice.label);
          })),
          feedbackBox(visibleErrorFeedback, t('stem.arithmetic.good_diagnosis', "Good diagnosis."), t('stem.arithmetic.look_again_at_what_happened_to_each_pl', "Look again at what happened to each place or partial result."), visibleErrorFeedback === 'correct' ? errorCase.explain : null),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { onClick: function () { selectError((errorIndex + 1) % ERROR_CASES.length); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: opMeta.color, color: '#fff' } }, t('stem.arithmetic.next_mistake', "Next mistake")),
            h('button', { onClick: retryMissedError, disabled: !errorMissedIds.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' } }, t('stem.arithmetic.retry_missed', "Retry missed (") + errorMissedIds.length + ')'))
        );
      }

      function renderApply() {
        var wordSolved = !!(d.wordSolvedCases && d.wordSolvedCases[wordProblem.id]);
        var activeWordOperation = wordSolved ? wordProblem.op : selectedWordOperation;
        var displayedWordAnswer = wordSolved ? String(wordExpected.answer) : wordAnswerInput;
        var displayedWordRemainder = wordSolved && wordExpected.requiresRemainder ? String(wordExpected.remainder) : wordRemainderInput;
        var visibleWordFeedback = d.wordFeedback || (wordSolved ? 'correct' : null);
        var wordAccent = activeWordOperation ? OPERATIONS[activeWordOperation].color : '#334155';
        var wordSoft = activeWordOperation ? OPERATIONS[activeWordOperation].soft : (isDark ? '#334155' : '#f1f5f9');
        var retryMessage = visibleWordFeedback === 'operation'
          ? t('stem.arithmetic.that_operation_does_not_represent_the_', "That operation does not represent the relationship yet. Ask whether the story joins, separates, repeats equal groups, or finds how many groups fit.")
          : visibleWordFeedback === 'remainder'
            ? t('stem.arithmetic.the_whole_number_answer_is_right_re_re', "The whole-number answer is right. Re-read what the story asks you to do with the amount left over.")
            : t('stem.arithmetic.the_operation_fits_recheck_the_calcula', "The operation fits. Recheck the calculation and decide whether the context uses a quotient, a remainder, or one more group.");
        return h(React.Fragment, null,
          h('div', { className: 'flex flex-wrap items-start justify-between gap-2' },
            h('div', null, h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.apply_it_in_context', "Apply it in context")), h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.choose_the_operation_from_the_story_th', "Choose the operation from the story, then interpret the result in context."))),
            h('div', { className: 'flex flex-wrap gap-2 text-xs font-bold' },
              h('span', { className: 'rounded-full px-3 py-1', style: { background: wordSoft, color: isDark && !activeWordOperation ? '#f8fafc' : '#0f172a' } }, t('stem.arithmetic.scenario', "Scenario ") + (wordProblemIndex + 1) + '/' + WORD_PROBLEMS.length),
              h('span', { className: 'rounded-full px-3 py-1', style: { background: '#dcfce7', color: '#166534' } }, countSolved(d.wordSolvedCases, WORD_IDS) + t('stem.arithmetic.solved_2', " solved")),
              h('span', { className: 'rounded-full px-3 py-1', style: { background: wordMissedIds.length ? '#fef3c7' : '#e2e8f0', color: wordMissedIds.length ? '#92400e' : '#334155' } }, wordMissedIds.length + t('stem.arithmetic.to_retry', " to retry"))
            )
          ),
          h('div', { className: 'rounded-xl p-4', 'data-word-problem-id': wordProblem.id, style: { background: card, border: '1px solid ' + border } },
            h('p', { className: 'text-sm font-semibold leading-relaxed' }, wordProblem.story)
          ),
          h('fieldset', { className: 'rounded-xl p-3', style: { border: '1px solid ' + border } },
            h('legend', { className: 'px-1 text-xs font-black' }, t('stem.arithmetic.choose_an_operation_for_this_story', "Choose an operation for this story")),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2', role: 'group', 'aria-label': t('stem.arithmetic.operation_for_the_current_story', "Operation for the current story") },
              Object.keys(OPERATIONS).map(function (op) {
                var meta = OPERATIONS[op];
                var selected = activeWordOperation === op;
                return h('button', {
                  key: op,
                  type: 'button',
                  disabled: wordSolved,
                  'data-word-operation': op,
                  'aria-pressed': selected,
                  onClick: function () { chooseWordOperation(op); },
                  className: 'rounded-lg px-3 py-2 text-xs font-black',
                  style: { background: selected ? meta.color : card, color: selected ? '#fff' : text, border: '2px solid ' + meta.color }
                }, meta.symbol + ' ' + meta.label);
              })
            )
          ),
          h('div', { className: 'grid sm:grid-cols-2 gap-2' },
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.context_answer', "Context answer"), h('input', {
              type: 'number',
              value: displayedWordAnswer,
              disabled: wordSolved,
              onChange: function (e) { update({ wordProblemId: wordProblem.id, wordIndex: wordProblemIndex, wordAnswer: e.target.value, wordFeedback: null }); },
              className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono',
              style: { background: card, color: text, border: '1px solid ' + border }
            }), h('span', { className: 'mt-1 block font-normal', style: { color: muted } }, t('stem.arithmetic.unit', "Unit: ") + wordProblem.unit)),
            wordExpected.requiresRemainder && h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.amount_left_over', "Amount left over"), h('input', {
              type: 'number',
              min: 0,
              max: wordProblem.b - 1,
              required: true,
              'aria-required': 'true',
              value: displayedWordRemainder,
              disabled: wordSolved,
              onChange: function (e) { update({ wordProblemId: wordProblem.id, wordIndex: wordProblemIndex, wordRemainder: e.target.value, wordFeedback: null }); },
              className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono',
              style: { background: card, color: text, border: '1px solid ' + border }
            }))
          ),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', {
              type: 'button',
              onClick: checkWord,
              disabled: !selectedWordOperation || wordAnswerInput === '' || (wordExpected.requiresRemainder && wordRemainderInput === '') || wordSolved,
              className: 'rounded-lg px-4 py-2 text-sm font-black text-white disabled:opacity-40',
              style: { background: wordAccent }
            }, wordSolved ? t('stem.arithmetic.solved', "Solved") : t('stem.arithmetic.check_response', "Check response")),
            h('button', { type: 'button', onClick: function () { update({ showWordPlan: !d.showWordPlan }); }, 'aria-expanded': !!d.showWordPlan, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: card, color: text, border: '1px solid ' + wordAccent } }, d.showWordPlan ? t('stem.arithmetic.hide_planning_scaffold', "Hide planning scaffold") : t('stem.arithmetic.planning_scaffold', "Planning scaffold")),
            h('button', { type: 'button', onClick: nextWord, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: { background: card, color: text, border: '1px solid ' + border } }, t('stem.arithmetic.next_scenario', "Next scenario")),
            h('button', { type: 'button', onClick: retryMissedWords, disabled: !wordMissedIds.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' } }, t('stem.arithmetic.retry_missed', "Retry missed (") + wordMissedIds.length + ')')
          ),
          d.showWordPlan && h('ol', { className: 'rounded-xl p-3 text-sm space-y-1', style: { background: wordSoft, color: isDark && !activeWordOperation ? '#f8fafc' : '#0f172a' } },
            h('li', null, t('stem.arithmetic.n_1_known', "1. Known: ") + wordProblem.a + t('stem.arithmetic.and', " and ") + wordProblem.b + '.'),
            h('li', null, t('stem.arithmetic.n_2_unknown', "2. Unknown: ") + wordProblem.unit + '.'),
            h('li', null, t('stem.arithmetic.n_3_relationship_are_quantities_joined_s', "3. Relationship: are quantities joined, separated, repeated in equal groups, or grouped by size?")),
            h('li', null, t('stem.arithmetic.n_4_your_operation_choice', "4. Your operation choice: ") + (activeWordOperation ? OPERATIONS[activeWordOperation].label : t('stem.arithmetic.not_chosen_yet', "not chosen yet")) + '.'),
            h('li', null, t('stem.arithmetic.n_5_context_check_decide_what_the_story_', "5. Context check: decide what the story means when an amount is left over."))
          ),
          feedbackBox(
            visibleWordFeedback,
            t('stem.arithmetic.correct_2', "Correct. ") + OPERATIONS[wordProblem.op].label + t('stem.arithmetic.models_the_story_and_the_answer_is', " models the story, and the answer is ") + wordExpected.answer + (wordExpected.requiresRemainder ? t('stem.arithmetic.with_2', " with ") + wordExpected.remainder + t('stem.arithmetic.left_over', " left over") : '') + ' ' + wordProblem.unit + '.',
            retryMessage,
            visibleWordFeedback === 'correct' ? wordResultExplanation(wordProblem) : null
          )
        );
      }

      var tabs = [
        { id: 'learn', label: t('stem.arithmetic.learn_strategies', "Learn strategies") },
        { id: 'practice', label: t('stem.arithmetic.practice', "Practice") },
        { id: 'errors', label: t('stem.arithmetic.error_detective', "Error Detective") },
        { id: 'apply', label: t('stem.arithmetic.word_problems', "Word problems") }
      ];

      return h('section', { className: 'space-y-4 w-full max-w-6xl mx-auto p-2 sm:p-4', style: { background: bg, color: text }, 'data-arithmetic-studio': 'true' },
        h('header', { className: 'rounded-2xl p-4 text-white', style: { background: 'linear-gradient(135deg, #172554, ' + opMeta.color + ')' } },
          h('div', { className: 'flex items-start gap-3' },
            ctx.icons && ctx.icons.ArrowLeft && h('button', { onClick: function () { if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null); }, className: 'rounded-lg p-2 bg-white/10', 'aria-label': t('stem.arithmetic.back_to_stem_tools', "Back to STEM tools") }, h(ctx.icons.ArrowLeft, { size: 18 })),
            h('div', null, h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-blue-100' }, t('stem.arithmetic.concrete_visual_symbolic', "Concrete → visual → symbolic")), h('h1', { className: 'text-xl sm:text-2xl font-black' }, t('stem.arithmetic.arithmetic_strategy_studio', "🧮 Arithmetic Strategy Studio")), h('p', { className: 'mt-1 text-sm text-blue-50' }, t('stem.arithmetic.build_meaning_first_compare_strategies', "Build meaning first, compare strategies, and use estimation to check every result.")))
          )
        ),
        (tab === 'learn' || tab === 'practice') && renderOperationPicker(),
        tab === 'practice' && h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('span', { className: 'text-xs font-bold', style: { color: muted } }, t('stem.arithmetic.practice_level', "PRACTICE LEVEL:")),
          [1, 2, 3].map(function (n) { return h('button', { key: n, type: 'button', onClick: function () { update({ level: n, practiceIndex: 0, practiceProblemId: null, answerInput: '', remainderInput: '', estimateInput: '', feedback: null, showPracticeHint: false }); }, 'aria-pressed': level === n, className: 'rounded-full px-3 py-1 text-xs font-bold', style: { background: level === n ? opMeta.color : card, color: level === n ? '#fff' : text, border: '1px solid ' + opMeta.color } }, n === 1 ? t('stem.arithmetic.foundations', "Foundations") : n === 2 ? t('stem.arithmetic.multi_digit', "Multi-digit") : t('stem.arithmetic.challenge', "Challenge")); })
        ),
        h('nav', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl p-1', role: 'tablist', 'aria-label': t('stem.arithmetic.arithmetic_studio_sections', "Arithmetic Studio sections"), style: { background: card, border: '1px solid ' + border } }, tabs.map(function (item, index) {
          var active = tab === item.id;
          return h('button', { key: item.id, id: 'arithmetic-studio-tab-' + item.id, type: 'button', role: 'tab', 'aria-selected': active, 'aria-controls': 'arithmetic-studio-panel', tabIndex: active ? 0 : -1, onKeyDown: function (event) { moveTab(event, index); }, onClick: function () { update({ tab: item.id }); }, className: 'rounded-lg px-2 py-2 text-xs font-bold', style: { background: active ? opMeta.color : 'transparent', color: active ? '#fff' : text } }, item.label);
        })),
        h('div', { id: 'arithmetic-studio-panel', role: 'tabpanel', 'aria-labelledby': 'arithmetic-studio-tab-' + tab, tabIndex: 0, className: 'space-y-3' }, tab === 'learn' ? renderLearn() : tab === 'practice' ? renderPractice() : tab === 'errors' ? renderErrors() : renderApply()),
        h('footer', { className: 'rounded-xl p-3 text-xs', style: { background: card, color: muted, border: '1px solid ' + border } },
          h('strong', { style: { color: text } }, t('stem.arithmetic.strategy_reminder', "Strategy reminder: ")), t('stem.arithmetic.a_correct_answer_matters_but_a_model_e', "A correct answer matters, but a model, explanation, estimate, and inverse-operation check make the reasoning durable."))
      );
    }
  });
})();
