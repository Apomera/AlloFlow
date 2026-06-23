// Curated block-restyle library (S3, 2026-06-23; hardened after adversarial review). The AI (a later slice)
// only SELECTS one of these vetted, structure-only transforms — it never authors freeform HTML. Every
// transform is DOM-level and TRIPLE-gated: reading order (checkReadingOrderPreserved), structural fidelity
// (the <a href>/<img> multisets are unchanged), and a context guard (no invalid nesting). It REFUSES rather
// than silently corrupt. These tests prove content-preservation INDEPENDENTLY and lock the specific
// content-loss bugs the review found (link multiplication, link/markup flatten, dropped image-only segment,
// eaten minus sign, dropped inline colour, invalid nesting, bogus prose-list).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const mod = readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8');

const _s = dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {');
const _e = dp.indexOf('\n// Convert an INTERACTIVE image-placeholder', _s);
if (_s === -1 || _e < 0) throw new Error('extraction markers for the restyle span are missing');
const span = dp.slice(_s, _e);
const restyleBlock = new Function(span + '\nreturn restyleBlock;')();
const checkReadingOrderPreserved = new Function(span + '\nreturn checkReadingOrderPreserved;')();

const preserves = (before, after) => checkReadingOrderPreserved(before, after).ok;
// count elements of a kind in an HTML string by re-parsing (what a real browser/export will see)
const countTag = (html, sel) => new DOMParser().parseFromString(html, 'text/html').querySelectorAll(sel).length;

describe('restyleBlock("callout"): wraps without touching content or text colour', () => {
  it('wraps a paragraph in a role=note aside and preserves the content', () => {
    const r = restyleBlock('<p>Remember to submit by Friday.</p>', 'callout', {});
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('callout');
    expect(r.html).toMatch(/^<aside class="allo-callout" role="note"/);
    expect(r.html).toContain('<p>Remember to submit by Friday.</p>');
    expect(preserves('<p>Remember to submit by Friday.</p>', r.html)).toBe(true);
  });
  it('is contrast-safe by construction: decorative left border, NO background fill, no color override', () => {
    const r = restyleBlock('<p>Body text.</p>', 'callout', {});
    expect(r.html).toMatch(/border-left:4px solid/);
    expect(r.html).not.toMatch(/background(-color)?\s*:/i);
    expect(r.html).not.toMatch(/(^|[;"\s])color\s*:/i);
  });
  it('preserves inline markup and links inside the block (callout never flattens)', () => {
    const src = '<p>a <strong>bold</strong> <a href="https://x.test">link</a></p>';
    const r = restyleBlock(src, 'callout', {});
    expect(r.html).toContain('<strong>bold</strong>');
    expect(countTag(r.html, 'a[href="https://x.test"]')).toBe(1);
    expect(preserves(src, r.html)).toBe(true);
  });
  it('an optional label becomes the accessible name and is HTML/attr-escaped (no injection)', () => {
    const r = restyleBlock('<p>x</p>', 'callout', { label: 'A & B "<note>"' });
    expect(r.html).toContain('aria-label="A &amp; B &quot;&lt;note&gt;&quot;"');
    expect(r.html).not.toMatch(/<note>/);
  });
  it('refuses input with no element block', () => {
    expect(restyleBlock('just loose text', 'callout', {}).reason).toBe('no-block');
  });
});

describe('restyleBlock("list"): only when items are unambiguous; content preserved DOM-level', () => {
  it('splits TOP-LEVEL <br> lines into <li> (keeping inline markup) and preserves content', () => {
    const src = '<p>apples<br>bananas<br>cherries</p>';
    const r = restyleBlock(src, 'list', {});
    expect(r.ok).toBe(true);
    expect(countTag(r.html, 'li')).toBe(3);
    expect(preserves(src, r.html)).toBe(true);
  });
  it('strips a leading bullet glyph but never a meaningful character', () => {
    const r = restyleBlock('<p>• apples<br>• bananas</p>', 'list', {});
    expect(r.ok).toBe(true);
    expect(countTag(r.html, 'li')).toBe(2);
    expect(r.html).not.toContain('•');
  });
  it('splits a pure-text inline-bulleted series', () => {
    const r = restyleBlock('<p>red • green • blue</p>', 'list', {});
    expect(r.ok).toBe(true);
    expect(countTag(r.html, 'li')).toBe(3);
  });
  it('preserves inline markup in <br>-split items', () => {
    const src = '<p>a <strong>x</strong><br>b</p>';
    const r = restyleBlock(src, 'list', {});
    expect(r.ok).toBe(true);
    expect(r.html).toContain('<strong>x</strong>');
    expect(preserves(src, r.html)).toBe(true);
  });
  it('refuses a block that is already a list', () => {
    expect(restyleBlock('<ul><li>x</li><li>y</li></ul>', 'list', {}).reason).toBe('already-list');
  });
  it('refuses when there is no clear delimiter (won’t invent items)', () => {
    expect(restyleBlock('<p>just one sentence with no separators</p>', 'list', {}).reason).toBe('no-delimiter');
  });
});

describe('regression: the content-loss bugs the adversarial review found are now refused, not silently shipped', () => {
  it('R4 — a hyperlink (or any inline element) spanning a <br> never multiplies into N links', () => {
    const src = '<p>Notes: <a href="mailto:t@s.edu">contact me<br>about your child<br>privately</a></p>';
    const r = restyleBlock(src, 'list', {});
    // the <br>s are INSIDE the <a> (not top-level) → only one item → refused, never 1→3 links
    expect(r.ok).toBe(false);
    // and if it had produced output it could never pass the fidelity gate (link count would change)
  });
  it('R5 — ";"/bullet split refuses when inline markup is present rather than flattening links away', () => {
    const r = restyleBlock('<p>Submit via <a href="https://forms.test/x">this form</a> • questions to staff</p>', 'list', {});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('inline-markup');
  });
  it('R6 — a <br> segment that is only an <img> keeps the image + its alt (not dropped)', () => {
    const src = '<p>Steps:<br><img alt="water cycle diagram" src="c.png"><br>Discuss.</p>';
    const r = restyleBlock(src, 'list', {});
    expect(r.ok).toBe(true);
    expect(countTag(r.html, 'li')).toBe(3);
    expect(countTag(r.html, 'img[alt="water cycle diagram"]')).toBe(1);
  });
  it('R7 — a leading minus/dash glued to content is preserved (not eaten as a bullet)', () => {
    const r = restyleBlock('<p>-10 to 20<br>then 30</p>', 'list', {});
    expect(r.ok).toBe(true);
    // "-10" must survive; a real bullet "- text" (dash+space) would be stripped, "-10" (no space) is content
    expect(r.html).toContain('-10 to 20');
  });
  it('R8 — the source block’s inline colour is carried onto the list so contrast is not lost', () => {
    const r = restyleBlock('<p style="color:#ffffff">one<br>two</p>', 'list', {});
    expect(r.ok).toBe(true);
    expect(r.html).toMatch(/<ul[^>]*color:\s*(#ffffff|rgb\(255, 255, 255\))/i);
  });
  it('R10 — ordinary prose containing ";" is NOT turned into a bogus list (bare-";" heuristic dropped)', () => {
    expect(restyleBlock('<p>The meeting is at 3; please arrive early.</p>', 'list', {}).reason).toBe('no-delimiter');
    expect(restyleBlock('<p>red; green; blue</p>', 'list', {}).reason).toBe('no-delimiter');
  });
});

describe('regression: invalid-nesting context guards (R3)', () => {
  for (const tag of ['li', 'dt', 'dd', 'figcaption']) {
    it(`refuses restyling a <${tag}> in place (would break the parent content model)`, () => {
      const html = `<${tag}>alpha<br>beta</${tag}>`;
      expect(restyleBlock(html, 'list', {}).reason).toMatch(/bad-context|no-block/);
      expect(restyleBlock(html, 'callout', {}).reason).toMatch(/bad-context|no-block/);
    });
  }
  it('list refuses a container with multiple block-level children (won’t collapse N blocks)', () => {
    expect(restyleBlock('<section><p>one</p><p>two</p></section>', 'list', {}).reason).toBe('multi-block');
  });
  it('callout MAY wrap a multi-block container (valid + content-preserving)', () => {
    const r = restyleBlock('<section><p>one</p><p>two</p></section>', 'callout', {});
    expect(r.ok).toBe(true);
    expect(preserves('<section><p>one</p><p>two</p></section>', r.html)).toBe(true);
  });
  it('refuses stacking a callout on an existing callout (no nested role=note landmarks)', () => {
    expect(restyleBlock('<aside class="allo-callout" role="note"><p>hi</p></aside>', 'callout', {}).reason).toBe('already-callout');
  });
});

describe('restyleBlock: every successful transform passes reading-order AND structural fidelity', () => {
  const cases = [
    ['<p>one two three</p>', 'callout'],
    ['<p>a <em>b</em> <a href="http://k.test">c</a></p>', 'callout'],
    ['<p>alpha<br>beta<br>gamma</p>', 'list'],
    ['<p>x marks the spot<br>y too</p>', 'list'],   // single-char content must survive the guard now
  ];
  it('content (text + links + images) survives for all of them', () => {
    for (const [src, kind] of cases) {
      const r = restyleBlock(src, kind, {});
      expect(r.ok, kind + ' on ' + src).toBe(true);
      expect(preserves(src, r.html), 'reading order for ' + src).toBe(true);
      expect(countTag(src, 'a[href]')).toBe(countTag(r.html, 'a[href]'));   // link fidelity
    }
  });
});

describe('restyleBlock: dispatcher guards', () => {
  it('no input → no-input', () => { expect(restyleBlock('', 'callout', {}).reason).toBe('no-input'); });
  it('unknown kind → unknown-kind', () => { expect(restyleBlock('<p>x</p>', 'bogus', {}).reason).toBe('unknown-kind'); });
});

describe('anti-drift: exported on the factory + wired into the region editor via the proven splice path', () => {
  it('restyleBlock is on the doc-pipeline factory API + survives the build', () => {
    expect(dp).toMatch(/restyleBlock: restyleBlock,/);
    expect(mod).toMatch(/restyleBlock/);
  });
  it('_restyleRegion runs the transform, splices via _spliceBlock, snapshots revert, surfaces a failed re-audit', () => {
    const h = view.slice(view.indexOf('const _restyleRegion = async (kind) => {'), view.indexOf('const _restyleRegion = async (kind) => {') + 4200);
    expect(h).toMatch(/_docPipeline\.restyleBlock\(original, kind, \{\}\)/);
    expect(h).toMatch(/const sp = _spliceBlock\(pdfFixResult\.accessibleHtml, original, res\.html\)/);
    expect(h).toMatch(/accessibleHtml: sp\.html, _preCmdHtml: _before/);
    expect(h).toMatch(/await _reauditAndScore\(sp\.html, null\)/);
    expect(h).toMatch(/why === 'reading-order'/);
    expect(h).toMatch(/why === 'bad-context'/);   // honest refusal for invalid-nesting targets
    expect(h).toMatch(/_rescore && _rescore\.ok === false/);   // surfaces a throttled re-audit (R11)
  });
  it('the region editor exposes the no-AI restyle chips with an honest label', () => {
    expect(view).toMatch(/onClick=\{\(\) => _restyleRegion\('callout'\)\}/);
    expect(view).toMatch(/onClick=\{\(\) => _restyleRegion\('list'\)\}/);
    expect(view).toMatch(/pdf_audit\.region\.restyle_label/);
  });
});
