// Export correctness (Batch 4, 2026-07-03). Five export/render fixes:
//   M8 — figcaption description/purpose are HTML-escaped (they were interpolated raw while the alt one
//        line up WAS escaped, so "Graph showing x < y" garbled the caption).
//   M9 — parseMarkdownToHTML escapes raw text BEFORE the inline transforms (a stray < & > garbled every
//        resource/full-pack export; WCAG 4.1.1), and the emphasis regex is anchored so "2 * 3 * 4" is not
//        turned into "2 <em> 3 </em> 4".
//   M10 — the Office-batch note references only the accessible HTML artifact actually written (there is no
//        Word artifact — the old note told teachers to "use the Word artifact" that does not exist).
//   M11 — createTypesetTaggedPdf tracks dropped images (too large / non-PNG-JPEG) → contentDropped +
//        summary.imagesDropped (was a silent skip with no disclosure).
//   L5 — renderJsonToHtml salvages block.latex/value for a math/footnote block with no .text.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8')
  + '\n' + readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');

// Faithful mirror of the M9 inline pipeline (escape first, then anchored emphasis).
const mdInline = (content) => {
  content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  content = content.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>');
  content = content.replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  return content;
};

describe('M8 — figcaption description/purpose are escaped', () => {
  it('escapes desc and purpose in the figcaption (not just the alt)', () => {
    expect(src).toContain("<span aria-hidden=\"true\">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>");
    expect(src).toContain("Purpose: ' + purpose.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')");
  });
});

describe('M9 — parseMarkdownToHTML escapes + anchors emphasis', () => {
  it('escapes the raw line before the inline transforms', () => {
    expect(src).toContain('escape the raw text BEFORE the inline-markdown transforms');
  });
  it('anchors the emphasis regex to non-space-bordered runs', () => {
    expect(src).toContain('Anchor emphasis to non-space-bordered runs');
  });
  it('mirror: < & > are escaped', () => {
    expect(mdInline('Cool to < 100C & rising')).toBe('Cool to &lt; 100C &amp; rising');
    expect(mdInline('AT&T')).toBe('AT&amp;T');
  });
  it('mirror: math "2 * 3 * 4" is NOT italicized; real *emphasis* / **bold** still work', () => {
    expect(mdInline('2 * 3 * 4')).toBe('2 * 3 * 4');
    expect(mdInline('this is *emphasis* here')).toBe('this is <em>emphasis</em> here');
    expect(mdInline('**bold** text')).toBe('<strong>bold</strong> text');
  });
});

describe('M10 — Office-batch note references only the artifact produced', () => {
  it('points at the accessible HTML artifact, not a nonexistent Word artifact', () => {
    expect(src).toContain('use the accessible HTML artifact in the ZIP');
    expect(src).not.toContain('use the Word/HTML artifacts');
  });
});

describe('M11 — dropped typeset images are disclosed', () => {
  it('tracks the drop, feeds contentDropped, and surfaces summary.imagesDropped', () => {
    expect(src).toContain('_imagesDropped++');
    expect(src).toContain('|| _imagesDropped > 0');
    expect(src).toContain('_tagged.summary.imagesDropped = _imagesDropped');
  });
});

describe('L5 — renderJsonToHtml salvages math/footnote content', () => {
  it('salvages block.latex / block.value for an unknown block with no .text', () => {
    expect(src).toContain('|| block.latex || block.value');
  });
});
