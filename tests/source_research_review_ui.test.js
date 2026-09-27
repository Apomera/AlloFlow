import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let Panel, root, host, props;
const text = 'A long enough retrieved passage for inclusion in the reading.';
const initial = () => ({ version: 1, topic: 'plants', items: [{ id: 'one', kind: 'web', title: 'Reference', url: 'https://example.edu', passage: text, evidenceType: 'Search snippet', included: true }], activity: [] });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Panel = new Function('React', code + '\nreturn SourceResearchReviewPanel;')(React);
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; props = {}; vi.restoreAllMocks(); });
async function render(extra = {}) {
  if (!host || !root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  props = { topic: 'plants', includeWeb: true, includeDocuments: false, documentsOnly: false, selectedIds: [], sources: [], libraryReady: true, busy: false,
    sourceText: (_, fallback) => fallback, generate: vi.fn(async () => ({ ok: true, packet: initial() })), ...props, ...extra };
  await act(async () => root.render(React.createElement(Panel, props)));
}
const button = label => [...host.querySelectorAll('button')].find(el => el.textContent === label);
async function click(label) { await act(async () => button(label).click()); }

describe('source research review controls', () => {
  it('blocks writing until evidence is collected and respects explicit checkbox exclusions', async () => {
    await render(); expect(button('Generate from included passages').disabled).toBe(true);
    await click('Find sources to review');
    expect(button('Generate from included passages').disabled).toBe(false);
    await act(async () => host.querySelector('li input[type="checkbox"]').click());
    expect(button('Generate from included passages').disabled).toBe(true);
    await act(async () => host.querySelector('li input[type="checkbox"]').click());
    await click('Generate from included passages');
    expect(props.generate.mock.lastCall[0].reviewedResearch.items[0].included).toBe(true);
    expect(props.generate.mock.lastCall[0].researchAction).toBeUndefined();
  });
  it('cancels pending discovery and ignores its late result', async () => {
    const d = deferred(); const generate = vi.fn(() => d.promise);
    await render({ generate }); await click('Find sources to review');
    const current = generate.mock.calls[0][0].isCurrent;
    await click('Cancel research'); expect(current()).toBe(false);
    await act(async () => d.resolve({ ok: true, packet: initial() }));
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(0);
    expect(button('Find sources to review').disabled).toBe(false);
  });
  it('invalidates a running result immediately on topic change', async () => {
    const d = deferred(); const generate = vi.fn(() => d.promise);
    await render({ generate }); await click('Find sources to review');
    const current = generate.mock.calls[0][0].isCurrent;
    await render({ topic: 'clouds' }); expect(current()).toBe(false);
    await act(async () => d.resolve({ ok: true, packet: initial() }));
    expect(host.textContent).not.toContain('Reference');
  });
  it('discards a running result when unmounted', async () => {
    const d = deferred(); const generate = vi.fn(() => d.promise);
    await render({ topic: 'plants', generate }); await click('Find sources to review');
    const current = generate.mock.calls[0][0].isCurrent;
    await act(async () => root.unmount()); root = null;
    expect(current()).toBe(false); d.resolve({ ok: true, packet: initial() });
  });
  it('does not approve an imported document after the lesson deselects or replaces it', async () => {
    const p = initial(); p.items[0] = { ...p.items[0], kind: 'document', sourceId: 'doc', version: 1, evidenceType: 'Document passage' };
    await render({ topic: 'plants', includeDocuments: true, selectedIds: ['doc'], sources: [{ id: 'doc', version: 1, allowAI: true }], generate: vi.fn(async () => ({ ok: true, packet: p })) });
    await click('Find sources to review'); expect(button('Generate from included passages').disabled).toBe(false);
    await render({ selectedIds: [] }); expect(button('Generate from included passages').disabled).toBe(true);
    await render({ selectedIds: ['doc'], sources: [{ id: 'doc', version: 2, allowAI: true }] });
    expect(button('Generate from included passages').disabled).toBe(true);
    expect(host.textContent).toContain('Refresh document passages before including it.');
  });
  it('keeps earlier evidence on an error and presents the failure', async () => {
    const p = initial(); const generate = vi.fn(async () => ({ ok: false, packet: p, error: 'Page could not be read' }));
    await render({ topic: 'plants', includeDocuments: false, generate });
    await click('Find sources to review');
    expect(host.querySelector('[role="alert"]').textContent).toBe('Page could not be read');
    expect(host.querySelectorAll('li[data-research-id]')).toHaveLength(1);
  });
});
