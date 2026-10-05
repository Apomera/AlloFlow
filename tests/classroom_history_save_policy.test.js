// Mounts the production host effect: React owns its actual dependency tracking.
// Only the storage adapter is controlled; sequencing and verified writes are real.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const hostPath = process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt';
const utilityPath = process.env.ALLO_UTILS_CANDIDATE || 'utils_pure_source.jsx';
const host = readFileSync(resolve(hostPath), 'utf8').replace(/\r\n/g, '\n');
const utility = readFileSync(resolve(utilityPath), 'utf8').replace(/\r\n/g, '\n');

function extract(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw Error('Missing production test boundary: ' + startMarker);
  return source.slice(start, end);
}

const effectSource = extract(host, '  const offlineHistoryWriteRef = useRef(',
  '  useEffect(() => {\n      const owner = offlineProfileWriteRef.current;');
const queueSource = extract(host, 'function _alloQueueSequencedWrite(', 'function _alloBeginOwnedAsync(');
const writerSource = extract(utility, 'const writeVerifiedStorageSnapshot =', '// RFC 9110 Retry-After');
const queueWrite = new Function(queueSource + '\nreturn _alloQueueSequencedWrite;')();
const writeVerified = new Function(writerSource + '\nreturn writeVerifiedStorageSnapshot;')();
const renderEffect = new Function('environment', 'with (environment) {\n' + effectSource + '\nreturn offlineHistoryWriteRef;\n}');
const clone = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let count = 0; count < 10; count++) await Promise.resolve(); };
const deferred = () => {
  let resolvePromise;
  const promise = new Promise(resolve => { resolvePromise = resolve; });
  return { promise, resolve: resolvePromise };
};
const transitions = [
  ['disabled storage', { isStorageDisabled: true }, { isStorageDisabled: false }],
  ['Canvas recovery mode', { isCanvas: true }, { isCanvas: false }],
];

let React, createRoot, act, previousActEnvironment;
let root, node, environment, storage, history, flags, ownerRef, savedSnapshot, persistenceEvent;
let previousUtils, previousMediaReceipt;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });

