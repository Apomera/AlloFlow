import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { transformSync } = require('@babel/core');
const { act } = React;

const roots = [];

function mount(Component, props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(React.createElement(Component, props)));
  return { host, rerender: (nextProps) => act(() => root.render(React.createElement(Component, nextProps))) };
}

let Footer;

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.sanitizeHtml = (v) => String(v == null ? '' : v);
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  }
  const footerSrc = readFileSync(resolve('resource_clarity_footer_source.jsx'), 'utf8');
  Footer = new Function(
    'React',
    transformSync(footerSrc, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code + ';return ResourceClarityFooter;'
  )(React);
  for (const mod of [
    'misc_components_module.js',
    'view_dbq_module.js',
    'view_lesson_plan_module.js',
    'view_alignment_report_module.js',
    'view_faq_module.js',
    'view_concept_sort_module.js',
  ]) {
    new Function(readFileSync(resolve(mod), 'utf8'))();
  }
});

afterEach(() => {
  roots.splice(0).forEach((root) => act(() => root.unmount()));
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  delete window.AlloSpeechPlayer;
  delete window.AlloDictionary;
});

describe('Wave 4: Shared DictationButton & Writing Surfaces', () => {
  it('returns null when SpeechRecognition is unavailable and dictates into callbacks when available', () => {
    const DictationButton = window.AlloDictationButton;
    expect(typeof DictationButton).toBe('function');

    const { host: hiddenHost } = mount(DictationButton, { onTranscript: vi.fn() });
    expect(hiddenHost.querySelector('[data-allo-dictation-btn]')).toBeNull();

    let instance = null;
    class FakeSpeechRecognition {
      constructor() { instance = this; }
      start() { this.started = true; }
      stop() { this.stopped = true; }
    }
    window.SpeechRecognition = FakeSpeechRecognition;

    const onTranscript = vi.fn();
    const { host } = mount(DictationButton, { onTranscript, language: 'Spanish' });
    const btn = host.querySelector('[data-allo-dictation-btn]');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    act(() => btn.click());
    expect(instance.started).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');

    act(() => {
      instance.onresult({ resultIndex: 0, results: [[{ transcript: 'Canals lowered shipping costs.' }]] });
      instance.onend();
    });
    expect(onTranscript).toHaveBeenCalledWith('Canals lowered shipping costs.');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(host.textContent).toContain('Added spoken text.');
  });

  it('wires DictationButton into DBQ Essay and appends dictated text to the essay draft', () => {
    let instance = null;
    window.SpeechRecognition = class {
      constructor() { instance = this; }
      start() {}
      stop() {}
    };
    const inputs = {};
    const { host } = mount(window.AlloModules.DbqView, {
      generatedContent: {
        id: 'dbq-dict',
        type: 'dbq',
        data: {
          title: 'Trade',
          synthesisPrompt: 'How did trade grow?',
          documents: [{ id: 'A', title: 'Log', excerpt: 'Boats carried grain.' }],
          rubric: [],
        },
      },
      studentResponses: { 'dbq-dict': { _dbqTab: 'essay', _essayText: 'First sentence.' } },
      handleStudentInput: (_id, key, val) => { inputs[key] = val; },
      t: () => '',
      gradeLevel: '6th Grade',
      isTeacherMode: false,
    });
    const btn = host.querySelector('[data-allo-dictation-btn]');
    expect(btn).not.toBeNull();
    act(() => btn.click());
    act(() => {
      instance.onresult({ resultIndex: 0, results: [[{ transcript: 'Document A shows grain trade.' }]] });
      instance.onend();
    });
    expect(inputs._essayText).toBe('First sentence. Document A shows grain trade.');
  });
});

