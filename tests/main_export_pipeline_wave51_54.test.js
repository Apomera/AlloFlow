// Verification suite for Waves 51-54:
// - Wave 51: PowerPoint option-card emphasis runs & relation-mismatch partner shuffling,
//            H5P SingleChoiceSet 1.11 compatibility with incomplete draft MCQs + Builder preflight parity,
//            and IMS liveHtml clean round-trip + expanded teacher-only selector stripping
// - Wave 52: Read-aloud modal dialog WCAG accessibility (aria-labelledby, Escape, Tab/Shift+Tab trap, focus restore)
// - Wave 53: PDF Audit / Alt-Format / Narration teacher-only selector parity + structured MathML & sup/sub linearization
// - Wave 54: handleExportProfiles Blob/objectURL safety + 4-mirror SHA-256 parity

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let preflight;
let auditHelpers;

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function loadAuditHelpers() {
  const src = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const structuredStart = src.indexOf('function _htmlToStructuredText(html, markdown) {');
  const docxStart = src.indexOf('function _htmlToDocxSpec(html) {');
  const brfEnd = src.indexOf('\n// _buildDocxBlobFromSpec:', docxStart);
  const speechStart = src.indexOf('const _ALLO_TEACHER_ONLY_SEL =');
  const speechEnd = src.indexOf('function _audioReadyText(', speechStart);
  if ([structuredStart, docxStart, brfEnd, speechStart, speechEnd].some((i) => i < 0)) {
    throw new Error('Extraction markers missing in view_pdf_audit_source.jsx');
  }
  const standaloneStructuredText = new Function(
    src.slice(structuredStart, docxStart) + '; return _htmlToStructuredText;'
  )();
  const integrated = new Function(
    src.slice(speechStart, speechEnd) + '\n' +
    src.slice(structuredStart, brfEnd) +
    '; return { _htmlToStructuredText, _htmlToPlainTextExport, _htmlToMarkdownExport, _htmlToDtbookXml, _buildEpubPackageFiles, _altFmtHtmlToPlainText };'
  )();
  return { ...integrated, standaloneStructuredText };
}

function setupExporter(liveOverrides = {}) {
  const captured = { blobs: [], zips: [], toasts: [], downloads: [], slides: [], anchors: [] };
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
        addText(t, opts) { this.texts.push({ raw: t, opts: opts || {} }); },
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
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    captured.blobs.push(blob);
    return `blob:mock-${captured.blobs.length}`;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function onClick() {
    captured.anchors.push({ href: this.getAttribute('href'), download: this.getAttribute('download') });
    captured.downloads.push(this.download || this.getAttribute('download') || '');
  });

  const defaultLive = {
    history: [],
    generatedContent: null,
    profiles: [],
    sourceTopic: 'Marine Ecosystems',
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
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  window.__alloT = (k) => k;
  window.AlloIcons = window.AlloIcons || {};
  window.AlloModules = window.AlloModules || {};

  new Function('window', readFileSync(resolve(ROOT, 'view_quiz_module.js'), 'utf8'))(window);
  loadAlloModule('document_narration_text_module.js');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_export_preview_module.js');
  loadAlloModule('view_pdf_audit_module.js');

  const epSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  preflight = new Function(
    epSrc.slice(epSrc.indexOf('function _builderH5PCompatibility'), epSrc.indexOf('function _builderEditorPageCss')) +
    '\nreturn _builderH5PCompatibility;'
  )();
  auditHelpers = loadAuditHelpers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.PptxGenJS;
  delete window.JSZip;
  document.querySelectorAll('[role="dialog"]').forEach((el) => {
    try { el.remove(); } catch (_) {}
  });
});

