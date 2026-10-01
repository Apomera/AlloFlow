// What Katie Novak asked for, checked where teachers see it (2026-09-27, lane N1):
//  (b) the copy no longer frames an adapted text as swapping hard words for
//      easier ones; it is a companion that previews, builds background and
//      scaffolds toward the original, which stays. The sidebar button says
//      "Create adapted companion", not "Rewrite Text".
//  (c) the companion note on an adapted text is shown open.
//  (d) when a standard requires grade-level text, Full Pack plans no adapted
//      text by default, names the original with word supports as the main
//      reading, and one click adds a companion for background and preview.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, Reader, FullPack, Sidebar, Helpers, api;
const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const objectFrom = source => new Function('return (' + source.slice(source.indexOf('{')).replace(/;\s*$/, '') + ')')();
const UI = objectFrom(read('ui_strings.js'));
const t = key => key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), UI);
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule(process.env.ALLO_CONTEXT_CANDIDATE || 'instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  loadAlloModule('generation_matrix_module.js'); loadAlloModule('generation_helpers_source.jsx');
  loadAlloModule(process.env.ALLO_FULLPACK_CANDIDATE || 'view_full_pack_run_module.js');
  loadAlloModule(process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js');
  api = window.AlloModules.InstructionalContext; Reader = window.AlloModules.SimplifiedView;
  FullPack = window.AlloModules.FullPackRunView; Sidebar = window.AlloModules.SimplifiedPanel; Helpers = window.AlloModules.GenerationHelpers;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; });
