// Auto Repair Shop - trustworthy service-record contract.
//
// The service log stores real ownership history. These tests pin validation,
// recoverable deletion, legacy-state resilience, and spreadsheet-safe export.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractFunction(name) {
  const start = SRC.indexOf('function ' + name + '(');
  expect(start, name + ' not found').toBeGreaterThan(-1);
  const nextFunction = SRC.indexOf('\n  function ', start + 12);
  const nextSection = SRC.indexOf('\n  // ─', start + 12);
  const boundaries = [nextFunction, nextSection].filter((index) => index > start);
  const end = Math.min(...boundaries);
  expect(end, name + ' top-level boundary not found').toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(start, end) + '\nreturn ' + name + ';')();
}

const validate = extractFunction('arValidateServiceEntry');
const nextId = extractFunction('arNextServiceEntryId');
const normalize = extractFunction('arNormalizeServiceEntries');
const buildCSV = extractFunction('arBuildServiceCSV');

function serviceLog(extra) {
  return renderTool(ID, {
    autoRepair: Object.assign({ view: 'log' }, extra || {})
  });
}

const validDraft = {
  date: '2026-08-20',
  odo: '85432',
  service: '  Oil + filter change  ',
  cost: '45.678',
  notes: '  Synthetic 0W-20  '
};

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('service log - validation and normalization', () => {
  it('trims text, parses bounded numbers, and rounds currency', () => {
    const before = JSON.stringify(validDraft);
    const result = validate(validDraft, [], '2026-08-26');

    expect(result).toEqual({
      valid: true,
      errors: {},
      value: {
        date: '2026-08-20',
        odo: 85432,
        service: 'Oil + filter change',
        cost: 45.68,
        notes: 'Synthetic 0W-20'
      }
    });
    expect(JSON.stringify(validDraft)).toBe(before);
  });

  it('requires a real, non-future date and a service description', () => {
    const missing = validate({}, [], '2026-08-26');
    expect(missing.valid).toBe(false);
    expect(missing.errors.date).toMatch(/valid service date/i);
    expect(missing.errors.service).toMatch(/Describe the service/i);

    expect(validate({ date: '2026-02-30', service: 'Oil' }, [], '2026-08-26').errors.date)
      .toMatch(/valid service date/i);
    expect(validate({ date: '2026-08-27', service: 'Oil' }, [], '2026-08-26').errors.date)
      .toMatch(/future/i);
    expect(validate({ date: '2024-02-29', service: 'Oil' }, [], '2026-08-26').valid)
      .toBe(true);
  });

  it('rejects negative, fractional, non-finite, and implausibly large values', () => {
    const base = { date: '2026-08-20', service: 'Inspection' };

    expect(validate({ ...base, odo: '-1' }, [], '2026-08-26').errors.odo).toBeTruthy();
    expect(validate({ ...base, odo: '10.5' }, [], '2026-08-26').errors.odo).toBeTruthy();
    expect(validate({ ...base, odo: '1500001' }, [], '2026-08-26').errors.odo).toBeTruthy();
    expect(validate({ ...base, cost: '-0.01' }, [], '2026-08-26').errors.cost).toBeTruthy();
    expect(validate({ ...base, cost: 'Infinity' }, [], '2026-08-26').errors.cost).toBeTruthy();
    expect(validate({ ...base, cost: '1000001' }, [], '2026-08-26').errors.cost).toBeTruthy();
  });

  it('enforces useful text limits without silently truncating records', () => {
    const result = validate({
      date: '2026-08-20',
      service: 'S'.repeat(121),
      notes: 'N'.repeat(501)
    }, [], '2026-08-26');

    expect(result.valid).toBe(false);
    expect(result.errors.service).toMatch(/120 characters/i);
    expect(result.errors.notes).toMatch(/500 characters/i);
    expect(result.value.service).toHaveLength(121);
    expect(result.value.notes).toHaveLength(501);
  });

  it('blocks an exact logical duplicate while allowing genuinely different work', () => {
    const entries = [{
      id: 'one',
      date: '2026-08-20',
      odo: 85432,
      service: 'Oil + Filter Change',
      cost: 45,
      notes: ''
    }];
    const duplicate = validate(validDraft, entries, '2026-08-26');

    expect(duplicate.valid).toBe(false);
    expect(duplicate.errors.duplicate).toMatch(/already exist/i);
    expect(validate({ ...validDraft, odo: '85433' }, entries, '2026-08-26').valid).toBe(true);
    expect(validate({ ...validDraft, service: 'Tire rotation' }, entries, '2026-08-26').valid).toBe(true);
  });

  it('generates collision-free IDs deterministically when timestamps repeat', () => {
    const entries = [{ id: 'log_123' }, { id: 'log_123_2' }];
    const before = JSON.stringify(entries);

    expect(nextId(entries, 123)).toBe('log_123_3');
    expect(nextId([], 123.9)).toBe('log_123');
    expect(JSON.stringify(entries)).toBe(before);
  });

  it('repairs malformed legacy records without mutating or dropping user data', () => {
    const legacy = [
      { id: 'same', date: null, odo: '90000.8', service: '', cost: '12.345', notes: null },
      { id: 'same', date: '2025-01-01', odo: -4, service: 'Battery', cost: -10, notes: 'receipt' },
      null
    ];
    const before = JSON.stringify(legacy);
    const cleaned = normalize(legacy);

    expect(cleaned).toEqual([
      { id: 'same', date: '', odo: 90000, service: 'Unlabelled service', cost: 12.35, notes: '' },
      { id: 'same_2', date: '2025-01-01', odo: 0, service: 'Battery', cost: 0, notes: 'receipt' }
    ]);
    expect(JSON.stringify(legacy)).toBe(before);
  });
});

