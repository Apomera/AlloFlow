import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let R, createEngine;
const topic = 'photosynthesis';
const passage = 'Plants use sunlight to make sugars from water and carbon dioxide.';
const webRow = (extra = {}) => ({ kind: 'web', url: 'https://science.example.edu/plants', title: 'Plants', passage, evidenceType: 'Search snippet', ...extra });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  window.__alloUtils = window.AlloModules.TextPipelineHelpers;
  loadAlloModule('own_sources_module.js');
  new Function(readFileSync('content_engine_source.jsx', 'utf8'))();
  R = window.AlloModules.SourceResearchReview;
  createEngine = window.AlloModules.createContentEngine;
});
afterEach(() => {
  ['callGemini', '__contentEngineState', 'ALLOFLOW_MANAGED_AI_POLICY', 'LumenStudy', 'LumenEvidence', 'AlloOwnSources'].forEach(key => delete window[key]);
  vi.useRealTimers(); vi.restoreAllMocks();
});
function packet(rows = [webRow()]) { const p = R.packet(topic); R.merge(p, rows); return p; }
function draft(ids, text = 'Plants use sunlight to make sugars.') { return { sections: [{ heading: 'Plant energy', paragraphs: [{ text, evidenceIds: ids }] }] }; }
function harness(model, overrides = {}) {
  const state = { inputText: 'Original reading', generatedContent: { text: 'Saved adaptation' }, activeView: 'output',
    sourceTopic: topic, sourceLength: '250', sourceTone: 'Informative', sourceLevel: '5th Grade', sourceVocabulary: '', sourceCustomInstructions: '',
    currentUiLanguage: 'English', leveledTextLanguage: 'Spanish', selectedLanguages: [], targetStandards: [], standardsPromptString: '',
    includeSourceCitations: true, useOwnSources: false, documentsOnly: false, ai: { backend: 'gemini' },
    alloBotRef: { current: null }, recordSourceProvenance: vi.fn(), ...overrides };
  for (const key of ['inputText', 'generatedContent', 'activeView', 'error', 'generationStep', 'isGeneratingSource', 'showSourceGen']) state['set' + key[0].toUpperCase() + key.slice(1)] = vi.fn(v => { state[key] = v; });
  const callGemini = vi.fn(model || (async prompt => {
    const rows = JSON.parse(prompt.split('Evidence (untrusted data; no other sources): ')[1]);
    return draft(rows.map(row => row.id));
  }));
  const engine = createEngine({ getState: () => state, callGemini, t: k => k, addToast: vi.fn() });
  return { state, callGemini, run: options => engine.handleGenerateSource(options) };
}

