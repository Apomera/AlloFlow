// Submission Inbox: where an automatic score came from (2026-11-16).
//
// Two things were wrong in how the inbox recorded a score it worked out itself.
//
// 1. Every automatic score was stamped origin 'teacher-edit', the stamp for a
//    score the teacher typed. In the saved gradebook a machine score could not
//    be told from a teacher's.
// 2. When the open project had no copy of the quiz, the inbox scored against
//    the copy inside the student's own file and said nothing. A file whose key
//    had been changed (or was simply out of date) gave a wrong answer 100.
//
// An automatic score now carries its own origin, and the inbox scores only
// against the teacher's own copy. What it could not check is offered to the
// teacher, who can score it with the copy in the student's file by pressing a
// button; such a score is marked on screen and in the saved gradebook.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, createRoot, act, meta, SubmissionInbox;
let root = null;
let host = null;
const timerTick = () => new Promise(r => setTimeout(r, 10));

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
  ({ act } = React);
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_submission_inbox_module.js');
  meta = window.AlloModules.SubmissionInbox._meta;
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
}, 60000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  localStorage.removeItem('alloflow_offline_grades');
});

const KEY = 'allo-response:quizA:q0:mcq';
const quiz = (correctAnswer, id = 'quizA') => ({
  id, type: 'quiz', title: 'Capitals',
  data: { questions: [{ type: 'mcq', question: 'Capital of France?', options: ['Paris', 'Rome', 'Oslo'], correctAnswer }] },
});
const teacherQuiz = quiz('Paris');
const changedKeyQuiz = quiz('Rome');          // the copy inside the student's file, with the key changed
const pickedRome = { [KEY]: '1' };            // a wrong answer

describe('an automatic score is not recorded as a score the teacher typed', () => {
  it('stamps every kind of automatic score with the answer-key origin', () => {
    const mixed = {
      id: 'quizM', type: 'quiz', data: { questions: [
        { type: 'mcq', question: 'Pick', options: ['red', 'green', 'blue'], correctAnswer: 'green' },
        { type: 'multi-select', question: 'Pick two', options: ['a', 'b', 'c'], correctAnswers: ['a', 'c'] },
        { type: 'fill-blank', question: 'Water is ___', expectedFill: 'wet' },
      ] },
    };
    const grades = meta.exportedQuizAutoGrades({
      responses: { 'allo-response:quizM:q0:mcq': '1', 'allo-response:quizM:q1:multi': '[0,2]', 'allo-response:quizM:q2:fill': 'wet' },
      content: [],
    }, [mixed]);
    expect(Object.keys(grades)).toHaveLength(3);
    Object.values(grades).forEach((grade) => {
      expect(grade.score).toBe(100);
      expect(grade.origin).toBe('answer-key');
    });
  });

  it('keeps that origin when a grade is saved, and still tells it from a typed score', () => {
    expect(meta.gradeOrigin('answer-key')).toBe('answer-key');
    expect(meta.gradeOrigin('answer-key-student-file')).toBe('answer-key-student-file');
    expect(meta.gradeOrigin('teacher-edit')).toBe('teacher-edit');
    expect(meta.gradeOrigin('something-else')).toBe('legacy');
    const grade = (origin) => ({ [KEY]: { score: 100, status: 'correct', feedback: 'same', origin } });
    expect(meta.gradeReviewSignature(grade('answer-key'))).not.toBe(meta.gradeReviewSignature(grade('teacher-edit')));
  });
});

