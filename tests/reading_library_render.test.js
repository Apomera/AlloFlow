// Reading Library — real-React render smoke test.
//
// The pure-helper suite (reading_library.test.js) stubs React, so it can't
// catch render crashes, hook-order bugs, or broken wiring between browse →
// reader → export. This mounts the real module with the real React renderer
// (same harness as anchor_charts_hooks_guard.test.js), serves the REAL
// mirrored index/book data through a stubbed fetch, and drives:
//   browse grid → narrated-only filter → open an RTL book → reader dir/lang
//   → 🌐 AI-translate (stubbed Gemini) → caveat banner → ✨ Use as source text.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// The catalog is 3k+ entries and every mount() renders the full browse grid
// in jsdom; when this suite runs alongside the data-contract suite on a
// OneDrive-synced tree, the 5s default flakes on whichever test lands on a
// busy worker. These are integration-weight tests; give them real headroom.
vi.setConfig({ testTimeout: 30000 });
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ROOT = resolve(process.cwd());
const LIB_DIR = path.join(ROOT, 'reading_library');

let React, ReactDOMClient, act, ReadingLibrary;
const index = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'index.json'), 'utf8'));
const cardIndex = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'index_cards.json'), 'utf8'));
// The browse-facing catalog is the union: core books plus the lazily-loaded
// catalog cards. Fixtures and card assertions must use the merged list.
const allBooks = index.books.concat(cardIndex.books);
// A deterministic RTL fixture: the first Arabic book in the index.
const rtlEntry = index.books.find((b) => b.language === 'Arabic');
const rtlBook = JSON.parse(fs.readFileSync(path.join(LIB_DIR, rtlEntry.file), 'utf8'));
const frontiersEntry = index.books.find((b) => b.sourceId === 'frontiers');
const longTextEntry = index.books.find((b) => b.sourceId === 'gutenberg' && b.contentType === 'public-domain-full-text' && /Pride and Prejudice/i.test(b.title)) ||
  index.books.find((b) => b.sourceId === 'gutenberg' && b.contentType === 'public-domain-full-text');
const longTextBook = JSON.parse(fs.readFileSync(path.join(LIB_DIR, longTextEntry.file), 'utf8'));

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  // Serve the real mirrored data through fetch (the module tries CDN → GitHub
  // → relative; every index.json/book URL resolves from disk here).
  window.fetch = (url) => {
    const u = String(url);
    let payload = null;
    if (u.includes('index_cards.json')) payload = cardIndex;
    else if (u.includes('index.json')) payload = index;
    else {
      const m = /books\/([^?]+\.json)/.exec(u);
      if (m) {
        const p = path.join(LIB_DIR, 'books', m[1]);
        if (fs.existsSync(p)) payload = JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    }
    if (!payload) return Promise.resolve({ ok: false, status: 404 });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
  };
  loadAlloModule('reading_library_module.js');
  ReadingLibrary = window.AlloModules.ReadingLibrary;
  if (!ReadingLibrary) throw new Error('ReadingLibrary did not register');
});

let root, host;
afterEach(() => {
  if (root) { try { root.unmount(); } catch (_) {} root = null; }
  if (host) { host.remove(); host = null; }
});

const flush = async () => { await act(async () => { await Promise.resolve(); }); };
// The lazy card index loads via fetch().then().then()->setState; give the
// promise chain and its re-render several ticks to settle.
const settle = async () => { for (let i = 0; i < 6; i++) await flush(); };

function textOf(el) { return (el && el.textContent) || ''; }

