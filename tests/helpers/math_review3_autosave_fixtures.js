// Fixtures + hub loader for tests/math_review3_autosave_*.test.js.
//
// The STEM hub autosaves tool state to localStorage ('alloflow_stemlab_v2').
// Math tools may keep PROGRESS there (badges, counters, bests, seen-maps that
// stop double credit) and nothing a student typed, plotted, built or was told.
//
// Each MATH_TOOLS entry is a full tool bucket as the tool itself writes it:
// `progress` holds the fields its badges and quests read, taken from the tool
// source (stem_lab/stem_tool_<file>.js), and `work` holds answers, guesses,
// inputs, points, models and feedback. Every work value is PLANTED: a marker
// string ('PLANT-...') or a marker number registered in PLANTED_NUMBERS, so a
// test can prove none of them reaches storage.
//
// MATH_AUTOSAVE_HUB overrides the hub path (mutation checks run these tests
// against a copy with the change reverted).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './anchored_slice.js';

export const HUB_PATH = process.env.MATH_AUTOSAVE_HUB || 'stem_lab/stem_lab_module.js';
export const STORAGE_KEY = 'alloflow_stemlab_v2';

// The hydration line the component ran before restore had its own helper.
export const LEGACY_HYDRATION = 'Object.assign({}, prev, _parsedForHydration, { _persisted: true })';

export function hubSource() {
  return readFileSync(resolve(process.cwd(), HUB_PATH), 'utf8');
}

// Runs the hub's real persistence code: the Beehive helper plus the whole
// STEM_AUTOSAVE block, with a fake window/document/localStorage.
export function loadHub(storage) {
  const src = hubSource();
  const code = sliceBetween(src, '// BEEHIVE_PERSISTENCE_HELPER_START', '// BEEHIVE_PERSISTENCE_HELPER_END', { file: HUB_PATH }) +
    sliceBetween(src, '// STEM_AUTOSAVE_START', '// STEM_AUTOSAVE_END', { file: HUB_PATH });
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.hidden = false;
  const store = storage || memoryStorage();
  const api = Function('window', 'document', 'localStorage', 'JSON', code +
    '\nreturn { payload: _stemPersistencePayload, createSaver: _createStemAutosave,' +
    ' hydrate: typeof _stemHydrateLabToolData === "function" ? _stemHydrateLabToolData : null,' +
    ' applyPending: typeof _stemApplyPendingProgress === "function" ? _stemApplyPendingProgress : null };'
  )(win, doc, store, JSON);
  // A hub without the helper still hydrated inline, with LEGACY_HYDRATION.
  // Model exactly that line so a reverted hub runs (and fails) these tests
  // instead of failing to load.
  if (!api.hydrate) {
    if (!src.includes(LEGACY_HYDRATION)) throw new Error('hub has neither _stemHydrateLabToolData nor the legacy hydration line');
    api.hydrate = (prev, parsed) => Object.assign({}, prev, parsed, { _persisted: true });
    api.legacy = true;
  }
  if (!api.applyPending) api.applyPending = (prev) => prev;
  api.storage = store;
  api.win = win;
  api.doc = doc;
  return api;
}

export function memoryStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map,
  };
}

// Save through the real payload function and JSON, then hydrate into `prev`
// the way the component does, then let deferred tools create their bucket.
export function saveAndRestore(hub, toolData, prev, created) {
  const encoded = JSON.stringify(hub.payload(Object.assign({ _persisted: true }, toolData)));
  let next = hub.hydrate(prev || {}, JSON.parse(encoded));
  if (created) next = hub.applyPending(Object.assign({}, next, created(next)));
  return { encoded, next };
}

// ── planted markers ──────────────────────────────────────────────────────
export const PLANTED_NUMBERS = new Set();
let plantCounter = 0;
export function P() {
  plantCounter += 1;
  const n = 7341000 + plantCounter + 0.25;
  PLANTED_NUMBERS.add(n);
  return n;
}
export function S(tag) { return 'PLANT-' + tag; }

