// view_submission_inbox_source.jsx — teacher batch upload + decrypt for offline HTML submissions.
// Phase 2 of the offline-HTML worksheet submission system (May 11 2026).
//
// Workflow:
//   1. Teacher opens this modal from the Roster panel.
//   2. Loads class-key.alloflow (the file downloaded at class setup).
//   3. Selects one or more <nickname>-<doc>-<date>.alloflow.html files
//      students submitted (typically pulled from their class Drive folder).
//   4. Clicks "Decrypt all" — each row's encrypted blob is unwrapped with
//      the loaded private key and the payload appears in the queue.
//   5. Roster cross-check badges known nicknames green, unknown yellow.
//   6. "Send to gradebook" is a placeholder — Phase 3 will wire it to AI
//      rubric grading + studentResponses IndexedDB writes.
//
// Dependencies: window.AlloModules.SubmissionCrypto.decryptSubmission
// (registered by submission_crypto_module.js).

// ── UI localization (runtime-AI, self-contained; NEVER touches lang/*.js) ──
// English text IS the key; tr() collects display strings and a per-render effect
// batch-translates the missing ones into the teacher's interface language via
// the app global window.callGemini, keyed by currentUiLanguage, cached
// per-device. Student nicknames, document titles, decrypted response text, and
// teacher-authored rubric/anchor text are DATA and are never sent. English
// fallback. (This module is build-generated — edit THIS .jsx, then run
// node _build_view_submission_inbox_module.js.)
var SI_I18N_KEY = 'allo_submissioninbox_ui_i18n_v1';
var LANG_CTX = (typeof window !== 'undefined' && window.AlloLanguageContext) || (typeof window !== 'undefined' && window.React ? window.React.createContext(null) : null);
var STR_REG = {};
var LL_CUR = { lang: 'English', cache: {} };
function llLoad() { try { return JSON.parse(localStorage.getItem(SI_I18N_KEY)) || {}; } catch (e) { return {}; } }
function llStore(v) { try { localStorage.setItem(SI_I18N_KEY, JSON.stringify(v)); } catch (e) {} }
function llInterp(s, params) { if (s == null || !params) return s; Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); }); return s; }
function tr(en, params) { if (en && typeof en === 'string') STR_REG[en] = true; var p = LL_CUR.cache[LL_CUR.lang]; return llInterp((p && p[en] != null) ? p[en] : en, params); }
function llCleanJson(raw) { var s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, ''); var f = s.indexOf('{'), l = s.lastIndexOf('}'); return f >= 0 && l > f ? s.slice(f, l + 1) : s; }
function llSanitize(obj, wanted) { if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null; var out = {}, n = 0; wanted.forEach(function (k) { var v = obj[k]; if (typeof v === 'string') { v = v.slice(0, 400); if (v) { out[k] = v; n++; } } }); return n ? out : null; }
function llPrompt(langName, list) { return ['Translate these user-interface labels for a teacher tool that imports and grades student worksheet submissions into natural, concise ' + langName + ' (buttons, headings, toasts — keep them short and professional).', 'Keep any {tokens}, numbers, and any emoji EXACTLY as written. Do NOT translate the acronyms AI, JSON, or the file extension .alloflow. No commentary.', 'Return ONLY a JSON object mapping each ENGLISH string (used verbatim as the key) to its ' + langName + ' translation.', JSON.stringify(list)].join(String.fromCharCode(10)); }

// ── Work evidence (2026-07-27) ───────────────────────────────────────────────
// A submission has always carried far more than its free-text responses:
// `content` is the sanitized set of resources the student actually engaged with,
// `gameCompletions` records finished practice games, and `stats` rolls up XP,
// quizzes and notebook use. All three have ridden in the file since schema v1
// and none of them were ever rendered, so a teacher reviewing mailbox homework
// saw only the typed answers and had no way to tell "did nothing" apart from
// "did the concept sort, the timeline and two games, and typed little".
//
// Everything here is defensive: the payload is a JSON file that arrived from a
// student device, so no shape is assumed and every string is bounded.
// NOTE: `stats.summary` is deliberately NOT rendered. It is an OBJECT of counts
// ({quizzes, adventures, readings, scaffolds}) built by the student Submit
// modal, and it is a strictly poorer version of `content`, which lists the
// actual titles. Stringifying it is how you ship "[object Object]".
function siWorkEvidence(payload) {
  var p = (payload && typeof payload === 'object') ? payload : {};
  var num = function (v) { return (typeof v === 'number' && isFinite(v) && v >= 0) ? Math.floor(v) : null; };

  var activities = (Array.isArray(p.content) ? p.content : [])
    .filter(function (item) { return item && typeof item === 'object' && typeof item.type === 'string' && item.type; })
    .map(function (item) {
      return {
        type: String(item.type).slice(0, 40),
        title: String(item.title || item.type || 'Untitled').slice(0, 80),
      };
    });

  var rawGames = (p.gameCompletions && typeof p.gameCompletions === 'object' && !Array.isArray(p.gameCompletions))
    ? p.gameCompletions : {};
  var games = Object.keys(rawGames)
    .map(function (gameType) {
      return {
        gameType: String(gameType).slice(0, 40),
        plays: Array.isArray(rawGames[gameType]) ? rawGames[gameType].length : 0,
      };
    })
    .filter(function (entry) { return entry.plays > 0; })
    .sort(function (a, b) { return (b.plays - a.plays) || a.gameType.localeCompare(b.gameType); });

  var stats = (p.stats && typeof p.stats === 'object' && !Array.isArray(p.stats)) ? p.stats : {};
  var notebook = (stats.notebook && typeof stats.notebook === 'object' && !Array.isArray(stats.notebook))
    ? stats.notebook : {};

  var evidence = {
    activities: activities,
    games: games,
    totalXP: num(stats.totalXP),
    quizzesTaken: num(stats.quizzesTaken),
    notebookEntries: num(notebook.total),
    // Not a verdict, and labelled as such in the UI. The student device counts
    // pastes that landed in a writable answer field; a pasted research citation
    // and a pasted answer are indistinguishable here.
    pastesIntoAnswers: num(stats.pasteEventResponseCount),
  };
  evidence.isEmpty = activities.length === 0 && games.length === 0
    && evidence.totalXP === null && evidence.quizzesTaken === null
    && evidence.notebookEntries === null;
  return evidence;
}


// ── Submission Inbox -> AlloSheet aggregate privacy boundary ──────────────
// The saved gradebook contains raw student responses, feedback, rubric prose,
// names, document titles, and storage keys. This boundary copies none of those
// fields. It works only from entries the educator explicitly saved to the
// local gradebook and emits assignment-level aggregates under transfer-local
// order codes. "Saved" is not represented as "human verified": current
// persistence has no per-score review attestation, due date, late flag, or
// structured rubric criterion.
var SI_ALLOSHEET_MIN_SCORE_GROUP = 5;
var SI_ALLOSHEET_MAX_ASSIGNMENTS = 50;
var SI_ALLOSHEET_MAX_SOURCE_ENTRIES = 2000;
var SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY = 200;

function siAlloSheetPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function siAlloSheetAdapter() {
  var adapter = window.AlloSheetTransferAdapter
    || (window.AlloModules && window.AlloModules.AlloSheetTransferAdapter);
  if (!adapter
    || typeof adapter.column !== 'function'
    || typeof adapter.table !== 'function'
    || typeof adapter.envelope !== 'function'
    || typeof adapter.withinDateRange !== 'function') {
    throw new Error('The secure AlloSheet transfer adapter is still loading. Try again in a moment.');
  }
  return adapter;
}