describe('Wave 4: ResourceClarityFooter Glossary Sense Checks', () => {
  it('flags missing glossary definitions and unmatched cached dictionary senses', () => {
    window.AlloDictionary = {
      getCached: (w) => (w === 'bank' ? { word: 'bank', meanings: [{ definitions: [{ definition: 'Financial institution' }] }] } : null),
      matchPassageSense: () => null,
    };
    const { host } = mount(Footer, {
      resource: {
        id: 'g1',
        type: 'glossary',
        data: [
          { term: 'bank', def: 'The sloping land beside a river' },
          { term: 'delta', def: '' },
        ],
      },
      history: [{ id: 'g1', title: 'River Glossary' }],
      index: 0,
      teacher: true,
      sync: false,
      hasPrev: false,
      hasNext: false,
      onNavigate: vi.fn(),
      t: (k) => k,
    });
    expect(host.textContent).toContain('1 glossary term is missing a definition');
    expect(host.textContent).toContain('1 glossary term has a dictionary entry that did not match the lesson meaning');
  });
});

describe('Wave 4: Lesson Plan Read-Aloud & Teaching Script Teleprompter Shortcuts', () => {
  it('reads Study Guide content aloud via Listen button on LessonPlanView', () => {
    const speak = vi.fn(() => Promise.resolve());
    window.AlloSpeechPlayer = { speak, stop: vi.fn() };
    const { host } = mount(window.AlloModules.LessonPlanView, {
      generatedContent: {
        id: 'lp-listen',
        type: 'lesson-plan',
        config: { sourceTopic: 'Water Cycle', generationInputs: { mode: 'study' } },
        data: { objectives: ['Explain evaporation'], activities: ['Observe warm water'] },
      },
      isTeacherMode: false,
      isIndependentMode: true,
      gradeLevel: '5th Grade',
      sourceTopic: 'Water Cycle',
      t: (k) => k,
    });
    const listenBtn = host.querySelector('[data-lesson-plan-listen="true"]');
    expect(listenBtn).not.toBeNull();
    act(() => listenBtn.click());
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toContain('Study Guide: Water Cycle');
    expect(speak.mock.calls[0][0]).toContain('Explain evaporation');
    expect(speak.mock.calls[0][0]).toContain('Observe warm water');
  });

  it('wires ArrowLeft/ArrowRight/Space shortcuts and CSP print meta in LessonSpokenDirections', () => {
    const ltsSrc = readFileSync(resolve('view_lesson_teaching_script_source.jsx'), 'utf8');
    expect(ltsSrc).toContain('data-spoken-shortcuts="ArrowLeft ArrowRight Space"');
    expect(ltsSrc).toContain('handleTeleprompterKeyDown');
    expect(ltsSrc).toContain("Content-Security-Policy");
  });
});

describe('Wave 4: Standards Alignment Report Summary Export & Clickable Artifacts', () => {
  const sampleReport = {
    id: 'audit1',
    type: 'alignment-report',
    data: {
      comprehensive: {
        overall: { score: 84, label: 'Strong Alignment', dimensionsEvaluated: 2, dimensionsTotal: 9, perDimensionPercent: { standards: 90, vocabulary: 78 } },
        auditScope: { includedArtifactIds: ['art-1'], includedArtifacts: [{ id: 'art-1', title: 'River Reading', type: 'simplified' }] },
        standards: {
          status: 'Aligned',
          totalStandards: 1,
          passCount: 1,
          reviseCount: 0,
          perStandard: [{ standard: 'RI.5.1', overallDetermination: 'Pass', analysis: { textAlignment: { status: 'Aligned', evidence: 'Quotes text.' } } }],
        },
        vocabulary: { status: 'Partially Aligned', recommendations: ['Add Tier 2 word: tributary'] },
      },
    },
  };

  it('provides Copy admin summary, CSP Print summary, min-h-11 dimension chips, and clickable audited artifacts', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    let printedHtml = '';
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: (h) => { printedHtml += h; }, close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    });
    const onOpenArtifact = vi.fn();

    const { host } = mount(window.AlloModules.AlignmentReportView, {
      generatedContent: sampleReport,
      history: [{ id: 'art-1', title: 'River Reading', type: 'simplified' }],
      onOpenArtifact,
      t: () => '',
    });

    const copyBtn = host.querySelector('[data-alignment-copy-summary="true"]');
    expect(copyBtn).not.toBeNull();
    await act(async () => { copyBtn.click(); });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Readiness Score: 84/100');
    expect(writeText.mock.calls[0][0]).toContain('Add Tier 2 word: tributary');

    const printBtn = host.querySelector('[data-alignment-print-report="true"]');
    expect(printBtn).not.toBeNull();
    act(() => printBtn.click());
    expect(printedHtml).toContain('Content-Security-Policy');
    expect(printedHtml).toContain('Readiness Score: 84/100');

    const openArtBtn = host.querySelector('[data-alignment-open-artifact="art-1"]');
    expect(openArtBtn).not.toBeNull();
    act(() => openArtBtn.click());
    expect(onOpenArtifact).toHaveBeenCalledWith(expect.objectContaining({ id: 'art-1', title: 'River Reading' }));

    const navChip = host.querySelector('a[href="#audit-standards"]');
    expect(navChip.className).toContain('min-h-11');
  });
});

