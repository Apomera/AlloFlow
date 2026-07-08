// Reading Library — real-React render smoke test.
//
// The pure-helper suite (reading_library.test.js) stubs React, so it can't
// catch render crashes, hook-order bugs, or broken wiring between browse →
// reader → export. This mounts the real module with the real React renderer
// (same harness as anchor_charts_hooks_guard.test.js), serves the REAL
// mirrored index/book data through a stubbed fetch, and drives:
//   browse grid → narrated-only filter → open an RTL book → reader dir/lang
//   → 🌐 AI-translate (stubbed Gemini) → caveat banner → ✨ Use as source text.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const ROOT = resolve(process.cwd());
const LIB_DIR = path.join(ROOT, 'reading_library');

let React, ReactDOMClient, act, ReadingLibrary;
const index = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'index.json'), 'utf8'));
// A deterministic RTL fixture: the first Arabic book in the index.
const rtlEntry = index.books.find((b) => b.language === 'Arabic');
const rtlBook = JSON.parse(fs.readFileSync(path.join(LIB_DIR, rtlEntry.file), 'utf8'));
const frontiersEntry = index.books.find((b) => b.sourceId === 'frontiers');

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
    if (u.includes('index.json')) payload = index;
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

function textOf(el) { return (el && el.textContent) || ''; }

function clickByText(container, tag, needle) {
  const els = Array.from(container.querySelectorAll(tag));
  const el = els.find((b) => textOf(b).includes(needle));
  if (!el) throw new Error(`no <${tag}> containing "${needle}"`);
  act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
  return el;
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
    const storyEntries = index.books.filter((b) => (b.sourceId || 'storyweaver') === 'storyweaver');
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
    selectLang(''); await flush();
    expect(textOf(host)).toContain(index.books.length + ' ');
    clickByText(host, 'button', 'Collections');
    await flush();
    await chooseStories();
    // teacher sees the language-options explainer
    clickByText(host, 'button', 'Language options');
    await flush();
    expect(textOf(host)).toContain('Instant AI translation');
    expect(textOf(host)).toContain('Request a permanent addition');
  });

  it('hides the language-options entry for students', async () => {
    await mount({ isTeacherMode: false });
    const btns = Array.from(host.querySelectorAll('button')).map(textOf);
    expect(btns.some((t) => t.includes('Language options'))).toBe(false);
  });

  it('sorts by reading level (easiest first) by default', async () => {
    await mount();
    await chooseStories();
    // filter controls: language, level, sort
    const selects = host.querySelectorAll('select');
    expect(selects[2].value).toBe('level');
    // narrow to one language to keep the grid light; ordering still applies
    act(() => { selects[0].value = 'English'; selects[0].dispatchEvent(new window.Event('change', { bubbles: true })); });
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
    const selects = host.querySelectorAll('select');
    act(() => { selects[0].value = 'English'; selects[0].dispatchEvent(new window.Event('change', { bubbles: true })); });
    act(() => { selects[2].value = 'title'; selects[2].dispatchEvent(new window.Event('change', { bubbles: true })); });
    await flush();
    // card buttons carry a "Level N" badge; the title is the .font-bold node
    const cards = Array.from(host.querySelectorAll('button')).filter((b) => /Level\s+\d/.test(textOf(b)));
    const titles = cards.map((b) => { const t = b.querySelector('.font-bold'); return (t ? t.textContent : '').trim().toLowerCase(); });
    expect(titles.length).toBeGreaterThan(3);
    const sorted = titles.slice().sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
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
