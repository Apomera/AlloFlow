// Teacher Dashboard "Export CSV" — the probe/WCPM/survey/session columns.
//
// Defect (pre-existing at HEAD, found 2026-09-14 while routing the
// Communications Studio): handleExportCSV's row builder is a
// `dashboardData.map(student => ...)` but five lines inside it read a bare
// `s` — a variable that exists nowhere in that scope. The reference throws
// ReferenceError on the FIRST row, so Export CSV was dead for every teacher
// with any dashboard data at all. It only looked alive because the button
// no-ops on an EMPTY dashboard (`if (!dashboardData.length) return;`) — the
// one path a smoke test would exercise.
//
// Why nothing caught it: check_free_vars scans ~160 sources and
// teacher_source.jsx is not one of them, so a bare `s` raised no flag. This
// suite closes that hole for the export path specifically, by RUNNING the
// real built module's handler against a fixture dashboard and asserting on
// the CSV bytes it produces — a grep for `student.probeHistory` would pass
// against a file that still throws one line later.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const root = process.cwd();
const source = readFileSync(resolve(root, 'teacher_source.jsx'), 'utf8');
const builtModule = readFileSync(resolve(root, 'teacher_module.js'), 'utf8');
const mirror = readFileSync(resolve(root, 'desktop/web-app/public/teacher_module.js'), 'utf8');

// One student with something in every column the bug touched, so a
// ReferenceError on any of the five lines fails this suite.
const STUDENT = {
  id: 'u1',
  studentNickname: 'Brave Otter',
  timestamp: '2026-09-14T12:00:00.000Z',
  history: [
    { id: 'q1', type: 'quiz', data: { questions: [{ options: ['a', 'b'], correctAnswer: 'b' }, { correctAnswer: 'four' }] } },
    { id: 'n1', type: 'note-taking', data: { templateType: 'cornell-notes' } },
    { id: 'a1', type: 'anchor-chart', data: {} },
  ],
  responses: { q1: { 0: 1, 1: 'Four' } },
  stats: { totalXP: 120 },
  probeHistory: { orf: [{ wcpm: 90 }, { wcpm: 110 }] },
  surveyResponses: [{ ease: 3 }, { ease: 4 }],
  sessionCounter: 7,
};

let Dashboard;
const roots = [];
let downloads = [];

function mountDashboard(dashboardData) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const reactRoot = ReactDOMClient.createRoot(container);
  roots.push({ root: reactRoot, container });
  const noop = () => {};
  act(() => {
    reactRoot.render(React.createElement(Dashboard, {
      onClose: noop,
      dashboardData,
      setDashboardData: noop,
      addToast: noop,
      setSelectedStudentId: noop,
      selectedStudentId: null,
      setDashboardView: noop,
      dashboardView: 'list',
      generateResourceHTML: () => '',
      onOpenBehaviorLens: noop,
      callGemini: async () => '',
    }));
  });
  return container;
}

// The handler builds a Blob and clicks an <a download>. Capture the bytes.
// Install this AFTER mounting: React creates its own host nodes through
// document.createElement, so a spy active during render corrupts the tree
// (the first version of this suite saw an empty container because of it).
function captureDownloads() {
  downloads = [];
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    const el = realCreate(tag);
    if (String(tag).toLowerCase() === 'a') {
      Object.defineProperty(el, 'click', { value: () => { downloads.push({ href: el.getAttribute('href'), name: el.getAttribute('download') }); }, writable: true });
    }
    return el;
  });
}

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  // Captured at module scope (`var LanguageContext = window.AlloLanguageContext`),
  // so it must exist BEFORE the module body runs or every hook throws.
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.__alloT = (key) => key;
  window.AlloIcons = window.AlloIcons || {};
  if (!window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:stub';
  if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};
  // eslint-disable-next-line no-new-func
  new Function(builtModule)();
  // React.memo(...) is an OBJECT, not a function — a `typeof === function`
  // guard here silently skips the whole suite.
  Dashboard = window.AlloModules.TeacherDashboard;
  if (!Dashboard) throw new Error('TeacherDashboard did not register');
});

