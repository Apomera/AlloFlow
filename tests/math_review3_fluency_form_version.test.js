// Math review 3 (2026-10-19): fixed-form results carry the form's version.
//
// The fixed forms in psychometric_math_probes.json are being rebuilt, and the
// rebuilt ones carry `version: 2` (MATH_PROBE_BANKS[grade][form].version). A
// result that said only "Form A" would silently mix scores from the old and new
// Form A. Every benchmark result now records formVersion (form.version || 1, so
// it works before the field exists), and every place results are listed shows
// it next to the form letter: the results card, the Teacher Report table, the
// CSV export and the probe-history record the sidebar writes.
//
// MF_REVIEW3_MODULE / MF_REVIEW3_SIDEBAR let the mutation check load copies.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { indexOfOrThrow } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
const SIDEBAR = process.env.MF_REVIEW3_SIDEBAR || 'view_sidebar_panels_source.jsx';
let React, ReactDOMClient, act, root, host, M;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(process.env.MF_REVIEW3_MODULE || 'math_fluency_module.js');
  M = window.AlloModules.MathFluencyInternals;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  vi.restoreAllMocks();
  localStorage.clear();
  delete window.MATH_PROBE_BANKS;
});

const wait = ms => act(async () => { await new Promise(r => setTimeout(r, ms)); });
// Poll instead of a fixed sleep: timers can land late under machine load.
async function until(check, label, ms = 8000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out waiting for ' + label);
    await wait(25);
  }
}
async function change(el, value) {
  await act(async () => {
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    d.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function click(el) { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); }

async function mount(extra) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const completed = [];
  await act(async () => {
    root.render(React.createElement(window.AlloModules.MathFluency, Object.assign({
      learnerId: 'name:otter', learnerName: 'Otter', gradeLevel: '3', t: k => k,
      addToast: () => {}, onProbeComplete: e => completed.push(e), handleScoreUpdate: () => {},
    }, extra || {})));
  });
  await wait(20);
  return completed;
}

async function runOneItemForm(bank) {
  vi.spyOn(performance, 'now').mockReturnValue(1000);
  window.MATH_PROBE_BANKS = { '3': { A: bank } };
  const completed = await mount();
  await change(host.querySelector('select[aria-label="Probe Mode"]'), 'benchmark');
  await click(host.querySelector('button[aria-label="Start fixed form"]'));
  await change(document.querySelector('input[aria-label="Your answer"]'), '2');
  await click(document.querySelector('form button[type="submit"]'));
  await until(() => completed.length === 1, 'the finished run');
  return completed[0];
}
const oneItem = extra => Object.assign({ operation: 'add', difficulty: 'fixed', timeLimit: 120, problems: [{ a: 1, b: 1, op: 'add', symbol: '+', answer: 2 }] }, extra || {});
const modeChip = () => host.querySelector('.mf-results-header').textContent;

function runSidebarHandler(data) {
  const src = readFileSync(resolve(process.cwd(), SIDEBAR), 'utf8');
  const marker = 'onProbeComplete={(entry) => {';
  const open = indexOfOrThrow(src, marker, { file: SIDEBAR }) + marker.length - 1;
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const saved = [];
  new Function('entry', 'setHistory', 'saveProbeResult', 'addToast', 't', src.slice(open + 1, end))(
    { timestamp: 1, data }, () => {}, (student, record) => saved.push(record), () => {}, () => null);
  return saved;
}

describe('a benchmark result records which version of the form was given', () => {
  it('a rebuilt form (version 2) is recorded and shown as v2', async () => {
    const entry = await runOneItemForm(oneItem({ version: 2 }));
    expect(entry.data).toMatchObject({ mode: 'benchmark', form: 'A', formVersion: 2 });
    expect(modeChip()).toContain('Fixed Form A v2');
  });

  it('a form without a version field is version 1', async () => {
    const entry = await runOneItemForm(oneItem());
    expect(entry.data.formVersion).toBe(1);
    expect(modeChip()).toContain('Fixed Form A v1');
  });

  it('a practice run has no form version', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const completed = await mount();
    await click(host.querySelector('button[aria-label="Start practice"]'));
    await click(document.querySelector('button[aria-label="End probe early"]'));
    const safeguard = document.querySelector('[role="alertdialog"][aria-labelledby="mf-end-early-title"]');
    await click(Array.from(safeguard.querySelectorAll('button')).find(b => b.textContent.includes('End & save')));
    expect(completed[0].data.formVersion).toBeNull();
  });
});

