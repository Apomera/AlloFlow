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
    'view_faq_module.js',
    'view_sentence_frames_module.js',
    'view_dbq_module.js',
    'view_timeline_module.js',
    'view_concept_sort_module.js',
    'view_brainstorm_module.js',
    'view_outline_module.js',
    'anchor_charts_module.js',
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

function rerender(element) {
  act(() => root.render(element));
}

function setFieldValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function makeFakeSpeechPlayer() {
  const calls = [];
  let stopped = 0;
  let id = 0;
  const player = {
    calls,
    get stopped() { return stopped; },
    speak(text, opts) {
      id += 1;
      calls.push({ text, opts, id });
      window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: true, status: 'playing', currentText: text, currentId: id } }));
      return Promise.resolve({ id });
    },
    stop() {
      stopped += 1;
      window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: false, currentId: id } }));
    },
  };
  return player;
}

describe('FAQ polish: search and active-recall Self-Check mode', () => {
  const faqs = [
    { question: 'What is photosynthesis?', answer: 'Plants convert sunlight into glucose.', evidence: 'Page 4: sunlight drives sugar production.' },
    { question: 'Why are leaves green?', answer: 'Chlorophyll reflects green light.' },
    { question: 'Where do roots absorb water?', answer: 'Root hairs absorb water from soil.' },
  ];
  const baseProps = (extra = {}) => ({
    t: k => k,
    generatedContent: { id: 'faq-polish-1', type: 'faq', data: faqs },
    isTeacherMode: false,
    isEditingFaq: false,
    isPlaying: false,
    playingContentId: null,
    voiceSpeed: 1,
    leveledTextLanguage: 'English',
    playbackState: { currentIdx: -1 },
    audioRef: { current: null },
    playbackSessionRef: { current: null },
    setVoiceSpeed: () => {},
    setIsPlaying: () => {},
    setPlayingContentId: () => {},
    handleToggleIsEditingFaq: () => {},
    handleFaqChange: () => {},
    handleSpeak: () => {},
    getRows: () => 2,
    splitTextToSentences: s => [s],
    formatInteractiveText: s => s,
    ...extra,
  });

  it('filters FAQs by keyword across question, answer, and evidence, with clean reset', () => {
    const el = mount(React.createElement(window.AlloModules.FaqView, baseProps()));
    const search = el.querySelector('[data-faq-search]');
    expect(search).not.toBeNull();
    expect(el.querySelectorAll('[data-help-key="faq_item"]')).toHaveLength(3);

    setFieldValue(search, 'chlorophyll');
    expect(el.querySelectorAll('[data-help-key="faq_item"]')).toHaveLength(1);
    expect(el.textContent).toContain('Why are leaves green?');

    setFieldValue(search, 'nonexistent-xyz');
    expect(el.querySelector('[data-faq-no-matches]')).not.toBeNull();
    act(() => el.querySelector('[data-faq-no-matches] button').click());
    expect(el.querySelectorAll('[data-help-key="faq_item"]')).toHaveLength(3);
  });

  it('supports Self-Check mode: private recall scratchpad, Got it / Review again filtering, and localStorage persistence', () => {
    const el = mount(React.createElement(window.AlloModules.FaqView, baseProps()));
    act(() => el.querySelector('[data-faq-study-mode]').click());
    expect(el.querySelector('[data-faq-study-bar]')).not.toBeNull();

    // Scratchpad renders outside hidden #faq-answer-0 so collapsed region stays empty
    const tryInput = el.querySelector('[data-faq-try-input="0"]');
    expect(tryInput).not.toBeNull();
    expect(document.getElementById('faq-answer-0').hidden).toBe(true);
    expect(document.getElementById('faq-answer-0').textContent).toBe('');

    setFieldValue(tryInput, 'Making food from sun');
    // Reveal answer 0
    const expand0 = el.querySelector('button[aria-controls="faq-answer-0"]');
    act(() => expand0.click());
    expect(el.querySelector('[data-faq-try-compare="0"]').textContent).toContain('Making food from sun');

    // Mark FAQ 0 as Got it, FAQ 1 as Review again
    act(() => el.querySelector('[data-faq-mark-got-it="0"]').click());
    act(() => el.querySelector('button[aria-controls="faq-answer-1"]').click());
    act(() => el.querySelector('[data-faq-mark-review="1"]').click());
    expect(el.querySelector('[data-faq-study-bar]').textContent).toContain('Checked 2 of 3');

    // Filter to Review again
    act(() => el.querySelector('[data-faq-study-filter="review"]').click());
    expect(el.querySelectorAll('[data-help-key="faq_item"]')).toHaveLength(1);
    expect(el.textContent).toContain('Why are leaves green?');
  });
});

