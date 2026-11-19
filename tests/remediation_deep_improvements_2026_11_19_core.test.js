// Regression & verification suite for 2026-11-19 Core Web/Browser Remediation Pipeline improvements:
// C-A1..C-A18, C-B1 (H43 headers), C-B2 (PDF/UA-1 validator parity), and C-B4 (edited preview & canvas cleanup).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const PDFLib = require('../desktop/mcp/vendor/pdf-lib.min.js');

const ROOT = process.cwd();
const DP_SRC = fs.readFileSync(path.resolve(ROOT, 'doc_pipeline_source.jsx'), 'utf8');
const DP_MOD = fs.readFileSync(path.resolve(ROOT, 'doc_pipeline_module.js'), 'utf8');
const VIEW_SRC = fs.readFileSync(path.resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
const BATCH_WS = fs.readFileSync(path.resolve(ROOT, 'remediation_batch_workspace.jsx'), 'utf8');
const WS_COMP = fs.readFileSync(path.resolve(ROOT, 'remediation_workspace_component.jsx'), 'utf8');
const VAL_SRC = fs.readFileSync(path.resolve(ROOT, 'view_pdf_validator_module.js'), 'utf8');
const VAL_PUB = fs.readFileSync(path.resolve(ROOT, 'desktop/web-app/public/view_pdf_validator_module.js'), 'utf8');
const VAL_CLI = fs.readFileSync(path.resolve(ROOT, 'dev-tools/demo/exported_pdf_validator.cjs'), 'utf8');

function extractArrow(name) {
  const anchor = '  const ' + name + ' = ';
  const start = DP_SRC.indexOf(anchor);
  if (start < 0) throw new Error('Missing arrow anchor: ' + name);
  const end = DP_SRC.indexOf('\n  };', start);
  if (end < 0) throw new Error('Missing arrow end: ' + name);
  return DP_SRC.slice(start, end + 5);
}

function extractTopFn(sig) {
  const start = DP_SRC.indexOf(sig);
  if (start < 0) throw new Error('Missing fn sig: ' + sig);
  const end = DP_SRC.indexOf('\n}', start);
  if (end < 0) throw new Error('Missing fn end: ' + sig);
  return DP_SRC.slice(start, end + 2);
}

// ── C-A1: _alloSanitizeRemediationHtml ──
describe('C-A1: _alloSanitizeRemediationHtml restores canonical charset & viewport meta', () => {
  const cssStart = DP_SRC.indexOf('function _alloDecodeImportedCss');
  const htmlEnd = DP_SRC.indexOf('function _alloSanitizeRemediationBodyFragment', cssStart);
  const sanitizeHtml = new Function(
    'DOMParser',
    'const _ALLO_MAX_IMPORTED_HTML_CHARS = 128 * 1024 * 1024;\n' + DP_SRC.slice(cssStart, htmlEnd) + '\nreturn _alloSanitizeRemediationHtml;'
  )(globalThis.DOMParser);

  it('strips untrusted meta tags (refresh, user-scalable=no) and injects canonical utf-8 charset first + viewport', () => {
    const dirty = '<!DOCTYPE html><html lang="en"><head><meta http-equiv="refresh" content="0;url=https://evil.example"><meta name="viewport" content="width=device-width, user-scalable=no"><title>T</title></head><body><p>Em-dash — café</p></body></html>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/http-equiv\s*=\s*["']?refresh/i);
    expect(clean).not.toContain('user-scalable=no');
    const charsetIdx = clean.indexOf('<meta charset="utf-8">');
    const vpIdx = clean.indexOf('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    expect(charsetIdx).toBeGreaterThan(0);
    expect(charsetIdx).toBeLessThan(200);
    expect(vpIdx).toBeGreaterThan(charsetIdx);
    expect(clean).toContain('Em-dash — café');
  });
});

// ── C-A2: _collapseHeadingSkipsStrict & fixHeadingHierarchy ──
describe('C-A2: stack-based heading skip collapse & case-insensitive matched close tags', () => {
  const strictCode = extractTopFn('function _collapseHeadingSkipsStrict(htmlContent) {');
  const collapseStrict = new Function(strictCode + '\nreturn _collapseHeadingSkipsStrict;')();
  const fixHierarchy = new Function(extractArrow('fixHeadingHierarchy') + '\nreturn fixHeadingHierarchy;')();

  it('prevents sibling staircase corruption in _collapseHeadingSkipsStrict', () => {
    expect(collapseStrict('<h1>T</h1><h4>A</h4><h4>B</h4><h4>C</h4>').html)
      .toBe('<h1>T</h1><h2>A</h2><h2>B</h2><h2>C</h2>');
    expect(collapseStrict('<h1>T</h1><h4>A</h4><h6>Sub</h6><h4>B</h4>').html)
      .toBe('<h1>T</h1><h2>A</h2><h3>Sub</h3><h2>B</h2>');
    expect(collapseStrict('<h1>T</h1><h4>A</h4><h6>Sub</h6>').html)
      .toBe('<h1>T</h1><h2>A</h2><h3>Sub</h3>');
    expect(collapseStrict('<h2>Only</h2>')).toEqual({ html: '<h2>Only</h2>', fixCount: 0 });
  });

  it('handles uppercase <H4>...</H4> and skips unclosed truncated headings without mismatch', () => {
    expect(collapseStrict('<h1>T</h1><H4 class="sec">Upper</H4>').html)
      .toBe('<h1>T</h1><h2 class="sec">Upper</h2>');
    const unclosed = '<h1>T</h1><h4>Truncated without close';
    expect(collapseStrict(unclosed)).toEqual({ html: unclosed, fixCount: 0 });
  });

  it('prevents sibling staircase in lenient fixHeadingHierarchy and matches case-insensitive closes', () => {
    expect(fixHierarchy('<h1>T</h1><h5>A</h5><h5>B</h5>').html)
      .toBe('<h1>T</h1><h3>A</h3><h3>B</h3>');
    expect(fixHierarchy('<h1>T</h1><H5>Upper</H5>').html)
      .toBe('<h1>T</h1><h3>Upper</h3>');
    const unclosed = '<h1>T</h1><h5>Truncated';
    expect(fixHierarchy(unclosed)).toEqual({ html: unclosed, fixCount: 0 });
  });
});

