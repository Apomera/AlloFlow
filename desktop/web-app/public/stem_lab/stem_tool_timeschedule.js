// =============================================================================
// stem_tool_timeschedule.js — Time & Schedule Lab
// Analog/digital linking, elapsed-time models, schedule reasoning, and practice.
// Registered tool ID: "timeSchedule"
// =============================================================================
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.StemLab ||
      typeof window.StemLab.registerTool !== 'function') return;

  var DAY = 1440;
  function clamp(n, lo, hi) {
    n = Number(n);
    return Math.max(lo, Math.min(hi, isFinite(n) ? n : lo));
  }
  function norm(n) {
    n = Number(n);
    if (!isFinite(n)) n = 0;
    n = Math.round(n) % DAY;
    return n < 0 ? n + DAY : n;
  }
  function pad(n) { return String(Math.floor(Math.abs(n))).padStart(2, '0'); }
  function time24(n) {
    n = norm(n);
    return pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  }
  function time12(n) {
    n = norm(n);
    var h = Math.floor(n / 60);
    return (h % 12 || 12) + ':' + pad(n % 60) + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  function showTime(n, use24) { return use24 ? time24(n) : time12(n); }
  function durationText(n) {
    n = Number(n);
    if (!isFinite(n) || n < 0) n = 0;
    n = Math.round(n);
    var h = Math.floor(n / 60), m = n % 60;
    if (!h) return m + (m === 1 ? ' minute' : ' minutes');
    if (!m) return h + (h === 1 ? ' hour' : ' hours');
    return h + (h === 1 ? ' hour ' : ' hours ') + m + (m === 1 ? ' minute' : ' minutes');
  }
  function forwardDuration(start, end) {
    return (norm(end) - norm(start) + DAY) % DAY;
  }
  function timeWithDay(start, end, use24) {
    var duration = forwardDuration(start, end);
    return showTime(end, use24) + (duration > 0 && norm(end) <= norm(start) ? ' next day' : '');
  }
  function elapsedModelSignature(start, amount, direction) {
    return norm(start) + '|' + Math.round(clamp(amount, 0, 720)) + '|' + (direction === -1 ? -1 : 1);
  }
  function elapsedModelCount(data) {
    var signatures = (data && data.elapsedModelSignatures) || {};
    return Object.keys(signatures).filter(function (key) {
      return !!signatures[key] && /^\d+\|\d+\|(?:-1|1)$/.test(key);
    }).length;
  }
  function scheduleTimeline(events) {
    var previousEnd = null;
    return (events || []).map(function(event) {
      var start = norm(event[1]);
      while (previousEnd != null && start < previousEnd) start += DAY;
      var end = norm(event[2]);
      while (end < start) end += DAY;
      previousEnd = end;
      return { event: event, start: start, end: end, duration: end - start };
    });
  }
  function scheduleTimeLabel(absoluteMinutes, use24) {
    return showTime(absoluteMinutes, use24) + (absoluteMinutes >= DAY ? ' next day' : '');
  }
  function parseInputTime(value) {
    var m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m || +m[1] > 23 || +m[2] > 59) return null;
    return +m[1] * 60 + +m[2];
  }
  function parseTime(value) {
    var s = String(value || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
    var m = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);
    if (!m || +m[2] > 59) return null;
    var h = +m[1], min = m[2] == null ? 0 : +m[2], ap = m[3] || '';
    if (ap) {
      if (h < 1 || h > 12) return null;
      if (h === 12) h = 0;
      if (ap === 'pm') h += 12;
    } else if (h > 23) return null;
    return h * 60 + min;
  }
  function parseDuration(value) {
    var s = String(value || '').trim().toLowerCase();
    if (!s) return null;
    var colon = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
    if (colon) return +colon[2] < 60 ? +colon[1] * 60 + +colon[2] : null;
    var compound = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)(?:\s*(\d+)\s*(?:m|min|mins|minute|minutes))?$/);
    if (compound) return Math.round(+compound[1] * 60 + (compound[2] ? +compound[2] : 0));
    var minutes = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)?$/);
    return minutes ? Math.round(+minutes[1]) : null;
  }
  function matchesTimeFormat(value, answerFormat) {
    if (!answerFormat) return true;
    var s = String(value || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
    if (answerFormat === '24') return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
    if (answerFormat === '12') return /^(?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:am|pm)$/.test(s);
    return true;
  }
  // anyHalfDay: an analog face cannot show AM or PM, so 7:35 PM reads the same clock as 7:35 AM.
  function checkAnswer(value, type, answer, answerFormat, anyHalfDay) {
    var parsed = type === 'time' ? parseTime(value) : parseDuration(value);
    var formatOk = type !== 'time' || matchesTimeFormat(value, answerFormat);
    var sameTime = type === 'time' && parsed != null &&
      (anyHalfDay ? norm(parsed) % 720 === norm(answer) % 720 : norm(parsed) === norm(answer));
    return { valid: parsed != null && formatOk, formatOk: formatOk, ok: parsed != null && formatOk &&
      (type === 'time' ? sameTime : parsed === answer) };
  }
  function indexFor(value, length) {
    value = Number(value);
    if (!isFinite(value)) value = 0;
    return Math.abs(Math.floor(value)) % length;
  }
  function makeJumps(start, amount, direction) {
    var left = Math.max(0, Math.round(amount)), at = norm(start), result = [];
    while (left && result.length < 25) {
      var boundary = direction > 0 ? (60 - at % 60) % 60 : at % 60;
      if (!boundary) boundary = 60;
      var jump = Math.min(left, boundary, 60);
      var next = norm(at + direction * jump);
      result.push({ from: at, to: next, amount: jump });
      at = next;
      left -= jump;
    }
    return result;
  }

  var SCHEDULES = {
    school: {
      label: 'School Day', icon: '🎒',
      events: [
        ['Morning meeting', 495, 515, '#0ea5e9'],
        ['Math workshop', 525, 575, '#8b5cf6'],
        ['Science lab', 590, 640, '#10b981'],
        ['Lunch', 685, 725, '#f59e0b'],
        ['Art studio', 740, 790, '#ec4899']
      ]
    },
    afternoon: {
      label: 'After-School Plan', icon: '⚽',
      events: [
        ['Bus ride', 905, 935, '#0ea5e9'],
        ['Snack and break', 940, 965, '#f59e0b'],
        ['Homework', 975, 1020, '#8b5cf6'],
        ['Soccer practice', 1050, 1125, '#10b981'],
        ['Dinner', 1150, 1190, '#ec4899']
      ]
    },
    trip: {
      label: 'City Trip', icon: '🚆',
      events: [
        ['Walk to station', 455, 470, '#0ea5e9'],
        ['Train journey', 482, 558, '#8b5cf6'],
        ['Museum visit', 580, 725, '#10b981'],
        ['Lunch', 740, 785, '#f59e0b'],
        ['Return train', 822, 898, '#ec4899']
      ]
    },
    overnight: {
      label: 'Overnight Observation', icon: '\uD83C\uDF19',
      events: [
        ['Set up equipment', 1380, 1410, '#0ea5e9'],
        ['Sky observation', 1410, 15, '#8b5cf6'],
        ['Warm-up break', 30, 45, '#f59e0b'],
        ['Analyze data', 60, 105, '#10b981'],
        ['Pack up', 120, 150, '#ec4899']
      ]
    }
  };
  function scheduleQuestions(schedule) {
    var e = schedule.events;
    var timeline = scheduleTimeline(e);
    var secondDuration = timeline[1].duration;
    var nextGap = timeline[2].start - timeline[1].end;
    var fullSpan = timeline[timeline.length - 1].end - timeline[0].start;
    return [
      {
        id: 'event-duration',
        prompt: 'How long does "' + e[1][0] + '" last?', type: 'duration',
        answer: secondDuration,
        explanation: scheduleTimeLabel(timeline[1].end, false) + ' minus ' + scheduleTimeLabel(timeline[1].start, false) + ' = ' + durationText(secondDuration) + '.'
      },
      {
        id: 'between-events-gap',
        prompt: 'How much free time is between "' + e[1][0] + '" and "' + e[2][0] + '"?',
        type: 'duration', answer: nextGap,
        explanation: 'Count from ' + scheduleTimeLabel(timeline[1].end, false) + ' to ' + scheduleTimeLabel(timeline[2].start, false) + ': ' + durationText(nextGap) + '.'
      },
      {
        id: 'event-start-24h',
        prompt: 'Write the start of "' + e[3][0] + '" in 24-hour time.',
        type: 'time', answerFormat: '24', answer: e[3][1],
        explanation: time12(e[3][1]) + ' is ' + time24(e[3][1]) + '.'
      },
      {
        id: 'full-schedule-span',
        prompt: 'How much time passes from the first start to the last end?',
        type: 'duration', answer: fullSpan,
        explanation: scheduleTimeLabel(timeline[timeline.length - 1].end, false) + ' minus ' + scheduleTimeLabel(timeline[0].start, false) + ' = ' + durationText(fullSpan) + '.'
      }
    ];
  }
  var CHALLENGES = [
    { id: 'read-clock-0735', difficulty: 'foundation', kind: 'read', title: 'Read the clock', prompt: 'What time does this clock show?',
      type: 'time', answer: 455, clock: 455,
      explanation: 'The minute hand shows 35 minutes and the hour hand is between 7 and 8: 7:35.' },
    { id: 'elapsed-workshop-end', difficulty: 'foundation', kind: 'elapsed', title: 'Count forward',
      prompt: 'A workshop begins at 9:45 AM and lasts 1 hour 30 minutes. When does it end?',
      type: 'time', answer: 675,
      explanation: '9:45 + 15 minutes = 10:00; then 1 hour 15 minutes more = 11:15 AM.' },
    { id: 'interval-1320-1455', difficulty: 'practice', kind: 'interval', title: 'Find the interval',
      prompt: 'How many minutes pass from 13:20 to 14:55?', type: 'duration', answer: 95,
      explanation: '13:20 → 14:20 is 60 minutes; then 35 more minutes. Total: 95.' },
    { id: 'convert-1840-24h', difficulty: 'foundation', kind: 'convert', title: 'Convert to 24-hour time',
      prompt: 'Write 6:40 PM in 24-hour time.', type: 'time', answerFormat: '24', answer: 1120,
      explanation: 'For a PM hour other than 12, add 12. 6 + 12 = 18, so the time is 18:40.' },
    { id: 'convert-0015-12h', difficulty: 'foundation', kind: 'convert', title: 'Convert to 12-hour time',
      prompt: 'Write 00:15 in 12-hour time.', type: 'time', answerFormat: '12', answer: 15,
      explanation: 'Hour 00 is midnight, so 00:15 is 12:15 AM.' },
    { id: 'schedule-bus-ride', difficulty: 'practice', kind: 'schedule', title: 'Travel time',
      prompt: 'A bus leaves at 7:28 AM and arrives at 8:06 AM. How many minutes is the ride?',
      type: 'duration', answer: 38,
      explanation: '7:28 → 8:00 is 32 minutes; then 6 more minutes. Total: 38.' },
    { id: 'elapsed-practice-start', difficulty: 'practice', kind: 'elapsed', title: 'Work backward',
      prompt: 'Practice ends at 3:10 PM and lasts 55 minutes. When did it begin?',
      type: 'time', answer: 855,
      explanation: 'Count back 10 minutes to 3:00 PM, then 45 more to 2:15 PM.' },
    { id: 'overnight-movie-end', difficulty: 'stretch', kind: 'overnight', title: 'Cross midnight',
      prompt: 'A movie starts at 11:35 PM and lasts 50 minutes. When does it end?',
      type: 'time', answer: 25,
      explanation: '25 minutes reaches midnight and 25 remain. It ends at 12:25 AM next day.' },
    { id: 'interval-noon-bridge', difficulty: 'stretch', kind: 'interval', title: 'Bridge noon',
      prompt: 'How many minutes pass from 10:50 AM to 1:05 PM?',
      type: 'duration', answer: 135,
      explanation: '10:50 → noon is 70 minutes; noon → 1:05 is 65. Total: 135.' },
    { id: 'convert-2107-12h', difficulty: 'stretch', kind: 'convert', title: 'Convert precisely',
      prompt: 'Write 21:07 in 12-hour time.', type: 'time', answerFormat: '12', answer: 1267,
      explanation: '21 − 12 = 9, so 21:07 is 9:07 PM.' }
  ];

  var LEGACY_SCHEDULE_QUESTION_IDS = Object.freeze([
    'event-duration',
    'between-events-gap',
    'event-start-24h',
    'full-schedule-span'
  ]);
  var SCHEDULE_QUESTION_IDS = [];
  var LEGACY_SCHEDULE_QUESTION_KEYS = {};
  Object.keys(SCHEDULES).forEach(function(scheduleKey) {
    scheduleQuestions(SCHEDULES[scheduleKey]).forEach(function(question) {
      var stableKey = scheduleKey + ':' + question.id;
      SCHEDULE_QUESTION_IDS.push(stableKey);
    });
    LEGACY_SCHEDULE_QUESTION_IDS.forEach(function(questionId, index) {
      LEGACY_SCHEDULE_QUESTION_KEYS[scheduleKey + ':' + index] = scheduleKey + ':' + questionId;
    });
  });
  Object.freeze(LEGACY_SCHEDULE_QUESTION_KEYS);
  var LEGACY_INDEX_TO_CHALLENGE_ID = CHALLENGES.map(function(challenge) { return challenge.id; });
  var TIME_CHALLENGE_IDS = CHALLENGES.map(function(challenge) { return challenge.id; });
  var CHALLENGE_DIFFICULTIES = [
    { id: 'all', label: 'All levels' },
    { id: 'foundation', label: 'Foundation' },
    { id: 'practice', label: 'Practice' },
    { id: 'stretch', label: 'Stretch' }
  ];

  function countKnownKeys(map, allowedIds) {
    map = map || {};
    return allowedIds.filter(function(id) { return !!map[id]; }).length;
  }
  function normalizeChallengeMap(map) {
    var normalized = {};
    map = map || {};
    Object.keys(map).forEach(function(key) {
      if (!map[key]) return;
      var id = TIME_CHALLENGE_IDS.indexOf(key) >= 0 ? key : null;
      if (!id && /^\d+$/.test(key)) id = LEGACY_INDEX_TO_CHALLENGE_ID[Number(key)] || null;
      if (id) normalized[id] = true;
    });
    return normalized;
  }
  function normalizeScheduleSolvedMap(map) {
    var normalized = {};
    map = map || {};
    Object.keys(map).forEach(function(key) {
      if (!map[key]) return;
      var stableKey = SCHEDULE_QUESTION_IDS.indexOf(key) >= 0 ? key : (Object.prototype.hasOwnProperty.call(LEGACY_SCHEDULE_QUESTION_KEYS, key) ? LEGACY_SCHEDULE_QUESTION_KEYS[key] : null);
      if (stableKey) normalized[stableKey] = true;
    });
    return normalized;
  }
  function challengesForDifficulty(difficulty) {
    var known = CHALLENGE_DIFFICULTIES.some(function(item) { return item.id === difficulty; });
    if (!known || difficulty === 'all') return CHALLENGES.slice();
    return CHALLENGES.filter(function(challenge) { return challenge.difficulty === difficulty; });
  }
  function challengeById(id) {
    return CHALLENGES.filter(function(challenge) { return challenge.id === id; })[0] || null;
  }
  function challengeMissedIds(data, difficulty) {
    var missed = normalizeChallengeMap(data && data.missedChallenges);
    var solved = normalizeChallengeMap(data && data.solvedChallenges);
    return challengesForDifficulty(difficulty).filter(function(challenge) {
      return missed[challenge.id] && !solved[challenge.id];
    }).map(function(challenge) { return challenge.id; });
  }
  function scheduleSolvedCount(data) {
    return countKnownKeys(normalizeScheduleSolvedMap(data && data.scheduleSolvedKeys), SCHEDULE_QUESTION_IDS);
  }
  function timeChallengeSolvedCount(data) {
    return countKnownKeys(normalizeChallengeMap(data && data.solvedChallenges), TIME_CHALLENGE_IDS);
  }

  window.TimeSchedulePure = Object.freeze({
    norm: norm,
    time12: time12,
    time24: time24,
    showTime: showTime,
    durationText: durationText,
    forwardDuration: forwardDuration,
    timeWithDay: timeWithDay,
    elapsedModelSignature: elapsedModelSignature,
    scheduleTimeline: scheduleTimeline,
    scheduleTimeLabel: scheduleTimeLabel,
    parseInputTime: parseInputTime,
    parseTime: parseTime,
    parseDuration: parseDuration,
    matchesTimeFormat: matchesTimeFormat,
    checkAnswer: checkAnswer,
    makeJumps: makeJumps,
    indexFor: indexFor,
    scheduleQuestions: scheduleQuestions,
    normalizeScheduleSolvedMap: normalizeScheduleSolvedMap,
    legacyScheduleQuestionIds: LEGACY_SCHEDULE_QUESTION_IDS,
    normalizeChallengeMap: normalizeChallengeMap,
    challengesForDifficulty: challengesForDifficulty,
    challengeMissedIds: challengeMissedIds,
    challengeDifficulties: CHALLENGE_DIFFICULTIES,
    schedules: SCHEDULES,
    challenges: CHALLENGES
  });

  window.StemLab.registerTool('timeSchedule', {
    icon: '\u23F0',
    label: 'Time & Schedule Lab',
    desc: 'Link analog and digital clocks, model elapsed time, reason about schedules, and convert 12/24-hour time.',
    color: 'sky',
    category: 'math',
    questHooks: [
      { id: 'clock_connector', label: 'Adjust the linked clock 5 times', icon: '🕰️',
        check: function (d) { return (d && d.clockAdjustments || 0) >= 5; },
        progress: function (d) { return Math.min(5, d && d.clockAdjustments || 0) + '/5 adjustments'; } },
      { id: 'elapsed_explorer', label: 'Build 3 elapsed-time models', icon: '⏱️',
        check: function (d) { return elapsedModelCount(d) >= 3; },
        progress: function (d) { return Math.min(3, elapsedModelCount(d)) + '/3 models'; } },
      { id: 'schedule_reasoner', label: 'Solve 3 schedule questions', icon: '📅',
        check: function (d) { return scheduleSolvedCount(d) >= 3; },
        progress: function (d) { return Math.min(3, scheduleSolvedCount(d)) + '/3 solved'; } },
      { id: 'time_master', label: 'Answer 5 challenges correctly', icon: '🏆',
        check: function (d) { return timeChallengeSolvedCount(d) >= 5; },
        progress: function (d) { return Math.min(5, timeChallengeSolvedCount(d)) + '/5 correct'; } }
    ],
    render: function (ctx) {
      var t = function (key, fallback) {
        try { var translated = typeof ctx.t === 'function' ? ctx.t(key, fallback) : null; return translated == null ? fallback : translated; }
        catch (_) { return fallback; }
      };
      var React = ctx.React, h = React.createElement;
      var rawToolData = (ctx && ctx.toolData && typeof ctx.toolData === 'object') ? ctx.toolData : {};
      var d = (rawToolData._timeSchedule && typeof rawToolData._timeSchedule === 'object' && !Array.isArray(rawToolData._timeSchedule)) ? rawToolData._timeSchedule : {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var isContrast = !!ctx.isContrast;
      var isDark = !isContrast && !!ctx.isDark;
      var themeClass = isContrast ? ' time-schedule-lab--contrast' : (isDark ? ' time-schedule-lab--dark' : '');
      var svgFace0 = isContrast ? '#000000' : (isDark ? '#1e293b' : '#ffffff');
      var svgFace1 = isContrast ? '#000000' : (isDark ? '#0f172a' : '#e0f2fe');
      var svgInk = isContrast ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a');
      var svgSub = isContrast ? '#ffff00' : (isDark ? '#94a3b8' : '#64748b');
      var svgAccent = isContrast ? '#00ff00' : (isDark ? '#38bdf8' : '#0284c7');
      var svgRing = isContrast ? '#ffff00' : (isDark ? '#38bdf8' : '#0369a1');
      var svgCardBg = isContrast ? '#000000' : (isDark ? '#0f172a' : '#ffffff');
      var themeCss = [
        '.time-schedule-lab button,.time-schedule-lab select,.time-schedule-lab input{transition:transform 120ms ease,background-color 140ms ease,border-color 140ms ease,box-shadow 140ms ease}',
        '.time-schedule-lab button:not([disabled]):hover{transform:translateY(-1px)}',
        '.time-schedule-lab :focus-visible{outline:3px solid #0284c7;outline-offset:2px}',
        '@media (prefers-reduced-motion:reduce){.time-schedule-lab button,.time-schedule-lab select,.time-schedule-lab input{transition:none!important;transform:none!important}}',
        '.time-schedule-lab--dark,.time-schedule-lab--contrast{padding:14px;border-radius:18px}',
        '.time-schedule-lab--dark{background:#020617;color:#f8fafc;border:1px solid #1e293b}',
        '.time-schedule-lab--dark [class*="bg-white"],.time-schedule-lab--dark [class*="bg-slate-50"],.time-schedule-lab--dark [class*="bg-sky-50"],.time-schedule-lab--dark [class*="bg-cyan-50"],.time-schedule-lab--dark [class*="bg-indigo-50"],.time-schedule-lab--dark [class*="bg-amber-50"],.time-schedule-lab--dark [class*="bg-violet-50"],.time-schedule-lab--dark [class*="bg-emerald-50"],.time-schedule-lab--dark [class*="bg-rose-50"],.time-schedule-lab--dark [class*="bg-slate-100"]{background-color:#0f172a!important;background-image:none!important}',
        '.time-schedule-lab--dark [class*="text-slate-"],.time-schedule-lab--dark [class*="text-indigo-"],.time-schedule-lab--dark [class*="text-sky-"],.time-schedule-lab--dark [class*="text-cyan-"],.time-schedule-lab--dark [class*="text-violet-"],.time-schedule-lab--dark [class*="text-amber-"],.time-schedule-lab--dark [class*="text-emerald-"],.time-schedule-lab--dark [class*="text-rose-"]{color:#e2e8f0!important}',
        '.time-schedule-lab--dark [class*="border-slate-"],.time-schedule-lab--dark [class*="border-sky-"],.time-schedule-lab--dark [class*="border-cyan-"],.time-schedule-lab--dark [class*="border-indigo-"],.time-schedule-lab--dark [class*="border-amber-"],.time-schedule-lab--dark [class*="border-violet-"]{border-color:#334155!important}',
        '.time-schedule-lab--dark .bg-emerald-100,.time-schedule-lab--dark .bg-orange-100,.time-schedule-lab--dark .bg-sky-100,.time-schedule-lab--dark .bg-violet-100{background-color:#1e293b!important;border:1px solid #334155!important}',
        '.time-schedule-lab--dark input,.time-schedule-lab--dark select{background:#020617!important;color:#f8fafc!important;border-color:#475569!important}',
        '.time-schedule-lab--dark [aria-selected="true"],.time-schedule-lab--dark [aria-pressed="true"]{background:#0369a1!important;color:#fff!important;border-color:#38bdf8!important}',
        '.time-schedule-lab--dark svg{border-radius:12px}',
        '.time-schedule-lab--contrast{background:#000;color:#fff;border:2px solid #ffff00}',
        '.time-schedule-lab--contrast [class*="bg-"],.time-schedule-lab--contrast header,.time-schedule-lab--contrast main,.time-schedule-lab--contrast footer{background:#000!important;background-image:none!important;box-shadow:none!important}',
        '.time-schedule-lab--contrast :not(svg):not(svg *){color:#fff!important;border-color:#ffff00!important}',
        '.time-schedule-lab--contrast h2,.time-schedule-lab--contrast h3,.time-schedule-lab--contrast h4,.time-schedule-lab--contrast strong,.time-schedule-lab--contrast th{color:#ffff00!important}',
        '.time-schedule-lab--contrast input,.time-schedule-lab--contrast select{background:#000!important;color:#fff!important;border:2px solid #ffff00!important}',
        '.time-schedule-lab--contrast [aria-selected="true"],.time-schedule-lab--contrast [aria-pressed="true"]{background:#000!important;color:#00ff00!important;border:2px solid #00ff00!important}',
        '.time-schedule-lab--contrast [role="progressbar"]{border:1px solid #ffff00!important;background:#000!important}',
        '.time-schedule-lab--contrast [role="progressbar"]>div{background:#00ff00!important}',
        '.time-schedule-lab--contrast :focus-visible{outline:3px solid #00ff00!important;outline-offset:3px!important}',
        '.time-schedule-lab--contrast svg{background:#000!important;border:2px solid #ffff00;border-radius:12px}'
      ].join('');
      var announce = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function () {};
      var award = typeof ctx.awardXP === 'function' ? ctx.awardXP : function () {};
      function upd(patch) {
        if (typeof ctx.setToolData !== 'function') return;
        ctx.setToolData(function (previous) {
          previous = previous || {};
          var current = (previous._timeSchedule && typeof previous._timeSchedule === 'object' && !Array.isArray(previous._timeSchedule)) ? previous._timeSchedule : {};
          var next = typeof patch === 'function' ? patch(current) : patch;
          return Object.assign({}, previous, {
            _timeSchedule: Object.assign({}, current, next)
          });
        });
      }
      var TABS = [
        ['clock', t('stem.timeschedule.clock_link', "Clock Link"), '🕰️', t('stem.timeschedule.analog_digital', "Analog ↔ digital")],
        ['elapsed', t('stem.timeschedule.elapsed_timeline', "Elapsed Timeline"), '⏱️', t('stem.timeschedule.count_time_jumps', "Count time jumps")],
        ['schedule', t('stem.timeschedule.schedule_planner', "Schedule Planner"), '📅', t('stem.timeschedule.read_and_reason', "Read and reason")],
        ['challenge', t('stem.timeschedule.challenge_lab', "Challenge Lab"), '🏆', t('stem.timeschedule.mixed_practice', "Mixed practice")]
      ];
      var tab = d.tab || 'clock', use24 = !!d.use24;
      if (!TABS.some(function (item) { return item[0] === tab; })) tab = 'clock';
      var clock = d.clockMinutes == null ? 505 : norm(d.clockMinutes);
      var start = d.elapsedStart == null ? 495 : norm(d.elapsedStart);
      var amount = Math.round(clamp(d.elapsedDuration == null ? 95 : d.elapsedDuration, 0, 720));
      var direction = d.elapsedDirection === -1 ? -1 : 1;
      var rawEnd = start + direction * amount, end = norm(rawEnd);
      var jumps = makeJumps(start, amount, direction);
      var scheduleKey = Object.prototype.hasOwnProperty.call(SCHEDULES, d.scheduleKey) ? d.scheduleKey : 'school';
      var schedule = SCHEDULES[scheduleKey], sqs = scheduleQuestions(schedule);
      var sqIndex = indexFor(d.scheduleQuestionIndex, sqs.length);
      var sq = sqs[sqIndex];
      var challengeDifficulty = CHALLENGE_DIFFICULTIES.some(function(item) {
        return item.id === d.challengeDifficulty;
      }) ? d.challengeDifficulty : 'all';
      var difficultyChallenges = challengesForDifficulty(challengeDifficulty);
      var solvedChallengeMap = normalizeChallengeMap(d.solvedChallenges);
      var retryChallengeIds = challengeMissedIds(d, challengeDifficulty);
      var retryResultId = d.challengePracticeMode === 'retry' && d.challengeFeedback &&
        d.challengeFeedback.ok ? d.challengeFeedback.challengeId : null;
      var retryResultChallenge = retryResultId ? challengeById(retryResultId) : null;
      var retryResultEligible = !!(retryResultChallenge && solvedChallengeMap[retryResultChallenge.id] &&
        difficultyChallenges.some(function(item) { return item.id === retryResultChallenge.id; }));
      var retryMode = d.challengePracticeMode === 'retry' &&
        (retryChallengeIds.length > 0 || retryResultEligible);
      var challengeList = retryMode ? retryChallengeIds.map(challengeById).filter(Boolean) : difficultyChallenges;
      if (retryResultEligible && retryChallengeIds.indexOf(retryResultId) < 0) {
        challengeList.unshift(retryResultChallenge);
      }
      if (!challengeList.length) {
        retryMode = false;
        challengeList = difficultyChallenges.length ? difficultyChallenges : CHALLENGES.slice();
      }
      var legacyChallenge = CHALLENGES[indexFor(d.challengeIndex, CHALLENGES.length)];
      var requestedChallengeId = d.challengeId || (legacyChallenge && legacyChallenge.id);
      var challengePosition = challengeList.findIndex(function(item) { return item.id === requestedChallengeId; });
      var challengeSubstituted = challengePosition < 0;
      if (challengeSubstituted) challengePosition = 0;
      var challenge = challengeList[challengePosition];
      var challengeId = challenge.id;
      var chIndex = CHALLENGES.indexOf(challenge);
      var challengeAnswer = challengeSubstituted ? '' : (d.challengeAnswer || '');
      var safeScore = (d.score && typeof d.score === 'object' && !Array.isArray(d.score)) ? d.score : {};
      var correctCount = timeChallengeSolvedCount(d);
      var rawTotal = Number(safeScore.total);
      var totalCount = Math.max(correctCount, isFinite(rawTotal) && rawTotal > 0 ? Math.floor(rawTotal) : 0);
      var score = { correct: correctCount, total: totalCount };
      var safeModesUsed = (d.modesUsed && typeof d.modesUsed === 'object' && !Array.isArray(d.modesUsed)) ? d.modesUsed : {};
      var safeAttempts = (d.challengeAttempts && typeof d.challengeAttempts === 'object' && !Array.isArray(d.challengeAttempts)) ? d.challengeAttempts : {};

      function setTab(id) {
        upd(function (current) {
          var used = Object.assign({}, current.modesUsed || {});
          used[id] = true;
          return { tab: id, modesUsed: used };
        });
        var item = TABS.filter(function (x) { return x[0] === id; })[0];
        announce(item[1] + t('stem.timeschedule.opened', " opened."));
      }
      function handleTabKeyDown(event, index) {
        var nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = TABS.length - 1;
        else return;
        event.preventDefault();
        setTab(TABS[nextIndex][0]);
        var tabs = event.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        if (tabs[nextIndex] && typeof tabs[nextIndex].focus === 'function') tabs[nextIndex].focus();
      }
      function setClock(next) {
        next = norm(next);
        upd(function (current) {
          return { clockMinutes: next, clockAdjustments: (current.clockAdjustments || 0) + 1 };
        });
        announce(t('stem.timeschedule.clock_changed_to', "Clock changed to ") + time12(next) + t('stem.timeschedule.or', ", or ") + time24(next) + '.');
      }
      function markElapsed(changes) {
        upd(function (current) {
          var currentStart = current.elapsedStart == null ? 495 : norm(current.elapsedStart);
          var currentAmount = clamp(current.elapsedDuration == null ? 95 : current.elapsedDuration, 0, 720);
          var currentDirection = current.elapsedDirection === -1 ? -1 : 1;
          var nextStart = changes.elapsedStart == null ? currentStart : norm(changes.elapsedStart);
          var nextAmount = changes.elapsedDuration == null ? currentAmount : Math.round(clamp(changes.elapsedDuration, 0, 720));
          var nextDirection = changes.elapsedDirection == null ? currentDirection : (changes.elapsedDirection === -1 ? -1 : 1);
          var changed = nextStart !== currentStart || nextAmount !== currentAmount || nextDirection !== currentDirection;
          var signatures = Object.assign({}, current.elapsedModelSignatures || {});
          if (changed) signatures[elapsedModelSignature(nextStart, nextAmount, nextDirection)] = true;
          return Object.assign({}, changes, {
            elapsedStep: changed ? 0 : current.elapsedStep,
            elapsedPrediction: changed ? '' : current.elapsedPrediction,
            elapsedStepKey: changed ? null : current.elapsedStepKey,
            elapsedModelSignatures: signatures,
            elapsedModels: Object.keys(signatures).length,
            elapsedDuration: nextAmount
          });
        });
      }
      function formatToggle() {
        return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 }, className: 'rounded-lg border border-slate-300 bg-slate-100 p-1',
          role: 'group', 'aria-label': t('stem.timeschedule.time_display_format', "Time display format") },
          h('button', { type: 'button', onClick: function () { upd({ use24: false }); },
            style: { minHeight: 44 }, 'aria-pressed': !use24, className: "px-3 py-1.5 rounded-md text-xs font-bold " +
              (!use24 ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600') }, '12-hour'),
          h('button', { type: 'button', onClick: function () { upd({ use24: true }); },
            style: { minHeight: 44 }, 'aria-pressed': use24, className: "px-3 py-1.5 rounded-md text-xs font-bold " +
              (use24 ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600') }, '24-hour')
        );
      }
      function analog(value, id, compact, hideTime) {
        value = norm(value);
        var minute = value % 60, hour = Math.floor(value / 60) % 12, hour24 = Math.floor(value / 60);
        var ma = minute * 6 * Math.PI / 180;
        var ha = (hour + minute / 60) * 30 * Math.PI / 180;
        var ticks = [], labels = [], outer24 = [], i, a;
        for (i = 0; i < 60; i += 1) {
          a = i * 6 * Math.PI / 180;
          ticks.push(h('line', { key: 't' + i,
            x1: 160 + (i % 5 ? 132 : 124) * Math.sin(a),
            y1: 160 - (i % 5 ? 132 : 124) * Math.cos(a),
            x2: 160 + 139 * Math.sin(a), y2: 160 - 139 * Math.cos(a),
            stroke: i % 5 ? svgSub : svgInk, strokeWidth: i % 5 ? 1.5 : 4,
            strokeLinecap: 'round' }));
        }
        for (i = 1; i <= 12; i += 1) {
          a = i * 30 * Math.PI / 180;
          labels.push(h('text', { key: 'n' + i, x: 160 + 109 * Math.sin(a),
            y: 166 - 109 * Math.cos(a), textAnchor: 'middle', fontSize: 17,
            fontWeight: '800', fill: svgInk }, i));
          if (use24 && !compact && !hideTime) {
            var h24Label = i === 12 ? (hour24 >= 12 ? '12' : '00') : String(hour24 >= 12 ? i + 12 : i).padStart(2, '0');
            outer24.push(h('text', { key: 'h24-' + i, x: 160 + 83 * Math.sin(a),
              y: 164 - 83 * Math.cos(a), textAnchor: 'middle', fontSize: 10,
              fontWeight: '700', fill: svgSub }, h24Label));
          }
        }
        // Subtle minute sweep wedge (0 -> minute) when showing time
        var sweepPath = null;
        if (!hideTime && minute > 0) {
          var sr = 122;
          var sx = 160 + sr * Math.sin(ma), sy = 160 - sr * Math.cos(ma);
          var largeArc = minute > 30 ? 1 : 0;
          sweepPath = 'M 160 160 L 160 ' + (160 - sr) + ' A ' + sr + ' ' + sr + ' 0 ' + largeArc + ' 1 ' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Z';
        }
        // hideTime: a read-the-clock challenge must describe the hands, not state the time.
        var readable = hideTime ?
          t('stem.timeschedule.analog_clock_hands', "Analog clock. Minute hand: ") +
          (minute % 5 ? (minute % 5) + (minute % 5 === 1 ? t('stem.timeschedule.small_mark_past_the', " small mark past the ") :
            t('stem.timeschedule.small_marks_past_the', " small marks past the ")) + (Math.floor(minute / 5) || 12) :
            t('stem.timeschedule.pointing_at_the', "pointing at the ") + (minute / 5 || 12)) +
          t('stem.timeschedule.hour_hand_label', ". Hour hand: ") +
          (minute ? t('stem.timeschedule.between_the', "between the ") + (hour || 12) + t('stem.timeschedule.and_the', " and the ") + (hour + 1) :
            t('stem.timeschedule.pointing_at_the', "pointing at the ") + (hour || 12)) + '.' :
          t('stem.timeschedule.analog_clock_showing', "Analog clock showing ") + time12(value) +
          t('stem.timeschedule.minute_hand', ". Minute hand: ") + minute + t('stem.timeschedule.minutes_hour_hand', " minutes. Hour hand: ") +
          (minute ? t('stem.timeschedule.past', "past ") : t('stem.timeschedule.at', "at ")) + (hour || 12) + '.';
        return h('figure', { className: 'm-0 flex flex-col items-center w-full' },
          h('svg', { viewBox: '0 0 320 320', role: 'img',
            'aria-labelledby': id + '-title ' + id + '-desc',
            className: compact ? 'w-full max-w-[230px] h-auto' : 'w-full max-w-[330px] h-auto' },
            h('title', { id: id + '-title' }, hideTime ? t('stem.timeschedule.analog_clock_read_it', "Analog clock: what time does it show?") :
              t('stem.timeschedule.analog_clock', "Analog clock: ") + time12(value)),
            h('desc', { id: id + '-desc' }, readable),
            h('defs', null,
              h('radialGradient', { id: id + '-face', cx: '42%', cy: '32%', r: '72%' },
                h('stop', { offset: '0%', stopColor: svgFace0 }),
                h('stop', { offset: '100%', stopColor: svgFace1 })),
              !isContrast && h('linearGradient', { id: id + '-bezel', x1: '0', y1: '0', x2: '1', y2: '1' },
                h('stop', { offset: '0%', stopColor: isDark ? '#64748b' : '#e2e8f0' }),
                h('stop', { offset: '45%', stopColor: svgRing }),
                h('stop', { offset: '100%', stopColor: isDark ? '#0f172a' : '#334155' })),
              !isContrast && h('radialGradient', { id: id + '-sweep', cx: '50%', cy: '50%', r: '55%' },
                h('stop', { offset: '0%', stopColor: svgAccent, stopOpacity: isDark ? 0.34 : 0.22 }),
                h('stop', { offset: '100%', stopColor: svgAccent, stopOpacity: isDark ? 0.14 : 0.08 })),
              !isContrast && h('linearGradient', { id: id + '-crystal', x1: '0', y1: '0', x2: '0.8', y2: '0.9' },
                h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: isDark ? 0.16 : 0.42 }),
                h('stop', { offset: '55%', stopColor: '#ffffff', stopOpacity: 0.03 }),
                h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 }))),
            // Outer brushed-metal horology case & recessed chapter bezel
            !isContrast && h('circle', { cx: 160, cy: 163, r: 151, fill: '#020617', opacity: isDark ? 0.45 : 0.14 }),
            h('circle', { cx: 160, cy: 160, r: 154, fill: 'none', stroke: isContrast ? svgSub : 'url(#' + id + '-bezel)', strokeWidth: 3.5, opacity: isContrast ? 0.55 : 0.85 }),
            h('circle', { cx: 160, cy: 160, r: 146, fill: 'url(#' + id + '-face)',
              stroke: isContrast ? svgRing : 'url(#' + id + '-bezel)', strokeWidth: 8 }),
            !isContrast && h('circle', { cx: 160, cy: 160, r: 141.5, fill: 'none', stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)', strokeWidth: 1.2 }),
            !isContrast && h('circle', { cx: 160, cy: 160, r: 123, fill: 'none', stroke: svgSub, strokeWidth: 0.7, opacity: 0.28 }),
            // Luminous elapsed-minute sector wedge
            sweepPath && h('path', { d: sweepPath, fill: isContrast ? svgAccent : 'url(#' + id + '-sweep)', opacity: isContrast ? 0.18 : 1 }),
            sweepPath && !isContrast && h('path', { d: 'M 160 38 A 122 122 0 ' + (minute > 30 ? 1 : 0) + ' 1 ' + (160 + 122 * Math.sin(ma)).toFixed(1) + ' ' + (160 - 122 * Math.cos(ma)).toFixed(1), fill: 'none', stroke: svgAccent, strokeWidth: 2.2, strokeOpacity: 0.55, strokeLinecap: 'round' }),
            ticks, labels,
            d.showMinuteLabels && !compact && Array.from({length:12},function(_,idx){var angle=idx*Math.PI/6;return h('text',{key:'minute-'+idx,x:160+86*Math.sin(angle),y:164-86*Math.cos(angle),textAnchor:'middle',fontSize:11.5,fontWeight:700,fill:svgAccent},idx*5);}),
            (!d.showMinuteLabels && outer24.length > 0) && outer24,
            !hideTime && !compact && h('g', { 'aria-hidden': 'true' },
              h('rect', { x: 132, y: 196, width: 56, height: 22, rx: 11, fill: svgCardBg, stroke: svgRing, strokeWidth: 1.6 }),
              !isContrast && h('line', { x1: 140, y1: 198, x2: 180, y2: 198, stroke: '#ffffff', strokeOpacity: isDark ? 0.12 : 0.65, strokeWidth: 1 }),
              h('text', { x: 160, y: 211, textAnchor: 'middle', fontSize: 11, fontWeight: '800', fill: svgInk }, hour24 < 12 ? 'AM' : 'PM')),
            // Soft hand drop shadows (suppressed in High-Contrast)
            !isContrast && h('line', { x1: 162, y1: 163, x2: 162 + 70 * Math.sin(ha), y2: 163 - 70 * Math.cos(ha), stroke: '#020617', strokeOpacity: isDark ? 0.45 : 0.18, strokeWidth: 10.5, strokeLinecap: 'round' }),
            !isContrast && h('line', { x1: 162, y1: 163, x2: 162 + 104 * Math.sin(ma), y2: 163 - 104 * Math.cos(ma), stroke: '#020617', strokeOpacity: isDark ? 0.42 : 0.16, strokeWidth: 6.5, strokeLinecap: 'round' }),
            // Hour & minute hands with subtle counterweight tail & specular highlight
            h('line', { x1: 160 - 14 * Math.sin(ha), y1: 160 + 14 * Math.cos(ha), x2: 160 + 70 * Math.sin(ha),
              y2: 160 - 70 * Math.cos(ha), stroke: svgInk, strokeWidth: 10,
              strokeLinecap: 'round' }),
            !isContrast && h('line', { x1: 160, y1: 160, x2: 160 + 62 * Math.sin(ha),
              y2: 160 - 62 * Math.cos(ha), stroke: '#ffffff', strokeOpacity: isDark ? 0.25 : 0.22, strokeWidth: 2.2,
              strokeLinecap: 'round' }),
            h('line', { x1: 160 - 18 * Math.sin(ma), y1: 160 + 18 * Math.cos(ma), x2: 160 + 104 * Math.sin(ma),
              y2: 160 - 104 * Math.cos(ma), stroke: svgAccent, strokeWidth: 6,
              strokeLinecap: 'round' }),
            !isContrast && h('line', { x1: 160, y1: 160, x2: 160 + 96 * Math.sin(ma),
              y2: 160 - 96 * Math.cos(ma), stroke: '#ffffff', strokeOpacity: 0.32, strokeWidth: 1.4,
              strokeLinecap: 'round' }),
            // Specular crystal glass sheen arc across upper-left dial
            !isContrast && h('path', { d: 'M 44 132 A 128 128 0 0 1 250 70 Q 152 128 44 132 Z', fill: 'url(#' + id + '-crystal)', style: { pointerEvents: 'none' } }),
            // Sculpted jewel center pinion
            h('circle', { cx: 160, cy: 160, r: 10.5, fill: isContrast ? '#ffff00' : '#f97316',
              stroke: svgCardBg, strokeWidth: 3 }),
            !isContrast && h('circle', { cx: 158, cy: 158, r: 2.6, fill: '#fff7ed', opacity: 0.85 })),
          h('figcaption', { className: 'mt-1 text-center text-xs text-slate-600' }, readable + (d.showMinuteLabels && !compact ? ' ' + t('stem.timeschedule.hour_moves_gradually','The short hour hand moves gradually between hours as the long minute hand moves.') : ''))
        );
      }
      function heading(id, title, body) {
        return h('div', { className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3' },
          h('div', null, h('h3', { id: id, className: 'text-lg font-black text-slate-900' }, title),
            h('p', { className: 'text-sm text-slate-600' }, body)), formatToggle());
      }
      function clockView() {
        var minute = clock % 60, hour24 = Math.floor(clock / 60);
        var rule = hour24 === 0 ? t('stem.timeschedule.n_00_becomes_12_am', "00 becomes 12 AM.") :
          hour24 === 12 ? t('stem.timeschedule.n_12_stays_12_pm', "12 stays 12 PM.") :
          hour24 > 12 ? t('stem.timeschedule.for_pm_times_after_noon_subtract_12_fr', "For PM times after noon, subtract 12 from the hour.") :
          t('stem.timeschedule.for_am_times_the_hour_stays_the_same', "For AM times, the hour stays the same.");
        return h('section', { className: 'space-y-4',
          'aria-labelledby': 'ts-clock-heading' },
          h('label',{className:'flex items-center gap-2 text-sm text-slate-700'},h('input',{type:'checkbox',checked:!!d.showMinuteLabels,onChange:function(e){upd({showMinuteLabels:e.target.checked});}}),t('stem.timeschedule.show_minute_numbers','Show minute numbers (0–55)')),
          heading('ts-clock-heading', t('stem.timeschedule.clock_link', "Clock Link"),
            t('stem.timeschedule.clock_start', 'Set an exact time, use the + and − buttons, or adjust the minute slider. The clock and both time displays stay linked.')),
          h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
            h('div', { className: 'rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-4 flex justify-center' },
              analog(clock, 'ts-main-clock', false)),
            h('div', { className: 'space-y-4' },
              h('div', { className: 'rounded-2xl bg-slate-950 text-cyan-300 border-4 border-slate-700 p-5 text-center shadow-inner' },
                h('p', { className: 'text-[0.6875rem] font-bold uppercase tracking-[.2em] text-slate-300' },
                  use24 ? '24-hour display' : '12-hour display'),
                h('p', { className: 'font-mono text-4xl sm:text-5xl font-black tracking-wider mt-2',
                  'aria-live': 'polite' }, showTime(clock, use24)),
                h('p', { className: 'text-xs text-slate-300 mt-2' }, time12(clock) + ' = ' + time24(clock)),
                // 24-Hour Day Cycle Bar SVG showing exact position across the 24-hour solar cycle
                (function () {
                  var pinX = 24 + (clock / DAY) * 352;
                  return h('div', { className: 'mt-3 pt-2 border-t border-slate-800' },
                    h('svg', { viewBox: '0 0 400 54', className: 'w-full h-auto', style: { display: 'block' },
                      role: 'img', 'aria-label': t('stem.timeschedule.day_cycle_aria', '24-hour day cycle marker at ') + showTime(clock, use24) },
                      !isContrast && h('defs', null,
                        h('linearGradient', { id: 'ts-solar-bar', x1: '0', y1: '0', x2: '1', y2: '0' },
                          h('stop', { offset: '0%', stopColor: '#1e1b4b' }),
                          h('stop', { offset: '22%', stopColor: '#312e81' }),
                          h('stop', { offset: '30%', stopColor: '#f59e0b' }),
                          h('stop', { offset: '50%', stopColor: '#38bdf8' }),
                          h('stop', { offset: '70%', stopColor: '#fb923c' }),
                          h('stop', { offset: '82%', stopColor: '#312e81' }),
                          h('stop', { offset: '100%', stopColor: '#1e1b4b' })
                        )
                      ),
                      h('rect', { x: 24, y: 13, width: 352, height: 12, rx: 6, fill: isContrast ? '#000000' : 'url(#ts-solar-bar)', stroke: isContrast ? '#ffff00' : 'rgba(148,163,184,0.38)', strokeWidth: 1.2 }),
                      !isContrast && h('line', { x1: 30, y1: 15, x2: 370, y2: 15, stroke: '#ffffff', strokeOpacity: 0.25, strokeWidth: 1 }),
                      [68, 112, 156, 200, 244, 288, 332].map(function(tx) {
                        return h('line', { key: 'st-' + tx, x1: tx, y1: 13, x2: tx, y2: 27, stroke: isContrast ? '#ffff00' : 'rgba(255,255,255,0.28)', strokeWidth: tx === 200 ? 1.5 : 0.9 });
                      }),
                      !isContrast && h('circle', { cx: pinX, cy: 19, r: 11.5, fill: '#f97316', opacity: 0.28 }),
                      h('circle', { cx: pinX, cy: 19, r: 7, fill: isContrast ? '#00ff00' : '#f97316', stroke: '#ffffff', strokeWidth: 2 }),
                      !isContrast && h('circle', { cx: pinX - 1.8, cy: 17.2, r: 2, fill: '#fff7ed', opacity: 0.9 }),
                      [
                        { x: 24, lbl: '00:00' }, { x: 112, lbl: '06:00' }, { x: 200, lbl: '12:00' }, { x: 288, lbl: '18:00' }, { x: 376, lbl: '24:00' }
                      ].map(function (mk) {
                        return h('text', { key: mk.lbl, x: mk.x, y: 45, textAnchor: mk.x === 24 ? 'start' : (mk.x === 376 ? 'end' : 'middle'), fontSize: 10.5, fontWeight: 700, fill: isContrast ? '#ffff00' : '#cbd5e1' }, mk.lbl);
                      })
                    )
                  );
                })()),
              h('div', { className: 'rounded-xl border border-slate-200 bg-white p-4 space-y-3' },
                h('div', { className: 'flex flex-wrap gap-1.5 items-center' },
                  h('span', { className: 'text-[0.6875rem] font-black uppercase tracking-wide text-slate-600 mr-1' }, t('stem.timeschedule.quick_times', 'Quick times:')),
                  [
                    { min: 495, label: t('stem.timeschedule.preset_morning', '8:15 AM') },
                    { min: 720, label: t('stem.timeschedule.preset_noon', '12:00 PM') },
                    { min: 905, label: t('stem.timeschedule.preset_dismissal', '3:05 PM') },
                    { min: 1185, label: t('stem.timeschedule.preset_evening', '7:45 PM') },
                    { min: 0, label: t('stem.timeschedule.preset_midnight', '12:00 AM') }
                  ].map(function (pr) {
                    var activeP = clock === pr.min;
                    return h('button', { key: pr.min, type: 'button', 'aria-pressed': activeP,
                      onClick: function () { setClock(pr.min); },
                      className: 'rounded-full border px-2.5 py-1 text-xs font-bold ' + (activeP ? 'bg-sky-700 text-white border-sky-700' : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100') },
                      pr.label);
                  })),
                h('label', { className: 'block text-xs font-black text-slate-700' }, t('stem.timeschedule.set_an_exact_time', "Set an exact time"),
                  h('input', { type: 'time', value: time24(clock),
                    onChange: function (e) { var v = parseInputTime(e.target.value); if (v != null) setClock(v); },
                    className: 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold focus:ring-2 focus:ring-sky-500',
                    'aria-label': t('stem.timeschedule.set_exact_clock_time', "Set exact clock time") })),
                h('div', { className: 'grid grid-cols-3 sm:grid-cols-6 gap-2',
                  role: 'group', 'aria-label': t('stem.timeschedule.adjust_the_clock', "Adjust the clock") },
                  [-60, -5, -1, 1, 5, 60].map(function (delta) {
                    return h('button', { key: delta, type: 'button',
                      style: { minHeight: 44 }, onClick: function () { setClock(clock + delta); },
                      className: 'rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-xs font-black text-sky-800 hover:bg-sky-100 focus:ring-2 focus:ring-sky-600' },
                      (delta > 0 ? '+' : '−') + (Math.abs(delta) === 60 ? 1 : Math.abs(delta)) +
                      (Math.abs(delta) === 60 ? t('stem.timeschedule.hr', " hr") : t('stem.timeschedule.min', " min")));
                  })),
                h('label', { className: 'block text-xs font-bold text-slate-600' },
                  t('stem.timeschedule.minute_hand_2', "Minute hand: ") + minute + t('stem.timeschedule.minutes', " minutes"),
                  h('input', { type: 'range', min: 0, max: 59, value: minute,
                    onChange: function (e) { setClock(Math.floor(clock / 60) * 60 + +e.target.value); },
                    className: 'w-full accent-sky-600', 'aria-label': t('stem.timeschedule.minute_hand_value', "Minute hand value"),
                    'aria-valuetext': minute + t('stem.timeschedule.minutes', " minutes") }))),
              h('details', { 'data-time-format-guide': true, className: 'rounded-xl border border-indigo-200 bg-indigo-50 p-4' },
                h('summary', { style: { minHeight: 44 }, className: 'cursor-pointer text-sm font-black text-indigo-900' }, t('stem.timeschedule.format_guide_title', 'How 12- and 24-hour time match')),
                h('div', { className: 'grid grid-cols-2 gap-3 mt-2 text-center' },
                  h('div', { className: 'rounded-lg bg-white border border-indigo-100 p-3' },
                    h('div', { className: 'text-[0.625rem] uppercase text-indigo-700 font-bold' }, t('stem.timeschedule.n_12_hour', "12-hour")),
                    h('div', { className: 'text-lg font-black text-indigo-950' }, time12(clock))),
                  h('div', { className: 'rounded-lg bg-white border border-indigo-100 p-3' },
                    h('div', { className: 'text-[0.625rem] uppercase text-indigo-700 font-bold' }, t('stem.timeschedule.n_24_hour', "24-hour")),
                    h('div', { className: 'text-lg font-black text-indigo-950 font-mono' }, time24(clock)))),
                h('p', { className: 'text-xs text-indigo-800 mt-2' }, rule)))));
      }
      function elapsedView() {
        var points = [{ time: start, total: 0 }], total = 0;
        jumps.forEach(function (jump) {
          total += jump.amount;
          points.push({ time: jump.to, total: total, amount: jump.amount });
        });
        var guided = !!d.elapsedStepMode;
        var signature = start + ':' + amount + ':' + direction;
        var step = d.elapsedStepKey === signature ? Math.max(0, Math.min(jumps.length, Number(d.elapsedStep) || 0)) : 0;
        var complete = !guided || step === jumps.length;
        var shownJumps = guided ? jumps.slice(0, step) : jumps;
        var shownPoints = guided ? points.slice(0, step + 1) : points;
        var covered = shownJumps.reduce(function(sum, jump) { return sum + jump.amount; }, 0);
        var guess = d.elapsedStepKey === signature ? d.elapsedPrediction || '' : '';
        return h('section', { className: 'space-y-4',
          'aria-labelledby': 'ts-elapsed-heading' },
          heading('ts-elapsed-heading', t('stem.timeschedule.elapsed_time_timeline', "Elapsed-Time Timeline"),
            t('stem.timeschedule.break_an_interval_into_friendly_jumps_', "Break an interval into friendly jumps to the hour, then combine the jumps.")),
          h('div', { className: "grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4" },
            h('div', { className: 'rounded-2xl border border-slate-200 bg-white p-4 space-y-4' },
              h('label', { className: 'block text-xs font-black text-slate-700' }, t('stem.timeschedule.starting_time', "Starting time"),
                h('input', { type: 'time', value: time24(start),
                  onChange: function (e) { var v = parseInputTime(e.target.value);
                    if (v != null) markElapsed({ elapsedStart: v }); },
                  className: 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-bold' })),
              h('fieldset', null, h('legend', { className: 'text-xs font-black text-slate-700' }, t('stem.timeschedule.direction', "Direction")),
                h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                  [[1, t('stem.timeschedule.count_forward', "Count forward"), 'emerald'], [-1, t('stem.timeschedule.count_backward', "Count backward"), 'amber']].map(function (x) {
                    var active = direction === x[0];
                    return h('button', { key: x[0], type: 'button',
                      onClick: function () { markElapsed({ elapsedDirection: x[0] }); },
                      'aria-pressed': active, className: 'rounded-lg px-2 py-2 text-xs font-bold border ' +
                        (active ? (x[0] > 0 ? 'bg-emerald-700 border-emerald-700 text-white' :
                          'bg-amber-800 border-amber-800 text-white') : 'bg-white border-slate-300 text-slate-600') },
                      x[1]);
                  }))),
              h('div', { className: 'grid grid-cols-2 gap-3' },
                h('label', { className: 'text-xs font-black text-slate-700' }, t('stem.timeschedule.hours', "Hours"),
                  h('input', { type: 'number', min: 0, max: 12, value: Math.floor(amount / 60),
                    onChange: function (e) { markElapsed({ elapsedDuration: clamp(e.target.value, 0, 12) * 60 + amount % 60 }); },
                    className: 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-bold' })),
                h('label', { className: 'text-xs font-black text-slate-700' }, t('stem.timeschedule.minutes_2', "Minutes"),
                  h('input', { type: 'number', min: 0, max: 59, value: amount % 60,
                    onChange: function (e) { markElapsed({ elapsedDuration: Math.floor(amount / 60) * 60 +
                      clamp(e.target.value, 0, 59) }); },
                    className: 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-bold' }))),
              h('div', { className: 'flex flex-wrap gap-1.5 items-center' },
                h('span', { className: 'text-[0.6875rem] font-black uppercase tracking-wide text-slate-600' }, t('stem.timeschedule.elapsed_presets', 'Try a model:')),
                [
                  { id: 'short', label: '+45 min', s: 525, a: 45, dir: 1 },
                  { id: 'noon', label: t('stem.timeschedule.preset_cross_noon', 'Cross Noon'), s: 650, a: 135, dir: 1 },
                  { id: 'midnight', label: t('stem.timeschedule.preset_cross_midnight', 'Cross Midnight'), s: 1415, a: 50, dir: 1 },
                  { id: 'back', label: '−55 min', s: 910, a: 55, dir: -1 }
                ].map(function (ep) {
                  var isCur = start === ep.s && amount === ep.a && direction === ep.dir;
                  return h('button', { key: ep.id, type: 'button', 'aria-pressed': isCur,
                    onClick: function () { markElapsed({ elapsedStart: ep.s, elapsedDuration: ep.a, elapsedDirection: ep.dir }); },
                    className: 'rounded-full border px-2.5 py-1 text-xs font-bold ' + (isCur ? 'bg-sky-700 text-white border-sky-700' : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-sky-50') },
                    ep.label);
                })),
              h('button', { type: 'button', 'aria-pressed': guided, className: 'w-full rounded-lg border border-slate-400 bg-white text-slate-800 p-3 text-sm font-bold',
                onClick: function() { upd({ elapsedStepMode: !guided, elapsedStepKey: signature, elapsedStep: 0, elapsedPrediction: '' }); } }, t('stem.timeschedule.predict_step', 'Predict, then step through')),
              guided && h('div', { className: 'space-y-3' },
                h('label', { className: 'block text-sm font-bold text-slate-700' }, t('stem.timeschedule.your_time_prediction', 'Your predicted time (optional)'),
                  h('input', { type: 'time', value: guess, disabled: complete, className: 'mt-1 w-full rounded-lg border border-slate-300 p-2', onChange: function(e) { upd({ elapsedStepKey: signature, elapsedPrediction: e.target.value }); } })),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { type: 'button', disabled: complete, className: 'rounded-lg bg-sky-800 text-white px-3 py-2 font-bold disabled:opacity-50',
                    onClick: function() { upd({ elapsedStepKey: signature, elapsedStep: step + 1 }); } }, t('stem.timeschedule.next_jump', 'Show next jump')),
                  h('button', { type: 'button', className: 'rounded-lg border border-slate-400 bg-white text-slate-800 px-3 py-2 font-bold',
                    onClick: function() { upd({ elapsedStepKey: signature, elapsedStep: 0, elapsedPrediction: '' }); } }, t('stem.timeschedule.restart_jumps', 'Restart jumps'))),
                h('p', { role: 'status', className: 'text-sm text-slate-700', 'data-jump-progress': true }, step + '/' + jumps.length + ' ' + t('stem.timeschedule.jumps_shown', 'jumps shown') + '. ' + covered + ' / ' + amount + t('stem.timeschedule.minutes', ' minutes') +
                  (step > 0 ? '. ' + showTime(shownPoints[shownPoints.length - 1].time, use24) : '') +
                  (complete && guess ? '. ' + (parseInputTime(guess) === end ? t('stem.timeschedule.prediction_matches', 'Your prediction matches the endpoint.') : t('stem.timeschedule.prediction_revisit', 'Compare your prediction with the jumps. Which jump changes your thinking?')) : ''))),
              h('div', { className: 'rounded-xl bg-slate-950 text-white p-4 text-center' },
                h('p', { className: 'text-[0.625rem] uppercase tracking-widest text-slate-300 font-bold' },
                  direction > 0 ? t('stem.timeschedule.ending_time', "Ending time") : t('stem.timeschedule.earlier_starting_time', "Earlier starting time")),
                h('p', { className: 'text-3xl font-black font-mono text-cyan-300 mt-1',
                  'aria-live': 'polite', 'data-elapsed-result': true }, complete ? showTime(end, use24) : '?'),
                h('p', { className: 'text-xs text-slate-300 mt-1' },
                  (complete ? (rawEnd >= DAY ? t('stem.timeschedule.next_day', "next day") : rawEnd < 0 ? t('stem.timeschedule.previous_day', "previous day") : t('stem.timeschedule.same_day', "same day")) : t('stem.timeschedule.follow_jumps', 'Follow the jumps to find the time')) +
                  ' · ' + durationText(amount)))),
            h('div', { className: 'rounded-2xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white p-3 sm:p-5 overflow-hidden' },
              h('p', { className: 'text-xs text-slate-700 mb-2' }, t('stem.timeschedule.scroll_timeline', 'Scroll the timeline to follow the jumps. Each jump is also written below.')),
              h('div', { role: 'region', tabIndex: 0, 'aria-label': t('stem.timeschedule.scrollable_timeline', 'Scrollable elapsed-time timeline'),
                style: { overflowX: 'auto', borderRadius: 12 },
                ref: function(el) {
                  var viewKey = signature + ':' + guided + ':' + step;
                  if (!el || el.getAttribute('data-jump-view') === viewKey) return;
                  el.setAttribute('data-jump-view', viewKey);
                  var progress = guided && amount ? covered / amount : 0;
                  var x = direction > 0 ? 55 + progress * 610 : 665 - progress * 610;
                  el.scrollLeft = Math.max(0, x * el.scrollWidth / 720 - el.clientWidth / 2);
                } },
              h('svg', { viewBox: '0 0 720 190', className: 'w-full h-auto', style: { minWidth: 720, display: 'block', background: svgCardBg, borderRadius: 12 },
                role: 'img', 'aria-labelledby': 'ts-jump-title ts-jump-desc' },
                h('title', { id: 'ts-jump-title' }, t('stem.timeschedule.elapsed_time_jump_timeline', "Elapsed-time jump timeline")),
                h('desc', { id: 'ts-jump-desc' }, t('stem.timeschedule.from', 'From ') + showTime(start, use24) + '. ' +
                  (direction > 0 ? t('stem.timeschedule.forward', 'forward ') : t('stem.timeschedule.backward', 'backward ')) + durationText(amount) + '. ' +
                  (complete ? t('stem.timeschedule.ending_time', 'Ending time') + ': ' + showTime(end, use24) : t('stem.timeschedule.endpoint_hidden', 'The endpoint is hidden until all jumps are shown.'))),
                !isContrast && h('defs', null,
                  h('linearGradient', { id: 'ts-el-well', x1: '0', y1: '0', x2: '0', y2: '1' },
                    h('stop', { offset: '0%', stopColor: isDark ? '#0f172a' : '#f8fafc' }),
                    h('stop', { offset: '100%', stopColor: isDark ? '#020617' : '#f1f5f9' })
                  )
                ),
                h('rect', { x: 2, y: 2, width: 716, height: 186, rx: 10, fill: isContrast ? '#000000' : 'url(#ts-el-well)', stroke: isContrast ? '#ffff00' : (isDark ? '#1e293b' : '#cbd5e1'), strokeWidth: 1.2 }),
                // Subtle ruler ticks along the timeline rail
                [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function(ti) {
                  var tx = 55 + (ti / 8) * 610;
                  return h('line', { key: 'rt-' + ti, x1: tx, y1: 99, x2: tx, y2: 111, stroke: isContrast ? '#ffff00' : svgSub, strokeWidth: 1, opacity: 0.35 });
                }),
                // Beveled main timeline rail
                h('rect', { x: 52, y: 101.5, width: 616, height: 7, rx: 3.5, fill: isContrast ? '#000000' : (isDark ? '#334155' : '#cbd5e1'), stroke: svgInk, strokeWidth: 1.5 }),
                shownPoints.map(function (point, i) {
                  var progress = amount ? point.total / amount : 0;
                  var priorProgress = i && amount ? (point.total - point.amount) / amount : progress;
                  var x = direction > 0 ? 55 + progress * 610 : 665 - progress * 610;
                  var priorX = direction > 0 ? 55 + priorProgress * 610 : 665 - priorProgress * 610;
                  var midX = (priorX + x) / 2;
                  var arcCol = isContrast ? (i % 2 ? '#ffff00' : '#00ff00') : (i % 2 ? '#0284c7' : '#8b5cf6');
                  var jumpLbl = (direction > 0 ? '+' : '−') + point.amount + t('stem.timeschedule.min', " min");
                  var pillW = Math.max(58, jumpLbl.length * 8.2 + 16);
                  var isStart = i === 0, isEnd = i === points.length - 1;
                  var nodeCol = isStart ? (isContrast ? '#ffff00' : '#f97316') : isEnd ? (isContrast ? '#00ff00' : '#10b981') : svgCardBg;
                  return h('g', { key: i },
                    // Dual-pass luminous jump arc + pill badge
                    i > 0 && !isContrast && h('path', { d: 'M ' + priorX + ' 91 Q ' + midX + ' 35 ' + x + ' 91', fill: 'none', stroke: arcCol, strokeWidth: 9, strokeOpacity: 0.16, strokeLinecap: 'round' }),
                    i > 0 && h('path', { d: 'M ' + priorX + ' 91 Q ' + midX + ' 35 ' + x + ' 91', fill: 'none', stroke: arcCol, strokeWidth: 3.8, strokeLinecap: 'round' }),
                    i > 0 && h('rect', { x: midX - pillW / 2, y: 15, width: pillW, height: 24, rx: 12, fill: svgCardBg, stroke: arcCol, strokeWidth: 1.6 }),
                    i > 0 && h('text', { x: midX, y: 31.5, textAnchor: 'middle', fill: svgInk, fontSize: 13.5, fontWeight: '800' }, jumpLbl),
                    // Sculpted waypoint beacon
                    (isStart || isEnd) && !isContrast && h('circle', { cx: x, cy: 105, r: 15.5, fill: nodeCol, opacity: 0.22 }),
                    h('circle', { cx: x, cy: 105, r: isStart || isEnd ? 10 : 7, fill: nodeCol, stroke: svgInk, strokeWidth: 3 }),
                    (isStart || isEnd) && !isContrast && h('circle', { cx: x - 2.4, cy: 102.6, r: 2.4, fill: '#ffffff', opacity: 0.8 }),
                    h('text', { x: x, y: 138 + i % 2 * 22, textAnchor: 'middle', fill: svgInk, fontSize: 14, fontWeight: '800' }, showTime(point.time, use24)));
                }))),
              h('div', { className: 'rounded-xl border border-cyan-200 bg-white p-3' },
                h('h4', { className: 'text-xs font-black uppercase tracking-wide text-cyan-800' },
                  t('stem.timeschedule.text_alternative_jump_strategy', "Text alternative: jump strategy")),
                shownJumps.length ? h('ol', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2' },
                  shownJumps.map(function (jump, i) {
                    return h('li', { key: i, className: 'rounded-lg bg-cyan-50 px-3 py-2 text-xs text-slate-700' },
                      h('strong', { className: 'text-cyan-800' }, t('stem.timeschedule.jump', "Jump ") + (i + 1) + ': '),
                      showTime(jump.from, use24) + ' → ' + showTime(jump.to, use24) +
                      ' (' + jump.amount + t('stem.timeschedule.min_2', " min)"));
                  })) : h('p', { className: 'text-xs text-slate-600 mt-2' },
                    amount === 0 ? t('stem.timeschedule.the_interval_is_zero_so_start_and_end_', 'The interval is zero, so start and end are the same.') : t('stem.timeschedule.first_jump_prompt', 'Predict the next landing time, then show one jump to check.')),
                h('p', { className: 'text-sm font-black border-t border-cyan-100 mt-3 pt-3' },
                  shownJumps.map(function (j) { return j.amount; }).join(' + ') +
                  (shownJumps.length ? ' = ' : '') + covered + t('stem.timeschedule.minutes', " minutes"))))));
      }
      function scheduleView() {
        var events = schedule.events, timeline = scheduleTimeline(events);
        var span = timeline[timeline.length - 1].end - timeline[0].start;
        var busy = timeline.reduce(function (sum, item) { return sum + item.duration; }, 0);
        var feedback = d.scheduleFeedback;
        var stableFeedback = !!(feedback && typeof feedback.schedule === 'string' &&
          typeof feedback.questionId === 'string' && feedback.schedule && feedback.questionId);
        var legacyFeedback = !!(feedback && !feedback.questionId && feedback.index != null);
        if (feedback && !stableFeedback && !legacyFeedback) feedback = null;
        if (feedback && stableFeedback &&
            (feedback.schedule !== scheduleKey || feedback.questionId !== sq.id)) feedback = null;
        if (feedback && legacyFeedback &&
            ((feedback.schedule && feedback.schedule !== scheduleKey) || feedback.index !== sqIndex)) feedback = null;
        var solvedKey = scheduleKey + ':' + sq.id;
        var alreadySolved = !!normalizeScheduleSolvedMap(d.scheduleSolvedKeys)[solvedKey];
        var focus = sq.id === 'event-duration' ? { start:timeline[1].start, end:timeline[1].end, rows:[1] }
          : sq.id === 'between-events-gap' ? { start:timeline[1].end, end:timeline[2].start, rows:[1,2] }
          : sq.id === 'event-start-24h' ? { start:timeline[3].start, end:timeline[3].start, rows:[3] }
          : { start:timeline[0].start, end:timeline[timeline.length-1].end, rows:timeline.map(function(_,i){return i;}) };
        var worked = d.scheduleWorkedKey === solvedKey || !!(feedback && feedback.ok);
        var questionTime = function(value) { return scheduleTimeLabel(value, sq.type === 'time' && !worked ? false : use24); };
        var requested = function(value, hidden) { return !worked && hidden ? t('stem.timeschedule.find_this_value','Work out this value') : value; };
        function intervalModel() {
          var elapsed = focus.end-focus.start, running=focus.start;
          var parts = makeJumps(focus.start, elapsed, 1).map(function(jump){var from=running;running+=jump.amount;return{from:from,to:running,amount:jump.amount};});
          var xAt=function(value){return 32+(elapsed ? (value-focus.start)/elapsed : 0)*296;};
          return h('div', {'data-schedule-model':sq.id,className:'rounded-xl border border-slate-300 bg-white p-3 space-y-2'},
            h('p',{className:'text-xs font-bold'},sq.type==='time'
              ? t('stem.timeschedule.focus_start_time','Focus on the highlighted event’s starting time.')
              : sq.id==='between-events-gap' ? t('stem.timeschedule.focus_gap','Measure the free interval from the end of one event to the start of the next.')
              : t('stem.timeschedule.focus_interval','Use these two times to work out the interval.')),
            sq.type==='time' ? h('p',{'data-focus-time':true,className:'text-xl font-black'},questionTime(focus.start))
              : h('svg',{viewBox:'0 0 360 82',role:'img','aria-label':t('stem.timeschedule.interval_between','Interval from ')+questionTime(focus.start)+' → '+questionTime(focus.end),style:{display:'block',width:'100%',background:svgCardBg,borderRadius:8}},
                h('rect',{x:1,y:1,width:358,height:80,rx:8,fill:isContrast?'#000000':(isDark?'#0f172a':'#f8fafc'),stroke:isContrast?'#ffff00':(isDark?'#334155':'#cbd5e1'),strokeWidth:1}),
                h('line',{x1:32,x2:328,y1:64,y2:64,stroke:svgInk,strokeWidth:3.5,strokeLinecap:'round'}),
                [focus.start,focus.end].map(function(value,i){var ex=xAt(value);return h('g',{key:i},
                  h('line',{x1:ex,x2:ex,y1:54,y2:74,stroke:svgInk,strokeWidth:2.6,strokeLinecap:'round'}),
                  h('circle',{cx:ex,cy:64,r:4.5,fill:i===0?(isContrast?'#ffff00':'#f97316'):(isContrast?'#00ff00':'#10b981'),stroke:svgInk,strokeWidth:1.5}));}),
                worked ? parts.map(function(part,i){var x1=xAt(part.from),x2=xAt(part.to),mx=(x1+x2)/2;return h('g',{key:i,'data-schedule-jump':part.amount,'data-jump-start':part.from,'data-jump-end':part.to},
                  !isContrast && h('path',{d:'M '+x1+' 61 Q '+mx+' 14 '+x2+' 61',fill:'none',stroke:svgAccent,strokeWidth:6,strokeOpacity:0.18,strokeLinecap:'round'}),
                  h('path',{d:'M '+x1+' 61 Q '+mx+' 14 '+x2+' 61',fill:'none',stroke:svgAccent,strokeWidth:2.5,strokeLinecap:'round'}),
                  h('rect',{x:mx-16,y:14,width:32,height:18,rx:9,fill:svgCardBg,stroke:svgAccent,strokeWidth:1.2}),
                  h('text',{x:mx,y:27,textAnchor:'middle',fill:svgInk,fontSize:11.5,fontWeight:'bold'},'+'+part.amount));})
                  : h('g',null,
                    h('circle',{cx:180,cy:34,r:14,fill:svgCardBg,stroke:svgAccent,strokeWidth:1.8,strokeDasharray:'3 2'}),
                    h('text',{x:180,y:40,textAnchor:'middle',fill:svgInk,fontSize:16,fontWeight:'bold'},'?'))),
            sq.type!=='time'&&h('div',{'data-schedule-endpoints':true,className:'grid grid-cols-2 gap-3 text-sm'},
              h('p',null,h('span',{className:'block text-xs'},t('stem.timeschedule.interval_from','From')),h('strong',null,questionTime(focus.start))),
              h('p',{className:'text-right'},h('span',{className:'block text-xs'},t('stem.timeschedule.interval_to','To')),h('strong',null,questionTime(focus.end)))),
            !worked && h('p',{className:'text-xs'},sq.type==='time'
              ? t('stem.timeschedule.convert_start_prompt','Keep the minutes. Decide how the hour is written in 24-hour time.')
              : t('stem.timeschedule.interval_predict','Plan your jumps before showing the worked interval.')),
            worked && h('div',{'data-schedule-worked':true,role:'status','aria-live':'polite',className:'space-y-2'},
              sq.type==='time' ? h('p',{className:'text-sm font-bold'},time12(focus.start)+' = '+time24(focus.start))
                : h('div',null,
                  h('ol',{className:'text-xs space-y-1'},parts.map(function(part,i){return h('li',{key:i},questionTime(part.from)+' → '+questionTime(part.to)+' : +'+part.amount+' '+t('stem.timeschedule.interval_min','min'));})),
                  h('p',{'data-schedule-sum':elapsed,className:'text-sm font-bold mt-2'},parts.map(function(part){return part.amount;}).join(' + ')+' = '+elapsed+' '+t('stem.timeschedule.interval_minutes','minutes')))),
            !(feedback&&feedback.ok)&&h('button',{type:'button','aria-expanded':worked,onClick:function(){upd({scheduleWorkedKey:worked?null:solvedKey});},className:'rounded-lg border border-slate-500 px-3 py-2 text-xs font-bold',style:{minHeight:44}},
              worked?t('stem.timeschedule.hide_worked_interval','Hide worked interval'):t('stem.timeschedule.show_worked_interval','Show worked interval')));
        }

        function check() {
          var result = checkAnswer(d.scheduleAnswer || '', sq.type, sq.answer, sq.answerFormat);
          if (!result.valid) {
            var formatMessage = sq.answerFormat === '24' ? t('stem.timeschedule.use_24_hour_form_such_as_13_25', "Use 24-hour form such as 13:25.") :
              sq.answerFormat === '12' ? t('stem.timeschedule.use_12_hour_form_with_am_or_pm', "Use 12-hour form with AM or PM.") :
              sq.type === 'time' ? t('stem.timeschedule.enter_a_time_such_as_13_25_or_1_25_pm', "Enter a time such as 13:25 or 1:25 PM.") :
              t('stem.timeschedule.enter_minutes_or_a_duration_such_as_1_', "Enter minutes or a duration such as 1 h 15 m.");
            upd({ scheduleFeedback: { ok: false, questionId: sq.id,
              schedule: scheduleKey, message: formatMessage } });
          } else if (result.ok) {
            var firstSolve = !alreadySolved;
            alreadySolved = true;
            upd(function (current) {
              var solved = normalizeScheduleSolvedMap(current.scheduleSolvedKeys);
              solved[solvedKey] = true;
              return {
                scheduleFeedback: { ok: true, questionId: sq.id, schedule: scheduleKey,
                  message: t('stem.timeschedule.correct', "Correct! ") + sq.explanation },
                scheduleSolvedKeys: solved,
                scheduleSolved: countKnownKeys(solved, SCHEDULE_QUESTION_IDS)
              };
            });
            if (firstSolve) award('timeSchedule', 5, t('stem.timeschedule.schedule_reasoning', "schedule reasoning"));
          } else {
            upd({ scheduleFeedback: { ok: false, questionId: sq.id, schedule: scheduleKey, message:
              t('stem.timeschedule.not_yet_draw_jumps_between_the_two_tim', "Not yet. Draw jumps between the two times and try again.") } });
          }
        }
        return h('section', { className: 'space-y-4',
          'aria-labelledby': 'ts-schedule-heading' },
          heading('ts-schedule-heading', t('stem.timeschedule.schedule_planner', "Schedule Planner"),
            t('stem.timeschedule.compare_event_lengths_free_time_gaps_a', "Compare event lengths, free-time gaps, and the span of an entire plan.")),
          h('style',null,'.ts-schedule-workspace>aside{order:-1}.ts-schedule-scroll-note{display:block}@media(min-width:768px){.ts-schedule-scroll-note{display:none}}@media(min-width:1024px){.ts-schedule-workspace>aside{order:0}}'),
          h('div', { className: "ts-schedule-workspace grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4" },
            h('div', { className: 'rounded-2xl border border-violet-200 bg-white overflow-hidden' },
              h('div', { className: 'bg-violet-700 text-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3' },
                h('div', null, h('h4', { className: 'font-black' }, schedule.icon + ' ' + schedule.label),
                  h('p', { className: 'text-xs text-violet-100' },
                    scheduleTimeLabel(timeline[0].start, use24) + t('stem.timeschedule.to', " to ") +
                    scheduleTimeLabel(timeline[timeline.length - 1].end, use24) +
                    (timeline[timeline.length - 1].end >= DAY ? t('stem.timeschedule.crosses_midnight', " (crosses midnight)") : ''))),
                h('select', { value: scheduleKey, 'aria-label': t('stem.timeschedule.choose_a_schedule', "Choose a schedule"),
                  onChange: function (e) { upd({ scheduleKey: e.target.value,
                    scheduleQuestionIndex: 0, scheduleAnswer: '', scheduleFeedback: null, scheduleWorkedKey:null }); },
                  className: 'rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-950' },
                  Object.keys(SCHEDULES).map(function (key) {
                    return h('option', { key: key, value: key }, SCHEDULES[key].label);
                  }))),
              // Visual Gantt Timeline Strip SVG showing event blocks & free-time gaps proportionally
              (function () {
                var t0 = timeline[0].start, t1 = timeline[timeline.length - 1].end, totalS = Math.max(1, t1 - t0);
                var gx = function (v) { return 20 + ((v - t0) / totalS) * 600; };
                return h('div', { className: 'px-3 pt-3 pb-1 border-b border-violet-100' },
                  h('svg', { viewBox: '0 0 640 86', className: 'w-full h-auto', style: { display: 'block', background: svgCardBg, borderRadius: 8 },
                    role: 'img', 'aria-label': schedule.label + ' ' + t('stem.timeschedule.visual_timeline_aria', 'proportional schedule timeline bar') },
                    !isContrast && h('defs', null,
                      h('pattern', { id: 'ts-gap-hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
                        h('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.16)', strokeWidth: 2 })
                      )
                    ),
                    // Recessed timeline trough with free-gap hatch
                    h('rect', { x: 20, y: 20, width: 600, height: 32, rx: 7, fill: isContrast ? '#000000' : (isDark ? '#0f172a' : '#f1f5f9'), stroke: isContrast ? '#ffff00' : (isDark ? '#334155' : '#cbd5e1'), strokeWidth: 1.5 }),
                    !isContrast && h('rect', { x: 21, y: 21, width: 598, height: 30, rx: 6, fill: 'url(#ts-gap-hatch)' }),
                    timeline.map(function (item, idx) {
                      var bx = gx(item.start), bw = Math.max(8, gx(item.end) - bx);
                      var focused = focus.rows.indexOf(idx) >= 0;
                      return h('g', { key: idx },
                        !isContrast && focused && h('rect', { x: bx - 2, y: 21, width: bw + 4, height: 30, rx: 6, fill: item.event[3], opacity: 0.28 }),
                        h('rect', { x: bx, y: 23, width: bw, height: 26, rx: 5, fill: isContrast ? '#000000' : item.event[3], opacity: focused ? 1 : 0.78, stroke: focused ? (isContrast ? '#00ff00' : svgInk) : (isContrast ? '#ffff00' : 'rgba(255,255,255,0.28)'), strokeWidth: focused ? 2.2 : 1 }),
                        !isContrast && bw > 14 && h('rect', { x: bx + 2, y: 24.5, width: bw - 4, height: 4, rx: 2, fill: '#ffffff', opacity: focused ? 0.34 : 0.2 }),
                        bw > 34 && h('text', { x: bx + bw / 2, y: 40.5, textAnchor: 'middle', fontSize: 10.5, fontWeight: 800, fill: isContrast ? '#ffff00' : '#ffffff' }, String(idx + 1)));
                    }),
                    h('line', { x1: 20, y1: 52, x2: 20, y2: 58, stroke: svgInk, strokeWidth: 1.5 }),
                    h('line', { x1: 620, y1: 52, x2: 620, y2: 58, stroke: svgInk, strokeWidth: 1.5 }),
                    h('text', { x: 20, y: 73, textAnchor: 'start', fontSize: 11, fontWeight: 700, fill: svgInk }, scheduleTimeLabel(t0, use24)),
                    h('text', { x: 320, y: 73, textAnchor: 'middle', fontSize: 10.5, fontWeight: 700, fill: svgSub }, t('stem.timeschedule.gantt_legend', 'Colored blocks = events · empty slots = free gaps')),
                    h('text', { x: 620, y: 73, textAnchor: 'end', fontSize: 11, fontWeight: 700, fill: svgInk }, scheduleTimeLabel(t1, use24))
                  ));
              })(),
              h('div', {
                className: 'overflow-x-auto rounded-b-xl focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-inset',
                role: 'region', tabIndex: 0,
                'aria-label': schedule.label + t('stem.timeschedule.scrollable_event_schedule', " scrollable event schedule")
              },
                h('p',{className:'ts-schedule-scroll-note text-xs p-3'},t('stem.timeschedule.scroll_schedule_columns','Scroll sideways to see event lengths and gaps.')),
                h('table', { className: 'w-full text-sm border-collapse' },
                  h('caption', { className: 'sr-only' }, schedule.label + t('stem.timeschedule.event_schedule', " event schedule")),
                  h('thead', { className: 'bg-violet-50 text-violet-900' },
                    h('tr', null, [t('stem.timeschedule.event', "Event"), t('stem.timeschedule.start', "Start"), t('stem.timeschedule.end', "End"), t('stem.timeschedule.length', "Length"), t('stem.timeschedule.gap_after', "Gap after")].map(function (label) {
                      return h('th', { key: label, scope: 'col',
                        className: 'text-left px-3 py-3 font-black' }, label);
                    }))),
                  h('tbody', null, events.map(function (e, i) {
                    var item = timeline[i];
                    var gap = i < events.length - 1 ? timeline[i + 1].start - item.end : null;
                    return h('tr', { key: e[0], 'data-schedule-focus':focus.rows.indexOf(i)>=0?'true':'false',className: 'border-t border-violet-100',style:focus.rows.indexOf(i)>=0?{borderLeft:'4px solid #7c3aed'}:{} },
                      h('th', { scope: 'row', className: 'text-left px-3 py-3 font-bold whitespace-nowrap' },
                        h('span', { className: 'inline-block w-3 h-3 rounded-full mr-2',
                          style: { backgroundColor: e[3] }, 'aria-hidden': 'true' }), e[0],
                        focus.rows.indexOf(i)>=0&&h('span',{className:'block text-xs font-normal'},t('stem.timeschedule.relevant_event','For this question'))),
                      h('td', { className: 'px-3 py-3 font-mono whitespace-nowrap' }, sq.id==='event-start-24h'&&i===3&&!worked?questionTime(item.start):scheduleTimeLabel(item.start, use24)),
                      h('td', { className: 'px-3 py-3 font-mono whitespace-nowrap' }, scheduleTimeLabel(item.end, use24)),
                      h('td', { className: 'px-3 py-3 whitespace-nowrap' }, requested(durationText(item.duration),sq.id==='event-duration'&&i===1)),
                      h('td', { className: 'px-3 py-3 whitespace-nowrap' }, gap == null ? '—' : requested(durationText(gap),sq.id==='between-events-gap'&&i===1)));
                  })))),
              h('div', { className: 'grid grid-cols-3 gap-2 bg-slate-50 border-t p-3 text-center' },
                [[span, t('stem.timeschedule.total_span', "Total span"), 'text-violet-700'], [busy, t('stem.timeschedule.scheduled', "Scheduled"), 'text-emerald-700'],
                  [span - busy, t('stem.timeschedule.free_time', "Free time"), 'text-amber-700']].map(function (x) {
                  return h('div', { key: x[1] },
                    h('p', { className: 'text-base font-black ' + x[2] }, requested(durationText(x[0]),sq.id==='full-schedule-span'&&x[0]===span)),
                    h('p', { className: 'text-[0.625rem] uppercase text-slate-500 font-bold' }, x[1]));
                }))),
            h('aside', { className: 'rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-4 space-y-4' },
              h('div', null,
                h('p', { className: 'text-[0.625rem] uppercase tracking-widest font-black text-amber-700' },
                  t('stem.timeschedule.schedule_reasoning_2', "Schedule reasoning ") + (sqIndex + 1) + '/' + sqs.length),
                h('h4', { id: 'ts-schedule-prompt', className: 'text-base font-black text-slate-900 mt-1' }, sq.prompt)),
              intervalModel(),
              h('label', { htmlFor: 'ts-schedule-answer', className: 'block text-xs font-bold text-slate-700' },
                sq.type === 'time' ? (sq.answerFormat === '24' ? t('stem.timeschedule.your_time_24_hour', "Your time (24-hour)") :
                  sq.answerFormat === '12' ? t('stem.timeschedule.your_time_12_hour', "Your time (12-hour)") : t('stem.timeschedule.your_time', "Your time")) : t('stem.timeschedule.your_elapsed_time', "Your elapsed time"),
                h('input', { id: 'ts-schedule-answer', type: 'text', value: d.scheduleAnswer || '',
                  onChange: function (e) { upd({ scheduleAnswer: e.target.value, scheduleFeedback: null }); },
                  onKeyDown: function (e) { if (e.key === 'Enter') check(); },
                  'aria-invalid': !!(feedback && !feedback.ok),
                  'aria-describedby': 'ts-schedule-prompt' + (feedback ? ' ts-schedule-feedback' : ''),
                  placeholder: sq.answerFormat === '24' ? t('stem.timeschedule.example_13_25', "Example: 13:25") :
                    sq.answerFormat === '12' ? t('stem.timeschedule.example_1_25_pm', "Example: 1:25 PM") :
                    sq.type === 'time' ? t('stem.timeschedule.example_13_25_or_1_25_pm', "Example: 13:25 or 1:25 PM") : t('stem.timeschedule.example_75_min', "Example: 75 min"),
                  className: "mt-1 w-full rounded-lg border border-amber-300 px-3 py-2.5 font-bold" })),
              h('div', { className: 'flex gap-2' },
                h('button', { type: 'button', onClick: check,
                  className: "flex-1 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-900" },
                  t('stem.timeschedule.check_answer', "Check answer")),
                h('button', { type: 'button', onClick: function () {
                  upd({ scheduleQuestionIndex: (sqIndex + 1) % sqs.length,
                    scheduleAnswer: '', scheduleFeedback: null, scheduleWorkedKey:null });
                }, className: "rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-800" },
                  t('stem.timeschedule.next', "Next"))),
              feedback && h('div', { id: 'ts-schedule-feedback', role: 'status', 'aria-live': 'polite', className: 'rounded-xl border p-3 text-sm font-bold ' +
                (feedback.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                  'border-rose-300 bg-rose-50 text-rose-800') },
                (feedback.ok ? '✓ ' : t('stem.timeschedule.try_again', "Try again: ")) + feedback.message),
              h('details', { className: 'rounded-xl border border-slate-200 bg-white p-3' },
                h('summary', { className: 'cursor-pointer text-xs font-black' }, t('stem.timeschedule.strategy_hint', "Strategy hint")),
                h('p', { className: 'text-xs text-slate-600 mt-2' },
                  t('stem.timeschedule.mark_both_times_on_a_number_line_jump_', "Mark both times on a number line. Jump to a friendly hour, add whole hours, then finish the remaining minutes."))))));
      }
      function challengeView() {
        var feedback = d.challengeFeedback;
        var stableFeedback = !!(feedback && typeof feedback.challengeId === 'string' && feedback.challengeId);
        var legacyFeedback = !!(feedback && !feedback.challengeId && feedback.index != null);
        if (feedback && !stableFeedback && !legacyFeedback) feedback = null;
        if (feedback && stableFeedback && feedback.challengeId !== challengeId) feedback = null;
        if (feedback && legacyFeedback && feedback.index !== chIndex) feedback = null;
        var solvedChallenges = solvedChallengeMap;
        var alreadySolvedChallenge = !!solvedChallenges[challengeId];
        if (feedback && feedback.ok && !alreadySolvedChallenge) feedback = null;
        var locked = alreadySolvedChallenge;
        if (alreadySolvedChallenge && !(feedback && feedback.ok)) {
          feedback = { ok: true, challengeId: challengeId,
            message: t('stem.timeschedule.solved_previously', "Solved previously. ") + challenge.explanation };
        }
        var missedChallengeIds = challengeMissedIds(d, challengeDifficulty);
        var selectedDifficulty = CHALLENGE_DIFFICULTIES.filter(function(item) {
          return item.id === challengeDifficulty;
        })[0];
        var submissionPending = false;
        function recordMiss(message, countAttempt) {
          upd(function (current) {
            var solved = normalizeChallengeMap(current.solvedChallenges);
            var missed = normalizeChallengeMap(current.missedChallenges);
            var attempts = Object.assign({}, current.challengeAttempts || {});
            attempts[challengeId] = (attempts[challengeId] || 0) + 1;
            if (!solved[challengeId]) missed[challengeId] = true;
            var patch = {
              challengeFeedback: { ok: false, challengeId: challengeId, message: message },
              solvedChallenges: solved,
              missedChallenges: missed,
              challengeAttempts: attempts
            };
            if (countAttempt) {
              var currentScore = current.score || { correct: 0, total: 0 };
              var types = Object.assign({}, current.challengeTypesUsed || {});
              types[challenge.kind] = true;
              patch.score = { correct: countKnownKeys(solved, TIME_CHALLENGE_IDS),
                total: (currentScore.total || 0) + 1 };
              patch.streak = 0;
              patch.challengeTypesUsed = types;
            }
            return patch;
          });
        }
        function check() {
          if (locked || submissionPending) return;
          submissionPending = true;
          var result = checkAnswer(challengeAnswer, challenge.type, challenge.answer, challenge.answerFormat, challenge.kind === 'read');
          if (!result.valid) {
            var formatMessage = challenge.answerFormat === '24' ? t('stem.timeschedule.use_24_hour_form_such_as_18_40', "Use 24-hour form such as 18:40.") :
              challenge.answerFormat === '12' ? t('stem.timeschedule.use_12_hour_form_with_am_or_pm', "Use 12-hour form with AM or PM.") :
              challenge.type === 'time' ? t('stem.timeschedule.enter_a_time_such_as_18_40_or_6_40_pm', "Enter a time such as 18:40 or 6:40 PM.") :
              t('stem.timeschedule.enter_minutes_or_a_duration_such_as_2_', "Enter minutes or a duration such as 2 h 15 m.");
            recordMiss(formatMessage, false);
            return;
          }
          if (result.ok) {
            locked = true;
            upd(function (current) {
              var solved = normalizeChallengeMap(current.solvedChallenges);
              var missed = normalizeChallengeMap(current.missedChallenges);
              var attempts = Object.assign({}, current.challengeAttempts || {});
              var firstSolve = !solved[challengeId];
              solved[challengeId] = true;
              delete missed[challengeId];
              attempts[challengeId] = (attempts[challengeId] || 0) + 1;
              var currentScore = current.score || { correct: 0, total: 0 };
              var streak = firstSolve ? (current.streak || 0) + 1 : (current.streak || 0);
              var types = Object.assign({}, current.challengeTypesUsed || {});
              types[challenge.kind] = true;
              return { challengeFeedback: { ok: true, challengeId: challengeId,
                message: challenge.explanation },
                solvedChallenges: solved, missedChallenges: missed, challengeAttempts: attempts,
                score: { correct: countKnownKeys(solved, TIME_CHALLENGE_IDS),
                  total: (currentScore.total || 0) + 1 },
                streak: streak, bestStreak: Math.max(current.bestStreak || 0, streak),
                challengeTypesUsed: types };
            });
            if (!alreadySolvedChallenge) award('timeSchedule', 5, t('stem.timeschedule.time_challenge', "time challenge"));
            alreadySolvedChallenge = true;
          } else {
            recordMiss(t('stem.timeschedule.not_yet_use_a_clock_timeline_or_minute', "Not yet. Use a clock, timeline, or minutes after midnight."), true);
          }
        }
        function moveChallenge(direction) {
          var retryIds = challengeMissedIds(d, challengeDifficulty);
          if (retryMode && feedback && feedback.ok) {
            if (retryIds.length) {
              var retryTarget = direction < 0 ? retryIds[retryIds.length - 1] : retryIds[0];
              upd({ challengeId: retryTarget, challengeAnswer: '', challengeFeedback: null });
              announce(t('stem.timeschedule.moving_to_another_missed_challenge', "Moving to another missed challenge."));
              return;
            }
            var completedAt = difficultyChallenges.findIndex(function(item) { return item.id === challengeId; });
            var completedTarget = difficultyChallenges[(completedAt + direction + difficultyChallenges.length) % difficultyChallenges.length];
            upd({ challengePracticeMode: 'all', challengeId: completedTarget.id,
              challengeAnswer: '', challengeFeedback: null });
            announce(t('stem.timeschedule.retry_set_complete_returning_to_all_ch', "Retry set complete. Returning to all challenges."));
            return;
          }
          var pool = retryMode && retryIds.length ?
            retryIds.map(challengeById).filter(Boolean) : difficultyChallenges;
          var at = pool.findIndex(function(item) { return item.id === challengeId; });
          if (at < 0) at = 0;
          var target = pool[(at + direction + pool.length) % pool.length];
          upd({ challengePracticeMode: retryMode ? 'retry' : 'all',
            challengeId: target.id, challengeAnswer: '', challengeFeedback: null });
          announce((direction < 0 ? t('stem.timeschedule.previous', "Previous") : t('stem.timeschedule.next', "Next")) + t('stem.timeschedule.challenge_opened', " challenge opened."));
        }
        function chooseDifficulty(nextDifficulty) {
          var pool = challengesForDifficulty(nextDifficulty);
          upd({ challengeDifficulty: nextDifficulty, challengePracticeMode: 'all',
            challengeId: pool[0].id, challengeAnswer: '', challengeFeedback: null });
          var label = CHALLENGE_DIFFICULTIES.filter(function(item) { return item.id === nextDifficulty; })[0];
          announce((label ? label.label : t('stem.timeschedule.all_levels', "All levels")) + t('stem.timeschedule.challenges_selected', " challenges selected."));
        }
        function beginRetry() {
          var ids = challengeMissedIds(d, challengeDifficulty);
          if (!ids.length) return;
          upd({ challengePracticeMode: 'retry', challengeId: ids[0],
            challengeAnswer: '', challengeFeedback: null });
          announce(t('stem.timeschedule.retrying', "Retrying ") + ids.length + (ids.length === 1 ? t('stem.timeschedule.missed_challenge', " missed challenge.") : t('stem.timeschedule.missed_challenges', " missed challenges.")));
        }
        function showAllChallenges() {
          var target = difficultyChallenges.some(function(item) { return item.id === challengeId; }) ?
            challengeId : difficultyChallenges[0].id;
          upd({ challengePracticeMode: 'all', challengeId: target,
            challengeAnswer: '', challengeFeedback: null });
          announce(t('stem.timeschedule.all_challenges_shown', "All challenges shown."));
        }
        var accuracy = score.total ? Math.round((score.correct || 0) / score.total * 100) : 0;
        var solvedChallengeCount = timeChallengeSolvedCount(d);
        var attemptCount = Number(safeAttempts[challengeId]) || 0;
        return h('section', { className: 'space-y-4',
          'aria-labelledby': 'ts-challenge-heading' },
          heading('ts-challenge-heading', t('stem.timeschedule.challenge_lab', "Challenge Lab"),
            t('stem.timeschedule.practice_with_support', "Choose a level, work at your own pace, and revisit problems you want to practice.")),
          h('div', { className: 'rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3 flex flex-col md:flex-row md:items-end gap-3' },
            h('label', { className: 'block text-xs font-black text-indigo-950 flex-1' },
              t('stem.timeschedule.difficulty', "Difficulty"),
              h('select', { value: challengeDifficulty, onChange: function(event) { chooseDifficulty(event.target.value); },
                className: 'mt-1 block w-full rounded-lg border border-indigo-500 bg-white px-3 py-2 text-sm font-bold' },
                CHALLENGE_DIFFICULTIES.map(function(item) {
                  return h('option', { key: item.id, value: item.id }, item.label);
                }))),
            h('div', { role: 'group', 'aria-label': t('stem.timeschedule.challenge_practice_mode', "Challenge practice mode"), className: 'flex flex-wrap gap-2' },
              h('button', { type: 'button', onClick: showAllChallenges,
                'aria-pressed': !retryMode,
                className: 'rounded-lg border border-indigo-300 px-3 py-2 text-xs font-black ' +
                  (!retryMode ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-800') },
                t('stem.timeschedule.all_challenges', "All challenges")),
              h('button', { type: 'button', onClick: beginRetry, disabled: !missedChallengeIds.length,
                'aria-pressed': retryMode,
                className: 'rounded-lg border border-rose-300 px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ' +
                  (retryMode ? 'bg-rose-700 text-white' : 'bg-white text-rose-800') },
                t('stem.timeschedule.retry_missed', "Retry missed (") + missedChallengeIds.length + ')'))),
          h('div', { className: 'flex flex-wrap gap-2 text-xs font-bold justify-end' },
            h('span', { className: 'rounded-lg bg-emerald-100 text-emerald-800 px-3 py-2' },
              '\u2713 ' + (score.correct || 0) + '/' + (score.total || 0)),
            h('span', { className: 'rounded-lg bg-orange-100 text-orange-800 px-3 py-2' },
              '\uD83D\uDD25 ' + (d.streak || 0)),
            h('span', { className: 'rounded-lg bg-sky-100 text-sky-800 px-3 py-2' }, accuracy + '%'),
            h('span', { className: 'rounded-lg bg-violet-100 text-violet-800 px-3 py-2' },
              t('stem.timeschedule.attempts_here', "Attempts here: ") + attemptCount)),
          h('div', { style: { height: '8px' }, className: 'rounded-full bg-slate-200 overflow-hidden', role: 'progressbar',
            'aria-label': t('stem.timeschedule.challenge_set_progress', "Challenge set progress"), 'aria-valuemin': 0,
            'aria-valuemax': CHALLENGES.length, 'aria-valuenow': solvedChallengeCount,
            'aria-valuetext': solvedChallengeCount + t('stem.timeschedule.of', " of ") + CHALLENGES.length + t('stem.timeschedule.solved_currently_viewing_challenge', " solved; currently viewing challenge ") +
              (challengePosition + 1) + t('stem.timeschedule.of', " of ") + challengeList.length + t('stem.timeschedule.in', " in ") + selectedDifficulty.label },
            h('div', { className: 'bg-gradient-to-r from-sky-500 to-indigo-600',
              style: { height: '8px', width: (solvedChallengeCount / CHALLENGES.length * 100) + '%' } })),
          h('div', { className: "grid grid-cols-1 lg:grid-cols-[.8fr_1.2fr] gap-4" },
            h('div', { className: 'rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-4 flex items-center justify-center min-h-[280px]' },
              challenge.clock != null ? analog(challenge.clock, 'ts-challenge-clock-' + challengeId, true, !locked) :
                h('div', { className: 'text-center max-w-xs w-full' },
                  h('svg', { viewBox: '0 0 220 140', className: 'w-full max-w-[220px] h-auto mx-auto', style: { display: 'block', background: svgCardBg, borderRadius: 12 }, 'aria-hidden': 'true' },
                    !isContrast && h('defs', null,
                      h('radialGradient', { id: 'ts-ch-well', cx: '50%', cy: '35%', r: '72%' },
                        h('stop', { offset: '0%', stopColor: svgFace0 }),
                        h('stop', { offset: '100%', stopColor: svgFace1 })
                      )
                    ),
                    h('rect', { x: 8, y: 8, width: 204, height: 124, rx: 12, fill: isContrast ? '#000000' : 'url(#ts-ch-well)', stroke: svgRing, strokeWidth: 2 }),
                    !isContrast && h('line', { x1: 20, y1: 10, x2: 200, y2: 10, stroke: '#ffffff', strokeOpacity: isDark ? 0.14 : 0.65, strokeWidth: 1.2 }),
                    challenge.kind === 'convert'
                      ? h('g', null,
                          h('rect', { x: 22, y: 42, width: 70, height: 48, rx: 9, fill: svgCardBg, stroke: svgAccent, strokeWidth: 2 }),
                          !isContrast && h('rect', { x: 26, y: 44, width: 62, height: 4, rx: 2, fill: svgAccent, opacity: 0.25 }),
                          h('text', { x: 57, y: 72, textAnchor: 'middle', fontSize: 15, fontWeight: 800, fill: svgInk }, '12 h'),
                          h('path', { d: 'M98 60 L122 60 M116 54 L122 60 L116 66 M122 72 L98 72 M104 66 L98 72 L104 78', fill: 'none', stroke: svgAccent, strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                          h('rect', { x: 128, y: 42, width: 70, height: 48, rx: 9, fill: svgCardBg, stroke: svgRing, strokeWidth: 2 }),
                          !isContrast && h('rect', { x: 132, y: 44, width: 62, height: 4, rx: 2, fill: svgRing, opacity: 0.25 }),
                          h('text', { x: 163, y: 72, textAnchor: 'middle', fontSize: 15, fontWeight: 800, fill: svgInk }, '24 h'))
                      : challenge.kind === 'overnight'
                      ? h('g', null,
                          h('line', { x1: 26, y1: 88, x2: 194, y2: 88, stroke: svgInk, strokeWidth: 3.2, strokeLinecap: 'round' }),
                          !isContrast && h('line', { x1: 110, y1: 32, x2: 110, y2: 102, stroke: svgAccent, strokeWidth: 6, strokeOpacity: 0.16 }),
                          h('line', { x1: 110, y1: 32, x2: 110, y2: 102, stroke: svgAccent, strokeWidth: 2, strokeDasharray: '4 4' }),
                          h('rect', { x: 54, y: 15, width: 112, height: 16, rx: 8, fill: svgCardBg, stroke: svgAccent, strokeWidth: 1.1 }),
                          h('text', { x: 110, y: 26.5, textAnchor: 'middle', fontSize: 10, fontWeight: 800, fill: svgAccent }, '00:00 MIDNIGHT'),
                          !isContrast && h('path', { d: 'M46 84 Q110 38 174 84', fill: 'none', stroke: svgRing, strokeWidth: 7, strokeOpacity: 0.18 }),
                          h('path', { d: 'M46 84 Q110 38 174 84', fill: 'none', stroke: svgRing, strokeWidth: 3, strokeLinecap: 'round' }),
                          h('circle', { cx: 46, cy: 88, r: 6.5, fill: '#f97316', stroke: svgInk, strokeWidth: 2 }),
                          h('circle', { cx: 174, cy: 88, r: 6.5, fill: '#10b981', stroke: svgInk, strokeWidth: 2 }),
                          h('text', { x: 46, y: 112, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: svgSub }, 'PM'),
                          h('text', { x: 174, y: 112, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: svgSub }, 'AM'))
                      : h('g', null,
                          h('line', { x1: 28, y1: 86, x2: 192, y2: 86, stroke: svgInk, strokeWidth: 3.2, strokeLinecap: 'round' }),
                          !isContrast && h('path', { d: 'M42 80 Q76 40 110 80', fill: 'none', stroke: svgAccent, strokeWidth: 7, strokeOpacity: 0.18 }),
                          h('path', { d: 'M42 80 Q76 40 110 80', fill: 'none', stroke: svgAccent, strokeWidth: 3, strokeLinecap: 'round' }),
                          !isContrast && h('path', { d: 'M110 80 Q144 40 178 80', fill: 'none', stroke: '#8b5cf6', strokeWidth: 7, strokeOpacity: 0.18 }),
                          h('path', { d: 'M110 80 Q144 40 178 80', fill: 'none', stroke: isContrast ? '#ffff00' : '#8b5cf6', strokeWidth: 3, strokeLinecap: 'round' }),
                          h('circle', { cx: 42, cy: 86, r: 6.5, fill: '#f97316', stroke: svgInk, strokeWidth: 2 }),
                          h('circle', { cx: 110, cy: 86, r: 5, fill: svgCardBg, stroke: svgInk, strokeWidth: 2 }),
                          h('circle', { cx: 178, cy: 86, r: 6.5, fill: '#10b981', stroke: svgInk, strokeWidth: 2 }),
                          h('text', { x: 110, y: 34, textAnchor: 'middle', fontSize: 11.5, fontWeight: 800, fill: svgInk }, challenge.type === 'time' ? 'START + JUMPS = ?' : 'HOW MANY MIN?'))
                  ),
                  h('p', { className: 'mt-4 text-xs font-black uppercase tracking-widest text-indigo-700' },
                    challenge.kind + t('stem.timeschedule.reasoning', " reasoning")),
                  h('p', { className: 'text-sm text-slate-600 mt-2' },
                    challenge.type === 'time' ? t('stem.timeschedule.find_an_exact_clock_time', "Find an exact clock time.") : t('stem.timeschedule.find_the_interval_length', "Find the interval length.")))),
            h('div', { className: 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm' },
              h('div', null,
                h('p', { className: 'text-[0.625rem] font-black uppercase tracking-[.18em] text-indigo-600' },
                  t('stem.timeschedule.challenge', "Challenge ") + (challengePosition + 1) + t('stem.timeschedule.of', " of ") + challengeList.length + ' \u00B7 ' +
                    selectedDifficulty.label + ' / ' + challenge.difficulty + ' \u00B7 ' + challenge.title),
                h('h4', { id: 'ts-challenge-prompt', className: 'text-xl sm:text-2xl font-black mt-2 leading-snug' }, challenge.prompt)),
              h('label', { htmlFor: 'ts-challenge-answer', className: 'block text-xs font-black text-slate-700' },
                challenge.type === 'time' ? (challenge.answerFormat === '24' ? t('stem.timeschedule.your_time_24_hour', "Your time (24-hour)") :
                  challenge.answerFormat === '12' ? t('stem.timeschedule.your_time_12_hour', "Your time (12-hour)") : t('stem.timeschedule.your_time', "Your time")) : t('stem.timeschedule.your_elapsed_time', "Your elapsed time"),
                h('input', { id: 'ts-challenge-answer', type: 'text', value: locked ?
                  (challenge.type === 'duration' ? durationText(challenge.answer) :
                    challenge.answerFormat === '24' ? time24(challenge.answer) : time12(challenge.answer)) :
                  challengeAnswer, disabled: !!locked,
                  onChange: function (event) { upd({ challengeId: challengeId,
                    challengeAnswer: event.target.value, challengeFeedback: null }); },
                  onKeyDown: function (event) { if (event.key === 'Enter') check(); },
                  'aria-invalid': !!(feedback && !feedback.ok),
                  'aria-describedby': 'ts-challenge-prompt' + (feedback ? ' ts-challenge-feedback' : ''),
                  placeholder: challenge.answerFormat === '24' ? t('stem.timeschedule.example_18_40', "Example: 18:40") :
                    challenge.answerFormat === '12' ? t('stem.timeschedule.example_9_07_pm', "Example: 9:07 PM") :
                    challenge.type === 'time' ? t('stem.timeschedule.example_2_15_pm_or_14_15', "Example: 2:15 PM or 14:15") :
                    t('stem.timeschedule.example_95_min_or_1_h_35_m', "Example: 95 min or 1 h 35 m"),
                  className: 'mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold disabled:bg-slate-100' })),
              h('p', { className: 'text-[0.6875rem] text-slate-500' },
                challenge.type === 'duration' ? t('stem.timeschedule.durations_may_be_entered_in_total_minu', "Durations may be entered in total minutes or hours and minutes.") :
                  challenge.answerFormat === '24' ? t('stem.timeschedule.use_two_digit_24_hour_form_hh_mm', "Use two-digit 24-hour form (HH:MM).") :
                  challenge.answerFormat === '12' ? t('stem.timeschedule.include_am_or_pm', "Include AM or PM.") :
                  t('stem.timeschedule.you_may_use_either_12_hour_or_24_hour_', "You may use either 12-hour or 24-hour time.")),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: function() { moveChallenge(-1); },
                  className: 'rounded-xl border border-indigo-300 bg-white px-4 py-3 text-sm font-black text-indigo-800' },
                  t('stem.timeschedule.previous', "Previous")),
                h('button', { type: 'button', disabled: !!locked, onClick: check,
                  className: 'flex-1 min-w-[140px] rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50' },
                  locked ? t('stem.timeschedule.correct_2', "Correct ✓") : t('stem.timeschedule.check_answer', "Check answer")),
                h('button', { type: 'button', onClick: function() { moveChallenge(1); },
                  className: 'rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-800' },
                  t('stem.timeschedule.next_challenge', "Next challenge"))),
              feedback && h('div', { id: 'ts-challenge-feedback', role: 'status', 'aria-live': 'polite',
                className: 'rounded-xl border p-4 text-sm ' +
                  (feedback.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-900' :
                    'border-rose-300 bg-rose-50 text-rose-900') },
                h('p', { className: 'font-black' }, feedback.ok ? t('stem.timeschedule.correct_3', "✓ Correct") : t('stem.timeschedule.keep_reasoning', "Keep reasoning")),
                h('p', { className: 'mt-1' }, feedback.message)),
              h('details', { className: 'rounded-xl border border-sky-200 bg-sky-50 p-3' },
                h('summary', { className: 'cursor-pointer text-xs font-black text-sky-900' },
                  t('stem.timeschedule.choose_a_strategy', "Choose a strategy")),
                h('ul', { className: 'list-disc pl-5 mt-2 space-y-1 text-xs text-sky-900' },
                  h('li', null, t('stem.timeschedule.draw_jumps_to_a_friendly_hour', "Draw jumps to a friendly hour.")),
                  h('li', null, t('stem.timeschedule.convert_each_time_to_minutes_after_mid', "Convert each time to minutes after midnight.")),
                  h('li', null, t('stem.timeschedule.for_a_missing_start_count_backward_fro', "For a missing start, count backward from the end.")),
                  h('li', null, t('stem.timeschedule.crossing_midnight_begins_a_new_24_hour', "Crossing midnight begins a new 24-hour cycle.")))))));
      }

      var view = tab === 'elapsed' ? elapsedView() :
        tab === 'schedule' ? scheduleView() :
        tab === 'challenge' ? challengeView() : clockView();
      return h('div', { className: 'time-schedule-lab max-w-6xl mx-auto space-y-4 pb-6 text-slate-900' + themeClass, 'data-theme': isContrast ? 'contrast' : (isDark ? 'dark' : 'light') },
        h('style', { key: 'theme' }, themeCss),
        h('header', {
          className: 'rounded-2xl overflow-hidden shadow-lg border border-sky-700/20 text-white',
          style: isContrast
            ? { backgroundColor: '#000000', border: '2px solid #ffff00' }
            : { backgroundColor: '#075985', background: 'linear-gradient(135deg, #075985 0%, #0e7490 52%, #312e81 100%)' }
        },
          h('div', { className: 'p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4' },
            h('div', { className: 'flex items-center gap-3 min-w-0 flex-1' },
              h('button', { type: 'button', 'aria-label': t('stem.timeschedule.back_to_stem_tools', "Back to STEM tools"),
                onClick: function () { if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null); },
                className: "shrink-0 rounded-xl border border-white/30 bg-white/10 p-2.5 hover:bg-white/20 focus:ring-2 focus:ring-white" },
                ArrowLeft ? h(ArrowLeft, { size: 19 }) : '←'),
              // Bespoke Horology Chronometer Emblem synced to live clock hands
              (function () {
                var emMin = (clock % 60) * 6 * Math.PI / 180;
                var emHr = ((Math.floor(clock / 60) % 12) + (clock % 60) / 60) * 30 * Math.PI / 180;
                return h('div', { 'aria-hidden': 'true', className: 'shrink-0 rounded-xl border border-white/25 bg-black/20 p-1.5 flex items-center justify-center' },
                  h('svg', { viewBox: '0 0 44 44', width: 38, height: 38, 'aria-hidden': 'true' },
                    !isContrast && h('defs', null,
                      h('radialGradient', { id: 'ts-em-dial', cx: '38%', cy: '32%', r: '68%' },
                        h('stop', { offset: '0%', stopColor: '#1e3a8a' }),
                        h('stop', { offset: '100%', stopColor: '#020617' })
                      ),
                      h('linearGradient', { id: 'ts-em-rim', x1: '0', y1: '0', x2: '1', y2: '1' },
                        h('stop', { offset: '0%', stopColor: '#e0f2fe' }),
                        h('stop', { offset: '55%', stopColor: '#38bdf8' }),
                        h('stop', { offset: '100%', stopColor: '#0284c7' })
                      )
                    ),
                    h('circle', { cx: 22, cy: 22, r: 19, fill: isContrast ? '#000000' : 'url(#ts-em-dial)', stroke: isContrast ? '#ffff00' : 'url(#ts-em-rim)', strokeWidth: 2.4 }),
                    h('circle', { cx: 22, cy: 22, r: 14.5, fill: 'none', stroke: isContrast ? '#00ff00' : '#bae6fd', strokeWidth: 0.9, strokeDasharray: '2 4', opacity: 0.7 }),
                    [0, 3, 6, 9].map(function(ci) {
                      var ca = ci * 30 * Math.PI / 180;
                      return h('line', { key: 'ct-' + ci, x1: (22 + 14.2 * Math.sin(ca)).toFixed(1), y1: (22 - 14.2 * Math.cos(ca)).toFixed(1), x2: (22 + 16.5 * Math.sin(ca)).toFixed(1), y2: (22 - 16.5 * Math.cos(ca)).toFixed(1), stroke: isContrast ? '#ffff00' : '#e0f2fe', strokeWidth: 1.5, strokeLinecap: 'round' });
                    }),
                    !isContrast && h('path', { d: 'M 7 18 A 16 16 0 0 1 34 11 Q 22 18 7 18 Z', fill: '#ffffff', opacity: 0.14 }),
                    h('line', { x1: 22, y1: 22, x2: 22 + 9 * Math.sin(emHr), y2: 22 - 9 * Math.cos(emHr), stroke: isContrast ? '#ffff00' : '#ffffff', strokeWidth: 2.8, strokeLinecap: 'round' }),
                    h('line', { x1: 22, y1: 22, x2: 22 + 13 * Math.sin(emMin), y2: 22 - 13 * Math.cos(emMin), stroke: isContrast ? '#00ff00' : '#38bdf8', strokeWidth: 2, strokeLinecap: 'round' }),
                    h('circle', { cx: 22, cy: 22, r: 2.8, fill: isContrast ? '#ffff00' : '#f97316', stroke: '#ffffff', strokeWidth: 0.8 })));
              })(),
              h('div', { className: 'min-w-0' },
                h('div', { className: 'text-[0.625rem] font-extrabold uppercase tracking-[0.12em] text-sky-200' },
                  t('stem.timeschedule.badge_subject', 'Math · Executive Function · Horology Studio')),
                h('h2', { className: 'text-xl sm:text-2xl font-black tracking-tight' },
                  t('stem.timeschedule.time_schedule_lab', "Time & Schedule Lab")),
                h('p', { className: 'text-xs sm:text-sm text-sky-100 mt-0.5' },
                  t('stem.timeschedule.see_time_count_time_plan_time_and_expl', "See time, count time, plan time, and explain your strategy.")))),
            h('div', { className: 'grid grid-cols-3 gap-2 text-center shrink-0' },
              [[(score.correct || 0) + '/' + CHALLENGES.length, t('stem.timeschedule.correct_4', "Correct")], [d.bestStreak || 0, t('stem.timeschedule.best_streak', "Best streak")],
                [Object.keys(safeModesUsed).length + '/4', t('stem.timeschedule.modes_tried', "Modes tried")]].map(function (x) {
                return h('div', { key: x[1],
                  className: 'rounded-xl bg-black/20 border border-white/25 px-3 py-2' },
                  h('div', { className: 'text-lg font-black' }, x[0]),
                  h('div', { className: 'text-[0.625rem] uppercase tracking-wide text-white font-semibold' }, x[1]));
              })))),
        h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-2',
          role: 'tablist', 'aria-label': t('stem.timeschedule.time_and_schedule_lab_sections', "Time and Schedule Lab sections") },
          TABS.map(function (item, index) {
            var selected = tab === item[0];
            return h('button', { style: { minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }, key: item[0], id: 'ts-tab-' + item[0], type: 'button', role: 'tab',
              'aria-selected': selected, 'aria-controls': 'ts-tab-panel', tabIndex: selected ? 0 : -1,
              onClick: function () { setTab(item[0]); },
              onKeyDown: function (event) { handleTabKeyDown(event, index); },
              className: 'rounded-xl border px-3 py-3 text-left transition focus:ring-2 focus:ring-sky-500 ' +
                (selected ? 'border-sky-700 bg-sky-700 text-white shadow-md' :
                  'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50') },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-xl', 'aria-hidden': 'true' }, item[2]),
                h('span', { style: { minWidth: 0 } }, h('span', { className: 'block text-sm font-black' }, item[1]),
                  h('span', { className: 'block text-[0.625rem] ' +
                    (selected ? 'text-white' : 'text-slate-700') }, item[3]))));
          })),
        h('div', { id: 'ts-tab-panel', role: 'tabpanel', 'aria-labelledby': 'ts-tab-' + tab,
          className: 'rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-5 shadow-sm' },
          view),
        h('footer', { className: 'rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900 flex flex-col sm:flex-row sm:justify-between gap-2' },
          h('span', null, h('strong', null, t('stem.timeschedule.time_tip', "Time tip: ")),
            t('stem.timeschedule.a_clock_time_and_an_amount_of_time_are', "A clock time and an amount of time are different quantities. Write units with durations.")),
          h('span', { className: 'font-bold' },
            t('stem.timeschedule.no_timer_pressure_keyboard_friendly_te', "No timer pressure · keyboard friendly · text alternatives included"))));
    }
  });
})();