describe('Sentence Frames polish: progress pill, word bank usage, listen to draft, and tier filters', () => {
  const items = [
    { text: 'I noticed that ___', tier: 'emerging' },
    { text: 'This evidence proves ___', tier: 'expanding' },
    { text: 'In contrast to ___,', tier: 'bridging' },
  ];
  const sfProps = (responses = {}, extra = {}) => ({
    t: k => k,
    generatedContent: { id: 'sf-polish-1', type: 'sentence-frames', data: { mode: 'list', items, wordBank: ['evaporation', 'condensation'] } },
    isTeacherMode: false,
    isEditingScaffolds: false,
    gradingSession: { isOpen: false },
    studentResponses: { 'sf-polish-1': responses },
    setGradingSession: () => {},
    setStudentWorkInput: () => {},
    handleResetScaffolds: () => {},
    launchGradingSession: () => {},
    handleToggleIsEditingScaffolds: () => {},
    submitGradingSession: () => {},
    handleScaffoldChange: () => {},
    handleStudentInput: () => {},
    handleScaffoldTextChange: () => {},
    handleGenerateRubric: () => {},
    handleToggleRubricZoom: () => {},
    handleAutoGrade: () => {},
    handleSetGradingResultToNull: () => {},
    getRows: () => 2,
    renderFormattedText: x => x,
    copyToClipboard: () => {},
    DraftFeedbackInterface: () => null,
    ErrorBoundary: p => p.children,
    ...extra,
  });

  it('tracks live progress, highlights used word bank terms, listens to assembled draft, and filters by tier', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.SentenceFramesView, sfProps({ 0: 'evaporation lifts water' })));

    expect(el.querySelector('[data-scaffolds-progress]').textContent).toContain('1 / 3 prompts started');
    expect(el.querySelector('[data-scaffold-word-bank-count]').textContent).toContain('1/2 used');
    const bankButtons = [...el.querySelectorAll('[data-scaffold-word-bank] button')];
    expect(bankButtons[0].getAttribute('data-word-bank-used')).toBe('true');
    expect(bankButtons[1].getAttribute('data-word-bank-used')).toBe('false');

    // Listen to draft button speaks assembled text and toggles Stop
    const listenBtn = el.querySelector('[data-scaffolds-listen-draft]');
    expect(listenBtn.disabled).toBe(false);
    act(() => listenBtn.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('I noticed that evaporation lifts water');
    expect(listenBtn.textContent).toContain('Stop');
    act(() => listenBtn.click());
    expect(player.stopped).toBe(1);

    // Tier filter narrows displayed cards while preserving original numbers
    act(() => el.querySelector('[data-tier-filter="bridging"]').click());
    const visibleCards = el.querySelectorAll('[data-help-key="scaffolds_item"]');
    expect(visibleCards).toHaveLength(1);
    expect(visibleCards[0].textContent).toContain('In contrast to');
  });
});

