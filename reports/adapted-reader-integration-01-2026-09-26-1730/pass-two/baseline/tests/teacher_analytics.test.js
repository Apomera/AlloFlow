// Logic-characterization tests for teacher_module.js analytics — the class-wide
// metrics teachers read on the dashboard.
//
// WHY (assessment-integrity): calculateAnalyticsMetrics computes average quiz score,
// quiz completion rate, average adventure level, and the top "misconceptions"
// (most-missed questions) — numbers teachers act on. The notebook quality signals
// (Cornell summary rate, CER length, reading-evidence rate, etc.) drive instructional
// decisions against research thresholds. Only the live-quiz routing rules were
// previously tested. We pin the metric math against hand-computed fixtures.
//
// Functions are module-top-level; exposed via a read-only seam
// (window.AlloModules.TeacherAnalyticsInternals). Loading the module runs React.memo
// at top level, so real React is installed first.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let M;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('teacher_module.js');
  M = window.AlloModules.TeacherAnalyticsInternals;
  if (!M || !M.calculateAnalyticsMetrics) throw new Error('TeacherAnalyticsInternals seam not present');
});

// quiz history helper
const quiz = (id, questions) => ({ id, type: 'quiz', data: { questions } });
const adv = (level) => ({ type: 'adventure', data: { level } });

describe('calculateAnalyticsMetrics — empty / guard cases', () => {
  it('empty array → all-zero metrics + no misconceptions', () => {
    expect(M.calculateAnalyticsMetrics([])).toEqual({ averageScore: 0, quizCompletionRate: 0, avgAdventureLevel: 0, misconceptions: [] });
  });
  it('null / non-array → all-zero metrics', () => {
    expect(M.calculateAnalyticsMetrics(null)).toMatchObject({ averageScore: 0, quizCompletionRate: 0 });
    expect(M.calculateAnalyticsMetrics({})).toMatchObject({ averageScore: 0 });
  });
});

describe('calculateAnalyticsMetrics — score / completion / adventure math', () => {
  const data = [
    {
      history: [
        quiz('q1', [
          { question: 'Q1', correctAnswer: 'A', options: ['A', 'B'] },
          { question: 'Q2', correctAnswer: 'B', options: ['A', 'B'] },
        ]),
        adv(3),
      ],
      responses: { q1: { 0: 'A', 1: 'A' } }, // Q1 right, Q2 wrong → 50%
    },
    {
      history: [
        quiz('q2', [
          { question: 'Q3', correctAnswer: 'X', options: ['X', 'Y'] },
          { question: 'Q4', correctAnswer: 'Y', options: ['X', 'Y'] },
        ]),
      ],
      responses: { q2: { 0: 'X', 1: 'Y' } }, // both right → 100%
    },
  ];
  it('averageScore is the mean of per-quiz percentages (50, 100 → 75)', () => {
    expect(M.calculateAnalyticsMetrics(data).averageScore).toBe(75);
  });
  it('quizCompletionRate = students with >=1 quiz / total (2/2 → 100)', () => {
    expect(M.calculateAnalyticsMetrics(data).quizCompletionRate).toBe(100);
  });
  it('avgAdventureLevel averages only students with adventure data (just student 1 → 3)', () => {
    expect(M.calculateAnalyticsMetrics(data).avgAdventureLevel).toBe(3);
  });
  it('misconceptions surfaces the missed question (Q2)', () => {
    expect(M.calculateAnalyticsMetrics(data).misconceptions).toEqual([{ question: 'Q2', count: 1 }]);
  });
  it('resolves a numeric option index to its option text when comparing', () => {
    // response 0 → options[0]='A' (correct); response 1 → options[1]='B' (wrong for correctAnswer 'A')
    const d = [{ history: [quiz('qz', [{ question: 'Qa', correctAnswer: 'A', options: ['A', 'B'] }])], responses: { qz: { 0: 0 } } }];
    expect(M.calculateAnalyticsMetrics(d).averageScore).toBe(100);
  });
  it('an unanswered question counts as missed', () => {
    const d = [{ history: [quiz('qz', [{ question: 'Solo', correctAnswer: 'A', options: ['A', 'B'] }])], responses: {} }];
    const r = M.calculateAnalyticsMetrics(d);
    expect(r.averageScore).toBe(0);
    expect(r.misconceptions).toEqual([{ question: 'Solo', count: 1 }]);
  });
  it('misconceptions are sorted by frequency and capped at top 5', () => {
    // 6 distinct missed questions across 2 students; the most-missed first, only 5 returned
    const mk = (n) => quiz('qq' + n, [{ question: 'M' + n, correctAnswer: 'A', options: ['A', 'B'] }]);
    const students = [];
    // M1 missed by 2 students, M2..M6 missed by 1 each
    for (let s = 0; s < 2; s++) students.push({ history: [mk(1)], responses: {} });
    for (let n = 2; n <= 6; n++) students.push({ history: [mk(n)], responses: {} });
    const r = M.calculateAnalyticsMetrics(students);
    expect(r.misconceptions).toHaveLength(5);
    expect(r.misconceptions[0]).toEqual({ question: 'M1', count: 2 });
  });
  it('rounds every metric to one decimal place', () => {
    // 3 quizzes: 100, 100, 0 → 66.666… → 66.7
    const d = [
      { history: [quiz('a', [{ question: 'a', correctAnswer: 'A', options: ['A'] }])], responses: { a: { 0: 'A' } } },
      { history: [quiz('b', [{ question: 'b', correctAnswer: 'A', options: ['A'] }])], responses: { b: { 0: 'A' } } },
      { history: [quiz('c', [{ question: 'c', correctAnswer: 'A', options: ['A', 'B'] }])], responses: { c: { 0: 'B' } } },
    ];
    expect(M.calculateAnalyticsMetrics(d).averageScore).toBe(66.7);
  });
});

