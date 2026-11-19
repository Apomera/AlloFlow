// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const PIPE_SRC = fs.readFileSync(path.join(ROOT, 'doc_pipeline_source.jsx'), 'utf8');
const AUDIT_REM_SRC = fs.readFileSync(path.join(ROOT, 'audit_remediator_module.js'), 'utf8');
const AUDIT_REM_PUB = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/audit_remediator_module.js'), 'utf8');

function sliceBetween(src, startMarker, endMarker, label) {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error('startMarker not found for ' + label);
  const e = src.indexOf(endMarker, s + startMarker.length);
  if (e < 0) throw new Error('endMarker not found for ' + label);
  return src.slice(s, e);
}

// ── W4-C1: Source PDF StructTreeRoot Author-Alt / Formula / Lang / Outlines ──
describe('W4-C1: extractPdfStructTree preserves author figure alts, formulas, catalogLang, markInfo, outlines & 100 headings', () => {
  const fnSrc = sliceBetween(
    PIPE_SRC,
    'const extractPdfStructTree = async (base64) => {',
    '// ── Document Builder Tier 2: AI theme CSS contrast validator',
    'extractPdfStructTree'
  );

  const buildExtractor = (mockPdf, overrides = {}) => {
    const _withTimeout = (p) => Promise.resolve(p);
    const _b64ToBytes = () => new Uint8Array([37, 80, 68, 70]);
    const ensurePdfJsLoaded = async () => {};
    const warnLog = () => {};
    const _auditLanguageTagIsValid = (v) => typeof v === 'string' && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(v);
    window.pdfjsLib = {
      getDocument: () => ({ promise: Promise.resolve(mockPdf) }),
    };
    return new Function(
      'ensurePdfJsLoaded', '_b64ToBytes', '_withTimeout', 'warnLog', '_auditLanguageTagIsValid',
      fnSrc + '\nreturn extractPdfStructTree;'
    )(ensurePdfJsLoaded, _b64ToBytes, _withTimeout, warnLog, overrides.validator || _auditLanguageTagIsValid);
  };

  afterEach(() => {
    delete window.pdfjsLib;
  });

  it('extracts figureAlts, formulas (alt + actualText + MCID text), catalogLang, markInfo, outlines and destroys pdf', async () => {
    const destroySpy = vi.fn();
    const mockPdf = {
      numPages: 1,
      destroy: destroySpy,
      getMetadata: async () => ({ info: { Language: 'es_419' }, metadata: null }),
      getMarkInfo: async () => ({ Marked: true, Suspects: false }),
      getOutline: async () => ([
        { title: 'Chapter 1: Ecosystems', items: [{ title: '1.1 Food Webs', items: [] }] },
      ]),
      getPage: async () => ({
        getStructTree: async () => ({
          role: 'Document',
          children: [
            { role: 'H1', children: [{ type: 'content', id: 'p0_mc0' }] },
            { role: 'Figure', alt: 'Bar chart of rainfall by month from 2020 to 2024', children: [] },
            { role: 'Figure', alt: '   ', children: [] },
            { role: 'Formula', alt: 'E equals m c squared', actualText: 'E = mc^2', children: [{ type: 'content', id: 'p0_mc1' }] },
          ],
        }),
        getTextContent: async () => ({
          items: [
            { type: 'beginMarkedContentProps', id: 'p0_mc0' },
            { str: 'Ecosystems Overview' },
            { type: 'endMarkedContent' },
            { type: 'beginMarkedContentProps', id: 'p0_mc1' },
            { str: 'E=mc2' },
            { type: 'endMarkedContent' },
          ],
        }),
      }),
    };

    const extractPdfStructTree = buildExtractor(mockPdf);
    const res = await extractPdfStructTree('data:application/pdf;base64,JVBERg==');
    expect(res.hasTags).toBe(true);
    expect(res.headings).toEqual([{ level: 1, text: 'Ecosystems Overview', page: 1 }]);
    expect(res.altTextPresent).toBe(1);
    expect(res.altTextMissing).toBe(1);
    expect(res.figureAlts).toEqual([
      { page: 1, indexOnPage: 1, alt: 'Bar chart of rainfall by month from 2020 to 2024' },
    ]);
    expect(res.formulas).toEqual([
      { page: 1, alt: 'E equals m c squared', actualText: 'E = mc^2', text: 'E=mc2' },
    ]);
    expect(res.catalogLang).toBe('es-419');
    expect(res.markInfo).toEqual({ marked: true, suspects: false });
    expect(res.outlines).toEqual([
      { level: 1, title: 'Chapter 1: Ecosystems' },
      { level: 2, title: '1.1 Food Webs' },
    ]);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('keeps hasTags=false on untagged PDF while still harvesting catalogLang and bookmarks', async () => {
    const mockPdf = {
      numPages: 1,
      destroy: vi.fn(),
      getMetadata: async () => ({ info: {}, metadata: { get: (k) => (k === 'dc:language' ? ['ar-SA'] : null) } }),
      getMarkInfo: async () => ({ Marked: false, Suspects: false }),
      getOutline: async () => [{ title: 'Introduction', items: [] }],
      getPage: async () => ({
        getStructTree: async () => null,
      }),
    };
    const extractPdfStructTree = buildExtractor(mockPdf);
    const res = await extractPdfStructTree('JVBERg==');
    expect(res.hasTags).toBe(false);
    expect(res.catalogLang).toBe('ar-sa');
    expect(res.outlines).toEqual([{ level: 1, title: 'Introduction' }]);
  });

  it('auditPdf preserves 100 headings, catalogLang fallback, and fixAndVerifyPdf wires untrusted data blocks', () => {
    expect(PIPE_SRC).toContain('headings: (_structTree.headings || []).slice(0, 100),');
    expect(PIPE_SRC).toContain('const _catLang = _structTree && _structTree.catalogLang');
    expect(PIPE_SRC).toContain("_untrustedPromptDataBlock('SOURCE AUTHOR FIGURE ALT TEXT'");
    expect(PIPE_SRC).toContain("_untrustedPromptDataBlock('SOURCE AUTHOR FORMULA DESCRIPTIONS'");
    expect(PIPE_SRC).toContain("_untrustedPromptDataBlock('SOURCE PDF BOOKMARKS'");
  });
});

// ── W4-C2 & W4-C3: PDF/UA Tagging Rich Semantics ──
describe('W4-C2 & W4-C3: _buildOutlineStructElems rich semantics & math-source exclusion', () => {
  const outlineCode = sliceBetween(
    PIPE_SRC,
    'const _buildOutlineStructElems = () => {',
    '\n    // b0d24ae3 hypothesis-#1 hook',
    '_buildOutlineStructElems'
  );

  function runOutline(html) {
    const htmlDoc = new DOMParser().parseFromString(html, 'text/html');
    const objs = new Map();
    let nextNum = 10;
    const mkRef = () => ({ objectNumber: nextNum++, generationNumber: 0 });
    const context = {
      nextRef: mkRef,
      obj: (v) => v,
      register: (v) => { const r = mkRef(); objs.set(r.objectNumber, v); return r; },
      assign: (r, v) => { objs.set(r.objectNumber, v); },
      lookup: (r) => (r && typeof r.objectNumber === 'number' ? objs.get(r.objectNumber) : r),
    };
    const mkName = (n) => '/' + n;
    const mkStr = (s) => String(s);
    const mkHex = (s) => String(s);
    const mkNum = (n) => Number(n);
    const TAG_TO_PDF_ROLE = {
      h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
      p: 'P', ul: 'L', ol: 'L', li: 'LI', img: 'Figure', figure: 'Figure',
      table: 'Table', tr: 'TR', th: 'TH', td: 'TD', caption: 'Caption',
      thead: 'THead', tbody: 'TBody', tfoot: 'TFoot',
      blockquote: 'BlockQuote', a: 'Link',
      header: 'NonStruct', footer: 'NonStruct',
      section: 'Sect', nav: 'Sect', aside: 'Sect', main: 'Sect',
    };
    const HEADING_LEVEL = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };
    const structRootRef = mkRef();
    const unifiable = [];
    const fn = new Function(
      'htmlDoc', '_outlineItems', 'TAG_TO_PDF_ROLE', 'HEADING_LEVEL', 'PDFName', 'PDFString', 'PDFHexString', 'PDFNumber',
      'context', 'structRootRef', '_unifiableLeafRefs', 'idTreeEntries', 'warnLog', '_alloFigureCrop',
      outlineCode + '\nreturn _buildOutlineStructElems;'
    )(
      htmlDoc, [], TAG_TO_PDF_ROLE, HEADING_LEVEL,
      { of: mkName }, { of: mkStr }, { fromText: mkHex }, { of: mkNum },
      context, structRootRef, unifiable, [], () => {}, () => null
    );
    fn();
    return {
      unifiable,
      leaves: unifiable.map((lf) => ({ role: lf.role, isMathElement: !!lf.isMathElement, dict: objs.get(lf.ref.objectNumber) })),
    };
  }

  afterEach(() => {
    delete window.AlloMathSpeech;
  });

  it('W4-C2: skips details.allo-math-source completely so no unlinkable /P, /Code, or /Formula leaks', () => {
    const html = `<html><body>
      <img src="data:image/png;base64,AA==" alt="x squared" data-allo-kind="equation">
      <details class="allo-math-source">
        <summary>Math (navigable MathML + LaTeX)</summary>
        <math display="block"><msup><mi>x</mi><mn>2</mn></msup></math>
        <pre class="allo-latex">x^2</pre>
        <p><em>AI-transcribed from the image — verify before reuse.</em></p>
      </details>
    </body></html>`;
    const { leaves } = runOutline(html);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].role).toBe('Formula');
    expect(leaves[0].dict.Alt).toBe('x squared');
  });

  it('W4-C3: emits /Code for <pre>, /Formula for standalone <math> (with spoken fallback), and skips inline <math>', () => {
    window.AlloMathSpeech = { toSpeech: (tex) => tex === '\\frac{1}{2}' ? 'one half' : '' };
    const html = `<html><body>
      <pre><code>const total = a + b;</code></pre>
      <math display="block" aria-label="a squared plus b squared equals c squared"><mi>a</mi></math>
      <math alttext="integral from 0 to 1"><mo>∫</mo></math>
      <math display="block"><semantics><mfrac><mn>1</mn><mn>2</mn></mfrac><annotation encoding="application/x-tex">\\frac{1}{2}</annotation></semantics></math>
      <p>Inline equation <math><mi>x</mi><mo>=</mo><mn>5</mn></math> inside prose.</p>
    </body></html>`;
    const { leaves } = runOutline(html);
    const roles = leaves.map((l) => l.role);
    expect(roles).toEqual(['Code', 'Formula', 'Formula', 'Formula', 'P']);
    expect(leaves[0].dict.ActualText).toBe('const total = a + b;');
    expect(leaves[1].dict.Alt).toBe('a squared plus b squared equals c squared');
    expect(leaves[2].dict.Alt).toBe('integral from 0 to 1');
    expect(leaves[3].dict.Alt).toBe('one half');
    expect(leaves[4].dict.ActualText).toContain('Inline equation');
    // Phase C2: standalone <math> is tagged isMathElement=true so Stage 4b links it as text and Stage 4c excludes it from bitmap figure pairing
    expect(leaves[1].isMathElement).toBe(true);
    expect(leaves[0].isMathElement).toBe(false);
  });

  it('Phase C2: Stage 4b LINKABLE includes Code & isMathElement Formula, Stage 4c excludes isMathElement, and nested <pre> inside non-promoted <td>/<li> does not duplicate', () => {
    expect(PIPE_SRC).toContain('const LINKABLE = { H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, P: 1, BlockQuote: 1, Caption: 1, TH: 1, TD: 1, LBody: 1, Note: 1, Code: 1 };');
    expect(PIPE_SRC).toContain("const _isStage4bLinkable = (lf) => !!(lf && (LINKABLE[lf.role] || (lf.role === 'Formula' && lf.isMathElement)));");
    expect(PIPE_SRC).toContain("if ((lf.role !== 'Figure' && lf.role !== 'Formula') || lf.isMathElement) return false;");
    expect(PIPE_SRC).toContain("const _figsAllLinked = _unifiableLeafRefs.filter((lf) => (lf.role === 'Figure' || lf.role === 'Formula') && !lf.isMathElement).every");
    const html = `<html><body>
      <table><tr><td>Cell <pre>code1</pre></td></tr></table>
      <ul><li>Item <pre>code2</pre></li></ul>
      <pre>standalone code</pre>
    </body></html>`;
    const { leaves } = runOutline(html);
    const codeLeaves = leaves.filter((l) => l.role === 'Code');
    expect(codeLeaves).toHaveLength(1);
    expect(codeLeaves[0].dict.ActualText).toBe('standalone code');
  });

  it('W4-C3: falls back /Figure /Alt from visible <figcaption> when alt is missing, while preserving explicit alt="" as decorative', () => {
    const html = `<html><body>
      <figure><img src="chart.png"><figcaption>Monthly temperature trend</figcaption></figure>
      <figure><img src="decor.png" alt=""><figcaption>Should not override decorative</figcaption></figure>
      <figure><img src="hidden.png"><figcaption><span aria-hidden="true">Echo only</span>Visible note</figcaption></figure>
    </body></html>`;
    const { leaves } = runOutline(html);
    expect(leaves).toHaveLength(3);
    expect(leaves[0].role).toBe('Figure');
    expect(leaves[0].dict.Alt).toBe('Monthly temperature trend');
    expect(leaves[1].role).toBe('NonStruct');
    expect(leaves[1].dict.Alt).toBe('');
    expect(leaves[2].role).toBe('Figure');
    expect(leaves[2].dict.Alt).toBe('Visible note');
  });

  it('W4-C3: maps DPUB-ARIA doc-footnote/doc-endnote and section.footnotes to /Note without duplicate /P', () => {
    const html = `<html><body>
      <aside role="doc-footnote"><p>See Appendix A for derivation.</p></aside>
      <section role="doc-endnotes"><ol><li>Endnote citation one.</li></ol></section>
      <section class="footnotes"><ol><li>Classic footnote two.</li></ol></section>
    </body></html>`;
    const { leaves } = runOutline(html);
    const notes = leaves.filter((l) => l.role === 'Note');
    expect(leaves.filter((l) => l.role === 'P')).toHaveLength(0);
    expect(notes).toHaveLength(3);
    expect(notes.map((l) => l.dict.ActualText)).toEqual([
      'See Appendix A for derivation.',
      'Endnote citation one.',
      'Classic footnote two.',
    ]);
  });
});

