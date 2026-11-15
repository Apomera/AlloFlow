// Verification suite for Waves 23-26 of the main resource export pipeline:
// - Wave 23: Assessment integrity & Teacher-Key parity (NotebookLM concept-sort/Venn, Slides concept-sort/Venn/anchor-chart, doc_pipeline Teacher Copy Venn/fluency/anchor-chart)
// - Wave 24: Resource toggles, builderResourceIds scoping, resourceOrder/resourceItemOrder sorting & alignment-report visibility
// - Wave 25: Organizers (Cause & Effect, Problem & Solution, Memory Palace, object branches, timeline events), unified MCQ/multi-select/answer-evidence option-key resolution (QTI, H5P, Slides, Builder compat), & scoped Unicode simplified H5P Cloze
// - Wave 26: Hidden .alloflow-cs-response/.alloflow-venn-response filled selection preservation across secondary exporters & Builder (.txt/.epub/.brf), EPUB inline-term attrs, Submission Inbox :ac:/shorthand/MCQ/timeline grading & prompts, generateExportAudio escaping/validation

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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
    sourceTopic: 'Ecosystem Dynamics',
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
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wave23-26');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const addToast = vi.fn();
  const exporter = window.AlloModules.createExport({
    liveRef: {
      current: {
        history,
        generatedContent: generatedContent || history[0] || null,
        sourceTopic: 'Ecosystem Dynamics',
        gradeLevel: 'Grade 7',
        studentResponses: {},
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
    generateUUID: (() => { let n = 0; return () => 'uuid-w23-' + (++n); })(),
  });
  return { exporter, recordedSlides, zipFiles, addToast };
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
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('view_submission_inbox_module.js');
  pipeline = createPipeline();
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
  exportHandlers = window.AlloModules.ExportHandlers;
}, 60000);

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.JSZip;
  delete window.PptxGenJS;
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 23 · Assessment Integrity & Teacher-Key Parity
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 23 · Assessment Integrity & Teacher-Key Parity', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const callbacks = extractButtonCallbacks(exportPreviewSrc);
  const nlmCb = callbacks.find((c) => c.code.includes('NotebookLM'));
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const builderHelpers = new Function(
    builderSlice + '\nreturn { clean: _builderCleanMarkdownRoot, kwlLines: _kwlMarkdownLines };'
  )();

  const runNlm = async (historyItems, exportConfig = {}) => {
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
      historyItems
    );
    await fn();
    return downloaded[0];
  };

  it('gates concept-sort & Venn answers in NotebookLM (.md) with deterministic shuffle and __uncategorized exclusion', async () => {
    const historyItems = [
      {
        id: 'cs23',
        type: 'concept-sort',
        title: 'Cell Sorting',
        data: {
          categories: [
            { id: 'plant', label: 'Plant Cell' },
            { id: 'animal', label: 'Animal Cell' },
            { id: '__uncategorized', label: 'Hidden Uncategorized Bucket', isUncategorized: true },
          ],
          items: [
            { text: 'Cell Wall', categoryId: 'plant' },
            { text: 'Centriole', categoryId: 'animal' },
            { text: 'Chloroplast', categoryId: 'plant' },
            { text: 'Secret Distractor', categoryId: '__uncategorized' },
          ],
        },
      },
      {
        id: 'vn23',
        type: 'outline',
        title: 'Mitosis vs Meiosis',
        data: {
          structureType: 'Venn Diagram',
          branches: [
            { title: 'Both', items: [{ text: 'DNA Replication' }] },
            { title: 'Mitosis', items: ['Two identical cells'] },
            { title: 'Meiosis', items: [{ label: 'Four haploid gametes' }] },
          ],
        },
      },
    ];

    const studentMd1 = await runNlm(historyItems, { includeAnswerKey: false, vennExportMode: 'activity', assessmentMode: false });
    const studentMd2 = await runNlm(historyItems, { includeAnswerKey: false, vennExportMode: 'activity', assessmentMode: false });
    expect(studentMd1).toBe(studentMd2);
    expect(studentMd1).toContain('### Categories');
    expect(studentMd1).toContain('Plant Cell');
    expect(studentMd1).toContain('Animal Cell');
    expect(studentMd1).not.toContain('Hidden Uncategorized Bucket');
    expect(studentMd1).not.toContain('Secret Distractor');
    expect(studentMd1).toContain('### Items to Sort');
    expect(studentMd1).toContain('Category answer key omitted');
    // Venn zone answers omitted in activity mode; shuffled bank present
    const vennSection = studentMd1.slice(studentMd1.indexOf('## Mitosis vs Meiosis'));
    expect(vennSection).toContain('_Sort items into this zone._');
    expect(vennSection).toContain('### Items to Sort');
    expect(vennSection).toContain('DNA Replication');
    expect(vennSection).toContain('Four haploid gametes');
    // assessmentMode overrides includeAnswerKey: true
    const assessMd = await runNlm(historyItems, { includeAnswerKey: true, includeTeacherKey: true, assessmentMode: true, vennExportMode: 'activity' });
    expect(assessMd).toContain('Category answer key omitted');
    expect(assessMd).not.toContain('Secret Distractor');
    expect(assessMd).toContain('_Sort items into this zone._');

    // Teacher key unlocks grouped categories & completed Venn bullets
    const teacherMd = await runNlm(historyItems, { includeAnswerKey: true, assessmentMode: false, vennExportMode: 'activity' });
    expect(teacherMd).toContain('### Plant Cell\n- Cell Wall\n- Chloroplast');
    expect(teacherMd).not.toContain('Category answer key omitted');
    const teacherVenn = teacherMd.slice(teacherMd.indexOf('## Mitosis vs Meiosis'));
    expect(teacherVenn).not.toContain('_Sort items into this zone._');
    expect(teacherVenn).toContain('- Mitosis\n  - Two identical cells');
    expect(teacherVenn).toContain('- Both\n  - DNA Replication');
  });

  it('gates concept-sort, Venn activity, and interactive anchor-chart speaker notes/bullets in Slides (.pptx)', async () => {
    const items = [
      {
        id: 'cs23s',
        type: 'concept-sort',
        title: 'Matter Sort',
        data: {
          categories: [{ id: 's', label: 'Solid' }, { id: 'g', label: 'Gas' }],
          items: [
            { text: 'Quartz', categoryId: 's' },
            { text: 'Helium', categoryId: 'g' },
            { text: 'ShouldNotAppearStudent', categoryId: '__uncategorized' },
          ],
        },
      },
      {
        id: 'vn23s',
        type: 'outline',
        title: 'Compare Cells',
        data: {
          structureType: 'Venn Diagram',
          branches: [
            { title: 'Shared', items: ['Ribosomes'] },
            { title: 'Eukaryote', items: ['Nucleus'] },
            { title: 'Prokaryote', items: ['Circular DNA'] },
          ],
        },
      },
      {
        id: 'ac23s',
        type: 'anchor-chart',
        title: 'Diffusion Poster',
        data: {
          bigIdea: 'Molecules move down concentration gradients.',
          memoryHook: 'High to Low is the Way to Go!',
          interactive: { armed: true, rubric: 'Grade 3 for direction + energy mention.' },
          sections: [
            {
              title: 'Passive Transport',
              summary: 'Requires zero ATP.',
              points: [{ text: 'Follows concentration gradient' }, 'Crosses semipermeable membrane'],
              answerKey: ['High to low concentration', 'No cellular energy needed'],
            },
          ],
        },
      },
    ];

    const stu = setupExporter({ history: items, exportConfig: { audience: 'student', vennExportMode: 'activity', includeAnswerKey: false } });
    await stu.exporter.handleExportSlides({ audience: 'student', vennExportMode: 'activity', includeAnswerKey: false });
    const stuSlideTxt = stu.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    const stuNotesTxt = stu.recordedSlides.map((s) => s.notes.join('\n')).join('\n');
    expect(stuSlideTxt).not.toContain('ShouldNotAppearStudent');
    expect(stuNotesTxt).toContain('Items to sort');
    expect(stuSlideTxt).toContain('Nucleus');
    expect(stuSlideTxt).toContain('Circular DNA');
    expect(stuSlideTxt).toContain('Ribosomes');
    expect(stuSlideTxt).toContain('Molecules move down concentration gradients.');
    expect(stuSlideTxt).toContain('High to Low is the Way to Go!');
    expect(stuSlideTxt).toContain('Requires zero ATP.');
    expect(stuSlideTxt).toContain('_____');
    expect(stuSlideTxt).not.toContain('Follows concentration gradient');
    expect(stuNotesTxt).not.toContain('Follows concentration gradient');
    expect(stuNotesTxt).not.toContain('High to low concentration');
    expect(stuNotesTxt).not.toContain('ShouldNotAppearStudent');

    const tch = setupExporter({ history: items, exportConfig: { audience: 'teacher', vennExportMode: 'activity', includeTeacherKey: true, includeAnswerKey: true } });
    await tch.exporter.handleExportSlides({ audience: 'teacher', vennExportMode: 'activity', includeAnswerKey: true });
    const tchSlideTxt = tch.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    const tchNotesTxt = tch.recordedSlides.map((s) => s.notes.join('\n')).join('\n');
    expect(tchSlideTxt).toContain('Follows concentration gradient');
    expect(tchSlideTxt).toContain('Crosses semipermeable membrane');
    expect(tchNotesTxt).toContain('High to low concentration');
  });

  it('renders Teacher Copy Venn completed key, skips static fluency-record/unkeyed anchor-chart, and includes rubric + s.answerKey in doc_pipeline', () => {
    const items = [
      {
        id: 'vn23d',
        type: 'outline',
        title: 'Venn Check',
        data: {
          structureType: 'Venn Diagram',
          branches: [
            { title: 'Prokaryote', items: ['Nucleoid'] },
            { title: 'Eukaryote', items: ['Mitochondria'] },
            { title: 'Both', items: ['Plasma membrane'] },
          ],
        },
      },
      {
        id: 'fl23d',
        type: 'fluency-record',
        title: 'Oral Check',
        data: { metrics: { wcpm: 112, accuracy: 96 }, wordData: [{ word: 'Cell', status: 'correct' }] },
      },
      {
        id: 'acPlain',
        type: 'anchor-chart',
        title: 'Plain Static Chart',
        data: { sections: [{ label: 'Steps', bullets: ['Observe cleanly'] }] },
      },
      {
        id: 'acKeyed',
        type: 'anchor-chart',
        title: 'Armed Keyed Chart',
        data: {
          interactive: { armed: true, rubric: 'Full points if student explains osmosis.' },
          sections: [{ title: 'Core Rule', points: ['Water moves toward solute'], answerKey: ['High water to low water potential'] }],
        },
      },
    ];

    const html = pipeline.generateFullPackHTML(items, 'Teacher Parity', false, {}, {
      audience: 'student',
      includeTeacherKey: true,
      includeOutline: true,
      includeFluencyRecord: true,
      includeAnchorChart: true,
      vennExportMode: 'activity',
      assessmentMode: false,
      annotations: [],
    });
    const doc = parseDoc(html);
    const teacherRoot = doc.querySelector('.teacher-view');
    expect(teacherRoot).toBeTruthy();
    const teacherText = teacherRoot.textContent;
    // Teacher Copy Venn renders completed zone items (not blank activity zone cards)
    expect(teacherText).toContain('Nucleoid');
    expect(teacherText).toContain('Mitochondria');
    expect(teacherText).toContain('Plasma membrane');
    // Static fluency-record (no meta) & non-keyed static anchor-chart omitted from Teacher Copy
    expect(teacherText).not.toContain('Oral Check');
    expect(teacherText).not.toContain('Plain Static Chart');
    // Armed/keyed anchor-chart renders in Teacher Copy with answerKey and rubric
    expect(teacherText).toContain('Armed Keyed Chart');
    expect(teacherText).toContain('High water to low water potential');
    expect(teacherText).toContain('Full points if student explains osmosis.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 24 · Resource Toggles, Scoping & Ordering Parity
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 24 · Resource Toggles, Scoping & Ordering Parity', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const callbacks = extractButtonCallbacks(exportPreviewSrc);
  const nlmCb = callbacks.find((c) => c.code.includes('NotebookLM'));
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const builderHelpers = new Function(
    'translate',
    builderSlice + '\nreturn { clean: _builderCleanMarkdownRoot, kwlLines: _kwlMarkdownLines, options: _builderResourceOptions, included: _builderResourceIncluded };'
  )((k) => k);

  it('scopes, filters toggles (including udl-advice/alignment-report/original), and stably orders Slides & NotebookLM', async () => {
    const history = [
      { id: 'udl24', type: 'udl-advice', title: 'UDL Scaffolds', data: { engagement: ['Provide choice'] } },
      { id: 'orig24', type: 'simplified', isOriginalReading: true, title: 'Source Passage', data: 'Original primary reading paragraph.' },
      { id: 'ac24', type: 'anchor-chart', title: 'Cell Chart', data: { sections: [{ label: 'Key', bullets: ['Cell theory'] }] } },
      { id: 'lp24', type: 'lesson-plan', title: 'Teacher Pacing Plan', data: { objective: 'Model mitosis' } },
      { id: 'ar24', type: 'alignment-report', title: 'Standards Alignment Matrix', data: { summary: 'NGSS MS-LS1-1 aligned.' } },
      { id: 'qs24', type: 'simplified', title: 'Simplified Text', data: 'Cells are building blocks.' },
    ];

    // Slides scoping + toggles + ordering
    const slidesCase = setupExporter({
      history,
      exportConfig: {
        audience: 'teacher',
        includeTeacherKey: true,
        includeUdl: false, // legacy toggle alias for udl-advice
        includeOriginalReading: false,
        builderResourceIds: ['udl24', 'orig24', 'ac24', 'qs24', 'ar24'],
        resourceOrder: ['includeAlignmentReport', 'includeAnchorChart', 'includeSimplified'],
        resourceItemOrder: ['ac24', 'ar24', 'qs24'],
      },
    });
    await slidesCase.exporter.handleExportSlides({ audience: 'teacher', includeAnswerKey: true });
    const titles = slidesCase.recordedSlides.slice(1).map((s) => s.texts[0]?.raw || '');
    expect(titles.some((t) => t.includes('UDL Scaffolds'))).toBe(false);
    expect(titles.some((t) => t.includes('Original with supports'))).toBe(false);
    expect(titles.some((t) => t.includes('Teacher Pacing Plan'))).toBe(false); // excluded by builderResourceIds
    const idxAc = titles.findIndex((t) => t.includes('Cell Chart'));
    const idxAr = titles.findIndex((t) => t.includes('Standards Alignment Matrix'));
    const idxQs = titles.findIndex((t) => t.includes('Simplified Text'));
    expect(idxAc).toBeGreaterThan(-1);
    expect(idxAr).toBeGreaterThan(idxAc); // resourceItemOrder runs after resourceOrder and puts ac24 < ar24 < qs24
    expect(idxQs).toBeGreaterThan(idxAr);

    // NotebookLM scoping + toggles + alignment-report hiding + ordering
    const runNlm = async (cfg, extraScope) => {
      const downloaded = [];
      const fn = new Function(
        'exportPreviewRef', 'exportConfig', 'altExportBusy', 'beginAlternativeExport', 'finishAlternativeExport',
        '_builderCleanMarkdownRoot', '_builderMarkdownFromRoot', '_kwlMarkdownLines',
        'window', 'Blob', 'downloadBuilderBlob', 'addToast', 'history', 'builderResourceIds',
        'return (' + nlmCb.code + ');'
      )(
        { current: { contentDocument: null } },
        cfg,
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
        history,
        extraScope
      );
      await fn();
      return downloaded[0];
    };

    const stuMd = await runNlm({
      includeAnswerKey: false,
      includeUdlAdvice: false,
      resourceItemOrder: ['qs24', 'orig24'],
    }, ['orig24', 'ar24', 'qs24', 'udl24']);
    expect(stuMd).not.toContain('UDL Scaffolds');
    expect(stuMd).not.toContain('Standards Alignment Matrix'); // hidden when !_showKey
    expect(stuMd).not.toContain('Teacher Pacing Plan'); // outside builderResourceIds
    expect(stuMd.indexOf('## Simplified Text')).toBeLessThan(stuMd.indexOf('## Source Passage'));

    const tchMd = await runNlm({
      includeTeacherKey: true,
      includeOriginalReading: false,
      resourceOrder: ['includeAlignmentReport', 'includeSimplified'],
    }, ['orig24', 'ar24', 'qs24']);
    expect(tchMd).not.toContain('Source Passage'); // includeOriginalReading: false
    expect(tchMd.indexOf('## Standards Alignment Matrix')).toBeLessThan(tchMd.indexOf('## Simplified Text'));
  });

  it('wires alignment-report in doc_pipeline TOC/visibility and _builderResourceOptions/_builderResourceIncluded', () => {
    const arItem = { id: 'arW24', type: 'alignment-report', title: 'Standards Check', data: { alignment: 'NGSS 7-LS1' } };
    const extraQuiz = { id: 'q24t', type: 'quiz', title: 'Check Q', data: { questions: [{ type: 'mcq', question: 'Q?', options: ['A', 'B'], correct: 0 }] } };
    const studentHtml = pipeline.generateFullPackHTML([arItem, extraQuiz], 'Alignment Test', false, {}, {
      audience: 'student',
      includeTeacherKey: false,
      includeAlignmentReport: true,
      annotations: [],
    });
    const studentDoc = parseDoc(studentHtml);
    expect(studentDoc.body.textContent).not.toContain('Standards Check');
    expect(studentDoc.querySelector('.alloflow-toc')?.textContent || '').not.toContain('Standards Check');

    const teacherHtml = pipeline.generateFullPackHTML([arItem, extraQuiz], 'Alignment Test', false, {}, {
      audience: 'teacher',
      includeTeacherKey: true,
      includeAlignmentReport: true,
      annotations: [],
    });
    const teacherDoc = parseDoc(teacherHtml);
    expect(teacherDoc.body.textContent).toContain('Standards Check');
    expect(teacherDoc.querySelector('.alloflow-toc')?.textContent || '').toContain('Standards Check');

    const opts = builderHelpers.options([arItem]);
    expect(opts.some(([k, , ty]) => k === 'includeAlignmentReport' && ty === 'alignment-report')).toBe(true);
    expect(builderHelpers.included({}, 'includeAlignmentReport')).toBe(true);
    expect(builderHelpers.included({ includeAlignmentReport: false }, 'includeAlignmentReport')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 25 · Organizers, QTI/H5P/Slides Option-Key Parity & Scoped Unicode Cloze
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 25 · Organizers, QTI/H5P/Slides Key Parity & Scoped Unicode Cloze', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const builderHelpers = new Function(
    'translate',
    builderSlice + '\nreturn { h5pCompat: _builderH5PCompatibility, kwlLines: _kwlMarkdownLines };'
  )((k) => k);
  const nlmCb = extractButtonCallbacks(exportPreviewSrc).find((c) => c.code.includes('NotebookLM'));

  it('exports Cause & Effect, Problem & Solution, object branch items, Memory Palace (with extraRooms/Loci), and timeline events across Slides & NotebookLM', async () => {
    const items = [
      {
        id: 'ce25',
        type: 'outline',
        title: 'Heat Transfer',
        data: {
          structureType: 'Cause & Effect',
          branches: [
            { title: 'Causes', items: [{ text: 'Solar heating' }] },
            { title: 'Effects', items: [{ label: 'Convection current' }] },
          ],
        },
      },
      {
        id: 'ps25',
        type: 'outline',
        title: 'Runoff Fix',
        data: {
          structureType: 'Problem and Solution',
          branches: [
            { title: 'Problem', items: [{ content: 'Nutrient algal bloom' }] },
            { title: 'Solution', items: ['Riparian buffer strips'] },
          ],
        },
      },
      {
        id: 'mp25',
        type: 'outline',
        title: 'Organelle Palace',
        data: {
          structureType: 'Memory Palace',
          branches: [{ title: 'Entry Hall', items: ['Mitochondria'], mnemonics: ['Glowing power generator'] }],
          memoryPalace: {
            myMnemonics: { xr1_l1: 'Student custom filter lock' },
            extraRooms: [{ id: 'xr1', title: 'Vault' }],
            extraLoci: [{ id: 'xr1_l1', room: 'xr1', label: 'Cell Membrane', mnemonic: 'AI gatekeeper' }],
          },
        },
      },
      {
        id: 'tl25',
        type: 'timeline',
        title: 'Microscopy Steps',
        data: {
          events: [{ date: '1674', title: 'Leeuwenhoek views protozoa' }, { date: '1839', description: 'Schwann cell theory' }],
        },
      },
    ];

    expect(builderHelpers.kwlLines(items[0].data, (v) => String(v || ''), true).join('\n')).toContain('- Solar heating');
    expect(builderHelpers.kwlLines(items[1].data, (v) => String(v || ''), true).join('\n')).toContain('- Nutrient algal bloom');

    const { exporter, recordedSlides } = setupExporter({ history: items, exportConfig: { includeStudentResponses: true } });
    await exporter.handleExportSlides({ audience: 'teacher', includeAnswerKey: true });
    const slidesTxt = recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    expect(slidesTxt).toContain('Solar heating');
    expect(slidesTxt).toContain('Convection current');
    expect(slidesTxt).toContain('Nutrient algal bloom');
    expect(slidesTxt).toContain('Entry Hall');
    expect(slidesTxt).toContain('Glowing power generator');
    expect(slidesTxt).toContain('Vault');
    expect(slidesTxt).toContain('Cell Membrane');
    expect(slidesTxt).toContain('Student custom filter lock');
    expect(slidesTxt).toContain('Leeuwenhoek views protozoa');
    expect(slidesTxt).toContain('Schwann cell theory');

    const downloaded = [];
    const runNlm = new Function(
      'exportPreviewRef', 'exportConfig', 'altExportBusy', 'beginAlternativeExport', 'finishAlternativeExport',
      '_builderCleanMarkdownRoot', '_builderMarkdownFromRoot', '_kwlMarkdownLines',
      'window', 'Blob', 'downloadBuilderBlob', 'addToast', 'history',
      'return (' + nlmCb.code + ');'
    )(
      { current: { contentDocument: null } },
      { includeStudentResponses: true },
      '',
      () => true,
      () => {},
      (root) => root,
      () => ({ markdown: '', warnings: [] }),
      builderHelpers.kwlLines,
      { alloCopyText: async () => false },
      class MockBlob { constructor(parts) { this.text = parts.join(''); } },
      (blob) => { downloaded.push(blob.text); },
      () => {},
      [items[2]]
    );
    await runNlm();
    expect(downloaded[0]).toContain('### Entry Hall');
    expect(downloaded[0]).toContain('Glowing power generator');
    expect(downloaded[0]).toContain('### Vault');
    expect(downloaded[0]).toContain('Student custom filter lock');
  });

  it('unifies quiz option-key resolution across QTI, H5P (QuestionSet & SingleChoiceSet), Slides, and _builderH5PCompatibility', async () => {
    const mixedQuiz = {
      id: 'qz25m',
      type: 'quiz',
      title: 'Option Key Variants',
      data: {
        questions: [
          { type: 'mcq', question: 'Q1 letter key', options: ['Red', 'Blue', 'Green'], correct: 'B' },
          { type: 'mcq', question: 'Q2 answer alias', options: ['X', 'Y', 'Z'], answer: 2 },
          { type: 'multi-select', question: 'Q3 indices array', options: ['ATP', 'Rock', 'NADH'], correctIndices: [0, 2] },
          {
            type: 'answer-evidence',
            question: 'Q4 index aliases',
            answerOptions: ['Option Alpha', 'Option Beta'],
            correctAnswerIndex: 1,
            evidenceOptions: ['Line 2 quote', 'Unrelated'],
            correctEvidenceIndex: 0,
          },
        ],
      },
    };

    expect(builderHelpers.h5pCompat(mixedQuiz, [])).toMatchObject({ ready: true, total: 4, valid: 4, omitted: 0 });

    // QTI check
    const qti = setupExporter({ generatedContent: mixedQuiz });
    const qtiOk = await qti.exporter.handleExportQTI({ generatedContent: mixedQuiz });
    expect(qtiOk).toBe(true);
    const qtiXml = Array.from(qti.zipFiles.entries()).find(([k]) => k.endsWith('.xml') && k !== 'imsmanifest.xml')?.[1] || '';
    expect(qtiXml).toContain('<varequal respident="RESPONSE_0">OPT_1</varequal>'); // B -> OPT_1
    expect(qtiXml).toContain('<varequal respident="RESPONSE_1">OPT_2</varequal>'); // answer: 2 -> OPT_2
    expect(qtiXml).toContain('<varequal respident="RESPONSE_2">OPT_0</varequal>'); // correctIndices [0,2]
    expect(qtiXml).toContain('<varequal respident="RESPONSE_2">OPT_2</varequal>');
    expect(qtiXml).toContain('<varequal respident="ANSWER_3">ANS_1</varequal>'); // answerIndex: 1 -> ANS_1
    expect(qtiXml).toContain('<varequal respident="EVIDENCE_3">EVID_0</varequal>'); // evidenceIndex: 0 -> EVID_0

    // H5P QuestionSet check
    const h5pQs = setupExporter({ generatedContent: mixedQuiz });
    expect(await h5pQs.exporter.handleExportH5P({ generatedContent: mixedQuiz })).toBe(true);
    const qsJson = JSON.parse(h5pQs.zipFiles.get('content/content.json'));
    const q1Answers = qsJson.questions[0].params.answers;
    expect(q1Answers[1].correct).toBe(true); // Blue
    const q3Answers = qsJson.questions[2].params.answers;
    expect(q3Answers[0].correct && q3Answers[2].correct && !q3Answers[1].correct).toBe(true);

    // H5P SingleChoiceSet (all MCQ) with letter & numeric answer aliases
    const singleQuiz = {
      id: 'qz25s',
      type: 'quiz',
      title: 'All MCQ SingleChoiceSet',
      data: {
        questions: [
          { type: 'mcq', question: 'Pick C', options: ['One', 'Two', 'Three'], correct: 'C' },
          { type: 'mcq', question: 'Pick A', options: ['Alpha', 'Beta'], answer: 0 },
        ],
      },
    };
    const h5pSc = setupExporter({ generatedContent: singleQuiz });
    expect(await h5pSc.exporter.handleExportH5P({ generatedContent: singleQuiz })).toBe(true);
    const scJson = JSON.parse(h5pSc.zipFiles.get('content/content.json'));
    expect(scJson.choices[0].answers[0]).toContain('Three'); // SingleChoiceSet puts correct answer at index 0
    expect(scJson.choices[1].answers[0]).toContain('Alpha');

    // Slides quiz speaker-note / answer key check
    const sl = setupExporter({ history: [mixedQuiz], exportConfig: { audience: 'teacher', includeAnswerKey: true } });
    await sl.exporter.handleExportSlides({ audience: 'teacher', includeAnswerKey: true });
    const slAll = sl.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n') + '\n' + s.notes.join('\n')).join('\n');
    expect(slAll).toContain('B) Blue');
    expect(slAll).toContain('C) Z');
    expect(slAll).toContain('A) ATP; C) NADH');
    expect(slAll).toContain('Option Beta | Evidence: Line 2 quote');
  });

  it('scopes H5P & Builder simplified Cloze glossaries by unitId/sourceFamilyId, parses JSON glossaries, and handles Unicode word boundaries', async () => {
    const simpU1 = {
      id: 's25-u1',
      type: 'simplified',
      title: 'La fotosíntesis',
      unitId: 'u1',
      sourceFamilyId: 'famA',
      data: 'Las plantas hacen fotosíntesis con luz solar.\n--- ENGLISH TRANSLATION ---\nPlants use chlorine here.',
    };
    const glossU1Json = {
      id: 'g25-u1',
      type: 'glossary',
      unitId: 'u1',
      sourceFamilyId: 'famA',
      data: JSON.stringify([{ term: 'fotosíntesis', def: 'Light sugar synthesis' }]),
    };
    const glossU2 = {
      id: 'g25-u2',
      type: 'glossary',
      unitId: 'u2',
      sourceFamilyId: 'famB',
      data: [{ term: 'luz', def: 'Other unit term that must not scope into u1 when u1 has a glossary' }],
    };

    const compat = builderHelpers.h5pCompat(simpU1, [glossU1Json, glossU2]);
    expect(compat).toMatchObject({ type: 'simplified', ready: true, valid: 1 });

    const h5pSimp = setupExporter({ generatedContent: simpU1, history: [glossU1Json, glossU2] });
    expect(await h5pSimp.exporter.handleExportH5P({ generatedContent: simpU1 })).toBe(true);
    const content = JSON.parse(h5pSimp.zipFiles.get('content/content.json'));
    expect(content.questions).toHaveLength(1);
    expect(content.questions[0].params.questions[0]).toContain('*fotosíntesis*');
    expect(JSON.stringify(content)).not.toContain('*luz*');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 26 · Secondary Exporters, Submission Inbox & Audio Escaping
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 26 · Secondary Exporters, Submission Inbox & Audio Escaping', () => {
  const pdfAuditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const callbacks = extractButtonCallbacks(exportPreviewSrc);

  const specStart = pdfAuditSrc.indexOf('function _htmlToDocxSpec(html) {');
  const specEnd = pdfAuditSrc.indexOf('\n// _buildDocxBlobFromSpec:', specStart);
  const pdfHelpers = new Function(
    '_expXmlEsc',
    pdfAuditSrc.slice(specStart, specEnd) +
      '\nreturn { docxSpec: _htmlToDocxSpec, odtXml: _htmlToOdtContentXml, dtbookXml: _htmlToDtbookXml, collectMo: _collectMoSegments, epubFiles: _buildEpubPackageFiles, plainText: _altFmtHtmlToPlainText, brf: _buildBrailleBrf };'
  )(escapeXmlStub);

  const richActivityHtml = `<!DOCTYPE html><html lang="en"><head><title>Wave 26 Sample</title></head><body><main>
    <h1>Cell Organelles</h1>
    <p>Learn about <button type="button" class="alloflow-inline-term" lang="es" dir="ltr" data-allo-term="ósmosis" data-allo-def="Diffusion of water" title="Tap for definition">ósmosis</button>.</p>
    <div class="alloflow-cs-card">
      Chloroplast
      <select hidden class="alloflow-cs-response"><option value="">Not placed</option><option value="plant" selected>Plant Cell</option></select>
    </div>
    <div class="alloflow-cs-card">
      Centriole
      <select hidden class="alloflow-cs-response"><option value="" selected>Not placed</option><option value="animal">Animal Cell</option></select>
    </div>
    <div class="alloflow-cs-strip">
      Golgi Body
      <select hidden class="alloflow-cs-response"><option value="">Not sorted</option><option value="euk" selected>Eukaryotic</option></select>
    </div>
    <div class="alloflow-venn-activity">
      <div class="alloflow-venn-screen-only">
        <div class="alloflow-venn-card">
          <button type="button" class="alloflow-venn-card-button">Mitochondria</button>
          <select hidden class="alloflow-venn-response"><option value="">Zone</option><option value="shared" selected>Both Zones</option></select>
        </div>
      </div>
      <div class="alloflow-venn-print-only" hidden>
        <div class="alloflow-venn-print-cards"><div class="alloflow-venn-print-card">Mitochondria</div></div>
      </div>
    </div>
  </main></body></html>`;

  it('preserves filled hidden CS/Venn response selections and skips ___ for empty hidden selects across secondary exporters & Builder (.txt/.epub/.brf)', async () => {
    const spec = pdfHelpers.docxSpec(richActivityHtml);
    const docxText = spec.blocks.flatMap((b) => (b.runs || []).map((r) => r.text)).join('\n');
    const odtXml = pdfHelpers.odtXml(richActivityHtml);
    const dtbookXml = pdfHelpers.dtbookXml(richActivityHtml, { title: 'Wave 26' });
    const moJoined = pdfHelpers.collectMo(richActivityHtml).segments.map((s) => s.text).join(' ');
    const epubXhtml = pdfHelpers.epubFiles(richActivityHtml, { title: 'Wave 26' }).files['OEBPS/content.xhtml'];
    const txtOut = pdfHelpers.plainText(richActivityHtml);
    const brfOut = pdfHelpers.brf(richActivityHtml);

    [docxText, odtXml, dtbookXml, moJoined, epubXhtml, txtOut, brfOut.text].forEach((surface) => {
      expect(surface).toContain('Plant Cell');
      expect(surface).toContain('Eukaryotic');
      expect(surface).toContain('Both Zones');
      expect(surface).not.toContain('Animal Cell');
      expect(surface).not.toContain('Not placed');
      expect(surface).not.toContain('Not sorted');
      expect(surface).not.toContain('___');
    });
    expect(moJoined).toContain('ósmosis');

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
      const doc = parseDoc(richActivityHtml);
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
    expect(builderTxt).toContain('Plant Cell');
    expect(builderTxt).toContain('Eukaryotic');
    expect(builderTxt).toContain('Both Zones');
    expect(builderTxt).not.toContain('Animal Cell');
    expect(builderTxt).not.toContain('___');

    const builderBrf = (await runBuilderBtn(brfCb)).downloads[0].blob.textContent;
    expect(builderBrf.length).toBeGreaterThan(10);

    const builderEpubXhtml = (await runBuilderBtn(epubCb, true)).zipFiles.get('OEBPS/content.xhtml');
    expect(builderEpubXhtml).toContain('Plant Cell');
    expect(builderEpubXhtml).toContain('Eukaryotic');
    expect(builderEpubXhtml).toContain('Both Zones');
    expect(builderEpubXhtml).not.toContain('Animal Cell');
    expect(builderEpubXhtml).not.toContain('___');
    const epubDoc = new DOMParser().parseFromString(builderEpubXhtml, 'application/xhtml+xml');
    const inlineTerm = epubDoc.querySelector('span.alloflow-inline-term');
    expect(inlineTerm).toBeTruthy();
    expect(inlineTerm.getAttribute('lang')).toBe('es');
    expect(inlineTerm.getAttribute('dir')).toBe('ltr');
    expect(inlineTerm.getAttribute('data-allo-term')).toBe('ósmosis');
    expect(inlineTerm.getAttribute('data-allo-def')).toBe('Diffusion of water');
    expect(inlineTerm.getAttribute('title')).toBe('Tap for definition');
  });

  it('auto-grades :ac: blanks, shorthand IDs (quiz/ac/sf/nt/math), MCQ string/letter keys, and events timeline hashes in Submission Inbox', () => {
    const history = [
      {
        type: 'quiz',
        title: 'Quick Check',
        data: {
          questions: [
            { type: 'mcq', question: 'Powerhouse?', options: ['Golgi', 'Mitochondria', 'Ribosome'], correctAnswer: 'B' },
            { type: 'mcq', question: 'Solvent?', options: ['Oil', 'Water'], correctAnswer: 'Water' },
          ],
        },
      },
      {
        type: 'anchor-chart',
        title: 'Osmosis Poster',
        data: {
          interactive: { armed: true },
          sections: [
            {
              id: 's0',
              label: 'Key Terms',
              points: [{ text: 'osmosis' }, { text: 'A'.repeat(165) }],
              answerKey: ['osmosis', 'A'.repeat(165)],
            },
          ],
        },
      },
      {
        type: 'sentence-frames',
        title: 'Frames',
        data: { items: [{ tier: 'emerging', frame: 'First ___ happens.' }] },
      },
      {
        type: 'note-taking',
        title: 'Notes',
        data: { templateType: 'guided-notes', blanks: [{ before: 'ATP stands for', answer: 'adenosine triphosphate' }] },
      },
      {
        type: 'math',
        title: 'Equation',
        data: { problems: [{ question: 'Solve 3x = 12', answer: '4' }] },
      },
      {
        id: 'tl26',
        type: 'timeline',
        title: 'Cell Milestones',
        data: {
          events: [
            { date: '1838', title: 'Schleiden plant cells' },
            { date: '1855', description: 'Virchow cell division' },
          ],
        },
      },
    ];

    const hash0 = fnv1aBase36('tl26:0:Schleiden plant cells');
    const hash1 = fnv1aBase36('tl26:1:Virchow cell division');
    const grades = inboxMeta.exportedQuizAutoGrades({
      responses: {
        'allo-response:quiz:q0:mcq': 'Mitochondria',
        'allo-response:quiz:q1:mcq': '1',
        'allo-response:ac:ac:s0:0:free-response': 'Osmosis!',
        'allo-response:ac:ac:s0:1:free-response': 'Anything',
        'allo-response:nt:note:blank:0': 'Adenosine Triphosphate',
        'allo-response:math:math:0:answer': '4',
        [`allo-response:tl26:timeline-date:${hash0}`]: '1838',
        'allo-response:tl26:timeline-order': JSON.stringify([hash0, hash1]),
      },
    }, history);

    expect(grades['allo-response:quiz:q0:mcq']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:quiz:q1:mcq']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:ac:ac:s0:0:free-response']).toMatchObject({ score: 100, status: 'correct' });
    // >160 chars reference line stays ungraded for teacher review
    expect(grades['allo-response:ac:ac:s0:1:free-response']).toBeUndefined();
    expect(grades['allo-response:nt:note:blank:0']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:math:math:0:answer']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades[`allo-response:tl26:timeline-date:${hash0}`]).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:tl26:timeline-order']).toMatchObject({ score: 100, status: 'correct' });

    // Trusted history prompts with shorthand IDs & timeline events
    expect(inboxMeta.lookupTrustedHistoryPrompt('quiz:q0:mcq', history)).toContain('Powerhouse?');
    expect(inboxMeta.lookupTrustedHistoryPrompt('math:math:0:answer', history)).toContain('Solve 3x = 12');
    expect(inboxMeta.lookupTrustedHistoryPrompt('sf:0:sentence-frame', history)).toContain('First ___ happens.');
    expect(inboxMeta.lookupTrustedHistoryPrompt('ac:ac:s0:0:free-response', history)).toContain('osmosis');
    expect(inboxMeta.lookupTrustedHistoryPrompt(`tl26:timeline-date:${hash1}`, history)).toContain('Virchow cell division');
  });

  it('escapes label HTML and validates audioData URLs in generateExportAudio', async () => {
    const valid = await exportHandlers.generateExportAudio('Hello world', 'Track <1> "A" & \'B\'', {
      callTTS: async () => 'data:audio/mpeg;base64,SGVsbG8=',
    });
    expect(valid).toContain('Listen: Track &lt;1&gt; &quot;A&quot; &amp; &#39;B&#39;');
    expect(valid).toContain('src="data:audio/mpeg;base64,SGVsbG8="');

    const badHtml = await exportHandlers.generateExportAudio('Hello', 'Bad', {
      callTTS: async () => 'data:text/html,<script>alert(1)</script>',
    });
    expect(badHtml).toBe('');

    const attrBreak = await exportHandlers.generateExportAudio('Hello', 'Bad', {
      callTTS: async () => 'data:audio/mp3" onerror="alert(1),SGVsbG8=',
    });
    expect(attrBreak).toBe('');
  });
});
