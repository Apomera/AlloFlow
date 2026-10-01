// @vitest-environment jsdom
// "Peek the source of a remaining issue" without opening the preview (2026-06-21). Each remaining issue
// gets a 👁 Source button that shows the issue's source inline: the REAL HTML element (recovered from the
// stored remediated accessibleHtml via DOMParser + the same anchor-text search the preview-jump uses),
// else the pre-computed visible-text context (locator.before/snippet/after), else an honest page-level
// note. This pins the recovery logic (incl. the locator fail-safe contract: never guess) + the wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── mirror of _issueAnchor + _peekIssueSource ──
const issueAnchor = (issue) => {
  const loc = issue && issue.locator;
  if (loc && loc.kind === 'exact' && loc.snippet) return String(loc.snippet);
  const raw = issue && typeof issue.location === 'string' ? issue.location.trim() : '';
  if (!raw || /^document$/i.test(raw) || /^page\s+\d+$/i.test(raw)) return '';
  return raw;
};
const peekIssueSource = (issue, accessibleHtml) => {
  const loc = issue && issue.locator;
  const exact = !!(loc && loc.kind === 'exact' && loc.snippet);
  const anchor = issueAnchor(issue);
  const out = {
    exact,
    before: exact ? String(loc.before || '') : '',
    snippet: exact ? String(loc.snippet || '') : '',
    after: exact ? String(loc.after || '') : '',
    pages: (loc && Array.isArray(loc.pages) && loc.pages.length) ? loc.pages : null,
    rawLocation: (issue && typeof issue.location === 'string') ? issue.location.trim() : '',
    html: null,
  };
  if (anchor && anchor.length >= 8 && accessibleHtml && typeof DOMParser !== 'undefined') {
    try {
      const dom = new DOMParser().parseFromString(accessibleHtml, 'text/html');
      const norm = (x) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().toLowerCase();
      const needle = norm(anchor);
      if (needle && dom.body) {
        let found = null;
        const _INLINE = /^(STRONG|EM|B|I|U|SPAN|A|CODE|SMALL|SUB|SUP|MARK|ABBR|CITE|Q|S|DEL|INS|FONT|LABEL)$/;
        const w = dom.createTreeWalker(dom.body, NodeFilter.SHOW_TEXT, null);
        let node; while ((node = w.nextNode())) { if (norm(node.textContent).indexOf(needle) !== -1) {
          let el = node.parentElement;
          while (el && el.parentElement && el.parentElement !== dom.body && _INLINE.test(el.tagName)) el = el.parentElement;
          found = el; break;
        } }
        if (!found) { const blocks = dom.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,figcaption,blockquote,caption,a'); for (const b of blocks) { if (norm(b.textContent).indexOf(needle) !== -1) { found = b; break; } } }
        if (found && found.outerHTML) out.html = found.outerHTML.length > 4000 ? (found.outerHTML.slice(0, 4000) + '…') : found.outerHTML;
      }
    } catch (_) {}
  }
  return out;
};

const HTML = '<!DOCTYPE html><html lang="en"><head><title>Report</title></head><body><main>' +
  '<h1>Assessment Report</h1>' +
  '<p><strong>Background Information</strong></p>' +              // the "bold paragraph as heading" issue
  '<p>Some ordinary body paragraph of text in the document.</p>' +
  '<table><tr><td>Louise rarely completes seatwork</td></tr></table>' +
  '</main></body></html>';

describe('peek issue source — recover the real HTML element without the preview', () => {
  it('an EXACT locator recovers the real element outerHTML from the stored accessibleHtml', () => {
    const issue = { issue: 'Visual sub-headings use bold paragraph tags', wcag: '1.3.1', location: 'Background Information', locator: { kind: 'exact', snippet: 'Background Information', before: '', after: 'Some ordinary', pages: [1] } };
    const src = peekIssueSource(issue, HTML);
    expect(src.exact).toBe(true);
    expect(src.html).toBe('<p><strong>Background Information</strong></p>'); // the actual offending markup
    expect(src.snippet).toBe('Background Information');
    expect(src.pages).toEqual([1]);
  });

  it('finds an element via the block-element fallback (table cell text)', () => {
    const issue = { issue: 'table cell', wcag: '1.3.1', location: 'Louise rarely completes seatwork', locator: { kind: 'exact', snippet: 'Louise rarely completes seatwork', before: '', after: '', pages: [2] } };
    const src = peekIssueSource(issue, HTML);
    expect(src.html).toContain('<td>Louise rarely completes seatwork</td>');
  });

  it('a COARSE (page-level) issue shows no HTML — never guesses a spot (fail-safe contract)', () => {
    const issue = { issue: 'The data table is missing a caption', wcag: '1.3.1', location: 'the data table', locator: { kind: 'page', pages: [2], reason: 'ambiguous' } };
    const src = peekIssueSource(issue, HTML);
    expect(src.exact).toBe(false);
    expect(src.html).toBeNull();        // 'the data table' (14 chars) isn't a verbatim match → no element
    expect(src.pages).toEqual([2]);
    expect(src.rawLocation).toBe('the data table');
  });

  it('a document-level issue yields no anchor, no HTML (honest doc-level)', () => {
    const issue = { issue: 'Reading order', wcag: '1.3.2', location: 'document', locator: { kind: 'document', pages: [] } };
    const src = peekIssueSource(issue, HTML);
    expect(src.exact).toBe(false);
    expect(src.html).toBeNull();
    expect(issueAnchor(issue)).toBe('');
  });

  it('a too-short anchor (<8 chars) does not attempt a recovery (collision-safe)', () => {
    const issue = { issue: 'x', wcag: '1.1.1', location: 'a b', locator: { kind: 'page', pages: [1] } };
    expect(peekIssueSource(issue, HTML).html).toBeNull();
  });
});

describe('anti-drift: the Source peek is wired into the remaining-issues row', () => {
  it('the helper + the toggle state exist', () => {
    expect(viewSrc).toMatch(/const _peekIssueSource = \(issue\) => \{/);
    expect(viewSrc).toMatch(/const \[_issueSourceOpen, _setIssueSourceOpen\] = useState\(\{\}\)/);
  });
  it('every remaining issue renders a 👁 Source button that toggles the inline expand', () => {
    expect(viewSrc).toMatch(/onClick=\{\(\) => _setIssueSourceOpen\(prev => \(\{ \.\.\.prev, \[_srcKey\]: !prev\[_srcKey\] \}\)\)\}/);
    expect(viewSrc).toMatch(/👁 \{t\('pdf_audit\.issue\.source'\) \|\| 'Source'\}/);
  });
  it('the source renders as escaped text (pre / mark children), never dangerouslySetInnerHTML', () => {
    // the new source panel must not inject the recovered HTML as live markup
    expect(viewSrc).toMatch(/<pre className=[^>]*>\{_src\.html\}<\/pre>/);
    expect(viewSrc).not.toMatch(/dangerouslySetInnerHTML=\{\{ __html: _src\./);
  });
});
