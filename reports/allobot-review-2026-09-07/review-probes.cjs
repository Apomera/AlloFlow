/* Read-only runtime observations for the Allobot review. No provider calls. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const observations = [];
const noop = () => {};
function boot() {
  const window = { AlloModules: {}, alloAnnounce: noop };
  const box = { window, console: { log: noop, warn: noop, error: noop }, AbortController,
    setTimeout, clearTimeout, setInterval, clearInterval,
    React: { createElement: noop, useState: noop, useEffect: noop, useRef: noop, useMemo: noop, useCallback: f => f },
    localStorage: { getItem: () => null, setItem: noop }, CustomEvent: class {},
  };
  window.React = box.React; window.dispatchEvent = noop;
  window.addEventListener = noop;
  vm.createContext(box);
  for (const name of ['allo_commands_module.js', 'udl_chat_module.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), box, { filename: name });
  }
  return { box, window, AC: window.AlloModules.AlloCommands, chat: window.AlloModules.UdlChat };
}
function harness() {
  const b = boot();
  const state = { messages: [], captureCalls: 0, restoreCalls: 0, chatCalls: [], routeCalls: 0, runs: [], saves: [] };
  const deps = {
    _alloCmdCtx: () => ({ isTeacherMode: true }),
    _botCommandPlanningRef: { current: { controller: null, serial: 0 } },
    _pendingBotCmdRef: { current: null }, _pendingBotPlanRef: { current: null },
    _planRunRef: { current: { running: false, stop: false } }, _planUndoRef: { current: null },
    lastIntentSnapshotRef: { current: { grade: '5' } },
    setActiveView: noop, setGeneratedContent: noop, setHistory: noop, setUdlInput: noop,
    setUdlMessages: next => { state.messages = typeof next === 'function' ? next(state.messages) : next; },
    udlInput: '', udlMessages: [], _sendUdlToChat: async t => state.chatCalls.push(t),
    activeView: 'home', generatedContent: { text: 'before' }, history: [], t: () => '',
    captureIntentSnapshot: () => { state.captureCalls++; }, restoreIntentSnapshot: () => { state.restoreCalls++; },
  };
  return { ...b, state, deps, send: async text => b.chat.planAndSendUdlMessage(text, deps) };
}
async function main() {
  {
    const h = harness();
    h.window.AlloModules.AlloCommands = { runPlan: async () => ({ ok: true, results: [] }) };
    h.deps._pendingBotPlanRef.current = { steps: [{ commandId: 'set_grade_level' }], originalText: 'change grade' };
    await h.send('__allo_plan_run');
    const undoOffered = h.state.messages.some(m => m.choices?.some(c => c.value === '__allo_plan_undo'));
    await h.send('__allo_plan_undo');
    observations.push({ id: 'undo-snapshot', captureCalls: h.state.captureCalls, undoSnapshot: h.deps._planUndoRef.current, undoOffered, lastMessage: h.state.messages.at(-1).text });
  }
  {
    const h = harness();
    h.deps._planUndoRef.current = { generatedContent: {}, history: [], activeView: 'home', settings: { grade: '5' } };
    await h.send('__allo_plan_undo');
    observations.push({ id: 'undo-settings', restoreCalls: h.state.restoreCalls, lastMessage: h.state.messages.at(-1).text });
  }
  for (const [id, result] of [['unavailable-confirm', null], ['failed-confirm', { handled: true, ok: false, narration: 'Provider failed.' }], ['pending-confirm', { handled: true, ok: true, pending: true, narration: 'Working...' }]]) {
    const h = harness();
    h.window.AlloModules.AlloCommands = { runCommandById: async () => result };
    h.deps._pendingBotCmdRef.current = { commandId: 'generate_quiz', params: {}, originalText: 'make a quiz' };
    await h.send('__allo_do');
    observations.push({ id, lastMessage: h.state.messages.at(-1).text });
  }
  {
    const h = harness();
    h.window.AlloModules.AlloCommands = { routeUtterance: async () => { h.state.routeCalls++; return { preview: true, commandId: 'open_educator_hub' }; } };
    h.deps._pendingBotPlanRef.current = { steps: [{ commandId: 'generate_quiz' }], originalText: 'make a quiz' };
    h.deps.udlMessages = [{ role: 'model', type: 'choices', text: 'Run the plan?', choices: [{ value: '__allo_plan_run' }] }];
    await h.send('open educator hub');
    observations.push({ id: 'choice-router-bypass', routerCalls: h.state.routeCalls, chatCalls: h.state.chatCalls, pendingPlan: h.deps._pendingBotPlanRef.current });
  }
  for (const input of ['cancel', '__allo_plan_show']) {
    const h = harness();
    h.window.AlloModules.AgentCoreContracts = {};
    h.window.AlloModules.AgentCoreBlueprintService = { createCommandWorkflowService: () => ({ saveSaved: (workflow, name) => { h.state.saves.push(name); return { ok: false, errors: [{ message: 'probe' }] }; } }) };
    h.deps._pendingBotPlanRef.current = { workflow: { steps: [] }, steps: [], saving: true, originalText: 'my plan' };
    await h.send(input);
    observations.push({ id: 'save-name-routing', input, attemptedSaveNames: h.state.saves, pending: !!h.deps._pendingBotPlanRef.current });
  }
  {
    const h = harness();
    const callGemini = async () => { throw Error('Provider should not be called'); };
    const result = await h.AC.planUtterance({ isTeacherMode: true, callGemini }, 'Create a complete lesson on ecosystems. ' + 'Include learner needs and resources. '.repeat(14));
    observations.push({ id: 'long-request', result });
  }
  {
    const h = harness();
    let finish;
    const ctx = { isTeacherMode: true, hasActiveBlueprint: true, runBlueprint: () => new Promise(resolve => { finish = resolve; }) };
    const out = await h.AC.runCommandById(ctx, 'run_lesson_blueprint', {}, { confirmed: true, awaitCompletion: true });
    observations.push({ id: 'blueprint-command-await', returnedBeforeGenerationFinished: typeof finish === 'function', result: out });
    finish?.({ status: 'failed' });
  }
  for (const [id, params] of [['rebuild_lesson_step', { step: 3 }], ['apply_lesson_template', { name: 'Vocabulary-first' }]]) {
    const h = harness();
    const invoked = [];
    const ctx = { isTeacherMode: true, hasActiveBlueprint: true,
      blueprintStepList: () => [{ position: 1, tool: 'quiz', uiId: 'q' }],
      rebuildBlueprintStep: n => { invoked.push(n); return { ok: true }; },
      lessonTemplateNames: () => [{ name: 'Vocabulary-first', id: 'v' }],
      applyLessonTemplateByName: n => { invoked.push(n); return { name: n }; },
    };
    const result = await h.AC.runCommandById(ctx, id, params, { confirmed: true });
    observations.push({ id: 'parameter-contract', command: id, supplied: params, allowed: h.AC.getCommandContract(id).params, invoked, result });
  }
  for (const question of ['Why did you choose a glossary?', 'Why include a glossary?', 'Would you change anything about this plan?']) {
    const h = harness();
    for (const f of ['agent_core_contracts_module.js', 'agent_core_blueprint_service_module.js', 'agent_core_ui_adapter_module.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), h.box, { filename: f });
    h.box.vi = { fn: impl => { const f = (...args) => { f.mock.calls.push(args); return impl?.(...args); }; f.mock = { calls: [] }; return f; } };
    const fixture = fs.readFileSync(path.join(root, 'tests/blueprint_review_lanes.test.js'), 'utf8');
    vm.runInContext(fixture.slice(fixture.indexOf('const BP ='), fixture.indexOf("describe('blueprint_review lanes'")) + '\nwindow.reviewFixture = { makeDeps, REVIEWING };', h.box);
    const fixtureRun = h.window.reviewFixture.makeDeps({ guidedFlowState: h.window.reviewFixture.REVIEWING, messages: [], intent: 'QUESTION' });
    await h.chat.handleSendUDLMessage(question, fixtureRun.deps);
    observations.push({ id: 'blueprint-question', question, answered: fixtureRun.deps.generateStandardChatResponse.mock.calls.length, revised: fixtureRun.deps.modifyBlueprintWithAI.mock.calls.length, lastMessage: fixtureRun.store.messages.at(-1)?.text });
  }
  {
    const h = harness();
    const commands = h.AC.buildAlloCommands({ isTeacherMode: true }, { includeGated: true });
    const missing = commands.flatMap(command => {
      const source = String(command.run || '') + String(command.runAsync || '');
      const keys = [...new Set([...source.matchAll(/\bp\??\.([a-zA-Z][a-zA-Z0-9_]*)/g)].map(m => m[1]))];
      const allowed = h.AC.getCommandContract(command.id).params;
      return keys.length && !allowed.length ? [{ id: command.id, reads: keys }] : [];
    });
    observations.push({ id: 'registry-param-scan', commandsInspected: commands.length, handlersReadingParamsWithoutContract: missing });
  }
  {
    const h = harness();
    let warnings = 0;
    await h.chat.generateStandardChatResponse('What would you suggest?', {
      udlMessages: [], history: [], inputText: '', currentUiLanguage: 'English', gradeLevel: '5',
      getGroupDifferentiationContext: () => '', callGemini: async () => { throw new Error('Simulated provider outage'); },
      setUdlMessages: h.deps.setUdlMessages, warnLog: () => { warnings++; },
    });
    observations.push({ id: 'chat-provider-failure', warnings, visibleMessages: h.state.messages });
  }
  {
    const h = harness();
    let quizCalls = 0;
    let newestContext;
    function render(sourcePresent) {
      const context = { isTeacherMode: true, hasSourceOrAnalysis: sourcePresent,
        generateSourceText: async () => { newestContext = render(true)(); return { text: 'new source' }; },
        generateQuiz: async () => { quizCalls++; return 'quiz'; },
      };
      return () => context;
    }
    h.deps._alloCmdCtx = render(false);
    h.deps._pendingBotPlanRef.current = { steps: [{ commandId: 'generate_source_text', params: { topic: 'ecosystems' } }, { commandId: 'generate_quiz', params: {} }], originalText: 'create a source then a quiz' };
    await h.send('__allo_plan_run');
    observations.push({ id: 'render-context-simulation', note: 'Simulates the render-scoped getter supplied by the host; does not mount the full React app.', newestContextHasSource: newestContext?.hasSourceOrAnalysis, quizCalls, lastMessage: h.state.messages.at(-1)?.text });
  }
  const output = JSON.stringify({ generatedAt: new Date().toISOString(), observations }, null, 2);
  fs.writeFileSync(path.join(__dirname, 'review-probes.json'), output + '\n');
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
