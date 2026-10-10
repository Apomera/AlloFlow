import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let R, createEngine;
const id = 'AbCdEfGhI_1';
const canonical = 'https://www.youtube.com/watch?v=' + id;
const shortUrl = 'https://youtu.be/' + id + '?t=42';
const topic = 'photosynthesis';
const transcript = 'Plants use sunlight to make sugars from water and carbon dioxide. Photosynthesis stores light energy in chemical bonds.';
const response = (extra = {}) => ({ status: 'ok', title: 'How plants grow', transcript, ...extra });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const webRow = (extra = {}) => ({ kind: 'web', url: canonical, title: 'Plant science', passage: transcript, evidenceType: 'Search snippet', ...extra });

beforeEach(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  window.__alloUtils = window.AlloModules.TextPipelineHelpers;
  loadAlloModule('own_sources_module.js');
  new Function(readFileSync('content_engine_source.jsx', 'utf8'))();
  R = window.AlloModules.SourceResearchReview;
  createEngine = window.AlloModules.createContentEngine;
  window.LumenStudy = { firstPartyFetchWebSource: vi.fn(async () => ({ title: 'Page', url: 'https://example.edu/plants', text: transcript })) };
});

afterEach(() => {
  ['callGemini', '__contentEngineState', 'ALLOFLOW_MANAGED_AI_POLICY', 'LumenStudy', 'AlloOwnSources', '__alloStudentAiDisabled', '_alloQrBlocked'].forEach(key => delete window[key]);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function packet(rows = []) { const p = R.packet(topic); R.merge(p, rows); return p; }
function harness(model = async () => response(), overrides = {}) {
  const state = {
    inputText: 'PRIVATE_READING', generatedContent: { text: 'Saved adaptation' }, activeView: 'output',
    sourceTopic: topic, sourceLength: '250', sourceTone: 'Informative', sourceLevel: '5th Grade', sourceVocabulary: 'PRIVATE_VOCABULARY',
    sourceCustomInstructions: 'PRIVATE_STUDENT_CONTEXT', currentUiLanguage: 'English', leveledTextLanguage: 'Spanish',
    selectedLanguages: [], targetStandards: [], standardsPromptString: 'PRIVATE_STANDARD', includeSourceCitations: true,
    useOwnSources: false, documentsOnly: false, ai: { backend: 'gemini' }, alloBotRef: { current: null }, recordSourceProvenance: vi.fn(), ...overrides
  };
  for (const key of ['inputText', 'generatedContent', 'activeView', 'error', 'generationStep', 'isGeneratingSource', 'showSourceGen']) state['set' + key[0].toUpperCase() + key.slice(1)] = vi.fn(value => { state[key] = value; });
  const callGemini = vi.fn(model);
  callGemini._alloflowVideoInput = true;
  const engine = createEngine({ getState: () => state, callGemini, t: key => key, addToast: vi.fn() });
  return { state, callGemini, run: options => engine.handleGenerateSource(options) };
}

describe('research YouTube addresses', () => {
  it.each([
    canonical,
    'https://youtube.com/watch?v=' + id + '&list=playlist&t=19',
    'https://m.youtube.com/watch?v=' + id,
    'https://www.youtube.com/shorts/' + id,
    'https://www.youtube.com/embed/' + id,
    'https://youtube.com/live/' + id + '#chapter',
    shortUrl,
    'http://youtu.be/' + id
  ])('canonicalizes supported video address %s', url => {
    expect(R.videoUrl(url)).toBe(canonical);
    expect(R.sourceKey(webRow({ url }))).toBe(R.sourceKey(webRow()));
  });

  it.each([
    'https://youtube.com.evil.test/watch?v=' + id,
    'https://notyoutube.com/watch?v=' + id,
    'https://youtu.be.evil.test/' + id,
    'https://evil.test/?url=https://youtube.com/watch?v=' + id,
    'https://user:password@youtube.com/watch?v=' + id,
    'https://youtube.com:8443/watch?v=' + id,
    'javascript:https://youtube.com/watch?v=' + id,
    'https://youtube.com/playlist?list=PL123456789',
    'https://youtube.com/watch?v=short',
    'https://youtube.com/watch?v=' + id + 'too-long',
    'https://youtube.com/watch?v=' + id + '&v=ZyXwVuTsR_2',
    'https://youtube.com/watch?v=' + id + '%0A',
    'https://youtu.be/' + id + '/extra',
    'https://youtube.com/shorts/' + id + '/extra'
  ])('does not treat malformed or lookalike address as video %s', url => {
    expect(R.videoUrl(url)).toBe('');
  });
});

describe('research YouTube transcription', () => {
  it('uses the selected Gemini media transport without sending private context or a search query', async () => {
    const h = harness();
    const result = await h.run({ researchAction: 'url', url: shortUrl, topic: 'PRIVATE_TOPIC_SENTINEL' });
    expect(result.ok).toBe(true);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    const args = h.callGemini.mock.calls[0];
    expect(args[1]).toBe(true);
    expect(args[2]).toBe(false);
    expect(args[3]).toBe(0.1);
    expect(args[4]).toBeNull();
    expect(args[5]).toHaveProperty('aborted', false);
    expect(args[8]).toEqual({ videoUrl: canonical });
    expect(args[0]).not.toContain('PRIVATE_');
    expect(args[0]).toMatch(/spoken|speech|transcript/i);
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
    expect(result.packet.items).toHaveLength(1);
    expect(result.packet.items[0]).toMatchObject({ kind: 'web', url: canonical, evidenceType: 'AI video transcript', included: true, shareWithStudents: true });
    expect(result.packet.items[0].passage).toBe(transcript);
    expect(h.state.inputText).toBe('PRIVATE_READING');
  });

  it('continues to read ordinary webpages without invoking video transcription', async () => {
    const h = harness();
    const result = await h.run({ researchAction: 'url', url: 'https://example.edu/plants' });
    expect(result.ok).toBe(true);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(window.LumenStudy.firstPartyFetchWebSource).toHaveBeenCalledTimes(1);
    expect(result.packet.items[0].evidenceType).toBe('Page excerpt');
  });

  it.each(['local', 'ollama', 'openai'])('requires Gemini when the selected backend is %s', async backend => {
    const h = harness(undefined, { ai: { backend } });
    const result = await h.run({ researchAction: 'url', url: canonical });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Gemini/i);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it('honors current transport metadata over stale Gemini state', async () => {
    const h = harness();
    h.callGemini._alloflowBackend = 'local';
    expect((await h.run({ researchAction: 'url', url: canonical })).ok).toBe(false);
    expect(h.callGemini).not.toHaveBeenCalled();
  });

  it('rejects older transports that cannot attach a video', async () => {
    const h = harness();
    delete h.callGemini._alloflowVideoInput;
    expect((await h.run({ researchAction: 'url', url: canonical })).ok).toBe(false);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it.each([
    { version: 1, allowExternalSearch: false },
    { version: 1, allowExternalSearch: true },
    { version: 2, allowExternalSearch: true }
  ])('does not bypass managed media restrictions for %j', async policy => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy;
    const h = harness();
    const result = await h.run({ researchAction: 'url', url: canonical });
    expect(result.ok).toBe(false);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it.each(['__alloStudentAiDisabled', '_alloQrBlocked', 'studentAiFeaturesHidden'])('honors the live %s guard', async guard => {
    const h = harness(undefined, guard === 'studentAiFeaturesHidden' ? { studentAiFeaturesHidden: true } : {});
    if (guard === '_alloQrBlocked') h.callGemini._alloQrBlocked = true;
    else if (guard !== 'studentAiFeaturesHidden') window[guard] = true;
    expect((await h.run({ researchAction: 'url', url: canonical })).ok).toBe(false);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it.each([
    { status: 'unavailable', transcript: '' },
    { status: 'no_speech', transcript: '' },
    { status: 'error', transcript },
    { status: 'ok', transcript: 'Too short' },
    { status: 'ok', transcript: '' },
    { status: 'ok', transcript: ['not a transcript'] },
    { status: 'ok', transcript: 'x'.repeat(200001) },
    'I cannot access this video.',
    null
  ])('rejects inaccessible, incomplete, or malformed transcripts without HTML fallback (%#)', async reply => {
    const h = harness(async () => reply);
    const before = packet([webRow({ url: 'https://example.edu/kept' })]);
    const result = await h.run({ researchAction: 'url', url: canonical, researchPacket: before });
    expect(result.ok).toBe(false);
    expect(result.packet.items).toEqual(before.items);
    expect(result.collectionOutcome.added).toBe(0);
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
    expect(h.state.inputText).toBe('PRIVATE_READING');
  });

  it('preserves collection when Gemini returns a credential or provider failure', async () => {
    const h = harness(async () => { throw Object.assign(new Error('Gemini API key required'), { classification: { kind: 'auth' } }); });
    const before = packet([webRow({ url: 'https://example.edu/kept' })]);
    const result = await h.run({ researchAction: 'url', url: canonical, researchPacket: before });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/key/i);
    expect(result.packet.items).toEqual(before.items);
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it('selects only bounded exact excerpts from a longer transcript and preserves provenance through writing', async () => {
    const opening = ('UNSELECTED_TRANSCRIPT_SENTINEL: Unrelated navigation and housekeeping.\n\n').repeat(50);
    const longTranscript = opening + Array.from({ length: 7 }, (_, index) => 'Photosynthesis paragraph ' + index + ': ' + transcript.repeat(5)).join('\n\n');
    let p;
    const h = harness(async (_, json, search, temp, query, signal, legacy, extra, context) => context?.videoUrl ? response({ transcript: longTranscript }) : {
      sections: [{ heading: 'Plants', paragraphs: [{ text: 'Plants turn sunlight into chemical energy.', evidenceIds: p.items.map(item => item.id) }] }]
    });
    const result = await h.run({ researchAction: 'url', url: canonical });
    expect(result.ok).toBe(true);
    p = result.packet;
    expect(p.items.length).toBeGreaterThan(0);
    expect(p.items.length).toBeLessThanOrEqual(3);
    expect(p.items.every(item => item.passage.length <= 1200 && longTranscript.includes(item.passage))).toBe(true);
    expect(p.items.every(item => item.evidenceType === 'AI video transcript')).toBe(true);
    const written = await h.run({ reviewedResearch: p });
    expect(written.ok).toBe(true);
    expect(h.callGemini.mock.lastCall[0]).not.toContain('UNSELECTED_TRANSCRIPT_SENTINEL');
    expect(h.callGemini.mock.lastCall[0]).toContain('AI video transcript');
    expect(written.report.supplied.every(item => item.evidenceType === 'AI video transcript')).toBe(true);
    const metadata = h.state.recordSourceProvenance.mock.lastCall[0];
    expect(JSON.stringify(metadata.studentSources)).toContain('AI video transcript');
    expect(JSON.stringify(metadata.studentSources)).not.toContain('UNSELECTED_TRANSCRIPT_SENTINEL');
  });

  it('does not reinclude an excluded short-URL source while adding transcript passages', async () => {
    const before = packet([webRow({ url: shortUrl, passage: 'An existing discovery snippet about plants.' })]);
    R.setSourceIncluded(before, before.items[0].sourceKey, false);
    const result = await harness().run({ researchAction: 'url', url: canonical, researchPacket: before });
    expect(result.ok).toBe(true);
    expect(result.packet.items.length).toBeGreaterThan(1);
    expect(result.packet.items.every(item => !item.included)).toBe(true);
  });

  it('preserves explicit removal across short and canonical URLs', async () => {
    const before = packet([webRow({ url: shortUrl })]);
    R.removeSource(before, before.items[0].sourceKey);
    const result = await harness().run({ researchAction: 'url', url: canonical, researchPacket: before });
    expect(result.ok).toBe(true);
    expect(result.packet.items).toEqual([]);
    expect(result.collectionOutcome).toMatchObject({ added: 0, removed: 1 });
  });

  it('normalizes saved legacy alias decisions before collecting a canonical video', async () => {
    const excluded = packet([webRow({ url: shortUrl, passage: 'A prior search result for this video.' })]);
    excluded.items[0].sourceKey = 'web:' + shortUrl;
    excluded.items[0].included = false;
    excluded.sourceDecisions = { ['web:' + shortUrl]: false };
    const result = await harness().run({ researchAction: 'url', url: canonical, researchPacket: excluded });
    expect(result.ok).toBe(true);
    expect(result.packet.items.every(item => !item.included)).toBe(true);
    const removed = packet();
    removed.removedSources = { ['web:' + shortUrl]: true };
    const retry = await harness().run({ researchAction: 'url', url: canonical, researchPacket: removed });
    expect(retry.ok).toBe(true);
    expect(retry.packet.items).toEqual([]);
    expect(retry.collectionOutcome.removed).toBe(1);
  });

  it('deduplicates legacy alias collisions while keeping the restrictive passage choice', () => {
    const prior = packet();
    prior.items = [
      { ...webRow({ url: shortUrl, included: false }), id: 'legacy-short-id', sourceKey: 'web:' + shortUrl },
      { ...webRow({ included: true }), id: 'legacy-watch-id', sourceKey: 'web:' + canonical }
    ];
    const normalized = R.packet(topic, prior);
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0]).toMatchObject({ url: canonical, included: false });
    expect(normalized.items[0].id).toBe(R.row(webRow()).id);
    expect(R.packet(topic, normalized).items).toEqual(normalized.items);
  });

  it('migrates an excluded legacy passage decision to the canonical evidence ID', () => {
    const prior = packet();
    prior.items = [{ ...webRow({ url: shortUrl, included: true }), id: 'legacy-short-id', sourceKey: 'web:' + shortUrl }];
    prior.passageDecisions = { 'legacy-short-id': false };
    const normalized = R.packet(topic, prior);
    const canonicalId = R.row(webRow()).id;
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0]).toMatchObject({ id: canonicalId, included: false });
    expect(normalized.passageDecisions[canonicalId]).toBe(false);
    expect(R.packet(topic, normalized).items[0].included).toBe(false);
  });

  it('retains the existing per-source and full-collection limits', async () => {
    const h = harness();
    const sourceFull = packet(Array.from({ length: 4 }, (_, index) => webRow({ passage: 'Previously accepted source passage number ' + index + '.' })));
    const sourceResult = await h.run({ researchAction: 'url', url: shortUrl, researchPacket: sourceFull });
    expect(sourceResult.packet.items).toHaveLength(4);
    expect(sourceResult.collectionOutcome).toMatchObject({ added: 0, sourceLimit: 1 });
    const reviewFull = packet(Array.from({ length: 24 }, (_, index) => webRow({ url: 'https://example.edu/' + index })));
    const reviewResult = await h.run({ researchAction: 'url', url: canonical, researchPacket: reviewFull });
    expect(reviewResult.packet.items).toHaveLength(24);
    expect(reviewResult.collectionOutcome).toMatchObject({ added: 0, reviewLimit: 1 });
  });

  it('collects configured video links in sources-only mode without automatic discovery', async () => {
    const searchTopic = vi.fn();
    const h = harness(undefined, { webSearchProvider: { _isCanvas: true, searchTopic } });
    const result = await h.run({ researchAction: 'prepare', includeWeb: false,
      researchConfig: { version: 1, enabled: true, mode: 'sources', urls: [shortUrl] } });
    expect(result.ok).toBe(true);
    expect(result.packet.items[0].evidenceType).toBe('AI video transcript');
    expect(searchTopic).not.toHaveBeenCalled();
    expect(h.callGemini).toHaveBeenCalledTimes(1);
  });

  it('aborts a cancelled request and never merges its late transcript', async () => {
    vi.useFakeTimers();
    const d = deferred();
    let current = true;
    const h = harness(() => d.promise);
    const operation = h.run({ researchAction: 'url', url: canonical, isCurrent: () => current });
    await vi.advanceTimersByTimeAsync(0);
    const signal = h.callGemini.mock.calls[0][5];
    current = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(signal.aborted).toBe(true);
    d.resolve(response());
    expect(await operation).toEqual({ ok: false, cancelled: true });
    expect(h.state.inputText).toBe('PRIVATE_READING');
  });

  it('cancels when the live AI transport changes during transcription', async () => {
    vi.useFakeTimers();
    const d = deferred();
    const h = harness(() => d.promise);
    const operation = h.run({ researchAction: 'url', url: canonical });
    await vi.advanceTimersByTimeAsync(0);
    window.callGemini = vi.fn(async () => response());
    await vi.advanceTimersByTimeAsync(1000);
    d.resolve(response());
    expect(await operation).toEqual({ ok: false, cancelled: true });
    expect(window.callGemini).not.toHaveBeenCalled();
  });

  it('times out stalled transcription and aborts its transport without changing the collection', async () => {
    vi.useFakeTimers();
    const d = deferred();
    const h = harness(() => d.promise);
    const before = packet([webRow({ url: 'https://example.edu/kept' })]);
    const operation = h.run({ researchAction: 'url', url: canonical, researchPacket: before });
    await vi.advanceTimersByTimeAsync(120001);
    const result = await operation;
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/timed out/i);
    expect(result.packet.items).toEqual(before.items);
    expect(h.callGemini.mock.calls[0][5].aborted).toBe(true);
    d.resolve(response());
    await Promise.resolve();
    expect(before.items).toHaveLength(1);
  });
});

describe('transient research transcript callbacks', () => {
  it('reports bounded snapshots and progress without putting the complete transcript into the result packet', async () => {
    const longTranscript = transcript + '\n\nUNSELECTED_SNAPSHOT_ONLY: ' + 'Unrelated housekeeping and navigation. '.repeat(40);
    const h = harness(async () => response({ transcript: longTranscript }));
    const onVideoTranscript = vi.fn(), onResearchProgress = vi.fn();
    const result = await h.run({ researchAction: 'url', url: shortUrl, onVideoTranscript, onResearchProgress });
    expect(result.ok).toBe(true);
    expect(onVideoTranscript).toHaveBeenCalledTimes(1);
    const snapshot = onVideoTranscript.mock.calls[0][0];
    expect(snapshot).toEqual({ url: canonical, title: 'How plants grow', transcript: longTranscript, retrievedAt: expect.any(String) });
    expect(onResearchProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { stage: 'transcribing', url: canonical }, { stage: 'selecting', url: canonical }
    ]);
    expect(JSON.stringify(result)).not.toContain('UNSELECTED_SNAPSHOT_ONLY');
    expect(result.packet.items.every(item => R.transcriptPassages(snapshot).some(candidate => candidate.id === item.id))).toBe(true);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
  });

  it('forwards snapshot callbacks for configured preparation links', async () => {
    const h = harness(), onVideoTranscript = vi.fn();
    const result = await h.run({ researchAction: 'prepare', includeWeb: false, onVideoTranscript,
      researchConfig: { version: 1, enabled: true, mode: 'sources', urls: [shortUrl] } });
    expect(result.ok).toBe(true);
    expect(onVideoTranscript).toHaveBeenCalledTimes(1);
    expect(onVideoTranscript.mock.calls[0][0].url).toBe(canonical);
  });

  it('resets video progress before fetching a later configured webpage without publishing page text as a transcript', async () => {
    const h = harness(), onVideoTranscript = vi.fn(), onResearchProgress = vi.fn();
    const pageUrl = 'https://example.edu/plants', d = deferred();
    window.LumenStudy.firstPartyFetchWebSource.mockImplementation(() => d.promise);
    const operation = h.run({ researchAction: 'prepare', includeWeb: false, onVideoTranscript, onResearchProgress,
      researchConfig: { version: 1, enabled: true, mode: 'sources', urls: [shortUrl, pageUrl] } });
    await vi.waitFor(() => expect(window.LumenStudy.firstPartyFetchWebSource).toHaveBeenCalledTimes(1));
    expect(onResearchProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { stage: 'transcribing', url: canonical }, { stage: 'selecting', url: canonical }, { stage: 'collecting', url: pageUrl }
    ]);
    d.resolve({ title: 'Public page', url: pageUrl, text: 'WEBPAGE_ONLY_SENTINEL: Plants need sunlight and water to grow.' });
    const result = await operation;
    expect(result.ok).toBe(true);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(onVideoTranscript).toHaveBeenCalledTimes(1);
    expect(onVideoTranscript.mock.calls[0][0]).toMatchObject({ url: canonical, transcript });
    expect(JSON.stringify(onVideoTranscript.mock.calls)).not.toContain('WEBPAGE_ONLY_SENTINEL');
    expect(result.packet.items.find(item => item.url === pageUrl).evidenceType).toBe('Page excerpt');
  });

  it.each(['sync', 'async'])('keeps collected evidence when %s observers fail', async mode => {
    const observer = mode === 'sync' ? () => { throw new Error('UI observer failed'); } : async () => { throw new Error('UI observer failed'); };
    const result = await harness().run({ researchAction: 'url', url: canonical, onVideoTranscript: observer, onResearchProgress: observer });
    expect(result.ok).toBe(true);
    expect(result.packet.items[0].passage).toBe(transcript);
  });

  it('does not publish a late transcript snapshot after cancellation', async () => {
    vi.useFakeTimers();
    const d = deferred(), onVideoTranscript = vi.fn(), onResearchProgress = vi.fn();
    let current = true;
    const h = harness(() => d.promise);
    const operation = h.run({ researchAction: 'url', url: canonical, onVideoTranscript, onResearchProgress, isCurrent: () => current });
    await vi.advanceTimersByTimeAsync(0);
    current = false;
    d.resolve(response());
    expect(await operation).toEqual({ ok: false, cancelled: true });
    expect(onVideoTranscript).not.toHaveBeenCalled();
    expect(onResearchProgress.mock.calls).toHaveLength(1);
  });

  it('does not publish malformed provider output as a cached transcript', async () => {
    const onVideoTranscript = vi.fn();
    const result = await harness(async () => ({ status: 'unavailable', transcript: '' })).run({ researchAction: 'url', url: canonical, onVideoTranscript });
    expect(result.ok).toBe(false);
    expect(onVideoTranscript).not.toHaveBeenCalled();
  });

  it('does not transcribe when the progress callback observes a cancelled review', async () => {
    let current = true;
    const h = harness(), onVideoTranscript = vi.fn();
    const result = await h.run({ researchAction: 'url', url: canonical, isCurrent: () => current,
      onResearchProgress: () => { current = false; }, onVideoTranscript });
    expect(result).toEqual({ ok: false, cancelled: true });
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(onVideoTranscript).not.toHaveBeenCalled();
  });
});
