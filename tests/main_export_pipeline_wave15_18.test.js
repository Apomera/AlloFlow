// Verification suite for Waves 15-18 of the main resource export pipeline:
// - Wave 15A: HTML/XSS escaping in outline & timeline exports (without double-escaping)
// - Wave 15B: handleExportSlides schema parity (timeline, concept-sort, note-taking, DBQ)
// - Wave 16: Submission Inbox auto-grading & siLookupTrustedHistoryPrompt expansion
// - Wave 17: Venn dedup, interactive chrome & math-symbolbar stripping, form control fidelity (EPUB, MO, BRF/TXT, Narration, Builder)
// - Wave 18: Builder H5P simplified/note-taking, NotebookLM (.md) parity, fluency-record polish/toggles, interactive Glossary Matching

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

function fnv1aBase36(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
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
// Wave 15A · HTML/XSS Escaping in Outline & Timeline Exports
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 15A · HTML & Attribute Escaping in Outline & Timeline', () => {
  it('escapes XSS payloads and quotes across Venn (raw/escaped split without double-escaping), Cause-Effect, Problem-Solution, T-Chart, Concept Map, Mind Map, Memory Palace, and 3D Concept Space', () => {
    const xss = `<img src=x onerror=alert(1)> & "quote"`;
    const templates = [
      {
        id: 'venn15',
        structureType: 'Venn Diagram',
        branches: [
          { title: 'A & B <img src=x onerror=alert(1)>', items: [xss] },
          { title: 'C "only" <svg onload=alert(1)>', items: ['Safe item & <b onmouseover=alert(1)>tag</b>'] },
          { title: 'Shared & Core', items: ['Center <img src=x onerror=alert(1)>'] },
        ],
      },
      { id: 'ce15', structureType: 'Cause & Effect', branches: [{ title: `Cause ${xss}`, items: [xss] }, { title: `Effect ${xss}`, items: [xss] }] },
      { id: 'ps15', structureType: 'Problem & Solution', branches: [{ title: `Problem ${xss}`, items: [xss] }, { title: `Solution ${xss}`, items: [xss] }] },
      { id: 'tc15', structureType: 'T-Chart', branches: [{ title: `Pros ${xss}`, items: [xss] }, { title: `Cons ${xss}`, items: [xss] }] },
      { id: 'cm15', structureType: 'Concept Map', branches: [{ title: `Node ${xss}`, items: [xss] }] },
      { id: 'mm15', structureType: 'Mind Map', branches: [{ title: `Idea ${xss}`, items: [xss] }] },
      { id: 'mp15', structureType: 'Memory Palace', branches: [{ title: `Room ${xss}`, items: [xss] }] },
      { id: 'cs3d15', structureType: '3D Concept Space', branches: [{ title: `Axis ${xss}`, items: [xss] }] },
    ];

    templates.forEach((tpl) => {
      const html = pipeline.generateFullPackHTML(
        [{ id: tpl.id, type: 'outline', title: `Title ${xss}`, data: { main: `Main ${xss}`, structureType: tpl.structureType, branches: tpl.branches } }],
        `Topic ${xss}`,
        false,
        {},
        { includeOutline: true, vennExportMode: 'activity', annotations: [] }
      );
      const doc = parseDoc(html);
      expect(doc.querySelectorAll('img[onerror], svg[onload], b[onmouseover]').length).toBe(0);
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      if (tpl.structureType === 'Venn Diagram') {
        expect(html).not.toContain('&amp;amp;');
        const btn = doc.querySelector('.alloflow-venn-place-button');
        expect(btn).toBeTruthy();
        expect(btn.getAttribute('data-venn-zone-label')).not.toContain('&amp;amp;');
      }
    });
  });

  it('escapes HTML/XSS payloads in Timeline modes including cuttable-strips', () => {
    const tlItem = {
      id: 'tl15',
      type: 'timeline',
      title: 'Events <img src=x onerror=alert(1)>',
      data: {
        items: [
          { date: '1900 <img src=x onerror=alert(1)>', event: '<script>evil()</script> & "Discovery"' },
          { date: '1950', event: 'Follow-up <svg onload=alert(1)>' },
        ],
      },
    };
    ['cards', 'strip', 'cuttable-strips'].forEach((mode) => {
      const html = pipeline.generateFullPackHTML([tlItem], 'History', false, {}, {
        includeTimeline: true,
        timelineDisplayMode: mode,
        annotations: [],
      });
      const doc = parseDoc(html);
      expect(doc.querySelectorAll('img[onerror], svg[onload]').length).toBe(0);
      expect(html).not.toContain('<script>evil()</script>');
      expect(doc.body.textContent).toContain('Discovery');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 15B · handleExportSlides Schema Parity
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 15B · handleExportSlides Schema Parity', () => {
  function setupSlidesExporter(history, extraLive = {}) {
    const recordedSlides = [];
    window.PptxGenJS = class MockPptx {
      constructor() {
        this.ShapeType = { rect: 'rect', roundRect: 'roundRect', line: 'line', ellipse: 'ellipse' };
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wave15b');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const exporter = window.AlloModules.createExport({
      liveRef: {
        current: {
          history,
          generatedContent: history[0] || null,
          sourceTopic: 'World History & Science',
          studentResponses: {},
          exportConfig: { audience: 'teacher', includeAnswerKey: true, annotations: [] },
          addToast,
          t: (k, f) => (typeof f === 'string' ? f : k),
          ...extraLive,
        },
      },
      warnLog: () => {},
      debugLog: () => {},
      escapeXml: escapeXmlStub,
      generateUUID: () => 'uuid-15b',
    });
    return { exporter, recordedSlides, addToast };
  }

  it('exports timeline { items }, concept-sort entry.text, non-Cornell note-taking, and DBQ synthesisPrompt/content/perspectives/corroboration', async () => {
    const history = [
      {
        id: 'tl15b',
        type: 'timeline',
        title: 'Industrial Era',
        data: { items: [{ date: '1769', event: 'Steam engine patent' }, { date: '', event: '' }, { date: '1879', event: 'Incandescent bulb' }] },
      },
      {
        id: 'cs15b',
        type: 'concept-sort',
        title: 'Energy Types',
        data: {
          categories: [{ id: 'ren', label: 'Renewable' }, { id: 'non', label: 'Nonrenewable' }],
          items: [{ text: 'Solar Windmill', categoryId: 'ren' }, { text: 'Coal', categoryId: 'non' }],
        },
      },
      {
        id: 'gn15b',
        type: 'note-taking',
        title: 'Guided Cell Notes',
        data: { templateType: 'guided-notes', blanks: [{ before: 'ATP is made in', answer: 'mitochondria', after: '.' }], notesExtra: 'Check diagram.' },
      },
      {
        id: 'lab15b',
        type: 'note-taking',
        title: 'Osmosis Lab',
        data: { templateType: 'lab', question: 'How does salt affect weight?', hypothesis: 'Mass decreases', materials: [{ text: 'Potato slice' }], procedure: [{ text: 'Weigh slice' }], conclusion: 'Water exited.' },
      },
      {
        id: 'de15b',
        type: 'note-taking',
        title: 'Reader Journal',
        data: { templateType: 'double-entry', entries: [{ quote: 'Cells divide daily', response: 'Relates to growth' }] },
      },
      {
        id: 'dbq15b',
        type: 'dbq',
        title: 'Printing Revolution',
        data: {
          essentialQuestion: 'How did print change literacy?',
          historicalContext: '15th-century Europe.',
          synthesisPrompt: 'Synthesize two views on censorship.',
          documents: [{ title: 'Broadside A', source: 'Press Guild', content: 'Books spread quickly across towns.' }],
          perspectives: [{ label: 'Scholars', description: 'Increased shared knowledge' }, { label: 'Censors', description: 'Feared heterodoxy' }],
          corroborationClaims: [{ claim: 'Guild records match parish counts' }],
        },
      },
    ];

    const { exporter, recordedSlides } = setupSlidesExporter(history);
    await exporter.handleExportSlides({ audience: 'teacher', includeAnswerKey: true });

    const allSlideText = recordedSlides.map((s) => [
      ...s.texts.map((t) => t.raw),
      ...s.tables.map((tbl) => JSON.stringify(tbl.rows)),
    ].join('\n')).join('\n');

    expect(allSlideText).toContain('Steam engine patent');
    expect(allSlideText).toContain('Incandescent bulb');
    expect(allSlideText).toContain('Solar Windmill');
    expect(allSlideText).toContain('mitochondria');
    expect(allSlideText).toContain('Potato slice');
    expect(allSlideText).toContain('Cells divide daily');
    expect(allSlideText).toContain('Synthesize two views on censorship.');
    expect(allSlideText).toContain('Books spread quickly across towns.');
    expect(allSlideText).toContain('Increased shared knowledge');
    expect(allSlideText).toContain('Guild records match parish counts');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 16 · Submission Inbox Auto-Grading & Trusted Prompt Lookup
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 16 · Submission Inbox Timeline Hash, Guided Notes, Quiz Extensions & Prompt Lookup', () => {
  it('auto-grades real exported :timeline-date:<hash>(:free-response), :note:blank:<i>, relation-mismatch, and sequence-sense keys', () => {
    const tlItem = {
      id: 'tl16',
      type: 'timeline',
      title: 'Space Flight',
      data: {
        items: [
          { date: '1961', event: 'First human spaceflight' },
          { date: '1969', event: 'Apollo 11 moon landing' },
        ],
      },
    };
    const gnItem = {
      id: 'nt16',
      type: 'note-taking',
      title: 'Photosynthesis Notes',
      data: {
        templateType: 'guided-notes',
        blanks: [
          { before: 'Plants absorb', answer: 'sunlight', after: 'in leaves.' },
          { before: 'Byproduct is', answer: 'oxygen', after: '.' },
        ],
      },
    };
    const quizItem = {
      id: 'qz16',
      type: 'quiz',
      title: 'Bio & Seq Check',
      data: {
        questions: [
          {
            type: 'relation-mismatch',
            question: 'Identify the mismatched pair and its true partner.',
            pairs: [
              { left: 'Nucleus', right: 'DNA' },
              { left: 'Chloroplast', right: 'ATP digestion' },
              { left: 'Ribosome', right: 'Protein' },
            ],
            wrongPairIndex: 1,
            candidatePartners: ['Photosynthesis', 'Respiration'],
            correctPartnerForWrong: 'Photosynthesis',
          },
          {
            type: 'sequence-sense',
            question: 'Check the mitosis order.',
            items: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'],
            presentedOrder: [0, 2, 1, 3],
            intentionallyWrongIndex: 1,
            orderingPrinciple: 'process',
            principleOptions: ['process', 'hierarchy', 'size'],
          },
        ],
      },
    };

    const h0 = fnv1aBase36(`tl16:0:${tlItem.data.items[0].event}`);
    const h1 = fnv1aBase36(`tl16:1:${tlItem.data.items[1].event}`);

    // Generate real timeline HTML to capture the exact emitted hashed response key
    const tlHtml = pipeline.generateFullPackHTML([tlItem], 'Space', false, {}, {
      includeTimeline: true,
      includeTeacherKey: false,
      timelineDisplayMode: 'cuttable-strips',
      timelineInteractive: true,
      annotations: [],
    });
    const tlDoc = parseDoc(tlHtml);
    const realTlInput = Array.from(tlDoc.querySelectorAll('input[data-allo-response-key*="timeline-date"]'))
      .find((el) => (el.getAttribute('data-allo-response-key') || '').includes(h0));
    expect(realTlInput).toBeTruthy();
    const realTlKey = realTlInput.getAttribute('data-allo-response-key');
    expect(realTlKey).toMatch(/timeline-date:[a-z0-9]+/);

    const grades = inboxMeta.exportedQuizAutoGrades({
      responses: {
        [realTlKey]: '1961',
        [`allo-response:tl16:timeline-date:${h1}:free-response`]: '1901',
        'allo-response:nt16:note:blank:0': 'Sunlight!',
        'allo-response:nt16:note:blank:1': 'nitrogen',
        'allo-response:qz16:q0:wrong-pair': '1',
        'allo-response:qz16:q0:partner': 'Photosynthesis',
        'allo-response:qz16:q1:sequence-verdict': 'no',
        'allo-response:qz16:q1:sequence-item': '2',
        'allo-response:qz16:q1:sequence-order': '1, 3, 2, 4',
        'allo-response:qz16:q1:sequence-principle': '0',
      },
    }, [tlItem, gnItem, quizItem]);

    expect(realTlKey).toContain(h0);
    expect(grades[realTlKey]).toMatchObject({ score: 100, status: 'correct' });
    expect(grades[`allo-response:tl16:timeline-date:${h1}:free-response`]).toMatchObject({ score: 0, status: 'incorrect' });
    expect(grades['allo-response:nt16:note:blank:0']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:nt16:note:blank:1']).toMatchObject({ score: 0, status: 'incorrect' });
    expect(grades['allo-response:qz16:q0:wrong-pair']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:qz16:q0:partner']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:qz16:q1:sequence-verdict']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:qz16:q1:sequence-item']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:qz16:q1:sequence-order']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:qz16:q1:sequence-principle']).toMatchObject({ score: 100, status: 'correct' });
  });

  it('resolves trusted history prompts for DBQ, hashed timeline dates, note-taking blanks/entries/pairs, sentence-frames, outline, and anchor-chart', () => {
    const h0 = fnv1aBase36('tlp16:0:Magna Carta signed');
    const history = [
      {
        id: 'dbq16',
        type: 'dbq',
        title: 'River Edicts',
        data: {
          documents: [{ title: 'Tablet 1', sourcingQuestions: ['Who carved it?'], analysisQuestions: ['Why regulate water?'], happPrompt: 'Explain historical situation' }],
          perspectives: [{ label: 'Farmers', description: 'Need irrigation access' }, { label: 'Stewards', description: 'Enforce sluice schedules' }],
          corroborationClaims: [{ claim: 'Sluices opened twice weekly' }],
        },
      },
      { id: 'tlp16', type: 'timeline', data: { items: [{ date: '1215', event: 'Magna Carta signed' }] } },
      {
        id: 'ntde16',
        type: 'note-taking',
        data: { templateType: 'double-entry', entries: [{ quote: 'All power flows downward', response: '' }] },
      },
      {
        id: 'sf16',
        type: 'sentence-frames',
        data: { items: [{ tier: 'expanding', text: 'Based on ___, the ruler decided ___.' }] },
      },
      {
        id: 'kwl16',
        type: 'outline',
        data: { structureType: 'KWL', main: 'Canal Law', branches: [{ title: 'Know', items: ['Rivers flood yearly'] }] },
      },
      {
        id: 'ac16',
        type: 'anchor-chart',
        title: 'Annotation Steps',
        data: { sections: [{ id: 'sec0', label: 'Annotation Steps', bullets: ['Cite line numbers'] }] },
      },
    ];

    expect(inboxMeta.lookupTrustedHistoryPrompt('dbq16:dbq:perspective', history)).toContain('Farmers');
    expect(inboxMeta.lookupTrustedHistoryPrompt('dbq16:dbq:corrob:0', history)).toContain('Sluices opened twice weekly');
    expect(inboxMeta.lookupTrustedHistoryPrompt('dbq16:dbq:0:happ:pointOfView', history)).toContain('Tablet 1');
    expect(inboxMeta.lookupTrustedHistoryPrompt(`tlp16:timeline-date:${h0}:free-response`, history)).toContain('Magna Carta signed');
    expect(inboxMeta.lookupTrustedHistoryPrompt('ntde16:note:response:0', history)).toContain('All power flows downward');
    expect(inboxMeta.lookupTrustedHistoryPrompt('sf16:0:sentence-frame', history)).toContain('Based on ___');
    expect(inboxMeta.lookupTrustedHistoryPrompt('kwl16:outline:0', history)).toContain('Know');
    expect(inboxMeta.lookupTrustedHistoryPrompt('ac16:ac:sec0:0:free-response', history)).toContain('Annotation Steps');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 17 · Alternative Formats, Narration & Builder TXT/ePub/BRF Hygiene
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 17 · Venn Dedup, Chrome & Symbolbar Stripping, and Control Preservation', () => {
  const pdfAuditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');

  const altStart = pdfAuditSrc.indexOf('const _ALLO_INTERACTIVE_CHROME_SEL =');
  const altEnd = pdfAuditSrc.indexOf('\n// _buildDocxBlobFromSpec:', altStart);
  const altHelpers = new Function(
    '_expXmlEsc',
    pdfAuditSrc.slice(altStart, altEnd) +
      '\nreturn { dedupeVenn: _alloDedupeVennActivityDom, replaceControls: _alloReplaceFormControlsForText, collectMo: _collectMoSegments, xhtml: _altFmtXhtmlFromHtml, epubFiles: _buildEpubPackageFiles, plainText: _altFmtHtmlToPlainText, brf: _buildBrailleBrf };'
  )(escapeXmlStub);

  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const cleanMdRoot = new Function(builderSlice + '\nreturn _builderCleanMarkdownRoot;')();

  const sampleInteractiveHtml = `<!DOCTYPE html><html lang="en"><head><title>Wave 17 Sample</title></head><body>
    <main>
      <h1>Photosynthesis Lesson</h1>
      <div class="alloflow-math-symbolbar"><button type="button">Copy √</button><button type="button">Copy π</button></div>
      <div class="alloflow-gm-controls"><button type="button">Check matches</button></div>
      <p>Student equation: <input type="text" value="x = 4"/> and blank <input type="text" value=""/>.</p>
      <p><label><input type="checkbox" checked/> Verified step</label> <label><input type="radio" name="r1"/> Skip</label></p>
      <textarea>Energy moves into glucose.</textarea>
      <p>Pick phase: <select><option value="">-- Choose --</option><option value="dark" selected>Calvin Cycle</option></select></p>
      <div class="alloflow-cs-strip">
        <div class="alloflow-cs-item-text">Chloroplast</div>
        <select hidden class="alloflow-cs-response"><option value="">Not placed</option><option value="plant">Plant Cell</option><option value="animal">Animal Cell</option></select>
      </div>
      <div class="alloflow-venn-activity">
        <div class="alloflow-venn-screen-only">
          <div class="alloflow-venn-controls"><button type="button">Shuffle</button></div>
          <div class="alloflow-venn-card"><button type="button" class="alloflow-venn-card-button">Mitochondria</button></div>
        </div>
        <div class="alloflow-venn-print-only" hidden>
          <div class="alloflow-venn-print-cards"><div class="alloflow-venn-print-card">Mitochondria</div></div>
        </div>
      </div>
    </main>
  </body></html>`;

  it('deduplicates Venn, strips .alloflow-math-symbolbar and Wave 7-18 chrome, and preserves filled/blank controls without leaking hidden <select> options across EPUB, MO, Plain Text, BRF, and Narration', () => {
    const mo = altHelpers.collectMo(sampleInteractiveHtml);
    const moJoined = mo.segments.map((s) => s.text).join(' ');
    expect(moJoined).not.toContain('Copy √');
    expect(moJoined).not.toContain('Check matches');
    expect(moJoined).not.toContain('Not placed');
    expect(moJoined).not.toContain('Animal Cell');
    expect(moJoined).toContain('x = 4');
    expect(moJoined).toContain('Energy moves into glucose.');
    expect(moJoined).toContain('Calvin Cycle');
    expect(moJoined.match(/Mitochondria/g) || []).toHaveLength(1);

    const epubPkg = altHelpers.epubFiles(sampleInteractiveHtml, { title: 'Wave 17' });
    const xhtml = epubPkg.files['OEBPS/content.xhtml'];
    expect(xhtml).not.toContain('Copy √');
    expect(xhtml).not.toContain('Check matches');
    expect(xhtml).not.toContain('-- Choose --');
    expect(xhtml).not.toContain('Animal Cell');
    expect(xhtml.match(/Mitochondria/g) || []).toHaveLength(1);
    expect(xhtml).toContain('x = 4');
    expect(xhtml).toContain('Calvin Cycle');

    const txt = altHelpers.plainText(sampleInteractiveHtml);
    expect(txt).not.toContain('Copy √');
    expect(txt).not.toContain('Check matches');
    expect(txt).not.toContain('Animal Cell');
    expect(txt.match(/Mitochondria/g) || []).toHaveLength(1);
    expect(txt).toContain('x = 4');
    expect(txt).toContain('___');
    expect(txt).toContain('[x]');
    expect(txt).toContain('[ ]');
    expect(txt).toContain('Calvin Cycle');

    const brf = altHelpers.brf(sampleInteractiveHtml);
    expect(brf.text).toBe(txt);
    expect(brf.brf.length).toBeGreaterThan(10);

    const spokenAccessible = AlloNarrationText.accessibleText(sampleInteractiveHtml, null, { languageRuns: false });
    const spokenNatural = AlloNarrationText.naturalText(sampleInteractiveHtml, { languageRuns: false });
    expect(spokenAccessible).not.toContain('Copy √');
    expect(spokenAccessible).not.toContain('Animal Cell');
    expect(spokenAccessible.match(/Mitochondria/g) || []).toHaveLength(1);
    expect(spokenNatural).not.toContain('Copy √');
    expect(spokenNatural).not.toContain('Animal Cell');
    expect(spokenNatural.match(/Mitochondria/g) || []).toHaveLength(1);
  });

  it('strips .alloflow-math-symbolbar (typo fixed) in _builderCleanMarkdownRoot and applies Wave 17 cleanup in Builder .txt, .epub, and .brf buttons', async () => {
    const mdDoc = parseDoc(sampleInteractiveHtml);
    const cleaned = cleanMdRoot(mdDoc);
    expect(cleaned.querySelector('.alloflow-math-symbolbar')).toBeNull();
    expect(cleaned.querySelector('.alloflow-gm-controls')).toBeNull();

    const callbacks = extractButtonCallbacks(exportPreviewSrc);
    const txtCb = callbacks.find((c) => c.text.includes('Plain Text (.txt)'));
    const epubCb = callbacks.find((c) => c.text.includes('application/epub+zip') || c.text.includes('ePub'));
    const brfCb = callbacks.find((c) => c.code.includes('const _toBRF'));
    expect(txtCb && epubCb && brfCb).toBeTruthy();

    const runBuilderBtn = async (cb, { withZip = false } = {}) => {
      const downloads = [];
      const zipFiles = new Map();
      if (withZip) {
        window.JSZip = class MockZip {
          file(n, v) { zipFiles.set(n, v); }
          generateAsync() { return Promise.resolve(new Blob(['epub'])); }
        };
      }
      const doc = parseDoc(sampleInteractiveHtml);
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

    const txtRes = await runBuilderBtn(txtCb);
    const txtOut = txtRes.downloads[0].blob.textContent;
    expect(txtOut).not.toContain('Copy √');
    expect(txtOut).not.toContain('Animal Cell');
    expect(txtOut).toContain('x = 4');
    expect(txtOut).toContain('[x]');
    expect(txtOut).toContain('Calvin Cycle');
    expect(txtOut.match(/Mitochondria/g) || []).toHaveLength(1);

    const brfRes = await runBuilderBtn(brfCb);
    expect(brfRes.downloads[0].meta.extension).toBe('brf');
    expect(brfRes.downloads[0].blob.textContent.length).toBeGreaterThan(10);

    const epubRes = await runBuilderBtn(epubCb, { withZip: true });
    const epubXhtml = epubRes.zipFiles.get('OEBPS/content.xhtml');
    expect(epubXhtml).not.toContain('Copy √');
    expect(epubXhtml).not.toContain('Animal Cell');
    expect(epubXhtml.match(/Mitochondria/g) || []).toHaveLength(1);
    expect(epubXhtml).toContain('display: block');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 18 · H5P Expanded Support, NotebookLM Parity, Fluency Record & Glossary Matching
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 18 · H5P Compatibility, NotebookLM (.md) Parity, Fluency Record & Interactive Glossary Matching', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const exportSrc = readFileSync(resolve(ROOT, 'export_source.jsx'), 'utf8');
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const builderHelpers = new Function(
    builderSlice + '\nreturn { h5pCompat: _builderH5PCompatibility, resourceOptions: _builderResourceOptions, resourceIncluded: _builderResourceIncluded, kwlLines: _kwlMarkdownLines, clean: _builderCleanMarkdownRoot };'
  )();

  it('surfaces simplified cloze and guided-notes / q-and-a note-taking in _builderH5PCompatibility and UI dropdown', () => {
    const history = [
      { id: 'g18', type: 'glossary', data: [{ term: 'Osmosis', def: 'Water movement' }, { term: 'Solute', def: 'Dissolved substance' }] },
      { id: 's18', type: 'simplified', title: 'Cell Passage', data: 'Osmosis balances every solute across membranes.' },
      { id: 'gn18', type: 'note-taking', title: 'Guided Notes', data: { templateType: 'guided-notes', blanks: [{ before: 'Water moves via', answer: 'osmosis', after: '.' }] } },
      { id: 'qa18', type: 'note-taking', title: 'Q&A Notes', data: { templateType: 'q-and-a', pairs: [{ question: 'Define solute', answer: 'Dissolved matter' }] } },
      { id: 'cn18', type: 'note-taking', title: 'Cornell Notes', data: { templateType: 'cornell-notes', cues: [{ text: 'Cue' }], notes: [{ text: 'Note' }] } },
    ];

    expect(builderHelpers.h5pCompat(history[1], history)).toMatchObject({ type: 'simplified', ready: true, library: 'Question Set 1.21', unit: 'blank' });
    expect(builderHelpers.h5pCompat(history[2], history)).toMatchObject({ type: 'note-taking', ready: true, unit: 'blank', valid: 1 });
    expect(builderHelpers.h5pCompat(history[3], history)).toMatchObject({ type: 'note-taking', ready: true, unit: 'prompt', manualReview: 1 });
    expect(builderHelpers.h5pCompat(history[4], history)).toMatchObject({ type: 'note-taking', ready: false });
    expect(exportPreviewSrc).toContain("item?.data?.templateType || item?.data?.template");
    expect(exportPreviewSrc).toContain("'Cloze reading'");
    expect(exportPreviewSrc).toContain("'Study notes'");
  });

  it('renders timeline { items }, concept-sort text + Uncategorized, math verification gate, DBQ, note-taking, sentence-frames, and outline in NotebookLM (.md) without bare `t`', async () => {
    const callbacks = extractButtonCallbacks(exportPreviewSrc);
    const nlmCb = callbacks.find((c) => c.code.includes('NotebookLM'));
    expect(nlmCb).toBeTruthy();

    const richHistory = [
      {
        id: 'ol18',
        type: 'outline',
        title: 'KWL Chart',
        data: { structureType: 'KWL', main: 'Photosynthesis', branches: [{ title: 'Know', items: ['Plants need light'] }] },
      },
      {
        id: 'tl18',
        type: 'timeline',
        title: 'Discoveries',
        data: { items: [{ date: '1665', event: 'Hooke observes cells' }, { date: '', event: 'Cell theory' }] },
      },
      {
        id: 'cs18',
        type: 'concept-sort',
        title: 'States',
        data: {
          categories: [{ id: 'solid', label: 'Solid' }],
          items: [{ text: 'Quartz', categoryId: 'solid' }, { text: 'Plasma', categoryId: 'other' }],
        },
      },
      {
        id: 'math18',
        type: 'math',
        title: 'Linear Drill',
        data: {
          problems: [{
            question: 'Solve 2x = 14',
            realWorld: 'Two equal packs total 14.',
            steps: [{ explanation: 'Divide by 2', latex: 'x = 7' }],
            answer: '7',
            _verification: { reviewRequired: true, teacherReviewed: false },
          }],
        },
      },
      {
        id: 'dbq18',
        type: 'dbq',
        title: 'Canal DBQ',
        data: {
          essentialQuestion: 'How did canals work?',
          historicalContext: 'River trade.',
          synthesisPrompt: 'Compare views.',
          documents: [{ title: 'Doc A', source: 'Archive', content: 'Sluices held water.', guidingQuestion: 'Who managed gates?', sourcingQuestions: ['Year written?'], analysisQuestions: ['Why build walls?'] }],
          perspectives: [{ label: 'Merchants', description: 'Steady transport' }],
          corroborationClaims: [{ claim: 'Tax rolls match' }],
          corroborationPrompts: [{ prompt: 'Check second tablet' }],
        },
      },
      {
        id: 'gn18m',
        type: 'note-taking',
        title: 'Guided',
        data: { templateType: 'guided-notes', blanks: [{ before: 'ATP holds', answer: 'chemical energy', after: '.' }] },
      },
      {
        id: 'lab18m',
        type: 'note-taking',
        title: 'Lab',
        data: { templateType: 'lab', question: 'Rate?', hypothesis: 'Increases', materials: [{ text: 'Beaker' }], procedure: [{ text: 'Measure' }], conclusion: 'Confirmed' },
      },
      {
        id: 'sf18',
        type: 'sentence-frames',
        title: 'Writing Scaffolds',
        data: { wordBank: ['because', 'evidence'], items: [{ tier: 'emerging', text: 'I claim ___ because ___.', text_en: 'Claim frame' }], rubric: 'TEACHER_RUBRIC_SECRET' },
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
        richHistory
      );
      await fn();
      return downloaded[0];
    };

    const studentMd = await runNlm({ includeAnswerKey: false, includeTeacherKey: false, assessmentMode: false });
    expect(studentMd).toContain('- **1665:** Hooke observes cells');
    expect(studentMd).toContain('Quartz');
    expect(studentMd).toContain('### Items to Sort');
    expect(studentMd).toContain('- Plasma');
    expect(studentMd).not.toContain('### Uncategorized');
    expect(studentMd).toContain('Solve 2x = 14');
    expect(studentMd).toContain('omitted');
    expect(studentMd).not.toContain('**Answer:** 7');
    expect(studentMd).not.toContain('[chemical energy]');
    expect(studentMd).not.toContain('TEACHER_RUBRIC_SECRET');
    expect(studentMd).toContain('Compare views.');
    expect(studentMd).toContain('Tax rolls match');
    expect(studentMd).toContain('Check second tablet');
    expect(studentMd).toContain('**Word Bank:** because, evidence');

    const teacherMd = await runNlm({ includeAnswerKey: true, includeTeacherKey: false, assessmentMode: false });
    expect(teacherMd).toContain('### Uncategorized');
    expect(teacherMd).toContain('- Plasma');
    expect(teacherMd).toContain('Teacher review recommended');
    expect(teacherMd).toContain('Divide by 2');
    expect(teacherMd).toContain('**Answer:** 7');
    expect(teacherMd).toContain('[chemical energy]');
    expect(teacherMd).toContain('**Teacher Rubric:** TEACHER_RUBRIC_SECRET');
  });

  it('gates fluency-record via includeFluencyRecord and prevents undefined/NaN text while keeping accessible markers & dark-mode CSS', () => {
    const fluencyItem = {
      id: 'fl18',
      type: 'fluency-record',
      title: 'Oral Reading Sample',
      data: {
        metrics: { accuracy: null, wcpm: undefined },
        wordData: [
          { word: 'Sunlight', status: 'correct' },
          { word: 'helps', status: 'stumbled' },
          { word: 'plants', status: 'missed' },
        ],
        feedback: 'Steady phrasing.',
      },
    };

    const omittedHtml = pipeline.generateFullPackHTML([fluencyItem], 'Fluency', false, {}, {
      includeFluencyRecord: false,
      annotations: [],
    });
    const omittedDoc = parseDoc(omittedHtml);
    expect(omittedDoc.body.textContent).not.toContain('Oral Reading Sample');
    expect(omittedDoc.querySelectorAll('.alloflow-fluency-section')).toHaveLength(0);

    const shownHtml = pipeline.generateFullPackHTML([fluencyItem], 'Fluency', false, {}, {
      includeFluencyRecord: true,
      annotations: [],
    });
    const shownDoc = parseDoc(shownHtml);
    const sectionText = shownDoc.querySelector('.alloflow-fluency-section')?.textContent || '';
    expect(sectionText).not.toContain('undefined');
    expect(sectionText).not.toContain('NaN');
    expect(sectionText).toContain('—');
    expect(sectionText).toContain('Sunlight');
    expect(sectionText).toContain('helps[~] (hesitation)');
    expect(sectionText).toContain('plants[×] (missed)');
    expect(shownHtml).toContain('html[data-alloflow-theme="dark"] .alloflow-fluency-section');

    expect(builderHelpers.resourceOptions([fluencyItem]).some((opt) => opt[0] === 'includeFluencyRecord')).toBe(true);
    expect(builderHelpers.resourceIncluded({ includeFluencyRecord: false }, 'fluency-record')).toBe(false);
    expect(exportSrc).toContain("'fluency-record': 'includeFluencyRecord'");
  });

  it('wires interactive Glossary Matching auto-uppercase, used-def dimming, duplicate detection, Check matches scoring & Reset', async () => {
    const gloss = {
      id: 'gm18',
      type: 'glossary',
      title: 'Key Vocabulary',
      data: [
        { term: 'Chloroplast', def: 'Captures sunlight energy.' },
        { term: 'Mitochondria', def: 'Produces ATP fuel.' },
        { term: 'Vacuole', def: 'Stores cellular water.' },
      ],
    };

    const html = pipeline.generateFullPackHTML([gloss], 'Cell Parts', false, {}, {
      includeGlossary: true,
      includeTeacherKey: false,
      glossaryDisplayMode: 'worksheet',
      glossaryWorksheetVariant: 'matching',
      assessmentMode: false,
      annotations: [],
    });
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-glossary-worksheet');

    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.edu/gm.html', virtualConsole: new VirtualConsole() });
    activeDoms.push(dom);
    await new Promise((done) => (dom.window.document.readyState === 'complete' ? done() : dom.window.addEventListener('load', done, { once: true })));
    const doc = dom.window.document;

    const inputs = Array.from(doc.querySelectorAll('input[data-allo-response-type="match"]'));
    expect(inputs).toHaveLength(3);
    const checkBtn = doc.querySelector('.alloflow-gm-check-btn');
    const resetBtn = doc.querySelector('.alloflow-gm-reset-btn');
    const status = doc.querySelector('.alloflow-gm-status');
    expect(checkBtn && resetBtn && status).toBeTruthy();

    // Auto-uppercase + used definition dimming
    const exp0 = inputs[0].getAttribute('data-expected-letter');
    inputs[0].value = exp0.toLowerCase();
    inputs[0].dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(inputs[0].value).toBe(exp0.toUpperCase());
    const usedLi = doc.querySelector(`[data-gloss-def-item][data-gloss-letter="${exp0}"]`);
    expect(usedLi.classList.contains('is-used-def')).toBe(true);

    // Duplicate detection
    inputs[1].value = exp0;
    inputs[1].dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(inputs[0].classList.contains('is-duplicate-letter')).toBe(true);
    expect(inputs[1].getAttribute('aria-invalid')).toBe('true');
    expect(status.textContent).toContain(exp0);

    // Check matches scoring
    inputs[1].value = inputs[1].getAttribute('data-expected-letter');
    inputs[2].value = inputs[2].getAttribute('data-expected-letter');
    checkBtn.click();
    expect(inputs.every((inp) => inp.classList.contains('is-match-correct'))).toBe(true);
    expect(status.textContent).toContain('3');

    // Reset clears inputs, dims & status
    resetBtn.click();
    expect(inputs.every((inp) => inp.value === '' && !inp.classList.contains('is-match-correct'))).toBe(true);
    expect(doc.querySelectorAll('.is-used-def')).toHaveLength(0);
    expect(status.textContent).toBe('');
  });
});
