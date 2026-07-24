// BehaviorLab (behavior_lens_module.js) runtime UI-localization.
//
// The tool already renders t('behavior_lens.*') || 'English' at ~1.6k sites,
// but those keys are absent from the lang packs, so non-English viewers saw
// English. The tt(key, en) wrapper keeps the pack lookup and, on a miss,
// batch-translates the English fallback into the viewer's UI language via the
// component's callGemini — keyed by currentUiLanguage, cached per-device.
// English rendering is unchanged (pinned by behavior_lens_golden.test.js); this
// suite pins the non-English translation path.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, BehaviorLens, root, host;

beforeAll(() => {
  const H = setupBehaviorLens();       // loads the module + ambient globals (icons, firebase stubs)
  BehaviorLens = H.BehaviorLens;
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloTextLanguage;
});

async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(BehaviorLens, Object.assign({
      onClose: () => {}, addToast: () => {}, t: (k, a) => (typeof a === 'string' ? a : undefined),
      studentNickname: '', dashboardData: null, isTeacherMode: false,
      alloBotRef: { current: null }, firestore: null, firebaseAuth: null, isCanvasEnv: true,
    }, props)));
  });
}

describe('BehaviorLab UI localization', () => {
  it('renders in English by default without emitting a translation request', async () => {
    let sawTranslate = false;
    await mount({ callGemini: async (p) => { if (String(p).includes('Return ONLY a JSON object mapping each ENGLISH')) sawTranslate = true; return ''; } });
    expect(host.textContent.length).toBeGreaterThan(0);
    expect(sawTranslate).toBe(false);          // English viewer → no translation traffic
    expect(host.textContent).not.toContain('ES·');
  });

  it('batch-translates the English UI fallbacks into the viewer language, keying by English (not the pack key)', async () => {
    window.__alloTextLanguage = 'Spanish';
    let uiPromptSeen = null;
    const callGemini = async (p) => {
      if (typeof p === 'string' && p.includes('Return ONLY a JSON object mapping each ENGLISH')) {
        uiPromptSeen = p;
        const list = JSON.parse(p.slice(p.indexOf('[')));
        const out = {}; list.forEach((k) => { out[k] = 'ES·' + k; });
        return JSON.stringify(out);
      }
      return '';
    };
    await mount({ callGemini });
    // let the debounced effect fire + the chunked translations resolve + re-render
    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });

    expect(uiPromptSeen).toBeTruthy();
    // The work-list is ENGLISH UI text, never the behavior_lens.* pack keys:
    expect(uiPromptSeen).not.toContain('behavior_lens.');
    // Cache is populated per-device under the viewer language:
    const cache = JSON.parse(localStorage.getItem('allo_behaviorlens_ui_i18n_v1'));
    expect(cache).toBeTruthy();
    expect(Object.keys(cache.Spanish || {}).length).toBeGreaterThan(0);
    // Every cached value is the ES· gloss of its English key (English IS the key):
    const [enKey, esVal] = Object.entries(cache.Spanish)[0];
    expect(esVal).toBe('ES·' + enKey);
    // …and localized chrome actually reached the DOM after re-render:
    expect(host.textContent).toContain('ES·');
  });
});
