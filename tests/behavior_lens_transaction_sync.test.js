import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const workspaceSource = readFileSync(resolve(dir, '..', 'behavior_lens_workspace_module.js'), 'utf8');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function cloudSnapshot(data) {
  return {
    exists: () => data != null,
    data: () => clone(data)
  };
}

function createAtomicStore(initialValue) {
  let value = clone(initialValue);
  let queue = Promise.resolve();
  const runTransaction = vi.fn((_firestore, updateFunction) => {
    const operation = queue.then(async () => {
      let pendingWrite = null;
      const transaction = {
        get: vi.fn(async () => cloudSnapshot(value)),
        set: vi.fn((_docRef, data, options) => {
          pendingWrite = { data: clone(data), merge: !!(options && options.merge) };
        })
      };
      const result = await updateFunction(transaction);
      if (pendingWrite) {
        value = pendingWrite.merge
          ? Object.assign({}, value || {}, pendingWrite.data)
          : pendingWrite.data;
      }
      return result;
    });
    queue = operation.then(() => undefined, () => undefined);
    return operation;
  });

  return {
    runTransaction,
    read: () => clone(value)
  };
}

function commit(runtime, store, overrides = {}) {
  return runtime.commitCloudWorkspace(Object.assign({
    runTransaction: store.runTransaction,
    firestore: { name: 'test-firestore' },
    docRef: { path: 'behaviorLens/workspaces/student-a' },
    expectedRevision: 0,
    userId: 'behavior-lens-test-user',
    now: '2026-08-09T14:00:00.000Z',
    data: { student: 'Student A', abcEntries: [{ id: 'entry-1' }] }
  }, overrides));
}

beforeAll(() => {
  // eslint-disable-next-line no-new-func
  new Function(workspaceSource)();
});

describe('Behavior Lens atomic cloud revisions', () => {
  it('allows only one of two concurrent writers from the same revision', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const store = createAtomicStore(null);

    const [first, second] = await Promise.all([
      commit(runtime, store, { data: { writer: 'first' } }),
      commit(runtime, store, { data: { writer: 'second' } })
    ]);

    expect(first).toMatchObject({ ok: true, revision: 1 });
    expect(second).toEqual({
      ok: false,
      conflict: {
        expectedRevision: 0,
        remoteRevision: 1,
        remoteSavedAt: '2026-08-09T14:00:00.000Z'
      }
    });
    expect(store.read()).toMatchObject({
      writer: 'first',
      revision: 1,
      _uid: 'behavior-lens-test-user'
    });
  });

  it('rejects a stale ordinary save without mutating the cloud workspace', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const store = createAtomicStore({
      student: 'Student A',
      writer: 'remote',
      revision: 4,
      updatedAt: '2026-08-09T13:00:00.000Z'
    });

    const result = await commit(runtime, store, {
      expectedRevision: 3,
      data: { writer: 'stale-local' }
    });

    expect(result).toEqual({
      ok: false,
      conflict: {
        expectedRevision: 3,
        remoteRevision: 4,
        remoteSavedAt: '2026-08-09T13:00:00.000Z'
      }
    });
    expect(store.read()).toMatchObject({ writer: 'remote', revision: 4 });
  });

  it('force-overwrites from the actual remote revision and advances it once', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const store = createAtomicStore({ writer: 'remote', revision: 7 });

    const result = await commit(runtime, store, {
      expectedRevision: 1,
      force: true,
      data: { writer: 'chosen-local', abcEntries: [{ id: 'local-entry' }] }
    });

    expect(result).toMatchObject({ ok: true, revision: 8 });
    expect(store.read()).toMatchObject({
      writer: 'chosen-local',
      revision: 8,
      abcEntries: [{ id: 'local-entry' }]
    });
  });

  it('propagates an offline transaction failure so the caller can retain local work', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const failure = new Error('offline');
    const store = {
      runTransaction: vi.fn(async () => { throw failure; })
    };

    await expect(commit(runtime, store)).rejects.toBe(failure);
  });

  it('refuses to fall back to a non-atomic write when transactions are unavailable', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;

    await expect(runtime.commitCloudWorkspace({
      docRef: { path: 'behaviorLens/workspaces/student-a' },
      data: { student: 'Student A' }
    })).rejects.toMatchObject({
      code: 'behavior-lens/transaction-unavailable'
    });
  });
});
