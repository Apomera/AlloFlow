// Behavior Lens: the student roster, restoring a workspace file, and cloud conflicts.
//
// WHY: until 2026-09-24
// - "Switching" to the student already open (Caseload "View", Compare "Switch", loading
//   the demo twice) reset or reverted the whole workspace and then SAVED that, locally
//   and to the cloud: the name did not change, so nothing reloaded.
// - Quick switch "Clear" emptied the roster: the open student stopped saving (no roster
//   id), and every student's saved work was unreachable, because adding the same name
//   again minted a new id.
// - "Load workspace from file" replaced the saved workspace without asking, so
//   restoring last week's backup erased this week's entries.
// - A profile CSV with only names and grades erased accommodations and staff notes.
// - A cloud conflict for one student showed, and acted, on whichever student was open.
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host;
const src = readFileSync('behavior_lens_module.js', 'utf8');
const tick = async (ms = 350) => React.act(async () => { await new Promise(r => setTimeout(r, ms)); });
const anyButton = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text);
const click = async el => { expect(el).toBeTruthy(); await React.act(async () => el.click()); };
const workspace = id => JSON.parse(localStorage.getItem('behaviorLens_workspace_' + id) || 'null');
const roster = () => JSON.parse(localStorage.getItem('bl_student_roster') || '[]');
const entry = (id, day) => ({ id, antecedent: 'Math', behavior: 'Yelling', consequence: 'Break', intensity: 2, occurredAt: `2026-09-${day}T14:00:00.000Z`, timestamp: `2026-09-${day}T14:00:00.000Z`, localDate: `2026-09-${day}` });
function seed(id, name, abcEntries) {
  localStorage.setItem('behaviorLens_workspace_' + id, JSON.stringify({ student: name, studentId: id, abcEntries, observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }));
}
async function mount(studentNickname = 'Student A') {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname, isCanvasEnv: true, isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }] }))));
  await tick();
}
async function unmount() { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; document.body.innerHTML = ''; }
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase;
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'rs-a', name: 'Student A' }, { id: 'rs-b', name: 'Student B' }]));
});
afterEach(unmount);

describe('switching students', () => {
  it('"switching" to the open student keeps their work', async () => {
    seed('rs-a', 'Student A', [entry('a1', 18), entry('a2', 19), entry('a3', 20)]);
    await mount();
    expect(workspace('rs-a').abcEntries).toHaveLength(3);
    await click(anyButton('All tools'));
    await click(anyButton('Open Caseload Dashboard'));
    await tick();
    await click(document.querySelector('[aria-label="View Student A"]'));
    await tick(2600);
    expect(workspace('rs-a').abcEntries).toHaveLength(3);                     // it saved an empty workspace
  });
});

describe('quick switch', () => {
  it('Clear asks, keeps the open student, and their work keeps saving', async () => {
    seed('rs-a', 'Student A', [entry('a1', 18)]);
    await mount();
    await click(anyButton('All tools'));                                     // quick switch is on the hub
    await click(anyButton('Clear'));
    expect(anyButton('Remove')).toBeTruthy();                                    // the question
    await click(anyButton('Remove'));
    await tick();
    expect(roster().map(r => r.id)).toEqual(['rs-a']);                          // it was []
  });
  it('adding a removed student again finds their saved work', async () => {
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'rs-a', name: 'Student A' }]));   // B was removed
    seed('rs-b', 'Student B', [entry('b1', 18), entry('b2', 19)]);
    await mount('Student B');
    await tick();
    expect(roster().find(r => r.name === 'Student B').id).toBe('rs-b');        // a new id left the work unreachable
    expect(workspace('rs-b').abcEntries).toHaveLength(2);
  });
  it('the id is only reused when it is unambiguous', () => {
    const { blReusableWorkspaceId } = window.AlloModules.BehaviorLensRosterHelpers;
    seed('rs-b', 'Student B', []);
    expect(blReusableWorkspaceId('Student B', [])).toBe('rs-b');
    expect(blReusableWorkspaceId('Student B', [{ id: 'rs-b', name: 'Other' }])).toBe(null);   // already in use
    seed('rs-b2', 'Student B', []);
    expect(blReusableWorkspaceId('Student B', [])).toBe(null);                  // two candidates
    localStorage.setItem('behaviorLens_workspace_tabdraft_rs-c', JSON.stringify({ student: 'Student C' }));
    expect(blReusableWorkspaceId('Student C', [])).toBe(null);                  // drafts are not workspaces
  });
});

