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
  function checkAnswer(value, type, answer, answerFormat) {
    var parsed = type === 'time' ? parseTime(value) : parseDuration(value);
    var formatOk = type !== 'time' || matchesTimeFormat(value, answerFormat);
    return { valid: parsed != null && formatOk, formatOk: formatOk, ok: parsed != null && formatOk &&
      (type === 'time' ? norm(parsed) === norm(answer) : parsed === answer) };
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
      var stableKey = SCHEDULE_QUESTION_IDS.indexOf(key) >= 0 ? key : LEGACY_SCHEDULE_QUESTION_KEYS[key];
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
    icon: '🕰️',
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
      var d = ((ctx.toolData || {})._timeSchedule) || {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var isContrast = !!ctx.isContrast;
      var isDark = !isContrast && !!ctx.isDark;
      var themeClass = isContrast ? ' time-schedule-lab--contrast' : (isDark ? ' time-schedule-lab--dark' : '');
      var themeCss = [
        '.time-schedule-lab--dark,.time-schedule-lab--contrast{padding:12px;border-radius:16px}',
        '.time-schedule-lab--dark{background:#020617;color:#f8fafc}',
        '.time-schedule-lab--dark [class*="bg-"]{background-color:#0f172a!important;background-image:none!important}',
        '.time-schedule-lab--dark *{color:#f8fafc!important;border-color:#64748b!important;background-color:#0f172a!important;background-image:none!important}',
        '.time-schedule-lab--dark input,.time-schedule-lab--dark select{background:#020617!important;color:#f8fafc!important}',
        '.time-schedule-lab--dark [aria-selected="true"],.time-schedule-lab--dark [aria-pressed="true"]{background:#1d4ed8!important;color:#fff!important;border-color:#93c5fd!important}',
        '.time-schedule-lab--dark svg{background:#fff;border-radius:12px}',
        '.time-schedule-lab--contrast{background:#000;color:#fff}',
        '.time-schedule-lab--contrast [class*="bg-"],.time-schedule-lab--contrast header,.time-schedule-lab--contrast main,.time-schedule-lab--contrast footer{background:#000!important;background-image:none!important}',
        '.time-schedule-lab--contrast *{color:#fff!important;border-color:#fff!important;background-color:#000!important;background-image:none!important;box-shadow:none!important}',
        '.time-schedule-lab--contrast input,.time-schedule-lab--contrast select{background:#000!important;color:#fff!important;border:2px solid #fff!important}',
        '.time-schedule-lab--contrast [aria-selected="true"],.time-schedule-lab--contrast [aria-pressed="true"]{background:#fff!important;color:#000!important;outline:3px solid #ff0!important}',
        '.time-schedule-lab--contrast :focus-visible{outline:3px solid #ff0!important;outline-offset:3px!important}',
        '.time-schedule-lab--contrast svg{background:#fff;border:2px solid #fff;border-radius:12px}'
      ].join('');
      var announce = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function () {};
      var award = typeof ctx.awardXP === 'function' ? ctx.awardXP : function () {};
      function upd(patch) {
        if (typeof ctx.setToolData !== 'function') return;
        ctx.setToolData(function (previous) {
          previous = previous || {};
          var current = previous._timeSchedule || {};
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
      var amount = clamp(d.elapsedDuration == null ? 95 : d.elapsedDuration, 0, 720);
      var direction = d.elapsedDirection === -1 ? -1 : 1;
      var rawEnd = start + direction * amount, end = norm(rawEnd);
      var jumps = makeJumps(start, amount, direction);
      var scheduleKey = SCHEDULES[d.scheduleKey] ? d.scheduleKey : 'school';
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
      var score = Object.assign({ correct: 0, total: 0 }, d.score || {}, { correct: timeChallengeSolvedCount(d) });

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
          var nextAmount = changes.elapsedDuration == null ? currentAmount : clamp(changes.elapsedDuration, 0, 720);
          var nextDirection = changes.elapsedDirection == null ? currentDirection : (changes.elapsedDirection === -1 ? -1 : 1);
          var changed = nextStart !== currentStart || nextAmount !== currentAmount || nextDirection !== currentDirection;
          var signatures = Object.assign({}, current.elapsedModelSignatures || {});
          if (changed) signatures[elapsedModelSignature(nextStart, nextAmount, nextDirection)] = true;
          return Object.assign({}, changes, {
            elapsedModelSignatures: signatures,
            elapsedModels: Object.keys(signatures).length
          });
        });
      }
      function formatToggle() {
        return h('div', { className: 'inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1',
          role: 'group', 'aria-label': t('stem.timeschedule.time_display_format', "Time display format") },
          h('button', { type: 'button', onClick: function () { upd({ use24: false }); },
            'aria-pressed': !use24, className: "px-3 py-1.5 rounded-md text-xs font-bold " +
              (!use24 ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600') }, '12-hour'),
          h('button', { type: 'button', onClick: function () { upd({ use24: true }); },
            'aria-pressed': use24, className: "px-3 py-1.5 rounded-md text-xs font-bold " +
              (use24 ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600') }, '24-hour')
        );
      }
      function analog(value, id, compact) {
        value = norm(value);
        var minute = value % 60, hour = Math.floor(value / 60) % 12;
        var ma = minute * 6 * Math.PI / 180;
        var ha = (hour + minute / 60) * 30 * Math.PI / 180;
        var ticks = [], labels = [], i, a;
        for (i = 0; i < 60; i += 1) {
          a = i * 6 * Math.PI / 180;
          ticks.push(h('line', { key: 't' + i,
            x1: 160 + (i % 5 ? 132 : 125) * Math.sin(a),
            y1: 160 - (i % 5 ? 132 : 125) * Math.cos(a),
            x2: 160 + 139 * Math.sin(a), y2: 160 - 139 * Math.cos(a),
            stroke: i % 5 ? '#94a3b8' : '#0f172a', strokeWidth: i % 5 ? 1.5 : 4,
            strokeLinecap: 'round' }));
        }
        for (i = 1; i <= 12; i += 1) {
          a = i * 30 * Math.PI / 180;
          labels.push(h('text', { key: 'n' + i, x: 160 + 111 * Math.sin(a),
            y: 166 - 111 * Math.cos(a), textAnchor: 'middle', fontSize: 17,
            fontWeight: '800', fill: '#0f172a' }, i));
        }
        var readable = t('stem.timeschedule.analog_clock_showing', "Analog clock showing ") + time12(value) +
          t('stem.timeschedule.minute_hand', ". Minute hand: ") + minute + t('stem.timeschedule.minutes_hour_hand', " minutes. Hour hand: ") +
          (minute ? t('stem.timeschedule.past', "past ") : t('stem.timeschedule.at', "at ")) + (hour || 12) + '.';
        return h('figure', { className: 'm-0 flex flex-col items-center' },
          h('svg', { viewBox: '0 0 320 320', role: 'img',
            'aria-labelledby': id + '-title ' + id + '-desc',
            className: compact ? 'w-full max-w-[230px] h-auto' : 'w-full max-w-[330px] h-auto' },
            h('title', { id: id + '-title' }, t('stem.timeschedule.analog_clock', "Analog clock: ") + time12(value)),
            h('desc', { id: id + '-desc' }, readable),
            h('defs', null,
              h('radialGradient', { id: id + '-face', cx: '42%', cy: '35%', r: '70%' },
                h('stop', { offset: '0%', stopColor: '#fff' }),
                h('stop', { offset: '100%', stopColor: '#e0f2fe' }))),
            h('circle', { cx: 160, cy: 160, r: 148, fill: 'url(#' + id + '-face)',
              stroke: '#0369a1', strokeWidth: 7 }),
            ticks, labels,
            h('line', { x1: 160, y1: 160, x2: 160 + 72 * Math.sin(ha),
              y2: 160 - 72 * Math.cos(ha), stroke: '#0f172a', strokeWidth: 10,
              strokeLinecap: 'round' }),
            h('line', { x1: 160, y1: 160, x2: 160 + 105 * Math.sin(ma),
              y2: 160 - 105 * Math.cos(ma), stroke: '#0284c7', strokeWidth: 6,
              strokeLinecap: 'round' }),
            h('circle', { cx: 160, cy: 160, r: 11, fill: '#f97316',
              stroke: '#fff', strokeWidth: 3 })),
          h('figcaption', { className: 'mt-1 text-center text-xs text-slate-600' }, readable)
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
          heading('ts-clock-heading', t('stem.timeschedule.clock_link', "Clock Link"),
            t('stem.timeschedule.move_one_representation_and_watch_anal', "Move one representation and watch analog, 12-hour, and 24-hour time stay linked.")),
          h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
            h('div', { className: 'rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-4 flex justify-center' },
              analog(clock, 'ts-main-clock', false)),
            h('div', { className: 'space-y-4' },
              h('div', { className: 'rounded-2xl bg-slate-950 text-cyan-300 border-4 border-slate-700 p-5 text-center shadow-inner' },
                h('p', { className: 'text-[11px] font-bold uppercase tracking-[.2em] text-slate-400' },
                  use24 ? '24-hour display' : '12-hour display'),
                h('p', { className: 'font-mono text-4xl sm:text-5xl font-black tracking-wider mt-2',
                  'aria-live': 'polite' }, showTime(clock, use24)),
                h('p', { className: 'text-xs text-slate-400 mt-2' }, time12(clock) + ' = ' + time24(clock))),
              h('div', { className: 'rounded-xl border border-slate-200 bg-white p-4 space-y-3' },
                h('label', { className: 'block text-xs font-black text-slate-700' }, t('stem.timeschedule.set_an_exact_time', "Set an exact time"),
                  h('input', { type: 'time', value: time24(clock),
                    onChange: function (e) { var v = parseInputTime(e.target.value); if (v != null) setClock(v); },
                    className: 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold focus:ring-2 focus:ring-sky-500',
                    'aria-label': t('stem.timeschedule.set_exact_clock_time', "Set exact clock time") })),
                h('div', { className: 'grid grid-cols-3 sm:grid-cols-6 gap-2',
                  role: 'group', 'aria-label': t('stem.timeschedule.adjust_the_clock', "Adjust the clock") },
                  [-60, -5, -1, 1, 5, 60].map(function (delta) {
                    return h('button', { key: delta, type: 'button',
                      onClick: function () { setClock(clock + delta); },
                      className: 'rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-xs font-black text-sky-800 hover:bg-sky-100 focus:ring-2 focus:ring-sky-500' },
                      (delta > 0 ? '+' : '−') + Math.abs(delta) +
                      (Math.abs(delta) === 60 ? t('stem.timeschedule.hr', " hr") : t('stem.timeschedule.min', " min")));
                  })),
                h('label', { className: 'block text-xs font-bold text-slate-600' },
                  t('stem.timeschedule.minute_hand_2', "Minute hand: ") + minute + t('stem.timeschedule.minutes', " minutes"),
                  h('input', { type: 'range', min: 0, max: 59, value: minute,
                    onChange: function (e) { setClock(Math.floor(clock / 60) * 60 + +e.target.value); },
                    className: 'w-full accent-sky-600', 'aria-label': t('stem.timeschedule.minute_hand_value', "Minute hand value"),
                    'aria-valuetext': minute + t('stem.timeschedule.minutes', " minutes") }))),
              h('aside', { className: 'rounded-xl border border-indigo-200 bg-indigo-50 p-4' },
                h('h4', { className: 'text-sm font-black text-indigo-900' }, t('stem.timeschedule.n_12_24_hour_bridge', "12 ↔ 24-hour bridge")),
                h('div', { className: 'grid grid-cols-2 gap-3 mt-2 text-center' },
                  h('div', { className: 'rounded-lg bg-white border border-indigo-100 p-3' },
                    h('div', { className: 'text-[10px] uppercase text-indigo-700 font-bold' }, t('stem.timeschedule.n_12_hour', "12-hour")),
                    h('div', { className: 'text-lg font-black text-indigo-950' }, time12(clock))),
                  h('div', { className: 'rounded-lg bg-white border border-indigo-100 p-3' },
                    h('div', { className: 'text-[10px] uppercase text-indigo-700 font-bold' }, t('stem.timeschedule.n_24_hour', "24-hour")),
                    h('div', { className: 'text-lg font-black text-indigo-950 font-mono' }, time24(clock)))),
                h('p', { className: 'text-xs text-indigo-800 mt-2' }, rule)))));
      }
      function elapsedView() {
        var points = [{ time: start, total: 0 }], total = 0;
        jumps.forEach(function (jump) {
          total += jump.amount;
          points.push({ time: jump.to, total: total, amount: jump.amount });
        });
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
              h('div', { className: 'rounded-xl bg-slate-950 text-white p-4 text-center' },
                h('p', { className: 'text-[10px] uppercase tracking-widest text-slate-400 font-bold' },
                  direction > 0 ? t('stem.timeschedule.ending_time', "Ending time") : t('stem.timeschedule.earlier_starting_time', "Earlier starting time")),
                h('p', { className: 'text-3xl font-black font-mono text-cyan-300 mt-1',
                  'aria-live': 'polite' }, showTime(end, use24)),
                h('p', { className: 'text-xs text-slate-400 mt-1' },
                  (rawEnd >= DAY ? t('stem.timeschedule.next_day', "next day") : rawEnd < 0 ? t('stem.timeschedule.previous_day', "previous day") : t('stem.timeschedule.same_day', "same day")) +
                  ' · ' + durationText(amount)))),
            h('div', { className: 'rounded-2xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white p-3 sm:p-5 overflow-hidden' },
              h('svg', { viewBox: '0 0 720 190', className: 'w-full h-auto min-h-[170px]',
                role: 'img', 'aria-labelledby': 'ts-jump-title ts-jump-desc' },
                h('title', { id: 'ts-jump-title' }, t('stem.timeschedule.elapsed_time_jump_timeline', "Elapsed-time jump timeline")),
                h('desc', { id: 'ts-jump-desc' }, t('stem.timeschedule.from', "From ") + time12(start) + t('stem.timeschedule.count', ", count ") +
                  (direction > 0 ? t('stem.timeschedule.forward', "forward ") : t('stem.timeschedule.backward', "backward ")) + durationText(amount) + t('stem.timeschedule.to', " to ") +
                  time12(end) + t('stem.timeschedule.jumps', ". Jumps: ") + jumps.map(function (j) { return j.amount + t('stem.timeschedule.minutes', " minutes"); }).join(', ') + '.'),
                h('line', { x1: 55, y1: 105, x2: 665, y2: 105,
                  stroke: '#0f172a', strokeWidth: 5, strokeLinecap: 'round' }),
                points.map(function (point, i) {
                  var progress = amount ? point.total / amount : 0;
                  var priorProgress = i && amount ? (point.total - point.amount) / amount : progress;
                  var x = direction > 0 ? 55 + progress * 610 : 665 - progress * 610;
                  var priorX = direction > 0 ? 55 + priorProgress * 610 : 665 - priorProgress * 610;
                  return h('g', { key: i },
                    i > 0 && h('path', { d: t('stem.timeschedule.m', "M ") + priorX + t('stem.timeschedule.n_91_q', " 91 Q ") +
                      ((priorX + x) / 2) + ' 35 ' + x + ' 91', fill: 'none',
                      stroke: i % 2 ? '#0284c7' : '#7c3aed', strokeWidth: 4 }),
                    i > 0 && h('text', { x: (priorX + x) / 2, y: 32,
                      textAnchor: 'middle', fill: '#0f172a', fontSize: 15,
                      fontWeight: '800' }, (direction > 0 ? '+' : '−') + point.amount + t('stem.timeschedule.min', " min")),
                    h('circle', { cx: x, cy: 105, r: i === 0 || i === points.length - 1 ? 10 : 7,
                      fill: i === 0 ? '#f97316' : i === points.length - 1 ? '#10b981' : '#fff',
                      stroke: '#0f172a', strokeWidth: 3 }),
                    h('text', { x: x, y: 138 + i % 2 * 22, textAnchor: 'middle',
                      fill: '#0f172a', fontSize: 14, fontWeight: '800' }, showTime(point.time, use24)));
                })),
              h('div', { className: 'rounded-xl border border-cyan-200 bg-white p-3' },
                h('h4', { className: 'text-xs font-black uppercase tracking-wide text-cyan-800' },
                  t('stem.timeschedule.text_alternative_jump_strategy', "Text alternative: jump strategy")),
                jumps.length ? h('ol', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2' },
                  jumps.map(function (jump, i) {
                    return h('li', { key: i, className: 'rounded-lg bg-cyan-50 px-3 py-2 text-xs text-slate-700' },
                      h('strong', { className: 'text-cyan-800' }, t('stem.timeschedule.jump', "Jump ") + (i + 1) + ': '),
                      showTime(jump.from, use24) + ' → ' + showTime(jump.to, use24) +
                      ' (' + jump.amount + t('stem.timeschedule.min_2', " min)"));
                  })) : h('p', { className: 'text-xs text-slate-600 mt-2' },
                    t('stem.timeschedule.the_interval_is_zero_so_start_and_end_', "The interval is zero, so start and end are the same.")),
                h('p', { className: 'text-sm font-black border-t border-cyan-100 mt-3 pt-3' },
                  jumps.map(function (j) { return j.amount; }).join(' + ') +
                  (jumps.length ? ' = ' : '') + amount + t('stem.timeschedule.minutes', " minutes"))))));
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
          h('div', { className: "grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4" },
            h('div', { className: 'rounded-2xl border border-violet-200 bg-white overflow-hidden' },
              h('div', { className: 'bg-violet-700 text-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3' },
                h('div', null, h('h4', { className: 'font-black' }, schedule.icon + ' ' + schedule.label),
                  h('p', { className: 'text-xs text-violet-100' },
                    scheduleTimeLabel(timeline[0].start, use24) + t('stem.timeschedule.to', " to ") +
                    scheduleTimeLabel(timeline[timeline.length - 1].end, use24) +
                    (timeline[timeline.length - 1].end >= DAY ? t('stem.timeschedule.crosses_midnight', " (crosses midnight)") : ''))),
                h('select', { value: scheduleKey, 'aria-label': t('stem.timeschedule.choose_a_schedule', "Choose a schedule"),
                  onChange: function (e) { upd({ scheduleKey: e.target.value,
                    scheduleQuestionIndex: 0, scheduleAnswer: '', scheduleFeedback: null }); },
                  className: 'rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-950' },
                  Object.keys(SCHEDULES).map(function (key) {
                    return h('option', { key: key, value: key }, SCHEDULES[key].label);
                  }))),
              h('div', {
                className: 'overflow-x-auto rounded-b-xl focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-inset',
                role: 'region', tabIndex: 0,
                'aria-label': schedule.label + t('stem.timeschedule.scrollable_event_schedule', " scrollable event schedule")
              },
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
                    return h('tr', { key: e[0], className: 'border-t border-violet-100' },
                      h('th', { scope: 'row', className: 'text-left px-3 py-3 font-bold whitespace-nowrap' },
                        h('span', { className: 'inline-block w-3 h-3 rounded-full mr-2',
                          style: { backgroundColor: e[3] }, 'aria-hidden': 'true' }), e[0]),
                      h('td', { className: 'px-3 py-3 font-mono whitespace-nowrap' }, scheduleTimeLabel(item.start, use24)),
                      h('td', { className: 'px-3 py-3 font-mono whitespace-nowrap' }, scheduleTimeLabel(item.end, use24)),
                      h('td', { className: 'px-3 py-3 whitespace-nowrap' }, durationText(item.duration)),
                      h('td', { className: 'px-3 py-3 whitespace-nowrap' }, gap == null ? '—' : durationText(gap)));
                  })))),
              h('div', { className: 'grid grid-cols-3 gap-2 bg-slate-50 border-t p-3 text-center' },
                [[span, t('stem.timeschedule.total_span', "Total span"), 'text-violet-700'], [busy, t('stem.timeschedule.scheduled', "Scheduled"), 'text-emerald-700'],
                  [span - busy, t('stem.timeschedule.free_time', "Free time"), 'text-amber-700']].map(function (x) {
                  return h('div', { key: x[1] },
                    h('p', { className: 'text-base font-black ' + x[2] }, durationText(x[0])),
                    h('p', { className: 'text-[10px] uppercase text-slate-500 font-bold' }, x[1]));
                }))),
            h('aside', { className: 'rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-4 space-y-4' },
              h('div', null,
                h('p', { className: 'text-[10px] uppercase tracking-widest font-black text-amber-700' },
                  t('stem.timeschedule.schedule_reasoning_2', "Schedule reasoning ") + (sqIndex + 1) + '/' + sqs.length),
                h('h4', { id: 'ts-schedule-prompt', className: 'text-base font-black text-slate-900 mt-1' }, sq.prompt)),
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
                    scheduleAnswer: '', scheduleFeedback: null });
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
          var result = checkAnswer(challengeAnswer, challenge.type, challenge.answer, challenge.answerFormat);
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
        var attemptCount = Number((d.challengeAttempts || {})[challengeId]) || 0;
        return h('section', { className: 'space-y-4',
          'aria-labelledby': 'ts-challenge-heading' },
          heading('ts-challenge-heading', t('stem.timeschedule.challenge_lab', "Challenge Lab"),
            t('stem.timeschedule.a_stable_deterministic_practice_set_wi', "A stable, deterministic practice set with difficulty bands and a focused retry-missed queue.")),
          h('div', { className: 'rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3 flex flex-col md:flex-row md:items-end gap-3' },
            h('label', { className: 'block text-xs font-black text-indigo-950 flex-1' },
              t('stem.timeschedule.difficulty', "Difficulty"),
              h('select', { value: challengeDifficulty, onChange: function(event) { chooseDifficulty(event.target.value); },
                className: 'mt-1 block w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold' },
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
          h('div', { className: 'h-2 rounded-full bg-slate-200 overflow-hidden', role: 'progressbar',
            'aria-label': t('stem.timeschedule.challenge_set_progress', "Challenge set progress"), 'aria-valuemin': 0,
            'aria-valuemax': CHALLENGES.length, 'aria-valuenow': solvedChallengeCount,
            'aria-valuetext': solvedChallengeCount + t('stem.timeschedule.of', " of ") + CHALLENGES.length + t('stem.timeschedule.solved_currently_viewing_challenge', " solved; currently viewing challenge ") +
              (challengePosition + 1) + t('stem.timeschedule.of', " of ") + challengeList.length + t('stem.timeschedule.in', " in ") + selectedDifficulty.label },
            h('div', { className: 'h-full bg-gradient-to-r from-sky-500 to-indigo-600',
              style: { width: (solvedChallengeCount / CHALLENGES.length * 100) + '%' } })),
          h('div', { className: "grid grid-cols-1 lg:grid-cols-[.8fr_1.2fr] gap-4" },
            h('div', { className: 'rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-4 flex items-center justify-center min-h-[280px]' },
              challenge.clock != null ? analog(challenge.clock, 'ts-challenge-clock-' + challengeId, true) :
                h('div', { className: 'text-center max-w-xs' },
                  h('div', { className: 'text-7xl', 'aria-hidden': 'true' },
                    challenge.kind === 'convert' ? '\uD83D\uDD04' : challenge.kind === 'schedule' ? '\uD83D\uDE8C' :
                    challenge.kind === 'overnight' ? '\uD83C\uDF19' : challenge.kind === 'interval' ? '\u2194\uFE0F' : '\u23F1\uFE0F'),
                  h('p', { className: 'mt-4 text-xs font-black uppercase tracking-widest text-indigo-700' },
                    challenge.kind + t('stem.timeschedule.reasoning', " reasoning")),
                  h('p', { className: 'text-sm text-slate-600 mt-2' },
                    challenge.type === 'time' ? t('stem.timeschedule.find_an_exact_clock_time', "Find an exact clock time.") : t('stem.timeschedule.find_the_interval_length', "Find the interval length.")))),
            h('div', { className: 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm' },
              h('div', null,
                h('p', { className: 'text-[10px] font-black uppercase tracking-[.18em] text-indigo-600' },
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
              h('p', { className: 'text-[11px] text-slate-500' },
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
        h('header', { className: 'rounded-2xl overflow-hidden shadow-lg border border-sky-700/20 bg-gradient-to-br from-sky-700 via-cyan-700 to-indigo-800 text-white' },
          h('div', { className: 'p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4' },
            h('div', { className: 'flex items-center gap-3 min-w-0 flex-1' },
              h('button', { type: 'button', 'aria-label': t('stem.timeschedule.back_to_stem_tools', "Back to STEM tools"),
                onClick: function () { if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null); },
                className: "shrink-0 rounded-xl border border-white/30 bg-white/10 p-2.5 hover:bg-white/20 focus:ring-2 focus:ring-white" },
                ArrowLeft ? h(ArrowLeft, { size: 19 }) : '←'),
              h('div', { className: 'text-4xl shrink-0', 'aria-hidden': 'true' }, '🕰️'),
              h('div', { className: 'min-w-0' },
                h('h2', { className: 'text-xl sm:text-2xl font-black tracking-tight' },
                  t('stem.timeschedule.time_schedule_lab', "Time & Schedule Lab")),
                h('p', { className: 'text-xs sm:text-sm text-sky-100 mt-1' },
                  t('stem.timeschedule.see_time_count_time_plan_time_and_expl', "See time, count time, plan time, and explain your strategy.")))),
            h('div', { className: 'grid grid-cols-3 gap-2 text-center shrink-0' },
              [[score.correct || 0, t('stem.timeschedule.correct_4', "Correct")], [d.bestStreak || 0, t('stem.timeschedule.best_streak', "Best streak")],
                [Object.keys(d.modesUsed || {}).length, t('stem.timeschedule.modes_tried', "Modes tried")]].map(function (x) {
                return h('div', { key: x[1],
                  className: 'rounded-xl bg-white/10 border border-white/20 px-3 py-2' },
                  h('div', { className: 'text-lg font-black' }, x[0]),
                  h('div', { className: 'text-[10px] uppercase tracking-wide text-white font-semibold' }, x[1]));
              })))),
        h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-2',
          role: 'tablist', 'aria-label': t('stem.timeschedule.time_and_schedule_lab_sections', "Time and Schedule Lab sections") },
          TABS.map(function (item, index) {
            var selected = tab === item[0];
            return h('button', { key: item[0], id: 'ts-tab-' + item[0], type: 'button', role: 'tab',
              'aria-selected': selected, 'aria-controls': 'ts-tab-panel', tabIndex: selected ? 0 : -1,
              onClick: function () { setTab(item[0]); },
              onKeyDown: function (event) { handleTabKeyDown(event, index); },
              className: 'rounded-xl border px-3 py-3 text-left transition focus:ring-2 focus:ring-sky-500 ' +
                (selected ? 'border-sky-700 bg-sky-700 text-white shadow-md' :
                  'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50') },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-xl', 'aria-hidden': 'true' }, item[2]),
                h('span', null, h('span', { className: 'block text-sm font-black' }, item[1]),
                  h('span', { className: 'block text-[10px] ' +
                    (selected ? 'text-white' : 'text-slate-700') }, item[3]))));
          })),
        h('main', { id: 'ts-tab-panel', role: 'tabpanel', 'aria-labelledby': 'ts-tab-' + tab,
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
