import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
const foundationStart = source.indexOf('function fixLandmarkFoundations(html) {');
const foundationEnd = source.indexOf('\n}', foundationStart) + 2;
if (foundationStart < 0 || foundationEnd < 2) throw new Error('Foundation helper boundary missing');
const foundations = new Function(source.slice(foundationStart, foundationEnd) + '\nreturn fixLandmarkFoundations;')();
const toolStart = source.indexOf('    fix_title: {');
const toolEnd = source.indexOf('    fix_lang: {', toolStart);
if (toolStart < 0 || toolEnd < toolStart) throw new Error('Explicit title repair boundary missing');
const fixTitle = new Function('return ({' + source.slice(toolStart, toolEnd) + '});')().fix_title.fn;
const preflightStart = source.indexOf('        // 4. Ensure <title> is non-empty');
const preflightEnd = source.indexOf('        // 5. Ensure all tables have scope', preflightStart);
if (preflightStart < 0 || preflightEnd < preflightStart) throw new Error('Primary title preflight boundary missing');
const preflight = new Function('accessibleHtml', '_fileName', 'let aiFixCount = 0;\n' + source.slice(preflightStart, preflightEnd) + '\nreturn accessibleHtml;');

// The alternative requested-foundation mode uses the same live inventory to decide
// whether a title is missing; exercise both paths with the real helper dependencies.
const extract = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start) + endMarker.length;
  if (start < 0 || end < endMarker.length) throw new Error('Foundation title extraction boundary missing');
  return source.slice(start, end);
};
const structuralCode = extract('function _headingOutlineIssue(html) {', '\n}')
  + extract('var _alloStructuralFoundations = function (html) {', '\n};')
  + extract('var _alloFixStructuralFoundations = function (html, options) {', '\n};');
const structural = new Function(structuralCode + '\nreturn { inventory: _alloStructuralFoundations, fix: _alloFixStructuralFoundations };')();

const sourceTitle = 'Declaración Universal de Derechos Humanos';
const oldTitle = 'Accessible Document — ohchr-udhr-spanish';
const metadata = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="Original author"><style id="source-style">p{color:#111827}</style><script type="application/ld+json">{"name":"Original metadata"}</script>';
const documentFor = title => '<!doctype html><html lang="es"><head>' + metadata + title + '</head><body><a href="#main-content">Skip to main content</a><main id="main-content"><h1>' + sourceTitle + '</h1><p>Source paragraph remains unchanged.</p></main></body></html>';
const inspect = html => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const result = { titleCount: doc.head.querySelectorAll('title').length, title: doc.title, titleLang: doc.head.querySelector('title')?.getAttribute('lang'), rootLang: doc.documentElement.lang, injected: !!doc.head.querySelector('[name="injected"]') };
  dom.window.close();
  return result;
};
const assertMetadata = html => {
  expect(html).toContain(metadata);
  expect(html).toContain('<p>Source paragraph remains unchanged.</p>');
};

// Actual Spanish calibration repair added lang="en" to the existing title. The
// next foundation pass mistook it for an absent title and appended a second one.
describe('attributed document titles survive deterministic remediation', () => {
  it.each(['<title lang="en">' + oldTitle + '</title>', '<TITLE lang=\'en\' data-note="A > B">' + oldTitle + '</TITLE>'])('foundation pass preserves an existing attributed title: %s', title => {
    const html = documentFor(title);
    const result = foundations(html);
    expect(result).toBe(html);
    expect(inspect(result)).toMatchObject({ titleCount: 1, title: oldTitle, titleLang: 'en' });
    expect(foundations(result)).toBe(result);
  });

  it('still derives one title when none exists, preserving unrelated head metadata', () => {
    const result = foundations(documentFor(''));
    expect(inspect(result)).toMatchObject({ titleCount: 1, title: sourceTitle });
    assertMetadata(result);
  });

  it.each(['<title lang="en">' + oldTitle + '</title>', '<TITLE lang=\'en\' data-source="original">' + oldTitle + '</TITLE>'])('explicit repair replaces the attributed title without retaining its stale language: %s', title => {
    const result = fixTitle(documentFor(title), { title: sourceTitle });
    expect(inspect(result)).toMatchObject({ titleCount: 1, title: sourceTitle, titleLang: null, rootLang: 'es' });
    assertMetadata(result);
  });

  it('treats replacement title content as literal text and cannot inject head metadata', () => {
    const literal = 'A & B </title><meta name="injected" content="yes"> $& <draft>';
    const result = fixTitle(documentFor('<title lang="en">' + oldTitle + '</title>'), { title: literal });
    expect(inspect(result)).toMatchObject({ titleCount: 1, title: literal, titleLang: null, injected: false });
    expect(result).toContain('&amp;');
    expect(result).toContain('&lt;/title&gt;');
    assertMetadata(result);
  });

  it('primary title preflight recognizes a nonempty attributed title', () => {
    const html = documentFor('<title lang="en">' + oldTitle + '</title>');
    const result = preflight(html, 'ohchr-udhr-spanish.pdf');
    expect(result).toBe(html);
    expect(inspect(result).titleCount).toBe(1);
  });

  it('explicit repair followed by repeated foundation passes keeps one effective title', () => {
    const result = foundations(foundations(fixTitle(documentFor('<title lang="en">' + oldTitle + '</title>'), { title: sourceTitle })));
    expect(inspect(result)).toMatchObject({ titleCount: 1, title: sourceTitle, titleLang: null });
    assertMetadata(result);
  });
});


describe('alternative structural-title mode recognizes existing attributes', () => {
  it.each(['<title lang="es">' + sourceTitle + '</title>', '<TITLE lang=\'es\' data-note="A > B">' + sourceTitle + '</TITLE>'])('inventory and requested fix preserve %s', title => {
    const html = documentFor(title);
    const inventory = structural.inventory(html).items.find(item => item.id === 'page-title');
    const result = structural.fix(html, { foundationIds: ['page-title'] });
    expect({ status: inventory.status, changed: result.changed, titleCount: inspect(result.html).titleCount })
      .toEqual({ status: 'passed', changed: false, titleCount: 1 });
    expect(result.html).toBe(html);
    expect(result.changedFoundationIds).toEqual([]);
    expect(result.remainingIds).toEqual([]);
    expect(structural.fix(result.html, { foundationIds: ['page-title'] }).html).toBe(html);
    assertMetadata(result.html);
  });
});
