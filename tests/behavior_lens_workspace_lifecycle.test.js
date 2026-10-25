import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

const priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolveValue) => { resolvePromise = resolveValue; });
  return { promise, resolve: resolvePromise };
}

function cloudSnapshot(data) {
  return {
    exists: () => data != null,
    data: () => data
  };
}

function workspace(student, count) {
  return {
    version: 3,
    student,
    savedAt: '2026-08-09T12:00:00.000Z',
    abcEntries: Array.from({ length: count }, (_, index) => ({
      id: `${student}-${index}`,
      timestamp: `2026-08-0${Math.min(index + 1, 9)}T12:00:00.000Z`,
      antecedent: 'Transition',
      behavior: `${student} behavior ${index + 1}`,
      consequence: 'Prompted break',
      intensity: 2
    })),
    observationSessions: [],
    sessionNotes: [],
    teamNotes: []
  };
}

function installFirebase(gates) {
  const getDoc = vi.fn((docRef) => {
    const studentId = docRef.path.split('/').pop();
    const gate = gates[studentId];
    return gate ? gate.promise : Promise.resolve(cloudSnapshot(null));
  });
  window.__alloFirebase = {
    onAuthStateChanged: (_auth, listener) => {
      listener({ uid: 'behavior-lens-test-user' });
      return () => {};
    },
    signInAnonymously: vi.fn(),
    doc: (_firestore, ...parts) => ({ path: parts.join('/') }),
    getDoc,
    setDoc: vi.fn(async () => {})
  };
  return { getDoc };
}

function installVersionedFirebase(initialRemote) {
  let studentRemote = JSON.parse(JSON.stringify(initialRemote));
  const getDoc = vi.fn(async (docRef) => cloudSnapshot(
    docRef.path.endsWith('/studenta001') ? studentRemote : null
  ));
  const setDoc = vi.fn(async () => {});
  const runTransaction = vi.fn(async (_firestore, updateFunction) => {
    let pendingWrite = null;
    const result = await updateFunction({
      get: getDoc,
      set: (docRef, data, options) => { pendingWrite = { docRef, data, options }; }
    });
    if (pendingWrite && pendingWrite.docRef.path.endsWith('/studenta001')) {
      studentRemote = pendingWrite.options && pendingWrite.options.merge
        ? Object.assign({}, studentRemote || {}, pendingWrite.data)
        : pendingWrite.data;
    }
    return result;
  });
  window.__alloFirebase = {
    onAuthStateChanged: (_auth, listener) => {
      listener({ uid: 'behavior-lens-test-user' });
      return () => {};
    },
    signInAnonymously: vi.fn(),
    doc: (_firestore, ...parts) => ({ path: parts.join('/') }),
    getDoc,
    setDoc,
    runTransaction
  };
  return {
    getDoc,
    runTransaction,
    replaceStudentRemote: (nextRemote) => { studentRemote = JSON.parse(JSON.stringify(nextRemote)); },
    readStudentRemote: () => JSON.parse(JSON.stringify(studentRemote))
  };
}
function installDelayedSaveFirebase(initialRemote) {
  let studentRemote = JSON.parse(JSON.stringify(initialRemote));
  const commitGate = deferred();
  let gateUsed = false;
  const getDoc = vi.fn(async (docRef) => cloudSnapshot(
    docRef.path.endsWith('/studenta001') ? studentRemote : null
  ));
  const runTransaction = vi.fn(async (_firestore, updateFunction) => {
    let pendingWrite = null;
    const result = await updateFunction({
      get: getDoc,
      set: (docRef, data, options) => { pendingWrite = { docRef, data, options }; }
    });
    if (pendingWrite && pendingWrite.docRef.path.endsWith('/studenta001') && !gateUsed) {
      gateUsed = true;
      await commitGate.promise;
    }
    if (pendingWrite && pendingWrite.docRef.path.endsWith('/studenta001')) {
      studentRemote = pendingWrite.options && pendingWrite.options.merge
        ? Object.assign({}, studentRemote || {}, pendingWrite.data)
        : pendingWrite.data;
    }
    return result;
  });
  window.__alloFirebase = {
    onAuthStateChanged: (_auth, listener) => {
      listener({ uid: 'behavior-lens-test-user' });
      return () => {};
    },
    signInAnonymously: vi.fn(),
    doc: (_firestore, ...parts) => ({ path: parts.join('/') }),
    getDoc,
    setDoc: vi.fn(async () => {}),
    runTransaction
  };
  return {
    commitGate,
    studentCommitStarted: () => gateUsed,
    readStudentRemote: () => JSON.parse(JSON.stringify(studentRemote))
  };
}

