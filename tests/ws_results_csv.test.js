// Word Sounds class results export (lane D, 2026-10-20). Mounts the real
// Assessment Center with imported students, clicks the class-toolbar exports
// and reads back the CSV bytes that would have been downloaded.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const STORE_KEY = 'alloflow_ac_imported_students';

let React;
let client;
let Panel;
let root;
let host;
let blobs;
let downloads;
let savedUrl;

const at = (y, m, d, h) => new Date(y, m - 1, d, h).getTime();
const stats = { quizAvg: 0, wsAccuracy: 0, wsWordsCompleted: 0, wsBestStreak: 0, fluencyWCPM: 0, gamesPlayed: 0, totalActivities: 0, labelChallengeAvg: 0, adventureXP: 0 };
const student = (id, name, wordSoundsState) => ({ id, name, stats, safetyFlags: [], screeningHistory: [], data: wordSoundsState ? { wordSoundsState } : {} });
const FALCON_MASTERY = {
  k: { total: 6, correct: 5, independentAttempts: 5, independentAccuracy: 80 },
  a: { total: 4, correct: 4, independentAttempts: 4, independentAccuracy: 100 },
  sh: { total: 3, correct: 1, independentAttempts: 6, independentAccuracy: 79 },
};
const CLASS = () => [
  student('s1', 'Swift Falcon', {
    phonemeMastery: FALCON_MASTERY,
    history: [
      { timestamp: at(2026, 10, 2, 9), phonemes: ['k', 'a', 't'] },
      { timestamp: at(2026, 10, 14, 23), phonemes: ['K'] },
      { timestamp: at(2026, 10, 7, 8), phonemes: [{ phoneme: 'sh' }, 'i', 'p'] },
    ],
  }),
  student('s2', '=HYPERLINK("http://x.test","y")', { phonemeMastery: { k: { total: 3, correct: 1, independentAttempts: 10, independentAccuracy: null } }, history: [] }),
  student('s3', 'Lee, "Sam"', { phonemeMastery: { k: { total: 10, correct: 9, independentAttempts: 10, independentAccuracy: 90 } }, history: [{ timestamp: at(2026, 9, 30, 10), phonemes: ['k'] }] }),
  student('s4', '@Quiet Heron', { phonemeMastery: { a: { total: 2, correct: 1, independentAttempts: 2, independentAccuracy: 50 } } }),
  student('s5', 'No Data Owl', null),
  student('s6', 'Empty Mastery', { phonemeMastery: {}, history: [{ timestamp: at(2026, 10, 1, 9), phonemes: ['m'] }] }),
];

const textOf = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const buttonWithText = (scope, text) => [...scope.querySelectorAll('button')].find((b) => textOf(b).includes(text));
const localStamp = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const bytesOf = (blob) => new Promise((done) => { const reader = new FileReader(); reader.onload = () => done(new Uint8Array(reader.result)); reader.readAsArrayBuffer(blob); });
const decode = (bytes) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function mountPanel(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = client.createRoot(host);
  await React.act(async () => {
    root.render(React.createElement(Panel, { isOpen: true, onClose: vi.fn(), theme: 'light', t: (k) => k, loadProbeBanks: () => Promise.resolve(), ...props }));
    await Promise.resolve();
  });
}
async function press(button) {
  await React.act(async () => { button.click(); await Promise.resolve(); });
}
// The exports sit beside Export CSV in the class toolbar on the default tab.
async function studentData(students, addToast = vi.fn(), props = {}) {
  localStorage.setItem(STORE_KEY, JSON.stringify(students));
  await mountPanel({ addToast, ...props });
  return addToast;
}
async function exported(label) {
  const button = buttonWithText(document.body, label);
  expect(button, label).toBeTruthy();
  const before = blobs.length;
  await press(button);
  expect(blobs.length, 'one file per click').toBe(before + 1);
  const bytes = await bytesOf(blobs[blobs.length - 1]);
  return { bytes, text: decode(bytes), rows: parseCsv(decode(bytes).replace(/^\uFEFF/, '')), name: downloads[downloads.length - 1] };
}

beforeAll(() => {
  React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
  client = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
  globalThis.React = window.React = React;
  globalThis.X = window.X = () => null;
  window.ReactDOM = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(DIR + '/student_analytics_module.js', 'utf8'))();
  Panel = window.AlloModules.StudentAnalytics;
  if (!Panel) throw Error('lane copy did not register StudentAnalytics');
});
beforeEach(() => {
  blobs = [];
  downloads = [];
  savedUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  URL.createObjectURL = vi.fn((blob) => { blobs.push(blob); return 'blob:lane-d-' + blobs.length; });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { downloads.push(this.download); });
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  if (host) host.remove();
  root = null;
  host = null;
  localStorage.clear();
  URL.createObjectURL = savedUrl.create;
  URL.revokeObjectURL = savedUrl.revoke;
  vi.restoreAllMocks();
});

