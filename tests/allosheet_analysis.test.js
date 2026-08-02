import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
let Analysis;

function record(id, fields) {
  return { id, fields: { ...fields } };
}

beforeAll(() => {
  const source = fs.readFileSync(
    path.join(root, 'allo_sheet', 'allo_sheet_analysis.js'),
    'utf8',
  );
  new Function(source)();
  Analysis = window.AlloSheetAnalysis;
});

describe('AlloSheet deterministic local analysis', () => {
  it('infers strict numeric and ISO date types without treating identifiers as measures', () => {
    const records = [
      record('1', { Student_ID: '00123', Date: '2026-07-01', Score: '0', Note: '10 points' }),
      record('2', { Student_ID: '00456', Date: '2026-07-02', Score: '12.5', Note: '11 points' }),
    ];
    expect(
      Analysis.inferColumnTypes(records, ['Student_ID', 'Date', 'Score', 'Note'], []),
    ).toEqual({
      Student_ID: 'text',
      Date: 'date',
      Score: 'number',
      Note: 'text',
    });
  });

  it('filters case-insensitively and keeps blank values distinct from numeric zero', () => {
    const records = [
      record('1', { Phase: 'Baseline', Score: 0 }),
      record('2', { Phase: 'baseline', Score: '' }),
      record('3', { Phase: 'Follow-up', Score: null }),
    ];
    const types = { Phase: 'category', Score: 'number' };
    expect(
      Analysis.filterRecords(records, {
        filterColumn: 'Phase',
        filterOperator: 'contains',
        filterValue: 'BASE',
      }, types).map(row => row.id),
    ).toEqual(['1', '2']);
    expect(
      Analysis.filterRecords(records, {
        filterColumn: 'Score',
        filterOperator: 'is-blank',
        filterValue: '',
      }, types).map(row => row.id),
    ).toEqual(['2', '3']);
    expect(
      Analysis.filterRecords(records, {
        filterColumn: 'Score',
        filterOperator: 'gte',
        filterValue: '0',
      }, types).map(row => row.id),
    ).toEqual(['1']);
  });

  it('does not merge a literal Missing/blank value with an actual blank group', () => {
    const model = Analysis.buildAnalysis(
      [
        record('1', { Group: '', Score: '2' }),
        record('2', { Group: 'Missing/blank', Score: '8' }),
      ],
      ['Group', 'Score'],
      [],
      {
        groupColumn: 'Group',
        measureColumn: 'Score',
        calculation: 'sum',
        representation: 'bar',
      },
    );

    expect(model.groups).toEqual([
      { label: 'Missing/blank (literal value)', rowCount: 1, numericCount: 1, metric: 8 },
      { label: 'Missing/blank', rowCount: 1, numericCount: 1, metric: 2 },
    ]);
  });

  it.each([
    ['count', '__count__', [2, 1]],
    ['average', 'Score', [10, 5]],
    ['sum', 'Score', [20, 5]],
    ['min', 'Score', [8, 5]],
    ['max', 'Score', [12, 5]],
  ])('calculates %s transparently', (calculation, measureColumn, expected) => {
    const records = [
      record('1', { Group: 'A', Score: 8 }),
      record('2', { Group: 'A', Score: 12 }),
      record('3', { Group: 'B', Score: 5 }),
    ];
    const model = Analysis.buildAnalysis(
      records,
      ['Group', 'Score'],
      [{ label: 'Group', type: 'category' }, { label: 'Score', type: 'number' }],
      {
        groupColumn: 'Group',
        measureColumn,
        calculation,
        representation: 'bar',
      },
    );
    expect(model.groups.map(group => group.metric)).toEqual(expected);
  });

  it('excludes blank and non-numeric measures instead of converting them to zero', () => {
    const model = Analysis.buildAnalysis(
      [
        record('1', { Group: 'A', Score: '10' }),
        record('2', { Group: 'A', Score: '' }),
        record('3', { Group: 'A', Score: 'not measured' }),
      ],
      ['Group', 'Score'],
      [{ label: 'Group', type: 'category' }, { label: 'Score', type: 'number' }],
      {
        groupColumn: 'Group',
        measureColumn: 'Score',
        calculation: 'average',
      },
    );
    expect(model.groups[0]).toMatchObject({
      rowCount: 3,
      numericCount: 1,
      metric: 10,
    });
    expect(model.excludedMeasureCount).toBe(2);
    expect(model.narrative).toContain('excluded, not treated as zero');
  });

  it('keeps blank and invalid dates in the table but out of trend claims', () => {
    const model = Analysis.buildAnalysis(
      [
        record('1', { When: '2026-07-01', Score: 4 }),
        record('2', { When: '', Score: 100 }),
        record('3', { When: 'not-a-date', Score: 200 }),
      ],
      ['When', 'Score'],
      [{ label: 'When', type: 'date' }, { label: 'Score', type: 'number' }],
      {
        groupColumn: 'When',
        measureColumn: 'Score',
        calculation: 'average',
        representation: 'trend',
      },
    );

    expect(model.groups).toHaveLength(3);
    expect(model.trendGroups).toEqual([
      { label: '2026-07-01', rowCount: 1, numericCount: 1, metric: 4 },
    ]);
    expect(model.omittedTrendGroupCount).toBe(2);
    expect(model.narrative).toContain('2 missing or invalid date groups');
    expect(model.narrative).not.toContain('last dated group (Missing/blank)');
    expect(model.narrative).not.toContain('last dated group (not-a-date');
  });

  it('reports arithmetic overflow instead of returning a non-finite metric', () => {
    const model = Analysis.buildAnalysis(
      [
        record('1', { Group: 'A', Score: 1e308 }),
        record('2', { Group: 'A', Score: 1e308 }),
      ],
      ['Group', 'Score'],
      [{ label: 'Group', type: 'category' }, { label: 'Score', type: 'number' }],
      {
        groupColumn: 'Group',
        measureColumn: 'Score',
        calculation: 'sum',
        representation: 'bar',
      },
    );

    expect(model.groups[0].metric).toBeNull();
    expect(model.overflowGroupCount).toBe(1);
    expect(model.narrative).toContain('arithmetic exceeded the finite numeric range');
  });

  it('buckets ISO date-times by day and orders trends chronologically', () => {
    const model = Analysis.buildAnalysis(
      [
        record('1', { When: '2026-07-03T14:00:00.000Z', Score: 9 }),
        record('2', { When: '2026-07-01T10:00:00.000Z', Score: 4 }),
        record('3', { When: '2026-07-03T16:00:00.000Z', Score: 11 }),
      ],
      ['When', 'Score'],
      [{ label: 'When', type: 'datetime' }, { label: 'Score', type: 'number' }],
      {
        groupColumn: 'When',
        measureColumn: 'Score',
        calculation: 'average',
        representation: 'trend',
      },
    );
    expect(model.groups).toEqual([
      { label: '2026-07-01', rowCount: 1, numericCount: 1, metric: 4 },
      { label: '2026-07-03', rowCount: 2, numericCount: 2, metric: 10 },
    ]);
    expect(model.narrative).toContain('higher than');
    expect(model.narrative).toContain('does not establish cause');
  });

  it('rejects impossible ISO date-times while retaining valid leap-day timestamps', () => {
    const records = [
      record('1', {
        Valid: '2024-02-29T23:59:59.999Z',
        Invalid: '2026-02-30T00:00:00Z',
      }),
      record('2', {
        Valid: '2024-02-29T18:59:59.999-05:00',
        Invalid: '2025-02-29T12:00:00-05:00',
      }),
    ];
    expect(Analysis.inferColumnTypes(records, ['Valid', 'Invalid'], []))
      .toEqual({ Valid: 'datetime', Invalid: 'text' });

    const model = Analysis.buildAnalysis(
      [
        record('1', { When: '2024-02-29T23:59:59.999Z', Score: 4 }),
        record('2', { When: '2026-02-30T00:00:00Z', Score: 8 }),
        record('3', { When: '2025-02-29T12:00:00-05:00', Score: 12 }),
      ],
      ['When', 'Score'],
      [{ label: 'When', type: 'datetime' }, { label: 'Score', type: 'number' }],
      {
        groupColumn: 'When',
        measureColumn: 'Score',
        calculation: 'average',
        representation: 'trend',
      },
    );
    expect(model.trendGroups).toEqual([
      { label: '2024-02-29', rowCount: 1, numericCount: 1, metric: 4 },
    ]);
    expect(model.omittedTrendGroupCount).toBe(2);
  });

  it('positions uneven trend dates by elapsed time instead of category index', () => {
    const fractions = Analysis.trendPositionFractions([
      { label: '2026-01-01' },
      { label: '2026-01-02' },
      { label: '2026-01-30' },
    ]);

    expect(fractions[0]).toBe(0);
    expect(fractions[1]).toBeCloseTo(1 / 29);
    expect(fractions[2]).toBe(1);
  });

  it('omits a visual beyond 50 groups while retaining the complete result table model', () => {
    const records = Array.from({ length: 51 }, (_, index) =>
      record(String(index), { Group: `Group ${index + 1}` }),
    );
    const model = Analysis.buildAnalysis(records, ['Group'], [], {
      groupColumn: 'Group',
      calculation: 'count',
      representation: 'bar',
    });
    expect(model.groups).toHaveLength(51);
    expect(model.visualAllowed).toBe(false);
    expect(model.narrative).toContain('complete result remains in the table');
  });

  it('does not mutate records, columns, or the analysis specification', () => {
    const records = [record('1', { Group: 'A', Score: 3 })];
    const columns = ['Group', 'Score'];
    const spec = {
      groupColumn: 'Group',
      measureColumn: 'Score',
      calculation: 'sum',
      representation: 'bar',
    };
    const before = JSON.stringify({ records, columns, spec });
    Analysis.buildAnalysis(records, columns, [], spec);
    expect(JSON.stringify({ records, columns, spec })).toBe(before);
  });

  it('builds a privacy-safe column profile with completeness, distinct counts, and typed ranges', () => {
    const records = [
      record('1', { Student_ID: 'S-1', Score: '2', When: '2026-07-01', Note: '' }),
      record('2', { Student_ID: 'S-2', Score: '8', When: '2026-07-03', Note: 'needs review' }),
      record('3', { Student_ID: 'S-1', Score: '', When: '', Note: 'needs review' }),
    ];
    const profile = Analysis.buildColumnProfile(records, ['Student_ID', 'Score', 'When', 'Note'], []);
    expect(profile.sourceRowCount).toBe(3);
    expect(profile.narrative).toContain('Values stay in this window');
    expect(profile.columns).toEqual([
      expect.objectContaining({ column: 'Student_ID', type: 'text', identifierLike: true, filledCount: 3, blankCount: 0, distinctCount: 2, range: null }),
      expect.objectContaining({ column: 'Score', type: 'number', filledCount: 2, blankCount: 1, distinctCount: 2, range: { minimum: 2, maximum: 8, validCount: 2 } }),
      expect.objectContaining({ column: 'When', type: 'date', filledCount: 2, blankCount: 1, distinctCount: 2, range: { minimum: '2026-07-01', maximum: '2026-07-03', validCount: 2 } }),
      expect.objectContaining({ column: 'Note', type: 'text', filledCount: 2, blankCount: 1, distinctCount: 1, range: null }),
    ]);
    expect(JSON.stringify(records)).not.toContain('profiled');
  });
  it('rejects unsupported trend and numeric-filter combinations', () => {
    expect(() => Analysis.buildAnalysis(
      [record('1', { Group: 'A', Score: 2 })],
      ['Group', 'Score'],
      [{ label: 'Group', type: 'category' }, { label: 'Score', type: 'number' }],
      {
        groupColumn: 'Group',
        measureColumn: 'Score',
        calculation: 'average',
        representation: 'trend',
      },
    )).toThrow(/trend requires/i);

    expect(() => Analysis.buildAnalysis(
      [record('1', { Group: 'A', Score: 2 })],
      ['Group', 'Score'],
      [{ label: 'Group', type: 'category' }, { label: 'Score', type: 'number' }],
      {
        filterColumn: 'Group',
        filterOperator: 'gte',
        filterValue: '1',
        groupColumn: 'Group',
        calculation: 'count',
      },
    )).toThrow(/numeric column/i);
  });
});