// ── W4-C4: Stage 3b Named Destination Resolution & #anchor HTML Lookup ──
describe('W4-C4: Stage 3b resolves named /Dests and /Names -> /Dests + #anchor links', () => {
  it('Stage 3b wires _lnkHashHtml, _namedDestPageMap, /Names -> /Dests walk, and #anchor fallback', () => {
    expect(PIPE_SRC).toContain('const _lnkHashHtml = new Map();');
    expect(PIPE_SRC).toContain('const _namedDestPageMap = new Map();');
    expect(PIPE_SRC).toContain("const _destsTree = _catNames && typeof _catNames.get === 'function' ? context.lookup(_catNames.get(PDFName.of('Dests'))) : null;");
    expect(PIPE_SRC).toContain('(!uri && destName && _lnkFromHash(destName))');
  });

  it('resolves both legacy /Dests dict and /Names -> /Dests tree entries to exact page indices', () => {
    // Exercise the exact resolution block extracted from doc_pipeline_source.jsx with a mock pdf-lib catalog.
    const block = sliceBetween(
      PIPE_SRC,
      'const _lnkHtml = new Map();',
      'const _lnkReadable = (u) => {',
      'Stage3b named dests'
    );
    const htmlDoc = new DOMParser().parseFromString('<a href="#fn1">Footnote One</a><a href="#sec-intro">Introduction</a>', 'text/html');
    const page0Ref = { toString: () => '10 0 R' };
    const page1Ref = { toString: () => '20 0 R' };
    const pages = [{ ref: page0Ref }, { ref: page1Ref }];
    const mkArr = (arr) => ({ size: () => arr.length, get: (i) => arr[i] });
    const mkDict = (obj) => ({
      get: (k) => obj[k],
      keys: () => Object.keys(obj),
    });
    const destsTree = mkDict({
      '/Kids': mkArr([
        mkDict({ '/Names': mkArr(['fn1', mkArr([page1Ref, '/XYZ', 0, 700, 0])]) }),
      ]),
    });
    const catalog = mkDict({
      '/Dests': mkDict({ '/sec-intro': mkDict({ '/D': mkArr([page0Ref, '/Fit']) }) }),
      '/Names': mkDict({ '/Dests': destsTree }),
    });
    const context = { lookup: (x) => x };
    const PDFName = { of: (n) => '/' + n };
    const _lnkClean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const _lnkKey = (u) => String(u || '').trim().toLowerCase();

    const out = new Function(
      'htmlDoc', 'pages', 'catalog', 'context', 'PDFName', '_lnkClean', '_lnkKey',
      block + '\nreturn { _namedDestPageMap, _lnkFromHash };'
    )(htmlDoc, pages, catalog, context, PDFName, _lnkClean, _lnkKey);

    expect(out._namedDestPageMap.get('fn1')).toBe(1);
    expect(out._namedDestPageMap.get('sec-intro')).toBe(0);
    expect(out._lnkFromHash('fn1')).toBe('Footnote One');
    expect(out._lnkFromHash('sec-intro')).toBe('Introduction');
  });
});

