import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const escapeXml = (value) => String(value == null ? '' : value).replace(/[<>&'\"]/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '\"': '&quot;',
}[char]));

let React;
let ReactDOMClient;
let act;
let StorybookExportModal;
let originalBlob;
let originalArtifactStore;
let originalCallGemini;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('view_storybook_export_modal_module.js');
  StorybookExportModal = window.AlloModules.StorybookExportModal.StorybookExportModal;
  originalBlob = globalThis.Blob;
  originalArtifactStore = window.AlloModules.StudentArtifactStore;
  originalCallGemini = window.callGemini;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) host.remove();
  host = null;
  globalThis.Blob = originalBlob;
  window.Blob = originalBlob;
  window.AlloModules.StudentArtifactStore = originalArtifactStore;
  window.callGemini = originalCallGemini;
  vi.restoreAllMocks();
});

function createExport(live) {
  return window.AlloModules.createExport({
    liveRef: { current: live },
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    escapeXml,
    generateUUID: () => '12345678-1234-1234-1234-123456789abc',
  });
}

function installDownloadCapture() {
  const blobs = new Map();
  const downloads = [];
  let serial = 0;
  class CaptureBlob {
    constructor(parts, options = {}) {
      this.content = parts.map(String).join('');
      this.type = options.type || '';
    }
  }
  globalThis.Blob = CaptureBlob;
  window.Blob = CaptureBlob;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    const url = `blob:storybook-${++serial}`;
    blobs.set(url, blob);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    downloads.push({ filename: this.download, blob: blobs.get(this.href) });
  });
  return downloads;
}

function storyLive(overrides = {}) {
  return {
    adventureState: {
      history: [
        { type: 'scene', text: 'A river rises.' },
        { type: 'choice', text: 'Build a safe bridge.' },
        { type: 'feedback', text: 'The bridge holds. (+5 XP)' },
        { type: 'scene', text: 'A river rises.' },
      ],
      currentScene: null,
      imageCache: {},
      level: 3,
    },
    generatedContent: { id: 'adventure-water-cycle' },
    sourceTopic: 'Water Cycle',
    selectedVoice: 'Kore',
    voiceSpeed: 1.2,
    currentUiLanguage: 'English',
    setShowStorybookExportModal: vi.fn(),
    setIsProcessing: vi.fn(),
    rehydrateHistoryWithImages: async (history) => history,
    parseMarkdownToHTML: (value) => `<p>${escapeXml(value)}</p>`,
    addToast: vi.fn(),
    t: (key) => key,
    ...overrides,
  };
}

const contractAudio = (base64) => ({
  encoding: 'base64',
  mime: 'audio/mpeg',
  base64,
  source: 'ai-played',
  vetted: true,
  vettingMethod: 'owner-approved',
  synthesisProfile: {
    voice: 'Kore', language: 'English', provider: 'gemini',
    synthesisRate: 1.2, voiceResolverVersion: 2,
  },
});

