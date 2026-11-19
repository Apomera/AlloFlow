// Wave 2 Core Remediation Pipeline & Exporter Regression Suite (2026-11-19)
// Covers W2-C1 (EPUB3 externalized images + nested TOC + self-check), W2-C2 (AcroForm /TU parity
// + indirect /AcroForm), W2-C3 (createTypesetTaggedPdf dedup, <dl>/<pre>, <ol> numbering, canvas cleanup),
// W2-C4 (multi-link reattach + PDF link rect spacing/slicing), W2-C5 (MathML + nested LaTeX speech),
// W2-C6 (ODT rowspan/footnotes/decorative, DOCX decorative, BRF/plain-text, doc_builder_renderer),
// and W2-C7 (Unicode _alloAlignVisionOntoOcrWords).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireCjs = createRequire(import.meta.url);
const PDFLib = requireCjs(resolve(ROOT, 'desktop/mcp/vendor/pdf-lib.min.js'));

const VIEW_SRC = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
const DP_SRC = readFileSync(resolve(ROOT, 'doc_pipeline_source.jsx'), 'utf8');
const RENDERER_SRC = readFileSync(resolve(ROOT, 'doc_builder_renderer_source.jsx'), 'utf8');
const NARRATION_MOD = readFileSync(resolve(ROOT, 'document_narration_text_module.js'), 'utf8');

const PNG_2X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR4nGP4z8AAQv8BD/kD/YURmXYAAAAASUVORK5CYII=';
const PNG_2X1_URI = 'data:image/png;base64,' + PNG_2X1_B64;

const parseXml = (xml) => {
  const doc = new DOMParser().parseFromString(String(xml).replace(/<!DOCTYPE[^>]*>/i, ''), 'application/xml');
  const err = doc.querySelector('parsererror');
  return { doc, wellFormed: !err, err: err ? err.textContent : '' };
};

// Extract the alt-format + office slice from view_pdf_audit_source.jsx
const viewHelpers = (() => {
  const start = VIEW_SRC.indexOf('function _htmlToDocxSpec(html) {');
  const end = VIEW_SRC.indexOf('\n// _buildDocxBlobFromSpec:', start);
  const docxEnd = VIEW_SRC.indexOf('\n// ── Writing check (Harper)', end);
  const speechStart = VIEW_SRC.indexOf('function _alloLinearizeSpeechMath(mathEl) {');
  const speechEnd = VIEW_SRC.indexOf('\nfunction _replaceAccessibleMathAndSvgForSpeech(', speechStart);
  if (start === -1 || end === -1 || docxEnd === -1 || speechStart === -1 || speechEnd === -1) {
    throw new Error('view_pdf_audit_source.jsx extraction markers missing');
  }
  const code = VIEW_SRC.slice(start, docxEnd) + '\n' + VIEW_SRC.slice(speechStart, speechEnd);
  return new Function(code + `
    return {
      _htmlToDocxSpec,
      _htmlToOdtContentXml,
      _htmlToOdtPackageParts,
      _buildDocxBlobFromSpec,
      validateEpubStructure,
      _altFmtXhtmlFromHtml,
      _buildEpubPackageFiles,
      _altFmtHtmlToPlainText,
      _altFmtToBRF,
      _buildBrailleBrf,
      _alloLinearizeSpeechMath,
    };
  `)();
})();

// Extract standalone pure helpers from doc_pipeline_source.jsx
function extractDpBlock(startMarker, endMarker) {
  const s = DP_SRC.indexOf(startMarker);
  const e = DP_SRC.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`Missing doc_pipeline markers: ${startMarker} .. ${endMarker}`);
  return DP_SRC.slice(s, e);
}

