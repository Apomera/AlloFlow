// Verification suite for Waves 19-22 of the main resource export pipeline:
// - Wave 19: Interactive directions (goals + progress + Choice Board + Reset + v3 storage),
//            FAQ search filter + Chromium beforeprint/afterprint lifecycle + multi-section isolation,
//            dark-mode CSS overrides & structural classes on Timeline cuttable strips and DBQ cards
// - Wave 20: Chrome stripping across DOCX, ODT, DAISY DTBook, Read-Along MO, EPUB, TXT, BRF, Narration, and Export Builder
// - Wave 21: Unit/sourceFamilyId-scoped Cloze auto-grading, trusted history prompt resolution,
//            and goal-checklist / choice-board structured response handling
// - Wave 22: NotebookLM (.md) structured export for faq/anchor-chart/directions/fluency-record/applied-challenge
//            and Slides (.pptx) dedicated directions slide builder

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');

const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let pipeline;
let inboxMeta;
let AlloNarrationText;

const activeDoms = [];

function parseDoc(html) {
  return new DOMParser().parseFromString(String(html || ''), 'text/html');
}

function createPipeline(overrides = {}) {
  const state = {
    history: [],
    generatedContent: null,
    selectedResourceId: null,
    sourceTopic: 'Cell Biology',
    gradeLevel: 'Grade 6',
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

function escapeXmlStub(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function hasV2ResponseStorage(win) {
  for (let i = 0; i < win.localStorage.length; i += 1) {
    const k = win.localStorage.key(i);
    if (k && k.startsWith('allo-response:v2:')) return true;
  }
  return false;
}

function setupSlidesExporter(history, extraLive = {}) {
  const recordedSlides = [];
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
        addNotes(n) { this.notes.push(n); },
        addImage() {},
      };
      recordedSlides.push(s);
      return s;
    }
    writeFile({ fileName }) { return Promise.resolve(fileName); }
  };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wave22');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const addToast = vi.fn();
  const exporter = window.AlloModules.createExport({
    liveRef: {
      current: {
        history,
        generatedContent: history[0] || null,
        sourceTopic: 'Cell Biology',
        studentResponses: {},
        exportConfig: { audience: 'student', includeAnswerKey: false, annotations: [] },
        addToast,
        t: (k, f) => (typeof f === 'string' ? f : k),
        ...extraLive,
      },
    },
    warnLog: () => {},
    debugLog: () => {},
    escapeXml: escapeXmlStub,
    generateUUID: () => 'uuid-22',
  });
  return { exporter, recordedSlides, addToast };
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  loadAlloModule('module_scope_extras_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_submission_inbox_module.js');
  pipeline = createPipeline();
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
  const narrationBundleSrc = readFileSync(resolve(ROOT, 'document_narration_text_module.js'), 'utf8');
  AlloNarrationText = new Function('DOMParser', narrationBundleSrc + '\nreturn AlloNarrationText;')(DOMParser);
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
// Wave 19 · Interactive Directions, FAQ Print/Search Lifecycle & Dark-Mode CSS
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 19 · Interactive Directions, FAQ Search/Print Lifecycle & Dark-Mode Contrast CSS', () => {
  const dirItem = {
    id: 'dir19',
    type: 'directions',
    title: 'Lesson Roadmap',
    data: {
      body: 'Read the anchor passage carefully.',
      objectives: [
        { label: 'Highlight key vocabulary' },
        { label: 'Earn bonus XP badge', kind: 'xp' },
        { label: 'Beat boss game mode', kind: 'game' },
        { label: 'Draft a 2-sentence summary' },
      ],
      choiceBoard: {
        enabled: true,
        title: 'Choice Board',
        prompt: 'Pick one product to demonstrate mastery:',
        choices: [
          { id: 'poster', title: 'Infographic Poster', description: 'Diagram the stages cleanly' },
          { id: 'podcast', title: 'Audio Explainer', description: 'Record a 60-second synthesis' },
        ],
      },
    },
  };

  it('wires interactive directions goals, Choice Board radio cards, progress/Reset, v3 manifest, data-ka-readable, and static worksheet/teacher guard', async () => {
    const studentHtml = pipeline.generateFullPackHTML([dirItem], 'Cells Roadmap', false, {}, {
      includeDirections: true,
      audience: 'student',
      isWorksheet: false,
      includeTeacherKey: false,
      annotations: [],
    });

    const dom = new JSDOM(studentHtml, { runScripts: 'dangerously', url: 'https://example.edu/dir19.html?nickname=Maya', virtualConsole: new VirtualConsole() });
    activeDoms.push(dom);
    await new Promise((done) => (dom.window.document.readyState === 'complete' ? done() : dom.window.addEventListener('load', done, { once: true })));
    await new Promise((done) => setTimeout(done, 30));
    const doc = dom.window.document;

    const section = doc.querySelector('.alloflow-directions-section');
    expect(section).toBeTruthy();
    expect(section.hasAttribute('data-ka-readable')).toBe(true);
    expect(section.textContent).toContain('Highlight key vocabulary');
    expect(section.textContent).toContain('Draft a 2-sentence summary');
    expect(section.textContent).not.toContain('Earn bonus XP badge');
    expect(section.textContent).not.toContain('Beat boss game mode');

    const goalBoxes = Array.from(doc.querySelectorAll('input[type="checkbox"][data-allo-response-key="dir19:directions:goals"]'));
    expect(goalBoxes).toHaveLength(2);
    goalBoxes.forEach((cb) => expect(cb.getAttribute('data-allo-response-type')).toBe('goal-checklist'));

    const progress = doc.querySelector('.alloflow-dir-progress');
    expect(progress?.textContent).toContain('0 / 2');

    const choiceList = doc.querySelector('ul.alloflow-dir-choice-list[role="radiogroup"]');
    expect(choiceList).toBeTruthy();
    const radios = Array.from(choiceList.querySelectorAll('input[type="radio"][data-allo-response-key="dir19:directions:choice"]'));
    expect(radios).toHaveLength(2);
    expect(choiceList.textContent).toContain('Infographic Poster');

    // Check first goal and first choice board card
    goalBoxes[0].checked = true;
    goalBoxes[0].dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(progress?.textContent).toContain('1 / 2');
    expect(goalBoxes[0].closest('.alloflow-dir-goal-item')?.classList.contains('is-checked')).toBe(true);

    radios[0].checked = true;
    radios[0].dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(radios[0].closest('.alloflow-dir-choice-card')?.classList.contains('is-selected')).toBe(true);

    const contract = dom.window.__alloflowSubmissionResponseContract;
    expect(contract).toBeTruthy();
    const named = contract.collectNamedResponses();
    expect(JSON.parse(named['allo-response:dir19:directions:goals'] || '[]')).toEqual([goalBoxes[0].value]);
    expect(named['allo-response:dir19:directions:choice']).toBe(radios[0].value);
    expect(hasV2ResponseStorage(dom.window)).toBe(true);

    const manifest = contract.collectManifest();
    const goalManifest = manifest.entries.find((e) => e.key === 'allo-response:dir19:directions:goals');
    const choiceManifest = manifest.entries.find((e) => e.key === 'allo-response:dir19:directions:choice');
    expect(goalManifest?.responseType).toBe('goal-checklist');
    expect(goalManifest?.valueLabels?.[goalBoxes[0].value]).toContain('Highlight key vocabulary');
    expect(choiceManifest?.responseType).toBe('choice-board');
    expect(choiceManifest?.valueLabels?.[radios[0].value]).toContain('Infographic Poster');

    // Reset clears checkboxes, radio card, progress, and submission named responses
    const resetBtn = doc.querySelector('.alloflow-dir-reset');
    expect(resetBtn).toBeTruthy();
    resetBtn.click();
    expect(goalBoxes.some((cb) => cb.checked)).toBe(false);
    expect(radios.some((r) => r.checked)).toBe(false);
    expect(progress?.textContent).toContain('0 / 2');

    const namedAfterReset = contract.collectNamedResponses();
    expect(Object.prototype.hasOwnProperty.call(namedAfterReset, 'allo-response:dir19:directions:goals')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(namedAfterReset, 'allo-response:dir19:directions:choice')).toBe(false);

    // Worksheet and Teacher modes render static directions without interactive controls
    const wsHtml = pipeline.generateFullPackHTML([dirItem], 'Cells WS', true, {}, {
      includeDirections: true,
      audience: 'student',
      isWorksheet: true,
      annotations: [],
    });
    const wsDoc = parseDoc(wsHtml);
    expect(wsDoc.querySelectorAll('input[data-allo-response-key*="directions"]')).toHaveLength(0);
    expect(wsDoc.querySelectorAll('.alloflow-dir-reset')).toHaveLength(0);

    const teacherHtml = pipeline.generateFullPackHTML([dirItem], 'Cells Teacher', false, {}, {
      includeDirections: true,
      audience: 'teacher',
      annotations: [],
    });
    const teacherDoc = parseDoc(teacherHtml);
    expect(teacherDoc.querySelectorAll('input[data-allo-response-key*="directions"]')).toHaveLength(0);
    expect(teacherDoc.querySelectorAll('.alloflow-dir-reset')).toHaveLength(0);
  });

  it('scopes FAQ filter & pre-filter open restoration per section and handles Chromium beforeprint/afterprint', async () => {
    const faqA = {
      id: 'faqA',
      type: 'faq',
      title: 'Cell Energy FAQ',
      data: [
        { question: 'What is Mitosis?', answer: 'Equational nuclear division.' },
        { question: 'What is Meiosis?', answer: 'Reductional gamete division.' },
        { question: 'What is ATP?', answer: 'Primary cellular energy currency.' },
      ],
    };
    const faqB = {
      id: 'faqB',
      type: 'faq',
      title: 'Membrane Transport FAQ',
      data: [
        { question: 'What is Osmosis?', answer: 'Water movement across a membrane.' },
        { question: 'What is Diffusion?', answer: 'Passive solute spreading.' },
        { question: 'What is Turgor?', answer: 'Internal vacuole pressure in plants.' },
      ],
    };

    const html = pipeline.generateFullPackHTML([faqA, faqB], 'Biology FAQs', false, {}, {
      includeFaq: true,
      audience: 'student',
      isWorksheet: false,
      annotations: [],
    });

    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.edu/faq19.html', virtualConsole: new VirtualConsole() });
    activeDoms.push(dom);
    await new Promise((done) => (dom.window.document.readyState === 'complete' ? done() : dom.window.addEventListener('load', done, { once: true })));
    const doc = dom.window.document;

    const sections = Array.from(doc.querySelectorAll('[data-faq-section]'));
    expect(sections).toHaveLength(2);
    const [secA, secB] = sections;

    const detA = Array.from(secA.querySelectorAll('details'));
    const detB = Array.from(secB.querySelectorAll('details'));
    expect(detA).toHaveLength(3);
    expect(detB).toHaveLength(3);

    const filterA = secA.querySelector('.alloflow-faq-filter');
    const statusA = secA.querySelector('.alloflow-faq-status');
    expect(secA.querySelector('.alloflow-faq-controls.no-print')).toBeTruthy();
    expect(filterA && statusA).toBeTruthy();

    // Pre-open first FAQ item before filtering
    detA[0].open = true;
    detB[1].open = true;

    // Filter secA to ATP -> only 1 item visible in secA, secB completely untouched
    filterA.value = 'ATP';
    filterA.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(detA.map((d) => d.hidden)).toEqual([true, true, false]);
    expect(detA[2].open).toBe(true);
    expect(statusA.textContent).toContain('1');
    expect(detB.every((d) => !d.hidden)).toBe(true);

    // Clearing filter unhides all items in secA and restores detA[0].open === true
    filterA.value = '';
    filterA.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(detA.every((d) => !d.hidden)).toBe(true);
    expect(detA[0].open).toBe(true);

    // Filter again, then simulate Chromium print lifecycle (beforeprint -> afterprint)
    filterA.value = 'ATP';
    filterA.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    dom.window.dispatchEvent(new dom.window.Event('beforeprint'));
    expect(detA.every((d) => d.open && !d.hidden)).toBe(true);
    expect(detB.every((d) => d.open && !d.hidden)).toBe(true);

    dom.window.dispatchEvent(new dom.window.Event('afterprint'));
    expect(detA.map((d) => d.hidden)).toEqual([true, true, false]);
    expect(detB[1].open).toBe(true);
  });

  it('includes dark-mode contrast rules and structural classes for faq, directions, timeline strips, and dbq cards', () => {
    const html = pipeline.generateFullPackHTML(
      [
        dirItem,
        { id: 'f19', type: 'faq', title: 'FAQ', data: [{ question: 'Q?', answer: 'A.' }] },
        { id: 't19', type: 'timeline', title: 'TL', data: { items: [{ date: '1859', event: 'Origin published' }, { date: '1866', event: 'Mendel heredity' }] } },
        { id: 'd19', type: 'dbq', title: 'DBQ', data: { essentialQuestion: 'Why change?', documents: [{ title: 'Source 1', source: 'Journal', excerpt: 'Observed variation.' }] } },
      ],
      'Dark Theme Check',
      false,
      {},
      { includeDirections: true, includeFaq: true, includeTimeline: true, timelineDisplayMode: 'cuttable-strips', includeDbq: true, annotations: [] }
    );

    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-faq-section details.alloflow-faq-item');
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-directions-section');
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-tl-event-body');
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-tl-date-box');
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-dbq-doc-card');
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-dbq-excerpt');

    const doc = parseDoc(html);
    expect(doc.querySelector('.alloflow-tl-event-body')).toBeTruthy();
    expect(doc.querySelector('.alloflow-tl-date-box')).toBeTruthy();
    expect(doc.querySelector('.alloflow-dbq-doc-card')).toBeTruthy();
    expect(doc.querySelector('.alloflow-dbq-doc-head')).toBeTruthy();
    expect(doc.querySelector('.alloflow-dbq-excerpt')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 20 · Unified Chrome Stripping Across All Secondary Exporters & Builder
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 20 · Unified Chrome Stripping Across DOCX/ODT/DAISY, Read-Along, EPUB, TXT, BRF, Narration & Builder', () => {
  const pdfAuditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');

  const specStart = pdfAuditSrc.indexOf('function _htmlToDocxSpec(html) {');
  const specEnd = pdfAuditSrc.indexOf('\n// _buildDocxBlobFromSpec:', specStart);
  const pdfHelpers = new Function(
    '_expXmlEsc',
    pdfAuditSrc.slice(specStart, specEnd) +
      '\nreturn { docxSpec: _htmlToDocxSpec, odtXml: _htmlToOdtContentXml, dtbookXml: _htmlToDtbookXml, collectMo: _collectMoSegments, epubFiles: _buildEpubPackageFiles, plainText: _altFmtHtmlToPlainText, brf: _buildBrailleBrf };'
  )(escapeXmlStub);

  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const cleanMdRoot = new Function(builderSlice + '\nreturn _builderCleanMarkdownRoot;')();

  const chromeTokens = [
    ['alloflow-math-symbolbar', 'CHROME_MATH_SYMBOLBAR'],
    ['alloflow-math-symbar', 'CHROME_MATH_SYMBAR'],
    ['alloflow-math-controls', 'CHROME_MATH_CONTROLS'],
    ['alloflow-gm-controls', 'CHROME_GM_CONTROLS'],
    ['alloflow-gm-status', 'CHROME_GM_STATUS'],
    ['alloflow-faq-controls', 'CHROME_FAQ_CONTROLS'],
    ['alloflow-dir-controls', 'CHROME_DIR_CONTROLS'],
    ['alloflow-venn-place-button', 'CHROME_VENN_PLACE'],
    ['alloflow-venn-screen-instructions', 'CHROME_VENN_INST'],
    ['alloflow-glossary-card-actions', 'CHROME_GLOSS_ACTIONS'],
    ['alloflow-dbq-evidence-tracker', 'CHROME_DBQ_TRACKER'],
    ['alloflow-export-save-tools', 'CHROME_EXPORT_SAVE'],
    ['alloflow-quiz-check-btn', 'CHROME_QUIZ_CHECK'],
    ['alloflow-save-status', 'CHROME_SAVE_STATUS'],
  ];

  const chromeHtml = `<!DOCTYPE html><html lang="en"><head><title>Wave 20 Chrome Check</title></head><body><main>
    <h1>Lesson Header</h1>
    <p>Real student reading passage stays intact.</p>
    <ul class="alloflow-dir-choice-list">
      <li><label><input type="checkbox" checked /> Goal One Checked</label></li>
      <li><label><input type="radio" name="dirchoice" /> Choice Beta</label></li>
    </ul>
    ${chromeTokens.map(([cls, txt]) => `<div class="${cls}"><button type="button">${txt}</button><span>${txt}</span></div>`).join('\n')}
  </main></body></html>`;

  it('strips all Wave 20 chrome classes while keeping student content and checkbox/radio markers across DOCX, ODT, DAISY, MO, EPUB, TXT, BRF, Narration, and Builder', async () => {
    const spec = pdfHelpers.docxSpec(chromeHtml);
    const docxText = JSON.stringify(spec.blocks);
    const odtXml = pdfHelpers.odtXml(chromeHtml);
    const dtbookXml = pdfHelpers.dtbookXml(chromeHtml, { title: 'Wave 20' });
    const mo = pdfHelpers.collectMo(chromeHtml);
    const moJoined = mo.segments.map((s) => s.text).join(' ');
    const epubXhtml = pdfHelpers.epubFiles(chromeHtml, { title: 'Wave 20' }).files['OEBPS/content.xhtml'];
    const txt = pdfHelpers.plainText(chromeHtml);
    const brfOut = pdfHelpers.brf(chromeHtml);
    const narAcc = AlloNarrationText.accessibleText(chromeHtml, null, { languageRuns: false });
    const narNat = AlloNarrationText.naturalText(chromeHtml, { languageRuns: false });
    const mdCleanedText = cleanMdRoot(parseDoc(chromeHtml)).textContent;

    const callbacks = extractButtonCallbacks(exportPreviewSrc);
    const txtCb = callbacks.find((c) => c.text.includes('Plain Text (.txt)'));
    const epubCb = callbacks.find((c) => c.text.includes('application/epub+zip') || c.text.includes('ePub'));
    const brfCb = callbacks.find((c) => c.code.includes('const _toBRF'));

    const runBuilderBtn = async (cb, withZip = false) => {
      const downloads = [];
      const zipFiles = new Map();
      if (withZip) {
        window.JSZip = class MockZip {
          file(n, v) { zipFiles.set(n, v); }
          generateAsync() { return Promise.resolve(new Blob(['epub'])); }
        };
      }
      const doc = parseDoc(chromeHtml);
      const fn = new Function(
        'exportPreviewRef', 'exportConfig', 'altExportBusy', 'beginAlternativeExport', 'finishAlternativeExport',
        'runBuilderPreflight', '_builderFinalizeDocumentForExport', '_builderStripEditorBreakMetadata',
        '_builderFetchExportImage', 'downloadBuilderBlob', 'addToast', 'Blob', 'window', 'document', 'XMLSerializer',
        'return (' + cb.code + ');'
      )(
        { current: { contentDocument: doc } },
        { includeTeacherKey: false },
        '',
        () => true,
        () => {},
        () => ({ errors: 0 }),
        (root) => root,
        () => {},
        async () => null,
        (blob, meta) => { downloads.push({ blob, meta }); },
        () => {},
        class MockBlob { constructor(parts, opts) { this.parts = parts; this.type = opts?.type; this.textContent = parts.join(''); } },
        window,
        doc,
        window.XMLSerializer
      );
      await fn();
      return { downloads, zipFiles };
    };

    const builderTxt = (await runBuilderBtn(txtCb)).downloads[0].blob.textContent;
    const builderBrf = (await runBuilderBtn(brfCb)).downloads[0].blob.textContent;
    const builderEpub = (await runBuilderBtn(epubCb, true)).zipFiles.get('OEBPS/content.xhtml');

    const surfaces = [docxText, odtXml, dtbookXml, moJoined, mo.bodyHtml, epubXhtml, txt, brfOut.text, narAcc, narNat, mdCleanedText, builderTxt, builderEpub];
    for (const [, sentinel] of chromeTokens) {
      surfaces.forEach((surface) => {
        expect(surface).not.toContain(sentinel);
      });
    }

    // Student content and goal/choice preservation
    [odtXml, dtbookXml, moJoined, epubXhtml, txt, narAcc, narNat, builderTxt, builderEpub].forEach((surface) => {
      expect(surface).toContain('Real student reading passage stays intact.');
      expect(surface).toContain('Goal One Checked');
      expect(surface).toContain('Choice Beta');
    });
    const docxJoinedRuns = spec.blocks
      .flatMap((b) => (b.items ? b.items.map((it) => (it.runs || []).map((r) => r.text).join('')) : [(b.runs || []).map((r) => r.text).join('')]))
      .join('\n');
    expect(docxJoinedRuns).toMatch(/☑\s+Goal One Checked/);
    expect(docxJoinedRuns).toMatch(/☐\s+Choice Beta/);
    expect(odtXml).toMatch(/☑\s+Goal One Checked/);
    expect(odtXml).toMatch(/☐\s+Choice Beta/);
    expect(dtbookXml).toMatch(/☑\s+Goal One Checked/);
    expect(txt).toMatch(/\[x\]\s+Goal One Checked/);
    expect(txt).toMatch(/\[ \]\s+Choice Beta/);
    expect(builderBrf.length).toBeGreaterThan(10);

    // MO bodyHtml must stay XML-well-formed even with void <input> checkboxes/radios
    const moXmlDoc = new DOMParser().parseFromString('<root xmlns="http://www.w3.org/1999/xhtml">' + mo.bodyHtml + '</root>', 'application/xml');
    expect(moXmlDoc.querySelector('parsererror')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 21 · Unit-Scoped Cloze Grading & Prompt Resolution Across Interactive Types
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 21 · Multi-Unit Cloze Grading & Trusted Prompt Resolution', () => {
  it('resolves Cloze glossaries by unitId and sourceFamilyId instead of colliding on the first glossary', () => {
    const history = [
      { id: 'gl1', type: 'glossary', unitId: 'u1', sourceFamilyId: 'fam1', data: [{ term: 'Nucleus', def: 'Contains genetic material.' }] },
      { id: 'gl2', type: 'glossary', unitId: 'u2', sourceFamilyId: 'fam2', data: [{ term: 'Chloroplast', def: 'Captures sunlight energy.' }] },
      { id: 'cz1', type: 'simplified', title: 'Unit 1 Cell', unitId: 'u1', sourceFamilyId: 'fam1', data: 'Every eukaryotic cell protects its Nucleus inside the center.' },
      { id: 'cz2', type: 'simplified', title: 'Unit 2 Leaf', unitId: 'u2', sourceFamilyId: 'fam2', data: 'Leaf cells convert photons inside each Chloroplast organelle.' },
    ];

    // Cross-check exact cloze response key emitted by generateFullPackHTML
    const clzHtml = pipeline.generateFullPackHTML([history[0], history[2]], 'Unit 1 Cloze', false, {}, {
      includeSimplified: true,
      clozeWorksheet: true,
      clozeInteractive: true,
      includeTeacherKey: false,
      includeGlossary: false,
      annotations: [],
    });
    const realClozeInput = parseDoc(clzHtml).querySelector('input[data-allo-response-key*="cloze-blank"]');
    expect(realClozeInput).toBeTruthy();
    const realKey = realClozeInput.getAttribute('data-allo-response-key');
    expect(realKey).toContain('cz1:cloze:0:cloze-blank');

    const grades = inboxMeta.exportedQuizAutoGrades({
      responses: {
        [`allo-response:${realKey}`]: 'nucleus',
        'allo-response:cz2:cloze:0:cloze-blank': 'chloroplast',
      },
    }, history);

    expect(grades[`allo-response:${realKey}`]).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:cz2:cloze:0:cloze-blank']).toMatchObject({ score: 100, status: 'correct' });

    const crossWrong = inboxMeta.exportedQuizAutoGrades({
      responses: {
        'allo-response:cz1:cloze:0:cloze-blank': 'chloroplast',
      },
    }, history);
    expect(crossWrong['allo-response:cz1:cloze:0:cloze-blank']).toMatchObject({ score: 0, status: 'incorrect' });
  });

  it('resolves trusted history prompts for cloze, reflection, glossary match, venn, concept-sort, memory-aid, applied-challenge, and directions (plus v3 manifest models)', () => {
    const history = [
      { id: 'gl21', type: 'glossary', unitId: 'u21', data: [{ term: 'Osmosis', def: 'Diffusion of water across membranes.' }, { term: 'Vacuole', def: 'Water storage sac.' }] },
      { id: 'cz21', type: 'simplified', title: 'Turgor Passage', unitId: 'u21', data: 'Plants stay firm through osmosis into each central vacuole.' },
      { id: 'qz21', type: 'quiz', title: 'Check', data: { questions: [], reflections: ['How does water pressure support wilted stems?'] } },
      { id: 'gw21', type: 'glossary', data: [{ term: 'Cytosol', def: 'Fluid inside cells.' }] },
      {
        id: 'vn21',
        type: 'outline',
        data: {
          structureType: 'Venn Diagram',
          branches: [
            { title: 'Plant', items: ['Cell Wall'] },
            { title: 'Animal', items: ['Centriole'] },
            { title: 'Shared', items: ['Nucleus'] },
          ],
        },
      },
      {
        id: 'cs21',
        type: 'concept-sort',
        data: { categories: [{ id: 'bio', label: 'Living' }], items: [{ text: 'Oak Tree', categoryId: 'bio' }] },
      },
      {
        id: 'ma21',
        type: 'memory-aid',
        data: {
          cards: [{ target: 'Mitosis', studentPrompt: 'Draft a PMAT mnemonic.', reasoningPrompt: 'Explain why PMAT helps recall order.' }],
        },
      },
      {
        id: 'ac21',
        type: 'applied-challenge',
        data: {
          brief: { drivingQuestion: 'Design a drought-tolerant planter.' },
          supports: { phasePrompts: { workingQuestion: 'Frame the drought problem.' } },
        },
      },
      {
        id: 'dir21',
        type: 'directions',
        title: 'Module Guide',
        data: {
          objectives: [
            { label: 'Skip XP task', kind: 'xp' },
            { label: 'Analyze diagram A' },
            { label: 'Complete lab reflection' },
          ],
          choiceBoard: { enabled: true, title: 'Choice Menu', prompt: 'Choose one showcase format' },
        },
      },
    ];

    expect(inboxMeta.lookupTrustedHistoryPrompt('cz21:cloze:0:cloze-blank', history)).toContain('Cloze blank #1');
    expect(inboxMeta.lookupTrustedHistoryPrompt('cz21:cloze:0:cloze-blank', history)).toContain('Turgor Passage');
    expect(inboxMeta.lookupTrustedHistoryPrompt('qz21:reflection:0', history)).toContain('wilted stems');
    expect(inboxMeta.lookupTrustedHistoryPrompt('glossary-worksheet:gw21:match:0', history)).toContain('Cytosol');
    expect(inboxMeta.lookupTrustedHistoryPrompt('vn21:venn:0:placement', history)).toContain('Cell Wall');
    expect(inboxMeta.lookupTrustedHistoryPrompt('vn21:venn:2:placement', history)).toContain('Nucleus');
    expect(inboxMeta.lookupTrustedHistoryPrompt('cs21:concept-sort:0:category', history)).toContain('Oak Tree');
    expect(inboxMeta.lookupTrustedHistoryPrompt('ma21:card0:draft', history)).toContain('Draft a PMAT mnemonic');
    expect(inboxMeta.lookupTrustedHistoryPrompt('ma21:card0:reasoning', history)).toContain('Explain why PMAT');
    expect(inboxMeta.lookupTrustedHistoryPrompt('ac21:applied:workingQuestion', history)).toContain('Frame the drought problem');
    expect(inboxMeta.lookupTrustedHistoryPrompt('ac21:applied:ledger-1-claim', history)).toContain('evidence ledger row 1');
    expect(inboxMeta.lookupTrustedHistoryPrompt('dir21:directions:goals', history)).toContain('Analyze diagram A; Complete lab reflection');
    expect(inboxMeta.lookupTrustedHistoryPrompt('dir21:directions:goal:0', history)).toContain('Analyze diagram A');
    expect(inboxMeta.lookupTrustedHistoryPrompt('dir21:directions:goal:0', history)).not.toContain('Skip XP task');
    expect(inboxMeta.lookupTrustedHistoryPrompt('dir21:directions:choice', history)).toContain('Choose one showcase format');

    const models = inboxMeta.responseEntryModels({
      schemaVersion: 3,
      responses: {
        'dir21:directions:goals': JSON.stringify(['0', '1']),
        'dir21:directions:choice': 'poster',
      },
      responseManifest: {
        schemaVersion: 1,
        entries: [
          {
            key: 'dir21:directions:goals',
            question: 'Your Goals',
            responseType: 'goal-checklist',
            valueLabels: { '0': 'Analyze diagram A', '1': 'Complete lab reflection' },
          },
          {
            key: 'dir21:directions:choice',
            question: 'Choice Board',
            responseType: 'choice-board',
            valueLabels: { poster: 'Poster: Visual diagram' },
          },
        ],
      },
    });
    expect(models[0].displayValue).toBe('Analyze diagram A, Complete lab reflection');
    expect(models[0].requiresManualReview).toBe(true);
    expect(models[0].aiGradable).toBe(false);
    expect(models[1].displayValue).toBe('Poster: Visual diagram');
    expect(models[1].requiresManualReview).toBe(true);
    expect(models[1].aiGradable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 22 · NotebookLM (.md) & Slides (.pptx) Schema Expansion
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 22 · NotebookLM (.md) Sections & Slides (.pptx) Directions', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const builderHelpers = new Function(
    builderSlice + '\nreturn { clean: _builderCleanMarkdownRoot, kwlLines: _kwlMarkdownLines };'
  )();

  it('exports structured NotebookLM (.md) sections for faq, anchor-chart, directions, fluency-record, and applied-challenge with student/teacher gating', async () => {
    const callbacks = extractButtonCallbacks(exportPreviewSrc);
    const nlmCb = callbacks.find((c) => c.code.includes('NotebookLM'));
    expect(nlmCb).toBeTruthy();

    const wave22History = [
      {
        id: 'faq22',
        type: 'faq',
        title: 'Solar Cell FAQ',
        data: [{ question: '¿Cómo funciona?', question_en: 'How does it work?', answer: 'Convierte luz.', answer_en: 'Converts light.' }],
      },
      {
        id: 'ac22_chart',
        type: 'anchor-chart',
        title: 'Membrane Anchor Chart',
        data: {
          bigIdea: 'Selective permeability balances cell homeostasis.',
          interactive: { armed: true },
          sections: [{ label: 'Transport Modes', bullets: ['Diffusion flows down gradients', 'Active pumps burn ATP'], answerKey: 'Diffusion; Active ATP' }],
          memoryHook: 'Passive glides free; active pays ATP.',
        },
      },
      {
        id: 'dir22',
        type: 'directions',
        title: 'Lab Protocol',
        data: {
          body: 'Work carefully at station 3.',
          objectives: [
            { label: 'Earn level-up XP', kind: 'xp' },
            { label: 'Measure initial mass' },
          ],
          choiceBoard: {
            enabled: true,
            title: 'Synthesis Choice',
            prompt: 'Select how you will report results:',
            choices: [{ title: 'Claim Card', description: 'One CER paragraph' }],
          },
        },
      },
      {
        id: 'fl22',
        type: 'fluency-record',
        title: 'Reading Fluency Log',
        data: {
          audioRecording: 'data:audio/webm;base64,SECRET_AUDIO_BLOB_DATA',
          metrics: { wcpm: 118, accuracy: 94, prosody: 'Expressive', totalWords: 80, errors: 3 },
          wordData: [
            { word: 'Sunlight', status: 'correct' },
            { word: 'chlorophyll', status: 'hesitation' },
          ],
          feedback: 'STRONG_TEACHER_FEEDBACK_NOTE',
        },
      },
      {
        id: 'app22',
        type: 'applied-challenge',
        title: 'Watershed Filtration Build',
        data: {
          instructions: 'Prototype a low-cost filter.',
          brief: {
            context: 'Town well after storm runoff.',
            role: 'Hydrology Engineer',
            audience: 'City Water Board',
            drivingQuestion: 'How can layered media trap silt?',
            criteria: ['Filter 200mL under 2 min', 'Clear turbidity'],
            constraints: ['Budget under $5'],
            deliverable: 'Labeled prototype test card',
          },
          supports: { phasePrompts: { plan: 'Draw filter layers from coarse to fine.' } },
          workspace: { plan: 'Gravel -> Sand -> Charcoal' },
          teacherComment: 'EXEMPLAR_TEACHER_COMMENT',
        },
      },
    ];

    const runNlm = async (exportConfig) => {
      const downloaded = [];
      const fn = new Function(
        'exportPreviewRef', 'exportConfig', 'altExportBusy', 'beginAlternativeExport', 'finishAlternativeExport',
        '_builderCleanMarkdownRoot', '_builderMarkdownFromRoot', '_kwlMarkdownLines',
        'window', 'Blob', 'downloadBuilderBlob', 'addToast', 'history',
        'return (' + nlmCb.code + ');'
      )(
        { current: { contentDocument: null } },
        exportConfig,
        '',
        () => true,
        () => {},
        builderHelpers.clean,
        () => ({ markdown: '', warnings: [] }),
        builderHelpers.kwlLines,
        { alloCopyText: async () => false },
        class MockBlob { constructor(parts) { this.text = parts.join(''); } },
        (blob) => { downloaded.push(blob.text); },
        () => {},
        wave22History
      );
      await fn();
      return downloaded[0];
    };

    const studentMd = await runNlm({ includeAnswerKey: false, includeTeacherKey: false, assessmentMode: false });
    expect(studentMd).toContain('### Q1: ¿Cómo funciona?');
    expect(studentMd).toContain('_How does it work?_');
    expect(studentMd).toContain('**Big Idea:** Selective permeability');
    expect(studentMd).toContain('- _____');
    expect(studentMd).not.toContain('**Answer Key:**');
    expect(studentMd).toContain('### Your Goals');
    expect(studentMd).toContain('- [ ] Measure initial mass');
    expect(studentMd).not.toContain('Earn level-up XP');
    expect(studentMd).toContain('### Synthesis Choice');
    expect(studentMd).toContain('- **Claim Card:** One CER paragraph');
    expect(studentMd).toContain('**WCPM:** 118');
    expect(studentMd).toContain('**Accuracy:** 94%');
    expect(studentMd).toContain('chlorophyll (hesitation)');
    expect(studentMd).not.toContain('SECRET_AUDIO_BLOB_DATA');
    expect(studentMd).not.toContain('STRONG_TEACHER_FEEDBACK_NOTE');
    expect(studentMd).toContain('### Design Brief');
    expect(studentMd).toContain('Hydrology Engineer');
    expect(studentMd).toContain('Gravel -> Sand -> Charcoal');
    expect(studentMd).not.toContain('EXEMPLAR_TEACHER_COMMENT');

    const teacherMd = await runNlm({ includeAnswerKey: true, includeTeacherKey: false, assessmentMode: false });
    expect(teacherMd).toContain('Diffusion flows down gradients');
    expect(teacherMd).toContain('**Answer Key:** Diffusion; Active ATP');
    expect(teacherMd).toContain('- [ ] Earn level-up XP');
    expect(teacherMd).toContain('**Teacher Feedback:** STRONG_TEACHER_FEEDBACK_NOTE');
    expect(teacherMd).toContain('**Teacher Comment:** EXEMPLAR_TEACHER_COMMENT');
  });

  it('builds structured Slides (.pptx) for directions with audience filtering and enabled Choice Board', async () => {
    const dirSlideItem = {
      id: 'dir22s',
      type: 'directions',
      title: 'Station Directions',
      data: {
        body: 'Rotate every 12 minutes.',
        objectives: [
          { label: 'Claim bonus XP', kind: 'xp' },
          { label: 'Record microscope sketch' },
        ],
        choiceBoard: {
          enabled: true,
          title: 'Product Menu',
          prompt: 'Choose one artifact:',
          choices: [{ title: 'Diagram', description: 'Label all organelles' }],
        },
      },
    };

    const { exporter, recordedSlides } = setupSlidesExporter([dirSlideItem]);
    await exporter.handleExportSlides({ audience: 'student', includeAnswerKey: false });

    const allSlideText = recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    expect(allSlideText).toContain('Rotate every 12 minutes.');
    expect(allSlideText).toContain('Record microscope sketch');
    expect(allSlideText).toContain('Product Menu');
    expect(allSlideText).toContain('Diagram: Label all organelles');
    expect(allSlideText).not.toContain('Claim bonus XP');

    // String-typed directions also produce slides cleanly without skipping
    const { exporter: strExporter, recordedSlides: strSlides } = setupSlidesExporter([
      { id: 'dir22str', type: 'directions', title: 'Simple Steps', data: 'Read page 4 and circle two verbs.' },
    ]);
    await strExporter.handleExportSlides({ audience: 'student', includeAnswerKey: false });
    const strText = strSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    expect(strText).toContain('Read page 4 and circle two verbs.');
  });
});
