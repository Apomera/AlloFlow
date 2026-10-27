import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('catalog_module.js', 'utf8');
const entry = { slug: 'teacher-print', path: 'allopacks/teacher-print.allopack.json', title: 'Teaching together', grade_level: '6' };
const reading = { id: 'reading', type: 'simplified', title: 'Student case', data: 'Read the fictional case.', meta: '' };
const guide = (id, mode = 'teacher') => ({
  id, type: 'lesson-plan', title: id, meta: '',
  ...(mode ? { config: { generationInputs: { mode } } } : {}),
  data: { essentialQuestion: `${id} question`, objectives: [`${id} objective`], materialsNeeded: [], hook: `${id} teacher opening`, guidedPractice: `${id} teacher facilitation`, assessmentIdeas: [`${id} assessment`] },
});
const mixedPack = () => ({ allopack: { spec: '0.1', title: entry.title, workflowRevision: { coreResourceIds: ['reading'] } }, history: [reading, guide('Teacher guide'), guide('Legacy teacher guide', null), guide('Study guide', 'study'), guide('Family guide', 'family')] });
let win, catalog, root, container, fetcher, generate, printBehavior;

function prepare(pack) {
  fetcher.mockImplementation(async url => url.includes('/catalog/index.json')
    ? { ok: true, json: async () => ({ entries: [entry] }) }
    : { ok: true, text: async () => JSON.stringify(pack) });
  return pack;
}
const render = async props => act(async () => { root.render(React.createElement(catalog.BrowseTab, { selectedSlug: entry.slug, ...props })); });
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);
const click = async text => act(async () => { expect(button(text)).toBeTruthy(); button(text).click(); });
const selectPrint = async value => act(async () => {
  const select = container.querySelector('#catalog-print-selection');
  expect(select).not.toBeNull(); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
});

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  generate = vi.fn((items, title) => `<html><body><h1>${title}</h1><p>${items.map(item => item.id).join(',')}</p></body></html>`);
  win = { React, AlloModules: { createDocPipeline: () => ({ generateFullPackHTML: generate }) } };
  new Function('window', source)(win); catalog = win.AlloModules.CommunityCatalog;
  fetcher = vi.fn(); prepare(mixedPack()); vi.stubGlobal('fetch', fetcher);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  printBehavior = () => {};
  const append = document.body.appendChild.bind(document.body);
  vi.spyOn(document.body, 'appendChild').mockImplementation(node => {
    if (node.nodeType === 1 && node.hasAttribute('data-catalog-print-frame')) {
      const target = new EventTarget(); target.focus = vi.fn(); target.print = vi.fn(() => printBehavior());
      Object.defineProperty(node, 'contentWindow', { configurable: true, value: target });
    }
    return append(node);
  });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('separate catalog teacher-guide printing', () => {
  it('requires an explicit teacher scope, retains legacy guides, and leaves study/family guides in student packets', async () => {
    const pack = mixedPack(), before = JSON.stringify(pack);
    for (const selection of [undefined, 'all']) {
      await catalog._generateCatalogPreview(pack, entry, selection);
      expect(generate.mock.calls.at(-1)[0].map(item => item.id)).toEqual(['reading', 'Study guide', 'Family guide']);
      expect(generate.mock.calls.at(-1)[4].includeTeacherKey).toBe(false);
    }
    await catalog._generateCatalogPreview(pack, entry, 'core');
    expect(generate.mock.calls.at(-1)[0].map(item => item.id)).toEqual(['reading']);
    await catalog._generateCatalogPreview(pack, entry, 'teacher');
    expect(generate.mock.calls.at(-1)[0].map(item => item.id)).toEqual(['Teacher guide', 'Legacy teacher guide']);
    expect(generate.mock.calls.at(-1)[4]).toMatchObject({ audience: 'teacher', includeTeacherKey: false });
    await expect(catalog._generateCatalogPreview(pack, entry, 'resource:Teacher guide')).rejects.toThrow(/printable student resource/i);
    await expect(catalog._generateCatalogPreview({ ...pack, history: [reading] }, entry, 'teacher')).rejects.toThrow(/teacher guide/i);
    expect(JSON.stringify(pack)).toBe(before);
  });

  it('prints the cached teacher guide directly through a scriptless frame without changing the visible student preview', async () => {
    const pack = prepare({ ...mixedPack(), history: [reading, guide('Teacher guide')] }), load = vi.fn();
    await render({ loadProjectFromJson: load });
    const preview = container.querySelector('iframe'), previewHtml = preview.getAttribute('srcdoc'), fetchCount = fetcher.mock.calls.length;
    expect(container.querySelector('#catalog-print-selection').value).toBe('core');
    await click('Print teacher guide');
    const frame = document.querySelector('[data-catalog-print-frame]'); expect(frame).not.toBeNull();
    expect(frame.getAttribute('sandbox')).toBe('allow-same-origin allow-modals');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');
    const printed = new DOMParser().parseFromString(frame.getAttribute('srcdoc'), 'text/html');
    expect(printed.body.textContent).toContain('Teacher guide');
    expect(printed.body.textContent).not.toContain('reading');
    expect(frame.getAttribute('srcdoc')).toContain("script-src 'none'");
    expect(frame.getAttribute('srcdoc')).toContain("connect-src 'none'");
    const target = frame.contentWindow;
    await act(async () => { frame.dispatchEvent(new Event('load')); await Promise.resolve(); });
    expect(target.print).toHaveBeenCalledTimes(1);
    await act(async () => target.dispatchEvent(new Event('afterprint')));
    expect(document.querySelector('[data-catalog-print-frame]')).toBeNull();
    expect(container.querySelector('iframe')).toBe(preview);
    expect(preview.getAttribute('srcdoc')).toBe(previewHtml);
    expect(preview.getAttribute('sandbox')).toBe('');
    expect(fetcher).toHaveBeenCalledTimes(fetchCount); expect(load).not.toHaveBeenCalled();
    await click('Load in AlloFlow'); expect(load).toHaveBeenCalledExactlyOnceWith(pack);
  });

  it('allows previewing the teacher guide, then returning to the complete student selection without refetching', async () => {
    await render(); const fetchCount = fetcher.mock.calls.length;
    expect([...container.querySelectorAll('#catalog-print-selection option')].some(option => option.value === 'teacher')).toBe(true);
    expect(button('Print teacher guides')).toBeTruthy();
    await selectPrint('teacher');
    expect(generate.mock.calls.at(-1)[0].map(item => item.id)).toEqual(['Teacher guide', 'Legacy teacher guide']);
    expect(container.querySelector('iframe').getAttribute('srcdoc')).toContain('Legacy teacher guide');
    expect(container.querySelector('iframe').getAttribute('sandbox')).toBe('');
    expect(container.textContent).toMatch(/teacher guide/i);
    await selectPrint('all');
    expect(generate.mock.calls.at(-1)[0].map(item => item.id)).toEqual(['reading', 'Study guide', 'Family guide']);
    expect(fetcher).toHaveBeenCalledTimes(fetchCount);
  });

  it('does not offer a direct teacher-print action for a student-only pack', async () => {
    prepare({ allopack: { spec: '0.1' }, history: [reading, guide('Study guide', 'study'), guide('Family guide', 'family')] });
    await render();
    expect(button('Print teacher guide')).toBeUndefined(); expect(button('Print teacher guides')).toBeUndefined();
    expect(container.querySelector('#catalog-print-selection option[value="teacher"]')).toBeNull();
  });

  it('opens a teacher-only pack in the teacher preview scope', async () => {
    prepare({ allopack: { spec: '0.1' }, history: [guide('Only teacher guide')] });
    await render();
    expect(container.querySelector('#catalog-print-selection').value).toBe('teacher');
    expect(container.querySelector('iframe').getAttribute('srcdoc')).toContain('Only teacher guide');
    expect(button('Print teacher guide').disabled).toBe(false);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('cancels a late teacher-guide render when returning to the catalog', async () => {
    prepare({ ...mixedPack(), history: [reading, guide('Teacher guide')] }); await render();
    let release; win.AlloModules.createDocPipeline = undefined;
    win.__alloEnsureLazyModule = () => new Promise(resolve => { release = resolve; });
    await click('Print teacher guide');
    expect(release).toBeTypeOf('function');
    await click('Back to catalog');
    await act(async () => release(() => ({ generateFullPackHTML: generate })));
    expect(document.querySelector('[data-catalog-print-frame]')).toBeNull();
    expect(container.textContent).toContain('Preview lesson');
  });

  it('recovers from teacher-guide print failure without losing the student preview', async () => {
    prepare({ ...mixedPack(), history: [reading, guide('Teacher guide')] }); await render();
    const preview = container.querySelector('iframe'); printBehavior = () => { throw new Error('Print dialog unavailable'); };
    await click('Print teacher guide');
    const frame = document.querySelector('[data-catalog-print-frame]');
    // JSDOM may dispatch load before this click's act() finishes. A failed print
    // has already removed its frame in that case.
    if (frame) await act(async () => { frame.dispatchEvent(new Event('load')); await Promise.resolve(); });
    expect(container.querySelector('[role="alert"]').textContent).toContain('Print dialog unavailable');
    expect(document.querySelector('[data-catalog-print-frame]')).toBeNull();
    expect(container.querySelector('iframe')).toBe(preview); expect(button('Print teacher guide').disabled).toBe(false);
    printBehavior = () => {};
    await click('Print teacher guide');
    expect(document.querySelector('[data-catalog-print-frame]')).not.toBeNull();
  });

  it.each([
    ['academic_discourse_reading_space_grade6', 'reading-space-teaching-playbook', 'One device with teacher facilitation can support the pair’s work.', 'More practice in a separate pack', 1],
    ['reading_decisions_grade6', 'decision-unit-teacher-faq', 'saving on the device does not submit work to the teacher.', 'Interpret reflection proportionately.', 3],
  ])('preserves the complete native educator narrative and source links for %s', async (filename, id, preparation, teaching, sourceCount) => {
    win.AlloModules.InstructionalContext = require(resolve('instructional_context_module.js'));
    new Function('window', readFileSync('doc_pipeline_module.js', 'utf8'))(win);
    const pack = JSON.parse(readFileSync(`allopacks/${filename}.allopack.json`, 'utf8')), before = JSON.stringify(pack);
    const html = await catalog._generateCatalogPreview(pack, { title: pack.allopack.title }, 'teacher');
    const parsed = new DOMParser().parseFromString(html, 'text/html'), text = parsed.body.textContent;
    expect(parsed.querySelectorAll('[data-alloflow-resource-id]')).toHaveLength(1);
    const renderedGuide = parsed.querySelector(`[data-alloflow-resource-id="${id}"]`);
    expect(renderedGuide).not.toBeNull();
    expect(text).toContain('Teacher resources:'); expect(text).not.toContain('Student resources:');
    expect(parsed.querySelector('.worksheet-header')).toBeNull();
    const headerCredit = parsed.querySelector('.export-header .catalog-print-credit');
    expect(headerCredit).not.toBeNull(); expect(headerCredit.textContent).toContain(pack.allopack.title);
    expect(parsed.querySelector('footer.alloflow-export-footer')).toBeNull();
    const headings = [...renderedGuide.querySelectorAll('h2,h3,h4')].map(node => node.textContent.trim());
    expect(headings.some(heading => heading.includes('Materials Needed'))).toBe(true);
    expect(headings.some(heading => /materials header/i.test(heading))).toBe(false);
    const guideData = pack.history.find(item => item.id === id).data, extensions = guideData.extensions || [];
    expect(headings.some(heading => /\bExtensions\b/.test(heading))).toBe(extensions.length > 0);
    for (const extension of extensions) expect(renderedGuide.textContent).toContain(typeof extension === 'string' ? extension : extension.title);
    expect(text).toContain(preparation); expect(text).toContain(teaching);
    expect(text).toContain(guideData.assessmentIdeas[0]);
    for (const field of ['hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure']) {
      const firstParagraph = guideData[field].split(/\n\s*\n/).find(paragraph => paragraph.trim() && !/^\s*#/.test(paragraph));
      const firstSentence = firstParagraph.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').split(/(?<=[.!?])\s+/)[0];
      expect(renderedGuide.textContent.replace(/\s+/g, ' '), `Saved ${field} narrative remains present`).toContain(firstSentence.replace(/\s+/g, ' '));
    }
    for (const material of guideData.materialsNeeded) expect(renderedGuide.textContent).toContain(material);
    expect(text).toContain('Katie Novak');
    const sourceUrls = new Set([...parsed.querySelectorAll('a[href]')].map(link => link.getAttribute('href')).filter(url => url.startsWith('https://www.novakeducation.com/blog/')));
    expect(sourceUrls.size).toBe(sourceCount);
    expect(html).toContain("script-src 'none'"); expect(html).toContain("connect-src 'none'");
    for (const item of pack.history.filter(item => item.id !== id)) expect(parsed.querySelector(`[data-alloflow-resource-id="${item.id}"]`)).toBeNull();
    expect(JSON.stringify(pack)).toBe(before);
  }, 120000);
});
