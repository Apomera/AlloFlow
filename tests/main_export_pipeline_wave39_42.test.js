// Verification suite for Waves 39-42 of the main export, alt-format, grading,
// submission inbox, and delivery pipeline + 4-mirror SHA-256 parity.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let pipeline;
let previewHelpers;
let auditHelpers;
let quizAgg;
let inboxMeta;
let SubmissionInbox;
let StorybookExportModal;
let HomeworkQrDialogView;
let AssignmentCenterModal;

const activeRoots = [];
const activeDoms = [];

function parseDoc(html) {
  return new DOMParser().parseFromString(String(html || ''), 'text/html');
}

function parseXml(xml) {
  const noDoctype = String(xml || '').replace(/<!DOCTYPE[^>]*>/i, '');
  const doc = new DOMParser().parseFromString(noDoctype, 'application/xml');
  const err = doc.querySelector('parsererror');
  return { doc, wellFormed: !err, err: err ? err.textContent : '' };
}

function createPipeline(overrides = {}) {
  const state = {
    history: [],
    generatedContent: null,
    selectedResourceId: null,
    sourceTopic: 'Cellular Energy',
    gradeLevel: 'Grade 7',
    leveledTextLanguage: 'English',
    outputLanguage: 'English',
    targetStandards: [],
    userNotes: '',
    teacherNotes: '',
    includeTranslation: false,
    translationLanguage: '',
    exportConfig: {
      audience: 'student',
      includeTeacherKey: false,
      annotations: [],
    },
    ...(overrides.state || {}),
  };
  return window.AlloModules.createDocPipeline({
    callGemini: vi.fn(async () => ''),
    callGeminiVision: vi.fn(async () => ''),
    callImagen: vi.fn(async () => ''),
    addToast: vi.fn(),
    t: (_k, fallback) => (typeof fallback === 'string' ? fallback : _k),
    isRtlLang: (lang) => /^(?:arabic|hebrew|farsi|urdu|ar|he|fa|ur)\b/i.test(String(lang || '')),
    updateExportPreview: vi.fn(),
    getDefaultTitle: (type) => String(type || 'Resource'),
    state,
    ...overrides,
  });
}

async function bootPackDOM(html, { url = 'https://example.test/pack.html?nickname=TestLearner', beforeParse } = {}) {
  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    beforeParse(win) {
      if (typeof beforeParse === 'function') beforeParse(win);
    },
  });
  activeDoms.push(dom);
  await new Promise((r) => {
    if (dom.window.document.readyState === 'complete') dom.window.setTimeout(r, 60);
    else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(r, 60), { once: true });
  });
  return { dom, win: dom.window, doc: dom.window.document };
}

function createMockJSZipClass() {
  const instances = [];
  class MockJSZip {
    constructor() {
      this.files = {};
      instances.push(this);
    }
    file(name, data) {
      this.files[name] = data;
      return this;
    }
    folder(prefix) {
      const self = this;
      const clean = String(prefix || '').replace(/\/+$/, '');
      return {
        file(name, data) {
          self.files[`${clean}/${name}`] = data;
          return this;
        },
      };
    }
    async generateAsync({ type = 'blob', mimeType = 'application/zip' } = {}) {
      const payload = JSON.stringify(this.files);
      if (type === 'string') return payload;
      return new Blob([payload], { type: mimeType });
    }
  }
  MockJSZip.instances = instances;
  return MockJSZip;
}

function setupExporter(liveOverrides = {}) {
  const captured = { blobs: [], zips: null, toasts: [], downloads: [], slides: [] };
  const MockJSZip = createMockJSZipClass();
  captured.zips = MockJSZip.instances;
  vi.stubGlobal('JSZip', MockJSZip);
  window.JSZip = MockJSZip;
  window.PptxGenJS = class MockPptxGenJS {
    constructor() {
      this.layout = 'LAYOUT_16x9';
      this.ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' };
    }
    defineSlideMaster() {}
    addSlide() {
      const s = {
        texts: [],
        shapes: [],
        tables: [],
        notes: [],
        addText(t, opts) { this.texts.push({ raw: typeof t === 'string' ? t : JSON.stringify(t), opts: opts || {} }); },
        addShape(type, opts) { this.shapes.push({ type, opts: opts || {} }); },
        addTable(rows, opts) { this.tables.push({ rows, opts: opts || {} }); },
        addNotes(n) { this.notes.push(String(n || '')); },
        addImage() {},
      };
      captured.slides.push(s);
      return s;
    }
    writeFile({ fileName }) {
      captured.downloads.push(fileName);
      return Promise.resolve(fileName);
    }
  };
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    captured.blobs.push(blob);
    return `blob:mock-${captured.blobs.length}`;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function onClick() {
    captured.downloads.push(this.download || '');
  });

  const defaultLive = {
    history: [],
    generatedContent: null,
    sourceTopic: 'Cellular Energy',
    gradeLevel: 'Grade 7',
    language: 'English',
    leveledTextLanguage: 'English',
    outputLanguage: 'English',
    currentUiLanguage: 'English',
    studentResponses: {},
    exportConfig: { audience: 'student', includeTeacherKey: false },
    addToast: (msg, kind) => captured.toasts.push({ msg, kind }),
    t: (_k, fb) => (typeof fb === 'string' ? fb : _k),
    getDefaultTitle: (tp) => String(tp || 'Resource'),
    generateResourceHTML: (it) => `<section data-res="${it?.id || ''}"><h2>${it?.title || it?.type || ''}</h2></section>`,
    generateFullPackHTML: (items) => `<!DOCTYPE html><html><body>${(items || []).map((i) => `<section>${i?.title || i?.type}</section>`).join('')}</body></html>`,
    ...liveOverrides,
  };
  const exporter = window.AlloModules.createExport({
    liveRef: { current: defaultLive },
    warnLog: () => {},
    debugLog: () => {},
    escapeXml: (v) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;'),
    generateUUID: (() => {
      let seq = 0;
      return () => `uuid-${++seq}`;
    })(),
  });
  return { exporter, captured };
}