function Host(props) {
  ownerRef = renderEffect({ ...environment, ...props, useRef: React.useRef, useEffect: React.useEffect });
  return null;
}
function render(nextFlags = {}, nextHistory = history) {
  flags = { ...flags, ...nextFlags };
  history = nextHistory;
  act(() => root.render(React.createElement(Host, { ...flags, history })));
}
async function advance(delay = 1000) {
  await act(async () => { await vi.advanceTimersByTimeAsync(delay); await flush(); });
}
async function finish(gate) {
  await act(async () => { gate.resolve(); await flush(); await ownerRef.current.chain; await flush(); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-02T12:00:00.000Z'));
  history = [{ id: 'lesson-A', type: 'simplified', title: 'Lesson A', data: 'Original lesson.' }];
  flags = {
    isHistoryLoaded: true, isStorageDisabled: false, isCanvas: false,
    isTeacherMode: true, activeSessionCode: null, isOnline: false, lzLoaded: true, canvasRecoveryRevision: 0,
  };
  savedSnapshot = null;
  storage = {
    set: vi.fn(async (_key, value) => { savedSnapshot = clone(value); return true; }),
    get: vi.fn(async () => clone(savedSnapshot)),
  };
  previousUtils = window.AlloModules.UtilsPure;
  previousMediaReceipt = window.__alloOfflineMediaPersistence;
  window.AlloModules.UtilsPure = { writeVerifiedStorageSnapshot: writeVerified };
  delete window.__alloOfflineMediaPersistence;
  persistenceEvent = vi.fn();
  window.addEventListener('alloflow:offline-media-persistence', persistenceEvent);
  environment = {
    window, CustomEvent, storageDB: storage, _alloQueueSequencedWrite: queueWrite,
    canvasRecoveryStoreRef: { current: { retentionPolicy: 'automatic', effectiveRetentionPolicy: 'standard' } },
    ALLO_WORKSPACE_RECOVERY: { resolvePolicy: () => ({ maxOfflineItems: 50 }) },
    setPendingSync: vi.fn(), setLastSaved: vi.fn(), warnLog: vi.fn(), addToast: vi.fn(), t: key => key,
  };
  node = document.createElement('div');
  document.body.append(node);
  root = createRoot(node);
  render();
});
afterEach(() => {
  act(() => root.unmount());
  node.remove();
  window.removeEventListener('alloflow:offline-media-persistence', persistenceEvent);
  window.AlloModules.UtilsPure = previousUtils;
  if (previousMediaReceipt === undefined) delete window.__alloOfflineMediaPersistence;
  else window.__alloOfflineMediaPersistence = previousMediaReceipt;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('mounted host history-save eligibility', () => {
  it('writes and acknowledges an eligible current snapshot only after exact local readback', async () => {
    expect(storage.set).not.toHaveBeenCalled();
    await advance();
    expect(storage.set).toHaveBeenCalledOnce();
    expect(storage.set.mock.calls[0][0]).toBe('allo_offline_history');
    expect(storage.set.mock.calls[0][2]).toEqual({ throwOnError: true });
    expect(JSON.parse(savedSnapshot.items[0].data)).toBe('Original lesson.');
    expect(storage.get).toHaveBeenCalledWith('allo_offline_history', { throwOnError: true, localOnly: true });
    expect(window.__alloOfflineMediaPersistence).toMatchObject({ status: 'saved', verified: true });
    expect(environment.setLastSaved).toHaveBeenCalledOnce();
    expect(environment.setLastSaved.mock.calls[0][0].toISOString()).toBe('2026-10-02T12:00:01.000Z');
    expect(persistenceEvent).toHaveBeenCalledOnce();
    expect(environment.setPendingSync).toHaveBeenLastCalledWith(false);
  });

  it.each(transitions)('retires a pending debounce on entering %s without a history change', async (_label, blocked) => {
    const unchangedHistory = history;
    await advance(500);
    render(blocked);
    expect(history).toBe(unchangedHistory);
    await advance(1500);
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage.get).not.toHaveBeenCalled();
    expect(environment.setLastSaved).not.toHaveBeenCalled();
    expect(persistenceEvent).not.toHaveBeenCalled();
    expect(environment.setPendingSync).toHaveBeenLastCalledWith(false);
  });

  it.each(transitions)('does not publish stale saved status when %s begins during an in-flight write', async (_label, blocked) => {
    const writeGate = deferred();
    storage.set.mockImplementationOnce(async (_key, value) => {
      await writeGate.promise;
      savedSnapshot = clone(value);
      return true;
    });
    await advance();
    expect(storage.set).toHaveBeenCalledOnce();
    render(blocked);
    await finish(writeGate);
    // An adapter write already in flight cannot be undone. It must lose its
    // acknowledgement before readback, saved time or a verified media event.
    expect(storage.get).not.toHaveBeenCalled();
    expect(environment.setLastSaved).not.toHaveBeenCalled();
    expect(persistenceEvent).not.toHaveBeenCalled();
    expect(window.__alloOfflineMediaPersistence).toBeUndefined();
    expect(environment.setPendingSync).toHaveBeenLastCalledWith(false);
  });

  it.each(transitions)('starts a fresh eligible save when leaving %s with the same history array', async (_label, blocked, eligible) => {
    const unchangedHistory = history;
    render(blocked);
    await advance();
    expect(storage.set).not.toHaveBeenCalled();
    render(eligible);
    expect(history).toBe(unchangedHistory);
    await advance();
    expect(storage.set).toHaveBeenCalledOnce();
    expect(JSON.parse(savedSnapshot.items[0].data)).toBe('Original lesson.');
    expect(environment.setLastSaved).toHaveBeenCalledOnce();
    expect(window.__alloOfflineMediaPersistence).toMatchObject({ status: 'saved', verified: true });
  });

  it('drops an obsolete queued snapshot and saves the newer edit after the preceding writer settles', async () => {
    const precedingWrite = deferred();
    ownerRef.current.chain = precedingWrite.promise;
    await advance();
    expect(storage.set).not.toHaveBeenCalled();
    render({}, [{ ...history[0], data: 'Newer edit.' }]);
    await advance();
    expect(storage.set).not.toHaveBeenCalled();
    await finish(precedingWrite);
    expect(storage.set).toHaveBeenCalledOnce();
    expect(JSON.parse(savedSnapshot.items[0].data)).toBe('Newer edit.');
    expect(environment.setLastSaved).toHaveBeenCalledOnce();
    expect(persistenceEvent).toHaveBeenCalledOnce();
    expect(environment.setPendingSync).toHaveBeenLastCalledWith(false);
  });

  it('reports a readback mismatch without publishing a successful saved status', async () => {
    storage.get.mockResolvedValue({ items: [{ id: 'different-snapshot' }] });
    await advance();
    expect(storage.set).toHaveBeenCalledOnce();
    expect(window.__alloOfflineMediaPersistence).toMatchObject({ status: 'failed', verified: false, code: 'storage-readback-mismatch' });
    expect(environment.setLastSaved).not.toHaveBeenCalled();
    expect(environment.addToast).toHaveBeenCalledWith(expect.stringContaining('could not be verified'), 'error');
    expect(environment.setPendingSync).toHaveBeenLastCalledWith(false);
  });
});