describe('W2-C1 (Core-B3): EPUB3 externalized images, nested <ol> TOC & self-check', () => {
  it('externalizes inline base64 images into OEBPS/images/* with OPF manifest items, dedupes repeats, and exposes binaryFiles', () => {
    const html = `<!DOCTYPE html><html lang="en"><head><title>Geo</title></head><body>
      <h1>Geology</h1>
      <p><img src="${PNG_2X1_URI}" alt="Sedimentary layers"/></p>
      <p><img src="${PNG_2X1_URI}" alt="Repeated reference"/></p>
    </body></html>`;
    const pkg = viewHelpers._buildEpubPackageFiles(html, { title: 'Geology', uid: 'test-uid', modifiedIso: '2026-11-19T00:00:00Z' });
    expect(pkg.validation.valid, JSON.stringify(pkg.validation.issues)).toBe(true);
    expect(pkg.images).toBe(1);
    expect(pkg.files['OEBPS/images/img-1.png']).toBeInstanceOf(Uint8Array);
    expect(pkg.files['OEBPS/images/img-1.png'][0]).toBe(0x89);
    expect(pkg.binaryFiles['OEBPS/images/img-1.png']).toBe(PNG_2X1_B64);
    expect(pkg.files['OEBPS/content.xhtml']).not.toContain('data:image/png;base64');
    expect(pkg.files['OEBPS/content.xhtml']).toContain('src="images/img-1.png"');
    expect(pkg.files['OEBPS/content.opf']).toContain('<item id="img-1" href="images/img-1.png" media-type="image/png"/>');
    expect(parseXml(pkg.files['OEBPS/content.opf']).wellFormed).toBe(true);
    expect(parseXml(pkg.files['OEBPS/content.xhtml']).wellFormed).toBe(true);
  });

  it('respects externalizeImages: false for scaffold callers (e.g. readalong narration)', () => {
    const html = `<!DOCTYPE html><html lang="en"><body><h1>Read</h1><img src="${PNG_2X1_URI}" alt="Pic"/></body></html>`;
    const pkg = viewHelpers._buildEpubPackageFiles(html, { title: 'Read', externalizeImages: false });
    expect(pkg.images).toBe(0);
    expect(Object.keys(pkg.files).some((k) => k.startsWith('OEBPS/images/'))).toBe(false);
    expect(Object.keys(pkg.binaryFiles)).toHaveLength(0);
    expect(pkg.files['OEBPS/content.xhtml']).toContain('data:image/png;base64');
    expect(pkg.validation.valid).toBe(true);
  });

  it('builds valid nested <ol> TOC for hierarchical and skipped heading sequences', () => {
    const html = `<!DOCTYPE html><html lang="en"><body>
      <h1>Part One</h1><h2>Chapter 1</h2><h3>Section 1.1</h3><h4>Detail</h4><h2>Chapter 2</h2><h1>Part Two</h1><h3>Skipped H2</h3><h2>Sibling H2</h2>
    </body></html>`;
    const pkg = viewHelpers._buildEpubPackageFiles(html, { title: 'Book' });
    const nav = pkg.files['OEBPS/nav.xhtml'];
    const parsed = parseXml(nav);
    expect(parsed.wellFormed, parsed.err).toBe(true);
    expect(pkg.validation.valid, JSON.stringify(pkg.validation.issues)).toBe(true);
    expect(pkg.headings).toBe(8);
    // Verify nested <ol> structure and EPUB3 Nav invariant: every <li> starts with <a> and has <= 1 child <ol>
    const tocNav = parsed.doc.querySelector('nav');
    const nestedOls = tocNav.querySelectorAll('ol ol');
    expect(nestedOls.length).toBeGreaterThanOrEqual(4);
    for (const li of Array.from(tocNav.querySelectorAll('li'))) {
      expect(li.firstElementChild?.tagName?.toLowerCase()).toBe('a');
      const directOls = Array.from(li.children).filter((c) => c.tagName.toLowerCase() === 'ol');
      expect(directOls.length).toBeLessThanOrEqual(1);
    }
  });

  it('validateEpubStructure catches missing and unmanifested local image assets', () => {
    const html = `<!DOCTYPE html><html lang="en"><body><h1>Img</h1><img src="${PNG_2X1_URI}" alt="Layer"/></body></html>`;
    const pkg = viewHelpers._buildEpubPackageFiles(html, { title: 'Img' });
    const missingFile = { ...pkg.files };
    delete missingFile['OEBPS/images/img-1.png'];
    const r1 = viewHelpers.validateEpubStructure(missingFile);
    expect(r1.issues.map((i) => i.code)).toContain('xhtml-resource-missing');

    const unmanifested = { ...pkg.files };
    unmanifested['OEBPS/content.opf'] = unmanifested['OEBPS/content.opf'].replace(/<item id="img-1"[^>]*\/>/, '');
    const r2 = viewHelpers.validateEpubStructure(unmanifested);
    expect(r2.issues.map((i) => i.code)).toContain('xhtml-resource-unmanifested');

    // Single-quoted src + ?query/#fragment + percent-encoded path resolution
    const encodedPkg = {
      ...pkg.files,
      'OEBPS/images/my pic.png': pkg.files['OEBPS/images/img-1.png'],
      'OEBPS/content.opf': pkg.files['OEBPS/content.opf'].replace(
        'href="images/img-1.png"',
        'href="images/my%20pic.png"'
      ),
      'OEBPS/content.xhtml': pkg.files['OEBPS/content.xhtml'].replace(
        'src="images/img-1.png"',
        "src='images/my%20pic.png?v=1#top'"
      ),
    };
    delete encodedPkg['OEBPS/images/img-1.png'];
    const r3 = viewHelpers.validateEpubStructure(encodedPkg);
    expect(r3.valid, JSON.stringify(r3.issues)).toBe(true);
    const missingSingleQuoted = { ...encodedPkg };
    delete missingSingleQuoted['OEBPS/images/my pic.png'];
    const r4 = viewHelpers.validateEpubStructure(missingSingleQuoted);
    expect(r4.issues.map((i) => i.code)).toContain('xhtml-resource-missing');
  });
});