// ── C-A3: sanitizeStyleForWCAG AAA & fixContrastViolations ──
describe('C-A3: AAA contrast routes through DOM-aware fixContrastViolations without NaN', () => {
  const contrastCode = extractArrow('fixContrastViolations');
  const sanCode = extractArrow('sanitizeStyleForWCAG');
  const { sanitizeStyleForWCAG } = new Function(
    'DOMParser', 'warnLog',
    contrastCode + '\n' + sanCode + '\nreturn { fixContrastViolations, sanitizeStyleForWCAG };'
  )(globalThis.DOMParser, () => {});

  it('does not crush white text on dark rgb(...) or named black body to #000000 in AAA mode', () => {
    const darkRgb = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { background-color: rgb(15, 23, 42); }</style></head><body><p style="color:#ffffff">Visible</p></body></html>';
    const outRgb = sanitizeStyleForWCAG(darkRgb, { level: 'AAA' }).html;
    expect(outRgb).toContain('color:#ffffff');
    expect(outRgb).not.toContain('color:#000000');

    const darkNamed = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="background: black"><p style="color:#f8fafc">Visible</p></body></html>';
    const outNamed = sanitizeStyleForWCAG(darkNamed, { level: 'AAA' }).html;
    expect(outNamed).toContain('color:#f8fafc');
    expect(outNamed).not.toContain('color:#000000');
  });

  it('preserves white text inside a dark-background ancestor banner in AAA mode and darkens body #666666 to >= 7:1', () => {
    const html = '<!DOCTYPE html><html><HEAD lang="en"><meta charset="utf-8"></HEAD><body><div style="background:#1e3a8a"><h1 style="color:#ffffff">Banner Title</h1></div><p style="color:#666666">Mid gray body</p></body></html>';
    const out = sanitizeStyleForWCAG(html, { level: 'AAA' }).html;
    expect(out).toContain('<h1 style="color:#ffffff">Banner Title</h1>');
    // #666666 is ~5.74:1 on white (passes AA, fails AAA 7:1) so it must be darkened
    expect(out).not.toContain('color:#666666');
    // Case/attr-insensitive <HEAD lang="en"> receives all safety style blocks and keeps charset first
    expect(out).toContain('/* a11y-contrast-safety */');
    expect(out).toContain('/* a11y-text-spacing */');
    expect(out).toContain('/* a11y-focus-visible */');
    expect(out).toContain('/* a11y-reduced-motion */');
    expect(out.indexOf('<meta charset="utf-8">')).toBeLessThan(out.indexOf('/* a11y-contrast-safety */'));
  });
});

