// Blueprint review: "execute the plan" vs "keep talking about the plan".
//
// Bug being pinned: blueprint_review treated EVERYTHING that wasn't a bare
// execution command ('go', 'run it', 'yes'...) as a blueprint edit. Asking
// "why did you choose a Venn diagram?" silently rewrote the plan and replied
// "Blueprint updated!" — there was no way to ask a question while a plan was
// on screen. And because both exits from the card (Generate, Cancel) null the
// blueprint WITHOUT clearing the stage, every later message was handed to the
// reviser with `null`, came back "I couldn't make that change", and left the
// generic chat/command parser unreachable until the teacher typed 'stop'.
//
// Fix under test: explicit mode pills (Generate it / Change something / Ask
// about this plan), the already-paid-for detectWorkflowIntent QUESTION verdict
// routing free text, and a stale blueprint_review stage that retires itself.

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

loadAlloModule('agent_core_contracts_module.js');
loadAlloModule('agent_core_blueprint_service_module.js');
loadAlloModule('agent_core_ui_adapter_module.js');
loadAlloModule('udl_chat_module.js');
const handleSendUDLMessage = window.AlloModules.UdlChat.handleSendUDLMessage;

const BP = { resourcePlan: [{ tool: 'glossary', directive: '' }, { tool: 'quiz', directive: '' }] };

const reviewChoicesMsg = () => ({
  role: 'model', type: 'choices', stage: 'blueprint_review', text: 'Here is your Lesson Blueprint.',
  choices: [
    { label: 'Generate it', value: 'go' },
    { label: 'Change something', value: 'I want to change something', mode: 'edit' },
    { label: 'Ask about this plan', value: 'I have a question about this plan', mode: 'question' },
  ],
});

const makeDeps = ({ activeBlueprint = BP, guidedFlowState, messages = [], intent = 'CHAT' }) => {
  const store = { messages: [...messages], guidedFlowState: { ...guidedFlowState }, executed: 0, blueprint: activeBlueprint };
  const apply = (prev, next) => (typeof next === 'function' ? next(prev) : next);
  const deps = {
    guidedFlowState,
    isAutoFillMode: true,
    udlMessages: messages,
    udlInput: '',
    inputText: 'Photosynthesis source text',
    sourceTopic: 'Photosynthesis',
    gradeLevel: '5th Grade',
    standardsInput: '',
    leveledTextLanguage: 'English',
    history: [],
    activeBlueprint,
    isBotVisible: false,
    isShowMeMode: false,
    alloBotRef: { current: null },
    uiDispatch: vi.fn(),
    setUdlMessages: (next) => { store.messages = apply(store.messages, next); },
    setGuidedFlowState: (next) => { store.guidedFlowState = apply(store.guidedFlowState, next); },
    setIsAutoFillMode: vi.fn(),
    setUdlInput: () => {},
    setIsChatProcessing: () => {},
    setActiveBlueprint: vi.fn((c) => { store.blueprint = c; }),
    setActiveView: () => {},
    setShowStemLab: () => {},
    addToast: vi.fn(),
    t: (key) => key,
    warnLog: () => {},
    detectWorkflowIntent: vi.fn(async () => ({ intent, modification: null })),
    parseUserIntent: vi.fn(async () => ({ intent: 'OPEN_MODULE', target: 'export' })),
    generateStandardChatResponse: vi.fn(async () => {}),
    modifyBlueprintWithAI: vi.fn(async (cfg) => cfg),
    autoConfigureSettings: vi.fn(async () => BP),
    handleExecuteBlueprint: vi.fn(async () => { store.executed += 1; }),
    captureIntentSnapshot: () => {},
    flyToElement: () => {},
    getStageElementId: () => 'x',
    performHighlight: () => {},
  };
  return { deps, store };
};

const REVIEWING = { isFlowActive: true, currentStage: 'blueprint_review' };
const last = (store) => store.messages[store.messages.length - 1];

