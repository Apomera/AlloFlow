import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
// Mutation runs load scratch copies so a mutant never reaches the shared files.
const load = (name, env) => process.env[env] ? new Function(readFileSync(process.env[env], 'utf8'))() : loadAlloModule(name);

// Lesson images (2026-09-23): a teacher can swap a lesson picture for a
// Mulberry symbol or a screened Wikimedia photo. The picture keeps its
// description and carries its credit - shown under it and drawn into it.

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, ImageView, A;
const noop = () => {};
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  load('alt_text_module.js', 'ALLO_ALT_TEXT_CANDIDATE');
  load('view_image_module.js', 'ALLO_VIEW_IMAGE_CANDIDATE');
  ImageView = window.AlloModules.ImageView;
  A = window.AlloModules.AltText;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const CREDIT = { set: 'Wikimedia Commons', title: 'Water cycle', author: 'USGS', license: 'Public domain', via: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Water_cycle.jpg' };
const original = { id: 'image-a', type: 'image', data: { imageUrl: 'data:image/png;base64,b2xk', altText: 'AI diagram', altSource: 'vision', altHash: 'h', decorative: false, prompt: 'Water cycle', imageSource: 'ai-generated' } };
function props(resource, onUpdateResource, teacher = true) {
  return { t: () => '', generatedContent: resource, isTeacherMode: teacher, leveledTextLanguage: 'English', singleImageFileRef: React.createRef(), onUpdateResource, imageRefinementInput: '', addToast: noop };
}
function mount(p) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = next => act(() => root.render(React.createElement(ImageView, next)));
  render(p); return render;
}

