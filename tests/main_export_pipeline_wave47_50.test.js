// Verification suite for Waves 47-50:
// - Wave 47: Slides options.assessmentMode propagation, liveSlideHtml teacher-note strip,
//            QTI caseSensitive / q.answer / numericSettings support, H5P fill-blank & numeric policy fidelity
// - Wave 48: Builder H5P preflight glossary/deselected/numericSettings parity,
//            Google Forms relation-mismatch shuffling & open-ended short-answer grading
// - Wave 49: Builder plain-text/Braille math/svg/sub/sup linearization, Markdown sup/sub/svg/dl,
//            and expanded student-package teacher-section stripping
// - Wave 50: Word Sounds & Student Analytics CSV formula-injection hardening & 4-mirror SHA-256 parity

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let builderHelpers;
let preflight;
let driveDelivery;
let wsResultsCsv;
let wsResultsCsvCell;
let acCsvHelpers;

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function setupExporter(liveOverrides = {}) {
  const captured = { blobs: [], zips: [], toasts: [], downloads: [], slides: [], writtenFiles: [] };
  class MockJSZip {
    constructor() {
      this.files = {};
      captured.zips.push(this);
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
  vi.stubGlobal('JSZip', MockJSZip);
  window.JSZip = MockJSZip;
  window.PptxGenJS = class MockPptxGenJS {
    constructor() {
      this.layout = 'LAYOUT_16x9';
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
      captured.slides.push(s);
      return s;
    }
    writeFile({ fileName }) {
      captured.downloads.push(fileName);
      captured.writtenFiles.push(fileName);
      return Promise.resolve(fileName);
    }
  };
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    captured.blobs.push(blob);
    return `blob:mock-${captured.blobs.length}`;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function onClick() {
    captured.downloads.push(this.download || '');
  });

  const defaultLive = {
    history: [],
    generatedContent: null,
    sourceTopic: 'Cellular Energy',
    gradeLevel: 'Grade 7',
    language: 'English',
    leveledTextLanguage: 'English',
    outputLanguage: 'English',
    currentUiLanguage: 'English',
    studentResponses: {},
    exportConfig: { audience: 'teacher', includeTeacherKey: true },
    addToast: (msg, kind) => captured.toasts.push({ msg, kind }),
    t: (_k, fb) => (typeof fb === 'string' ? fb : _k),
    getDefaultTitle: (tp) => String(tp || 'Resource'),
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
      return () => `uuid-00000000-${++seq}`;
    })(),
  });
  return { exporter, captured };
}

beforeAll(() => {
  globalThis.React = window.React = require(resolve(mdDir, 'react'));
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_export_preview_module.js');

  const epSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  preflight = new Function(
    epSrc.slice(epSrc.indexOf('function _builderH5PCompatibility'), epSrc.indexOf('function _builderEditorPageCss')) +
    '\nreturn _builderH5PCompatibility;'
  )();
  builderHelpers = new Function(
    epSrc.slice(epSrc.indexOf('const _BUILDER_STYLE_GALLERY'), epSrc.indexOf('function ExportPreviewView')) +
    '\nreturn { clean: _builderCleanMarkdownRoot, markdown: _builderMarkdownFromRoot, polish: _builderPolishPlainTextClone, removeTeacher: _removeStudentPackageTeacherSections };'
  )();
  driveDelivery = new Function(
    epSrc.slice(epSrc.indexOf('// __ALLO_DRIVE_DELIVERY_BEGIN__'), epSrc.indexOf('// __ALLO_DRIVE_DELIVERY_END__')) +
    '\nreturn { quizToFormItems: _alloQuizToFormItems, formQuizzesFromHistory: _alloFormQuizzesFromHistory };'
  )();

  const wsSrc = readFileSync(resolve(ROOT, 'word_sounds_module.js'), 'utf8');
  const wsSlice = wsSrc.slice(wsSrc.indexOf('// BEGIN WORD SOUNDS RESULTS CSV'), wsSrc.indexOf('// END WORD SOUNDS RESULTS CSV'));
  ({ wsResultsCsv, wsResultsCsvCell } = new Function(wsSlice + '\nreturn { wsResultsCsv, wsResultsCsvCell };')());

  const acSrc = readFileSync(resolve(ROOT, 'student_analytics_module.js'), 'utf8');
  const csvFn = acSrc.slice(acSrc.indexOf('  function _acCsvCell(value) {'), acSrc.indexOf('  function _acDownloadCsv(rows, filename) {'));
  const unguardFn = acSrc.slice(acSrc.indexOf('  function _acThUnguard(cell) {'), acSrc.indexOf('  function _acThYes(value) {'));
  acCsvHelpers = new Function(csvFn + '\n' + unguardFn + '\nreturn { cell: _acCsvCell, unguard: _acThUnguard };')();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.AlloModules?.AccessibleOfficeExport;
  delete window.PptxGenJS;
  delete window.JSZip;
});

