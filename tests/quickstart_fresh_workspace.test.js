import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const start = shell.indexOf('  const startFreshCanvasWorkspace = () => {');
const end = shell.indexOf('\n  const refreshStorageManagerInventory', start);
if (start < 0 || end < 0) throw new Error('Production fresh-workspace handler not found');
const handler = shell.slice(start, end);

function freshWorkspace(options = {}) {
  const state = {
    showWizard: false, wizardInitialMode: 'search', guidedMode: false,
    hasSelectedRole: true, isTeacherMode: true, pendingSync: true,
    canvasRecoveryError: 'old error', canvasRecoveryDecisionMade: false,
    canvasRecoveryDialogMode: 'choice', canvasRecoverySaveStatus: 'saved',
    lastSaved: 'old timestamp', canvasRecoveryRevision: 3,
    ...options,
  };
  const storage = new Map([['allo_wizard_completed', 'true'], ['unrelated-preference', 'keep']]);
  const savedWorkspace = { id: 'previous-work', workspace: { history: [{ id: 'reading', text: 'Keep my original.' }] } };
  const refs = {
    canvasRecoverySaveTokenRef: { current: 4 },
    canvasRecoveryPendingSaveCountRef: { current: 2 },
    canvasRecoveryCurrentIdRef: { current: 'previous-work' },
    canvasRecoveryStoreRef: { current: { snapshots: [savedWorkspace] } },
  };
  const set = key => value => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
  const deps = {
    ...refs,
    ALLO_WORKSPACE_RECOVERY: { newId: () => 'fresh-work' },
    clearCanvasWorkspaceState: vi.fn(() => { state.guidedMode = false; }),
    safeRemoveItem: vi.fn(key => {
      if (options.storageUnavailable) throw new Error('Device storage unavailable');
      storage.delete(key);
    }),
    setShowWizard: set('showWizard'),
    setWizardInitialMode: set('wizardInitialMode'),
    setPendingSync: set('pendingSync'),
    setCanvasRecoveryError: set('canvasRecoveryError'),
    setCanvasRecoveryDecisionMade: set('canvasRecoveryDecisionMade'),
    setCanvasRecoveryDialogMode: set('canvasRecoveryDialogMode'),
    setCanvasRecoverySaveStatus: set('canvasRecoverySaveStatus'),
    setLastSaved: set('lastSaved'),
    setCanvasRecoveryRevision: set('canvasRecoveryRevision'),
    addToast: vi.fn(),
  };
  const run = Function(...Object.keys(deps), handler + '\nreturn startFreshCanvasWorkspace;')(...Object.values(deps));
  return { state, storage, refs, deps, savedWorkspace, run };
}

const wizardVisible = state => state.showWizard && state.hasSelectedRole && state.isTeacherMode;

describe('Start a fresh workspace reopens Quick Start', () => {
  it('opens setup after the previous workspace completed or skipped it', () => {
    const app = freshWorkspace();
    app.run();
    expect(wizardVisible(app.state)).toBe(true);
    expect(app.storage.has('allo_wizard_completed')).toBe(false);
    expect(app.state.wizardInitialMode).toBeNull();
    expect(app.storage.get('unrelated-preference')).toBe('keep');
  });

  it('opens setup after leaving a guided workspace', () => {
    const app = freshWorkspace({ guidedMode: true });
    app.run();
    expect(app.state.guidedMode).toBe(false);
    expect(wizardVisible(app.state)).toBe(true);
  });

  it('keeps setup pending until an initial role choice is made', () => {
    const app = freshWorkspace({ hasSelectedRole: false });
    app.run();
    expect(wizardVisible(app.state)).toBe(false);
    app.state.hasSelectedRole = true;
    expect(wizardVisible(app.state)).toBe(true);
  });

  it('does not force an existing student into teacher setup', () => {
    const app = freshWorkspace({ isTeacherMode: false });
    app.run();
    expect(app.state.isTeacherMode).toBe(false);
    expect(wizardVisible(app.state)).toBe(false);
  });

  it('preserves saved work and invalidates pending saves from the old workspace', () => {
    const app = freshWorkspace();
    const before = JSON.stringify(app.savedWorkspace);
    app.run();
    expect(JSON.stringify(app.refs.canvasRecoveryStoreRef.current.snapshots[0])).toBe(before);
    expect(app.refs.canvasRecoveryCurrentIdRef.current).toBe('fresh-work');
    expect(app.refs.canvasRecoverySaveTokenRef.current).toBe(5);
    expect(app.refs.canvasRecoveryPendingSaveCountRef.current).toBe(0);
    expect(app.deps.clearCanvasWorkspaceState).toHaveBeenCalledOnce();
    expect(app.state.canvasRecoveryDecisionMade).toBe(true);
    expect(app.state.canvasRecoveryDialogMode).toBeNull();
    expect(app.state.pendingSync).toBe(false);
  });

  it('still opens setup when clearing the old preference is unavailable', () => {
    const app = freshWorkspace({ storageUnavailable: true });
    expect(() => app.run()).not.toThrow();
    expect(wizardVisible(app.state)).toBe(true);
    expect(app.state.canvasRecoveryDialogMode).toBeNull();
  });
});
