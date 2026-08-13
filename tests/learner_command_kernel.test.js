import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let AC;
const unregister = [];

beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (fn) => fn,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
});

afterEach(() => {
  while (unregister.length) unregister.pop()();
});
afterAll(() => vi.unstubAllGlobals());

describe('learner command adapter registry', () => {
  it('validates adapter contracts and publishes bounded capability/state snapshots', () => {
    expect(() => AC.createLearnerCommandAdapter({ id: 'bad id', getCommands: () => [] })).toThrow(/stable id/i);
    expect(() => AC.createLearnerCommandAdapter({ id: 'missing-commands' })).toThrow(/getCommands/i);

    unregister.push(AC.registerCommandScope({
      id: 'test-prep',
      priority: 50,
      isActive: (ctx) => !!ctx.testPrepHubOpen,
      getCapabilities: () => ({ speechInput: true, callback: () => 'not exposed' }),
      getState: () => ({ phase: 'question', prompt: 'x'.repeat(300) }),
      getCommands: () => [{ id: 'choose_option', params: ['choice'], risk: 'state-change' }],
    }));

    expect(AC.listActiveCommandScopes({ testPrepHubOpen: false })).toEqual([]);
    const snapshot = AC.getLearnerContextSnapshot({ isTeacherMode: false, testPrepHubOpen: true });
    expect(snapshot).toMatchObject({ audience: 'student', activeScopeIds: ['test-prep'] });
    expect(snapshot.scopes[0].commandIds).toEqual(['choose_option']);
    expect(snapshot.scopes[0].capabilities).toEqual({ speechInput: true });
    expect(snapshot.scopes[0].state.prompt).toHaveLength(240);
  });

  it('uses priority and protects a replacement registration from stale cleanup', async () => {
    const lowRun = vi.fn();
    const highRun = vi.fn(() => 'High-priority action ran.');
    const staleCleanup = AC.registerCommandScope({
      id: 'same-surface', priority: 1,
      getCommands: () => [{ id: 'advance', run: lowRun }],
      parse: () => ({ commandId: 'advance' }),
    });
    const replacementCleanup = AC.registerCommandScope({
      id: 'same-surface', priority: 10,
      getCommands: () => [{ id: 'advance', run: highRun }],
      parse: () => ({ commandId: 'advance' }),
    });
    unregister.push(replacementCleanup);
    expect(staleCleanup()).toBe(false);

    const kernel = AC.createCommandKernel({}, { channel: 'voice' });
    const result = await kernel.handleUtterance('next', { allowAi: false });
    expect(result).toMatchObject({ handled: true, scopeId: 'same-surface', commandId: 'advance' });
    expect(highRun).toHaveBeenCalledTimes(1);
    expect(lowRun).not.toHaveBeenCalled();
  });
});

