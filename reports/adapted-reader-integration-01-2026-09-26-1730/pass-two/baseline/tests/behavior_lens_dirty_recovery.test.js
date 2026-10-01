import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const workspaceSource = readFileSync(resolve(dir, '..', 'behavior_lens_workspace_module.js'), 'utf8');

function workspace(revision, label) {
  return {
    student: 'Student A',
    revision,
    savedAt: `2026-08-09T1${revision}:00:00.000Z`,
    abcEntries: [{ id: label, behavior: label }],
    observationSessions: [],
    sessionNotes: []
  };
}

function storageWith(localWorkspace, dirtyMarker) {
  const values = new Map([
    ['workspace', JSON.stringify(localWorkspace)],
    ['dirty', JSON.stringify(dirtyMarker)]
  ]);
  return {
    getItem: vi.fn((key) => values.get(key) || null)
  };
}

function loaderOptions(runtime, localWorkspace, dirtyMarker, remoteWorkspace) {
  const guard = runtime.createHydrationGuard();
  const token = guard.begin('studenta001');
  return {
    guard,
    token,
    shouldLoadCloud: true,
    loadFromCloud: vi.fn(async () => remoteWorkspace),
    loadKey: 'studenta001',
    storage: storageWith(localWorkspace, dirtyMarker),
    workspaceKey: 'workspace',
    dirtyKey: 'dirty',
    abcKey: 'abc',
    observationKey: 'observations'
  };
}

beforeAll(() => {
  // eslint-disable-next-line no-new-func
  new Function(workspaceSource)();
});

describe('Behavior Lens dirty-workspace recovery', () => {
  it('establishes the dirty marker before replacing the authoritative workspace', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const writes = [];
    const values = new Map();
    const storage = {
      setItem: vi.fn((key, value) => {
        writes.push(key);
        values.set(key, value);
      }),
      removeItem: vi.fn((key) => values.delete(key))
    };
    const local = workspace(4, 'new-local');

    runtime.persistLocalWorkspace({
      storage,
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      abcKey: 'abc',
      observationKey: 'observations',
      workspace: local,
      abcEntries: local.abcEntries,
      observationSessions: local.observationSessions
    });

    expect(writes).toEqual(['dirty', 'workspace', 'abc', 'observations']);
    expect(JSON.parse(values.get('dirty'))).toEqual({
      pending: true,
      revision: 4,
      savedAt: local.savedAt
    });
    expect(JSON.parse(values.get('workspace'))).toMatchObject({
      revision: 4,
      abcEntries: [{ id: 'new-local' }]
    });
  });

  it('does not replace the workspace when the recovery marker cannot be established', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const original = workspace(2, 'last-safe-copy');
    const values = new Map([['workspace', JSON.stringify(original)]]);
    const storage = {
      setItem: vi.fn((key, value) => {
        if (key === 'dirty') throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
        values.set(key, value);
      }),
      removeItem: vi.fn()
    };

    expect(() => runtime.persistLocalWorkspace({
      storage,
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      workspace: workspace(2, 'untracked-new-copy')
    })).toThrow(/Storage quota exceeded/);
    expect(JSON.parse(values.get('workspace')).abcEntries[0].id).toBe('last-safe-copy');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('keeps the dirty marker when a later workspace write fails', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const values = new Map();
    const storage = {
      setItem: vi.fn((key, value) => {
        if (key === 'workspace') throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
        values.set(key, value);
      }),
      removeItem: vi.fn((key) => values.delete(key))
    };
    const local = workspace(5, 'pending-copy');

    expect(() => runtime.persistLocalWorkspace({
      storage,
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      workspace: local
    })).toThrow(/Storage quota exceeded/);
    expect(JSON.parse(values.get('dirty'))).toMatchObject({
      pending: true,
      revision: 5,
      savedAt: local.savedAt
    });
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('preserves dirty local work and reports a revision conflict before cloud hydration', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const local = workspace(1, 'local-unsynced');
    const remote = Object.assign(workspace(2, 'newer-cloud'), {
      updatedAt: '2026-08-09T13:00:00.000Z'
    });

    const result = await runtime.loadStudentWorkspace(loaderOptions(runtime, local, {
      pending: true,
      revision: 1,
      savedAt: local.savedAt
    }, remote));

    expect(result).toMatchObject({
      source: 'local-cloud-conflict',
      workspace: { abcEntries: [{ id: 'local-unsynced' }] },
      remoteWorkspace: { abcEntries: [{ id: 'newer-cloud' }] },
      pendingCloudSync: true,
      conflict: {
        localRevision: 1,
        remoteRevision: 2,
        localSavedAt: local.savedAt,
        remoteSavedAt: remote.updatedAt
      }
    });
  });

  it('returns the dirty local workspace for transactional replay when revisions match', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const local = workspace(3, 'local-unsynced');
    const remote = workspace(3, 'cloud-base');

    const result = await runtime.loadStudentWorkspace(loaderOptions(runtime, local, {
      pending: true,
      revision: 3,
      savedAt: local.savedAt
    }, remote));

    expect(result).toMatchObject({
      source: 'local-workspace',
      workspace: { abcEntries: [{ id: 'local-unsynced' }] },
      remoteWorkspace: { abcEntries: [{ id: 'cloud-base' }] },
      pendingCloudSync: true
    });
  });

  it('keeps dirty local work available when the cloud cannot be read', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const local = workspace(0, 'offline-local');
    const options = loaderOptions(runtime, local, {
      pending: true,
      revision: 0,
      savedAt: local.savedAt
    }, null);
    options.loadFromCloud = vi.fn(async () => { throw new Error('offline'); });

    const result = await runtime.loadStudentWorkspace(options);

    expect(result).toMatchObject({
      source: 'local-workspace',
      workspace: { abcEntries: [{ id: 'offline-local' }] },
      pendingCloudSync: true
    });
  });
});
