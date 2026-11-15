import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');

const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let pipeline;

const activeRoots = [];
const activeDoms = [];

function parseDoc(html) {
  return new DOMParser().parseFromString(String(html || ''), 'text/html');
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

function mountComponent(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(Component, props));
  });
  activeRoots.push({ root, container });
  return container;
}

const Icon = () => null;
const fullIcons = {
  AlertTriangle: Icon,
  ArrowDown: Icon,
  ArrowRight: Icon,
  ArrowUp: Icon,
  BookOpen: Icon,
  ChevronDown: Icon,
  ClipboardList: Icon,
  Clock: Icon,
  Copy: Icon,
  Cpu: Icon,
  Download: Icon,
  ExternalLink: Icon,
  Eye: Icon,
  EyeOff: Icon,
  FolderDown: Icon,
  ImageIcon: Icon,
  Maximize: Icon,
  Plus: Icon,
  Printer: Icon,
  RefreshCw: Icon,
  Share2: Icon,
  Sparkles: Icon,
  StopCircle: Icon,
  Trash2: Icon,
  X: Icon,
};

function fnv1aBase36(value) {
  let h = 2166136261;
  const text = String(value == null ? '' : value);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_export_preview_module.js');
  loadAlloModule('allo_sheet/transfer_adapter.js');
  loadAlloModule('view_submission_inbox_module.js');
  loadAlloModule('view_assignment_center_module.js');
  loadAlloModule('view_full_pack_run_module.js');
  loadAlloModule('view_share_session_surfaces_module.js');

  pipeline = createPipeline();
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
// Wave 7 · Interactive HTML & Cloze Upgrades
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 7 · Interactive Cloze & Activity Exports', () => {
  const reading = {
    id: 'simpW7',
    type: 'simplified',
    title: 'Plant Energy',
    data: 'Chlorophyll captures sunlight during photosynthesis.',
  };
  const glossary = {
    id: 'glossW7',
    type: 'glossary',
    title: 'Key Terms',
    data: [
      { term: 'Chlorophyll', definition: 'Green plant pigment', isSelected: true },
      { term: 'Photosynthesis', definition: 'Process of turning light into sugar', isSelected: true },
    ],
  };

  it('emits interactive cloze <input> blanks in HTML mode, static spans in worksheet mode, and withholds answers in assessmentMode', () => {
    const interactiveHtml = pipeline.generateFullPackHTML([reading, glossary], 'Plants', false, {}, {
      includeSimplified: true,
      includeGlossary: false,
      includeTeacherKey: false,
      clozeWorksheet: true,
      clozeInteractive: true,
      clozeMaxPerTerm: 1,
      annotations: [],
    });
    const interactiveDoc = parseDoc(interactiveHtml);
    const clozeInputs = Array.from(interactiveDoc.querySelectorAll('input.alloflow-cloze-input'));
    expect(clozeInputs.length).toBeGreaterThanOrEqual(2);
    expect(clozeInputs.every((el) => el.getAttribute('data-allo-response-type') === 'cloze-blank')).toBe(true);
    expect(clozeInputs.some((el) => /chlorophyll/i.test(el.getAttribute('data-cloze-answer') || ''))).toBe(true);

    const worksheetHtml = pipeline.generateFullPackHTML([reading, glossary], 'Plants', true, {}, {
      includeSimplified: true,
      includeGlossary: false,
      includeTeacherKey: false,
      clozeWorksheet: true,
      clozeInteractive: true,
      clozeMaxPerTerm: 1,
      annotations: [],
    });
    const wsDoc = parseDoc(worksheetHtml);
    expect(wsDoc.querySelectorAll('input.alloflow-cloze-input')).toHaveLength(0);
    expect(wsDoc.querySelectorAll('.alloflow-cloze-blank').length).toBeGreaterThanOrEqual(2);

    const assessmentHtml = pipeline.generateFullPackHTML([reading, glossary], 'Plants', false, {}, {
      includeSimplified: true,
      includeGlossary: false,
      includeTeacherKey: false,
      assessmentMode: true,
      clozeWorksheet: true,
      clozeInteractive: true,
      clozeMaxPerTerm: 1,
      annotations: [],
    });
    const assessDoc = parseDoc(assessmentHtml);
    const assessInputs = Array.from(assessDoc.querySelectorAll('input.alloflow-cloze-input'));
    expect(assessInputs.length).toBeGreaterThanOrEqual(2);
    expect(assessInputs.every((el) => !el.hasAttribute('data-cloze-answer'))).toBe(true);
  });

  it('renders interactive Venn, Concept Sort, Timeline, Math, and DBQ response keys cleanly', () => {
    const items = [
      {
        id: 'vennW7',
        type: 'outline',
        title: 'Plant vs Animal Cells',
        data: {
          main: 'Cells',
          structureType: 'Venn Diagram',
          branches: [
            { title: 'Plant', items: ['Cell wall'] },
            { title: 'Animal', items: ['Centrioles'] },
            { title: 'Both', items: ['Nucleus'] },
          ],
        },
      },
      {
        id: 'csW7',
        type: 'concept-sort',
        title: 'States of Matter',
        data: {
          categories: [{ id: 'solid', label: 'Solid' }, { id: 'gas', label: 'Gas' }],
          items: [{ text: 'Ice', categoryId: 'solid' }, { text: 'Steam', categoryId: 'gas' }],
        },
      },
      {
        id: 'tlW7',
        type: 'timeline',
        title: 'Water Cycle',
        data: { items: [{ date: 'Step 1', event: 'Evaporation' }, { date: 'Step 2', event: 'Condensation' }] },
      },
      {
        id: 'mathW7',
        type: 'math',
        title: 'Linear Equation',
        data: { problems: [{ question: 'Solve 2x = 10', answer: '5', steps: ['Divide both sides by 2'] }] },
      },
      {
        id: 'dbqW7',
        type: 'dbq',
        title: 'Primary Sources',
        data: {
          essentialQuestion: 'Why did irrigation reshape cities?',
          historicalContext: 'Ancient river valleys built canals.',
          documents: [{ title: 'Doc A', source: 'Edict', excerpt: 'Open the sluice gates.', sourcingQuestions: ['Who issued this?'], analysisQuestions: ['What does it show?'] }],
          synthesisQuestion: 'Write one paragraph explaining the impact.',
        },
      },
    ];
    const html = pipeline.generateFullPackHTML(items, 'Unit Pack', false, {}, {
      includeOutline: true,
      vennExportMode: 'activity',
      includeConceptSort: true,
      includeTimeline: true,
      timelineDisplayMode: 'cuttable-strips',
      includeMath: true,
      includeDbq: true,
      includeTeacherKey: false,
      annotations: [],
    });
    const doc = parseDoc(html);
    expect(doc.querySelector('.alloflow-venn-activity')).not.toBeNull();
    expect(doc.querySelectorAll('select.alloflow-venn-response').length).toBeGreaterThanOrEqual(3);
    expect(doc.querySelector('.alloflow-venn-print-only')).not.toBeNull();
    expect(doc.querySelector('[data-allo-response-key*="csW7:concept-sort:0:category"]')).not.toBeNull();
    expect(doc.querySelector('[data-allo-response-key*="tlW7:timeline-order"]')).not.toBeNull();
    expect(doc.querySelector('[data-allo-response-key*="mathW7:math:0:answer"]')).not.toBeNull();
    expect(doc.querySelector('[data-allo-response-key*="dbqW7:dbq:0:sourcing:0"]')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 8.1 · Document Builder Metrics, Forms, Clean Markdown, ePub SVG & Link Guard
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 8.1 · Document Builder Metrics, Quiz->Forms, ePub SVG & Link Sanitizer', () => {
  const previewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const slice = previewSrc.slice(
    previewSrc.indexOf('const _BUILDER_STYLE_GALLERY'),
    previewSrc.indexOf('function ExportPreviewView')
  );
  const builderHelpers = new Function(slice + `
    return {
      countSyllables: _builderCountWordSyllables,
      textStats: _builderTextStatistics,
      cleanMarkdownRoot: _builderCleanMarkdownRoot,
      quizToFormItems: _alloQuizToFormItems,
    };
  `)();

  it('computes word syllables and full readability statistics', () => {
    expect(builderHelpers.countSyllables('')).toBe(0);
    expect(builderHelpers.countSyllables('cat')).toBe(1);
    expect(builderHelpers.countSyllables('education')).toBeGreaterThanOrEqual(3);

    const stats = builderHelpers.textStats('Plants convert sunlight into chemical energy. Every leaf performs essential cellular work.');
    expect(stats.words).toBe(12);
    expect(stats.sentences).toBe(2);
    expect(stats.syllables).toBeGreaterThanOrEqual(16);
    expect(stats.fkGrade).not.toBeNull();
    expect(stats.readingEase).not.toBeNull();
    expect(stats.readingMinutes).toBe(1);
    expect(stats.speakingMinutes).toBe(1);
    expect(builderHelpers.textStats('').words).toBe(0);
    expect(builderHelpers.textStats('').fkGrade).toBeNull();
  });

  it('strips teacher-only sections from clean markdown root only when includeTeacherKey is false', () => {
    const doc = document.implementation.createHTMLDocument('Notes');
    doc.body.innerHTML = '<main><h1>Reading</h1><p>Visible student text.</p><section class="teacher-view"><p>SECRET KEY A</p></section><div class="answer-key">SECRET KEY B</div><aside data-allo-teacher-only="1">SECRET KEY C</aside></main>';
    const studentRoot = builderHelpers.cleanMarkdownRoot(doc, { includeTeacherKey: false });
    expect(studentRoot.textContent).toContain('Visible student text.');
    expect(studentRoot.textContent).not.toContain('SECRET KEY A');
    expect(studentRoot.textContent).not.toContain('SECRET KEY B');
    expect(studentRoot.textContent).not.toContain('SECRET KEY C');

    const teacherRoot = builderHelpers.cleanMarkdownRoot(doc, { includeTeacherKey: true });
    expect(teacherRoot.textContent).toContain('SECRET KEY A');
    expect(teacherRoot.textContent).toContain('SECRET KEY B');
  });

  it('maps matching, ordering, answer-evidence, falsy 0, unit, and rubric into Google Form items', () => {
    const items = window.AlloModules.DriveDelivery.quizToFormItems({
      questions: [
        { type: 'matching', question: 'Match organelle', pairs: [{ left: 'Chloroplast', right: 'Photosynthesis' }, { left: 'Mitochondria', right: 'Respiration' }], explanation: 'Recall roles.', rubric: 'Check both.' },
        { type: 'ordering', question: 'Cycle order', correctOrder: ['First', 'Second', 'Third'] },
        { type: 'answer-evidence', question: 'What gas exits?', answerOptions: ['Oxygen', 'Nitrogen'], correctAnswer: 0, evidencePrompt: 'Pick the sentence.', evidenceOptions: ['Quote 1', 'Quote 2'], correctEvidence: 'Quote 2' },
        { type: 'numeric-response', question: 'Net charge', correctValue: 0, rubric: 'Zero is valid.' },
        { type: 'numeric-response', question: 'Total mass', correctValue: 5, unit: 'kg' },
      ],
    });
    expect(items[0]).toMatchObject({ type: 'mc', prompt: expect.stringContaining('Chloroplast'), answer: [0], help: 'Recall roles. Check both.' });
    expect(items[1]).toMatchObject({ type: 'mc', prompt: expect.stringContaining('Mitochondria'), answer: [1] });
    expect(items.filter((it) => it.prompt.includes('Cycle order')).map((it) => it.answer[0])).toEqual([0, 1, 2]);
    const aeAnswer = items.find((it) => it.prompt === 'What gas exits?');
    const aeEvidence = items.find((it) => it.prompt.includes('Pick the sentence.'));
    expect(aeAnswer.answer).toEqual([0]);
    expect(aeEvidence.answer).toEqual([1]);
    expect(items.find((it) => it.prompt === 'Net charge')).toMatchObject({ type: 'short', answer: '0', help: 'Zero is valid.' });
    expect(items.find((it) => it.prompt === 'Total mass')).toMatchObject({ type: 'short', answer: '5 kg' });
  });

  it('preserves inline <svg> xmlns and OPF properties="svg" in ePub export and blocks dangerous link schemes', async () => {
    const ast = parse(previewSrc, { sourceType: 'script', plugins: ['jsx'] });
    const callbacks = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'JSXElement' && node.openingElement?.name?.name === 'button') {
        const attr = node.openingElement.attributes.find((a) => a.name?.name === 'onClick');
        if (attr?.value?.expression) {
          callbacks.push({
            text: previewSrc.slice(node.start, node.end),
            code: previewSrc.slice(attr.value.expression.start, attr.value.expression.end),
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

    // Execute real ePub callback
    const epubCb = callbacks.find((c) => c.text.includes('application/epub+zip') || c.text.includes('ePub'));
    expect(epubCb).toBeTruthy();
    const zipFiles = new Map();
    window.JSZip = class MockZip {
      file(name, data) { zipFiles.set(name, data); }
      generateAsync() { return Promise.resolve(new Blob(['epub'])); }
    };
    const epubDoc = document.implementation.createHTMLDocument('Diagram Lesson');
    epubDoc.documentElement.lang = 'en';
    epubDoc.body.innerHTML = '<h1>Visual Guide</h1><figure><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg></figure>';
    const beginAlternativeExport = vi.fn(() => true);
    const finishAlternativeExport = vi.fn();
    const downloadBuilderBlob = vi.fn();
    const fnEpub = new Function(
      'exportPreviewRef', 'exportConfig', 'altExportBusy', 'beginAlternativeExport', 'finishAlternativeExport',
      'runBuilderPreflight', '_builderFetchExportImage', '_builderStripEditorBreakMetadata', 'downloadBuilderBlob',
      'addToast', 'Blob', 'window', 'document', 'XMLSerializer',
      'return (' + epubCb.code + ');'
    )(
      { current: { contentDocument: epubDoc } },
      {},
      '',
      beginAlternativeExport,
      finishAlternativeExport,
      () => ({ errors: 0 }),
      vi.fn(),
      () => {},
      downloadBuilderBlob,
      vi.fn(),
      class MockBlob { constructor(parts) { this.parts = parts; } },
      window,
      document,
      window.XMLSerializer
    );
    await fnEpub();
    expect(zipFiles.get('OEBPS/content.opf')).toContain('properties="svg"');
    expect(zipFiles.get('OEBPS/content.xhtml')).toContain('<svg');
    expect(zipFiles.get('OEBPS/content.xhtml')).toContain('http://www.w3.org/2000/svg');

    // Execute real Insert link callback with safe vs javascript: URLs
    const linkCb = callbacks.find((c) => c.text.includes('Insert link'));
    expect(linkCb).toBeTruthy();
    const execCommand = vi.fn();
    const linkDoc = document.implementation.createHTMLDocument('Links');
    linkDoc.body.innerHTML = '<p>Select me</p>';
    linkDoc.execCommand = execCommand;
    let lastValidator = null;
    const promptForBuilderText = vi.fn(async (_msg, _def, opts) => {
      lastValidator = opts?.validate;
      return 'javascript:alert(1)';
    });
    const fnLink = new Function(
      'exportPreviewRef', 'saveBuilderSelection', 'promptForBuilderText', 'window', 'document',
      'return (' + linkCb.code + ');'
    )(
      { current: { contentDocument: linkDoc, contentWindow: { focus() {} } } },
      () => null,
      promptForBuilderText,
      window,
      document
    );
    await fnLink();
    expect(execCommand).not.toHaveBeenCalled();
    expect(lastValidator('javascript:alert(1)')).toMatch(/Only web/i);
    expect(lastValidator('data:text/html,<h1>x</h1>')).toMatch(/Only web/i);
    expect(lastValidator('https://example.org/docs')).toBeNull();
    expect(lastValidator('mailto:teacher@school.edu')).toBeNull();
    expect(lastValidator('#section-2')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 8.2 · DOCX Spec, Standalone Reader & Secondary Exporters
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 8.2 · DOCX Spec, Standalone Reader & Secondary Exporters', () => {
  const pdfAuditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const docxStart = pdfAuditSrc.indexOf('function _htmlToDocxSpec(html) {');
  const docxEnd = pdfAuditSrc.indexOf('// end _htmlToDocxSpec', docxStart);
  const _htmlToDocxSpec = new Function(pdfAuditSrc.slice(docxStart, docxEnd) + '; return _htmlToDocxSpec;')();

  const readerStart = pdfAuditSrc.indexOf('const _READER_APP_CSS =');
  const readerEnd = pdfAuditSrc.indexOf('\nconst DOC_MODES =', readerStart);
  const readerSlice = pdfAuditSrc.slice(readerStart, readerEnd);
  const _wrapAsReaderApp = new Function(readerSlice + '; return _wrapAsReaderApp;')();

  it('maps [data-allo-page-break], <math>, form controls, and deduplicates .alloflow-venn-print-only in _htmlToDocxSpec', () => {
    const html = `<!DOCTYPE html><html lang="en"><head><title>Worksheet DOCX</title></head><body>
      <p>Formula <math aria-label="a squared"><mi>a</mi><msup><mn>2</mn></msup></math></p>
      <p>Answer <input type="text" value="photosynthesis"/> and blank <input type="text" value=""/></p>
      <p>Choice <select><option value="">Pick...</option><option value="b" selected>Choice B</option></select></p>
      <textarea>Because leaves capture light.</textarea>
      <div data-allo-page-break="1"></div>
      <div class="alloflow-venn-activity">
        <div class="alloflow-venn-card">
          <button class="alloflow-venn-card-button">Cell Wall</button>
          <select class="alloflow-venn-response"><option value="">--</option><option value="setA" selected>Plant Only</option></select>
        </div>
        <div class="alloflow-venn-print-only"><ul><li>Cell Wall</li></ul></div>
      </div>
    </body></html>`;
    const spec = _htmlToDocxSpec(html);
    expect(spec.blocks.some((b) => b.type === 'pagebreak')).toBe(true);
    const json = JSON.stringify(spec.blocks);
    expect(json).toContain('a squared');
    expect(json).toContain('photosynthesis');
    expect(json).toContain('Choice B');
    expect(json).toContain('Because leaves capture light.');
    // Venn item should appear once from .alloflow-venn-card (with selected zone) and skip .alloflow-venn-print-only
    const wallMatches = json.match(/Cell Wall/g) || [];
    expect(wallMatches).toHaveLength(1);
    expect(json).toContain('Plant Only');
  });

  it('keeps Standalone Reader offline and cleans hidden chrome, blanks, and symbols during speech', () => {
    expect(readerSlice).not.toMatch(/https?:\/\//i);
    const wrapped = _wrapAsReaderApp(
      '<!doctype html><html lang="en"><head><title>Reader</title></head><body><main><h1>Plants</h1><p>Leaves absorb ___ today &#9744;.</p><div hidden>HIDDEN_TEXT</div><span aria-hidden="true">ORNAMENT_TEXT</span></main></body></html>'
    );
    const spoken = [];
    const dom = new JSDOM(wrapped, {
      runScripts: 'dangerously',
      url: 'https://reader.local/',
      beforeParse(win) {
        win.SpeechSynthesisUtterance = class {
          constructor(text) { this.text = text; this.rate = 1; this.lang = ''; }
        };
        win.speechSynthesis = { cancel() {}, speak(u) { spoken.push(u.text); } };
      },
    });
    activeDoms.push(dom);
    dom.window.document.getElementById('allo-rd-play').click();
    const joined = spoken.join(' ');
    expect(joined).toContain('Leaves absorb blank today');
    expect(joined).not.toContain('HIDDEN_TEXT');
    expect(joined).not.toContain('ORNAMENT_TEXT');
    expect(joined).not.toContain('\u2610');
  });

  it('strips teacher keys in handleExportIMS, exports structured Math/DBQ slides, and ships CSP-safe flashcard study controls', async () => {
    const zipFiles = new Map();
    window.JSZip = class MockZip {
      file(name, content) { zipFiles.set(name, content); }
      generateAsync() { return Promise.resolve(new Blob(['zip'])); }
    };
    const recordedSlides = [];
    window.PptxGenJS = class MockPptx {
      constructor() { this.ShapeType = { rect: 'rect', roundRect: 'roundRect', line: 'line' }; }
      defineSlideMaster() {}
      addSlide() {
        const s = { texts: [], notes: [], addText(t) { this.texts.push(typeof t === 'string' ? t : JSON.stringify(t)); }, addNotes(n) { this.notes.push(n); }, addTable() {}, addShape() {}, addImage() {} };
        recordedSlides.push(s);
        return s;
      }
      writeFile({ fileName }) { return Promise.resolve(fileName); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const capturedImsCfgs = [];
    const addToast = vi.fn();
    const history = [
      { id: 'math1', type: 'math', title: 'Fraction Drill', data: { problems: [{ question: '1/2 + 1/2', answer: '1', steps: ['Add numerators'], realWorld: 'Two halves make a whole pie.' }] } },
      { id: 'dbq1', type: 'dbq', title: 'Canal Edict DBQ', data: { essentialQuestion: 'How were canals regulated?', historicalContext: 'Ancient trade routes.', synthesisQuestion: 'Summarize the rules.', documents: [{ title: 'Tablet 1', source: 'Royal Archive', excerpt: 'Inspect every sluice.', sourcingQuestions: ['Who wrote Tablet 1?'], analysisQuestions: ['Why inspect sluices?'] }] } },
      { id: 'gloss1', type: 'glossary', title: 'Cell Terms', data: [{ term: 'Osmosis', def: 'Water movement through a membrane' }] },
    ];
    const exporter = window.AlloModules.createExport({
      liveRef: {
        current: {
          history,
          generatedContent: history[2],
          sourceTopic: 'Cells & Fractions',
          studentResponses: {},
          exportConfig: { audience: 'teacher', includeTeacherKey: true, annotations: [{ quote: 'secret' }] },
          generateResourceHTML: (item, isWs, _resp, cfg) => {
            capturedImsCfgs.push(cfg);
            return `<section><h2>${item.title}</h2></section>`;
          },
          generateFullPackHTML: (items, topic, isWs, _resp, cfg) => {
            capturedImsCfgs.push(cfg);
            return `<!DOCTYPE html><html><head><title>${topic}</title></head><body><h1>${items.map((i) => i.title).join(', ')}</h1></body></html>`;
          },
          addToast,
          t: (k, f) => (typeof f === 'string' ? f : k),
        },
      },
      warnLog: () => {},
      debugLog: () => {},
      escapeXml: (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])),
      generateUUID: () => 'uuid-1',
    });

    await exporter.handleExportIMS();
    expect(capturedImsCfgs.length).toBeGreaterThanOrEqual(2);
    expect(capturedImsCfgs.every((cfg) => cfg.includeTeacherKey === false && cfg.audience === 'student' && Array.isArray(cfg.annotations) && cfg.annotations.length === 0)).toBe(true);
    expect(zipFiles.has('imsmanifest.xml')).toBe(true);

    await exporter.handleExportSlides();
    const slideJoined = recordedSlides.map((s) => s.texts.join('\n')).join('\n');
    expect(slideJoined).toContain('1/2 + 1/2');
    expect(slideJoined).toContain('Two halves make a whole pie.');
    expect(slideJoined).toContain('How were canals regulated?');
    expect(slideJoined).toContain('Inspect every sluice.');
    expect(addToast.mock.calls.some(([msg]) => String(msg).includes('Fraction Drill') || String(msg).includes('Canal Edict DBQ'))).toBe(false);

    // Flashcards: check DOM + interactive script without inline onclick handlers
    let flashcardHtml = '';
    vi.stubGlobal('Blob', class MockBlob { constructor(parts) { flashcardHtml = parts.join(''); } });
    exporter.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: false });
    const fcDom = new JSDOM(flashcardHtml, { runScripts: 'dangerously', url: 'https://cards.local/' });
    activeDoms.push(fcDom);
    expect(fcDom.window.document.querySelector('.card-container [onclick], .card-container script')).toBeNull();
    expect(fcDom.window.document.querySelector('script[data-flashcard-study]')).not.toBeNull();
    const knownBtn = fcDom.window.document.querySelector('[data-card-study="known"]');
    expect(knownBtn).not.toBeNull();
    knownBtn.click();
    expect(knownBtn.getAttribute('aria-pressed')).toBe('true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 9 · Submission Inbox Auto-Grading, Annotations, Prompts & Batch Packet
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 9 · Submission Inbox Auto-Grading, Annotations, Calibration & Batch Packet', () => {
  it('preserves draw/voice annotations, auto-grades Wave 9 item types, resolves trusted history prompts & batch HTML', () => {
    const meta = window.AlloModules.SubmissionInbox._meta;
    const annos = meta.studentAnnotations({
      annotations: [
        { type: 'highlight', quote: 'Chlorophyll', note: 'Key pigment' },
        { type: 'draw', points: [{ x: 1, y: 2 }, { x: 20, y: 15 }], color: 'blue', width: 5 },
        { type: 'voice', note: 'Oral summary', audioBase64: 'UklGRg==', mimeType: 'audio/webm' },
        { type: 'voice', note: 'Bad URL stripped', audioSrc: 'https://evil.test/a.mp3' },
        { id: 'drop-bad', type: 'voice', audioSrc: 'https://evil.test/b.mp3' },
      ],
    });
    expect(annos.find((a) => a.type === 'highlight')).toMatchObject({ quote: 'Chlorophyll', note: 'Key pigment' });
    expect(annos.find((a) => a.type === 'draw')).toMatchObject({ strokeHex: '#2563eb', strokeWidth: 5 });
    expect(annos.find((a) => a.type === 'voice' && a.audioSrc)).toMatchObject({ audioSrc: 'data:audio/webm;base64,UklGRg==' });
    const badVoiceWithNote = annos.find((a) => a.note === 'Bad URL stripped');
    expect(badVoiceWithNote).toBeDefined();
    expect(badVoiceWithNote.audioSrc).toBeUndefined();
    expect(annos.find((a) => a.id === 'drop-bad')).toBeUndefined();

    const tlItems = [{ event: 'Evaporation' }, { event: 'Condensation' }, { event: 'Precipitation' }];
    const tlOrderIds = tlItems.map((te, i) => fnv1aBase36(`tl1:${i}:${te.event}`));
    const history = [
      { id: 'cs1', type: 'concept-sort', data: { categories: [{ id: 'solid', label: 'Solid' }, { id: 'liquid', label: 'Liquid' }], items: [{ text: 'Ice', categoryId: 'solid' }] } },
      { id: 'v1', type: 'venn', data: { setA: { title: 'Plant Only', items: ['Cell wall'] }, setB: { title: 'Animal Only', items: ['Centrioles'] }, shared: { title: 'Shared', items: ['Nucleus'] } } },
      { id: 'tl1', type: 'timeline', data: { items: tlItems } },
      { id: 'm1', type: 'math', data: { problems: [{ question: 'Solve 3x = 12', answer: '4', _verification: { verified: true } }] } },
      {
        id: 'q9',
        type: 'quiz',
        data: {
          questions: [
            { type: 'answer-evidence', question: 'Main gas?', answerOptions: ['Oxygen', 'Argon'], correctAnswer: 0, evidenceOptions: ['Line 1', 'Line 2'], correctEvidence: 1, rubric: 'Cite Line 2' },
            { type: 'numeric-response', question: 'Speed?', correctValue: 10, unit: 'm/s' },
            { type: 'fill-blank', question: 'Formula for water', expectedFill: 'H2O', acceptableAlternatives: ['water'] },
          ],
        },
      },
    ];
    const autoGrades = meta.exportedQuizAutoGrades({
      responses: {
        'allo-response:cs1:concept-sort:0:category': 'Solid',
        'allo-response:v1:venn:1:placement': 'setB',
        'allo-response:tl1:timeline-order': JSON.stringify(tlOrderIds),
        'allo-response:m1:math:0:answer': '4',
        'allo-response:q9:q0:answer': 'Oxygen',
        'allo-response:q9:q0:evidence': 'Line 2',
        'allo-response:q9:q1:number': '10',
        'allo-response:q9:q1:unit': 'kg', // value ok, unit wrong => 50 partially-correct
        'allo-response:q9:q2:fill': 'water',
      },
    }, history);
    expect(autoGrades['allo-response:cs1:concept-sort:0:category']).toMatchObject({ score: 100, status: 'correct' });
    expect(autoGrades['allo-response:v1:venn:1:placement']).toMatchObject({ score: 100, status: 'correct' });
    expect(autoGrades['allo-response:tl1:timeline-order']).toMatchObject({ score: 100, status: 'correct' });
    expect(autoGrades['allo-response:m1:math:0:answer']).toMatchObject({ score: 100, status: 'correct' });
    expect(autoGrades['allo-response:q9:q0:answer']).toMatchObject({ score: 100, status: 'correct' });
    expect(autoGrades['allo-response:q9:q0:evidence']).toMatchObject({ score: 100, status: 'correct' });
    expect(autoGrades['allo-response:q9:q1:number']).toMatchObject({ score: 50, status: 'partially-correct' });
    expect(autoGrades['allo-response:q9:q2:fill']).toMatchObject({ score: 100, status: 'correct' });

    const trustedPrompt = meta.lookupTrustedHistoryPrompt('allo-response:q9:q0:answer', history);
    expect(trustedPrompt).toContain('Main gas?');
    expect(trustedPrompt).toContain('Cite Line 2');

    const samples = meta.calibrationSamplesForKey([
      { fromResponseKey: 'other', studentResponse: 'Other item', teacherScore: 60 },
      { fromResponseKey: 'q9:q0:answer', studentResponse: 'Matched item', teacherScore: 100, teacherFeedback: 'Great!' },
    ], 'q9:q0:answer', 'Exemplar note');
    expect(samples[0].studentResponse).toBe('Matched item');
    expect(samples[samples.length - 1]).toMatchObject({ studentResponse: 'Exemplar note', teacherScore: 95 });

    const packet = meta.buildBatchFeedbackHtml([
      {
        row: {
          nickname: 'Alex <script>bad()</script>',
          docTitle: 'Lab Sheet',
          payload: {
            responses: { 'q9:q0:answer': 'Oxygen' },
            responseManifest: { 'q9:q0:answer': { question: 'Main gas?' } },
            annotations: annos,
          },
        },
        rowGrades: { 'q9:q0:answer': { score: 100, status: 'correct', feedback: 'Clear answer' } },
        summary: { scored: 1, total: 1, average: 100 },
      },
    ], 'Period 1 Packet');
    expect(packet).toContain('student-feedback-sheet');
    expect(packet).toContain('Period 1 Packet (1)');
    expect(packet).not.toContain('<script>bad()</script>');
    expect(packet).toContain('[Voice note attached]');
    expect(packet).toContain('<svg role="img"');
  });

  it('mounts SubmissionInbox cleanly via built module', () => {
    const SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
    const host = mountComponent(SubmissionInbox, {
      isOpen: true,
      onClose: () => {},
      rosterKey: 'test-roster',
      t: (_k, a) => (typeof a === 'string' ? a : undefined),
      addToast: () => {},
      history: [],
    });
    expect(host.textContent).toContain('Import student submissions');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 10 · Full Pack Quick Actions, Assignment Center & Class Mailbox Setup
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 10 · Full Pack Delivery Actions, Assignment Center & Class Mailbox Setup', () => {
  it('mounts FullPackRunView with HTML/Worksheet quick buttons and Wave 10 editable types', () => {
    const FullPackRunView = window.AlloModules.FullPackRunView;
    const openExportPreview = vi.fn();
    const host = mountComponent(FullPackRunView, {
      ...fullIcons,
      GUIDED_DELIVERY_GROUPS: [],
      _alloDiagnosticReason: () => '',
      _alloGenerationHelpersDeps: () => ({}),
      aiCapability: { text: true },
      createGuidedHomeworkShare: vi.fn(),
      currentUiLanguage: 'English',
      differentiationCustomGrades: [],
      differentiationRange: 'None',
      differentiationTypes: [],
      dokLevel: 'DOK 2',
      fullPackAddType: 'simplified',
      fullPackRun: {
        status: 'ready',
        plan: { sections: [{ groupId: '', rows: [{ key: 'k1', type: 'simplified', directive: 'Summarize' }] }] },
      },
      fullPackTargetGroup: 'none',
      getDefaultTitle: (type) => type,
      gradeLevel: 'Grade 6',
      guidedActiveSteps: [],
      guidedStep: 0,
      guidedMode: false,
      handleAddFullPackPlanResource: vi.fn(),
      handleApproveFullPack: vi.fn(),
      handleChangeFullPackPlanResourceType: vi.fn(),
      handleCopyFullPackDiagnostics: vi.fn(),
      handleDismissFullPackRun: vi.fn(),
      handleDownloadFullPackDiagnostics: vi.fn(),
      handleEditFullPackPlanResourceDirective: vi.fn(),
      handleMoveFullPackPlanResource: vi.fn(),
      handleOpenGenerationErrorLog: vi.fn(),
      handlePlanFullPack: vi.fn(),
      handleRemoveFullPackPlanResource: vi.fn(),
      handleReadOriginal: vi.fn(),
      handleRetryFailedFullPack: vi.fn(),
      handleSetFullPackPlanAdaptedTextPolicy: vi.fn(),
      handleStopFullPack: vi.fn(),
      hasSourceOrAnalysis: true,
      history: [{ id: 'r1', type: 'simplified', title: 'Reading', data: 'Sample text' }],
      imageAspectRatio: '16:9',
      imageGenerationStyle: 'Clean diagram',
      inputText: 'Source text',
      isAutoConfigEnabled: false,
      isIndependentMode: false,
      isParentMode: false,
      isProcessing: false,
      isTeacherMode: true,
      leveledTextLanguage: 'English',
      openExportPreview,
      openStudentQrPreview: vi.fn(),
      qrShareModal: null,
      recentQrShares: [],
      resourceCount: 'Auto',
      rosterKey: null,
      selectToolFromCatalog: vi.fn(),
      selectedLanguages: [],
      setFullPackAddType: vi.fn(),
      setFullPackTargetGroup: vi.fn(),
      setIsAutoConfigEnabled: vi.fn(),
      setResourceCount: vi.fn(),
      setShowAIBackendModal: vi.fn(),
      setShowCompletedFullPackRows: vi.fn(),
      setShowSessionStartOptions: vi.fn(),
      showCompletedFullPackRows: true,
      studentInterests: '',
      t: (_k, f) => (typeof f === 'string' ? f : _k),
      targetStandards: [],
      textFormat: 'Standard',
      translationMode: 'Direct',
      universalImageStyle: '',
      useEmojis: false,
    });

    const htmlBtn = host.querySelector('[data-testid="full-pack-export-html"]');
    const wsBtn = host.querySelector('[data-testid="full-pack-export-worksheet"]');
    expect(htmlBtn).not.toBeNull();
    expect(wsBtn).not.toBeNull();
    act(() => { htmlBtn.click(); wsBtn.click(); });
    expect(openExportPreview).toHaveBeenNthCalledWith(1, 'html');
    expect(openExportPreview).toHaveBeenNthCalledWith(2, 'worksheet');

    const select = host.querySelector('[data-testid="full-pack-add-resource-select"]');
    expect(select).not.toBeNull();
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    for (const typeName of ['venn', 'dbq', 'timeline', 'concept-sort', 'sentence-frames', 'outline', 'math']) {
      expect(values).toContain(typeName);
    }
  });

  it('disables Assignment Center creation for empty availability/signup options and wires Submission Inbox opener', () => {
    const { AssignmentCenterModal } = window.AlloModules.AssignmentCenter;
    const onOpenSubmissionInbox = vi.fn();
    const hostEmpty = mountComponent(AssignmentCenterModal, {
      isOpen: true,
      onClose: () => {},
      t: (_k, f) => (typeof f === 'string' ? f : ''),
      activityEnabled: true,
      activityType: 'availability',
      activityPrompt: 'Pick conference slot',
      activityOptionsText: '   ',
      activityIdentityMode: 'code',
      onCreateLink: vi.fn(),
      onOpenSubmissionInbox,
      rowViews: [],
      visibleRowViews: [],
    });
    const createBtnEmpty = Array.from(hostEmpty.querySelectorAll('button')).find((b) => b.textContent.includes('Create the link and QR code'));
    expect(createBtnEmpty).toBeTruthy();
    expect(createBtnEmpty.disabled).toBe(true);

    const inboxBtn = hostEmpty.querySelector('[data-assignment-open-inbox]');
    expect(inboxBtn).not.toBeNull();
    act(() => { inboxBtn.click(); });
    expect(onOpenSubmissionInbox).toHaveBeenCalledTimes(1);

    const hostValid = mountComponent(AssignmentCenterModal, {
      isOpen: true,
      onClose: () => {},
      t: (_k, f) => (typeof f === 'string' ? f : ''),
      activityEnabled: true,
      activityType: 'signup',
      activityPrompt: 'Choose presentation slot',
      activityOptionsText: 'Monday 9am\nTuesday 10am',
      activityIdentityMode: 'code',
      onCreateLink: vi.fn(),
      rowViews: [],
      visibleRowViews: [],
    });
    const createBtnValid = Array.from(hostValid.querySelectorAll('button')).find((b) => b.textContent.includes('Create the link and QR code'));
    expect(createBtnValid.disabled).toBe(false);
  });

  it('shows Class Mailbox Check Class Mailbox guidance and syncs datetime-local dueAt to due', () => {
    const ClassMailboxSetupView = window.AlloModules.ClassMailboxSetupView;
    const setMbDirectionsDraft = vi.fn();
    const host = mountComponent(ClassMailboxSetupView, {
      ...fullIcons,
      addDirectionsToPack: vi.fn(),
      alloPersistMailboxConfig: vi.fn(),
      closeAllMailboxSessions: vi.fn(),
      connectMailbox: vi.fn(),
      copyMailboxScriptSource: vi.fn(),
      copyToClipboard: vi.fn(),
      deriveDirectionsDraft: vi.fn(),
      directionsDeriving: false,
      exportMailboxConfig: vi.fn(),
      importMailboxConfig: vi.fn(),
      mailboxScriptState: { status: 'ready' },
      mbAdminInput: '',
      mbBusy: false,
      mbConfig: { url: 'https://script.google.com/macros/s/ex/exec', admin: 'tok', v: 20, latencyMs: 30 },
      mbDirectionsDraft: { title: 'Unit 2 HW', due: '', dueAt: '', steps: ['Read'], estMinutes: '15' },
      mbHwEvidence: {},
      mbLive: { code: 'ABC123', joinUrl: 'https://example.edu/join', aiPolicy: 'student-byok' },
      mbMode: 'sync',
      mbNow: Date.now(),
      mbQrSvg: '',
      mbResumable: [],
      mbRoster: {},
      mbShowAdmin: false,
      mbStatus: 'Connected',
      mbUrlInput: '',
      openStudentQrPreview: vi.fn(),
      openTeacherDirections: vi.fn(),
      persistMailboxScriptState: vi.fn(),
      probeMailboxLatency: vi.fn(),
      setMbAdminInput: vi.fn(),
      setMbBusy: vi.fn(),
      setMbConfig: vi.fn(),
      setMbDirectionsDraft,
      setMbHwEvidence: vi.fn(),
      setMbLive: vi.fn(),
      setMbMode: vi.fn(),
      setMbPanelOpen: vi.fn(),
      setMbShowAdmin: vi.fn(),
      setMbStatus: vi.fn(),
      setMbUrlInput: vi.fn(),
      setShowMailboxScriptModal: vi.fn(),
      shareMailboxDirections: vi.fn(),
      t: (_k, f) => (typeof f === 'string' ? f : ''),
    });

    expect(host.textContent).toContain('Check Class Mailbox');
    const dueAtInput = host.querySelector('input[type="datetime-local"][aria-label="Optional exact due date and time"]');
    expect(dueAtInput).not.toBeNull();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(dueAtInput, '2026-11-20T15:30');
      dueAtInput.dispatchEvent(new Event('input', { bubbles: true }));
      dueAtInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(setMbDirectionsDraft).toHaveBeenCalled();
    const lastArg = setMbDirectionsDraft.mock.calls[setMbDirectionsDraft.mock.calls.length - 1][0];
    const nextDraft = typeof lastArg === 'function'
      ? lastArg({ title: 'Unit 2 HW', due: '', dueAt: '', steps: ['Read'], estMinutes: '15' })
      : lastArg;
    expect(nextDraft.dueAt).toBe('2026-11-20T15:30');
    expect(nextDraft.due).toContain('Nov');
  });
});
