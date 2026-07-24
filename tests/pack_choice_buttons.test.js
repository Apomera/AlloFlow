// Step-vs-Pack chooser buttons + deterministic routing (udl_chat).
//
// Bug being pinned: at the guided-flow "Step or Pack" question, the reply was
// free text. When the flow flags (isAutoFillMode / isFlowActive) had been
// dropped — or the detectWorkflowIntent LLM pass misread the reply — a "pack"
// answer fell through to the generic parseUserIntent parser, whose vocabulary
// includes the 'export' module, so AlloBot opened the .allopack Export menu
// instead of generating a full pack.
//
// Fix under test: the chooser is now a `type: 'choices'` message (rendered as
// buttons by UDLGuideModal). handleSendUDLMessage routes a reply that names a
// pending on-screen choice straight into the guided flow — reactivating the
// flow flags if needed and skipping the LLM intent pass entirely.

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

loadAlloModule('agent_core_contracts_module.js');
loadAlloModule('agent_core_blueprint_service_module.js');
loadAlloModule('agent_core_ui_adapter_module.js');
loadAlloModule('udl_chat_module.js');
const handleSendUDLMessage = window.AlloModules.UdlChat.handleSendUDLMessage;

const stepPackChoicesMsg = (stage = 'initial_choice') => ({
  role: 'model', type: 'choices', stage,
  text: 'How would you like to proceed?',
  choices: [
    { label: 'Step-by-Step', value: 'step', keywords: ['step'] },
    { label: 'Full Pack', value: 'pack', keywords: ['pack', 'full', 'auto'] },
  ],
});

// Minimal deps harness. State setters apply functional updates against a
// store; udlMessages stays immutable per call (mirrors React props). The two
// LLM helpers are poisoned so the test fails loudly if either is consulted:
// detectWorkflowIntent returns STOP (would kill the flow), parseUserIntent
// returns OPEN_MODULE export (the reported misroute).
const makeDeps = ({ messages, guidedFlowState, isAutoFillMode }) => {
  const store = {
    messages: [...messages],
    guidedFlowState: { ...guidedFlowState },
    isAutoFillMode,
    activeBlueprint: null,
  };
  const apply = (prev, next) => (typeof next === 'function' ? next(prev) : next);
  const deps = {
    guidedFlowState,
    isAutoFillMode,
    udlMessages: messages,
    udlInput: '',
    inputText: 'Photosynthesis source text',
    sourceTopic: 'Photosynthesis',
    gradeLevel: '5th Grade',
    standardsInput: '',
    leveledTextLanguage: 'English',
    history: [],
    isBotVisible: false,
    isShowMeMode: false,
    alloBotRef: { current: null },
    uiDispatch: vi.fn(),
    setUdlMessages: (next) => { store.messages = apply(store.messages, next); },
    setGuidedFlowState: (next) => { store.guidedFlowState = apply(store.guidedFlowState, next); },
    setIsAutoFillMode: vi.fn((v) => { store.isAutoFillMode = v; }),
    setUdlInput: () => {},
    setIsChatProcessing: () => {},
    setActiveBlueprint: vi.fn((cfg) => { store.activeBlueprint = cfg; }),
    setActiveView: () => {},
    setShowStemLab: () => {},
    addToast: vi.fn(),
    t: (key) => key,
    warnLog: () => {},
    detectWorkflowIntent: vi.fn(async () => ({ intent: 'STOP', modification: null })),
    parseUserIntent: vi.fn(async () => ({ intent: 'OPEN_MODULE', target: 'export' })),
    autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'glossary', directive: '' }] })),
    generateStandardChatResponse: vi.fn(async () => {}),
    captureIntentSnapshot: () => {},
    flyToElement: () => {},
    getStageElementId: () => 'x',
    performHighlight: () => {},
  };
  return { deps, store };
};

