// Student-bound copies (homework QR, mailbox, pack file, live session doc)
// must not carry teacher working data. FIX0927_AAC_SRC / FIX0927_FS_SRC point
// the test at saved pre-fix copies for mutation checks.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildLiveAacModule } = require('../_build_live_aac_module.js');

const load = (quizView) => {
  const win = { React: {}, AlloModules: quizView ? { QuizView: quizView } : {} };
  new Function('window', fs.readFileSync(process.env.FIX0927_FS_SRC || 'firestore_sync_module.js', 'utf8'))(win);
  new Function('window', buildLiveAacModule(fs.readFileSync(process.env.FIX0927_AAC_SRC || 'live_aac_source.jsx', 'utf8')))(win);
  const pack = item => win.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined });
  const live = item => win.prepareSessionResourcesForWrite([item]).resources[0];
  return { win, pack, live };
};
const quiz = () => ({ id: 'q1', type: 'quiz', title: 'Quiz', data: {
  distractorReview: { weakItems: [1], misconceptionCount: 1 },
  questions: [
    { type: 'mcq', question: 'Which is a mammal?', options: ['Shark', 'Whale'], correctAnswer: 'Shark',
      factCheck: '[[KEY: DISPUTED: 2]] CORRECTION / WARNING: Actual Correct Answer: Whale',
      keyCheck: { status: 'disputed', suggestedAnswer: 'Whale', checkedKey: 'Shark' },
      distractorQuality: [{ distractor: 'Whale', encodesMisconception: true, reason: 'TEACHER ONLY distractor note' }] },
    { type: 'mcq', question: '2+2?', options: ['3', '4'], correctAnswer: '4',
      factCheck: '[[KEY: CONFIRMED]] Verified Correct Answer: 4 because two pairs make four.',
      keyCheck: { status: 'confirmed', checkedKey: '4', sources: ['TEACHER ONLY source list'] } },
    { type: 'mcq', question: 'Sky colour?', options: ['Blue', 'Red'], correctAnswer: 'Red',
      factCheck: 'Blue light scatters most.', keyCheck: { status: 'confirmed', checkedKey: 'Blue' } },
    { type: 'short-answer', question: 'Why?', expectedAnswer: 'MODEL ANSWER TEXT' }
  ] } });
const dbq = () => ({ id: 'd1', type: 'dbq', title: 'DBQ', data: { documents: [{ title: 'A', excerpt: 'Primary text' }], teacherNotes: 'TEACHER ONLY scoring guidance' } });
const aid = () => ({ id: 'm1', type: 'memory-aid', title: 'Aid', data: { cards: [{ term: 'Cell', definition: 'Unit of life', factCheck: 'TEACHER ONLY aid check', visualCheck: { verdict: 'TEACHER ONLY critique' } }] } });

function expectStudentSafe(out) {
  const text = JSON.stringify(out);
  expect(text).not.toContain('Actual Correct Answer');
  expect(text).not.toContain('suggestedAnswer');
  expect(text).not.toContain('TEACHER ONLY');
  expect(text).not.toContain('distractorReview');
}

describe('student projection strips teacher working data', () => {
  for (const [route, pick] of [['student pack (QR, mailbox, file)', 'pack'], ['live session document', 'live']]) {
    it(route + ': quiz keeps learner explanations but no disputed checks or teacher QA', () => {
      const api = load()[pick];
      const out = api(quiz());
      expectStudentSafe(out);
      const [disputed, confirmed, stale, written] = out.data.questions;
      expect(disputed.factCheck).toBeUndefined();
      expect(disputed.keyCheck).toBeUndefined();
      expect(disputed.distractorQuality).toBeUndefined();
      // A confirmed check is the explanation students already see after answering.
      expect(confirmed.factCheck).toContain('two pairs make four');
      expect(confirmed.keyCheck).toEqual({ status: 'confirmed', checkedKey: '4' });
      expect(stale.factCheck).toBeUndefined();
      expect(stale.keyCheck).toBeUndefined();
      // Answer keys stay for self-check (decision recorded for the owner).
      expect(confirmed.correctAnswer).toBe('4');
      expect(written.expectedAnswer).toBe('MODEL ANSWER TEXT');
    });
    it(route + ': DBQ teacher notes and Memory Aid checks are removed', () => {
      const api = load()[pick];
      const d = api(dbq()), m = api(aid());
      expectStudentSafe(d); expectStudentSafe(m);
      expect(d.data.documents[0].excerpt).toBe('Primary text');
      expect(m.data.cards[0].definition).toBe('Unit of life');
      expect(m.data.cards[0].factCheck).toBeUndefined();
    });
  }
  it('uses the quiz view key-quality rule when it is loaded', () => {
    const calls = [];
    const { pack, live } = load({ keyQuality: { studentExplanation: (q, facilitated) => { calls.push(facilitated); return q.question === '2+2?' ? 'shown' : ''; } } });
    for (const out of [pack(quiz()), live(quiz())]) {
      expect(out.data.questions.map(q => !!q.factCheck)).toEqual([false, true, false, false]);
    }
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(Boolean)).toBe(true);
  });
  it('never packs an imported Applied Challenge submission copy', () => {
    const { pack } = load();
    expect(pack({ id: 'ac1', type: 'applied-challenge', title: 'AC', data: { submissionCopy: { nickname: 'Sam' }, prompt: 'Build it' } })).toBeNull();
    expect(pack({ id: 'ac2', type: 'applied-challenge', title: 'AC', data: { prompt: 'Build it' } })).not.toBeNull();
  });
  it('does not mutate the teacher resource', () => {
    const { pack, live } = load();
    const source = quiz(), before = JSON.stringify(source);
    pack(source); live(source);
    expect(JSON.stringify(source)).toBe(before);
  });
});