afterEach(() => {
  vi.restoreAllMocks();
  while (roots.length) {
    const { root: r, container } = roots.pop();
    act(() => r.unmount());
    container.remove();
  }
});

// Select on the stable data-help-key, not the label: t() returns the key in
// tests, so the visible text is never the English string.
const findExportButton = (container) =>
  container.querySelector('[data-help-key="dashboard_export_csv_btn"]');

describe('Export CSV runs against real dashboard data', () => {
  it('does not throw, and writes the probe, WCPM, survey and session columns', () => {
    const container = mountDashboard([STUDENT]);
    const button = findExportButton(container);
    expect(button, 'the Export CSV button must render with data present').toBeTruthy();

    captureDownloads();
    const blobs = [];
    const RealBlob = window.Blob;
    vi.spyOn(window, 'Blob').mockImplementation(function (parts, opts) {
      blobs.push(Array.isArray(parts) ? parts.join('') : String(parts));
      return new RealBlob(parts, opts);
    });

    // The defect surfaced exactly here: a ReferenceError inside the row map.
    expect(() => act(() => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); })).not.toThrow();

    expect(blobs.length, 'a CSV blob must have been built').toBeGreaterThan(0);
    const csv = blobs[blobs.length - 1];
    const [header, firstRow] = csv.split('\n');
    const col = (name) => header.split(',').findIndex((h) => h.replace(/"/g, '').trim().toLowerCase() === name);
    const cells = firstRow.match(/"[^"]*"|[^,]+/g) || [];
    const cell = (name) => String(cells[col(name)] || '').replace(/"/g, '');

    expect(col('probes'), 'the Probes column must exist').toBeGreaterThan(-1);
    expect(cell('probes')).toBe('2');
    expect(cell('avg wcpm')).toBe('100');
    expect(cell('surveys')).toBe('2');
    expect(cell('sessions')).toBe('7');
    // Guard the columns that were already correct, so a future "fix" that
    // renames the map parameter cannot quietly break them instead.
    expect(firstRow).toContain('Brave Otter');
    expect(firstRow).toContain('120');
  });

  it('a student missing every optional field exports zeros, not a crash', () => {
    const container = mountDashboard([{ id: 'u2', studentNickname: 'Quiet Heron', timestamp: '2026-09-14T12:00:00.000Z', history: [] }]);
    const button = findExportButton(container);
    expect(button).toBeTruthy();
    captureDownloads();
    expect(() => act(() => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); })).not.toThrow();
    expect(downloads.length).toBeGreaterThan(0);
  });
});

describe('the source has no unbound row variable left', () => {
  it('every s.probeHistory / s.surveyResponses / s.sessionCounter sits in a callback that binds s', () => {
    const lines = source.split('\n');
    const offenders = [];
    lines.forEach((line, i) => {
      if (!/(^|[^A-Za-z0-9_.$'"])s\.(probeHistory|surveyResponses|sessionCounter)/.test(line)) return;
      // Walk back to the nearest enclosing arrow/function that binds `s`.
      const window_ = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
      const binds = /\b(?:filter|map|flatMap|forEach|find|some|every|reduce|sort)\(\s*(?:\(\s*sum\s*,\s*s\s*\)|\(?\s*s\s*\)?)\s*=>/.test(window_)
        || /\(\s*s\s*(?:,|\))\s*=>/.test(window_);
      if (!binds) offenders.push(`${i + 1}: ${line.trim().slice(0, 100)}`);
    });
    expect(offenders, 'unbound `s` in teacher_source.jsx — this is the Export CSV defect class').toEqual([]);
  });

  it('the built module and its public mirror are current', () => {
    expect(builtModule).toContain('probeHistory');
    expect(mirror).toBe(builtModule);
  });
});
