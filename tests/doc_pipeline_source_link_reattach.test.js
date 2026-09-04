// Hyperlinks the source carried must survive remediation.
//
// Extraction works from rendered page images plus a text layer; a PDF's link
// DESTINATIONS live in the annotation layer, which neither of those carries. So
// descriptive link text ("Freedom Scientific download page for Jaws") arrived as
// ordinary words and the reader could not act on it. The pipeline already knew:
// it counts the source's Link annotations and warns "the source had ~13
// hyperlink(s) but the output has 1" — then discarded the URLs.
//
// Those URLs are now paired with the anchor text they covered (recovered by
// intersecting each annotation rect with the page's text items — verified 13/13
// on a real document) and re-attached deterministically. No model call, no
// quota, and no way to invent a destination: only text that genuinely carried
// that href in the source is ever wrapped.
//
// These tests pin the conservative boundaries. A missing link is a documented
// fidelity note; a WRONG link sends a reader somewhere the author never pointed
// them, so every ambiguous case must be left alone.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const start = 'function _reattachSourceLinks(html, srcLinks) {';
const end = '\n    return run;\n  }\n}';
const i = SRC.indexOf(start);
if (i === -1) throw new Error('_reattachSourceLinks not found');
const j = SRC.indexOf(end, i);
if (j === -1) throw new Error('_reattachSourceLinks end marker not found');
// eslint-disable-next-line no-new-func
const reattach = new Function(SRC.slice(i, j + end.length) + '\nreturn _reattachSourceLinks;')();

const JAWS = { text: 'Freedom Scientific download page for Jaws', url: 'https://support.freedomscientific.com/Downloads/JAWS' };
const NVDA = { text: 'NVDA on-line user guide', url: 'https://www.nvaccess.org/files/nvda/documentation/userGuide.html' };

describe('source hyperlinks are re-attached, never invented', () => {
  it('wraps anchor text that arrived as plain words', () => {
    const html = '<ul><li>Freedom Scientific download page for Jaws</li></ul>';
    const r = reattach(html, [JAWS]);
    expect(r.count).toBe(1);
    expect(r.html).toBe('<ul><li><a href="https://support.freedomscientific.com/Downloads/JAWS">Freedom Scientific download page for Jaws</a></li></ul>');
  });

  it('restores several links in one pass', () => {
    const html = '<ul><li>Freedom Scientific download page for Jaws</li><li>NVDA on-line user guide</li></ul>';
    const r = reattach(html, [JAWS, NVDA]);
    expect(r.count).toBe(2);
    expect(r.html).toContain('href="https://support.freedomscientific.com/Downloads/JAWS"');
    expect(r.html).toContain('href="https://www.nvaccess.org/files/nvda/documentation/userGuide.html"');
  });

  // Nesting an <a> inside an <a> is invalid HTML and would break the existing link.
  it('never touches text already inside an anchor', () => {
    const html = '<p><a href="https://example.com/original">NVDA on-line user guide</a></p>';
    const r = reattach(html, [NVDA]);
    expect(r.count).toBe(0);
    expect(r.html).toBe(html);
  });

  it('never rewrites inside style, script or title', () => {
    for (const tag of ['style', 'script', 'title']) {
      const html = `<${tag}>NVDA on-line user guide</${tag}>`;
      const r = reattach(html, [NVDA]);
      expect(r.count, tag).toBe(0);
      expect(r.html, tag).toBe(html);
    }
  });

  // A match inside an attribute would corrupt the markup entirely.
  it('never rewrites inside an attribute value', () => {
    const html = '<img alt="NVDA on-line user guide" src="x.png">';
    const r = reattach(html, [NVDA]);
    expect(r.count).toBe(0);
    expect(r.html).toBe(html);
  });

  it('gives the longer link first claim on overlapping words', () => {
    const long = { text: 'Home page for NVAccess (download NVDA)', url: 'https://www.nvaccess.org/' };
    const short = { text: 'download NVDA', url: 'https://example.com/wrong' };
    const r = reattach('<p>Home page for NVAccess (download NVDA)</p>', [short, long]);
    expect(r.count).toBe(1);
    expect(r.html).toContain('https://www.nvaccess.org/');
    expect(r.html).not.toContain('example.com/wrong');
  });

  it('escapes the destination so a crafted URL cannot break out of the attribute', () => {
    const nasty = { text: 'Some descriptive link text', url: 'https://e.com/?a=1&b="><script>x</script>' };
    const r = reattach('<p>Some descriptive link text</p>', [nasty]);
    expect(r.html).not.toContain('"><script>');
    expect(r.html).toContain('&quot;');
    expect(r.html).toContain('&amp;');
  });

  it('ignores destinations that are not http, https or mailto', () => {
    const bad = { text: 'Some descriptive link text', url: 'javascript:alert(1)' };
    const r = reattach('<p>Some descriptive link text</p>', [bad]);
    expect(r.count).toBe(0);
    expect(r.html).not.toContain('javascript:');
  });

  it('ignores anchor text too short to match safely', () => {
    const r = reattach('<p>Read the PDF now</p>', [{ text: 'PDF', url: 'https://example.com/' }]);
    expect(r.count).toBe(0);
  });

  it('is a silent no-op when the source had no links', () => {
    const html = '<p>Nothing to do here.</p>';
    for (const empty of [null, undefined, []]) {
      const r = reattach(html, empty);
      expect(r.count).toBe(0);
      expect(r.html).toBe(html);
    }
  });

  // A link the source repeated — the district footer URL on every page — is one
  // distinct pair but several real links. The source's own occurrence count is the
  // ceiling, so the repair restores all of them and can never invent an extra.
  it('restores a repeated link as many times as the source carried it', () => {
    const html = '<p>NVDA on-line user guide</p><p>NVDA on-line user guide</p><p>NVDA on-line user guide</p>';
    const r = reattach(html, [{ ...NVDA, occurrences: 3 }]);
    expect(r.count).toBe(3);
    expect(r.html.split('<a href').length - 1).toBe(3);
  });

  it('never exceeds the source occurrence count', () => {
    const html = '<p>NVDA on-line user guide</p>'.repeat(5);
    const r = reattach(html, [{ ...NVDA, occurrences: 2 }]);
    expect(r.count).toBe(2);
    expect(r.html.split('<a href').length - 1).toBe(2);
  });

  it('falls back to a single application when no count is supplied', () => {
    const html = '<p>NVDA on-line user guide</p><p>NVDA on-line user guide</p>';
    const r = reattach(html, [NVDA]);
    expect(r.count).toBe(1);
  });
});