describe('Wave 47 — Slides assessmentMode propagation and QTI/H5P policy fidelity', () => {
  it('propagates options.assessmentMode across Venn slides, resource summarizer, and liveHtml teacher sanitization', async () => {
    const summarizeSpy = vi.fn(() => ['Prompt-safe summary only']);
    const origSummarize = window.AlloModules.ExportHandlers.summarizeResourceText;
    const origSanitize = window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml;
    window.AlloModules.ExportHandlers.summarizeResourceText = summarizeSpy;
    const sanitizeSpy = vi.fn((html) => html.replace(/REMOVE_BY_SANITIZER/g, ''));
    window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml = sanitizeSpy;

    try {
      const { exporter, captured } = setupExporter({
        exportConfig: { audience: 'teacher', includeTeacherKey: true }, // deliberately NOT assessmentMode
      });

      const ok = await exporter.handleExportSlides({
        assessmentMode: true,
        history: [
          {
            id: 'venn-1',
            type: 'outline',
            title: 'Mitosis vs Meiosis',
            data: {
              structureType: 'Venn Diagram',
              main: 'Mitosis vs Meiosis',
              branches: [
                { title: 'Mitosis', items: ['Two identical cells', 'Somatic cells'] },
                { title: 'Both', items: ['DNA replication'] },
                { title: 'Meiosis', items: ['Four gametes'] },
              ],
            },
          },
          {
            id: 'custom-1',
            type: 'study-guide',
            title: 'Cell Division Guide',
            data: { summary: 'Review notes', teacherNotes: 'Secret teacher cue' },
          },
        ],
      });
      expect(ok).toBe(true);
      const vennSlide = captured.slides.find((s) => s.notes.some((n) => n.includes('Mitosis vs Meiosis')));
      expect(vennSlide).toBeDefined();
      expect(vennSlide.notes.join(' ')).toContain('Sorting zones: Mitosis, Both, Meiosis | Items to sort:');
      expect(vennSlide.texts.map((t) => t.raw)).toEqual(expect.arrayContaining(['Four gametes', 'DNA replication', 'Somatic cells', 'Two identical cells']));
      expect(summarizeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'custom-1' }),
        expect.objectContaining({ hideAnswers: true, assessmentMode: true })
      );

      let builtHtml = '';
      window.AlloModules.AccessibleOfficeExport = {
        build: vi.fn(async ({ html }) => {
          builtHtml = html;
          return { blob: new Blob([html]), fileName: 'live-slides.pptx' };
        }),
      };
      const liveOk = await exporter.handleExportSlides({
        assessmentMode: true,
        liveTitle: 'Live Assessment',
        liveHtml: '<h1>Quiz</h1><div class="alloflow-teacher-notes">TEACHER_SECRET_NOTE</div><div data-answer-key="1">HIDDEN_KEY</div><p>REMOVE_BY_SANITIZER</p>',
      });
      expect(liveOk).toBe(true);
      expect(sanitizeSpy).toHaveBeenCalled();
      expect(builtHtml).not.toContain('TEACHER_SECRET_NOTE');
      expect(builtHtml).not.toContain('HIDDEN_KEY');
      expect(builtHtml).not.toContain('REMOVE_BY_SANITIZER');
    } finally {
      window.AlloModules.ExportHandlers.summarizeResourceText = origSummarize;
      window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml = origSanitize;
    }
  });

  it('honors QTI caseSensitive, q.answer fallback, and numericSettings tolerance/units', async () => {
    const { exporter, captured } = setupExporter();
    const ok = await exporter.handleExportQTI({
      generatedContent: {
        type: 'quiz',
        title: 'Bio & Physics Check',
        data: {
          questions: [
            { type: 'fill-blank', question: 'Process name: ___.', answer: 'Photosynthesis', caseSensitive: true },
            {
              type: 'numeric-response',
              question: 'Gravity on Earth?',
              correctValue: 9.8,
              unit: 'm/s2',
              numericSettings: { tolerance: 0.2, acceptableUnits: ['m/s^2'] },
            },
          ],
        },
      },
    });
    expect(ok).toBe(true);
    const xml = captured.zips[0].files['assessment.xml'];
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(xml).toContain('case="Yes">Photosynthesis</varequal>');
    expect(xml).toMatch(/<vargte respident="NUM_1">9\.6\d*<\/vargte>/);
    expect(xml).toContain('<varlte respident="NUM_1">10</varlte>');
    expect(xml).toContain('>m/s^2</varequal>');
  });

  it('honors H5P fill-blank q.answer/caseSensitive/reasoning and numeric-response optional units + numericSettings', async () => {
    const { exporter, captured } = setupExporter();
    const ok = await exporter.handleExportH5P({
      generatedContent: {
        type: 'quiz',
        title: 'Policy Check',
        data: {
          questions: [
            {
              type: 'fill-blank',
              question: 'Cell division in somatic cells is ___.',
              answer: 'Mitosis',
              caseSensitive: true,
              requireReasoning: true,
              explanationPrompt: 'Justify your stage choice.',
            },
            {
              type: 'numeric-response',
              question: 'Measure the vertical displacement:',
              correctValue: 9.8,
              unit: 'm',
              acceptableUnits: ['meters'],
            },
            {
              type: 'numeric-response',
              question: 'Force magnitude:',
              correctValue: 10,
              numericSettings: { acceptableUnits: ['N'], requireUnit: true },
            },
            {
              type: 'numeric-response',
              question: 'Estimated density:',
              correctValue: 2.5,
              unit: 'g/cm3',
              numericSettings: { tolerance: 0.5 },
            },
          ],
        },
      },
    });
    expect(ok).toBe(true);
    const content = JSON.parse(captured.zips[0].files['content/content.json']);
    // fill-blank produces Blanks + companion Essay; then 3 numeric items -> 5 H5P entries
    expect(content.questions).toHaveLength(5);
    expect(content.questions[0].library).toBe('H5P.Blanks 1.14');
    expect(content.questions[0].params.behaviour.caseSensitive).toBe(true);
    expect(content.questions[0].params.questions[0]).toContain('*Mitosis*');
    expect(content.questions[1].library).toBe('H5P.Essay 1.5');
    expect(content.questions[1].params.taskDescription).toContain('Justify your stage choice.');
    expect(content.questions[2].library).toBe('H5P.Blanks 1.14');
    expect(content.questions[2].params.questions[0]).toContain('*9.8/9.8 m/9.8 meters*');
    expect(content.questions[3].library).toBe('H5P.Blanks 1.14');
    expect(content.questions[3].params.questions[0]).toContain('*10 N*');
    expect(content.questions[3].params.questions[0]).not.toContain('*10/*');
    expect(content.questions[4].library).toBe('H5P.Essay 1.5');
    expect(content.questions[4].params.solution.sample).toContain('±0.5');
    expect(captured.toasts.some((toast) => toast.kind === 'warning' && toast.msg.includes('2 ') && toast.msg.includes('manual review'))).toBe(true);
  });
});

