// Export-format review ROUND 2 (2026-07-13) — regression locks.
// Deep-dive across every export type surfaced a cluster of defects; these tests
// pin the fixes to the SOURCE (and, where a lane ships a compiled module, that
// the old-and-busted form is gone from it too) so a future edit or a concurrent
// shared-tree sweep can't silently regress them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const R = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const viewAudit = R('view_pdf_audit_source.jsx');
const viewAuditMod = R('view_pdf_audit_module.js');
const viewPreview = R('view_export_preview_source.jsx');
const loaderRoot = R('liblouis_braille_loader.js');
const loaderMirror = R('desktop/web-app/public/liblouis_braille_loader.js');
const exportHandlers = R('export_handlers_module.js');
const exportSource = R('export_source.jsx');
const exportModule = R('export_module.js');

// Runtime-extract the shared office/DAISY block model (_htmlToDocxSpec + the
// DTBook serializer) the way tests/export_odt_daisy.test.js does, so the
// details-fusion fix can be exercised end-to-end, not just grepped.
const _specSlice = viewAudit.slice(
  viewAudit.indexOf('function _htmlToDocxSpec(html) {'),
  viewAudit.indexOf('\n// _buildDocxBlobFromSpec:')
);
const { _htmlToDtbookXml: dtbook } = new Function('DOMParser', 'XMLSerializer',
  _specSlice + '; return { _htmlToDtbookXml };')(globalThis.DOMParser, globalThis.XMLSerializer);
const wrapDoc = (body) => `<html lang="en"><head><title>T</title></head><body>${body}</body></html>`;

describe('plain-language summary popup — XSS + language hardening (R2 #1/#2)', () => {
  it('escapes the model summary before it enters the same-origin popup document', () => {
    // A local escaper is defined and the summary is run through it BEFORE the
    // plain-text -> HTML structure transform, so injected markup is inert.
    expect(viewAudit).toMatch(/const _escSum = \(s\) =>[^\n]*replace\(\/&\/g, '&amp;'\)/);
    expect(viewAudit).toMatch(/const _summaryHtml = _escSum\(summary\)/);
  });

  it('escapes the user-controlled filename in the footer', () => {
    expect(viewAudit).toMatch(/const _safeName = _escSum\(pendingPdfFile\?\.name \|\| 'document'\)/);
  });

  it('resolves a real BCP-47 subtag instead of slicing the language NAME', () => {
    // The old bug: lang.substring(0,2) turned "Spanish" -> "sp", "Dari" -> "da".
    expect(viewAudit).not.toMatch(/lang\.substring\(0\s*,\s*2\)/);
    expect(viewAudit).toMatch(/languageToTTSCode\(lang\)/);
    // Absent beats wrong: no lang attribute when the code can't be resolved.
    expect(viewAudit).toMatch(/const _langAttr = _langCode \? ` lang="\$\{_langCode\}"` : ''/);
  });

  it('derives RTL from the resolved code the way the export spec does (not a 6-name list)', () => {
    expect(viewAudit).toMatch(/\/\^\(ar\|he\|iw\|fa\|ur\|ps\|sd\|ug\|yi\|dv\|ckb\)\(\[-_\]\|\$\)\/i\.test\(_langCode\)/);
  });

  it('the compiled module carries the same fix (old slice form is gone)', () => {
    expect(viewAuditMod).not.toMatch(/lang\.substring\(0,\s*2\)/);
    expect(viewAuditMod).toMatch(/const _summaryHtml = _escSum\(summary\)/);
  });
});

