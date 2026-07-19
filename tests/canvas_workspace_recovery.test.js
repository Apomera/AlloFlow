import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const historyPanel = readFileSync(resolve(process.cwd(), 'view_history_panel_source.jsx'), 'utf8');

function loadRecoveryHelpers() {
  const start = anti.indexOf('const ALLO_WORKSPACE_RECOVERY = (() => {');
  const endMarker = '\n\nconst _alloGetCanvasDeviceStorage';
  const end = anti.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Recovery helper block not found');
  const source = anti.slice(start, end) + '\nreturn { recovery: ALLO_WORKSPACE_RECOVERY, createStudentProjectSettings: _alloCreateDefaultStudentProjectSettings, normalizeStudentProjectSettings: _alloNormalizeStudentProjectSettings, captureSelAuthoringState: _alloCaptureCanvasSelAuthoringState, applySelAuthoringState: _alloApplyCanvasSelAuthoringState };';
  return new Function(source)();
}

const recoveryHelpers = loadRecoveryHelpers();
const recovery = recoveryHelpers.recovery;

function snapshot(id, savedAt, count = 1) {
  return {
    version: 1,
    id,
    title: 'Workspace ' + id,
    savedAt,
    assetPolicy: 'full',
    workspace: {
      history: Array.from({ length: count }, (_, index) => ({
        id: id + '-resource-' + index,
        type: 'quiz',
        title: 'Resource ' + index,
        data: { index }
      })),
      units: [{ id: 'unit-1', name: 'Unit One' }],
      activeResourceId: id + '-resource-' + (count - 1),
      activeView: 'quiz'
    }
  };
}

