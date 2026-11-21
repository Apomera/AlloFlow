import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

let host, root;

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  window.AlloModules = window.AlloModules || {};
  for (const file of [
    'resource_content_fingerprint_module.js',
    'lesson_teaching_script_module.js',
    'view_lesson_teaching_script_module.js',
    'note_taking_templates_module.js',
    'view_math_module.js',
    'view_alignment_report_module.js',
    'view_lesson_plan_module.js',
    'view_image_module.js',
    'view_socratic_chat_module.js',
  ]) {
    new Function(readFileSync(resolve(file), 'utf8'))();
  }
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  delete window.AlloSpeechPlayer;
  delete window.__alloAiUsable;
  try { window.localStorage?.clear(); } catch (_) {}
  vi.restoreAllMocks();
});

function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(element));
  return host;
}

function makeFakeSpeechPlayer() {
  const calls = [];
  let stopped = 0;
  let id = 0;
  let playing = false;
  return {
    calls,
    get stopped() { return stopped; },
    isPlaying: () => playing,
    speak(text, opts) {
      id += 1;
      playing = true;
      calls.push({ text, opts, id });
      window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: true, status: 'playing', currentText: text, currentId: id } }));
      return Promise.resolve({ id });
    },
    stop() {
      playing = false;
      stopped += 1;
      window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: false, currentId: id } }));
    },
  };
}

describe('Note-Taking polish: Cornell Study Cues, Guided Notes progress/audio, and Q&A self-check', () => {
  it('supports Cornell Study Cues mode (cover/reveal notes) and template read-aloud', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.NoteTakingView, {
      t: k => k,
      isTeacherMode: false,
      handleNoteUpdate: () => {},
      generatedContent: {
        id: 'nt-cornell-1',
        type: 'note-taking',
        data: {
          templateType: 'cornell-notes',
          title: 'Cell Respiration',
          cues: [{ id: 'c1', text: 'What makes ATP?' }, { id: 'c2', text: 'Where does glycolysis happen?' }],
          notes: [{ id: 'n1', text: 'Mitochondria produce ATP.' }, { id: 'n2', text: 'In the cytoplasm.' }],
          summary: 'Cells convert glucose into usable ATP.',
        },
      },
    }));

    const studyToggle = el.querySelector('[data-cornell-study-toggle]');
    expect(studyToggle).not.toBeNull();
    act(() => studyToggle.click());

    // Notes are masked behind reveal buttons
    expect(el.querySelector('[data-cornell-reveal-row="0"]')).not.toBeNull();
    expect(el.querySelector('[data-cornell-reveal-row="1"]')).not.toBeNull();
    expect(el.querySelector('[data-cornell-reveal-all]').textContent).toContain('(0/2)');

    act(() => el.querySelector('[data-cornell-reveal-row="0"]').click());
    expect(el.querySelector('[data-cornell-reveal-row="0"]')).toBeNull();
    expect(el.querySelector('[data-cornell-reveal-all]').textContent).toContain('(1/2)');

    // Listen button speaks cues + notes + summary
    const listen = el.querySelector('[data-notes-listen="cornell"]');
    act(() => listen.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('Cell Respiration');
    expect(player.calls[0].text).toContain('Mitochondria produce ATP');
  });

  it('shows live Guided Notes progress and reads blanks cleanly aloud', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.NoteTakingView, {
      t: k => k,
      isTeacherMode: false,
      handleNoteUpdate: () => {},
      generatedContent: {
        id: 'nt-guided-1',
        type: 'note-taking',
        data: {
          templateType: 'guided-notes',
          title: 'Plant Parts',
          blanks: [
            { id: 'b1', before: 'Plants absorb water through ', answer: 'roots', after: '.', studentAnswer: 'roots' },
            { id: 'b2', before: 'Leaves capture ', answer: 'sunlight', after: '.', studentAnswer: '' },
          ],
        },
      },
    }));

    expect(el.querySelector('[data-guided-notes-progress]').textContent).toContain('1/2 filled');
    act(() => el.querySelector('[data-notes-listen="guided-notes"]').click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('through roots.');
    expect(player.calls[0].text).toContain('Leaves capture blank.');
  });

  it('upgrades Q&A Quiz Me mode with Got it / Review again filters and Show all toggle', () => {
    const el = mount(React.createElement(window.AlloModules.NoteTakingView, {
      t: k => k,
      isTeacherMode: false,
      handleNoteUpdate: () => {},
      generatedContent: {
        id: 'nt-qa-1',
        type: 'note-taking',
        data: {
          templateType: 'q-and-a',
          title: 'Solar System',
          pairs: [
            { id: 'p1', question: 'Why is Mars red?', answer: 'Iron oxide dust covers its surface.' },
            { id: 'p2', question: 'Which planet has rings?', answer: 'Saturn has prominent ice rings.' },
          ],
        },
      },
    }));

    act(() => el.querySelector('[data-help-key="qanda_quiz_toggle"]').click());
    expect(el.querySelector('[data-qanda-quiz-bar]')).not.toBeNull();
    act(() => el.querySelector('[data-qanda-quiz-toggle-all]').click());
    expect(el.textContent).toContain('Iron oxide dust');
    expect(el.textContent).toContain('Saturn has prominent');

    act(() => el.querySelector('[data-qanda-mark-got-it="0"]').click());
    act(() => el.querySelector('[data-qanda-mark-review="1"]').click());
    act(() => el.querySelector('[data-qanda-filter="review"]').click());
    expect(el.textContent).toContain('Which planet has rings?');
    expect(el.textContent).not.toContain('Why is Mars red?');
  });
});

