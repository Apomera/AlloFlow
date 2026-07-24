// Quick Start wizard — real-React render smoke for the source-material step.
//
// quickstart_module.js is a HAND-SYNCED compile of quickstart_source.jsx, so
// hand edits there have no build-script safety net. This mounts the real
// module (same harness as reading_library_render.test.js) and drives the
// reworked step 2: merged "Find on the Web" card (Paste URL + AI Auto-Search
// collapsed into one), and the Reading Catalog card whose picker serves the
// mirrored Reading Library index through a stubbed fetch and hands the selected
// text to the wizard as fetchedContent.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ROOT = resolve(process.cwd());
const LIB_DIR = path.join(ROOT, 'reading_library');

let React, ReactDOMClient, act, Wizard;
const index = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'index.json'), 'utf8'));

// Only the strings the test needs to navigate; everything else echoes the
// key — which is exactly what exercises the wt() raw-key-echo fallbacks.
const T = {
  'common.next': 'Next',
  'common.finish': 'Finish',
  'wizard.content_loaded': 'Content loaded and ready',
};

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  window.AlloLanguageContext = React.createContext({ t: (k) => T[k] || k });
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
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
  loadAlloModule('quickstart_module.js');
  Wizard = window.AlloModules.QuickStartWizard;
  if (!Wizard) throw new Error('QuickStartWizard did not register');
});

let root, host;
afterEach(() => {
  if (root) { try { root.unmount(); } catch (_) {} root = null; }
  if (host) { host.remove(); host = null; }
});

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

function clickByText(needle) {
  const el = Array.from(host.querySelectorAll('button')).find((b) => (b.textContent || '').includes(needle));
  if (!el) throw new Error(`no <button> containing "${needle}"`);
  act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
  return el;
}

async function mountAtSourceStep() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const calls = { complete: [], toasts: [] };
  await act(async () => {
    root.render(React.createElement(Wizard, {
      isOpen: true,
      onClose: () => {},
      onComplete: (d) => calls.complete.push(d),
      onUpload: () => {},
      onLookupStandards: null,
      onCallGemini: () => Promise.resolve(''),
      onWebSearch: null,
      addToast: (m, t2) => calls.toasts.push([m, t2]),
      isParentMode: false,
      isIndependentMode: false,
      isHelpMode: false,
      setIsHelpMode: () => {},
    }));
  });
  await flush();
  clickByText('Next'); // step 1 (grade preselected) → step 2
  await flush();
  return calls;
}

describe('source-material step (step 2)', () => {
  it('shows merged Find-on-the-Web card and the Reading Catalog card, not the old pair', async () => {
    await mountAtSourceStep();
    const labels = Array.from(host.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(labels.some((l) => l.includes('Find on the Web'))).toBe(true);
    expect(labels.some((l) => l.includes('Reading Catalog'))).toBe(true);
    // the old separate cards are gone (their t-keys would echo raw)
    expect(labels.some((l) => l.includes('wizard.paste_url'))).toBe(false);
    expect(labels.some((l) => l.includes('wizard.ai_search'))).toBe(false);
  });
});

describe('reading-catalog flow', () => {
  it('preselects the reading level from the chosen grade, then loads a book as source content', async () => {
    await mountAtSourceStep(); // wizard grade defaults to '3rd Grade'
    clickByText('Reading Catalog');
    await flush();
    // two selects now: level (first) + language (second)
    const selects = host.querySelectorAll('select');
    expect(selects.length).toBe(2);
    // 3rd Grade → Level 3 preselect, with the grade note shown
    expect(selects[0].value).toBe('3');
    expect(host.textContent).toContain('matched to your grade');
    expect(Array.from(selects[0].querySelectorAll('option')).map((o) => o.value)).toContain('6');
    // language dropdown still carries every language
    expect(selects[1].querySelectorAll('option').length).toBe(index.languages.length + 1);
    // the whole (uncapped) level-3 set is rendered — count line reflects it
    const lvl3books = index.books.filter((b) => String(b.level) === '3');
    expect(host.textContent).toContain(lvl3books.length + ' resources');
    const cards = host.querySelectorAll('.grid button');
    expect(cards.length).toBe(lvl3books.length); // no 30-cap
    // a book with a description renders it in the card
    const described = lvl3books.find((b) => b.description && b.description.length > 12);
    if (described) expect(host.textContent).toContain(described.description.slice(0, 12));
    // pick a level-3 book
    clickByText(lvl3books[0].title);
    await flush();
    const text = host.textContent || '';
    expect(text).toContain('Content loaded and ready');
    expect(text).toContain(lvl3books[0].title);
    expect(text).toContain('CC BY 4.0');
  });

  it('carries the picked book as a resource ref (storybookRef) through to completion', async () => {
    const calls = await mountAtSourceStep();
    clickByText('Reading Catalog');
    await flush();
    const lvl3 = index.books.filter((b) => String(b.level) === '3')[0];
    clickByText(lvl3.title);
    await flush();
    clickByText('Next');   // green confirm → step 4 (review)
    await flush();
    clickByText('Finish'); // → onComplete(localData)
    await flush();
    expect(calls.complete.length).toBe(1);
    const done = calls.complete[0];
    expect(done.sourceMode).toBe('storybook');
    expect(done.storybookRef).toBeTruthy();
    expect(done.storybookRef.slug).toBe(lvl3.slug);
    expect(done.storybookRef.title).toBe(lvl3.title);
    // the ref carries what the host needs to build a readingBook history item
    expect(done.storybookRef.language).toBe(lvl3.language);
    expect(String(done.storybookRef.level)).toBe(String(lvl3.level));
    expect(done.storybookRef.sourceId).toBe(lvl3.sourceId || 'storyweaver');
    expect(done.storybookRef.sourceName).toBeTruthy();
  });

  it('clearing the level filter to All levels widens the grid', async () => {
    await mountAtSourceStep();
    clickByText('Reading Catalog');
    await flush();
    const levelSelect = host.querySelectorAll('select')[0];
    expect(levelSelect.value).toBe('3');
    act(() => {
      levelSelect.value = '';
      levelSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await flush();
    // grade note gone once the preselect no longer applies
    expect(host.textContent).not.toContain('matched to your grade');
  });
});
