// Verification suite for Waves 67-70:
// - Wave 67: Storybook popup opener=null, 44px toolbar touch targets, prefers-reduced-motion
//            CSS & JS scrollIntoView, Play All aria-pressed toggle; Slides concept-sort &
//            sentence-frames deselected curation; Flashcards selected:false alias & 44px study buttons
// - Wave 68: CSV formula-injection (' prefix including | and leading \n) & UTF-8 BOM hardening
//            across math_fluency_module.js, dynamic_assessment_module.js, symbol_studio_module.js
// - Wave 69: SentenceFramesView deselected item filtering & learner assessment-mode rubric gating
// - Wave 70: KokoroOfferModal, XPModal, GlobalLevelUpModal background sibling inert/aria-hidden
//            isolation, body overflow lock/restore, disconnected dialog guard, Shift+Tab from dialog,
//            XPModal null/Invalid Date resilience, GlobalLevelUpModal AlloIcons/null state resilience,
//            and 4-mirror SHA-256 parity across all 8 modified modules

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
let MathFluencyInternals;
let SentenceFramesView;
let KokoroOfferModal;
let XPModal;
let GlobalLevelUpModal;
let originalBlob;
let originalCallGemini;
let originalArtifactStore;
const activeRoots = [];

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error('Missing start marker: ' + startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error('Missing end marker: ' + endMarker);
  return source.slice(start, end);
}

function makeCsvCaptureEnv() {
  const captured = [];
  class MemBlob {
    constructor(parts, opts) {
      this.text = parts.map(String).join('');
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

function setupExportEnv(liveOverrides = {}) {
  const captured = { blobs: [], downloads: [], slides: [], toasts: [] };
  class MemBlob {
    constructor(parts, options = {}) {
      this.content = parts.map(String).join('');
      this.type = options.type || '';
      captured.blobs.push(this);
    }
  }
  vi.stubGlobal('Blob', MemBlob);
  window.Blob = MemBlob;

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
      return Promise.resolve(fileName);
    }
  };

  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-' + (captured.downloads.length + 1));
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function onClick() {
    captured.downloads.push(this.download || '');
  });

  const api = window.AlloModules.createExport({
    liveRef: {
      current: {
        history: [],
        generatedContent: null,
        sourceTopic: 'Ecosystems',
        gradeLevel: 'Grade 6',
        language: 'English',
        leveledTextLanguage: 'English',
        currentUiLanguage: 'English',
        studentResponses: {},
        exportConfig: { audience: 'student', includeTeacherKey: false },
        addToast: (msg, kind) => captured.toasts.push({ msg, kind }),
        t: (k, fb) => (typeof fb === 'string' ? fb : k),
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
      let seq = 0;
      return () => `uuid-w67-${++seq}`;
    })(),
  });
  return { api, captured };
}

function mountComp(Component, props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  activeRoots.push(root);
  act(() => {
    root.render(React.createElement(Component, props));
  });
  return { host, root };
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  originalBlob = globalThis.Blob;
  originalCallGemini = window.callGemini;
  originalArtifactStore = window.AlloModules?.StudentArtifactStore;

  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: (k) => k });

  new Function('window', readFileSync(resolve(ROOT, 'view_quiz_module.js'), 'utf8'))(window);
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('math_fluency_module.js');
  loadAlloModule('view_sentence_frames_module.js');
  loadAlloModule('view_kokoro_offer_modal_module.js');
  loadAlloModule('view_xp_modal_module.js');
  loadAlloModule('view_global_level_up_module.js');

  MathFluencyInternals = window.AlloModules.MathFluencyInternals;
  SentenceFramesView = window.AlloModules.SentenceFramesView;
  KokoroOfferModal = window.AlloModules.KokoroOfferModal.KokoroOfferModal;
  XPModal = window.AlloModules.XPModal.XPModal;
  GlobalLevelUpModal = window.AlloModules.GlobalLevelUpModal.GlobalLevelUpModal;
});

