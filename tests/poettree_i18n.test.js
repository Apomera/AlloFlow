// PoetTree (poet_tree_module.js) runtime UI-localization: renders cleanly, and its
// DISPLAY chrome auto-translates into the student's UI language via the app's Gemini
// while AI-prompt / poet-name / poem-title strings stay English.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, PoetTree, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('poet_tree_module.js');
  PoetTree = window.AlloModules.PoetTree;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloTextLanguage;
});

function baseProps(extra) {
  return Object.assign({
    isOpen: true, onClose: () => {}, onCallTTS: async () => null, onCallImagen: async () => null,
    addToast: () => {}, gradeLevel: '7th Grade', selectedVoice: 'Kore', handleScoreUpdate: () => {},
  }, extra || {});
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(PoetTree, props)); });
}

describe('PoetTree UI localization', () => {
  it('renders the form tab without error in English by default', async () => {
    await mount(baseProps({ onCallGemini: async () => '{}' }));
    expect(host.textContent).toContain('Free Verse');
    expect(host.textContent).not.toContain('ES·');
  });

  it('batch-translates display chrome into the UI language, keeping prompts/poet names English', async () => {
    window.__alloTextLanguage = 'Spanish';
    let uiPromptSeen = null;
    const onCallGemini = async (p) => {
      if (typeof p === 'string' && p.includes('Return ONLY a JSON object mapping each ENGLISH')) {
        uiPromptSeen = p;
        const list = JSON.parse(p.slice(p.indexOf('[')));
        const out = {}; list.forEach((k) => { out[k] = 'ES·' + k; });
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mount(baseProps({ onCallGemini }));
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });

    expect(uiPromptSeen).toBeTruthy();
    // a wrapped form tagline / display string localized
    expect(host.textContent).toContain('ES·');
    expect(host.textContent).toContain('ES·No rules — just feeling and image.'); // Free Verse tagline
    // the translation work-list must NOT contain AI prompts, poet names, or CCSS-like data
    expect(uiPromptSeen).not.toContain('You are a warm, encouraging poetry mentor');
    expect(uiPromptSeen).not.toContain('Edgar Allan Poe');
    expect(uiPromptSeen).not.toContain('Annabel Lee');
    const cache = JSON.parse(localStorage.getItem('allo_poettree_ui_i18n_v1'));
    expect(cache.Spanish['No rules — just feeling and image.']).toBe('ES·No rules — just feeling and image.');
  });
});
