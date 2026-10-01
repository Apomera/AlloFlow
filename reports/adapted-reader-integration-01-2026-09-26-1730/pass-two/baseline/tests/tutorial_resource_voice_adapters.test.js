import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AC;
const cleanups = [];

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
  while (cleanups.length) cleanups.pop()();
});
afterAll(() => vi.unstubAllGlobals());

describe('tutorial voice adapter', () => {
  it('accepts short navigation only in the classic modal tour', async () => {
    const invoke = vi.fn(() => 'Moved.');
    let state = { kind: 'classic', stepIndex: 0, stepTotal: 3, stepTitle: 'Welcome', canNext: true, canPrevious: false };
    cleanups.push(AC.registerCommandScope(AC.createTutorialCommandAdapter({ getState: () => state, invoke })));
    const kernel = AC.createCommandKernel(() => ({ commandAudience: 'student' }), { channel: 'voice' });

    const next = await kernel.handleUtterance('next', { allowAi: false });
    expect(next).toMatchObject({ handled: true, commandId: 'tutorial_next', scopeId: 'tutorial-surface' });
    expect(invoke).toHaveBeenCalledWith('next', {}, expect.anything());

    state = { kind: 'guided', stepIndex: 1, stepTotal: 4, stepTitle: 'Directions', canNext: true, canPrevious: true, canSkip: false };
    expect(await AC.routeScopedUtterance({}, 'next', { channel: 'voice' })).toBeNull();
    expect(await AC.routeScopedUtterance({}, 'next guided step', { channel: 'voice' })).toMatchObject({ commandId: 'tutorial_next' });
  });

  it('fails closed at incomplete Guided milestones and confirms low-confidence skips', async () => {
    const invoke = vi.fn();
    const state = {
      kind: 'guided', stepIndex: 0, stepTotal: 4, stepId: 'source-input',
      stepTitle: 'Add source text', canNext: false, canPrevious: false, canSkip: true,
      nextReason: 'Complete source input first.',
    };
    cleanups.push(AC.registerCommandScope(AC.createTutorialCommandAdapter({ getState: () => state, invoke })));
    const kernel = AC.createCommandKernel(() => ({}), { channel: 'voice' });

    const blocked = await kernel.handleUtterance('next guided step', { allowAi: false });
    expect(blocked.narration).toBe('Complete source input first.');
    expect(invoke).not.toHaveBeenCalled();

    const pending = await kernel.handleUtterance('skip guided step', { allowAi: false, confidence: 0.4 });
    expect(pending).toMatchObject({ confirmationRequired: true, commandId: 'tutorial_skip' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('keeps generic orientation with the visible surface and blocks navigation while Guided work is busy', async () => {
    const invoke = vi.fn();
    const state = {
      kind: 'guided', stepIndex: 1, stepTotal: 4, stepId: 'directions',
      stepTitle: 'Directions', canNext: true, canPrevious: true, canSkip: true,
      canFocus: true, busy: true,
    };
    cleanups.push(AC.registerCommandScope(AC.createTutorialCommandAdapter({ getState: () => state, invoke })));
    expect(await AC.routeScopedUtterance({}, 'where am I', { channel: 'voice' })).toBeNull();
    expect(await AC.routeScopedUtterance({}, 'where am I in guided mode', { channel: 'voice' })).toMatchObject({
      commandId: 'tutorial_describe',
    });

    const kernel = AC.createCommandKernel(() => ({}), { channel: 'voice' });
    const blocked = await kernel.handleUtterance('next guided step', { allowAi: false });
    expect(blocked.narration).toMatch(/still working/i);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('generated resource voice adapter', () => {
  const resources = [
    { id: 'r1', type: 'simplified', title: 'Water Cycle' },
    { id: 'r2', type: 'glossary', title: 'Key Terms' },
    { id: 'r3', type: 'outline', title: 'Water Cycle' },
  ];

  it('discovers and opens only by number or exact title, with ambiguity fail-closed', async () => {
    const invoke = vi.fn(() => true);
    cleanups.push(AC.registerCommandScope(AC.createGeneratedResourceCommandAdapter({
      listResources: () => resources,
      getCurrent: () => ({ ...resources[0], frontmost: true, canRead: true, canReadMedia: true }),
      invoke,
    })));
    const kernel = AC.createCommandKernel(() => ({}), { channel: 'voice' });

    const listed = await kernel.handleUtterance('list resources', { allowAi: false });
    expect(listed.narration).toContain('1, Water Cycle');
    const ambiguous = await kernel.handleUtterance('open resource called Water Cycle', { allowAi: false });
    expect(ambiguous.narration).toMatch(/Matching positions are 1, 3/i);
    expect(invoke).not.toHaveBeenCalled();

    const opened = await kernel.handleUtterance('open resource 2', { allowAi: false });
    expect(opened).toMatchObject({ commandId: 'resource_open', scopeId: 'generated-resource' });
    expect(invoke).toHaveBeenCalledWith('open', { id: 'r2' }, expect.anything());
  });

  it('never captures answer grammar, stays inactive for quiz, and publishes no content', async () => {
    const adapter = AC.createGeneratedResourceCommandAdapter({
      listResources: () => resources,
      getCurrent: () => ({ ...resources[0], frontmost: true, canRead: true, canReadMedia: true, secretAnswer: 'never expose' }),
      invoke: () => true,
    });
    cleanups.push(AC.registerCommandScope(adapter));
    expect(await AC.routeScopedUtterance({}, 'A', { channel: 'voice' })).toBeNull();
    expect(await AC.routeScopedUtterance({}, 'submit', { channel: 'voice' })).toBeNull();

    const snapshot = AC.getLearnerContextSnapshot({});
    expect(JSON.stringify(snapshot)).not.toContain('never expose');
    expect(snapshot.scopes.find((scope) => scope.id === 'generated-resource')).toMatchObject({
      priority: 30,
      capabilities: { read: true, readMediaDescription: true, answer: false, submit: false },
    });

    cleanups.pop()();
    cleanups.push(AC.registerCommandScope(AC.createGeneratedResourceCommandAdapter({
      listResources: () => resources,
      getCurrent: () => ({ id: 'quiz-1', type: 'quiz', title: 'Quiz', frontmost: true }),
      invoke: () => true,
    })));
    expect(AC.listActiveCommandScopes({}).some((scope) => scope.id === 'generated-resource')).toBe(false);
  });

  it('supports qualified discovery from History without exposing unopened resource actions', async () => {
    const invoke = vi.fn(() => true);
    cleanups.push(AC.registerCommandScope(AC.createGeneratedResourceCommandAdapter({
      listResources: () => resources,
      getCurrent: () => null,
      isDiscoveryActive: () => true,
      invoke,
    })));
    const kernel = AC.createCommandKernel(() => ({}), { channel: 'voice' });
    expect(AC.listActiveCommandScopes({}).some((scope) => scope.id === 'generated-resource')).toBe(true);
    const listed = await kernel.handleUtterance('list resources', { allowAi: false });
    expect(listed.narration).toContain('Key Terms');
    const opened = await kernel.handleUtterance('open resource 2', { allowAi: false });
    expect(opened).toMatchObject({ commandId: 'resource_open' });
    expect(invoke).toHaveBeenCalledWith('open', { id: 'r2' }, expect.anything());
    invoke.mockClear();
    const read = await kernel.handleUtterance('read resource', { allowAi: false });
    expect(read.narration).toMatch(/No resource is open/i);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns self-narrating media outcomes without a duplicate command reply', async () => {
    const invoke = vi.fn(() => ({ ok: true, count: 2, missing: 1 }));
    cleanups.push(AC.registerCommandScope(AC.createGeneratedResourceCommandAdapter({
      listResources: () => resources,
      getCurrent: () => ({ ...resources[0], frontmost: true, canRead: true, canReadMedia: true }),
      invoke,
    })));
    const kernel = AC.createCommandKernel(() => ({}), { channel: 'voice' });
    const result = await kernel.handleUtterance('read media descriptions', { allowAi: false });
    expect(result).toMatchObject({ handled: true, commandId: 'resource_read_media', suppressVoiceReply: true });
    expect(invoke).toHaveBeenCalledWith('read_media', {}, expect.anything());
  });

  it('preserves a stale owner media failure as an audible failed outcome', async () => {
    const invoke = vi.fn(() => ({ ok: false, status: 'unsupported' }));
    cleanups.push(AC.registerCommandScope(AC.createGeneratedResourceCommandAdapter({
      listResources: () => resources,
      getCurrent: () => ({ ...resources[0], frontmost: true, canRead: true, canReadMedia: true }),
      invoke,
    })));
    const kernel = AC.createCommandKernel(() => ({}), { channel: 'voice' });
    const result = await kernel.handleUtterance('read media descriptions', { allowAi: false });
    expect(result).toMatchObject({
      handled: true, ok: false, suppressVoiceReply: false,
    });
    expect(result.narration).toMatch(/not available/i);
  });
});