describe('Wave 51 — Slides emphasis & relation-mismatch shuffling, H5P SingleChoiceSet parity, IMS liveHtml fidelity', () => {
  it('preserves bold/italic/code runs on PowerPoint option cards and shuffles relation-mismatch candidatePartners for students only', async () => {
    const rmPartners = ['Chloroplast — makes glucose', 'Mitochondria — releases ATP', 'Ribosome — builds proteins'];
    const quizItem = {
      id: 'qz-w51',
      type: 'quiz',
      title: 'Cell Biology Quiz',
      data: {
        questions: [
          {
            id: 'q1',
            type: 'mcq',
            question: 'Which organism uses **photosynthesis**?',
            options: ['*Chlamydomonas reinhardtii*', '   ', 'Mushroom', '`Cyanobacteria`'],
            correctAnswer: '*Chlamydomonas reinhardtii*',
          },
          {
            id: 'q2',
            type: 'relation-mismatch',
            question: 'Identify the mismatched pair and select the right partner.',
            pairs: [
              { left: 'Plant cell', right: 'Chloroplast — makes glucose' },
              { left: 'Animal cell', right: 'Chloroplast — makes glucose' },
            ],
            wrongPairIndex: 1,
            correctPartnerForWrong: 'Mitochondria — releases ATP',
            candidatePartners: rmPartners,
          },
        ],
      },
    };

    const studentSetup = setupExporter({
      history: [quizItem],
      exportConfig: { audience: 'student', includeTeacherKey: false },
    });
    expect(await studentSetup.exporter.handleExportSlides({ includeSlideAnswerKey: false })).toBe(true);

    const runArrays = studentSetup.captured.slides.flatMap((s) => s.texts.map((t) => t.raw)).filter(Array.isArray);
    const flatRuns = runArrays.flat();
    expect(flatRuns.find((r) => r.text === 'Chlamydomonas reinhardtii')?.options.italic).toBe(true);
    expect(flatRuns.find((r) => r.text === 'Cyanobacteria')?.options.fontFace).toBe('Courier New');
    expect(flatRuns.filter((r) => String(r.text || '').trim() === '')).toHaveLength(0);
    expect(studentSetup.captured.slides.flatMap((s) => s.shapes).filter((sh) => sh.type === 'rect')).toHaveLength(3);

    const studentRmLine = JSON.stringify(studentSetup.captured.slides);
    const expectedOrder = rmPartners.join('  |  ');
    expect(studentRmLine).toContain('Candidate partners: ');
    expect(studentRmLine).not.toContain(expectedOrder);

    const teacherSetup = setupExporter({
      history: [quizItem],
      exportConfig: { audience: 'teacher', includeTeacherKey: true },
    });
    expect(await teacherSetup.exporter.handleExportSlides({ includeSlideAnswerKey: true })).toBe(true);
    expect(JSON.stringify(teacherSetup.captured.slides)).toContain(expectedOrder);
  });

  it('keeps H5P.SingleChoiceSet 1.11 in both exporter and Builder preflight when incomplete <2-option drafts accompany valid MCQs', async () => {
    const questions = [
      { type: 'mcq', question: 'Which gas do plants absorb?', options: ['Carbon dioxide', 'Neon'], correctAnswer: 'Carbon dioxide' },
      { type: 'mcq', question: 'Draft without second choice', options: ['Only one'], correctAnswer: 'Only one' },
    ];
    const compat = preflight({ type: 'quiz', data: { questions } });
    expect(compat).toMatchObject({ library: 'Single Choice Set 1.11', total: 2, valid: 1, omitted: 1, ready: true });

    const { exporter, captured } = setupExporter({
      generatedContent: { type: 'quiz', title: 'Gas Exchange', data: { questions } },
    });
    expect(await exporter.handleExportH5P()).toBe(true);

    const h5pJson = JSON.parse(captured.zips[0].files['h5p.json']);
    expect(h5pJson.mainLibrary).toBe('H5P.SingleChoiceSet');
    expect(h5pJson.preloadedDependencies).toEqual([{ machineName: 'H5P.SingleChoiceSet', majorVersion: 1, minorVersion: 11 }]);
    const contentJson = JSON.parse(captured.zips[0].files['content/content.json']);
    expect(contentJson.choices).toHaveLength(1);
    expect(captured.toasts.some((t) => t.kind === 'warning' && t.msg.includes('1 incompatible or incomplete item(s)'))).toBe(true);

    const multiCompat = preflight({
      type: 'quiz',
      data: { questions: [...questions, { type: 'mcq', question: 'Five choices', options: ['A', 'B', 'C', 'D', 'E'], correctIndex: 0 }] },
    });
    expect(multiCompat.library).toBe('Question Set 1.21');
  });

  it('preserves clean liveHtml verbatim in IMS export while stripping newly expanded teacher-only selectors', async () => {
    const cleanLive = '<!DOCTYPE html><html lang="en"><head><title>Edited Student Page</title></head><body><main><h1>Ecosystems</h1><p>Producers capture sunlight.</p></main></body></html>';
    const cleanSetup = setupExporter({ exportConfig: { audience: 'student', includeTeacherKey: false } });
    await cleanSetup.exporter.handleExportIMS({ liveHtml: cleanLive, liveTitle: 'Ecosystems' });
    expect(cleanSetup.captured.zips[0].files['resource_0.html']).toBe(cleanLive);

    const dirtyLive = [
      '<!DOCTYPE html><html lang="en"><head><title>Dirty</title></head><body><main>',
      '<p>Visible student prompt</p>',
      '<div class="alloflow-teacher-notes">LEAK_NOTES</div>',
      '<div class="alloflow-rubric-key">LEAK_RUBRIC</div>',
      '<div class="alloflow-model-answer">LEAK_MODEL</div>',
      '<div class="alloflow-sample-response">LEAK_SAMPLE</div>',
      '<div class="alloflow-scoring-guide">LEAK_SCORING</div>',
      '<aside data-teacher-note="1">LEAK_ATTR_NOTE</aside>',
      '<div data-answer-key="1">LEAK_ATTR_KEY</div>',
      '</main></body></html>',
    ].join('');
    const dirtySetup = setupExporter({ exportConfig: { audience: 'student', includeTeacherKey: false } });
    await dirtySetup.exporter.handleExportIMS({ liveHtml: dirtyLive, liveTitle: 'Ecosystems' });
    const packaged = dirtySetup.captured.zips[0].files['resource_0.html'];
    expect(packaged).toContain('Visible student prompt');
    expect(packaged).not.toContain('LEAK_NOTES');
    expect(packaged).not.toContain('LEAK_RUBRIC');
    expect(packaged).not.toContain('LEAK_MODEL');
    expect(packaged).not.toContain('LEAK_SAMPLE');
    expect(packaged).not.toContain('LEAK_SCORING');
    expect(packaged).not.toContain('LEAK_ATTR_NOTE');
    expect(packaged).not.toContain('LEAK_ATTR_KEY');
  });
});

