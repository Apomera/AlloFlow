import { describe, it, expect, vi } from 'vitest';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';
import * as StudyMod from '../stem_lab/stem_lumen_study.js';

const E = EvidenceMod.default || EvidenceMod;
const Study = StudyMod.default || StudyMod;

function longPage(label = 'Photosynthesis') {
  return `${label} is explained in this public educational article. The page provides enough readable source text for Lumen to create multiple evidence passages, preserve the original wording, and support later questions with exact excerpts. It also includes examples and a concise conclusion for learners.`;
}

describe('Lumen web discovery URL boundary', () => {
  it('canonicalizes public URLs and removes fragments and common tracking parameters', () => {
    expect(E.canonicalWebUrl('https://Example.org/article?utm_source=test&id=7#section')).toBe('https://example.org/article?id=7');
    expect(E.canonicalWebUrl('http://example.org/path?fbclid=abc')).toBe('http://example.org/path');
  });

  it('rejects credentials, unsafe schemes, localhost and private network targets', () => {
    for (const value of [
      'javascript:alert(1)', 'file:///etc/passwd', 'https://user:pass@example.org/private',
      'http://localhost:3000', 'http://127.0.0.1/admin', 'http://10.2.3.4/',
      'http://172.20.1.1/', 'http://192.168.0.5/', 'http://169.254.169.254/latest/meta-data'
    ]) expect(E.canonicalWebUrl(value)).toBe('');
  });
});

describe('Lumen discovery candidate contract', () => {
  it('normalizes, de-duplicates and caps search results without treating snippets as source content', () => {
    const raw = {
      source: 'Serper',
      results: [
        { url: 'https://example.org/a?utm_source=x', title: 'Source A', snippet: 'Search preview A' },
        { url: 'https://example.org/a', title: 'Duplicate A', snippet: 'Duplicate preview' },
        { url: 'https://example.org/b', title: 'Source B', snippet: 'Search preview B' },
        { url: 'http://localhost/private', title: 'Unsafe', snippet: 'Must be removed' }
      ]
    };
    const candidates = E.normalizeDiscoveryResults(raw, 'reading research', '2026-07-16T12:00:00Z');
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ title: 'Source A', url: 'https://example.org/a', searchProvider: 'Serper', searchRank: 1, status: 'candidate' });
    expect(candidates[0]).not.toHaveProperty('content');
    expect(candidates[0].queryHash).not.toContain('reading research');
  });

  it('accepts Gemini-compatible grounding chunks as discovery metadata', () => {
    const candidates = E.normalizeDiscoveryResults({
      groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.edu/report', title: 'Research report' } }] }
    }, 'research report');
    expect(candidates).toMatchObject([{ title: 'Research report', url: 'https://example.edu/report' }]);
  });

  it('requires full readable page text before creating a source spec', () => {
    const candidate = E.normalizeDiscoveryResults([{ url: 'https://example.org/article', title: 'Public article', snippet: 'A short search snippet' }], 'topic')[0];
    expect(() => E.discoveryCandidateToSourceSpec(candidate, candidate.snippet, '2026-07-16T12:00:00Z')).toThrow(/enough readable page text/i);

    const spec = E.discoveryCandidateToSourceSpec(candidate, `Source: https://example.org/article\n\n${longPage()}`, '2026-07-16T12:00:00Z');
    expect(spec).toMatchObject({ type: 'url', importMethod: 'web-discovery', locator: 'https://example.org/article', discoveredBy: 'web-search' });
    expect(spec.content).not.toContain('Source: https://');
    expect(spec.content).toContain('Photosynthesis');
  });

  it('binds imported full text into the ordinary local retrieval and citation pipeline', () => {
    const candidate = E.normalizeDiscoveryResults([{ url: 'https://example.org/article', title: 'Public article' }], 'chlorophyll')[0];
    const spec = E.discoveryCandidateToSourceSpec(candidate, longPage('Chlorophyll'), '2026-07-16T12:00:00Z');
    let project = E.makeProject({ id: 'discover-project', now: '2026-07-16T12:00:00Z' });
    project = E.upsertSource(project, spec);
    expect(project.sources[0]).toMatchObject({ id: spec.id, canonicalUrl: 'https://example.org/article', searchProvider: 'web-search' });
    expect(E.retrieve(project, 'What does the chlorophyll article explain?')[0].node.sourceId).toBe(spec.id);
  });
});

