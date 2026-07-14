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
const loaderMirror = R('prismflow-deploy/public/liblouis_braille_loader.js');

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
    const letterSign = /if \(numMode && \(\(ch >= 'a' && ch <= 'j'\) \|\| \(ch >= 'A' && ch <= 'J'\)\)\) bl \+= ';';/;
    expect(viewAudit).toMatch(letterSign);
    expect(viewPreview).toMatch(letterSign);
  });

  it('both inline fallbacks NFD-fold accents (remediation lane got the fix it was missing)', () => {
    expect(viewAudit).toMatch(/normalize\('NFD'\)/);
    expect(viewPreview).toMatch(/normalize\('NFD'\)/);
  });

  it('remediation braille extraction strips style/script via DOMParser, not a greedy whole-doc regex', () => {
    // The old bug embossed <style> bodies and ate text across newlines with &[^;]+;.
    expect(viewAudit).toMatch(/new DOMParser\(\)\.parseFromString\(html, 'text\/html'\)[\s\S]{0,400}querySelectorAll\('script, style, title/);
    // The greedy across-newline entity strip must be gone from the braille path.
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
    let xhtml = new XMLSerializer().serializeToString(document.documentElement).replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');
    // The MathML xmlns survives, which is exactly what defeated the old guard.
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

  it('the OLD guard would have missed the root namespace on the same input (regression guard)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></body></html>');
    let xhtml = new dom.window.XMLSerializer().serializeToString(dom.window.document.documentElement).replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');
    // Old logic: only add root xmlns when the string contains NO 'xmlns' at all.
    const oldWouldAdd = !xhtml.includes('xmlns');
    expect(oldWouldAdd).toBe(false); // proves the old guard was defeated here
  });

  it('builder ePub serializes via XMLSerializer and both lanes use the root-only xmlns guard', () => {
    expect(viewPreview).toMatch(/new XMLSerializer\(\)\.serializeToString\(_clone\)/);
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
});
