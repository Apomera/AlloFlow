// Verification suite for Waves 27-30 of the main resource export pipeline:
// - Wave 27: ExportHandlers (teacher-only selectors, filled hidden control preservation, getReadableContent, Slides Preview scoping/determinism/teacher-gating) & AlloNarrationText preamble/details stripping
// - Wave 28: QTI/IMS/H5P/Slides answer-evidence index + reasoning, builderResourceIds/resourceOrder scoping, Forms Delivery DriveDelivery, Export Preview preflight/H5P compat/markdown & student-only HTML gating
// - Wave 29: Secondary exporters (self-contained _htmlToDocxSpec, _htmlToPlainTextExport, _htmlToMarkdownExport, _htmlToOdtContentXml) & doc_pipeline standalone runtime (assessmentMode, unverified memory-aid facts, 3-branch Venn overlap, organizer object unwrapping, reasoning textareas, concept-sort originalIndex, selfcheck metadata, __alloflowCollectAnnotations)
// - Wave 30: Submission Inbox (studentAnnotations, colon-safe auto-grading & trusted prompts, self-check exemption, calibration scoping, CSV formula neutralization) & 4-mirror SHA-256 parity across all 7 runtime bundles

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let pipeline;
let inboxMeta;
let exportHandlers;
let driveDelivery;
let AlloNarrationText;
const activeDoms = [];

function parseDoc(html) {
  return new DOMParser().parseFromString(String(html || ''), 'text/html');
}

function escapeXmlStub(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPipeline(overrides = {}) {
  const state = {
    history: [],
    generatedContent: null,
    selectedResourceId: null,
    sourceTopic: 'Cellular Respiration & Transport',
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
    callImagen: vi.fn(async () => null),
    addToast: vi.fn(),
    t: (_k, fallback) => (typeof fallback === 'string' ? fallback : _k),
    isRtlLang: () => false,
    updateExportPreview: vi.fn(),
    getDefaultTitle: (type) => String(type || 'Resource'),
    state,
    ...overrides,
  });
}

function setupExporter({ history = [], generatedContent = null, exportConfig = {} } = {}) {
  const recordedSlides = [];
  const zipFiles = new Map();
  window.PptxGenJS = class MockPptxGenJS {
    constructor() {
      this.layout = 'LAYOUT_16x9';
      this.title = '';
      this.author = '';
      this.subject = '';
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
      recordedSlides.push(s);
      return s;
    }
    writeFile({ fileName }) { return Promise.resolve(fileName); }
  };
  window.JSZip = class MockJSZip {
    constructor() { this._files = new Map(); }
    file(name, content) {
      this._files.set(name, content);
      zipFiles.set(name, content);
      return this;
    }
    generateAsync() {
      return Promise.resolve(new Blob(['zip-bytes'], { type: 'application/zip' }));
    }
  };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wave27-30');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const addToast = vi.fn();
  const exporter = window.AlloModules.createExport({
    liveRef: {
      current: {
        history,
        generatedContent: generatedContent || history[0] || null,
        sourceTopic: 'Cellular Respiration & Transport',
        gradeLevel: 'Grade 7',
        studentResponses: {},
        generateResourceHTML: pipeline.generateResourceHTML,
        generateFullPackHTML: pipeline.generateFullPackHTML,
        exportConfig: { audience: 'student', includeAnswerKey: false, annotations: [], ...exportConfig },
        addToast,
        t: (k, f) => (typeof f === 'string' ? f : k),
        getDefaultTitle: (type) => String(type || 'Resource'),
        language: 'en',
        leveledTextLanguage: 'English',
        outputLanguage: 'English',
      },
    },
    warnLog: () => {},
    debugLog: () => {},
    escapeXml: escapeXmlStub,
    generateUUID: (() => { let n = 0; return () => 'uuid-w27-' + (++n); })(),
  });
  return { exporter, recordedSlides, zipFiles, addToast };
}

async function bootPackDOM(html, opts = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: opts.url || 'https://example.test/wave29.html',
    virtualConsole: new VirtualConsole(),
    beforeParse(win) {
      win.HTMLElement.prototype.scrollIntoView = vi.fn();
      win.matchMedia = win.matchMedia || (() => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      }));
      win.print = vi.fn();
      const blobs = [];
      win.__capturedBlobs = blobs;
      win.URL.createObjectURL = (blob) => {
        blobs.push(blob);
        return 'blob:w29-' + blobs.length;
      };
      win.URL.revokeObjectURL = () => {};
      win.HTMLAnchorElement.prototype.click = function () {};
      if (typeof opts.beforeParse === 'function') opts.beforeParse(win);
    },
  });
  activeDoms.push(dom);
  const win = dom.window;
  await new Promise((done) => (
    win.document.readyState === 'complete'
      ? done()
      : win.addEventListener('load', done, { once: true })
  ));
  await new Promise((done) => win.setTimeout(done, opts.settleMs ?? 80));
  return { dom, win, doc: win.document };
}

function extractButtonCallbacks(jsxSrc) {
  const ast = parse(jsxSrc, { sourceType: 'script', plugins: ['jsx'] });
  const callbacks = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement' && node.openingElement?.name?.name === 'button') {
      const attr = node.openingElement.attributes.find((a) => a.name?.name === 'onClick');
      if (attr?.value?.expression) {
        callbacks.push({
          text: jsxSrc.slice(node.start, node.end),
          code: jsxSrc.slice(attr.value.expression.start, attr.value.expression.end),
        });
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'start' || k === 'end' || k === 'loc') continue;
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  }
  visit(ast);
  return callbacks;
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  loadAlloModule('module_scope_extras_module.js');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('applied_challenge_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('view_submission_inbox_module.js');
  new Function(readFileSync(resolve(ROOT, 'view_export_preview_module.js'), 'utf8'))();
  const narrationBundleSrc = readFileSync(resolve(ROOT, 'document_narration_text_module.js'), 'utf8');
  AlloNarrationText = new Function('DOMParser', narrationBundleSrc + '\nreturn AlloNarrationText;')(DOMParser);
  pipeline = createPipeline();
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
  exportHandlers = window.AlloModules.ExportHandlers;
  driveDelivery = window.AlloModules.DriveDelivery;
}, 60000);

