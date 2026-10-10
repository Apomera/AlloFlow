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
const sourceText = (_, fallback) => fallback;
const clipA = { startSeconds: 40, endSeconds: 80 }, clipB = { startSeconds: 120, endSeconds: 180 };
const videoFn = flags => Object.assign(vi.fn(), { _alloflowVideoInput: true, _alloflowVideoClipInput: true, _alloflowBackend: 'gemini' }, flags);
const snapshot = (extra = {}) => ({ url: canonical, title: 'Cloud video', retrievedAt: '2026-10-09T12:00:00Z',
  transcript: Array.from({ length: 10 }, (_, i) => `Section ${String(i + 1).padStart(2, '0')}: clouds contain evidence marker ${i + 1} in this distinct, sufficiently long transcript passage.`).join('\n\n'), ...extra });
let Panel, parseTime, linkedStart, transcriptKey, storeTranscript, clipReady, api, host, root, props, latestPacket, latestCache, latestDraft;
let originalModules, originalGemini, originalManaged, originalBlocked;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  const icons = ['ArrowRight', 'Brain', 'Check', 'CheckCircle', 'CheckCircle2', 'ChevronLeft', 'ChevronRight', 'Clock', 'Download', 'FileText', 'Globe', 'GripVertical', 'Layers', 'Layout', 'Lightbulb', 'Mic', 'Pencil', 'Plus', 'RefreshCw', 'Search', 'Settings', 'Sparkles', 'StopCircle', 'Undo2', 'Upload', 'UserCheck', 'Users', 'X'];
  [Panel, parseTime, linkedStart, transcriptKey, storeTranscript, clipReady] = new Function('React', ...icons, code + '\nreturn [SourceResearchReviewPanel, sourceReviewParseVideoTime, sourceReviewLinkedVideoStart, sourceReviewTranscriptKey, sourceReviewStoreTranscript, sourceReviewVideoClipReady];')(React, ...icons.map(() => () => null));
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
  host?.remove(); root = null; host = null; props = {}; latestPacket = null; latestCache = null; latestDraft = null;
  window.AlloModules = originalModules; window.callGemini = originalGemini;
  window.ALLOFLOW_MANAGED_AI_POLICY = originalManaged; window.__alloStudentAiDisabled = originalBlocked;
  vi.restoreAllMocks();
});

