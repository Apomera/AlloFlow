import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const compiled = readFileSync('view_export_preview_module.js', 'utf8');
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const pdfSource = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const pdfCompiled = readFileSync('view_pdf_audit_module.js', 'utf8');
const exportSource = readFileSync('export_source.jsx', 'utf8');

const helperStart = source.indexOf('function _builderWordCount');
const helperEnd = source.indexOf('function ExportPreviewView');
const helpers = new Function(source.slice(helperStart, helperEnd) + '\nreturn { _builderWordCount, _builderHeadingOutline, _builderExportPreflight, _builderH5PCompatibility };')();

describe('Document Builder export recommendations', () => {
  it('runs deterministic preflight checks and reports blocking document defects', () => {
    document.documentElement.lang = '';
    document.title = '';
    document.body.innerHTML = '<h1 id="same">Title</h1><h3 id="same">Skipped</h3><img src="x"><table><tr><td>Cell</td></tr></table><input>';
    const result = helpers._builderExportPreflight(document, 'html');
    expect(result.errors).toBeGreaterThanOrEqual(3);
    expect(result.warnings).toBeGreaterThanOrEqual(3);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'language', 'title', 'heading-order', 'image-alt', 'form-label', 'table-headers', 'duplicate-ids',
    ]));
  });

  it('accepts an accessible minimal document and counts words reactively', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Accessible handout';
    document.body.innerHTML = '<h1>Accessible handout</h1><p>Three useful words</p><img src="x" alt=""><table><tr><th scope="col">Name</th></tr></table><label for="answer">Answer</label><input id="answer">';
    const result = helpers._builderExportPreflight(document, 'html');
    expect(result.errors).toBe(0);
    expect(helpers._builderWordCount(document)).toBe(7);
    expect(helpers._builderHeadingOutline(document).map((item) => item.level)).toEqual([1]);
  });

  it('preflights H5P compatibility and embedded media before export', () => {
    const quiz = helpers._builderH5PCompatibility({
      type: 'quiz',
      data: { questions: [
        { question: 'Ready?', options: ['Yes', 'No'], correctAnswer: 'Yes' },
        { question: 'Too many', options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'A' },
      ] },
    });
    expect(quiz).toMatchObject({ library: 'Single Choice Set 1.11', total: 2, valid: 1, omitted: 1, ready: true });

    const mixed = helpers._builderH5PCompatibility({
      type: 'quiz',
      data: { questions: [
        { type: 'multi-select', question: 'Select both', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'] },
        { type: 'short-answer', question: 'Explain why.', expectedAnswer: 'Because.' },
        { type: 'numeric-response', question: 'How much?', correctValue: 5, tolerance: 0.2 },
      ] },
    });
    expect(mixed).toMatchObject({ library: 'Question Set 1.21', total: 3, valid: 3, adapted: 1, manualReview: 2, omitted: 0, ready: true });

    const cards = helpers._builderH5PCompatibility({
      type: 'glossary',
      data: [
        { term: 'Atom', def: 'A unit', image: 'data:image/png;base64,aGVsbG8=', audio: 'data:audio/mpeg;base64,aGVsbG8=' },
        { term: 'Remote', def: 'External', image: 'https://example.test/remote.png' },
        { term: 'Incomplete', def: '' },
      ],
    });
    expect(cards).toMatchObject({ library: 'Dialog Cards 1.9', total: 3, valid: 2, omitted: 1, embeddedMedia: 2, omittedMedia: 1, ready: true });
    expect(helpers._builderH5PCompatibility({ type: 'faq', data: [] }).ready).toBe(false);
  });

  it('persists margins in versioned presets and refreshes live document statistics', () => {
    expect(host).toContain("pageMargin: '1in'");
    expect(host).toContain('const _EXPORT_PRESET_SCHEMA_VERSION = 3');
    expect(source).toContain("setExportConfigAndRefresh(p => ({ ...p, pageMargin: m.val }))");
    expect(source).toContain('refreshDocumentStats();');
    expect(compiled).toContain('wordCount.toLocaleString()');
  });

  it('packages EPUB raster images, preserves regional language tags, and catches ZIP failures', () => {
    expect(source).toContain("zip.file('OEBPS/' + path");
    expect(source).toContain('_imageManifest.push');
    expect(source).toContain("_contentProps.push('remote-resources')");
    expect(source).toContain("replace(/_/g, '-')");
    expect(source).toContain("ePub export failed:");
    expect(compiled).toContain('_imageManifest.join');
  });

  it('keeps package sources explicit and alternate downloads reliable and offline-aware', () => {
    document.documentElement.lang = 'en';
    document.title = 'Remote resource lesson';
    document.body.innerHTML = '<h1>Lesson</h1><img src="https://example.test/image.png" alt="Diagram"><style>@import url(https://example.test/font.css);</style><audio src="https://example.test/audio.mp3"></audio>';
    const result = helpers._builderExportPreflight(document, 'epub');
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['epub-images', 'epub-styles']));
    expect(source).toContain("add('warning', 'epub-media'");
    expect(source).toContain('aria-label="Quiz to export as QTI"');
    expect(source).toContain('await handler({ generatedContent: selected.item })');
    expect(source).toContain('await handler({ liveHtml: clean.html, liveTitle: clean.title })');
    expect(source).toContain('const downloadBuilderBlob = React.useCallback');
    expect(source).toContain("downloadBuilderBlob(blob, { extension: 'epub' })");
    expect(source).toContain("response = await fetch(absolute");
    expect(source).toContain(".replace(/@font-face");
    expect(exportSource).toContain('builder-live-document');
    expect(compiled).toContain('Building ePub...');
  });

  it('adds preflight, find/replace, heading navigation, Office, and contextual assessment exports', () => {
    for (const label of ['Run export preflight checks', 'Find / Replace | Heading Outline', 'Accessible Word (.docx)', 'OpenDocument (.odt)', 'QTI quiz package', 'H5P interactive activity (.h5p)', 'IMS content package']) {
      expect(source).toContain(label);
    }
    expect(source).toContain("const hasAssessmentContent =");
    expect(host).toContain('getSkippedResources, handleExportH5P, handleExportIMS, handleExportQTI, history');
  });

  it('exposes the tested Office builders through a narrow shared API', () => {
    expect(pdfSource).toContain('async function _buildAccessibleOfficeExport');
    expect(pdfSource).toContain('_buildDocxBlobFromSpec(spec, d, DOC_MODES.standard)');
    expect(pdfSource).toContain('_htmlToOdtPackageParts(html)');
    expect(pdfCompiled).toContain('window.AlloModules.AccessibleOfficeExport = { build: _buildAccessibleOfficeExport }');
  });
});
