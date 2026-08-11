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

describe('Behavior Lens mounted workspace lifecycle', () => {
  it('ignores a late cloud response after a rapid student switch', async () => {
    const gates = { studenta001: deferred(), studentb002: deferred() };
    const firebase = installFirebase(gates);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      await waitForCondition(
        () => firebase.getDoc.mock.calls.some(([ref]) => ref.path.endsWith('/studenta001')),
        'Student A cloud read did not start'
      );
      await switchStudent(host, 'Student B');
      await waitForCondition(
        () => firebase.getDoc.mock.calls.some(([ref]) => ref.path.endsWith('/studentb002')),
        'Student B cloud read did not start'
      );

      gates.studentb002.resolve(cloudSnapshot(workspace('Student B', 2)));
      await waitForCondition(() => abcMetric(host) === '2', 'Student B workspace did not hydrate');
      expect(host.querySelector('select[aria-label="Choose a student"]').value).toBe('Student B');

      gates.studenta001.resolve(cloudSnapshot(workspace('Student A', 5)));
      await flushReact();
      await flushReact();

      expect(host.querySelector('select[aria-label="Choose a student"]').value).toBe('Student B');
      expect(abcMetric(host)).toBe('2');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('clears the prior student workspace while the destination cloud read is pending', async () => {
    const gates = { studenta001: deferred(), studentb002: deferred() };
    const firebase = installFirebase(gates);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      await waitForCondition(
        () => firebase.getDoc.mock.calls.some(([ref]) => ref.path.endsWith('/studenta001')),
        'Student A cloud read did not start'
      );
      gates.studenta001.resolve(cloudSnapshot(workspace('Student A', 4)));
      await waitForCondition(() => abcMetric(host) === '4', 'Student A workspace did not hydrate');

      await switchStudent(host, 'Student B');
      await waitForCondition(
        () => firebase.getDoc.mock.calls.some(([ref]) => ref.path.endsWith('/studentb002')),
        'Student B cloud read did not start'
      );
      expect(host.querySelector('select[aria-label="Choose a student"]').value).toBe('Student B');
      expect(abcMetric(host)).toBeNull();

      gates.studentb002.resolve(cloudSnapshot(workspace('Student B', 1)));
      await waitForCondition(() => abcMetric(host) === '1', 'Student B workspace did not hydrate');
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });
  it('surfaces a revision conflict and leaves a newer cloud workspace untouched', async () => {
    const initialRemote = Object.assign(workspace('Student A', 1), {
      revision: 1,
      updatedAt: '2026-08-09T12:00:00.000Z'
    });
    const firebase = installVersionedFirebase(initialRemote);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      await waitForCondition(() => abcMetric(host) === '1', 'Versioned cloud workspace did not hydrate');
      firebase.replaceStudentRemote(Object.assign(workspace('Student A', 2), {
        revision: 2,
        updatedAt: '2026-08-09T13:00:00.000Z'
      }));

      const profileToggle = Array.from(host.querySelectorAll('button[aria-label="Toggle is expanded"]')).find(
        (button) => button.textContent.includes('Student Profile')
      );
      expect(profileToggle).toBeTruthy();
      await React.act(async () => {
        profileToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      const interests = profileToggle.parentElement.querySelector('textarea');
      expect(interests).toBeTruthy();
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      await React.act(async () => {
        setTextareaValue.call(interests, 'Local unsynced interest');
        interests.dispatchEvent(new Event('input', { bubbles: true }));
        await Promise.resolve();
      });

      await React.act(async () => {
        await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 2100));
      });
      await waitForCondition(
        () => Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
          alert.textContent.includes('A newer cloud copy exists for this student.')
        ),
        'Revision conflict alert did not appear'
      );

      const conflictAlert = Array.from(host.querySelectorAll('[role="alert"]')).find((alert) =>
        alert.textContent.includes('A newer cloud copy exists for this student.')
      );
      expect(conflictAlert.textContent).toContain('Local revision 1; cloud revision 2.');
      expect(firebase.runTransaction).toHaveBeenCalled();
      expect(firebase.readStudentRemote()).toMatchObject({ revision: 2 });
      expect(firebase.readStudentRemote().abcEntries).toHaveLength(2);

      const keepLocalButton = Array.from(conflictAlert.querySelectorAll('button')).find(
        (button) => button.textContent.includes('Replace cloud with local')
      );
      expect(keepLocalButton).toBeTruthy();
      await React.act(async () => {
        keepLocalButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      const confirmation = document.querySelector('[role="alertdialog"]');
      expect(confirmation).toBeTruthy();
      const confirmOverwrite = Array.from(confirmation.querySelectorAll('button')).find(
        (button) => button.textContent.includes('Replace cloud copy')
      );
      expect(confirmOverwrite).toBeTruthy();
      await React.act(async () => {
        confirmOverwrite.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(
        () => firebase.readStudentRemote().revision === 3,
        'Force overwrite did not advance the actual cloud revision'
      );
      expect(firebase.readStudentRemote()).toMatchObject({
        revision: 3,
        studentProfile: { interests: 'Local unsynced interest' }
      });
      expect(Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
        alert.textContent.includes('A newer cloud copy exists for this student.')
      )).toBe(false);
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });
  it('retries a transient cloud save after browser reconnects', async () => {
    const originalOnline = navigator.onLine;
    const initialRemote = Object.assign(workspace('Student A', 1), {
      revision: 1,
      updatedAt: '2026-08-09T12:00:00.000Z'
    });
    const firebase = installRetryFirebase(initialRemote);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    window.dispatchEvent(new Event('offline'));
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      await waitForCondition(() => abcMetric(host) === '1', 'Retry test workspace did not hydrate');
      const profileToggle = Array.from(host.querySelectorAll('button[aria-label="Toggle is expanded"]')).find(
        (button) => button.textContent.includes('Student Profile')
      );
      expect(profileToggle).toBeTruthy();
      await React.act(async () => {
        profileToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      const interests = profileToggle.parentElement.querySelector('textarea');
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      await React.act(async () => {
        setTextareaValue.call(interests, 'Queued while offline');
        interests.dispatchEvent(new Event('input', { bubbles: true }));
        await Promise.resolve();
      });
      await React.act(async () => {
        await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 2100));
      });
      expect(firebase.studentAttempts()).toBe(1);
      expect(firebase.readStudentRemote()).toMatchObject({ revision: 1 });
      expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_dirty_studenta001'))).toMatchObject({
        pending: true,
        revision: 1
      });
      expect(Array.from(host.querySelectorAll('[role="status"]')).some((status) =>
        status.textContent.includes('Queued')
      )).toBe(true);

      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
      await waitForCondition(
        () => firebase.readStudentRemote().revision === 2,
        'Queued workspace did not retry after reconnect'
      );
      expect(firebase.readStudentRemote().studentProfile.interests).toBe('Queued while offline');
      expect(firebase.studentAttempts()).toBe(2);
      expect(localStorage.getItem('behaviorLens_workspace_dirty_studenta001')).toBeNull();
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnline });
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });
  it('recovers dirty local work across reload before applying a newer cloud copy', async () => {
    const local = Object.assign(workspace('Student A', 3), {
      revision: 1,
      savedAt: '2026-08-09T12:30:00.000Z'
    });
    localStorage.setItem('behaviorLens_workspace_studenta001', JSON.stringify(local));
    localStorage.setItem('behaviorLens_workspace_dirty_studenta001', JSON.stringify({
      pending: true,
      revision: 1,
      savedAt: local.savedAt
    }));
    const remote = Object.assign(workspace('Student A', 2), {
      revision: 2,
      updatedAt: '2026-08-09T13:00:00.000Z'
    });
    const firebase = installVersionedFirebase(remote);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      try {
        await waitForCondition(
          () => Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
            alert.textContent.includes('Unsynced local work and the cloud copy differ.')
          ),
          'Reload recovery conflict did not appear'
        );
      } catch (error) {
        const alerts = Array.from(host.querySelectorAll('[role="alert"]')).map((alert) => alert.textContent.trim());
        const studentReads = firebase.getDoc.mock.calls.filter(([ref]) => ref.path.endsWith('/studenta001')).length;
        const dirty = localStorage.getItem('behaviorLens_workspace_dirty_studenta001');
        throw new Error(`Reload recovery conflict did not appear; metric=${abcMetric(host)} studentReads=${studentReads} dirty=${dirty} alerts=${JSON.stringify(alerts)}`);
      }
      expect(abcMetric(host)).toBe('3');
      expect(firebase.readStudentRemote()).toMatchObject({ revision: 2 });
      const recoveryAlert = Array.from(host.querySelectorAll('[role="alert"]')).find((alert) =>
        alert.textContent.includes('Unsynced local work and the cloud copy differ.')
      );
      expect(recoveryAlert.textContent).toContain('Local revision 1; cloud revision 2.');
      expect(Array.from(host.querySelectorAll('[role="status"]')).some((status) =>
        status.textContent.trim() === 'Conflict'
      )).toBe(true);
      const useCloudButton = Array.from(recoveryAlert.querySelectorAll('button')).find(
        (button) => button.textContent.includes('Use cloud copy')
      );
      await React.act(async () => {
        useCloudButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(() => abcMetric(host) === '2', 'Cloud recovery choice did not hydrate');
      await waitForCondition(
        () => localStorage.getItem('behaviorLens_workspace_dirty_studenta001') === null,
        'Cloud recovery choice did not clear the dirty marker'
      );
      expect(firebase.readStudentRemote()).toMatchObject({ revision: 2 });
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('pauses shared writes and preserves a durable draft when another tab changes the workspace', async () => {
    const remote = Object.assign(workspace('Student A', 1), {
      revision: 1,
      updatedAt: '2026-08-09T12:00:00.000Z'
    });
    const firebase = installVersionedFirebase(remote);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');

    try {
      await waitForCondition(() => abcMetric(host) === '1', 'Cross-tab workspace did not hydrate');
      const workspaceKey = 'behaviorLens_workspace_studenta001';
      const previousValue = localStorage.getItem(workspaceKey);
      const otherTabWorkspace = Object.assign(workspace('Student A', 2), {
        revision: 1,
        savedAt: '2026-08-09T13:00:00.000Z'
      });
      const otherValue = JSON.stringify(otherTabWorkspace);
      localStorage.setItem(workspaceKey, otherValue);
      await React.act(async () => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: workspaceKey,
          oldValue: previousValue,
          newValue: otherValue,
          storageArea: localStorage,
          url: window.location.href
        }));
        await Promise.resolve();
      });

      await waitForCondition(
        () => Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
          alert.textContent.includes('Another tab changed this workspace.')
        ),
        'Cross-tab conflict alert did not appear'
      );
      expect(Array.from(host.querySelectorAll('[role="status"]')).some((status) =>
        status.textContent.trim() === 'Tab conflict'
      )).toBe(true);
      const draftKey = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).find(
        (key) => key && key.startsWith('behaviorLens_workspace_tabdraft_studenta001_')
      );
      expect(draftKey).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(draftKey)).abcEntries).toHaveLength(1);

      const profileToggle = Array.from(host.querySelectorAll('button[aria-label="Toggle is expanded"]')).find(
        (button) => button.textContent.includes('Student Profile')
      );
      await React.act(async () => {
        profileToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      const interests = profileToggle.parentElement.querySelector('textarea');
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      await React.act(async () => {
        setTextareaValue.call(interests, 'Preserved only in this tab draft');
        interests.dispatchEvent(new Event('input', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(
        () => JSON.parse(localStorage.getItem(draftKey)).studentProfile.interests === 'Preserved only in this tab draft',
        'Current tab edits were not redirected to the durable draft'
      );
      expect(JSON.parse(localStorage.getItem(workspaceKey)).abcEntries).toHaveLength(2);
      expect(firebase.readStudentRemote()).toMatchObject({ revision: 1 });

      const conflictAlert = Array.from(host.querySelectorAll('[role="alert"]')).find((alert) =>
        alert.textContent.includes('Another tab changed this workspace.')
      );
      const loadOtherButton = Array.from(conflictAlert.querySelectorAll('button')).find(
        (button) => button.textContent.includes('Load other tab copy')
      );
      await React.act(async () => {
        loadOtherButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(() => abcMetric(host) === '2', 'Other-tab workspace did not hydrate');
      expect(localStorage.getItem(draftKey)).toBeNull();
      expect(Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
        alert.textContent.includes('Another tab changed this workspace.')
      )).toBe(false);
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });

  it('surfaces a durable export action when browser workspace storage fails', async () => {
    const remote = Object.assign(workspace('Student A', 1), { revision: 1 });
    installVersionedFirebase(remote);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = await mountBehaviorLens(host, 'Student A');
    let storageSpy = null;

    try {
      await waitForCondition(() => abcMetric(host) === '1', 'Storage failure workspace did not hydrate');
      const originalSetItem = window.Storage.prototype.setItem;
      storageSpy = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (key === 'behaviorLens_workspace_studenta001') {
          const error = new DOMException('Storage quota exceeded', 'QuotaExceededError');
          throw error;
        }
        return originalSetItem.call(this, key, value);
      });
      const profileToggle = Array.from(host.querySelectorAll('button[aria-label="Toggle is expanded"]')).find(
        (button) => button.textContent.includes('Student Profile')
      );
      await React.act(async () => {
        profileToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      const interests = profileToggle.parentElement.querySelector('textarea');
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      await React.act(async () => {
        setTextareaValue.call(interests, 'Triggers storage warning');
        interests.dispatchEvent(new Event('input', { bubbles: true }));
        await Promise.resolve();
      });
      await waitForCondition(
        () => Array.from(host.querySelectorAll('[role="alert"]')).some((alert) =>
          alert.textContent.includes('Local workspace backup needs attention.')
        ),
        'Local persistence warning did not appear'
      );
      const storageAlert = Array.from(host.querySelectorAll('[role="alert"]')).find((alert) =>
        alert.textContent.includes('Local workspace backup needs attention.')
      );
      expect(storageAlert.textContent).toContain('Browser storage is full.');
      expect(storageAlert.querySelector('button').textContent).toContain('Export workspace now');
    } finally {
      if (storageSpy) storageSpy.mockRestore();
      await React.act(async () => { root.unmount(); });
      host.remove();
    }
  });
});
