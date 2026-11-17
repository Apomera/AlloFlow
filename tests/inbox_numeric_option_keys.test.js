// Submission Inbox auto-score vs. the pack's own answer key (2026-11-16).
//
// The inbox had its own answer-key resolver that read a key of '2' as "option
// index 2" before trying it as option text. For "What is 1 + 1?" with options
// 1, 2, 3, 4 it marked the student who picked 2 wrong and the one who picked 3
// right, while the pack's "Check my answers" and printed teacher key said B.
//
// Each case exports a real pack, reads the key index the pack wrote
// (data-correct), then asks the inbox to score every option. The inbox must
// give 100 to that one option and 0 to the rest.

import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let pipeline, inboxMeta;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null, addToast: () => {},
    t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('view_submission_inbox_module.js');
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
}, 60000);

const quizOf = (q) => ({ id: 'quiz', type: 'quiz', title: 'Quiz', data: { questions: [q] } });

function packKeyIndex(q) {
  const html = pipeline.generateFullPackHTML([quizOf(q)], 'Quiz', false, {}, { audience: 'student', includeTeacherKey: false, includeQuiz: true, annotations: [] });
  const doc = new JSDOM(html).window.document;
  const el = doc.querySelector('.question[data-item-type="mcq"]');
  expect(el, 'the pack rendered a multiple-choice question').toBeTruthy();
  return { key: Number(el.getAttribute('data-correct')), count: el.querySelectorAll('input[type="radio"]').length };
}

function inboxScore(q, part, value) {
  const key = 'allo-response:quiz:q0:' + part;
  const grades = inboxMeta.exportedQuizAutoGrades({ responses: { [key]: value }, content: [] }, [quizOf(q)]);
  return grades[key] ? grades[key].score : null;
}

const MCQ_CASES = [
  ['key "2" among 1, 2, 3, 4 is the option 2', { type: 'mcq', question: 'What is 1 + 1?', options: ['1', '2', '3', '4'], correctAnswer: '2' }, 1],
  ['key "0" among 10, 0, 5 is the option 0', { type: 'mcq', question: 'What is 5 - 5?', options: ['10', '0', '5'], correctAnswer: '0' }, 1],
  ['options stored as numbers', { type: 'mcq', question: 'What is 1 + 1?', options: [1, 2, 3, 4], correctAnswer: '2' }, 1],
  ['key "3" among 3, 6, 9', { type: 'mcq', question: 'What is 1 + 2?', options: ['3', '6', '9'], correctAnswer: '3' }, 0],
  ['a real number is still an index', { type: 'mcq', question: 'What is 1 + 1?', options: ['1', '2', '3', '4'], correctAnswer: 2 }, 2],
  ['a one-letter option beats the letter position', { type: 'mcq', question: 'Which letter is second?', options: ['C', 'A', 'B'], correctAnswer: 'B' }, 2],
  ['a letter key still works', { type: 'mcq', question: 'Pick one', options: ['red', 'green', 'blue'], correctAnswer: 'B' }, 1],
  ['a digit key with word options is an index', { type: 'mcq', question: 'Pick one', options: ['red', 'green', 'blue'], correctAnswer: '2' }, 2],
  ['true/false with no options list', { type: 'true-false', question: 'Water is wet.', correctAnswer: 'False' }, 1],
  ['true/false with a boolean key', { type: 'true-false', question: 'Water is wet.', correctAnswer: true }, 0],
];

describe('Submission Inbox scores multiple choice against the same key the pack uses', () => {
  for (const [name, q, expected] of MCQ_CASES) {
    it(name, () => {
      const pack = packKeyIndex(q);
      expect(pack.key).toBe(expected);
      for (let i = 0; i < pack.count; i++) {
        expect(inboxScore(q, 'mcq', String(i)), 'option ' + i).toBe(i === pack.key ? 100 : 0);
      }
    });
  }

  it('multi-select with number options: the key 2, 4 means those options, not positions 2 and 4', () => {
    const q = { type: 'multi-select', question: 'Which are even?', options: ['1', '2', '3', '4'], correctAnswers: ['2', '4'] };
    expect(inboxScore(q, 'multi', JSON.stringify(['1', '3']))).toBe(100);
    expect(inboxScore(q, 'multi', JSON.stringify(['2']))).toBe(0);
    expect(inboxScore(q, 'multi', JSON.stringify(['1']))).toBe(50);
  });

  it('multi-select keyed by real indexes is unchanged', () => {
    const q = { type: 'multi-select', question: 'Which are even?', options: ['1', '2', '3', '4'], correctIndices: [1, 3] };
    expect(inboxScore(q, 'multi', JSON.stringify(['1', '3']))).toBe(100);
    expect(inboxScore(q, 'multi', JSON.stringify(['0', '2']))).toBe(0);
  });
});
