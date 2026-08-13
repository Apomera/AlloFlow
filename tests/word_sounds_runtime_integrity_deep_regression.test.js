import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');

const sliceBetween = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `missing runtime marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  expect(end, `missing runtime marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
};

function loadMasteryReducer() {
  const block = sliceBetween(
    'const buildNextMasteryStat =',
    'const shouldAdvanceActivity =',
  );
  return new Function(`
    const React = { useCallback: (fn) => fn };
    ${block}
    return buildNextMasteryStat;
  `)();
}

describe('Word Sounds runtime session integrity', () => {
  it('honors the portable setup configuration over legacy individual defaults', () => {
    const config = sliceBetween(
      'const runtimeSessionConfig =',
      'const estimateFirstPhoneme =',
    );

    expect(config).toContain('runtimeSessionConfig.imageVisibilityMode');
    expect(config).toContain('runtimeSessionConfig.wordSoundsSessionGoal ?? runtimeSessionConfig.sessionGoal');
    expect(config).toContain('runtimeSessionConfig.orthoSessionGoal ?? runtimeSessionConfig.orthoGoal');
    expect(config).toContain('runtimeSessionConfig.wordSoundsDifficulty ?? runtimeSessionConfig.difficulty');
    expect(config).toContain('runtimeSessionConfig.wordSoundsLanguage ?? runtimeSessionConfig.language');
    expect(config).toContain('learnerId ?? runtimeSessionConfig.learnerId ?? null');
    expect(config).toContain('sessionId ?? runtimeSessionConfig.sessionId ?? null');
    expect(config).toContain('resourceId ?? runtimeSessionConfig.resourceId ?? null');
  });

  it('scopes adaptive evidence to the active learner and language', () => {
    const scoped = sliceBetween(
      'const learnerScopedHistory = React.useMemo',
      'const estimateFirstPhoneme =',
    );

    expect(scoped).toContain('String(row.learnerId ?? "") !== String(historyLearnerId)');
    expect(scoped).toContain('String(row.language).toLowerCase() !== languageKey');
    expect(source).toContain('const hist = learnerScopedHistory.filter(wsIsGradedRow)');
    expect(source).toContain('const activityHistory = learnerScopedHistory');
    expect(source).toContain('const history = learnerScopedHistory;');
  });

  it('resets only run-local state and preserves longitudinal evidence', () => {
    const reset = sliceBetween(
      'const resetRuntimeSession =',
      'const SESSION_LENGTH =',
    );

    expect(reset).toContain('sessionWordResults.current = []');
    expect(reset).toContain('sessionQueueRef.current = {}');
    expect(reset).toContain('setWordSoundsScore?.({ correct: 0, total: 0, streak: 0 })');
    expect(reset).toContain('setWordSoundsSessionProgress?.(0)');
    expect(reset).toContain('setWordSoundsStreak?.(0)');
    expect(reset).toContain('setCurrentWordSoundsWord?.(null)');
    expect(reset).not.toContain('setWordSoundsHistory');

    const reviewLaunch = sliceBetween(
      'onStartActivity: () => {',
      'onClose: closeSessionDialog',
    );
    expect(reviewLaunch).toContain('resetRuntimeSession()');
    expect(reviewLaunch).not.toContain('setWordSoundsHistory([])');
    expect(source).toMatch(/const closeSessionDialog = \(\) => \{\s*resetRuntimeSession\(\);\s*onClose\?\.\(\);/);
  });

  it('records enough provenance to separate learners, resources, and runs', () => {
    const entry = sliceBetween('const _historyEntry = {', 'setWordSoundsHistory((prev) =>');

    expect(entry).toContain('sessionId: activeHistorySessionIdRef.current');
    expect(entry).toContain('learnerId: String(historyLearnerId)');
    expect(entry).toContain('resourceId: String(historyResourceId)');
    expect(entry).toContain('language: String(wordSoundsLanguage)');
    expect(entry).toContain('sessionConfigVersion');
    expect(entry).toContain('firstTry: attempts === 0');
    expect(entry).toContain('attempts: attempts + 1');
    expect(entry).toContain('aacAssisted: true');
    expect(entry).toContain('practiceOnly: true');
  });

  it('keeps progress cumulative across ten-item level boundaries', () => {
    const progress = sliceBetween(
      '// Level-ups are practice gamification',
      '// Badges are practice rewards',
    );

    expect(progress).toContain('const newVal = prev + 1');
    expect(progress).toContain('newVal % 10 === 0');
    expect((progress.match(/return newVal;/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(progress).not.toContain('return 0;');
  });

  it('uses post-answer mastery synchronously and language-gates every automatic transition', () => {
    expect(source).toContain('shouldAdvanceActivity(wordSoundsActivity, currentLessonConfig, _postActivityMastery)');
    expect(source).toContain('const actStats = _postActivityMastery');

    const progression = sliceBetween('const PHONO_ORDER = [', 'if (nextActivity) {');
    expect((progression.match(/\.filter\(wsActivityAvailableForLang\)/g) || [])).toHaveLength(2);
    expect(progression).toContain('const orthoIdx = ORTHO_ORDER.indexOf(wordSoundsActivity)');
    expect(progression).toContain('orthoIdx >= 0 && orthoIdx < ORTHO_ORDER.length - 1');
  });

  it('derives the student lock from teacher-controlled session configuration', () => {
    expect(source).toContain('runtimeSessionConfig.studentLocked === true');
    expect(source).toContain('setIsStudentLocked(runtimeSessionConfig.studentLocked === true)');
    expect(source).not.toContain('const [isStudentLocked, setIsStudentLocked] = React.useState(false)');
  });
});

describe('Word Sounds mastery evidence', () => {
  const update = loadMasteryReducer();

  it('credits first-try independent retrieval distinctly', () => {
    expect(update(null, true, { presentations: 1, aacAssisted: false })).toMatchObject({
      attempted: 1,
      correct: 1,
      firstTryCorrect: 1,
      retryCorrect: 0,
      independentCorrect: 1,
      aacAssistedAttempts: 0,
      consecutiveStreak: 1,
      independentConsecutiveStreak: 1,
    });
  });

  it('records retry-correct without advancing an independent mastery streak', () => {
    expect(update(null, true, { presentations: 2, aacAssisted: false })).toMatchObject({
      attempted: 1,
      correct: 1,
      firstTryCorrect: 0,
      retryCorrect: 1,
      independentCorrect: 0,
      consecutiveStreak: 0,
      independentConsecutiveStreak: 0,
    });
  });

  it('separates AAC-supported success from independent retrieval', () => {
    expect(update(null, true, { presentations: 1, aacAssisted: true })).toMatchObject({
      attempted: 1,
      correct: 1,
      firstTryCorrect: 1,
      aacAssistedAttempts: 1,
      aacAssistedCorrect: 1,
      independentCorrect: 0,
      independentConsecutiveStreak: 0,
    });
  });

  it('keeps word-level and counting judgments out of per-phoneme mastery', () => {
    const attribution = sliceBetween(
      'const _wordLevelActs = [',
      'if (!isCorrect && answer && expectedAnswer)',
    );

    for (const activity of [
      'counting',
      'rhyming',
      'syllable_blending',
      'syllable_counting',
      'decoding',
      'word_families',
      'letter_tracing',
      'read_sentence',
      'read_passage',
      'sentence_match',
    ]) {
      expect(attribution).toContain(`"${activity}"`);
    }
  });
});
