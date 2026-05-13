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

  function calculateLocalFluencyMetrics(wordData, durationSeconds, totalReferenceWordCount) {
      if (!wordData || wordData.length === 0) return { accuracy: 0, wcpm: 0 };
      var correctCount = wordData.filter(function (w) { return w.status === 'correct' || w.status === 'stumbled'; }).length;
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
      var accuracy = Math.min(100, denominator > 0 ? Math.round((correctCount / denominator) * 100) : 0);
      var validDuration = Math.max(1, durationSeconds);
      var minutes = validDuration / 60;
      var wcpm = Math.round(correctCount / minutes);
      return { accuracy: accuracy, wcpm: wcpm };
  }

  function calculateRunningRecordMetrics(wordData, insertionsArr) {
      if (!wordData || wordData.length === 0) return {
          substitutions: 0, omissions: 0, insertions: 0,
          selfCorrections: 0, totalErrors: 0, errorRate: '0',
          scRate: '0', readingLevel: 'frustrational'
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
      var correctAndSC = wordData.filter(function (w) { return w.status === 'correct' || w.status === 'self_corrected' || w.status === 'stumbled'; }).length;
      var accuracyPct = totalWords > 0 ? (correctAndSC / totalWords) * 100 : 0;
      var readingLevel = 'frustrational';
      if (accuracyPct >= 95) readingLevel = 'independent';
      else if (accuracyPct >= 90) readingLevel = 'instructional';
      return {
          substitutions: substitutions, omissions: omissions, insertions: insertions,
          selfCorrections: selfCorrections, totalErrors: totalErrors, errorRate: errorRate,
          scRate: scRate, readingLevel: readingLevel, accuracyPct: Math.round(accuracyPct)
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

  // Mirror to window.* so the monolith's _upgradeFluency() can swap its
  // top-level shims to point at the real implementations.
  window.calculateLocalFluencyMetrics = calculateLocalFluencyMetrics;
  window.calculateRunningRecordMetrics = calculateRunningRecordMetrics;
  window.getBenchmarkComparison = getBenchmarkComparison;
  window.analyzeFluencyWithGemini = analyzeFluencyWithGemini;

  // Trigger the monolith's upgrade callback if it exists.
  if (typeof window._upgradeFluency === 'function') {
      window._upgradeFluency();
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.Fluency = {
      calculateLocalFluencyMetrics: calculateLocalFluencyMetrics,
      calculateRunningRecordMetrics: calculateRunningRecordMetrics,
      getBenchmarkComparison: getBenchmarkComparison,
      analyzeFluencyWithGemini: analyzeFluencyWithGemini
  };
  console.log('[CDN] Fluency loaded');
})();