// ── C-A4 & C-A12: runAxeAudit, fixAxeContrastViolationsTargeted, _runMainFixLoop ──
describe('C-A4 & C-A12: axe contrast targeting, 40-node cap, minor + Equal Access multi-chunk routing', () => {
  const pairCode = sliceBetween(DP_SRC, 'var _alloContrastFixPair = function', '\nvar _allo', { file: 'doc_pipeline_source.jsx' });
  const serCode = extractTopFn('function _serializeDomEdit(originalHtml, doc) {');
  const targetedCode = extractArrow('fixAxeContrastViolationsTargeted');
  const fixTargeted = new Function(
    'DOMParser', 'warnLog', '_pipeLog',
    pairCode + '\n' + serCode + '\n' + targetedCode + '\nreturn fixAxeContrastViolationsTargeted;'
  )(globalThis.DOMParser, () => {}, () => {});

  it('fixes 12+ contrast nodes in a single pass using structured fgColor/bgColor/expectedContrastRatio without failureSummary', () => {
    const ps = Array.from({ length: 12 }, (_, i) => `<p id="c${i}" style="color:#999999">Item ${i}</p>`).join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body>${ps}</body></html>`;
    const axeResult = {
      critical: [],
      serious: [{
        id: 'color-contrast',
        nodeDetails: Array.from({ length: 12 }, (_, i) => ({
          target: [`#c${i}`],
          fgColor: '#999999',
          bgColor: '#ffffff',
          expectedContrastRatio: i === 0 ? '7.0' : '4.5',
          failureSummary: '', // intentionally empty to prove structured fields are preferred
        })),
      }],
      moderate: [],
      minor: [],
    };
    const res = fixTargeted(html, axeResult);
    expect(res.fixCount).toBe(12);
    for (let i = 0; i < 12; i++) {
      expect(res.html).toMatch(new RegExp(`id="c${i}"[^>]*color:\\s*#[0-9a-f]{6}\\s*!important`, 'i'));
    }
  });

  it('keeps up to 40 nodeDetails for contrast rules, adds nodeDetails to minor, and wires deterministic contrast pre-pass + minor + multi-snippet EA routing in _runMainFixLoop', () => {
    expect(DP_SRC).toContain("(v.id === 'color-contrast' || v.id === 'color-contrast-enhanced') ? 40 : 3");
    expect(DP_SRC).toContain('minor: minor.map(v => ({');
    expect(DP_SRC).toContain('const _detContrast = fixAxeContrastViolationsTargeted(accessibleHtml, axeResults);');
    expect(DP_SRC).toContain('acceptFixedHtmlDetailed(_detContrast.html, accessibleHtml, { strictContent: true })');
    expect(DP_SRC).toContain('_detContrastResolved = _totalAxeContrastNodes > 0 && _detContrast.fixCount >= _totalAxeContrastNodes;');
    expect(DP_SRC).toContain("typeof _detContrastResolved !== 'undefined' && _detContrastResolved");
    expect(DP_SRC).toContain('MINOR (axe-core):');
    expect(DP_SRC).toContain('.flatMap(v => _eaEntries(v, \'CONFIRMED FAIL\'))');

    // Verify standalone _fixEntries slice executes cleanly without outer _detContrastResolved in scope
    const fixEntriesSlice = sliceBetween(DP_SRC, 'const _axeEntry = ', 'let violationInstructions = ', { file: 'doc_pipeline_source.jsx' });
    const buildEntries = new Function(
      'axeResults', 'equalAccessResults', 'verification', 'accessibleHtml', '_alloTitleIssueSettled', '_alloCaptionIssueSettled',
      fixEntriesSlice + '\nreturn _fixEntries;'
    );
    const outEntries = buildEntries(
      { critical: [], serious: [{ id: 'color-contrast', description: 'Contrast', nodes: 2, nodeDetails: [] }], moderate: [], minor: [{ id: 'empty-heading', description: 'Empty', nodes: 1, nodeDetails: [] }] },
      null, null, '<html><body></body></html>', () => false, () => false
    );
    expect(outEntries.some((e) => e.axeId === 'color-contrast')).toBe(true);
    expect(outEntries.some((e) => e.axeId === 'empty-heading')).toBe(true);

    // Execute real _routeViolationsToChunks to prove multi-snippet EA entries route to every matching chunk
    const normLoc = extractTopFn('function _normLocatorText(s) {');
    const routableStart = DP_SRC.indexOf('var _ALLO_ROUTABLE_AXE =');
    const routableEnd = DP_SRC.indexOf('function _routeViolationsToChunks', routableStart);
    const routeCode = extractTopFn('function _routeViolationsToChunks(entries, chunks) {');
    const route = new Function(normLoc + '\n' + DP_SRC.slice(routableStart, routableEnd) + '\n' + routeCode + '\nreturn _routeViolationsToChunks;')();
    const chunks = ['<section><p>Alpha first section unique copy</p></section>', '<section><p>Middle clean copy</p></section>', '<section><p>Omega fifth section unique copy</p></section>'];
    const entries = [
      { text: 'CONFIRMED FAIL (IBM Equal Access): rule1', axeId: null, nodes: 2, nodeHtmls: [], snippet: 'Alpha first section unique copy' },
      { text: 'CONFIRMED FAIL (IBM Equal Access): rule1', axeId: null, nodes: 2, nodeHtmls: [], snippet: 'Omega fifth section unique copy' },
    ];
    const routed = route(entries, chunks);
    expect(routed.assign).toEqual([0, 2]);
    expect(routed.routedCount).toBe(2);
  });
});

// ── C-A5: _neutralizeForAuditFrame CSP ──
describe('C-A5: _neutralizeForAuditFrame CSP allows first-party alloflow-cdn and drops dead cdnjs', () => {
  const ns = DP_SRC.indexOf('const _neutralizeForAuditFrame = (html) => {');
  const ne = DP_SRC.indexOf('// ── axe-core Accessibility Checker', ns);
  const neutralize = new Function('DOMParser', DP_SRC.slice(ns, ne) + '\nreturn _neutralizeForAuditFrame;')(globalThis.DOMParser);

  it('includes https://alloflow-cdn.pages.dev and omits cdnjs.cloudflare.com', () => {
    const out = neutralize('<html><head></head><body><script>evil()</script><p>ok</p></body></html>');
    expect(out).toContain('https://alloflow-cdn.pages.dev');
    expect(out).not.toContain('cdnjs.cloudflare.com');
    expect(out).toContain("default-src 'none'");
  });
});

