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

async function mount(extraProps = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const calls = { toasts: [], generate: [], inputText: [], closed: 0 };
  const props = {
    isOpen: true,
    onClose: () => { calls.closed++; },
    addToast: (m, t) => calls.toasts.push([m, t]),
    callGemini: () => Promise.resolve(''),
    handleGenerate: (...a) => calls.generate.push(a),
    setInputText: (t) => calls.inputText.push(t),
    isTeacherMode: true,
    ...extraProps,
  };
  await act(async () => { root.render(React.createElement(ReadingLibrary, props)); });
  await flush();
  return { calls, props };
}

describe('browse view', () => {
  it('renders the full grid, filters, and teacher language-options entry', async () => {
    await mount();
    // status line counts every book
    expect(textOf(host)).toContain(index.books.length + ' ');
    // language filter carries every language
    const langSelect = host.querySelector('select');
    expect(langSelect.querySelectorAll('option').length).toBe(index.languages.length + 1);
    // narrated-only toggle narrows the grid
    const narrated = index.books.filter((b) => b.hasAudio).length;
    clickByText(host, 'button', 'Narrated only');
    await flush();
    expect(textOf(host)).toContain(narrated + ' ');
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
});

describe('reader view (RTL original)', () => {
  it('opens an Arabic book with rtl direction and working export menu', async () => {
    const { calls } = await mount();
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