describe('Canvas workspace recovery helpers', () => {
  it('retains a complete resource pack beyond the old 50-item cache cap', () => {
    const full = snapshot('full', '2026-07-18T12:00:00.000Z', 60);
    const store = recovery.upsert(recovery.emptyStore(), full);
    expect(store.snapshots).toHaveLength(1);
    expect(store.snapshots[0].workspace.history).toHaveLength(60);
    expect(store.snapshots[0].workspace.history.map(item => item.id)).toEqual(
      full.workspace.history.map(item => item.id)
    );
    expect(store.snapshots[0].workspace.units).toEqual(full.workspace.units);
    expect(store.snapshots[0].workspace.activeResourceId).toBe('full-resource-59');
  });

  it('keeps up to three separate workspaces so Start Fresh is nondestructive', () => {
    let store = recovery.emptyStore();
    store = recovery.upsert(store, snapshot('old', '2026-07-15T12:00:00.000Z'));
    store = recovery.upsert(store, snapshot('middle', '2026-07-16T12:00:00.000Z'));
    store = recovery.upsert(store, snapshot('recent', '2026-07-17T12:00:00.000Z'));
    store = recovery.upsert(store, snapshot('fresh', '2026-07-18T12:00:00.000Z'));
    expect(store.snapshots.map(item => item.id)).toEqual(['fresh', 'recent', 'middle']);
    expect(store.snapshots.some(item => item.id === 'recent')).toBe(true);
  });

  it('removes only large media on quota fallback and records an omission manifest', () => {
    const full = snapshot('media', '2026-07-18T12:00:00.000Z');
    full.workspace.history[0].data = {
      imageUrl: 'data:image/png;base64,AAAA',
      audioUrl: 'data:audio/wav;base64,BBBB',
      handout: 'data:application/pdf;base64,CCCC',
      remoteImage: 'https://example.edu/image.png',
      prompt: 'Keep this instructional text'
    };
    const stripped = recovery.stripLargeAssets(full);
    expect(stripped.workspace.history).toHaveLength(1);
    expect(stripped.workspace.history[0].data.imageUrl).toBeNull();
    expect(stripped.workspace.history[0].data.audioUrl).toBeNull();
    expect(stripped.workspace.history[0].data.handout).toBeNull();
    expect(stripped.workspace.history[0].data.remoteImage).toBe('https://example.edu/image.png');
    expect(stripped.workspace.history[0].data.prompt).toBe('Keep this instructional text');
    expect(stripped.assetPolicy).toBe('text-only');
    expect(stripped.omittedAssets).toBe(3);
    expect(stripped.omittedAssetManifest).toHaveLength(3);
    expect(stripped.omittedAssetManifest.every(item => item.reason === 'device-quota')).toBe(true);
    expect(stripped.omittedAssetManifest.map(item => item.path).join(' ')).toContain('imageUrl');
  });

  it('does not inflate the omission ledger when the same degraded snapshot is saved again', () => {
    const full = snapshot('repeat-media', '2026-07-18T12:00:00.000Z');
    full.workspace.history[0].data.imageUrl = 'data:image/png;base64,AAAA';
    const once = recovery.stripLargeAssets(full);
    const replayWithTheSameMedia = {
      ...full,
      omittedAssets: once.omittedAssets,
      omittedAssetManifest: once.omittedAssetManifest
    };
    const twice = recovery.stripLargeAssets(replayWithTheSameMedia);
    expect(twice.omittedAssets).toBe(once.omittedAssets);
    expect(twice.omittedAssetManifest).toEqual(once.omittedAssetManifest);
  });

  it('rejects malformed snapshots and supports explicit removal', () => {
    expect(recovery.normalizeSnapshot({ workspace: { history: [] } })).toBeNull();
    const store = recovery.upsert(recovery.emptyStore(), snapshot('keep', '2026-07-18T12:00:00.000Z'));
    const removed = recovery.remove(store, 'keep');
    expect(removed.snapshots).toEqual([]);
    expect(removed.legacyMigrationComplete).toBe(true);
  });



  it('keeps erase tombstones and rejects a delayed or stale resurrection', () => {
    const first = snapshot('same', '2026-07-18T12:00:00.000Z');
    const newer = snapshot('same', '2026-07-18T13:00:00.000Z');
    const older = snapshot('same', '2026-07-18T12:30:00.000Z');
    let store = recovery.upsert(recovery.emptyStore(), first);
    store = recovery.upsert(store, newer);
    store = recovery.upsert(store, older);
    expect(store.snapshots[0].savedAt).toBe(newer.savedAt);

    const removed = recovery.remove(store, 'same');
    expect(removed.removedSnapshotIds.same).toBeTruthy();
    expect(recovery.normalizeStore(removed).removedSnapshotIds.same).toBeTruthy();
    expect(recovery.upsert(removed, snapshot('same', '2026-07-19T12:00:00.000Z')).snapshots).toEqual([]);
    const prototypeNamed = recovery.upsert(recovery.emptyStore(), snapshot('toString', '2026-07-20T12:00:00.000Z'));
    expect(prototypeNamed.snapshots).toHaveLength(1);
    expect(prototypeNamed.snapshots[0].id).toBe('toString');
  });
  it('rejects future-version payloads and accepts a meaningful draft-only workspace', () => {
    expect(recovery.normalizeSnapshot({ ...snapshot('future', '2026-07-18T12:00:00.000Z'), version: 99 })).toBeNull();
    expect(recovery.normalizeStore({ version: 99, snapshots: [snapshot('future', '2026-07-18T12:00:00.000Z')] }).snapshots).toEqual([]);
    const draftOnly = snapshot('draft', '2026-07-18T12:00:00.000Z', 0);
    draftOnly.workspace.inputText = 'A lesson draft that has not generated resources yet';
    expect(recovery.normalizeSnapshot(draftOnly)?.workspace.inputText).toContain('lesson draft');
  });

  it('degrades only the current workspace when a quota fallback is needed', () => {
    const prior = snapshot('prior', '2026-07-17T12:00:00.000Z');
    prior.workspace.history[0].data.imageUrl = 'data:image/png;base64,PRIOR';
    const current = snapshot('current', '2026-07-18T12:00:00.000Z');
    current.workspace.history[0].data.imageUrl = 'data:image/png;base64,CURRENT';
    const base = recovery.upsert(recovery.emptyStore(), prior);
    const next = recovery.upsert(base, recovery.stripLargeAssets(current));
    expect(next.snapshots.find(item => item.id === 'prior').workspace.history[0].data.imageUrl).toBe('data:image/png;base64,PRIOR');
    expect(next.snapshots.find(item => item.id === 'current').workspace.history[0].data.imageUrl).toBeNull();
  });
});