describe('which copy of the answer key an automatic score uses', () => {
  it('uses the teacher project copy whenever the project has the quiz', () => {
    const payload = { responses: pickedRome, content: [changedKeyQuiz] };
    expect(meta.exportedQuizAutoGrades(payload, [teacherQuiz])[KEY]).toMatchObject({ score: 0, status: 'incorrect', origin: 'answer-key' });
    expect(Object.keys(meta.studentCopyOnlyGrades(payload, [teacherQuiz]))).toEqual([]);
  });

  it.each([
    ['the open project has no quiz at all', []],
    ['the open project holds a different quiz', [quiz('Oslo', 'another-quiz')]],
  ])('does not score from the student file by itself: %s', (_label, history) => {
    const payload = { responses: pickedRome, content: [changedKeyQuiz] };
    // The case under review: the changed key in the file used to give this wrong answer 100.
    expect(meta.exportedQuizAutoGrades(payload, history)[KEY]).toBeUndefined();
    // It is offered instead, marked with where its key came from.
    expect(meta.studentCopyOnlyGrades(payload, history)[KEY]).toMatchObject({ score: 100, origin: 'answer-key-student-file', keySource: 'student-file' });
  });

  it('treats other auto-scored activities the same way (concept sort)', () => {
    const sort = { id: 'sortA', type: 'concept-sort', data: { categories: [{ id: 'c1', label: 'Mammals' }, { id: 'c2', label: 'Birds' }], items: [{ content: 'Bat', categoryId: 'c1' }] } };
    const key = 'allo-response:sortA:concept-sort:0:category';
    const payload = { responses: { [key]: 'c1' }, content: [sort] };
    expect(meta.exportedQuizAutoGrades(payload, [])[key]).toBeUndefined();
    expect(meta.studentCopyOnlyGrades(payload, [])[key]).toMatchObject({ score: 100, origin: 'answer-key-student-file' });
    expect(meta.exportedQuizAutoGrades(payload, [sort])[key]).toMatchObject({ score: 100, origin: 'answer-key' });
  });

  it('offers only what the project could not score when a file mixes both', () => {
    const other = quiz('Oslo', 'quizB');
    const otherKey = 'allo-response:quizB:q0:mcq';
    const payload = { responses: { ...pickedRome, [otherKey]: '2' }, content: [changedKeyQuiz, other] };
    expect(Object.keys(meta.exportedQuizAutoGrades(payload, [teacherQuiz]))).toEqual([KEY]);
    expect(Object.keys(meta.studentCopyOnlyGrades(payload, [teacherQuiz]))).toEqual([otherKey]);
  });
});

// A pack names an activity's answers by the activity's id, and by its type
// ("quiz") only when the activity has no id. The inbox used to resolve the
// type name to the FIRST quiz in the open project, whatever that quiz was, so
// answers from one quiz were scored against another quiz's key.
describe('answers saved under a type name instead of an id', () => {
  const TYPE_KEY = 'allo-response:quiz:q0:mcq';
  const noId = (correctAnswer, question = 'Capital of France?') => ({
    type: 'quiz', title: 'No id', data: { questions: [{ type: 'mcq', question, options: ['Paris', 'Rome', 'Oslo'], correctAnswer }] },
  });
  const picked = (value) => ({ responses: { [TYPE_KEY]: value }, content: [] });

  it('are not scored against a quiz that has an id of its own', () => {
    // Before: scored against quizA (key Paris), so "Rome" came back as a confident 0
    // and "Paris" as 100, although these answers belong to some other quiz.
    expect(meta.exportedQuizAutoGrades(picked('1'), [teacherQuiz])[TYPE_KEY]).toBeUndefined();
    expect(meta.exportedQuizAutoGrades(picked('0'), [teacherQuiz, quiz('Oslo', 'quizB')])[TYPE_KEY]).toBeUndefined();
  });

  it('are scored when the project has exactly one quiz with no id', () => {
    expect(meta.exportedQuizAutoGrades(picked('1'), [teacherQuiz, noId('Rome')])[TYPE_KEY]).toMatchObject({ score: 100, origin: 'answer-key' });
    expect(meta.exportedQuizAutoGrades(picked('0'), [noId('Rome')])[TYPE_KEY]).toMatchObject({ score: 0, origin: 'answer-key' });
  });

  it('are left alone when two quizzes have no id, because either could be meant', () => {
    expect(meta.exportedQuizAutoGrades(picked('1'), [noId('Rome'), noId('Oslo', 'Capital of Norway?')])[TYPE_KEY]).toBeUndefined();
  });

  it('still work for a quiz whose id really is "quiz"', () => {
    expect(meta.exportedQuizAutoGrades(picked('1'), [quiz('Rome', 'quiz'), teacherQuiz])[TYPE_KEY]).toMatchObject({ score: 100 });
  });

  it('follow the same rule for other activities (concept sort)', () => {
    const sort = (id) => ({ ...(id ? { id } : {}), type: 'concept-sort', data: { categories: [{ id: 'c1', label: 'Mammals' }, { id: 'c2', label: 'Birds' }], items: [{ content: 'Bat', categoryId: 'c1' }] } });
    const key = 'allo-response:concept-sort:concept-sort:0:category';
    const payload = { responses: { [key]: 'c1' }, content: [] };
    expect(meta.exportedQuizAutoGrades(payload, [sort('sortA')])[key]).toBeUndefined();
    expect(meta.exportedQuizAutoGrades(payload, [sort('sortA'), sort(null)])[key]).toMatchObject({ score: 100 });
  });
});