function loadPurePreviewHelpers() {
  const epSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const syncCode = epSrc.slice(
    epSrc.indexOf('function _builderSyncLiveFormState('),
    epSrc.indexOf('function _builderRefreshFinalDocumentFields(')
  );
  const removeTeacherCode = epSrc.slice(
    epSrc.indexOf('function _removeStudentPackageTeacherSections('),
    epSrc.indexOf('function _guidedStudentDocumentSnapshot(')
  );
  const formQuizStart = epSrc.indexOf('function _formSeededOrder(');
  const formQuizEnd = epSrc.indexOf('\n}', epSrc.indexOf('function _alloFormQuizzesFromHistory(') + 20) + 2;
  const formQuizCode = epSrc.slice(formQuizStart, formQuizEnd);

  return new Function(
    removeTeacherCode + '\n' + syncCode + '\n' + formQuizCode +
    '\nreturn { _builderSanitizeAssessmentRoot, _removeStudentPackageTeacherSections, _formSeededOrder, _alloQuizToFormItems };'
  )();
}

function loadAuditHelpers() {
  const src = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const structuredStart = src.indexOf('function _htmlToStructuredText(html, markdown) {');
  const docxStart = src.indexOf('function _htmlToDocxSpec(html) {');
  const brfEnd = src.indexOf('\n// _buildDocxBlobFromSpec:', docxStart);
  const speechStart = src.indexOf('const _ALLO_TEACHER_ONLY_SEL =');
  const speechEnd = src.indexOf('function _audioReadyText(', speechStart);
  if ([structuredStart, docxStart, brfEnd, speechStart, speechEnd].some((i) => i < 0)) {
    throw new Error('Extraction markers missing in view_pdf_audit_source.jsx');
  }
  const standaloneStructuredText = new Function(
    src.slice(structuredStart, docxStart) + '; return _htmlToStructuredText;'
  )();
  const integrated = new Function(
    src.slice(speechStart, speechEnd) + '\n' +
    src.slice(structuredStart, brfEnd) +
    '; return { _htmlToStructuredText, _htmlToDocxSpec, _htmlToOdtContentXml, _htmlToDtbookXml, _collectMoSegments, _buildMoOpf, _buildEpubPackageFiles, _altFmtHtmlToPlainText, _altFmtToBRF, _buildBrailleBrf };'
  )();
  return { ...integrated, standaloneStructuredText };
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  loadAlloModule('instructional_context_module.js');
  loadAlloModule('shared_activity_module.js');
  loadAlloModule('document_narration_text_module.js');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_export_preview_module.js');
  loadAlloModule('view_storybook_export_modal_module.js');
  loadAlloModule('quiz_live_aggregators.js');
  loadAlloModule('view_submission_inbox_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('view_share_session_surfaces_module.js');
  loadAlloModule('view_assignment_center_module.js');

  pipeline = createPipeline();
  previewHelpers = loadPurePreviewHelpers();
  auditHelpers = loadAuditHelpers();
  quizAgg = window.AlloModules.QuizLiveAggregators;
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
  StorybookExportModal = window.AlloModules.StorybookExportModal.StorybookExportModal;
  HomeworkQrDialogView = window.AlloModules.HomeworkQrDialogView;
  AssignmentCenterModal = window.AlloModules.AssignmentCenter.AssignmentCenterModal;
});

