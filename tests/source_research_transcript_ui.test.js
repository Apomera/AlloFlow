import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const canonical = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
const noop = () => {};
const sourceText = (_, fallback) => fallback;
let Panel, SourcePanel, availability, storeTranscript, api, host, root, props, latestPacket, latestCache;
let originalModules, originalGemini, originalManaged, originalBlocked;
const videoFn = flags => Object.assign(vi.fn(), { _alloflowVideoInput: true, _alloflowBackend: 'gemini' }, flags);
const snapshot = (extra = {}) => ({ url: canonical, title: 'Cloud video', retrievedAt: '2026-10-09T12:00:00Z',
  transcript: Array.from({ length: 18 }, (_, i) => `Section ${String(i + 1).padStart(2, '0')}: ${['clouds', 'rivers', 'forests'][i % 3]} contain evidence marker ${i + 1} in this distinct, sufficiently long transcript passage.`).join('\n\n'), ...extra });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const packetFor = (snap, count = 2) => api.packet('plants', { version: 1, topic: 'plants', items: api.transcriptPassages(snap).slice(0, count), activity: [] });

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  const icons = ['ArrowRight', 'Brain', 'Check', 'CheckCircle', 'CheckCircle2', 'ChevronLeft', 'ChevronRight', 'Clock', 'Download', 'FileText', 'Globe', 'GripVertical', 'Layers', 'Layout', 'Lightbulb', 'Mic', 'Pencil', 'Plus', 'RefreshCw', 'Search', 'Settings', 'Sparkles', 'StopCircle', 'Undo2', 'Upload', 'UserCheck', 'Users', 'X'];
  [Panel, SourcePanel, availability, storeTranscript] = new Function('React', ...icons, code + '\nreturn [SourceResearchReviewPanel, SourceGenPanel, sourceReviewVideoAvailability, sourceReviewStoreTranscript];')(React, ...icons.map(() => () => null));
  const engine = readFileSync('content_engine_source.jsx', 'utf8');
  api = new Function(engine.slice(engine.indexOf('var SourceResearchReview ='), engine.indexOf('var createContentEngine =')) + '\nreturn SourceResearchReview;')();
});

beforeEach(() => {
  originalModules = window.AlloModules; originalGemini = window.callGemini;
  originalManaged = window.ALLOFLOW_MANAGED_AI_POLICY; originalBlocked = window.__alloStudentAiDisabled;
  window.AlloModules = { SourceResearchReview: api }; window.callGemini = videoFn();
  delete window.ALLOFLOW_MANAGED_AI_POLICY; delete window.__alloStudentAiDisabled;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null; props = {}; latestPacket = null; latestCache = null;
  window.AlloModules = originalModules; window.callGemini = originalGemini;
  window.ALLOFLOW_MANAGED_AI_POLICY = originalManaged; window.__alloStudentAiDisabled = originalBlocked;
  delete window.AlloOwnSources; delete window.__alloScrollLockState;
  document.body.style.overflow = ''; vi.restoreAllMocks();
});