describe('computeNotebookQualitySignals — registry-dispatched quality signals', () => {
  it('empty data → fixed envelope with null values', () => {
    const r = M.computeNotebookQualitySignals([]);
    expect(r.summaryFillRate).toEqual({ value: null, count: 0, total: 0 });
    expect(r.avgCues).toMatchObject({ value: null });
    expect(r.avgCerWords).toMatchObject({ value: null });
    expect(r.rrEvidenceRate).toMatchObject({ value: null });
  });
  it('computes Cornell summary rate, CER length, and reading-evidence rate from notebook history', () => {
    const note = (data) => ({ type: 'note-taking', data });
    const data = [
      { history: [
        note({ templateType: 'cornell-notes', summary: 'word '.repeat(25), cues: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }, { text: 'e' }] }),
        note({ templateType: 'lab-report', analysis: 'w '.repeat(35) }),
      ] },
      { history: [
        note({ templateType: 'cornell-notes', summary: 'too short', cues: [{ text: 'a' }, { text: 'b' }] }),
        note({ templateType: 'reading-response', favoriteLine: 'a quote', connection: { type: 'text-to-self' } }),
      ] },
    ];
    const r = M.computeNotebookQualitySignals(data);
    expect(r.summaryFillRate.value).toBe(50); // 1 of 2 cornell entries has >=20-word summary
    expect(r.avgCerWords.value).toBe(35);     // one lab report, 35 words
    expect(r.rrEvidenceRate.value).toBe(100); // 1 of 1 reading responses has a favorite line
    expect(parseFloat(r.avgCues.value)).toBeCloseTo(3.5, 5); // (5+2)/2 cues per entry
  });
});

describe('computeAllQualitySignals — new template signals (double-entry / guided / Q&A)', () => {
  const note = (data) => ({ type: 'note-taking', data });
  it('surfaces double-entry response rate, guided completion, and Q&A answer rate', () => {
    const data = [
      { history: [
        // double-entry: entry A has a substantive (>=15-word) response, entry B does not → 1/2 = 50%
        note({ templateType: 'double-entry', entries: [{ quote: 'q1', response: 'word '.repeat(20) }] }),
        note({ templateType: 'double-entry', entries: [{ quote: 'q2', response: 'short' }] }),
        // guided-notes: 2 of 4 blanks filled → 50%
        note({ templateType: 'guided-notes', blanks: [
          { answer: 'a', studentAnswer: 'a' }, { answer: 'b', studentAnswer: 'b' },
          { answer: 'c', studentAnswer: '' }, { answer: 'd', studentAnswer: '' },
        ] }),
        // q-and-a: 2 of 3 questions answered → 67%
        note({ templateType: 'q-and-a', pairs: [
          { question: 'Q1?', answer: 'A1' }, { question: 'Q2?', answer: 'A2' }, { question: 'Q3?', answer: '' },
        ] }),
      ] },
    ];
    const flat = M.computeAllQualitySignals(data);
    const byKey = Object.fromEntries(flat.map(s => [s.key, s]));
    expect(byKey.deResponseRate.value).toBe(50);   // 1 of 2 double-entry entries has a substantive response
    expect(byKey.guidedCompletion.value).toBe(50); // 2/4 blanks filled
    expect(byKey.qaAnswerRate.value).toBe(67);     // 2/3 answered, rounded
    // every signal carries a real denom string (regression guard for the 0/0 bug)
    flat.forEach(s => expect(typeof s.denom === 'string' && s.denom.length > 0).toBe(true));
  });
});

describe('computeCrossToolMisconceptions — envelope', () => {
  it('empty data → the three category arrays, all empty', () => {
    const r = M.computeCrossToolMisconceptions([]);
    expect(r).toMatchObject({ noteTaking: [], sentenceFrames: [], conceptSort: [] });
  });
  it('does not throw on well-formed notebook data and keeps category arrays', () => {
    const data = [{ history: [{ type: 'note-taking', data: { templateType: 'cornell-notes', summary: 'x', cues: [] } }] }];
    const r = M.computeCrossToolMisconceptions(data);
    expect(Array.isArray(r.noteTaking)).toBe(true);
    expect(Array.isArray(r.conceptSort)).toBe(true);
  });
  it('flags a class-wide gap in a new template type (guided-notes blanks left empty)', () => {
    const note = (data) => ({ type: 'note-taking', data });
    // 3 guided-notes entries, all with <half the blanks filled → should surface
    const emptyGuided = note({ templateType: 'guided-notes', blanks: [
      { answer: 'a', studentAnswer: '' }, { answer: 'b', studentAnswer: '' }, { answer: 'c', studentAnswer: '' },
    ], notesExtra: '' });
    const data = [
      { history: [emptyGuided, emptyGuided] },
      { history: [emptyGuided] },
    ];
    const r = M.computeCrossToolMisconceptions(data);
    const guidedGap = r.noteTaking.find(p => p.template === 'Guided Notes' && p.field === 'blanksFilled');
    expect(guidedGap).toBeTruthy();
    expect(guidedGap.missingPct).toBeGreaterThanOrEqual(40);
  });
});
