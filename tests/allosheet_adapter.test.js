import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const Sheet = require(resolve(process.cwd(), 'allo_sheet', 'allo_sheet_adapter.js'));

const records = [
  { id: 1, fields: { Name: ' Ada ', Status: 'Present', Score: 8 } },
  { id: 2, fields: { Name: 'Bea', Status: 'present', Score: null } },
  { id: 3, fields: { Name: 'Cal', Status: '', Score: 7 } },
];
const columns = ['Name', 'Status', 'Score'];

describe('AlloSheet engine-neutral adapter', () => {
  it('defaults AI context to workbook structure without cell values', () => {
    const snapshot = Sheet.sanitizeSnapshot({
      records,
      columns,
      rowCount: records.length,
      scope: 'structure-only',
    });

    expect(snapshot.scope).toBe('structure-only');
    expect(snapshot.rowCount).toBe(3);
    expect(snapshot.columns.map((column) => column.id)).toEqual(columns);
    expect(snapshot.columns.find((column) => column.id === 'Score').blankCountInLoadedRows).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(snapshot, 'records')).toBe(false);
  });

  it('includes only explicitly selected rows in selected-value context', () => {
    const snapshot = Sheet.sanitizeSnapshot({
      records,
      columns,
      scope: 'selected-values',
      selectedIds: [2],
    });

    expect(snapshot.records).toHaveLength(1);
    expect(snapshot.records[0].id).toBe(2);
    expect(snapshot.records[0].fields.Name).toBe('Bea');
    expect(JSON.stringify(snapshot)).not.toContain('Ada');
    expect(JSON.stringify(snapshot)).not.toContain('Cal');
  });

  it('fails closed on unselected records, unknown fields, no-ops, and structure-only changes', () => {
    const response = {
      summary: 'Normalize statuses.',
      changes: [
        { recordId: 1, field: 'Status', newValue: 'present' },
        { recordId: 2, field: 'Unknown', newValue: 'x' },
        { recordId: 2, field: 'Status', newValue: 'present' },
        { recordId: 3, field: 'Status', newValue: 'absent' },
      ],
    };

    const selectedPlan = Sheet.parseAgentPlan(response, {
      records,
      columns,
      scope: 'selected-values',
      selectedIds: [2, 3],
    });
    expect(selectedPlan.changes).toEqual([
      {
        recordId: 3,
        field: 'Status',
        oldValue: '',
        newValue: 'absent',
        reason: '',
      },
    ]);

    const structurePlan = Sheet.parseAgentPlan(response, {
      records,
      columns,
      scope: 'structure-only',
    });
    expect(structurePlan.changes).toEqual([]);
  });

  it('builds bounded record patches and a one-step inverse patch', () => {
    const changes = [
      { recordId: 1, field: 'Name', oldValue: ' Ada ', newValue: 'Ada' },
      { recordId: 1, field: 'Status', oldValue: 'Present', newValue: 'present' },
      { recordId: 3, field: 'Status', oldValue: '', newValue: 'Absent' },
    ];

    const patch = Sheet.buildPatch(changes);
    expect(patch.records).toHaveLength(2);
    expect(patch.records.find((record) => record.id === 1).fields.Name).toBe('Ada');
    expect(patch.records.find((record) => record.id === 1).fields.Status).toBe('present');

    const undo = Sheet.buildUndoPatch(changes);
    expect(undo.records.find((record) => record.id === 1).fields.Name).toBe(' Ada ');
    expect(undo.records.find((record) => record.id === 3).fields.Status).toBe('');
  });

  it('runs deterministic audits locally', () => {
    const audit = Sheet.runLocalAudit(records, columns);
    expect(audit.blankCounts).toMatchObject({ Name: 0, Status: 1, Score: 1 });
    expect(audit.duplicateCounts.Status).toBe(2);
    expect(audit.changes).toEqual([
      {
        recordId: 1,
        field: 'Name',
        oldValue: ' Ada ',
        newValue: 'Ada',
        reason: 'Remove leading or trailing whitespace.',
      },
    ]);
  });
});
