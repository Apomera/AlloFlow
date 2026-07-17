/* Lumen local-document adapter. File bytes stay in the browser; only extracted text enters a project. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LumenDocuments = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var MAX_FILES_PER_IMPORT = 5;
  var MAX_EPUB_UNCOMPRESSED_BYTES = 60 * 1024 * 1024;
  var MIN_READABLE_CHARS = 40;
  var ACCEPT = '.pdf,.docx,.pptx,.xlsx,.xls,.xlsb,.ods,.txt,.md,.markdown,.csv,.epub';
  var FORMAT_LABELS = { pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint', xlsx: 'Spreadsheet', txt: 'Plain text', md: 'Markdown', csv: 'CSV', epub: 'EPUB' };
  var _pipeline = null;
  var _pipelinePromise = null;
  var _jsZipPromise = null;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
  }

  function hashString(value) {
    var str = String(value == null ? '' : value), h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  function formatFromName(name) {
    var match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    var ext = match ? match[1] : '';
    if (ext === 'markdown') return 'md';
    if (/^(xlsx|xls|xlsb|ods)$/.test(ext)) return 'xlsx';
    return /^(pdf|docx|pptx|txt|md|csv|epub)$/.test(ext) ? ext : '';
  }

  function formatLabel(format) { return FORMAT_LABELS[format] || String(format || '').toUpperCase(); }

  function validateFile(file) {
    if (!file || typeof file !== 'object') throw new Error('Choose a document to import.');
    var format = formatFromName(file.name);
    if (!format) throw new Error('“' + String(file.name || 'This file') + '” is not supported. Use PDF, DOCX, PPTX, XLSX, TXT, Markdown, CSV, or EPUB.');
    var size = Math.max(0, Number(file.size) || 0);
    if (size > MAX_FILE_BYTES) throw new Error('“' + file.name + '” is larger than Lumen’s 25 MB local-import limit. Split or compress it first.');
    return { format: format, size: size };
  }

  function bytesToBase64(buffer) {
    var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || new ArrayBuffer(0));
    var out = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(bytes.length, i + step)));
    if (typeof btoa === 'function') return btoa(out);
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    throw new Error('This browser cannot prepare binary documents for local extraction.');
  }

  async function ensurePipeline(options) {
    try { return pipelineFrom(options); } catch (firstError) {
      var host = (options && options.root) || root;
      var create = host && host.AlloModules && host.AlloModules.createDocPipeline;
      if (typeof create === 'function' || !host || !host.document) throw firstError;
      if (!_pipelinePromise) {
        _pipelinePromise = new Promise(function (resolve, reject) {
          var script = host.document.createElement('script');
          script.src = (options && options.docPipelineUrl) || 'doc_pipeline_module.js';
          script.async = true;
          script.onload = function () {
            try { resolve(pipelineFrom(options)); } catch (error) { _pipelinePromise = null; reject(error); }
          };
          script.onerror = function () { _pipelinePromise = null; reject(new Error('Could not load AlloFlow’s local document extractor. Check the network or content-security policy.')); };
          host.document.head.appendChild(script);
        });
      }
      return _pipelinePromise;
    }
  }

  async function readText(file) {
    if (file && typeof file.text === 'function') return clean(await file.text());
    if (file && typeof file.arrayBuffer === 'function') {
      var bytes = new Uint8Array(await file.arrayBuffer());
      if (typeof TextDecoder !== 'undefined') return clean(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
    }
    throw new Error('This browser could not read the selected text file.');
  }

  async function readBinary(file) {
    if (!file || typeof file.arrayBuffer !== 'function') throw new Error('This browser could not read the selected document.');
    return new Uint8Array(await file.arrayBuffer());
  }

  function pipelineFrom(options) {
    if (options && options.pipeline) return options.pipeline;
    if (_pipeline) return _pipeline;
    var host = (options && options.root) || root;
    var create = host && host.AlloModules && host.AlloModules.createDocPipeline;
    if (typeof create !== 'function') throw new Error('AlloFlow’s local document extractor is not loaded yet. Reload the workspace and try again.');
    _pipeline = create({
      state: {}, callGemini: null, callGeminiVision: null, callImagen: null,
      addToast: function () {}, t: function (_key, fallback) { return fallback || _key; },
      updateExportPreview: function () {}, getDefaultTitle: function () { return ''; }
    });
    return _pipeline;
  }

  function sectioned(parts, kind) {
    return (parts || []).map(function (part, index) {
      var number = part.number == null ? index + 1 : part.number;
      var label = part.label || (kind + ' ' + number);
      var text = clean(part.text);
      return text ? '# ' + label + '\n\n' + text : '';
    }).filter(Boolean).join('\n\n');
  }

  function htmlEntityDecode(value) {
    var named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return String(value || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (_all, code) {
      if (code.charAt(0) === '#') {
        var hex = code.charAt(1).toLowerCase() === 'x';
        var n = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : ' ';
      }
      return Object.prototype.hasOwnProperty.call(named, code.toLowerCase()) ? named[code.toLowerCase()] : ' ';
    });
  }

  function htmlToReadableText(html) {
    var value = String(html || '').replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
    value = value.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, function (_m, level, inner) { return '\n\n' + '#'.repeat(Number(level)) + ' ' + inner.replace(/<[^>]+>/g, ' ') + '\n\n'; });
    value = value.replace(/<li\b[^>]*>/gi, '\n- ').replace(/<\/(p|div|section|article|li|tr|blockquote)>/gi, '\n').replace(/<br\s*\/?\s*>/gi, '\n');
    return clean(htmlEntityDecode(value.replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n'));
  }

  function dirname(path) { var at = String(path || '').lastIndexOf('/'); return at < 0 ? '' : path.slice(0, at + 1); }
  function normalizeZipPath(path) {
    var out = [];
    String(path || '').split('/').forEach(function (part) { if (!part || part === '.') return; if (part === '..') out.pop(); else out.push(part); });
    return out.join('/');
  }

  async function ensureJsZip(options) {
    if (options && options.JSZip) return options.JSZip;
    var host = (options && options.root) || root;
    if (host && host.JSZip) return host.JSZip;
    if (!host || !host.document) throw new Error('EPUB import needs the local ZIP parser, which is unavailable in this environment.');
    if (_jsZipPromise) return _jsZipPromise;
    _jsZipPromise = new Promise(function (resolve, reject) {
      var script = host.document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.async = true; script.crossOrigin = 'anonymous';
      script.onload = function () { host.JSZip ? resolve(host.JSZip) : reject(new Error('ZIP parser did not initialize.')); };
      script.onerror = function () { _jsZipPromise = null; reject(new Error('Could not load the local EPUB parser. Check the network or content-security policy.')); };
      host.document.head.appendChild(script);
    });
    return _jsZipPromise;
  }

  async function extractEpub(bytes, options) {
    var JSZip = await ensureJsZip(options || {});
    var zip = await JSZip.loadAsync(bytes);
    var names = Object.keys(zip.files || {});
    var expanded = names.reduce(function (sum, name) {
      var entry = zip.files[name];
      return sum + Math.max(0, Number(entry && entry._data && entry._data.uncompressedSize) || 0);
    }, 0);
    if (expanded > MAX_EPUB_UNCOMPRESSED_BYTES) throw new Error('This EPUB expands beyond Lumen’s 60 MB safety limit.');
    var container = zip.file('META-INF/container.xml');
    if (!container) throw new Error('This EPUB is missing its package manifest.');
    var containerXml = await container.async('string');
    var rootMatch = containerXml.match(/full-path\s*=\s*["']([^"']+)["']/i);
    if (!rootMatch) throw new Error('This EPUB does not identify a readable package document.');
    var opfPath = normalizeZipPath(rootMatch[1]);
    var opfFile = zip.file(opfPath);
    if (!opfFile) throw new Error('This EPUB package document could not be read.');
    var opf = await opfFile.async('string'), manifest = {}, itemMatch;
    var itemRe = /<item\b([^>]+)>/gi;
    while ((itemMatch = itemRe.exec(opf))) {
      var attrs = itemMatch[1], id = (attrs.match(/\bid\s*=\s*["']([^"']+)["']/i) || [])[1], href = (attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1];
      var media = (attrs.match(/\bmedia-type\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
      if (id && href && /html|xhtml/i.test(media)) manifest[id] = normalizeZipPath(dirname(opfPath) + href.split('#')[0]);
    }
    var spine = [], refMatch, refRe = /<itemref\b[^>]*\bidref\s*=\s*["']([^"']+)["'][^>]*>/gi;
    while ((refMatch = refRe.exec(opf))) if (manifest[refMatch[1]]) spine.push(manifest[refMatch[1]]);
    if (!spine.length) spine = Object.keys(manifest).map(function (id) { return manifest[id]; });
    if (!spine.length) throw new Error('This EPUB has no readable chapters in its spine.');
    var parts = [];
    for (var i = 0; i < spine.length && i < 150; i++) {
      var chapter = zip.file(spine[i]);
      if (!chapter) continue;
      var html = await chapter.async('string');
      var titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i);
      var title = titleMatch ? clean(htmlEntityDecode(titleMatch[1].replace(/<[^>]+>/g, ' '))) : '';
      var text = htmlToReadableText(html);
      if (text) parts.push({ number: parts.length + 1, label: title ? ('Section ' + (parts.length + 1) + ': ' + title) : ('Section ' + (parts.length + 1)), text: text });
    }
    if (!parts.length) throw new Error('This EPUB did not contain readable chapter text.');
    return { text: sectioned(parts, 'Section'), partCount: parts.length, method: 'jszip-epub' };
  }

  function requireComplete(result, label) {
    if (!result || result.error || !clean(result.fullText || result.text)) throw new Error(label + ' extraction failed' + (result && result.error ? ': ' + result.error : '.'));
    if (Array.isArray(result.pageErrors) && result.pageErrors.length) throw new Error(label + ' extraction was incomplete because ' + result.pageErrors.length + ' page' + (result.pageErrors.length === 1 ? '' : 's') + ' could not be read. No partial source was added.');
    if (Number(result.truncatedRows) > 0) throw new Error(label + ' extraction would omit ' + result.truncatedRows + ' spreadsheet row(s). No partial source was added; split the workbook or increase the source preparation limit first.');
    return result;
  }

  async function extractLocalDocument(file, options) {
    options = options || {};
    var checked = validateFile(file), format = checked.format, content = '', method = 'browser-text', partCount = 1, rawIdentity = '';
    if (format === 'txt' || format === 'md' || format === 'csv') {
      content = await readText(file); rawIdentity = content;
    } else {
      var bytes = await readBinary(file); rawIdentity = bytesToBase64(bytes);
      if (format === 'epub') {
        var epub = await extractEpub(bytes, options); content = epub.text; method = epub.method; partCount = epub.partCount;
      } else {
        var pipeline = await ensurePipeline(options), result;
        if (format === 'pdf') {
          result = await pipeline.extractPdfTextDeterministic(rawIdentity);
          if (result && result.isScanned && clean(result.fullText).length < MIN_READABLE_CHARS) throw new Error('This PDF appears scanned and has no usable text layer. Run OCR in AlloFlow’s PDF workspace, then import the resulting text or PDF.');
          result = requireComplete(result, 'PDF');
          content = Array.isArray(result.pages) && result.pages.length ? sectioned(result.pages.map(function (page) { return { number: page.pageNum, label: 'Page ' + page.pageNum, text: page.text }; }), 'Page') : clean(result.fullText);
          method = result.method || 'pdf-text-layer'; partCount = Number(result.pageCount) || (result.pages || []).length || 1;
        } else if (format === 'docx') {
          result = requireComplete(await pipeline.extractDocxTextDeterministic(rawIdentity), 'Word'); content = clean(result.fullText); method = result.method || 'docx';
        } else if (format === 'pptx') {
          result = requireComplete(await pipeline.extractPptxTextDeterministic(rawIdentity), 'PowerPoint');
          content = Array.isArray(result.slides) && result.slides.length ? sectioned(result.slides.map(function (slide) {
            var body = clean(slide.text), notes = clean(slide.notesText); if (notes) body += (body ? '\n\n' : '') + '[Speaker notes]\n' + notes;
            return { number: slide.slideNum, label: 'Slide ' + slide.slideNum, text: body };
          }), 'Slide') : clean(result.fullText);
          method = result.method || 'pptx'; partCount = Number(result.slideCount) || (result.slides || []).length || 1;
        } else {
          result = requireComplete(await pipeline.convertXlsxToMarkdownTables(rawIdentity, { maxRowsPerSheet: 2000 }), 'Spreadsheet'); content = clean(result.text); method = 'sheetjs'; partCount = Number(result.sheets) || 1;
        }
      }
    }
    content = clean(content);
    if (content.length < MIN_READABLE_CHARS) throw new Error('“' + file.name + '” did not contain enough readable text to add as evidence.');
    if (content.length > 600000) throw new Error('“' + file.name + '” produced more than Lumen’s 600,000-character source limit. Split it into smaller documents first.');
    var name = clean(file.name).replace(/\s+/g, ' ').slice(0, 240) || ('Untitled ' + formatLabel(format) + ' file');
    return {
      id: 'src_file_' + hashString(name.toLowerCase()), stableKey: 'local-file|' + name.toLowerCase(),
      title: name, locator: 'Local file · ' + name, type: format, content: content,
      importMethod: 'local-file', fileName: name, fileFormat: format, fileSize: checked.size,
      fileLastModified: Number(file.lastModified) > 0 ? Number(file.lastModified) : null,
      fileContentHash: hashString(rawIdentity), extractionMethod: method, documentPartCount: Math.max(1, Number(partCount) || 1)
    };
  }

  return Object.freeze({
    MAX_FILE_BYTES: MAX_FILE_BYTES, MAX_FILES_PER_IMPORT: MAX_FILES_PER_IMPORT, ACCEPT: ACCEPT,
    formatFromName: formatFromName, formatLabel: formatLabel, validateFile: validateFile,
    bytesToBase64: bytesToBase64, htmlToReadableText: htmlToReadableText, sectioned: sectioned,
    requireComplete: requireComplete, ensurePipeline: ensurePipeline, extractEpub: extractEpub, extractLocalDocument: extractLocalDocument
  });
});