function clickByText(container, tag, needle) {
  const els = Array.from(container.querySelectorAll(tag));
  const el = els.find((b) => textOf(b).includes(needle));
  if (!el) throw new Error(`no <${tag}> containing "${needle}"`);
  act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
  return el;
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

// The browse grid now defaults to the English language filter; tests that need
// the whole catalog reset it to '' (All), while book-specific tests narrow by language.
function selectLang(value) {
  const sel = host.querySelector('select[aria-label="Language"]') || host.querySelector('select');
  act(() => { sel.value = value; sel.dispatchEvent(new window.Event('change', { bubbles: true })); });
}

async function chooseCollection(label) {
  clickByText(host, 'button', label);
  await flush();
}

async function chooseStories() {
  await chooseCollection('StoryWeaver');
}

async function mount(extraProps = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const calls = { toasts: [], generate: [], inputText: [], saved: [], closed: 0 };
  const props = {
    isOpen: true,
    onClose: () => { calls.closed++; },
    addToast: (m, t) => calls.toasts.push([m, t]),
    callGemini: () => Promise.resolve(''),
    handleGenerate: (...a) => calls.generate.push(a),
    setInputText: (t) => calls.inputText.push(t),
    onSaveToLesson: (ref) => calls.saved.push(ref),
    isTeacherMode: true,
    ...extraProps,
  };
  await act(async () => { root.render(React.createElement(ReadingLibrary, props)); });
  await flush();
  return { calls, props };
}

describe('browse view', () => {
  it('renders the browse grid, filters, and teacher language-options entry', async () => {
    await mount();
    expect(textOf(host)).toContain('Reading Collections');
    expect(textOf(host)).toContain('Science & nonfiction');
    expect(textOf(host)).toContain('Frontiers for Young Minds');
    // The Stories shelf carries both picture-book sources.
    const storyEntries = index.books.filter((b) => ['storyweaver', 'bloom'].includes(b.sourceId || 'storyweaver'));
    await chooseStories();
    // the grid defaults to the English language filter
    const langSelect = host.querySelector('select[aria-label="Language"]');
    expect(langSelect.value).toBe('English');
    // language filter carries every language (+ the "All languages" option)
    expect(langSelect.querySelectorAll('option').length).toBe(index.languages.length + 1);
    // switch to All languages: the Stories shelf counts only StoryWeaver books
    selectLang(''); await flush();
    expect(textOf(host)).toContain(storyEntries.length + ' ');
    // narrated-only toggle narrows the grid
    const narrated = storyEntries.filter((b) => b.hasAudio).length;
    clickByText(host, 'button', 'Narrated only');
    await flush();
    expect(textOf(host)).toContain(narrated + ' ');
    clickByText(host, 'button', 'Collections');
    await flush();
    expect(textOf(host)).toContain('History & primary sources');
    await chooseCollection('All sources');
    selectLang(''); await settle(); // All sources pulls in the lazy catalog cards
    expect(textOf(host)).toContain(allBooks.length + ' ');
    clickByText(host, 'button', 'Collections');
    await flush();
    await chooseStories();
    // teacher sees the language-options explainer
    clickByText(host, 'button', 'Language options');
    await flush();
    expect(textOf(host)).toContain('Instant AI translation');
    expect(textOf(host)).toContain('Request a permanent addition');
  });

  it('hides the language-options and find-more entries for students', async () => {
    await mount({ isTeacherMode: false });
    const btns = Array.from(host.querySelectorAll('button')).map(textOf);
    expect(btns.some((t) => t.includes('Language options'))).toBe(false);
    expect(btns.some((t) => t.includes('Find more books'))).toBe(false);
  });

  it('search matches MARC subjects and cards show subject chips', async () => {
    // Catalog-card descriptions are one generic boilerplate line, so topic
    // search must work through the subjects field. Pick a card whose first
    // subject has a token that appears in NO title/author/description — the
    // only way the card can match is via subjects.
    const cards = cardIndex.books.filter((b) => b.contentType === 'public-domain-catalog-card');
    let fixture = null, term = '';
    outer: for (const c of cards) {
      for (const s of c.subjects || []) {
        const token = (String(s).split(' -- ')[0].match(/[A-Za-z-]{7,}/g) || [])[0];
        if (!token) continue;
        const t = token.toLowerCase();
        const hitsElsewhere = (b) => (b.title + ' ' + (b.authors || []).join(' ') + ' ' + (b.description || '')).toLowerCase().includes(t);
        if (!hitsElsewhere(c) && !allBooks.some(hitsElsewhere)) { fixture = c; term = token; break outer; }
      }
    }
    expect(fixture).toBeTruthy();
    await mount();
    await chooseCollection('History & primary sources');
    const search = host.querySelector('input[aria-label="Search"]');
    setInputValue(search, term);
    await settle(); // the searched card lives in the lazy index — let it load
    expect(textOf(host)).toContain(fixture.title);
    // the matching card renders its subject-head chips
    const head = String(fixture.subjects[0]).split(' -- ')[0].trim().slice(0, 40);
    expect(textOf(host)).toContain(head);
  });

  it('lazy-loads the catalog-card index only when a card-bearing view needs it', async () => {
    // A distinctive catalog-card title that lives only in the lazy index.
    const cardEntry = cardIndex.books.find((b) => b.contentType === 'public-domain-catalog-card' && b.title && b.title.length > 8);
    expect(cardEntry).toBeTruthy();
    await mount();
    await chooseStories();
    selectLang(''); await settle();
    // Default Stories shelf: the lazy cards were never fetched, so a
    // History-only stub is absent even after everything settles.
    expect(textOf(host)).not.toContain(cardEntry.title);
    // Entering History triggers the one-shot lazy fetch; the stub appears.
    clickByText(host, 'button', 'Collections');
    await flush();
    await chooseCollection('History & primary sources');
    selectLang(''); await settle();
    const search = host.querySelector('input[aria-label="Search"]');
    setInputValue(search, cardEntry.title.slice(0, 18));
    await settle();
    expect(textOf(host)).toContain(cardEntry.title);
  });

  it('offers home-language quick-pick chips that filter the shelf', async () => {
    // The Stories shelf is multilingual, so the chip row appears; pick the
    // best-stocked non-English language as a deterministic fixture.
    // Match the module's count basis: all Stories-shelf books (storyweaver +
    // bloom, cards included), non-English, ranked by count.
    const stories = index.books.filter((b) => ['storyweaver', 'bloom'].includes(b.sourceId || 'storyweaver'));
    const counts = {};
    stories.forEach((b) => { if (b.language !== 'English') counts[b.language] = (counts[b.language] || 0) + 1; });
    const topLang = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    expect(topLang).toBeTruthy();
    await mount();
    await chooseStories();
    const row = host.querySelector('[data-testid="home-languages"]');
    expect(row).toBeTruthy();
    expect(textOf(row)).toContain('Home languages');
    // Tapping the language's chip drives the same filter as the dropdown.
    clickByText(row, 'button', topLang);
    await flush();
    const langSelect = host.querySelector('select[aria-label="Language"]');
    expect(langSelect.value).toBe(topLang);
  });

  it('the "Readable in app" toggle hides link-out source cards', async () => {
    await mount();
    await chooseCollection('History & primary sources');
    selectLang(''); await settle(); // History pulls in the lazy catalog cards
    const history = allBooks.filter((b) => ['wikisource', 'loc', 'gutenberg'].includes(b.sourceId));
    const readable = history.filter((b) => !/card/.test(b.contentType));
    expect(textOf(host)).toContain(history.length + ' ');
    clickByText(host, 'button', 'Readable in app');
    await flush();
    expect(textOf(host)).toContain(readable.length + ' ');
    // The toggle only appears on shelves that actually mix in cards
    // (data-driven: Bloom NC link-out cards put cards on Stories too).
    clickByText(host, 'button', 'Collections');
    await flush();
    await chooseStories();
    const storiesHasCards = index.books.some((b) =>
      ['storyweaver', 'bloom'].includes(b.sourceId || 'storyweaver') && /card/.test(b.contentType || ''));
    const btns = Array.from(host.querySelectorAll('button')).map(textOf);
    expect(btns.some((t) => t.includes('Readable in app'))).toBe(storiesHasCards);
  });

  it('teacher searches Project Gutenberg (Gutendex) and queues an import request', async () => {
    try { window.localStorage.clear(); } catch (_) {}
    const realFetch = window.fetch;
    window.fetch = (url) => {
      if (String(url).includes('gutendex.com')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({
          results: [{
            id: 424242, title: 'A Test Public-Domain Book', copyright: false, download_count: 6208,
            authors: [{ name: 'Grahame, Kenneth' }], subjects: ['Animals', 'Fantasy'],
            formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/424242/424242-0.txt' },
          }],
        }) });
      }
      return realFetch(url);
    };
    try {
      await mount();
      clickByText(host, 'button', 'Find more books');
      await flush();
      const input = host.querySelector('input[aria-label="Find more books"]');
      expect(input).toBeTruthy();
      setInputValue(input, 'wind in the willows');
      clickByText(host, 'button', 'Search');
      await flush();
      expect(textOf(host)).toContain('A Test Public-Domain Book');
      clickByText(host, 'button', 'Request import');
      await flush();
      expect(textOf(host)).toContain('1 books requested');
    } finally {
      window.fetch = realFetch;
      try { window.localStorage.clear(); } catch (_) {}
    }
  });

  it('sorts by reading level (easiest first) by default', async () => {
    await mount();
    await chooseStories();
    // Find controls by aria-label — the Stories shelf gained a conditional
    // source <select> (StoryWeaver + Bloom), so positional indexes shift.
    const sortSel = host.querySelector('select[aria-label="Sort by"]');
    expect(sortSel.value).toBe('level');
    // narrow to one language to keep the grid light; ordering still applies
    selectLang('English');
    await flush();
    const levels = Array.from(host.querySelectorAll('button'))
      .map((b) => { const m = /Level\s+(\d)/.exec(textOf(b)); return m ? Number(m[1]) : 0; })
      .filter((n) => n > 0);
    expect(levels.length).toBeGreaterThan(3);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
  });

  it('re-sorts to Title A–Z when chosen', async () => {
    await mount();
    await chooseStories();
    selectLang('English');
    const sortSel = host.querySelector('select[aria-label="Sort by"]');
    act(() => { sortSel.value = 'title'; sortSel.dispatchEvent(new window.Event('change', { bubbles: true })); });
    await flush();
    // card buttons carry a "Level N" badge; the title is the .font-bold node
    const cards = Array.from(host.querySelectorAll('button')).filter((b) => /Level\s+\d/.test(textOf(b)));
    const titles = cards.map((b) => { const t = b.querySelector('.font-bold'); return (t ? t.textContent : '').trim().toLowerCase(); });
    expect(titles.length).toBeGreaterThan(3);
    const sorted = titles.slice().sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  it('finds a book from another collection with "All collections" search', async () => {
    await mount();
    await chooseStories(); // StoryWeaver picture books only
    const search = host.querySelector('input[aria-label="Search"]');
    setInputValue(search, 'Hamlet'); // a Shakespeare play lives on the History shelf
    await flush();
    expect(textOf(host)).toContain('No books match');
    clickByText(host, 'button', 'All collections');
    await flush();
    const card = Array.from(host.querySelectorAll('button')).find((b) => /Level\s+\d/.test(textOf(b)) && /Hamlet/.test(textOf(b)));
    expect(card).toBeTruthy();
  });

  it('Find-more supports topic chips, popularity sort, and load-more paging', async () => {
    try { window.localStorage.clear(); } catch (_) {}
    const urls = [];
    const realFetch = window.fetch;
    const page = (id, next) => ({ ok: true, json: () => Promise.resolve({
      next,
      results: [{
        id, title: 'Book ' + id, copyright: false, download_count: 100,
        authors: [{ name: 'X' }], subjects: ['Adventure'],
        formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/' + id + '/' + id + '-0.txt' },
      }],
    }) });
    window.fetch = (url) => {
      const u = String(url);
      if (u.includes('gutendex.com')) {
        urls.push(u);
        return Promise.resolve(u.includes('page=2') ? page(2, null) : page(1, 'https://gutendex.com/books/?page=2'));
      }
      return realFetch(url);
    };
    try {
      await mount();
      clickByText(host, 'button', 'Find more books');
      await flush();
      clickByText(host, 'button', 'Adventure'); // topic chip
      await flush();
      expect(urls.some((u) => /topic=adventure/i.test(u))).toBe(true);
      expect(textOf(host)).toContain('Book 1');
      clickByText(host, 'button', 'Load more'); // pagination
      await flush();
      expect(textOf(host)).toContain('Book 2');
      clickByText(host, 'button', 'Most popular'); // sort
      await flush();
      expect(urls.some((u) => /sort=popular/i.test(u))).toBe(true);
      // switch search language → gutendex languages param follows
      const langSel = host.querySelector('select[aria-label="Search language"]');
      act(() => { langSel.value = 'fr'; langSel.dispatchEvent(new window.Event('change', { bubbles: true })); });
      await flush();
      expect(urls.some((u) => /languages=fr/i.test(u))).toBe(true);
    } finally {
      window.fetch = realFetch;
      try { window.localStorage.clear(); } catch (_) {}
    }
  });

  it('one-click "Add now" imports via the Worker and opens the book', async () => {
    try { window.localStorage.clear(); } catch (_) {}
    // Minimal in-memory IndexedDB good enough for the reader's idb helpers.
    const store = new Map();
    const later = (fn) => Promise.resolve().then(fn);
    window.indexedDB = {
      open() {
        const req = { result: null, onsuccess: null, onerror: null, onupgradeneeded: null };
        req.result = {
          createObjectStore() { return {}; },
          transaction() {
            const tx = { oncomplete: null, onerror: null, objectStore: () => ({
              put(v, k) { store.set(k, v); later(() => tx.oncomplete && tx.oncomplete()); return {}; },
              get(k) { const g = { result: undefined, onsuccess: null, onerror: null }; later(() => { g.result = store.get(k); g.onsuccess && g.onsuccess(); }); return g; },
              delete(k) { store.delete(k); later(() => tx.oncomplete && tx.oncomplete()); return {}; },
            }) };
            return tx;
          },
        };
        later(() => { req.onupgradeneeded && req.onupgradeneeded(); req.onsuccess && req.onsuccess(); });
        return req;
      },
    };
    window.__alloReadingImportEndpoint = 'https://worker.test/import';
    const importedBook = {
      slug: 'gutenberg-ebook-424242-imported-test', title: 'Imported Test Book',
      language: 'English', langCode: 'en', isRtl: false, level: '6',
      contentType: 'public-domain-full-text', authors: ['A. Author'],
      source: { id: 'gutenberg', name: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/424242' },
      license: 'Public Domain', pages: [{ n: 1, img: null, text: 'Hello imported world, this is a page.', words: null }],
      stats: { pages: 1, words: 6 },
    };
    const realFetch = window.fetch;
    window.fetch = (url) => {
      const u = String(url);
      if (u.includes('worker.test')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ book: importedBook }) });
      if (u.includes('gutendex.com')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({
          results: [{ id: 424242, title: 'Imported Test Book', copyright: false, download_count: 10,
            authors: [{ name: 'A. Author' }], subjects: ['Fiction'],
            formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/424242/424242-0.txt' } }],
        }) });
      }
      return realFetch(url);
    };
    try {
      await mount();
      clickByText(host, 'button', 'Find more books');
      await flush();
      setInputValue(host.querySelector('input[aria-label="Find more books"]'), 'imported test');
      clickByText(host, 'button', 'Search');
      await flush();
      clickByText(host, 'button', 'Add now');
      await flush(); await flush(); await flush();
      // onImported opened the book in the reader
      expect(textOf(host)).toContain('Imported Test Book');
      expect(store.has('gutenberg-ebook-424242-imported-test')).toBe(true);
    } finally {
      window.fetch = realFetch;
      delete window.indexedDB;
      delete window.__alloReadingImportEndpoint;
      try { window.localStorage.clear(); } catch (_) {}
    }
  });

  it('bulk "Add all" imports every importable result via the Worker', async () => {
    try { window.localStorage.clear(); } catch (_) {}
    const store = new Map();
    const later = (fn) => Promise.resolve().then(fn);
    window.indexedDB = {
      open() {
        const req = { result: null, onsuccess: null, onerror: null, onupgradeneeded: null };
        req.result = {
          createObjectStore() { return {}; },
          transaction() {
            const tx = { oncomplete: null, onerror: null, objectStore: () => ({
              put(v, k) { store.set(k, v); later(() => tx.oncomplete && tx.oncomplete()); return {}; },
              get(k) { const g = { result: undefined, onsuccess: null }; later(() => { g.result = store.get(k); g.onsuccess && g.onsuccess(); }); return g; },
              delete(k) { store.delete(k); later(() => tx.oncomplete && tx.oncomplete()); return {}; },
            }) };
            return tx;
          },
        };
        later(() => { req.onupgradeneeded && req.onupgradeneeded(); req.onsuccess && req.onsuccess(); });
        return req;
      },
    };
    window.__alloReadingImportEndpoint = 'https://worker.test/import';
    const realFetch = window.fetch;
    window.fetch = (url) => {
      const u = String(url);
      if (u.includes('worker.test')) {
        const id = (u.match(/id=(\d+)/) || [])[1];
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ book: {
          slug: 'gutenberg-ebook-' + id + '-b', title: 'Book ' + id, language: 'English', langCode: 'en',
          isRtl: false, level: '6', contentType: 'public-domain-full-text',
          source: { url: 'https://www.gutenberg.org/ebooks/' + id }, license: 'PD',
          pages: [{ n: 1, img: null, text: 'Body ' + id + ' has some words here.', words: null }], stats: { pages: 1, words: 6 },
        } }) });
      }
      if (u.includes('gutendex.com')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [
          { id: 900001, title: 'Book 900001', copyright: false, download_count: 5, authors: [{ name: 'X' }], subjects: ['F'], formats: { 'text/plain': 'https://www.gutenberg.org/files/900001/900001-0.txt' } },
          { id: 900002, title: 'Book 900002', copyright: false, download_count: 5, authors: [{ name: 'Y' }], subjects: ['F'], formats: { 'text/plain': 'https://www.gutenberg.org/files/900002/900002-0.txt' } },
        ] }) });
      }
      return realFetch(url);
    };
    try {
      await mount();
      clickByText(host, 'button', 'Find more books');
      await flush();
      setInputValue(host.querySelector('input[aria-label="Find more books"]'), 'books');
      clickByText(host, 'button', 'Search');
      await flush();
      clickByText(host, 'button', 'Add all');
      for (let i = 0; i < 8; i++) await flush();
      expect(store.has('gutenberg-ebook-900001-b')).toBe(true);
      expect(store.has('gutenberg-ebook-900002-b')).toBe(true);
    } finally {
      window.fetch = realFetch;
      delete window.indexedDB;
      delete window.__alloReadingImportEndpoint;
      try { window.localStorage.clear(); } catch (_) {}
    }
  });

  it('opens an older-student science source with source attribution intact', async () => {
    await mount();
    await chooseCollection('Science & nonfiction');
    selectLang('English'); await flush();
    clickByText(host, 'button', frontiersEntry.title.slice(0, 12));
    await flush();
    expect(textOf(host)).toContain(frontiersEntry.title);
    expect(textOf(host)).toContain('Frontiers for Young Minds');
    expect(textOf(host)).toContain('CC BY 4.0');
  });
});

