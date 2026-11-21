import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const conceptQuestEngine = require(resolve('concept_quest_engine.js'));

let host, root;

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = window.ResizeObserver = FakeResizeObserver;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  ['Globe', 'RefreshCw', 'X', 'Clock', 'Pause', 'Play', 'Trophy'].forEach(name => { window[name] = Stub; });
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptQuestEngine = conceptQuestEngine;
  for (const file of [
    'view_cloze_interaction_panel_module.js',
    'key_concept_map_module.js',
    'view_analysis_module.js',
    'concept_quest_solo_module.js',
    'view_study_timer_modal_module.js',
    'view_xp_modal_module.js',
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
  window.__alloFocusTrapStack = [];
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

describe('Cloze Word Bank polish: solved pill, filter, and picked-word pronunciation', () => {
  it('shows solved count, filters 6+ words cleanly, and speaks the picked word aloud', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const words = ['cell', 'nucleus', 'membrane', 'chloroplast', 'mitochondria', 'vacuole'].map(term => ({ term }));
    const el = mount(React.createElement(window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel, {
      t: k => k,
      activeView: 'simplified',
      interactionMode: 'cloze',
      latestGlossary: words,
      leveledTextLanguage: 'English',
      activityScope: 'cloze-wave3',
      completedBlankCount: 2,
      setClozeCompletedSet: () => {},
      setClozeInstanceSet: () => {},
      playSound: () => {},
      handleBankMouseDown: () => {},
      handleSetInteractionModeToRead: () => {},
      wordBankPosition: null,
      wordBankRef: React.createRef(),
    }));

    expect(el.querySelector('[data-cloze-progress-pill]').textContent).toContain('2 solved');

    // Filter narrows visible chips
    const filterInput = el.querySelector('[data-cloze-bank-filter]');
    expect(filterInput).not.toBeNull();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(filterInput, 'chloro');
      filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const chips = el.querySelectorAll('[data-cloze-bank-chip]');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toBe('chloroplast');

    // Tap chip to pick -> shows Selected bar with Listen button
    act(() => chips[0].click());
    expect(el.querySelector('[data-cloze-picked-bar]').textContent).toContain('chloroplast');
    act(() => el.querySelector('[data-cloze-speak-picked]').click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toBe('chloroplast');

    // Clear pick removes Selected bar
    act(() => el.querySelector('[data-cloze-clear-pick]').click());
    expect(el.querySelector('[data-cloze-picked-bar]')).toBeNull();
  });
});

describe('Key Concept Map polish: branch focus and active-recall self-test', () => {
  it('isolates a focused branch and supports self-test cover/reveal without breaking spine order', () => {
    const BranchItem = ({ branch }) => React.createElement('div', { 'data-branch-detail': branch.title }, branch.items.join(', '));
    const el = mount(React.createElement(window.AlloModules.KeyConceptMapView, {
      main: 'Ecosystems',
      branches: [
        { title: 'Producers', items: ['Plants make food from sunlight'] },
        { title: 'Consumers', items: ['Animals eat plants or other animals'] },
        { title: 'Decomposers', items: ['Fungi recycle nutrients'] },
      ],
      BranchItem,
      t: k => k,
    }));

    expect(el.querySelector('[data-kcm-toolbar]')).not.toBeNull();
    // Focus branch 2
    const focus1 = el.querySelector('[data-kcm-focus-branch="1"]');
    act(() => focus1.click());
    expect(focus1.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[data-kcm-focus-all]').getAttribute('aria-pressed')).toBe('false');

    // Enable Self-test mode: masks branch details behind reveal buttons
    act(() => el.querySelector('[data-kcm-study-toggle]').click());
    expect(el.querySelector('[data-branch-detail="Producers"]')).toBeNull();
    expect(el.querySelector('[data-kcm-reveal-all]').textContent).toContain('(0/3)');

    // Reveal first branch
    act(() => el.querySelector('[data-kcm-reveal-branch="0"]').click());
    expect(el.querySelector('[data-branch-detail="Producers"]')).not.toBeNull();
    expect(el.querySelector('[data-kcm-reveal-all]').textContent).toContain('(1/3)');

    // Reveal all
    act(() => el.querySelector('[data-kcm-reveal-all]').click());
    expect(el.querySelector('[data-branch-detail="Decomposers"]')).not.toBeNull();
  });
});

describe('Document Analysis polish: section quick-jump and source passage read-aloud', () => {
  it('renders teacher quick-jump navigation with open grammar badge and reads passage aloud', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.AnalysisView, {
      t: () => '',
      isTeacherMode: true,
      isProcessing: false,
      isEditingAnalysis: false,
      selectedDiscrepancies: new Set(),
      selectedGrammarErrors: new Set(),
      sourceRefineInstruction: '',
      analysisEditorRef: React.createRef(),
      setIsProcessing: () => {},
      setGenerationStep: () => {},
      setGeneratedContent: () => {},
      setInputText: () => {},
      setSelectedGrammarErrors: () => {},
      setSourceRefineInstruction: () => {},
      toggleDiscrepancySelection: () => {},
      handleAutoCorrectSource: () => {},
      toggleGrammarErrorSelection: () => {},
      handleToggleIsEditingAnalysis: () => {},
      handleAiRefineSource: () => {},
      handleFormatText: () => {},
      handleAnalysisTextChange: () => {},
      formatInlineText: s => s,
      renderFormattedText: s => s,
      splitReferencesFromBody: s => ({ body: s, references: '' }),
      addToast: () => {},
      warnLog: () => {},
      BilingualFieldRenderer: ({ text }) => React.createElement('span', null, text),
      SourceReferencesPanel: () => null,
      generatedContent: {
        id: 'analysis-w3',
        type: 'analysis',
        data: {
          originalText: 'Rivers carry sediment downstream to form fertile deltas.',
          readingLevel: { range: 'Grade 6', explanation: 'Clear vocabulary.' },
          concepts: ['Erosion', 'Deltas'],
          accuracy: { rating: 'Verified', reason: 'Matches earth science.' },
          grammar: ['Check comma usage in sentence 2.', '✓ FIXED: Old typo'],
        },
      },
    }));

    const nav = el.querySelector('[data-analysis-jump-nav]');
    expect(nav).not.toBeNull();
    expect(nav.querySelector('[data-analysis-jump="analysis-sec-grammar"]').textContent).toContain('(1)');
    expect(el.querySelector('#analysis-sec-complexity')).not.toBeNull();
    expect(el.querySelector('#analysis-sec-source')).not.toBeNull();

    const listenBtn = el.querySelector('[data-analysis-listen]');
    expect(listenBtn).not.toBeNull();
    act(() => listenBtn.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('Rivers carry sediment');
    act(() => listenBtn.click());
    expect(player.stopped).toBe(1);
  });
});

describe('Concept Quest Solo polish: encounter and recap read-aloud', () => {
  it('reads current battle encounter and turn recap aloud with Stop toggle', () => {
    const player = makeFakeSpeechPlayer();
    window.AlloSpeechPlayer = player;
    const el = mount(React.createElement(window.AlloModules.ConceptQuestSolo, {
      t: k => k,
      onClose: () => {},
      generatedContent: {
        id: 'cq-w3',
        title: 'Plant Expedition',
        data: {
          questions: [
            { question: 'What helps plants grow?', options: ['Water', 'Stone'], correctAnswer: 'Water', concept: 'Plant needs' },
            { question: 'What absorbs sunlight?', options: ['Leaves', 'Rocks'], correctAnswer: 'Leaves', concept: 'Photosynthesis' },
          ],
        },
      },
    }));

    const startBtn = [...el.querySelectorAll('button')].find(b => b.textContent === 'Start solo adventure');
    act(() => startBtn.click());
    act(() => el.querySelector('[data-solo-travel="room-2"]').click());

    const listenEncounter = el.querySelector('[data-solo-listen-encounter]');
    expect(listenEncounter).not.toBeNull();
    act(() => listenEncounter.click());
    expect(player.calls).toHaveLength(1);
    expect(player.calls[0].text).toContain('What helps plants grow?');

    // Resolve turn and listen to recap
    act(() => el.querySelector('input[type="radio"]').click());
    const resolveBtn = [...el.querySelectorAll('button')].find(b => b.textContent === '3. Resolve this turn');
    act(() => resolveBtn.click());

    const listenRecap = el.querySelector('[data-solo-listen-recap]');
    expect(listenRecap).not.toBeNull();
    act(() => listenRecap.click());
    expect(player.calls).toHaveLength(2);
    expect(player.calls[1].text).toContain('Answer guide: Water');
  });
});

describe('Study Timer & XP Modal polish: quick focus presets, +1m/+5m extend, and XP goal clarity', () => {
  it('offers quick focus goal chips and +1m/+5m extend controls on StudyTimerModal', () => {
    const setTask = vi.fn();
    const setDur = vi.fn();
    const setLeft = vi.fn();
    const el = mount(React.createElement(window.AlloModules.StudyTimerModal.StudyTimerModal, {
      ConfettiExplosion: () => null,
      customTimerMinutes: '',
      formatTime: s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
      handleSetShowStudyTimerModalToFalse: () => {},
      isStudyTimerRunning: false,
      setCustomTimerMinutes: () => {},
      setIsStudyTimerRunning: () => {},
      setStudyDuration: setDur,
      setStudyTaskLabel: setTask,
      setStudyTimeLeft: setLeft,
      showTimerConfetti: false,
      studyDuration: 600,
      studyTaskLabel: '',
      studyTimeLeft: 300,
      studyTimerRef: React.createRef(),
      t: k => k,
    }));

    const presets = el.querySelectorAll('[data-timer-task-preset]');
    expect(presets).toHaveLength(4);
    act(() => presets[0].click());
    expect(setTask).toHaveBeenCalledWith('Reading');

    act(() => el.querySelector('[data-timer-extend="5"]').click());
    expect(setDur).toHaveBeenCalledWith(900);
    expect(setLeft).toHaveBeenCalledWith(600);
  });

  it('shows remaining XP to next level and top activity breakdown chips on XPModal', () => {
    const el = mount(React.createElement(window.AlloModules.XPModal.XPModal, {
      currentLevelXP: 65,
      globalLevel: 3,
      globalPoints: 365,
      globalProgress: 65,
      globalXPNext: 100,
      handleSetShowXPModalToFalse: () => {},
      pointHistory: [
        { id: '1', activity: 'Quiz Check', points: 30, timestamp: Date.now() },
        { id: '2', activity: 'Quiz Check', points: 20, timestamp: Date.now() },
        { id: '3', activity: 'Word Bank', points: 15, timestamp: Date.now() },
      ],
      t: k => k,
    }));

    expect(el.querySelector('[data-xp-remaining]').textContent).toContain('35 XP to Level 4');
    const summary = el.querySelector('[data-xp-activity-summary]');
    expect(summary).not.toBeNull();
    expect(summary.textContent).toContain('Quiz Check');
    expect(summary.textContent).toContain('+50 XP');
    expect(summary.textContent).toContain('Word Bank');
    expect(summary.textContent).toContain('+15 XP');
  });
});