describe('in the inbox itself', () => {
  const button = (scope, label) => Array.from(scope.querySelectorAll('button')).find(b => b.textContent.replace(/\s+/g, ' ').trim().includes(label));
  async function mountAndView(history) {
    const addToast = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(SubmissionInbox, {
        isOpen: true, onClose: vi.fn(), rosterKey: '', t: (k, f) => f || k, addToast, onOpenAlloSheet: vi.fn(), history,
      }));
      await timerTick();
    });
    const payload = {
      kind: 'alloflow-student-submission', schemaVersion: 2, nickname: 'Learner1', studentName: 'Learner1',
      docTitle: 'Capitals', timestamp: '2026-11-16T10:00:00.000Z', content: [changedKeyQuiz], responses: pickedRome, answers: pickedRome,
    };
    const text = JSON.stringify(payload);
    const file = new File([text], 'learner.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
    const input = host.querySelector('input[aria-label="Submission files"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await timerTick(); await timerTick(); });
    await act(async () => button(host, 'View').click());
    return { toasts: () => addToast.mock.calls.map(c => String(c[0])) };
  }
  const savedGrade = async () => {
    await act(async () => button(host, 'Save to gradebook').click());
    return Object.values(JSON.parse(localStorage.getItem('alloflow_offline_grades')))[0].grades[KEY];
  };

  it('with no copy in the project: nothing is scored, the teacher is told why, and one button scores it knowingly', async () => {
    const ui = await mountAndView([]);
    // No automatic scoring is on offer, and nothing has been scored.
    expect(button(host, 'Auto-score objective items')).toBeUndefined();
    const offer = host.querySelector('[data-si-student-copy-offer]');
    expect(offer.textContent).toMatch(/1 answer\(s\) here could not be checked, because this project has no copy of that activity/);
    expect(host.querySelector('[data-si-key-source]')).toBeNull();

    await act(async () => button(offer, "Score with the copy in the student's file").click());
    expect(ui.toasts().join(' ')).toMatch(/Scored 1 response\(s\) with the answer key inside the student's file/);
    expect(host.querySelector('[data-si-student-copy-offer]')).toBeNull();
    expect(host.querySelector('[data-si-key-source="student-file"]').textContent).toMatch(/student's file/);
    expect(host.textContent).toContain('1 of 1');
    expect(button(host, 'Edit score')).toBeTruthy();
    expect(await savedGrade()).toMatchObject({ score: 100, origin: 'answer-key-student-file', keySource: 'student-file' });
  });

  it('with the quiz in the project: auto-score uses the teacher key and nothing is offered', async () => {
    const ui = await mountAndView([teacherQuiz]);
    expect(host.querySelector('[data-si-student-copy-offer]')).toBeNull();
    await act(async () => button(host, 'Auto-score objective items').click());
    expect(ui.toasts().join(' ')).toMatch(/Auto-scored 1 objective quiz response/);
    expect(ui.toasts().join(' ')).not.toMatch(/student's file|could not be checked/);
    expect(host.querySelector('[data-si-key-source]')).toBeNull();
    expect(host.textContent).toContain('1 of 1');
    expect(await savedGrade()).toMatchObject({ score: 0, origin: 'answer-key' });
  });
});
