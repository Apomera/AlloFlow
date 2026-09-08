import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const { toGrade1BRF } = require('../liblouis_braille_loader.js');
const view = readFileSync('view_export_preview_source.jsx', 'utf8');
const helpers = new Function(view.slice(view.indexOf('const _BUILDER_STYLE_GALLERY'), view.indexOf('function ExportPreviewView')) + '\nreturn { clean: _builderCleanMarkdownRoot, markdown: _builderMarkdownFromRoot, image: _builderFetchExportImage, finalize: _builderFinalizeDocumentForExport };')();
const ast = parse(view, { sourceType: 'script', plugins: ['jsx'] });
const callbacks = [];
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXElement' && node.openingElement.name.name === 'button') {
    const attribute = node.openingElement.attributes.find(item => item.name?.name === 'onClick');
    if (attribute?.value?.expression) callbacks.push({ text: view.slice(node.start, node.end), code: view.slice(attribute.value.expression.start, attribute.value.expression.end) });
  }
  for (const [key, value] of Object.entries(node)) {
    if (['start', 'end', 'loc'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
  }
}
visit(ast);
function callback(marker, environment) {
  const matches = callbacks.filter(item => item.text.includes(marker));
  expect(matches).toHaveLength(1);
  return new Function(...Object.keys(environment), 'return (' + matches[0].code + ');')(...Object.values(environment));
}
function doc(body, title = 'Live lesson') { const value = document.implementation.createHTMLDocument(title); value.documentElement.lang = 'en'; value.body.innerHTML = body; return value; }
class CaptureBlob { constructor(parts) { this.text = parts.join(''); } }
function environment(document, extra = {}) {
  return { exportPreviewRef: { current: { contentDocument: document } }, exportConfig: {}, altExportBusy: '',
    beginAlternativeExport: vi.fn(() => true), finishAlternativeExport: vi.fn(), runBuilderPreflight: () => ({ errors: 0 }),
    _builderCleanMarkdownRoot: helpers.clean, _builderMarkdownFromRoot: helpers.markdown,
    _builderFinalizeDocumentForExport: helpers.finalize, _builderStripEditorBreakMetadata() {},
    _builderFetchExportImage: helpers.image, window, Blob: CaptureBlob,
    downloadBuilderBlob: vi.fn(), addToast: vi.fn(), ...extra };
}
beforeAll(() => { new Function(readFileSync('export_source.jsx', 'utf8'))(); new Function(readFileSync('export_handlers_module.js', 'utf8'))(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); delete window.AlloModules.AccessibleOfficeExport; delete window.__alloEnsurePdfAuditView; delete window.AlloBraille; delete window.__alloLoadPlugin; delete window.AlloMathSpeech; });

describe('live Builder Slides fidelity', () => {
  function api() { return window.AlloModules.createExport({ liveRef: { current: { history: [{ type: 'simplified', data: 'OLD_VALUE_10' }], sourceTopic: 'Lesson', gradeLevel: '5', addToast: vi.fn(), t: key => key } }, warnLog() {}, debugLog() {}, escapeXml: text => text, generateUUID: () => 'id' }); }
  it('hands the serialized live preview to the real slide handler, replacing old History content', async () => {
    const build = vi.fn(async args => ({ blob: new Blob([args.html]), fileName: 'live.pptx', message: 'Review the slides.' }));
    window.AlloModules.AccessibleOfficeExport = { build };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:slides'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {}); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const handler = api(), close = vi.fn(), preview = doc('<h1>LIVE_EDITED_TITLE</h1><p>LIVE_VALUE_42</p>');
    const result = await window.AlloModules.ExportHandlers.executeExportFromPreview({ _docPipeline: {}, addToast: vi.fn(), t: key => key,
      exportPreviewMode: 'slides', exportPreviewRef: { current: { contentDocument: preview } }, generateFullPackHTML: () => '', getExportableHistory: () => [], getSkippedResources: () => [],
      sourceTopic: 'Lesson', studentResponses: {}, exportConfig: {}, history: [], setShowExportPreview: close, handleExportSlides: options => handler.handleExportSlides({ ...options, history: [{ type: 'simplified', data: 'OLD_VALUE_10' }] }) });
    expect(result).toBe(true); expect(close).toHaveBeenCalledWith(false);
    expect(build).toHaveBeenCalledWith(expect.objectContaining({ format: 'pptx', html: expect.stringContaining('LIVE_VALUE_42') }));
    expect(build.mock.calls[0][0].html).not.toContain('OLD_VALUE_10'); expect(build.mock.calls[0][0].html).toContain('LIVE_EDITED_TITLE');
  });
  it.each(['missing exporter', 'failed build', 'empty snapshot'])('never falls back to History on %s', async reason => {
    const writeFile = vi.fn(); window.PptxGenJS = class { writeFile = writeFile; };
    if (reason === 'failed build') window.AlloModules.AccessibleOfficeExport = { build: async () => { throw new Error('build failed'); } };
    expect(await api().handleExportSlides({ liveHtml: reason === 'empty snapshot' ? '' : '<h1>Current</h1>' })).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });
  it('maps live HTML through the existing semantic deck converter and reports review limits', async () => {
    const source = readFileSync('view_pdf_audit_source.jsx', 'utf8');
    const spec = new Function(source.slice(source.indexOf('function _htmlToDocxSpec(html) {'), source.indexOf('\n// _buildDocxBlobFromSpec:')) + '\nreturn _htmlToDocxSpec;')();
    const deck = new Function(source.slice(source.indexOf('function _docxSpecToSlides(spec) {'), source.indexOf('// end _docxSpecToSlides', source.indexOf('function _docxSpecToSlides(spec) {'))) + '\nreturn _docxSpecToSlides;')();
    const start = source.indexOf('async function _buildAccessibleOfficeExport('), end = source.indexOf('// Footnote renumber engine', start);
    let captured;
    const build = new Function('_ensurePptxLib', '_htmlToDocxSpec', '_docxSpecToSlides', '_buildPptxBlobFromSlides', source.slice(start, end) + '\nreturn _buildAccessibleOfficeExport;')(
      async () => class {}, spec, deck, async value => { captured = value; return new Blob(['pptx']); });
    const result = await build({ html: '<html lang="en"><head><title>Live</title></head><body><h1>Corrected heading</h1><p>VALUE_42</p><table><tr><th>Value</th></tr><tr><td>42</td></tr></table></body></html>', title: 'Edited', format: 'pptx' });
    expect(JSON.stringify(captured)).toContain('VALUE_42'); expect(JSON.stringify(captured)).toContain('Corrected heading'); expect(captured.counts.tables).toBe(1);
    expect(result).toMatchObject({ fileName: 'Edited.pptx', message: expect.stringContaining('Review slide layout') });
  });
});

describe('Builder Markdown preservation', () => {
  it('keeps image sources and full MathML while excluding document head and deleted revisions', async () => {
    const source = doc('<h1>Lesson</h1><p>Equation: <math><mi>x</mi><mo>=</mo><mn>42</mn></math></p><img alt="Diagram" src="data:image/png;base64,aGVsbG8="/><del data-allo-change-id="deleted">OLD_SECRET</del><ins data-allo-change-id="inserted">CURRENT</ins>');
    const env = environment(source); await callback('📝 Markdown (.md)', env)();
    const text = env.downloadBuilderBlob.mock.calls[0][0].text;
    expect(text).toContain('![Diagram](<data:image/png;base64,aGVsbG8=>)'); expect(text).toContain('```mathml\n<math'); expect(text).toContain('<mn>42</mn>');
    expect(text).not.toContain('OLD_SECRET'); expect(text).toContain('CURRENT'); expect(text).not.toContain('Live lesson'); expect(env.finishAlternativeExport).toHaveBeenCalledOnce();
  });
  it('preserves merged table geometry and emits a reader-support notice', () => {
    const source = doc('<table><tr><th colspan="2">Combined</th></tr><tr><td>A</td><td>42</td></tr></table>');
    const result = helpers.markdown(helpers.clean(source));
    expect(result.markdown).toContain('<th colspan="2">Combined</th>'); expect(result.markdown).toContain('<td>42</td>'); expect(result.warnings.join(' ')).toContain('retained as HTML');
  });
  it('retains blank lines inside code and MathML and keeps internal references', () => {
    const source = doc('<h1 id="destination">Target</h1><a href="#destination">Jump</a><pre>first\n\n\nlast</pre><math><annotation>first\n\n\nlast</annotation></math>');
    const result = helpers.markdown(helpers.clean(source));
    expect(result.markdown).toContain('first\n\n\nlast'); expect(result.markdown).toContain('[Jump](<#destination>)');
  });
  it('does not carry editor attributes or active handlers into retained HTML tables', () => {
    const source = doc('<table onclick="alert(1)" contenteditable="true"><tr><th colspan="2" onclick="alert(2)">Combined</th></tr><tr><td contenteditable="true">A</td><td>42</td></tr></table>');
    const result = helpers.markdown(helpers.clean(source));
    expect(result.markdown).toContain('colspan="2"'); expect(result.markdown).not.toContain('onclick'); expect(result.markdown).not.toContain('contenteditable');
  });
  it('keeps an image description and reports unsupported transient or unsafe sources', () => {
    const result = helpers.markdown(helpers.clean(doc('<img alt="Original diagram" src="javascript:alert(1)">')));
    expect(result.markdown).toContain('Original diagram'); expect(result.markdown).not.toContain('javascript:'); expect(result.warnings).toHaveLength(1);
  });
  it('uses the same live converter for edited NotebookLM sources', async () => {
    const source = doc('<h1>Current</h1><img alt="Diagram" src="https://example.test/image.png"><math><mi>x</mi></math>'); source.body.setAttribute('data-allo-user-edited', '1');
    const env = environment(source, { history: [{ data: 'OLD_NOTEBOOK_VALUE' }] });
    await callback('Building NotebookLM source', env)();
    const text = env.downloadBuilderBlob.mock.calls[0][0].text;
    expect(text).toContain('https://example.test/image.png'); expect(text).toContain('<math'); expect(text).not.toContain('OLD_NOTEBOOK_VALUE');
  });
});

describe('Builder Braille accepted view and fallback', () => {
  it('removes tracked deletions before calling the shared converter', async () => {
    const convert = vi.fn(text => ({ brf: text, dropped: 0 })); window.AlloBraille = { toGrade1BRF: convert };
    const env = environment(doc('<p>Keep <del data-allo-change-id="old">DELETED_SECRET</del><ins data-allo-change-id="new">current</ins>.</p>'));
    await callback('const _toBRF', env)();
    expect(convert.mock.calls[0][0]).not.toContain('DELETED_SECRET'); expect(convert.mock.calls[0][0]).toContain('current');
    expect(env.downloadBuilderBlob.mock.calls[0][0].text).not.toContain('DELETED_SECRET');
  });
  it.each(['Cab 12ab', 'ABC\n12.5 m', 'First\r\nSecond'])('matches canonical Grade-1 word/number grouping when the loader fails: %s', async text => {
    window.__alloLoadPlugin = vi.fn().mockRejectedValue(new Error('offline'));
    const source = doc('<p></p>'); source.querySelector('p').textContent = text;
    const env = environment(source); await callback('const _toBRF', env)();
    const result = env.downloadBuilderBlob.mock.calls[0][0].text.replace(/\r\n/g, '\n');
    expect(result).toBe(toGrade1BRF(text.trim()).replace(/\r\n/g, '\n'));
  });
});

function response(chunks, extra = {}) {
  const reader = { read: vi.fn(async () => chunks.length ? { done: false, value: chunks.shift() } : { done: true }), cancel: vi.fn(async () => {}), releaseLock: vi.fn() };
  return { value: { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'image/png' : null }, body: { getReader: () => reader }, ...extra }, reader };
}
describe('ePub bounded image transfer', () => {
  it('reads a complete image incrementally and releases the stream', async () => {
    const { value, reader } = response([new Uint8Array([1, 2]), new Uint8Array([3])]);
    const result = await helpers.image('https://example.test/image', { fetchImpl: async () => value, maxBytes: 3 });
    expect([...result.bytes]).toEqual([1, 2, 3]); expect(result.mediaType).toBe('image/png'); expect(reader.releaseLock).toHaveBeenCalledOnce();
  });
  it('stops at the byte limit before buffering an oversized response', async () => {
    const { value, reader } = response([new Uint8Array(3), new Uint8Array(3), new Uint8Array(3)]);
    await expect(helpers.image('https://example.test/image', { fetchImpl: async () => value, maxBytes: 4 })).rejects.toThrow(/size limit/);
    expect(reader.read).toHaveBeenCalledTimes(2); expect(reader.cancel).toHaveBeenCalled();
  });
  it('rejects a declared oversize body before reading it', async () => {
    const { value, reader } = response([], { headers: { get: key => key === 'content-type' ? 'image/png' : '99' } });
    await expect(helpers.image('https://example.test/image', { fetchImpl: async () => value, maxBytes: 4 })).rejects.toThrow(/size limit/);
    expect(reader.read).not.toHaveBeenCalled();
  });
  it('does not read a late response after the transfer deadline', async () => {
    vi.useFakeTimers(); let deliver;
    const { value, reader } = response([new Uint8Array([1])]);
    const pending = helpers.image('https://example.test/image', { timeoutMs: 20, fetchImpl: () => new Promise(resolve => { deliver = resolve; }) });
    const rejected = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(21); await rejected;
    deliver(value); await Promise.resolve(); await Promise.resolve();
    expect(reader.read).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps the deadline active while a body stalls and releases the Builder lock', async () => {
    vi.useFakeTimers(); const { value, reader } = response([]); reader.read.mockImplementation(() => new Promise(() => {}));
    let zip;
    window.JSZip = class { constructor() { zip = this; this.files = {}; } file(name, bytes) { this.files[name] = bytes; return this; } async generateAsync() { return new Blob(['epub']); } };
    const env = environment(doc('<h1>Unit</h1><img src="https://example.test/stalled.png" alt="Diagram">'), {
      _builderFetchExportImage: url => helpers.image(url, { timeoutMs: 40, fetchImpl: async () => value }) });
    const pending = callback('const _imageManifest', env)();
    await vi.advanceTimersByTimeAsync(41); await pending;
    expect(reader.cancel).toHaveBeenCalled(); expect(env.finishAlternativeExport).toHaveBeenCalledOnce(); expect(env.downloadBuilderBlob).toHaveBeenCalledOnce();
    expect(zip.files['OEBPS/content.xhtml']).toContain('[Image: Diagram]'); expect(env.addToast).toHaveBeenCalledWith(expect.stringContaining('could not be packaged'), 'warning'); expect(vi.getTimerCount()).toBe(0);
  });
});