// Field names that would mean student work reached storage. Checked against
// every key at every depth of the saved payload (math buckets only).
export const FORBIDDEN_KEY = /answer|guess|input|typed|draft|feedback|response|explanation|hypothesis|reflection|prediction|history|chat|expr|points|note|receipt|cart|placed|pins|saved|trial|tutor|question|label|chosen|missed|undo|positions|segments|values|data$|^dims$|^markers$|^funcs$|^results$|^log$|^quiz$|^streak$/i;
// Approved progress fields whose NAMES happen to match the pattern above.
export const FORBIDDEN_KEY_EXEMPT = new Set(['moneyAnswerShown', 'historySaveCount', 'totalTrials', '_awardedTrialMilestones', 'totalPlaced', 'aiQuestions', '_aiQuestions', 'squaresAnswered', 'rowsAnswered']);

// ── the 22 math tools ────────────────────────────────────────────────────
// key: toolData bucket. id/file: registerTool id + source file (quest hooks,
// render smoke). expected: what must come back (defaults to progress).
// questTrue: quest hook ids that read progress and so must still pass after a
// reload; questReset: hook ids that read work and are EXPECTED to reset.
export const MATH_TOOLS = [
  {
    key: '_fractions', id: 'fractions', file: 'stem_tool_fractions.js',
    progress: {
      badges: { firstSlice: true, streak3: true, score10: true }, score: { correct: 12, total: 15 }, bestStreak: 6,
      challengeTypesUsed: { identify: true, compare: true }, tabsVisited: { practice: true, compare: true, wall: true },
      tabScores: { practice: 4, compare: 2, operations: 0, equivalents: 1, converter: 3, wall: 2 },
      equivSolved: 3, simplifySolved: 5, convertCount: 5, convertSeen: { '3/4': true, '1/2': true }, wallPairsFound: 3,
      wallPairsSeen: { '1/2=2/4': true }, opsSolved: 5, aiAsked: 1, stripEquivFound: 2, stripPairsSeen: { '6': true },
      signChecks: { '-1/2*3/4': true }, signCorrectCount: 4, signAttemptCount: 5, signBestStreak: 3,
      plateGame: { totalServed: 26, bestCombo: 7 },
    },
    work: () => ({
      answer: S('frac-answer'), feedback: { correct: false, msg: S('frac-feedback') }, challenge: { q: S('frac-challenge'), a: P() },
      num1: P(), den1: P(), wpAnswer: S('frac-wp'), wpFeedback: { msg: S('frac-wpfb') }, aiQuestion: S('frac-aiq'), aiResponse: S('frac-air'),
      convDecInput: S('frac-conv'), opInputDraft: S('frac-opdraft'), storyAnswer: S('frac-story'), examAnswers: [S('frac-exam')],
      msAnswers: { 1: S('frac-ms') }, vqAnswer: S('frac-vq'), savedSessions: { mine: { num1: P() } }, estFeedback: S('frac-est'),
      pieces: { numerator: P(), denominator: 8 }, streak: P(), dpDays: [S('frac-day')],
      plateGame: { typed: S('frac-plate-typed'), chosen: S('frac-plate-chosen'), log: { attempts: P() }, active: { food: S('frac-plate-food') }, input: P() },
    }),
    questTrue: [], questReset: [],
  },
  {
    key: '_numberline', id: 'numberline', file: 'stem_tool_numberline.js',
    progress: {
      badges: { firstMark: true, rounder: true }, score: { correct: 9, total: 11 }, bestStreak: 5,
      challengeTypesUsed: { place: true, round: true, fraction: true, negative: true },
      roundingSolved: 5, fractionSolved: 3, negativeSolved: 3, placeSolved: 5, aiAsked: 2, independentCorrect: 7, supportedCorrect: 2,
    },
    work: () => ({
      answer: S('nl-answer'), feedback: { msg: S('nl-feedback') }, challenge: { prompt: S('nl-challenge'), answer: P() },
      markers: [{ value: P(), label: S('nl-marker') }], aiQuestion: S('nl-aiq'), aiResponse: S('nl-air'),
      magHunt: { hypothesis: S('nl-hyp'), explanation: S('nl-expl'), log: [S('nl-log')] }, fdValue: P(), range: { min: P(), max: P() }, streak: P(),
    }),
    questTrue: ['solve_5', 'try_4_types', 'streak_5'], questReset: [],
  },
  {
    key: '_manipulatives', id: 'base10', file: 'stem_tool_manipulatives.js',
    progress: {
      earnedBadges: { first_build: true, regroup_5: true, blocks_10: true }, score: { correct: 14, total: 17 },
      modesVisited: { blocks: true, abacus: true, slideRule: true }, regroupCount: 6, blocksSolved: 10, abacusSolved: 5,
      slideSolved: 2, quizSolved: 4, counterSolved: 3, nbSolved: 5, hubSolved: 8, speedBest: 7.5,
    },
    work: () => ({
      b10: { ones: P(), tens: 3, hundreds: 0, thousands: 0 }, craUserAns: S('man-cra'), crUserAns: S('man-cr'), nbAnswer: S('man-nb'),
      savedConstructions: { mine: { b10: { ones: P() } } }, mathInquiry: { hypothesis: S('man-hyp'), explanation: S('man-expl') },
      abacusFeedback: { msg: S('man-abfb') }, pvQuiz: { answer: S('man-pv') }, counters: [P()], geoboardSegments: [[P(), 1]],
      libraryName: S('man-lib'), streak: P(), aiInsight: S('man-ai'),
    }),
    questTrue: [], questReset: [],
  },
  {
    key: '_moneyMath', id: 'moneyMath', file: 'stem_tool_money.js',
    progress: {
      moneyAwardSeen: { 'coin|1x2y3z.4a5b': true, 'tip|9q8w.7e6r': true }, moneyAnswerShown: { 'change|abc.def': true },
      moneyRoundIds: { coin: 3, tip: 2 }, crBest: 85,
    },
    work: () => ({
      placed: [{ v: P() }, { v: P() }, { v: P() }, { v: P() }, { v: P() }], cart: [{ name: S('money-cart1') }, { name: S('money-cart2') }, { name: S('money-cart3') }], changeAnswer: S('money-change'),
      changeFeedback: { ok: true, msg: S('money-changefb') }, coinGuess: S('money-coin'), tipAnswer: S('money-tip'), wpAnswer: S('money-wp'),
      wpProblem: { text: S('money-wpp') }, moneyAwardKeys: { coin: S('money-awardkey') }, spUserAnswers: [S('money-sp')],
      cartGuessTotal: S('money-cartguess'), budgetEventHistory: [S('money-budget')], lastReceipt: { total: P() }, crHistory: [S('money-cr')],
      budgetEventScore: P(),
    }),
    // Every Money Math quest reads work (coins placed, change feedback, cart).
    questTrue: [], questReset: ['place_5_coins', 'make_change', 'shop_3_items'],
  },
  {
    key: '_areamodel', id: 'areamodel', file: 'stem_tool_areamodel.js',
    progress: {
      badges: { firstArea: true, streak3: true }, score: { correct: 8, total: 10 }, bestStreak: 5,
      challengeTypesUsed: { basic: true, distributive: true, multi: true, word: true }, basicSolved: 4, distSolved: 2, multiSolved: 1,
      wordSolved: 3, aiAsked: 1, usedCommutative: true,
    },
    work: () => ({
      answer: S('am-answer'), feedback: { msg: S('am-feedback') }, challenge: { a: P(), b: P() }, dims: { rows: P(), cols: 4 },
      _areaHunt: { hypothesis: S('am-hyp'), explanation: S('am-expl') }, aiQuestion: S('am-aiq'), aiResponse: S('am-air'), streak: P(),
    }),
    questTrue: ['solve_5', 'all_modes', 'streak_5', 'word_3'], questReset: [],
  },
  {
    key: '_multExt', id: 'multtable', file: 'stem_tool_multtable.js',
    progress: {
      badges: { firstCorrect: true, streak5: true }, totalCorrect: 42, hiddenCorrect: 3, trickySolved: 4,
      squaresAnswered: { 2: true, 3: true, 4: true, 5: true, 6: true }, rowsAnswered: { 2: true, 3: true, 7: true },
      patternsExplored: { evens: true }, visualExplored: { '3x4': true }, factScores: { '3x4': { attempts: 3, correct: 2 }, '6x7': { attempts: 1, correct: 1 } },
    },
    work: () => ({
      aiResponse: S('mt-air'), _factHunt: { hypothesis: S('mt-hyp'), explanation: S('mt-expl') }, sessionCorrect: P(), sessionVisit: S('mt-visit'),
    }),
    questTrue: ['answer_10', 'squares_5'], questReset: [],
  },
  {
    key: 'algebraCAS', id: 'algebraCAS', file: 'stem_tool_algebracas.js',
    progress: {
      _badgesEarned: ['firstSolve', 'fiveSolves', 'factorPro'], _solveCount: 6, _factorCount: 3, _scaleSolves: 2, _maxStreak: 4,
      _aiQuestions: 3, practiceScore: 7, _modesUsed: { solve: true, factor: true, simplify: true, expand: true }, _builderUsed: true, _triedAdvanced: true,
    },
    work: () => ({
      expression: S('cas-expr'), history: [{ expr: S('cas-hist'), result: S('cas-result') }], practiceAnswer: S('cas-practice'),
      tutorChat: [{ text: S('cas-chat') }], tutorInput: S('cas-tutorin'), practiceQ: { q: S('cas-q') }, practiceFeedback: S('cas-pfb'),
      scaleEq: S('cas-scale'), builderTiles: [S('cas-tile')], stepCheck: { step: S('cas-step') }, result: S('cas-res2'),
    }),
    questTrue: ['solve_5', 'factor_3', 'scale_solve', 'streak_3', 'all_modes'], questReset: [],
  },
  {
    key: 'funcGrapher', id: 'funcGrapher', file: 'stem_tool_funcgrapher.js', deferred: true,
    progress: {
      familiesTried: { linear: true, quadratic: true, cubic: true, exponential: true, sine: true }, fgScore: 6, fgMythsDone: 3,
      overlaysUsed: { deriv: true, area: true },
    },
    work: () => ({
      a: P(), b: P(), aiExplain: S('fg-ai'), secantPrediction: S('fg-secpred'), secantReflection: S('fg-secrefl'),
      improperPrediction: S('fg-imppred'), improperReflection: S('fg-imprefl'), _waveHunt: { hypothesis: S('fg-hyp') }, fgQuiz: { answer: S('fg-quiz') },
    }),
    questTrue: ['try_5_families', 'challenge_5', 'myth_3', 'use_overlays'], questReset: [],
  },
  {
    key: 'graphCalc', id: 'graphCalc', file: 'stem_tool_graphcalc.js',
    progress: {
      badges: ['firstGraph', 'zeroFinder'], _graphsDrawn: 5, _multiGraphCount: 3, _challengesCompleted: 3, _challengesDone: [0, 2, 4],
      aiQuestions: 3, _analyzed: true, _foundZero: true, _foundIntersection: true, _usedTrig: true, _usedTable: true, _usedSliders: true, _usedDeriv: true,
    },
    work: () => ({
      funcs: [{ expr: S('gc-f1') }, { expr: S('gc-f2') }, { expr: S('gc-f3') }], aiInput: S('gc-aiin'), aiMessages: [{ text: S('gc-aimsg') }],
      arithExpr: S('gc-arith'), arithResult: S('gc-arithres'), _analysis: S('gc-analysis'), quadHunt: { hypothesis: S('gc-hyp') }, sliderA: P(),
    }),
    questTrue: ['complete_3_challenges', 'ask_ai_3'], questReset: ['graph_3_functions'],
  },
  {
    key: '_coordGrid', id: 'coordinate', file: 'stem_tool_coordgrid.js',
    progress: {
      badges: { firstPlot: true, plotter: true }, bestStreak: 5, plotsSolved: 4, slopesSolved: 3, distanceSolved: 3, linesMade: 5,
      chessSolved: 2, worldSolved: 1, bsBest: 24, aiAsked: 1, revealedItems: { 'slope:1,2>3,4': true },
    },
    work: () => ({
      gridPoints: [{ x: P(), y: P() }], coordinateInputX: S('cg-x'), coordinateInputY: S('cg-y'),
      gridFeedback: { riseAnswer: S('cg-rise'), runAnswer: S('cg-run') }, funcInput: S('cg-func'), bsInput: S('cg-bs'),
      chessInput: S('cg-chess'), worldClickLat: P(), aiQuestion: S('cg-aiq'), _quadHunt: { explanation: S('cg-expl') }, streak: P(), bsWon: true,
    }),
    questTrue: ['plot_3', 'slope_3', 'distance_3', 'streak_5'], questReset: [],
  },
  {
    key: 'inequality', id: 'inequality', file: 'stem_tool_inequality.js',
    progress: {
      badges: { firstGraph: true }, modesUsed: { '1d': true, '2d': true }, tiersUsed: { easy: true }, tiersSolved: { easy: true },
      quizCorrectTotal: 6, solverCount: 3, testCount: 4,
    },
    work: () => ({
      expr: S('iq-expr'), exprHistory: [S('iq-hist')], testVal: S('iq-testval'), solverExpr: S('iq-solver'),
      testsRun: { [S('iq-testsrun') + '|5']: true }, solverSolved: [S('iq-solved')], quiz: { chosen: S('iq-quiz') }, _ineqHunt: { hypothesis: S('iq-hyp') },
      studentGraphed: true,
    }),
    questTrue: ['quiz_5_correct', 'both_modes', 'solver_3'], questReset: ['graph_first'],
  },
  {
    key: 'logicLab', id: 'logicLab', file: 'stem_tool_logiclab.js',
    progress: {
      score: 43, bestStreak: 4, solvedProofs: { L0: true, L1: true, L2: true },
      xpCredited: { 'fallacy:2': true, 'quickfire:5': true, 'detective:1': true, learn: true, 'preset:P → Q': true },
    },
    // Keys a student's typed text reaches are left out on save.
    expected: {
      score: 43, bestStreak: 4, solvedProofs: { L0: true, L1: true, L2: true },
      xpCredited: { 'fallacy:2': true, 'quickfire:5': true, 'detective:1': true, learn: true, 'preset:P → Q': true },
    },
    work: () => ({
      expression: S('ll-expr'), proofSteps: [S('ll-step1'), S('ll-step2'), S('ll-step3')], challengeAnswer: S('ll-answer'), userTopic: S('ll-topic'),
      qfAnswers: [S('ll-qf')], fallacyNote: S('ll-note'), aiProof: { goal: S('ll-aiproof') },
      xpCredited: { ['claim:tautology:' + S('ll-claim')]: true }, solvedProofs: { ['ai:' + S('ll-aiprem') + '=>Q']: true }, streak: P(),
    }),
    questTrue: ['complete_challenge', 'complete_3_challenges'], questReset: ['build_truth_table', 'write_3_proof_steps'],
  },
  {
    key: '_ratioLab', id: 'ratioLab', file: 'stem_tool_ratios.js',
    progress: {
      modesVisited: { ratioTable: true, numberLine: true, unitRates: true, percent: true, proportional: true },
      solvedChallenges: { 'ratio-paint': true, 'ratio-simplify': true, 'line-tickets': true, 'unit-snacks': true, 'prop-yes-table': true },
      challengeAttempts: 7,
    },
    work: () => ({
      challengeAnswer: S('rl-answer'), challengeFeedback: { message: S('rl-feedback') }, missedChallenges: { 'percent-part': true },
      ratioA: P(), unitPredictionChoice: S('rl-pred'), percentPart: P(), challengeCursorByMode: { percent: P() },
    }),
    questTrue: ['ratio_explorer', 'ratio_challenger', 'proportion_detective'], questReset: [],
  },
  {
    key: '_volume', id: 'volume', file: 'stem_tool_volume.js',
    progress: {
      badges: { firstVolume: true, prismBuilder: true }, score: { correct: 6, total: 8 }, totalPlaced: 24, wpSolved: 3,
      wpExplored: { 0: true, 1: true }, wpSolvedKeys: { '0:3x4x5': true }, dispSolved: 3, layerUsed: true,
    },
    work: () => ({
      answer: S('vol-answer'), wpAnswer: S('vol-wp'), dispPrediction: S('vol-dispred'), dispExplanation: S('vol-dispexpl'),
      dispTrials: [{ guess: S('vol-trial') }], attemptHist: [P()], positions: [S('vol-pos')], saved: { mine: { positions: [S('vol-saved')] } },
      undoStack: [S('vol-undo')], _volPred: S('vol-volpred'), dims: { l: P(), w: 2, h: 2 }, feedback: { msg: S('vol-fb') }, streak: P(),
    }),
    questTrue: ['solve_5', 'word_3', 'displacement_3', 'build_10'], questReset: [],
  },
  {
    key: 'protractor', id: 'protractor', file: 'stem_tool_angles.js',
    progress: {
      earnedBadges: { first_angle: true, right_on: true }, bestStreak: 6, estimateCount: 3,
      polygonsExplored: { 3: true, 4: true, 5: true }, typesSeen: { Acute: 5, Right: 1, Obtuse: 2 },
    },
    work: () => ({
      anglePins: [{ deg: P() }, { deg: P() }, { deg: P() }], angleHistory: [{ deg: P() }], estimateGuess: S('ang-guess'),
      aiAdvice: S('ang-ai'), speedScore: P(), triAngle1: P(), showBisector: true, activeTab: 'challenges', streak: P(),
    }),
    // Its quests read work and UI (pins placed, bisector shown, tab open).
    questTrue: [], questReset: ['pin_3_angles', 'use_bisector', 'explore_challenges'],
  },
  {
    key: 'statsLab', id: 'statsLab', file: 'stem_tool_statslab.js', deferred: true,
    progress: {
      testsRun: 4, compareMeansRun: true, correlationRun: true, regressionRun: true, significantResult: true, largeEffectFound: true,
      powerRun: true, apaCopied: 1, aiGradeOpens: 1, quizCompletedCount: 2, quizCorrect: 4, quizMastery: { 'Which test compares two means?': true },
    },
    work: () => ({
      twoColData: { aLabel: S('sl-alabel'), bLabel: 'B', a: [P(), P()], b: [P()] }, oneColData: { values: [P()], mu0: 0 },
      interpretationDraft: S('sl-draft'), aiGradeResponse: S('sl-aigrade'), wizardAnswers: { q1: S('sl-wizard') },
      lastResult: { summary: S('sl-result') }, multiColData: { groups: [{ label: S('sl-group'), values: [P()] }] },
    }),
    questTrue: ['sl_first_test', 'sl_compare_means', 'sl_correlation', 'sl_regression', 'sl_significance_found', 'sl_meaningful_effect', 'sl_apa_writeup', 'sl_power_analysis', 'sl_ai_graded', 'sl_ap_quiz'],
    questReset: [],
  },
  {
    key: 'probability', id: 'probability', file: 'stem_tool_probability.js',
    progress: {
      totalTrials: 240, experimentsUsed: { coin: true, dice: true, spinner: true }, _awardedTrialMilestones: [10, 50, 100],
      _completedChallenges: ['coin_flip_100', 'dice_sum'], _bestStreak: 5,
    },
    work: () => ({
      results: [S('prob-result')], customOutcomes: [S('prob-custom')], _piPoints: [{ x: P(), y: 0.5 }], lastResult: S('prob-last'),
      birthdaySample: [P()], distribHunt: { hypothesis: S('prob-hyp') }, convergenceHistory: [P()], trials: P(),
    }),
    questTrue: ['run_100_trials', 'try_3_experiments'], questReset: ['monte_carlo'],
  },
  {
    key: 'unitConvert', id: 'unitConvert', file: 'stem_tool_unitconvert.js',
    progress: {
      badges: { firstConvert: true, quizStreak5: true }, score: 55, bestStreak: 5,
      catsUsed: { length: true, mass: true, volume: true, temperature: true }, tempUnitsUsed: { C: true, F: true }, quizTotal: 12, historySaveCount: 3,
    },
    work: () => ({
      value: P(), valueDraft: S('uc-draft'), quizDraft: S('uc-quizdraft'), history: [{ from: S('uc-hist') }],
      pinnedConversions: [{ label: S('uc-pin') }], wordProblemAttempt: S('uc-wpattempt'), tutorResponse: S('uc-tutor'),
      quiz: { answer: S('uc-quiz') }, magHunt: { explanation: S('uc-expl') }, conversionPrediction: S('uc-pred'), streak: P(),
    }),
    questTrue: ['explore_4_categories', 'quiz_10', 'streak_5'], questReset: [],
  },
  {
    key: '_timeSchedule', id: 'timeSchedule', file: 'stem_tool_timeschedule.js',
    progress: {
      score: { correct: 5, total: 7 }, bestStreak: 4, clockAdjustments: 6, modesUsed: { clock: true, elapsed: true },
      solvedChallenges: { 'read-clock-0735': true, 'elapsed-workshop-end': true, 'interval-1320-1455': true, 'convert-1840-24h': true, 'convert-0015-12h': true },
      scheduleSolvedKeys: { 'school:event-duration': true, 'school:between-events-gap': true, 'school:event-start-24h': true },
      challengeAttempts: { 'read-clock-0735': 2 }, challengeTypesUsed: { read: true, elapsed: true },
      elapsedModelSignatures: { '480|45|1': true, '600|30|-1': true, '720|90|1': true },
    },
    work: () => ({
      challengeAnswer: S('ts-answer'), scheduleAnswer: S('ts-sched'), elapsedPrediction: S('ts-pred'),
      challengeFeedback: { message: S('ts-feedback') }, scheduleFeedback: S('ts-schedfb'), clockMinutes: P(),
      elapsedModelSignatures: { [S('ts-badsig')]: true }, missedChallenges: { 'convert-2107-12h': true }, streak: P(),
    }),
    questTrue: ['clock_connector', 'elapsed_explorer', 'schedule_reasoner', 'time_master'], questReset: [],
  },
  {
    key: 'dataPlot', id: 'dataPlot', file: 'stem_tool_dataplot.js',
    progress: {
      earnedBadges: { firstPoint: true }, dpScore: 4, chartsViewed: { scatter: true, bar: true }, quizTypesUsed: { correlation: true },
    },
    work: () => ({
      points: Array.from({ length: 10 }, () => ({ x: P(), y: P() })), xLabel: S('dp-x'), yLabel: S('dp-y'), zScoreInput: S('dp-z'),
      kernelSQL: S('dp-sql'), dpQuiz: { answer: S('dp-quiz') }, corrInquiry: { hypothesis: S('dp-hyp') }, undoStack: [S('dp-undo')], predX: P(),
      showResiduals: true, dpStreak: P(),
    }),
    // Its quests read the student's own data points and a view toggle.
    questTrue: [], questReset: ['plot_5_points', 'plot_10_points', 'view_residuals'],
  },
  {
    key: '_areaPerimeter', id: 'areaPerimeter', file: 'stem_tool_areaperimeter.js',
    progress: {
      score: { correct: 5, attempts: 7 }, bestStreak: 3, revealedBest: 24,
      modeVisits: { explore: true, compare: true, composite: true, investigate: true, challenge: true },
      solvedChallenges: { 'garden-area': true, 'frame-perimeter': true, 'missing-length': true, 'missing-width-perimeter': true, 'l-shape-area': true },
      targetsExplored: { 12: true, 18: true, 24: true }, compositeMethods: { add: true, subtract: true },
    },
    work: () => ({
      answer: S('ap-answer'), feedback: { text: S('ap-feedback') }, constructedRectangles: [{ w: P(), h: P() }],
      predictMeasurements: { area: S('ap-pred') }, buildFeedback: S('ap-buildfb'), missedChallenges: { 'rug-trim': true },
      revealedTiles: { [S('ap-tile')]: true }, width: P(), streak: P(),
    }),
    questTrue: ['tile_counter', 'measurement_tour', 'challenge_five', 'same_area_three', 'decomposition_duo'], questReset: [],
  },
  {
    key: 'calculus', id: 'calculus', file: 'stem_tool_calculus.js',
    progress: {
      calcScore: 5, methodsUsed: { left: true, right: true, midpoint: true, trapezoid: true }, nExplored: true, missionXP: { m1: true, m2: true },
    },
    work: () => ({
      predictInput: String(P()), predictSubmitted: true, derivInput1: S('calc-d1'), derivInput2: S('calc-d2'), overUnderGuess: S('calc-ou'),
      estimateReflection: S('calc-refl'), _calcExactInput: S('calc-exact'), antiA: P(), missionData: { answer: S('calc-mission') },
      calcQuiz: { answer: S('calc-quiz') }, derivHunt: { hypothesis: S('calc-hyp') }, aiExplain: S('calc-ai'), vizSlopeSeeds: [P()], calcStreak: P(),
    }),
    questTrue: ['explore_integral', 'try_all_methods'], questReset: ['predict_correctly'],
  },
];

