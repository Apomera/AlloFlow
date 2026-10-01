// Behavior Lens cloud roster: a new browser signed in to the same account.
//
// WHY: until 2026-09-24 the roster was written to the account on every change and never read.
// A new browser gave the student it opened a new id, so their cloud work was not found, and its
// first save replaced the account's whole roster with its own one-student list. A student
// removed from quick switch stayed removed only until the page closed.
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let root, host;
const tick = async () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
const click = async el => { expect(el).toBeTruthy(); await React.act(async () => el.click()); };
const roster = () => JSON.parse(localStorage.getItem('bl_student_roster') || '[]');

// A cloud that keeps each document by the last part of its path.
function installCloud(docs, gates = {}) {
  const store = JSON.parse(JSON.stringify(docs));
  const snapshot = data => ({ exists: () => data != null, data: () => (data == null ? null : JSON.parse(JSON.stringify(data))) });
  const key = ref => ref.path.split('/').pop();
  const getDoc = vi.fn(async ref => { if (gates[key(ref)]) await gates[key(ref)]; return snapshot(store[key(ref)]); });
  const runTransaction = vi.fn(async (_db, update) => {
    let write = null;
    const result = await update({ get: getDoc, set: (ref, data, options) => { write = { ref, data, options }; } });
    if (write) store[key(write.ref)] = write.options && write.options.merge ? Object.assign({}, store[key(write.ref)] || {}, write.data) : write.data;
    return result;
  });
  window.__alloFirebase = {
    onAuthStateChanged: (_auth, listener) => { listener({ uid: 'roster-test-user' }); return () => {}; },
    signInAnonymously: vi.fn(),
    doc: (_db, ...parts) => ({ path: parts.join('/') }),
    getDoc, setDoc: vi.fn(async () => {}), runTransaction
  };
  return { store, getDoc };
}
const CLOUD = {
  __roster__: { roster: [{ id: 'cloud-a', name: 'Student A', lastAccessed: '2026-09-20T12:00:00.000Z' }, { id: 'cloud-b', name: 'Student B', lastAccessed: '2026-09-19T12:00:00.000Z' }], revision: 4 },
  'cloud-a': { student: 'Student A', studentId: 'cloud-a', revision: 2, savedAt: '2026-09-20T12:00:00.000Z',
    abcEntries: [{ id: 'c1', antecedent: 'Math task', behavior: 'CLOUD ENTRY behavior', consequence: 'Break', intensity: 2, occurredAt: '2026-09-18T13:00:00.000Z', timestamp: '2026-09-18T13:00:00.000Z' }],
    observationSessions: [] }
};
async function mount(studentNickname = 'Student A') {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({
    studentNickname, isTeacherMode: true, isCanvasEnv: false, firestore: { name: 'test-firestore' }, firebaseAuth: { name: 'test-auth' }, appId: 'bl-roster-test',
    dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }]
  }))));
  await tick(); await tick();
}
async function unmount() { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; document.body.innerHTML = ''; }
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase; });
afterEach(async () => { await unmount(); delete window.__alloFirebase; });

describe('the roster save', () => {
  it('merges with the account roster instead of replacing it', async () => {
    const R = window.AlloModules.BehaviorLensWorkspace;
    let written = null;
    const result = await R.commitCloudWorkspace({
      docRef: { path: 'x/__roster__' }, userId: 'u', isRoster: true, expectedRevision: 0,
      data: { roster: [{ id: 'c', name: 'Student C' }, { id: 'a', name: 'Student A', lastAccessed: 'here' }] },
      runTransaction: async (_db, update) => update({ get: async () => ({ exists: () => true, data: () => ({ roster: [{ id: 'a', name: 'Student A', lastAccessed: 'there' }, { id: 'b', name: 'Student B' }], revision: 7 }) }), set: (_ref, data) => { written = data; } })
    });
    expect(result.ok).toBe(true);
    expect(written.roster.map(r => r.id)).toEqual(['c', 'a', 'b']);         // was ['c', 'a']: Student B lost
    expect(written.roster.find(r => r.id === 'a').lastAccessed).toBe('here');
  });
});

