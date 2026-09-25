import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;

// Symbol Studio "Find photo" (2026-09-23): screened Wikimedia Commons photos via
// the shared ClassroomImagePicker. Photos join the Symbol Bank with their credit
// and AI description, and are never marked as a validated AAC symbol.

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const pngBlob = () => new Blob([Uint8Array.from(atob(PNG), c => c.charCodeAt(0))], { type: 'image/png' });
const commons = { query: { pages: { 5: { pageid: 5, index: 1, title: 'File:Dog_on_grass.jpg', imageinfo: [{ mime: 'image/jpeg',
  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/5.jpg/330px-5.jpg', thumbwidth: 330, thumbheight: 220,
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Dog_on_grass.jpg',
  extmetadata: { LicenseShortName: { value: 'CC BY 2.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by/2.0' }, Artist: { value: 'Kim' }, Categories: { value: 'Dogs' } } }] } } } };

let Studio, root, host, savedVision;
beforeAll(() => { Studio = setupSymbolStudio().SymbolStudio; loadAlloModule('alt_text_module.js'); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (savedVision) window.callGeminiVision = savedVision; else delete window.callGeminiVision;
  savedVision = undefined;
});
async function mount() {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'ph', name: 'Demo' }]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('ph'));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Studio, baseProps({}))));
  const label = host.querySelector('[aria-label="Symbol label"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(label, 'dog');
    label.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function until(check) {
  for (let waited = 0; !check() && waited < 4000; waited += 20) await act(async () => { await new Promise(r => setTimeout(r, 20)); });
  return check();
}

describe('Symbol Studio photos', () => {
  it('opens its own dialog with focus inside, and Escape returns focus to the button', async () => {
    await mount();
    const opener = host.querySelector('[aria-label="Find a photo"]');
    opener.focus();
    await act(async () => opener.click());
    const dialog = host.querySelector('[role="dialog"][aria-label="Find a photo"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toMatch(/not a validated AAC symbol set/);
    expect(document.activeElement).toBe(dialog.querySelector('input[type="search"]'));
    expect(document.activeElement.value).toBe('dog');
    await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"][aria-label="Find a photo"]')).toBe(null);
    expect(document.activeElement).toBe(opener);
  });

  it('adds a screened photo to the Symbol Bank as a small copy with its credit drawn in, never as validated', async () => {
    // Canvas stand-ins: a 1200x800 photo; each canvas reports its own size.
    vi.stubGlobal('Image', class { naturalWidth = 1200; naturalHeight = 800; set src(value) {
      const size = /base64,(\d+)x(\d+)$/.exec(String(value)); // a canvas copy made earlier in the test
      if (size) { this.naturalWidth = Number(size[1]); this.naturalHeight = Number(size[2]); }
      if (value) queueMicrotask(() => this.onload());
    } });
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(), measureText: t => ({ width: String(t).length * 7 }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (type) { return 'data:' + type + ';base64,' + this.width + 'x' + this.height; });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => String(url).startsWith('https://commons.wikimedia.org/w/api.php')
      ? { ok: true, json: async () => commons } : { ok: true, blob: async () => pngBlob() });
    savedVision = window.callGeminiVision;
    window.callGeminiVision = vi.fn(async () => JSON.stringify([{ index: 1, safe: true, relevant: true, alt: 'A brown dog sitting on grass.' }]));
    await mount();
    await act(async () => host.querySelector('[aria-label="Find a photo"]').click());
    const dialog = host.querySelector('[role="dialog"][aria-label="Find a photo"]');
    await act(async () => dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const use = '[aria-label="Use photo: A brown dog sitting on grass."]';
    expect(await until(() => host.querySelector(use))).toBeTruthy();
    await act(async () => host.querySelector(use).click());
    const find = () => (JSON.parse(localStorage.getItem('alloSymbolGallery__ph') || '[]')).find(entry => entry.source === 'wikimedia');
    expect(await until(find)).toBeTruthy();
    const saved = find();
    expect(saved).toMatchObject({ label: 'dog', style: 'photo', validated: false, description: 'A brown dog sitting on grass.' });
    // 400px wide (not the 960px download), with a credit band under it.
    expect(saved.image).toMatch(/^data:image\/jpeg;base64,400x(\d+)$/);
    expect(Number(saved.image.split('x')[1])).toBeGreaterThan(267);
    const drawn = ctx.fillText.mock.calls.map(c => c[0]).join(' ');
    expect(drawn).toContain('by Kim');
    expect(drawn).toContain('CC BY 2.0, via Wikimedia Commons');
    expect(saved.attribution).toMatchObject({ set: 'Wikimedia Commons', author: 'Kim', license: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Dog_on_grass.jpg' });
    expect(host.querySelector('[role="dialog"][aria-label="Find a photo"]')).toBe(null);
  });
});
