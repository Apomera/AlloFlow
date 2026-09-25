import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;

// mulberrysymbols.org asks for: "Mulberry Symbols by Steve Lee are licenced under
// the Creative Commons Attribution-ShareAlike 4.0 License". Symbol Studio used to
// store "CC BY-SA" with no author or version, and linked CC BY-SA 2.0.
const CREDIT = {
  set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', via: 'Global Symbols', url: 'https://mulberrysymbols.org'
};
const LEGACY = { set: 'Mulberry Symbols', license: 'CC BY-SA', via: 'Global Symbols', url: 'https://globalsymbols.com' };
const image = 'data:image/png;base64,AA==';

let Studio, api, root, host;
beforeAll(() => { Studio = setupSymbolStudio().SymbolStudio; api = window.AlloModules.SymbolStudioInternals; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); localStorage.clear(); vi.restoreAllMocks(); });

describe('Mulberry credit', () => {
  it('upgrades the exact legacy credit this app wrote when a symbol loads', () => {
    const asset = api.normalizeBankAsset({ id: 'a', label: 'Help', image, source: 'mulberry', attribution: LEGACY });
    expect(asset.attribution).toEqual(CREDIT);
  });

  it('leaves any other credit exactly as it was', () => {
    const handWritten = { set: 'Mulberry', license: 'CC BY-SA', via: 'Local bank', url: 'https://example.test/license' };
    expect(api.normalizeBankAsset({ id: 'b', label: 'x', image, attribution: handWritten }).attribution).toEqual(handWritten);
    expect(api.normalizeBankAsset({ id: 'c', label: 'x', image, attribution: { set: 'Original' } }).attribution).toEqual({ set: 'Original' });
    // A symbol with no credit does not gain an attribution key.
    expect('attribution' in api.normalizeBankAsset({ id: 'd', label: 'x', image })).toBe(false);
  });

  it('keeps the author and licence link when a symbol is shared or exported', () => {
    // packAssetForShare is what shared banks and Visual Pack exports go through.
    const packed = api.packAssetForShare({ id: 'a', label: 'Help', image, attribution: CREDIT });
    expect(packed.attribution).toMatchObject({ author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' });
    // Only https licence links survive a share.
    const unsafe = api.packAssetForShare({ id: 'a', label: 'Help', image, attribution: { ...CREDIT, licenseUrl: 'javascript:alert(1)' } });
    expect('licenseUrl' in unsafe.attribution).toBe(false);
    // A credit with no author or licence link shares exactly as it always did.
    const older = { set: 'Mulberry', license: 'CC BY-SA', via: 'Local bank', url: 'https://example.test/license' };
    expect(api.packAssetForShare({ id: 'b', label: 'x', image, attribution: older }).attribution).toEqual(older);
  });

  it('gives a symbol added from the real picker the full credit', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).startsWith('https://globalsymbols.com/api/v1/labels/search')) {
        return { ok: true, json: async () => [{ id: 7, text: 'help', picto: { id: 70, image_url: 'https://globalsymbols.com/uploads/help.svg' } }] };
      }
      return { ok: true, blob: async () => new Blob([svg], { type: 'image/svg+xml' }) };
    });
    localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'nav', name: 'Demo' }]));
    localStorage.setItem('alloActiveProfileId', JSON.stringify('nav'));
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Studio, baseProps({}))));
    const labelInput = host.querySelector('[aria-label="Symbol label"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(labelInput, 'help');
      labelInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => host.querySelector('[aria-label="Find a validated Mulberry symbol"]').click());
    const dialog = host.querySelector('[role="dialog"][aria-label="Find a validated Mulberry symbol"]');
    await act(async () => dialog.querySelector('button[aria-label="Search"]').click());
    const add = host.querySelector('[aria-label="Add validated symbol help"]');
    expect(add, 'search result').toBeTruthy();
    await act(async () => { add.click(); });
    // The symbol downloads, converts and saves asynchronously: wait for the save
    // itself rather than a fixed delay, which is too short under machine load.
    const findSaved = () => (JSON.parse(localStorage.getItem('alloSymbolGallery__nav') || '[]')).find(entry => entry.source === 'mulberry');
    for (let waited = 0; !findSaved() && waited < 5000; waited += 25) {
      await act(async () => { await new Promise(r => setTimeout(r, 25)); });
    }
    const saved = findSaved();
    expect(saved, 'saved Mulberry symbol').toBeTruthy();
    expect(saved.attribution).toEqual(CREDIT);
  });

  it('links the licence Mulberry actually uses in the picker footer', async () => {
    localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'nav', name: 'Demo' }]));
    localStorage.setItem('alloActiveProfileId', JSON.stringify('nav'));
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Studio, baseProps({}))));
    const labelInput = host.querySelector('[aria-label="Symbol label"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(labelInput, 'help');
      labelInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => host.querySelector('[aria-label="Find a validated Mulberry symbol"]').click());
    const dialog = host.querySelector('[role="dialog"][aria-label="Find a validated Mulberry symbol"]');
    const links = [...dialog.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect(links).toContain('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(links).not.toContain('https://creativecommons.org/licenses/by-sa/2.0/');
    expect(dialog.textContent).toMatch(/Mulberry Symbols by Steve Lee/);
  });
});