describe('Step/Pack chooser routing (handleSendUDLMessage)', () => {
  it("routes a 'pack' button click to pack count selection without any LLM pass", async () => {
    const { deps, store } = makeDeps({
      messages: [stepPackChoicesMsg()],
      guidedFlowState: { isFlowActive: true, currentStage: 'initial_choice' },
      isAutoFillMode: true,
    });
    await handleSendUDLMessage('pack', deps);
    expect(store.guidedFlowState.currentStage).toBe('pack_count_selection');
    expect(store.guidedFlowState.pendingBlueprintContext).toBe('');
    expect(deps.detectWorkflowIntent).not.toHaveBeenCalled();
    expect(deps.parseUserIntent).not.toHaveBeenCalled();
    expect(deps.uiDispatch).not.toHaveBeenCalled();
    const last = store.messages[store.messages.length - 1];
    expect(last.text).toBe('chat_guide.pack.count_selection');
  });

  it("still routes 'pack' into the flow when the flow flags were dropped (export-misroute bug)", async () => {
    const { deps, store } = makeDeps({
      messages: [stepPackChoicesMsg()],
      guidedFlowState: { isFlowActive: false, currentStage: null },
      isAutoFillMode: false,
    });
    await handleSendUDLMessage('pack', deps);
    expect(deps.setIsAutoFillMode).toHaveBeenCalledWith(true);
    expect(store.guidedFlowState.isFlowActive).toBe(true);
    expect(store.guidedFlowState.currentStage).toBe('pack_count_selection');
    // The whole point: the generic parser (which reads "pack" as the
    // .allopack export) must never see this reply.
    expect(deps.parseUserIntent).not.toHaveBeenCalled();
    expect(deps.uiDispatch).not.toHaveBeenCalled();
  });

  it('keeps a richer keyword reply as blueprint guidance context', async () => {
    const { deps, store } = makeDeps({
      messages: [stepPackChoicesMsg()],
      guidedFlowState: { isFlowActive: true, currentStage: 'initial_choice' },
      isAutoFillMode: true,
    });
    await handleSendUDLMessage('full pack focused on vocabulary', deps);
    expect(store.guidedFlowState.currentStage).toBe('pack_count_selection');
    expect(store.guidedFlowState.pendingBlueprintContext).toBe('full pack focused on vocabulary');
    expect(deps.parseUserIntent).not.toHaveBeenCalled();
  });

  it("routes a 'step' button click to blueprint generation with empty context", async () => {
    const { deps, store } = makeDeps({
      messages: [stepPackChoicesMsg()],
      guidedFlowState: { isFlowActive: true, currentStage: 'initial_choice' },
      isAutoFillMode: true,
    });
    await handleSendUDLMessage('step', deps);
    // generateBlueprint is fire-and-forget inside the handler; wait for it.
    await vi.waitFor(() => {
      expect(store.guidedFlowState.currentStage).toBe('blueprint_review');
    });
    expect(deps.autoConfigureSettings).toHaveBeenCalledTimes(1);
    expect(deps.autoConfigureSettings.mock.calls[0][4]).toBe(''); // context arg
    expect(deps.setActiveBlueprint).toHaveBeenCalled();
    expect(deps.parseUserIntent).not.toHaveBeenCalled();
    expect(deps.detectWorkflowIntent).not.toHaveBeenCalled();
  });

  it("handles the post-analysis chooser ('pack' after analysis) the same way", async () => {
    const { deps, store } = makeDeps({
      messages: [stepPackChoicesMsg('post_analysis_route')],
      guidedFlowState: { isFlowActive: false, currentStage: null },
      isAutoFillMode: false,
    });
    await handleSendUDLMessage('pack', deps);
    expect(store.guidedFlowState.currentStage).toBe('pack_count_selection');
    expect(store.guidedFlowState.pendingBlueprintContext).toBe('');
    expect(deps.parseUserIntent).not.toHaveBeenCalled();
  });

  it('does NOT hijack an unrelated reply when the flow is inactive', async () => {
    const { deps, store } = makeDeps({
      messages: [stepPackChoicesMsg()],
      guidedFlowState: { isFlowActive: false, currentStage: null },
      isAutoFillMode: false,
    });
    await handleSendUDLMessage('where is the font settings', deps);
    // Falls through to the generic intent path (existing behavior).
    expect(deps.parseUserIntent).toHaveBeenCalledTimes(1);
    expect(store.guidedFlowState.currentStage).toBe(null);
  });
});

// ── Copy-sync guardrails (repo pattern: every hand-patched copy must carry
// the fix; a recompile or partial patch that drops one copy fails here). ──
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

const chatFiles = [
  'udl_chat_source.jsx',
  'udl_chat_module.js',
  'desktop/web-app/public/udl_chat_module.js',
];
const modalFiles = [
  'view_misc_modals_source.jsx',
  'view_misc_modals_module.js',
  'desktop/web-app/public/view_misc_modals_module.js',
];
const hostFiles = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

describe('Step/Pack chooser copy-sync guardrails', () => {
  it.each(chatFiles)('%s carries deterministic chooser routing', (file) => {
    const src = read(file);
    expect(src).toContain('const buildStepPackChoices');
    expect(src).toContain('_pendingChoiceMsg');
    expect(src).toContain('switch (_effectiveStage)');
    expect(src).toContain("buildStepPackChoices(msg, 'initial_choice')");
    expect(src).toContain("'post_analysis_route')]");
    expect(src).not.toContain("(Type 'Step' or 'Pack')");
  });

  it.each(modalFiles)('%s renders choices messages as buttons', (file) => {
    const src = read(file);
    expect(src).toMatch(/msg\.type === ['"]choices['"]/);
    expect(src).toContain('handleSendUDLMessage(choice.value)');
    expect(src).toContain('idx !== udlMessages.length - 1');
  });

  it.each(hostFiles)('%s posts the auto-fill chooser as a choices message', (file) => {
    const src = read(file);
    expect(src).toContain("type: 'choices', stage: 'initial_choice'");
    expect(src).toContain("value: 'step'");
    expect(src).toContain("value: 'pack'");
  });
});