// ── C-A6: SURGICAL_TOOL_REGISTRY (all 6 tools) ──
describe('C-A6: SURGICAL_TOOL_REGISTRY safety & boundary fixes', () => {
  const serCode = extractTopFn('function _serializeDomEdit(originalHtml, doc) {');
  const regStart = DP_SRC.indexOf('const SURGICAL_TOOL_REGISTRY = {');
  const regEnd = DP_SRC.indexOf('// Derive the Gemini diagnosis prompt', regStart);
  const SAFE_TAG_NAME = /^[a-z][a-z0-9-]*$/i;
  const escapeForRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const registry = new Function(
    'DOMParser', 'SAFE_TAG_NAME', 'escapeForRegex', 'warnLog',
    '_applyToAxeTargetDoc', '_applyToAxeTarget', '_mutAltText', '_mutLinkText', '_mutRemoveEmptyHeading', '_mutTableCaption', '_mutTableScope',
    serCode + '\n' + DP_SRC.slice(regStart, regEnd) + '\nreturn SURGICAL_TOOL_REGISTRY;'
  )(globalThis.DOMParser, SAFE_TAG_NAME, escapeForRegex, () => {}, () => false, (h) => h, () => () => {}, () => () => {}, () => () => {}, () => () => {}, () => () => {});

  it('fix_lang_span modifies body text nodes only and never corrupts <html lang="en">', () => {
    const out = registry.fix_lang_span.fn('<html lang="en"><body><p>la casa</p></body></html>', { text: 'la', lang: 'es' });
    expect(out).toContain('<html lang="en">');
    expect(out).toContain('<span lang="es">la</span> casa');
  });

  it('fix_aria_label enforces tag word boundary, case/quote-insensitive replace, and attr escaping', () => {
    const html = '<article>Art</article><a ARIA-LABEL=\'old\'>Go</a>';
    const out = registry.fix_aria_label.fn(html, { tag: 'a', index: 0, label: 'Read "A & B"' });
    expect(out).toContain('<article>Art</article>');
    expect(out).toContain('<a aria-label="Read &quot;A &amp; B&quot;">Go</a>');
  });

  it('fix_heading strictly validates 1..6 and accepts "h2" while rejecting injection payloads', () => {
    expect(registry.fix_heading.fn('<h4>Sec</h4>', { index: 0, newLevel: 'h2' })).toBe('<h2>Sec</h2>');
    expect(registry.fix_heading.fn('<h4>Sec</h4>', { index: 0, newLevel: '2><script>alert(1)</script>' })).toBe('<h4>Sec</h4>');
    expect(registry.fix_heading.fn('<h4>Sec</h4>', { index: 0, newLevel: 7 })).toBe('<h4>Sec</h4>');
  });

  it('fix_add_landmark escapes label, matches case-insensitive BODY, and handles $ literally', () => {
    const out = registry.fix_add_landmark.fn('<BODY class="x"><p>Hi</p></BODY>', { label: 'Cost "$1" <main>' });
    expect(out).toContain('aria-label="Cost &quot;$1&quot; &lt;main&gt;"');
    expect(out).toContain('</main>\n</body>');
  });

  it('fix_alt_text replaces empty or single-quoted alt in place without duplicating alt', () => {
    const out1 = registry.fix_alt_text.fn('<img src="a.png" alt="">', { index: 0, alt: 'Chart & Graph' });
    expect(out1.match(/\balt=/gi).length).toBe(1);
    expect(out1).toContain('alt="Chart &amp; Graph"');
    const out2 = registry.fix_alt_text.fn("<img src='a.png' alt='old'>", { index: 0, alt: 'New' });
    expect(out2.match(/\balt=/gi).length).toBe(1);
    expect(out2).toContain('alt="New"');
  });

  it('fix_svg_accessibility XML-escapes &, <, > in title and desc', () => {
    const out = registry.fix_svg_accessibility.fn('<svg><path/></svg>', { index: 0, title: 'Supply & Demand', desc: 'x < y & y > z' });
    expect(out).toContain('<title>Supply &amp; Demand</title>');
    expect(out).toContain('<desc>x &lt; y &amp; y &gt; z</desc>');
  });
});

// ── C-A7: fixButtonLinkLabels ──
describe('C-A7: fixButtonLinkLabels preserves title / svg aria-label and avoids duplicate empty aria-label', () => {
  const fixBtns = new Function('warnLog', extractArrow('fixButtonLinkLabels') + '\nreturn fixButtonLinkLabels;')(() => {});

  it('does not clobber non-empty title or child <svg aria-label> or <svg><title>', () => {
    expect(fixBtns('<button title="Print"><svg></svg></button>').fixCount).toBe(0);
    expect(fixBtns('<button><svg aria-label="Close"></svg></button>').fixCount).toBe(0);
    expect(fixBtns('<button><svg><title>Help</title></svg></button>').fixCount).toBe(0);
  });

  it('replaces empty aria-label="" in place instead of appending a duplicate attribute', () => {
    const res = fixBtns('<button aria-label=""></button>');
    expect(res.fixCount).toBe(1);
    expect(res.html.match(/aria-label=/gi).length).toBe(1);
    expect(res.html).toContain('aria-label="Button"');
  });
});

