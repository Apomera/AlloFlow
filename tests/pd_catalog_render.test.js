// PD catalog tab — SSR render test.
//
// Proves the Phase-2 catalog_module.js edits (the third "Professional
// Development" tab + PdHome) load and render without error, and that the
// window.__alloPdIntent deep-link flag opens the modal straight to the PD tab.
//
// catalog_module.js is a browser IIFE (window.AlloModules.CommunityCatalog). We
// load it the proven harness way — real React 18 from prismflow-deploy, eval the
// source against a sandbox window, then renderToStaticMarkup. Static render
// exercises the RENDER phase only (no useEffect), so no fetch/script-injection
// happens — each tab shows its loading state, which is exactly the marker we
// assert on to prove tab routing. (Interaction-level gating is covered by
// tests/pd_core.test.js.)

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');

beforeAll(() => {
  // Minimal ambient globals the module touches at load/render time (no-ops are
  // fine; effects that would use these never run under static render).
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      currentScript: { src: 'https://example.test/catalog_module.js' },
      createElement: () => ({}),
      head: { appendChild() {} },
      body: { appendChild() {}, removeChild() {} },
    };
  }
  if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  }
});

// Fresh evaluation each call so the IIFE dedup guard re-registers; returns the
// CommunityCatalog component. `pdIntent` sets the deep-link flag before render.
function loadCommunityCatalog(pdIntent) {
  const win = { React: React, AlloModules: {}, __alloPdIntent: !!pdIntent };
  // eslint-disable-next-line no-new-func
  new Function('window', SRC)(win);
  return win.AlloModules.CommunityCatalog;
}

function render(component, props) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(component, props));
}

describe('CommunityCatalog PD tab', () => {
  it('registers the component and renders all three tabs', () => {
    const CC = loadCommunityCatalog(false);
    expect(typeof CC).toBe('function');
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Browse');
    expect(html).toContain('Submit');
    expect(html).toContain('Professional Development');
  });

  it('defaults to the Browse tab when no PD intent flag is set', () => {
    const CC = loadCommunityCatalog(false);
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Loading catalog');     // BrowseTab loading marker
    expect(html).not.toContain('Loading PD library');
  });

  it('opens straight to the PD tab when window.__alloPdIntent is set', () => {
    const CC = loadCommunityCatalog(true);
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Loading PD library');   // PdHome loading marker
    expect(html).toContain('self-paced completion record'); // honest PD framing
    expect(html).not.toContain('Loading catalog');
  });

  it('returns null when closed', () => {
    const CC = loadCommunityCatalog(false);
    const html = render(CC, { isOpen: false, onClose() {}, addToast() {} });
    expect(html).toBe('');
  });
});
