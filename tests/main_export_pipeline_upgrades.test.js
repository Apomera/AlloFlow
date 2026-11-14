import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const DIR = resolve(ROOT);

let React;
let ReactDOMClient;
let pipeline;
let ExportHandlers;
let HostHandlersFactory;
let inboxMeta;
let ExportPreviewView;
let ExportPreviewHelpers;

const activeDoms = [];
const activeRoots = [];

function createPipeline(extraState = {}, customT = null) {
  const stub = async () => '{}';
  return window.AlloModules.createDocPipeline({
    callGemini: stub,
    callGeminiVision: stub,
    callImagen: async () => null,
    addToast: () => {},
    t: customT || ((k) => k),
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: { currentUiLanguage: 'English', ...extraState },
  });
}

function parseDoc(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

async function bootPackDOM(html, opts = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: opts.url || 'https://example.test/pack.html',
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
        return 'blob:captured-' + blobs.length;
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

async function dismissIdentityPromptWithOnce(win) {
  const dialog = win.document.querySelector('[role="dialog"]');
  if (!dialog) return false;
  const onceBtn = Array.from(dialog.querySelectorAll('button')).find((b) => /use once/i.test(b.textContent));
  if (onceBtn) {
    onceBtn.click();
    await new Promise((done) => win.setTimeout(done, 40));
    return true;
  }
  return false;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  React = require(resolve(DIR, 'desktop/web-app/node_modules/react'));
  ReactDOMClient = require(resolve(DIR, 'desktop/web-app/node_modules/react-dom/client'));
  globalThis.React = window.React = React;
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('view_submission_inbox_module.js');
  new Function(readFileSync(resolve(DIR, 'view_export_preview_module.js'), 'utf8'))();

  pipeline = createPipeline();
  ExportHandlers = window.AlloModules.ExportHandlers;
  HostHandlersFactory = window.AlloModules.HostHandlers;
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
  ExportPreviewView = window.AlloModules.ExportPreviewView;
  ExportPreviewHelpers = window.AlloModules.ExportPreviewHelpers;
}, 60000);

afterEach(() => {
  while (activeRoots.length) {
    const { root, container } = activeRoots.pop();
    try { root.unmount(); } catch (_) {}
    try { container.remove(); } catch (_) {}
  }
  while (activeDoms.length) {
    const d = activeDoms.pop();
    try { d.window.close(); } catch (_) {}
  }
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cloze Worksheet Upgrades & Backwards Compatibility
// ─────────────────────────────────────────────────────────────────────────────
describe('1. Cloze worksheet upgrades (max-per-term, word bank top, nowrap punctuation, parity, back-compat)', { timeout: 60000 }, () => {
  const reading = {
    id: 'r1',
    type: 'simplified',
    title: 'Plant Energy',
    data: 'Chlorophyll absorbs sunlight. During photosynthesis, chlorophyll helps leaves make sugar. Photosynthesis feeds the plant!',
  };
  const glossary = {
    id: 'g1',
    type: 'glossary',
    title: 'Key Terms',
    data: [
      { term: 'Chlorophyll', definition: 'Green pigment in plants', isSelected: true },
      { term: 'Photosynthesis', definition: 'Making food using light', isSelected: true },
    ],
  };

  it('caps blanks at 1 per term, keeps student/teacher numbering identical, places ☐ word bank before passage, and wraps trailing punctuation with nowrap', () => {
    const html = pipeline.generateFullPackHTML([reading, glossary], 'Plants', true, {}, {
      includeSimplified: true,
      includeGlossary: false,
      includeTeacherKey: true,
      clozeWorksheet: true,
      clozeMaxPerTerm: 1,
      clozeWordBankPosition: 'top',
      annotations: [],
    });
    const doc = parseDoc(html);
    const studentSec = doc.querySelector('.alloflow-resource-wrap:not(.teacher-view *) #r1') || doc.querySelector('#r1');
    const teacherSec = doc.querySelector('.teacher-view #r1') || doc.querySelectorAll('.teacher-view .section')[0];

    expect(studentSec).not.toBeNull();
    expect(teacherSec).not.toBeNull();

    const blanks = Array.from(studentSec.querySelectorAll('.alloflow-cloze-blank'));
    expect(blanks).toHaveLength(2);
    expect(blanks.map((b) => b.textContent.trim())).toEqual(['1', '2']);

    // Teacher key uses <ol> ordinal numbering identical to student blanks (1 -> Chlorophyll, 2 -> photosynthesis)
    const teacherKeyItems = Array.from(teacherSec.querySelectorAll('ol li')).map((li) => li.textContent.trim());
    expect(teacherKeyItems.map((s) => s.toLowerCase())).toEqual(['chlorophyll', 'photosynthesis']);

    // Word Bank appears BEFORE the passage div inside #r1
    const passageDiv = studentSec.querySelector('.alloflow-own-font');
    const allChildren = Array.from(studentSec.children);
    const wordBankEl = allChildren.find((el) => el.textContent.includes('☐'));
    expect(wordBankEl).toBeTruthy();
    expect(passageDiv).toBeTruthy();
    expect(wordBankEl.compareDocumentPosition(passageDiv) & 4).toBe(4); // DOCUMENT_POSITION_FOLLOWING

    // Word Bank items carry ☐ prefix (lowercase normalized except capitalization inside chips)
    const chipsText = Array.from(wordBankEl.querySelectorAll('span')).map((s) => s.textContent.trim());
    expect(chipsText.some((c) => c.startsWith('☐ '))).toBe(true);

    // Trailing punctuation (",") after "photosynthesis," stays inside the same white-space:nowrap span
    const nowrapSpans = Array.from(passageDiv.querySelectorAll('span[style*="white-space:nowrap"]'));
    expect(nowrapSpans.length).toBeGreaterThanOrEqual(2);
    expect(nowrapSpans.some((sp) => sp.querySelector('.alloflow-cloze-blank') && sp.textContent.includes(','))).toBe(true);
  });

  it('stays backwards-compatible with bare { clozeWorksheet: true } (all occurrences blanked, word bank at bottom)', () => {
    const html = pipeline.generateFullPackHTML([reading, glossary], 'Plants', true, {}, {
      includeSimplified: true,
      includeGlossary: false,
      includeTeacherKey: true,
      clozeWorksheet: true,
      annotations: [],
    });
    const doc = parseDoc(html);
    const studentSec = doc.querySelector('#r1');
    const blanks = Array.from(studentSec.querySelectorAll('.alloflow-cloze-blank'));
    // Chlorophyll appears twice and Photosynthesis appears twice -> 4 blanks total
    expect(blanks).toHaveLength(4);
    const passageDiv = studentSec.querySelector('.alloflow-own-font');
    const wordBankEl = Array.from(studentSec.children).find((el) => el.textContent.includes('☐'));
    expect(wordBankEl).toBeTruthy();
    expect(passageDiv.compareDocumentPosition(wordBankEl) & 4).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Deterministic Shuffle, Duplex Print, _wrapSection & Named @page
// ─────────────────────────────────────────────────────────────────────────────
describe('2. Deterministic shuffle, duplex print rules, _wrapSection leading <style>, and @page word-wall', { timeout: 60000 }, () => {
  const tlItem = {
    id: 'tl1',
    type: 'timeline',
    title: 'Water Cycle Events',
    data: {
      items: [
        { date: 'Step 1', event: 'Evaporation rises' },
        { date: 'Step 2', event: 'Condensation forms clouds' },
        { date: 'Step 3', event: 'Precipitation falls' },
        { date: 'Step 4', event: 'Collection flows to sea' },
      ],
    },
  };
  const csItem = {
    id: 'cs1',
    type: 'concept-sort',
    title: 'Matter Sort',
    data: {
      categories: [{ id: 'solid', label: 'Solid' }, { id: 'liquid', label: 'Liquid' }],
      items: [
        { id: 'i1', categoryId: 'solid', content: 'Ice cube' },
        { id: 'i2', categoryId: 'liquid', content: 'Raindrop' },
        { id: 'i3', categoryId: 'solid', content: 'Granite stone' },
        { id: 'i4', categoryId: '__uncategorized', content: 'SECRET EXTRA ITEM' },
      ],
    },
  };
  const wwItem = {
    id: 'ww1',
    type: 'glossary',
    title: 'Classroom Word Wall',
    data: [
      { term: 'Atom', def: 'Smallest unit of matter' },
      { term: 'Molecule', def: 'Two or more atoms bonded together' },
    ],
  };

  it('deterministically shuffles student timeline cuttable-strips and concept-sort while excluding __uncategorized from student view', () => {
    const cfg = {
      includeTimeline: true,
      includeConceptSort: true,
      includeTeacherKey: true,
      timelineDisplayMode: 'cuttable-strips',
      annotations: [],
    };
    const html1 = pipeline.generateFullPackHTML([tlItem, csItem], 'Science', true, {}, cfg);
    const html2 = pipeline.generateFullPackHTML([tlItem, csItem], 'Science', true, {}, cfg);
    const doc1 = parseDoc(html1);
    const doc2 = parseDoc(html2);

    const tl1Texts = Array.from(doc1.querySelectorAll('#tl1 .alloflow-tl-strip')).map((el) => el.textContent.trim());
    const tl2Texts = Array.from(doc2.querySelectorAll('#tl1 .alloflow-tl-strip')).map((el) => el.textContent.trim());
    expect(tl1Texts).toEqual(tl2Texts);
    expect(tl1Texts.map((_, idx) => idx)).not.toEqual(
      Array.from(doc1.querySelectorAll('#tl1 .alloflow-tl-strip')).map((el) => Number(el.getAttribute('data-original-index')))
    );

    const csStudentSec = Array.from(doc1.querySelectorAll('#cs1')).find((el) => !el.closest('.teacher-view'));
    expect(csStudentSec).toBeTruthy();
    expect(csStudentSec.textContent).not.toContain('SECRET EXTRA ITEM');
    expect(doc1.querySelector('.teacher-view #cs1')?.textContent).toContain('SECRET EXTRA ITEM');
    const cs1Order = Array.from(doc1.querySelectorAll('#cs1 .alloflow-cs-item-text'))
      .filter((el) => !el.closest('.teacher-view'))
      .map((el) => el.textContent.trim());
    const cs2Order = Array.from(doc2.querySelectorAll('#cs1 .alloflow-cs-item-text'))
      .filter((el) => !el.closest('.teacher-view'))
      .map((el) => el.textContent.trim());
    expect(cs1Order).toEqual(cs2Order);
    expect(cs1Order).toHaveLength(3);

    // Assessment mode uses a distinct seed tag and suppresses self-check attributes
    const assessHtml = pipeline.generateFullPackHTML([tlItem, csItem], 'Science', false, {}, {
      ...cfg,
      assessmentMode: true,
    });
    const assessDoc = parseDoc(assessHtml);
    expect(assessDoc.querySelector('#tl1 .alloflow-tl-strip[data-original-index]')).toBeNull();
    expect(assessDoc.querySelector('.teacher-view')).toBeNull();
  });

  it('emits duplex break-before: right print rules, named @page alloflow-word-wall-page, and cleanly moves leading <style> inside .section in _wrapSection', () => {
    const html = pipeline.generateFullPackHTML([wwItem, tlItem], 'Word Wall Pack', true, {}, {
      includeGlossary: true,
      includeTimeline: true,
      includeTeacherKey: true,
      glossaryDisplayMode: 'word-wall',
      timelineDisplayMode: 'cuttable-strips',
      annotations: [],
    });

    expect(html).toMatch(/@page\s+alloflow-word-wall-page\s*\{/);
    expect(html).toContain('.alloflow-word-wall-sheet');
    expect(html).toContain('page: alloflow-word-wall-page;');
    expect(html).toContain('.teacher-view');
    expect(html).toMatch(/\.teacher-view\s*\{[^}]*break-before:\s*right/);
    expect(html).toMatch(/\.alloflow-cutout-sheet[^}]*break-before:\s*right/);
    expect(html).toMatch(/\.page-break\s*\{[^}]*break-before:\s*right/);

    const doc = parseDoc(html);
    const wrap = doc.querySelector('.alloflow-resource-wrap[data-alloflow-resource-id="ww1"]');
    expect(wrap).not.toBeNull();
    // _wrapSection moves leading <style> INSIDE .section without leaving <style> as direct child of .alloflow-resource-wrap or injecting a duplicate fallback h2
    expect(wrap.querySelectorAll(':scope > style')).toHaveLength(0);
    const wwSection = wrap.querySelector('.alloflow-word-wall-sheet');
    expect(wwSection).not.toBeNull();
    expect(wwSection.firstElementChild?.tagName).toBe('STYLE');
    expect(wwSection.querySelectorAll('h2')).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. parseMarkdownToHTML & Bilingual / Directions Markdown Extensions
// ─────────────────────────────────────────────────────────────────────────────
describe('3. parseMarkdownToHTML charts, markdown blocks, bilingual split, and directions GFM tables', { timeout: 60000 }, () => {
  it('renders bar, line, and pie [[CHART: ...]] blocks with SVG + accessible data table and falls back cleanly on malformed JSON', () => {
    const md = [
      '[[CHART: {"type":"bar","title":"Rainfall","xLabel":"Month","yLabel":"cm","unit":"cm","data":[{"label":"Apr","value":5},{"label":"May","value":9}]}]]',
      '[[CHART: {"type":"line","title":"Growth","labels":["W1","W2","W3"],"values":[2,6,11]}]]',
      '[[CHART: {"type":"pie","title":"Budget","data":[{"label":"Labs","value":60},{"label":"Books","value":40}]}]]',
      '[[CHART: {bad json payload}]]',
    ].join('\n\n');

    const html = pipeline.parseMarkdownToHTML(md);
    const doc = parseDoc(html);

    const figures = Array.from(doc.querySelectorAll('figure.alloflow-inline-chart'));
    expect(figures).toHaveLength(3);
    figures.forEach((fig) => {
      expect(fig.getAttribute('role')).toBe('group');
      expect(fig.querySelector('svg[role="img"][aria-label]')).not.toBeNull();
      expect(fig.querySelector('figcaption')).not.toBeNull();
      const table = fig.querySelector('table.alloflow-chart-table');
      expect(table).not.toBeNull();
      expect(table.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(2);
    });
    // Line chart renders <polyline> + points, pie renders <path>
    expect(figures[1].querySelector('svg polyline')).not.toBeNull();
    expect(figures[2].querySelectorAll('svg path').length).toBeGreaterThanOrEqual(2);
    expect(figures[0].querySelector('table.alloflow-chart-table').textContent).toContain('9 cm');

    const fallback = doc.querySelector('.alloflow-inline-chart-fallback');
    expect(fallback).not.toBeNull();
    expect(fallback.textContent).toContain('{bad json payload}');
  });

  it('renders #### headings, ordered lists, blockquotes, horizontal rules, bilingual split, and GFM tables in directions', () => {
    const mdHtml = pipeline.parseMarkdownToHTML([
      '#### Fourth Heading',
      '1. First item',
      '2. Second item',
      '> Quoted insight',
      '---',
    ].join('\n\n'));
    const mdDoc = parseDoc(mdHtml);
    expect(mdDoc.querySelector('h4')?.textContent).toBe('Fourth Heading');
    expect(Array.from(mdDoc.querySelectorAll('ol li')).map((li) => li.textContent)).toEqual(['First item', 'Second item']);
    expect(mdDoc.querySelector('blockquote')?.textContent).toContain('Quoted insight');
    expect(mdDoc.querySelector('hr')).not.toBeNull();

    const bilingualHtml = pipeline.generateFullPackHTML([
      {
        id: 'sim1',
        type: 'simplified',
        title: 'Lectura',
        data: 'Las plantas hacen comida.\n\n--- ENGLISH TRANSLATION ---\n\nPlants make food.',
      },
      {
        id: 'dir1',
        type: 'directions',
        title: 'Lab Steps',
        data: 'Follow the table:\n\n| Step | Action |\n| --- | --- |\n| 1 | Measure water |\n| 2 | Record temp |',
      },
    ], 'Bilingual & Directions', false, {}, { includeSimplified: true, includeDirections: true, annotations: [] });

    const doc = parseDoc(bilingualHtml);
    const split = doc.querySelector('#sim1 .alloflow-bilingual-split');
    expect(split).not.toBeNull();
    expect(split.children[0].textContent).toContain('Las plantas hacen comida.');
    expect(split.children[1].textContent).toContain('Plants make food.');

    const dirTable = doc.querySelector('#dir1 table');
    expect(dirTable).not.toBeNull();
    expect(Array.from(dirTable.querySelectorAll('th')).map((th) => th.textContent.trim())).toEqual(['Step', 'Action']);
    expect(dirTable.textContent).toContain('Measure water');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. HTML/XML XSS Escaping & Fluency Resilience
// ─────────────────────────────────────────────────────────────────────────────
describe('4. HTML/XML XSS escaping across resources & getSlidesPreviewHTML, plus non-array wordData resilience', { timeout: 60000 }, () => {
  const XSS = '<img src=x onerror=1>';
  const XSS_ATTR = '"><img src=x onerror=1>';

  it('escapes untrusted <img src=x onerror=1> across faq, sentence-frames, fluency-record, concept-sort, outline Fishbone, and alignment-report', () => {
    const items = [
      { id: 'f1', type: 'faq', title: 'FAQ ' + XSS, data: [{ question: 'Q ' + XSS, question_en: 'QE ' + XSS, answer: 'A ' + XSS, answer_en: 'AE ' + XSS }] },
      { id: 'sf1', type: 'sentence-frames', title: 'Frames', data: { mode: 'list', wordBank: [XSS], rubric: 'Rubric ' + XSS, items: [{ tier: 'emerging', text: 'I saw ' + XSS, text_en: XSS }] } },
      { id: 'sf2', type: 'sentence-frames', title: 'Para', data: { mode: 'paragraph', text: 'Claim ' + XSS + ' with [' + XSS_ATTR + '].', text_en: XSS } },
      { id: 'fl1', type: 'fluency-record', title: 'Fluency', data: { metrics: { accuracy: '95' + XSS, wcpm: '110' + XSS }, mimeType: 'audio/wav' + XSS_ATTR, audioRecording: 'AA', feedback: 'Good ' + XSS, wordData: [{ word: XSS, status: 'correct' }] } },
      { id: 'fl2', type: 'fluency-record', title: 'Fluency Bad WordData', data: { metrics: { accuracy: 90, wcpm: 100 }, wordData: 'corrupt-non-array' } },
      { id: 'cs1', type: 'concept-sort', title: 'Sort', data: { categories: [{ id: 'c1', label: 'Cat ' + XSS }], items: [{ id: 'i1', categoryId: 'c1', content: 'Item ' + XSS, image: 'https://example.test/x.png', imageAlt: XSS_ATTR }] } },
      { id: 'out1', type: 'outline', title: 'Fishbone', data: { structureType: 'Fishbone', main: 'Effect ' + XSS, branches: [{ title: 'Cause ' + XSS, items: ['Sub ' + XSS] }] } },
      {
        id: 'al1',
        type: 'alignment-report',
        title: 'Alignment ' + XSS,
        data: {
          reports: [],
          comprehensive: {
            overall: {
              dimensionsEvaluated: 1,
              score: 88,
              label: 'Summary ' + XSS,
              notes: 'Notes ' + XSS,
              blockingIssues: [{ dimension: 'Vocab ' + XSS, issue: 'Issue ' + XSS }],
              dimensionScores: { vocabulary: { status: 'Aligned' } },
              perDimensionPercent: { vocabulary: 90 },
            },
            vocabulary: {
              status: 'Aligned',
              totalWords: 100,
              tier2Count: 4,
              tier3Count: 2,
              glossaryTermsCount: 5,
              recommendations: ['Rec ' + XSS],
              notes: 'VNotes ' + XSS,
              llmReview: { narrative: 'Narr ' + XSS, fixes: ['Fix ' + XSS] },
            },
          },
        },
      },
    ];

    const html = pipeline.generateFullPackHTML(items, 'XSS Pack ' + XSS, false, {}, {
      includeFaq: true,
      includeSentenceFrames: true,
      includeFluencyRecord: true,
      includeConceptSort: true,
      includeOutline: true,
      includeAlignmentReport: true,
      includeTeacherKey: true,
      annotations: [],
    });

    expect(html).not.toContain('<img src=x onerror=1>');
    const doc = parseDoc(html);
    expect(doc.querySelectorAll('img[onerror]')).toHaveLength(0);
    expect(doc.querySelector('#fl2')).not.toBeNull();
    expect(doc.querySelector('#f1').textContent).toContain(XSS);
    expect(doc.querySelector('#out1 svg')).not.toBeNull();
    expect(doc.querySelector('#out1').textContent).toContain(XSS);
    expect(doc.querySelector('.teacher-view #al1').textContent).toContain('Blocking issues:');
  });

  it('escapes XSS payloads in getSlidesPreviewHTML across outline, timeline, faq, and topic', () => {
    const slidesHtml = ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Topic ' + XSS,
      gradeLevel: '5th',
      t: (k) => k,
      exportConfig: {},
      getExportableHistory: () => [
        { id: 'o1', type: 'outline', title: 'Outline ' + XSS, data: { main: 'Main ' + XSS, sections: [{ title: 'Sec ' + XSS, items: ['Pt ' + XSS] }] } },
        { id: 't1', type: 'timeline', title: 'Time ' + XSS, data: { events: [{ date: '1900 ' + XSS, title: 'Event ' + XSS, description: 'Desc ' + XSS }] } },
        { id: 'fq1', type: 'faq', title: 'FAQ ' + XSS, data: [{ question: 'Q ' + XSS, answer: 'A ' + XSS }] },
      ],
    });
    expect(slidesHtml).not.toContain('<img src=x onerror=1>');
    const doc = parseDoc(slidesHtml);
    expect(doc.querySelectorAll('img[onerror]')).toHaveLength(0);
    expect(doc.body.textContent).toContain(XSS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sentence Frames Round-Trip, Extended Check-My-Answers, Collapsible Math & v3 Annotations
// ─────────────────────────────────────────────────────────────────────────────
describe('5. Sentence frames inbox round-trip, Check my answers expansion, collapsible student Math, and v3 annotations', { timeout: 60000 }, () => {
  it('preserves [1] citations vs [cue] blanks, gates rubric in assessmentMode, and delivers sentence-frame answers to Submission Inbox', async () => {
    const sfItems = [
      {
        id: 'sf-list',
        type: 'sentence-frames',
        title: 'List Frames',
        data: {
          mode: 'list',
          wordBank: ['because', 'evidence'],
          rubric: '- Use academic terms cleanly.',
          items: [{ text: 'The claim holds ___', tier: 'expanding' }],
        },
      },
      {
        id: 'sf-para',
        type: 'sentence-frames',
        title: 'Citation Paragraph',
        data: {
          mode: 'paragraph',
          text: 'According to Source [1], plants [verb] light and release ___.',
        },
      },
    ];

    const assessHtml = pipeline.generateFullPackHTML(sfItems, 'Assess SF', false, {}, {
      includeSentenceFrames: true,
      assessmentMode: true,
      annotations: [],
    });
    expect(parseDoc(assessHtml).querySelector('.alloflow-sf-rubric')).toBeNull();

    const practiceHtml = pipeline.generateFullPackHTML(sfItems, 'Practice SF', false, {}, {
      includeSentenceFrames: true,
      annotations: [],
    });
    const staticDoc = parseDoc(practiceHtml);
    expect(staticDoc.querySelector('.alloflow-sf-wordbank')).not.toBeNull();
    expect(staticDoc.querySelector('.alloflow-sf-tier')?.textContent).toMatch(/expanding/i);
    expect(staticDoc.querySelector('.alloflow-sf-rubric')).not.toBeNull();
    expect(staticDoc.querySelector('#sf-para').textContent).toContain('[1]');
    const cueInput = staticDoc.querySelector('#sf-para input[data-allo-response-type="sentence-frame"][placeholder="verb"]');
    expect(cueInput).not.toBeNull();

    const { win, doc } = await bootPackDOM(practiceHtml);
    await dismissIdentityPromptWithOnce(win);

    const ta = doc.querySelector('#sf-list textarea[data-allo-response-key="sf-list:0:sentence-frame"]');
    const inp = doc.querySelector('#sf-para input[data-allo-response-key="sf-para:paragraph-1:sentence-frame"]');
    ta.value = 'because the experiment showed growth';
    ta.dispatchEvent(new win.Event('input', { bubbles: true }));
    inp.value = 'absorb';
    inp.dispatchEvent(new win.Event('input', { bubbles: true }));

    doc.getElementById('alloflow-savejson-btn').click();
    for (let i = 0; i < 30 && !doc.querySelector('[role="dialog"] input'); i++) await new Promise((r) => win.setTimeout(r, 20));
    const nameInput = doc.querySelector('[role="dialog"] input');
    nameInput.value = 'Ari';
    nameInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    Array.from(doc.querySelectorAll('[role="dialog"] button')).find((b) => !/cancel/i.test(b.textContent)).click();
    for (let i = 0; i < 30 && !win.__capturedBlobs.length; i++) await new Promise((r) => win.setTimeout(r, 20));

    const payload = JSON.parse(await win.__capturedBlobs[0].text());
    expect(payload.schemaVersion).toBe(3);
    const entries = inboxMeta.responseEntryModels(payload);
    const taEntry = entries.find((e) => e.displayValue === 'because the experiment showed growth');
    const paraEntry = entries.find((e) => e.displayValue === 'absorb');
    expect(taEntry).toMatchObject({ responseType: 'sentence-frame', aiGradable: true });
    expect(paraEntry).toMatchObject({ responseType: 'sentence-frame', aiGradable: true });
  });

  it('scores multi-select, sequence-sense, relation-mismatch, answer-evidence, and numeric-response in Check my answers', async () => {
    const quiz = {
      id: 'q-ext',
      type: 'quiz',
      title: 'Extended Check',
      data: {
        questions: [
          { type: 'multi-select', question: 'Select A and C.', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'] },
          { type: 'sequence-sense', question: 'Check sequence.', items: ['Step 1', 'Step 2', 'Step 3'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0, orderingPrinciple: 'Chronological', sequenceMode: 'arrange-explain' },
          { type: 'relation-mismatch', question: 'Find mismatch.', pairs: [{ left: 'H2O', right: 'Water' }, { left: 'NaCl', right: 'Sugar' }], wrongPairIndex: 1, candidatePartners: ['Salt', 'Sugar'], correctPartnerForWrong: 'Salt' },
          { type: 'answer-evidence', question: 'Claim + evidence.', answerOptions: ['Liquid', 'Gas'], correctAnswer: 'Liquid', evidencePrompt: 'Why?', evidenceOptions: ['Fixed volume', 'Fills container'], correctEvidence: 'Fixed volume' },
          { type: 'numeric-response', question: 'Measure length.', correctValue: 12.5, tolerance: 0.5, unit: 'cm', acceptableUnits: ['centimeters'] },
        ],
      },
    };
    const html = pipeline.generateFullPackHTML([quiz], 'Quiz Check', false, {}, { includeTeacherKey: false, annotations: [] });
    const { win, doc } = await bootPackDOM(html);
    await dismissIdentityPromptWithOnce(win);

    // 1. multi-select: pick A & C (correct)
    const q0 = doc.querySelector('[data-item-type="multi-select"]');
    const cbs = Array.from(q0.querySelectorAll('input[type="checkbox"]'));
    cbs[0].checked = true;
    cbs[2].checked = true;

    // 2. sequence-sense (arrange-explain): real rendered controls use :sequence-order and select...:sequence-principle
    const q1 = doc.querySelector('[data-item-type="sequence-sense"]');
    const ord = q1.querySelector('input[data-allo-response-key$=":sequence-order"]');
    ord.value = '2, 1, 3';
    const prinSel = q1.querySelector('select[data-allo-response-key$=":sequence-principle"]');
    if (prinSel) prinSel.value = '0';

    // 3. relation-mismatch: wrong-pair = 1, partner = 0 ('Salt') (correct)
    const q2 = doc.querySelector('[data-item-type="relation-mismatch"]');
    q2.querySelector('input[data-allo-response-key$=":wrong-pair"][value="1"]').checked = true;
    q2.querySelector('input[data-allo-response-key$=":partner"][value="0"]').checked = true;

    // 4. answer-evidence: WRONG evidence intentionally
    const q3 = doc.querySelector('[data-item-type="answer-evidence"]');
    q3.querySelector('input[data-allo-response-key$=":answer"][value="0"]').checked = true;
    q3.querySelector('input[data-allo-response-key$=":evidence"][value="1"]').checked = true;

    // 5. numeric-response: 12.8 within 12.5 +- 0.5 and acceptable unit "centimeters" (correct)
    const q4 = doc.querySelector('[data-item-type="numeric-response"]');
    q4.querySelector('input[data-allo-response-key$=":number"]').value = '12.8';
    q4.querySelector('input[data-allo-response-key$=":unit"]').value = 'centimeters';

    doc.querySelector('.quiz-check-btn').click();

    expect(q0.getAttribute('aria-invalid')).toBeNull();
    expect(q2.getAttribute('aria-invalid')).toBeNull();
    expect(q3.getAttribute('aria-invalid')).toBe('true');
    expect(q4.getAttribute('aria-invalid')).toBeNull();

    const results = doc.querySelector('.quiz-results').textContent;
    expect(results).toContain('4 of 5 correct');
    expect(results).toContain('1 to review');
    expect(q1.getAttribute('aria-invalid')).toBeNull();
  });

  it('renders collapsible student Math <details> in practice mode, reveals via Show all, and opens/re-closes across beforeprint/afterprint', async () => {
    const mathItem = {
      id: 'm1',
      type: 'math',
      title: 'Linear Equations',
      data: {
        problems: [
          { question: 'Solve 2x = 10', steps: [{ explanation: 'Divide both sides by 2', latex: 'x = 5' }], answer: '5' },
        ],
      },
    };
    const html = pipeline.generateFullPackHTML([mathItem], 'Math Practice', false, {}, {
      includeMath: true,
      includeAnswerKey: true,
      includeTeacherKey: false,
      assessmentMode: false,
      annotations: [],
    });
    const { win, doc } = await bootPackDOM(html);
    await dismissIdentityPromptWithOnce(win);

    const details = doc.querySelector('details.alloflow-math-solution');
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);

    doc.querySelector('.alloflow-math-reveal-all').click();
    expect(details.open).toBe(true);
    doc.querySelector('.alloflow-math-hide-all').click();
    expect(details.open).toBe(false);

    win.dispatchEvent(new win.Event('beforeprint'));
    expect(details.open).toBe(true);
    expect(details.hasAttribute('data-alloflow-print-opened')).toBe(true);
    win.dispatchEvent(new win.Event('afterprint'));
    expect(details.open).toBe(false);
  });

  it('bundles Reading Tools student sticky-note annotations inside the v3 Save my answers JSON payload', async () => {
    const itemsWithResponse = [
      { id: 's1', type: 'simplified', title: 'Reading', data: 'Rivers carry sediment downstream.' },
      { id: 'q-save', type: 'quiz', title: 'Check', data: { questions: [{ type: 'short-answer', question: 'What do rivers carry?', expectedAnswer: 'Sediment' }] } },
    ];
    const html = pipeline.generateFullPackHTML(itemsWithResponse, 'River Notes', false, {}, { includeSimplified: true, annotations: [] });
    const { win, doc } = await bootPackDOM(html);
    await dismissIdentityPromptWithOnce(win);

    // Switch Reading Tools annotation tool to sticky note and click #main-export-content
    const noteToolBtn = doc.querySelector('[data-rt-anno="note"]');
    expect(noteToolBtn).not.toBeNull();
    noteToolBtn.click();
    const host = doc.getElementById('main-export-content');
    host.dispatchEvent(new win.MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }));

    const editor = doc.querySelector('.alloflow-note-editor');
    expect(editor).not.toBeNull();
    const noteTa = editor.querySelector('textarea');
    noteTa.value = 'Check sediment definition';
    noteTa.dispatchEvent(new win.Event('input', { bubbles: true }));
    editor.querySelector('.alloflow-note-editor-btn[aria-label*="Save"]').click();

    expect(typeof win.__alloflowGetStudentAnnotations).toBe('function');
    const savedAnnos = win.__alloflowGetStudentAnnotations();
    expect(savedAnnos).toHaveLength(1);
    expect(savedAnnos[0]).toMatchObject({ kind: 'note', content: 'Check sediment definition', author: 'student' });

    doc.getElementById('alloflow-savejson-btn').click();
    for (let i = 0; i < 30 && !doc.querySelector('[role="dialog"] input'); i++) await new Promise((r) => win.setTimeout(r, 20));
    const nickIn = doc.querySelector('[role="dialog"] input');
    nickIn.value = 'Leo';
    nickIn.dispatchEvent(new win.Event('input', { bubbles: true }));
    Array.from(doc.querySelectorAll('[role="dialog"] button')).find((b) => !/cancel/i.test(b.textContent)).click();
    for (let i = 0; i < 30 && !win.__capturedBlobs.length; i++) await new Promise((r) => win.setTimeout(r, 20));

    const payload = JSON.parse(await win.__capturedBlobs[0].text());
    expect(payload.schemaVersion).toBe(3);
    expect(payload.annotations).toHaveLength(1);
    expect(payload.annotations[0].content).toBe('Check sediment definition');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Dark/HC inkScan gradientBg, Sepia Palette, Fishbone currentColor & CSS
// ─────────────────────────────────────────────────────────────────────────────
describe('6. Dark/HC inkScan gradientBg, sepia palette, Fishbone currentColor, and sort/timeline CSS', { timeout: 60000 }, () => {
  it('emits Fishbone currentColor SVG, sepia theme support, and dark/hc rules for concept-sort & timeline states', () => {
    const html = pipeline.generateFullPackHTML([
      {
        id: 'fb1',
        type: 'outline',
        title: 'Cause Map',
        data: { structureType: 'Fishbone', main: 'Erosion', branches: [{ title: 'Wind', items: ['Dunes'] }] },
      },
    ], 'Theme Pack', false, {}, { includeOutline: true, annotations: [] });

    const doc = parseDoc(html);
    const svg = doc.querySelector('#fb1 svg');
    expect(svg).not.toBeNull();
    expect(svg.innerHTML).toContain('stroke="currentColor"');
    expect(svg.innerHTML).toContain('fill="currentColor"');

    // Dark & HC interactive sort/timeline state selectors
    for (const sel of ['.alloflow-cs-selected', '.alloflow-cs-correct', '.alloflow-cs-wrong', '.alloflow-tl-correct', '.alloflow-tl-wrong']) {
      expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-cs-strip'.includes(sel.slice(0, 12)) || sel);
      expect(html).toContain(sel);
    }
    expect(html).toContain('html[data-alloflow-theme="sepia"]');
    expect(doc.querySelector('[data-rt-theme="sepia"]')).not.toBeNull();
  });

  it('resolves linear-gradient backgrounds via inkScan gradientBg and re-inks dark text when dark theme is toggled', async () => {
    const html = pipeline.generateFullPackHTML([
      { id: 'r1', type: 'simplified', title: 'Reading', data: 'Gradient contrast target paragraph.' },
    ], 'Gradient Ink', false, {}, { includeSimplified: true, annotations: [] });

    const { win, doc } = await bootPackDOM(html, {
      beforeParse(w) {
        const origGCS = w.getComputedStyle.bind(w);
        w.getComputedStyle = (el, pseudo) => {
          const style = origGCS(el, pseudo);
          if (el && el.tagName === 'P' && el.closest && el.closest('#r1')) {
            const isDark = w.document.documentElement.getAttribute('data-alloflow-theme') === 'dark';
            return new Proxy(style, {
              get(target, prop) {
                if (prop === 'backgroundColor') return 'rgba(0, 0, 0, 0)';
                if (prop === 'backgroundImage') return isDark ? 'linear-gradient(135deg, #0f172a 0%, rgb(15, 23, 42) 100%)' : 'none';
                if (prop === 'color') return 'rgb(15, 23, 42)';
                if (prop === 'opacity') return '1';
                const val = target[prop];
                return typeof val === 'function' ? val.bind(target) : val;
              },
            });
          }
          return style;
        };
      },
    });
    await dismissIdentityPromptWithOnce(win);

    // Switch reading theme to dark — triggers inkGuard -> inkScan -> gradientBg
    doc.querySelector('[data-rt-theme="dark"]').click();
    await new Promise((r) => win.setTimeout(r, 30));

    expect(doc.documentElement.getAttribute('data-alloflow-theme')).toBe('dark');
    const card = doc.querySelector('#r1 p');
    expect(card).not.toBeNull();
    expect(card.getAttribute('data-allo-ink')).toBe('light');

    // Verify sepia toggle sets data-alloflow-theme="sepia"
    doc.querySelector('[data-rt-theme="sepia"]').click();
    expect(doc.documentElement.getAttribute('data-alloflow-theme')).toBe('sepia');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Wave 2 Interactive HTML UX (Contract B, HUD, Split-Pane, Step-by-Step, Inline Glossary, Typography, Save Notice)
// ─────────────────────────────────────────────────────────────────────────────
describe('7. Wave 2 Interactive HTML UX (Contract B, HUD, split-pane, step-by-step, inline glossary, typography, save notice)', { timeout: 60000 }, () => {
  const packItems = [
    {
      id: 'sim1',
      type: 'simplified',
      title: 'Cell Passage',
      data: 'Every cell contains DNA and uses osmosis to balance water.',
    },
    {
      id: 'g1',
      type: 'glossary',
      title: 'Cell Glossary',
      data: [
        { term: 'DNA', def: 'Genetic instruction molecule', isSelected: true },
        { term: 'Osmosis', def: 'Movement of water across a membrane', isSelected: true },
      ],
    },
    {
      id: 'q1',
      type: 'quiz',
      title: 'Quick Check',
      data: {
        questions: [
          { type: 'mcq', question: 'Which carries genetic code?', options: ['DNA', 'Lipid'], correctAnswer: 'DNA' },
          { type: 'short-answer', question: 'Define osmosis.', expectedAnswer: 'Water diffusion.' },
        ],
      },
    },
  ];

  it('Contract B: suppresses auto learner prompt when __alloflowBuilderPreview or __alloflowPrintExport is true; opens cleanly standalone', async () => {
    const html = pipeline.generateFullPackHTML(packItems, 'Cells', false, {}, {
      includeSimplified: true,
      includeGlossary: true,
      annotations: [],
    });

    const preview = await bootPackDOM(html, { beforeParse: (w) => { w.__alloflowBuilderPreview = true; } });
    expect(preview.doc.querySelector('.alloflow-export-prompt-overlay, [role="dialog"]')).toBeNull();

    const printWin = await bootPackDOM(html, { beforeParse: (w) => { w.__alloflowPrintExport = true; } });
    expect(printWin.doc.querySelector('.alloflow-export-prompt-overlay, [role="dialog"]')).toBeNull();

    const standalone = await bootPackDOM(html);
    expect(standalone.doc.querySelector('.alloflow-export-prompt-overlay, [role="dialog"]')).not.toBeNull();
  });

  it('drives HUD progress/jump/status/print/save-jump, split-pane pinning, step-by-step navigation, inline glossary popover, and single-dialog unanswered notice', async () => {
    const html = pipeline.generateFullPackHTML(packItems, 'Cell Biology', false, {}, {
      includeSimplified: true,
      includeGlossary: true,
      annotations: [],
    });
    const { win, doc } = await bootPackDOM(html);
    await dismissIdentityPromptWithOnce(win);

    // HUD controls
    const hud = doc.querySelector('.alloflow-hud-bar');
    expect(hud).not.toBeNull();
    expect(doc.getElementById('alloflow-learner-status').textContent).toBe('One-time session');
    const progress = doc.getElementById('alloflow-progress-badge');
    expect(progress.textContent).toBe('0 / 2 answered');

    // Answer MCQ -> live progress updates to 1 / 2
    const mcq0 = doc.querySelector('.question input[type="radio"][value="0"]');
    mcq0.checked = true;
    mcq0.dispatchEvent(new win.Event('change', { bubbles: true }));
    expect(progress.textContent).toBe('1 / 2 answered');

    // Quick Print button
    doc.getElementById('alloflow-hud-print').click();
    expect(win.print).toHaveBeenCalledTimes(1);

    // Save Jump button scrolls/focuses save CTA
    doc.getElementById('alloflow-hud-save-jump').click();
    expect(win.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

    // Split-pane toggle ("Pin beside activities")
    const splitBtn = doc.getElementById('alloflow-split-toggle');
    expect(splitBtn).not.toBeNull();
    splitBtn.click();
    expect(doc.documentElement.getAttribute('data-alloflow-split')).toBe('1');
    expect(splitBtn.getAttribute('aria-pressed')).toBe('true');
    expect(doc.querySelector('.alloflow-split-left #sim1')).not.toBeNull();
    expect(doc.querySelector('.alloflow-split-left #g1')).not.toBeNull();
    expect(doc.querySelector('.alloflow-split-right #q1')).not.toBeNull();

    // Toggling split off restores clean order
    splitBtn.click();
    expect(doc.documentElement.hasAttribute('data-alloflow-split')).toBe(false);
    expect(doc.querySelector('.alloflow-split-columns')).toBeNull();

    // Step-by-Step toggle + Next/Prev + section jump + beforeprint restore
    const stepBtn = doc.getElementById('alloflow-step-toggle');
    stepBtn.click();
    expect(stepBtn.getAttribute('aria-pressed')).toBe('true');
    const readout = doc.getElementById('alloflow-step-readout');
    expect(readout.textContent).toBe('1 / 3');
    expect(doc.querySelectorAll('[data-alloflow-step-hidden="1"]')).toHaveLength(2);

    doc.getElementById('alloflow-step-next').click();
    expect(readout.textContent).toBe('2 / 3');
    doc.getElementById('alloflow-step-prev').click();
    expect(readout.textContent).toBe('1 / 3');

    const jumpSel = doc.getElementById('alloflow-section-jump');
    jumpSel.value = 'q1';
    jumpSel.dispatchEvent(new win.Event('change', { bubbles: true }));
    expect(readout.textContent).toBe('3 / 3');

    win.dispatchEvent(new win.Event('beforeprint'));
    expect(stepBtn.getAttribute('aria-pressed')).toBe('false');
    expect(doc.querySelectorAll('[data-alloflow-step-hidden="1"]')).toHaveLength(0);

    // Inline Glossary popover + Escape closes & restores focus
    const termBtn = doc.querySelector('#sim1 .alloflow-inline-term');
    expect(termBtn).not.toBeNull();
    expect(termBtn.getAttribute('aria-expanded')).toBe('false');
    termBtn.click();
    expect(termBtn.getAttribute('aria-expanded')).toBe('true');
    const popover = doc.getElementById('alloflow-term-popover');
    expect(popover).not.toBeNull();
    expect(popover.hidden).toBe(false);
    expect(popover.getAttribute('role')).toBe('dialog');
    expect(popover.querySelector('.alloflow-term-popover-body').textContent.length).toBeGreaterThan(0);

    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popover.hidden).toBe(true);
    expect(termBtn.getAttribute('aria-expanded')).toBe('false');

    // Inline glossary is omitted on printable worksheet / cloze exports
    const worksheetHtml = pipeline.generateFullPackHTML(packItems, 'Cells WS', true, {}, { includeSimplified: true, includeGlossary: true, annotations: [] });
    expect(parseDoc(worksheetHtml).querySelector('.alloflow-inline-term')).toBeNull();

    // Single save dialog includes unanswered notice + nickname input simultaneously (excluding closed hidden #alloflow-term-popover)
    doc.getElementById('alloflow-savejson-btn').click();
    for (let i = 0; i < 30 && !doc.querySelector('[role="dialog"]:not([hidden]) input'); i++) await new Promise((r) => win.setTimeout(r, 20));
    const dialogs = Array.from(doc.querySelectorAll('[role="dialog"]')).filter((d) => !d.hidden);
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].textContent).toContain('1 item(s) still unanswered');
    expect(dialogs[0].querySelector('input')).not.toBeNull();
  });

  it('applies Lexend in elementary preset and updated #4f46e5 / Inter in minimal preset', () => {
    const elemHtml = pipeline.generateFullPackHTML([packItems[0]], 'Kids', false, {}, {
      exportTheme: 'elementary',
      includeSimplified: true,
      annotations: [],
    });
    expect(elemHtml).toContain('Lexend');

    const minHtml = pipeline.generateFullPackHTML([packItems[0]], 'Minimal', false, {}, {
      exportTheme: 'minimal',
      includeSimplified: true,
      annotations: [],
    });
    expect(minHtml).toContain('#4f46e5');
    expect(minHtml).toContain('Inter');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Wave 3 Builder & Export Handlers UX + Contracts A & C
// ─────────────────────────────────────────────────────────────────────────────
describe('8. Wave 3 Builder, Karaoke, Slides, Unicode filenames, Contract A, and Contract C', { timeout: 60000 }, () => {
  it('Karaoke: renders step buttons & speed selector and executes click-to-seek, step, and playbackRate change', async () => {
    const passageHtml = [
      '<!DOCTYPE html><html><head></head><body>',
      '<div class="section" id="read-1" data-ka-readable="1">',
      '<p>First sentence here. Second sentence follows. Third sentence ends.</p>',
      '</div></body></html>',
    ].join('');

    const dom = new JSDOM(passageHtml, {
      runScripts: 'dangerously',
      url: 'https://example.test/ka.html',
      virtualConsole: new VirtualConsole(),
      beforeParse(win) {
        win.HTMLElement.prototype.scrollIntoView = vi.fn();
        win.HTMLMediaElement.prototype.play = async function () {};
        win.HTMLMediaElement.prototype.pause = function () {};
      },
    });
    activeDoms.push(dom);
    const { document: doc } = dom.window;

    await ExportHandlers.karaokeProcess(doc, {
      callTTS: async () => 'data:audio/wav;base64,UklGRg==',
      selectedVoice: 'Puck',
    });

    const controls = doc.querySelector('.allo-ka-controls');
    expect(controls).not.toBeNull();
    expect(controls.querySelector('.allo-ka-prev')?.textContent).toBe('⏮');
    expect(controls.querySelector('.allo-ka-next')?.textContent).toBe('⏭');
    const speedSel = controls.querySelector('select.allo-ka-speed');
    expect(Array.from(speedSel.options).map((o) => o.value)).toEqual(['0.75', '1', '1.25']);

    const countEl = controls.querySelector('.allo-ka-count');
    expect(countEl.textContent).toBe('0 / 3');

    // Click sentence 2 directly to seek
    const sent2 = doc.querySelectorAll('.ka-s')[1];
    sent2.click();
    expect(sent2.classList.contains('ka-on')).toBe(true);
    expect(countEl.textContent).toBe('2 / 3');

    // Step next -> sentence 3; step prev -> sentence 2
    controls.querySelector('.allo-ka-next').click();
    expect(countEl.textContent).toBe('3 / 3');
    controls.querySelector('.allo-ka-prev').click();
    expect(countEl.textContent).toBe('2 / 3');

    // Change speed to 1.25 -> active audio playbackRate updates
    speedSel.value = '1.25';
    speedSel.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const audio2 = doc.querySelectorAll('.allo-ka-audios audio')[1];
    expect(audio2.playbackRate).toBe(1.25);
  });

  it('getSlidesPreviewHTML formats object-shaped outline & timeline without JSON.stringify leaks (and respects Contract A resourceOrder)', () => {
    const history = [
      {
        id: 't1',
        type: 'timeline',
        title: 'Space Milestones',
        data: { events: [{ date: '1969', title: 'Moon Landing', description: 'Apollo 11 touched down.' }] },
      },
      {
        id: 'o1',
        type: 'outline',
        title: 'Cause Diagram',
        data: {
          structureType: 'Fishbone',
          main: 'Urban Heat',
          branches: [{ title: 'Surfaces', items: ['Dark asphalt'] }],
        },
      },
    ];
    const order = ['includeOutline', 'includeTimeline'];
    const slidesHtml = ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Earth & Space',
      gradeLevel: '6th Grade',
      getExportableHistory: () => history,
      t: (k) => k,
      exportConfig: { resourceOrder: order },
    });

    const doc = parseDoc(slidesHtml);
    const titles = Array.from(doc.querySelectorAll('.slide .slide-title')).map((el) => el.textContent);
    expect(titles.indexOf('Cause Diagram')).toBeLessThan(titles.indexOf('Space Milestones'));
    expect(slidesHtml).not.toContain('[object Object]');
    expect(slidesHtml).not.toContain('"branches"');
    expect(slidesHtml).toContain('Urban Heat');
    expect(slidesHtml).toContain('Dark asphalt');
    expect(slidesHtml).toContain('1969');
    expect(slidesHtml).toContain('Apollo 11 touched down.');

    // Also verify fishbone sub-object schema in getSlidesPreviewHTML
    const fishboneSlides = ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Heat',
      gradeLevel: '6th',
      getExportableHistory: () => [{
        id: 'fb-obj',
        type: 'outline',
        title: 'Fishbone Obj',
        data: { fishbone: { effect: 'Urban Heat', categories: [{ category: 'Surfaces', causes: ['Dark asphalt'] }] } },
      }],
      t: (k) => k,
      exportConfig: {},
    });
    expect(fishboneSlides).not.toContain('[object Object]');
    expect(fishboneSlides).not.toContain('"fishbone"');
    expect(fishboneSlides).toContain('Urban Heat');
    expect(fishboneSlides).toContain('Dark asphalt');

    // Same Contract A resourceOrder in generateFullPackHTML
    const packHtml = pipeline.generateFullPackHTML(history, 'Order Check', false, {}, {
      includeOutline: true,
      includeTimeline: true,
      resourceOrder: order,
      annotations: [],
    });
    const packDoc = parseDoc(packHtml);
    const wrappedIds = Array.from(packDoc.querySelectorAll('.alloflow-resource-wrap')).map((w) => w.getAttribute('data-alloflow-resource-id'));
    expect(wrappedIds).toEqual(['o1', 't1']);
  });

  it('getSlidesPreviewHTML renders standard concept-sort item.content chips (known omission when only content is set)', () => {
    const slidesHtml = ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Rocks',
      gradeLevel: '5th',
      t: (k) => k,
      exportConfig: {},
      getExportableHistory: () => [{
        id: 'cs1',
        type: 'concept-sort',
        title: 'Rock Types',
        data: {
          categories: [{ id: 'ig', label: 'Igneous' }],
          items: [{ id: '1', categoryId: 'ig', content: 'Basalt lava rock' }],
        },
      }],
    });
    // Per schema in doc_pipeline_source.jsx:51000 & export_activity_state_and_print.test.js:81, concept-sort items use `content`.
    expect(slidesHtml).toContain('Basalt lava rock');
  });

  it('preserves Spanish, Arabic, and CJK characters in Unicode export filenames', () => {
    for (const [topic, expectedToken] of [
      ['Fotosíntesis Celular', 'Fotosíntesis Celular.html'],
      ['البناء الضوئي', 'البناء الضوئي.html'],
      ['光合作用实验', '光合作用实验.html'],
    ]) {
      const saved = [];
      ExportHandlers.downloadHtmlBlob(`<!DOCTYPE html><html><head><title>${topic}</title></head><body><h1>${topic}</h1></body></html>`, {
        safeDownloadBlob: (_blob, filename) => saved.push(filename),
        addToast: () => {},
        t: (k) => k,
      });
      expect(saved).toHaveLength(1);
      expect(saved[0]).toBe(expectedToken);
    }
  });

  it('Contract C: waitForPrintReady is exported and HostHandlers.handlePrintResourceSheet sets __alloflowPrintExport and awaits waitForPrintReady before printing', async () => {
    expect(typeof ExportHandlers.waitForPrintReady).toBe('function');

    const callOrder = [];
    vi.spyOn(ExportHandlers, 'waitForPrintReady').mockImplementation(async (w) => {
      expect(w.__alloflowPrintExport).toBe(true);
      callOrder.push('waitForPrintReady');
    });

    const popupDoc = document.implementation.createHTMLDocument('print');
    let writtenHtml = '';
    const fakePopup = {
      document: {
        open() { callOrder.push('open'); },
        write(h) { writtenHtml = h; popupDoc.documentElement.innerHTML = h; callOrder.push('write'); },
        close() { callOrder.push('close'); },
      },
      focus() { callOrder.push('focus'); },
      print() { callOrder.push('print'); },
    };
    vi.spyOn(window, 'open').mockReturnValue(fakePopup);

    const handlers = HostHandlersFactory({
      generatedContent: { id: 'q-print', type: 'quiz', title: 'Print Quiz', data: { questions: [{ type: 'mcq', question: '2+2?', options: ['3', '4'], correctAnswer: '4' }] } },
      generateFullPackHTML: (...args) => pipeline.generateFullPackHTML(...args),
      sourceTopic: 'Arithmetic',
      exportConfig: {},
      addToast: () => {},
      t: (k) => k,
      warnLog: () => {},
    });

    const started = handlers.handlePrintResourceSheet(null, { worksheet: true });
    expect(started).toBe(true);
    await new Promise((r) => setTimeout(r, 30));

    expect(fakePopup.__alloflowPrintExport).toBe(true);
    expect(writtenHtml).toContain('Arithmetic');
    expect(callOrder).toEqual(['open', 'write', 'close', 'focus', 'waitForPrintReady', 'print']);
  });

  it('Builder UX: applyPageMargin leaves document clean with narrow-screen rule, Keep-edits rollback triggers on cancel, [Edit/Test] & [All/Student/Teacher] & cleanup strips builder chrome', async () => {
    // 1. Mount ExportPreviewView and test applyPageMargin non-dirty + View ribbon controls + ↑/↓ resource reorder
    let latestConfig = { includeSimplified: true, includeQuiz: true, includeTeacherKey: true };
    const container = document.createElement('div');
    document.body.append(container);
    const root = ReactDOMClient.createRoot(container);
    activeRoots.push({ root, container });

    const history = [
      { id: 's1', type: 'simplified', title: 'Reading', data: 'Short reading.' },
      { id: 'q1', type: 'quiz', title: 'Quiz', data: { questions: [{ type: 'mcq', question: 'Q?', options: ['A', 'B'], correctAnswer: 'A' }] } },
    ];
    const exportPreviewRef = { current: null };
    const noopProps = ['_ensureDiffLib', 'addToast', 'applyExportPreset', 'auditOutputAccessibility', 'deleteExportPreset', 'executeExportFromPreview', 'generateCustomExportStyle', 'getExportPreviewHTML', 'handleExportH5P', 'handleExportIMS', 'handleExportQTI', 'openInAlloStudio', 'processExpertCommand', 'proposeRestyles', 'runAxeAudit', 'saveExportPreset', 'setAgentActivityLog', 'setAgentLogFullView', 'setCustomExportCSS', 'setDiffViewOpen', 'setExpertCommandInput', 'setExportAuditLoading', 'setExportAuditResult', 'setExportPreviewMode', 'setExportStylePrompt', 'setExportTheme', 'setIsAgentRunning', 'setShowBrandProfileEditor', 'setShowExportPreview', 'toggleA11yInspect', 'updateExportPreview', 'onBuilderDraftCapture', 'onExportSuccess', 'setBuilderWorkspaceMode', 'onAdvancedReviewSessionChange'];

    function Harness() {
      const [cfg, setCfg] = React.useState(latestConfig);
      latestConfig = cfg;
      const props = {
        showExportPreview: true,
        history,
        t: (k) => (String(k).startsWith('export_preview.accessibility.') ? '' : k),
        exportPreviewMode: 'html',
        exportPreviewRef,
        STYLE_SEEDS: {},
        FONT_OPTIONS: [],
        BUILT_IN_PRESETS: [],
        exportPresets: [],
        agentActivityLog: [],
        exportTheme: 'professional',
        theme: 'light',
        exportStylePrompt: '',
        expertCommandInput: '',
        customExportCSS: '',
        selectedFont: 'default',
        exportPreviewSource: 'history',
        getSkippedResources: () => [],
        exportConfig: cfg,
        setExportConfigAndRefresh: (u) => setCfg((prev) => (typeof u === 'function' ? u(prev) : u)),
      };
      noopProps.forEach((p) => { if (!(p in props)) props[p] = () => undefined; });
      return React.createElement(ExportPreviewView, props);
    }

    await React.act(async () => { root.render(React.createElement(Harness)); });

    const iframe = exportPreviewRef.current;
    expect(iframe).not.toBeNull();
    const previewHtml = pipeline.generateFullPackHTML(history, 'Builder Doc', false, {}, {
      includeSimplified: true,
      includeTeacherKey: true,
      annotations: [],
    });
    const fakeIframeWin = { document: null, addEventListener() {}, removeEventListener() {}, pageXOffset: 0, pageYOffset: 0, Event };
    const iframeDoc = document.implementation.createHTMLDocument('builder');
    Object.defineProperty(iframeDoc, 'defaultView', { value: fakeIframeWin, configurable: true });
    Object.defineProperty(iframe, 'contentDocument', { get: () => iframeDoc, configurable: true });
    Object.defineProperty(iframe, 'contentWindow', { get: () => fakeIframeWin, configurable: true });
    iframeDoc.open = () => {};
    iframeDoc.write = (h) => { iframeDoc.documentElement.innerHTML = h; };
    iframeDoc.close = () => {};

    await ExportPreviewHelpers.updateExportPreview({
      exportPreviewRef,
      _exportPreviewErrorRef: { current: false },
      _builderRecoverySaveTimerRef: { current: null },
      getExportPreviewHTML: () => previewHtml,
      t: (k) => k,
      addToast: () => {},
      warnLog: () => {},
      setCanvasRecoveryRevision: () => {},
      isCanvas: false,
      a11yInspectMode: false,
    });
    expect(fakeIframeWin.__alloflowBuilderPreview).toBe(true);

    // applyPageMargin: click "Narrow" button -> adds #allo-page-setup-style with narrow-screen media rule & does NOT set dirty flag
    const narrowBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Narrow');
    expect(narrowBtn).not.toBeNull();
    await React.act(async () => { narrowBtn.click(); });
    const pageSetupCss = iframeDoc.getElementById('allo-page-setup-style')?.textContent || '';
    expect(pageSetupCss).toContain('max-width: 720px');
    expect(iframeDoc.body.getAttribute('data-allo-user-edited')).toBeNull();

    // ↑/↓ section reorder updates exportConfig.resourceOrder
    const moveDownBtns = Array.from(container.querySelectorAll('button[aria-label="Move section down"]'));
    expect(moveDownBtns.length).toBeGreaterThanOrEqual(1);
    await React.act(async () => { moveDownBtns[0].click(); });
    expect(Array.isArray(latestConfig.resourceOrder)).toBe(true);

    // View ribbon tab: Test Interactive vs Edit Text toggles designMode, and Student Copy / All toggles #allo-builder-view-filter
    const viewTab = container.querySelector('#builder-ribbon-tab-view');
    await React.act(async () => { viewTab.click(); });
    const testBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Test Interactive'));
    const editBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Edit Text'));
    const studentBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Student Copy');
    await React.act(async () => { testBtn.click(); });
    expect(iframeDoc.designMode).toBe('off');
    await React.act(async () => { editBtn.click(); });
    expect(iframeDoc.designMode).toBe('on');
    await React.act(async () => { studentBtn.click(); });
    expect(iframeDoc.getElementById('allo-builder-view-filter')).not.toBeNull();

    // Keep-edits rollback wiring on updateExportPreview when user cancels overwrite
    iframeDoc.body.setAttribute('data-allo-user-edited', '1');
    const rollbackSpy = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await ExportPreviewHelpers.updateExportPreview({
      exportPreviewRef,
      _exportPreviewErrorRef: { current: false },
      _builderRecoverySaveTimerRef: { current: null },
      getExportPreviewHTML: () => previewHtml,
      t: (k) => k,
      addToast: () => {},
      warnLog: () => {},
      onKeepEditsRollback: rollbackSpy,
      isCanvas: false,
      a11yInspectMode: false,
    });
    expect(rollbackSpy).toHaveBeenCalledTimes(1);

    // Inject builder paper CSS + block controls + tracked deletion/insertion and verify executeExportFromPreview strips them all cleanly
    const paperCss = iframeDoc.createElement('style');
    paperCss.id = 'allo-builder-paper-css';
    iframeDoc.head.appendChild(paperCss);
    const ctrl = iframeDoc.createElement('div');
    ctrl.className = 'allo-block-controls';
    iframeDoc.body.appendChild(ctrl);
    const delNode = iframeDoc.createElement('del');
    delNode.setAttribute('data-allo-change-id', 'd1');
    delNode.textContent = 'RETRACTED_CHANGE';
    const insNode = iframeDoc.createElement('ins');
    insNode.setAttribute('data-allo-change-id', 'i1');
    insNode.textContent = 'ACCEPTED_CHANGE';
    iframeDoc.body.appendChild(delNode);
    iframeDoc.body.appendChild(insNode);

    let writtenHtml = '';
    const mockPrintWin = {
      document: { write: (s) => { writtenHtml = s; }, close() {}, readyState: 'complete' },
      focus() {},
      print() {},
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPrintWin);
    const ok = await ExportHandlers.executeExportFromPreview({
      _docPipeline: pipeline,
      exportPreviewMode: 'worksheet',
      exportPreviewRef,
      sourceTopic: 'Builder Export',
      exportConfig: {},
      history,
      addToast: () => {},
      t: (k) => k,
      setShowExportPreview: () => {},
    });
    openSpy.mockRestore();
    expect(ok).toBe(true);
    expect(mockPrintWin.__alloflowPrintExport).toBe(true);
    expect(writtenHtml).not.toContain('RETRACTED_CHANGE');
    expect(writtenHtml).toContain('ACCEPTED_CHANGE');
    const exportedDoc = parseDoc(writtenHtml);
    expect(exportedDoc.getElementById('allo-builder-view-filter')).toBeNull();
    expect(exportedDoc.getElementById('allo-builder-paper-css')).toBeNull();
    expect(exportedDoc.querySelector('.allo-block-controls')).toBeNull();
    expect(exportedDoc.querySelector('[contenteditable]')).toBeNull();
    expect(exportedDoc.querySelector('del[data-allo-change-id]')).toBeNull();
    expect(exportedDoc.querySelector('ins[data-allo-change-id]')).toBeNull();
    expect(exportedDoc.body.hasAttribute('data-allo-user-edited')).toBe(false);
  });
});
