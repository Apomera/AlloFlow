import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import * as DocumentsMod from '../stem_lab/stem_lumen_documents.js';
import { loadAlloModule } from './setup.js';

const Documents = DocumentsMod.default || DocumentsMod;
let Adapter, createPipeline;
beforeAll(() => {
  loadAlloModule('maine_sld_state_documents.js');
  loadAlloModule('doc_pipeline_module.js');
  Adapter = window.AlloSldStateDocuments;
  createPipeline = window.AlloModules.createDocPipeline;
});

function textFile(name, content, extra = {}) {
  const bytes = new TextEncoder().encode(content);
  return { name, size: bytes.length, lastModified: 1721174400000,
    text: async () => content, arrayBuffer: async () => bytes.buffer.slice(0), ...extra };
}
function binaryFile(name) {
  return { name, size: 5, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4, 5]).buffer };
}
const passage = 'Requirements must be reviewed against current state rules, official sources, and effective dates.';
function binaryHost(result, kind = 'pdf') {
  const pipeline = {
    extractPdfTextDeterministic: vi.fn(async () => result),
    extractDocxTextDeterministic: vi.fn(async () => result)
  };
  const factory = vi.fn(() => pipeline);
  factory.supportsSourceTelemetryIsolation = true;
  const host = { LumenDocuments: Documents, __alloEnsureDocPipeline: vi.fn(async () => factory) };
  return { host, factory, pipeline, file: binaryFile(kind === 'pdf' ? 'requirements.pdf' : 'requirements.docx') };
}

