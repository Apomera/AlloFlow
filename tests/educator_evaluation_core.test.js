// Pure-contract tests for the Pennsylvania educator evaluation workflow.
// UI behavior is covered by the admin-suite mount smoke.

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
    };
  }
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  E = window.AlloModules.EducatorEvaluation && window.AlloModules.EducatorEvaluation._testing;
  if (!E) throw new Error('EducatorEvaluation did not register');
});

const professional = (overrides = {}) => ({
  employeeType: 'professional',
  buildingData: true,
  teacherSpecificData: true,
  ratings: {
    domains: { d1: 2, d2: 2, d3: 2, d4: 2 },
    building: 2,
    teacher: 2,
    lea: 2,
  },
  ...overrides,
});

const compactProfile = (teacher) => E.aeWeightProfile(teacher).map(({ id, weight }) => ({ id, weight }));

describe('Pennsylvania classroom-teacher framework shape', () => {
  it('defines the four weighted domains and all 22 components', () => {
    expect(E.AE_DOMAINS.map(({ id, code, label, weight }) => ({ id, code, label, weight }))).toEqual([
      { id: 'd1', code: '1', label: 'Planning and Preparation', weight: 20 },
      { id: 'd2', code: '2', label: 'Classroom Environment', weight: 30 },
      { id: 'd3', code: '3', label: 'Instruction', weight: 30 },
      { id: 'd4', code: '4', label: 'Professional Responsibilities', weight: 20 },
    ]);
    expect(E.AE_DOMAINS.map((domain) => domain.components.length)).toEqual([6, 5, 5, 6]);
    expect(E.AE_COMPONENTS).toHaveLength(22);
    expect(new Set(E.AE_COMPONENTS.map((component) => component.code)).size).toBe(22);
    expect(E.AE_COMPONENTS[0]).toMatchObject({ code: '1A', label: 'Knowledge of Content and Pedagogy', domainId: 'd1' });
    expect(E.AE_COMPONENTS.at(-1)).toMatchObject({ code: '4F', label: 'Showing Professionalism', domainId: 'd4' });
  });
});

describe('local custom-rubric contract', () => {
  const rubric = (overrides = {}) => ({
    name: 'District Four-Domain Pilot', versionTag: 'district-pilot-v1', domainWeighted: true,
    domains: ['d1', 'd2', 'd3', 'd4'].map((id, index) => ({ id, code: String(index + 1), label: `Domain ${index + 1}`, weight: 25, color: '#2563eb', components: [[`${index + 1}A`, 'Component']] })),
    ...overrides,
  });

  it('accepts the representable four-domain format and preserves it through workspace normalization', () => {
    const custom = E.aeNormalizeRubric(rubric());
    expect(custom).toMatchObject({ name: 'District Four-Domain Pilot', versionTag: 'district-pilot-v1', domainWeighted: true });
    const workspace = E.aeNormalizeWorkspace({ config: { organization: 'Local', frameworkProfile: 'pa_act13', customRubric: rubric() }, teachers: [], walkthroughs: [], observations: [], spms: [], comments: [], audit: [], cycleSnapshots: [] });
    expect(workspace.config.customRubric).toMatchObject({ versionTag: 'district-pilot-v1' });
    expect(workspace.config.frameworkVersion).toBe('district-pilot-v1');
  });

  it('rejects unrepresentable domain ids, incorrect weighted totals, and oversized component lists', () => {
    expect(E.aeNormalizeRubric(rubric({ domains: rubric().domains.map((domain, index) => index === 0 ? { ...domain, id: 'planning' } : domain) }))).toBeNull();
    expect(E.aeNormalizeRubric(rubric({ domains: rubric().domains.map((domain, index) => ({ ...domain, weight: index === 0 ? 20 : 25 })) }))).toBeNull();
    expect(E.aeNormalizeRubric(rubric({ domains: rubric().domains.map((domain, index) => index === 0 ? { ...domain, components: Array.from({ length: 51 }, (_, item) => [`1${item}`, 'Component']) } : domain) }))).toBeNull();
  });

  it('normalizes an unweighted compatible rubric to equal display weights', () => {
    const custom = E.aeNormalizeRubric(rubric({ domainWeighted: false, domains: rubric().domains.map((domain) => ({ ...domain, weight: 1 })) }));
    expect(custom.domains.map((domain) => domain.weight)).toEqual([25, 25, 25, 25]);
  });
});