describe('W2-C2 & W2-C3: AcroForm /TU parity, indirect /AcroForm, and createTypesetTaggedPdf', () => {
  it('extractPdfFormFieldsDeterministic detects /SigFlags behind indirect /AcroForm and accepts Uint8Array', async () => {
    const doc = await PDFLib.PDFDocument.create();
    doc.addPage([612, 792]);
    const form = doc.getForm();
    const tf = form.createTextField('student.name');
    tf.setText('Avery');
    tf.addToPage(doc.getPages()[0], { x: 72, y: 700, width: 120, height: 18 });
    // Force indirect /AcroForm and indirect /SigFlags = 1
    const acroRaw = doc.catalog.get(PDFLib.PDFName.of('AcroForm'));
    const acroDict = doc.context.lookup(acroRaw);
    const sigRef = doc.context.register(PDFLib.PDFNumber.of(1));
    acroDict.set(PDFLib.PDFName.of('SigFlags'), sigRef);
    const acroRef = doc.context.register(acroDict);
    doc.catalog.set(PDFLib.PDFName.of('AcroForm'), acroRef);
    const pdfBytes = await doc.save();

    const fnBody = extractDpBlock('const extractPdfFormFieldsDeterministic = async (base64, opts) => {', '\n  // ── ');
    const extractForm = new Function('window', '_b64ToBytes', fnBody + '\nreturn extractPdfFormFieldsDeterministic;')(
      { PDFLib },
      () => { throw new Error('should not call _b64ToBytes on Uint8Array'); }
    );
    const res = await extractForm(pdfBytes, { consent: false });
    expect(res.hadForm).toBe(true);
    expect(res.hasSignatures).toBe(true);
    expect(res.fields.length).toBe(1);
    expect(res.fieldText).toBe('');
  });

  it('createTypesetTaggedPdf writes /TU onto AcroForm field dicts, avoids double-draws, preserves <dl>/<pre>, numbers <ol>', async () => {
    const fnSrc = extractDpBlock('const _ALLO_TYPESET_SAFE_SCRIPTS =', '\n  // ── STEM image intelligence');
    let capturedBytes = null;
    const fakeCreateTaggedPdf = async (bytes) => {
      capturedBytes = bytes;
      return { bytes, summary: {} };
    };
    const createTypeset = new Function(
      'window', 'document', 'DOMParser', '_alloDetectScript', '_loadCdnScript', '_withTimeout',
      '_ALLO_CJK_URL', '_ALLO_NOTO_URL', '_ALLO_SCRIPT_FONT', '_ALLO_CJK_BOLD_URL', '_ALLO_NOTO_BOLD_URL',
      '_REMEDIATION_IMAGE_MAX_BYTES', 'warnLog', 'createTaggedPdf',
      fnSrc + '\nreturn createTypesetTaggedPdf;'
    )(
      { PDFLib }, globalThis.document, globalThis.DOMParser,
      () => null, async () => false, (p) => p,
      {}, () => '', {}, {}, () => '',
      10 * 1024 * 1024, () => {}, fakeCreateTaggedPdf
    );

    const html = `<!DOCTYPE html><html lang="en"><body>
      <h1>Worksheet</h1>
      <p>Student Name: <input type="text" data-allo-field="1" name="stu_name" aria-label="Full student name"/></p>
      <p><input type="checkbox" data-allo-field="1" name="agree" aria-label="Parent signature confirmed"/> Confirmed</p>
      <blockquote><p>UNIQUE_BLOCKQUOTE_LINE</p><p>SECOND_QUOTE_PARA</p></blockquote>
      <table><tr><th><p>UNIQUE_TH_CELL</p></th><td><p>UNIQUE_TD_CELL</p><p>SECOND_TD_PARA</p></td></tr></table>
      <ol><li>First ordered step</li><li>Second ordered step</li></ol>
      <ol start="5"><li>Fifth item</li><li value="10">Tenth item</li><li>Eleventh item</li></ol>
      <dl><dt>Legend Term</dt><dd>Legend Meaning</dd></dl>
      <pre>const answer = 42;</pre>
    </body></html>`;

    await createTypeset({ accessibleHtml: html }, {});
    expect(capturedBytes).toBeInstanceOf(Uint8Array);

    const loaded = await PDFLib.PDFDocument.load(capturedBytes);
    const fields = loaded.getForm().getFields();
    expect(fields.length).toBe(2);
    const tus = fields.map((f) => {
      const tu = f.acroField.dict.get(PDFLib.PDFName.of('TU'));
      return tu && typeof tu.decodeText === 'function' ? tu.decodeText() : '';
    });
    expect(tus).toContain('Full student name');
    expect(tus).toContain('Parent signature confirmed');

    // Inspect decoded content stream strings to verify zero double-draws + presence of <dl>, <pre>, <ol> numbering
    const pages = loaded.getPages();
    const zlib = requireCjs('node:zlib');
    let streamText = '';
    const decodeStream = (refOrStream) => {
      const st = loaded.context.lookup(refOrStream) || refOrStream;
      if (!st) return;
      if (typeof st.size === 'function' && typeof st.get === 'function') {
        for (let i = 0; i < st.size(); i++) decodeStream(st.get(i));
        return;
      }
      if (!st.contents || !st.dict) return;
      const filt = String(st.dict.get(PDFLib.PDFName.of('Filter')) || '');
      const buf = filt === '/FlateDecode' ? zlib.inflateSync(Buffer.from(st.contents)) : Buffer.from(st.contents);
      const rawStr = buf.toString('latin1');
      // pdf-lib writes drawText via hex strings `<48656c6c6f> Tj`
      const decodedHex = rawStr.replace(/<([0-9A-Fa-f]+)>\s*Tj/g, (_, hex) => {
        try { return Buffer.from(hex, 'hex').toString('latin1'); } catch (_) { return ''; }
      });
      streamText += decodedHex + '\n';
    };
    for (const pg of pages) decodeStream(pg.node.get(PDFLib.PDFName.of('Contents')));
    const countOcc = (needle) => (streamText.match(new RegExp(needle, 'g')) || []).length;
    expect(countOcc('UNIQUE_BLOCKQUOTE_LINE')).toBe(1);
    expect(countOcc('UNIQUE_TH_CELL')).toBe(1);
    expect(countOcc('UNIQUE_TD_CELL')).toBe(1);
    expect(streamText).toContain('UNIQUE_BLOCKQUOTE_LINE SECOND_QUOTE_PARA');
    expect(streamText).toContain('UNIQUE_TD_CELL SECOND_TD_PARA');
    expect(streamText).not.toContain('UNIQUE_BLOCKQUOTE_LINESECOND_QUOTE_PARA');
    expect(streamText).not.toContain('UNIQUE_TD_CELLSECOND_TD_PARA');
    expect(streamText).toContain('Legend Term');
    expect(streamText).toContain('Legend Meaning');
    expect(streamText).toContain('const answer = 42;');
    expect(streamText).toContain('1. First ordered step');
    expect(streamText).toContain('2. Second ordered step');
    expect(streamText).toContain('5. Fifth item');
    expect(streamText).toContain('10. Tenth item');
    expect(streamText).toContain('11. Eleventh item');
  });

  it('createTaggedPdf Stage 3 writes /TU onto field.acroField.dict when source field lacks /TU', () => {
    expect(DP_SRC).toContain("field.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText(fieldLabelText))");
  });
});

