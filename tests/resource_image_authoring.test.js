import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const SCENE = { type: 'excalidraw', version: 2, elements: [{ id: 'box', type: 'rectangle', x: 0, y: 0, width: 80, height: 60 }], files: {}, appState: { viewBackgroundColor: '#ffffff' } };
let H, root, host;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('image_asset_editor_module.js'); loadAlloModule('gemini_api_module.js'); loadAlloModule('ai_backend_module.js');
  H = window.AlloModules.ResourceImageTools;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  window.AlloImageGeneration.setEnabled(true); vi.restoreAllMocks();
});
async function mount(Component, props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Component, props))); return host;
}
const fixtures = [
  ['glossary', [{ id: 'g', term: 'river', def: 'Water flowing.' }], 1],
  ['word-sounds', [{ word: 'cat' }], 1],
  ['timeline', { items: [{ id: 't', event: 'Plant seed' }] }, 1],
  ['concept-sort', { items: [{ id: 's', content: 'Apple', categoryId: 'fruit' }] }, 1],
  ['anchor-chart', { sections: [{ id: 'a', label: 'Listen' }] }, 1],
  ['memory-aid', { cards: [{ id: 'm', title: 'Planet order', essentialFacts: ['Earth is third.'] }] }, 1],
  ['applied-challenge', { visual: { purpose: 'Show the setting' }, brief: { context: 'A park' } }, 1],
  ['image', { prompt: 'A tree' }, 1],
  ['image', { visualPlan: { panels: [{ id: 'p1', caption: 'Before' }, { id: 'p2', caption: 'After' }] } }, 2],
  ['quiz', { questions: [{ id: 'q', question: 'Which one?', options: ['A', 'B'], correctAnswer: 'A' }] }, 3],
  ['adventure', { turnCount: 2, currentScene: { text: 'In a forest' }, characters: [{ id: 'c', name: 'Guide' }], inventory: [{ id: 'i', name: 'Map' }] }, 3],
  ['persona', [{ name: 'Historian', avatarUrl: null }], 1],
  ['dbq', { sources: [{ id: 'd', imageUrl: '', text: 'A source' }] }, 1],
  ['note-taking', { blocks: [{ type: 'image', src: '' }] }, 1],
  ['memory-palace', { images: { locus1: PNG, locus2: '' } }, 2],
];
describe('image slot coverage and resource ownership', () => {
  it.each(fixtures)('%s: fills every declared slot without losing resource content', (type, data, count) => {
    const original = { id: 'resource', type, data, config: { grade: 5 } };
    const before = JSON.stringify(original), slots = H.resourceImageSlots(original);
    expect(slots).toHaveLength(count);
    for (const slot of slots) {
      const result = H.replaceResourceImage(original, slot, { dataUrl: PNG, scene: SCENE, alt: 'A teacher drawing.' });
      expect(result).not.toBe(original); expect(result.config).toEqual(original.config);
      expect(H.resourceImageSlots(result).find(s => s.key === slot.key).value).toBe(PNG);
      expect(JSON.parse(JSON.stringify(result)).imageAssets[slot.key].scene).toEqual(SCENE);
    }
    expect(JSON.stringify(original)).toBe(before);
  });
  it('keeps quiz choices as arrays and updates their exported descriptions', () => {
    const resource = { id: 'q', type: 'quiz', data: { questions: [{ question: 'Pick', options: ['red', 'blue'], correctAnswer: 'blue' }] } };
    const slot = H.resourceImageSlots(resource)[2];
    const next = H.replaceResourceImage(resource, slot, { dataUrl: PNG, alt: 'Blue square' });
    expect(Array.isArray(next.data.questions[0].optionImageUrls)).toBe(true);
    expect(next.data.questions[0].optionImageUrls[1]).toBe(PNG);
    expect(next.data.questions[0].optionImageAltTexts[1]).toBe('Blue square');
    expect(next.data.questions[0].correctAnswer).toBe('blue');
  });
  it('keeps image maps free of metadata masquerading as more image slots', () => {
    const resource = { id: 'palace', type: 'memory-palace', data: { images: { kitchen: PNG, hall: '' } } };
    const next = H.replaceResourceImage(resource, H.resourceImageSlots(resource)[0], { dataUrl: PNG, alt: 'Kitchen', scene: SCENE });
    expect(Object.keys(next.data.images)).toEqual(['kitchen', 'hall']);
    expect(H.resourceImageSlots(next)).toHaveLength(2);
  });
  it('preserves a document caption when a placeholder has no inner container', () => {
    const resource = { id: 'doc', type: 'document', data: '<figure data-img-placeholder="true">Add image<figcaption>Evidence</figcaption></figure>' };
    const next = H.replaceResourceImage(resource, H.resourceImageSlots(resource)[0], { dataUrl: PNG, alt: 'River' });
    expect(next.data).toContain('<figcaption>Evidence</figcaption>');
    expect(next.data).toContain('alt="River"');
  });
  it('updates the first visual panel and its export mirror and clears obsolete animation', () => {
    const resource = { id: 'p', type: 'image', data: { imageUrl: 'old', visualPlan: { panels: [{ id: 'one', imageUrl: 'old', frames: ['old'], failed: true, alt: 'old' }] } } };
    const next = H.replaceResourceImage(resource, H.resourceImageSlots(resource)[0], { dataUrl: PNG, alt: 'New image' });
    expect(next.data.imageUrl).toBe(PNG); expect(next.data.visualPlan.panels[0]).toMatchObject({ imageUrl: PNG, alt: 'New image', failed: false });
    expect(next.data.visualPlan.panels[0].frames).toBeUndefined();
  });
  it('removes stale glossary credit and descriptions, and synchronizes Word Sounds copies', () => {
    const word = { word: 'cat', image: 'old', imageAlt: 'Dog', imageAltHash: 'oldhash', imageAttribution: { author: 'old' } };
    const resource = { id: 'ws', type: 'word-sounds', data: [word], wsPreloadedWords: [{ ...word }] };
    const next = H.replaceResourceImage(resource, H.resourceImageSlots(resource)[0], { dataUrl: PNG, alt: 'Cat' });
    expect(next.data[0]).toMatchObject({ imageAlt: 'Cat', imageAltHash: '', imageAltSource: 'author' });
    expect(next.data[0].imageAttribution).toBeUndefined(); expect(next.wsPreloadedWords[0].image).toBe(PNG);
  });
  it('refuses a late drawing after an image replacement or a reordered question', () => {
    const resource = { id: 'q', type: 'quiz', data: { questions: [{ id: 'a', options: ['A'] }, { id: 'b', options: ['B'] }] } };
    const slot = H.resourceImageSlots(resource)[1];
    const changed = { ...resource, data: { questions: [...resource.data.questions].reverse() } };
    expect(H.replaceResourceImage(changed, slot, { dataUrl: PNG })).toBe(changed);
    const once = H.replaceResourceImage(resource, slot, { dataUrl: PNG });
    expect(H.replaceResourceImage(once, slot, { dataUrl: PNG })).toBe(once);
  });
  it('edits document images and empty placeholders without losing headings or captions', () => {
    const resource = { id: 'doc', type: 'document', data: { html: '<h1>Lesson</h1><figure data-img-placeholder="true"><div id="one-container">Add image</div><figcaption>Evidence</figcaption></figure><img src="old" alt="Old">' } };
    const slots = H.resourceImageSlots(resource); expect(slots).toHaveLength(2);
    const slot = slots.find(s => !s.value);
    const next = H.replaceResourceImage(resource, slot, { dataUrl: PNG, alt: 'Diagram', scene: SCENE });
    expect(next.data.html).toContain('<h1>Lesson</h1>'); expect(next.data.html).toContain('<figcaption>Evidence</figcaption>'); expect(next.data.html).toContain('alt="Diagram"');
    const updated = H.resourceImageSlots(next).find(s => s.key === slot.key);
    expect(updated.value).toBe(PNG); expect(next.imageAssets[slot.key].ownerId).toBe(updated.ownerId);
  });
});
describe('universal AI image preference', () => {
  it('starts on, remembers an explicit off, and exposes a labeled switch', async () => {
    expect(window.AlloImageGeneration.isEnabled()).toBe(true);
    await mount(window.AlloModules.AiImageGenerationToggle);
    const control = host.querySelector('[role=switch]'); expect(control.checked).toBe(true);
    await act(async () => control.click());
    expect(window.AlloImageGeneration.isEnabled()).toBe(false);
    expect(localStorage.getItem('alloflow_ai_image_generation_enabled')).toBe('false');
    expect(control.checked).toBe(false);
    localStorage.setItem('alloflow_ai_image_generation_enabled', 'true');
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: 'alloflow_ai_image_generation_enabled' })));
    expect(control.checked).toBe(true);
  });
  it('remains off in memory when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied'); });
    window.AlloImageGeneration.setEnabled(false); expect(window.AlloImageGeneration.isEnabled()).toBe(false);
  });
  it('cancels image signals without cancelling the text-generation signal, then allows fresh requests', () => {
    const textRequest = new AbortController(), imageSignal = window.AlloImageGeneration.signalFor(textRequest.signal);
    window.AlloImageGeneration.setEnabled(false);
    expect(imageSignal.aborted).toBe(true); expect(textRequest.signal.aborted).toBe(false);
    window.AlloImageGeneration.setEnabled(true);
    expect(imageSignal.aborted).toBe(true); expect(window.AlloImageGeneration.signalFor(textRequest.signal).aborted).toBe(false);
  });
  it('also cancels image requests in browsers without AbortSignal.any', () => {
    vi.spyOn(AbortSignal, 'any').mockImplementation(undefined);
    const original = AbortSignal.any;
    Object.defineProperty(AbortSignal, 'any', { configurable: true, writable: true, value: undefined });
    try {
      const textRequest = new AbortController(), signal = window.AlloImageGeneration.signalFor(textRequest.signal);
      window.AlloImageGeneration.setEnabled(false);
      expect(signal.aborted).toBe(true); expect(textRequest.signal.aborted).toBe(false);
    } finally { Object.defineProperty(AbortSignal, 'any', { configurable: true, writable: true, value: original }); }
  });
  it('discards an in-flight provider result after the preference is turned off', async () => {
    let complete;
    const provider = new window.AIProvider({ backend: 'openai', apiKey: 'test' });
    const run = vi.spyOn(provider, '_generateImageByBackend').mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const pending = provider.generateImage('Tree');
    await vi.waitFor(() => expect(run).toHaveBeenCalled());
    window.AlloImageGeneration.setEnabled(false); complete(PNG);
    expect(await pending).toBeNull();
  });
  it('skips all provider routes and local generation without making a request', async () => {
    window.AlloImageGeneration.setEnabled(false);
    const fetcher = vi.fn(), local = vi.fn(); window._sdTurbo = { ready: true, generate: local };
    for (const backend of ['gemini', 'openai', 'localai', 'ollama', 'alloflow-local']) {
      const provider = new window.AIProvider({ backend, apiKey: 'test', fetchWithRetry: fetcher });
      expect(await provider.generateImage('Tree')).toBeNull();
      expect(await provider.editImage('Edit', 'base64')).toBeNull();
      expect(await provider._trySdTurboImage('Tree')).toBeNull();
    }
    expect(fetcher).not.toHaveBeenCalled(); expect(local).not.toHaveBeenCalled(); delete window._sdTurbo;
  });
  it('blocks direct Gemini image edits even before the policy module loads', async () => {
    const api = window.AlloModules.createGeminiAPI({ apiKey: 'test', GEMINI_MODELS: { image: 'test-image' } });
    const policy = window.AlloImageGeneration; window.AlloImageGeneration = undefined;
    localStorage.setItem('alloflow_ai_image_generation_enabled', 'false');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    try { expect(await api.callGeminiImageEdit('Tree')).toBeNull(); expect(fetcher).not.toHaveBeenCalled(); }
    finally { window.AlloImageGeneration = policy; }
  });
});
describe('drawing handoff', () => {
  it('binds saves to the same origin, exact popup and token; rejects unrelated messages', async () => {
    const popup = { postMessage: vi.fn(), focus: vi.fn(), closed: false };
    const open = vi.spyOn(window, 'open').mockReturnValue(popup), onSave = vi.fn().mockResolvedValue(true);
    const cancel = H.openResourceDrawing({ scene: SCENE, title: 'River', onSave });
    const url = new URL(open.mock.calls[0][0]), token = url.searchParams.get('imageSlot');
    expect(url.origin).toBe(window.location.origin);
    const send = (type, extra = {}, origin = url.origin, source = popup) => window.dispatchEvent(new MessageEvent('message', { origin, source, data: { type, token, ...extra } }));
    send('alloasset-hello', {}, 'https://other.example'); expect(popup.postMessage).not.toHaveBeenCalled();
    send('alloasset-hello'); expect(popup.postMessage).toHaveBeenCalledWith(expect.objectContaining({ scene: SCENE }), url.origin);
    send('alloasset-save', { png: PNG, scene: SCENE }, url.origin, window); expect(onSave).not.toHaveBeenCalled();
    send('alloasset-save', { png: PNG, scene: SCENE }); await Promise.resolve();
    expect(onSave).toHaveBeenCalledOnce(); expect(popup.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'alloasset-saved' }), url.origin); cancel();
  });
  it('opens the CDN Whiteboard from hosts that do not serve one, and names the host origin', () => {
    const at = (href, origin) => { const u = new URL(href); return H.resourceDrawingWhiteboardUrl(u, 'tok', origin || u.origin); };
    const canvas = at('https://abc123-scf.usercontent.goog/', 'https://abc123-scf.usercontent.goog');
    expect(canvas.origin + canvas.pathname).toBe('https://alloflow-cdn.pages.dev/whiteboard/whiteboard.html');
    expect(canvas.searchParams.get('imageSlot')).toBe('tok'); expect(canvas.searchParams.get('host')).toBe('https://abc123-scf.usercontent.goog');
    expect(at('blob:https://x.googleusercontent.com/1-2', 'null').searchParams.get('host')).toBe('null');
    expect(at('blob:https://x.googleusercontent.com/1-2', 'null').origin).toBe('https://alloflow-cdn.pages.dev');
    expect(at('https://alloflow-cdn.pages.dev/app/index.html').pathname).toBe('/whiteboard/whiteboard.html');
    expect(at('https://preview1.alloflow-cdn.pages.dev/app/').origin).toBe('https://preview1.alloflow-cdn.pages.dev');
    expect(at('https://evil-alloflow-cdn.pages.dev.example/').origin).toBe('https://alloflow-cdn.pages.dev');
    expect(at('http://localhost:5173/sub/index.html').href).toMatch(/^http:\/\/localhost:5173\/sub\/whiteboard\/whiteboard\.html\?/);
  });
  it('retains a drawing in the popup when its resource rejects a stale save', async () => {
    const popup = { postMessage: vi.fn(), focus: vi.fn(), closed: false }; vi.spyOn(window, 'open').mockReturnValue(popup);
    const error = vi.fn(), cancel = H.openResourceDrawing({ onSave: () => false, onError: error });
    const token = new URL(window.open.mock.calls[0][0]).searchParams.get('imageSlot');
    window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, source: popup, data: { type: 'alloasset-save', token, png: PNG, scene: SCENE } }));
    await Promise.resolve(); expect(error).toHaveBeenCalled(); expect(popup.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'alloasset-error' }), window.location.origin); cancel();
  });
  it('says how to fall back while the Whiteboard is slow, then gives up with the same advice', () => {
    vi.useFakeTimers();
    try {
      const popup = { postMessage: vi.fn(), focus: vi.fn(), closed: false }; vi.spyOn(window, 'open').mockReturnValue(popup);
      const onStatus = vi.fn(), onError = vi.fn();
      H.openResourceDrawing({ onSave: vi.fn(), onStatus, onError });
      vi.advanceTimersByTime(7900); expect(onStatus).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200); expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('Export PNG')); expect(onError).not.toHaveBeenCalled();
      vi.advanceTimersByTime(22000); expect(onError).toHaveBeenCalledOnce(); expect(onError.mock.calls[0][0].message).toContain('Upload image');
    } finally { vi.useRealTimers(); }
  });
  it('a hello in time clears the slow notice', () => {
    vi.useFakeTimers();
    try {
      const popup = { postMessage: vi.fn(), focus: vi.fn(), closed: false }; vi.spyOn(window, 'open').mockReturnValue(popup);
      const onStatus = vi.fn(), onError = vi.fn(), cancel = H.openResourceDrawing({ onSave: vi.fn(), onStatus, onError });
      const token = new URL(window.open.mock.calls[0][0]).searchParams.get('imageSlot');
      window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, source: popup, data: { type: 'alloasset-hello', token } }));
      vi.advanceTimersByTime(40000);
      expect(onStatus.mock.calls.flat().join(' ')).not.toContain('Still connecting'); expect(onError).not.toHaveBeenCalled(); cancel();
    } finally { vi.useRealTimers(); }
  });
  it('keeps Upload usable while a drawing is pending, and uploading ends the drawing session', async () => {
    const popup = { postMessage: vi.fn(), focus: vi.fn(), closed: false }; vi.spyOn(window, 'open').mockReturnValue(popup);
    await mount(window.AlloModules.ResourceImageInput, { label: 'River', onApply: vi.fn().mockResolvedValue(true) });
    const draw = [...host.querySelectorAll('button')].find(b => b.textContent === 'Draw with Excalidraw');
    await act(async () => draw.click());
    expect(draw.disabled).toBe(true); expect(host.querySelector('input[type=file]').disabled).toBe(false);
  });
  it('offers upload and drawing for empty slots even when AI is off', async () => {
    window.AlloImageGeneration.setEnabled(false);
    await mount(window.AlloModules.ResourceImagesPanel, { resource: { id: 'g', type: 'glossary', data: [{ term: 'River' }] }, onUpdateResource: vi.fn() });
    await act(async () => host.querySelector('[aria-expanded]').click());
    expect(host.querySelector('input[type=file]')).not.toBeNull(); expect(host.textContent).toContain('Draw with Excalidraw'); expect(host.textContent).toContain('AI image generation is off');
  });
});
