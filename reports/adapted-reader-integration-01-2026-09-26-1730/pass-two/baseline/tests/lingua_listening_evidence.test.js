import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Lingua;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [value, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
  if (!Lingua) throw new Error('LinguaPractice did not register');
});

function helper(name) {
  expect(typeof Lingua?.[name], `${name} must remain exported`).toBe('function');
  return Lingua[name];
}

describe('Lingua privacy-safe listening evidence', () => {
  it('uses stable opaque IDs when listening content is reordered', () => {
    const listeningItems = helper('_listeningItems');
    const lesson = {
      phrases: [
        { target: 'Bonjour.', translation: 'Hello.' },
        { target: 'Merci beaucoup.', translation: 'Thank you very much.' },
      ],
    };
    const before = listeningItems(lesson, [], 'French');
    const after = listeningItems({ phrases: lesson.phrases.slice().reverse() }, [], 'French');

    expect(before.map((item) => item.id).sort()).toEqual(after.map((item) => item.id).sort());
    expect(before[0].id).toMatch(/^listening-[a-z0-9]+$/);
    expect(before[0].id).not.toContain('Bonjour');
  });

  it('records only scope, mode, outcome band, support flags, and time', () => {
    const append = helper('_appendListeningEvidence');
    const privateAnswer = 'PRIVATE TYPED ANSWER';
    const privateTarget = 'PRIVATE EXPECTED TARGET';
    const privateFeedback = 'PRIVATE AI FEEDBACK';
    const progress = append({}, {
      id: 'listening-stable123',
      target: privateTarget,
      translation: 'PRIVATE MEANING',
      transcript: 'PRIVATE TRANSCRIPT',
      audio: 'PRIVATE AUDIO',
    }, {
      score: 82,
      correct: true,
      exact: false,
      actual: privateAnswer,
      expected: privateTarget,
      feedback: privateFeedback,
    }, {
      language: 'French',
      practiceSetId: 'set-alpha',
      assignmentId: 'assignment-alpha',
      assignmentRevision: 4,
      mode: 'dictation',
      replay: true,
      slow: true,
      hint: false,
    }, 1700000000000);

    expect(progress.listeningEvidence).toEqual([{
      id: 'listening-1700000000000-listening-stable123',
      language: 'French',
      practiceSetId: 'set-alpha',
      assignmentId: 'assignment-alpha',
      assignmentRevision: 4,
      itemId: 'listening-stable123',
      mode: 'dictation',
      outcome: 'near',
      replay: true,
      slow: true,
      hint: false,
      at: 1700000000000,
    }]);

    const serialized = JSON.stringify(progress.listeningEvidence);
    [privateAnswer, privateTarget, privateFeedback, 'PRIVATE MEANING', 'PRIVATE TRANSCRIPT', 'PRIVATE AUDIO']
      .forEach((secret) => expect(serialized).not.toContain(secret));
  });

  it('normalizes, strictly whitelists, sorts, and caps persisted evidence', () => {
    const normalize = helper('_normalizeListeningEvidence');
    const oversized = Array.from({ length: 205 }, (_, index) => ({
      id: `attempt-${index}`,
      language: 'French',
      practiceSetId: 'set-alpha',
      assignmentId: 'assignment-alpha',
      assignmentRevision: 2,
      itemId: `listening-${index}`,
      mode: index % 2 ? 'choice' : 'dictation',
      outcome: index % 3 === 0 ? 'exact' : index % 3 === 1 ? 'near' : 'no-match',
      replay: index % 2 === 0,
      slow: index % 4 === 0,
      hint: index % 5 === 0,
      at: index,
      typedAnswer: 'PRIVATE ANSWER',
      expected: 'PRIVATE TARGET',
      transcript: 'PRIVATE TRANSCRIPT',
      feedback: 'PRIVATE FEEDBACK',
    }));
    oversized.push({ language: 'French', itemId: 'bad-mode', mode: 'essay', outcome: 'exact', at: 999 });

    const result = normalize(oversized);
    expect(result).toHaveLength(200);
    expect(result[0]).toMatchObject({ id: 'attempt-204', itemId: 'listening-204', at: 204 });
    expect(result.at(-1).at).toBe(5);
    expect(Object.keys(result[0]).sort()).toEqual([
      'assignmentId', 'assignmentRevision', 'at', 'hint', 'id', 'itemId', 'language',
      'mode', 'outcome', 'practiceSetId', 'replay', 'slow',
    ].sort());
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|typedAnswer|expected|transcript|feedback/);
  });

  it('shares only current assignment/revision evidence and exposes honest bounded aggregates', () => {
    const createLearningRecord = helper('_createLearningRecord');
    const summary = helper('_listeningEvidenceSummary');
    const assignment = {
      id: 'assignment-alpha',
      practiceSetId: 'set-alpha',
      title: 'French listening',
      revision: 2,
      targets: { listeningAttempts: 3 },
      createdAt: 1000,
      updatedAt: 1100,
    };
    const base = {
      language: 'French', practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha',
      itemId: 'listening-current', mode: 'dictation', replay: false, slow: false, hint: false,
    };
    const progress = {
      activityLog: [{ id: 'listen-activity', language: 'French', kind: 'listeningAttempts', count: 3, at: 2000, practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 2 }],
      listeningEvidence: [
        { ...base, id: 'listen-exact', assignmentRevision: 2, outcome: 'exact', at: 2200 },
        { ...base, id: 'listen-near', assignmentRevision: 2, outcome: 'near', replay: true, slow: true, hint: true, at: 2100 },
        { ...base, id: 'listen-old-revision', assignmentRevision: 1, outcome: 'no-match', at: 2300, expected: 'PRIVATE OLD TARGET' },
        { ...base, id: 'listen-other-assignment', assignmentId: 'assignment-beta', assignmentRevision: 2, outcome: 'no-match', at: 2400, typedAnswer: 'PRIVATE OTHER ANSWER' },
      ],
    };

    const record = createLearningRecord(
      { known: 'English', target: 'French', level: 'Beginner' },
      progress,
      { title: 'French listening', vocabulary: [] },
      'set-alpha',
      { assignment, learnerCodename: 'Moon' },
      3000,
    );

    expect(record.listeningEvidence.map((item) => item.id)).toEqual(['listen-exact', 'listen-near']);
    expect(summary(record.listeningEvidence)).toEqual({ total: 2, exact: 1, near: 1, noMatch: 0, replay: 1, slow: 1, hint: 1 });
    expect(record.summary.listeningAttempts).toBe(3);
    expect(JSON.stringify(record)).not.toMatch(/PRIVATE OLD TARGET|PRIVATE OTHER ANSWER/);
    expect(Lingua._uiStrings.English.dashboard_listening_bands).toMatch(/not a proficiency score/i);
  });
});
