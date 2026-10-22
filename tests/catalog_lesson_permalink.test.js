import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('catalog_module.js', 'utf8');
const entry = { slug: 'class-discussion', path: 'allopacks/class-discussion.allopack.json', title: 'Class discussion', grade_level: '6' };
const lesson = { allopack: { spec: '0.1' }, history: [{ id: 'reading', type: 'simplified', title: 'Discussion reading', data: 'Listen before responding.', meta: '' }] };
let win, catalog, root, container, fetcher;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  win = { React, AlloModules: { createDocPipeline: () => ({ generateFullPackHTML: () => '<html><body><h1>Listen before responding.</h1></body></html>' }) } };
  new Function('window', source)(win);
  catalog = win.AlloModules.CommunityCatalog;
  fetcher = vi.fn(async url => url.includes('/catalog/index.json')
    ? { ok: true, json: async () => ({ entries: [entry] }) }
    : { ok: true, text: async () => JSON.stringify(lesson) });
  vi.stubGlobal('fetch', fetcher);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const render = async props => act(async () => { root.render(React.createElement(catalog.BrowseTab, props)); });
const click = async text => act(async () => { const button = [...container.querySelectorAll('button')].find(node => node.textContent === text); expect(button).toBeTruthy(); button.click(); });

describe('published lesson permalinks', () => {
  it('builds a stable browser-app link while preserving catalog identity', () => {
    expect(catalog._catalogLessonPermalink('reading_space_grade6')).toBe('https://alloflow-cdn.pages.dev/app/?lesson=reading_space_grade6');
    for (const slug of ['../private', 'https://evil.test', 'a?file=other', '', 'a'.repeat(129)]) expect(() => catalog._catalogLessonPermalink(slug)).toThrow();
  });
  it('opens the matched completed lesson as scriptless content without importing', async () => {
    const load = vi.fn(); await render({ selectedSlug: entry.slug, loadProjectFromJson: load });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const frame = container.querySelector('iframe');
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('srcdoc')).toContain('Listen before responding.');
    expect(frame.getAttribute('srcdoc')).toContain("script-src 'none'");
    expect(frame.getAttribute('srcdoc')).toContain("connect-src 'none'");
    expect(load).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Loading this lesson replaces the current workspace.');
    await click('Load in AlloFlow'); expect(load).toHaveBeenCalledExactlyOnceWith(lesson);
  });
  it('does not fetch a lesson for an unknown or URL-shaped selection and offers catalog recovery', async () => {
    await render({ selectedSlug: 'https://evil.test/lesson.json' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Lesson not found');
    await click('Back to catalog');
    expect(container.textContent).toContain('Preview lesson');
    expect(container.textContent).toContain('Copy lesson link');
  });
  it('blocks unsafe manifest paths before making a file request', async () => {
    for (const path of ['https://evil.test/lesson.json', '../private.json', 'allopacks/../private.json', 'allopacks/a.json?url=evil']) {
      await expect(catalog._fetchCatalogLesson({ path }, fetcher)).rejects.toThrow('valid lesson file');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reports a failed lesson fetch and retries the same approved entry', async () => {
    fetcher.mockImplementationOnce(async () => ({ ok: true, json: async () => ({ entries: [entry] }) }))
      .mockImplementationOnce(async () => ({ ok: false, status: 503 }));
    await render({ selectedSlug: entry.slug });
    expect(container.textContent).toContain('HTTP 503');
    await click('Retry lesson preview');
    expect(container.querySelector('iframe')).not.toBeNull();
  });
  it('times out a stalled lesson request and preserves a retry action', async () => {
    vi.useFakeTimers();
    fetcher.mockImplementation(async (url, options) => url.includes('/catalog/index.json')
      ? { ok: true, json: async () => ({ entries: [entry] }) }
      : new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted')))));
    await render({ selectedSlug: entry.slug });
    await act(async () => { await vi.advanceTimersByTimeAsync(25000); });
    expect(container.textContent).toContain('lesson request timed out');
    expect(container.textContent).toContain('Retry lesson preview');
  });
  it('ignores late preview completion after returning to the catalog', async () => {
    let release; win.AlloModules.createDocPipeline = undefined;
    win.__alloEnsureLazyModule = () => new Promise(resolve => { release = resolve; });
    await render({ selectedSlug: entry.slug });
    await click('Back to catalog');
    await act(async () => release(() => ({ generateFullPackHTML: () => '<p>Late preview</p>' })));
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Preview lesson');
  });
  it('provides a selectable permalink when clipboard access is unavailable', async () => {
    await act(async () => root.render(React.createElement(catalog.LessonLinkButton, { entry })));
    await click('Copy lesson link');
    expect(container.querySelector('input').value).toBe(catalog._catalogLessonPermalink(entry.slug));
  });
  it('keeps the preview open until the existing importer explicitly confirms success', async () => {
    const closed = vi.fn(), load = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(false).mockResolvedValueOnce({ success: true });
    await render({ selectedSlug: entry.slug, loadProjectFromJson: load, onLessonImported: closed });
    await click('Load in AlloFlow'); expect(closed).not.toHaveBeenCalled();
    await click('Load in AlloFlow'); expect(closed).not.toHaveBeenCalled(); expect(container.textContent).toContain('Could not open lesson');
    await click('Load in AlloFlow'); expect(closed).toHaveBeenCalledTimes(1);
  });
  it('retains the preview while import is pending and after an asynchronous import failure', async () => {
    let rejectImport;
    const closed = vi.fn(), load = vi.fn(() => new Promise((_, reject) => { rejectImport = reject; }));
    await render({ selectedSlug: entry.slug, loadProjectFromJson: load, onLessonImported: closed });
    await click('Load in AlloFlow');
    expect(container.querySelector('iframe')).not.toBeNull();
    expect(container.textContent).toContain('Opening…');
    expect(closed).not.toHaveBeenCalled();
    await act(async () => rejectImport(new Error('Could not read this project')));
    expect(container.textContent).toContain('Could not read this project');
    expect(container.querySelector('iframe')).not.toBeNull();
    expect(closed).not.toHaveBeenCalled();
    expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Load in AlloFlow').disabled).toBe(false);
  });
  it('renders the real discussion sample through the native renderer without a model call', async () => {
    new Function('window', readFileSync('doc_pipeline_module.js', 'utf8'))(win);
    const sample = JSON.parse(readFileSync('allopacks/academic_discourse_reading_space_grade6.allopack.json', 'utf8'));
    const html = await catalog._generateCatalogPreview(sample, { title: 'Reading Space' });
    expect(html).toContain('Reading Space');
    expect(html.length).toBeGreaterThan(10000);
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('script,style').forEach(node => node.remove());
    expect(parsed.body.textContent.includes('undefined')).toBe(false);
    expect(parsed.body.textContent).toContain('Open responses');
    expect(parsed.body.textContent).not.toContain('Multiple Choice');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
