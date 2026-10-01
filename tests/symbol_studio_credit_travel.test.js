import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let root, host;
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; localStorage.clear(); });

// Picture credits that travel with each board picture (2026-09-28). Mulberry
// symbols are CC BY-SA and Commons photos carry their own licences: a shared
// or exported board must say whose each picture is, even after the Symbol Bank
// item is regenerated or deleted, and a cell must never keep a credit for a
// picture it no longer shows.
let api;
beforeAll(() => { setupSymbolStudio(); api = window.AlloModules.SymbolStudioInternals; });

const MULBERRY = { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', via: 'Global Symbols', url: 'https://mulberrysymbols.org' };
const PHOTO = { set: 'Wikimedia Commons', title: 'Dog on grass', author: 'Kim', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', url: 'https://commons.wikimedia.org/wiki/File:Dog.jpg' };
const symbol = 'data:image/png;base64,TVVMQg==', photo = 'data:image/jpeg;base64,UEhPVE8=', drawn = 'data:image/png;base64,QUk=';
const own = (image, credit) => ({ image, attribution: api.cellCreditFor([{ image, attribution: credit }], { image }), creditPicture: api.pictureKey(image) });

describe('a cell keeps the credit of the picture it shows', () => {
  it('ties a credit to one exact picture', () => {
    expect(api.pictureKey(symbol)).toBe(api.pictureKey(String(symbol)));
    expect(api.pictureKey(symbol)).not.toBe(api.pictureKey(photo));
    expect(api.pictureKey('')).toBe('');
    // Its own credit wins; a credit tied to another picture is never used.
    expect(api.cellCreditFor([], { id: 'c', ...own(symbol, MULBERRY) })).toMatchObject({ author: 'Steve Lee', license: 'CC BY-SA 4.0' });
    const moved = { id: 'c', ...own(symbol, MULBERRY), image: drawn };
    expect(api.cellCreditFor([], moved)).toBe(null);
    // Older cells with a credit but no picture tie still use it.
    expect(api.cellCreditFor([], { image: drawn, attribution: MULBERRY })).toMatchObject({ license: 'CC BY-SA 4.0' });
    // Otherwise the Symbol Bank item with the same picture.
    expect(api.cellCreditFor([{ id: 'p', image: photo, attribution: PHOTO }], { image: photo })).toMatchObject({ title: 'Dog on grass', author: 'Kim' });
    expect(api.cellCreditFor([{ id: 'p', image: photo, attribution: PHOTO }], { image: drawn })).toBe(null);
  });

  it('stamps a leaving bank picture\'s credit onto exactly the cells showing it', () => {
    const asset = { id: 'm', image: symbol, attribution: MULBERRY };
    const keepsOwn = { id: 'k', ...own(symbol, PHOTO) };
    const words = [{ id: 'a', image: symbol }, { id: 'b', image: drawn }, keepsOwn, null];
    const kept = api.keepPictureCredit(words, asset);
    expect(kept[0]).toMatchObject({ attribution: { author: 'Steve Lee' }, creditPicture: api.pictureKey(symbol) });
    expect(kept[1]).toBe(words[1]);
    expect(kept[2]).toBe(keepsOwn);
    // Nothing to keep: the same array comes back, so nothing is rewritten.
    expect(api.keepPictureCredit(words, { id: 'x', image: symbol })).toBe(words);
    const board = { id: 'b1', words: [{ id: 'a', image: photo }], pages: [{ id: 'p1', words: [{ id: 'b', image: photo }] }] };
    const stamped = api.boardWithCellCredits(board, [{ id: 'p', image: photo, attribution: PHOTO }]);
    expect(stamped.words[0].attribution.author).toBe('Kim');
    expect(stamped.pages[0].words[0].attribution.author).toBe('Kim');
    expect(api.boardWithCellCredits(board, [])).toBe(board);
  });
});

describe('credits in what a board is shared or exported as', () => {
  const board = { id: 'b1', title: 'Snack', words: [{ id: 'a', label: 'more', image: symbol }, { id: 'b', label: 'dog', image: photo }, { id: 'c', label: 'hi', image: drawn }] };
  const bank = [{ id: 'm', image: symbol, attribution: MULBERRY }, { id: 'p', image: photo, attribution: { ...PHOTO, author: 'Kim <b>' } }];

  it('gives each picture in the portable AAC package its credit, listed once', () => {
    const pack = api.buildPortableAACPackage({ ...board, words: [...board.words, { id: 'd', label: 'more again', image: symbol }] },
      { creditFor: cell => api.cellCreditFor(bank, cell) });
    const cells = pack.pages[0].cells;
    expect(cells[0].credit).toMatchObject({ author: 'Steve Lee', license: 'CC BY-SA 4.0' });
    expect(cells[1].credit).toMatchObject({ title: 'Dog on grass', license: 'CC BY 2.0' });
    expect('credit' in cells[2]).toBe(false);
    expect(pack.credits.map(credit => credit.license)).toEqual(['CC BY-SA 4.0', 'CC BY 2.0']);
    // A cell's own credit travels even with no bank lookup, and no credit adds no field.
    expect(api.buildPortableAACPackage({ ...board, words: [{ id: 'a', label: 'more', ...own(symbol, MULBERRY) }] }).pages[0].cells[0].credit.author).toBe('Steve Lee');
    expect('credits' in api.buildPortableAACPackage({ ...board, words: [{ id: 'c', label: 'hi', image: drawn }] })).toBe(false);
  });

  it('puts the credits in the standalone HTML board, escaped, with only safe links', () => {
    const pack = api.buildPortableAACPackage(board, { creditFor: cell => api.cellCreditFor(bank, cell) });
    pack.credits.push({ license: 'CC BY 4.0', author: 'Someone', licenseUrl: 'javascript:alert(1)', url: 'http://plain.example' });
    const html = api.buildStandaloneAACHTML(pack);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.getElementById('picture-credits');
    expect(section.querySelector('h2').textContent).toBe('Picture credits');
    const items = [...section.querySelectorAll('li')].map(li => li.textContent);
    expect(items[0]).toBe('Mulberry Symbols by Steve Lee, CC BY-SA 4.0, via Global Symbols (License, Source)');
    expect(items[1]).toBe('“Dog on grass” by Kim <b>, CC BY 2.0 (License, Source)');
    expect(api.creditText({ ...PHOTO, modified: true })).toBe('“Dog on grass” by Kim, CC BY 2.0, edited');
    expect(section.querySelectorAll('b').length).toBe(0);
    expect([...section.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual([
      'https://creativecommons.org/licenses/by-sa/4.0/', 'https://mulberrysymbols.org', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Dog.jpg']);
    expect(api.buildStandaloneAACHTML(api.buildPortableAACPackage({ ...board, words: [{ id: 'c', label: 'hi', image: drawn }] }))).not.toContain('picture-credits');
  });

  it('lists the credit of a board picture even when its cell is not linked to a bank asset', () => {
    const envelope = api.buildVisualPackEnvelope({ id: 'pk', title: 'Pack', boardIds: ['b1'], assetIds: [], scheduleIds: [] }, bank, [board], []);
    const credits = envelope.licenses.map(entry => entry.attribution.license);
    expect(credits).toEqual(expect.arrayContaining(['CC BY-SA 4.0', 'CC BY 2.0']));
    const sharedCell = envelope.boards[0].words.find(cell => cell.label === 'more');
    expect(sharedCell).toMatchObject({ attribution: { author: 'Steve Lee' }, creditPicture: api.pictureKey(symbol) });
    // A cell whose bank asset is gone keeps its own credit in the pack.
    const orphan = { id: 'b2', title: 'Old', words: [{ id: 'z', label: 'more', assetId: 'deleted', ...own(symbol, MULBERRY) }] };
    const kept = api.buildVisualPackEnvelope({ id: 'pk2', title: 'Pack', boardIds: ['b2'], assetIds: [], scheduleIds: [] }, [], [orphan], []);
    expect(kept.licenses.map(entry => entry.attribution.author)).toEqual(['Steve Lee']);
  });
});

describe('OBF licences', () => {
  it('keeps each imported image licence, and labels a board by its most restrictive picture', () => {
    const credits = api.obfImageCredits([
      { id: '1', license: { type: 'CC BY-SA 4.0', author_name: 'Steve Lee', copyright_notice_url: 'https://creativecommons.org/licenses/by-sa/4.0/', source_url: 'https://mulberrysymbols.org' } },
      { id: '2', license: { type: 'CC BY-NC-SA 3.0', author_name: 'Sergio Palao', copyright_notice_url: 'javascript:alert(1)' } },
      { id: '3', license: { type: '  ' } }, { id: '4' }, null
    ]);
    expect(Object.keys(credits)).toEqual(['1', '2']);
    expect(credits['1']).toMatchObject({ license: 'CC BY-SA 4.0', author: 'Steve Lee', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', url: 'https://mulberrysymbols.org' });
    expect(credits['2']).toMatchObject({ license: 'CC BY-NC-SA 3.0', author: 'Sergio Palao' });
    expect(credits['2'].licenseUrl).toBeUndefined();
    const board = licence => api.obfBoardLicense(licence.map(type => ({ license: { type } }))).type;
    expect(board(['CC BY 2.0'])).toBe('CC By');
    expect(board(['CC BY 2.0', 'CC BY-SA 4.0'])).toBe('CC By-Sa');
    expect(board(['CC BY-SA 4.0', 'CC BY-NC-SA 3.0'])).toBe('CC By-Nc-Sa');
    expect(board(['CC BY-NC 4.0'])).toBe('CC By-Nc');
    // The imported credit is the cell's own, so it exports again unchanged.
    const cell = { image: symbol, attribution: credits['2'], creditPicture: api.pictureKey(symbol) };
    expect(api.obfImageLicenseFor([], symbol, cell)).toMatchObject({ type: 'CC BY-NC-SA 3.0', author_name: 'Sergio Palao' });
  });
});

describe('the Symbol Studio keeps credits on boards when the bank changes', () => {
  it('leaves a deleted Mulberry symbol\'s credit on the saved board cell that still shows it', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const Studio = window.AlloModules.SymbolStudio;
    localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'ph', name: 'Demo' }]));
    localStorage.setItem('alloActiveProfileId', JSON.stringify('ph'));
    localStorage.setItem('alloSymbolGallery__ph', JSON.stringify([{ id: 'm', label: 'more', image: symbol, source: 'mulberry', validated: true, attribution: MULBERRY }]));
    localStorage.setItem('alloSymbolBoards__ph', JSON.stringify([{ id: 'b1', title: 'Snack', cols: 4, words: [{ id: 'w1', label: 'more', image: symbol, assetId: 'm' }, { id: 'w2', label: 'hi', image: drawn }] }]));
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Studio, baseProps({}))));
    await act(async () => host.querySelector('[aria-label^="Select symbol: more"]').click());
    await act(async () => host.querySelector('[aria-label="Delete more symbol"]').click());
    expect(JSON.parse(localStorage.getItem('alloSymbolGallery__ph'))).toEqual([]);
    const [board] = JSON.parse(localStorage.getItem('alloSymbolBoards__ph'));
    expect(board.words[0]).toMatchObject({ attribution: { author: 'Steve Lee', license: 'CC BY-SA 4.0' }, creditPicture: api.pictureKey(symbol) });
    expect(board.words[1].attribution).toBeUndefined();
    // Exported afterwards, the board still says whose picture it is.
    expect(api.obfImageLicenseFor([], symbol, board.words[0])).toMatchObject({ type: 'CC BY-SA 4.0', author_name: 'Steve Lee' });
  });
});

