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
let win, catalog, root, container, fetcher, printBehavior;
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
  printBehavior = () => {};
  const append = document.body.appendChild.bind(document.body);
  vi.spyOn(document.body, 'appendChild').mockImplementation(node => {
    if (node.nodeType === 1 && node.hasAttribute('data-catalog-print-frame')) {
      const target = new EventTarget();
      target.focus = vi.fn(); target.print = vi.fn(() => printBehavior());
      Object.defineProperty(node, 'contentWindow', { configurable: true, value: target });
    }
    return append(node);
  });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const render = async props => act(async () => { root.render(React.createElement(catalog.BrowseTab, props)); });
const click = async text => act(async () => { const button = [...container.querySelectorAll('button')].find(node => node.textContent === text); expect(button).toBeTruthy(); button.click(); });
const selectPrint = async value => act(async () => { const select = container.querySelector('#catalog-print-selection'); expect(select).not.toBeNull(); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
const selectionPack = core => ({ allopack: { spec: '0.1', workflowRevision: { coreResourceIds: core } }, history: [
  { ...lesson.history[0], id: 'start', title: 'Start here' },
  { ...lesson.history[0], id: 'record', title: 'Decision record' },
  { ...lesson.history[0], id: 'extra', title: 'Later practice' },
  { id: 'teacher', type: 'lesson-plan', title: 'Teacher guide', data: { essentialQuestion: 'Prepare for teaching' }, config: { generationInputs: { mode: 'teacher' } }, meta: '' },
] });
const prepareSelectionPack = pack => {
  fetcher.mockImplementation(async url => url.includes('/catalog/index.json') ? { ok: true, json: async () => ({ entries: [entry] }) } : { ok: true, text: async () => JSON.stringify(pack) });
  const generate = vi.fn((items, title) => `<html><body><h1>${title}</h1><p>${items.map(item => item.id).join(',')}</p></body></html>`);
  win.AlloModules.createDocPipeline = () => ({ generateFullPackHTML: generate });
  return generate;
};

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
  it('prints the prepared student copy without importing or fetching the lesson again', async () => {
    const load = vi.fn(); await render({ selectedSlug: entry.slug, loadProjectFromJson: load });
    const visibleFrame = container.querySelector('iframe');
    const fetchCount = fetcher.mock.calls.length;
    await click('Print / Save PDF');
    const printFrame = document.querySelector('[data-catalog-print-frame]');
    expect(printFrame).not.toBeNull();
    expect(printFrame.getAttribute('sandbox')).toBe('allow-same-origin allow-modals');
    expect(printFrame.getAttribute('sandbox')).not.toContain('allow-scripts');
    expect(printFrame.getAttribute('srcdoc')).toBe(visibleFrame.getAttribute('srcdoc'));
    expect(visibleFrame.getAttribute('sandbox')).toBe('');
    const target = printFrame.contentWindow;
    await act(async () => { printFrame.dispatchEvent(new Event('load')); await Promise.resolve(); });
    expect(target.print).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(fetchCount);
    await act(async () => target.dispatchEvent(new Event('afterprint')));
    expect(document.querySelector('[data-catalog-print-frame]')).toBeNull();
    expect(container.querySelector('iframe')).toBe(visibleFrame);
  });
  it('keeps printing disabled until the printable preview is ready', async () => {
    let release; win.AlloModules.createDocPipeline = undefined;
    win.__alloEnsureLazyModule = () => new Promise(resolve => { release = resolve; });
    await render({ selectedSlug: entry.slug });
    expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Print / Save PDF').disabled).toBe(true);
    await act(async () => release(() => ({ generateFullPackHTML: () => '<p>Ready print copy</p>' })));
    expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Print / Save PDF').disabled).toBe(false);
  });
  it('cleans up a failed print and leaves the action available to retry', async () => {
    await render({ selectedSlug: entry.slug });
    printBehavior = () => { throw new Error('Printing blocked'); };
    await click('Print / Save PDF');
    const printFrame = document.querySelector('[data-catalog-print-frame]');
    if (printFrame) await act(async () => { printFrame.dispatchEvent(new Event('load')); await Promise.resolve(); });
    expect(container.querySelector('[role="alert"]').textContent).toContain('Printing blocked');
    expect(document.querySelector('[data-catalog-print-frame]')).toBeNull();
    expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Print / Save PDF').disabled).toBe(false);
  });
  it('removes a pending print copy when returning to the catalog', async () => {
    await render({ selectedSlug: entry.slug });
    await click('Print / Save PDF');
    expect(document.querySelector('[data-catalog-print-frame]')).not.toBeNull();
    await click('Back to catalog');
    expect(document.querySelector('[data-catalog-print-frame]')).toBeNull();
    expect(container.textContent).not.toContain('Could not print lesson');
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
  }, 120000); // The full illustrated collection also exercises the native sanitizer in the emulated DOM.
  it('keeps teacher plans out of the student preview while retaining Study and Family Guides', async () => {
    new Function('window', readFileSync('doc_pipeline_module.js', 'utf8'))(win);
    const guide = (id, mode) => ({ id, type: 'lesson-plan', title: id, meta: '',
      ...(mode ? { config: { generationInputs: { mode } } } : {}),
      data: { essentialQuestion: `${id} question`, objectives: [`${id} objective`], materialsNeeded: [], hook: `${id} opening` },
    });
    const reading = { ...lesson.history[0], sourceAlignment: { source: 'original-source' }, sourceSnapshot: { text: lesson.history[0].data, fingerprint: 'preserved-source' } };
    const mixed = { allopack: { spec: '0.1' }, history: [reading, guide('Private teacher plan', 'teacher'), guide('Legacy teacher plan'), guide('Study Guide', 'study'), guide('Family Guide', 'family')] };
    const before = JSON.stringify(mixed);
    const html = await catalog._generateCatalogPreview(mixed, { title: 'Mixed audiences' });
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    expect(parsed.querySelector('[data-alloflow-resource-id="reading"]')).not.toBeNull();
    expect(parsed.querySelector('[data-alloflow-resource-id="Private teacher plan"]')).toBeNull();
    expect(parsed.querySelector('[data-alloflow-resource-id="Legacy teacher plan"]')).toBeNull();
    expect(parsed.body.textContent).not.toContain('Private teacher plan');
    expect(parsed.body.textContent).not.toContain('Legacy teacher plan');
    expect(parsed.body.textContent).toContain('Study Guide opening');
    expect(parsed.body.textContent).toContain('Family Guide opening');
    expect(JSON.stringify(mixed)).toBe(before);
  });
  it('uses the shared learner-guide rule when it is available and imports the complete original pack', async () => {
    const teacher = { id: 'teacher', type: 'lesson-plan', title: 'Teacher planning', data: { essentialQuestion: 'Private preparation' }, config: { generationInputs: { mode: 'teacher' } }, meta: '' };
    const mixed = { allopack: { spec: '0.1' }, history: [...lesson.history, teacher] };
    const generate = vi.fn(() => '<p>Student copy</p>');
    win.AlloModules.createDocPipeline = () => ({ generateFullPackHTML: generate });
    const learnerGuideRule = vi.fn(() => false);
    win.AlloModules.SessionTransport = { isStudentDeliverableGuide: learnerGuideRule };
    fetcher.mockImplementation(async url => url.includes('/catalog/index.json')
      ? { ok: true, json: async () => ({ entries: [entry] }) }
      : { ok: true, text: async () => JSON.stringify(mixed) });
    const load = vi.fn(); await render({ selectedSlug: entry.slug, loadProjectFromJson: load });
    expect(learnerGuideRule).toHaveBeenCalledWith(teacher);
    expect(generate.mock.calls[0][0]).toEqual(lesson.history);
    expect(container.textContent).toContain('Print the teacher guide directly below, or choose it in Print selection to preview it first.');
    await click('Load in AlloFlow');
    expect(load).toHaveBeenCalledExactlyOnceWith(mixed);
    expect(load.mock.calls[0][0].history[1]).toEqual(teacher);
  });
  it('omits both real Katie teacher guides and their contents entries without changing either source pack', async () => {
    new Function('window', readFileSync('doc_pipeline_module.js', 'utf8'))(win);
    for (const filename of ['academic_discourse_reading_space_grade6', 'reading_decisions_grade6']) {
      const sample = JSON.parse(readFileSync(`allopacks/${filename}.allopack.json`, 'utf8'));
      const before = JSON.stringify(sample), teacher = sample.history.find(item => item.type === 'lesson-plan');
      const html = await catalog._generateCatalogPreview(sample, { title: sample.allopack.title });
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      expect(parsed.querySelector(`[data-alloflow-resource-id="${teacher.id}"]`)).toBeNull();
      expect(parsed.querySelector(`a[href="#${teacher.id}"]`)).toBeNull();
      expect(parsed.body.textContent).not.toContain(teacher.title);
      expect(parsed.querySelectorAll('[data-alloflow-resource-id]').length).toBe(sample.history.length - 1);
      expect(JSON.stringify(sample)).toBe(before);
    }
  });
  it('starts with the explicitly authored core and labels the remaining collection clearly', async () => {
    const pack = selectionPack(['record', 'start']), generate = prepareSelectionPack(pack);
    await render({ selectedSlug: entry.slug });
    expect(container.querySelector('#catalog-print-selection').value).toBe('core');
    expect(generate.mock.calls[0][0].map(item => item.id)).toEqual(['record', 'start']);
    expect(container.textContent).toContain('Core lesson (2 resources)');
    expect(container.textContent).toContain('All student resources (3)');
    expect(container.textContent).toContain('Other student resources are available in the full collection.');
  });
  it.each([[], ['start', 'missing'], ['start', 'start'], ['start', 'teacher'], undefined])('falls back to the full student collection for incomplete or invalid core metadata: %j', async core => {
    const generate = prepareSelectionPack(selectionPack(core));
    await render({ selectedSlug: entry.slug });
    expect(container.querySelector('#catalog-print-selection').value).toBe('all');
    expect(container.querySelector('option[value="core"]')).toBeNull();
    expect(generate.mock.calls[0][0].map(item => item.id)).toEqual(['start', 'record', 'extra']);
  });
  it('switches to one resource and prints that copy without refetching or changing the full pack used by Load and JSON', async () => {
    const pack = selectionPack(['start', 'record']), original = JSON.stringify(pack), generate = prepareSelectionPack(pack), load = vi.fn();
    await render({ selectedSlug: entry.slug, loadProjectFromJson: load });
    const fetchCount = fetcher.mock.calls.length;
    await selectPrint('resource:record');
    expect(fetcher).toHaveBeenCalledTimes(fetchCount);
    expect(generate.mock.calls.at(-1)[0].map(item => item.id)).toEqual(['record']);
    expect(generate.mock.calls.at(-1)[1]).toBe('Decision record');
    expect(container.textContent).toContain('Keep any named companion case or activity with it.');
    await click('Print / Save PDF');
    const printFrame = document.querySelector('[data-catalog-print-frame]');
    expect(printFrame.getAttribute('srcdoc')).toContain('<h1>Decision record</h1><p>record</p>');
    await act(async () => { printFrame.dispatchEvent(new Event('load')); await Promise.resolve(); printFrame.contentWindow.dispatchEvent(new Event('afterprint')); });
    await click('Load in AlloFlow');expect(load).toHaveBeenCalledExactlyOnceWith(pack);
    let downloaded;
    vi.stubGlobal('Blob', class { constructor(parts) { downloaded = parts.join(''); } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:download'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click('Download JSON');expect(JSON.parse(downloaded)).toEqual(pack);expect(JSON.stringify(pack)).toBe(original);
  });
  it('keeps the newest print selection when a previous render completes late', async () => {
    const pack = selectionPack(['start', 'record']), generate = prepareSelectionPack(pack);
    const first = await catalog._generateCatalogPreview(pack, entry, 'all');expect(first).toContain('start,record,extra');
    const pending = [];
    win.AlloModules.createDocPipeline = undefined;
    win.__alloEnsureLazyModule = () => new Promise(resolve => pending.push(resolve));
    await render({ selectedSlug: entry.slug });
    await selectPrint('resource:extra');
    expect(pending).toHaveLength(2);
    const factory = () => ({ generateFullPackHTML: generate });
    await act(async () => pending[1](factory));
    expect(container.querySelector('iframe').getAttribute('srcdoc')).toContain('<p>extra</p>');
    await act(async () => pending[0](factory));
    expect(container.querySelector('iframe').getAttribute('srcdoc')).toContain('<p>extra</p>');
    expect(container.querySelector('#catalog-print-selection').value).toBe('resource:extra');
  });
  it('disables the selection while print images are preparing and while a complete-pack import is pending', async () => {
    prepareSelectionPack(selectionPack(['start', 'record']));
    let imageLoaded, finishImport;
    const append = document.body.appendChild.getMockImplementation();
    document.body.appendChild.mockImplementation(node => {
      if (node.nodeType === 1 && node.hasAttribute('data-catalog-print-frame')) Object.defineProperty(node, 'contentDocument', { configurable: true, value: { images: [{ complete: false, addEventListener: (type, resolve) => { if (type === 'load') imageLoaded = resolve; } }] } });
      return append(node);
    });
    await render({ selectedSlug: entry.slug, loadProjectFromJson: () => new Promise(resolve => { finishImport = resolve; }) });
    await click('Print / Save PDF');
    const frame = document.querySelector('[data-catalog-print-frame]');
    await act(async () => frame.dispatchEvent(new Event('load')));
    expect(container.querySelector('#catalog-print-selection').disabled).toBe(true);
    await act(async () => { imageLoaded(); await Promise.resolve(); });
    await act(async () => frame.contentWindow.dispatchEvent(new Event('afterprint')));
    expect(container.querySelector('#catalog-print-selection').disabled).toBe(false);
    await click('Load in AlloFlow');
    expect(container.querySelector('#catalog-print-selection').disabled).toBe(true);
    await act(async () => finishImport(false));
    expect(container.querySelector('#catalog-print-selection').disabled).toBe(false);
  });
  it('supports explicit full/core/individual previews without mutating source data and keeps print chrome concise', async () => {
    new Function('window', readFileSync('doc_pipeline_module.js', 'utf8'))(win);
    const sample = JSON.parse(readFileSync('allopacks/academic_discourse_reading_space_grade6.allopack.json', 'utf8')), before = JSON.stringify(sample);
    const parse = html => new DOMParser().parseFromString(html, 'text/html');
    const core = parse(await catalog._generateCatalogPreview(sample, entry, 'core'));
    expect(core.querySelectorAll('[data-alloflow-resource-id]')).toHaveLength(4);
    const single = parse(await catalog._generateCatalogPreview(sample, entry, 'resource:reading-space-glossary'));
    expect(single.querySelectorAll('[data-alloflow-resource-id]')).toHaveLength(1);
    expect(single.querySelector('h1').textContent).toContain('Words for Thinking Together');
    expect(single.body.textContent).toContain('Created with AlloFlow');
    expect(single.body.textContent).not.toContain('Header score');
    const printStyles = [...single.querySelectorAll('style')].map(node => node.textContent).join('');
    expect(printStyles).toMatch(/@media print\{[^}]*\.a11y-badge[^}]*display:none!important/);
    expect(printStyles).toMatch(/@media print\{[^}]*\.alloflow-export-save-tools[^}]*display:none!important/);
    expect([...single.querySelectorAll('thead th')].map(node => node.textContent.trim())).toEqual(['Image', 'Term', 'Definition']);
    expect(JSON.stringify(sample)).toBe(before);
    await expect(catalog._generateCatalogPreview(sample, entry, 'resource:missing')).rejects.toThrow('Choose a printable student resource');
  });
  it('keeps parent-pack and source attribution with individual Katie resources only', async () => {
    new Function('window', readFileSync('doc_pipeline_module.js', 'utf8'))(win);
    for (const [filename, resourceId, sourceCount] of [['academic_discourse_reading_space_grade6', 'reading-space-glossary', 1], ['reading_decisions_grade6', 'decision-unit-portfolio', 3]]) {
      const sample = JSON.parse(readFileSync(`allopacks/${filename}.allopack.json`, 'utf8')), before = JSON.stringify(sample);
      const html = await catalog._generateCatalogPreview(sample, { title: sample.allopack.title }, `resource:${resourceId}`);
      const parsed = new DOMParser().parseFromString(html, 'text/html'), footer = parsed.querySelector('footer.alloflow-export-footer');
      expect(footer.querySelector('.catalog-print-credit').textContent).toContain(sample.allopack.title);
      expect(footer.textContent).toContain(sample.allopack.author);
      expect(footer.textContent).toContain('Katie Novak');
      expect(footer.querySelectorAll('.catalog-print-credit a')).toHaveLength(sourceCount);
      expect([...footer.querySelectorAll('.catalog-print-credit a')].every(link => link.href.startsWith('https://www.novakeducation.com/'))).toBe(true);
      expect(footer.textContent).toContain('Created with AlloFlow');
      expect(JSON.stringify(sample)).toBe(before);
      const complete = new DOMParser().parseFromString(await catalog._generateCatalogPreview(sample, entry, 'all'), 'text/html');
      expect(complete.querySelector('.catalog-print-credit')).toBeNull();
    }
  });
  it('escapes individual-print metadata and links only safe HTTPS sources without inventing authorship', async () => {
    const pack = selectionPack(['start']);
    pack.allopack.title = 'A <script>danger()</script> $& pack';
    pack.allopack.author = 'Community author <img src=x onerror=danger()>';
    pack.allopack.sourceBasis = { sources: [
      { title: 'Safe <b>reading</b>', author: '<svg onload=danger()>', url: 'https://example.org/reading?x=1&y=2' },
      { title: 'Unsafe script reading', url: 'javascript:danger()' },
      { title: 'Unsafe data reading', url: 'data:text/html,<script>danger()</script>' },
      { title: 'Credential URL', url: 'https://name:secret@example.org/private' },
    ] };
    const before = JSON.stringify(pack);
    const parsed = new DOMParser().parseFromString(await catalog._generateCatalogPreview(pack, entry, 'resource:record'), 'text/html');
    const footer = parsed.querySelector('footer.alloflow-export-footer');
    expect(footer.textContent).toContain(pack.allopack.title);
    expect(footer.textContent).toContain(pack.allopack.author);
    expect(footer.querySelector('script,img,b,svg')).toBeNull();
    expect(footer.querySelectorAll('a')).toHaveLength(1);
    expect(footer.querySelector('a').href).toBe('https://example.org/reading?x=1&y=2');
    expect(footer.querySelector('a').textContent).toBe('Safe <b>reading</b>');
    expect(footer.textContent).toContain('Unsafe script reading');
    expect(footer.textContent).not.toContain('endorsed');
    expect(JSON.stringify(pack)).toBe(before);
    delete pack.allopack.sourceBasis;delete pack.allopack.author;
    const parentOnly = new DOMParser().parseFromString(await catalog._generateCatalogPreview(pack, entry, 'resource:record'), 'text/html').querySelector('.catalog-print-credit');
    expect(parentOnly.textContent).toContain(pack.allopack.title);
    expect(parentOnly.querySelector('a')).toBeNull();
  });
});
