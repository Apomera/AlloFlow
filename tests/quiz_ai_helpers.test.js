// Logic-characterization tests for quiz_ai_helpers.js (window.AlloModules.QuizAIHelpers).
//
// WHY: this is the deterministic scoring layer behind the quiz surface
// (view_quiz_module.js) and the offline-submission grader — short-answer,
// fill-in-the-blank, and calibrated free-response grading. It had ZERO coverage.
// An LLM does the *judgement*, but the integrity-critical glue around it is pure
// and regression-prone: the status enum CLAMP, the fill-blank EXACT-match
// fast-path (which must NOT spend an LLM call), JSON parsing of fenced/prose-
// wrapped model output, the score clamp/interpolation, and graceful error/empty
// handling. We pin all of that with a STUB callGemini — no live model, fully
// deterministic.
//
// Loads the SAME compiled file that ships to the CDN (loadAlloModule → IIFE →
// window.AlloModules.QuizAIHelpers). clampStatus/safeParseJson are closure-
// private; we characterize them through the public graders (the real contract).

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let Q;
beforeAll(() => {
  loadAlloModule('quiz_ai_helpers.js');
  Q = window.AlloModules.QuizAIHelpers;
});

// A stub callGemini returning a canned raw response (string or {text}).
const gemini = (raw) => async () => raw;
const json = (obj) => JSON.stringify(obj);

it('registers the three graders', () => {
  expect(typeof Q.gradeFreeformAnswer).toBe('function');
  expect(typeof Q.gradeFillBlank).toBe('function');
  expect(typeof Q.gradeFreeformAnswerWithCalibration).toBe('function');
});

describe('status clamp (via gradeFreeformAnswer)', () => {
  const base = { question: 'Q', expectedAnswer: 'A', studentResponse: 'resp' };
  for (const s of ['correct', 'partially-correct', 'incorrect', 'unclear']) {
    it(`passes through valid status "${s}"`, async () => {
      const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini(json({ status: s, feedback: 'f' })) });
      expect(r.status).toBe(s);
    });
  }
  it('clamps an unknown status to "unclear"', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini(json({ status: 'AMAZING', feedback: 'f' })) });
    expect(r.status).toBe('unclear');
  });
  it('clamps a missing/null status to "unclear"', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini(json({ feedback: 'f' })) });
    expect(r.status).toBe('unclear');
  });
});

describe('gradeFreeformAnswer', () => {
  const base = { question: 'What is 2+2?', expectedAnswer: '4', studentResponse: 'four' };
  it('errors when callGemini is missing', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: undefined });
    expect(r.status).toBe('error');
  });
  it('returns incorrect for an empty/whitespace response (no LLM)', async () => {
    let called = 0;
    const r = await Q.gradeFreeformAnswer({ ...base, studentResponse: '   ', callGemini: async () => { called++; return ''; } });
    expect(r.status).toBe('incorrect');
    expect(r.feedback).toMatch(/no response/i);
    expect(called).toBe(0);
  });
  it('echoes the (truncated) expectedAnswer and feedback', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini(json({ status: 'correct', feedback: 'Nice work' })) });
    expect(r).toMatchObject({ status: 'correct', feedback: 'Nice work', expectedAnswer: '4' });
  });
  it('parses code-fenced JSON', async () => {
    const raw = '```json\n' + json({ status: 'partially-correct', feedback: 'close' }) + '\n```';
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini(raw) });
    expect(r.status).toBe('partially-correct');
    expect(r.feedback).toBe('close');
  });
  it('parses prose-wrapped JSON (first { .. last })', async () => {
    const raw = 'Sure! Here is my grade: ' + json({ status: 'incorrect', feedback: 'try again' }) + ' hope that helps.';
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini(raw) });
    expect(r.status).toBe('incorrect');
  });
  it('reads the {text} response shape', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini({ text: json({ status: 'correct', feedback: 'ok' }) }) });
    expect(r.status).toBe('correct');
  });
  it('returns error on unparseable model output', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini('not json at all') });
    expect(r.status).toBe('error');
    expect(r.feedback).toMatch(/parse/i);
  });
  it('returns error (with message) when callGemini throws', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: async () => { throw new Error('boom'); } });
    expect(r.status).toBe('error');
    expect(r.feedback).toBe('boom');
  });
  it('coerces non-string feedback to empty string', async () => {
    const r = await Q.gradeFreeformAnswer({ ...base, callGemini: gemini(json({ status: 'correct', feedback: { a: 1 } })) });
    expect(r.feedback).toBe('');
  });
});

