// #I (2026-07-07): the 7/7 scanned App-E run (post-#G) shipped raw source-markdown into restored
// fragments + the Preserved/Recovery boxes — literal "<br>", table pipes ("| |"), "* " bullet markers,
// "###" headings — because the OCR ground truth carries that markup and un-anchorable fragments were
// injected verbatim. _stripRestoreMarkdown is extended to strip them (restore-only; never the main body).
// Plus the maintainer-approved defensive guard _rewrapOrphanedMainContent: if <main> ever closes early,
// move the orphaned PRIMARY content back inside it, exempting the designed recovery/preserved/footer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const _stripRestoreMarkdown = (() => {
  const s = src.indexOf('var _stripRestoreMarkdown = function');
  const e = src.indexOf('\n};', s) + 3;
  return new Function(src.slice(s, e) + '\n; return _stripRestoreMarkdown;')();
})();
const _rewrapOrphanedMainContent = (() => {
  const s = src.indexOf('function _rewrapOrphanedMainContent(html) {');
  const e = src.indexOf('\n}', s) + 2;
  return new Function(src.slice(s, e) + '\n; return _rewrapOrphanedMainContent;')();
})();

describe('_stripRestoreMarkdown — strips leaked source-markdown from restored fragments', () => {
  it('strips "* " bullet markers (leading + separator) — the "* Trauma * Peer relations" leak', () => {
    expect(_stripRestoreMarkdown('* Trauma * Peer relations * School-related anxiety')).toBe('Trauma Peer relations School-related anxiety');
    expect(_stripRestoreMarkdown('* Parent employment * Ages and personalities of siblings')).toBe('Parent employment Ages and personalities of siblings');
  });
  it('strips literal <br> tags and table pipes (the "<br>* What…", "| | Tyrone" leaks)', () => {
    expect(_stripRestoreMarkdown('<br>* What are the consequences of not submitting work?')).toBe('What are the consequences of not submitting work?');
    expect(_stripRestoreMarkdown('| | "Tyrone’s mother, Ms.')).toBe('"Tyrone’s mother, Ms.');
  });
  it('still strips ### / ## ATX headings (existing behavior kept) incl. the recovery-context "###" leak', () => {
    expect(_stripRestoreMarkdown('concentration * Vision, hearing, or sensorimotor impairment ### Behavioral/Psychiatric Functioning *'))
      .toBe('concentration Vision, hearing, or sensorimotor impairment Behavioral/Psychiatric Functioning');
    expect(_stripRestoreMarkdown('## 9. Summary')).toBe('9. Summary');
  });
  it('does NOT clobber legitimate prose: a lone mid-word/number "*" or "|" that is not a bullet/pipe run', () => {
    // "3*4" (no surrounding spaces) is not a space-bounded bullet separator → untouched
    expect(_stripRestoreMarkdown('the value 3*4 equals twelve')).toBe('the value 3*4 equals twelve');
    // a hyphenated word keeps its hyphen (leading-bullet rule needs a following space)
    expect(_stripRestoreMarkdown('well-being and self-esteem')).toBe('well-being and self-esteem');
  });
});

describe('_rewrapOrphanedMainContent — moves orphaned primary content back into <main>', () => {
  const dom = (s) => new DOMParser().parseFromString(s, 'text/html');
  it('moves a substantive block orphaned AFTER </main> back inside main', () => {
    const html = '<!DOCTYPE html><html><body><main><h1>Doc</h1><p>Intro paragraph here.</p></main><p>This whole paragraph was orphaned outside the main landmark and is inaccessible to landmark navigation.</p></body></html>';
    const d = dom(_rewrapOrphanedMainContent(html));
    expect(d.querySelectorAll('main').length).toBe(1);
    expect(d.querySelector('body > p')).toBeNull();                 // no primary content left outside main
    expect(d.querySelector('main').textContent).toContain('orphaned outside the main landmark');
  });
  it('EXEMPTS the designed appendices + footer (recovery / preserved-block / <footer> stay outside main)', () => {
    const html = '<!DOCTYPE html><html><body><main><p>Body content of the document goes here.</p></main>'
      + '<section data-source-preserved-block="true"><p>preserved</p></section>'
      + '<section data-content-recovery="true"><p>recovery words</p></section>'
      + '<footer>© 2026</footer></body></html>';
    const d = dom(_rewrapOrphanedMainContent(html));
    expect(d.querySelector('main [data-source-preserved-block]')).toBeNull(); // preserved NOT pulled in
    expect(d.querySelector('main [data-content-recovery]')).toBeNull();       // recovery NOT pulled in
    expect(d.querySelector('main footer')).toBeNull();                        // footer NOT pulled in
    expect(d.querySelector('body > section[data-content-recovery]')).toBeTruthy();
  });
  it('is a no-op on a well-formed doc (nothing substantive after main) and idempotent', () => {
    const clean = '<!DOCTYPE html><html><body><main><h1>T</h1><p>All content is inside main.</p></main><footer>©</footer></body></html>';
    const once = _rewrapOrphanedMainContent(clean);
    expect(_rewrapOrphanedMainContent(once)).toBe(once);
    expect(once).toBe(clean); // byte-identical: no orphaned primary content
  });
  it('fail-safe: no <main>, or non-string input, returns input unchanged', () => {
    expect(_rewrapOrphanedMainContent('<body><p>no main here</p></body>')).toBe('<body><p>no main here</p></body>');
    expect(_rewrapOrphanedMainContent('')).toBe('');
    expect(_rewrapOrphanedMainContent(null)).toBe(null);
  });
});

describe('#I: wiring — source pins', () => {
  it('the recovery-appendix context snippet is markdown-stripped', () => {
    expect(src).toContain('const _ctx = u.context ? _stripRestoreMarkdown(u.context) : \'\';');
  });
  it('the orphaned-main guard runs after the one-main collapse, before the final audit', () => {
    expect(src).toContain('accessibleHtml = _rewrapOrphanedMainContent(accessibleHtml);');
    const collapseIdx = src.indexOf('_collapseExtraMains(accessibleHtml)');
    const rewrapIdx = src.indexOf('_rewrapOrphanedMainContent(accessibleHtml)');
    expect(collapseIdx).toBeGreaterThan(-1);
    expect(rewrapIdx).toBeGreaterThan(collapseIdx);
  });
});