describe('Regenerate and AI edits on a picked picture', () => {
  // The real host handler: Regenerate makes new AI art from the prompt.
  function regenerate(item) {
    if (!window.AlloModules.createHostHandlers) { window.warnLog = window.warnLog || (() => {}); load('host_handlers_module.js', 'ALLO_HOST_HANDLERS_CANDIDATE'); }
    let state = item;
    const deps = new Proxy({
      generatedContent: item, useLowQualityVisuals: false, setSingleImageOverride: noop, setIsProcessing: noop, setGenerationStep: noop, setError: noop,
      addToast: noop, warnLog: noop, t: k => k, callImagen: async () => 'data:image/png;base64,TkVXX0FJ', setGeneratedContent: v => { state = v; }, setHistory: noop,
    }, { get: (o, k) => (k in o ? o[k] : undefined) });
    return window.AlloModules.createHostHandlers(deps).handleRestoreImage().then(() => state);
  }

  it('drops the credit and description of a picked photo, which no longer describe the new picture', async () => {
    const photo = ImageView.replaceSingleImage(original, 'data:image/jpeg;base64,cGhvdG8=', { imageSource: 'wikimedia', altText: 'Arrows show water rising and falling.', altSource: 'vision', altHash: 'x', imageAttribution: CREDIT });
    const out = await regenerate(photo);
    expect(out.data.imageUrl).toBe('data:image/png;base64,TkVXX0FJ');
    expect(out.data.imageAttribution).toBeUndefined();
    expect(out.data).toMatchObject({ imageSource: 'ai-generated', altText: '', altSource: '' });
    expect(out.data.originalImage).toEqual(photo.data.originalImage); // Restore still works
    expect('imageCreditBand' in out.data).toBe(false);
  });

  it('leaves the fields of an AI picture alone', async () => {
    const out = await regenerate(original);
    expect(out.data).toMatchObject({ imageUrl: 'data:image/png;base64,TkVXX0FJ', altText: original.data.altText, altSource: original.data.altSource });
    expect('imageSource' in out.data).toBe('imageSource' in original.data);
  });

  it('an AI edit takes the credit band off first and draws a fresh "edited" credit after', async () => {
    if (!window.AlloModules.PhaseOHandlers) load('phase_o_misc_handlers_module.js', 'ALLO_PHASE_O_CANDIDATE');
    // Canvas stand-ins: each picture's size travels in its data URL ("800x620").
    vi.stubGlobal('Image', class { naturalWidth = 0; naturalHeight = 0; set src(value) {
      const size = /base64,(\d+)x(\d+)$/.exec(String(value)); if (size) { this.naturalWidth = Number(size[1]); this.naturalHeight = Number(size[2]); }
      if (value) queueMicrotask(() => this.onload());
    } });
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(), measureText: t => ({ width: String(t).length * 7 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (type) { return 'data:' + type + ';base64,' + this.width + 'x' + this.height; });
    const credited = { ...original, data: { ...original.data, imageUrl: 'data:image/jpeg;base64,800x620', imageSource: 'wikimedia', imageAttribution: CREDIT, imageCreditBand: 20 } };
    let state = credited;
    const callGeminiImageEdit = vi.fn(async () => 'data:image/png;base64,800x600');
    await window.AlloModules.PhaseOHandlers.handleRefineImage({
      generatedContent: credited, imageRefinementInput: 'make the sky bluer', leveledTextLanguage: 'English', t: k => k,
      setIsProcessing: noop, setGenerationStep: noop, setError: noop, addToast: noop, setImageRefinementInput: noop, setHistory: noop,
      setGeneratedContent: v => { state = v; }, callGeminiImageEdit, callGeminiVision: vi.fn(async () => '[]'),
    });
    // The model saw the picture without its credit band.
    expect(callGeminiImageEdit.mock.calls[0][1]).toBe('800x600');
    // A fresh credit, now saying "edited", is drawn under the edited picture, and its height recorded.
    expect(ctx.fillText.mock.calls.map(call => call[0]).join(' ')).toContain('edited');
    expect(state.data.imageAttribution).toMatchObject({ modified: true });
    const band = state.data.imageCreditBand;
    expect(band).toBeGreaterThan(0);
    expect(state.data.imageUrl).toBe('data:image/jpeg;base64,800x' + (600 + band));
  });

  it('a glossary AI refine also takes the credit band off first and redraws it', async () => {
    if (!window.AlloModules.createHostHandlers) { window.warnLog = window.warnLog || (() => {}); load('host_handlers_module.js', 'ALLO_HOST_HANDLERS_CANDIDATE'); }
    vi.stubGlobal('Image', class { naturalWidth = 0; naturalHeight = 0; set src(value) {
      const size = /base64,(\d+)x(\d+)$/.exec(String(value)); if (size) { this.naturalWidth = Number(size[1]); this.naturalHeight = Number(size[2]); }
      if (value) queueMicrotask(() => this.onload());
    } });
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(), measureText: t => ({ width: String(t).length * 7 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (type) { return 'data:' + type + ';base64,' + this.width + 'x' + this.height; });
    const entry = { term: 'leaf', def: 'A flat green part of a plant.', image: 'data:image/jpeg;base64,640x700', imageSource: 'wikimedia', imageAttribution: CREDIT, imageCreditBand: 60 };
    let committed = null;
    const task = { busy: noop, signal: undefined, commit: fn => { committed = { ...entry, ...fn() }; return true; }, visible: () => true, isCurrent: () => true, finish: noop };
    const callGeminiImageEdit = vi.fn(async () => 'data:image/png;base64,640x640');
    const deps = new Proxy({ generatedContent: { id: 'g', type: 'glossary', data: [entry] }, glossaryRefinementInputs: {}, _alloBeginGlossaryTask: () => task,
      setIsGeneratingTermImage: noop, setGlossaryRefinementInputs: noop, addToast: noop, warnLog: noop, t: k => k, callGeminiImageEdit }, { get: (o, k) => (k in o ? o[k] : undefined) });
    await window.AlloModules.createHostHandlers(deps).handleRefineGlossaryImage(0, 'make it brighter');
    expect(callGeminiImageEdit.mock.calls[0][1]).toBe('640x640'); // the model never saw the credit band
    expect(committed.imageAttribution).toMatchObject({ modified: true });
    expect(committed.imageCreditBand).toBeGreaterThan(0);
    expect(committed.image).toBe('data:image/jpeg;base64,640x' + (640 + committed.imageCreditBand));
    expect(ctx.fillText.mock.calls.map(call => call[0]).join(' ')).toContain('edited');
  });

  it('says a credited photo was edited once AI changes it', () => {
    expect(A.openImageCreditLine({ ...CREDIT, modified: true })).toBe(A.openImageCreditLine(CREDIT) + ', edited');
  });
});

describe('picked pictures carry their credit through replace and restore', () => {
  it('stores the credit and description, and Restore brings back the original without it', () => {
    const chosen = ImageView.replaceSingleImage(original, 'data:image/jpeg;base64,cGhvdG8=', { imageSource: 'wikimedia', altText: 'Arrows show water rising and falling.', altSource: 'vision', altHash: 'p', imageAttribution: CREDIT });
    expect(chosen.data).toMatchObject({ imageSource: 'wikimedia', altText: 'Arrows show water rising and falling.', altSource: 'vision', altHash: 'p', imageAttribution: CREDIT });
    const restored = ImageView.restoreSingleImage(JSON.parse(JSON.stringify(chosen)));
    expect(restored.data).toMatchObject({ imageUrl: original.data.imageUrl, altText: 'AI diagram', imageSource: 'ai-generated' });
    expect('imageAttribution' in restored.data).toBe(false);
  });

  it('drops a photo credit when the teacher then uploads their own picture', () => {
    const chosen = ImageView.replaceSingleImage(original, 'data:image/jpeg;base64,cGhvdG8=', { imageSource: 'wikimedia', imageAttribution: CREDIT });
    const uploaded = ImageView.replaceSingleImage(chosen, 'data:image/png;base64,bWluZQ==');
    expect(uploaded.data.imageSource).toBe('author-upload');
    expect('imageAttribution' in uploaded.data).toBe(false);
    // Restore still returns the ORIGINAL picture, not the photo in between.
    expect(ImageView.restoreSingleImage(uploaded).data.imageUrl).toBe(original.data.imageUrl);
  });
});

describe('credit shown under the picture', () => {
  it('shows students the credit and a link to its source', () => {
    const photo = { ...original, data: { ...original.data, imageSource: 'wikimedia', imageAttribution: CREDIT } };
    mount(props(photo, noop, false));
    const credit = host.querySelector('[data-image-credit]');
    expect(credit.textContent).toContain('"Water cycle" by USGS, public domain, via Wikimedia Commons');
    expect(credit.querySelector('a').getAttribute('href')).toBe(CREDIT.url);
  });
  it('shows no credit line for an AI or uploaded picture', () => {
    mount(props(original, noop, false));
    expect(host.querySelector('[data-image-credit]')).toBe(null);
  });
});

describe('finding a picture for a lesson', () => {
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const pngBlob = () => new Blob([Uint8Array.from(atob(PNG), c => c.charCodeAt(0))], { type: 'image/png' });
  async function waitFor(check) {
    for (let waited = 0; !check() && waited < 3000; waited += 20) await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    return check();
  }

  it('Close returns focus to the Find button that opened the panel', async () => {
    mount(props(original, vi.fn()));
    const finds = host.querySelectorAll('button[aria-label="Find a symbol or photo"]');
    const bottom = finds[finds.length - 1];
    await act(async () => bottom.click());
    const close = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Close');
    expect(close, 'close button').toBeTruthy();
    await act(async () => close.click());
    expect(host.querySelector('[data-classroom-image-picker]')).toBe(null);
    expect(document.activeElement).toBe(bottom);
  });

  it('closes the Find panel when another item opens, and never shows it on a multi-panel visual', () => {
    const render = mount(props(original, vi.fn()));
    act(() => host.querySelector('button[aria-label="Find a symbol or photo"]').click());
    expect(host.querySelector('[data-classroom-image-picker]'), 'open on the single picture').toBeTruthy();
    const panels = { ...original, id: 'image-panels', data: { ...original.data, visualPlan: { title: 'Cycle', panels: [{ imageUrl: 'data:image/png;base64,QQ==' }, { imageUrl: 'data:image/png;base64,Qg==' }] } } };
    act(() => root.render(React.createElement(ImageView, { ...props(panels, vi.fn()), VisualPanelGrid: () => null })));
    expect(host.querySelector('[data-classroom-image-picker]')).toBe(null);
    render(props({ ...original, id: 'image-b' }, vi.fn()));
    expect(host.querySelector('[data-classroom-image-picker]')).toBe(null);
  });

  it('closes the Find panel when a Regenerate turns the same picture into panels', () => {
    const render = mount(props(original, vi.fn()));
    act(() => host.querySelector('button[aria-label="Find a symbol or photo"]').click());
    expect(host.querySelector('[data-classroom-image-picker]')).toBeTruthy();
    const regenerated = { ...original, data: { ...original.data, visualPlan: { title: 'Cycle', panels: [{ imageUrl: 'data:image/png;base64,QQ==' }, { imageUrl: 'data:image/png;base64,Qg==' }] } } };
    render({ ...props(regenerated, vi.fn()), VisualPanelGrid: () => null });
    expect(host.querySelector('[data-classroom-image-picker]')).toBe(null);
  });

  it('reports a failure, not success, when the picture changed before the choice was applied', async () => {
    const toasts = [];
    const p = { ...props(original, vi.fn(() => false)), addToast: (message, kind) => toasts.push(kind) };
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [{ id: 1, text: 'water', picto: { id: 2, image_url: 'https://globalsymbols.com/uploads/water.svg' } }], blob: async () => new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' }) }));
    vi.stubGlobal('fetch', fetchImpl);
    vi.stubGlobal('Image', class { naturalWidth = 64; naturalHeight = 64; set src(value) { if (value) queueMicrotask(() => this.onload()); } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(), measureText: t => ({ width: String(t).length * 7 }) });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,c3ltYm9s');
    mount(p);
    await act(async () => host.querySelector('button[aria-label="Find a symbol or photo"]').click());
    const picker = host.querySelector('[data-classroom-image-picker]');
    const input = picker.querySelector('input[type=search]');
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'water'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => picker.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const use = 'button[aria-label="Use symbol: water"]';
    expect(await waitFor(() => host.querySelector(use))).toBeTruthy();
    await act(async () => host.querySelector(use).click());
    expect(await waitFor(() => toasts.length > 0)).toBe(true);
    expect(toasts).toEqual(['error']);
    expect(host.querySelector('[data-classroom-image-picker]'), 'panel stays open to try again').toBeTruthy();
  });

  it('offers no bottom Find button on a multi-panel visual, where a replaced picture is not shown', () => {
    const panels = { ...original, data: { ...original.data, visualPlan: { title: 'Cycle', panels: [{ imageUrl: 'data:image/png;base64,QQ==' }, { imageUrl: 'data:image/png;base64,Qg==' }] } } };
    mount(props(original, vi.fn()));
    const single = host.querySelectorAll('button[aria-label="Find a symbol or photo"]').length;
    act(() => root.render(React.createElement(ImageView, { ...props(panels, vi.fn()), VisualPanelGrid: () => React.createElement('div', { 'data-panel-grid': '' }) })));
    expect(host.querySelector('[data-panel-grid]'), 'multi-panel view').toBeTruthy();
    expect(single).toBe(2); // on the picture and in the toolbar
    expect(host.querySelectorAll('button[aria-label="Find a symbol or photo"]').length).toBe(0);
  });

  it('replaces the picture with a screened photo, keeping its description and credit', async () => {
    const commons = { query: { pages: { 3: { pageid: 3, index: 1, title: 'File:Water_cycle.jpg', imageinfo: [{ mime: 'image/jpeg',
      thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/3.jpg/330px-3.jpg', thumbwidth: 330, thumbheight: 220,
      descriptionurl: CREDIT.url, extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'USGS' }, Categories: { value: 'Water cycle' } } }] } } } };
    vi.stubGlobal('fetch', vi.fn(async (url) => String(url).startsWith('https://commons.wikimedia.org/w/api.php') ? { ok: true, json: async () => commons } : { ok: true, blob: async () => pngBlob() }));
    const savedVision = window.callGeminiVision;
    window.callGeminiVision = vi.fn(async () => JSON.stringify([{ index: 1, safe: true, relevant: true, alt: 'Arrows show water evaporating and falling as rain.' }]));
    vi.stubGlobal('Image', class { naturalWidth = 800; naturalHeight = 600; set src(value) { if (value) queueMicrotask(() => this.onload()); } });
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(), measureText: s => ({ width: String(s).length * 7 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,Y3JlZGl0ZWQ=');
    let current = original;
    const update = vi.fn((id, updater) => { if (current.id === id) current = updater(current); return true; });
    try {
      const render = mount(props(current, update));
      const opener = host.querySelector('button[aria-label="Find a symbol or photo"]');
      await act(async () => opener.click());
      const picker = host.querySelector('[data-classroom-image-picker]');
      expect(picker, 'shared picker opens').toBeTruthy();
      await act(async () => [...picker.querySelectorAll('button')].find(b => b.textContent === 'Photos (Wikimedia Commons)').click());
      const input = picker.querySelector('input[type=search]');
      await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'water cycle'); input.dispatchEvent(new Event('input', { bubbles: true })); });
      await act(async () => picker.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      const use = 'button[aria-label="Use photo: Arrows show water evaporating and falling as rain."]';
      expect(await waitFor(() => host.querySelector(use))).toBeTruthy();
      await act(async () => host.querySelector(use).click());
      expect(await waitFor(() => current.data.imageUrl === 'data:image/jpeg;base64,Y3JlZGl0ZWQ=')).toBe(true);
      // The panel closes; focus goes back to the Find button that opened it, not the page.
      expect(await waitFor(() => document.activeElement === opener)).toBe(true);
      expect(current.data).toMatchObject({ imageSource: 'wikimedia', altText: 'Arrows show water evaporating and falling as rain.', altSource: 'vision', decorative: false });
      expect(current.data.altHash).toBe(A.hashImage('data:image/jpeg;base64,Y3JlZGl0ZWQ='));
      expect(current.data.imageAttribution).toMatchObject({ author: 'USGS', license: 'Public domain', url: CREDIT.url });
      // The height of the credit drawn under it is kept, so an AI edit can redraw that credit.
      expect(current.data.imageCreditBand).toBeGreaterThan(0);
      expect(current.data.originalImage.imageUrl).toBe(original.data.imageUrl);
      // The credit is drawn into the picture for downloads.
      // Who made it, then the licence and source on a line of their own.
      expect(ctx.fillText.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['"Water cycle" by USGS', expect.stringContaining('public domain, via Wikimedia Commons')]));
      render(props(current, update));
      expect(host.querySelector('[data-image-credit]').textContent).toContain('by USGS');
    } finally {
      if (savedVision) window.callGeminiVision = savedVision; else delete window.callGeminiVision;
    }
  });
});