describe('Wave 52 — Read-aloud modal dialog WCAG keyboard & focus accessibility', () => {
  it('binds aria-labelledby, traps Tab/Shift+Tab, dismisses on Escape, and restores trigger focus', async () => {
    const eh = window.AlloModules.ExportHandlers;
    const trigger = document.createElement('button');
    trigger.textContent = 'Export HTML';
    document.body.appendChild(trigger);
    trigger.focus();

    const exportPromise = eh.executeExportFromPreview({
      _docPipeline: {},
      exportPreviewMode: 'html',
      callTTS: vi.fn(),
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBe('allo-read-aloud-modal-title');
    expect(document.getElementById(titleId)?.tagName).toBe('H2');

    const continueBtn = dialog.querySelector('[data-r="continue"]');
    const firstRadio = dialog.querySelector('input[name="allo-audio-variant"][value="standard"]');
    expect(document.activeElement).toBe(continueBtn);

    continueBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(firstRadio);

    firstRadio.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(continueBtn);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await exportPromise;

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('focuses an enabled action button when TTS embedding is unavailable', async () => {
    const eh = window.AlloModules.ExportHandlers;
    const promise = eh.executeExportFromPreview({
      _docPipeline: {},
      exportPreviewMode: 'html',
      callTTS: null,
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const noBtn = dialog.querySelector('[data-r="no"]');
    expect(document.activeElement).toBe(noBtn);
    expect(document.activeElement.disabled).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await promise;
  });
});

describe('Wave 53 — PDF Audit & Alt-Format expanded teacher exclusion, MathML linearization, and sup/sub formatting', () => {
  it('excludes expanded teacher-only selectors across structured text, plainText, epub, daisy, and AlloNarrationText', () => {
    const sample = [
      '<html><head><title>Lab</title></head><body>',
      '<p>Student question: Calculate density.</p>',
      '<div class="alloflow-teacher-notes">HIDDEN_TN</div>',
      '<div class="alloflow-rubric-key">HIDDEN_RK</div>',
      '<div class="alloflow-model-answer">HIDDEN_MA</div>',
      '<div class="alloflow-sample-response">HIDDEN_SR</div>',
      '<div class="alloflow-scoring-guide">HIDDEN_SG</div>',
      '<div id="alloflow-interactive-object-profile">HIDDEN_IOP</div>',
      '<p data-teacher-note="true">HIDDEN_DTN</p>',
      '<p data-answer-key="true">HIDDEN_DAK</p>',
      '</body></html>',
    ].join('');

    const structured = auditHelpers.standaloneStructuredText(sample, true);
    const bundledPlain = auditHelpers._htmlToPlainTextExport(sample);
    const altPlain = window.AlloModules.AltFormatExports.plainText(sample);
    const daisy = window.AlloModules.AltFormatExports.daisy(sample);
    const epub = window.AlloModules.AltFormatExports.epub(sample);
    const epubBody = epub.files['OEBPS/content.xhtml'];
    const narrationApi = new Function(readFileSync(resolve(ROOT, 'document_narration_text_module.js'), 'utf8') + '\nreturn AlloNarrationText;')();
    const natural = narrationApi.naturalText(sample);
    const naturalExported = window.AlloModules.DocumentNarrationExports.naturalText(sample);

    for (const out of [structured, bundledPlain, altPlain, daisy.files['dtbook.xml'], epubBody, natural, naturalExported]) {
      expect(out).toContain('Calculate density');
      expect(out).not.toContain('HIDDEN_TN');
      expect(out).not.toContain('HIDDEN_RK');
      expect(out).not.toContain('HIDDEN_MA');
      expect(out).not.toContain('HIDDEN_SR');
      expect(out).not.toContain('HIDDEN_SG');
      expect(out).not.toContain('HIDDEN_IOP');
      expect(out).not.toContain('HIDDEN_DTN');
      expect(out).not.toContain('HIDDEN_DAK');
    }

    const withTeacher = auditHelpers.standaloneStructuredText(sample, false, { includeTeacherOnly: true });
    expect(withTeacher).toContain('HIDDEN_TN');
    expect(withTeacher).toContain('HIDDEN_DAK');
    const epubWithTeacher = window.AlloModules.AltFormatExports.epub(sample, { includeTeacherOnly: true });
    const daisyWithTeacher = window.AlloModules.AltFormatExports.daisy(sample, { includeTeacherOnly: true });
    expect(epubWithTeacher.files['OEBPS/content.xhtml']).toContain('HIDDEN_TN');
    expect(daisyWithTeacher.files['dtbook.xml']).toContain('HIDDEN_TN');
  });

  it('linearizes MathML mfrac/msup/msub/msubsup/msqrt/mroot and sup/sub in _htmlToStructuredText without breaking aria-label math', () => {
    const html = [
      '<p>Annotated: <math aria-label="E equals m c squared"><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></math></p>',
      '<p>Fraction: <math><mfrac><mi>a</mi><mi>b</mi></mfrac></math> and <math><mfrac><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><mn>2</mn></mfrac></math></p>',
      '<p>Scripts: <math><msup><mi>e</mi><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></msup><mo>+</mo><msubsup><mi>x</mi><mn>0</mn><mn>2</mn></msubsup></math></p>',
      '<p>Radicals: <math><msqrt><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup></mrow></msqrt><mo>=</mo><mroot><mi>y</mi><mn>3</mn></mroot></math></p>',
      '<p>Chemistry: H<sub>2</sub>O, a<sub>i + 1</sub>, 10<sup>6</sup>, and 2<sup>n + 1</sup>.</p>',
    ].join('');

    for (const fn of [auditHelpers.standaloneStructuredText, auditHelpers._htmlToStructuredText]) {
      const plain = fn(html, false);
      const md = fn(html, true);
      for (const out of [plain, md]) {
        expect(out).toContain('E equals m c squared');
        expect(out).toContain('a/b');
        expect(out).toContain('(x+1)/2');
        expect(out).toContain('e^(x+1)+x_0^2');
        expect(out).toContain('sqrt(a^2+b^2)=root(3, y)');
        expect(out).toContain('H_2O');
        expect(out).toContain('a_(i + 1)');
        expect(out).toContain('10^6');
        expect(out).toContain('2^(n + 1)');
      }
    }
  });
});

describe('Wave 54 — Profile export Blob safety & 4-mirror SHA-256 parity', () => {
  it('guards non-array or empty profiles and downloads via Blob + objectURL with delayed revocation', () => {
    vi.useFakeTimers();
    const emptySetup = setupExporter({ profiles: [] });
    emptySetup.exporter.handleExportProfiles();
    expect(emptySetup.captured.blobs).toHaveLength(0);
    expect(emptySetup.captured.downloads).toHaveLength(0);

    const nullSetup = setupExporter({ profiles: null });
    expect(() => nullSetup.exporter.handleExportProfiles()).not.toThrow();
    expect(nullSetup.captured.blobs).toHaveLength(0);

    const profileList = [{ id: 'p1', name: 'Reader Profile', settings: { dyslexiaFont: true } }];
    const validSetup = setupExporter({
      profiles: profileList,
      t: (k) => ({ 'export.filenames.profiles': 'student-profiles', 'profiles.export_success': 'Exported profiles!' }[k] || k),
    });
    validSetup.exporter.handleExportProfiles();

    expect(validSetup.captured.blobs).toHaveLength(1);
    expect(validSetup.captured.blobs[0].type).toContain('application/json');
    expect(validSetup.captured.anchors[0]).toEqual({
      href: 'blob:mock-1',
      download: 'student-profiles.json',
    });
    expect(validSetup.captured.toasts).toContainEqual({ msg: 'Exported profiles!', kind: 'success' });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
    vi.useRealTimers();
  });

  it('keeps Waves 51-54 runtime modules byte-identical across all 4 deploy mirrors', () => {
    const mirrors = ['.', 'desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
    const modules = [
      'export_module.js',
      'view_export_preview_module.js',
      'view_pdf_audit_module.js',
      'document_narration_text_module.js',
      'export_handlers_module.js',
    ];
    for (const mod of modules) {
      const rootHash = sha256(resolve(ROOT, mod));
      for (const dir of mirrors.slice(1)) {
        const target = resolve(ROOT, dir, mod);
        if (existsSync(target)) {
          expect(sha256(target), `${dir}/${mod} should match root ${mod}`).toBe(rootHash);
        }
      }
    }
  });
});