describe('a save that fails', () => {
  it('keeps the unsaved changes when you switch away and back', async () => {
    seed('rs-a', 'Student A', [entry('a1', 18)]);
    const realSet = Storage.prototype.setItem;
    let full = true;
    Storage.prototype.setItem = function (key, value) {
      if (full && key === 'behaviorLens_workspace_rs-a') { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; }
      return realSet.call(this, key, value);
    };
    try {
      await mount();
      await click(anyButton('Define a target'));
      const label = host.querySelector('#bl-definition-label');
      await React.act(async () => Simulate.change(label, { target: { value: 'Unsaved label' } }));
      await tick(900);                                                          // the save fails
      expect(workspace('rs-a').toolState).toBeUndefined();
      const pick = async name => { const sel = host.querySelector('#bl-today-student'); await React.act(async () => Simulate.change(sel, { target: { value: name } })); await tick(900); };
      await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
      expect(host.textContent).toContain('Local workspace backup needs attention.');
      await pick('Student B');
      // Student B saves fine, but Student A's changes still are not saved: the warning stays.
      expect(host.textContent).toContain('Local workspace backup needs attention.');
      await pick('Student A');
      full = false;                                                             // storage freed
      await click(anyButton('Continue definition') || anyButton('Define a target'));
      await tick(900);
      expect(host.querySelector('#bl-definition-label').value).toBe('Unsaved label');
      const saved = workspace('rs-a');
      expect(saved.toolState && saved.toolState.operationalDefinitionDraft && saved.toolState.operationalDefinitionDraft.label).toBe('Unsaved label');
    } finally { Storage.prototype.setItem = realSet; }
  });
});

describe('two tabs', () => {
  const withC = [{ id: 'rs-a', name: 'Student A' }, { id: 'rs-b', name: 'Student B' }, { id: 'rs-c', name: 'Student C' }];
  const pickStudent = async name => { const sel = host.querySelector('#bl-today-student'); await React.act(async () => Simulate.change(sel, { target: { value: name } })); await tick(600); };
  it('a student added in another tab survives this tab saving the roster', async () => {
    await mount();
    localStorage.setItem('bl_student_roster', JSON.stringify(withC));                  // the other tab adds C
    await pickStudent('Student B');                                                    // this tab rewrites the roster
    expect(roster().map(r => r.id)).toContain('rs-c');                                // it was dropped
  });
  it('a change announced by another tab shows up here', async () => {
    await mount();
    localStorage.setItem('bl_student_roster', JSON.stringify(withC));
    await React.act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'bl_student_roster' })); });
    await click(anyButton('All tools'));
    expect(document.querySelector('[aria-label="Switch to student Student C"]')).toBeTruthy();
  });
  it('a student removed here is not brought back by the other tab', async () => {
    await mount();
    await click(anyButton('All tools'));
    await click(document.querySelector('[aria-label="Remove student Student B from quick switch"]'));
    await tick();
    localStorage.setItem('bl_student_roster', JSON.stringify(withC));                  // the other tab still has B
    await React.act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'bl_student_roster' })); });
    await tick();
    expect(document.querySelector('[aria-label="Switch to student Student B"]')).toBe(null);
    expect(document.querySelector('[aria-label="Switch to student Student C"]')).toBeTruthy();
  });
});

describe('large saved tool data', () => {
  const rt = () => window.AlloModules.BehaviorLensWorkspace;
  it('one oversized tool is left out, not every tool', () => {
    const big = Array.from({ length: 3000 }, (_, i) => ({ id: 'h' + i, note: 'x'.repeat(800) }));   // about 2.5 MB
    const report = {};
    const kept = rt().normalizeToolState({ homeLog: big, gasGoalText: 'Stay in seat', reinforcerRatings: { Legos: 5 } }, report);
    expect(Object.keys(kept).sort()).toEqual(['gasGoalText', 'reinforcerRatings']);   // it returned {}
    expect(report.dropped).toEqual(['homeLog']);
  });
  it('long lists and long texts are kept whole', () => {
    const kept = rt().normalizeToolState({ homeLog: Array.from({ length: 1500 }, (_, i) => ({ id: i })), bipDraft: 'y'.repeat(30000) });
    expect(kept.homeLog).toHaveLength(1500);                                        // cut to 1,000
    expect(kept.bipDraft).toHaveLength(30000);                                      // cut to 20,000
  });
  it('the app says which tool was left out', async () => {
    const toasts = [];
    const big = Array.from({ length: 3000 }, (_, i) => ({ id: 'h' + i, note: 'x'.repeat(800) }));
    localStorage.setItem('behaviorLens_workspace_rs-a', JSON.stringify({ student: 'Student A', studentId: 'rs-a', abcEntries: [], observationSessions: [], toolState: { homeLog: big, gasGoalText: 'Stay in seat' }, savedAt: '2026-09-20T12:00:00.000Z' }));
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, addToast: (m, k) => toasts.push([m, k]), dashboardData: [{ studentNickname: 'Student A' }] }))));
    await tick();
    expect(toasts.some(([m, k]) => k === 'warning' && /too large to load and was left out: homeLog\./.test(m))).toBe(true);
  });
});

