// In-house EPUB structural self-check (2026-06-22), from the OSS-incorporation survey (epubcheck lane).
// A CheerpJ epubcheck spike is risky (EPUB is a ZIP needing reverse seeks vs veraPDF's linear PDF
// byte-stream), so instead of an external validator we self-check the package WE assemble in _dlEpubMO,
// catching our own export bugs before the file ships: a dangling SMIL audio/text ref or a not-well-formed
// content.xhtml makes the WHOLE EPUB unopenable while the toast claims success. This extracts the real
// validateEpubStructure from view_pdf_audit_source.jsx and drives it with a valid package + one mutation
// per failure class. Runs under jsdom so the DOMParser well-formedness checks are exercised.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = src.indexOf('function validateEpubStructure(files) {');
const end = src.indexOf('\n// _buildDocxBlobFromSpec:', start);
if (start === -1 || end === -1) throw new Error('extraction markers for validateEpubStructure missing');
const { validateEpubStructure } = new Function(src.slice(start, end) + '; return { validateEpubStructure };')();

// A minimal but REAL-shaped valid read-along EPUB package (mirrors _dlEpubMO's zip layout).
const validPackage = () => ({
  'mimetype': 'application/epub+zip',
  'META-INF/container.xml': '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  'OEBPS/content.xhtml': '<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>T</title></head><body><p id="mo1">One</p><p id="mo2">Two</p></body></html>',
  'OEBPS/content.smil': '<?xml version="1.0" encoding="utf-8"?>\n<smil xmlns="http://www.w3.org/ns/SMIL" version="3.0"><body><seq>'
    + '<par id="par1"><text src="content.xhtml#mo1"/><audio src="audio/seg1.mp3" clipBegin="0:00:00.000" clipEnd="0:00:01.000"/></par>'
    + '<par id="par2"><text src="content.xhtml#mo2"/><audio src="audio/seg2.mp3" clipBegin="0:00:00.000" clipEnd="0:00:01.000"/></par>'
    + '</seq></body></smil>',
  'OEBPS/content.opf': '<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">x</dc:identifier><dc:title>T</dc:title><dc:language>en</dc:language><meta property="media:duration">0:00:02.000</meta></metadata>'
    + '<manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml" media-overlay="smil"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="smil" href="content.smil" media-type="application/smil+xml"/><item id="aud1" href="audio/seg1.mp3" media-type="audio/mpeg"/><item id="aud2" href="audio/seg2.mp3" media-type="audio/mpeg"/></manifest>'
    + '<spine><itemref idref="content"/></spine></package>',
  'OEBPS/nav.xhtml': '<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Nav</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="content.xhtml">T</a></li></ol></nav></body></html>',
  'OEBPS/audio/seg1.mp3': true,
  'OEBPS/audio/seg2.mp3': true,
});
const codes = (r) => r.issues.filter((i) => i.severity === 'error').map((i) => i.code);

describe('validateEpubStructure: a well-formed read-along package passes', () => {
  it('reports valid with zero errors', () => {
    const r = validateEpubStructure(validPackage());
    expect(r.issues.filter((i) => i.severity === 'error'), JSON.stringify(r.issues)).toEqual([]);
    expect(r.valid).toBe(true);
  });
});

describe('validateEpubStructure: one mutation per failure class is caught', () => {
  it('wrong mimetype', () => {
    const p = validPackage(); p['mimetype'] = 'application/zip';
    expect(codes(validateEpubStructure(p))).toContain('mimetype-wrong');
  });
  it('missing container.xml', () => {
    const p = validPackage(); delete p['META-INF/container.xml'];
    expect(codes(validateEpubStructure(p))).toContain('container-missing');
  });
  it('rootfile points at an absent OPF', () => {
    const p = validPackage(); delete p['OEBPS/content.opf'];
    expect(codes(validateEpubStructure(p))).toContain('rootfile-unresolved');
  });
  it('manifest lists a file not in the package', () => {
    const p = validPackage(); delete p['OEBPS/nav.xhtml'];
    expect(codes(validateEpubStructure(p))).toContain('manifest-href-unresolved');
  });
  it('spine itemref has no matching manifest item', () => {
    const p = validPackage(); p['OEBPS/content.opf'] = p['OEBPS/content.opf'].replace('idref="content"', 'idref="ghost"');
    expect(codes(validateEpubStructure(p))).toContain('spine-idref-unresolved');
  });
  it('no navigation document', () => {
    const p = validPackage(); p['OEBPS/content.opf'] = p['OEBPS/content.opf'].replace(' properties="nav"', '');
    expect(codes(validateEpubStructure(p))).toContain('nav-missing');
  });
  it('SMIL references an audio clip not in the package (the RSC-001 invalidator)', () => {
    const p = validPackage(); delete p['OEBPS/audio/seg2.mp3'];
    // also drop the manifest item so we isolate the SMIL-side check
    p['OEBPS/content.opf'] = p['OEBPS/content.opf'].replace('<item id="aud2" href="audio/seg2.mp3" media-type="audio/mpeg"/>', '');
    expect(codes(validateEpubStructure(p))).toContain('smil-audio-missing');
  });
  it('SMIL text src references an id absent from the XHTML', () => {
    const p = validPackage(); p['OEBPS/content.smil'] = p['OEBPS/content.smil'].replace('content.xhtml#mo2', 'content.xhtml#ghost');
    expect(codes(validateEpubStructure(p))).toContain('smil-text-id-missing');
  });
  it('content.xhtml is not well-formed XML (AI body HTML breakage)', () => {
    const p = validPackage(); p['OEBPS/content.xhtml'] = p['OEBPS/content.xhtml'].replace('<p id="mo2">Two</p>', '<p id="mo2">Two<img></p>'); // unclosed void elem
    expect(codes(validateEpubStructure(p))).toContain('xhtml-malformed');
  });
  it('media overlays declared but no media:duration', () => {
    const p = validPackage(); p['OEBPS/content.opf'] = p['OEBPS/content.opf'].replace('<meta property="media:duration">0:00:02.000</meta>', '');
    expect(codes(validateEpubStructure(p))).toContain('duration-missing');
  });
});

describe('anti-drift: _dlEpubMO runs the self-check on the assembled package', () => {
  it('wires validateEpubStructure over the same strings handed to JSZip', () => {
    expect(src).toMatch(/const _vr = validateEpubStructure\(_epubFiles\);/);
    expect(src).toMatch(/_epubFiles\['OEBPS\/audio\/seg' \+ \(i \+ 1\) \+ '\.' \+ ext\] = true;/);
    expect(src).toContain('_epubSelfCheckNote');
  });
});
