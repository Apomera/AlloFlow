import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let H;
let root;
let host;

const PNG_HEADER = 'data:image/png;base64,iVBORw0KGgo=';
const JPEG_HEADER = 'data:image/jpeg;base64,/9j/';
const WEBP_HEADER = 'data:image/webp;base64,UklGRgAAAABXRUJQ';

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('image_asset_editor_module.js');
  H = window.AlloModules.ImageAssetTools;
  if (!H) throw new Error('ImageAssetTools was not registered');
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  if (host) host.remove();
  root = null;
  host = null;
});

async function renderComponent(component, props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(component, props)));
  return host;
}

describe('shared image asset safety contract', () => {
  it('loads before Memory Aid and keeps root/public bundles byte-identical', () => {
    const hostSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const desktopHost = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');
    const desktopApp = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/App.jsx'), 'utf8');
    const editorIndex = hostSource.indexOf("loadModule('ImageAssetEditorModule'");
    const memoryIndex = hostSource.indexOf("loadModule('MemoryAidModule'");
    expect(editorIndex).toBeGreaterThan(-1);
    expect(memoryIndex).toBeGreaterThan(editorIndex);
    expect(desktopHost).toContain("loadModule('ImageAssetEditorModule'");
    const desktopEditorIndex = desktopApp.indexOf("loadModule('ImageAssetEditorModule', './image_asset_editor_module.js')");
    const desktopMemoryIndex = desktopApp.indexOf("loadModule('MemoryAidModule', './memory_aid_module.js')");
    expect(desktopEditorIndex).toBeGreaterThan(-1);
    expect(desktopMemoryIndex).toBeGreaterThan(desktopEditorIndex);
    expect(readFileSync(resolve(process.cwd(), 'image_asset_editor_module.js'), 'utf8')).toBe(
      readFileSync(resolve(process.cwd(), 'desktop/web-app/public/image_asset_editor_module.js'), 'utf8')
    );
  });

  it('accepts only bounded PNG, JPEG, and WebP file metadata', () => {
    expect(H.validateImageAssetFile({ name: 'cue.png', type: 'image/png', size: 512 })).toMatchObject({ ok: true, mime: 'image/png' });
    expect(H.validateImageAssetFile({ name: 'cue.jpeg', type: '', size: 512 })).toMatchObject({ ok: true, mime: 'image/jpeg' });
    expect(H.validateImageAssetFile({ name: 'cue.svg', type: 'image/svg+xml', size: 512 })).toMatchObject({ ok: false, code: 'unsupported-type' });
    expect(H.validateImageAssetFile({ name: 'cue.gif', type: 'image/gif', size: 512 })).toMatchObject({ ok: false, code: 'unsupported-type' });
    expect(H.validateImageAssetFile({ name: 'cue.png', type: 'image/png', size: 11 * 1024 * 1024 })).toMatchObject({ ok: false, code: 'file-too-large' });
    expect(H.validateImageAssetFile({ name: 'cue.png', type: 'image/png', size: 0 })).toMatchObject({ ok: false, code: 'empty-file' });
  });

  it('checks raster signatures instead of trusting a data URL label', () => {
    expect(H.normalizeRasterDataUrl(PNG_HEADER)).toBe(PNG_HEADER);
    expect(H.normalizeRasterDataUrl(JPEG_HEADER)).toBe(JPEG_HEADER);
    expect(H.normalizeRasterDataUrl(WEBP_HEADER)).toBe(WEBP_HEADER);
    expect(H.normalizeRasterDataUrl('data:image/png;base64,/9j/')).toBe('');
    expect(H.normalizeRasterDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe('');
    expect(H.normalizeRasterDataUrl('https://example.com/cue.png')).toBe('');
    expect(H.imageAssetMime(WEBP_HEADER)).toBe('image/webp');
  });

  it('normalizes fit and crop settings into bounded controls', () => {
    expect(H.normalizeImageAssetSettings({ mode: 'fit', zoom: 220, focalX: 0 })).toEqual({
      mode: 'fit', aspect: 'original', zoom: 100, focalX: 50, focalY: 50,
    });
    expect(H.normalizeImageAssetSettings({ mode: 'crop', aspect: 'unknown', zoom: 999, focalX: -20, focalY: 140 })).toEqual({
      mode: 'crop', aspect: 'square', zoom: 250, focalX: 0, focalY: 100,
    });
  });

  it('computes non-upscaled output sizes and focal crop geometry', () => {
    expect(H.computeImageAssetTargetSize(2400, 1200, { mode: 'fit' }, { maxDimension: 1280 })).toEqual({ width: 1280, height: 640 });
    expect(H.computeImageAssetTargetSize(2400, 1200, { mode: 'crop', aspect: 'square' }, { maxDimension: 1280 })).toEqual({ width: 1200, height: 1200 });
    expect(H.computeImageAssetDrawRect(200, 100, 100, 100, { mode: 'fit' })).toEqual({ dx: 0, dy: 25, dw: 100, dh: 50 });
    expect(H.computeImageAssetDrawRect(200, 100, 100, 100, { mode: 'crop', aspect: 'square', focalX: 0, focalY: 50 })).toEqual({ dx: 0, dy: 0, dw: 200, dh: 100 });
    expect(H.computeImageAssetDrawRect(200, 100, 100, 100, { mode: 'crop', aspect: 'square', zoom: 200, focalX: 50, focalY: 50 })).toEqual({ dx: -150, dy: -50, dw: 400, dh: 200 });
  });
});

describe('shared image asset controls', () => {
  it('renders an accessible fit-first editor and reveals bounded crop controls', async () => {
    await renderComponent(window.AlloModules.ImageAssetEditor, {
      sourceDataUrl: PNG_HEADER,
      sourceName: 'matter-cue.png',
      onApply: vi.fn(),
      onCancel: vi.fn(),
    });
    expect(host.querySelector('section').getAttribute('aria-labelledby')).toBeTruthy();
    expect(host.textContent).toContain('Position your visual');
    const fit = host.querySelector('input[type="radio"]');
    expect(fit.checked).toBe(true);
    const crop = Array.from(host.querySelectorAll('input[type="radio"]'))[1];
    await act(async () => {
      crop.click();
    });
    expect(host.querySelector('select').value).toBe('square');
    expect(host.querySelector('[aria-label="Image zoom"]')).toBeTruthy();
    expect(host.querySelector('[aria-label="Horizontal image focus"]')).toBeTruthy();
    expect(host.querySelector('[aria-label="Vertical image focus"]')).toBeTruthy();
  });

  it('passes a chosen file through the injected reader without hiding validation help', async () => {
    const onLoaded = vi.fn();
    const readFile = vi.fn(async () => ({ dataUrl: PNG_HEADER, mime: 'image/png', name: 'cue.png', size: 8 }));
    await renderComponent(window.AlloModules.ImageAssetPicker, { onLoaded, readFile });
    const input = host.querySelector('input[type="file"]');
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'cue.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(readFile).toHaveBeenCalledWith(file, { maxFileBytes: H.IMAGE_ASSET_MAX_FILE_BYTES });
    expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ dataUrl: PNG_HEADER }));
    expect(host.textContent).toContain('processed in this browser');
    expect(input.getAttribute('accept')).toBe('image/png,image/jpeg,image/webp');
  });
});