describe('Math Workbench polish: spoken LaTeX read-aloud and practice progress stepper', () => {
  it('renders live problem progress bar and speaks LaTeX problems naturally', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.MathView, {
      t: () => '',
      isTeacherMode: false,
      isIndependentMode: false,
      mathSelfGradeMode: false,
      generatedContent: {
        id: 'math-polish-1',
        type: 'math',
        data: {
          title: 'Fractions & Powers',
          problems: [
            { id: 'm1', question: 'Compute $\\frac{3}{4} \\times x^2$', answer: '3', steps: [] },
            { id: 'm2', question: 'Find $\\sqrt{16}$', answer: '4', steps: [] },
          ],
        },
      },
      studentResponses: { 'math-polish-1': { m1: '3' } },
      mathCheckResults: { 'math-polish-1': { m1: { checked: true, verdict: 'correct', score: 100, feedback: 'Great!' } } },
      mathHintData: {},
      mathStudentAnswers: {},
      formatInlineText: s => s,
      handleStudentInput: () => {},
      handleCheckMathWork: () => {},
      handleResetMathCheck: () => {},
      handleGetMathHint: () => {},
    }));

    const bar = el.querySelector('[data-math-progress-bar]');
    expect(bar).not.toBeNull();
    expect(bar.textContent).toContain('1 / 2 started');
    expect(bar.textContent).toContain('1 checked');
    expect(el.querySelectorAll('[data-math-jump]')).toHaveLength(2);

    const listen0 = el.querySelector('[data-math-listen="0"]');
    expect(listen0).not.toBeNull();
    act(() => listen0.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('3 over 4');
    expect(player.calls[0].text).toContain('times');
    expect(player.calls[0].text).toContain('squared');
    // Clicking again while playing stops audio
    act(() => listen0.click());
    expect(player.stopped).toBe(1);
  });
});

