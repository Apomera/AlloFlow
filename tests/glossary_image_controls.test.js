import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';
const source = transformSync(readFileSync(process.env.ALLO_GLOSSARY_CONTROLS_CANDIDATE || 'glossary_image_controls_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
const { GlossaryImageControls, searchGlossaryMulberry, prepareGlossaryMulberry, glossaryImageDescriptionHash } = new Function('React', source + '\nreturn { GlossaryImageControls, searchGlossaryMulberry, prepareGlossaryMulberry, glossaryImageDescriptionHash };')(React);
const cleanups = [];
let readers;
beforeAll(() => { window.React = React; loadAlloModule('glossary_helpers_module.js'); loadAlloModule('host_handlers_module.js'); });
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function mount(canEdit = true, overrides = {}) {
  readers = [];
  vi.stubGlobal('FileReader', class { constructor() { readers.push(this); } readAsDataURL() {} abort() {} });
  const entry = { entryId: 'leaf', term: 'Leaf', def: 'A plant part.', image: 'old-image', imageAlt: 'Old description', imageAltHash: glossaryImageDescriptionHash('old-image'), imageDecorative: false };
  const resource = { id: 'a', type: 'glossary', data: [entry] };
  const state = { resource, history: [resource] };
  const deps = { get generatedContent() { return state.resource; }, getGlossaryLive: () => state, glossaryTaskRegistry: new Map(), setGeneratedContent: update => { state.resource = update(state.resource); render(); }, setHistory: update => { state.history = update(state.history); render(); } };
  const beginTask = index => window.AlloModules.GlossaryHelpers.beginGlossaryTask(deps, index, ['term', 'image'], 'image');
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  function render() { root.render(React.createElement(GlossaryImageControls, { item: state.resource.data[0], index: 0, canEdit, beginTask, t: key => key, ...overrides })); }
  act(render);
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, state, beginTask, deps, rerender: () => act(render) };
}
async function upload(view, file = new File(['image'], 'leaf.png', { type: 'image/png' })) {
  const input = view.container.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  return input;
}
async function complete(reader = readers[0], result = 'data:image/png;base64,new') {
  await act(async () => { reader.result = result; reader.onload(); });
}
async function clickText(view, text) { const button = [...view.container.querySelectorAll('button')].find(button => button.textContent === text); expect(button).toBeTruthy(); await act(async () => button.click()); }
async function openDialog(view) { await act(async () => view.container.querySelector('button[aria-haspopup=dialog]').click()); }
async function openSearch(view) { await openDialog(view); await clickText(view, 'Find Mulberry symbol'); }
describe('glossary custom images', () => {
  it('saves an upload to the term and history, clears stale alt text, and resets the file field', async () => {
    const view = mount(); const input = await upload(view); await complete();
    expect(view.state.resource.data[0]).toMatchObject({ image: 'data:image/png;base64,new', imageAlt: '', imageAltHash: '', imageDecorative: false, imageSource: 'author-upload', imageAttribution: null });
    expect(view.state.history[0].data[0]).toEqual(view.state.resource.data[0]); expect(input.value).toBe('');
    expect(view.container.textContent).toContain('Image updated.');
  });
  it('rejects unsupported and oversized files without changing the current image', async () => {
    const view = mount(); await upload(view, new File(['<svg/>'], 'test.svg', { type: 'image/svg+xml' }));
    expect(view.container.querySelector('[role=alert]').textContent).toContain('Choose a PNG');
    await upload(view, { type: 'image/png', size: 11 * 1024 * 1024 });
    expect(view.container.querySelector('[role=alert]').textContent).toContain('10 MB');
    expect(readers).toHaveLength(0); expect(view.state.resource.data[0].image).toBe('old-image');
  });
  it('cannot replace a newer image or another resource after a delayed read', async () => {
    const view = mount(); await upload(view);
    const other = { id: 'b', type: 'glossary', data: [{ entryId: 'leaf', image: 'other-image' }] };
    view.state.resource = other; view.state.history.push(other); await complete();
    expect(view.state.resource).toBe(other); expect(view.state.history[0].data[0].image).toBe('data:image/png;base64,new');
    const next = mount(); await upload(next);
    next.state.resource = { ...next.state.resource, data: [{ ...next.state.resource.data[0], image: 'newer-image' }] };
    next.state.history[0] = next.state.resource; await complete();
    expect(next.state.resource.data[0].image).toBe('newer-image');
  });
  it('supersedes an in-flight AI generation through the same image task channel', async () => {
    const view = mount(); const aiTask = view.beginTask(0); await upload(view); await complete();
    expect(aiTask.signal.aborted).toBe(true); expect(aiTask.commit(() => ({ image: 'late-ai' }))).toBe(false);
    expect(view.state.resource.data[0].image).toBe('data:image/png;base64,new');
  });
  it('keeps the prior image after a file read error and allows a retry', async () => {
    const view = mount(); await upload(view); await act(async () => readers[0].onerror());
    expect(view.state.resource.data[0].image).toBe('old-image');
    expect(view.container.querySelector('[role=alert]').textContent).toContain('could not be read');
    expect(view.container.querySelector('button').disabled).toBe(false);
  });
  it('hides image editing outside Edit mode', () => { expect(mount(false).container.textContent).toBe(''); });
});
describe('glossary Mulberry search', () => {
  it('searches the Mulberry set in English and deduplicates safe image URLs', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [ { text: 'Leaf', picto: { id: 1, image_url: 'https://example.com/leaf.svg' } }, { picto: { image_url: 'https://example.com/leaf.svg' } }, { picto: { image_url: 'javascript:bad' } } ] })); vi.stubGlobal('fetch', fetchMock);
    expect(await searchGlossaryMulberry('leaf & tree')).toEqual([{ id: 1, label: 'Leaf', url: 'https://example.com/leaf.svg' }]);
    expect(fetchMock.mock.calls[0][0]).toContain('query=leaf%20%26%20tree&symbolset=mulberry&language=eng');
  });
  it('reports offline failures separately from an empty search', async () => {
    const view = mount(); vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, json: async () => [] }));
    await openSearch(view); expect(view.container.querySelector('[role=alert]').textContent).toContain('Check your connection');
    await act(async () => view.container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(view.container.querySelector('[role=alert]')).toBeNull(); expect(view.container.textContent).toContain('No symbols found');
  });
  it('ignores a late search result after closing and restores keyboard focus', async () => {
    const view = mount(); let resolve;
    vi.stubGlobal('fetch', () => new Promise(yes => { resolve = yes; })); await openSearch(view);
    await act(async () => view.container.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.activeElement).toBe(view.container.querySelector('button[aria-haspopup=dialog]'));
    await act(async () => resolve({ ok: true, json: async () => [{ text: 'Late leaf', picto: { image_url: 'https://example.com/leaf.svg' } }] }));
    expect(view.container.textContent).not.toContain('Late leaf');
  });
  it('embeds selected symbols as PNGs with attribution that survives image-only exports', async () => {
    mount(); vi.stubGlobal('fetch', async () => ({ ok: true, blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }) }));
    vi.stubGlobal('Image', class { naturalWidth = 100; naturalHeight = 200; set src(value) { if (value) queueMicrotask(() => this.onload()); } });
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,portable');
    const promise = prepareGlossaryMulberry({ url: 'https://example.com/leaf.svg' });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    await complete(readers[0], 'data:image/svg+xml;base64,svg');
    expect(await promise).toBe('data:image/png;base64,portable');
    expect(ctx.fillText.mock.calls.flat().join(' ')).toContain('Mulberry Symbols by Steve Lee | CC BY-SA 4.0');
    expect(ctx.drawImage).toHaveBeenCalled();
  });
});