describe('service log - safe CSV', () => {
  it('emits RFC-style quoted cells, CRLF rows, and fixed two-decimal costs', () => {
    const csv = buildCSV([{
      date: '2026-08-20',
      odo: 85432,
      service: 'Oil, filter & "inspection"',
      cost: 45.6,
      notes: 'Line one\nLine two'
    }]);

    expect(csv.startsWith('date,odometer,service,cost,notes\r\n')).toBe(true);
    expect(csv).toContain('"85432"');
    expect(csv).toContain('"45.60"');
    expect(csv).toContain('"Oil, filter & ""inspection"""');
    expect(csv).toContain('"Line one\nLine two"');
  });

  it('neutralizes spreadsheet formulas in every user-controlled text cell', () => {
    const csv = buildCSV([
      { date: '=TODAY()', odo: 1, service: '+SUM(1,1)', cost: 2, notes: '@malicious' },
      { date: '2026-01-01', odo: 2, service: '  -cmd', cost: 3, notes: 'normal' }
    ]);

    expect(csv).toContain('"\'=TODAY()"');
    expect(csv).toContain('"\'+SUM(1,1)"');
    expect(csv).toContain('"\'@malicious"');
    expect(csv).toContain('"\'  -cmd"');
    expect(csv).not.toContain('"=TODAY()"');
  });

  it('handles malformed legacy values without leaking undefined or negative totals', () => {
    const csv = buildCSV([
      { service: 'Unknown', odo: -20, cost: -8 },
      null,
      { service: 'Bad numbers', odo: 'nope', cost: 'nope' }
    ]);

    expect(csv).not.toContain('undefined');
    expect(csv).not.toContain('NaN');
    expect(csv.match(/"0"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(csv.match(/"0\.00"/g)?.length).toBe(2);
  });
});

describe('service log - accessible rendered states', () => {
  it('renders a keyboard-submit form with bounded and labelled controls', () => {
    const html = serviceLog();

    expect(html).toContain('<form');
    expect(html).toContain('novalidate=""');
    expect(html).toContain('type="date"');
    expect(html).toContain('required=""');
    expect(html).toContain('aria-label="Service date"');
    expect(html).toContain('max="');
    expect(html).toContain('max="1500000"');
    expect(html).toContain('max="1000000"');
    expect(html).toContain('maxLength="120"');
    expect(html).toContain('<textarea');
    expect(html).toContain('maxLength="500"');
    expect(html).not.toContain('data-ar-log-export=');
  });

  it('renders a linked alert and field-level invalid states', () => {
    const html = serviceLog({
      logDraft: { date: '2026-12-31', odo: '-1', service: '', cost: '-5', notes: '' },
      logFormErrors: {
        date: 'Service date cannot be in the future.',
        service: 'Describe the service that was performed.',
        odo: 'Odometer must be a whole number from 0 to 1,500,000.',
        cost: 'Cost must be from $0 to $1,000,000.'
      }
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('data-ar-log-errors="4"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="autorepair-log-error-date"');
    expect(html).toContain('id="autorepair-log-error-service"');
    expect(html).toContain('Check this entry:');
  });

  it('renders robust summaries, download/copy controls, and normalized legacy entries', () => {
    const html = serviceLog({
      serviceLog: [
        { id: 'same', date: '2026-08-20', odo: '85432', service: 'Oil', cost: '45.5', notes: '' },
        { id: 'same', date: '2026-08-21', odo: 'bad', service: '', cost: -3, notes: 'legacy' }
      ]
    });

    expect(html).toContain('Entries: </strong>2');
    expect(html).toContain('Total cost: </strong>$45.50');
    expect(html).toContain('Latest odometer: </strong>85,432');
    expect(html).toContain('data-ar-log-entry="same"');
    expect(html).toContain('data-ar-log-entry="same_2"');
    expect(html).toContain('Unlabelled service');
    expect(html).toContain('data-ar-log-export="download"');
    expect(html).toContain('data-ar-log-export="copy"');
    expect(html).toContain('Download service log as CSV');
  });

  it('requires an explicit second action before deletion', () => {
    const entry = { id: 'oil-1', date: '2026-08-20', odo: 85432, service: 'Oil change', cost: 45, notes: '' };
    const normal = serviceLog({ serviceLog: [entry] });
    const confirming = serviceLog({ serviceLog: [entry], logPendingDelete: 'oil-1' });

    expect(normal).toContain('aria-label="Delete Oil change from 2026-08-20"');
    expect(normal).not.toContain('data-ar-log-delete-confirm=');
    expect(confirming).toContain('data-ar-log-delete-confirm="oil-1"');
    expect(confirming).toContain('Confirm deletion of Oil change');
    expect(confirming).toContain('Delete this record?');
    expect(confirming).toContain('>Cancel</button>');
    expect(confirming).toContain('>Delete record</button>');
  });

  it('offers an announced Undo and dismiss path after removal', () => {
    const html = serviceLog({
      serviceLog: [],
      logUndoEntry: { id: 'oil-1', date: '2026-08-20', odo: 85432, service: 'Oil change', cost: 45, notes: '' },
      logUndoIndex: 0
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-ar-log-undo="oil-1"');
    expect(html).toContain('Removed <strong>Oil change</strong>.');
    expect(html).toContain('Undo</button>');
    expect(html).toContain('>Dismiss</button>');
  });
});

describe('service log - mutation and export wiring', () => {
  it('validates before creating or mutating an entry', () => {
    const start = SRC.indexOf('function saveEntry()');
    const end = SRC.indexOf('function requestDelete(', start);
    const handler = SRC.slice(start, end);

    expect(handler).toContain('arValidateServiceEntry(draft, entries, todayIso)');
    expect(handler.indexOf('if (!checked.valid)')).toBeGreaterThan(-1);
    expect(handler.indexOf('updMulti({')).toBeGreaterThan(handler.indexOf('if (!checked.valid)'));
    expect(handler).toContain('arNextServiceEntryId(entries, Date.now())');
    expect(handler).toContain('logFormErrors: {}');
    expect(handler).toContain('if (newEntries.length >= 10)');
  });

  it('separates delete request, confirmation, and recoverable mutation', () => {
    const requestStart = SRC.indexOf('function requestDelete(');
    const confirmStart = SRC.indexOf('function confirmDelete(', requestStart);
    const undoStart = SRC.indexOf('function undoDelete(', confirmStart);
    const request = SRC.slice(requestStart, confirmStart);
    const confirm = SRC.slice(confirmStart, undoStart);

    expect(request).toContain("upd('logPendingDelete', entry.id)");
    expect(request).not.toContain('serviceLog');
    expect(confirm).toContain('logUndoEntry: removed');
    expect(confirm).toContain('logUndoIndex: index');
    expect(confirm).toContain('serviceLog: newEntries');
    expect(SRC.slice(undoStart, SRC.indexOf('function dismissUndo(', undoStart)))
      .toContain('restoredEntries.splice(insertAt, 0, restored)');
  });

  it('downloads a BOM-prefixed CSV, revokes the URL, and never logs records to console', () => {
    const start = SRC.indexOf('function downloadCSV()');
    const end = SRC.indexOf('function fieldError(', start);
    const handler = SRC.slice(start, end);

    expect(handler).toContain('arBuildServiceCSV(entries)');
    expect(handler).toContain("new Blob(['\\uFEFF', csv]");
    expect(handler).toContain("link.download = 'vehicle-service-log-' + todayIso + '.csv'");
    expect(handler).toContain('link.click()');
    expect(handler).toContain('URL.revokeObjectURL(objectUrl)');
    expect(handler).not.toContain('console.log');
  });

  it('keeps the deployed desktop copy byte-identical', () => {
    expect(readFileSync(resolve(process.cwd(), MIRROR), 'utf8')).toBe(SRC);
  });
});