// ── C-A8 + C-B1: fixComplexTables (DOM-based + H43 headers) ──
describe('C-A8 & C-B1: DOM-based fixComplexTables with direct-child thead, nested-table safety, and H43 headers', () => {
  const placeCode = extractTopFn('function _alloPlaceTableCells(table) {');
  const serCode = extractTopFn('function _serializeDomEdit(originalHtml, doc) {');
  const complexCode = extractArrow('fixComplexTables');
  const fixComplex = new Function(
    'DOMParser', 'warnLog',
    placeCode + '\n' + serCode + '\n' + complexCode + '\nreturn fixComplexTables;'
  )(globalThis.DOMParser, () => {});

  it('promotes first row to a direct-child <thead> before <tbody> (never inside <tbody>) and wires H43 headers', () => {
    const html = '<table><tbody><tr><td colspan="2">Q1</td></tr><tr><td>10</td><td>20</td></tr></tbody></table>';
    const res = fixComplex(html);
    const doc = new DOMParser().parseFromString(res.html, 'text/html');
    const table = doc.querySelector('table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    expect(thead).toBeTruthy();
    expect(thead.parentElement).toBe(table);
    expect(tbody.querySelector('thead')).toBeNull();
    const th = thead.querySelector('th');
    expect(th.getAttribute('id')).toBe('docpipe-th-1-1');
    const tds = Array.from(tbody.querySelectorAll('td'));
    expect(tds[0].getAttribute('headers')).toBe('docpipe-th-1-1');
    expect(tds[1].getAttribute('headers')).toBe('docpipe-th-1-1');
  });

  it('wires multi-row merged column + row headers and preserves existing author headers without breaking nested tables', () => {
    const html = '<table><thead><tr><th rowspan="2">Dept</th><th colspan="2">Q1</th></tr><tr><th>Jan</th><th>Feb</th></tr></thead><tbody><tr><th>Math</th><td>10</td><td headers="custom-hdr">20</td></tr></tbody></table>';
    const res = fixComplex(html);
    const doc = new DOMParser().parseFromString(res.html, 'text/html');
    const tds = Array.from(doc.querySelectorAll('tbody td'));
    expect(tds[0].getAttribute('headers')).toBe('docpipe-th-1-2 docpipe-th-1-3 docpipe-th-1-5');
    expect(tds[1].getAttribute('headers')).toBe('custom-hdr');

    const nested = '<table><tbody><tr><td colspan="2">Outer</td></tr><tr><td><table><tbody><tr><td>Inner</td></tr></tbody></table></td><td>Val</td></tr></tbody></table>';
    const resNested = fixComplex(nested);
    const ndoc = new DOMParser().parseFromString(resNested.html, 'text/html');
    expect(ndoc.querySelectorAll('table').length).toBe(2);
    expect(ndoc.querySelector('tbody thead')).toBeNull();
  });

  it('C-B1 H43 headers output passes acceptFixedHtmlDetailed table-semantics gate without rejecting', () => {
    const html = '<!DOCTYPE html><html lang="en"><body><main><h1>Report</h1><p>Quarterly enrollment summary for all academic departments across the district.</p><table><caption>Quarterly Scores</caption><thead><tr><th rowspan="2" scope="col">Department</th><th colspan="2" scope="colgroup">Quarter One</th></tr><tr><th scope="col">January</th><th scope="col">February</th></tr></thead><tbody><tr><th scope="row">Mathematics</th><td>105</td><td headers="author-h">210</td></tr></tbody></table></main></body></html>';
    const fixed = fixComplex(html);
    expect(fixed.fixCount).toBeGreaterThan(0);
    // Verify cell headers preserve author-supplied headers and reference valid TH IDs in the same table
    const doc = new DOMParser().parseFromString(fixed.html, 'text/html');
    const thIds = new Set(Array.from(doc.querySelectorAll('th')).map((el) => el.getAttribute('id')).filter(Boolean));
    const tds = Array.from(doc.querySelectorAll('tbody td'));
    const autoHeaders = tds[0].getAttribute('headers').trim().split(/\s+/);
    expect(autoHeaders.length).toBeGreaterThanOrEqual(2);
    for (const id of autoHeaders) expect(thIds.has(id)).toBe(true);
    expect(tds[1].getAttribute('headers')).toBe('author-h');
  });
});

// ── C-A9 (shipped e1adb67bde) regression ──
describe('C-A9 (e1adb67bde): EPUB3 xml:lang, contentXhtml svg/mathml declarations, MathML feature', () => {
  it('checks serialized contentXhtml (not raw html) for svg/mathml OPF properties and enforces xml:lang + MathML feature', () => {
    const epubSlice = sliceBetween(VIEW_SRC, 'function _buildEpubPackageFiles(', '\n}', { file: 'view_pdf_audit_source.jsx' });
    expect(epubSlice).toContain("/<svg\\b/i.test(String(contentXhtml || ''))");
    expect(epubSlice).toContain("/<math\\b/i.test(String(contentXhtml || ''))");
    expect(epubSlice).toContain('xml:lang=');
    expect(epubSlice).toContain('MathML');
  });
});

// ── C-A10, C-A14, C-A16: createTaggedPdf XMP, indirect AcroForm, outline root /Count ──
describe('C-A10, C-A14, C-A16: createTaggedPdf XMP sanitization, indirect /AcroForm, and outline root /Count', () => {
  it('pins explicit withhold reasons, XML 1.0 comment/control-char sanitization, indirect AcroForm lookup, and ISO 32000-1 outline root Count', () => {
    expect(DP_SRC).toContain("(_orphanWalkCrashed ? 'structure-tree verification walk failed'");
    expect(DP_SRC).toContain("_unreadableTagPages.size > 0 ? _unreadableTagPages.size + ' page(s) have unreadable text streams'");
    expect(DP_SRC).toContain('const _xmlCommentSafe = (v) =>');
    expect(DP_SRC).toContain("|| 'Untitled document'");
    expect(DP_SRC).toContain("let _acroSig = doc.catalog.get(PDFName.of('AcroForm'));");
    expect(DP_SRC).toContain('_acroSig = context.lookup(_acroSig) || _acroSig;');
    expect(DP_SRC).toContain('_sigFlags = context.lookup(_sigFlags) || _sigFlags;');
    expect(DP_SRC).toContain('outlineRootBody.Count = PDFNumber.of(rootKids.length);');
    expect(DP_MOD).toContain('outlineRootBody.Count = PDFNumber.of(rootKids.length);');
  });

  it('XML-comment sanitizer renders hostile font names & control chars into valid XML 1.0', () => {
    const xmlClean = (v) => String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const xmlCommentSafe = (v) => String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F<>]/g, '').replace(/-{2,}/g, (m) => m.split('').join(' ')).replace(/-+$/, '');
    const title = xmlClean('Bad\x07Title & <Note>');
    const comment = xmlCommentSafe('font(s) not embedded: Foo--Bar-->\x07--');
    expect(title).toBe('BadTitle &amp; &lt;Note&gt;');
    expect(comment).not.toContain('--');
    expect(comment).not.toContain('<');
    expect(comment).not.toContain('>');
    expect(comment).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
    const parsed = new DOMParser().parseFromString(`<x><t>${title}</t><!-- ${comment} --></x>`, 'application/xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
  });
});

