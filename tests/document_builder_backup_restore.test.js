import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';
const require = createRequire(import.meta.url);
const factory = require('../dompurify/3.1.7/purify.min.js');
const purifier = factory.sanitize ? factory : factory(window);
const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const tree = parse(source, { sourceType: 'script', plugins: ['jsx'] });
const component = tree.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'ExportPreviewView');
const api = new Function(source.slice(0, component.start) + '\nreturn { _builderReadBackup, _builderFilterTools, _builderCollectToolTargets };')();
function callback(name, bindings) {
  const declaration = component.body.body.flatMap(node => node.declarations || []).find(node => node.id.name === name);
  const fn = declaration.init.arguments[0];
  return new Function(...Object.keys(bindings), 'return (' + source.slice(fn.start, fn.end) + ');')(...Object.values(bindings));
}
const html = body => '<!doctype html><html lang="en"><head><title>Saved lesson</title><style>p { color: navy; }</style></head><body>' + body + '</body></html>';

describe('HTML backup reader', () => {
  it('retains document layout, images, comments, citations and tracked text', () => {
    const result = api._builderReadBackup(html('<h1>Saved lesson</h1><p style="text-align:center"><mark data-allo-comment-id="c1" data-allo-comment-text="Review this">Text</mark><ins data-allo-change-id="i1"> added</ins></p><img alt="Chart" src="data:image/png;base64,AA=="><script type="application/json" data-allo-citation-store="1">[{"id":"source-1","title":"Source title","authors":["Author"],"url":"https://example.org"}]</script>'), purifier);
    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    expect(result.title).toBe('Saved lesson');
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.querySelector('style').textContent).toContain('color: navy');
    expect(doc.querySelector('mark').getAttribute('data-allo-comment-text')).toBe('Review this');
    expect(doc.querySelector('ins').textContent).toBe(' added');
    expect(doc.querySelector('img').getAttribute('src')).toContain('data:image/png');
    expect(JSON.parse(doc.querySelector('[data-allo-citation-store]').textContent)[0].title).toBe('Source title');
    expect(result.previewHtml).toContain('img-src data:');
    expect(result.previewHtml).not.toContain('img-src data: https:');
  });
  it('removes active content, unsafe links, external CSS and editor chrome', () => {
    const result = api._builderReadBackup(html('<h1 onclick="alert(1)">Lesson</h1><script>alert(1)</script><iframe src="https://example.org"></iframe><img onerror="alert(2)" src="javascript:alert(3)"><a href="java&#x09;script:alert(4)">Link</a><style>@import "https://example.org/evil.css";</style><p style="background:url(https://example.org/log)">Text</p><span data-allo-crop-ui>Crop</span><meta http-equiv="refresh" content="0;url=https://example.org"><base href="https://example.org">'), purifier);
    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    expect(doc.querySelector('script,iframe,base,[onclick],[onerror],[data-allo-crop-ui]')).toBeNull();
    expect(doc.querySelector('a').hasAttribute('href')).toBe(false);
    expect(doc.querySelector('img').hasAttribute('src')).toBe(false);
    expect(result.html).not.toContain('evil.css');
    expect(result.html).not.toContain('example.org/log');
    expect(doc.querySelectorAll('meta')).toHaveLength(1);
    expect(doc.querySelector('meta').content).toContain("default-src 'none'");
  });
  it('sanitizes deferred review snapshots before later Accept or Reject can apply them', () => {
    const doc = new DOMParser().parseFromString(html('<p data-allo-change-id="r1" data-allo-change-kind="format">Current text</p>'), 'text/html');
    doc.querySelector('p').setAttribute('data-allo-change-before', JSON.stringify({ tag: 'p', attributeMode: 'all', attributes: { onclick: 'alert(1)', style: 'color: red' }, html: '<img src="x" onerror="alert(2)"><b>Before</b>' }));
    const result = api._builderReadBackup(doc.documentElement.outerHTML, purifier);
    const restored = new DOMParser().parseFromString(result.html, 'text/html');
    const before = JSON.parse(restored.querySelector('p').getAttribute('data-allo-change-before'));
    expect(before.attributes.onclick).toBeUndefined();
    expect(before.attributes.style).toContain('color');
    expect(before.html).toContain('<b>Before</b>');
    expect(before.html).not.toContain('onerror');
  });
  it('escapes citation JSON so strings cannot terminate its data script', () => {
    const input = html('<p>Lesson</p><script type="application/json" data-allo-citation-store="1">[{"id":"s1","title":"&lt;title&gt;"}]</script>');
    const result = api._builderReadBackup(input, purifier);
    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    expect(doc.querySelectorAll('script')).toHaveLength(1);
    expect(doc.querySelector('script').type).toBe('application/json');
  });
  it.each(['not HTML', '<p></p>', '<script>alert(1)</script>'])('rejects unusable input: %s', value => {
    expect(() => api._builderReadBackup(value, purifier)).toThrow();
  });
  it('requires the sanitizer and bounds file content', () => {
    expect(() => api._builderReadBackup('<p>Text</p>', null)).toThrow('unavailable');
    expect(() => api._builderReadBackup('<p>' + 'x'.repeat(20 * 1024 * 1024) + '</p>', purifier)).toThrow('20 MB');
  });
});