describe('gradeFillBlank — exact/alternative fast-path (must not call the LLM)', () => {
  const mk = (overrides) => {
    let called = 0;
    const args = Object.assign({
      contextSentence: 'The capital is ___.', expectedFill: 'Paris', studentFill: 'Paris',
      callGemini: async () => { called++; return json({ status: 'incorrect', feedback: 'x' }); },
    }, overrides);
    return { args, calls: () => called };
  };
  it('exact match → correct, zero LLM calls', async () => {
    const { args, calls } = mk();
    const r = await Q.gradeFillBlank(args);
    expect(r).toMatchObject({ status: 'correct', expectedFill: 'Paris' });
    expect(calls()).toBe(0);
  });
  it('case-insensitive match → correct, zero LLM calls', async () => {
    const { args, calls } = mk({ studentFill: 'paris' });
    const r = await Q.gradeFillBlank(args);
    expect(r.status).toBe('correct');
    expect(calls()).toBe(0);
  });
  it('whitespace-padded match → correct', async () => {
    const { args, calls } = mk({ studentFill: '  Paris  ' });
    const r = await Q.gradeFillBlank(args);
    expect(r.status).toBe('correct');
    expect(calls()).toBe(0);
  });
  it('matches an acceptableAlternatives entry → correct, zero LLM calls', async () => {
    const { args, calls } = mk({ studentFill: 'la ville lumiere', expectedFill: 'Paris', acceptableAlternatives: ['La Ville Lumiere'] });
    const r = await Q.gradeFillBlank(args);
    expect(r.status).toBe('correct');
    expect(calls()).toBe(0);
  });
  it('empty studentFill → incorrect, zero LLM calls', async () => {
    const { args, calls } = mk({ studentFill: '  ' });
    const r = await Q.gradeFillBlank(args);
    expect(r.status).toBe('incorrect');
    expect(calls()).toBe(0);
  });
  it('errors when callGemini missing', async () => {
    const r = await Q.gradeFillBlank({ contextSentence: 'x', expectedFill: 'a', studentFill: 'b', callGemini: undefined });
    expect(r.status).toBe('error');
  });
});

describe('gradeFillBlank — LLM fuzzy fallback (non-exact)', () => {
  it('non-matching fill calls the LLM and clamps the status', async () => {
    let called = 0;
    const r = await Q.gradeFillBlank({
      contextSentence: 'x ___', expectedFill: 'Paris', studentFill: 'Parris',
      callGemini: async () => { called++; return json({ status: 'WEIRD', feedback: 'close' }); },
    });
    expect(called).toBe(1);
    expect(r.status).toBe('unclear'); // WEIRD clamped
    expect(r.expectedFill).toBe('Paris');
  });
  it('LLM throw → error', async () => {
    const r = await Q.gradeFillBlank({
      contextSentence: 'x ___', expectedFill: 'Paris', studentFill: 'zzz',
      callGemini: async () => { throw new Error('net'); },
    });
    expect(r.status).toBe('error');
  });
});

describe('gradeFreeformAnswerWithCalibration — score clamp/interpolation', () => {
  const base = { rubric: 'Explain why', studentResponse: 'because reasons' };
  it('errors (score 0) when callGemini missing', async () => {
    const r = await Q.gradeFreeformAnswerWithCalibration({ ...base, callGemini: undefined });
    expect(r).toMatchObject({ status: 'error', score: 0 });
  });
  it('empty response → incorrect, score 0 (no LLM)', async () => {
    let called = 0;
    const r = await Q.gradeFreeformAnswerWithCalibration({ ...base, studentResponse: '', callGemini: async () => { called++; return ''; } });
    expect(r).toMatchObject({ status: 'incorrect', score: 0 });
    expect(called).toBe(0);
  });
  it('keeps a valid in-range score (rounded)', async () => {
    const r = await Q.gradeFreeformAnswerWithCalibration({ ...base, callGemini: gemini(json({ status: 'partially-correct', score: 72.4, feedback: 'f' })) });
    expect(r.score).toBe(72);
    expect(r.status).toBe('partially-correct');
  });
  it('rejects an out-of-range score (>100) and falls back to status-based', async () => {
    const r = await Q.gradeFreeformAnswerWithCalibration({ ...base, callGemini: gemini(json({ status: 'correct', score: 150, feedback: 'f' })) });
    expect(r.score).toBe(90); // correct → 90
  });
  it('rejects a negative score and falls back to status-based', async () => {
    const r = await Q.gradeFreeformAnswerWithCalibration({ ...base, callGemini: gemini(json({ status: 'incorrect', score: -5, feedback: 'f' })) });
    expect(r.score).toBe(25); // incorrect → 25
  });
  it('status-based fallback when score is absent', async () => {
    const map = { correct: 90, 'partially-correct': 65, incorrect: 25, unclear: 0 };
    for (const [status, expected] of Object.entries(map)) {
      const r = await Q.gradeFreeformAnswerWithCalibration({ ...base, callGemini: gemini(json({ status, feedback: 'f' })) });
      expect(r.score, status).toBe(expected);
    }
  });
});