describe('Curriculum Audit polish: dimension filter and quick-jump strip', () => {
  it('filters between All, Needs attention, and Aligned dimensions with quick-jump chips', () => {
    const comp = {
      overall: { score: 78, dimensionsEvaluated: 9, dimensionsApplicable: 9, totalDimensions: 9, perDimensionPercent: {} },
      standards: { status: 'Aligned', perStandard: [] },
      vocabulary: { status: 'Partially Aligned', recommendations: ['Add glossary'] },
      engagement: { status: 'Aligned' },
      accessibility: { status: 'Not Aligned', recommendations: ['Add alt text'] },
      udl: { status: 'Aligned' },
      accuracy: { status: 'Aligned' },
      differentiation: { status: 'Aligned' },
      cognitiveLoad: { status: 'Aligned' },
      culturalResponsiveness: { notApplicable: true, reason: 'Math drill' },
    };
    const el = mount(React.createElement(window.AlloModules.AlignmentReportView, {
      t: () => '',
      history: [],
      isProcessing: false,
      generatedContent: { id: 'audit-polish-1', type: 'alignment-report', data: { reports: [], comprehensive: comp } },
    }));

    const nav = el.querySelector('[data-audit-dimension-nav]');
    expect(nav).not.toBeNull();
    expect(el.querySelector('[data-audit-dim-filter="attention"]').textContent).toContain('(2)');
    expect(el.querySelector('[data-audit-dim-filter="aligned"]').textContent).toContain('(6)');

    act(() => el.querySelector('[data-audit-dim-filter="attention"]').click());
    expect(el.querySelector('#audit-vocabulary')).not.toBeNull();
    expect(el.querySelector('#audit-accessibility')).not.toBeNull();
    expect(el.querySelector('#audit-standards')).toBeNull();

    act(() => el.querySelector('[data-audit-dim-filter="aligned"]').click());
    expect(el.querySelector('#audit-standards')).not.toBeNull();
    expect(el.querySelector('#audit-accessibility')).toBeNull();
  });
});

describe('Lesson Plan polish: interactive Materials checklist and section quick-jump strip', () => {
  it('tracks materials prep readiness in localStorage and renders section quick-jump buttons', () => {
    const el = mount(React.createElement(window.AlloModules.LessonPlanView, {
      t: () => '',
      isTeacherMode: true,
      isParentMode: false,
      isIndependentMode: false,
      history: [],
      sourceTopic: 'Fractions',
      gradeLevel: '4th Grade',
      getRows: () => 2,
      normalizeMaterialItem: v => v,
      BilingualFieldRenderer: ({ text }) => React.createElement('span', null, text),
      generatedContent: {
        id: 'lp-polish-1',
        type: 'lesson-plan',
        data: {
          materialsNeeded: ['Fraction strips', 'Dry-erase boards'],
          essentialQuestion: 'How do fractions compare?',
          objectives: ['Compare fractions with models'],
          directInstruction: 'Model halves and fourths.',
          guidedPractice: 'Pair work with strips.',
          closure: 'Exit ticket check.',
        },
      },
    }));

    const jumpNav = el.querySelector('[data-lesson-plan-jump-nav]');
    expect(jumpNav).not.toBeNull();
    expect(jumpNav.querySelector('[data-lp-jump="lp-section-materials"]')).not.toBeNull();
    expect(jumpNav.querySelector('[data-lp-jump="lp-section-closure"]')).not.toBeNull();

    expect(el.querySelector('[data-lesson-materials-progress]').textContent).toContain('0/2 ready');
    act(() => el.querySelector('[data-lesson-material-check="0"]').click());
    expect(el.querySelector('[data-lesson-materials-progress]').textContent).toContain('1/2 ready');
    act(() => el.querySelector('[data-lesson-material-check="1"]').click());
    expect(el.querySelector('[data-lesson-materials-progress]').textContent).toContain('All 2 ready');
  });
});

