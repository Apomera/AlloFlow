import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadAlloModule } from './setup.js';

let chat, commands, guide;
beforeAll(() => {
  const noop = () => {}; window.React = { createElement: noop, useState: noop, useRef: noop, useEffect: noop, useMemo: noop, useCallback: f => f };
  loadAlloModule('udl_chat_module.js'); loadAlloModule('allo_commands_module.js');
  chat = window.AlloModules.UdlChat; commands = window.AlloModules.AlloCommands;
  const context = vm.createContext({}); vm.runInContext(readFileSync('school_store_setup_guide.js', 'utf8') + ';globalThis.guide=createSchoolStoreSetupGuide();', context); guide = context.guide;
});
describe('local guide privacy and lifecycle guards', () => {
  it.each(['__allo_sto\u200bre_guide_setup PRIVATE', '＿＿allo_store_guide_setup PRIVATE', '__allo_store_g\u034fuide_join PRIVATE', '__allo_sto\nre_guide_practice PRIVATE', '__allo_store_guide_setup\ufe0f'])('detects obfuscated guide tokens without normalizing them into actions: %s', async value => {
    for (const entry of [chat.planAndSendUdlMessage, chat.handleSendUDLMessage, chat.generateStandardChatResponse]) {
      const run = harness(value); await entry(value, run.deps); expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled(); expect(run.recognition).not.toHaveBeenCalled(); expect(run.messages()[0]).toMatchObject({ localOnly: true }); expect(run.messages()[0]).not.toHaveProperty('choices'); expect(JSON.stringify(run.messages())).not.toContain('PRIVATE');
    }
    const run = harness(value); expect(await commands.routeUtterance(run.ctx, value, { allowAi: true })).toMatchObject({ localOnly: true, reason: 'school-store-setup-guide' }); expect(await commands.planUtterance(run.ctx, value, { allowAi: true })).toBeNull();
    const kernel = commands.createCommandKernel(() => run.ctx); expect(await kernel.handleUtterance(value, { allowAi: true })).toMatchObject({ localOnly: true }); kernel.destroy(); expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled();
    expect(chat.buildLessonConversationHandoff([{ role: 'user', text: value }])).toBe('');
    expect(chat.buildLessonConversationHandoff([], { latestRequest: value })).toBe('');
  });
  it('does not broaden sentinel normalization into ordinary chat interception', async () => {
    window.AlloModules.AlloCommands = undefined; const run = harness('Explain photosynthesis'); await chat.planAndSendUdlMessage(null, run.deps); expect(run.ai).toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled();
  });
  it.each(['school store setup help', 'school rewards manual', '__allo_store_guide_setup', '__ALLO_STORE_GUIDE_SETUP PRIVATE', ' __allo_store_guide_join PRIVATE'])('blocks direct route, plan and command-kernel AI for %s', async value => {
    const run = harness(value); expect(await commands.routeUtterance(run.ctx, value, { allowAi: true })).toMatchObject({ handled: true, localOnly: true, reason: 'school-store-setup-guide' }); expect(await commands.planUtterance(run.ctx, value, { allowAi: true })).toBeNull();
    const kernel = commands.createCommandKernel(() => run.ctx); expect(await kernel.handleUtterance(value, { allowAi: true })).toMatchObject({ handled: true, localOnly: true, reason: 'school-store-setup-guide' }); kernel.destroy();
    expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled(); expect(run.recognition).not.toHaveBeenCalled();
  });
  it('keeps ordinary and mixed awards on the original private-recognition path', async () => {
    for (const value of ['give PRIVATE STUDENT 5 points for helping', 'help me set up school store then award PRIVATE STUDENT 5 points']) {
      const run = harness(value); await chat.planAndSendUdlMessage(null, run.deps); expect(run.messages()[0].choices[0].value).toBe('__allo_store_open'); expect(run.open).not.toHaveBeenCalled(); expect(run.ai).not.toHaveBeenCalled(); expect(JSON.stringify(run.messages())).not.toContain('PRIVATE');
      expect(await commands.routeUtterance(run.ctx, value, { allowAi: true })).toMatchObject({ reason: 'school-store-recognition', localOnly: true });
    }
  });
  it('does not depend on the optional command module to guard setup requests', async () => {
    window.AlloModules.AlloCommands = undefined; const run = harness('help me set up school store'); await chat.planAndSendUdlMessage(null, run.deps); expect(run.messages()[0].type).toBe('choices'); expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled();
  });
  it.each([{ isTeacherMode: false }, { isParentMode: true }, { isIndependentMode: true }, { isStudentLinkMode: true }, { commandAudience: 'student' }])('rechecks teacher-only access for stale chips: %j', async override => {
    const run = harness('', override); await chat.planAndSendUdlMessage('__allo_store_guide_setup', run.deps); expect(run.open).not.toHaveBeenCalled(); expect(run.ai).not.toHaveBeenCalled(); expect(run.messages()[0]).not.toHaveProperty('choices');
  });
  it('cancels locally without opening or changing an active plan', async () => {
    const run = harness(); await chat.planAndSendUdlMessage('__allo_store_guide_dismiss', run.deps); expect(run.open).not.toHaveBeenCalled(); expect(run.ai).not.toHaveBeenCalled(); expect(run.messages()[0].text).toContain('closed');
    run.deps._planRunRef.current.running = true; await chat.planAndSendUdlMessage('__allo_store_guide_setup', run.deps); expect(run.open).not.toHaveBeenCalled(); expect(run.deps._planRunRef.current.running).toBe(true); expect(run.messages().at(-1).text).toContain('current plan');
  });
  it('discards stale pending plans and aborts planning before presenting local choices', async () => {
    const run = harness('school store help'), abort = vi.fn(); run.deps._pendingBotCmdRef.current = { originalText: 'PRIVATE' }; run.deps._pendingBotPlanRef.current = { text: 'PRIVATE' }; run.deps._botCommandPlanningRef.current = { controller: { abort }, serial: 7 };
    await chat.planAndSendUdlMessage(null, run.deps); expect(abort).toHaveBeenCalledOnce(); expect(run.deps._botCommandPlanningRef.current.serial).toBe(8); expect(run.deps._pendingBotCmdRef.current).toBeNull(); expect(run.deps._pendingBotPlanRef.current).toBeNull(); expect(JSON.stringify(run.messages())).not.toContain('PRIVATE');
  });
  it('keeps direct chat and response entry points local before their dependencies run', async () => {
    for (const entry of [chat.handleSendUDLMessage, chat.generateStandardChatResponse]) { const run = harness('school store setup help'); await entry(run.deps.udlInput, run.deps); expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled(); expect(run.messages()[0].type).toBe('choices'); }
  });
  it('fails closed without a launcher hook and does not claim a failed launch succeeded', async () => {
    const missing = harness('', { openSchoolStoreGuide: undefined }); await chat.planAndSendUdlMessage('__allo_store_guide_join', missing.deps); expect(missing.ai).not.toHaveBeenCalled(); expect(missing.messages()[0].text).toContain('unavailable');
    for (const hook of [() => false, () => { throw Error('PRIVATE HOST ERROR'); }]) { const run = harness('', { openSchoolStoreGuide: hook }); await chat.planAndSendUdlMessage('__allo_store_guide_join', run.deps); expect(run.messages()[0].text).toContain('could not open'); expect(JSON.stringify(run.messages())).not.toContain('PRIVATE'); }
  });
  it('fails locally without the shared guide factory', () => {
    const run = harness('school store manual'); const source = readFileSync('udl_chat_source.jsx', 'utf8').split('const _normalizeBlueprintSourceText')[0];
    const context = vm.createContext({ ...run.deps, deps: run.deps, _chatText: (t, key, text) => text });
    vm.runInContext(readFileSync('school_store_recognition.js', 'utf8') + source + ';_handleStoreRecognitionBoundary("school store manual",deps);', context);
    expect(run.messages()[0].text).toContain('unavailable'); expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled();
  });
  it.each(['help me set up school store then award PRIVATE STUDENT 5 points', 'school store manual for PRIVATE STUDENT', { action: 'retry-chat', text: '__allo_store_guide_setup PRIVATE' }])('preserves private-recognition priority for mixed or structured values: %j', async value => {
    const run = harness(); await chat.planAndSendUdlMessage(value, run.deps); expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled(); expect(run.recognition).not.toHaveBeenCalled(); expect(JSON.stringify(run.messages())).not.toContain('PRIVATE'); expect(run.messages()[0].localOnly).toBe(true);
  });
  it('excludes old guide tokens and local guide bubbles from later handoff and AI history', async () => {
    const run = harness('Explain photosynthesis'); run.deps.udlMessages = [{ role: 'user', text: '__allo_store_guide_setup PRIVATE' }, { role: 'model', localOnly: true, text: 'PRIVATE GUIDE DETAIL' }, { role: 'user', text: 'Make a lesson about leaves' }];
    const handoff = chat.buildLessonConversationHandoff(run.deps.udlMessages); expect(handoff).toContain('leaves'); expect(handoff).not.toContain('PRIVATE');
    run.ai.mockResolvedValue('Plants use light'); await chat.generateStandardChatResponse('Explain photosynthesis', run.deps); expect(run.ai).toHaveBeenCalled(); expect(JSON.stringify(run.ai.mock.calls)).not.toContain('PRIVATE');
  });
});
afterEach(() => { window.AlloModules.AlloCommands = commands; vi.restoreAllMocks(); });
function harness(text = '', overrides = {}) {
  let messages = []; const open = vi.fn(() => true), recognition = vi.fn(), ai = vi.fn();
  const ctx = { isTeacherMode: true, commandAudience: 'teacher', openSchoolStoreGuide: open, openSchoolStoreRecognition: recognition, callGemini: ai, ...overrides };
  const deps = { _alloCmdCtx: () => ctx, _botCommandPlanningRef: { current: { controller: null, serial: 0 } }, _pendingBotCmdRef: { current: null }, _pendingBotPlanRef: { current: null }, _planRunRef: { current: { running: false } }, _planUndoRef: { current: null }, lastIntentSnapshotRef: { current: null },
    setUdlMessages: vi.fn(next => { messages = typeof next === 'function' ? next(messages) : next; }), setUdlInput: vi.fn(), setIsChatProcessing: vi.fn(), _sendUdlToChat: ai, answerUdlQuestion: ai, callGemini: ai, parseUserIntent: ai,
    udlInput: text, udlMessages: [], history: [], inputText: '', currentUiLanguage: 'English', getGroupDifferentiationContext: () => '', t: () => '' };
  return { ctx, deps, open, recognition, ai, messages: () => messages };
}

