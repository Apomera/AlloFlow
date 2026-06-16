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
const { _htmlToOdtContentXml, _htmlToDtbookXml, _htmlToDaisyNcx, _collectMoSegments, _buildMoSmil, _buildMoOpf, _wavDurationFromBytes } =
  new Function(slice + '; return { _htmlToOdtContentXml, _htmlToDtbookXml, _htmlToDaisyNcx, _collectMoSegments, _buildMoSmil, _buildMoOpf, _wavDurationFromBytes };')();

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

describe('exp-clip-duration — recover WAV duration from header bytes when measure() gives 0/Infinity', () => {
  // build a canonical 16-bit mono PCM WAV with `samples` data bytes at sampleRate
  const makeWav = (dataBytes, sampleRate) => {
    const byteRate = sampleRate * 1 * 2; // mono, 16-bit
    const u8 = new Uint8Array(44 + dataBytes);
    const wr4 = (off, s) => { for (let i = 0; i < 4; i++) u8[off + i] = s.charCodeAt(i); };
    const wrU32 = (off, v) => { u8[off] = v & 255; u8[off + 1] = (v >> 8) & 255; u8[off + 2] = (v >> 16) & 255; u8[off + 3] = (v >> 24) & 255; };
    wr4(0, 'RIFF'); wrU32(4, 36 + dataBytes); wr4(8, 'WAVE');
    wr4(12, 'fmt '); wrU32(16, 16); u8[20] = 1; u8[22] = 1; wrU32(24, sampleRate); wrU32(28, byteRate); u8[32] = 2; u8[34] = 16;
    wr4(36, 'data'); wrU32(40, dataBytes);
    return u8;
  };

  it('returns data-bytes / byteRate seconds for a canonical WAV', () => {
    // 24000 Hz mono 16-bit → byteRate 48000; 48000 data bytes → 1.0s
    expect(_wavDurationFromBytes(makeWav(48000, 24000))).toBeCloseTo(1.0, 5);
    expect(_wavDurationFromBytes(makeWav(24000, 24000))).toBeCloseTo(0.5, 5);
  });
  it('falls back to actual remaining bytes when the data size field is 0/over-long', () => {
    const w = makeWav(48000, 24000);
    w[40] = w[41] = w[42] = w[43] = 0; // zero the data-chunk size field
    expect(_wavDurationFromBytes(w)).toBeCloseTo(1.0, 5); // uses real remaining bytes
  });
  it('returns 0 for non-WAV bytes (mp3 path stays unchanged)', () => {
    expect(_wavDurationFromBytes(new Uint8Array([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 4]))).toBe(0);
    expect(_wavDurationFromBytes(new Uint8Array(10))).toBe(0);
    expect(_wavDurationFromBytes(null)).toBe(0);
  });
});

describe('EPUB3 MO — blob-less segments (2026-06-15 P0: one failed TTS must not invalidate the EPUB)', () => {
  const segs = [{ id: 'mo1', text: 'a' }, { id: 'mo2', text: 'b' }, { id: 'mo3', text: 'c' }];
  it('SMIL emits a text-only par (no <audio>) for a blob-less segment', () => {
    const smil = _buildMoSmil(segs, [2, 0, 3], 'mp3', [true, false, true]);
    expect(parseXml(smil).wellFormed).toBe(true);
    expect((smil.match(/<par /g) || []).length).toBe(3);    // all blocks still tracked
    expect((smil.match(/<audio /g) || []).length).toBe(2);  // only the 2 with a clip
    expect(smil).not.toContain('audio/seg2.mp3');           // blob-less par references no file
  });
  it('OPF manifests only the audio clips that exist (no dangling resource)', () => {
    const opf = _buildMoOpf('Doc', 'en', segs, 5, '2026-06-15T00:00:00Z', 'mp3', 'audio/mpeg', [true, false, true]);
    expect(parseXml(opf).wellFormed).toBe(true);
    expect((opf.match(/audio\/seg\d+\.mp3/g) || []).length).toBe(2);
    expect(opf).not.toContain('audio/seg2.mp3');
  });
  it('back-compat: omitting hasAudio keeps all-present behavior', () => {
    expect((_buildMoSmil(segs, [1, 2, 3], 'mp3').match(/<audio /g) || []).length).toBe(3);
  });
});

