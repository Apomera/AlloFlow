import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
let AC, Chat, Service, Contracts, React, ReactDOM, Client;
const require = createRequire(import.meta.url);
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
  Client = require(resolve('desktop/web-app/node_modules/react-dom/client'));
  window.React = global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  for (const name of ['allo_commands', 'agent_core_contracts', 'agent_core_blueprint_service', 'udl_chat']) loadAlloModule(name + '_module.js');
  ({ AlloCommands: AC, UdlChat: Chat, AgentCoreBlueprintService: Service, AgentCoreContracts: Contracts } = window.AlloModules);
});
afterEach(() => {
  Object.assign(window.AlloModules, { AlloCommands: AC, AgentCoreBlueprintService: Service, AgentCoreContracts: Contracts });
  localStorage.clear();
});
const teacher = overrides => ({ t: (_k,f) => f, isTeacherMode: true, hasSourceOrAnalysis: true,
  generateQuiz: vi.fn(async () => true), generateGlossary: vi.fn(async () => true), setSetupGradeLevel: vi.fn(), ...overrides });
const service = ctx => Service.createCommandWorkflowService({ contracts: Contracts, storage: window.localStorage,
  getCommands: () => AC.buildAlloCommands(ctx, { includeGated: true }),
  getCommandAudience: AC.getCommandAudience, getCommandContract: AC.getCommandContract,
  sanitizeCommandParams: AC.sanitizeCommandParams, validatePlan: AC.validatePlan });
