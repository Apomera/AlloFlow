// Verification suite for Waves 55-58:
// - Wave 55: MathML <msubsup>/<mroot> & compound base/script parenthesization parity across
//            Builder Plain-Text/Braille (_builderPolishPlainTextClone), Markdown (_builderMarkdownFromRoot),
//            and Office/DAISY (_htmlToDocxSpec -> _mathReadableText & AltFormatExports.daisy)
// - Wave 56: Slides preview (getSlidesPreviewHTML) and PowerPoint export (handleExportSlides)
//            curation (isSelected !== false), student-copy back gating, candidate shuffling,
//            empty option suppression, and inline markdown stripping
// - Wave 57: Modal focus-trap & screen-reader background isolation hardening for
//            _openBuilderCropModal, openConceptMap3D, and openA11yInspectorEditor
// - Wave 58: 4-mirror SHA-256 parity for all updated bundles

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
let docxSpecFn;
let openBuilderCropModalFactory;

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function setupExporter(liveOverrides = {}) {
  const captured = { blobs: [], toasts: [], downloads: [], slides: [], anchors: [] };
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

  const defaultLive = {
    history: [],
    generatedContent: null,
    profiles: [],
    sourceTopic: 'Cellular Energetics',
    gradeLevel: 'Grade 8',
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

  loadAlloModule('document_narration_text_module.js');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_export_preview_module.js');
  loadAlloModule('view_pdf_audit_module.js');
  loadAlloModule('view_renderers_module.js');

  const epSrc = readFileSync(resolve(ROOT, 'view_export_preview_source.jsx'), 'utf8');
  builderHelpers = new Function(
    epSrc.slice(epSrc.indexOf('const _BUILDER_STYLE_GALLERY'), epSrc.indexOf('function ExportPreviewView')) +
    '\nreturn { markdown: _builderMarkdownFromRoot, polish: _builderPolishPlainTextClone };'
  )();

  const cropStart = epSrc.indexOf('const _cropOrigStore = () => {');
  const cropEnd = epSrc.indexOf("doc.addEventListener('alloflow-builder-crop-image'", cropStart);
  if (cropStart < 0 || cropEnd < 0) throw new Error('Could not locate _openBuilderCropModal slice');
  openBuilderCropModalFactory = new Function(
    'doc',
    't',
    'addToast',
    epSrc.slice(cropStart, cropEnd) + '\nreturn _openBuilderCropModal;'
  );

  const pdfSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
  const docxStart = pdfSrc.indexOf('function _htmlToDocxSpec(html) {');
  const docxEnd = pdfSrc.indexOf('// end _htmlToDocxSpec', docxStart);
  if (docxStart < 0 || docxEnd < 0) throw new Error('Could not locate _htmlToDocxSpec markers');
  docxSpecFn = new Function(pdfSrc.slice(docxStart, docxEnd) + '\nreturn _htmlToDocxSpec;')();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.PptxGenJS;
  delete window.__alloBuilderCropOriginals;
  document.querySelectorAll('#vo-cg3d-overlay, #allo-crop-overlay, #a11y-inspect-editor-overlay, [role="dialog"], script[data-cg-src]').forEach((el) => {
    try {
      if (typeof el.__alloDestroy === 'function') el.__alloDestroy(false);
      else if (typeof el.__alloClose === 'function') el.__alloClose(false);
      else el.remove();
    } catch (_) {}
  });
  document.body.innerHTML = '';
});

