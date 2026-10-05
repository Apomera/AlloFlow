// Behavioral regressions mounted with actual React dependency tracking.
// Canonical host effects/state and verified writer are extracted without edits.
// Storage timing/replies are controlled; this does not certify native IndexedDB.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const host = readFileSync(resolve(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt'), 'utf8').replace(/\r\n/g, '\n');
const utility = readFileSync(resolve(process.env.ALLO_UTILS_CANDIDATE || 'utils_pure_module.js'), 'utf8').replace(/\r\n/g, '\n');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ast = parser.parse(host, { sourceType: 'unambiguous', plugins: ['jsx'] });
const unique = (values, name) => { if (values.length !== 1) throw Error('Missing/ambiguous production test extraction: ' + name); return values[0]; };
const slice = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw Error('Missing production source boundary: ' + startMarker);
  return source.slice(start, end);
};
const effects = [];
traverse(ast, { CallExpression(nodePath) {
  const node = nodePath.node;
  if (node.callee.type === 'Identifier' && node.callee.name === 'useEffect' && nodePath.parentPath.isExpressionStatement()) {
    effects.push(host.slice(nodePath.parentPath.node.start, nodePath.parentPath.node.end));
  }
} });
const saveEffect = unique(effects.filter(source => source.includes('allo_student_work') && source.includes('setStudentWorkStatus') && !source.includes('initLocalData')), 'student autosave effect');
const hydrationEffect = unique(effects.filter(source => source.includes('allo_student_work') && source.includes('initLocalData')), 'learner hydration effect');
const historyHydrationEffect = unique(effects.filter(source => source.includes('const hydrationGeneration = ++localDataHydrationGenerationRef.current') && source.includes('loadLocalData')), 'history hydration effect');
const stateRegion = slice(host, '  const [studentResponses, setStudentResponses] =', '  const generationViewOwnerRef =');
const stateAst = parser.parse(stateRegion, { sourceType: 'script' });
const stateDeclarations = stateAst.program.body.filter(node => node.type === 'VariableDeclaration').map(node => stateRegion.slice(node.start, node.end)).join('\n');
const hydrationOwnership = slice(host, '  const localDataHydrationGenerationRef = useRef(', '  const cancelActiveProjectLoad =');
const gateSource = unique(ast.program.body.filter(node => node.type === 'FunctionDeclaration' && node.id?.name === '_alloShouldSuppressLearnerDeviceStorage'), 'student storage gate');
const gateFactory = new Function('environment', 'with (environment) {\n' + host.slice(gateSource.start, gateSource.end) + '\nreturn _alloShouldSuppressLearnerDeviceStorage;\n}');
const queueSource = slice(host, 'function _alloQueueSequencedWrite(', 'function _alloBeginOwnedAsync(');
const queueWrite = new Function(queueSource + '\nreturn _alloQueueSequencedWrite;')();
const writerSource = slice(utility, 'const writeVerifiedStorageSnapshot =', '// RFC 9110 Retry-After');
const writeVerified = new Function(writerSource + '\nreturn writeVerifiedStorageSnapshot;')();
const renderEffects = new Function('environment', 'with (environment) {\n' + stateDeclarations + '\n' + hydrationOwnership + '\n' + saveEffect + '\nif (environment.includeHistoryEffect) {\n' + historyHydrationEffect + '\n}\n' + hydrationEffect + '\nreturn {responses:studentResponses,status:studentWorkStatus,edit:setStudentResponses,retry:retryStudentWorkSave,invalidate:invalidateLocalDataHydration};\n}');
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const flush = async () => { for (let count = 0; count < 18; count++) await Promise.resolve(); };
const deferred = () => { let resolvePromise; const promise = new Promise(resolve => { resolvePromise = resolve; }); return { promise, resolve: resolvePromise }; };

let React, createRoot, act, previousActEnvironment, previousUtils;
let root, node, latest, environment, flags, storage, saved, readGate, writeGate;
let failRead, mismatchReadback, writeReply;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  previousUtils = window.AlloModules.UtilsPure;
  window.AlloModules.UtilsPure = { ...previousUtils, writeVerifiedStorageSnapshot: writeVerified };
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; window.AlloModules.UtilsPure = previousUtils; });
afterEach(() => {
  if (root) act(() => root.unmount());
  node?.remove();root = null;node = null;
  vi.clearAllTimers();vi.useRealTimers();
});