// Stats Lab and Function Grapher seed their own defaults the first time they
// render without a bucket (STATSLAB_DEFAULTS; the funcGrapher init guard).
// These model that write.
export const STATS_DEFAULTS_LIKE = { testsRun: 0, mode: 'home', wizardStep: 0, powerInputs: { alpha: 0.05, power: 0.8 }, showMath: false };
export const FUNC_GRAPHER_DEFAULTS_LIKE = { type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, compare: false, aiExplain: '' };
export function seedDefaults(tool) {
  return tool.key === 'statsLab' ? STATS_DEFAULTS_LIKE : FUNC_GRAPHER_DEFAULTS_LIKE;
}
export function toolCreatesBucket(tool) {
  if (!tool.deferred) return null;
  return (next) => (next[tool.key] ? {} : { [tool.key]: Object.assign({}, seedDefaults(tool)) });
}

// A tool's bucket as the tool would hold it: work and progress together.
// (Where both define the same map, the work entries are added to it.)
export function fullBucket(tool) {
  const work = tool.work();
  const out = Object.assign({}, work, tool.progress);
  Object.keys(work).forEach((k) => {
    const w = work[k], p = tool.progress[k];
    if (p && w && typeof p === 'object' && typeof w === 'object' && !Array.isArray(p)) out[k] = Object.assign({}, w, p);
  });
  return out;
}

export function fullToolData() {
  const td = {};
  MATH_TOOLS.forEach((tool) => { td[tool.key] = fullBucket(tool); });
  // The Speed Run bucket is session state and is never saved.
  td._multTimer = { active: true, score: P(), missed: [S('mt-missed')], adaptiveHistory: [S('mt-adaptive')] };
  return td;
}

// Every key at every depth.
export function allKeys(value, out = [], path = '') {
  if (value && typeof value === 'object') {
    Object.keys(value).forEach((k) => {
      out.push(path ? path + '.' + k : k);
      allKeys(value[k], out, path ? path + '.' + k : k);
    });
  }
  return out;
}

// Mirrors the hub's quest-state resolver (_getToolQuestState): questDataKeys
// shallow-merged, else questDataKey, else toolData[id] || toolData['_' + id].
export function questState(cfg, toolId, td) {
  if (cfg.questDataKeys && cfg.questDataKeys.length) {
    const merged = {};
    cfg.questDataKeys.forEach((k) => Object.assign(merged, td[k] || {}));
    return merged;
  }
  if (cfg.questDataKey) return td[cfg.questDataKey] || {};
  return td[toolId] || td['_' + toolId] || {};
}
