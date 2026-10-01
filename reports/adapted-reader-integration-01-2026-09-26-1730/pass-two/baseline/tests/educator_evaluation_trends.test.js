// Pure contracts for privacy-conscious educator trend derivation.
// The production UI is exercised separately; these tests keep aggregation,
// suppression, and immutable history rules deterministic and reviewable.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let E;

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  if (!window.React) {
    window.React = {
      createElement: () => null,
      Fragment: 'Fragment',
      useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {},
      useRef: (value) => ({ current: value }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
    };
  }
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  E = window.AlloModules.EducatorEvaluation && window.AlloModules.EducatorEvaluation._testing;
  if (!E) throw new Error('EducatorEvaluation did not register');
});

const completeDomains = (value) => ({ d1: value, d2: value, d3: value, d4: value });

const teacher = (id = 'teacher-1') => ({
  id,
  code: id.toUpperCase(),
  name: id,
  active: true,
  ratings: {
    domains: completeDomains(null),
    building: null,
    teacher: null,
    lea: null,
  },
});

const baseWorkspace = (overrides = {}) => ({
  config: { academicYear: '2026–27', building: 'Main Building' },
  teachers: [teacher()],
  walkthroughs: [],
  observations: [],
  spms: [],
  comments: [],
  audit: [],
  cycleSnapshots: [],
  ...overrides,
});

const point = (teacherId, overall, date = '2026-02-01') => ({
  teacherId,
  source: 'formal_observation',
  recordId: teacherId + '-formal',
  date,
  academicYear: '2026–27',
  overall,
  d1: overall,
  d2: overall,
  d3: overall,
  d4: overall,
});

describe('educator trend helper export contract', () => {
  it('exports the derivation, aggregation, suppression, and bounds seams', () => {
    expect(E.AE_MIN_TREND_COHORT).toBe(10);
    expect(E.AE_MAX_CYCLE_SNAPSHOTS).toBe(5000);
    expect(E.aeTeacherTrendPoints).toBeTypeOf('function');
    expect(E.aeDistinctTeacherMedian).toBeTypeOf('function');
    expect(E.aeCohortMetric).toBeTypeOf('function');
  });
});

describe('teacher trend point derivation', () => {
  it('combines immutable cycle snapshots with finalized current formals without mutating inputs', () => {
    const workspace = baseWorkspace({
      cycleSnapshots: [{
        id: 'snapshot-2025',
        teacherId: 'teacher-1',
        staffCodeSnapshot: 'T-01',
        academicYear: '2025–26',
        buildingSnapshot: 'Main Building',
        employeeTypeSnapshot: 'professional',
        finalizedAt: '2026-06-15T16:00:00.000Z',
        finalScore: 2.75,
        // The all-factor final score remains frozen separately; O&P trends derive from the frozen domains.
        domainRatings: { d1: 1, d2: 1, d3: 2, d4: 2 },
        weightSnapshot: [{ id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: 100, color: '#1d4ed8' }],
        frameworkVersion: 'pa-act13-classroom-2021',
      }],
      observations: [
        {
          id: 'formal-current',
          teacherId: 'teacher-1',
          observedAt: '2027-02-10T14:30:00.000Z',
          finalizedAt: '2027-02-20T17:00:00.000Z',
          ratings: { d1: 3, d2: 2, d3: 1, d4: 0 },
        },
        {
          id: 'formal-draft',
          teacherId: 'teacher-1',
          observedAt: '2027-03-01T14:30:00.000Z',
          ratings: completeDomains(3),
        },
        {
          id: 'formal-incomplete',
          teacherId: 'teacher-1',
          observedAt: '2027-04-01T14:30:00.000Z',
          finalizedAt: '2027-04-02T17:00:00.000Z',
          ratings: { d1: 2, d2: 2, d3: null, d4: 2 },
        },
        {
          id: 'formal-other-teacher',
          teacherId: 'teacher-2',
          observedAt: '2027-01-01T14:30:00.000Z',
          finalizedAt: '2027-01-02T17:00:00.000Z',
          ratings: completeDomains(3),
        },
      ],
    });
    const before = JSON.stringify(workspace);

    expect(E.aeTeacherTrendPoints(workspace, 'teacher-1')).toEqual([
      {
        teacherId: 'teacher-1',
        source: 'cycle_snapshot',
        recordId: 'snapshot-2025',
        date: '2026-06-15',
        academicYear: '2025–26',
        overall: 1.5,
        d1: 1,
        d2: 1,
        d3: 2,
        d4: 2,
      },
      {
        teacherId: 'teacher-1',
        source: 'formal_observation',
        recordId: 'formal-current',
        date: '2027-02-10',
        academicYear: '2026–27',
        overall: 1.5,
        d1: 3,
        d2: 2,
        d3: 1,
        d4: 0,
      },
    ]);
    expect(E.aeTeacherTrendPoints(workspace, 'teacher-1', { source: 'formal_observation' }).map((point) => point.source)).toEqual(['formal_observation']);
    expect(JSON.stringify(workspace)).toBe(before);
  });

  it('applies inclusive from/to date filters and drops missing dates', () => {
    const snapshots = [
      ['before', '2026-08-31T23:59:59.000Z'],
      ['from-boundary', '2026-09-01T00:00:00.000Z'],
      ['to-boundary', '2026-09-30T23:59:59.000Z'],
      ['after', '2026-10-01T00:00:00.000Z'],
      ['undated', null],
    ].map(([id, finalizedAt]) => ({
      id,
      teacherId: 'teacher-1',
      academicYear: '2026–27',
      finalizedAt,
      finalScore: 2,
      domainRatings: completeDomains(2),
    }));

    const result = E.aeTeacherTrendPoints(
      baseWorkspace({ cycleSnapshots: snapshots }),
      'teacher-1',
      { from: '2026-09-01', to: '2026-09-30' },
    );

    expect(result.map(({ recordId, date }) => ({ recordId, date }))).toEqual([
      { recordId: 'from-boundary', date: '2026-09-01' },
      { recordId: 'to-boundary', date: '2026-09-30' },
    ]);
  });
});