describe('Canvas full resource-pack recovery state', () => {
  it('sanitizes and defaults teacher delivery settings without retaining unknown fields', () => {
    const normalized = recoveryHelpers.normalizeStudentProjectSettings({
      hideStudentAiFeatures: true,
      allowStudentByokAi: true,
      allowDictation: false,
      socraticCustomInstructions: 'Use one question at a time.',
      adventureMinXP: -5,
      baseXP: 250,
      unknownCredential: 'must-not-survive',
      adventurePermissions: {
        allowModeSwitch: true,
        allowCloudImageStorage: true,
        allowVisualsToggle: false
      }
    });
    expect(normalized).toMatchObject({
      hideStudentAiFeatures: true,
      allowStudentByokAi: true,
      allowDictation: false,
      socraticCustomInstructions: 'Use one question at a time.',
      adventureMinXP: 0,
      baseXP: 250
    });
    expect(normalized.adventurePermissions).toMatchObject({
      allowModeSwitch: true,
      allowCloudImageStorage: true,
      allowVisualsToggle: false
    });
    expect(normalized).not.toHaveProperty('unknownCredential');
    expect(recoveryHelpers.createStudentProjectSettings().allowSocraticTutor).toBe(true);
  });

  it('round-trips and clears teacher-authored SEL stations, tool data, and snapshots', () => {
    const prior = recoveryHelpers.captureSelAuthoringState();
    const legacyKey = 'alloSelRecoveryTest';
    try {
      recoveryHelpers.applySelAuthoringState({
        stations: [{ id: 'station-1', title: 'Calm Corner' }],
        toolData: {
          journal: { _lsKey: legacyKey, _lsValue: { entries: ['Reflect'] }, prompt: 'Notice and name' }
        },
        snapshots: [{ id: 'reflection-1', text: 'I paused before responding.' }]
      });
      expect(recoveryHelpers.captureSelAuthoringState()).toEqual({
        stations: [{ id: 'station-1', title: 'Calm Corner' }],
        toolData: {
          journal: { _lsKey: legacyKey, _lsValue: { entries: ['Reflect'] }, prompt: 'Notice and name' }
        },
        snapshots: [{ id: 'reflection-1', text: 'I paused before responding.' }]
      });
      expect(JSON.parse(localStorage.getItem('alloflow_sel_stations'))).toHaveLength(1);
      expect(JSON.parse(localStorage.getItem(legacyKey))).toEqual({ entries: ['Reflect'] });

      recoveryHelpers.applySelAuthoringState(null);
      expect(recoveryHelpers.captureSelAuthoringState()).toEqual({ stations: [], toolData: {}, snapshots: [] });
      expect(localStorage.getItem(legacyKey)).toBeNull();
    } finally {
      recoveryHelpers.applySelAuthoringState(prior);
      localStorage.removeItem(legacyKey);
    }
  });
});