// ── W4-C5: fixDuplicateIds & fix_duplicate_id & AXE_RULE_TO_TOOL ──
describe('W4-C5: fixDuplicateIds deterministic repair with collision avoidance and scoped reference updates', () => {
  const serializeCode = sliceBetween(
    PIPE_SRC,
    'function _serializeDomEdit(originalHtml, doc) {',
    '\n// ── Deterministic palette contrast clamp',
    '_serializeDomEdit'
  );
  const fixDupCode = sliceBetween(
    PIPE_SRC,
    'const fixDuplicateIds = (htmlContent, targetId = null) => {',
    '// Convenience wrapper: run all deterministic WCAG fixes in sequence',
    'fixDuplicateIds'
  );
  const fixDuplicateIds = new Function(
    'warnLog',
    serializeCode + '\n' + fixDupCode + '\nreturn fixDuplicateIds;'
  )(() => {});

  it('avoids collisions when id-2 already exists and never touches data-id', () => {
    const html = '<html><body><div id="box" data-id="box">A</div><div id="box-2">B</div><div id="box">C</div></body></html>';
    const res = fixDuplicateIds(html);
    expect(res.fixCount).toBe(1);
    const d = new DOMParser().parseFromString(res.html, 'text/html');
    const ids = Array.from(d.querySelectorAll('[id]')).map((el) => el.id);
    expect(ids).toEqual(['box', 'box-2', 'box-3']);
    expect(d.getElementById('box').getAttribute('data-id')).toBe('box');
  });

  it('updates table <td headers> in a second table without disturbing the first table', () => {
    const html = `<html><body>
      <table><tr><th id="h1" scope="col">Name</th></tr><tr><td headers="h1">Alice</td></tr></table>
      <table><tr><th id="h1" scope="col">Score</th></tr><tr><td headers="h1">95</td></tr></table>
    </body></html>`;
    const res = fixDuplicateIds(html);
    expect(res.fixCount).toBe(1);
    const d = new DOMParser().parseFromString(res.html, 'text/html');
    const tables = d.querySelectorAll('table');
    expect(tables[0].querySelector('th').id).toBe('h1');
    expect(tables[0].querySelector('td').getAttribute('headers')).toBe('h1');
    expect(tables[1].querySelector('th').id).toBe('h1-2');
    expect(tables[1].querySelector('td').getAttribute('headers')).toBe('h1-2');
  });

  it('rebinds duplicate <label for> and container-scoped aria-labelledby / #href references', () => {
    const html = `<html><body>
      <fieldset><label for="ans">Q1</label><input id="ans" type="text"></fieldset>
      <fieldset><label for="ans">Q2</label><input id="ans" type="text"></fieldset>
      <section aria-labelledby="sec"><h2 id="sec">First</h2><a href="#sec">Top</a></section>
      <section aria-labelledby="sec"><h2 id="sec">Second</h2><a href="#sec">Top</a></section>
    </body></html>`;
    const res = fixDuplicateIds(html);
    expect(res.fixCount).toBe(2);
    const d = new DOMParser().parseFromString(res.html, 'text/html');
    const fieldsets = d.querySelectorAll('fieldset');
    expect(fieldsets[0].querySelector('label').getAttribute('for')).toBe('ans');
    expect(fieldsets[0].querySelector('input').id).toBe('ans');
    expect(fieldsets[1].querySelector('label').getAttribute('for')).toBe('ans-2');
    expect(fieldsets[1].querySelector('input').id).toBe('ans-2');
    const sections = d.querySelectorAll('section');
    expect(sections[0].getAttribute('aria-labelledby')).toBe('sec');
    expect(sections[0].querySelector('a').getAttribute('href')).toBe('#sec');
    expect(sections[1].getAttribute('aria-labelledby')).toBe('sec-2');
    expect(sections[1].querySelector('h2').id).toBe('sec-2');
    expect(sections[1].querySelector('a').getAttribute('href')).toBe('#sec-2');
  });

  it('wires fixDuplicateIds into runDeterministicWcagFixes and maps duplicate-id-aria/active in AXE_RULE_TO_TOOL', () => {
    expect(PIPE_SRC).toContain('result = fixDuplicateIds(result).html;');
    expect(PIPE_SRC).toContain("'duplicate-id-aria':");
    expect(PIPE_SRC).toContain("'duplicate-id-active':");
  });

  it('Phase C2: rebinds 3rd and 4th duplicate <label for="x"> controls cleanly in a shared form', () => {
    const html = `<html><body><form>
      <label for="x">One</label><input id="x" type="text">
      <label for="x">Two</label><input id="x" type="text">
      <label for="x">Three</label><input id="x" type="text">
      <label for="x">Four</label><input id="x" type="text">
    </form></body></html>`;
    const res = fixDuplicateIds(html);
    expect(res.fixCount).toBe(3);
    const d = new DOMParser().parseFromString(res.html, 'text/html');
    const lbls = Array.from(d.querySelectorAll('label')).map((l) => l.getAttribute('for'));
    const ins = Array.from(d.querySelectorAll('input')).map((i) => i.id);
    expect(ins).toEqual(['x', 'x-2', 'x-3', 'x-4']);
    expect(lbls).toEqual(['x', 'x-2', 'x-3', 'x-4']);
  });
});

