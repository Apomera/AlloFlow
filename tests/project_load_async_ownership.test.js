import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');
const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const runtimeStart = source.indexOf('function _createProjectLoadOperationManager');
const runtimeEnd = source.indexOf('const detectClimaxArchetype', runtimeStart);
if (runtimeStart < 0 || runtimeEnd < 0) throw new Error('Project-load runtime markers missing');

const deferred = () => {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
};

const makeRuntime = () => {
  const readers = [];
  class ControlledFileReader {
    constructor() {
      this.aborted = false;
      this.error = null;
      readers.push(this);
    }
    readAsText(file) {
      this.onload({ target: { result: file.contents } });
    }
    abort() {
      this.aborted = true;
      if (typeof this.onabort === 'function') this.onabort();
    }
  }
  const runtime = new Function(
    'window',
    'FileReader',
    'AbortController',
    'localStorage',
    'CustomEvent',
    source.slice(runtimeStart, runtimeEnd)
      + '\nreturn { handleLoadProject, cancelProjectLoad, createManager: _createProjectLoadOperationManager };'
  )(window, ControlledFileReader, AbortController, localStorage, CustomEvent);
  return { ...runtime, readers };
};

const makeProject = (id) => JSON.stringify({
  mode: 'teacher',
  history: [{ id, type: 'lesson-plan', data: { source: id } }],
  builderDraft: { version: 2, id },
});

const makeDeps = (label, restoreBuilderDraft, state) => {
  const projectFileInputRef = { current: { value: `${label}-selected` } };
  const lifecycle = [];
  const toasts = [];
  const deps = {
    setStudentProjectSettings: vi.fn(),
    setHistory: (history) => { state.history = history; },
    hydrateHistory: (history) => history.map((item) => ({ ...item, hydrated: true })),
    restoreBuilderDraft,
    setGeneratedContent: (value) => { state.generatedContent = value; },
    setActiveView: (value) => { state.activeView = value; },
    setIsMapLocked: (value) => { state.mapLocked = value; },
    setStickers: vi.fn(),
    projectFileInputRef,
    addToast: (...args) => toasts.push(args),
    warnLog: vi.fn(),
    t: (key) => key,
    onProjectLoadStart: ({ history }) => lifecycle.push({ phase: 'start', id: history[0]?.id }),
    onProjectLoadComplete: (payload) => lifecycle.push({ phase: 'complete', ...payload }),
  };
  return { deps, lifecycle, projectFileInputRef, toasts };
};

describe('general project-load asynchronous ownership', () => {
  it('prevents deferred A Builder restoration from overwriting B after B owns the load', async () => {
    const { handleLoadProject, readers } = makeRuntime();
    const state = {};
    const restoreA = deferred();
    let ownershipA = null;
    const a = makeDeps('A', (_draft, _history, ownership) => {
      ownershipA = ownership;
      return restoreA.promise;
    }, state);
    const b = makeDeps('B', async () => true, state);

    const ownerA = handleLoadProject(
      { target: { files: [{ contents: makeProject('A') }] } },
      a.deps
    );
    expect(state.history[0].id).toBe('A');
    expect(ownershipA).toBeTruthy();

    const ownerB = handleLoadProject(
      { target: { files: [{ contents: makeProject('B') }] } },
      b.deps
    );
    expect(ownerA.signal.aborted).toBe(true);
    expect(readers[0].aborted).toBe(true);
    expect(a.lifecycle).toEqual([
      { phase: 'start', id: 'A' },
      { phase: 'complete', success: false, cancelled: true },
    ]);

    await vi.waitFor(() => {
      expect(b.lifecycle).toContainEqual({ phase: 'complete', success: true });
    });
    expect(state.history[0].id).toBe('B');
    expect(state.generatedContent.id).toBe('B');
    expect(ownerB.signal.aborted).toBe(false);
    expect(b.projectFileInputRef.current.value).toBe('');

    restoreA.resolve(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(ownershipA.isCurrent()).toBe(false);
    expect(state.history[0].id).toBe('B');
    expect(state.generatedContent.id).toBe('B');
    expect(a.projectFileInputRef.current.value).toBe('A-selected');
    expect(a.lifecycle).toHaveLength(2);
    expect(a.toasts.some(([message]) => message === 'toasts.project_loaded')).toBe(false);
    expect(b.toasts.some(([message]) => message === 'toasts.project_loaded')).toBe(true);
  });

  it('suppresses a late encrypted A result before its lifecycle or setters start', async () => {
    const { handleLoadProject } = makeRuntime();
    const state = {};
    const decryptA = deferred();
    const decryptJSON = vi.fn(() => decryptA.promise);
    window.AlloModules = {
      AlloCrypto: {
        isEncryptedEnvelope: (value) => value?.encrypted === true,
        decryptJSON,
      },
    };
    window.AlloFlowUX = { prompt: vi.fn(async () => 'password') };
    const a = makeDeps('A', async () => true, state);
    const b = makeDeps('B', async () => true, state);

    const ownerA = handleLoadProject(
      { target: { files: [{ contents: JSON.stringify({ encrypted: true }) }] } },
      a.deps
    );
    await vi.waitFor(() => expect(decryptJSON).toHaveBeenCalledTimes(1));

    handleLoadProject(
      { target: { files: [{ contents: makeProject('B') }] } },
      b.deps
    );
    await vi.waitFor(() => {
      expect(b.lifecycle).toContainEqual({ phase: 'complete', success: true });
    });
    decryptA.resolve(JSON.parse(makeProject('A')));
    await Promise.resolve();
    await Promise.resolve();

    expect(ownerA.signal.aborted).toBe(true);
    expect(a.lifecycle).toEqual([]);
    expect(state.history[0].id).toBe('B');
    expect(state.generatedContent.id).toBe('B');
    expect(a.toasts).toEqual([]);
    delete window.AlloFlowUX;
    window.AlloModules = {};
  });

  it('does not finalize a lifecycle that failed to acquire ownership', () => {
    const { createManager } = makeRuntime();
    const onComplete = vi.fn();
    const manager = createManager();
    const owner = manager.begin({
      onStart: () => { throw new Error('another recovery mutation owns the host'); },
      onComplete,
    });
    expect(() => manager.startLifecycle(owner, {})).toThrow('another recovery mutation owns the host');
    expect(owner.lifecycleStarted).toBe(false);
    expect(manager.finish(owner, false)).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('wires reset/unmount cancellation and guards the host Builder commit', () => {
    expect(source).toContain('cancelProjectLoad,');
    expect(source).toContain('signal: projectLoadOwner.signal');
    expect(source).toContain('if (!projectLoadIsCurrent()) return;');
    expect(host).toContain('cancelActiveProjectLoad({ notifyLifecycle: false });');
    expect(host).toContain("cancelActiveProjectLoad();\n    cancelActiveFileIntakeOperations('new-pdf-audit');");
    expect(host).toContain("cancelActiveProjectLoad();\n      cancelActiveFileIntakeOperations('canvas-workspace-clear');");
    expect(host).toContain("cancelActiveProjectLoad();\n    cancelActiveFileIntakeOperations('workspace-clear');");
    expect(host).toContain('if (!restoreIsCurrent()) return false;');
  });
});