afterEach(() => {
  while (activeRoots.length) {
    const { root, container } = activeRoots.pop();
    try { act(() => root.unmount()); } catch (_) {}
    try { container.remove(); } catch (_) {}
  }
  while (activeDoms.length) {
    const dom = activeDoms.pop();
    try { dom.window.close(); } catch (_) {}
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Wave 39 — Student Assessment & Teacher-Key Leak Prevention', () => {
  it('_removeStudentPackageTeacherSections and _builderSanitizeAssessmentRoot strip game/matching check chrome, teacher sections, and answer attributes', () => {
    const doc = parseDoc(`
      <div>
        <div class="page-break"></div>
        <div class="alloflow-teacher-plan">Teacher facilitation plan</div>
        <div class="alloflow-math-solution">Step-by-step key</div>
        <div class="alloflow-fluency-key">WPM Key</div>
        <button class="alloflow-gm-check-btn">Check</button>
        <p class="alloflow-gm-feedback">Correct!</p>
        <button class="alloflow-match-check-btn">Check match</button>
        <p class="alloflow-match-feedback">2/2</p>
        <div class="question" data-correct="0" data-fill-answers="cell" data-numeric-answer="42" data-match-right="mitochondria" data-right-index="1">
          <p>Student question remains visible.</p>
        </div>
      </div>
    `);
    const removed = previewHelpers._removeStudentPackageTeacherSections(doc.body);
    expect(removed).toBeGreaterThanOrEqual(7);
    previewHelpers._builderSanitizeAssessmentRoot(doc.body);
    expect(doc.body.querySelector('.page-break')).toBeNull();
    expect(doc.body.querySelector('.alloflow-gm-check-btn')).toBeNull();
    expect(doc.body.querySelector('.alloflow-match-feedback')).toBeNull();
    expect(doc.body.querySelector('.alloflow-teacher-plan')).toBeNull();
    const q = doc.body.querySelector('.question');
    expect(q.textContent).toContain('Student question remains visible.');
    for (const attr of ['data-correct', 'data-fill-answers', 'data-numeric-answer', 'data-match-right', 'data-right-index']) {
      expect(q.hasAttribute(attr)).toBe(false);
    }
  });

  it('_alloQuizToFormItems gates answer keys/explanations in student mode while preserving 1-arg teacher mode', () => {
    const quizData = {
      id: 'q-wave39',
      title: 'Cell Organelles',
      questions: [
        {
          type: 'multiple-choice',
          question: 'Which organelle makes ATP?',
          options: ['Nucleus', 'Mitochondria', 'Ribosome'],
          correctAnswer: 'Mitochondria',
          studentDirections: 'Pick the best match.',
          explanation: 'SECRET TEACHER EXPLANATION',
          rubric: 'SECRET RUBRIC',
          requireReasoning: true,
          reasoningPrompt: 'Why does that organelle make ATP?',
        },
        {
          type: 'matching',
          question: 'Match each part.',
          pairs: [
            { left: 'Chloroplast', right: 'Photosynthesis' },
            { left: 'Vacuole', right: 'Storage' },
          ],
        },
        {
          type: 'answer-evidence',
          question: 'Do plant cells have walls?',
          answerOptions: ['Yes', 'No'],
          correctAnswer: 'Yes',
          evidenceOptions: ['Rigid cellulose wall', 'No boundary'],
          correctEvidence: 'Rigid cellulose wall',
        },
      ],
    };

    const legacyTeacherItems = previewHelpers._alloQuizToFormItems(quizData);
    expect(legacyTeacherItems[0].answer).toEqual([1]);
    expect(legacyTeacherItems[0].help).toContain('SECRET TEACHER EXPLANATION');

    const studentItems = previewHelpers._alloQuizToFormItems(quizData, {
      includeTeacherKey: false,
      assessmentMode: true,
    });
    expect(studentItems[0].help).toBe('Pick the best match.');
    expect(studentItems[0].help).not.toContain('SECRET TEACHER EXPLANATION');
    expect(studentItems[0].help).not.toContain('SECRET RUBRIC');
    expect(studentItems[1].type).toBe('paragraph');
    expect(studentItems[1].prompt).toContain('Why does that organelle make ATP?');

    const matchItems = studentItems.filter((it) => it.prompt.startsWith('Match each part.'));
    expect(matchItems).toHaveLength(2);
    expect(matchItems[0].options).not.toEqual(['Photosynthesis', 'Storage']);
    expect(new Set(matchItems[0].options)).toEqual(new Set(['Photosynthesis', 'Storage']));

    const aeItems = studentItems.filter((it) => it.prompt.startsWith('Do plant cells have walls?'));
    expect(aeItems).toHaveLength(2);
    expect(aeItems.every((it) => Array.isArray(it.options) && it.options.length === 2)).toBe(true);
  });

  it('handleExportH5P omits sample keys in assessment mode and handleExportSlides scopes/filters student decks', async () => {
    const noteItem = {
      id: 'notes-1',
      type: 'note-taking',
      title: 'Guided Notes',
      data: {
        templateType: 'q-and-a',
        pairs: [{ question: 'Summarize osmosis', answer: 'SECRET_SAMPLE_NOTE' }],
      },
    };
    const { exporter, captured } = setupExporter({ generatedContent: noteItem });
    const okH5p = await exporter.handleExportH5P({
      generatedContent: noteItem,
      exportConfig: { assessmentMode: true, includeTeacherKey: false },
    });
    expect(okH5p).toBe(true);
    const contentJson = String(captured.zips[0].files['content/content.json'] || '');
    expect(contentJson).toContain('Summarize osmosis');
    expect(contentJson).not.toContain('SECRET_SAMPLE_NOTE');

    const liveHtml = '<!DOCTYPE html><html><body><h1>Topic</h1><div class="teacher-view">TEACHER_SECRET_SLIDE</div><div class="alloflow-gm-feedback">SECRET_GM</div><p>Student content</p></body></html>';
    const prevOffice = window.AlloModules.AccessibleOfficeExport;
    try {
      window.AlloModules.AccessibleOfficeExport = {
        build: vi.fn(async ({ html, format }) => {
          captured.officeSlideHtml = html;
          captured.officeSlideFormat = format;
          return { blob: new Blob(['pptx']), fileName: 'live-slides.pptx', message: 'ok' };
        }),
      };
      const okLiveSlides = await exporter.handleExportSlides({
        audience: 'student',
        includeTeacherKey: false,
        liveHtml,
      });
      expect(okLiveSlides).toBe(true);
      expect(captured.officeSlideFormat).toBe('pptx');
      expect(captured.officeSlideHtml).toContain('Student content');
      expect(captured.officeSlideHtml).not.toContain('TEACHER_SECRET_SLIDE');
      expect(captured.officeSlideHtml).not.toContain('SECRET_GM');

      const okDeckSlides = await exporter.handleExportSlides({
        audience: 'student',
        includeTeacherKey: false,
        exportConfig: { builderResourceIds: ['r1', 'r2'] },
        history: [
          { id: 'r1', type: 'simplified', title: 'Included Reading', data: 'Short student reading text.' },
          { id: 'r2', type: 'lesson-plan', title: 'Hidden Plan', data: { objectives: ['Secret teacher objective'] } },
        ],
      });
      expect(okDeckSlides).toBe(true);
      const slideDump = JSON.stringify(captured.slides);
      expect(slideDump).toContain('Short student reading text.');
      expect(slideDump).not.toContain('Secret teacher objective');
      expect(slideDump).not.toContain('Hidden Plan');
    } finally {
      window.AlloModules.AccessibleOfficeExport = prevOffice;
    }
  });

  it('doc_pipeline keeps <input type="number"> while parsing fractions, commas, and unicode minus; keeps 3-branch Venn 2-circle unless 3-circle is triggered', async () => {
    const html = pipeline.generateFullPackHTML([
      {
        id: 'quiz-num',
        type: 'quiz',
        title: 'Math & Bio',
        data: {
          questions: [
            { type: 'numeric-response', question: 'Quarter of 3?', correctValue: 0.75, tolerance: 0.01 },
            { type: 'numeric-response', question: 'Negative value?', correctValue: -5, tolerance: 0.01 },
          ],
        },
      },
      {
        id: 'venn-2',
        type: 'outline',
        title: 'Compare',
        data: {
          structureType: 'Venn Diagram',
          centralTopic: 'Vertebrates',
          branches: [
            { title: 'Mammals', items: ['Fur'] },
            { title: 'Reptiles', items: ['Scales'] },
            { title: 'Both', items: ['Backbone'] },
          ],
        },
      },
      {
        id: 'venn-3',
        type: 'outline',
        title: 'Triple Venn',
        data: {
          structureType: 'Venn Diagram',
          circleCount: 3,
          centralTopic: 'States',
          branches: [
            { title: 'Solid', items: ['Ice'] },
            { title: 'Liquid', items: ['Water'] },
            { title: 'Gas', items: ['Steam'] },
            { title: 'All three', items: ['H2O'] },
          ],
        },
      },
    ], 'Pack', false, {}, { vennExportMode: 'completed', includeTeacherKey: false });

    const staticDoc = parseDoc(html);
    const numInputs = Array.from(staticDoc.querySelectorAll('.alloflow-numeric-response input[id$="_number"]'));
    expect(numInputs.length).toBe(2);
    expect(numInputs.every((el) => el.getAttribute('type') === 'number')).toBe(true);

    // 2-circle Venn keeps 2-circle layout; 3-circle Venn renders .venn-visual-3circle with 3 circles (A, B, C)
    const venn2 = staticDoc.getElementById('venn-2');
    const venn3 = staticDoc.getElementById('venn-3');
    expect(venn2.querySelector('.venn-visual-3circle')).toBeNull();
    expect(venn3.textContent).toContain('Steam');
    expect(venn3.querySelector('.venn-visual-3circle')).not.toBeNull();
    expect(venn3.querySelectorAll('[data-venn-circle]').length).toBe(3);

    // Boot runtime JS and exercise Check button with fraction/unicode minus values
    const { doc, win } = await bootPackDOM(html);
    const qInputs = Array.from(doc.querySelectorAll('.question[data-numeric-key] input[id$="_number"]'));
    qInputs[0].setAttribute('type', 'text');
    qInputs[1].setAttribute('type', 'text');
    qInputs[0].value = '3/4';
    qInputs[1].value = '−5';
    qInputs[0].dispatchEvent(new win.Event('input', { bubbles: true }));
    qInputs[1].dispatchEvent(new win.Event('input', { bubbles: true }));
    doc.querySelector('.quiz-check-btn').click();
    const statuses = Array.from(doc.querySelectorAll('.question[data-numeric-key] .alloflow-quiz-feedback')).map((el) => el.textContent);
    expect(statuses.every((s) => /Correct/i.test(s))).toBe(true);
  });
});

describe('Wave 40-41A — Accessible Alt-Format & Narration Fidelity', () => {
  it('_htmlToStructuredText keeps its 2-arg standalone contract while reading math/svg labels cleanly', () => {
    const sample = `
      <main>
        <h1>Lesson Title</h1>
        <p>Energy formula: <math aria-label="E equals m c squared"><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></math></p>
        <svg role="img" aria-label="Mitochondria diagram"><title>Mitochondria</title><text>RAW_SVG_TEXT</text></svg>
        <p hidden>SHOULD_NOT_APPEAR_HIDDEN</p>
        <div class="teacher-only">TEACHER_ONLY_TEXT</div>
      </main>
    `;
    expect(auditHelpers.standaloneStructuredText.length).toBe(2);
    const plain = auditHelpers.standaloneStructuredText(sample, false);
    const md = auditHelpers.standaloneStructuredText(sample, true);
    expect(plain).toContain('E equals m c squared');
    expect(plain).toContain('Mitochondria diagram');
    expect(plain).not.toContain('RAW_SVG_TEXT');
    expect(plain).not.toContain('SHOULD_NOT_APPEAR_HIDDEN');
    expect(plain).not.toContain('TEACHER_ONLY_TEXT');
    expect(md).toContain('# Lesson Title');

    const withTeacher = auditHelpers.standaloneStructuredText(sample, false, { includeTeacherOnly: true });
    expect(withTeacher).toContain('TEACHER_ONLY_TEXT');
  });

  it('ODT, DTBook, and EPUB3 packaging handle well-formed XML, RTL direction, svg/mathml/remote-resources, and BRF symbol transcription', () => {
    const html = `<!DOCTYPE html><html lang="ar-SA" dir="rtl"><head><title>علوم</title></head><body>
      <h1 id="h-1">الطاقة &amp; الحركة</h1>
      <p><math aria-label="x squared" xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup></math></p>
      <svg viewBox="0 0 10 10" aria-label="Diagram"><title>Cell</title><rect width="8" height="8"/></svg>
      <img src="https://example.org/cell.png" alt="Cell photo" />
      <table><thead><tr><th>Column A</th><th>Column B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>
    </body></html>`;

    const odtXml = auditHelpers._htmlToOdtContentXml(html);
    expect(parseXml(odtXml).wellFormed).toBe(true);
    expect(odtXml).toContain('Standard_RTL');
    expect(odtXml).toContain('Table_RTL');

    const dtbookXml = auditHelpers._htmlToDtbookXml(html, 'ar-SA', 'urn:uuid:test-1');
    expect(parseXml(dtbookXml).wellFormed).toBe(true);
    expect(dtbookXml).toContain('Cell photo');

    const epub = auditHelpers._buildEpubPackageFiles(html, { title: 'علوم', uid: 'uid-rtl', modifiedIso: '2026-11-15T12:00:00Z' });
    expect(epub.validation.valid).toBe(true);
    const opf = epub.files['OEBPS/content.opf'];
    expect(parseXml(opf).wellFormed).toBe(true);
    expect(parseXml(epub.files['OEBPS/nav.xhtml']).wellFormed).toBe(true);
    expect(opf).toContain('dir="rtl"');
    expect(opf).toContain('page-progression-direction="rtl"');
    expect(opf).toContain('svg');
    expect(opf).toContain('mathml');
    expect(opf).toContain('remote-resources');

    const brfMeta = auditHelpers._altFmtToBRF('α + β ≤ ½, H₂O, x² → ∞', { withMeta: true });
    expect(brfMeta.dropped).toBe(0);
    expect(brfMeta.brf).not.toHaveLength(0);
    expect(/[\x20-\x5F\r\n]+/.test(brfMeta.brf)).toBe(true);
  });
});

describe('Wave 41B — Storybook, Flashcard Export & Modal Focus Isolation', () => {
  it('handleExportStorybook keeps Unicode slug characters and sets dir="rtl" for Arabic', async () => {
    window.callGemini = async () => 'خاتمة القصة';
    const { exporter, captured } = setupExporter({
      sourceTopic: 'الخلية الحيوية 2',
      leveledTextLanguage: 'Arabic',
      adventureState: {
        level: 'Grade 6',
        history: [{ type: 'narrator', text: 'ابدأ الاستكشاف' }, { type: 'choice', text: 'افحص النواة' }],
      },
    });
    const ok = await exporter.handleExportStorybook({
      includeImages: false,
      includeNarration: true,
    });
    expect(ok).toBe(true);
    const dlName = captured.downloads.find((d) => d.includes('-storybook-')) || '';
    expect(dlName).toContain('الخلية-الحيوية-2-storybook-');
    const html = await captured.blobs[0].text();
    expect(html).toContain('dir="rtl"');
  });

  it('handleExportFlashcards uses flex-wrap controls and shuffles independently inside each [data-fc-set]', async () => {
    const { exporter, captured } = setupExporter({
      generatedContent: {
        id: 'gl-fc',
        type: 'glossary',
        title: 'Terms',
        data: [
          { term: 'Alpha', def: 'First', translations: { Spanish: { term: 'Alfa', definition: 'Primero' }, French: { term: 'Alpha FR', definition: 'Premier' } } },
          { term: 'Beta', def: 'Second', translations: { Spanish: { term: 'Beta', definition: 'Segundo' }, French: { term: 'Bêta', definition: 'Deuxième' } } },
          { term: 'Gamma', def: 'Third', translations: { Spanish: { term: 'Gama', definition: 'Tercero' }, French: { term: 'Gamma FR', definition: 'Troisième' } } },
          { term: 'Delta', def: 'Fourth', translations: { Spanish: { term: 'Delta', definition: 'Cuarto' }, French: { term: 'Delta FR', definition: 'Quatrième' } } },
        ],
      },
    });
    exporter.handleExportFlashcards('standard', { includeAudio: false });
    expect(captured.blobs.length).toBeGreaterThan(0);
    const html = await captured.blobs[0].text();
    expect(html).toContain('flex-wrap: wrap');

    const { doc } = await bootPackDOM(html);
    const setsBefore = Array.from(doc.querySelectorAll('[data-fc-set]')).map((s) => s.getAttribute('data-fc-set'));
    expect(setsBefore.length).toBe(2);
    const shuffleBtn = doc.querySelector('[data-fc-action="shuffle"]');
    expect(shuffleBtn).not.toBeNull();
    shuffleBtn.click();
    const setsAfter = Array.from(doc.querySelectorAll('[data-fc-set]'));
    expect(setsAfter.every((s) => s.querySelectorAll('.card-container').length === 4)).toBe(true);
  });

  it('StorybookExportModal locks body scroll and isolates non-dialog siblings via inert + aria-hidden, restoring on unmount', () => {
    const sibling = document.createElement('div');
    sibling.id = 'app-shell';
    sibling.setAttribute('aria-hidden', 'false');
    document.body.appendChild(sibling);
    document.body.style.overflow = 'auto';

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    activeRoots.push({ root, container });

    try {
      act(() => {
        root.render(React.createElement(StorybookExportModal, {
          handleExportStorybook: vi.fn(),
          handleSetShowStorybookExportModalToFalse: vi.fn(),
          isProcessing: false,
          setShowStorybookExportModal: vi.fn(),
          t: (_k, fb) => fb || _k,
        }));
      });
      expect(document.body.style.overflow).toBe('hidden');
      expect(sibling.getAttribute('aria-hidden')).toBe('true');
      expect(sibling.inert || sibling.hasAttribute('inert')).toBe(true);
    } finally {
      act(() => root.unmount());
      activeRoots.pop();
      container.remove();
      expect(document.body.style.overflow).toBe('auto');
      expect(sibling.getAttribute('aria-hidden')).toBe('false');
      expect(Boolean(sibling.inert) || sibling.hasAttribute('inert')).toBe(false);
      sibling.remove();
    }
  });
});

describe('Wave 41C-42A — Live Quiz Aggregators', () => {
  it('normalizes item type aliases, resolves fallback answer keys, parses flexible numbers, and gates requireReasoning uniformly', () => {
    expect(quizAgg.normalizeItemType({ type: 'multiple-choice' })).toBe('mcq');
    expect(quizAgg.normalizeItemType({ type: 'tf' })).toBe('mcq');
    expect(quizAgg.normalizeItemType({ type: 'checkboxes' })).toBe('multi-select');
    expect(quizAgg.normalizeItemType({ type: 'fill_in_the_blank' })).toBe('fill-blank');
    expect(quizAgg.normalizeItemType({ type: 'number' })).toBe('numeric-response');
    expect(quizAgg.normalizeItemType({ type: 'true_false' })).toBe('mcq');

    expect(quizAgg.gradePresentationResponse({ answer: '1/2' }, { type: 'numeric-response', correctValue: 0.5, tolerance: 0.01 }).status).toBe('correct');
    expect(quizAgg.gradePresentationResponse({ answer: '1,200 cm' }, { type: 'numeric-response', correctValue: 12, unit: 'm', acceptableUnits: ['cm'], numericSettings: { allowEquivalentUnits: true } }).status).toBe('correct');
    expect(quizAgg.gradePresentationResponse({ answer: '−4' }, { type: 'numeric-response', correctValue: -4 }).status).toBe('correct');

    const letterMcq = { id: 'q1', type: 'mcq', options: ['Red', 'Blue', 'Green'], answer: 'B' };
    expect(quizAgg.gradeResponseForItem({ answer: { optionText: 'Blue' } }, letterMcq).status).toBe('correct');

    const numReq = { id: 'q2', type: 'numeric-response', correctValue: 10, requireReasoning: true };
    const gMissing = quizAgg.gradePresentationResponse({ answer: { value: '10', reasoning: '' } }, numReq);
    expect(gMissing).toMatchObject({ status: 'submitted', needsReasoning: true });
    expect(quizAgg.assessmentResponseState({ answer: { value: '10', reasoning: '' } }, numReq)).toMatchObject({ answered: false, hasResponse: true });

    const gComplete = quizAgg.gradePresentationResponse({ answer: { value: '10', reasoning: 'Calculated directly.' } }, numReq);
    expect(gComplete.status).toBe('correct');
  });

  it('aggregateSuccessCriteria preserves 3-arg compatibility while honoring AI cache and teacherOverrides precedence', () => {
    const generated = {
      id: 'q-sc',
      data: {
        questions: [
          { id: 'q0', type: 'mcq', options: ['Yes', 'No'], correctAnswer: 'Yes', conceptLabel: 'Explain flow' },
          { id: 'q1', type: 'short-answer', conceptLabel: 'Explain flow' },
        ],
      },
    };
    const quizState = {
      allResponses: {
        s1: {
          0: { answer: { optionIdx: 0, optionText: 'Yes' } },
          1: { answer: { text: 'Detailed evidence' } },
        },
      },
    };
    const roster = { s1: 'Maya' };

    const legacy = quizAgg.aggregateSuccessCriteria(quizState, generated, roster);
    expect(legacy.byConcept['Explain flow']).toMatchObject({ met: 1, total: 1 });

    const withAi = quizAgg.aggregateSuccessCriteria(
      quizState,
      generated,
      roster,
      { 's1:1': { score: 20, status: 'incorrect' } }
    );
    expect(withAi.byConcept['Explain flow']).toMatchObject({ met: 1, total: 2 });

    const withAiAndOverride = quizAgg.aggregateSuccessCriteria(
      quizState,
      generated,
      roster,
      { 's1:1': { score: 20, status: 'incorrect' } },
      // An override now only applies to the exact response it was made for.
      { s1: { 1: { score: 95, status: 'correct', responseFingerprint: quizAgg.assessmentResponseFingerprint(generated.data.questions[1], quizState.allResponses.s1[1]) } } }
    );
    expect(withAiAndOverride.byConcept['Explain flow']).toMatchObject({ met: 2, total: 2 });
    const staleOverride = quizAgg.aggregateSuccessCriteria(
      quizState,
      generated,
      roster,
      { 's1:1': { score: 20, status: 'incorrect' } },
      { s1: { 1: { score: 95, status: 'correct' } } }
    );
    expect(staleOverride.byConcept['Explain flow']).toMatchObject({ met: 1, total: 2 });
  });
});

describe('Wave 41D-42B — Submission Inbox Enhancements', () => {
  it('siResolveVennConfig differentiates 2-circle vs 3-circle configurations and siExtractGlossaryPairs filters deselected items', () => {
    const twoCircle = inboxMeta.resolveVennConfig({ branches: [{ title: 'A', items: ['a1'] }, { title: 'B', items: ['b1'] }, { title: 'Both', items: ['ab'] }] });
    expect(twoCircle.isThreeCircle).toBe(false);

    const threeCircle = inboxMeta.resolveVennConfig({
      circleCount: 3,
      branches: [
        { title: 'Solid', items: ['Ice'] },
        { title: 'Liquid', items: ['Water'] },
        { title: 'Gas', items: ['Steam'] },
        { title: 'All three', items: ['H2O'] },
      ],
    });
    expect(threeCircle.isThreeCircle).toBe(true);
    expect(threeCircle.zoneOrder).toEqual(['setA', 'setB', 'setC', 'overlapAB', 'overlapBC', 'overlapAC', 'shared']);
    expect(threeCircle.zones).toContain('shared');

    const pairs = inboxMeta.extractGlossaryPairs({
      data: {
        items: [
          { id: 'g1', term: 'Osmosis', def: 'Water diffusion', selected: true },
          { id: 'g2', term: 'SkipMe', def: 'Deselected', selected: false },
        ],
      },
    });
    expect(pairs.map((p) => p.term)).toEqual(['Osmosis']);
  });

  it('SubmissionInbox renders roleSwaps/stories in By Question view and lets teachers Un-anchor responses', async () => {
    localStorage.setItem('alloflow_inbox_session', JSON.stringify({
      globalRubric: { rubric: 'Cite evidence', context: '' },
      anchors: [{
        studentResponse: 'Water enters the root by osmosis.',
        teacherScore: 95,
        teacherFeedback: 'Clear mechanism',
        fromSubmissionIdx: 0,
        fromResponseKey: 'q-bio:q0:short',
      }],
      savedAt: '2026-11-15T12:00:00.000Z',
    }));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    activeRoots.push({ root, container });

    await act(async () => {
      root.render(React.createElement(SubmissionInbox, {
        isOpen: true,
        onClose: vi.fn(),
        rosterKey: '',
        t: (_k, fb) => fb || _k,
        addToast: vi.fn(),
        onOpenAlloSheet: vi.fn(),
        history: [{
          id: 'q-bio',
          type: 'quiz',
          title: 'Bio Check',
          data: { questions: [{ type: 'short-answer', question: 'How does water enter roots?' }] },
        }],
      }));
      await new Promise((r) => setTimeout(r, 20));
    });

    const payload = {
      kind: 'alloflow-student-submission',
      schemaVersion: 2,
      studentName: 'Jordan',
      docTitle: 'Bio Check',
      timestamp: '2026-11-15T12:05:00.000Z',
      responses: { 'q-bio:q0:short': 'Water enters the root by osmosis.' },
      answers: { 'q-bio:q0:short': 'Water enters the root by osmosis.' },
      content: [
        {
          id: 'rs-1',
          type: 'persona-reflection',
          title: 'Cell Role Swap',
          config: {
            kind: 'role-swap',
            roleSwap: {
              entries: [{ speaker: 'Guard Cell', question: 'Why open at dawn?', answer: 'To let CO2 in for photosynthesis.', evidence: '' }],
            },
          },
        },
        {
          id: 'st-1',
          type: 'adventure',
          title: 'Osmosis Quest',
          data: {
            kind: 'student-story',
            studentStory: {
              title: 'Osmosis Quest',
              start: 's1',
              scenes: [
                { id: 's1', text: 'You shrink in saltwater.', choices: [{ label: 'Find fresh water', to: 's2' }] },
                { id: 's2', text: 'Balance restored!', ending: true },
              ],
            },
          },
        },
      ],
    };
    const fileInput = container.querySelector('input[aria-label="Submission files"]');
    const jsonText = JSON.stringify(payload);
    const file = new File([jsonText], 'jordan.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(jsonText) });
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    const viewBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === 'View');
    await act(async () => viewBtn.click());
    expect(container.textContent).toContain('📌 Anchor 95/100');

    const byQBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('By Question'));
    await act(async () => byQBtn.click());
    expect(container.textContent).toContain('Cell Role Swap');
    expect(container.textContent).toContain('Osmosis Quest');
    expect(container.textContent).toContain('📌 Anchor 95/100');

    const unanchorBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Un-anchor');
    expect(unanchorBtn).toBeDefined();
    await act(async () => unanchorBtn.click());
    expect(container.textContent).not.toContain('📌 Anchor 95/100');
  });
});

