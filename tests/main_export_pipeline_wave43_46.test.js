// Verification suite for Waves 43-46 of the main export, alt-format, narration,
// grading, submission inbox, assignment center CSV, and 4-mirror SHA-256 parity.

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
let inboxMeta;
let AssignmentCenterModal;
let AlloNarrationText;

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
    ...overrides,
    state,
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
  const captured = { blobs: [], zips: null, toasts: [], downloads: [], slides: [], writtenFiles: [] };
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
      captured.writtenFiles.push(fileName);
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
  return new Function(
    removeTeacherCode + '\n' + syncCode +
    '\nreturn { _builderSanitizeAssessmentRoot, _removeStudentPackageTeacherSections };'
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
  return new Function(
    src.slice(speechStart, speechEnd) + '\n' +
    src.slice(structuredStart, brfEnd) +
    '; return { _htmlToStructuredText, _htmlToDocxSpec, _htmlToOdtContentXml, _htmlToDtbookXml, _altFmtHtmlToPlainText, _altFmtToBRF, _buildBrailleBrf };'
  )();
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
  AlloNarrationText = new Function(
    readFileSync(resolve(ROOT, 'document_narration_text_module.js'), 'utf8') + '\nreturn AlloNarrationText;'
  )();
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_export_preview_module.js');
  loadAlloModule('quiz_live_aggregators.js');
  loadAlloModule('view_submission_inbox_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('view_assignment_center_module.js');

  pipeline = createPipeline();
  previewHelpers = loadPurePreviewHelpers();
  auditHelpers = loadAuditHelpers();
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
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

describe('Wave 43 — Interactive Cloze & Assessment Sanitization', () => {
  const clozeItems = [
    {
      id: 's1',
      type: 'simplified',
      title: 'Cell Transport',
      data: 'Osmosis moves water across a semipermeable membrane during passive transport.',
    },
    {
      id: 'g1',
      type: 'glossary',
      title: 'Key Terms',
      data: [
        { term: 'Osmosis', definition: 'Diffusion of water across a membrane.' },
        { term: 'membrane', definition: 'Selective barrier around a cell.' },
      ],
    },
  ];

  it('supports interactive cloze check and reset in student practice mode and strips check chrome in assessment mode', async () => {
    const practiceHtml = pipeline.generateFullPackHTML(clozeItems, 'Cloze Practice', false, {}, {
      clozeWorksheet: true,
      clozeInteractive: true,
      assessmentMode: false,
      includeTeacherKey: false,
    });
    const practiceDoc = parseDoc(practiceHtml);
    expect(practiceDoc.querySelectorAll('input.alloflow-cloze-input[data-cloze-answer]').length).toBeGreaterThanOrEqual(2);
    expect(practiceDoc.querySelectorAll('.alloflow-cloze-chip[data-cloze-word]').length).toBeGreaterThanOrEqual(2);
    expect(practiceDoc.querySelector('.alloflow-cloze-check-btn')).not.toBeNull();
    expect(practiceDoc.querySelector('.alloflow-cloze-reset-btn')).not.toBeNull();

    const { win, doc } = await bootPackDOM(practiceHtml);
    const inputs = Array.from(doc.querySelectorAll('input.alloflow-cloze-input[data-cloze-answer]'));
    inputs[0].value = 'Osmosis';
    inputs[1].value = 'wrong';
    inputs.forEach((inp) => inp.dispatchEvent(new win.Event('input', { bubbles: true })));

    doc.querySelector('.alloflow-cloze-check-btn').click();
    expect(inputs[0].classList.contains('is-cloze-correct')).toBe(true);
    expect(inputs[1].classList.contains('is-cloze-wrong')).toBe(true);
    expect(inputs[1].getAttribute('aria-invalid')).toBe('true');
    expect(doc.querySelector('.alloflow-cloze-results').textContent.trim().length).toBeGreaterThan(0);

    doc.querySelector('.alloflow-cloze-reset-btn').click();
    expect(inputs.every((inp) => inp.value === '' && !inp.classList.contains('is-cloze-correct') && !inp.classList.contains('is-cloze-wrong'))).toBe(true);

    const assessHtml = pipeline.generateFullPackHTML(clozeItems, 'Cloze Assessment', false, {}, {
      clozeWorksheet: true,
      clozeInteractive: true,
      assessmentMode: true,
      includeTeacherKey: false,
    });
    const assessDoc = parseDoc(assessHtml);
    expect(assessDoc.querySelectorAll('input.alloflow-cloze-input').length).toBeGreaterThanOrEqual(2);
    expect(assessDoc.querySelector('[data-cloze-answer]')).toBeNull();
    expect(assessDoc.querySelector('.alloflow-cloze-check-btn')).toBeNull();
    expect(assessDoc.querySelector('.alloflow-cloze-reset-btn')).not.toBeNull();

    const sanitizeDoc = parseDoc(practiceHtml);
    previewHelpers._builderSanitizeAssessmentRoot(sanitizeDoc.body);
    expect(sanitizeDoc.querySelector('[data-cloze-answer]')).toBeNull();
    expect(sanitizeDoc.querySelector('.alloflow-cloze-controls')).toBeNull();
    expect(sanitizeDoc.querySelector('.alloflow-cloze-check-btn')).toBeNull();
    expect(sanitizeDoc.querySelectorAll('input.alloflow-cloze-input').length).toBeGreaterThanOrEqual(2);

    const exportedSafe = window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml(practiceHtml);
    const exportedSafeDoc = parseDoc(exportedSafe);
    expect(exportedSafeDoc.querySelector('[data-cloze-answer]')).toBeNull();
    expect(exportedSafeDoc.querySelector('.alloflow-cloze-controls')).toBeNull();
    expect(exportedSafeDoc.querySelectorAll('input.alloflow-cloze-input').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Wave 43 — Brainstorm Mindmap ARIA Semantics & Assessment Scaffold Gating', () => {
  it('renders native button toggles inside brainstorm mindmap listitem spokes and flips aria-expanded on click', async () => {
    const teacherPipe = createPipeline({
      state: {
        exportConfig: { audience: 'teacher', includeTeacherKey: true, annotations: [] },
      },
    });
    const html = teacherPipe.generateFullPackHTML([
      {
        id: 'b1',
        type: 'brainstorm',
        title: 'Ecosystems',
        data: [
          { title: 'Producers', description: 'Kelp and algae capture sunlight.', rationale: 'Foundation of web.' },
          { title: 'Consumers', description: 'Otters regulate urchins.', rationale: 'Top-down balance.' },
        ],
      },
    ], 'Ecosystems Mindmap', false, { audience: 'teacher' }, {
      audience: 'teacher',
      includeTeacherKey: true,
      brainstormDisplayMode: 'mindmap',
    });

    const doc = parseDoc(html);
    const spokes = Array.from(doc.querySelectorAll('.alloflow-mindmap-spoke[role="listitem"]'));
    expect(spokes.length).toBe(2);
    expect(spokes[0].hasAttribute('tabindex')).toBe(false);
    expect(spokes[0].getAttribute('role')).toBe('listitem');
    const firstBtn = spokes[0].querySelector('button.alloflow-mindmap-toggle[type="button"]');
    expect(firstBtn).not.toBeNull();
    expect(firstBtn.getAttribute('aria-expanded')).toBe('false');

    const { doc: liveDoc } = await bootPackDOM(html);
    const toggle = liveDoc.querySelector('.alloflow-mindmap-spoke button.alloflow-mindmap-toggle');
    const detail = liveDoc.querySelector('.alloflow-mindmap-spoke .alloflow-mindmap-detail');
    expect(detail.style.display).toBe('none');
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(detail.style.display).toBe('block');
  });

  it('withholds DBQ sentence/thesis starters and Cornell model answers in student assessment mode while keeping typable note fields', () => {
    const items = [
      {
        id: 'd1',
        type: 'dbq',
        title: 'Industrial Shift DBQ',
        data: {
          includeHapp: true,
          essentialQuestion: 'Why did production change?',
          historicalContext: 'Early factory towns grew near rivers.',
          synthesisPrompt: 'Evaluate the economic shift using the documents.',
          thesisStarter: 'Although early mills relied on water power, steam...',
          documents: [
            {
              title: 'Document A',
              excerpt: 'Workers tended mechanical looms for twelve hours.',
              sentenceStarters: ['According to Document A, factory schedules...'],
            },
          ],
        },
      },
      {
        id: 'n1',
        type: 'note-taking',
        title: 'Cell Respiration Notes',
        data: {
          templateType: 'cornell-notes',
          cues: [{ text: 'ATP' }],
          notes: [{ text: 'SECRET CORNELL NOTE' }],
          summary: 'SECRET SUMMARY',
        },
      },
    ];

    const practiceHtml = pipeline.generateFullPackHTML(items, 'Practice Scaffolds', false, {}, {
      assessmentMode: false,
      includeTeacherKey: false,
    });
    expect(practiceHtml).toContain('According to Document A, factory schedules...');
    expect(practiceHtml).toContain('Although early mills relied on water power, steam...');
    expect(practiceHtml).toContain('SECRET CORNELL NOTE');
    expect(practiceHtml).toContain('SECRET SUMMARY');

    const assessHtml = pipeline.generateFullPackHTML(items, 'Assessment Scaffolds', false, {}, {
      assessmentMode: true,
      includeTeacherKey: false,
    });
    expect(assessHtml).not.toContain('According to Document A, factory schedules...');
    expect(assessHtml).not.toContain('Although early mills relied on water power, steam...');
    expect(assessHtml).not.toContain('SECRET CORNELL NOTE');
    expect(assessHtml).not.toContain('SECRET SUMMARY');
    const assessDoc = parseDoc(assessHtml);
    expect(assessDoc.querySelectorAll('textarea[data-allo-response-key]').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Wave 44 — Quiz Fill-Blank Exact Case, Numeric RequireUnit & Assessment Mode', () => {
  const quizItems = [
    {
      id: 'q1',
      type: 'quiz',
      title: 'Physics Check',
      data: {
        questions: [
          {
            type: 'fill-blank',
            question: 'Chemical symbol for gold?',
            expectedFill: 'Au',
            fillBlankPolicy: 'exact',
            caseSensitive: true,
          },
          {
            type: 'numeric-response',
            question: 'Gravity on Earth?',
            correctValue: 9.8,
            tolerance: 0.1,
            unit: 'm/s2',
            acceptableUnits: ['m/s^2'],
            requireUnit: true,
          },
        ],
      },
    },
  ];

  it('enforces exact case and requireUnit in practice self-check and strips quiz keys/check button in assessment mode', async () => {
    const practiceHtml = pipeline.generateFullPackHTML(quizItems, 'Quiz Practice', false, {}, {
      assessmentMode: false,
      includeTeacherKey: false,
    });
    const docStatic = parseDoc(practiceHtml);
    const fillQ = docStatic.querySelector('.question[data-fill-policy]');
    const numQ = docStatic.querySelector('.question[data-numeric-key]');
    expect(fillQ?.getAttribute('data-fill-policy')).toBe('exact');
    const decodedNumKey = JSON.parse(decodeURIComponent(numQ.getAttribute('data-numeric-key')));
    expect(decodedNumKey.requireUnit).toBe(true);
    expect(decodedNumKey.units).toEqual(expect.arrayContaining(['m/s2', 'm/s^2']));

    const { win, doc } = await bootPackDOM(practiceHtml);
    const fillQuestionEl = doc.querySelector('.question[data-fill-policy]');
    const numQuestionEl = doc.querySelector('.question[data-numeric-key]');
    const fillInput = fillQuestionEl.querySelector('input.interactive-blank');
    const numInput = doc.querySelector('input[data-allo-response-key$=":number"]');
    const unitInput = doc.querySelector('input[data-allo-response-key$=":unit"]');
    const checkBtn = doc.querySelector('.quiz-check-btn');
    const resultsEl = doc.querySelector('.quiz-results');
    expect(checkBtn).not.toBeNull();

    fillInput.value = 'au';
    numInput.value = '9.8';
    unitInput.value = '';
    fillInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    numInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    checkBtn.click();
    expect(fillQuestionEl.getAttribute('aria-invalid')).toBe('true');
    expect(numQuestionEl.getAttribute('aria-invalid')).toBe('true');
    expect(fillQuestionEl.querySelector('.alloflow-quiz-glyph')?.textContent || '').not.toBe('');

    fillInput.value = 'Au';
    unitInput.value = 'm/s2';
    fillInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    unitInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    checkBtn.click();
    expect(fillQuestionEl.getAttribute('aria-invalid')).toBeNull();
    expect(numQuestionEl.getAttribute('aria-invalid')).toBeNull();
    expect(resultsEl?.textContent || '').toMatch(/2\s*(?:\/|of)\s*2|100%/i);

    const assessHtml = pipeline.generateFullPackHTML(quizItems, 'Quiz Assessment', false, {}, {
      assessmentMode: true,
      includeTeacherKey: false,
    });
    const assessDoc = parseDoc(assessHtml);
    expect(assessDoc.querySelector('[data-fill-answers]')).toBeNull();
    expect(assessDoc.querySelector('[data-fill-policy]')).toBeNull();
    expect(assessDoc.querySelector('[data-numeric-key]')).toBeNull();
    expect(assessDoc.querySelector('.quiz-check-btn')).toBeNull();
    expect(assessDoc.querySelector('.quiz-reset-btn')).not.toBeNull();

    const sanitizedHtml = window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml(practiceHtml);
    const sanitizedDoc = parseDoc(sanitizedHtml);
    expect(sanitizedDoc.querySelector('[data-fill-answers]')).toBeNull();
    expect(sanitizedDoc.querySelector('[data-fill-policy]')).toBeNull();
    expect(sanitizedDoc.querySelector('[data-numeric-key]')).toBeNull();
    expect(sanitizedDoc.querySelector('.quiz-check-btn')).toBeNull();
    expect(sanitizedDoc.querySelector('.quiz-reset-btn')).not.toBeNull();
  });
});

describe('Wave 44 — Unicode Combining Marks & Windows Reserved Filenames Across Exporters', () => {
  it('preserves Devanagari combining marks and guards Windows reserved filenames in downloadHtmlBlob, H5P, Slides, and Storybook', async () => {
    const safeDownloads = [];
    const safeDownloadBlob = (_blob, name) => safeDownloads.push(name);
    window.AlloModules.ExportHandlers.downloadHtmlBlob(
      '<!doctype html><html><head><title>विज्ञान — Lesson Pack</title></head><body>Hi</body></html>',
      { safeDownloadBlob }
    );
    window.AlloModules.ExportHandlers.downloadHtmlBlob(
      '<!doctype html><html><head><title>CON — Lesson Pack</title></head><body>Hi</body></html>',
      { safeDownloadBlob }
    );
    expect(safeDownloads[0]).toBe('विज्ञान.html');
    expect(safeDownloads[1]).toBe('_CON.html');

    const { exporter, captured } = setupExporter({
      sourceTopic: 'विज्ञान यात्रा',
      isStudentMode: true,
      generatedContent: {
        id: 'q1',
        type: 'quiz',
        title: 'विज्ञान यात्रा',
        data: {
          questions: [{ type: 'mcq', question: 'Q?', options: ['A', 'B'], correctAnswer: 'A' }],
        },
      },
      history: [
        { id: 's1', type: 'simplified', title: 'विज्ञान यात्रा', data: 'Light energy drives photosynthesis.' },
      ],
      adventureState: {
        history: [{ type: 'scene', text: 'Forest path.' }],
        imageCache: {},
        level: 'Grade 5',
      },
    });

    await exporter.handleExportH5P();
    await exporter.handleExportSlides();
    await exporter.handleExportStorybook({ includeImages: false, includeNarration: true });

    const h5pFile = captured.downloads.find((f) => f.endsWith('.h5p'));
    const pptxFile = captured.writtenFiles.find((f) => f.endsWith('.pptx'));
    const storyFile = captured.downloads.find((f) => /-storybook-\d+\.html$/.test(f));

    for (const fname of [h5pFile, pptxFile, storyFile]) {
      expect(fname, 'expected Devanagari matra/anusvara preserved in ' + fname).toMatch(/\u093f/);
      expect(fname, 'expected Devanagari aa-matra preserved in ' + fname).toMatch(/\u093e/);
    }
  });
});

describe('Wave 45 — ODT Header/Span Tables, Plain-Text/BRF Form Controls & Sub/Sup, Narration Venn Dedupe', () => {
  it('emits well-formed ODT table-header-rows and covered-table-cell elements', () => {
    const xmlBody = auditHelpers._htmlToOdtContentXml(
      '<table><thead><tr><th colspan="2">Heading</th></tr></thead><tbody><tr><td rowspan="2">Span</td><td>B1</td></tr><tr><td>B2</td></tr></tbody></table>'
    );
    const parsed = parseXml(xmlBody);
    expect(parsed.wellFormed, parsed.err).toBe(true);
    expect(xmlBody).toContain('<table:table-header-rows>');
    expect(xmlBody).toContain('<table:covered-table-cell/>');
  });

  it('preserves form values, selected options, sup/sub notation, img alt, excludes teacher-only content, and wraps BRF <= 40 chars', () => {
    const html = [
      '<div>',
      '<h1>Organelle Lab</h1>',
      '<p>Water formula is H<sub>2</sub>O and area scales as x<sup>2</sup>.</p>',
      '<label>Organelle <input type="text" value="Mitochondria"></label>',
      '<textarea>ATP synthesis</textarea>',
      '<select><option value="x">Wrong</option><option value="y" selected>Ribosome</option></select>',
      '<img src="cell.png" alt="Chloroplast diagram">',
      '<div class="teacher-only">SECRET TEACHER KEY</div>',
      '</div>',
    ].join('');

    const plain = auditHelpers._altFmtHtmlToPlainText(html);
    expect(plain).toContain('Mitochondria');
    expect(plain).toContain('ATP synthesis');
    expect(plain).toContain('Ribosome');
    expect(plain).not.toContain('Wrong');
    expect(plain).toContain('x2');
    expect(plain).toContain('H2O');
    expect(plain).toContain('Chloroplast diagram');
    expect(plain).not.toContain('SECRET TEACHER KEY');

    const odtSubSup = auditHelpers._htmlToOdtContentXml(html);
    expect(odtSubSup).toContain('T_Sub');
    expect(odtSubSup).toContain('T_Sup');

    const brfDirect = auditHelpers._buildBrailleBrf(html, { cellsPerLine: 40 });
    expect(brfDirect.brf.length).toBeGreaterThan(20);
    const brfWrapped = auditHelpers._altFmtToBRF(plain, { cellsPerLine: 40, withMeta: true });
    const brfWrappedLines = brfWrapped.brf.split(/\r?\n/);
    expect(brfWrappedLines.length).toBeGreaterThan(0);
    expect(brfWrappedLines.every((line) => line.length <= 40)).toBe(true);
  });

  it('extracts form control values and deduplicates Venn SVG + print fallback in AlloNarrationText', () => {
    const narration = AlloNarrationText || window.AlloNarrationText || globalThis.AlloNarrationText;
    const html = [
      '<section>',
      '<div class="alloflow-venn-svg-wrap"><svg role="img" aria-label="Venn diagram"><text>Shared energy pathway</text></svg></div>',
      '<div data-venn-print="1"><p>Shared energy pathway</p></div>',
      '<p>Organelle: <input type="text" data-allo-response-key="f1" aria-label="Organelle" value="Mitochondria"></p>',
      '<textarea data-allo-response-key="f2" aria-label="Explanation">ATP synthesis</textarea>',
      '<p>Pick: <select data-allo-response-key="f3" aria-label="Pick"><option value="x">Wrong</option><option value="y" selected>Ribosome</option></select></p>',
      '</section>',
    ].join('');

    const nat = narration.naturalText(html);
    const acc = narration.accessibleText(html);
    for (const out of [nat, acc]) {
      expect(out).toContain('Mitochondria');
      expect(out).toContain('ATP synthesis');
      expect(out).toContain('Ribosome');
      const matches = out.match(/Shared energy pathway/g) || [];
      expect(matches.length).toBe(1);
    }
  });
});

describe('Wave 46 — Submission Inbox Auto-Grading & Pure Fallback Parity', () => {
  const history = [
    {
      id: 'q-inbox',
      type: 'quiz',
      title: 'Physics Check',
      data: {
        questions: [
          { id: 'q0', type: 'fill-blank', question: 'Gold symbol?', expectedFill: 'Au', fillBlankPolicy: 'exact', caseSensitive: true },
          { id: 'q1', type: 'numeric-response', question: 'Scientific value?', correctValue: 1200, tolerance: 0.5 },
          { id: 'q2', type: 'numeric-response', question: 'Fraction value?', correctValue: 0.75, tolerance: 0.01 },
          { id: 'q3', type: 'numeric-response', question: 'Gravity?', correctValue: 9.8, tolerance: 0.1, unit: 'm/s2', acceptableUnits: ['m/s^2'], requireUnit: true },
          { id: 'q4', type: 'matching', question: 'Match pairs', pairs: [{ left: 'ATP', right: 'Energy' }, { left: 'DNA', right: 'Code' }] },
          { id: 'q5', type: 'ordering', question: 'Order phases', items: ['G1', 'S', 'G2'], correctOrder: ['G1', 'S', 'G2'] },
        ],
      },
    },
  ];

  it('scores caseSensitive/exact fill, scientific notation, fractions, inline unit mismatches, and responseManifest match labels', () => {
    const gradesWrongCaseAndUnit = inboxMeta.exportedQuizAutoGrades({
      responses: {
        'q-inbox:q0:fill': 'au',
        'q-inbox:q1:number': '1.2e3',
        'q-inbox:q2:number': '3/4',
        'q-inbox:q3:number': '9.8 km',
        'q-inbox:q4:match:0': 'opt_a',
      },
      responseManifest: {
        schemaVersion: 1,
        entries: [{ key: 'q-inbox:q4:match:0', valueLabels: { opt_a: 'Energy' } }],
      },
    }, history);

    expect(gradesWrongCaseAndUnit['q-inbox:q0:fill']).toMatchObject({ score: 0, status: 'incorrect' });
    expect(gradesWrongCaseAndUnit['q-inbox:q1:number']).toMatchObject({ score: 100, status: 'correct' });
    expect(gradesWrongCaseAndUnit['q-inbox:q2:number']).toMatchObject({ score: 100, status: 'correct' });
    expect(gradesWrongCaseAndUnit['q-inbox:q3:number']).toMatchObject({ score: 50, status: 'partially-correct' });
    expect(gradesWrongCaseAndUnit['q-inbox:q4:match:0']).toMatchObject({ score: 100, status: 'correct' });

    const gradesExactCase = inboxMeta.exportedQuizAutoGrades({
      responses: { 'q-inbox:q0:fill': 'Au' },
    }, history);
    expect(gradesExactCase['q-inbox:q0:fill']).toMatchObject({ score: 100, status: 'correct' });
  });

  it('produces identical assessmentReport verdicts with QuizLiveAggregators active vs null fallback', () => {
    const qs = history[0].data.questions;
    const snap = {
      kind: 'alloflow-assessment-responses',
      status: 'submitted',
      items: [
        { number: 1, question: qs[0].question, type: 'fill-blank', answered: true, response: 'au', answer: { text: 'au' } },
        { number: 4, question: qs[3].question, type: 'numeric-response', answered: true, response: '9.8e0 m/s2', answer: { text: '9.8e0', unit: 'm/s2' } },
        { number: 5, question: qs[4].question, type: 'matching', answered: true, response: 'ATP -> Energy; DNA -> Code', answer: { matches: ['Energy', 'Code'] } },
        { number: 6, question: qs[5].question, type: 'ordering', answered: true, response: 'G1 -> S -> G2', answer: { order: ['G1', 'S', 'G2'] } },
      ],
    };

    const withAgg = inboxMeta.assessmentReport(snap, 'q-inbox', history, []);
    const origAgg = window.AlloModules.QuizLiveAggregators;
    let withoutAgg;
    try {
      window.AlloModules.QuizLiveAggregators = null;
      withoutAgg = inboxMeta.assessmentReport(snap, 'q-inbox', history, []);
    } finally {
      window.AlloModules.QuizLiveAggregators = origAgg;
    }

    const sharedNumbers = new Set([1, 4, 6]);
    expect(withAgg.items.filter((it) => sharedNumbers.has(it.number)).map((it) => [it.number, it.verdict, it.fraction]))
      .toEqual(withoutAgg.items.filter((it) => sharedNumbers.has(it.number)).map((it) => [it.number, it.verdict, it.fraction]));
    expect(withAgg.items[0].verdict).toBe('incorrect');
    expect(withAgg.items[1].verdict).toBe('correct');
    expect(withAgg.items[2].verdict).toBe('review');
    expect(withoutAgg.items[2]).toMatchObject({ number: 5, verdict: 'correct', fraction: 1 });
    expect(withAgg.items[3].verdict).toBe('correct');
  });
});

describe('Wave 46 — Shared Activity UI Meta, Assignment Center Modal, CSV Formula Guard & UTF-8 BOM', () => {
  it('exposes question_board/availability/signup metadata and renders them in AssignmentCenterModal', () => {
    expect(window.AlloModules.SharedActivity.activityUiMeta({ type: 'question_board' }))
      .toMatchObject({ shortLabel: 'QB', title: 'Driving questions board' });
    expect(window.AlloModules.SharedActivity.activityUiMeta({ type: 'availability' }))
      .toMatchObject({ shortLabel: 'AP', title: 'Availability poll' });
    expect(window.AlloModules.SharedActivity.activityUiMeta({ type: 'signup' }))
      .toMatchObject({ shortLabel: 'SU', title: 'Sign-up sheet' });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    activeRoots.push({ root, container });
    const makeRow = (id, title, actType) => ({
      key: id,
      lifecycle: 'active',
      activityState: 'ready',
      activityType: actType,
      title,
      participantCount: 4,
      pendingCount: 1,
      approvedCount: 3,
      hiddenCount: 0,
      hasSharedActivity: true,
    });
    act(() => {
      root.render(React.createElement(AssignmentCenterModal, {
        t: () => '',
        isOpen: true,
        rowViews: [
          makeRow('a1', 'Warmup Questions', 'question_board'),
          makeRow('a2', 'Conference Slots', 'availability'),
          makeRow('a3', 'Lab Stations', 'signup'),
        ],
      }));
    });
    expect(container.textContent).toContain('Driving questions board');
    expect(container.textContent).toContain('Availability poll');
    expect(container.textContent).toContain('Sign-up sheet');
  });

  it('guards formula-injection payloads in buildAssignmentCenterCsv and writes a UTF-8 BOM in exportAssignmentCenterCsv', async () => {
    const csv = window.AlloModules.SharedActivity.buildAssignmentCenterCsv([
      {
        lifecycle: '@SUM(A1)',
        share: {
          title: '=CMD|calc!A0',
          createdAt: '+1+1',
          expiresAt: '-2+3',
        },
        activity: { participantCount: 1, pending: 0, approved: 0, hidden: 0 },
      },
      {
        lifecycle: '  =SUM(A1)',
        share: {
          title: '|echo',
          createdAt: '\t@cmd',
          expiresAt: '\r=1+1',
        },
        activity: { participantCount: 1, pending: 0, approved: 0, hidden: 0 },
      },
    ]);
    expect(csv).toContain("'=CMD|calc!A0");
    expect(csv).toContain("'+1+1");
    expect(csv).toContain("'-2+3");
    expect(csv).toContain("'@SUM(A1)");
    expect(csv).toContain("'|echo");
    expect(csv).toContain("'  =SUM(A1)");
    expect(csv).toContain("'\t@cmd");
    expect(csv).toContain("'\r=1+1");

    const downloaded = [];
    const handlers = window.AlloModules.HostHandlers({
      assignmentCenterRows: [{
        lifecycle: 'active',
        share: { title: 'Safe Title', type: 'assignment-pack', createdAt: '2026-11-15' },
        activity: { participantCount: 2, pending: 0, approved: 2, hidden: 0 },
      }],
      _alloBuildAssignmentCenterCsv: window.AlloModules.SharedActivity.buildAssignmentCenterCsv,
      safeDownloadBlob: (blob, filename) => downloaded.push({ blob, filename }),
      addToast: () => {},
    });
    handlers.exportAssignmentCenterCsv();
    expect(downloaded).toHaveLength(1);
    const bytes = new Uint8Array(await downloaded[0].blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  });
});

describe('4-Mirror Byte-for-Byte SHA-256 Parity (Waves 43-46 & Packets Directions-Once)', () => {
  const deliverables = [
    'doc_pipeline_module.js',
    'export_module.js',
    'export_handlers_module.js',
    'view_export_preview_module.js',
    'view_pdf_audit_module.js',
    'document_narration_text_module.js',
    'view_submission_inbox_module.js',
    'shared_activity_module.js',
    'view_assignment_center_module.js',
    'host_handlers_module.js',
    'word_sounds_take_home_loader.js',
    'word_sounds_module.js',
    'ui_strings.js',
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