describe('Wave 4: FAQ Evidence Quotes, Concept Sort Reasoning & Word Sounds Quick-Jump', () => {
  it('renders FAQ source evidence quotes, teacher evidence input, and Copy Q&A action', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const faqItem = { question: 'Why did crops grow well?', answer: 'Annual flooding left rich silt.', evidence: 'Paragraph 2: "The river deposited fertile soil each spring."' };
    const { host, rerender } = mount(window.AlloModules.FaqView, {
      generatedContent: { id: 'faq-ev', type: 'faq', data: [faqItem] },
      isTeacherMode: false,
      isEditingFaq: false,
      t: (k) => k,
      splitTextToSentences: (s) => [s],
      formatInteractiveText: (s) => s,
      handleSpeak: vi.fn(),
      handleFaqChange: vi.fn(),
      getRows: () => 2,
      voiceSpeed: 1,
      playbackState: { currentIdx: -1 },
    });
    const showBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Show answer'));
    act(() => showBtn.click());
    expect(host.querySelector('[data-faq-evidence="0"]').textContent).toContain('fertile soil each spring');

    const copyBtn = host.querySelector('[data-faq-copy="0"]');
    await act(async () => { copyBtn.click(); });
    expect(writeText.mock.calls[0][0]).toContain('Q: Why did crops grow well?');
    expect(writeText.mock.calls[0][0]).toContain('Source evidence: Paragraph 2');

    const handleFaqChange = vi.fn();
    rerender({
      generatedContent: { id: 'faq-ev', type: 'faq', data: [faqItem] },
      isTeacherMode: true,
      isEditingFaq: true,
      t: (k) => k,
      splitTextToSentences: (s) => [s],
      formatInteractiveText: (s) => s,
      handleSpeak: vi.fn(),
      handleFaqChange,
      getRows: () => 2,
      voiceSpeed: 1,
      playbackState: { currentIdx: -1 },
    });
    expect(host.querySelector('[data-faq-edit-evidence="0"]')).not.toBeNull();
  });

  it('provides Concept Sort student reasoning toggle + Word Sounds Setup 3-step quick-jump bar', () => {
    const handleStudentInput = vi.fn();
    const { host } = mount(window.AlloModules.ConceptSortView, {
      generatedContent: { id: 'cs-1', type: 'concept-sort', data: { categories: [], items: [] } },
      isTeacherMode: false,
      handleStudentInput,
      handleSetIsConceptSortGameToTrue: vi.fn(),
      t: (k) => k,
    });
    const toggle = host.querySelector('[data-concept-sort-reasoning-toggle]');
    expect(toggle).not.toBeNull();
    act(() => toggle.click());
    const box = host.querySelector('#concept-sort-reasoning-input');
    expect(box).not.toBeNull();

    const wsSrc = readFileSync(resolve('word_sounds_setup_source.jsx'), 'utf8');
    expect(wsSrc).toContain('data-ws-setup-steps="true"');
    expect(wsSrc).toContain("id: 'ws-step-goals-words'");
    expect(wsSrc).toContain("id: 'ws-step-lesson'");
    expect(wsSrc).toContain("id: 'ws-step-media'");
  });
});
