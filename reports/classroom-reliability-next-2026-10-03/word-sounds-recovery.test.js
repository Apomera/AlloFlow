// Actual host effect/snapshot/default initializers and actual generated handlers.
// Storage is controlled. No host-only globals are injected into the CDN closure.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const hostPath = process.env.ALLO_RECOVERY_HOST_CANDIDATE || 'AlloFlowANTI.txt';
const handlerPath = process.env.ALLO_RECOVERY_HANDLERS_CANDIDATE || 'host_handlers_module.js';
const host = readFileSync(resolve(hostPath), 'utf8').replace(/\r\n/g, '\n');
const handlerArtifact = readFileSync(resolve(handlerPath), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let count = 0; count < 30; count++) await Promise.resolve(); };

function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to <= from || source.indexOf(start, from + start.length) >= 0) {
    throw Error('Missing/ambiguous actual-source boundary: ' + start);
  }
  return source.slice(from, to);
}
function scopeFor(environment) {
  return new Proxy(environment, {
    has: () => true,
    get: (target, name) => name === Symbol.unscopables ? undefined
      : name in target ? target[name] : globalThis[name],
  });
}
const recovery = new Function('window', section(host,
  'const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage')
  + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const snapshotSource = section(host, '  const buildCanvasWorkspaceSnapshot = async ',
  '  const restoreCanvasWorkspaceSnapshot');
const queueSource = section(host, '  const queueCanvasRecoveryStorage = (operation) => {',
  '  useEffect(() => {\n      if (!isCanvas || typeof document');
const effectSource = section(host,
  '  useEffect(() => {\n      if (!isCanvas || !canvasRecoveryDecisionMade || !isHistoryLoaded',
  '  const getSkippedResources =');
const makeSnapshot = new Function('scope', 'with (scope) {\n' + snapshotSource
  + '\nreturn buildCanvasWorkspaceSnapshot;\n}');
const makeQueue = new Function('scope', 'with (scope) {\n' + queueSource
  + '\nreturn queueCanvasRecoveryStorage;\n}');
const mountEffect = new Function('scope', 'with (scope) {\n' + effectSource + '\n}');
const wordSoundsPredicateSource = host.includes('  const hasMeaningfulWordSoundsWorkspace =')
  ? section(host, '  const hasMeaningfulWordSoundsWorkspace =', '  const buildCanvasWorkspaceSnapshot =')
  : null;
const makeWordSoundsPredicate = wordSoundsPredicateSource
  ? new Function('scope', 'with(scope) {\n' + wordSoundsPredicateSource
      + '\nreturn hasMeaningfulWordSoundsWorkspace;\n}')
  : null;

// Evaluate the actual empty-state initializers, including the nonempty date.
const wsDefaults = new Function('getWordSoundsMasteryScopeKey', section(host,
  'const WS_INITIAL_STATE = {', 'function wsReducer(') + '\nreturn WS_INITIAL_STATE;')(() => 'default-en');
function initializedState(start, end, output) {
  const scope = scopeFor({
    window: {}, safeGetItem: () => null, warnLog() {},
    useState: initialize => [typeof initialize === 'function' ? initialize() : initialize, () => {}],
    wordSoundsMasteryScopeKey: wsDefaults.wordSoundsMasteryScopeKey,
  });
  return new Function('scope', 'with(scope) {\n' + section(host, start, end)
    + '\nreturn ' + output + ';\n}')(scope);
}
function emptyWordSounds() {
  return {
    wordSoundsHistory: initializedState('  const [wordSoundsHistory, setWordSoundsHistory]',
      '  const [wsState, wsDispatch]', 'wordSoundsHistory'),
    wordSoundsFamilies: clone(wsDefaults.wordSoundsFamilies),
    wordSoundsAudioLibrary: clone(wsDefaults.wordSoundsAudioLibrary),
    wordSoundsBadges: initializedState('  const [wordSoundsBadges, setWordSoundsBadges]',
      '  const [phonemeMasteryStore, setPhonemeMasteryStore]', 'wordSoundsBadges'),
    phonemeMastery: initializedState('  const [phonemeMasteryStore, setPhonemeMasteryStore]',
      '  const setPhonemeMastery =', 'phonemeMastery'),
    wordSoundsDailyProgress: initializedState('  const [wordSoundsDailyProgress, setWordSoundsDailyProgress]',
      '  const [wordSoundsConfusionPatterns, setWordSoundsConfusionPatterns]', 'wordSoundsDailyProgress'),
    wordSoundsConfusionPatterns: initializedState('  const [wordSoundsConfusionPatterns, setWordSoundsConfusionPatterns]',
      '  const [timeOnTask, setTimeOnTask]', 'wordSoundsConfusionPatterns'),
    wordSoundsScore: clone(wsDefaults.wordSoundsScore),
  };
}

const drafts = [
  ['history', 'wordSoundsHistory', [{ word: 'ship', activity: 'blend', correct: true }], 'history'],
  ['families', 'wordSoundsFamilies', { shortI: ['ship', 'fish'] }, 'families'],
  ['prepared audio', 'wordSoundsAudioLibrary', { ship: 'https://example.test/ship.wav' }, 'audioLibrary'],
  ['earned badges', 'wordSoundsBadges', [{ id: 'blend-10', earned: true }], 'badges'],
  ['phoneme mastery', 'phonemeMastery', { sh: { attempts: 3, correct: 2 } }, 'phonemeMastery'],
  ['completed daily work', 'wordSoundsDailyProgress', { date: 'Sat Oct 03 2026', completed: 4, goalMet: false }, 'dailyProgress'],
  ['daily goal met', 'wordSoundsDailyProgress', { date: 'Sat Oct 03 2026', completed: 0, goalMet: true }, 'dailyProgress'],
  ['confusion patterns', 'wordSoundsConfusionPatterns', { sh_ch: { count: 2 } }, 'confusionPatterns'],
  ['session score', 'wordSoundsScore', { correct: 2, total: 3, streak: 1 }, 'sessionScore'],
];

let React, createRoot, act, previousActEnvironment;
let environment, node, root, durableStore, events, handlers, deviceStorage, controller;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });

function Host() {
  mountEffect(scopeFor({ ...environment, useEffect: React.useEffect }));
  return null;
}
function mount(changes = {}) {
  Object.assign(environment, changes);
  act(() => root.render(React.createElement(Host)));
}
async function advance(delay = 1500) {
  await act(async () => { await vi.advanceTimersByTimeAsync(delay); await flush(); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
  durableStore = recovery.emptyStore();
  events = [];
  deviceStorage = {
    mutateRecovery: vi.fn(async (_namespace, _key, mutation) => {
      if (mutation.action === 'upsert') durableStore = recovery.upsert(durableStore, mutation.snapshot);
      else if (mutation.action === 'remove') durableStore = recovery.remove(durableStore, mutation.snapshotId);
      else throw Error('Unexpected controlled mutation ' + mutation.action);
      return { applied: true, store: clone(durableStore) };
    }),
  };
  controller = {
    upsertSnapshot: vi.fn(async snapshot => {
      events.push('save');
      durableStore = recovery.upsert(durableStore, snapshot);
      return { saved: true, store: { records: durableStore.snapshots.map(item => ({ id: item.id })) } };
    }),
    lock: vi.fn(() => { events.push('lock'); }),
    getStatus: vi.fn(async () => ({ enabled: true, locked: true, snapshotCount: durableStore.snapshots.length })),
    eraseAll: vi.fn(async () => { durableStore = recovery.emptyStore(); }),
  };
  environment = {
    ...emptyWordSounds(), window: {}, navigator: {},
    ALLO_WORKSPACE_RECOVERY: recovery, ALLO_WORKSPACE_RECOVERY_NAMESPACE: 'workspace_recovery',
    ALLO_WORKSPACE_RECOVERY_KEY: 'store_v1',
    isCanvas: true, canvasRecoveryDecisionMade: true, isHistoryLoaded: true, isStorageDisabled: false,
    isTeacherMode: true, activeSessionCode: null, canvasRecoveryRevision: 0,
    canvasRecoveryMutationInProgressRef: { current: false }, canvasRecoverySaveTokenRef: { current: 0 },
    canvasRecoveryPendingSaveCountRef: { current: 0 }, canvasRecoveryImmediateSaveRef: { current: false },
    canvasRecoveryWriteQueueRef: { current: Promise.resolve() }, canvasRecoveryCurrentIdRef: { current: 'word-only' },
    canvasRecoveryStoreRef: { current: recovery.emptyStore() }, canvasRecoveryVaultControllerRef: { current: controller },
    canvasRecoveryVaultImportRef: { current: null }, canvasRecoveryVaultPendingActionRef: { current: null },
    canvasRecoveryVaultState: { enabled: false, locked: false }, canvasRecoveryVaultForm: { eraseConfirmation: 'ERASE' },
    history: [], units: [], profiles: [], studentResponses: {}, studentProgressLog: [], stickers: [],
    selectedProfileId: null, generatedContent: null, activeView: 'input', activeUnitId: 'all', activeSidebarTab: 'create',
    inputText: '', sourceTopic: '', guidedPlanBrief: null, guidedMode: false, guidedStep: 0,
    guidedSelectedIds: [], guidedCompletedIds: [], guidedSkippedIds: [], guidedCreatedHistoryIds: [], guidedDeliveryEvidence: {},
    studentProjectSettings: {}, _alloHasAnyStudentEntry: () => false, _alloMbBridgeActive: () => false,
    _alloCaptureCanvasSelAuthoringState: () => ({ stations: [], toolData: {}, snapshots: [] }),
    _alloNormalizeResearchSettings: value => value, _alloNormalizeStudentProjectSettings: value => value,
    _alloGetCanvasDeviceStorage: async () => deviceStorage, getCanvasRecoveryVaultController: async () => controller,
    syncCanvasRecoveryVaultState: async () => ({ store: clone(durableStore) }),
    publishCanvasRecoveryVaultLockedState: vi.fn(), clearCanvasRecoveryVaultSecrets: vi.fn(), warnLog: vi.fn(),
    addToast: vi.fn(), t: key => key, storageManagerRefreshTokenRef: { current: 0 },
    setStorageManagerInventory: vi.fn(),
    ALLO_STORAGE_INVENTORY: { collectOriginFacts: async () => ({}), collectLocalStorage: () => ({}), collectIdbKeyval: async () => ({}) },
  };
  for (const name of ['setCanvasRecoveryBusyId', 'setCanvasRecoveryError', 'setCanvasRecoveryDialogMode',
    'setCanvasRecoverySaveStatus', 'setLastSaved', 'setPendingSync', 'setCanvasRecoveryStoreAuthoritative',
    'setCanvasRecoveryEraseId', 'setCanvasRecoveryVaultState', 'setCanvasRecoveryDecisionMade']) environment[name] = vi.fn();
  environment.setCanvasRecoveryStore = vi.fn(store => { environment.canvasRecoveryStoreRef.current = store; });
  environment.beginCanvasRecoveryPendingSave = () => { environment.canvasRecoveryPendingSaveCountRef.current++; };
  if (makeWordSoundsPredicate) environment.hasMeaningfulWordSoundsWorkspace = makeWordSoundsPredicate(scopeFor(environment));
  environment.queueCanvasRecoveryStorage = makeQueue(scopeFor(environment));
  environment.buildCanvasWorkspaceSnapshot = vi.fn(makeSnapshot(scopeFor(environment)));
  // The reset itself is a controlled observable dependency; the fixture does not
  // supply a global alias. Calling __d.clearCanvasWorkspaceState is the contract.
  environment.clearCanvasWorkspaceState = vi.fn(options => {
    events.push('clear'); Object.assign(environment, emptyWordSounds(), { history: [] }); return options;
  });
  const moduleWindow = { AlloModules: {}, React: {} };
  const context = vm.createContext({ window: moduleWindow, navigator: {}, console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(handlerArtifact, context, { filename: handlerPath });
  // Live property reads mirror the host getter contract, without copied values.
  const liveDeps = new Proxy({}, { get: (_target, name) => environment[name] });
  handlers = moduleWindow.AlloModules.HostHandlers(liveDeps);
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => {
  act(() => root.unmount()); node.remove(); await flush(); vi.clearAllTimers(); vi.useRealTimers();
});

describe('actual Canvas recovery of Word Sounds-only work', () => {
  it.each(drafts)('autosaves %s with otherwise empty workspace', async (_name, field, value, savedField) => {
    mount({ [field]: clone(value) }); await advance();
    expect(deviceStorage.mutateRecovery).toHaveBeenCalledOnce();
    expect(environment.buildCanvasWorkspaceSnapshot).toHaveBeenCalledWith('word-only');
    expect(durableStore.snapshots).toHaveLength(1);
    expect(durableStore.snapshots[0].workspace.wordSoundsState[savedField]).toEqual(value);
    expect(environment.setCanvasRecoverySaveStatus).toHaveBeenLastCalledWith('saved');
  });
  it('does not autosave untouched defaults, including today’s date and zero score', async () => {
    expect(environment.wordSoundsDailyProgress.date).not.toBe('');
    mount(); await advance();
    expect(environment.buildCanvasWorkspaceSnapshot).not.toHaveBeenCalled();
    expect(deviceStorage.mutateRecovery).not.toHaveBeenCalled();
  });
  it('does not treat a date-only rollover as completed work', async () => {
    mount({ wordSoundsDailyProgress: { date: 'Tomorrow', completed: 0, goalMet: false } }); await advance();
    expect(deviceStorage.mutateRecovery).not.toHaveBeenCalled();
  });
  it('keeps the existing student-entry exclusion for Word Sounds-only work', async () => {
    mount({ wordSoundsHistory: clone(drafts[0][2]), _alloHasAnyStudentEntry: () => true }); await advance();
    expect(deviceStorage.mutateRecovery).not.toHaveBeenCalled();
  });
});

describe('actual generated recovery handlers use live host dependencies', () => {
  it('saves Word Sounds-only work before locking and clearing it', async () => {
    environment.wordSoundsHistory = clone(drafts[0][2]);
    const before = clone(environment.wordSoundsHistory);
    await handlers.lockCanvasRecoveryVault();
    expect(controller.upsertSnapshot).toHaveBeenCalledOnce();
    expect(durableStore.snapshots[0].workspace.wordSoundsState.history).toEqual(before);
    expect(events).toEqual(['save', 'lock', 'clear']);
    expect(environment.wordSoundsHistory).toEqual([]);
    expect(environment.clearCanvasWorkspaceState).toHaveBeenCalledWith({ archivePlan: false });
    expect(environment.setCanvasRecoveryError).not.toHaveBeenCalled();
  });
  it('resolves the host snapshot builder when normal resource history is present', async () => {
    environment.history = [{ id: 'reading', type: 'simplified', data: 'Keep this lesson.' }];
    await handlers.lockCanvasRecoveryVault();
    expect(environment.buildCanvasWorkspaceSnapshot).toHaveBeenCalledWith('word-only');
    expect(durableStore.snapshots[0].workspace.history[0].data).toBe('Keep this lesson.');
    expect(events).toEqual(['save', 'lock', 'clear']);
    expect(environment.setCanvasRecoveryError).not.toHaveBeenCalled();
  });
  it('preserves the latest Word Sounds work and keeps the vault open when its save fails', async () => {
    environment.wordSoundsHistory = clone(drafts[0][2]);
    const before = clone(environment.wordSoundsHistory);
    controller.upsertSnapshot.mockRejectedValueOnce(new Error('Native durable write rejected'));
    await handlers.lockCanvasRecoveryVault();
    // Require the actual save attempt, so an unresolved builder or skipped gate
    // cannot make this failure-path assertion pass without exercising storage.
    expect(environment.buildCanvasWorkspaceSnapshot).toHaveBeenCalledWith('word-only');
    expect(controller.upsertSnapshot).toHaveBeenCalledOnce();
    expect(controller.lock).not.toHaveBeenCalled();
    expect(environment.clearCanvasWorkspaceState).not.toHaveBeenCalled();
    expect(environment.publishCanvasRecoveryVaultLockedState).not.toHaveBeenCalled();
    expect(environment.wordSoundsHistory).toEqual(before);
    expect(durableStore.snapshots).toEqual([]);
    expect(events).toEqual([]);
    expect(environment.setCanvasRecoveryError).toHaveBeenLastCalledWith('Native durable write rejected');
    expect(environment.canvasRecoveryMutationInProgressRef.current).toBe(false);
    expect(environment.setCanvasRecoveryBusyId).toHaveBeenLastCalledWith(null);
  });
  it('locks an untouched empty workspace without inventing a snapshot and still clears through __d', async () => {
    await handlers.lockCanvasRecoveryVault();
    expect(controller.upsertSnapshot).not.toHaveBeenCalled();
    expect(events).toEqual(['lock', 'clear']);
    expect(environment.clearCanvasWorkspaceState).toHaveBeenCalledWith({ archivePlan: false });
    expect(environment.setCanvasRecoveryError).not.toHaveBeenCalled();
  });
  it('clears through the host dependency after verified protected-workspace erase', async () => {
    controller.getStatus.mockResolvedValue({ enabled: false, snapshotCount: 0 });
    await handlers.eraseAllCanvasRecoveryVault();
    expect(controller.eraseAll).toHaveBeenCalledOnce();
    expect(environment.clearCanvasWorkspaceState).toHaveBeenCalledWith({ archivePlan: false });
    expect(environment.setCanvasRecoveryError).toHaveBeenLastCalledWith('');
    expect(environment.setCanvasRecoverySaveStatus).toHaveBeenLastCalledWith('idle');
  });
  it('clears the erased current unprotected workspace through the host dependency', async () => {
    await handlers.eraseCanvasRecoverySnapshot('word-only'); await flush();
    expect(deviceStorage.mutateRecovery).toHaveBeenCalledWith('workspace_recovery', 'store_v1',
      { version: recovery.VERSION, action: 'remove', snapshotId: 'word-only' }, { queue: false });
    expect(environment.clearCanvasWorkspaceState).toHaveBeenCalledWith({ archivePlan: true });
    expect(environment.setCanvasRecoveryError).toHaveBeenLastCalledWith('');
    expect(environment.setCanvasRecoverySaveStatus).toHaveBeenLastCalledWith('idle');
  });
});
