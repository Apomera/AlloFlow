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
  ['callGemini', '__contentEngineState', 'ALLOFLOW_MANAGED_AI_POLICY', 'LumenStudy', 'AlloOwnSources'].forEach(key => delete window[key]);
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
  it('deduplicates discoveries without re-including excluded passages', () => {
    const p = packet(); p.items[0].included = false;
    expect(R.merge(p, [webRow()])).toBe(0);
    expect(R.packet(topic, p).items[0].included).toBe(false);
    expect(R.packet('different topic', p).items).toEqual([]);
  });
  it('bounds evidence, retains passage types, and treats link-only results as excluded', () => {
    const p = packet(Array.from({ length: 30 }, (_, i) => webRow({ title: 'Source ' + i, passage: i ? 'x'.repeat(1400) : '' })));
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
});

describe('research actions', () => {
  it('uses the explicit public query and retains earlier selections when adding search results', async () => {
    const search = vi.fn(async () => ({ results: [{ title: 'New source', url: 'https://science.example.edu/new', snippet: passage }] }));
    const h = harness(null, { webSearchProvider: { _isCanvas: true, publicSearchQuery: q => q === topic, search } });
    const old = packet(); old.items[0].included = false;
    const result = await h.run({ researchAction: 'search', includeWeb: true, query: topic, researchPacket: old });
    expect(result.ok).toBe(true); expect(result.packet.items).toHaveLength(2);
    expect(result.packet.items[0].included).toBe(false);
    expect(search).toHaveBeenCalledWith(topic, 10, topic);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(h.state.inputText).toBe('Original reading');
  });
  it('does not send an unsupported query to the bridge', async () => {
    const search = vi.fn(); const h = harness(null, { webSearchProvider: { _isCanvas: true, publicSearchQuery: () => '', search } });
    const result = await h.run({ researchAction: 'search', includeWeb: true, query: 'private notes', researchPacket: packet() });
    expect(result.ok).toBe(false); expect(result.error).toMatch(/supported public topic/);
    expect(result.packet.items).toHaveLength(1); expect(search).not.toHaveBeenCalled();
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
    const h = harness(null, { webSearchProvider: { _isCanvas: true, search: () => new Promise(() => {}) } });
    const operation = h.run({ researchAction: 'search', includeWeb: true, researchPacket: packet() });
    await vi.advanceTimersByTimeAsync(60001);
    const result = await operation;
    expect(result.error).toMatch(/timed out/); expect(result.packet.items).toHaveLength(1);
  });
  it('discards a cancelled discovery result', async () => {
    const d = deferred(); let current = true;
    const h = harness(null, { webSearchProvider: { _isCanvas: true, search: () => d.promise } });
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
