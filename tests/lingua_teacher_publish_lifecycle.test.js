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
  expect(typeof Lingua?.[name], name + ' must remain exported').toBe('function');
  return Lingua[name];
}

function profile(overrides = {}) {
  return {
    known: 'English',
    target: 'French',
    level: 'Beginner',
    topic: 'Introductions',
    dialect: '',
    register: 'Neutral',
    ...overrides,
  };
}

function practiceSet(overrides = {}) {
  const { lesson: lessonOverrides = {}, ...setOverrides } = overrides;
  return {
    id: 'set-alpha',
    language: 'French',
    name: 'French foundations',
    topic: 'Introductions',
    level: 'Beginner',
    dialect: '',
    register: 'Neutral',
    archived: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...setOverrides,
    lesson: {
      title: 'French foundations',
      goal: 'Use a greeting and one related form.',
      scenario: 'Meeting a classmate.',
      inputCharacters: [],
      vocabulary: [{
        term: 'parler',
        meaning: 'to speak',
        forms: [{ id: 'present', label: 'present', form: 'parle' }],
        example: 'Je parle.',
        translation: 'I speak.',
      }],
      phrases: [{ target: 'Bonjour.', translation: 'Hello.' }],
      conversation: [{ coach: 'Bonjour!', translation: 'Hello!', sample: 'Bonjour!' }],
      ...lessonOverrides,
    },
  };
}

