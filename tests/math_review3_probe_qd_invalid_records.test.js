// Math review 3 (2026-10-20): Quantity Discrimination records saved before the
// runner fix of 18 Oct 2026 are flagged invalid, and new Missing Number / QD
// records carry the form version.
//
// Before that fix the QD runner drew both choice buttons blank (it read
// problem.a / problem.b; bank items are {left, right}), so every choice was
// undefined and scored wrong, and "Save to Student Record" wrote 0 of N to the
// student's screening history. The record keeps only counts, so the bug's
// signature is the score itself: 0 correct, and no formVersion (every record
// saved since this change carries one). Such a record stays in the history,
// flagged; the Screening CSV lists it with a note and no accuracy or risk
// level, and adds one line explaining why. Missing Number before the fix
// crashed on Start (it mapped problem.sequence), so it could save nothing and
// none of its records are touched.
//
// Mutation check: SA_RECORDS_MODULE=<copy> points this at another build of
// student_analytics_module.js (the pre-change copy goes red).

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MODULES = resolve(ROOT, 'desktop/web-app/node_modules');
const React = require(resolve(MODULES, 'react'));
const { createRoot } = require(resolve(MODULES, 'react-dom/client'));
const MODULE_PATH = resolve(ROOT, process.env.SA_RECORDS_MODULE || 'student_analytics_module.js');
const source = readFileSync(MODULE_PATH, 'utf8');
const banks = JSON.parse(readFileSync(resolve(ROOT, 'psychometric_math_probes.json'), 'utf8'));
const STORE = 'alloflow_ac_imported_students';
const REASON = 'qd-blank-choices-before-2026-10-18';

// What the pre-fix runner saved after a full administration: 25 clicks on
// blank buttons, every one scored wrong.
const BUG_ERA_QD = { student: 'Ana', type: 'quantity_discrimination', date: '2026-10-02T14:05:00.000Z', correct: 0, total: 25, accuracy: 0, grade: 'K', form: 'A' };
// Also without a version, but 18 correct: impossible while the buttons were blank.
const SCORED_QD = { ...BUG_ERA_QD, date: '2026-10-19T15:00:00.000Z', correct: 18, accuracy: 72 };
const OLD_MN = { student: 'Ana', type: 'missing_number', date: '2026-10-02T14:10:00.000Z', correct: 0, total: 4, accuracy: 0, grade: '1', form: 'A' };
// Saved by the fixed runner (it carries formVersion): a real 0 stays a real 0.
const NEW_QD_ZERO = { ...BUG_ERA_QD, date: '2026-10-21T10:00:00.000Z', formVersion: 2 };
const ORF = { activity: 'orf', timestamp: Date.parse('2026-10-03T09:00:00Z'), grade: '1', form: 'A', correct: 40, total: 44, accuracy: 91, itemsPerMin: 40 };
const HISTORY = [BUG_ERA_QD, SCORED_QD, OLD_MN, NEW_QD_ZERO, ORF];

let Panel;
let root;
let host;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.ReactDOM = require(resolve(MODULES, 'react-dom'));
  const log = console.log;
  console.log = () => {};
  try { new Function(source)(); } finally { console.log = log; }
  Panel = window.AlloModules.StudentAnalytics;
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  try { localStorage.removeItem(STORE); } catch (e) {}
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(saved) {
  vi.useFakeTimers();
  localStorage.setItem(STORE, JSON.stringify([{ name: 'Ana', stats: {}, safetyFlags: [], screeningHistory: HISTORY }]));
  window.MISSING_NUMBER_PROBES = banks.MISSING_NUMBER_PROBES;
  window.QUANTITY_DISCRIMINATION_PROBES = banks.QUANTITY_DISCRIMINATION_PROBES;
  window.MATH_PROBE_BANKS = banks.MATH_PROBE_BANKS;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const err = console.error;
  console.error = () => {};
  try {
    React.act(() => root.render(React.createElement(Panel, {
      isOpen: true, onClose() {}, students: [], dashboardData: null, t: (k) => k, addToast() {}, loadProbeBanks() {},
      latestProbeResult: null, setLatestProbeResult: (record) => saved.push(record)
    })));
    React.act(() => { vi.advanceTimersByTime(100); });
  } finally { console.error = err; }
}
const buttons = () => Array.from(document.body.querySelectorAll('button'));
const click = (el) => React.act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); vi.advanceTimersByTime(60); });
function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  React.act(() => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
// RFC 4180 reader: quoted cells, doubled quotes, CRLF or LF rows, optional BOM.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const resultsBox = (title) => {
  const h = Array.from(document.body.querySelectorAll('h4')).find((el) => title.test(el.textContent));
  return h && h.parentElement;
};