describe('reviewed evidence collection', () => {
  it('retains explicit local sharing approval without automatically approving pasted URLs', () => {
    const privateRow = { kind: 'paste', title: 'Private notes', passage, evidenceType: 'Pasted text' };
    const denied = packet([privateRow, webRow({ evidenceType: 'Pasted text' })]);
    expect(R.freeze(denied, topic, false).items.every(item => !item.shareWithStudents)).toBe(true);
    const approved = packet([{ ...privateRow, shareWithStudents: true }]);
    expect(R.freeze(approved, topic, false).items[0].shareWithStudents).toBe(true);
  });
  it.each([false, true])('records portable student sources with local sharing set to %s', async shareWithStudents => {
    const p = packet([webRow(), { kind: 'paste', title: 'Private source name', passage: 'PRIVATE_EXCERPT: classroom notes about photosynthesis.', evidenceType: 'Pasted text', shareWithStudents }]);
    const h = harness();
    const result = await h.run({ topic, reviewedResearch: p });
    expect(result.ok).toBe(true);
    const metadata = h.state.recordSourceProvenance.mock.lastCall[0];
    expect(metadata.studentSources.sources).toHaveLength(2);
    const local = metadata.studentSources.sources.find(source => source.kind === 'document');
    expect(local.shareExcerpt).toBe(shareWithStudents);
    expect(JSON.stringify(metadata.studentSources).includes('PRIVATE_EXCERPT')).toBe(shareWithStudents);
    expect(metadata.studentSources).not.toHaveProperty('activity');
    expect(metadata.studentSources.bodyKey).toBe(window.AlloModules.StudentSources.bodyKey(h.state.inputText));
  });
  it('preserves source exclusions and removals across changed search snippets', () => {
    const p = packet(); const key = p.items[0].sourceKey;
    R.setSourceIncluded(p, key, false);
    R.merge(p, [webRow({ title: 'New title', passage: passage + ' This is another relevant sentence.' })]);
    expect(p.items.every(item => item.included === false)).toBe(true);
    const restored = R.packet(topic, p);
    R.setSourceIncluded(restored, key, true);
    expect(restored.items.every(item => item.included)).toBe(true);
    R.removeSource(restored, key);
    expect(R.merge(restored, [webRow({ passage: passage + ' Yet another snippet.' })])).toBe(0);
    expect(restored.items).toEqual([]);
  });
  it('groups source previews as excerpts linked to original evidence', () => {
    const p = packet([webRow(), webRow({ passage: passage + ' The sugars store energy.' })]);
    const groups = R.groupSources(p);
    expect(groups).toHaveLength(1);
    expect(groups[0].claims.every(claim => claim.evidenceIds.length === 1 && p.items.some(item => item.id === claim.evidenceIds[0] && item.passage.includes(claim.text)))).toBe(true);
    expect(groups[0].summary).toContain(passage);
  });
  it('selects relevant exact passages near the end of long multilingual pages without growing the evidence budget', () => {
    const body = ('Navigation and other unrelated material.\n').repeat(160) + '\nCloud formation happens when water vapor cools and condenses. Clouds contain tiny water droplets.\n' + '\n\u96f2\u306f\u6c34\u84b8\u6c17\u304c\u51b7\u3048\u3066\u5c0f\u3055\u306a\u6c34\u6ef4\u306b\u306a\u308b\u3053\u3068\u3067\u3067\u304d\u307e\u3059\u3002\u96f2\u306e\u5f62\u6210\u306b\u306f\u51dd\u7e2e\u304c\u95a2\u308f\u308a\u307e\u3059\u3002';
    const selected = R.selectPassages(body, 'Cloud formation', 3);
    expect(selected.length).toBeLessThanOrEqual(3);
    expect(selected.some(item => item.passage.includes('water vapor cools'))).toBe(true);
    expect(selected.every(item => item.passage.length <= 1200 && body.includes(item.passage))).toBe(true);
    const japanese = R.selectPassages(body, '\u96f2\u306e\u5f62\u6210', 3);
    expect(japanese.some(item => item.passage.includes('\u96f2'))).toBe(true);
    expect(japanese.every(item => body.includes(item.passage))).toBe(true);
  });
  it('keeps page navigation out of relevant paragraph previews and preserves exact source offsets', () => {
    const cloudFacts = 'Cloud formation begins when moist air rises and cools. Water vapor condenses into small droplets.';
    const moreFacts = 'Cloud formation can occur near mountains where the land pushes moist air upward.';
    const body = '  ' + 'Navigation and unrelated page links. '.repeat(150) + '\r\n\r\n  ' + cloudFacts + '\r\n \r\n' + moreFacts + '  ';
    const selected = R.selectPassages(body, 'Cloud formation', 3);
    expect(selected.map(item => item.passage)).toEqual([cloudFacts, moreFacts]);
    for (const item of selected) {
      const [, start, end] = item.locatorLabel.match(/Characters (\d+)-(\d+)/);
      expect(body.slice(Number(start) - 1, Number(end))).toBe(item.passage);
      expect(item.passage.length).toBeLessThanOrEqual(1200);
    }
    const p = R.packet('Cloud formation');
    R.merge(p, selected.map(item => webRow(item)));
    const preview = R.groupSources(p)[0];
    expect(preview.summary).toContain(cloudFacts);
    expect(preview.summary).not.toContain('Navigation');
    expect(preview.claims.every(claim => !claim.text.includes('Navigation'))).toBe(true);
  });
  it('deduplicates discoveries without re-including excluded passages', () => {
    const p = packet(); p.items[0].included = false;
    expect(R.merge(p, [webRow()])).toBe(0);
    expect(R.packet(topic, p).items[0].included).toBe(false);
    expect(R.packet('different topic', p).items).toEqual([]);
  });
  it('reports mutually exclusive collection outcomes while preserving numeric merge results', () => {
    const capped = index => webRow({ url: 'https://example.edu/capped', passage: passage + ' Capped excerpt ' + index + '.' });
    const removed = webRow({ url: 'https://example.edu/removed' });
    const p = packet([webRow(), ...Array.from({ length: 4 }, (_, index) => capped(index)), removed]);
    R.removeSource(p, R.sourceKey(removed));
    p.items[0].included = false;
    const outcome = R.createOutcome();
    expect(R.merge(p, [webRow(), removed, capped(4), webRow({ url: 'javascript:alert(1)' }),
      webRow({ url: 'https://example.edu/new' }), webRow({ url: 'https://example.edu/link', passage: '' })], outcome)).toBe(2);
    expect(outcome).toEqual({ version: 1, attempted: 6, added: 2, duplicate: 1, removed: 1, reviewLimit: 0, sourceLimit: 1, invalid: 1, linkOnly: 1 });
    expect(p.items[0].included).toBe(false);
    expect(p.items.at(-1).included).toBe(false);
    expect(p.items.some(item => item.sourceKey === R.sourceKey(removed))).toBe(false);
    expect(p).not.toHaveProperty('collectionOutcome');
  });
  it('accumulates capacity outcomes across merges without counting skipped rows as additions', () => {
    const p = packet(Array.from({ length: 23 }, (_, index) => webRow({ url: 'https://example.edu/existing-' + index })));
    const outcome = R.createOutcome();
    expect(R.merge(p, [webRow({ url: 'https://example.edu/final' })], outcome)).toBe(1);
    expect(R.merge(p, [webRow({ url: 'https://example.edu/overflow-a' }), webRow({ url: 'https://example.edu/overflow-b' }), p.items[0]], outcome)).toBe(0);
    expect(outcome).toEqual({ version: 1, attempted: 4, added: 1, duplicate: 1, removed: 0, reviewLimit: 2, sourceLimit: 0, invalid: 0, linkOnly: 0 });
    expect(p.items).toHaveLength(24);
    expect(R.createOutcome()).toEqual({ version: 1, attempted: 0, added: 0, duplicate: 0, removed: 0, reviewLimit: 0, sourceLimit: 0, invalid: 0, linkOnly: 0 });
  });
  it('classifies malformed entries without losing valid evidence in the same batch', () => {
    const p = packet([]), outcome = R.createOutcome();
    expect(R.merge(p, [null, undefined, 'not a source', webRow({ url: 'https://user:secret@example.edu' }), webRow()], outcome)).toBe(1);
    expect(outcome).toMatchObject({ attempted: 5, added: 1, invalid: 4, linkOnly: 0 });
    expect(p.items).toHaveLength(1);
  });
  it('bounds evidence, retains passage types, and treats link-only results as excluded', () => {
    const p = packet(Array.from({ length: 30 }, (_, i) => webRow({ title: 'Source ' + i, url: 'https://example.edu/' + i, passage: i ? 'x'.repeat(1400) : '' })));
    expect(p.items).toHaveLength(24);
    expect(p.items[0].included).toBe(false);
    expect(p.items[1].passage).toHaveLength(1200);
    expect(p.activity[0].type).toBe('limit');
  });
  it.each(['javascript:alert(1)', 'https://user:password@example.edu'])('rejects unsafe citation URL %s', url => {
    expect(packet([webRow({ url })]).items).toEqual([]);
  });
  it('rejects a changed topic and an empty selection', () => {
    expect(() => R.freeze(packet(), 'new topic')).toThrow(/topic changed/);
    const p = packet(); p.items[0].included = false;
    expect(() => R.freeze(p, topic)).toThrow(/at least one/);
  });
  it('renders citations only through approved IDs and canonical URLs', () => {
    const p = packet([webRow(), { kind: 'paste', title: 'My notes', passage }]);
    const result = R.render(draft(p.items.map(row => row.id)), p.items);
    expect(result.text).toContain('[⁽¹⁾](https://science.example.edu/plants)');
    expect(result.text).toContain('[Your document 1]');
    expect(result.citedIds).toHaveLength(2);
    expect(() => R.render(draft(['invented']), p.items)).toThrow(/outside your selection/);
    expect(() => R.render(draft([], 'Read https://invented.test/'), p.items)).toThrow(/unsupported link/);
    expect(() => R.render(draft([], 'x'.repeat(6001)), p.items)).toThrow(/oversized/);
    expect(() => R.render(draft([]), p.items)).toThrow(/did not cite any/);
  });
  it.each([false, true])('shares a pasted URL bibliography name only with approval %s', shareWithStudents => {
    const p = packet([webRow({ title: 'PRIVATE_SOURCE_NAME', evidenceType: 'Pasted text', shareWithStudents })]);
    const result = R.render(draft(p.items.map(row => row.id)), p.items);
    expect(result.text.includes('PRIVATE')).toBe(shareWithStudents);
    expect(result.text).toContain(shareWithStudents ? '[PRIVATE\\_SOURCE\\_NAME]' : '[Teacher-provided source]');
    expect(p.items[0].title).toBe('PRIVATE_SOURCE_NAME');
  });
  it.each([false, true])('uses an allowed same-URL bibliography title regardless of private row order %s', privateFirst => {
    const privateRow = webRow({ title: 'PRIVATE_SOURCE_NAME', evidenceType: 'Pasted text', passage: 'Private notes about how plants make their food.' });
    const publicRow = webRow({ title: 'Public plant facts', evidenceType: 'Page excerpt' });
    const p = packet(privateFirst ? [privateRow, publicRow] : [publicRow, privateRow]);
    const result = R.render(draft(p.items.map(row => row.id)), p.items);
    expect(result.text).toContain('[Public plant facts]');
    expect(result.text).not.toContain('PRIVATE');
    expect(result.webSourceCount).toBe(1);
    expect(p.items.find(row => row.evidenceType === 'Pasted text').title).toBe('PRIVATE_SOURCE_NAME');
  });
});