describe('Canvas workspace recovery integration contracts', () => {
  it('awaits the dedicated bridge with non-queued atomic recovery writes', () => {
    expect(anti).toContain('await deviceStorage.ready()');
    expect(anti).toContain('await deviceStorage.mutateRecovery(');
    expect(anti).toContain("action: 'markLegacyMigrated'");
    expect(anti).toContain("action: 'upsert'");
    expect(anti).toContain('{ queue: false }');
    expect(anti).not.toContain('deviceStorage.set(ALLO_WORKSPACE_RECOVERY_NAMESPACE');
    expect(anti).toContain("setCanvasRecoverySaveStatus('saved')");
  });

  it('offers an accessible decision flow and protects live student entry', () => {
    expect(anti).toContain("setCanvasRecoveryDialogMode('choice')");
    expect(anti).toContain('Continue previous work');
    expect(anti).toContain('Start a fresh workspace');
    expect(anti).toContain('Manage saved work');
    expect(anti).toContain('Import project file');
    expect(anti).toContain('role="dialog"');
    expect(anti).toContain('aria-modal="true"');
    expect(anti).toContain('Shared computer?');
    expect(anti).toContain('const protectCanvasStudentEntry = () =>');
    expect(anti).toContain('if (isCanvasStudentEntry()) { protectCanvasStudentEntry(); return; }');
    expect(anti).toContain("setCanvasRecoverySaveStatus('inactive')");
  });

  it('saves full history and excludes credential configuration from the snapshot builder', () => {
    const start = anti.indexOf('const buildCanvasWorkspaceSnapshot');
    const end = anti.indexOf('const restoreCanvasWorkspaceSnapshot', start);
    const builder = anti.slice(start, end);
    expect(builder).toContain('history,');
    expect(builder).toContain('selectedProfileId,');
    expect(builder).toContain('studentProjectSettings: _alloNormalizeStudentProjectSettings(studentProjectSettings)');
    expect(builder).toContain('selAuthoringState: _alloCaptureCanvasSelAuthoringState()');
    expect(builder).not.toContain('MAX_OFFLINE_ITEMS');
    expect(builder).not.toContain('apiKey');
    expect(builder).not.toContain('auth');
  });

  it('keeps profile and project settings inside the workspace envelope and restores after initialization', () => {
    const builderStart = anti.indexOf('const buildCanvasWorkspaceSnapshot');
    const restoreStart = anti.indexOf('const restoreCanvasWorkspaceSnapshot', builderStart);
    const builder = anti.slice(builderStart, restoreStart);
    const workspaceStart = builder.indexOf('workspace: {');
    const lessonSettingsStart = builder.indexOf('lessonSettings: {', workspaceStart);
    const projectStateStart = builder.indexOf('projectState: {', lessonSettingsStart);
    const projectSettingsField = builder.indexOf('studentProjectSettings: _alloNormalizeStudentProjectSettings', workspaceStart);
    expect(builder.indexOf('selectedProfileId,')).toBeGreaterThan(workspaceStart);
    expect(builder.slice(0, workspaceStart)).not.toContain('selectedProfileId,');
    expect(projectSettingsField).toBeGreaterThan(projectStateStart);
    expect(projectSettingsField).not.toBeLessThan(lessonSettingsStart);

    const restoreEnd = anti.indexOf('const startFreshCanvasWorkspace', restoreStart);
    const restore = anti.slice(restoreStart, restoreEnd);
    expect(restore.indexOf('const projectState = workspace.projectState || {}')).toBeLessThan(
      restore.indexOf('setStudentProjectSettings(_alloNormalizeStudentProjectSettings(projectState.studentProjectSettings))')
    );
    expect(restore).toContain('_alloApplyCanvasSelAuthoringState(workspace.selAuthoringState)');
  });


  it('keeps Start Fresh nondestructive and prevents erased active work from being re-saved', () => {
    const freshStart = anti.slice(
      anti.indexOf('const startFreshCanvasWorkspace'),
      anti.indexOf('const openCanvasRecoveryManager')
    );
    expect(freshStart).toContain('ALLO_WORKSPACE_RECOVERY.newId()');
    expect(freshStart).toContain('clearCanvasWorkspaceState()');
    expect(freshStart).not.toContain('ALLO_WORKSPACE_RECOVERY.remove');

    const clear = anti.slice(anti.indexOf('const clearCanvasWorkspaceState'), anti.indexOf('const buildCanvasWorkspaceSnapshot'));
    expect(clear).toContain('setHistory([])');
    expect(clear).toContain('setStudentResponses({})');
    const eraseStart = anti.indexOf('const eraseCanvasRecoverySnapshot');
    const eraseEnd = anti.indexOf('const handleCanvasRecoveryImport', eraseStart);
    const erase = anti.slice(eraseStart, eraseEnd);
    expect(erase).toContain('await deviceStorage.mutateRecovery(');
    expect(erase).toContain("action: 'remove'");
    expect(erase).toContain('snapshotId');
    expect(erase).not.toContain('deviceStorage.set(ALLO_WORKSPACE_RECOVERY_NAMESPACE');
    expect(erase).not.toContain('deviceStorage.remove(ALLO_WORKSPACE_RECOVERY_NAMESPACE');
    expect(erase).toContain('canvasRecoveryCurrentIdRef.current === snapshotId');
    expect(erase).toContain('clearCanvasWorkspaceState()');
  });

  it('shows truthful Canvas device status instead of a permanent generic sync spinner', () => {
    expect(historyPanel).toContain("isCanvas && canvasRecoverySaveStatus === 'inactive'");
    expect(historyPanel).toContain('Saved on this device');
    expect(historyPanel).toContain('Device save needs attention');
    expect(historyPanel).toContain('history_device_storage');
    expect(historyPanel).toContain('onOpenDeviceRecovery');
  });

  it('routes recovery exports through the full workspace envelope and preserves older snapshots on fallback', () => {
    expect(anti).toContain('workspaceRecovery: snapshot');
    expect(anti).toContain("Object.prototype.hasOwnProperty.call(parsed, 'workspaceRecovery')");
    expect(anti).toContain('await restoreCanvasWorkspaceSnapshot(imported)');
    expect(anti).toContain("{ version: ALLO_WORKSPACE_RECOVERY.VERSION, action: 'upsert', snapshot: reducedSnapshot }");
    expect(anti).not.toContain('ALLO_WORKSPACE_RECOVERY.upsert(baseStore, reducedSnapshot)');
    expect(anti).not.toContain('nextStore.snapshots.map(item => ALLO_WORKSPACE_RECOVERY.stripLargeAssets');
  });

  it('requests an immediate best-effort save when Canvas is hidden or navigated away', () => {
    expect(anti).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(anti).toContain("window.addEventListener('pagehide', requestImmediateSave)");
    expect(anti).toContain('const saveDelay = canvasRecoveryImmediateSaveRef.current ? 0 : 1500');
  });

  it('schedules device recovery while the Document Builder remains open', () => {
    expect(anti).toContain('const _builderRecoverySaveTimerRef = React.useRef(null)');
    expect(anti).toContain("doc.addEventListener('input', function ()");
    expect(anti).toContain('setCanvasRecoveryRevision(value => value + 1)');
  });

  it('atomically updates shared storage under a cross-tab lock and clears recovered settings symmetrically', () => {
    expect(anti).toContain("navigator.locks.request('alloflow-workspace-recovery-v1'");
    const autosaveStart = anti.indexOf('const result = await queueCanvasRecoveryStorage');
    const autosaveEnd = anti.indexOf('return { nextStore, degraded }', autosaveStart);
    const autosave = anti.slice(autosaveStart, autosaveEnd);
    expect(autosave).toContain('await deviceStorage.mutateRecovery(');
    expect(autosave).toContain("action: 'upsert'");
    expect(autosave).toContain('{ queue: false }');
    expect(autosave).not.toContain('const rawStore = await deviceStorage.get');
    expect(autosave).not.toContain('const baseStore = ALLO_WORKSPACE_RECOVERY.normalizeStore(rawStore)');

    const reset = anti.slice(anti.indexOf('const resetCanvasWorkspaceSettings'), anti.indexOf('const clearCanvasWorkspaceState'));
    expect(reset).toContain("setGradeLevel('3rd Grade')");
    expect(reset).toContain('setStudentInterests([])');
    expect(reset).toContain("setSourceCustomInstructions('')");
    expect(reset).toContain("setResourceCount('Auto')");
    expect(reset).toContain('setStudentProjectSettings(_alloCreateDefaultStudentProjectSettings())');
    expect(reset).toContain('_alloApplyCanvasSelAuthoringState(null)');
  });

  it('physically removes migrated legacy history and suppresses learner storage in live entry', () => {
    expect(anti).toContain("await deviceStorage.remove('app_kv', 'allo_offline_history', { queue: false })");
    expect(anti).toContain("await storageDB.del('allo_offline_history')");
    expect(anti).toContain('function _alloShouldSuppressLearnerDeviceStorage');
    expect(anti).toContain('if (shouldStop()) return;');
  });
});