describe('Wave 55 — MathML <msubsup>/<mroot> & compound base/script parity across Builder and Office/DAISY', () => {
  it('linearizes compound bases, compound scripts, <msubsup>, <mroot>, and data-allo-latex in Builder plain-text & markdown', () => {
    const doc = document.implementation.createHTMLDocument('StemBuilder');
    doc.body.innerHTML = [
      '<p>Scripts: <math><msubsup><mi>x</mi><mn>0</mn><mn>2</mn></msubsup></math>, ',
      '<math><mroot><mi>y</mi><mn>3</mn></mroot></math>, ',
      '<math><msup><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mn>2</mn></msup></math>, ',
      '<math><msup><mi>e</mi><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></msup></math>, ',
      '<math><msub><mi>a</mi><mrow><mi>i</mi><mo>+</mo><mn>1</mn></mrow></msub></math>, ',
      '<math><msup><mi>x</mi><mn>-1</mn></msup></math>, ',
      '<math data-allo-latex="\\alpha + \\beta"></math></p>',
      '<p>Tags: e<sup>x+1</sup> and a<sub>i+1</sub> and 3<sup>2</sup> and x<sup>-1</sup></p>',
    ].join('');

    const md = builderHelpers.markdown(doc.body.cloneNode(true)).markdown;
    expect(md).toContain('e^(x+1) and a_(i+1) and 3^2 and x^-1');

    const polishClone = doc.body.cloneNode(true);
    builderHelpers.polish(polishClone, doc);
    const polished = polishClone.textContent.replace(/\s+/g, ' ').trim();
    expect(polished).toContain('x_0^2');
    expect(polished).toContain('root(3, y)');
    expect(polished).toContain('(a+b)^2');
    expect(polished).toContain('e^(x+1)');
    expect(polished).toContain('a_(i+1)');
    expect(polished).toContain('x^-1');
    expect(polished).toContain('\\alpha + \\beta');
    expect(polished).toContain('Tags: e^(x+1) and a_(i+1) and 3^2 and x^-1');
  });

  it('produces matching MathML linearization in _htmlToDocxSpec and AltFormatExports.daisy', () => {
    const html = [
      '<!DOCTYPE html><html lang="en"><head><title>Math Parity</title></head><body>',
      '<p><math><msup><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mn>2</mn></msup></math> | ',
      '<math><msup><mi>e</mi><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></msup></math> | ',
      '<math><msub><mi>a</mi><mrow><mi>i</mi><mo>+</mo><mn>1</mn></mrow></msub></math> | ',
      '<math><msubsup><mi>x</mi><mn>0</mn><mn>2</mn></msubsup></math> | ',
      '<math><mroot><mi>y</mi><mn>3</mn></mroot></math></p>',
      '</body></html>',
    ].join('');

    const spec = docxSpecFn(html);
    const paraText = (spec.blocks.find((b) => b.type === 'paragraph')?.runs || []).map((r) => r.text || '').join('');
    const daisyXml = window.AlloModules.AltFormatExports.daisy(html).files['dtbook.xml'];

    for (const out of [paraText, daisyXml]) {
      expect(out).toContain('(a+b)^2');
      expect(out).toContain('e^(x+1)');
      expect(out).toContain('a_(i+1)');
      expect(out).toContain('x_0^2');
      expect(out).toContain('root(3, y)');
    }
  });
});

