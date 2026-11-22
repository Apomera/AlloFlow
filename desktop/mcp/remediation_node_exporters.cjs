'use strict';
/**
 * Zero-Chromium Node fast path for deterministic MCP document exports.
 *
 * Executes the real shipped view_pdf_audit_module.js (the exact same bytes the
 * browser app and Chromium path run) inside a sandboxed vm.Context backed by
 * jsdom, with zero network egress and zero Chromium launch overhead.
 *
 * Supported formats:
 *   - Alt formats (exportAltFormatNode): epub, daisy, brf / braille
 *   - Accessible Office (exportAccessibleOfficeNode): docx, odt
 *     (pptx requires the external PptxGenJS library and returns { supported: false })
 *
 * If jsdom is unavailable, the caller explicitly opts out, or a DOM operation
 * fails with an unsupported-DOM error, this module returns { supported: false, reason }
 * so remediation_headless_driver.cjs falls back transparently to Chromium.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { zipFileMap } = require('./zip_writer.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXPORT_MODULE = 'view_pdf_audit_module.js';
const ALT_FORMATS = Object.freeze({ epub: 'epub', daisy: 'daisy', brf: 'brf', braille: 'brf' });
const OFFICE_FORMATS = Object.freeze({ docx: 'docx', odt: 'odt' });

function defaultAssetsRoot() {
  if (process.env.ALLOFLOW_MCP_ASSETS_DIR) return path.resolve(process.env.ALLOFLOW_MCP_ASSETS_DIR);
  if (fs.existsSync(path.join(REPO_ROOT, EXPORT_MODULE))) return REPO_ROOT;
  return path.resolve(__dirname, '..', 'assets');
}

function defaultLoadJsdom() {
  try {
    return require('jsdom');
  } catch (_) {
    return null;
  }
}

function encodeBase64Binary(str) {
  return Buffer.from(String(str == null ? '' : str), 'latin1').toString('base64');
}

function decodeBase64Binary(b64) {
  return Buffer.from(String(b64 == null ? '' : b64).replace(/\s+/g, ''), 'base64').toString('latin1');
}

function runOfflineZip({ entries, storeFirst }) {
  const fileMap = {};
  for (const entry of (entries || [])) {
    if (!entry || typeof entry.name !== 'string') continue;
    fileMap[entry.name] = entry.isBase64
      ? Buffer.from(String(entry.data || ''), 'base64')
      : String(entry.data || '');
  }
  return zipFileMap(fileMap, storeFirst || undefined).toString('base64');
}

// Minimal inert React/ReactDOM surface: view_pdf_audit_module.js destructures hooks at IIFE
// top-level, while AltFormatExports and AccessibleOfficeExport are pure DOM/string/ZIP builders.
const OFFLINE_REACT_STUB = [
  'window.React = window.React || {',
  '  useState: function (v) { return [typeof v === "function" ? v() : v, function () {}]; },',
  '  useEffect: function () {},',
  '  useRef: function (v) { return { current: v }; },',
  '  useMemo: function (fn) { return fn(); },',
  '  useCallback: function (fn) { return fn; },',
  '  useContext: function () { return null; },',
  '  Fragment: Symbol("Fragment"),',
  '  createElement: function () { return null; },',
  '};',
  'window.ReactDOM = window.ReactDOM || {};',
].join('\n');

// Offline JSZip shim backed directly by desktop/mcp/zip_writer.cjs.
const OFFLINE_JSZIP_SHIM = [
  'window.JSZip = function OfflineJSZip() {',
  '  this._entries = [];',
  '  this._storeFirst = null;',
  '};',
  'window.JSZip.prototype.file = function (name, data, opts) {',
  '  var o = opts || {};',
  '  var entryName = String(name);',
  '  if (o.compression === "STORE" && !this._storeFirst) this._storeFirst = entryName;',
  '  var isBase64 = o.base64 === true;',
  '  var payload;',
  '  if (isBase64) {',
  '    payload = String(data || "");',
  '  } else if (data instanceof Uint8Array || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {',
  '    var bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);',
  '    var s = "";',
  '    for (var i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));',
  '    payload = btoa(s);',
  '    isBase64 = true;',
  '  } else {',
  '    payload = String(data == null ? "" : data);',
  '  }',
  '  this._entries.push({ name: entryName, data: payload, isBase64: isBase64 });',
  '  return this;',
  '};',
  'window.JSZip.prototype.generateAsync = async function (opts) {',
  '  var o = opts || {};',
  '  var b64 = await window.__alloOfflineZip({ entries: this._entries, storeFirst: this._storeFirst });',
  '  if (o.type === "base64") return b64;',
  '  var bin = atob(b64);',
  '  var out = new Uint8Array(bin.length);',
  '  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);',
  '  if (o.type === "uint8array") return out;',
  '  return new Blob([out], { type: o.mimeType || "application/zip" });',
  '};',
].join('\n');

// Offline OOXML DOCX builder shim matching remediation_headless_driver.cjs's OFFLINE_DOCX_SHIM.
const OFFLINE_DOCX_SHIM = '(' + function () {
  function xmlEsc(v) {
    return String(v == null ? '' : v)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function bytesToB64(data) {
    var bytes = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : (ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(0));
    var s = '';
    for (var i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return { b64: btoa(s), bytes: bytes };
  }
  function sniffImageType(bytes) {
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { ext: 'png', mime: 'image/png' };
    }
    if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { ext: 'jpeg', mime: 'image/jpeg' };
    }
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return { ext: 'gif', mime: 'image/gif' };
    }
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return { ext: 'webp', mime: 'image/webp' };
    }
    return { ext: 'png', mime: 'image/png' };
  }
  function TextRun(opts) { this._kind = 'text'; this.opts = opts || {}; }
  function ExternalHyperlink(opts) { this._kind = 'hyperlink'; this.opts = opts || {}; }
  function ImageRun(opts) { this._kind = 'image'; this.opts = opts || {}; }
  function FootnoteReferenceRun(id) { this._kind = 'footnoteRef'; this.id = id; }
  function PageBreak() { this._kind = 'pageBreak'; }
  function Paragraph(opts) { this._kind = 'paragraph'; this.opts = opts || {}; }
  function Table(opts) { this._kind = 'table'; this.opts = opts || {}; }
  function TableRow(opts) { this._kind = 'tableRow'; this.opts = opts || {}; }
  function TableCell(opts) { this._kind = 'tableCell'; this.opts = opts || {}; }
  function Document(opts) { this._kind = 'document'; this.opts = opts || {}; }
  var ImportedXmlComponent = {
    fromXmlString: function (xml) { return { _kind: 'rawXml', xml: String(xml || '') }; },
  };

  function buildDocxEntries(docObj) {
    var opts = (docObj && docObj.opts) || {};
    var docLang = (opts.styles && opts.styles.default && opts.styles.default.document && opts.styles.default.document.run && opts.styles.default.document.run.language && opts.styles.default.document.run.language.value) || 'en';
    var title = String(opts.title || 'AlloFlow Document');
    var creator = String(opts.creator || 'AlloFlow');
    var rels = [
      { id: 'rId1', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', target: 'styles.xml' },
      { id: 'rId2', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering', target: 'numbering.xml' },
    ];
    var nextRelId = 3;
    var footnoteRels = [];
    var nextFootnoteRelId = 1;
    var activeRelSink = {
      add: function (rel) {
        var id = 'rId' + (nextRelId++);
        rels.push(Object.assign({ id: id }, rel));
        return id;
      },
    };
    var hasFootnotes = !!(opts.footnotes && Object.keys(opts.footnotes).length);
    if (hasFootnotes) {
      rels.push({ id: 'rId' + (nextRelId++), type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes', target: 'footnotes.xml' });
    }
    var mediaEntries = [];
    var mediaExts = {};
    var nextImgId = 1;
    var numRefToId = Object.create(null);
    var numConfigs = (opts.numbering && Array.isArray(opts.numbering.config)) ? opts.numbering.config : [];
    for (var ni = 0; ni < numConfigs.length; ni++) {
      if (numConfigs[ni] && numConfigs[ni].reference) numRefToId[numConfigs[ni].reference] = ni + 2;
    }

    function renderInline(item) {
      if (!item) return '';
      if (item._kind === 'rawXml') return item.xml;
      if (item._kind === 'pageBreak') return '<w:r><w:br w:type="page"/></w:r>';
      if (item._kind === 'footnoteRef') {
        return '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="' + xmlEsc(item.id) + '"/></w:r>';
      }
      if (item._kind === 'hyperlink') {
        var hLink = String((item.opts && item.opts.link) || '');
        var hKids = Array.isArray(item.opts && item.opts.children) ? item.opts.children.map(renderInline).join('') : '';
        if (!hLink) return hKids;
        var rId = activeRelSink.add({ type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', target: hLink, external: true });
        return '<w:hyperlink r:id="' + rId + '" w:history="1">' + hKids + '</w:hyperlink>';
      }
      if (item._kind === 'image') {
        var io = item.opts || {};
        var enc = bytesToB64(io.data);
        var info = sniffImageType(enc.bytes);
        var imgIdx = nextImgId++;
        var target = 'media/image' + imgIdx + '.' + info.ext;
        mediaEntries.push({ name: 'word/' + target, data: enc.b64, isBase64: true });
        mediaExts[info.ext] = info.mime;
        var imgRelId = activeRelSink.add({ type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', target: target });
        var wPx = Math.max(1, Math.round((io.transformation && io.transformation.width) || 120));
        var hPx = Math.max(1, Math.round((io.transformation && io.transformation.height) || 90));
        var cx = wPx * 9525;
        var cy = hPx * 9525;
        var alt = io.altText || {};
        var altName = xmlEsc(alt.name != null && alt.name !== '' ? alt.name : 'image' + imgIdx);
        var altDesc = xmlEsc(alt.description != null ? alt.description : (alt.title != null ? alt.title : 'Image'));
        var altTitle = xmlEsc(alt.title != null ? alt.title : (alt.description != null ? alt.description : 'Image'));
        return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
          + '<wp:extent cx="' + cx + '" cy="' + cy + '"/>'
          + '<wp:docPr id="' + imgIdx + '" name="' + altName + '" descr="' + altDesc + '" title="' + altTitle + '"/>'
          + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
          + '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
          + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
          + '<pic:nvPicPr><pic:cNvPr id="' + imgIdx + '" name="' + altName + '" descr="' + altDesc + '"/><pic:cNvPicPr/></pic:nvPicPr>'
          + '<pic:blipFill><a:blip r:embed="' + imgRelId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
          + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
          + '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
      }
      if (item._kind === 'text') {
        var o = item.opts || {};
        if (o.break) return '<w:r><w:br/></w:r>';
        var rPr = [];
        if (o.style) rPr.push('<w:rStyle w:val="' + xmlEsc(o.style) + '"/>');
        if (o.font) rPr.push('<w:rFonts w:ascii="' + xmlEsc(o.font) + '" w:hAnsi="' + xmlEsc(o.font) + '"/>');
        if (o.bold) rPr.push('<w:b/>');
        if (o.italics) rPr.push('<w:i/>');
        if (o.strike) rPr.push('<w:strike/>');
        if (o.underline) rPr.push('<w:u w:val="single"/>');
        if (o.highlight) rPr.push('<w:highlight w:val="' + xmlEsc(o.highlight) + '"/>');
        if (o.size) rPr.push('<w:sz w:val="' + xmlEsc(o.size) + '"/><w:szCs w:val="' + xmlEsc(o.size) + '"/>');
        if (o.superScript) rPr.push('<w:vertAlign w:val="superscript"/>');
        else if (o.subScript) rPr.push('<w:vertAlign w:val="subscript"/>');
        if (o.rightToLeft) rPr.push('<w:rtl/>');
        if (o.language && o.language.value) rPr.push('<w:lang w:val="' + xmlEsc(o.language.value) + '"/>');
        return '<w:r>' + (rPr.length ? '<w:rPr>' + rPr.join('') + '</w:rPr>' : '')
          + '<w:t xml:space="preserve">' + xmlEsc(o.text == null ? '' : o.text) + '</w:t></w:r>';
      }
      return '';
    }

    function renderParagraph(p) {
      var o = (p && p.opts) || {};
      var pPr = [];
      if (o.heading) pPr.push('<w:pStyle w:val="' + xmlEsc(o.heading) + '"/>');
      if (o.bullet) {
        pPr.push('<w:numPr><w:ilvl w:val="' + Math.max(0, Number(o.bullet.level || 0)) + '"/><w:numId w:val="1"/></w:numPr>');
      } else if (o.numbering && o.numbering.reference) {
        var numId = numRefToId[o.numbering.reference] || 2;
        pPr.push('<w:numPr><w:ilvl w:val="' + Math.max(0, Number(o.numbering.level || 0)) + '"/><w:numId w:val="' + numId + '"/></w:numPr>');
      }
      if (o.bidirectional) pPr.push('<w:bidi/>');
      if (o.indent) {
        var indAttrs = [];
        if (o.indent.left) indAttrs.push('w:left="' + Number(o.indent.left) + '"');
        if (o.indent.hanging) indAttrs.push('w:hanging="' + Number(o.indent.hanging) + '"');
        if (indAttrs.length) pPr.push('<w:ind ' + indAttrs.join(' ') + '/>');
      }
      if (o.alignment) pPr.push('<w:jc w:val="' + xmlEsc(o.alignment) + '"/>');
      var kids = Array.isArray(o.children) ? o.children.map(renderInline).join('') : '';
      return '<w:p>' + (pPr.length ? '<w:pPr>' + pPr.join('') + '</w:pPr>' : '') + kids + '</w:p>';
    }

    function renderTable(t) {
      var o = (t && t.opts) || {};
      var rows = Array.isArray(o.rows) ? o.rows : [];
      var activeRowSpans = [];
      var maxCols = 0;
      var rowsXml = rows.map(function (row) {
        var ro = (row && row.opts) || {};
        var trPr = [];
        if (ro.cantSplit) trPr.push('<w:cantSplit/>');
        if (ro.tableHeader) trPr.push('<w:tblHeader/>');
        var cells = Array.isArray(ro.children) ? ro.children : [];
        var cellsXml = [];
        var col = 0;
        function emitCovered() {
          while (activeRowSpans[col] && activeRowSpans[col].remaining > 0) {
            var span = activeRowSpans[col];
            cellsXml.push('<w:tc><w:tcPr>' + (span.colSpan > 1 ? '<w:gridSpan w:val="' + span.colSpan + '"/>' : '') + '<w:vMerge/></w:tcPr><w:p/></w:tc>');
            span.remaining -= 1;
            col += span.colSpan;
          }
        }
        for (var ci = 0; ci < cells.length; ci++) {
          emitCovered();
          var co = (cells[ci] && cells[ci].opts) || {};
          var cSpan = Math.min(256, Math.max(1, Math.trunc(Number(co.columnSpan) || 1)));
          var rSpan = Math.min(1000, Math.max(1, Math.trunc(Number(co.rowSpan) || 1)));
          var tcPr = [];
          if (cSpan > 1) tcPr.push('<w:gridSpan w:val="' + cSpan + '"/>');
          if (rSpan > 1) {
            tcPr.push('<w:vMerge w:val="restart"/>');
            activeRowSpans[col] = { remaining: rSpan - 1, colSpan: cSpan };
          }
          var bodyXml = Array.isArray(co.children) && co.children.length
            ? co.children.map(renderBlock).join('')
            : '<w:p/>';
          cellsXml.push('<w:tc>' + (tcPr.length ? '<w:tcPr>' + tcPr.join('') + '</w:tcPr>' : '') + bodyXml + '</w:tc>');
          col += cSpan;
        }
        emitCovered();
        if (col > maxCols) maxCols = col;
        return '<w:tr>' + (trPr.length ? '<w:trPr>' + trPr.join('') + '</w:trPr>' : '') + cellsXml.join('') + '</w:tr>';
      }).join('');
      var safeMaxCols = Math.min(256, Math.max(1, maxCols));
      var gridColW = Math.max(720, Math.floor(9360 / safeMaxCols));
      var tblGridXml = '<w:tblGrid>' + Array.from({ length: safeMaxCols }, function () {
        return '<w:gridCol w:w="' + gridColW + '"/>';
      }).join('') + '</w:tblGrid>';
      return '<w:tbl><w:tblPr><w:tblStyle w:val="' + xmlEsc(o.style || 'TableGrid') + '"/>'
        + '<w:tblW w:w="5000" w:type="pct"/>'
        + (o.visuallyRightToLeft ? '<w:bidiVisual/>' : '')
        + '</w:tblPr>' + tblGridXml + rowsXml + '</w:tbl>';
    }

    function renderBlock(block) {
      if (!block) return '';
      if (block._kind === 'paragraph') return renderParagraph(block);
      if (block._kind === 'table') return renderTable(block);
      return '';
    }

    var sections = Array.isArray(opts.sections) ? opts.sections : [];
    var bodyParts = [];
    for (var si = 0; si < sections.length; si++) {
      var sec = sections[si] || {};
      var secChildren = Array.isArray(sec.children) ? sec.children : [];
      for (var bi = 0; bi < secChildren.length; bi++) bodyParts.push(renderBlock(secChildren[bi]));
    }
    if (!bodyParts.length) bodyParts.push('<w:p><w:r><w:t> </w:t></w:r></w:p>');

    var documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
      + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
      + '<w:body>' + bodyParts.join('') + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';

    var headingStyles = [1, 2, 3, 4, 5, 6].map(function (lvl) {
      var sz = [36, 30, 26, 24, 22, 20][lvl - 1];
      return '<w:style w:type="paragraph" w:styleId="Heading' + lvl + '">'
        + '<w:name w:val="heading ' + lvl + '"/>'
        + '<w:basedOn w:val="Normal"/><w:qFormat/>'
        + '<w:pPr><w:keepNext/><w:outlineLvl w:val="' + (lvl - 1) + '"/></w:pPr>'
        + '<w:rPr><w:b/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr></w:style>';
    }).join('');
    var stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
      + '<w:docDefaults><w:rPrDefault><w:rPr><w:lang w:val="' + xmlEsc(docLang) + '"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>'
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
      + headingStyles
      + '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'
      + '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>'
      + '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders>'
      + '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
      + '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
      + '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
      + '</w:tblBorders></w:tblPr></w:style></w:styles>';

    var abstractNums = [
      '<w:abstractNum w:abstractNumId="0">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (l) {
        return '<w:lvl w:ilvl="' + l + '"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#x2022;"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="' + ((l + 1) * 720) + '" w:hanging="360"/></w:pPr></w:lvl>';
      }).join('') + '</w:abstractNum>',
    ];
    var numMappings = ['<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'];
    var totalOrdered = Math.max(numConfigs.length, 1);
    for (var oi = 0; oi < totalOrdered; oi++) {
      var absId = oi + 1;
      var nId = oi + 2;
      abstractNums.push('<w:abstractNum w:abstractNumId="' + absId + '">' + [0, 1, 2, 3, 4].map(function (l) {
        return '<w:lvl w:ilvl="' + l + '"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%' + (l + 1) + '."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="' + ((l + 1) * 720) + '" w:hanging="360"/></w:pPr></w:lvl>';
      }).join('') + '</w:abstractNum>');
      numMappings.push('<w:num w:numId="' + nId + '"><w:abstractNumId w:val="' + absId + '"/></w:num>');
    }
    var numberingXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
      + abstractNums.join('') + numMappings.join('') + '</w:numbering>';

    var footnotesXml = null;
    var footnotesRelsXml = null;
    if (hasFootnotes) {
      var prevRelSink = activeRelSink;
      activeRelSink = {
        add: function (rel) {
          var id = 'rId' + (nextFootnoteRelId++);
          footnoteRels.push(Object.assign({ id: id }, rel));
          return id;
        },
      };
      var fnBody;
      try {
        fnBody = Object.keys(opts.footnotes).map(function (id) {
          var entry = opts.footnotes[id] || {};
          var kids = Array.isArray(entry.children) ? entry.children.map(renderBlock).join('') : '<w:p/>';
          return '<w:footnote w:id="' + xmlEsc(id) + '">' + kids + '</w:footnote>';
        }).join('');
      } finally {
        activeRelSink = prevRelSink;
      }
      footnotesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
        + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
        + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
        + '<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>'
        + '<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>'
        + fnBody + '</w:footnotes>';
      if (footnoteRels.length) {
        footnotesRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
          + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          + footnoteRels.map(function (r) {
            return '<Relationship Id="' + xmlEsc(r.id) + '" Type="' + xmlEsc(r.type) + '" Target="' + xmlEsc(r.target) + '"'
              + (r.external ? ' TargetMode="External"' : '') + '/>';
          }).join('') + '</Relationships>';
      }
    }

    var docRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + rels.map(function (r) {
        return '<Relationship Id="' + xmlEsc(r.id) + '" Type="' + xmlEsc(r.type) + '" Target="' + xmlEsc(r.target) + '"'
          + (r.external ? ' TargetMode="External"' : '') + '/>';
      }).join('') + '</Relationships>';

    var rootRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      + '</Relationships>';

    var coreXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"'
      + ' xmlns:dc="http://purl.org/dc/elements/1.1/">'
      + '<dc:title>' + xmlEsc(title) + '</dc:title>'
      + '<dc:creator>' + xmlEsc(creator) + '</dc:creator>'
      + '<dc:language>' + xmlEsc(docLang) + '</dc:language>'
      + '</cp:coreProperties>';

    var mediaDefaultTypes = Object.keys(mediaExts).map(function (ext) {
      return '<Default Extension="' + xmlEsc(ext) + '" ContentType="' + xmlEsc(mediaExts[ext]) + '"/>';
    }).join('');
    var contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + mediaDefaultTypes
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
      + (footnotesXml ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>' : '')
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '</Types>';

    var entries = [
      { name: '[Content_Types].xml', data: contentTypesXml, isBase64: false },
      { name: '_rels/.rels', data: rootRelsXml, isBase64: false },
      { name: 'docProps/core.xml', data: coreXml, isBase64: false },
      { name: 'word/document.xml', data: documentXml, isBase64: false },
      { name: 'word/_rels/document.xml.rels', data: docRelsXml, isBase64: false },
      { name: 'word/styles.xml', data: stylesXml, isBase64: false },
      { name: 'word/numbering.xml', data: numberingXml, isBase64: false },
    ];
    if (footnotesXml) entries.push({ name: 'word/footnotes.xml', data: footnotesXml, isBase64: false });
    if (footnotesRelsXml) entries.push({ name: 'word/_rels/footnotes.xml.rels', data: footnotesRelsXml, isBase64: false });
    for (var mi = 0; mi < mediaEntries.length; mi++) entries.push(mediaEntries[mi]);
    return entries;
  }

  window.docx = window.docx || {
    HeadingLevel: { HEADING_1: 'Heading1', HEADING_2: 'Heading2', HEADING_3: 'Heading3', HEADING_4: 'Heading4', HEADING_5: 'Heading5', HEADING_6: 'Heading6' },
    AlignmentType: { CENTER: 'center', START: 'start', LEFT: 'left', RIGHT: 'right', BOTH: 'both' },
    WidthType: { PERCENTAGE: 'pct', DXA: 'dxa', AUTO: 'auto' },
    LevelFormat: { DECIMAL: 'decimal', BULLET: 'bullet' },
    LineRuleType: { AUTO: 'auto' },
    HighlightColor: { YELLOW: 'yellow' },
    TextRun: TextRun,
    ExternalHyperlink: ExternalHyperlink,
    ImageRun: ImageRun,
    FootnoteReferenceRun: FootnoteReferenceRun,
    PageBreak: PageBreak,
    Paragraph: Paragraph,
    Table: Table,
    TableRow: TableRow,
    TableCell: TableCell,
    Document: Document,
    ImportedXmlComponent: ImportedXmlComponent,
    Packer: {
      toBlob: async function (docObj) {
        var entries = buildDocxEntries(docObj);
        var b64 = await window.__alloOfflineZip({ entries: entries, storeFirst: null });
        var bin = atob(b64);
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      },
    },
  };
}.toString() + ')();';

// Cached sandboxed module runtime keyed by modulePath + mtimeMs + size so repeat exports
// take single-digit milliseconds without re-parsing the ~1.4 MB view_pdf_audit_module.js.
let _cachedRuntime = null;

function resetNodeExporterCache() {
  if (_cachedRuntime && _cachedRuntime.dom && _cachedRuntime.dom.window && typeof _cachedRuntime.dom.window.close === 'function') {
    try { _cachedRuntime.dom.window.close(); } catch (_) {}
  }
  _cachedRuntime = null;
}

function loadExportRuntime(opts) {
  const o = opts || {};
  if (o.disableNodeFastPath === true || process.env.ALLOFLOW_MCP_DISABLE_NODE_EXPORTERS === '1') {
    return { supported: false, reason: 'disabled' };
  }
  const jsdomMod = typeof o._loadJsdom === 'function' ? o._loadJsdom() : defaultLoadJsdom();
  if (!jsdomMod || typeof jsdomMod.JSDOM !== 'function') {
    return { supported: false, reason: 'jsdom-unavailable' };
  }
  const assetsRoot = o.assetsRoot ? path.resolve(o.assetsRoot) : defaultAssetsRoot();
  const modulePath = path.join(assetsRoot, EXPORT_MODULE);
  if (!fs.existsSync(modulePath)) {
    return { supported: false, reason: 'export-module-missing', modulePath };
  }
  let stat;
  try { stat = fs.statSync(modulePath); } catch (_) {
    return { supported: false, reason: 'export-module-unreadable', modulePath };
  }
  const cacheKey = modulePath + ':' + stat.size + ':' + Math.trunc(stat.mtimeMs);
  if (!o.freshContext && _cachedRuntime && _cachedRuntime.cacheKey === cacheKey) {
    return { supported: true, runtime: _cachedRuntime };
  }

  const { JSDOM } = jsdomMod;
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://127.0.0.1/',
    pretendToBeVisual: false,
  });
  const win = dom.window;
  const silentConsole = {
    log() {},
    info() {},
    warn() {},
    error() {},
    debug() {},
  };
  const BlobCtor = typeof globalThis.Blob === 'function' ? globalThis.Blob : win.Blob;
  const URLCtor = typeof globalThis.URL === 'function' ? globalThis.URL : win.URL;
  const URLSearchParamsCtor = typeof globalThis.URLSearchParams === 'function' ? globalThis.URLSearchParams : win.URLSearchParams;
  const TextEncoderCtor = typeof globalThis.TextEncoder === 'function' ? globalThis.TextEncoder : win.TextEncoder;
  const TextDecoderCtor = typeof globalThis.TextDecoder === 'function' ? globalThis.TextDecoder : win.TextDecoder;
  const webCrypto = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto
    : { randomUUID: () => crypto.randomUUID(), getRandomValues: (arr) => crypto.randomFillSync(arr) };

  // Attach offline shims & guards directly on the jsdom window so both global and window.* lookups match.
  win._isDesktopBundledApp = true;
  win.__alloOfflineZip = runOfflineZip;
  win.atob = decodeBase64Binary;
  win.btoa = encodeBase64Binary;
  win.Blob = BlobCtor;
  win.TextEncoder = TextEncoderCtor;
  win.TextDecoder = TextDecoderCtor;
  win.URL = URLCtor;
  win.URLSearchParams = URLSearchParamsCtor;
  win.console = silentConsole;
  win.fetch = () => Promise.reject(new Error('Network access is disabled in node-fast exporter'));

  const sandbox = {
    window: win,
    self: win,
    document: win.document,
    DOMParser: win.DOMParser,
    XMLSerializer: win.XMLSerializer,
    Node: win.Node,
    NodeFilter: win.NodeFilter,
    HTMLElement: win.HTMLElement,
    Element: win.Element,
    Document: win.Document,
    DocumentFragment: win.DocumentFragment,
    Text: win.Text,
    Comment: win.Comment,
    SVGElement: win.SVGElement,
    atob: decodeBase64Binary,
    btoa: encodeBase64Binary,
    TextEncoder: TextEncoderCtor,
    TextDecoder: TextDecoderCtor,
    URL: URLCtor,
    URLSearchParams: URLSearchParamsCtor,
    Blob: BlobCtor,
    crypto: webCrypto,
    Uint8Array,
    Int8Array,
    Uint16Array,
    Int16Array,
    Uint32Array,
    Int32Array,
    Float32Array,
    Float64Array,
    DataView,
    ArrayBuffer,
    Map,
    Set,
    WeakMap,
    WeakSet,
    console: silentConsole,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    structuredClone: typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone : undefined,
    fetch: win.fetch,
  };
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(OFFLINE_REACT_STUB, ctx, { filename: 'alloflow-offline-react-stub.js' });
  vm.runInContext(OFFLINE_JSZIP_SHIM, ctx, { filename: 'alloflow-offline-jszip-shim.js' });
  vm.runInContext(OFFLINE_DOCX_SHIM, ctx, { filename: 'alloflow-offline-docx-shim.js' });
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(moduleSource, ctx, { filename: EXPORT_MODULE });

  const mods = win.AlloModules || {};
  if (!mods.AltFormatExports || typeof mods.AltFormatExports.epub !== 'function') {
    try { win.close(); } catch (_) {}
    return { supported: false, reason: 'alt-format-exports-unavailable' };
  }

  const runtime = {
    cacheKey,
    dom,
    window: win,
    AltFormatExports: mods.AltFormatExports,
    AccessibleOfficeExport: mods.AccessibleOfficeExport || null,
  };
  if (!o.freshContext) {
    resetNodeExporterCache();
    _cachedRuntime = runtime;
  }
  return { supported: true, runtime };
}

function isNodeExporterAvailable(opts) {
  const loaded = loadExportRuntime(opts);
  return loaded.supported === true;
}

async function exportAltFormatNode(opts) {
  const o = opts || {};
  const format = ALT_FORMATS[String(o.format || '').toLowerCase()];
  if (!format) throw new Error('format must be one of: epub, daisy, brf');
  if (!o.html || typeof o.html !== 'string') throw new Error('html is required');

  const loaded = loadExportRuntime(o);
  if (!loaded.supported) return loaded;

  const title = String(o.title || 'document').replace(/\.\w+$/, '') || 'document';
  const fileStem = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 120) || 'document';
  const A = loaded.runtime.AltFormatExports;

  if (format === 'brf') {
    const r = A.braille(o.html, o.builderOptions || undefined);
    const buf = Buffer.from(r.brf, 'ascii');
    return {
      supported: true,
      executionEngine: 'node-fast',
      format: 'brf',
      fileName: fileStem + '.brf',
      b64: buf.toString('base64'),
      bytes: buf.length,
      brf: r.brf,
      grade: r.grade,
      code: r.code,
      droppedCharacters: r.dropped,
      sourceCharacters: r.text.length,
      modelFree: true,
      warnings: r.dropped > 0
        ? [r.dropped + ' character(s) had no uncontracted-braille equivalent and were dropped.']
        : [],
    };
  }

  const builderOpts = Object.assign({}, o.builderOptions || {}, { title });
  const pkg = format === 'epub' ? A.epub(o.html, builderOpts) : A.daisy(o.html, builderOpts);
  const errs = ((pkg && pkg.validation && pkg.validation.issues) || []).filter((i) => i.severity === 'error');
  const preEncoded = pkg && pkg.binaryFiles && typeof pkg.binaryFiles === 'object' ? pkg.binaryFiles : null;
  const zipFiles = {};
  for (const [entryName, entryVal] of Object.entries((pkg && pkg.files) || {})) {
    if (preEncoded && typeof preEncoded[entryName] === 'string') {
      zipFiles[entryName] = Buffer.from(preEncoded[entryName], 'base64');
    } else if (ArrayBuffer.isView(entryVal)) {
      zipFiles[entryName] = Buffer.from(entryVal.buffer, entryVal.byteOffset, entryVal.byteLength);
    } else if (entryVal instanceof ArrayBuffer) {
      zipFiles[entryName] = Buffer.from(entryVal);
    } else {
      zipFiles[entryName] = entryVal;
    }
  }
  const buf = zipFileMap(zipFiles, (pkg && pkg.storeFirst) || undefined);
  return {
    supported: true,
    executionEngine: 'node-fast',
    format,
    fileName: fileStem + (format === 'epub' ? '.epub' : '-daisy.zip'),
    b64: buf.toString('base64'),
    bytes: buf.length,
    entries: Object.keys(zipFiles),
    files: pkg.files,
    language: pkg.lang,
    identifier: pkg.uid,
    navEntries: typeof pkg.headings === 'number' ? pkg.headings : undefined,
    modelFree: true,
    structuralErrors: errs,
    selfChecked: format === 'epub',
    valid: format === 'epub' ? errs.length === 0 : undefined,
    validation: pkg.validation || null,
    warnings: errs.length
      ? [errs.length + ' structural issue(s) found by the built-in EPUB self-check; this file may not open in all readers. Not a substitute for epubcheck.']
      : [],
  };
}

async function exportAccessibleOfficeNode(opts) {
  const o = opts || {};
  const format = String(o.format || '').toLowerCase();
  if (!o.html || typeof o.html !== 'string') throw new Error('html is required');
  if (!OFFICE_FORMATS[format]) {
    return { supported: false, reason: 'unsupported-format' };
  }

  const loaded = loadExportRuntime(o);
  if (!loaded.supported) return loaded;

  const Office = loaded.runtime.AccessibleOfficeExport;
  if (!Office || typeof Office.build !== 'function') {
    return { supported: false, reason: 'accessible-office-export-unavailable' };
  }

  const res = await Office.build({
    html: o.html,
    title: o.title || 'AlloFlow Document',
    format,
  });
  if (!res || !res.blob) throw new Error('Office export returned no data');
  const ab = await res.blob.arrayBuffer();
  const buf = Buffer.from(ab);
  return {
    supported: true,
    executionEngine: 'node-fast',
    b64: buf.toString('base64'),
    fileName: res.fileName,
    message: res.message || null,
    counts: res.counts || null,
  };
}

function validateEpubNode(files, opts) {
  const loaded = loadExportRuntime(opts);
  if (!loaded.supported) return loaded;
  const A = loaded.runtime.AltFormatExports;
  if (!A || typeof A.validateEpub !== 'function') {
    return { supported: false, reason: 'validate-epub-unavailable' };
  }
  return Object.assign({ supported: true }, A.validateEpub(files));
}

module.exports = {
  ALT_FORMATS,
  OFFICE_FORMATS,
  exportAltFormatNode,
  exportAccessibleOfficeNode,
  validateEpubNode,
  isNodeExporterAvailable,
  resetNodeExporterCache,
};
