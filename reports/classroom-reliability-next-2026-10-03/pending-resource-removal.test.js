import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const { createSession } = require(resolve('reader_support_drafts.js'));
const source = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0 || source.split(start).length !== 2) throw new Error('Pending removal production boundary drift: ' + start);
  return source.slice(from, to);
}
const chunks = new Function(section('function _alloPruneResChunks(', '// Non-trickle ICE:') + '\nreturn {collect:_alloCollectResChunk, finish:_alloFinishResChunk, markRemoved:_alloMarkRemovedResChunks};')();
const state = section('  const homeworkQrDialogRef = useRef(null);', '  const buildAlloShareUrl = useCallback(');
const draftRequest = section('  const supportDraftSessionRef = useRef(null);', '  useEffect(() => {');
const receiver = section('  const applyMbDownPayload = useCallback(', '  const createHomeworkAssignmentLink = useCallback(');
const clearHistory = section('  const handleClearHistory = () => {', '  const sanitizeSubmissionData =');
const clearCanvas = section('  const clearCanvasWorkspaceState = (options = {}) => {', '\n  };\n') + '\n  };\n';
const wrapper = section('  const pendingQrAssignmentOpenGenerationRef = useRef(0);', '  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE');
const context = section('  const historyOpenRequestRef = useRef(0);', '  const handleOpenHistoryResource = async');
const opener = section('  useEffect(() => {\n      if (!pendingQrAssignmentResource || isTeacherMode) return;', '  useEffect(() => {');
const transportSource = readFileSync(process.env.SESSION_TRANSPORT_CANDIDATE || 'session_transport_module.js', 'utf8');
const mounts = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const item = (id, title) => ({ id, title, type: 'simplified', data: 'A learner reading: ' + title });
const packet = (rid, resource, open = true) => ({ kind: 'res', rid, part: 1, of: 1, data: JSON.stringify(resource), open, quiet: true });
const removal = (...ids) => ({ kind: 'res-remove', ids });
const flush = async () => { for (let index = 0; index < 6; index += 1) await Promise.resolve(); };

async function mount({ ready = true, dirty = false } = {}) {
  const draftSession = createSession();
  const controller = { current: null, dirty, transition: null, draftSession,
    api: { handleRestoreView: vi.fn() }, restoreDeps: { marker: 'current-host-deps' }, addToast: vi.fn(), warnLog: vi.fn() };
  draftSession.register({ hasChanges: () => controller.dirty, defer: transition => { controller.transition = transition; } });
  window.AlloModules = { PureHelpers: {}, PhaseNHelpers: {}, TextUtilityHelpers: {}, ...(ready ? { MiscHandlers: controller.api } : {}) };
  new Function('window', transportSource)(window);
  const projection = resources => window.AlloModules.SessionTransport.studentSafeResources(resources, []);
  let resolveLazy;
  const lazyPromise = new Promise(resolve => { resolveLazy = resolve; });
  window.__alloEnsureLazyModule = vi.fn(() => lazyPromise);
  window.__alloPromoteModule = vi.fn(); window.__alloLazyFileIntake = vi.fn(); window.__alloRetryFailedModules = vi.fn();
  const Component = new Function('React', 'window', 'chunks', 'projection', 'controller', `
    const {useState, useRef, useEffect, useCallback} = React;
    return function ActualPendingResourceHarness() {
      const [history, setHistory] = useState([]);
      const [receivedDeliveryResources, setReceivedDeliveryResources] = useState([]);
      const [generatedContent, setGeneratedContent] = useState(null);
      const [activeView, setActiveView] = useState('input');
      const [inputText, setInputText] = useState('Current learner writing');
      const [activeSidebarTab, setActiveSidebarTab] = useState('history');
      const hydratedHistoryRef = useRef(history);
      const [mbResourceReceiveError, setMbResourceReceiveError] = useState(false);
      const mbChunkStoreRef = useRef({parts:{}, applied:new Set()});
      const mbStudentCursorRef = useRef(20);
      const bootHistoryHydrationRef = useRef(null);
      const generationDisplayStateRef = useRef(null);
      const addToast = controller.addToast, warnLog = controller.warnLog;
      const _alloCollectResChunk = chunks.collect, _alloFinishResChunk = chunks.finish, _alloMarkRemovedResChunks = chunks.markRemoved;
      const _alloDecodeAlloPack = async value => value;
      const _alloStudentSafeResources = projection;
      const _alloMiscHandlersDeps = () => controller.restoreDeps;
      const t = key => key;
      const workspacePane = 'input';
      const isTeacherMode = false, isParentMode = false, isIndependentMode = false, activeSessionCode = 'CLASS', activeSessionAppId = 'class-app';
      const cancelActiveProjectLoad = () => {}, cancelActiveFileIntakeOperations = () => {}, invalidateLocalDataHydration = () => {}, resetAllMathRuntimeState = () => {}, setFullPackRun = () => {};
      const setSourceTopic = () => {}, setSelectedOwnSourceIds = () => {}, setDocumentsOnly = () => {}, setUseOwnSources = () => {}, setIncludeSourceCitations = () => {},
        setUnits = () => {}, setProfiles = () => {}, setActiveUnitId = () => {}, setPersistedLessonDNA = () => {}, archiveLivePlan = () => {},
        setActiveBlueprint = () => {}, setBlueprintExecutionResult = () => {}, resetCanvasWorkspaceSettings = () => {}, setStudentProgressLog = () => {},
        setStickers = () => {}, setGuidedMode = () => {}, resetGuidedProgress = () => {}, setAdventureState = () => {}, setHasSavedAdventure = () => {},
        setWordSoundsHistory = () => {}, wsDispatch = () => {}, setWordSoundsBadges = () => {}, setPhonemeMastery = () => {},
        setWordSoundsDailyProgress = () => {}, setWordSoundsConfusionPatterns = () => {};
      const ADVENTURE_INITIAL = {};
      ${state}
      ${draftRequest}
      supportDraftSessionRef.current = controller.draftSession;
      ${receiver}
      ${clearHistory}
      ${clearCanvas}
      ${wrapper}
      ${context}
      ${opener}
      controller.current = {apply:applyMbDownPayload, clearHistory:handleClearHistory, clearCanvas:clearCanvasWorkspaceState,
        hydrate:normalized => { bootHistoryHydrationRef.current = {previous:history, current:normalized}; setHistory(normalized); },
        pending:pendingQrAssignmentResource, setPending:setPendingQrAssignmentResource,
        history, received:receivedDeliveryResources, generation:pendingQrAssignmentOpenGenerationRef,
        pendingRef:typeof pendingQrAssignmentResourceRef === 'undefined' ? null : pendingQrAssignmentResourceRef};
      return React.createElement('output', {'data-pending-id':pendingQrAssignmentResource?.id || ''}, JSON.stringify(history.map(resource=>resource.id)));
    };
  `)(React, window, chunks, projection, controller);
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host); mounts.push({ root, host });
  await act(async () => { root.render(React.createElement(Component)); await flush(); });
  controller.ready = () => {
    window.AlloModules.MiscHandlers = controller.api;
    resolveLazy(); window.dispatchEvent(new Event('alloflow:module-registry-changed'));
  };
  controller.deliver = async (rid, resource, open = true) => act(async () => { await controller.current.apply(packet(rid, resource, open)); await flush(); });
  return controller;
}
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); }
  for (const key of ['__alloEnsureLazyModule', '__alloPromoteModule', '__alloLazyFileIntake', '__alloRetryFailedModules']) delete window[key];
  window.AlloModules = {}; vi.restoreAllMocks();
});

