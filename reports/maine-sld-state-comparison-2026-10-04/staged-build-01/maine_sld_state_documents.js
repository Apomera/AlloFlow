/* State-reference documents reuse AlloFlow's local Lumen import adapter. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AlloSldStateDocuments = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (defaultRoot) {
  'use strict';

  var DOCUMENT_MODULE = 'stem_lab/stem_lumen_documents.js';
  var ACCEPT = '.pdf,.docx,.txt,.md,.markdown';
  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var contexts = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function hostFor(options) {
    var host = options && options.root || defaultRoot;
    if (!host || typeof host !== 'object') throw new Error('The local document workspace is unavailable.');
    return host;
  }

  async function ensureDocuments(host) {
    if (host.LumenDocuments && typeof host.LumenDocuments.extractLocalDocument === 'function') return host.LumenDocuments;
    var prior = host.__alloGetStemPluginState && host.__alloGetStemPluginState(DOCUMENT_MODULE);
    var loader = prior && prior.status === 'error' ? host.__alloRetryStemPlugin : host.__alloEnsureStemPluginLoaded;
    if (typeof loader !== 'function' || loader(DOCUMENT_MODULE) === false) {
      throw new Error('AlloFlow’s local document adapter is unavailable. Reload the app and try again.');
    }
    var entry = host.__alloStemPluginStates && host.__alloStemPluginStates[DOCUMENT_MODULE];
    if (entry && entry.promise) await entry.promise;
    var documents = host.LumenDocuments;
    if (!documents || typeof documents.extractLocalDocument !== 'function') {
      throw new Error('The local document adapter could not finish loading. Check the connection, then try importing again.');
    }
    return documents;
  }

  async function isolatedPipeline(host) {
    if (typeof host.__alloEnsureDocPipeline !== 'function') {
      throw new Error('AlloFlow’s local PDF and Word extractor is unavailable. Reload the app and try again.');
    }
    var factory = await host.__alloEnsureDocPipeline();
    if (typeof factory !== 'function' || factory.supportsSourceTelemetryIsolation !== true) {
      throw new Error('Reload the app to use the updated local document extractor. Your existing reference work is unchanged.');
    }
    var context = contexts && contexts.get(host);
    if (context && context.factory === factory) return context.pipeline;
    var pipeline = factory({
      state: {}, publishSourceTelemetry: false,
      callGemini: null, callGeminiVision: null, callImagen: null,
      addToast: function () {}, t: function (key, fallback) { return fallback || key; },
      updateExportPreview: function () {}, getDefaultTitle: function () { return ''; }
    });
    if (!pipeline || typeof pipeline.extractPdfTextDeterministic !== 'function' || typeof pipeline.extractDocxTextDeterministic !== 'function') {
      throw new Error('The local document extractor did not become ready. Reload the app and try again.');
    }
    if (contexts) contexts.set(host, { factory: factory, pipeline: pipeline });
    return pipeline;
  }

  async function extract(file, options) {
    var host = hostFor(options), name = String(file && file.name || '');
    var match = name.toLowerCase().match(/\.(pdf|docx|txt|md|markdown)$/);
    if (!file || !match) throw new Error('Choose a PDF, DOCX, TXT, or Markdown requirements document.');
    if (Number(file.size) > MAX_FILE_BYTES) throw new Error('The requirements document exceeds the 25 MB local-import limit. Split it into smaller sections first.');
    var documents = await ensureDocuments(host);
    var binary = match[1] === 'pdf' || match[1] === 'docx';
    var pipeline = binary ? await isolatedPipeline(host) : null;
    // The facade returns normalized text and provenance. File bytes, reading order,
    // page-error refusals and limits remain owned by the existing local importer.
    // Cancellation/publication belongs to the requesting component; no global
    // document-intake operation or other workspace is invalidated here.
    return documents.extractLocalDocument(file, { root: host, pipeline: pipeline });
  }

  return Object.freeze({ ACCEPT: ACCEPT, MAX_FILE_BYTES: MAX_FILE_BYTES, extract: extract });
});