describe('a new browser signed in to the same account', () => {
  it('finds the student under the id their cloud work was saved with', async () => {
    const cloud = installCloud(CLOUD);
    await mount('Student A');
    expect(roster().find(r => r.name === 'Student A').id).toBe('cloud-a');   // was a new id
    expect(cloud.getDoc.mock.calls.some(([ref]) => ref.path.endsWith('/cloud-a'))).toBe(true);
    await tick();
    expect(JSON.stringify(JSON.parse(localStorage.getItem('behaviorLens_workspace_cloud-a') || '{}').abcEntries || [])).toContain('CLOUD ENTRY behavior');
  });
  it('shows the account\'s other students, and its saves keep them', async () => {
    const cloud = installCloud(CLOUD);
    await mount('Student A');
    expect(roster().map(r => r.id)).toEqual(expect.arrayContaining(['cloud-a', 'cloud-b']));
    await tick();
    expect(cloud.store.__roster__.roster.map(r => r.id)).toEqual(expect.arrayContaining(['cloud-a', 'cloud-b']));
  });
  it('a student removed from quick switch stays removed here after the page closes', async () => {
    installCloud(CLOUD);
    await mount('Student A');
    await React.act(async () => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'All tools').click());
    await click(host.querySelector('[aria-label="Remove student Student B from quick switch"]')); await tick();
    expect(roster().map(r => r.id)).not.toContain('cloud-b');
    await unmount();
    installCloud(CLOUD);                                                      // still in the account roster
    await mount('Student A');
    expect(roster().map(r => r.id)).not.toContain('cloud-b');
  });
  it('opening a removed student by name again finds the same saved work', async () => {
    const cloud = installCloud(CLOUD);
    await mount('Student A');
    await React.act(async () => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'All tools').click());
    await click(host.querySelector('[aria-label="Remove student Student B from quick switch"]')); await tick();
    await React.act(async () => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'Today').click());
    const picker = host.querySelector('#bl-today-student');
    await React.act(async () => { picker.value = 'Student B'; picker.dispatchEvent(new Event('change', { bubbles: true })); });
    await tick(); await tick();
    expect(roster().find(r => r.name === 'Student B').id).toBe('cloud-b');   // was a new id: the work under cloud-b was lost to this device
    expect(cloud.getDoc.mock.calls.some(([ref]) => ref.path.endsWith('/cloud-b'))).toBe(true);
    expect(JSON.parse(localStorage.getItem('bl_roster_removed')).map(e => e.id)).not.toContain('cloud-b');
  });
});

describe('reading the roster in the background', () => {
  it('leaves the open student\'s cloud conflict and its banner alone', async () => {
    // Unsynced work in this browser (revision 1) and a newer cloud copy (revision 2).
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'cloud-a', name: 'Student A' }]));
    localStorage.setItem('behaviorLens_workspace_cloud-a', JSON.stringify(Object.assign({}, CLOUD['cloud-a'], { revision: 1, savedAt: '2026-09-20T12:30:00.000Z' })));
    localStorage.setItem('behaviorLens_workspace_dirty_cloud-a', JSON.stringify({ pending: true, revision: 1, savedAt: '2026-09-20T12:30:00.000Z' }));
    let release;
    installCloud(Object.assign({}, CLOUD, { 'cloud-a': Object.assign({}, CLOUD['cloud-a'], { revision: 2, updatedAt: '2026-09-20T13:00:00.000Z' }) }), { __roster__: new Promise(r => { release = r; }) });
    await mount('Student A');
    const banner = () => [...host.querySelectorAll('[role="alert"]')].some(el => el.textContent.includes('Unsynced local work and the cloud copy differ.'));
    expect(banner()).toBe(true);
    const status = () => [...host.querySelectorAll('[role="status"]')].some(el => el.textContent.trim() === 'Conflict');
    expect(status()).toBe(true);
    await React.act(async () => { release(); }); await tick();
    expect(banner()).toBe(true);                                              // a roster read cleared it
    expect(status()).toBe(true);                                              // and read "Syncing" or "Synced"
  });
});

describe('when there is no cloud to ask', () => {
  it('a student opened with no Firebase helpers gets an id at once', async () => {
    await mount('Student A');                                                 // no window.__alloFirebase
    expect(roster().map(r => r.name)).toContain('Student A');
  });
  it('a failed sign-in does not hold the student for five seconds', async () => {
    window.__alloFirebase = {
      onAuthStateChanged: (_auth, listener) => { listener(null); return () => {}; },
      signInAnonymously: vi.fn(async () => { throw new Error('auth/network-request-failed'); }),
      doc: (_db, ...parts) => ({ path: parts.join('/') }), getDoc: vi.fn(), setDoc: vi.fn(), runTransaction: vi.fn()
    };
    await mount('Student A');
    expect(roster().map(r => r.name)).toContain('Student A');                 // waited out the 5 s timer
  });
});