describe('Act 13 weight profiles', () => {
  it('uses 70/10/10/10 when both BLD and TSD are available', () => {
    expect(compactProfile(professional())).toEqual([
      { id: 'observation', weight: 70 },
      { id: 'building', weight: 10 },
      { id: 'teacher', weight: 10 },
      { id: 'lea', weight: 10 },
    ]);
  });

  it('moves unavailable BLD to Observation & Practice', () => {
    expect(compactProfile(professional({ buildingData: false }))).toEqual([
      { id: 'observation', weight: 80 },
      { id: 'teacher', weight: 10 },
      { id: 'lea', weight: 10 },
    ]);
  });

  it('moves unavailable TSD to the LEA-selected measure', () => {
    expect(compactProfile(professional({ teacherSpecificData: false }))).toEqual([
      { id: 'observation', weight: 70 },
      { id: 'building', weight: 10 },
      { id: 'lea', weight: 20 },
    ]);
  });

  it('uses 100% Observation & Practice for temporary professionals', () => {
    expect(compactProfile(professional({ employeeType: 'temporary', buildingData: false, teacherSpecificData: false })))
      .toEqual([{ id: 'observation', weight: 100 }]);
  });
});

describe('scoring and performance bands', () => {
  it('weights the four observation domains 20/30/30/20', () => {
    expect(E.aeObservationScore({ domains: { d1: 3, d2: 2, d3: 1, d4: 0 } })).toBe(1.5);
    expect(E.aeObservationScore({ domains: { d1: 3, d2: 2, d3: null, d4: 0 } })).toBeNull();
  });

  it('weights a complete profile and requires every active factor', () => {
    const teacher = professional({ ratings: {
      domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 3, teacher: 1, lea: 0,
    } });
    expect(E.aeOverallScore(teacher)).toBe(1.8);
    expect(E.aeOverallScore(professional({ ratings: {
      domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 2, teacher: null, lea: 2,
    } }))).toBeNull();
  });

  it('ignores non-applicable data factors for a temporary professional', () => {
    expect(E.aeOverallScore(professional({ employeeType: 'temporary', ratings: {
      domains: { d1: 3, d2: 2, d3: 1, d4: 0 }, building: null, teacher: null, lea: null,
    } }))).toBe(1.5);
  });

  it('applies the PDE thousandth-then-hundredth boundary before banding', () => {
    const raw = E.aeOverallScore(professional({ ratings: {
      domains: { d1: 2.496, d2: 2.496, d3: 2.496, d4: 2.496 },
      building: 2.496,
      teacher: 2.496,
      lea: 2.496,
    } }));

    expect(raw).toBe(2.496);
    expect(E.aeRoundedScore).toBeTypeOf('function');
    expect(E.aeRoundedScore(raw)).toBe(2.5);
    expect(E.aeBand(raw)).toBe('Distinguished');
  });

  it.each([-0.001, 3.001])('rejects an out-of-range domain rating of %s', (rating) => {
    expect(E.aeObservationScore({
      domains: { d1: rating, d2: 2, d3: 2, d4: 2 },
    })).toBeNull();
  });

  it('rejects out-of-range final-evaluation factors', () => {
    expect(E.aeOverallScore(professional({ ratings: {
      domains: { d1: 2, d2: 2, d3: 2, d4: 2 },
      building: 3.001,
      teacher: 2,
      lea: 2,
    } }))).toBeNull();
    expect(E.aeOverallScore(professional({ ratings: {
      domains: { d1: 2, d2: 2, d3: 2, d4: 2 },
      building: 2,
      teacher: 2,
      lea: -0.001,
    } }))).toBeNull();
  });

  it.each([
    [0, 'Failing'], [0.49, 'Failing'], [0.5, 'Needs Improvement'], [1.49, 'Needs Improvement'],
    [1.5, 'Proficient'], [2.49, 'Proficient'], [2.5, 'Distinguished'], [3, 'Distinguished'],
  ])('maps %s to %s', (score, expected) => {
    expect(E.aeBand(score)).toBe(expected);
  });

  it('does not assign a band to a missing or invalid score', () => {
    expect(E.aeBand(null)).toBeNull();
    expect(E.aeBand(undefined)).toBeNull();
    expect(E.aeBand('not-a-score')).toBeNull();
  });

  it('uses a safe formal-rating label fallback for unexpected values', () => {
    expect(E.aeRatingLabel(0)).toBe('Failing');
    expect(E.aeRatingLabel(3)).toBe('Distinguished');
    expect(E.aeRatingLabel(2.5)).toBe('Unrecognized rating value');
    expect(E.aeRatingLabel('2')).toBe('Unrecognized rating value');
  });
});

