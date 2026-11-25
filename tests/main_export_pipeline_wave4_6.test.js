// Verification suite for Waves 4-6 of the main resource export pipeline,
// Document Builder secondary exporters, Interactive HTML runtime, and Submission Inbox round-trip.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

const pdfAuditSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const exportPreviewSrc = readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8');
const narrationBundleSrc = readFileSync(resolve(process.cwd(), 'document_narration_text_module.js'), 'utf8');

const docxStart = pdfAuditSrc.indexOf('function _htmlToDocxSpec(html) {');
const _htmlToDocxSpec = new Function(
  pdfAuditSrc.slice(
    docxStart,
    pdfAuditSrc.indexOf('// end _htmlToDocxSpec', docxStart)
  ) + '\nreturn _htmlToDocxSpec;'
)();

const _htmlToStructuredText = new Function(
  pdfAuditSrc.slice(
    pdfAuditSrc.indexOf('function _htmlToStructuredText(html, markdown) {'),
    pdfAuditSrc.indexOf('function _htmlToDocxSpec(html) {')
  ) + '\nreturn _htmlToStructuredText;'
)();

const AlloNarrationText = new Function(narrationBundleSrc + '\nreturn AlloNarrationText;')();

const builderHelpers = new Function(
  exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('const _BUILDER_STYLE_GALLERY'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  ) + '\nreturn { finalize: _builderFinalizeDocumentForExport, clean: _builderCleanMarkdownRoot, h5pCompat: _builderH5PCompatibility };'
)();

let pipeline, inboxMeta;

beforeAll(() => {
  loadAlloModule('export_module.js');
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub,
    callGeminiVision: stub,
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('view_submission_inbox_module.js');
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
}, 60000);

afterEach(() => {
  vi.restoreAllMocks();
  delete window.JSZip;
  delete window.PptxGenJS;
});