describe('Wave 48 — Builder H5P preflight parity and Google Forms quiz conversion', () => {
  it('supports terms/entries/words glossary containers, excludes deselected entries, and checks numericSettings.tolerance', () => {
    for (const key of ['terms', 'entries', 'words']) {
      const res = preflight({
        type: 'glossary',
        data: {
          [key]: [
            { term: 'Osmosis', definition: 'Water diffusion' },
            { term: 'Diffusion', definition: 'Passive movement', isSelected: false },
          ],
        },
      });
      expect(res).toMatchObject({
        type: 'glossary',
        library: 'Dialog Cards 1.9',
        total: 1,
        valid: 1,
        ready: true,
      });
    }

    const clozeRes = preflight({
      type: 'simplified',
      data: 'Osmosis moves water through a membrane in cells.',
    }, [
      {
        type: 'glossary',
        data: {
          terms: [
            { term: 'Osmosis', definition: 'Water diffusion', isSelected: true },
            { term: 'membrane', definition: 'Cell boundary', selected: false },
          ],
        },
      },
    ]);
    expect(clozeRes).toMatchObject({ type: 'simplified', total: 1, valid: 1, ready: true });

    const numRes = preflight({
      type: 'quiz',
      data: {
        questions: [
          { type: 'numeric-response', question: 'Measure mass', correctValue: 5.2, numericSettings: { tolerance: 0.2 } },
        ],
      },
    });
    expect(numRes).toMatchObject({ valid: 1, adapted: 1, manualReview: 1, ready: true });
  });

  it('shuffles relation-mismatch repair candidates in student forms and avoids exact-matching open-ended sampleAnswer prose', () => {
    const quizData = {
      id: 'bio-quiz-48',
      title: 'Cell Assessment',
      questions: [
        {
          type: 'relation-mismatch',
          question: 'Identify the mismatch',
          pairs: [{ left: 'Root', right: 'Sunlight' }, { left: 'Leaf', right: 'Sunlight' }],
          wrongPairIndex: 0,
          candidatePartners: ['Water', 'Nitrogen', 'Carbon', 'Oxygen'],
          correctPartnerForWrong: 'Water',
        },
        {
          type: 'short-answer',
          question: 'Explain why transpiration drops when stomata close.',
          sampleAnswer: 'Closing stomata reduces water vapor diffusion out of the leaf.',
        },
        {
          type: 'short-answer',
          question: 'Name the organelle where photosynthesis occurs.',
          correctAnswer: 'Chloroplast',
        },
      ],
    };

    const studentItems = driveDelivery.quizToFormItems(quizData, {
      includeTeacherKey: false,
      assessmentMode: true,
      shuffleChoices: true,
    });
    const repairItem = studentItems[1];
    expect(repairItem.type).toBe('mc');
    expect(repairItem.options).not.toEqual(['Water', 'Nitrogen', 'Carbon', 'Oxygen']);
    expect(repairItem.options[repairItem.answer[0]]).toBe('Water');

    const openShortStudent = studentItems[2];
    expect(openShortStudent.type).toBe('paragraph');
    expect(openShortStudent.points).toBe(0);
    expect(openShortStudent.answer).toBeUndefined();
    expect(openShortStudent.help || '').not.toContain('Closing stomata');

    const keyCheckedItems = driveDelivery.quizToFormItems(quizData, {
      includeTeacherKey: true,
      assessmentMode: false,
      shuffleChoices: false,
    });
    expect(keyCheckedItems[2].type).toBe('paragraph');
    expect(keyCheckedItems[2].points).toBe(0);
    expect(keyCheckedItems[2].help).toContain('Closing stomata');
    expect(keyCheckedItems[3]).toMatchObject({ type: 'short', answer: 'Chloroplast', points: 1 });
  });
});