function installRetryFirebase(initialRemote) {
  let studentRemote = JSON.parse(JSON.stringify(initialRemote));
  let studentAttempts = 0;
  let failNextStudentSave = true;
  const getDoc = vi.fn(async (docRef) => cloudSnapshot(
    docRef.path.endsWith('/studenta001') ? studentRemote : null
  ));
  const setDoc = vi.fn(async () => {});
  const runTransaction = vi.fn(async (_firestore, updateFunction) => {
    let readPath = '';
    let pendingWrite = null;
    const result = await updateFunction({
      get: async (docRef) => {
        readPath = docRef.path;
        if (docRef.path.endsWith('/studenta001')) studentAttempts += 1;
        return cloudSnapshot(docRef.path.endsWith('/studenta001') ? studentRemote : null);
      },
      set: (docRef, data, options) => { pendingWrite = { docRef, data, options }; }
    });
    if (readPath.endsWith('/studenta001') && failNextStudentSave) {
      failNextStudentSave = false;
      const error = new Error('temporary network outage');
      error.code = 'unavailable';
      throw error;
    }
    if (pendingWrite && pendingWrite.docRef.path.endsWith('/studenta001')) {
      studentRemote = pendingWrite.options && pendingWrite.options.merge
        ? Object.assign({}, studentRemote || {}, pendingWrite.data)
        : pendingWrite.data;
    }
    return result;
  });
  window.__alloFirebase = {
    onAuthStateChanged: (_auth, listener) => {
      listener({ uid: 'behavior-lens-test-user' });
      return () => {};
    },
    signInAnonymously: vi.fn(),
    doc: (_firestore, ...parts) => ({ path: parts.join('/') }),
    getDoc,
    setDoc,
    runTransaction
  };
  return {
    studentAttempts: () => studentAttempts,
    readStudentRemote: () => JSON.parse(JSON.stringify(studentRemote))
  };
}
function seedRoster() {
  localStorage.clear();
  localStorage.setItem('bl_onboarded', '1');
  localStorage.setItem('bl_studentkey_migrated_v1', '1');
  localStorage.setItem('bl_student_roster', JSON.stringify([
    { id: 'studenta001', name: 'Student A', lastAccessed: '2026-08-09T10:00:00.000Z' },
    { id: 'studentb002', name: 'Student B', lastAccessed: '2026-08-09T10:00:00.000Z' }
  ]));
}

async function flushReact() {
  await React.act(async () => {
    await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 0));
  });
}

async function waitForCondition(predicate, message) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await flushReact();
    if (predicate()) return;
  }
  throw new Error(message);
}

function abcMetric(host) {
  const label = Array.from(host.querySelectorAll('div')).find((element) =>
    element.childElementCount === 0 && element.textContent.trim() === 'ABC Entries'
  );
  return label && label.previousElementSibling ? label.previousElementSibling.textContent.trim() : null;
}

async function switchStudent(host, student) {
  const picker = host.querySelector('select[aria-label="Choose a student"]');
  expect(picker).toBeTruthy();
  await React.act(async () => {
    picker.value = student;
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

async function mountBehaviorLens(host, student, addToast = vi.fn()) {
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => {
    root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({
      studentNickname: student,
      dashboardData: [
        { studentNickname: 'Student A' },
        { studentNickname: 'Student B' }
      ],
      isTeacherMode: true,
      isCanvasEnv: false,
      firestore: { name: 'test-firestore' },
      firebaseAuth: { name: 'test-auth' },
      appId: 'behavior-lens-integration',
      addToast
    })));
    await Promise.resolve();
  });
  await React.act(async () => {
    Array.from(host.querySelectorAll('button')).find(button => button.textContent.trim() === 'All tools').click();
  });
  return root;
}

beforeAll(() => {
  setupBehaviorLens();
});

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  seedRoster();
});

afterEach(() => {
  localStorage.clear();
  delete window.__alloFirebase;
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorActFlag;
});