describe('glossary classroom photos', () => {
  const RealFileReader = globalThis.FileReader;
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const pngBlob = () => new Blob([Uint8Array.from(atob(PNG), c => c.charCodeAt(0))], { type: 'image/png' });
  const commons = { query: { pages: { 7: { pageid: 7, index: 1, title: 'File:Green_leaf.jpg', imageinfo: [{ mime: 'image/jpeg',
    thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/7.jpg/330px-7.jpg', thumbwidth: 330, thumbheight: 250,
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Green_leaf.jpg',
    extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' }, Artist: { value: 'Ann' }, ImageDescription: { value: 'A leaf.' }, Categories: { value: 'Leaves' } } }] } } } };
  beforeAll(() => { loadAlloModule('alt_text_module.js'); });
  async function waitFor(check) {
    for (let waited = 0; !check() && waited < 3000; waited += 20) await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    return check();
  }

  it('offers photos alongside upload, Mulberry and generation', async () => {
    const view = mount(true, { onGenerate: vi.fn() });
    await openDialog(view);
    expect(view.container.textContent).toContain('Find photo');
  });

  it('saves a screened photo with its credit drawn in and its AI description kept', async () => {
    const view = mount();
    vi.stubGlobal('FileReader', RealFileReader);
    const fetched = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      fetched.push(String(url));
      return String(url).startsWith('https://commons.wikimedia.org/w/api.php') ? { ok: true, json: async () => commons } : { ok: true, blob: async () => pngBlob() };
    }));
    const vision = vi.fn(async () => JSON.stringify([{ index: 1, safe: true, relevant: true, alt: 'A green leaf with visible veins.' }]));
    const savedVision = window.callGeminiVision; window.callGeminiVision = vision;
    vi.stubGlobal('Image', class { naturalWidth = 960; naturalHeight = 720; set src(value) { if (value) queueMicrotask(() => this.onload()); } });
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(), measureText: text => ({ width: String(text).length * 7 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,credited');
    try {
      await openDialog(view); await clickText(view, 'Find photo');
      const picker = view.container.querySelector('[data-classroom-image-picker]');
      expect(picker, 'shared picker').toBeTruthy();
      expect(picker.querySelector('input[type=search]').value).toBe('Leaf');
      await act(async () => picker.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      expect(await waitFor(() => view.container.querySelector('button[aria-label="Use photo: A green leaf with visible veins."]'))).toBeTruthy();
      await act(async () => view.container.querySelector('button[aria-label="Use photo: A green leaf with visible veins."]').click());
      expect(await waitFor(() => view.state.resource.data[0].image === 'data:image/jpeg;base64,credited')).toBe(true);
      const saved = view.state.resource.data[0];
      expect(saved).toMatchObject({ imageSource: 'wikimedia', imageAlt: 'A green leaf with visible veins.', imageAltSource: 'vision', imageDecorative: false });
      expect(saved.imageAltHash).toBe(glossaryImageDescriptionHash('data:image/jpeg;base64,credited'));
      expect(saved.imageAttribution).toMatchObject({ set: 'Wikimedia Commons', author: 'Ann', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Green_leaf.jpg' });
      // The drawn credit's height is kept, so an AI refine can take it off and redraw it.
      expect(saved.imageCreditBand).toBeGreaterThan(0);
      expect(view.state.history[0].data[0]).toEqual(saved);
      // Credit is drawn into the saved image, like Mulberry's.
      // Who made it, then the licence and source on a line of their own.
      expect(ctx.fillText.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['"Green leaf" by Ann', expect.stringContaining('CC BY-SA 4.0, via Wikimedia Commons')]));
      // The saved copy is the larger rendition, not the screening thumbnail.
      expect(fetched.some(u => u.includes('/960px-7.jpg'))).toBe(true);
      // Undo puts the old picture back.
      await clickText(view, 'Undo');
      expect(view.state.resource.data[0].image).toBe('old-image');
    } finally {
      if (savedVision) window.callGeminiVision = savedVision; else delete window.callGeminiVision;
    }
  });
});

describe('glossary image picker flow', () => {
  it('shows one entry point and offers upload, Mulberry, and generation in a dialog', async () => {
    const view = mount(true, { onGenerate: vi.fn() });
    expect(view.container.querySelectorAll('button')).toHaveLength(1);
    await openDialog(view);
    expect(view.container.querySelector('dialog[aria-modal=true]')).toBeTruthy();
    expect(view.container.textContent).toContain('Upload image');
    expect(view.container.textContent).toContain('Find Mulberry symbol');
    expect(view.container.textContent).toContain('Generate image');
  });
  it('automatically searches the term when Mulberry opens without a second click', async () => {
    const view = mount(); const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] })); vi.stubGlobal('fetch', fetchMock);
    await openSearch(view);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('query=Leaf&');
    expect(document.activeElement).toBe(view.container.querySelector('input[type=search]'));
  });
  it('Undo restores image and description in history while preserving later text edits', async () => {
    const view = mount(); await openDialog(view); await upload(view); await complete();
    view.state.resource = { ...view.state.resource, data: [{ ...view.state.resource.data[0], def: 'Teacher-edited definition.' }] };
    view.state.history[0] = view.state.resource; view.rerender();
    await clickText(view, 'Undo');
    expect(view.state.resource.data[0]).toMatchObject({ image: 'old-image', imageAlt: 'Old description', imageAltHash: glossaryImageDescriptionHash('old-image'), def: 'Teacher-edited definition.' });
    expect(view.state.history[0].data[0]).toEqual(view.state.resource.data[0]);
  });
  it('hides obsolete Undo when a different operation replaces the image', async () => {
    const view = mount(); await upload(view); await complete();
    view.state.resource = { ...view.state.resource, data: [{ ...view.state.resource.data[0], image: 'newer-image' }] }; view.rerender();
    expect([...view.container.querySelectorAll('button')].some(button => button.textContent === 'Undo')).toBe(false);
  });
  it('saves a description tied to the displayed bytes and clears it on another replacement', async () => {
    const view = mount(); await openDialog(view); await upload(view); await complete();
    const field = view.container.querySelector('textarea');
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'A green leaf with branching veins.'); field.dispatchEvent(new Event('input', { bubbles: true })); });
    await clickText(view, 'Save description');
    expect(view.state.resource.data[0]).toMatchObject({ imageAlt: 'A green leaf with branching veins.', imageAltHash: glossaryImageDescriptionHash('data:image/png;base64,new'), imageAltSource: 'author' });
    expect(view.state.history[0].data[0].imageAlt).toBe('A green leaf with branching veins.');
    await upload(view); await complete(readers[1], 'data:image/png;base64,next');
    expect(view.state.resource.data[0].imageAlt).toBe('');
  });
  it('returns successful AI generation so the dialog can Undo it and clears stale image metadata', async () => {
    const view = mount(); const deps = { ...view.deps, callImagen: vi.fn(async () => 'data:image/png;base64,generated'), setIsGeneratingTermImage: vi.fn(), addToast: vi.fn(), t: key => key, warnLog: vi.fn(), glossaryImageStyle: '', universalImageStyle: '', autoRemoveWords: false };
    deps._alloBeginGlossaryTask = (index, fields, channel) => window.AlloModules.GlossaryHelpers.beginGlossaryTask(deps, index, fields, channel);
    let result;
    await act(async () => { result = await window.AlloModules.createHostHandlers(deps).handleGenerateTermImage(0, 'Leaf'); });
    expect(result).toBe('data:image/png;base64,generated');
    expect(view.state.resource.data[0]).toMatchObject({ image: result, imageAlt: '', imageAttribution: null, imageSource: 'ai-generated' });
  });
  it('supports Undo after using Generate image from the picker', async () => {
    let view;
    const onGenerate = vi.fn(async () => { const task = view.beginTask(0); const image = 'data:image/png;base64,ai'; task.commit(() => ({ image, imageAlt: '' })); task.finish(); return image; });
    view = mount(true, { onGenerate }); await openDialog(view); await clickText(view, 'Generate image');
    expect(onGenerate).toHaveBeenCalledWith(0, 'Leaf');
    expect(view.state.resource.data[0].image).toBe('data:image/png;base64,ai');
    await clickText(view, 'Undo'); expect(view.state.resource.data[0].image).toBe('old-image');
  });
});

