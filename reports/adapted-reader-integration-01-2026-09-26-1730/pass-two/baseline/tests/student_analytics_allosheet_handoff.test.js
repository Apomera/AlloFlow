import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const source = readFileSync('student_analytics_module.js', 'utf8');
let buildEnvelope;

function codeFactory(prefix, index, attempt) {
  return `${prefix}-CODE${String(index).padStart(3, '0')}${attempt}`;
}

function tierResolver(stats) {
  return { tier: stats && stats.mockTier };
}

function benchmarkResolver(probeType) {
  return { benchmark50: probeType === 'orf' ? 92 : 35 };
}

function activeFixture() {
  return {
    importedStudents: [{
      name: 'PRIVATE LEARNER ALPHA',
      filename: 'PRIVATE_FILE_ALPHA.json',
      stats: { mockTier: 2 },
      safetyFlags: [{ category: 'PRIVATE SAFETY DISCLOSURE ALPHA' }],
      data: {
        rawAnswer: 'PRIVATE RAW ANSWER ALPHA',
        reflection: 'PRIVATE REFLECTION ALPHA',
        iepNarrative: 'PRIVATE IEP NARRATIVE ALPHA',
      },
    }],
    probeHistory: {
      'PRIVATE LEARNER ALPHA': [{
        activity: 'orf',
        date: '2026-07-01T12:00:00.000Z',
        wcpm: 82,
        accuracy: 93.5,
        correct: 82,
        total: 88,
        grade: '3',
        form: 'A',
        source: 'live-session',
        student: 'PRIVATE LEARNER ALPHA',
        transcript: 'PRIVATE TRANSCRIPT ALPHA',
        prompt: 'PRIVATE PROBE PROMPT ALPHA',
      }],
    },
    interventionLogs: {
      'PRIVATE LEARNER ALPHA': [{
        id: 'PRIVATE LOG ID ALPHA',
        program: 'PRIVATE PROGRAM LABEL ALPHA',
        frequency: '3x/week',
        minutes: '30',
        groupSize: '4',
        startDate: '2026-06-15',
        createdAt: '2026-06-16T12:00:00.000Z',
        notes: 'PRIVATE INTERVENTION NOTE ALPHA',
      }],
    },
    rtiGoals: {
      'PRIVATE LEARNER ALPHA': {
        metric: 'orf',
        baseline: 60,
        baselineDate: '2026-06-01',
        target: 100,
        targetDate: '2026-10-01',
        updatedAt: '2026-06-01T12:00:00.000Z',
        recommendation: 'PRIVATE AUTOMATIC DECISION ALPHA',
      },
    },
  };
}

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  window.ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
  loadAlloModule('allo_sheet/transfer_adapter.js');
  loadAlloModule('student_analytics_module.js');
  buildEnvelope = window.AlloModules.StudentAnalytics._meta.buildAlloSheetEnvelope;
});