describe('every result listing shows the version next to the form letter', () => {
  const recent = h => new Date(Date.now() - h * 3600 * 1000).toISOString();
  const rows = [
    { date: recent(1), mode: 'benchmark', form: 'A', formVersion: 2, operation: 'mul', accuracy: 100, dcpm: 59, totalCorrect: 25, totalAttempted: 25, completionStatus: 'complete', validForComparison: true, prorated: true, elapsedSeconds: 45, timeLimit: 120 },
    { date: recent(2), mode: 'benchmark', form: 'B', operation: 'mul', accuracy: 90, dcpm: 20, totalCorrect: 18, totalAttempted: 20, completionStatus: 'complete', validForComparison: true, timeLimit: 120 },
  ];

  it('the Teacher Report session table', async () => {
    const store = { ['allo_fluency_v2:' + encodeURIComponent('name:otter') + ':history']: rows.map(r => Object.assign({ learnerId: 'name:otter' }, r)) };
    await mount({ storageDB: { get: async key => store[key] || null, set: async () => {} } });
    await click(host.querySelector('button[aria-controls="mf-teacher-report"]'));
    const sessionCells = () => {
      const tables = host.querySelectorAll('#mf-teacher-report table.mf-teacher-report-table');
      if (tables.length < 2) return [];
      return Array.from(tables[tables.length - 1].querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent));
    };
    await until(() => sessionCells().length === 2 && sessionCells()[0].length === 5, 'both saved sessions in the report');
    const cells = sessionCells();
    expect(cells[0][1]).toBe('Benchmark (Form A v2)');
    expect(cells[1][1]).toBe('Benchmark (Form B v1)');
    // The prorated rate says so wherever it is shown: the session row, the
    // Latest DCPM card and the operation's Latest DCPM.
    expect(cells[0][4]).toBe('59 (prorated)');
    expect(cells[1][4]).toBe('20');
    const report = host.querySelector('#mf-teacher-report');
    const latestCard = Array.from(report.querySelectorAll('.mf-teacher-report-metrics > div')).find(d => /Latest DCPM/.test(d.textContent));
    expect(latestCard.querySelector('span').textContent).toBe('Latest DCPM (prorated)');
    expect(latestCard.querySelector('strong').textContent).toBe('59');
    const mulRow = Array.from(report.querySelectorAll('.mf-operation-growth-table tbody tr')).find(tr => tr.querySelector('th').textContent === 'Multiplication');
    expect(mulRow.querySelectorAll('td')[3].textContent).toMatch(/^59 \(prorated\)/);
  });

  it('the CSV export, in columns added after the original ones', () => {
    const csv = M.buildTeacherReportCsv(M.buildTeacherReport(rows, {}, { days: 30 }, '3', {}, new Date()));
    const lines = csv.split('\r\n');
    const header = lines[0].split(',');
    expect(header.slice(0, 12).join(',')).toBe('Date,Mode,Operation,Practice Set,Timing,Accuracy,DCPM,Correct,Attempted,Completion,Goal,Goal Result');
    expect(header.slice(12)).toEqual(['Form', 'Form Version', 'Rate Prorated']);
    expect(lines[1].split(',').slice(12)).toEqual(['A', '2', 'Yes']);
    expect(lines[2].split(',').slice(12)).toEqual(['B', '1', '']);
  });

  it('the probe-history record the sidebar writes', () => {
    const base = { mode: 'benchmark', student: 'Otter', form: 'A', grade: '3', dcpm: 30, accuracy: 100, totalCorrect: 25, totalAttempted: 25, validForComparison: true, completionStatus: 'complete' };
    expect(runSidebarHandler(Object.assign({}, base, { formVersion: 2 }))[0]).toMatchObject({ form: 'A', formVersion: 2 });
    expect(runSidebarHandler(base)[0]).toMatchObject({ form: 'A', formVersion: 1 });
  });
});
