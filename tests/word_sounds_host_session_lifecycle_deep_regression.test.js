import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hostSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

const sliceBetween = (startMarker, endMarker) => {
  const start = hostSource.indexOf(startMarker);
  const end = hostSource.indexOf(endMarker, start + startMarker.length);
  expect(start, `missing host marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  expect(end, `missing host marker: ${endMarker}`).toBeGreaterThan(start);
  return hostSource.slice(start, end);
};

function loadWordSoundsReducer() {
  const reducerSource = sliceBetween(
    'const getWordSoundsMasteryScopeKey =',
    '// Live AAC bridge extracted',
  );
  return new Function(`
    ${reducerSource}
    return { getWordSoundsMasteryScopeKey, WS_INITIAL_STATE, wsReducer };
  `)();
}

describe('Word Sounds host session lifecycle', () => {
  const { getWordSoundsMasteryScopeKey, WS_INITIAL_STATE, wsReducer } = loadWordSoundsReducer();

  it('derives opaque mastery scopes independently per learner and language', () => {
    const learnerAEnglish = getWordSoundsMasteryScopeKey('Learner A', 'en');
    const learnerBEnglish = getWordSoundsMasteryScopeKey('Learner B', 'en');
    const learnerASpanish = getWordSoundsMasteryScopeKey('Learner A', 'es');

    expect(learnerAEnglish).not.toBe(learnerBEnglish);
    expect(learnerAEnglish).not.toBe(learnerASpanish);
    expect(learnerAEnglish).not.toContain('Learner A');
    expect(getWordSoundsMasteryScopeKey('Learner A', 'en')).toBe(learnerAEnglish);
  });

  it('begins a session atomically without deleting longitudinal state', () => {
    const dirty = {
      ...WS_INITIAL_STATE,
      isWordSoundsMode: false,
      wordSoundsAccuracyHistory: [{ correct: true }],
      wordSoundsStreak: 19,
      wordSoundsSessionProgress: 29,
      wordSoundsScore: { correct: 29, total: 30, streak: 19 },
      currentWordSoundsWord: 'old',
      wordSoundsPhonemes: ['o', 'l', 'd'],
      wordSoundsFeedback: { type: 'correct' },
      longitudinalHistorySentinel: [{ learnerId: 'learner-a', word: 'ship' }],
    };
    const config = {
      schema: 'alloflow-word-sounds-session/v1',
      version: 1,
      sessionGoal: 7,
      orthoSessionGoal: 3,
      fixedForm: true,
      language: 'es',
      difficulty: 'hard',
      initialActivity: 'segmentation',
      sessionId: 'ws-session-test',
      learnerId: 'learner-a',
    };

    const next = wsReducer(dirty, { type: 'WS_BEGIN_SESSION', config });

    expect(next).toMatchObject({
      isWordSoundsMode: true,
      wordSoundsDifficulty: 'hard',
      wordSoundsSessionGoal: 7,
      orthoSessionGoal: 0,
      wordSoundsSessionProgress: 0,
      wordSoundsAccuracyHistory: [],
      wordSoundsStreak: 0,
      wordSoundsScore: { correct: 0, total: 0, streak: 0 },
      currentWordSoundsWord: null,
      wordSoundsPhonemes: null,
      wordSoundsFeedback: null,
      wordSoundsLanguage: 'es',
      wordSoundsActivity: 'segmentation',
      wordSoundsSessionConfig: config,
      wordSoundsMasteryScopeKey: getWordSoundsMasteryScopeKey('learner-a', 'es'),
    });
    expect(next.longitudinalHistorySentinel).toEqual(dirty.longitudinalHistorySentinel);
  });

  it('ends a session by clearing transient evidence before the next launch', () => {
    const active = {
      ...WS_INITIAL_STATE,
      isWordSoundsMode: true,
      wordSoundsAccuracyHistory: [{ correct: false }],
      wordSoundsStreak: 6,
      wordSoundsSessionProgress: 12,
      wordSoundsScore: { correct: 10, total: 12, streak: 6 },
      currentWordSoundsWord: 'ship',
      wordSoundsPhonemes: ['sh', 'i', 'p'],
      wordSoundsFeedback: { type: 'incorrect' },
      wordSoundsSessionConfig: { sessionId: 'old-session' },
      longitudinalHistorySentinel: [{ word: 'cat' }],
    };

    const next = wsReducer(active, { type: 'WS_END_SESSION' });

    expect(next).toMatchObject({
      isWordSoundsMode: false,
      wordSoundsSessionProgress: 0,
      wordSoundsAccuracyHistory: [],
      wordSoundsStreak: 0,
      wordSoundsScore: { correct: 0, total: 0, streak: 0 },
      currentWordSoundsWord: null,
      wordSoundsPhonemes: null,
      wordSoundsFeedback: null,
      wordSoundsSessionConfig: null,
    });
    expect(next.longitudinalHistorySentinel).toEqual(active.longitudinalHistorySentinel);
    expect(next.wordSoundsMasteryScopeKey).toBe(active.wordSoundsMasteryScopeKey);
  });

  it('derives exact fixed-form length and fresh run identity before mounting', () => {
    const lifecycle = sliceBetween(
      'const prepareWordSoundsSession =',
      '// Pull in the lazily-registered Word Sounds player.',
    );

    expect(lifecycle).toContain('const wasOpen = latestIsWordSoundsModeRef.current');
    expect(lifecycle).toContain('latestIsWordSoundsModeRef.current = !!next');
    expect(lifecycle).toContain('if (next === true && !wasOpen)');
    expect(lifecycle).toContain('const fixedForm = !!(preparedConfig.fixedForm || firstWord.probeFixedForm)');
    expect(lifecycle).toContain('Math.min(words.length');
    expect(lifecycle).toContain('probeItemCount: fixedForm ? sessionGoal : null');
    expect(lifecycle).toContain("sessionId: 'ws-session-' + Date.now()");
    expect(lifecycle).toContain("wsDispatch({ type: 'WS_BEGIN_SESSION', config })");
    expect(lifecycle).toContain("wsDispatch({ type: 'WS_END_SESSION' })");
  });

  it('persists the sixth setup argument and prepares it before player launch', () => {
    const launch = sliceBetween(
      'onStartGame={(words, sequence, lessonPlanConfig, configSummary, probeOptions, sessionConfig) => {',
      'onClose={handleCloseDashboard}',
    );

    expect(launch).toContain("const _sessionConfig = sessionConfig && typeof sessionConfig === 'object'");
    expect(launch).toContain('_persistedSessionConfig');
    expect(launch).toContain('sessionConfig: { ..._persistedSessionConfig, resourceId }');
    expect(launch).toContain('prepareWordSoundsSession({');
    expect(launch).toContain('learnerId: _sessionLearnerId');
    expect(launch.indexOf('prepareWordSoundsSession({')).toBeLessThan(
      launch.lastIndexOf('setIsWordSoundsMode(true)'),
    );
    expect(launch).not.toContain('setWordSoundsHistory([])');
  });

  it('passes session identity and configuration through preview and into the player', () => {
    const preview = sliceBetween(
      'window.AlloModules.WordSoundsPreviewView && React.createElement',
      '{isWordSoundsMode &&',
    );
    const player = sliceBetween(
      'sessionConfig: wordSoundsSessionConfig',
      'onProbeComplete: (results) => {',
    );

    expect(preview).toContain('prepareWordSoundsSession');
    expect(player).toContain('learnerId: wordSoundsSessionConfig?.learnerId');
    expect(player).toContain('sessionId: wordSoundsSessionConfig?.sessionId || null');
    expect(player).toContain('resourceId: wordSoundsSessionConfig?.resourceId || generatedContent?.id || null');
    expect(player).toContain('probeForm: wordSoundsSessionConfig?.probeForm');
  });

  it('migrates legacy mastery into an anonymous scope and persists v2 scopes', () => {
    const masteryStore = sliceBetween(
      'const [phonemeMasteryStore, setPhonemeMasteryStore]',
      'const [wordSoundsDailyProgress',
    );
    const persistence = sliceBetween(
      "safeSetItem('allo_word_sounds_badges'",
      '// Concept mastery is DEVICE-LOCAL',
    );

    expect(masteryStore).toContain("safeGetItem('allo_phoneme_mastery_v2')");
    expect(masteryStore).toContain("safeGetItem('allo_phoneme_mastery')");
    expect(masteryStore).toContain("[getWordSoundsMasteryScopeKey(null, 'en')]: legacy");
    expect(masteryStore).toContain('[wordSoundsMasteryScopeKey]');
    expect(persistence).toContain("safeSetItem('allo_phoneme_mastery_v2'");
    expect(persistence).not.toContain("safeSetItem('allo_phoneme_mastery',");
  });
});

describe('Word Sounds host probe completion normalization', () => {
  it('normalizes totals and fills missing accuracy instead of saving undefined percent', () => {
    const completion = sliceBetween(
      'onProbeComplete: (results) => {',
      '})}\n                    </ErrorBoundary>',
    );

    expect(completion).toContain('const total = Math.max(0, Number(results?.total) || 0)');
    expect(completion).toContain('Math.min(total, Number(results?.correct) || 0)');
    expect(completion).toContain('const reportedAccuracy = Number(results?.accuracy)');
    expect(completion).toMatch(/total \? Math\.round\(\(correct \/ total\) \* 100\) : 0/);
    expect(completion).toContain('correct,\n                                        total,\n                                        accuracy,');
    expect(completion).toContain("addToast(t('toasts.probe_complete', { correct, total, accuracy })");
  });

  it('stamps grade, form, activity, item identity, and run provenance from the fixed config', () => {
    const completion = sliceBetween(
      'onProbeComplete: (results) => {',
      '})}\n                    </ErrorBoundary>',
    );

    expect(completion).toContain('?? probeConfig.probeGrade');
    expect(completion).toContain('?? probeConfig.probeForm');
    expect(completion).toContain('?? probeConfig.probeActivity');
    expect(completion).toContain('formId: results?.formId || probeConfig.formId || null');
    expect(completion).toContain('itemIds: Array.isArray(results?.itemIds)');
    expect(completion).toContain('fixedForm: !!probeConfig.fixedForm');
    expect(completion).toContain('sessionId: wordSoundsSessionConfig?.sessionId');
    expect(completion).toContain('resourceId: wordSoundsSessionConfig?.resourceId');
    expect(completion).toContain('accuracy: fullResult.accuracy');
  });
});
