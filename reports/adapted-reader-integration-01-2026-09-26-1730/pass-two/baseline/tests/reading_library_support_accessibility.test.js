import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
// Real module loading and nested React integration share the workspace with app builds.
vi.setConfig({ testTimeout: 30000 });
const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
let React, act, createRoot, ReadingLibrary, host, root;
const book = { slug: 'reader-access-fixture', title: 'Reader access fixture', language: 'English', langCode: 'en', level: '4', contentType: 'public-domain-full-text', authors: [], license: 'Public Domain', source: { name: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1' }, pages: [{ n: 1, text: 'First page with many useful words.' }, { n: 2, text: 'Second page remains available.' }] };
beforeAll(() => {
  React = require(resolve(modules, 'react')); act = React.act;
  createRoot = require(resolve(modules, 'react-dom/client')).createRoot;
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloSpeechPlayer = { stop() {} };
  window.AlloModules.FocusReaderOverlay = () => null;
  loadAlloModule('reading_library_module.js'); ReadingLibrary = window.AlloModules.ReadingLibrary;
});
beforeEach(() => { localStorage.clear(); });
afterEach(() => { if (root) act(() => root.unmount()); root = null; if (host) host.remove(); vi.restoreAllMocks(); });
async function settle() { for (let i = 0; i < 8; i++) await act(async () => { await Promise.resolve(); }); }
async function mount(nested = false) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const props = { book, onExit: vi.fn(), callGemini: () => Promise.resolve('A useful definition.'), isTeacherMode: true };
  if (nested) {
    window.fetch = async url => ({ ok: true, json: async () => String(url).includes('index.json') ? { books: [{ ...book, file: 'books/fixture.json' }] } : book });
    await act(async () => root.render(React.createElement(ReadingLibrary, { ...props, isOpen: true, initialBookSlug: book.slug, onClose: vi.fn() })));
  } else await act(async () => root.render(React.createElement(ReadingLibrary.BookReader, props)));
  await settle();
}
function btn(text, within = host) { const b = [...within.querySelectorAll('button')].find(x => x.textContent.includes(text)); if (!b) throw Error('Missing button ' + text); return b; }
function click(el) { act(() => { el.focus(); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); }
function key(el, value, extra = {}) { const ev = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...extra }); act(() => el.dispatchEvent(ev)); return ev; }
function page() { return host.querySelector('[aria-label="Reading page"]'); }
function band() { return host.querySelector('[data-rl-ruler-band]'); }
function geometry(height = 400) { vi.spyOn(page(), 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 100 + height, height, left: 0, width: 300 }); act(() => window.dispatchEvent(new Event('resize'))); }

describe('library reading support keyboard recovery', () => {
  it.each(['Aa', 'Reading tools', 'Translate', 'Create'])('Escape dismisses %s and restores its opener before the enclosing book', async label => {
    await mount(true);
    const opener = btn(label); click(opener);
    const panel = host.querySelector('[data-rl-reader-panel]');
    expect(panel).toBeTruthy(); expect(panel.contains(document.activeElement)).toBe(true);
    expect(host.querySelector('[aria-label="Go to page"]').value).toBe('1');
    key(document.activeElement, 'End');
    expect(host.querySelector('[aria-label="Go to page"]').value).toBe('1');
    key(document.activeElement, 'Escape');
    expect(host.querySelector('[data-rl-reader-panel]')).toBeNull();
    expect(document.activeElement).toBe(opener); expect(page()).toBeTruthy();
    key(opener, 'Escape'); expect(page()).toBeNull();
  });
  it('My words traps both Tab directions and returns focus without exiting the book', async () => {
    localStorage.setItem('allo_reading_lib_words', JSON.stringify([{ word: 'useful', text: 'Helpful.', language: 'English' }]));
    await mount(true); const opener = btn('My words'); click(opener);
    const dialog = host.querySelector('[data-testid="word-bank"]'), controls = [...dialog.querySelectorAll('button')];
    expect(dialog.contains(document.activeElement)).toBe(true);
    act(() => controls[controls.length - 1].focus()); key(document.activeElement, 'Tab'); expect(document.activeElement).toBe(controls[0]);
    key(document.activeElement, 'Tab', { shiftKey: true }); expect(document.activeElement).toBe(controls[controls.length - 1]);
    key(document.activeElement, 'Escape'); expect(host.querySelector('[data-testid="word-bank"]')).toBeNull();
    expect(document.activeElement).toBe(opener); expect(page()).toBeTruthy();
  });
  it('Escape closes a word lookup and preserves the focused word and book', async () => {
    await mount(true); click(btn('Define')); const word = host.querySelector('[aria-label="Define: First"]'); click(word); await settle();
    expect(host.querySelector('[data-rl-word-popup]')).toBeTruthy(); key(word, 'Escape');
    expect(host.querySelector('[data-rl-word-popup]')).toBeNull(); expect(document.activeElement).toBe(word); expect(page()).toBeTruthy();
  });
  it('names the Aa support trigger and custom translation language input', async () => {
    await mount(); expect(host.querySelector('button[aria-label="Reading supports"]')).toBeTruthy();
    click(btn('Translate')); expect(host.querySelector('input[aria-label="Translation language"]')).toBeTruthy();
  });
});