// ── C-A11: OOXML extraction (DOCX markdown + PPTX presentation order & entity decoding) ──
describe('C-A11: DOCX _docxHtmlToMarkdown & PPTX extractPptxTextDeterministic', () => {
  const docxMdCode = extractArrow('_docxHtmlToMarkdown');
  const docxHtmlToMarkdown = new Function('DOMParser', docxMdCode + '\nreturn _docxHtmlToMarkdown;')(globalThis.DOMParser);

  it('preserves <sup>/<sub> and computes GFM column count from cells/colspan rather than escaped pipes', () => {
    const md = docxHtmlToMarkdown('<p>Area is m<sup>2</sup> and H<sub>2</sub>O.</p><table><tr><th>a|b</th><th>c</th></tr><tr><td>1</td><td>2</td></tr></table>');
    expect(md).toContain('m<sup>2</sup>');
    expect(md).toContain('H<sub>2</sub>O');
    expect(md).toContain('| a\\|b | c |\n| --- | --- |\n| 1 | 2 |');

    const mdSpan = docxHtmlToMarkdown('<table><tr><th colspan="2">Merged</th></tr><tr><td>A</td><td>B</td></tr></table>');
    expect(mdSpan).toContain('| Merged |  |\n| --- | --- |\n| A | B |');
  });

  it('orders PPTX slides via ppt/presentation.xml + rels and decodes XML entities in charts/SmartArt', async () => {
    const pptxCode = extractArrow('extractPptxTextDeterministic');
    const files = {
      'ppt/presentation.xml': '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id=\'rId3\'/><p:sldId id="257" r:id="rId1"/></p:sldIdLst></p:presentation>',
      'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="rId1" Target="/ppt/./slides/slide1.xml"/><Relationship Id=\'rId3\' Target=\'./slides/slide3.xml\'/></Relationships>',
      'ppt/slides/slide1.xml': '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:t>Second in deck</a:t></a:p></p:sld>',
      'ppt/slides/slide3.xml': '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:t>First in deck</a:t></a:p></p:sld>',
      'ppt/charts/chart1.xml': '<c:chartSpace><a:t>R&amp;D &lt; 5% &#x2014; Q1</a:t></c:chartSpace>',
      'ppt/diagrams/data1.xml': '<dgm:dataModel><a:t>A &amp; B &gt; C</a:t></dgm:dataModel>',
    };
    const fakeZip = {
      files,
      file: (name) => (files[name] ? { async: async () => files[name] } : null),
    };
    const fakeWindow = { JSZip: { loadAsync: async () => fakeZip } };
    const extractPptx = new Function(
      'window', 'ensureJsZipLoaded', '_base64ToBytes', '_ooxmlGuardArchive', '_ooxmlExtractPart',
      '_ooxmlInflatePart', '_officeMediaFromPart', '_ALLO_SECTION_OPEN', '_ALLO_SECTION_CLOSE',
      '_A_NS', '_OOXML_RELS_PART_MAX_BYTES', '_OOXML_XML_PART_MAX_BYTES', 'warnLog',
      pptxCode + '\nreturn extractPptxTextDeterministic;'
    )(
      fakeWindow,
      async () => {},
      () => new Uint8Array(4),
      () => {},
      async (f) => { const x = await f.async('string'); const m = x.match(/<a:t>([^<]+)<\/a:t>/); return m ? m[1] : ''; },
      async (f) => f.async('string'),
      async () => [],
      (k, id) => `<<<ALLO_SECTION:${k}:${id}>>>`,
      '<<<ALLO_SECTION:END>>>',
      'http://schemas.openxmlformats.org/drawingml/2006/main',
      1024 * 1024,
      4 * 1024 * 1024,
      () => {}
    );
    const out = await extractPptx('AAAA');
    expect(out.slides.map((s) => s.text)).toEqual(['First in deck', 'Second in deck']);
    expect(out.slides.map((s) => s.slideNum)).toEqual([1, 2]);
    expect(out.fullText).toContain('R&D < 5% — Q1');
    expect(out.fullText).toContain('A & B > C');
  });
});

