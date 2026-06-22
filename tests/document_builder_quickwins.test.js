// Document Builder quick-win fixes (2026-06-21, from the wihg9guy3 review). Honesty + resilience +
// generated-doc accessibility: the "Verified Sources" overclaim, the x.com over-reject dropping legit
// ed domains, the safeJsonParse-undefined Dialogue break, the unguarded section fallback losing whole
// docs, the literal-t() quiz aria-label, and the generated-doc html lang following the UI not the content
// language. This pins the behavioral logic that changed + anti-drift on the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ce = readFileSync(resolve(process.cwd(), 'content_engine_source.jsx'), 'utf8');
const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// ── x.com host-anchored reject (mirror of the new pattern) ──
const X_REJECT = /\/\/(?:[^/]*\.)?(?:twitter|x)\.com(?:[/:?#]|$)/i;
describe('source filter: x.com is host-anchored (no longer eats phoenix.com / netflix.com)', () => {
  it('rejects the real X/Twitter host (+ subdomains)', () => {
    expect(X_REJECT.test('https://x.com/someuser')).toBe(true);
    expect(X_REJECT.test('https://twitter.com/x')).toBe(true);
    expect(X_REJECT.test('https://www.x.com/')).toBe(true);
    expect(X_REJECT.test('https://mobile.twitter.com/a')).toBe(true);
  });
  it('does NOT reject legitimate education domains that merely END in x.com', () => {
    expect(X_REJECT.test('https://www.phoenix.com/courses')).toBe(false); // University of Phoenix
    expect(X_REJECT.test('https://netflix.com/title')).toBe(false);
    expect(X_REJECT.test('https://essex.com/research')).toBe(false);
  });
});

// ── bibliography honesty (mirror of the changed generateBibliographyString) ──
const bib = (chunks, title) => {
  const t = title || 'Referenced Sources';
  if (!chunks || !chunks.length) return '';
  const caveat = 'These sources were surfaced by AI-assisted search and have not been independently verified — confirm each one before citing it.';
  let out = '\n\n### ' + t + '\n\n*' + caveat + '*\n\n';
  chunks.forEach((c, i) => { out += (i + 1) + '. [' + ((c.web && c.web.title) || 'Unknown Source') + '](' + ((c.web && c.web.uri) || '#') + ')\n\n'; });
  return out;
};
describe('bibliography honesty: no "Verified Sources" overclaim; carries a verify-before-citing caveat', () => {
  it('the default title is "Referenced Sources", never "Verified Sources"', () => {
    const out = bib([{ web: { title: 'A', uri: 'https://a.org' } }]);
    expect(out).toContain('### Referenced Sources');
    expect(out).not.toContain('Verified Sources');
  });
  it('every auto-bibliography includes the unverified caveat', () => {
    const out = bib([{ web: { title: 'A', uri: 'https://a.org' } }], 'Source Text References');
    expect(out).toMatch(/have not been independently verified/);
    expect(out).toContain('### Source Text References'); // explicit title still honored
  });
  it('empty grounding → empty string (no stray heading/caveat)', () => {
    expect(bib([])).toBe('');
  });
});

describe('anti-drift: content_engine quick-wins shipped', () => {
  it('safeJsonParse is shimmed from window.__alloUtils (unblocks Dialogue mode)', () => {
    expect(ce).toMatch(/var safeJsonParse = window\.__alloUtils && window\.__alloUtils\.safeJsonParse;/);
  });
  it('the x.com reject is host-anchored in the source', () => {
    expect(ce).toMatch(/\/\\\/\\\/\(\?:\[\^\/\]\*\\\.\)\?\(\?:twitter\|x\)\\\.com/);
    expect(ce).not.toMatch(/\/twitter\\\.com\|x\\\.com\/i/); // old unanchored pattern gone
  });
  it('generateBibliographyString defaults to Referenced Sources + adds the caveat', () => {
    expect(ce).toMatch(/title = title \|\| 'Referenced Sources';/);
    expect(ce).toMatch(/sources_unverified_note/);
    expect(ce).not.toMatch(/title = title \|\| 'Verified Sources';/);
  });
  it('the no-grounding section fallback is wrapped so one failure no longer aborts the whole doc', () => {
    expect(ce).toMatch(/} catch \(fallbackErr\) \{/);
    expect(ce).toMatch(/_sectionFailures\+\+;/);
    expect(ce).toMatch(/could not be generated \(the AI service was rate-limited\)/);
  });
});

describe('anti-drift: generated-document accessibility fixes (doc_pipeline) + host', () => {
  it('the generated doc html lang follows the CONTENT language, not the UI language (WCAG 3.1.1)', () => {
    expect(pipe).toMatch(/\}\)\[leveledTextLanguage \|\| currentUiLanguage\] \|\| 'en'\}" dir=/);
  });
  it('the generated quiz radio no longer ships a literal t() aria-label (the <label> names it)', () => {
    expect(pipe).not.toMatch(/<input aria-label=\{t\('common\.text_field'\)\} type="radio"/);
    expect(pipe).toMatch(/: `<input type="radio" name="q_\$\{item\.id\}/);
  });
  it('the host bibliography wrapper default is aligned to Referenced Sources', () => {
    expect(anti).toMatch(/title = 'Referenced Sources'\) => \{/);
    expect(anti).not.toMatch(/title = 'Verified Sources'\) => \{/);
  });
});