describe('Adventure narrated Storybook artifact export', () => {
  it('does not opt text-only exports into the narration recovery cache', async () => {
    window.AlloModules.StudentArtifactStore = { save: vi.fn() };
    window.callGemini = vi.fn().mockResolvedValue('Text-only summary.');
    const prepareStorybookSummary = vi.fn(), prepareReadAloudArtifactAudio = vi.fn();
    const write = vi.fn(); vi.spyOn(window, 'open').mockReturnValue({ document: { write, close: vi.fn() } });
    expect(await createExport(storyLive({ prepareStorybookSummary, prepareReadAloudArtifactAudio })).handleExportStorybook({ includeNarration: false })).toBe(true);
    expect(write).toHaveBeenCalledWith(expect.stringContaining('Text-only summary.'));
    expect(prepareStorybookSummary).not.toHaveBeenCalled(); expect(prepareReadAloudArtifactAudio).not.toHaveBeenCalled();
  });
  it.each(['summary', 'narration'])('does not download a competing partial export when %s is already preparing', async phase => {
    const downloads = installDownloadCapture(), save = vi.fn(); window.AlloModules.StudentArtifactStore = { save };
    const busy = async () => { throw Object.assign(new Error('Already preparing.'), { code: 'preparation-in-progress' }); };
    const live = storyLive({ prepareStorybookSummary: phase === 'summary' ? busy : async () => ({ text: 'Ready.', recovery: { state: 'saved' } }),
      prepareReadAloudArtifactAudio: busy });
    expect(await createExport(live).handleExportStorybook({ includeNarration: true })).toBe(false);
    expect(downloads).toHaveLength(0); expect(save).not.toHaveBeenCalled();
  });
  it('recovers the matching epilogue and exposes session-only text without an extra provider call', async () => {
    const downloads = installDownloadCapture();
    window.AlloModules.StudentArtifactStore = { save: vi.fn() };
    window.callGemini = vi.fn().mockRejectedValue(new Error('offline'));
    const prepareStorybookSummary = vi.fn(async () => ({ text: 'Saved epilogue.', recovery: { resumed: true, state: 'session-only' } }));
    const live = storyLive({ prepareStorybookSummary, prepareReadAloudArtifactAudio: async () => ({}) });
    expect(await createExport(live).handleExportStorybook({ includeNarration: true })).toBe(true);
    expect(window.callGemini).not.toHaveBeenCalled();
    expect(prepareStorybookSummary).toHaveBeenCalledWith(expect.objectContaining({ ownerApproved: true, scopeId: 'story', prompt: expect.stringContaining('Write in English.') }));
    expect(JSON.parse(prepareStorybookSummary.mock.calls[0][0].input)).toEqual([1, 'Water Cycle', live.adventureState.history.map(entry => [entry.type, entry.text]), 'English']);
    expect(downloads[0].blob.content).toContain('Saved epilogue.');
    expect(live.addToast).toHaveBeenCalledWith(expect.stringContaining('epilogue is available for this session'), 'warning');
  });
  it('includes edits beyond the summary prompt limit and language changes in recovery identity', async () => {
    installDownloadCapture(); window.AlloModules.StudentArtifactStore = { save: vi.fn() };
    const prepareStorybookSummary = vi.fn(async () => ({ text: 'Summary.', recovery: { state: 'saved' } }));
    const live = storyLive({ prepareStorybookSummary, adventureState: { history: [{ type: 'scene', text: 'A'.repeat(16000) }, { type: 'choice', text: 'First.' }] } });
    const api = createExport(live);
    await api.handleExportStorybook({ includeNarration: true });
    live.adventureState.history[1].text = 'Edited.';
    await api.handleExportStorybook({ includeNarration: true });
    live.currentUiLanguage = 'Spanish';
    await api.handleExportStorybook({ includeNarration: true });
    const [first, edited, language] = prepareStorybookSummary.mock.calls.map(([request]) => request);
    expect(first.prompt).toBe(edited.prompt); expect(first.input).not.toBe(edited.input);
    expect(edited.input).not.toBe(language.input); expect(language.prompt).toContain('Write in Spanish.');
  });
  it('exports the complete journey without an epilogue when offline and no matching summary exists', async () => {
    const downloads = installDownloadCapture(), save = vi.fn(); window.AlloModules.StudentArtifactStore = { save };
    const prepareStorybookSummary = vi.fn().mockRejectedValue(new Error('offline'));
    const prepareReadAloudArtifactAudio = vi.fn(async () => ({ audioBySegmentId: { 'turn:1:scene:scene:0': contractAudio('Z29vZA==') } }));
    const live = storyLive({ prepareStorybookSummary, prepareReadAloudArtifactAudio });
    expect(await createExport(live).handleExportStorybook({ includeNarration: true })).toBe(true);
    const html = downloads.find(item => item.filename.endsWith('.html')).blob.content;
    expect(html).toContain('Epilogue unavailable. The complete journey follows.');
    expect(html).not.toContain('data-scene-id="epilogue"');
    expect(html).toContain('Build a safe bridge.'); expect(html).toContain('data:audio/mpeg;base64,Z29vZA==');
    const artifact = JSON.parse(downloads.find(item => item.filename.endsWith('.json')).blob.content);
    expect(artifact.transcript.segmentCount).toBe(4);
    expect(save.mock.calls[0][0].summary).toContain('4 journey entries');
    expect(prepareReadAloudArtifactAudio.mock.calls[0][0].segments.some(segment => segment.segmentId === 'epilogue:summary')).toBe(false);
    expect(live.addToast).toHaveBeenCalledWith(expect.stringContaining('retry online'), 'warning');
  });
  it('blocks a duplicate export while story preparation is active and releases the request after cancellation', async () => {
    const downloads = installDownloadCapture(), controller = new AbortController(), save = vi.fn();
    window.AlloModules.StudentArtifactStore = { save };
    let finish;
    const prepareStorybookSummary = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValue({ text: 'Retry summary.', recovery: { state: 'saved' } });
    const live = storyLive({ prepareStorybookSummary }); const api = createExport(live);
    const first = api.handleExportStorybook({ includeNarration: true, signal: controller.signal });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    expect(await api.handleExportStorybook({ includeNarration: true })).toBe(false);
    expect(prepareStorybookSummary).toHaveBeenCalledOnce();
    controller.abort(); finish({ text: 'Discarded summary.' }); expect(await first).toBe(false);
    expect(downloads).toHaveLength(0); expect(save).not.toHaveBeenCalled();
    expect(await api.handleExportStorybook({ includeNarration: true })).toBe(true); expect(downloads).toHaveLength(2);
  });
  const pictureWarningKey = 'export.storybook.pictures_not_embedded';
  const pictureWarningFallback = 'Some Storybook pictures are not embedded. Their availability on another device is not verified.';
  it.each([
    ['translated', () => 'Translated picture-portability warning.', 'Translated picture-portability warning.'],
    ['missing', () => undefined, pictureWarningFallback],
    ['null', () => null, pictureWarningFallback],
    ['blank', () => '', pictureWarningFallback],
    ['whitespace', () => ' \t ', pictureWarningFallback],
    ['returned key', () => pictureWarningKey, pictureWarningFallback],
    ['non-string object', () => ({ text: 'Unexpected group' }), pictureWarningFallback],
    ['non-string number', () => 42, pictureWarningFallback],
    ['throwing', () => { throw new Error('Translation lookup failed'); }, pictureWarningFallback],
  ])('reports external pictures with a %s translation lookup and preserves portability limits', async (_case, lookup, expectedWarning) => {
    const downloads = installDownloadCapture();
    window.callGemini = vi.fn().mockResolvedValue('You completed the journey.');
    const live = storyLive({ adventureState: { history: [{ type: 'scene', text: 'A river rises.', image: 'https://example.test/river.png' }], level: 3 },
      t: vi.fn(key => key === pictureWarningKey ? lookup() : key),
      prepareReadAloudArtifactAudio: async () => ({ audioBySegmentId: { 'epilogue:summary': contractAudio('Z29vZA==') } }) });
    const save = vi.fn(); window.AlloModules.StudentArtifactStore = { save };
    expect(await createExport(live).handleExportStorybook({ includeNarration: true, includeImages: true })).toBe(true);
    const html = downloads.find(item => item.filename.endsWith('.html')).blob.content;
    expect(html).toContain('Pictures requiring the original source: 1');
    expect(live.t).toHaveBeenCalledWith(pictureWarningKey);
    expect(live.addToast).toHaveBeenCalledWith(expectedWarning, 'warning');
    expect(save.mock.calls[0][0].artifact.readAloudReference.pictures).toMatchObject({ external: 1, decoding: 'unverified' });
    expect(live.addToast.mock.calls.some(([text]) => text.includes('self-contained'))).toBe(false);
  });
  it('does not save a manifest or download after cancellation during story preparation', async () => {
    const downloads = installDownloadCapture(), controller = new AbortController();
    const save = vi.fn(); window.AlloModules.StudentArtifactStore = { save };
    window.callGemini = vi.fn(async () => { controller.abort(); return 'You completed the journey.'; });
    const prepareReadAloudArtifactAudio = vi.fn();
    expect(await createExport(storyLive({ prepareReadAloudArtifactAudio })).handleExportStorybook({ includeNarration: true, signal: controller.signal })).toBe(false);
    expect(prepareReadAloudArtifactAudio).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled(); expect(downloads).toHaveLength(0);
  });
  it('uses the shared flat-segment callback, embeds valid clips, and saves only a lightweight manifest', async () => {
    const downloads = installDownloadCapture();
    const save = vi.fn();
    window.AlloModules.StudentArtifactStore = { save };
    window.callGemini = vi.fn().mockResolvedValue('You completed the journey.');
    const progress = vi.fn();
    const prepareReadAloudArtifactAudio = vi.fn(async (options) => {
      options.onProgress({ completed: 2, total: options.segments.length, message: 'Narrating…' });
      return {
        audioBySegmentId: {
          'epilogue:summary': contractAudio('Z29vZA=='),
          'turn:1:scene:scene:0': contractAudio('***'),
        },
        total: options.segments.length,
        prepared: 1,
        failed: 1,
        errors: [],
      };
    });
    const live = storyLive({ prepareReadAloudArtifactAudio });
    const api = createExport(live);
    const open = vi.spyOn(window, 'open');

    await expect(api.handleExportStorybook({
      includeImages: false,
      includeNarration: true,
      keepModalOpen: true,
      onProgress: progress,
    })).resolves.toBe(true);

    expect(open).not.toHaveBeenCalled();
    expect(live.setShowStorybookExportModal).not.toHaveBeenCalled();
    expect(prepareReadAloudArtifactAudio).toHaveBeenCalledOnce();
    const request = prepareReadAloudArtifactAudio.mock.calls[0][0];
    expect(request).toMatchObject({
      ownerApproved: true,
      recoverPreparedAudio: true,
      resourceType: 'adventure-storybook-read-aloud',
      adapterId: 'adventure-storybook-artifact',
      scopeId: 'story',
      source: 'adventure-owner-export',
      defaultVoice: 'Kore',
      language: 'English',
      speed: 1.2,
    });
    expect(request).not.toHaveProperty('scenes');
    expect(request.segments.map((segment) => segment.segmentId)).toEqual([
      'epilogue:summary',
      'turn:1:scene:scene:0',
      'turn:1:scene:choice:0',
      'turn:1:scene:feedback:0',
      'turn:2:scene:scene:0',
    ]);
    expect(request.segments.every((segment) => segment.voice === 'Kore')).toBe(true);
    expect(JSON.stringify(request)).not.toContain('Puck');

    expect(downloads).toHaveLength(2);
    const htmlDownload = downloads.find((entry) => entry.filename.endsWith('.html'));
    const jsonDownload = downloads.find((entry) => entry.filename.endsWith('.json'));
    expect(htmlDownload.blob.content).toContain('data:audio/mpeg;base64,Z29vZA==');
    expect(htmlDownload.blob.content).not.toContain('base64,***');
    expect(htmlDownload.blob.content).toContain('id="alloflow-read-aloud-artifact"');
    const artifact = JSON.parse(jsonDownload.blob.content);
    expect(artifact).toMatchObject({
      schema: 'alloflow.read-aloud-artifact',
      artifactType: 'adventure-storybook-read-aloud',
      transcript: { sceneCount: 3, segmentCount: 5 },
    });
    expect(artifact.scenes.flatMap((scene) => scene.segments).filter((segment) => segment.audio)).toHaveLength(1);

    expect(save).toHaveBeenCalledOnce();
    const storedManifest = save.mock.calls[0][0];
    expect(storedManifest.artifact.readAloudReference).toMatchObject({
      status: 'downloaded-with-audio', transport: 'download', audioClipCount: 1,
    });
    expect(JSON.stringify(storedManifest)).not.toContain('Z29vZA==');
    expect(JSON.stringify(storedManifest)).not.toContain('"base64"');
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'narration', message: 'Narrating…' }));
  });

  it('degrades a missing narration dependency to valid text HTML and contract JSON', async () => {
    const downloads = installDownloadCapture();
    window.AlloModules.StudentArtifactStore = { save: vi.fn() };
    window.callGemini = vi.fn().mockResolvedValue('Text remains available.');
    const live = storyLive();

    await expect(createExport(live).handleExportStorybook({ includeNarration: true })).resolves.toBe(true);

    const artifact = JSON.parse(downloads.find((entry) => entry.filename.endsWith('.json')).blob.content);
    expect(artifact.transcript.text).toContain('Text remains available.');
    expect(artifact.scenes.flatMap((scene) => scene.segments).some((segment) => segment.audio)).toBe(false);
    expect(live.addToast).toHaveBeenCalledWith(expect.stringContaining('not connected'), 'warning');
  });

  it('keeps generated export and modal modules byte-identical to deploy mirrors', () => {
    expect(readFileSync('desktop/web-app/public/export_module.js', 'utf8'))
      .toBe(readFileSync('export_module.js', 'utf8'));
    expect(readFileSync('desktop/web-app/public/view_storybook_export_modal_module.js', 'utf8'))
      .toBe(readFileSync('view_storybook_export_modal_module.js', 'utf8'));
  });
});

