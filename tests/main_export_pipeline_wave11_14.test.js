import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
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

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  loadAlloModule('module_scope_extras_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_submission_inbox_module.js');

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
// Wave 11 · Response Attributes, Expanded Auto-Grader, Trusted Prompts & LMS CSV
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 11 · Glossary Worksheet v3 Attributes, Expanded Auto-Grading & LMS CSV Presets', () => {
  const glossaryItem = {
    id: 'g11',
    type: 'glossary',
    title: 'Cell Vocabulary',
    data: [
      { term: 'Chloroplast', def: 'Organelle that captures light energy.', partOfSpeech: 'noun' },
      { term: 'Mitochondria', def: 'Organelle that converts glucose into ATP.', partOfSpeech: 'noun' },
      { term: 'Cytoplasm', def: 'Gel-like fluid filling the cell.', partOfSpeech: 'noun' },
    ],
  };

  it('adds v3 response attributes on interactive glossary worksheets without leaking definitions', () => {
    const matchingHtml = pipeline.generateFullPackHTML([glossaryItem], 'Cells', false, {}, {
      includeGlossary: true,
      includeTeacherKey: false,
      glossaryDisplayMode: 'worksheet',
      glossaryWorksheetVariant: 'matching',
      annotations: [],
    });
    const matchDoc = parseDoc(matchingHtml);
    const matchInputs = Array.from(matchDoc.querySelectorAll('[data-glossary-worksheet="matching"] input.alloflow-response-input'));
    expect(matchInputs).toHaveLength(3);
    expect(matchInputs.every((el) => el.getAttribute('data-allo-response-type') === 'match')).toBe(true);
    expect(matchInputs.every((el) => el.getAttribute('data-allo-question'))).toBe(true);
    expect(matchInputs.every((el) => el.getAttribute('data-allo-part-label'))).toBe(true);
    expect(matchInputs.every((el) => el.id && matchDoc.querySelector(`label[for="${el.id}"]`))).toBe(true);

    const linesHtml = pipeline.generateFullPackHTML([glossaryItem], 'Cells', false, {}, {
      includeGlossary: true,
      includeTeacherKey: false,
      glossaryDisplayMode: 'worksheet',
      glossaryWorksheetVariant: 'lines',
      annotations: [],
    });
    const linesDoc = parseDoc(linesHtml);
    const linesTas = Array.from(linesDoc.querySelectorAll('[data-glossary-worksheet="lines"] textarea.alloflow-response-input'));
    expect(linesTas).toHaveLength(3);
    expect(linesTas.every((el) => (el.getAttribute('data-allo-response-key') || '').endsWith(':free-response'))).toBe(true);
    expect(linesTas.every((el) => el.getAttribute('data-allo-response-type') === 'free-response')).toBe(true);
    expect(linesTas.every((el) => el.getAttribute('data-allo-question') && el.getAttribute('data-allo-part-label'))).toBe(true);
    expect(linesHtml).not.toContain('Organelle that captures light energy.');
  });

  it('auto-grades Cloze, outline-based Venn, glossary worksheet matching, and timeline strip dates', () => {
    const meta = window.AlloModules.SubmissionInbox._meta;
    const simpItem = {
      id: 's11',
      type: 'simplified',
      title: 'Plant Energy',
      data: 'Chloroplast captures light energy. Mitochondria make ATP.',
    };
    const vennOutlineItem = {
      id: 'vo11',
      type: 'outline',
      title: 'Cell Comparison',
      data: {
        structureType: 'Venn Diagram',
        main: 'Plant vs Animal Cells',
        branches: [
          { title: 'Plant Cells', items: ['Cell Wall'] },
          { title: 'Animal Cells', items: ['Lysosomes'] },
          { title: 'Both', items: ['Nucleus'] },
        ],
      },
    };
    const tlItem = {
      id: 'tl11',
      type: 'timeline',
      title: 'Space Milestones',
      data: [
        { date: '1957', event: 'Sputnik launches' },
        { date: '1969', event: 'Apollo 11 moon landing' },
      ],
    };
    const wsHtml = pipeline.generateFullPackHTML([glossaryItem], 'Cells', false, {}, {
      includeGlossary: true,
      includeTeacherKey: false,
      glossaryDisplayMode: 'worksheet',
      glossaryWorksheetVariant: 'matching',
      annotations: [],
    });
    const wsDoc = parseDoc(wsHtml);
    const defListItems = Array.from(wsDoc.querySelectorAll('[data-glossary-worksheet-definitions] > li'));
    const letterForDef = (dText) => {
      const hit = defListItems.find((li) => (li.querySelector('[data-glossary-definition]')?.textContent || '').trim() === dText);
      return (hit?.querySelector('strong')?.textContent || '').replace('.', '').trim();
    };
    const firstMatchInput = wsDoc.querySelector('[data-glossary-worksheet="matching"] input[data-allo-response-key]');
    const secondMatchInput = wsDoc.querySelectorAll('[data-glossary-worksheet="matching"] input[data-allo-response-key]')[1];
    expect(firstMatchInput).toBeTruthy();

    const wrongLetter = letterForDef(glossaryItem.data[0].def) === 'A' ? 'B' : 'A';
    const history = [simpItem, glossaryItem, vennOutlineItem, tlItem];
    const grades = meta.exportedQuizAutoGrades({
      responses: {
        'allo-response:s11:cloze:0:cloze-blank': 'chloroplast',
        'allo-response:s11:cloze:1:cloze-blank': 'wrongword',
        'allo-response:vo11:venn:0:placement': 'setA',
        'allo-response:vo11:venn:2:placement': 'shared',
        'allo-response:tl11:timeline:0:date': '1957',
        'allo-response:tl11:timeline:1:date': '1999',
        [firstMatchInput.getAttribute('data-allo-response-key')]: letterForDef(glossaryItem.data[0].def).toLowerCase(),
        [secondMatchInput.getAttribute('data-allo-response-key')]: wrongLetter,
      },
    }, history);

    expect(grades['allo-response:s11:cloze:0:cloze-blank']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:s11:cloze:1:cloze-blank']).toMatchObject({ score: 0, status: 'incorrect' });
    expect(grades['allo-response:vo11:venn:0:placement']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:vo11:venn:2:placement']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:tl11:timeline:0:date']).toMatchObject({ score: 100, status: 'correct' });
    expect(grades['allo-response:tl11:timeline:1:date']).toMatchObject({ score: 0, status: 'incorrect' });
    expect(grades[firstMatchInput.getAttribute('data-allo-response-key')]).toMatchObject({ score: 100, status: 'correct' });
    expect(grades[secondMatchInput.getAttribute('data-allo-response-key')]).toMatchObject({ score: 0, status: 'incorrect' });
  });

  it('resolves trusted history prompts for glossary definitions, timeline strip dates, and note-taking keys', () => {
    const meta = window.AlloModules.SubmissionInbox._meta;
    const history = [
      glossaryItem,
      { id: 'tlp', type: 'timeline', title: 'Events', data: [{ date: '1776', event: 'Declaration signed' }] },
      { id: 'ntp', type: 'note-taking', title: 'Cell Notes', data: { templateType: 'cornell-notes', cues: [{ text: 'What makes ATP?' }], notes: [{ text: '' }], summary: '' } },
    ];
    expect(meta.lookupTrustedHistoryPrompt('glossary-worksheet:sec-g11:def:1:free-response', history)).toContain('Mitochondria');
    expect(meta.lookupTrustedHistoryPrompt('tlp:timeline:0:date', history)).toContain('Declaration signed');
    expect(meta.lookupTrustedHistoryPrompt('ntp:note:notes:0', history)).toContain('What makes ATP?');
    expect(meta.lookupTrustedHistoryPrompt('ntp:note:summary', history).toLowerCase()).toContain('summary');
  });

  it('builds LMS CSV presets with formula-injection guarding and renders preset selector in Gradebook UI', async () => {
    const meta = window.AlloModules.SubmissionInbox._meta;
    const entries = [
      {
        nickname: '=HYPERLINK("http://evil","Click")',
        className: '+Bio101',
        docTitle: '@UnitQuiz',
        submittedAt: '2026-11-10T10:00:00Z',
        gradedAt: '2026-11-10T12:00:00Z',
        grades: { q1: { score: 92, status: 'correct' }, q2: { score: 88, status: 'correct' } },
        review: { state: 'reviewed', expectedResponseCount: 2 },
      },
      {
        nickname: 'Ada Lovelace',
        className: 'Bio101',
        docTitle: '@UnitQuiz',
        submittedAt: '2026-11-10T10:05:00Z',
        gradedAt: '2026-11-10T12:05:00Z',
        grades: { q1: { score: 100, status: 'correct' } },
        review: { state: 'reviewed', expectedResponseCount: 2 },
      },
    ];

    const canvasCsv = meta.buildLmsGradebookCsv(entries, 'canvas');
    expect(canvasCsv.headers).toEqual(['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section', '@UnitQuiz (100)']);
    expect(canvasCsv.csv).toContain("'=HYPERLINK");
    expect(canvasCsv.csv).toContain("'+Bio101");
    expect(canvasCsv.csv).toContain(',90');

    const gcCsv = meta.buildLmsGradebookCsv(entries, 'google-classroom');
    expect(gcCsv.headers).toEqual(['Student Name', 'Class', 'Assignment', 'Grade', 'Max Points', 'Submitted At', 'Graded At', 'Review State']);
    expect(gcCsv.csv).toContain("'@UnitQuiz");

    const schCsv = meta.buildLmsGradebookCsv(entries, 'schoology');
    expect(schCsv.headers).toEqual(['First Name', 'Last Name', 'Unique User ID', 'Section', 'Assignment', 'Score', 'Max Points', 'Review State']);
    expect(schCsv.csv).toContain('Ada,Lovelace,Ada Lovelace');

    const alloCsv = meta.buildLmsGradebookCsv(entries, 'alloflow');
    expect(alloCsv.headers.slice(0, 9)).toEqual(['Nickname', 'Class', 'Document', 'SubmittedAt', 'GradedAt', 'AverageScore', 'ScoredCount', 'ExpectedCount', 'ReviewState']);
    expect(alloCsv.headers).toContain('Item: q1');

    // UI smoke check: Gradebook renders <select data-lms-csv-preset>
    localStorage.setItem('alloflow_offline_grades', JSON.stringify({ sub1: entries[1] }));
    const { SubmissionInbox } = window.AlloModules.SubmissionInbox;
    const host = mountComponent(SubmissionInbox, {
      isOpen: true,
      onClose: vi.fn(),
      rosterKey: 'test-roster',
      t: (_k, f) => (typeof f === 'string' ? f : _k),
      addToast: vi.fn(),
      history: [],
    });
    const gradebookBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Gradebook'));
    expect(gradebookBtn).toBeTruthy();
    await act(async () => { gradebookBtn.click(); });
    const presetSelect = host.querySelector('select[data-lms-csv-preset]');
    expect(presetSelect).not.toBeNull();
    expect(Array.from(presetSelect.querySelectorAll('option')).map((o) => o.value)).toEqual(['alloflow', 'canvas', 'google-classroom', 'schoology']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 12 · Interactive HTML Runtime: Print Mirroring, Used Chips & Cornell Fold
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 12 · Interactive HTML Runtime (Print Completeness, Chip State & Cornell Fold)', () => {
  it('mirrors numeric inputs and hidden Concept Sort/Venn selects on beforeprint and cleans up on afterprint', () => {
    const items = [
      { id: 'm12', type: 'math', title: 'Numeric Drill', data: { problems: [{ question: 'Find 6 * 7', type: 'numeric', answer: '42' }] } },
      { id: 'cs12', type: 'concept-sort', title: 'States', data: { categories: [{ id: 'solid', label: 'Solid' }, { id: 'gas', label: 'Gas' }], items: [{ id: 'i1', content: 'Ice', categoryId: 'solid' }] } },
      { id: 'v12', type: 'outline', title: 'Cells Venn', data: { structureType: 'Venn Diagram', main: 'Compare', branches: [{ title: 'Plant', items: ['Cell Wall'] }, { title: 'Animal', items: ['Centriole'] }, { title: 'Both', items: ['Nucleus'] }] } },
      { id: 'cn12', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell-notes', cues: [{ text: 'What is ATP?' }], notes: [{ text: 'Energy currency of the cell.' }], summary: 'ATP stores energy.' } },
    ];
    const html = pipeline.generateFullPackHTML(items, 'Science Pack', false, {}, {
      includeMath: true,
      includeConceptSort: true,
      includeOutline: true,
      vennExportMode: 'activity',
      includeNoteTaking: true,
      includeTeacherKey: false,
      annotations: [],
    });
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.edu/pack.html' });
    activeDoms.push(dom);
    const doc = dom.window.document;

    // Add a synthetic number response input if math rendered text, or set value on numeric input
    const numInp = doc.querySelector('input.alloflow-response-input[type="number"]') || (() => {
      const inp = doc.createElement('input');
      inp.type = 'number';
      inp.className = 'alloflow-response-input';
      doc.body.appendChild(inp);
      return inp;
    })();
    numInp.value = '42';

    const csSelect = doc.querySelector('.alloflow-cs-strip select.alloflow-cs-response');
    expect(csSelect).not.toBeNull();
    csSelect.hidden = true;
    const csOpt = Array.from(csSelect.options).find((o) => o.value);
    csSelect.value = csOpt.value;

    const vennSelect = doc.querySelector('.alloflow-venn-card select.alloflow-venn-response');
    expect(vennSelect).not.toBeNull();
    vennSelect.hidden = true;
    const vennOpt = Array.from(vennSelect.options).find((o) => o.value);
    vennSelect.value = vennOpt.value;

    const foldBtn = doc.querySelector('.alloflow-cornell-fold-btn');
    const cornellTable = doc.querySelector('.alloflow-cornell-table');
    expect(foldBtn).not.toBeNull();
    expect(cornellTable).not.toBeNull();
    foldBtn.click();
    expect(cornellTable.classList.contains('alloflow-cornell-folded')).toBe(true);

    dom.window.dispatchEvent(new dom.window.Event('beforeprint'));
    expect(numInp.classList.contains('alloflow-print-mirrored')).toBe(true);
    expect(numInp.nextElementSibling?.classList.contains('alloflow-print-answer')).toBe(true);
    expect(numInp.nextElementSibling?.textContent).toBe('42');
    expect(csSelect.nextElementSibling?.classList.contains('alloflow-print-answer')).toBe(true);
    expect(csSelect.nextElementSibling?.textContent).toContain(csOpt.textContent.trim());
    expect(vennSelect.nextElementSibling?.classList.contains('alloflow-print-answer')).toBe(true);
    expect(cornellTable.classList.contains('alloflow-cornell-folded')).toBe(false);
    expect(cornellTable.getAttribute('data-alloflow-print-unfolded')).toBe('true');

    dom.window.dispatchEvent(new dom.window.Event('afterprint'));
    expect(doc.querySelectorAll('.alloflow-print-answer')).toHaveLength(0);
    expect(cornellTable.classList.contains('alloflow-cornell-folded')).toBe(true);
  });

  it('tracks used Cloze and Sentence Frame word bank chips and resets/restores cleanly', () => {
    const items = [
      { id: 'sim12', type: 'simplified', title: 'Cells', data: 'Every cell has cytoplasm inside.' },
      { id: 'g12', type: 'glossary', title: 'Terms', data: [{ term: 'cell', def: 'Basic unit' }, { term: 'cytoplasm', def: 'Fluid inside' }] },
      { id: 'sf12', type: 'sentence-frames', title: 'Write', data: { mode: 'list', wordBank: ['cell', 'because'], items: [{ tier: 'emerging', text: 'A ___ is living ___ it grows.' }] } },
    ];
    const html = pipeline.generateFullPackHTML(items, 'Cells', false, {}, {
      includeSimplified: true,
      includeGlossary: false,
      includeSentenceFrames: true,
      includeTeacherKey: false,
      clozeWorksheet: true,
      clozeInteractive: true,
      clozeMaxPerTerm: 1,
      annotations: [],
    });
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.edu/pack.html' });
    activeDoms.push(dom);
    const doc = dom.window.document;

    const clozeChips = Array.from(doc.querySelectorAll('.alloflow-cloze-chip'));
    const cellChip = clozeChips.find((c) => (c.getAttribute('data-cloze-word') || '').toLowerCase() === 'cell');
    expect(cellChip).toBeTruthy();
    expect(cellChip.getAttribute('data-chip-used')).toBeNull();

    // Typing cellular (partial substring) shouldn't falsely trigger used state; typing cell marks used
    const clozeInputs = Array.from(doc.querySelectorAll('.alloflow-cloze-input'));
    const cellInput = clozeInputs.find((i) => (i.getAttribute('data-cloze-answer') || '').toLowerCase() === 'cell');
    cellInput.value = 'cell';
    cellInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(cellChip.getAttribute('data-chip-used')).toBe('true');
    expect(cellChip.classList.contains('alloflow-cloze-chip-used')).toBe(true);

    const resetBtn = doc.querySelector('.alloflow-cloze-reset-btn');
    resetBtn.click();
    expect(cellChip.getAttribute('data-chip-used')).toBeNull();
    expect(cellChip.classList.contains('alloflow-cloze-chip-used')).toBe(false);

    // Sentence frames word-boundary matching
    const sfField = doc.querySelector('.alloflow-sf-section .alloflow-response-input');
    const sfCellChip = Array.from(doc.querySelectorAll('.alloflow-sf-chip')).find((c) => c.getAttribute('data-sf-word') === 'cell');
    expect(sfField && sfCellChip).toBeTruthy();
    sfField.value = 'cellular structure';
    sfField.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(sfCellChip.getAttribute('data-chip-used')).toBeNull();

    sfField.value = 'The cell divides.';
    dom.window.dispatchEvent(new dom.window.Event('alloflow-responses-restored'));
    expect(sfCellChip.getAttribute('data-chip-used')).toBe('true');
    expect(sfCellChip.classList.contains('alloflow-sf-chip-used')).toBe(true);
  });

  it('supports interactive Cornell Notes fold toggle & click/keyboard cell peek only on filled student exports', () => {
    const filledCornell = {
      id: 'cnFilled',
      type: 'note-taking',
      title: 'Cornell Study',
      data: { templateType: 'cornell-notes', cues: [{ text: 'What is osmosis?' }], notes: [{ text: 'Diffusion of water across a membrane.' }], summary: 'Water moves.' },
    };
    const emptyCornell = {
      id: 'cnEmpty',
      type: 'note-taking',
      title: 'Blank Cornell',
      data: { templateType: 'cornell-notes', cues: [{ text: 'Cue 1' }], notes: [{ text: '' }], summary: '' },
    };

    const wsHtml = pipeline.generateFullPackHTML([filledCornell], 'Bio', true, {}, { includeNoteTaking: true, includeTeacherKey: false, annotations: [] });
    expect(parseDoc(wsHtml).querySelector('.alloflow-cornell-controls')).toBeNull();

    const emptyHtml = pipeline.generateFullPackHTML([emptyCornell], 'Bio', false, {}, { includeNoteTaking: true, includeTeacherKey: false, annotations: [] });
    expect(parseDoc(emptyHtml).querySelector('.alloflow-cornell-controls')).toBeNull();

    const studentHtml = pipeline.generateFullPackHTML([filledCornell], 'Bio', false, {}, { includeNoteTaking: true, includeTeacherKey: false, annotations: [] });
    const dom = new JSDOM(studentHtml, { runScripts: 'dangerously', url: 'https://example.edu/pack.html' });
    activeDoms.push(dom);
    const doc = dom.window.document;
    const foldBtn = doc.querySelector('.alloflow-cornell-fold-btn');
    const tbl = doc.querySelector('.alloflow-cornell-table');
    const noteCell = doc.querySelector('td.alloflow-note-cell');
    expect(foldBtn && tbl && noteCell).toBeTruthy();
    expect(noteCell.getAttribute('tabindex')).toBe('0');

    foldBtn.click();
    expect(tbl.classList.contains('alloflow-cornell-folded')).toBe(true);
    expect(foldBtn.getAttribute('aria-pressed')).toBe('true');

    noteCell.click();
    expect(noteCell.classList.contains('alloflow-note-peek')).toBe(true);

    noteCell.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(noteCell.classList.contains('alloflow-note-peek')).toBe(false);

    noteCell.click();
    expect(noteCell.classList.contains('alloflow-note-peek')).toBe(true);
    foldBtn.click(); // reveal all clears peeks
    expect(tbl.classList.contains('alloflow-cornell-folded')).toBe(false);
    expect(noteCell.classList.contains('alloflow-note-peek')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 13 · Markdown & Word (.docx) Export Fidelity
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 13 · Document Builder Markdown & DOCX Export Fidelity', () => {
  it('preserves Concept Sort/Venn selects and form controls in Markdown while stripping interactive chrome', () => {
    const viewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
    const helpers = new Function(
      viewSrc.slice(viewSrc.indexOf('const _BUILDER_STYLE_GALLERY'), viewSrc.indexOf('function ExportPreviewView')) +
      '\nreturn { clean: _builderCleanMarkdownRoot, markdown: _builderMarkdownFromRoot };'
    )();
    const d = document.implementation.createHTMLDocument('Export');
    d.documentElement.lang = 'en';
    d.body.innerHTML = `
      <div class="alloflow-cloze-controls"><button>Check Answers</button></div>
      <div class="alloflow-cornell-controls"><button>Cover notes</button></div>
      <p>Water is made of <input type="text" class="alloflow-cloze-input" value="hydrogen"/> and <input type="text" class="alloflow-cloze-input" value=""/>.</p>
      <p><label><input type="checkbox" checked/> Reviewed</label></p>
      <textarea>My hypothesis text.</textarea>
      <div class="alloflow-cs-strip">
        Ice
        <div class="alloflow-cs-controls"><button type="button">Solid</button><button type="button">Gas</button></div>
        <select class="alloflow-cs-response" hidden><option value="">Choose</option><option value="solid" selected>Solid</option></select>
      </div>
      <div class="alloflow-venn-activity">
        <div class="alloflow-venn-card">
          <button class="alloflow-venn-card-button">Chloroplast</button>
          <div class="alloflow-venn-controls"><button type="button">Plant Only</button></div>
          <select class="alloflow-venn-response" hidden><option value="">Zone</option><option value="a" selected>Plant Only</option></select>
        </div>
        <div class="alloflow-venn-print-only"><ul><li>Chloroplast</li></ul></div>
      </div>
    `;
    const res = helpers.markdown(helpers.clean(d));
    expect(res.markdown).toContain('[hydrogen]');
    expect(res.markdown).toContain('______');
    expect(res.markdown).toContain('[x]');
    expect(res.markdown).toContain('> My hypothesis text.');
    expect(res.markdown).toContain('Ice — Solid');
    expect(res.markdown).toContain('Chloroplast — Plant Only');
    expect(res.markdown.match(/Chloroplast/g)).toHaveLength(1);
    expect(res.markdown).not.toContain('Check Answers');
    expect(res.markdown).not.toContain('Cover notes');
  });

  it('converts .alloflow-cs-strip into clean paragraphs and strips interactive chrome in _htmlToDocxSpec', () => {
    const pdfSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
    const fnStart = pdfSrc.indexOf('function _htmlToDocxSpec(html) {');
    const fnSrc = pdfSrc.slice(fnStart, pdfSrc.indexOf('// end _htmlToDocxSpec', fnStart));
    const _htmlToDocxSpec = new Function(fnSrc + '; return _htmlToDocxSpec;')();
    const html = `<!DOCTYPE html><html lang="en"><head><title>CS Test</title></head><body>
      <div class="alloflow-tl-controls"><button>Move Up</button></div>
      <div class="alloflow-cornell-controls"><button>Cover notes</button></div>
      <div class="alloflow-cs-strip">
        <span>Steam</span>
        <div class="alloflow-cs-controls"><button>Solid</button><button>Gas</button></div>
        <select class="alloflow-cs-response" hidden><option value="">Choose</option><option value="gas" selected>Gas</option></select>
      </div>
      <div class="alloflow-cs-strip">
        <span>Granite</span>
        <div class="alloflow-cs-controls"><button>Solid</button><button>Gas</button></div>
        <select class="alloflow-cs-response" hidden><option value="">Choose</option><option value="solid">Solid</option></select>
      </div>
    </body></html>`;
    const spec = _htmlToDocxSpec(html);
    const json = JSON.stringify(spec.blocks);
    expect(json).toContain('Steam — Gas');
    expect(json).toContain('Granite — ____________');
    expect(json).not.toContain('Move Up');
    expect(json).not.toContain('Cover notes');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 14 · Secondary Exporters (Slides, H5P & Google Forms)
// ─────────────────────────────────────────────────────────────────────────────
describe('Wave 14 · Slides Graphic Organizers & Sentence Frames, H5P Cloze/Notes & Forms Mismatch', () => {
  function setupExporter(liveState = {}) {
    const zipFiles = new Map();
    window.JSZip = class MockZip {
      file(name, content) { zipFiles.set(name, content); }
      generateAsync() { return Promise.resolve(new Blob(['zip'])); }
    };
    const recordedSlides = [];
    window.PptxGenJS = class MockPptx {
      constructor() { this.ShapeType = { rect: 'rect', roundRect: 'roundRect', line: 'line', ellipse: 'ellipse' }; }
      defineSlideMaster() {}
      addSlide() {
        const s = {
          texts: [], shapes: [], notes: [],
          addText(t, opts) { this.texts.push({ raw: typeof t === 'string' ? t : JSON.stringify(t), opts: opts || {} }); },
          addShape(type, opts) { this.shapes.push({ type, opts: opts || {} }); },
          addNotes(n) { this.notes.push(n); },
          addTable() {}, addImage() {},
        };
        recordedSlides.push(s);
        return s;
      }
      writeFile({ fileName }) { return Promise.resolve(fileName); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:wave14');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const exporter = window.AlloModules.createExport({
      liveRef: {
        current: {
          history: [],
          generatedContent: null,
          sourceTopic: 'Ecosystems',
          studentResponses: {},
          exportConfig: { audience: 'student', includeAnswerKey: false, annotations: [] },
          addToast,
          t: (k, f) => (typeof f === 'string' ? f : k),
          ...liveState,
        },
      },
      warnLog: () => {},
      debugLog: () => {},
      escapeXml: (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])),
      generateUUID: () => 'uuid-14',
    });
    return { exporter, zipFiles, recordedSlides, addToast };
  }

  it('exports 3-column Venn and 2-column T-Chart/Cause-Effect outlines plus tiered sentence-frames slides', async () => {
    const history = [
      {
        id: 'vennSlide', type: 'outline', title: 'Cell Venn',
        data: { structureType: 'Venn Diagram', main: 'Plant vs Animal', branches: [{ title: 'Plant Only', items: ['Cell wall'] }, { title: 'Animal Only', items: ['Centrioles'] }, { title: 'Both', items: ['Nucleus'] }] },
      },
      {
        id: 'ceSlide', type: 'outline', title: 'Cause & Effect',
        data: { structureType: 'Cause-Effect', main: 'Deforestation', branches: [{ title: 'Causes', items: ['Logging'] }, { title: 'Effects', items: ['Habitat loss'] }] },
      },
      {
        id: 'sfSlide', type: 'sentence-frames', title: 'Evidence Frames',
        data: { mode: 'list', wordBank: ['because', 'evidence'], rubric: 'SECRET_TEACHER_RUBRIC', items: [{ tier: 'emerging', text: 'The data shows ___' }, { tier: 'expanding', text: 'Because ___, I claim ___' }] },
      },
    ];

    const studentSetup = setupExporter({ history, exportConfig: { audience: 'student', includeTeacherKey: false, includeAnswerKey: false } });
    await studentSetup.exporter.handleExportSlides({ audience: 'student', includeAnswerKey: false });
    const vennSlide = studentSetup.recordedSlides.find((s) => s.texts.some((x) => x.raw.includes('Plant Only') && x.opts.x < 1));
    expect(vennSlide).toBeTruthy();
    const bothText = vennSlide.texts.find((x) => x.raw.includes('Both'));
    const animalText = vennSlide.texts.find((x) => x.raw.includes('Animal Only'));
    expect(bothText.opts.x).toBeGreaterThan(3.0);
    expect(bothText.opts.x).toBeLessThan(animalText.opts.x);

    const ceSlide = studentSetup.recordedSlides.find((s) => s.texts.some((x) => x.raw.includes('Logging')));
    expect(ceSlide.texts.some((x) => x.raw === '→')).toBe(true);

    const sfStudentJoined = studentSetup.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    expect(sfStudentJoined).toContain('Word Bank');
    expect(sfStudentJoined).toContain('EMERGING');
    expect(sfStudentJoined).toContain('EXPANDING');
    expect(sfStudentJoined).not.toContain('SECRET_TEACHER_RUBRIC');

    const teacherSetup = setupExporter({ history, exportConfig: { audience: 'teacher', includeTeacherKey: true, includeAnswerKey: true } });
    await teacherSetup.exporter.handleExportSlides({ audience: 'teacher', includeAnswerKey: true });
    const sfTeacherJoined = teacherSetup.recordedSlides.map((s) => s.texts.map((t) => t.raw).join('\n')).join('\n');
    expect(sfTeacherJoined).toContain('SECRET_TEACHER_RUBRIC');
  });

  it('exports H5P QuestionSet for simplified cloze and guided-notes/q-and-a while keeping unsupported type error', async () => {
    const glossary = { id: 'g14', type: 'glossary', data: [{ term: 'Osmosis', def: 'Water diffusion' }, { term: 'Vacuole', def: 'Storage sac' }] };
    const simpSetup = setupExporter({
      history: [glossary],
      generatedContent: { id: 's14', type: 'simplified', title: 'Cell Transport', data: 'Osmosis moves water across a membrane. The vacuole stores water.' },
    });
    expect(await simpSetup.exporter.handleExportH5P()).toBe(true);
    const simpH5p = JSON.parse(simpSetup.zipFiles.get('h5p.json'));
    const simpContent = JSON.parse(simpSetup.zipFiles.get('content/content.json'));
    expect(simpH5p.mainLibrary).toBe('H5P.QuestionSet');
    expect(simpContent.questions.length).toBeGreaterThanOrEqual(2);
    expect(simpContent.questions.every((q) => q.library === 'H5P.Blanks 1.14')).toBe(true);

    const gnSetup = setupExporter({
      generatedContent: { id: 'gn14', type: 'note-taking', title: 'Guided Notes', data: { templateType: 'guided-notes', blanks: [{ before: 'Water moves by', answer: 'osmosis', after: '.' }] } },
    });
    expect(await gnSetup.exporter.handleExportH5P()).toBe(true);
    expect(JSON.parse(gnSetup.zipFiles.get('content/content.json')).questions[0].library).toBe('H5P.Blanks 1.14');

    const qaSetup = setupExporter({
      generatedContent: { id: 'qa14', type: 'note-taking', title: 'Study Q&A', data: { templateType: 'q-and-a', pairs: [{ question: 'Why does a plant wilt?', answer: 'Low turgor pressure' }] } },
    });
    expect(await qaSetup.exporter.handleExportH5P()).toBe(true);
    expect(JSON.parse(qaSetup.zipFiles.get('content/content.json')).questions[0].library).toBe('H5P.Essay 1.5');

    const advSetup = setupExporter({ generatedContent: { id: 'a14', type: 'adventure', data: {} } });
    expect(await advSetup.exporter.handleExportH5P()).toBe(false);
    expect(advSetup.addToast).toHaveBeenCalledWith('H5P export supports quizzes, glossaries, and flashcards.', 'error');
  });

  it('converts relation-mismatch quiz items into two auto-graded Google Form items', () => {
    const viewSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
    const start = viewSrc.indexOf('// __ALLO_DRIVE_DELIVERY_BEGIN__');
    const end = viewSrc.indexOf('// __ALLO_DRIVE_DELIVERY_END__', start);
    const sandbox = {};
    vm.runInNewContext(viewSrc.slice(start, end) + '\nthis.quizToFormItems = _alloQuizToFormItems;', sandbox);

    const mcPair = sandbox.quizToFormItems({
      questions: [{
        type: 'relation-mismatch',
        question: 'Fix the organelle pair.',
        pairs: [{ left: 'Nucleus', right: 'DNA' }, { left: 'Chloroplast', right: 'ATP breakdown' }, { left: 'Ribosome', right: 'Protein' }],
        wrongPairIndex: 1,
        candidatePartners: ['Photosynthesis', 'Protein'],
        correctPartnerForWrong: 'Photosynthesis',
      }],
    });
    expect(mcPair).toHaveLength(2);
    expect(mcPair[0]).toMatchObject({ type: 'mc', answer: [1], points: 1 });
    expect(mcPair[1]).toMatchObject({ type: 'mc', answer: [0], points: 1 });

    const shortPair = sandbox.quizToFormItems({
      questions: [{
        type: 'relation-mismatch',
        question: 'Spot and fix.',
        pairs: [{ left: 'Heart', right: 'Pumps blood' }, { left: 'Lung', right: 'Digests food' }],
        wrongPairIndex: 1,
        correctPartnerForWrong: 'Exchanges gases',
      }],
    });
    expect(shortPair).toHaveLength(2);
    expect(shortPair[0]).toMatchObject({ type: 'mc', answer: [1], points: 1 });
    expect(shortPair[1]).toMatchObject({ type: 'short', answer: 'Exchanges gases', points: 1 });
  });
});