describe('opening a student in a second tab', () => {
  async function mountWithToasts(toasts) {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, addToast: (m, k) => toasts.push([m, k]), dashboardData: [{ studentNickname: 'Student A' }] }))));
    await tick(900);
  }
  const otherTabWrites = async (workspaceChange) => {
    const stored = workspace('rs-a');
    const other = Object.assign({}, stored, { snapshotId: 'other-tab:1', savedAt: new Date().toISOString() }, workspaceChange);
    await React.act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'behaviorLens_workspace_rs-a', newValue: JSON.stringify(other) })); });
    await tick();
  };
  const conflictToast = toasts => toasts.some(([m]) => /Another tab changed this student/.test(m));
  it('a re-save of the same data is not a conflict', async () => {
    seed('rs-a', 'Student A', [entry('a1', 18)]);
    const toasts = [];
    await mountWithToasts(toasts);
    await otherTabWrites({});
    expect(conflictToast(toasts)).toBe(false);                                    // it reported a conflict
  });
  it('a real change in the other tab still is', async () => {
    seed('rs-a', 'Student A', [entry('a1', 18)]);
    const toasts = [];
    await mountWithToasts(toasts);
    await otherTabWrites({ abcEntries: [entry('a1', 18), entry('a2', 19)] });
    expect(conflictToast(toasts)).toBe(true);
  });
});