describe('actual mounted mailbox removal and queued resource opener', () => {
  it('retires a removed dirty-draft callback synchronously before React cleanup commits', async () => {
    const h = await mount({ dirty: true }), resource = item('picture', 'Removed while draft confirmation waits');
    await h.deliver('old-rid', resource);
    const transition = h.transition;
    expect(transition).toBeTruthy(); expect(h.current.pending).toEqual(resource); expect(h.api.handleRestoreView).not.toHaveBeenCalled();
    await act(async () => {
      await h.current.apply(removal('picture'));
      h.dirty = false; transition.run();
      expect(h.api.handleRestoreView).not.toHaveBeenCalled();
      await flush();
    });
    expect(h.current.pending).toBeNull(); expect(h.current.history).toEqual([]); expect(h.current.received).toEqual([]);
  });

  it('retires a removed lazy open before a registry event can run its pre-cleanup callback', async () => {
    const h = await mount({ ready: false }), resource = item('picture', 'Removed while modules load');
    await h.deliver('old-rid', resource);
    expect(window.__alloEnsureLazyModule).toHaveBeenCalled(); expect(h.api.handleRestoreView).not.toHaveBeenCalled();
    await act(async () => {
      await h.current.apply(removal('picture'));
      h.ready();
      expect(h.api.handleRestoreView).not.toHaveBeenCalled();
      await flush();
    });
    expect(h.current.pending).toBeNull(); expect(h.current.history).toEqual([]);
  });

  it('keeps a delivery removed in the same React batch from becoming the first automatic open', async () => {
    const h = await mount(), resource = item('picture', 'Delivery followed by removal before effects');
    await act(async () => {
      await h.current.apply(packet('old-rid', resource));
      await h.current.apply(removal('picture'));
      await flush();
    });
    expect(h.current.history).toEqual([]); expect(h.current.received).toEqual([]); expect(h.current.pending).toBeNull();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled();
  });

  it('keeps an unrelated removal from abandoning the current pending resource when modules become ready', async () => {
    const h = await mount({ ready: false }), unrelated = item('other', 'Other pack resource'), waiting = item('picture', 'Still shared and still waiting');
    await h.deliver('other-rid', unrelated, false); await h.deliver('waiting-rid', waiting);
    await act(async () => { await h.current.apply(removal('other')); await flush(); });
    expect(h.current.history).toEqual([waiting]); expect(h.current.pending).toEqual(waiting);
    await act(async () => { h.ready(); await flush(); });
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(waiting, { suppressLiveFollow: true }, h.restoreDeps);
    expect(h.current.pending).toBeNull();
  });

  it('allows a fresh same-ID delivery after retiring a removed receipt and its old draft callback', async () => {
    const h = await mount({ dirty: true }), removed = item('picture', 'Old removed receipt'), fresh = item('picture', 'Fresh deliberate share');
    await h.deliver('old-rid', removed);
    const transition = h.transition;
    await act(async () => {
      await h.current.apply(removal('picture'));
      h.dirty = false; transition.run(); await flush();
    });
    await h.deliver('fresh-rid', fresh);
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(fresh, { suppressLiveFollow: true }, h.restoreDeps);
    expect(h.current.history).toEqual([fresh]); expect(h.current.received).toEqual([fresh]); expect(h.current.pending).toBeNull();
  });

  it('retires an old same-resource receipt callback as soon as a replacement is queued, before effect cleanup', async () => {
    const h = await mount({ dirty: true }), old = item('picture', 'Earlier receipt'), fresh = item('picture', 'Replacement receipt');
    await h.deliver('old-rid', old);
    const oldTransition = h.transition;
    await act(async () => {
      await h.current.apply(packet('fresh-rid', fresh));
      h.dirty = false; oldTransition.run();
      expect(h.api.handleRestoreView.mock.calls.some(([resource]) => resource.title === old.title)).toBe(false);
      await flush();
    });
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(fresh, { suppressLiveFollow: true }, h.restoreDeps);
    expect(h.current.pending).toBeNull(); expect(h.current.history).toEqual([fresh]);
  });

  it('retires queued homework when the actual learner Clear history action runs before draft confirmation', async () => {
    const h = await mount({ dirty: true }), resource = item('picture', 'Cleared while confirmation waits');
    await h.deliver('old-rid', resource);
    const transition = h.transition;
    await act(async () => {
      h.current.clearHistory(); h.dirty = false; transition.run();
      expect(h.api.handleRestoreView).not.toHaveBeenCalled();
      await flush();
    });
    expect(h.current.history).toEqual([]); expect(h.current.pending).toBeNull();
  });

  it('distinguishes A-to-null-to-the-same-A ownership in one batch and ignores its old callback', async () => {
    const h = await mount({ dirty: true });
    await h.deliver('old-rid', item('picture', 'Same exact object queued again'));
    const sameResource = h.current.pending, transition = h.transition;
    await act(async () => {
      h.current.setPending(null); h.current.setPending(sameResource);
      h.dirty = false; transition.run();
      expect(h.api.handleRestoreView).not.toHaveBeenCalled();
      await flush();
    });
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(sameResource, { suppressLiveFollow: true }, h.restoreDeps);
    expect(h.current.pending).toBeNull();
  });

  it('preserves a newer same-object token queued synchronously by restore before the previous success clear', async () => {
    const h = await mount({ ready: false });
    await h.deliver('old-rid', item('picture', 'Restore queues the same exact object again'));
    const resource = h.current.pending;
    h.api.handleRestoreView.mockImplementationOnce(() => {
      h.current.setPending(resource); h.dirty = true;
    });
    await act(async () => { h.ready(); await flush(); });
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(resource, { suppressLiveFollow: true }, h.restoreDeps);
    expect(h.current.pending).toBe(resource); expect(h.transition).toBeTruthy();
    await act(async () => { h.dirty = false; h.transition.run(); await flush(); });
    expect(h.api.handleRestoreView).toHaveBeenCalledTimes(2); expect(h.current.pending).toBeNull();
  });

  it('opens the normalized boot-history artifact while clearing the original raw pending owner', async () => {
    const h = await mount({ ready: false });
    await h.deliver('old-rid', item('picture', 'Raw legacy receipt'));
    const original = h.current.pending, normalized = { ...original, data: 'Hydrated exact reading', dataEncoding: 'text/v1' };
    await act(async () => { h.current.hydrate([normalized]); await flush(); });
    expect(h.current.pending).toBe(original); expect(h.current.history).toEqual([normalized]);
    await act(async () => { h.ready(); await flush(); });
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(normalized, { suppressLiveFollow: true }, h.restoreDeps);
    expect(h.current.pending).toBeNull(); expect(h.current.history).toEqual([normalized]);
  });

  it('retires pending homework through the actual Canvas workspace clear before draft confirmation', async () => {
    const h = await mount({ dirty: true });
    await h.deliver('old-rid', item('picture', 'Canvas workspace cleared'));
    const transition = h.transition;
    await act(async () => {
      h.current.clearCanvas({ archivePlan: false }); h.dirty = false; transition.run();
      expect(h.api.handleRestoreView).not.toHaveBeenCalled(); await flush();
    });
    expect(h.current.history).toEqual([]); expect(h.current.pending).toBeNull();
  });
});
