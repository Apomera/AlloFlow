import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { renderToStaticMarkup } = require('../desktop/web-app/node_modules/react-dom/server');
const native = require('../agent_core_pack_native_module.js');
const service = require('../agent_core_resource_pack_module.js');
const contracts = native.getContracts();
const example = type => JSON.parse(JSON.stringify(contracts.find(contract => contract.type === type).example));
const noop = () => {};
const identity = text => text;
const Null = () => null;
const Boundary = props => React.createElement(React.Fragment, null, props.children);
const Bilingual = props => React.createElement('span', null, props.text);

function load(file, name) {
  // The notebook module installs a shared style element on load. SSR verifies
  // its resource rendering; it does not need to install that browser stylesheet.
  const context = { window: { React, AlloModules: {} }, document: { getElementById: () => ({}) }, console, URL, Map, Set, Date, JSON };
  vm.runInNewContext(fs.readFileSync(require.resolve('../' + file), 'utf8'), context, { filename: file });
  return name.split('.').reduce((value, key) => value[key], context.window.AlloModules);
}
function base(type, data = example(type)) {
  return {
    generatedContent: { id: 'native-' + type, title: 'Native contract ' + type, type, data },
    t: key => key, isTeacherMode: true, gradeLevel: '6th Grade',
    studentResponses: {}, selectedDiscrepancies: [], selectedGrammarErrors: [], sourceRefineInstruction: '',
    isGeneratingGuide: {}, isGeneratingWorksheet: {}, isGeneratingWorksheetCover: {},
    handleStudentInput: noop, setGeneratedContent: noop, addToast: noop,
    renderFormattedText: identity, formatInlineText: identity, formatInteractiveText: identity,
    splitReferencesFromBody: body => ({ body, references: '' }),
    BilingualFieldRenderer: Bilingual, SourceReferencesPanel: Null, ErrorBoundary: Boundary,
    History: Null, Sparkles: Null, MessageCircleQuestion: Null, CheckCircle2: Null, Plus: Null, RefreshCw: Null, Users: Null,
    personaState: { mode: 'single', selectedCharacters: [], resumeDays: 7 },
    normalizePersonaResumeDays: () => 7, extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
    personaTeacherEditor: null, personaTeacherEditorRef: { current: null },
    wordSoundsAudioCoverage: { total: 0, missingWords: [] }, wsActivitySequence: [],
  };
}

describe('native authoring examples render with the shipped native view modules', () => {
  const basic = [
    ['analysis', 'view_analysis_module.js', 'AnalysisView', 'Germination'],
    ['brainstorm', 'view_brainstorm_module.js', 'BrainstormView', 'Which detail supports your interpretation?'],
    ['dbq', 'view_dbq_module.js', 'DbqView', 'The group recorded three observations.'],
    ['persona', 'view_persona_workspace_module.js', 'PersonaWorkspace.PersonaWorkspaceView', 'A fictional researcher'],
    ['lesson-plan', 'view_lesson_plan_module.js', 'LessonPlanView', 'How do we support an interpretation?'],
    ['word-sounds', 'view_word_sounds_preview_module.js', 'WordSoundsPreviewView', '1 words loaded'],
    ['alignment-report', 'view_alignment_report_module.js', 'AlignmentReportView', 'Source verification has not been performed.'],
  ];
  it.each(basic)('renders the %s contract', (type, file, name, expected) => {
    const Component = load(file, name);
    expect(Component).toBeTypeOf('function');
    const props = base(type);
    const errors = [];
    native.validateResource(props.generatedContent, 'resource', errors, []);
    expect(errors).toEqual([]);
    const html = renderToStaticMarkup(React.createElement(Component, props));
    expect(html).toContain(expected);
    expect(html).not.toContain('[object Object]');
  });
  it('renders jigsaw expert packets and hides its answer key in the learner view', () => {
    const data = contracts.find(contract => contract.type === 'brainstorm').variantExamples.jigsaw;
    const Component = load('view_brainstorm_module.js', 'BrainstormView');
    const props = base('brainstorm', data);
    const teacher = renderToStaticMarkup(React.createElement(Component, props));
    const learner = renderToStaticMarkup(React.createElement(Component, { ...props, isTeacherMode: false }));
    expect(teacher).toContain('Read the first supplied record');
    expect(teacher).toContain(data[0].accountabilityCheck[0].answer);
    expect(learner).toContain(data[0].accountabilityCheck[0].q);
    expect(learner).not.toContain(data[0].accountabilityCheck[0].answer);
  });
  it('renders the saved adventure opening with actual choice controls', () => {
    const Component = load('view_adventure_module.js', 'AdventureView');
    const currentScene = example('adventure');
    const props = {
      ...base('adventure'), activeView: 'adventure', theme: 'light', adventureTextInput: '',
      adventureInputMode: 'choice', selectedLanguages: [], adventureEffects: [], playbackState: { currentIdx: -1 },
      adventureState: { currentScene, history: [], inventory: [], characters: [], systemResources: [],
        turnCount: 1, level: 1, xp: 0, xpToNextLevel: 100, energy: 100, gold: 0, isLoading: false, isGameOver: false,
        choiceCount: 2, voiceMap: {}, stats: { decisions: 0 }, pendingChoice: null },
      AdventureAmbience: Null, AdventureAudioControls: Null, AdventureShop: Null, AnimatedNumber: ({ value }) => value,
      ClimaxProgressBar: Null, ConfettiExplosion: Null, InventoryGrid: Null,
      adventureScrollRef: { current: null }, adventureInputRef: { current: null },
      splitTextToSentences: text => [text],
    };
    const html = renderToStaticMarkup(React.createElement(Component, props));
    expect(html).toContain(currentScene.text);
    expect(html).toContain(currentScene.options[0]);
    expect(html).toContain(currentScene.options[1]);
  });

  const notebook = service.getCapabilities('native').contracts.find(contract => contract.type === 'note-taking');
  it.each([notebook.example.data, ...notebook.variants].map(data => [data.templateType, data]))('renders the discoverable %s notebook in the learner view', (_, data) => {
    const Component = load('note_taking_templates_module.js', 'NoteTakingView');
    const html = renderToStaticMarkup(React.createElement(Component, {
      ...base('note-taking', data), isTeacherMode: false, handleNoteUpdate: noop,
    }));
    expect(html).toContain(data.title);
    expect(html).toMatch(/<(?:input|textarea)/);
    expect(html).not.toContain('[object Object]');
    if (data.templateType === 'guided-notes') expect(html).not.toContain('value="evidence"');
    // Q&A is an editable study set: the authored answer is visible until the
    // learner selects Quiz me. It is deliberately not a protected answer key.
    if (data.templateType === 'q-and-a') expect(html).toContain(data.pairs[0].answer);
  });

  it('renders a single native math problem with its worked explanation hidden until enabled', () => {
    const Component = load('view_math_module.js', 'MathView');
    const data = { problem: '2 + 1', answer: 3, steps: [{ explanation: 'Add one to two.' }] };
    const props = { ...base('math', data), isTeacherMode: false, renderMathText: identity };
    const learner = renderToStaticMarkup(React.createElement(Component, props));
    expect(learner).toContain(data.problem);
    expect(learner).not.toContain('no displayable problems');
    expect(learner).not.toContain(data.steps[0].explanation);
    const worked = renderToStaticMarkup(React.createElement(Component, { ...props, isTeacherMode: true, showMathAnswers: true }));
    expect(worked).toContain(data.steps[0].explanation);
  });
});