// ── W4-C6: <html lang> + dir="rtl" consistency ──
describe('W4-C6: <html lang> + dir="rtl" propagation across all repair paths', () => {
  const fixLangStart = PIPE_SRC.indexOf('    fix_lang: {');
  const fixLangEnd = PIPE_SRC.indexOf('    fix_lang_span: {', fixLangStart);
  const fixLangObj = new Function('return ({' + PIPE_SRC.slice(fixLangStart, fixLangEnd) + '});')();

  const landmarkStart = PIPE_SRC.indexOf('function fixLandmarkFoundations(html) {');
  const landmarkEnd = PIPE_SRC.indexOf('\n}', landmarkStart) + 2;
  const fixLandmarkFoundations = new Function(PIPE_SRC.slice(landmarkStart, landmarkEnd) + '\nreturn fixLandmarkFoundations;')();

  const applyDetectedCode = sliceBetween(
    PIPE_SRC,
    'const _applyDetectedLang = (html) => {',
    'const beforeScore =',
    '_applyDetectedLang'
  );
  const makeApplyDetectedLang = (documentLanguage) => new Function(
    '_auditResult', 'isRtlLang', 'warnLog',
    applyDetectedCode + '\nreturn _applyDetectedLang;'
  )(
    { documentLanguage },
    (l) => /^(?:ar|he|fa|ur|ps|yi|dv|sd|ug|ckb|ks|syr)(?:-|$)/i.test(String(l || '')),
    () => {}
  );

  it('_applyDetectedLang adds <html lang> even when inner <span lang="es"> exists, supports es-419/zh-Hans-CN, and sets dir="rtl"', () => {
    const applyEs419 = makeApplyDetectedLang('es-419');
    const outEs = applyEs419('<html><body><p><span lang="fr">Bonjour</span></p></body></html>');
    expect(outEs).toMatch(/<html\s+lang="es-419">/i);

    const applyZh = makeApplyDetectedLang('zh-Hans-CN');
    expect(applyZh('<html lang="en"><body><p>中文</p></body></html>')).toMatch(/<html\s+lang="zh-hans-cn">/i);

    const applyAr = makeApplyDetectedLang('ar');
    const outAr = applyAr('<html><body><p><span lang="en">ID</span> مرحبا</p></body></html>');
    expect(outAr).toMatch(/<html\s+lang="ar"\s+dir="rtl">/i);

    // Phase C2: overriding RTL -> LTR clears stale dir="rtl"
    const applyFr = makeApplyDetectedLang('fr');
    const outFr = applyFr('<html lang="ar" dir="rtl"><body><p>Bonjour</p></body></html>');
    expect(outFr).toMatch(/<html\s+lang="fr">/i);
    expect(outFr).not.toMatch(/dir="rtl"/i);
  });

  it('fix_lang handles case/single-quotes, validates BCP-47, sets dir="rtl" for RTL, and clears stale dir="rtl" on switch to LTR', () => {
    const rtlOut = fixLangObj.fix_lang.fn("<HTML LANG='en'><body></body></HTML>", { lang: 'ar-EG' });
    expect(rtlOut).toContain('lang="ar-EG"');
    expect(rtlOut).toContain('dir="rtl"');

    const ltrOut = fixLangObj.fix_lang.fn('<html lang="ar" dir="rtl"><body></body></html>', { lang: 'fr-CA' });
    expect(ltrOut).toContain('lang="fr-CA"');
    expect(ltrOut).not.toContain('dir="rtl"');

    // Invalid BCP-47 tag rejected
    expect(fixLangObj.fix_lang.fn('<html lang="en"><body></body></html>', { lang: 'HistoryHistory' })).toBe('<html lang="en"><body></body></html>');
  });

  it('fixLandmarkFoundations stamps dir="rtl" idempotently for RTL <html lang> and leaves LTR untouched', () => {
    const rtlOnce = fixLandmarkFoundations('<html lang="ar"><head><title>T</title></head><body><main id="main-content"><p>x</p></main></body></html>');
    expect(rtlOnce).toMatch(/<html[^>]*dir="rtl"/i);
    expect(fixLandmarkFoundations(rtlOnce)).toBe(rtlOnce);

    const ltr = fixLandmarkFoundations('<html lang="es"><head><title>T</title></head><body><main id="main-content"><p>x</p></main></body></html>');
    expect(ltr).not.toMatch(/dir="rtl"/i);
  });
});