describe('Wave 56 — Slides preview & PowerPoint curation, flashcard backs, and formatting parity', () => {
  it('filters deselected items, keeps flashcard backs in student decks (hides them only in a check), shuffles relation-mismatch partners, omits blank options, and strips markdown in getSlidesPreviewHTML', () => {
    const rmPartners = ['Chloroplast — sugar', 'Mitochondria — ATP', 'Ribosome — protein'];
    const history = [
      {
        id: 'fc-1',
        type: 'flashcards',
        title: 'Cell Cards',
        data: [
          { front: 'ATP', back: 'Cell energy currency', isSelected: true },
          { front: 'DROPPED_CARD', back: 'Should not appear', isSelected: false },
        ],
      },
      {
        id: 'gl-1',
        type: 'glossary',
        title: 'Key Terms',
        data: [
          { term: 'Osmosis', def: 'Water diffusion', isSelected: true },
          { term: 'DROPPED_TERM', def: 'Should not appear', isSelected: false },
        ],
      },
      {
        id: 'ww-1',
        type: 'word-wall',
        title: 'Wall',
        data: [
          { word: 'Enzyme', definition: 'Catalyst', isSelected: true },
          { word: 'DROPPED_WALL', definition: 'Hidden', isSelected: false },
        ],
      },
      {
        id: 'qz-1',
        type: 'quiz',
        title: 'Check',
        data: {
          questions: [
            {
              type: 'mcq',
              question: 'Pick *one* `term`',
              options: ['Alpha', '   ', '`Beta`'],
              correctAnswer: 'Alpha',
            },
            {
              type: 'relation-mismatch',
              question: 'Find the mismatch',
              pairs: [{ left: 'Mitochondria', right: 'Chloroplast — sugar' }],
              candidatePartners: rmPartners,
            },
          ],
        },
      },
    ];

    const studentHtml = window.AlloModules.ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Biology',
      gradeLevel: 'Grade 8',
      getExportableHistory: () => history,
      t: (k) => k,
      exportConfig: { audience: 'student', includeTeacherKey: false, assessmentMode: false },
    });

    expect(studentHtml).toContain('ATP');
    // A card's back is its content, not an answer key (the HTML student export shows it too).
    expect(studentHtml).toContain('Cell energy currency');
    const checkHtml = window.AlloModules.ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Biology', gradeLevel: 'Grade 8', getExportableHistory: () => history, t: (k) => k,
      exportConfig: { audience: 'student', includeTeacherKey: false, assessmentMode: true },
    });
    expect(checkHtml).toContain('ATP');
    expect(checkHtml).not.toContain('Cell energy currency');
    expect(studentHtml).not.toContain('DROPPED_CARD');
    expect(studentHtml).toContain('Osmosis');
    expect(studentHtml).not.toContain('DROPPED_TERM');
    expect(studentHtml).toContain('Enzyme');
    expect(studentHtml).not.toContain('DROPPED_WALL');
    expect(studentHtml).toContain('Pick one term');
    expect(studentHtml).toContain('>Beta<');
    expect(studentHtml).not.toContain('>C<');
    expect(studentHtml).not.toContain('<span></span>');
    expect(studentHtml).not.toContain(rmPartners.join(' | '));
    for (const p of rmPartners) expect(studentHtml).toContain(p);

    const teacherHtml = window.AlloModules.ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Biology',
      gradeLevel: 'Grade 8',
      getExportableHistory: () => history,
      t: (k) => k,
      exportConfig: { audience: 'teacher', includeTeacherKey: true, assessmentMode: false },
    });
    expect(teacherHtml).toContain('Cell energy currency');
    expect(teacherHtml).not.toContain('DROPPED_CARD');
    expect(teacherHtml).toContain(rmPartners.join(' | '));
  });

  it('exports structured flashcard slides and filters deselected flashcards and word-wall entries in handleExportSlides', async () => {
    const fcItem = {
      id: 'fc-pptx',
      type: 'flashcards',
      title: 'Genetics Cards',
      data: {
        cards: [
          { front: 'Allele', back: 'Variant form of a gene', isSelected: true },
          { front: 'OMITTED_CARD', back: 'OMITTED_BACK', isSelected: false },
        ],
      },
    };
    const wwItem = {
      id: 'ww-pptx',
      type: 'word-wall',
      title: 'Word Wall',
      data: [
        { word: 'Phenotype', definition: 'Observable traits', isSelected: true },
        { word: 'OMITTED_WALL', definition: 'OMITTED_DEF', isSelected: false },
      ],
    };

    const studentSetup = setupExporter({
      history: [fcItem, wwItem],
      exportConfig: { audience: 'student', includeTeacherKey: false },
    });
    expect(await studentSetup.exporter.handleExportSlides({ includeSlideAnswerKey: false })).toBe(true);
    const studentDump = JSON.stringify(studentSetup.captured.slides);
    expect(studentDump).toContain('Allele');
    expect(studentDump).toContain('Variant form of a gene');
    const checkSetup = setupExporter({ history: [fcItem, wwItem], exportConfig: { audience: 'student', includeTeacherKey: false, assessmentMode: true } });
    expect(await checkSetup.exporter.handleExportSlides({ includeSlideAnswerKey: false })).toBe(true);
    const checkDump = JSON.stringify(checkSetup.captured.slides);
    expect(checkDump).toContain('Allele');
    expect(checkDump).not.toContain('Variant form of a gene');
    expect(studentDump).not.toContain('OMITTED_CARD');
    expect(studentDump).toContain('Phenotype');
    expect(studentDump).not.toContain('OMITTED_WALL');

    const teacherSetup = setupExporter({
      history: [fcItem, wwItem],
      exportConfig: { audience: 'teacher', includeTeacherKey: true },
    });
    expect(await teacherSetup.exporter.handleExportSlides({ includeSlideAnswerKey: true })).toBe(true);
    const teacherDump = JSON.stringify(teacherSetup.captured.slides);
    expect(teacherDump).toContain('Allele');
    expect(teacherDump).toContain('Variant form of a gene');
    expect(teacherDump).not.toContain('OMITTED_CARD');
    expect(teacherDump).not.toContain('OMITTED_WALL');
  });
});

