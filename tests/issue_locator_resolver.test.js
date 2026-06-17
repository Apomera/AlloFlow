// Deterministic issue-locator resolver (2026-06-16). The AI auditor emits a "location" anchor per
// remaining issue; _resolveIssueLocator turns it into a routable pointer (snippet + before/after
// window) so a fix/UI can jump to the exact spot. THE critical property: it claims precision
// ('exact') ONLY on an exactly-one verbatim match — zero or multiple matches degrade to the coarse
// 'page' tier, so it fails SAFE (loses precision) and never fails WRONG (points at the wrong node).
// Callers normalize the haystack ONCE via _normLocatorText and pass the result in.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _normLocatorText(s) {');
const end = src.indexOf('\nvar createDocPipeline', start);
if (start === -1 || end === -1) throw new Error('extraction markers missing');
const { _resolveIssueLocator, _normLocatorText } =
  new Function(src.slice(start, end) + '\n; return { _resolveIssueLocator, _normLocatorText };')();

// helper: callers always pass a pre-normalized haystack
const R = (loc, html, pages) => _resolveIssueLocator(loc, _normLocatorText(html), pages);

const HTML = '<main><h2>Clarifying the objectives of the interview</h2><p>Some unique body sentence here.</p><h2>Interview stages</h2><p>repeated phrase</p><p>repeated phrase</p></main>';

describe('_resolveIssueLocator — exact tier (unique verbatim anchor)', () => {
  it('a unique verbatim anchor resolves to kind "exact" with a snippet + before/after window', () => {
    const loc = R('Clarifying the objectives of the interview', HTML, [2]);
    expect(loc.kind).toBe('exact');
    expect(loc.snippet.toLowerCase()).toContain('clarifying the objectives');
    expect(typeof loc.textOffset).toBe('number');
    expect('before' in loc && 'after' in loc).toBe(true);
    expect(loc.pages).toEqual([2]);
  });

  it('matching is markup- and case/whitespace-insensitive (inline tags joined, normalized)', () => {
    const messy = '<p>Some   <b>unique</b>\n body   sentence here.</p>';
    expect(R('SOME unique body sentence', messy, []).kind).toBe('exact');
  });
});

describe('_resolveIssueLocator — FAILS SAFE, never wrong', () => {
  it('an AMBIGUOUS anchor (>1 occurrence) degrades to coarse "page", does NOT pick one', () => {
    const loc = R('repeated phrase', HTML, [5]);
    expect(loc.kind).toBe('page');
    expect(loc.reason).toBe('ambiguous');
    expect(loc.pages).toEqual([5]);
  });

  it('a NOT-FOUND anchor (paraphrase / drift) degrades to coarse, never invents a position', () => {
    expect(R('a description the model paraphrased', HTML, [3]).reason).toBe('not-found');
  });

  it('a too-short anchor is not trusted (collision risk)', () => {
    expect(R('alt', HTML, []).reason).toBe('anchor-too-short');
  });

  it('a phrase that straddles TWO block elements does NOT forge a phantom "exact" (review finding)', () => {
    // tag-stripping must not bridge separate <td>s into one contiguous match
    const loc = R('Total Score column', '<td>Total Score</td><td>column header</td>', []);
    expect(loc.kind).toBe('page');
    // but a phrase WITHIN one cell still resolves exactly
    expect(R('Total Score column data', '<td>Total Score column data</td>', []).kind).toBe('exact');
  });

  it('a pathological run of unescaped "<" resolves promptly, no O(n²) hang (review finding)', () => {
    const hay = '<p>find this unique sentence</p>' + '<'.repeat(40000);
    const t0 = Date.now();
    const loc = R('find this unique sentence', hay, [1]);
    expect(Date.now() - t0).toBeLessThan(2000); // bounded regex + single normalization
    expect(loc.kind).toBe('exact');
  });
});

describe('_resolveIssueLocator — coarse tiers', () => {
  it('"page N" → page tier', () => {
    expect(R('page 4', HTML, []).pages).toEqual([4]);
  });
  it('"document" → document tier; null/empty → none', () => {
    expect(R('document', HTML, []).kind).toBe('document');
    expect(R(null, HTML, []).kind).toBe('none');
    expect(R('', HTML, []).kind).toBe('none');
  });
});

describe('anti-drift: wired into both audit paths + verbatim prompt', () => {
  it('the LOCATION prompt demands a verbatim snippet', () => {
    expect(src).toContain('VERBATIM snippet copied character-for-character');
  });
  it('both audit paths normalize ONCE then attach iss.locator', () => {
    expect((src.match(/_normLocatorText\(htmlContent\)/g) || []).length).toBe(2);
    expect((src.match(/iss\.locator = _resolveIssueLocator\(iss\.location, _nh(?:Merged)?, iss\.pages\)/g) || []).length).toBe(2);
  });
});
