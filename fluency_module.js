/**
 * AlloFlow — Fluency Module
 *
 * Phonics fluency assessment subsystem. Four pure functions extracted from
 * AlloFlowANTI.txt as part of the ongoing CDN modularization:
 *
 *   - calculateLocalFluencyMetrics(wordData, durationSeconds, totalRefWordCount)
 *       Pure math: WCPM + accuracy from word-status data.
 *   - calculateRunningRecordMetrics(wordData, insertionsArr)
 *       Pure math: substitutions/omissions/insertions/SC/totalErrors/errorRate
 *       /scRate/readingLevel. Reading level: independent (>=95% acc),
 *       instructional (>=90%), frustrational (<90%).
 *   - getBenchmarkComparison(wcpm, grade, season, customNorms)
 *       Pure lookup: classifies WCPM against grade/season norms (or custom)
 *       into above/at/approaching/well_below.
 *   - analyzeFluencyWithGemini(audioBase64, mimeType, referenceText)
 *       Async: orchestrates Gemini word-by-word audio analysis with bias-aware
 *       prompt (AAE / child / accent / dialect protections per Koenecke 2020,
 *       Wu 2020, Tatman 2017).
 *
 * Pure: no React state, no closure capture. External deps reached via window:
 *   - window.GEMINI_MODELS.default (set at AlloFlowANTI.txt:792)
 *   - window.apiKey (set at AlloFlowANTI.txt:790)
 *   - window.warnLog (set at AlloFlowANTI.txt:2128)
 *   - window.AlloModules.AlloData.FLUENCY_BENCHMARKS (set by allo_data_module
 *     after CDN load; falls back to {} returning level:'unknown' if AlloData
 *     hasn't loaded yet — graceful, no crash)
 *
 * Loaded by AlloFlowANTI.txt via loadModule('Fluency', ...). The monolith
 * declares no-op shims at top of file and swaps them via _upgradeFluency()
 * on module load. Same pattern as firestore_sync_module.js (f7de373) +
 * safety_checker_module.js (80e0039) + processGrounding-via-TextPipelineHelpers
 * (d78bfb7).
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.Fluency) {
    console.log('[CDN] FluencyModule already loaded, skipping');
    return;
  }

  function calculateLocalFluencyMetrics(wordData, durationSeconds, totalReferenceWordCount, insertionsArr) {
      if (!wordData || wordData.length === 0) return { accuracy: 0, wcpm: 0, correctWords: 0 };
      // A self-correction counts as correct in a running record. Insertions are
      // errors, so subtract them from words-correct rather than allowing an
      // inserted word to leave WCPM/accuracy unchanged.
      var correctCount = wordData.filter(function (w) {
          return w.status === 'correct' || w.status === 'stumbled' || w.status === 'self_corrected';
      }).length;
      var insertionCount = Array.isArray(insertionsArr) ? insertionsArr.length : 0;
      var adjustedCorrectCount = Math.max(0, correctCount - insertionCount);
      var denominator = (totalReferenceWordCount && totalReferenceWordCount > 0)
          ? totalReferenceWordCount
          : wordData.length;
      if (totalReferenceWordCount > 0 && wordData.length > 0) {
          var ratio = wordData.length / totalReferenceWordCount;
          if (ratio < 0.8 || ratio > 1.2) {
              console.warn('[Fluency] Word count mismatch: Gemini returned ' + wordData.length + ' words vs ' + totalReferenceWordCount + ' reference words (ratio: ' + ratio.toFixed(2) + '). Using Gemini count.');
              denominator = wordData.length;
          }
      }
      var accuracy = Math.min(100, denominator > 0 ? Math.round((adjustedCorrectCount / denominator) * 100) : 0);
      var validDuration = Math.max(1, durationSeconds);
      var minutes = validDuration / 60;
      var wcpm = Math.round(adjustedCorrectCount / minutes);
      return { accuracy: accuracy, wcpm: wcpm, correctWords: adjustedCorrectCount };
  }

  function calculateRunningRecordMetrics(wordData, insertionsArr) {
      if (!wordData || wordData.length === 0) return {
          substitutions: 0, omissions: 0, insertions: 0,
          selfCorrections: 0, totalErrors: 0, errorRate: '0',
          scRate: '0', readingLevel: 'frustrational', accuracy: 0, accuracyPct: 0
      };
      var substitutions = wordData.filter(function (w) { return w.status === 'mispronounced'; }).length;
      var omissions = wordData.filter(function (w) { return w.status === 'missed'; }).length;
      var insertions = (insertionsArr && Array.isArray(insertionsArr)) ? insertionsArr.length : 0;
      var selfCorrections = wordData.filter(function (w) { return w.status === 'self_corrected'; }).length;
      var totalErrors = substitutions + omissions + insertions;
      var totalWords = wordData.length;
      var errorRate = totalErrors > 0 ? (totalWords / totalErrors).toFixed(1) : '∞';
      var scTotal = selfCorrections + totalErrors;
      var scRate = scTotal > 0 ? (selfCorrections / scTotal * 100).toFixed(0) : '0';
      var correctAndSC = Math.max(0, totalWords - substitutions - omissions - insertions);
      var accuracyPct = totalWords > 0 ? (correctAndSC / totalWords) * 100 : 0;
      var readingLevel = 'frustrational';
      if (accuracyPct >= 95) readingLevel = 'independent';
      else if (accuracyPct >= 90) readingLevel = 'instructional';
      return {
          substitutions: substitutions, omissions: omissions, insertions: insertions,
          selfCorrections: selfCorrections, totalErrors: totalErrors, errorRate: errorRate,
          scRate: scRate, readingLevel: readingLevel,
          accuracy: Math.round(accuracyPct), accuracyPct: Math.round(accuracyPct)
      };
  }

  var _FLUENCY_STATUSES = {
    correct: true,
    missed: true,
    stumbled: true,
    self_corrected: true,
    mispronounced: true
  };

  function _cloneFluencyWords(words) {
    return (Array.isArray(words) ? words : []).map(function (word) {
      var status = word && _FLUENCY_STATUSES[word.status] ? word.status : 'correct';
      return Object.assign({}, word || {}, {
        word: String((word && word.word) || ''),
        status: status,
        said: word && word.said ? String(word.said) : undefined,
        lowConfidence: !!(word && word.lowConfidence),
        triangulation: word && word.triangulation ? String(word.triangulation) : undefined
      });
    });
  }

  function _cloneInsertions(insertions) {
    return (Array.isArray(insertions) ? insertions : [])
      .map(function (word) { return String(word || '').trim(); })
      .filter(function (word) { return word.length > 0; });
  }

  function _fluencySnapshot(result) {
    result = result || {};
    return {
      wordData: _cloneFluencyWords(result.wordData),
      insertions: _cloneInsertions(result.insertions),
      accuracy: Number(result.accuracy) || 0,
      wcpm: Number(result.wcpm) || 0,
      timestamp: result.timestamp || null
    };
  }

  function _passageHash(text) {
    var input = String(text || '').trim().replace(/\s+/g, ' ');
    var hash = 2166136261;
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  // Records what was actually read. Generated/arbitrary passages are marked
  // uncalibrated by default so their WCPM values are never silently treated as
  // interchangeable screening forms.
  function createFluencyPassageMetadata(referenceText, options) {
    options = options || {};
    var wordCount = _tokenizeReference(referenceText).length;
    return {
      passageId: String(options.passageId || ('passage-' + _passageHash(referenceText))),
      sourceResourceId: options.sourceResourceId ? String(options.sourceResourceId) : null,
      title: options.title ? String(options.title) : null,
      grade: options.grade ? String(options.grade) : null,
      language: options.language ? String(options.language) : null,
      wordCount: wordCount,
      calibrated: options.calibrated === true,
      passageSetId: options.passageSetId ? String(options.passageSetId) : null,
      formId: options.formId ? String(options.formId) : null,
      lexile: options.lexile != null ? String(options.lexile) : null
    };
  }

  // Applies human adjudication without overwriting the machine result. The
  // first automated snapshot and every prior reviewed snapshot remain in the
  // record so exports can distinguish model output from educator judgment.
  function applyFluencyReview(result, review, options) {
    result = result || {};
    review = review || {};
    options = options || {};
    var reviewedWords = _cloneFluencyWords(review.wordData || result.wordData);
    var reviewedInsertions = _cloneInsertions(
      review.insertions !== undefined ? review.insertions : result.insertions
    );
    var durationSeconds = Number(options.durationSeconds || result.durationSeconds ||
      (result.metrics && result.metrics.durationSeconds)) || 0;
    var totalWords = Number(options.totalReferenceWordCount || result.totalReferenceWordCount ||
      (result.metrics && result.metrics.totalWords)) || reviewedWords.length;
    var metrics = calculateLocalFluencyMetrics(
      reviewedWords,
      durationSeconds,
      totalWords,
      reviewedInsertions
    );
    var automatedSnapshot = result.automatedSnapshot || _fluencySnapshot(result);
    var previousSnapshot = _fluencySnapshot(result);
    var priorAudit = Array.isArray(result.reviewAudit) ? result.reviewAudit.slice() : [];
    var reviewedAt = options.reviewedAt || new Date().toISOString();
    var reviewer = String(options.reviewer || review.reviewer || 'Educator').trim() || 'Educator';
    var note = String(options.note !== undefined ? options.note : (review.note || '')).trim();
    var correctedWordCount = 0;
    for (var i = 0; i < reviewedWords.length; i++) {
      var originalWord = automatedSnapshot.wordData[i] || {};
      var reviewedWord = reviewedWords[i] || {};
      if (originalWord.status !== reviewedWord.status ||
          String(originalWord.said || '') !== String(reviewedWord.said || '')) correctedWordCount++;
    }
    priorAudit.push({
      revision: priorAudit.length + 1,
      reviewedAt: reviewedAt,
      reviewer: reviewer,
      note: note,
      previous: previousSnapshot
    });
    return Object.assign({}, result, {
      wordData: reviewedWords,
      insertions: reviewedInsertions,
      accuracy: metrics.accuracy,
      wcpm: metrics.wcpm,
      correctWords: metrics.correctWords,
      metrics: Object.assign({}, result.metrics || {}, {
        durationSeconds: durationSeconds,
        totalWords: totalWords,
        accuracy: metrics.accuracy,
        wcpm: metrics.wcpm,
        correctWords: metrics.correctWords
      }),
      automatedSnapshot: automatedSnapshot,
      reviewAudit: priorAudit,
      review: {
        status: 'reviewed',
        reviewedAt: reviewedAt,
        reviewer: reviewer,
        note: note,
        revision: priorAudit.length,
        correctedWordCount: correctedWordCount
      }
    });
  }

  function _median(values) {
    if (!values.length) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  // Produces a descriptive median of the most recent reads while separately
  // deciding whether those passages are calibrated parallel forms. This keeps
  // a useful practice trend from being mislabeled as benchmark evidence.
  function summarizeFluencyEvidence(assessments, options) {
    options = options || {};
    var sampleSize = Math.max(1, Number(options.sampleSize) || 3);
    var valid = (Array.isArray(assessments) ? assessments : []).filter(function (item) {
      return item && isFinite(Number(item.wcpm != null ? item.wcpm : (item.metrics && item.metrics.wcpm)));
    });
    valid.sort(function (a, b) {
      return new Date(a.timestamp || a.date || 0).getTime() - new Date(b.timestamp || b.date || 0).getTime();
    });
    var sample = valid.slice(-sampleSize);
    var wcpmValues = sample.map(function (item) {
      return Number(item.wcpm != null ? item.wcpm : item.metrics.wcpm);
    });
    var accuracyValues = sample.map(function (item) {
      return Number(item.accuracy != null ? item.accuracy : (item.metrics && item.metrics.accuracy));
    }).filter(function (value) { return isFinite(value); });
    var metadata = sample.map(function (item) { return item.passageMetadata || {}; });
    var passageIds = metadata.map(function (m) { return m.passageId; }).filter(Boolean);
    var setIds = metadata.map(function (m) { return m.passageSetId; }).filter(Boolean);
    var formIds = metadata.map(function (m) { return m.formId; }).filter(Boolean);
    var allCalibrated = sample.length >= 3 && metadata.every(function (m) { return m.calibrated === true; });
    var sameSet = setIds.length === sample.length && new Set(setIds).size === 1;
    var parallelForms = formIds.length === sample.length && new Set(formIds).size === sample.length;
    var samePassage = passageIds.length === sample.length && new Set(passageIds).size === 1;
    var benchmarkReady = allCalibrated && sameSet && parallelForms;
    var evidenceKind = benchmarkReady ? 'calibrated-parallel-forms' :
      (samePassage && sample.length > 1 ? 'repeated-reading' : 'descriptive-only');
    var message = benchmarkReady
      ? 'Median of three calibrated parallel forms; appropriate for comparison with the selected benchmark.'
      : (evidenceKind === 'repeated-reading'
        ? 'Repeated readings of one passage show practice change, not an interchangeable screening score.'
        : (sample.length < 3
          ? 'Fewer than three readings are available; treat this as a single-read practice signal.'
          : 'Passages are not documented as calibrated parallel forms; the median is descriptive only.'));
    return {
      sampleCount: sample.length,
      requestedSampleSize: sampleSize,
      medianWcpm: _median(wcpmValues),
      medianAccuracy: _median(accuracyValues),
      minWcpm: wcpmValues.length ? Math.min.apply(Math, wcpmValues) : null,
      maxWcpm: wcpmValues.length ? Math.max.apply(Math, wcpmValues) : null,
      evidenceKind: evidenceKind,
      benchmarkReady: benchmarkReady,
      message: message,
      recordIds: sample.map(function (item) { return item.recordId || item.id || null; })
    };
  }

  function getBenchmarkComparison(wcpm, grade, season, customNorms) {
      if (grade === 'custom' && customNorms) {
          var seasonKey = (season || 'winter').toLowerCase();
          var target = customNorms[seasonKey] || customNorms.winter || 0;
          if (target <= 0) return { level: 'unknown', target: 0 };
          var ratio = wcpm / target;
          var level = 'well_below';
          if (ratio >= 1.1) level = 'above';
          else if (ratio >= 0.9) level = 'at';
          else if (ratio >= 0.7) level = 'approaching';
          return { level: level, target: target };
      }
      // Read FLUENCY_BENCHMARKS from window.AlloModules.AlloData at call time
      // (AlloData module owns this data table; reading at call time handles any
      // load-order race with allo_data_module.js gracefully).
      var FLUENCY_BENCHMARKS = (window.AlloModules && window.AlloModules.AlloData && window.AlloModules.AlloData.FLUENCY_BENCHMARKS) || {};
      var gradeKey = String(grade).replace(/\D/g, '') || 'K';
      var norms = FLUENCY_BENCHMARKS[gradeKey === '0' ? 'K' : gradeKey];
      if (!norms) return { level: 'unknown', target: 0 };
      var seasonKey2 = (season || 'winter').toLowerCase();
      var target2 = norms[seasonKey2] || norms.winter;
      var ratio2 = target2 > 0 ? wcpm / target2 : 1;
      var level2 = 'well_below';
      if (ratio2 >= 1.1) level2 = 'above';
      else if (ratio2 >= 0.9) level2 = 'at';
      else if (ratio2 >= 0.7) level2 = 'approaching';
      return { level: level2, target: target2 };
  }

  async function analyzeFluencyWithGemini(audioBase64, mimeType, referenceText) {
      // Pull config from window at call time. apiKey + GEMINI_MODELS are set
      // by AlloFlowANTI.txt at file-parse time (lines ~790-792); warnLog is set
      // at line ~2128. By the time anyone triggers a fluency analysis (user
      // action), all three are populated.
      var apiKey = (typeof window !== 'undefined') ? window.apiKey : '';
      var GEMINI_MODELS = ((typeof window !== 'undefined') && window.GEMINI_MODELS) || {};
      var defaultModel = GEMINI_MODELS.default || 'gemini-3-flash-preview';
      var warnLog = ((typeof window !== 'undefined') && window.warnLog) || function () { console.warn.apply(console, arguments); };

      var PROMPT = '\n    You are an expert reading tutor AND a critical self-assessor of AI speech recognition accuracy.\n    REFERENCE TEXT:\n    "' + referenceText.substring(0, 5000) + '",\n    INSTRUCTIONS:\n    1. Listen to the student\'s audio recording.\n    2. Compare it strictly word-for-word against the Reference Text.\n    3. Return a JSON object describing the status of every word.\n    STATUS TYPES:\n    - "correct": Pronounced correctly.\n    - "missed": Skipped completely (omission).\n    - "stumbled": Hesitated noticeably but eventually got it right without saying a different word.\n    - "self_corrected": Said a wrong word first, then corrected themselves to the right word.\n    - "mispronounced": Said the wrong word or pronounced it incorrectly and did NOT self-correct.\n    - "insertion": (Optional) If they added a word not in the text.\n    For "mispronounced" and "self_corrected" words, include a "said" field with what the student actually said.\n    For ANY word where you are less than 80% certain of your classification, add "lowConfidence": true.\n    KNOWN BIAS LIMITATIONS — YOU MUST ACCOUNT FOR THESE:\n    - AI speech recognition has documented higher error rates for speakers of African American English (Koenecke et al., 2020, PNAS)\n    - Child speech recognition error rates are 2-5x higher than adult rates (Wu et al., 2020)\n    - Regional accents and L2 English speakers experience higher misrecognition (Tatman, 2017)\n    - Dialectal pronunciations (e.g., "ax" for "ask" in AAE, "gonna" for "going to") are linguistically valid — do NOT mark these as mispronounced\n    - If you detect accent or dialect patterns, err on the side of "correct" rather than "mispronounced"\n    4. CONFIDENCE SELF-ASSESSMENT — After word analysis, evaluate your own accuracy:\n    - Audio quality: noise, clipping, echo, microphone distance\n    - Speaker characteristics: young child, accented speech, dialectal variation\n    - Consistency: did the same word get different classifications in different positions?\n    RETURN JSON ONLY:\n    {\n      "wordData": [\n        { "word": "The", "status": "correct" },\n        { "word": "cat", "status": "missed" },\n        { "word": "horse", "status": "mispronounced", "said": "house" },\n        { "word": "barn", "status": "self_corrected", "said": "band", "lowConfidence": true },\n        { "word": "sat", "status": "correct" }\n      ],\n      "insertions": ["um", "like"],\n      "feedback": "1-2 sentences of encouraging feedback focusing on specific phonics or pacing improvements.",\n      "prosody": {\n        "pacing": 3,\n        "expression": 4,\n        "phrasing": 3,\n        "note": "Brief note on prosody"\n      },\n      "confidence": {\n        "overall": 8,\n        "audioQuality": 9,\n        "speakerClarity": 7,\n        "accentDetected": false,\n        "youngVoiceDetected": false,\n        "dialectalPatternsDetected": false,\n        "lowConfidenceWordCount": 1,\n        "note": "Brief explanation of confidence factors affecting this specific analysis",\n        "limitationsApplied": "Which known limitations from the research literature were relevant, or \'none detected\'"\n      }\n    }\n    PROSODY RATING GUIDE (1-5):\n    - pacing: 1=very slow/labored, 2=slow with many pauses, 3=uneven pace, 4=mostly smooth, 5=natural conversational pace\n    - expression: 1=monotone, 2=little variation, 3=some expression, 4=good variation, 5=expressive and natural\n    - phrasing: 1=word-by-word, 2=two-word groups, 3=some phrase groups, 4=mostly meaningful phrases, 5=smooth phrase reading\n    CONFIDENCE RATING GUIDE (1-10):\n    - 1-3: Low — results should be verified by a human listener\n    - 4-6: Moderate — some words may be inaccurate, especially if accent/dialect/young voice detected\n    - 7-8: Good — minor uncertainty on a few words\n    - 9-10: High — clear audio, standard pronunciation, high consistency\n  ';
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + defaultModel + ':generateContent' + (apiKey ? ('?key=' + apiKey) : '');
      var payload = {
          contents: [{
              role: 'user',
              parts: [
                  { text: PROMPT },
                  { inlineData: { mimeType: mimeType, data: audioBase64 } }
              ]
          }],
          generationConfig: {
              responseMimeType: 'application/json'
          }
      };
      try {
          var response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          var data = await response.json();
          var resultText = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
          if (!resultText) return null;
          return JSON.parse(resultText);
      } catch (error) {
          warnLog('Gemini Audio Analysis Failed:', error);
          return null;
      }
  }

  // ─── Offline oral-reading fluency (on-device whisper.cpp) ───────────────
  // The cloud path (analyzeFluencyWithGemini) sends the student's VOICE to
  // Google. In the desktop School Box, a managed whisper.cpp server
  // (127.0.0.1:32176, see /api/asr/*) transcribes on-device so the audio never
  // leaves the machine. We align the transcript to the reference passage and
  // reuse the SAME calculateLocalFluencyMetrics / calculateRunningRecordMetrics.
  //
  // INTEGRITY (non-negotiable, per the pilot-readiness audit): this is a
  // PRACTICE SIGNAL, not a norm-referenced score. whisper has NO child-speech
  // or dialect tuning — the OPPOSITE of the Gemini prompt's documented bias
  // mitigations — so every non-match is emitted as lowConfidence for a teacher
  // to review, never an automatic reading level. Word-level ASR error for
  // young/accented readers is high (Wu 2020: 2-5x adult rates); we surface
  // that in the confidence block instead of hiding it.

  function _normalizeFluencyWord(w) {
    return String(w == null ? '' : w).toLowerCase()
      .replace(/[^\p{L}\p{N}']/gu, '')   // drop punctuation, keep letters/digits/apostrophe
      .replace(/^'+|'+$/g, '');
  }
  function _tokenizeReference(text) {
    return String(text || '').split(/\s+/).map(function (t) { return { raw: t, norm: _normalizeFluencyWord(t) }; })
      .filter(function (t) { return t.norm.length > 0; });
  }

  // Needleman-Wunsch word alignment of reference vs transcript. Returns per-
  // reference-word statuses + a list of inserted (extra) transcript words, so
  // the output plugs straight into the existing metric functions. Costs: match
  // 0, substitution/insertion/deletion 1 (classic WER edit distance).
  function alignTranscriptToReference(referenceText, transcript) {
    var ref = _tokenizeReference(referenceText);
    var hyp = _tokenizeReference(transcript);
    var n = ref.length, m = hyp.length;
    if (!n) return { wordData: [], insertions: [] };
    // DP matrix (n+1)x(m+1); store backpointers.
    var dp = new Array(n + 1);
    for (var i = 0; i <= n; i++) { dp[i] = new Array(m + 1); for (var j = 0; j <= m; j++) dp[i][j] = 0; }
    for (var i2 = 0; i2 <= n; i2++) dp[i2][0] = i2;
    for (var j2 = 0; j2 <= m; j2++) dp[0][j2] = j2;
    for (var a = 1; a <= n; a++) {
      for (var b = 1; b <= m; b++) {
        var cost = (ref[a - 1].norm === hyp[b - 1].norm) ? 0 : 1;
        dp[a][b] = Math.min(dp[a - 1][b - 1] + cost, dp[a - 1][b] + 1, dp[a][b - 1] + 1);
      }
    }
    // Backtrace from (n,m) → sequence of ops.
    var wordData = new Array(n);
    var insertions = [];
    var ci = n, cj = m;
    while (ci > 0 || cj > 0) {
      if (ci > 0 && cj > 0) {
        var same = ref[ci - 1].norm === hyp[cj - 1].norm;
        var costD = same ? 0 : 1;
        if (dp[ci][cj] === dp[ci - 1][cj - 1] + costD) {
          if (same) {
            wordData[ci - 1] = { word: ref[ci - 1].raw, status: 'correct' };
          } else {
            wordData[ci - 1] = { word: ref[ci - 1].raw, status: 'mispronounced', said: hyp[cj - 1].raw, lowConfidence: true };
          }
          ci--; cj--; continue;
        }
      }
      if (ci > 0 && dp[ci][cj] === dp[ci - 1][cj] + 1) {
        // reference word with no transcript match → omission
        wordData[ci - 1] = { word: ref[ci - 1].raw, status: 'missed', lowConfidence: true };
        ci--; continue;
      }
      // transcript word with no reference match → insertion
      if (cj > 0) { insertions.unshift(hyp[cj - 1].raw); cj--; continue; }
      break;
    }
    return { wordData: wordData, insertions: insertions };
  }

  // Encode a mono Float32 buffer as a 16-bit PCM WAV (what whisper-server wants).
  function _floatToWav16k(float32, sampleRate) {
    var len = float32.length;
    var buffer = new ArrayBuffer(44 + len * 2);
    var view = new DataView(buffer);
    var writeStr = function (off, s) { for (var i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + len * 2, true); writeStr(8, 'WAVE');
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeStr(36, 'data'); view.setUint32(40, len * 2, true);
    var off = 44;
    for (var k = 0; k < len; k++) { var s = Math.max(-1, Math.min(1, float32[k])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2; }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Decode any recorded audio (webm/opus, ogg, wav…) to a 16 kHz mono WAV via
  // the Web Audio API — no server-side ffmpeg needed. Returns a Blob or null.
  async function _audioBase64ToWav16k(base64, mimeType) {
    try {
      var clean = String(base64 || '').replace(/^data:[^;,]*;base64,/, '');
      var bin = atob(clean);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      var tmpCtx = new AC();
      var decoded = await tmpCtx.decodeAudioData(bytes.buffer.slice(0));
      try { tmpCtx.close(); } catch (_) {}
      var targetRate = 16000;
      var frames = Math.ceil(decoded.duration * targetRate);
      var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC || !frames) return null;
      var offline = new OAC(1, frames, targetRate);
      var src = offline.createBufferSource();
      src.buffer = decoded;
      src.connect(offline.destination);
      src.start(0);
      var rendered = await offline.startRendering();
      return _floatToWav16k(rendered.getChannelData(0), targetRate);
    } catch (e) {
      (window.warnLog || console.warn)('[Fluency] audio→WAV conversion failed:', e && e.message);
      return null;
    }
  }

  // Discover the managed ASR server (desktop School Box only). Returns the
  // inference URL if the server is running, else null (caller uses cloud path).
  async function _getLocalAsrInferenceUrl() {
    try {
      if (typeof fetch !== 'function') return null;
      var res = await fetch('/api/asr/status', { method: 'GET' });
      if (!res.ok) return null;
      var st = await res.json();
      // Prefer the runtime's SAME-ORIGIN proxy over whisper-server's own
      // port: the direct URL is cross-origin from the app page, which makes
      // the whole feature hostage to whisper-server's CORS headers. Runtimes
      // from 2026-07-06 advertise proxyUrl; older ones fall back to the
      // direct inferenceUrl (pre-existing behavior, unchanged).
      if (st && st.running && (st.proxyUrl || st.inferenceUrl)) return st.proxyUrl || st.inferenceUrl;
      return null;
    } catch (_) { return null; }
  }
  function isLocalAsrAvailable() {
    return _getLocalAsrInferenceUrl().then(function (u) { return !!u; }).catch(function () { return false; });
  }

  // Transcribe recorded audio ON DEVICE via the managed whisper-server. Returns
  // the transcript string, or null when the local server isn't available/fails
  // (caller falls back to the cloud path — never a regression).
  async function transcribeAudioLocal(audioBase64, mimeType, opts) {
    opts = opts || {};
    var inferenceUrl = opts.inferenceUrl || await _getLocalAsrInferenceUrl();
    if (!inferenceUrl) return null;
    var wav = await _audioBase64ToWav16k(audioBase64, mimeType);
    if (!wav) return null;
    try {
      var form = new FormData();
      form.append('file', wav, 'reading.wav');
      form.append('response_format', 'json');
      form.append('temperature', '0');
      if (opts.language && String(opts.language).trim()) form.append('language', String(opts.language).trim());
      var res = await fetch(inferenceUrl, { method: 'POST', body: form });
      if (!res.ok) return null;
      var data = await res.json();
      var text = (data && (data.text || data.transcription)) || '';
      if (Array.isArray(data && data.segments) && !text) text = data.segments.map(function (s) { return s.text || ''; }).join(' ');
      return String(text || '').trim() || null;
    } catch (e) {
      (window.warnLog || console.warn)('[Fluency] local ASR transcription failed:', e && e.message);
      return null;
    }
  }

  // On-device fluency analysis: transcribe locally, align to the passage, and
  // return the SAME shape as analyzeFluencyWithGemini so downstream code is
  // unchanged — plus an honest confidence block and method:'local-asr'.
  // Returns null if the local server isn't available (caller uses cloud path).
  async function analyzeFluencyLocal(audioBase64, mimeType, referenceText, opts) {
    var transcript = await transcribeAudioLocal(audioBase64, mimeType, opts);
    if (transcript == null) return null;
    var aligned = alignTranscriptToReference(referenceText, transcript);
    var refCount = _tokenizeReference(referenceText).length;
    var matched = aligned.wordData.filter(function (w) { return w.status === 'correct'; }).length;
    var agreement = refCount ? matched / refCount : 0;
    return {
      wordData: aligned.wordData,
      insertions: aligned.insertions,
      transcript: transcript,
      method: 'local-asr',
      feedback: 'On-device practice read — the words below are a computer transcription for you and your teacher to review together, not a score.',
      // No prosody: a plain transcript carries no reliable pacing/expression
      // signal, and inventing one would be dishonest. Left null on purpose.
      prosody: null,
      confidence: {
        overall: Math.max(1, Math.min(6, Math.round(agreement * 6))), // capped at 6/10 by design
        source: 'on-device (whisper.cpp)',
        audioQuality: null,
        speakerClarity: null,
        accentDetected: null,
        youngVoiceDetected: null,
        dialectalPatternsDetected: null,
        lowConfidenceWordCount: aligned.wordData.filter(function (w) { return w.lowConfidence; }).length,
        note: 'Transcribed on-device — the audio never left this computer. Offline speech recognition has NO child-speech or dialect tuning, so it may mishear young or accented readers and flag correct reading as errors. Treat flagged words as prompts to listen again, not as a verdict.',
        limitationsApplied: 'On-device ASR is not tuned for child or dialectal speech (Wu 2020: child error rates 2-5x adult). Every mismatch is marked low-confidence for teacher review; this is a practice signal, not a norm-referenced or standardized measure.'
      }
    };
  }

  // ── Triangulation: reconcile the local + cloud results when BOTH exist ──
  // Two INDEPENDENT scorers of the same read (on-device whisper alignment and
  // Gemini's audio analysis) checking each other — the ASR cousin of the
  // doc-pipeline Vision-vs-deterministic cross-check. Where they AGREE per
  // reference word, confidence is high. Where they DIVERGE, we bias toward the
  // MORE LENIENT status (never over-penalize a reader on a machine disagreement
  // — the documented ASR-bias literature says errors skew against AAE/child/L2
  // speakers) and flag the word + the whole result for a teacher.
  var _STATUS_LENIENCY = { correct: 0, stumbled: 1, self_corrected: 2, mispronounced: 3, missed: 4 };
  function triangulateFluency(localResult, geminiResult) {
    if (!localResult || !geminiResult || !Array.isArray(localResult.wordData) || !Array.isArray(geminiResult.wordData)) {
      return geminiResult || localResult || null;
    }
    var a = localResult.wordData, b = geminiResult.wordData;
    var len = Math.min(a.length, b.length);
    var merged = [];
    var agree = 0, divergent = 0;
    for (var i = 0; i < len; i++) {
      var la = a[i] || {}, lb = b[i] || {};
      var sa = la.status || 'correct', sb = lb.status || 'correct';
      if (sa === sb) { agree++; merged.push({ word: lb.word || la.word, status: sb }); continue; }
      divergent++;
      // Pick the more lenient (lower leniency index) of the two disagreeing
      // statuses; carry the loser's word in `said` for the teacher.
      var lenA = _STATUS_LENIENCY[sa] == null ? 3 : _STATUS_LENIENCY[sa];
      var lenB = _STATUS_LENIENCY[sb] == null ? 3 : _STATUS_LENIENCY[sb];
      var keep = lenA <= lenB ? sa : sb;
      merged.push({ word: lb.word || la.word, status: keep, lowConfidence: true, triangulation: 'divergent',
        said: (la.said || lb.said || undefined) });
    }
    // Append any tail from the longer wordData (unpaired → low confidence).
    var longer = a.length > b.length ? a : b;
    for (var t = len; t < longer.length; t++) merged.push(Object.assign({ lowConfidence: true, triangulation: 'unpaired' }, longer[t]));
    var total = agree + divergent;
    return {
      wordData: merged,
      insertions: (geminiResult.insertions || localResult.insertions || []),
      method: 'triangulated',
      feedback: geminiResult.feedback || localResult.feedback || '',
      prosody: geminiResult.prosody || null,
      confidence: {
        overall: total ? Math.round((agree / total) * 10) : 5,
        source: 'triangulated (on-device whisper + cloud)',
        agreementRate: total ? Math.round((agree / total) * 100) : null,
        divergentWordCount: divergent,
        needsReview: divergent > 0,
        note: 'Two independent scorers were compared. Where they disagreed (' + divergent + ' of ' + total + ' words), the more lenient reading was kept and the word flagged — never penalize a reader on a machine disagreement. Review flagged words together.',
        limitationsApplied: 'Cross-check of on-device ASR and cloud analysis. Still a practice signal, not a norm-referenced or standardized measure.'
      }
    };
  }

  // Mirror to window.* so the monolith's _upgradeFluency() can swap its
  // top-level shims to point at the real implementations.
  window.calculateLocalFluencyMetrics = calculateLocalFluencyMetrics;
  window.calculateRunningRecordMetrics = calculateRunningRecordMetrics;
  window.getBenchmarkComparison = getBenchmarkComparison;
  window.analyzeFluencyWithGemini = analyzeFluencyWithGemini;
  window.alignTranscriptToReference = alignTranscriptToReference;
  window.transcribeAudioLocal = transcribeAudioLocal;
  window.analyzeFluencyLocal = analyzeFluencyLocal;
  window.isLocalAsrAvailable = isLocalAsrAvailable;
  window.triangulateFluency = triangulateFluency;
  window.createFluencyPassageMetadata = createFluencyPassageMetadata;
  window.applyFluencyReview = applyFluencyReview;
  window.summarizeFluencyEvidence = summarizeFluencyEvidence;

  // Trigger the monolith's upgrade callback if it exists.
  if (typeof window._upgradeFluency === 'function') {
      window._upgradeFluency();
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.Fluency = {
      calculateLocalFluencyMetrics: calculateLocalFluencyMetrics,
      calculateRunningRecordMetrics: calculateRunningRecordMetrics,
      getBenchmarkComparison: getBenchmarkComparison,
      analyzeFluencyWithGemini: analyzeFluencyWithGemini,
      alignTranscriptToReference: alignTranscriptToReference,
      transcribeAudioLocal: transcribeAudioLocal,
      analyzeFluencyLocal: analyzeFluencyLocal,
      isLocalAsrAvailable: isLocalAsrAvailable,
      triangulateFluency: triangulateFluency,
      createFluencyPassageMetadata: createFluencyPassageMetadata,
      applyFluencyReview: applyFluencyReview,
      summarizeFluencyEvidence: summarizeFluencyEvidence
  };
  console.log('[CDN] Fluency loaded');
})();
