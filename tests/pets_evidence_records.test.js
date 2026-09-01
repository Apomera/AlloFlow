import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = fs.readFileSync(path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'), 'utf8');

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not slice ${startMarker} -> ${endMarker}`);
  }
  return source.slice(start, end).trim();
}

function nthIndexOf(source, needle, occurrence = 0) {
  let index = -1;
  for (let i = 0; i <= occurrence; i += 1) {
    index = source.indexOf(needle, index + 1);
    if (index < 0) throw new Error(`Could not find occurrence ${occurrence} of ${needle}`);
  }
  return index;
}

function completionCall(moduleId, occurrence = 0) {
  const marker = `completeModule('${moduleId}'`;
  const start = nthIndexOf(SRC, marker, occurrence);
  const end = SRC.indexOf('});', start);
  if (end < 0) throw new Error(`Could not find the end of ${marker}`);
  return SRC.slice(start, end + 3);
}

function evidenceSchemaApi() {
  const schemaSource = between(
    SRC,
    'var PETS_EVIDENCE_MODULE_LABELS =',
    'function petsPersistentSnapshot('
  );
  return vm.runInNewContext(
    `(function () { ${schemaSource}; return {
      labels: PETS_EVIDENCE_MODULE_LABELS,
      petsOwn,
      normalizeEvidenceRecords,
      normalizePetsProgressMap,
      normalizePetsBadges,
      normalizeEvidenceTimestamp,
      normalizeAiScenarioId,
      normalizeAiDrafts,
      normalizeAiCritiqueRecord,
      normalizeAiCritiques,
      normalizeAiRevisionNotes,
      normalizeCareTradeoffState
    }; })()`,
    {
      AI_SCENARIOS: [{ id: 'family-pick' }, { id: 'cat-litter' }],
      PETS_BADGE_DISPLAY_LABELS: {
        pets_quiz_pass: 'Pets Quiz Passed',
        pets_quiz_ace: 'Pets Quiz Ace',
        pets_trainer: 'Reinforcement Trainer',
      },
      isFinite,
    }
  );
}

const EVIDENCE_API = evidenceSchemaApi();

function persistenceApi() {
  const keySource = between(SRC, 'var PETS_PERSIST_KEYS = [', 'function petsPersistentSnapshot(')
    .replace(/^var PETS_PERSIST_KEYS\s*=\s*/, '')
    .replace(/;\s*$/, '');
  const keys = vm.runInNewContext(keySource);
  const guardSource = between(SRC, 'function normalizeTrainerState(', 'function petsPersistentSnapshot(');
  const guards = vm.runInNewContext(
    `(function () { ${guardSource}; return {
      normalizeTrainerState,
      normalizePetsMiniGameState,
      normalizeToxicFoodIndices,
      normalizeToxicFoodReviewState,
      normalizeLifespanIndices,
      normalizeLifespanReviewState,
      normalizeKnowledgeQuizState,
      bodyLanguageContextChallenges,
      normalizeBodyLanguageTransfer,
      writePetsMiniGameState,
      normalizeCostEstimates
    }; })()`,
    { isFinite }
  );
  const snapshotSource = between(SRC, 'function petsPersistentSnapshot(', 'function writePetsLocalSnapshot(');
  const snapshot = vm.runInNewContext(`(${snapshotSource})`, {
    PETS_PERSIST_KEYS: keys,
    PETS_EVIDENCE_MODULE_LABELS: EVIDENCE_API.labels,
    petsOwn: EVIDENCE_API.petsOwn,
    canonicalDecoderMasteryCount: () => 0,
    normalizePetsProgressMap: EVIDENCE_API.normalizePetsProgressMap,
    normalizePetsBadges: EVIDENCE_API.normalizePetsBadges,
    normalizeDecoderMasteryState: () => ({}),
    normalizeBodyLanguageQuiz: (value) => value,
    normalizeBodyLanguageTransfer: guards.normalizeBodyLanguageTransfer,
    normalizeKnowledgeQuizState: guards.normalizeKnowledgeQuizState,
    normalizeEvidenceRecords: EVIDENCE_API.normalizeEvidenceRecords,
    normalizeAiScenarioId: EVIDENCE_API.normalizeAiScenarioId,
    normalizeAiDrafts: EVIDENCE_API.normalizeAiDrafts,
    normalizeAiCritiques: EVIDENCE_API.normalizeAiCritiques,
    normalizeAiRevisionNotes: EVIDENCE_API.normalizeAiRevisionNotes,
    normalizeCareTradeoffState: EVIDENCE_API.normalizeCareTradeoffState,
    normalizeTrainerState: guards.normalizeTrainerState,
    normalizeCareSimState: (value) => value,
    normalizePetsMiniGameState: guards.normalizePetsMiniGameState,
    normalizeToxicFoodIndices: guards.normalizeToxicFoodIndices,
    normalizeToxicFoodReviewState: guards.normalizeToxicFoodReviewState,
    normalizeLifespanIndices: guards.normalizeLifespanIndices,
    normalizeLifespanReviewState: guards.normalizeLifespanReviewState,
    writePetsMiniGameState: guards.writePetsMiniGameState,
    normalizeCostEstimates: guards.normalizeCostEstimates,
    isFinite,
  });
  return { keys, snapshot };
}

function evidenceHarness(initialRecords = [], initialNow = '2026-08-26T12:00:00.000Z') {
  const state = { evidenceRecords: initialRecords };
  const clock = { value: Date.parse(initialNow) };
  class EvidenceDate extends Date {
    constructor(...args) {
      super(args.length ? args[0] : clock.value);
    }
    static now() {
      return clock.value;
    }
  }
  const context = {
    MENU_TILES: [
      { id: 'dogs', label: 'Dogs' },
      { id: 'training', label: 'Pet Training' },
    ],
    modulesCompleted: {},
    modulesVisited: {},
    isTrackableModule: () => true,
    completedModuleCount: () => 1,
    awardBadge: () => {},
    petsAnnounce: () => {},
    Date: EvidenceDate,
    JSON,
    PETS_EVIDENCE_MODULE_LABELS: EVIDENCE_API.labels,
    normalizeEvidenceRecords: EVIDENCE_API.normalizeEvidenceRecords,
    isFinite,
    upd(key, value) {
      state[key] = typeof value === 'function' ? value(state[key]) : value;
    },
    updMulti(patch) {
      Object.assign(state, patch);
    },
  };
  const helperSource = between(SRC, 'function recordEvidence(', 'function goToView(');
  const helpers = vm.runInNewContext(
    `(function () { ${helperSource}; return { recordEvidence, completeModule }; })()`,
    context
  );
  return {
    state,
    helpers,
    advance(ms) {
      clock.value += ms;
    },
  };
}

const TEACHER = between(SRC, 'function renderTeacher()', 'function renderLifespan()');

function teacherHelper(startMarker, endMarker) {
  return vm.runInNewContext(`(${between(TEACHER, startMarker, endMarker)})`);
}

describe('Pets Lab structured evidence records', () => {
  it('uses one strict normalizer at the persistence boundary', () => {
    const { keys, snapshot } = persistenceApi();
    expect(Array.from(keys)).toContain('evidenceRecords');
    expect(Array.from(EVIDENCE_API.normalizeEvidenceRecords(null))).toEqual([]);
    expect(Array.from(EVIDENCE_API.normalizeEvidenceRecords({ training: [] }))).toEqual([]);
    expect(Array.from(snapshot({ evidenceRecords: { raw: 'not-an-array' } }).evidenceRecords)).toEqual([]);
    expect(snapshot({
      modulesVisited: { cats: '2026-08-25T13:00:00.000Z' },
    }).modulesVisited).toEqual({ cats: '2026-08-25T13:00:00.000Z' });
    expect(JSON.parse(JSON.stringify(EVIDENCE_API.normalizePetsProgressMap({
      cats: { completed: '2026-08-25T13:00:00.000Z', reason: 'Reviewed by learner' },
      quiz: null,
      unknown: { completed: '2026-08-25T13:00:00.000Z' },
      constructor: { completed: '2026-08-25T13:00:00.000Z', reason: 'PRIVATE' },
      dogs: { completed: 'not-a-date' },
    }, true)))).toEqual({
      cats: {
        completed: '2026-08-25T13:00:00.000Z',
        reason: 'Reviewed by learner',
      },
    });
    expect(JSON.parse(JSON.stringify(EVIDENCE_API.normalizePetsBadges({
      pets_quiz_pass: {
        earned: '2026-08-25T13:00:00.000Z',
        label: 'PRIVATE OVERRIDE',
      },
      pets_quiz_ace: null,
      pets_unknown: {
        earned: '2026-08-25T13:00:00.000Z',
      },
      constructor: {
        earned: '2026-08-25T13:00:00.000Z',
        label: 'PRIVATE PROTOTYPE BADGE',
      },
      pets_trainer: { earned: 'not-a-date' },
    })))).toEqual({
      pets_quiz_pass: {
        earned: '2026-08-25T13:00:00.000Z',
        label: 'Pets Quiz Passed',
      },
    });

    const privateText = 'PRIVATE RAW RESPONSE';
    const normalized = Array.from(EVIDENCE_API.normalizeEvidenceRecords([
      {
        moduleId: 'unknown-module',
        moduleLabel: privateText,
        summary: privateText,
        kind: 'activity',
        recordedAt: '2026-08-26T12:00:00.000Z',
        details: { score: 99 },
      },
      {
        moduleId: 'constructor',
        moduleLabel: privateText,
        summary: privateText,
        kind: 'activity',
        recordedAt: '2026-08-26T12:00:00.000Z',
        details: { score: 99 },
      },
      {
        id: privateText,
        moduleId: 'training',
        moduleLabel: privateText,
        summary: privateText,
        kind: 'activity',
        recordedAt: 'not-a-date',
        details: {
          rounds: 999,
          behaviorPct: 123.6,
          trustPct: -4,
          criterionMet: true,
          draft: privateText,
          feedbackSource: 'remote',
        },
      },
      {
        moduleId: 'aiPractice',
        moduleLabel: privateText,
        summary: privateText,
        kind: 'activity',
        recordedAt: '2026-08-26T10:00:00-04:00',
        details: {
          scenarioId: 'family-pick',
          draftChars: 9999,
          feedbackSource: 'ai',
          reviewStatus: 'teacher-review',
          revisionMade: true,
          revisionNoteChars: 9999,
          revisionNote: privateText,
          draft: privateText,
          critique: privateText,
        },
      },
      {
        moduleId: 'dogs',
        moduleLabel: privateText,
        summary: privateText,
        kind: 'activity',
        recordedAt: '2026-08-26T15:00:00.000Z',
        details: { criterionMet: true },
      },
    ]));

    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toMatchObject({
      moduleId: 'training',
      moduleLabel: 'Pet Training (applied)',
      kind: 'activity',
      summary: 'Completed the reinforcement trainer',
      recordedAt: '',
      details: { rounds: 100, behaviorPct: 100, trustPct: 0 },
    });
    expect(normalized[1]).toMatchObject({
      moduleId: 'aiPractice',
      moduleLabel: 'AI Practice',
      kind: 'activity',
      summary: 'Completed a response and feedback check',
      recordedAt: '2026-08-26T14:00:00.000Z',
      details: {
        scenarioId: 'family-pick',
        draftChars: 4000,
        feedbackSource: 'ai',
        reviewStatus: 'teacher-review',
        revisionMade: true,
        revisionNoteChars: 1200,
      },
    });
    expect(normalized[2]).toMatchObject({
      moduleId: 'dogs',
      moduleLabel: 'Dogs',
      kind: 'self-review',
      summary: 'Reviewed by learner',
      details: {},
    });
    expect(JSON.stringify(normalized)).not.toContain(privateText);

    const persisted = snapshot({
      aiRevisionNotes: {
        'family-pick': 'x'.repeat(2000),
      },
    });
    expect(Array.from(keys)).toContain('aiRevisionNotes');
    expect(persisted.aiRevisionNotes['family-pick']).toHaveLength(1200);
  });

  it('keeps persisted AI work text-only and scoped to authored scenarios', () => {
    const { snapshot } = persistenceApi();
    const privateText = 'PRIVATE UNKNOWN SCENARIO DATA';
    const safe = JSON.parse(JSON.stringify(snapshot({
      aiScenarioId: { private: true },
      aiResponse: { private: true },
      aiDrafts: {
        'family-pick': 'A valid family draft',
        'cat-litter': { private: true },
        removed: privateText,
      },
      aiCritiques: {
        'family-pick': {
          text: 'A valid critique',
          source: 'ai',
          draftSnapshot: 'A valid family draft',
          createdAt: '2026-08-26T12:00:00.000Z',
        },
        'cat-litter': { text: { private: true } },
        removed: { text: privateText },
      },
      aiRevisionNotes: {
        'family-pick': 'A valid revision note',
        'cat-litter': { private: true },
        removed: privateText,
      },
    })));

    expect(safe.aiScenarioId).toBeNull();
    expect(safe.aiResponse).toBe('');
    expect(safe.aiDrafts).toEqual({ 'family-pick': 'A valid family draft' });
    expect(safe.aiCritiques).toEqual({
      'family-pick': {
        text: 'A valid critique',
        source: 'ai',
        draftSnapshot: 'A valid family draft',
        createdAt: '2026-08-26T12:00:00.000Z',
      },
    });
    expect(safe.aiRevisionNotes).toEqual({
      'family-pick': 'A valid revision note',
    });
    expect(JSON.stringify(safe)).not.toContain(privateText);
    expect(snapshot({ aiScenarioId: 'cat-litter' }).aiScenarioId).toBe('cat-litter');
  });

  it('reconciles dependent activity fields instead of trusting contradictory success flags', () => {
    const at = '2026-08-26T16:00:00.000Z';
    const rows = Array.from(EVIDENCE_API.normalizeEvidenceRecords([
      { moduleId: 'training', kind: 'activity', recordedAt: at,
        details: { rounds: 1, behaviorPct: 100, trustPct: 100, criterionMet: true } },
      { moduleId: 'nutrition', kind: 'activity', recordedAt: at,
        details: { score: 9, total: 10, scorePct: 1, needsPractice: 27, criterionMet: false } },
      { moduleId: 'lifespan', kind: 'activity', recordedAt: at,
        details: { score: 12, total: 10, scorePct: 0, needsPractice: 10, criterionMet: false } },
      { moduleId: 'bodyLang', kind: 'activity', recordedAt: at,
        details: { score: 4, total: 4, scorePct: 100, practiceMode: 'context', criterionMet: true } },
      { moduleId: 'bodyLang', kind: 'activity', recordedAt: '2026-08-26T16:00:01.000Z',
        details: { score: 7, total: 10, scorePct: 100, practiceMode: 'random', criterionMet: true } },
      { moduleId: 'decoderMastery', kind: 'activity', recordedAt: at,
        details: { score: 0, total: 27, scorePct: 100, coverageComplete: true } },
      { moduleId: 'quiz', kind: 'activity', recordedAt: at,
        details: { score: 100, total: 1, scorePct: 100, strandsMet: 4, strandsTotal: 4, criterionMet: true } },
      { moduleId: 'quiz', kind: 'activity', recordedAt: '2026-08-26T16:00:01.000Z',
        details: {
          score: 12, total: 15, scorePct: 0,
          biologyCorrect: 1, biologyTotal: 3,
          behaviorCorrect: 2, behaviorTotal: 3,
          healthCorrect: 4, healthTotal: 6,
          welfareCorrect: 2, welfareTotal: 3,
          strandsMet: 4, strandsTotal: 4, criterionMet: true,
        } },
      { moduleId: 'careSim', kind: 'activity', recordedAt: at,
        details: {
          species: 'dog', days: 1, physical: 100, mental: 100, social: 100,
          environmental: 100, moneyLeft: 500, stayedInBudget: true,
          energyLeft: 100, caregiverSustainable: true, criterionMet: true,
        } },
      { moduleId: 'sensory', kind: 'activity', recordedAt: at,
        details: { perspectives: 0, criterionMet: true } },
    ]));

    const forModule = (moduleId) => rows.filter((row) => row.moduleId === moduleId);
    expect(forModule('training')[0].details).not.toHaveProperty('criterionMet');
    expect(forModule('nutrition')[0].details).toMatchObject({
      score: 9, total: 10, scorePct: 90, needsPractice: 1, criterionMet: true,
    });
    expect(forModule('lifespan')[0].details).toMatchObject({
      score: 10, total: 10, scorePct: 100, needsPractice: 0, criterionMet: true,
    });
    expect(forModule('bodyLang')[0].details).not.toHaveProperty('criterionMet');
    expect(forModule('bodyLang')[1].details).toMatchObject({ scorePct: 70, criterionMet: false });
    expect(forModule('decoderMastery')[0].details).toMatchObject({
      score: 0, scorePct: 0, coverageComplete: false,
    });
    expect(forModule('quiz')[0].details).not.toHaveProperty('criterionMet');
    expect(forModule('quiz')[1].details).toMatchObject({
      scorePct: 80, strandsMet: 3, strandsTotal: 4, criterionMet: false,
    });
    expect(forModule('careSim')[0].details).not.toHaveProperty('criterionMet');
    expect(forModule('sensory')[0].details).toMatchObject({ perspectives: 0, criterionMet: false });
  });

  it('reconciles and safely formats Zoonoses pathway evidence', () => {
    const privateText = 'PRIVATE ZOONOSIS SCENARIO OR SELECTED ACTION';
    const records = Array.from(EVIDENCE_API.normalizeEvidenceRecords([
      {
        moduleId: 'zoonoses',
        kind: 'activity',
        recordedAt: '2026-08-26T16:00:00.000Z',
        details: {
          score: 0,
          total: 4,
          scorePct: 100,
          needsPractice: 0,
          criterionMet: true,
          answers: [1, 2, 0, 3],
          scenarioText: privateText,
          selectedAction: privateText,
        },
      },
      {
        moduleId: 'zoonoses',
        kind: 'activity',
        recordedAt: '2026-08-26T16:01:00.000Z',
        details: {
          score: 3,
          total: 4,
          scorePct: 0,
          bestPct: 50,
          needsPractice: 4,
          criterionMet: false,
        },
      },
    ]));

    expect(records[0].details).toEqual({
      score: 0,
      total: 4,
      scorePct: 0,
      needsPractice: 4,
      criterionMet: false,
    });
    expect(records[1].details).toEqual({
      score: 3,
      total: 4,
      scorePct: 75,
      bestPct: 75,
      needsPractice: 1,
      criterionMet: true,
    });
    expect(JSON.stringify(records)).not.toContain(privateText);

    const evidenceOutcome = teacherHelper('function evidenceOutcome(record)', 'function evidenceGrowth(record)');
    const expected = '3 / 4 (75%) · 1 pathway to revisit';
    expect(evidenceOutcome(records[1]).startsWith(expected)).toBe(true);
  });

  it('caps at 80 while preserving the latest record for every module', () => {
    const base = Date.parse('2026-08-26T12:00:00.000Z');
    const raw = [{
      moduleId: 'cats',
      kind: 'self-review',
      recordedAt: new Date(base).toISOString(),
    }];
    for (let index = 0; index < 81; index += 1) {
      raw.push({
        moduleId: 'training',
        kind: 'activity',
        recordedAt: new Date(base + index + 1).toISOString(),
        details: { rounds: index, behaviorPct: index, trustPct: index, criterionMet: false },
      });
    }

    const normalized = Array.from(EVIDENCE_API.normalizeEvidenceRecords(raw));
    expect(normalized).toHaveLength(80);
    expect(normalized.filter((record) => record.moduleId === 'cats')).toHaveLength(1);
    expect(normalized.filter((record) => record.moduleId === 'training')).toHaveLength(79);
    expect(normalized.at(-1)).toMatchObject({
      moduleId: 'training',
      details: { rounds: 80, behaviorPct: 80, trustPct: 80 },
    });
  });

  it('retains the newest pass and failure milestone when long histories are compacted', () => {
    const base = Date.parse('2026-08-26T12:00:00.000Z');
    const raw = [{
      moduleId: 'training',
      kind: 'activity',
      recordedAt: new Date(base).toISOString(),
      details: { rounds: 10, behaviorPct: 80, trustPct: 90, criterionMet: true },
    }];
    for (let index = 0; index < 90; index += 1) {
      raw.push({
        moduleId: 'training',
        kind: 'activity',
        recordedAt: new Date(base + index + 1).toISOString(),
        details: {
          rounds: 10,
          behaviorPct: index % 70,
          trustPct: 80,
          criterionMet: true,
        },
      });
    }

    const normalized = Array.from(EVIDENCE_API.normalizeEvidenceRecords(raw));
    expect(normalized).toHaveLength(80);
    expect(normalized.some((record) => record.details.criterionMet === true)).toBe(true);
    expect(normalized.at(-1).details.criterionMet).toBe(false);
  });

  it('suppresses only identical adjacent evidence within two seconds', () => {
    const { state, helpers, advance } = evidenceHarness();
    const target = { rounds: 10, behaviorPct: 70, trustPct: 80, criterionMet: true };

    helpers.recordEvidence('training', 'untrusted summary A', target, 'activity');
    advance(1500);
    helpers.recordEvidence('training', 'untrusted summary B', target, 'activity');
    expect(state.evidenceRecords).toHaveLength(1);

    advance(501);
    helpers.recordEvidence('training', 'same result after boundary', target, 'activity');
    expect(state.evidenceRecords).toHaveLength(2);

    advance(100);
    helpers.recordEvidence('training', 'different adjacent result', { ...target, trustPct: 81 }, 'activity');
    advance(100);
    helpers.recordEvidence('training', 'non-adjacent repeat', target, 'activity');
    expect(state.evidenceRecords).toHaveLength(4);
    expect(state.evidenceRecords.every((record) => record.summary === 'Completed the reinforcement trainer')).toBe(true);
  });

  it('records manual completion as self-review with no criterion result', () => {
    const { state, helpers } = evidenceHarness();
    helpers.completeModule('dogs');
    expect(state.evidenceRecords).toHaveLength(1);
    const record = state.evidenceRecords[0];
    expect(record).toMatchObject({
      moduleId: 'dogs', moduleLabel: 'Dogs', kind: 'self-review', summary: 'Reviewed by learner',
    });
    expect(Object.keys(record.details)).toEqual([]);
    expect(record.details).not.toHaveProperty('criterionMet');

    const evidenceStatus = teacherHelper('function evidenceStatus(record, criterionRecord)', 'function evidenceOutcome(record)');
    expect(evidenceStatus({ kind: 'self-review', details: { criterionMet: true } }))
      .toBe('Learner reviewed — no activity criterion recorded');
  });

  it('pins criterion and review metadata at activity completion boundaries', () => {
    const training = completionCall('training');
    expect(training).toMatch(/rounds:\s*10/);
    expect(training).toMatch(/behaviorPct:\s*finalScore/);
    expect(training).toMatch(/trustPct:\s*trustScore/);
    expect(training).toMatch(/criterionMet:\s*finalScore\s*>=\s*70\s*&&\s*trustScore\s*>=\s*80/);

    const bodyLanguage = completionCall('bodyLang');
    expect(bodyLanguage).toMatch(/score:\s*blQuiz\.score/);
    expect(bodyLanguage).toMatch(/total:\s*quizTotal/);
    expect(bodyLanguage).toMatch(/scorePct:\s*scorePct/);
    expect(bodyLanguage).toMatch(/practiceMode:/);
    expect(bodyLanguage).toMatch(/needsPractice:/);
    expect(bodyLanguage).toMatch(
      /criterionMet:\s*\(blQuiz\.mode\s*\|\|\s*'random'\)\s*===\s*'random'\s*&&\s*quizTotal\s*===\s*10\s*\?\s*scorePct\s*>=\s*80\s*:\s*undefined/
    );

    const quizProgress = between(SRC, 'var attemptPct = !isReview', "style: btnPrimary({ width: '100%' })");
    const quiz = between(
      SRC,
      'var attemptEvidence = {',
      "completeModule('quiz', 'Finished all quiz questions', attemptEvidence);"
    );
    expect(quizProgress).toMatch(/Math\.round\(\(\(quizState\.score \|\| 0\) \/ quizPool\.length\) \* 100\)/);
    expect(quizProgress).toMatch(/Math\.max\(quizState\.bestPct \|\| 0, attemptPct\)/);
    expect(quiz).toMatch(/score:\s*quizState\.score/);
    expect(quiz).toMatch(/total:\s*quizPool\.length/);
    expect(quiz).toMatch(/scorePct:\s*attemptPct/);
    expect(quiz).toMatch(/bestPct:\s*nextBest/);
    expect(quiz).toMatch(/strandsMet:\s*attemptStrands\.met/);
    expect(quiz).toMatch(/strandsTotal:\s*attemptStrands\.total/);
    expect(quiz).toMatch(/criterionMet:\s*attemptTargetMet/);
    expect(quizProgress).toMatch(/attemptEvidence\[row\.id \+ 'Correct'\]\s*=\s*row\.correct/);
    expect(quizProgress).toMatch(/attemptEvidence\[row\.id \+ 'Total'\]\s*=\s*row\.total/);
    expect(quizProgress).toMatch(/attemptPct\s*>=\s*70[\s\S]*attemptStrands\.complete[\s\S]*attemptStrands\.met\s*===\s*attemptStrands\.total/);
    expect(quiz).not.toMatch(/scorePct:\s*nextBest|criterionMet:\s*nextBest/);

    const localAi = completionCall('aiPractice', 0);
    const generatedAi = completionCall('aiPractice', 1);
    for (const call of [localAi, generatedAi]) {
      expect(call).toMatch(/scenarioId:/);
      expect(call).toMatch(/draftChars:/);
      expect(call).toMatch(/reviewStatus:\s*'teacher-review'/);
      expect(call).not.toMatch(/criterionMet\s*:/);
      expect(call).not.toMatch(/\b(?:draft|critique|text)\s*:/);
    }
    expect(localAi).toMatch(/feedbackSource:\s*'local'/);
    expect(generatedAi).toMatch(/feedbackSource:\s*'ai'/);
    const revisedAi = completionCall('aiPractice', 2);
    expect(revisedAi).toMatch(/revisionMade:\s*true/);
    expect(revisedAi).toMatch(/revisionNoteChars:\s*trimmedNote\.length/);
    expect(revisedAi).toMatch(/reviewStatus:\s*'teacher-review'/);
    expect(revisedAi).not.toMatch(/revisionNote\s*:/);

    const care = completionCall('careSim');
    expect(care).toMatch(/physical:\s*Math\.round\(c\.phys\)/);
    expect(care).toMatch(/mental:\s*Math\.round\(c\.ment\)/);
    expect(care).toMatch(/social:\s*Math\.round\(c\.soc\)/);
    expect(care).toMatch(/environmental:\s*Math\.round\(c\.env\)/);
    expect(care).toMatch(/stayedInBudget:\s*finalWelfare\.moneySustainable/);
    expect(care).toMatch(/energyLeft:\s*Math\.round\(c\.en\)/);
    expect(care).toMatch(/caregiverSustainable:\s*finalWelfare\.energySustainable/);
    expect(care).toMatch(/criterionMet:\s*earned/);
    expect(SRC).toMatch(/var earned = \(finalWelfare\.minimum >= 70 && finalWelfare\.sustainable\)/);
  });

  it('renders AI evidence from metadata without exposing raw work', () => {
    expect(TEACHER).not.toMatch(/\baiDrafts\b|\baiCritiques\b|\baiRevisionNotes\b|draftSnapshot|record\.text/);
    expect(TEACHER).toMatch(/Raw AI drafts, critiques, revision reflections, and care-decision logs may remain locally for resume[\s\S]*excluded from this summary/);

    const evidenceOutcome = teacherHelper('function evidenceOutcome(record)', 'function evidenceGrowth(record)');
    const privateText = 'PRIVATE STUDENT RESPONSE SHOULD NOT RENDER';
    const outcome = evidenceOutcome({
      moduleId: 'aiPractice', summary: privateText,
      details: {
        scenarioId: 'family-pick', draftChars: 612, feedbackSource: 'ai',
        revisionMade: true, revisionNoteChars: 84,
        revisionNote: privateText,
        draft: privateText, critique: privateText,
      },
    });
    expect(outcome).toContain('Scenario family-pick');
    expect(outcome).toContain('612 draft characters');
    expect(outcome).toContain('ai feedback');
    expect(outcome).toContain('revision reflection saved (84 characters)');
    expect(outcome).not.toContain(privateText);
  });

  it('keeps focused Body practice, AI wording, and Care sustainability aligned with their targets', () => {
    const evidenceStatus = teacherHelper('function evidenceStatus(record, criterionRecord)', 'function evidenceOutcome(record)');
    const evidenceOutcome = teacherHelper('function evidenceOutcome(record)', 'function evidenceGrowth(record)');
    const focusedBody = {
      moduleId: 'bodyLang',
      kind: 'activity',
      details: {
        score: 2, total: 2, scorePct: 100,
        practiceMode: 'missed', needsPractice: 0,
      },
    };
    const randomTarget = {
      moduleId: 'bodyLang',
      kind: 'activity',
      details: {
        score: 8, total: 10, scorePct: 80,
        practiceMode: 'random', criterionMet: true,
      },
    };
    expect(evidenceStatus(focusedBody, randomTarget))
      .toBe('Random 8/10 target met — focused signal practice recorded');
    expect(evidenceOutcome(focusedBody))
      .toBe('2 / 2 (100%) · missed set · 0 signals still need practice');
    expect(TEACHER).toContain('Random target record: ');
    expect(TEACHER).toContain('The four-case Context Challenge adds separate formative transfer evidence');

    const normalizedContext = Array.from(EVIDENCE_API.normalizeEvidenceRecords([{
      moduleId: 'bodyLang',
      kind: 'activity',
      recordedAt: '2026-08-26T12:00:00.000Z',
      details: {
        score: 3, total: 4, scorePct: 75, practiceMode: 'context',
        criterionMet: true,
        answers: [2, 1, 0, 3],
        scenarioText: 'PRIVATE CONTEXT CASE',
      },
    }]))[0];
    expect(normalizedContext.details).toEqual({
      score: 3,
      total: 4,
      scorePct: 75,
      practiceMode: 'context',
    });
    expect(evidenceStatus(normalizedContext, null))
      .toBe('Context transfer practice recorded — random 8/10 target not yet checked');
    expect(evidenceOutcome(normalizedContext))
      .toBe('Context transfer 3 / 4 (75%) · context set');

    const normalizedCare = Array.from(EVIDENCE_API.normalizeEvidenceRecords([{
      moduleId: 'careSim',
      kind: 'activity',
      recordedAt: '2026-08-26T12:00:00.000Z',
      details: {
        species: 'dog', days: 7,
        physical: 82, mental: 76, social: 79, environmental: 74,
        weakestDomain: 'Environmental', weakestPct: 74,
        moneyLeft: 118, stayedInBudget: true,
        energyLeft: 46, caregiverSustainable: true, criterionMet: true,
        tiredCareTasks: 999,
      },
    }]))[0];
    expect(normalizedCare.details).toMatchObject({
      moneyLeft: 118,
      stayedInBudget: true,
      energyLeft: 46,
      caregiverSustainable: true,
      criterionMet: true,
    });
    expect(normalizedCare.details).not.toHaveProperty('tiredCareTasks');
    expect(evidenceOutcome(normalizedCare)).toContain('Budget sustainable ($118 left)');
    expect(evidenceOutcome(normalizedCare)).toContain('Caregiver energy 46% (sustainable)');

    const { state, helpers } = evidenceHarness();
    helpers.recordEvidence('careSim', 'Completed care week', {
      species: 'dog', days: 7,
      physical: 82, mental: 76, social: 79, environmental: 74,
      weakestDomain: 'Environmental', weakestPct: 74,
      moneyLeft: 118, stayedInBudget: true,
      energyLeft: 46, caregiverSustainable: true, criterionMet: true,
    }, 'activity');
    expect(state.evidenceRecords[0].details).toMatchObject({
      energyLeft: 46,
      caregiverSustainable: true,
      criterionMet: true,
    });

    expect(TEACHER).toContain('energy above 20%, and no care tasks attempted while exhausted');
    expect(TEACHER).toContain('Revising the draft and explaining one change adds stronger evidence');
  });

  it('reports growth and historical success without treating a lower retake as erased mastery', () => {
    const failed = {
      id: 'quiz:failed',
      moduleId: 'quiz',
      kind: 'activity',
      recordedAt: '2026-08-26T12:00:00.000Z',
      details: { scorePct: 40, bestPct: 40, criterionMet: false },
    };
    const passed = {
      id: 'quiz:passed',
      moduleId: 'quiz',
      kind: 'activity',
      recordedAt: '2026-08-26T13:00:00.000Z',
      details: { scorePct: 80, bestPct: 80, criterionMet: true },
    };
    const lowerRetake = {
      id: 'quiz:lower',
      moduleId: 'quiz',
      kind: 'activity',
      recordedAt: '2026-08-26T14:00:00.000Z',
      details: { scorePct: 60, bestPct: 90, criterionMet: false },
    };
    const growthSource = between(TEACHER, 'function evidenceGrowth(record)', "return h('div'");
    const statusSource = between(TEACHER, 'function evidenceStatus(record, criterionRecord)', 'function evidenceOutcome(record)');

    const improvedHistory = { quiz: [failed, passed] };
    const improvedGrowth = vm.runInNewContext(`(${growthSource})`, { activityHistory: improvedHistory, Math });
    const improvedStatus = vm.runInNewContext(`(${statusSource})`, { activityHistory: improvedHistory });
    expect(improvedGrowth(passed)).toContain('Latest 80% · Best 80%');
    expect(improvedGrowth(passed)).toContain('Improved 40 points from previous');
    expect(improvedGrowth(passed)).toContain('Target moved from needs practice to met');
    expect(improvedStatus(passed)).toBe('Activity target met');

    const retakeHistory = { quiz: [passed, lowerRetake] };
    const retakeGrowth = vm.runInNewContext(`(${growthSource})`, { activityHistory: retakeHistory, Math });
    const retakeStatus = vm.runInNewContext(`(${statusSource})`, { activityHistory: retakeHistory });
    expect(retakeGrowth(lowerRetake)).toContain('Latest 60% · Best 90%');
    expect(retakeGrowth(lowerRetake)).toContain('Earlier target success remains in the record');
    expect(retakeStatus(lowerRetake)).toBe('Latest target needs practice — target met on an earlier attempt');
    expect(retakeGrowth({ moduleId: 'quiz', kind: 'self-review', details: {} })).toBe('');
  });

  it('frames only trackable legacy completions without inventing a review or score', () => {
    const legacy = between(TEACHER, '// Older project files predate structured evidence.', 'var evidenceRows =');
    expect(legacy).toMatch(/Object\.keys\(modulesCompleted \|\| \{\}\)/);
    expect(legacy).toMatch(/if \(!isTrackableModule\(moduleId\)\) return/);
    expect(legacy).toMatch(/if \(latestEvidence\[moduleId\]\) return/);
    expect(legacy).toMatch(/kind:\s*'legacy-completion'/);
    expect(legacy).toMatch(/summary:\s*'Completed in an earlier project'/);
    expect(legacy).toMatch(/details:\s*\{\}/);
    expect(legacy).toMatch(/legacy:\s*true/);
    expect(legacy).toMatch(/evidenceCounts\[moduleId\]\s*=\s*0/);

    const evidenceStatus = teacherHelper('function evidenceStatus(record, criterionRecord)', 'function evidenceOutcome(record)');
    const evidenceOutcome = teacherHelper('function evidenceOutcome(record)', 'function evidenceGrowth(record)');
    const legacyRecord = {
      legacy: true,
      kind: 'legacy-completion',
      summary: 'PRIVATE OR MISLEADING OLD REASON',
      details: { criterionMet: true, score: 100 },
    };
    expect(evidenceStatus(legacyRecord)).toMatch(/^Earlier completion/);
    expect(evidenceStatus(legacyRecord)).toMatch(/criterion result unavailable$/);
    expect(evidenceOutcome(legacyRecord)).toBe('Completed in an earlier project; no activity score was saved');
    expect(evidenceOutcome(legacyRecord)).not.toContain(legacyRecord.summary);
  });

  it('counts only activity evidence as attempts', () => {
    const counting = between(TEACHER, 'var evidenceCounts =', '// Older project files predate structured evidence.');
    expect(counting).toMatch(/if \(record\.kind === 'activity'\)/);
    expect(counting).toMatch(/evidenceCounts\[record\.moduleId\]\s*=\s*\(evidenceCounts\[record\.moduleId\] \|\| 0\) \+ 1/);
    expect(TEACHER).toMatch(/record\.kind === 'legacy-completion' \? 'earlier save' : 'review record'/);
  });
});
