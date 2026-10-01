import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const workspaceSource = readFileSync(resolve(dir, '..', 'behavior_lens_workspace_module.js'), 'utf8');

function workspace(label, savedAt, revision = 1) {
  return {
    student: 'Student A',
    revision,
    savedAt,
    abcEntries: [{ id: label, behavior: label }],
    observationSessions: [],
    sessionNotes: []
  };
}

function memoryStorage(entries) {
  const values = new Map(entries || []);
  return {
    get length() { return values.size; },
    key: vi.fn((index) => Array.from(values.keys())[index] || null),
    getItem: vi.fn((key) => values.get(key) || null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key))
  };
}

beforeAll(() => {
  // eslint-disable-next-line no-new-func
  new Function(workspaceSource)();
});

describe('Behavior Lens cross-tab workspace recovery', () => {
  it('selects the newest durable tab draft for the active student', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const storage = memoryStorage([
      ['draft_student_tab_a', JSON.stringify(workspace('older-tab', '2026-08-09T12:30:00.000Z'))],
      ['unrelated', JSON.stringify(workspace('unrelated', '2026-08-09T14:00:00.000Z'))],
      ['draft_student_tab_b', JSON.stringify(workspace('newer-tab', '2026-08-09T13:00:00.000Z'))]
    ]);

    const result = runtime.findLatestTabDraft(storage, 'draft_student_');

    expect(result).toMatchObject({
      key: 'draft_student_tab_b',
      workspace: { abcEntries: [{ id: 'newer-tab' }] }
    });
  });

  it('hydrates a durable tab draft before the shared browser workspace', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const shared = workspace('shared-copy', '2026-08-09T12:00:00.000Z');
    const draft = workspace('preserved-draft', '2026-08-09T13:00:00.000Z');
    const storage = memoryStorage([
      ['workspace', JSON.stringify(shared)],
      ['draft_student_tab_a', JSON.stringify(draft)]
    ]);
    const guard = runtime.createHydrationGuard();
    const token = guard.begin('student-a');

    const result = await runtime.loadStudentWorkspace({
      guard,
      token,
      shouldLoadCloud: false,
      loadKey: 'student-a',
      storage,
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      tabDraftPrefix: 'draft_student_',
      abcKey: 'abc',
      observationKey: 'observations'
    });

    expect(result).toMatchObject({
      source: 'local-tab-conflict',
      workspace: { abcEntries: [{ id: 'preserved-draft' }] },
      otherWorkspace: { abcEntries: [{ id: 'shared-copy' }] },
      pendingLocalResolution: true,
      tabDraftKey: 'draft_student_tab_a'
    });
  });

  it('ignores a stale duplicate draft that matches the shared snapshot', async () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const shared = workspace('same-copy', '2026-08-09T12:00:00.000Z', 3);
    const storage = memoryStorage([
      ['workspace', JSON.stringify(shared)],
      ['draft_student_tab_a', JSON.stringify(shared)]
    ]);
    const guard = runtime.createHydrationGuard();
    const token = guard.begin('student-a');

    const result = await runtime.loadStudentWorkspace({
      guard,
      token,
      shouldLoadCloud: false,
      loadKey: 'student-a',
      storage,
      workspaceKey: 'workspace',
      dirtyKey: 'dirty',
      tabDraftPrefix: 'draft_student_',
      abcKey: 'abc',
      observationKey: 'observations'
    });

    expect(result).toMatchObject({
      source: 'local-workspace',
      workspace: { revision: 3, abcEntries: [{ id: 'same-copy' }] }
    });
  });
});