describe('library reading ruler', () => {
  it('shows a saved-on guide immediately and supports line movement plus scrolling at the edge', async () => {
    localStorage.setItem('allo_reading_lib_prefs', JSON.stringify({ ruler: true })); await mount();
    expect(band()).toBeTruthy(); expect(page().tabIndex).toBe(0); expect(document.getElementById(page().getAttribute('aria-describedby')).textContent).toContain('Up and Down');
    geometry(); expect(band().style.top).toBe('166px');
    const text = page().querySelector('[data-rl-reading-text]'); text.style.lineHeight = '40px';
    key(page(), 'ArrowDown'); expect(band().style.top).toBe('206px');
    key(page(), 'ArrowUp'); expect(band().style.top).toBe('166px');
    for (let i = 0; i < 8; i++) key(page(), 'ArrowDown');
    expect(band().style.top).toBe('332px'); expect(page().firstElementChild.scrollTop).toBeGreaterThan(0);
  });
  it('supports touch positioning without preventing scrolling, preserves the band on leave and clamps reflow', async () => {
    await mount(); click(btn('Aa')); click(btn('Reading ruler')); key(document.activeElement, 'Escape'); geometry();
    const touch = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 200 });
    Object.defineProperty(touch, 'pointerType', { value: 'touch' }); act(() => page().dispatchEvent(touch));
    expect(touch.defaultPrevented).toBe(false); expect(band().style.top).toBe('66px');
    act(() => page().dispatchEvent(new MouseEvent('pointerout', { bubbles: true }))); expect(band()).toBeTruthy();
    vi.spyOn(page(), 'getBoundingClientRect').mockReturnValue({ top: 100, height: 40, bottom: 140 });
    act(() => window.dispatchEvent(new Event('resize'))); expect(band().style.top).toBe('0px');
  });
  it('leaves descendant controls and disabled-ruler native arrows alone', async () => {
    localStorage.setItem('allo_reading_lib_prefs', JSON.stringify({ ruler: true })); await mount(); geometry();
    const input = document.createElement('input'); page().appendChild(input);
    const original = band().style.top; const ev = key(input, 'ArrowDown'); expect(ev.defaultPrevented).toBe(false); expect(band().style.top).toBe(original); input.remove();
    click(btn('Aa')); click(btn('Reading ruler')); key(document.activeElement, 'Escape');
    expect(band()).toBeNull(); expect(key(page(), 'ArrowDown').defaultPrevented).toBe(false);
  });
});

describe('library inherits the canonical font selection', () => {
  it('Default applies every current catalog class to actual book text', async () => {
    loadAlloModule('ui_font_library_module.js');
    const catalog = window.FONT_OPTIONS;
    expect(catalog.length).toBeGreaterThan(20);
    await mount();
    for (const font of catalog) {
      localStorage.setItem('allo_selected_font', font.id);
      await act(async () => root.render(React.createElement(ReadingLibrary.BookReader, { book, revision: font.id })));
      const text = page().querySelector('[data-rl-reading-text]');
      if (font.cssClass) expect(text.classList.contains(font.cssClass), font.id).toBe(true);
      else expect(catalog.filter(f => f.cssClass).some(f => text.classList.contains(f.cssClass))).toBe(false);
    }
  });
  it('keeps an explicit local reader font ahead of the app preference', async () => {
    localStorage.setItem('allo_selected_font', 'georgia');
    localStorage.setItem('allo_reading_lib_prefs', JSON.stringify({ font: 'lexend' }));
    await mount(); const text = page().querySelector('[data-rl-reading-text]');
    expect(text.classList.contains('font-lexend')).toBe(true); expect(text.classList.contains('font-georgia')).toBe(false);
  });
  it('retains known local fallback fonts without the catalog and ignores unknown stored IDs', async () => {
    const catalog = window.FONT_OPTIONS;
    try {
      delete window.FONT_OPTIONS;
      localStorage.setItem('allo_selected_font', 'andika'); await mount();
      expect(page().querySelector('[data-rl-reading-text]').classList.contains('font-andika')).toBe(true);
      localStorage.setItem('allo_selected_font', 'font-made-up injected-class');
      await act(async () => root.render(React.createElement(ReadingLibrary.BookReader, { book, revision: 1 })));
      expect(page().querySelector('[data-rl-reading-text]').className).not.toContain('injected-class');
      expect(page().querySelector('[data-rl-reading-text]').className).not.toContain('font-andika');
      window.FONT_OPTIONS = catalog;
      await act(async () => root.render(React.createElement(ReadingLibrary.BookReader, { book, revision: 2 })));
      expect(page().querySelector('[data-rl-reading-text]').className).not.toContain('injected-class');
    } finally { window.FONT_OPTIONS = catalog; }
  });
});

describe('library-launched reading overlays', () => {
  it.each([
    ['Focus / bionic reader', 'focus-reader-dialog-title'],
    ['Karaoke read-along', 'karaoke-reader-dialog-title'],
    ['Story crawl', 'perspective-crawl-dialog-title'],
  ])('%s owns focus and Escape without exiting the book beneath it', async (label, id) => {
    globalThis.React = window.React = React;
    window.AlloLanguageContext = React.createContext({ t: k => k });
    loadAlloModule('immersive_reader_module.js');
    await mount(true); const opener = btn('Reading tools'); click(opener); click(btn(label));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
    const dialog = host.querySelector('[aria-labelledby="' + id + '"]'); expect(dialog).toBeTruthy();
    expect(dialog.contains(document.activeElement)).toBe(true);
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
    act(() => controls[controls.length - 1].focus()); key(document.activeElement, 'Tab');
    expect(dialog.contains(document.activeElement)).toBe(true);
    key(document.activeElement, 'Escape'); await settle();
    expect(host.querySelector('[aria-labelledby="' + id + '"]')).toBeNull(); expect(page()).toBeTruthy(); expect(document.activeElement).toBe(opener);
  });
});
