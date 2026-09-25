// Behavior Lens imports in the mounted app: Batch Import and the comparison loader.
//
// WHY: until 2026-09-24
// - Batch Import ignored a student column, so a class sheet went entirely into the open student.
// - It had no duplicate check: importing a file twice doubled every entry.
// - It read dates with new Date() (a date-only value landed on the day before west of UTC) and
//   showed the UTC string in its preview; Behavior Lens's own CSV exports did not import back;
//   and a Windows spreadsheet CSV turned accented letters into replacement characters.
// - The comparison loader dropped a newer backup of a student already shown (while saying
//   "Loaded"), took two files for one student, and counted file rows differently from live ones.
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
let root, host, toasts;
const workspaceKey = 'behaviorLens_workspace_studenta001';
const at = (d, hh, mm = 0) => new Date(2026, 8, d, hh, mm).toISOString();
const existing = { id: 'real-entry', occurredAt: at(8, 10), timestamp: at(8, 10), antecedent: 'Math task', behavior: 'Yelled', consequence: 'Break', intensity: 2 };
const tick = async (ms = 10) => React.act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const click = async el => { expect(el).toBeTruthy(); await React.act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await tick(); };
const button = name => Array.from(host.querySelectorAll('button')).find(el => el.textContent.includes(name));
const stored = () => JSON.parse(localStorage.getItem(workspaceKey));
async function mount() {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, addToast: (m, k) => toasts.push([m, k]), dashboardData: [{ studentNickname: 'Student A' }] }))));
  await tick(350);
}
async function unmount() { if (root) await React.act(async () => root.unmount()); if (host) host.remove(); root = null; host = null; }
async function chooseFile(input, file) {
  Object.defineProperty(input, 'files', { value: Array.isArray(file) ? file : [file], configurable: true });
  await React.act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 60)); });
  await tick(60);
}
async function openBatchImport() { await click(button('All tools')); await click(button('Open Batch Import')); }
const csvInput = () => host.querySelector('input[accept=".csv,.txt"]');
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  delete window.__alloFirebase; localStorage.clear(); toasts = [];
  localStorage.setItem('bl_onboarded', '1');
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'studenta001', name: 'Student A' }]));
  localStorage.setItem(workspaceKey, JSON.stringify({ version: 4, student: 'Student A', abcEntries: [existing], observationSessions: [] }));
});
afterEach(unmount);

describe('Batch Import', () => {
  const classSheet = [
    'Student,Timestamp,Antecedent,Behavior,Consequence,Intensity,Notes',
    'Student A,2026-09-10,Transition,Left seat,Redirect,2,date only',
    'Alex,2026-09-10 10:00,Math task,Cried,Break,3,another student',
    'Student A,9/11/2026 1:15 PM,Math task,Yelled,Break,,afternoon',
    'Student A,2026-09-08 10:00,Math task,Yelled,Break,2,already here'
  ].join('\n');
  it('imports only the open student\'s rows, skips what is already here, and reads dates here', async () => {
    await mount(); await openBatchImport();
    await chooseFile(csvInput(), new File([classSheet], 'class.csv'));
    expect(host.querySelector('[data-bl-import-skipped]').textContent).toContain('Alex: 1');
    expect(host.querySelector('[data-bl-import-skipped]').textContent).toContain('1 row is already');
    expect([...host.querySelectorAll('[data-bl-import-row]')].map(el => el.getAttribute('data-bl-import-row'))).toEqual(['ok', 'other-student', 'ok', 'duplicate']);
    expect(host.textContent).toContain('2026-09-10 (no time given)');     // the preview showed 2026-09-10T00:00:00.000Z
    await click(button('Import 2 Valid Rows')); await tick(350);        // was 4: Alex's row and a copy went in
    const entries = stored().abcEntries;
    expect(entries).toHaveLength(3);
    expect(entries.some(e => e.behavior === 'Cried')).toBe(false);
    const dateOnly = entries.find(e => e.notes === 'date only');
    expect(dateOnly.localDate).toBe('2026-09-10');                       // was the 9th west of UTC
    expect(dateOnly.metadata).toMatchObject({ timeNotStated: true });
    expect(new Date(entries.find(e => e.notes === 'afternoon').occurredAt).getHours()).toBe(13);
  });
  it('the same file again adds nothing', async () => {
    await mount(); await openBatchImport();
    await chooseFile(csvInput(), new File([classSheet], 'class.csv'));
    await click(button('Import 2 Valid Rows')); await tick(350);
    await click(button('Batch Import') || button('ABC Data'));
    await chooseFile(csvInput(), new File([classSheet], 'class.csv'));
    expect(button('Import 0 Valid Rows')).toBeTruthy();                  // was "Import 4", doubling every entry
    expect(button('Import 0 Valid Rows').disabled).toBe(true);
  });
  it('reads Behavior Lens\'s own CSV export back', async () => {
    const exported = String.fromCharCode(0xFEFF) + [
      'Timestamp,Date,Time,Antecedent,Behavior,Consequence,Function,Setting,Intensity,Duration (s),Phase,Notes',
      '"2026-09-18T13:00:00.000Z","2026-09-18","9:00 AM","Math task","Tore paper","Break","","Room 4","3","45","","\'- left room"',
      '"2026-09-18T15:00:00.000Z","2026-09-18","11:00 AM","Math task","Hummed","None","","Room 4","2.5","","",""',
      '',
      '',
      'Session Timestamp,Method,Session length (s),Result,Notes',
      '"2026-09-18T14:00:00.000Z","frequency","600","3 occurrences",""'
    ].join('\n');
    await mount(); await openBatchImport();
    await chooseFile(csvInput(), new File([exported], 'export.csv'));
    expect(host.textContent).not.toContain('column count does not match');   // the session table became errors
    expect(host.textContent).toContain('intensity must be a whole number');  // 2.5 was accepted
    await click(button('Import 1 Valid Rows')); await tick(350);
    const entry = stored().abcEntries.find(e => e.behavior === 'Tore paper');
    expect(entry.duration).toBe(45);                                     // "Duration (s)" was dropped
    expect(entry.notes).toBe('- left room');                             // kept the apostrophe
  });
  it('an error names the spreadsheet row, counting blank rows', async () => {
    const csv = 'timestamp,antecedent,behavior,consequence\n2026-09-12T10:00:00Z,Transition,Calling,Prompt\n,,,\nnot-a-date,Transition,Calling,Prompt';
    await mount(); await openBatchImport();
    await chooseFile(csvInput(), new File([csv], 'gaps.csv'));
    const errors = [...host.querySelectorAll('[role="alert"]')].map(el => el.textContent).join(' ');
    expect(errors).toContain('Row 4:');                                   // was "Row 3": the blank row was not counted
  });
  it('reads a Windows spreadsheet CSV without losing accents', async () => {
    const text = 'timestamp,antecedent,behavior,consequence,Duration (min),notes\n2026-09-12T10:00:00Z,Transition,Calling,Prompt,2,Ni' + String.fromCharCode(0xF1) + 'o llor' + String.fromCharCode(0xF3);
    const bytes = new Uint8Array([...text].map(c => c.charCodeAt(0)));   // one byte per character, as Windows-1252
    await mount(); await openBatchImport();
    await chooseFile(csvInput(), new File([bytes], 'excel.csv'));
    await click(button('Import 1 Valid Rows')); await tick(350);
    expect(stored().abcEntries.find(e => e.behavior === 'Calling').notes).toBe('Ni' + String.fromCharCode(0xF1) + 'o llor' + String.fromCharCode(0xF3));
    expect(stored().abcEntries.find(e => e.behavior === 'Calling').duration).toBe(120);   // minutes were read as seconds
  });
});