describe('learner command kernel safety', () => {
  it('confines single-letter assessment grammar to an active scope', async () => {
    const execute = vi.fn(() => ({ handled: true, changed: true, narration: 'Choice A selected.' }));
    let active = false;
    unregister.push(AC.registerCommandScope({
      id: 'assessment', priority: 100,
      isActive: () => active,
      getCommands: () => [{ id: 'choose_option', params: ['choice'], risk: 'state-change' }],
      parse: (text) => /^a$/i.test(text) ? { commandId: 'choose_option', params: { choice: 'A' }, confidence: 0.96 } : null,
      execute,
    }));
    const kernel = AC.createCommandKernel({}, { channel: 'voice' });
    expect(await kernel.handleUtterance('A', { allowAi: false })).toBeNull();
    expect(execute).not.toHaveBeenCalled();

    active = true;
    const result = await kernel.handleUtterance('A', { allowAi: false });
    expect(result).toMatchObject({ handled: true, changed: true, scopeId: 'assessment' });
    expect(execute).toHaveBeenCalledWith('choose_option', { choice: 'A' }, {}, expect.objectContaining({ confidence: 0.96 }));
  });

  it('keeps destructive params private, confirms the exact sanitized action, and supports cancellation', () => {
    const execute = vi.fn(() => 'Answers cleared.');
    unregister.push(AC.registerCommandScope({
      id: 'quiz',
      getCommands: () => [{
        id: 'clear_answers', params: ['answer'], risk: 'destructive',
        confirmMessage: 'Clear every answer? Say yes or no.',
      }],
      execute,
    }));
    const kernel = AC.createCommandKernel({}, { channel: 'voice' });
    const pending = kernel.execute('clear_answers', { answer: 'private response', ignored: 'drop' }, { scopeId: 'quiz' });
    expect(pending).toMatchObject({ confirmationRequired: true, risk: 'destructive' });
    expect(execute).not.toHaveBeenCalled();
    expect(JSON.stringify(kernel.getState())).not.toContain('private response');
    expect(kernel.confirm('maybe')).toMatchObject({ clarification: true, confirmationRequired: true });
    expect(kernel.confirm('no')).toMatchObject({ cancelled: true });
    expect(execute).not.toHaveBeenCalled();

    kernel.execute('clear_answers', { answer: 'private response', ignored: 'drop' }, { scopeId: 'quiz' });
    const done = kernel.confirm('yes');
    expect(done).toMatchObject({ handled: true, scopeId: 'quiz', narration: 'Answers cleared.' });
    expect(execute).toHaveBeenCalledWith('clear_answers', { answer: 'private response' }, {}, expect.objectContaining({ confirmed: true }));
  });

  it('requires confirmation for low-confidence state changes and fails closed after expiry', () => {
    let clock = 1000;
    const execute = vi.fn(() => 'Selected.');
    unregister.push(AC.registerCommandScope({
      id: 'practice',
      getCommands: () => [{ id: 'choose', params: ['choice'], risk: 'state-change' }],
      execute,
    }));
    const kernel = AC.createCommandKernel({}, { now: () => clock, confirmationMs: 1000, lowConfidenceThreshold: 0.8 });
    expect(kernel.execute('choose', { choice: 'B' }, { scopeId: 'practice', confidence: 0.4 })).toMatchObject({ confirmationRequired: true });
    clock = 2001;
    expect(kernel.confirm('yes')).toMatchObject({ expired: true, ok: false });
    expect(execute).not.toHaveBeenCalled();
    expect(kernel.execute('choose', { choice: 'B' }, { scopeId: 'practice', confidence: 0.95 })).toMatchObject({ narration: 'Selected.' });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('honors an explicit confidence rejection without executing', async () => {
    const execute = vi.fn();
    unregister.push(AC.registerCommandScope({
      id: 'confidence-guard',
      getCommands: () => [{ id: 'advance', risk: 'state-change' }],
      parse: () => ({ commandId: 'advance', confidenceDecision: 'reject' }),
      execute,
    }));
    const kernel = AC.createCommandKernel({}, { channel: 'voice' });
    const result = await kernel.handleUtterance('next', { confidence: 0.99, allowAi: false });
    expect(result).toMatchObject({ handled: true, ok: false, rejected: true, commandId: 'advance' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('binds confirmation to the exact scope registration and never falls through globally', () => {
    const globalOpen = vi.fn();
    const scopedExecute = vi.fn();
    const cleanup = AC.registerCommandScope({
      id: 'transient-surface',
      getCommands: () => [{ id: 'open_learning_hub', risk: 'destructive' }],
      execute: scopedExecute,
    });
    const kernel = AC.createCommandKernel({ setShowLearningHub: globalOpen }, { channel: 'voice' });
    expect(kernel.execute('open_learning_hub', {}, { scopeId: 'transient-surface' })).toMatchObject({ confirmationRequired: true });
    cleanup();
    const result = kernel.confirm('yes');
    expect(result).toMatchObject({ handled: true, ok: false, unavailable: true, scopeId: 'transient-surface' });
    expect(scopedExecute).not.toHaveBeenCalled();
    expect(globalOpen).not.toHaveBeenCalled();
  });

  it('invalidates confirmation when a same-id scope is replaced', () => {
    const firstExecute = vi.fn();
    const secondExecute = vi.fn();
    const staleCleanup = AC.registerCommandScope({
      id: 'replaceable-surface',
      getCommands: () => [{ id: 'submit', risk: 'destructive' }],
      execute: firstExecute,
    });
    const kernel = AC.createCommandKernel({}, { channel: 'voice' });
    kernel.execute('submit', {}, { scopeId: 'replaceable-surface' });
    const replacementCleanup = AC.registerCommandScope({
      id: 'replaceable-surface',
      getCommands: () => [{ id: 'submit', risk: 'destructive' }],
      execute: secondExecute,
    });
    unregister.push(replacementCleanup);
    expect(staleCleanup()).toBe(false);
    expect(kernel.confirm('yes')).toMatchObject({ ok: false, unavailable: true });
    expect(firstExecute).not.toHaveBeenCalled();
    expect(secondExecute).not.toHaveBeenCalled();
  });

  it('keeps adapter identity canonical and tears down active scoped work on destroy', () => {
    let resolveCompletion;
    let receivedSignal = null;
    const stop = vi.fn();
    unregister.push(AC.registerCommandScope({
      id: 'async-surface',
      getCommands: () => [{ id: 'load-next', risk: 'state-change', confirmation: 'never' }],
      execute: (_id, _params, _ctx, meta) => {
        receivedSignal = meta.signal;
        return {
          handled: false,
          commandId: 'spoofed',
          scopeId: 'spoofed',
          via: 'spoofed',
          pending: true,
          completion: new Promise((resolve) => { resolveCompletion = resolve; }),
        };
      },
      stop,
    }));
    const kernel = AC.createCommandKernel({}, { channel: 'voice' });
    const pending = kernel.execute('load-next', {}, { scopeId: 'async-surface' });
    expect(pending).toMatchObject({ handled: true, commandId: 'load-next', scopeId: 'async-surface' });
    expect(pending.via).not.toBe('spoofed');
    expect(receivedSignal).toBeTruthy();
    expect(receivedSignal.aborted).toBe(false);
    expect(kernel.destroy()).toBe(true);
    expect(receivedSignal.aborted).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
    resolveCompletion({ narration: 'Late completion.' });
  });

  it('propagates aborts from a deferred scoped parser and never executes late output', async () => {
    let finishParse;
    const execute = vi.fn();
    unregister.push(AC.registerCommandScope({
      id: 'slow-parser',
      getCommands: () => [{ id: 'advance' }],
      parse: () => new Promise((resolve) => { finishParse = resolve; }),
      execute,
    }));
    const controller = new AbortController();
    const routed = AC.routeScopedUtterance({}, 'next', { signal: controller.signal });
    controller.abort();
    finishParse({ commandId: 'advance' });
    await expect(routed).rejects.toMatchObject({ name: 'AbortError' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('keeps a pending global confirmation global when a same-id scope appears', async () => {
    const startNewPdfAudit = vi.fn();
    const scopedExecute = vi.fn();
    const ctx = { pipelineOpen: true, startNewPdfAudit };
    const kernel = AC.createCommandKernel(() => ctx, { channel: 'voice' });
    const pending = await kernel.handleUtterance('start over with a new document', { allowAi: false });
    expect(pending).toMatchObject({ confirmationRequired: true, commandId: 'pipeline_new_doc', scopeId: null });

    unregister.push(AC.registerCommandScope({
      id: 'late-surface',
      priority: 100,
      getCommands: () => [{ id: 'pipeline_new_doc', risk: 'destructive' }],
      execute: scopedExecute,
    }));

    const done = await kernel.handleUtterance('yes', { allowAi: false });
    expect(done).toMatchObject({ handled: true, commandId: 'pipeline_new_doc' });
    expect(startNewPdfAudit).toHaveBeenCalledTimes(1);
    expect(scopedExecute).not.toHaveBeenCalled();
  });

  it('wraps existing global destructive commands without bypassing role/state checks', async () => {
    const startNewPdfAudit = vi.fn();
    const ctx = { pipelineOpen: true, startNewPdfAudit };
    const kernel = AC.createCommandKernel(() => ctx, { channel: 'voice' });
    const pending = await kernel.handleUtterance('start over with a new document', { allowAi: false });
    expect(pending).toMatchObject({ confirmationRequired: true, commandId: 'pipeline_new_doc' });
    expect(startNewPdfAudit).not.toHaveBeenCalled();
    const done = await kernel.handleUtterance('yes', { allowAi: false });
    expect(done).toMatchObject({ handled: true, commandId: 'pipeline_new_doc' });
    expect(startNewPdfAudit).toHaveBeenCalledTimes(1);
  });
});

describe('learner kernel build parity', () => {
  it('exports the same kernel API from root and desktop generated modules', () => {
    const root = readFileSync(resolve(process.cwd(), 'allo_commands_module.js'), 'utf8');
    const desktop = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/allo_commands_module.js'), 'utf8');
    expect(desktop).toBe(root);
    for (const symbol of ['createCommandKernel', 'registerCommandScope', 'routeScopedUtterance', 'getLearnerContextSnapshot']) {
      expect(root).toContain(symbol + ': ' + symbol);
    }
  });
});
