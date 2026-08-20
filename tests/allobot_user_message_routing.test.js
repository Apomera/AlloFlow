import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let UdlChat;
let originalCommands;
let originalService;
let originalContracts;

beforeAll(() => {
  loadAlloModule('udl_chat_module.js');
  UdlChat = window.AlloModules.UdlChat;
  originalCommands = window.AlloModules.AlloCommands;
  originalService = window.AlloModules.AgentCoreBlueprintService;
  originalContracts = window.AlloModules.AgentCoreContracts;
  if (!UdlChat || typeof UdlChat.planAndSendUdlMessage !== 'function') {
    throw new Error('UdlChat planning surface failed to register');
  }
});

afterEach(() => {
  window.AlloModules.AlloCommands = originalCommands;
  window.AlloModules.AgentCoreBlueprintService = originalService;
  window.AlloModules.AgentCoreContracts = originalContracts;
});

function harness(input) {
  let messages = [];
  const setUdlMessages = vi.fn((next) => {
    messages = typeof next === 'function' ? next(messages) : next;
  });
  return {
    deps: {
      _alloCmdCtx: () => ({ isTeacherMode: true }),
      _botCommandPlanningRef: { current: { controller: null, serial: 0 } },
      _pendingBotCmdRef: { current: null },
      _pendingBotPlanRef: { current: null },
      _planRunRef: { current: { running: false, stop: false } },
      _planUndoRef: { current: null },
      lastIntentSnapshotRef: { current: null },
      setActiveView: vi.fn(),
      setGeneratedContent: vi.fn(),
      setHistory: vi.fn(),
      setUdlInput: vi.fn(),
      setUdlMessages,
      udlInput: input,
      udlMessages: [],
      _sendUdlToChat: vi.fn(),
      activeView: 'home',
      generatedContent: null,
      history: [],
      t: () => '',
    },
    messages: () => messages,
  };
}

describe('AlloBot user-message placement before command review', () => {
  it('shows the exact user turn before a single-command confirmation card', async () => {
    const request = 'open the educator hub for me';
    window.AlloModules.AlloCommands = {
      routeUtterance: vi.fn(async () => ({ preview: true, commandId: 'open_educator_hub', params: {}, label: 'Open Educator Hub' })),
    };
    const run = harness(request);

    await UdlChat.planAndSendUdlMessage(null, run.deps);

    expect(run.messages()).toHaveLength(2);
    expect(run.messages()[0]).toEqual({ role: 'user', text: request });
    expect(run.messages()[1]).toMatchObject({ role: 'model', type: 'choices' });
    expect(run.deps._sendUdlToChat).not.toHaveBeenCalled();
  });

  it('shows the exact quoted user turn before its long-horizon plan card', async () => {
    const request = 'create a complete lesson on "The Giver"\nthen prepare the full pack';
    let draftInput = null;
    window.AlloModules.AgentCoreContracts = {};
    window.AlloModules.AgentCoreBlueprintService = {
      createCommandWorkflowService: () => ({
        createDraft: (input) => {
          draftInput = input;
          return { ok: true, value: { ...input, steps: input.steps } };
        },
        dryRun: (workflow) => ({
          ok: true,
          steps: workflow.steps.map(() => ({ readiness: { status: 'ready', detail: '' } })),
        }),
      }),
    };
    window.AlloModules.AlloCommands = {
      routeUtterance: vi.fn(async () => null),
      looksMultiStep: vi.fn(() => true),
      planUtterance: vi.fn(async () => [
        { commandId: 'generate_simplified', params: { grade: '6' }, why: 'access' },
        { commandId: 'generate_quiz', params: {}, why: 'assess' },
      ]),
      buildAlloCommands: () => [
        { id: 'generate_simplified', label: 'Simplify text' },
        { id: 'generate_quiz', label: 'Generate quiz' },
      ],
      getCommandContract: () => ({ params: [] }),
      getCommandAudience: () => 'teacher',
    };
    const run = harness(request);

    await UdlChat.planAndSendUdlMessage(null, run.deps);

    expect(run.messages()).toHaveLength(2);
    expect(run.messages()[0]).toEqual({ role: 'user', text: request });
    expect(run.messages()[1]).toMatchObject({ role: 'model', type: 'choices' });
    expect(run.messages()[1].text).toContain('Simplify text');
    expect(run.messages()[1].text).toContain('Generate quiz');
    expect(run.deps._pendingBotPlanRef.current.originalText).toBe(request);
    expect(draftInput).not.toHaveProperty('originalText');
    expect(JSON.stringify(draftInput)).not.toContain('The Giver');
    expect(draftInput.steps[0].params).toEqual({ grade: '6' });
    expect(run.deps._sendUdlToChat).not.toHaveBeenCalled();
  });
});