function siAlloSheetTitle(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function siAlloSheetTime(value) {
  if (value instanceof Date) {
    var dateTime = value.getTime();
    return Number.isFinite(dateTime) ? dateTime : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  var text = String(value == null ? '' : value).trim();
  var match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(text);
  if (!match) return null;
  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  var calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day) return null;
  var parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function siAlloSheetScore(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= 0 && value <= 100 ? value : null;
}

function siAlloSheetStatus(value) {
  var status = String(value == null ? '' : value).trim().toLowerCase();
  if (status === 'partially-correct' || status === 'partial') return 'partial';
  if (status === 'correct' || status === 'incorrect' || status === 'unclear' || status === 'error') {
    return status;
  }
  return 'other';
}

function siPrepareAlloSheetSavedSource(input) {
  if (input && input.kind === 'submission-inbox-allosheet-source-v1' && Array.isArray(input.entries)) {
    var preparedInvalid = 0;
    var preparedTruncated = Math.max(
      Math.max(0, input.entries.length - SI_ALLOSHEET_MAX_SOURCE_ENTRIES),
      Math.max(0, Number(input.truncatedEntryCount) || 0)
    );
    var preparedTruncatedResults = Math.max(0, Number(input.truncatedGradeResultCount) || 0);
    var copiedEntries = input.entries.slice(0, SI_ALLOSHEET_MAX_SOURCE_ENTRIES).map(function(entry, index) {
      if (!siAlloSheetPlainObject(entry)) {
        preparedInvalid += 1;
        return null;
      }
      var assignmentKey = String(entry.assignmentKey || '');
      var assignmentLabel = siAlloSheetTitle(entry.assignmentLabel);
      var learnerToken = String(entry.learnerToken || '');
      if (!/^S\d{1,6}$/.test(assignmentKey)
        || !assignmentLabel
        || !/^L\d{1,6}$/.test(learnerToken)) {
        preparedInvalid += 1;
        return null;
      }
      var sourceResults = Array.isArray(entry.gradeResults) ? entry.gradeResults : [];
      preparedTruncatedResults += Math.max(0, sourceResults.length - SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY);
      var results = sourceResults.slice(0, SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY).map(function(result) {
        if (!siAlloSheetPlainObject(result)) return null;
        return {
          score: siAlloSheetScore(result.score),
          status: siAlloSheetStatus(result.status)
        };
      }).filter(Boolean);
      return {
        index: index,
        assignmentKey: assignmentKey,
        assignmentLabel: assignmentLabel,
        learnerToken: learnerToken,
        submittedTime: typeof entry.submittedTime === 'number' && Number.isFinite(entry.submittedTime)
          ? entry.submittedTime : null,
        gradedTime: typeof entry.gradedTime === 'number' && Number.isFinite(entry.gradedTime)
          ? entry.gradedTime : null,
        hasSavedRubric: entry.hasSavedRubric === true,
        gradeResults: results
      };
    }).filter(Boolean);
    return {
      kind: 'submission-inbox-allosheet-source-v1',
      sourceEntryCount: Math.max(copiedEntries.length, Number(input.sourceEntryCount) || 0),
      excludedEntryCount: Math.max(0, Number(input.excludedEntryCount) || 0) + preparedInvalid,
      truncatedEntryCount: preparedTruncated,
      truncatedGradeResultCount: preparedTruncatedResults,
      entries: copiedEntries
    };
  }

  var rawEntries = input && Array.isArray(input.gradebookEntries)
    ? input.gradebookEntries : Array.isArray(input) ? input : [];
  var assignmentTokens = new Map();
  var nextAssignment = 1;
  var learnerTokens = new Map();
  var nextLearner = 1;
  var excluded = 0;
  var truncated = Math.max(0, rawEntries.length - SI_ALLOSHEET_MAX_SOURCE_ENTRIES);
  var truncatedResults = 0;
  var entries = rawEntries.slice(0, SI_ALLOSHEET_MAX_SOURCE_ENTRIES).map(function(entry, index) {
    if (!siAlloSheetPlainObject(entry) || String(entry.source || '') !== 'offline-html') {
      excluded += 1;
      return null;
    }
    var documentTitle = siAlloSheetTitle(entry.docTitle);
    var classTitle = siAlloSheetTitle(entry.className);
    var assignmentLabel = siAlloSheetTitle(classTitle
      ? documentTitle + ' - ' + classTitle : documentTitle);
    var privateAssignmentKey = classTitle.toLocaleLowerCase()
      + '\u0000' + documentTitle.toLocaleLowerCase();
    var nickname = String(entry.nickname == null ? '' : entry.nickname).trim().toLocaleLowerCase();
    var nicknameKey = classTitle.toLocaleLowerCase() + '\u0000' + nickname;
    if (!assignmentLabel || !nickname) {
      excluded += 1;
      return null;
    }
    if (!assignmentTokens.has(privateAssignmentKey)) {
      assignmentTokens.set(privateAssignmentKey, 'S' + String(nextAssignment++));
    }
    if (!learnerTokens.has(nicknameKey)) {
      learnerTokens.set(nicknameKey, 'L' + String(nextLearner++));
    }
    var gradeResults = [];
    if (siAlloSheetPlainObject(entry.grades)) {
      var gradeKeys = Object.keys(entry.grades);
      truncatedResults += Math.max(0, gradeKeys.length - SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY);
      gradeKeys.slice(0, SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY).forEach(function(key) {
        var result = entry.grades[key];
        if (!siAlloSheetPlainObject(result)) return;
        gradeResults.push({
          score: siAlloSheetScore(result.score),
          status: siAlloSheetStatus(result.status)
        });
      });
    }
    return {
      index: index,
      assignmentKey: assignmentTokens.get(privateAssignmentKey),
      assignmentLabel: assignmentLabel,
      learnerToken: learnerTokens.get(nicknameKey),
      submittedTime: siAlloSheetTime(entry.submittedAt),
      gradedTime: siAlloSheetTime(entry.gradedAt),
      hasSavedRubric: typeof entry.rubric === 'string' && entry.rubric.trim() !== '',
      gradeResults: gradeResults
    };
  }).filter(Boolean);

  return {
    kind: 'submission-inbox-allosheet-source-v1',
    sourceEntryCount: rawEntries.length,
    excludedEntryCount: excluded,
    truncatedEntryCount: truncated,
    truncatedGradeResultCount: truncatedResults,
    entries: entries
  };
}

function siAlloSheetWindow(range) {
  return range === '30d' || range === 'all' ? range : '90d';
}

function siAlloSheetAttemptPolicy(value) {
  return value === 'all-saved' ? 'all-saved' : 'latest-per-class-nickname';
}

function siAlloSheetDatedEntries(source, options, adapter, createdTime) {
  var range = siAlloSheetWindow(options.dateRange);
  var eligible = source.entries.filter(function(entry) {
    return Number.isFinite(entry.gradedTime)
      && adapter.withinDateRange(entry.gradedTime, range, createdTime);
  });
  if (siAlloSheetAttemptPolicy(options.attemptPolicy) === 'all-saved') {
    return eligible.slice().sort(function(a, b) {
      return a.assignmentLabel.localeCompare(b.assignmentLabel, undefined, { numeric: true, sensitivity: 'base' })
        || a.assignmentKey.localeCompare(b.assignmentKey)
        || a.gradedTime - b.gradedTime
        || a.index - b.index;
    });
  }
  var latest = new Map();
  eligible.forEach(function(entry) {
    var key = entry.assignmentKey + '\u0000' + entry.learnerToken;
    var current = latest.get(key);
    if (!current
      || entry.gradedTime > current.gradedTime
      || (entry.gradedTime === current.gradedTime && entry.index > current.index)) {
      latest.set(key, entry);
    }
  });
  return Array.from(latest.values()).sort(function(a, b) {
    return a.assignmentLabel.localeCompare(b.assignmentLabel, undefined, { numeric: true, sensitivity: 'base' })
      || a.assignmentKey.localeCompare(b.assignmentKey)
      || a.gradedTime - b.gradedTime
      || a.index - b.index;
  });
}

function siSubmissionInboxAlloSheetOptions(input, options) {
  var adapter = siAlloSheetAdapter();
  var source = siPrepareAlloSheetSavedSource(input);
  var opts = siAlloSheetPlainObject(options) ? options : {};
  var createdTime = siAlloSheetTime(opts.createdAt);
  if (createdTime === null) createdTime = Date.now();
  var entries = siAlloSheetDatedEntries(source, opts, adapter, createdTime);
  var assignmentMap = new Map();
  entries.forEach(function(entry) {
    if (!assignmentMap.has(entry.assignmentKey)) {
      assignmentMap.set(entry.assignmentKey, {
        key: entry.assignmentKey,
        label: entry.assignmentLabel,
        savedEntryCount: 0
      });
    }
    assignmentMap.get(entry.assignmentKey).savedEntryCount += 1;
  });
  var assignments = Array.from(assignmentMap.values()).sort(function(a, b) {
    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
      || a.key.localeCompare(b.key);
  });
  var visible = assignments.slice(0, SI_ALLOSHEET_MAX_ASSIGNMENTS);
  return {
    source: source,
    createdAt: new Date(createdTime).toISOString(),
    dateRange: siAlloSheetWindow(opts.dateRange),
    attemptPolicy: siAlloSheetAttemptPolicy(opts.attemptPolicy),
    eligibleEntryCount: entries.length,
    assignmentCount: assignments.length,
    omittedAssignmentCount: Math.max(0, assignments.length - visible.length),
    assignments: visible.map(function(item) {
      return {
        key: item.key,
        label: item.label,
        savedEntryCount: item.savedEntryCount
      };
    })
  };
}

function siAlloSheetColumn(adapter, key, label, type) {
  return adapter.column(key, label, type);
}

function siRoundScore(value) {
  return Math.round(value * 100) / 100;
}

function siBuildSubmissionInboxAlloSheetEnvelope(input, options) {
  var adapter = siAlloSheetAdapter();
  var opts = siAlloSheetPlainObject(options) ? options : {};
  var review = siSubmissionInboxAlloSheetOptions(input, opts);
  var selectedKeys = Array.isArray(opts.assignmentKeys)
    ? opts.assignmentKeys.map(function(key) { return String(key || ''); })
        .filter(function(key) { return /^S\d{1,6}$/.test(key); })
    : review.assignments.map(function(item) { return item.key; });
  var available = new Set(review.assignments.map(function(item) { return item.key; }));
  var selected = new Set(selectedKeys.filter(function(key) { return available.has(key); }));
  if (selected.size === 0) throw new Error('Choose at least one saved assignment summary.');
  var datasets = siAlloSheetPlainObject(opts.datasets) ? opts.datasets : {};
  if (datasets.submissionSummary === false && datasets.scoreSummary === false) {
    throw new Error('Choose at least one summary table.');
  }

  var createdTime = Date.parse(review.createdAt);
  var datedEntries = siAlloSheetDatedEntries(review.source, {
    dateRange: review.dateRange,
    attemptPolicy: review.attemptPolicy
  }, adapter, createdTime).filter(function(entry) {
    return selected.has(entry.assignmentKey);
  });
  var selectedSorted = review.assignments.filter(function(item) {
    return selected.has(item.key);
  });
  var assignmentCodes = new Map();
  selectedSorted.forEach(function(item, index) {
    assignmentCodes.set(item.key, 'A' + String(index + 1).padStart(3, '0'));
  });
  var grouped = new Map();
  selectedSorted.forEach(function(item) { grouped.set(item.key, []); });
  datedEntries.forEach(function(entry) {
    if (grouped.has(entry.assignmentKey)) grouped.get(entry.assignmentKey).push(entry);
  });

  var tables = [];
  var suppressedScoreSummaries = 0;
  if (datasets.submissionSummary !== false) {
    var submissionRows = selectedSorted.map(function(item, index) {
      var entries = grouped.get(item.key) || [];
      var learners = new Set(entries.map(function(entry) { return entry.learnerToken; }));
      var submittedTimes = entries.map(function(entry) { return entry.submittedTime; })
        .filter(function(time) {
          return Number.isFinite(time) && adapter.withinDateRange(time, 'all', createdTime);
        }).sort(function(a, b) { return a - b; });
      var gradedTimes = entries.map(function(entry) { return entry.gradedTime; })
        .filter(Number.isFinite).sort(function(a, b) { return a - b; });
      var withRubric = entries.filter(function(entry) { return entry.hasSavedRubric; }).length;
      return {
        id: 'saved-assignment-' + String(index + 1),
        values: {
          assignment_code: assignmentCodes.get(item.key),
          teacher_saved_submission_count: entries.length,
          unique_class_nickname_count: learners.size,
          submissions_with_saved_rubric: withRubric,
          submissions_without_saved_rubric: Math.max(0, entries.length - withRubric),
          first_submitted_date: submittedTimes.length ? adapter.toIsoDate(submittedTimes[0]) : '',
          last_submitted_date: submittedTimes.length ? adapter.toIsoDate(submittedTimes[submittedTimes.length - 1]) : '',
          last_saved_date: gradedTimes.length ? adapter.toIsoDate(gradedTimes[gradedTimes.length - 1]) : '',
          saved_record_status: 'teacher_saved_not_review_attested'
        }
      };
    });
    tables.push(adapter.table({
      id: 'saved_submission_summary',
      title: 'Saved submission summary',
      columns: [
        siAlloSheetColumn(adapter, 'assignment_code', 'Assignment code', 'category'),
        siAlloSheetColumn(adapter, 'teacher_saved_submission_count', 'Teacher-saved submissions', 'number'),
        siAlloSheetColumn(adapter, 'unique_class_nickname_count', 'Unique saved class nicknames', 'number'),
        siAlloSheetColumn(adapter, 'submissions_with_saved_rubric', 'Submissions with a saved rubric', 'number'),
        siAlloSheetColumn(adapter, 'submissions_without_saved_rubric', 'Submissions without a saved rubric', 'number'),
        siAlloSheetColumn(adapter, 'first_submitted_date', 'First submitted date', 'date'),
        siAlloSheetColumn(adapter, 'last_submitted_date', 'Last submitted date', 'date'),
        siAlloSheetColumn(adapter, 'last_saved_date', 'Last saved date', 'date'),
        siAlloSheetColumn(adapter, 'saved_record_status', 'Saved record status', 'category')
      ],
      rows: submissionRows,
      sourceRowCount: submissionRows.length
    }));
  }

  if (datasets.scoreSummary !== false) {
    var scoreRows = selectedSorted.map(function(item, index) {
      var entries = grouped.get(item.key) || [];
      var scores = [];
      var errorCount = 0;
      var invalidCount = 0;
      var statuses = { correct: 0, partial: 0, incorrect: 0, unclear: 0, other: 0 };
      entries.forEach(function(entry) {
        entry.gradeResults.forEach(function(result) {
          if (result.status === 'error') {
            errorCount += 1;
            return;
          }
          if (result.score === null) {
            invalidCount += 1;
            return;
          }
          scores.push(result.score);
          statuses[result.status] = (statuses[result.status] || 0) + 1;
        });
      });
      var bands = [
        scores.filter(function(score) { return score < 40; }).length,
        scores.filter(function(score) { return score >= 40 && score < 65; }).length,
        scores.filter(function(score) { return score >= 65 && score < 85; }).length,
        scores.filter(function(score) { return score >= 85; }).length
      ];
      var distributionCounts = bands.concat(Object.keys(statuses).map(function(key) { return statuses[key]; }));
      var reportable = scores.length >= SI_ALLOSHEET_MIN_SCORE_GROUP
        && !distributionCounts.some(function(count) {
          return count > 0 && count < SI_ALLOSHEET_MIN_SCORE_GROUP;
        });
      if (scores.length > 0 && !reportable) suppressedScoreSummaries += 1;
      var average = reportable
        ? siRoundScore(scores.reduce(function(sum, score) { return sum + score; }, 0) / scores.length)
        : null;
      return {
        id: 'saved-score-' + String(index + 1),
        values: {
          assignment_code: assignmentCodes.get(item.key),
          teacher_saved_submission_count: entries.length,
          scored_response_count: scores.length,
          grading_error_count: errorCount,
          invalid_score_result_count: invalidCount,
          average_score_percent: average,
          minimum_score_percent: reportable
            ? scores.reduce(function(minimum, score) { return score < minimum ? score : minimum; }, scores[0])
            : null,
          maximum_score_percent: reportable
            ? scores.reduce(function(maximum, score) { return score > maximum ? score : maximum; }, scores[0])
            : null,
          score_band_below_40_count: reportable ? bands[0] : null,
          score_band_40_64_count: reportable ? bands[1] : null,
          score_band_65_84_count: reportable ? bands[2] : null,
          score_band_85_100_count: reportable ? bands[3] : null,
          correct_status_count: reportable ? statuses.correct : null,
          partial_status_count: reportable ? statuses.partial : null,
          incorrect_status_count: reportable ? statuses.incorrect : null,
          unclear_status_count: reportable ? statuses.unclear : null,
          other_status_count: reportable ? statuses.other : null,
          score_sample_status: scores.length === 0
            ? 'no_valid_scores'
            : reportable ? 'available' : 'suppressed_small_groups',
          minimum_reportable_score_count: SI_ALLOSHEET_MIN_SCORE_GROUP
        }
      };
    });
    tables.push(adapter.table({
      id: 'saved_score_summary',
      title: 'Saved score summary',
      columns: [
        siAlloSheetColumn(adapter, 'assignment_code', 'Assignment code', 'category'),
        siAlloSheetColumn(adapter, 'teacher_saved_submission_count', 'Teacher-saved submissions', 'number'),
        siAlloSheetColumn(adapter, 'scored_response_count', 'Scored responses', 'number'),
        siAlloSheetColumn(adapter, 'grading_error_count', 'Grading errors', 'number'),
        siAlloSheetColumn(adapter, 'invalid_score_result_count', 'Invalid score results', 'number'),
        siAlloSheetColumn(adapter, 'average_score_percent', 'Average score (percent)', 'number'),
        siAlloSheetColumn(adapter, 'minimum_score_percent', 'Minimum score (percent)', 'number'),
        siAlloSheetColumn(adapter, 'maximum_score_percent', 'Maximum score (percent)', 'number'),
        siAlloSheetColumn(adapter, 'score_band_below_40_count', 'Scores below 40', 'number'),
        siAlloSheetColumn(adapter, 'score_band_40_64_count', 'Scores from 40 to 64', 'number'),
        siAlloSheetColumn(adapter, 'score_band_65_84_count', 'Scores from 65 to 84', 'number'),
        siAlloSheetColumn(adapter, 'score_band_85_100_count', 'Scores from 85 to 100', 'number'),
        siAlloSheetColumn(adapter, 'correct_status_count', 'Correct status count', 'number'),
        siAlloSheetColumn(adapter, 'partial_status_count', 'Partial status count', 'number'),
        siAlloSheetColumn(adapter, 'incorrect_status_count', 'Incorrect status count', 'number'),
        siAlloSheetColumn(adapter, 'unclear_status_count', 'Unclear status count', 'number'),
        siAlloSheetColumn(adapter, 'other_status_count', 'Other status count', 'number'),
        siAlloSheetColumn(adapter, 'score_sample_status', 'Score sample status', 'category'),
        siAlloSheetColumn(adapter, 'minimum_reportable_score_count', 'Minimum reportable score count', 'number')
      ],
      rows: scoreRows,
      sourceRowCount: scoreRows.length
    }));
  }

  var includedEntries = datedEntries.length;
  return adapter.envelope({
    source: {
      tool: 'submission-inbox',
      label: 'Submission Inbox saved gradebook',
      version: '1'
    },
    title: 'Submission Inbox saved-grade summaries',
    createdAt: review.createdAt,
    classification: {
      level: 'aggregate-education-data',
      studentIdentifierIncluded: false,
      freeTextNotesIncluded: false
    },
    privacy: {
      scope: 'aggregate-saved-gradebook-summary',
      identifierIncluded: false,
      notesIncluded: false,
      reducedData: true,
      transferEnablesAI: false
    },
    tables: tables,
    provenance: {
      measurementWindow: review.dateRange,
      attemptPolicy: review.attemptPolicy,
      assignmentCodeType: 'transfer-local-order-code',
      sourceSavedEntryCount: review.source.sourceEntryCount,
      eligibleSavedEntryCount: review.eligibleEntryCount,
      includedSavedEntryCount: includedEntries,
      excludedMalformedEntryCount: review.source.excludedEntryCount,
      truncatedSourceEntryCount: review.source.truncatedEntryCount || 0,
      truncatedGradeResultCount: review.source.truncatedGradeResultCount || 0,
      maximumGradeResultsPerSavedEntry: SI_ALLOSHEET_MAX_RESULTS_PER_ENTRY,
      selectedAssignmentCount: selected.size,
      omittedAssignmentOptionCount: review.omittedAssignmentCount,
      minimumReportableScoreCount: SI_ALLOSHEET_MIN_SCORE_GROUP,
      suppressedScoreSummaryCount: suppressedScoreSummaries,
      scoreSuppressionRule: 'all-derived-score-statistics-if-any-nonzero-band-or-status-is-below-five',
      dueDateSupport: false,
      humanReviewAttestation: false,
      savedRecordsMayContainAIAssistedScores: true,
      resubmissionPolicy: review.attemptPolicy,
      identitySemantics: {
        stableLearnerIdentitySupport: false,
        learnerGrouping: 'normalized-class-name-plus-nickname',
        stableAssignmentIdentitySupport: false,
        assignmentGrouping: 'normalized-class-name-plus-document-title'
      },
      excludedFields: [
        'student-and-class-identifiers',
        'assignment-titles-and-response-keys',
        'raw-responses-and-feedback',
        'rubric-context-exemplars-and-anchors',
        'files-cryptographic-material-and-work-evidence'
      ]
    },
    capabilities: { writeBack: false, aiEnabled: false }
  });
}

function siIsolateAlloSheetReview(dialog) {
  var snapshots = [];
  if (!dialog || typeof document === 'undefined') return function() {};
  var current = dialog;
  while (current && current.parentElement) {
    var parent = current.parentElement;
    Array.prototype.forEach.call(parent.children, function(sibling) {
      if (sibling === current) return;
      snapshots.push({
        element: sibling,
        inert: sibling.inert === true,
        ariaHidden: sibling.getAttribute('aria-hidden')
      });
      sibling.inert = true;
      sibling.setAttribute('aria-hidden', 'true');
    });
    current = parent;
    if (current === document.body) break;
  }
  return function() {
    snapshots.forEach(function(snapshot) {
      snapshot.element.inert = snapshot.inert;
      if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden');
      else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden);
    });
  };
}

function siTrapAlloSheetReviewFocus(event, container) {
  if (event.key !== 'Tab' || !container) return;
  var focusable = Array.from(container.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )).filter(function(node) {
    return !node.hidden && node.getAttribute('aria-hidden') !== 'true';
  });
  if (!focusable.length) {
    event.preventDefault();
    container.focus();
    return;
  }
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if (!container.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function SubmissionInbox({ isOpen, onClose, rosterKey, t, addToast, onOpenAlloSheet }) {
  if (!isOpen) return null;

  // ── UI localization state (drives tr() above) ──
  var _llCtx = React.useContext(LANG_CTX);
  var uiLang = (_llCtx && _llCtx.currentUiLanguage) || (typeof window !== 'undefined' && window.__alloTextLanguage) || 'English';
  var _llCacheRef = React.useRef(llLoad());
  var _llAttemptedRef = React.useRef({});
  var _setLlTick = React.useState(0)[1];
  LL_CUR.lang = uiLang; LL_CUR.cache = _llCacheRef.current; // publish snapshot for tr()
  React.useEffect(function () {
    if (uiLang === 'English' || typeof window === 'undefined' || typeof window.callGemini !== 'function') return undefined;
    var cache = _llCacheRef.current[uiLang] || {}, attempted = _llAttemptedRef.current[uiLang] || {};
    var missing = Object.keys(STR_REG).filter(function (k) { return !cache[k] && !attempted[k]; });
    if (!missing.length) return undefined;
    var att = _llAttemptedRef.current[uiLang] || (_llAttemptedRef.current[uiLang] = {});
    var to = setTimeout(function () {
      var list = missing.slice(0, 200); list.forEach(function (k) { att[k] = true; });
      Promise.resolve().then(function () { return window.callGemini(llPrompt(uiLang, list)); }).then(function (raw) {
        var pack = null; try { pack = llSanitize(JSON.parse(llCleanJson(raw)), list); } catch (_) {}
        if (pack) { var next = Object.assign({}, _llCacheRef.current); next[uiLang] = Object.assign({}, next[uiLang] || {}, pack); _llCacheRef.current = next; llStore(next); _setLlTick(function (n) { return n + 1; }); }
      }).catch(function () {});
    }, 500);
    return function () { clearTimeout(to); };
  });

  const [privateJwk, setPrivateJwk] = useState(null);
  const [classKeyMeta, setClassKeyMeta] = useState(null);
  const [queue, setQueue] = useState([]);
  const [decryptingAll, setDecryptingAll] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  // Phase 3 (May 11 2026): per-row rubric state + AI grading results.
  // rubrics[idx] = { rubric: string, context: string, exemplar: string }
  // grades[idx]  = { [responseKey]: { score, status, feedback } }
  const [rubrics, setRubrics] = useState({});
  const [grades, setGrades] = useState({});
  const [gradingRow, setGradingRow] = useState(null);
  // Multi-anchor few-shot calibration (May 11 2026, Phase 3 v2):
  // Each anchor is a teacher-scored exemplar of a student response that
  // the AI uses as a calibration sample when grading every other response.
  // Anchors are global across the inbox session (not per-row) so
  // teachers can build up a calibration set by anchoring real student
  // responses they've graded, then have the AI extend the scoring to
  // everything else.
  // shape: [{ studentResponse, teacherScore (0-100), teacherFeedback?, fromSubmissionIdx?, fromResponseKey? }]
  const [anchors, setAnchors] = useState([]);
  const [anchorsPanelOpen, setAnchorsPanelOpen] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState(null);  // {submissionIdx, responseKey, responseText}
  const [confirmation, setConfirmation] = useState(null);
  // Phase 3 v2.1 (May 12 2026): one global rubric the teacher sets at the
  // top of the inbox, used by both the per-row Grade button (as default)
  // and the new "Grade entire queue" bulk action.
  const [globalRubric, setGlobalRubric] = useState({ rubric: '', context: '' });
  const [globalRubricOpen, setGlobalRubricOpen] = useState(false);
  const [bulkGrading, setBulkGrading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  // Gradebook viewer (Phase 3 v2.2, May 12 2026)
  // Reads from localStorage 'alloflow_offline_grades' written by
  // saveRowToGradebook. Refresh tick bumps when we save so the panel
  // re-reads without needing a full remount.
  const [gradebookOpen, setGradebookOpen] = useState(false);
  const [gradebookRefresh, setGradebookRefresh] = useState(0);
  const [showAlloSheetReview, setShowAlloSheetReview] = useState(false);
  const [alloSheetSourceSnapshot, setAlloSheetSourceSnapshot] = useState(null);
  const [alloSheetAsOf, setAlloSheetAsOf] = useState('');
  const [alloSheetDateRange, setAlloSheetDateRange] = useState('90d');
  const [alloSheetAttemptPolicy, setAlloSheetAttemptPolicy] = useState('latest-per-class-nickname');
  const [alloSheetAssignments, setAlloSheetAssignments] = useState([]);
  const [alloSheetDatasets, setAlloSheetDatasets] = useState({ submissionSummary: true, scoreSummary: true });
  const [alloSheetBusy, setAlloSheetBusy] = useState(false);
  const [alloSheetFeedback, setAlloSheetFeedback] = useState({ kind: '', text: '' });
  // Phase 3 v2.3 (May 12 2026): group-by pivot for the gradebook table.
  const [gradebookGroupBy, setGradebookGroupBy] = useState('submission');  // 'submission' | 'student'
  const [expandedStudent, setExpandedStudent] = useState(null);
  // Session persistence: auto-save globalRubric + anchors to localStorage
  // so the teacher doesn't lose their setup across browser refreshes / tabs.
  // sessionLoadedRef prevents the first auto-save from overwriting state
  // before the restore effect has run.
  const sessionLoadedRef = useRef(false);
  const [savedSessionMeta, setSavedSessionMeta] = useState(null);  // { savedAt } if restored from localStorage
  // Phase 3 v2.4 (May 12 2026): named rubric presets ("Reading Response",
  // "Math Word Problem", etc.). Stored in localStorage under
  // 'alloflow_rubric_presets'. Each preset captures rubric + context +
  // anchors so the teacher can re-apply a full calibration in one click.
  const [rubricPresets, setRubricPresets] = useState({});
  const [presetsMenuOpen, setPresetsMenuOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const presetsLoadedRef = useRef(false);
  const gradebookEntries = React.useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');
      return Object.entries(raw).map(([key, entry]) => ({ key: key, ...entry }));
    } catch (e) { return []; }
  }, [gradebookRefresh, isOpen]);
  const keyInputRef = useRef(null);
  const subInputRef = useRef(null);
  const presetImportRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const anchorDialogRef = useRef(null);
  const anchorCancelRef = useRef(null);
  const confirmationDialogRef = useRef(null);
  const confirmationCancelRef = useRef(null);
  const confirmationResolveRef = useRef(null);
  const alloSheetReviewDialogRef = useRef(null);
  const alloSheetReturnFocusRef = useRef(null);
  const alloSheetBusyRef = useRef(false);

  const containDialogFocus = (event, container) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !container) return;
    const focusable = Array.from(container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )).filter(node => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) { event.preventDefault(); container.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => { clearTimeout(timer); if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus(); };
  }, [isOpen]);

  React.useEffect(() => {
    if (!pendingAnchor) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => anchorCancelRef.current?.focus(), 0);
    return () => { clearTimeout(timer); if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus(); };
  }, [!!pendingAnchor]);

  const requestConfirmation = (options) => new Promise(resolve => {
    confirmationResolveRef.current = resolve;
    setConfirmation(options);
  });
  const finishConfirmation = (accepted) => {
    const resolve = confirmationResolveRef.current;
    confirmationResolveRef.current = null;
    setConfirmation(null);
    if (resolve) resolve(accepted);
  };

  React.useEffect(() => {
    if (!confirmation) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => confirmationCancelRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [!!confirmation]);

  React.useEffect(() => {
    if (!showAlloSheetReview) return undefined;
    const restoreIsolation = siIsolateAlloSheetReview(alloSheetReviewDialogRef.current);
    const timer = setTimeout(() => alloSheetReviewDialogRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      restoreIsolation();
      const opener = alloSheetReturnFocusRef.current;
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    };
  }, [showAlloSheetReview]);

  const tx = t || ((k, fallback) => fallback || k);

  // Restore last saved session on first open (Phase 3 v2.3, May 12 2026).
  // Pulls globalRubric + anchors back from localStorage. Class key + queue
  // are intentionally NOT persisted — those are per-batch and shouldn't
  // surprise the teacher by sticking around.
  React.useEffect(() => {
    if (!isOpen || sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;
    try {
      const raw = localStorage.getItem('alloflow_inbox_session');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (saved.globalRubric && (saved.globalRubric.rubric || saved.globalRubric.context)) {
          setGlobalRubric({
            rubric: saved.globalRubric.rubric || '',
            context: saved.globalRubric.context || '',
          });
          setGlobalRubricOpen(true);
        }
        if (Array.isArray(saved.anchors) && saved.anchors.length > 0) {
          setAnchors(saved.anchors);
        }
        if (saved.savedAt) setSavedSessionMeta({ savedAt: saved.savedAt });
      }
    } catch (e) { /* ignore corrupt storage */ }
  }, [isOpen]);

  // Auto-save on changes to globalRubric or anchors (only after first restore
  // has run, so we don't clobber stored state on mount).
  React.useEffect(() => {
    if (!sessionLoadedRef.current) return;
    try {
      const payload = {
        globalRubric: globalRubric,
        anchors: anchors,
        savedAt: new Date().toISOString(),
      };
      // Only write if there's actually something worth saving.
      if ((globalRubric.rubric || '').trim() || (globalRubric.context || '').trim() || anchors.length > 0) {
        localStorage.setItem('alloflow_inbox_session', JSON.stringify(payload));
      } else {
        localStorage.removeItem('alloflow_inbox_session');
      }
    } catch (e) { /* private mode / quota */ }
  }, [globalRubric, anchors]);

  // Load saved presets once when the modal first opens.
  React.useEffect(() => {
    if (!isOpen || presetsLoadedRef.current) return;
    presetsLoadedRef.current = true;
    try {
      const raw = localStorage.getItem('alloflow_rubric_presets');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') setRubricPresets(parsed);
    } catch (e) { /* ignore corrupt storage */ }
  }, [isOpen]);

  const writePresets = (next) => {
    try {
      localStorage.setItem('alloflow_rubric_presets', JSON.stringify(next));
    } catch (e) { /* private mode / quota */ }
    setRubricPresets(next);
  };
  const savePreset = () => {
    const name = (presetNameInput || '').trim();
    if (!name) {
      addToast && addToast(tr('Give the preset a short name (e.g. "Reading response Ch.3").'), 'warn');
      return;
    }
    if (!(globalRubric.rubric || '').trim() && anchors.length === 0) {
      addToast && addToast(tr('Nothing to save yet — add a rubric or anchors first.'), 'warn');
      return;
    }
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const now = new Date().toISOString();
    const existing = rubricPresets[key];
    const preset = {
      name: name,
      rubric: globalRubric.rubric || '',
      context: globalRubric.context || '',
      anchors: anchors.slice(),
      createdAt: existing ? existing.createdAt : now,
      lastUsed: now,
    };
    const next = { ...rubricPresets, [key]: preset };
    writePresets(next);
    setPresetNameInput('');
    addToast && addToast(existing ? 'Updated preset "' + name + '".' : 'Saved preset "' + name + '".', 'success');
  };
  const loadPreset = (key) => {
    const p = rubricPresets[key];
    if (!p) return;
    setGlobalRubric({ rubric: p.rubric || '', context: p.context || '' });
    setAnchors(Array.isArray(p.anchors) ? p.anchors.slice() : []);
    const next = { ...rubricPresets, [key]: { ...p, lastUsed: new Date().toISOString() } };
    writePresets(next);
    setPresetsMenuOpen(false);
    addToast && addToast('Loaded preset "' + p.name + '" (' + (p.anchors ? p.anchors.length : 0) + ' anchor' + ((p.anchors && p.anchors.length === 1) ? '' : 's') + ').', 'success');
  };
  const deletePreset = (key) => {
    if (!rubricPresets[key]) return;
    const name = rubricPresets[key].name;
    const next = { ...rubricPresets };
    delete next[key];
    writePresets(next);
    addToast && addToast('Deleted preset "' + name + '".', 'info');
  };
  // Export ALL presets as a JSON file teachers can share or back up.
  const exportPresets = () => {
    const presetCount = Object.keys(rubricPresets).length;
    if (presetCount === 0) {
      addToast && addToast(tr('No presets to export yet.'), 'warn');
      return;
    }
    const payload = {
      kind: 'alloflow-rubric-presets',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      presets: rubricPresets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'alloflow_rubric_presets_' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
    addToast && addToast('Exported ' + presetCount + ' preset' + (presetCount === 1 ? '' : 's') + '.', 'success');
  };
  // Import presets from a JSON file. Merges into the existing library;
  // duplicates (same slug key) prompt the teacher to confirm overwrite.
  const importPresets = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || parsed.kind !== 'alloflow-rubric-presets' || !parsed.presets) {
        addToast && addToast(tr('Not a valid AlloFlow presets file.'), 'error');
        return;
      }
      const incoming = parsed.presets;
      const conflicts = Object.keys(incoming).filter(k => rubricPresets[k]);
      let overwriteAll = false;
      if (conflicts.length > 0) {
        overwriteAll = await requestConfirmation({
          title: tr('Overwrite existing presets?'),
          message: conflicts.length + ' preset' + (conflicts.length === 1 ? '' : 's') + ' already exist with the same name: ' +
            conflicts.slice(0, 5).map(k => '"' + incoming[k].name + '"').join(', ') +
            (conflicts.length > 5 ? ', …' : '') + '. Choose overwrite to replace them, or skip to keep the existing presets.',
          confirmLabel: tr('Overwrite existing'),
          cancelLabel: tr('Skip existing')
        });
      }
      const next = { ...rubricPresets };
      let added = 0, skipped = 0, overwritten = 0;
      Object.entries(incoming).forEach(([k, p]) => {
        if (next[k]) {
          if (overwriteAll) {
            next[k] = { ...p, lastUsed: new Date().toISOString() };
            overwritten++;
          } else {
            skipped++;
          }
        } else {
          next[k] = { ...p, lastUsed: p.lastUsed || new Date().toISOString() };
          added++;
        }
      });
      writePresets(next);
      addToast && addToast(
        added + ' added' +
        (overwritten > 0 ? ', ' + overwritten + ' overwritten' : '') +
        (skipped > 0 ? ', ' + skipped + ' skipped' : ''),
        'success'
      );
    } catch (err) {
      addToast && addToast('Could not import: ' + err.message, 'error');
    }
    if (e.target) e.target.value = '';
  };

  const clearSavedSession = () => {
    try { localStorage.removeItem('alloflow_inbox_session'); } catch (e) {}
    setGlobalRubric({ rubric: '', context: '' });
    setAnchors([]);
    setSavedSessionMeta(null);
    addToast && addToast(tr('Cleared saved class rubric and anchors.'), 'info');
  };

  const handleKeyFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.kind !== 'alloflow-class-key' || !data.privateJwk) {
        addToast && addToast(tr('Not a valid AlloFlow class key file.'), 'error');
        return;
      }
      setPrivateJwk(data.privateJwk);
      setClassKeyMeta({
        className: data.className || '',
        classId: data.classId,
        createdAt: data.createdAt
      });
      addToast && addToast(tr('Class key loaded.'), 'success');
    } catch (err) {
      addToast && addToast('Could not read key file: ' + err.message, 'error');
    }
    if (e.target) e.target.value = '';
  };

  const handleSubmissionFiles = async (e) => {
    const files = Array.prototype.slice.call(e.target?.files || []);
    if (files.length === 0) return;
    const newRows = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const text = await f.text();
        // Plain-JSON submission (student saved offline with no class key) — the file
        // content IS the decrypted payload, so add it as already-decrypted (no key needed).
        const looksJson = /\.json$/i.test(f.name || '') || text.trim().charAt(0) === '{';
        if (looksJson) {
          try {
            const p = JSON.parse(text);
            // A submission that declares its own kind is accepted on that alone.
            // The response-shaped heuristic below stays for other producers, but
            // on its own it rejected a real submission from a student who worked
            // entirely in activities and games and typed nothing — the file had
            // no `responses` key to recognise, and the evidence of the work they
            // DID do is exactly what the queue now renders.
            const declaresSubmission = p && p.kind === 'alloflow-student-submission';
            const looksResponseShaped = p && ((p.responses && typeof p.responses === 'object') || (p.answers && typeof p.answers === 'object'));
            if (p && (declaresSubmission || looksResponseShaped) && !p.ciphertext) {
              const normalizedPayload = p.responses ? p : {
                ...p,
                nickname: p.nickname || p.studentName || '?',
                timestamp: p.timestamp || p.submissionDate || null,
                docTitle: p.docTitle || 'AlloFlow assignment',
                responses: p.answers || {},
              };
              newRows.push({
                fileName: f.name,
                nickname: normalizedPayload.nickname || '?',
                docTitle: normalizedPayload.docTitle || '',
                timestamp: normalizedPayload.timestamp || null,
                encryptedBlob: null,
                payload: normalizedPayload,
                status: 'decrypted',
                error: null
              });
              continue;
            }
          } catch (e) { /* not plain JSON — fall through to encrypted-HTML parsing */ }
        }
        const match = text.match(/<script type="application\/json" id="alloflow-submission">([\s\S]*?)<\/script>/);
        if (!match) {
          newRows.push({
            fileName: f.name, nickname: '?', status: 'error',
            error: tr('Not an AlloFlow submission file (no embedded blob).')
          });
          continue;
        }
        const json = match[1].replace(/\\u003c/g, '<');
        const blob = JSON.parse(json);
        newRows.push({
          fileName: f.name,
          nickname: blob.nickname || '?',
          docTitle: blob.docTitle || '',
          timestamp: blob.timestamp || null,
          encryptedBlob: blob,
          payload: null,
          status: 'pending',
          error: null
        });
      } catch (err) {
        newRows.push({ fileName: f.name, nickname: '?', status: 'error', error: err.message });
      }
    }
    setQueue(prev => [...prev, ...newRows]);
    if (e.target) e.target.value = '';
  };

  const handleDecryptAll = async () => {
    if (!privateJwk) {
      addToast && addToast(tr('Load the class key file first.'), 'warn');
      return;
    }
    const SC = window.AlloModules && window.AlloModules.SubmissionCrypto;
    if (!SC || typeof SC.decryptSubmission !== 'function') {
      addToast && addToast(tr('SubmissionCrypto module not loaded yet. Try again in a moment.'), 'error');
      return;
    }
    setDecryptingAll(true);
    let ok = 0, fail = 0;
    // Iterate by index so each row gets its own state update
    for (let i = 0; i < queue.length; i++) {
      const row = queue[i];
      if (row.status !== 'pending') continue;
      try {
        const payload = await SC.decryptSubmission(row.encryptedBlob, privateJwk);
        setQueue(prev => prev.map((r, idx) => idx === i ? { ...r, payload, status: 'decrypted' } : r));
        ok++;
      } catch (err) {
        setQueue(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: err.message } : r));
        fail++;
      }
    }
    setDecryptingAll(false);
    addToast && addToast(
      ok + ' decrypted' + (fail > 0 ? ', ' + fail + ' failed (wrong key?)' : ''),
      fail > 0 ? 'warn' : 'success'
    );
  };

  const removeRow = (idx) => setQueue(prev => prev.filter((_, i) => i !== idx));
  const clearQueue = () => { setQueue([]); setExpandedRow(null); };

  const rosterStudents = (rosterKey && rosterKey.students) || {};
  const rosterStudentNames = Object.keys(rosterStudents);
  // Normalize a name for fuzzy comparison: lowercase, strip punctuation
  // + collapse internal whitespace. Handles capitalization, "Test Kid"
  // vs "TestKid", "test-kid", trailing whitespace, etc.
  const _normalizeNickname = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Returns one of:
  //   { kind: 'exact', name }       — exact match in roster
  //   { kind: 'fuzzy', name }       — normalized match (e.g. "TestKid" ↔ "Test Kid")
  //   { kind: 'unknown' }           — no match found
  // Roster matching is intentionally narrow — fuzzy only matches when the
  // normalized forms are identical. Levenshtein/typo tolerance is out of
  // scope for v1 (too easy to silently mis-attribute).
  const rosterMatch = React.useMemo(() => {
    const normalizedRoster = {};
    rosterStudentNames.forEach(n => { normalizedRoster[_normalizeNickname(n)] = n; });
    return (nickname) => {
      if (!nickname || nickname === '?') return { kind: 'unknown' };
      const raw = String(nickname);
      if (rosterStudents[raw]) return { kind: 'exact', name: raw };
      const exactCi = rosterStudentNames.find(n => n.toLowerCase() === raw.toLowerCase());
      if (exactCi) return { kind: 'exact', name: exactCi };
      const norm = _normalizeNickname(raw);
      if (norm && normalizedRoster[norm]) return { kind: 'fuzzy', name: normalizedRoster[norm] };
      return { kind: 'unknown' };
    };
  }, [rosterKey]);
  // Back-compat shim so existing callers still get 'known' | 'unknown'.
  const rosterStatus = (nickname) => {
    const m = rosterMatch(nickname);
    return (m.kind === 'exact' || m.kind === 'fuzzy') ? 'known' : 'unknown';
  };
  // Re-grade detection (Phase 3 v2.5, May 12 2026): when a decrypted row's
  // nickname+docTitle already has an entry in the gradebook, surface a
  // badge so the teacher knows this submission was already graded
  // (typically a student resubmitting). The gradebook key encodes
  // timestamp, so distinct submissions stay separate — this just informs
  // the teacher.
  const previousGradesFor = React.useMemo(() => {
    const byKey = {};
    gradebookEntries.forEach(e => {
      const k = (e.nickname || '').toLowerCase() + '|' + (e.docTitle || '').toLowerCase();
      if (!byKey[k]) byKey[k] = [];
      byKey[k].push(e);
    });
    return (nickname, docTitle) => {
      if (!nickname || !docTitle) return [];
      return byKey[(nickname || '').toLowerCase() + '|' + (docTitle || '').toLowerCase()] || [];
    };
  }, [gradebookEntries]);

  const counts = queue.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const statusBadge = (status) => {
    const styles = {
      pending: { bg: '#f1f5f9', color: '#475569', label: 'Pending' },
      decrypted: { bg: '#dcfce7', color: '#166534', label: '✓ Decrypted' },
      error: { bg: '#fee2e2', color: '#991b1b', label: '✗ Error' }
    };
    const s = styles[status] || styles.pending;
    return /*#__PURE__*/React.createElement('span', {
      style: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700
      }
    }, s.label);
  };

  // ── Phase 3: AI grading helpers ───────────────────────────
  const updateRubric = (idx, patch) => {
    setRubrics(prev => ({ ...prev, [idx]: { ...(prev[idx] || { rubric: '', context: '', exemplar: '' }), ...patch } }));
  };
  const gradeRow = async (idx, opts) => {
    opts = opts || {};
    const row = queue[idx];
    if (!row || row.status !== 'decrypted' || !row.payload) return;
    const r = rubrics[idx] || {};
    // Per-row rubric wins; fall back to the global rubric so a bulk run
    // or a row that hasn't been customized still has something to grade by.
    const rubricText = ((r.rubric || '').trim() || (globalRubric.rubric || '').trim());
    const contextText = ((r.context || '').trim() || (globalRubric.context || '').trim());
    if (!rubricText) {
      if (!opts.silent) addToast && addToast(tr('Add a class rubric at the top, or a per-submission rubric, before grading.'), 'warn');
      return { ok: 0, fail: 0, skipped: true };
    }
    const QH = window.AlloModules && window.AlloModules.QuizAIHelpers;
    if (!QH || typeof QH.gradeFreeformAnswerWithCalibration !== 'function') {
      addToast && addToast(tr('Grader module not loaded yet. Try again in a moment.'), 'error');
      return;
    }
    const callGemini = window.callGemini;
    if (typeof callGemini !== 'function') {
      addToast && addToast(tr('Gemini API not ready. Open a regular AlloFlow window first so the API key loads.'), 'error');
      return;
    }
    // Build calibration set: combine global anchors (multi-anchor few-shot)
    // with the per-row exemplar if one was provided. Cap at 5 to keep the
    // prompt under control.
    const calibrationSamples = [];
    if (Array.isArray(anchors) && anchors.length > 0) {
      anchors.forEach(a => {
        calibrationSamples.push({
          studentResponse: a.studentResponse,
          teacherScore: a.teacherScore,
          teacherFeedback: a.teacherFeedback || ''
        });
      });
    }
    if (r.exemplar && r.exemplar.trim() && calibrationSamples.length < 5) {
      calibrationSamples.push({
        studentResponse: r.exemplar.trim(),
        teacherScore: 95,
        teacherFeedback: 'Teacher-provided exemplar — full credit anchor.'
      });
    }
    const cappedSamples = calibrationSamples.slice(0, 5);

    // Skip responses that are already anchored — they have teacher scores
    // already, no need to ask AI.
    const anchoredKeys = new Set();
    anchors.forEach(a => {
      if (a.fromSubmissionIdx === idx && a.fromResponseKey) anchoredKeys.add(a.fromResponseKey);
    });
    const responseEntries = Object.entries(row.payload.responses || {})
      .filter(([k, v]) => v && String(v).trim() && !anchoredKeys.has(k));
    if (responseEntries.length === 0) {
      if (!opts.silent) addToast && addToast(
        anchoredKeys.size > 0
          ? tr('All responses on this submission are already anchored.')
          : tr('No responses to grade in this submission.'),
        'warn'
      );
      return { ok: 0, fail: 0, skipped: true };
    }
    setGradingRow(idx);
    // Pre-populate anchored responses' grades so they show in the row
    setGrades(prev => {
      const rowGrades = { ...(prev[idx] || {}) };
      anchors.forEach(a => {
        if (a.fromSubmissionIdx === idx && a.fromResponseKey) {
          rowGrades[a.fromResponseKey] = {
            score: a.teacherScore,
            status: 'correct',
            feedback: '📌 Teacher-anchored: ' + (a.teacherFeedback || tr('(no note)'))
          };
        }
      });
      return { ...prev, [idx]: rowGrades };
    });
    let ok = 0, fail = 0;
    for (let i = 0; i < responseEntries.length; i++) {
      const [key, value] = responseEntries[i];
      try {
        const result = await QH.gradeFreeformAnswerWithCalibration({
          rubric: rubricText,
          context: contextText || row.payload.docTitle || '',
          studentResponse: String(value),
          calibrationSamples: cappedSamples,
          callGemini: callGemini,
        });
        setGrades(prev => ({
          ...prev,
          [idx]: { ...(prev[idx] || {}), [key]: result }
        }));
        if (result.status !== 'error') ok++; else fail++;
      } catch (err) {
        setGrades(prev => ({
          ...prev,
          [idx]: { ...(prev[idx] || {}), [key]: { status: 'error', feedback: err.message || tr('Grader failed'), score: 0 } }
        }));
        fail++;
      }
    }
    setGradingRow(null);
    if (!opts.silent) addToast && addToast(
      'Graded ' + ok + ' response' + (ok === 1 ? '' : 's') + (fail > 0 ? ', ' + fail + ' failed' : ''),
      fail > 0 ? 'warn' : 'success'
    );
    return { ok, fail };
  };
  // Phase 3 v2.1: bulk-grade every decrypted submission using the global
  // rubric (and per-row override if one exists). Runs sequentially so the
  // Gemini API isn't hammered + so the teacher can see progress.
  const gradeAllDecrypted = async () => {
    if (!(globalRubric.rubric || '').trim()) {
      addToast && addToast(tr('Add a class rubric at the top before bulk grading.'), 'warn');
      setGlobalRubricOpen(true);
      return;
    }
    const decryptedIdxs = queue
      .map((r, i) => ({ r, i }))
      .filter(x => x.r.status === 'decrypted')
      .map(x => x.i);
    if (decryptedIdxs.length === 0) {
      addToast && addToast(tr('No decrypted submissions to grade.'), 'warn');
      return;
    }
    setBulkGrading(true);
    setBulkProgress({ current: 0, total: decryptedIdxs.length });
    let totalOk = 0, totalFail = 0, totalSkipped = 0;
    for (let i = 0; i < decryptedIdxs.length; i++) {
      const idx = decryptedIdxs[i];
      setBulkProgress({ current: i + 1, total: decryptedIdxs.length });
      const result = await gradeRow(idx, { silent: true });
      if (result) {
        totalOk += result.ok || 0;
        totalFail += result.fail || 0;
        if (result.skipped) totalSkipped += 1;
      }
    }
    setBulkGrading(false);
    setBulkProgress({ current: 0, total: 0 });
    addToast && addToast(
      'Bulk grade done: ' + totalOk + ' response' + (totalOk === 1 ? '' : 's') + ' graded across ' +
        (decryptedIdxs.length - totalSkipped) + ' submission' + (decryptedIdxs.length - totalSkipped === 1 ? '' : 's') +
        (totalFail > 0 ? ', ' + totalFail + ' failed' : '') +
        (totalSkipped > 0 ? ', ' + totalSkipped + ' skipped (already fully anchored or no responses)' : ''),
      totalFail > 0 ? 'warn' : 'success'
    );
  };
  // ── Anchor management (Phase 3 v2: multi-anchor few-shot) ──────
  const openAnchorForm = (submissionIdx, responseKey, responseText) => {
    setPendingAnchor({ submissionIdx, responseKey, responseText, score: 95, feedback: '' });
  };
  const cancelPendingAnchor = () => setPendingAnchor(null);
  const confirmPendingAnchor = () => {
    if (!pendingAnchor) return;
    const score = Math.max(0, Math.min(100, parseInt(pendingAnchor.score, 10) || 0));
    setAnchors(prev => [...prev, {
      studentResponse: pendingAnchor.responseText,
      teacherScore: score,
      teacherFeedback: pendingAnchor.feedback || '',
      fromSubmissionIdx: pendingAnchor.submissionIdx,
      fromResponseKey: pendingAnchor.responseKey,
    }]);
    setPendingAnchor(null);
    addToast && addToast('Anchor added (' + score + '/100). It will calibrate every future grading run.', 'success');
  };
  const removeAnchor = (i) => {
    setAnchors(prev => prev.filter((_, idx) => idx !== i));
  };
  const clearAnchors = () => {
    if (anchors.length === 0) return;
    setAnchors([]);
    addToast && addToast('Cleared ' + anchors.length + ' calibration anchor' + (anchors.length === 1 ? '' : 's') + '.', 'info');
  };
  const isResponseAnchored = (submissionIdx, responseKey) => {
    return anchors.some(a => a.fromSubmissionIdx === submissionIdx && a.fromResponseKey === responseKey);
  };
  const getAnchorScore = (submissionIdx, responseKey) => {
    const a = anchors.find(a2 => a2.fromSubmissionIdx === submissionIdx && a2.fromResponseKey === responseKey);
    return a ? a.teacherScore : null;
  };

  const _writeRowToGradebook = (idx) => {
    const row = queue[idx];
    if (!row || row.status !== 'decrypted' || !row.payload) return { ok: false, reason: tr('not decrypted') };
    const rowGrades = grades[idx] || {};
    if (Object.keys(rowGrades).length === 0) return { ok: false, reason: tr('no grades') };
    const existing = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');
    const nickname = row.payload.nickname || 'unknown';
    const docTitle = row.payload.docTitle || 'untitled';
    const className = (classKeyMeta && classKeyMeta.className) || '';
    const submissionKey = nickname + '|' + docTitle + '|' + (row.payload.timestamp || '');
    existing[submissionKey] = {
      nickname: nickname,
      docTitle: docTitle,
      className: className,
      submittedAt: row.payload.timestamp,
      gradedAt: new Date().toISOString(),
      source: 'offline-html',
      responses: row.payload.responses,
      grades: rowGrades,
      rubric: ((rubrics[idx] && rubrics[idx].rubric) || globalRubric.rubric || '').trim(),
    };
    localStorage.setItem('alloflow_offline_grades', JSON.stringify(existing));
    return { ok: true, key: submissionKey, nickname };
  };
  const saveRowToGradebook = (idx) => {
    const rowGrades = grades[idx] || {};
    if (Object.keys(rowGrades).length === 0) {
      addToast && addToast(tr('Grade the responses first.'), 'warn');
      return;
    }
    try {
      const result = _writeRowToGradebook(idx);
      if (result.ok) {
        addToast && addToast('Saved ' + result.nickname + '\'s submission to local gradebook.', 'success');
        setGradebookRefresh(t => t + 1);
      }
    } catch (err) {
      addToast && addToast('Could not save: ' + err.message, 'error');
    }
  };
  // Bulk save every row that has grades to the local gradebook.
  const saveAllGradedToGradebook = () => {
    const candidates = queue.map((r, i) => i).filter(i => Object.keys(grades[i] || {}).length > 0);
    if (candidates.length === 0) {
      addToast && addToast(tr('No graded submissions to save yet.'), 'warn');
      return;
    }
    let saved = 0, fail = 0;
    for (const idx of candidates) {
      try {
        const result = _writeRowToGradebook(idx);
        if (result.ok) saved++;
        else fail++;
      } catch (e) { fail++; }
    }
    setGradebookRefresh(t => t + 1);
    addToast && addToast(
      'Saved ' + saved + ' submission' + (saved === 1 ? '' : 's') + ' to local gradebook' + (fail > 0 ? ' (' + fail + ' failed)' : ''),
      fail > 0 ? 'warn' : 'success'
    );
  };
  // Delete a gradebook entry by storage key.
  const deleteGradebookEntry = (storageKey) => {
    try {
      const existing = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');
      delete existing[storageKey];
      localStorage.setItem('alloflow_offline_grades', JSON.stringify(existing));
      setGradebookRefresh(t => t + 1);
      addToast && addToast(tr('Removed from gradebook.'), 'info');
    } catch (e) {
      addToast && addToast('Could not delete: ' + e.message, 'error');
    }
  };
  // CSV export: one row per (submission × response) for spreadsheet pivots.
  const exportGradebookCsv = () => {
    if (gradebookEntries.length === 0) {
      addToast && addToast(tr('Gradebook is empty.'), 'warn');
      return;
    }
    const esc = (s) => {
      const v = (s == null ? '' : String(s)).replace(/\r?\n/g, ' ').trim();
      return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const headers = ['Nickname', 'Class', 'Document', 'SubmittedAt', 'GradedAt', 'Source', 'ResponseKey', 'StudentResponse', 'Score', 'Status', 'AIFeedback', 'Rubric'];
    const rows = [headers.join(',')];
    for (const entry of gradebookEntries) {
      const respKeys = Object.keys(entry.grades || {});
      if (respKeys.length === 0) {
        rows.push([entry.nickname, entry.className, entry.docTitle, entry.submittedAt, entry.gradedAt, entry.source, '', '', '', '', '', entry.rubric].map(esc).join(','));
        continue;
      }
      for (const k of respKeys) {
        const g = entry.grades[k] || {};
        const respText = (entry.responses && entry.responses[k]) || '';
        rows.push([entry.nickname, entry.className, entry.docTitle, entry.submittedAt, entry.gradedAt, entry.source, k, respText, g.score, g.status, g.feedback, entry.rubric].map(esc).join(','));
      }
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'alloflow_gradebook_' + dateStr + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
    addToast && addToast('Downloaded gradebook CSV (' + (rows.length - 1) + ' row' + (rows.length - 1 === 1 ? '' : 's') + ').', 'success');
  };
  const gradebookAvg = (entry) => {
    const scores = Object.values(entry.grades || {}).map(g => g.score).filter(s => typeof s === 'number');
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };
  const scoreColor = (score) => {
    if (typeof score !== 'number') return { bg: '#f1f5f9', color: '#475569' };
    if (score >= 85) return { bg: '#dcfce7', color: '#166534' };
    if (score >= 65) return { bg: '#fef3c7', color: '#92400e' };
    if (score >= 40) return { bg: '#fed7aa', color: '#9a3412' };
    return { bg: '#fee2e2', color: '#991b1b' };
  };



  const alloSheetReviewOptions = React.useMemo(() => {
    if (!showAlloSheetReview || !alloSheetSourceSnapshot || !alloSheetAsOf) {
      return {
        review: null,
        error: ''
      };
    }
    try {
      return {
        review: siSubmissionInboxAlloSheetOptions(alloSheetSourceSnapshot, {
          dateRange: alloSheetDateRange,
          attemptPolicy: alloSheetAttemptPolicy,
          createdAt: alloSheetAsOf
        }),
        error: ''
      };
    } catch (error) {
      return {
        review: null,
        error: error && error.message
          ? error.message
          : 'Submission Inbox could not prepare the saved-grade review.'
      };
    }
  }, [
    showAlloSheetReview,
    alloSheetSourceSnapshot,
    alloSheetAsOf,
    alloSheetDateRange,
    alloSheetAttemptPolicy
  ]);

  const alloSheetPreview = React.useMemo(() => {
    if (!showAlloSheetReview || !alloSheetSourceSnapshot || !alloSheetAsOf) {
      return {
        artifact: null,
        error: ''
      };
    }
    try {
      return {
        artifact: siBuildSubmissionInboxAlloSheetEnvelope(alloSheetSourceSnapshot, {
          dateRange: alloSheetDateRange,
          attemptPolicy: alloSheetAttemptPolicy,
          assignmentKeys: alloSheetAssignments,
          datasets: alloSheetDatasets,
          createdAt: alloSheetAsOf
        }),
        error: ''
      };
    } catch (error) {
      return {
        artifact: null,
        error: error && error.message
          ? error.message
          : 'Submission Inbox could not prepare a bounded AlloSheet preview.'
      };
    }
  }, [
    showAlloSheetReview,
    alloSheetSourceSnapshot,
    alloSheetAsOf,
    alloSheetDateRange,
    alloSheetAttemptPolicy,
    alloSheetAssignments,
    alloSheetDatasets
  ]);

  const openAlloSheetReview = (event) => {
    if (gradebookEntries.length === 0) {
      addToast && addToast(tr('Gradebook is empty.'), 'warn');
      return;
    }
    if (typeof onOpenAlloSheet !== 'function') {
      addToast && addToast(tr('AlloSheet is still loading. Try again in a moment.'), 'error');
      return;
    }
    try {
      const snapshot = siPrepareAlloSheetSavedSource({ gradebookEntries: gradebookEntries });
      const asOf = new Date().toISOString();
      const review = siSubmissionInboxAlloSheetOptions(snapshot, {
        dateRange: '90d',
        attemptPolicy: 'latest-per-class-nickname',
        createdAt: asOf
      });
      alloSheetReturnFocusRef.current = event && event.currentTarget
        ? event.currentTarget : document.activeElement;
      alloSheetBusyRef.current = false;
      setAlloSheetSourceSnapshot(snapshot);
      setAlloSheetAsOf(asOf);
      setAlloSheetDateRange('90d');
      setAlloSheetAttemptPolicy('latest-per-class-nickname');
      setAlloSheetAssignments(review.assignments.map(item => item.key));
      setAlloSheetDatasets({ submissionSummary: true, scoreSummary: true });
      setAlloSheetBusy(false);
      setAlloSheetFeedback(review.assignments.length > 0
        ? { kind: '', text: '' }
        : {
            kind: 'status',
            text: 'No teacher-saved records have a valid saved date in the last 90 days. Choose another date window.'
          });
      setShowAlloSheetReview(true);
    } catch (error) {
      addToast && addToast(
        error && error.message
          ? error.message
          : tr('Submission Inbox could not prepare the AlloSheet review.'),
        'error'
      );
    }
  };

  const updateAlloSheetWindow = (dateRange, attemptPolicy) => {
    setAlloSheetDateRange(dateRange);
    setAlloSheetAttemptPolicy(attemptPolicy);
    setAlloSheetFeedback({ kind: '', text: '' });
    if (!alloSheetSourceSnapshot || !alloSheetAsOf) return;
    try {
      const review = siSubmissionInboxAlloSheetOptions(alloSheetSourceSnapshot, {
        dateRange: dateRange,
        attemptPolicy: attemptPolicy,
        createdAt: alloSheetAsOf
      });
      setAlloSheetAssignments(review.assignments.map(item => item.key));
      if (review.assignments.length === 0) {
        setAlloSheetFeedback({
          kind: 'status',
          text: 'No teacher-saved records match this date window and attempt policy.'
        });
      }
    } catch (error) {
      setAlloSheetAssignments([]);
      setAlloSheetFeedback({
        kind: 'error',
        text: error && error.message
          ? error.message
          : 'Submission Inbox could not update the saved-grade review.'
      });
    }
  };

  const closeAlloSheetReview = () => {
    if (alloSheetBusyRef.current) return;
    setShowAlloSheetReview(false);
    setAlloSheetFeedback({ kind: '', text: '' });
  };

  const confirmAlloSheetReview = async () => {
    if (alloSheetBusyRef.current || typeof onOpenAlloSheet !== 'function') return;
    const artifact = alloSheetPreview.artifact;
    if (!artifact || alloSheetPreview.error) {
      setAlloSheetFeedback({
        kind: 'error',
        text: alloSheetPreview.error || 'No reviewed Submission Inbox table is ready to transfer.'
      });
      return;
    }
    if (!artifact.tables.some(table => table.rowCount > 0)) {
      setAlloSheetFeedback({
        kind: 'error',
        text: 'No reviewed Submission Inbox rows match these choices.'
      });
      return;
    }
    alloSheetBusyRef.current = true;
    setAlloSheetBusy(true);
    setAlloSheetFeedback({
      kind: 'status',
      text: 'Opening AlloSheet and waiting for secure receipt...'
    });
    try {
      const pending = onOpenAlloSheet(artifact);
      const opened = pending && typeof pending.then === 'function'
        ? await pending : pending;
      if (opened === false || opened == null) throw new Error('AlloSheet did not open.');
      setAlloSheetFeedback({ kind: '', text: '' });
      setShowAlloSheetReview(false);
      addToast && addToast(
        tr('Reviewed Submission Inbox summaries were received for destination review in AlloSheet.'),
        'success'
      );
    } catch (error) {
      setAlloSheetFeedback({
        kind: 'error',
        text: error && error.message
          ? error.message
          : 'AlloSheet could not receive the reviewed Submission Inbox summaries.'
      });
    } finally {
      alloSheetBusyRef.current = false;
      setAlloSheetBusy(false);
    }
  };

  const renderAlloSheetReview = () => {
    if (!showAlloSheetReview || !window.ReactDOM || typeof window.ReactDOM.createPortal !== 'function') {
      return null;
    }
    const e = React.createElement;
    const review = alloSheetReviewOptions.review;
    const artifact = alloSheetPreview.artifact;
    const tables = artifact && Array.isArray(artifact.tables) ? artifact.tables : [];
    const assignments = review && Array.isArray(review.assignments) ? review.assignments : [];
    const assignmentReviewCodes = new Map();
    assignments.filter(assignment => alloSheetAssignments.includes(assignment.key))
      .forEach((assignment, index) => {
        assignmentReviewCodes.set(assignment.key, 'A' + String(index + 1).padStart(3, '0'));
      });
    const datasetOptions = [
      {
        key: 'submissionSummary',
        table: 'saved_submission_summary',
        label: 'Saved submission summary',
        description: 'Saved-record counts, unique class nicknames, rubric-presence counts, and assignment-group date bounds.'
      },
      {
        key: 'scoreSummary',
        table: 'saved_score_summary',
        label: 'Saved score summary',
        description: 'Score counts and privacy-suppressed score statistics from saved grade results.'
      }
    ];
    const hasRows = tables.some(table => table.rowCount > 0);
    const controlStyle = {
      minHeight: 44,
      width: '100%',
      border: '2px solid #94a3b8',
      borderRadius: 8,
      background: 'white',
      color: '#0f172a',
      padding: '8px 10px',
      fontSize: '0.9rem'
    };
    return window.ReactDOM.createPortal(e('div', {
      role: 'presentation',
      onClick: event => {
        if (event.target === event.currentTarget && !alloSheetBusy) closeAlloSheetReview();
      },
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 295,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15,23,42,0.82)'
      }
    }, e('div', {
      ref: alloSheetReviewDialogRef,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-busy': alloSheetBusy ? 'true' : 'false',
      'aria-labelledby': 'submission-inbox-allosheet-review-title',
      'aria-describedby': 'submission-inbox-allosheet-review-description submission-inbox-allosheet-review-privacy',
      tabIndex: -1,
      onKeyDown: event => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          if (!alloSheetBusyRef.current) closeAlloSheetReview();
          return;
        }
        siTrapAlloSheetReviewFocus(event, alloSheetReviewDialogRef.current);
      },
      style: {
        width: '100%',
        maxWidth: 820,
        maxHeight: '92vh',
        overflowY: 'auto',
        borderRadius: 16,
        border: '3px solid #a5b4fc',
        background: 'white',
        color: '#0f172a',
        boxShadow: '0 24px 70px rgba(0,0,0,0.38)'
      }
    },
      e('div', {
        style: {
          padding: '18px 20px',
          borderBottom: '1px solid #cbd5e1',
          background: '#eef2ff'
        }
      },
        e('h2', {
          id: 'submission-inbox-allosheet-review-title',
          style: { margin: 0, color: '#312e81', fontSize: '1.25rem', fontWeight: 900 }
        }, tr('Review Submission Inbox data for AlloSheet')),
        e('p', {
          id: 'submission-inbox-allosheet-review-description',
          style: { margin: '7px 0 0', color: '#334155', fontSize: '0.88rem', lineHeight: 1.5 }
        }, tr('Choose the saved assignment/class groups, date window, grouping policy, and exact summary tables. Submission Inbox remains authoritative and AlloSheet cannot write back.'))
      ),
      e('div', {
        style: { display: 'grid', gap: 16, padding: 20, fontSize: '0.9rem' }
      },
        e('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12
          }
        },
          e('div', null,
            e('label', {
              htmlFor: 'submission-inbox-allosheet-date-range',
              style: { display: 'block', marginBottom: 5, fontWeight: 800 }
            }, tr('Saved-date window')),
            e('select', {
              id: 'submission-inbox-allosheet-date-range',
              value: alloSheetDateRange,
              disabled: alloSheetBusy,
              onChange: event => updateAlloSheetWindow(event.target.value, alloSheetAttemptPolicy),
              style: controlStyle
            },
              e('option', { value: '30d' }, tr('Last 30 days')),
              e('option', { value: '90d' }, tr('Last 90 days (recommended)')),
              e('option', { value: 'all' }, tr('All available saved dates'))
            )
          ),
          e('div', null,
            e('label', {
              htmlFor: 'submission-inbox-allosheet-attempt-policy',
              style: { display: 'block', marginBottom: 5, fontWeight: 800 }
            }, tr('Saved-attempt policy')),
            e('select', {
              id: 'submission-inbox-allosheet-attempt-policy',
              value: alloSheetAttemptPolicy,
              disabled: alloSheetBusy,
              onChange: event => updateAlloSheetWindow(alloSheetDateRange, event.target.value),
              style: controlStyle
            },
              e('option', { value: 'latest-per-class-nickname' }, tr('Latest saved record per class nickname and assignment/class group (recommended)')),
              e('option', { value: 'all-saved' }, tr('All saved records, including resubmissions'))
            )
          )
        ),
        e('fieldset', {
          disabled: alloSheetBusy,
          style: {
            margin: 0,
            border: '2px solid #cbd5e1',
            borderRadius: 12,
            padding: 12
          }
        },
          e('legend', {
            style: { padding: '0 6px', fontWeight: 900, color: '#1e293b' }
          }, tr('Saved assignment/class groups')),
          e('p', {
            style: { margin: '0 0 10px', color: '#475569', fontSize: '0.8rem' }
          }, tr('Assignment and class labels are shown only for this source review. They are replaced by transfer-local codes before transfer.')),
          assignments.length === 0
            ? e('p', {
                role: 'status',
                style: { margin: 0, color: '#92400e', fontWeight: 700 }
              }, tr('No saved assignment/class groups match these choices.'))
            : e('div', {
                style: {
                  display: 'grid',
                  gap: 7,
                  maxHeight: 190,
                  overflowY: 'auto',
                  paddingRight: 4
                }
              }, assignments.map(assignment => e('label', {
                key: assignment.key,
                style: {
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 9,
                  minHeight: 44,
                  padding: '9px 10px',
                  border: '1px solid #94a3b8',
                  borderRadius: 8,
                  background: alloSheetAssignments.includes(assignment.key) ? '#eef2ff' : 'white',
                  cursor: alloSheetBusy ? 'not-allowed' : 'pointer'
                }
              },
                e('input', {
                  type: 'checkbox',
                  checked: alloSheetAssignments.includes(assignment.key),
                  disabled: alloSheetBusy,
                  onChange: event => {
                    const checked = event.target.checked;
                    setAlloSheetAssignments(previous => checked
                      ? previous.concat([assignment.key]).filter((title, index, list) => list.indexOf(title) === index)
                      : previous.filter(title => title !== assignment.key));
                    setAlloSheetFeedback({ kind: '', text: '' });
                  },
                  style: { width: 20, height: 20, marginTop: 1, flexShrink: 0 }
                }),
                e('span', { style: { minWidth: 0 } },
                  e('span', {
                    style: { display: 'block', fontWeight: 800, overflowWrap: 'anywhere' }
                  }, (assignmentReviewCodes.get(assignment.key)
                    ? assignmentReviewCodes.get(assignment.key) + ' - ' : '') + assignment.label),
                  e('span', {
                    style: { display: 'block', marginTop: 2, color: '#475569', fontSize: '0.76rem' }
                  }, assignment.savedEntryCount + ' saved record' + (assignment.savedEntryCount === 1 ? '' : 's'))
                )
              ))),
          review && review.omittedAssignmentCount > 0 && e('p', {
            role: 'status',
            style: { margin: '9px 0 0', color: '#92400e', fontWeight: 700, fontSize: '0.8rem' }
          }, review.omittedAssignmentCount + ' additional assignment option'
            + (review.omittedAssignmentCount === 1 ? ' is' : 's are')
            + ' omitted by the 50-assignment review limit.')
        ),
        e('fieldset', {
          disabled: alloSheetBusy,
          style: {
            margin: 0,
            border: '2px solid #cbd5e1',
            borderRadius: 12,
            padding: 12
          }
        },
          e('legend', {
            style: { padding: '0 6px', fontWeight: 900, color: '#1e293b' }
          }, tr('Summary tables')),
          e('div', { style: { display: 'grid', gap: 8 } }, datasetOptions.map(dataset => {
            const table = tables.find(candidate => candidate.id === dataset.table);
            return e('label', {
              key: dataset.key,
              style: {
                display: 'grid',
                gridTemplateColumns: '22px minmax(0, 1fr) auto',
                alignItems: 'start',
                gap: 8,
                minHeight: 44,
                padding: '9px 10px',
                border: '1px solid #94a3b8',
                borderRadius: 8
              }
            },
              e('input', {
                type: 'checkbox',
                checked: alloSheetDatasets[dataset.key] !== false,
                disabled: alloSheetBusy,
                onChange: event => {
                  const checked = event.target.checked;
                  setAlloSheetDatasets(previous => ({
                    ...previous,
                    [dataset.key]: checked
                  }));
                  setAlloSheetFeedback({ kind: '', text: '' });
                },
                style: { width: 20, height: 20, marginTop: 1 }
              }),
              e('span', null,
                e('span', { style: { display: 'block', fontWeight: 800 } }, tr(dataset.label)),
                e('span', {
                  style: { display: 'block', marginTop: 2, color: '#475569', fontSize: '0.76rem' }
                }, tr(dataset.description))
              ),
              e('span', {
                style: { color: '#475569', fontSize: '0.76rem', whiteSpace: 'nowrap' }
              }, table ? table.rowCount + ' rows' : 'not selected')
            );
          }))
        ),
        e('p', {
          id: 'submission-inbox-allosheet-review-privacy',
          style: {
            margin: 0,
            padding: 12,
            border: '2px solid #f59e0b',
            borderRadius: 10,
            background: '#fffbeb',
            color: '#78350f',
            lineHeight: 1.5
          }
        },
          e('strong', null, tr('Privacy boundary: ')),
          tr('The transfer uses aggregate assignment codes. Learner, class, and assignment names; response text and keys; AI feedback; rubric prose; files; storage keys; and work-evidence details are always excluded. Derived score statistics are blank when the total is below five or any nonzero score band or status group is below five.')
        ),
        e('section', {
          'aria-labelledby': 'submission-inbox-allosheet-preview-heading',
          style: {
            padding: 13,
            border: '2px solid #94a3b8',
            borderRadius: 10,
            background: '#f8fafc'
          }
        },
          e('h3', {
            id: 'submission-inbox-allosheet-preview-heading',
            style: { margin: 0, fontSize: '1rem', fontWeight: 900 }
          }, tr('Exact transfer preview')),
          (alloSheetReviewOptions.error || alloSheetPreview.error) && e('p', {
            role: 'alert',
            style: {
              margin: '9px 0 0',
              padding: 10,
              border: '1px solid #fca5a5',
              borderRadius: 8,
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 700
            }
          }, alloSheetReviewOptions.error || alloSheetPreview.error),
          !alloSheetReviewOptions.error && !alloSheetPreview.error && e('ul', {
            style: { display: 'grid', gap: 9, margin: '10px 0 0', padding: 0, listStyle: 'none' }
          }, tables.map(table => e('li', {
            key: table.id,
            style: {
              padding: 10,
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: 'white'
            }
          },
            e('div', { style: { fontWeight: 800 } }, tr(table.title)),
            e('div', {
              style: { marginTop: 3, color: '#475569', fontSize: '0.76rem' }
            }, table.rowCount + ' rows and ' + table.columns.length + ' fixed fields'),
            e('ul', {
              'aria-label': table.title + ' fields',
              style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
                margin: '8px 0 0',
                padding: 0,
                listStyle: 'none'
              }
            }, table.columns.map(column => e('li', {
              key: column.key,
              style: {
                padding: '3px 6px',
                border: '1px solid #94a3b8',
                borderRadius: 5,
                background: '#f8fafc',
                fontSize: '0.7rem'
              }
            }, tr(column.label) + ' (' + column.type + ')')))
          ))),
          artifact && artifact.provenance
            && artifact.provenance.truncatedSourceEntryCount > 0
            && e('p', {
              role: 'status',
              style: {
                margin: '9px 0 0',
                padding: 8,
                border: '1px solid #fbbf24',
                borderRadius: 7,
                background: '#fffbeb',
                color: '#78350f',
                fontWeight: 700
              }
            }, artifact.provenance.truncatedSourceEntryCount
              + ' saved gradebook record'
              + (artifact.provenance.truncatedSourceEntryCount === 1 ? ' was' : 's were')
              + ' omitted by the 2,000-record source-review safety limit.'),
          artifact && artifact.provenance
            && artifact.provenance.truncatedGradeResultCount > 0
            && e('p', {
              role: 'status',
              style: {
                margin: '9px 0 0',
                padding: 8,
                border: '1px solid #fbbf24',
                borderRadius: 7,
                background: '#fffbeb',
                color: '#78350f',
                fontWeight: 700
              }
            }, artifact.provenance.truncatedGradeResultCount
              + ' grade result'
              + (artifact.provenance.truncatedGradeResultCount === 1 ? ' was' : 's were')
              + ' omitted by the 200-results-per-saved-record safety limit.'),
          artifact && artifact.provenance
            && artifact.provenance.suppressedScoreSummaryCount > 0
            && e('p', {
              role: 'status',
              style: {
                margin: '9px 0 0',
                padding: 8,
                border: '1px solid #fbbf24',
                borderRadius: 7,
                background: '#fffbeb',
                color: '#78350f',
                fontWeight: 700
              }
            }, artifact.provenance.suppressedScoreSummaryCount
              + ' score summary '
              + (artifact.provenance.suppressedScoreSummaryCount === 1 ? 'is' : 'rows are')
              + ' privacy-suppressed.')
        ),
        e('div', {
          style: {
            padding: 12,
            border: '1px solid #fda4af',
            borderRadius: 10,
            background: '#fff1f2',
            color: '#881337',
            lineHeight: 1.5
          }
        },
          e('p', { style: { margin: 0, fontWeight: 900 } }, tr('Saved-record integrity limits')),
          e('p', { style: { margin: '5px 0 0', fontSize: '0.8rem' } },
            tr('A teacher-saved record may contain AI-assisted scores; saving is not a human-review attestation. Submission Inbox does not currently store stable learner or assignment IDs, due dates, missing or late status, or structured rubric criteria. Grouping therefore uses normalized class name plus nickname and normalized class name plus document title; reused nicknames may merge, changed nicknames may split records, and repeated same-title documents in one class may share an assignment/class group. This transfer makes no human-verified, missing, late, or criterion-level claims.')
          )
        ),
        e('div', {
          style: {
            padding: 12,
            border: '1px solid #6ee7b7',
            borderRadius: 10,
            background: '#ecfdf5',
            color: '#064e3b',
            lineHeight: 1.5
          }
        },
          e('p', { style: { margin: 0, fontWeight: 900 } }, tr('One-way reviewed copy')),
          e('p', { style: { margin: '5px 0 0', fontSize: '0.8rem' } },
            tr('This transfer does not enable AI, send data to an AI service, change Submission Inbox, or allow AlloSheet to write back.')
          )
        ),
        alloSheetFeedback.text && e('p', {
          role: alloSheetFeedback.kind === 'error' ? 'alert' : 'status',
          'aria-live': alloSheetFeedback.kind === 'error' ? 'assertive' : 'polite',
          style: {
            margin: 0,
            padding: 11,
            border: alloSheetFeedback.kind === 'error' ? '1px solid #fca5a5' : '1px solid #a5b4fc',
            borderRadius: 8,
            background: alloSheetFeedback.kind === 'error' ? '#fef2f2' : '#eef2ff',
            color: alloSheetFeedback.kind === 'error' ? '#991b1b' : '#312e81',
            fontWeight: 700
          }
        }, alloSheetFeedback.text)
      ),
      e('div', {
        style: {
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 9,
          padding: '14px 20px',
          borderTop: '1px solid #cbd5e1',
          background: 'white'
        }
      },
        e('button', {
          type: 'button',
          onClick: closeAlloSheetReview,
          disabled: alloSheetBusy,
          style: {
            minHeight: 44,
            padding: '8px 15px',
            border: '2px solid #64748b',
            borderRadius: 8,
            background: 'white',
            color: '#0f172a',
            fontWeight: 800,
            cursor: alloSheetBusy ? 'not-allowed' : 'pointer',
            opacity: alloSheetBusy ? 0.55 : 1
          }
        }, tr('Cancel')),
        e('button', {
          type: 'button',
          onClick: confirmAlloSheetReview,
          disabled: alloSheetBusy
            || !!alloSheetReviewOptions.error
            || !!alloSheetPreview.error
            || !hasRows,
          style: {
            minHeight: 44,
            padding: '8px 17px',
            border: '2px solid #3730a3',
            borderRadius: 8,
            background: '#4338ca',
            color: 'white',
            fontWeight: 900,
            cursor: alloSheetBusy ? 'not-allowed' : 'pointer',
            opacity: alloSheetBusy
              || !!alloSheetReviewOptions.error
              || !!alloSheetPreview.error
              || !hasRows ? 0.55 : 1
          }
        }, alloSheetBusy ? tr('Waiting for AlloSheet...') : tr('Confirm and open AlloSheet'))
      )
    )), document.body);
  };

  // rosterBadge accepts either a legacy 'known'|'unknown' string OR the
  // {kind, name} object returned by rosterMatch — fuzzy matches surface
  // the real roster name so a "TestKid" submission shows "✓ Test Kid".
  const rosterBadge = (input) => {
    let kind, name;
    if (typeof input === 'string') {
      kind = input;
      name = null;
    } else if (input && typeof input === 'object') {
      kind = input.kind === 'exact' || input.kind === 'fuzzy' ? input.kind : 'unknown';
      name = input.name;
    } else {
      kind = 'unknown';
    }
    let bg, color, label, title;
    if (kind === 'exact') {
      bg = '#dcfce7'; color = '#166534'; label = tr('✓ Roster match'); title = tr('Exact roster match');
    } else if (kind === 'fuzzy') {
      bg = '#dcfce7'; color = '#166534'; label = '✓ ' + name; title = 'Matched roster student "' + name + '" by normalized name (capitalization/punctuation ignored)';
    } else {
      bg = '#fef3c7'; color = '#92400e'; label = tr('⚠ Unknown name'); title = tr('No roster student matched this nickname');
    }
    return /*#__PURE__*/React.createElement('span', {
      title: title,
      style: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        background: bg, color: color, fontSize: '0.7rem', fontWeight: 600
      }
    }, label);
  };

  // ── Render ──────────────────────────────────────────────────
  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 270,
      background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }
  },
    /*#__PURE__*/React.createElement('div', {
      ref: dialogRef, role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': 'submission-inbox-title', 'aria-describedby': 'submission-inbox-description',
      tabIndex: -1, onKeyDown: event => containDialogFocus(event, dialogRef.current),
      style: {
        background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 980, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '2px solid #c7d2fe', overflow: 'hidden', position: 'relative'
      }
    },
      // Header
      /*#__PURE__*/React.createElement('div', { style: { padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        /*#__PURE__*/React.createElement('div', null,
          /*#__PURE__*/React.createElement('h2', { id: 'submission-inbox-title', style: { margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 } },
            tr('📥 Import student submissions')
          ),
          /*#__PURE__*/React.createElement('p', { id: 'submission-inbox-description', style: { margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' } },
            tr('Load your class key, then drop in the encrypted .alloflow.html files students sent you.')
          )
        ),
        /*#__PURE__*/React.createElement('button', {
          ref: closeButtonRef, type: 'button', onClick: onClose,
          style: { padding: '6px 10px', border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, borderRadius: 6 },
          'aria-label': tr('Close')
        }, '×')
      ),

      // Body
      /*#__PURE__*/React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '18px 22px' } },
        // Step 1: class key
        /*#__PURE__*/React.createElement('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 16px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('div', null,
              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#1e3a8a', marginBottom: 2 } }, tr('1. Class key file')),
              privateJwk
                ? /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#1e40af' } },
                    tr('✓ Loaded'),
                    classKeyMeta?.className ? ' for "' + classKeyMeta.className + '"' : '',
                    classKeyMeta?.createdAt ? ' (created ' + classKeyMeta.createdAt.slice(0, 10) + ')' : ''
                  )
                : /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#64748b' } },
                    tr('Pick the class-key_*.alloflow file you saved when setting up offline submissions.')
                  )
            ),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: () => keyInputRef.current?.click(),
              style: { padding: '8px 16px', background: privateJwk ? '#f1f5f9' : '#2563eb', color: privateJwk ? '#475569' : 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }
            }, privateJwk ? tr('🔁 Load different key') : tr('🔑 Load class key'))
          ),
          /*#__PURE__*/React.createElement('input', {
            ref: keyInputRef, type: 'file', accept: '.alloflow,application/json',
            onChange: handleKeyFile, style: { display: 'none' }, 'aria-label': tr('Class key file')
          })
        ),

        // Step 2: submission files
        /*#__PURE__*/React.createElement('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('div', null,
              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#166534', marginBottom: 2 } }, tr('2. Student submission files')),
              /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#475569' } },
                queue.length === 0
                  ? tr('Select the files students saved — encrypted .alloflow.html (needs the class key) or plain .json (no key needed).')
                  : (queue.length + ' file' + (queue.length === 1 ? '' : 's') + ' loaded · ' +
                     (counts.decrypted || 0) + ' decrypted · ' +
                     (counts.pending || 0) + ' pending · ' +
                     (counts.error || 0) + ' error')
              )
            ),
            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8 } },
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: () => subInputRef.current?.click(),
                style: { padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }
              }, tr('＋ Add submissions')),
              queue.length > 0 && /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: clearQueue,
                style: { padding: '8px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }
              }, tr('Clear'))
            )
          ),
          /*#__PURE__*/React.createElement('input', {
            ref: subInputRef, type: 'file', accept: '.html,.alloflow.html,text/html,.json,application/json', multiple: true,
            onChange: handleSubmissionFiles, style: { display: 'none' }, 'aria-label': tr('Submission files')
          })
        ),

        // Class rubric panel — shown whenever ≥1 row is decrypted. Optional
        // global rubric that fills in the per-row rubric when grading.
        (counts.decrypted || 0) > 0 && /*#__PURE__*/React.createElement('div', { style: { background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: globalRubricOpen ? '14px 16px' : '8px 14px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              onClick: () => setGlobalRubricOpen(!globalRubricOpen),
              style: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, color: '#3730a3', fontSize: '0.9rem' }
            },
              tr('🎯 Class rubric'),
              (globalRubric.rubric || '').trim() && /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '1px 8px', borderRadius: 999, background: '#c7d2fe', color: '#3730a3', fontSize: '0.7rem', fontWeight: 700 } }, tr('✓ set')),
              /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' } }, globalRubricOpen ? '▾' : '▸')
            ),
            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              !bulkGrading && /*#__PURE__*/React.createElement('button', {
                type: 'button',
                onClick: gradeAllDecrypted,
                disabled: (counts.decrypted || 0) === 0 || !(globalRubric.rubric || '').trim(),
                title: (globalRubric.rubric || '').trim()
                  ? tr('Grade every decrypted submission in the queue with this rubric')
                  : tr('Set a class rubric first'),
                style: {
                  padding: '8px 16px',
                  background: ((counts.decrypted || 0) === 0 || !(globalRubric.rubric || '').trim()) ? '#cbd5e1' : '#4f46e5',
                  color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                  cursor: ((counts.decrypted || 0) === 0 || !(globalRubric.rubric || '').trim()) ? 'not-allowed' : 'pointer'
                }
              }, '🎯 Grade entire queue (' + (counts.decrypted || 0) + ')'),
              !bulkGrading && (() => {
                const gradedCount = queue.filter((_, i) => Object.keys(grades[i] || {}).length > 0).length;
                return gradedCount > 0 && /*#__PURE__*/React.createElement('button', {
                  type: 'button',
                  onClick: saveAllGradedToGradebook,
                  title: tr('Write every graded submission to the local gradebook'),
                  style: { padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
                }, '💾 Save all graded (' + gradedCount + ')');
              })(),
              bulkGrading && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#3730a3', fontWeight: 700 } },
                /*#__PURE__*/React.createElement('span', null, 'Grading ' + bulkProgress.current + ' / ' + bulkProgress.total + '…'),
                /*#__PURE__*/React.createElement('div', { style: { width: 120, height: 8, background: '#c7d2fe', borderRadius: 999, overflow: 'hidden' } },
                  /*#__PURE__*/React.createElement('div', { style: { width: (bulkProgress.total ? (bulkProgress.current / bulkProgress.total * 100) : 0) + '%', height: '100%', background: '#4f46e5', transition: 'width 0.3s' } })
                )
              )
            )
          ),
          globalRubricOpen && /*#__PURE__*/React.createElement('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #c7d2fe' } },
            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#3730a3', fontWeight: 600, marginBottom: 4 } }, tr('Rubric for this batch — what does full credit look like?')),
            /*#__PURE__*/React.createElement('textarea', {
              value: globalRubric.rubric,
              onChange: e => setGlobalRubric(prev => ({ ...prev, rubric: e.target.value })),
              placeholder: tr('e.g., "Each response should name the main idea, cite at least one specific detail from the text, and explain reasoning in 2-3 complete sentences."'),
              rows: 3,
              style: { width: '100%', padding: 8, border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 10 }
            }),
            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#3730a3', fontWeight: 600, marginBottom: 4 } }, tr('Assignment context (optional)')),
            /*#__PURE__*/React.createElement('input', {
              type: 'text',
              value: globalRubric.context,
              onChange: e => setGlobalRubric(prev => ({ ...prev, context: e.target.value })),
              placeholder: tr('e.g., "Reading response to chapter 3"'),
              style: { width: '100%', padding: '6px 8px', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.85rem', marginBottom: 8 }
            }),
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.78rem', color: '#475569' } },
              tr('This rubric is used by "Grade entire queue" and as the default for each per-submission Grade button. Per-submission rubrics still override the global one when set.')
            ),
            // Named preset library — save/load named rubric+anchor sets across sessions
            /*#__PURE__*/React.createElement('div', { style: { marginTop: 12, paddingTop: 10, borderTop: '1px dashed #c7d2fe' } },
              /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.78rem', fontWeight: 700, color: '#3730a3', marginRight: 4 } }, tr('📋 Presets:')),
                /*#__PURE__*/React.createElement('input', {
                  type: 'text', 'aria-label': tr('Preset name'),
                  value: presetNameInput,
                  onChange: e => setPresetNameInput(e.target.value),
                  onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); savePreset(); } },
                  placeholder: tr('Name this preset (e.g. "Reading response Ch.3")'),
                  style: { flex: 1, minWidth: 180, padding: '5px 10px', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.8rem' }
                }),
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: savePreset,
                  disabled: !presetNameInput.trim() || (!globalRubric.rubric.trim() && anchors.length === 0),
                  title: tr('Save the current rubric + context + anchors as a named preset.'),
                  style: {
                    padding: '5px 12px',
                    background: (!presetNameInput.trim() || (!globalRubric.rubric.trim() && anchors.length === 0)) ? '#cbd5e1' : '#4f46e5',
                    color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem',
                    cursor: (!presetNameInput.trim() || (!globalRubric.rubric.trim() && anchors.length === 0)) ? 'not-allowed' : 'pointer'
                  }
                }, tr('💾 Save')),
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: () => presetImportRef.current?.click(),
                  title: tr('Import presets from a JSON file (e.g. shared by another teacher).'),
                  style: { padding: '5px 10px', background: 'white', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer' }
                }, tr('⬆ Import')),
                /*#__PURE__*/React.createElement('input', {
                  ref: presetImportRef, type: 'file', accept: '.json,application/json',
                  onChange: importPresets, style: { display: 'none' }, 'aria-label': tr('Import presets JSON')
                }),
                Object.keys(rubricPresets).length > 0 && /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: exportPresets,
                  title: tr('Export all your presets as a JSON file you can share or back up.'),
                  style: { padding: '5px 10px', background: 'white', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer' }
                }, tr('⬇ Export')),
                Object.keys(rubricPresets).length > 0 && /*#__PURE__*/React.createElement('div', { style: { position: 'relative' } },
                  /*#__PURE__*/React.createElement('button', {
                    type: 'button', onClick: () => setPresetsMenuOpen(!presetsMenuOpen),
                    title: tr('Load a saved preset'),
                    style: { padding: '5px 12px', background: 'white', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }
                  }, '📂 Load (' + Object.keys(rubricPresets).length + ') ' + (presetsMenuOpen ? '▴' : '▾')),
                  presetsMenuOpen && /*#__PURE__*/React.createElement('div', { style: { position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'white', border: '1px solid #c7d2fe', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 280, maxHeight: 320, overflowY: 'auto', zIndex: 5 } },
                    Object.entries(rubricPresets)
                      .sort(([, a], [, b]) => (b.lastUsed || '').localeCompare(a.lastUsed || ''))
                      .map(([key, p]) => /*#__PURE__*/React.createElement('div', {
                        key: key,
                        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', gap: 6 }
                      },
                        /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => loadPreset(key),
                          style: { flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }
                        },
                          /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' } }, p.name),
                          /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.72rem', color: '#475569' } },
                            (p.anchors ? p.anchors.length : 0) + ' anchor' + (p.anchors && p.anchors.length === 1 ? '' : 's'),
                            ' · last used ',
                            p.lastUsed ? new Date(p.lastUsed).toLocaleDateString() : '—'
                          )
                        ),
                        /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: async (e) => {
                            e.stopPropagation();
                            const accepted = await requestConfirmation({
                              title: tr('Delete preset?'),
                              message: 'Delete preset "' + p.name + '"? This cannot be undone.',
                              confirmLabel: tr('Delete preset'),
                              cancelLabel: tr('Keep preset')
                            });
                            if (accepted) deletePreset(key);
                          },
                          title: tr('Delete this preset'),
                          style: { padding: '2px 8px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer' }
                        }, '✗')
                      ))
                  )
                )
              ),
              /*#__PURE__*/React.createElement('div', { style: { marginTop: 6, fontSize: '0.72rem', color: '#64748b' } },
                tr('Presets save the rubric + context + every calibration anchor as a named set. Pick a name like "Reading response", "Math word problem", "Lab report" so you can load the right calibration when the same assignment comes back.')
              )
            ),
            (savedSessionMeta || (globalRubric.rubric || '').trim() || anchors.length > 0) && /*#__PURE__*/React.createElement('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: '0.78rem', color: '#3730a3' } },
              /*#__PURE__*/React.createElement('span', null,
                savedSessionMeta
                  ? '💾 Restored from saved session (' + new Date(savedSessionMeta.savedAt).toLocaleString() + '). Auto-saves on every change.'
                  : tr('💾 Auto-saves your rubric + anchors so they persist across browser refreshes.')
              ),
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: clearSavedSession,
                title: tr('Clear the auto-saved rubric and anchors'),
                style: { padding: '4px 10px', background: 'transparent', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }
              }, tr('Clear saved session'))
            )
          )
        ),

        // Gradebook viewer panel — always visible, shows accumulated saved grades
        // across all inbox sessions. Reads from localStorage 'alloflow_offline_grades'.
        /*#__PURE__*/React.createElement('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: gradebookOpen ? '14px 16px' : '8px 14px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              onClick: () => setGradebookOpen(!gradebookOpen),
              style: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, color: '#166534', fontSize: '0.9rem' }
            },
              tr('📊 Gradebook'),
              /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '1px 8px', borderRadius: 999, background: '#bbf7d0', color: '#166534', fontSize: '0.7rem', fontWeight: 700 } }, gradebookEntries.length + ' saved'),
              /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' } }, gradebookOpen ? '▾' : '▸')
            ),
            gradebookEntries.length > 0 && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '100%' } },
              /*#__PURE__*/React.createElement('div', { style: { display: 'inline-flex', background: 'white', border: '1px solid #86efac', borderRadius: 6, padding: 2, fontSize: '0.74rem', fontWeight: 600 } },
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: () => setGradebookGroupBy('submission'),
                  style: { padding: '4px 10px', background: gradebookGroupBy === 'submission' ? '#16a34a' : 'transparent', color: gradebookGroupBy === 'submission' ? 'white' : '#166534', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }
                }, tr('Submissions')),
                /*#__PURE__*/React.createElement('button', {
                  type: 'button', onClick: () => setGradebookGroupBy('student'),
                  style: { padding: '4px 10px', background: gradebookGroupBy === 'student' ? '#16a34a' : 'transparent', color: gradebookGroupBy === 'student' ? 'white' : '#166534', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }
                }, tr('By student'))
              ),
              typeof onOpenAlloSheet === 'function' && /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: openAlloSheetReview,
                'aria-haspopup': 'dialog',
                title: tr('Review privacy-bounded saved-grade summaries before opening AlloSheet'),
                style: { padding: '6px 12px', background: '#4338ca', color: 'white', border: '1px solid #3730a3', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }
              }, tr('Open in AlloSheet')),
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: exportGradebookCsv,
                title: tr('Download all saved grades as a CSV spreadsheet'),
                style: { padding: '6px 12px', background: 'white', color: '#166534', border: '1px solid #86efac', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }
              }, tr('⬇ Export CSV'))
            )
          ),
          gradebookOpen && /*#__PURE__*/React.createElement('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #bbf7d0' } },
            gradebookEntries.length === 0
              ? /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#166534', fontStyle: 'italic' } },
                  tr('No saved grades yet. Grade some submissions and click "💾 Save all graded" or the per-row "Save to gradebook" button to populate this list.')
                )
              : /*#__PURE__*/React.createElement('div', null,
                  /*#__PURE__*/React.createElement('div', { style: { border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden', background: 'white' } },
                    /*#__PURE__*/React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' } },
                      /*#__PURE__*/React.createElement('thead', null,
                        /*#__PURE__*/React.createElement('tr', { style: { background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' } },
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? 'Student' : 'Nickname'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? 'Submissions' : 'Document'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? tr('Avg of avgs') : 'Avg'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#166534', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, gradebookGroupBy === 'student' ? tr('Last graded') : 'Graded'),
                          /*#__PURE__*/React.createElement('th', { scope: 'col', 'aria-label': tr('Actions'), style: { textAlign: 'right', padding: '8px 12px' } }, '')
                        )
                      ),
                      /*#__PURE__*/React.createElement('tbody', null,
                        gradebookGroupBy === 'student'
                          ? (() => {
                              // Group entries by nickname
                              const byStudent = {};
                              gradebookEntries.forEach(e => {
                                const key = (e.nickname || 'unknown').toLowerCase();
                                if (!byStudent[key]) byStudent[key] = { nickname: e.nickname, className: e.className, entries: [] };
                                byStudent[key].entries.push(e);
                              });
                              const students = Object.values(byStudent).sort((a, b) => (a.nickname || '').localeCompare(b.nickname || ''));
                              return students.map((s, i) => {
                                const avgs = s.entries.map(e => gradebookAvg(e)).filter(a => typeof a === 'number');
                                const avgOfAvgs = avgs.length > 0 ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
                                const sc = typeof avgOfAvgs === 'number' ? scoreColor(avgOfAvgs) : { bg: '#f1f5f9', color: '#475569' };
                                const lastGraded = s.entries
                                  .map(e => e.gradedAt)
                                  .filter(Boolean)
                                  .sort()
                                  .pop();
                                const studentKey = s.nickname + '|' + (s.className || '');
                                const isExpanded = expandedStudent === studentKey;
                                return /*#__PURE__*/React.createElement(React.Fragment, { key: i },
                                  /*#__PURE__*/React.createElement('tr', { style: { borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }, onClick: () => setExpandedStudent(isExpanded ? null : studentKey) },
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontWeight: 700, color: '#1e293b' } },
                                      /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', marginRight: 6, fontSize: '0.7rem', color: '#475569' } }, isExpanded ? '▾' : '▸'),
                                      s.nickname,
                                      s.className && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.72rem', color: '#475569', fontWeight: 400, marginLeft: 14 } }, s.className)
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', color: '#475569' } },
                                      s.entries.length + ' submission' + (s.entries.length === 1 ? '' : 's')
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px' } },
                                      avgOfAvgs !== null
                                        ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.78rem' } }, avgOfAvgs + '/100')
                                        : /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontSize: '0.8rem' } }, '—')
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontSize: '0.78rem', color: '#64748b' } },
                                      lastGraded ? new Date(lastGraded).toLocaleDateString() : '—'
                                    ),
                                    /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', textAlign: 'right', fontSize: '0.72rem', color: '#475569' } },
                                      isExpanded ? tr('click to collapse') : tr('click for detail')
                                    )
                                  ),
                                  isExpanded && s.entries.map((entry, j) => {
                                    const eAvg = gradebookAvg(entry);
                                    const eSc = typeof eAvg === 'number' ? scoreColor(eAvg) : { bg: '#f1f5f9', color: '#475569' };
                                    const respCount = Object.keys(entry.grades || {}).length;
                                    return /*#__PURE__*/React.createElement('tr', { key: 'e' + j, style: { borderBottom: '1px solid #f1f5f9', background: '#fafaf9' } },
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px 6px 36px', fontSize: '0.78rem', color: '#475569', fontWeight: 400 } }, '↳ entry ' + (j + 1)),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px', color: '#475569', fontSize: '0.82rem' } },
                                        entry.docTitle,
                                        /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.7rem', color: '#475569' } }, respCount + ' response' + (respCount === 1 ? '' : 's'))
                                      ),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px' } },
                                        eAvg !== null
                                          ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '1px 7px', borderRadius: 999, background: eSc.bg, color: eSc.color, fontWeight: 700, fontSize: '0.72rem' } }, eAvg + '/100')
                                          : /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontSize: '0.8rem' } }, '—')
                                      ),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px', fontSize: '0.72rem', color: '#64748b' } },
                                        entry.gradedAt ? new Date(entry.gradedAt).toLocaleDateString() : '—'
                                      ),
                                      /*#__PURE__*/React.createElement('td', { style: { padding: '6px 12px', textAlign: 'right' } },
                                        /*#__PURE__*/React.createElement('button', {
                                          type: 'button', onClick: (e) => { e.stopPropagation(); deleteGradebookEntry(entry.key); },
                                          title: tr('Remove from local gradebook'),
                                          style: { padding: '2px 8px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer' }
                                        }, '✗')
                                      )
                                    );
                                  })
                                );
                              });
                            })()
                          : gradebookEntries.map((entry, i) => {
                              const avg = gradebookAvg(entry);
                              const sc = typeof avg === 'number' ? scoreColor(avg) : { bg: '#f1f5f9', color: '#475569' };
                              const respCount = Object.keys(entry.grades || {}).length;
                              return /*#__PURE__*/React.createElement('tr', { key: i, style: { borderBottom: '1px solid #f1f5f9' } },
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontWeight: 700, color: '#1e293b' } },
                                  entry.nickname,
                                  entry.className && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.72rem', color: '#475569', fontWeight: 400 } }, entry.className)
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', color: '#475569' } },
                                  entry.docTitle,
                                  /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.72rem', color: '#475569' } }, respCount + ' response' + (respCount === 1 ? '' : 's'))
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px' } },
                                  avg !== null
                                    ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.78rem' } }, avg + '/100')
                                    : /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontSize: '0.8rem' } }, '—')
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', fontSize: '0.78rem', color: '#64748b' } },
                                  entry.gradedAt ? new Date(entry.gradedAt).toLocaleDateString() : '—'
                                ),
                                /*#__PURE__*/React.createElement('td', { style: { padding: '8px 12px', textAlign: 'right' } },
                                  /*#__PURE__*/React.createElement('button', {
                                    type: 'button', onClick: () => deleteGradebookEntry(entry.key),
                                    title: tr('Remove from local gradebook'),
                                    style: { padding: '4px 10px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.74rem', cursor: 'pointer' }
                                  }, '✗')
                                )
                              );
                            })
                      )
                    )
                  ),
                  /*#__PURE__*/React.createElement('div', { style: { marginTop: 8, fontSize: '0.78rem', color: '#166534' } },
                    tr('Saved locally in your browser. Export CSV to push to Sheets / your grade system. AlloFlow does not upload these grades anywhere.')
                  )
                )
          )
        ),

        // Calibration anchors panel — visible whenever the queue has decrypted rows
        (counts.decrypted || 0) > 0 && /*#__PURE__*/React.createElement('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: anchorsPanelOpen ? '12px 16px' : '8px 14px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              onClick: () => setAnchorsPanelOpen(!anchorsPanelOpen),
              style: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }
            },
              '📌 Calibration anchors (' + anchors.length + ')',
              /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.75rem', fontWeight: 600, color: '#b45309' } }, anchorsPanelOpen ? '▾' : '▸')
            ),
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.78rem', color: '#92400e' } },
              anchors.length === 0
                ? tr('Tap 📌 on any decrypted response to teach the AI your scoring direction.')
                : 'Each AI grading run will use these ' + anchors.length + ' anchor' + (anchors.length === 1 ? '' : 's') + ' as few-shot examples.'
            )
          ),
          anchorsPanelOpen && /*#__PURE__*/React.createElement('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #fde68a' } },
            anchors.length === 0
              ? /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#92400e', fontStyle: 'italic' } },
                  tr('No anchors yet. Anchors are individual student responses you score by hand; the AI uses them as calibration examples when grading every other response. 3-5 anchors that span the score range usually gives the best results.')
                )
              : /*#__PURE__*/React.createElement('div', null,
                  anchors.map((a, i) => /*#__PURE__*/React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'white', borderRadius: 6, marginBottom: 6, border: '1px solid #fde68a' } },
                    /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', minWidth: 48, padding: '2px 8px', borderRadius: 999, background: scoreColor(a.teacherScore).bg, color: scoreColor(a.teacherScore).color, fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', flexShrink: 0 } }, a.teacherScore + '/100'),
                    /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#1e293b' } }, String(a.studentResponse).slice(0, 180) + (a.studentResponse.length > 180 ? '…' : '')),
                      a.teacherFeedback && /*#__PURE__*/React.createElement('div', { style: { marginTop: 4, fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' } }, '"' + a.teacherFeedback + '"')
                    ),
                    /*#__PURE__*/React.createElement('button', {
                      type: 'button',
                      onClick: () => removeAnchor(i),
                      title: tr('Remove this anchor'),
                      style: { padding: '2px 8px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }
                    }, '✗')
                  )),
                  /*#__PURE__*/React.createElement('div', { style: { marginTop: 8, fontSize: '0.78rem', color: '#92400e' } },
                    /*#__PURE__*/React.createElement('button', {
                      type: 'button',
                      onClick: clearAnchors,
                      style: { padding: '4px 10px', background: 'transparent', color: '#92400e', border: '1px solid #fde68a', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginRight: 8 }
                    }, tr('Clear all')),
                    /*#__PURE__*/React.createElement('span', { style: { color: '#b45309' } },
                      tr('Tip: anchor responses spanning the full score range (e.g. one 95, one 70, one 40) for the most accurate AI calibration.')
                    )
                  )
                )
          )
        ),

        // Step 3: decrypt action
        privateJwk && queue.length > 0 && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('button', {
            type: 'button', onClick: handleDecryptAll, disabled: decryptingAll || (counts.pending || 0) === 0,
            style: {
              padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: '0.95rem',
              cursor: (decryptingAll || (counts.pending || 0) === 0) ? 'not-allowed' : 'pointer',
              opacity: (decryptingAll || (counts.pending || 0) === 0) ? 0.6 : 1
            }
          }, decryptingAll ? 'Decrypting…' : '🔓 Decrypt all ' + (counts.pending ? '(' + counts.pending + ')' : '')),
          /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.85rem', color: '#64748b' } },
            tr('Each submission is decrypted in your browser. Nothing leaves this device.')
          )
        ),

        // Queue table
        queue.length === 0
          ? /*#__PURE__*/React.createElement('div', { style: { padding: '40px 20px', textAlign: 'center', color: '#475569', fontSize: '0.95rem', border: '2px dashed #e2e8f0', borderRadius: 12 } },
              tr('No submissions loaded yet. Load your class key, then add files.')
            )
          : /*#__PURE__*/React.createElement('div', { style: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' } },
              /*#__PURE__*/React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' } },
                /*#__PURE__*/React.createElement('thead', null,
                  /*#__PURE__*/React.createElement('tr', { style: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' } },
                    /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, tr('Nickname')),
                    /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, tr('Document')),
                    /*#__PURE__*/React.createElement('th', { scope: 'col', style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, tr('Status')),
                    /*#__PURE__*/React.createElement('th', { scope: 'col', 'aria-label': tr('Actions'), style: { textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, '')
                  )
                ),
                /*#__PURE__*/React.createElement('tbody', null,
                  queue.map((row, idx) => /*#__PURE__*/React.createElement(React.Fragment, { key: idx },
                    /*#__PURE__*/React.createElement('tr', { style: { borderBottom: '1px solid #f1f5f9' } },
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px' } },
                        /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#1e293b' } }, row.nickname),
                        row.nickname !== '?' && rosterBadge(rosterMatch(row.nickname))
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px', color: '#475569' } },
                        /*#__PURE__*/React.createElement('div', null, row.docTitle || row.fileName),
                        row.timestamp && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.75rem', color: '#475569' } }, new Date(row.timestamp).toLocaleString())
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px' } },
                        statusBadge(row.status),
                        row.status === 'error' && /*#__PURE__*/React.createElement('div', { style: { marginTop: 4, fontSize: '0.75rem', color: '#991b1b' } }, row.error),
                        row.status === 'decrypted' && row.payload && (() => {
                          const prior = previousGradesFor(row.payload.nickname, row.payload.docTitle);
                          // Filter out matches whose timestamp is the same as this submission
                          // (that's just our own save, not a re-submit).
                          const others = prior.filter(p => p.submittedAt !== row.payload.timestamp);
                          if (others.length === 0) return null;
                          const lastDate = others.map(p => p.gradedAt).filter(Boolean).sort().pop();
                          return /*#__PURE__*/React.createElement('div', {
                            style: { marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 600 },
                            title: tr('This student already has ') + others.length + ' graded submission' + (others.length === 1 ? '' : 's') + ' for this document in the gradebook. Most recent: ' + (lastDate ? new Date(lastDate).toLocaleString() : 'unknown')
                          }, '🔁 Previously graded' + (others.length > 1 ? ' (' + others.length + 'x)' : '') + (lastDate ? ' ' + new Date(lastDate).toLocaleDateString() : ''));
                        })()
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px', textAlign: 'right' } },
                        row.status === 'decrypted' && /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => setExpandedRow(expandedRow === idx ? null : idx),
                          style: { marginRight: 6, padding: '4px 10px', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }
                        }, expandedRow === idx ? 'Hide' : 'View'),
                        /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => removeRow(idx),
                          style: { padding: '4px 10px', background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }
                        }, tr('Remove'))
                      )
                    ),
                    expandedRow === idx && row.payload && /*#__PURE__*/React.createElement('tr', null,
                      /*#__PURE__*/React.createElement('td', { colSpan: 4, style: { padding: 0 } },
                        /*#__PURE__*/React.createElement('div', { style: { background: '#fafafa', padding: '12px 16px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' } },
                          /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                            'Decrypted responses (' + Object.keys(row.payload.responses || {}).length + ')'
                          ),
                          Object.keys(row.payload.responses || {}).length === 0
                            ? /*#__PURE__*/React.createElement('div', { style: { fontStyle: 'italic', color: '#475569', fontSize: '0.85rem' } }, tr('No responses captured.'))
                            : Object.entries(row.payload.responses).map(([k, v], i) => {
                                const g = (grades[idx] || {})[k];
                                const sc = g ? scoreColor(g.score) : null;
                                const isAnchored = isResponseAnchored(idx, k);
                                const anchorScore = getAnchorScore(idx, k);
                                return /*#__PURE__*/React.createElement('div', { key: i, style: { marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: isAnchored ? '#fef3c7' : (g ? 'white' : 'transparent'), border: isAnchored ? '1.5px solid #f59e0b' : (g ? '1px solid #e2e8f0' : 'none') } },
                                  /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', marginBottom: g || isAnchored ? 4 : 0 } },
                                    /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                                      /*#__PURE__*/React.createElement('code', { style: { fontSize: '0.72rem', color: '#475569', marginRight: 6 } }, k.length > 40 ? k.slice(0, 40) + '…' : k),
                                      /*#__PURE__*/React.createElement('span', { style: { color: '#1e293b' } }, String(v).slice(0, 300))
                                    ),
                                    String(v).trim() && (
                                      isAnchored
                                        ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#fde68a', color: '#92400e', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 } },
                                            '📌 Anchor ' + anchorScore + '/100'
                                          )
                                        : /*#__PURE__*/React.createElement('button', {
                                            type: 'button',
                                            onClick: () => openAnchorForm(idx, k, String(v)),
                                            title: tr('Mark this response as a calibration anchor. The AI will use it as an example to match your scoring.'),
                                            style: { padding: '2px 8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }
                                          }, tr('📌 Anchor'))
                                    )
                                  ),
                                  g && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.78rem' } },
                                    /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700 } }, (typeof g.score === 'number' ? g.score : '–') + '/100'),
                                    /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontStyle: 'italic' } }, g.feedback || '')
                                  )
                                );
                              }),
                          // Work evidence — what the student actually did, beyond what they typed.
                          (function () {
                            const ev = siWorkEvidence(row.payload);
                            if (ev.isEmpty) return null;
                            const shownActivities = ev.activities.slice(0, 12);
                            const moreActivities = ev.activities.length - shownActivities.length;
                            const chip = { display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'white', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#1e293b' };
                            const dim = { color: '#64748b', fontSize: '0.68rem' };
                            const subheading = { fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 };
                            const statBits = [];
                            if (ev.totalXP !== null) statBits.push(tr('{n} XP', { n: ev.totalXP }));
                            if (ev.quizzesTaken) statBits.push(tr('{n} quizzes taken', { n: ev.quizzesTaken }));
                            if (ev.notebookEntries) statBits.push(tr('{n} notebook entries', { n: ev.notebookEntries }));
                            return /*#__PURE__*/React.createElement('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' } },
                              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                                tr('🧾 Work in this submission')
                              ),
                              ev.activities.length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Activities included ({n})', { n: ev.activities.length })),
                                /*#__PURE__*/React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                                  shownActivities.map(function (activity, i) {
                                    return /*#__PURE__*/React.createElement('span', { key: 'act-' + i, style: chip },
                                      /*#__PURE__*/React.createElement('span', null, activity.title),
                                      /*#__PURE__*/React.createElement('span', { style: dim }, activity.type)
                                    );
                                  }),
                                  moreActivities > 0 && /*#__PURE__*/React.createElement('span', { key: 'act-more', style: Object.assign({}, chip, { color: '#64748b' }) }, tr('+{n} more', { n: moreActivities }))
                                )
                              ),
                              ev.games.length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginBottom: 8 } },
                                /*#__PURE__*/React.createElement('div', { style: subheading }, tr('Practice games completed')),
                                /*#__PURE__*/React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                                  ev.games.map(function (game, i) {
                                    return /*#__PURE__*/React.createElement('span', { key: 'game-' + i, style: chip },
                                      /*#__PURE__*/React.createElement('span', null, game.gameType),
                                      /*#__PURE__*/React.createElement('span', { style: dim }, '×' + game.plays)
                                    );
                                  })
                                )
                              ),
                              statBits.length > 0 && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.78rem', color: '#475569' } }, statBits.join(' · ')),
                              // Deliberately phrased as a prompt for conversation. The device counts
                              // pastes into writable answer fields; a pasted citation and a pasted
                              // answer are indistinguishable from here, so this must not read as a finding.
                              ev.pastesIntoAnswers ? /*#__PURE__*/React.createElement('div', { style: { marginTop: 6, fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px' } },
                                ev.pastesIntoAnswers === 1
                                  ? tr('1 paste landed in an answer field. Worth asking about, not a conclusion.')
                                  : tr('{n} pastes landed in answer fields. Worth asking about, not a conclusion.', { n: ev.pastesIntoAnswers })
                              ) : null
                            );
                          })(),
                          // Rubric / Grade-with-AI section
                          Object.keys(row.payload.responses || {}).length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' } },
                            /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                              tr('🎯 AI Grade with rubric')
                            ),
                            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } },
                              tr('Rubric (what full credit looks like)'),
                              (globalRubric.rubric || '').trim() && !((rubrics[idx] && rubrics[idx].rubric) || '').trim()
                                ? /*#__PURE__*/React.createElement('span', { style: { fontWeight: 400, color: '#475569', marginLeft: 6, fontSize: '0.72rem' } }, tr('— using class rubric above (override here for this submission only)'))
                                : null
                            ),
                            /*#__PURE__*/React.createElement('textarea', {
                              'aria-label': tr('Rubric for this submission'),
                              value: (rubrics[idx] && rubrics[idx].rubric) || '',
                              onChange: e => updateRubric(idx, { rubric: e.target.value }),
                              placeholder: (globalRubric.rubric || '').trim() ? globalRubric.rubric : tr('e.g., "Explains the main idea in their own words, cites at least one detail from the text, uses complete sentences."'),
                              rows: 3,
                              style: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } }, tr('Assignment context (optional)')),
                            /*#__PURE__*/React.createElement('input', {
                              type: 'text', 'aria-label': tr('Assignment context for this submission'),
                              value: (rubrics[idx] && rubrics[idx].context) || '',
                              onChange: e => updateRubric(idx, { context: e.target.value }),
                              placeholder: tr('e.g., "Reading response to chapter 3"'),
                              style: { width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } },
                              tr('Quick exemplar (optional) '),
                              /*#__PURE__*/React.createElement('span', { style: { fontWeight: 400, color: '#475569', fontSize: '0.75rem' } },
                                anchors.length > 0
                                  ? '— ' + anchors.length + ' calibration anchor' + (anchors.length === 1 ? '' : 's') + ' active (📌 panel above). Anchors apply across all submissions; this exemplar adds one more locally.'
                                  : tr('— or tap 📌 on a real student response above to anchor it (multi-anchor calibration).')
                              )
                            ),
                            /*#__PURE__*/React.createElement('textarea', {
                              'aria-label': tr('Quick exemplar for this submission'),
                              value: (rubrics[idx] && rubrics[idx].exemplar) || '',
                              onChange: e => updateRubric(idx, { exemplar: e.target.value }),
                              placeholder: tr('Paste an example of a 95/100 response so the AI matches your scoring.'),
                              rows: 2,
                              style: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                              /*#__PURE__*/React.createElement('button', {
                                type: 'button',
                                onClick: () => gradeRow(idx),
                                disabled: gradingRow === idx,
                                style: { padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: gradingRow === idx ? 'wait' : 'pointer', opacity: gradingRow === idx ? 0.6 : 1 }
                              }, gradingRow === idx ? 'Grading…' : tr('🎯 Grade responses')),
                              Object.keys(grades[idx] || {}).length > 0 && /*#__PURE__*/React.createElement('button', {
                                type: 'button',
                                onClick: () => saveRowToGradebook(idx),
                                style: { padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
                              }, tr('💾 Save to gradebook')),
                              Object.keys(grades[idx] || {}).length > 0 && /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.78rem', color: '#64748b' } },
                                'Avg: ' + Math.round(Object.values(grades[idx]).reduce((s, g) => s + (g.score || 0), 0) / Object.values(grades[idx]).length) + '/100'
                              )
                            )
                          )
                        )
                      )
                    )
                  ))
                )
              )
            )
      ),

      // Footer
      /*#__PURE__*/React.createElement('div', { style: { padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
        /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.8rem', color: '#64748b' } },
          (counts.decrypted || 0) > 0
            ? tr('Click "View" on a row to grade it with an AI rubric and save the result to your local gradebook.')
            : tr('Decrypt the queue to see student responses.')
        ),
        /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8 } },
          /*#__PURE__*/React.createElement('button', {
            type: 'button', onClick: onClose,
            style: { padding: '8px 18px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }
          }, tr('Close'))
        )
      ),

      // Pending anchor inline form (nested overlay)
      pendingAnchor && /*#__PURE__*/React.createElement('div', {
        role: 'presentation',
        style: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10 }
      },
        /*#__PURE__*/React.createElement('div', { ref: anchorDialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'anchor-dialog-title', 'aria-describedby': 'anchor-dialog-description', tabIndex: -1, onKeyDown: event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); cancelPendingAnchor(); return; } containDialogFocus(event, anchorDialogRef.current); }, style: { background: 'white', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', maxWidth: 540, width: '100%', padding: '20px 24px', border: '2px solid #fde68a' } },
          /*#__PURE__*/React.createElement('h3', { id: 'anchor-dialog-title', style: { margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: '#92400e' } }, tr('📌 Anchor this response')),
          /*#__PURE__*/React.createElement('p', { id: 'anchor-dialog-description', style: { margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' } },
            tr('Give this response a score. The AI will use it as a calibration example when grading every other response.')
          ),
          /*#__PURE__*/React.createElement('div', { style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: '0.85rem', color: '#1e293b', maxHeight: 120, overflowY: 'auto' } },
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 700, marginBottom: 4 } }, tr('Student response')),
            pendingAnchor.responseText
          ),
          /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 } }, tr('Score (0-100)')),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
            /*#__PURE__*/React.createElement('input', {
              type: 'range', min: 0, max: 100, step: 5, 'aria-label': tr('Anchor score slider'),
              value: pendingAnchor.score,
              onChange: e => setPendingAnchor({ ...pendingAnchor, score: e.target.value }),
              style: { flex: 1 }
            }),
            /*#__PURE__*/React.createElement('input', {
              type: 'number', min: 0, max: 100, 'aria-label': tr('Anchor score'),
              value: pendingAnchor.score,
              onChange: e => setPendingAnchor({ ...pendingAnchor, score: e.target.value }),
              style: { width: 70, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', textAlign: 'center' }
            })
          ),
          /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 } }, tr('Note (optional — tells the AI why this got that score)')),
          /*#__PURE__*/React.createElement('textarea', {
            'aria-label': tr('Anchor note'),
            value: pendingAnchor.feedback,
            onChange: e => setPendingAnchor({ ...pendingAnchor, feedback: e.target.value }),
            placeholder: tr('e.g., "Clear evidence + reasoning, but missed the counter-argument."'),
            rows: 2,
            style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 16 }
          }),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
            /*#__PURE__*/React.createElement('button', {
              ref: anchorCancelRef, type: 'button', onClick: cancelPendingAnchor,
              style: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }
            }, tr('Cancel')),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: confirmPendingAnchor,
              style: { padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }
            }, tr('📌 Add anchor'))
          )
        )
      ),
      confirmation && /*#__PURE__*/React.createElement('div', {
        role: 'presentation',
        style: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 }
      },
        /*#__PURE__*/React.createElement('div', {
          ref: confirmationDialogRef,
          role: 'alertdialog', 'aria-modal': 'true',
          'aria-labelledby': 'submission-confirm-title', 'aria-describedby': 'submission-confirm-message',
          tabIndex: -1,
          onKeyDown: event => {
            event.stopPropagation();
            if (event.key === 'Escape') { event.preventDefault(); finishConfirmation(false); return; }
            containDialogFocus(event, confirmationDialogRef.current);
          },
          style: { background: 'white', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', maxWidth: 480, width: '100%', padding: '22px 24px', border: '2px solid #fecaca' }
        },
          /*#__PURE__*/React.createElement('h3', { id: 'submission-confirm-title', style: { margin: '0 0 8px', color: '#991b1b', fontSize: '1.05rem' } }, confirmation.title),
          /*#__PURE__*/React.createElement('p', { id: 'submission-confirm-message', style: { margin: '0 0 18px', color: '#334155', lineHeight: 1.5 } }, confirmation.message),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              ref: confirmationCancelRef, type: 'button', onClick: () => finishConfirmation(false),
              style: { padding: '8px 14px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
            }, confirmation.cancelLabel || tr('Cancel')),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: () => finishConfirmation(true),
              style: { padding: '8px 14px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
            }, confirmation.confirmLabel || tr('Confirm'))
          )
        )
      )
    )
  ),
  showAlloSheetReview && renderAlloSheetReview()
);
}