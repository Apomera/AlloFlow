#!/usr/bin/env node
'use strict';

// Deterministic local-LLM resource matrix.
//
// This exercises generate_dispatcher_source.jsx through its real browser-facing
// handleGenerate entry point while forcing the "local text backend" path. The
// default mode uses a tiny canned local-model responder so CI can catch routing,
// parsing, and normalization regressions without a running desktop engine.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const JSON_OUT = args.includes('--json');
const LIVE = args.includes('--live');
const typeArg = args.find((a) => a.startsWith('--type='));
const ONLY_TYPES = typeArg ? new Set(typeArg.slice('--type='.length).split(',').map((s) => s.trim()).filter(Boolean)) : null;
const targetArg = args.find((a) => a.startsWith('--target='));
const baseUrlArg = args.find((a) => a.startsWith('--base-url='));
const modelArg = args.find((a) => a.startsWith('--model='));
const LIVE_BASE_URL = baseUrlArg ? baseUrlArg.slice('--base-url='.length).replace(/\/$/, '') : 'http://localhost:32173';
const LIVE_MODEL = modelArg ? modelArg.slice('--model='.length) : 'local-model';

const TARGET_FILES = {
  source: path.join(ROOT, 'generate_dispatcher_source.jsx'),
  module: path.join(ROOT, 'generate_dispatcher_module.js'),
  public: path.join(ROOT, 'desktop/web-app', 'public', 'generate_dispatcher_module.js'),
};
const DEFAULT_TARGETS = LIVE ? ['module'] : ['source', 'module', 'public'];
const TARGET_NAMES = targetArg
  ? targetArg.slice('--target='.length).split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_TARGETS;

for (const name of TARGET_NAMES) {
  if (!TARGET_FILES[name]) {
    console.error('Unknown target: ' + name + ' (expected source, module, public, or a comma-separated subset)');
    process.exit(2);
  }
  if (!fs.existsSync(TARGET_FILES[name])) {
    console.error('Missing target file: ' + TARGET_FILES[name]);
    process.exit(2);
  }
}

const SAMPLE_TEXT = [
  'During the American Revolution, colonists debated how power should be shared.',
  'Some leaders argued that government should protect rights and listen to citizens.',
  'Others worried that sudden change could create conflict and uncertainty.',
  'Students can compare claims, evidence, and causes to understand the debate.'
].join(' ');

const CASES = [
  { type: 'simplified', expect: (item) => typeof item.data === 'string' && /students|government|rights/i.test(item.data) },
  { type: 'glossary', expect: (item) => Array.isArray(item.data) && item.data.length >= 2 && item.data.every((x) => x.term && x.def) },
  { type: 'outline', config: { outlineType: 'Venn Diagram' }, expect: (item) => item.data && Array.isArray(item.data.branches) && item.data.branches.length >= 2 },
  { type: 'image', expect: (item) => item.data && item.data.imageUrl && item.data.altText },
  { type: 'quiz', config: { quizMcqCount: 4 }, expect: (item) => item.data && Array.isArray(item.data.questions) && item.data.questions.length >= 3 },
  { type: 'analysis', expect: (item) => item.data && item.data.readingLevel && Array.isArray(item.data.concepts) },
  { type: 'faq', expect: (item) => Array.isArray(item.data) && item.data.length >= 3 && item.data.every((x) => x.question && x.answer) },
  { type: 'brainstorm', expect: (item) => Array.isArray(item.data) && item.data.length >= 3 && item.data.every((x) => x.title && x.description) },
  { type: 'sentence-frames', expect: (item) => item.data && ((Array.isArray(item.data.items) && item.data.items.length > 0) || item.data.text) },
  { type: 'timeline', expect: (item) => item.data && Array.isArray(item.data.items) && item.data.items.length >= 3 },
  { type: 'math', expect: (item) => item.data && Array.isArray(item.data.problems) && item.data.problems.length >= 1 },
  { type: 'gemini-bridge', expect: (item) => Array.isArray(item.data) && item.data.length >= 3 },
  { type: 'concept-sort', expect: (item) => item.data && Array.isArray(item.data.categories) && Array.isArray(item.data.items) && item.data.items.length >= 4 },
  { type: 'dbq', expect: (item) => item.data && Array.isArray(item.data.documents) && item.data.documents.length >= 2 && Array.isArray(item.data.rubric) },
  { type: 'lesson-plan', expect: (item) => item.data && Array.isArray(item.data.objectives) && item.data.objectives.length >= 2 },
  { type: 'adventure', expect: (item) => item.data && item.data.text && Array.isArray(item.data.options) && item.data.options.length >= 2 },
  { type: 'persona', expect: (item) => Array.isArray(item.data) && item.data.length >= 1 && item.data[0].name },
  { type: 'note-taking', config: { templateType: 'cornell-notes' }, expect: (item) => item.data && item.data.templateType === 'cornell-notes' && Array.isArray(item.data.cues) && item.data.cues.length > 0 },
  { type: 'anchor-chart', expect: (item) => item.data && Array.isArray(item.data.sections) && item.data.sections.length >= 2 },
].filter((item) => !ONLY_TYPES || ONLY_TYPES.has(item.type));