describe('BRF braille — both lanes delegate to one canonical, inline fallback corrected (R2 #3/#4/#5)', () => {
  it('both export lanes prefer the shared canonical window.AlloBraille.toGrade1BRF', () => {
    expect(viewAudit).toMatch(/window\.AlloBraille\.toGrade1BRF\(text, \{ withMeta: true \}\)/);
    expect(viewPreview).toMatch(/window\.AlloBraille\.toGrade1BRF\(text, \{ withMeta: true \}\)/);
  });

  it('both inline fallbacks carry the letter-sign fix so "1a" is not read as "11"', () => {
    const letterSign = /if \(numMode && ch >= 'a' && ch <= 'j'\) bl \+= ';';/;
    expect(viewAudit).toMatch(letterSign);
    expect(viewPreview).toMatch(letterSign);
    expect(viewAudit).not.toMatch(/numMode && \(\(ch >= 'a'.*ch >= 'A'/);
    expect(viewPreview).not.toMatch(/numMode && \(\(ch >= 'a'.*ch >= 'A'/);
  });

  it('both inline fallbacks return drop metadata when the shared plugin is unavailable', () => {
    expect(viewAudit).toMatch(/_toBRF\(text, \{ withMeta: true \}\)/);
    expect(viewPreview).toMatch(/_toBRF\(text, \{ withMeta: true \}\)/);
  });

  it('both inline fallbacks NFD-fold accents (remediation lane got the fix it was missing)', () => {
    expect(viewAudit).toMatch(/normalize\('NFD'\)/);
    expect(viewPreview).toMatch(/normalize\('NFD'\)/);
  });

  it('remediation braille extraction strips style/script via DOMParser, not a greedy whole-doc regex', () => {
    // The old bug embossed <style> bodies and ate text across newlines with &[^;]+;.
    expect(viewAudit).toMatch(/new DOMParser\(\)\.parseFromString\(html, 'text\/html'\)[\s\S]{0,400}querySelectorAll\('script, style, title/);
    // The greedy across-newline entity strip must be gone from the braille path.
    expect(viewAudit).toMatch(/details\.allo-chart-data > summary/);
    expect(viewAudit).not.toMatch(/data-allo-crop-ui\], details\.allo-math-source, details\.allo-chart-data/);
    expect(viewAudit).not.toMatch(/html\.replace\(\/<\[\^>\]\*>\/g, '\\n'\)\.replace\(\/&\[\^;\]\+;\/g/);
  });

  it('both compiled modules reference the canonical (mirror is not stale)', () => {
    expect(viewAuditMod).toMatch(/toGrade1BRF/);
    expect(R('view_export_preview_module.js')).toMatch(/toGrade1BRF/);
  });

  it('the canonical loader and its public mirror are byte-identical (no drift)', () => {
    expect(loaderRoot).toBe(loaderMirror);
    expect(loaderRoot).toMatch(/module\.exports = \{ toGrade1BRF: toGrade1BRF \}/);
  });
});

describe('ePub validity — well-formed XHTML + namespaced root (R2 #7/#8)', () => {
  // Behavioral proof of the serialize+guard approach both lanes now use: a doc
  // with an unclosed void element AND an inline MathML xmlns must round-trip to
  // well-formed XML whose ROOT html still carries the XHTML namespace.
  it('serialize + root-xmlns guard yields well-formed XHTML even with inline MathML', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head><meta charset="utf-8"><title>T</title></head><body><h1 id="a">Hi</h1><p>x</p><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math><input value="q"></body></html>');
    const { document, XMLSerializer, DOMParser } = dom.window;
    let xhtml = new XMLSerializer().serializeToString(document.documentElement);
    // Root and foreign-content namespaces survive serialization without a global strip.
    expect(xhtml).toMatch(/xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
    if (!/^<html\b[^>]*\sxmlns=/i.test(xhtml)) xhtml = xhtml.replace(/^<html\b/i, '<html xmlns="http://www.w3.org/1999/xhtml"');
    // Root html carries the XHTML namespace...
    expect(xhtml).toMatch(/^<html xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/);
    // ...the void elements are self-closed...
    expect(xhtml).toMatch(/<meta[^>]*\/>/);
    expect(xhtml).toMatch(/<input[^>]*\/>/);
    // ...and the whole thing re-parses as XML with no parser error.
    const reparsed = new DOMParser().parseFromString('<?xml version="1.0"?>' + xhtml, 'application/xml');
    expect(reparsed.querySelector('parsererror')).toBeNull();
  });


  it('preserves XHTML namespace re-entry inside SVG foreignObject without duplicate xmlns attributes', () => {
    const dom = new JSDOM('<html><body><svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml" id="inside">Text</div></foreignObject></svg></body></html>');
    let xhtml = new dom.window.XMLSerializer().serializeToString(dom.window.document.documentElement);
    // HTML parsing can retain an explicit xmlns attribute while XMLSerializer also emits the
    // namespace node, producing a fatal duplicate attribute. Remove only same-tag duplicates.
    xhtml = xhtml.replace(/\sxmlns="([^"]+)"(?=[^<>]*\sxmlns="\1")/g, '');
    const reparsed = new dom.window.DOMParser().parseFromString(xhtml, 'application/xml');
    expect(reparsed.querySelector('parsererror')).toBeNull();
    expect(reparsed.getElementById('inside').namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect((xhtml.match(/<div[^>]*xmlns=/g) || []).length).toBe(1);
  });

  it('the OLD guard would have missed the root namespace on the same input (regression guard)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></body></html>');
    let xhtml = new dom.window.XMLSerializer().serializeToString(dom.window.document.documentElement).replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');
    // Old logic: only add root xmlns when the string contains NO 'xmlns' at all.
    const oldWouldAdd = !xhtml.includes('xmlns');
    expect(oldWouldAdd).toBe(false); // proves the old guard was defeated here
  });

  it('builder ePub serializes via XMLSerializer and both lanes use the root-only xmlns guard', () => {
    expect(viewPreview).toMatch(/new XMLSerializer\(\)\.serializeToString\(_clone\)/);
    expect(viewPreview).not.toMatch(/serializeToString\(_clone\)\.replace\(\/ xmlns=/);
    expect(viewAudit).not.toMatch(/serializeToString\(_d\.documentElement\)\.replace\(\/ xmlns=/);
    const rootGuard = /if \(!\/\^<html\\b\[\^>\]\*\\sxmlns=\/i\.test\(xhtml\)\)/;
    expect(viewPreview).toMatch(rootGuard);
    expect(viewAudit).toMatch(rootGuard);
    // The defeated form must be gone from both ePub paths.
    expect(viewPreview).not.toMatch(/if \(!xhtml\.includes\('xmlns'\)\)/);
    expect(viewAudit).not.toMatch(/if \(!xhtml\.includes\('xmlns'\)\)/);
  });

  it('remediation nav labels are escaped and the read-along SMIL seq has epub:textref', () => {
    expect(viewAudit).toMatch(/_navEsc\(m\[2\]\)/);
    expect(viewAudit).toMatch(/<seq epub:textref="content\.xhtml">/);
  });

  it('declares embedded SVG and MathML in every EPUB content manifest lane', () => {
    expect(viewPreview).toContain("if (_clone.querySelector('svg')) _contentProps.push('svg')");
    expect(viewPreview).toContain('${_contentPropAttr}');
    expect(viewAudit).toContain("if (/<svg\\b/i.test(html)) _epubContentProps.push('svg')");
    expect(viewAudit).toContain("if (/<math\\b/i.test(bodyHtml)) _moContentProperties.push('mathml')");
  });
});

describe('audio export — partial-failure is disclosed, never a silent gap (R2 #12)', () => {
  it('the asset builder tracks missing audio portions and fully-failed variants', () => {
    // Missing = chunks that produced no blob; anyPartial / failedVariants surface it.
    expect(exportHandlers).toMatch(/if \(!resp\.ok\) return null/);
    expect(exportHandlers).toMatch(/const _missing = _total - blobs\.length/);
    expect(exportHandlers).toMatch(/if \(_missing > 0\) out\.anyPartial = true/);
    expect(exportHandlers).toMatch(/out\.failedVariants = \(out\.failedVariants \|\| \[\]\)\.concat\(plan\.label\)/);
    // The download record carries the counts.
    expect(exportHandlers).toMatch(/missing: _missing, total: _total/);
  });

  it('the on-page download card warns when a file is missing audio portions', () => {
    expect(exportHandlers).toMatch(/if \(item\.missing > 0 && item\.total\)/);
    expect(exportHandlers).toMatch(/audio portions are missing from this file/);
  });

  it('the export toasts a warning instead of a clean success when audio is incomplete', () => {
    expect(exportHandlers).toMatch(/built\.anyPartial/);
    expect(exportHandlers).toMatch(/built\.failedVariants && built\.failedVariants\.length/);
    expect(exportHandlers).toMatch(/embeddedCount < audioJobs\.length/);
  });

  it('the module and its public mirror stay in sync', () => {
    expect(exportHandlers).toBe(R('desktop/web-app/public/export_handlers_module.js'));
  });
});

describe('office/DAISY exports — AI panels no longer fuse, ODT declares a language (R2 #9 + ODT lang)', () => {
  it('a chart-data details table survives as a real table (cell values are not fused)', () => {
    const out = dtbook(wrapDoc('<p>Intro</p><details class="allo-chart-data"><summary>Show chart data</summary><table><tr><td>10</td><td>15.2</td><td>20</td></tr></table></details>'), 'en');
    expect(out).toContain('<td>10</td><td>15.2</td><td>20</td>'); // separate cells
    expect(out).not.toContain('1015.220');                        // not glued together
    expect(out).not.toContain('Show chart data');                 // toggle label dropped
  });

  it('a math-source panel is dropped entirely (no linearized MathML paragraph)', () => {
    const out = dtbook(wrapDoc('<p>Body</p><details class="allo-math-source"><summary>Show math source</summary><math><mi>x</mi></math><pre>frac</pre></details>'), 'en');
    expect(out).not.toContain('Show math source');
    expect(out).not.toMatch(/<p>\s*x\s*<\/p>/); // the raw MathML did not leak as text
    expect(out).toContain('<p>Body</p>');       // surrounding content intact
  });

  it('source carries the DETAILS handler (drift lock for both compiled lanes)', () => {
    expect(viewAudit).toMatch(/if \(tag === 'DETAILS'\)/);
    expect(viewAudit).toMatch(/classList\.contains\('allo-math-source'\)/);
    expect(viewAuditMod).toMatch(/tag === "DETAILS"/);
  });

  it('ODT export tags the default text style with fo:language and records dc:language', () => {
    expect(viewAudit).toMatch(/fo:language="' \+ _odtLg \+ '" fo:country="' \+ _odtCt \+ '"/);
    expect(viewAudit).toMatch(/<dc:language>' \+ _expXmlEsc\(_odtLang\)/);
  });
});

describe('PowerPoint formatting hardening (R3)', () => {
  it('remediation decks split long paragraphs/tables and preserve RTL', () => {
    expect(viewAudit).toContain('const MAX_LINES = 13');
    expect(viewAudit).toContain('splitText(text, 650)');
    expect(viewAudit).toContain("repeatHeader: headerRows.length");
    expect(viewAudit).toContain('rtl: !!spec.rtl');
  });

  it('the renderer uses shrink-to-fit text and aspect-ratio-safe image containment', () => {
    expect(viewAudit).toMatch(/fit: 'shrink'/);
    expect(viewAudit).toContain("sizing: { type: 'contain'");
    expect(viewAudit).toContain("autoPage: false");
    expect(viewAuditMod).toContain('fit: "shrink"');
    expect(viewAuditMod).toContain('type: "contain"');
  });

  it('builder decks paginate glossary/concept-sort content with semantic continuation titles', () => {
    expect(exportSource).toContain('const chunkText = (value, limit) =>');
    expect(exportSource).toContain('page.length >= 7 || pageLines + rowLines > 10');
    expect(exportSource).toContain('for (let start = 0; start < categories.length; start += 4)');
    expect(exportSource).toContain("addSlideTitle(slide, itemTitle + (pageIndex ? ' (Cont.)' : ''))");
    expect(exportModule).toContain('const chunkText = (value, limit) =>');
    expect(viewAudit).toContain("valign: 'middle'");
    expect(exportSource).toMatch(/margin: 0\.04,[\s\S]{0,80}valign: 'middle'/);
  });
});
