// @vitest-environment jsdom
// A teacher's lesson "item count" is a minimum, and what a session reports must
// say so. A review's practice run went 5/5, 6/5, 7/5 and ended at "86% accuracy"
// with five of seven answers right on the first try, and a saved lesson reopened
// in setup with its plan switched off. These run the shipped functions.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const moduleSource = readFileSync('word_sounds_module.js', 'utf8');
const setupSource = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');

const between = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Missing source boundary: ${start} / ${end}`);
  return source.slice(from, to);
};
const arrowBody = (pattern) => {
  const match = moduleSource.match(pattern);
  if (!match) throw new Error(`Missing callback: ${pattern}`);
  return match[1];
};

const buildNextMasteryStat = new Function('return (' + arrowBody(/(\(current, isCorrect, evidence = \{\}\) => \{[\s\S]*?\n {8}\}),\r?\n {8}\[\],/) + ');')();
const makeShouldAdvance = new Function('masteryStats', 'preloadedWords', 'WS_NON_GRADED_ACTIVITIES', 'return (' + arrowBody(/(\(activityId, lessonPlanConfig, postAnswerStats = null\) => \{[\s\S]*?\n {8}\}),\r?\n {8}\[masteryStats, preloadedWords\.length\],/) + ');');
const THREE_WORDS = [{ word: 'cat' }, { word: 'map' }, { word: 'sun' }];
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
const { wsLessonItemsText, wsFirstTrySummary, wsFirstTryText } = new Function(
  between(moduleSource, 'function wsLessonItemsText(', 'function wsAnnounce(') + ';return { wsLessonItemsText, wsFirstTrySummary, wsFirstTryText };',
)();
const { restoreSavedLessonPlan, restoreSavedLessonPlanOrder } = new Function(
  between(setupSource, 'function restoreSavedLessonPlan(', 'function useWordSoundsSetupReviewState(') + ';return { restoreSavedLessonPlan, restoreSavedLessonPlanOrder };',
)();

const noTranslation = () => '';
const PLAN = { masteryMode: 'consecutive', masteryThreshold: 3, activities: [{ id: 'isolation', count: 5 }], order: ['isolation'], totalItems: 5, estimatedMinutes: 3 };
// The reviewed run: [word, right in the end, tries before the final answer].
const RUN = [['cat', true, 1], ['map', true, 0], ['cat', false, 1], ['sun', true, 0], ['cat', true, 0], ['map', true, 0], ['cat', true, 0]];

function replay(run) {
  const shouldAdvance = makeShouldAdvance({}, THREE_WORDS, new Set(['letter_tracing']));
  let stat;
  const missed = [];
  const log = run.map(([word, correct, attempts]) => {
    stat = buildNextMasteryStat(stat, correct, { presentations: attempts + 1, word });
    if (!correct && !missed.includes(word)) missed.push(word);
    return correct && shouldAdvance('isolation', PLAN, stat);
  });
  return { stat, missed, log };
}

describe('the stopping rule behind the reviewed 7/5 session', () => {
  it('treats the count as a minimum: the rule is first met at item 6, with the missed word still queued', () => {
    const { log, missed } = replay(RUN);
    expect(log.indexOf(true) + 1).toBe(6);
    expect(missed).toEqual(['cat']);
    // Item 7 of the run is that queued word coming back, not a miscount.
    expect(RUN[6][0]).toBe('cat');
  });

  it('does not count an answer fixed on a retry toward the streak', () => {
    expect(replay([['cat', true, 1], ['map', true, 1], ['sun', true, 1], ['cat', true, 1], ['map', true, 1]]).log).not.toContain(true);
  });

  it('lets a lesson on fewer than three words finish, since it cannot show three', () => {
    const plan = { masteryThreshold: 3, activities: [{ id: 'counting', count: 3 }] };
    const stats = { attempted: 3, consecutiveStreak: 3, distinctWords: ['cat', 'map'] };
    const graded = new Set(['letter_tracing']);
    expect(makeShouldAdvance({}, [{ word: 'cat' }, { word: 'map' }], graded)('counting', plan, stats)).toBe(true);
    expect(makeShouldAdvance({}, THREE_WORDS, graded)('counting', plan, stats)).toBe(false);
  });

  it('finishes unscored practice on the count, since it can never build a first-try streak', () => {
    const plan = { masteryThreshold: 3, activities: [{ id: 'letter_tracing', count: 3 }] };
    const advance = makeShouldAdvance({}, THREE_WORDS, new Set(['letter_tracing']));
    expect(advance('letter_tracing', plan, { attempted: 2, consecutiveStreak: 0 })).toBe(false);
    expect(advance('letter_tracing', plan, { attempted: 3, consecutiveStreak: 0 })).toBe(true);
  });
});

describe('the item limit', () => {
  it('is double the minimum, and never below the streak a plan needs', () => {
    expect(core.lessonItemCeiling(5, 3)).toBe(10);
    expect(core.lessonItemCeiling(20, 3)).toBe(40);
    expect(core.lessonItemCeiling(1, 3)).toBe(3);
    expect(core.lessonItemCeiling(undefined, undefined)).toBe(10);
  });

  it('has no leftover 15-second hold that would make the stopping point depend on speed', () => {
    const lessonBranch = between(moduleSource, 'const _lessonCeilingHit =', '!hasLessonPlan && isCorrect && !isFixedForm');
    expect(lessonBranch).not.toContain('15000');
  });
});

describe('the host route through Review Words', () => {
  // The real reducer and the real callback: ending the old run empties the
  // sequence, so the callback has to put the lesson back.
  const hostSlice = (start, end) => between(hostSource, start, end);
  const reducerSource = hostSlice('const getWordSoundsMasteryScopeKey =', '// Live AAC bridge extracted');
  const callbackSource = (() => {
    const from = hostSource.indexOf('onShowReview={(reviewedWords)');
    const to = hostSource.indexOf('\n              }}', from);
    if (from < 0 || to < 0) throw new Error('Missing onShowReview');
    return hostSource.slice(from + 'onShowReview={'.length, to) + '\n}';
  })();
  function runReview({ held, resource }) {
    const { wsReducer, WS_INITIAL_STATE } = new Function(reducerSource + ';return { wsReducer, WS_INITIAL_STATE };')();
    let state = { ...WS_INITIAL_STATE, wsActivitySequence: held };
    const session = {};
    const onShowReview = new Function(
      'latestWordSoundsSetupReviewRef', 'wordSoundsSetupReviewSession', 'setWsPreloadedWords', 'wsActivitySequence', 'generatedContent',
      'setIsWordSoundsMode', 'setWsActivitySequence', 'setTimeout', 'setWordSoundsActivity', 'setWordSoundsAutoReview', 'setActiveView',
      'return (' + callbackSource + ');',
    )(
      { current: { session } }, session, () => {}, held, resource,
      (open) => { state = wsReducer(state, open ? { type: 'WS_SET', field: 'isWordSoundsMode', value: true } : { type: 'WS_END_SESSION' }); },
      (value) => { state = wsReducer(state, { type: 'WS_SET', field: 'wsActivitySequence', value }); },
      (fn) => fn(),
      (value) => { state = { ...state, wordSoundsActivity: value }; }, () => {}, () => {},
    );
    onShowReview();
    return state;
  }
  const SEQUENCE = ['isolation', 'isolation'];

  it('keeps the lesson sequence the host already held', () => {
    const state = runReview({ held: SEQUENCE, resource: { type: 'word-sounds', lessonPlanSequence: SEQUENCE } });
    expect(state.wsActivitySequence).toEqual(SEQUENCE);
    expect(state.wordSoundsActivity).toBe('isolation');
  });

  it('recovers it from the saved lesson after Back to Setup emptied the held one', () => {
    const state = runReview({ held: [], resource: { type: 'word-sounds', lessonPlanSequence: SEQUENCE } });
    expect(state.wsActivitySequence).toEqual(SEQUENCE);
    expect(state.wordSoundsActivity).toBe('isolation');
  });

  it('stays in Quick Practice when there never was a lesson', () => {
    expect(runReview({ held: [], resource: { type: 'word-sounds', lessonPlanSequence: [] } }).wsActivitySequence).toEqual([]);
    expect(runReview({ held: [], resource: { type: 'glossary', lessonPlanSequence: SEQUENCE } }).wsActivitySequence).toEqual([]);
  });
});

describe('the lesson counter', () => {
  it('reads as a minimum before the count is reached', () => {
    expect(wsLessonItemsText(noTranslation, 3, 5, 10)).toBe('3 of at least 5 items');
  });

  it('switches to the limit once the minimum is met, and never shows 7/5', () => {
    expect(wsLessonItemsText(noTranslation, 5, 5, 10)).toBe('5 of at most 10 items');
    expect(wsLessonItemsText(noTranslation, 7, 5, 10)).toBe('7 of at most 10 items');
    expect(wsLessonItemsText(noTranslation, 7, 5, 10)).not.toContain('/');
  });

  it('uses the translated text when there is one', () => {
    const ts = (key, p) => (key === 'word_sounds.items_min_met' ? `[${p.done}|${p.max}]` : '');
    expect(wsLessonItemsText(ts, 7, 5, 10)).toBe('[7|10]');
  });
});

describe('the finished-session summary', () => {
  it('reports the reviewed run as 5 of 7 on the first try, not only 86%', () => {
    const { stat } = replay(RUN);
    expect(Math.round((stat.correct / stat.attempted) * 100)).toBe(86);
    const summary = wsFirstTrySummary({ isolation: stat });
    expect(summary).toEqual({ first: 5, total: 7, percent: 71, words: 3 });
    expect(wsFirstTryText(noTranslation, summary)).toBe('First try: 5 of 7 items (71%). Different words: 3.');
  });

  it('adds across activities and counts a word once however often it came up', () => {
    const summary = wsFirstTrySummary({
      isolation: { attempted: 2, firstTryCorrect: 1, distinctWords: ['cat', 'map'] },
      blending: { attempted: 2, firstTryCorrect: 2, distinctWords: ['Cat', 'sun'] },
    });
    expect(summary).toEqual({ first: 3, total: 4, percent: 75, words: 3 });
  });

  it('leaves unscored practice items out of the total', () => {
    expect(wsFirstTrySummary({ letter_tracing: { attempted: 4, practiceOnlyAttempts: 4, firstTryCorrect: 0 } })).toBeNull();
    expect(wsFirstTrySummary({ isolation: { attempted: 5, practiceOnlyAttempts: 1, firstTryCorrect: 2 } }).total).toBe(4);
  });

  it('shows nothing when nothing was answered', () => {
    expect(wsFirstTrySummary({})).toBeNull();
    expect(wsFirstTrySummary(null)).toBeNull();
  });
});

describe('reopening a saved lesson in setup', () => {
  const DEFAULTS = { isolation: { enabled: false, count: 5 }, blending: { enabled: false, count: 5 }, counting: { enabled: false, count: 5 } };
  const ORDER = ['isolation', 'blending', 'counting'];

  it('restores the activities, their counts and their order', () => {
    const saved = { activities: [{ id: 'counting', count: 8 }, { id: 'isolation', count: 3 }], order: ['counting', 'isolation'] };
    const plan = restoreSavedLessonPlan(saved, DEFAULTS);
    expect(plan.counting).toEqual({ enabled: true, count: 8 });
    expect(plan.isolation).toEqual({ enabled: true, count: 3 });
    expect(plan.blending).toEqual({ enabled: false, count: 5 });
    expect(restoreSavedLessonPlanOrder(saved, ORDER)).toEqual(['counting', 'isolation', 'blending']);
  });

  it('starts blank when no plan was saved', () => {
    for (const saved of [null, undefined, {}, { activities: 'x', order: 7 }]) {
      expect(restoreSavedLessonPlan(saved, DEFAULTS)).toEqual(DEFAULTS);
      expect(restoreSavedLessonPlanOrder(saved, ORDER)).toEqual(ORDER);
    }
  });

  it('ignores unknown activities, duplicates and counts outside the slider range', () => {
    const plan = restoreSavedLessonPlan({ activities: [{ id: 'nope', count: 3 }, null, { id: 'blending', count: 99 }, { id: 'counting', count: 'x' }] }, DEFAULTS);
    expect(plan.nope).toBeUndefined();
    expect(plan.blending).toEqual({ enabled: true, count: 5 });
    expect(plan.counting).toEqual({ enabled: true, count: 5 });
    expect(restoreSavedLessonPlanOrder({ order: ['blending', 'nope', 'blending'] }, ORDER)).toEqual(['blending', 'isolation', 'counting']);
  });

  it('wires the saved plan from the host into the setup state', () => {
    expect(hostSource).toContain("preparedLessonPlan={generatedContent?.type === 'word-sounds' ? generatedContent.lessonPlanConfig : null}");
    expect(setupSource).toContain("useSetupState('lessonPlan', () => restoreSavedLessonPlan(preparedLessonPlan,");
    expect(setupSource).toContain("useSetupState('lessonPlanOrder', () => restoreSavedLessonPlanOrder(preparedLessonPlan,");
    // 2026-11-10 (plan first): on for a saved plan and for every new lesson; off only for a saved lesson without a plan.
    expect(setupSource).toContain("const savedPlanActivities = preparedLessonPlan && Array.isArray(preparedLessonPlan.activities) ? preparedLessonPlan.activities.filter(activity => activity && activity.id) : [];");
    expect(setupSource).toContain("useSetupState('includeLessonPlan', () => savedPlanActivities.length > 0 || !reopenedLesson);");
  });
});

describe('the mounted player', () => {
  let WordSoundsModal, root = null, host = null;
  beforeAll(() => { ({ WordSoundsModal } = setupWordSounds()); });
  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    root = null; host = null;
  });
  const WORDS = [{ word: 'cat', targetWord: 'cat', phonemes: ['k', 'a', 't'], graphemes: ['c', 'a', 't'], syllables: ['cat'] }];
  const mount = (props) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(WordSoundsModal, Object.assign(baseProps('isolation'), { isTeacherMode: true, isProbeMode: false, wsPreloadedWords: WORDS, wordSoundsLanguage: 'en' }, props))));
  };

  it('shows the minimum counter when the saved plan and its sequence both arrive', () => {
    mount({ lessonPlanConfig: PLAN, initialActivitySequence: ['isolation', 'isolation', 'isolation', 'isolation', 'isolation'] });
    expect(host.textContent).toContain('0 of at least 5 items');
  });

  it('shows no counter when the plan never reaches the player', () => {
    mount({ lessonPlanConfig: null, initialActivitySequence: ['isolation'] });
    expect(host.textContent).not.toContain('of at least');
    if (root) act(() => root.unmount());
    host?.remove();
    mount({ lessonPlanConfig: PLAN, initialActivitySequence: [] });
    expect(host.textContent).not.toContain('of at least');
  });
});
