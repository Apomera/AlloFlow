// fix1025 (coordinator): a "Teacher release" quiz is exported to students like a
// graded one. A file has no release step, so the student copy carries no key and
// no self-check; the teacher copy keeps the key.
import { beforeAll, describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const MODULE = process.env.FIX1025_COORD_DOC_MOD || 'doc_pipeline_module.js';

const quiz = timing => ({ id: 'quiz-r', type: 'quiz', title: 'Planets check', data: {
  title: 'Planets check', deliverySettings: { profile: 'flexible', feedbackTiming: timing },
  questions: [
    { type: 'mcq', question: 'Closest planet to the Sun?', options: ['Venus', 'Mercury', 'Mars'], correctAnswer: 'Mercury' },
    { type: 'short-answer', question: 'Why is Mercury hot?', expectedAnswer: 'MODEL_ANSWER_TEXT' },
  ] } });

describe('teacher-release quiz: student HTML export', () => {
  let pipeline;
  beforeAll(() => {
    window.React = window.React || React;
    loadAlloModule('export_handlers_module.js');
    new Function(fs.readFileSync(MODULE, 'utf8'))();
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Quiz',
      state: { currentUiLanguage: 'English', isParentMode: false, isIndependentMode: false }
    });
  });
  const split = item => window.AlloModules.ExportHandlers.separateStudentTeacherHtml(
    pipeline.generateFullPackHTML([item], 'Planets', false, {}, { includeTeacherKey: true, includeQuiz: true }));

  it('the student file has no key and no self-check; the teacher copy keeps the key', () => {
    const { studentHtml, teacherHtml } = split(quiz('teacher-release'));
    const doc = new DOMParser().parseFromString(studentHtml, 'text/html');
    const mcq = doc.querySelector('.question[data-item-type="mcq"]');
    expect(mcq).not.toBeNull();
    expect(mcq.getAttribute('data-correct')).toBe('');
    expect(doc.querySelector('.quiz-check-btn')).toBeNull();
    expect(doc.body.textContent).toContain('Your teacher will check your answers.');
    expect(studentHtml.includes('MODEL_ANSWER_TEXT')).toBe(false);
    expect(teacherHtml.includes('MODEL_ANSWER_TEXT')).toBe(true);
  });
});