describe('blueprint_review lanes', () => {
  it('presents the plan with Generate / Change / Ask pills', async () => {
    const { deps, store } = makeDeps({
      messages: [{ role: 'model', type: 'choices', stage: 'pack_count_selection', text: 'How extensive?', choices: [{ label: 'Auto', value: 'auto' }] }],
      guidedFlowState: { isFlowActive: true, currentStage: 'pack_count_selection' },
    });
    await handleSendUDLMessage('auto', deps);
    const card = store.messages[store.messages.length - 2];
    expect(card.type).toBe('blueprint');
    const chooser = last(store);
    expect(chooser.type).toBe('choices');
    expect(chooser.stage).toBe('blueprint_review');
    expect(chooser.choices.map(c => c.value)).toEqual([
      'go', 'I want to change something', 'I have a question about this plan',
    ]);
  });

  it('a mode pill only picks the lane — it never touches the plan', async () => {
    const { deps, store } = makeDeps({ messages: [reviewChoicesMsg()], guidedFlowState: REVIEWING });
    await handleSendUDLMessage('I have a question about this plan', deps);
    expect(store.guidedFlowState.pendingContext).toBe('blueprint_question');
    expect(deps.modifyBlueprintWithAI).not.toHaveBeenCalled();
    expect(store.executed).toBe(0);
    expect(deps.setActiveBlueprint).not.toHaveBeenCalled();
  });

  it('a question asked in the question lane is ANSWERED, not applied as an edit', async () => {
    const { deps, store } = makeDeps({
      messages: [reviewChoicesMsg()],
      guidedFlowState: { ...REVIEWING, pendingContext: 'blueprint_question' },
    });
    await handleSendUDLMessage('why did you choose a Venn diagram?', deps);
    expect(deps.generateStandardChatResponse).toHaveBeenCalledTimes(1);
    expect(deps.modifyBlueprintWithAI).not.toHaveBeenCalled();
    // The pending plan is handed to the answerer as context.
    expect(deps.generateStandardChatResponse.mock.calls[0][0]).toContain('glossary, quiz');
    // …and the pills come back so the plan still has a live affordance.
    expect(last(store).type).toBe('choices');
    expect(last(store).stage).toBe('blueprint_review');
    expect(store.guidedFlowState.pendingContext).toBe(null);
  });

  it('free-typed text classified QUESTION leaves the plan alone (the reported bug)', async () => {
    const { deps } = makeDeps({ messages: [], guidedFlowState: REVIEWING, intent: 'QUESTION' });
    await handleSendUDLMessage('is a concept map really right for 5th grade?', deps);
    expect(deps.generateStandardChatResponse).toHaveBeenCalledTimes(1);
    expect(deps.modifyBlueprintWithAI).not.toHaveBeenCalled();
  });

  it('an explicit edit still revises even when the classifier says QUESTION', async () => {
    const { deps, store } = makeDeps({ messages: [], guidedFlowState: REVIEWING, intent: 'QUESTION' });
    await handleSendUDLMessage('remove the timeline', deps);
    expect(deps.modifyBlueprintWithAI).toHaveBeenCalledTimes(1);
    expect(deps.generateStandardChatResponse).not.toHaveBeenCalled();
    expect(last(store).type).toBe('choices'); // pills re-offered after the edit
  });

  it('the Generate pill executes', async () => {
    const { deps, store } = makeDeps({ messages: [reviewChoicesMsg()], guidedFlowState: REVIEWING });
    await handleSendUDLMessage('go', deps);
    expect(store.executed).toBe(1);
    expect(store.guidedFlowState.isFlowActive).toBe(false);
    expect(deps.modifyBlueprintWithAI).not.toHaveBeenCalled();
  });

  it('"go" in the question lane asks rather than firing the whole pack off', async () => {
    const { deps, store } = makeDeps({
      messages: [reviewChoicesMsg()],
      guidedFlowState: { ...REVIEWING, pendingContext: 'blueprint_question' },
    });
    await handleSendUDLMessage('go', deps);
    expect(store.executed).toBe(0);
    expect(deps.generateStandardChatResponse).toHaveBeenCalledTimes(1);
  });

  it('a finished blueprint_review retires itself instead of stranding the panel', async () => {
    // Both Generate and Cancel null the blueprint without clearing the stage.
    const { deps, store } = makeDeps({ activeBlueprint: null, messages: [], guidedFlowState: REVIEWING });
    await handleSendUDLMessage('where is the font setting?', deps);
    expect(store.guidedFlowState.currentStage).toBe(null);
    expect(store.guidedFlowState.isFlowActive).toBe(false);
    expect(deps.modifyBlueprintWithAI).not.toHaveBeenCalled();
    // The message reaches the normal command parser again — the whole point.
    expect(deps.parseUserIntent).toHaveBeenCalledTimes(1);
  });
});

// ── Copy-sync guardrails ──
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('blueprint lane copy-sync guardrails', () => {
  it.each(['udl_chat_source.jsx', 'udl_chat_module.js', 'desktop/web-app/public/udl_chat_module.js'])(
    '%s routes questions away from the reviser', (file) => {
      const src = read(file);
      expect(src).toContain('blueprintChoices');
      expect(src).toContain('blueprintQuestionContext');
      expect(src).toContain("_staleBlueprintReview");
      expect(src).toContain("intentResult.intent === 'QUESTION'");
    });

  it.each(['phase_o_misc_handlers_source.jsx', 'phase_o_misc_handlers_module.js', 'desktop/web-app/public/phase_o_misc_handlers_module.js'])(
    '%s keeps the chat panel alive through execution', (file) => {
      const src = read(file);
      // The panel must not close, and the stage must not be left dangling.
      expect(src).not.toContain('setShowUDLGuide(false)');
      expect(src).toContain("setGuidedFlowState({ currentStage: null, isFlowActive: false, pendingContext: null })");
      expect(src).toContain('blueprint.execution_started');
    });
});