// These mounted cases run inside an unlocked synthetic protected session.
// Plaintext account sync is intentionally disabled; pure transaction/conflict
// algorithms retain their separate tests and the actual service tests cover
// atomic encrypted conflicts and lock-time durability.
describe('Behavior Lens protected local workspace lifecycle', () => {
  const seedWorkspace = (id, name, count) => localStorage.setItem('behaviorLens_workspace_' + id, JSON.stringify(workspace(name, count)));
  const withHost = async fn => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');
    try { await flushReact(); await fn(host); }
    finally { await React.act(async () => root.unmount()); host.remove(); }
  };
  it('never starts legacy cloud authentication or record reads', async () => {
    seedWorkspace('studenta001', 'Student A', 1); const cloud = installFirebase({});
    await withHost(async host => {
      expect(abcMetric(host)).toBe('1');
      expect(cloud.getDoc).not.toHaveBeenCalled();
      expect(window.__alloFirebase.signInAnonymously).not.toHaveBeenCalled();
      expect(window.__alloFirebase.setDoc).not.toHaveBeenCalled();
    });
  });
  it('switches between local cases without carrying the earlier case records', async () => {
    seedWorkspace('studenta001', 'Student A', 4); seedWorkspace('studentb002', 'Student B', 2);
    await withHost(async host => {
      expect(abcMetric(host)).toBe('4'); await switchStudent(host, 'Student B'); await flushReact();
      expect(abcMetric(host)).toBe('2'); expect(host.querySelector('select[aria-label="Choose a student"]').value).toBe('Student B');
      expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_studenta001')).abcEntries).toHaveLength(4);
    });
  });
  it('rapid local switches keep the final selected case and both stored histories', async () => {
    seedWorkspace('studenta001', 'Student A', 3); seedWorkspace('studentb002', 'Student B', 1);
    await withHost(async host => {
      await switchStudent(host, 'Student B'); await switchStudent(host, 'Student A'); await flushReact();
      expect(abcMetric(host)).toBe('3');
      expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_studentb002')).abcEntries).toHaveLength(1);
    });
  });
  it('opening a case with no saved records does not display the preceding case', async () => {
    seedWorkspace('studenta001', 'Student A', 3);
    await withHost(async host => {
      expect(abcMetric(host)).toBe('3'); await switchStudent(host, 'Student B'); await flushReact();
      expect(['0', null]).toContain(abcMetric(host));
      expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_studenta001')).abcEntries).toHaveLength(3);
    });
  });
  it('edits are staged locally and never sent to a configured legacy account', async () => {
    seedWorkspace('studenta001', 'Student A', 1); const cloud = installVersionedFirebase(workspace('Student A', 9));
    await withHost(async host => {
      const toggle = [...host.querySelectorAll('button[aria-expanded]')].find(button => button.textContent.includes('Student Profile'));
      await React.act(async () => toggle.click());
      const area = toggle.parentElement.querySelector('textarea');
      await React.act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, 'PRIVATE LOCAL INTEREST');
        area.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await waitForCondition(() => JSON.parse(localStorage.getItem('behaviorLens_workspace_studenta001') || '{}').studentProfile?.interests === 'PRIVATE LOCAL INTEREST', 'Profile edit was not staged locally');
      expect(cloud.getDoc).not.toHaveBeenCalled(); expect(cloud.runTransaction).not.toHaveBeenCalled();
      expect(cloud.readStudentRemote().abcEntries).toHaveLength(9);
    });
  });
  it('reconnect cannot send protected data through legacy Firebase sync', async () => {
    seedWorkspace('studenta001', 'Student A', 2); const cloud = installVersionedFirebase(workspace('Student A', 9));
    await withHost(async host => {
      await React.act(async () => window.dispatchEvent(new Event('online'))); await flushReact();
      expect(abcMetric(host)).toBe('2'); expect(cloud.getDoc).not.toHaveBeenCalled(); expect(cloud.runTransaction).not.toHaveBeenCalled();
    });
  });
  it('dirty local work survives remount without a newer cloud record replacing it', async () => {
    seedWorkspace('studenta001', 'Student A', 3);
    localStorage.setItem('behaviorLens_workspace_dirty_studenta001', JSON.stringify({ pending: true, revision: 1 }));
    const cloud = installVersionedFirebase({ ...workspace('Student A', 9), revision: 8 });
    await withHost(async host => expect(abcMetric(host)).toBe('3'));
    await withHost(async host => expect(abcMetric(host)).toBe('3'));
    expect(cloud.getDoc).not.toHaveBeenCalled(); expect(cloud.runTransaction).not.toHaveBeenCalled();
  });
  it('warns and offers export before projected browser storage reaches capacity', async () => {
    const remote = Object.assign(workspace('Student A', 1), { revision: 1 });
    installVersionedFirebase(remote);
    localStorage.setItem('behaviorLens_capacity_fixture', 'x'.repeat(1_700_000));
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      await waitForCondition(
        () => Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
          alert.textContent.includes('Workspace storage is growing large.')
        ),
        'Proactive workspace capacity warning did not appear'
      );
      const warning = Array.from(host.querySelectorAll('[role="alert"]')).find((alert) =>
        alert.textContent.includes('Workspace storage is growing large.')
      );
      expect(warning.textContent).toContain('Estimated browser storage after this save:');
      expect(warning.textContent).toContain('Export backup now');
      expect(Array.from(host.querySelectorAll('[role="status"]')).some((status) =>
        status.textContent.trim() === 'Storage near limit'
      )).toBe(true);

      const dismiss = Array.from(warning.querySelectorAll('button')).find((button) =>
        button.textContent.includes('Dismiss for now')
      );
      await React.act(async () => {
        dismiss.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(
        () => !Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
          alert.textContent.includes('Workspace storage is growing large.')
        ),
        'Capacity warning did not dismiss'
      );
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('paginates a large ABC table without dropping filtered records', async () => {
    const largeWorkspace = workspace('Student A', 120);
    localStorage.setItem('behaviorLens_workspace_studenta001', JSON.stringify(largeWorkspace));
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      await waitForCondition(() => abcMetric(host) === '120', 'Large local workspace did not hydrate');
      const openAbc = Array.from(host.querySelectorAll('button')).find((button) =>
        button.textContent.trim() === 'Open ABC Data Collection'
      );
      expect(openAbc).toBeTruthy();
      await React.act(async () => {
        openAbc.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(() => !!host.querySelector('[aria-label="ABC entry pages"]'), 'ABC pagination controls did not render');
      const table = host.querySelector('table');
      expect(table).toBeTruthy();
      expect(table.querySelectorAll('tbody > tr').length).toBe(50);
      expect(host.querySelector('[aria-label="ABC entry pages"]').textContent).toContain('Showing 1–50 of 120 matching entries');
      expect(host.querySelector('[aria-label="ABC entry pages"]').textContent).toContain('Page 1 of 3');

      const next = host.querySelector('button[aria-label="Next ABC entries page"]');
      await React.act(async () => {
        next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(
        () => host.querySelector('[aria-label="ABC entry pages"]').textContent.includes('Showing 51–100 of 120 matching entries'),
        'ABC pagination did not advance to page two'
      );
      expect(table.querySelectorAll('tbody > tr').length).toBe(50);

      const rowsPerPage = host.querySelector('select[aria-label="ABC rows per page"]');
      await React.act(async () => {
        rowsPerPage.value = '100';
        rowsPerPage.dispatchEvent(new Event('change', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(
        () => host.querySelector('[aria-label="ABC entry pages"]').textContent.includes('Showing 1–100 of 120 matching entries'),
        'Changing the page size did not reset to the first page'
      );
      expect(table.querySelectorAll('tbody > tr').length).toBe(100);

      expect(host.querySelectorAll('#behavior-lens-abc-behavior-suggestions option').length).toBe(50);
      const behaviorSort = Array.from(host.querySelectorAll('button[aria-label^="Sort ABC entries by "]')).find((button) =>
        button.getAttribute('aria-label').includes('Behavior')
      );
      expect(behaviorSort).toBeTruthy();
      await React.act(async () => {
        behaviorSort.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      expect(behaviorSort.closest('th').getAttribute('aria-sort')).toBe('descending');
      await React.act(async () => {
        behaviorSort.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      expect(behaviorSort.closest('th').getAttribute('aria-sort')).toBe('ascending');

      const behaviorFilter = host.querySelector('input[aria-label="Filter ABC entries by behavior"]');
      const setInputValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      await React.act(async () => {
        setInputValue.call(behaviorFilter, 'behavior 120');
        behaviorFilter.dispatchEvent(new Event('input', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(
        () => host.querySelector('[aria-label="ABC entry pages"]').textContent.includes('of 1 matching entries'),
        'Behavior text filtering did not search the full collection'
      );
      expect(table.querySelectorAll('tbody > tr').length).toBe(1);
      expect(table.querySelector('tbody').textContent).toContain('Student A behavior 120');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  }, 15000);

});