describe('EPUB/DAISY well-formedness + navigation (2026-06-15 third-review fixes)', () => {
  it('#1 read-along body is WELL-FORMED XHTML even with void elements (<input>/<col>) + named entities', () => {
    // pre-fix: innerHTML left <input>/<col> unclosed and &mdash; undefined in XML → epubcheck rejects
    const { bodyHtml } = _collectMoSegments(wrap('<p>Section&mdash;A</p><input data-allo-field="x"><table><col/><tr><td>cell</td></tr></table>'));
    const xhtml = '<html xmlns="http://www.w3.org/1999/xhtml"><body>' + bodyHtml + '</body></html>';
    const { wellFormed, err } = parseXml(xhtml);
    expect(wellFormed, err).toBe(true);   // the whole point: parses as application/xml
    expect(bodyHtml).toContain('input');  // the fillable field survives (just self-closed)
  });

  it('#2 every DAISY NCX navPoint anchor resolves to a matching heading id in the DTBook', () => {
    const html = wrap('<h1>Alpha</h1><p>x</p><h2>Beta</h2><p>y</p><h2>Gamma</h2>');
    const ncx = _htmlToDaisyNcx(html, 'Doc');
    const dtbook = _htmlToDtbookXml(html, 'en');
    const anchors = [...ncx.matchAll(/dtbook\.xml#(h\d+)/g)].map((m) => m[1]);
    expect(anchors.length).toBe(3);                         // one per heading
    for (const a of anchors) expect(dtbook).toContain('id="' + a + '"'); // pre-fix: all dangling
  });

  it('#2 the injected title/Notes <h1> do NOT consume a heading id (counter stays aligned)', () => {
    // content before any heading injects a title <h1>; it must not get id="h1" (the NCX skips it)
    const html = wrap('<p>leading body</p><h1>Real First Heading</h1>');
    const dtbook = _htmlToDtbookXml(html, 'en');
    expect(dtbook).toMatch(/<h1 id="h1">Real First Heading<\/h1>/);
  });

  it('#4 DTBook renders image alt as a labelled paragraph, not an empty <imggroup>', () => {
    const dtbook = _htmlToDtbookXml(wrap('<h1>T</h1><img alt="A bar chart of class scores"/><p>body</p>'), 'en');
    expect(dtbook).not.toContain('<imggroup');                        // invalid content model removed
    expect(dtbook).toContain('[Image: A bar chart of class scores]'); // alt preserved
    expect(parseXml(dtbook).wellFormed).toBe(true);
  });

  it('#5 ODT footnote serialization threads the footnotes map (a footnote-in-footnote ref survives)', () => {
    // regression guard: the common single-level footnote still renders + stays well-formed
    const fn = wrap('<p>Body<sup class="allo-fn-ref" data-fn-uid="a"><a href="#fn-a">1</a></sup>.</p>' +
      '<section class="allo-footnotes"><hr/><ol><li data-fn-uid="a"><span class="allo-fn-text">A note.</span></li></ol></section>');
    const xml = _htmlToOdtContentXml(fn);
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toContain('A note');
    // anti-drift: the recursive footnote-run call now receives the footnotes map
    expect(src).toContain('_odtRuns(_fnRuns, footnotes)');
  });
});

describe('loose text between blocks is preserved (audit #8 — container-text drop)', () => {
  it('ODT keeps text that is a direct child of a container that also holds a block element', () => {
    const xml = _htmlToOdtContentXml(wrap('<div>Intro text<p>Body</p></div>'));
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toContain('Intro text'); // was silently dropped before the fix
    expect(xml).toContain('Body');
  });
  it('DAISY (DTBook) keeps the same loose container text', () => {
    const xml = _htmlToDtbookXml(wrap('<div>Intro text<p>Body</p></div>'));
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toContain('Intro text');
  });
  it('preserves loose text + inline siblings in document order (Lead in note, then Body)', () => {
    const xml = _htmlToOdtContentXml(wrap('<div>Lead <strong>in</strong> note<p>Body</p></div>'));
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toMatch(/Lead[\s\S]*in[\s\S]*note[\s\S]*Body/); // trailing "note" used to vanish
  });
  it('does NOT invent empty paragraphs from whitespace-only text between blocks', () => {
    const xml = _htmlToOdtContentXml(wrap('<div>\n  <p>A</p>\n  <p>B</p>\n</div>'));
    expect(xml).toContain('>A<');
    expect(xml).toContain('>B<');
    expect(xml).not.toMatch(/<text:p[^>]*>\s*<\/text:p>/); // no empty paragraph from whitespace
  });
});

describe('ODT table header semantics (audit #19)', () => {
  it('wraps the leading header row in <table:table-header-rows>, body rows after', () => {
    const xml = _htmlToOdtContentXml(wrap('<table><thead><tr><th>Name</th><th>Score</th></tr></thead><tbody><tr><td>Ada</td><td>9</td></tr></tbody></table>'));
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).toContain('<table:table-header-rows>');
    const header = xml.slice(xml.indexOf('<table:table-header-rows>'), xml.indexOf('</table:table-header-rows>'));
    expect(header).toContain('Name');
    expect(header).toContain('Score');
    expect(header).not.toContain('Ada'); // the data row is NOT inside the header wrapper
  });
  it('a header-less table emits no table-header-rows wrapper', () => {
    const xml = _htmlToOdtContentXml(wrap('<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>'));
    expect(parseXml(xml).wellFormed).toBe(true);
    expect(xml).not.toContain('<table:table-header-rows>');
  });
});

describe('nested lists preserve hierarchy (audit #24)', () => {
  const nestedHtml = '<ul><li>Parent A<ul><li>Child B</li></ul></li><li>Sibling C</li></ul>';
  it('ODT nests a sub-list inside its parent list-item (not flattened to top level)', () => {
    const xml = _htmlToOdtContentXml(wrap(nestedHtml));
    expect(parseXml(xml).wellFormed).toBe(true);
    expect((xml.match(/<text:list /g) || []).length).toBeGreaterThanOrEqual(2); // outer + nested
    expect(xml).toMatch(/Parent A[\s\S]*?<text:list[\s\S]*?Child B[\s\S]*?<\/text:list>[\s\S]*?<\/text:list-item>/);
    expect(xml).toContain('Sibling C');
  });
  it('DTBook nests a sub-list inside its parent <li>', () => {
    const xml = _htmlToDtbookXml(wrap(nestedHtml));
    expect(parseXml(xml).wellFormed).toBe(true);
    expect((xml.match(/<list /g) || []).length).toBeGreaterThanOrEqual(2);
    expect(xml).toMatch(/Parent A[\s\S]*?<list[\s\S]*?Child B[\s\S]*?<\/list>[\s\S]*?<\/li>/);
  });
  it('a flat list still produces a single list (no spurious nesting)', () => {
    const xml = _htmlToOdtContentXml(wrap('<ul><li>one</li><li>two</li></ul>'));
    expect((xml.match(/<text:list /g) || []).length).toBe(1);
    expect(xml).toContain('one'); expect(xml).toContain('two');
  });
});
