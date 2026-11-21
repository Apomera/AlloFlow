// Wave 8 regression suite (2026-11-20): UDL Read-Aloud & Dictation, Export Fidelity, and Submission Inbox UX.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;

function mountElement(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(el);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

beforeAll(() => {
  React = require(path.join(modulesDir, 'react'));
  ReactDOMClient = require(path.join(modulesDir, 'react-dom/client'));
  act = React.act || require(path.join(modulesDir, 'react-dom/test-utils')).act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
});

afterEach(() => {
  document.body.innerHTML = '';
  delete window.AlloSpeechPlayer;
  delete window.AlloDictationButton;
  if (window.AlloModules) delete window.AlloModules.DictationButton;
  vi.restoreAllMocks();
});

describe('Wave 8 — Export Fidelity, Submission Inbox UX & UDL Read-Aloud / Dictation', () => {
  describe('1. Export Handlers (Slides Renderers, Math Hint Guard, Print CSS & Filename)', () => {
    it('preserves topic when title begins with copy prefix in _alloExportFilename', () => {
      loadAlloModule('export_handlers_module.js');
      const eh = window.AlloModules.ExportHandlers;
      expect(typeof eh.getSlidesPreviewHTML).toBe('function');

      const src = fs.readFileSync(path.join(ROOT, 'export_handlers_module.js'), 'utf8');
      const fnMatch = src.match(/const _alloExportFilename = [\s\S]*?\n  \};/);
      expect(fnMatch).not.toBeNull();
      const _alloExportFilename = new Function(`${fnMatch[0]}; return _alloExportFilename;`)();
      const name = _alloExportFilename('<title>TEACHER COPY — Photosynthesis</title>', 'fallback.html');
      expect(name).toMatch(/TEACHER COPY - Photosynthesis/i);
    });

    it('renders dedicated Slides previews for image, word-search, faq, and study-guide, gates assessment math hints, and includes @media print', () => {
      loadAlloModule('export_handlers_module.js');
      const fakePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const items = [
        {
          id: 'img-1',
          type: 'image',
          topic: 'Plant Cell Diagram',
          data: { imageUrl: fakePng, alt: 'Labeled plant cell', caption: 'Chloroplasts absorb sunlight.' },
        },
        {
          id: 'img-bad',
          type: 'image',
          topic: 'Unsafe Image',
          data: { imageUrl: 'javascript:alert(1)', caption: 'Should block unsafe URI' },
        },
        {
          id: 'ws-1',
          type: 'word-search',
          topic: 'Ecosystem Vocab',
          data: { words: ['Producer', 'Consumer', 'Decomposer'], solutions: [{ word: 'Producer', row: 0, col: 0 }] },
        },
        {
          id: 'faq-1',
          type: 'faq',
          topic: 'Water Cycle FAQ',
          data: [{ question: 'What is evaporation?', answer: 'Liquid water turning into vapor.' }],
        },
        {
          id: 'sg-1',
          type: 'lesson-plan',
          topic: 'Photosynthesis Guide',
          studentProjection: true,
          config: { generationInputs: { mode: 'study' } },
          data: {
            title: 'Photosynthesis Study Guide',
            essentialQuestion: 'How do plants make food?',
            learningGoals: ['Explain light reactions'],
            assessmentIdeas: ['Teacher-only exit ticket key'],
          },
        },
        {
          id: 'lp-teacher',
          type: 'lesson-plan',
          topic: 'Private Teacher Plan',
          data: {
            title: 'Teacher Only Plan',
            essentialQuestion: 'Should not appear in student deck',
          },
        },
        {
          id: 'math-1',
          type: 'math',
          topic: 'Fractions',
          data: {
            problems: [
              { question: 'What is 1/2 + 1/4?', answer: '3/4', hint: 'Find a common denominator of 4', visualModel: '4-part bar' },
            ],
          },
        },
      ];

      const eh = window.AlloModules.ExportHandlers;
      const baseDeps = {
        sourceTopic: 'Science Unit',
        gradeLevel: '5th Grade',
        getExportableHistory: () => items,
        t: (k) => k,
      };

      const studentHtml = eh.getSlidesPreviewHTML({
        ...baseDeps,
        exportConfig: { audience: 'student', assessmentMode: false, includeTeacherKey: false },
      });
      expect(studentHtml).toContain('@media print');
      expect(studentHtml).toContain('page-break-after: always');
      // Image slide renders safe data URI and blocks javascript:
      expect(studentHtml).toContain(fakePng);
      expect(studentHtml).toContain('Chloroplasts absorb sunlight.');
      expect(studentHtml).not.toContain('javascript:alert(1)');
      // Word search renders word bank without leaking solution coordinates
      expect(studentHtml).toContain('Producer');
      expect(studentHtml).toContain('Decomposer');
      // FAQ renders Q&A in regular slides
      expect(studentHtml).toContain('What is evaporation?');
      expect(studentHtml).toContain('Liquid water turning into vapor.');
      // Study guide passes student filter, hides teacher assessmentIdeas, while teacher-only lesson plan stays excluded
      expect(studentHtml).toContain('Photosynthesis Study Guide');
      expect(studentHtml).toContain('How do plants make food?');
      expect(studentHtml).not.toContain('Teacher-only exit ticket key');
      expect(studentHtml).not.toContain('Teacher Only Plan');
      // Regular mode shows math hint
      expect(studentHtml).toContain('Find a common denominator of 4');

      // Assessment mode hides math hints, math visual models, and FAQ answers
      const assessHtml = eh.getSlidesPreviewHTML({
        ...baseDeps,
        exportConfig: { audience: 'student', assessmentMode: true, includeTeacherKey: false },
      });
      expect(assessHtml).not.toContain('Find a common denominator of 4');
      expect(assessHtml).not.toContain('4-part bar');
      expect(assessHtml).toContain('What is evaporation?');
      expect(assessHtml).not.toContain('Liquid water turning into vapor.');

      // Teacher mode includes assessmentIdeas on study guide
      const teacherHtml = eh.getSlidesPreviewHTML({
        ...baseDeps,
        exportConfig: { audience: 'teacher', assessmentMode: false, includeTeacherKey: true },
      });
      expect(teacherHtml).toContain('Teacher-only exit ticket key');
    });
  });

  describe('2. Submission Inbox UX (Take-Home Feedback, Print Button, Filters, Mismatch Badge & Bulk Cancel)', () => {
    it('renders Take-Home packet summary and Print/PDF button with unsafe-inline CSP in student feedback HTML', () => {
      loadAlloModule('view_submission_inbox_module.js');
      const inboxApi = window.AlloModules.SubmissionInbox;
      expect(inboxApi).toBeTruthy();
      expect(typeof inboxApi._meta?.buildStudentFeedbackHtml).toBe('function');

      const html = inboxApi._meta.buildStudentFeedbackHtml(
        {
          nickname: 'Maya',
          title: 'Phonics Week 3',
          responses: {},
          takeHome: {
            lessonTitle: 'Digraph Practice',
            items: [
              { word: 'ship', done: true, firstTry: true },
              { word: 'chat', done: true, firstTry: false },
              { word: 'thin', done: false, firstTry: false },
            ],
          },
        },
        {},
        {}
      );
      expect(html).toContain('Digraph Practice');
      expect(html).toContain('(Practice Packet)');
      expect(html).toContain('2 / 3');
      expect(html).toContain('ship');
      expect(html).toContain('Print / Save PDF');
      expect(html).toContain('window.print()');
      expect(html).toContain("script-src 'unsafe-inline'");

      const src = fs.readFileSync(path.join(ROOT, 'view_submission_inbox_module.js'), 'utf8');
      expect(src).toContain('data-si-queue-search');
      expect(src).toContain('data-si-queue-status-filter');
      expect(src).toContain('data-si-gradebook-class-filter');
      expect(src).toContain('data-si-cancel-bulk-grade');
      expect(src).toContain('data-si-name-mismatch');
      expect(src).toContain('si-pending-anchor-score');
      expect(src).toContain('si-pending-anchor-note');
    });

    it('renders gradebook class filter in live SubmissionInbox and scopes displayed rows by class', () => {
      loadAlloModule('view_submission_inbox_module.js');
      const SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
      expect(typeof SubmissionInbox).toBe('function');

      const gbKey = 'alloflow_offline_grades';
      localStorage.setItem(
        gbKey,
        JSON.stringify({
          g1: { nickname: 'Alice', docTitle: 'Cells', className: 'Period 1', gradedAt: new Date().toISOString(), grades: { q1: { score: 92 } }, responses: { q1: 'Mitochondria' } },
          g2: { nickname: 'Ben', docTitle: 'Cells', className: 'Period 2', gradedAt: new Date().toISOString(), grades: { q1: { score: 81 } }, responses: { q1: 'Nucleus' } },
        })
      );

      const { container, unmount } = mountElement(
        React.createElement(SubmissionInbox, {
          isOpen: true,
          onClose: vi.fn(),
          t: (k) => k,
          addToast: vi.fn(),
          callGemini: vi.fn(),
        })
      );

      const gbToggle = Array.from(container.querySelectorAll('button')).find((b) =>
        /Gradebook/i.test(b.textContent || '')
      );
      if (gbToggle) {
        act(() => {
          gbToggle.click();
        });
      }

      const classSelect = container.querySelector('[data-si-gradebook-class-filter="true"]');
      expect(classSelect).not.toBeNull();
      const optionTexts = Array.from(classSelect.querySelectorAll('option')).map((o) => o.textContent);
      expect(optionTexts.some((t) => /Period 1/.test(t))).toBe(true);
      expect(optionTexts.some((t) => /Period 2/.test(t))).toBe(true);

      act(() => {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(classSelect, 'Period 1');
        classSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(container.textContent).toContain('Alice');
      expect(container.textContent).not.toContain('Ben');

      unmount();
      localStorage.removeItem(gbKey);
    });
  });

  describe('3. UDL Read-Aloud & Dictation across Quiz, Timeline, Brainstorm, Anchor Charts & Organizers', () => {
    it('renders Listen button on Timeline step cards and invokes AlloSpeechPlayer.speak', () => {
      loadAlloModule('view_timeline_module.js');
      const speak = vi.fn();
      window.AlloSpeechPlayer = { speak };

      const { container, unmount } = mountElement(
        React.createElement(window.AlloModules.TimelineView, {
          generatedContent: {
            id: 'tl-w8',
            type: 'timeline',
            data: { items: [{ date: '1776', event: 'Declaration signed' }] },
          },
          isTeacherMode: true,
          isEditingTimeline: false,
          isTimelineGame: false,
          dismissedVerifications: new Set(),
          setDismissedVerifications: vi.fn(),
          t: (k) => k,
        })
      );

      const listenBtn = container.querySelector('[data-timeline-listen="0"]');
      expect(listenBtn).not.toBeNull();
      act(() => {
        listenBtn.click();
      });
      expect(speak).toHaveBeenCalledWith('1776. Declaration signed');
      unmount();
    });

    it('renders Listen buttons and DictationButton on Brainstorm cards (standard, discussion, jigsaw)', () => {
      loadAlloModule('view_brainstorm_module.js');
      const speak = vi.fn();
      window.AlloSpeechPlayer = { speak };
      const handleStudentInput = vi.fn();
      window.AlloDictationButton = ({ onTranscript, label }) =>
        React.createElement('button', {
          type: 'button',
          'data-mock-dictation': 'true',
          'aria-label': label || 'Dictate',
          onClick: () => onTranscript('My spoken idea'),
        }, 'Dictate');

      const { container, unmount } = mountElement(
        React.createElement(window.AlloModules.BrainstormView, {
          generatedContent: {
            id: 'bs-w8',
            type: 'brainstorm',
            data: [
              { kind: 'idea', title: 'Solar Oven', description: 'Build with cardboard', connection: 'Thermal energy' },
              {
                kind: 'discussion',
                title: 'Energy Debate',
                protocol: 'think-pair-share',
                openingQuestion: 'Which source is cleanest?',
                questionSets: [{ depth: 'literal', questions: ['Name two renewables.'] }],
              },
              {
                kind: 'jigsaw',
                title: 'Biome Jigsaw',
                homeGroupTask: 'Compare rainfall.',
                chunks: [{ label: 'Desert', expertPacket: 'Very dry.' }],
              },
            ],
          },
          isTeacherMode: false,
          isEditingBrainstorm: false,
          renderFormattedText: (s) => s,
          studentInputs: {},
          handleStudentInput,
          t: (k) => k,
        })
      );

      const stdListen = container.querySelector('[data-brainstorm-listen="0"]');
      const discListen = container.querySelector('[data-brainstorm-listen="discussion"]');
      const jigListen = container.querySelector('[data-brainstorm-listen="jigsaw"]');
      expect(stdListen).not.toBeNull();
      expect(discListen).not.toBeNull();
      expect(jigListen).not.toBeNull();

      act(() => {
        stdListen.click();
      });
      expect(speak).toHaveBeenCalledWith('Solar Oven. Build with cardboard. Thermal energy');

      const dictBtn = container.querySelector('[data-mock-dictation="true"]');
      expect(dictBtn).not.toBeNull();
      act(() => {
        dictBtn.click();
      });
      expect(handleStudentInput).toHaveBeenCalledWith('bs-w8', expect.stringContaining('activity:'), 'My spoken idea');
      unmount();
    });

    it('renders Listen & Dictation on Anchor Charts and NEVER speaks hidden teacher bullets in interactive student mode', () => {
      loadAlloModule('anchor_charts_module.js');
      const speak = vi.fn();
      window.AlloSpeechPlayer = { speak };
      const handleStudentInput = vi.fn();
      window.AlloDictationButton = ({ onTranscript, label }) =>
        React.createElement('button', {
          type: 'button',
          'data-mock-dictation': 'true',
          'aria-label': label || 'Dictate',
          onClick: () => onTranscript('Spoken student answer'),
        }, 'Dictate');

      const generatedContent = {
        id: 'ac-w8',
        type: 'anchor-chart',
        data: {
          chartType: 'reference',
          title: 'States of Matter',
          sections: [{ id: 'sec-0', label: 'Solids', bullets: ['SECRET TEACHER BULLET: fixed shape'] }],
          interactive: { armed: true, rubric: '' },
        },
      };

      // 1. Read mode (teacher): speaks label AND bullets
      const readMount = mountElement(
        React.createElement(window.AlloModules.AnchorChartView, {
          generatedContent,
          isTeacherMode: true,
          t: (k) => k,
        })
      );
      const readListen = readMount.container.querySelector('[data-ac-listen="0"]');
      expect(readListen).not.toBeNull();
      act(() => {
        readListen.click();
      });
      expect(speak).toHaveBeenCalledWith('Solids. SECRET TEACHER BULLET: fixed shape');
      readMount.unmount();

      // 2. Interactive student mode: speaks ONLY label (never hidden teacher bullets!) and provides Dictation
      speak.mockClear();
      const handleNoteUpdate = vi.fn();
      const studentMount = mountElement(
        React.createElement(window.AlloModules.AnchorChartView, {
          generatedContent,
          isTeacherMode: false,
          handleNoteUpdate,
          t: (k) => k,
        })
      );
      const studentListen = studentMount.container.querySelector('[data-ac-listen="0"]');
      expect(studentListen).not.toBeNull();
      act(() => {
        studentListen.click();
      });
      expect(speak).toHaveBeenCalledWith('Solids');
      expect(speak.mock.calls[0][0]).not.toContain('SECRET TEACHER BULLET');

      const dictBtn = studentMount.container.querySelector('[data-mock-dictation="true"]');
      expect(dictBtn).not.toBeNull();
      act(() => {
        dictBtn.click();
      });
      expect(handleNoteUpdate).toHaveBeenCalledWith('studentAnswers', expect.any(Function));
      const updater = handleNoteUpdate.mock.calls[0][1];
      expect(JSON.stringify(updater({}))).toContain('Spoken student answer');
      studentMount.unmount();
    });

    it('renders Listen button on Quiz MCQ & Freeform cards and Dictation on reasoning/transfer inputs', () => {
      loadAlloModule('view_quiz_module.js');
      const speak = vi.fn();
      window.AlloSpeechPlayer = { speak };
      window.AlloDictationButton = ({ onTranscript, label }) =>
        React.createElement('button', {
          type: 'button',
          'data-mock-dictation': 'true',
          'aria-label': label || 'Dictate',
          onClick: () => onTranscript('Spoken explanation'),
        }, 'Dictate');

      const { container, unmount } = mountElement(
        React.createElement(window.AlloModules.QuizView, {
          generatedContent: {
            id: 'qz-w8',
            type: 'quiz',
            data: {
              questions: [
                {
                  type: 'mcq',
                  question: 'Which gas do plants absorb?',
                  options: ['Carbon dioxide', 'Helium'],
                  correctAnswer: 'Carbon dioxide',
                },
                {
                  type: 'short-answer',
                  question: 'Explain why sunlight matters.',
                },
              ],
            },
          },
          isTeacherMode: false,
          isEditingQuiz: false,
          isPresentationMode: false,
          isFactChecking: {},
          isImprovingDistractor: {},
          renderFormattedText: (s) => s,
          formatInlineText: (s) => s,
          getRows: () => 2,
          t: (k) => k,
        })
      );

      const mcqListen = container.querySelector('[data-quiz-listen="0"]');
      const freeformListen = container.querySelector('[data-quiz-listen="1"]');
      expect(mcqListen).not.toBeNull();
      expect(freeformListen).not.toBeNull();

      act(() => {
        mcqListen.click();
      });
      expect(speak).toHaveBeenCalledWith('Which gas do plants absorb?. A. Carbon dioxide. B. Helium');

      speak.mockClear();
      act(() => {
        freeformListen.click();
      });
      expect(speak).toHaveBeenCalledWith('Explain why sunlight matters.');
      unmount();

      const quizSrc = fs.readFileSync(path.join(ROOT, 'view_quiz_module.js'), 'utf8');
      expect(quizSrc).toContain('Dictate explanation');
      expect(quizSrc).toContain('Dictate new example');
    });

    it('renders Listen button on Organizer Outline & BranchItem and wires DictationButton into OrganizerReflectionBoard', () => {
      loadAlloModule('view_renderers_module.js');
      const speak = vi.fn();
      window.AlloSpeechPlayer = { speak };

      // Test Outline view
      const outlineEl = window.AlloModules.ViewRenderers.renderOutlineContent({
        ErrorBoundary: ({ children }) => children,
        KeyConceptMapView: () => null,
        VennGame: () => null,
        generatedContent: {
          id: 'out-w8',
          type: 'outline',
          data: {
            type: 'Outline',
            main: 'Ecosystems',
            branches: [{ title: 'Producers', items: ['Plants', 'Algae'] }],
          },
        },
        isTeacherMode: false,
        isEditingOutline: false,
        leveledTextLanguage: 'English',
        t: (k) => k,
      });

      const outlineMount = mountElement(outlineEl);
      const outlineListen = outlineMount.container.querySelector('[data-outline-branch-listen="0"]');
      expect(outlineListen).not.toBeNull();
      act(() => {
        outlineListen.click();
      });
      expect(speak).toHaveBeenCalledWith('Producers. Plants. Algae');
      outlineMount.unmount();

      // Test default BranchItem view (e.g., Mind Map)
      speak.mockClear();
      const mapEl = window.AlloModules.ViewRenderers.renderOutlineContent({
        ErrorBoundary: ({ children }) => children,
        KeyConceptMapView: () => null,
        VennGame: () => null,
        generatedContent: {
          id: 'map-w8',
          type: 'outline',
          data: {
            type: 'Mind Map',
            main: 'Water Cycle',
            branches: [{ title: 'Condensation', items: ['Clouds form', 'Water cools'] }],
          },
        },
        isTeacherMode: false,
        isEditingOutline: false,
        leveledTextLanguage: 'English',
        t: (k) => k,
      });

      const mapMount = mountElement(mapEl);
      const mapListen = mapMount.container.querySelector('[data-outline-branch-listen="0"]');
      expect(mapListen).not.toBeNull();
      act(() => {
        mapListen.click();
      });
      expect(speak).toHaveBeenCalledWith('Condensation. Clouds form. Water cools');
      mapMount.unmount();

      const renderersSrc = fs.readFileSync(path.join(ROOT, 'view_renderers_module.js'), 'utf8');
      expect(renderersSrc).toContain('AlloDictationButton');
      expect(renderersSrc).toContain('reflection-field-');
    });
  });
});