describe('Visual Supports polish: learner image description audio & expandable drawer', () => {
  const sampleImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  it('lets learners listen to and reveal a valid image description, and hides tools for decorative or missing descriptions', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.ImageView, {
      t: k => k,
      isTeacherMode: false,
      leveledTextLanguage: 'English',
      singleImageFileRef: React.createRef(),
      imageRefinementInput: '',
      addToast: () => {},
      VisualPanelGrid: () => null,
      generatedContent: {
        id: 'img-polish-1',
        type: 'image',
        data: {
          imageUrl: sampleImg,
          altText: 'A labelled diagram of a plant cell showing the nucleus and chloroplasts.',
          altSource: 'vision',
          decorative: false,
        },
      },
    }));

    expect(el.querySelector('[data-visual-learner-tools]')).not.toBeNull();
    expect(el.querySelector('[data-visual-description-text]')).toBeNull();

    // Expand description
    const toggleBtn = el.querySelector('[data-visual-description-toggle]');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    act(() => toggleBtn.click());
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('[data-visual-description-text]').textContent).toContain('plant cell showing the nucleus');

    // Listen & stop toggle
    const listenBtn = el.querySelector('[data-visual-listen]');
    act(() => listenBtn.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('plant cell showing the nucleus');
    act(() => listenBtn.click());
    expect(player.stopped).toBe(1);

    // Decorative image hides the learner description bar
    act(() => root.render(React.createElement(window.AlloModules.ImageView, {
      t: k => k,
      isTeacherMode: false,
      leveledTextLanguage: 'English',
      singleImageFileRef: React.createRef(),
      imageRefinementInput: '',
      addToast: () => {},
      VisualPanelGrid: () => null,
      generatedContent: {
        id: 'img-polish-2',
        type: 'image',
        data: { imageUrl: sampleImg, altText: '', decorative: true },
      },
    })));
    expect(el.querySelector('[data-visual-learner-tools]')).toBeNull();
  });
});

describe('Socratic Tutor polish: starter prompt chips reduce blank-page friction', () => {
  function socraticProps(overrides = {}) {
    return {
      chatStyles: {},
      handleSetShowSocraticChatToFalse: () => {},
      handleSocraticSubmit: () => {},
      handleToggleIsSocraticExpanded: () => {},
      handleToggleSocraticAutoRead: () => {},
      handleToggleSocraticAutoSend: () => {},
      isSocraticDictating: false,
      isSocraticDragging: false,
      isSocraticExpanded: false,
      isSocraticThinking: false,
      recognitionRef: { current: null },
      renderFormattedText: s => s,
      setIsSocraticDictating: () => {},
      setIsSocraticDragging: () => {},
      setSocraticInput: vi.fn(),
      socraticAutoRead: false,
      socraticAutoSend: false,
      socraticChatRef: React.createRef(),
      socraticDragOffset: React.createRef(),
      socraticInput: '',
      socraticLivePos: React.createRef(),
      socraticMessages: [],
      socraticPosition: null,
      socraticScrollRef: React.createRef(),
      t: k => k,
      warnLog: () => {},
      ...overrides,
    };
  }

  it('shows 3 starter chips when empty with AI enabled, populates and focuses input on click, and hides when AI is off or messages exist', () => {
    const setInput = vi.fn();
    const el = mount(React.createElement(window.AlloModules.SocraticChat.SocraticChat, socraticProps({ setSocraticInput: setInput })));
    const starters = el.querySelectorAll('[data-socratic-starter]');
    expect(starters).toHaveLength(3);
    act(() => starters[1].click());
    expect(setInput).toHaveBeenCalledWith('Give me a small hint on where to start.');
    expect(document.activeElement).toBe(el.querySelector('[data-help-key="socratic_input"]'));

    // Hidden once conversation begins
    act(() => root.render(React.createElement(window.AlloModules.SocraticChat.SocraticChat, socraticProps({
      setSocraticInput: setInput,
      socraticMessages: [{ role: 'user', text: 'Hi' }],
    }))));
    expect(el.querySelector('[data-socratic-starters]')).toBeNull();

    // Hidden when AI is disabled
    window.__alloAiUsable = () => false;
    act(() => root.unmount());
    root = createRoot(el);
    act(() => root.render(React.createElement(window.AlloModules.SocraticChat.SocraticChat, socraticProps({ setSocraticInput: setInput }))));
    expect(el.querySelector('[data-socratic-starters]')).toBeNull();
  });
});