describe('Wave 57 — Modal focus-trap & screen-reader background isolation hardening', () => {
  it('isolates background siblings and traps Tab even from overlay/dialog in openA11yInspectorEditor, openConceptMap3D, and _openBuilderCropModal', () => {
    const bgMain = document.createElement('main');
    const bgBtn = document.createElement('button');
    bgBtn.textContent = 'Behind modal';
    bgMain.appendChild(bgBtn);
    document.body.appendChild(bgMain);

    const opener = document.createElement('button');
    opener.textContent = 'Trigger';
    bgMain.appendChild(opener);
    opener.focus();

    // 1) openA11yInspectorEditor via applyA11yInspector: backdrop Escape + Tab recovery when focus lands on overlay
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const idoc = iframe.contentDocument;
    const iwin = iframe.contentWindow;
    idoc.open();
    idoc.write('<!doctype html><html lang="en"><body><main><button aria-label="Old label">Run</button></main></body></html>');
    idoc.close();

    window.AlloModules.ExportHandlers.applyA11yInspector({ exportPreviewRef: { current: iframe }, enabled: true });
    const badge = idoc.querySelector('.a11y-inspect-badge');
    badge.click();
    const a11yOverlay = idoc.getElementById('a11y-inspect-editor-overlay');
    expect(a11yOverlay).not.toBeNull();
    expect(idoc.querySelector('main').hasAttribute('inert')).toBe(true);
    expect(idoc.querySelector('main').getAttribute('aria-hidden')).toBe('true');

    a11yOverlay.tabIndex = -1;
    a11yOverlay.focus();
    a11yOverlay.dispatchEvent(new iwin.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(idoc.activeElement.id).toBe('a11y-inspect-editor-value');

    a11yOverlay.focus();
    a11yOverlay.dispatchEvent(new iwin.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(idoc.activeElement.textContent).toBe('Save changes');

    a11yOverlay.dispatchEvent(new iwin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(idoc.getElementById('a11y-inspect-editor-overlay')).toBeNull();
    expect(idoc.querySelector('main').hasAttribute('inert')).toBe(false);
    expect(idoc.querySelector('main').hasAttribute('aria-hidden')).toBe(false);
    expect(idoc.activeElement).toBe(badge);
    iframe.remove();
    opener.focus();

    // 2) openConceptMap3D: isolates background and cycles focus even in jsdom (empty getClientRects)
    window.AlloModules.ViewRenderers.openConceptMap3D({
      nodes: [{ id: 'n1', label: 'Cell' }],
      t: (k) => k,
    });
    const cgOverlay = document.getElementById('vo-cg3d-overlay');
    expect(cgOverlay).not.toBeNull();
    expect(bgMain.hasAttribute('inert')).toBe(true);
    expect(bgMain.getAttribute('aria-hidden')).toBe('true');

    cgOverlay.focus();
    expect(document.activeElement).toBe(cgOverlay);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement.tagName).toBe('BUTTON');
    expect(cgOverlay.contains(document.activeElement)).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.getElementById('vo-cg3d-overlay')).toBeNull();
    expect(bgMain.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);

    // 3) _openBuilderCropModal: isolates background, traps Tab from overlay, restores inert/aria-hidden + image focus
    const img = document.createElement('img');
    img.tabIndex = 0;
    img.src = 'data:image/png;base64,iVBORw0KGgo=';
    bgMain.appendChild(img);
    img.focus();

    const openCrop = openBuilderCropModalFactory(document, () => '', vi.fn());
    openCrop(img);
    const cropOverlay = document.getElementById('allo-crop-overlay');
    expect(cropOverlay).not.toBeNull();
    expect(bgMain.hasAttribute('inert')).toBe(true);
    expect(bgMain.getAttribute('aria-hidden')).toBe('true');

    cropOverlay.focus();
    cropOverlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement.textContent).toBe('Apply Crop');

    cropOverlay.focus();
    cropOverlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement.textContent).toBe('Cancel');

    cropOverlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.getElementById('allo-crop-overlay')).toBeNull();
    expect(bgMain.hasAttribute('inert')).toBe(false);
    expect(bgMain.hasAttribute('aria-hidden')).toBe(false);
    expect(document.activeElement).toBe(img);
  });
});

describe('Wave 58 — 4-mirror SHA-256 bundle parity', () => {
  it('keeps all Waves 55-57 compiled and handler modules byte-identical across all 4 deploy mirrors', () => {
    const mirrors = ['.', 'desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
    const modules = [
      'export_module.js',
      'export_handlers_module.js',
      'view_export_preview_module.js',
      'view_pdf_audit_module.js',
      'view_renderers_module.js',
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