function show(element) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(element));
  return host;
}
const click = node => act(async () => { if (!node) throw new Error('Missing control'); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

describe('(b) adapted text is described as a companion, not word swapping', () => {
  const helpFiles = process.env.ALLO_HELP_CANDIDATE ? [process.env.ALLO_HELP_CANDIDATE] : ['help_strings.js', 'desktop/web-app/public/help_strings.js'];
  for (const file of helpFiles) {
    it('help text in ' + file, () => {
      const help = objectFrom(read(file));
      expect(help.tool_simplified).toContain('adapted companion');
      expect(help.tool_simplified).toContain('activate background knowledge, build context, preview key concepts, and scaffold students toward the original, not to replace it');
      expect(help.tool_simplified).toContain('The original stays the main reading.');
      expect(help.tool_simplified).toContain('Read original with supports');
      expect(help.tool_simplified).not.toMatch(/swapped|easier ones|IEP supports|only the language gets simpler/);
      expect(help['tour-simplified-settings']).toContain('Settings for an adapted companion.');
      expect(help['tour-simplified-settings']).toContain('scaffolds students toward the original, which stays the main reading');
      expect(help['tour-simplified-settings']).not.toMatch(/text simplification|simplify|simpler vocabulary/i);
      expect(help.tool_simplified + help['tour-simplified-settings']).not.toMatch(/—|WCAG/);
    });
  }

  it('the sidebar button reads "Create adapted companion" and still creates the adapted text', async () => {
    expect(UI.sidebar.create_adapted_companion).toBe('Create adapted companion');
    const handleGenerate = vi.fn();
    const noop = () => {};
    show(React.createElement(Sidebar, { expandedTools: ['simplified'], handleGenerate, handleReadOriginal: vi.fn(), hasSourceOrAnalysis: true, includeCharts: false, isProcessing: false, keepCitations: true,
      leveledTextCustomInstructions: '', leveledTextLength: 'Same as Source', setIncludeCharts: noop, setKeepCitations: noop, setLeveledTextCustomInstructions: noop, setLeveledTextLength: noop, setTextFormat: noop, t, textFormat: 'Standard Text' }));
    expect(host.textContent).not.toContain('Rewrite Text');
    const button = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Create adapted companion');
    expect(button).toBeTruthy();
    await click(button);
    expect(handleGenerate).toHaveBeenCalledWith('simplified');
  });

  it('nothing that renders still asks for the old "Rewrite Text" key', () => {
    for (const file of ['view_sidebar_panels_source.jsx', 'view_sidebar_panels_module.js', 'desktop/web-app/public/view_sidebar_panels_module.js', 'AlloFlowANTI.txt']) {
      expect(read(file), file).not.toMatch(/['"]simplified\.rewrite['"]/);
    }
  });
});

describe('(c) the companion note shows by default', () => {
  const adapted = () => {
    const source = api.createSupportedReading('The heron walked slowly through the shallow water of the marsh.', { id: 'source-1' });
    return { id: 'adapted-1', type: 'simplified', data: 'The heron walked in the water.', sourceSnapshot: source.sourceSnapshot, sourceFamilyId: source.sourceFamilyId,
      instructionalText: { role: 'supplemental', form: 'adapted', sourceArtifactId: 'source-1', primaryArtifactId: 'source-1', designationSource: 'workflow-default', replacementAuthorization: { authorized: false, source: 'none' } }, config: { language: 'English' } };
  };
  // The role card itself stays a one-line summary when nothing needs deciding
  // (2026-09-24 audit); the note sits outside it, so it is never hidden.
  it('a teacher opening a supporting adapted text sees what the companion is for', () => {
    const Control = Reader.ReadingRoleControl;
    show(React.createElement(Control, { role: 'supplemental', roleLabel: 'Supporting reading', formLabel: 'Adapted text', isTeacherMode: true, onSave: () => true, showCompanionNote: true }));
    const note = host.querySelector('[data-companion-note]');
    expect(note.textContent).toContain('activate background knowledge, build context, preview key concepts, and scaffold students toward the original');
    expect(note.closest('details')).toBeNull();
    expect(host.querySelector('details[data-instructional-role]').open).toBe(false);
  });
  it('the whole reader shows it open for a supporting adapted text', () => {
    const noop = () => {};
    const pure = window.AlloModules.PureHelpers, phase = window.AlloModules.PhaseNHelpers;
    const item = adapted();
    show(React.createElement(Reader, { ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop,
      t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: true, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: false, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [item], textEditorRef: React.createRef(),
      splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop,
      cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
      SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: item }));
    const note = host.querySelector('[data-companion-note]');
    expect(note.textContent).toContain('scaffold students toward the original');
    expect(note.closest('details')).toBeNull();
  });
  it('a main reading and a student view show no companion note', () => {
    show(React.createElement(Reader.ReadingRoleControl, { role: 'primary', roleLabel: 'Main reading', formLabel: 'Original', isTeacherMode: true, onSave: () => true, showCompanionNote: false }));
    expect(host.querySelector('[data-companion-note]')).toBeNull();
    act(() => root.unmount()); host.remove();
    show(React.createElement(Reader.ReadingRoleControl, { role: 'supplemental', formLabel: 'Adapted text', studentLabel: 'Supporting reading', isTeacherMode: false, onSave: () => true, showCompanionNote: true }));
    expect(host.querySelector('[data-companion-note]')).toBeNull();
  });
  it('a main-reading choice still collapses to its summary (unchanged)', () => {
    show(React.createElement(Reader.ReadingRoleControl, { role: 'primary', roleLabel: 'Main reading', formLabel: 'Original', isTeacherMode: true, onSave: () => true }));
    expect(host.querySelector('details').open).toBe(false);
  });
});

describe('(d) Full Pack under a grade-level text standard', () => {
  const GRADE_LEVEL = {
    inputText: 'CCSS.ELA-LITERACY.RL.9-10.10',
    promptText: 'By the end of grade 10, read and comprehend literature at the high end of the grades 9-10 text complexity band independently and proficiently.',
    standards: [{ code: 'CCSS.ELA-LITERACY.RL.9-10.10', text: 'Read and comprehend literature at the high end of the grades 9-10 text complexity band independently and proficiently.' }],
  };
  const MAIN_IDEA = { inputText: 'CCSS.ELA-LITERACY.RI.5.2', promptText: 'Determine two or more main ideas of a text.', standards: [{ code: 'CCSS.ELA-LITERACY.RI.5.2', text: 'Determine two or more main ideas of a text.' }] };
  async function plan(standardsContext) {
    let run = null;
    const noop = () => {};
    const deps = {
      isProcessing: false, fullPackTargetGroup: 'none', rosterKey: null, gradeLevel: '9th Grade', leveledTextLanguage: 'English', translationMode: 'auto', currentUiLanguage: 'English',
      studentInterests: [], dokLevel: '', leveledTextCustomInstructions: '', selectedLanguages: [], differentiationRange: 'None', differentiationTypes: ['simplified'], differentiationCustomGrades: [],
      targetStandards: [], useEmojis: false, textFormat: 'Standard Text', imageGenerationStyle: 'Auto', imageAspectRatio: '16:9',
      aiProviderProfile: { backend: 'gemini', model: 'gemini-test', imageProvider: 'auto', imageModel: 'imagen-test', isLocal: false },
      history: [], inputText: 'When shall we three meet again, in thunder, lightning, or in rain?', sourceTopic: 'Macbeth 1.1',
      standardsInput: standardsContext.promptText, standardsContext, instructionalContext: null, resourceCount: 'Auto', isAutoConfigEnabled: true,
      quizCustomInstructions: '', adventureCustomInstructions: '', frameCustomInstructions: '', brainstormCustomInstructions: '', faqCustomInstructions: '', outlineCustomInstructions: '', visualCustomInstructions: '',
      timelineTopic: '', lessonCustomAdditions: '', conceptInput: '', glossaryCustomInstructions: '', personaCustomInstructions: '', conceptSortCustomInstructions: '', dbqCustomInstructions: '', noteTakingCustomInstructions: '', anchorChartCustomInstructions: '',
      setIsProcessing: noop, setGenerationStep: noop, setFullPackTargetGroup: noop, setGradeLevel: noop, setLeveledTextLanguage: noop, setStudentInterests: noop, setDokLevel: noop, setLeveledTextCustomInstructions: noop,
      setSelectedLanguages: noop, setTargetStandards: noop, setUseEmojis: noop, setTextFormat: noop, setPersistedLessonDNA: noop, setError: noop, addToast: noop,
      t: (key, values) => values ? key + ':' + (values.count || '') : key, warnLog: noop, handleApplyRosterGroup: noop,
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })), applyDetailedAutoConfig: noop, getGroupDifferentiationContext: () => '', getAssetManifest: () => [],
      getDifferentiationGrades: grade => [grade], handleGenerate: vi.fn(async type => ({ id: 'resource-' + type, type, data: {} })),
      setFullPackRun: next => { run = typeof next === 'function' ? next(run) : next; },
    };
    await Helpers.handlePlanFullPack(deps);
    return { run, deps };
  }
  function render(run, deps, extra = {}) {
    const icons = ['AlertTriangle', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ChevronDown', 'Clock', 'Copy', 'Cpu', 'Download', 'Eye', 'EyeOff', 'ImageIcon', 'Plus', 'RefreshCw', 'Sparkles', 'StopCircle', 'Trash2'];
    const props = Object.assign(Object.fromEntries(icons.map(name => [name, () => null])), {
      GUIDED_DELIVERY_GROUPS: [], _alloDiagnosticReason: reason => ({ code: 'x', summary: String(reason) }), _alloGenerationHelpersDeps: () => deps, aiCapability: { text: true }, createGuidedHomeworkShare: vi.fn(),
      currentUiLanguage: 'English', differentiationCustomGrades: [], differentiationRange: 'None', differentiationTypes: [], dokLevel: '', fullPackAddType: 'quiz', fullPackRun: run, fullPackTargetGroup: 'none',
      getDefaultTitle: type => ({ analysis: 'Source analysis', quiz: 'Quiz', 'lesson-plan': 'Lesson plan' })[type] || 'Resource', gradeLevel: '9th Grade', guidedActiveSteps: [], guidedMode: false, guidedStep: 0,
      handleAddFullPackPlanResource: vi.fn(), handleApproveFullPack: vi.fn(), handleChangeFullPackPlanResourceType: vi.fn(), handleCopyFullPackDiagnostics: vi.fn(), handleDismissFullPackRun: vi.fn(), handleDownloadFullPackDiagnostics: vi.fn(),
      handleEditFullPackPlanResourceDirective: vi.fn(), handleMoveFullPackPlanResource: vi.fn(), handleOpenGenerationErrorLog: vi.fn(), handlePlanFullPack: vi.fn(), handleRemoveFullPackPlanResource: vi.fn(), handleRetryFailedFullPack: vi.fn(),
      handleSetFullPackPlanAdaptedTextPolicy: vi.fn(), handleStopFullPack: vi.fn(), handleReadOriginal: vi.fn(), hasSourceOrAnalysis: true, history: [], imageAspectRatio: '16:9', imageGenerationStyle: 'Auto', inputText: deps.inputText,
      isAutoConfigEnabled: true, isIndependentMode: false, isParentMode: false, isProcessing: false, isTeacherMode: true, leveledTextLanguage: 'English', openExportPreview: vi.fn(), openStudentQrPreview: vi.fn(), qrShareModal: null, recentQrShares: [],
      resourceCount: 'Auto', rosterKey: null, selectToolFromCatalog: vi.fn(), selectedLanguages: [], setFullPackAddType: vi.fn(), setFullPackTargetGroup: vi.fn(), setIsAutoConfigEnabled: vi.fn(), setResourceCount: vi.fn(), setShowAIBackendModal: vi.fn(),
      setShowCompletedFullPackRows: vi.fn(), setShowSessionStartOptions: vi.fn(), showCompletedFullPackRows: true, studentInterests: [], t, targetStandards: [], textFormat: 'Standard Text', translationMode: 'auto', universalImageStyle: '', useEmojis: false,
    }, extra);
    function Harness() { return FullPack(props); }
    show(React.createElement(Harness));
    return props;
  }
  const card = () => host.querySelector('[data-testid="full-pack-grade-level-reading"]');
  const policy = () => host.querySelector('[data-testid="full-pack-adapted-policy"]');

  it('plans no adapted text by default and names the original with word supports as the main reading', async () => {
    const { run, deps } = await plan(GRADE_LEVEL);
    expect(run.status).toBe('ready');
    expect(run.preflight.selected.map(item => item.type)).not.toContain('simplified');
    const props = render(run, deps);
    expect(card().textContent).toContain('Main reading: the original with word supports');
    expect(card().textContent).toContain('This standard asks students to read grade-level text');
    expect(host.querySelector('[data-testid="full-pack-text-access-summary"]').open).toBe(true);
    expect(policy().value).toBe('omit');
    expect(host.textContent).not.toContain('(recommended)');
    await click(host.querySelector('[data-testid="full-pack-open-supported-original"]'));
    expect(props.handleReadOriginal).toHaveBeenCalledTimes(1);
    expect(props.handleReadOriginal.mock.calls[0]).toEqual([]);
  });

  it('one click includes an adapted companion for background and preview', async () => {
    const { run, deps } = await plan(GRADE_LEVEL);
    const props = render(run, deps);
    const include = host.querySelector('[data-testid="full-pack-include-companion"]');
    expect(include.textContent).toBe('Include an adapted companion for background and preview');
    await click(include);
    expect(props.handleSetFullPackPlanAdaptedTextPolicy).toHaveBeenCalledTimes(1);
    expect(props.handleSetFullPackPlanAdaptedTextPolicy).toHaveBeenCalledWith('include', null);
    // What the host does with that click (its setter), shown back in the plan.
    const included = Helpers.setFullPackPlanAdaptedTextPolicy(run, 'include', null);
    act(() => root.unmount()); host.remove();
    render(included, deps);
    expect(included.preflight.selected.map(item => item.type)).toContain('simplified');
    expect(policy().value).toBe('include');
    expect(policy().selectedOptions[0].textContent).toBe('Include an adapted companion for background and preview');
    expect(host.querySelector('[data-testid="full-pack-include-companion"]')).toBeNull();
    expect(card().textContent).toContain('Main reading: the original with word supports');
  });

  it('without a grade-level text standard, the companion stays in the plan and no main-reading card appears', async () => {
    const { run, deps } = await plan(MAIN_IDEA);
    expect(run.preflight.selected.map(item => item.type)).toContain('simplified');
    render(run, deps);
    expect(card()).toBeNull();
    expect(policy().value).toBe('include');
    expect(policy().selectedOptions[0].textContent).toBe('Include supplemental Adapted Text (recommended)');
  });

  it('a sourced prohibition still shows the main reading, with no way to add adapted text', async () => {
    const { run, deps } = await plan({ promptText: 'Use the secure assessment stimulus without alteration.', standards: [{ code: 'SECURE-1', text: 'Use the stimulus without alteration.' }],
      instructionalConstraints: { textAccessExpectation: 'adaptation-prohibited', basis: 'Official secure-assessment administration rule', sourced: true } });
    render(run, deps);
    expect(card().textContent).toContain('Main reading: the original with word supports');
    expect(host.querySelector('[data-testid="full-pack-include-companion"]')).toBeNull();
    expect(policy().value).toBe('prohibited');
  });
});

describe('(e) students open the original first (helper for the host change requested from lane K5)', () => {
  const PASSAGE = 'When shall we three meet again, in thunder, lightning, or in rain?';
  const pair = (family, text = PASSAGE) => {
    const original = api.createSupportedReading(text, { id: 'orig-' + family, sourceFamilyId: family });
    const adapted = { id: 'adapted-' + family, type: 'simplified', data: 'The three witches plan to meet again.', sourceSnapshot: original.sourceSnapshot, sourceFamilyId: family,
      instructionalText: { form: 'adapted', role: 'supplemental', replacementAuthorization: { authorized: false, source: 'none' } } };
    return { original, adapted };
  };
  it('moves the preserved original ahead of its adapted companion, and nothing else', () => {
    const { original, adapted } = pair('macbeth');
    const quiz = { id: 'quiz', type: 'quiz', data: {} };
    // What AlloFlowANTI resolveAssignmentResources does today: the teacher's
    // selection first, then the paired original after it.
    const selected = [adapted, quiz];
    const paired = api.ensureReadingSourcePairs(selected, { history: [original, adapted, quiz] });
    const hostOrder = selected.concat(paired.filter(item => !selected.includes(item)));
    expect(hostOrder.map(item => item.id)).toEqual(['adapted-macbeth', 'quiz', 'orig-macbeth']);
    const ordered = api.orderOriginalsBeforeCompanions(hostOrder);
    expect(ordered.map(item => item.id)).toEqual(['orig-macbeth', 'adapted-macbeth', 'quiz']);
    expect(hostOrder.map(item => item.id)).toEqual(['adapted-macbeth', 'quiz', 'orig-macbeth']);
  });
  it('leaves an original of a different reading, and lists with no companion, alone', () => {
    const first = pair('macbeth');
    const other = pair('hamlet', 'Who is there? Nay, answer me. Stand and unfold yourself.');
    const list = [first.adapted, other.original, { id: 'quiz', type: 'quiz' }];
    expect(api.orderOriginalsBeforeCompanions(list).map(item => item.id)).toEqual(['adapted-macbeth', 'orig-hamlet', 'quiz']);
    expect(api.orderOriginalsBeforeCompanions([other.original, { id: 'quiz', type: 'quiz' }]).map(item => item.id)).toEqual(['orig-hamlet', 'quiz']);
    expect(api.orderOriginalsBeforeCompanions(null)).toEqual([]);
  });
});