describe('cycle completion semantics', () => {
  it('counts only active educators and treats only finalized records as complete', () => {
    const summary = E.aeCompletionSummary([
      { id: 'final-status', cycleStatus: 'finalized' },
      { id: 'final-timestamp', cycleStatus: 'awaiting_teacher', finalizedAt: '2026-06-01T12:00:00Z' },
      { id: 'teacher', cycleStatus: 'awaiting_teacher' },
      { id: 'evaluator', cycleStatus: 'awaiting_evaluator' },
      { id: 'progress', cycleStatus: 'in_progress' },
      { id: 'late', dueDate: '2000-01-01' },
      { id: 'new' },
      { id: 'inactive', active: false, cycleStatus: 'finalized' },
      null,
    ]);

    expect(summary).toEqual({
      total: 7,
      finalized: 2,
      open: 5,
      statuses: {
        finalized: 2,
        awaiting_teacher: 1,
        awaiting_evaluator: 1,
        in_progress: 1,
        overdue: 1,
        not_started: 1,
      },
    });
  });

  it.each(['not_started', 'in_progress', 'awaiting_teacher', 'awaiting_evaluator'])(
    'overrides the non-final %s status when the due date has passed',
    (cycleStatus) => {
      expect(E.aeTeacherStatus({ cycleStatus, dueDate: '2000-01-01' })).toBe('overdue');
    }
  );

  it('never overrides a finalized record with overdue', () => {
    expect(E.aeTeacherStatus({ cycleStatus: 'finalized', dueDate: '2000-01-01' })).toBe('finalized');
    expect(E.aeTeacherStatus({ finalizedAt: '2026-06-01T12:00:00Z', dueDate: '2000-01-01' })).toBe('finalized');
    expect(E.aeTeacherStatus(null)).toBe('not_started');
  });
});

describe('formal-observation workflow step', () => {
  it.each([
    [{}, 0],
    [{ preworkSubmittedAt: 'x' }, 1],
    [{ preConferenceAt: 'x' }, 2],
    [{ observedAt: 'x' }, 3],
    [{ evidencePublishedAt: 'x' }, 4],
    [{ reflectionSubmittedAt: 'x' }, 5],
    [{ postConferenceAt: 'x' }, 6],
    [{ evaluatorSignedAt: 'x' }, 7],
    [{ teacherAcknowledgedAt: 'x' }, 8],
    [{ finalizedAt: 'x' }, 9],
  ])('derives the expected step from %j', (observation, expected) => {
    expect(E.aeStepOfObservation(observation)).toBe(expected);
  });

  it('returns the furthest completed milestone when prior timestamps remain', () => {
    expect(E.aeStepOfObservation({
      preworkSubmittedAt: 'x', preConferenceAt: 'x', observedAt: 'x', evidencePublishedAt: 'x',
      reflectionSubmittedAt: 'x', postConferenceAt: 'x', evaluatorSignedAt: 'x',
      teacherAcknowledgedAt: 'x', finalizedAt: 'x',
    })).toBe(9);
    expect(E.aeStepOfObservation(null)).toBe(0);
  });
});

describe('evaluator next-action routing', () => {
  const teacher = { id: 't1', name: 'Teacher One', active: true, cycleStatus: 'in_progress' };
  const workspace = (overrides = {}) => ({ teachers: [teacher], observations: [], walkthroughs: [], spms: [], ...overrides });

  it('routes an evaluator-owned formal milestone directly to the formal workflow', () => {
    expect(E.aeTeacherNextAction(workspace({ observations: [{ id: 'o1', teacherId: 't1', preworkSubmittedAt: 'x' }] }), teacher))
      .toMatchObject({ tab: 'formal', label: 'Record pre-conference', owner: 'evaluator' });
  });

  it('surfaces another evaluator task before a formal step that is waiting on the educator', () => {
    expect(E.aeTeacherNextAction(workspace({
      observations: [{ id: 'o1', teacherId: 't1' }],
      spms: [{ id: 's1', teacherId: 't1', status: 'submitted' }],
    }), teacher)).toMatchObject({ tab: 'spm', label: 'Review submitted SPM / SLO', owner: 'evaluator' });
  });

  it('labels educator-owned waiting states without treating them as evaluator work', () => {
    expect(E.aeTeacherNextAction(workspace({ observations: [{ id: 'o1', teacherId: 't1', evidencePublishedAt: 'x' }] }), teacher))
      .toMatchObject({ tab: 'formal', label: 'Waiting for reflection', owner: 'teacher' });
  });

  it('offers assignment for an unstarted formal cycle and audit for a released cycle', () => {
    expect(E.aeTeacherNextAction(workspace(), teacher)).toMatchObject({ tab: 'formal', label: 'Assign formal observation', owner: 'evaluator' });
    expect(E.aeTeacherNextAction(workspace(), { ...teacher, finalizedAt: 'x' })).toMatchObject({ tab: 'audit', owner: 'complete' });
  });
});

