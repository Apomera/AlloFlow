// Verification suite for Waves 63-66:
// - Wave 63: Student Analytics direct CSV exporters formula-injection guard,
//            RFC 4180 quoting, null/0/-number safety, and UTF-8 BOM
// - Wave 64: QTI & H5P quiz export parity (fill-blank wordBank, relation-mismatch
//            candidatePartners, H5P includeTeacherKey gating, opt-in deterministic
//            choice shuffling with true-false exclusion & QTI option image alignment)
// - Wave 65: Immersive Reader (segmentFocusWords, PerspectiveCrawlOverlay, KaraokeReaderOverlay)
//            HTML/style/script/teacher sanitization, MathML linearization, accessible SVG
//            extraction, and overlay background sibling inert/scroll-lock isolation
// - Wave 66: StudyTimerModal, HintsModal, VisualSupportsModal background sibling isolation,
//            IME composition Escape guard, dialog Shift+Tab wrap, and 4-mirror parity

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let StudyTimerModal;
let HintsModal;
let VisualSupportsModal;
const activeRoots = [];

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error('Missing marker: ' + startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error('Missing end marker: ' + endMarker);
  return source.slice(start, end);
}

function makeCsvCaptureEnv() {
  const captured = [];
  class MemBlob {
    constructor(parts, opts) {
      this.text = parts.join('');
      this.type = opts && opts.type ? opts.type : '';
    }
  }
  const urlApi = {
    createObjectURL: (blob) => {
      captured.push({ text: blob.text, type: blob.type, filename: '' });
      return 'blob:csv-' + captured.length;
    },
    revokeObjectURL: vi.fn(),
  };
  const docStub = {
    createElement: () => ({
      href: '',
      download: '',
      click() {
        if (captured.length) captured[captured.length - 1].filename = this.download;
      },
    }),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
  };
  return { captured, MemBlob, urlApi, docStub };
}

function setupQuizExporter(liveOverrides = {}) {
  const zips = [];
  const toasts = [];
  class MockJSZip {
    constructor() {
      this.files = new Map();
      zips.push(this);
    }
    file(name, data) {
      this.files.set(name, data);
      return this;
    }
    async generateAsync() {
      return new Blob(['zip']);
    }
  }
  vi.stubGlobal('JSZip', MockJSZip);
  window.JSZip = MockJSZip;
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  const api = window.AlloModules.createExport({
    liveRef: {
      current: {
        history: [],
        generatedContent: null,
        sourceTopic: 'Cells',
        gradeLevel: '6',
        exportConfig: { audience: 'teacher', includeTeacherKey: true },
        addToast: (msg, kind) => toasts.push({ msg, kind }),
        t: (k) => k,
        getDefaultTitle: (tp) => String(tp || 'Resource'),
        ...liveOverrides,
      },
    },
    warnLog: () => {},
    debugLog: () => {},
    escapeXml: (v) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;'),
    generateUUID: (() => {
      let n = 0;
      return () => `uuid-w64-${++n}`;
    })(),
  });
  return { api, zips, toasts };
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  new Function('window', readFileSync(resolve(ROOT, 'view_quiz_module.js'), 'utf8'))(window);
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('immersive_reader_module.js');
  loadAlloModule('view_study_timer_modal_module.js');
  loadAlloModule('view_hints_modal_module.js');
  loadAlloModule('view_visual_supports_modal_module.js');

  StudyTimerModal = window.AlloModules.StudyTimerModal.StudyTimerModal;
  HintsModal = window.AlloModules.HintsModal.HintsModal;
  VisualSupportsModal = window.AlloModules.VisualSupportsModal.VisualSupportsModal;
});

afterEach(() => {
  while (activeRoots.length) {
    const r = activeRoots.pop();
    try { act(() => r.unmount()); } catch (_) {}
  }
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  window.__alloFocusTrapStack = [];
  localStorage.clear();
  delete window.AlloModules.KaraokeAudioStore;
});