describe('Quantity Discrimination records from before the runner fix', () => {
  it('are flagged invalid in the saved record, and nothing is deleted', () => {
    mount([]);
    const stored = JSON.parse(localStorage.getItem(STORE))[0].screeningHistory;
    expect(stored).toHaveLength(HISTORY.length);
    expect(stored[0]).toMatchObject({ ...BUG_ERA_QD, invalid: true, invalidReason: REASON });
    stored.slice(1).forEach((record, i) => {
      expect(record.invalid, 'record ' + (i + 2) + ' ' + record.type).toBeUndefined();
      expect(record).toEqual(HISTORY[i + 1]);
    });
  });

  it('stay listed in the Screening CSV with a note and no accuracy or risk level, plus one explanatory line', () => {
    const blobs = [];
    vi.stubGlobal('Blob', class { constructor(parts) { this.parts = parts; blobs.push(this); } });
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mount([]);
    click(buttons().find((b) => b.textContent.includes('Student Data')));
    click(buttons().find((b) => b.textContent.includes('Screening CSV')));
    expect(blobs.length, 'the Screening CSV download').toBeGreaterThan(0);
    const table = parseCsv(blobs.at(-1).parts.join(''));
    const header = table[0];
    expect(header.slice(-2)).toEqual(['Risk Level', 'Note']);
    const col = (name) => header.indexOf(name);
    const rows = table.slice(1, 1 + HISTORY.length);
    const bug = rows[0];
    expect(bug[col('Subtest')]).toBe('quantity_discrimination');
    expect([bug[col('Correct')], bug[col('Total')]], 'what was recorded stays visible').toEqual(['0', '25']);
    expect([bug[col('Accuracy%')], bug[col('Items/min')], bug[col('Risk Level')]]).toEqual(['', '', '']);
    expect(bug[col('Note')]).toBe('invalid: recorded before the fix on 18 Oct 2026');
    expect(rows[1][col('Risk Level')]).toBe('Some');
    expect(rows[2][col('Subtest')]).toBe('missing_number');
    expect(rows[3][col('Form')]).toBe('A v2');
    expect(rows[3][col('Risk Level')]).toBe('At Risk');
    expect(rows.slice(1).every((r) => r[col('Note')] === '')).toBe(true);
    expect(table).toHaveLength(1 + HISTORY.length + 1);
    expect(table.at(-1)[0]).toMatch(/recorded before the fix on 18 Oct 2026/);
  });
});

describe('new Missing Number and QD records carry the form version', () => {
  it('a Quantity Discrimination run saves formVersion 2 for the form given, and shows it next to the letter', () => {
    const saved = [];
    mount(saved);
    choose(document.querySelector('select[aria-label="Assign probe to student"]'), 'Ana');
    click(buttons().find((b) => /Start QD Probe/.test(b.textContent)));
    const items = banks.QUANTITY_DISCRIMINATION_PROBES.K.A.problems;
    items.forEach((item) => {
      const choices = buttons().filter((b) => /w-28 h-28/.test(b.className));
      click(choices.find((b) => b.textContent === String(item.answer)));
    });
    const box = resultsBox(/Quantity Discrimination Results/);
    expect(box && box.textContent).toContain('Form A v2');
    // The picker moving after the run must not relabel the record.
    choose(document.querySelector('select[aria-label="QD form"]'), 'B');
    click(Array.from(box.querySelectorAll('button')).find((b) => /Save to Student Record/.test(b.textContent)));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ type: 'quantity_discrimination', grade: 'K', form: 'A', formVersion: 2, correct: items.length, total: items.length });
  });

  it('a Missing Number run saves formVersion 2 and shows it next to the letter', () => {
    const saved = [];
    mount(saved);
    choose(document.querySelector('select[aria-label="Assign probe to student"]'), 'Ana');
    click(buttons().find((b) => /Start Missing Number/.test(b.textContent)));
    const items = banks.MISSING_NUMBER_PROBES['1'].A.problems;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    items.forEach((item) => {
      const input = document.querySelector('input[aria-label="Math probe answer"]');
      React.act(() => { setter.call(input, String(item.answer)); input.dispatchEvent(new Event('input', { bubbles: true })); });
      React.act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); vi.advanceTimersByTime(60); });
    });
    const box = resultsBox(/Missing Number Probe Results/);
    expect(box && box.textContent).toContain('Form A v2');
    click(Array.from(box.querySelectorAll('button')).find((b) => /Save to Student Record/.test(b.textContent)));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ type: 'missing_number', grade: '1', form: 'A', formVersion: 2, correct: items.length, total: items.length });
  });
});
