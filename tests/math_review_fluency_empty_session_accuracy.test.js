// Math review 2026-10-18: a session with nothing attempted has no accuracy.
//
// finishProbe stores accuracy 0 when zero problems were attempted (a student
// opened a session and ended it, or sat through the timer without answering).
// The teacher report then averaged that 0 in: two sessions at 18/20 plus one
// empty session reported "Avg Accuracy 60%" for a student who was 36/40 (90%)
// on everything they attempted. The same 0 reached the operation-growth
// "Recent accuracy" column, the session table and the CSV export. 0 of 0 is not
// 0%, so those surfaces now treat it as no accuracy (N/A, or blank in CSV).
// Rows saved before totalAttempted existed keep their stored accuracy.
//
// MF_REVIEW_MODULE lets the mutation check load a copy with the fix reverted.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, M, root, host;

const NOW = new Date('2026-10-18T12:00:00.000Z');
const answered = (date, correct, attempted) => ({
  date, mode: 'practice', untimed: false, operation: 'add', difficulty: 'within20',
  accuracy: Math.round((correct / attempted) * 100), dcpm: 30, totalCorrect: correct, totalAttempted: attempted,
  completionStatus: 'complete', validForComparison: true, timeLimit: 60,
});
const empty = (date, extra) => Object.assign({
  date, mode: 'practice', untimed: false, operation: 'add', difficulty: 'within20',
  accuracy: 0, dcpm: null, totalCorrect: 0, totalAttempted: 0,
  completionStatus: 'incomplete', validForComparison: false, timeLimit: 60,
}, extra || {});

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(process.env.MF_REVIEW_MODULE || 'math_fluency_module.js');
  M = window.AlloModules.MathFluencyInternals;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
});

describe('teacher aggregations ignore sessions with zero attempts', () => {
  const history = [
    answered('2026-10-17T12:00:00.000Z', 18, 20),
    answered('2026-10-16T12:00:00.000Z', 18, 20),
    empty('2026-10-15T12:00:00.000Z'),
  ];

  it('average accuracy is the accuracy on attempted work, not dragged to 60%', () => {
    const report = M.buildTeacherReport(history, {}, { days: 30 }, '3', {}, NOW);
    expect(report.totalCorrect).toBe(36);
    expect(report.totalAttempted).toBe(40);
    expect(report.avgAccuracy).toBe(90);
  });

  it('a timed run that expired with nothing answered does not lower recent accuracy', () => {
    const expired = empty('2026-10-15T12:00:00.000Z', { completionStatus: 'complete', finishReason: 'time', dcpm: 0, validForComparison: true });
    const rows = M.buildOperationGrowth([history[0], history[1], expired], {}, NOW);
    expect(rows.find((row) => row.op === 'add').recentAccuracy).toBe(90);
  });

  it('only empty sessions in range means no average, not 0%', () => {
    const report = M.buildTeacherReport([empty('2026-10-15T12:00:00.000Z')], {}, { days: 30 }, '3', {}, NOW);
    expect(report.avgAccuracy).toBeNull();
  });

  it('a legacy row with no totalAttempted keeps its stored accuracy', () => {
    const legacy = { date: '2026-10-14T12:00:00.000Z', mode: 'practice', operation: 'add', accuracy: 70 };
    const report = M.buildTeacherReport([history[0], legacy], {}, { days: 30 }, '3', {}, NOW);
    expect(report.avgAccuracy).toBe(80);
  });

  it('the CSV leaves accuracy blank for the empty session instead of writing 0%', () => {
    const csv = M.buildTeacherReportCsv(M.buildTeacherReport(history, {}, { days: 30 }, '3', {}, NOW));
    const lines = csv.split('\r\n');
    const header = lines[0].split(',');
    const accuracyCol = header.indexOf('Accuracy');
    const emptyRow = lines.find((line) => line.startsWith('2026-10-15'));
    expect(emptyRow.split(',')[accuracyCol]).toBe('');
    const fullRow = lines.find((line) => line.startsWith('2026-10-17'));
    expect(fullRow.split(',')[accuracyCol]).toBe('90%');
  });
});

describe('the rendered Teacher Report shows the same numbers', () => {
  async function mountWithHistory(rows) {
    const store = { ['allo_fluency_v2:' + encodeURIComponent('name:otter') + ':history']: rows.map((row) => Object.assign({ learnerId: 'name:otter' }, row)) };
    const storageDB = { get: async (key) => store[key] == null ? null : store[key], set: async () => {} };
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(window.AlloModules.MathFluency, {
        learnerId: 'name:otter', learnerName: 'Otter', gradeLevel: '3', storageDB,
        t: (k) => k, addToast: () => {}, onProbeComplete: () => {}, handleScoreUpdate: () => {},
      }));
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    const toggle = Array.from(host.querySelectorAll('button')).find((b) => /^Teacher Report/.test(b.textContent));
    expect(toggle, 'Teacher Report toggle').toBeTruthy();
    await act(async () => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    return host.querySelector('#mf-teacher-report');
  }

  it('Avg Accuracy card and session table do not report 0% for 0 of 0', async () => {
    const recent = (offsetHours) => new Date(Date.now() - offsetHours * 3600 * 1000).toISOString();
    const report = await mountWithHistory([
      answered(recent(3), 18, 20),
      answered(recent(2), 18, 20),
      empty(recent(1)),
    ]);
    expect(report).toBeTruthy();
    const card = Array.from(report.querySelectorAll('.mf-teacher-report-metrics > div')).find((d) => /Avg Accuracy/.test(d.textContent));
    expect(card.querySelector('strong').textContent).toBe('90%');
    const tables = report.querySelectorAll('table.mf-teacher-report-table');
    const sessionRows = Array.from(tables[tables.length - 1].querySelectorAll('tbody tr'));
    expect(sessionRows).toHaveLength(3);
    // Newest first: the empty session is row 0, its Accuracy cell is column 3.
    expect(sessionRows[0].querySelectorAll('td')[3].textContent).toBe('N/A');
    expect(sessionRows[1].querySelectorAll('td')[3].textContent).toBe('90%');
  });
});