describe('Lumen Study discovery orchestration', () => {
  it('uses an injected provider-neutral search adapter and returns normalized candidates', async () => {
    const searchWeb = vi.fn(async query => ({ source: 'TestSearch', results: [{ url: 'https://example.org/source', title: 'A source', snippet: query }] }));
    const result = await Study.searchWeb({ searchWeb }, '  vocabulary instruction  ');
    expect(searchWeb).toHaveBeenCalledWith('vocabulary instruction', expect.objectContaining({ task: 'lumen-source-discovery' }));
    expect(result.candidates).toMatchObject([{ title: 'A source', searchProvider: 'TestSearch' }]);
  });

  it('falls back to grounded Gemini search metadata when no direct search adapter is present', async () => {
    const callGemini = vi.fn(async () => ({ groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.org/fallback', title: 'Fallback source' } }] } }));
    const result = await Study.searchWeb({ callGemini }, 'evidence based practice');
    expect(callGemini).toHaveBeenCalledWith(expect.stringContaining('evidence based practice'), false, true, 0.2);
    expect(result.candidates[0].title).toBe('Fallback source');
  });

  it('fetches full text through an injected importer and strips transport provenance preambles', async () => {
    const fetchWebSource = vi.fn(async () => ({ text: `Source: https://example.org/page\n\n${longPage('Vocabulary')}` }));
    const text = await Study.fetchDiscoveredSource({ fetchWebSource }, { url: 'https://example.org/page' });
    expect(fetchWebSource).toHaveBeenCalledWith('https://example.org/page');
    expect(text).toContain('Vocabulary');
    expect(text).not.toContain('Source: https://');
  });

  it('preserves a validated final redirect URL and fetch timestamp for source provenance', async () => {
    const fetchedAt = '2026-07-16T19:30:00.000Z';
    const snapshot = await Study.fetchDiscoveredSource({
      fetchWebSource: async () => ({
        text: longPage('Redirected source'), url: 'https://publisher.example/article#section', fetchedAt
      })
    }, { url: 'https://short.example/go', title: 'Search result title' }, { withMetadata: true });
    expect(snapshot).toMatchObject({
      url: 'https://publisher.example/article', title: 'Search result title', fetchedAt
    });
    expect(snapshot.text).toContain('Redirected source');
  });

  it('posts canonical URLs to the authenticated first-party importer', async () => {
    const fetch = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ url: 'https://example.org/page', title: 'Page', text: longPage('First party') })
    }));
    const getFunctionSecurityHeaders = vi.fn(async () => ({ Authorization: 'Bearer test', 'X-Firebase-AppCheck': 'app-check' }));
    const result = await Study.firstPartyFetchWebSource({
      sourceFetchProxyUrl: 'https://functions.example/api/sourceFetchProxy', fetch, getFunctionSecurityHeaders
    }, 'https://example.org/page?utm_source=test#section');
    expect(result.text).toContain('First party');
    expect(fetch).toHaveBeenCalledWith('https://functions.example/api/sourceFetchProxy', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test', 'X-Firebase-AppCheck': 'app-check' }),
      body: JSON.stringify({ url: 'https://example.org/page' })
    }));
  });

  it('uses a configured legacy importer only when the first-party route is unavailable', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ error: 'not-found' }) }));
    const fetchAndCleanUrl = vi.fn(async () => longPage('Legacy fallback'));
    const text = await Study.fetchDiscoveredSource({
      sourceFetchProxyUrl: '/api/sourceFetchProxy', fetch, fetchAndCleanUrl
    }, { url: 'https://example.org/page' });
    expect(text).toContain('Legacy fallback');
    expect(fetchAndCleanUrl).toHaveBeenCalledTimes(1);
  });

  it('does not bypass a first-party safety rejection through a legacy importer', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: 'blocked-target' }) }));
    const fetchAndCleanUrl = vi.fn(async () => longPage('Must not run'));
    await expect(Study.fetchDiscoveredSource({
      sourceFetchProxyUrl: '/api/sourceFetchProxy', fetch, fetchAndCleanUrl
    }, { url: 'https://example.org/page' })).rejects.toThrow(/private, local or reserved network/i);
    expect(fetchAndCleanUrl).not.toHaveBeenCalled();
  });

  it('enforces a separate discovery cooldown and twelve-search session ceiling', () => {
    expect(Study.checkSearchAllowance({ count: 0, lastAt: 0 }, 10_000).ok).toBe(true);
    expect(Study.checkSearchAllowance({ count: 1, lastAt: 10_000 }, 10_500)).toMatchObject({ ok: false, reason: 'cooldown' });
    expect(Study.checkSearchAllowance({ count: 12, lastAt: 0 }, 20_000)).toMatchObject({ ok: false, reason: 'session-limit' });
  });

  it('records imported source IDs without retaining the raw discovery query', () => {
    const project = E.recordStudyEvent(E.makeProject({ id: 'audit' }), {
      action: 'web-source-import', outcome: 'imported', sourceIds: ['src_web_1'],
      questionHash: E.hashString('private discovery query'), question: 'private discovery query'
    });
    expect(project.audit.at(-1)).toMatchObject({ action: 'web-source-import', sourceIds: ['src_web_1'] });
    expect(JSON.stringify(project.audit)).not.toContain('private discovery query');
  });
});
