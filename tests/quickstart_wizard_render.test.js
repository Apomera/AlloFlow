// Quick Start wizard — real-React render smoke for the source-material step.
//
// quickstart_module.js is a HAND-SYNCED compile of quickstart_source.jsx, so
// hand edits there have no build-script safety net. This mounts the real
// module (same harness as reading_library_render.test.js) and drives the
// reworked step 2: merged "Find on the Web" card (Paste URL + AI Auto-Search
// collapsed into one), and the new Story Books card whose picker serves the
// REAL mirrored StoryWeaver index through a stubbed fetch and hands the book
// text to the wizard as fetchedContent.

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

let React, ReactDOMClient, act, Wizard;
const index = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'index.json'), 'utf8'));

// Only the strings the test needs to navigate; everything else echoes the
// key — which is exactly what exercises the wt() raw-key-echo fallbacks.
const T = {
  'common.next': 'Next',
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
  it('shows merged Find-on-the-Web card and the Story Books card, not the old pair', async () => {
    await mountAtSourceStep();
    const labels = Array.from(host.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(labels.some((l) => l.includes('Find on the Web'))).toBe(true);
    expect(labels.some((l) => l.includes('Story Books'))).toBe(true);
    // the old separate cards are gone (their t-keys would echo raw)
    expect(labels.some((l) => l.includes('wizard.paste_url'))).toBe(false);
    expect(labels.some((l) => l.includes('wizard.ai_search'))).toBe(false);
  });
});

describe('story-books flow', () => {
  it('picks a real book from the mirrored index and loads it as source content', async () => {
    await mountAtSourceStep();
    clickByText('Story Books');
    await flush();
    // picker loaded the real index: language filter carries every language
    const select = host.querySelector('select');
    expect(select).toBeTruthy();
    expect(select.querySelectorAll('option').length).toBe(index.languages.length + 1);
    // pick the first book in the grid
    const first = index.books[0];
    clickByText(first.title.slice(0, 10));
    await flush();
    // green confirmation with the book title + CC BY attribution
    const text = host.textContent || '';
    expect(text).toContain('Content loaded and ready');
    expect(text).toContain(first.title);
    expect(text).toContain('CC BY 4.0');
  });
});
