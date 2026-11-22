import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const docSrc = fs.readFileSync(path.resolve(ROOT, 'doc_pipeline_source.jsx'), 'utf8');

function sha256File(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(ROOT, rel))).digest('hex');
}

describe('Wave 6 — Track 1: Core Speed, Layer-2 Surgical Loop & WCAG 2.2 Checks', () => {
  it('W6-1: wires Layer-2 runTier2SurgicalFixes into _runMainFixLoop with content-gate protection and rule pruning', () => {
    expect(docSrc).toContain('const _tier2ResolvedRuleIds = new Set();');
    expect(docSrc).toContain('const _t2Res = await runTier2SurgicalFixes(accessibleHtml, axeResults, {');
    expect(docSrc).toContain("&& !(typeof _tier2ResolvedRuleIds !== 'undefined' && v && _tier2ResolvedRuleIds.has(v.id));");
    // runTier2SurgicalFixes itself must gate every accepted cluster through strict acceptFixedHtmlDetailed
    const t2Start = docSrc.indexOf('const runTier2SurgicalFixes = async (htmlContent, axeResult, opts) => {');
    const t2End = docSrc.indexOf('// Tier 2.5: Section-scoped AI fixes', t2Start);
    const t2Block = docSrc.slice(t2Start, t2End);
    expect(t2Block).toContain('acceptFixedHtmlDetailed(candidate, working, { strictContent: true })');
    expect(t2Block).toContain('stats.resolvedRuleIds');
    expect(t2Block).toContain('for (let bi = 0; bi < clusters.length; bi += 3)');
  });

  it('W6-2: replaces fixed 800ms sleep with _waitAuditFrameReady, adds Equal Access iframe a11y, and runs WCAG 2.2 layout checks', () => {
    const axeStart = docSrc.indexOf('const runAxeAudit = async (htmlContent) => {');
    const axeEnd = docSrc.indexOf('const _approvedDOMPurify =', axeStart);
    const axeBlock = docSrc.slice(axeStart, axeEnd);
    expect(axeBlock).not.toContain('setTimeout(r, 800)');
    expect(axeBlock).toContain('await _waitAuditFrameReady(iframe, 120);');
    expect(axeBlock).toContain('wcag22LayoutChecks = _runWcag22LayoutChecks(iframe, iframeDoc);');
    expect(axeBlock).toContain('wcag22LayoutChecks: wcag22LayoutChecks,');

    const eaStart = docSrc.indexOf('const runEqualAccessAudit = async (htmlContent) => {');
    const eaEnd = docSrc.indexOf('const fixContrastViolations =', eaStart);
    const eaBlock = docSrc.slice(eaStart, eaEnd);
    expect(eaBlock).toContain("iframe.setAttribute('aria-hidden', 'true');");
    expect(eaBlock).toContain("iframe.title = 'Accessibility audit frame';");
    expect(eaBlock).toContain('await _waitAuditFrameReady(iframe, 100);');

    // Execute _runWcag22LayoutChecks directly against a synthetic layout-enabled mock iframe.
    const probeStart = docSrc.indexOf('const _runWcag22LayoutChecks = (iframe, iframeDoc) => {');
    const probeEnd = docSrc.indexOf('const runAxeAudit = async (htmlContent) => {', probeStart);
    const probeFn = new Function(`${docSrc.slice(probeStart, probeEnd)}\nreturn _runWcag22LayoutChecks;`)();

    const makeMockFrame = ({ overflowPx = 0, clipped = false, btnSize = 28 }) => {
      const styleTag = { setAttribute() {}, textContent: '', remove() {} };
      const tinyBtn = {
        tagName: 'BUTTON',
        textContent: 'Go',
        getAttribute: () => '',
        getBoundingClientRect: () => ({ width: btnSize, height: btnSize }),
      };
      const para = {
        tagName: 'P',
        textContent: 'Hello world',
        clientHeight: 20,
        scrollHeight: clipped ? 45 : 20,
        clientWidth: 200,
        scrollWidth: 200,
      };
      const iframe = {
        style: { width: '1024px' },
        contentWindow: {
          getComputedStyle: (el) => (el === para
            ? { display: 'block', visibility: 'visible', overflowY: clipped ? 'hidden' : 'visible', overflowX: 'visible' }
            : { display: 'inline-block', visibility: 'visible' }),
        },
      };
      const iframeDoc = {
        head: { appendChild() {} },
        documentElement: {
          get clientWidth() { return iframe.style.width === '320px' ? 320 : 1024; },
          get scrollWidth() { return (iframe.style.width === '320px' ? 320 : 1024) + overflowPx; },
        },
        body: {
          get clientWidth() { return iframe.style.width === '320px' ? 320 : 1024; },
          get scrollWidth() { return (iframe.style.width === '320px' ? 320 : 1024) + overflowPx; },
          querySelectorAll: (sel) => (sel.includes('button, input') ? [tinyBtn] : [para]),
        },
        createElement: () => styleTag,
      };
      return { iframe, iframeDoc };
    };

    const clean = makeMockFrame({ overflowPx: 0, clipped: false, btnSize: 28 });
    const cleanRes = probeFn(clean.iframe, clean.iframeDoc);
    expect(cleanRes.skipped).toBe(false);
    expect(cleanRes.reflow320.passed).toBe(true);
    expect(cleanRes.textSpacing.passed).toBe(true);
    expect(cleanRes.targetSize.passed).toBe(true);

    const bad = makeMockFrame({ overflowPx: 90, clipped: true, btnSize: 16 });
    const badRes = probeFn(bad.iframe, bad.iframeDoc);
    expect(badRes.reflow320.passed).toBe(false);
    expect(badRes.reflow320.overflowPx).toBe(90);
    expect(badRes.textSpacing.passed).toBe(false);
    expect(badRes.textSpacing.clippedCount).toBe(1);
    expect(badRes.targetSize.passed).toBe(false);
    expect(badRes.targetSize.undersizedCount).toBe(1);
  });

  it('W6-3: defers PDF content-stream repair lazily unless a page exhibits suspected intra-word space splits', () => {
    const extStart = docSrc.indexOf('const extractPdfTextDeterministic = async (base64) => {');
    const extEnd = docSrc.indexOf('const extractPdfFormFieldsDeterministic =', extStart);
    const extBlock = docSrc.slice(extStart, extEnd);
    expect(extBlock).toContain('const _pageSuspectSpaceSplit = (txt) => {');
    expect(extBlock).toContain('if (_pageSuspectSpaceSplit(pageText)) {');
    expect(extBlock).not.toContain('const _csCopy = bytes.slice();');

    const susStart = extBlock.indexOf('const _COMMON_SHORT_TOKENS =');
    const susEnd = extBlock.indexOf('const _getCsPages =', susStart);
    const suspect = new Function(`${extBlock.slice(susStart, susEnd)}\nreturn _pageSuspectSpaceSplit;`)();
    expect(suspect('This is a clean paragraph in a well-formed textbook on photosynthesis.')).toBe(false);
    expect(suspect('The legal p ermanent resident submitted the form in the U nited S tates.')).toBe(true);
    expect(suspect('T h e report covers co mmittee recommendations.')).toBe(true);
  });
});