function assignment(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'assignment-alpha',
    practiceSetId: 'set-alpha',
    status: 'published',
    title: 'French foundations assignment',
    instructions: 'Complete the selected activities.',
    dueDate: '2026-09-03',
    revision: 1,
    allowPersonalCopy: false,
    targets: {
      formAttempts: 2,
      spokenAttempts: 1,
      listeningAttempts: 0,
      chatTurns: 0,
      reviews: 0,
    },
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function configRecord({ historyId, savedAt, revision, title, assignmentId = 'assignment-alpha', setId = 'set-alpha', status } = {}) {
  const set = practiceSet({ id: setId, name: title || 'French foundations' });
  const metadata = assignment({
    id: assignmentId,
    practiceSetId: setId,
    revision,
    title: title || 'French foundations assignment',
  });
  if (status === undefined) delete metadata.status;
  else metadata.status = status;
  return {
    historyId,
    savedAt,
    data: {
      version: 2,
      profile: profile(),
      practiceSet: set,
      assignment: metadata,
    },
  };
}

describe('Lingua teacher publish lifecycle helpers', () => {
  it('migrates legacy ID-and-revision assignments to published while preserving explicit draft status', () => {
    const normalizeAssignment = helper('_normalizeAssignment');

    expect(normalizeAssignment({
      id: 'assignment-legacy',
      practiceSetId: 'set-alpha',
      revision: 3,
    }, 'set-alpha', 5000)).toMatchObject({
      id: 'assignment-legacy',
      practiceSetId: 'set-alpha',
      revision: 3,
      status: 'published',
    });

    expect(normalizeAssignment({
      id: 'assignment-draft',
      practiceSetId: 'set-alpha',
      revision: 3,
      status: 'draft',
    }, 'set-alpha', 5000).status).toBe('draft');

    expect(normalizeAssignment({
      id: 'assignment-invalid-state',
      practiceSetId: 'set-alpha',
      revision: 3,
      status: 'unexpected',
    }, 'set-alpha', 5000).status).toBe('invalid');
  });

  it('sanitizes, bounds, sorts, and set-binds the local assignment draft store', () => {
    const normalizeDraftStore = helper('_normalizeAssignmentDraftStore');
    const raw = {};
    for (let index = 0; index < 35; index += 1) {
      raw['set-' + index] = {
        title: 'Draft ' + index,
        updatedAt: index,
        unsafe: 'drop me',
      };
    }
    raw['set-alpha'] = {
      id: 'assignment-alpha',
      practiceSetId: 'forged-set',
      status: 'published',
      revision: 5000,
      title: '  ' + 'X '.repeat(100),
      instructions: 'I'.repeat(1200),
      dueDate: '09/03/2026',
      allowLearnerEdit: true,
      targets: { formAttempts: 900, spokenAttempts: -5 },
      createdAt: -20,
      updatedAt: 10_000,
      teacherSecret: 'drop me',
    };

    const normalized = normalizeDraftStore(raw);
    expect(Object.keys(normalized)).toHaveLength(30);
    expect(normalized).not.toHaveProperty('set-0');
    expect(normalized).toHaveProperty('set-34');
    expect(normalized['set-alpha']).toMatchObject({
      id: 'assignment-alpha',
      practiceSetId: 'set-alpha',
      status: 'draft',
      revision: 999,
      dueDate: '',
      allowPersonalCopy: true,
      createdAt: 0,
      updatedAt: 10_000,
      targets: {
        formAttempts: 200,
        spokenAttempts: 0,
        listeningAttempts: 3,
        chatTurns: 3,
        reviews: 5,
      },
    });
    expect(normalized['set-alpha'].title).toHaveLength(120);
    expect(normalized['set-alpha'].instructions).toHaveLength(1000);
    expect(normalized['set-alpha']).not.toHaveProperty('teacherSecret');
    expect(Object.entries(normalized).every(([setId, draft]) => draft.practiceSetId === setId && draft.status === 'draft')).toBe(true);
    expect(normalizeDraftStore([])).toEqual({});
    expect(normalizeDraftStore(null)).toEqual({});
  });

  it('keeps one assignment ID while publishing sequential revisions', () => {
    const draftForSave = helper('_assignmentDraftForSave');
    const assignmentForSave = helper('_assignmentForSave');

    const first = assignmentForSave({ title: 'Unit one' }, 'set-alpha', 1000, 0);
    const secondDraft = draftForSave({ ...first, title: 'Unit one revised' }, 'set-alpha', 1500);
    const second = assignmentForSave(secondDraft, 'set-alpha', 2000, 1);

    expect(first).toMatchObject({
      id: 'lingua-assignment-1000-set-alpha',
      practiceSetId: 'set-alpha',
      status: 'published',
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(second).toMatchObject({
      id: first.id,
      practiceSetId: 'set-alpha',
      status: 'published',
      revision: 2,
      createdAt: 1000,
      updatedAt: 2000,
      title: 'Unit one revised',
    });
  });

  it('uses the newest published revision as a floor for stale drafts', () => {
    const assignmentForSave = helper('_assignmentForSave');
    const stale = assignment({ revision: 1, status: 'draft' });
    const published = assignmentForSave(stale, 'set-alpha', 4000, 3);

    expect(published).toMatchObject({
      id: 'assignment-alpha',
      practiceSetId: 'set-alpha',
      status: 'published',
      revision: 4,
      createdAt: 1000,
      updatedAt: 4000,
    });
  });

  it('returns null instead of reusing the maximum revision', () => {
    const assignmentForSave = helper('_assignmentForSave');

    expect(assignmentForSave(assignment({ revision: 998, status: 'draft' }), 'set-alpha', 5000, 999)).toBeNull();
    expect(assignmentForSave(assignment({ revision: 999, status: 'draft' }), 'set-alpha', 5000, 0)).toBeNull();
  });

  it('fingerprints the exact learner-facing content while ignoring lifecycle metadata', () => {
    const fingerprint = helper('_assignmentConfigFingerprint');
    const set = practiceSet();
    const baseAssignment = assignment({ status: 'draft' });
    const base = fingerprint(profile(), set, baseAssignment);

    expect(fingerprint(profile(), practiceSet(), {
      ...baseAssignment,
      id: 'another-valid-id',
      status: 'published',
      revision: 88,
      createdAt: 90_000,
      updatedAt: 91_000,
    })).toBe(base);

    expect(fingerprint(profile(), set, {
      ...baseAssignment,
      instructions: 'Complete the selected activities, then reflect.',
    })).not.toBe(base);
    expect(fingerprint(profile({ level: 'Developing' }), set, baseAssignment)).not.toBe(base);
    expect(fingerprint(profile(), practiceSet({
      lesson: {
        vocabulary: [{
          term: 'ecouter',
          meaning: 'to listen',
          forms: [{ id: 'present', label: 'present', form: 'ecoute' }],
          example: 'J ecoute.',
          translation: 'I listen.',
        }],
      },
    }), baseAssignment)).not.toBe(base);
  });

  it('keeps the newest duplicate config revision and orders immutable revisions newest first', () => {
    const normalizeRecords = helper('_normalizeAssignmentConfigRecords');
    const records = normalizeRecords([
      configRecord({ historyId: 'alpha-r2-old', savedAt: '2026-08-01T10:00:00.000Z', revision: 2, title: 'Older duplicate' }),
      configRecord({ historyId: 'alpha-r1', savedAt: '2026-08-01T13:00:00.000Z', revision: 1 }),
      configRecord({ historyId: 'alpha-r3', savedAt: '2026-08-01T09:00:00.000Z', revision: 3 }),
      configRecord({ historyId: 'alpha-r2-new', savedAt: '2026-08-01T12:00:00.000Z', revision: 2, title: 'Newest duplicate' }),
      configRecord({ historyId: 'beta-r1', savedAt: '2026-08-01T14:00:00.000Z', revision: 1, assignmentId: 'assignment-beta', setId: 'set-beta' }),
      configRecord({ historyId: 'draft-ignored', savedAt: '2026-08-01T15:00:00.000Z', revision: 9, status: 'draft' }),
      {
        ...configRecord({ historyId: 'mismatch-ignored', savedAt: '2026-08-01T16:00:00.000Z', revision: 8 }),
        data: {
          ...configRecord({ revision: 8 }).data,
          assignment: assignment({ revision: 8, practiceSetId: 'another-set' }),
        },
      },
      { historyId: 'invalid-ignored', savedAt: '2026-08-01T17:00:00.000Z', data: { product: 'not Lingua' } },
    ]);

    expect(records.map((record) => record.id)).toEqual([
      'alpha-r3',
      'alpha-r2-new',
      'beta-r1',
      'alpha-r1',
    ]);
    expect(records[1].practiceSet.name).toBe('Newest duplicate');
    expect(records.every((record) => record.assignment.status === 'published')).toBe(true);
    expect(records.every((record) => record.assignment.practiceSetId === record.practiceSet.id)).toBe(true);
  });
});
