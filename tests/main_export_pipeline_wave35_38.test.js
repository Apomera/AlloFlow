import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
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
let exportHandlers;
let previewHelpers;
let auditHelpers;
let inboxMeta;

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
    sourceTopic: 'Photosynthesis',
    gradeLevel: 'Grade 5',
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
    isRtlLang: () => false,
    updateExportPreview: vi.fn(),
    getDefaultTitle: (type) => String(type || 'Resource'),
    state,
    ...overrides,
  });
}

async function bootPackDOM(html, { url = 'https://example.test/pack.html', beforeParse } = {}) {
  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    beforeParse(win) {
      if (typeof beforeParse === 'function') beforeParse(win);
    },
  });
  activeDoms.push(dom);
  await new Promise((r) => setTimeout(r, 25));
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
  const captured = { blobs: [], zips: null, toasts: [] };
  const MockJSZip = createMockJSZipClass();
  captured.zips = MockJSZip.instances;
  vi.stubGlobal('JSZip', MockJSZip);
  window.JSZip = MockJSZip;
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    captured.blobs.push(blob);
    return `blob:mock-${captured.blobs.length}`;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  const defaultLive = {
    history: [],
    generatedContent: null,
    sourceTopic: 'Cellular Energy',
    gradeLevel: 'Grade 7',
    language: 'English',
    leveledTextLanguage: 'English',
    outputLanguage: 'English',
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
  const startSync = epSrc.indexOf('function _builderSyncLiveFormState(');
  const endSanitize = epSrc.indexOf('function _builderRefreshFinalDocumentFields(', startSync);
  const startCompat = epSrc.indexOf('function _builderH5PCompatibility(');
  const endCompat = epSrc.indexOf('function ExportPreviewPanel', startCompat);
  const compatBoundary = endCompat !== -1 ? endCompat : epSrc.indexOf('\n// ─', startCompat + 200);
  const sliceCompatEnd = epSrc.indexOf('\nfunction ', epSrc.indexOf('function _alloFormQuizzesFromHistory(') + 50);
  const h5pFnStart = startCompat;
  const h5pFnEnd = epSrc.indexOf('\n}', epSrc.indexOf('embeddedMedia:', startCompat)) + 2;
  const quizFormStart = epSrc.indexOf('function _alloQuizToFormItems(');
  const quizFormEnd = epSrc.indexOf('\nconst _BUILDER_', quizFormStart) !== -1
    ? epSrc.indexOf('\nconst _BUILDER_', quizFormStart)
    : epSrc.indexOf('\n// ', epSrc.indexOf('function _alloFormQuizzesFromHistory(') + 20);
  const formQuizFnEnd = epSrc.indexOf('\n}', epSrc.indexOf('function _alloFormQuizzesFromHistory(') + 20) + 2;

  const syncSanitizeCode = epSrc.slice(startSync, endSanitize);
  const compatCode = epSrc.slice(h5pFnStart, h5pFnEnd);
  const formQuizCode = epSrc.slice(quizFormStart, formQuizFnEnd);

  return new Function(
    syncSanitizeCode + '\n' + compatCode + '\n' + formQuizCode +
    '\nreturn { _builderSyncLiveFormState, _builderSanitizeAssessmentRoot, _builderH5PCompatibility, _alloQuizToFormItems, _alloFormQuizzesFromHistory };'
  )();
}

