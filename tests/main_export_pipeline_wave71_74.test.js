// Verification suite for Waves 71-74:
// - Wave 71: CSV formula-injection (' prefix including | and leading \n) & UTF-8 BOM hardening
//            in view_quiz_module.js, view_history_panel_module.js, fluency_module.js,
//            and view_pdf_audit_module.js
// - Wave 72: Print popup window.opener = null + selected: false curation parity across
//            export_handlers_module.js and export_module.js
// - Wave 73: ConfirmDialog, StorybookExportModal, and AssignmentCenterModal focus-stack
//            yielding, ancestor-chain background inert/aria-hidden isolation, IME Escape guard,
//            dialog Shift+Tab wrap, and re-render focus retention
// - Wave 74: FaqView & ConceptSortView deselected item/category filtering parity + 44px toggles,
//            and 4-mirror SHA-256 parity across all 12 affected modules

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
let Fluency;
let ExportHandlers;
let ConfirmDialog;
let StorybookExportModal;
let AssignmentCenterModal;
let FaqView;
let ConceptSortView;
let originalBlob;
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

  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: (k) => k });

  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('fluency_module.js');
  loadAlloModule('view_confirm_dialog_module.js');
  loadAlloModule('view_storybook_export_modal_module.js');
  loadAlloModule('view_assignment_center_module.js');
  loadAlloModule('view_faq_module.js');
  loadAlloModule('view_concept_sort_module.js');

  Fluency = window.AlloModules.Fluency;
  ExportHandlers = window.AlloModules.ExportHandlers;
  ConfirmDialog = window.AlloModules.ConfirmDialog.ConfirmDialog;
  StorybookExportModal = window.AlloModules.StorybookExportModal.StorybookExportModal;
  AssignmentCenterModal = window.AlloModules.AssignmentCenter.AssignmentCenterModal;
  FaqView = window.AlloModules.FaqView;
  ConceptSortView = window.AlloModules.ConceptSortView;
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
  delete window.__alloFocusTrapStack;
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('Wave 71: Quiz, History Panel, Oral Fluency & PDF Audit CSV security hardening', () => {
  it('view_quiz item-analysis and gradebook CSV exporters neutralize formulas and prepend UTF-8 BOM', () => {
    const qSrc = readFileSync(resolve(ROOT, 'view_quiz_module.js'), 'utf8');
    const itemCsvFnSrc = sliceBetween(qSrc, '  function downloadCsv() {', '  return /*#__PURE__*/React.createElement("section"');
    const { captured, MemBlob, urlApi, docStub } = makeCsvCaptureEnv();
    new Function('items', 'Blob', 'URL', 'document', itemCsvFnSrc + '\nreturn downloadCsv;')([
      { questionIdx: 0, type: '=CMD()', respondents: 5, gradableCount: 5, correctRate: 80, omittedCount: 0, idkCount: 0, signalLabel: '|calc', flags: ['@HYPERLINK()', '\n+evil'] },
    ], MemBlob, urlApi, docStub)();
    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe('text/csv;charset=utf-8');
    expect(captured[0].text.startsWith('\uFEFFQuestion,Type,')).toBe(true);
    expect(captured[0].text).toContain('"\'=CMD()"');
    expect(captured[0].text).toContain('"\'|calc"');
    expect(captured[0].text).toContain('"\'@HYPERLINK(); \n+evil"');
    expect(captured[0].text).toContain('1,"\'=CMD()",5,5,80,0,0,');

    const gradebookFnSrc = sliceBetween(qSrc, '    var csvEscape = function (v) {', '    var exportCsv = function () {');
    const buildGradebookCsv = new Function('generatedContent', 'data', gradebookFnSrc + '\nreturn buildGradebookCsv;')(
      { data: { questions: [{ prompt: 'Q1' }] } },
      {
        studentRows: [
          {
            displayName: '  +SUM(A1:A2)',
            attemptStatus: 'complete',
            totalAnswered: 1,
            totalCorrect: 1,
            totalIdk: 0,
            totalEarned: 1,
            totalPossible: 1,
            scorePercent: 100,
            byQuestion: {
              0: { status: '-2+3', answerSummary: '=HYPERLINK("http://x")', confidence: 'high', aiFeedback: '\t@cmd\nnext' },
            },
          },
        ],
      }
    );
    const gCsv = buildGradebookCsv();
    expect(gCsv.startsWith('\uFEFFStudent,Attempt status,')).toBe(true);
    expect(gCsv).toContain('"\'  +SUM(A1:A2)"');
    expect(gCsv).toContain('"\'-2+3"');
    expect(gCsv).toContain('"\'=HYPERLINK(""http://x"")"');
    expect(gCsv).toContain('"\'\t@cmd\nnext"');
  });

  it('view_history_panel RTI CSV export neutralizes formulas, tolerates non-Date timestamps, strips config newlines, and prepends UTF-8 BOM', () => {
    const hSrc = readFileSync(resolve(ROOT, 'view_history_panel_module.js'), 'utf8');
    // Indentation-insensitive: the handler moved deeper when the row was re-wrapped.
    const rtiStart = hSrc.search(/onClick: \(e\) => \{\s*e\.stopPropagation\(\);\s*const rtiCsvCell/);
    if (rtiStart < 0) throw new Error('Missing RTI CSV handler');
    const rtiEnd = hSrc.indexOf('className: `min-h-11 rounded-lg px-2', rtiStart);
    if (rtiEnd < 0) throw new Error('Missing RTI CSV handler end');
    const rtiHandlerSrc = hSrc.slice(rtiStart, rtiEnd);
    const body = rtiHandlerSrc.slice('onClick: '.length).replace(/,\s*$/, '');
    const { captured, MemBlob, urlApi, docStub } = makeCsvCaptureEnv();
    const clickFn = new Function(
      'itemDate', 'itemData', 'itemTitle', 'itemConfigSummary',
      'getSafeArraySnapshot', 'getSafeArtifactField', 'getSafeRowText',
      'Blob', 'URL', 'document', 'addToast', '_hpCopy', 't',
      'return (' + body + ');'
    )(
      '2026-11-15T12:00:00.000Z',
      [{ targetWord: '=CMD()' }, { word: '"quoted",word' }, { displayWord: '|pipe' }],
      '+Evil Title',
      'K-2\nPhonics',
      (d) => (Array.isArray(d) ? d : []),
      (o, k) => o && o[k],
      (v, fb) => (v == null ? fb : String(v)),
      MemBlob, urlApi, docStub, vi.fn(), (_t, _k, fb) => fb, (k) => k
    );
    clickFn({ stopPropagation: vi.fn() });
    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe('text/csv;charset=utf-8');
    expect(captured[0].text.startsWith('\uFEFF# Config: K-2 Phonics\r\nDate,Resource,Word,Activity,TotalWords\r\n')).toBe(true);
    expect(captured[0].text).toContain('"\'+Evil Title"');
    expect(captured[0].text).toContain('"\'=CMD()"');
    expect(captured[0].text).toContain('"""quoted"",word"');
    expect(captured[0].text).toContain('"\'|pipe"');
    expect(captured[0].filename).toBe('word-sounds-2026-11-15.csv');
  });

  it('fluency_module guards | and leading \\n formulas and prepends UTF-8 BOM in exportFluencyCSV', () => {
    const flSrc = readFileSync(resolve(ROOT, 'fluency_module.js'), 'utf8');
    const cellFn = new Function(sliceBetween(flSrc, '  function _fluencyCsvCell(value) {', '\n  function exportFluencyCSV') + '\nreturn _fluencyCsvCell;')();
    expect(cellFn('|calc')).toBe('"\'|calc"');
    expect(cellFn('\n=1+1')).toBe('"\'\n=1+1"');

    const { captured, MemBlob, urlApi, docStub } = makeCsvCaptureEnv();
    const ok = Fluency.exportFluencyCSV([
      {
        type: 'fluency-record',
        timestamp: 1787184000000,
        data: { sourceText: 'Read aloud', metrics: { wcpm: 55, accuracy: 95, totalWords: 10, durationSeconds: 12 }, review: { status: 'reviewed', reviewer: '|cmd' } },
      },
    ], { BlobCtor: MemBlob, documentRef: docStub, urlApi, formatDate: () => '11/15/2026' });
    expect(ok).toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe('text/csv;charset=utf-8;');
    expect(captured[0].text.startsWith('\uFEFFDate,Passage,WCPM,')).toBe(true);
    expect(captured[0].text).toContain('"\'|cmd"');
  });

  it('view_pdf_audit remediation history CSV button neutralizes formula prefixes and prepends UTF-8 BOM', () => {
    const paSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_module.js'), 'utf8');
    // Start at the run-history panel: earlier buttons share the same opening.
    const btnFn = sliceBetween(paSrc.slice(paSrc.indexOf('"data-help-key": "pdf_audit_run_history_panel"')), '/* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {', '\n      }, className: "ml-auto px-2 py-0.5');
    const clickBody = btnFn.replace(/^[\s\S]*?onClick:\s*/, '');
    let savedBlob = null;
    let savedName = null;
    const { MemBlob } = makeCsvCaptureEnv();
    const onClick = new Function('_hist', 'safeDownloadBlob', 'Blob', 'return (' + clickBody + '\n      });')(
      [{ at: '2026-11-15T10:00:00Z', fileName: '=CMD()', source: 'single', outcome: 'ok', verificationState: 'verified', failStage: '|pipe', failReason: '\n+bad' }],
      (blob, name) => { savedBlob = blob; savedName = name; },
      MemBlob
    );
    onClick();
    expect(savedName).toBe('alloflow-remediation-history.csv');
    expect(savedBlob.type).toBe('text/csv;charset=utf-8');
    expect(savedBlob.text.startsWith('\uFEFFdate,file,source,')).toBe(true);
    expect(savedBlob.text).toContain('"\'=CMD()"');
    expect(savedBlob.text).toContain('"\'|pipe"');
    expect(savedBlob.text).toContain('"\'\n+bad"');
  });
});

describe('Wave 72: Print popup opener isolation & selected:false curation parity', () => {
  it('export_handlers_module severs printWindow.opener = null on both print/worksheet paths', async () => {
    const makePopup = () => ({
      opener: window,
      document: { readyState: 'complete', images: [], write: vi.fn(), close: vi.fn() },
      print: vi.fn(),
      focus: vi.fn(),
    });

    const p1 = makePopup();
    vi.spyOn(window, 'open').mockReturnValueOnce(p1);
    const res1 = await ExportHandlers.executeExportFromPreview({
      _docPipeline: {},
      exportPreviewMode: 'print',
      exportPreviewRef: { current: null },
      generateFullPackHTML: () => '<!doctype html><html><body><p>Worksheet</p></body></html>',
      getExportableHistory: () => [{ id: '1', type: 'leveled-text' }],
      getSkippedResources: () => [],
      sourceTopic: 'Cells',
      studentResponses: {},
      exportConfig: {},
      history: [],
      addToast: vi.fn(),
      t: (k) => k,
      setShowExportPreview: vi.fn(),
    });
    expect(res1).toBe(true);
    expect(p1.opener).toBeNull();
    expect(p1.__alloflowPrintExport).toBe(true);

    const p2 = makePopup();
    vi.spyOn(window, 'open').mockReturnValueOnce(p2);
    await ExportHandlers.handleExport('worksheet', {
      _docPipeline: {},
      generateFullPackHTML: () => '<!doctype html><html><body><p>Direct Worksheet</p></body></html>',
      getExportableHistory: () => [{ id: '2', type: 'quiz' }],
      getSkippedResources: () => [],
      sourceTopic: 'Cells',
      studentResponses: {},
      exportConfig: {},
      history: [],
      addToast: vi.fn(),
      t: (k) => k,
    });
    expect(p2.opener).toBeNull();
    expect(p2.__alloflowPrintExport).toBe(true);
  });

  it('export_handlers_module and export_module exclude selected:false entries across glossary, frames, flashcards, word-wall, and word lists', async () => {
    const glossaryItems = [
      { term: 'KeepTerm', def: 'Stays' },
      { term: 'DropIsSelected', def: 'Out1', isSelected: false },
      { term: 'DropSelected', def: 'Out2', selected: false },
    ];
    const readableGl = ExportHandlers.getReadableContent({
      activeView: 'glossary',
      generatedContent: { type: 'glossary', data: glossaryItems },
    });
    expect(readableGl.map((x) => x.text).join('\n')).toContain('KeepTerm');
    expect(readableGl.map((x) => x.text).join('\n')).not.toContain('DropSelected');

    const readableSf = ExportHandlers.getReadableContent({
      activeView: 'sentence-frames',
      generatedContent: { type: 'sentence-frames', data: [{ text: 'KeepFrame' }, { text: 'DropFrame', selected: false }] },
    });
    expect(readableSf.map((x) => x.text).join('\n')).toContain('KeepFrame');
    expect(readableSf.map((x) => x.text).join('\n')).not.toContain('DropFrame');

    const slidesHtml = ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Cells',
      gradeLevel: '6',
      getExportableHistory: () => [
        { id: 'fc1', type: 'flashcards', title: 'Cards', data: [{ front: 'KeepCard', back: 'Ans' }, { front: 'DropCard', back: 'X', selected: false }] },
        { id: 'ww1', type: 'word-wall', title: 'Wall', data: [{ term: 'KeepWall', def: 'D' }, { term: 'DropWall', def: 'D', selected: false }] },
      ],
      exportConfig: { audience: 'teacher', includeTeacherKey: true },
    });
    expect(slidesHtml).toContain('KeepCard');
    expect(slidesHtml).not.toContain('DropCard');
    expect(slidesHtml).toContain('KeepWall');
    expect(slidesHtml).not.toContain('DropWall');

    const ctx = ExportHandlers.getLessonContext([{ id: 'g1', type: 'glossary', data: glossaryItems }]);
    expect(ctx).toContain('KeepTerm');
    expect(ctx).not.toContain('DropSelected');

    // Wave 72 checks on export_module.js (Slides & _gxCsv)
    const capturedBlobs = [];
    class CaptureBlob { constructor(parts, opts) { this.text = parts.map(String).join(''); this.type = opts && opts.type; capturedBlobs.push(this); } }
    vi.stubGlobal('Blob', CaptureBlob);
    window.Blob = CaptureBlob;
    const slidesOut = [];
    window.PptxGenJS = class {
      constructor() { this.ShapeType = { rect: 'rect' }; }
      defineSlideMaster() {}
      addSlide() { const s = { texts: [], tables: [], addText(t) { this.texts.push(t); }, addShape() {}, addTable(r) { this.tables.push(r); }, addNotes() {} }; slidesOut.push(s); return s; }
      writeFile() { return Promise.resolve('out.pptx'); }
    };
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:m';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:m');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const exporter = window.AlloModules.createExport({
      liveRef: {
        current: {
          history: [
            { id: 'g', type: 'glossary', title: 'G', data: glossaryItems },
            { id: 'fc', type: 'flashcards', title: 'F', data: [{ front: 'KeepSlideCard', back: 'B' }, { front: 'DropSlideCard', back: 'B', selected: false }] },
            { id: 'ww', type: 'word-wall', title: 'W', data: [{ word: 'KeepSlideWall', definition: 'D' }, { word: 'DropSlideWall', definition: 'D', selected: false }] },
          ],
          generatedContent: { id: 'gl-w72', type: 'glossary', data: [{ term: '=KeepFormula', def: '\n=Def', tier: 'Tier 2' }, { term: 'DropWlSelected', def: 'D', selected: false }] },
          sourceTopic: 'Cells',
          gradeLevel: '6',
          exportConfig: { audience: 'teacher', includeTeacherKey: true },
          addToast: vi.fn(),
          t: (_k, fb) => fb || _k,
          getDefaultTitle: (tp) => tp,
        },
      },
      warnLog: () => {},
      debugLog: () => {},
      escapeXml: (v) => String(v),
      generateUUID: () => 'u1',
    });
    await exporter.handleExportSlides();
    const slideDump = JSON.stringify(slidesOut);
    expect(slideDump).toContain('KeepTerm');
    expect(slideDump).not.toContain('DropSelected');
    expect(slideDump).toContain('KeepSlideCard');
    expect(slideDump).not.toContain('DropSlideCard');
    expect(slideDump).toContain('KeepSlideWall');
    expect(slideDump).not.toContain('DropSlideWall');

    const csvOk = exporter.handleExportGlossaryFile('csv', { scope: 'selected' });
    expect(csvOk).toBe(true);
    expect(capturedBlobs).toHaveLength(1);
    expect(capturedBlobs[0].text).toContain("'=KeepFormula,");
    expect(capturedBlobs[0].text).toContain('"\'\n=Def"');
    expect(capturedBlobs[0].text).not.toContain('DropWlSelected');
  });
});