function Harness(input) {
  const [packet, setPacket] = React.useState(input.initialPacket || null);
  const [cache, setCache] = React.useState(input.initialCache || null);
  const [draft, setDraft] = React.useState(input.initialDraft || null);
  latestPacket = packet; latestCache = cache; latestDraft = draft;
  return React.createElement(Panel, { ...input, key: input.panelKey || 'same', packet, onPacketChange: setPacket,
    transcripts: cache, onTranscriptsChange: setCache, draft, onDraftChange: setDraft });
}
async function render(extra = {}) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  props = { topic: 'plants', includeWeb: true, includeDocuments: false, documentsOnly: false, selectedIds: [], sources: [], libraryReady: true, busy: false,
    sourceText, generate: vi.fn(async () => ({ ok: true })), videoAvailability: 'ready', videoClipReady: true, ...props, ...extra };
  await act(async () => root.render(React.createElement(Harness, props)));
}
const button = name => [...host.querySelectorAll('button')].find(node => node.textContent === name || node.getAttribute('aria-label') === name);
const field = name => [...host.querySelectorAll('label')].find(node => node.textContent.trim() === name)?.querySelector('input');
const urlInput = () => host.querySelector('input[type="url"]');
const choosers = () => [...host.querySelectorAll('[data-transcript-chooser]')];
async function click(value) { const node = typeof value === 'string' ? button(value) : value; expect(node).toBeTruthy(); await act(async () => node.click()); }
async function change(node, value) {
  expect(node).toBeTruthy();
  await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function enterClip(start = '0:40', end = '1:20') {
  await change(urlInput(), canonical); await click(field('Clip'));
  await change(field('Start time'), start); await change(field('End time'), end);
}
function packetFor(snapshots, count = 2) {
  const packet = api.packet('plants', null);
  for (const snap of snapshots) api.merge(packet, api.transcriptPassages(snap).slice(0, count));
  return packet;
}

describe('video clip time and cache helpers', () => {
  it.each([['0', 0], ['40', 40], ['1:20', 80], ['01:02:03', 3723], ['75:00', 4500], [' 2:05 ', 125]])('parses explicit time %s', (input, seconds) => expect(parseTime(input)).toBe(seconds));
  it.each(['', '-1', '1.5', '1:60', '1:2', '1:00:00:00', 'Infinity', '9007199254740992', null])('rejects invalid time %j', input => expect(parseTime(input)).toBeNull());
  it.each([['?t=40', 40], ['?t=1m20s', 80], ['?start=90', 90], ['#t=2m', 120], ['?t=1h2m3s', 3723]])('reads a single linked start %s', (suffix, seconds) => expect(linkedStart('https://youtu.be/AbCdEfGhI_1' + suffix)).toBe(seconds));
  it.each(['?t=40&t=80', '?t=40&start=80', '?t=-1', '?t=1.5', '?t=invalid', '?list=playlist'])('does not guess an ambiguous or malformed linked start %s', suffix => expect(linkedStart('https://youtu.be/AbCdEfGhI_1' + suffix)).toBeNull());
  it('separates whole video and clip cache identities while retaining one source URL', () => {
    const whole = snapshot(), first = snapshot({ videoClip: clipA }), second = snapshot({ videoClip: clipB });
    const cache = [whole, first, second].reduce((value, snap) => storeTranscript(value, 'plants', snap), null);
    expect(cache.entries).toHaveLength(3);
    expect(new Set(cache.entries.map(transcriptKey)).size).toBe(3);
    expect(new Set(cache.entries.map(value => value.url)).size).toBe(1);
    const refreshed = storeTranscript(cache, 'plants', snapshot({ videoClip: clipA, title: 'Refreshed clip' }));
    expect(refreshed.entries).toHaveLength(3); expect(refreshed.entries[2].title).toBe('Refreshed clip');
    expect(refreshed.entries[0].videoClip).toBeUndefined(); expect(refreshed.entries[1].videoClip).toEqual(clipB);
  });
  it('requires both clip transport and range-aware evidence support', () => {
    expect(clipReady()).toBe(true);
    window.callGemini = videoFn({ _alloflowVideoClipInput: false }); expect(clipReady()).toBe(false);
    window.callGemini = videoFn(); window.AlloModules.SourceResearchReview = { ...api, transcriptKey: undefined }; expect(clipReady()).toBe(false);
  });
});

describe('explicit video clip controls', () => {
  it('defaults timestamped URLs to whole video and requires opting into linked start', async () => {
    await render(); await change(urlInput(), 'https://youtu.be/AbCdEfGhI_1?t=1m20s');
    expect(field('Whole video').checked).toBe(true); expect(field('Start time')).toBeUndefined();
    expect(host.textContent).toContain('Link starts at 1:20. Whole video selected.');
    await click('Read video'); expect(props.generate.mock.lastCall[0].videoClip).toBeUndefined();
    await click('Use linked start time');
    expect(field('Start time').value).toBe('1:20'); expect(field('End time').value).toBe('');
    expect(button('Read clip').disabled).toBe(true); expect(document.activeElement).toBe(field('Start time'));
  });
  it('sends parsed clip bounds only after an explicit read action', async () => {
    await render(); await enterClip(); expect(props.generate).not.toHaveBeenCalled();
    await click('Read clip');
    expect(props.generate).toHaveBeenCalledTimes(1);
    expect(props.generate.mock.lastCall[0]).toMatchObject({ researchAction: 'url', url: canonical, videoClip: clipA });
  });
  it.each([['0:40', ''], ['0:40', '0:40'], ['1:20', '0:40'], ['-1', '2:00'], ['1:60', '2:00'], ['1.5', '2:00']])('disables invalid clip %s to %s without request', async (start, end) => {
    await render(); await enterClip(start, end); expect(button('Read clip').disabled).toBe(true);
    await click('Read clip'); expect(props.generate).not.toHaveBeenCalled();
  });
  it('requires an explicit whole-video choice after a clipped request fails', async () => {
    await render({ generate: vi.fn(async () => ({ ok: false, error: 'Video clip could not be read.' })) });
    await enterClip(); await click('Read clip');
    expect(field('Clip').checked).toBe(true); expect(props.generate).toHaveBeenCalledTimes(1);
    await click(field('Whole video')); await click('Read video');
    expect(props.generate).toHaveBeenCalledTimes(2); expect(props.generate.mock.lastCall[0].videoClip).toBeUndefined();
  });
  it.each(['provider', 'managed', 'disabled', 'unavailable'])('preflights %s without changing providers or requesting', async status => {
    await render({ videoAvailability: status }); await change(urlInput(), canonical);
    expect(field('Clip').disabled).toBe(true); expect(button('Read video').disabled).toBe(true);
    await click('Read video'); expect(props.generate).not.toHaveBeenCalled();
  });
  it('explains an old clip transport while leaving whole-video reading available', async () => {
    await render({ videoClipReady: false }); await change(urlInput(), canonical);
    expect(field('Clip').disabled).toBe(true); expect(button('Read video').disabled).toBe(false);
    expect(host.textContent).toContain('The video clip reader is not ready.');
  });
  it('retains a same-video range across aliases but clears it for a different video', async () => {
    await render(); await enterClip();
    await change(urlInput(), 'https://youtu.be/AbCdEfGhI_1?t=90'); expect(field('Clip').checked).toBe(true); expect(field('Start time').value).toBe('0:40');
    await change(urlInput(), 'https://youtu.be/AbCdEfGhI_2');
    expect(field('Whole video').checked).toBe(true); expect(field('Start time')).toBeUndefined();
  });
  it('retains a draft on a same-topic remount but clears it after a topic change', async () => {
    await render(); await enterClip(); const draft = latestDraft;
    await render({ panelKey: 'reopened' }); expect(latestDraft).toBe(draft); expect(field('End time').value).toBe('1:20');
    await render({ topic: 'oceans' }); expect(latestDraft).toBeNull();
    await render({ topic: 'plants' }); expect(urlInput().value).toBe(''); expect(field('End time')).toBeUndefined();
    expect(props.generate).not.toHaveBeenCalled();
  });
  it('refocuses the start field when choosing the same source clip repeatedly', async () => {
    const snap = snapshot({ videoClip: clipA });
    await render({ initialPacket: packetFor([snap]) });
    await click('Choose clip');
    expect(document.activeElement).toBe(field('Start time'));
    await act(async () => button('Choose clip').focus());
    expect(document.activeElement).toBe(button('Choose clip'));
    await click('Choose clip');
    expect(document.activeElement).toBe(field('Start time'));
    expect(field('Clip').checked).toBe(true);
    expect(props.generate).not.toHaveBeenCalled();
  });
});

describe('clip-aware transcript review', () => {
  it('identifies the clip in its summary without repeating the range in the expanded introduction', async () => {
    const snap = snapshot({ videoClip: clipA });
    await render({ initialPacket: packetFor([snap]), initialCache: { topic: 'plants', entries: [snap] } });
    const chooser = choosers()[0];
    expect(chooser.querySelector('summary').textContent).toContain('Requested clip 0:40 to 1:20');
    const introduction = [...chooser.querySelectorAll(':scope > div > p')].map(node => node.textContent).join(' ');
    expect(introduction).not.toContain('Requested clip');
    expect(chooser.querySelector('[data-transcript-candidate]').textContent).toContain('Requested clip 0:40 to 1:20');
  });
  it('keeps two clip choosers under one source and counts retained clips toward capacity', async () => {
    const first = snapshot({ videoClip: clipA }), second = snapshot({ videoClip: clipB });
    const firstPassages = api.transcriptPassages(first), secondIds = api.transcriptPassages(second).slice(0, 2).map(value => value.id);
    await render({ initialPacket: packetFor([first, second]), initialCache: { topic: 'plants', entries: [first, second] } });
    expect(host.querySelectorAll('[data-research-id]')).toHaveLength(1); expect(choosers()).toHaveLength(2);
    const firstChooser = choosers()[0];
    expect(firstChooser.textContent).toContain('Requested clip 0:40 to 1:20');
    expect(firstChooser.textContent).toContain('2 of 2 excerpt slots selected');
    const candidate = id => firstChooser.querySelector(`[data-transcript-candidate="${id}"] input`);
    expect(candidate(firstPassages[2].id).disabled).toBe(true);
    await click(candidate(firstPassages[0].id)); await click(candidate(firstPassages[2].id));
    await click([...firstChooser.querySelectorAll('button')].find(node => node.textContent === 'Apply excerpts'));
    expect(latestPacket.items).toHaveLength(4);
    expect(secondIds.every(id => latestPacket.items.some(value => value.id === id))).toBe(true);
    expect(props.generate).not.toHaveBeenCalled();
  });
  it('reloads a missing clip using its saved bounds rather than reading the whole video', async () => {
    const snap = snapshot({ videoClip: clipA });
    await render({ initialPacket: packetFor([snap]), initialCache: null });
    const reload = [...host.querySelectorAll('button')].find(node => node.textContent === 'Load clip 0:40 to 1:20');
    expect(reload).toBeTruthy(); await click(reload);
    expect(props.generate.mock.lastCall[0]).toMatchObject({ researchAction: 'url', url: canonical, videoClip: clipA });
  });
  it('keeps clip snapshots memory-only and sends only selected evidence to writing', async () => {
    const snap = snapshot({ videoClip: clipA }), storage = vi.spyOn(Storage.prototype, 'setItem');
    const generate = vi.fn(async options => {
      if (options.researchAction) { options.onVideoTranscript(snap); return { ok: true, packet: packetFor([snap]) }; }
      return { ok: true };
    });
    await render({ generate }); await enterClip(); await click('Read clip');
    expect(latestCache.entries[0].videoClip).toEqual(clipA); expect(choosers()).toHaveLength(1);
    await click('Generate from included passages');
    const writer = generate.mock.lastCall[0]; expect(writer.reviewedResearch.items).toHaveLength(2);
    expect(writer.transcripts).toBeUndefined(); expect(JSON.stringify(writer)).not.toContain('Section 10:');
    expect(storage).not.toHaveBeenCalled();
  });
});
