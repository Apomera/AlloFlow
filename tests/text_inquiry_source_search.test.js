import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const searchClient = require('../text_inquiry/text_inquiry_search.js');
const html = fs.readFileSync('text_inquiry/text_inquiry.html', 'utf8');
const compromise = fs.readFileSync('vendor/compromise/compromise.js', 'utf8');
const sdk = fs.readFileSync('tool_integration_sdk.js', 'utf8');
const annotationBridge = fs.readFileSync('annotation_inquiry_bridge.js', 'utf8');
const core = fs.readFileSync('text_inquiry/text_inquiry_core.js', 'utf8');
const searchSource = fs.readFileSync('text_inquiry/text_inquiry_search.js', 'utf8');
const goldenConfidence = JSON.parse(fs.readFileSync('tests/fixtures/text_inquiry_source_confidence_golden.json', 'utf8'));

describe('Text Inquiry source discovery', () => {
  it('normalizes safe HTTP results and drops unsafe URLs', () => {
    const rows = searchClient.normalizeResults([
      { title: 'Good', link: 'https://example.org/source', snippet: 'A result.' },
      { title: 'Unsafe', link: 'javascript:alert(1)' },
      { title: 'Local', link: 'file:///secret.txt' },
    ], 'Serper');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Good', url: 'https://example.org/source', domain: 'example.org', source: 'Serper' });
  });

  it('builds trusted-source scope queries and labels recognized domains', () => {
    expect(searchClient.scopedQuery('The Yellow Wallpaper', 'libraries')).toContain('site:loc.gov');
    expect(searchClient.scopedQuery('The Yellow Wallpaper', 'libraries')).toContain('site:worldcat.org');
    expect(searchClient.preferredDomainFor('catalog.loc.gov')).toEqual({ recognized: true, label: 'Library of Congress' });
  });

  it('keeps confidence scoring calibrated across golden source cases', () => {
    for (const fixture of goldenConfidence) {
      const result = searchClient.assessConfidence(fixture.input);
      expect(result.level, fixture.name).toBe(fixture.expected.level);
      if (fixture.expected.minScore != null) expect(result.score, fixture.name).toBeGreaterThanOrEqual(fixture.expected.minScore);
      if (fixture.expected.score != null) expect(result.score, fixture.name).toBe(fixture.expected.score);
    }
  });

  it('uses the server-side search proxy without exposing a browser API key', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn(async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, source: 'Serper', results: [{ title: 'A source', url: 'https://example.org/a', snippet: 'Snippet.' }] }),
    }));
    global.fetch = fetchMock;
    try {
      const result = await searchClient.search('example source', { maxResults: 4 });
      expect(result.results).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toContain('q=example%20source');
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' });
      expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain('serperApiKey');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('verifies public metadata without sending entered source fields', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, cached: true, metadata: { title: 'A source', creator: 'A creator', date: '2026', canonicalUrl: 'https://example.org/canonical', publisher: 'Example Press', type: 'Book', doi: '10.1234/example', isbn: '9781234567890', signals: { jsonLd: true, citationMeta: true, canonical: true, doi: true, isbn: true } } }),
    }));
    global.fetch = fetchMock;
    try {
      const result = await searchClient.verifyMetadata('https://example.org/source');
      expect(result.metadata).toMatchObject({ title: 'A source', creator: 'A creator', date: '2026', publisher: 'Example Press', doi: '10.1234/example', isbn: '9781234567890' });
      expect(result.cached).toBe(true);
      expect(fetchMock.mock.calls[0][0]).toContain('/source-metadata?url=https%3A%2F%2Fexample.org%2Fsource');
      expect(String(fetchMock.mock.calls[0][0])).not.toContain('creator');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('renders candidates and fills source metadata after an explicit selection', async () => {
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://alloflow.test/text_inquiry/text_inquiry.html' });
    const { window } = dom;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.fetch = vi.fn(async (url) => {
      if (String(url).includes('/source-metadata')) return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, metadata: { title: 'The Yellow Wallpaper | Gutenberg', creator: 'Charlotte Perkins Gilman', date: '1892', canonicalUrl: 'https://www.gutenberg.org/ebooks/1952', publisher: 'Project Gutenberg', type: 'Book', signals: { jsonLd: true, citationMeta: true, canonical: true } } }),
      };
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, source: 'Serper', results: [{ title: 'The Yellow Wallpaper | Gutenberg', link: 'https://www.gutenberg.org/ebooks/1952', snippet: 'A public-domain record.' }] }),
      };
    });
    window.eval(compromise);
    window.eval(annotationBridge);
    window.eval(sdk);
    window.eval(core);
    window.eval(searchSource);
    const inline = Array.from(window.document.querySelectorAll('script')).at(-1).textContent;
    window.eval(inline);

    window.document.getElementById('sourceCreator').value = 'Charlotte Perkins Gilman';
    window.document.getElementById('sourceEdition').value = '1892';
    window.document.getElementById('sourceSearchQuery').value = 'The Yellow Wallpaper';
    window.document.getElementById('sourceSearchBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.document.querySelectorAll('#sourceSearchResults li')).toHaveLength(1);
    window.document.querySelector('#sourceSearchResults button').click();
    expect(window.document.getElementById('sourceUrl').value).toBe('https://www.gutenberg.org/ebooks/1952');
    expect(window.document.getElementById('sourceTitle').value).toContain('Yellow Wallpaper');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.document.getElementById('sourceVerification').hidden).toBe(false);
    expect(window.document.getElementById('citationOutput').value).toContain('gutenberg.org');
    expect(window.document.getElementById('sourceConfidenceLabel').textContent).toContain('High confidence');
    expect(window.document.getElementById('downloadCitationBtn').disabled).toBe(false);
    dom.window.close();
  });
});
