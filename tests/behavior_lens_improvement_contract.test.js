import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(dir, '..', 'behavior_lens_module.js'), 'utf8');
const deploy = readFileSync(resolve(dir, '..', 'desktop', 'web-app', 'public', 'behavior_lens_module.js'), 'utf8');
const workspaceSource = readFileSync(resolve(dir, '..', 'behavior_lens_workspace_module.js'), 'utf8');
const workspaceDeploy = readFileSync(resolve(dir, '..', 'desktop', 'web-app', 'public', 'behavior_lens_workspace_module.js'), 'utf8');

// eslint-disable-next-line no-new-func
new Function(workspaceSource)();
const workspaceRuntime = window.AlloModules.BehaviorLensWorkspace;

describe('Behavior Lens improvement contracts', () => {
  it('keeps both deploy mirrors byte-identical to their canonical modules', () => {
    expect(deploy).toBe(source);
    expect(workspaceDeploy).toBe(workspaceSource);
  });

  it('uses app-scoped immutable cloud paths instead of codename paths', () => {
    expect(source).toContain('artifacts/' + '$' + '{_cloudAppId}/users/' + '$' + '{_cloudUserId}/behaviorLens/workspaces/' + '$' + '{safeId}');
    expect(source).not.toContain('behaviorLens_users/');
    expect(source).toContain('appId: hostAppId');
  });

  it('reads Symbol Studio familiarity and bank assets from the active profile', () => {
    expect(source).toContain("localStorage.getItem('alloSymbolFamiliarity__' + pid)");
    expect(source).toContain("localStorage.getItem('alloSymbolGallery__' + pid)");
    expect(source).toContain('const raw = _blGalleryRaw()');
    expect(source).not.toContain("const raw = localStorage.getItem('alloSymbolGallery')");
  });
  it('guards student hydration against stale responses and empty-workspace fallback loss', () => {
    expect(source).toContain('const hydrationRef = useRef');
    expect(source).toContain('const isCurrent = () => hydrationRef.current.isCurrent(hydrationToken)');
    expect(source).toContain('const pendingWorkspaceRef = useRef(null);');
    expect(source).toContain('getBehaviorLensWorkspaceRuntime().loadStudentWorkspace');
    expect(workspaceSource).toContain('function hasWorkspaceData(data)');
    expect(source).toContain('behaviorLens_workspace_');
    expect(source).toContain('const resetStudentScopedState = useCallback');
  });

  it('persists complete workspaces and validates imported shapes', () => {
    expect(source).toContain('const buildWorkspaceSnapshot = useCallback');
    expect(source).toContain('const validWorkspace = data');
    expect(source).toContain('applyStudentWorkspace(data);');
    expect(source).toContain('getBehaviorLensWorkspaceRuntime().normalizeWorkspace(data)');
  });

  it('preserves duration and latency observations for downstream history', () => {
    expect(source).toContain('measurementVersion: 2');
    expect(source).toContain('observation-duration');
    expect(source).toContain('observation-latency');
    expect(source).toContain('unit:');
    expect(source).toContain('intervalLength, intervals: intervalsToSave');
  });

  it('routes analysis as a command and prevents duplicate panel branches', () => {
    expect(source).toMatch(/if \(panelId ===/);
    expect(source).not.toMatch(/activePanel === 'analysis' &&/);
    expect((source.match(/activePanel === 'prefassess'/g) || []).length).toBe(1);
    expect((source.match(/activePanel === 'progressreport'/g) || []).length).toBe(1);
  });

  it('runtime hydration guard rejects stale responses after a rapid student switch', () => {
    const guard = workspaceRuntime.createHydrationGuard();
    const first = guard.begin('student-a');
    const second = guard.begin('student-b');
    expect(first.changed).toBe(false);
    expect(second.changed).toBe(true);
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it('extracts bounded workspace normalization into the focused runtime', () => {
    expect(source).not.toContain('function createBehaviorLensHydrationGuard');
    expect(source).toContain('BehaviorLens requires BehaviorLensWorkspace');
    const normalized = workspaceRuntime.normalizeWorkspace({
      abcEntries: Array.from({ length: 5002 }, (_, index) => ({ index })),
      observationSessions: Array.from({ length: 1002 }, (_, index) => ({ index })),
      teamNotes: Array.from({ length: 502 }, (_, index) => ({ index })),
      favorites: Array.from({ length: 102 }, (_, index) => String(index))
    });
    expect(normalized.abcEntries).toHaveLength(5000);
    expect(normalized.observationSessions).toHaveLength(1000);
    expect(normalized.teamNotes).toHaveLength(500);
    expect(normalized.favorites).toHaveLength(100);
  });

  it('persists Team Notes per student and exposes accessible collaboration controls', () => {
    expect(source).toContain('teamNotes, studentProfile');
    expect(source).toContain('notes: teamNotes');
    expect(source).toContain('setNotes: setTeamNotes');
    expect(source).toContain('aria-pressed');
    expect(source).toContain('bl-team-notes-persistence');
  });

  it('surfaces offline and cloud-conflict choices without discarding local work', () => {
    expect(source).toContain("cloudSync.syncStatus === 'conflict'");
    expect(source).toContain('cloudSync.cloudConflict');
    expect(source).toContain('overwriteCloud');
    expect(source).toContain('Use cloud copy');
    expect(source).toContain('Replace cloud with local');
    expect(source).toContain("'Cloud connectivity lost; changes are saved locally'");
    expect(source).toContain('delete cloudLoadAttempted.current[loadKey]');
  });

  it('commits cloud workspaces through a single revision transaction helper', () => {
    expect((workspaceSource.match(/async function commitCloudWorkspace\(options\)/g) || []).length).toBe(1);
    expect(source).toContain('getBehaviorLensWorkspaceRuntime().commitCloudWorkspace');
    expect(source).toContain('refusing a non-atomic workspace write');
    expect(source).toContain('Local revision');
    expect(source).toContain('_cloudSaveQueueRef');
  });
  it('replays the newest local snapshot after reconnect', () => {
    expect(source).toContain('_pendingCloudSavesRef');
    expect(source).toContain('_isRetryableCloudFailure');
    expect(source).toContain('Retry the newest local snapshot for each student after connectivity returns.');
    expect(source).toContain('delete _pendingCloudSavesRef.current[studentId];');
  });
  it('reports queued local saves in the sync status', () => {
    expect(source).toContain('pendingSaveCount');
    expect(source).toContain('Cloud offline — local changes queued for retry');
    expect(source).toContain('Cloud offline; local changes queued for retry');
    expect(source).toContain('⚡ Queued');
  });
  it('preserves dirty local work across reloads and exposes storage failure recovery', () => {
    expect(workspaceSource).toContain('function parseDirtyMarker(value)');
    expect(workspaceSource).toContain("source: 'local-cloud-conflict'");
    expect(source).toContain('behaviorLens_workspace_dirty_');
    expect(source).toContain('suppressNextDirtyMarkRef');
    expect(source).toContain('Local workspace backup needs attention.');
    expect(source).toContain('Export workspace now');
    expect(source).toContain("if (studentId !== '__roster__') _setSyncStatus('syncing');");
    expect(source).toContain('setCloudConflict((current) => current && current.studentId !== studentId ? current : null)');
  });
  it('protects active work from cross-tab overwrites and exposes explicit resolution', () => {
    expect(workspaceSource).toContain('function findLatestTabDraft(storage, prefix)');
    expect(workspaceSource).toContain("source: 'local-tab-conflict'");
    expect(source).toContain("window.addEventListener('storage', onStorage)");
    expect(source).toContain('behaviorLens_workspace_tabdraft_');
    expect(source).toContain('Automatic shared and cloud writes are paused until you choose a copy.');
    expect(source).toContain('Load other tab copy');
    expect(source).toContain('Keep this tab copy');
    expect(source).toContain('Local changes pending');
  });

  it('preflights browser capacity and bounds every workspace import path', () => {
    expect(workspaceSource).toContain('function assessLocalStorageWrite(storage, plan, options)');
    expect(workspaceSource).toContain('function validateWorkspaceImport(data, options)');
    expect(workspaceSource).toContain('function validateSharedWorkspaceImport(data, options)');
    expect(workspaceSource).toContain('MAX_WORKSPACE_IMPORT_BYTES');
    expect(workspaceSource).toContain('MAX_SHARED_WORKSPACE_IMPORT_BYTES');
    expect(source).toContain('workspaceCapacityWarning');
    expect(source).toContain('Storage near limit');
    expect(source).toContain('Export backup now');
    expect(source).toContain('Comparison is limited to 10 workspace files at a time.');
    expect(source).toContain('validateSharedWorkspaceImport(decoded');
    expect(source).toContain('Share code exceeds the 5,000-character safety limit.');
  });

  it('hardens CSV output and names its analytics denominators', () => {
    expect(source).toContain('String.fromCharCode(0xFEFF)');
    expect(source).toContain('const numeric =');
    expect(source).toContain("/[\",\\r\\n]/.test(str)");
    expect(source).toContain('runtime.summarizeIntensity');
    expect(source).toContain('intensityN');
    expect(source).toContain('Counts represent logged ABC entries');
    expect(source).toContain('incidents per observed hour');
  });

  it('announces connectivity changes and moves focus to newly opened panels', () => {
    expect(source).toContain('Cloud connectivity restored; local changes will sync when available');
    expect(source).toContain("setAttribute('tabindex', '-1')");
    expect(source).toContain("role: 'alert', 'aria-live': 'assertive'");
  });
  it('coalesces canonical browser saves and rejects stale cloud acknowledgements', () => {
    expect(workspaceSource).toContain('function createWorkspacePersistenceScheduler(options)');
    expect(workspaceSource).toContain('function acknowledgeCloudWorkspace(options)');
    expect(workspaceSource).toContain('function sameWorkspaceEdit(left, right)');
    expect(source).toContain('workspaceSnapshotSequenceRef');
    expect(source).toContain("flush({ reason: 'before-hydration' })");
    expect(source).toContain("flush({ reason: 'page-lifecycle', silent: true })");
    expect(source).toContain('workspaceRuntime.acknowledgeCloudWorkspace({');
    expect(source).toContain('localWorkspaceSaveSchedulerRef.current.schedule({');
  });

  it('bounds the live ABC table without truncating the filtered dataset', () => {
    expect(workspaceSource).toContain('function paginateCollection(items, requestedPageIndex, requestedPageSize, options)');
    expect(workspaceSource).toContain('COLLECTION_MAX_PAGE_SIZE = 100');
    expect(source).toContain('const visibleEntries = page.items;');
    expect(source).toContain('visibleEntries.map((entry, idx) =>');
    expect(source).toContain("'aria-label': 'ABC entry pages'");
    expect(source).toContain("'aria-label': 'Select all entries on this page'");
  });

});