describe('W2-C4: Multi-link reattachment & PDF link rect spacing/slicing', () => {
  const reattachSrc = extractDpBlock('function _reattachSourceLinks(html, srcLinks) {', '\n// Emit accessibility-grade HTML');
  const _reattachSourceLinks = new Function(reattachSrc + '\nreturn _reattachSourceLinks;')();

  it('reattaches two or more links within the same paragraph text node and skips <svg>/<math>', () => {
    const html = '<p>Visit the Department of Education and the Special Education Office today.</p>'
      + '<svg><title>Department of Education</title></svg>'
      + '<math><mtext>Special Education Office</mtext></math>';
    const res = _reattachSourceLinks(html, [
      { text: '', url: 'https://ignored.invalid', occurrences: 5 },
      { text: 'Department of Education', url: 'https://ed.gov', occurrences: 2 },
      { text: 'Special Education Office', url: 'https://osep.ed.gov', occurrences: 2 },
    ]);
    expect(res.count).toBe(2);
    expect(res.html).toContain('<a href="https://ed.gov">Department of Education</a>');
    expect(res.html).toContain('<a href="https://osep.ed.gov">Special Education Office</a>');
    expect(res.html).toContain('<svg><title>Department of Education</title></svg>');
    expect(res.html).toContain('<math><mtext>Special Education Office</mtext></math>');
  });

  it('extractPdfTextDeterministic includes word-gap spacing and partial-item slicing in link rect matching', () => {
    const idx = DP_SRC.indexOf('let _txt = \'\', _prevB = null;');
    expect(idx).toBeGreaterThan(-1);
    const snippet = DP_SRC.slice(idx, idx + 1500);
    expect(snippet).toContain('_oy / _bh > 0.4');
    expect(snippet).toContain('_gap > 0.14 * _bh');
  });
});