describe('comparison files', () => {
  const file = (name, count, savedAt) => new File([JSON.stringify({ version: 4, student: 'Kestrel', savedAt, abcEntries: Array.from({ length: count }, (_, i) => ({ id: name + i, antecedent: 'Math', behavior: i % 2 ? 'Yelled' : 'yelled', consequence: 'Break', intensity: 2, timestamp: at(1 + i, 9) })), observationSessions: [] })], name + '.json');
  const kestrelRow = () => [...host.querySelectorAll('button[aria-label="Switch workspace to Kestrel"]')];
  it('keeps one row per student, the newest copy, counted like a live row', async () => {
    await mount(); await click(button('All tools')); await click(button('Open Cross-Student Comparison'));
    const input = () => host.querySelector('input[aria-label="Load BehaviorLens workspaces for comparison"]');
    await chooseFile(input(), [file('older', 2, '2026-09-01T12:00:00.000Z'), file('newer', 3, '2026-09-20T12:00:00.000Z')]);
    expect(kestrelRow()).toHaveLength(1);                                 // both files went in
    expect(host.textContent).toMatch(/Kestrel\s*3/);
    await chooseFile(input(), [file('older-again', 2, '2026-09-01T12:00:00.000Z')]);
    expect(host.textContent).toMatch(/Kestrel\s*3/);
    expect(toasts.some(([m]) => /older than the copy already shown/.test(m))).toBe(true);
  });
  // It said "Switched to Kestrel" and opened Kestrel EMPTY: the switch reloaded this device's copy.
  it('switching to a student known only from a file opens the file\'s records', async () => {
    await mount(); await click(button('All tools')); await click(button('Open Cross-Student Comparison'));
    await chooseFile(host.querySelector('input[aria-label="Load BehaviorLens workspaces for comparison"]'), [file('kestrel', 3, '2026-09-20T12:00:00.000Z')]);
    await click(host.querySelector('[aria-label="Switch workspace to Kestrel"]')); await tick(350); await tick(350);
    const id = JSON.parse(localStorage.getItem('bl_student_roster')).find(r => r.name === 'Kestrel').id;
    expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_' + id)).abcEntries.map(e => e.id).sort()).toEqual(['kestrel0', 'kestrel1', 'kestrel2']);
    expect(toasts.some(([m]) => /using the loaded file/.test(m))).toBe(true);
    expect(stored().abcEntries.map(e => e.id)).toEqual(['real-entry']);   // Student A untouched
  });
  it('a student with records on this device opens that copy, and says so', async () => {
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'studenta001', name: 'Student A' }, { id: 'kes-1', name: 'Kestrel' }]));
    localStorage.setItem('behaviorLens_workspace_kes-1', JSON.stringify({ version: 4, student: 'Kestrel', studentId: 'kes-1', abcEntries: [{ id: 'mine', antecedent: 'A', behavior: 'B', consequence: 'C', timestamp: at(15, 9) }], observationSessions: [] }));
    await mount(); await click(button('All tools')); await click(button('Open Cross-Student Comparison'));
    await chooseFile(host.querySelector('input[aria-label="Load BehaviorLens workspaces for comparison"]'), [file('kestrel', 3, '2026-09-20T12:00:00.000Z')]);
    await click(host.querySelector('[aria-label="Switch workspace to Kestrel"]')); await tick(350); await tick(350);
    expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_kes-1')).abcEntries.map(e => e.id)).toEqual(['mine']);
    expect(toasts.some(([m]) => /copy saved on this device is open/.test(m))).toBe(true);
  });
});
