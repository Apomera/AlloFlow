// Page Designer opened by Word Sounds (initialAction 'worksheet-from-word-sounds'):
// the editor opens the built document, sets lang/dir on the canvas, does not
// treat it as a linked Activity worksheet, and hands the language to the
// tagged-PDF host callback.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let Studio, root, host;
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  new Function(readFileSync('studio_module.js', 'utf8'))();
  Studio = window.AlloModules.AlloStudio;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); window.localStorage.clear(); vi.restoreAllMocks();
});
const button = (text) => [...host.querySelectorAll('button')].find((b) => b.textContent.replace(/^[^A-Za-z]+/, '').trim() === text);
const resource = {
  title: 'Short a sounds', lang: 'ar', dir: 'rtl', pageSize: 'a4-portrait',
  sections: [{ heading: 'Boxes', directions: 'One sound in each box.', items: [{ n: 1, prompt: 'cat', display: { kind: 'boxes', count: 3 } }] }],
  key: [{ n: 1, text: 'c-a-t' }],
};
function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(Studio, Object.assign({ t: (k) => k, onClose: vi.fn(), addToast: vi.fn() }, props))));
}

describe('worksheet-from-word-sounds', () => {
  it('opens the worksheet as an editable A4 RTL document', () => {
    const onSaveGeneratedArtifact = vi.fn();
    mount({ initialAction: 'worksheet-from-word-sounds', initialResource: resource, onSaveGeneratedArtifact });
    expect(host.querySelector('[aria-label="Document title"]').value).toBe('Short a sounds');
    const page = host.querySelector('[data-st-canvas-viewport] > div[dir]');
    expect(page.getAttribute('dir')).toBe('rtl');
    expect(page.getAttribute('lang')).toBe('ar');
    expect(host.textContent).not.toContain('Activity worksheet');
    expect(host.querySelector('select[aria-label="Page size"]').value).toBe('a4-portrait');
    expect(host.querySelector('input[aria-label="Document language"]').value).toBe('ar');
  });

  it('passes the document language and page size to the tagged-PDF host callback', async () => {
    const onExportTaggedPdf = vi.fn().mockResolvedValue(true);
    mount({ initialAction: 'worksheet-from-word-sounds', initialResource: resource, onExportTaggedPdf });
    act(() => button('Export').click());
    await act(async () => button('Tagged PDF (accessible)').click());
    expect(onExportTaggedPdf).toHaveBeenCalledOnce();
    const [html, , opts] = onExportTaggedPdf.mock.calls[0];
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(opts).toEqual({ lang: 'ar', dir: 'rtl', pageSize: 'a4' });
  });

  it('uses the host UI language for a document that has none', async () => {
    const onExportTaggedPdf = vi.fn().mockResolvedValue(true);
    mount({ initialAction: 'worksheet-from-word-sounds', initialResource: Object.assign({}, resource, { lang: undefined, dir: undefined, pageSize: undefined }), onExportTaggedPdf, documentLanguage: 'es' });
    act(() => button('Export').click());
    await act(async () => button('Tagged PDF (accessible)').click());
    expect(onExportTaggedPdf.mock.calls[0][2]).toEqual({ lang: 'es', dir: 'ltr', pageSize: 'letter' });
  });
});
