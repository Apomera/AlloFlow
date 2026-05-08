/**
 * AlloFlow Quiz Live Aggregators
 *
 * Plan T Slice Tb: pure aggregation functions that read from
 * `quizState.allResponses` (the new field populated in Slice Ta) plus the
 * quiz item shape, and emit mode-specific aggregations for the teacher
 * dashboard. Three live aggregators + one stub:
 *
 *   gradebook        → exit-ticket: per-student score table
 *   preLessonGap     → pre-check: which prereqs the class is missing
 *   liveHeatmap      → formative: real-time per-question correct %
 *   retentionCurve   → review (v3): cross-session retention; falls back to liveHeatmap for v2
 *
 * Plus a shared per-item-type grader that infers correctness from the
 * student's submitted response payload. For freeform types where the
 * student didn't compute a status locally (text-only responses), the
 * grader does cheap fuzzy match for fill-blank or marks 'submitted' for
 * short-answer/self-explanation (those need teacher judgment).
 *
 * Module export: window.AlloModules.QuizLiveAggregators
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.QuizLiveAggregators) {
    console.log('[CDN] QuizLiveAggregators already loaded, skipping');
    return;
  }

  // ─── Helper: resolve correct option index for an MCQ ──────────────────
  // Mirrors the export pipeline's _resolveCorrectIdx (doc_pipeline:13235).
  function resolveCorrectIdx(q) {
    if (!q || !Array.isArray(q.options)) return -1;
    var ca = q.correctAnswer;
    if (typeof ca === 'number' && ca >= 0 && ca < q.options.length) return ca;
    if (typeof ca === 'string') {
      var trimmed = ca.trim();
      if (/^[A-Za-z]$/.test(trimmed)) {
        var letterIdx = trimmed.toUpperCase().charCodeAt(0) - 65;
        if (letterIdx >= 0 && letterIdx < q.options.length) return letterIdx;
      }
      if (/^\d+$/.test(trimmed)) {
        var numIdx = parseInt(trimmed, 10);
        if (numIdx >= 0 && numIdx < q.options.length) return numIdx;
      }
      var norm = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
      var target = norm(trimmed);
      var found = q.options.findIndex(function (opt) { return norm(opt) === target; });
      if (found !== -1) return found;
    }
    return -1;
  }

  // ─── Per-item grader: infers correctness from student's submitted answer ──
  // Returns { status, ... extra fields per type }.
  // status ∈ { 'correct' | 'incorrect' | 'partially-correct' | 'idk' | 'submitted' | 'no-response' }
  function gradeResponseForItem(response, question) {
    if (!response || !response.answer) return { status: 'no-response' };
    if (response.answer.idk === true) return { status: 'idk' };
    var itemType = response.itemType || (question && question.type) || 'mcq';

    if (itemType === 'mcq') {
      // Slice Ta currently captures MCQ via IDK only; future captures may
      // include optionIdx. Handle both.
      if (typeof response.answer.optionIdx === 'number' && question) {
        var correctIdx = resolveCorrectIdx(question);
        if (correctIdx === -1) return { status: 'submitted' };
        return { status: response.answer.optionIdx === correctIdx ? 'correct' : 'incorrect' };
      }
      return { status: 'submitted' };
    }

    if (itemType === 'fill-blank' && question) {
      var text = String(response.answer.text || '').trim().toLowerCase();
      if (!text) return { status: 'no-response' };
      var targets = [question.expectedFill || ''].concat(Array.isArray(question.acceptableAlternatives) ? question.acceptableAlternatives : []);
      var targetsNorm = targets.map(function (t) { return String(t).trim().toLowerCase(); }).filter(Boolean);
      return { status: targetsNorm.indexOf(text) !== -1 ? 'correct' : 'incorrect', rawText: response.answer.text };
    }

    if (itemType === 'short-answer' || itemType === 'self-explanation') {
      // Teacher uses judgment — we just surface the raw text
      return { status: 'submitted', rawText: response.answer.text || '' };
    }

    if (itemType === 'sequence-sense' || itemType === 'relation-mismatch') {
      // Student's local component already computed deterministic status
      return {
        status: response.answer.status || 'submitted',
        score: response.answer.score,
      };
    }

    return { status: 'submitted' };
  }

  // ─── Helper: walk all responses and pair with their question ──────────
  // Returns: [{ uid, questionIdx, response, question, grade }]
  function collectAllGradedResponses(allResponses, questions) {
    var out = [];
    if (!allResponses || typeof allResponses !== 'object') return out;
    if (!Array.isArray(questions)) return out;
    Object.keys(allResponses).forEach(function (uid) {
      var perStudent = allResponses[uid];
      if (!perStudent || typeof perStudent !== 'object') return;
      Object.keys(perStudent).forEach(function (qIdxKey) {
        var qIdx = parseInt(qIdxKey, 10);
        if (isNaN(qIdx) || qIdx < 0 || qIdx >= questions.length) return;
        var response = perStudent[qIdxKey];
        var question = questions[qIdx];
        var grade = gradeResponseForItem(response, question);
        out.push({ uid: uid, questionIdx: qIdx, response: response, question: question, grade: grade });
      });
    });
    return out;
  }

  // ─── Aggregator: gradebook (exit-ticket) ──────────────────────────────
  // Per-student row: { uid, displayName, totalAnswered, totalCorrect, byQuestion }
  function aggregateGradebook(quizState, generatedContent, roster) {
    var allResponses = (quizState && quizState.allResponses) || {};
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var graded = collectAllGradedResponses(allResponses, questions);
    var rosterObj = roster && typeof roster === 'object' ? roster : {};
    // Build per-student aggregation
    var studentMap = {};
    graded.forEach(function (g) {
      if (!studentMap[g.uid]) {
        var rEntry = rosterObj[g.uid] || {};
        studentMap[g.uid] = {
          uid: g.uid,
          displayName: rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + g.uid.slice(0, 4)),
          totalAnswered: 0,
          totalCorrect: 0,
          totalIdk: 0,
          byQuestion: new Array(questions.length).fill(null),
        };
      }
      var row = studentMap[g.uid];
      row.totalAnswered++;
      if (g.grade.status === 'correct') row.totalCorrect++;
      if (g.grade.status === 'idk') row.totalIdk++;
      row.byQuestion[g.questionIdx] = g.grade;
    });
    // Include roster students who haven't responded yet
    Object.keys(rosterObj).forEach(function (uid) {
      if (!studentMap[uid]) {
        var rEntry = rosterObj[uid] || {};
        studentMap[uid] = {
          uid: uid,
          displayName: rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + uid.slice(0, 4)),
          totalAnswered: 0,
          totalCorrect: 0,
          totalIdk: 0,
          byQuestion: new Array(questions.length).fill(null),
        };
      }
    });
    var studentRows = Object.values(studentMap).sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
    return {
      studentRows: studentRows,
      totalQuestions: questions.length,
      totalStudents: studentRows.length,
    };
  }

  // ─── Aggregator: pre-lesson dashboard (pre-check) ─────────────────────
  // Per-question card: { questionIdx, questionText, totalAnswered, correctCount,
  //   percentCorrect, idkCount, conceptText (best-effort label) }
  function aggregatePreLessonGap(quizState, generatedContent, roster) {
    var allResponses = (quizState && quizState.allResponses) || {};
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var graded = collectAllGradedResponses(allResponses, questions);
    var rosterCount = roster ? Object.keys(roster).length : 0;
    var perQuestion = questions.map(function (q, idx) {
      // Best-effort concept label: first 80 chars of question text or expectedFill
      var conceptText = q.question || q.expectedFill || ('Question ' + (idx + 1));
      if (conceptText.length > 80) conceptText = conceptText.slice(0, 77) + '...';
      return {
        questionIdx: idx,
        questionText: q.question || '',
        conceptText: conceptText,
        itemType: q.type || 'mcq',
        totalAnswered: 0,
        correctCount: 0,
        incorrectCount: 0,
        idkCount: 0,
        percentCorrect: 0,
      };
    });
    graded.forEach(function (g) {
      var card = perQuestion[g.questionIdx];
      if (!card) return;
      card.totalAnswered++;
      if (g.grade.status === 'correct') card.correctCount++;
      else if (g.grade.status === 'incorrect') card.incorrectCount++;
      else if (g.grade.status === 'idk') card.idkCount++;
    });
    perQuestion.forEach(function (card) {
      if (card.totalAnswered > 0) {
        card.percentCorrect = Math.round((card.correctCount / card.totalAnswered) * 100);
      }
    });
    // Sort by lowest percentCorrect first (most urgent gaps surface)
    var sorted = perQuestion.slice().sort(function (a, b) {
      // Unanswered last
      if (a.totalAnswered === 0 && b.totalAnswered > 0) return 1;
      if (b.totalAnswered === 0 && a.totalAnswered > 0) return -1;
      return a.percentCorrect - b.percentCorrect;
    });
    return {
      conceptCards: sorted,
      totalQuestions: questions.length,
      totalStudents: rosterCount,
    };
  }

  // ─── Aggregator: live heatmap (formative; review fallback) ────────────
  // Per-question bar: { questionIdx, questionText, correct, incorrect, idk, total, percentCorrect }
  function aggregateLiveHeatmap(quizState, generatedContent, roster) {
    var allResponses = (quizState && quizState.allResponses) || {};
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var graded = collectAllGradedResponses(allResponses, questions);
    var rosterCount = roster ? Object.keys(roster).length : 0;
    var bars = questions.map(function (q, idx) {
      return {
        questionIdx: idx,
        questionText: q.question || '',
        itemType: q.type || 'mcq',
        correct: 0,
        incorrect: 0,
        idk: 0,
        submitted: 0,
        total: 0,
        percentCorrect: 0,
      };
    });
    graded.forEach(function (g) {
      var bar = bars[g.questionIdx];
      if (!bar) return;
      bar.total++;
      if (g.grade.status === 'correct') bar.correct++;
      else if (g.grade.status === 'incorrect') bar.incorrect++;
      else if (g.grade.status === 'idk') bar.idk++;
      else bar.submitted++;
    });
    bars.forEach(function (bar) {
      if (bar.total > 0) {
        bar.percentCorrect = Math.round((bar.correct / bar.total) * 100);
      }
    });
    return {
      bars: bars,
      totalQuestions: questions.length,
      totalStudents: rosterCount,
    };
  }

  // ─── Aggregator: retention curve (review v3 — real implementation) ────
  // Reads cross-session concept mastery (pre-fetched by the dashboard from
  // artifacts/{appId}/public/data/conceptMastery/{uid}). For each concept
  // probed in the current review quiz, surfaces per-student retention info:
  // days-since-last-attempt, recent attempt statuses, success rate.
  //
  // Falls back to live-heatmap shape if conceptMasteryByUid is missing or
  // empty (e.g., dashboard hasn't fetched yet, or this is the very first
  // session capturing concept data).
  function aggregateRetentionCurve(quizState, generatedContent, roster, conceptMasteryByUid) {
    if (!conceptMasteryByUid || typeof conceptMasteryByUid !== 'object' || Object.keys(conceptMasteryByUid).length === 0) {
      // No mastery data yet — return live-heatmap shape so dashboard renders
      // something useful instead of empty state. Dashboard recognizes this
      // via aggResult.variant.
      return aggregateLiveHeatmap(quizState, generatedContent, roster);
    }
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var rosterObj = roster && typeof roster === 'object' ? roster : {};
    var nowMs = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;

    // For each question with a conceptLabel, build a row
    var conceptRows = [];
    var seenConcepts = {};
    questions.forEach(function (q, idx) {
      var label = (q && q.conceptLabel) || '';
      if (!label) return;
      var conceptId = label.trim().toLowerCase();
      if (!conceptId || seenConcepts[conceptId]) return; // dedupe per concept
      seenConcepts[conceptId] = true;

      // Per-student mastery lookup
      var students = [];
      Object.keys(rosterObj).forEach(function (uid) {
        var rEntry = rosterObj[uid] || {};
        var displayName = rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + uid.slice(0, 4));
        var mastery = conceptMasteryByUid[uid] && conceptMasteryByUid[uid].attempts && conceptMasteryByUid[uid].attempts[conceptId];
        if (!mastery) {
          students.push({
            uid: uid,
            displayName: displayName,
            seen: false,
            daysSinceLast: null,
            recent: [],
            totalAttempts: 0,
            correctAttempts: 0,
            successRate: null,
          });
          return;
        }
        var lastTs = mastery.lastAttemptTs || 0;
        var days = lastTs > 0 ? Math.round((nowMs - lastTs) / DAY_MS) : null;
        var total = mastery.totalAttempts || 0;
        var correct = mastery.correctAttempts || 0;
        var rate = total > 0 ? Math.round((correct / total) * 100) : null;
        students.push({
          uid: uid,
          displayName: displayName,
          seen: true,
          daysSinceLast: days,
          recent: Array.isArray(mastery.recent) ? mastery.recent.slice(-10) : [],
          totalAttempts: total,
          correctAttempts: correct,
          successRate: rate,
          lastResult: mastery.lastResult || null,
        });
      });

      // Compute concept-level priority: max daysSinceLast (oldest forgotten = most urgent)
      // Concepts where some students have never seen = also urgent (high priority)
      var maxDays = 0;
      var unseenCount = 0;
      students.forEach(function (s) {
        if (!s.seen) unseenCount++;
        else if (typeof s.daysSinceLast === 'number' && s.daysSinceLast > maxDays) maxDays = s.daysSinceLast;
      });

      conceptRows.push({
        conceptId: conceptId,
        label: label,
        questionIdx: idx,
        questionText: q.question || '',
        students: students,
        maxDaysSinceLast: maxDays,
        unseenCount: unseenCount,
        priority: unseenCount * 100 + maxDays, // unseen weights heavier than days
      });
    });

    // Sort by priority desc (most urgent first)
    conceptRows.sort(function (a, b) { return b.priority - a.priority; });

    return {
      conceptRows: conceptRows,
      totalConcepts: conceptRows.length,
      totalStudents: Object.keys(rosterObj).length,
      hasCrossSessionData: true,
    };
  }

  // ─── Mode → aggregator router ─────────────────────────────────────────
  // For review mode, requires conceptMasteryByUid argument; falls back to
  // liveHeatmap if not provided.
  function aggregateForMode(mode, quizState, generatedContent, roster, conceptMasteryByUid) {
    if (mode === 'pre-check') return { variant: 'preLessonGap', data: aggregatePreLessonGap(quizState, generatedContent, roster) };
    if (mode === 'formative') return { variant: 'liveHeatmap', data: aggregateLiveHeatmap(quizState, generatedContent, roster) };
    if (mode === 'review') {
      var retData = aggregateRetentionCurve(quizState, generatedContent, roster, conceptMasteryByUid);
      // If retention data has cross-session info, render as retentionCurve;
      // otherwise it returned heatmap shape, render as liveHeatmap.
      var variant = retData.hasCrossSessionData ? 'retentionCurve' : 'liveHeatmap';
      return { variant: variant, data: retData };
    }
    // exit-ticket default
    return { variant: 'gradebook', data: aggregateGradebook(quizState, generatedContent, roster) };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizLiveAggregators = {
    aggregateGradebook: aggregateGradebook,
    aggregatePreLessonGap: aggregatePreLessonGap,
    aggregateLiveHeatmap: aggregateLiveHeatmap,
    aggregateRetentionCurve: aggregateRetentionCurve,
    aggregateForMode: aggregateForMode,
    gradeResponseForItem: gradeResponseForItem,
  };
  console.log('[CDN] QuizLiveAggregators loaded');
})();
