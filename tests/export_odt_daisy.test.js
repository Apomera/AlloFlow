// Tests for the ODT (OpenDocument Text) + DAISY 3 (DTBook 2005-3) exporters
// (2026-06-14). Both serialize the SAME tested block model from _htmlToDocxSpec,
// so we runtime-extract the contiguous slice that holds _htmlToDocxSpec plus the
// new serializers (anti-drift, like view_pdf_audit_docx_spec.test.js) and assert
// the output is well-formed XML with the right structure.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = src.indexOf('function _htmlToDocxSpec(html) {');
const end = src.indexOf('\n// _buildDocxBlobFromSpec:', start);
if (start === -1 || end === -1) throw new Error('extraction markers for the ODT/DAISY slice missing');
const slice = src.slice(start, end);
const { _htmlToOdtContentXml, _htmlToDtbookXml, _htmlToDaisyNcx, _collectMoSegments, _buildMoSmil, _buildMoOpf } =
  new Function(slice + '; return { _htmlToOdtContentXml, _htmlToDtbookXml, _htmlToDaisyNcx, _collectMoSegments, _buildMoSmil, _buildMoOpf };')();

const wrap = (body, attrs) => `<!DOCTYPE html><html ${attrs || 'lang="en"'}><head><title>Test Doc</title></head><body>${body}</body></html>`;
const parseXml = (xml) => {
  // Strip the external DOCTYPE so jsdom's parser doesn't try to fetch the DTD.
  const noDoctype = xml.replace(/<!DOCTYPE[^>]*>/, '');
  const doc = new DOMParser().parseFromString(noDoctype, 'application/xml');
  const err = doc.querySelector('parsererror');
  return { doc, wellFormed: !err, err: err ? err.textContent : '' };
};

describe('ODT export — _htmlToOdtContentXml', () => {
  it('produces well-formed content.xml', () => {
    const xml = _htmlToOdtContentXml(wrap('<h1>Title</h1><p>Hello <strong>bold</strong> <em>it</em>.</p>'));
    const { wellFormed, err } = parseXml(xml);
    expect(wellFormed, err).toBe(true);
  });
  it('maps headings to text:h with outline-level and paragraphs to text:p', () => {
    const xml = _htmlToOdtContentXml(wrap('<h2>Sub</h2><p>Body</p>'));
    expect(xml).toContain('text:outline-level="2"');
    expect(xml).toContain('<text:h text:style-name="Heading_20_2"');
    expect(xml).toContain('<text:p text:style-name="Standard">Body</text:p>');
  });
  it('nests bold/italic as text:spans and keeps links', () => {
    const xml = _htmlToOdtContentXml(wrap('<p><strong>b</strong> <em>i</em> <a href="https://x.org">L</a></p>'));
    expect(xml).toContain('<text:span text:style-name="T_Bold">b</text:span>');
    expect(xml).toContain('<text:span text:style-name="T_Italic">i</text:span>');
    expect(xml).toContain('<text:a xlink:href="https://x.org">L</text:a>');
  });
  it('maps lists and tables', () => {
    const xml = _htmlToOdtContentXml(wrap('<ul><li>one</li><li>two</li></ul><table><tr><th>H</th></tr><tr><td>d</td></tr></table>'));
    expect(xml).toContain('<text:list text:style-name="L_Bullet">');
    expect(xml).toContain('<table:table');
    expect(xml).toContain('<table:table-cell');
  });
  it('escapes XML-significant characters in content', () => {
    const xml = _htmlToOdtContentXml(wrap('<p>a &lt; b &amp; c "q"</p>'));
    const { wellFormed } = parseXml(xml);
    expect(wellFormed).toBe(true);
    expect(xml).toContain('a &lt; b &amp; c');
  });
});

describe('DAISY export — _htmlToDtbookXml', () => {
  it('produces well-formed DTBook XML', () => {
    const xml = _htmlToDtbookXml(wrap('<h1>One</h1><p>Body</p><h2>Two</h2><p>More</p>'), 'en');
    const { wellFormed, err } = parseXml(xml);
    expect(wellFormed, err).toBe(true);
  });
  it('nests levelN containers to match heading depth and closes them all', () => {
    const xml = _htmlToDtbookXml(wrap('<h1>A</h1><p>x</p><h2>B</h2><p>y</p>'), 'en');
    // h1 -> level1, h2 -> nested level2
    expect(xml).toContain('<level1>');
    expect(xml).toContain('<level2>');
    // every opened level is closed (balanced)
    const opens = (xml.match(/<level\d>/g) || []).length;
    const closes = (xml.match(/<\/level\d>/g) || []).length;
    expect(opens).toBe(closes);
    expect(xml).toContain('xml:lang="en"');
    expect(xml).toContain('dtbook-2005-3');
  });
  it('opens a titled level1 when content precedes any heading', () => {
    const xml = _htmlToDtbookXml(wrap('<p>leading body with no heading</p>'), 'en');
    const { wellFormed } = parseXml(xml);
    expect(wellFormed).toBe(true);
    expect(xml).toContain('<level1>');
    expect(xml).toContain('<h1>Test Doc</h1>'); // injected title heading
    expect(xml).toContain('leading body');
  });
  it('maps lists and tables into DTBook elements', () => {
    const xml = _htmlToDtbookXml(wrap('<h1>T</h1><ol><li>a</li></ol><table><tr><th>H</th></tr></table>'), 'en');
    expect(xml).toContain('<list type="ol">');
    expect(xml).toContain('<th>H</th>');
  });
});

