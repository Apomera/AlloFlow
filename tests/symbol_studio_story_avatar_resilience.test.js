import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let SymbolStudio, host, root;
const oldImage = 'data:image/png;base64,AA==';
const newImage = 'data:image/png;base64,AQ==';
beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => {
  if (root) act(() => root.unmount()); root = null;
  host?.remove(); host = null; localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
async function settle(action = () => {}) { await act(async () => { action(); for (let i = 0; i < 35; i++) await Promise.resolve(); }); }
function control(label) { const element = host.querySelector('[aria-label="' + label + '"]'); expect(element, label).toBeTruthy(); return element; }
function change(label, value) {
  const element = control(label); const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function mount(overrides = {}) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([
    { id: 'story-a', name: 'Learner A', description: 'red shirt', image: oldImage, codename: 'Sky Fox' },
    { id: 'story-b', name: 'Learner B', description: '', image: null, codename: 'Bright Otter' },
  ]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('story-a'));
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  await settle(() => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'stories', onCallImagen: null, onCallGeminiImageEdit: null, ...overrides }))));
}
function profiles() { return JSON.parse(localStorage.getItem('alloStudentProfiles')); }
async function generateStory() {
  change('Social story situation or goal', 'Taking turns');
  await settle(() => control('Generate social story').click());
}

describe('Social Stories request ownership and recovery', () => {
  it('keeps the previous valid story when a replacement contains no usable text', async () => {
    const replacement = deferred(); const addToast = vi.fn();
    const onCallGemini = vi.fn().mockResolvedValueOnce(JSON.stringify([{ text: 'The original story is ready.', imagePrompt: 'child' }])).mockImplementationOnce(() => replacement.promise);
    await mount({ onCallGemini, addToast }); await generateStory();
    expect(host.textContent).toContain('The original story is ready.');
    await settle(() => control('Generate social story').click());
    expect(host.textContent).toContain('The original story is ready.');
    await settle(() => replacement.resolve(JSON.stringify([null, { text: ' ' }, { text: {} }])));
    expect(host.textContent).toContain('The original story is ready.');
    expect(control('Generate social story').disabled).toBe(false);
    expect(addToast.mock.calls.some(([, kind]) => kind === 'error')).toBe(true);
  });

  it('drops late text after the active learner changes and clears personalized draft inputs', async () => {
    const pending = deferred(); const onCallImagen = vi.fn(async () => newImage);
    await mount({ onCallGemini: () => pending.promise, onCallImagen });
    await generateStory();
    await settle(() => control('Profile: Learner B').click());
    await settle(() => pending.resolve(JSON.stringify([{ text: 'Private story for Learner A.', imagePrompt: 'child A' }])));
    expect(host.textContent).not.toContain('Private story for Learner A.');
    expect(control('Student name for social story').value).toBe('Learner B');
    expect(control('Social story situation or goal').value).toBe('');
    expect(onCallImagen).not.toHaveBeenCalled();
  });

  it('stops generating further page illustrations after switching learner', async () => {
    const pending = deferred(); const onCallImagen = vi.fn(() => pending.promise);
    await mount({ onCallGemini: async () => JSON.stringify([{ text: 'First.', imagePrompt: 'first' }, { text: 'Second.', imagePrompt: 'second' }]), onCallImagen });
    await generateStory(); expect(onCallImagen).toHaveBeenCalledTimes(1);
    await settle(() => control('Profile: Learner B').click());
    await settle(() => pending.resolve(newImage));
    expect(onCallImagen).toHaveBeenCalledTimes(1);
    expect(host.textContent).not.toContain('First.');
  });

  it('bounds malformed or oversized model pages before rendering', async () => {
    const pages = [null, { text: '' }, ...Array.from({ length: 25 }, (_, i) => ({ text: 'Page ' + i + ' ' + 'x'.repeat(3000), imagePrompt: {} }))];
    await mount({ onCallGemini: async () => JSON.stringify(pages) }); await generateStory();
    expect(host.textContent).toContain('Page 1 of 12');
    const paragraphs = Array.from(host.querySelectorAll('#ss-py p'));
    expect(paragraphs.some((p) => p.textContent.startsWith('Page 0 '))).toBe(true);
    expect(paragraphs.filter((p) => p.textContent.startsWith('Page ')).every((p) => p.textContent.length <= 2000)).toBe(true);
  });

  it('stops old page-zero narration when a replacement story is accepted', async () => {
    const created = [];
    vi.stubGlobal('Audio', class { constructor(src) { this.src = src; this.pause = vi.fn(); this.play = vi.fn(async () => undefined); created.push(this); } });
    const onCallGemini = vi.fn()
      .mockResolvedValueOnce(JSON.stringify([{ text: 'Original page zero.' }]))
      .mockResolvedValueOnce(JSON.stringify([{ text: 'Replacement page zero.' }]));
    await mount({ onCallGemini, onCallTTS: async () => 'data:audio/wav;base64,AA==' });
    await generateStory(); await settle(() => control('Read this page aloud').click());
    expect(created).toHaveLength(1);
    await settle(() => control('Generate social story').click());
    expect(host.textContent).toContain('Replacement page zero.');
    expect(created[0].pause).toHaveBeenCalled();
    expect(control('Read this page aloud')).toBeTruthy();
  });

  it('does not apply an old page regeneration to an accepted replacement story', async () => {
    await mount({ onCallGemini: async () => JSON.stringify([{ text: 'Original page.' }]) });
    await generateStory();
    const replacement = deferred(); const oldRegeneration = deferred();
    const onCallImagen = vi.fn().mockImplementationOnce(() => oldRegeneration.promise).mockResolvedValue(newImage);
    await settle(() => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'stories', onCallGemini: () => replacement.promise, onCallImagen, onCallGeminiImageEdit: null }))));
    await settle(() => control('Generate social story').click());
    await settle(() => control('Regenerate illustration for this page').click());
    expect(onCallImagen).toHaveBeenCalledTimes(1);
    await settle(() => replacement.resolve(JSON.stringify([{ text: 'New page.', imagePrompt: 'new scene' }])));
    expect(onCallImagen).toHaveBeenCalledTimes(2);
    await settle(() => oldRegeneration.resolve(oldImage));
    expect(host.textContent).toContain('New page.');
    const pageImages = Array.from(host.querySelectorAll('#ss-py img'));
    expect(pageImages.length).toBeGreaterThan(0);
    expect(pageImages.every((img) => img.getAttribute('src') === newImage)).toBe(true);
  });

  it('Stop cancels pending narration instead of requesting a second reading', async () => {
    const pending = deferred(); const onCallTTS = vi.fn(() => pending.promise); const created = [];
    vi.stubGlobal('Audio', class { constructor(src) { this.src = src; this.pause = vi.fn(); this.play = vi.fn(async () => undefined); created.push(this); } });
    await mount({ onCallGemini: async () => JSON.stringify([{ text: 'A short story.' }]), onCallTTS }); await generateStory();
    await settle(() => control('Read this page aloud').click());
    await settle(() => control('Stop reading aloud').click());
    expect(onCallTTS).toHaveBeenCalledTimes(1);
    await settle(() => pending.resolve('data:audio/wav;base64,AA=='));
    expect(created).toHaveLength(0);
    expect(control('Read this page aloud')).toBeTruthy();
  });
});

