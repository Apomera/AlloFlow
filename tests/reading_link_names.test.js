// Links in readings say what they are and that they open a new tab.
//
// WHY (2026-09-24): a citation link shows only "⁽¹⁾", which screen readers read
// as "superscript one" or skip, and every reading link opens a new tab without
// saying so.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, phase, api, renderToStaticMarkup;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js');
  loadAlloModule(process.env.ALLO_PHASEN_CANDIDATE || 'phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; delete window.__alloT; });

const links = (text, t) => {
  const div = document.createElement('div');
  div.innerHTML = renderToStaticMarkup(React.createElement('div', null, phase.formatInteractiveText(text, false, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: () => null, t })));
  return [...div.querySelectorAll('a')].map(a => a.getAttribute('aria-label'));
};

describe('links in adapted text', () => {
  it('a citation is named as a numbered source', () => {
    expect(links('Plants grow. [⁽¹⁾](https://a.org) Roots grow. [⁽¹²⁾](https://b.org)')).toEqual(['Source 1, opens in a new tab', 'Source 12, opens in a new tab']);
  });
  it('a worded link keeps its words', () => {
    expect(links('See [the rain guide](https://a.org) today.')).toEqual(['the rain guide, opens in a new tab']);
  });
  it('bracketed text that is not a superscript number is not called a source', () => {
    expect(links('[(1)](https://a.org)')).toEqual(['(1), opens in a new tab']);
    expect(links('[⁽a⁾](https://a.org)')).toEqual(['⁽a⁾, opens in a new tab']);
  });
  it('uses the translation when there is one', () => {
    const t = (key, params) => ({ 'common.source_number': 'Fuente {number}', 'common.opens_new_tab': 'se abre en una pestaña nueva' }[key] || '').replace('{number}', params && params.number);
    expect(links('[⁽³⁾](https://a.org)', t)).toEqual(['Fuente 3, se abre en una pestaña nueva']);
  });
});

describe('links in the original reader', () => {
  it('are named the same way', () => {
    const item = api.createSupportedReading('Water moves. [⁽²⁾](https://example.org/water)', { id: 'orig' });
    const props = { ComplexityGauge: () => null, t: k => k, generatedContent: item, leveledTextLanguage: 'English', isTeacherMode: false, isZenMode: true, interactionMode: 'read', history: [item], textEditorRef: React.createRef(), splitTextToSentences: s => [s], getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: x => x, SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: () => {}, onReadOriginal: () => {} };
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View, props)));
    const link = host.querySelector('a[href="https://example.org/water"]');
    expect(link.getAttribute('aria-label')).toBe('Source 2, opens in a new tab');
  });
});