describe('Wave 6 — Track 2: DOCX, XLSX, Stage 4 PDF & Block Renderer Fidelity', () => {
  it('W6-4: DOCX parses ZIP once, extracts OMML equations & textboxes, and excludes reviewer comments by default', () => {
    const ommlStart = docSrc.indexOf('const _docxOmmlNodeToText = (node) => {');
    const ommlEnd = docSrc.indexOf('const extractDocxTextDeterministic =', ommlStart);
    const extractHelpers = new Function('DOMParser', `${docSrc.slice(ommlStart, ommlEnd)}\nreturn { _docxOmmlNodeToText, _docxExtractOmmlAndTextboxes };`)(window.DOMParser);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <w:body>
          <w:p>
            <m:oMath>
              <m:f><m:num><m:r><m:t>a+b</m:t></m:r></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f>
              <m:r><m:t>=</m:t></m:r>
              <m:rad><m:e><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:e></m:rad>
            </m:oMath>
          </w:p>
          <w:txbxContent><w:p><w:r><w:t>Lab Safety Callout: Wear goggles.</w:t></w:r></w:p></w:txbxContent>
        </w:body>
      </w:document>`;
    const rec = extractHelpers._docxExtractOmmlAndTextboxes(xml, 'Intro text only');
    expect(rec.equations).toEqual(['(a+b)/(2)=sqrt(x^(2))']);
    expect(rec.textboxes).toEqual(['Lab Safety Callout: Wear goggles.']);

    const docxStart = docSrc.indexOf('const extractDocxTextDeterministic = async (base64, opts = {}) => {');
    const docxEnd = docSrc.indexOf('const extractPptxTextDeterministic =', docxStart);
    const docxBlock = docSrc.slice(docxStart, docxEnd);
    expect(docxBlock).toContain('const includeComments = !!(opts && opts.includeComments === true);');
    expect(docxBlock).toContain('if (!includeComments) {');
    expect(docxBlock).toContain('omittedCommentsCount');
    // Only ONE JSZip.loadAsync call inside extractDocxTextDeterministic!
    expect((docxBlock.match(/JSZip\.loadAsync\(/g) || []).length).toBe(1);
  });

  it('W6-5: XLSX guards ZIP archives against zip bombs, escapes literal pipes, and emits merged-cell tableGrids', () => {
    const xStart = docSrc.indexOf('const convertXlsxToMarkdownTables = async (base64, opts = {}) => {');
    const xEnd = docSrc.indexOf('const extractPdfTextDeterministic =', xStart);
    const xBlock = docSrc.slice(xStart, xEnd);
    expect(xBlock).toContain("_ooxmlGuardArchive(_xZip, _xBytes.length, 'Excel');");
    expect(xBlock).toContain("sheet['!merges']");
    expect(xBlock).toContain('tableGrids.push({ caption: name, rows: gridRows });');
    expect(xBlock).toContain("replace(/\\|/g, '\\\\|')");
  });

  it('W6-6: Stage 4 PDF decodes chained ASCII85/ASCIIHex + FlateDecode streams and wires Form XObject inlining', () => {
    const dStart = docSrc.indexOf('const _stage4_decodeAsciiHex = (u8) => {');
    const dEnd = docSrc.indexOf('const _stage4_getStreamBytesAndFilter =', dStart);
    const decoders = new Function(
      '_stage4_inflate',
      `${docSrc.slice(dStart, dEnd)}\nreturn { _stage4_decodeAsciiHex, _stage4_decodeAscii85, _stage4_decodeStreamWithFilters };`,
    )((u8) => new Uint8Array(zlib.inflateSync(Buffer.from(u8))));

    // Chained ASCIIHexDecode -> FlateDecode
    const payload = Buffer.from('BT /F1 12 Tf (Chained OK) Tj ET', 'latin1');
    const flated = zlib.deflateSync(payload);
    const hexBuf = new Uint8Array(Buffer.from(flated.toString('hex') + '>', 'latin1'));
    const outHex = Buffer.from(decoders._stage4_decodeStreamWithFilters(hexBuf, ['ASCIIHexDecode', 'FlateDecode'])).toString('latin1');
    expect(outHex).toBe('BT /F1 12 Tf (Chained OK) Tj ET');

    // ASCII85Decode ('z' zero shortcut + classic 'Man ' -> '9jqo^')
    const a85 = decoders._stage4_decodeAscii85(new Uint8Array(Buffer.from('9jqo^z~>', 'latin1')));
    expect(Array.from(a85)).toEqual([77, 97, 110, 32, 0, 0, 0, 0]);

    // Unsupported filter throws cleanly instead of feeding non-zlib bytes to inflate
    expect(() => decoders._stage4_decodeStreamWithFilters(new Uint8Array([1, 2, 3]), ['LZWDecode'])).toThrow(/unsupported PDF stream filter: LZWDecode/);

    // Form XObject inliner wired into _stage4_tryWrapPage
    expect(docSrc).toContain('const expanded = _stage4_tryInlineFormXObjects(page, bytes, PDFName, context);');
  });

  it('W6-7: doc_builder_renderer preserves natural prose labels and renders math, code, footnote, and callout semantically', () => {
    loadAlloModule('doc_builder_renderer_module.js');
    const render = window.AlloModules.DocBuilderRenderer.createRenderer({
      docStyle: {
        headingColor: '#0f172a',
        textColor: '#1e293b',
        accentColor: '#2563eb',
        bgColor: '#ffffff',
        sectionBorderColor: '#cbd5e1',
        tableBg: '#1e3a8a',
        headerBg: '#1e3a8a',
      },
      _accessibleHeaderColors: () => null,
      _alloCellRichText: (value, escape) => escape(value),
      _emitAccessibleTableHtml: () => '<table></table>',
      _pipeLog: () => {},
      _sanitizeRawHtmlBlock: (html) => String(html || ''),
      _validateTableGrid: () => ({ ok: false }),
      renderWordArtHtml: (text) => '<span>' + text + '</span>',
      warnLog: () => {},
    });

    const html = render([
      { type: 'p', text: 'Title: The Great Gatsby' },
      { type: 'p', text: 'Description: Observe the cells under low power.' },
      { type: 'p', text: '"text": Leaked JSON key cleaned' },
      { type: 'math', latex: 'a^2 + b^2 = c^2', alt: 'a squared plus b squared equals c squared' },
      { type: 'code', code: 'const x = a < b && c > d;' },
      { type: 'footnote', text: '1. Source: US Census Bureau, 2024.' },
      { type: 'callout', title: 'Safety Note', text: 'Wear goggles at all times.' },
    ]);

    // Natural English prefixes preserved; quoted JSON leak stripped.
    expect(html).toContain('Title: The Great Gatsby');
    expect(html).toContain('Description: Observe the cells under low power.');
    expect(html).toContain('Leaked JSON key cleaned');
    expect(html).not.toContain('"text":');

    // Semantic blocks rendered properly.
    expect(html).toContain('role="math"');
    expect(html).toContain('aria-label="a squared plus b squared equals c squared"');
    expect(html).toContain('<pre');
    expect(html).toContain('<code>const x = a &lt; b &amp;&amp; c &gt; d;</code>');
    expect(html).toContain('<aside role="doc-footnote"');
    expect(html).toContain('<aside');
    expect(html).toContain('Safety Note');

    // Mirrors match root.
    for (const file of ['doc_pipeline_module.js', 'doc_builder_renderer_module.js']) {
      const h = sha256File(file);
      for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
        expect(sha256File(path.join(dir, file))).toBe(h);
      }
    }
  });
});
