/**
 * AlloFlow Quiz AI Helpers
 *
 * Plan S Slice 2: shared graders for free-form quiz item types.
 *   - gradeFreeformAnswer  : free-text response (short-answer item type)
 *   - gradeFillBlank       : fill-in-the-blank fuzzy match (handles minor
 *                            typos, plural/singular, capitalization, synonyms)
 *
 * Both call back into props.callGemini with structured prompts and return
 * a { status, feedback, sources? } shape. Status is one of:
 *   'correct' | 'partially-correct' | 'incorrect' | 'unclear' | 'error'
 *
 * Design choices:
 *   - JSON-mode Gemini call so the response is structured.
 *   - Status enum kept small so view rendering stays simple.
 *   - 'partially-correct' exists because short-answer responses often have
 *     one correct piece and one mistake — rather than mark them wrong we
 *     surface what to fix.
 *   - Failures return {status:'error'} so the caller can render a non-blocking
 *     fallback rather than crashing.
 *
 * Module export: window.AlloModules.QuizAIHelpers
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.QuizAIHelpers) {
    console.log('[CDN] QuizAIHelpers already loaded, skipping');
    return;
  }

  function safeParseJson(raw) {
    if (!raw) return null;
    var txt = (typeof raw === 'object' && raw.text) ? raw.text : String(raw);
    // Strip code fences and any leading/trailing prose
    txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    var firstBrace = txt.indexOf('{');
    var lastBrace = txt.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      txt = txt.slice(firstBrace, lastBrace + 1);
    }
    try { return JSON.parse(txt); } catch (e) { return null; }
  }

  function clampStatus(s) {
    var allowed = { 'correct': 1, 'partially-correct': 1, 'incorrect': 1, 'unclear': 1 };
    return (s && allowed[s]) ? s : 'unclear';
  }

  /**
   * Grade a free-text short-answer response.
   * @param {Object} args
   *   @param {string} args.question         The original question prompt.
   *   @param {string} args.expectedAnswer   The author-provided correct answer (may be terse).
   *   @param {string} args.studentResponse  The student's response.
   *   @param {string} [args.gradeLevel]     For age-appropriate feedback tone.
   *   @param {Function} args.callGemini     Required.
   * @returns {Promise<{status, feedback, expectedAnswer}>}
   */
  async function gradeFreeformAnswer(args) {
    if (!args || typeof args.callGemini !== 'function') {
      return { status: 'error', feedback: 'Grader unavailable: callGemini not provided.' };
    }
    if (!args.studentResponse || !args.studentResponse.trim()) {
      return { status: 'incorrect', feedback: 'No response provided yet.' };
    }
    var q = String(args.question || '').slice(0, 600);
    var expected = String(args.expectedAnswer || '').slice(0, 400);
    var resp = String(args.studentResponse || '').slice(0, 1200);
    var grade = args.gradeLevel || 'middle school';
    var prompt = 'You are a kind, accurate teacher grading a short-answer response. Be fair: accept any answer that demonstrates understanding even if wording differs. Be lenient on spelling/grammar but strict on factual accuracy.\n\n'
      + 'QUESTION: "' + q + '"\n'
      + 'EXPECTED ANSWER (author-provided, may be terse): "' + expected + '"\n'
      + 'STUDENT RESPONSE: "' + resp + '"\n\n'
      + 'Grade Level: ' + grade + '\n\n'
      + 'Return ONLY a single valid JSON object with this exact shape:\n'
      + '{\n'
      + '  "status": "correct" | "partially-correct" | "incorrect" | "unclear",\n'
      + '  "feedback": "ONE encouraging sentence (15-30 words). For correct: affirm what they got. For partially-correct: name what is right + what is missing. For incorrect: gentle redirect that hints at the right idea without giving the answer outright. For unclear: ask them to add one more sentence."\n'
      + '}\n\n'
      + 'No markdown, no fences, no extra prose. Be honest, encouraging, and concise.';
    try {
      var raw = await args.callGemini(prompt, true);
      var parsed = safeParseJson(raw);
      if (!parsed) return { status: 'error', feedback: 'Could not parse grader response. Try again.' };
      return {
        status: clampStatus(parsed.status),
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
        expectedAnswer: expected,
      };
    } catch (err) {
      return { status: 'error', feedback: (err && err.message) ? err.message : 'Grader call failed.' };
    }
  }

  /**
   * Grade a fill-in-the-blank response. Handles minor typos, plural/singular,
   * capitalization, and reasonable synonyms.
   * @param {Object} args
   *   @param {string} args.contextSentence  The full sentence with blank placeholder.
   *   @param {string} args.expectedFill     The author-provided expected fill.
   *   @param {string} args.studentFill      What the student typed in the blank.
   *   @param {Array<string>} [args.acceptableAlternatives]  Optional pre-supplied synonyms.
   *   @param {string} [args.gradeLevel]
   *   @param {Function} args.callGemini     Required.
   * @returns {Promise<{status, feedback, expectedFill}>}
   */
  async function gradeFillBlank(args) {
    if (!args || typeof args.callGemini !== 'function') {
      return { status: 'error', feedback: 'Grader unavailable: callGemini not provided.' };
    }
    if (!args.studentFill || !args.studentFill.trim()) {
      return { status: 'incorrect', feedback: 'Blank not filled in yet.' };
    }
    // Cheap exact/case-insensitive trim match before calling LLM (saves tokens for the obvious cases)
    var sf = String(args.studentFill).trim();
    var ef = String(args.expectedFill || '').trim();
    var alts = Array.isArray(args.acceptableAlternatives) ? args.acceptableAlternatives.map(function (a) { return String(a).trim(); }) : [];
    var allTargets = [ef].concat(alts).filter(function (s) { return s; });
    for (var i = 0; i < allTargets.length; i++) {
      if (allTargets[i].toLowerCase() === sf.toLowerCase()) {
        return { status: 'correct', feedback: 'Correct.', expectedFill: ef };
      }
    }
    // Fall back to LLM fuzzy grader
    var ctx = String(args.contextSentence || '').slice(0, 400);
    var grade = args.gradeLevel || 'middle school';
    var prompt = 'You are grading a fill-in-the-blank response. Be lenient on spelling, capitalization, plural/singular, and reasonable synonyms — but strict on conceptual accuracy.\n\n'
      + 'SENTENCE WITH BLANK: "' + ctx + '"\n'
      + 'EXPECTED FILL: "' + ef + '"\n'
      + (alts.length > 0 ? 'ALSO ACCEPTABLE: ' + alts.map(function (a) { return '"' + a + '"'; }).join(', ') + '\n' : '')
      + 'STUDENT FILL: "' + sf + '"\n\n'
      + 'Grade Level: ' + grade + '\n\n'
      + 'Return ONLY a single valid JSON object:\n'
      + '{\n'
      + '  "status": "correct" | "partially-correct" | "incorrect" | "unclear",\n'
      + '  "feedback": "ONE short sentence. Correct: brief affirmation. Partially-correct: e.g. \\"close — \'photosynthesis\' rather than \'photosynthize\'\\". Incorrect: gentle hint at the right family of answer."\n'
      + '}\n\n'
      + 'No markdown, no fences, no extra prose.';
    try {
      var raw = await args.callGemini(prompt, true);
      var parsed = safeParseJson(raw);
      if (!parsed) return { status: 'error', feedback: 'Could not parse grader response.' };
      return {
        status: clampStatus(parsed.status),
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
        expectedFill: ef,
      };
    } catch (err) {
      return { status: 'error', feedback: (err && err.message) ? err.message : 'Grader call failed.' };
    }
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizAIHelpers = {
    gradeFreeformAnswer: gradeFreeformAnswer,
    gradeFillBlank: gradeFillBlank,
  };
  console.log('[CDN] QuizAIHelpers loaded');
})();
