import { describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

loadAlloModule('udl_chat_module.js');

const {
  applySourceGenerationConfig,
  buildLessonConversationHandoff,
  formatSourceGenerationSummary,
  handleSendUDLMessage,
  inferLessonConversationHandoff,
  normalizeSourceGenerationConfig,
} = window.AlloModules.UdlChat;

describe('AlloBot lesson-conversation handoff', () => {
  it('keeps only a bounded, labelled lesson-design transcript', () => {
    const handoff = buildLessonConversationHandoff([
      { role: 'model', text: 'Welcome!', isWelcome: true },
      { role: 'user', text: 'I want to teach equivalent fractions through basketball statistics.' },
      { role: 'model', text: 'A ratio table and visual model could work well.' },
      { role: 'model', type: 'choices', text: 'Step-by-Step or Full Pack?' },
      { role: 'model', type: 'blueprint', text: 'internal blueprint card' },
      { role: 'user', text: '__allo_internal_marker' },
    ]);
    expect(handoff).toContain('Teacher: I want to teach equivalent fractions through basketball statistics.');
    expect(handoff).toContain('AlloBot: A ratio table and visual model could work well.');
    expect(handoff).not.toContain('Welcome!');
    expect(handoff).not.toContain('Step-by-Step');
    expect(handoff).not.toContain('internal blueprint card');
    expect(handoff).not.toContain('__allo_internal_marker');
  });

  it('normalizes every Source Generator setting and caps standards', () => {
    expect(normalizeSourceGenerationConfig({
      topic: 'Equivalent fractions',
      sourceSettings: {
        outputLanguage: 'Spanish',
        gradeLevel: 'grade 6',
        tone: 'argument',
        length: 'long',
        dokLevel: 3,
        targetStandards: ['A', 'B', 'C', 'D'],
        sourceVocabulary: ['ratio', 'equivalent'],
        sourceCustomInstructions: 'Use sports data.',
        includeSourceCitations: 'yes',
      },
      interests: ['basketball'],
      lessonGuidance: 'End with an exit ticket.',
    })).toEqual({
      topic: 'Equivalent fractions',
      language: 'Spanish',
      grade: '6th Grade',
      tone: 'Persuasive',
      length: '500',
      dok: 'Level 3',
      standards: ['A', 'B', 'C'],
      vocabulary: 'ratio, equivalent',
      customInstructions: 'Use sports data.',
      includeCitations: true,
      studentInterests: ['basketball'],
      blueprintGuidance: 'End with an exit ticket.',
    });
  });

  it('extracts settings from untrusted conversation while preserving fallback fields', async () => {
    const callGemini = vi.fn(async () => JSON.stringify({
      topic: 'Equivalent fractions',
      language: 'Spanish',
      sourceSettings: {
        grade: '6th Grade',
        tone: 'Dialogue',
        length: 700,
        dok: 'DOK 3',
        standards: ['CCSS.MATH.CONTENT.6.RP.A.3'],
        vocabulary: ['ratio', 'unit rate'],
        customInstructions: 'Use a basketball score table.',
        includeCitations: true,
      },
      studentInterests: ['basketball'],
      blueprintGuidance: 'Use visual models, retrieval practice, and an exit ticket.',
    }));
    const config = await inferLessonConversationHandoff({
      conversationContext: 'Teacher: Plan a grade 6 fractions lesson around basketball.',
      latestRequest: 'Turn this discussion into a lesson.',
      currentSettings: { tone: 'Informative', length: '250' },
      fallbackConfig: { includeCitations: false },
    }, { callGemini, cleanJson: (value) => value });
    expect(callGemini).toHaveBeenCalledTimes(1);
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('UNTRUSTED DATA');
    expect(prompt).toContain('CURRENT SETTINGS');
    expect(config).toMatchObject({
      topic: 'Equivalent fractions',
      language: 'Spanish',
      grade: '6th Grade',
      tone: 'Dialogue',
      length: '700',
      dok: 'Level 3',
      standards: ['CCSS.MATH.CONTENT.6.RP.A.3'],
      vocabulary: 'ratio, unit rate',
      customInstructions: 'Use a basketball score table.',
      includeCitations: true,
      studentInterests: ['basketball'],
    });
  });

  it('applies grade to both Universal and Source Generator state', () => {
    const setters = {
      setSourceTopic: vi.fn(),
      setGradeLevel: vi.fn(),
      setSourceLevel: vi.fn(),
      setSourceTone: vi.fn(),
      setSourceLength: vi.fn(),
      setDokLevel: vi.fn(),
      setTargetStandards: vi.fn(),
      setStandardsInput: vi.fn(),
      setSourceVocabulary: vi.fn(),
      setSourceCustomInstructions: vi.fn(),
      setIncludeSourceCitations: vi.fn(),
      setStudentInterests: vi.fn(),
      setLeveledTextLanguage: vi.fn(),
      setSelectedLanguages: vi.fn(),
    };
    applySourceGenerationConfig({
      topic: 'Fractions', language: 'Spanish', grade: '6', tone: 'story', length: '1000 words', dok: 4,
      standards: ['A', 'B'], vocabulary: ['ratio'], customInstructions: 'Use diagrams.',
      includeCitations: true, studentInterests: ['sports'],
    }, setters);
    expect(setters.setGradeLevel).toHaveBeenCalledWith('6th Grade');
    expect(setters.setSourceLevel).toHaveBeenCalledWith('6th Grade');
    expect(setters.setSourceTopic).toHaveBeenCalledWith('Fractions');
    expect(setters.setLeveledTextLanguage).toHaveBeenCalledWith('Spanish');
    expect(setters.setSourceTone).toHaveBeenCalledWith('Narrative');
    expect(setters.setSourceLength).toHaveBeenCalledWith('1000');
    expect(setters.setDokLevel).toHaveBeenCalledWith('Level 4');
    expect(setters.setTargetStandards).toHaveBeenCalledWith(['A', 'B']);
    expect(setters.setStandardsInput).toHaveBeenCalledWith('');
    expect(setters.setSourceVocabulary).toHaveBeenCalledWith('ratio');
    expect(setters.setSourceCustomInstructions).toHaveBeenCalledWith('Use diagrams.');
    expect(setters.setIncludeSourceCitations).toHaveBeenCalledWith(true);
    const mergeInterests = setters.setStudentInterests.mock.calls[0][0];
    expect(mergeInterests(['music'])).toEqual(['music', 'sports']);
    const mergeLanguages = setters.setSelectedLanguages.mock.calls[0][0];
    expect(mergeLanguages(['French'])).toEqual(['French', 'Spanish']);
  });

  it('summarizes all reviewed settings before source generation', () => {
    const summary = formatSourceGenerationSummary({
      topic: 'Fractions', language: 'Spanish', grade: '6th Grade', tone: 'Dialogue', length: 500,
      dok: 3, standards: ['CCSS.6.RP.A.3'], vocabulary: 'ratio',
      customInstructions: 'Use sports data.', includeCitations: true,
    });
    for (const label of ['Topic', 'Resource output language', 'Target level', 'Tone', 'Length', 'DOK', 'Target standards', 'Vocabulary focus', 'Custom source instructions', 'source citations']) {
      expect(summary).toContain(label);
    }
  });

  it('generates the source with the reviewed settings instead of stale React state', async () => {
    const config = {
      topic: 'Fractions', grade: '6th Grade', tone: 'Dialogue', length: '700', dok: 'Level 3',
      standards: ['CCSS.6.RP.A.3'], vocabulary: 'ratio, unit rate',
      customInstructions: 'Use basketball data.', includeCitations: true,
    };
    const store = { messages: [], flow: { isFlowActive: true, currentStage: 'source', pendingSourceConfig: config } };
    const apply = (previous, next) => typeof next === 'function' ? next(previous) : next;
    const handleGenerateSource = vi.fn(async () => ({}));
    await handleSendUDLMessage('yes', {
      guidedFlowState: store.flow,
      isAutoFillMode: true,
      udlMessages: [], udlInput: '', inputText: '', sourceTopic: 'Old topic',
      gradeLevel: '5th Grade', sourceLevel: '5th Grade', sourceTone: 'Informative', sourceLength: '250',
      sourceVocabulary: '', sourceCustomInstructions: '', includeSourceCitations: false,
      standardsInput: '', targetStandards: [], dokLevel: '', studentInterests: [], history: [],
      leveledTextLanguage: 'English', isBotVisible: false, isShowMeMode: false,
      alloBotRef: { current: null },
      setUdlMessages: (next) => { store.messages = apply(store.messages, next); },
      setGuidedFlowState: (next) => { store.flow = apply(store.flow, next); },
      setUdlInput: vi.fn(), setIsChatProcessing: vi.fn(),
      detectWorkflowIntent: vi.fn(async () => ({ intent: 'CONFIRM', modification: null })),
      handleGenerateSource,
      getWorkflowContext: () => ({}),
      generateDynamicBridge: vi.fn(async () => 'Analyze next?'),
      flyToElement: vi.fn(), getStageElementId: () => 'analysis',
      t: (key) => key, warnLog: vi.fn(),
    });
    expect(handleGenerateSource).toHaveBeenCalledWith({
      topic: 'Fractions', grade: '6th Grade', tone: 'Dialogue', length: '700', dokLevel: 'Level 3',
      standards: 'CCSS.6.RP.A.3', vocabulary: 'ratio, unit rate',
      customInstructions: 'Use basketball data.', includeCitations: true,
    });
    expect(store.flow.currentStage).toBe('analysis');
  });
});
