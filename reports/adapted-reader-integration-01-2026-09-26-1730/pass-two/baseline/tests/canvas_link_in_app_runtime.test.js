// The in-app "Use AlloFlow inside Gemini Canvas" button reads the CURRENT link at
// runtime, from the same release.json the launcher reads.
//
// Why: the Canvas share link changes every release and a running Canvas session pins
// its module build (`?v=<hash>`), so a student on an older build used to carry an
// older hardcoded link forever. Fetching release.json at mount means the button opens
// the newest Canvas regardless of which build is running - which is the only way the
// app can point a stale user at the fresh link at all. The constant in the source is
// the offline fallback only, and dev-tools/set_canvas_url.cjs stamps it with the rest.
//
// The URL is fetched on MOUNT, not on click: window.open must run inside the click's
// own user gesture or popup blockers eat it, so the address has to be known already.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const SOURCE = readFileSync(resolve(process.cwd(), 'view_misc_modals_source.jsx'), 'utf8');
const FALLBACK = SOURCE.match(/CANVAS_SHARE_URL_FALLBACK\s*=\s*'([^']+)'/)[1];
const NEWER = 'https://share.gemini.google/NEWER0000abc';

let React, ReactDOMClient, act, Modal;
let container, root, opened, realFetch, realOpen;

const render = async () => {
  await act(async () => {
    root.render(React.createElement(Modal, {
      _isCanvasEnv: false, ai: null, showAIBackendModal: true,
      setShowAIBackendModal: () => {}, t: () => '', GEMINI_MODELS: {},
    }));
  });
  // Let the mount-time fetch resolve and its state update land.
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};
const clickCanvasCard = async () => {
  const card = container.querySelector('[data-help-key="ai_backend_guided_card_canvas"]');
  expect(card, 'the Canvas card renders for a keyless visitor').toBeTruthy();
  const target = card.matches('button, [role="button"]') ? card : (card.querySelector('button') || card);
  await act(async () => {
    target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('view_misc_modals_module.js');
  Modal = window.AlloModules.AIBackendModal;
});

beforeEach(() => {
  window.localStorage.clear();
  opened = [];
  realFetch = global.fetch;
  realOpen = window.open;
  window.open = (url) => { opened.push(url); return null; };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  global.fetch = realFetch;
  window.open = realOpen;
});

describe('in-app Canvas button reads release.json', () => {
  it('opens the link release.json currently carries, not the one compiled in', async () => {
    let requested = '';
    global.fetch = vi.fn(async (url) => {
      requested = String(url);
      return { ok: true, json: async () => ({ version: '9.9', canvas_url: NEWER }) };
    });
    await render();
    expect(requested).toMatch(/^https:\/\/alloflow-cdn\.pages\.dev\/release\.json\?t=\d+$/);
    await clickCanvasCard();
    expect(opened).toEqual([NEWER]);
  });

  it('falls back to the compiled-in link when release.json is unreachable', async () => {
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    await render();
    await clickCanvasCard();
    expect(opened).toEqual([FALLBACK]);
  });

  it('ignores a release.json whose link is not a Canvas share address', async () => {
    // A tampered or half-written release.json must not send a student anywhere else.
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ canvas_url: 'https://example.com/phish' }) }));
    await render();
    await clickCanvasCard();
    expect(opened).toEqual([FALLBACK]);
  });

  it('keeps exactly one link literal in the source, the one set_canvas_url stamps', () => {
    const literals = SOURCE.match(/https:\/\/share\.gemini\.google\/[A-Za-z0-9_-]+/g) || [];
    expect(literals).toEqual([FALLBACK]);
    expect(SOURCE).toContain("window.open(canvasShareUrl, '_blank', 'noopener')");
  });
});
