// Math Fluency (math_fluency_module.js) runtime UI-localization: renders cleanly,
// and its DISPLAY chrome auto-translates into the student's UI language via the
// app's global window.callGemini, keyed by currentUiLanguage, cached per-device.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, MathFluency, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('math_fluency_module.js');
  MathFluency = window.AlloModules.MathFluency;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloTextLanguage;
  delete window.callGemini;
});

async function mount() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(MathFluency, { gradeLevel: '3', t: (k) => k, addToast: () => {}, onProbeComplete: () => {}, handleScoreUpdate: () => {} }));
  });
}

describe('Math Fluency UI localization', () => {
  it('renders the setup screen without error in English by default', async () => {
    await mount();
    expect(host.textContent).toContain('Operation');
    expect(host.textContent).not.toContain('ES·');
  });

  it('batch-translates display chrome into the UI language via window.callGemini, keeping keys/data English', async () => {
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
    await mount();
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });

    expect(uiPromptSeen).toBeTruthy();
    expect(host.textContent).toContain('ES·'); // display chrome localized
    // keyboard keys / data NOT wrapped → never sent for translation
    expect(uiPromptSeen).not.toContain('"ArrowDown"');
    expect(uiPromptSeen).not.toContain('"YYYY-MM-DD"');
    const cache = JSON.parse(localStorage.getItem('allo_mathfluency_ui_i18n_v1'));
    expect(cache.Spanish.Operation).toBe('ES·Operation');
  });
});