function harness(ctx = teacher()) {
  let messages = [];
  const d = {
    _alloCmdCtx: () => ctx, _botCommandPlanningRef: { current: { serial: 0 } },
    _pendingBotCmdRef: { current: null }, _pendingBotPlanRef: { current: null },
    _planRunRef: { current: { running: false, stop: false } }, _planUndoRef: { current: null },
    lastIntentSnapshotRef: { current: null }, setActiveView: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(),
    setInputText: vi.fn(), setUdlInput: vi.fn(), setIsChatProcessing: vi.fn(),
    setUdlMessages: update => { messages = typeof update === 'function' ? update(messages) : update; },
    udlInput: '', udlMessages: [], _sendUdlToChat: vi.fn(), answerUdlQuestion: vi.fn(async text => {
      messages.push({ role: 'model', text: 'An explanation of ' + text }); return { ok: true };
    }), activeView: 'home', generatedContent: { id: 'before' }, history: [], inputText: 'Original source', t: () => '',
  };
  return { d, ctx, messages: () => messages, send: text => { d.udlMessages = messages; return Chat.planAndSendUdlMessage(text,d); },
    draft: (steps = [{ commandId: 'set_grade_level', params: { grade: '4' } }, { commandId: 'generate_quiz', params: {} }]) => {
      const workflow = service(ctx).createDraft({ steps },ctx).value;
      if (!workflow) throw Error('No workflow');
      d._pendingBotPlanRef.current = { steps: workflow.steps, workflow, mode: 'review', originalText: 'Set grade then make a quiz' };
      return d._pendingBotPlanRef.current;
    } };
}
const last = h => h.messages().at(-1);
describe('Allobot completion and plan review regressions', () => {
  it.each([['failed', false], ['partial', false], ['waiting', false], ['blocked', false], ['stopped', false], ['completed', true]])(
    'awaits the real lesson result: %s', async (status, ok) => {
      let finish;
      const ctx = teacher({ hasActiveBlueprint: true, runBlueprint: () => new Promise(resolve => { finish = resolve; }) });
      let settled = false;
      const work = AC.runCommandById(ctx,'run_lesson_blueprint',{}, { confirmed: true, awaitCompletion: true }).then(r => { settled = true; return r; });
      await Promise.resolve(); await Promise.resolve();
      expect(settled).toBe(false);
      finish({ status });
      expect(await work).toMatchObject({ status, ok });
    });
  it('does not advance past a partially completed Blueprint', async () => {
    const ctx = teacher({ hasActiveBlueprint: true, runBlueprint: async () => ({ status: 'partial', narration: 'One row failed.' }) });
    const result = await AC.runPlan(() => ctx, [{ commandId: 'run_lesson_blueprint' }, { commandId: 'generate_quiz' }]);
    expect(result.ok).toBe(false); expect(ctx.generateQuiz).not.toHaveBeenCalled();
  });
  it.each([null, { handled: true, ok: false }, { handled: true, pending: true }])('never renders a green success for %j', async result => {
    const h = harness();
    window.AlloModules.AlloCommands = { ...AC, runCommandById: async () => result };
    h.d._pendingBotCmdRef.current = { commandId: 'generate_quiz', params: {}, id: 'q' };
    await h.send('__allo_do');
    expect(last(h).text).not.toContain('✅'); expect(last(h).text).not.toContain('Done.');
  });
  it('replaces only the pending result when a confirmed async command settles', async () => {
    const h = harness(); let finish;
    const completion = new Promise(resolve => { finish = resolve; });
    window.AlloModules.AlloCommands = { ...AC, runCommandById: async () => ({ handled: true, pending: true, completion }) };
    h.d._pendingBotCmdRef.current = { commandId: 'generate_quiz', params: {}, id: 'q' };
    await h.send('__allo_do'); expect(last(h).operationStatus).toBe('pending');
    finish({ handled: true, ok: false, narration: 'Generation failed.' });
    await completion; await Promise.resolve();
    expect(last(h)).toMatchObject({ operationStatus: 'error', text: '⚠️ Generation failed.' });
  });
  it('retains required parameters until the form supplies them', async () => {
    const h = harness(teacher({ hasActiveBlueprint: true, blueprintStepList: () => [{ position: 1 }, { position: 2 }], rebuildBlueprintStep: vi.fn(async () => ({ id: 'new' })) }));
    h.d._pendingBotCmdRef.current = { commandId: 'rebuild_lesson_step', params: {}, id: 'step' };
    await h.send('__allo_do');
    expect(h.d._pendingBotCmdRef.current.needsInput).toBe(true);
    expect(last(h).commandReview.fields.step.required).toBe(true);
    await h.send({ action: 'command-params', requestId: 'step', params: { step: '2' } });
    expect(h.ctx.rebuildBlueprintStep).not.toHaveBeenCalled();
    await h.send('__allo_do');
    await new Promise(resolve => setTimeout(resolve,10));
    expect(h.ctx.rebuildBlueprintStep).toHaveBeenCalledWith(2);
  });
  it.each(['Why include a quiz?', 'Would you change this plan?'])('answers %s without losing the workflow', async question => {
    const h = harness(); const draft = h.draft();
    await h.send(question);
    expect(h.d.answerUdlQuestion).toHaveBeenCalledOnce();
    expect(h.d._pendingBotPlanRef.current).toBe(draft);
    expect(h.ctx.generateQuiz).not.toHaveBeenCalled();
    expect(last(h).workflowMode).toBe('review');
  });
  it('keeps the draft when a question fails and retries through the answer lane', async () => {
    const h = harness(); const draft = h.draft();
    h.d.answerUdlQuestion.mockRejectedValueOnce(Error('offline'));
    await h.send('__allo_plan_ask'); await h.send('Explain the sequence');
    const error = h.messages().find(m => m.type === 'chat-error');
    expect(error.retryText).toContain('Explain the sequence');
    await h.send({ action: 'retry-chat', text: error.retryText });
    expect(h.d.answerUdlQuestion).toHaveBeenCalledTimes(2);
    expect(h.d._pendingBotPlanRef.current).toBe(draft);
    expect(h.ctx.generateQuiz).not.toHaveBeenCalled();
  });
  it.each(['cancel', '__allo_plan_show'])('handles %s during naming without saving it', async reply => {
    const h = harness(); h.draft(); await h.send('__allo_plan_save'); await h.send(reply);
    expect(service(h.ctx).listSaved(h.ctx).items).toHaveLength(0);
    if (reply === 'cancel') expect(h.d._pendingBotPlanRef.current).toBeNull();
    else expect(last(h).workflowMode).toBe('review');
  });
  it('can save a workflow literally named yes without executing it', async () => {
    const h = harness(); h.draft(); await h.send('__allo_plan_save'); await h.send('yes');
    expect(service(h.ctx).listSaved(h.ctx).items.map(i => i.name)).toContain('yes');
    expect(h.ctx.generateQuiz).not.toHaveBeenCalled();
  });
  it('applies structured parameter edits, movement and removal to stable step ids', async () => {
    const h = harness(); h.draft(); await h.send('__allo_plan_edit');
    const { workflowId, workflowSteps } = last(h); const first = workflowSteps[0].stepId;
    await h.send({ action: 'workflow-params', workflowId, stepId: first, params: { grade: '6', dangerous: 'ignored' } });
    expect(h.d._pendingBotPlanRef.current.steps[0].params).toEqual({ grade: '6' });
    await h.send({ action: 'workflow-move', workflowId, stepId: first, toIndex: 1 });
    expect(h.d._pendingBotPlanRef.current.workflow.steps[1].stepId).toBe(first);
    await h.send({ action: 'workflow-remove', workflowId, stepId: first });
    expect(h.d._pendingBotPlanRef.current.steps.map(s => s.commandId)).toEqual(['generate_quiz']);
    expect(h.ctx.generateQuiz).not.toHaveBeenCalled();
  });
  it('captures and restores source, content and settings through the supplied helpers', async () => {
    const h = harness(); h.draft();
    h.d.captureIntentSnapshot = vi.fn(() => { h.d.lastIntentSnapshotRef.current = { grade: '3' }; });
    h.d.restoreIntentSnapshot = vi.fn(() => true);
    await h.send('__allo_plan_run');
    expect(h.d.captureIntentSnapshot).toHaveBeenCalledOnce();
    expect(last(h).choices.some(c => c.value === '__allo_plan_undo')).toBe(true);
    await h.send('__allo_plan_undo');
    expect(h.d.restoreIntentSnapshot).toHaveBeenCalledOnce();
    expect(h.d.setInputText).toHaveBeenCalledWith('Original source');
    expect(h.d.setGeneratedContent).toHaveBeenCalledWith({ id: 'before' });
  });
  it('does not offer undo when the host cannot capture a snapshot', async () => {
    const h = harness(); h.draft(); await h.send('__allo_plan_run');
    expect(h.d._planUndoRef.current).toBeNull();
    expect(last(h).choices.some(c => c.value === '__allo_plan_undo')).toBe(false);
  });
  it('stops after the current async step and holds the exact remainder', async () => {
    let finish;
    const ctx = teacher({ generateQuiz: () => new Promise(r => { finish = r; }) });
    let stop = false;
    const work = AC.runPlan(() => ctx, [{ commandId: 'generate_quiz' }, { commandId: 'generate_glossary' }], { shouldStop: () => stop, stopAfterCurrent: true });
    await Promise.resolve(); await Promise.resolve(); stop = true;
    finish(); const result = await work;
    expect(result.ok).toBe(false); expect(ctx.generateGlossary).not.toHaveBeenCalled();
    expect(result.remainingSteps.map(s => s.commandId)).toEqual(['generate_glossary']);
  });
  it('preserves a realistic brief beyond 400 characters and rejects the explicit upper limit', async () => {
    const input = 'Generate a quiz then a glossary. ' + 'Use examples, clear vocabulary and retrieval practice. '.repeat(12);
    const ctx = teacher({ callGemini: vi.fn(async () => JSON.stringify({ confidence: .95, steps: [{ commandId: 'generate_quiz' }, { commandId: 'generate_glossary' }] })) });
    expect(await AC.planUtterance(ctx,input)).toHaveLength(2);
    expect(ctx.callGemini.mock.calls.some(args => args[0].includes(input.trim()))).toBe(true);
    await expect(AC.planUtterance(ctx,'x'.repeat(12001))).rejects.toMatchObject({ code: 'COMMAND_PLAN_INPUT_TOO_LONG' });
  });
});

