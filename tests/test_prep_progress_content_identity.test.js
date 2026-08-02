import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Hub;

const PACK_SHA = 'a'.repeat(64);
const CURRENT_IDENTITY = {
  packVersion: '2026.1',
  packContentFingerprint: `sha256:${PACK_SHA}`,
};
const OTHER_IDENTITY = {
  packVersion: '2026.1',
  packContentFingerprint: `sha256:${'b'.repeat(64)}`,
};
const fixture = {
  id: 'revision-bound-fixture',
  version: '2026.1',
  title: 'Revision-bound fixture',
  shortTitle: 'Revision fixture',
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

function attempt(overrides = {}) {
  const itemId = overrides.itemId || 'alpha-1';
  const domainId = itemId.startsWith('beta') ? 'beta' : 'alpha';
  const correct = overrides.correct === true;
  const identity = Object.prototype.hasOwnProperty.call(overrides, 'identity')
    ? overrides.identity
    : CURRENT_IDENTITY;
  const base = {
    id: `attempt-${itemId}-${overrides.completedAt || 1}`,
    packId: fixture.id,
    completedAt: overrides.completedAt || 1,
    correct: correct ? 1 : 0,
    total: 1,
    percent: correct ? 100 : 0,
    mode: 'standard',
    itemIds: [itemId],
    itemResults: { [itemId]: { correct, confidence: overrides.confidence || 'sure' } },
    byDomain: { [domainId]: { correct: correct ? 1 : 0, total: 1 } },
    bySkill: {},
    confidenceSummary: {
      sure: { correct: correct ? 1 : 0, total: 1 },
      unsure: { correct: 0, total: 0 },
      guess: { correct: 0, total: 0 },
      unrated: { correct: 0, total: 0 },
    },
  };
  if (identity) Object.assign(base, identity);
  return base;
}

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

describe('Test Prep content-revision progress boundaries', () => {
  it('resolves a manifest-bound identity and a deterministic bundled fallback', () => {
    const manifestIdentity = Hub.resolvePackContentIdentity(fixture, {
      id: fixture.id,
      version: fixture.version,
      loadMode: 'lazy',
      packUrl: 'https://cdn.example.test/revision-bound-fixture.json',
      sha256: PACK_SHA,
    });
    expect(manifestIdentity).toEqual(CURRENT_IDENTITY);

    const fallback = Hub.resolvePackContentIdentity(fixture);
    const repeated = Hub.resolvePackContentIdentity(fixture);
    const revised = Hub.resolvePackContentIdentity({
      ...fixture,
      items: fixture.items.map((item, index) => index === 0 ? { ...item, prompt: 'Revised alpha one?' } : item),
    });
    expect(fallback).toEqual(repeated);
    expect(fallback).toMatchObject({ packVersion: fixture.version });
    expect(fallback.packContentFingerprint).toMatch(/^tp-content-v1:[a-f0-9]{32}$/);
    expect(revised.packContentFingerprint).not.toBe(fallback.packContentFingerprint);
  });

  it('treats identity as an atomic pair and records explicit current identity', () => {
    const normalized = Hub.normalizeProgress({
      attempts: [
        attempt({ completedAt: 1 }),
        attempt({ completedAt: 2, itemId: 'alpha-2', identity: { packVersion: CURRENT_IDENTITY.packVersion } }),
        attempt({ completedAt: 3, itemId: 'beta-1', identity: { packContentFingerprint: CURRENT_IDENTITY.packContentFingerprint } }),
      ],
    });
    expect(normalized.attempts[0]).toMatchObject(CURRENT_IDENTITY);
    expect(normalized.attempts[1]).toMatchObject({ packVersion: '', packContentFingerprint: '' });
    expect(normalized.attempts[2]).toMatchObject({ packVersion: '', packContentFingerprint: '' });
    expect(Hub.contentIdentityStatus(normalized.attempts[0], CURRENT_IDENTITY)).toBe('current');
    expect(Hub.contentIdentityStatus(normalized.attempts[1], CURRENT_IDENTITY)).toBe('legacy-unbound');
    expect(Hub.contentIdentityStatus({ ...normalized.attempts[0], ...OTHER_IDENTITY }, CURRENT_IDENTITY)).toBe('different-revision');

    const recorded = Hub.recordAttempt(
      { attempts: [] },
      fixture,
      { 'alpha-1': 0, 'alpha-2': 1, 'beta-1': 0, 'beta-2': 1 },
      {},
      4,
      { mode: 'standard', itemIds: fixture.items.map((item) => item.id), ...CURRENT_IDENTITY },
    );
    expect(recorded.attempts[0]).toMatchObject(CURRENT_IDENTITY);
  });

  it('isolates current analytics while retaining legacy and other-revision counts', () => {
    const progress = {
      attempts: [
        attempt({ completedAt: 1, correct: true }),
        attempt({ completedAt: 2, itemId: 'alpha-2', identity: null }),
        attempt({ completedAt: 3, itemId: 'beta-1', identity: OTHER_IDENTITY }),
        attempt({ completedAt: 4, itemId: 'beta-2', identity: { packVersion: CURRENT_IDENTITY.packVersion } }),
      ],
    };

    const current = Hub.buildProgressAnalytics(progress, fixture.id, CURRENT_IDENTITY);
    expect(current).toMatchObject({
      attemptCount: 1,
      averagePercent: 100,
      legacyAttemptCount: 2,
      otherRevisionAttemptCount: 1,
      retainedAttemptCount: 3,
    });
    expect(current.uniqueItemsAttempted).toBe(1);

    const backwardsCompatible = Hub.buildProgressAnalytics(progress, fixture.id);
    expect(backwardsCompatible.attemptCount).toBe(4);
    expect(backwardsCompatible.uniqueItemsAttempted).toBe(4);
  });

  it('builds review queues from the exact current revision only', () => {
    const progress = {
      attempts: [
        attempt({ completedAt: 1, itemId: 'alpha-1', identity: CURRENT_IDENTITY }),
        attempt({ completedAt: 2, itemId: 'beta-1', identity: OTHER_IDENTITY }),
        attempt({ completedAt: 3, itemId: 'beta-2', identity: null }),
      ],
    };
    const review = Hub.buildReviewSet(progress, fixture, { limit: 4, contentIdentity: CURRENT_IDENTITY });

    expect(review.attemptCount).toBe(1);
    expect(review.itemReasons['alpha-1']).toBe('Confident miss to recalibrate');
    expect(review.itemReasons['beta-1']).toBe('Not attempted yet');
    expect(review.itemReasons['beta-2']).toBe('Not attempted yet');
  });

  it('exports schema 4 and imports older schemas without stamping legacy attempts current', () => {
    const currentProgress = { attempts: [attempt({ completedAt: 1 })] };
    const payload = Hub.exportProgress(currentProgress, {}, 9999);
    expect(payload).toMatchObject({ schemaVersion: 4, kind: 'alloflow-test-prep-progress', exportedAt: 9999 });
    expect(Hub.importProgress(JSON.stringify(payload)).progress.attempts[0]).toMatchObject(CURRENT_IDENTITY);

    for (const schemaVersion of [1, 2]) {
      const restored = Hub.importProgress(JSON.stringify({
        schemaVersion,
        kind: 'alloflow-test-prep-progress',
        progress: { attempts: [attempt({ completedAt: schemaVersion, identity: null })] },
        reviewItems: {},
      }));
      expect(restored.progress.attempts[0]).toMatchObject({ packVersion: '', packContentFingerprint: '' });
      expect(Hub.contentIdentityStatus(restored.progress.attempts[0], CURRENT_IDENTITY)).toBe('legacy-unbound');
    }
    expect(() => Hub.importProgress('{"schemaVersion":5,"kind":"alloflow-test-prep-progress"}')).toThrow(/Unsupported AlloFlow/);
  });

  it('strips present identity fields from legacy imports while schema 3 preserves them', () => {
    for (const schemaVersion of [1, 2]) {
      const restored = Hub.importProgress(JSON.stringify({
        schemaVersion,
        kind: 'alloflow-test-prep-progress',
        progress: { attempts: [attempt({ completedAt: schemaVersion, identity: CURRENT_IDENTITY })] },
        reviewItems: {},
      }));
      expect(restored.progress.attempts[0]).toMatchObject({
        packVersion: '',
        packContentFingerprint: '',
      });
      expect(Hub.contentIdentityStatus(restored.progress.attempts[0], CURRENT_IDENTITY)).toBe('legacy-unbound');
    }

    const current = Hub.importProgress(JSON.stringify({
      schemaVersion: 3,
      kind: 'alloflow-test-prep-progress',
      progress: { attempts: [attempt({ completedAt: 3, identity: CURRENT_IDENTITY })] },
      reviewItems: {},
    }));
    expect(current.progress.attempts[0]).toMatchObject(CURRENT_IDENTITY);
    expect(Hub.contentIdentityStatus(current.progress.attempts[0], CURRENT_IDENTITY)).toBe('current');
  });

  it('normalizes saved-session identity atomically for safe resume checks', () => {
    const session = {
      packId: fixture.id,
      mode: 'standard',
      itemIds: fixture.items.map((item) => item.id),
      questionIndex: 2,
      answers: { 'alpha-1': 0 },
      updatedAt: 100,
      ...CURRENT_IDENTITY,
    };
    const exact = Hub.normalizeSession(session);
    const partial = Hub.normalizeSession({ ...session, packContentFingerprint: '' });
    const mismatched = Hub.normalizeSession({ ...session, ...OTHER_IDENTITY });

    expect(exact).toMatchObject(CURRENT_IDENTITY);
    expect(Hub.contentIdentityStatus(exact, CURRENT_IDENTITY)).toBe('current');
    expect(partial).toMatchObject({ packVersion: '', packContentFingerprint: '' });
    expect(Hub.contentIdentityStatus(partial, CURRENT_IDENTITY)).toBe('legacy-unbound');
    expect(Hub.contentIdentityStatus(mismatched, CURRENT_IDENTITY)).toBe('different-revision');
  });
});
