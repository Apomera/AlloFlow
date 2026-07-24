// LitLab (story_stage_module.js) runtime UI-localization: renders cleanly, and
// its DISPLAY chrome auto-translates into the student's UI language via the app's
// Gemini while AI-prompt / codename / voice strings stay English.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, LitLab, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('story_stage_module.js');
  LitLab = window.AlloModules.LitLab;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloTextLanguage;
});

function baseProps(extra) {
  return Object.assign({
    isOpen: true, onClose: () => {}, onCallTTS: async () => null, addToast: () => {},
    gradeLevel: '5th Grade', geminiVoices: [], kokoroVoices: [], selectedVoice: 'Kore', handleScoreUpdate: () => {},
  }, extra || {});
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(LitLab, props)); });
}

describe('LitLab UI localization', () => {
  it('renders the input phase without error in English by default', async () => {
    await mount(baseProps({ onCallGemini: async () => '{}' }));
    expect(host.textContent).toContain('Create Your Performance');
    expect(host.textContent).toContain('Paste Text');
    expect(host.textContent).not.toContain('ES·');
  });

  it('batch-translates display chrome into the UI language, keeping prompts/codenames English', async () => {
    window.__alloTextLanguage = 'Spanish';
    let uiPromptSeen = null;
    const onCallGemini = async (p) => {
      if (typeof p === 'string' && p.includes('Return ONLY a JSON object mapping each ENGLISH')) {
        uiPromptSeen = p;
        const list = JSON.parse(p.slice(p.indexOf('['))); // the work-list array is the last line
        const out = {};
        list.forEach((k) => { out[k] = 'ES·' + k; });
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mount(baseProps({ onCallGemini }));
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); }); // 500ms debounce + async

    expect(uiPromptSeen).toBeTruthy();
    // display strings localized
    expect(host.textContent).toContain('ES·Bring stories to life');
    expect(host.textContent).toContain('ES·🎭 Create Your Performance');
    // brand + codenames NOT wrapped → stay English
    expect(host.textContent).toContain('LitLab');
    expect(host.textContent).not.toContain('ES·Alpine');
    // the AI translation prompt must NOT include AI-generation prompts or CCSS codes
    expect(uiPromptSeen).not.toContain('You are a talented fiction writer');
    expect(uiPromptSeen).not.toContain('RL.5.2');
    // cached per-device
    const cache = JSON.parse(localStorage.getItem('allo_litlab_ui_i18n_v1'));
    expect(cache.Spanish['Bring stories to life']).toBe('ES·Bring stories to life');
  });
});