describe('Avatar request ownership and latest profile metadata', () => {
  it('keeps a renamed learner when their pending portrait finishes', async () => {
    const pending = deferred(); await mount({ onCallImagen: () => pending.promise });
    await settle(() => control('Profile: Learner A').click());
    await settle(() => control('Generate student avatar').click());
    change('Display name - local only', 'Renamed learner');
    await settle(() => pending.resolve(newImage));
    expect(profiles()[0]).toMatchObject({ name: 'Renamed learner', image: newImage });
    expect(profiles()).toHaveLength(2);
  });

  it('retains the existing portrait and reports a blank image response', async () => {
    const addToast = vi.fn(); await mount({ onCallImagen: async () => null, addToast });
    await settle(() => control('Profile: Learner A').click());
    await settle(() => control('Generate student avatar').click());
    expect(profiles()[0].image).toBe(oldImage);
    expect(addToast.mock.calls.some(([, kind]) => kind === 'error')).toBe(true);
    expect(addToast.mock.calls.some(([, kind]) => kind === 'success')).toBe(false);
  });

  it('discards a generated portrait after switching learner without replacing the story name', async () => {
    const pending = deferred(); await mount({ onCallImagen: () => pending.promise });
    await settle(() => control('Profile: Learner A').click());
    await settle(() => control('Generate student avatar').click());
    await settle(() => control('Profile: Learner B').click());
    await settle(() => pending.resolve(newImage));
    expect(profiles()[0].image).toBe(oldImage);
    expect(profiles()[1].image).toBeNull();
    expect(control('Student name for social story').value).toBe('Learner B');
  });

  it('discards an uploaded portrait read after switching learner', async () => {
    const readers = []; vi.stubGlobal('FileReader', class { constructor() { readers.push(this); } readAsDataURL() {} });
    await mount(); await settle(() => control('Profile: Learner A').click());
    const input = host.querySelector('input[type="file"][accept="image/*"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['avatar'], 'avatar.png', { type: 'image/png' })] });
    await settle(() => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(readers).toHaveLength(1);
    await settle(() => control('Profile: Learner B').click());
    await settle(() => readers[0].onload({ target: { result: newImage } }));
    expect(profiles()[0].image).toBe(oldImage); expect(profiles()[1].image).toBeNull();
  });
});