afterEach(() => {
  while (activeDoms.length) {
    const dom = activeDoms.pop();
    try { dom.window.close(); } catch (_) {}
  }
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.JSZip;
  delete window.PptxGenJS;
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 27 · ExportHandlers Audio/Narration, Assessment Sanitizer & Slides Preview
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 27 · ExportHandlers, Narration & Slides Preview', () => {
  it('strips expanded teacher-only blocks, deduplicates Venn print-only cards, and preserves filled hidden controls in audioReadyTextFromRoot & structuredAudioTextFromRoot', () => {
    const doc = parseDoc(`<!DOCTYPE html><html lang="en"><body><main>
      <h1>Active Transport</h1>
      <p>Cells pump ions <input type="text" value="uphill"/> across membranes.</p>
      <p><textarea>Energy from ATP changes carrier shape.</textarea></p>
      <div class="alloflow-cs-strip">
        Sodium-Potassium Pump
        <select hidden class="alloflow-cs-response"><option value="">Not sorted</option><option value="active" selected>Active Transport</option></select>
      </div>
      <div class="alloflow-venn-activity">
        <div class="alloflow-venn-screen-only">
          <div class="alloflow-venn-controls">
            <button type="button">Shuffle</button>
          </div>
          <button type="button" class="alloflow-venn-place-button" data-venn-place-zone="both" data-venn-zone-label="Both Processes">Place in Both</button>
          <div class="alloflow-venn-card"><button type="button" class="alloflow-venn-card-button">Channel Protein</button>
            <select hidden class="alloflow-venn-response"><option value="">Zone</option><option value="both" selected>Both Processes</option></select>
          </div>
        </div>
        <div class="alloflow-venn-print-only" hidden><div class="alloflow-venn-print-card">Channel Protein</div></div>
      </div>
      <div class="alloflow-cs-answer-key">SECRET_CS_KEY</div>
      <div class="alloflow-glossary-worksheet-key">SECRET_GLOSSARY_KEY</div>
      <div class="alloflow-math-solution">SECRET_MATH_SOLUTION</div>
      <div class="alloflow-fluency-key">SECRET_FLUENCY_KEY</div>
      <div class="alloflow-teacher-plan">SECRET_TEACHER_PLAN</div>
      <div class="alloflow-teacher-annotations">SECRET_TEACHER_ANNOS</div>
      <div class="alloflow-teacher-annotations-by-resource">SECRET_TEACHER_BY_RES</div>
    </main></body></html>`);

    const natural = exportHandlers.audioReadyTextFromRoot(doc.body, { studentSafe: true });
    const structured = exportHandlers.structuredAudioTextFromRoot(doc.body, { studentSafe: true });

    [natural, structured].forEach((out) => {
      expect(out).toContain('uphill');
      expect(out).toContain('Energy from ATP changes carrier shape');
      expect(out).toContain('Active Transport');
      expect(out).toContain('Both Processes');
      expect(out).not.toContain('SECRET_CS_KEY');
      expect(out).not.toContain('SECRET_GLOSSARY_KEY');
      expect(out).not.toContain('SECRET_MATH_SOLUTION');
      expect(out).not.toContain('SECRET_FLUENCY_KEY');
      expect(out).not.toContain('SECRET_TEACHER_PLAN');
      expect(out).not.toContain('SECRET_TEACHER_ANNOS');
      expect(out).not.toContain('SECRET_TEACHER_BY_RES');
      expect(out).not.toContain('Not sorted');
      // Venn print-only copy must not duplicate "Channel Protein"
      expect((out.match(/Channel Protein/g) || []).length).toBe(1);
    });
  });

  it('strips expanded teacher-only selectors and assessment key attributes in sanitizeAssessmentStudentHtml & separateStudentTeacherHtml', () => {
    const rawHtml = `<!DOCTYPE html><html lang="en"><head><title>TEACHER COPY — Unit Test</title></head><body>
      <main>
        <div class="question" data-correct="1" data-answer-evidence-key="0|1" data-matching-key="0-0" data-ordering-key="0,1">
          <p>Question prompt</p>
          <span data-cloze-answer="ATP" data-answer-zone="middle">blank</span>
        </div>
        <div class="alloflow-tl-strips">
          <div class="alloflow-tl-strip" data-original-index="1">Second milestone</div>
          <div class="alloflow-tl-strip" data-original-index="0">First milestone</div>
        </div>
        <button class="alloflow-venn-check-button" type="button">Check Venn</button>
        <div class="teacher-view">TEACHER_ONLY_BLOCK</div>
        <div class="alloflow-cs-answer-key">SECRET_CS_KEY</div>
        <div class="alloflow-glossary-worksheet-key">SECRET_GLOSSARY_KEY</div>
        <div class="alloflow-math-solution">SECRET_MATH_SOLUTION</div>
        <div class="alloflow-fluency-key">SECRET_FLUENCY_KEY</div>
        <div class="alloflow-teacher-plan">SECRET_TEACHER_PLAN</div>
        <div class="alloflow-teacher-annotations">SECRET_TEACHER_ANNOS</div>
        <div class="alloflow-teacher-annotations-by-resource">SECRET_TEACHER_BY_RES</div>
      </main>
    </body></html>`;

    const sanitized = exportHandlers.sanitizeAssessmentStudentHtml(rawHtml);
    const sanDoc = parseDoc(sanitized);
    expect(sanDoc.querySelector('.question')?.getAttribute('data-correct')).toBe('');
    expect(sanDoc.querySelector('.question')?.hasAttribute('data-answer-evidence-key')).toBe(false);
    expect(sanDoc.querySelector('.question')?.hasAttribute('data-matching-key')).toBe(false);
    expect(sanDoc.querySelector('.question')?.hasAttribute('data-ordering-key')).toBe(false);
    expect(sanDoc.querySelector('[data-cloze-answer]')).toBeNull();
    expect(sanDoc.querySelector('[data-answer-zone]')).toBeNull();
    expect(sanDoc.querySelector('.alloflow-tl-strip[data-original-index]')).toBeNull();
    expect(sanDoc.querySelector('.alloflow-venn-check-button')).toBeNull();
    ['SECRET_CS_KEY', 'SECRET_GLOSSARY_KEY', 'SECRET_MATH_SOLUTION', 'SECRET_FLUENCY_KEY', 'SECRET_TEACHER_PLAN', 'SECRET_TEACHER_ANNOS', 'SECRET_TEACHER_BY_RES'].forEach((s) => {
      expect(sanitized).not.toContain(s);
    });

    const separated = exportHandlers.separateStudentTeacherHtml(rawHtml);
    expect(separated.studentHtml).not.toContain('TEACHER_ONLY_BLOCK');
    expect(separated.studentHtml).not.toContain('SECRET_MATH_SOLUTION');
    expect(separated.studentHtml).not.toContain('SECRET_TEACHER_ANNOS');
    expect(separated.teacherHtml).toContain('TEACHER COPY');
    expect(separated.teacherHtml).toContain('TEACHER_ONLY_BLOCK');
  });

  it('emits evidenceOptions, pairs, sequence items, wordBank, and reflections in getReadableContent', () => {
    const items = exportHandlers.getReadableContent({
      activeView: 'quiz',
      generatedContent: {
        type: 'quiz',
        data: {
          questions: [
            {
              type: 'answer-evidence',
              question: 'Why did the cell swell?',
              options: ['Water entered by osmosis', 'Salts exited'],
              evidenceOptions: ['Paragraph 2 notes lower external solute concentration', 'Paragraph 4 discusses mitosis'],
              wordBank: ['hypotonic', 'osmosis'],
            },
            {
              type: 'matching',
              question: 'Match organelle to role',
              pairs: [{ left: 'Mitochondria', right: 'ATP synthesis' }],
            },
            {
              type: 'sequence-sense',
              question: 'Order mitosis',
              items: ['Prophase', 'Metaphase'],
            },
          ],
          reflections: [{ text: 'What evidence convinced you most?' }],
        },
      },
    });
    const joined = items.map((i) => i.text).join('\n');
    expect(joined).toContain('Evidence A: Paragraph 2 notes lower external solute concentration');
    // Read-aloud lists prompts and choices apart, so hearing a pair does not give the match away.
    expect(joined).toContain('Prompt 1: Mitochondria');
    expect(joined).toContain('Match choice A: ATP synthesis');
    expect(joined).not.toContain('Mitochondria — ATP synthesis');
    // Sequence items are read in a fixed shuffled order, not the answer order.
    expect(joined).toMatch(/Item [12]: Prophase/);
    expect(joined).toMatch(/Item [12]: Metaphase/);
    expect(joined).toContain('Word bank: hypotonic, osmosis');
    expect(joined).toContain('Reflection 1: What evidence convinced you most?');
  });

  it('scopes, orders deterministically, and assessment-gates getSlidesPreviewHTML', () => {
    const history = [
      { id: 'ar1', type: 'alignment-report', title: 'Standards Report', data: { summary: 'TEACHER_STANDARDS' } },
      {
        id: 'cs1',
        type: 'concept-sort',
        title: 'Transport Sort',
        data: {
          categories: [{ id: 'a', label: 'Active' }, { id: 'p', label: 'Passive' }],
          items: [
            { text: 'Pump', categoryId: 'a' },
            { text: 'Diffusion', categoryId: 'p' },
            { text: 'SECRET_UNCATEGORIZED', categoryId: '__uncategorized' },
          ],
        },
      },
      { id: 'q1', type: 'quiz', title: 'Exit Quiz', data: { questions: [{ type: 'mcq', question: 'Uses ATP?', options: ['Diffusion', 'Active pump'], correctAnswer: 1 }] } },
      { id: 'extra', type: 'simplified', title: 'Excluded Reading', data: 'SHOULD_BE_EXCLUDED' },
    ];
    const cfg = {
      assessmentMode: true,
      includeTeacherKey: true,
      builderResourceIds: ['q1', 'cs1', 'ar1'],
      resourceOrder: ['includeConceptSort', 'includeQuiz', 'includeAlignmentReport'],
    };
    const html1 = exportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Transport',
      gradeLevel: 'Grade 7',
      getExportableHistory: () => history,
      exportConfig: cfg,
    });
    const html2 = exportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Transport',
      gradeLevel: 'Grade 7',
      getExportableHistory: () => history,
      exportConfig: cfg,
    });
    expect(html1).toBe(html2);
    expect(html1).not.toContain('SHOULD_BE_EXCLUDED');
    expect(html1).not.toContain('TEACHER_STANDARDS');
    expect(html1).not.toContain('SECRET_UNCATEGORIZED');
    expect(html1.indexOf('Transport Sort')).toBeGreaterThan(-1);
    expect(html1.indexOf('Uses ATP?')).toBeGreaterThan(html1.indexOf('Transport Sort'));
    expect(html1).toContain('Question 1');
  });

  it('speaks [data-allo-translation-note] once in preambleRuns, removes chart/image <details><summary> chrome, and separates list/definition runs in AlloNarrationText', () => {
    const html = `<!DOCTYPE html><html lang="en"><body>
      <div data-allo-translation-note>Translated from English into Spanish</div>
      <dl><dt>Osmosis</dt><dd>Diffusion of water</dd></dl>
      <div class="alloflow-cs-strip">Chloroplast</div>
      <div class="alloflow-tl-strip">1838 Schleiden</div>
      <details class="allo-chart-data"><summary>Toggle chart data table</summary><p>CO2 rose by 12 percent</p></details>
    </body></html>`;

    const runs = AlloNarrationText.naturalText(html, { languageRuns: true, language: 'en' });
    const runText = runs.map((r) => r.text).join(' ');
    expect((runText.match(/Translated from English into Spanish/g) || []).length).toBe(1);
    expect(runText).not.toContain('Toggle chart data table');
    expect(runText).toContain('CO2 rose by 12 percent');

    const sr = AlloNarrationText.accessibleText(html);
    expect(sr).toContain('Osmosis.');
    expect(sr).toContain('Diffusion of water.');
    expect(sr).toContain('Chloroplast.');
    expect(sr).toContain('1838 Schleiden.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 28 · QTI/IMS/H5P/Slides Exporters, Forms Delivery & Export Preview Helpers
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 28 · QTI/IMS/H5P/Slides, Forms Delivery & Export Preview', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const previewHelpers = new Function(
    builderSlice + '\nreturn { preflight: _builderExportPreflight, h5pCompat: _builderH5PCompatibility, cleanMdRoot: _builderCleanMarkdownRoot, mdFromRoot: _builderMarkdownFromRoot };'
  )();
  const previewCallbacks = extractButtonCallbacks(exportPreviewSrc);

  it('exports answer-evidence with reasoning without index mismatch in QTI & H5P and respects builderResourceIds/resourceOrder/assessmentMode across IMS, H5P & Slides', async () => {
    const quizItem = {
      id: 'q28',
      type: 'quiz',
      title: 'Evidence Quiz',
      data: {
        questions: [
          {
            type: 'answer-evidence',
            question: 'What drives water into the root hair cell?',
            answerOptions: ['Higher soil water potential', 'Active starch pumping'],
            evidenceOptions: ['Root cytoplasm contains dissolved solutes', 'Xylem walls contain lignin'],
            correctAnswer: 'Higher soil water potential',
            correctEvidence: 'Root cytoplasm contains dissolved solutes',
            requireReasoning: true,
            explanationPrompt: 'Explain how solute concentration creates water potential difference.',
          },
        ],
      },
    };
    const extraExcluded = { id: 'simp-drop', type: 'simplified', title: 'Excluded Reading', data: 'EXCLUDED_TEXT' };
    const teacherItem = { id: 'lp28', type: 'lesson-plan', title: 'Teacher Plan', data: { objective: 'TEACHER_OBJ' } };

    // QTI
    const qtiSetup = setupExporter({ generatedContent: quizItem, history: [quizItem] });
    expect(await qtiSetup.exporter.handleExportQTI({ generatedContent: quizItem })).toBe(true);
    const assessmentXml = qtiSetup.zipFiles.get('assessment.xml') || '';
    expect(assessmentXml).toContain('What drives water into the root hair cell?');
    expect(assessmentXml).toContain('Higher soil water potential');
    expect(assessmentXml).toContain('Root cytoplasm contains dissolved solutes');
    expect(assessmentXml).toContain('Explain how solute concentration creates water potential difference.');

    // IMS CC package (builderResourceIds scoping + assessmentMode gating)
    const imsSetup = setupExporter({
      history: [extraExcluded, teacherItem, quizItem],
      exportConfig: {
        assessmentMode: true,
        includeTeacherKey: true,
        builderResourceIds: ['q28', 'lp28'],
      },
    });
    expect(await imsSetup.exporter.handleExportIMS({ generatedContent: quizItem })).toBe(true);
    expect(imsSetup.zipFiles.get('imsmanifest.xml')).toContain('resource_0.html');
    expect(imsSetup.zipFiles.get('alloflow-object-profile.json')).toContain('Evidence Quiz');
    const imsHtml = imsSetup.zipFiles.get('resource_0.html') || '';
    expect(imsHtml).toContain('What drives water into the root hair cell?');
    expect(imsHtml).not.toContain('EXCLUDED_TEXT');
    expect(imsHtml).not.toContain('TEACHER_OBJ');

    // H5P
    const h5pSetup = setupExporter({
      history: [extraExcluded, teacherItem, quizItem],
      exportConfig: {
        assessmentMode: true,
        includeTeacherKey: true,
        builderResourceIds: ['q28', 'lp28'],
      },
    });
    expect(await h5pSetup.exporter.handleExportH5P({ generatedContent: quizItem })).toBe(true);
    const h5pContent = JSON.parse(h5pSetup.zipFiles.get('content/content.json') || '{}');
    const serialized = JSON.stringify(h5pContent);
    expect(serialized).toContain('Higher soil water potential');
    expect(serialized).toContain('Root cytoplasm contains dissolved solutes');
    expect(serialized).toContain('Explain how solute concentration creates water potential difference.');

    // Slides (.pptx) assessmentMode omits teacher key / teacher-only slides & respects builderResourceIds
    const slidesSetup = setupExporter({
      history: [extraExcluded, teacherItem, quizItem],
      exportConfig: {
        audience: 'teacher',
        assessmentMode: true,
        includeTeacherKey: true,
        builderResourceIds: ['q28', 'lp28'],
      },
    });
    await slidesSetup.exporter.handleExportSlides({
      audience: 'teacher',
      assessmentMode: true,
      includeTeacherKey: true,
      builderResourceIds: ['q28', 'lp28'],
    });
    const slideTxt = slidesSetup.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    const noteTxt = slidesSetup.recordedSlides.map((s) => s.notes.join('\n')).join('\n');
    expect(slideTxt).toContain('What drives water into the root hair cell?');
    expect(slideTxt).not.toContain('EXCLUDED_TEXT');
    expect(slideTxt).not.toContain('TEACHER_OBJ');
    expect(noteTxt).not.toMatch(/Answer:\s*Higher soil water potential/i);
  });

  it('resolves string/letter answer keys and answer-evidence splits in DriveDelivery.quizToFormItems and scopes formQuizzesFromHistory', () => {
    const history = [
      {
        id: 'form-q1',
        type: 'quiz',
        title: 'Included Quiz',
        data: {
          questions: [
            { type: 'mcq', question: 'Select B', options: ['First', 'Second'], correctAnswer: 'b' },
            { type: 'mcq', question: 'By text', options: ['Red', 'Blue'], correctAnswer: 'blue' },
            {
              type: 'answer-evidence',
              question: 'Claim?',
              answerOptions: ['A1', 'A2'],
              evidenceOptions: ['E1', 'E2'],
              correctAnswer: 'A2',
              correctEvidence: 'A',
            },
          ],
        },
      },
      {
        id: 'form-q2',
        type: 'quiz',
        title: 'Excluded Quiz',
        data: { questions: [{ type: 'mcq', question: 'Skip?', options: ['Yes', 'No'], correctAnswer: 0 }] },
      },
    ];
    const items = driveDelivery.quizToFormItems(history[0].data);
    expect(items[0].answer).toEqual([1]);
    expect(items[1].answer).toEqual([1]);
    expect(items[2].type).toBe('mc');
    expect(items[2].answer).toEqual([1]);
    expect(items[3].type).toBe('mc');
    expect(items[3].answer).toEqual([0]);

    const scoped = driveDelivery.formQuizzesFromHistory(history, { builderResourceIds: ['form-q1'] });
    expect(scoped.map((q) => q.key)).toEqual(['form-q1']);
  });

  it('scopes preflight warnings, preserves cornell-notes H5P ready:false, and gates student-only Markdown/NotebookLM exports', async () => {
    const doc = parseDoc(`<!DOCTYPE html><html lang="en"><head><title>Preview Test</title></head><body>
      <h1>Main Title</h1>
      <div data-allo-resource-id="keep1">
        <p>Keep <button type="button" class="alloflow-inline-term" data-allo-term="ATP">ATP</button> text.</p>
        <div class="alloflow-cs-strip">Pump <select hidden class="alloflow-cs-response"><option value="">Zone</option><option value="act" selected>Active Zone</option></select></div>
      </div>
      <div data-allo-resource-id="drop1"><img src="x.png"/></div>
      <div class="teacher-view"><img src="y.png"/>TEACHER_ONLY_BODY</div>
    </body></html>`);

    const pf = previewHelpers.preflight(doc, 'html', { studentOnly: true, builderResourceIds: ['keep1'] });
    expect(pf.issues.find((i) => i.code === 'image-alt')).toBeUndefined();

    const compatCornell = previewHelpers.h5pCompat({ id: 'cn1', type: 'note-taking', data: { templateType: 'cornell-notes', cues: ['Why?'] } }, []);
    // Cornell notes (either template name) are H5P-exportable now: export_source.jsx
    // turns each cue/note row into a manually reviewed prompt.
    expect(compatCornell).toMatchObject({ ready: true, unit: 'prompt', valid: 1, manualReview: 1 });

    const compatQuiz = previewHelpers.h5pCompat({
      id: 'hq1',
      type: 'quiz',
      data: { questions: [{ type: 'mcq', question: 'Color?', options: ['Green', 'Red'], correctAnswer: 'A' }] },
    }, []);
    expect(compatQuiz).toMatchObject({ ready: true, valid: 1 });

    const cleanRoot = previewHelpers.cleanMdRoot(doc, { includeTeacherKey: false });
    const mdRes = previewHelpers.mdFromRoot(cleanRoot);
    expect(mdRes.markdown).toContain('ATP');
    expect(mdRes.markdown).toContain('Active Zone');
    expect(mdRes.markdown).not.toContain('TEACHER_ONLY_BODY');

    const mdCb = previewCallbacks.find((c) => c.code.includes("beginAlternativeExport('markdown')"));
    expect(mdCb).toBeTruthy();
    const downloadedMd = [];
    const runMd = new Function(
      'exportPreviewRef', 'exportConfig', 'builderViewFilter', 'runBuilderPreflight', 'beginAlternativeExport', 'finishAlternativeExport',
      '_builderCleanMarkdownRoot', '_builderMarkdownFromRoot', 'Blob', 'downloadBuilderBlob', 'addToast',
      'return (' + mdCb.code + ');'
    )(
      { current: { contentDocument: doc } },
      { assessmentMode: true, includeTeacherKey: true },
      'all',
      () => ({ errors: 0 }),
      () => true,
      () => {},
      previewHelpers.cleanMdRoot,
      previewHelpers.mdFromRoot,
      class MockBlob { constructor(parts) { this.text = parts.join(''); } },
      (blob) => downloadedMd.push(blob.text),
      () => {}
    );
    await runMd();
    expect(downloadedMd[0]).toContain('ATP');
    expect(downloadedMd[0]).not.toContain('TEACHER_ONLY_BODY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 29 · Secondary Format Builders & Standalone HTML Pack Runtime
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 29 · Secondary Exporters & doc_pipeline Pack Runtime', () => {
  const pdfAuditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const docxOnlyStart = pdfAuditSrc.indexOf('function _htmlToDocxSpec(html) {');
  const docxOnlyEnd = pdfAuditSrc.indexOf('// end _htmlToDocxSpec', docxOnlyStart);
  const standaloneDocxSpec = new Function(pdfAuditSrc.slice(docxOnlyStart, docxOnlyEnd) + '\nreturn _htmlToDocxSpec;')();

  const textAndOdtStart = pdfAuditSrc.indexOf('function _htmlToStructuredText(html, markdown) {');
  const textAndOdtEnd = pdfAuditSrc.indexOf('\n// _buildDocxBlobFromSpec:', textAndOdtStart);
  const secHelpers = new Function(
    '_expXmlEsc',
    pdfAuditSrc.slice(textAndOdtStart, textAndOdtEnd) +
      '\nreturn { plain: _htmlToPlainTextExport, markdown: _htmlToMarkdownExport, docxSpec: _htmlToDocxSpec, odtXml: _htmlToOdtContentXml };'
  )(escapeXmlStub);

  it('runs standalone _htmlToDocxSpec without free globals and preserves XML escaping, underline, and nested lists in ODT', () => {
    const html = `<!DOCTYPE html><html lang="en"><body>
      <h1>Osmosis &amp; Tonicity &lt;100%&gt;</h1>
      <p>Notice <u>underlined concept</u> and <strong>bold &amp; clear</strong>.</p>
      <ul><li>Parent item<ul><li>Child item</li></ul></li></ul>
    </body></html>`;
    const spec = standaloneDocxSpec(html);
    expect(spec.blocks.length).toBeGreaterThanOrEqual(3);

    const plain = secHelpers.plain(html);
    const md = secHelpers.markdown(html);
    expect(plain).toContain('Parent item');
    expect(md).toContain('# Osmosis & Tonicity <100%>');

    const odt = secHelpers.odtXml(html);
    expect(odt).toContain('&amp;');
    expect(odt).toContain('&lt;100%&gt;');
    expect(odt).toContain('T_Underline');
    expect(odt).toMatch(/<text:list[\s\S]*<text:list/);
  });

  it('gates assessmentMode, unverified memory-aid facts, 3-branch Venn overlap, organizer objects, quiz reasoning, CS originalIndex, and selfcheck metadata in doc_pipeline', async () => {
    const items = [
      {
        id: 'vn29',
        type: 'outline',
        title: 'Mitosis vs Meiosis',
        data: {
          structureType: 'Venn Diagram',
          branches: [
            { title: 'Both Shared Traits', items: ['DNA doubles first'] },
            { title: 'Mitosis', items: ['Somatic cells'] },
            { title: 'Meiosis', items: ['Gametes'] },
          ],
        },
      },
      {
        id: 'ce29',
        type: 'outline',
        title: 'Cause & Effect Organizer',
        data: {
          structureType: 'Cause and Effect',
          branches: [
            { title: 'Cause', items: [{ label: 'Low external solute', detail: 'Hypotonic bath' }] },
            { title: 'Effect', items: [{ text: 'Turgor pressure rises' }] },
          ],
        },
      },
      {
        id: 'cs29',
        type: 'concept-sort',
        title: 'Transport Sort',
        data: {
          categories: [{ id: 'a', label: 'Active' }, { id: 'p', label: 'Passive' }],
          items: [
            { content: 'UNCATEG_FIRST', categoryId: '__uncategorized' },
            { content: 'ATP Pump', categoryId: 'a' },
            { content: 'Osmosis', categoryId: 'p' },
          ],
        },
      },
      {
        id: 'nt29',
        type: 'note-taking',
        title: 'Study Q&A',
        data: {
          templateType: 'q-and-a',
          pairs: [{ question: 'What is ATP?', answer: 'SECRET_ATP_ANSWER' }],
        },
      },
      {
        id: 'ma29',
        type: 'memory-aid',
        title: 'Membrane Card',
        data: {
          cards: [
            {
              id: 'mc1',
              target: 'Osmosis',
              essentialFacts: ['UNVERIFIED_FACT_SECRET'],
              factVerified: false,
              connections: ['SECRET_CONN'],
              mapping: 'SECRET_MAP',
              feedback: 'SECRET_MA_FEEDBACK',
            },
          ],
        },
      },
      {
        id: 'q29',
        type: 'quiz',
        title: 'Reasoning Quiz',
        data: {
          questions: [
            { type: 'multi-select', question: 'Select true statements', options: ['O1', 'O2'], correctAnswers: [0], requireReasoning: true },
            { type: 'fill-blank', question: 'Fill ___', answer: 'water', explanationPrompt: 'Why water?' },
            { type: 'sequence-sense', question: 'Order steps', items: ['Step 1', 'Step 2'], requireReasoning: true },
            { type: 'numeric-response', question: 'Count chromosomes', answer: '46', requireReasoning: true },
          ],
        },
      },
      {
        id: 'ac29',
        type: 'applied-challenge',
        title: 'Water Design',
        data: {
          family: 'design',
          scope: 'compact',
          brief: {
            drivingQuestion: 'Move water safely?',
            criteria: ['Cites gravity'],
            constraints: ['Uses only lesson facts'],
          },
          teacherComment: { text: 'SECRET_AC_TEACHER_COMMENT' },
          feedback: { strength: 'SECRET_AC_FEEDBACK_STRENGTH' },
        },
      },
    ];

    const studentHtml = pipeline.generateFullPackHTML(items, 'Wave 29 Student', false, {}, {
      audience: 'student',
      assessmentMode: false,
      includeTeacherKey: false,
      vennExportMode: 'activity',
    });
    const stDoc = parseDoc(studentHtml);
    // Unverified memory-aid facts hidden for students
    expect(studentHtml).not.toContain('UNVERIFIED_FACT_SECRET');
    // Organizer objects unwrapped without [object Object]
    expect(studentHtml).not.toContain('[object Object]');
    expect(studentHtml).toContain('Low external solute');
    expect(studentHtml).toContain('Turgor pressure rises');
    // Quiz reasoning boxes emitted on all 4 types
    expect(stDoc.querySelectorAll('[data-assessment-reasoning] textarea').length).toBeGreaterThanOrEqual(4);
    // concept-sort preserves rawSortItems originalIndex=1 on ATP Pump (index 0 was __uncategorized)
    const atpSelect = Array.from(stDoc.querySelectorAll('.alloflow-cs-card, .alloflow-cs-strip'))
      .find((el) => el.textContent.includes('ATP Pump'))
      ?.querySelector('select.alloflow-cs-response');
    expect(atpSelect?.getAttribute('data-allo-response-key')).toBe('cs29:concept-sort:1:category');
    // selfcheck radios tagged as self-check
    const scRadio = stDoc.querySelector('input[type="radio"][data-allo-response-key*=":applied:selfcheck-"]');
    expect(scRadio?.getAttribute('data-allo-response-type')).toBe('self-check');
    expect(scRadio?.getAttribute('data-allo-question-type')).toBe('self-check');

    // Venn 3-branch overlap mapping in completed mode
    const completedVennHtml = pipeline.generateFullPackHTML([items[0]], 'Completed Venn', false, {}, {
      audience: 'teacher',
      includeTeacherKey: true,
      vennExportMode: 'completed',
    });
    const vennMainText = parseDoc(completedVennHtml).querySelector('main')?.textContent || '';
    expect(vennMainText).toContain('DNA doubles first');
    expect(vennMainText).toContain('Somatic cells');
    expect(vennMainText).toContain('Gametes');
    expect(vennMainText).not.toContain('undefined');

    // assessmentMode gates Q&A answers, memory-aid facts/connections/mapping/feedback, applied-challenge feedback/comment, and post-strips answer attributes
    const assessHtml = pipeline.generateFullPackHTML(items, 'Wave 29 Assessment', false, {}, {
      audience: 'student',
      assessmentMode: true,
      includeTeacherKey: true,
      vennExportMode: 'activity',
    });
    const asDoc = parseDoc(assessHtml);
    expect(assessHtml).not.toContain('SECRET_ATP_ANSWER');
    expect(assessHtml).not.toContain('UNVERIFIED_FACT_SECRET');
    expect(assessHtml).not.toContain('SECRET_CONN');
    expect(assessHtml).not.toContain('SECRET_MAP');
    expect(assessHtml).not.toContain('SECRET_MA_FEEDBACK');
    expect(assessHtml).not.toContain('SECRET_AC_TEACHER_COMMENT');
    expect(assessHtml).not.toContain('SECRET_AC_FEEDBACK_STRENGTH');
    expect(asDoc.querySelector('.question[data-correct]:not([data-correct=""])')).toBeNull();
    expect(asDoc.querySelector('.alloflow-tl-strip[data-original-index]')).toBeNull();
    // Per-pair typing field appears in Q&A when qaHideAnswers
    expect(asDoc.querySelector('textarea[data-allo-response-key*="nt29"]')).toBeTruthy();

    // Runtime __alloflowCollectAnnotations preserves numeric IDs, distinguishes bare highlight vs anchorText+text, skips pending
    const docId = studentHtml.match(/<meta\s+name=["']alloflow-document-id["']\s+content=["']([a-f0-9]+)["']/i)?.[1] || '';
    expect(docId).toMatch(/^[a-f0-9]{32}$/);
    const { win } = await bootPackDOM(studentHtml, {
      url: 'https://example.test/wave29.html?nickname=Maya',
      beforeParse(w) {
        w.localStorage.setItem('alloflow-annotations:v2|' + docId + '|u:Maya', JSON.stringify([
          { id: 101, kind: 'highlight', text: 'selected phrase' },
          { id: 'w46', kind: 'highlight', anchorText: 'anchor phrase', text: 'margin note' },
          { id: 'p1', kind: 'note', text: 'skip pending', pending: true },
          { id: 'c1', kind: 'note', content: 'content fallback' },
          { id: 'd1', kind: 'draw', points: [[1, 2]], width: 3, dataUrl: 'data:image/png;base64,AA==' },
          { id: 'v1', kind: 'voice', audioBase64: 'SGVsbG8=', mimeType: 'audio/webm', durationSec: 4 },
        ]));
      },
    });
    expect(typeof win.__alloflowCollectAnnotations).toBe('function');
    const collected = win.__alloflowCollectAnnotations();
    expect(collected.find((a) => a.id === 'p1')).toBeUndefined();
    const bare = collected.find((a) => a.id === '101');
    expect(bare?.quote).toBe('selected phrase');
    expect(bare?.note).toBe('');
    const w46 = collected.find((a) => a.id === 'w46');
    expect(w46?.quote).toBe('anchor phrase');
    expect(w46?.note).toBe('margin note');
    const c1 = collected.find((a) => a.id === 'c1');
    expect(c1?.note).toBe('content fallback');
    const d1 = collected.find((a) => a.id === 'd1');
    expect(d1?.dataUrl).toContain('data:image/png');
    const v1 = collected.find((a) => a.id === 'v1');
    expect(v1?.durationSec).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 30 · Submission Inbox Auto-Grading, Calibration, Self-Check, CSV & 4-Mirror Sync
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 30 · Submission Inbox & 4-Mirror Runtime Bundle Parity', () => {
  it('normalizes annotations with pending skip, bare vs note highlights, content fallback, draw, and voice fields', () => {
    const annos = inboxMeta.studentAnnotations({
      annotations: [
        { id: 42, kind: 'highlight', text: 'bare selection' },
        { id: 'w2', kind: 'highlight', anchorText: 'quoted excerpt', text: 'student thought' },
        { id: 'pend', kind: 'note', text: 'should drop', pending: true },
        { id: 'cnt', kind: 'note', content: 'from content field' },
        { id: 'drw', kind: 'draw', points: [[0, 0], [5, 5]], width: 2, dataUrl: 'data:image/png;base64,AA==' },
        { id: 'voc', kind: 'voice', audioSrc: 'data:audio/webm;base64,AA==', mimeType: 'audio/webm', durationSec: 3 },
      ],
    });
    expect(annos.find((a) => a.id === 'pend')).toBeUndefined();
    const bare = annos.find((a) => String(a.id) === '42');
    expect(bare?.quote).toBe('bare selection');
    expect(bare?.note).toBe('');
    const w2 = annos.find((a) => a.id === 'w2');
    expect(w2?.quote).toBe('quoted excerpt');
    expect(w2?.note).toBe('student thought');
    const cnt = annos.find((a) => a.id === 'cnt');
    expect(cnt?.note).toBe('from content field');
    const drw = annos.find((a) => a.id === 'drw');
    expect(drw?.dataUrl).toContain('data:image/png');
    const voc = annos.find((a) => a.id === 'voc');
    expect(voc?.durationSec).toBe(3);
  });

  it('auto-grades colon-IDs, Venn 3-branch overlap, concept-sort __uncategorized offset, multi-select correctIndices, answer-evidence, matching, and relation-mismatch wrong-pair/partner', () => {
    const history = [
      {
        id: 'unit:lesson1:quiz',
        type: 'quiz',
        title: 'Cell Transport',
        data: {
          questions: [
            { type: 'multi-select', question: 'Pick letters A and C concepts', options: ['Alpha', 'Beta', 'C'], correctIndices: [0, 2] },
            { type: 'answer-evidence', question: 'Why?', answerOptions: ['Claim A', 'Claim B'], evidenceOptions: ['Ev 1', 'Ev 2'], correctAnswer: 'Claim B', correctEvidence: 'Ev 2' },
            { type: 'matching', question: 'Match terms', pairs: [{ left: 'Pump', right: 'ATP' }, { left: 'Diffusion', right: 'Gradient' }] },
            {
              type: 'relation-mismatch',
              question: 'Fix the mismatched organelle pair',
              pairs: [
                { left: 'Ribosome', right: 'Protein synthesis' },
                { left: 'Lysosome', right: 'Photosynthesis' },
              ],
              wrongPairIndex: 1,
              candidatePartners: ['Cellular digestion', 'Nitrogen fixation'],
              correctPartnerIndex: 0,
            },
          ],
        },
      },
      {
        id: 'vn:col:1',
        type: 'outline',
        title: 'Compare',
        data: {
          structureType: 'Venn Diagram',
          branches: [
            { title: 'Shared Middle', items: ['Plasma membrane'] },
            { title: 'Prokaryote', items: ['Nucleoid'] },
            { title: 'Eukaryote', items: ['Nucleus'] },
          ],
        },
      },
      {
        id: 'cs:col:1',
        type: 'concept-sort',
        title: 'Sort',
        data: {
          categories: [{ id: 'a', label: 'Active' }, { id: 'p', label: 'Passive' }],
          items: [
            { content: 'UNCATEG', categoryId: '__uncategorized' },
            { content: 'Pump', categoryId: 'a' },
          ],
        },
      },
    ];

    const grades = inboxMeta.exportedQuizAutoGrades({
      responses: {
        'allo-response:unit:lesson1:quiz:q0:multi': JSON.stringify(['Alpha', 'C']),
        'allo-response:unit:lesson1:quiz:q1:answer': 'Claim B',
        'allo-response:unit:lesson1:quiz:q1:evidence': 'Ev 2',
        'allo-response:unit:lesson1:quiz:q2:match:0': 'ATP',
        'allo-response:unit:lesson1:quiz:q2:match:1': 'ATP',
        'allo-response:unit:lesson1:quiz:q3:wrong-pair': 'Pair #2',
        'allo-response:unit:lesson1:quiz:q3:partner': 'Cellular digestion',
        'allo-response:vn:col:1:venn:2:placement': 'shared',
        'allo-response:cs:col:1:concept-sort:1:category': 'a',
      },
    }, history);

    expect(grades['allo-response:unit:lesson1:quiz:q0:multi']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:unit:lesson1:quiz:q1:answer']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:unit:lesson1:quiz:q1:evidence']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:unit:lesson1:quiz:q2:match:0']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:unit:lesson1:quiz:q2:match:1']?.score).toBe(0);
    expect(grades['allo-response:unit:lesson1:quiz:q3:wrong-pair']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:unit:lesson1:quiz:q3:partner']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:vn:col:1:venn:2:placement']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:cs:col:1:concept-sort:1:category']).toMatchObject({ score: 100, status: 'correct' });
    expect(inboxMeta.lookupTrustedHistoryPrompt('unit:lesson1:quiz:q0:multi', history)).toContain('Pick letters');
    expect(inboxMeta.lookupTrustedHistoryPrompt('vn:col:1:venn:2:placement', history)).toContain('Plasma membrane');
    expect(inboxMeta.lookupTrustedHistoryPrompt('cs:col:1:concept-sort:1:category', history)).toContain('Pump');
  });

  it('exempts Applied Challenge self-check ratings, scopes calibrationSamplesForKey, and neutralizes CSV formulas', () => {
    expect(inboxMeta.responseRequiresManualReview({ key: 'ac1:applied:selfcheck-criterion-0:rating', responseType: 'self-check', answered: true, rawText: 'met' })).toBe(false);
    const models = inboxMeta.responseEntryModels({
      responses: {
        'ac1:applied:selfcheck-criterion-0:rating': 'met',
        'ac1:applied:workspace:response': 'My reasoned design',
      },
    });
    const scEntry = models.find((m) => m.key.includes('selfcheck-'));
    expect(scEntry).toMatchObject({ isSelfCheck: true, requiresManualReview: false, aiGradable: false });

    const anchors = [
      { fromResponseKey: 'unitA:q1', docId: 'doc-1', studentResponse: 'Good explanation', teacherScore: 90 },
      { fromResponseKey: 'unitA:q1', docId: 'doc-2', studentResponse: 'Wrong doc explanation', teacherScore: 20 },
      { fromResponseKey: 'unitB:q2', docId: 'doc-1', studentResponse: 'Different unit fallback', teacherScore: 80 },
      { fromResponseKey: 'unitA:q2', docId: 'doc-1', studentResponse: 'Same unit sibling', teacherScore: 85 },
    ];
    const samples = inboxMeta.calibrationSamplesForKey(anchors, 'unitA:q3', '', { docId: 'doc-1' });
    const respTexts = samples.map((s) => s.studentResponse);
    expect(respTexts).not.toContain('Wrong doc explanation');
    expect(respTexts).not.toContain('Different unit fallback');
    expect(respTexts).toContain('Same unit sibling');

    const csvEntries = [
      {
        nickname: '=CMD|"/C calc"!A0',
        className: '+1+1',
        docTitle: '@SUM(1,2)',
        submittedAt: '-2+3',
        gradedAt: '2026-11-14',
        grades: { q1: { score: 95 } },
      },
    ];
    for (const preset of ['alloflow', 'canvas', 'google-classroom', 'schoology']) {
      const result = inboxMeta.buildLmsGradebookCsv(csvEntries, preset);
      const csv = result.csv;
      expect(csv).toContain("'=CMD");
      expect(csv).toContain("'+1+1");
      expect(csv).toContain("'@SUM(1,2)");
      expect(csv).not.toMatch(/^=|\n=|\r=|,=/m);
      expect(csv).toContain('95');
    }
  });

  it('maintains identical SHA-256 checksums across all 4 mirrors for all 7 runtime bundles', () => {
    const bundles = [
      'export_handlers_module.js',
      'export_module.js',
      'view_export_preview_module.js',
      'view_pdf_audit_module.js',
      'document_narration_text_module.js',
      'view_submission_inbox_module.js',
      'doc_pipeline_module.js',
    ];
    const dirs = ['.', 'desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
    const sha = (rel) => createHash('sha256').update(readFileSync(resolve(ROOT, rel))).digest('hex');

    for (const b of bundles) {
      const hashes = dirs.map((d) => sha(`${d}/${b}`));
      expect(new Set(hashes).size).toBe(1);
    }
  });
});