describe('Export Word Sounds results (CSV)', () => {
  it('writes one row per student and sound, with the dashboard name and a local last-practiced date', async () => {
    await studentData(CLASS());
    const { rows } = await exported('Export Word Sounds results (CSV)');
    expect(rows[0]).toEqual(['Student', 'Sound', 'Attempts', 'Correct', 'Accuracy %', 'Mastered', 'Last practiced']);
    expect(rows.slice(1).map((r) => [r[0], r[1]])).toEqual([
      ['Swift Falcon', 'a'], ['Swift Falcon', 'k'], ['Swift Falcon', 'sh'],
      ["'=HYPERLINK(\"http://x.test\",\"y\")", 'k'],
      ['Lee, "Sam"', 'k'],
      ["'@Quiet Heron", 'a'],
    ]);
    const falcon = Object.fromEntries(rows.slice(1, 4).map((r) => [r[1], r.slice(2)]));
    expect(falcon.k).toEqual(['6', '5', '83', 'Yes', '2026-10-14']);
    expect(falcon.a).toEqual(['4', '4', '100', 'No', '2026-10-02']);
    expect(falcon.sh).toEqual(['3', '1', '33', 'No', '2026-10-07']);
    expect(rows[4].slice(2), 'no saved history row: blank date').toEqual(['3', '1', '33', 'No', '']);
    expect(rows[5].slice(2)).toEqual(['10', '9', '90', 'Yes', '2026-09-30']);
  });

  it('decides Mastered by the same rule as the student report', async () => {
    await studentData(CLASS());
    const { rows } = await exported('Export Word Sounds results (CSV)');
    const csvMastered = rows.slice(1, 4).filter((r) => r[5] === 'Yes').map((r) => r[1]);
    await React.act(async () => root.unmount());
    host.remove();
    // The student's own progress report lists mastered sounds as strengths.
    await mountPanel({ isIndependentMode: true, phonemeMastery: FALCON_MASTERY, addToast: vi.fn() });
    const before = blobs.length;
    await press(buttonWithText(document.body, 'learner.download_progress_report'));
    expect(blobs.length).toBe(before + 1);
    const report = new DOMParser().parseFromString(decode(await bytesOf(blobs[blobs.length - 1])), 'text/html');
    const strengths = [...report.querySelectorAll('span')].map((s) => s.textContent).filter((t) => t.startsWith('\u2705 ')).map((t) => t.slice(2));
    expect(csvMastered).toEqual(['k']);
    expect(strengths).toEqual(csvMastered);
  });

  it('quotes every field (RFC 4180), doubles quotes, guards formulas and starts with a UTF-8 BOM', async () => {
    await studentData(CLASS());
    const { bytes, text, name } = await exported('Export Word Sounds results (CSV)');
    expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]);
    const lines = text.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines[lines.length - 1]).toBe('');
    for (const line of lines.slice(0, -1)) expect(line).toMatch(/^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/);
    expect(text.includes('"Lee, ""Sam"""')).toBe(true);
    expect(text.includes('"\'=HYPERLINK(""http://x.test"",""y"")"')).toBe(true);
    expect(text.includes('"\'@Quiet Heron"')).toBe(true);
    expect(text.includes('"83"')).toBe(true);
    expect(name).toBe('word_sounds_results_' + localStamp() + '.csv');
    expect(blobs[0].type).toBe('text/csv;charset=utf-8');
  });

  it('revokes the download URL after a delay, not at once', async () => {
    await studentData(CLASS());
    await exported('Export Word Sounds results (CSV)');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await new Promise((done) => setTimeout(done, 1600));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:lane-d-1');
  });

  it('leaves out students with no Word Sounds results and says how many', async () => {
    const addToast = await studentData(CLASS());
    await exported('Export Word Sounds results (CSV)');
    expect(addToast).toHaveBeenLastCalledWith('Word Sounds results exported. Students included: 4. Students left out because they have no Word Sounds results: 2.', 'success');
  });

  it('downloads nothing and warns when no student has results by sound', async () => {
    const addToast = await studentData([student('s5', 'No Data Owl', null), student('s6', 'Empty Mastery', { phonemeMastery: {} })]);
    await press(buttonWithText(document.body, 'Export Word Sounds results (CSV)'));
    expect(blobs.length).toBe(0);
    expect(addToast).toHaveBeenLastCalledWith('No imported student has Word Sounds results by sound yet.', 'warning');
  });
});

describe('Word Sounds summary by sound (CSV)', () => {
  it('counts students practicing and mastered, and averages their accuracy, per sound', async () => {
    await studentData(CLASS());
    const { rows, name, bytes } = await exported('Word Sounds summary by sound (CSV)');
    expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]);
    expect(name).toBe('word_sounds_summary_' + localStamp() + '.csv');
    expect(rows).toEqual([
      ['Sound', 'Students practicing', 'Mean accuracy %', 'Students mastered'],
      // a: Falcon 100, Heron 50.  k: Falcon 83, =HYPERLINK 33, Lee 90 -> 68.67.  sh: Falcon 33.
      ['a', '2', '75', '0'],
      ['k', '3', '69', '2'],
      ['sh', '1', '33', '0'],
    ]);
  });
});

describe('the export buttons', () => {
  it('are real, labelled buttons next to the other class exports', async () => {
    await studentData(CLASS());
    const classExport = buttonWithText(document.body, 'class_analytics.export_csv');
    for (const label of ['Export Word Sounds results (CSV)', 'Word Sounds summary by sound (CSV)']) {
      const button = buttonWithText(document.body, label);
      expect(button.getAttribute('type')).toBe('button');
      expect(button.className).toContain('min-h-11');
      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.parentElement).toBe(classExport.parentElement);
    }
  });

  it('are not offered in family mode', async () => {
    await studentData(CLASS(), vi.fn(), { isParentMode: true });
    expect(buttonWithText(document.body, 'class_analytics.export_csv'), 'the class toolbar rendered').toBeTruthy();
    expect(document.body.querySelector('[data-ws-results-export]')).toBeNull();
  });

  it('registers every new dashboard key in ui_strings.js', () => {
    const src = readFileSync(DIR + '/student_analytics_module.js', 'utf8');
    const section = JSON.parse(readFileSync(DIR + '/ui_strings.js', 'utf8')).class_analytics || {};
    const keys = Object.fromEntries(Object.entries(section).map(([k, v]) => ['class_analytics.' + k, v]));
    const used = [...new Set(src.match(/class_analytics\.ws_[a-z_]+/g))];
    expect(used.length).toBe(5);
    for (const k of used) expect(typeof keys[k], k).toBe('string');
  });
});
