import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
let root, host;
const workspaceKey = 'behaviorLens_workspace_studenta001', practiceKey = 'behaviorLens_workspace_behavior-lens-practice';
const record = { id: 'real-entry', timestamp: '2026-09-12T10:00:00.000Z', antecedent: 'Real antecedent', behavior: 'Real behavior', consequence: 'Real consequence', intensity: 2 };
const tick = async (ms = 10) => React.act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const click = async el => { expect(el).toBeTruthy(); await React.act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await tick(); };
const button = name => Array.from(host.querySelectorAll('button')).find(el => el.textContent.includes(name));
const stored = key => JSON.parse(localStorage.getItem(key || workspaceKey));
async function mount(props = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }], ...props }))));
  await tick(350);
}
async function unmount() { if (root) await React.act(async () => root.unmount()); if (host) host.remove(); root = null; host = null; }
async function loadPractice() {
  const card = host.querySelector('[aria-labelledby="bl-tool-sandbox-title"]');
  await click(card && Array.from(card.querySelectorAll('button')).find(el => !el.hasAttribute('aria-pressed')));
  await click(Array.from(host.querySelectorAll('[role="button"]')).find(el => el.querySelector('h4')));
  await click(host.querySelector('button[aria-label="Load This Scenario"]')); await tick(350);
}
async function importWorkspace(data) {
  const input = host.querySelector('input[aria-label="Load BehaviorLens workspace JSON file"]');
  Object.defineProperty(input, 'files', { value: [new File([JSON.stringify(data)], 'workspace.json')], configurable: true });
  await React.act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 20)); });
  await tick(350);
}
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  delete window.__alloFirebase; localStorage.clear(); localStorage.setItem('bl_onboarded', '1');
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'studenta001', name: 'Student A' }]));
  localStorage.setItem(workspaceKey, JSON.stringify({ version: 4, student: 'Student A', abcEntries: [record], observationSessions: [] }));
});
afterEach(async () => { await unmount(); delete window.__alloFirebase; });
describe('Behavior Lens safe workspace selection', () => {
  it('isolates practice, restores its simulation flag on reopen, and returns to intact real data on clear', async () => {
    await mount(); await loadPractice();
    expect(stored().abcEntries.map(e => e.id)).toEqual(['real-entry']);
    const practice = stored(practiceKey);
    expect(practice).toMatchObject({ isPracticeMode: true, practiceReturnStudent: 'Student A', studentId: 'behavior-lens-practice' });
    expect(practice.abcEntries.length).toBeGreaterThan(1);
    await unmount(); await mount({ studentNickname: practice.student });
    expect(host.querySelector('button[aria-label="Clear Practice Data"]')).toBeTruthy();
    expect(stored(practiceKey).abcEntries.map(e => e.id)).toEqual(practice.abcEntries.map(e => e.id));
    await click(host.querySelector('button[aria-label="Clear Practice Data"]')); await tick(350);
    expect(stored().abcEntries.map(e => e.id)).toEqual(['real-entry']);
    expect(stored(practiceKey)).toBeNull();
    expect(host.querySelector('select[aria-label="Choose a student"]').value).toBe('Student A');
  });
  it('preserves a new student import through final identity hydration and reopen', async () => {
    await mount();
    await importWorkspace({ version: 4, student: 'Student New', studentId: 'imported-student-id', abcEntries: [{ ...record, id: 'imported-entry' }], observationSessions: [] });
    expect(stored('behaviorLens_workspace_imported-student-id').abcEntries.map(e => e.id)).toEqual(['imported-entry']);
    expect(stored().abcEntries.map(e => e.id)).toEqual(['real-entry']);
    await unmount(); await mount({ studentNickname: 'Student New' });
    expect(stored('behaviorLens_workspace_imported-student-id').abcEntries.map(e => e.id)).toEqual(['imported-entry']);
  });
  it('routes an imported simulation away from its named real student', async () => {
    await mount();
    await importWorkspace({ version: 4, student: 'Student A', studentId: 'studenta001', isPracticeMode: true, practiceScenarioName: 'Imported scenario', abcEntries: [{ ...record, id: 'simulated-entry' }], observationSessions: [] });
    expect(stored().abcEntries.map(e => e.id)).toEqual(['real-entry']);
    expect(stored(practiceKey)).toMatchObject({ studentId: 'behavior-lens-practice', isPracticeMode: true, practiceScenarioName: 'Imported scenario' });
  });
  it('retains every student when the roster grows beyond twenty', async () => {
    const roster = Array.from({ length: 20 }, (_, i) => ({ id: 'student-' + i, name: 'Student ' + i }));
    localStorage.setItem('bl_student_roster', JSON.stringify(roster)); await mount();
    const saved = JSON.parse(localStorage.getItem('bl_student_roster'));
    expect(saved).toHaveLength(21);
    expect(saved.map(e => e.id)).toEqual(expect.arrayContaining(roster.map(e => e.id)));
  });

  it('imports quoted multiline ABC notes and preserves unknown intensity while rejecting invalid timestamps', async () => {
    await mount();
    await click(button('Open Batch Import'));
    const fileInput = host.querySelector('input[accept=".csv,.txt"]');
    const csv = 'timestamp,antecedent,behavior,consequence,intensity,notes\n2026-09-12T10:00:00Z,Transition,Calling,Prompt,,"Said ""hello""\nand waited"\nnot-a-date,Transition,Calling,Prompt,5,Invalid date';
    Object.defineProperty(fileInput, 'files', { value: [new File([csv], 'abc.csv')], configurable: true });
    await React.act(async () => { fileInput.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 20)); });
    await click(button('Import 1 Valid Rows')); await tick(350);
    const imported = stored().abcEntries.find(entry => entry.source === 'csv-import');
    expect(imported).toMatchObject({ intensity: null, notes: 'Said "hello"\nand waited' });
    expect(stored().abcEntries).toHaveLength(2);
  });
  it('writes imported CSV profile fields to separate durable student workspaces', async () => {
    await mount();
    await click(button('Open Batch Import'));
    await click(button('Student Profiles'));
    const fileInput = host.querySelector('input[accept=".csv,.txt"]');
    const csv = 'name,grade,diagnosis,accommodations,notes\nCSV One,3rd,ADHD,Visual timer,First note\nCSV Two,4th,,Quiet area,Second note';
    Object.defineProperty(fileInput, 'files', { value: [new File([csv], 'profiles.csv')], configurable: true });
    await React.act(async () => { fileInput.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 20)); });
    await click(button('Import 2 Valid Rows')); await tick(350);
    const roster = JSON.parse(localStorage.getItem('bl_student_roster'));
    const one = roster.find(item => item.name === 'CSV One'), two = roster.find(item => item.name === 'CSV Two');
    expect(one.id).not.toBe(two.id);
    expect(stored('behaviorLens_workspace_' + one.id).studentProfile).toMatchObject({ grade: '3rd', diagnosis: 'ADHD', accommodations: 'Visual timer' });
    expect(stored('behaviorLens_workspace_' + one.id).studentProfile.notes).toContain('First note');
    expect(stored('behaviorLens_workspace_' + two.id).studentProfile.notes).toContain('Second note');
    expect(stored().abcEntries.map(entry => entry.id)).toEqual(['real-entry']);
  });

  it('ignores a cloud-copy response after switching students', async () => {
    let resolveChoice, reads = 0;
    const chosen = new Promise(resolve => { resolveChoice = resolve; });
    const remoteA = { student: 'Student A', revision: 2, abcEntries: [{ ...record, id: 'cloud-a' }], observationSessions: [] };
    const remoteB = { student: 'Student B', revision: 1, abcEntries: [{ ...record, id: 'cloud-b' }], observationSessions: [] };
    const snap = data => ({ exists: () => !!data, data: () => data });
    window.__alloFirebase = {
      onAuthStateChanged: (_auth, fn) => { fn({ uid: 'review-user' }); return () => {}; }, signInAnonymously: vi.fn(),
      doc: (_db, ...parts) => ({ path: parts.join('/') }),
      getDoc: vi.fn(async ref => ref.path.endsWith('/studenta001') ? (++reads === 1 ? snap(remoteA) : chosen) : snap(ref.path.endsWith('/studentb002') ? remoteB : null)),
      runTransaction: vi.fn(async (_db, fn) => fn({ get: async ref => snap(ref.path.endsWith('/studentb002') ? remoteB : remoteA), set: () => {} }))
    };
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'studenta001', name: 'Student A' }, { id: 'studentb002', name: 'Student B' }]));
    localStorage.setItem(workspaceKey, JSON.stringify({ student: 'Student A', revision: 1, abcEntries: [record], observationSessions: [] }));
    localStorage.setItem('behaviorLens_workspace_dirty_studenta001', JSON.stringify({ pending: true, revision: 1 }));
    await mount({ isCanvasEnv: false, firestore: {}, firebaseAuth: {} });
    await click(button('Use cloud copy'));
    const picker = host.querySelector('select[aria-label="Choose a student"]');
    await React.act(async () => { picker.value = 'Student B'; picker.dispatchEvent(new Event('change', { bubbles: true })); }); await tick(350);
    resolveChoice(snap(remoteA)); await tick(350);
    expect(picker.value).toBe('Student B');
    expect(stored('behaviorLens_workspace_studentb002').abcEntries.map(e => e.id)).toEqual(['cloud-b']);
  });
});