describe('research actions', () => {
  it('reports partial pasted additions without putting action counters in evidence or student metadata', async () => {
    const url = 'https://example.edu/pasted';
    const p = packet(Array.from({ length: 3 }, (_, index) => webRow({ url, passage: passage + ' Existing passage ' + index + '.' })));
    const body = ['Photosynthesis provides plants with chemical energy stored in sugars.',
      'Photosynthesis uses chlorophyll to capture energy from sunlight.',
      'Photosynthesis consumes water and carbon dioxide in plants.'].join('\n\n');
    expect(R.selectPassages(body, topic, 3)).toHaveLength(3);
    const h = harness();
    const result = await h.run({ researchAction: 'paste', url, title: 'Pasted plant facts', passage: body, researchPacket: p });
    expect(result.ok).toBe(true);
    expect(result.collectionOutcome).toEqual({ version: 1, attempted: 3, added: 1, duplicate: 0, removed: 0, reviewLimit: 0, sourceLimit: 2, invalid: 0, linkOnly: 0 });
    expect(result.packet.items).toHaveLength(4);
    expect(result.packet).not.toHaveProperty('collectionOutcome');
    expect(result.packet.items.every(item => !Object.hasOwn(item, 'collectionOutcome'))).toBe(true);
    expect(h.callGemini).not.toHaveBeenCalled();
    const written = await h.run({ reviewedResearch: result.packet });
    expect(written.ok).toBe(true);
    expect(h.callGemini.mock.lastCall[0]).not.toContain('collectionOutcome');
    expect(JSON.stringify(h.state.recordSourceProvenance.mock.lastCall[0].studentSources)).not.toContain('collectionOutcome');
  });
  it('reports repeated pasted passages as duplicates, not capacity failures', async () => {
    const h = harness();
    const first = await h.run({ researchAction: 'paste', title: 'Plant facts', passage });
    const repeated = await h.run({ researchAction: 'paste', title: 'Plant facts', passage, researchPacket: first.packet });
    expect(first.collectionOutcome).toMatchObject({ attempted: 1, added: 1, duplicate: 0 });
    expect(repeated.collectionOutcome).toEqual({ version: 1, attempted: 1, added: 0, duplicate: 1, removed: 0, reviewLimit: 0, sourceLimit: 0, invalid: 0, linkOnly: 0 });
    expect(repeated.packet.items).toHaveLength(1);
  });
  it('aggregates prepare outcomes from documents, search results, and supplied URLs', async () => {
    const doc = { id: 'notes', title: 'Field notes', version: 1, allowAI: true };
    window.AlloOwnSources = { ensureLumen: async () => true, readLibrary: async () => ({ ok: true, sources: [doc] }), loadProject: async () => ({ sources: [doc] }) };
    window.LumenEvidence = { createProjectStore: () => ({}), retrieve: () => [{ node: { id: 'notes-p1', sourceId: 'notes', content: 'PRIVATE_DOCUMENT_SENTINEL: Plants need light to make sugars.' } }] };
    const searchTopic = vi.fn(async () => ({ results: [{ title: 'Plants', url: 'https://example.edu/a', snippet: passage }] }));
    window.LumenStudy = { firstPartyFetchWebSource: vi.fn(async (_, url) => ({ title: 'Plants', url, text: passage })) };
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic } });
    const result = await h.run({ researchAction: 'prepare', includeDocuments: true, includeWeb: true, selectedOwnSourceIds: ['notes'],
      researchConfig: { version: 1, enabled: true, mode: 'combined', urls: ['https://example.edu/a', 'https://example.edu/b'] } });
    expect(result.ok).toBe(true);
    expect(result.collectionOutcome).toEqual({ version: 1, attempted: 4, added: 3, duplicate: 1, removed: 0, reviewLimit: 0, sourceLimit: 0, invalid: 0, linkOnly: 0 });
    expect(result.packet.items).toHaveLength(3);
    expect(result.packet).not.toHaveProperty('collectionOutcome');
    expect(JSON.stringify(searchTopic.mock.calls)).not.toContain('PRIVATE_DOCUMENT_SENTINEL');
    expect(h.callGemini).not.toHaveBeenCalled();
  });
  it('retains prepare outcomes and collected evidence when a later supplied URL fails', async () => {
    window.LumenStudy = { firstPartyFetchWebSource: vi.fn().mockResolvedValueOnce({ title: 'Plants', url: 'https://example.edu/a', text: passage })
      .mockRejectedValueOnce(new Error('Reader unavailable')) };
    const result = await harness().run({ researchAction: 'prepare', includeWeb: false,
      researchConfig: { version: 1, enabled: true, mode: 'sources', urls: ['https://example.edu/a', 'https://example.edu/b'] } });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Reader unavailable');
    expect(result.collectionOutcome).toEqual({ version: 1, attempted: 1, added: 1, duplicate: 0, removed: 0, reviewLimit: 0, sourceLimit: 0, invalid: 0, linkOnly: 0 });
    expect(result.packet.items).toHaveLength(1);
    expect(result.packet).not.toHaveProperty('collectionOutcome');
  });
  it('selects bounded passages from long pasted material as one source', async () => {
    const h = harness();
    const pasted = 'Unrelated opening text and navigation. '.repeat(80) + passage + ' Photosynthesis uses sunlight to make food. '.repeat(90);
    const result = await h.run({ researchAction: 'paste', title: 'Long notes', passage: pasted });
    expect(result.ok).toBe(true);
    expect(result.packet.items.length).toBeLessThanOrEqual(3);
    expect(result.packet.items.every(item => item.passage.length <= 1200 && pasted.includes(item.passage))).toBe(true);
    expect(R.groupSources(result.packet)).toHaveLength(1);
    expect(result.packet.items.some(item => item.passage.includes('Photosynthesis'))).toBe(true);
    expect(h.callGemini).not.toHaveBeenCalled();
  });
  it('uses the explicit public query and retains earlier selections when adding search results', async () => {
    const search = vi.fn(async () => ({ results: [{ title: 'New source', url: 'https://science.example.edu/new', snippet: passage }] }));
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic: search } });
    const old = packet(); old.items[0].included = false;
    const result = await h.run({ researchAction: 'search', includeWeb: true, query: topic, researchPacket: old });
    expect(result.ok).toBe(true); expect(result.packet.items).toHaveLength(2);
    expect(result.packet.items[0].included).toBe(false);
    expect(search).toHaveBeenCalledWith(topic, 10);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(h.state.inputText).toBe('Original reading');
  });
  it('researches arbitrary explicit topics without sending private lesson context', async () => {
    const search = vi.fn(async () => ({ results: [{ url: 'https://example.edu/clouds', title: 'Clouds', snippet: passage }] }));
    const h = harness(null, { webSearchProvider: { _isCanvas: true, publicSearchQuery: () => '', searchTopic: search }, sourceCustomInstructions: 'PRIVATE_STUDENT_CONTEXT' });
    const result = await h.run({ researchAction: 'search', includeWeb: true, query: 'How clouds form', researchPacket: packet() });
    expect(result.ok).toBe(true); expect(search).toHaveBeenCalledWith('How clouds form', 10);
    expect(JSON.stringify(search.mock.calls)).not.toContain('PRIVATE_STUDENT_CONTEXT');
  });
  it.each(['AI', 'R', '\u03c0'])('allows the short deliberate topic %s', async query => {
    const searchTopic = vi.fn(async () => ({ results: [{ url: 'https://example.edu/subject', title: query, snippet: passage }] }));
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic } });
    const result = await h.run({ researchAction: 'search', includeWeb: true, query });
    expect(result.ok).toBe(true); expect(searchTopic).toHaveBeenCalledWith(query, 10);
  });
  it('distinguishes native AI-supported notes from retrieved page excerpts', async () => {
    const h = harness(async () => ({ groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.edu', title: 'Linked' } }, { web: { uri: 'https://example.edu/empty', title: 'Link only' } }], groundingSupports: [{ groundingChunkIndices: [0], segment: { text: passage } }], webSearchQueries: ['public biology'] } }));
    const result = await h.run({ researchAction: 'prepare', includeWeb: true });
    expect(result.packet.items[0].evidenceType).toBe('Source-linked AI note');
    expect(result.packet.items[0].passage).toBe(passage);
    expect(result.packet.items[1].included).toBe(false);
    expect(h.callGemini.mock.calls[0][4]).toBe(topic);
  });
  it('adds a safe reader excerpt or preserves the collection on failure', async () => {
    window.LumenStudy = { firstPartyFetchWebSource: vi.fn(async () => ({ title: 'Page', url: 'https://example.edu', text: passage })) };
    const h = harness();
    const result = await h.run({ researchAction: 'url', url: 'https://example.edu', researchPacket: packet() });
    expect(result.packet.items[1].evidenceType).toBe('Page excerpt');
    window.LumenStudy.firstPartyFetchWebSource.mockRejectedValue(new Error('Reader unavailable'));
    const failure = await h.run({ researchAction: 'url', url: 'https://example.edu', researchPacket: result.packet });
    expect(failure.ok).toBe(false); expect(failure.packet.items).toHaveLength(2);
  });
  it('retains exclusion when a fragment URL redirects to another canonical page', async () => {
    window.LumenStudy = { firstPartyFetchWebSource: async () => ({ title: 'Final page', url: 'https://example.edu/final', text: passage }) };
    const p = packet([webRow({ url: 'https://example.edu/original#section' })]);
    R.setSourceIncluded(p, p.items[0].sourceKey, false);
    const result = await harness().run({ researchAction: 'url', url: 'https://example.edu/original#section', researchPacket: p });
    expect(result.ok).toBe(true); expect(result.packet.items.every(item => !item.included)).toBe(true);
  });
  it('honors managed search policy without blocking local pasted evidence', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, allowExternalSearch: false };
    window.LumenStudy = { firstPartyFetchWebSource: vi.fn() };
    const h = harness();
    expect((await h.run({ researchAction: 'url', url: 'https://example.edu' })).ok).toBe(false);
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
    expect((await h.run({ researchAction: 'paste', passage, title: 'Notes' })).ok).toBe(true);
  });
  it('times out a stalled discovery without losing existing passages', async () => {
    vi.useFakeTimers();
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic: () => new Promise(() => {}) } });
    const operation = h.run({ researchAction: 'search', includeWeb: true, researchPacket: packet() });
    await vi.advanceTimersByTimeAsync(60001);
    const result = await operation;
    expect(result.error).toMatch(/timed out/); expect(result.packet.items).toHaveLength(1);
  });
  it('discards a cancelled discovery result', async () => {
    const d = deferred(); let current = true;
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic: () => d.promise } });
    const operation = h.run({ researchAction: 'search', includeWeb: true, isCurrent: () => current });
    current = false; d.resolve({ results: [] });
    expect(await operation).toEqual({ ok: false, cancelled: true });
  });
  it('reports missing document evidence instead of pretending retrieval succeeded', async () => {
    window.AlloOwnSources = { ensureLumen: async () => true, readLibrary: async () => ({ ok: true, sources: [{ id: 'notes', version: 1 }] }), loadProject: async () => null };
    const h = harness();
    const result = await h.run({ researchAction: 'documents', includeDocuments: true, selectedOwnSourceIds: ['notes'], researchPacket: packet() });
    expect(result.ok).toBe(false); expect(result.error).toMatch(/No document passages/);
    expect(result.packet.items).toHaveLength(1); expect(h.callGemini).not.toHaveBeenCalled();
  });
});