describe('DAISY navigation — _htmlToDaisyNcx', () => {
  it('emits a navPoint per heading in order', () => {
    const ncx = _htmlToDaisyNcx(wrap('<h1>Alpha</h1><p>x</p><h2>Beta</h2>'), 'Test Doc');
    const { wellFormed, err } = parseXml(ncx);
    expect(wellFormed, err).toBe(true);
    const nps = ncx.match(/<navPoint /g) || [];
    expect(nps.length).toBe(2);
    expect(ncx).toContain('<text>Alpha</text>');
    expect(ncx).toContain('<text>Beta</text>');
    expect(ncx).toContain('playOrder="2"');
  });
  it('falls back to a single navPoint when there are no headings', () => {
    const ncx = _htmlToDaisyNcx(wrap('<p>no headings here</p>'), 'Test Doc');
    const { wellFormed } = parseXml(ncx);
    expect(wellFormed).toBe(true);
    expect((ncx.match(/<navPoint /g) || []).length).toBe(1);
  });
});

describe('EPUB3 Media Overlays — _collectMoSegments / _buildMoSmil / _buildMoOpf', () => {
  it('assigns a stable id + spoken text to each leaf text block', () => {
    const { segments, bodyHtml } = _collectMoSegments(wrap('<h1>Title</h1><p>First para.</p><p>Second para.</p>'));
    expect(segments.length).toBe(3);
    expect(segments.map((s) => s.text)).toEqual(['Title', 'First para.', 'Second para.']);
    // every segment id is present in the emitted xhtml so the SMIL can target it
    segments.forEach((s) => expect(bodyHtml).toContain('id="' + s.id + '"'));
  });

  it('reuses an existing id rather than overwriting it', () => {
    const { segments } = _collectMoSegments(wrap('<p id="intro">Hello</p>'));
    expect(segments[0].id).toBe('intro');
  });

  it('does not double-speak a wrapper that contains leaf blocks', () => {
    // the <li> wraps a <p>; only the leaf <p> should be a segment
    const { segments } = _collectMoSegments(wrap('<ul><li><p>nested</p></li></ul>'));
    expect(segments.map((s) => s.text)).toEqual(['nested']);
  });

  it('SMIL has one par per segment, each linking text id -> audio clip', () => {
    const segs = [{ id: 'mo1', text: 'a' }, { id: 'mo2', text: 'b' }];
    const smil = _buildMoSmil(segs, [2.5, 3.0]);
    const { wellFormed, err } = parseXml(smil);
    expect(wellFormed, err).toBe(true);
    expect((smil.match(/<par /g) || []).length).toBe(2);
    expect(smil).toContain('<text src="content.xhtml#mo1"/>');
    expect(smil).toContain('clipEnd="2.5s"');
    expect(smil).toContain('audio/seg2.mp3');
  });

  it('OPF declares the overlay, the SMIL, every audio clip, and media:duration', () => {
    const segs = [{ id: 'mo1', text: 'a' }, { id: 'mo2', text: 'b' }];
    const opf = _buildMoOpf('My Doc', 'en', segs, 5.5, '2026-06-14T00:00:00Z');
    const { wellFormed, err } = parseXml(opf);
    expect(wellFormed, err).toBe(true);
    expect(opf).toContain('media-overlay="smil"');
    expect(opf).toContain('media-type="application/smil+xml"');
    expect((opf.match(/audio\/seg\d+\.mp3/g) || []).length).toBe(2);
    expect(opf).toContain('<meta property="media:duration">5.5s</meta>');
    expect(opf).toContain('synchronizedAudioText');
  });
});

describe('ODT / DAISY footnotes (2026-06-15 — were silently dropped)', () => {
  const fnHtml = wrap(
    '<p>Body text<sup class="allo-fn-ref" data-fn-uid="a"><a href="#fn-a">1</a></sup>.</p>' +
    '<section class="allo-footnotes"><hr/><ol>' +
    '<li data-fn-uid="a"><span class="allo-fn-text">First note.</span> <a class="allo-fn-back">back</a></li>' +
    '</ol></section>'
  );

  it('ODT renders a real inline text:note carrying the footnote body (not dropped)', () => {
    const xml = _htmlToOdtContentXml(fnHtml);
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toContain('<text:note');
    expect(xml).toContain('text:note-class="footnote"');
    expect(xml).toContain('First note');
  });

  it('DAISY renders a noteref + a <note> with the footnote body (not dropped)', () => {
    const xml = _htmlToDtbookXml(fnHtml, 'en');
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toContain('<noteref idref="dtbfn1">');
    expect(xml).toContain('<note id="dtbfn1">');
    expect(xml).toContain('First note');
  });
});