function ReviewHarness(input) {
  const [packet, setPacket] = React.useState(input.initialPacket || null);
  const [cache, setCache] = React.useState(input.initialCache || null);
  latestPacket = packet; latestCache = cache;
  return React.createElement(Panel, { ...input, packet, onPacketChange: setPacket, transcripts: cache, onTranscriptsChange: setCache });
}
async function render(extra = {}) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  props = { topic: 'plants', includeWeb: true, includeDocuments: false, documentsOnly: false, selectedIds: [], sources: [], libraryReady: true, busy: false,
    sourceText, generate: vi.fn(async () => ({ ok: true })), videoAvailability: 'ready', ...props, ...extra };
  await act(async () => root.render(React.createElement(ReviewHarness, props)));
}
const button = name => [...host.querySelectorAll('button')].find(node => node.textContent === name || node.getAttribute('aria-label') === name);
async function click(value) { const node = typeof value === 'string' ? button(value) : value; expect(node).toBeTruthy(); await act(async () => node.click()); }
async function change(node, value) {
  expect(node).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
const candidate = id => host.querySelector(`[data-transcript-candidate="${id}"] input`);
const visibleCandidates = () => [...host.querySelectorAll('[data-transcript-candidate]')];
const chooser = () => host.querySelector('[data-transcript-chooser]');
const urlInput = () => host.querySelector('input[type="url"]');

function SourceHarness(input) {
  const [web, setWeb] = React.useState(true);
  const [own, setOwn] = React.useState(false);
  const [quotes, setQuotes] = React.useState(false);
  return React.createElement(SourcePanel, {
    aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade', addToast: noop,
    handleAddStandard: noop, handleFindStandards: noop, handleRemoveStandard: noop,
    handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop,
    isFindingStandards: false, isGeneratingSource: false, isIndependentMode: false,
    setAiStandardQuery: noop, setAiStandardRegion: noop, setSourceCustomInstructions: noop,
    setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop, setSourceVocabulary: noop,
    setStandardInputValue: noop, setTargetStandards: noop, showSourceGen: true,
    sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
    sourceTopic: 'plants', sourceVocabulary: '', standardInputValue: '', standardMode: 'manual',
    studentInterests: [], suggestedStandards: [], targetStandards: [], t: key => key,
    includeSourceCitations: web, setIncludeSourceCitations: setWeb, useOwnSources: own, setUseOwnSources: setOwn,
    documentsOnly: quotes, setDocumentsOnly: setQuotes, ai: { backend: 'gemini' }, callGemini: window.callGemini,
    ...input
  });
}
async function renderSource(extra = {}) {
  if (!root) {
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    window.AlloOwnSources = { available: () => true, readLibrary: async () => ({ ok: true, sources: [] }), acceptAttribute: () => '.txt' };
    props = { setSourceTopic: vi.fn(), handleGenerateSource: vi.fn(async () => ({ ok: true })) };
  }
  props = { ...props, ...extra };
  await act(async () => root.render(React.createElement(SourceHarness, props)));
}
async function openSourceReview() {
  await click('Research settings');
  await click([...host.querySelectorAll('label')].find(node => node.textContent.trim() === 'Review sources before writing').querySelector('input'));
  await click('Apply settings'); await click('Review sources');
}

describe('video availability preflight', () => {
  it('uses an explicitly supplied Gemini transport without requiring a global', () => {
    delete window.callGemini;
    expect(availability({ ai: { backend: 'gemini' }, callGemini: videoFn() })).toBe('ready');
  });
  it('uses the flagged global only when the host did not supply a transport', () => {
    expect(availability()).toBe('ready');
    expect(availability({ callGemini: null })).toBe('disabled');
  });
  it.each(['ollama', 'openai'])('identifies %s without changing its selected provider', backend => {
    const ai = { backend };
    expect(availability({ ai })).toBe('provider'); expect(ai.backend).toBe(backend);
  });
  it('honors transport annotations even when state still says Gemini', () => {
    expect(availability({ ai: { backend: 'gemini' }, callGemini: videoFn({ _alloflowBackend: 'ollama' }) })).toBe('provider');
  });
  it('requires the video-capable module rather than a text-only connection', () => {
    expect(availability({ callGemini: vi.fn() })).toBe('unavailable');
    delete window.callGemini; expect(availability()).toBe('unavailable');
  });
  it.each([{}, false, { version: 1 }])('blocks every configured managed-policy value %#', policy => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy; expect(availability()).toBe('managed');
  });
  it('honors QR and student restrictions while allowing a teacher session', () => {
    expect(availability({ callGemini: videoFn({ _alloQrBlocked: true }) })).toBe('disabled');
    expect(availability({ isTeacherMode: false, studentAiFeaturesHidden: true })).toBe('disabled');
    expect(availability({ isTeacherMode: true, studentAiFeaturesHidden: true })).toBe('ready');
    window.__alloStudentAiDisabled = true; expect(availability({ isTeacherMode: true })).toBe('disabled');
  });
  it.each([
    ['provider', 'requires Gemini'], ['managed', 'does not allow'], ['disabled', 'disabled in this session'], ['unavailable', 'not ready']
  ])('explains %s before a video request and preserves normal-page reading', async (status, message) => {
    await render({ videoAvailability: status }); await change(urlInput(), canonical);
    expect(button('Read video').disabled).toBe(true); expect(host.textContent).toContain(message);
    await click('Read video'); expect(props.generate).not.toHaveBeenCalled();
    await change(urlInput(), 'https://example.edu/clouds');
    expect(button('Read relevant webpage passages').disabled).toBe(false);
  });
});

