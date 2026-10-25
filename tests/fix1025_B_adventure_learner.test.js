// Lane B fixes (2026-10-25 review of the 24 core resources): Adventure device saves.
//  AV1  a save is stamped with the profile id when there is one, so two learners who
//       share a nickname ("Alex") on one device no longer open each other's story
//  AV2  an empty (anonymous) stamp never matches another student; only the teacher
//       reopens it (teacher saves made before this fix were stamped '')
//  AV3  saves stamped with the old nickname-only key still open for that nickname
//  AV4  the host's inline stamp + Resume gate agree with the handler's matcher
// Mutation hooks: FIX1025_B_AD_HANDLERS, FIX1025_B_ANTI.
import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const HANDLERS = process.env.FIX1025_B_AD_HANDLERS || 'adventure_handlers_source.jsx';
const ANTI = process.env.FIX1025_B_ANTI || 'AlloFlowANTI.txt';
const ANTI_COPIES = [ANTI, 'desktop/web-app/src/AlloFlowANTI.txt'];

const antiText = file => fs.readFileSync(file, 'utf8');
const anti = antiText(ANTI);
const lessonKeyStart = anti.indexOf('const _alloAdventureLessonKey = (history, inputText, options = null) => {');
if (lessonKeyStart < 0) throw new Error('_alloAdventureLessonKey anchor not found');
const lessonKey = new Function(anti.slice(lessonKeyStart, anti.indexOf('window._alloAdventureLessonKey = _alloAdventureLessonKey;', lessonKeyStart)) + '\nreturn _alloAdventureLessonKey;')();

const loadHandlers = () => new Function('window', fs.readFileSync(HANDLERS, 'utf8') + '\nreturn window.AlloModules.AdventureHandlers;')({ AlloModules: {}, _alloAdventureLessonKey: lessonKey });

// The host's two inline copies, evaluated as written.
function hostStamp(text) {
  const m = text.match(/learnerKey: (.+)\r?\n/);
  if (!m) throw new Error('learnerKey stamp not found');
  return new Function('isTeacherMode', 'selectedProfileId', 'studentNickname', '_alloAdventureLessonKey', 'return ' + m[1] + ';');
}
function hostGate(text) {
  const start = text.indexOf('const savedLearner = savedAdventureConfig.learnerKey');
  const endMarker = 'savedLearner === nickKey);';
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Resume gate not found');
  return new Function('savedAdventureConfig', 'isTeacherMode', 'selectedProfileId', 'studentNickname', '_alloAdventureLessonKey',
    text.slice(start, end + endMarker.length) + '\nreturn otherLearner;');
}

const learners = {
  alexP1: { isTeacher: false, profileId: 'p1', nickname: 'Alex' },
  alexP2: { isTeacher: false, profileId: 'p2', nickname: 'Alex' },
  alexNoProfile: { isTeacher: false, profileId: '', nickname: 'Alex' },
  ben: { isTeacher: false, profileId: '', nickname: 'Ben' },
  blankA: { isTeacher: false, profileId: '', nickname: '' },
  teacher: { isTeacher: true, profileId: '', nickname: '' },
  oddProfile: { isTeacher: false, profileId: 'a|b%c', nickname: '' },
};

async function resume(H, record, learner) {
  const setAdventureState = vi.fn();
  const addToast = vi.fn();
  const base = { adventureState: {}, history: [], inputText: '', storageDB: { get: vi.fn(async () => record) }, setAdventureState, addToast,
    setHasSavedAdventure: vi.fn(), t: k => k, warnLog: vi.fn(), debugLog: vi.fn(),
    isTeacherMode: learner.isTeacher, selectedProfileId: learner.profileId, studentNickname: learner.nickname };
  const deps = new Proxy(base, { get: (t, p) => (p in t ? t[p] : vi.fn()) });
  try { await H.handleResumeAdventure(deps); } catch (_) { /* later resume steps need more host; the learner gate runs first */ }
  return { refused: addToast.mock.calls.some(c => c[0] === 'toasts.adventure_other_learner'), setAdventureState };
}
const saveFor = learnerKey => ({ level: 2, turnCount: 3, currentScene: { text: 'story', options: ['a'] }, _adventureConfig: { learnerKey } });

describe('AV1/AV2: who may reopen a device save', () => {
  const H = loadHandlers();
  const stamp = l => H.adventureLearnerKey(l, lessonKey);

  it('two learners named Alex with different profiles do not share a save', async () => {
    const key = stamp(learners.alexP1);
    expect(key.startsWith('profile:p1|')).toBe(true);
    expect((await resume(H, saveFor(key), learners.alexP2)).refused).toBe(true);
    expect((await resume(H, saveFor(key), learners.alexP1)).refused).toBe(false);
  });

  it('two anonymous students do not match on the empty key; the teacher may reopen it', async () => {
    expect(stamp(learners.blankA)).toBe('');
    expect((await resume(H, saveFor(''), learners.blankA)).refused).toBe(true);
    expect((await resume(H, saveFor(''), learners.teacher)).refused).toBe(false);
  });

  it('a teacher save is stamped "teacher" and is not offered to a student', async () => {
    expect(stamp(learners.teacher)).toBe('teacher');
    expect((await resume(H, saveFor('teacher'), learners.blankA)).refused).toBe(true);
    expect((await resume(H, saveFor('teacher'), learners.teacher)).refused).toBe(false);
  });

  it('AV3: a pre-fix nickname-only save still opens for that nickname, with or without a profile', async () => {
    const legacy = lessonKey([], 'Alex');
    expect((await resume(H, saveFor(legacy), learners.alexP1)).refused).toBe(false);
    expect((await resume(H, saveFor(legacy), learners.alexNoProfile)).refused).toBe(false);
    expect((await resume(H, saveFor(legacy), learners.ben)).refused).toBe(true);
  });

  it('a host that does not pass the profile id leaves profile saves to its Resume gate', () => {
    const key = stamp(learners.alexP1);
    expect(H.adventureSaveMatchesLearner(key, { isTeacher: false, profileId: undefined, nickname: 'Ben' }, lessonKey)).toBe(true);
    expect(H.adventureSaveMatchesLearner(key, learners.alexP2, lessonKey)).toBe(false);
  });
});

describe('AV4: the host inline copies agree with the handler', () => {
  const H = loadHandlers();
  for (const file of ANTI_COPIES) {
    it(`stamp and Resume gate match the handler in ${file}`, () => {
      const text = antiText(file);
      const stampFn = hostStamp(text);
      const gateFn = hostGate(text);
      const savedKeys = [undefined, '', 'teacher', lessonKey([], 'Alex'), lessonKey([], 'Ben')];
      for (const l of Object.values(learners)) {
        const key = stampFn(l.isTeacher, l.profileId, l.nickname, lessonKey);
        expect(key, `stamp for ${JSON.stringify(l)}`).toBe(H.adventureLearnerKey(l, lessonKey));
        savedKeys.push(key);
      }
      for (const saved of savedKeys) {
        for (const l of Object.values(learners)) {
          const hostOther = gateFn({ learnerKey: saved }, l.isTeacher, l.profileId, l.nickname, lessonKey);
          const handlerMatch = H.adventureSaveMatchesLearner(saved, l, lessonKey);
          expect(hostOther, `saved ${JSON.stringify(saved)} for ${JSON.stringify(l)}`).toBe(!handlerMatch);
        }
      }
    });
  }
});