describe('distinct-teacher aggregation', () => {
  it('averages each teacher first and then takes the median across teachers', () => {
    const points = [
      point('teacher-a', 0, '2026-01-01'),
      point('teacher-a', 0, '2026-02-01'),
      point('teacher-a', 0, '2026-03-01'),
      point('teacher-a', 0, '2026-04-01'),
      point('teacher-b', 2),
      point('teacher-c', 3),
    ];

    expect(E.aeDistinctTeacherMedian(points, 'overall')).toEqual({
      value: 2,
      contributorCount: 3,
    });
  });

  it('ignores missing, non-numeric, and out-of-range ratings', () => {
    const points = [
      point('missing-null', null),
      point('missing-empty', ''),
      point('invalid-text', 'two'),
      point('invalid-low', -0.01),
      point('invalid-high', 3.01),
      point('valid', 2.5),
    ];

    expect(E.aeDistinctTeacherMedian(points, 'overall')).toEqual({
      value: 2.5,
      contributorCount: 1,
    });
    expect(E.aeDistinctTeacherMedian(points.slice(0, -1), 'overall')).toEqual({
      value: null,
      contributorCount: 0,
    });
  });
});

describe('minimum cohort privacy suppression', () => {
  it('suppresses fewer than 10 distinct peers and does not disclose the small count', () => {
    const selected = point('selected-teacher', 0);
    const ninePeers = Array.from({ length: 9 }, (_, index) => point('peer-' + index, 2));

    expect(E.aeCohortMetric([selected, ...ninePeers], 'selected-teacher', 'overall')).toEqual({
      suppressed: true,
      value: null,
      contributorCount: null,
      minimum: 10,
    });
  });

  it('excludes the selected teacher and releases the median for 10 distinct peers', () => {
    const selected = point('selected-teacher', 0);
    const tenPeers = Array.from({ length: 10 }, (_, index) => (
      point('peer-' + index, index < 5 ? 1 : 3)
    ));

    expect(E.aeCohortMetric([selected, ...tenPeers], 'selected-teacher', 'overall')).toEqual({
      suppressed: false,
      value: 2,
      contributorCount: 10,
      minimum: 10,
    });
  });
});

describe('cycle snapshot import normalization', () => {
  it('normalizes snapshot fields and ratings while rejecting malformed or unknown-teacher records', () => {
    const normalized = E.aeNormalizeWorkspace(baseWorkspace({
      cycleSnapshots: [
        null,
        'not-a-record',
        {
          id: 'unknown-teacher',
          teacherId: 'teacher-missing',
          finalizedAt: '2026-06-01T12:00:00.000Z',
          finalScore: 2,
          domainRatings: completeDomains(2),
        },
        {
          id: 'snapshot-safe',
          teacherId: 'teacher-1',
          staffCodeSnapshot: 'T-01',
          academicYear: '2025–26',
          buildingSnapshot: 'Main Building',
          employeeTypeSnapshot: 'temporary',
          finalizedAt: '2026-06-01T12:00:00.000Z',
          finalScore: '2.5',
          domainRatings: { d1: '2.5', d2: -0.01, d3: 3, d4: true },
          weightSnapshot: [{ id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: 100, color: '#1d4ed8' }],
          frameworkVersion: 'pa-act13-classroom-2021',
        },
      ],
    }));

    expect(normalized.cycleSnapshots).toHaveLength(1);
    expect(normalized.cycleSnapshots[0]).toMatchObject({
      id: 'snapshot-safe',
      teacherId: 'teacher-1',
      staffCodeSnapshot: 'T-01',
      academicYear: '2025–26',
      buildingSnapshot: 'Main Building',
      employeeTypeSnapshot: 'temporary',
      finalizedAt: '2026-06-01T12:00:00.000Z',
      finalScore: 2.5,
      domainRatings: { d1: 2.5, d2: null, d3: 3, d4: null },
      frameworkVersion: 'pa-act13-classroom-2021',
    });
  });

  it('caps normalized immutable history at the exported bound', () => {
    const cycleSnapshots = Array.from({ length: E.AE_MAX_CYCLE_SNAPSHOTS + 1 }, (_, index) => ({
      id: 'snapshot-' + index,
      teacherId: 'teacher-1',
      staffCodeSnapshot: 'T-01',
      academicYear: '2025–26',
      buildingSnapshot: 'Main Building',
      employeeTypeSnapshot: 'professional',
      finalizedAt: '2026-06-01T12:00:00.000Z',
      finalScore: 2,
      domainRatings: completeDomains(2),
      frameworkVersion: 'pa-act13-classroom-2021',
    }));

    const normalized = E.aeNormalizeWorkspace(baseWorkspace({ cycleSnapshots }));

    expect(normalized.cycleSnapshots).toHaveLength(E.AE_MAX_CYCLE_SNAPSHOTS);
    expect(normalized.cycleSnapshots[0].id).toBe('snapshot-0');
    expect(normalized.cycleSnapshots.at(-1).id).toBe('snapshot-4999');
  });
});