describe('Wave 42C — Host Pack Scoping & Delivery Metadata', () => {
  it('createHostHandlers scopes shareFullPackToMailbox, deriveDirectionsDraft, and sendPackHome while ignoring click SyntheticEvents', async () => {
    const shareMock = vi.fn(async () => ({ ok: true }));
    const mailboxCallMock = vi.fn(async () => ({ ok: true }));
    const callGeminiMock = vi.fn(async () => '1. Complete Unit 2 Quiz.');
    const setDraftMock = vi.fn();
    const setShowQrMock = vi.fn();
    const setShowHwMock = vi.fn();
    const addToast = vi.fn();
    const history = [
      { id: 'r1', unitId: 'u1', type: 'simplified', title: 'Unit 1 Reading', data: 'Unit 1 text' },
      { id: 'r2', unitId: 'u2', type: 'quiz', title: 'Unit 2 Quiz', data: { questions: [] } },
      { id: 'dir-u2', unitId: 'u2', type: 'directions', title: 'Unit 2 Directions', data: 'Finish Unit 2' },
    ];
    const __d = {
      history,
      activeUnitId: 'all',
      units: [{ id: 'u1' }, { id: 'u2' }],
      selectedUnitId: 'u1',
      sourceTopic: 'Cells',
      gradeLevel: 'Grade 7',
      leveledTextLanguage: 'English',
      mbLive: { code: 'ROOM1' },
      mbConfig: { url: 'https://mailbox.example.test', admin: 'adm' },
      mbSharedActivityEnabled: false,
      mbSharedActivityType: 'word_cloud',
      mbSharedActivityPrompt: '',
      mbSharedActivityOptionsText: '',
      mbSharedActivityIdentityMode: 'anonymous',
      mbSharedActivityAllowMaybe: true,
      mbSharedActivityMultiSelect: false,
      mbSharedActivityMaxPerPerson: 1,
      mbSurveyItems: [],
      mbHomeworkExpiryDays: 7,
      directionsDeriving: false,
      setDirectionsDeriving: vi.fn(),
      warnLog: vi.fn(),
      setMbBusy: vi.fn(),
      setMbDirectionsDraft: setDraftMock,
      setShowDirectionsComposer: vi.fn(),
      setQrShareModal: setShowQrMock,
      setShowHomeworkPackModal: setShowHwMock,
      addToast,
      t: (_k, fb) => fb || _k,
      _alloStudentSafeResources: (list) => list.slice(),
      _mbPushOneResource: shareMock,
      _alloMailboxCallWithRetry: mailboxCallMock,
      callGemini: callGeminiMock,
      generateUUID: () => 'uuid-test',
    };
    const handlers = window.AlloModules.HostHandlers(__d);

    await handlers.shareFullPackToMailbox(['r2']);
    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock.mock.calls[0][0]).toMatchObject({ id: 'r2' });

    // SyntheticEvent passed directly from an onClick handler must be ignored (no crash, uses full safe history)
    await handlers.shareFullPackToMailbox({ nativeEvent: {}, target: {}, currentTarget: {}, preventDefault() {} });
    expect(shareMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    const pushedIdsAfterEvent = shareMock.mock.calls.slice(1).map((c) => c[0]?.id);
    expect(pushedIdsAfterEvent).toContain('r1');
    expect(pushedIdsAfterEvent).toContain('r2');

    await handlers.deriveDirectionsDraft(['r2']);
    expect(callGeminiMock).toHaveBeenCalledTimes(1);
    expect(callGeminiMock.mock.calls[0][0]).toContain('Unit 2 Quiz');
    expect(callGeminiMock.mock.calls[0][0]).not.toContain('Unit 1 Reading');
    expect(setDraftMock).toHaveBeenCalledTimes(1);
    const updater = setDraftMock.mock.calls[0][0];
    const nextDraft = updater({ title: '', body: '', due: '' });
    expect(nextDraft.body).toBe('1. Complete Unit 2 Quiz.');

    await handlers.sendPackHome(['r2']);
    expect(mailboxCallMock).toHaveBeenCalledWith(
      'https://mailbox.example.test',
      expect.objectContaining({ v: expect.objectContaining({ kind: 'takehome' }) })
    );
  });

  it('HomeworkQrDialogView & AssignmentCenterModal render poll/discussion/exit-ticket labels and forward optional metadata only when present', () => {
    const createSelfContained = vi.fn();
    const hostMailbox = vi.fn();
    const Icon = () => null;
    const sharedProps = {
      BookOpen: Icon, ClipboardList: Icon, Copy: Icon, ExternalLink: Icon,
      Printer: Icon, Share2: Icon, Trash2: Icon, X: Icon,
      SharedAssignmentActivityPanel: Icon,
      t: (k) => k,
      addToast: vi.fn(),
      copyToClipboard: vi.fn(),
      homeworkQrDialogRef: React.createRef(),
      createSelfContainedHomeworkLink: createSelfContained,
      hostPackOnMailbox: hostMailbox,
      printQrSheet: vi.fn(),
      revokeHomeworkAssignment: vi.fn(),
      setQrShareModal: vi.fn(),
      testHomeworkAsStudent: vi.fn(),
    };
    const renderQrModal = (qrShareModal) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      activeRoots.push({ root, container });
      act(() => {
        root.render(React.createElement(HomeworkQrDialogView, { ...sharedProps, qrShareModal }));
      });
      return container;
    };

    const hostedModal = {
      type: 'assignment-pack-hosted',
      title: 'Hosted Exit Check',
      url: 'https://example.invalid/hw-hosted',
      noQr: true,
      resourceCount: 1,
      aiPolicy: 'off',
      sharedActivity: { type: 'exit-ticket', prompt: 'One takeaway?' },
    };
    const cHosted = renderQrModal(hostedModal);
    expect(cHosted.textContent).toContain('exit ticket');

    const baseQrModal = {
      type: 'assignment',
      title: 'Exit Check',
      url: 'https://example.invalid/hw',
      noQr: true,
      resourceCount: 1,
      aiPolicy: 'off',
      sharedActivity: { type: 'exit-ticket', prompt: 'One takeaway?' },
      deliverySummary: { schemaVersion: 1, conversionResourceIds: ['r1'], readings: [] },
      dueAt: '2026-12-01T23:59:00Z',
      assessmentMode: true,
      classId: 'cls-7',
      assignmentId: 'asg-9',
      researchMeta: { cohort: 'b' },
    };
    const c1 = renderQrModal(baseQrModal);
    const scBtn = Array.from(c1.querySelectorAll('button')).find((b) => b.textContent.includes('make_self_contained_version_no_accounts'));
    const mbBtn = Array.from(c1.querySelectorAll('button')).find((b) => b.textContent.includes('Host on Class Mailbox'));
    act(() => scBtn.click());
    act(() => mbBtn.click());
    expect(createSelfContained).toHaveBeenNthCalledWith(1, ['r1'], {
      aiPolicy: 'off',
      dueAt: '2026-12-01T23:59:00Z',
      assessmentMode: true,
      classId: 'cls-7',
      assignmentId: 'asg-9',
      researchMeta: { cohort: 'b' },
      sharedActivity: { type: 'exit-ticket', prompt: 'One takeaway?' },
    });
    expect(hostMailbox).toHaveBeenNthCalledWith(1, ['r1'], {
      includeSharedActivity: true,
      aiPolicy: 'off',
      dueAt: '2026-12-01T23:59:00Z',
      assessmentMode: true,
      classId: 'cls-7',
      assignmentId: 'asg-9',
      researchMeta: { cohort: 'b' },
      sharedActivity: { type: 'exit-ticket', prompt: 'One takeaway?' },
    });

    const minimalQrModal = {
      type: 'assignment',
      title: 'Minimal Pack',
      url: 'https://example.invalid/hw-min',
      noQr: true,
      resourceCount: 1,
      aiPolicy: 'off',
      deliverySummary: { schemaVersion: 1, conversionResourceIds: ['r1'], readings: [] },
    };
    const cMin = renderQrModal(minimalQrModal);
    const scBtnMin = Array.from(cMin.querySelectorAll('button')).find((b) => b.textContent.includes('make_self_contained_version_no_accounts'));
    const mbBtnMin = Array.from(cMin.querySelectorAll('button')).find((b) => b.textContent.includes('Host on Class Mailbox'));
    act(() => scBtnMin.click());
    act(() => mbBtnMin.click());
    expect(createSelfContained).toHaveBeenNthCalledWith(2, ['r1'], { aiPolicy: 'off' });
    expect(hostMailbox).toHaveBeenNthCalledWith(2, ['r1'], { includeSharedActivity: false, aiPolicy: 'off' });

    const c2 = document.createElement('div');
    document.body.appendChild(c2);
    const r2 = ReactDOMClient.createRoot(c2);
    activeRoots.push({ root: r2, container: c2 });
    const makeRow = (id, title, actType) => ({
      key: id,
      lifecycle: 'active',
      activityState: 'ready',
      activityType: actType,
      title,
      participantCount: 3,
      pendingCount: 1,
      approvedCount: 2,
      hiddenCount: 0,
      hasSharedActivity: true,
    });
    act(() => {
      r2.render(React.createElement(AssignmentCenterModal, {
        t: () => '',
        isOpen: true,
        rowViews: [
          makeRow('a1', 'Warmup Poll', 'poll'),
          makeRow('a2', 'Debate Thread', 'discussion'),
          makeRow('a3', 'Lesson Check', 'exit-ticket'),
        ],
      }));
    });
    expect(c2.textContent).toContain('Shared poll');
    expect(c2.textContent).toContain('Shared discussion');
    expect(c2.textContent).toContain('Exit ticket');
  });
});

describe('4-Mirror Byte-for-Byte SHA-256 Parity', () => {
  const deliverables = [
    'view_export_preview_module.js',
    'export_module.js',
    'doc_pipeline_module.js',
    'view_pdf_audit_module.js',
    'document_narration_text_module.js',
    'view_storybook_export_modal_module.js',
    'view_submission_inbox_module.js',
    'host_handlers_module.js',
    'view_share_session_surfaces_module.js',
    'view_assignment_center_module.js',
    'quiz_live_aggregators.js',
  ];
  const mirrorDirs = [
    '.',
    'desktop/web-app/public',
    'desktop/app-build',
    'desktop/web-app/build',
  ];

  it.each(deliverables)('%s has identical SHA-256 across all 4 mirrors', (filename) => {
    const hashes = mirrorDirs.map((dir) => sha256(resolve(ROOT, dir, filename)));
    expect(new Set(hashes).size).toBe(1);
  });
});
