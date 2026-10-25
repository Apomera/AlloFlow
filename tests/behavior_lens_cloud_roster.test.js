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


// Protected records deliberately disable the old plaintext account sync. The
// pure merge contract above remains useful, while mounted tests enforce the
// current deployment boundary and preserve the local encrypted-session data.
describe('protected roster ignores legacy account sync', () => {
  const seed = () => {
    localStorage.setItem('bl_onboarded', '1');
    localStorage.setItem('bl_student_roster', JSON.stringify(CLOUD.__roster__.roster));
    localStorage.setItem('behaviorLens_workspace_cloud-a', JSON.stringify(CLOUD['cloud-a']));
  };
  const assertNoCloud = cloud => {
    expect(cloud.getDoc).not.toHaveBeenCalled();
    expect(window.__alloFirebase.signInAnonymously).not.toHaveBeenCalled();
    expect(window.__alloFirebase.setDoc).not.toHaveBeenCalled();
    expect(window.__alloFirebase.runTransaction).not.toHaveBeenCalled();
  };
  it('does not read, authenticate or write a legacy account when Firebase is available', async () => {
    const cloud = installCloud(CLOUD); await mount('Student A'); await tick();
    assertNoCloud(cloud);
    expect(cloud.store).toEqual(CLOUD);
  });
  it('does not copy the parent dashboard or cloud roster into clinical storage automatically', async () => {
    const cloud = installCloud(CLOUD); await mount('Student A');
    expect(roster()).toEqual([]);
    expect(localStorage.getItem('behaviorLens_workspace_cloud-a')).toBeNull();
    assertNoCloud(cloud);
  });
  it('keeps existing protected roster ids and records without asking the cloud', async () => {
    seed(); const cloud = installCloud(CLOUD); await mount('Student A');
    expect(roster().map(r => r.id)).toEqual(expect.arrayContaining(['cloud-a', 'cloud-b']));
    expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_cloud-a')).abcEntries[0].behavior).toBe('CLOUD ENTRY behavior');
    assertNoCloud(cloud);
  });
  it('removing a local quick-switch entry persists after remount and does not delete its records', async () => {
    seed(); const cloud = installCloud(CLOUD); await mount('Student A');
    await click([...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'All tools'));
    await click(host.querySelector('[aria-label="Remove student Student B from quick switch"]')); await tick();
    expect(roster().map(r => r.id)).not.toContain('cloud-b');
    await unmount(); await mount('Student A');
    expect(roster().map(r => r.id)).not.toContain('cloud-b');
    expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_cloud-a')).abcEntries).toHaveLength(1);
    assertNoCloud(cloud);
  });
  it('keeps dirty local work when a legacy cloud account has a newer record', async () => {
    seed();
    const local = { ...CLOUD['cloud-a'], revision: 1, abcEntries: [{ ...CLOUD['cloud-a'].abcEntries[0], behavior: 'UNSENT LOCAL NOTE' }] };
    localStorage.setItem('behaviorLens_workspace_cloud-a', JSON.stringify(local));
    localStorage.setItem('behaviorLens_workspace_dirty_cloud-a', JSON.stringify({ pending: true, revision: 1 }));
    const cloud = installCloud({ ...CLOUD, 'cloud-a': { ...CLOUD['cloud-a'], revision: 9 } });
    await mount('Student A'); await tick();
    expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_cloud-a')).abcEntries[0].behavior).toBe('UNSENT LOCAL NOTE');
    assertNoCloud(cloud);
  });
  it('reconnect events cannot reenable legacy roster writes', async () => {
    seed(); const cloud = installCloud(CLOUD); await mount('Student A');
    await React.act(async () => window.dispatchEvent(new Event('online'))); await tick();
    assertNoCloud(cloud); expect(cloud.store).toEqual(CLOUD);
  });
  it('opens an explicitly selected local case without Firebase helpers', async () => {
    seed(); await mount('Student A');
    expect(roster().find(r => r.name === 'Student A').id).toBe('cloud-a');
    expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_cloud-a')).abcEntries).toHaveLength(1);
  });
});
