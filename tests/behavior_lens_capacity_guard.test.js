import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const workspaceSource = readFileSync(resolve(dir, '..', 'behavior_lens_workspace_module.js'), 'utf8');

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return {
    get length() { return values.size; },
    key: vi.fn((index) => Array.from(values.keys())[index] || null),
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
    read: (key) => values.get(key)
  };
}

function workspace(label = 'entry') {
  return {
    version: 3,
    student: 'Student A',
    savedAt: '2026-08-12T12:00:00.000Z',
    revision: 2,
    abcEntries: [{ id: label, behavior: label }],
    observationSessions: [],
    sessionNotes: [],
    teamNotes: [],
    studentProfile: {}
  };
}

beforeAll(() => {
  // eslint-disable-next-line no-new-func
  new Function(workspaceSource)();
});

describe('Behavior Lens storage-capacity safeguards', () => {
  it('estimates replacement size instead of double-counting an existing workspace', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const storage = memoryStorage([
      ['workspace', 'x'.repeat(1_900_000)]
    ]);
    const plan = runtime.createLocalWorkspaceWritePlan({
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      abcKey: 'abc',
      observationKey: 'observations',
      workspace: workspace(),
      abcEntries: workspace().abcEntries,
      observationSessions: []
    });

    const capacity = runtime.assessLocalStorageWrite(storage, plan);

    expect(capacity.level).toBeNull();
    expect(capacity.projectedBytes).toBeLessThan(100_000);
  });

  it('warns before projected origin storage reaches the conservative budget', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const storage = memoryStorage([
      ['other-app-data', 'x'.repeat(1_700_000)]
    ]);
    const plan = runtime.createLocalWorkspaceWritePlan({
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      workspace: workspace()
    });

    const capacity = runtime.assessLocalStorageWrite(storage, plan);

    expect(capacity).toMatchObject({
      level: 'warning',
      reason: 'projected-total',
      safetyBytes: 4 * 1024 * 1024
    });
    expect(capacity.usageRatio).toBeGreaterThan(0.8);
  });

  it('reports a critical preflight without blocking the crash-consistent write', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const storage = memoryStorage([
      ['other-app-data', 'x'.repeat(2_100_000)]
    ]);

    const result = runtime.persistLocalWorkspace({
      storage,
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      abcKey: 'abc',
      observationKey: 'observations',
      workspace: workspace('critical'),
      abcEntries: workspace('critical').abcEntries,
      observationSessions: []
    });

    expect(result.capacity.level).toBe('critical');
    expect(JSON.parse(storage.read('dirty'))).toMatchObject({ pending: true, revision: 2 });
    expect(JSON.parse(storage.read('workspace')).abcEntries[0].id).toBe('critical');
  });

  it('accepts a bounded workspace and reports its import size', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;

    const result = runtime.validateWorkspaceImport(workspace(), { sourceBytes: 2048 });

    expect(result).toMatchObject({
      ok: true,
      error: null,
      sourceBytes: 2048,
      maxBytes: runtime.MAX_WORKSPACE_IMPORT_BYTES
    });
  });

  it('rejects oversized, malformed, and over-count workspace imports', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;

    expect(runtime.validateWorkspaceImport(workspace(), {
      sourceBytes: runtime.MAX_WORKSPACE_IMPORT_BYTES + 1
    })).toMatchObject({ ok: false });
    expect(runtime.validateWorkspaceImport({
      abcEntries: 'not-an-array',
      studentProfile: {}
    })).toMatchObject({ ok: false, error: 'abcEntries must be an array.' });
    expect(runtime.validateWorkspaceImport({
      abcEntries: Array.from({ length: 5001 }, () => ({})),
      observationSessions: []
    })).toMatchObject({ ok: false, error: 'abcEntries exceeds the limit of 5000 items.' });
  });

  it('validates bounded role-based shared snapshots', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const snapshot = {
      student: 'Student A',
      role: 'bcba',
      generatedAt: '2026-08-12T12:00:00.000Z',
      abcEntries: [],
      observationSessions: [],
      sessionHistory: [],
      profile: {}
    };

    expect(runtime.validateSharedWorkspaceImport(snapshot, { sourceBytes: 1024 })).toMatchObject({
      ok: true,
      maxBytes: runtime.MAX_SHARED_WORKSPACE_IMPORT_BYTES
    });
  });

  it('rejects oversized or unrecognized shared snapshots', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const snapshot = { student: 'Student A', role: 'bcba', abcEntries: [] };

    expect(runtime.validateSharedWorkspaceImport(snapshot, {
      sourceBytes: runtime.MAX_SHARED_WORKSPACE_IMPORT_BYTES + 1
    })).toMatchObject({ ok: false });
    expect(runtime.validateSharedWorkspaceImport({
      student: 'Student A',
      role: 'unknown',
      arbitrary: true
    })).toMatchObject({
      ok: false,
      error: 'Shared snapshot role must be bcba, teacher, or parent.'
    });
  });

  it('rejects generic JSON that contains no Behavior Lens workspace fields', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;

    expect(runtime.validateWorkspaceImport({ hello: 'world' })).toMatchObject({
      ok: false,
      error: 'No recognized BehaviorLens workspace data was found.'
    });
  });
});