function Host(props) {
  latest = renderEffects({ ...environment, ...props, useState: React.useState, useRef: React.useRef, useEffect: React.useEffect, useCallback: React.useCallback });
  return null;
}
async function mount(options = {}) {
  vi.useFakeTimers();
  saved = clone(options.saved ?? { existing: { answer: 'Earlier saved response' } });
  if (Object.hasOwn(options, 'saved')) saved = clone(options.saved);
  readGate = options.readGate || null;writeGate = null;failRead = !!options.failRead;
  mismatchReadback = false;writeReply = true;
  flags = { lzLoaded: true, isStorageDisabled: false, isTeacherMode: false, showStudentEntry: false, activeSessionCode: null, isCanvas: false, isHistoryLoaded: true };
  storage = {
    get: vi.fn(async (key, options) => {
      if (key !== 'allo_student_work') return null;
      if (failRead) { if (options?.throwOnError) throw Error('Synthetic storage read failure'); return null; }
      const captured = clone(saved);
      if (readGate) await readGate.promise;
      return mismatchReadback ? { unexpected: { answer: 'Different saved snapshot' } } : captured;
    }),
    set: vi.fn(async (_key, value) => {
      if (writeGate) await writeGate.promise;
      if (writeReply === true) saved = clone(value);
      return writeReply;
    }),
  };
  environment = {
    window, storageDB: storage, _alloQueueSequencedWrite: queueWrite,
    includeHistoryEffect: !!options.includeHistory,
    _alloReadMailboxEntryParam: () => null, setHistory: vi.fn(), hydrateHistory: value => value,
    setIsHistoryLoaded: vi.fn(), setProfiles: vi.fn(), setUnits: vi.fn(), addToastRef: { current: vi.fn() },
    _alloHasAnyStudentEntry: () => false, _alloMbBridgeActive: () => false,
    inputText: 'Keep unrelated draft restoration outside this focused harness',
    setGlobalPoints: vi.fn(), setPointHistory: vi.fn(), setHasSavedAdventure: vi.fn(),
    warnLog: vi.fn(), addToast: vi.fn(), t: key => key,
  };
  environment._alloShouldSuppressLearnerDeviceStorage = gateFactory(environment);
  node = document.createElement('div');document.body.append(node);root = createRoot(node);
  await render();
}
async function render(nextFlags = {}) {
  flags = { ...flags, ...nextFlags };
  await act(async () => { root.render(React.createElement(Host, flags));await flush(); });
}
async function edit(responses) { await act(async () => { latest.edit(responses);await flush(); }); }
async function advance(delay = 1000) { await act(async () => { await vi.advanceTimersByTimeAsync(delay);await flush(); }); }
async function release(gate) { await act(async () => { gate.resolve();await flush(); }); }