describe('memory-only transcript retention', () => {
  it('keeps transcripts across close/reopen and editor remount without storing them or requesting the video again', async () => {
    const snap = snapshot(), storage = vi.spyOn(Storage.prototype, 'setItem');
    const generate = vi.fn(async options => { options.onVideoTranscript(snap); return { ok: true, packet: packetFor(snap) }; });
    await renderSource({ handleGenerateSource: generate }); await openSourceReview();
    await change(urlInput(), canonical); await click('Read video'); expect(chooser()).toBeTruthy();
    await click('Close'); await click('Review sources'); expect(chooser()).toBeTruthy();
    await click('Close');
    const owner = props;
    await act(async () => root.unmount()); root = createRoot(host);
    await act(async () => root.render(React.createElement(SourceHarness, owner)));
    await click('Review sources'); expect(chooser()).toBeTruthy();
    expect(generate).toHaveBeenCalledTimes(1); expect(storage).not.toHaveBeenCalled();
  });
  it('clears full transcripts when the editor topic changes while review is closed', async () => {
    const snap = snapshot();
    await renderSource({ handleGenerateSource: vi.fn(async options => { options.onVideoTranscript(snap); return { ok: true, packet: packetFor(snap) }; }) });
    await openSourceReview(); await change(urlInput(), canonical); await click('Read video'); await click('Close');
    await renderSource({ sourceTopic: 'oceans' }); await renderSource({ sourceTopic: 'plants' });
    await click('Review sources'); expect(chooser()).toBeNull(); expect(button('Load transcript for review')).toBeTruthy();
    expect(props.handleGenerateSource).toHaveBeenCalledTimes(1);
  });
  it('canonicalizes aliases, refreshes recent entries, and bounds the cache at three videos', () => {
    let cache = null;
    for (const id of ['AbCdEfGhI_1', 'AbCdEfGhI_2', 'AbCdEfGhI_3', 'AbCdEfGhI_4']) cache = storeTranscript(cache, 'plants', snapshot({ url: 'https://youtu.be/' + id }));
    expect(cache.entries.map(entry => entry.url)).toEqual([2, 3, 4].map(i => 'https://www.youtube.com/watch?v=AbCdEfGhI_' + i));
    cache = storeTranscript(cache, 'plants', snapshot({ url: 'https://m.youtube.com/watch?v=AbCdEfGhI_2&t=4', title: 'Refreshed' }));
    expect(cache.entries).toHaveLength(3); expect(cache.entries[2].title).toBe('Refreshed');
    expect(storeTranscript(cache, 'clouds', snapshot()).entries).toHaveLength(1);
  });
  it.each([
    { url: 'https://example.edu/video' }, { transcript: 'too short' }, { transcript: 'x'.repeat(200001) },
    { transcript: 'A usable-looking transcript with an invalid \u0001 control character.' }
  ])('does not retain invalid transcript snapshots %#', extra => {
    const cache = storeTranscript(null, 'plants', snapshot());
    expect(storeTranscript(cache, 'plants', snapshot(extra))).toBe(cache);
  });
  it('shows progress stages, retains completed snapshots separately, and writes no storage', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem'), request = deferred(), snap = snapshot();
    await render({ generate: vi.fn(() => request.promise) }); await change(urlInput(), canonical); await click('Read video');
    expect(host.textContent).toContain('Transcribing video');
    const options = props.generate.mock.lastCall[0];
    await act(async () => { options.onResearchProgress({ stage: 'selecting', url: canonical }); options.onVideoTranscript(snap); });
    expect(host.textContent).toContain('Selecting transcript excerpts');
    expect(latestCache).toBeNull();
    await act(async () => request.resolve({ ok: true, packet: packetFor(snap) }));
    expect(latestCache.entries).toEqual([snap]);
    expect(chooser()).toBeTruthy(); expect(latestPacket.transcript).toBeUndefined();
    expect(JSON.stringify(latestPacket)).not.toContain('Section 18:'); expect(storage).not.toHaveBeenCalled();
  });
  it('replaces video progress with ordinary collection progress when a mixed-source request continues', async () => {
    const request = deferred();
    await render({ generate: vi.fn(() => request.promise) }); await click('Find sources to review');
    const options = props.generate.mock.lastCall[0];
    await act(async () => options.onResearchProgress({ stage: 'selecting', url: canonical }));
    expect(host.textContent).toContain('Selecting transcript excerpts');
    await act(async () => options.onResearchProgress({ stage: 'collecting', url: 'https://example.edu/clouds' }));
    expect(host.textContent).toContain('Collecting passages for review');
    expect(host.textContent).not.toContain('Selecting transcript excerpts');
    await act(async () => request.resolve({ ok: true }));
  });
  it.each(['cancel', 'topic', 'unmount'])('ignores late video snapshots and progress after %s', async reason => {
    const request = deferred(), snap = snapshot();
    await render({ generate: vi.fn(() => request.promise) }); await change(urlInput(), canonical); await click('Read video');
    const options = props.generate.mock.lastCall[0];
    if (reason === 'cancel') await click('Cancel research');
    if (reason === 'topic') await render({ topic: 'oceans' });
    if (reason === 'unmount') { await act(async () => root.unmount()); root = null; }
    await act(async () => { options.onVideoTranscript(snap); options.onResearchProgress({ stage: 'transcribing', url: canonical }); request.resolve({ ok: true, packet: packetFor(snap) }); });
    expect(options.isCurrent()).toBe(false); expect(latestCache).toBeNull(); expect(latestPacket).toBeNull();
    expect(host.textContent).not.toContain('Transcribing video');
  });
  it('discards a transcript delivered during a request that is cancelled before completion', async () => {
    const request = deferred(), snap = snapshot();
    await render({ generate: vi.fn(() => request.promise) }); await change(urlInput(), canonical); await click('Read video');
    const options = props.generate.mock.lastCall[0];
    await act(async () => options.onVideoTranscript(snap)); expect(latestCache).toBeNull();
    await click('Cancel research');
    await act(async () => request.resolve({ ok: true, packet: packetFor(snap) }));
    expect(latestCache).toBeNull(); expect(latestPacket).toBeNull(); expect(chooser()).toBeNull();
  });
  it('ignores transcript and progress callbacks once their completed request has settled', async () => {
    const snap = snapshot(); let options;
    await render({ generate: vi.fn(async value => { options = value; value.onVideoTranscript(snap); return { ok: true, packet: packetFor(snap) }; }) });
    await change(urlInput(), canonical); await click('Read video');
    const cache = latestCache;
    await act(async () => { options.onVideoTranscript(snapshot({ title: 'Unexpected late replacement' })); options.onResearchProgress({ stage: 'transcribing', url: canonical }); });
    expect(latestCache).toBe(cache); expect(host.textContent).not.toContain('Transcribing video');
    expect(latestCache.entries[0].title).toBe(snap.title);
  });
  it('clears cached transcripts on topic changes and does not revive them when the topic returns', async () => {
    const snap = snapshot(); await render({ initialPacket: packetFor(snap), initialCache: { topic: 'plants', entries: [snap] } });
    expect(chooser()).toBeTruthy(); await render({ topic: 'oceans' }); expect(latestCache).toBeNull();
    await render({ topic: 'plants' }); expect(chooser()).toBeNull(); expect(button('Load transcript for review')).toBeTruthy();
  });
});