describe('reader view (Bloom book)', () => {
  it('opens a mirrored Bloom picture book with page text, source label, and license', async () => {
    // Deterministic fixture: first mirrored (non-card) Bloom book whose first
    // page carries text, so the opening spread has an assertable string.
    let bloomEntry = null, bloomBook = null;
    for (const b of index.books) {
      if (b.sourceId !== 'bloom' || /card/.test(b.contentType || '')) continue;
      const data = JSON.parse(fs.readFileSync(path.join(LIB_DIR, b.file), 'utf8'));
      if (data.pages[0] && (data.pages[0].text || '').trim().length > 10) { bloomEntry = b; bloomBook = data; break; }
    }
    expect(bloomEntry).toBeTruthy();
    await mount();
    await chooseStories();
    selectLang(bloomEntry.language); await flush();
    clickByText(host, 'button', bloomEntry.title.slice(0, 12));
    await flush();
    expect(textOf(host)).toContain(bloomBook.title);
    expect(textOf(host)).toContain(bloomBook.pages[0].text.split('\n')[0].slice(0, 40));
    expect(textOf(host)).toContain('Bloom Library');
    expect(textOf(host)).toContain(bloomBook.license);
  });

  it('a talking book offers human narration through the per-page clip queue', async () => {
    // Fixture: a mirrored Bloom book with perPage audio (skip cleanly if the
    // catalog has none — narration depends on what Bloom hosts).
    let entry = null, book = null;
    for (const b of index.books) {
      if (b.sourceId !== 'bloom' || /card/.test(b.contentType || '') || !b.hasAudio) continue;
      const data = JSON.parse(fs.readFileSync(path.join(LIB_DIR, b.file), 'utf8'));
      if (data.audio && data.audio.mode === 'perPage') { entry = b; book = data; break; }
    }
    if (!entry) return; // no talking books in the mirrored set
    await mount();
    await chooseStories();
    selectLang(entry.language); await flush();
    clickByText(host, 'button', entry.title.slice(0, 12));
    await flush();
    // The human-narration button renders (not the TTS "Read this page" one),
    // with the no-word-sync tooltip, and the clip <audio> element exists.
    const readBtn = Array.from(host.querySelectorAll('button')).find((b) => textOf(b).includes('Read to me'));
    expect(readBtn).toBeTruthy();
    expect(readBtn.getAttribute('title')).toMatch(/no word-by-word/);
    expect(host.querySelector('audio')).toBeTruthy();
    // clip queue helper sees the narrated pages the file promises
    const narratedPages = book.pages.filter((p) => p.audio && p.audio.length);
    expect(narratedPages.length).toBeGreaterThan(0);
    expect(window.AlloModules.ReadingLibrary._pageAudioClips(narratedPages[0]).length).toBeGreaterThan(0);
  });
});

