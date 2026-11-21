// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

let ReadingLibrary;
let host;
let root;

beforeAll(() => {
  window.React = globalThis.React = React;
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  window.AlloSpeechPlayer = { speak: () => true, stop: () => {} };
  loadAlloModule('reading_library_module.js');
  ReadingLibrary = window.AlloModules.ReadingLibrary;
});

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount(); });
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
});

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

function makeBook(pages, extra = {}) {
  return Object.assign({
    slug: 'picker-test-book',
    title: 'Multi-Page Reading',
    language: 'English',
    langCode: 'en',
    isRtl: false,
    level: '4',
    contentType: 'public-domain-full-text',
    authors: ['Test Author'],
    source: { id: 'gutenberg', name: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1' },
    license: 'Public Domain',
    stats: { pages: pages.length, words: 12000 },
    pages,
  }, extra);
}

async function mountReader(book, extraProps = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const calls = { inputText: [], toasts: [], exits: [] };
  await act(async () => {
    root.render(React.createElement(ReadingLibrary.BookReader, Object.assign({
      book,
      isTeacherMode: true,
      setInputText: (txt) => calls.inputText.push(txt),
      addToast: (msg, type) => calls.toasts.push([msg, type]),
      onExit: (closeAll) => calls.exits.push(closeAll),
    }, extraProps)));
  });
  await flush();
  return calls;
}

describe('Reading Library prominent Use as source text button & page-scope picker', () => {
  const multiPageBook = makeBook([
    { n: 1, img: null, text: 'CHAPTER I\n\nOpening paragraph on page one.' },
    { n: 2, img: null, text: 'Second page continues chapter one.' },
    { n: 3, img: null, text: 'CHAPTER II\n\nThird page starts chapter two.' },
    { n: 4, img: null, text: 'Fourth page concludes the reading.' },
  ]);

  it('shows a top-level Use as source text button and defaults multi-page picker to All pages', async () => {
    const calls = await mountReader(multiPageBook);
    const btn = host.querySelector('[data-testid="readinglib-use-source-btn"]');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Use as source text');

    await act(async () => { btn.click(); });
    await flush();

    const dialog = host.querySelector('[data-testid="readinglib-source-picker"]');
    expect(dialog).toBeTruthy();
    const wholeRadio = dialog.querySelector('input[type="radio"][value="whole"]');
    expect(wholeRadio.checked).toBe(true);

    const confirmBtn = dialog.querySelector('[data-testid="readinglib-source-picker-confirm"]');
    expect(confirmBtn.textContent).toContain('Use all 4 pages');

    await act(async () => { confirmBtn.click(); });
    await flush();

    expect(calls.inputText.length).toBe(1);
    expect(calls.inputText[0]).toContain('Opening paragraph on page one.');
    expect(calls.inputText[0]).toContain('Second page continues chapter one.');
    expect(calls.inputText[0]).toContain('Third page starts chapter two.');
    expect(calls.inputText[0]).toContain('Fourth page concludes the reading.');
    expect(calls.toasts[0][0]).toContain('All 4 pages');
    expect(calls.exits).toEqual([true]);
  });

  it('lets the user choose Current page in the picker', async () => {
    const calls = await mountReader(multiPageBook);
    await act(async () => { host.querySelector('[data-testid="readinglib-use-source-btn"]').click(); });
    await flush();

    const dialog = host.querySelector('[data-testid="readinglib-source-picker"]');
    const pageRadio = dialog.querySelector('input[type="radio"][value="page"]');
    await act(async () => { pageRadio.click(); });
    await flush();

    const confirmBtn = dialog.querySelector('[data-testid="readinglib-source-picker-confirm"]');
    expect(confirmBtn.textContent).toContain('Use page 1');

    await act(async () => { confirmBtn.click(); });
    await flush();

    expect(calls.inputText[0]).toContain('Selection: Page 1');
    expect(calls.inputText[0]).toContain('Opening paragraph on page one.');
    expect(calls.inputText[0]).not.toContain('Fourth page concludes the reading.');
  });

  it('lets the user choose Current chapter when chapters are detected', async () => {
    const calls = await mountReader(multiPageBook);
    await act(async () => { host.querySelector('[data-testid="readinglib-use-source-btn"]').click(); });
    await flush();

    const dialog = host.querySelector('[data-testid="readinglib-source-picker"]');
    const chapRadio = dialog.querySelector('input[type="radio"][value="chapter"]');
    expect(chapRadio).toBeTruthy();
    await act(async () => { chapRadio.click(); });
    await flush();

    await act(async () => { dialog.querySelector('[data-testid="readinglib-source-picker-confirm"]').click(); });
    await flush();

    expect(calls.inputText[0]).toContain('Opening paragraph on page one.');
    expect(calls.inputText[0]).toContain('Second page continues chapter one.');
    expect(calls.inputText[0]).not.toContain('Third page starts chapter two.');
  });

  it('lets the user pick a Page range and normalizes reversed From/To inputs', async () => {
    const calls = await mountReader(multiPageBook);
    await act(async () => { host.querySelector('[data-testid="readinglib-use-source-btn"]').click(); });
    await flush();

    const dialog = host.querySelector('[data-testid="readinglib-source-picker"]');
    await act(async () => { dialog.querySelector('input[type="radio"][value="range"]').click(); });
    await flush();

    const fromInput = dialog.querySelector('input[aria-label="From page"]');
    const toInput = dialog.querySelector('input[aria-label="To page"]');
    setInputValue(fromInput, '4');
    setInputValue(toInput, '2');
    await flush();

    const confirmBtn = dialog.querySelector('[data-testid="readinglib-source-picker-confirm"]');
    expect(confirmBtn.textContent).toContain('Use pages 2');
    expect(confirmBtn.textContent).toContain('4');

    await act(async () => { confirmBtn.click(); });
    await flush();

    expect(calls.inputText[0]).toContain('Selection: Pages 2-4');
    expect(calls.inputText[0]).not.toContain('Opening paragraph on page one.');
    expect(calls.inputText[0]).toContain('Second page continues chapter one.');
    expect(calls.inputText[0]).toContain('Fourth page concludes the reading.');
  });

  it('loads a single-page text immediately without showing the picker', async () => {
    const singleBook = makeBook([{ n: 1, img: null, text: 'Only one page in this short reading.' }], {
      slug: 'single-page-book',
      title: 'Short Reading',
    });
    const calls = await mountReader(singleBook);
    await act(async () => { host.querySelector('[data-testid="readinglib-use-source-btn"]').click(); });
    await flush();

    expect(host.querySelector('[data-testid="readinglib-source-picker"]')).toBeNull();
    expect(calls.inputText.length).toBe(1);
    expect(calls.inputText[0]).toContain('Only one page in this short reading.');
  });

  it('closes cleanly on Escape without calling setInputText', async () => {
    const calls = await mountReader(multiPageBook);
    await act(async () => { host.querySelector('[data-testid="readinglib-use-source-btn"]').click(); });
    await flush();

    expect(host.querySelector('[data-testid="readinglib-source-picker"]')).toBeTruthy();
    await act(async () => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await flush();

    expect(host.querySelector('[data-testid="readinglib-source-picker"]')).toBeNull();
    expect(calls.inputText.length).toBe(0);
  });
});
