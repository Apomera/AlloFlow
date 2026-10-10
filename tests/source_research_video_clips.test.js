import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let R, createEngine;
const url = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
const topic = 'photosynthesis';
const first = 'Plants use sunlight to make sugars from water and carbon dioxide.';
const second = 'Photosynthesis stores light energy in chemical bonds for the plant.';
const third = 'Leaves contain chlorophyll that absorbs light during photosynthesis.';
const clip = { startSeconds: 40, endSeconds: 80 };
const laterClip = { startSeconds: 120, endSeconds: 180 };
const snapshot = (extra = {}) => ({ url, title: 'Plant science', transcript: [first, second, third].join('\n\n'), retrievedAt: '2026-10-09T12:00:00.000Z', ...extra });
const row = (extra = {}) => ({ kind: 'web', url, title: 'Plant science', passage: first, evidenceType: 'AI video transcript', ...extra });
const malformed = [undefined, null, {}, [], '40-80', { startSeconds: 40 }, { startSeconds: '40', endSeconds: 80 },
  { startSeconds: -1, endSeconds: 80 }, { startSeconds: 40.5, endSeconds: 80 }, { startSeconds: 40, endSeconds: 40 },
  { startSeconds: 80, endSeconds: 40 }, { startSeconds: 0, endSeconds: Infinity }, { startSeconds: NaN, endSeconds: 80 },
  { startSeconds: 0, endSeconds: Number.MAX_SAFE_INTEGER + 1 }];

beforeEach(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  window.__alloUtils = window.AlloModules.TextPipelineHelpers;
  loadAlloModule('own_sources_module.js');
  new Function(readFileSync('content_engine_source.jsx', 'utf8'))();
  R = window.AlloModules.SourceResearchReview;
  createEngine = window.AlloModules.createContentEngine;
  window.LumenStudy = { firstPartyFetchWebSource: vi.fn(async () => ({ url: 'https://example.edu/plants', title: 'Plants', text: first })) };
});

afterEach(() => {
  ['callGemini', '__contentEngineState', 'ALLOFLOW_MANAGED_AI_POLICY', 'LumenStudy', 'AlloOwnSources', '__alloStudentAiDisabled', '_alloQrBlocked'].forEach(key => delete window[key]);
  vi.restoreAllMocks();
});

function packet(items = []) { const p = R.packet(topic); R.merge(p, items); return p; }
function harness(model = async () => ({ status: 'ok', title: 'Plant science', transcript: snapshot().transcript }), overrides = {}) {
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
  callGemini._alloflowVideoClipInput = true;
  const engine = createEngine({ getState: () => state, callGemini, t: key => key, addToast: vi.fn() });
  return { state, callGemini, run: options => engine.handleGenerateSource(options) };
}