describe('reader view (RTL original)', () => {
  it('opens an Arabic book with rtl direction and working export menu', async () => {
    const { calls } = await mount();
    await chooseStories();
    selectLang('Arabic'); await flush();
    clickByText(host, 'button', rtlEntry.title.slice(0, 12));
    await flush();
    // reader shows the title and an rtl text container
    expect(textOf(host)).toContain(rtlBook.title);
    const rtlDiv = host.querySelector('[dir="rtl"]');
    expect(rtlDiv).toBeTruthy();
    // ✨ Create menu → Use as source text… hands the ORIGINAL text over
    clickByText(host, 'button', 'Create');
    await flush();
    clickByText(host, 'button', 'Use as source text');
    await flush();
    expect(calls.inputText.length).toBe(1);
    expect(calls.inputText[0]).toContain(rtlBook.title);
    expect(calls.closed).toBe(1); // onExit(true) closes the library
  });

  it('generates in the book language via langOverride', async () => {
    const { calls } = await mount();
    await chooseStories();
    selectLang('Arabic'); await flush();
    clickByText(host, 'button', rtlEntry.title.slice(0, 12));
    await flush();
    clickByText(host, 'button', 'Create');
    await flush();
    clickByText(host, 'button', 'Quiz');
    await flush();
    expect(calls.generate.length).toBe(1);
    const [type, langOverride, , text] = calls.generate[0];
    expect(type).toBe('quiz');
    expect(langOverride).toBe('Arabic');
    expect(text).toContain(rtlBook.title);
  });

  it('also fills the source box and pins the book to the resource pack on generate', async () => {
    const { calls } = await mount();
    await chooseStories();
    selectLang('Arabic'); await flush();
    clickByText(host, 'button', rtlEntry.title.slice(0, 12));
    await flush();
    clickByText(host, 'button', 'Create');
    await flush();
    clickByText(host, 'button', 'Quiz');
    await flush();
    // source text populated for follow-up tools
    expect(calls.inputText.length).toBe(1);
    expect(calls.inputText[0]).toContain(rtlBook.title);
    // book added to the resource pack with the fields the meta label needs
    expect(calls.saved.length).toBe(1);
    expect(calls.saved[0].slug).toBe(rtlBook.slug);
    expect(calls.saved[0].language).toBe(rtlBook.language);
    expect(String(calls.saved[0].level)).toBe(String(rtlBook.level));
    expect(calls.saved[0]).toHaveProperty('hasAudio');
  });
});

