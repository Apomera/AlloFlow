// Verification suite for Waves 31-34 of the main resource export & inbox pipeline:
// - Wave 31: ExportHandlers (summarizeResourceText answer/assessment gating, getSlidesPreviewHTML audience/toggles/simplified/flashcards/multi-type quiz/unverified memory-aid/note-taking)
// - Wave 32: H5P outline branches/points parity & _builderH5PCompatibility parity, PPTX memory-aid/summarizer gating, Google Forms aliases/pre-filter index/justification/scoping/newest-selection
// - Wave 33: NotebookLM .md (YAML quoting, simplified Cloze CJK/unit/JSON glossary/word bank, object glossary/flashcards/word-wall, multi-type quiz keys, unverified memory-aid, _hideLearnerWork, live-edit gating) & Builder/Audit .epub (live form control serialization, control stripping, remote CSS/link stripping, RTL metadata/spine/nav, SVG xmlns & remote-resources)
// - Wave 34: Submission Inbox (SVG finite point guard, raster draw dataUrl fallback, self-check ungraded badge & fallback counts, finite avg, single-<main> batch HTML, RTL locale, CSV fallback expectedCount, score-derived teacher anchor status) & 4-mirror SHA-256 parity

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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
let exportHandlers;
let driveDelivery;
let inboxMeta;

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
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wave31-34');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const addToast = vi.fn();
  const exporter = window.AlloModules.createExport({
    liveRef: {
      current: {
        history,
        generatedContent: generatedContent || history[0] || null,
        sourceTopic: 'Cellular Energy & Diffusion',
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
    generateUUID: (() => { let n = 0; return () => 'uuid-w31-' + (++n); })(),
  });
  return { exporter, recordedSlides, zipFiles, addToast };
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
  exportHandlers = window.AlloModules.ExportHandlers;
  driveDelivery = window.AlloModules.DriveDelivery;
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
}, 60000);

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.JSZip;
  delete window.PptxGenJS;
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 31 · ExportHandlers summarizeResourceText & getSlidesPreviewHTML
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 31 · ExportHandlers Summarizer & Slides Preview', () => {
  it('gates answer keys, math steps, FAQ answers in assessment mode, and learner work in summarizeResourceText', () => {
    const customQuiz = {
      type: 'custom-check',
      data: {
        prompt: 'Explain osmosis across a semipermeable membrane.',
        correctAnswer: 'SECRET_CORRECT_ANSWER',
        expectedFill: 'SECRET_EXPECTED_FILL',
        sampleAnswer: 'SECRET_SAMPLE_ANSWER',
        rubric: 'SECRET_RUBRIC',
        explanation: 'SECRET_EXPLANATION',
        teacherNotes: 'SECRET_TEACHER_NOTES',
        correctOrder: ['SECRET_ORD_1', 'SECRET_ORD_2'],
        wrongPair: 'SECRET_WRONG_PAIR',
        correctPartnerForWrong: 'SECRET_PARTNER',
        correctValue: 'SECRET_VAL',
        distractors: ['SECRET_DIST'],
      },
    };
    const safeLines = exportHandlers.summarizeResourceText(customQuiz, { maxChars: 2400, hideAnswers: true });
    const safeJoined = safeLines.join('\n');
    expect(safeJoined).toContain('Explain osmosis across a semipermeable membrane.');
    expect(safeJoined).not.toContain('SECRET_');

    const teacherJoined = exportHandlers.summarizeResourceText(customQuiz, { maxChars: 2400, hideAnswers: false }).join('\n');
    expect(teacherJoined).toContain('SECRET_CORRECT_ANSWER');

    const faqItem = {
      type: 'faq',
      data: { items: [{ question: 'What is turgor pressure?', answer: 'FAQ_STUDY_ANSWER' }] },
    };
    expect(exportHandlers.summarizeResourceText(faqItem, { hideAnswers: true, assessmentMode: false }).join('\n')).toContain('FAQ_STUDY_ANSWER');
    expect(exportHandlers.summarizeResourceText(faqItem, { hideAnswers: true, assessmentMode: true }).join('\n')).not.toContain('FAQ_STUDY_ANSWER');

    const mathItem = {
      type: 'math',
      data: { problems: [{ question: 'Solve 2x + 3 = 11', steps: ['Subtract 3 -> SECRET_STEP_WORK'], correctAnswer: '4' }] },
    };
    const mathStudent = exportHandlers.summarizeResourceText(mathItem, { studentSafe: true }).join('\n');
    expect(mathStudent).toContain('Solve 2x + 3 = 11');
    expect(mathStudent).not.toContain('SECRET_STEP_WORK');
    expect(mathStudent).not.toContain('4');

    const ntItem = {
      type: 'note-taking',
      data: {
        cues: ['Key question for membrane transport'],
        notes: 'STUDENT_SECRET_NOTES',
        summary: 'STUDENT_SECRET_SUMMARY',
        hypothesis: 'STUDENT_SECRET_HYPO',
        data: 'STUDENT_SECRET_DATA',
        analysis: 'STUDENT_SECRET_ANALYSIS',
        conclusion: 'STUDENT_SECRET_CONCLUSION',
        favoriteLine: 'STUDENT_SECRET_FAVLINE',
        thinkings: 'STUDENT_SECRET_THINKINGS',
        connection: 'STUDENT_SECRET_CONN',
        studentAnswer: 'STUDENT_SECRET_ANS',
        notesExtra: 'STUDENT_SECRET_EXTRA',
      },
    };
    const ntStudy = exportHandlers.summarizeResourceText(ntItem, { hideAnswers: true, assessmentMode: false }).join('\n');
    expect(ntStudy).toContain('STUDENT_SECRET_NOTES');
    const ntAssess = exportHandlers.summarizeResourceText(ntItem, { hideAnswers: true, assessmentMode: true }).join('\n');
    expect(ntAssess).toContain('Key question for membrane transport');
    expect(ntAssess).not.toContain('STUDENT_SECRET_');

    const acItem = {
      type: 'applied-challenge',
      data: {
        brief: { drivingQuestion: 'Design a safe desalination filter' },
        response: 'STUDENT_AC_RESPONSE',
        workspace: { studentDraft: 'Drafting', response: 'STUDENT_AC_WS_RESPONSE' },
      },
    };
    const acAssess = exportHandlers.summarizeResourceText(acItem, { hideAnswers: true, assessmentMode: true }).join('\n');
    expect(acAssess).toContain('Design a safe desalination filter');
    expect(acAssess).not.toContain('STUDENT_AC_RESPONSE');
    expect(acAssess).not.toContain('Drafting');
  });

  it('handles student audience filtering, toggle aliases, object simplified, flashcards grid, multi-type quiz, unverified memory-aid, and note-taking assessment gating in getSlidesPreviewHTML', () => {
    const history = [
      { id: 'udl1', type: 'udl-advice', title: 'UDL Advice', data: { summary: 'TEACHER_UDL_ADVICE' } },
      { id: 'gn1', type: 'guided-notes', title: 'Guided Skeleton', data: { cues: ['Diffusion cue'] } },
      {
        id: 'sim1',
        type: 'simplified',
        title: 'Adapted Passage',
        data: {
          clozeText: 'Water moves into root hairs.\n\n[[CHART:{"type":"bar","title":"Rate"}]]\n\n--- ENGLISH TRANSLATION ---\nDO_NOT_LEAK_TRANSLATION',
        },
      },
      {
        id: 'fc1',
        type: 'flashcards',
        title: 'Cell Cards',
        data: { cards: [{ front: 'Chloroplast', back: 'FC_BACK_SITE_OF_PHOTOSYNTHESIS' }] },
      },
      {
        id: 'qz1',
        type: 'quiz',
        title: 'Multi Quiz',
        data: {
          questions: [
            { type: 'answer-evidence', question: 'Claim?', answerOptions: ['Claim A', 'Claim B'], evidenceOptions: ['Line 1', 'Line 2'] },
            { type: 'matching', question: 'Match pairs', pairs: [{ left: 'ATP', right: 'Energy' }, { left: 'DNA', right: 'Blueprint' }, { left: 'RNA', right: 'Messenger' }] },
            { type: 'sequence-sense', question: 'Order steps', items: ['Step One', 'Step Two', 'Step Three'], presentedOrder: [2, 0, 1], correctOrder: ['Step One', 'Step Two', 'Step Three'] },
            { type: 'relation-mismatch', question: 'Fix mismatch', pairs: [{ left: 'Heart', right: 'Pump' }, { left: 'Lung', right: 'Filter' }], wrongPairIndex: 1, candidatePartners: ['Gas exchange', 'Digestion'] },
            { type: 'fill-blank', question: 'Fill it', wordBank: ['solute', 'solvent'] },
            { type: 'numeric-response', question: 'Speed?', unit: 'm/s' },
            { type: 'true-false', question: 'Cells have walls?' },
          ],
        },
      },
      {
        id: 'ma1',
        type: 'memory-aid',
        title: 'Unverified Aid',
        data: {
          cards: [
            {
              target: 'Mitochondria',
              factVerified: false,
              essentialFacts: ['UNVERIFIED_FACT_ALPHA'],
              mapping: 'UNVERIFIED_MAPPING_BETA',
              connections: [{ cue: 'Power', factIndex: 0, explanation: 'UNVERIFIED_CONN_EXPLANATION' }],
            },
          ],
        },
      },
      {
        id: 'nt1',
        type: 'note-taking',
        title: 'Cornell Notes',
        data: {
          cues: ['Why do cells divide?'],
          notes: ['STUDENT_NOTE_SECRET'],
          sections: [{ heading: 'Interphase', prompts: ['Describe DNA replication prompt'] }],
          summary: 'STUDENT_SUMMARY_SECRET',
        },
      },
    ];

    const studentHtml = exportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Cell Biology',
      gradeLevel: 'Grade 7',
      getExportableHistory: () => history,
      exportConfig: {
        audience: 'student',
        includeTeacherKey: true,
        includeUdl: false,
        includeNoteTaking: false,
      },
    });
    expect(studentHtml).not.toContain('TEACHER_UDL_ADVICE');
    expect(studentHtml).not.toContain('Diffusion cue');
    expect(studentHtml).toContain('Water moves into root hairs.');
    expect(studentHtml).not.toContain('[[CHART:');
    expect(studentHtml).not.toContain('DO_NOT_LEAK_TRANSLATION');
    expect(studentHtml).toContain('Chloroplast');
    expect(studentHtml).toContain('FC_BACK_SITE_OF_PHOTOSYNTHESIS');
    expect(studentHtml).toContain('Claim A');
    expect(studentHtml).toContain('Evidence');
    expect(studentHtml).toContain('Line 1');
    expect(studentHtml).toContain('Match choices:');
    expect(studentHtml).toContain('1. Step Three');
    expect(studentHtml).toContain('Candidate partners:');
    expect(studentHtml).toContain('Gas exchange | Digestion');
    expect(studentHtml).toContain('Word Bank:');
    expect(studentHtml).toContain('solute, solvent');
    expect(studentHtml).toContain('Numeric response (m/s)');
    expect(studentHtml).toContain('True');
    expect(studentHtml).toContain('False');
    expect(studentHtml).toContain('Your teacher is still checking these facts. Recall practice opens when they finish.');
    expect(studentHtml).not.toContain('UNVERIFIED_FACT_ALPHA');
    expect(studentHtml).not.toContain('UNVERIFIED_MAPPING_BETA');
    expect(studentHtml).not.toContain('UNVERIFIED_CONN_EXPLANATION');

    const assessHtml = exportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Cell Biology',
      getExportableHistory: () => history,
      exportConfig: { audience: 'student', assessmentMode: true },
    });
    expect(assessHtml).toContain('Chloroplast');
    expect(assessHtml).not.toContain('FC_BACK_SITE_OF_PHOTOSYNTHESIS');
    expect(assessHtml).toContain('Why do cells divide?');
    expect(assessHtml).toContain('Describe DNA replication prompt');
    expect(assessHtml).not.toContain('STUDENT_NOTE_SECRET');
    expect(assessHtml).not.toContain('STUDENT_SUMMARY_SECRET');

    const teacherHtml = exportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Cell Biology',
      getExportableHistory: () => history,
      exportConfig: { audience: 'teacher', includeTeacherKey: true, assessmentMode: false },
    });
    expect(teacherHtml).toContain('UNVERIFIED_FACT_ALPHA');
    expect(teacherHtml).toContain('1. Step One');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 32 · H5P Compatibility Parity, PPTX Gating & Google Forms Delivery
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 32 · H5P Parity, PPTX Memory-Aid Gating & Google Forms Delivery', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const h5pCompat = new Function(builderSlice + '\nreturn _builderH5PCompatibility;')();

  it('matches H5P outline branches/points and _builderH5PCompatibility across simplified and note-taking templates', async () => {
    const simpHistory = [
      { id: 'gl-s', type: 'glossary', data: [{ term: 'Photosynthesis', def: 'Light process' }, { term: 'chlorophyll', def: 'Green pigment' }] },
    ];
    const simpObj = h5pCompat({
      id: 'sim-c',
      type: 'simplified',
      data: {
        clozeText: '**Photosynthesis** uses [chlorophyll](https://example.com) to transform light energy into chemical energy inside plant cells.',
        glossary: [{ term: 'Photosynthesis', def: 'Light process' }, { term: 'chlorophyll', def: 'Green pigment' }],
      },
    }, simpHistory);
    expect(simpObj).toMatchObject({ ready: true, valid: 1 });

    const outlineItem = {
      id: 'nt-outline',
      type: 'note-taking',
      title: 'Branch Outline',
      data: {
        templateType: 'outline',
        branches: [
          { label: 'Reactants', points: ['Carbon dioxide', 'Water'] },
          { heading: 'Products', prompts: ['Glucose', 'Oxygen'] },
          { label: '' },
        ],
      },
    };
    const outlineCompat = h5pCompat(outlineItem, []);
    expect(outlineCompat).toMatchObject({ ready: true, total: 3, valid: 2, omitted: 1 });

    const h5pSetup = setupExporter({ generatedContent: outlineItem, history: [outlineItem] });
    expect(await h5pSetup.exporter.handleExportH5P({ generatedContent: outlineItem })).toBe(true);
    const contentJson = JSON.parse(h5pSetup.zipFiles.get('content/content.json') || '{}');
    expect(Array.isArray(contentJson.questions)).toBe(true);
    expect(contentJson.questions.length).toBe(outlineCompat.valid);
    expect(JSON.stringify(contentJson)).toContain('Carbon dioxide; Water');

    expect(h5pCompat({
      id: 'nt-qa',
      type: 'note-taking',
      data: { templateType: 'q-and-a', pairs: [{ question: 'Why ATP?' }, { question: '' }] },
    }, [])).toMatchObject({ ready: true, total: 2, valid: 1, omitted: 1 });

    expect(h5pCompat({
      id: 'nt-de',
      type: 'note-taking',
      data: { templateType: 'double-entry', entries: [{ quote: 'Cell wall supports plants' }, { quote: '' }] },
    }, [])).toMatchObject({ ready: true, total: 2, valid: 1, omitted: 1 });

    expect(h5pCompat({
      id: 'nt-lab',
      type: 'note-taking',
      data: { templateType: 'lab', question: 'Temp effect?', procedure: [{ text: 'Heat tube' }], analysis: 'Slope steepens' },
    }, [])).toMatchObject({ ready: true, valid: 5, omitted: 0 });

    expect(h5pCompat({
      id: 'nt-rr1',
      type: 'note-taking',
      data: { templateType: 'reading-response', prompts: [{ prompt: 'First reflection' }, { prompt: 'Second reflection' }] },
    }, [])).toMatchObject({ ready: true, valid: 2 });

    expect(h5pCompat({
      id: 'nt-rr2',
      type: 'note-taking',
      data: { templateType: 'reading-response', favoriteLine: 'Membranes are selective barriers' },
    }, [])).toMatchObject({ ready: true, valid: 4 });

    expect(h5pCompat({
      id: 'nt-cornell',
      type: 'note-taking',
      data: { templateType: 'cornell', cues: ['Main cue', ''], notes: ['', '   '], summary: 'Short summary' },
    }, [])).toMatchObject({ ready: true, total: 3, valid: 2, omitted: 1 });

    expect(h5pCompat({
      id: 'nt-cornell-notes',
      type: 'note-taking',
      data: { templateType: 'cornell-notes', cues: ['Only a cue'] },
    }, [])).toMatchObject({ ready: false });
  });

  it('gates unverified memory-aid facts/connections/mapping and _summarizeResource flags in PPTX exports', async () => {
    const history = [
      {
        id: 'ma-p',
        type: 'memory-aid',
        title: 'Cell Mnemonic',
        data: {
          cards: [
            {
              target: 'Golgi Apparatus',
              factVerified: false,
              essentialFacts: ['UNVERIFIED_GOLGI_FACT'],
              connections: [{ cue: 'Post office', factIndex: 0, explanation: 'UNVERIFIED_CONN_NOTE' }],
              mapping: 'UNVERIFIED_LEGACY_MAPPING',
            },
          ],
        },
      },
      {
        id: 'sum-p',
        type: 'custom-summary',
        title: 'Summary Check',
        data: { prompt: 'Prompt to keep', correctAnswer: 'SECRET_CUSTOM_ANSWER' },
      },
    ];

    const studentSetup = setupExporter({
      history,
      exportConfig: { audience: 'student', assessmentMode: false, includeTeacherKey: true },
    });
    await studentSetup.exporter.handleExportSlides({ audience: 'student', assessmentMode: false, includeTeacherKey: true });
    const stText = studentSetup.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    const stNotes = studentSetup.recordedSlides.map((s) => s.notes.join('\n')).join('\n');
    expect(stText).toContain('Golgi Apparatus');
    expect(stText).not.toContain('UNVERIFIED_GOLGI_FACT');
    expect(stText).not.toContain('UNVERIFIED_CONN_NOTE');
    expect(stText).not.toContain('UNVERIFIED_LEGACY_MAPPING');
    expect(stNotes).not.toContain('UNVERIFIED_GOLGI_FACT');
    expect(stText).toContain('Prompt to keep');
    expect(stText).not.toContain('SECRET_CUSTOM_ANSWER');

    const teacherSetup = setupExporter({
      history,
      exportConfig: { audience: 'teacher', assessmentMode: false, includeTeacherKey: true },
    });
    await teacherSetup.exporter.handleExportSlides({ audience: 'teacher', assessmentMode: false, includeTeacherKey: true });
    const tText = teacherSetup.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    const tNotes = teacherSetup.recordedSlides.map((s) => s.notes.join('\n')).join('\n');
    expect(tText).toContain('UNVERIFIED_GOLGI_FACT');
    expect(tNotes).toContain('UNVERIFIED_GOLGI_FACT');
    expect(tText).toContain('SECRET_CUSTOM_ANSWER');
  });

  it('normalizes Form question aliases, pre-filter rawIdx answers, justification follow-ups, scoping, collision-free keys, and newest selection', () => {
    const items = driveDelivery.quizToFormItems({
      questions: [
        { type: 'single-choice', question: 'Q1 single', options: ['', 'Alpha', 'Beta'], correctAnswer: 2, requiresJustification: true, explanationPrompt: 'Justify Q1' },
        { type: 'tf', question: 'Q2 tf', correctAnswer: false },
        { type: 'checkboxes', question: 'Q3 multi', options: [{ text: '' }, { label: 'Opt1' }, { value: 'Opt2' }], correctAnswers: ['B', 2] },
        { type: 'fill', question: 'Q4 fill', correctAnswer: 'osmosis' },
        { type: 'numeric', question: 'Q5 numeric', correctAnswer: 42 },
        { type: 'order', question: 'Q6 order', items: ['First', 'Second'] },
        {
          type: 'answer-evidence',
          question: 'Q7 ae',
          answerOptions: ['', 'Choice A', 'Choice B'],
          evidenceOptions: ['', 'Ev 1', 'Ev 2'],
          correctAnswer: 'C',
          correctEvidence: 2,
          justificationRequired: true,
        },
        {
          type: 'relation-mismatch',
          question: 'Q8 rm',
          pairs: [{ left: '', right: '' }, { left: 'L1', right: 'R1' }, { left: 'L2', right: 'WRONG' }],
          wrongPairIndex: 2,
          candidatePartners: ['', 'Fixed R2', 'Decoy'],
          correctPartnerIndex: 1,
        },
      ],
    });

    expect(items[0]).toMatchObject({ type: 'mc', options: ['Alpha', 'Beta'], answer: [1] });
    expect(items[1]).toMatchObject({ type: 'paragraph', prompt: 'Q1 single \u2014 Justify Q1', points: 0 });
    expect(items[2]).toMatchObject({ type: 'mc', options: ['True', 'False'], answer: [1] });
    expect(items[3]).toMatchObject({ type: 'checkbox', options: ['Opt1', 'Opt2'], answer: [0, 1] });
    expect(items[4]).toMatchObject({ type: 'short', answer: 'osmosis' });
    expect(items[5]).toMatchObject({ type: 'short', answer: '42' });
    expect(items[6]).toMatchObject({ type: 'mc', prompt: 'Q6 order (Step 1 of 2)', answer: [0] });
    expect(items[7]).toMatchObject({ type: 'mc', prompt: 'Q6 order (Step 2 of 2)', answer: [1] });
    expect(items[8]).toMatchObject({ type: 'mc', options: ['Choice A', 'Choice B'], answer: [1] });
    expect(items[9]).toMatchObject({ type: 'mc', options: ['Ev 1', 'Ev 2'], answer: [1] });
    expect(items[10]).toMatchObject({ type: 'paragraph', prompt: 'Q7 ae \u2014 Explain why your answer fits.', points: 0 });
    expect(items[11]).toMatchObject({ type: 'mc', options: ['L1 \u2194 R1', 'L2 \u2194 WRONG'], answer: [1] });
    expect(items[12]).toMatchObject({ type: 'mc', options: ['Fixed R2', 'Decoy'], answer: [0] });

    const quizHistory = [
      { type: 'quiz', title: 'First Unnamed', data: { questions: [{ type: 'mcq', question: 'Q1?', options: ['Y', 'N'], correctAnswer: 0 }] } },
      { type: 'quiz', title: 'Second Unnamed', data: { questions: [{ type: 'mcq', question: 'Q2?', options: ['Y', 'N'], correctAnswer: 0 }] } },
    ];
    expect(driveDelivery.formQuizzesFromHistory(quizHistory, { includeQuiz: false })).toEqual([]);
    const list = driveDelivery.formQuizzesFromHistory(quizHistory, {});
    expect(list.map((q) => q.key)).toEqual(['quiz-0', 'quiz-1']);
    expect(list[list.length - 1].title).toBe('Second Unnamed');

    const sortedByItemOrder = driveDelivery.formQuizzesFromHistory(
      [
        { id: 'qb', type: 'quiz', title: 'B', data: { questions: [{ type: 'mcq', question: 'B?', options: ['1', '2'] }] } },
        { id: 'qa', type: 'quiz', title: 'A', data: { questions: [{ type: 'mcq', question: 'A?', options: ['1', '2'] }] } },
      ],
      { resourceItemOrder: ['qa', 'qb'] }
    );
    expect(sortedByItemOrder.map((q) => q.key)).toEqual(['qa', 'qb']);
    expect(exportPreviewSrc).toContain('formQuizzes[formQuizzes.length - 1]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 33 · NotebookLM .md & Builder/Audit .epub Packages
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 33 · NotebookLM Markdown & Builder/Audit ePub Packaging', () => {
  const exportPreviewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  const previewCallbacks = extractButtonCallbacks(exportPreviewSrc);
  const builderSlice = exportPreviewSrc.slice(
    exportPreviewSrc.indexOf('function _kwlMarkdownLines'),
    exportPreviewSrc.indexOf('function ExportPreviewView')
  );
  const previewHelpers = new Function(
    builderSlice + '\nreturn { finalize: _builderFinalizeDocumentForExport, studentOnly: _shouldExportStudentOnlyHtml, rmTeacher: _removeStudentPackageTeacherSections, stripBreaks: _builderStripEditorBreakMetadata, cleanMdRoot: _builderCleanMarkdownRoot, mdFromRoot: _builderMarkdownFromRoot, kwlLines: _kwlMarkdownLines };'
  )();

  const pdfAuditSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const epubSlice = pdfAuditSrc.slice(
    pdfAuditSrc.indexOf('const _ALLO_INTERACTIVE_CHROME_SEL'),
    pdfAuditSrc.indexOf('// _buildDocxBlobFromSpec:')
  );
  const epubAuditHelpers = new Function(
    '_expXmlEsc',
    epubSlice + '\nreturn { xhtmlFromHtml: _altFmtXhtmlFromHtml, buildEpubPackageFiles: _buildEpubPackageFiles };'
  )(escapeXmlStub);

  it('produces compliant NotebookLM .md across YAML escaping, CJK/unit Cloze, object resources, quiz types, unverified memory-aid, learner work, and live-edit key gating', async () => {
    const nlmCb = previewCallbacks.find((c) => c.code.includes('-notebooklm'));
    expect(nlmCb).toBeTruthy();

    const runNlm = async ({ history = [], exportConfig = {}, doc = parseDoc('<!DOCTYPE html><html><body></body></html>'), builderViewFilter = 'all' }) => {
      const blobs = [];
      window.JSZip = undefined;
      window.alloCopyText = vi.fn(async () => false);
      const fn = new Function(
        'exportPreviewRef', 'exportConfig', 'builderViewFilter', 'altExportBusy', 'beginAlternativeExport', 'finishAlternativeExport',
        '_builderCleanMarkdownRoot', '_builderMarkdownFromRoot', '_kwlMarkdownLines',
        'window', 'Blob', 'downloadBuilderBlob', 'addToast', 'history', 't',
        'return (' + nlmCb.code + ');'
      )(
        { current: { contentDocument: doc } },
        exportConfig,
        builderViewFilter,
        null,
        () => true,
        () => {},
        previewHelpers.cleanMdRoot,
        previewHelpers.mdFromRoot,
        previewHelpers.kwlLines,
        window,
        class MockBlob { constructor(parts, opts) { this.parts = parts; this.type = opts?.type; } },
        (blob) => { blobs.push(blob); },
        vi.fn(),
        history,
        (k) => k
      );
      await fn();
      return String(blobs[0]?.parts?.[0] || '');
    };

    const history = [
      {
        id: 'simp1',
        type: 'simplified',
        unitId: 'u1',
        sourceFamilyId: 'fam1',
        title: 'Cloze Reading',
        clozeWorksheet: true,
        data: {
          clozeText: '光合作用 makes sugar. osmosis balances water and osmosis again.',
          glossary: JSON.stringify([{ term: '光合作用' }]),
        },
      },
      { id: 'gl-u1', type: 'glossary', unitId: 'u1', sourceFamilyId: 'fam1', title: 'Unit 1 Terms', data: { terms: [{ term: 'osmosis', def: 'Diffusion of water' }] } },
      { id: 'gl-u2', type: 'glossary', unitId: 'u2', sourceFamilyId: 'fam2', title: 'Unit 2 Terms', data: { terms: [{ term: 'sugar', def: 'OTHER_UNIT_SUGAR_SHOULD_NOT_CLOZE_U1' }] } },
      { id: 'fc1', type: 'flashcards', title: 'Deck', data: { cards: [{ front: 'Stoma', back: 'FC_BACK_SECRET' }] } },
      { id: 'ww1', type: 'word-wall', title: 'Wall', data: { terms: [{ word: 'Xylem', definition: 'Transports water' }] } },
      {
        id: 'qz-n',
        type: 'quiz',
        title: 'Assessment Check',
        data: {
          questions: [
            { type: 'single-choice', question: 'Q1 sc', options: [{ text: '' }, { text: 'Alpha' }, { text: 'Beta' }], correctAnswer: 2 },
            { type: 'answer-evidence', question: 'Q2 ae', answerOptions: ['', 'Option Alpha', 'Option Beta'], evidenceOptions: ['', 'Line 1', 'Line 2 quote'], correctAnswer: 'C', correctEvidence: 2 },
            { type: 'sequence-sense', question: 'Q3 ss', items: ['Step 1', 'Step 2'], presentedOrder: [1, 0], correctOrder: ['Step 1', 'Step 2'] },
            { type: 'relation-mismatch', question: 'Q4 rm', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: 'WRONG' }], wrongPairIndex: 1, candidatePartners: ['', '2', '3'], correctPartnerIndex: 1 },
          ],
        },
      },
      {
        id: 'ma-n',
        type: 'memory-aid',
        title: 'Memory Aid',
        data: {
          cards: [
            {
              target: 'Vacuole',
              factVerified: false,
              essentialFacts: ['UNVERIFIED_VACUOLE_FACT'],
              mapping: 'UNVERIFIED_VACUOLE_MAP',
              connections: [{ cue: 'Tank', factIndex: 0, explanation: 'UNVERIFIED_VACUOLE_CONN' }],
            },
          ],
        },
      },
      {
        id: 'nt-rr',
        type: 'note-taking',
        title: 'Response Log',
        data: {
          templateType: 'reading-response',
          prompts: ['Analyze author claim'],
        },
      },
      {
        id: 'nt-cornell',
        type: 'note-taking',
        title: 'Cornell Notes',
        data: {
          cues: ['Cue A'],
          notes: ['STUDENT_CORNELL_NOTE'],
          summary: 'STUDENT_CORNELL_SUM',
        },
      },
      {
        id: 'ac-n',
        type: 'applied-challenge',
        title: 'Design Brief',
        data: {
          brief: { drivingQuestion: 'Keep seedlings hydrated' },
          phases: [{ id: 'plan', title: 'Plan Phase', response: 'STUDENT_APPLIED_DRAFT' }],
          workspace: { explore: 'STUDENT_WORKSPACE_DRAFT' },
        },
      },
    ];

    const studentAssessMd = await runNlm({
      history,
      exportConfig: {
        title: 'Unit 1: "Cellular" #Intro\nSecond Line',
        assessmentMode: true,
        includeTeacherKey: true,
        clozeWorksheet: true,
      },
    });
    expect(studentAssessMd).toContain('title: "Unit 1: \\"Cellular\\" #Intro Second Line"');
    // CJK term + unit-scoped glossary term blanked, unit 2 term excluded from u1 cloze, 1 blank per term, shuffled Word Bank present
    expect(studentAssessMd).not.toContain('光合作用 makes');
    expect((studentAssessMd.match(/_{4,}/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(studentAssessMd).toContain('balances water and osmosis again');
    expect(studentAssessMd).toContain(' makes sugar.');
    expect(studentAssessMd).toContain('sugar');
    expect(studentAssessMd).toContain('**Word Bank:**');
    // Flashcards hide back in assessmentMode; Word Wall renders
    expect(studentAssessMd).toContain('Stoma');
    expect(studentAssessMd).not.toContain('FC_BACK_SECRET');
    expect(studentAssessMd).toContain('Xylem');
    expect(studentAssessMd).toContain('Transports water');
    // Sequence-sense respects presentedOrder when !_showKey; relation-mismatch prints Repair choices
    expect(studentAssessMd).toContain('1. Step 2');
    expect(studentAssessMd).toContain('Repair choices:');
    // Unverified memory-aid facts & learner responses hidden in assessment mode
    expect(studentAssessMd).not.toContain('UNVERIFIED_VACUOLE_');
    expect(studentAssessMd).toContain('Analyze author claim');
    expect(studentAssessMd).not.toContain('STUDENT_CORNELL_');
    expect(studentAssessMd).toContain('Keep seedlings hydrated');
    expect(studentAssessMd).not.toContain('STUDENT_APPLIED_DRAFT');

    const teacherMd = await runNlm({
      history,
      exportConfig: { audience: 'teacher', includeTeacherKey: true, assessmentMode: false },
    });
    expect(teacherMd).toContain('Option Beta | Evidence: Line 2 quote');
    expect(teacherMd).toContain('UNVERIFIED_VACUOLE_FACT');
    expect(teacherMd).toContain('STUDENT_CORNELL_NOTE');
    expect(teacherMd).toContain('STUDENT_APPLIED_DRAFT');

    const liveEditDoc = parseDoc('<!DOCTYPE html><html><body data-allo-user-edited="1"><main><p>Live Student Text</p><div class="teacher-view">LIVE_TEACHER_SECRET</div></main></body></html>');
    const liveStudentMd = await runNlm({
      history,
      exportConfig: { includeTeacherKey: false },
      doc: liveEditDoc,
    });
    expect(liveStudentMd).toContain('Live Student Text');
    expect(liveStudentMd).not.toContain('LIVE_TEACHER_SECRET');
  });

  it('captures live control values, strips interactive controls/remote stylesheets, and propagates RTL in Builder and Audit ePub packages', async () => {
    const epubCb = previewCallbacks.find((c) => c.code.includes("application/epub+zip"));
    expect(epubCb).toBeTruthy();

    const doc = parseDoc(`<!DOCTYPE html><html lang="ar"><head>
      <title>Arabic Lesson</title>
      <link rel="stylesheet" href="https://cdn.example.com/theme.css"/>
      <style>@import url("https://cdn.example.com/font.css"); @font-face { src: url("https://cdn.example.com/a.woff2"); } body { background: url(https://cdn.example.com/bg.png); }</style>
    </head><body>
      <main>
        <h1>الدرس الأول</h1>
        <input type="text"/>
        <textarea></textarea>
        <select><option value="1">Option 1</option><option value="2">Selected Choice</option></select>
        <button type="button">Toolbar Action</button>
      </main>
    </body></html>`);
    doc.querySelector('input').value = 'Live Input Value';
    doc.querySelector('textarea').value = 'Live Textarea Response';
    doc.querySelector('select').selectedIndex = 1;

    const writtenFiles = new Map();
    window.JSZip = class MockZip {
      file(name, content) { writtenFiles.set(name, content); return this; }
      async generateAsync() { return new Blob(['epub-zip'], { type: 'application/epub+zip' }); }
    };
    const downloaded = [];
    const fn = new Function(
      'runBuilderPreflight', 'exportPreviewRef', 'exportConfig', 'builderViewFilter', 'altExportBusy', 'beginAlternativeExport', 'finishAlternativeExport',
      '_builderFinalizeDocumentForExport', '_shouldExportStudentOnlyHtml', '_removeStudentPackageTeacherSections', '_builderStripEditorBreakMetadata',
      '_builderFetchExportImage', 'downloadBuilderBlob', 'addToast', 'window', 'XMLSerializer', 'URL', 'Blob',
      'return (' + epubCb.code + ');'
    )(
      () => ({ errors: 0 }),
      { current: { contentDocument: doc } },
      { title: 'Arabic Guide', audience: 'student', includeTeacherKey: false },
      'student',
      null,
      () => true,
      () => {},
      previewHelpers.finalize,
      previewHelpers.studentOnly,
      previewHelpers.rmTeacher,
      previewHelpers.stripBreaks,
      async () => { throw new Error('no network'); },
      (blob) => downloaded.push(blob),
      vi.fn(),
      window,
      XMLSerializer,
      URL,
      Blob
    );
    await fn();

    expect(downloaded.length).toBe(1);
    const contentXhtml = writtenFiles.get('OEBPS/content.xhtml') || '';
    const opf = writtenFiles.get('OEBPS/content.opf') || '';
    const nav = writtenFiles.get('OEBPS/nav.xhtml') || '';

    expect(contentXhtml).toContain('Live Input Value');
    expect(contentXhtml).toContain('Live Textarea Response');
    expect(contentXhtml).toContain('Selected Choice');
    expect(contentXhtml).toContain('class="alloflow-response-value"');
    expect(contentXhtml).not.toMatch(/<(?:button|select|input|textarea)\b/i);
    expect(contentXhtml).not.toContain('cdn.example.com');
    expect(contentXhtml).not.toContain('@import');
    expect(contentXhtml).toMatch(/<html\b[^>]*\bdir="rtl"/i);
    expect(opf).toContain('dir="rtl"');
    expect(opf).toContain('page-progression-direction="rtl"');
    expect(nav).toContain('dir="rtl"');

    // Audit isolated _altFmtXhtmlFromHtml & _buildEpubPackageFiles
    const auditHtml = `<!DOCTYPE html><html lang="ar"><head>
      <title>Audit Book</title>
      <link rel="stylesheet" href="https://fonts.example.com/a.css"/>
      <style>@import url('https://fonts.example.com/b.css'); @font-face { src: url("https://fonts.example.com/f.woff2"); } h1 { background: url(//cdn.example.com/img.png); }</style>
    </head><body>
      <main>
        <h1>Heading One</h1>
        <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>
        <audio src="https://media.example.com/clip.mp3"></audio>
        <button type="button">Unused Button</button>
      </main>
    </body></html>`;
    const cleanXhtml = epubAuditHelpers.xhtmlFromHtml(auditHtml);
    expect(cleanXhtml).not.toMatch(/<(?:button|select|input|textarea)\b/i);
    expect(cleanXhtml).not.toContain('fonts.example.com');
    expect(cleanXhtml).not.toContain('cdn.example.com');
    expect(cleanXhtml).not.toContain('@import');
    expect(cleanXhtml).not.toContain('@font-face');
    expect(cleanXhtml).toContain('xmlns="http://www.w3.org/2000/svg"');

    const pkg = epubAuditHelpers.buildEpubPackageFiles(auditHtml, { title: 'Audit Book', lang: 'ar' });
    expect(pkg.validation.valid).toBe(true);
    expect(pkg.files['OEBPS/content.opf']).toContain('remote-resources');
    expect(pkg.files['OEBPS/content.opf']).toContain('svg');
    expect(pkg.files['OEBPS/content.opf']).toContain('dir="rtl"');
    expect(pkg.files['OEBPS/content.opf']).toContain('page-progression-direction="rtl"');
    expect(pkg.files['OEBPS/content.xhtml']).toMatch(/<html\b[^>]*\bdir="rtl"/i);
    expect(pkg.files['OEBPS/nav.xhtml']).toContain('dir="rtl"');
    expect(pkg.files['OEBPS/nav.xhtml']).toContain('<title lang="en">Navigation</title>');
    expect(pkg.files['OEBPS/nav.xhtml']).toContain('<h1 lang="en">Table of Contents</h1>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 34 · Submission Inbox Hardening & 4-Mirror SHA-256 Parity
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 34 · Submission Inbox Feedback/Grading/CSV & Mirror Parity', () => {
  it('handles non-finite drawing points, raster draw dataUrl fallback, self-check exclusion, finite fallback scores, single <main> batch HTML, and RTL locale', () => {
    const row = {
      nickname: 'Layla',
      docTitle: 'Arabic Science Sheet',
      language: 'Arabic',
      payload: {
        language: 'Arabic',
        responseManifest: {
          schemaVersion: 1,
          entries: [
            { key: 'q1:mcq:0', question: 'Q1', responseType: 'mcq', questionType: 'mcq' },
            { key: 'ac1:applied:selfcheck-confidence:rating', question: 'How confident are you?', responseType: 'self-check', questionType: 'self-check' },
          ],
        },
        responses: {
          'q1:mcq:0': 'Option A',
          'ac1:applied:selfcheck-confidence:rating': '4',
        },
        annotations: [
          { id: 'd1', type: 'draw', points: [{ x: NaN, y: Infinity }, { x: 10, y: 20 }] },
          { id: 'd2', type: 'draw', points: [], dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
          { id: 'd3', type: 'draw', points: [], dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' },
        ],
      },
    };
    const rowGrades = {
      'q1:mcq:0': { score: 90, status: 'correct', feedback: 'Great!' },
    };

    const singleHtml = inboxMeta.buildStudentFeedbackHtml(row, rowGrades);
    expect(singleHtml).toMatch(/<html\b[^>]*lang="ar"[^>]*dir="rtl"/i);
    expect(singleHtml).toContain('Self-check (ungraded)');
    expect(singleHtml).toContain('Scored:</strong> 1 / 1');
    expect(singleHtml).toContain('Average:</strong> 90/100');
    expect(singleHtml).not.toContain('NaN');
    expect(singleHtml).toContain('<img src="data:image/png;base64,iVBORw0KGgo=" alt="Student drawing"');
    expect(singleHtml).not.toContain('data:text/html');

    const withNullScore = inboxMeta.buildStudentFeedbackHtml(row, {
      'q1:mcq:0': { score: 90, status: 'correct' },
      'q2:extra:0': { score: null, status: 'needs-review' },
    });
    expect(withNullScore).toContain('Average:</strong> 90/100');

    const batchHtml = inboxMeta.buildBatchFeedbackHtml(
      [
        { row, rowGrades },
        {
          row: {
            nickname: 'Sam',
            docTitle: 'English Sheet',
            payload: { language: 'English', responses: { 'q1:mcq:0': 'B' } },
          },
          rowGrades: { 'q1:mcq:0': { score: 75, status: 'partially-correct' } },
        },
      ],
      'Class Batch'
    );
    const batchDoc = parseDoc(batchHtml);
    expect(batchDoc.querySelectorAll('main').length).toBeLessThanOrEqual(1);
    const sheets = batchDoc.querySelectorAll('section.student-feedback-sheet');
    expect(sheets.length).toBe(2);
    expect(sheets[0].getAttribute('dir')).toBe('rtl');
    expect(sheets[0].getAttribute('lang')).toBe('ar');
  });

  it('excludes ungraded self-check keys from generic CSV fallback ExpectedCount and derives teacher anchor status from score', async () => {
    const csvRes = inboxMeta.buildLmsGradebookCsv([
      {
        nickname: 'Alex',
        className: 'Bio 7',
        docTitle: 'Lab 1',
        responses: {
          'q1:short:0': 'Osmosis',
          'ac1:applied:selfcheck-confidence:rating': 'Confident',
        },
        grades: {
          'q1:short:0': { score: 88, status: 'correct' },
        },
      },
    ], 'generic');
    const lines = csvRes.csv.trim().split('\n');
    const headers = lines[0].split(',');
    const vals = lines[1].split(',');
    expect(vals[headers.indexOf('ScoredCount')]).toBe('1');
    expect(vals[headers.indexOf('ExpectedCount')]).toBe('1');

    // Verify gradeRow teacher-anchor status thresholds (>= 85 correct, >= 40 partially-correct, < 40 incorrect)
    const inboxSrc = readFileSync(resolve(ROOT, 'view_submission_inbox_source.jsx'), 'utf8');
    const gradeRowCode = inboxSrc.slice(
      inboxSrc.indexOf('const gradeRow = async'),
      inboxSrc.indexOf('// Phase 3 v2.1: bulk-grade')
    );
    let capturedGrades = {};
    const queue = [
      {
        nickname: 'Taylor',
        docTitle: 'Response Check',
        status: 'decrypted',
        payload: {
          responses: {
            'allo-ta:high': 'Ans 1',
            'allo-ta:mid': 'Ans 2',
            'allo-ta:low': 'Ans 3',
          },
        },
      },
    ];
    const anchors = [
      { fromSubmissionIdx: 0, fromResponseKey: 'allo-ta:high', studentResponse: 'Ans 1', teacherScore: 90, teacherFeedback: 'Strong' },
      { fromSubmissionIdx: 0, fromResponseKey: 'allo-ta:mid', studentResponse: 'Ans 2', teacherScore: 60, teacherFeedback: 'Partial' },
      { fromSubmissionIdx: 0, fromResponseKey: 'allo-ta:low', studentResponse: 'Ans 3', teacherScore: 25, teacherFeedback: 'Incomplete' },
    ];
    window.AlloModules.QuizAIHelpers = { gradeFreeformAnswerWithCalibration: vi.fn(async () => ({ score: 50, status: 'partially-correct', feedback: 'ok' })) };
    window.callGemini = vi.fn(async () => '{}');

    const compileGradeRow = new Function(
      'queue', 'rubrics', 'rowRubrics', 'globalRubric', 'anchors', 'history', 'addToast', 'tr',
      'siResponseEntryModels', 'siLookupTrustedHistoryPrompt', 'siCalibrationSamplesForKey',
      'setReviewedRows', 'setGrades', 'setGradingRow', 'window',
      'return (' + gradeRowCode.trim().replace(/^const gradeRow = /, '').replace(/;\s*$/, '') + ');'
    );
    const gradeRow = compileGradeRow(
      queue,
      {},
      {},
      { rubric: 'Accuracy rubric', context: 'Cells' },
      anchors,
      [],
      vi.fn(),
      (s) => s,
      inboxMeta.responseEntryModels,
      inboxMeta.lookupTrustedHistoryPrompt,
      inboxMeta.calibrationSamplesForKey,
      vi.fn(),
      (updater) => { capturedGrades = typeof updater === 'function' ? updater(capturedGrades) : updater; },
      vi.fn(),
      window
    );

    const gradeRes = await gradeRow(0, { silent: true });
    expect(gradeRes.skipped).toBe(true);
    expect(capturedGrades[0]['allo-ta:high'].status).toBe('correct');
    expect(capturedGrades[0]['allo-ta:mid'].status).toBe('partially-correct');
    expect(capturedGrades[0]['allo-ta:low'].status).toBe('incorrect');
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
