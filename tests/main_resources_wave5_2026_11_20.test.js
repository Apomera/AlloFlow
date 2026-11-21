// Wave 5 regression suite (2026-11-20): P0 security, privacy, and data-integrity fixes
// across view_header, session_transport, export_handlers, view_submission_inbox, and view_quiz.
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
let ST;
let EH;
let InboxTest;

beforeAll(() => {
  React = require(path.join(modulesDir, 'react'));
  ReactDOMClient = require(path.join(modulesDir, 'react-dom/client'));
  ({ act } = require(path.join(modulesDir, 'react-dom/test-utils')));
  global.React = React;
  window.React = React;

  loadAlloModule('session_transport_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('view_submission_inbox_module.js');
  ST = window.AlloModules.SessionTransport;
  EH = window.AlloModules.ExportHandlers;
  InboxTest = window.AlloModules.SubmissionInbox._meta;
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Wave 5 — P0 Security, Privacy & Data Integrity', () => {
  describe('1. Educator Access Gate in view_header', () => {
    it('blocks direct switch to Educator when _alloEducatorAccessCodeRequired() is true even without APP_CONFIG._cfg_validation_key', () => {
      const headerBuilt = fs.readFileSync(path.join(ROOT, 'view_header_module.js'), 'utf8');
      const start = headerBuilt.indexOf('const toggleViewMode = () => {');
      expect(start).toBeGreaterThan(-1);
      const end = headerBuilt.indexOf('};', start);
      const fnSource = headerBuilt.slice(start, end + 2);

      const makeToggle = ({ isTeacherMode, reqFn, cfg }) => {
        const setPendingRole = vi.fn();
        const setIsGateOpen = vi.fn();
        const setIsTeacherMode = vi.fn();
        const win = reqFn ? { _alloEducatorAccessCodeRequired: reqFn } : {};
        // eslint-disable-next-line no-new-func
        const toggle = new Function(
          'window', 'APP_CONFIG', 'isTeacherMode', 'setPendingRole', 'setIsGateOpen', 'setIsTeacherMode',
          fnSource + '\nreturn toggleViewMode;'
        )(win, cfg || {}, isTeacherMode, setPendingRole, setIsGateOpen, setIsTeacherMode);
        toggle();
        return { setPendingRole, setIsGateOpen, setIsTeacherMode };
      };

      // LocalStorage-configured code without legacy APP_CONFIG._cfg_validation_key MUST trigger gate
      const blocked = makeToggle({ isTeacherMode: false, reqFn: () => true, cfg: {} });
      expect(blocked.setIsTeacherMode).not.toHaveBeenCalled();
      expect(blocked.setPendingRole).toHaveBeenCalledWith('toggle_view');
      expect(blocked.setIsGateOpen).toHaveBeenCalledWith(true);

      // Unconfigured device allows direct switch
      const allowed = makeToggle({ isTeacherMode: false, reqFn: () => false, cfg: {} });
      expect(allowed.setIsGateOpen).not.toHaveBeenCalled();
      expect(allowed.setIsTeacherMode).toHaveBeenCalledWith(true);
    });
  });

  describe('2. SessionTransport — Multilingual Study Guide, Source-Check & Mailbox Pack Cycle', () => {
    it('preserves home-language translation keys in student study guides while stripping teacher fields', () => {
      const lessonPlan = {
        id: 'lp-1',
        type: 'lesson-plan',
        title: 'Photosynthesis',
        config: { generationInputs: { mode: 'study' } },
        data: {
          title: 'Photosynthesis',
          essentialQuestion: { en: 'How do plants make food?', es: '¿Cómo producen alimento las plantas?', 'zh-CN': '植物如何制造食物？' },
          objectives: [{ text: 'Explain chlorophyll', es: 'Explicar la clorofila', ar: 'اشرح الكلوروفيل' }],
          extensions: [{ title: 'Leaf Lab', es: 'Laboratorio de hojas', guide: 'SECRET TEACHER GUIDE' }],
          assessmentIdeas: ['SECRET ASSESSMENT IDEA'],
          teacherNotes: 'SECRET TEACHER NOTES',
        },
      };
      const projected = ST.projectStudentGuide(lessonPlan);
      expect(projected).toBeTruthy();
      expect(projected.data.essentialQuestion.es).toBe('¿Cómo producen alimento las plantas?');
      expect(projected.data.essentialQuestion['zh-CN']).toBe('植物如何制造食物？');
      expect(projected.data.objectives[0].es).toBe('Explicar la clorofila');
      expect(projected.data.objectives[0].ar).toBe('اشرح الكلوروفيل');
      expect(projected.data.extensions[0].es).toBe('Laboratorio de hojas');
      expect(JSON.stringify(projected)).not.toContain('SECRET TEACHER GUIDE');
      expect(JSON.stringify(projected)).not.toContain('SECRET ASSESSMENT IDEA');
      expect(JSON.stringify(projected)).not.toContain('SECRET TEACHER NOTES');
    });

    it('strips educator metadata fields from source-check projections while preserving passage & reading data', () => {
      const srcCheck = {
        id: 'sc-1',
        type: 'analysis',
        title: 'Source Check',
        data: {
          originalText: 'Evaporation heats water.',
          concepts: ['evaporation'],
          readingLevel: { range: 'Grade 5' },
          summary: 'SECRET TEACHER SUMMARY',
          standards: ['NGSS-5'],
          contentReview: { note: 'SECRET REVIEW' },
          factCheck: { verdict: 'ok' },
          readability: { score: 65 },
          teacherNotes: 'SECRET NOTE',
          pedagogicalNotes: 'SECRET PEDAGOGY',
        },
      };
      const [projected] = ST.studentSafeResources([srcCheck], ['lesson-plan']);
      expect(projected).toBeTruthy();
      expect(projected.data.originalText).toBe('Evaporation heats water.');
      expect(projected.data.concepts).toEqual(['evaporation']);
      for (const field of ['summary', 'standards', 'contentReview', 'factCheck', 'readability', 'teacherNotes', 'pedagogicalNotes']) {
        expect(projected.data[field]).toBeUndefined();
      }
    });

    it('does not advance hostedFp when hostPack returns falsy so late joiners get a retry', async () => {
      const seen = {};
      let hostedFp = null;
      const item = { id: 'new-1', type: 'glossary', data: { terms: [{ term: 'Cell', definition: 'Unit of life' }] } };
      const res1 = await ST.runMailboxPackCycle([item], {
        seen,
        fingerprint: (it) => 'fp-' + it.id,
        packFingerprint: (list) => 'pack-' + list.length,
        pushItem: async () => {},
        getHostedFp: () => hostedFp,
        setHostedFp: (fp) => { hostedFp = fp; },
        hostPack: async () => null, // hosting returns falsy
        publishPackRef: async () => {},
      });
      expect(res1.hosted).toBe(false);
      expect(hostedFp).toBeNull(); // NOT marked as hosted when hostPack returned falsy

      // Second cycle succeeds when hostPack returns a real identity
      const publishRef = vi.fn(async () => {});
      const res2 = await ST.runMailboxPackCycle([item], {
        seen,
        fingerprint: (it) => 'fp-' + it.id,
        packFingerprint: (list) => 'pack-' + list.length,
        pushItem: async () => {},
        getHostedFp: () => hostedFp,
        setHostedFp: (fp) => { hostedFp = fp; },
        hostPack: async () => ({ url: 'https://example.com/pack.json', hash: 'abc' }),
        publishPackRef: publishRef,
      });
      expect(res2.hosted).toBe(true);
      expect(res2.referencePublished).toBe(true);
      expect(hostedFp).toBe('pack-1');
      expect(publishRef).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. ExportHandlers — Answer Scrub, Slides Venn/KWL, Copy Mode, Print Gesture & A11y Inspector', () => {
    it('scrubs expanded answer-key and teacher fields in summarizeResourceText when hideAnswers is true', () => {
      const item = {
        id: 'q-9',
        type: 'quiz',
        data: {
          question: 'Which organelle makes ATP?',
          correct: 'Mitochondria',
          correctOption: 2,
          isCorrect: true,
          acceptableAnswers: ['mitochondrion'],
          acceptableUnits: ['joules'],
          tolerance: 0.5,
          verifiedAnswer: 'Mitochondria',
          finalAnswer: 'Mitochondria',
          intentionallyWrongIndex: 1,
          orderingPrinciple: 'Chronological',
          correctSequence: ['A', 'B'],
          teacherGuide: 'Walk students through respiration',
          facilitationNotes: 'Check misconceptions',
          teacherScript: 'Say this aloud',
          categoryId: 'cat-1',
          zone: 'left',
          targetZone: 'shared',
          hint: 'Powerhouse of the cell',
        },
      };
      const out = EH.summarizeResourceText(item, { hideAnswers: true });
      const joined = Array.isArray(out) ? out.join('\n') : String(out);
      expect(joined).toContain('Which organelle makes ATP?');
      for (const leaked of ['Mitochondria', 'mitochondrion', 'joules', 'Chronological', 'Walk students', 'Check misconceptions', 'Say this aloud', 'cat-1', 'shared', 'Powerhouse']) {
        expect(joined).not.toContain(leaked);
      }
    });

    it('hides grouped answers in Venn branches and omits teacherExample branches in Slides preview when showKeys is false', () => {
      const vennItem = {
        id: 'v-1',
        type: 'venn-diagram',
        title: 'Mitosis vs Meiosis',
        data: {
          title: 'Mitosis vs Meiosis',
          branches: [
            { title: 'Mitosis', items: ['Two diploid cells'] },
            { title: 'Shared', items: ['DNA replication'] },
            { title: 'Meiosis', items: ['Four haploid gametes'] },
          ],
        },
      };
      const kwlItem = {
        id: 'kwl-1',
        type: 'graphic-organizer',
        title: 'KWL Chart',
        data: {
          title: 'KWL Chart',
          branches: [
            { title: 'What I Know', items: ['Water boils at 100C'] },
            { title: 'Teacher Exemplar', teacherExample: true, items: ['SECRET EXEMPLAR ANSWER'] },
          ],
        },
      };
      const html = EH.getSlidesPreviewHTML({
        getExportableHistory: () => [vennItem, kwlItem],
        sourceTopic: 'Cell Division',
        exportConfig: { includeTeacherKey: false, audience: 'student' },
      });
      expect(html).toContain('Items to sort');
      expect(html).toContain('Two diploid cells');
      // Items should appear AFTER "Items to sort" rather than under "Mitosis" before "Shared"
      const idxShared = html.indexOf('Shared');
      const idxBank = html.indexOf('Items to sort');
      const idxTwoDiploid = html.indexOf('Two diploid cells');
      expect(idxBank).toBeGreaterThan(idxShared);
      expect(idxTwoDiploid).toBeGreaterThan(idxBank);
      expect(html).not.toContain('SECRET EXEMPLAR ANSWER');
    });

    it('omits teacher-only sections when copying Study Guide / Family Guide to clipboard', async () => {
      let copied = '';
      const origClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn(async (txt) => { copied = txt; }) },
      });
      const plan = {
        type: 'lesson-plan',
        config: { sourceTopic: 'Fractions', gradeLevel: '4' },
        data: {
          essentialQuestion: 'How do fractions compare?',
          objectives: ['Compare halves and quarters'],
          assessmentIdeas: ['TEACHER RUBRIC SECRET'],
          extensions: [{ title: 'Fraction Kitchen', description: 'Measure cups', guide: 'TEACHER EXTENSION GUIDE SECRET' }],
          recommendedStemTools: [{ id: 'fraction-lab', rationale: 'TEACHER STEM RATIONALE SECRET' }],
        },
      };
      try {
        await EH.handleCopyToClipboard({ generatedContent: plan, isIndependentMode: true, addToast: vi.fn() });
        expect(copied).toContain('Study Guide');
        expect(copied).toContain('Fraction Kitchen');
        expect(copied).not.toContain('TEACHER RUBRIC SECRET');
        expect(copied).not.toContain('TEACHER EXTENSION GUIDE SECRET');
        expect(copied).not.toContain('TEACHER STEM RATIONALE SECRET');

        copied = '';
        await EH.handleCopyToClipboard({ generatedContent: plan, isParentMode: true, addToast: vi.fn() });
        expect(copied).toContain('Family Guide');
        expect(copied).not.toContain('TEACHER RUBRIC SECRET');
        expect(copied).not.toContain('TEACHER EXTENSION GUIDE SECRET');

        copied = '';
        await EH.handleCopyToClipboard({ generatedContent: plan, addToast: vi.fn() });
        expect(copied).toContain('Lesson Plan');
        expect(copied).toContain('TEACHER RUBRIC SECRET');
        expect(copied).toContain('TEACHER EXTENSION GUIDE SECRET');
      } finally {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: origClipboard });
      }
    });

    it('opens print popup synchronously before async locale bundle loading and safely handles closed printWindow', async () => {
      const events = [];
      let resolveLocale;
      const origPreAwait = window.AlloI18n && window.AlloI18n.ensureLanguage;
      const origI18n = window.AlloI18n;
      window.AlloI18n = {
        ensureLanguage: () => new Promise((r) => {
          events.push('await-locale');
          resolveLocale = r;
        }),
      };
      const fakeWin = {
        closed: false,
        document: { write: vi.fn(), close: vi.fn(), readyState: 'complete', images: [] },
        focus: vi.fn(),
        print: vi.fn(() => { events.push('print'); }),
        close: vi.fn(() => { fakeWin.closed = true; }),
      };
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {
        events.push('window.open');
        return fakeWin;
      });
      try {
        const promise = EH.handleExport('print', {
          _docPipeline: true,
          addToast: vi.fn(),
          t: (k) => k,
          generateFullPackHTML: () => '<html><body><p>Printable worksheet</p></body></html>',
          getExportableHistory: () => [{ id: '1', type: 'text' }],
          getSkippedResources: () => [],
          sourceTopic: 'Test',
          exportConfig: { language: 'es' },
        });
        // window.open MUST have already happened synchronously before locale resolves
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(events[0]).toBe('window.open');
        if (resolveLocale) resolveLocale();
        await promise;
        expect(fakeWin.print).toHaveBeenCalledTimes(1);
      } finally {
        window.AlloI18n = origI18n;
        if (origI18n && origPreAwait) origI18n.ensureLanguage = origPreAwait;
      }
    });

    it('keeps form inputs valid and cleanly unwraps images when toggling A11y Inspector on and off', () => {
      const doc = document.implementation.createHTMLDocument('preview');
      doc.body.innerHTML = '<div><h1 id="h">Title</h1><img id="pic" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Chart"><label for="ans">Answer</label><input id="ans" type="text" /><textarea id="ta"></textarea><select id="sel"><option>A</option></select></div>';
      const ref = { current: { contentDocument: doc } };

      EH.applyA11yInspector({ exportPreviewRef: ref, enabled: true });
      // Inputs/textareas/selects MUST NOT have child badge nodes
      expect(doc.getElementById('ans').children.length).toBe(0);
      expect(doc.getElementById('ta').children.length).toBe(0);
      expect(doc.getElementById('sel').querySelectorAll('.a11y-inspect-badge').length).toBe(0);
      expect(doc.getElementById('ans').nextElementSibling.classList.contains('a11y-inspect-badge')).toBe(true);
      // Image wrapped with marked span
      expect(doc.querySelectorAll('[data-allo-a11y-img-wrap]').length).toBe(1);

      // Toggle off restores exact hierarchy and removes injected inline position
      EH.applyA11yInspector({ exportPreviewRef: ref, enabled: false });
      expect(doc.querySelectorAll('.a11y-inspect-badge').length).toBe(0);
      expect(doc.querySelectorAll('[data-allo-a11y-img-wrap]').length).toBe(0);
      expect(doc.getElementById('pic').parentElement.tagName).toBe('DIV');
      expect(doc.getElementById('h').style.position).toBe('');
      expect(doc.getElementById('h').hasAttribute('data-allo-a11y-pos')).toBe(false);
    });
  });

  describe('4. SubmissionInbox — Error Scores, CSP Headers, Import Hardening, Queue Lock & Class Key', () => {
    it('excludes status:"error" grades from averages in feedback HTML, gradebook summary, and LMS CSV', () => {
      const grades = {
        q1: { score: 90, status: 'correct', feedback: 'Great' },
        q2: { score: 0, status: 'error', feedback: 'API timeout' },
      };
      const row = { nickname: 'Alex', docTitle: 'Lab', payload: { nickname: 'Alex', docTitle: 'Lab', responses: { q1: 'A', q2: 'B' } } };

      const fbHtml = InboxTest.buildStudentFeedbackHtml(row, grades, null);
      expect(fbHtml).toContain('90/100');
      expect(fbHtml).not.toContain('45/100');
      expect(fbHtml).toContain('Grading error');
      expect(fbHtml).toContain('Content-Security-Policy');
      expect(fbHtml).toContain('name="referrer" content="no-referrer"');

      const batchHtml = InboxTest.buildBatchFeedbackHtml([{ row, rowGrades: grades }], 'Class Packet');
      expect(batchHtml).toContain('Content-Security-Policy');
      expect(batchHtml).toContain('name="referrer" content="no-referrer"');
      expect(batchHtml).toContain('90/100');

      const inboxBuilt = fs.readFileSync(path.join(ROOT, 'view_submission_inbox_module.js'), 'utf8');
      const gbStart = inboxBuilt.indexOf('function siBuildGradebookSummary(');
      const gbEnd = inboxBuilt.indexOf('function siCsvCell(', gbStart);
      // eslint-disable-next-line no-new-func
      const buildGradebookSummary = new Function(inboxBuilt.slice(gbStart, gbEnd) + '\nreturn siBuildGradebookSummary;')();
      const gb = buildGradebookSummary([{ nickname: 'Alex', className: 'P1', grades }], true);
      expect(gb.students[0].avgOfAvgs).toBe(90);

      const csvRes = InboxTest.buildLmsGradebookCsv([{ nickname: 'Alex', className: 'P1', docTitle: 'Lab', grades }], 'alloflow');
      expect(csvRes.csv).toContain(',90,');
      expect(csvRes.csv).not.toContain(',45,');
      // Item column for status:"error" must be blank, not 0
      expect(csvRes.csv.split('\n')[1]).toMatch(/,90,$/);
    });

    it('enforces 25 MB size cap, safe JSON parsing, queue mutation lock, and className-scoped gradebook keys in source', () => {
      const src = fs.readFileSync(path.join(ROOT, 'view_submission_inbox_source.jsx'), 'utf8');
      expect(src).toContain('SI_MAX_SUBMISSION_FILE_BYTES = 25 * 1024 * 1024');
      expect(src).toContain("k === '__proto__' || k === 'constructor' || k === 'prototype'");
      expect(src).not.toContain(".replace(/\\\\u003c/g, '<')");
      expect(src).toContain('const queueLocked = Boolean(decryptingAll || bulkGrading || gradingRow !== null)');
      expect(src).toContain('const submissionKey = className ? (className + \'|\' + legacyKey) : legacyKey');
    });
  });

  describe('5. ViewQuiz — Preserve Written Draft on Retry & Smooth Sequence-Sense Order Input', () => {
    it('preserves written response draft on Try again (except idk) and buffers sequence-sense order input', () => {
      const quizSrc = fs.readFileSync(path.join(ROOT, 'view_quiz_source.jsx'), 'utf8');
      expect(quizSrc).toContain("if (grade.status === 'idk') setResponse('');");
      expect(quizSrc).not.toContain("if (grade.status !== 'submitted') setResponse('');");
      expect(quizSrc).toContain('function AssessmentSequenceOrderInput(');
      expect(quizSrc).toContain('focusedRef.current = true');
    });
  });
});