it('wraps Tab and Shift+Tab within the image dialog', async () => {
  const view = mount(); vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => [] }));
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }]);
  await openSearch(view);
  const dialog = view.container.querySelector('dialog');
  const first = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Close');
  const last = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Back to current image');
  last.focus();
  await act(async () => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
  expect(document.activeElement).toBe(first);
  await act(async () => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
  expect(document.activeElement).toBe(last);
});

async function enterDescription(view, value) {
  const field = view.container.querySelector('textarea');
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); });
}
it('keeps an unsaved alt-text draft after Close or Escape without publishing it', async () => {
  const view = mount(); await openDialog(view); await enterDescription(view, 'My unfinished leaf description');
  await clickText(view, 'Close');
  expect(view.container.textContent).toContain('Unsaved image description draft');
  expect(view.state.resource.data[0].imageAlt).toBe('Old description');
  await openDialog(view); expect(view.container.querySelector('textarea').value).toBe('My unfinished leaf description');
  await act(async () => view.container.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await openDialog(view); expect(view.container.querySelector('textarea').value).toBe('My unfinished leaf description');
  await clickText(view, 'Save description');
  expect(view.state.history[0].data[0].imageAlt).toBe('My unfinished leaf description');
});
it('discards an old-image draft when the picture is replaced', async () => {
  const view = mount(); await openDialog(view); await enterDescription(view, 'This only describes the old picture.');
  await clickText(view, 'Close'); await upload(view); await complete(); await openDialog(view);
  expect(view.container.querySelector('textarea').value).toBe('');
  expect(view.state.resource.data[0].imageAlt).toBe('');
});
it('shows the supported formats and size limit before choosing a file', async () => {
  const view = mount(); await openDialog(view);
  const button = [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Upload image');
  const help = document.getElementById(button.getAttribute('aria-describedby'));
  expect(help.textContent).toContain('PNG, JPEG, GIF, WebP, or AVIF');
  expect(help.textContent).toContain('10 MB');
});
it('retries a failed thumbnail and enables selection only after its preview loads', async () => {
  const view = mount(); vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => [{ text: 'Leaf', picto: { id: 1, image_url: 'https://symbols.test/leaf.svg' } }] }));
  await openSearch(view);
  const choose = view.container.querySelector('button[aria-label="Use Leaf for Leaf"]');
  expect(choose.disabled).toBe(true);
  await act(async () => choose.querySelector('img').dispatchEvent(new Event('error')));
  expect(view.container.textContent).toContain('Preview unavailable');
  const retry = view.container.querySelector('[aria-label="Retry preview for Leaf"]');
  await act(async () => retry.click());
  expect(choose.querySelector('img').src).toContain('_alloflow_preview_retry=1');
  await act(async () => choose.querySelector('img').dispatchEvent(new Event('load')));
  expect(choose.disabled).toBe(false);
  expect(view.container.textContent).not.toContain('Preview unavailable');
  expect(document.activeElement).toBe(choose);
});