describe('reader view (long source scope)', () => {
  async function mountLongReader() {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const calls = { generate: [], inputText: [], saved: [], closed: 0, toasts: [] };
    await act(async () => {
      root.render(React.createElement(ReadingLibrary.BookReader, {
        book: longTextBook,
        onExit: () => { calls.closed++; },
        addToast: (m, t) => calls.toasts.push([m, t]),
        handleGenerate: (...a) => calls.generate.push(a),
        setInputText: (t) => calls.inputText.push(t),
        onSaveToLesson: (ref) => calls.saved.push(ref),
        isTeacherMode: true,
      }));
    });
    await flush();
    return calls;
  }

  it('defaults full novels to the current page instead of the whole book', async () => {
    const calls = await mountLongReader();
    clickByText(host, 'button', 'Create');
    await flush();
    const scope = host.querySelector('select[aria-label="Source scope"]');
    expect(scope).toBeTruthy();
    expect(scope.value).toBe('page');
    clickByText(host, 'button', 'Quiz');
    await flush();
    const [, , , text] = calls.generate[0];
    expect(text).toContain(longTextBook.title);
    expect(text).toContain('Selection: Page 1');
    expect(text.length).toBeLessThan(RLBookTextLength(longTextBook) / 4);
  });

  it('can send a custom page range to the source box', async () => {
    const calls = await mountLongReader();
    clickByText(host, 'button', 'Create');
    await flush();
    const scope = host.querySelector('select[aria-label="Source scope"]');
    act(() => { scope.value = 'range'; scope.dispatchEvent(new window.Event('change', { bubbles: true })); });
    await flush();
    const nums = Array.from(host.querySelectorAll('input[type="number"]'));
    setInputValue(nums[0], '2');
    setInputValue(nums[1], '3');
    await flush();
    clickByText(host, 'button', 'Use as source text');
    await flush();
    expect(calls.inputText[0]).toContain('Selection: Pages 2-3');
    expect(calls.inputText[0]).toContain(longTextBook.pages[1].text.slice(0, 40));
    expect(calls.inputText[0]).toContain(longTextBook.pages[2].text.slice(0, 40));
    expect(calls.inputText[0]).not.toContain(longTextBook.pages[4].text.slice(0, 40));
  });
});

function RLBookTextLength(book) {
  return [book.title].concat((book.pages || []).map((p) => p.text || '')).join('\n\n').length;
}

