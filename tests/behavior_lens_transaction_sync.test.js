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
  it('coalesces rapid local changes and retains independent student workspaces', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const scheduled = [];
    const cleared = [];
    const persisted = [];
    let nextHandle = 0;
    const scheduler = runtime.createWorkspacePersistenceScheduler({
      delayMs: 300,
      keyForValue: (value) => value.studentId,
      persist: (value, context) => persisted.push({ value, context }),
      setTimeout: (callback, delay) => {
        const handle = { id: ++nextHandle, callback, delay };
        scheduled.push(handle);
        return handle;
      },
      clearTimeout: (handle) => cleared.push(handle.id)
    });

    scheduler.schedule({ studentId: 'student-a', edit: 1 });
    scheduler.schedule({ studentId: 'student-a', edit: 2 });
    scheduler.schedule({ studentId: 'student-b', edit: 1 });

    expect(scheduler.pendingCount()).toBe(2);
    expect(scheduled.map(({ delay }) => delay)).toEqual([300, 300, 300]);
    expect(cleared).toEqual([1, 2]);

    const result = scheduler.flush({ reason: 'student-switch' });

    expect(result).toMatchObject({ ok: true, flushedCount: 2, pendingCount: 0 });
    expect(persisted).toEqual([
      { value: { studentId: 'student-a', edit: 2 }, context: { reason: 'student-switch' } },
      { value: { studentId: 'student-b', edit: 1 }, context: { reason: 'student-switch' } }
    ]);
  });

  it('keeps a failed scheduled save pending for a later flush', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    let attempts = 0;
    const failure = new Error('quota');
    const onError = vi.fn();
    const scheduler = runtime.createWorkspacePersistenceScheduler({
      keyForValue: (value) => value.studentId,
      persist: () => {
        attempts += 1;
        if (attempts === 1) throw failure;
        return 'saved';
      },
      onError,
      setTimeout: () => 1,
      clearTimeout: () => {}
    });
    scheduler.schedule({ studentId: 'student-a', edit: 1 });

    expect(scheduler.flush({ reason: 'delay' })).toMatchObject({
      ok: false,
      flushedCount: 0,
      failedCount: 1,
      pendingCount: 1
    });
    expect(onError).toHaveBeenCalledWith(failure, { studentId: 'student-a', edit: 1 }, { reason: 'delay' });
    expect(scheduler.flush({ reason: 'retry' })).toMatchObject({ ok: true, flushedCount: 1, pendingCount: 0 });
  });

  it('does not let a stale cloud acknowledgement replace a newer browser edit', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const acknowledged = { student: 'Student A', revision: 4, savedAt: '2026-08-12T12:00:00.000Z',
      snapshotId: 'tab-a:1', abcEntries: [{ id: 'older-edit' }] };
    const newer = { student: 'Student A', revision: 4, savedAt: '2026-08-12T12:00:00.000Z',
      snapshotId: 'tab-a:2', abcEntries: [{ id: 'newer-edit' }] };
    const values = new Map([
      ['workspace', JSON.stringify(newer)],
      ['dirty', JSON.stringify({ pending: true, revision: 4, savedAt: newer.savedAt, snapshotId: newer.snapshotId })]
    ]);
    const storage = {
      get length() { return values.size; },
      key: (index) => Array.from(values.keys())[index] || null,
      getItem: (key) => values.get(key) || null,
      setItem: vi.fn((key, value) => values.set(key, value)),
      removeItem: vi.fn((key) => values.delete(key))
    };
    const result = runtime.acknowledgeCloudWorkspace({ storage, workspaceKey: 'workspace', dirtyKey: 'dirty',
      workspace: acknowledged, revision: 5, updatedAt: '2026-08-12T12:00:01.000Z' });

    expect(result).toMatchObject({ applied: false, stale: true, revision: 5 });
    expect(JSON.parse(values.get('workspace')).abcEntries[0].id).toBe('newer-edit');
    expect(values.has('dirty')).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('acknowledges the exact cloud snapshot and clears only its dirty marker', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const local = { student: 'Student A', revision: 4, savedAt: '2026-08-12T12:00:00.000Z',
      snapshotId: 'tab-a:7', abcEntries: [{ id: 'committed-edit' }] };
    const values = new Map([
      ['workspace', JSON.stringify(local)],
      ['dirty', JSON.stringify({ pending: true, revision: 4, savedAt: local.savedAt, snapshotId: local.snapshotId })]
    ]);
    const storage = {
      get length() { return values.size; },
      key: (index) => Array.from(values.keys())[index] || null,
      getItem: (key) => values.get(key) || null,
      setItem: vi.fn((key, value) => values.set(key, value)),
      removeItem: vi.fn((key) => values.delete(key))
    };
    const result = runtime.acknowledgeCloudWorkspace({ storage, workspaceKey: 'workspace', dirtyKey: 'dirty',
      workspace: local, revision: 5, updatedAt: '2026-08-12T12:00:01.000Z' });

    expect(result).toMatchObject({ applied: true, stale: false, revision: 5 });
    expect(JSON.parse(values.get('workspace'))).toMatchObject({
      revision: 5, snapshotId: 'tab-a:7', updatedAt: '2026-08-12T12:00:01.000Z'
    });
    expect(values.has('dirty')).toBe(false);
  });

});