// ── W4-C7: OCR Worker Crash Rejection & Mixed-Page Render Cancellation ──
describe('W4-C7: OCR raster worker rejects pending renders on error & mixed-page OCR cancels timed-out renders', () => {
  it('_alloCreateOcrRasterWorker rejects in-flight render immediately on worker.onerror', async () => {
    const workerCode = sliceBetween(
      PIPE_SRC,
      'const _alloCreateOcrRasterWorker = async (bytes) => {',
      'const extractPdfTextTesseract = async',
      '_alloCreateOcrRasterWorker'
    );
    let capturedWorker = null;
    const fakeWorker = {
      listeners: [],
      addEventListener(ev, fn) { this.listeners.push({ ev, fn }); },
      removeEventListener(ev, fn) { this.listeners = this.listeners.filter((x) => x.fn !== fn); },
      postMessage(msg) {
        if (msg.t === 'init') {
          setTimeout(() => {
            this.listeners.forEach((l) => l.ev === 'message' && l.fn({ data: { t: 'ready' } }));
          }, 0);
        }
      },
      terminate: vi.fn(),
    };
    window.__alloCreateVerifiedWorker = async () => { capturedWorker = fakeWorker; return fakeWorker; };
    const origWorker = globalThis.Worker;
    const origOffscreen = globalThis.OffscreenCanvas;
    globalThis.Worker = function () {};
    globalThis.OffscreenCanvas = function () {};
    try {
      const factory = new Function(
        '_ALLO_RASTER_WORKER_MAX_BYTES', '_alloOcrRasterWorkerSource', '_withTimeout',
        workerCode + '\nreturn _alloCreateOcrRasterWorker;'
      )(50 * 1024 * 1024, () => '', (p) => p);
      const ctrl = await factory(new Uint8Array([1, 2, 3, 4]));
      expect(ctrl).toBeTruthy();
      const renderPromise = ctrl.render(1, 2.0, 45000);
      capturedWorker.onerror({ message: 'OOM crash' });
      await expect(renderPromise).rejects.toThrow(/OOM crash/);
      expect(ctrl.healthy()).toBe(false);
    } finally {
      delete window.__alloCreateVerifiedWorker;
      globalThis.Worker = origWorker;
      globalThis.OffscreenCanvas = origOffscreen;
    }
  });

  it('_ocrSpecificPages stores _renderTask and calls _renderTask.cancel() on failure', () => {
    const mixedCode = sliceBetween(
      PIPE_SRC,
      'const _ocrSpecificPages = async (base64, pageNums, lang, confOut) => {',
      'const _resolveVisionOcrChunk = async',
      '_ocrSpecificPages'
    );
    expect(mixedCode).toContain('_renderTask = page.render({ canvasContext: cctx, viewport });');
    expect(mixedCode).toContain('if (_renderTask && typeof _renderTask.cancel === \'function\') _renderTask.cancel();');
  });

  it('Phase C2: _alloCreateOcrRasterWorker rejects _initDone immediately when worker.onerror fires during startup', async () => {
    const workerCode = sliceBetween(
      PIPE_SRC,
      'const _alloCreateOcrRasterWorker = async (bytes) => {',
      'const extractPdfTextTesseract = async',
      '_alloCreateOcrRasterWorker'
    );
    const fakeWorker = {
      listeners: [],
      addEventListener(ev, fn) { this.listeners.push({ ev, fn }); },
      removeEventListener(ev, fn) { this.listeners = this.listeners.filter((x) => x.fn !== fn); },
      postMessage(msg) {
        if (msg.t === 'init') {
          setTimeout(() => { if (this.onerror) this.onerror({ message: 'startup crash' }); }, 0);
        }
      },
      terminate: vi.fn(),
    };
    window.__alloCreateVerifiedWorker = async () => fakeWorker;
    const origWorker = globalThis.Worker;
    const origOffscreen = globalThis.OffscreenCanvas;
    globalThis.Worker = function () {};
    globalThis.OffscreenCanvas = function () {};
    try {
      const factory = new Function(
        '_ALLO_RASTER_WORKER_MAX_BYTES', '_alloOcrRasterWorkerSource', '_withTimeout',
        workerCode + '\nreturn _alloCreateOcrRasterWorker;'
      )(50 * 1024 * 1024, () => '', (p) => p);
      const ctrl = await factory(new Uint8Array([1, 2, 3, 4]));
      expect(ctrl).toBeNull();
      expect(fakeWorker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      delete window.__alloCreateVerifiedWorker;
      globalThis.Worker = origWorker;
      globalThis.OffscreenCanvas = origOffscreen;
    }
  });
});

// ── W4-C8: Curriculum Audit Remediator (audit_remediator_module.js) ──
describe('W4-C8: audit_remediator_module.js deterministic IDs, safe merge, WCAG dialog ARIA, and mirror parity', () => {
  beforeEach(() => {
    delete window.AlloModules;
    delete window.React;
  });
  afterEach(() => {
    delete window.AlloModules;
    delete window.React;
  });

  function loadRemediatorWithMockReact() {
    const hooks = [];
    let hookIdx = 0;
    const effects = [];
    const mockReact = {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      useState: (init) => {
        const i = hookIdx++;
        if (hooks.length <= i) hooks.push(typeof init === 'function' ? init() : init);
        return [hooks[i], (val) => { hooks[i] = typeof val === 'function' ? val(hooks[i]) : val; }];
      },
      useMemo: (fn) => fn(),
      useRef: (init) => {
        const i = hookIdx++;
        if (hooks.length <= i) hooks.push({ current: init });
        return hooks[i];
      },
      useEffect: (fn) => { effects.push(fn); },
    };
    window.React = mockReact;
    new Function(AUDIT_REM_SRC)();
    return {
      AuditRemediator: window.AlloModules.AuditRemediator,
      render: (props) => {
        hookIdx = 0;
        effects.length = 0;
        const tree = window.AlloModules.AuditRemediator(props);
        const cleanups = effects.map((f) => f()).filter((c) => typeof c === 'function');
        return { tree, cleanups };
      },
    };
  }

  function findNodes(node, pred, acc = []) {
    if (!node) return acc;
    if (Array.isArray(node)) { node.forEach((n) => findNodes(n, pred, acc)); return acc; }
    if (typeof node === 'object') {
      if (pred(node)) acc.push(node);
      if (node.children) findNodes(node.children, pred, acc);
    }
    return acc;
  }

  it('desktop/web-app/public/audit_remediator_module.js is byte-identical to root audit_remediator_module.js', () => {
    expect(AUDIT_REM_PUB).toBe(AUDIT_REM_SRC);
  });

  it('parseRecommendations produces stable deterministic IDs across repeated calls and history changes', () => {
    const { AuditRemediator } = loadRemediatorWithMockReact();
    const { parseRecommendations } = AuditRemediator._internals;
    const comp = {
      vocabulary: { llmReview: { recommendations: ['mitosis', 'osmosis'], missedTier2: ['photosynthesis'] } },
      engagement: { llmReview: { formatGaps: ['Add a visual organizer', 'Add a visual organizer'] } },
    };
    const r1 = parseRecommendations(comp, []);
    const r2 = parseRecommendations(comp, [{ id: 'g1', type: 'glossary' }]);
    expect(r1.map((a) => a.id)).toEqual(r2.map((a) => a.id));
    expect(new Set(r1.map((a) => a.id)).size).toBe(r1.length); // duplicate gaps still get unique deterministic IDs
  });

  it('applyArtifactAction returns no-new-item-created on silent failure and never merges an unrelated pre-existing item', async () => {
    const { AuditRemediator } = loadRemediatorWithMockReact();
    const { applyArtifactAction } = AuditRemediator._internals;
    let history = [
      { id: 'q-old', type: 'quiz', data: { v: 1 }, title: 'Quiz 1' },
      { id: 'q-other', type: 'quiz', data: { v: 2 }, title: 'Quiz 2 (unrelated)' },
    ];
    const setHistory = (updater) => { history = updater(history); };

    // Silent failure: handleGenerate resolves without adding any new item
    const resSilent = await applyArtifactAction(
      { target: 'quiz', existingItemId: 'q-old', dimension: 'Engagement', label: 'Augment quiz' },
      { history, setHistory, handleGenerate: async () => {} }
    );
    expect(resSilent.ok).toBe(false);
    expect(resSilent.reason).toBe('no-new-item-created');
    expect(history).toHaveLength(2);
    expect(history[0].data).toEqual({ v: 1 });
    expect(history[1].id).toBe('q-other');

    // Prepend success: handleGenerate prepends a genuinely new item at index 0
    const resPrepend = await applyArtifactAction(
      { target: 'quiz', existingItemId: 'q-old', dimension: 'Engagement', label: 'Augment quiz' },
      {
        history,
        setHistory,
        handleGenerate: async () => {
          history = [{ id: 'q-new', type: 'quiz', data: { v: 3 }, title: 'Quiz 3' }, ...history];
        },
      }
    );
    expect(resPrepend.ok).toBe(true);
    expect(history).toHaveLength(2);
    const merged = history.find((h) => h.id === 'q-old');
    expect(merged.data).toEqual({ v: 3 });
    expect(merged.previousVersions).toHaveLength(1);
    expect(merged.previousVersions[0].data).toEqual({ v: 1 });
    expect(history.find((h) => h.id === 'q-other').data).toEqual({ v: 2 });
  });

  it('renders WCAG modal dialog attributes, handles Escape key, and gates fact-check toggle on _arAiUsable', () => {
    const { render } = loadRemediatorWithMockReact();
    const onClose = vi.fn();
    const { tree, cleanups } = render({
      isOpen: true,
      onClose,
      generatedContent: {
        data: {
          comprehensive: {
            overall: { score: 72, label: 'Developing' },
            accuracy: { llmReview: { claimsToVerify: ['Water boils at 100C'] } },
            vocabulary: { llmReview: { recommendations: ['entropy'] } },
          },
        },
      },
      history: [],
      callGemini: null, // AI unavailable -> fact-check toggle must NOT render
    });
    const dialogs = findNodes(tree, (n) => n.props && n.props.role === 'dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].props['aria-modal']).toBe('true');
    expect(dialogs[0].props['aria-labelledby']).toBe('audit-remediator-title');
    const titleH2 = findNodes(tree, (n) => n.type === 'h2' && n.props && n.props.id === 'audit-remediator-title');
    expect(titleH2).toHaveLength(1);
    // Fact-check checkbox is gated off when callGemini is unavailable
    const fcInputs = findNodes(tree, (n) => n.type === 'input' && n.props && /Google Search/.test(n.props['aria-label'] || ''));
    expect(fcInputs).toHaveLength(0);

    // Pressing Escape dismisses the modal
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanups.forEach((c) => c());
  });

  it('Phase C2: resets transient phase/verdicts/errorMsg/beforeReadinessRef when modal re-opens', () => {
    // Verify the [props.isOpen] reset effect restores confirm phase when isOpen transitions false -> true
    const hooks = [];
    const prevDeps = [];
    let hookIdx = 0;
    let effectIdx = 0;
    const pendingEffects = [];
    window.React = {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      useState: (init) => {
        const i = hookIdx++;
        if (hooks.length <= i) hooks.push(typeof init === 'function' ? init() : init);
        return [hooks[i], (val) => { hooks[i] = typeof val === 'function' ? val(hooks[i]) : val; }];
      },
      useMemo: (fn) => fn(),
      useRef: (init) => {
        const i = hookIdx++;
        if (hooks.length <= i) hooks.push({ current: init });
        return hooks[i];
      },
      useEffect: (fn, deps) => {
        const i = effectIdx++;
        const changed = !prevDeps[i] || !deps || deps.some((d, idx) => d !== prevDeps[i][idx]);
        prevDeps[i] = deps;
        if (changed) pendingEffects.push(fn);
      },
    };
    new Function(AUDIT_REM_SRC)();
    const runRender = (props) => {
      hookIdx = 0;
      effectIdx = 0;
      pendingEffects.length = 0;
      const tree = window.AlloModules.AuditRemediator(props);
      pendingEffects.forEach((f) => f());
      return tree;
    };
    const baseProps = {
      isOpen: true,
      onClose: () => {},
      generatedContent: { data: { comprehensive: { overall: { score: 60, label: 'Low' } } } },
      history: [],
      callGemini: null,
    };
    runRender(baseProps);
    // Simulate phase='done' left over from a prior Apply
    const phaseHookIdx = hooks.findIndex((v) => v === 'confirm');
    expect(phaseHookIdx).toBeGreaterThanOrEqual(0);
    hooks[phaseHookIdx] = 'done';
    // Close then re-open with a new score
    runRender(Object.assign({}, baseProps, { isOpen: false }));
    runRender(Object.assign({}, baseProps, { isOpen: true, generatedContent: { data: { comprehensive: { overall: { score: 88, label: 'Strong' } } } } }));
    expect(hooks[phaseHookIdx]).toBe('confirm');
  });
});
