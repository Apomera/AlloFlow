import { describe, it, expect, vi } from 'vitest';
import * as DocumentsMod from '../stem_lab/stem_lumen_documents.js';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';

const D = DocumentsMod.default || DocumentsMod;
const E = EvidenceMod.default || EvidenceMod;

function textFile(name, text, extra = {}) {
  const bytes = new TextEncoder().encode(text);
  return {
    name, size: bytes.length, lastModified: 1721174400000,
    text: vi.fn(async () => text),
    arrayBuffer: vi.fn(async () => bytes.buffer.slice(0)),
    ...extra
  };
}

function binaryFile(name, extra = {}) {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
  return {
    name, size: bytes.length, lastModified: 1721174400000,
    arrayBuffer: vi.fn(async () => bytes.buffer.slice(0)),
    ...extra
  };
}

describe('Lumen local-document routing and provenance', () => {
  it('recognizes the supported document family and refuses unknown or oversized files', () => {
    expect(['a.pdf', 'a.docx', 'a.pptx', 'a.xlsx', 'a.xls', 'a.ods', 'a.txt', 'a.md', 'a.markdown', 'a.csv', 'a.epub'].map(D.formatFromName))
      .toEqual(['pdf', 'docx', 'pptx', 'xlsx', 'xlsx', 'xlsx', 'txt', 'md', 'md', 'csv', 'epub']);
    expect(() => D.validateFile(textFile('photo.png', 'not evidence'))).toThrow(/not supported/i);
    expect(() => D.validateFile(textFile('huge.pdf', 'x', { size: D.MAX_FILE_BYTES + 1 }))).toThrow(/25 MB/i);
  });

  it('imports text locally with stable replacement identity and complete file provenance', async () => {
    const spec = await D.extractLocalDocument(textFile('Reading Notes.md', '# Topic\n\nA sufficiently long local reading passage supports exact evidence citations and remains on device.'));
    expect(spec).toMatchObject({
      title: 'Reading Notes.md', type: 'md', importMethod: 'local-file', fileFormat: 'md',
      locator: 'Local file · Reading Notes.md', extractionMethod: 'browser-text', documentPartCount: 1
    });
    expect(spec.id).toMatch(/^src_file_/);
    expect(spec.fileContentHash).toBeTruthy();
    const replacement = await D.extractLocalDocument(textFile('Reading Notes.md', '# Topic\n\nA changed but still sufficiently long local reading passage should update the same evidence source.'));
    expect(replacement.id).toBe(spec.id);
    expect(replacement.fileContentHash).not.toBe(spec.fileContentHash);
  });

  it('converts PDF pages into exact page-scoped headings and refuses a partial parse', async () => {
    const pipeline = {
      extractPdfTextDeterministic: vi.fn(async () => ({
        fullText: 'Page one evidence. Page two evidence.', pageCount: 2, pageErrors: [], isScanned: false,
        pages: [
          { pageNum: 1, text: 'Page one contains enough detailed evidence for a grounded citation and local retrieval.' },
          { pageNum: 2, text: 'Page two contains additional detailed evidence for another grounded citation and comparison.' }
        ]
      }))
    };
    const spec = await D.extractLocalDocument(binaryFile('report.pdf'), { pipeline });
    expect(spec.content).toContain('# Page 1');
    expect(spec.content).toContain('# Page 2');
    expect(spec.documentPartCount).toBe(2);

    pipeline.extractPdfTextDeterministic.mockResolvedValueOnce({
      fullText: 'Only one page was readable and this text must not be promoted.', pageCount: 2,
      pages: [{ pageNum: 1, text: 'Only one page was readable and this text must not be promoted.' }],
      pageErrors: [{ pageNum: 2, error: 'damaged stream' }]
    });
    await expect(D.extractLocalDocument(binaryFile('partial.pdf'), { pipeline })).rejects.toThrow(/No partial source was added/i);
  });

  it('rejects scanned PDFs without a text layer and encrypted Office files honestly', async () => {
    const pdfPipeline = {
      extractPdfTextDeterministic: vi.fn(async () => ({ fullText: '', pages: [], pageCount: 3, pageErrors: [], isScanned: true }))
    };
    await expect(D.extractLocalDocument(binaryFile('scan.pdf'), { pipeline: pdfPipeline })).rejects.toThrow(/appears scanned.*OCR/i);

    const officePipeline = {
      extractDocxTextDeterministic: vi.fn(async () => ({ fullText: '', method: 'failed', error: 'encrypted package' }))
    };
    await expect(D.extractLocalDocument(binaryFile('protected.docx'), { pipeline: officePipeline })).rejects.toThrow(/encrypted package/i);
  });

  it('preserves PowerPoint slide boundaries and speaker notes', async () => {
    const pipeline = {
      extractPptxTextDeterministic: vi.fn(async () => ({
        fullText: 'fallback', slideCount: 2, method: 'jszip-dom',
        slides: [
          { slideNum: 1, text: 'Opening slide with enough substantive instructional evidence for a citation.', notesText: 'Explain the key distinction.' },
          { slideNum: 2, text: 'Second slide with enough supporting evidence for comparison and retrieval.', notesText: '' }
        ]
      }))
    };
    const spec = await D.extractLocalDocument(binaryFile('lesson.pptx'), { pipeline });
    expect(spec.content).toContain('# Slide 1');
    expect(spec.content).toContain('[Speaker notes]');
    expect(spec.content).toContain('# Slide 2');
    expect(spec.documentPartCount).toBe(2);
  });

  it('extracts EPUB chapters in declared spine order with section locators', async () => {
    const contents = {
      'META-INF/container.xml': '<container><rootfile full-path="OPS/package.opf"/></container>',
      'OPS/package.opf': '<package><manifest><item id="c1" href="one.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c2"/><itemref idref="c1"/></spine></package>',
      'OPS/one.xhtml': '<html><head><title>First chapter</title></head><body><h1>First chapter</h1><p>This first chapter has enough detailed evidence for a local citation and retrieval result.</p></body></html>',
      'OPS/two.xhtml': '<html><head><title>Second chapter</title></head><body><h1>Second chapter</h1><p>This second chapter appears first in the declared spine and contains grounded evidence.</p></body></html>'
    };
    const zip = {
      files: Object.fromEntries(Object.keys(contents).map(name => [name, { _data: { uncompressedSize: contents[name].length } }])),
      file: name => contents[name] == null ? null : { async: async () => contents[name] }
    };
    const JSZip = { loadAsync: vi.fn(async () => zip) };
    const spec = await D.extractLocalDocument(binaryFile('reader.epub'), { JSZip });
    expect(spec.content.indexOf('Section 1: Second chapter')).toBeLessThan(spec.content.indexOf('Section 2: First chapter'));
    expect(spec.documentPartCount).toBe(2);
    expect(spec.extractionMethod).toBe('jszip-epub');
  });

  it('rejects spreadsheet truncation instead of silently creating partial evidence', async () => {
    const pipeline = {
      convertXlsxToMarkdownTables: vi.fn(async () => ({
        text: '## Sheet1\n\n| Evidence |\n| --- |\n| value |', sheets: 1, truncatedRows: 3
      }))
    };
    await expect(D.extractLocalDocument(binaryFile('data.xlsx'), { pipeline })).rejects.toThrow(/No partial source was added/i);
  });
});

describe('Lumen document provenance in the evidence graph', () => {
  it('migrates to schema 3 and binds passages to page locators while preserving file controls on refresh', async () => {
    let project = E.makeProject({ id: 'files', title: 'Files' });
    const first = await D.extractLocalDocument(textFile('guide.md', '# Page 4\n\nThis page contains a sufficiently long and distinctive explanation about vocabulary morphology and word analysis.'));
    project = E.upsertSource(project, { ...first, labels: ['Course reading'], active: false });
    expect(project.schemaVersion).toBe(3);
    expect(project.sources[0]).toMatchObject({ fileName: 'guide.md', fileFormat: 'md', active: false, labels: ['Course reading'] });
    expect(project.evidenceNodes[0].locator.documentPart).toEqual({ kind: 'page', index: 4, label: 'Page 4' });
    expect(project.evidenceNodes[0].locatorLabel).toContain('Page 4');

    const changed = await D.extractLocalDocument(textFile('guide.md', '# Page 4\n\nThis changed page contains a sufficiently long and distinctive explanation about vocabulary morphology, roots, and affixes.'));
    project = E.upsertSource(project, changed);
    expect(project.sources[0]).toMatchObject({ version: 2, active: false, labels: ['Course reading'] });
  });
});