describe('Wave 49 — Builder plain-text/Braille math & SVG linearization, Markdown tags, and student-package cleanup', () => {
  it('linearizes MathML, accessible SVGs, and sup/sub in _builderPolishPlainTextClone while keeping special SVGs intact', () => {
    const doc = document.implementation.createHTMLDocument('Stem');
    doc.body.innerHTML = [
      '<p>Formula: <math aria-label="one half"><mfrac><mn>1</mn><mn>2</mn></mfrac></math></p>',
      '<p>Algebra: <math><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>+</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msub><mi>H</mi><mn>2</mn></msub><mo>+</mo><msqrt><mi>y</mi></msqrt></math></p>',
      '<p>Water: H<sub>2</sub>O and 10<sup>6</sup></p>',
      '<svg aria-label="Active transport pump"><rect /></svg>',
      '<svg aria-hidden="true"><title>Decorative</title></svg>',
      '<div class="alloflow-inline-chart"><svg><title>Chart keeps separate handler</title></svg></div>',
    ].join('');

    builderHelpers.polish(doc.body, doc);
    const out = doc.body.textContent.replace(/\s+/g, ' ').trim();
    expect(out).toContain('one half');
    expect(out).toContain('(a)/(b)+x^2+H_2+sqrt(y)');
    expect(out).toContain('H_2O and 10^6');
    expect(out).toContain('[Diagram: Active transport pump]');
    expect(out).not.toContain('Decorative');
    expect(doc.body.querySelector('.alloflow-inline-chart svg')).not.toBeNull();
  });

  it('renders sup, sub, accessible svg, and dl/dt/dd cleanly in _builderMarkdownFromRoot', () => {
    const doc = document.implementation.createHTMLDocument('Markdown');
    doc.body.innerHTML = [
      '<p>Water is H<sub>2</sub>O and speed is 3<sup>2</sup> m/s.</p>',
      '<svg><title>Food Web</title></svg>',
      '<dl><dt>Osmosis</dt><dd>Diffusion of water.</dd></dl>',
    ].join('');

    const { markdown } = builderHelpers.markdown(doc.body);
    expect(markdown).toContain('H_2O');
    expect(markdown).toContain('3^2');
    expect(markdown).toContain('[Diagram: Food Web]');
    expect(markdown).toContain('**Osmosis**\n: Diffusion of water.');
  });

  it('removes expanded teacher-only notes, rubrics, model answers, and data-answer-key containers in _removeStudentPackageTeacherSections', () => {
    const doc = document.implementation.createHTMLDocument('StudentPkg');
    doc.body.innerHTML = [
      '<section><h1>Student Prompt</h1><p>Keep me</p></section>',
      '<div class="page-break"></div>',
      '<div class="alloflow-teacher-notes">Secret teacher note</div>',
      '<div class="alloflow-rubric-key">Secret rubric key</div>',
      '<div class="alloflow-model-answer">Secret model answer</div>',
      '<div class="alloflow-sample-response">Secret sample response</div>',
      '<div class="alloflow-scoring-guide">Secret scoring guide</div>',
      '<div id="alloflow-interactive-object-profile">Secret profile</div>',
      '<div data-teacher-note="1">Secret attr note</div>',
      '<div data-answer-key="1">Secret attr key</div>',
    ].join('');

    const removed = builderHelpers.removeTeacher(doc.body);
    expect(removed).toBe(8);
    expect(doc.body.querySelector('.page-break')).toBeNull();
    expect(doc.body.textContent).toContain('Keep me');
    expect(doc.body.textContent).not.toContain('Secret');
  });
});