describe('React command state handoff', () => {
  it.each(['source', 'grade', 'role'])('reads committed %s state before the next command', async kind => {
    const ref = { current: null }; const generated = []; const node = document.createElement('div'); document.body.appendChild(node);
    const root = Client.createRoot(node);
    const hostSource = readFileSync('AlloFlowANTI.txt','utf8');
    const barrierCode = hostSource.slice(hostSource.indexOf('waitForCommandState: () =>'), hostSource.indexOf('rebuildBlueprintStep: (position)'));
    const barrierMatch = barrierCode.match(/waitForCommandState: ([\s\S]*?\}, 0\)\))/);
    expect(barrierMatch).toBeTruthy();
    const barrier = new Function('ReactDOM', 'return ' + barrierMatch[1])(ReactDOM);
    function Host() {
      const [source,setSource] = React.useState(kind !== 'source');
      const [grade,setGrade] = React.useState('3');
      const [isTeacher,setTeacher] = React.useState(true);
      ref.current = teacher({ isTeacherMode: isTeacher, hasSourceOrAnalysis: source,
        generateSourceText: async () => { setSource(true); },
        setSetupGradeLevel: value => { setGrade(value); if(kind === 'role')setTeacher(false); },
        generateQuiz: async () => { generated.push({ source, grade, isTeacher }); }, waitForCommandState: barrier });
      return React.createElement('span', null, grade);
    }
    const oldAct = global.IS_REACT_ACT_ENVIRONMENT;
    try {
      React.act(() => root.render(React.createElement(Host)));
      global.IS_REACT_ACT_ENVIRONMENT = false;
      const first = kind === 'source' ? { commandId: 'generate_source_text', params: { topic: 'ecosystems' } } : { commandId: 'set_grade_level', params: { grade: '6' } };
      const result = await AC.runPlan(() => ref.current,[first,{ commandId: 'generate_quiz' }]);
      if(kind === 'role') { expect(result.ok).toBe(false); expect(generated).toEqual([]); }
      else { expect(result.ok, result.reason).toBe(true); expect(generated).toEqual([{ source: true, grade: kind === 'grade' ? '6' : '3', isTeacher: true }]); }
    } finally { global.IS_REACT_ACT_ENVIRONMENT = oldAct; React.act(() => root.unmount()); node.remove(); }
  });
});