describe('requested video clip identity', () => {
  it('normalizes integer bounds without keeping caller metadata or object references', () => {
    const value = { ...clip, private: 'not retained' };
    expect(R.videoClip(value)).toEqual(clip);
    expect(R.videoClip(value)).not.toBe(value);
    expect(R.videoClip({ startSeconds: 0, endSeconds: 1 })).toEqual({ startSeconds: 0, endSeconds: 1 });
  });

  it.each(malformed)('rejects malformed or explicitly missing clip bounds (%#)', value => {
    expect(R.videoClip(value)).toBeNull();
    expect(R.row(row({ videoClip: value }))).toBeNull();
    expect(R.transcriptKey(snapshot({ videoClip: value }))).toBe('');
    expect(() => R.transcriptPassages(snapshot({ videoClip: value }))).toThrow(/invalid clip/i);
  });

  it('keeps legacy whole-video IDs unchanged and distinguishes identical speech in other ranges', () => {
    const value = row();
    let hash = 2166136261;
    const legacy = [value.kind, value.url, '', '', undefined, value.title, value.passage].join('|');
    for (let i = 0; i < legacy.length; i++) hash = Math.imul(hash ^ legacy.charCodeAt(i), 16777619);
    const whole = R.row(value), early = R.row(row({ videoClip: clip })), later = R.row(row({ videoClip: laterClip }));
    expect(whole.id).toBe('e-' + (hash >>> 0).toString(36));
    expect(whole).not.toHaveProperty('videoClip');
    expect(new Set([whole.id, early.id, later.id]).size).toBe(3);
    expect(new Set([whole.sourceKey, early.sourceKey, later.sourceKey]).size).toBe(1);
    expect(R.transcriptKey(whole)).toBe(url);
    expect(R.transcriptKey(early)).toBe(url + '#clip=40-80');
    expect(R.transcriptKey({ ...later, url: 'https://youtu.be/AbCdEfGhI_1?t=42' })).toBe(url + '#clip=120-180');
  });

  it('does not attach clip metadata to ordinary webpages, pasted text, or other evidence types', () => {
    expect(R.row(row({ url: 'https://example.edu/plants', videoClip: clip }))).toBeNull();
    expect(R.row(row({ evidenceType: 'Pasted text', videoClip: clip }))).toBeNull();
    expect(R.row(row({ kind: 'paste', videoClip: clip }))).toBeNull();
    expect(R.transcriptKey(null)).toBe('');
  });

  it.each([[0, '0:00'], [40, '0:40'], [80, '1:20'], [3599, '59:59'], [3600, '1:00:00'], [7323, '2:02:03']])('formats %s seconds as %s', (seconds, text) => {
    expect(R.formatVideoTime(seconds)).toBe(text);
  });

  it('labels the requested scope separately from character offsets, without fabricating alignment', () => {
    const candidates = R.transcriptPassages(snapshot({ videoClip: clip }));
    expect(candidates).toHaveLength(3);
    expect(candidates.every(item => item.locatorLabel.startsWith('AI transcript - Requested clip 0:40 to 1:20 - Characters '))).toBe(true);
    expect(candidates.every(item => item.videoClip.startSeconds === 40 && item.videoClip.endSeconds === 80)).toBe(true);
    expect(candidates.map(item => item.passage)).toEqual([first, second, third]);
    expect(candidates.every(item => !Object.hasOwn(item, 'timestamp'))).toBe(true);
  });

  it('drops invalid stored ranges instead of relabeling them as whole-video evidence', () => {
    const good = R.row(row({ videoClip: clip }));
    const p = R.packet(topic, { version: 1, topic, items: [{ ...good, videoClip: null }] });
    expect(p.items).toEqual([]);
    expect(() => R.freeze(p, topic, false)).toThrow(/Include at least one/);
  });
});

describe('clip excerpt review boundaries', () => {
  it('replaces only the selected range and retains whole-video and other clip excerpts', () => {
    const whole = R.transcriptPassages(snapshot());
    const early = R.transcriptPassages(snapshot({ videoClip: clip }));
    const later = R.transcriptPassages(snapshot({ videoClip: laterClip }));
    const p = packet([whole[0], early[0], later[0]]);
    const next = R.replaceTranscriptPassages(p, snapshot({ videoClip: clip }), [early[1].id]);
    expect(next.items.map(item => item.id)).toEqual([whole[0].id, early[1].id, later[0].id]);
    expect(p.items.map(item => item.id)).toEqual([whole[0].id, early[0].id, later[0].id]);
  });

  it('counts every range toward the common four-passage video limit', () => {
    const whole = R.transcriptPassages(snapshot()), early = R.transcriptPassages(snapshot({ videoClip: clip }));
    const p = packet([whole[0], whole[1], early[0]]);
    expect(() => R.replaceTranscriptPassages(p, snapshot({ videoClip: clip }), early.map(item => item.id))).toThrow(/at most 4/);
    expect(p.items).toHaveLength(3);
    const later = R.transcriptPassages(snapshot({ videoClip: laterClip }));
    const outcome = R.createOutcome();
    R.merge(p, later, outcome);
    expect(p.items).toHaveLength(4);
    expect(outcome.sourceLimit).toBe(2);
  });

  it('counts retained clips toward the overall review limit', () => {
    const early = R.transcriptPassages(snapshot({ videoClip: clip }));
    const others = Array.from({ length: 23 }, (_, index) => row({ url: 'https://example.edu/' + index, evidenceType: 'Page excerpt' }));
    const p = packet([...others, early[0]]);
    expect(() => R.replaceTranscriptPassages(p, snapshot({ videoClip: clip }), early.slice(0, 2).map(item => item.id))).toThrow(/24 passages/);
    expect(p.items).toHaveLength(24);
  });

  it('retains passage and source exclusions when selecting another clip excerpt', () => {
    const early = R.transcriptPassages(snapshot({ videoClip: clip }));
    let p = packet([early[0]]);
    p.items[0].included = false;
    p.passageDecisions[early[1].id] = false;
    p = R.replaceTranscriptPassages(p, snapshot({ videoClip: clip }), [early[0].id, early[1].id]);
    expect(p.items.every(item => item.included === false)).toBe(true);
    R.setSourceIncluded(p, early[0].sourceKey, false);
    p = R.replaceTranscriptPassages(p, snapshot({ videoClip: clip }), [early[2].id]);
    expect(p.items[0].included).toBe(false);
    R.removeSource(p, early[0].sourceKey);
    expect(() => R.replaceTranscriptPassages(p, snapshot({ videoClip: clip }), [early[0].id])).toThrow(/removed/);
  });

  it('does not accept evidence IDs from a different clip', () => {
    const early = R.transcriptPassages(snapshot({ videoClip: clip }));
    const later = R.transcriptPassages(snapshot({ videoClip: laterClip }));
    expect(() => R.replaceTranscriptPassages(packet([early[0]]), snapshot({ videoClip: clip }), [later[0].id])).toThrow(/no longer available/);
  });
});