describe('reader navigation, bookmarks, and continuous read-aloud', () => {
  // Per-book reading position and bookmarks live in localStorage; clear it
  // between tests so a saved position never bleeds across cases.
  beforeEach(() => { try { window.localStorage.clear(); } catch (_) {} });
  let navSeq = 0;
  function makeBook(overrides) {
    return Object.assign({
      slug: 'nav-fixture-' + (++navSeq), title: 'Navigation Fixture', language: 'English', langCode: 'en',
      isRtl: false, level: '4', contentType: 'public-domain-full-text',
      authors: ['A. Author'], source: { url: 'https://www.gutenberg.org/ebooks/1' },
      license: 'Public Domain', licenseUrl: 'https://www.gutenberg.org/policy/license.html',
      stats: { pages: 6, words: 12000 },
      pages: [
        { n: 1, img: null, text: 'CHAPTER I\n\nThe first chapter opens here with plenty of words.', words: null },
        { n: 2, img: null, text: 'More of the first chapter continues along nicely.', words: null },
        { n: 3, img: null, text: 'CHAPTER II\n\nThe second chapter begins on this page now.', words: null },
        { n: 4, img: null, text: 'The second chapter keeps going with more text here.', words: null },
        { n: 5, img: null, text: 'CHAPTER III\n\nThe third chapter starts on this page here.', words: null },
        { n: 6, img: null, text: 'The very last page of the whole fixture book.', words: null },
      ],
    }, overrides || {});
  }

  async function mountBook(book, extra) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const calls = { toasts: [] };
    await act(async () => {
      root.render(React.createElement(ReadingLibrary.BookReader, Object.assign({
        book, onExit: () => {}, addToast: (m, t) => calls.toasts.push([m, t]),
      }, extra || {})));
    });
    await flush();
    return calls;
  }

  function pageInput() { return host.querySelector('input[aria-label="Go to page"]'); }

  it('hands the selected scope to the Document Builder with license attribution', async () => {
    const sent = [];
    await mountBook(makeBook({ license: 'CC BY 4.0', authors: ['A. Author'] }), {
      isTeacherMode: true,
      handleGenerate: () => {},
      onOpenInDocBuilder: (p) => sent.push(p),
    });
    clickByText(host, 'button', 'Create');
    await flush();
    clickByText(host, 'button', 'Open in Document Builder');
    await flush();
    expect(sent.length).toBe(1);
    expect(sent[0].title).toBe('Navigation Fixture');
    // full-text books default the scope to the current page
    expect(sent[0].text).toContain('The first chapter opens here');
    expect(sent[0].scopeLabel).toContain('Page 1');
    // the CC credit travels with the passage into the handout
    expect(sent[0].attribution).toContain('A. Author');
    expect(sent[0].attribution).toContain('CC BY 4.0');
  });

  it('hides the Document Builder hand-off without teacher mode or host wiring', async () => {
    await mountBook(makeBook(), { isTeacherMode: false, onOpenInDocBuilder: () => {}, handleGenerate: () => {} });
    clickByText(host, 'button', 'Create');
    await flush();
    expect(Array.from(host.querySelectorAll('button')).some((b) => textOf(b).includes('Open in Document Builder'))).toBe(false);
  });

  it('saves Define-mode lookups to the word bank and reviews them in My words', async () => {
    await mountBook(makeBook(), { callGemini: () => Promise.resolve('It means a lot of something.') });
    // empty state first
    clickByText(host, 'button', 'My words');
    await flush();
    let panel = host.querySelector('[data-testid="word-bank"]');
    expect(textOf(panel)).toContain('No words yet');
    clickByText(panel, 'button', 'Close');
    await flush();
    // Define mode: tapping a word fetches a definition AND banks the word
    clickByText(host, 'button', 'Define');
    await flush();
    clickByText(host, 'span', 'plenty');
    await flush(); await flush();
    expect(textOf(host)).toContain('It means a lot of something.');
    // the toolbar badge counts it, and the panel lists word + definition + book
    clickByText(host, 'button', 'My words (1)');
    await flush();
    panel = host.querySelector('[data-testid="word-bank"]');
    expect(textOf(panel)).toContain('plenty');
    expect(textOf(panel)).toContain('It means a lot of something.');
    expect(textOf(panel)).toContain('Navigation Fixture');
    // persisted device-locally
    const stored = JSON.parse(window.localStorage.getItem('allo_reading_lib_words'));
    expect(stored.length).toBe(1);
    expect(stored[0].word).toBe('plenty');
    // remove empties the bank and the store
    const removeBtn = panel.querySelector('button[aria-label="Remove word"]');
    act(() => { removeBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    await flush();
    expect(textOf(host.querySelector('[data-testid="word-bank"]'))).toContain('No words yet');
    expect(JSON.parse(window.localStorage.getItem('allo_reading_lib_words')).length).toBe(0);
  });

  it('exports the word bank as a vocabulary handout via the Document Builder bridge', async () => {
    const sent = [];
    window.localStorage.setItem('allo_reading_lib_words', JSON.stringify([
      { word: 'plenty', text: 'A lot of something.', language: 'English', bookTitle: 'Navigation Fixture' },
    ]));
    await mountBook(makeBook(), { isTeacherMode: true, handleGenerate: () => {}, onOpenInDocBuilder: (p) => sent.push(p) });
    clickByText(host, 'button', 'My words (1)');
    await flush();
    clickByText(host.querySelector('[data-testid="word-bank"]'), 'button', 'Make a handout');
    await flush();
    expect(sent.length).toBe(1);
    expect(sent[0].text).toContain('**plenty** — A lot of something.');
    expect(sent[0].text).toContain('*(Navigation Fixture)*');
    expect(sent[0].scopeLabel).toContain('1');
    // panel closed after hand-off
    expect(host.querySelector('[data-testid="word-bank"]')).toBe(null);
  });

  it('renders page art with its caption, and the caption doubles as alt text', async () => {
    const book = makeBook();
    book.pages[0].img = 'https://www.gutenberg.org/cache/epub/1/images/test-art.jpg';
    book.pages[0].imgCaption = 'Peter squeezed under the gate.';
    await mountBook(book);
    const img = host.querySelector('img[src="https://www.gutenberg.org/cache/epub/1/images/test-art.jpg"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('Peter squeezed under the gate.');
    expect(textOf(host)).toContain('Peter squeezed under the gate.');
  });

  it('falls back to the generic illustration alt text when a page has no caption', async () => {
    const book = makeBook();
    book.pages[0].img = 'https://www.gutenberg.org/cache/epub/1/images/plain-art.jpg';
    await mountBook(book);
    const img = host.querySelector('img[src="https://www.gutenberg.org/cache/epub/1/images/plain-art.jpg"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toContain('Illustration from');
    expect(textOf(host)).not.toContain('Illustration from'); // alt only, no visible caption row
  });

  it('shows "More by this author" only on the last page and opens the related book', async () => {
    const related = [
      { slug: 'rel-1', title: 'Anne of Avonlea', language: 'English', authors: ['Montgomery, L. M.'], hasAudio: false, contentType: 'public-domain-full-text' },
    ];
    const opened = [];
    await mountBook(makeBook({ title: 'Anne of Green Gables' }), {
      sameAuthor: related, onOpenEdition: (b) => opened.push(b.slug),
    });
    // First page: the chip row is absent.
    expect(host.querySelector('[data-testid="more-by-author"]')).toBeFalsy();
    // Jump to the last page (6): the chip row appears.
    const inp = pageInput();
    setInputValue(inp, '6');
    act(() => { inp.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await flush();
    const row = host.querySelector('[data-testid="more-by-author"]');
    expect(row).toBeTruthy();
    expect(textOf(row)).toContain('Anne of Avonlea');
    clickByText(row, 'button', 'Anne of Avonlea');
    expect(opened).toEqual(['rel-1']);
  });

  it('jumps to an arbitrary page via the page input (Enter commits)', async () => {
    await mountBook(makeBook());
    const inp = pageInput();
    expect(inp).toBeTruthy();
    expect(inp.value).toBe('1');
    setInputValue(inp, '5');
    act(() => { inp.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await flush();
    expect(textOf(host)).toContain('third chapter starts');
    expect(pageInput().value).toBe('5');
  });

  it('jumps by chapter through the detected table of contents', async () => {
    await mountBook(makeBook());
    const chapter = host.querySelector('select[aria-label="Chapter"]');
    expect(chapter).toBeTruthy();
    // sections: Opening?/CHAPTER I (0-1), CHAPTER II (2-3), CHAPTER III (4-5)
    const opts = Array.from(chapter.querySelectorAll('option')).map((o) => o.textContent);
    expect(opts.some((t) => /CHAPTER II\b/.test(t))).toBe(true);
    act(() => { chapter.value = '2'; chapter.dispatchEvent(new window.Event('change', { bubbles: true })); });
    await flush();
    expect(textOf(host)).toContain('second chapter begins');
    expect(pageInput().value).toBe('3');
  });

  it('bookmarks a page and jumps back to it from a chip', async () => {
    try { window.localStorage.clear(); } catch (_) {}
    await mountBook(makeBook({ slug: 'bm-fixture' }));
    // go to page 4
    setInputValue(pageInput(), '4');
    act(() => { pageInput().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await flush();
    // bookmark it
    const bmBtn = host.querySelector('button[aria-label="Bookmark this page"]');
    expect(bmBtn).toBeTruthy();
    act(() => { bmBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    await flush();
    // navigate away to page 1
    setInputValue(pageInput(), '1');
    act(() => { pageInput().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await flush();
    // a bookmark chip for page 4 exists; clicking it returns there
    const chip = Array.from(host.querySelectorAll('button')).find((b) => /🔖 4$/.test(textOf(b).trim()));
    expect(chip).toBeTruthy();
    act(() => { chip.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    await flush();
    expect(pageInput().value).toBe('4');
  });

  it('resumes a long-form book at the saved page on remount', async () => {
    try { window.localStorage.clear(); } catch (_) {}
    await mountBook(makeBook({ slug: 'resume-fixture' }));
    setInputValue(pageInput(), '5');
    act(() => { pageInput().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await flush();
    // unmount and remount the same slug
    root.unmount(); host.remove();
    await mountBook(makeBook({ slug: 'resume-fixture' }));
    expect(pageInput().value).toBe('5');
  });

  it('offers continuous read-aloud for a text-only book and speaks the first page', async () => {
    const spoken = [];
    window.AlloSpeechPlayer = { speak: (t) => { spoken.push(t); return true; }, stop: () => {} };
    try {
      await mountBook(makeBook({ slug: 'read-fixture', audio: null }));
      const btn = Array.from(host.querySelectorAll('button')).find((b) => /Read aloud/.test(textOf(b)));
      expect(btn).toBeTruthy();
      act(() => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
      await flush();
      expect(spoken.length).toBe(1);
      expect(spoken[0]).toContain('first chapter opens');
      // advancing on the speech-finished event turns the page and reads on
      act(() => { window.dispatchEvent(new window.CustomEvent('allo-speech-state', { detail: { isPlaying: false } })); });
      await flush();
      expect(spoken.length).toBe(2);
      expect(pageInput().value).toBe('2');
    } finally {
      delete window.AlloSpeechPlayer;
    }
  });

  it('closes an open toolbar menu on an outside click', async () => {
    await mountBook(makeBook());
    clickByText(host, 'button', 'Create');
    await flush();
    expect(host.querySelector('select[aria-label="Source scope"]')).toBeTruthy();
    act(() => { document.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true })); });
    await flush();
    expect(host.querySelector('select[aria-label="Source scope"]')).toBeFalsy();
  });

  it('exposes a word-spacing control and an Andika font option in the Aa panel', async () => {
    await mountBook(makeBook());
    clickByText(host, 'button', 'Aa');
    await flush();
    expect(textOf(host)).toContain('Word spacing');
    const fontBtns = Array.from(host.querySelectorAll('button')).map(textOf);
    expect(fontBtns.some((t) => t.trim() === 'Andika')).toBe(true);
    expect(fontBtns.some((t) => t.trim() === 'Serif')).toBe(true);
  });

  it('shows an estimated reading time for a text with a word count', async () => {
    await mountBook(makeBook({ stats: { pages: 6, words: 1400 }, level: '4' }));
    // 1400 words / 140 wpm (level 4) = ~10 min
    expect(textOf(host)).toMatch(/~\s*10\s*min/);
  });

  it('navigates first/last with Home/End and toggles a bookmark with "b"', async () => {
    await mountBook(makeBook());
    // End → last page (6)
    act(() => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    await flush();
    expect(pageInput().value).toBe('6');
    // Home → first page
    act(() => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })); });
    await flush();
    expect(pageInput().value).toBe('1');
    // "b" bookmarks the current page → a chip appears
    act(() => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b', bubbles: true })); });
    await flush();
    const chip = Array.from(host.querySelectorAll('button')).find((b) => /🔖 1$/.test(textOf(b).trim()));
    expect(chip).toBeTruthy();
  });

  it('renders a reading-progress bar for a multi-page book', async () => {
    await mountBook(makeBook());
    // move to page 3 of 6 → bar at ~50%
    setInputValue(pageInput(), '3');
    act(() => { pageInput().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await flush();
    const bar = Array.from(host.querySelectorAll('div')).find((d) => d.style && d.style.width === '50%');
    expect(bar).toBeTruthy();
  });

  it('offers Print and Download in the Create menu for a readable book', async () => {
    await mountBook(makeBook());
    clickByText(host, 'button', 'Create');
    await flush();
    const labels = Array.from(host.querySelectorAll('button')).map(textOf);
    expect(labels.some((t) => /Print/.test(t))).toBe(true);
    expect(labels.some((t) => /Download text/.test(t))).toBe(true);
  });

  it('hides Print/Download for a link-out source card', async () => {
    await mountBook(makeBook({ contentType: 'public-domain-catalog-card', stats: { pages: 3, words: 60 } }));
    clickByText(host, 'button', 'Create');
    await flush();
    const labels = Array.from(host.querySelectorAll('button')).map(textOf);
    expect(labels.some((t) => /Download text/.test(t))).toBe(false);
  });
});

describe('whole-modal theming', () => {
  it('applies a dark / high-contrast chrome class to the modal when chosen', async () => {
    await mount();
    await chooseStories();
    selectLang('Arabic'); await flush();
    clickByText(host, 'button', rtlEntry.title.slice(0, 12));
    await flush();
    clickByText(host, 'button', 'Aa');
    await flush();
    clickByText(host, 'button', 'High contrast');
    await flush();
    expect(host.querySelector('.rl-theme-highContrast')).toBeTruthy();
    clickByText(host, 'button', 'Dark');
    await flush();
    expect(host.querySelector('.rl-theme-dark')).toBeTruthy();
    expect(host.querySelector('.rl-theme-highContrast')).toBeFalsy();
    // the scoped theme stylesheet was injected
    expect(document.getElementById('allo-reader-themes-css')).toBeTruthy();
  });
});

describe('AI translation', () => {
  it('translates via 🌐, shows the caveat, and exports the translation', async () => {
    const translated = {
      title: 'Buugga Tijaabada',
      pages: rtlBook.pages.map((p, i) => (p.text ? 'Bog ' + (i + 1) + ' af-Soomaali' : '')),
    };
    const { calls } = await mount({
      callGemini: () => Promise.resolve(JSON.stringify(translated)),
    });
    await chooseStories();
    selectLang('Arabic'); await flush();
    clickByText(host, 'button', rtlEntry.title.slice(0, 12));
    await flush();
    clickByText(host, 'button', 'Translate');
    await flush();
    clickByText(host, 'button', 'Somali');
    await flush();
    // caveat banner + translated title + attribution note are rendered
    expect(textOf(host)).toContain('AI translation');
    expect(textOf(host)).toContain(translated.title);
    expect(textOf(host)).toContain('AI-translated into Somali');
    // Somali is LTR: the translated text container must NOT be rtl
    // (the original Arabic book was); title div uses dir=auto.
    const textDivs = Array.from(host.querySelectorAll('[dir]'));
    expect(textDivs.some((d) => d.getAttribute('dir') === 'rtl' && d.getAttribute('lang') === 'so')).toBe(false);
    // export follows the DISPLAYED (translated) text and language
    clickByText(host, 'button', 'Create');
    await flush();
    clickByText(host, 'button', 'Quiz');
    await flush();
    const [, langOverride, , text] = calls.generate[0];
    expect(langOverride).toBe('Somali');
    expect(text).toContain('Buugga Tijaabada');
  });

  it('side-by-side shows the original next to the translation and toggles off', async () => {
    const translated = {
      title: 'Buugga Tijaabada',
      pages: rtlBook.pages.map((p, i) => (p.text ? 'Bog ' + (i + 1) + ' af-Soomaali' : '')),
    };
    await mount({ callGemini: () => Promise.resolve(JSON.stringify(translated)) });
    await chooseStories();
    selectLang('Arabic'); await flush();
    clickByText(host, 'button', rtlEntry.title.slice(0, 12));
    await flush();
    clickByText(host, 'button', 'Translate');
    await flush();
    clickByText(host, 'button', 'Somali');
    await flush();
    // no original panel until the toggle is pressed
    expect(host.querySelector('[data-testid="bilingual-original"]')).toBeFalsy();
    clickByText(host, 'button', 'Side by side');
    await flush();
    const panel = host.querySelector('[data-testid="bilingual-original"]');
    expect(panel).toBeTruthy();
    // the panel is labeled, carries the ORIGINAL book's language/direction,
    // and shows the original page text while the translation stays on screen
    expect(textOf(panel)).toContain('Original');
    expect(panel.getAttribute('dir')).toBe(rtlBook.isRtl ? 'rtl' : 'auto');
    const firstTextPage = rtlBook.pages.find((p) => (p.text || '').trim());
    expect(textOf(panel)).toContain(firstTextPage.text.split('\n')[0].slice(0, 20));
    expect(textOf(host)).toContain('af-Soomaali');
    // toggling off removes the panel
    clickByText(host, 'button', 'Side by side');
    await flush();
    expect(host.querySelector('[data-testid="bilingual-original"]')).toBeFalsy();
  });

  it('rejects a page-count mismatch and toasts instead of desyncing', async () => {
    const { calls } = await mount({
      callGemini: () => Promise.resolve(JSON.stringify({ title: 'X', pages: ['only one page'] })),
    });
    await chooseStories();
    selectLang('Arabic'); await flush();
    clickByText(host, 'button', rtlEntry.title.slice(0, 12));
    await flush();
    clickByText(host, 'button', 'Translate');
    await flush();
    clickByText(host, 'button', 'Somali');
    await flush();
    expect(calls.toasts.some(([m, t]) => t === 'error' && /translate/i.test(m))).toBe(true);
    // original text still shown
    expect(textOf(host)).toContain(rtlBook.title);
  });
});

describe('narration playback — audio track vs cue timings', () => {
  const baseBook = {
    slug: 's', title: 'Narrated Book', language: 'Gujarati', langCode: 'gu',
    isRtl: false, level: '2', authors: ['A. Author'], source: { url: 'https://storyweaver.org.in/s' },
    pages: [{ n: 1, img: null, text: 'Page one.', words: null }, { n: 2, img: null, text: 'Page two.', words: null }],
  };

  async function mountReader(book) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(ReadingLibrary.BookReader, {
        book, onExit: () => {}, addToast: () => {},
      }));
    });
    await flush();
  }

  it('plays the human narration mp3 even when the VTT cue file is missing', async () => {
    // The real StoryWeaver failure mode: public mp3, but cues null (VTT 403s).
    await mountReader({ ...baseBook, audio: { src: 'https://gcs/x.mp3', cues: null } });
    const audio = host.querySelector('audio');
    expect(audio).toBeTruthy();
    expect(audio.getAttribute('src')).toContain('x.mp3');
    // the narration toggle (not the TTS fallback) is offered...
    const readBtn = Array.from(host.querySelectorAll('button')).find((b) => /Read to me/.test(textOf(b)));
    expect(readBtn).toBeTruthy();
    // ...and it's flagged as narration-without-word-highlighting
    expect(readBtn.getAttribute('title')).toMatch(/no word-by-word|highlighting/i);
  });

  it('offers word-highlighting narration when cues are present (no caveat title)', async () => {
    await mountReader({ ...baseBook, audio: { src: 'https://gcs/x.mp3', cues: [[1, 0, 1], [2, 1, 2]] } });
    const readBtn = Array.from(host.querySelectorAll('button')).find((b) => /Read to me/.test(textOf(b)));
    expect(readBtn).toBeTruthy();
    expect(readBtn.getAttribute('title')).toBeFalsy();
  });

  it('falls back to per-page TTS only when there is no audio track at all', async () => {
    await mountReader({ ...baseBook, audio: null });
    expect(host.querySelector('audio')).toBeFalsy();
    const labels = Array.from(host.querySelectorAll('button')).map(textOf);
    expect(labels.some((l) => /Read this page/.test(l))).toBe(true);
    expect(labels.some((l) => /Read to me/.test(l))).toBe(false);
  });

  it('shows a clear original-source link when a source URL exists', async () => {
    await mountReader({
      ...baseBook,
      sourceId: 'gutenberg',
      source: { id: 'gutenberg', name: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/23' },
      license: 'Public Domain in the U.S. / Project Gutenberg License',
      licenseUrl: 'https://www.gutenberg.org/policy/license.html',
    });
    const sourceLink = Array.from(host.querySelectorAll('a')).find((a) => /Open original/.test(textOf(a)));
    expect(sourceLink).toBeTruthy();
    expect(sourceLink.getAttribute('href')).toBe('https://www.gutenberg.org/ebooks/23');
    expect(textOf(host)).toContain('Project Gutenberg');
  });

  it('falls back to Gemini TTS when the narration mp3 fails to play', async () => {
    const spoken = [];
    const toasts = [];
    window.AlloSpeechPlayer = { speak: (t) => { spoken.push(t); return true; }, stop: () => {} };
    const origPlay = window.HTMLMediaElement.prototype.play;
    // Real browsers reject play() on a dead media URL (e.g. a 403 mp3).
    window.HTMLMediaElement.prototype.play = () => Promise.reject(new Error('403'));
    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(ReadingLibrary.BookReader, {
          book: { ...baseBook, audio: { src: 'https://gcs/dead.mp3', cues: [[1, 0, 1]] } },
          onExit: () => {}, addToast: (m, t) => toasts.push([m, t]),
        }));
      });
      await flush();
      const btn = Array.from(host.querySelectorAll('button')).find((b) => /Read to me/.test(textOf(b)));
      expect(btn).toBeTruthy();
      await act(async () => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
      await flush();
      // Gemini TTS spoke the page instead of erroring out
      expect(spoken.length).toBe(1);
      expect(spoken[0]).toContain('Page one');
      expect(toasts.some(([m]) => /unavailable|aloud/i.test(m))).toBe(true);
    } finally {
      window.HTMLMediaElement.prototype.play = origPlay;
      delete window.AlloSpeechPlayer;
    }
  });
});