// ── C-A13: restoreSentencesDeterministic Unicode & multilingual terminators ──
describe('C-A13: restoreSentencesDeterministic supports non-ASCII scripts & multilingual terminators', () => {
  const restoreCode = extractArrow('restoreSentencesDeterministic');
  const restore = new Function('DOMParser', 'warnLog', '_stripRestoreMarkdown', restoreCode + '\nreturn restoreSentencesDeterministic;')(globalThis.DOMParser, () => {}, (s) => s);

  it('suppresses exact duplicates and restores missing sentences in Spanish, Ukrainian, and CJK', () => {
    const esDoc = '<!DOCTYPE html><html lang="es"><body><p>La evaluación educativa mejora el aprendizaje.</p></body></html>';
    const esSrc = 'La evaluación educativa mejora el aprendizaje. La participación familiar fortalece el éxito escolar.';
    const resEs = restore(esDoc, [{ word: 'participación' }, { word: 'evaluación' }], esSrc);
    expect(resEs.html).toContain('La participación familiar fortalece el éxito escolar.');
    // Must not duplicate the already-present Spanish sentence
    expect(resEs.html.split('La evaluación educativa mejora el aprendizaje.').length - 1).toBe(1);

    const ukDoc = '<!DOCTYPE html><html lang="uk"><body><p>Освіта допомагає кожному учню розвиватися.</p></body></html>';
    const ukSrc = 'Освіта допомагає кожному учню розвиватися. Програма підтримки відкрита для всіх родин.';
    const resUk = restore(ukDoc, [{ word: 'підтримки' }], ukSrc);
    expect(resUk.html).toContain('Програма підтримки відкрита для всіх родин.');

    const zhDoc = '<!DOCTYPE html><html lang="zh"><body><p>学校提供无障碍学习资料支持所有学生。</p></body></html>';
    const zhSrc = '学校提供无障碍学习资料支持所有学生。家长可以随时下载电子版本。';
    const resZh = restore(zhDoc, [{ word: '电子版本' }], zhSrc);
    expect(resZh.html).toContain('家长可以随时下载电子版本。');
  });
});

// ── C-A15, C-A17 (e1adb67bde), C-A18, C-B4 (UI + canvas finally) ──
describe('C-A15, C-A17, C-A18, C-B4: batch lang, coverage label, link reattach skip tags, preview & canvas cleanup', () => {
  it('C-A15: downloadBatchResults resolves per-file BCP-47 lang and uses _b64ToBytes', () => {
    const batchSlice = sliceBetween(DP_SRC, 'const _fileLang = (() => {', 'const tagged = await createTaggedPdf(', { file: 'doc_pipeline_source.jsx' });
    expect(batchSlice).toContain('lang: _fileLang');
    expect(batchSlice).toContain('const bytes = _b64ToBytes(f.base64);');
    expect(batchSlice).not.toContain('atob(f.base64)');
  });

  it('C-A17 (e1adb67bde): remediation_batch_workspace displays Complete (needs review) for complete-with-review', () => {
    expect(BATCH_WS).toContain("value === 'complete-with-review'");
    expect(BATCH_WS).toContain('Complete (needs review)');
  });

  it('C-A18: _reattachSourceLinks skips button, textarea, option, select, and noscript while linking paragraphs', () => {
    const reattachCode = extractTopFn('function _reattachSourceLinks(html, srcLinks) {');
    const reattach = new Function(reattachCode + '\nreturn _reattachSourceLinks;')();
    const input = '<button>District Portal</button><textarea>District Portal</textarea><select><option>District Portal</option></select><noscript>District Portal</noscript><p>Visit District Portal today.</p>';
    const res = reattach(input, [{ text: 'District Portal', url: 'https://district.example' }]);
    expect(res.html).toContain('<button>District Portal</button>');
    expect(res.html).toContain('<textarea>District Portal</textarea>');
    expect(res.html).toContain('<option>District Portal</option>');
    expect(res.html).toContain('<noscript>District Portal</noscript>');
    expect(res.html).toContain('<p>Visit <a href="https://district.example">District Portal</a> today.</p>');
    expect(res.count).toBe(1);
  });

  it('C-B4: edited preview passes _editedResult, ResizeObserver guards parentElement, and _extractPdfImages cleans canvases in finally blocks', () => {
    expect(VIEW_SRC).toContain('_runTypesetExport({ resultOverride: _editedResult || undefined })');
    expect(WS_COMP).toContain('if (header.parentElement) header.parentElement.style.scrollPaddingTop');
    const extractSlice = sliceBetween(DP_SRC, 'const _cropIsNearUniform = (srcCanvas, strict) => {', 'catch(pdfJsErr)', { file: 'doc_pipeline_source.jsx' });
    expect(extractSlice).toContain('finally { if (tiny) { try { tiny.width = 0; tiny.height = 0; } catch (_) {} } }');
    expect(extractSlice).toContain('finally { if (crop) { try { crop.width = 0; crop.height = 0; } catch (_) {} } }');
    expect(extractSlice).toContain('if (canvas) { try { canvas.width = 0; canvas.height = 0; } catch (_) {} }');
  });
});