describe('research clip requests', () => {
  it('sends explicit clip bounds with a privacy-free transcription prompt and retains provenance', async () => {
    const h = harness(), onVideoTranscript = vi.fn();
    const result = await h.run({ researchAction: 'url', url, topic: 'PRIVATE_TOPIC_SENTINEL', videoClip: clip, onVideoTranscript });
    expect(result.ok).toBe(true);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    const args = h.callGemini.mock.calls[0];
    expect(args[8]).toEqual({ videoUrl: url, videoClip: clip });
    expect(args[0]).toContain('only within the requested clip from 40 seconds to 80 seconds');
    expect(args[0]).not.toContain('PRIVATE_');
    expect(args[2]).toBe(false);
    expect(args[4]).toBeNull();
    expect(args[6]).toBe(false);
    expect(result.packet.items.every(item => JSON.stringify(item.videoClip) === JSON.stringify(clip))).toBe(true);
    expect(result.packet.items.every(item => item.locatorLabel.includes('Requested clip 0:40 to 1:20'))).toBe(true);
    expect(onVideoTranscript).toHaveBeenCalledWith(expect.objectContaining({ url, videoClip: clip, transcript: snapshot().transcript }));
    expect(result.packet).not.toHaveProperty('transcript');
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it.each(malformed)('refuses an invalid explicitly supplied clip without sending a video or page request (%#)', async videoClip => {
    const h = harness();
    const result = await h.run({ researchAction: 'url', url, videoClip });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/valid clip start and end/i);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it('requires updated clip transport but still permits whole-video reading on older video transport', async () => {
    const h = harness();
    delete h.callGemini._alloflowVideoClipInput;
    const rejected = await h.run({ researchAction: 'url', url, videoClip: clip });
    expect(rejected.ok).toBe(false);
    expect(rejected.error).toMatch(/clip reader.*Reload/i);
    expect(h.callGemini).not.toHaveBeenCalled();
    const accepted = await h.run({ researchAction: 'url', url: url + '&t=40' });
    expect(accepted.ok).toBe(true);
    expect(h.callGemini.mock.calls[0][8]).toEqual({ videoUrl: url });
    expect(h.callGemini.mock.calls[0][0]).toContain('from beginning to end');
    expect(accepted.packet.items.every(item => !Object.hasOwn(item, 'videoClip'))).toBe(true);
  });

  it('does not apply clip bounds to ordinary webpages', async () => {
    const h = harness();
    const result = await h.run({ researchAction: 'url', url: 'https://example.edu/plants', videoClip: clip });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/YouTube video link/);
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it('does not retry a failed clip as a whole video or HTML page', async () => {
    const h = harness(async () => { throw new Error('Clip unsupported by current model'); });
    const before = packet([row()]);
    const result = await h.run({ researchAction: 'url', url, videoClip: clip, researchPacket: before });
    expect(result.ok).toBe(false);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.callGemini.mock.calls[0][8].videoClip).toEqual(clip);
    expect(result.packet.items).toEqual(before.items);
    expect(window.LumenStudy.firstPartyFetchWebSource).not.toHaveBeenCalled();
  });

  it('keeps configured URL preparation whole-video even when an unrelated clip draft is present', async () => {
    const h = harness();
    const result = await h.run({ researchAction: 'prepare', videoClip: clip, researchConfig: { version: 1, enabled: true, mode: 'web', urls: [url + '&t=40'] } });
    expect(result.ok).toBe(true);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.callGemini.mock.calls[0][8]).toEqual({ videoUrl: url });
    expect(result.packet.items.every(item => !Object.hasOwn(item, 'videoClip'))).toBe(true);
  });

  it('retains managed media restrictions for clips', async () => {
    const h = harness();
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, allowExternalSearch: true };
    const result = await h.run({ researchAction: 'url', url, videoClip: clip });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/managed deployment/);
    expect(h.callGemini).not.toHaveBeenCalled();
  });
});