describe('transcript excerpt selection', () => {
  it('requires a transcript-only source to retain one excerpt so its chooser stays reachable', async () => {
    const snap = snapshot(), candidates = api.transcriptPassages(snap), packet = packetFor(snap, 1);
    await render({ initialPacket: packet, initialCache: { topic: 'plants', entries: [snap] } });
    await click(candidate(candidates[0].id));
    expect(button('Apply excerpts').disabled).toBe(true);
    expect(chooser().textContent).toContain('Keep at least one excerpt, or remove this source.');
    expect(latestPacket).toBe(packet);
  });
  it('can clear transcript excerpts when another evidence row keeps the source and chooser available', async () => {
    const snap = snapshot(), candidates = api.transcriptPassages(snap), packet = packetFor(snap, 1);
    api.merge(packet, [{ kind: 'web', title: 'Search result', url: canonical, passage: 'A separate search result mentions this video and provides a concise preview.', evidenceType: 'Search snippet' }]);
    await render({ initialPacket: packet, initialCache: { topic: 'plants', entries: [snap] } });
    await click(candidate(candidates[0].id)); expect(button('Apply excerpts').disabled).toBe(false);
    await click('Apply excerpts'); expect(latestPacket.items).toHaveLength(1); expect(latestPacket.items[0].evidenceType).toBe('Search snippet');
    expect(chooser()).toBeTruthy(); expect(candidate(candidates[0].id).checked).toBe(false);
  });
  it('paginates eight excerpts, keeps hidden selections, and changes the packet only on Apply', async () => {
    const snap = snapshot(), candidates = api.transcriptPassages(snap), original = packetFor(snap);
    await render({ initialPacket: original, initialCache: { topic: 'plants', entries: [snap] } });
    expect(visibleCandidates()).toHaveLength(8); expect(button('Previous excerpts').disabled).toBe(true);
    await click(candidate(candidates[0].id)); await click(candidate(candidates[2].id));
    expect(latestPacket).toBe(original); expect(props.generate).not.toHaveBeenCalled();
    await click('Next excerpts'); expect(visibleCandidates()).toHaveLength(8); expect(chooser().textContent).toContain('Page 2 of 3');
    await click(candidate(candidates[9].id)); await change(chooser().querySelector('input[type="search"]'), 'Section 18:');
    expect(visibleCandidates()).toHaveLength(1); expect(chooser().textContent).toContain('3 of 4 excerpt slots selected');
    await click(candidate(candidates[17].id)); expect(chooser().textContent).toContain('4 of 4 excerpt slots selected');
    await click('Apply excerpts');
    expect(latestPacket.items.map(item => item.id)).toEqual([1, 2, 9, 17].map(i => candidates[i].id));
    expect(props.generate).not.toHaveBeenCalled(); expect(host.textContent).toContain('Transcript excerpt selection updated.');
    await click('Generate from included passages');
    const options = props.generate.mock.lastCall[0];
    expect(options.reviewedResearch.items).toHaveLength(4); expect(options.transcripts).toBeUndefined();
    expect(options.reviewedResearch.transcript).toBeUndefined();
    expect(JSON.stringify(options)).not.toContain('Section 04:');
  });
  it('resets pending choices and supports a no-match filter without losing selections', async () => {
    const snap = snapshot(), candidates = api.transcriptPassages(snap), original = packetFor(snap);
    await render({ initialPacket: original, initialCache: { topic: 'plants', entries: [snap] } });
    await click(candidate(candidates[0].id)); await change(chooser().querySelector('input[type="search"]'), 'no-such-phrase');
    expect(chooser().textContent).toContain('No matching excerpts.'); expect(chooser().textContent).toContain('1 of 4 excerpt slots selected');
    await click('Reset selection'); expect(button('Apply excerpts').disabled).toBe(true);
    expect(chooser().textContent).toContain('2 of 4 excerpt slots selected'); expect(latestPacket).toBe(original);
  });
  it('retains source and passage exclusions while replacing collection membership', async () => {
    const snap = snapshot(), candidates = api.transcriptPassages(snap), packet = packetFor(snap);
    api.setSourceIncluded(packet, candidates[0].sourceKey, false);
    packet.passageDecisions[candidates[1].id] = false;
    await render({ initialPacket: packet, initialCache: { topic: 'plants', entries: [snap] } });
    expect(candidate(candidates[0].id).checked).toBe(true); expect(chooser().textContent).toContain('remains excluded from writing');
    await click(candidate(candidates[0].id)); await click(candidate(candidates[2].id)); await click('Apply excerpts');
    expect(latestPacket.items.map(item => item.id)).toEqual([candidates[1].id, candidates[2].id]);
    expect(latestPacket.items.every(item => item.included === false)).toBe(true);
    expect(latestPacket.passageDecisions[candidates[1].id]).toBe(false);
    expect(button('Generate from included passages').disabled).toBe(true);
  });
  it.each(['source', 'review'])('honors the %s capacity without partially applying changes', async limit => {
    const snap = snapshot(), candidates = api.transcriptPassages(snap), packet = packetFor(snap, 1);
    const others = limit === 'source' ? 3 : 23;
    for (let i = 0; i < others; i++) api.merge(packet, [{ kind: 'web', title: 'Other evidence ' + i,
      url: limit === 'source' ? canonical : 'https://example.edu/' + i, passage: `Additional source passage number ${i} with enough independent readable evidence.`, evidenceType: 'Search snippet' }]);
    await render({ initialPacket: packet, initialCache: { topic: 'plants', entries: [snap] } });
    expect(chooser().textContent).toContain('1 of 1 excerpt slots selected'); expect(candidate(candidates[1].id).disabled).toBe(true);
    await click(candidate(candidates[0].id)); expect(candidate(candidates[1].id).disabled).toBe(false);
    await click(candidate(candidates[1].id)); await click('Apply excerpts');
    expect(latestPacket.items).toHaveLength(others + 1);
    expect(latestPacket.items.filter(item => item.evidenceType === 'AI video transcript').map(item => item.id)).toEqual([candidates[1].id]);
  });
});