describe('W2-C5: MathML & nested LaTeX speech linearization', () => {
  const latexSrc = extractDpBlock('var _alloLatexToSpeakable = function (raw) {', '\n// ── P2-a');
  const latexToSpeakable = new Function(latexSrc + '\nreturn _alloLatexToSpeakable;')();

  it('linearizes <munderover>, <munder>, <mover>, <mtable>, and <mfenced> cleanly in speech and office spec', () => {
    const mathHtml = `<!DOCTYPE html><html lang="en"><body>
      <p><math><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msub><mi>x</mi><mi>i</mi></msub></math></p>
      <p><math><munder><mi>lim</mi><mrow><mi>x</mi><mo>→</mo><mn>0</mn></mrow></munder></math></p>
      <p><math><mover><mi>x</mi><mo>¯</mo></mover> + <mover><mi>v</mi><mo>→</mo></mover></math></p>
      <p><math><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr><mtr><mtd><mn>3</mn></mtd><mtd><mn>4</mn></mtd></mtr></mtable></math></p>
      <p><math><mfenced open="(" close=")" separators=","><mi>x</mi><mi>y</mi></mfenced></math></p>
    </body></html>`;
    const doc = new DOMParser().parseFromString(mathHtml, 'text/html');
    const maths = Array.from(doc.querySelectorAll('math'));
    expect(viewHelpers._alloLinearizeSpeechMath(maths[0])).toBe('∑_(i=1)^n x_i'.replace(' ', ''));
    expect(viewHelpers._alloLinearizeSpeechMath(maths[1])).toBe('lim_(x→0)');
    expect(viewHelpers._alloLinearizeSpeechMath(maths[2])).toContain('bar(x)');
    expect(viewHelpers._alloLinearizeSpeechMath(maths[2])).toContain('vec(v)');
    expect(viewHelpers._alloLinearizeSpeechMath(maths[3])).toBe('[1, 2; 3, 4]');
    expect(viewHelpers._alloLinearizeSpeechMath(maths[4])).toBe('(x, y)');

    const spec = viewHelpers._htmlToDocxSpec(mathHtml);
    const allText = spec.blocks.flatMap((b) => (b.runs || []).map((r) => r.text || '')).join(' ');
    expect(allText).toContain('[1, 2; 3, 4]');
    expect(allText).toContain('(x, y)');
    expect(allText).toContain('bar(x)');
    // Verify rebuilt document_narration_text_module.js carries the MathML upgrades
    expect(NARRATION_MOD).toContain('t === "munderover"');
    expect(NARRATION_MOD).toContain('t === "mtable"');
    expect(NARRATION_MOD).toContain('t === "mfenced"');
  });

  it('handles nested braces and ordinal roots in _alloLatexToSpeakable', () => {
    expect(latexToSpeakable('\\frac{x^{2}+1}{y^{2}-1}')).toBe('x to the power 2 plus 1 over y to the power 2 minus 1');
    expect(latexToSpeakable('\\frac{\\sqrt{x+1}}{2}')).toBe('square root of x plus 1 over 2');
    expect(latexToSpeakable('\\sqrt[3]{8}')).toBe('cube root of 8');
    expect(latexToSpeakable('\\sqrt[2]{9}')).toBe('square root of 9');
    expect(latexToSpeakable('\\sqrt[4]{16}')).toBe('4th root of 16');
  });
});