describe('credits in exported boards and shared banks', () => {
  it('gives each board picture its own licence, and a share-alike board is not labelled plain CC BY', () => {
    const symbol = 'data:image/png;base64,TQ==', photo = 'data:image/jpeg;base64,UA==', own = 'data:image/png;base64,VQ==';
    const gallery = [
      { id: 'm', image: symbol, attribution: { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', url: 'https://mulberrysymbols.org' } },
      { id: 'p', image: photo, attribution: { set: 'Wikimedia Commons', title: 'Dog on grass', author: 'Kim', license: 'CC BY 2.0', licenseUrl: 'javascript:alert(1)', url: 'https://commons.wikimedia.org/wiki/File:Dog.jpg' } },
      { id: 'u', image: own },
    ];
    expect(api.obfImageLicenseFor(gallery, symbol)).toEqual({ type: 'CC BY-SA 4.0', copyright_notice_url: 'https://creativecommons.org/licenses/by-sa/4.0/', source_url: 'https://mulberrysymbols.org', author_name: 'Steve Lee' });
    expect(api.obfImageLicenseFor(gallery, photo)).toEqual({ type: 'CC BY 2.0', source_url: 'https://commons.wikimedia.org/wiki/File:Dog.jpg', author_name: 'Kim' }); // unsafe links are left out
    expect(api.obfImageLicenseFor(gallery, own)).toBe(null);
    expect(api.obfBoardLicense([{ license: { type: 'CC BY 2.0' } }, {}])).toEqual({ type: 'CC By' });
    expect(api.obfBoardLicense([{ license: { type: 'CC BY 2.0' } }, { license: { type: 'CC BY-SA 4.0' } }])).toEqual({ type: 'CC By-Sa' });
  });

  it('drops a picked picture credit and validated status when its art is regenerated', () => {
    const photo = { id: 'p', image: 'data:image/png;base64,QQ==', source: 'wikimedia', validated: false, attribution: { set: 'Wikimedia Commons', author: 'Kim', license: 'CC BY 2.0' } };
    expect(api.withoutPickedCredit(photo)).toMatchObject({ source: 'ai-symbol-studio', validated: false });
    expect('attribution' in api.withoutPickedCredit(photo)).toBe(false);
    expect(api.withoutPickedCredit({ id: 'm', source: 'mulberry', validated: true })).toMatchObject({ source: 'ai-symbol-studio', validated: false });
    const drawn = { id: 'a', source: 'ai-symbol-studio' };
    expect(api.withoutPickedCredit(drawn)).toBe(drawn);
  });

  it('finds a board picture licence by the cell asset even after the bank picture changed', () => {
    const credit = { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' };
    const gallery = [{ id: 'm', image: 'data:image/png;base64,TkVX', attribution: credit }];
    // The cell still holds the older copy of the picture.
    expect(api.obfImageLicenseFor(gallery, 'data:image/png;base64,T0xE', { assetId: 'm' })).toMatchObject({ type: 'CC BY-SA 4.0', author_name: 'Steve Lee' });
    // A cell that carries its own credit keeps it when the bank no longer has the picture.
    expect(api.obfImageLicenseFor([], 'data:image/png;base64,T0xE', { assetId: 'gone', attribution: credit })).toMatchObject({ type: 'CC BY-SA 4.0' });
    expect(api.obfImageLicenseFor([], 'data:image/png;base64,T0xE', { assetId: 'gone' })).toBe(null);
  });

  it('keeps a photo title, and that it was edited, in a shared credit', () => {
    const packed = api.packAssetForShare({ id: 'a', label: 'Dog', image: 'data:image/png;base64,UA==', attribution: { set: 'Wikimedia Commons', title: 'Dog on grass', author: 'Kim', license: 'CC BY 2.0', modified: true } });
    expect(packed.attribution).toMatchObject({ title: 'Dog on grass', author: 'Kim', modified: true });
  });
});
