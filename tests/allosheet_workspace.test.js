import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'allo_sheet', 'allo_sheet_workspace.js'),
  'utf8',
);

function loadWorkspaceCodec() {
  const fakeWindow = { AlloModules: {} };
  const commonJs = { exports: {} };
  new Function('window', 'module', 'exports', source)(
    fakeWindow,
    commonJs,
    commonJs.exports,
  );
  expect(fakeWindow.AlloSheetWorkspace).toBe(commonJs.exports);
  expect(fakeWindow.AlloModules.AlloSheetWorkspace).toBe(commonJs.exports);
  return commonJs.exports;
}

function workspaceDocument() {
  return {
    kind: 'alloflow.allosheet.workspace.v1',
    version: 1,
    workspace: {
      title: 'BehaviorLens active-student review',
      createdAt: '2026-07-29T12:00:00.000Z',
      savedAt: '2026-07-29T14:00:00.000Z',
      activeTableId: 'behavior_events',
      modifiedTableIds: ['behavior_events'],
    },
    origin: {
      kind: 'transfer',
      source: {
        tool: 'behaviorlens',
        label: 'BehaviorLens',
        version: '1.0.0',
      },
      createdAt: '2026-07-29T12:00:00.000Z',
      classification: {
        level: 'sensitive-education-record',
        identifierIncluded: true,
        notesIncluded: true,
        declarationKnown: true,
      },
      privacy: {
        scope: 'active-student',
        reducedData: true,
        transferEnablesAI: false,
      },
      provenance: {
        generatedBy: 'behaviorlens',
        generatedAt: '2026-07-29T12:00:00.000Z',
        filters: {
          dateRange: '90d',
          cohorts: ['Grade 6', 'Intervention'],
        },
      },
    },
    capabilities: {
      writeBack: false,
      aiEnabled: false,
    },
    tables: [
      {
        id: 'weekly_summary',
        title: 'Weekly summary',
        columns: [
          { key: 'student_id', label: 'Student ID', type: 'text' },
          { key: 'minutes', label: 'Minutes', type: 'number' },
          { key: 'reviewed', label: 'Reviewed', type: 'boolean' },
        ],
        rows: [
          {
            id: 'summary-1',
            values: {
              student_id: 'S-104',
              minutes: 22,
              reviewed: true,
            },
          },
        ],
        sourceRowCount: 1,
        truncated: false,
      },
      {
        id: 'behavior_events',
        title: 'Behavior events',
        columns: [
          { key: 'category', label: 'Category', type: 'category' },
          { key: 'note', label: 'Note', type: 'text' },
          { key: 'observed_at', label: 'Observed at', type: 'datetime' },
        ],
        rows: [
          {
            id: 'event-1',
            values: {
              category: 'On task',
              note: '=HYPERLINK("https://example.invalid","literal")',
              observed_at: '2026-07-29T11:15:00.000Z',
            },
          },
          {
            id: 'event-2',
            values: {
              category: 'Break',
              note: '<img src=x onerror="window.__workspacePwned=true">\n<script>bad()</script>',
              observed_at: null,
            },
          },
        ],
        sourceRowCount: 4,
        truncated: true,
      },
    ],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('AlloSheet versioned workspace codec', () => {
  it('exports the same pure API to browsers and CommonJS with exact public limits', () => {
    const codec = loadWorkspaceCodec();
    expect(codec).toMatchObject({
      kind: 'alloflow.allosheet.workspace.v1',
      version: 1,
      mimeType: 'application/vnd.alloflow.allosheet+json',
      fileExtension: '.allosheet.json',
    });
    expect(codec.limits).toMatchObject({
      maxWorkspaceBytes: 8 * 1024 * 1024,
      maxTables: 5,
      maxColumns: 40,
      maxRows: 200,
      maxCellChars: 1200,
    });
    expect(codec.byteLength('A')).toBe(1);
    expect(codec.byteLength('é')).toBe(2);
    expect(codec.byteLength('😀')).toBe(4);
  });

  it('round-trips provenance, table types, truncation, formulas, and HTML-looking literal text', () => {
    const codec = loadWorkspaceCodec();
    const input = workspaceDocument();
    const encoded = codec.encode(input);
    const decoded = codec.decode(encoded);

    expect(decoded).toEqual(input);
    expect(decoded).not.toBe(input);
    expect(Object.getPrototypeOf(decoded.origin.provenance)).toBeNull();
    expect(Object.getPrototypeOf(decoded.origin.provenance.filters)).toBeNull();
    expect(Object.getPrototypeOf(decoded.tables[1].rows[0].values)).toBeNull();
    expect(decoded.tables[1].rows[0].values.note)
      .toBe('=HYPERLINK("https://example.invalid","literal")');
    expect(decoded.tables[1].rows[1].values.note)
      .toBe('<img src=x onerror="window.__workspacePwned=true">\n<script>bad()</script>');
    expect(encoded).toContain('<script>bad()</script>');
    expect(encoded).toContain('=HYPERLINK');
    expect(decoded.workspace.modifiedTableIds).toEqual(['behavior_events']);
    expect(decoded.origin.provenance).toEqual(input.origin.provenance);
    expect(decoded.capabilities).toEqual({ writeBack: false, aiEnabled: false });
  });

  it('converts current local table objects without losing keys, labels, types, or scalar values', () => {
    const codec = loadWorkspaceCodec();
    const sourceDocument = workspaceDocument();
    const local = codec.toLocalTables(sourceDocument);

    expect(local.activeTableId).toBe('behavior_events');
    expect(local.modifiedTableIds).toEqual(['behavior_events']);
    expect(local.localTables[0]).toMatchObject({
      id: 'weekly_summary',
      columns: ['Student ID', 'Minutes', 'Reviewed'],
      columnDetails: [
        { key: 'student_id', label: 'Student ID', type: 'text' },
        { key: 'minutes', label: 'Minutes', type: 'number' },
        { key: 'reviewed', label: 'Reviewed', type: 'boolean' },
      ],
      dirty: false,
      sourceModified: false,
    });
    expect(local.localTables[1]).toMatchObject({
      sourceRowCount: 4,
      truncated: true,
      dirty: false,
      sourceModified: true,
    });
    expect(local.localTables[0].records[0]).toEqual({
      id: 'summary-1',
      fields: {
        'Student ID': 'S-104',
        Minutes: 22,
        Reviewed: true,
      },
    });

    const rebuilt = codec.fromLocalTables({
      workspace: local.workspace,
      origin: local.origin,
      capabilities: local.capabilities,
      tables: local.localTables,
    });
    expect(rebuilt).toEqual(sourceDocument);
    expect(codec.decode(codec.encodeLocalTables({
      workspace: local.workspace,
      origin: local.origin,
      tables: local.localTables,
    }))).toEqual(sourceDocument);
  });

  it('derives safe descriptors for blank and CSV-style local tables that do not have columnDetails', () => {
    const codec = loadWorkspaceCodec();
    const base = workspaceDocument();
    const localDocument = codec.fromLocalTables({
      workspace: {
        ...base.workspace,
        title: 'Imported local table',
        activeTableId: 'imported_csv',
        modifiedTableIds: [],
      },
      origin: {
        ...base.origin,
        kind: 'csv',
        source: { tool: 'csv_import', label: 'CSV import', version: '1' },
        classification: {
          level: 'educator-provided-local-data',
          identifierIncluded: false,
          notesIncluded: false,
          declarationKnown: false,
        },
      },
      tables: [{
        id: 'imported_csv',
        title: 'Imported CSV',
        columns: ['Student', 'Score', 'Complete'],
        records: [{
          id: 1,
          fields: { Student: 'A', Score: 4, Complete: false },
        }],
        sourceRowCount: 1,
        truncated: false,
        dirty: true,
        savePoint: null,
      }],
    });

    expect(localDocument.tables[0].columns).toEqual([
      { key: 'Student', label: 'Student', type: 'text' },
      { key: 'Score', label: 'Score', type: 'number' },
      { key: 'Complete', label: 'Complete', type: 'boolean' },
    ]);
    expect(localDocument.tables[0].rows[0]).toEqual({
      id: 1,
      values: { Student: 'A', Score: 4, Complete: false },
    });
  });

  it('returns a coded validation error for malformed local records before type inference', () => {
    const codec = loadWorkspaceCodec();
    const base = workspaceDocument();
    expect(() => codec.fromLocalTables({
      workspace: {
        ...base.workspace,
        activeTableId: 'blank_sheet',
        modifiedTableIds: [],
      },
      origin: base.origin,
      tables: [{
        id: 'blank_sheet',
        title: 'Blank sheet',
        columns: ['Measure'],
        records: [{ id: 1 }],
      }],
    })).toThrowError(expect.objectContaining({
      code: 'allosheet-workspace-invalid',
      message: expect.stringContaining('id and fields'),
    }));
  });

  it.each([
    ['future version', (doc) => { doc.version = 2; }],
    ['wrong kind', (doc) => { doc.kind = 'alloflow.tabular.v1'; }],
    ['unknown root field', (doc) => { doc.bridgeToken = 'do-not-persist'; }],
    ['AI capability', (doc) => { doc.capabilities.aiEnabled = true; }],
    ['write-back capability', (doc) => { doc.capabilities.writeBack = true; }],
    ['extra capability', (doc) => { doc.capabilities.network = false; }],
    ['unknown active table', (doc) => { doc.workspace.activeTableId = 'missing'; }],
    ['unknown modified table', (doc) => { doc.workspace.modifiedTableIds = ['missing']; }],
    ['duplicate modified table', (doc) => {
      doc.workspace.modifiedTableIds = ['behavior_events', 'behavior_events'];
    }],
    ['duplicate table ID', (doc) => { doc.tables[1].id = 'weekly_summary'; }],
    ['duplicate column key', (doc) => {
      doc.tables[0].columns[1].key = 'student_id';
      doc.tables[0].rows[0].values.student_id = 22;
      delete doc.tables[0].rows[0].values.minutes;
    }],
    ['duplicate column label', (doc) => {
      doc.tables[0].columns[1].label = 'Student ID';
    }],
    ['unsupported column type', (doc) => { doc.tables[0].columns[0].type = 'formula'; }],
    ['duplicate row ID', (doc) => {
      doc.tables[1].rows[1].id = 'event-1';
    }],
    ['unexpected row field', (doc) => {
      doc.tables[0].rows[0].values.secret = 'not declared';
    }],
    ['missing row field', (doc) => {
      delete doc.tables[0].rows[0].values.minutes;
    }],
    ['infinite number', (doc) => {
      doc.tables[0].rows[0].values.minutes = Number.POSITIVE_INFINITY;
    }],
    ['inconsistent truncation', (doc) => {
      doc.tables[1].truncated = false;
    }],
    ['unsafe timestamp', (doc) => {
      doc.workspace.savedAt = 'next Thursday';
    }],
    ['impossible calendar timestamp', (doc) => {
      doc.workspace.savedAt = '2026-02-31T12:00:00Z';
    }],
    ['out-of-range timestamp hour', (doc) => {
      doc.workspace.savedAt = '2026-02-28T24:00:00Z';
    }],
    ['unsupported cell control text', (doc) => {
      doc.tables[1].rows[0].values.note = 'unsafe\u0000cell';
    }],
  ])('rejects %s without coercing the input', (_name, mutate) => {
    const codec = loadWorkspaceCodec();
    const candidate = workspaceDocument();
    mutate(candidate);
    expect(() => codec.normalize(candidate)).toThrowError(
      expect.objectContaining({ code: 'allosheet-workspace-invalid' }),
    );
  });

  it('rejects every structural limit instead of slicing or clipping content', () => {
    const codec = loadWorkspaceCodec();

    const longCell = workspaceDocument();
    longCell.tables[1].rows[0].values.note = 'x'.repeat(1201);
    expect(() => codec.normalize(longCell)).toThrow(/1,200|1200/);
    expect(longCell.tables[1].rows[0].values.note).toHaveLength(1201);

    const sixTables = workspaceDocument();
    sixTables.tables = Array.from({ length: 6 }, (_, index) => ({
      ...clone(sixTables.tables[0]),
      id: `table_${index + 1}`,
      title: `Table ${index + 1}`,
      rows: [{
        id: `row-${index + 1}`,
        values: { student_id: '', minutes: 0, reviewed: false },
      }],
    }));
    sixTables.workspace.activeTableId = 'table_1';
    sixTables.workspace.modifiedTableIds = [];
    expect(() => codec.normalize(sixTables)).toThrow(/at most 5 tables/);

    const fortyOneColumns = workspaceDocument();
    fortyOneColumns.tables[0].columns = Array.from({ length: 41 }, (_, index) => ({
      key: `field_${index + 1}`,
      label: `Field ${index + 1}`,
      type: 'text',
    }));
    fortyOneColumns.tables[0].rows = [];
    fortyOneColumns.tables[0].sourceRowCount = 0;
    expect(() => codec.normalize(fortyOneColumns)).toThrow(/more than 40 columns/);

    const twoHundredOneRows = workspaceDocument();
    twoHundredOneRows.tables[0].rows = Array.from({ length: 201 }, (_, index) => ({
      id: `row-${index + 1}`,
      values: { student_id: '', minutes: 0, reviewed: false },
    }));
    twoHundredOneRows.tables[0].sourceRowCount = 201;
    expect(() => codec.normalize(twoHundredOneRows)).toThrow(/more than 200 rows/);
  });

  it('enforces the 8 MiB limit in UTF-8 before parsing and after canonical encoding', () => {
    const codec = loadWorkspaceCodec();
    const oversizedRaw = '😀'.repeat(Math.floor(codec.limits.maxWorkspaceBytes / 4) + 1);
    expect(oversizedRaw.length).toBeLessThan(codec.limits.maxWorkspaceBytes);
    expect(codec.byteLength(oversizedRaw)).toBeGreaterThan(codec.limits.maxWorkspaceBytes);
    expect(() => codec.decode(oversizedRaw)).toThrow(/8 MiB UTF-8/);

    const largeDocument = workspaceDocument();
    const value = 'x'.repeat(220);
    largeDocument.tables = Array.from({ length: 5 }, (_, tableIndex) => {
      const columns = Array.from({ length: 40 }, (_, columnIndex) => ({
        key: `field_${columnIndex + 1}`,
        label: `Field ${columnIndex + 1}`,
        type: 'text',
      }));
      return {
        id: `table_${tableIndex + 1}`,
        title: `Table ${tableIndex + 1}`,
        columns,
        rows: Array.from({ length: 200 }, (_, rowIndex) => ({
          id: `table-${tableIndex + 1}-row-${rowIndex + 1}`,
          values: Object.fromEntries(columns.map((column) => [column.key, value])),
        })),
        sourceRowCount: 200,
        truncated: false,
      };
    });
    largeDocument.workspace.activeTableId = 'table_1';
    largeDocument.workspace.modifiedTableIds = [];
    expect(() => codec.encode(largeDocument, { pretty: false })).toThrow(/8 MiB UTF-8/);
  });

  it('rejects prototype-pollution keys at every dynamic boundary and never mutates Object.prototype', () => {
    const codec = loadWorkspaceCodec();
    expect({}.polluted).toBeUndefined();

    const provenanceAttack = workspaceDocument();
    provenanceAttack.origin.provenance = JSON.parse(
      '{"__proto__":{"polluted":true}}',
    );
    expect(() => codec.normalize(provenanceAttack)).toThrow(/blocked property name/);

    const nestedAttack = workspaceDocument();
    nestedAttack.origin.provenance.filters = JSON.parse(
      '{"constructor":"polluted"}',
    );
    expect(() => codec.normalize(nestedAttack)).toThrow(/blocked property name/);

    const fieldAttack = workspaceDocument();
    fieldAttack.tables[0].columns[0].key = '__proto__';
    expect(() => codec.normalize(fieldAttack)).toThrow(/blocked identifier/);

    const rowAttack = workspaceDocument();
    rowAttack.tables[0].rows[0].id = 'prototype';
    expect(() => codec.normalize(rowAttack)).toThrow(/blocked identifier/);

    expect({}.polluted).toBeUndefined();
  });

  it('strictly rejects oversized, deeply nested, or executable provenance instead of dropping it', () => {
    const codec = loadWorkspaceCodec();

    const tooMany = workspaceDocument();
    tooMany.origin.provenance = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => [`key_${index + 1}`, index]),
    );
    expect(() => codec.normalize(tooMany)).toThrow(/more than 24 properties/);

    const tooDeep = workspaceDocument();
    tooDeep.origin.provenance = { first: { second: { value: 'too deep' } } };
    expect(() => codec.normalize(tooDeep)).toThrow(/metadata depth/);

    const functionValue = workspaceDocument();
    functionValue.origin.provenance.generatedBy = () => 'hidden';
    expect(() => codec.normalize(functionValue)).toThrow(/unsupported metadata value/);

    const longMetadata = workspaceDocument();
    longMetadata.origin.provenance.generatedBy = 'x'.repeat(501);
    expect(() => codec.normalize(longMetadata)).toThrow(/exceeds 500 characters/);
  });
});