function createExporter(liveOverrides = {}) {
  const toasts = [];
  const exporter = window.AlloModules.createExport({
    liveRef: {
      current: {
        sourceTopic: 'Ecosystems',
        gradeLevel: '7',
        history: [],
        studentResponses: {},
        addToast: (msg, type) => toasts.push({ msg, type }),
        t: (key) => key,
        generateResourceHTML: (item) => '<p>' + item.title + '</p>',
        ...liveOverrides,
      },
    },
    warnLog: () => {},
    debugLog: () => {},
    escapeXml: (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    generateUUID: () => '12345678-1234-1234-1234-123456789abc',
  });
  return { exporter, toasts };
}

describe('Wave 4A · Accessible Word / Structured Text / Narration cleanup', () => {
  it('strips Wave 2 HUD/popover/button chrome, preserves semantic flashcards and fallback chart tables', () => {
    const html = `<!DOCTYPE html><html lang="en"><head><title>Wave 4A Sample</title></head><body>
      <div class="alloflow-hud-bar"><button>Reader controls</button></div>
      <div id="alloflow-term-popover">Popup definition noise</div>
      <div class="alloflow-inline-chart"><svg viewBox="0 0 100 100"><text>99</text></svg><table class="alloflow-chart-table" aria-label="Rainfall"><thead><tr><th>Month</th><th>Rain</th></tr></thead><tbody><tr><td>Jan</td><td>12</td></tr></tbody></table></div>
      <p>Water flows to the <button type="button" class="alloflow-inline-term" data-allo-def="mouth">delta</button> region.</p>
      <div class="alloflow-glossary-cards-section">
        <article class="alloflow-glossary-card flashcard">
          <div class="alloflow-glossary-card-front"><strong>Estuary</strong></div>
          <div class="alloflow-glossary-card-fold" aria-hidden="true">fold here</div>
          <div class="alloflow-glossary-card-back">Where freshwater meets the sea.</div>
          <div class="alloflow-glossary-card-actions"><button class="flashcard-flip-btn">Flip card</button><button class="flashcard-mark-btn">Got it</button></div>
        </article>
      </div>
      <p class="alloflow-quiz-feedback">REVIEW NEEDED</p>
    </body></html>`;

    const spec = _htmlToDocxSpec(html);
    const specJson = JSON.stringify(spec);
    const paragraphTexts = spec.blocks.filter((b) => b.type === 'paragraph').map((b) => b.runs.map((r) => r.text || '').join(''));
    expect(paragraphTexts).toContain('Water flows to the delta region.');
    expect(specJson).toContain('Estuary');
    expect(specJson).toContain('Where freshwater meets the sea.');
    expect(specJson).toContain('Month');
    expect(specJson).toContain('Rain');
    expect(specJson).not.toContain('99');
    expect(specJson).not.toContain('Reader controls');
    expect(specJson).not.toContain('Popup definition noise');
    expect(specJson).not.toContain('Flip card');
    expect(specJson).not.toContain('REVIEW NEEDED');

    const md = _htmlToStructuredText(html, true);
    expect(md).toContain('Estuary');
    expect(md).toContain('Where freshwater meets the sea.');
    expect(md).not.toContain('Reader controls');
    expect(md).not.toContain('Flip card');

    const audioFn = AlloNarrationText.audioReadyText || AlloNarrationText._audioReadyText;
    if (typeof audioFn === 'function') {
      const spoken = audioFn(html);
      expect(spoken).toContain('delta');
      expect(spoken).toContain('Estuary');
      expect(spoken).not.toContain('Popup definition noise');
      expect(spoken).not.toContain('Flip card');
    }
  });
});

describe('Wave 4B · Document Builder finalization, H5P compatibility, and clean markdown', () => {
  it('restores split-column resources in orig-idx order and clears transient UI state', () => {
    const doc = document.implementation.createHTMLDocument('Builder');
    doc.documentElement.setAttribute('data-alloflow-split', '1');
    doc.body.innerHTML = `
      <div class="alloflow-hud-bar">HUD</div>
      <div id="alloflow-term-popover">Popover</div>
      <div class="alloflow-split-columns">
        <div class="alloflow-split-left"><section class="alloflow-resource-wrap" data-alloflow-orig-idx="1" data-alloflow-unanswered="true"><p>Second originally</p><p class="alloflow-quiz-feedback">Wrong</p></section></div>
        <div class="alloflow-split-right"><section class="alloflow-resource-wrap" data-alloflow-orig-idx="0" data-alloflow-step-hidden="1"><p>First originally</p></section></div>
      </div>
    `;

    builderHelpers.finalize(doc);
    expect(doc.documentElement.hasAttribute('data-alloflow-split')).toBe(false);
    expect(doc.querySelector('.alloflow-split-columns')).toBeNull();
    expect(doc.querySelector('#alloflow-term-popover')).toBeNull();
    const fb = doc.querySelector('.alloflow-quiz-feedback');
    expect(fb.hidden).toBe(true);
    expect(fb.textContent).toBe('');
    const wraps = Array.from(doc.querySelectorAll('.alloflow-resource-wrap'));
    expect(wraps.map((w) => w.textContent.trim())).toEqual(['First originally', 'Second originally']);
    expect(wraps[0].hasAttribute('data-alloflow-step-hidden')).toBe(false);
    expect(wraps[0].hasAttribute('data-alloflow-orig-idx')).toBe(false);
    expect(wraps[1].hasAttribute('data-alloflow-unanswered')).toBe(false);

    const cleanDoc = document.implementation.createHTMLDocument('Clean');
    cleanDoc.body.innerHTML = '<p>Key <button class="alloflow-inline-term">osmosis</button> <kbd class="alloflow-keycap">1</kbd></p><div class="alloflow-quiz-feedback">X</div>';
    const root = builderHelpers.clean(cleanDoc);
    expect(root.querySelector('button.alloflow-inline-term')).toBeNull();
    expect(root.querySelector('kbd.alloflow-keycap')).toBeNull();
    expect(root.querySelector('.alloflow-quiz-feedback')).toBeNull();
    expect(root.textContent).toContain('osmosis');
  });

  it('routes 5+ option MCQs out of SingleChoiceSet into Question Set 1.21 and supports aliases/matching/ordering', () => {
    const result = builderHelpers.h5pCompat({
      id: 'q1',
      type: 'quiz',
      title: 'Mixed Quiz',
      data: {
        questions: [
          { type: 'multiple-choice', question: 'Five choices', options: ['A', 'B', 'C', 'D', 'E'], correctIndex: 2 },
          { type: 'matching', question: 'Match terms', pairs: [{ left: 'H2O', right: 'Water' }, { left: 'O2', right: 'Oxygen' }] },
          { type: 'order', question: 'Order steps', items: ['Step 1', 'Step 2', 'Step 3'] },
          { type: 'shortAnswer', question: 'Why?', sampleAnswer: 'Because.' },
        ],
      },
    });
    expect(result.valid).toBe(4);
    expect(result.omitted).toBe(0);
    expect(result.library).toBe('Question Set 1.21');
  });
});

describe('Wave 4C · QTI, H5P, and Direct Slides parity', () => {
  it('exports QTI XML supporting multiple-choice correctIndex, matching, ordering, and reasoning', async () => {
    const zipFiles = new Map();
    window.JSZip = class MockZip {
      file(name, content) { zipFiles.set(name, content); }
      generateAsync() { return Promise.resolve(new Blob(['zip'])); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qti');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { exporter } = createExporter({
      generatedContent: {
        id: 'quiz1',
        type: 'quiz',
        title: 'Unit Quiz',
        data: {
          questions: [
            { type: 'multiple-choice', question: 'Pick C', options: ['A', 'B', 'C', 'D', 'E'], correctIndex: 2 },
            { type: 'reasoning', question: 'Justify C', explanationPrompt: 'Cite one piece of evidence' },
            { type: 'matching', question: 'Match pairs', pairs: [{ left: 'North', right: 'Top' }, { left: 'South', right: 'Bottom' }] },
            { type: 'ordering', question: 'Sequence events', items: ['First', 'Second', 'Third'] },
          ],
        },
      },
    });
    await exporter.handleExportQTI();
    const quizXml = Array.from(zipFiles.entries()).find(([name]) => name.endsWith('.xml') && name !== 'imsmanifest.xml')?.[1] || '';
    expect(quizXml).toContain('Pick C');
    expect(quizXml).toContain('OPT_2');
    expect(quizXml).toContain('Justify C');
    expect(quizXml).toContain('Cite one piece of evidence');
    expect(quizXml).toContain('Match pairs');
    expect(quizXml).toContain('Sequence events');
    expect(quizXml).not.toContain('undefined');
  });

  it('orders direct Slides via resourceOrder and omits teacher answer keys in student mode', async () => {
    const recordedSlides = [];
    let savedFilename = '';
    window.PptxGenJS = class MockPptx {
      constructor() { this.ShapeType = { rect: 'rect', roundRect: 'roundRect', line: 'line' }; }
      defineSlideMaster() {}
      addSlide() {
        const slide = { texts: [], notes: [], addText(t) { this.texts.push(typeof t === 'string' ? t : JSON.stringify(t)); }, addNotes(n) { this.notes.push(n); }, addTable() {}, addShape() {}, addImage() {} };
        recordedSlides.push(slide);
        return slide;
      }
      writeFile({ fileName }) { savedFilename = fileName; return Promise.resolve(fileName); }
    };

    const { exporter } = createExporter({
      sourceTopic: 'Water Cycle 🌊',
      exportConfig: { audience: 'student', resourceOrder: ['includeQuiz', 'includeSimplified'] },
      history: [
        { id: 'sim1', type: 'simplified', title: 'Reading', data: 'Intro\n[[CHART: {"type":"bar","title":"Rain","labels":["Jan"],"values":[10]}]]' },
        { id: 'q1', type: 'quiz', title: 'Check', data: { questions: [{ type: 'mcq', question: 'What evaporates?', options: ['Water', 'Rock'], correct: 0, explanation: 'Liquid warms.' }] } },
      ],
    });
    await exporter.handleExportSlides();
    const allTexts = recordedSlides.map((s) => s.texts.join('\n'));
    const allNotes = recordedSlides.flatMap((s) => s.notes);
    expect(savedFilename).toContain('.pptx');
    const quizSlideIdx = allTexts.findIndex((t) => t.includes('What evaporates?'));
    const readingSlideIdx = allTexts.findIndex((t) => t.includes('Intro'));
    expect(quizSlideIdx).toBeGreaterThan(-1);
    expect(readingSlideIdx).toBeGreaterThan(quizSlideIdx);
    expect(allTexts.join('\n')).not.toContain('[[CHART:');
    expect(allTexts.join('\n')).not.toContain('Answer Key');
    expect(allNotes.join('\n')).not.toContain('Liquid warms.');
  });
});

describe('Wave 5 · Interactive HTML activities, accessibility, and annotation capture', () => {
  it('renders interactive matching, ordering, reasoning, cloze-blank, flashcards, word search, and annotations', async () => {
    const items = [
      {
        id: 'quizW5',
        type: 'quiz',
        title: 'Wave 5 Quiz',
        data: {
          questions: [
            { type: 'mcq', question: 'Which gas?', options: ['Nitrogen', 'Helium'], correct: 0, requireReasoning: true, explanationPrompt: 'Explain your choice' },
            { type: 'matching', question: 'Match items', pairs: [{ left: 'Solid', right: 'Ice' }, { left: 'Gas', right: 'Steam' }] },
            { type: 'ordering', question: 'Put in order', items: ['Seed', 'Sprout', 'Tree'] },
          ],
        },
      },
      {
        id: 'simpW5',
        type: 'simplified',
        title: 'Water Cycle Reading',
        data: 'Condensation turns water vapor into droplets.',
      },
      {
        id: 'sfCloze',
        type: 'sentence-frames',
        title: 'Cloze Paragraph',
        data: { mode: 'paragraph', text: 'Water turns into vapor during [evaporation] today.' },
      },
      {
        id: 'sfW5',
        type: 'sentence-frames',
        title: 'Frames',
        data: {
          mode: 'list',
          items: [{ text: 'I noticed that...' }],
        },
      },
      {
        id: 'glW5',
        type: 'glossary',
        title: 'Key Terms',
        data: [{ term: 'Condensation', definition: 'Gas to liquid.' }],
        gameData: { grid: [['A', 'B'], ['C', 'D']], words: ['AB', 'CD'], solutions: ['0-0', '0-1'] },
      },
    ];

    const html = pipeline.generateFullPackHTML(items, 'Matter', false, {}, { glossaryDisplayMode: 'flash-cards', clozeWorksheet: true, clozeInteractive: true, annotations: [] });
    expect(html).toContain('html[data-alloflow-theme]');
    expect(html).toContain('data-allo-response-type="reasoning"');
    expect(html).toContain(':cloze-blank');
    expect(html).toContain(':sentence-frame');
    expect(html).toContain('<article class="alloflow-glossary-card flashcard"');
    expect(html).toContain('alloflow-ws-cell');

    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/wave5.html', virtualConsole: new VirtualConsole() });
    const win = dom.window;
    await new Promise((done) => (win.document.readyState === 'complete' ? done() : win.addEventListener('load', done, { once: true })));
    await new Promise((done) => win.setTimeout(done, 50));

    const once = Array.from(win.document.querySelectorAll('[role="dialog"] button')).find((b) => /use once/i.test(b.textContent));
    if (once) { once.click(); await new Promise((done) => win.setTimeout(done, 50)); }

    // Test interactive matching + ordering key attributes and Check Quiz
    const matchQ = win.document.querySelector('.question[data-matching-key]');
    const orderQ = win.document.querySelector('.question[data-ordering-key]');
    expect(matchQ).not.toBeNull();
    expect(orderQ).not.toBeNull();
    const expectedMatch = JSON.parse(decodeURIComponent(matchQ.getAttribute('data-matching-key')));
    matchQ.querySelectorAll('select[data-allo-response-key*=":match:"]').forEach((sel, idx) => {
      sel.value = expectedMatch[idx];
      sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    });
    const expectedOrder = JSON.parse(decodeURIComponent(orderQ.getAttribute('data-ordering-key')));
    orderQ.querySelectorAll('select[data-allo-response-key*=":order:"]').forEach((sel, idx) => {
      sel.value = expectedOrder[idx];
      sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    });
    win.document.querySelector('.quiz-check-btn').click();
    expect(matchQ.querySelector('.alloflow-quiz-feedback').textContent).toContain('Correct');
    expect(orderQ.querySelector('.alloflow-quiz-feedback').textContent).toContain('Correct');

    // Test Flashcards Got-it + Progress counter
    const card = win.document.querySelector('.alloflow-glossary-card.flashcard');
    card.querySelector('.flashcard-mark-btn[data-status="got-it"]').click();
    expect(card.getAttribute('data-self-check')).toBe('got-it');
    expect(win.document.querySelector('.alloflow-glossary-progress').textContent).toContain('1 / 1 got it');

    // Test Word Search click delegation (runs even outside flashcard sections)
    const wsCell = win.document.querySelector('.alloflow-ws-cell');
    wsCell.click();
    expect(wsCell.getAttribute('aria-pressed')).toBe('true');

    // Test exported annotation collector global
    expect(typeof win.__alloflowCollectAnnotations).toBe('function');
    win.close();
  });
});

describe('Wave 6 · Submission Inbox round-trip, objective auto-scoring, annotations & feedback HTML', () => {
  it('allows :reasoning for AI grading while keeping :cloze-blank, :match, :order, and nt:note:summary manual', () => {
    const entries = inboxMeta.responseEntryModels({
      schemaVersion: 3,
      responses: {
        'allo-response:quiz1:q0:reasoning': 'Water condenses as it cools.',
        'allo-response:sf1:paragraph-0:cloze-blank': 'evaporation',
        'allo-response:quiz1:q1:match:0': 'B',
        'allo-response:quiz1:q2:order:0': '2',
        'allo-response:nt:note:summary': 'Quick summary',
      },
      responseManifest: {
        schemaVersion: 1,
        entries: [
          { key: 'allo-response:quiz1:q0:reasoning', question: 'Why?', responseType: 'reasoning', manualReview: false },
          { key: 'allo-response:sf1:paragraph-0:cloze-blank', question: 'Blank', responseType: 'cloze-blank', manualReview: true },
          { key: 'allo-response:quiz1:q1:match:0', question: 'Match 1', responseType: 'matching', manualReview: true },
          { key: 'allo-response:quiz1:q2:order:0', question: 'Order 1', responseType: 'ordering', manualReview: true },
          { key: 'allo-response:nt:note:summary', question: 'Summary', responseType: 'short-answer', manualReview: false },
        ],
      },
    });
    expect(entries.find((e) => e.key.endsWith(':reasoning'))).toMatchObject({ aiGradable: true, requiresManualReview: false });
    expect(entries.find((e) => e.key.endsWith(':cloze-blank'))).toMatchObject({ aiGradable: false, requiresManualReview: true });
    expect(entries.find((e) => e.key.endsWith(':match:0'))).toMatchObject({ aiGradable: false, requiresManualReview: true });
    expect(entries.find((e) => e.key.endsWith(':order:0'))).toMatchObject({ aiGradable: false, requiresManualReview: true });
    // Note-taking free-text fields (summary, conclusion, cue answers...) became AI-gradable
    // free responses on 2026-11-21 (siIsKnownFreeformKey / isNoteFreeform).
    expect(entries.find((e) => e.key.endsWith(':summary'))).toMatchObject({ aiGradable: true, requiresManualReview: false });
  });

  it('extracts v3 and standalone annotations into workEvidence while keeping response-only rows empty', () => {
    expect(inboxMeta.workEvidence({ responses: { q1: 'typed only' } }).isEmpty).toBe(true);

    const standalone = inboxMeta.workEvidence({
      kind: 'alloflow-annotations',
      annotations: [{ id: 'a1', kind: 'highlight', anchorText: 'Key line', text: 'Important point', color: 'yellow', blockIdx: 2 }],
    });
    expect(standalone.isEmpty).toBe(false);
    expect(standalone.annotations).toHaveLength(1);
    expect(standalone.annotations[0]).toMatchObject({ type: 'highlight', quote: 'Key line', note: 'Important point' });
  });

  it('auto-scores mcq, multi, fill, number, matching, and ordering against project quiz keys and builds safe feedback HTML', () => {
    const history = [{
      id: 'quizW6',
      type: 'quiz',
      title: 'Check',
      data: {
        questions: [
          { type: 'mcq', question: 'MCQ', options: ['Alpha', 'Beta'], correct: 1 },
          { type: 'multi-select', question: 'Multi', options: ['One', 'Two', 'Three'], correctAnswers: [0, 2] },
          { type: 'fill-blank', question: 'Fill', expectedFill: 'Condensation' },
          { type: 'numeric-response', question: 'Num', correctValue: 100, tolerance: 2 },
          { type: 'matching', question: 'Match', pairs: [{ left: 'Solid', right: 'Ice' }, { left: 'Gas', right: 'Steam' }] },
          { type: 'ordering', question: 'Order', items: ['Seed', 'Sprout', 'Tree'] },
        ],
      },
    }];

    // Generate real exported HTML to obtain exact deterministic matching/ordering expected keys
    const exportedHtml = pipeline.generateFullPackHTML(history, 'Unit', false, {}, { includeTeacherKey: false });
    const dom = new JSDOM(exportedHtml);
    const expectedMatch = JSON.parse(decodeURIComponent(dom.window.document.querySelector('[data-matching-key]').getAttribute('data-matching-key')));
    const expectedOrder = JSON.parse(decodeURIComponent(dom.window.document.querySelector('[data-ordering-key]').getAttribute('data-ordering-key')));

    const payload = {
      schemaVersion: 3,
      nickname: 'Maya <script>alert(1)</script>',
      docTitle: 'Water & Matter',
      responses: {
        'allo-response:quizW6:q0:mcq': '1',
        'allo-response:quizW6:q1:multi': '["0","2"]',
        'allo-response:quizW6:q2:fill': 'condensation.',
        'allo-response:quizW6:q3:number': '101.5',
        'allo-response:quizW6:q4:match:0': expectedMatch[0],
        'allo-response:quizW6:q4:match:1': expectedMatch[1] === 'A' ? 'B' : 'A', // intentionally wrong second pair
        'allo-response:quizW6:q5:order:0': expectedOrder[0],
      },
      annotations: [{ type: 'note', quote: 'Vapor rises', note: 'Need <script>x</script> review' }],
    };

    const grades = inboxMeta.exportedQuizAutoGrades(payload, history);
    expect(grades['allo-response:quizW6:q0:mcq']).toMatchObject({ score: 100, status: 'correct', origin: 'answer-key' });
    expect(grades['allo-response:quizW6:q1:multi']).toMatchObject({ score: 100, status: 'correct', origin: 'answer-key' });
    expect(grades['allo-response:quizW6:q2:fill']).toMatchObject({ score: 100, status: 'correct', origin: 'answer-key' });
    expect(grades['allo-response:quizW6:q3:number']).toMatchObject({ score: 100, status: 'correct', origin: 'answer-key' });
    expect(grades['allo-response:quizW6:q4:match:0']).toMatchObject({ score: 100, status: 'correct', origin: 'answer-key' });
    expect(grades['allo-response:quizW6:q4:match:1']).toMatchObject({ score: 0, status: 'incorrect', origin: 'answer-key' });
    expect(grades['allo-response:quizW6:q5:order:0']).toMatchObject({ score: 100, status: 'correct', origin: 'answer-key' });

    const feedbackHtml = inboxMeta.buildStudentFeedbackHtml({ payload, nickname: payload.nickname, docTitle: payload.docTitle }, grades, { average: 86, scored: 7, total: 7 });
    expect(feedbackHtml).toContain('Water &amp; Matter');
    expect(feedbackHtml).toContain('86/100');
    expect(feedbackHtml).toContain('Highlights &amp; Notes');
    expect(feedbackHtml).not.toContain('<script>alert(1)</script>');
    expect(feedbackHtml).not.toContain('<script>x</script>');
  });
});