describe('credits reach student devices with the board', () => {
  it('keeps each picture credit through the live and homework board normalizer, with safe links only', async () => {
    const { loadAlloModule } = await import('./setup.js');
    if (!window.AlloModules.LiveAac) loadAlloModule('live_aac_module.js');
    const pack = api.buildPortableAACPackage({ id: 'b1', title: 'Snack', words: [{ id: 'a', label: 'more', image: symbol }, { id: 'c', label: 'hi', image: drawn }] },
      { creditFor: cell => api.cellCreditFor([{ id: 'm', image: symbol, attribution: { ...MULBERRY, url: 'javascript:alert(1)' } }], cell) });
    const clean = window.AlloModules.LiveAac.normalizePortable(pack, { allowAudio: false });
    const [more, hi] = clean.pages[0].cells;
    expect(more.credit).toEqual({ license: 'CC BY-SA 4.0', set: 'Mulberry Symbols', author: 'Steve Lee', via: 'Global Symbols', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' });
    expect('credit' in hi).toBe(false);
    // No picture, no credit.
    const noPicture = window.AlloModules.LiveAac.normalizePortable({ ...pack, pages: [{ ...pack.pages[0], cells: [{ ...pack.pages[0].cells[0], image: null }] }] }, { allowAudio: false });
    expect('credit' in noPicture.pages[0].cells[0]).toBe(false);
  });
});

describe('printed boards say whose pictures they use', () => {
  it('prints credits as readable text with their addresses, once each, escaped', () => {
    const html = api.pictureCreditsHTML([api.cellCreditFor([{ image: symbol, attribution: MULBERRY }], { image: symbol }), null,
      { license: 'CC BY 2.0', author: 'Kim <b>', title: 'Dog', url: 'https://commons.wikimedia.org/wiki/File:Dog.jpg', licenseUrl: 'javascript:alert(1)' },
      api.cellCreditFor([{ image: symbol, attribution: MULBERRY }], { image: symbol })]);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('h2').textContent).toBe('Picture credits');
    expect([...doc.querySelectorAll('li')].map(li => li.textContent)).toEqual([
      'Mulberry Symbols by Steve Lee, CC BY-SA 4.0, via Global Symbols (License: https://creativecommons.org/licenses/by-sa/4.0/; Source: https://mulberrysymbols.org)',
      '“Dog” by Kim <b>, CC BY 2.0 (Source: https://commons.wikimedia.org/wiki/File:Dog.jpg)']);
    expect(doc.querySelectorAll('b').length).toBe(0);
    expect(api.pictureCreditsHTML([null, { author: 'No licence' }])).toBe('');
    // A report page's pictures are credited from the bank by picture.
    const page = '<div><img src="' + symbol + '" alt="more"><img src="' + drawn + '" alt="hi"></div>';
    expect(api.creditsForPrintedImages(page, [{ image: symbol, attribution: MULBERRY }]).filter(Boolean).map(credit => credit.author)).toEqual(['Steve Lee']);
  });

  it('shows the credits under a board being built, so they print with it', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'ph', name: 'Demo' }]));
    localStorage.setItem('alloActiveProfileId', JSON.stringify('ph'));
    localStorage.setItem('alloSymbolGallery__ph', JSON.stringify([{ id: 'm', label: 'more', image: symbol, source: 'mulberry', validated: true, attribution: MULBERRY }]));
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(window.AlloModules.SymbolStudio, baseProps({}))));
    await act(async () => host.querySelector('#ss-tab-board').click());
    expect(host.querySelector('[data-board-picture-credits]')).toBe(null);
    await act(async () => host.querySelector('[aria-label="From Symbol Bank"]').click());
    const item = [...host.querySelectorAll('div')].find(node => node.style.cursor === 'pointer' && node.textContent.trim() === 'more');
    await act(async () => item.click());
    const credits = host.querySelector('#ss-pb [data-board-picture-credits]');
    expect(credits.textContent).toBe('Picture credits: Mulberry Symbols by Steve Lee, CC BY-SA 4.0, via Global Symbols (https://creativecommons.org/licenses/by-sa/4.0/)');
  });
});