describe('state-reference documents reuse the local importer', () => {
  it('imports native text with existing provenance and never requests an AI or binary parser', async () => {
    const host = { LumenDocuments: Documents, __alloEnsureDocPipeline: vi.fn(), callGemini: vi.fn() };
    const source = await Adapter.extract(textFile('requirements.md', '# State rule\n\n' + passage), { root: host });
    expect(source).toMatchObject({ title: 'requirements.md', content: '# State rule\n\n' + passage,
      importMethod: 'local-file', locator: 'Local file · requirements.md', extractionMethod: 'browser-text' });
    expect(host.__alloEnsureDocPipeline).not.toHaveBeenCalled();
    expect(host.callGemini).not.toHaveBeenCalled();
  });

  it('preserves PDF page locators and constructs an isolated parser with all AI transports absent', async () => {
    const setup = binaryHost({ fullText: passage, pageCount: 1, pageErrors: [], isScanned: false,
      pages: [{ pageNum: 1, text: passage }] });
    const source = await Adapter.extract(setup.file, { root: setup.host });
    expect(source.content).toBe('# Page 1\n\n' + passage);
    expect(source.documentPartCount).toBe(1);
    expect(setup.factory).toHaveBeenCalledWith(expect.objectContaining({ state: {}, publishSourceTelemetry: false,
      callGemini: null, callGeminiVision: null, callImagen: null }));
    expect(setup.pipeline.extractPdfTextDeterministic).toHaveBeenCalledTimes(1);
  });

  it('retains DOCX extraction method and literal document text for review', async () => {
    const content = '# State criteria\n\n' + passage + '\n<img onerror="doNotExecute()">';
    const setup = binaryHost({ fullText: content, sourceCharCount: content.length, method: 'mammoth-html' }, 'docx');
    const source = await Adapter.extract(setup.file, { root: setup.host });
    expect(source.content).toBe(content);
    expect(source.extractionMethod).toBe('mammoth-html');
    expect(setup.pipeline.extractDocxTextDeterministic).toHaveBeenCalledTimes(1);
  });

  it('keeps the existing refusal for partial PDF extraction and scans without readable text', async () => {
    const partial = binaryHost({ fullText: passage, pageCount: 2, pageErrors: [{ pageNum: 2, error: 'damaged' }] });
    await expect(Adapter.extract(partial.file, { root: partial.host })).rejects.toThrow(/No partial source was added/);
    const scan = binaryHost({ fullText: '', pageCount: 2, pages: [], isScanned: true });
    await expect(Adapter.extract(scan.file, { root: scan.host })).rejects.toThrow(/scanned.*OCR/);
  });

  it('rejects unsupported or oversized files before loading document code', async () => {
    const host = { __alloEnsureStemPluginLoaded: vi.fn() };
    await expect(Adapter.extract(textFile('rules.html', passage), { root: host })).rejects.toThrow(/PDF, DOCX, TXT/);
    await expect(Adapter.extract(textFile('rules.pdf', passage, { size: Adapter.MAX_FILE_BYTES + 1 }), { root: host }))
      .rejects.toThrow(/25 MB/);
    expect(host.__alloEnsureStemPluginLoaded).not.toHaveBeenCalled();
  });

  it('waits for only the targeted facade and reports a failed adapter load without reading a file', async () => {
    let finish;
    const file = textFile('rules.txt', passage);
    file.text = vi.fn(file.text);
    const host = { __alloStemPluginStates: {}, __alloEnsureStemPluginLoaded: vi.fn(path => {
      host.__alloStemPluginStates[path] = { promise: new Promise(resolve => { finish = resolve; }) };
      return true;
    }) };
    const pending = Adapter.extract(file, { root: host });
    expect(host.__alloEnsureStemPluginLoaded).toHaveBeenCalledWith('stem_lab/stem_lumen_documents.js');
    expect(file.text).not.toHaveBeenCalled();
    finish({ status: 'error' });
    await expect(pending).rejects.toThrow(/adapter could not finish loading/);
    expect(file.text).not.toHaveBeenCalled();
  });

  it('retries a failed targeted facade load and preserves the actual importer result object', async () => {
    const result = { content: passage, title: 'rules.txt', importMethod: 'local-file' };
    const facade = { extractLocalDocument: vi.fn(async () => result) };
    const host = { __alloStemPluginStates: {}, __alloGetStemPluginState: () => ({ status: 'error' }),
      __alloEnsureStemPluginLoaded: vi.fn(), __alloRetryStemPlugin: vi.fn(path => {
        host.__alloStemPluginStates[path] = { promise: Promise.resolve().then(() => { host.LumenDocuments = facade; }) };
        return true;
      }) };
    expect(await Adapter.extract(textFile('rules.txt', passage), { root: host })).toBe(result);
    expect(host.__alloRetryStemPlugin).toHaveBeenCalledWith('stem_lab/stem_lumen_documents.js');
    expect(host.__alloEnsureStemPluginLoaded).not.toHaveBeenCalled();
  });

  it('refuses an older binary parser before it can publish another workspace’s telemetry', async () => {
    const setup = binaryHost({ fullText: passage });
    delete setup.factory.supportsSourceTelemetryIsolation;
    await expect(Adapter.extract(setup.file, { root: setup.host })).rejects.toThrow(/updated local document extractor/);
    expect(setup.factory).not.toHaveBeenCalled();
    expect(setup.pipeline.extractPdfTextDeterministic).not.toHaveBeenCalled();
  });

  it('reuses only the current factory for each root and creates a fresh isolated parser after factory replacement', async () => {
    const setup = binaryHost({ fullText: passage, pageCount: 1 });
    await Adapter.extract(setup.file, { root: setup.host });
    await Adapter.extract(setup.file, { root: setup.host });
    expect(setup.factory).toHaveBeenCalledTimes(1);
    const next = vi.fn(() => setup.pipeline);
    next.supportsSourceTelemetryIsolation = true;
    setup.host.__alloEnsureDocPipeline.mockResolvedValue(next);
    await Adapter.extract(setup.file, { root: setup.host });
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('standalone PDF extraction leaves concurrent remediation source telemetry alone', () => {
  const originals = {};
  const keys = ['pdfjsLib', '__alloGetVerifiedRuntimeAsset', '__alloSourceLinkCount', '__alloSourceFormFields', '__alloSourceLinks'];
  afterEach(() => {
    for (const key of keys) {
      if (originals[key] && originals[key].present) window[key] = originals[key].value;
      else delete window[key];
    }
  });

  function preparePdf() {
    for (const key of keys) originals[key] = { present: Object.prototype.hasOwnProperty.call(window, key), value: window[key] };
    const page = {
      getAnnotations: vi.fn(async () => [
        { subtype: 'Link', url: 'https://example.gov/state/rule', rect: [0, 0, 500, 20] },
        { subtype: 'Widget', fieldType: 'Tx', fieldName: 'evidence', alternativeText: 'Evidence' }
      ]),
      getTextContent: vi.fn(async () => ({ items: [{ str: passage, transform: [1, 0, 0, 12, 0, 0], width: 450, height: 12 }] }))
    };
    const pdf = { numPages: 1, getPage: vi.fn(async () => page), destroy: vi.fn() };
    window.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: vi.fn(() => ({ promise: Promise.resolve(pdf) })) };
    // This seam tests source telemetry with a fake parser, but still supplies
    // the host's required worker lease rather than relying on an ambient URL.
    window.__alloGetVerifiedRuntimeAsset = vi.fn(async (graph, binding) => {
      expect([graph, binding]).toEqual(['pdfjs', 'worker']);
      return { url: 'blob:http://localhost/reviewed-pdf-worker', revoke: vi.fn() };
    });
    window.__alloSourceLinkCount = 9;
    const fields = { fields: 7, widgets: 7, withAccessibleName: 7 };
    const links = [{ text: 'Existing source', url: 'https://example.gov/existing' }];
    window.__alloSourceFormFields = fields;
    window.__alloSourceLinks = links;
    return { pdf, fields, links };
  }
  const deps = { state: {}, callGemini: null, callGeminiVision: null, callImagen: null,
    addToast() {}, t: key => key, updateExportPreview() {}, getDefaultTitle: () => '' };

  it('extracts the same text without replacing any shared telemetry when explicitly isolated', async () => {
    const setup = preparePdf();
    const result = await createPipeline({ ...deps, publishSourceTelemetry: false })
      .extractPdfTextDeterministic(new Uint8Array([1, 2, 3, 4, 5]));
    expect(result.fullText).toBe(passage);
    expect(result.pageErrors).toEqual([]);
    expect(window.__alloGetVerifiedRuntimeAsset).toHaveBeenCalledWith('pdfjs', 'worker');
    expect(window.pdfjsLib.getDocument).toHaveBeenCalledWith(expect.objectContaining({ isEvalSupported: false }));
    expect(window.__alloSourceLinkCount).toBe(9);
    expect(window.__alloSourceFormFields).toBe(setup.fields);
    expect(window.__alloSourceLinks).toBe(setup.links);
    expect(setup.pdf.destroy).toHaveBeenCalledTimes(1);
  });

  it('preserves the default pipeline’s source-link and form fidelity publication', async () => {
    const setup = preparePdf();
    const result = await createPipeline(deps).extractPdfTextDeterministic(new Uint8Array([1, 2, 3, 4, 5]));
    expect(result.fullText).toBe(passage);
    expect(window.__alloSourceLinkCount).toBe(1);
    expect(window.__alloSourceFormFields).toEqual({ fields: 1, widgets: 1, withAccessibleName: 1 });
    expect(window.__alloSourceLinks).toEqual([{ text: passage, url: 'https://example.gov/state/rule', occurrences: 1 }]);
    expect(setup.pdf.destroy).toHaveBeenCalledTimes(1);
  });
});