describe('Wave 63 — Student Analytics direct CSV formula neutralization & RFC 4180 quoting', () => {
  it('hardens exportFluencyCSV, exportResearchCSV, exportSessionLogCSV, exportSurveyCSV, inline research buttons, and handleExportCSV', async () => {
    const src = readFileSync(resolve(ROOT, 'student_analytics_module.js'), 'utf8');
    const csvCellFn = sliceBetween(src, '  function _acCsvCell(value) {', '  function _acDownloadCsv(rows, filename) {');
    const localDate = () => '2026-11-15';

    // 1. exportFluencyCSV
    const fluEnv = makeCsvCaptureEnv();
    const exportFluencyCSV = new Function(
      'history', 'addToast', 't', 'calculateRunningRecordMetrics', '_acLocalDate', 'Blob', 'URL', 'document',
      csvCellFn + '\n' + sliceBetween(src, '    const exportFluencyCSV = () => {', '    const renderInsightsPanel =') + '\nreturn exportFluencyCSV;'
    )(
      [{
        type: 'fluency-record',
        timestamp: Date.parse('2026-11-10T12:00:00Z'),
        data: {
          sourceText: '=CMD("calc"), "quoted"\nline',
          metrics: { wcpm: 88, accuracy: 96, totalWords: 100, durationSeconds: 60 },
          wordData: [{ word: 'hello', status: 'correct' }],
        },
      }],
      vi.fn(),
      (k) => k,
      () => ({ substitutions: 0, omissions: 0, insertions: 0, selfCorrections: 0, errorRate: 0, readingLevel: '+EXPERT' }),
      localDate,
      fluEnv.MemBlob,
      fluEnv.urlApi,
      fluEnv.docStub
    );
    exportFluencyCSV();
    expect(fluEnv.captured).toHaveLength(1);
    const fluCsv = fluEnv.captured[0].text;
    expect(fluCsv.startsWith('\uFEFF')).toBe(true);
    expect(fluCsv).toContain('"\'=CMD(""calc""), ""quoted"" line"');
    expect(fluCsv).toContain('"\'+EXPERT"');

    // 2. exportResearchCSV preserves numeric negative growth (-4) and 0 while neutralizing string formulas
    const resEnv = makeCsvCaptureEnv();
    const exportResearchCSV = new Function(
      'askStudentAnalyticsConfirmation', 'importedStudents', 'generateStudentInsights', 'probeHistory', 'interventionLogs', 'rosterKey', 'externalCBMScores', 'Blob', 'URL', 'document', 'addToast', 't',
      sliceBetween(src, '    const exportResearchCSV = async () => {', '    // ── Session-level CSV export') + '\nreturn exportResearchCSV;'
    )(
      async () => true,
      [{ name: '@EvilStudent, "Jr"', stats: { totalActivities: 2 } }],
      () => ({
        snapshots: 2,
        probes: 1,
        profile: { phonologicalAwareness: 0, comprehension: 80, fluency: 90 },
        growth: { wsAccuracy: -4, quizAvg: 0, fluencyWCPM: -12 },
        strength: 'fluency',
        weakness: 'phonologicalAwareness',
        correlations: { practiceToQuiz: { r: -0.35, strength: 'moderate', n: 3 } },
        dosage: { totalInterventions: 1, avgFrequency: 2, avgMinutes: 15 },
      }),
      {},
      {},
      {},
      { '@EvilStudent, "Jr"': [{ source: '=HYPERLINK("bad")', score: 12, date: '2026-11-10' }] },
      resEnv.MemBlob,
      resEnv.urlApi,
      resEnv.docStub,
      vi.fn(),
      (k) => k
    );
    await exportResearchCSV();
    const resCsv = resEnv.captured[0].text;
    expect(resCsv.startsWith('\uFEFF')).toBe(true);
    expect(resCsv).toContain('"\'@EvilStudent, ""Jr"""');
    expect(resCsv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(resCsv).toContain('"-4"');
    expect(resCsv).toContain('"-12"');
    expect(resCsv).not.toContain('"-4\'"');

    // 3. exportSessionLogCSV & exportSurveyCSV
    const logEnv = makeCsvCaptureEnv();
    localStorage.setItem('alloflow_fidelity_log', JSON.stringify([
      { date: '2026-11-10', student: '=A1', activity: 'Word, Sounds', duration: 15, researchStudy: '@Study' },
    ]));
    const exportSessionLogCSV = new Function(
      '_acLocalDate', 'Blob', 'URL', 'document', 'addToast', 't',
      csvCellFn + '\n' + sliceBetween(src, '    const exportSessionLogCSV = () => {', '    // ── Survey responses CSV export') + '\nreturn exportSessionLogCSV;'
    )(localDate, logEnv.MemBlob, logEnv.urlApi, logEnv.docStub, vi.fn(), (k) => k);
    exportSessionLogCSV();
    expect(logEnv.captured[0].text.startsWith('\uFEFF')).toBe(true);
    expect(logEnv.captured[0].text).toContain('"\'=A1"');
    expect(logEnv.captured[0].text).toContain('"Word, Sounds"');
    expect(logEnv.captured[0].text).toContain('"\'@Study"');

    const survEnv = makeCsvCaptureEnv();
    const exportSurveyCSV = new Function(
      'surveyResponses', 'researchMode', '_acLocalDate', 'Blob', 'URL', 'document', 'addToast', 't',
      csvCellFn + '\n' + sliceBetween(src, '    const exportSurveyCSV = () => {', '    // ── Full study bundle export/import') + '\nreturn exportSurveyCSV;'
    )(
      { t1: [{ timestamp: '2026-11-10', type: 'post', respondent: '+Bob', timepoint: 'post', studyName: 'Pilot, 1', '=FORMULA': '=SUM(A1)', Q1: 'Good, "very" helpful\nYes' }] },
      { consentProvenance: '-None' },
      localDate, survEnv.MemBlob, survEnv.urlApi, survEnv.docStub, vi.fn(), (k) => k
    );
    exportSurveyCSV();
    const survCsv = survEnv.captured[0].text;
    expect(survCsv.startsWith('\uFEFF')).toBe(true);
    expect(survCsv).toContain('"\'=FORMULA"');
    expect(survCsv).toContain('"\'=SUM(A1)"');
    expect(survCsv).toContain('"\'+Bob"');
    expect(survCsv).toContain('"-None"'.replace('-None', '\'-None'));
    expect(survCsv).toContain('"Good, ""very"" helpful\nYes"');

    // 4. Inline Research Suite buttons (Fidelity Log & Survey Data) + Class Analytics handleExportCSV
    const inlineSlice = sliceBetween(src, "hover:border-emerald-600 font-medium text-slate-600 transition-colors',\n", '    const saveRtiGoal =');
    const fidelityHandlerSrc = sliceBetween(inlineSlice, "onClick: () => {", "\n        }\n      }, '\\u{1F4C4} Export Fidelity Log'").replace(/^onClick:\s*\(\)\s*=>\s*\{/, '');
    const surveyMarker = "hover:border-purple-600 font-medium text-slate-600 transition-colors',\n        onClick: () => {";
    const surveyHandlerSrc = inlineSlice.slice(
      inlineSlice.indexOf(surveyMarker) + surveyMarker.length,
      inlineSlice.indexOf("\n        }\n      }, '\\u{1F4DD} Export Survey Data'")
    );
    const fidEnv = makeCsvCaptureEnv();
    new Function('fidelityLog', '_acLocalDate', 'Blob', 'URL', 'document', csvCellFn + '\n' + fidelityHandlerSrc)(
      [{ date: '2026-11-10', weekday: 'Tuesday', student: '=S1', activity: 'Quiz', duration: undefined, researchStudy: null }],
      localDate, fidEnv.MemBlob, fidEnv.urlApi, fidEnv.docStub
    );
    expect(fidEnv.captured[0].text.startsWith('\uFEFF')).toBe(true);
    expect(fidEnv.captured[0].text).toContain('"\'=S1"');
    expect(fidEnv.captured[0].text).not.toContain('undefined');

    const inlineSurvEnv = makeCsvCaptureEnv();
    new Function('surveyResponses', 'SURVEY_QUESTIONS', '_acLocalDate', 'Blob', 'URL', 'document', csvCellFn + '\n' + surveyHandlerSrc)(
      { g1: [{ type: 'pre', respondent: '=Mal', timestamp: '2026-11-10', q1: '+9' }] },
      { pre: [{ id: 'q1' }] },
      localDate, inlineSurvEnv.MemBlob, inlineSurvEnv.urlApi, inlineSurvEnv.docStub
    );
    expect(inlineSurvEnv.captured[0].text.startsWith('\uFEFF')).toBe(true);
    expect(inlineSurvEnv.captured[0].text).toContain('"\'=Mal"');
    expect(inlineSurvEnv.captured[0].text).toContain('"\'+9"');

    const clsEnv = makeCsvCaptureEnv();
    const handleExportCSV = new Function(
      'importedStudents', 't', '_acLocalDate', 'Blob', 'URL', 'document',
      csvCellFn + '\n' + sliceBetween(src, '    const handleExportCSV = () => {', '    const classSummary =') + '\nreturn handleExportCSV;'
    )(
      [{
        name: '=1+1, "Alice"',
        stats: { quizAvg: 90, adventureXP: 100, escapeCompletion: 50, fluencyWCPM: 110, interviewXP: 20, wsAccuracy: 85, gamesPlayed: 3, socraticMessageCount: 4, labelChallengeAvg: 80, selToolsUsed: 2, selReflectionCount: 1, totalActivities: 8 },
        safetyFlags: [],
        lastSession: Date.parse('2026-11-10T12:00:00Z'),
      }],
      (k) => (k === 'class_analytics.student_name' ? 'Student, Name' : k),
      localDate,
      clsEnv.MemBlob,
      clsEnv.urlApi,
      clsEnv.docStub
    );
    handleExportCSV();
    const clsCsv = clsEnv.captured[0].text;
    expect(clsCsv.startsWith('\uFEFF')).toBe(true);
    expect(clsCsv).toContain('"Student, Name"');
    expect(clsCsv).toContain('"\'=1+1, ""Alice"""');
  });
});

describe('Wave 64 — QTI & H5P wordBank, relation-mismatch shuffle, includeTeacherKey, and choice shuffle parity', () => {
  const sampleImgA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const sampleImgB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('QTI preserves fill-blank wordBank, shuffles relation-mismatch candidatePartners, and aligns shuffled option images & keys', async () => {
    const questions = [
      {
        type: 'mcq',
        question: 'Which organelle makes ATP?',
        options: ['Mitochondria', 'Vacuole', 'Ribosome'],
        optionImageUrls: [sampleImgA, '', sampleImgB],
        correctAnswer: 'Mitochondria',
      },
      { type: 'true-false', question: 'Cells are living units.', options: ['True', 'False'], correctIndex: 0 },
      { type: 'fill-blank', question: 'Water enters by ___.', expectedFill: 'osmosis', wordBank: ['osmosis', 'mitosis', 'diffusion'] },
      {
        type: 'relation-mismatch',
        question: 'Find the wrong cell pair.',
        pairs: [{ left: 'Nucleus', right: 'DNA' }, { left: 'Chloroplast', right: 'animal respiration' }],
        wrongPairIndex: 1,
        candidatePartners: ['photosynthesis', 'animal respiration', 'protein folding'],
        correctPartnerForWrong: 'photosynthesis',
      },
      {
        type: 'answer-evidence',
        question: 'Select claim and proof.',
        answerOptions: ['Plant cell', 'Animal cell', 'Virus'],
        correctAnswer: 'Plant cell',
        evidenceOptions: ['Has chloroplasts', 'No wall', 'No membrane'],
        correctEvidence: 'Has chloroplasts',
      },
    ];

    // Default QTI (shuffleChoices omitted -> false): keeps canonical OPT_0 while adding wordBank & Partner choices
    const defSetup = setupQuizExporter({
      generatedContent: { type: 'quiz', title: 'Bio Quiz', data: { questions } },
    });
    expect(await defSetup.api.handleExportQTI()).toBe(true);
    const defXml = defSetup.zips[0].files.get('assessment.xml');
    expect(defXml).toContain('Word bank:');
    expect(defXml).toContain('osmosis');
    expect(defXml).toContain('diffusion');
    expect(defXml).toContain('Displayed pairs:');
    expect(defXml).toContain('Partner choices:');
    expect(defXml).not.toContain('Partner choices:\nA. photosynthesis\nB. animal respiration\nC. protein folding');

    // Shuffled QTI: shuffles MCQ / answer-evidence while keeping True/False ordered and option images aligned with OPT ident
    const shufSetup = setupQuizExporter({
      generatedContent: { type: 'quiz', title: 'Bio Quiz Shuffled', data: { questions } },
      exportConfig: { audience: 'student', includeTeacherKey: false, shuffleChoices: true },
    });
    expect(await shufSetup.api.handleExportQTI()).toBe(true);
    const shufXml = shufSetup.zips[0].files.get('assessment.xml');
    const doc = new DOMParser().parseFromString(shufXml, 'application/xml');
    const items = Array.from(doc.querySelectorAll('item'));
    const mcqLabels = Array.from(items[0].querySelectorAll('response_label')).map((el) => ({
      id: el.getAttribute('ident'),
      text: el.querySelector('mattext')?.textContent?.trim(),
      img: el.querySelector('matimage')?.getAttribute('uri') || null,
    }));
    const mitoLabel = mcqLabels.find((l) => l.text === 'Mitochondria');
    const ripoLabel = mcqLabels.find((l) => l.text === 'Ribosome');
    expect(mcqLabels.map((l) => l.text)).not.toEqual(['Mitochondria', 'Vacuole', 'Ribosome']);
    expect(mitoLabel.img).toBeTruthy();
    expect(ripoLabel.img).toBeTruthy();
    expect(mitoLabel.img).not.toBe(ripoLabel.img);
    expect(items[0].querySelector('varequal')?.textContent?.trim()).toBe(mitoLabel.id);

    // True-False stays unshuffled
    const tfTexts = Array.from(items[1].querySelectorAll('response_label mattext')).map((el) => el.textContent.trim());
    expect(tfTexts).toEqual(['True', 'False']);

    // Answer-Evidence shuffled & keys aligned
    const aeCorrectVals = Array.from(items[4].querySelectorAll('varequal')).map((el) => el.textContent.trim());
    const ansTexts = Array.from(items[4].querySelectorAll('response_label')).filter((el) => el.getAttribute('ident').startsWith('ANS_'));
    const evidTexts = Array.from(items[4].querySelectorAll('response_label')).filter((el) => el.getAttribute('ident').startsWith('EVID_'));
    expect(ansTexts.map((el) => el.querySelector('mattext').textContent.trim())).not.toEqual(['Plant cell', 'Animal cell', 'Virus']);
    expect(ansTexts.find((el) => el.getAttribute('ident') === aeCorrectVals[0]).querySelector('mattext').textContent.trim()).toBe('Plant cell');
    expect(evidTexts.find((el) => el.getAttribute('ident') === aeCorrectVals[1]).querySelector('mattext').textContent.trim()).toBe('Has chloroplasts');
  });

  it('H5P respects includeTeacherKey: false on essays, preserves fill-blank wordBank, and shuffles relation-mismatch & QuestionSet choices', async () => {
    const mixedQuiz = {
      type: 'quiz',
      title: 'H5P Mixed',
      data: {
        questions: [
          { type: 'mcq', question: 'Q1?', options: ['Alpha', 'Beta', 'Gamma'], correctIndex: 0 },
          { type: 'fill-blank', question: 'The ___ warms Earth.', expectedFill: 'sun', wordBank: ['sun', 'moon', 'comet'] },
          { type: 'short-answer', question: 'Explain why.', expectedAnswer: 'TEACHER_SAMPLE_SECRET' },
          {
            type: 'relation-mismatch',
            question: 'Fix pair.',
            pairs: [{ left: 'Heart', right: 'Pump' }, { left: 'Lung', right: 'Digest' }],
            wrongPairIndex: 1,
            candidatePartners: ['Gas exchange', 'Digest', 'Store bile'],
            correctPartnerForWrong: 'Gas exchange',
          },
        ],
      },
    };

    const { api, zips } = setupQuizExporter({
      generatedContent: mixedQuiz,
      exportConfig: { audience: 'student', includeTeacherKey: false, assessmentMode: false, shuffleChoices: true },
    });
    expect(await api.handleExportH5P()).toBe(true);
    const content = JSON.parse(zips[0].files.get('content/content.json'));

    const mcq = content.questions.find((q) => q.library === 'H5P.MultiChoice 1.16' && q.params.question.includes('Q1'));
    expect(mcq.params.behaviour.enableCheckButton).toBe(true);
    expect(mcq.params.answers.map((a) => a.text)).not.toEqual(['<p>Alpha</p>', '<p>Beta</p>', '<p>Gamma</p>']);
    expect(mcq.params.answers.find((a) => a.correct).text).toBe('<p>Alpha</p>');

    const blanks = content.questions.find((q) => q.library === 'H5P.Blanks 1.14');
    expect(blanks.params.text).toContain('Word bank:');
    expect(blanks.params.text).toContain('sun');
    expect(blanks.params.text).toContain('comet');

    const essay = content.questions.find((q) => q.library === 'H5P.Essay 1.5');
    expect(essay.params.solution.sample).toBe('');
    expect(essay.params.solution.introduction).toBe('');

    const rmPartnerQ = content.questions.find((q) => q.library === 'H5P.MultiChoice 1.16' && q.params.question.includes('pair with?'));
    expect(rmPartnerQ.params.answers[0].text).not.toBe('<p>Gas exchange</p>');
    expect(rmPartnerQ.params.answers.find((a) => a.correct).text).toBe('<p>Gas exchange</p>');
  });
});

describe('Wave 65 — Immersive Reader sanitization, MathML/SVG extraction & overlay sibling isolation', () => {
  it('segmentFocusWords strips CSS/scripts/teacher notes and linearizes MathML + accessible SVG', () => {
    const rich = '<style>.x{color:red}</style><script>alert(1)</script>' +
      '<div class="teacher-only">TEACHER_SECRET</div>' +
      '<p>Formula <math><mfrac><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><mn>2</mn></mfrac><annotation encoding="application/x-tex">RAW_LATEX</annotation></math> and <math><mroot><mi>y</mi><mn>3</mn></mroot></math>.</p>' +
      '<p><svg role="img" aria-label="Osmosis diagram"><text>SVG_TICKS</text></svg><svg role="presentation"><text>NO_DECOR</text></svg></p>';

    const words = window.AlloModules.segmentFocusWords(rich, 'English').join(' ');
    expect(words).toContain('(x+1)/(2)');
    expect(words).toContain('root(3, y)');
    expect(words).toContain('Osmosis diagram');
    expect(words).not.toContain('color:red');
    expect(words).not.toContain('alert(1)');
    expect(words).not.toContain('TEACHER_SECRET');
    expect(words).not.toContain('RAW_LATEX');
    expect(words).not.toContain('SVG_TICKS');
    expect(words).not.toContain('NO_DECOR');
  });

  it('PerspectiveCrawlOverlay & KaraokeReaderOverlay isolate background siblings, clean HTML/MathML, and keep plain-text splitSentences keys', () => {
    const sibling = document.createElement('main');
    sibling.textContent = 'Behind overlay';
    const scriptNode = document.createElement('script');
    document.body.append(sibling, scriptNode);

    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Launch';
    document.body.appendChild(opener);
    opener.focus();

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    activeRoots.push(root);

    const onClose = vi.fn();
    act(() => root.render(React.createElement(window.AlloModules.PerspectiveCrawlOverlay, {
      isOpen: true,
      onClose,
      text: '<style>body{display:none}</style><p>First <math><msup><mi>x</mi><mn>2</mn></msup></math>.</p><p class="answer-key">HIDDEN_KEY</p><p>Second paragraph with $5.</p>',
    })));
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(sibling.getAttribute('aria-hidden')).toBe('true');
    expect(scriptNode.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
    expect(host.textContent).toContain('First x^2.');
    expect(host.textContent).toContain('Second paragraph with $5.');
    expect(host.textContent).not.toContain('display:none');
    expect(host.textContent).not.toContain('HIDDEN_KEY');

    act(() => root.render(React.createElement(window.AlloModules.PerspectiveCrawlOverlay, { isOpen: false, onClose, text: '' })));
    expect(sibling.hasAttribute('inert')).toBe(false);
    expect(sibling.hasAttribute('aria-hidden')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);

    // KaraokeAudioStore.splitSentences receives untouched plain text when no markup is present
    const splitSpy = vi.fn((t) => [t]);
    window.AlloModules.KaraokeAudioStore = { splitSentences: splitSpy };
    act(() => root.render(React.createElement(window.AlloModules.KaraokeReaderOverlay, {
      isOpen: true,
      onClose,
      text: 'Plain sentence with 3 * 4 = 12.',
    })));
    expect(splitSpy).toHaveBeenCalledWith('Plain sentence with 3 * 4 = 12.');
    act(() => root.unmount());
  });
});

describe('Wave 66 — StudyTimerModal, HintsModal & VisualSupportsModal isolation, IME guard, & 4-mirror parity', () => {
  it('all three modals isolate background siblings, ignore IME Escape, wrap Shift+Tab from dialog, and restore opener focus', () => {
    const bgMain = document.createElement('main');
    bgMain.innerHTML = '<button type="button">Behind</button>';
    const scriptTag = document.createElement('script');
    document.body.append(bgMain, scriptTag);

    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open modal';
    document.body.appendChild(opener);

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    activeRoots.push(root);

    const runModalCheck = (elementFactory, closeSpy) => {
      opener.focus();
      act(() => root.render(elementFactory(true)));
      const dialog = host.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(bgMain.hasAttribute('inert')).toBe(true);
      expect(bgMain.getAttribute('aria-hidden')).toBe('true');
      expect(scriptTag.hasAttribute('inert')).toBe(false);
      expect(document.body.style.overflow).toBe('hidden');

      // IME Escape does not dismiss
      const imeEv = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      Object.defineProperty(imeEv, 'isComposing', { value: true });
      act(() => document.dispatchEvent(imeEv));
      expect(closeSpy).not.toHaveBeenCalled();

      // Focusing dialog directly and pressing Shift+Tab wraps inside dialog
      dialog.focus();
      act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(dialog);

      // Unmount restores background, scroll lock, and opener focus
      act(() => root.render(null));
      expect(bgMain.hasAttribute('inert')).toBe(false);
      expect(bgMain.hasAttribute('aria-hidden')).toBe(false);
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement).toBe(opener);
    };

    const closeTimer = vi.fn();
    runModalCheck((open) => open ? React.createElement(StudyTimerModal, {
      ConfettiExplosion: () => null,
      customTimerMinutes: '',
      formatTime: (s) => String(s),
      handleSetShowStudyTimerModalToFalse: closeTimer,
      isStudyTimerRunning: false,
      setCustomTimerMinutes: vi.fn(),
      setIsStudyTimerRunning: vi.fn(),
      setStudyDuration: vi.fn(),
      setStudyTaskLabel: vi.fn(),
      setStudyTimeLeft: vi.fn(),
      showTimerConfetti: false,
      studyDuration: 1500,
      studyTaskLabel: '',
      studyTimeLeft: 1500,
      studyTimerRef: React.createRef(),
      t: (k) => k,
    }) : null, closeTimer);

    const closeHints = vi.fn();
    runModalCheck((open) => open ? React.createElement(HintsModal, {
      handleApplyHint: vi.fn(),
      handleGenerateLessonIdeas: vi.fn(),
      handleSaveExtensionToHistory: vi.fn(),
      handleSetShowHintsModalToFalse: closeHints,
      hintHistory: [],
      history: [],
      isGeneratingExtension: false,
      renderFormattedText: (s) => s,
      t: (k) => k,
    }) : null, closeHints);

    const closeVisual = vi.fn();
    runModalCheck((open) => open ? React.createElement(VisualSupportsModal, {
      setShowVisualSupports: closeVisual,
      setVsTab: vi.fn(),
      showVisualSupports: true,
      vsTab: 'boards',
      t: (k) => k,
    }) : null, closeVisual);

    act(() => root.unmount());
  });

  it('maintains byte-for-byte SHA-256 parity across all 4 mirrors for Wave 63-66 modules', () => {
    for (const mod of [
      'student_analytics_module.js',
      'export_module.js',
      'immersive_reader_module.js',
      'view_study_timer_modal_module.js',
      'view_hints_modal_module.js',
      'view_visual_supports_modal_module.js',
    ]) {
      const rootHash = sha256(resolve(ROOT, mod));
      for (const dir of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        expect(sha256(resolve(ROOT, dir, mod)), `${dir}/${mod}`).toBe(rootHash);
      }
    }
  });
});