describe('Tool search ranking and unavailable controls', () => {
  const tools = [
    { label: 'Add an image', keywords: 'Add an image Insert', id: 1 },
    { label: 'Image', keywords: 'Image Insert', id: 2 },
    { label: 'Page margins', keywords: 'Page margins Layout', id: 3 },
    { label: 'Font color', keywords: 'Font color Home', id: 4 },
  ];
  it('matches everyday words and plurals while ranking exact labels first', () => {
    expect(api._builderFilterTools(tools, 'photos').map(tool => tool.id)).toEqual([1, 2]);
    expect(api._builderFilterTools(tools, 'image').map(tool => tool.id)).toEqual([2, 1]);
    expect(api._builderFilterTools(tools, 'page margin')[0].id).toBe(3);
    expect(api._builderFilterTools(tools, 'typeface colour')[0].id).toBe(4);
  });
  it('keeps disabled controls discoverable with an actionable reason', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button id="builder-ribbon-tab-insert">Insert</button><div id="builder-ribbon-panel-insert"><button disabled>Insert citation</button><button disabled data-builder-disabled-reason="Choose a body row first">Remove row</button><input type="file"></div>';
    const entries = api._builderCollectToolTargets(container);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ disabled: true, reason: 'Add and select a source in Source Manager first.' });
    expect(entries[1].reason).toBe('Choose a body row first');
  });
});

describe('Backup restore transaction', () => {
  function setup({ saved = true, stale = false } = {}) {
    const token = {}, doc = { __alloBuilderCaptureToken: token };
    const before = '<html><body>Latest edits made before restoring</body></html>';
    const pendingBackup = { status: 'ready', html: '<p>Backup</p>', doc, token, context: 'current' };
    const bindings = { pendingBackup, exportPreviewRef: { current: { contentDocument: doc } }, draftContextRef: { current: stale ? 'other' : 'current' },
      getCleanBuilderDocument: vi.fn(() => ({ html: before })), draftStorageKey: 'key', draftCaptureRef: { current: { flush: vi.fn() } },
      persistLocalDraft: vi.fn(() => saved), setBackupRollback: vi.fn(), restoreDraftHtml: vi.fn(() => true), setPendingBackup: vi.fn(),
      setVersionComparison: vi.fn(), setActiveRibbonTab: vi.fn(), setRibbonCollapsed: vi.fn(), closeBackupImport: vi.fn(), exportDialogRef: { current: null } };
    return { bindings, before, restore: callback('restoreBuilderBackup', bindings) };
  }
  it.each([true, false])('preserves the latest document before replacing it (persistent=%s)', saved => {
    const f = setup({ saved }); f.restore();
    expect(f.bindings.persistLocalDraft).toHaveBeenCalledWith(f.before, expect.any(Number), 'Before backup restore');
    expect(f.bindings.setBackupRollback).toHaveBeenCalledWith(expect.objectContaining({ html: f.before, saved }));
    expect(f.bindings.setBackupRollback.mock.invocationCallOrder[0]).toBeLessThan(f.bindings.restoreDraftHtml.mock.invocationCallOrder[0]);
    expect(f.bindings.restoreDraftHtml).toHaveBeenCalledTimes(1);
  });
  it('refuses a stale document context without changing anything', () => {
    const f = setup({ stale: true }); f.restore();
    expect(f.bindings.restoreDraftHtml).not.toHaveBeenCalled();
    expect(f.bindings.persistLocalDraft).not.toHaveBeenCalled();
    expect(f.bindings.setPendingBackup).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });
});

describe('Backup figure and citation review fidelity', () => {
  it('keeps static SVG and MathML while excluding active SVG content', () => {
    const result = api._builderReadBackup(html('<h1>Equations and diagram</h1><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Circle"><circle cx="10" cy="10" r="8"></circle><script>alert(1)</script><animate attributeName="href" values="javascript:alert(1)"></animate></svg><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>+</mo><mn>1</mn></math>'), purifier);
    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    expect(doc.querySelector('svg circle')).not.toBeNull();
    expect(doc.querySelector('math mi').textContent).toBe('x');
    expect(doc.querySelector('script,animate')).toBeNull();
  });
  it('keeps sanitized before/after citation records available for tracked review', () => {
    const doc = new DOMParser().parseFromString(html('<p>Lesson</p><script type="application/json" data-allo-citation-store="1">[{"id":"s1","title":"Current source"}]</script>'), 'text/html');
    const store = doc.querySelector('script');
    store.setAttribute('data-allo-change-id', 'citation-edit');
    store.setAttribute('data-allo-change-kind', 'format');
    store.setAttribute('data-allo-change-before', JSON.stringify({ tag: 'script', attributeMode: 'all', attributes: { type: 'application/json', 'data-allo-citation-store': '1' }, html: JSON.stringify([{ id: 's1', title: 'Prior source' }]) }));
    const result = api._builderReadBackup(doc.documentElement.outerHTML, purifier);
    const output = new DOMParser().parseFromString(result.html, 'text/html').querySelector('script');
    expect(output.getAttribute('data-allo-change-id')).toBe('citation-edit');
    const snapshot = JSON.parse(output.getAttribute('data-allo-change-before'));
    expect(JSON.parse(snapshot.html)[0].title).toBe('Prior source');
    expect(snapshot.attributes.type).toBe('application/json');
  });
});