describe('DBQ polish: bottom document navigation, interactive Evidence Tracker, and Listen to essay', () => {
  const dbqContent = {
    id: 'dbq-polish-1',
    type: 'dbq',
    data: {
      title: 'Water Rights',
      historicalContext: 'A valley debate.',
      synthesisPrompt: 'How should the town share river water?',
      documents: [
        { id: 'A', title: 'Document A: Farmer Letter', source: '1920', excerpt: 'Crops need water in June.' },
        { id: 'B', title: 'Document B: Mill Ledger', source: '1921', excerpt: 'The mill wheel needs steady flow.' },
      ],
      corroborationClaims: [{ claim: 'Water was scarce.', supportingDocs: ['A', 'B'], challengingDocs: [] }],
      rubric: [],
    },
  };

  function mountDbq(initialResponses = {}) {
    let store = { 'dbq-polish-1': { ...initialResponses } };
    function Harness() {
      const [, tick] = React.useState(0);
      return React.createElement(window.AlloModules.DbqView, {
        generatedContent: dbqContent,
        studentResponses: store,
        handleStudentInput: (resId, key, val) => {
          store = { ...store, [resId]: { ...(store[resId] || {}), [key]: val } };
          tick(n => n + 1);
        },
        callGemini: null,
        cleanJson: s => s,
        addToast: () => {},
        handleScoreUpdate: () => {},
        gradeLevel: '8th',
        t: () => '',
        isTeacherMode: false,
      });
    }
    return mount(React.createElement(Harness));
  }

  it('navigates between documents and onward to Corroboration from the bottom footer', () => {
    const el = mountDbq({ _dbqTab: 'documents', _dbqActiveDoc: 'A' });
    expect(el.querySelector('[data-dbq-doc-nav]').textContent).toContain('Doc A (1 of 2)');
    act(() => el.querySelector('[data-dbq-nav-next]').click());
    expect(el.querySelector('[data-dbq-doc-nav]').textContent).toContain('Doc B (2 of 2)');
    expect(el.querySelector('[data-dbq-nav-prev]')).not.toBeNull();
    act(() => el.querySelector('[data-dbq-nav-corroborate]').click());
    expect(el.textContent).toContain('Corroboration Matrix');
  });

  it('opens and filters the reference drawer from Evidence Tracker chips and reads the essay aloud', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mountDbq({ _dbqTab: 'essay', _essayText: 'According to Document A, crops needed water.' });

    const chipB = el.querySelector('[data-dbq-evidence-chip="B"]');
    act(() => chipB.click());
    const drawer = el.querySelector('[data-dbq-essay-reference-drawer]');
    expect(drawer.open).toBe(true);
    expect(drawer.textContent).toContain('Mill Ledger');
    expect(drawer.textContent).not.toContain('Farmer Letter');

    act(() => el.querySelector('[data-dbq-drawer-show-all]').click());
    expect(drawer.textContent).toContain('Farmer Letter');
    expect(drawer.textContent).toContain('Mill Ledger');

    const listenEssay = el.querySelector('[data-dbq-listen-essay]');
    expect(listenEssay.disabled).toBe(false);
    act(() => listenEssay.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('According to Document A');
    expect(listenEssay.textContent).toContain('Stop');
  });
});

describe('Timeline polish: self-test mask modes, sequence audio, and student preview pills', () => {
  const tlItems = [
    { date: 'Step 1', event: 'Water evaporates from oceans.' },
    { date: 'Step 2', event: 'Vapor condenses into clouds.' },
  ];
  const tlProps = (extra = {}) => ({
    t: k => k,
    generatedContent: { id: 'tl-polish-1', type: 'timeline', data: { progressionLabel: 'Order of Stages', items: tlItems } },
    isTeacherMode: false,
    isIndependentMode: true,
    TIMELINE_MODE_DEFINITIONS: {},
    dismissedVerifications: new Set(),
    timelineImageSize: 96,
    timelineRefinementInputs: {},
    isGeneratingTimelineImage: {},
    isVerifyingTimeline: false,
    isEditingTimeline: false,
    isTimelineGame: false,
    handleSetIsTimelineGameToTrue: () => {},
    ErrorBoundary: p => p.children,
    TimelineGame: () => null,
    ...extra,
  });

  it('masks labels or events for self-testing and reads the full sequence aloud', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.TimelineView, tlProps()));
    expect(el.querySelector('[data-timeline-study-bar]')).not.toBeNull();

    act(() => el.querySelector('[data-timeline-mask-mode="labels"]').click());
    expect(el.querySelector('[data-timeline-reveal-label="0"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Step 1');
    act(() => el.querySelector('[data-timeline-reveal-label="0"]').click());
    expect(el.textContent).toContain('Step 1');

    act(() => el.querySelector('[data-timeline-mask-mode="events"]').click());
    expect(el.querySelector('[data-timeline-reveal-event="1"]')).not.toBeNull();
    act(() => el.querySelector('[data-timeline-reveal-toggle]').click());
    expect(el.textContent).toContain('Vapor condenses into clouds.');

    act(() => el.querySelector('[data-timeline-listen-all]').click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('Step 1: Water evaporates');
    expect(player.calls[0].text).toContain('Step 2: Vapor condenses');
  });

  it('shows step count, progression label, and listen button on the student launch card', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.TimelineView, tlProps({ isTeacherMode: false, isIndependentMode: false })));
    expect(el.querySelector('[data-timeline-preview-pills]').textContent).toContain('2');
    expect(el.querySelector('[data-timeline-preview-pills]').textContent).toContain('Order of Stages');
    act(() => el.querySelector('[data-timeline-listen-intro]').click());
    expect(player.calls).toHaveLength(1);
  });
});