afterEach(() => {
  while (activeRoots.length) {
    const r = activeRoots.pop();
    try { act(() => r.unmount()); } catch (_) {}
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  globalThis.Blob = originalBlob;
  window.Blob = originalBlob;
  window.callGemini = originalCallGemini;
  if (originalArtifactStore !== undefined) window.AlloModules.StudentArtifactStore = originalArtifactStore;
  delete window.__alloAssessmentMode;
  delete window.__alloFocusTrapStack;
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('Wave 67: Export Storybook security/a11y, Slides deselected curation, and Flashcards polish', () => {
  it('handleExportStorybook severs printWindow.opener, sets 44px toolbar targets, respects prefers-reduced-motion, and manages Play All aria-pressed', async () => {
    const written = [];
    const popup = {
      opener: window,
      document: {
        write: vi.fn((html) => written.push(html)),
        close: vi.fn(),
      },
    };
    vi.spyOn(window, 'open').mockReturnValue(popup);

    const { api } = setupExportEnv({
      isTeacherMode: false,
      adventureState: {
        history: [
          { type: 'scene', text: 'You reach the riverbank.' },
          { type: 'choice', text: 'Inspect the water level.' },
          { type: 'feedback', text: 'Good observation!' },
        ],
        currentScene: null,
        imageCache: {},
        level: 2,
      },
    });

    const ok = await api.handleExportStorybook({ includeImages: false, includeNarration: false });
    expect(ok).toBe(true);
    expect(popup.opener).toBeNull();
    expect(popup.document.write).toHaveBeenCalledTimes(1);
    expect(popup.document.close).toHaveBeenCalledTimes(1);

    const html = written.join('');
    expect(html).toContain('.reader-tool-btn, .print-btn { min-width: 44px; min-height: 44px;');
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html).toContain('transition: none !important; transform: none !important;');

    const scriptMatch = html.match(/<script>(\(function\(\)\{var r=document\.documentElement[\s\S]*?\}\)\(\);)<\/script>/);
    expect(scriptMatch).toBeTruthy();

    document.body.innerHTML = `
      <button type="button" id="reader-theme-btn">Theme: Paper</button>
      <button type="button" id="reader-font-dec">A-</button>
      <button type="button" id="reader-font-inc">A+</button>
      <button type="button" id="reader-play-all">Play all</button>
      <audio class="narration-audio"></audio>
      <audio class="narration-audio"></audio>
    `;
    const scrollCalls = [];
    const audioEls = Array.from(document.querySelectorAll('.narration-audio'));
    audioEls.forEach((el) => {
      el.scrollIntoView = vi.fn((arg) => scrollCalls.push(arg));
      el.play = vi.fn(() => Promise.resolve());
      el.pause = vi.fn();
    });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    new Function(scriptMatch[1])();

    const playBtn = document.getElementById('reader-play-all');
    expect(playBtn.getAttribute('aria-pressed')).toBe('false');
    playBtn.click();
    expect(playBtn.getAttribute('aria-pressed')).toBe('true');
    expect(playBtn.textContent).toBe('Pause');
    expect(scrollCalls[0]).toEqual({ behavior: 'auto', block: 'center' });
    playBtn.click();
    expect(playBtn.getAttribute('aria-pressed')).toBe('false');
    expect(playBtn.textContent).toBe('Play all');
  });

  it('handleExportSlides filters teacher-deselected concept-sort categories/items and sentence-frames items in both student and teacher decks', async () => {
    const csItem = {
      id: 'cs-1',
      type: 'concept-sort',
      title: 'Matter Sort',
      data: {
        categories: [
          { id: 'c1', label: 'Solids' },
          { id: 'c2', label: 'Dropped Cat', isSelected: false },
          { id: 'c3', label: 'Hidden Cat', selected: false },
        ],
        items: [
          { text: 'Ice cube', categoryId: 'c1' },
          { text: 'Omitted via isSelected', categoryId: 'c1', isSelected: false },
          { text: 'Omitted via selected', categoryId: 'c1', selected: false },
        ],
      },
    };
    const sfItem = {
      id: 'sf-1',
      type: 'sentence-frames',
      title: 'Lab Frames',
      data: {
        mode: 'list',
        items: [
          { text: 'I observed that ___' },
          { text: 'Hidden starter A', isSelected: false },
          { text: 'Hidden starter B', selected: false },
        ],
      },
    };

    for (const includeTeacherKey of [false, true]) {
      const { api, captured } = setupExportEnv({
        history: [csItem, sfItem],
        exportConfig: { audience: includeTeacherKey ? 'teacher' : 'student', includeTeacherKey },
      });
      await api.handleExportSlides();
      const dump = JSON.stringify(captured.slides);
      expect(dump).toContain('Solids');
      expect(dump).toContain('Ice cube');
      expect(dump).toContain('I observed that ___');
      expect(dump).not.toContain('Dropped Cat');
      expect(dump).not.toContain('Hidden Cat');
      expect(dump).not.toContain('Omitted via isSelected');
      expect(dump).not.toContain('Omitted via selected');
      expect(dump).not.toContain('Hidden starter A');
      expect(dump).not.toContain('Hidden starter B');
    }
  });

  it('handleExportFlashcards drops selected:false entries and adds 44px touch targets + focus-visible styling', () => {
    const { api, captured } = setupExportEnv({
      generatedContent: {
        id: 'gl-1',
        type: 'glossary',
        data: {
          terms: [
            { term: 'Osmosis', def: 'Movement of water across a membrane', isSelected: true },
            { term: 'DroppedViaSelectedFlag', def: 'Should not export', selected: false },
          ],
        },
      },
    });
    api.handleExportFlashcards('standard');
    expect(captured.blobs.length).toBeGreaterThan(0);
    const html = captured.blobs[0].content;
    expect(html).toContain('Osmosis');
    expect(html).not.toContain('DroppedViaSelectedFlag');
    expect(html).toContain('[data-flashcard-toolbar] button { min-height: 44px; min-width: 44px; }');
    expect(html).toContain('.card-study-btn { min-height: 44px; min-width: 44px;');
    expect(html).toContain('[data-flashcard-toolbar] button:focus-visible, .card-study-btn:focus-visible');
  });
});

describe('Wave 68: CSV formula-injection (including | and leading \\n) and UTF-8 BOM hardening', () => {
  it('math_fluency buildTeacherReportCsv neutralizes string formulas without altering safe cells or numeric values, and exportTeacherReport adds UTF-8 BOM', () => {
    const csv = MathFluencyInternals.buildTeacherReportCsv({
      sessions: [
        {
          date: '2026-11-15',
          mode: 'benchmark',
          operation: 'add',
          practiceSet: '  +SUM(A1:A2)',
          untimed: false,
          timeLimit: 60,
          dcpm: 0,
          totalCorrect: 24,
          totalAttempted: 24,
          completionStatus: 'complete',
          goal: { label: '=CMD()' },
          goalResult: { met: true, status: 'Met' },
          form: '|calc',
          formVersion: 'v1',
        },
        {
          date: '\n=1+1',
          mode: 'practice',
          operation: 'sub',
          practiceSet: '-2+3',
          untimed: true,
          dcpm: -5,
          totalCorrect: 0,
          totalAttempted: 5,
          goal: { label: '@HYPERLINK()' },
          goalResult: { met: false, status: '\t=evil' },
        },
      ],
    });
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('Benchmark');
    expect(lines[1]).toContain(',0,24,24,');
    expect(lines[1]).toContain('"\'  +SUM(A1:A2)"');
    expect(lines[1]).toContain('"\'=CMD()"');
    expect(lines[1]).toContain('"\'|calc"');
    expect(lines[1]).toContain(',Met,');
    expect(lines[2]).toContain('"\'\n=1+1"');
    expect(lines[2]).toContain('"\'-2+3"');
    expect(lines[2]).toContain(',-5,0,5,');
    expect(lines[2]).toContain('"\'@HYPERLINK()"');
    expect(lines[2]).toContain('"\'\t=evil"');

    const mfSrc = readFileSync(resolve(ROOT, 'math_fluency_module.js'), 'utf8');
    const fnSrc = sliceBetween(mfSrc, '    function exportTeacherReport() {', '    // window.print() is ignored inside Gemini Canvas');
    const { captured, MemBlob, urlApi, docStub } = makeCsvCaptureEnv();
    const runExport = new Function(
      'getTeacherReport', 'buildTeacherReportCsv', 'Blob', 'window', 'document', 'addToast', 'tt',
      fnSrc + '\nreturn exportTeacherReport;'
    );
    runExport(
      () => ({ sessions: [{ date: '2026-11-15', mode: 'benchmark', goal: { label: '=CMD()' } }] }),
      MathFluencyInternals.buildTeacherReportCsv,
      MemBlob,
      { URL: urlApi },
      docStub,
      vi.fn(),
      (_k, fb) => fb
    )();
    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe('text/csv;charset=utf-8');
    expect(captured[0].text.startsWith('\uFEFFDate,Mode,')).toBe(true);
    expect(captured[0].text.startsWith('\uFEFF\uFEFF')).toBe(false);
    expect(captured[0].text).toContain('"\'=CMD()"');
  });

  it('dynamic_assessment CSV builders guard | and leading \\n formulas and CSV downloads emit UTF-8 BOM', () => {
    const daSrc = readFileSync(resolve(ROOT, 'dynamic_assessment_module.js'), 'utf8');
    const buildSessionStatsCsv = new Function(
      'sumItemResultScores', 'daEvidenceStatus', 'daBuildSessionVersionMetadata', 'maxPossibleScore',
      sliceBetween(daSrc, '  function buildSessionStatsCsv(sessions) {', '  // ═══') + '\nreturn buildSessionStatsCsv;'
    )(
      () => 0,
      () => ({ complete: true, sufficient: true, unscoredItemCount: 0, dataQualityIssues: [] }),
      () => ({ probeVersion: '1', posttestFormVersion: '1', versionFingerprint: 'fp', legacy: false }),
      () => 10
    );
    const buildItemAnalyticsCsv = new Function(
      sliceBetween(daSrc, '  function buildItemAnalyticsCsv(itemStats) {', '  // ═══') + '\nreturn buildItemAnalyticsCsv;'
    )();

    const sCsv = buildSessionStatsCsv([{ id: '|pipe', studentNickname: '\n=formula', domain: 'math', difficulty: 'mid', mode: 'std', sessionItemIds: ['a'] }]);
    expect(sCsv).toContain('"\'|pipe"');
    expect(sCsv).toContain('"\'\n=formula"');

    const iCsv = buildItemAnalyticsCsv([{ itemId: '\n+inject', construct: '|cmd', domain: 'd', difficulty: '1', gradeBand: '3-5', n: 3, pretestN: 3, pretestPassRate: 0.5, posttestN: 3, posttestPassRate: 0.8, mediationN: 2, meanScaffoldLevel: 1.5, modSensSeen: 1, modifiabilitySensitivity: 0.33, transferN: 1, transferPassRate: 1, flags: [] }]);
    expect(iCsv).toContain('"\'\n+inject"');
    expect(iCsv).toContain('"\'|cmd"');

    const downloadCallback = (label) => {
      const a1 = daSrc.indexOf('            "aria-label": "' + label + '"');
      const end = a1 >= 0 ? a1 : daSrc.indexOf('              "aria-label": "' + label + '"');
      const start = daSrc.lastIndexOf('onClick: function () {', end);
      return daSrc.slice(start + 'onClick: '.length, end).trim().slice(0, -1);
    };
    const capturedBlobs = [];
    class CaptureBlob {
      constructor(parts, opts) { this.text = parts.join(''); this.type = opts && opts.type; capturedBlobs.push(this); }
    }
    const handlers = new Function(
      'buildSessionStatsCsv', 'buildItemAnalyticsCsv', 'daCanExport', 'daDownloadBlob', 'state', 'allStats', 'Blob', 'addToast',
      'return { sessionCsv: (' + downloadCallback('Download all session statistics as CSV') + '), itemCsv: (' + downloadCallback('Download item analytics as CSV') + ') };'
    )(
      () => 'col1\nval1',
      () => 'col1\nval2',
      () => true,
      vi.fn(),
      { sessions: [] },
      [],
      CaptureBlob,
      vi.fn()
    );
    handlers.sessionCsv();
    handlers.itemCsv();
    expect(capturedBlobs).toHaveLength(2);
    expect(capturedBlobs[0].text).toBe('\uFEFFcol1\nval1');
    expect(capturedBlobs[0].type).toBe('text/csv;charset=utf-8');
    expect(capturedBlobs[1].text).toBe('\uFEFFcol1\nval2');
    expect(capturedBlobs[1].type).toBe('text/csv;charset=utf-8');
  });

  it('symbol_studio csvCell guards | and leading \\n formulas and garden/comm_log CSV exports include UTF-8 BOM', () => {
    const ssSrc = readFileSync(resolve(ROOT, 'symbol_studio_module.js'), 'utf8');
    const csvCellLine = sliceBetween(ssSrc, '  var csvCell = function (s)', '\n');
    const csvCell = new Function(csvCellLine + '\nreturn csvCell;')();
    expect(csvCell('|calc')).toBe('"\'|calc"');
    expect(csvCell('\n=cmd')).toBe('"\'\n=cmd"');
    expect(csvCell('=cmd')).toBe('"\'=cmd"');
    expect(csvCell('safe')).toBe('"safe"');

    const gardenFnSrc = sliceBetween(ssSrc, '    function exportGardenCSV(bank) {', '\n\n    // ── Quick Boards tab');
    const logFnSrc = sliceBetween(ssSrc, '      var exportLog = function () {', '\n      var handleUseDialogKeyDown');
    const { captured, MemBlob, urlApi, docStub } = makeCsvCaptureEnv();

    new Function(
      'profiles', 'activeProfileId', 'usageLog', 'symbolSessionMetrics', 'activeGoals', 'profileWishes', 'csvCell', 'Blob', 'URL', 'document', 'addToast', 't',
      gardenFnSrc + '\nreturn exportGardenCSV;'
    )(
      [], null, {}, () => ({ symbolTaps: 0, uniqueTappedLabels: 0, meanSymbolsPerMessage: null, speechRequests: 0, knownMessageLengths: 0, unknownMessageLengths: 0, version: 1 }),
      [], [], csvCell, MemBlob, urlApi, docStub, vi.fn(), (k) => k
    )([{ displayLabel: '=evil', category: 'core', growth: 'seed', uniqueContextCount: 1 }]);

    new Function(
      'commLog', 'csvCell', 'Blob', 'URL', 'document',
      logFnSrc + '\nreturn exportLog;'
    )(
      [{ ts: '2026-11-15T12:00:00Z', label: '|cmd', boardTitle: 'Main' }],
      csvCell, MemBlob, urlApi, docStub
    )();

    expect(captured).toHaveLength(2);
    expect(captured[0].type).toBe('text/csv;charset=utf-8');
    expect(captured[0].text.startsWith('\uFEFF--- WORD-LEVEL DATA ---')).toBe(true);
    expect(captured[0].text).toContain('"\'=evil"');
    expect(captured[1].type).toBe('text/csv;charset=utf-8');
    expect(captured[1].text.startsWith('\uFEFFTime,Word,Board\n')).toBe(true);
    expect(captured[1].text).toContain('"\'|cmd"');
  });
});

describe('Wave 69: SentenceFramesView deselected filtering & assessment rubric gating', () => {
  function baseSfProps(overrides = {}) {
    return {
      t: (k) => k,
      isTeacherMode: false,
      isEditingScaffolds: false,
      isIndependentMode: false,
      gradingSession: { isOpen: false },
      studentResponses: {},
      generatedContent: {
        id: 'sf-w69',
        type: 'sentence-frames',
        data: {
          mode: 'list',
          rubric: 'Score 4 if evidence is cited accurately.',
          items: [
            { text: 'Prompt Alpha' },
            { text: 'Prompt Hidden IsSelected', isSelected: false },
            { text: 'Prompt Hidden Selected', selected: false },
            { text: 'Prompt Beta' },
          ],
        },
      },
      setGradingSession: vi.fn(),
      setStudentWorkInput: vi.fn(),
      handleResetScaffolds: vi.fn(),
      launchGradingSession: vi.fn(),
      handleToggleIsEditingScaffolds: vi.fn(),
      submitGradingSession: vi.fn(),
      handleScaffoldChange: vi.fn(),
      handleStudentInput: vi.fn(),
      handleScaffoldTextChange: vi.fn(),
      handleGenerateRubric: vi.fn(),
      handleToggleRubricZoom: vi.fn(),
      handleAutoGrade: vi.fn(),
      handleSetGradingResultToNull: vi.fn(),
      getRows: () => 3,
      renderFormattedText: (text) => text,
      copyToClipboard: vi.fn(),
      DraftFeedbackInterface: () => null,
      ErrorBoundary: (p) => p.children,
      ...overrides,
    };
  }

  it('filters deselected items with gapless numbering in student mode, shows empty status if all hidden, and shows all in teacher/editing mode', () => {
    const { host } = mountComp(SentenceFramesView, baseSfProps());
    expect(host.textContent).toContain('Prompt Alpha');
    expect(host.textContent).toContain('Prompt Beta');
    expect(host.textContent).not.toContain('Prompt Hidden IsSelected');
    expect(host.textContent).not.toContain('Prompt Hidden Selected');
    const badges = [...host.querySelectorAll('[data-help-key="scaffolds_item"] .bg-rose-100')].map((n) => n.textContent);
    expect(badges).toEqual(['1', '2']);

    const { host: teacherHost } = mountComp(SentenceFramesView, baseSfProps({ isTeacherMode: true }));
    expect(teacherHost.textContent).toContain('Prompt Hidden IsSelected');
    expect(teacherHost.textContent).toContain('Prompt Hidden Selected');

    const { host: editHost } = mountComp(SentenceFramesView, baseSfProps({ isEditingScaffolds: true }));
    expect(editHost.textContent).toContain('Prompt Hidden IsSelected');

    const { host: allHiddenHost } = mountComp(SentenceFramesView, baseSfProps({
      generatedContent: {
        id: 'sf-empty',
        type: 'sentence-frames',
        data: { mode: 'list', items: [{ text: 'Hidden', isSelected: false }] },
      },
    }));
    expect(allHiddenHost.querySelector('[role="status"]')).not.toBeNull();
  });

  it('hides teacher Grading Rubric in learner assessment mode across prop/config/window flags while keeping Self-Checklist & normal student practice intact', () => {
    const { host: assessPropHost } = mountComp(SentenceFramesView, baseSfProps({ assessmentMode: true }));
    expect(assessPropHost.textContent).not.toContain('Score 4 if evidence is cited accurately.');

    const { host: assessConfigHost } = mountComp(SentenceFramesView, baseSfProps({
      generatedContent: {
        id: 'sf-cfg',
        type: 'sentence-frames',
        config: { assessmentMode: true },
        data: { mode: 'list', rubric: 'SECRET_RUBRIC', items: [{ text: 'Q1' }] },
      },
    }));
    expect(assessConfigHost.textContent).not.toContain('SECRET_RUBRIC');

    window.__alloAssessmentMode = true;
    const { host: assessWinHost } = mountComp(SentenceFramesView, baseSfProps());
    expect(assessWinHost.textContent).not.toContain('Score 4 if evidence is cited accurately.');
    delete window.__alloAssessmentMode;

    const { host: indepHost } = mountComp(SentenceFramesView, baseSfProps({ isIndependentMode: true, assessmentMode: true }));
    expect(indepHost.textContent).toContain('Score 4 if evidence is cited accurately.');
    expect(indepHost.textContent).toContain('Self-Checklist');

    const { host: normalHost } = mountComp(SentenceFramesView, baseSfProps());
    expect(normalHost.textContent).toContain('Score 4 if evidence is cited accurately.');
  });
});

describe('Wave 70: Modal accessibility parity (KokoroOfferModal, XPModal, GlobalLevelUpModal) & 4-mirror SHA-256 parity', () => {
  function setupModalBackdrop() {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Trigger';
    document.body.appendChild(opener);
    opener.focus();

    const outside = document.createElement('div');
    outside.innerHTML = '<button type="button">Outside</button>';
    document.body.appendChild(outside);

    const scriptNode = document.createElement('script');
    scriptNode.textContent = '/* keep */';
    document.body.appendChild(scriptNode);

    return { opener, outside, scriptNode };
  }

  it.each([
    ['KokoroOfferModal', (onClose) => React.createElement(KokoroOfferModal, { setShowKokoroOfferModal: onClose, setSelectedVoice: vi.fn(), addToast: vi.fn() })],
    ['XPModal', (onClose) => React.createElement(XPModal, { currentLevelXP: 50, globalLevel: 2, globalPoints: 150, globalProgress: 25, globalXPNext: 200, handleSetShowXPModalToFalse: onClose, pointHistory: [{ id: '1', activity: 'Read', points: 10, timestamp: Date.now() }], t: (k) => k })],
    ['GlobalLevelUpModal', (onClose) => React.createElement(GlobalLevelUpModal, { AnimatedNumber: ({ value }) => React.createElement('span', null, value), ConfettiExplosion: () => React.createElement('span'), adventureState: { level: 3, xp: 40, xpToNextLevel: 100 }, handleSetShowGlobalLevelUpToFalse: onClose, t: (k, v) => k === 'feedback.level_reached' ? `Level ${v?.level}` : k })],
  ])('%s isolates siblings with inert/aria-hidden, locks body scroll, wraps Shift+Tab from dialog, guards IME Escape and disconnected dialog, and restores on close', (_, renderModal) => {
    const { opener, outside, scriptNode } = setupModalBackdrop();
    let closed = false;
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? renderModal(() => { closed = true; setOpen(false); }) : null;
    }
    const { host } = mountComp(Harness, {});
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(opener.hasAttribute('inert')).toBe(true);
    expect(opener.getAttribute('aria-hidden')).toBe('true');
    expect(outside.hasAttribute('inert')).toBe(true);
    expect(outside.getAttribute('aria-hidden')).toBe('true');
    expect(scriptNode.hasAttribute('inert')).toBe(false);
    expect(scriptNode.getAttribute('aria-hidden')).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');

    // Shift+Tab while focus is on dialog container should wrap to last focusable control inside dialog
    dialog.focus();
    const focusables = Array.from(dialog.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);

    // IME composition Escape must not close modal
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })));
    expect(closed).toBe(false);

    // Normal Escape closes modal, restores scroll & sibling attributes, then restores opener focus
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(closed).toBe(true);
    expect(document.body.style.overflow).toBe('');
    expect(opener.hasAttribute('inert')).toBe(false);
    expect(opener.getAttribute('aria-hidden')).toBeNull();
    expect(outside.hasAttribute('inert')).toBe(false);
    expect(outside.getAttribute('aria-hidden')).toBeNull();
    expect(document.activeElement).toBe(opener);

    // Disconnected dialog guard: if removed directly without unmount cleanup, Escape does not call close
    closed = false;
    const { host: h2 } = mountComp(Harness, {});
    const d2 = h2.querySelector('[role="dialog"]');
    d2.remove();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(closed).toBe(false);
  });

  it('XPModal handles null pointHistory and invalid/missing timestamps without rendering "Invalid Date"', () => {
    const { host: nullHost } = mountComp(XPModal, {
      currentLevelXP: 0, globalLevel: 1, globalPoints: 0, globalProgress: 0, globalXPNext: 100,
      handleSetShowXPModalToFalse: vi.fn(), pointHistory: null, t: (k) => k === 'student_dashboard.no_activities' ? 'No recent activities' : k,
    });
    expect(nullHost.textContent).toContain('No recent activities');

    const { host: badDateHost } = mountComp(XPModal, {
      currentLevelXP: 10, globalLevel: 1, globalPoints: 10, globalProgress: 10, globalXPNext: 100,
      handleSetShowXPModalToFalse: vi.fn(),
      pointHistory: [
        { id: 'bad', activity: 'First entry', points: 10, timestamp: 'not-a-date' },
        { activity: 'Second entry', points: 5 },
      ],
      t: (k) => k,
    });
    expect(badDateHost.textContent).toContain('First entry');
    expect(badDateHost.textContent).toContain('Second entry');
    expect(badDateHost.textContent).not.toContain('Invalid Date');
  });

  it('GlobalLevelUpModal uses window.AlloIcons.Trophy and survives nullish adventureState', () => {
    let iconRendered = false;
    window.AlloIcons = { Trophy: () => { iconRendered = true; return React.createElement('span', { 'data-icon': 'trophy' }); } };
    delete window.Trophy;
    const { host } = mountComp(GlobalLevelUpModal, {
      AnimatedNumber: ({ value }) => React.createElement('span', null, value),
      ConfettiExplosion: () => React.createElement('span'),
      adventureState: null,
      handleSetShowGlobalLevelUpToFalse: vi.fn(),
      t: (k, v) => k === 'feedback.level_reached' ? `Reached ${v?.level}` : k,
    });
    expect(iconRendered).toBe(true);
    expect(host.textContent).toContain('Reached 1');
  });

  it('keeps all 8 Wave 67-70 modules byte-for-byte identical across all 4 release mirrors', () => {
    const mods = [
      'export_module.js',
      'math_fluency_module.js',
      'dynamic_assessment_module.js',
      'symbol_studio_module.js',
      'view_sentence_frames_module.js',
      'view_kokoro_offer_modal_module.js',
      'view_xp_modal_module.js',
      'view_global_level_up_module.js',
    ];
    for (const mod of mods) {
      const expected = sha256(resolve(ROOT, mod));
      for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        expect(sha256(resolve(ROOT, mirror, mod)), `${mirror}/${mod}`).toBe(expected);
      }
    }
  });
});