// ── C-B2: view_pdf_validator_module.js + mirror + exported_pdf_validator.cjs parity ──
describe('C-B2: PDF/UA-1 validator parity (/ParentTree, /Tabs /S on annotated pages, /Metadata, XMP dc:title)', () => {
  const sandbox = { window: { PDFLib, AlloModules: {} }, console: { log() {} }, TextDecoder, Map, Uint8Array };
  vm.createContext(sandbox);
  vm.runInContext(VAL_SRC, sandbox);
  const V = sandbox.window.AlloModules.PdfValidator;

  it('keeps public mirror identical to view_pdf_validator_module.js and CLI validator in lockstep', () => {
    expect(VAL_PUB).toBe(VAL_SRC);
    for (const rule of [
      'StructTreeRoot has /ParentTree',
      'Pages with annotations set /Tabs /S (PDF/UA 7.18.3)',
      'XMP metadata stream present (/Metadata, PDF/UA 7.1)',
      'XMP dc:title non-empty (PDF/UA 7.1)',
    ]) {
      expect(VAL_SRC).toContain(rule);
      expect(VAL_CLI).toContain(rule);
    }
  });

  it('fails missing /ParentTree, /Tabs /S, /Metadata, and dc:title, and passes when all are properly present', async () => {
    const doc = await PDFLib.PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const ctx = doc.context;
    const { PDFName, PDFArray, PDFDict, PDFRawStream, PDFString, PDFNumber } = PDFLib;

    // Add a link annotation WITHOUT /Tabs /S first
    const annotRef = ctx.register(ctx.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [10, 10, 100, 30],
      Contents: PDFString.of('Example link'),
      StructParent: PDFNumber.of(1),
    }));
    page.node.set(PDFName.of('Annots'), ctx.obj([annotRef]));

    const failReport = await V.validateExportedPdfBytes(await doc.save());
    const byRuleFail = Object.fromEntries(failReport.checks.map((c) => [c.rule, c.status]));
    expect(byRuleFail['StructTreeRoot has /ParentTree']).toBe('fail');
    expect(byRuleFail['Pages with annotations set /Tabs /S (PDF/UA 7.18.3)']).toBe('fail');
    expect(byRuleFail['XMP metadata stream present (/Metadata, PDF/UA 7.1)']).toBe('fail');
    expect(byRuleFail['XMP dc:title non-empty (PDF/UA 7.1)']).toBe('fail');

    // Now add /Tabs /S, StructTreeRoot with /ParentTree, and XMP /Metadata with non-empty dc:title
    page.node.set(PDFName.of('Tabs'), PDFName.of('S'));
    const parentTreeRef = ctx.register(ctx.obj({ Nums: PDFArray.withContext(ctx) }));
    const stRootRef = ctx.register(ctx.obj({ Type: PDFName.of('StructTreeRoot'), ParentTree: parentTreeRef }));
    doc.catalog.set(PDFName.of('StructTreeRoot'), stRootRef);
    const xmpBytes = new TextEncoder().encode('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Test Doc</rdf:li></rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta>');
    const metaDict = PDFDict.fromMapWithContext(new Map([[PDFName.of('Type'), PDFName.of('Metadata')], [PDFName.of('Subtype'), PDFName.of('XML')]]), ctx);
    const metaRef = ctx.register(PDFRawStream.of(metaDict, xmpBytes));
    doc.catalog.set(PDFName.of('Metadata'), metaRef);

    const passReport = await V.validateExportedPdfBytes(await doc.save());
    const byRulePass = Object.fromEntries(passReport.checks.map((c) => [c.rule, c.status]));
    expect(byRulePass['StructTreeRoot has /ParentTree']).toBe('pass');
    expect(byRulePass['Pages with annotations set /Tabs /S (PDF/UA 7.18.3)']).toBe('pass');
    expect(byRulePass['XMP metadata stream present (/Metadata, PDF/UA 7.1)']).toBe('pass');
    expect(byRulePass['XMP dc:title non-empty (PDF/UA 7.1)']).toBe('pass');
  });
});