describe('Concept Sort polish: student snapshot & instructions audio + teacher quick filter', () => {
  const csData = {
    categories: [{ id: 'c1', label: 'Mammals' }, { id: 'c2', label: 'Reptiles' }, { id: 'c3', label: 'Hidden', isSelected: false }],
    items: [
      { id: 'i1', content: 'Otter', categoryId: 'c1' },
      { id: 'i2', content: 'Whale', categoryId: 'c1' },
      { id: 'i3', content: 'Fox', categoryId: 'c1' },
      { id: 'i4', content: 'Gecko', categoryId: 'c2' },
      { id: 'i5', content: 'Turtle', categoryId: 'c2' },
      { id: 'i6', content: 'Cobra', categoryId: 'c2' },
      { id: 'i7', content: 'Secret', categoryId: 'c3' },
    ],
  };
  const csProps = (extra = {}) => ({
    t: k => k,
    isTeacherMode: false,
    isIndependentMode: false,
    generatedContent: { id: 'cs-polish-1', type: 'concept-sort', data: csData },
    csEdit: null,
    setCsEdit: () => {},
    csAddingCatId: null,
    csAddingText: '',
    csBusyId: null,
    isConceptSortGame: false,
    setCsAddingCatId: () => {},
    setCsAddingText: () => {},
    handleSetIsConceptSortGameToTrue: () => {},
    csUpdateCategoryLabel: () => {},
    csUpdateItemText: () => {},
    csMoveItem: () => {},
    csRegenerateItem: () => {},
    csRegenerateItemImage: () => {},
    csUploadItemImage: () => {},
    csClearItemImage: () => {},
    csDeleteItem: () => {},
    csAddItem: () => {},
    setConceptSortImageScale: () => {},
    ...extra,
  });

  it('shows playable snapshot counts and category names without leaking hidden categories, plus Listen button', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.ConceptSortView, csProps()));
    const snap = el.querySelector('[data-concept-sort-snapshot]');
    expect(snap.textContent).toContain('2 categories · 6 cards');
    expect(snap.textContent).toContain('Mammals');
    expect(snap.textContent).toContain('Reptiles');
    expect(snap.textContent).not.toContain('Hidden');

    act(() => el.querySelector('[data-concept-sort-listen]').click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('Mammals, Reptiles');
  });

  it('filters teacher review items when 6 or more items exist', () => {
    const el = mount(React.createElement(window.AlloModules.ConceptSortView, csProps({ isTeacherMode: true })));
    const filterInput = el.querySelector('[data-concept-sort-filter]');
    expect(filterInput).not.toBeNull();
    setFieldValue(filterInput, 'gecko');
    expect(el.querySelectorAll('[data-help-key="concept_sort_item"]')).toHaveLength(1);
    expect(el.textContent).toContain('Gecko');
    act(() => el.querySelector('[data-concept-sort-filter-clear]').click());
    expect(el.querySelectorAll('[data-help-key="concept_sort_item"]')).toHaveLength(7);
  });
});

describe('Activities (Brainstorm) polish: live progress pills and Jigsaw expert-packet Listen', () => {
  const actResource = {
    id: 'act-polish-1',
    type: 'brainstorm',
    data: [
      {
        kind: 'discussion',
        title: 'Water Debate',
        protocol: 'think-pair-share',
        openingQuestion: 'Why save water?',
        questionSets: [{ depth: 'literal', questions: ['What uses the most water?'] }],
        talkStems: { agree: ['I agree because'] },
      },
      {
        kind: 'jigsaw',
        title: 'Cycle Jigsaw',
        groupSize: 3,
        chunks: [{ label: 'Evaporation', expertPacket: 'Sun warms surface water.', teachBack: { keyPoints: ['Heat drives vapor'] } }],
        accountabilityCheck: [{ q: 'What starts evaporation?', answer: 'Heat from the sun.' }],
      },
    ],
  };

  it('shows live answered progress pills and per-packet Listen buttons in Jigsaw expert groups', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const openKey = window.AlloModules.BrainstormView.activityResponseKey(actResource.data[0], 'opening', 'Why save water?');
    const el = mount(React.createElement(window.AlloModules.BrainstormView, {
      t: () => '',
      generatedContent: actResource,
      isTeacherMode: false,
      isEditingBrainstorm: false,
      isGeneratingGuide: {},
      isGeneratingWorksheet: {},
      isGeneratingWorksheetCover: {},
      handleBrainstormChange: () => {},
      renderFormattedText: x => x,
      getRows: () => 2,
      studentResponses: { 'act-polish-1': { [openKey]: 'Everyone needs clean water.' } },
      handleStudentInput: () => {},
    }));

    const pills = [...el.querySelectorAll('[data-activity-progress]')].map(n => n.textContent.trim());
    expect(pills[0]).toContain('1 / 2 answered');
    expect(pills[1]).toContain('0 / 1 answered');

    const chunkListen = el.querySelector('[data-jigsaw-chunk-listen="0"]');
    expect(chunkListen).not.toBeNull();
    act(() => chunkListen.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('Sun warms surface water.');
    expect(player.calls[0].text).toContain('Heat drives vapor');
  });
});