describe('Wave 50 — Word Sounds & Student Analytics CSV formula hardening and 4-mirror parity', () => {
  it('neutralizes leading-whitespace, pipe, and newline spreadsheet formula payloads without altering plain text or numbers', () => {
    const dangerous = ['  =1+1', '\t+SUM(A1)', ' -2+3', '  @HYPERLINK("http://x")', '|cmd|/C calc', '\n=1+1'];
    for (const payload of dangerous) {
      const quotedExpected = `"'${payload.replace(/"/g, '""')}"`;
      expect(wsResultsCsvCell(payload)).toBe(quotedExpected);
      expect(acCsvHelpers.cell(payload)).toBe(quotedExpected);
      expect(acCsvHelpers.unguard(`'${payload}`)).toBe(payload);
    }

    expect(wsResultsCsvCell(42)).toBe('"42"');
    expect(acCsvHelpers.cell(-3.5)).toBe('"-3.5"');
    expect(acCsvHelpers.unguard("O'Brien")).toBe("O'Brien");

    const built = wsResultsCsv([
      { activity: 'blending', word: '  =IMPORTXML()', correct: true, attempts: 1, record: { learner: '|calc', at: Date.now() } },
    ]);
    expect(built.text).toContain('"\'|calc"');
    expect(built.text).toContain('"\'  =IMPORTXML()"');
  });

  it('keeps export_module.js, view_export_preview_module.js, word_sounds_module.js, and student_analytics_module.js byte-identical across all 4 mirrors', () => {
    const mirrors = ['', 'desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
    const files = ['export_module.js', 'view_export_preview_module.js', 'word_sounds_module.js', 'student_analytics_module.js'];
    for (const file of files) {
      const rootHash = sha256(resolve(ROOT, file));
      for (const mirror of mirrors) {
        const dir = mirror ? resolve(ROOT, mirror) : ROOT;
        expect(existsSync(dir)).toBe(true);
        expect(sha256(resolve(dir, file))).toBe(rootHash);
      }
    }
  });
});
