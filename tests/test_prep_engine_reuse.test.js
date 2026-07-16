import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Hub;

const fixture = {
  id: 'engine-reuse-fixture',
  title: 'Engine reuse fixture',
  shortTitle: 'Reuse fixture',
  status: 'ready',
  batchSize: 2,
  domains: [
    { id: 'alpha', label: 'Alpha', weight: 0.5 },
    { id: 'beta', label: 'Beta', weight: 0.5 },
  ],
  items: [
    { id: 'alpha-1', domainId: 'alpha', prompt: 'Alpha one?', choices: ['Correct', 'Distractor'], answerIndex: 0 },
    { id: 'alpha-2', domainId: 'alpha', prompt: 'Alpha two?', choices: ['Distractor', 'Correct'], answerIndex: 1 },
    { id: 'beta-1', domainId: 'beta', prompt: 'Beta one?', choices: ['Correct', 'Distractor'], answerIndex: 0 },
    { id: 'beta-2', domainId: 'beta', prompt: 'Beta two?', choices: ['Distractor', 'Correct'], answerIndex: 1 },
  ],
};

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
});

describe('reusable Test Prep Hub learning engine', () => {
  it('records per-item learning signals and builds a transparent review queue', () => {
    const recorded = Hub.recordAttempt(
      { attempts: [] },
      fixture,
      { 'alpha-1': 1, 'alpha-2': 1, 'beta-1': 0, 'beta-2': 1 },
      { 'alpha-1': 'sure', 'alpha-2': 'sure', 'beta-1': 'guess', 'beta-2': 'sure' },
      1234,
      { mode: 'review', label: 'Reusable review fixture', itemIds: fixture.items.map((item) => item.id) },
    );

    expect(recorded.attempts[0]).toMatchObject({ mode: 'review', itemResults: { 'alpha-1': { correct: false, confidence: 'sure' }, 'beta-1': { correct: true, confidence: 'guess' } } });
    const plan = Hub.buildReviewSet(recorded, fixture, { limit: 3 });
    expect(plan).toMatchObject({ strategy: 'transparent-review-v1', packId: 'engine-reuse-fixture', attemptCount: 1, limit: 3 });
    expect(plan.itemIds).toHaveLength(3);
    expect(plan.itemIds).toContain('alpha-1');
    expect(plan.itemReasons['alpha-1']).toBe('Confident miss to recalibrate');
    expect(plan.counts.confidentMisses).toBeGreaterThanOrEqual(1);
    expect(plan.priorityDomains[0]).toMatchObject({ id: 'alpha', percent: 50 });
    expect(plan.limitation).toContain('not computerized adaptive testing');
  });

  it('uses the same review and custom-quiz engines across EPPP, Audiology, Reading Specialist, and Educational Leadership packs', () => {
    const ids = ['eppp-part-one', 'praxis-audiology-5343', 'praxis-reading-specialist-5302', 'praxis-educational-leadership-5412'];
    const packs = Hub.listPacks();

    for (const id of ids) {
      const pack = packs.find((candidate) => candidate.id === id);
      const originalFirstId = pack.items[0].id;
      const plan = Hub.buildReviewSet({ attempts: [] }, pack, { limit: 20 });
      expect(plan.items).toHaveLength(20);
      expect(new Set(plan.items.map((item) => item.domainId)).size).toBeGreaterThan(1);
      expect(plan.counts.notAttempted).toBe(20);
      expect(plan.itemIds.every((itemId) => pack.items.some((item) => item.id === itemId))).toBe(true);
      const custom = Hub.buildCustomQuiz(pack, { domainIds: pack.domains.slice(0, 2).map((domain) => domain.id), limit: 20, seed: id + '-reuse-proof' });
      expect(custom.items).toHaveLength(20);
      expect(custom.items.every((item) => custom.domainIds.includes(item.domainId))).toBe(true);
      expect(Hub.buildCustomQuiz(pack, { domainIds: custom.domainIds, limit: 20, seed: id + '-reuse-proof' }).itemIds).toEqual(custom.itemIds);
      expect(pack.items[0].id).toBe(originalFirstId);
    }
  });

  it('builds deterministic balanced custom quizzes from learner-selected domains', () => {
    const first = Hub.buildCustomQuiz(fixture, { domainIds: ['alpha', 'beta'], limit: 3, seed: 'variation-2' });
    const repeated = Hub.buildCustomQuiz(fixture, { domainIds: ['alpha', 'beta'], limit: 3, seed: 'variation-2' });
    const alphaOnly = Hub.buildCustomQuiz(fixture, { domainIds: ['alpha'], limit: 20, seed: 'variation-2' });

    expect(first).toMatchObject({ strategy: 'balanced-custom-v1', packId: 'engine-reuse-fixture', requestedLength: 3, limit: 3, domainIds: ['alpha', 'beta'] });
    expect(first.itemIds).toEqual(repeated.itemIds);
    expect(first.itemIds).toHaveLength(3);
    expect(new Set(first.items.map((item) => item.domainId))).toEqual(new Set(['alpha', 'beta']));
    expect(alphaOnly.itemIds).toHaveLength(2);
    expect(alphaOnly.items.every((item) => item.domainId === 'alpha')).toBe(true);
    expect(first.limitation).toContain('not an official test form');
  });

  it('searches questions and every released learning-object type through one pack-agnostic index', () => {
    const library = {
      chapters: [{ id: 'chapter-alpha', title: 'Alpha foundations', domain: 'alpha', reviewStatus: 'source-reviewed-editorial-pass', sections: [{ heading: 'Alpha evidence' }] }],
      flashcards: [{ id: 'card-alpha', front: 'Alpha card', back: 'Alpha answer', domain: 'alpha', reviewStatus: 'source-reviewed-editorial-pass' }],
      memoryAids: [{ id: 'aid-alpha', title: 'Alpha aid', content: 'Remember alpha', domain: 'alpha', tags: ['alpha'], reviewStatus: 'source-reviewed-editorial-pass' }],
      constructedResponseWorkshops: [{ id: 'workshop-alpha', title: 'Alpha workshop', prompt: 'Apply alpha', taskType: 'analysis' }],
    };
    const annotations = { records: [
      { id: 'note-alpha', packId: fixture.id, targetType: 'question', targetId: 'alpha-1', targetLabel: 'Alpha question note', kind: 'note', text: 'Alpha learner note', createdAt: 1, updatedAt: 1 },
      { id: 'highlight-alpha', packId: fixture.id, targetType: 'chapter', targetId: 'chapter-alpha', targetLabel: 'Alpha chapter highlight', kind: 'highlight', color: 'blue', text: 'Alpha key passage', createdAt: 1, updatedAt: 1 },
    ] };
    const search = Hub.searchPack(fixture, library, 'alpha', { limit: 20, annotations });

    expect(search.total).toBeGreaterThanOrEqual(8);
    expect(new Set(search.results.map((result) => result.type))).toEqual(new Set(['question', 'chapter', 'flashcard', 'memory-aid', 'constructed-response', 'note', 'highlight']));
    expect(search.results.every((result) => result.id && result.title)).toBe(true);
    expect(Hub.searchPack(fixture, library, '', {}).results).toEqual([]);
  });

  it('migrates simple flashcard ratings and schedules transparent due-date intervals', () => {
    const cards = [{ id: 'card-1', front: 'One', back: 'Answer one', domain: 'alpha' }, { id: 'card-2', front: 'Two', back: 'Answer two', domain: 'beta' }];
    const migrated = Hub.normalizeFlashcardSchedule({ 'card-1': 'know' });
    expect(migrated['card-1']).toMatchObject({ rating: 'know', repetitions: 1, dueAt: 0 });

    const reviewed = Hub.rateFlashcard({}, 'card-1', 'know', 1_000);
    expect(reviewed['card-1']).toMatchObject({ rating: 'know', repetitions: 1, intervalDays: 1, lastReviewedAt: 1_000, dueAt: 86_401_000 });
    const queue = Hub.buildFlashcardQueue(cards, reviewed, { now: 1_000, dueOnly: true });
    expect(queue.items.map((card) => card.id)).toEqual(['card-2']);
    expect(queue).toMatchObject({ total: 2, dueCount: 1, scheduledCount: 1 });

    const again = Hub.rateFlashcard(reviewed, 'card-1', 'again', 2_000);
    expect(again['card-1']).toMatchObject({ rating: 'again', repetitions: 0, intervalDays: 0, dueAt: 602_000 });
  });
  it('normalizes, updates, searches, and deletes portable pack-scoped annotations', () => {
    const created = Hub.upsertAnnotation({}, { packId: fixture.id, targetType: 'question', targetId: 'alpha-1', targetLabel: 'Question: Alpha one?', kind: 'highlight', color: 'blue', text: 'Distinguish the alpha rule.' }, 1000);
    expect(created.records).toHaveLength(1);
    expect(created.records[0]).toMatchObject({ packId: fixture.id, targetType: 'question', targetId: 'alpha-1', kind: 'highlight', color: 'blue', createdAt: 1000, updatedAt: 1000 });

    const updated = Hub.upsertAnnotation(created, { ...created.records[0], text: 'Updated alpha distinction.' }, 2000);
    expect(updated.records).toHaveLength(1);
    expect(updated.records[0]).toMatchObject({ text: 'Updated alpha distinction.', createdAt: 1000, updatedAt: 2000 });
    expect(Hub.deleteAnnotation(updated, updated.records[0].id)).toEqual({ records: [] });
    expect(Hub.normalizeAnnotations({ records: [{ packId: fixture.id, text: '  ' }, { packId: '', text: 'invalid' }] })).toEqual({ records: [] });
  });

  it('builds weekly activity goals and streaks without converting activity into readiness', () => {
    const now = Date.UTC(2026, 5, 17, 12);
    const progress = { attempts: [
      { id: 'a1', packId: fixture.id, completedAt: now - 24 * 60 * 60 * 1000, correct: 3, total: 4, percent: 75, mode: 'custom', itemIds: fixture.items.map((item) => item.id) },
      { id: 'a2', packId: fixture.id, completedAt: now, correct: 5, total: 6, percent: 83, mode: 'review', itemIds: fixture.items.map((item) => item.id) },
    ] };
    const plans = { byPack: { [fixture.id]: { weeklyQuestions: 10, weeklySets: 2, activeDays: 2 } } };
    const status = Hub.buildStudyPlanStatus(progress, plans, fixture.id, now);

    expect(status).toMatchObject({ questionsCompleted: 10, setsCompleted: 2, activeDaysCompleted: 2, activityStreakDays: 2, questionPercent: 100, setPercent: 100, activeDayPercent: 100 });
    expect(status.plan).toEqual({ weeklyQuestions: 10, weeklySets: 2, activeDays: 2 });
    expect(status.limitation).toContain('do not estimate readiness');
    expect(Hub.studyPlanForPack({}, fixture.id)).toEqual({ weeklyQuestions: 100, weeklySets: 3, activeDays: 3 });
  });
  it('exports and safely restores progress and saved-review IDs without pack-specific code', () => {
    const progress = Hub.recordAttempt({ attempts: [] }, fixture, { 'alpha-1': 0, 'alpha-2': 1, 'beta-1': 0, 'beta-2': 1 }, {}, 4567, { mode: 'review', itemIds: fixture.items.map((item) => item.id) });
    const annotations = Hub.upsertAnnotation({}, { packId: fixture.id, targetType: 'general', targetLabel: 'General pack note', text: 'Portable note' }, 9000);
    const studyPlans = { byPack: { [fixture.id]: { weeklyQuestions: 80, weeklySets: 4, activeDays: 3 } } };
    const payload = Hub.exportProgress(progress, { 'engine-reuse-fixture': ['alpha-1', 'alpha-1', 'beta-2'] }, 9999, { annotations, studyPlans });
    const restored = Hub.importProgress(JSON.stringify(payload));

    expect(payload).toMatchObject({ schemaVersion: 2, kind: 'alloflow-test-prep-progress', exportedAt: 9999 });
    expect(restored.progress).toEqual(Hub.normalizeProgress(progress));
    expect(restored.reviewItems['engine-reuse-fixture']).toEqual(['alpha-1', 'beta-2']);
    expect(restored.annotations).toEqual(Hub.normalizeAnnotations(annotations));
    expect(restored.studyPlans).toEqual(Hub.normalizeStudyPlans(studyPlans));
    const legacy = Hub.importProgress(JSON.stringify({ schemaVersion: 1, kind: 'alloflow-test-prep-progress', progress, reviewItems: {} }));
    expect(legacy.annotations).toEqual({ records: [] });
    expect(legacy.studyPlans).toEqual({ byPack: {} });
    expect(() => Hub.importProgress('{"schemaVersion":99}')).toThrow(/Unsupported AlloFlow/);
  });
});