// Students open a preserved original before its adapted companion (fleet wave 2,
// lane K5, applying lane N1's request R1 for Katie Novak's point 4).
//
// WHY: InstructionalContext.ensureReadingSourcePairs puts the original first, but the
// host's resolveAssignmentResources then did selected.concat(...), which pushed the
// original behind the teacher's first pick (usually the adapted companion), so a
// student's assignment opened on the adapted text. The whole-history path had the
// same order. This runs the SHIPPED resolveAssignmentResources (sliced from
// AlloFlowANTI.txt) against the REAL instructional_context_module.js.
// ALLO_ANTI_CANDIDATE points the slice at a scratch copy for mutation runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const ANTI = readFileSync(process.env.ALLO_ANTI_CANDIDATE || resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const slice = (start, end) => {
  const a = ANTI.indexOf(start);
  expect(a, 'missing ' + start).toBeGreaterThan(-1);
  const b = ANTI.indexOf(end, a);
  expect(b, 'missing ' + end).toBeGreaterThan(a);
  return ANTI.slice(a, b + end.length);
};
const RESOLVE = slice('  const resolveAssignmentResources = useCallback((resourceIds = null) => {', '  }, [generatedContent, history]);');
const SAFE = slice('const _alloStudentSafeResources = (items) => {', '\n};');

let api;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  api = window.AlloModules.InstructionalContext;
  expect(typeof api.orderOriginalsBeforeCompanions).toBe('function');
});

function resolver(history, generatedContent = null) {
  // eslint-disable-next-line no-new-func
  return new Function('window', 'history', 'generatedContent', `
    const useCallback = fn => fn;
    const TEACHER_ONLY_TYPES = ['lesson-plan'];
    const _alloWithoutTeacherReviewCopies = items => items;
    const _alloProjectStudentActivityResource = item => item;
    const _alloNormalizeDirectionsData = data => ({ objectives: [], choiceBoard: null });
    ${SAFE}
    ${RESOLVE}
    return resolveAssignmentResources;
  `)(window, history, generatedContent);
}

const PASSAGE = 'TRUE! nervous, very, very dreadfully nervous I had been and am; but why will you say that I am mad?';
function pair(family, text = PASSAGE, title = 'The Tell-Tale Heart') {
  const original = api.createSupportedReading(text, { id: 'orig-' + family, sourceFamilyId: family, title: title + ' (original with supports)' });
  const adapted = { id: 'adapted-' + family, type: 'simplified', title: title + ' (adapted companion)', data: 'A man says he is not mad.', sourceSnapshot: original.sourceSnapshot, sourceFamilyId: family,
    instructionalText: { form: 'adapted', role: 'supplemental', replacementAuthorization: { authorized: false, source: 'none' } } };
  return { original, adapted };
}

describe('assignment resources open on the preserved original', () => {
  it('an explicit selection of the adapted companion opens on its original, then the teacher order', () => {
    const { original, adapted } = pair('heart');
    const quiz = { id: 'quiz', type: 'quiz', title: 'Check for understanding', data: {} };
    const resources = resolver([original, adapted, quiz])(['adapted-heart', 'quiz']);
    expect(resources.map(r => r.id)).toEqual(['orig-heart', 'adapted-heart', 'quiz']);
    // The pack title is taken from the first resource, so it now names the original.
    expect(resources[0].title).toBe('The Tell-Tale Heart (original with supports)');
  });

  it('the whole-history path does the same', () => {
    const { original, adapted } = pair('heart');
    const quiz = { id: 'quiz', type: 'quiz', data: {} };
    const plan = { id: 'plan', type: 'lesson-plan', data: {} };
    const resources = resolver([adapted, quiz, plan, original])(null);
    expect(resources.map(r => r.id)).toEqual(['orig-heart', 'adapted-heart', 'quiz']);
  });

  it('leaves other readings, missing selections and a host without the module alone', () => {
    const heart = pair('heart');
    const raven = pair('raven', 'Once upon a midnight dreary, while I pondered, weak and weary.', 'The Raven');
    const quiz = { id: 'quiz', type: 'quiz', data: {} };
    // Another reading's original is not a companion's original: it keeps its place.
    expect(resolver([heart.original, heart.adapted, raven.original, quiz])(['orig-raven', 'quiz']).map(r => r.id))
      .toEqual(['orig-raven', 'quiz']);
    // With no saved original in History, the pairing rebuilds one from the companion's
    // source snapshot; that rebuilt original also opens first.
    const rebuilt = resolver([heart.adapted, raven.original, quiz])(['adapted-heart', 'orig-raven', 'quiz']).map(r => r.id);
    expect(rebuilt.slice(1)).toEqual(['adapted-heart', 'orig-raven', 'quiz']);
    expect(rebuilt[0]).toMatch(/^original-source-/);
    expect(resolver([heart.adapted, quiz])(['adapted-heart', 'missing'])).toEqual([]);
    const saved = window.AlloModules.InstructionalContext;
    try {
      delete window.AlloModules.InstructionalContext;
      expect(resolver([heart.adapted, quiz, heart.original])(null).map(r => r.id)).toEqual(['adapted-heart', 'quiz', 'orig-heart']);
      expect(resolver([heart.original, heart.adapted, quiz])(['adapted-heart', 'quiz']).map(r => r.id)).toEqual(['adapted-heart', 'quiz']);
    } finally { window.AlloModules.InstructionalContext = saved; }
  });
});