describe('W2-C6: ODT, DOCX, BRF/Plain-Text & doc_builder_renderer hardening', () => {
  it('ODT computes rowspan-aware column count, emits unique text:id on repeated footnotes, and omits title/desc on decorative images', () => {
    const html = `<!DOCTYPE html><html lang="en"><body>
      <table>
        <tr><td rowspan="2">SpanCol</td><td>R1C2</td></tr>
        <tr><td>R2C2</td><td>R2C3</td></tr>
      </table>
      <p>First<sup class="allo-fn-ref" data-fn-uid="f1">1</sup> and repeat<sup class="allo-fn-ref" data-fn-uid="f1">1</sup>.</p>
      <img src="${PNG_2X1_URI}" alt=""/>
      <section class="allo-footnotes"><ol><li data-fn-uid="f1">Footnote body</li></ol></section>
    </body></html>`;
    const parts = viewHelpers._htmlToOdtPackageParts(html);
    const parsed = parseXml(parts.contentXml);
    expect(parsed.wellFormed, parsed.err).toBe(true);
    // R2C3 must NOT be dropped despite row 0 rowspan occupying col 0
    expect(parts.contentXml).toContain('R2C3');
    expect(parts.contentXml).toContain('table:number-columns-repeated="3"');
    // Repeated footnote refs get distinct text:id values
    expect(parts.contentXml).toContain('text:id="ftn1"');
    expect(parts.contentXml).toContain('text:id="ftn1_2"');
    // Decorative image omits fake <svg:title>Image</svg:title>
    expect(parts.contentXml).not.toContain('<svg:title>Image</svg:title>');
  });

  it('DOCX spec carries decorative flag for block and inline images and omits placeholder paragraph for decorative unembeddable images', async () => {
    const html = `<!DOCTYPE html><html lang="en"><body>
      <img src="https://example.org/divider.png" alt=""/>
      <ul><li>Inline <img src="${PNG_2X1_URI}" alt="" role="presentation"/> text</li></ul>
    </body></html>`;
    const spec = viewHelpers._htmlToDocxSpec(html);
    expect(spec.blocks[0].decorative).toBe(true);
    expect(spec.blocks[1].items[0].runs.find((r) => r.img).img.decorative).toBe(true);

    const createdImageRuns = [];
    const createdTexts = [];
    const fakeDocx = {
      HeadingLevel: {}, AlignmentType: { START: 'start', CENTER: 'center' }, LevelFormat: { DECIMAL: 'decimal' },
      WidthType: { PERCENTAGE: 'pct' }, HighlightColor: { YELLOW: 'yellow' },
      Paragraph: class { constructor(o) { this.o = o; } },
      TextRun: class { constructor(o) { this.o = o; if (o && o.text) createdTexts.push(o.text); } },
      ImageRun: class { constructor(o) { this.o = o; createdImageRuns.push(o); } },
      ExternalHyperlink: class { constructor(o) { this.o = o; } },
      Table: class { constructor(o) { this.o = o; } },
      TableRow: class { constructor(o) { this.o = o; } },
      TableCell: class { constructor(o) { this.o = o; } },
      PageBreak: class {},
      Document: class { constructor(o) { this.o = o; } },
      Packer: { toBlob: async () => new Blob(['ok']) },
    };
    await viewHelpers._buildDocxBlobFromSpec(spec, fakeDocx, {});
    expect(createdImageRuns).toHaveLength(1);
    expect(createdImageRuns[0].altText.title).toBe('');
    expect(createdImageRuns[0].altText.description).toBe('');
    expect(createdTexts.join(' ')).not.toContain('no description available');
  });

  it('BRF maps common Unicode spaces/hyphens/symbols with 0 drops and plain-text separates <caption> from table cells', () => {
    const plain = viewHelpers._altFmtHtmlToPlainText('<table><caption>Sales</caption><tr><td>A</td><td>B</td></tr></table>');
    expect(plain).toContain('Sales\nA | B');

    const brfRes = viewHelpers._altFmtToBRF('Co\u2011op\u00ad \u202f© 2026 §4 €10', { withMeta: true });
    expect(brfRes.dropped).toBe(0);
    expect(brfRes.brf.length).toBeGreaterThan(0);
  });

  it('doc_builder_renderer preserves mid-sentence Student IDs and XML-escapes & in wide-table aria-label', () => {
    const fakeWin = {};
    new Function('window', RENDERER_SRC)(fakeWin);
    const render = fakeWin.AlloModules.DocBuilderRenderer.createRenderer({
      docStyle: { headingColor: '#111', accentColor: '#2563eb', tableBorder: '#cbd5e1', tableBg: '#f1f5f9', bgColor: '#ffffff', sectionBorderColor: '#cbd5e1', textColor: '#1e293b' },
      _accessibleHeaderColors: () => null,
      _alloCellRichText: (v, esc) => esc(v),
      _emitAccessibleTableHtml: () => '<table></table>',
      _pipeLog: () => {},
      _sanitizeRawHtmlBlock: (h) => h,
      _validateTableGrid: () => ({ ok: false, reason: 'none' }),
      renderWordArtHtml: () => '',
      warnLog: () => {},
    });
    const out1 = render([{ type: 'p', text: 'Enter Student ID: 12345 on your form.' }]);
    expect(out1).toContain('Enter Student ID: 12345 on your form.');
    const out2 = render([{ type: 'p', text: 'id: leaked-slug\nActual body text' }]);
    expect(out2).not.toContain('leaked-slug');
    expect(out2).toContain('Actual body text');
    const out3 = render([{
      type: 'table',
      caption: 'R&D > Q1 Budget',
      headers: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      rows: [['1', '2', '3', '4', '5', '6', '7', '8']],
    }]);
    expect(out3).toContain('aria-label="R&amp;D &gt; Q1 Budget"');
  });
});

describe('W2-C7: Unicode-aware _alloAlignVisionOntoOcrWords', () => {
  const alignSrc = extractDpBlock('var _alloAlignVisionOntoOcrWords = function (words, ocrText, visionText) {', '\n// ');
  const align = new Function(alignSrc + '\nreturn _alloAlignVisionOntoOcrWords;')();

  it('aligns non-Latin (Arabic / accented Latin) OCR words instead of dropping all keys to empty string', () => {
    const words = [
      { t: 'مرحبا', x0: 10, y0: 10, x1: 50, y1: 24, c: 95 },
      { t: 'بكم', x0: 55, y0: 10, x1: 85, y1: 24, c: 95 },
      { t: 'في', x0: 90, y0: 10, x1: 110, y1: 24, c: 95 },
      { t: 'المدرسة', x0: 115, y0: 10, x1: 170, y1: 24, c: 95 },
    ];
    const res = align(words, 'مرحبا بكم في المدرسة', 'مرحبا بكم في المدرسة');
    expect(res).not.toBeNull();
    expect(res.stats.anchors).toBe(4);
    expect(res.stats.anchorShare).toBe(1);
  });
});
