// Live Polling (live_polling_module.js) runtime UI-localization: the teacher's
// HostPanel and each student's GuestOverlay render on their own device, so the
// display chrome auto-translates into the viewer's interface language via the
// app's global window.callGemini, keyed by currentUiLanguage, cached per-device.
// Teacher-authored poll DATA (prompts, options, session code) is never sent.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, LivePolling, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloTextLanguage;
  delete window.callGemini;
});

async function mountHost() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(LivePolling.HostPanel, {
      sessionCode: 'WXYZ', isOpen: true, onClose: () => {},
    }));
  });
}

describe('Live Polling UI localization', () => {
  it('exposes the host + guest components and renders the composer in English by default', async () => {
    expect(typeof LivePolling.HostPanel).toBe('function');
    expect(typeof LivePolling.GuestOverlay).toBe('function');
    await mountHost();
    expect(host.textContent).toContain('Create poll');
    expect(host.textContent).toContain('Broadcast to');
    expect(host.textContent).not.toContain('ES·');
  });

  it('batch-translates display chrome into the UI language via window.callGemini, keeping poll data English', async () => {
    window.__alloTextLanguage = 'Spanish';
    let uiPromptSeen = null;
    window.callGemini = async (p) => {
      if (typeof p === 'string' && p.includes('Return ONLY a JSON object mapping each ENGLISH')) {
        uiPromptSeen = p;
        const list = JSON.parse(p.slice(p.indexOf('[')));
        const out = {}; list.forEach((k) => { out[k] = 'ES·' + k; });
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mountHost();
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });

    expect(uiPromptSeen).toBeTruthy();
    expect(host.textContent).toContain('ES·'); // chrome localized
    // Teacher-authored DATA / session code / enum keys must never be translated:
    expect(uiPromptSeen).not.toContain('"WXYZ"');
    expect(uiPromptSeen).not.toContain('"Option A"');
    expect(uiPromptSeen).not.toContain('"rating"');
    const cache = JSON.parse(localStorage.getItem('allo_livepolling_ui_i18n_v1'));
    expect(cache.Spanish['Create poll']).toBe('ES·Create poll');
  });
});
