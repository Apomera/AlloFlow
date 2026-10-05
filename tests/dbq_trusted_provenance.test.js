import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const dispatcher = fs.readFileSync('generate_dispatcher_source.jsx', 'utf8');
const start = dispatcher.indexOf('             // Unique ids, honest excerpt kinds');
const end = dispatcher.indexOf('             metaInfo =', start);
const normalize = new Function('content', '_dbqSourceRecords', '_dbqRequestedCount', '_dbqFocusTopic', '_dbqMode', '_dbqUrl', dispatcher.slice(start, end) + '\nreturn content;');
const safeUrl = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } };
const reading = { id: 'reading', title: 'Supplied reading', source: 'Author/date not recorded', url: '', text: 'The river flows through the town.', origin: 'supplied' };
const view = fs.readFileSync('view_dbq_source.jsx', 'utf8');
const helpers = view.slice(view.indexOf('function dbqPrintSourceUrl'), view.indexOf('// Generated excerpts'));
const trustedUrl = new Function(helpers + '\nreturn dbqTrustedSourceUrl;')();
describe('DBQ captured source provenance', () => {
  it('rejects generated original links, dates and factual titles and discloses one-source excerpts', () => {
    const result = normalize({ documents: [{ id: 'A', title: '2026 proclamation', source: 'Mayor, 2026', date: '2026', excerpt: reading.text, excerptKind: 'verbatim', sourceUrl: 'https://invented.example/doc' }, { id: 'B', excerpt: 'An adaptation' }] }, [reading], 2, '', 'standard', safeUrl);
    expect(result.documents[0]).toMatchObject({ sourceUrl: '', date: '', title: 'Document A: Supplied reading', excerptKind: 'verbatim', sameSourceExcerpts: true });
    expect(result.documentCount).toEqual({ requested: 2, actual: 2, distinctSources: 1 });
    expect(trustedUrl(result.documents[0])).toBe('');
  });
  it('verifies quotation only against the matched source and preserves trusted retrieved links', () => {
    const web = { id: 'web-0', title: 'Archive record', source: 'Archive record; date unknown', url: 'https://archive.example/record', text: 'A short preview.', origin: 'retrieved' };
    const result = normalize({ documents: [{ id: 'A', excerpt: reading.text, excerptKind: 'verbatim', sourceUrl: web.url }] }, [reading, web], 1, '', 'search', safeUrl);
    expect(result.documents[0].excerptKind).toBe('reconstructed');
    expect(trustedUrl(result.documents[0])).toBe(web.url);
    expect(trustedUrl({ sourceUrl: web.url })).toBe('');
  });
  it('keeps exact custom text and caps documents with valid references', () => {
    const result = normalize({ documents: [{ id: 'A', excerpt: 'model changed it', sourceUrl: 'https://invented.example' }, { id: 'B', excerpt: 'extra' }], corroborationClaims: [{ supportingDocs: ['A', 'B'] }] }, [reading], 1, '', 'custom', safeUrl);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].excerpt).toBe(reading.text);
    expect(result.documents[0].excerptKind).toBe('verbatim');
    expect(result.corroborationClaims[0].supportingDocs).toEqual(['A']);
  });
});
