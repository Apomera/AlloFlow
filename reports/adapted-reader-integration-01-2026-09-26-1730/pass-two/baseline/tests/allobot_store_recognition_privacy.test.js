import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let chat, commands;
beforeAll(() => {
  const noop = () => {};
  window.React = { createElement: noop, useState: noop, useRef: noop, useEffect: noop, useMemo: noop, useCallback: f => f };
  loadAlloModule('udl_chat_module.js'); loadAlloModule('allo_commands_module.js');
  chat = window.AlloModules.UdlChat; commands = window.AlloModules.AlloCommands;
});
afterEach(() => { window.AlloModules.AlloCommands = commands; vi.restoreAllMocks(); });
function harness(text, overrides = {}) {
  let messages = [];
  const open = vi.fn(), ai = vi.fn();
  const ctx = { isTeacherMode: true, commandAudience: 'teacher', openSchoolStoreRecognition: open, callGemini: ai, ...overrides };
  const deps = {
    _alloCmdCtx: () => ctx, _botCommandPlanningRef: { current: { controller: null, serial: 0 } },
    _pendingBotCmdRef: { current: null }, _pendingBotPlanRef: { current: null },
    _planRunRef: { current: { running: false } }, _planUndoRef: { current: null }, lastIntentSnapshotRef: { current: null },
    setUdlMessages: vi.fn(next => { messages = typeof next === 'function' ? next(messages) : next; }), setUdlInput: vi.fn(),
    setIsChatProcessing: vi.fn(), _sendUdlToChat: ai, answerUdlQuestion: ai, callGemini: ai, parseUserIntent: ai,
    udlInput: text, udlMessages: [], history: [], inputText: '', currentUiLanguage: 'English', getGroupDifferentiationContext: () => '', t: () => ''
  };
  return { ctx, deps, open, ai, messages: () => messages };
}

describe('typed Store requests stop before Allobot persistence or AI', () => {
  it('offers a clean launch only after the teacher clicks, without transferring the request', async () => {
    const run = harness('give Fictional John 5 points for helping');
    await chat.planAndSendUdlMessage(null, run.deps);
    expect(run.messages()[0].choices[0].value).toBe('__allo_store_open');
    expect(run.open).not.toHaveBeenCalled();
    await chat.planAndSendUdlMessage('__allo_store_open', run.deps);
    expect(run.open).toHaveBeenCalledExactlyOnceWith(); expect(run.ai).not.toHaveBeenCalled();
    expect(JSON.stringify(run.messages())).not.toContain('Fictional John');
  });
  it.each([{ isTeacherMode: false }, { isParentMode: true }, { isIndependentMode: true }, { isStudentLinkMode: true }, { commandAudience: 'student' }])('rechecks mode on a stale launch chip: %j', async overrides => {
    const run = harness('', overrides);
    await chat.planAndSendUdlMessage('__allo_store_open', run.deps);
    expect(run.open).not.toHaveBeenCalled(); expect(run.ai).not.toHaveBeenCalled();
    expect(run.messages()[0]).not.toHaveProperty('choices');
  });
  it('cancels without launching or sending the discarded request to chat', async () => {
    const run = harness(''); await chat.planAndSendUdlMessage('__allo_store_dismiss', run.deps);
    expect(run.open).not.toHaveBeenCalled(); expect(run.ai).not.toHaveBeenCalled();
  });
  it('blocks retry-chat objects and never stores them in an error bubble', async () => {
    const run = harness(''); await chat.planAndSendUdlMessage({ action: 'retry-chat', text: 'give Fictional John 5 points for helping' }, run.deps);
    expect(run.ai).not.toHaveBeenCalled(); expect(JSON.stringify(run.messages())).not.toContain('Fictional John');
    expect(run.messages()[0]).not.toHaveProperty('retryText');
  });
  it('inspects structured command values before JSON escaping can hide obfuscated points', async () => {
    const run = harness('');
    run.deps._pendingBotCmdRef.current = { id: 'fictional-request', commandId: 'create_lesson', params: {}, originalText: 'create a lesson' };
    await chat.planAndSendUdlMessage({ action: 'command-params', requestId: 'fictional-request', params: { topic: 'give Fictional John five po\nints for helping' } }, run.deps);
    expect(run.ai).not.toHaveBeenCalled(); expect(run.deps._pendingBotCmdRef.current).toBeNull();
    expect(JSON.stringify(run.messages())).not.toContain('Fictional John');
  });
  it('fails closed for cyclic or excessively nested action objects', async () => {
    const cycle = {}; cycle.self = cycle;
    const nested = {}; let cursor = nested; for (let i = 0; i < 12; i++) cursor = cursor.next = {};
    for (const value of [cycle, nested]) { const run = harness(''); await chat.planAndSendUdlMessage(value, run.deps); expect(run.ai).not.toHaveBeenCalled(); }
  });
  it('does not open a second surface during a running plan', async () => {
    const run = harness(''); run.deps._planRunRef.current.running = true;
    await chat.planAndSendUdlMessage('__allo_store_open', run.deps);
    expect(run.open).not.toHaveBeenCalled(); expect(run.ai).not.toHaveBeenCalled();
    expect(run.deps._planRunRef.current.running).toBe(true);
  });
  it('guards direct chat and direct AI-response entrances before their dependencies are used', async () => {
    for (const entry of [chat.handleSendUDLMessage, chat.generateStandardChatResponse]) {
      const run = harness('give Fictional John 5 points for helping');
      await entry(run.deps.udlInput, run.deps);
      expect(run.ai).not.toHaveBeenCalled(); expect(JSON.stringify(run.messages())).not.toContain('Fictional John');
    }
  });
  it.each([
    'give Fictional John 5 points for helping', 'award Calm Otter -5 points for helping',
    'Fictional John, you get five points', 'create a lesson then award Fictional John 5 points',
    'otorga Zorro Tranquilo 5 puntos por colaborar', '{"studentId":"fictional-private","points":5}',
    'give Fictional John 5 points for ' + 'x'.repeat(800), 'aw\u200bard Fictional John 5 points'
  ])('keeps an unsupported or valid request local: %s', async text => {
    window.AlloModules.AlloCommands = undefined;
    const run = harness(text);
    await chat.planAndSendUdlMessage(null, run.deps);
    expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled();
    expect(run.messages()).toHaveLength(1); expect(run.messages()[0]).toMatchObject({ role: 'model', localOnly: true });
    expect(JSON.stringify(run.messages())).not.toContain(text); expect(JSON.stringify(run.messages())).not.toContain('Fictional John');
    expect(run.deps._pendingBotCmdRef.current).toBeNull(); expect(run.deps._pendingBotPlanRef.current).toBeNull();
    expect(run.deps.setUdlInput).toHaveBeenCalledWith('');
  });
});