describe('Wave 73: ConfirmDialog, StorybookExportModal & AssignmentCenterModal focus-stack & isolation parity', () => {
  it('ConfirmDialog isolates ancestor & body siblings, retains opener focus across re-renders, wraps Shift+Tab from dialog, and guards IME Escape', () => {
    const outerSibling = document.createElement('section');
    outerSibling.innerHTML = '<button type="button">Outer</button>';
    document.body.appendChild(outerSibling);
    const scriptNode = document.createElement('script');
    document.body.appendChild(scriptNode);

    const onCancel = vi.fn();
    function Harness() {
      const [cfg, setCfg] = React.useState(null);
      const [tick, setTick] = React.useState(0);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('main', { id: 'inner-bg' },
          React.createElement('button', {
            id: 'cd-opener',
            type: 'button',
            onClick: () => setCfg({ title: 'Delete?', message: 'Sure?', onConfirm: vi.fn(), onCancel }),
          }, 'Open'),
          React.createElement('button', { id: 'rerender-btn', type: 'button', onClick: () => setTick((t) => t + 1) }, String(tick))
        ),
        cfg ? React.createElement(ConfirmDialog, { confirmDialog: { ...cfg, detail: 'rev ' + tick }, setConfirmDialog: setCfg, t: () => '' }) : null
      );
    }
    mountComp(Harness, {});
    const opener = document.getElementById('cd-opener');
    opener.focus();
    act(() => opener.click());

    const innerBg = document.getElementById('inner-bg');
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(innerBg.hasAttribute('inert')).toBe(true);
    expect(innerBg.getAttribute('aria-hidden')).toBe('true');
    expect(outerSibling.hasAttribute('inert')).toBe(true);
    expect(outerSibling.getAttribute('aria-hidden')).toBe('true');
    expect(scriptNode.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');

    // Re-render parent while open: must keep stack size 1 and retain opener focus reference
    act(() => document.getElementById('rerender-btn').click());
    expect(window.__alloFocusTrapStack).toHaveLength(1);

    // Shift+Tab from dialog container wraps to last button (Confirm)
    dialog.focus();
    const btns = Array.from(dialog.querySelectorAll('button'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(btns[btns.length - 1]);

    // IME Escape does not close
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })));
    expect(onCancel).not.toHaveBeenCalled();

    // Real Escape closes & restores scroll, siblings, and original opener focus
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('');
    expect(outerSibling.hasAttribute('inert')).toBe(false);
    expect(innerBg.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('StorybookExportModal guards IME Escape, wraps Shift+Tab from dialog container, and skips link/template siblings', () => {
    const linkNode = document.createElement('link');
    document.body.appendChild(linkNode);
    const bgNode = document.createElement('aside');
    document.body.appendChild(bgNode);
    const onClose = vi.fn();
    const { host } = mountComp(StorybookExportModal, {
      handleExportStorybook: vi.fn(),
      handleSetShowStorybookExportModalToFalse: onClose,
      isProcessing: false,
      setShowStorybookExportModal: vi.fn(),
      t: (k) => k,
    });
    expect(linkNode.hasAttribute('inert')).toBe(false);
    expect(bgNode.hasAttribute('inert')).toBe(true);
    const dialog = host.querySelector('[role="dialog"]');
    dialog.focus();
    const buttons = Array.from(dialog.querySelectorAll('button:not([disabled])'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AssignmentCenterModal joins shared focus trap stack, isolates siblings, yields Escape to nested ConfirmDialog, and restores on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const outer = document.createElement('div');
    document.body.appendChild(outer);

    const onClose = vi.fn();
    const noop = () => {};
    function Harness() {
      const [showConfirm, setShowConfirm] = React.useState(false);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(AssignmentCenterModal, {
          t: () => '',
          isOpen: true,
          rowViews: [],
          onClose,
          onActivityChange: noop,
          onSurveyItemChange: noop,
          onSurveyItemRemove: noop,
          onSurveyItemAdd: noop,
          onPollAskChange: noop,
          onSuggestPollTimes: noop,
          onCreateLink: noop,
          onFilterChange: noop,
          onRefresh: noop,
          onExportCsv: noop,
        }),
        React.createElement('button', { id: 'open-nested-cd', type: 'button', onClick: () => setShowConfirm(true) }),
        showConfirm ? React.createElement(ConfirmDialog, { confirmDialog: { message: 'Nested?', onConfirm: noop }, setConfirmDialog: setShowConfirm, t: () => '' }) : null
      );
    }
    const { host } = mountComp(Harness, {});
    const acDialog = host.querySelector('[role="dialog"]');
    expect(acDialog).not.toBeNull();
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(acDialog);
    expect(outer.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    // Open nested ConfirmDialog on top -> Escape must close ConfirmDialog ONLY, not AssignmentCenterModal
    act(() => document.getElementById('open-nested-cd').click());
    expect(window.__alloFocusTrapStack).toHaveLength(2);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    // IME Escape ignored, normal Escape closes AssignmentCenterModal
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Wave 74: FaqView & ConceptSortView deselected curation parity + 4-mirror SHA-256 parity', () => {
  it('FaqView excludes isSelected:false and selected:false in learner view, updates Show/Hide all and empty state, and retains all in teacher/editing view', () => {
    const items = [
      { question: 'Shown Q', answer: 'Shown A' },
      { question: 'Hidden IsSelected Q', answer: 'Secret 1', isSelected: false },
      { question: 'Hidden Selected Q', answer: 'Secret 2', selected: false },
    ];
    const baseProps = {
      t: (k) => k,
      isTeacherMode: false,
      isEditingFaq: false,
      generatedContent: { id: 'faq-w74', type: 'faq', data: items },
      history: [],
      splitTextToSentences: (s) => [s],
      formatInteractiveText: (s) => s,
      renderFormattedText: (s) => s,
      formatInlineText: (s) => s,
    };
    const { host: studentHost } = mountComp(FaqView, baseProps);
    expect(studentHost.textContent).toContain('Shown Q');
    expect(studentHost.textContent).not.toContain('Hidden IsSelected Q');
    expect(studentHost.textContent).not.toContain('Hidden Selected Q');
    const toggleBtn = studentHost.querySelector('[data-faq-toggle-all]');
    expect(toggleBtn.className).toContain('min-h-11');
    act(() => toggleBtn.click());
    expect(studentHost.textContent).toContain('Shown A');
    expect(studentHost.querySelector('[data-faq-toggle-all]').textContent).toContain('Hide all');

    const { host: emptyStudentHost } = mountComp(FaqView, {
      ...baseProps,
      generatedContent: { id: 'faq-empty', type: 'faq', data: [{ question: 'Only Hidden', answer: 'A', isSelected: false }] },
    });
    expect(emptyStudentHost.querySelector('[data-faq-empty]')).not.toBeNull();

    const { host: teacherHost } = mountComp(FaqView, { ...baseProps, isTeacherMode: true });
    expect(teacherHost.textContent).toContain('Hidden IsSelected Q');
    expect(teacherHost.textContent).toContain('Hidden Selected Q');
  });

  it('ConceptSortView passes deselected-filtered categories & items to ConceptSortGame in student/independent mode and keeps raw data in teacher mode', () => {
    const seenGameProps = [];
    const MockGame = (props) => {
      seenGameProps.push(props.data);
      return React.createElement('div', { 'data-mock-game': '1' });
    };
    const rawData = {
      categories: [
        { id: 'c1', label: 'Metals' },
        { id: 'c2', label: 'Dropped Cat', isSelected: false },
      ],
      items: [
        { id: 'i1', content: 'Iron', categoryId: 'c1' },
        { id: 'i2', content: 'Dropped Item A', categoryId: 'c1', isSelected: false },
        { id: 'i3', content: 'Dropped Item B', categoryId: 'c1', selected: false },
        { id: 'i4', content: 'Item In Dropped Cat', categoryId: 'c2' },
      ],
    };
    const csProps = {
      t: (k) => k,
      isTeacherMode: false,
      isIndependentMode: false,
      isConceptSortGame: true,
      generatedContent: { id: 'cs-w74', type: 'concept-sort', data: rawData },
      ConceptSortGame: MockGame,
      ErrorBoundary: (p) => p.children,
    };

    mountComp(ConceptSortView, csProps);
    mountComp(ConceptSortView, { ...csProps, isTeacherMode: true, isIndependentMode: true });
    mountComp(ConceptSortView, { ...csProps, isTeacherMode: true, isIndependentMode: false });

    expect(seenGameProps).toHaveLength(3);
    expect(seenGameProps[0].categories.map((c) => c.id)).toEqual(['c1']);
    expect(seenGameProps[0].items.map((i) => i.id)).toEqual(['i1']);
    expect(seenGameProps[1].items.map((i) => i.id)).toEqual(['i1']);
    expect(seenGameProps[2]).toBe(rawData);
  });

  it('keeps all 12 Wave 71-74 modules byte-for-byte identical across all 4 release mirrors', () => {
    const mods = [
      'export_module.js',
      'export_handlers_module.js',
      'fluency_module.js',
      'view_quiz_module.js',
      'view_history_panel_module.js',
      'view_pdf_audit_module.js',
      'document_narration_text_module.js',
      'view_confirm_dialog_module.js',
      'view_storybook_export_modal_module.js',
      'view_assignment_center_module.js',
      'view_faq_module.js',
      'view_concept_sort_module.js',
    ];
    for (const mod of mods) {
      const expected = sha256(resolve(ROOT, mod));
      for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        expect(sha256(resolve(ROOT, mirror, mod)), `${mirror}/${mod}`).toBe(expected);
      }
    }
  });
});