describe('Storybook export modal narration progress', () => {
  it('stops an active export without dismissing the dialog and offers another attempt', async () => {
    let finish, request;
    const close = vi.fn();
    const handleExportStorybook = vi.fn(options => { request = options; return new Promise(resolve => { finish = resolve; }); });
    host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
    await act(async () => root.render(React.createElement(StorybookExportModal, { handleExportStorybook, handleSetShowStorybookExportModalToFalse: close,
      setShowStorybookExportModal: close, isProcessing: false, t: key => key })));
    expect(host.textContent).toContain('recovery copy is saved on this device when space allows');
    await act(async () => host.querySelector('[data-help-key="export_storybook_images"]').click());
    const stop = [...host.querySelectorAll('button')].find(button => button.textContent === 'Stop export');
    expect(stop.disabled).toBe(false);
    await act(async () => stop.click()); expect(request.signal.aborted).toBe(true);
    await act(async () => finish(false));
    expect(close).not.toHaveBeenCalled();
    expect(host.querySelector('[role="status"]').textContent).toContain('Completed narration is kept');
    expect(host.querySelector('[data-help-key="export_storybook_images"]').disabled).toBe(false);
  });
  it('offers an accessible opt-in and keeps live spinner/progress feedback visible until export completes', async () => {
    let finish;
    const pending = new Promise((resolvePromise) => { finish = resolvePromise; });
    const handleExportStorybook = vi.fn(() => pending);
    const setShowStorybookExportModal = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(StorybookExportModal, {
        handleExportStorybook,
        handleSetShowStorybookExportModalToFalse: vi.fn(),
        isProcessing: false,
        setShowStorybookExportModal,
        t: (key) => key,
      }));
    });

    const checkbox = host.querySelector('#storybook-include-narration');
    expect(checkbox).not.toBeNull();
    expect(host.querySelector('label[for="storybook-include-narration"]').textContent).toContain('narrated TTS audio');
    await act(async () => { checkbox.click(); });
    const imageButton = host.querySelector('[data-help-key="export_storybook_images"]');
    await act(async () => { imageButton.click(); await Promise.resolve(); });

    const options = handleExportStorybook.mock.calls[0][0];
    expect(options).toMatchObject({ includeImages: true, includeNarration: true, keepModalOpen: true });
    expect(setShowStorybookExportModal).not.toHaveBeenCalled();
    expect(imageButton.disabled).toBe(true);
    expect(host.querySelector('[role="status"] [class*="animate-spin"]')).not.toBeNull();
    expect(host.querySelector('[role="dialog"]').getAttribute('aria-busy')).toBe('true');

    await act(async () => { options.onProgress({ completed: 2, total: 5, message: 'Narrating 2 of 5…' }); });
    expect(host.querySelector('[role="status"]').textContent).toContain('Narrating 2 of 5');
    expect(host.querySelector('progress').value).toBe(2);
    expect(host.querySelector('[class*="motion-reduce:animate-none"]')).not.toBeNull();

    await act(async () => { finish(true); await pending; });
    expect(setShowStorybookExportModal).toHaveBeenCalledWith(false);
  });
});