describe('Student Analytics -> AlloSheet privacy boundary', () => {
  it('emits three exact active-student tables joined by one opaque code without private source content', () => {
    const artifact = buildEnvelope(activeFixture(), {
      scope: 'active-student',
      activeLearner: 'PRIVATE LEARNER ALPHA',
      dateRange: '90d',
      createdAt: '2026-07-29T12:00:00.000Z',
      pseudonymFactory: codeFactory,
      tierResolver,
      benchmarkResolver,
    });

    expect(artifact).toMatchObject({
      kind: 'alloflow.tabular.v1',
      version: 1,
      source: {
        tool: 'student-analytics',
        label: 'Student Analytics / RTI',
        version: '1',
      },
      classification: {
        level: 'education-data',
        studentIdentifierIncluded: true,
        freeTextNotesIncluded: false,
      },
      privacy: {
        scope: 'active-student',
        identifierIncluded: true,
        reducedData: true,
        notesIncluded: false,
        transferEnablesAI: false,
      },
      capabilities: { writeBack: false, aiEnabled: false },
    });
    expect(artifact.tables.map(table => table.id)).toEqual([
      'probe_trends',
      'intervention_summary',
      'goal_progress',
    ]);

    const probe = artifact.tables[0];
    const intervention = artifact.tables[1];
    const goal = artifact.tables[2];
    expect(probe.columns.map(column => column.key)).toEqual([
      'learner_code',
      'measure_code',
      'measurement_date',
      'score_value',
      'score_unit',
      'accuracy_percent',
      'correct_count',
      'attempted_count',
      'benchmark_50th_value',
      'grade_level',
      'form_code',
      'source_type',
    ]);
    expect(intervention.columns.map(column => column.key)).toEqual([
      'learner_code',
      'intervention_code',
      'frequency_code',
      'minutes_per_session',
      'group_size',
      'start_date',
      'logged_date',
    ]);
    expect(goal.columns.map(column => column.key)).toEqual([
      'learner_code',
      'measure_code',
      'baseline_value',
      'baseline_date',
      'target_value',
      'target_date',
      'latest_value',
      'latest_measurement_date',
      'expected_at_latest',
      'difference_from_aimline',
      'weekly_growth_target',
      'measurement_count',
    ]);
    const learnerCode = probe.rows[0].values.learner_code;
    expect(learnerCode).toBe('L-CODE0000');
    expect(intervention.rows[0].values.learner_code).toBe(learnerCode);
    expect(goal.rows[0].values.learner_code).toBe(learnerCode);
    expect(probe.rows[0].values).toMatchObject({
      measure_code: 'orf',
      measurement_date: '2026-07-01',
      score_value: 82,
      score_unit: 'wcpm',
      accuracy_percent: 93.5,
      benchmark_50th_value: 92,
      grade_level: '3',
      form_code: 'A',
      source_type: 'live_session',
    });
    expect(intervention.rows[0].values).toMatchObject({
      intervention_code: 'I-CODE0000',
      frequency_code: '3x_week',
      minutes_per_session: 30,
      group_size: 4,
    });
    expect(goal.rows[0].values).toMatchObject({
      measure_code: 'orf',
      baseline_value: 60,
      target_value: 100,
      latest_value: 82,
      measurement_count: 1,
    });

    const serialized = JSON.stringify(artifact);
    [
      'PRIVATE LEARNER',
      'PRIVATE_FILE',
      'PRIVATE SAFETY',
      'PRIVATE RAW ANSWER',
      'PRIVATE REFLECTION',
      'PRIVATE IEP',
      'PRIVATE TRANSCRIPT',
      'PRIVATE PROBE PROMPT',
      'PRIVATE PROGRAM LABEL',
      'PRIVATE INTERVENTION NOTE',
      'PRIVATE LOG ID',
      'PRIVATE AUTOMATIC DECISION',
    ].forEach(secret => expect(serialized).not.toContain(secret));
  });

  it('suppresses every class tier count if any nonzero tier group contains fewer than five learners', () => {
    const suppressedStudents = [
      ...Array.from({ length: 5 }, (_, index) => ({
        name: `PRIVATE TIER ONE ${index}`,
        stats: { mockTier: 1 },
      })),
      { name: 'PRIVATE TIER TWO SOLO', stats: { mockTier: 2 } },
    ];
    const suppressed = buildEnvelope({ importedStudents: suppressedStudents }, {
      scope: 'class-summary',
      createdAt: '2026-07-29T12:00:00.000Z',
      tierResolver,
    });
    expect(suppressed.classification.studentIdentifierIncluded).toBe(false);
    expect(suppressed.privacy.identifierIncluded).toBe(false);
    expect(suppressed.tables).toHaveLength(1);
    expect(suppressed.tables[0].id).toBe('group_tier_counts');
    expect(suppressed.tables[0].rows.map(row => row.values.learner_count)).toEqual([
      null,
      null,
      null,
    ]);
    expect(suppressed.tables[0].rows.every(
      row => row.values.count_status === 'suppressed_small_group',
    )).toBe(true);
    expect(suppressed.provenance.groupCountsSuppressed).toBe(true);
    expect(JSON.stringify(suppressed)).not.toContain('PRIVATE TIER');

    const reportableStudents = [
      ...Array.from({ length: 5 }, (_, index) => ({
        name: `PRIVATE REPORTABLE ONE ${index}`,
        stats: { mockTier: 1 },
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        name: `PRIVATE REPORTABLE TWO ${index}`,
        stats: { mockTier: 2 },
      })),
    ];
    const reportable = buildEnvelope({ importedStudents: reportableStudents }, {
      scope: 'class-summary',
      createdAt: '2026-07-29T12:00:00.000Z',
      tierResolver,
    });
    expect(reportable.tables[0].rows.map(row => row.values.learner_count)).toEqual([
      5,
      5,
      0,
    ]);
    expect(reportable.provenance.groupCountsSuppressed).toBe(false);
  });

  it('requires five learners for intervention-group scope and never transfers the program label', () => {
    const makeData = count => {
      const data = {
        importedStudents: [],
        probeHistory: {},
        interventionLogs: {},
        rtiGoals: {},
      };
      for (let index = 0; index < count; index += 1) {
        const name = `PRIVATE GROUP LEARNER ${index}`;
        data.importedStudents.push({ name, stats: { mockTier: index ? 1 : 2 } });
        data.probeHistory[name] = [{
          activity: 'math_dcpm',
          date: '2026-07-10T12:00:00.000Z',
          itemsPerMin: 24 + index,
          grade: '3',
        }];
        data.interventionLogs[name] = [{
          program: 'PRIVATE GROUP PROGRAM OMEGA',
          frequency: 'daily',
          minutes: 20,
          groupSize: count,
          startDate: '2026-06-01',
          notes: 'PRIVATE GROUP NOTE OMEGA',
        }];
      }
      return data;
    };

    expect(() => buildEnvelope(makeData(4), {
      scope: 'intervention-group',
      interventionGroup: 'PRIVATE GROUP PROGRAM OMEGA',
      dateRange: 'all',
      tierResolver,
    })).toThrow(/at least five distinct learners/i);

    const artifact = buildEnvelope(makeData(5), {
      scope: 'intervention-group',
      interventionGroup: 'PRIVATE GROUP PROGRAM OMEGA',
      dateRange: 'all',
      createdAt: '2026-07-29T12:00:00.000Z',
      pseudonymFactory: codeFactory,
      tierResolver,
      benchmarkResolver,
    });
    expect(artifact.tables.map(table => table.id)).toEqual([
      'probe_trends',
      'intervention_summary',
      'goal_progress',
      'group_tier_counts',
    ]);
    expect(new Set(artifact.tables[0].rows.map(
      row => row.values.learner_code,
    )).size).toBe(5);
    expect(artifact.tables[3].rows.every(
      row => row.values.learner_count === null,
    )).toBe(true);
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain('PRIVATE GROUP LEARNER');
    expect(serialized).not.toContain('PRIVATE GROUP PROGRAM OMEGA');
    expect(serialized).not.toContain('PRIVATE GROUP NOTE OMEGA');
  });

  it('excludes future measurements from all-date transfers and goal progress', () => {
    const data = activeFixture();
    data.probeHistory['PRIVATE LEARNER ALPHA'].push(
      {
        activity: 'orf',
        date: '2026-07-29T12:00:00.000Z',
        wcpm: 90,
        grade: '3',
      },
      {
        activity: 'orf',
        date: '2026-07-29T12:00:00.001Z',
        wcpm: 999,
        grade: '3',
      },
    );
    data.interventionLogs['PRIVATE LEARNER ALPHA'].push(
      {
        program: 'PRIVATE BOUNDARY PROGRAM',
        frequency: 'weekly',
        minutes: 15,
        groupSize: 1,
        startDate: '2026-07-29',
      },
      {
        program: 'PRIVATE FUTURE PROGRAM',
        frequency: 'weekly',
        minutes: 15,
        groupSize: 1,
        startDate: '2026-07-30',
      },
    );

    const artifact = buildEnvelope(data, {
      scope: 'active-student',
      activeLearner: 'PRIVATE LEARNER ALPHA',
      dateRange: 'all',
      createdAt: '2026-07-29T12:00:00.000Z',
      pseudonymFactory: codeFactory,
      tierResolver,
      benchmarkResolver,
    });

    const probe = artifact.tables.find(table => table.id === 'probe_trends');
    const intervention = artifact.tables.find(table => table.id === 'intervention_summary');
    const goal = artifact.tables.find(table => table.id === 'goal_progress');
    expect(probe.rows.map(row => row.values.score_value)).toEqual([82, 90]);
    expect(intervention.rows.map(row => row.values.start_date))
      .toEqual(['2026-06-15', '2026-07-29']);
    expect(goal.rows[0].values).toMatchObject({
      latest_value: 90,
      latest_measurement_date: '2026-07-29',
      measurement_count: 2,
    });
    expect(artifact.provenance.sourceCounts).toMatchObject({
      probeTrends: 2,
      interventionSummary: 2,
      goalProgress: 1,
    });
  });

  it('retains the newest 200 chronological probe rows and reports truncation', () => {
    const start = Date.parse('2025-01-01T12:00:00.000Z');
    const probes = Array.from({ length: 205 }, (_, index) => ({
      activity: 'orf',
      timestamp: start + index * 24 * 60 * 60 * 1000,
      wcpm: index,
      grade: '3',
    }));
    const artifact = buildEnvelope({
      probeHistory: { 'PRIVATE BULK LEARNER': probes },
    }, {
      scope: 'active-student',
      activeLearner: 'PRIVATE BULK LEARNER',
      dateRange: 'all',
      datasets: {
        probeTrends: true,
        interventionSummary: false,
        goalProgress: false,
        groupTierCounts: false,
      },
      createdAt: '2026-07-29T12:00:00.000Z',
      pseudonymFactory: codeFactory,
      benchmarkResolver,
    });
    const table = artifact.tables[0];
    expect(table).toMatchObject({
      id: 'probe_trends',
      rowCount: 200,
      sourceRowCount: 205,
      truncated: true,
    });
    expect(table.rows[0].values.score_value).toBe(5);
    expect(table.rows[199].values.score_value).toBe(204);
    expect(table.rows[0].values.measurement_date)
      .toBe(new Date(start + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    expect(JSON.stringify(artifact)).not.toContain('PRIVATE BULK LEARNER');
  });

  it('exposes an accessible, receipt-aware source review contract', () => {
    expect(typeof buildEnvelope).toBe('function');
    expect(window.AlloModules.StudentAnalytics._meta.allosheetMinimumGroupSize).toBe(5);
    expect(source).toContain('onOpenAlloSheet');
    expect(source).toContain('aria-labelledby\': \'sa-allosheet-review-title');
    expect(source).toContain("'aria-modal': 'true'");
    expect(source).toContain("return isolateStudentAnalyticsDialog(alloSheetDialogRef.current)");
    expect(source).toContain('Opening AlloSheet and waiting for secure receipt...');
    expect(source).toContain("disabled: alloSheetBusy || !!alloSheetPreview.error || !hasRows");
    expect(source).toContain('Learner names, nicknames, UIDs, filenames');
    expect(source).toContain('learner-level tiers, reasons, recommendations, alerts, and automatic decisions');
    expect(source).toContain('Open in AlloSheet');
  });
});