function cleanJson(raw) {
  return String(raw || '')
    .replace(/```(?:json|javascript|js)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function safeJsonParse(raw) {
  try { return JSON.parse(cleanJson(raw)); } catch (_) {}
  const text = String(raw || '');
  const start = Math.min(...['{', '['].map((ch) => {
    const idx = text.indexOf(ch);
    return idx < 0 ? Infinity : idx;
  }));
  const endObj = text.lastIndexOf('}');
  const endArr = text.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  if (Number.isFinite(start) && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

function json(value) {
  return JSON.stringify(value);
}

function cannedResponse(type, prompt, jsonMode) {
  if (type === 'simplified' && !jsonMode) {
    return 'Students debated how government should protect rights. Some people wanted change. Others worried change could cause conflict. Evidence helps us compare both views.';
  }
  if (type === 'glossary') {
    return json({ terms: [
      { term: 'rights', def: 'Freedoms or protections people should have.', tier: 'Academic' },
      { term: 'revolution', def: 'A major change in government or society.', tier: 'Domain-Specific' },
      { term: 'evidence', def: 'Details that support a claim.', tier: 'Academic' },
    ] });
  }
  if (type === 'outline') {
    return json({
      main: 'Debates About Government',
      branches: [
        { title: 'Change', items: ['Protect rights', 'Listen to citizens'] },
        { title: 'Caution', items: ['Avoid conflict', 'Plan carefully'] },
      ],
    });
  }
  if (type === 'image') {
    return json({ visualElements: 'two groups debating, scales of justice, document, arrows showing claims and evidence', altText: 'A diagram showing two views about changing government.' });
  }
  if (type === 'quiz') {
    return json({ questions: [
      { type: 'mcq', question: 'What did some leaders believe government should protect?', options: ['Rights', 'Weather', 'Recipes', 'Sports'], correctAnswer: 'Rights', conceptLabel: 'rights protection' },
      { type: 'mcq', question: 'Why did some people worry about sudden change?', options: ['It could create conflict', 'It would stop reading', 'It would erase maps', 'It made farms vanish'], correctAnswer: 'It could create conflict', conceptLabel: 'change risks' },
      { type: 'mcq', question: 'What helps students compare claims?', options: ['Evidence', 'Noise', 'Guessing', 'Decoration'], correctAnswer: 'Evidence', conceptLabel: 'using evidence' },
    ], reflections: [] });
  }
  if (type === 'analysis') {
    return json({
      readingLevel: { range: '5th-7th Grade', explanation: 'Short sentences with abstract civic vocabulary.' },
      concepts: ['rights', 'evidence', 'conflict', 'government'],
      accuracy: { rating: 'High', reason: 'The source makes broad, grade-appropriate claims.' },
      grammar: ['None detected'],
    });
  }
  if (type === 'faq') {
    return json({ faqs: [
      { question: 'Why did colonists debate government?', answer: 'They disagreed about how power and rights should be protected.' },
      { question: 'What is evidence?', answer: 'Evidence is information that supports a claim.' },
      { question: 'Why can change feel risky?', answer: 'People may worry about conflict or uncertainty.' },
    ] });
  }
  if (type === 'brainstorm') {
    return json({ ideas: [
      { title: 'Claim Corners', description: 'Students move to corners for different claims and cite evidence.', connection: 'Connects debate to evidence.' },
      { title: 'Rights Poster', description: 'Students create a small poster explaining one right.', connection: 'Connects abstract rights to examples.' },
      { title: 'Cause Chain', description: 'Students arrange causes and effects of conflict.', connection: 'Shows why change can be complex.' },
    ] });
  }
  if (type === 'sentence-frames') {
    return json({ mode: 'list', items: [
      { text: 'One claim in the source is ___.' },
      { text: 'The evidence that supports this claim is ___.' },
      { text: 'Another point of view is ___.' },
    ], rubric: '| Criteria | 1 | 3 | 5 |\n|---|---|---|---|\n| Evidence | Missing | Some evidence | Strong evidence |' });
  }
  if (type === 'timeline') {
    return json({
      detectedMode: 'cause-effect',
      progressionLabel: 'Cause and Effect: Concern -> Debate -> Decision',
      items: [
        { date: 'Cause', event: 'People worry rights are not protected.' },
        { date: 'Debate', event: 'Leaders compare claims and evidence.' },
        { date: 'Risk', event: 'Some people warn that change can create conflict.' },
        { date: 'Decision', event: 'Students evaluate which argument is stronger.' },
      ],
    });
  }
  if (type === 'math') {
    return json({ title: 'Evidence Counts', problems: [
      { question: 'A class finds 3 claims and 4 pieces of evidence for each claim. How many pieces of evidence?', answer: '12', steps: [{ explanation: 'Multiply 3 by 4.', latex: '3 \\times 4 = 12' }], realWorld: 'Researchers count evidence when comparing arguments.' },
    ], graphData: null });
  }
  if (type === 'gemini-bridge') {
    return json([
      'Create a simple app shell for comparing two claims from a source.',
      'Add cards where students enter evidence for each claim.',
      'Add a summary view that asks which claim is better supported.',
    ]);
  }
  if (type === 'concept-sort') {
    return json({
      categories: [
        { id: 'c1', label: 'Supports Change', color: 'bg-indigo-500' },
        { id: 'c2', label: 'Warns About Risk', color: 'bg-pink-500' },
      ],
      items: [
        { id: 'i1', content: 'Protect rights', categoryId: 'c1' },
        { id: 'i2', content: 'Listen to citizens', categoryId: 'c1' },
        { id: 'i3', content: 'Avoid conflict', categoryId: 'c2' },
        { id: 'i4', content: 'Plan carefully', categoryId: 'c2' },
      ],
    });
  }
  if (type === 'dbq') {
    return json({
      title: 'Rights and Change DBQ',
      historicalContext: 'People debated how government should protect rights while avoiding conflict.',
      documents: [
        { id: 'A', title: 'Document A: Rights', documentType: 'primary', source: 'Classroom excerpt', sourceUrl: '', excerpt: 'Government should protect rights and listen to citizens.', happPrompts: { historical: 'What was happening?', audience: 'Who was the audience?', purpose: 'Why was it created?', pointOfView: 'What view appears?' }, sourcingQuestions: ['Who is speaking?'], analysisQuestions: ['What claim is made?'], sentenceStarters: ['This document shows...'] },
        { id: 'B', title: 'Document B: Caution', documentType: 'primary', source: 'Classroom excerpt', sourceUrl: '', excerpt: 'Sudden change can create conflict and uncertainty.', happPrompts: { historical: 'What was happening?', audience: 'Who was the audience?', purpose: 'Why was it created?', pointOfView: 'What view appears?' }, sourcingQuestions: ['What concern appears?'], analysisQuestions: ['What evidence supports the concern?'], sentenceStarters: ['The author worries...'] },
      ],
      corroborationClaims: [{ claim: 'People disagreed about change.', supportingDocs: ['A', 'B'], challengingDocs: [], guideQuestion: 'How do both documents show disagreement?' }],
      synthesisPrompt: 'Use Documents A and B to explain whether change was worth the risk.',
      thesisStarter: 'I believe that ___ because...',
      rubric: [
        { criteria: 'Claim', 1: 'Needs a claim', 2: 'Basic claim', 3: 'Clear claim', 4: 'Strong claim' },
        { criteria: 'Evidence', 1: 'Little evidence', 2: 'One document', 3: 'Two documents', 4: 'Evidence explained well' },
      ],
      teacherNotes: 'Use the two documents for a short evidence discussion.',
    });
  }
  if (type === 'lesson-plan') {
    return json({
      essentialQuestion: 'How do people use evidence to decide whether change is needed?',
      objectives: ['Identify two claims', 'Cite evidence', 'Compare points of view'],
      hook: 'Students choose whether a class rule should change.',
      directInstruction: 'Model claim, evidence, and reasoning.',
      guidedPractice: 'Sort evidence under two claims.',
      independentPractice: 'Write a short evidence-based response.',
      closure: 'Exit ticket: Which claim is stronger and why?',
      extensions: ['Add a visual organizer', 'Use sentence frames for support'],
    });
  }
  if (type === 'adventure') {
    return json({
      text: 'You enter a town hall where two groups are debating a new rule. Your job is to listen for evidence.',
      options: ['Ask for the strongest claim', 'Find evidence', 'Interview a worried citizen', 'Summarize both sides'],
      inventoryUpdate: null,
      voices: { Guide: 'Aoede' },
      soundParams: { atmosphere: 'Calm', element: 'Silence' },
    });
  }
  if (type === 'persona') {
    return json([
      { name: 'A Town Delegate', role: 'Debater', year: '1776', context: 'Represents a person weighing rights and risks.', visualDescription: 'A classroom-safe historical delegate portrait', greeting: 'Ask me how evidence shaped my decision.' },
      { name: 'A Citizen Advocate', role: 'Rights Advocate', year: 'Revolutionary era', context: 'Explains why rights mattered.', visualDescription: 'A thoughtful advocate with documents', greeting: 'Let us examine the claims together.' },
    ]);
  }
  if (type === 'note-taking') {
    return json({ title: 'Rights and Evidence', cues: ['What are rights?', 'What is evidence?', 'Why worry about change?', 'Which claim is stronger?'] });
  }
  if (type === 'anchor-chart') {
    return json({
      chartType: 'reference',
      title: 'Use Evidence',
      sections: [
        { label: 'Claim', bullets: ['State your idea', 'Keep it clear'], iconPrompt: 'simple speech bubble' },
        { label: 'Evidence', bullets: ['Quote the source', 'Explain why'], iconPrompt: 'simple magnifying glass' },
      ],
    });
  }
  return json({ ok: true });
}

async function liveResponse(prompt, jsonMode) {
  const response = await fetch(LIVE_BASE_URL + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LIVE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: jsonMode ? 0 : 0.2,
      max_tokens: jsonMode ? 1400 : 900,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!response.ok) throw new Error('Local engine HTTP ' + response.status);
  const data = await response.json();
  return data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content || ''
    : '';
}

function classifyFailure(caseResult) {
  const message = String(caseResult.error || caseResult.setError || caseResult.toast || '');
  if (/timeout|timed out/i.test(message)) return 'timeout';
  if (/parse|JSON|valid/i.test(message)) return 'malformed-json';
  if (/missing|required|empty|no output|not include/i.test(message)) return 'missing-fields';
  if (/Local engine HTTP|ECONNREFUSED|fetch failed|network/i.test(message)) return 'engine-unavailable';
  if (/blocked|safety/i.test(message)) return 'safety-block';
  return message ? 'runtime-error' : 'unknown';
}

function loadDispatcher(targetName) {
  const windowObj = {
    AlloModules: {
      QuizLiveAggregators: { normalizeConceptId: (s) => String(s || '').trim().toLowerCase() },
    },
    AIBackendLocal: { isLocalTextBackend: () => true },
    __alloActiveAIBackend: { backend: 'alloflow-local' },
    localStorage: {
      getItem: () => JSON.stringify({ backend: 'alloflow-local' }),
      setItem: () => {},
    },
    __alloLocalTaskProgress: (event) => {
      if (typeof windowObj.__alloLocalProgressSink === 'function') {
        windowObj.__alloLocalProgressSink(event);
      }
    },
  };
  const documentObj = {
    getElementById: () => ({ value: '' }),
  };
  windowObj.document = documentObj;
  const context = vm.createContext({
    window: windowObj,
    document: documentObj,
    console: QUIET ? { log() {}, warn() {}, error() {} } : console,
    setTimeout,
    clearTimeout,
    Promise,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    URL,
  });
  const targetFile = TARGET_FILES[targetName];
  const source = fs.readFileSync(targetFile, 'utf8');
  vm.runInContext(source, context, { filename: targetFile });
  return {
    handleGenerate: context.window.AlloModules.GenDispatcher.handleGenerate,
    windowObj,
  };
}

function makeDeps(caseState, currentTypeRef) {
  const state = caseState;
  const setter = (name) => (value) => {
    state[name] = typeof value === 'function' ? value(state[name]) : value;
  };
  const noOp = () => {};
  const t = (key, params) => {
    if (params && Object.prototype.hasOwnProperty.call(params, 'count')) return String(params.count);
    return key || '';
  };
  const callGemini = async (prompt, jsonMode) => {
    state.calls.push({ type: currentTypeRef.type, jsonMode: !!jsonMode, promptChars: String(prompt || '').length });
    if (LIVE) return liveResponse(prompt, !!jsonMode);
    return cannedResponse(currentTypeRef.type, String(prompt || ''), !!jsonMode);
  };
  const history = [];
  return {
    gradeLevel: '6th Grade',
    outlineType: 'Venn Diagram',
    visualStyle: 'Default',
    visualCustomStyle: '',
    visualLayoutMode: 'single',
    quizMcqCount: 4,
    persistedLessonDNA: null,
    leveledTextCustomInstructions: '',
    quizCustomInstructions: '',
    glossaryCustomInstructions: '',
    frameCustomInstructions: '',
    adventureCustomInstructions: '',
    brainstormCustomInstructions: '',
    faqCustomInstructions: '',
    outlineCustomInstructions: '',
    visualCustomInstructions: '',
    lessonCustomAdditions: '',
    timelineTopic: '',
    sourceTopic: 'Rights and evidence',
    history,
    inputText: SAMPLE_TEXT,
    differentiationRange: 'None',
    leveledTextLanguage: 'English',
    selectedLanguages: [],
    studentInterests: [],
    guidedMode: false,
    guidedStep: 0,
    standardsInput: '',
    targetStandards: '',
    dokLevel: 'Mixed',
    sourceLength: '',
    sourceTone: '',
    textFormat: 'Standard Text',
    useEmojis: false,
    fullPackTargetGroup: '',
    rosterKey: '',
    imageGenerationStyle: '',
    imageAspectRatio: 'square',
    enableEmojiInline: false,
    cellGameDifficulty: '',
    includeSourceCitations: false,
    includeBibliography: false,
    currentUiLanguage: 'English',
    sourceCustomInstructions: '',
    sourceVocabulary: '',
    sourceLevel: '',
    generatedContent: null,
    mathSubject: 'Civics Math',
    mathMode: 'Problem Set Generator',
    mathInput: '',
    mathQuantity: 3,
    isAutoConfigEnabled: false,
    resourceCount: 1,
    isParentMode: false,
    isIndependentMode: false,
    isTeacherMode: true,
    frameType: 'Sentence Starters',
    fillInTheBlank: false,
    vocabularyType: '',
    enableFactionResources: false,
    factionResourceMode: '',
    isAdventureStoryMode: true,
    isSocialStoryMode: false,
    isImmersiveMode: false,
    adventureChanceMode: '',
    adventureConsistentCharacters: false,
    adventureFreeResponseEnabled: false,
    adventureLanguageMode: '',
    adventureInputMode: '',
    apiKey: '',
    setIsMapLocked: noOp,
    setIsProcessing: setter('isProcessing'),
    setGenerationStep: setter('generationStep'),
    setInteractionMode: noOp,
    setDefinitionData: noOp,
    setSelectionMenu: noOp,
    setRevisionData: noOp,
    setIsReviewGame: noOp,
    setReviewGameState: noOp,
    setGuidedStep: noOp,
    setGeneratedContent: setter('generatedContent'),
    setActiveView: setter('activeView'),
    setHistory: (value) => { state.history = typeof value === 'function' ? value(state.history) : value; },
    setError: setter('setError'),
    setShowKokoroOfferModal: noOp,
    alloBotRef: { current: { speak: noOp } },
    pdfFixResult: null,
    addToast: (message, level) => state.toasts.push({ message: String(message || ''), level: level || 'info' }),
    t,
    warnLog: (...parts) => state.warns.push(parts.map(String).join(' ')),
    debugLog: noOp,
    callGemini,
    cleanJson,
    safeJsonParse,
    callImagen: async () => 'data:image/png;base64,LOCAL_IMAGE',
    extractSourceTextForProcessing: (text) => ({ isBilingual: false, text }),
    formatLessonDNA: () => '',
    getDifferentiationGrades: () => ['6th Grade'],
    getGroupDifferentiationContext: () => '',
    flyToElement: noOp,
    fisherYatesShuffle: (arr) => Array.isArray(arr) ? arr.slice() : arr,
    sanitizeTruncatedCitations: (s) => s,
    normalizeCitationPlacement: (s) => s,
    fixCitationPlacement: (s) => s,
    generateBibliographyString: () => '',
    processGrounding: () => '',
    parseFlowChartData: (data) => data,
    verifyMathProblems: async (data) => data,
    normalizeResourceLinks: (data) => data,
    detectClimaxArchetype: () => null,
    handleGenerateLessonPlan: noOp,
    handleGenerateMath: noOp,
    handleGenerateSource: noOp,
    autoConfigureSettings: noOp,
    applyDetailedAutoConfig: noOp,
    getAssetManifest: () => [],
    getLessonContext: () => SAMPLE_TEXT,
    buildLessonPlanPrompt: () => json({}),
    buildStudyGuidePrompt: () => json({}),
    buildParentGuidePrompt: () => json({}),
    GUIDED_STEPS: [],
    LENGTH_THRESHOLDS: { MIN_VARIANCE: 0.4, MAX_VARIANCE: 2.5 },
    TIMELINE_MODE_DEFINITIONS: {
      chronological: { label: 'Chronological', description: 'time order', examples: '1776 -> 1787', guidance: '', labelTemplate: 'Timeline' },
      procedural: { label: 'Procedural', description: 'step order', examples: 'Step 1 -> Step 4', guidance: '', labelTemplate: 'Steps' },
      lifecycle: { label: 'Lifecycle', description: 'life cycle order', examples: 'seed -> plant', guidance: '', labelTemplate: 'Lifecycle' },
      size: { label: 'Size', description: 'small to large', examples: 'small -> large', guidance: '', labelTemplate: 'Size' },
      hierarchy: { label: 'Hierarchy', description: 'rank order', examples: 'local -> national', guidance: '', labelTemplate: 'Hierarchy' },
      'cause-effect': { label: 'Cause-Effect', description: 'cause to effect', examples: 'cause -> effect', guidance: '', labelTemplate: 'Cause and Effect' },
      intensity: { label: 'Intensity', description: 'low to high', examples: 'low -> high', guidance: '', labelTemplate: 'Intensity' },
      narrative: { label: 'Narrative', description: 'story order', examples: 'beginning -> end', guidance: '', labelTemplate: 'Story' },
    },
    audioRef: { current: null },
    autoRemoveWords: false,
    bridgeSimType: 'react',
    bridgeStepCount: 3,
    conceptImageMode: 'never',
    conceptItemCount: '',
    conceptSortImageStyle: '',
    creativeMode: false,
    faqCount: 4,
    glossaryDefinitionLevel: 'Same as Global Level',
    glossaryImageStyle: '',
    glossaryTier2Count: 2,
    glossaryTier3Count: 1,
    includeCharts: false,
    includeEtymology: false,
    includeTimelineVisuals: false,
    isBotVisible: false,
    isMathGraphEnabled: false,
    keepCitations: false,
    leveledTextLength: '100 words',
    noText: false,
    passAnalysisToQuiz: false,
    quizReflectionCount: 0,
    selectedConcepts: [],
    standardsPromptString: '',
    timelineImageStyle: '',
    timelineItemCount: 4,
    timelineMode: 'auto',
    useLowQualityVisuals: true,
    setGameMode: noOp,
    setGlossarySearchTerm: noOp,
    setIsConceptMapReady: noOp,
    setIsEditingAnalysis: noOp,
    setIsEditingBrainstorm: noOp,
    setIsEditingFaq: noOp,
    setIsEditingGlossary: noOp,
    setIsEditingLeveledText: noOp,
    setIsEditingOutline: noOp,
    setIsEditingQuiz: noOp,
    setIsEditingScaffolds: noOp,
    setIsGeneratingPersona: noOp,
    setIsInteractiveVenn: noOp,
    setIsMatchingGame: noOp,
    setIsMemoryGame: noOp,
    setIsPlaying: noOp,
    setIsPresentationMode: noOp,
    setIsSideBySide: noOp,
    setIsStudentBingoGame: noOp,
    setIsVennPlaying: noOp,
    setPersonaState: setter('personaState'),
    setPresentationState: setter('presentationState'),
    setProcessingProgress: setter('processingProgress'),
    setShowQuizAnswers: noOp,
    setStickers: noOp,
    calculateReadability: () => ({ words: SAMPLE_TEXT.split(/\s+/).length, sentences: 4 }),
    callGeminiImageEdit: async () => 'data:image/png;base64,EDITED_IMAGE',
    checkAccuracyWithSearch: false,
    chunkText: (text, maxChars) => {
      const str = String(text || '');
      return str.length > maxChars ? [str.slice(0, maxChars), str.slice(maxChars)] : [str];
    },
    countWords: (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length,
    executeVisualPlan: async () => null,
    filterEducationalSources: (items) => items || [],
    formatMathQuestion: (q) => q,
    generateHelpfulHint: noOp,
    generateVisualPlan: async () => null,
    getDefaultTitle: (type) => ({
      simplified: 'Leveled Text',
      glossary: 'Glossary',
      outline: 'Visual Organizer',
      image: 'Visual Support',
      quiz: 'Quiz',
      analysis: 'Source Analysis',
      faq: 'FAQ',
      brainstorm: 'Brainstorm',
      'sentence-frames': 'Sentence Frames',
      timeline: 'Timeline',
      math: 'Math Resource',
      'gemini-bridge': 'Gemini Bridge',
      'concept-sort': 'Concept Sort',
      dbq: 'DBQ',
      'lesson-plan': 'Lesson Plan',
      adventure: 'Adventure',
      persona: 'Persona Chat',
      'note-taking': 'Note Taking',
      'anchor-chart': 'Anchor Chart',
    }[type] || type),
    performDeepVerification: async () => ({ text: '', sources: [] }),
    repairGeneratedText: async () => null,
    resetPersonaInterviewState: noOp,
    validateSequenceStructure: () => ({ ok: true, issues: [] }),
  };
}

async function runCase(handleGenerate, matrixCase, targetName) {
  const state = {
    history: [],
    calls: [],
    warns: [],
    toasts: [],
    progressEvents: [],
    generatedContent: null,
    setError: '',
    activeView: '',
    processingProgress: null,
  };
  const currentTypeRef = { type: matrixCase.type };
  const deps = makeDeps(state, currentTypeRef);
  const config = Object.assign({}, matrixCase.config || {});
  handleGenerate.windowObj.__alloLocalProgressSink = (event) => {
    state.progressEvents.push({
      current: Number(event && event.current) || 0,
      total: Number(event && event.total) || 0,
      label: String((event && event.label) || ''),
      type: String((event && event.type) || ''),
    });
  };
  try {
    const result = await handleGenerate(matrixCase.type, null, false, SAMPLE_TEXT, config, false, deps);
    const item = result || state.history.slice().reverse().find((entry) => entry && entry.type === matrixCase.type);
    const meaningfulProgress = state.progressEvents.some((event) => event.type === matrixCase.type && event.total > 0);
    const completedProgress = state.progressEvents.some((event) => (
      event.type === matrixCase.type
      && event.total > 0
      && event.current >= event.total
    ));
    const ok = Boolean(item && matrixCase.expect(item) && meaningfulProgress && completedProgress);
    return {
      type: matrixCase.type,
      target: targetName,
      status: ok ? 'pass' : 'fail',
      reason: ok ? '' : (!meaningfulProgress ? 'missing-progress' : (!completedProgress ? 'incomplete-progress' : classifyFailure({ setError: state.setError, toast: state.toasts.slice(-1)[0] && state.toasts.slice(-1)[0].message }))),
      calls: state.calls.length,
      promptChars: state.calls.reduce((sum, call) => sum + call.promptChars, 0),
      progressEvents: state.progressEvents.length,
      meta: item && item.meta ? String(item.meta) : '',
      itemShape: item ? summarizeShape(item.data) : 'no-item',
      error: state.setError || '',
      warnings: state.warns.slice(0, 3),
    };
  } catch (error) {
    return {
      type: matrixCase.type,
      target: targetName,
      status: 'fail',
      reason: classifyFailure({ error: error.message }),
      calls: state.calls.length,
      promptChars: state.calls.reduce((sum, call) => sum + call.promptChars, 0),
      progressEvents: state.progressEvents.length,
      meta: '',
      itemShape: 'threw',
      error: error.message || String(error),
      warnings: state.warns.slice(0, 3),
    };
  } finally {
    handleGenerate.windowObj.__alloLocalProgressSink = null;
  }
}

function summarizeShape(data) {
  if (Array.isArray(data)) return 'array[' + data.length + ']';
  if (typeof data === 'string') return 'text[' + data.length + ']';
  if (!data || typeof data !== 'object') return String(typeof data);
  return 'object{' + Object.keys(data).slice(0, 6).join(',') + '}';
}

(async () => {
  const results = [];
  for (const targetName of TARGET_NAMES) {
    const dispatcher = loadDispatcher(targetName);
    const handleGenerate = dispatcher.handleGenerate;
    handleGenerate.windowObj = dispatcher.windowObj;
    for (const matrixCase of CASES) {
      results.push(await runCase(handleGenerate, matrixCase, targetName));
    }
  }
  const failures = results.filter((r) => r.status !== 'pass');
  if (JSON_OUT) {
    console.log(JSON.stringify({ live: LIVE, baseUrl: LIVE ? LIVE_BASE_URL : null, targets: TARGET_NAMES, results, failures: failures.length }, null, 2));
  } else if (!QUIET) {
    console.log('');
    console.log('Local LLM Resource Matrix' + (LIVE ? ' (live: ' + LIVE_BASE_URL + ')' : ' (deterministic)'));
    console.log('Targets: ' + TARGET_NAMES.join(', '));
    console.log('='.repeat(72));
    for (const row of results) {
      const mark = row.status === 'pass' ? 'OK ' : 'ERR';
      const detail = row.status === 'pass' ? row.itemShape : (row.reason + (row.error ? ': ' + row.error : ''));
      console.log(mark + '  ' + row.target.padEnd(6) + ' ' + row.type.padEnd(16) + ' calls=' + String(row.calls).padEnd(2) + ' progress=' + String(row.progressEvents).padEnd(2) + ' promptChars=' + String(row.promptChars).padEnd(5) + ' ' + detail);
    }
    console.log('='.repeat(72));
    console.log((results.length - failures.length) + '/' + results.length + ' passed');
    if (failures.length) {
      console.log('');
      console.log('Failures:');
      failures.forEach((f) => console.log('- ' + f.target + '/' + f.type + ': ' + f.reason + (f.error ? ' (' + f.error + ')' : '')));
    }
  }
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
