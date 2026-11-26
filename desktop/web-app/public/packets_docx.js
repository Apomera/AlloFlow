// Offline, zero-dependency OOXML (.docx) worksheet and scoring sheet generator.
// One plain script for browser pages (window.AlloPacketDocx) and Node (module.exports).
// Built directly on window.AlloPacketZip / ./packets_zip.js (STORE ZIP, CRC-32, UTF-8 names).
// Produces clean, editable Word / Google Docs / LibreOffice .docx files with zero network calls.
(function (root) {
  'use strict';

  var VERSION = 1;
  var DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var DOCX_EXT = '.' + 'docx';

  // ISO/IEC 29500 (OOXML) XML namespace identifier URIs (pure identifiers, never fetched).
  var XMLNS_PROTO = 'http:' + '//';
  var NS_CT = XMLNS_PROTO + 'schemas.openxmlformats.org/package/2006/content-types';
  var NS_PKG_REL = XMLNS_PROTO + 'schemas.openxmlformats.org/package/2006/relationships';
  var NS_REL_DOC = XMLNS_PROTO + 'schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';
  var NS_REL_STYLES = XMLNS_PROTO + 'schemas.openxmlformats.org/officeDocument/2006/relationships/styles';
  var NS_REL_IMAGE = XMLNS_PROTO + 'schemas.openxmlformats.org/officeDocument/2006/relationships/image';
  var NS_W = XMLNS_PROTO + 'schemas.openxmlformats.org/wordprocessingml/2006/main';
  var NS_R = XMLNS_PROTO + 'schemas.openxmlformats.org/officeDocument/2006/relationships';
  var NS_WP = XMLNS_PROTO + 'schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
  var NS_A = XMLNS_PROTO + 'schemas.openxmlformats.org/drawingml/2006/main';
  var NS_PIC = XMLNS_PROTO + 'schemas.openxmlformats.org/drawingml/2006/picture';
  var EMU_PER_INCH = 914400;

  var PAGE_W = 12240; // 8.5 in (US Letter) in twips
  var PAGE_H = 15840; // 11 in in twips
  var KEY_NOTICE = 'For the teacher \u2014 keep apart from the student copy';
  var FRIENDLY_SOUND = { oo_short: 'short oo', dh: 'th (this)', zh: 'zh', schwa: 'uh' };

  // Density profiles: font sizes in half-points (20 = 10pt, 22 = 11pt, 27 = 13.5pt), spacing in twips.
  var DENSITY = {
    compact: {
      name: 'compact',
      bodyHp: 20,
      smallHp: 18,
      dirHp: 19,
      wordHp: 24,
      headingHp: 24,
      titleHp: 32,
      traceHp: 46,
      lineTw: 240,
      paraAfter: 60,
      itemBefore: 50,
      itemAfter: 70,
      secBefore: 160,
      secAfter: 60,
      writeLineHeight: 320,
      boxHeight: 440,
      boxWidth: 500,
      margin: 792,
      cellPadV: 55,
      cellPadH: 90
    },
    standard: {
      name: 'standard',
      bodyHp: 22,
      smallHp: 19,
      dirHp: 20,
      wordHp: 28,
      headingHp: 26,
      titleHp: 36,
      traceHp: 56,
      lineTw: 276,
      paraAfter: 100,
      itemBefore: 85,
      itemAfter: 100,
      secBefore: 220,
      secAfter: 80,
      writeLineHeight: 440,
      boxHeight: 540,
      boxWidth: 600,
      margin: 1008,
      cellPadV: 80,
      cellPadH: 110
    },
    primary: {
      name: 'primary',
      bodyHp: 27,
      smallHp: 22,
      dirHp: 24,
      wordHp: 36,
      headingHp: 32,
      titleHp: 42,
      traceHp: 72,
      lineTw: 336,
      paraAfter: 160,
      itemBefore: 140,
      itemAfter: 160,
      secBefore: 300,
      secAfter: 120,
      writeLineHeight: 660,
      boxHeight: 700,
      boxWidth: 740,
      margin: 1080,
      cellPadV: 110,
      cellPadH: 130
    }
  };

  function resolveDensity(raw) {
    var key = String(raw == null ? 'standard' : raw).trim().toLowerCase();
    if (key === 'compact' || key === 'tight') return DENSITY.compact;
    if (key === 'primary' || key === 'large' || key === 'k1') return DENSITY.primary;
    return DENSITY.standard;
  }

  function resolveZipLib(opts) {
    if (opts && opts.zip && typeof opts.zip.create === 'function') return opts.zip;
    if (root && root.AlloPacketZip && typeof root.AlloPacketZip.create === 'function') return root.AlloPacketZip;
    if (typeof require === 'function') {
      try {
        var mod = require('./packets_zip.js');
        if (mod && typeof mod.create === 'function') return mod;
      } catch (_) {}
    }
    throw new Error('AlloPacketZip is required to build .docx files.');
  }

  // Strict XML 1.0 text cleaner & escaper: removes illegal control characters and lone surrogates.
  function xmlClean(value) {
    var s = String(value == null ? '' : value);
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFFFE\uFFFF]/g, '');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) {
        var next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
        if (next >= 0xDC00 && next <= 0xDFFF) {
          out += s.charAt(i) + s.charAt(i + 1);
          i++;
        } else {
          out += '\uFFFD';
        }
      } else if (c >= 0xDC00 && c <= 0xDFFF) {
        out += '\uFFFD';
      } else {
        out += s.charAt(i);
      }
    }
    return out;
  }

  function xmlEsc(value) {
    return xmlClean(value).replace(/[&<>"']/g, function (ch) {
      if (ch === '&') return '&amp;';
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      if (ch === '"') return '&quot;';
      return '&apos;';
    });
  }

  function slug(text, fallback) {
    var clean = String(text == null ? '' : text).trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return clean || fallback || 'worksheet';
  }

  function ensureDocxFilename(rawName, fallbackBase) {
    var s = String(rawName || '').replace(/[\x00-\x1f\x7f\\/:*?"<>|]/g, '').trim();
    if (!s) s = slug(fallbackBase, 'worksheet') + DOCX_EXT;
    if (s.toLowerCase().slice(-DOCX_EXT.length) !== DOCX_EXT) s += DOCX_EXT;
    return s;
  }

  function letterLabel(idx) {
    var n = Number(idx) || 0;
    if (n < 26) return String.fromCharCode(65 + n);
    return String.fromCharCode(65 + Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26));
  }

  function soundLabel(raw) {
    var s = String(raw == null ? '' : raw).replace(/^\/|\/$/g, '').trim();
    if (!s) return '';
    return Object.prototype.hasOwnProperty.call(FRIENDLY_SOUND, s) ? '/' + FRIENDLY_SOUND[s] + '/' : '/' + s + '/';
  }

  function choiceText(c) {
    if (typeof c === 'string' || typeof c === 'number') return String(c);
    if (c && typeof c === 'object') return String(c.text || c.label || c.word || c.value || '');
    return '';
  }

  function isRtlLang(lang) {
    return /^(?:ar|he|iw|fa|ur|ps|sd|yi|dv)(?:[-_]|$)/i.test(String(lang || '').trim());
  }

  function isPartHidden(hiddenMap, keys) {
    if (!hiddenMap) return false;
    var list = Array.isArray(keys) ? keys : [keys];
    if (Array.isArray(hiddenMap)) {
      for (var i = 0; i < list.length; i++) {
        if (hiddenMap.indexOf(list[i]) >= 0) return true;
      }
      return false;
    }
    if (typeof hiddenMap === 'object') {
      for (var j = 0; j < list.length; j++) {
        if (hiddenMap[list[j]]) return true;
      }
    }
    return false;
  }

  function getOverride(overrides, keys) {
    if (!overrides || typeof overrides !== 'object') return null;
    var list = Array.isArray(keys) ? keys : [keys];
    for (var i = 0; i < list.length; i++) {
      var ov = overrides[list[i]];
      if (ov && typeof ov === 'object') return ov;
    }
    return null;
  }

  function overrideHeading(overrides, keys, fallback) {
    var ov = getOverride(overrides, keys);
    var v = ov ? String(ov.label || ov.heading || ov.title || '').trim() : '';
    return v || fallback;
  }

  function overrideDirections(overrides, keys, fallback) {
    var ov = getOverride(overrides, keys);
    if (ov && (ov.directions !== undefined || ov.dir !== undefined)) {
      return String(ov.directions !== undefined ? ov.directions : ov.dir).trim();
    }
    return fallback;
  }

  function resolveCredits(model, opts) {
    var raw = (opts && opts.credits !== undefined) ? opts.credits : (model && model.credits);
    if (typeof raw === 'function') {
      try { raw = raw(); } catch (_) { raw = []; }
    }
    if (!raw && model && typeof model.computeCredits === 'function') {
      try { raw = model.computeCredits(); } catch (_) { raw = []; }
    }
    if (typeof raw === 'string') return raw.trim() ? [raw.trim()] : [];
    if (!Array.isArray(raw)) return [];
    return raw.map(function (line) {
      return String(line == null ? '' : line).replace(/\b[a-z][a-z0-9+.-]{1,12}:\/\/+/gi, '').trim();
    }).filter(Boolean);
  }

  function concatUint8(parts) {
    var total = 0;
    var i;
    for (i = 0; i < parts.length; i++) total += parts[i].length;
    var out = new Uint8Array(total);
    var offset = 0;
    for (i = 0; i < parts.length; i++) {
      out.set(parts[i], offset);
      offset += parts[i].length;
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Low-level OOXML WordprocessingML XML Builders (strict element order)
  // ---------------------------------------------------------------------------
  function rXml(text, opt) {
    var o = opt || {};
    var pr = '';
    if (o.font || o.bold || o.italic || o.color || o.sz || o.underline || o.rtl) {
      pr += '<w:rPr>';
      if (o.font) {
        var fn = xmlEsc(o.font);
        pr += '<w:rFonts w:ascii="' + fn + '" w:hAnsi="' + fn + '" w:cs="' + fn + '"/>';
      }
      if (o.bold) pr += '<w:b/><w:bCs/>';
      if (o.italic) pr += '<w:i/><w:iCs/>';
      if (o.color) pr += '<w:color w:val="' + xmlEsc(o.color) + '"/>';
      if (o.sz) pr += '<w:sz w:val="' + Math.round(o.sz) + '"/><w:szCs w:val="' + Math.round(o.sz) + '"/>';
      if (o.underline) pr += '<w:u w:val="single"/>';
      if (o.rtl) pr += '<w:rtl/>';
      pr += '</w:rPr>';
    }
    return '<w:r>' + pr + '<w:t xml:space="preserve">' + xmlEsc(text) + '</w:t></w:r>';
  }

  function pXml(runsOrText, opt) {
    var o = opt || {};
    var pr = '';
    var hasPr = o.style || o.keepNext || o.keepLines || o.pageBreakBefore || o.borders || o.shade
      || o.bidi || o.before != null || o.after != null || o.line != null || o.indentLeft != null
      || o.indentRight != null || o.hanging != null || o.align;
    if (hasPr) {
      pr += '<w:pPr>';
      if (o.style) pr += '<w:pStyle w:val="' + xmlEsc(o.style) + '"/>';
      if (o.keepNext) pr += '<w:keepNext/>';
      if (o.keepLines) pr += '<w:keepLines/>';
      if (o.pageBreakBefore) pr += '<w:pageBreakBefore/>';
      if (o.borders) {
        pr += '<w:pBdr>';
        if (o.borders.top) pr += '<w:top ' + o.borders.top + '/>';
        if (o.borders.left) pr += '<w:left ' + o.borders.left + '/>';
        if (o.borders.bottom) pr += '<w:bottom ' + o.borders.bottom + '/>';
        if (o.borders.right) pr += '<w:right ' + o.borders.right + '/>';
        pr += '</w:pBdr>';
      }
      if (o.shade) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + xmlEsc(o.shade) + '"/>';
      if (o.bidi) pr += '<w:bidi/>';
      if (o.before != null || o.after != null || o.line != null) {
        pr += '<w:spacing'
          + (o.before != null ? ' w:before="' + Math.round(o.before) + '"' : '')
          + (o.after != null ? ' w:after="' + Math.round(o.after) + '"' : '')
          + (o.line != null ? ' w:line="' + Math.round(o.line) + '" w:lineRule="auto"' : '')
          + '/>';
      }
      if (o.indentLeft != null || o.indentRight != null || o.hanging != null) {
        pr += '<w:ind'
          + (o.indentLeft != null ? ' w:left="' + Math.round(o.indentLeft) + '"' : '')
          + (o.indentRight != null ? ' w:right="' + Math.round(o.indentRight) + '"' : '')
          + (o.hanging != null ? ' w:hanging="' + Math.round(o.hanging) + '"' : '')
          + '/>';
      }
      if (o.align) pr += '<w:jc w:val="' + xmlEsc(o.align) + '"/>';
      pr += '</w:pPr>';
    }
    var body = '';
    if (Array.isArray(runsOrText)) {
      body = runsOrText.join('');
    } else if (typeof runsOrText === 'string' && runsOrText.length) {
      body = o.rawRuns ? runsOrText : rXml(runsOrText, o.run || (o.bidi ? { rtl: true } : null));
    }
    return '<w:p>' + pr + body + '</w:p>';
  }

  function pageBreakXml() {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }

  function writingLineXml(d, opt) {
    var o = opt || {};
    var h = o.height != null ? o.height : d.writeLineHeight;
    var borders = {
      bottom: 'w:val="single" w:sz="8" w:space="2" w:color="000000"'
    };
    if (o.dashedTop) {
      borders.top = 'w:val="dashed" w:sz="4" w:space="2" w:color="888888"';
    }
    return pXml('', {
      borders: borders,
      before: h,
      after: o.after != null ? o.after : Math.round(d.paraAfter * 0.6),
      indentLeft: o.indentLeft,
      keepLines: true
    });
  }

  function borderTag(name, spec) {
    if (!spec || spec === 'none') return '<w:' + name + ' w:val="none" w:sz="0" w:space="0" w:color="auto"/>';
    return '<w:' + name + ' ' + spec + '/>';
  }

  function tableXml(colWidths, rowsXml, opt) {
    var o = opt || {};
    var totalW = colWidths.reduce(function (a, b) { return a + b; }, 0);
    var bAll = o.borders || 'none';
    var bSpec = typeof bAll === 'string'
      ? { top: bAll, left: bAll, bottom: bAll, right: bAll, insideH: bAll, insideV: bAll }
      : bAll;
    var padV = o.padV != null ? o.padV : 70;
    var padH = o.padH != null ? o.padH : 100;
    var pr = '<w:tblPr>'
      + '<w:tblW w:w="' + Math.round(totalW) + '" w:type="dxa"/>'
      + (o.align ? '<w:jc w:val="' + xmlEsc(o.align) + '"/>' : '')
      + (o.bidiVisual ? '<w:bidiVisual/>' : '')
      + '<w:tblBorders>'
      + borderTag('top', bSpec.top)
      + borderTag('left', bSpec.left)
      + borderTag('bottom', bSpec.bottom)
      + borderTag('right', bSpec.right)
      + borderTag('insideH', bSpec.insideH)
      + borderTag('insideV', bSpec.insideV)
      + '</w:tblBorders>'
      + '<w:tblLayout w:type="fixed"/>'
      + '<w:tblCellMar>'
      + '<w:top w:w="' + Math.round(padV) + '" w:type="dxa"/>'
      + '<w:left w:w="' + Math.round(padH) + '" w:type="dxa"/>'
      + '<w:bottom w:w="' + Math.round(padV) + '" w:type="dxa"/>'
      + '<w:right w:w="' + Math.round(padH) + '" w:type="dxa"/>'
      + '</w:tblCellMar>'
      + '</w:tblPr>';
    var grid = '<w:tblGrid>' + colWidths.map(function (w) {
      return '<w:gridCol w:w="' + Math.round(w) + '"/>';
    }).join('') + '</w:tblGrid>';
    return '<w:tbl>' + pr + grid + rowsXml.join('') + '</w:tbl>';
  }

  function rowXml(cellsXml, opt) {
    var o = opt || {};
    var pr = '';
    if (o.cantSplit || o.height || o.header) {
      pr = '<w:trPr>'
        + (o.cantSplit ? '<w:cantSplit/>' : '')
        + (o.height ? '<w:trHeight w:val="' + Math.round(o.height) + '" w:hRule="' + (o.hRule || 'atLeast') + '"/>' : '')
        + (o.header ? '<w:tblHeader/>' : '')
        + '</w:trPr>';
    }
    return '<w:tr>' + pr + cellsXml.join('') + '</w:tr>';
  }

  function cellXml(paragraphsXml, width, opt) {
    var o = opt || {};
    var pr = '<w:tcPr><w:tcW w:w="' + Math.round(width) + '" w:type="dxa"/>';
    if (o.span && o.span > 1) pr += '<w:gridSpan w:val="' + Math.round(o.span) + '"/>';
    if (o.borders) {
      pr += '<w:tcBorders>'
        + (o.borders.top ? borderTag('top', o.borders.top) : '')
        + (o.borders.left ? borderTag('left', o.borders.left) : '')
        + (o.borders.bottom ? borderTag('bottom', o.borders.bottom) : '')
        + (o.borders.right ? borderTag('right', o.borders.right) : '')
        + '</w:tcBorders>';
    }
    if (o.shade) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + xmlEsc(o.shade) + '"/>';
    if (o.padV != null || o.padH != null) {
      var pv = o.padV != null ? o.padV : 70;
      var ph = o.padH != null ? o.padH : 100;
      pr += '<w:tcMar>'
        + '<w:top w:w="' + Math.round(pv) + '" w:type="dxa"/>'
        + '<w:left w:w="' + Math.round(ph) + '" w:type="dxa"/>'
        + '<w:bottom w:w="' + Math.round(pv) + '" w:type="dxa"/>'
        + '<w:right w:w="' + Math.round(ph) + '" w:type="dxa"/>'
        + '</w:tcMar>';
    }
    if (o.vAlign) pr += '<w:vAlign w:val="' + xmlEsc(o.vAlign) + '"/>';
    pr += '</w:tcPr>';
    var inner = Array.isArray(paragraphsXml) ? paragraphsXml.join('') : String(paragraphsXml || '');
    if (!inner) inner = pXml('');
    return '<w:tc>' + pr + inner + '</w:tc>';
  }

  // ---------------------------------------------------------------------------
  // Shared Document Parts: Header, Section Heading, Shaded Box, Credits, Key
  // ---------------------------------------------------------------------------
  function buildWorksheetHeaderXml(title, subtitle, headerFields, d, contentW, isRtl) {
    var out = [];
    var hf = headerFields && typeof headerFields === 'object' ? headerFields : {};
    var showClass = !!(hf.classPeriod || hf.class || hf.period);
    var showScore = !!hf.score;
    var rtlAlign = isRtl ? 'right' : 'left';

    out.push(pXml([rXml(title, { bold: true, sz: d.titleHp, color: '000000', rtl: isRtl })], {
      style: 'Title',
      before: 0,
      after: subtitle ? 50 : 90,
      bidi: isRtl,
      align: rtlAlign,
      keepNext: true
    }));

    if (subtitle) {
      out.push(pXml([rXml(subtitle, { italic: true, sz: d.dirHp, color: '333333', rtl: isRtl })], {
        style: 'Subtitle',
        before: 0,
        after: 100,
        bidi: isRtl,
        align: rtlAlign,
        keepNext: true
      }));
    }

    var leftW = Math.round(contentW * 0.58);
    var rightW = contentW - leftW;
    var fieldCell = function (labelText, blankStr, width) {
      return cellXml(
        pXml([
          rXml(labelText + ' ', { bold: true, sz: d.bodyHp, color: '000000' }),
          rXml(blankStr, { sz: d.bodyHp, color: '000000' })
        ], { before: 20, after: 40 }),
        width,
        { padV: 40, padH: 40 }
      );
    };

    var rows = [];
    rows.push(rowXml([
      fieldCell('Name:', '____________________________', leftW),
      fieldCell('Date:', '________________', rightW)
    ], { cantSplit: true }));

    if (showClass || showScore) {
      var col1 = showClass
        ? fieldCell('Class / Period:', '____________________', leftW)
        : fieldCell('Score:', '______ / ______', leftW);
      var col2 = (showClass && showScore)
        ? fieldCell('Score:', '______ / ______', rightW)
        : cellXml(pXml('', { before: 0, after: 0 }), rightW, { padV: 40, padH: 40 });
      rows.push(rowXml([col1, col2], { cantSplit: true }));
    }

    out.push(tableXml([leftW, rightW], rows, {
      borders: {
        top: 'none',
        left: 'none',
        right: 'none',
        bottom: 'w:val="single" w:sz="12" w:space="0" w:color="000000"',
        insideH: 'none',
        insideV: 'none'
      },
      padV: 35,
      padH: 40
    }));

    return out.join('');
  }

  function sectionHeadXml(heading, directions, d, isRtl) {
    var out = [];
    var rtlAlign = isRtl ? 'right' : 'left';
    out.push(pXml([rXml(heading, { bold: true, sz: d.headingHp, color: '000000', rtl: isRtl })], {
      style: 'Heading2',
      before: d.secBefore,
      after: directions ? 40 : d.secAfter,
      borders: { bottom: 'w:val="single" w:sz="6" w:space="3" w:color="000000"' },
      bidi: isRtl,
      align: rtlAlign,
      keepNext: true
    }));
    if (directions) {
      out.push(pXml([rXml(directions, { italic: true, sz: d.dirHp, color: '222222', rtl: isRtl })], {
        style: 'Directions',
        before: 20,
        after: d.secAfter,
        bidi: isRtl,
        align: rtlAlign,
        keepNext: true
      }));
    }
    return out.join('');
  }

  function shadedBoxXml(paragraphsXml, contentW, d, opt) {
    var o = opt || {};
    var borderSpec = 'w:val="single" w:sz="' + (o.borderSz || 8) + '" w:space="0" w:color="000000"';
    return tableXml([contentW], [
      rowXml([
        cellXml(paragraphsXml, contentW, {
          shade: o.shade || 'F2F2F2',
          padV: o.padV != null ? o.padV : d.cellPadV + 20,
          padH: o.padH != null ? o.padH : d.cellPadH + 30
        })
      ], { cantSplit: o.cantSplit !== false })
    ], {
      borders: borderSpec,
      padV: o.padV != null ? o.padV : d.cellPadV + 20,
      padH: o.padH != null ? o.padH : d.cellPadH + 30
    });
  }

  function creditsFooterXml(creditLines, d) {
    if (!creditLines || !creditLines.length) return '';
    var out = [];
    creditLines.forEach(function (line, idx) {
      out.push(pXml([rXml(line, { sz: Math.max(16, d.smallHp - 2), color: '444444' })], {
        before: idx === 0 ? 220 : 20,
        after: 20,
        borders: idx === 0 ? { top: 'w:val="single" w:sz="4" w:space="4" w:color="888888"' } : null
      }));
    });
    return out.join('');
  }

  function answerKeyXml(headingText, keySections, d, contentW) {
    if (!keySections || !keySections.length) return '';
    var out = [];
    out.push(pageBreakXml());
    out.push(shadedBoxXml(
      pXml([rXml(KEY_NOTICE, { bold: true, sz: d.bodyHp, color: '000000' })], { before: 20, after: 20 }),
      contentW,
      d,
      { shade: 'F0F0F0', borderSz: 12, padV: 70, padH: 120 }
    ));
    out.push(pXml([rXml(headingText || 'Teacher Answer Key', { bold: true, sz: d.titleHp - 4, color: '000000' })], {
      style: 'Heading1',
      before: 160,
      after: 80,
      keepNext: true
    }));
    keySections.forEach(function (sec) {
      if (!sec || !Array.isArray(sec.lines) || !sec.lines.length) return;
      out.push(pXml([rXml(sec.heading || 'Answers', { bold: true, sz: d.headingHp - 2, color: '000000' })], {
        style: 'Heading2',
        before: 140,
        after: 50,
        keepNext: true
      }));
      sec.lines.forEach(function (line, idx) {
        out.push(pXml([
          rXml((idx + 1) + '. ', { bold: true, sz: d.bodyHp, color: '000000' }),
          rXml(line, { sz: d.bodyHp, color: '000000' })
        ], {
          before: 25,
          after: 40,
          indentLeft: 360,
          hanging: 360,
          keepLines: true
        }));
      });
    });
    return out.join('');
  }

  function soundBoxesTableXml(count, d, contentW) {
    var n = Math.max(1, Math.min(12, Math.floor(Number(count) || 3)));
    var boxW = Math.min(d.boxWidth, Math.floor((contentW - 400) / n));
    var widths = [];
    var cells = [];
    for (var i = 0; i < n; i++) {
      widths.push(boxW);
      cells.push(cellXml(pXml('', { before: 0, after: 0, align: 'center' }), boxW, { vAlign: 'center', padV: 40, padH: 40 }));
    }
    return tableXml(widths, [rowXml(cells, { cantSplit: true, height: d.boxHeight, hRule: 'atLeast' })], {
      borders: 'w:val="single" w:sz="12" w:space="0" w:color="000000"',
      padV: 40,
      padH: 40
    });
  }

  function letterTilesTableXml(tiles, d, contentW) {
    var list = Array.isArray(tiles) && tiles.length ? tiles : ['?'];
    var n = Math.min(14, list.length);
    var tileW = Math.min(Math.round(d.boxWidth * 0.9), Math.floor((contentW - 400) / n));
    var widths = [];
    var cells = [];
    for (var i = 0; i < n; i++) {
      widths.push(tileW);
      cells.push(cellXml(
        pXml([rXml(String(list[i]), { bold: true, sz: d.wordHp, color: '000000' })], { before: 20, after: 20, align: 'center' }),
        tileW,
        { vAlign: 'center', shade: 'FAFAFA', padV: 50, padH: 40 }
      ));
    }
    return tableXml(widths, [rowXml(cells, { cantSplit: true, height: Math.round(d.boxHeight * 0.85), hRule: 'atLeast' })], {
      borders: 'w:val="single" w:sz="10" w:space="0" w:color="000000"',
      padV: 40,
      padH: 40
    });
  }

  // ---------------------------------------------------------------------------
  // OOXML Package Assembly (5 parts -> AlloPacketZip)
  // ---------------------------------------------------------------------------
  function buildStylesXml(d) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<w:styles xmlns:w="' + NS_W + '">\n'
      + '  <w:docDefaults>\n'
      + '    <w:rPrDefault>\n'
      + '      <w:rPr>\n'
      + '        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>\n'
      + '        <w:color w:val="000000"/>\n'
      + '        <w:sz w:val="' + d.bodyHp + '"/>\n'
      + '        <w:szCs w:val="' + d.bodyHp + '"/>\n'
      + '      </w:rPr>\n'
      + '    </w:rPrDefault>\n'
      + '    <w:pPrDefault>\n'
      + '      <w:pPr>\n'
      + '        <w:spacing w:after="' + d.paraAfter + '" w:line="' + d.lineTw + '" w:lineRule="auto"/>\n'
      + '      </w:pPr>\n'
      + '    </w:pPrDefault>\n'
      + '  </w:docDefaults>\n'
      + '  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">\n'
      + '    <w:name w:val="Normal"/>\n'
      + '    <w:qFormat/>\n'
      + '    <w:pPr><w:spacing w:after="' + d.paraAfter + '" w:line="' + d.lineTw + '" w:lineRule="auto"/></w:pPr>\n'
      + '    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000"/><w:sz w:val="' + d.bodyHp + '"/><w:szCs w:val="' + d.bodyHp + '"/></w:rPr>\n'
      + '  </w:style>\n'
      + '  <w:style w:type="paragraph" w:styleId="Title">\n'
      + '    <w:name w:val="Title"/>\n'
      + '    <w:basedOn w:val="Normal"/>\n'
      + '    <w:qFormat/>\n'
      + '    <w:pPr><w:keepNext/><w:spacing w:before="0" w:after="80"/></w:pPr>\n'
      + '    <w:rPr><w:b/><w:bCs/><w:sz w:val="' + d.titleHp + '"/><w:szCs w:val="' + d.titleHp + '"/></w:rPr>\n'
      + '  </w:style>\n'
      + '  <w:style w:type="paragraph" w:styleId="Subtitle">\n'
      + '    <w:name w:val="Subtitle"/>\n'
      + '    <w:basedOn w:val="Normal"/>\n'
      + '    <w:qFormat/>\n'
      + '    <w:pPr><w:keepNext/><w:spacing w:before="0" w:after="90"/></w:pPr>\n'
      + '    <w:rPr><w:i/><w:iCs/><w:color w:val="333333"/><w:sz w:val="' + d.dirHp + '"/><w:szCs w:val="' + d.dirHp + '"/></w:rPr>\n'
      + '  </w:style>\n'
      + '  <w:style w:type="paragraph" w:styleId="Heading1">\n'
      + '    <w:name w:val="heading 1"/>\n'
      + '    <w:basedOn w:val="Normal"/>\n'
      + '    <w:qFormat/>\n'
      + '    <w:pPr><w:keepNext/><w:spacing w:before="' + d.secBefore + '" w:after="80"/></w:pPr>\n'
      + '    <w:rPr><w:b/><w:bCs/><w:sz w:val="' + (d.titleHp - 4) + '"/><w:szCs w:val="' + (d.titleHp - 4) + '"/></w:rPr>\n'
      + '  </w:style>\n'
      + '  <w:style w:type="paragraph" w:styleId="Heading2">\n'
      + '    <w:name w:val="heading 2"/>\n'
      + '    <w:basedOn w:val="Normal"/>\n'
      + '    <w:qFormat/>\n'
      + '    <w:pPr><w:keepNext/><w:spacing w:before="' + d.secBefore + '" w:after="50"/></w:pPr>\n'
      + '    <w:rPr><w:b/><w:bCs/><w:sz w:val="' + d.headingHp + '"/><w:szCs w:val="' + d.headingHp + '"/></w:rPr>\n'
      + '  </w:style>\n'
      + '  <w:style w:type="paragraph" w:styleId="Directions">\n'
      + '    <w:name w:val="Directions"/>\n'
      + '    <w:basedOn w:val="Normal"/>\n'
      + '    <w:pPr><w:keepNext/><w:spacing w:before="20" w:after="' + d.secAfter + '"/></w:pPr>\n'
      + '    <w:rPr><w:i/><w:iCs/><w:color w:val="222222"/><w:sz w:val="' + d.dirHp + '"/><w:szCs w:val="' + d.dirHp + '"/></w:rPr>\n'
      + '  </w:style>\n'
      + '</w:styles>\n';
  }

  // ---------------------------------------------------------------------------
  // Embedded PNG/JPEG Image Registry & Async Browser SVG-to-PNG Rasterizer
  // ---------------------------------------------------------------------------
  var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function decodeBase64ToUint8(b64) {
    var clean = String(b64 == null ? '' : b64).replace(/[\s\r\n]+/g, '');
    if (!clean) return null;
    if (typeof Buffer === 'function' && typeof Buffer.from === 'function') {
      try {
        var buf = Buffer.from(clean, 'base64');
        var outNode = new Uint8Array(buf.length);
        outNode.set(buf);
        return outNode;
      } catch (_) {}
    }
    if (typeof atob === 'function') {
      try {
        var bin = atob(clean);
        var outDom = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) outDom[i] = bin.charCodeAt(i) & 0xFF;
        return outDom;
      } catch (_) {}
    }
    var trimmed = clean.replace(/=+$/, '');
    var byteLen = Math.floor((trimmed.length * 3) / 4);
    var out = new Uint8Array(byteLen);
    var p = 0;
    for (var j = 0; j < trimmed.length; j += 4) {
      var a = B64_CHARS.indexOf(trimmed.charAt(j));
      var b = B64_CHARS.indexOf(trimmed.charAt(j + 1));
      var c = j + 2 < trimmed.length ? B64_CHARS.indexOf(trimmed.charAt(j + 2)) : 0;
      var d = j + 3 < trimmed.length ? B64_CHARS.indexOf(trimmed.charAt(j + 3)) : 0;
      if (a < 0 || b < 0 || c < 0 || d < 0) return null;
      var triple = (a << 18) | (b << 12) | (c << 6) | d;
      if (p < byteLen) out[p++] = (triple >>> 16) & 0xFF;
      if (p < byteLen) out[p++] = (triple >>> 8) & 0xFF;
      if (p < byteLen) out[p++] = triple & 0xFF;
    }
    return out;
  }

  function readPngDimensions(bytes) {
    if (!bytes || bytes.length < 24) return null;
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47
      || bytes[4] !== 0x0D || bytes[5] !== 0x0A || bytes[6] !== 0x1A || bytes[7] !== 0x0A) {
      return null;
    }
    if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
      return null;
    }
    var w = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
    var h = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
    if (!(w > 0 && h > 0)) return null;
    return { width: w, height: h };
  }

  function readJpegDimensions(bytes) {
    if (!bytes || bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;
    var pos = 2;
    while (pos + 1 < bytes.length) {
      while (pos < bytes.length && bytes[pos] === 0xFF) pos++;
      if (pos >= bytes.length) break;
      var code = bytes[pos++];
      if (code === 0xD9 || code === 0xDA) break;
      if ((code >= 0xD0 && code <= 0xD8) || code === 0x01) continue;
      if (pos + 1 >= bytes.length) break;
      var segLen = (bytes[pos] << 8) | bytes[pos + 1];
      if (segLen < 2 || pos + segLen > bytes.length) break;
      var isSof = (code >= 0xC0 && code <= 0xC3) || (code >= 0xC5 && code <= 0xC7)
        || (code >= 0xC9 && code <= 0xCB) || (code >= 0xCD && code <= 0xCF);
      if (isSof && segLen >= 7 && pos + 6 < bytes.length) {
        var h = (bytes[pos + 3] << 8) | bytes[pos + 4];
        var w = (bytes[pos + 5] << 8) | bytes[pos + 6];
        if (w > 0 && h > 0) return { width: w, height: h };
      }
      pos += segLen;
    }
    return null;
  }

  function isRasterDataUri(uri) {
    return typeof uri === 'string' && /^data:image\/(png|jpe?g)(?:;[^,]*)?;base64,/i.test(uri.trim());
  }

  function isSvgDataUri(uri) {
    return typeof uri === 'string' && /^data:image\/svg\+xml/i.test(uri.trim());
  }

  function drawingRunXml(drawingXml) {
    return drawingXml ? ('<w:r>' + drawingXml + '</w:r>') : '';
  }

  function createImageRegistry() {
    var images = [];
    var byUri = Object.create(null);
    var docPrSeq = 0;

    function addImage(dataUri, maxWIn, maxHIn, altText) {
      if (typeof dataUri !== 'string') return null;
      var trimmed = dataUri.trim();
      var match = /^data:image\/(png|jpe?g)(?:;[^,]*)?;base64,([\s\S]+)$/i.exec(trimmed);
      if (!match) return null;

      var entry = byUri[trimmed];
      if (!entry) {
        var isPng = match[1].toLowerCase() === 'png';
        var bytes = decodeBase64ToUint8(match[2]);
        if (!bytes || !bytes.length) return null;
        var dims = isPng ? readPngDimensions(bytes) : readJpegDimensions(bytes);
        if (!dims) return null;
        var idx = images.length + 1;
        var ext = isPng ? 'png' : 'jpg';
        var fileName = 'image' + idx + '.' + ext;
        var rId = 'rId' + (idx + 1); // rId1 is reserved for styles.xml
        entry = {
          index: idx,
          rId: rId,
          ext: ext,
          fileName: fileName,
          target: 'media/' + fileName,
          zipPath: 'word/media/' + fileName,
          bytes: bytes,
          width: dims.width,
          height: dims.height
        };
        images.push(entry);
        byUri[trimmed] = entry;
      }

      var maxW = (Number(maxWIn) > 0 ? Number(maxWIn) : 1.0) * EMU_PER_INCH;
      var maxH = (Number(maxHIn) > 0 ? Number(maxHIn) : (Number(maxWIn) > 0 ? Number(maxWIn) : 1.0)) * EMU_PER_INCH;
      var ratio = entry.width / entry.height;
      var cx;
      var cy;
      if ((maxW / maxH) > ratio) {
        cy = Math.max(1, Math.round(maxH));
        cx = Math.max(1, Math.round(maxH * ratio));
      } else {
        cx = Math.max(1, Math.round(maxW));
        cy = Math.max(1, Math.round(maxW / ratio));
      }

      docPrSeq += 1;
      var descr = xmlEsc(String(altText || ('Picture ' + docPrSeq)).trim());
      var picName = xmlEsc(entry.fileName);
      return '<w:drawing>'
        + '<wp:inline distT="0" distB="0" distL="0" distR="0">'
        + '<wp:extent cx="' + cx + '" cy="' + cy + '"/>'
        + '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
        + '<wp:docPr id="' + docPrSeq + '" name="Picture ' + docPrSeq + '" descr="' + descr + '"/>'
        + '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        + '<a:graphic>'
        + '<a:graphicData uri="' + NS_PIC + '">'
        + '<pic:pic>'
        + '<pic:nvPicPr>'
        + '<pic:cNvPr id="' + docPrSeq + '" name="' + picName + '" descr="' + descr + '"/>'
        + '<pic:cNvPicPr/>'
        + '</pic:nvPicPr>'
        + '<pic:blipFill>'
        + '<a:blip r:embed="' + entry.rId + '"/>'
        + '<a:stretch><a:fillRect/></a:stretch>'
        + '</pic:blipFill>'
        + '<pic:spPr>'
        + '<a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>'
        + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
        + '</pic:spPr>'
        + '</pic:pic>'
        + '</a:graphicData>'
        + '</a:graphic>'
        + '</wp:inline>'
        + '</w:drawing>';
    }

    return {
      addImage: addImage,
      list: function () { return images.slice(); },
      hasExt: function (ext) {
        return images.some(function (im) { return im.ext === ext; });
      }
    };
  }

  function rasterizeSvgDataUri(svgUri, w, d, opts) {
    if (!isSvgDataUri(svgUri)) return Promise.resolve(svgUri);
    if (!w || !d || typeof w.Image !== 'function' || typeof d.createElement !== 'function') {
      return Promise.resolve(svgUri);
    }
    var rOpts = opts && typeof opts === 'object' ? opts : {};
    var maxW = Number(rOpts.maxW) > 0 ? Math.min(960, Math.round(Number(rOpts.maxW))) : 0;
    var maxH = Number(rOpts.maxH) > 0 ? Math.min(480, Math.round(Number(rOpts.maxH))) : 0;
    var canvas = null;
    var ctx = null;
    try {
      canvas = d.createElement('canvas');
      if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.toDataURL !== 'function') {
        return Promise.resolve(svgUri);
      }
      if (w.navigator && /jsdom/i.test(String(w.navigator.userAgent || ''))
        && w.HTMLCanvasElement && canvas instanceof w.HTMLCanvasElement
        && canvas.getContext === w.HTMLCanvasElement.prototype.getContext) {
        return Promise.resolve(svgUri);
      }
      ctx = canvas.getContext('2d');
      if (!ctx || typeof ctx.drawImage !== 'function') return Promise.resolve(svgUri);
    } catch (_) {
      return Promise.resolve(svgUri);
    }

    return new Promise(function (resolve) {
      var settled = false;
      var timer = null;
      function finish(val) {
        if (settled) return;
        settled = true;
        if (timer != null && typeof w.clearTimeout === 'function') {
          try { w.clearTimeout(timer); } catch (_) {}
        }
        resolve(val);
      }

      if (typeof w.setTimeout === 'function') {
        timer = w.setTimeout(function () { finish(svgUri); }, 1500);
      }

      try {
        var img = new w.Image();
        img.onload = function () {
          try {
            var nw = Number(img.naturalWidth) || Number(img.width) || 180;
            var nh = Number(img.naturalHeight) || Number(img.height) || 180;
            var limW = maxW || (nw / Math.max(1, nh) > 1.8 ? 640 : 180);
            var limH = maxH || (nw / Math.max(1, nh) > 1.8 ? 220 : 180);
            var scale = Math.min(limW / nw, limH / nh);
            var cw = Math.max(1, Math.min(limW, Math.round(nw * scale)));
            var ch = Math.max(1, Math.min(limH, Math.round(nh * scale)));
            canvas.width = cw;
            canvas.height = ch;
            if (typeof ctx.clearRect === 'function') ctx.clearRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            var png = canvas.toDataURL('image/png');
            if (typeof png === 'string' && /^data:image\/png;base64,/i.test(png)) {
              finish(png);
              return;
            }
          } catch (_) {}
          finish(svgUri);
        };
        img.onerror = function () { finish(svgUri); };
        img.src = svgUri;
      } catch (_) {
        finish(svgUri);
      }
    });
  }

  function prepareImagesAsync(model, win, doc) {
    if (!model || typeof model !== 'object') return Promise.resolve(model);
    var w = win || (typeof window === 'object' && window !== null ? window : root);
    var d = doc || (w && w.document) || (typeof document === 'object' && document !== null ? document : null);
    var out = Object.assign({}, model);
    var cache = Object.create(null);
    var jobs = [];
    var wordUriMap = Object.create(null);
    var URI_KEYS = ['uri', 'imgUri', 'pictureUri', 'picture'];

    function queueRaster(svgUri, onDone, rOpts) {
      var trimmed = String(svgUri || '').trim();
      if (!isSvgDataUri(trimmed)) return;
      var dimTag = rOpts && (rOpts.maxW || rOpts.maxH) ? ('|' + (rOpts.maxW || 0) + 'x' + (rOpts.maxH || 0)) : '';
      var cacheKey = trimmed + dimTag;
      if (!cache[cacheKey]) {
        cache[cacheKey] = rasterizeSvgDataUri(trimmed, w, d, rOpts);
      }
      jobs.push(cache[cacheKey].then(function (resolved) {
        onDone(resolved);
      }));
    }

    function cloneAndQueueObj(item, wordHint) {
      if (!item || typeof item !== 'object') return item;
      var cloned = Object.assign({}, item);
      var wKey = wordHint ? String(wordHint).toLowerCase() : (cloned.word ? String(cloned.word).toLowerCase() : '');
      URI_KEYS.forEach(function (k) {
        if (typeof cloned[k] === 'string' && isSvgDataUri(cloned[k])) {
          queueRaster(cloned[k], function (pngUri) {
            cloned[k] = pngUri;
            if (wKey) wordUriMap[wKey] = pngUri;
          });
        } else if (typeof cloned[k] === 'string' && isRasterDataUri(cloned[k]) && wKey) {
          wordUriMap[wKey] = cloned[k];
        }
      });
      if (typeof cloned.aidUri === 'string' && isSvgDataUri(cloned.aidUri)) {
        queueRaster(cloned.aidUri, function (pngUri) {
          cloned.aidUri = pngUri;
        }, { maxW: 440, maxH: 220 });
      }
      if (typeof cloned.traceStripUri === 'string' && isSvgDataUri(cloned.traceStripUri)) {
        queueRaster(cloned.traceStripUri, function (pngUri) {
          cloned.traceStripUri = pngUri;
        }, { maxW: 720, maxH: 200 });
      }
      if (Array.isArray(cloned.parts)) {
        cloned.parts = cloned.parts.map(function (pt) {
          if (!pt || typeof pt !== 'object') return pt;
          var pClone = Object.assign({}, pt);
          if (typeof pClone.traceStripUri === 'string' && isSvgDataUri(pClone.traceStripUri)) {
            queueRaster(pClone.traceStripUri, function (pngUri) {
              pClone.traceStripUri = pngUri;
            }, { maxW: 720, maxH: 200 });
          }
          return pClone;
        });
      }
      if (Array.isArray(cloned.choices)) {
        cloned.choices = cloned.choices.map(function (ch) {
          if (!ch || typeof ch !== 'object') return ch;
          var cClone = Object.assign({}, ch);
          if (typeof cClone.pictureUri === 'string' && isSvgDataUri(cClone.pictureUri)) {
            queueRaster(cClone.pictureUri, function (pngUri) {
              cClone.pictureUri = pngUri;
            });
          }
          return cClone;
        });
      }
      return cloned;
    }

    if (Array.isArray(out.pictureItems)) {
      out.pictureItems = out.pictureItems.map(function (it) { return cloneAndQueueObj(it); });
    }
    if (Array.isArray(out.customSupports)) {
      out.customSupports = out.customSupports.map(function (sup) { return cloneAndQueueObj(sup); });
    }
    if (Array.isArray(out.cells)) {
      out.cells = out.cells.map(function (cell) { return cloneAndQueueObj(cell); });
    }
    if (Array.isArray(out.facts)) {
      out.facts = out.facts.map(function (fact) { return cloneAndQueueObj(fact); });
    }
    if (Array.isArray(out.cards)) {
      out.cards = out.cards.map(function (card) { return cloneAndQueueObj(card); });
    }
    if (Array.isArray(out.items)) {
      out.items = out.items.map(function (it) { return cloneAndQueueObj(it); });
    }
    if (out.images && typeof out.images === 'object') {
      if (Array.isArray(out.images)) {
        out.images = out.images.map(function (entry, idx) {
          if (typeof entry === 'string' && isSvgDataUri(entry)) {
            var slot = entry;
            queueRaster(entry, function (pngUri) { out.images[idx] = pngUri; });
            return slot;
          }
          return cloneAndQueueObj(entry);
        });
      } else {
        var imgMap = Object.assign({}, out.images);
        Object.keys(imgMap).forEach(function (key) {
          var val = imgMap[key];
          if (typeof val === 'string' && isSvgDataUri(val)) {
            queueRaster(val, function (pngUri) {
              imgMap[key] = pngUri;
              wordUriMap[String(key).toLowerCase()] = pngUri;
            });
          } else if (typeof val === 'string' && isRasterDataUri(val)) {
            wordUriMap[String(key).toLowerCase()] = val;
          }
        });
        out.images = imgMap;
      }
    }
    if (Array.isArray(out.sections)) {
      out.sections = out.sections.map(function (sec) {
        if (!sec || typeof sec !== 'object') return sec;
        var sClone = Object.assign({}, sec);
        if (Array.isArray(sClone.items)) {
          sClone.items = sClone.items.map(function (it) {
            if (!it || typeof it !== 'object') return it;
            var iClone = Object.assign({}, it);
            if (!iClone.pictureUri && typeof model.pictureFor === 'function' && iClone.word) {
              var fromFn = '';
              try { fromFn = model.pictureFor(iClone.word); } catch (_) { fromFn = ''; }
              if (typeof fromFn === 'string' && fromFn) iClone.pictureUri = fromFn;
            }
            return cloneAndQueueObj(iClone, iClone.word);
          });
        }
        if (Array.isArray(sClone.cards)) {
          sClone.cards = sClone.cards.map(function (c) { return cloneAndQueueObj(c); });
        }
        if (sClone.first && typeof sClone.first === 'object') {
          sClone.first = cloneAndQueueObj(sClone.first);
        }
        if (sClone.then && typeof sClone.then === 'object') {
          sClone.then = cloneAndQueueObj(sClone.then);
        }
        return sClone;
      });
    }

    if (typeof model.pictureFor === 'function') {
      var origPictureFor = model.pictureFor;
      out.pictureFor = function (word) {
        var key = String(word == null ? '' : word).toLowerCase();
        if (Object.prototype.hasOwnProperty.call(wordUriMap, key)) return wordUriMap[key];
        return origPictureFor(word);
      };
    }

    if (!jobs.length) return Promise.resolve(out);
    return Promise.all(jobs).then(function () { return out; });
  }

  function buildContentTypesXml(imgReg) {
    var mediaDefaults = '';
    if (imgReg && imgReg.hasExt('png')) {
      mediaDefaults += '  <Default Extension="png" ContentType="image/png"/>\n';
    }
    if (imgReg && imgReg.hasExt('jpg')) {
      mediaDefaults += '  <Default Extension="jpg" ContentType="image/jpeg"/>\n';
      mediaDefaults += '  <Default Extension="jpeg" ContentType="image/jpeg"/>\n';
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Types xmlns="' + NS_CT + '">\n'
      + '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
      + '  <Default Extension="xml" ContentType="application/xml"/>\n'
      + mediaDefaults
      + '  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>\n'
      + '  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>\n'
      + '</Types>\n';
  }

  function buildPackageRelsXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="' + NS_PKG_REL + '">\n'
      + '  <Relationship Id="rId1" Type="' + NS_REL_DOC + '" Target="word/document.xml"/>\n'
      + '</Relationships>\n';
  }

  function buildDocumentRelsXml(imgReg) {
    var imgRels = '';
    if (imgReg) {
      imgReg.list().forEach(function (im) {
        imgRels += '  <Relationship Id="' + im.rId + '" Type="' + NS_REL_IMAGE + '" Target="' + im.target + '"/>\n';
      });
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="' + NS_PKG_REL + '">\n'
      + '  <Relationship Id="rId1" Type="' + NS_REL_STYLES + '" Target="styles.xml"/>\n'
      + imgRels
      + '</Relationships>\n';
  }

  function buildDocumentXml(bodyXml, marginTw) {
    var m = Math.round(marginTw || 1008);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<w:document xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '" xmlns:wp="' + NS_WP + '" xmlns:a="' + NS_A + '" xmlns:pic="' + NS_PIC + '">\n'
      + '  <w:body>\n'
      + bodyXml + '\n'
      + '    <w:sectPr>\n'
      + '      <w:pgSz w:w="' + PAGE_W + '" w:h="' + PAGE_H + '"/>\n'
      + '      <w:pgMar w:top="' + m + '" w:right="' + m + '" w:bottom="' + m + '" w:left="' + m + '" w:header="720" w:footer="720" w:gutter="0"/>\n'
      + '    </w:sectPr>\n'
      + '  </w:body>\n'
      + '</w:document>\n';
  }

  function packageDocx(bodyXml, d, filename, opts, imgReg) {
    var zipLib = resolveZipLib(opts);
    var zip = zipLib.create();
    zip.add('[Content_Types].xml', buildContentTypesXml(imgReg));
    zip.add('_rels/.rels', buildPackageRelsXml());
    zip.add('word/_rels/document.xml.rels', buildDocumentRelsXml(imgReg));
    zip.add('word/styles.xml', buildStylesXml(d));
    zip.add('word/document.xml', buildDocumentXml(bodyXml, d.margin));
    if (imgReg) {
      imgReg.list().forEach(function (im) {
        zip.add(im.zipPath, im.bytes);
      });
    }
    var parts = zip.finish();
    var bytes = concatUint8(parts);
    return {
      parts: parts,
      bytes: bytes,
      size: bytes.length,
      filename: filename,
      mime: DOCX_MIME
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Word Sounds Activity Worksheet (.docx)
  // ---------------------------------------------------------------------------
  function buildSoundSortBoardsFromItems(items) {
    var byCat = Object.create(null);
    var order = [];
    (items || []).forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      var mode = it.mode === 'last' ? 'last' : 'first';
      var snd = String(it.sound || (it.word ? it.word.charAt(0) : 's'));
      var key = mode + '|' + snd.toLowerCase();
      if (!byCat[key]) {
        byCat[key] = { key: key, mode: mode, sound: snd, anchor: String(it.word || ''), members: [], distractors: [] };
        order.push(key);
      }
      var cat = byCat[key];
      (Array.isArray(it.chips) ? it.chips : []).forEach(function (ch) {
        var txt = typeof ch === 'string' ? ch : String((ch && ch.text) || '');
        if (!txt) return;
        var bucket = (typeof ch === 'object' && ch && ch.member === false) ? cat.distractors : cat.members;
        if (bucket.indexOf(txt) < 0) bucket.push(txt);
      });
      if (!cat.members.length && it.word) cat.members.push(String(it.word));
    });
    var boards = [];
    if (order.length === 1) {
      var sole = byCat[order[0]];
      var prep = sole.mode === 'last' ? 'Ends with ' : 'Starts with ';
      var neg = sole.mode === 'last' ? 'Does not end with ' : 'Does not start with ';
      boards.push({
        columns: [
          { heading: prep + soundLabel(sole.sound) + (sole.anchor ? ' (like ' + sole.anchor + ')' : ''), words: sole.members.slice() },
          { heading: neg + soundLabel(sole.sound), words: sole.distractors.slice() }
        ],
        bank: sole.members.concat(sole.distractors)
      });
    } else {
      for (var i = 0; i < order.length;) {
        var rem = order.length - i;
        var take = rem === 4 ? 2 : Math.min(3, rem);
        var slice = order.slice(i, i + take);
        var cols = [];
        var bank = [];
        var seen = Object.create(null);
        slice.forEach(function (k) {
          var c = byCat[k];
          var prep2 = c.mode === 'last' ? 'Ends with ' : 'Starts with ';
          var ws = c.members.length ? c.members.slice() : (c.anchor ? [c.anchor] : []);
          cols.push({ heading: prep2 + soundLabel(c.sound) + (c.anchor ? ' (like ' + c.anchor + ')' : ''), words: ws });
          ws.forEach(function (w) {
            var lw = w.toLowerCase();
            if (!seen[lw]) { seen[lw] = true; bank.push(w); }
          });
        });
        boards.push({ columns: cols, bank: bank });
        i += take;
      }
    }
    return boards;
  }

  function wsKeyLine(act, it) {
    var word = String(it.word || '');
    if (act === 'mapping') {
      var g = Array.isArray(it.graphemes) && it.graphemes.length ? it.graphemes.join(' \u00b7 ') : word;
      var sc = Number(it.soundCount) || (Array.isArray(it.phonemes) && it.phonemes.length) || word.length || 1;
      return word + ' \u2014 ' + g + ' (' + sc + ' ' + (sc === 1 ? 'sound' : 'sounds') + ')';
    }
    if (act === 'missing_letter') return word + ' \u2014 missing letter: ' + String(it.correctLetter || '');
    if (act === 'word_scramble') return word + (Array.isArray(it.tiles) && it.tiles.length ? ' (tiles: ' + it.tiles.join(', ') + ')' : '');
    if (act === 'counting') {
      var ans = String(it.answer || (Array.isArray(it.phonemes) ? it.phonemes.length : ''));
      var ph = Array.isArray(it.phonemes) && it.phonemes.length ? ' (' + it.phonemes.map(soundLabel).join(' ') + ')' : '';
      return word + ' \u2014 ' + ans + ' ' + (ans === '1' ? 'sound' : 'sounds') + ph;
    }
    if (act === 'isolation') return word + ' \u2014 ' + String(it.positionName || 'target') + ' sound: ' + soundLabel(it.correctSound || '');
    if (act === 'segmentation') {
      var sList = Array.isArray(it.sounds) ? it.sounds : (Array.isArray(it.phonemes) ? it.phonemes : []);
      var cnt = Number(it.slotCount) || sList.length || 1;
      return word + ' \u2014 ' + sList.map(soundLabel).join(' \u00b7 ') + ' (' + cnt + ' ' + (cnt === 1 ? 'sound' : 'sounds') + ')';
    }
    if (act === 'blending') return word + ' \u2014 Say: ' + (Array.isArray(it.sounds) ? it.sounds.map(soundLabel).join(' \u00b7 ') : word);
    if (act === 'rhyming') return word + ' \u2014 rhymes with: ' + String(it.answer || '');
    if (act === 'word_families') {
      var rime = String(it.rime || '');
      var mems = Array.isArray(it.members) && it.members.length
        ? it.members
        : (Array.isArray(it.chips) ? it.chips.filter(function (c) { return c && c.member; }).map(function (c) { return c.text; }) : []);
      return '-' + rime + ' family (like ' + word + ') \u2014 ' + (mems.length ? mems.join(', ') : 'any real word ending in -' + rime);
    }
    if (act === 'letter_tracing') {
      var parts = Array.isArray(it.parts) && it.parts.length ? it.parts.map(function (p) { return p.letter; }).join(' / ') : String(it.letter || word.charAt(0));
      return parts + ' (for ' + word + ') \u2014 Practice only';
    }
    if (act === 'orthography' || act === 'spelling_bee') {
      var oc = Number(it.soundCount) || (Array.isArray(it.phonemes) ? it.phonemes.length : word.length) || 1;
      var oph = Array.isArray(it.phonemes) && it.phonemes.length ? ': ' + it.phonemes.map(soundLabel).join(' ') : '';
      return 'Read aloud: "' + word + '" \u2014 Spelling: ' + word + ' (' + oc + ' ' + (oc === 1 ? 'sound' : 'sounds') + oph + ')';
    }
    if (act === 'syllable_counting') {
      var syls = Array.isArray(it.syllables) ? it.syllables : [];
      var sylN = Number(it.count) || syls.length || 1;
      return word + ' \u2014 ' + sylN + ' ' + (sylN === 1 ? 'syllable' : 'syllables') + (syls.length ? ' (' + syls.join(' \u00b7 ') + ')' : '');
    }
    if (act === 'syllable_blending') return word + ' \u2014 Say: ' + (Array.isArray(it.syllables) ? it.syllables.join(' \u00b7 ') : word);
    if (act === 'manipulation') return String(it.answer || word) + (it.prompt ? ' \u2014 Prompt: ' + it.prompt : '');
    if (act === 'decoding') return word;
    if (act === 'read_sentence') return String(it.answer || word) + ' \u2014 "' + String(it.before || '') + String(it.answer || word) + String(it.after || '') + '"';
    if (act === 'read_passage') return String(it.answer || word) + ' (Fluency reading check)';
    return String(it.answer || word || it.prompt || '');
  }

  function buildWordSoundsDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = resolveDensity(o.density || m.density);
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'Word Sounds Activity Worksheet').trim() || 'Word Sounds Activity Worksheet';
    var subtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var headerFields = o.headerFields || m.headerFields || {};
    var answerKeyOn = o.answerKeyOn !== undefined ? !!o.answerKeyOn
      : (o.answerKey !== undefined ? !!o.answerKey : (m.answerKeyOn !== undefined ? !!m.answerKeyOn : true));
    var hintsOn = o.hintsOn !== undefined ? !!o.hintsOn
      : (o.hints !== undefined ? !!o.hints : (m.hintsOn !== undefined ? !!m.hintsOn : true));
    var showListeningWords = o.showListeningWords !== undefined ? !!o.showListeningWords
      : (o.listeningWords !== undefined ? !!o.listeningWords
        : (m.showListeningWords !== undefined ? !!m.showListeningWords : false));
    var hiddenSections = o.hiddenSections || m.hiddenSections || null;
    var sectionOverrides = o.sectionOverrides || m.sectionOverrides || null;
    var rawSections = Array.isArray(m.sections) ? m.sections : [];
    var imgReg = createImageRegistry();

    function resolveWsItemImage(it) {
      if (!it || typeof it !== 'object') return '';
      var direct = it.pictureUri || it.imgUri || it.uri || '';
      if (direct && typeof direct === 'string') return direct;
      if (typeof m.pictureFor === 'function' && it.word) {
        try {
          var fromFn = m.pictureFor(it.word);
          if (fromFn && typeof fromFn === 'string') return fromFn;
        } catch (_) {}
      }
      if (m.images && typeof m.images === 'object' && !Array.isArray(m.images) && it.word) {
        var fromMap = m.images[it.word] || m.images[String(it.word).toLowerCase()];
        if (fromMap && typeof fromMap === 'string') return fromMap;
      }
      return '';
    }

    function wsLead(numRun, drawXml, runs) {
      if (!drawXml) return [numRun].concat(runs);
      return [numRun, drawingRunXml(drawXml), rXml('  ', { sz: d.bodyHp })].concat(runs);
    }

    var body = [];
    body.push(buildWorksheetHeaderXml(title, subtitle, headerFields, d, contentW, false));

    var keySections = [];
    var renderedAnySection = false;

    rawSections.forEach(function (sec, sIdx) {
      if (!sec || typeof sec !== 'object' || sec.hidden) return;
      var act = String(sec.activity || 'custom');
      if (isPartHidden(hiddenSections, [act, sec.id, String(sIdx)])) return;
      var visibleItems = (Array.isArray(sec.items) ? sec.items : []).filter(function (it) { return it && !it.hidden; });
      if (!visibleItems.length && !(act === 'sound_sort' && Array.isArray(sec.boards) && sec.boards.length)) return;

      renderedAnySection = true;
      var secLabel = overrideHeading(sectionOverrides, [act, sec.id, String(sIdx)], String(sec.label || act.replace(/_/g, ' ')));
      var secDir = overrideDirections(sectionOverrides, [act, sec.id, String(sIdx)], String(sec.directions || ''));
      body.push(sectionHeadXml(secLabel, secDir, d, false));

      if (act === 'sound_sort') {
        var boards = Array.isArray(sec.boards) && sec.boards.length ? sec.boards : buildSoundSortBoardsFromItems(visibleItems);
        var sortKeyLines = [];
        boards.forEach(function (b) {
          var bankWords = Array.isArray(b.bank) ? b.bank : [];
          if (bankWords.length) {
            body.push(shadedBoxXml(
              pXml([
                rXml('Word Bank:  ', { bold: true, sz: d.bodyHp }),
                rXml(bankWords.join('   \u2022   '), { bold: true, sz: d.bodyHp })
              ], { before: 20, after: 20 }),
              contentW,
              d,
              { shade: 'F3F4F6', borderSz: 8 }
            ));
            body.push(pXml('', { before: 40, after: 40 }));
          }
          var cols = Array.isArray(b.columns) && b.columns.length ? b.columns : [{ heading: 'Group 1', words: [] }, { heading: 'Group 2', words: [] }];
          var colCount = cols.length;
          var colW = Math.floor(contentW / colCount);
          var widths = cols.map(function (_, ci) { return ci === colCount - 1 ? contentW - colW * (colCount - 1) : colW; });
          var headCells = cols.map(function (col, ci) {
            sortKeyLines.push(col.heading + ': ' + (col.words && col.words.length ? col.words.join(', ') : '(none)'));
            return cellXml(
              pXml([rXml(col.heading, { bold: true, sz: d.bodyHp })], { before: 30, after: 30, align: 'center' }),
              widths[ci],
              { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
            );
          });
          var maxRows = cols.reduce(function (mx, c) { return Math.max(mx, (c.words ? c.words.length : 0) + 1); }, 4);
          var tableRows = [rowXml(headCells, { cantSplit: true, header: true })];
          for (var ri = 0; ri < maxRows; ri++) {
            var rowCells = widths.map(function (w) {
              return cellXml(pXml('', { before: 0, after: 0 }), w, { padV: d.cellPadV, padH: d.cellPadH });
            });
            tableRows.push(rowXml(rowCells, { cantSplit: true, height: d.writeLineHeight, hRule: 'atLeast' }));
          }
          body.push(tableXml(widths, tableRows, {
            borders: 'w:val="single" w:sz="8" w:space="0" w:color="000000"',
            padV: d.cellPadV,
            padH: d.cellPadH
          }));
          body.push(pXml('', { before: 40, after: 60 }));
        });
        keySections.push({ heading: secLabel, lines: sortKeyLines });
        return;
      }

      var secKeyLines = [];
      visibleItems.forEach(function (it, idx) {
        var n = idx + 1;
        var numRun = rXml(n + '.  ', { bold: true, sz: d.bodyHp });
        var isListeningAct = act === 'counting' || act === 'isolation' || act === 'segmentation'
          || act === 'syllable_counting' || act === 'blending' || act === 'syllable_blending';
        var hideItemPic = act === 'blending' || act === 'syllable_blending' || act === 'decoding';
        var wsPicUri = hideItemPic ? '' : resolveWsItemImage(it);
        var isNeutralAlt = act === 'orthography' || act === 'spelling_bee'
          || act === 'mapping' || act === 'missing_letter' || act === 'word_scramble'
          || (isListeningAct && !showListeningWords);
        var wsPicAlt = (act === 'orthography' || act === 'spelling_bee')
          ? ('Word #' + n)
          : (isNeutralAlt ? ('Picture clue ' + n) : String(it.word || ('Item ' + n)));
        var itemDraw = wsPicUri ? imgReg.addImage(wsPicUri, 0.65, 0.65, wsPicAlt) : null;
        var cp = String(it.customPrompt || '').trim();
        var cpPrefix = cp ? [rXml(cp + '  ', { sz: d.bodyHp, color: '222222' })] : [];

        if (act === 'mapping') {
          var boxCount = Number(it.soundCount) || (Array.isArray(it.phonemes) && it.phonemes.length) || String(it.word || '').length || 3;
          var mapLeadText = cp || (itemDraw ? 'Say the word and write each sound in a box:' : 'Listen to your teacher: write each sound in a box.');
          body.push(pXml(wsLead(numRun, itemDraw, [
            rXml(mapLeadText, { sz: d.bodyHp, color: '222222' })
          ]), { before: d.itemBefore, after: 50, keepNext: true }));
          body.push(soundBoxesTableXml(boxCount, d, contentW));
          if (hintsOn && Array.isArray(it.bank) && it.bank.length) {
            body.push(pXml([
              rXml('Letter bank:  ', { bold: true, sz: d.smallHp }),
              rXml(it.bank.map(function (g) { return '[ ' + choiceText(g) + ' ]'; }).join('   '), { bold: true, sz: d.bodyHp })
            ], { before: 60, after: d.itemAfter, indentLeft: 240, keepLines: true }));
          } else {
            body.push(pXml('', { before: 0, after: d.itemAfter }));
          }
        } else if (act === 'missing_letter') {
          var letters = Array.isArray(it.letters) && it.letters.length ? it.letters : String(it.word || '').split('');
          var hiddenIdx = Number.isInteger(it.hiddenIndex) ? it.hiddenIndex : (letters.length > 2 ? 1 : 0);
          var disp = letters.map(function (ch, ci) { return ci === hiddenIdx ? '___' : String(ch); }).join(' ');
          var mlPrefix = cpPrefix.length ? cpPrefix : (!itemDraw ? [rXml('Listen to your teacher:  ', { italic: true, sz: d.bodyHp, color: '222222' })] : []);
          body.push(pXml(wsLead(numRun, itemDraw, mlPrefix.concat([
            rXml(disp, { bold: true, sz: d.wordHp })
          ])), { before: d.itemBefore, after: 50, keepNext: true }));
          if (Array.isArray(it.choices) && it.choices.length) {
            body.push(pXml([
              rXml('Choices:  ', { bold: true, sz: d.smallHp }),
              rXml(it.choices.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 30, after: d.itemAfter, indentLeft: 320, keepLines: true }));
          }
        } else if (act === 'word_scramble') {
          var tiles = Array.isArray(it.tiles) && it.tiles.length ? it.tiles : String(it.word || '').split('');
          var scrLeadText = cp || (itemDraw ? 'Unscramble the letters:' : 'Listen to your teacher: unscramble the letters.');
          body.push(pXml(wsLead(numRun, itemDraw, [rXml(scrLeadText, { sz: d.bodyHp, color: '222222' })]), { before: d.itemBefore, after: 50, keepNext: true }));
          body.push(letterTilesTableXml(tiles.map(choiceText), d, contentW));
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 240, after: d.itemAfter }));
        } else if (act === 'counting') {
          var vals = Array.isArray(it.values) && it.values.length ? it.values : ['1', '2', '3', '4', '5', '6'];
          var ctRuns = showListeningWords
            ? cpPrefix.concat([rXml(String(it.word || ''), { bold: true, sz: d.wordHp })])
            : cpPrefix.concat([rXml('Listen to your teacher:', { italic: true, sz: d.bodyHp, color: '222222' })]);
          body.push(pXml(wsLead(numRun, itemDraw, ctRuns), { before: d.itemBefore, after: 50, keepNext: true }));
          body.push(pXml([
            rXml('Sounds:  ', { bold: true, sz: d.smallHp }),
            rXml(vals.map(function (v) { return '( ' + choiceText(v) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
          ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
        } else if (act === 'isolation') {
          var isoChoices = Array.isArray(it.choices) ? it.choices : [];
          var isoRuns = cp
            ? [rXml(cp, { bold: true, sz: d.bodyHp })]
            : (showListeningWords
              ? [
                  rXml('What is the ' + String(it.positionName || 'target') + ' sound in ', { sz: d.bodyHp }),
                  rXml(String(it.word || ''), { bold: true, sz: d.wordHp }),
                  rXml('?', { sz: d.bodyHp })
                ]
              : [
                  rXml('Listen to your teacher: What is the ' + String(it.positionName || 'target') + ' sound?', { sz: d.bodyHp })
                ]);
          body.push(pXml(wsLead(numRun, itemDraw, isoRuns), { before: d.itemBefore, after: 50, keepNext: true }));
          if (isoChoices.length) {
            body.push(pXml([
              rXml('Circle one:  ', { bold: true, sz: d.smallHp }),
              rXml(isoChoices.map(function (c) { return '( ' + soundLabel(choiceText(c)) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
          }
        } else if (act === 'segmentation') {
          var slotN = Math.max(1, Math.min(10, Number(it.slotCount) || (Array.isArray(it.sounds) ? it.sounds.length : 3)));
          var circles = [];
          for (var ci = 0; ci < slotN; ci++) circles.push('\u25CB');
          var segLead = showListeningWords
            ? rXml(String(it.word || '') + '    ', { bold: true, sz: d.wordHp })
            : rXml('Listen to your teacher:    ', { italic: true, sz: d.bodyHp, color: '222222' });
          body.push(pXml(wsLead(numRun, itemDraw, cpPrefix.concat([
            segLead,
            rXml(circles.join('   '), { sz: d.wordHp })
          ])), { before: d.itemBefore, after: 40, keepNext: true }));
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 320, after: 50 }));
          if (hintsOn && Array.isArray(it.chips) && it.chips.length) {
            body.push(pXml([
              rXml('Sound bank:  ', { bold: true, sz: d.smallHp }),
              rXml(it.chips.map(function (s) { return '[ ' + soundLabel(choiceText(s)) + ' ]'; }).join('   '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
          }
        } else if (act === 'blending') {
          var seq = Array.isArray(it.sounds) && it.sounds.length ? it.sounds.map(function (s) { return soundLabel(choiceText(s)); }).join('  \u00b7  ') : '';
          var blRuns = showListeningWords
            ? cpPrefix.concat([rXml(seq, { bold: true, sz: d.wordHp })])
            : cpPrefix.concat([rXml('Listen to your teacher:', { italic: true, sz: d.bodyHp, color: '222222' })]);
          body.push(pXml(wsLead(numRun, null, blRuns), { before: d.itemBefore, after: 40, keepNext: true }));
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 320, after: 50 }));
          if (Array.isArray(it.choices) && it.choices.length) {
            body.push(pXml([
              rXml('Choices:  ', { bold: true, sz: d.smallHp }),
              rXml(it.choices.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
          }
        } else if (act === 'rhyming') {
          body.push(pXml(wsLead(numRun, itemDraw, cp
            ? [rXml(cp, { bold: true, sz: d.bodyHp })]
            : [
                rXml('Circle the word that rhymes with ', { sz: d.bodyHp }),
                rXml(String(it.word || ''), { bold: true, sz: d.wordHp }),
                rXml(':', { sz: d.bodyHp })
              ]), { before: d.itemBefore, after: 50, keepNext: true }));
          if (Array.isArray(it.choices) && it.choices.length) {
            body.push(pXml([
              rXml(it.choices.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
          }
        } else if (act === 'word_families') {
          var rime = String(it.rime || '');
          body.push(pXml(wsLead(numRun, itemDraw, cp
            ? [rXml(cp, { bold: true, sz: d.bodyHp })]
            : [
                rXml('Word family: ', { sz: d.bodyHp }),
                rXml('-' + rime, { bold: true, sz: d.wordHp }),
                rXml(it.word ? '  (like ' + it.word + ')' : '', { sz: d.bodyHp })
              ]), { before: d.itemBefore, after: 50, keepNext: true }));
          if (Array.isArray(it.chips) && it.chips.length) {
            body.push(pXml([
              rXml('Circle family words:  ', { bold: true, sz: d.smallHp }),
              rXml(it.chips.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: 60, indentLeft: 320, keepLines: true }));
          }
          body.push(pXml([
            rXml('Build words:  ', { bold: true, sz: d.smallHp }),
            rXml('_______' + rime + '      _______' + rime + '      _______' + rime, { bold: true, sz: d.wordHp - 2 })
          ], { before: 30, after: d.itemAfter, indentLeft: 320, keepLines: true }));
        } else if (act === 'letter_tracing') {
          var parts = Array.isArray(it.parts) && it.parts.length
            ? it.parts
            : [{ letter: String(it.letter || String(it.word || 'A').charAt(0) || 'A'), kind: 'letter' }];
          body.push(pXml(wsLead(numRun, itemDraw, cp
            ? [rXml(cp, { bold: true, sz: d.bodyHp })]
            : [
                rXml('Trace ', { sz: d.bodyHp }),
                rXml(parts.map(function (p) { return p.letter; }).join(' and '), { bold: true, sz: d.bodyHp }),
                rXml(it.word ? ' (for ' + it.word + ')' : '', { sz: d.bodyHp })
              ]), { before: d.itemBefore, after: 50, keepNext: true }));
          parts.forEach(function (part) {
            var ch = String(part.letter || '');
            var stripDraw = part.traceStripUri
              ? imgReg.addImage(
                  part.traceStripUri,
                  Math.min(6.3, (contentW / 1440) - 0.25),
                  d.name === 'primary' ? 1.5 : (d.name === 'compact' ? 0.95 : 1.2),
                  'Primary tracing strip for letter ' + ch
                )
              : '';
            if (stripDraw) {
              body.push(pXml([drawingRunXml(stripDraw)], {
                before: 40,
                after: part.strokeCue ? 20 : 60,
                indentLeft: 200,
                keepLines: true,
                keepNext: !!part.strokeCue
              }));
            } else {
              var guideRow = pXml([
                rXml(ch + '    ' + ch + '    ' + ch + '    ', { sz: d.traceHp, color: '999999' })
              ], {
                before: 60,
                after: part.strokeCue ? 25 : 60,
                borders: {
                  top: 'w:val="single" w:sz="8" w:space="4" w:color="000000"',
                  bottom: 'w:val="single" w:sz="10" w:space="4" w:color="000000"'
                },
                indentLeft: 240,
                keepLines: true
              });
              body.push(guideRow);
            }
            if (part.strokeCue) {
              body.push(pXml([
                rXml(String(part.strokeCue), { italic: true, sz: Math.max(16, d.smallHp - 1), color: '444444' })
              ], { before: 0, after: 55, indentLeft: 240, keepLines: true }));
            }
          });
          body.push(pXml('', { before: 0, after: d.itemAfter }));
        } else if (act === 'orthography' || act === 'spelling_bee') {
          body.push(pXml(wsLead(numRun, itemDraw, [
            rXml(cp || ('Listen to your teacher and write word #' + n + ':'), { bold: true, sz: d.bodyHp })
          ]), { before: d.itemBefore, after: 50, keepNext: true }));
          if (hintsOn) {
            var sCnt = it.lengthHint ? String(it.word || '').length : (Number(it.soundCount) || String(it.word || '').length || 3);
            body.push(soundBoxesTableXml(sCnt, d, contentW));
            if (Array.isArray(it.letterBank) && it.letterBank.length) {
              body.push(pXml([
                rXml('Letters:  ', { bold: true, sz: d.smallHp }),
                rXml(it.letterBank.map(function (l) { return '[ ' + choiceText(l) + ' ]'; }).join('   '), { bold: true, sz: d.bodyHp })
              ], { before: 40, after: 40, indentLeft: 240, keepLines: true }));
            }
          }
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 240, after: d.itemAfter }));
        } else if (act === 'syllable_counting') {
          var sVals = Array.isArray(it.values) && it.values.length ? it.values : ['1', '2', '3', '4', '5'];
          var scRuns = showListeningWords
            ? cpPrefix.concat([rXml(String(it.word || ''), { bold: true, sz: d.wordHp })])
            : cpPrefix.concat([rXml('Listen to your teacher:', { italic: true, sz: d.bodyHp, color: '222222' })]);
          body.push(pXml(wsLead(numRun, itemDraw, scRuns), { before: d.itemBefore, after: 50, keepNext: true }));
          body.push(pXml([
            rXml('Syllables:  ', { bold: true, sz: d.smallHp }),
            rXml(sVals.map(function (v) { return '( ' + choiceText(v) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
          ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
        } else if (act === 'syllable_blending') {
          var sylSeq = Array.isArray(it.syllables) ? it.syllables.map(choiceText).join('  \u00b7  ') : '';
          var sbRuns = showListeningWords
            ? cpPrefix.concat([rXml(sylSeq, { bold: true, sz: d.wordHp })])
            : cpPrefix.concat([rXml('Listen to your teacher:', { italic: true, sz: d.bodyHp, color: '222222' })]);
          body.push(pXml(wsLead(numRun, null, sbRuns), { before: d.itemBefore, after: 40, keepNext: true }));
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 320, after: 50 }));
          if (Array.isArray(it.choices) && it.choices.length) {
            body.push(pXml([
              rXml('Choices:  ', { bold: true, sz: d.smallHp }),
              rXml(it.choices.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
          }
        } else if (act === 'manipulation') {
          body.push(pXml(wsLead(numRun, itemDraw, [rXml(cp || String(it.prompt || it.word || ''), { bold: true, sz: d.bodyHp })]), { before: d.itemBefore, after: 40, keepNext: true }));
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 320, after: 50 }));
          if (Array.isArray(it.choices) && it.choices.length) {
            body.push(pXml([
              rXml('Choices:  ', { bold: true, sz: d.smallHp }),
              rXml(it.choices.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: d.itemAfter, indentLeft: 320, keepLines: true }));
          }
        } else if (act === 'decoding') {
          body.push(pXml(wsLead(numRun, null, cpPrefix.concat([
            rXml(String(it.word || ''), { bold: true, sz: d.wordHp }),
            rXml('      \u2610 Read aloud     \u2610 Read smoothly', { sz: d.smallHp })
          ])), { before: d.itemBefore, after: d.itemAfter, keepLines: true }));
          if (Array.isArray(it.choices) && it.choices.length) {
            var decChoiceDraws = [];
            it.choices.forEach(function (c) {
              var cUri = c && typeof c === 'object' ? (c.pictureUri || c.imgUri || c.uri || '') : '';
              if (cUri && isRasterDataUri(cUri)) {
                var cd = imgReg.addImage(cUri, 0.5, 0.5, 'Picture choice');
                if (cd) decChoiceDraws.push(cd);
              }
            });
            if (decChoiceDraws.length >= 2) {
              var decPicRuns = [];
              decChoiceDraws.forEach(function (cd, cdi) {
                if (cdi > 0) decPicRuns.push(rXml('      ', { sz: d.bodyHp }));
                decPicRuns.push(drawingRunXml(cd));
              });
              body.push(pXml(decPicRuns, { before: 0, after: d.itemAfter, indentLeft: 320, keepLines: true }));
            }
          }
        } else if (act === 'read_sentence') {
          body.push(pXml(wsLead(numRun, itemDraw, cpPrefix.concat([
            rXml(String(it.before || '') + '______________' + String(it.after || ''), { sz: d.bodyHp })
          ])), { before: d.itemBefore, after: 40, keepNext: true }));
          var rsOpts = Array.isArray(it.options) ? it.options : (Array.isArray(it.choices) ? it.choices : []);
          if (rsOpts.length) {
            body.push(pXml([
              rXml('Choices:  ', { bold: true, sz: d.smallHp }),
              rXml(rsOpts.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: 40, indentLeft: 320, keepLines: true }));
          }
          body.push(pXml([rXml('\u2610 Read the completed sentence aloud', { sz: d.smallHp })], { before: 0, after: d.itemAfter, indentLeft: 320 }));
        } else if (act === 'read_passage') {
          var rpParas = (Array.isArray(it.lines) ? it.lines : []).map(function (ln) {
            var lineText = typeof ln === 'string'
              ? ln
              : ((ln && (ln.before != null || ln.after != null))
                ? String(ln.before || '') + '______________' + String(ln.after || '')
                : String((ln && ln.text) || ''));
            return pXml([rXml(lineText, { sz: d.bodyHp })], { before: 20, after: 50 });
          });
          body.push(pXml(wsLead(numRun, itemDraw, [rXml(cp || 'Read the story:', { bold: true, sz: d.bodyHp })]), { before: d.itemBefore, after: 40, keepNext: true }));
          body.push(shadedBoxXml(rpParas.length ? rpParas : [pXml('')], contentW, d, { shade: 'FFFFFF', borderSz: 8 }));
          body.push(pXml([rXml('\u2610 1st read      \u2610 2nd read      \u2610 3rd read', { sz: d.smallHp })], { before: 50, after: 50, indentLeft: 180 }));
          var rpOpts = Array.isArray(it.options) ? it.options : [];
          if (rpOpts.length) {
            body.push(pXml([
              rXml(rpOpts.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: d.itemAfter, indentLeft: 180 }));
          } else {
            body.push(writingLineXml(d, { dashedTop: true, indentLeft: 180, after: d.itemAfter }));
          }
        } else {
          var fallbackText = cp || String(it.prompt || it.word || '');
          body.push(pXml(wsLead(numRun, itemDraw, [rXml(fallbackText, { bold: !it.prompt && !cp, sz: (it.prompt || cp) ? d.bodyHp : d.wordHp })]), { before: d.itemBefore, after: 40, keepNext: true }));
          var fbChoices = Array.isArray(it.choices) ? it.choices : (Array.isArray(it.options) ? it.options : []);
          if (fbChoices.length) {
            body.push(pXml([
              rXml(fbChoices.map(function (c) { return '( ' + choiceText(c) + ' )'; }).join('    '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: 50, indentLeft: 320 }));
          }
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 320, after: d.itemAfter }));
        }

        secKeyLines.push(wsKeyLine(act, it));
      });

      keySections.push({ heading: secLabel, lines: secKeyLines });
    });

    if (!renderedAnySection) {
      body.push(pXml([rXml('No worksheet items are available yet.', { italic: true, sz: d.bodyHp })], { before: 140, after: 120 }));
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));
    if (answerKeyOn && keySections.length) {
      body.push(answerKeyXml('Teacher Answer Key & Read-Aloud List', keySections, d, contentW));
    }

    var filename = ensureDocxFilename(o.filename, slug(title, 'word-sounds') + '-worksheet');
    return packageDocx(body.join('\n'), d, filename, o, imgReg);
  }

  // ---------------------------------------------------------------------------
  // 2. Vocabulary Practice Worksheet (.docx)
  // ---------------------------------------------------------------------------
  function buildMatchingTableXml(words, defs, d, contentW, isRtl) {
    var leftW = Math.round(contentW * 0.42);
    var rightW = contentW - leftW;
    var maxRows = Math.max(words.length, defs.length);
    var rows = [];
    for (var i = 0; i < maxRows; i++) {
      var wItem = words[i];
      var dItem = defs[i];
      var leftP = wItem
        ? pXml([
            rXml(String(wItem.num != null ? wItem.num : (i + 1)) + '.  ', { bold: true, sz: d.bodyHp, rtl: isRtl }),
            rXml('_____  ', { sz: d.bodyHp }),
            rXml(String(wItem.word || ''), { bold: true, sz: d.bodyHp + 2, rtl: isRtl })
          ], { before: 40, after: 50, bidi: isRtl, align: isRtl ? 'right' : 'left' })
        : pXml('', { before: 0, after: 0 });
      var rightP = dItem
        ? pXml([
            rXml(String(dItem.letter || letterLabel(i)) + '.  ', { bold: true, sz: d.bodyHp, rtl: isRtl }),
            rXml(String(dItem.meaning || ''), { sz: d.bodyHp, rtl: isRtl })
          ], { before: 40, after: 50, bidi: isRtl, align: isRtl ? 'right' : 'left' })
        : pXml('', { before: 0, after: 0 });
      rows.push(rowXml([
        cellXml(leftP, leftW, { padV: d.cellPadV, padH: d.cellPadH }),
        cellXml(rightP, rightW, { padV: d.cellPadV, padH: d.cellPadH })
      ], { cantSplit: true }));
    }
    return tableXml([leftW, rightW], rows, {
      borders: {
        top: 'w:val="single" w:sz="6" w:space="0" w:color="000000"',
        left: 'none',
        right: 'none',
        bottom: 'w:val="single" w:sz="6" w:space="0" w:color="000000"',
        insideH: 'w:val="single" w:sz="4" w:space="0" w:color="999999"',
        insideV: 'w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"'
      },
      bidiVisual: isRtl,
      padV: d.cellPadV,
      padH: d.cellPadH
    });
  }

  function buildVocabDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = resolveDensity(o.density || m.density);
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'Vocabulary Practice Worksheet').trim() || 'Vocabulary Practice Worksheet';
    var subtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var headerFields = o.headerFields || m.headerFields || {};
    var wordBankOn = o.wordBankOn !== undefined ? !!o.wordBankOn
      : (m.wordBankOn !== undefined ? !!m.wordBankOn : true);
    var answerKeyOn = o.answerKeyOn !== undefined ? !!o.answerKeyOn
      : (o.answerKey !== undefined ? !!o.answerKey : (m.answerKeyOn !== undefined ? !!m.answerKeyOn : true));
    var hiddenParts = o.hiddenParts || m.hiddenParts || null;
    var sectionOverrides = o.sectionOverrides || m.sectionOverrides || null;

    var wordBank = Array.isArray(m.wordBank) ? m.wordBank.map(choiceText).filter(Boolean) : [];
    var matchWords = Array.isArray(m.matchWords) ? m.matchWords : [];
    var matchDefs = Array.isArray(m.matchDefs) ? m.matchDefs : [];
    var clozeItems = Array.isArray(m.clozeItems) ? m.clozeItems : [];
    var pictureItems = Array.isArray(m.pictureItems) ? m.pictureItems : [];
    var entries = Array.isArray(m.entries) ? m.entries : [];
    var imgReg = createImageRegistry();

    var body = [];
    body.push(buildWorksheetHeaderXml(title, subtitle, headerFields, d, contentW, false));

    // Word Bank shaded box
    if (wordBankOn && wordBank.length && !isPartHidden(hiddenParts, ['wordBank', 'word_bank', 'bank'])) {
      body.push(pXml('', { before: 60, after: 20 }));
      body.push(shadedBoxXml(
        pXml([
          rXml('Word Bank:  ', { bold: true, sz: d.bodyHp }),
          rXml(wordBank.join('   \u2022   '), { bold: true, sz: d.bodyHp })
        ], { before: 25, after: 25 }),
        contentW,
        d,
        { shade: 'F2F2F2', borderSz: 10 }
      ));
    }

    var keySections = [];
    var renderedAny = false;

    // Part 1 — Matching (or Write Each Meaning fallback)
    if (!isPartHidden(hiddenParts, ['matching', 'part1'])) {
      if (matchWords.length) {
        renderedAny = true;
        var p1Head = overrideHeading(sectionOverrides, ['matching', 'part1'], 'Part 1 \u2014 Match the Word to Its Meaning');
        var p1Dir = overrideDirections(sectionOverrides, ['matching', 'part1'], 'Write the letter of the matching meaning on the line next to each word.');
        body.push(sectionHeadXml(p1Head, p1Dir, d, false));
        body.push(buildMatchingTableXml(matchWords, matchDefs, d, contentW, false));
        keySections.push({
          heading: p1Head,
          lines: matchWords.map(function (it) {
            return String(it.word || '') + ' \u2014 ' + String(it.answerLetter || '') + (it.meaning ? ' (' + it.meaning + ')' : '');
          })
        });
      } else if (entries.length) {
        renderedAny = true;
        var p1fHead = overrideHeading(sectionOverrides, ['matching', 'part1'], 'Part 1 \u2014 Write Each Meaning');
        var p1fDir = overrideDirections(sectionOverrides, ['matching', 'part1'], 'Write what each vocabulary word means on the line.');
        body.push(sectionHeadXml(p1fHead, p1fDir, d, false));
        entries.forEach(function (e, idx) {
          body.push(pXml([
            rXml((idx + 1) + '.  ', { bold: true, sz: d.bodyHp }),
            rXml(String(e.word || ''), { bold: true, sz: d.wordHp - 2 })
          ], { before: d.itemBefore, after: 30, keepNext: true }));
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 320, after: d.itemAfter }));
        });
        keySections.push({
          heading: p1fHead,
          lines: entries.map(function (e) { return String(e.word || '') + ' \u2014 Teacher-checked student meaning.'; })
        });
      }
    }

    // Part 2 — Fill in the Blank
    if (!isPartHidden(hiddenParts, ['cloze', 'part2']) && clozeItems.length) {
      renderedAny = true;
      var p2Head = overrideHeading(sectionOverrides, ['cloze', 'part2'], 'Part 2 \u2014 Fill in the Blank');
      var defaultClozeDir = wordBankOn
        ? 'Choose a word from the Word Bank to complete each sentence. Write the word on the line.'
        : 'Write the vocabulary word that best completes each sentence.';
      var p2Dir = overrideDirections(sectionOverrides, ['cloze', 'part2'], defaultClozeDir);
      body.push(sectionHeadXml(p2Head, p2Dir, d, false));

      clozeItems.forEach(function (item, idx) {
        var n = item.num != null ? item.num : (idx + 1);
        var isCloze = item.hasCloze !== false && (item.before != null || item.after != null);
        if (isCloze) {
          body.push(pXml([
            rXml(n + '.  ', { bold: true, sz: d.bodyHp }),
            rXml(String(item.before || ''), { sz: d.bodyHp }),
            rXml('__________________', { sz: d.bodyHp }),
            rXml(String(item.after || ''), { sz: d.bodyHp })
          ], { before: d.itemBefore, after: d.itemAfter, indentLeft: 320, hanging: 320, keepLines: true }));
        } else {
          var promptText = String(item.prompt || ('Write your own sentence using the word "' + String(item.word || '') + '":'));
          body.push(pXml([
            rXml(n + '.  ', { bold: true, sz: d.bodyHp }),
            rXml(promptText, { sz: d.bodyHp })
          ], { before: d.itemBefore, after: 40, keepNext: true }));
          body.push(writingLineXml(d, { dashedTop: true, indentLeft: 320, after: d.itemAfter }));
        }
      });

      keySections.push({
        heading: p2Head,
        lines: clozeItems.map(function (item) {
          var isCloze = item.hasCloze !== false && (item.before != null || item.after != null);
          if (isCloze) {
            var ans = String(item.answer || item.word || '');
            var comp = String(item.completed || (String(item.before || '') + ans + String(item.after || '')));
            return ans + ' \u2014 "' + comp + '"';
          }
          return String(item.word || '') + ' \u2014 Answers will vary (sentence using "' + String(item.word || '') + '").';
        })
      });
    }

    // Part 3 — Name the Picture (embedded PNG/JPEG illustrations with clean fallback)
    if (!isPartHidden(hiddenParts, ['pictures', 'part3']) && pictureItems.length) {
      renderedAny = true;
      var p3Head = overrideHeading(sectionOverrides, ['pictures', 'part3'], 'Part 3 \u2014 Name the Picture');
      var p3Dir = overrideDirections(sectionOverrides, ['pictures', 'part3'], 'Look at each picture. Write the matching vocabulary word on the line underneath.');
      body.push(sectionHeadXml(p3Head, p3Dir, d, false));

      var colsPerRow = d.name === 'primary' ? 2 : 3;
      var colW = Math.floor(contentW / colsPerRow);
      var widths = [];
      for (var c = 0; c < colsPerRow; c++) {
        widths.push(c === colsPerRow - 1 ? contentW - colW * (colsPerRow - 1) : colW);
      }

      var gridRows = [];
      for (var start = 0; start < pictureItems.length; start += colsPerRow) {
        var rowCells = [];
        for (var col = 0; col < colsPerRow; col++) {
          var pIdx = start + col;
          if (pIdx < pictureItems.length) {
            var pItem = pictureItems[pIdx];
            var slotNum = pIdx + 1;
            var pUri = pItem && (pItem.uri || pItem.imgUri || pItem.pictureUri || pItem.picture);
            var pDraw = pUri ? imgReg.addImage(pUri, 1.05, 1.05, 'Picture #' + slotNum) : null;
            var midPara = pDraw
              ? pXml([drawingRunXml(pDraw)], { before: 40, after: 80, align: 'center' })
              : pXml([rXml('[ Picture #' + slotNum + ' ]', { italic: true, sz: d.smallHp, color: '555555' })], { before: 80, after: 180, align: 'center' });
            rowCells.push(cellXml([
              pXml([rXml('Picture #' + slotNum, { bold: true, sz: d.bodyHp })], { before: 30, after: pDraw ? 60 : 140, align: 'left' }),
              midPara,
              writingLineXml(d, { height: Math.round(d.writeLineHeight * 0.65), after: 40 })
            ], widths[col], { padV: d.cellPadV, padH: d.cellPadH }));
          } else {
            rowCells.push(cellXml(pXml('', { before: 0, after: 0 }), widths[col], { padV: d.cellPadV, padH: d.cellPadH }));
          }
        }
        gridRows.push(rowXml(rowCells, { cantSplit: true }));
      }
      body.push(tableXml(widths, gridRows, {
        borders: 'w:val="single" w:sz="8" w:space="0" w:color="000000"',
        padV: d.cellPadV,
        padH: d.cellPadH
      }));

      keySections.push({
        heading: p3Head,
        lines: pictureItems.map(function (item, idx) {
          return 'Picture #' + (idx + 1) + ' \u2014 ' + String(item.word || '');
        })
      });
    }

    if (!renderedAny) {
      body.push(pXml([rXml('No vocabulary words are available yet.', { italic: true, sz: d.bodyHp })], { before: 140, after: 120 }));
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));
    if (answerKeyOn && keySections.length) {
      body.push(answerKeyXml('Teacher Answer Key', keySections, d, contentW));
    }

    var filename = ensureDocxFilename(o.filename, slug(title, 'vocabulary') + '-worksheet');
    return packageDocx(body.join('\n'), d, filename, o, imgReg);
  }

  // ---------------------------------------------------------------------------
  // 3. Read-Along Worksheet (.docx)
  // ---------------------------------------------------------------------------
  function normalizeReadAlongParagraphs(model) {
    if (Array.isArray(model.paragraphs) && model.paragraphs.length) {
      return model.paragraphs.map(function (p) {
        if (typeof p === 'string') return { text: p, heading: false };
        if (p && typeof p === 'object') return { text: String(p.text || ''), heading: !!p.heading };
        return { text: '', heading: false };
      }).filter(function (p) { return p.text.trim(); });
    }
    var sentences = Array.isArray(model.sentences) ? model.sentences : [];
    var out = [];
    var buf = [];
    var flush = function () {
      if (buf.length) {
        out.push({ text: buf.join(' '), heading: false });
        buf = [];
      }
    };
    sentences.forEach(function (row) {
      var txt = typeof row === 'string' ? row : String((row && row.text) || '');
      txt = txt.replace(/\s+/g, ' ').trim();
      if (!txt) return;
      if (row && typeof row === 'object' && row.heading) {
        flush();
        out.push({ text: txt, heading: true });
        return;
      }
      if (row && typeof row === 'object' && row.para) flush();
      buf.push(txt);
    });
    flush();
    return out;
  }

  function buildReadAlongDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = resolveDensity(o.density || m.density);
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'Read-Along Worksheet').trim() || 'Read-Along Worksheet';
    var subtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var headerFields = o.headerFields || m.headerFields || {};
    var lang = String(o.lang || m.lang || 'en').trim() || 'en';
    var isRtl = Boolean(o.isRtl !== undefined ? o.isRtl : (m.isRtl !== undefined ? m.isRtl : isRtlLang(lang)));
    var answerKeyOn = o.answerKeyOn !== undefined ? !!o.answerKeyOn
      : (o.answerKey !== undefined ? !!o.answerKey : (m.answerKeyOn !== undefined ? !!m.answerKeyOn : true));
    var hiddenParts = o.hiddenParts || m.hiddenParts || null;
    var sectionOverrides = o.sectionOverrides || m.sectionOverrides || null;

    var paragraphs = normalizeReadAlongParagraphs(m);
    var customSupports = (Array.isArray(m.customSupports) ? m.customSupports : []).filter(function (s) {
      return s && typeof s === 'object' && (String(s.text || '').trim() || String(s.imgUri || s.uri || s.pictureUri || '').trim());
    });
    var matchWords = Array.isArray(m.matchWords) ? m.matchWords : [];
    var matchDefs = Array.isArray(m.matchDefs) ? m.matchDefs : [];
    var questions = (Array.isArray(m.questions) ? m.questions : []).filter(function (q) {
      return q && typeof q === 'object' && String(q.prompt || '').trim();
    });
    var writeLinesCount = Math.max(1, Math.min(16, Number(o.writeLines != null ? o.writeLines : (m.writeLines != null ? m.writeLines : 5)) || 5));
    var imgReg = createImageRegistry();

    var body = [];
    body.push(buildWorksheetHeaderXml(title, subtitle, headerFields, d, contentW, isRtl));

    var keySections = [];
    var rtlAlign = isRtl ? 'right' : 'left';

    // Part 1 — Read the Passage
    if (!isPartHidden(hiddenParts, ['passage', 'part1'])) {
      var p1Head = overrideHeading(sectionOverrides, ['passage', 'part1'], 'Part 1 \u2014 Read the Passage');
      var p1Dir = overrideDirections(sectionOverrides, ['passage', 'part1'], String(m.passageDirections || 'Read the passage carefully.'));
      body.push(sectionHeadXml(p1Head, p1Dir, d, isRtl));

      var passageXml = paragraphs.length
        ? paragraphs.map(function (pg) {
            if (pg.heading) {
              return pXml([rXml(pg.text, { bold: true, sz: d.headingHp - 2, rtl: isRtl })], {
                before: 100,
                after: 50,
                bidi: isRtl,
                align: rtlAlign,
                keepNext: true
              });
            }
            return pXml([rXml(pg.text, { sz: d.bodyHp + 2, rtl: isRtl })], {
              before: 40,
              after: d.paraAfter + 40,
              line: Math.round(d.lineTw * 1.25),
              bidi: isRtl,
              align: rtlAlign
            });
          })
        : [pXml([rXml('No passage text provided.', { italic: true, sz: d.bodyHp, rtl: isRtl })], { bidi: isRtl, align: rtlAlign })];

      body.push(shadedBoxXml(passageXml, contentW, d, {
        shade: 'FFFFFF',
        borderSz: 10,
        padV: d.cellPadV + 40,
        padH: d.cellPadH + 50,
        cantSplit: false
      }));
    }

    // Part 2 — Reading Notes & Visual Supports
    if (!isPartHidden(hiddenParts, ['supports', 'notes', 'part2']) && customSupports.length) {
      var p2Head = overrideHeading(sectionOverrides, ['supports', 'notes', 'part2'], 'Part 2 \u2014 Reading Notes & Visual Supports');
      var p2Dir = overrideDirections(sectionOverrides, ['supports', 'notes', 'part2'], 'Use these notes to help you understand the passage.');
      body.push(sectionHeadXml(p2Head, p2Dir, d, isRtl));

      customSupports.forEach(function (sup, idx) {
        var lbl = sup.quote
          ? String(sup.quote).trim() + (sup.line != null ? ' (sentence ' + (Number(sup.line) + 1) + ')' : '')
          : (sup.line != null ? 'Sentence ' + (Number(sup.line) + 1) : 'Note #' + (idx + 1));
        var supUri = sup.imgUri || sup.uri || sup.pictureUri || '';
        var supDraw = supUri ? imgReg.addImage(supUri, 0.7, 0.7, lbl) : null;
        var supText = String(sup.text || '').trim();
        if (supDraw) {
          var imgColW = 1220;
          var txtColW = contentW - imgColW;
          var noteRuns = [rXml(lbl + (supText ? ':  ' : ''), { bold: true, sz: d.bodyHp, rtl: isRtl })];
          if (supText) noteRuns.push(rXml(supText, { sz: d.bodyHp, rtl: isRtl }));
          body.push(tableXml([imgColW, txtColW], [
            rowXml([
              cellXml(pXml([drawingRunXml(supDraw)], { before: 20, after: 20, align: 'center' }), imgColW, { vAlign: 'center', padV: 40, padH: 40 }),
              cellXml(pXml(noteRuns, { before: 30, after: 30, bidi: isRtl, align: rtlAlign, keepLines: true }), txtColW, { vAlign: 'center', padV: 40, padH: 60 })
            ], { cantSplit: true })
          ], {
            borders: {
              top: 'none',
              left: 'none',
              right: 'none',
              bottom: 'w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"',
              insideH: 'none',
              insideV: 'none'
            },
            bidiVisual: isRtl,
            padV: 40,
            padH: 40
          }));
        } else {
          body.push(pXml([
            rXml(lbl + ':  ', { bold: true, sz: d.bodyHp, rtl: isRtl }),
            rXml(supText, { sz: d.bodyHp, rtl: isRtl })
          ], {
            before: 50,
            after: 60,
            borders: { bottom: 'w:val="single" w:sz="4" w:space="4" w:color="CCCCCC"' },
            bidi: isRtl,
            align: rtlAlign,
            keepLines: true
          }));
        }
      });
    }

    // Part 3 — Key Words Matching Table
    if (!isPartHidden(hiddenParts, ['matching', 'keyWords', 'keywords', 'part3']) && matchWords.length) {
      var p3Head = overrideHeading(sectionOverrides, ['matching', 'keyWords', 'keywords', 'part3'], 'Part 3 \u2014 Match the Key Words');
      var p3Dir = overrideDirections(sectionOverrides, ['matching', 'keyWords', 'keywords', 'part3'], 'Write the letter of the matching meaning on the line next to each word.');
      body.push(sectionHeadXml(p3Head, p3Dir, d, isRtl));
      body.push(buildMatchingTableXml(matchWords, matchDefs, d, contentW, isRtl));

      keySections.push({
        heading: p3Head,
        lines: matchWords.map(function (it) {
          return String(it.word || '') + ' \u2014 ' + String(it.answerLetter || it.letter || '') + (it.meaning ? ' (' + it.meaning + ')' : '');
        })
      });
    }

    // Part 4 — Comprehension Questions or Write About What You Read
    if (!isPartHidden(hiddenParts, ['writing', 'questions', 'comprehension', 'part4'])) {
      if (questions.length) {
        var p4Head = overrideHeading(sectionOverrides, ['writing', 'questions', 'comprehension', 'part4'], 'Part 4 \u2014 Check Your Understanding');
        var p4Dir = overrideDirections(sectionOverrides, ['writing', 'questions', 'comprehension', 'part4'], 'Answer each question below about what you read.');
        body.push(sectionHeadXml(p4Head, p4Dir, d, isRtl));

        var qKeyLines = [];
        questions.forEach(function (q, idx) {
          var n = idx + 1;
          var prompt = String(q.prompt || '').trim();
          body.push(pXml([
            rXml(n + '.  ', { bold: true, sz: d.bodyHp, rtl: isRtl }),
            rXml(prompt, { bold: true, sz: d.bodyHp, rtl: isRtl })
          ], { before: d.itemBefore + 30, after: 50, bidi: isRtl, align: rtlAlign, keepNext: true }));

          var isMc = q.kind === 'mc' && Array.isArray(q.choices) && q.choices.length > 0;
          if (isMc) {
            var ansIdx = (typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.choices.length) ? q.answer : 0;
            q.choices.forEach(function (choice, ci) {
              var chLetter = letterLabel(ci);
              body.push(pXml([
                rXml('\u2610  ', { sz: d.bodyHp }),
                rXml(chLetter + '.  ', { bold: true, sz: d.bodyHp, rtl: isRtl }),
                rXml(choiceText(choice), { sz: d.bodyHp, rtl: isRtl })
              ], {
                before: 25,
                after: ci === q.choices.length - 1 ? d.itemAfter : 30,
                indentLeft: isRtl ? 0 : 420,
                indentRight: isRtl ? 420 : 0,
                bidi: isRtl,
                align: rtlAlign,
                keepLines: true
              }));
            });
            qKeyLines.push(prompt + ' \u2014 ' + letterLabel(ansIdx) + '. ' + choiceText(q.choices[ansIdx]));
          } else {
            var openLines = Math.max(2, Math.min(6, Number(q.writeLines) || 2));
            for (var li = 0; li < openLines; li++) {
              body.push(writingLineXml(d, {
                dashedTop: true,
                indentLeft: isRtl ? 0 : 320,
                after: li === openLines - 1 ? d.itemAfter : 50
              }));
            }
            qKeyLines.push(prompt + ' \u2014 Open response (answers will vary)');
          }
        });
        keySections.push({ heading: p4Head, lines: qKeyLines });
      } else {
        var p4wHead = overrideHeading(sectionOverrides, ['writing', 'questions', 'comprehension', 'part4'], 'Part 4 \u2014 Write About What You Read');
        var p4wDir = overrideDirections(sectionOverrides, ['writing', 'questions', 'comprehension', 'part4'], 'Write a summary, main idea, or response about the passage on the lines below.');
        body.push(sectionHeadXml(p4wHead, p4wDir, d, isRtl));
        for (var wi = 0; wi < writeLinesCount; wi++) {
          body.push(writingLineXml(d, { dashedTop: true, after: 60 }));
        }
      }
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));
    if (answerKeyOn && keySections.length) {
      body.push(answerKeyXml('Teacher Answer Key', keySections, d, contentW));
    }

    var filename = ensureDocxFilename(o.filename, slug(title, 'read-along') + '-worksheet');
    return packageDocx(body.join('\n'), d, filename, o, imgReg);
  }

  // ---------------------------------------------------------------------------
  // 4. Clinical CTOPP-Style Monochrome Teacher Record & Scoring Sheet (.docx)
  // ---------------------------------------------------------------------------
  function buildScoringSheetDocx(plan, opts) {
    var p = plan && typeof plan === 'object' ? plan : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    // Clinical monochrome profile (compact 10pt table layout with generous 0.55in margins)
    var d = Object.assign({}, DENSITY.compact, {
      titleHp: 30,
      headingHp: 23,
      bodyHp: 20,
      smallHp: 18,
      cellPadV: 60,
      cellPadH: 80,
      margin: 792
    });
    var contentW = PAGE_W - (d.margin * 2); // 10656 twips
    var title = String(o.title || p.title || 'Worksheet').trim() || 'Worksheet';

    var condParts = [];
    condParts.push('Speed: ' + (o.slow ? 'Slow (0.8x)' : 'Standard (1.0x)'));
    condParts.push('Response pause: ' + (Number(o.autoSec) > 0 ? (Number(o.autoSec) + 's auto-advance') : 'Manual'));
    if (p.hasSoundGap) condParts.push('Sound gap: ' + ((Number(o.gapMs) || 700) / 1000).toFixed(1) + 's');
    if (p.hasDirections) {
      var dirLabel = o.dirMode === 'every' ? 'Every item' : (o.dirMode === 'none' ? 'Words / sounds only' : 'First item per section');
      condParts.push('Directions: ' + dirLabel);
    }

    // Optional live session scoring data (from Audio Companion)
    var st = (o.scoreState && typeof o.scoreState === 'object')
      ? o.scoreState
      : ((o.scores && typeof o.scores === 'object') ? o.scores : null);
    var stItems = st && st.items && typeof st.items === 'object' ? st.items : null;
    var stStudent = st && st.studentName ? String(st.studentName).trim() : '';
    var stDate = st && st.date ? String(st.date).trim() : '';
    var stExaminer = st && st.examiner ? String(st.examiner).trim() : '';
    var stNotes = st && st.notes ? String(st.notes).trim() : '';
    function recFor(it, fallbackIdx) {
      if (!stItems) return null;
      var k1 = it && it.index != null ? String(it.index) : '';
      var k2 = String(fallbackIdx);
      var r = (k1 && stItems[k1]) || stItems[k2] || null;
      return r && typeof r === 'object' ? r : null;
    }

    var body = [];

    // Title & Teacher Notice
    body.push(pXml([rXml(title + ' \u2014 Teacher Record & Scoring Sheet', { bold: true, sz: d.titleHp, color: '000000' })], {
      style: 'Title',
      before: 0,
      after: 40,
      keepNext: true
    }));
    body.push(pXml([rXml('For teacher use only \u2014 keep apart from the student copy.', { italic: true, sz: d.smallHp, color: '333333' })], {
      before: 0,
      after: 80,
      keepNext: true
    }));

    // Student / Date / Examiner Header Row
    var hCol1 = 4456;
    var hCol2 = 2700;
    var hCol3 = contentW - hCol1 - hCol2;
    body.push(tableXml([hCol1, hCol2, hCol3], [
      rowXml([
        cellXml(pXml([rXml('Student / Code Name: ', { bold: true, sz: d.bodyHp }), rXml(stStudent || '________________', { sz: d.bodyHp })], { before: 20, after: 30 }), hCol1, { padV: 30, padH: 30 }),
        cellXml(pXml([rXml('Date: ', { bold: true, sz: d.bodyHp }), rXml(stDate || '____________', { sz: d.bodyHp })], { before: 20, after: 30 }), hCol2, { padV: 30, padH: 30 }),
        cellXml(pXml([rXml('Examiner: ', { bold: true, sz: d.bodyHp }), rXml(stExaminer || '______________ ', { sz: d.bodyHp })], { before: 20, after: 30 }), hCol3, { padV: 30, padH: 30 })
      ], { cantSplit: true })
    ], {
      borders: 'none',
      padV: 30,
      padH: 30
    }));

    // Audio Setup Conditions Line
    body.push(pXml([
      rXml('Audio setup: ', { bold: true, sz: d.smallHp, color: '000000' }),
      rXml(condParts.join(' \u00b7 '), { sz: d.smallHp, color: '222222' })
    ], {
      before: 40,
      after: 120,
      borders: { bottom: 'w:val="single" w:sz="12" w:space="4" w:color="000000"' }
    }));

    var totalScored = 0;
    var totalCorrect = 0;
    var totalMarked = 0;
    var anyRepeats = false;
    var globalRowIdx = 0;
    var sections = Array.isArray(p.sections) ? p.sections : [];
    var gridBorder = 'w:val="single" w:sz="6" w:space="0" w:color="000000"';

    sections.forEach(function (sec) {
      if (!sec || typeof sec !== 'object') return;
      var items = Array.isArray(sec.items) ? sec.items : [];
      var scored = sec.scored !== false;
      if (scored) totalScored += items.length;

      body.push(pXml([rXml(String(sec.label || 'Section'), { bold: true, sz: d.headingHp, color: '000000' })], {
        style: 'Heading2',
        before: 160,
        after: 50,
        keepNext: true
      }));

      if (scored) {
        // 6-column clinical table: # | Item / Prompt | Expected Answer | Score | Rep. | Notes
        var sWidths = [600, 3280, 2420, 1280, 680, contentW - (600 + 3280 + 2420 + 1280 + 680)];
        var sHeaders = ['#', 'Item / Prompt', 'Expected Answer', 'Score', 'Rep.', 'Notes'];
        var sRows = [
          rowXml(sHeaders.map(function (txt, ci) {
            return cellXml(
              pXml([rXml(txt, { bold: true, sz: d.smallHp })], { before: 20, after: 20, align: (ci === 0 || ci === 3 || ci === 4) ? 'center' : 'left' }),
              sWidths[ci],
              { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
            );
          }), { cantSplit: true, header: true })
        ];

        var secCorrect = 0;
        var secMarked = 0;
        items.forEach(function (it, idx) {
          var rec = recFor(it, globalRowIdx);
          globalRowIdx++;
          var tag = it && it.numLabel ? String(it.numLabel) : String(it && it.numInSection != null ? it.numInSection : (idx + 1));
          var val = rec && (rec.score === 1 || rec.score === 0) ? rec.score : null;
          var reps = rec && Number(rec.repeats) > 0 ? Math.floor(Number(rec.repeats)) : 0;
          var noteTxt = rec && rec.note ? String(rec.note).trim() : '';
          if (reps > 0) anyRepeats = true;
          if (val !== null) {
            secMarked++;
            totalMarked++;
            if (val === 1) { secCorrect++; totalCorrect++; }
          }
          var scoreCellRuns = val === 1
            ? [rXml('[1] \u2713', { bold: true, sz: d.smallHp, color: '000000' }), rXml('  (0)', { sz: d.smallHp, color: '777777' })]
            : (val === 0
              ? [rXml('(1)  ', { sz: d.smallHp, color: '777777' }), rXml('[0] \u2717', { bold: true, sz: d.smallHp, color: '000000' })]
              : [rXml('[1]  [0]', { bold: true, sz: d.smallHp })]);
          var scoreShade = val !== null ? 'F3F3F3' : '';
          sRows.push(rowXml([
            cellXml(pXml([rXml(tag, { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), sWidths[0], { padV: d.cellPadV, padH: 50 }),
            cellXml(pXml([rXml(String((it && it.script) || ''), { sz: d.smallHp })], { before: 15, after: 15 }), sWidths[1], { padV: d.cellPadV, padH: d.cellPadH }),
            cellXml(pXml([rXml(String((it && it.answer) || ''), { sz: d.smallHp })], { before: 15, after: 15 }), sWidths[2], { padV: d.cellPadV, padH: d.cellPadH }),
            cellXml(pXml(scoreCellRuns, { before: 15, after: 15, align: 'center' }), sWidths[3], { padV: d.cellPadV, padH: 40, shade: scoreShade }),
            cellXml(pXml(reps > 0 ? [rXml(String(reps), { bold: true, sz: d.smallHp })] : '', { before: 15, after: 15, align: 'center' }), sWidths[4], { padV: d.cellPadV, padH: 40 }),
            cellXml(pXml(noteTxt ? [rXml(noteTxt, { sz: d.smallHp })] : '', { before: 15, after: 15 }), sWidths[5], { padV: d.cellPadV, padH: d.cellPadH })
          ], { cantSplit: true }));
        });

        // Section subtotal row inside the bordered table
        var secSubText = secMarked > 0
          ? ('Section subtotal:   ' + secCorrect + ' / ' + items.length + ' (' + Math.round((secCorrect / Math.max(1, items.length)) * 100) + '%)')
          : ('Section subtotal:   ______ / ' + items.length);
        sRows.push(rowXml([
          cellXml(
            pXml([rXml(secSubText, { bold: true, sz: d.smallHp })], { before: 25, after: 25, align: 'right' }),
            contentW,
            { span: 6, shade: 'F7F7F7', padV: d.cellPadV, padH: d.cellPadH }
          )
        ], { cantSplit: true }));

        body.push(tableXml(sWidths, sRows, { borders: gridBorder, padV: d.cellPadV, padH: d.cellPadH }));
      } else {
        // 4-column unscored practice/listening table: # | Item / Prompt | Done | Notes
        var uWidths = [600, 5680, 1080, contentW - (600 + 5680 + 1080)];
        var uHeaders = ['#', 'Item / Prompt', 'Done', 'Notes'];
        var uRows = [
          rowXml(uHeaders.map(function (txt, ci) {
            return cellXml(
              pXml([rXml(txt, { bold: true, sz: d.smallHp })], { before: 20, after: 20, align: (ci === 0 || ci === 2) ? 'center' : 'left' }),
              uWidths[ci],
              { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
            );
          }), { cantSplit: true, header: true })
        ];

        items.forEach(function (it, idx) {
          var rec = recFor(it, globalRowIdx);
          globalRowIdx++;
          var tag = it && it.numLabel ? String(it.numLabel) : String(it && it.numInSection != null ? it.numInSection : (idx + 1));
          var isDone = !!(rec && (rec.done || rec.score === 1));
          var uNote = rec && rec.note ? String(rec.note).trim() : '';
          uRows.push(rowXml([
            cellXml(pXml([rXml(tag, { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), uWidths[0], { padV: d.cellPadV, padH: 50 }),
            cellXml(pXml([rXml(String((it && it.script) || ''), { sz: d.smallHp })], { before: 15, after: 15 }), uWidths[1], { padV: d.cellPadV, padH: d.cellPadH }),
            cellXml(pXml([rXml(isDone ? '[\u2713]' : '[ ]', { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), uWidths[2], { padV: d.cellPadV, padH: 40 }),
            cellXml(pXml(uNote ? [rXml(uNote, { sz: d.smallHp })] : '', { before: 15, after: 15 }), uWidths[3], { padV: d.cellPadV, padH: d.cellPadH })
          ], { cantSplit: true }));
        });

        uRows.push(rowXml([
          cellXml(
            pXml([rXml('Practice / listening only (not scored).', { italic: true, sz: d.smallHp, color: '333333' })], { before: 25, after: 25, align: 'right' }),
            contentW,
            { span: 4, shade: 'F7F7F7', padV: d.cellPadV, padH: d.cellPadH }
          )
        ], { cantSplit: true }));

        body.push(tableXml(uWidths, uRows, { borders: gridBorder, padV: d.cellPadV, padH: d.cellPadH }));
      }
    });

    // Bottom Summary & Observations Box
    body.push(pXml('', { before: 100, after: 40 }));
    var totalPct = totalScored > 0 ? Math.round((totalCorrect / totalScored) * 100) : 0;
    var totalLine = totalScored > 0
      ? pXml([
          rXml('Total scored:  ', { bold: true, sz: d.bodyHp }),
          rXml((totalMarked > 0 ? String(totalCorrect) : '________') + ' / ' + totalScored + '      ', { bold: totalMarked > 0, sz: d.bodyHp }),
          rXml('Percent:  ', { bold: true, sz: d.bodyHp }),
          rXml((totalMarked > 0 ? String(totalPct) : '______') + ' %', { bold: totalMarked > 0, sz: d.bodyHp })
        ], { before: 40, after: 80 })
      : pXml([
          rXml('Completion:  ', { bold: true, sz: d.bodyHp }),
          rXml('All items in this sheet are practice or listening only (unscored).', { sz: d.bodyHp })
        ], { before: 40, after: 80 });

    var slowBox = (totalMarked > 0 && o.slow) ? '\u2611' : '\u2610';
    var repBox = anyRepeats ? '\u2611' : '\u2610';
    var summaryParas = [
      pXml([rXml('Summary & Observations', { bold: true, sz: d.headingHp })], { before: 20, after: 60 }),
      totalLine,
      pXml([
        rXml(slowBox + ' Used slow playback (0.8x)    \u2610 Needed extra wait time    ' + repBox + ' Repeated items    \u2610 Self-corrected    \u2610 Fatigue / took a break', { sz: d.smallHp })
      ], { before: 20, after: 100 }),
      pXml([rXml('Next teaching focus / notes:', { bold: true, sz: d.smallHp })], { before: 30, after: 40 })
    ];
    if (stNotes) {
      summaryParas.push(pXml([rXml(stNotes, { sz: d.bodyHp })], { before: 20, after: 60 }));
      summaryParas.push(writingLineXml(d, { height: 280, after: 20 }));
    } else {
      summaryParas.push(writingLineXml(d, { height: 280, after: 40 }));
      summaryParas.push(writingLineXml(d, { height: 280, after: 40 }));
      summaryParas.push(writingLineXml(d, { height: 280, after: 20 }));
    }

    body.push(shadedBoxXml(summaryParas, contentW, d, {
      shade: 'FFFFFF',
      borderSz: 12,
      padV: 90,
      padH: 130,
      cantSplit: true
    }));

    var filename = ensureDocxFilename(o.filename, slug(title, 'scoring-sheet') + '-scoring-sheet');
    return packageDocx(body.join('\n'), d, filename, o);
  }

  // ---------------------------------------------------------------------------
  // 5. Math Worksheet (.docx) — Horizontal & Vertical Problem Grids + Answer Key
  // ---------------------------------------------------------------------------
  function formatDurationLabel(seconds) {
    var s = Math.round(Number(seconds) || 0);
    if (!(s > 0)) return '';
    if (s % 60 === 0) {
      var mins = s / 60;
      return mins === 1 ? '1 minute' : (mins + ' minutes');
    }
    if (s > 60) {
      var m = Math.floor(s / 60);
      var rem = s % 60;
      return m + ' min ' + rem + ' sec';
    }
    return s === 1 ? '1 second' : (s + ' seconds');
  }

  function normalizeMathOp(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (s === 'add' || s === '+') return { key: 'add', sym: '+' };
    if (s === 'sub' || s === '-' || s === '\u2212' || s === '\u2013' || s === '\u2014') return { key: 'sub', sym: '\u2212' };
    if (s === 'mul' || s === 'x' || s === 'X' || s === '*' || s === '\u00D7' || s === '\u00B7' || s === '\u22C5') return { key: 'mul', sym: '\u00D7' };
    if (s === 'div' || s === '/' || s === ':' || s === '\u00F7') return { key: 'div', sym: '\u00F7' };
    return { key: '', sym: '' };
  }

  function computeMathAnswer(a, b, opKey) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
    if (opKey === 'add') return String(a + b);
    if (opKey === 'sub') return String(a - b);
    if (opKey === 'mul') return String(a * b);
    if (opKey === 'div' && b !== 0 && a % b === 0) return String(a / b);
    return '';
  }

  function normalizeMathFact(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string' || typeof raw === 'number') {
      var str = String(raw).trim();
      if (!str) return null;
      var mStr = /^(-?\d+)\s*([-+xX*/:\u2212\u2013\u2014\u00D7\u00F7\u00B7\u22C5])\s*(-?\d+)$/.exec(str);
      if (mStr) {
        var sa = Number(mStr[1]);
        var sb = Number(mStr[3]);
        var sop = normalizeMathOp(mStr[2]);
        if (sop.key) {
          return {
            a: sa,
            b: sb,
            op: sop.key,
            opSym: sop.sym,
            expr: sa + ' ' + sop.sym + ' ' + sb,
            hasEquals: false,
            hasBlank: false,
            isPair: false,
            answer: computeMathAnswer(sa, sb, sop.key),
            hint: '',
            practice: false
          };
        }
      }
      return {
        a: null,
        b: null,
        op: '',
        opSym: '',
        expr: str.replace(/_{2,}/g, '______'),
        hasEquals: str.indexOf('=') >= 0,
        hasBlank: /_{2,}/.test(str),
        isPair: false,
        answer: '',
        hint: '',
        practice: false
      };
    }
    if (typeof raw !== 'object') return null;
    var src = (raw.fact && typeof raw.fact === 'object') ? raw.fact : raw;

    // Quantity Discrimination pair (left vs right)
    if (raw.left != null && raw.right != null && src.a == null && src.b == null) {
      var lNum = String(raw.left).trim();
      var rNum = String(raw.right).trim();
      var pairAns = raw.answer != null && raw.answer !== ''
        ? String(raw.answer).trim()
        : (Number.isFinite(Number(lNum)) && Number.isFinite(Number(rNum))
          ? String(Math.max(Number(lNum), Number(rNum)))
          : '');
      return {
        a: null,
        b: null,
        op: '',
        opSym: '',
        left: lNum,
        right: rNum,
        expr: lNum + '    or    ' + rNum,
        hasEquals: true,
        hasBlank: false,
        isPair: true,
        answer: pairAns,
        hint: String(raw.hint || '').trim(),
        practice: !!raw.practice
      };
    }

    var opInfo = normalizeMathOp(src.op || src.symbol || raw.op || raw.symbol);
    var a = src.a != null && src.a !== '' && Number.isFinite(Number(src.a)) ? Number(src.a) : null;
    var b = src.b != null && src.b !== '' && Number.isFinite(Number(src.b)) ? Number(src.b) : null;
    var rawText = '';
    if (raw.prompt != null && String(raw.prompt).trim()) rawText = String(raw.prompt).trim();
    else if (raw.text != null && String(raw.text).trim()) rawText = String(raw.text).trim();
    else if (raw.display != null && String(raw.display).trim()) rawText = String(raw.display).trim();
    else if (raw.word != null && String(raw.word).trim()) rawText = String(raw.word).trim();

    if (rawText && (a === null || b === null || !opInfo.key)) {
      var mObj = /^(-?\d+)\s*([-+xX*/:\u2212\u2013\u2014\u00D7\u00F7\u00B7\u22C5])\s*(-?\d+)$/.exec(rawText);
      if (mObj) {
        a = Number(mObj[1]);
        b = Number(mObj[3]);
        opInfo = normalizeMathOp(mObj[2]);
      }
    }

    var expr = rawText
      ? rawText.replace(/_{2,}/g, '______')
      : (a !== null && b !== null && opInfo.sym ? (a + ' ' + opInfo.sym + ' ' + b) : '');
    if (!expr) return null;

    var hasEq = expr.indexOf('=') >= 0;
    var hasBlank = /_{2,}/.test(expr);
    var ans = (raw.answer != null && raw.answer !== '')
      ? String(raw.answer).trim()
      : (a !== null && b !== null && opInfo.key ? computeMathAnswer(a, b, opInfo.key) : '');

    return {
      a: a,
      b: b,
      op: opInfo.key,
      opSym: opInfo.sym,
      expr: expr,
      hasEquals: hasEq,
      hasBlank: hasBlank,
      isPair: false,
      answer: ans,
      hint: String(raw.hint || '').trim(),
      aidUri: typeof raw.aidUri === 'string' ? raw.aidUri.trim() : '',
      aidLabel: String(raw.aidLabel || '').trim(),
      practice: !!raw.practice
    };
  }

  function equalColWidths(contentW, count) {
    var n = Math.max(1, Math.floor(Number(count) || 1));
    var w = Math.floor(contentW / n);
    var widths = [];
    for (var i = 0; i < n; i++) {
      widths.push(i === n - 1 ? contentW - w * (n - 1) : w);
    }
    return widths;
  }

  function buildMathWorksheetDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = resolveDensity(o.density || m.density);
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'Math Practice Worksheet').trim() || 'Math Practice Worksheet';
    var baseSubtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var hf = (o.headerFields || m.headerFields) && typeof (o.headerFields || m.headerFields) === 'object'
      ? (o.headerFields || m.headerFields)
      : {};
    var timeSec = Number(o.timeLimitSeconds != null ? o.timeLimitSeconds : (m.timeLimitSeconds != null ? m.timeLimitSeconds : m.timeLimitS)) || 0;
    var timeLabel = '';
    if (typeof hf.timeLimit === 'string' && hf.timeLimit.trim()) {
      timeLabel = 'Time limit: ' + hf.timeLimit.trim();
    } else if (timeSec > 0) {
      timeLabel = 'Time limit: ' + formatDurationLabel(timeSec);
    } else if (hf.timeLimit === true) {
      timeLabel = 'Time limit: ____________';
    }
    var subtitleParts = [];
    if (baseSubtitle) subtitleParts.push(baseSubtitle);
    if (timeLabel) subtitleParts.push(timeLabel);
    var subtitle = subtitleParts.join('  \u00b7  ');

    var layoutRaw = String(o.layout || m.layout || 'horizontal').trim().toLowerCase();
    var layout = layoutRaw === 'vertical' || layoutRaw === 'stacked' ? 'vertical' : 'horizontal';
    var answerKeyOn = o.answerKeyOn !== undefined ? !!o.answerKeyOn
      : (o.answerKey !== undefined ? !!o.answerKey : (m.answerKeyOn !== undefined ? !!m.answerKeyOn : true));

    var rawFacts = Array.isArray(m.facts) ? m.facts : (Array.isArray(m.items) ? m.items : []);
    var items = [];
    var scoredSeq = 0;
    rawFacts.forEach(function (raw) {
      var norm = normalizeMathFact(raw);
      if (!norm) return;
      if (norm.practice) {
        norm.numLabel = 'Practice';
      } else {
        scoredSeq += 1;
        norm.numLabel = String(scoredSeq);
      }
      items.push(norm);
    });

    var hasPairs = items.some(function (it) { return it.isPair; });
    var defaultDir = hasPairs
      ? 'Circle the bigger number in each pair.'
      : (timeSec > 0
        ? 'Solve each math problem carefully. Work steadily until time is up.'
        : 'Solve each math problem and write your answer clearly.');
    var directions = String(o.directions != null ? o.directions : (m.directions != null ? m.directions : defaultDir)).trim();

    var imgReg = createImageRegistry();
    var scaffoldedOn = !!(o.scaffolded || m.scaffolded);
    var body = [];
    body.push(buildWorksheetHeaderXml(title, subtitle, hf, d, contentW, false));

    if (directions) {
      body.push(pXml([rXml(directions, { italic: true, sz: d.dirHp, color: '222222' })], {
        style: 'Directions',
        before: 120,
        after: 100,
        keepNext: true
      }));
    } else {
      body.push(pXml('', { before: 40, after: 40 }));
    }

    if (!items.length) {
      body.push(pXml([rXml('No math problems are available yet.', { italic: true, sz: d.bodyHp })], { before: 120, after: 120 }));
    } else {
      var hasVisualAids = items.some(function (it) { return !!(it.aidUri && isRasterDataUri(it.aidUri)); });
      var explicitCols = Number(o.columns || m.columns) || 0;
      var maxExprLen = items.reduce(function (mx, it) { return Math.max(mx, it.expr.length); }, 0);
      var cols;
      if (explicitCols >= 1 && explicitCols <= 4) {
        cols = Math.floor(explicitCols);
      } else if (hasVisualAids) {
        cols = 2;
      } else if (layout === 'vertical') {
        cols = maxExprLen > 24 ? 2 : (d.name === 'primary' ? 3 : 4);
      } else {
        if (maxExprLen > 42) cols = 1;
        else if (maxExprLen > 20) cols = 2;
        else if (d.name === 'compact' && items.length >= 16) cols = 4;
        else cols = 3;
      }

      var widths = equalColWidths(contentW, cols);
      var mathSz = layout === 'vertical' ? Math.min(34, d.bodyHp + 6) : Math.min(30, d.bodyHp + 2);
      var gridRows = [];

      for (var start = 0; start < items.length; start += cols) {
        var rowCells = [];
        for (var c = 0; c < cols; c++) {
          var idx = start + c;
          if (idx >= items.length) {
            rowCells.push(cellXml(pXml('', { before: 0, after: 0 }), widths[c], { padV: d.cellPadV, padH: d.cellPadH }));
            continue;
          }
          var it = items[idx];
          var tag = it.practice ? 'Practice:' : (it.numLabel + '.');
          var canStack = layout === 'vertical' && !it.isPair && !it.hasEquals && !it.hasBlank
            && it.a !== null && it.b !== null && it.opSym;
          var aidDraw = it.aidUri
            ? imgReg.addImage(
                it.aidUri,
                Math.max(1.4, Math.min(2.75, (widths[c] / 1440) - 0.25)),
                1.15,
                it.aidLabel || ('Visual model for ' + it.expr)
              )
            : '';

          if (canStack) {
            var stackIndentR = Math.round(widths[c] * 0.16);
            var cellParas = [
              pXml([rXml(tag, { bold: true, sz: d.smallHp, color: '444444' })], { before: 10, after: 30, align: 'left' }),
              pXml([rXml(String(it.a), { bold: true, sz: mathSz, color: '000000' })], {
                before: 0,
                after: 10,
                align: 'right',
                indentRight: stackIndentR
              }),
              pXml([rXml(it.opSym + '  ' + String(it.b), { bold: true, sz: mathSz, color: '000000' })], {
                before: 0,
                after: 40,
                align: 'right',
                indentRight: stackIndentR,
                borders: { bottom: 'w:val="single" w:sz="10" w:space="2" w:color="000000"' }
              }),
              pXml('', { before: Math.round(d.writeLineHeight * 0.75), after: 30 })
            ];
            if (aidDraw) {
              cellParas.push(pXml([drawingRunXml(aidDraw)], { before: 30, after: 40, align: 'center' }));
            }
            if (it.hint) {
              cellParas.push(pXml([rXml('Hint: ' + it.hint, { italic: true, sz: Math.max(16, d.smallHp - 2), color: '555555' })], {
                before: 10,
                after: 10
              }));
            }
            rowCells.push(cellXml(cellParas, widths[c], { padV: d.cellPadV + 20, padH: d.cellPadH + 20 }));
          } else {
            var lineRuns = [rXml(tag + '  ', { bold: true, sz: d.bodyHp, color: '000000' })];
            if (it.isPair) {
              lineRuns.push(rXml(it.left, { bold: true, sz: mathSz, color: '000000' }));
              lineRuns.push(rXml('    |    ', { sz: d.bodyHp, color: '666666' }));
              lineRuns.push(rXml(it.right, { bold: true, sz: mathSz, color: '000000' }));
            } else if (it.hasEquals || it.hasBlank) {
              lineRuns.push(rXml(it.expr, { bold: true, sz: mathSz, color: '000000' }));
            } else {
              lineRuns.push(rXml(it.expr + ' = ', { bold: true, sz: mathSz, color: '000000' }));
              lineRuns.push(rXml('______', { sz: mathSz, color: '000000' }));
            }
            var hParas = [
              pXml(lineRuns, { before: 40, after: (it.hint || aidDraw) ? 40 : 80, keepLines: true })
            ];
            if (aidDraw) {
              hParas.push(pXml([drawingRunXml(aidDraw)], { before: 20, after: 50, align: 'left' }));
              if (scaffoldedOn) {
                hParas.push(pXml([rXml('Workspace', { italic: true, sz: Math.max(14, d.smallHp - 3), color: '777777' })], {
                  before: 10,
                  after: Math.round(d.writeLineHeight * 0.8),
                  borders: {
                    top: 'w:val="dashed" w:sz="4" w:space="2" w:color="999999"',
                    bottom: 'w:val="dashed" w:sz="4" w:space="2" w:color="999999"',
                    left: 'w:val="dashed" w:sz="4" w:space="4" w:color="999999"',
                    right: 'w:val="dashed" w:sz="4" w:space="4" w:color="999999"'
                  }
                }));
              }
            }
            if (it.hint) {
              hParas.push(pXml([rXml('Hint: ' + it.hint, { italic: true, sz: Math.max(16, d.smallHp - 2), color: '555555' })], {
                before: 0,
                after: 40,
                indentLeft: 240
              }));
            }
            rowCells.push(cellXml(hParas, widths[c], { padV: d.cellPadV + 30, padH: d.cellPadH + 10, vAlign: aidDraw ? 'top' : 'center' }));
          }
        }
        gridRows.push(rowXml(rowCells, {
          cantSplit: true,
          height: hasVisualAids ? Math.max(1350, d.writeLineHeight * 2 + 640) : (layout === 'vertical' ? Math.max(1100, d.writeLineHeight * 2 + 520) : Math.max(520, d.writeLineHeight + 160)),
          hRule: 'atLeast'
        }));
      }

      var borderSpec = m.borderless || o.borderless
        ? 'none'
        : (hasVisualAids ? 'w:val="single" w:sz="6" w:space="0" w:color="666666"' : 'w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"');
      body.push(tableXml(widths, gridRows, {
        borders: borderSpec,
        padV: d.cellPadV + 10,
        padH: d.cellPadH + 10
      }));
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));

    // Teacher Answer Key table on new page
    if (answerKeyOn && items.length) {
      body.push(pageBreakXml());
      body.push(shadedBoxXml(
        pXml([rXml(KEY_NOTICE, { bold: true, sz: d.bodyHp, color: '000000' })], { before: 20, after: 20 }),
        contentW,
        d,
        { shade: 'F0F0F0', borderSz: 12, padV: 70, padH: 120 }
      ));
      body.push(pXml([rXml(title + ' \u2014 Teacher Answer Key', { bold: true, sz: d.titleHp - 4, color: '000000' })], {
        style: 'Heading1',
        before: 160,
        after: 100,
        keepNext: true
      }));

      var keyBorder = 'w:val="single" w:sz="6" w:space="0" w:color="000000"';
      if (items.length > 15) {
        var half = Math.ceil(items.length / 2);
        var halfW = Math.floor(contentW / 2);
        var cNum = 760;
        var cAns = 1360;
        var cProb = halfW - cNum - cAns;
        var rightRem = contentW - (cNum + cProb + cAns) - (cNum + cAns);
        var akWidths = [cNum, cProb, cAns, cNum, rightRem, cAns];
        var akHeadTexts = ['#', 'Problem', 'Answer', '#', 'Problem', 'Answer'];
        var akRows = [
          rowXml(akHeadTexts.map(function (txt, ci) {
            return cellXml(
              pXml([rXml(txt, { bold: true, sz: d.smallHp })], { before: 20, after: 20, align: (ci === 0 || ci === 2 || ci === 3 || ci === 5) ? 'center' : 'left' }),
              akWidths[ci],
              { shade: 'EFEFEF', vAlign: 'center', padV: 50, padH: 70 }
            );
          }), { cantSplit: true, header: true })
        ];
        for (var r = 0; r < half; r++) {
          var leftIt = items[r];
          var rightIt = items[r + half];
          akRows.push(rowXml([
            cellXml(pXml([rXml(leftIt.practice ? 'P' : ('#' + leftIt.numLabel), { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), akWidths[0], { padV: 45, padH: 50 }),
            cellXml(pXml([rXml(leftIt.expr, { sz: d.smallHp })], { before: 15, after: 15 }), akWidths[1], { padV: 45, padH: 70 }),
            cellXml(pXml([rXml(leftIt.answer !== '' ? leftIt.answer : '\u2014', { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), akWidths[2], { padV: 45, padH: 60 }),
            cellXml(pXml(rightIt ? [rXml(rightIt.practice ? 'P' : ('#' + rightIt.numLabel), { bold: true, sz: d.smallHp })] : '', { before: 15, after: 15, align: 'center' }), akWidths[3], { padV: 45, padH: 50 }),
            cellXml(pXml(rightIt ? [rXml(rightIt.expr, { sz: d.smallHp })] : '', { before: 15, after: 15 }), akWidths[4], { padV: 45, padH: 70 }),
            cellXml(pXml(rightIt ? [rXml(rightIt.answer !== '' ? rightIt.answer : '\u2014', { bold: true, sz: d.smallHp })] : '', { before: 15, after: 15, align: 'center' }), akWidths[5], { padV: 45, padH: 60 })
          ], { cantSplit: true }));
        }
        body.push(tableXml(akWidths, akRows, { borders: keyBorder, padV: 45, padH: 70 }));
      } else {
        var sNum = 1000;
        var sAns = 2200;
        var sProb = contentW - sNum - sAns;
        var sWidths = [sNum, sProb, sAns];
        var sRows = [
          rowXml(['#', 'Problem', 'Answer'].map(function (txt, ci) {
            return cellXml(
              pXml([rXml(txt, { bold: true, sz: d.bodyHp })], { before: 20, after: 20, align: ci === 1 ? 'left' : 'center' }),
              sWidths[ci],
              { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
            );
          }), { cantSplit: true, header: true })
        ];
        items.forEach(function (it) {
          sRows.push(rowXml([
            cellXml(pXml([rXml(it.practice ? 'Practice' : ('#' + it.numLabel), { bold: true, sz: d.bodyHp })], { before: 20, after: 20, align: 'center' }), sWidths[0], { padV: 55, padH: 60 }),
            cellXml(pXml([rXml(it.expr, { sz: d.bodyHp })], { before: 20, after: 20 }), sWidths[1], { padV: 55, padH: d.cellPadH }),
            cellXml(pXml([rXml(it.answer !== '' ? it.answer : '\u2014', { bold: true, sz: d.bodyHp })], { before: 20, after: 20, align: 'center' }), sWidths[2], { padV: 55, padH: 60 })
          ], { cantSplit: true }));
        });
        body.push(tableXml(sWidths, sRows, { borders: keyBorder, padV: 55, padH: d.cellPadH }));
      }
    }

    var filename = ensureDocxFilename(o.filename, slug(title, 'math') + '-math-worksheet');
    return packageDocx(body.join('\n'), d, filename, o, imgReg);
  }

  // ---------------------------------------------------------------------------
  // 6. CBM-Maze Reading Worksheet & Scoring Sheet (.docx)
  // ---------------------------------------------------------------------------
  function normalizeMazeContent(m) {
    var paragraphs = [];
    var extractedBlanks = [];
    var blankSeq = 0;

    function makeBlank(tok) {
      blankSeq += 1;
      var num = tok.num != null && Number.isFinite(Number(tok.num))
        ? Number(tok.num)
        : (tok.blankNum != null && Number.isFinite(Number(tok.blankNum)) ? Number(tok.blankNum) : blankSeq);
      var choices = Array.isArray(tok.choices) ? tok.choices.map(choiceText).filter(Boolean) : [];
      var ans = tok.answer != null ? String(tok.answer).trim() : '';
      var blank = { type: 'blank', num: num, choices: choices, answer: ans };
      extractedBlanks.push(blank);
      return blank;
    }

    function appendSegment(targetParas, seg) {
      if (seg == null) return;
      if (typeof seg === 'string') {
        var chunks = seg.replace(/\r\n?/g, '\n').split(/\n{2,}/);
        chunks.forEach(function (chunk, idx) {
          if (idx > 0) targetParas.push([]);
          if (!targetParas.length) targetParas.push([]);
          var cleaned = chunk.replace(/\n/g, ' ');
          if (cleaned) targetParas[targetParas.length - 1].push({ type: 'text', text: cleaned });
        });
        return;
      }
      if (typeof seg !== 'object') return;
      if (seg.type === 'blank' || (Array.isArray(seg.choices) && seg.choices.length)) {
        if (!targetParas.length) targetParas.push([]);
        targetParas[targetParas.length - 1].push(makeBlank(seg));
        return;
      }
      var txt = seg.text != null ? String(seg.text) : (seg.value != null ? String(seg.value) : '');
      if (txt) appendSegment(targetParas, txt);
    }

    if (Array.isArray(m.paragraphs) && m.paragraphs.length) {
      m.paragraphs.forEach(function (pg) {
        if (Array.isArray(pg)) {
          var sub = [[]];
          pg.forEach(function (tok) { appendSegment(sub, tok); });
          sub.forEach(function (p) { if (p.length) paragraphs.push(p); });
        } else if (typeof pg === 'string') {
          var subStr = [];
          appendSegment(subStr, pg);
          subStr.forEach(function (p) { if (p.length) paragraphs.push(p); });
        } else if (pg && typeof pg === 'object') {
          var subObj = [[]];
          appendSegment(subObj, pg);
          subObj.forEach(function (p) { if (p.length) paragraphs.push(p); });
        }
      });
    } else if (Array.isArray(m.rawSegments) && m.rawSegments.length) {
      m.rawSegments.forEach(function (seg) { appendSegment(paragraphs, seg); });
    } else if (Array.isArray(m.passageTokens) && m.passageTokens.length) {
      m.passageTokens.forEach(function (seg) { appendSegment(paragraphs, seg); });
    } else if (Array.isArray(m.items) && m.items.length) {
      m.items.forEach(function (it, idx) {
        if (!it || typeof it !== 'object') return;
        if (it.before) appendSegment(paragraphs, String(it.before));
        if (!paragraphs.length) paragraphs.push([]);
        paragraphs[paragraphs.length - 1].push(makeBlank(it));
        if (idx === m.items.length - 1 && it.after) appendSegment(paragraphs, String(it.after));
      });
    }

    paragraphs = paragraphs.filter(function (p) { return p.length > 0; });

    var answerItems = [];
    if (Array.isArray(m.items) && m.items.length) {
      m.items.forEach(function (it, idx) {
        if (!it || typeof it !== 'object') return;
        var ext = extractedBlanks[idx];
        var num = it.num != null && Number.isFinite(Number(it.num))
          ? Number(it.num)
          : (it.blankNum != null && Number.isFinite(Number(it.blankNum)) ? Number(it.blankNum) : (idx + 1));
        var choices = Array.isArray(it.choices) && it.choices.length
          ? it.choices.map(choiceText).filter(Boolean)
          : (ext ? ext.choices.slice() : []);
        var ans = it.answer != null && String(it.answer).trim()
          ? String(it.answer).trim()
          : (ext ? ext.answer : '');
        answerItems.push({ num: num, choices: choices, answer: ans });
      });
    } else {
      answerItems = extractedBlanks.slice();
    }

    return { paragraphs: paragraphs, answerItems: answerItems };
  }

  function buildMazeRuns(tokens, d, showNum) {
    var runs = [];
    var textSz = d.bodyHp + 2;
    tokens.forEach(function (tok, idx) {
      if (tok.type === 'blank') {
        var prev = idx > 0 ? tokens[idx - 1] : null;
        var next = idx + 1 < tokens.length ? tokens[idx + 1] : null;
        var needsLeadSpace = prev && ((prev.type === 'text' && prev.text && !/\s$/.test(prev.text)) || prev.type === 'blank');
        var needsTrailSpace = next && next.type === 'text' && next.text && !/^[\s.,!?;:)'"\u201D\u2019]/.test(next.text);
        if (needsLeadSpace) runs.push(rXml(' ', { sz: textSz }));
        if (showNum && tok.num != null) {
          runs.push(rXml(tok.num + '. ', { bold: true, sz: d.smallHp, color: '444444' }));
        }
        var triple = '[ ' + (tok.choices.length ? tok.choices.join(' / ') : '___') + ' ]';
        runs.push(rXml(triple, { bold: true, sz: textSz, color: '000000' }));
        if (needsTrailSpace) runs.push(rXml(' ', { sz: textSz }));
      } else if (tok.text) {
        runs.push(rXml(tok.text, { sz: textSz, color: '000000' }));
      }
    });
    return runs;
  }

  function buildMazeWorksheetDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = resolveDensity(o.density || m.density);
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'Reading Maze Worksheet').trim() || 'Reading Maze Worksheet';
    var baseSubtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var formLabel = String(o.formLabel != null ? o.formLabel : (m.formLabel != null ? m.formLabel : (m.form || ''))).trim();
    var timeLimitLabel = String(o.timeLimitLabel != null ? o.timeLimitLabel : (m.timeLimitLabel || '')).trim();
    if (!timeLimitLabel) {
      if (m.untimed) timeLimitLabel = 'Untimed';
      else if (Number(m.timeLimitSeconds || m.timeLimitS) > 0) timeLimitLabel = formatDurationLabel(m.timeLimitSeconds || m.timeLimitS);
    }
    var wordCount = Number(o.wordCount != null ? o.wordCount : m.wordCount) || 0;
    var answerKeyOn = o.answerKeyOn !== undefined ? !!o.answerKeyOn
      : (o.answerKey !== undefined ? !!o.answerKey : (m.answerKeyOn !== undefined ? !!m.answerKeyOn : true));

    var content = normalizeMazeContent(m);
    var blankCount = content.answerItems.length;

    var metaParts = [];
    if (formLabel) metaParts.push('Form: ' + formLabel.replace(/^form\s+/i, ''));
    if (timeLimitLabel) metaParts.push('Time Limit: ' + timeLimitLabel);
    if (wordCount > 0) metaParts.push(wordCount + ' words');
    if (blankCount > 0) metaParts.push('Blanks: ' + blankCount);

    var subtitleLine = [baseSubtitle, metaParts.join('  \u00b7  ')].filter(Boolean).join('  \u2014  ');

    var rawHf = (o.headerFields || m.headerFields) && typeof (o.headerFields || m.headerFields) === 'object'
      ? (o.headerFields || m.headerFields)
      : {};
    var headerFields = Object.assign({ score: true }, rawHf);

    var defaultDir = 'Directions: Read the passage quietly. At each bold bracketed group, circle the one word that makes the best sense in the sentence.';
    var directions = String(o.directions != null ? o.directions : (m.directions != null ? m.directions : defaultDir)).trim();

    var body = [];
    body.push(buildWorksheetHeaderXml(title, subtitleLine, headerFields, d, contentW, false));

    if (directions) {
      body.push(pXml([rXml(directions, { italic: true, sz: d.dirHp, color: '222222' })], {
        style: 'Directions',
        before: 120,
        after: 100,
        keepNext: true
      }));
    }

    // Optional Warm-up practice box
    var warmItems = [];
    if (Array.isArray(m.warmup)) {
      warmItems = m.warmup.filter(Boolean);
    } else if (m.warmup && typeof m.warmup === 'object') {
      warmItems = [m.warmup];
    } else if (typeof m.warmup === 'string' && m.warmup.trim()) {
      warmItems = [{ before: m.warmup.trim(), choices: [], after: '' }];
    }

    if (warmItems.length) {
      var warmParas = [
        pXml([rXml('Warm-up practice \u2014 does not count', { bold: true, sz: d.bodyHp, color: '000000' })], {
          before: 15,
          after: 50,
          keepNext: true
        })
      ];
      warmItems.forEach(function (wi) {
        var wTokens = [];
        if (typeof wi === 'string') {
          wTokens.push({ type: 'text', text: wi });
        } else if (wi && typeof wi === 'object') {
          if (wi.before) wTokens.push({ type: 'text', text: String(wi.before) });
          if (Array.isArray(wi.choices) && wi.choices.length) {
            wTokens.push({ type: 'blank', num: null, choices: wi.choices.map(choiceText).filter(Boolean), answer: String(wi.answer || '') });
          }
          if (wi.after) wTokens.push({ type: 'text', text: String(wi.after) });
        }
        var wRuns = buildMazeRuns(wTokens, d, false);
        if (wRuns.length) {
          warmParas.push(pXml(wRuns, { before: 20, after: 40, line: Math.round(d.lineTw * 1.3) }));
        }
      });
      body.push(shadedBoxXml(warmParas, contentW, d, {
        shade: 'F2F2F2',
        borderSz: 10,
        padV: d.cellPadV + 20,
        padH: d.cellPadH + 30
      }));
      body.push(pXml('', { before: 50, after: 30 }));
    }

    // Maze reading passage
    var passageParas = content.paragraphs.length
      ? content.paragraphs.map(function (toks) {
          var runs = buildMazeRuns(toks, d, true);
          return pXml(runs, {
            before: 40,
            after: d.paraAfter + 80,
            line: Math.round(d.lineTw * 1.45)
          });
        })
      : [pXml([rXml('No Maze reading passage is available yet.', { italic: true, sz: d.bodyHp })], { before: 40, after: 40 })];

    body.push(shadedBoxXml(passageParas, contentW, d, {
      shade: 'FFFFFF',
      borderSz: 10,
      padV: d.cellPadV + 40,
      padH: d.cellPadH + 50,
      cantSplit: false
    }));

    body.push(creditsFooterXml(resolveCredits(m, o), d));

    // Teacher Answer Key & CBM-Maze Scoring Sheet
    if (answerKeyOn && content.answerItems.length) {
      body.push(pageBreakXml());
      body.push(shadedBoxXml(
        pXml([rXml(KEY_NOTICE, { bold: true, sz: d.bodyHp, color: '000000' })], { before: 20, after: 20 }),
        contentW,
        d,
        { shade: 'F0F0F0', borderSz: 12, padV: 70, padH: 120 }
      ));
      body.push(pXml([rXml(title + ' \u2014 Teacher Answer Key & CBM-Maze Scoring Sheet', { bold: true, sz: d.titleHp - 4, color: '000000' })], {
        style: 'Heading1',
        before: 160,
        after: 80,
        keepNext: true
      }));

      // CBM-Maze Scoring Summary Box
      body.push(shadedBoxXml([
        pXml([
          rXml('Correct: ', { bold: true, sz: d.bodyHp }),
          rXml('________      ', { sz: d.bodyHp }),
          rXml('Errors: ', { bold: true, sz: d.bodyHp }),
          rXml('________      ', { sz: d.bodyHp }),
          rXml('Net Maze Score: ', { bold: true, sz: d.bodyHp }),
          rXml('________', { sz: d.bodyHp })
        ], { before: 25, after: 50 }),
        pXml([
          rXml('Scoring rule: Net Maze Score = Correct \u2212 Errors (minimum 0). Do not score warm-up items.', { italic: true, sz: d.smallHp, color: '333333' })
        ], { before: 10, after: 15 })
      ], contentW, d, { shade: 'FAFAFA', borderSz: 10, padV: 75, padH: 120 }));
      body.push(pXml('', { before: 50, after: 30 }));

      var keyBorder = 'w:val="single" w:sz="6" w:space="0" w:color="000000"';
      var ansItems = content.answerItems;
      if (ansItems.length > 18) {
        var halfM = Math.ceil(ansItems.length / 2);
        var halfW = Math.floor(contentW / 2);
        var mNum = 640;
        var mAns = 1660;
        var mCh = halfW - mNum - mAns;
        var mChRight = contentW - (mNum + mAns + mCh) - (mNum + mAns);
        var mWidths = [mNum, mAns, mCh, mNum, mAns, mChRight];
        var mHeads = ['#', 'Correct Word', 'Choices', '#', 'Correct Word', 'Choices'];
        var mRows = [
          rowXml(mHeads.map(function (txt, ci) {
            return cellXml(
              pXml([rXml(txt, { bold: true, sz: d.smallHp })], { before: 20, after: 20, align: (ci === 0 || ci === 3) ? 'center' : 'left' }),
              mWidths[ci],
              { shade: 'EFEFEF', vAlign: 'center', padV: 45, padH: 60 }
            );
          }), { cantSplit: true, header: true })
        ];
        for (var r = 0; r < halfM; r++) {
          var lIt = ansItems[r];
          var rIt = ansItems[r + halfM];
          mRows.push(rowXml([
            cellXml(pXml([rXml('#' + lIt.num, { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), mWidths[0], { padV: 40, padH: 40 }),
            cellXml(pXml([rXml(lIt.answer || '\u2014', { bold: true, sz: d.smallHp })], { before: 15, after: 15 }), mWidths[1], { padV: 40, padH: 60 }),
            cellXml(pXml([rXml(lIt.choices.join(' / '), { sz: d.smallHp, color: '333333' })], { before: 15, after: 15 }), mWidths[2], { padV: 40, padH: 60 }),
            cellXml(pXml(rIt ? [rXml('#' + rIt.num, { bold: true, sz: d.smallHp })] : '', { before: 15, after: 15, align: 'center' }), mWidths[3], { padV: 40, padH: 40 }),
            cellXml(pXml(rIt ? [rXml(rIt.answer || '\u2014', { bold: true, sz: d.smallHp })] : '', { before: 15, after: 15 }), mWidths[4], { padV: 40, padH: 60 }),
            cellXml(pXml(rIt ? [rXml(rIt.choices.join(' / '), { sz: d.smallHp, color: '333333' })] : '', { before: 15, after: 15 }), mWidths[5], { padV: 40, padH: 60 })
          ], { cantSplit: true }));
        }
        body.push(tableXml(mWidths, mRows, { borders: keyBorder, padV: 40, padH: 60 }));
      } else {
        var c1 = 800;
        var c2 = 2800;
        var c3 = contentW - c1 - c2;
        var sWidths = [c1, c2, c3];
        var sRows = [
          rowXml(['#', 'Correct Word', 'Choices'].map(function (txt, ci) {
            return cellXml(
              pXml([rXml(txt, { bold: true, sz: d.bodyHp })], { before: 20, after: 20, align: ci === 0 ? 'center' : 'left' }),
              sWidths[ci],
              { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
            );
          }), { cantSplit: true, header: true })
        ];
        ansItems.forEach(function (it) {
          sRows.push(rowXml([
            cellXml(pXml([rXml('#' + it.num, { bold: true, sz: d.bodyHp })], { before: 15, after: 15, align: 'center' }), sWidths[0], { padV: 50, padH: 50 }),
            cellXml(pXml([rXml(it.answer || '\u2014', { bold: true, sz: d.bodyHp })], { before: 15, after: 15 }), sWidths[1], { padV: 50, padH: d.cellPadH }),
            cellXml(pXml([rXml(it.choices.join(' / '), { sz: d.bodyHp, color: '333333' })], { before: 15, after: 15 }), sWidths[2], { padV: 50, padH: d.cellPadH })
          ], { cantSplit: true }));
        });
        body.push(tableXml(sWidths, sRows, { borders: keyBorder, padV: 50, padH: d.cellPadH }));
      }
    }

    var filename = ensureDocxFilename(o.filename, slug(title, 'maze') + '-maze-worksheet');
    return packageDocx(body.join('\n'), d, filename, o);
  }

  // ---------------------------------------------------------------------------
  // 7. Choice Board, Concept Sort, Sequence Order & Tiered Writing (.docx)
  // ---------------------------------------------------------------------------
  function deterministicMix(list) {
    var src = Array.isArray(list) ? list.slice() : [];
    if (src.length < 2) return src;
    var out = [];
    for (var stride = 0; stride < 2; stride++) {
      for (var i = stride; i < src.length; i += 2) out.push(src[i]);
    }
    if (out.length > 2 && out[0] === src[0]) out.push(out.shift());
    return out;
  }

  function appendConceptSortXml(body, keyRows, spec, d, contentW, keyPrefix) {
    var rawCats = Array.isArray(spec.categories) ? spec.categories : [];
    var categories = rawCats.map(function (c, idx) {
      if (typeof c === 'string') return { id: 'cat' + (idx + 1), label: c, description: '', items: [] };
      if (!c || typeof c !== 'object') return null;
      return {
        id: String(c.id || c.label || ('cat' + (idx + 1))),
        label: String(c.label || c.title || c.name || ('Category ' + (idx + 1))).trim(),
        description: String(c.description || '').trim(),
        items: Array.isArray(c.items) ? c.items : []
      };
    }).filter(Boolean);

    var catLabelByKey = Object.create(null);
    categories.forEach(function (c) {
      catLabelByKey[c.id.toLowerCase()] = c.label;
      catLabelByKey[c.label.toLowerCase()] = c.label;
    });

    var cards = [];
    if (Array.isArray(spec.cards) && spec.cards.length) {
      spec.cards.forEach(function (card) {
        if (typeof card === 'string' && card.trim()) {
          cards.push({ text: card.trim(), detail: '', category: '' });
        } else if (card && typeof card === 'object') {
          var txt = String(card.text || card.label || card.title || card.word || '').trim();
          if (!txt) return;
          cards.push({
            text: txt,
            detail: String(card.detail || card.description || '').trim(),
            category: String(card.category || '').trim()
          });
        }
      });
    } else if (categories.some(function (c) { return c.items.length > 0; })) {
      var grouped = [];
      categories.forEach(function (c) {
        c.items.forEach(function (item) {
          var txt = choiceText(item).trim();
          if (txt) grouped.push({ text: txt, detail: '', category: c.label });
        });
      });
      cards = deterministicMix(grouped);
    }

    if (categories.length) {
      var perRow = categories.length <= 4 ? categories.length : (categories.length === 4 ? 2 : 3);
      var rowCount = Math.max(4, Math.min(7, Math.ceil((cards.length || 6) / Math.max(1, categories.length)) + 1));
      var tableBorder = 'w:val="single" w:sz="8" w:space="0" w:color="000000"';

      for (var start = 0; start < categories.length; start += perRow) {
        var slice = categories.slice(start, start + perRow);
        var widths = equalColWidths(contentW, slice.length);
        var headCells = slice.map(function (cat, ci) {
          var paras = [pXml([rXml(cat.label, { bold: true, sz: d.bodyHp })], { before: 20, after: cat.description ? 20 : 25, align: 'center' })];
          if (cat.description) {
            paras.push(pXml([rXml(cat.description, { italic: true, sz: d.smallHp, color: '333333' })], { before: 0, after: 20, align: 'center' }));
          }
          return cellXml(paras, widths[ci], { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH });
        });
        var rows = [rowXml(headCells, { cantSplit: true, header: true })];
        for (var ri = 0; ri < rowCount; ri++) {
          var emptyCells = widths.map(function (w) {
            return cellXml(pXml('', { before: 0, after: 0 }), w, { padV: d.cellPadV, padH: d.cellPadH });
          });
          rows.push(rowXml(emptyCells, { cantSplit: true, height: d.writeLineHeight, hRule: 'atLeast' }));
        }
        body.push(tableXml(widths, rows, { borders: tableBorder, padV: d.cellPadV, padH: d.cellPadH }));
        body.push(pXml('', { before: 40, after: 40 }));
      }
    }

    if (cards.length) {
      var bankParas = [
        pXml([rXml('Cards to Sort', { bold: true, sz: d.bodyHp, color: '000000' })], { before: 15, after: 50, keepNext: true })
      ];
      var chipLines = cards.map(function (card) {
        return card.text + (card.detail ? ' (' + card.detail + ')' : '');
      });
      bankParas.push(pXml([rXml(chipLines.join('    \u2022    '), { bold: true, sz: d.bodyHp, color: '000000' })], {
        before: 10,
        after: 20,
        line: Math.round(d.lineTw * 1.25)
      }));
      body.push(shadedBoxXml(bankParas, contentW, d, {
        shade: 'F3F4F6',
        borderSz: 10,
        padV: d.cellPadV + 20,
        padH: d.cellPadH + 30
      }));

      cards.forEach(function (card) {
        if (!card.category) return;
        var resolvedCat = catLabelByKey[card.category.toLowerCase()] || card.category;
        keyRows.push({
          col1: (keyPrefix ? keyPrefix + ' \u2014 ' : '') + card.text,
          col2: resolvedCat
        });
      });
    }
  }

  function appendSequenceOrderXml(body, keyRows, spec, d, contentW, keyPrefix) {
    var rawSteps = Array.isArray(spec.steps) ? spec.steps : [];
    var steps = rawSteps.map(function (st, idx) {
      if (typeof st === 'string' && st.trim()) {
        return { label: '', text: st.trim(), order: null, origIdx: idx };
      }
      if (!st || typeof st !== 'object') return null;
      var txt = String(st.text || st.title || st.description || '').trim();
      if (!txt) return null;
      var ord = st.order != null && st.order !== '' && Number.isFinite(Number(st.order)) ? Number(st.order) : null;
      return {
        label: String(st.label || '').trim(),
        text: txt,
        order: ord,
        origIdx: idx
      };
    }).filter(Boolean);

    if (!steps.length) return;

    var boxW = 1360;
    var textW = contentW - boxW;
    var seqBorder = 'w:val="single" w:sz="8" w:space="0" w:color="000000"';
    var seqRows = [
      rowXml([
        cellXml(pXml([rXml('Order', { bold: true, sz: d.smallHp })], { before: 20, after: 20, align: 'center' }), boxW, { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: 60 }),
        cellXml(pXml([rXml('Steps (number 1 to ' + steps.length + ' in the boxes)', { bold: true, sz: d.smallHp })], { before: 20, after: 20 }), textW, { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH })
      ], { cantSplit: true, header: true })
    ];

    steps.forEach(function (st) {
      var textRuns = [];
      if (st.label) textRuns.push(rXml(st.label + ': ', { bold: true, sz: d.bodyHp }));
      textRuns.push(rXml(st.text, { sz: d.bodyHp }));
      seqRows.push(rowXml([
        cellXml(pXml([rXml('[ ___ ]', { bold: true, sz: d.bodyHp })], { before: 30, after: 30, align: 'center' }), boxW, { vAlign: 'center', padV: d.cellPadV, padH: 60 }),
        cellXml(pXml(textRuns, { before: 30, after: 30 }), textW, { vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH })
      ], { cantSplit: true, height: Math.max(460, d.writeLineHeight), hRule: 'atLeast' }));
    });

    body.push(tableXml([boxW, textW], seqRows, { borders: seqBorder, padV: d.cellPadV, padH: d.cellPadH }));

    // Optional ruled copy-in-order lines
    var copyCount = spec.copyLines === false ? 0
      : (Number(spec.writeLines) > 0 ? Math.min(12, Math.floor(Number(spec.writeLines))) : Math.min(steps.length, 8));
    if (copyCount > 0) {
      body.push(pXml([rXml('Write the steps in order:', { bold: true, sz: d.bodyHp })], {
        before: 140,
        after: 50,
        keepNext: true
      }));
      for (var li = 0; li < copyCount; li++) {
        body.push(pXml([
          rXml((li + 1) + '.  ', { bold: true, sz: d.bodyHp }),
          rXml('____________________________________________________________________', { sz: d.bodyHp, color: '555555' })
        ], { before: Math.round(d.writeLineHeight * 0.45), after: 50, keepLines: true }));
      }
    }

    // Answer key order: sort by numeric order when present
    var hasOrder = steps.some(function (st) { return st.order !== null; });
    var ordered = steps.slice();
    if (hasOrder) {
      ordered.sort(function (a, b) {
        var ao = a.order !== null ? a.order : a.origIdx;
        var bo = b.order !== null ? b.order : b.origIdx;
        return (ao - bo) || (a.origIdx - b.origIdx);
      });
    }
    ordered.forEach(function (st, idx) {
      keyRows.push({
        col1: (keyPrefix ? keyPrefix + ' #' : '#') + (idx + 1),
        col2: (st.label ? st.label + ': ' : '') + st.text
      });
    });
  }

  function appendClozeShortXml(body, keyRows, spec, d, contentW, keyPrefix) {
    var bankWords = Array.isArray(spec.wordBank) ? spec.wordBank.map(choiceText).filter(Boolean) : [];
    if (bankWords.length) {
      body.push(shadedBoxXml(
        pXml([
          rXml('Word Bank:  ', { bold: true, sz: d.bodyHp }),
          rXml(bankWords.join('   \u2022   '), { bold: true, sz: d.bodyHp })
        ], { before: 20, after: 20 }),
        contentW,
        d,
        { shade: 'F2F2F2', borderSz: 8 }
      ));
      body.push(pXml('', { before: 30, after: 30 }));
    }
    var qs = Array.isArray(spec.questions) ? spec.questions : [];
    qs.forEach(function (q, idx) {
      if (!q || typeof q !== 'object') return;
      var txt = String(q.text || q.prompt || '').replace(/_{2,}|\[blank\]/gi, '______________');
      if (!txt) return;
      body.push(pXml([
        rXml((idx + 1) + '.  ', { bold: true, sz: d.bodyHp }),
        rXml(txt, { sz: d.bodyHp })
      ], { before: d.itemBefore, after: d.itemAfter, indentLeft: 320, hanging: 320, keepLines: true }));
      var ans = Array.isArray(q.answers) ? q.answers.map(choiceText).filter(Boolean).join(' / ') : String(q.answer || '').trim();
      if (ans) {
        keyRows.push({ col1: (keyPrefix ? keyPrefix + ' #' : 'Item #') + (idx + 1), col2: ans });
      }
    });
  }

  function appendTieredWritingXml(body, spec, d, contentW, compactMode) {
    var passage = String(spec.passage || '').trim();
    var passageTitle = String(spec.passageTitle || '').trim();
    if (passage) {
      var pParas = [];
      if (passageTitle) {
        pParas.push(pXml([rXml(passageTitle, { bold: true, sz: d.bodyHp + 2 })], { before: 15, after: 40, keepNext: true }));
      }
      passage.replace(/\r\n?/g, '\n').split(/\n{2,}/).forEach(function (pg) {
        if (pg.trim()) {
          pParas.push(pXml([rXml(pg.replace(/\n/g, ' ').trim(), { sz: d.bodyHp })], { before: 20, after: 50, line: Math.round(d.lineTw * 1.2) }));
        }
      });
      body.push(shadedBoxXml(pParas, contentW, d, { shade: 'FFFFFF', borderSz: 8, cantSplit: false }));
      body.push(pXml('', { before: 40, after: 30 }));
    }

    var promptText = String(spec.prompt || '').trim();
    var minWords = Number(spec.minWords) || 0;
    if (promptText || minWords > 0) {
      var prParas = [
        pXml([rXml('Writing Prompt', { bold: true, sz: d.bodyHp, color: '000000' })], { before: 15, after: 35, keepNext: true })
      ];
      if (promptText) {
        prParas.push(pXml([rXml(promptText, { sz: d.bodyHp + 1, color: '000000' })], { before: 10, after: minWords > 0 ? 40 : 15 }));
      }
      if (minWords > 0) {
        prParas.push(pXml([rXml('Aim for at least ' + minWords + ' words. Use the supports below or your own words.', { italic: true, sz: d.smallHp, color: '333333' })], { before: 10, after: 15 }));
      }
      body.push(shadedBoxXml(prParas, contentW, d, { shade: 'FFFFFF', borderSz: 10, padV: d.cellPadV + 20, padH: d.cellPadH + 30 }));
      body.push(pXml('', { before: 40, after: 20 }));
    }

    var frames = Array.isArray(spec.frames) ? spec.frames.map(choiceText).filter(Boolean) : [];
    var starters = Array.isArray(spec.starters) ? spec.starters.map(choiceText).filter(Boolean) : [];
    if (frames.length || starters.length) {
      var stTitle = frames.length && starters.length
        ? 'Sentence Frames & Sentence Starters'
        : (frames.length ? 'Sentence Frames' : 'Sentence Starters');
      var stParas = [
        pXml([rXml(stTitle, { bold: true, sz: d.bodyHp, color: '000000' })], { before: 15, after: 40, keepNext: true })
      ];
      frames.forEach(function (f) {
        stParas.push(pXml([rXml('\u2022  ' + f, { sz: d.bodyHp })], { before: 15, after: 30, indentLeft: 240, hanging: 180 }));
      });
      starters.forEach(function (s) {
        stParas.push(pXml([rXml('\u2022  ' + s, { sz: d.bodyHp })], { before: 15, after: 30, indentLeft: 240, hanging: 180 }));
      });
      body.push(shadedBoxXml(stParas, contentW, d, { shade: 'F3F4F6', borderSz: 8, padV: d.cellPadV + 15, padH: d.cellPadH + 25 }));
      body.push(pXml('', { before: 40, after: 20 }));
    }

    var wordBank = Array.isArray(spec.wordBank) ? spec.wordBank.map(choiceText).filter(Boolean) : [];
    if (wordBank.length) {
      body.push(shadedBoxXml(
        pXml([
          rXml('Word Bank:  ', { bold: true, sz: d.bodyHp }),
          rXml(wordBank.join('   \u2022   '), { bold: true, sz: d.bodyHp })
        ], { before: 20, after: 20 }),
        contentW,
        d,
        { shade: 'F2F2F2', borderSz: 8, padV: d.cellPadV + 15, padH: d.cellPadH + 25 }
      ));
      body.push(pXml('', { before: 40, after: 20 }));
    }

    var lineCount = Math.max(1, Math.min(24, Number(spec.writeLines != null ? spec.writeLines : (compactMode ? 5 : 6)) || 6));
    for (var i = 0; i < lineCount; i++) {
      body.push(writingLineXml(d, { dashedTop: true, after: 50 }));
    }

    var rubric = Array.isArray(spec.rubric) && spec.rubric.length
      ? spec.rubric
      : (Array.isArray(spec.checklist) ? spec.checklist : []);
    var rubricClean = rubric.map(choiceText).filter(Boolean);
    if (rubricClean.length) {
      body.push(pXml([rXml('Self-Check Rubric', { bold: true, sz: d.bodyHp })], { before: 120, after: 45, keepNext: true }));
      rubricClean.forEach(function (item) {
        body.push(pXml([
          rXml('\u2610  ', { sz: d.bodyHp }),
          rXml(item, { sz: d.bodyHp })
        ], { before: 20, after: 35, indentLeft: 240, hanging: 240, keepLines: true }));
      });
    }
  }

  function buildChoiceWorksheetDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = resolveDensity(o.density || m.density);
    var contentW = PAGE_W - (d.margin * 2);
    var rawAct = String(o.activity || m.activity || 'choice_board').trim().toLowerCase();
    var activity = (rawAct === 'concept_sort' || rawAct === 'sequence_order' || rawAct === 'tiered_writing' || rawAct === 'choice_board')
      ? rawAct
      : 'choice_board';

    var defaultTitles = {
      choice_board: 'Choice Board Worksheet',
      concept_sort: 'Concept Sort Worksheet',
      sequence_order: 'Sequence Order Worksheet',
      tiered_writing: 'Tiered Writing Worksheet'
    };
    var defaultDirs = {
      choice_board: 'Choose one option below to show what you learned. Check the box beside the option you choose.',
      concept_sort: 'Write each card from the bank into the matching category box below, or cut and sort.',
      sequence_order: 'Write the correct order number (1, 2, 3...) in the box beside each step.',
      tiered_writing: 'Read the writing prompt carefully. Use the sentence supports and word bank as needed.'
    };

    var title = String(o.title || m.title || defaultTitles[activity]).trim() || defaultTitles[activity];
    var subtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var headerFields = o.headerFields || m.headerFields || {};
    var answerKeyOn = o.answerKeyOn !== undefined ? !!o.answerKeyOn
      : (o.answerKey !== undefined ? !!o.answerKey : (m.answerKeyOn !== undefined ? !!m.answerKeyOn : true));
    var directions = String(o.directions != null ? o.directions : (m.directions != null ? m.directions : defaultDirs[activity])).trim();

    var body = [];
    body.push(buildWorksheetHeaderXml(title, subtitle, headerFields, d, contentW, false));

    if (m.goal && activity === 'choice_board') {
      body.push(pXml('', { before: 50, after: 20 }));
      body.push(shadedBoxXml(
        pXml([
          rXml('Learning Goal:  ', { bold: true, sz: d.bodyHp }),
          rXml(String(m.goal).trim(), { sz: d.bodyHp })
        ], { before: 15, after: 15 }),
        contentW,
        d,
        { shade: 'F5F5F5', borderSz: 8 }
      ));
    }

    if (directions) {
      body.push(pXml([rXml(directions, { italic: true, sz: d.dirHp, color: '222222' })], {
        style: 'Directions',
        before: 110,
        after: 90,
        keepNext: true
      }));
    }

    if (m.prompt && activity !== 'tiered_writing') {
      body.push(pXml([rXml(String(m.prompt).trim(), { bold: true, sz: d.bodyHp, color: '000000' })], {
        before: 30,
        after: 80,
        keepNext: true
      }));
    }

    var keyRows = [];
    var keyHeaders = ['Item', 'Answer'];

    if (activity === 'choice_board') {
      var rawCards = Array.isArray(m.items) && m.items.length
        ? m.items
        : (Array.isArray(m.pathways) ? m.pathways : []);
      var boardCards = rawCards.map(function (item, idx) {
        if (typeof item === 'string' && item.trim()) {
          return { title: 'Option ' + (idx + 1), description: item.trim(), kind: '', data: null };
        }
        if (!item || typeof item !== 'object') return null;
        return {
          title: String(item.title || item.label || item.name || ('Option ' + (idx + 1))).trim(),
          description: String(item.description || item.summary || item.prompt || '').trim(),
          kind: String(item.kind || '').trim().toLowerCase(),
          data: item.data && typeof item.data === 'object' ? item.data : null
        };
      }).filter(Boolean);

      if (!boardCards.length) {
        body.push(pXml([rXml('No choice board options are available yet.', { italic: true, sz: d.bodyHp })], { before: 100, after: 100 }));
      } else {
        var explicitCols = Number(o.columns || m.columns) || 0;
        var cols = (explicitCols === 2 || explicitCols === 3)
          ? explicitCols
          : (boardCards.length === 3 ? 3 : (boardCards.length <= 2 || boardCards.length === 4 ? 2 : (d.name === 'primary' ? 2 : 3)));
        var widths = equalColWidths(contentW, cols);
        var cardRows = [];
        for (var start = 0; start < boardCards.length; start += cols) {
          var rowCells = [];
          for (var c = 0; c < cols; c++) {
            var idx = start + c;
            if (idx >= boardCards.length) {
              rowCells.push(cellXml(pXml('', { before: 0, after: 0 }), widths[c], { padV: d.cellPadV, padH: d.cellPadH }));
              continue;
            }
            var card = boardCards[idx];
            var cellParas = [
              pXml([
                rXml('\u2610  ', { bold: true, sz: d.bodyHp + 2 }),
                rXml(card.title, { bold: true, sz: d.bodyHp + 1 })
              ], { before: 20, after: card.description ? 50 : 40 })
            ];
            if (card.description) {
              cellParas.push(pXml([rXml(card.description, { sz: d.bodyHp, color: '222222' })], { before: 0, after: 40 }));
            }
            rowCells.push(cellXml(cellParas, widths[c], { padV: d.cellPadV + 40, padH: d.cellPadH + 30 }));
          }
          cardRows.push(rowXml(rowCells, { cantSplit: true, height: 1350, hRule: 'atLeast' }));
        }
        body.push(tableXml(widths, cardRows, {
          borders: 'w:val="single" w:sz="10" w:space="0" w:color="000000"',
          padV: d.cellPadV + 30,
          padH: d.cellPadH + 20
        }));

        // If pathways include detailed sub-activity data (e.g. from packets-choice.js), render each pathway workspace below.
        var richPathways = boardCards.filter(function (c) { return !!c.data && !!c.kind; });
        richPathways.forEach(function (pw, pIdx) {
          var prefix = 'Option ' + (pIdx + 1) + ' (' + pw.title + ')';
          body.push(sectionHeadXml('Option ' + (pIdx + 1) + ': ' + pw.title, pw.description, d, false));
          if (pw.kind === 'concept_sort') {
            appendConceptSortXml(body, keyRows, pw.data, d, contentW, prefix);
          } else if (pw.kind === 'sequence_order') {
            appendSequenceOrderXml(body, keyRows, Object.assign({ copyLines: false }, pw.data), d, contentW, prefix);
          } else if (pw.kind === 'cloze_short') {
            appendClozeShortXml(body, keyRows, pw.data, d, contentW, prefix);
          } else if (pw.kind === 'tiered_writing') {
            appendTieredWritingXml(body, pw.data, d, contentW, true);
          }
        });
      }
    } else if (activity === 'concept_sort') {
      keyHeaders = ['Card', 'Category'];
      appendConceptSortXml(body, keyRows, m, d, contentW, '');
    } else if (activity === 'sequence_order') {
      keyHeaders = ['Order', 'Step'];
      appendSequenceOrderXml(body, keyRows, m, d, contentW, '');
    } else if (activity === 'tiered_writing') {
      appendTieredWritingXml(body, m, d, contentW, false);
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));

    if (answerKeyOn && keyRows.length) {
      body.push(pageBreakXml());
      body.push(shadedBoxXml(
        pXml([rXml(KEY_NOTICE, { bold: true, sz: d.bodyHp, color: '000000' })], { before: 20, after: 20 }),
        contentW,
        d,
        { shade: 'F0F0F0', borderSz: 12, padV: 70, padH: 120 }
      ));
      body.push(pXml([rXml(title + ' \u2014 Teacher Answer Key', { bold: true, sz: d.titleHp - 4, color: '000000' })], {
        style: 'Heading1',
        before: 160,
        after: 100,
        keepNext: true
      }));
      var kCol1 = activity === 'sequence_order' ? 1200 : Math.round(contentW * 0.56);
      var kCol2 = contentW - kCol1;
      var kRows = [
        rowXml([
          cellXml(pXml([rXml(keyHeaders[0], { bold: true, sz: d.bodyHp })], { before: 20, after: 20, align: activity === 'sequence_order' ? 'center' : 'left' }), kCol1, { shade: 'EFEFEF', padV: d.cellPadV, padH: d.cellPadH }),
          cellXml(pXml([rXml(keyHeaders[1], { bold: true, sz: d.bodyHp })], { before: 20, after: 20 }), kCol2, { shade: 'EFEFEF', padV: d.cellPadV, padH: d.cellPadH })
        ], { cantSplit: true, header: true })
      ];
      keyRows.forEach(function (kr) {
        kRows.push(rowXml([
          cellXml(pXml([rXml(kr.col1, { bold: true, sz: d.bodyHp })], { before: 15, after: 15, align: activity === 'sequence_order' ? 'center' : 'left' }), kCol1, { padV: 50, padH: d.cellPadH }),
          cellXml(pXml([rXml(kr.col2, { sz: d.bodyHp })], { before: 15, after: 15 }), kCol2, { padV: 50, padH: d.cellPadH })
        ], { cantSplit: true }));
      });
      body.push(tableXml([kCol1, kCol2], kRows, {
        borders: 'w:val="single" w:sz="6" w:space="0" w:color="000000"',
        padV: 50,
        padH: d.cellPadH
      }));
    }

    var actSlug = slug(activity, 'activity');
    var filename = ensureDocxFilename(o.filename, slug(title, 'activity') + '-' + actSlug + '-worksheet');
    return packageDocx(body.join('\n'), d, filename, o);
  }

  // ---------------------------------------------------------------------------
  // 8. Class & Student Progress Report (.docx) — MTSS / IEP / Parent Conferences
  // ---------------------------------------------------------------------------
  function formatTodayIso() {
    var now = new Date();
    var m = now.getMonth() + 1;
    var day = now.getDate();
    return now.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function formatReportScore(row) {
    if (row.scoreText != null && String(row.scoreText).trim()) return String(row.scoreText).trim();
    var hasPct = row.percent != null && row.percent !== '' && Number.isFinite(Number(row.percent));
    var hasFrac = row.correct != null && row.total != null && Number.isFinite(Number(row.correct)) && Number.isFinite(Number(row.total)) && Number(row.total) > 0;
    if (hasPct && hasFrac) return Math.round(Number(row.percent)) + '% (' + row.correct + '/' + row.total + ')';
    if (hasPct) return Math.round(Number(row.percent)) + '%';
    if (hasFrac) return row.correct + ' / ' + row.total;
    return '\u2014';
  }

  function formatFocusEntry(entry) {
    if (typeof entry === 'string' || typeof entry === 'number') return String(entry).trim();
    if (!entry || typeof entry !== 'object') return '';
    if (entry.text) return String(entry.text).trim();
    if (entry.measure || entry.name) {
      var head = String(entry.measure || entry.name).trim();
      var parts = [];
      if (entry.value != null && entry.value !== '') parts.push(String(entry.value).trim());
      if (entry.target != null && entry.target !== '') parts.push('Target: ' + String(entry.target).trim());
      if (entry.date) parts.push(String(entry.date).trim());
      if (entry.note) parts.push(String(entry.note).trim());
      return head + (parts.length ? ' \u2014 ' + parts.join(' \u00b7 ') : '');
    }
    if (entry.item || entry.word || entry.display) {
      var lbl = String(entry.item || entry.word || entry.display).trim();
      if (entry.misses != null) lbl += ' (' + entry.misses + 'x)';
      else if (entry.count != null) lbl += ' (' + entry.count + 'x)';
      if (entry.wrong) lbl += ' [common: ' + String(entry.wrong).trim() + ']';
      return lbl;
    }
    return '';
  }

  function buildSingleStudentConferenceDocx(m, o) {
    var d = resolveDensity(o.density || m.density || 'standard');
    var contentW = PAGE_W - (d.margin * 2);
    var generatedDate = String(o.generatedDate || m.generatedDate || formatTodayIso()).trim();
    var conferenceDate = String(o.conferenceDate || m.conferenceDate || generatedDate).trim();
    var teacherName = String(o.teacher || m.teacher || m.examiner || '').trim();
    var dateRangeStr = String(m.dateRange || (m.summary && m.summary.dateRange) || '').trim();
    var notesPrompt = o.notesPrompt !== undefined ? !!o.notesPrompt : (m.notesPrompt !== undefined ? !!m.notesPrompt : true);

    var rawRows = Array.isArray(m.rows) ? m.rows : [];
    var rows = rawRows.filter(function (r) { return r && typeof r === 'object'; });
    var studentFocus = (Array.isArray(m.studentFocus) ? m.studentFocus : []).filter(function (sf) {
      return sf && typeof sf === 'object';
    });
    var primaryFocus = studentFocus[0] || {};
    var studentName = String(
      o.studentName || m.studentName || m.learner || m.student
      || primaryFocus.learner || primaryFocus.student || primaryFocus.name
      || (rows[0] && (rows[0].learner || rows[0].student || rows[0].name))
      || 'Student'
    ).trim() || 'Student';

    var rawTitle = String(o.title || m.title || '').trim();
    var title = (rawTitle && /conference|handout/i.test(rawTitle))
      ? rawTitle
      : (studentName + ' \u2014 Student Progress & Conference Handout');
    var subtitle = String(
      o.subtitle != null ? o.subtitle
        : (m.subtitle != null && String(m.subtitle).trim()
          ? m.subtitle
          : 'Editable summary of progress, helpful supports, and learning goals for parent, family, and IEP/MTSS conferences.')
    ).trim();

    var sum = m.summary && typeof m.summary === 'object' ? m.summary : {};
    var avgPctText = '';
    if (sum.avgPercent != null && sum.avgPercent !== '') {
      avgPctText = typeof sum.avgPercent === 'number' && Number.isFinite(sum.avgPercent)
        ? (Math.round(sum.avgPercent) + '%')
        : String(sum.avgPercent).trim();
    } else {
      var pctVals = rows.map(function (r) { return Number(r.percent); }).filter(function (v) { return Number.isFinite(v); });
      if (pctVals.length) {
        avgPctText = Math.round(pctVals.reduce(function (a, b) { return a + b; }, 0) / pctVals.length) + '%';
      }
    }

    var body = [];

    // Warm Conference Title & Subtitle
    body.push(pXml([rXml(title, { bold: true, sz: Math.max(30, d.titleHp - 2), color: '000000' })], {
      style: 'Title',
      before: 0,
      after: 40,
      keepNext: true
    }));
    if (subtitle) {
      body.push(pXml([rXml(subtitle, { italic: true, sz: d.smallHp, color: '333333' })], {
        style: 'Subtitle',
        before: 0,
        after: 80,
        keepNext: true
      }));
    }

    // Student / Conference Date / Teacher Header Table
    var c1 = Math.round(contentW * 0.38);
    var c2 = Math.round(contentW * 0.28);
    var c3 = contentW - c1 - c2;
    body.push(tableXml([c1, c2, c3], [
      rowXml([
        cellXml(pXml([
          rXml('Student / Code Name: ', { bold: true, sz: d.smallHp }),
          rXml(studentName, { sz: d.smallHp })
        ], { before: 20, after: 30 }), c1, { padV: 35, padH: 35 }),
        cellXml(pXml([
          rXml('Conference Date: ', { bold: true, sz: d.smallHp }),
          rXml(conferenceDate || '____________', { sz: d.smallHp })
        ], { before: 20, after: 30 }), c2, { padV: 35, padH: 35 }),
        cellXml(pXml([
          rXml('Teacher / Specialist: ', { bold: true, sz: d.smallHp }),
          rXml(teacherName || '________________', { sz: d.smallHp })
        ], { before: 20, after: 30 }), c3, { padV: 35, padH: 35 })
      ], { cantSplit: true })
    ], {
      borders: {
        top: 'none',
        left: 'none',
        right: 'none',
        bottom: 'w:val="single" w:sz="12" w:space="0" w:color="000000"',
        insideH: 'none',
        insideV: 'none'
      },
      padV: 35,
      padH: 35
    }));
    body.push(pXml('', { before: 50, after: 20 }));

    // Student Overview Summary Box
    var stats = ['Activities Completed: ' + (sum.files != null ? sum.files : rows.length)];
    if (avgPctText) stats.push('Average Score: ' + avgPctText);
    if (dateRangeStr) stats.push('Date Range: ' + dateRangeStr);
    var tier = String(m.tier || primaryFocus.tier || '').trim();
    if (tier) stats.push('Support Tier: ' + tier);
    var sumParas = [
      pXml([rXml('Student Snapshot', { bold: true, sz: d.headingHp - 2, color: '000000' })], { before: 15, after: 40, keepNext: true }),
      pXml([rXml(stats.join('    \u00b7    '), { bold: true, sz: d.bodyHp, color: '000000' })], { before: 10, after: 25 })
    ];
    var measures = Array.isArray(sum.measures) ? sum.measures : [];
    measures.forEach(function (ms) {
      var line = typeof ms === 'string' ? ms.trim() : formatFocusEntry(ms);
      if (line) {
        sumParas.push(pXml([rXml('\u2022  ' + line, { sz: d.smallHp, color: '222222' })], {
          before: 10,
          after: 20,
          indentLeft: 220,
          hanging: 160
        }));
      }
    });
    body.push(shadedBoxXml(sumParas, contentW, d, {
      shade: 'F3F4F6',
      borderSz: 10,
      padV: d.cellPadV + 15,
      padH: d.cellPadH + 25
    }));

    // Score History Table
    body.push(sectionHeadXml('Score History', 'Recent activities, dates, scores, timing, and supports used.', d, false));
    if (!rows.length) {
      body.push(pXml([rXml('No recorded activity results yet for ' + studentName + '.', { italic: true, sz: d.bodyHp })], { before: 40, after: 80 }));
    } else {
      var hw1 = Math.round(contentW * 0.34);
      var hw2 = Math.round(contentW * 0.16);
      var hw3 = Math.round(contentW * 0.20);
      var hw4 = contentW - hw1 - hw2 - hw3;
      var hWidths = [hw1, hw2, hw3, hw4];
      var hHeads = ['Activity / Check', 'Date', 'Score', 'Time / Supports'];
      var hRows = [
        rowXml(hHeads.map(function (txt, ci) {
          return cellXml(
            pXml([rXml(txt, { bold: true, sz: d.smallHp })], { before: 20, after: 20, align: (ci === 1 || ci === 2) ? 'center' : 'left' }),
            hWidths[ci],
            { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
          );
        }), { cantSplit: true, header: true })
      ];
      rows.forEach(function (r) {
        var actTitle = String(r.title || r.activity || '\u2014').trim();
        var actSub = (r.title && r.activity && String(r.title).trim().toLowerCase() !== String(r.activity).trim().toLowerCase())
          ? String(r.activity).trim()
          : '';
        var actParas = [pXml([rXml(actTitle, { bold: !!actSub, sz: d.smallHp })], { before: 15, after: actSub ? 10 : 15 })];
        if (actSub) {
          actParas.push(pXml([rXml(actSub, { italic: true, sz: Math.max(16, d.smallHp - 2), color: '444444' })], { before: 0, after: 15 }));
        }
        var supBits = [];
        if (r.timeText && String(r.timeText).trim()) supBits.push(String(r.timeText).trim());
        if (Array.isArray(r.supports) && r.supports.length) {
          var js = r.supports.map(choiceText).filter(Boolean).join(', ');
          if (js) supBits.push('Supports: ' + js);
        } else if (typeof r.supports === 'string' && r.supports.trim()) {
          supBits.push('Supports: ' + r.supports.trim());
        }
        if (Array.isArray(r.notes) && r.notes.length) {
          var jn = r.notes.map(choiceText).filter(Boolean).join('; ');
          if (jn) supBits.push(jn);
        } else if (typeof r.notes === 'string' && r.notes.trim()) {
          supBits.push(r.notes.trim());
        }
        var supParas = supBits.length
          ? supBits.map(function (ln, li) {
              return pXml([rXml(ln, { sz: Math.max(16, d.smallHp - 1), color: '222222' })], {
                before: li === 0 ? 15 : 5,
                after: li === supBits.length - 1 ? 15 : 10
              });
            })
          : [pXml([rXml('\u2014', { sz: d.smallHp, color: '555555' })], { before: 15, after: 15 })];
        hRows.push(rowXml([
          cellXml(actParas, hWidths[0], { padV: 50, padH: d.cellPadH }),
          cellXml(pXml([rXml(String(r.date || '\u2014').trim(), { sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), hWidths[1], { padV: 50, padH: 50 }),
          cellXml(pXml([rXml(formatReportScore(r), { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), hWidths[2], { padV: 50, padH: 50 }),
          cellXml(supParas, hWidths[3], { padV: 50, padH: d.cellPadH })
        ], { cantSplit: true }));
      });
      body.push(tableXml(hWidths, hRows, {
        borders: 'w:val="single" w:sz="6" w:space="0" w:color="000000"',
        padV: 50,
        padH: d.cellPadH
      }));
    }

    // Collect Strengths, Supports Used, Paper Scores, Missed Skills, Goals, Notes
    function collectUniqueList(sources) {
      var seen = Object.create(null);
      var list = [];
      sources.forEach(function (src) {
        if (!src) return;
        var arr = Array.isArray(src) ? src : [src];
        arr.forEach(function (item) {
          var txt = formatFocusEntry(item) || choiceText(item).trim();
          if (!txt) return;
          var key = txt.toLowerCase();
          if (!seen[key]) {
            seen[key] = true;
            list.push(txt);
          }
        });
      });
      return list;
    }

    var rowSupportSources = [];
    rows.forEach(function (r) {
      if (Array.isArray(r.supports)) rowSupportSources.push(r.supports);
      else if (typeof r.supports === 'string' && r.supports.trim()) {
        rowSupportSources.push(r.supports.split(',').map(function (s) { return s.trim(); }));
      }
    });
    var strengths = collectUniqueList([m.strengths, primaryFocus.strengths]);
    var supportsUsed = collectUniqueList([m.supports, primaryFocus.supports].concat(rowSupportSources));
    var missedSkills = collectUniqueList([m.missedSkills, m.missedItems, primaryFocus.missedSkills, primaryFocus.missedItems]);
    var goals = collectUniqueList([m.goals, primaryFocus.goals]);
    var paperScores = collectUniqueList([m.paperScores, primaryFocus.paperScores]);
    var focusNote = String(m.notes || primaryFocus.notes || '').trim();

    // Strengths & Supports Used
    body.push(sectionHeadXml('Strengths & Helpful Supports', 'What is working well and which classroom tools help ' + studentName + ' succeed.', d, false));
    var ssParas = [];
    if (strengths.length) {
      ssParas.push(pXml([rXml('Strengths:', { bold: true, sz: d.bodyHp })], { before: 15, after: 30, keepNext: true }));
      strengths.forEach(function (st) {
        ssParas.push(pXml([rXml('\u2022  ' + st, { sz: d.bodyHp })], { before: 10, after: 25, indentLeft: 240, hanging: 180 }));
      });
    }
    if (supportsUsed.length) {
      ssParas.push(pXml([
        rXml('Supports used:  ', { bold: true, sz: d.bodyHp }),
        rXml(supportsUsed.join(', '), { sz: d.bodyHp })
      ], { before: strengths.length ? 40 : 15, after: 25 }));
    }
    if (paperScores.length) {
      ssParas.push(pXml([
        rXml('Paper & additional checks:  ', { bold: true, sz: d.smallHp }),
        rXml(paperScores.join('; '), { sz: d.smallHp })
      ], { before: 25, after: 20 }));
    }
    if (focusNote) {
      ssParas.push(pXml([
        rXml('Teacher summary:  ', { bold: true, sz: d.smallHp }),
        rXml(focusNote, { sz: d.smallHp })
      ], { before: 25, after: 20 }));
    }
    if (!ssParas.length) {
      ssParas.push(pXml([rXml('Use this conference to highlight strengths and helpful supports for ' + studentName + '.', { italic: true, sz: d.smallHp, color: '444444' })], { before: 15, after: 20 }));
    }
    body.push(shadedBoxXml(ssParas, contentW, d, { shade: 'FFFFFF', borderSz: 8, padV: d.cellPadV + 15, padH: d.cellPadH + 25 }));

    // Missed Skills to Practice
    if (missedSkills.length) {
      body.push(sectionHeadXml('Skills to Practice Next', 'Specific items or skills to review together at school and home.', d, false));
      missedSkills.forEach(function (ms) {
        body.push(pXml([
          rXml('\u2022  ', { bold: true, sz: d.bodyHp }),
          rXml(ms, { sz: d.bodyHp })
        ], { before: 20, after: 30, indentLeft: 260, hanging: 180, keepLines: true }));
      });
    }

    // Learning Goals
    if (goals.length) {
      body.push(sectionHeadXml('Learning Goals', 'Current progress targets and next milestones.', d, false));
      goals.forEach(function (g) {
        body.push(pXml([
          rXml('\u2610  ', { sz: d.bodyHp }),
          rXml(g, { sz: d.bodyHp })
        ], { before: 20, after: 35, indentLeft: 260, hanging: 220, keepLines: true }));
      });
    }

    // Parent / Teacher Notes
    if (notesPrompt) {
      body.push(sectionHeadXml('Parent / Teacher Notes', 'Family feedback, questions, celebrations, and agreed next steps.', d, false));
      var notesLines = Math.max(2, Math.min(12, Number(o.notesLines != null ? o.notesLines : (m.notesLines != null ? m.notesLines : 5)) || 5));
      for (var ni = 0; ni < notesLines; ni++) {
        body.push(writingLineXml(d, { height: Math.max(300, d.writeLineHeight), after: 45 }));
      }
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));
    var filename = ensureDocxFilename(o.filename, slug(studentName, 'student') + '-conference-handout');
    return packageDocx(body.join('\n'), d, filename, o);
  }

  function buildProgressReportDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    if (o.singleStudent === true || m.singleStudent === true) {
      return buildSingleStudentConferenceDocx(m, o);
    }
    var d = resolveDensity(o.density || m.density || 'compact');
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'Class & Student Progress Report').trim() || 'Class & Student Progress Report';
    var generatedDate = String(o.generatedDate || m.generatedDate || formatTodayIso()).trim();
    var dateRangeStr = String(m.dateRange || (m.summary && m.summary.dateRange) || '').trim();
    var subtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var notesPrompt = o.notesPrompt !== undefined ? !!o.notesPrompt : (m.notesPrompt !== undefined ? !!m.notesPrompt : true);

    var rawRows = Array.isArray(m.rows) ? m.rows : [];
    var rows = rawRows.filter(function (r) { return r && typeof r === 'object'; });
    var studentFocus = (Array.isArray(m.studentFocus) ? m.studentFocus : []).filter(function (sf) {
      return sf && typeof sf === 'object' && String(sf.learner || sf.student || sf.name || '').trim();
    });

    // Compute overview metrics with automatic fallbacks
    var sum = m.summary && typeof m.summary === 'object' ? m.summary : {};
    var uniqueLearners = Object.create(null);
    rows.forEach(function (r) {
      var l = String(r.learner || r.student || r.name || '').trim().toLowerCase();
      if (l) uniqueLearners[l] = true;
    });
    studentFocus.forEach(function (sf) {
      var l = String(sf.learner || sf.student || sf.name || '').trim().toLowerCase();
      if (l) uniqueLearners[l] = true;
    });
    var studentCount = sum.students != null && Number.isFinite(Number(sum.students))
      ? Number(sum.students)
      : Object.keys(uniqueLearners).length;
    var fileCount = sum.files != null && Number.isFinite(Number(sum.files))
      ? Number(sum.files)
      : (sum.results != null && Number.isFinite(Number(sum.results)) ? Number(sum.results) : rows.length);
    var avgPctText = '';
    if (sum.avgPercent != null && sum.avgPercent !== '') {
      avgPctText = typeof sum.avgPercent === 'number' && Number.isFinite(sum.avgPercent)
        ? (Math.round(sum.avgPercent) + '%')
        : String(sum.avgPercent).trim();
    } else {
      var pctVals = rows.map(function (r) { return Number(r.percent); }).filter(function (v) { return Number.isFinite(v); });
      if (pctVals.length) {
        var avg = pctVals.reduce(function (a, b) { return a + b; }, 0) / pctVals.length;
        avgPctText = Math.round(avg) + '%';
      }
    }

    var body = [];

    // Report Header
    body.push(pXml([rXml(title, { bold: true, sz: Math.max(30, d.titleHp), color: '000000' })], {
      style: 'Title',
      before: 0,
      after: 40,
      keepNext: true
    }));

    var headerMeta = ['Generated: ' + generatedDate];
    if (dateRangeStr) headerMeta.push('Date range: ' + dateRangeStr);
    if (subtitle) headerMeta.push(subtitle);
    body.push(pXml([rXml(headerMeta.join('  \u00b7  '), { sz: d.smallHp, color: '333333' })], {
      before: 0,
      after: 30,
      keepNext: true
    }));
    body.push(pXml([rXml('Student code names only \u2014 editable report for IEP, MTSS, and family conferences.', { italic: true, sz: Math.max(16, d.smallHp - 1), color: '444444' })], {
      before: 0,
      after: 120,
      borders: { bottom: 'w:val="single" w:sz="12" w:space="4" w:color="000000"' }
    }));

    // Class Overview Summary Box
    var overviewStats = [
      'Students: ' + studentCount,
      'Results / Files: ' + fileCount
    ];
    if (avgPctText) overviewStats.push('Class Average: ' + avgPctText);
    if (sum.paperCount != null && Number(sum.paperCount) > 0) overviewStats.push('Paper Scores: ' + Number(sum.paperCount));

    var sumParas = [
      pXml([rXml('Class Overview', { bold: true, sz: d.headingHp - 2, color: '000000' })], { before: 15, after: 45, keepNext: true }),
      pXml([rXml(overviewStats.join('    \u00b7    '), { bold: true, sz: d.bodyHp, color: '000000' })], { before: 10, after: 35 })
    ];

    var measures = Array.isArray(sum.measures) ? sum.measures : [];
    if (measures.length) {
      sumParas.push(pXml([rXml('Measures Included:', { bold: true, sz: d.smallHp, color: '222222' })], { before: 35, after: 20, keepNext: true }));
      measures.forEach(function (ms) {
        var line = '';
        if (typeof ms === 'string') {
          line = ms.trim();
        } else if (ms && typeof ms === 'object') {
          var mName = String(ms.label || ms.name || ms.measure || '').trim();
          var mBits = [];
          if (ms.median != null && ms.median !== '') mBits.push('median ' + ms.median + (ms.unit ? ' ' + ms.unit : ''));
          if (ms.count != null && ms.count !== '') mBits.push(ms.count + ' students');
          if (ms.summary) mBits.push(String(ms.summary).trim());
          line = mName + (mBits.length ? ' \u2014 ' + mBits.join(' \u00b7 ') : '');
        }
        if (line) {
          sumParas.push(pXml([rXml('\u2022  ' + line, { sz: d.smallHp, color: '222222' })], {
            before: 10,
            after: 20,
            indentLeft: 220,
            hanging: 160
          }));
        }
      });
    }

    body.push(shadedBoxXml(sumParas, contentW, d, {
      shade: 'F3F4F6',
      borderSz: 10,
      padV: d.cellPadV + 20,
      padH: d.cellPadH + 30
    }));

    // Student Results Table
    body.push(sectionHeadXml('Student Results', 'Summary of student sessions, scores, timing, and supports.', d, false));
    if (!rows.length) {
      body.push(pXml([rXml('No student result rows were included in this report.', { italic: true, sz: d.bodyHp })], { before: 40, after: 80 }));
    } else {
      var w1 = Math.round(contentW * 0.18);
      var w2 = Math.round(contentW * 0.27);
      var w3 = Math.round(contentW * 0.13);
      var w4 = Math.round(contentW * 0.16);
      var w5 = contentW - w1 - w2 - w3 - w4;
      var colWidths = [w1, w2, w3, w4, w5];
      var colHeads = ['Student', 'Activity / File', 'Date', 'Score', 'Time / Supports'];
      var tblRows = [
        rowXml(colHeads.map(function (txt, ci) {
          return cellXml(
            pXml([rXml(txt, { bold: true, sz: d.smallHp })], { before: 20, after: 20, align: (ci === 2 || ci === 3) ? 'center' : 'left' }),
            colWidths[ci],
            { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
          );
        }), { cantSplit: true, header: true })
      ];

      rows.forEach(function (r) {
        var learner = String(r.learner || r.student || r.name || 'Student').trim();
        var actTitle = String(r.title || r.activity || '\u2014').trim();
        var actSub = (r.title && r.activity && String(r.title).trim().toLowerCase() !== String(r.activity).trim().toLowerCase())
          ? String(r.activity).trim()
          : '';
        var dateTxt = String(r.date || '\u2014').trim();
        var scoreTxt = formatReportScore(r);

        var actParas = [pXml([rXml(actTitle, { bold: !!actSub, sz: d.smallHp })], { before: 15, after: actSub ? 10 : 15 })];
        if (actSub) {
          actParas.push(pXml([rXml(actSub, { italic: true, sz: Math.max(16, d.smallHp - 2), color: '444444' })], { before: 0, after: 15 }));
        }

        var supBits = [];
        if (r.timeText && String(r.timeText).trim()) supBits.push(String(r.timeText).trim());
        if (Array.isArray(r.supports) && r.supports.length) {
          var joinedSup = r.supports.map(choiceText).filter(Boolean).join(', ');
          if (joinedSup) supBits.push('Supports: ' + joinedSup);
        } else if (typeof r.supports === 'string' && r.supports.trim()) {
          supBits.push('Supports: ' + r.supports.trim());
        }
        if (Array.isArray(r.notes) && r.notes.length) {
          var joinedNotes = r.notes.map(choiceText).filter(Boolean).join('; ');
          if (joinedNotes) supBits.push(joinedNotes);
        } else if (typeof r.notes === 'string' && r.notes.trim()) {
          supBits.push(r.notes.trim());
        }

        var supParas = supBits.length
          ? supBits.map(function (line, li) {
              return pXml([rXml(line, { sz: Math.max(16, d.smallHp - 1), color: '222222' })], {
                before: li === 0 ? 15 : 5,
                after: li === supBits.length - 1 ? 15 : 10
              });
            })
          : [pXml([rXml('\u2014', { sz: d.smallHp, color: '555555' })], { before: 15, after: 15 })];

        tblRows.push(rowXml([
          cellXml(pXml([rXml(learner, { bold: true, sz: d.smallHp })], { before: 15, after: 15 }), colWidths[0], { padV: 50, padH: d.cellPadH }),
          cellXml(actParas, colWidths[1], { padV: 50, padH: d.cellPadH }),
          cellXml(pXml([rXml(dateTxt, { sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), colWidths[2], { padV: 50, padH: 50 }),
          cellXml(pXml([rXml(scoreTxt, { bold: true, sz: d.smallHp })], { before: 15, after: 15, align: 'center' }), colWidths[3], { padV: 50, padH: 50 }),
          cellXml(supParas, colWidths[4], { padV: 50, padH: d.cellPadH })
        ], { cantSplit: true }));
      });

      body.push(tableXml(colWidths, tblRows, {
        borders: 'w:val="single" w:sz="6" w:space="0" w:color="000000"',
        padV: 50,
        padH: d.cellPadH
      }));
    }

    // Optional Per-Student Focus & Goals Section
    if (studentFocus.length) {
      body.push(sectionHeadXml('Student Focus & Goals', 'Missed items to reteach, progress goals, and paper scores by student.', d, false));
      studentFocus.forEach(function (sf) {
        var name = String(sf.learner || sf.student || sf.name || 'Student').trim();
        var tier = String(sf.tier || '').trim();
        var cardParas = [
          pXml([
            rXml(name, { bold: true, sz: d.bodyHp + 1, color: '000000' }),
            tier ? rXml('  \u2014  ' + tier, { italic: true, sz: d.smallHp, color: '333333' }) : ''
          ].filter(Boolean), { before: 15, after: 45, keepNext: true })
        ];

        var missed = (Array.isArray(sf.missedItems) ? sf.missedItems : []).map(formatFocusEntry).filter(Boolean);
        if (missed.length) {
          cardParas.push(pXml([
            rXml('Missed items to reteach:  ', { bold: true, sz: d.smallHp }),
            rXml(missed.join(', '), { sz: d.smallHp })
          ], { before: 15, after: 35 }));
        }

        var goals = (Array.isArray(sf.goals) ? sf.goals : []).map(formatFocusEntry).filter(Boolean);
        if (goals.length) {
          cardParas.push(pXml([
            rXml('Progress goals:  ', { bold: true, sz: d.smallHp }),
            rXml(goals.join('; '), { sz: d.smallHp })
          ], { before: 15, after: 35 }));
        }

        var paperScores = (Array.isArray(sf.paperScores) ? sf.paperScores : []).map(formatFocusEntry).filter(Boolean);
        if (paperScores.length) {
          cardParas.push(pXml([
            rXml('Paper scores:  ', { bold: true, sz: d.smallHp }),
            rXml(paperScores.join('; '), { sz: d.smallHp })
          ], { before: 15, after: 35 }));
        }

        var sfSupports = Array.isArray(sf.supports)
          ? sf.supports.map(choiceText).filter(Boolean).join(', ')
          : String(sf.supports || '').trim();
        if (sfSupports) {
          cardParas.push(pXml([
            rXml('Supports used:  ', { bold: true, sz: d.smallHp }),
            rXml(sfSupports, { sz: d.smallHp })
          ], { before: 15, after: 35 }));
        }

        if (sf.notes && String(sf.notes).trim()) {
          cardParas.push(pXml([
            rXml('Notes:  ', { bold: true, sz: d.smallHp }),
            rXml(String(sf.notes).trim(), { sz: d.smallHp })
          ], { before: 15, after: 20 }));
        }

        body.push(shadedBoxXml(cardParas, contentW, d, {
          shade: 'FFFFFF',
          borderSz: 8,
          padV: d.cellPadV + 15,
          padH: d.cellPadH + 25,
          cantSplit: true
        }));
        body.push(pXml('', { before: 35, after: 20 }));
      });
    }

    // Teacher Conference Notes Lines
    if (notesPrompt) {
      body.push(sectionHeadXml('Teacher Conference Notes', 'Record conference observations, family input, and next instructional steps.', d, false));
      var notesLines = Math.max(2, Math.min(12, Number(o.notesLines != null ? o.notesLines : (m.notesLines != null ? m.notesLines : 5)) || 5));
      for (var ni = 0; ni < notesLines; ni++) {
        body.push(writingLineXml(d, { height: Math.max(300, d.writeLineHeight), after: 45 }));
      }
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));

    var filename = ensureDocxFilename(o.filename, slug(title, 'class') + '-progress-report');
    return packageDocx(body.join('\n'), d, filename, o);
  }

  // ---------------------------------------------------------------------------
  // 9. AAC Communication Board (.docx) — Fitzgerald Key Tints & Embedded Symbols
  // ---------------------------------------------------------------------------
  var FITZGERALD_FILL = {
    pronoun: 'FFF9C4',
    pronouns: 'FFF9C4',
    people: 'FFF9C4',
    person: 'FFF9C4',
    verb: 'DCFCE7',
    verbs: 'DCFCE7',
    action: 'DCFCE7',
    actions: 'DCFCE7',
    descriptor: 'DBEAFE',
    descriptors: 'DBEAFE',
    adjective: 'DBEAFE',
    adjectives: 'DBEAFE',
    adverb: 'DBEAFE',
    describe: 'DBEAFE',
    feeling: 'DBEAFE',
    feelings: 'DBEAFE',
    noun: 'FFEDD5',
    nouns: 'FFEDD5',
    object: 'FFEDD5',
    objects: 'FFEDD5',
    thing: 'FFEDD5',
    things: 'FFEDD5',
    food: 'FFEDD5',
    place: 'FFEDD5',
    places: 'FFEDD5',
    social: 'FCE7F3',
    greeting: 'FCE7F3',
    greetings: 'FCE7F3',
    polite: 'FCE7F3',
    chat: 'FCE7F3',
    question: 'EDE9FE',
    questions: 'EDE9FE',
    wh: 'EDE9FE',
    preposition: 'EDE9FE',
    prepositions: 'EDE9FE',
    grammar: 'EDE9FE',
    little: 'EDE9FE',
    negation: 'FEE2E2',
    important: 'FEE2E2',
    alert: 'FEE2E2',
    stop: 'FEE2E2',
    core: 'F3F4F6'
  };

  function normalizeHexFill(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(s)) {
      s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    }
    return /^[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : '';
  }

  function resolveAacCellFill(cell, isMono) {
    if (isMono) return 'FFFFFF';
    if (!cell || typeof cell !== 'object') return 'FFFFFF';
    var direct = normalizeHexFill(cell.colorHex || cell.bgHex || cell.fill || cell.color);
    if (direct) return direct;
    var cat = String(cell.category || '').trim().toLowerCase().replace(/[^a-z]+/g, '');
    if (cat && Object.prototype.hasOwnProperty.call(FITZGERALD_FILL, cat)) {
      return FITZGERALD_FILL[cat];
    }
    if (cell.core) return FITZGERALD_FILL.core;
    return 'FFFFFF';
  }

  function buildAacBoardDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = Object.assign({}, resolveDensity(o.density || m.density || 'standard'), { margin: 720 });
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'AAC Communication Board').trim() || 'AAC Communication Board';
    var subtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var cols = Math.max(1, Math.min(8, Math.floor(Number(o.columns != null ? o.columns : m.columns) || 4)));
    var rawColorMode = String(o.colorMode || m.colorMode || 'fitzgerald').trim().toLowerCase();
    var isMono = rawColorMode === 'mono' || rawColorMode === 'monochrome' || rawColorMode === 'bw';
    var includeSentenceStrip = o.includeSentenceStrip !== undefined ? !!o.includeSentenceStrip
      : (m.includeSentenceStrip !== undefined ? !!m.includeSentenceStrip : true);

    var rawCells = Array.isArray(m.cells) ? m.cells : [];
    var reqRows = Math.max(1, Math.min(12, Math.floor(Number(o.rows != null ? o.rows : m.rows) || 3)));
    var totalRows = Math.max(reqRows, Math.ceil(rawCells.length / cols) || 1);
    var imgReg = createImageRegistry();

    var body = [];

    // Title & Subtitle
    body.push(pXml([rXml(title, { bold: true, sz: d.titleHp, color: '000000' })], {
      style: 'Title',
      before: 0,
      after: subtitle ? 35 : 80,
      align: 'center',
      keepNext: true
    }));
    if (subtitle) {
      body.push(pXml([rXml(subtitle, { italic: true, sz: d.smallHp, color: '333333' })], {
        style: 'Subtitle',
        before: 0,
        after: 80,
        align: 'center',
        keepNext: true
      }));
    }

    // Optional Sentence Strip Box
    if (includeSentenceStrip) {
      var stripCue = String(o.sentenceStripText || m.sentenceStripText || 'I want   /   Feel   /   Go   /   Help   /   More   /   Finished').trim();
      var stripParas = [
        pXml([
          rXml('Sentence Strip:   ', { bold: true, sz: d.bodyHp, color: '000000' }),
          rXml(stripCue, { italic: true, sz: d.smallHp, color: '444444' })
        ], { before: 20, after: 40 }),
        pXml('', { before: 140, after: 20 })
      ];
      body.push(shadedBoxXml(stripParas, contentW, d, {
        shade: isMono ? 'FFFFFF' : 'FAFAFA',
        borderSz: 12,
        padV: 80,
        padH: 130,
        cantSplit: true
      }));
      body.push(pXml('', { before: 50, after: 50 }));
    }

    // Communication Grid Table
    var widths = equalColWidths(contentW, cols);
    var imgSizeIn = cols >= 6 ? 0.65 : 0.85;
    var labelSz = cols <= 3 ? 32 : (cols === 4 ? 28 : (cols === 5 ? 24 : 20));
    var rowHeightTw = cols >= 6 ? 1380 : 1760;
    var gridRows = [];

    for (var r = 0; r < totalRows; r++) {
      var rowCells = [];
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var cell = idx < rawCells.length ? rawCells[idx] : null;
        if (!cell) {
          rowCells.push(cellXml(pXml('', { before: 0, after: 0 }), widths[c], {
            shade: 'FFFFFF',
            vAlign: 'center',
            padV: 80,
            padH: 70
          }));
          continue;
        }
        var cObj = (typeof cell === 'string') ? { label: cell } : cell;
        var lbl = String(cObj.label || cObj.text || cObj.word || '').trim();
        var fillHex = resolveAacCellFill(cObj, isMono);
        var picUri = '';
        if (typeof cObj.imgUri === 'string' && isRasterDataUri(cObj.imgUri)) picUri = cObj.imgUri;
        else if (typeof cObj.picture === 'string' && isRasterDataUri(cObj.picture)) picUri = cObj.picture;
        else if (typeof cObj.pictureUri === 'string' && isRasterDataUri(cObj.pictureUri)) picUri = cObj.pictureUri;
        else if (typeof cObj.uri === 'string' && isRasterDataUri(cObj.uri)) picUri = cObj.uri;

        var drawXml = picUri ? imgReg.addImage(picUri, imgSizeIn, imgSizeIn, lbl || ('Symbol ' + (idx + 1))) : null;
        var cellParas = [];
        if (drawXml) {
          cellParas.push(pXml([drawingRunXml(drawXml)], { before: 30, after: 50, align: 'center' }));
        }
        if (lbl) {
          cellParas.push(pXml([rXml(lbl, { bold: true, sz: labelSz, color: '000000' })], {
            before: drawXml ? 15 : 40,
            after: 30,
            align: 'center'
          }));
        }
        if (!cellParas.length) {
          cellParas.push(pXml('', { before: 0, after: 0, align: 'center' }));
        }

        rowCells.push(cellXml(cellParas, widths[c], {
          shade: fillHex,
          vAlign: 'center',
          padV: 80,
          padH: 70
        }));
      }
      gridRows.push(rowXml(rowCells, { cantSplit: true, height: rowHeightTw, hRule: 'atLeast' }));
    }

    body.push(tableXml(widths, gridRows, {
      borders: 'w:val="single" w:sz="10" w:space="0" w:color="000000"',
      padV: 80,
      padH: 70
    }));

    body.push(creditsFooterXml(resolveCredits(m, o), d));
    var filename = ensureDocxFilename(o.filename, slug(title, 'aac') + '-aac-board');
    return packageDocx(body.join('\n'), d, filename, o, imgReg);
  }

  // ---------------------------------------------------------------------------
  // 10. General Handout Builder (.docx) — Compile, Life Skills, SEL, STEM, Math Visuals
  // ---------------------------------------------------------------------------
  function resolveObjImageUri(obj) {
    if (!obj || typeof obj !== 'object') return '';
    var cand = obj.imgUri || obj.pictureUri || obj.uri || (isRasterDataUri(obj.picture) ? obj.picture : '');
    return typeof cand === 'string' ? cand : '';
  }

  function inferGeneralSectionType(sec) {
    var explicit = String(sec.type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (explicit) return explicit;
    if (sec.first || sec.then) return 'first_then';
    if ((Array.isArray(sec.columns) && sec.columns.length) || (Array.isArray(sec.rows) && sec.rows.length)) return 'table';
    if (Array.isArray(sec.wordBank) && sec.wordBank.length) return 'cloze';
    if (Array.isArray(sec.cards) && sec.cards.length) return 'cards';
    if (Array.isArray(sec.items) && sec.items.length) {
      var hasChoices = sec.items.some(function (it) {
        return it && typeof it === 'object' && ((Array.isArray(it.choices) && it.choices.length) || (Array.isArray(it.options) && it.options.length));
      });
      return hasChoices ? 'questions' : 'checklist';
    }
    if (Number(sec.writeLines) > 0) return 'lines';
    return 'lines';
  }

  function buildGeneralHandoutDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = resolveDensity(o.density || m.density || 'standard');
    var contentW = PAGE_W - (d.margin * 2);
    var title = String(o.title || m.title || 'Printable Handout').trim() || 'Printable Handout';
    var subtitle = String(o.subtitle != null ? o.subtitle : (m.subtitle || '')).trim();
    var headerFields = o.headerFields || m.headerFields || {};
    var directions = String(o.directions != null ? o.directions : (m.directions || '')).trim();
    var answerKeyOn = o.answerKeyOn !== undefined ? !!o.answerKeyOn
      : (o.answerKey !== undefined ? !!o.answerKey : (m.answerKeyOn !== undefined ? !!m.answerKeyOn : true));
    var sections = Array.isArray(m.sections) ? m.sections : [];
    var imgReg = createImageRegistry();

    var body = [];
    if (o.hideHeaderFields === true || m.hideHeaderFields === true) {
      body.push(pXml([rXml(title, { bold: true, sz: d.titleHp, color: '000000' })], {
        style: 'Title',
        before: 0,
        after: subtitle ? 40 : 90,
        keepNext: true
      }));
      if (subtitle) {
        body.push(pXml([rXml(subtitle, { italic: true, sz: d.dirHp, color: '333333' })], {
          style: 'Subtitle',
          before: 0,
          after: 90,
          borders: { bottom: 'w:val="single" w:sz="10" w:space="4" w:color="000000"' },
          keepNext: true
        }));
      }
    } else {
      body.push(buildWorksheetHeaderXml(title, subtitle, headerFields, d, contentW, false));
    }

    if (directions) {
      body.push(pXml([rXml(directions, { italic: true, sz: d.dirHp, color: '222222' })], {
        style: 'Directions',
        before: 110,
        after: 90,
        keepNext: true
      }));
    }

    var autoKeySections = [];
    var renderedAny = false;

    sections.forEach(function (sec, sIdx) {
      if (!sec || typeof sec !== 'object' || sec.hidden) return;
      renderedAny = true;
      var sType = inferGeneralSectionType(sec);
      var heading = String(sec.heading || sec.title || sec.label || '').trim();
      var secDir = String(sec.directions || '').trim();
      if (heading) {
        body.push(sectionHeadXml(heading, secDir, d, false));
      } else if (secDir) {
        body.push(pXml([rXml(secDir, { italic: true, sz: d.dirHp, color: '222222' })], {
          style: 'Directions',
          before: 80,
          after: 60,
          keepNext: true
        }));
      }

      if (sType === 'checklist') {
        var cItems = Array.isArray(sec.items) ? sec.items : [];
        cItems.forEach(function (it, idx) {
          var isObj = it && typeof it === 'object';
          var primary = isObj ? String(it.label || it.title || it.text || it.step || '').trim() : String(it == null ? '' : it).trim();
          var detail = isObj ? String(it.detail || it.description || it.note || '').trim() : '';
          if (!primary && !detail) return;
          var box = isObj && it.checked ? '\u2611  ' : '\u2610  ';
          var picUri = isObj ? resolveObjImageUri(it) : '';
          var drawXml = picUri ? imgReg.addImage(picUri, 0.55, 0.55, primary || ('Step ' + (idx + 1))) : null;
          var runs = [rXml(box, { bold: true, sz: d.bodyHp + 1 })];
          if (drawXml) {
            runs.push(drawingRunXml(drawXml));
            runs.push(rXml('  ', { sz: d.bodyHp }));
          }
          if (primary) runs.push(rXml(primary, { bold: !!detail, sz: d.bodyHp }));
          if (detail) runs.push(rXml((primary ? ' \u2014 ' : '') + detail, { sz: d.bodyHp, color: '222222' }));
          body.push(pXml(runs, {
            before: Math.round(d.itemBefore * 0.7),
            after: Math.round(d.itemAfter * 0.7),
            indentLeft: 280,
            hanging: 280,
            keepLines: true
          }));
        });
        if (Number(sec.writeLines) > 0) {
          var extraL = Math.min(12, Math.floor(Number(sec.writeLines)));
          for (var cl = 0; cl < extraL; cl++) body.push(writingLineXml(d, { dashedTop: true, after: 45 }));
        }
      } else if (sType === 'questions') {
        var qItems = Array.isArray(sec.items) && sec.items.length
          ? sec.items
          : (Array.isArray(sec.questions) ? sec.questions : []);
        var qKeyLines = [];
        qItems.forEach(function (q, idx) {
          var isObj = q && typeof q === 'object';
          var prompt = isObj ? String(q.prompt || q.question || q.text || q.stem || '').trim() : String(q == null ? '' : q).trim();
          if (!prompt) return;
          var picUri = isObj ? resolveObjImageUri(q) : '';
          var drawXml = picUri ? imgReg.addImage(picUri, 0.65, 0.65, 'Question ' + (idx + 1)) : null;
          var qRuns = [rXml((idx + 1) + '.  ', { bold: true, sz: d.bodyHp })];
          if (drawXml) {
            qRuns.push(drawingRunXml(drawXml));
            qRuns.push(rXml('  ', { sz: d.bodyHp }));
          }
          qRuns.push(rXml(prompt, { bold: true, sz: d.bodyHp }));
          body.push(pXml(qRuns, { before: d.itemBefore, after: 45, keepNext: true }));

          var qChoices = isObj
            ? (Array.isArray(q.choices) ? q.choices : (Array.isArray(q.options) ? q.options : []))
            : [];
          if (qChoices.length) {
            qChoices.forEach(function (ch, ci) {
              body.push(pXml([
                rXml('\u2610  ', { sz: d.bodyHp }),
                rXml(letterLabel(ci) + '.  ', { bold: true, sz: d.bodyHp }),
                rXml(choiceText(ch), { sz: d.bodyHp })
              ], {
                before: 20,
                after: ci === qChoices.length - 1 ? d.itemAfter : 25,
                indentLeft: 400,
                keepLines: true
              }));
            });
            if (isObj && q.answer != null && q.answer !== '') {
              var ansTxt = typeof q.answer === 'number' && q.answer >= 0 && q.answer < qChoices.length
                ? (letterLabel(q.answer) + '. ' + choiceText(qChoices[q.answer]))
                : String(q.answer);
              qKeyLines.push(prompt + ' \u2014 ' + ansTxt);
            }
          } else {
            var qLines = Math.max(1, Math.min(10, Number((isObj && q.writeLines) || sec.writeLines) || 2));
            for (var ql = 0; ql < qLines; ql++) {
              body.push(writingLineXml(d, {
                dashedTop: true,
                indentLeft: 300,
                after: ql === qLines - 1 ? d.itemAfter : 45
              }));
            }
            if (isObj && q.answer != null && String(q.answer).trim()) {
              qKeyLines.push(prompt + ' \u2014 ' + String(q.answer).trim());
            }
          }
          if (isObj && q.hint && String(q.hint).trim()) {
            body.push(pXml([rXml('Hint: ' + String(q.hint).trim(), { italic: true, sz: d.smallHp, color: '444444' })], {
              before: 0,
              after: 40,
              indentLeft: 300
            }));
          }
        });
        if (qKeyLines.length) autoKeySections.push({ heading: heading || ('Section ' + (sIdx + 1)), lines: qKeyLines });
      } else if (sType === 'table') {
        var rawCols = Array.isArray(sec.columns) ? sec.columns : [];
        var rawRows = Array.isArray(sec.rows) ? sec.rows : [];
        var colLabels = rawCols.map(function (c) {
          return typeof c === 'string' ? c : String((c && (c.label || c.heading || c.title)) || '');
        });
        var colCount = colLabels.length;
        if (!colCount && rawRows.length) {
          colCount = Array.isArray(rawRows[0]) ? rawRows[0].length : Object.keys(rawRows[0] || {}).length;
          if (!Array.isArray(rawRows[0]) && rawRows[0] && typeof rawRows[0] === 'object') {
            colLabels = Object.keys(rawRows[0]);
          }
        }
        colCount = Math.max(1, Math.min(8, colCount || 2));
        var tWidths = equalColWidths(contentW, colCount);
        var tRows = [];
        if (colLabels.length) {
          var hCells = [];
          for (var hc = 0; hc < colCount; hc++) {
            hCells.push(cellXml(
              pXml([rXml(String(colLabels[hc] || ''), { bold: true, sz: d.smallHp })], { before: 20, after: 20 }),
              tWidths[hc],
              { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }
            ));
          }
          tRows.push(rowXml(hCells, { cantSplit: true, header: true }));
        }
        if (rawRows.length) {
          rawRows.forEach(function (row) {
            var vals = Array.isArray(row)
              ? row
              : (row && typeof row === 'object' ? colLabels.map(function (lbl) { return row[lbl] != null ? row[lbl] : ''; }) : [row]);
            var rCells = [];
            for (var rc = 0; rc < colCount; rc++) {
              var cv = rc < vals.length ? vals[rc] : '';
              var cObj = cv && typeof cv === 'object' ? cv : null;
              var cText = cObj ? String(cObj.text || cObj.label || cObj.value || '') : String(cv == null ? '' : cv);
              var cPic = cObj ? resolveObjImageUri(cObj) : '';
              var cDraw = cPic ? imgReg.addImage(cPic, 0.6, 0.6, cText || 'Image') : null;
              var cParas = [];
              if (cDraw) cParas.push(pXml([drawingRunXml(cDraw)], { before: 15, after: 20, align: 'center' }));
              cParas.push(pXml([rXml(cText, { bold: !!(cObj && cObj.bold), sz: d.smallHp })], {
                before: 15,
                after: 15,
                align: (cObj && cObj.align) || 'left'
              }));
              rCells.push(cellXml(cParas, tWidths[rc], {
                shade: (cObj && normalizeHexFill(cObj.shade)) || '',
                vAlign: 'center',
                padV: d.cellPadV,
                padH: d.cellPadH
              }));
            }
            tRows.push(rowXml(rCells, { cantSplit: true, height: Math.max(400, d.writeLineHeight), hRule: 'atLeast' }));
          });
        } else {
          var blankRows = Math.max(2, Math.min(12, Number(sec.emptyRows || sec.writeLines) || 4));
          for (var br = 0; br < blankRows; br++) {
            var bCells = tWidths.map(function (w) {
              return cellXml(pXml('', { before: 0, after: 0 }), w, { padV: d.cellPadV, padH: d.cellPadH });
            });
            tRows.push(rowXml(bCells, { cantSplit: true, height: Math.max(460, d.writeLineHeight), hRule: 'atLeast' }));
          }
        }
        body.push(tableXml(tWidths, tRows, {
          borders: 'w:val="single" w:sz="6" w:space="0" w:color="000000"',
          padV: d.cellPadV,
          padH: d.cellPadH
        }));
        body.push(pXml('', { before: 30, after: 40 }));
      } else if (sType === 'first_then') {
        var firstSpec = sec.first || (Array.isArray(sec.items) ? sec.items[0] : null) || {};
        var thenSpec = sec.then || (Array.isArray(sec.items) ? sec.items[1] : null) || {};
        var ftWidths = equalColWidths(contentW, 2);

        function buildFtCellParas(spec, fallbackLabel) {
          var obj = (typeof spec === 'string') ? { label: spec } : (spec && typeof spec === 'object' ? spec : {});
          var lbl = String(obj.label || obj.title || obj.text || '').trim();
          var det = String(obj.detail || obj.description || '').trim();
          var picUri = resolveObjImageUri(obj);
          var drawXml = picUri ? imgReg.addImage(picUri, 1.0, 1.0, lbl || fallbackLabel) : null;
          var paras = [];
          if (drawXml) {
            paras.push(pXml([drawingRunXml(drawXml)], { before: 40, after: 60, align: 'center' }));
          }
          if (lbl) {
            paras.push(pXml([rXml(lbl, { bold: true, sz: d.headingHp + 2, color: '000000' })], { before: 40, after: det ? 40 : 60, align: 'center' }));
          }
          if (det) {
            paras.push(pXml([rXml(det, { sz: d.bodyHp, color: '222222' })], { before: 10, after: 40, align: 'center' }));
          }
          if (!paras.length) {
            paras.push(pXml('', { before: 120, after: 60 }));
            paras.push(writingLineXml(d, { height: 320, after: 40 }));
          }
          return paras;
        }

        var ftRows = [
          rowXml([
            cellXml(pXml([rXml('FIRST', { bold: true, sz: d.headingHp + 2, color: '000000' })], { before: 30, after: 30, align: 'center' }), ftWidths[0], { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH }),
            cellXml(pXml([rXml('THEN', { bold: true, sz: d.headingHp + 2, color: '000000' })], { before: 30, after: 30, align: 'center' }), ftWidths[1], { shade: 'EFEFEF', vAlign: 'center', padV: d.cellPadV, padH: d.cellPadH })
          ], { cantSplit: true, header: true }),
          rowXml([
            cellXml(buildFtCellParas(firstSpec, 'First'), ftWidths[0], { vAlign: 'center', padV: d.cellPadV + 60, padH: d.cellPadH + 40 }),
            cellXml(buildFtCellParas(thenSpec, 'Then'), ftWidths[1], { vAlign: 'center', padV: d.cellPadV + 60, padH: d.cellPadH + 40 })
          ], { cantSplit: true, height: 2200, hRule: 'atLeast' })
        ];
        body.push(tableXml(ftWidths, ftRows, {
          borders: 'w:val="single" w:sz="12" w:space="0" w:color="000000"',
          padV: d.cellPadV + 30,
          padH: d.cellPadH + 20
        }));
        body.push(pXml('', { before: 40, after: 40 }));
      } else if (sType === 'boxes' || sType === 'cards') {
        var rawCards = Array.isArray(sec.items) && sec.items.length
          ? sec.items
          : (Array.isArray(sec.cards) && sec.cards.length ? sec.cards : (Array.isArray(sec.boxes) ? sec.boxes : []));
        var cardCols = Math.max(1, Math.min(4, Math.floor(Number(sec.columns) || 2)));
        var cardWidths = equalColWidths(contentW, cardCols);
        var cardCount = rawCards.length || Math.max(2, Math.min(6, Number(sec.boxCount) || 2));
        var cardRows = [];
        for (var cStart = 0; cStart < cardCount; cStart += cardCols) {
          var cCells = [];
          for (var cc = 0; cc < cardCols; cc++) {
            var ci = cStart + cc;
            if (ci >= cardCount) {
              cCells.push(cellXml(pXml('', { before: 0, after: 0 }), cardWidths[cc], { padV: d.cellPadV, padH: d.cellPadH }));
              continue;
            }
            var card = ci < rawCards.length ? rawCards[ci] : null;
            var cardObj = (typeof card === 'string') ? { title: card } : (card && typeof card === 'object' ? card : {});
            var cTitle = String(cardObj.title || cardObj.label || cardObj.heading || '').trim();
            var cText = String(cardObj.detail || cardObj.description || cardObj.text || cardObj.prompt || '').trim();
            var cPic = resolveObjImageUri(cardObj);
            var cDraw = cPic ? imgReg.addImage(cPic, 0.8, 0.8, cTitle || ('Card ' + (ci + 1))) : null;
            var cParas = [];
            if (cDraw) cParas.push(pXml([drawingRunXml(cDraw)], { before: 20, after: 40, align: 'center' }));
            if (cTitle) {
              var prefix = (cardObj.checkbox || sec.checkboxes) ? '\u2610  ' : '';
              cParas.push(pXml([rXml(prefix + cTitle, { bold: true, sz: d.bodyHp + 1 })], { before: 20, after: cText ? 40 : 30 }));
            }
            if (cText) {
              cParas.push(pXml([rXml(cText, { sz: d.bodyHp, color: '222222' })], { before: 10, after: 30 }));
            }
            var cLines = Number(cardObj.writeLines || 0);
            for (var wl = 0; wl < Math.min(6, cLines); wl++) {
              cParas.push(writingLineXml(d, { height: Math.round(d.writeLineHeight * 0.75), after: 30 }));
            }
            if (!cParas.length) cParas.push(pXml('', { before: 60, after: 60 }));
            cCells.push(cellXml(cParas, cardWidths[cc], {
              shade: normalizeHexFill(cardObj.shade) || '',
              padV: d.cellPadV + 30,
              padH: d.cellPadH + 25
            }));
          }
          cardRows.push(rowXml(cCells, { cantSplit: true, height: 1200, hRule: 'atLeast' }));
        }
        body.push(tableXml(cardWidths, cardRows, {
          borders: 'w:val="single" w:sz="10" w:space="0" w:color="000000"',
          padV: d.cellPadV + 20,
          padH: d.cellPadH + 20
        }));
        body.push(pXml('', { before: 30, after: 40 }));
      } else if (sType === 'cloze') {
        var wb = Array.isArray(sec.wordBank) ? sec.wordBank.map(choiceText).filter(Boolean) : [];
        if (wb.length) {
          body.push(shadedBoxXml(
            pXml([
              rXml('Word Bank:  ', { bold: true, sz: d.bodyHp }),
              rXml(wb.join('   \u2022   '), { bold: true, sz: d.bodyHp })
            ], { before: 20, after: 20 }),
            contentW,
            d,
            { shade: 'F2F2F2', borderSz: 8 }
          ));
          body.push(pXml('', { before: 30, after: 30 }));
        }
        var clItems = Array.isArray(sec.items) && sec.items.length
          ? sec.items
          : (sec.text || sec.passage ? String(sec.text || sec.passage).replace(/\r\n?/g, '\n').split(/\n+/).filter(Boolean) : []);
        var clKeyLines = [];
        clItems.forEach(function (ci, idx) {
          var isObj = ci && typeof ci === 'object';
          var lineTxt = '';
          if (isObj && (ci.before != null || ci.after != null)) {
            lineTxt = String(ci.before || '') + '______________' + String(ci.after || '');
          } else {
            var rawStr = isObj ? String(ci.text || ci.prompt || '') : String(ci == null ? '' : ci);
            lineTxt = rawStr.replace(/_{2,}|\[blank\]/gi, '______________').trim();
          }
          if (!lineTxt) return;
          body.push(pXml([
            rXml((idx + 1) + '.  ', { bold: true, sz: d.bodyHp }),
            rXml(lineTxt, { sz: d.bodyHp })
          ], { before: d.itemBefore, after: d.itemAfter, indentLeft: 320, hanging: 320, keepLines: true }));
          if (isObj && ci.answer != null && String(ci.answer).trim()) {
            clKeyLines.push(String(ci.answer).trim());
          }
        });
        if (clKeyLines.length) autoKeySections.push({ heading: heading || ('Section ' + (sIdx + 1)), lines: clKeyLines });
      } else {
        // 'lines' or general text + writing lines
        var linePrompts = Array.isArray(sec.items) ? sec.items : (sec.text ? [sec.text] : []);
        linePrompts.forEach(function (lp) {
          var txt = typeof lp === 'string' ? lp.trim() : choiceText(lp).trim();
          if (txt) {
            body.push(pXml([rXml(txt, { sz: d.bodyHp })], { before: 40, after: 45 }));
          }
        });
        var numLines = Math.max(1, Math.min(24, Number(sec.writeLines != null ? sec.writeLines : 4) || 4));
        for (var li = 0; li < numLines; li++) {
          body.push(writingLineXml(d, { dashedTop: true, after: 55 }));
        }
      }
    });

    if (!renderedAny) {
      body.push(pXml([rXml('No handout sections are available yet.', { italic: true, sz: d.bodyHp })], { before: 120, after: 120 }));
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));

    // Optional Teacher Answer Key on a new page
    if (answerKeyOn) {
      var explicitKey = Array.isArray(m.answerKey) ? m.answerKey : (Array.isArray(o.answerKey) ? o.answerKey : null);
      var keySections = [];
      if (explicitKey && explicitKey.length) {
        if (typeof explicitKey[0] === 'string') {
          keySections.push({ heading: 'Answers', lines: explicitKey.map(String).filter(Boolean) });
        } else {
          explicitKey.forEach(function (ks) {
            if (ks && typeof ks === 'object' && Array.isArray(ks.lines) && ks.lines.length) {
              keySections.push({ heading: String(ks.heading || ks.title || 'Answers'), lines: ks.lines.map(choiceText).filter(Boolean) });
            }
          });
        }
      } else if (autoKeySections.length) {
        keySections = autoKeySections;
      }
      if (keySections.length) {
        body.push(answerKeyXml('Teacher Answer Key', keySections, d, contentW));
      }
    }

    var fallbackBase = slug(title, m.kind ? slug(m.kind, 'handout') : 'handout') + '-handout';
    var filename = ensureDocxFilename(o.filename, fallbackBase);
    return packageDocx(body.join('\n'), d, filename, o, imgReg);
  }

  // ---------------------------------------------------------------------------
  // 10b. Editable Word Cards (.docx) — 4 / 6 / 12-per-page Cut-Line Grids + Word List
  // ---------------------------------------------------------------------------
  function buildWordCardsDocx(model, opts) {
    var m = model && typeof model === 'object' ? model : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var d = Object.assign({}, DENSITY.standard, { margin: 720 });
    var contentW = PAGE_W - (d.margin * 2);
    var imgReg = createImageRegistry();

    var title = String(o.title || m.title || 'Word Cards').trim() || 'Word Cards';
    var rawSize = Number(o.size || m.size);
    var perPage = (rawSize === 4 || rawSize === 6 || rawSize === 12) ? rawSize : 6;
    var layoutCfg = perPage === 4
      ? { cols: 2, rows: 2, rowH: 6000, picMaxIn: 1.9, wordHp: 80 }
      : (perPage === 12
        ? { cols: 3, rows: 4, rowH: 3000, picMaxIn: 0.95, wordHp: 46 }
        : { cols: 2, rows: 3, rowH: 4000, picMaxIn: 1.4, wordHp: 64 });
    var showsRaw = String(o.shows || m.shows || 'both').trim().toLowerCase();
    var shows = (showsRaw === 'word' || showsRaw === 'picture') ? showsRaw : 'both';
    var linesOn = o.lines !== undefined ? !!o.lines : (m.lines !== undefined ? !!m.lines : true);
    var pagesRaw = String(o.pages || m.pages || 'both').trim().toLowerCase();
    var pagesMode = (pagesRaw === 'cards' || pagesRaw === 'list') ? pagesRaw : 'both';

    var rawCards = Array.isArray(m.cards) ? m.cards : (Array.isArray(m.words) ? m.words : []);
    var cards = rawCards.map(function (entry) {
      if (typeof entry === 'string') return { word: entry.trim(), displayWord: entry.trim(), pictureUri: '' };
      if (!entry || typeof entry !== 'object') return null;
      var w = String(entry.word || '').trim();
      var disp = String(entry.displayWord || w).trim();
      var uri = String(entry.pictureUri || entry.uri || entry.picture || '').trim();
      return w ? { word: w, displayWord: disp || w, pictureUri: uri } : null;
    }).filter(Boolean);

    var body = [];
    var borderSpec = linesOn
      ? 'w:val="dashed" w:sz="8" w:space="0" w:color="444444"'
      : 'w:val="single" w:sz="4" w:space="0" w:color="E5E5E5"';
    var colWidths = equalColWidths(contentW, layoutCfg.cols);

    function scaledWordHp(text, baseHp) {
      var len = String(text || '').length;
      if (len <= 7) return baseHp;
      if (len <= 11) return Math.max(28, Math.round(baseHp * 0.82));
      if (len <= 15) return Math.max(24, Math.round(baseHp * 0.68));
      return Math.max(22, Math.round(baseHp * 0.56));
    }

    if (!cards.length) {
      body.push(pXml([rXml(title, { bold: true, sz: d.titleHp })], { style: 'Title', before: 0, after: 100 }));
      body.push(pXml([rXml('No words are selected yet.', { italic: true, sz: d.bodyHp })], { before: 80, after: 80 }));
    } else {
      if (pagesMode !== 'list') {
        var totalPages = Math.ceil(cards.length / perPage);
        for (var pIdx = 0; pIdx < totalPages; pIdx++) {
          if (pIdx > 0) body.push(pageBreakXml());
          body.push(pXml([
            rXml(title + '  \u2014  ', { bold: true, sz: d.smallHp, color: '000000' }),
            rXml('Cards, page ' + (pIdx + 1) + ' of ' + totalPages + (linesOn ? ' (cut along dashed lines)' : ''), { sz: d.smallHp, color: '555555' })
          ], { before: 0, after: 80, keepNext: true }));

          var slice = cards.slice(pIdx * perPage, (pIdx + 1) * perPage);
          var tblRows = [];
          for (var r = 0; r < layoutCfg.rows; r++) {
            var cells = [];
            for (var c = 0; c < layoutCfg.cols; c++) {
              var card = slice[r * layoutCfg.cols + c];
              if (!card) {
                cells.push(cellXml(pXml('', { before: 0, after: 0 }), colWidths[c], { vAlign: 'center', padV: 90, padH: 90 }));
                continue;
              }
              var drawXml = (shows !== 'word' && card.pictureUri)
                ? imgReg.addImage(card.pictureUri, layoutCfg.picMaxIn, layoutCfg.picMaxIn * 0.9, card.word)
                : '';
              var showText = shows !== 'picture' || !drawXml;
              var cellParas = [];
              if (drawXml) {
                cellParas.push(pXml([drawingRunXml(drawXml)], { before: 20, after: showText ? 80 : 20, align: 'center' }));
              }
              if (showText) {
                cellParas.push(pXml([
                  rXml(card.displayWord, { bold: true, sz: scaledWordHp(card.displayWord, layoutCfg.wordHp), color: '000000' })
                ], { before: drawXml ? 20 : 0, after: 0, align: 'center' }));
              }
              cells.push(cellXml(cellParas, colWidths[c], { vAlign: 'center', padV: 110, padH: 100 }));
            }
            tblRows.push(rowXml(cells, { cantSplit: true, height: layoutCfg.rowH, hRule: 'exact' }));
          }
          body.push(tableXml(colWidths, tblRows, { borders: borderSpec, padV: 90, padH: 90 }));
        }
      }

      if (pagesMode !== 'cards') {
        if (pagesMode === 'both') body.push(pageBreakXml());
        body.push(pXml([rXml(title + ' \u2014 Word List', { bold: true, sz: d.titleHp, color: '000000' })], {
          style: 'Title',
          before: 0,
          after: 60,
          keepNext: true
        }));
        body.push(pXml([rXml(cards.length + (cards.length === 1 ? ' word' : ' words'), { italic: true, sz: d.smallHp, color: '444444' })], {
          before: 0,
          after: 120,
          borders: { bottom: 'w:val="single" w:sz="10" w:space="4" w:color="000000"' }
        }));
        var listCols = cards.length <= 12 ? 1 : (cards.length <= 26 ? 2 : 3);
        var perCol = Math.ceil(cards.length / listCols);
        var lw = equalColWidths(contentW, listCols);
        var listRows = [];
        for (var lr = 0; lr < perCol; lr++) {
          var lCells = [];
          for (var lc = 0; lc < listCols; lc++) {
            var idx = lc * perCol + lr;
            var entry = cards[idx];
            lCells.push(cellXml(
              entry
                ? pXml([
                    rXml((idx + 1) + '.  ', { bold: true, sz: d.bodyHp, color: '555555' }),
                    rXml(entry.displayWord, { bold: true, sz: d.wordHp - 2, color: '000000' })
                  ], { before: 40, after: 40 })
                : pXml('', { before: 0, after: 0 }),
              lw[lc],
              { padV: 50, padH: 80 }
            ));
          }
          listRows.push(rowXml(lCells, { cantSplit: true }));
        }
        body.push(tableXml(lw, listRows, { borders: 'none', padV: 40, padH: 60 }));
      }
    }

    body.push(creditsFooterXml(resolveCredits(m, o), d));
    var filename = ensureDocxFilename(o.filename, slug(title, 'word-cards') + '-word-cards');
    return packageDocx(body.join('\n'), d, filename, o, imgReg);
  }

  // ---------------------------------------------------------------------------
  // 11. Browser Download Helper
  // ---------------------------------------------------------------------------
  function downloadDocx(result, win, doc) {
    var w = win || (typeof window === 'object' && window !== null ? window : root);
    var d = doc || (w && w.document) || (typeof document === 'object' && document !== null ? document : null);
    if (!result || !w || !d || typeof w.Blob !== 'function' || !w.URL || typeof w.URL.createObjectURL !== 'function') {
      return false;
    }
    var blobParts = Array.isArray(result.parts) && result.parts.length
      ? result.parts
      : (result.bytes ? [result.bytes] : null);
    if (!blobParts) return false;
    var filename = ensureDocxFilename(result.filename, 'worksheet');
    var blob = new w.Blob(blobParts, { type: DOCX_MIME });
    var url = w.URL.createObjectURL(blob);
    var link = d.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    (d.body || d.documentElement).appendChild(link);
    link.click();
    if (link.parentNode) link.parentNode.removeChild(link);
    if (typeof w.setTimeout === 'function') {
      w.setTimeout(function () {
        try { w.URL.revokeObjectURL(url); } catch (_) {}
      }, 15000);
    }
    return true;
  }

  var api = {
    version: VERSION,
    MIME: DOCX_MIME,
    escapeXml: xmlEsc,
    prepareImagesAsync: prepareImagesAsync,
    buildWordSoundsDocx: buildWordSoundsDocx,
    buildVocabDocx: buildVocabDocx,
    buildReadAlongDocx: buildReadAlongDocx,
    buildScoringSheetDocx: buildScoringSheetDocx,
    buildMathWorksheetDocx: buildMathWorksheetDocx,
    buildMazeWorksheetDocx: buildMazeWorksheetDocx,
    buildChoiceWorksheetDocx: buildChoiceWorksheetDocx,
    buildProgressReportDocx: buildProgressReportDocx,
    buildAacBoardDocx: buildAacBoardDocx,
    buildGeneralHandoutDocx: buildGeneralHandoutDocx,
    buildWordCardsDocx: buildWordCardsDocx,
    downloadDocx: downloadDocx
  };

  if (root && (typeof root === 'object' || typeof root === 'function')) root.AlloPacketDocx = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})((typeof window === 'object' && window !== null) ? window
  : ((typeof globalThis === 'object' && globalThis !== null) ? globalThis
    : ((typeof self === 'object' && self !== null) ? self : null)));