describe('restoring a workspace file', () => {
  async function load(file) {
    const input = host.querySelector('input[type="file"][aria-label="Load BehaviorLens workspace JSON file"]');
    await React.act(async () => Simulate.change(input, { target: { files: [file], value: '' } }));
    await tick(200);
  }
  it('asks before replacing newer saved work, and a no keeps it', async () => {
    seed('rs-a', 'Student A', [entry('a1', 18), entry('a2', 19), entry('a3', 20)]);
    await mount();
    const backup = new File([JSON.stringify({ version: 2, student: 'Student A', abcEntries: [entry('old', 10)], observationSessions: [], savedAt: '2026-09-11T12:00:00.000Z' })], 'backup.json', { type: 'application/json' });
    await load(backup);
    const dialogText = document.body.textContent;
    expect(dialogText).toContain('The file has 1 ABC entries (saved 2026-09-11); this device has 3');
    await click(anyButton('Cancel'));
    await tick();
    expect(workspace('rs-a').abcEntries).toHaveLength(3);
    await load(backup);
    await click(anyButton('Replace'));
    await tick();
    expect(workspace('rs-a').abcEntries.map(e => e.id)).toEqual(['old']);
  });

  // Pass 9: a report export and a BCBA share file passed as a workspace, so loading one replaced
  // the backup with its entries alone (targets, notes, plans and tool data went with it).
  async function mountWithToasts(toasts) {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, addToast: (m, k) => toasts.push([m, k]), dashboardData: [{ studentNickname: 'Student A' }] }))));
    await tick(900);
  }
  const target = { id: 'yell', label: 'Yelling', measurement: 'count', operationalDefinition: 'Shouts above classroom voice.' };
  function seedFull() {
    localStorage.setItem('behaviorLens_workspace_rs-a', JSON.stringify({ version: 2, student: 'Student A', studentId: 'rs-a', abcEntries: [entry('a1', 18), entry('a2', 19)], observationSessions: [], targetBehaviors: [target], sessionNotes: [{ id: 'n1', text: 'Parent meeting notes', timestamp: '2026-09-19T15:00:00.000Z' }], savedAt: '2026-09-20T12:00:00.000Z' }));
  }
  const fileOf = data => new File([JSON.stringify(data)], 'file.json', { type: 'application/json' });
  const reportExport = (student, entries) => fileOf({ student, exportDate: '2026-09-21T10:00:00.000Z', abcEntries: entries, observationSessions: [], aiAnalysis: null });
  it('a report export adds its new records to the saved work instead of replacing it', async () => {
    seedFull();
    const toasts = [];
    await mountWithToasts(toasts);
    await load(reportExport('Student A', [entry('a1', 18), entry('x1', 21)]));   // one already here, one new
    expect(document.body.textContent).toContain('This file is a report export, not a backup');
    expect(document.body.textContent).toContain('Add its 1 new ABC entries and 0 new observation sessions? 1 records already here will be skipped.');
    await click(anyButton('Add records'));
    await tick();
    const saved = workspace('rs-a');
    expect(saved.abcEntries).toHaveLength(3);                                      // was 2: replaced by the file
    expect(saved.targetBehaviors.map(t => t.id)).toEqual(['yell']);                // was gone
    expect(saved.sessionNotes).toHaveLength(1);                                    // was gone
    expect(toasts.some(([m, k]) => k === 'success' && /Added 1 ABC entries and 0 observation sessions from the report export/.test(m))).toBe(true);
  });
  it('an export with nothing new says so and changes nothing', async () => {
    seedFull();
    const toasts = [];
    await mountWithToasts(toasts);
    await load(reportExport('Student A', [entry('a2', 19)]));
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(toasts.some(([m]) => /Nothing added: every record in this report export is already in the saved work for Student A/.test(m))).toBe(true);
    expect(workspace('rs-a').abcEntries).toHaveLength(2);
  });
  it('a share file for another student with saved work is refused', async () => {
    seedFull();
    localStorage.setItem('behaviorLens_workspace_rs-b', JSON.stringify({ version: 2, student: 'Student B', studentId: 'rs-b', abcEntries: [entry('b1', 18)], observationSessions: [], savedAt: '2026-09-20T12:00:00.000Z' }));
    const toasts = [];
    await mountWithToasts(toasts);
    await load(fileOf({ student: 'Student B', generatedAt: '2026-09-21T10:00:00.000Z', role: 'bcba', profile: {}, abcEntries: [entry('b9', 21)], observationSessions: [], sessionHistory: [] }));
    expect(toasts.some(([m, k]) => k === 'error' && /this share file is for Student B and is not a backup. Open Student B first/.test(m))).toBe(true);
    expect(workspace('rs-b').abcEntries.map(e => e.id)).toEqual(['b1']);
    expect(workspace('rs-a').abcEntries).toHaveLength(2);
  });
  it('a snapshot file points to Snapshot Exchange', async () => {
    seedFull();
    const toasts = [];
    await mountWithToasts(toasts);
    await load(fileOf({ alloflowSnapshot: true, version: '1.0', behaviorLens: { abcEntries: [entry('s1', 21)] } }));
    expect(toasts.some(([m, k]) => k === 'error' && /snapshot file. Open Snapshot Exchange/.test(m))).toBe(true);   // was "No recognized BehaviorLens workspace data"
  });
  it('an export for a student with nothing saved still opens, and says what it lacks', async () => {
    const toasts = [];
    await mountWithToasts(toasts);
    await load(reportExport('Student C', [entry('c1', 21)]));
    await tick();
    expect(toasts.some(([m, k]) => k === 'warning' && /Loaded from a report export: it has entries and sessions only/.test(m))).toBe(true);
  });
});

describe('profile CSV import', () => {
  it('blank cells keep what was saved, and notes are added to', () => {
    const { mergeImportedProfile } = window.AlloModules.BehaviorLensRosterHelpers;
    const saved = { grade: '4', accommodations: 'Visual schedule', notes: 'Staff note: prefers morning check-ins' };
    expect(mergeImportedProfile(saved, { name: 'Student A', grade: '5' })).toEqual({ grade: '5', diagnosis: '', accommodations: 'Visual schedule', notes: 'Staff note: prefers morning check-ins' });
    expect(mergeImportedProfile(saved, { notes: 'Moved seats' }).notes).toBe('Staff note: prefers morning check-ins\nMoved seats');
    expect(mergeImportedProfile({}, { grade: '3', notes: 'New' }).notes).toBe('Grade: 3\nNew');
    expect(src).toContain('...mergeImportedProfile(previous.studentProfile, row)');
  });
});

describe('cloud conflicts belong to one student', () => {
  it('the banner and both choices check the student', () => {
    expect(src).toContain("cloudSync.cloudConflict && cloudSync.cloudConflict.studentId === (activeStudentId || selectedStudent) && h('div', { role: 'alert'");
    expect(src).toContain("cloudSync.cloudConflict && cloudSync.cloudConflict.studentId !== (activeStudentId || selectedStudent) && h('div', { role: 'status', 'data-bl-other-conflict': true");
    expect((src.match(/if \(cloudSync\.cloudConflict && cloudSync\.cloudConflict\.studentId !== \(activeStudentId \|\| selectedStudent\)\) return;/g) || []).length).toBe(2);
    expect(src).toContain("{ title: 'Use cloud copy', confirmText: 'Use cloud copy' }");
  });
});