describe('writing from the approved collection', () => {
  it('keeps an unshared pasted URL title in the teacher report but out of student text', async () => {
    const p = packet([webRow({ title: 'PRIVATE_SOURCE_NAME', passage: 'PRIVATE_EXCERPT: Plants need sunlight.', evidenceType: 'Pasted text' })]);
    const h = harness();
    const result = await h.run({ reviewedResearch: p });
    expect(result.ok).toBe(true);
    expect(result.report.supplied[0].title).toBe('PRIVATE_SOURCE_NAME');
    expect(result.report.supplied[0].passage).toContain('PRIVATE_EXCERPT');
    const metadata = h.state.recordSourceProvenance.mock.lastCall[0];
    const studentText = window.AlloModules.StudentSources.publicText(h.state.inputText, metadata.studentSources);
    expect(studentText).toContain('[Teacher-provided source]');
    expect(studentText).not.toContain('PRIVATE');
  });
  it('uses saved pasted material for sources-only quick writing without a document library', async () => {
    delete window.AlloOwnSources;
    const h = harness();
    const result = await h.run({ researchPacket: packet([{ kind: 'paste', title: 'Notes', passage }]),
      researchConfig: { version: 1, enabled: true, mode: 'sources', urls: [], reviewBeforeWriting: false }, selectedOwnSourceIds: [] });
    expect(result.ok).toBe(true); expect(result.report.supplied[0].kind).toBe('paste');
    expect(h.callGemini).toHaveBeenCalledTimes(1); expect(h.callGemini.mock.calls[0][2]).toBe(false);
  });
  it('retains explicitly kept web evidence in sources-only mode without discovering additional sources', async () => {
    const searchTopic = vi.fn();
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic } });
    const result = await h.run({ researchPacket: packet(), selectedOwnSourceIds: [],
      researchConfig: { version: 1, enabled: true, mode: 'sources', urls: [], reviewBeforeWriting: false } });
    expect(result.ok).toBe(true); expect(result.report.supplied).toHaveLength(1);
    expect(searchTopic).not.toHaveBeenCalled(); expect(h.callGemini.mock.calls[0][2]).toBe(false);
  });
  it('omits stale document selections when the configured mode uses only the web', async () => {
    const h = harness();
    const result = await h.run({ reviewedResearch: packet([webRow(), { kind: 'document', sourceId: 'old-document', title: 'OLD_DOCUMENT', passage: 'PRIVATE_OLD_DOCUMENT_CONTENT_ONLY', version: 1 }]),
      researchConfig: { version: 1, enabled: true, mode: 'web', urls: [] }, selectedOwnSourceIds: [] });
    expect(result.ok).toBe(true); expect(result.report.supplied).toHaveLength(1);
    expect(h.callGemini.mock.calls[0][0]).not.toContain('PRIVATE_OLD_DOCUMENT');
  });
  it('collects supplied URLs and synthesizes with discovery off and no summary model calls', async () => {
    window.LumenStudy = { firstPartyFetchWebSource: vi.fn(async () => ({ title: 'Clouds', url: 'https://example.edu/clouds', text: passage })) };
    const searchTopic = vi.fn();
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic } });
    const result = await h.run({ researchConfig: { version: 1, enabled: true, mode: 'sources', urls: ['https://example.edu/clouds'], reviewBeforeWriting: false, exactQuotes: false }, selectedOwnSourceIds: [] });
    expect(result.ok).toBe(true);
    expect(searchTopic).not.toHaveBeenCalled();
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.callGemini.mock.calls[0][0]).toContain('Write an educational reading');
    expect(h.callGemini.mock.calls[0][2]).toBe(false);
    expect(result.report.supplied[0].evidenceType).toBe('Page excerpt');
  });
  it('combines retrieved documents and web passages without adding documents to discovery queries', async () => {
    const doc = { id: 'notes', title: 'Field notes', version: 1, allowAI: true };
    window.AlloOwnSources = { ensureLumen: async () => true, readLibrary: async () => ({ ok: true, sources: [doc] }), loadProject: async () => ({ sources: [doc] }) };
    window.LumenEvidence = { createProjectStore: () => ({}), retrieve: () => [{ node: { id: 'notes-p1', sourceId: 'notes', content: 'PRIVATE_DOCUMENT_SENTINEL: Plants need light to make sugars.' } }] };
    const searchTopic = vi.fn(async () => ({ results: [{ title: 'Plant science', url: 'https://example.edu/plants', snippet: passage }] }));
    const h = harness(null, { webSearchProvider: { _isCanvas: true, searchTopic } });
    const result = await h.run({ researchConfig: { version: 1, enabled: true, mode: 'combined', urls: [], reviewBeforeWriting: false }, selectedOwnSourceIds: ['notes'] });
    expect(result.ok).toBe(true); expect(result.report.supplied.map(item => item.kind)).toEqual(['document', 'web']);
    expect(searchTopic).toHaveBeenCalledWith(topic, 10);
    expect(JSON.stringify(searchTopic.mock.calls)).not.toContain('PRIVATE_DOCUMENT_SENTINEL');
    expect(h.callGemini).toHaveBeenCalledTimes(1); expect(h.callGemini.mock.calls[0][2]).toBe(false);
    expect(h.callGemini.mock.calls[0][0]).toContain('PRIVATE_DOCUMENT_SENTINEL');
  });
  it('defers writing when configured review is required', async () => {
    window.LumenStudy = { firstPartyFetchWebSource: vi.fn(async () => ({ title: 'Clouds', url: 'https://example.edu/clouds', text: passage })) };
    const h = harness();
    const result = await h.run({ researchConfig: { version: 1, enabled: true, mode: 'sources', urls: ['https://example.edu/clouds'], reviewBeforeWriting: true }, selectedOwnSourceIds: [] });
    expect(result.ok).toBe(true); expect(result.needsReview).toBe(true);
    expect(h.callGemini).not.toHaveBeenCalled(); expect(h.state.inputText).toBe('Original reading');
  });
  it('supports exact quotes from explicitly supplied web pages', async () => {
    const p = packet();
    const h = harness(async () => ({ excerpts: [{ evidenceId: p.items[0].id, quote: passage }] }));
    const result = await h.run({ reviewedResearch: p, researchConfig: { version: 1, enabled: true, mode: 'sources', urls: [], exactQuotes: true } });
    expect(result.ok).toBe(true); expect(result.report.citedIds).toEqual([p.items[0].id]);
    expect(h.state.inputText).toContain(passage); expect(h.callGemini.mock.calls[0][2]).toBe(false);
  });
  it('never supplies excluded evidence or performs a fresh search, and records supplied/cited passages', async () => {
    const p = packet([webRow(), webRow({ title: 'EXCLUDED_SENTINEL', passage: 'SECRET_EXCLUDED_PASSAGE_ONLY', url: 'https://excluded.test', included: false }), { kind: 'paste', title: 'Teacher notes', passage }]);
    const h = harness();
    const result = await h.run({ reviewedResearch: p });
    expect(result.ok).toBe(true);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    const [prompt, json, search] = h.callGemini.mock.calls[0];
    expect(json).toBe(true); expect(search).toBe(false);
    expect(prompt).not.toContain('EXCLUDED'); expect(prompt).not.toContain('excluded.test');
    expect(prompt).toContain('"language":"English"');
    expect(result.report.supplied).toHaveLength(2); expect(result.report.citedIds).toHaveLength(2);
    expect(h.state.inputText).toContain('#allo-doc-');
    expect(h.state.inputText).toContain('Search snippet (cited)');
    expect(h.state.generatedContent).toBeNull();
    expect(h.state.recordSourceProvenance.mock.calls[0][0].researchEvidence).toEqual(result.report);
  });
  it.each(['unknown-id', 'invalid-json', 'empty'])('preserves the current reading on %s without automatic retries', async failure => {
    const h = harness(async () => failure === 'unknown-id' ? draft(['bad']) : failure === 'empty' ? { sections: [] } : '{incomplete');
    const result = await h.run({ reviewedResearch: packet() });
    expect(result.ok).toBe(false); expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.state.inputText).toBe('Original reading'); expect(h.state.generatedContent).toEqual({ text: 'Saved adaptation' });
    expect(h.state.isGeneratingSource).toBe(false);
  });
  it.each(['changed', 'permission', 'removed', 'deselected'])('rechecks %s documents before writing', async change => {
    const doc = { kind: 'document', title: 'Notes', passage, sourceId: 'doc', version: 1 };
    window.AlloOwnSources = { readLibrary: async () => ({ ok: true, sources: change === 'removed' ? [] : [{ id: 'doc', version: change === 'changed' ? 2 : 1, allowAI: change !== 'permission' }] }) };
    const h = harness();
    const result = await h.run({ reviewedResearch: packet([doc]), selectedOwnSourceIds: change === 'deselected' ? [] : ['doc'] });
    expect(result.ok).toBe(false); expect(h.callGemini).not.toHaveBeenCalled();
  });
  it('documents-only accepts exact quotes and never supplies web passages', async () => {
    const h = harness(async prompt => { expect(prompt).not.toContain('WEB_SENTINEL'); return { excerpts: [{ document: 1, quote: passage }] }; });
    const result = await h.run({ reviewedResearch: packet([webRow({ passage: 'WEB_SENTINEL excluded in exact excerpt mode' }), { kind: 'paste', title: 'Notes', passage }]), documentsOnly: true });
    expect(result.ok).toBe(true); expect(result.report.citedIds).toHaveLength(1);
    expect(h.state.inputText).toContain(passage); expect(h.callGemini.mock.calls[0][2]).toBe(false);
    loadAlloModule('instructional_context_module.js');
    const body = window.AlloModules.InstructionalContext.extractMeasurableSourceBody(h.state.inputText);
    expect(body).not.toContain('Research Review'); expect(body).not.toContain('document(s) supplied');
  });
  it('rejects rewritten exact excerpts', async () => {
    const h = harness(async () => ({ excerpts: [{ document: 1, quote: 'An invented passage that did not appear in the selected document.' }] }));
    expect((await h.run({ reviewedResearch: packet([{ kind: 'paste', title: 'Notes', passage }]), documentsOnly: true })).ok).toBe(false);
    expect(h.state.inputText).toBe('Original reading');
  });
  it('does not publish a late draft after the review closes or changes topic', async () => {
    const d = deferred(); const p = packet(); let current = true;
    const h = harness(() => d.promise);
    const operation = h.run({ reviewedResearch: p, isCurrent: () => current });
    current = false; d.resolve(draft([p.items[0].id]));
    expect(await operation).toEqual({ ok: false, cancelled: true });
    expect(h.state.inputText).toBe('Original reading'); expect(h.state.isGeneratingSource).toBe(false);
  });
  it('times out a stalled writer and ignores its later reply', async () => {
    vi.useFakeTimers(); const d = deferred(); const p = packet();
    const h = harness(() => d.promise); const operation = h.run({ reviewedResearch: p });
    await vi.advanceTimersByTimeAsync(120001);
    expect((await operation).error).toMatch(/timed out/);
    d.resolve(draft([p.items[0].id])); await Promise.resolve();
    expect(h.state.inputText).toBe('Original reading'); expect(h.state.isGeneratingSource).toBe(false);
  });
});