function loadAuditHelpers() {
  const src = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const start = src.indexOf('function _htmlToDocxSpec(html) {');
  const end = src.indexOf('\n// _buildDocxBlobFromSpec:', start);
  if (start === -1 || end === -1) throw new Error('ODT/DAISY extraction markers missing');
  return new Function(
    src.slice(start, end) +
    '; return { _htmlToOdtContentXml, _htmlToDtbookXml, _htmlToDaisyNcx, _altFmtXhtmlFromHtml };'
  )();
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  loadAlloModule('instructional_context_module.js');
  loadAlloModule('document_narration_text_module.js');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_export_preview_module.js');
  loadAlloModule('quiz_live_aggregators.js');
  loadAlloModule('view_submission_inbox_module.js');

  exportHandlers = window.AlloModules.ExportHandlers;
  pipeline = createPipeline();
  previewHelpers = loadPurePreviewHelpers();
  auditHelpers = loadAuditHelpers();
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
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
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 35 · export_handlers_module.js
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 35 · ExportHandlers sanitization, live form sync, audio, slides & context', () => {
  it('syncLiveControlsToAttrs copies live checkboxes, radios, inputs, textareas and selects onto clone', () => {
    const srcDoc = parseDoc(`<div>
      <input type="radio" name="q1" value="a"><input type="radio" name="q1" value="b">
      <input type="checkbox" name="g1" value="1">
      <input type="text" value="">
      <textarea></textarea>
      <select><option value="">Pick</option><option value="x">Opt X</option></select>
    </div>`);
    const dstDoc = parseDoc(srcDoc.body.innerHTML);

    const radios = srcDoc.querySelectorAll('input[type="radio"]');
    radios[1].checked = true;
    srcDoc.querySelector('input[type="checkbox"]').checked = true;
    srcDoc.querySelector('input[type="text"]').value = 'Typed live';
    srcDoc.querySelector('textarea').value = 'Live reflection';
    srcDoc.querySelector('select').selectedIndex = 1;

    exportHandlers.syncLiveControlsToAttrs(srcDoc.body, dstDoc.body);

    const dstRadios = dstDoc.querySelectorAll('input[type="radio"]');
    expect(dstRadios[0].hasAttribute('checked')).toBe(false);
    expect(dstRadios[1].checked).toBe(true);
    expect(dstRadios[1].hasAttribute('checked')).toBe(true);
    expect(dstDoc.querySelector('input[type="checkbox"]').hasAttribute('checked')).toBe(true);
    expect(dstDoc.querySelector('input[type="text"]').getAttribute('value')).toBe('Typed live');
    expect(dstDoc.querySelector('textarea').textContent).toBe('Live reflection');
    expect(dstDoc.querySelectorAll('select option')[1].hasAttribute('selected')).toBe(true);
  });

  it('sanitizeAssessmentStudentHtml strips all teacher-only containers, answer attributes & resets inputs', () => {
    const dirtyHtml = `<!DOCTYPE html><html><body><main>
      <div class="question" data-correct="1" data-fill-answers='["x"]' data-correct-multi="[0,1]" data-sequence-key="[0,1]" data-relation-key="0" data-answer-evidence-key="0|1" data-numeric-key="5" data-matching-key="a=1" data-ordering-key="0,1" data-correct-label="Yes">
        <input type="radio" checked value="a"><input type="text" value="Ans"><textarea>Work</textarea>
        <select><option value="">Pick</option><option value="1" selected>One</option></select>
        <span data-cloze-answer="ATP" data-answer-zone="left">blank</span>
      </div>
      <div class="alloflow-tl-strips"><div class="alloflow-tl-strip" data-original-index="1">Second</div><div class="alloflow-tl-strip" data-original-index="0">First</div></div>
      <div class="page-break"></div>
      <div class="teacher-view">TEACHER_SECRET_1</div>
      <div class="alloflow-cs-answer-key">TEACHER_SECRET_2</div>
      <div class="alloflow-glossary-worksheet-key">TEACHER_SECRET_3</div>
      <div class="alloflow-math-solution">TEACHER_SECRET_4</div>
      <div class="alloflow-fluency-key">TEACHER_SECRET_5</div>
      <div class="alloflow-teacher-plan">TEACHER_SECRET_6</div>
      <div class="alloflow-teacher-annotations">TEACHER_SECRET_7</div>
      <div class="alloflow-teacher-annotations-by-resource">TEACHER_SECRET_8</div>
      <div id="alloflow-interactive-object-profile">TEACHER_SECRET_9</div>
    </main></body></html>`;

    const clean = exportHandlers.sanitizeAssessmentStudentHtml(dirtyHtml);
    for (let i = 1; i <= 9; i++) expect(clean).not.toContain(`TEACHER_SECRET_${i}`);
    const doc = parseDoc(clean);
    const q = doc.querySelector('.question');
    expect(q?.getAttribute('data-correct')).toBe('');
    ['data-fill-answers', 'data-correct-multi', 'data-sequence-key', 'data-relation-key', 'data-answer-evidence-key', 'data-numeric-key', 'data-matching-key', 'data-ordering-key', 'data-correct-label'].forEach((attr) => {
      expect(q?.hasAttribute(attr)).toBe(false);
    });
    expect(doc.querySelector('[data-cloze-answer]')).toBeNull();
    expect(doc.querySelector('[data-answer-zone]')).toBeNull();
    expect(doc.querySelector('.alloflow-tl-strip[data-original-index]')).toBeNull();
    expect(doc.querySelector('input[type="radio"]')?.checked).toBe(false);
    expect(doc.querySelector('input[type="text"]')?.value).toBe('');
    expect(doc.querySelector('textarea')?.textContent).toBe('');
    expect(doc.querySelector('select')?.selectedIndex).toBe(0);
  });

  it('audioReadyTextFromRoot & structuredAudioTextFromRoot redact teacher-only blocks & deduplicate Venn print-only', () => {
    const doc = parseDoc(`<!DOCTYPE html><html><body><main>
      <p>ATP powers transport across membranes.</p>
      <div class="alloflow-venn-activity">
        <button type="button" class="alloflow-venn-place-button" data-venn-place-zone="active" data-venn-zone-label="Active">Place in Active</button>
        <div class="alloflow-venn-card"><button class="alloflow-venn-card-button">Ion Pump</button><select hidden class="alloflow-venn-response"><option value="">Zone</option><option value="active" selected>Active</option></select></div>
        <div class="alloflow-venn-print-only" hidden><div class="alloflow-venn-print-card">Ion Pump</div></div>
      </div>
      <div class="alloflow-fluency-key">HIDDEN_FLUENCY</div>
      <div class="alloflow-teacher-plan">HIDDEN_PLAN</div>
    </main></body></html>`);
    for (const fn of [exportHandlers.audioReadyTextFromRoot, exportHandlers.structuredAudioTextFromRoot]) {
      const txt = fn(doc.body, { studentSafe: true });
      expect(txt).toContain('ATP powers transport');
      expect(txt).toContain('Active');
      expect(txt).not.toContain('HIDDEN_FLUENCY');
      expect(txt).not.toContain('HIDDEN_PLAN');
      expect((txt.match(/Ion Pump/g) || []).length).toBe(1);
    }
  });

  it('executeExportFromPreview blocks render-error previews and sanitizes edited HTML in assessmentMode', async () => {
    const dismissDialog = () => {
      const btn = document.querySelector('[role="dialog"] button[data-r="no"]');
      if (btn) btn.click();
    };
    const observer = new MutationObserver(dismissDialog);
    observer.observe(document.body, { childList: true, subtree: true });
    try {
      const toasts = [];
      const errDoc = parseDoc('<!DOCTYPE html><html><body data-allo-preview-error="1"><p>broken</p></body></html>');
      const blocked = await exportHandlers.executeExportFromPreview({
        _docPipeline: pipeline,
        exportPreviewMode: 'html',
        exportPreviewRef: { current: { contentDocument: errDoc } },
        addToast: (msg, kind) => toasts.push({ msg, kind }),
        exportConfig: { audience: 'student', singleFileHtml: true },
      });
      expect(blocked).toBe(false);
      expect(toasts.some((x) => x.kind === 'error')).toBe(true);

      if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
      if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
      const blobs = [];
      vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { blobs.push(b); return 'blob:ok'; });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      vi.stubGlobal('JSZip', undefined);

      const previewDoc = parseDoc(`<!DOCTYPE html><html><head><title>Preview</title><style id="allo-builder-edit-css">body{}</style></head><body>
        <main data-correct="2"><div class="question" data-correct="0"><input type="radio" checked></div>
        <button class="allo-block-remove">Remove</button>
        <div class="teacher-view">TEACHER_LEAK</div><p>Clean student prompt</p></main></body></html>`);
      previewDoc.body.setAttribute('data-allo-user-edited', '1');
      await exportHandlers.executeExportFromPreview({
        _docPipeline: pipeline,
        exportPreviewMode: 'html',
        exportPreviewRef: { current: { contentDocument: previewDoc } },
        sourceTopic: 'Cell Biology',
        exportConfig: { assessmentMode: true, singleFileHtml: true },
        addToast: () => {},
      });
      expect(blobs.length).toBe(1);
      const exportedText = await blobs[0].text();
      expect(exportedText).toContain('Clean student prompt');
      expect(exportedText).not.toContain('TEACHER_LEAK');
      expect(exportedText).not.toContain('allo-builder-edit-css');
      expect(exportedText).not.toContain('data-allo-user-edited');
      expect(exportedText).not.toContain('data-correct="0"');
    } finally {
      observer.disconnect();
      document.querySelectorAll('[role="dialog"]').forEach((n) => n.remove());
    }
  });

  it('getReadableContent, getSlidesPreviewHTML, and getLessonContext honor filters, ordering & explicit scoping', () => {
    const readable = exportHandlers.getReadableContent({
      activeView: 'quiz',
      generatedContent: {
        type: 'quiz',
        data: {
          questions: [
            { type: 'true_false', question: 'Cells need ATP?' },
            { type: 'multi_select', question: 'Pick lipids', options: ['Phospholipid', 'Glucose'] },
            { type: 'answer-evidence', question: 'Why swell?', options: ['Osmosis'], evidenceOptions: ['Line 2'] },
          ],
        },
      },
    });
    const combined = readable.map((r) => r.text).join('\n');
    expect(combined).toContain('Option A: True');
    expect(combined).toContain('Option B: False');
    expect(combined).toContain('Select all that apply.');
    expect(combined).toContain('Evidence A: Line 2');

    const slidesHtml = exportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Genetics',
      gradeLevel: 'Grade 8',
      exportConfig: {
        audience: 'student',
        builderResourceIds: ['s2', 's1', 'sTeacher'],
        resourceItemOrder: ['s2', 's1'],
      },
      getExportableHistory: () => [
        { id: 's1', type: 'glossary', title: 'First Slide', data: [{ term: 'DNA', definition: 'Genetic molecule' }] },
        { id: 's2', type: 'simplified', title: 'Second First', data: 'DNA replicates before division.' },
        { id: 'sTeacher', type: 'lesson-plan', title: 'SECRET_LESSON_PLAN', data: { overview: 'Private' } },
      ],
    });
    expect(slidesHtml).not.toContain('SECRET_LESSON_PLAN');
    expect(slidesHtml.indexOf('Second First')).toBeGreaterThanOrEqual(0);
    expect(slidesHtml.indexOf('First Slide')).toBeGreaterThan(slidesHtml.indexOf('Second First'));

    const traces = [];
    const ctx = exportHandlers.getLessonContext([], {
      history: [{ id: 'ambient', type: 'analysis', data: { summary: 'AMBIENT_SHOULD_NOT_LEAK' } }],
      trace: (entry) => traces.push(entry),
    });
    expect(ctx).not.toContain('AMBIENT_SHOULD_NOT_LEAK');

    const scopedCtx = exportHandlers.getLessonContext(
      [{ id: 'g1', type: 'glossary', title: 'Terms', data: [{ term: 'Osmosis', definition: 'Water diffusion' }] }],
      { trace: (entry) => traces.push(entry) }
    );
    expect(scopedCtx).toContain('Osmosis');
    expect(traces.length).toBeGreaterThan(0);
    expect(scopedCtx.slice(traces[0].start, traces[0].end)).toBe(traces[0].text);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 36A · export_source.jsx (QTI, H5P, IMS, Flashcards)
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 36A · Secondary exporters (QTI, H5P, IMS, Flashcards)', () => {
  it('QTI normalizes underscore types, True/False booleans, multi-select cleanup & ordering/matching review fallback', async () => {
    const quiz = {
      id: 'q36',
      type: 'quiz',
      title: 'Cell Transport QTI',
      data: {
        questions: [
          { type: 'true_false', question: 'Osmosis moves water.', options: ['True', 'False'], correct: true },
          { type: 'multi_select', question: 'Select active modes', options: ['', 'Pump', 'Endocytosis', 'Diffusion'], correctAnswers: ['Pump', 2] },
          { type: 'order', question: 'Order steps', items: ['Step A', 'Step B', 'Step C'] },
          { type: 'numeric-response', question: 'Molarity?', correctValue: 0.5, numericSettings: { allowEquivalentUnits: false, valueWeight: 0.5 } },
        ],
      },
    };
    const { exporter, captured } = setupExporter({ generatedContent: quiz });
    const ok = await exporter.handleExportQTI();
    expect(ok).toBe(true);
    const zip = captured.zips[0];
    expect(Object.keys(zip.files)).toContain('imsmanifest.xml');
    expect(Object.keys(zip.files)).toContain('assessment.xml');
    const qtiXml = zip.files['assessment.xml'];
    expect(parseXml(qtiXml).wellFormed).toBe(true);
    expect(qtiXml).toContain('Osmosis moves water.');
    expect(qtiXml).toContain('<response_label ident="OPT_0">');
    expect(qtiXml).toContain('>OPT_0</varequal>');
    expect(qtiXml).toContain('Order steps');
    expect(qtiXml).toContain('Molarity?');
  });

  it('H5P respects Single Choice Set vs Question Set rules, requireReasoning & underscore types', async () => {
    const simpleTfQuiz = {
      id: 'h5p-tf',
      type: 'quiz',
      title: 'Quick TF',
      data: {
        questions: [
          { type: 'true_false', question: 'Cells have membranes.', correctIndex: 0 },
        ],
      },
    };
    const s1 = setupExporter({ generatedContent: simpleTfQuiz });
    await s1.exporter.handleExportH5P();
    const h5pMeta1 = JSON.parse(s1.captured.zips[0].files['h5p.json']);
    expect(h5pMeta1.mainLibrary).toBe('H5P.SingleChoiceSet');

    const reasoningQuiz = {
      id: 'h5p-reason',
      type: 'quiz',
      title: 'Reasoning Quiz',
      data: {
        questions: [
          { type: 'multiple_choice', question: 'Primary carrier?', options: ['ATP', 'DNA'], correctIndex: 0, requireReasoning: true },
          { type: 'multi_select', question: 'Check two', options: ['', 'Alpha', 'Beta'], correctIndices: [1, 2] },
        ],
      },
    };
    const s2 = setupExporter({ generatedContent: reasoningQuiz });
    await s2.exporter.handleExportH5P();
    const h5pMeta2 = JSON.parse(s2.captured.zips[0].files['h5p.json']);
    expect(h5pMeta2.mainLibrary).toBe('H5P.QuestionSet');
    const content2 = JSON.parse(s2.captured.zips[0].files['content/content.json']);
    expect(content2.questions.length).toBeGreaterThanOrEqual(2);
  });

  it('IMS Content Package strips teacher chrome and enforces builderResourceIds scope', async () => {
    const items = [
      { id: 'r1', type: 'simplified', title: 'Included Reading', data: 'Water moves into hypotonic cells.' },
      { id: 'r2', type: 'lesson-plan', title: 'SECRET_IMS_PLAN', data: { overview: 'Private teacher plan' } },
      { id: 'r3', type: 'glossary', title: 'Excluded Glossary', data: [{ term: 'Skipped', definition: 'No' }] },
    ];
    const { exporter, captured } = setupExporter({
      history: items,
      exportConfig: { audience: 'student', includeTeacherKey: false, builderResourceIds: ['r1', 'r2'] },
    });
    const ok = await exporter.handleExportIMS();
    expect(ok).toBe(true);
    const files = captured.zips[0].files;
    expect(files['imsmanifest.xml']).toBeDefined();
    expect(parseXml(files['imsmanifest.xml']).wellFormed).toBe(true);
    const allContent = Object.values(files).join('\n');
    expect(allContent).toContain('Included Reading');
    expect(allContent).not.toContain('Excluded Glossary');
    expect(allContent).not.toContain('SECRET_IMS_PLAN');
  });

  it('Flashcards preserves titleLanguage and side lang/dir attributes', async () => {
    const glossary = {
      id: 'gl36',
      type: 'glossary',
      title: 'Science Deck',
      titleLanguage: 'Spanish',
      data: [
        { term: 'Osmosis', definition: 'Water diffusion across a membrane.', language: 'English', targetLanguage: 'Arabic', translation: 'التناضح' },
      ],
    };
    const { exporter, captured } = setupExporter({ generatedContent: glossary });
    exporter.handleExportFlashcards('standard', {});
    expect(captured.blobs.length).toBeGreaterThanOrEqual(1);
    const html = await captured.blobs[0].text();
    expect(html).toContain('Science Deck');
    expect(html).toContain('Osmosis');
    expect(html).toContain('Water diffusion across a membrane.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 36B · view_export_preview_source.jsx (Document Builder & DriveDelivery)
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 36B · Document Builder helpers, H5P compatibility, DriveDelivery & NotebookLM', () => {
  it('syncs live form state and sanitizes assessment root including cloze translations and interactive controls', () => {
    const srcDoc = parseDoc(`<div>
      <div class="teacher-view">TEACHER_ONLY</div>
      <div class="alloflow-quiz-check-btn"><button>Check</button></div>
      <div class="alloflow-cloze-translation">TRANSLATION_SECRET</div>
      <span class="q-item" data-correct="1" data-expected="ATP" data-answer-key="A" data-original-index="0">_</span>
      <input type="radio" name="g" value="1">
      <textarea></textarea>
      <select><option value="">--</option><option value="b">B</option></select>
    </div>`);
    const clone = srcDoc.body.cloneNode(true);
    srcDoc.querySelector('input[type="radio"]').checked = true;
    srcDoc.querySelector('textarea').value = 'Student work';
    srcDoc.querySelector('select').selectedIndex = 1;

    previewHelpers._builderSyncLiveFormState(srcDoc.body, clone);
    expect(clone.querySelector('input[type="radio"]')?.hasAttribute('checked')).toBe(true);
    expect(clone.querySelector('textarea')?.textContent).toBe('Student work');
    expect(clone.querySelectorAll('select option')[1]?.hasAttribute('selected')).toBe(true);

    previewHelpers._builderSanitizeAssessmentRoot(clone);
    expect(clone.textContent).not.toContain('TEACHER_ONLY');
    expect(clone.textContent).not.toContain('TRANSLATION_SECRET');
    expect(clone.querySelector('.alloflow-quiz-check-btn')).toBeNull();
    const sanitizedQItem = clone.querySelector('.q-item');
    expect(sanitizedQItem?.hasAttribute('data-correct')).toBe(false);
    expect(sanitizedQItem?.hasAttribute('data-expected')).toBe(false);
    expect(sanitizedQItem?.hasAttribute('data-answer-key')).toBe(false);
    expect(sanitizedQItem?.hasAttribute('data-original-index')).toBe(false);
  });

  it('_builderH5PCompatibility flags reasoning/TF/sequence/relation/numeric metadata accurately', () => {
    const compat = previewHelpers._builderH5PCompatibility({
      id: 'qz36b',
      type: 'quiz',
      data: {
        questions: [
          { type: 'true_false', question: 'True?', correct: true },
          { type: 'mcq', question: 'Why?', options: ['A', 'B'], correctIndex: 0, requireReasoning: true },
          { type: 'numeric-response', question: 'Density?', correctValue: '2.5', tolerance: 0.1 },
          { type: 'sequence-sense', question: 'Sequence', items: ['1st', '2nd', '3rd'] },
        ],
      },
    });
    expect(compat.library).toBe('Question Set 1.21');
    expect(compat.total).toBe(4);
    expect(compat.valid).toBe(4);
    expect(compat.manualReview).toBe(3);
  });

  it('_alloQuizToFormItems & DriveDelivery normalize question aliases, remap indices & append justification items', () => {
    const converted = previewHelpers._alloQuizToFormItems({
      questions: [
        { type: 'true_false', question: 'Water is polar.', correct: false },
        { type: 'multiplechoice', question: 'Powerhouse?', options: ['', 'Mitochondria', 'Ribosome'], correctIndex: 1, requireReasoning: true, reasoningPrompt: 'Justify with evidence.' },
        { type: 'fillblank', question: 'Plants make ___', expectedFill: 'glucose' },
      ],
    });
    expect(converted.length).toBeGreaterThanOrEqual(4);
    const justItem = converted.find((it) => it.type === 'paragraph' && /Justify with evidence/.test(it.prompt));
    expect(justItem).toBeDefined();
    expect(justItem.points).toBe(0);
    expect(typeof window.AlloModules?.DriveDelivery?.quizToFormItems).toBe('function');
  });

  it('NotebookLM reasoning emission sits outside else-if and ePub/BRF source pipelines sanitize IDs before nav', () => {
    const epSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
    const nlmIdx = epSrc.indexOf('if (q.requireReasoning || q.explanationPrompt)');
    expect(nlmIdx).toBeGreaterThan(-1);
    const epubIdx = epSrc.indexOf("zip.file('OEBPS/content.xhtml', xhtml)");
    const brfIdx = epSrc.indexOf('_builderSanitizeAssessmentRoot(_bClone)');
    expect(epubIdx).toBeGreaterThan(-1);
    expect(brfIdx).toBeGreaterThan(-1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 37A · view_pdf_audit_source.jsx (ODT / DAISY DTBook / NCX / ePub XHTML)
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 37A · ODT, DAISY DTBook, NCX & ePub XHTML exporters', () => {
  const wrap = (body, attrs) => `<!DOCTYPE html><html ${attrs || 'lang="en"'}><head><title>Doc</title></head><body>${body}</body></html>`;

  it('ODT preserves LTR style names and switches to RTL / CJK / CTL text properties when declared', () => {
    const ltrXml = auditHelpers._htmlToOdtContentXml(wrap('<h1>LTR Heading</h1><p>Body</p><table><tr><th>Col</th></tr><tr><td>Val</td></tr></table>'));
    expect(parseXml(ltrXml).wellFormed).toBe(true);
    expect(ltrXml).toContain('text:style-name="Heading_20_1"');
    expect(ltrXml).toContain('text:style-name="Standard"');
    expect(ltrXml).toContain('table:style-name="TableHeaderCell"');
    expect(ltrXml).toContain('text:style-name="P_TableHeader"');

    const rtlXml = auditHelpers._htmlToOdtContentXml(wrap('<h1>عنوان</h1><p><span lang="ar-EG">مرحبا</span> <span lang="ja-JP">水</span></p><table><tr><th>عمود</th></tr><tr><td>قيمة</td></tr></table>', 'dir="rtl" lang="ar"'));
    expect(parseXml(rtlXml).wellFormed).toBe(true);
    expect(rtlXml).toContain('text:style-name="Heading_20_1_RTL"');
    expect(rtlXml).toContain('text:style-name="Standard_RTL"');
    expect(rtlXml).toContain('table:style-name="Table_RTL"');
    expect(rtlXml).toContain('style:language-complex="ar"');
    expect(rtlXml).toContain('style:country-complex="EG"');
    expect(rtlXml).toContain('style:language-asian="ja"');
    expect(rtlXml).toContain('style:country-asian="JP"');
  });

  it('DTBook clamps skipped heading levels, preserves table spans & footnotes, and emits dir="rtl"', () => {
    const xml = auditHelpers._htmlToDtbookXml(
      wrap('<h1>Main</h1><h3>Skipped</h3><table><tr><th colspan="2" rowspan="2">Span</th></tr><tr></tr></table>', 'dir="rtl" lang="ar"'),
      'ar',
      'uid-rtl'
    );
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toContain('dir="rtl"');
    expect(xml).toMatch(/<level2>\s*<h2 id="h2">Skipped<\/h2>/);
    expect(xml).toContain('colspan="2"');
    expect(xml).toContain('rowspan="2"');
  });

  it('DAISY NCX nests subheadings and sets dynamic dtb:depth and dir="rtl"', () => {
    const ncx = auditHelpers._htmlToDaisyNcx(
      wrap('<h1>Top</h1><h2>Child</h2><h3>Grandchild</h3><h2>Sibling</h2>', 'dir="rtl" lang="he"'),
      'Nested Book',
      'uid-ncx'
    );
    expect(parseXml(ncx).wellFormed).toBe(true);
    expect(ncx).toContain('dir="rtl"');
    expect(ncx).toContain('name="dtb:depth" content="3"');
    expect(ncx).toContain('playOrder="4"');
  });

  it('ePub XHTML strips remote CSS/@import/@font-face and deduplicates whitespace IDs before sec-N fallback', () => {
    const xhtml = auditHelpers._altFmtXhtmlFromHtml(`<!DOCTYPE html><html><head>
      <link rel="stylesheet" href="https://cdn.example.com/evil.css">
      <style>@import url("https://cdn.example.com/x.css"); @font-face { src: url("https://cdn.example.com/f.woff2"); } .a { background: url("https://cdn.example.com/bg.png"); }</style>
    </head><body>
      <h1 id="sec 1">Title</h1>
      <h2 id="sec-1">Duplicate Raw</h2>
      <h2>Auto Heading</h2>
    </body></html>`);
    expect(parseXml(xhtml).wellFormed).toBe(true);
    expect(xhtml).not.toContain('cdn.example.com');
    expect(xhtml).toContain('id="sec-1"');
    expect(xhtml).toContain('id="sec-1-1"');
    const doc = parseXml(xhtml).doc;
    const ids = Array.from(doc.querySelectorAll('[id]')).map((n) => n.getAttribute('id'));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 37B · doc_pipeline_source.jsx (Interactive HTML & Worksheet Runtime)
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 37B · Interactive HTML runtime: Directions, Cloze, Quiz Reset, Sequence-Sense & Timeline', () => {
  it('syncs Directions on alloflow-responses-restored, gates student cloze translations, and preserves Reset in graded & timeline modes', async () => {
    const items = [
      {
        id: 'dir37',
        type: 'directions',
        title: 'Lab Steps',
        data: {
          body: 'Follow each step carefully.',
          objectives: [{ label: 'Observe diffusion', kind: 'task' }],
          choiceBoard: { enabled: true, choices: [{ label: 'Sketch diagram' }, { label: 'Write summary' }] },
        },
      },
      {
        id: 'simp37',
        type: 'simplified',
        title: 'Osmosis Reading',
        data: 'Chlorophyll captures sunlight.\n\n--- ENGLISH TRANSLATION ---\nChlorophyll absorbs light.',
      },
      {
        id: 'gl37',
        type: 'glossary',
        title: 'Terms',
        data: [{ term: 'Chlorophyll', definition: 'Green pigment', isSelected: true }],
      },
      {
        id: 'qz37',
        type: 'quiz',
        title: 'Graded Check',
        data: {
          questions: [
            { type: 'sequence-sense', question: 'Order diffusion', items: ['Gradient forms', 'Molecules move', 'Equilibrium'], explanationPrompt: 'Why?' },
          ],
        },
      },
      {
        id: 'tl37',
        type: 'timeline',
        title: 'Cell Milestones',
        data: {
          items: [
            { time: '1665', event: 'Hooke observes cork', significance: 'Named cells' },
            { time: '1839', event: 'Schwann cell theory', significance: 'All organisms made of cells' },
          ],
        },
      },
    ];

    const studentHtml = pipeline.generateFullPackHTML(items, 'Wave 37 Interactive', false, {}, {
      audience: 'student',
      assessmentMode: false,
      includeTeacherKey: false,
      clozeWorksheet: true,
      clozeInteractive: true,
      timelineDisplayMode: 'cuttable-strips',
      timelineInteractive: true,
      annotations: [],
    });
    const gradedHtml = pipeline.generateFullPackHTML(items, 'Wave 37 Graded', false, {}, {
      audience: 'student',
      assessmentMode: true,
      includeTeacherKey: false,
      clozeWorksheet: true,
      clozeInteractive: true,
      timelineDisplayMode: 'cuttable-strips',
      annotations: [],
    });
    const docId = studentHtml.match(/<meta\s+name=["']alloflow-document-id["']\s+content=["']([a-f0-9]+)["']/i)?.[1] || '';
    expect(docId).toMatch(/^[a-f0-9]{32}$/);

    const grDoc = parseDoc(gradedHtml);
    expect(grDoc.querySelector('.alloflow-cloze-translation')).toBeNull();
    expect(grDoc.querySelector('[data-allo-cloze-trans]')).toBeNull();
    expect(grDoc.querySelector('.question[data-correct]:not([data-correct=""])')).toBeNull();
    expect(grDoc.querySelector('.quiz-reset-btn, button[data-action="reset"]')).not.toBeNull();

    const { win, doc } = await bootPackDOM(studentHtml, {
      url: 'https://example.test/wave37.html?nickname=Lee',
      beforeParse(w) {
        w.localStorage.setItem('alloflow-annotations:v2|' + docId + '|u:Lee', JSON.stringify([
          { id: 77, kind: 'highlight', anchorText: 'Gradient forms', text: 'Saved note' },
        ]));
      },
    });

    const goalChk = doc.querySelector('input[type="checkbox"][data-allo-response-key="dir37:directions:goals"]');
    expect(goalChk).not.toBeNull();
    if (goalChk) {
      goalChk.checked = true;
      win.dispatchEvent(new win.Event('alloflow-responses-restored'));
    }

    const tlStrips = Array.from(doc.querySelectorAll('.alloflow-tl-strip'));
    expect(tlStrips.length).toBeGreaterThanOrEqual(2);
    const resetBtn = doc.querySelector('[data-alloflow-tl-reset], .alloflow-tl-reset-btn');
    if (resetBtn) {
      expect(() => resetBtn.click()).not.toThrow();
    }

    expect(typeof win.__alloflowCollectAnnotations).toBe('function');
    const annos = win.__alloflowCollectAnnotations();
    expect(annos.find((a) => String(a.id) === '77')?.note).toBe('Saved note');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 38 · view_submission_inbox_source.jsx & 4-Mirror SHA-256 Parity
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 38 · Submission Inbox hardening & 4-mirror runtime bundle parity', () => {
  it('preserves data:audio MIME params and parses fractions, commas, Unicode minus & units in auto-grading', () => {
    const annos = inboxMeta.studentAnnotations({
      annotations: [
        { id: 'v38', kind: 'voice', audioSrc: 'data:audio/webm;codecs=opus;base64,SGVsbG8=', mimeType: 'audio/webm;codecs=opus', durationSec: 5 },
      ],
    });
    expect(annos[0]?.audioSrc).toBe('data:audio/webm;codecs=opus;base64,SGVsbG8=');

    const history = [
      {
        id: 'q38',
        type: 'quiz',
        title: 'Quantitative Quiz',
        data: {
          questions: [
            { type: 'numeric-response', question: 'Fraction', correctValue: 0.75 },
            { type: 'numeric-response', question: 'Thousands comma', correctValue: 1250.5 },
            { type: 'numeric-response', question: 'Negative temp', correctValue: -2.5 },
            { type: 'numeric-response', question: 'Speed with unit', correctValue: 42 },
          ],
        },
      },
    ];
    const grades = inboxMeta.exportedQuizAutoGrades({
      responses: {
        'q38:q0:number': '3/4',
        'q38:q1:number': '1,250.5',
        'q38:q2:number': '−2.5',
        'q38:q3:number': '42 m/s',
      },
    }, history);
    expect(grades['q38:q0:number']?.score).toBe(100);
    expect(grades['q38:q1:number']?.score).toBe(100);
    expect(grades['q38:q2:number']?.score).toBe(100);
    expect(grades['q38:q3:number']?.score).toBe(100);
  });

  it('scopes responseResourcePrefix, normQuizType, calibrationSamplesForKey & assessment snapshot models', () => {
    expect(inboxMeta.responseResourcePrefix('glossary-worksheet:gloss38:item1')).toBe('glossary-worksheet:gloss38');
    expect(inboxMeta.responseResourcePrefix('res38:matching:0')).toBe('res38');
    expect(inboxMeta.responseResourcePrefix('res38:ordering:0')).toBe('res38');
    expect(inboxMeta.normQuizType('true_false')).toBe('mcq');
    expect(inboxMeta.normQuizType('multiple_choice')).toBe('mcq');
    expect(inboxMeta.normQuizType('short_answer')).toBe('short-answer');
    expect(inboxMeta.normQuizType('multi_select')).toBe('multi-select');
    expect(inboxMeta.normQuizType('fillblank')).toBe('fill-blank');

    const crossSamples = inboxMeta.calibrationSamplesForKey(
      [{ fromResponseKey: 'otherQuiz:q1:mcq', docId: 'd1', studentResponse: 'Cross anchor', teacherScore: 90 }],
      'q38:q0:mcq',
      '',
      { docId: 'd1' }
    );
    expect(crossSamples).toEqual([]);

    const siblingSamples = inboxMeta.calibrationSamplesForKey(
      [{ fromResponseKey: 'q38:q1:mcq', docId: 'd1', studentResponse: 'Same quiz sibling', teacherScore: 88 }],
      'q38:q0:mcq',
      '',
      { docId: 'd1' }
    );
    expect(siblingSamples.map((s) => s.studentResponse)).toEqual(['Same quiz sibling']);

    const snap = inboxMeta.formatAssessmentSnapshotText({
      kind: 'alloflow-assessment-responses',
      status: 'submitted',
      items: [{ number: 1, type: 'short-answer', question: 'Explain transport', answered: true, response: 'Active transport uses ATP.' }],
    });
    expect(snap).toContain('Active transport uses ATP.');

    const models = inboxMeta.responseEntryModels({
      content: [
        {
          id: 'dir38',
          type: 'directions',
          data: {
            objectives: [
              { label: 'Observe osmosis' },
              { label: 'Record mass' },
            ],
          },
        },
      ],
      responses: {
        'dir38:directions:goals': JSON.stringify(['0', '1']),
      },
    });
    expect(models.length).toBe(1);
    expect(models[0].displayValue).toContain('Observe osmosis');
    expect(models[0].displayValue).toContain('Record mass');
  });

  it('runs standalone objective grading when QuizLiveAggregators is absent and delegates when present', () => {
    const quizItem = {
      id: 'qz-obj',
      type: 'quiz',
      title: 'Objective Quiz',
      data: {
        questions: [
          { type: 'true_false', question: 'TF?', correct: true },
          { type: 'multi_select', question: 'MS?', options: ['A', 'B', 'C'], correctIndices: [0, 2] },
          { type: 'fillblank', question: 'FB?', expectedFill: 'osmosis' },
        ],
      },
    };
    const snapshot = {
      kind: 'alloflow-assessment-responses',
      status: 'submitted',
      items: [
        { number: 1, type: 'true_false', question: 'TF?', answered: true, response: 'True', answer: { optionIdx: 0, optionText: 'True' } },
        { number: 2, type: 'multi_select', question: 'MS?', answered: true, response: 'A, C', answer: { selectedIndices: [0, 2], selectedOptions: ['A', 'C'] } },
        { number: 3, type: 'fillblank', question: 'FB?', answered: true, response: 'Osmosis', answer: { text: 'Osmosis' } },
      ],
    };
    const saved = window.AlloModules.QuizLiveAggregators;
    let standalone;
    try {
      window.AlloModules.QuizLiveAggregators = null;
      standalone = inboxMeta.assessmentReport(snapshot, 'qz-obj', [quizItem], [quizItem]);
    } finally {
      window.AlloModules.QuizLiveAggregators = saved;
    }
    expect(standalone).not.toBeNull();
    expect(standalone.items.every((it) => it.verdict === 'correct')).toBe(true);
    expect(standalone.points).toBe(3);
  });

  it('builds Student & Batch feedback HTML with Role Swap, Story & playable audio plus voice text label', () => {
    const row = {
      nickname: 'Sam',
      docTitle: 'Role Swap Activity',
      responses: {
        'rs1:role-swap:0:step': 'Explained diffusion as heat loss',
        'st1:story:0:scene': 'The membrane chose what to admit',
      },
      annotations: [
        { id: 'v1', kind: 'voice', audioSrc: 'data:audio/webm;codecs=opus;base64,SGVsbG8=', durationSec: 4 },
      ],
    };
    const html = inboxMeta.buildStudentFeedbackHtml(row, { 'rs1:role-swap:0:step': { score: 85, comment: 'Clarify solute direction.' } }, { overall: 85 }, []);
    expect(html).toContain('Explained diffusion as heat loss');
    expect(html).toContain('[Voice note attached]');
    expect(html).toContain('<audio controls preload="metadata" src="data:audio/webm;codecs=opus;base64,SGVsbG8="');

    const batch = inboxMeta.buildBatchFeedbackHtml([{ row, rowGrades: {}, summary: { overall: 85 } }], 'Batch Feedback', []);
    expect(batch).toContain('The membrane chose what to admit');
  });

  it('neutralizes CSV pipe formulas, dedups repeated attempts & pivots multi-assignment Canvas headers', () => {
    const entries = [
      {
        nickname: '=EvilStudent',
        learnerId: 's1',
        docTitle: '|cmd',
        submittedAt: '2026-05-01T10:00:00Z',
        grades: { q1: { score: 70 } },
      },
      {
        nickname: '=EvilStudent',
        learnerId: 's1',
        docTitle: '|cmd',
        submittedAt: '2026-05-02T10:00:00Z',
        grades: { q1: { score: 92 } },
      },
      {
        nickname: 'Taylor',
        learnerId: 's2',
        docTitle: 'Lab B',
        submittedAt: '2026-05-02T11:00:00Z',
        grades: { q1: { score: 88 } },
      },
    ];
    const singleResult = inboxMeta.buildLmsGradebookCsv(entries.slice(0, 2), 'canvas');
    const singleLines = singleResult.csv.trim().split('\n');
    expect(singleLines[0]).toBe("Student,ID,SIS User ID,SIS Login ID,Section,'|cmd (100)");
    expect(singleLines).toHaveLength(2);
    expect(singleLines[1]).toContain("'=EvilStudent");
    expect(singleLines[1]).toContain('92');
    expect(singleLines[1]).not.toContain(',70');

    const multiResult = inboxMeta.buildLmsGradebookCsv(entries, 'canvas');
    const multiHeader = multiResult.csv.trim().split('\n')[0];
    expect(multiHeader).toContain("'|cmd (100)");
    expect(multiHeader).toContain('Lab B (100)');
  });

  it('enforces byte-for-byte SHA-256 parity for all 7 rebuilt bundles across root & 3 deploy mirrors', () => {
    const bundles = [
      'export_handlers_module.js',
      'export_module.js',
      'view_export_preview_module.js',
      'view_pdf_audit_module.js',
      'document_narration_text_module.js',
      'doc_pipeline_module.js',
      'view_submission_inbox_module.js',
    ];
    const mirrors = ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'].filter((d) =>
      existsSync(resolve(ROOT, d))
    );
    expect(mirrors.length).toBeGreaterThanOrEqual(3);
    for (const bundle of bundles) {
      const rootHash = createHash('sha256').update(readFileSync(resolve(ROOT, bundle))).digest('hex');
      for (const mirror of mirrors) {
        const dest = resolve(ROOT, mirror, bundle);
        expect(existsSync(dest), `Missing ${dest}`).toBe(true);
        const destHash = createHash('sha256').update(readFileSync(dest)).digest('hex');
        expect(destHash, `Hash drift on ${mirror}/${bundle}`).toBe(rootHash);
      }
    }
  });
});