describe('local Allobot School Store setup guide', () => {
  it.each(['help me set up school store', 'school store setup help', 'school store manual', 'please show me the school rewards manual', 'How do I set up School Rewards?', 'alloflow school store guide'])('offers only shared fixed path choices for %s', async text => {
    const run = harness(text); await chat.planAndSendUdlMessage(null, run.deps);
    expect(run.messages()).toHaveLength(1); expect(run.messages()[0]).toMatchObject({ role: 'model', localOnly: true, type: 'choices' });
    expect(run.messages()[0].choices).toEqual(guide.getPaths().map(path => ({ label: path.title, value: '__allo_store_guide_' + path.id })).concat([{ label: 'Cancel', value: '__allo_store_guide_dismiss' }]));
    expect(run.ai).not.toHaveBeenCalled(); expect(run.open).not.toHaveBeenCalled(); expect(run.recognition).not.toHaveBeenCalled(); expect(run.deps.setUdlInput).toHaveBeenCalledWith(''); expect(JSON.stringify(run.messages())).not.toContain(text);
  });
  it.each(['practice', 'join', 'setup'])('opens only explicit guide enum %s using the shared copy', async id => {
    const run = harness(); await chat.planAndSendUdlMessage('__allo_store_guide_' + id, run.deps);
    expect(run.open).toHaveBeenCalledExactlyOnceWith(id); expect(run.ai).not.toHaveBeenCalled(); expect(run.recognition).not.toHaveBeenCalled(); expect(run.messages()[0].localOnly).toBe(true); expect(run.messages()[0].text).toContain(guide.getPath(id).title); expect(run.messages()[0].text).toContain(guide.getPath(id).intro);
  });
  it.each(['__allo_store_guide_bad', '__allo_store_guide_setup?studentId=PRIVATE', '__allo_store_guide_setup\nPRIVATE', '__ALLO_STORE_GUIDE_SETUP', ' __allo_store_guide_join'])('fails closed for invalid guide token %s', async token => {
    const run = harness(); await chat.planAndSendUdlMessage(token, run.deps); expect(run.open).not.toHaveBeenCalled(); expect(run.ai).not.toHaveBeenCalled(); expect(run.messages()[0].localOnly).toBe(true); expect(JSON.stringify(run.messages())).not.toContain('PRIVATE'); expect(run.messages()[0]).not.toHaveProperty('choices');
  });
});
