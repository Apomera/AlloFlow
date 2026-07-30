import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'allo_sheet', 'transfer_adapter.js'),
  'utf8',
);

function loadAdapter() {
  const fakeWindow = { AlloModules: {} };
  new Function('window', source)(fakeWindow);
  return fakeWindow.AlloSheetTransferAdapter;
}

function oneColumnTable(adapter, id = 'table_1', value = 'value') {
  return adapter.table({
    id,
    title: id,
    columns: [{ key: 'measure', label: 'Measure', type: 'text' }],
    rows: [{ id: `${id}-row-1`, values: { measure: value } }],
  });
}

function reviewedEnvelope(adapter, tables, overrides = {}) {
  return adapter.envelope({
    source: {
      tool: 'test_tool',
      label: 'Test tool',
      version: '1.0.0',
    },
    title: 'Reviewed test tables',
    createdAt: '2026-07-29T12:00:00.000Z',
    classification: {
      level: 'education-data',
      studentIdentifierIncluded: false,
      freeTextNotesIncluded: false,
    },
    privacy: {
      scope: 'educator-selected',
      reducedData: true,
    },
    tables,
    ...overrides,
  });
}

describe('AlloSheet shared transfer adapter', () => {
  it('measures the 2 MiB envelope limit in UTF-8 bytes, not JavaScript characters', () => {
    const adapter = loadAdapter();
    expect(adapter.limits.maxEnvelopeBytes).toBe(2 * 1024 * 1024);
    expect(adapter.byteLength('A')).toBe(1);
    expect(adapter.byteLength('é')).toBe(2);
    expect(adapter.byteLength('😀')).toBe(4);

    const columns = Array.from({ length: 5 }, (_, index) => ({
      key: `field_${index + 1}`,
      label: `Field ${index + 1}`,
      type: 'text',
    }));
    const asciiValue = 'a'.repeat(1200);
    const multibyteValue = '😀'.repeat(600);
    const makeRows = (value) => Array.from({ length: 200 }, (_, rowIndex) => ({
      id: `row-${rowIndex + 1}`,
      values: Object.fromEntries(columns.map((column) => [column.key, value])),
    }));

    const asciiTable = adapter.table({
      id: 'ascii_table',
      columns,
      rows: makeRows(asciiValue),
    });
    const asciiEnvelope = reviewedEnvelope(adapter, [asciiTable]);
    expect(adapter.byteLength(asciiEnvelope)).toBeLessThan(adapter.limits.maxEnvelopeBytes);

    const multibyteTable = adapter.table({
      id: 'multibyte_table',
      columns,
      rows: makeRows(multibyteValue),
    });
    expect(() => reviewedEnvelope(adapter, [multibyteTable])).toThrow(/2 MB/i);
  });

  it('rejects duplicate table IDs, column identifiers, column labels, and row IDs', () => {
    const adapter = loadAdapter();

    expect(() => adapter.table({
      id: 'duplicate_columns',
      columns: [
        { key: 'score', label: 'Score', type: 'number' },
        { key: 'score', label: 'Other score', type: 'number' },
      ],
      rows: [],
    })).toThrow(/duplicate column/i);

    expect(() => adapter.table({
      id: 'duplicate_labels',
      columns: [
        { key: 'score_a', label: 'Score', type: 'number' },
        { key: 'score_b', label: 'Score', type: 'number' },
      ],
      rows: [],
    })).toThrow(/duplicate column/i);

    expect(() => adapter.table({
      id: 'duplicate_rows',
      columns: [{ key: 'score', label: 'Score', type: 'number' }],
      rows: [
        { id: 'row-1', values: { score: 1 } },
        { id: 'row-1', values: { score: 2 } },
      ],
    })).toThrow(/duplicate row/i);

    const first = oneColumnTable(adapter, 'same_table');
    const second = oneColumnTable(adapter, 'same_table');
    expect(() => reviewedEnvelope(adapter, [first, second])).toThrow(/duplicate table/i);
  });

  it('rejects non-scalar cell payloads instead of stringifying them', () => {
    const adapter = loadAdapter();
    const tableConfig = (value) => ({
      id: 'scalar_contract',
      columns: [{ key: 'measure', label: 'Measure', type: 'text' }],
      rows: [{ id: 'row-1', values: { measure: value } }],
    });

    expect(() => adapter.table(tableConfig({
      privateNestedValue: 'must not be flattened',
    }))).toThrow(/only text, numbers, booleans, or empty values/i);
    expect(() => adapter.table(tableConfig([
      'must not be flattened',
    ]))).toThrow(/only text, numbers, booleans, or empty values/i);
    expect(() => adapter.table(tableConfig(() => 'must not expose function source')))
      .toThrow(/only text, numbers, booleans, or empty values/i);

    expect(adapter.table(tableConfig(undefined)).rows[0].values.measure).toBe('');
    expect(adapter.table(tableConfig(null)).rows[0].values.measure).toBeNull();
    expect(adapter.table(tableConfig(true)).rows[0].values.measure).toBe(true);
    expect(adapter.table(tableConfig(3)).rows[0].values.measure).toBe(3);
    expect(adapter.table(tableConfig('reviewed')).rows[0].values.measure).toBe('reviewed');
  });

  it('caps tables, rows, and columns while rejecting oversized cells', () => {
    const adapter = loadAdapter();
    const rows = Array.from({ length: 205 }, (_, index) => ({
      id: `row-${index + 1}`,
      values: {
        measure: 'x'.repeat(1200),
        ignored_private_field: 'must not cross the allowlist',
      },
    }));
    const capped = adapter.table({
      id: 'capped_table',
      columns: [{ key: 'measure', label: 'Measure', type: 'text' }],
      rows,
    });

    expect(capped.rows).toHaveLength(200);
    expect(capped.rowCount).toBe(200);
    expect(capped.sourceRowCount).toBe(205);
    expect(capped.truncated).toBe(true);
    expect(capped.rows[0].values.measure).toHaveLength(1200);
    expect(capped.rows[0].values).not.toHaveProperty('ignored_private_field');

    expect(() => adapter.table({
      id: 'oversized_cell',
      columns: [{ key: 'measure', label: 'Measure', type: 'text' }],
      rows: [{ id: 'row-1', values: { measure: 'x'.repeat(1201) } }],
    })).toThrow(/exceeds 1,200 characters/i);

    expect(() => adapter.table({
      id: 'too_many_columns',
      columns: Array.from({ length: 41 }, (_, index) => ({
        key: `field_${index}`,
        label: `Field ${index}`,
      })),
      rows: [],
    })).toThrow(/between 1 and 40 columns/i);

    const tables = Array.from(
      { length: 6 },
      (_, index) => oneColumnTable(adapter, `table_${index + 1}`),
    );
    expect(() => reviewedEnvelope(adapter, tables)).toThrow(/at most 5 tables/i);
  });

  it('uses an inclusive as-of boundary and excludes invalid or future-dated records', () => {
    const adapter = loadAdapter();
    const now = Date.parse('2026-07-29T12:00:00.000Z');
    const day = 24 * 60 * 60 * 1000;

    expect(adapter.withinDateRange(now, '30d', now)).toBe(true);
    expect(adapter.withinDateRange(now + 1, '30d', now)).toBe(false);
    expect(adapter.withinDateRange(now + 1, 'all', now)).toBe(false);
    expect(adapter.withinDateRange(now - 30 * day, '30d', now)).toBe(true);
    expect(adapter.withinDateRange(now - 30 * day - 1, '30d', now)).toBe(false);
    expect(adapter.withinDateRange(now - 3650 * day, 'all', now)).toBe(true);
    expect(adapter.withinDateRange('not-a-date', 'all', now)).toBe(false);
    expect(adapter.withinDateRange(new Date(Number.NaN), 'all', now)).toBe(false);
    expect(adapter.withinDateRange(0, 'all', 0)).toBe(true);
    expect(adapter.withinDateRange(1, 'all', 0)).toBe(false);
    expect(adapter.withinDateRange(now, 'all', Number.NaN)).toBe(false);
  });

  it('creates stable pseudonyms independent of input ordering and duplicates', () => {
    const adapter = loadAdapter();
    const first = adapter.createPseudonymMap(
      ['  Bea  ', 'Ada', 'Cal', 'Ada', '', null],
      'Learner!',
    );
    const second = adapter.createPseudonymMap(
      ['Cal', 'Ada', 'Bea'],
      'Learner!',
    );

    expect({ ...first }).toEqual({
      Ada: 'Learner001',
      Bea: 'Learner002',
      Cal: 'Learner003',
    });
    expect({ ...second }).toEqual({ ...first });
    expect(Object.getPrototypeOf(first)).toBeNull();
  });

  it('keeps provenance metadata shallow, bounded, scalar-only, and prototype-safe', () => {
    const adapter = loadAdapter();
    const provenance = JSON.parse(`{
      "window": "30d",
      "threshold": 5,
      "suppressed": true,
      "nested": { "keep": "yes", "deeper": { "drop": "no" } },
      "items": ["one", 2, false, null, { "drop": true }],
      " __proto__ ": { "polluted": "yes" },
      " constructor ": "drop",
      " prototype ": "drop"
    }`);
    provenance.notFinite = Number.POSITIVE_INFINITY;
    provenance.functionValue = () => 'drop';
    provenance.longText = 'x'.repeat(700);

    const envelope = reviewedEnvelope(
      adapter,
      [oneColumnTable(adapter)],
      { provenance },
    );

    expect(envelope.provenance).toMatchObject({
      window: '30d',
      threshold: 5,
      suppressed: true,
      nested: { keep: 'yes' },
      items: ['one', 2, false, null],
    });
    expect(envelope.provenance).not.toHaveProperty('notFinite');
    expect(envelope.provenance).not.toHaveProperty('functionValue');
    expect(envelope.provenance).not.toHaveProperty('__proto__');
    expect(envelope.provenance).not.toHaveProperty('constructor');
    expect(envelope.provenance).not.toHaveProperty('prototype');
    expect(envelope.provenance.longText).toHaveLength(500);
    expect(Object.getPrototypeOf(envelope.provenance)).toBe(Object.prototype);
    expect({}.polluted).toBeUndefined();
  });

  it('forces transfer-time AI and writeback capabilities off', () => {
    const adapter = loadAdapter();
    const envelope = reviewedEnvelope(
      adapter,
      [oneColumnTable(adapter)],
      {
        classification: {
          level: 'sensitive-education-record',
          identifierIncluded: true,
          freeTextNotesIncluded: true,
        },
        privacy: {
          scope: 'active-student',
          identifierIncluded: true,
          notesIncluded: true,
          reducedData: false,
          transferEnablesAI: true,
        },
        capabilities: {
          writeBack: true,
          aiEnabled: true,
        },
      },
    );

    expect(envelope.classification).toMatchObject({
      studentIdentifierIncluded: true,
      freeTextNotesIncluded: true,
    });
    expect(envelope.privacy).toMatchObject({
      identifierIncluded: true,
      notesIncluded: true,
      transferEnablesAI: false,
    });
    expect(envelope.capabilities).toEqual({
      writeBack: false,
      aiEnabled: false,
    });
  });

  it('revalidates and snapshots tables at the envelope boundary', () => {
    const adapter = loadAdapter();
    const table = oneColumnTable(adapter, 'snapshot_table', 'reviewed value');
    const envelope = reviewedEnvelope(adapter, [table]);

    table.rows[0].values.measure = 'mutated after review';
    table.columns[0].label = 'Mutated label';

    expect(envelope.tables[0].rows[0].values.measure).toBe('reviewed value');
    expect(envelope.tables[0].columns[0].label).toBe('Measure');

    expect(() => reviewedEnvelope(adapter, [{
      id: 'unvalidated_table',
      title: 'Unvalidated',
      columns: Array.from({ length: 41 }, (_, index) => ({
        key: `field_${index}`,
        label: `Field ${index}`,
      })),
      rows: [],
    }])).toThrow(/40 columns/i);
  });
});