describe('CSV export', () => {
  it('uses first-row headers, CRLF records, blanks nulls, and quotes unsafe cells', () => {
    const q = String.fromCharCode(34);
    expect(E.aeCsv([
      { code: 'T-01', educator: 'Ada, Teacher', note: 'Said ' + q + 'ready' + q + '\nNext', optional: null },
      { code: 'T-02', educator: 'Plain', note: '', optional: undefined, ignored: 'not a header' },
    ])).toBe(
      'code,educator,note,optional\r\n' +
      'T-01,' + q + 'Ada, Teacher' + q + ',' +
      q + 'Said ' + q + q + 'ready' + q + q + '\nNext' + q + ',\r\n' +
      'T-02,Plain,,'
    );
  });

  it('neutralizes spreadsheet formulas that begin with =, +, -, or @', () => {
    const apostrophe = String.fromCharCode(39);
    expect(E.aeCsv([{
      equals: '=1+1',
      plus: '+SUM(A1:A2)',
      minus: '-10',
      at: '@cmd',
      safe: 'plain text',
    }])).toBe(
      'equals,plus,minus,at,safe\r\n' +
      apostrophe + '=1+1,' +
      apostrophe + '+SUM(A1:A2),' +
      apostrophe + '-10,' +
      apostrophe + '@cmd,plain text'
    );
  });

  it('returns an empty string for no rows', () => {
    expect(E.aeCsv([])).toBe('');
    expect(E.aeCsv(null)).toBe('');
  });
});

describe('workspace import normalization', () => {
  it('rejects roots that are not plain workspace records', () => {
    expect(E.aeNormalizeWorkspace(null)).toBeNull();
    expect(E.aeNormalizeWorkspace('not-a-workspace')).toBeNull();
    expect(E.aeNormalizeWorkspace(42)).toBeNull();
    expect(E.aeNormalizeWorkspace([])).toBeNull();
  });

  it('filters malformed records and canonicalizes imported ratings', () => {
    const normalized = E.aeNormalizeWorkspace({
      config: 'not-a-config-record',
      teachers: [
        null,
        'not-a-teacher',
        [],
        {
          id: 'teacher-safe',
          name: 'Safe Teacher',
          ratings: {
            domains: { d1: -0.001, d2: 3.001, d3: '2.5', d4: true },
            building: '3',
            teacher: false,
            lea: 99,
          },
        },
      ],
      walkthroughs: [null, 'bad', { id: 'walk-safe' }],
      observations: [[], { id: 'observation-safe' }],
      spms: [false, { id: 'spm-safe' }],
      comments: [42, { id: 'comment-safe' }],
      audit: [null, { id: 'audit-safe' }],
    });

    expect(normalized).not.toBeNull();
    expect(normalized.config).toMatchObject({
      organization: 'Sample School',
      building: 'Main Building',
      evaluatorName: 'Principal',
      sampleMode: false,
    });
    expect(normalized.teachers).toHaveLength(1);
    expect(normalized.teachers[0]).toMatchObject({
      id: 'teacher-safe',
      name: 'Safe Teacher',
      ratings: {
        domains: { d1: null, d2: null, d3: 2.5, d4: null },
        building: 3,
        teacher: null,
        lea: null,
      },
    });
    expect(normalized.walkthroughs.map((item) => item.id)).toEqual(['walk-safe']);
    expect(normalized.observations.map((item) => item.id)).toEqual(['observation-safe']);
    expect(normalized.spms.map((item) => item.id)).toEqual(['spm-safe']);
    expect(normalized.comments.map((item) => item.id)).toEqual(['comment-safe']);
    expect(normalized.audit.map((item) => item.id)).toEqual(['audit-safe']);
  });
});