describe('learner persistence lifecycle', () => {
  it('keeps an unchanged pending learner draft scheduled across an eligible role change and actual history rehydration', async () => {
    await mount({ includeHistory: true });await edit({ r1: { answer: 'Draft before mode change' } });await advance(500);
    await render({ isTeacherMode: true });await advance(1500);
    expect(saved.r1.answer).toBe('Draft before mode change');expect(latest.status).toBe('saved');
  });

  it('does not publish an old role receipt while its write resolves, then verifies the still-current draft in the new role', async () => {
    await mount({ includeHistory: true });writeGate = deferred();const gate = writeGate;
    await edit({ r1: { answer: 'Started before role change' } });await advance();
    expect(storage.set).toHaveBeenCalledTimes(1);
    await render({ isTeacherMode: true });await release(gate);
    expect(latest.status).not.toBe('saved');
    await advance();
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(saved.r1.answer).toBe('Started before role change');expect(latest.status).toBe('saved');
  });

  it.each([
    ['classroom session', { activeSessionCode: 'SYNTHETIC-CLASS' }, { activeSessionCode: null }],
    ['unavailable storage', { isStorageDisabled: true }, { isStorageDisabled: false }],
    ['storage dependency unloading', { lzLoaded: false }, { lzLoaded: true }],
  ])('retires receipts and blocks queued/retry writes when %s begins during an already-started write', async (_label, blocked, eligible) => {
    await mount();writeGate = deferred();const gate = writeGate;
    await edit({ r1: { answer: 'Already started answer' } });await advance();
    expect(storage.set).toHaveBeenCalledTimes(1);
    await render(blocked);await edit({ r1: { answer: 'New pending answer' } });
    await act(async () => { latest.retry();await flush(); });await advance(1500);
    expect(storage.set).toHaveBeenCalledTimes(1);
    await release(gate);await advance(0);
    // A transaction already begun can land. It cannot announce Saved in the
    // retired context or authorize another write while persistence is blocked.
    expect(saved.r1.answer).toBe('Already started answer');
    expect(latest.status).not.toBe('saved');expect(storage.set).toHaveBeenCalledTimes(1);
    expect(latest.responses.r1.answer).toBe('New pending answer');
    await render(eligible);await advance();
    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(saved.r1.answer).toBe('New pending answer');expect(latest.status).toBe('saved');
  });

  it('retires the current debounce when a learner joins a session without changing the draft', async () => {
    await mount();await edit({ r1: { answer: 'In-app classroom draft' } });await advance(500);
    await render({ activeSessionCode: 'SYNTHETIC-CLASS' });await advance(1500);
    expect(storage.set).not.toHaveBeenCalled();
    expect(latest.responses.r1.answer).toBe('In-app classroom draft');
    expect(latest.status).not.toBe('saved');
  });

  it('blocks a manual retry while the active classroom requires storage suppression', async () => {
    await mount();await edit({ r1: { answer: 'Classroom retry draft' } });
    await render({ activeSessionCode: 'SYNTHETIC-CLASS' });
    await act(async () => { latest.retry();await flush(); });await advance(1500);
    expect(storage.set).not.toHaveBeenCalled();
    expect(latest.responses.r1.answer).toBe('Classroom retry draft');
  });

  it('preserves edits made during a delayed restore while retaining other saved resources', async () => {
    const gate = deferred();await mount({ saved: { r1: { answer: 'Old answer' }, r2: { answer: 'Other resource' } }, readGate: gate });
    await edit({ r1: { answer: 'New answer while restore waits' } });await release(gate);await advance();
    expect(latest.responses).toEqual({ r1: { answer: 'New answer while restore waits' }, r2: { answer: 'Other resource' } });
    expect(saved).toEqual(latest.responses);
  });

  it('schedules the last pending draft when an empty restore finishes without another edit', async () => {
    const gate = deferred();await mount({ saved: null, readGate: gate });
    await edit({ r1: { answer: 'Only edit, before restore' } });await release(gate);await advance();
    expect(storage.set).toHaveBeenCalled();
    expect(saved).toEqual({ r1: { answer: 'Only edit, before restore' } });
    expect(latest.status).toBe('saved');
  });

  it('retires a delayed restore when the workspace explicitly invalidates and clears learner responses', async () => {
    const gate = deferred();await mount({ saved: { r1: { answer: 'Cleared saved answer' } }, readGate: gate });
    await edit({ r1: { answer: 'Cleared in-memory answer' } });
    await act(async () => { latest.invalidate();latest.edit({});await flush(); });
    await release(gate);await advance();
    expect(latest.responses).toEqual({});
    expect(saved).toEqual({});
  });

  it('keeps persistence blocked on restore error and retries without discarding the current draft', async () => {
    await mount({ failRead: true });await edit({ r1: { answer: 'Draft during failed restore' } });await advance();
    expect(storage.set).not.toHaveBeenCalled();
    expect(latest.responses.r1.answer).toBe('Draft during failed restore');
    failRead = false;
    await act(async () => { latest.retry();await flush(); });await advance();
    expect(saved.r1.answer).toBe('Draft during failed restore');
    expect(latest.status).toBe('saved');
  });

  it('does not claim a saved draft when the write has no explicit acknowledgement', async () => {
    await mount();writeReply = undefined;await edit({ r1: { answer: 'Unacknowledged answer' } });await advance();
    expect(latest.status).toBe('error');
    expect(latest.responses.r1.answer).toBe('Unacknowledged answer');
  });

  it('reports a readback mismatch, then saves the same draft on a successful retry', async () => {
    await mount();mismatchReadback = true;await edit({ r1: { answer: 'Keep this answer' } });await advance();
    expect(latest.status).toBe('error');expect(latest.responses.r1.answer).toBe('Keep this answer');
    mismatchReadback = false;
    await act(async () => { latest.retry();await flush(); });await advance();
    expect(latest.status).toBe('saved');expect(saved.r1.answer).toBe('Keep this answer');
    expect(storage.get).toHaveBeenCalledWith('allo_student_work', { throwOnError: true, localOnly: true });
  });

  it('serializes overlapping writes and leaves the newest draft as the verified saved value', async () => {
    await mount();writeGate = deferred();const gate = writeGate;
    await edit({ r1: { answer: 'First answer' } });await advance();
    await edit({ r1: { answer: 'Second answer' } });await advance();
    expect(storage.set).toHaveBeenCalledTimes(1);
    await release(gate);await advance(0);
    expect(saved.r1.answer).toBe('Second answer');
    expect(latest.responses.r1.answer).toBe('Second answer');expect(latest.status).toBe('saved');
  });
});