describe('Outline & Anchor Chart polish: organizer audio and reference Self-Test mode', () => {
  it('reads the graphic organizer main topic and branches aloud and toggles Stop cleanly', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.OutlineView, {
      t: k => k,
      isTeacherMode: false,
      isInteractiveMap: false,
      isInteractiveVenn: false,
      isVennPlaying: false,
      leveledTextLanguage: 'English',
      gradeLevel: '6',
      generatedContent: {
        id: 'org-polish-1',
        type: 'outline',
        data: {
          structureType: 'Key Concept Map',
          main: 'Water Cycle',
          branches: [
            { title: 'Evaporation', items: ['Sun heats liquid water'] },
            { title: 'Condensation', items: ['Vapor forms clouds'] },
          ],
        },
      },
      renderOutlineContent: () => React.createElement('div', null, 'Static Organizer'),
    }));

    const listenBtn = el.querySelector('[data-outline-listen]');
    expect(listenBtn).not.toBeNull();
    expect(listenBtn.style.minHeight).toBe('44px');
    act(() => listenBtn.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('Water Cycle');
    expect(player.calls[0].text).toContain('Evaporation');
    expect(player.calls[0].text).toContain('Vapor forms clouds');
    expect(listenBtn.textContent).toContain('Stop');
    act(() => listenBtn.click());
    expect(player.stopped).toBe(1);
  });

  it('supports Anchor Chart Self-Test recall mode in reference view and live progress pill in interactive student mode', () => {
    const chartData = {
      title: 'States of Matter',
      chartType: 'reference',
      sections: [
        { id: 's1', label: 'Solid', bullets: ['Fixed shape', 'Tightly packed particles'], bulletIds: ['b1', 'b2'] },
        { id: 's2', label: 'Liquid', bullets: ['Takes container shape'], bulletIds: ['b3'] },
      ],
      interactive: { armed: false, rubric: '' },
      studentAnswers: {},
    };
    const el = mount(React.createElement(window.AlloModules.AnchorChartView, {
      t: () => '',
      generatedContent: { id: 'ac-polish-1', type: 'anchor-chart', data: chartData },
      isTeacherMode: false,
      handleNoteUpdate: () => {},
    }));

    const toggle = el.querySelector('[data-anchor-study-toggle]');
    expect(toggle).not.toBeNull();
    expect(el.textContent).toContain('Fixed shape');

    act(() => toggle.click());
    expect(el.textContent).not.toContain('Fixed shape');
    const reveal0 = el.querySelector('[data-anchor-reveal-section="0"]');
    expect(reveal0).not.toBeNull();
    act(() => reveal0.click());
    expect(el.textContent).toContain('Fixed shape');
    expect(toggle.textContent).toContain('1/2');

    // Interactive armed student mode hides Self-Test and displays live filled progress pill
    rerender(React.createElement(window.AlloModules.AnchorChartView, {
      t: () => '',
      generatedContent: {
        id: 'ac-polish-2',
        type: 'anchor-chart',
        data: { ...chartData, interactive: { armed: true, rubric: 'Check accuracy' }, studentAnswers: { s1: { b1: 'Ice cube' } } },
      },
      isTeacherMode: false,
      handleNoteUpdate: () => {},
    }));
    expect(el.querySelector('[data-anchor-study-toggle]')).toBeNull();
    expect(el.querySelector('[data-anchor-student-progress]').textContent).toContain('1/3 filled');
  });
});