describe('recognition cannot reach generic command AI', () => {
  it('blocks route, plan and command-kernel entries even with AI enabled', async () => {
    const run = harness('give Fictional John 5 points for helping');
    expect(await commands.routeUtterance(run.ctx, run.deps.udlInput, { allowAi: true })).toMatchObject({ handled: true, localOnly: true });
    expect(await commands.planUtterance(run.ctx, run.deps.udlInput)).toBeNull();
    const kernel = commands.createCommandKernel(() => run.ctx);
    expect(await kernel.handleUtterance(run.deps.udlInput, { allowAi: true })).toMatchObject({ handled: true, localOnly: true });
    kernel.destroy(); expect(run.ai).not.toHaveBeenCalled();
  });
  it('keeps an ordinary academic bullet-point request on the existing chat path', async () => {
    window.AlloModules.AlloCommands = undefined;
    const run = harness('give me 5 bullet points about photosynthesis');
    await chat.planAndSendUdlMessage(null, run.deps); expect(run.ai).toHaveBeenCalled();
  });
  it('does not carry old recognition messages into lesson handoff or later chat prompts', async () => {
    const run = harness('Explain photosynthesis');
    run.deps.udlMessages = [{ role: 'user', text: 'give Fictional John 5 points for helping' }, { role: 'model', text: 'Private phrase', localOnly: true }, { role: 'user', text: 'Make a lesson about leaves' }];
    const handoff = chat.buildLessonConversationHandoff(run.deps.udlMessages);
    expect(handoff).toContain('leaves'); expect(handoff).not.toContain('Fictional John'); expect(handoff).not.toContain('Private phrase');
    run.ai.mockResolvedValue('Plants use light.');
    await chat.generateStandardChatResponse('Explain photosynthesis', run.deps);
    expect(run.ai).toHaveBeenCalled(); expect(run.ai.mock.calls[0][0]).not.toContain('Fictional John');
    expect(run.ai.mock.calls[0][0]).not.toContain('Private phrase');
  });
  it('uses only a generic view hint and keeps noopener on the actual host launch', () => {
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(host).toContain("portalUrl + (recognitionView === true ? '?view=recognition' : '')");
    expect(host).toContain('openSchoolStoreRecognition: () => {');
    expect(host).toContain("'_blank', 'noopener,noreferrer'");
  });
  it('rejects recognition in raw lesson-handoff options before truncating or calling AI', async () => {
    const raw = 'give Fictional John five po\nints for helping', run = harness('');
    expect(chat.buildLessonConversationHandoff([], { latestRequest: raw })).toBe('');
    await chat.inferLessonConversationHandoff({ latestRequest: raw, fallbackConfig: {} }, run.deps);
    await chat.inferLessonConversationHandoff({ conversationContext: 'Teacher: ' + raw, fallbackConfig: {} }, run.deps);
    expect(run.ai).not.toHaveBeenCalled();
  });
});
