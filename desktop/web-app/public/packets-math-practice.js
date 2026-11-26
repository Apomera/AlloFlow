// The math fact practice maker (packets-math-practice.html): three steps, then one practice file.
// Everything happens in this tab. The page asks for nothing but the scripts it names: it fetches nothing,
// and its rule (connect-src 'none') makes the browser refuse if it tried. A practice file of math facts has
// no sound and no pictures, so there is nothing else to get. The page runs without AI, and there is no
// account and no cookie. What it keeps on the device is listed under "About this page".
// The sets of facts, the teaching order, the known facts a set starts with and the plan of a rehearsal file
// all come from packet_math_practice_builder.js; this page only shows them and passes the choices on.
// 2026-11-13: subtraction and division sets, a title, a student's code name in the file, one file for each student in
// a .zip (packets_zip.js) and "Open a file I made" (packets_reopen.js readMath), as on the other makers.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-math-practice/1';
  var PRESET_KEY = 'alloflow-math-presets/1';
  var MAX_PRESETS = 30;
  var TRY_PAGE = 'packets-try.html';
  var OWN = 'own';
  // 2026-11-13: subtraction and division sets beside addition and multiplication (packet_math_practice_builder.js).
  var OPS = ['add', 'sub', 'mul', 'div'];
  var KINDS = OPS.concat([OWN]);
  var MAX_STUDENTS = 40;   // "Make one for each student": files in one .zip, as on the other makers
  var METHOD_IDS = ['ccc', 'rehearsal'];
  var MAX_TYPED = 2000;
  var TIMES = String.fromCharCode(0xD7), MINUS = String.fromCharCode(0x2212), DIVIDE = String.fromCharCode(0xF7);

  // ---------------------------------------------------------------------------
  // Pure Monochrome Printable Math Fact Practice Worksheet Builder (Wave 6)
  // Exposed on window.AlloMathWorksheet = { buildMathWorksheetHtml }.
  // Strictly monochrome (#000000, #ffffff, #808080), zero-network CSP, script-src 'none'.
  // ---------------------------------------------------------------------------
  function escHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function normalizeOp(raw) {
    var s = String(raw || '').trim();
    if (s === 'add' || s === '+') return 'add';
    if (s === 'sub' || s === '-' || s === MINUS || s === '\u2013' || s === '\u2014') return 'sub';
    if (s === 'mul' || s === 'x' || s === 'X' || s === '*' || s === TIMES) return 'mul';
    if (s === 'div' || s === '/' || s === ':' || s === DIVIDE) return 'div';
    return '';
  }
  function opSymbol(op) {
    return op === 'add' ? '+' : op === 'sub' ? MINUS : op === 'mul' ? TIMES : op === 'div' ? DIVIDE : '';
  }
  function computeAnswer(a, b, op) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
    if (op === 'add') return String(a + b);
    if (op === 'sub') return String(a - b);
    if (op === 'mul') return String(a * b);
    if (op === 'div' && b !== 0 && a % b === 0) return String(a / b);
    return '';
  }
  function normalizeWorksheetFact(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      var trimmed = raw.trim();
      if (!trimmed) return null;
      var m = /^(\d+)\s*([-+xX*/:\u2212\u2013\u2014\u00D7\u00F7])\s*(\d+)$/.exec(trimmed);
      if (m) {
        var pa = Number(m[1]), pb = Number(m[3]), pop = normalizeOp(m[2]);
        return { a: pa, b: pb, op: pop, expr: pa + ' ' + opSymbol(pop) + ' ' + pb, hasEquals: false, answer: computeAnswer(pa, pb, pop) };
      }
      return { a: null, b: null, op: '', expr: trimmed, hasEquals: trimmed.indexOf('=') >= 0, answer: '' };
    }
    var src = raw.fact && typeof raw.fact === 'object' ? raw.fact : raw;
    var op = normalizeOp(src.op);
    var a = src.a != null && src.a !== '' && Number.isFinite(Number(src.a)) ? Number(src.a) : null;
    var b = src.b != null && src.b !== '' && Number.isFinite(Number(src.b)) ? Number(src.b) : null;
    var customWord = raw.word != null ? String(raw.word).trim() : (raw.prompt != null ? String(raw.prompt).trim() : '');
    if (customWord && (a === null || b === null || !op)) {
      var m2 = /^(\d+)\s*([-+xX*/:\u2212\u2013\u2014\u00D7\u00F7])\s*(\d+)$/.exec(customWord);
      if (m2) {
        a = Number(m2[1]);
        b = Number(m2[3]);
        op = normalizeOp(m2[2]);
      }
    }
    var expr = customWord || (a !== null && b !== null && op ? (a + ' ' + opSymbol(op) + ' ' + b) : '');
    if (!expr) return null;
    var ans = raw.answer != null && raw.answer !== '' ? String(raw.answer).trim() : (a !== null && b !== null && op ? computeAnswer(a, b, op) : '');
    return { a: a, b: b, op: op, expr: expr, hasEquals: expr.indexOf('=') >= 0, answer: ans };
  }
  function svgTenFrame(a, b) {
    var total = a + b;
    var frames = total > 10 ? 2 : 1;
    var cell = 18, pad = 4, gap = 10;
    var frameW = cell * 5;
    var w = pad * 2 + frames * frameW + (frames - 1) * gap;
    var h = pad * 2 + cell * 2;
    var out = ['<svg class="aid-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Ten-frame visual for ' + a + ' plus ' + b + '">'];
    var idx = 0;
    for (var f = 0; f < frames; f++) {
      var ox = pad + f * (frameW + gap);
      out.push('<rect x="' + ox + '" y="' + pad + '" width="' + frameW + '" height="' + (cell * 2) + '" fill="#ffffff" stroke="#000000" stroke-width="1.2"/>');
      for (var r = 0; r < 2; r++) {
        for (var c = 0; c < 5; c++) {
          var cx = ox + c * cell, cy = pad + r * cell;
          out.push('<rect x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '" fill="none" stroke="#808080" stroke-width="0.8"/>');
          if (idx < a) {
            out.push('<circle cx="' + (cx + cell / 2) + '" cy="' + (cy + cell / 2) + '" r="5.5" fill="#000000"/>');
          } else if (idx < total) {
            out.push('<circle cx="' + (cx + cell / 2) + '" cy="' + (cy + cell / 2) + '" r="5.2" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>');
          }
          idx++;
        }
      }
    }
    out.push('</svg>');
    return out.join('');
  }
  function svgNumberLine(a, b, isSub) {
    var maxVal = isSub ? Math.max(10, a <= 20 ? 20 : a) : Math.max(10, a + b <= 20 ? 20 : a + b);
    var w = 220, h = 44, x0 = 12, x1 = w - 12, yLine = 30;
    var cue = 'Start at ' + a + ', jump ' + (isSub ? MINUS : '+') + b;
    var out = ['<svg class="aid-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Number-line jump strip: ' + escHtml(cue) + '">'];
    out.push('<text x="' + (w / 2).toFixed(1) + '" y="10" text-anchor="middle" font-size="8.5" fill="#000000">' + escHtml(cue) + (isSub ? ' \u2190' : ' \u2192') + '</text>');
    out.push('<line x1="' + x0 + '" y1="' + yLine + '" x2="' + x1 + '" y2="' + yLine + '" stroke="#000000" stroke-width="1.4"/>');
    if (maxVal <= 20) {
      var step = (x1 - x0) / maxVal;
      for (var n = 0; n <= maxVal; n++) {
        var tx = (x0 + n * step).toFixed(1);
        var tall = n % 5 === 0 ? 5 : 3;
        out.push('<line x1="' + tx + '" y1="' + (yLine - tall) + '" x2="' + tx + '" y2="' + (yLine + tall) + '" stroke="#000000" stroke-width="' + (n % 5 === 0 ? '1.2' : '0.8') + '"/>');
        if (n % 5 === 0) out.push('<text x="' + tx + '" y="' + (h - 1) + '" text-anchor="middle" font-size="8" fill="#000000">' + n + '</text>');
      }
      var sx = x0 + Math.max(0, Math.min(maxVal, a)) * step;
      out.push('<circle cx="' + sx.toFixed(1) + '" cy="' + yLine + '" r="3.2" fill="#000000"/>');
      if (b > 0) {
        var dir = isSub ? -1 : 1;
        var ax1 = Math.max(x0 + 4, Math.min(x1 - 4, sx + dir * 18));
        out.push('<line x1="' + sx.toFixed(1) + '" y1="' + (yLine - 9) + '" x2="' + ax1.toFixed(1) + '" y2="' + (yLine - 9) + '" stroke="#808080" stroke-width="1.2"/>');
        out.push('<path d="M ' + (ax1 - dir * 3.5).toFixed(1) + ' ' + (yLine - 12) + ' L ' + ax1.toFixed(1) + ' ' + (yLine - 9) + ' L ' + (ax1 - dir * 3.5).toFixed(1) + ' ' + (yLine - 6) + '" fill="none" stroke="#808080" stroke-width="1.2"/>');
      }
    } else {
      var pStart = isSub ? x1 - 24 : x0 + 24;
      out.push('<circle cx="' + pStart + '" cy="' + yLine + '" r="3.2" fill="#000000"/>');
      out.push('<text x="' + pStart + '" y="' + (h - 1) + '" text-anchor="middle" font-size="8" fill="#000000">' + a + '</text>');
      if (b > 0) {
        var oDir = isSub ? -1 : 1;
        var oEnd = pStart + oDir * 30;
        out.push('<line x1="' + pStart + '" y1="' + (yLine - 9) + '" x2="' + oEnd + '" y2="' + (yLine - 9) + '" stroke="#808080" stroke-width="1.2"/>');
        out.push('<path d="M ' + (oEnd - oDir * 3.5) + ' ' + (yLine - 12) + ' L ' + oEnd + ' ' + (yLine - 9) + ' L ' + (oEnd - oDir * 3.5) + ' ' + (yLine - 6) + '" fill="none" stroke="#808080" stroke-width="1.2"/>');
      }
    }
    out.push('</svg>');
    return out.join('');
  }
  function svgArrayGrid(rows, cols) {
    var rCount = Math.min(rows, 10), cCount = Math.min(cols, 10);
    var step = 11, pad = 10;
    var w = pad * 2 + cCount * step;
    var h = pad * 2 + rCount * step;
    var out = ['<svg class="aid-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Array dot grid of ' + rows + ' rows by ' + cols + ' columns">'];
    out.push('<rect x="' + (pad - 3) + '" y="' + (pad - 3) + '" width="' + (cCount * step + 6) + '" height="' + (rCount * step + 6) + '" fill="#ffffff" stroke="#808080" stroke-width="1" stroke-dasharray="2 2"/>');
    for (var r = 0; r < rCount; r++) {
      for (var c = 0; c < cCount; c++) {
        out.push('<circle cx="' + (pad + c * step + step / 2) + '" cy="' + (pad + r * step + step / 2) + '" r="3.2" fill="#000000"/>');
      }
    }
    out.push('</svg>');
    return out.join('');
  }
  function svgEqualGroups(total, groups) {
    var gShow = Math.max(1, Math.min(groups, 10));
    var boxW = 20, boxH = 22, gap = 4, pad = 4;
    var rowW = gShow * boxW + Math.max(0, gShow - 1) * gap;
    var w = Math.max(150, pad * 2 + rowW);
    var startX = (w - rowW) / 2;
    var h = pad * 2 + boxH + 12;
    var label = 'Share ' + total + ' into ' + groups + ' equal groups';
    var out = ['<svg class="aid-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Equal groups workspace: ' + escHtml(label) + '">'];
    out.push('<text x="' + (w / 2).toFixed(1) + '" y="10" text-anchor="middle" font-size="8" fill="#000000">' + escHtml(label) + '</text>');
    for (var g = 0; g < gShow; g++) {
      var bx = startX + g * (boxW + gap);
      out.push('<rect x="' + bx.toFixed(1) + '" y="14" width="' + boxW + '" height="' + boxH + '" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1"/>');
    }
    out.push('</svg>');
    return out.join('');
  }
  function svgPartWhole(label) {
    var w = 150, h = 38;
    return '<svg class="aid-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Strategy workspace">' +
      '<rect x="2" y="2" width="146" height="16" fill="#ffffff" stroke="#000000" stroke-width="1.2"/>' +
      '<rect x="2" y="20" width="72" height="16" fill="#ffffff" stroke="#808080" stroke-width="1"/>' +
      '<rect x="76" y="20" width="72" height="16" fill="#ffffff" stroke="#808080" stroke-width="1"/>' +
      '<text x="75" y="13" text-anchor="middle" font-size="8" fill="#000000">' + escHtml(label) + '</text>' +
      '</svg>';
  }
  function strategyAidFor(item) {
    if (item.hasEquals || item.a === null || item.b === null || !item.op) {
      return svgPartWhole('Show your thinking');
    }
    if (item.op === 'add') {
      if (item.a >= 0 && item.b >= 0 && item.a <= 10 && item.b <= 10 && item.a + item.b <= 20) {
        return svgTenFrame(item.a, item.b);
      }
      return svgNumberLine(item.a, item.b, false);
    }
    if (item.op === 'sub') {
      return svgNumberLine(item.a, item.b, true);
    }
    if (item.op === 'mul') {
      if (item.a >= 1 && item.a <= 10 && item.b >= 1 && item.b <= 10) {
        return svgArrayGrid(item.a, item.b);
      }
      return svgPartWhole(item.a + ' groups of ' + item.b);
    }
    if (item.op === 'div') {
      if (item.b >= 1 && item.b <= 10 && item.a >= 0 && item.a <= 100 && item.a % item.b === 0) {
        return svgEqualGroups(item.a, item.b);
      }
      return svgPartWhole(item.a + ' split by ' + item.b);
    }
    return svgPartWhole('Show your thinking');
  }
  function buildMathWorksheetHtml(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var title = String(opts.title || 'Math Fact Practice').trim() || 'Math Fact Practice';
    var scaffolded = !!opts.scaffolded;
    var includeAnswerKey = opts.includeAnswerKey !== false;
    var directions = opts.directions != null ? String(opts.directions).trim()
      : (scaffolded ? 'Use the visual model and workspace to solve each fact.' : 'Write the answer for each math fact.');
    var rawFacts = Array.isArray(opts.facts) ? opts.facts : [];
    var items = [];
    for (var i = 0; i < rawFacts.length; i++) {
      var norm = normalizeWorksheetFact(rawFacts[i]);
      if (norm) items.push(norm);
    }
    var cols = opts.columns === 2 || opts.columns === 3 ? opts.columns : (items.length >= 15 ? 3 : 2);
    var css = [
      '@page { margin: 12mm; }',
      '* { box-sizing: border-box; }',
      'body { margin: 0; padding: 12mm; font-family: Arial, Helvetica, sans-serif; color: #000000; background: #ffffff; line-height: 1.4; }',
      'header.ws-head { border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 12px; }',
      '.ws-meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; font-size: 13px; }',
      '.ws-field { flex: 1; display: flex; align-items: flex-end; gap: 6px; }',
      '.ws-field-date { max-width: 180px; }',
      '.ws-line { flex: 1; border-bottom: 1px solid #000000; height: 14px; }',
      'h1.ws-title { margin: 0 0 4px; font-size: 20px; color: #000000; }',
      'p.ws-directions { margin: 0; font-size: 13px; color: #000000; }',
      '.ws-grid { display: grid; grid-template-columns: repeat(' + cols + ', 1fr); gap: 12px 18px; margin-top: 14px; }',
      '.ws-item { display: flex; align-items: baseline; gap: 6px; padding: 8px 6px; border-bottom: 1px solid #808080; font-size: 16px; break-inside: avoid; }',
      '.ws-num { font-weight: 700; min-width: 24px; color: #000000; }',
      '.ws-expr { font-weight: 600; color: #000000; }',
      '.ws-blank { display: inline-block; min-width: 44px; border-bottom: 1.5px solid #000000; margin-left: 4px; }',
      '.ws-scaffold-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }',
      '.ws-card { border: 1.5px solid #000000; padding: 10px; background: #ffffff; break-inside: avoid; }',
      '.ws-card-top { display: flex; align-items: baseline; gap: 6px; font-size: 17px; font-weight: 700; margin-bottom: 8px; }',
      '.ws-aid { margin: 6px 0 8px; }',
      '.aid-svg { display: block; max-width: 100%; height: auto; }',
      '.ws-work { min-height: 36px; border: 1px dashed #808080; padding: 4px 6px; font-size: 11px; color: #808080; }',
      'section.answer-key { break-before: page; page-break-before: always; padding-top: 4px; }',
      '.ak-head { border-bottom: 2px solid #000000; padding-bottom: 6px; margin-bottom: 12px; }',
      '.ak-head h2 { margin: 0 0 4px; font-size: 18px; color: #000000; }',
      '.ak-note { margin: 0; font-size: 12px; color: #808080; }',
      '.ak-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 14px; list-style: none; margin: 0; padding: 0; }',
      '.ak-grid li { padding: 4px 0; border-bottom: 1px solid #808080; font-size: 14px; }',
      '.ak-n { font-weight: 700; margin-right: 6px; }',
      '.ak-a { font-weight: 700; }',
      '@media print { body { padding: 0; } }'
    ].join('\n');

    var body = [];
    body.push('<main class="ws-sheet" data-mode="' + (scaffolded ? 'scaffolded' : 'independent') + '">');
    body.push('<header class="ws-head">');
    body.push('<div class="ws-meta"><div class="ws-field"><span>Name:</span><span class="ws-line"></span></div><div class="ws-field ws-field-date"><span>Date:</span><span class="ws-line"></span></div></div>');
    body.push('<h1 class="ws-title">' + escHtml(title) + '</h1>');
    if (directions) body.push('<p class="ws-directions">' + escHtml(directions) + '</p>');
    body.push('</header>');

    if (scaffolded) {
      body.push('<div class="ws-scaffold-list">');
      for (var s = 0; s < items.length; s++) {
        var it = items[s];
        var promptHtml = it.hasEquals ? escHtml(it.expr) : (escHtml(it.expr) + ' = <span class="ws-blank" aria-label="blank"></span>');
        body.push('<article class="ws-card">');
        body.push('<div class="ws-card-top"><span class="ws-num">' + (s + 1) + '.</span><span class="ws-expr">' + promptHtml + '</span></div>');
        body.push('<div class="ws-aid">' + strategyAidFor(it) + '</div>');
        body.push('<div class="ws-work">Workspace</div>');
        body.push('</article>');
      }
      body.push('</div>');
    } else {
      body.push('<div class="ws-grid">');
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        var lineHtml = item.hasEquals ? escHtml(item.expr) : (escHtml(item.expr) + ' = <span class="ws-blank" aria-label="blank"></span>');
        body.push('<div class="ws-item"><span class="ws-num">' + (k + 1) + '.</span><span class="ws-expr">' + lineHtml + '</span></div>');
      }
      body.push('</div>');
    }
    body.push('</main>');

    if (includeAnswerKey) {
      body.push('<section class="answer-key" aria-label="Teacher Answer Key">');
      body.push('<div class="ak-head"><h2>' + escHtml(title) + ' &mdash; Teacher Answer Key</h2><p class="ak-note">Teacher copy. Keep separate from student sheets.</p></div>');
      body.push('<ol class="ak-grid">');
      for (var j = 0; j < items.length; j++) {
        var ak = items[j];
        var akText = ak.hasEquals
          ? (escHtml(ak.expr) + (ak.answer !== '' ? ' <span class="ak-a">(Answer: ' + escHtml(ak.answer) + ')</span>' : ''))
          : (escHtml(ak.expr) + ' = <span class="ak-a">' + escHtml(ak.answer) + '</span>');
        body.push('<li><span class="ak-n">' + (j + 1) + '.</span>' + akText + '</li>');
      }
      body.push('</ol>');
      body.push('</section>');
    }

    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; script-src \'none\'">\n' +
      '<title>' + escHtml(title) + '</title>\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body.join('\n') + '\n</body>\n</html>\n';
  }
  window.AlloMathWorksheet = { buildMathWorksheetHtml: buildMathWorksheetHtml };

  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  var setText = function (id, text) { var node = $(id); if (node) node.textContent = text; };
  var show = function (id, on) { var node = $(id); if (node) node.hidden = !on; };
  var has = function (object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  var listed = function (names) { return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(''); };
  var capital = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };
  var fileSize = function (bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1000)) + ' KB'; };
  var productName = function () { var node = $('product-name'); return node ? String(node.textContent || '').trim() : ''; };
  var said = function (error) { return String((error && error.message) || error || ''); };

  var loader, builder;
  var state = null;
  var step = 1;
  var ownRows = [], ownStop = '', ownTimer = 0;
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '', batchFile = null, paperOn = false;
  var previewOmit = Object.create(null);
  var previewSession = null, inPreviewAction = false;
  function stopPreview() { if (previewSession) { try { previewSession.stop(); } catch (_) {} previewSession = null; } }
  function resetPreview(stopSession) {
    previewOmit = Object.create(null);
    if (stopSession) stopPreview();
  }

  // title (2026-11-13): the file's title, empty for the builder's own. learner: a student's code name for the file. It is
  // not kept: the next file is often for someone else.
  function defaults() { return { kind: '', sets: { add: '', sub: '', mul: '', div: '' }, facts: '', method: '', recallFirst: false, known: Object.create(null), title: '', learner: '' }; }
  function setsOf(kind) { return builder.FAMILIES.filter(function (set) { return set.op === kind; }); }
  function setRow(id) {
    for (var i = 0; i < builder.FAMILIES.length; i++) if (builder.FAMILIES[i].id === id) return builder.FAMILIES[i];
    return null;
  }
  function word(fact) { return builder.factWord(fact, loader).word; }

  // ---------------------------------------------------------------------------
  // What this page keeps: the last choices, in this browser only
  // ---------------------------------------------------------------------------
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, kind: state.kind, sets: state.sets, facts: state.facts, method: state.method, recallFirst: !!state.recallFirst, known: state.known, title: state.title }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null', function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
    } catch (_) { saved = null; }
    if (!saved || saved.v !== 1) return fresh;
    if (KINDS.indexOf(saved.kind) >= 0) fresh.kind = saved.kind;
    OPS.forEach(function (kind) {
      var id = saved.sets && typeof saved.sets === 'object' && has(saved.sets, kind) ? saved.sets[kind] : '';
      var row = typeof id === 'string' ? setRow(id) : null;
      if (row && row.op === kind) fresh.sets[kind] = id;
    });
    if (typeof saved.facts === 'string') fresh.facts = saved.facts.slice(0, MAX_TYPED);
    if (typeof saved.title === 'string') fresh.title = saved.title.slice(0, 80);
    if (METHOD_IDS.indexOf(saved.method) >= 0) fresh.method = saved.method;
    fresh.recallFirst = !!saved.recallFirst;
    if (saved.known && typeof saved.known === 'object' && !Array.isArray(saved.known)) {
      Object.keys(saved.known).forEach(function (source) {
        var keys = saved.known[source];
        if ((source === OWN || setRow(source)) && Array.isArray(keys)) fresh.known[source] = keys.filter(function (k) { return typeof k === 'string' && /^(add|sub|mul|div):\d{1,3}:\d{1,3}$/.test(k); }).slice(0, 60);
      });
    }
    return fresh;
  }

  // ---------------------------------------------------------------------------
  // Step 1: what to practice
  // ---------------------------------------------------------------------------
  function syncRadios(name, value) {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="' + name + '"]'), function (radio) {
      radio.checked = radio.value === value;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
  }
  function setNow() {
    if (OPS.indexOf(state.kind) < 0) return null;
    var row = setRow(state.sets[state.kind]);
    return row && row.op === state.kind ? row : null;
  }
  // The facts chosen in step 1, and where they come from: { source, facts, set } or null.
  function chosen() {
    if (state.kind === OWN) {
      var good = ownRows.filter(function (row) { return row.ok; });
      return !ownStop && good.length ? { source: OWN, facts: good.map(function (row) { return row.fact; }), set: null } : null;
    }
    var set = setNow();
    return set ? { source: set.id, facts: set.facts, set: set } : null;
  }
  function drawSets() {
    var host = $('sets');
    host.textContent = '';
    setsOf(state.kind).forEach(function (set) {
      var label = el('label', 'radio'), radio = el('input');
      radio.type = 'radio';
      radio.name = 'set';
      radio.value = set.id;
      radio.checked = state.sets[state.kind] === set.id;
      radio.setAttribute('aria-describedby', 'order-hint');
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        state.sets[state.kind] = set.id;
        resetPreview(false);
        remember();
        syncRadios('set', set.id);
        drawSetResult();
      });
      var words = el('span', '');
      words.appendChild(doc.createTextNode(set.name + ' '));
      words.appendChild(el('span', 'radio-sub',set.line + ' ' + capital(count(set.facts.length, 'fact')) + '.'));
      label.appendChild(radio);
      label.appendChild(words);
      label.classList.toggle('is-on', radio.checked);
      host.appendChild(label);
    });
  }
  function drawSetResult() {
    var set = setNow();
    show('set-result', !!set);
    if (!set) return;
    setText('set-line', set.opName + ': ' + set.name + '. ' + capital(count(set.facts.length, 'fact')) + '.');
    setText('set-facts', set.facts.map(word).join(', ') + '.');
    setText('step-1-problem', '');
  }
  // One typed fact, looked at by the builder, with its reason in plain words.
  function typedParts() { return String(state.facts || '').replace(/^\uFEFF/, '').split(/[,;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean); }
  function reason(error) { return capital(said(error).replace(/^Fact [^:]*: /, '').replace(/^".*" is not a fact\./, 'This is not a fact.')); }
  function checkPart(part, seen) {
    var parsed;
    // A number with a decimal point ("2.5 + 1") is a fact, with a number this practice does not take.
    if (/\d\.\d|(?:^|[^\d])\.\d/.test(part)) return { text: part, ok: false, says: 'Whole numbers only.' };
    try { parsed = builder.parseFacts(part); } catch (error) { return { text: part, ok: false, says: reason(error) }; }
    if (parsed.length !== 1) return { text: part, ok: false, says: 'This is not a fact.' };
    var f = parsed[0], key = builder.factKey(f), written;
    try { written = builder.factWord(f, loader); } catch (error) { return { text: part, ok: false, says: reason(error) }; }
    if (seen[key]) return { text: written.word, ok: false, says: 'Already in the list.' };
    seen[key] = true;
    // A fact and its turnaround (3 + 4, 4 + 3) are both kept: the file never puts them side by side. 2026-11-13.
    var t = builder.turnaround(f), turned = t && builder.factKey(t) !== key && seen[builder.factKey(t)];
    return { text: written.word, ok: true, fact: f, says: 'Ready. The answer is ' + written.answer + '.' + (turned ? ' ' + word(t) + ' is in the list too, turned around: the file keeps the two apart.' : '') };
  }
  function drawOwn() {
    clearTimeout(ownTimer);
    var parts = typedParts(), list = $('own-list'), seen = {};
    ownRows = parts.map(function (part) { return checkPart(part, seen); });
    list.textContent = '';
    ownRows.forEach(function (row) {
      var item = el('li', row.ok ? 'is-ok' : 'is-out');
      item.appendChild(el('span', 'w', row.text));
      item.appendChild(el('span', 's', row.says));
      list.appendChild(item);
    });
    var good = ownRows.filter(function (row) { return row.ok; }).length, bad = ownRows.length - good;
    var line = good + ' of ' + count(ownRows.length, 'fact') + ' can be used.';
    ownStop = '';
    if (!parts.length) { line = 'Type or paste your facts above.'; ownStop = 'Type at least one fact to go on.'; }
    else if (bad) ownStop = count(bad, 'fact') + ' cannot be used. Change ' + (bad === 1 ? 'it' : 'them') + ' or take ' + (bad === 1 ? 'it' : 'them') + ' out to go on.';
    else if (good > builder.MAX_FACTS) ownStop = 'A file can hold ' + builder.MAX_FACTS + ' facts at most. Take ' + (good - builder.MAX_FACTS) + ' out to go on.';
    setText('own-line', line);
    show('own-example-row', !parts.length);
    if (!ownStop) setText('step-1-problem', '');
  }
  function drawStep1() {
    syncRadios('kind', state.kind);
    var sets = OPS.indexOf(state.kind) >= 0;
    show('panel-sets', sets);
    show('panel-own', state.kind === OWN);
    if (sets) { drawSets(); drawSetResult(); } else show('set-result', false);
    if (state.kind === OWN) {
      if ($('f-facts').value !== state.facts) $('f-facts').value = state.facts;
      drawOwn();
    }
  }
  function stopAtStep1() {
    if (!state.kind) return 'Choose the kind of facts to go on.';
    if (state.kind === OWN) { drawOwn(); return ownStop; }
    return setNow() ? '' : 'Choose a set of facts to go on.';
  }

  // ---------------------------------------------------------------------------
  // Step 2: how to practice, and for rehearsal the facts the learner knows
  // ---------------------------------------------------------------------------
  // The facts marked as known: the teacher's own marks for this set, or the builder's start (the teaching order).
  function knownNow(pick) {
    if (has(state.known, pick.source)) return state.known[pick.source].slice();
    return pick.set ? builder.knownByOrder(pick.set.id) : [];
  }
  function planNow(pick, mode) {
    var input = { mode: mode, recallFirst: !!state.recallFirst, known: knownNow(pick) };
    if (pick.set) input.factSet = pick.set.id; else input.facts = pick.facts;
    return builder.planMathPractice(input);
  }
  function drawKnown() {
    var pick = chosen();
    var on = state.method === 'rehearsal' && !!pick;
    show('panel-known', on);
    if (!on) return;
    var marked = {};
    knownNow(pick).forEach(function (key) { marked[key] = true; });
    var none = pick.set && builder.knownByOrder(pick.set.id).length === 0, first = none && pick.set.id === setsOf(pick.set.op)[0].id;
    // 2026-11-13: for subtraction and division the other fact of the same family counts as the turnaround does.
    var other = !pick.set ? '' : pick.set.op === 'sub' ? 'the other take-away of the same fact (7 ' + MINUS + ' 3 for 7 ' + MINUS + ' 4)' : pick.set.op === 'div' ? 'the other division of the same fact (14 ' + DIVIDE + ' 7 for 14 ' + DIVIDE + ' 2)' : 'its turnaround';
    setText('known-hint', !pick.set ? 'Choose the facts the student already knows. The others are new facts to learn.'
      : first ? pick.set.name + ' comes first in the order, so none are chosen yet. Choose the facts the student already knows.'
        : none ? 'No fact of ' + pick.set.name + ' is in a set that comes earlier, so none are chosen yet. Choose the facts the student already knows.'
          : 'Chosen from the teaching order: a fact is chosen when it, or ' + other + ', is in a set that comes earlier. Change the choices to fit the student.');
    var host = $('known');
    host.textContent = '';
    pick.facts.forEach(function (fact) {
      var key = builder.factKey(fact);
      var label = el('label', 'radio'), box = el('input');
      box.type = 'checkbox';
      box.value = key;
      box.checked = !!marked[key];
      box.setAttribute('data-known', key);
      box.addEventListener('change', function () {
        var keys = [];
        Array.prototype.forEach.call(host.querySelectorAll('input[type="checkbox"]'), function (other) { if (other.checked) keys.push(other.value); });
        state.known[pick.source] = keys;
        resetPreview(false);
        remember();
        label.classList.toggle('is-on', box.checked);
        drawPlanLine();
      });
      label.appendChild(box);
      label.appendChild(doc.createTextNode(' ' + word(fact)));
      label.classList.toggle('is-on', box.checked);
      host.appendChild(label);
    });
    drawPlanLine();
  }
  // What the rehearsal file will hold, said as the ticks change. '' when it can be made, else the reason.
  var planStop = '';
  function drawPlanLine() {
    var pick = chosen(), plan;
    planStop = '';
    try { plan = planNow(pick, 'rehearsal'); } catch (error) {
      planStop = said(error);
      setText('known-line', planStop);
      setText('known-sub', '');
      return;
    }
    setText('known-line', 'New ' + (plan.newFacts.length === 1 ? 'fact' : 'facts') + ' in this file: ' + listed(plan.newFacts.map(word)) + '.');
    var sub = [capital(count(plan.cards.length, 'card')) + '. ' + plan.cards.filter(function (c) { return c.role === 'known'; }).length + ' are facts the student knows.'];
    // 2026-11-13: a known fact and its turnaround take turns as one; a known fact that is a new fact turned around is not used.
    var pairs = plan.pairs || [], held = plan.held || [];
    if (pairs.length) sub.push(capital(listed(pairs.map(function (p) { return word(p[0]) + ' and ' + word(p[1]); })))
      + (pairs.length === 1 ? ' are the same fact turned around, so they take turns as one known fact and are never side by side.' : ': each pair is one fact turned around, so its two take turns as one known fact and are never side by side.'));
    held.forEach(function (h) { sub.push(word(h.fact) + ' is not used as a known fact here: it is ' + word(h.gives) + ' turned around, a new fact in this file, so it would give it away.'); });
    if (plan.addedKnown.length) {
      var ticked = plan.chosenKnown != null ? plan.chosenKnown : plan.knownFacts.length - plan.addedKnown.length;
      var fewer = pairs.length || held.length ? (ticked === 1 ? ' different fact can be used' : ' different facts can be used') : (ticked === 1 ? ' fact is chosen' : ' facts are chosen');
      sub.push((ticked ? 'Only ' + ticked + fewer : 'No facts are chosen') + ', so ' + listed(plan.addedKnown.map(word)) + ' from ' + listed(plan.addedFrom)
        + (plan.addedFrom.length === 1 ? ', the set before,' : ', the sets before,') + (plan.addedKnown.length === 1 ? ' is used as a known fact too.' : ' are used as known facts too.'));
    }
    if (plan.waiting.length) sub.push(capital(count(plan.waiting.length, 'more new fact waits', 'more new facts wait')) + ' for another file: ' + listed(plan.waiting.map(word)) + '.');
    setText('known-sub', sub.join(' '));
    setText('step-2-problem', '');
  }
  function drawStep2() {
    syncRadios('method', state.method);
    syncRadios('recall', state.recallFirst ? 'memory' : 'study');
    drawKnown();
  }
  function stopAtStep2() {
    if (!state.method) return 'Choose a way to practice to go on.';
    if (state.method === 'rehearsal') { drawPlanLine(); if (planStop) return planStop; }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Step 3: make the file
  // ---------------------------------------------------------------------------
  function codeNameNow() { return builder.codeName(state.learner); }
  // A student's code name comes last in the file's name (math-facts-mul-7-ccc__BlueHeron7.html).
  function withName(name, learner) {
    var code = String(learner || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return code ? name.replace(/\.html$/, '__' + code + '.html') : name;
  }
  // The title the builder gives these choices ("× 7 facts: cover, copy, compare"), shown when the field is empty (2026-11-13).
  function titleFallback() {
    var pick = chosen(), method = builder.METHODS[state.method];
    if (!pick || !method) return '';
    var suffix = state.recallFirst ? (state.method === 'rehearsal' ? 'recall with known facts' : 'recall from memory') : method.short;
    return (pick.set ? pick.set.title : 'My math facts') + ': ' + suffix;
  }
  function drawTitle() {
    var field = $('f-title');
    if (field && field.value !== state.title) field.value = state.title;
    setText('title-hint', 'The student sees it at the top of the file. The results file\'s name starts with it. Left empty, it is "' + titleFallback() + '".');
  }
  function syncCodeName() {
    var field = $('f-batch-names');
    if (field && state.learner && !field.value.trim()) {
      field.value = state.learner;
      if ($('batch')) $('batch').open = true;
    }
  }
  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    clearPaper();
    show('summary', false);
    show('try', false);
    show('download-worksheet', false);
    show('download-docx', false);
    show('download-bundle', false);
    show('math-ws-options', false);
    show('save', false);
    show('after-save', false);
    show('build-problem', false);
  }
  function making(text) { show('making', true); setText('making-line', text); }
  function problem(text) {
    show('making', false);
    setText('build-problem-text', text);
    show('build-problem', true);
    setText('making-said', text);
  }
  function makeSoon(delay) {
    clearTimeout(buildTimer);
    clearBuilt();
    making('Putting the file together.');
    buildTimer = setTimeout(make, delay);
  }
  function planSpec(pick, mode) {
    var omitKeys = Object.keys(previewOmit);
    var recallFirst = !!state.recallFirst;
    if (!omitKeys.length) {
      var plain = { mode: mode, recallFirst: recallFirst, known: knownNow(pick) };
      if (pick.set) plain.factSet = pick.set.id; else plain.facts = pick.facts;
      return { input: plain, edited: false, facts: pick.facts };
    }
    var sourceFacts = pick.facts;
    if (pick.set && mode === 'ccc') {
      try {
        var basePlan = builder.planMathPractice({ mode: mode, recallFirst: recallFirst, factSet: pick.set.id });
        if (basePlan && Array.isArray(basePlan.cards) && basePlan.cards.length) {
          sourceFacts = basePlan.cards.map(function (c) { return c.fact; });
        }
      } catch (_) {}
    }
    var keptFacts = sourceFacts.filter(function (f) { return !previewOmit[builder.factKey(f)]; });
    var keptMap = Object.create(null);
    keptFacts.forEach(function (f) { keptMap[builder.factKey(f)] = true; });
    var knownKeys = knownNow(pick).filter(function (k) { return !!keptMap[k]; });
    if (mode === 'rehearsal' && pick.set && knownKeys.length < 3) {
      try {
        var base = planNow(pick, mode);
        (base.addedKnown || []).forEach(function (f) {
          var key = builder.factKey(f);
          if (previewOmit[key] || keptMap[key]) return;
          keptMap[key] = true;
          keptFacts.push(f);
          knownKeys.push(key);
        });
      } catch (_) {}
    }
    return { input: { mode: mode, recallFirst: recallFirst, facts: keptFacts, known: knownKeys }, edited: true, facts: keptFacts };
  }
  function make() {
    clearTimeout(buildTimer);
    clearBuilt();
    var run = buildRun, pick, spec, plan, lesson, result;
    try {
      pick = chosen();
      if (!pick) throw new Error('no facts are chosen');
      spec = planSpec(pick, state.method);
      plan = builder.planMathPractice(spec.input);
      var input = Object.assign({ loader: loader }, spec.input);
      if (spec.edited && !state.title && pick.set) input.title = titleFallback();
      lesson = builder.lessonFromMathPractice(input);
      result = builder.buildMathPracticePacket({ lesson: lesson, loader: loader, title: state.title });
    } catch (error) {
      var msg = 'The file could not be put together (' + (said(error) || 'no reason was given') + '). Your choices are still here.';
      if (run === buildRun) problem(msg);
      return Promise.resolve({ html: null, said: said(error) || msg });
    }
    if (run === buildRun) drawResult(result, pick, plan, lesson, spec.edited);
    return Promise.resolve(built && built.html ? { html: built.html, url: fileUrl } : { html: null, said: 'Could not update the file.' });
  }
  function describePreview(lesson) {
    var out = [], blocks = lesson && Array.isArray(lesson.blocks) ? lesson.blocks : [];
    blocks.forEach(function (block) {
      (Array.isArray(block.items) ? block.items : []).forEach(function (item) {
        out.push({
          itemId: String(item.id || ''),
          activity: String(block.activity || ''),
          word: String(item.word || ''),
          sample: false,
          label: String(item.word || item.id || ''),
          canSwap: false,
          canTogglePicture: false,
          noPicture: false,
        });
      });
    });
    return out;
  }
  function drawPreviewNote(edited) {
    var box = $('summary'), note = $('preview-note');
    var omitCount = edited ? Object.keys(previewOmit).length : 0;
    if (!omitCount) {
      if (note && note.parentNode) note.parentNode.removeChild(note);
      return;
    }
    if (!box) return;
    if (!note) {
      note = el('p', 'result-sub');
      note.id = 'preview-note';
      box.appendChild(note);
    }
    note.textContent = count(omitCount, 'fact') + ' removed in Preview. ';
    var restoreBtn = el('button', 'btn btn-text btn-small', 'Restore');
    restoreBtn.type = 'button';
    restoreBtn.id = 'preview-restore';
    restoreBtn.addEventListener('click', function () {
      resetPreview(false);
      makeSoon(0);
    });
    note.appendChild(restoreBtn);
  }
  function onPreviewAction(req) {
    if (!req || req.action !== 'remove') return { said: 'Nothing changed.' };
    var pick, spec, plan;
    try {
      pick = chosen();
      if (!pick) return { said: 'No facts are chosen.' };
      spec = planSpec(pick, state.method);
      plan = builder.planMathPractice(spec.input);
    } catch (err) {
      return { said: said(err) || 'Could not read the current facts.' };
    }
    var card = plan.cards[req.index];
    if (!card || !card.fact) return { said: 'Could not find that fact.' };
    var dropKey = builder.factKey(card.fact);
    var keptFacts = spec.facts.filter(function (f) { return builder.factKey(f) !== dropKey; });
    if (!keptFacts.length) return { said: 'A file needs at least one fact.' };
    previewOmit[dropKey] = true;
    inPreviewAction = true;
    return make().then(function (res) {
      inPreviewAction = false;
      if (!res || !res.html) {
        delete previewOmit[dropKey];
        return make().then(function () { return { said: (res && res.said) || 'Could not remove that fact.' }; });
      }
      return { html: res.html, url: res.url, said: 'Removed fact.' };
    }, function (err) {
      inPreviewAction = false;
      delete previewOmit[dropKey];
      return { said: said(err) || 'Could not remove that fact.' };
    });
  }
  function drawSummaryRows() {
    if (!built || !built.summaryBase) return;
    var rows = built.summaryBase.slice();
    if (built.codeName) rows.push(['Code name', built.codeName + '. The file opens with it filled in.']);
    rows.push(['File', built.name + ', ' + fileSize(built.bytes) + '.']);
    var host = $('summary-rows');
    host.textContent = '';
    rows.forEach(function (row) {
      host.appendChild(el('dt', '', row[0]));
      host.appendChild(el('dd', '', row[1]));
    });
  }
  function applySingleCodeName() {
    if (!built || !built.baseHtml) return;
    var single = activeSingleCode();
    state.learner = single;
    var html = single ? builder.withCodeName(built.baseHtml, single) : built.baseHtml;
    var blob = new Blob([html], { type: 'text/html' });
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    built.html = html;
    built.codeName = single;
    built.name = withName(built.plain, single);
    built.bytes = blob.size;
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    drawSummaryRows();
    setText('summary-facts', capital(count(built.cards, 'card')) + '. No clock. ' + fileSize(built.bytes) + '.');
    if (fileUrl) {
      $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl);
      show('try', true);
      var handoff = window.AlloPacketHandoff;
      if (!inPreviewAction && handoff && typeof handoff.hostPreview === 'function') {
        if (previewSession) previewSession.update({ url: fileUrl, html: built.html });
        else previewSession = handoff.hostPreview({ url: fileUrl, html: built.html, describe: describePreview, onAction: onPreviewAction });
      }
    }
  }
  function drawResult(result, pick, plan, lesson, edited) {
    show('making', false);
    var cards = plan.cards.length, knownCards = plan.cards.filter(function (c) { return c.role === 'known'; }).length;
    var activeFacts = edited ? plan.facts : pick.facts;
    var rows = [['Facts', pick.set ? pick.set.opName + ': ' + pick.set.name + '. ' + capital(count(activeFacts.length, 'fact')) + '.' : capital(count(activeFacts.length, 'fact')) + ': ' + activeFacts.map(word).join(', ') + '.']];
    if (plan.mode === 'ccc') {
      var moved = plan.cards.map(function (c) { return builder.factKey(c.fact); }).join(',') !== activeFacts.map(builder.factKey).join(',');
      rows.push(['How', plan.method + '. Every fact once, ' + (pick.set ? 'in a mixed order, so the student cannot just count on.'
        : moved ? 'in the order you typed them, except that a fact is never right beside its turnaround.' : 'in the order you typed them.')]);
      rows.push(['Cards', capital(count(cards, 'card')) + (plan.recallFirst
        ? '. Answers stay hidden first so the student answers from memory.'
        : '. Each one starts with the fact and its answer.')]);
    } else {
      rows.push(['How', plan.method + '. New ' + (plan.newFacts.length === 1 ? 'fact' : 'facts') + ': ' + listed(plan.newFacts.map(word)) + '. Known facts: ' + listed(plan.knownFacts.map(word)) + '.']);
      rows.push(['Cards', capital(count(cards, 'card')) + '. ' + knownCards + ' are facts the student knows. ' + (plan.recallFirst
        ? 'Each new fact is asked 4 times, with answers hidden first on every card.'
        : 'Each new fact is asked 4 times, and shown with its answer the first time.')]);
    }
    rows.push(['Feedback', 'Right or wrong after every answer. After a wrong answer the file shows the answer, the student types it while looking, and then answers again from memory. Up to 3 tries from memory on each card.']);
    rows.push(['Clock', 'None.']);
    rows.push(['Title', result.lesson.title]);
    built = { baseHtml: result.html, html: result.html, name: result.lesson.lessonId + '.html', bytes: 0, lesson: lesson, plain: result.lesson.lessonId + '.html', slug: result.lesson.lessonId || 'math-practice', title: result.lesson.title || 'Math Fact Practice', plan: plan, cards: cards, summaryBase: rows, codeName: '' };
    applySingleCodeName();
    drawPreviewNote(edited);
    show('summary', true);
    show('download-worksheet', true);
    show('download-docx', true);
    show('download-bundle', !!(window.AlloPacketZip && typeof window.AlloPacketZip.create === 'function'));
    show('math-ws-options', true);
    show('save', true);
    try { drawPaper(result, plan); } catch (_) { clearPaper(); }
    setText('making-said', 'The file is ready: ' + count(cards, 'card') + ', ' + fileSize(built.bytes) + '.');
    drawBatch();
  }
  function clearPaper() {
    paperOn = false;
    var host = $('paper');
    if (host) host.textContent = '';
    if (doc.body) doc.body.classList.remove('paper-on');
    show('print', false);
    show('print-note', false);
  }
  function paperField(label, short) {
    var box = el('span', short ? 'paper-field paper-field-short' : 'paper-field');
    box.appendChild(doc.createTextNode(label + ':'));
    box.appendChild(el('span', 'paper-fill'));
    return box;
  }
  function drawPaper(result, plan) {
    var host = $('paper');
    if (!host || !plan || !Array.isArray(plan.cards) || !plan.cards.length) { clearPaper(); return; }
    var title = (result && result.lesson && result.lesson.title) || 'Math fact practice';
    var items = plan.cards.map(function (c) { return builder.factWord(c.fact, loader); });
    host.textContent = '';

    var sheet = el('section', 'paper-sheet');
    sheet.setAttribute('aria-label', 'Practice sheet');
    sheet.appendChild(el('h2', 'paper-title', title));
    var who = el('div', 'paper-who');
    who.appendChild(paperField('Name', false));
    who.appendChild(paperField('Date', true));
    sheet.appendChild(who);
    var recallSheet = !!plan.recallFirst;
    sheet.appendChild(el('p', 'paper-how', recallSheet
      ? '1. Read each fact and write the answer from memory. 2. Compare your answers with the teacher answer key on the separate sheet. 3. Write any missed fact once on the right.'
      : '1. Look at the fact on the left and say it to yourself. 2. Fold or cover the left column. 3. Write the answer from memory in the middle column. 4. Uncover and compare. If it does not match, write the whole fact once on the right.'));

    var table = el('table', 'paper-ccc');
    var thead = el('thead'), headRow = el('tr');
    (recallSheet
      ? [['No.', 'pc-n'], ['Answer from memory', 'pc-try'], ['Write again if needed', 'pc-fix']]
      : [['No.', 'pc-n'], ['Look and cover', 'pc-look'], ['Cover and write', 'pc-try'], ['Write again if needed', 'pc-fix']]
    ).forEach(function (col) {
      var th = el('th', col[1], col[0]);
      th.scope = 'col';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    items.forEach(function (it, idx) {
      var tr = el('tr');
      tr.appendChild(el('td', 'pc-n', String(idx + 1) + '.'));
      if (!recallSheet) tr.appendChild(el('td', 'pc-look', it.word + ' = ' + it.answer));
      var tryCell = el('td', 'pc-try');
      tryCell.appendChild(doc.createTextNode(it.word + ' ='));
      tryCell.appendChild(el('span', 'paper-blank'));
      tr.appendChild(tryCell);
      var fixCell = el('td', 'pc-fix');
      fixCell.appendChild(el('span', 'paper-blank paper-blank-wide'));
      tr.appendChild(fixCell);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    sheet.appendChild(table);
    host.appendChild(sheet);

    var teacher = el('section', 'paper-teacher');
    teacher.setAttribute('aria-label', 'Answer key');
    teacher.appendChild(el('h2', 'paper-title', title + ' \u2014 Answer key'));
    teacher.appendChild(el('p', 'paper-keep', 'For the teacher. Keep this sheet apart from the student copy.'));
    if (plan.mode === 'rehearsal') {
      teacher.appendChild(el('p', 'paper-meta', 'New ' + (plan.newFacts.length === 1 ? 'fact' : 'facts') + ': ' + listed(plan.newFacts.map(word)) + '. Known facts: ' + listed(plan.knownFacts.map(word)) + '.'));
    }
    var keyList = el('ol', items.length > 20 ? 'paper-key key-cols-3' : 'paper-key');
    items.forEach(function (it, idx) {
      var li = el('li');
      li.appendChild(el('span', 'kn', String(idx + 1) + '.'));
      li.appendChild(el('span', 'kw', it.word));
      li.appendChild(el('span', 'ka', '= ' + it.answer));
      keyList.appendChild(li);
    });
    teacher.appendChild(keyList);
    host.appendChild(teacher);

    if (doc.body) doc.body.classList.add('paper-on');
    paperOn = true;
    show('print', true);
    show('print-note', true);
  }
  function printPaper() {
    if (!paperOn || typeof window.print !== 'function') return;
    window.print();
  }
  function download(url, name) {
    var link = doc.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
  }
  function worksheetFactsFromBuilt() {
    if (!built || !built.plan || !Array.isArray(built.plan.cards)) return [];
    return built.plan.cards.map(function (c) {
      var fw = builder.factWord(c.fact, loader);
      return { a: c.fact.a, b: c.fact.b, op: c.fact.op, word: fw.word, answer: fw.answer };
    });
  }
  function downloadBlobWithRevoke(blob, filename) {
    var url = '';
    try { url = URL.createObjectURL(blob); } catch (_) { url = ''; }
    if (!url) return problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
    download(url, filename);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 0);
  }
  var zipLoadPromise = null;
  var docxLoadPromise = null;
  function ensureZip() {
    if (window.AlloPacketZip && typeof window.AlloPacketZip.create === 'function') {
      return Promise.resolve(window.AlloPacketZip);
    }
    if (zipLoadPromise) return zipLoadPromise;
    zipLoadPromise = new Promise(function (resolve, reject) {
      var finish = function () {
        if (window.AlloPacketZip && typeof window.AlloPacketZip.create === 'function') {
          resolve(window.AlloPacketZip);
        } else {
          zipLoadPromise = null;
          reject(new Error('zip helper did not load'));
        }
      };
      var existing = doc.querySelector('script[data-allo-zip="1"]');
      if (existing) {
        if (existing.getAttribute('data-loaded') === '1') { finish(); return; }
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', function () { zipLoadPromise = null; reject(new Error('could not load packets_zip.js')); }, { once: true });
        return;
      }
      var s = doc.createElement('script');
      s.src = 'packets_zip.js';
      s.async = true;
      s.setAttribute('data-allo-zip', '1');
      s.addEventListener('load', function () { s.setAttribute('data-loaded', '1'); finish(); }, { once: true });
      s.addEventListener('error', function () { zipLoadPromise = null; reject(new Error('could not load packets_zip.js')); }, { once: true });
      (doc.head || doc.body || doc.documentElement).appendChild(s);
    });
    return zipLoadPromise;
  }
  function ensureDocx() {
    if (window.AlloPacketDocx && typeof window.AlloPacketDocx.buildMathWorksheetDocx === 'function' && typeof window.AlloPacketDocx.downloadDocx === 'function') {
      return Promise.resolve(window.AlloPacketDocx);
    }
    if (docxLoadPromise) return docxLoadPromise;
    docxLoadPromise = new Promise(function (resolve, reject) {
      var finish = function () {
        if (window.AlloPacketDocx && typeof window.AlloPacketDocx.buildMathWorksheetDocx === 'function' && typeof window.AlloPacketDocx.downloadDocx === 'function') {
          resolve(window.AlloPacketDocx);
        } else {
          docxLoadPromise = null;
          reject(new Error('Word export helper did not load'));
        }
      };
      var existing = doc.querySelector('script[data-allo-docx="1"]');
      if (existing) {
        if (existing.getAttribute('data-loaded') === '1') { finish(); return; }
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', function () { docxLoadPromise = null; reject(new Error('could not load packets_docx.js')); }, { once: true });
        return;
      }
      var s = doc.createElement('script');
      s.src = 'packets_docx.js';
      s.async = true;
      s.setAttribute('data-allo-docx', '1');
      s.addEventListener('load', function () { s.setAttribute('data-loaded', '1'); finish(); }, { once: true });
      s.addEventListener('error', function () { docxLoadPromise = null; reject(new Error('could not load packets_docx.js')); }, { once: true });
      (doc.head || doc.body || doc.documentElement).appendChild(s);
    });
    return docxLoadPromise;
  }
  function mathWorksheetOpts() {
    var sup = $('f-ws-support') ? $('f-ws-support').value : 'scaffolded';
    var lay = $('f-ws-layout') ? $('f-ws-layout').value : 'horizontal';
    var den = $('f-ws-density') ? $('f-ws-density').value : 'standard';
    var keyBox = $('f-ws-key');
    return {
      scaffolded: sup !== 'independent',
      layout: lay === 'vertical' ? 'vertical' : 'horizontal',
      density: (den === 'primary' || den === 'compact') ? den : 'standard',
      includeAnswerKey: keyBox ? !!keyBox.checked : true,
    };
  }
  function renderMathAidPng(item) {
    if (!item || !doc || typeof doc.createElement !== 'function') return '';
    var canvas = null, ctx = null;
    try {
      if (window.navigator && /jsdom/i.test(String(window.navigator.userAgent || ''))) return '';
      canvas = doc.createElement('canvas');
      if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.toDataURL !== 'function') return '';
      ctx = canvas.getContext('2d');
      if (!ctx) return '';
    } catch (_) { return ''; }

    var scale = 2;
    function setup(w, h) {
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    function finish() {
      ctx.restore();
      try {
        var uri = canvas.toDataURL('image/png');
        return typeof uri === 'string' && uri.indexOf('data:image/png;base64,') === 0 ? uri : '';
      } catch (_) { return ''; }
    }
    function drawPartWhole(label) {
      setup(160, 44);
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.3;
      ctx.strokeRect(4, 4, 152, 18);
      ctx.strokeStyle = '#808080'; ctx.lineWidth = 1;
      ctx.strokeRect(4, 24, 74, 16);
      ctx.strokeRect(82, 24, 74, 16);
      ctx.fillStyle = '#000000'; ctx.font = 'bold 9px Arial, Helvetica, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(label || 'Show your thinking'), 80, 13);
      return finish();
    }
    function drawTenFrame(a, b) {
      var total = a + b, frames = total > 10 ? 2 : 1, cell = 18, pad = 4, gap = 10, fw = cell * 5;
      var w = pad * 2 + frames * fw + (frames - 1) * gap, h = pad * 2 + cell * 2;
      setup(w, h);
      var idx = 0;
      for (var f = 0; f < frames; f++) {
        var ox = pad + f * (fw + gap);
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.3;
        ctx.strokeRect(ox, pad, fw, cell * 2);
        for (var r = 0; r < 2; r++) {
          for (var c = 0; c < 5; c++) {
            var cx = ox + c * cell, cy = pad + r * cell;
            ctx.strokeStyle = '#808080'; ctx.lineWidth = 0.8;
            ctx.strokeRect(cx, cy, cell, cell);
            if (idx < a) {
              ctx.beginPath(); ctx.arc(cx + cell / 2, cy + cell / 2, 5.5, 0, Math.PI * 2);
              ctx.fillStyle = '#000000'; ctx.fill();
            } else if (idx < total) {
              ctx.beginPath(); ctx.arc(cx + cell / 2, cy + cell / 2, 5.2, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff'; ctx.fill();
              ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.6; ctx.stroke();
            }
            idx++;
          }
        }
      }
      return finish();
    }
    function drawNumberLine(a, b, isSub) {
      var maxVal = isSub ? Math.max(10, a <= 20 ? 20 : a) : Math.max(10, a + b <= 20 ? 20 : a + b);
      var w = 220, h = 46, x0 = 12, x1 = w - 12, yLine = 31;
      var cue = 'Start at ' + a + ', jump ' + (isSub ? MINUS : '+') + b + (isSub ? ' \u2190' : ' \u2192');
      setup(w, h);
      ctx.font = '8.5px Arial, Helvetica, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000000';
      ctx.fillText(cue, w / 2, 11);
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x0, yLine); ctx.lineTo(x1, yLine); ctx.stroke();
      if (maxVal <= 20) {
        var step = (x1 - x0) / maxVal;
        for (var n = 0; n <= maxVal; n++) {
          var tx = x0 + n * step, tall = n % 5 === 0 ? 5 : 3;
          ctx.lineWidth = n % 5 === 0 ? 1.2 : 0.8;
          ctx.beginPath(); ctx.moveTo(tx, yLine - tall); ctx.lineTo(tx, yLine + tall); ctx.stroke();
          if (n % 5 === 0) ctx.fillText(String(n), tx, h - 2);
        }
        var sx = x0 + Math.max(0, Math.min(maxVal, a)) * step;
        ctx.beginPath(); ctx.arc(sx, yLine, 3.2, 0, Math.PI * 2); ctx.fill();
        if (b > 0) {
          var dir = isSub ? -1 : 1;
          var ax1 = Math.max(x0 + 4, Math.min(x1 - 4, sx + dir * 18));
          ctx.strokeStyle = '#666666'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(sx, yLine - 9); ctx.lineTo(ax1, yLine - 9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ax1 - dir * 3.5, yLine - 12); ctx.lineTo(ax1, yLine - 9); ctx.lineTo(ax1 - dir * 3.5, yLine - 6); ctx.stroke();
        }
      } else {
        var pStart = isSub ? x1 - 24 : x0 + 24;
        ctx.beginPath(); ctx.arc(pStart, yLine, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(String(a), pStart, h - 2);
        if (b > 0) {
          var oDir = isSub ? -1 : 1, oEnd = pStart + oDir * 30;
          ctx.strokeStyle = '#666666'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(pStart, yLine - 9); ctx.lineTo(oEnd, yLine - 9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(oEnd - oDir * 3.5, yLine - 12); ctx.lineTo(oEnd, yLine - 9); ctx.lineTo(oEnd - oDir * 3.5, yLine - 6); ctx.stroke();
        }
      }
      return finish();
    }
    function drawArrayGrid(rows, cols) {
      var rCount = Math.min(rows, 10), cCount = Math.min(cols, 10), step = 11, pad = 10;
      var w = pad * 2 + cCount * step, h = pad * 2 + rCount * step;
      setup(w, h);
      ctx.save(); ctx.strokeStyle = '#808080'; ctx.lineWidth = 1;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([2, 2]);
      ctx.strokeRect(pad - 3, pad - 3, cCount * step + 6, rCount * step + 6);
      ctx.restore();
      ctx.fillStyle = '#000000';
      for (var r = 0; r < rCount; r++) {
        for (var c = 0; c < cCount; c++) {
          ctx.beginPath(); ctx.arc(pad + c * step + step / 2, pad + r * step + step / 2, 3.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      return finish();
    }
    function drawEqualGroups(total, groups) {
      var gShow = Math.max(1, Math.min(groups, 10));
      var boxW = 20, boxH = 22, gap = 4, pad = 4;
      var rowW = gShow * boxW + Math.max(0, gShow - 1) * gap;
      var w = Math.max(150, pad * 2 + rowW), h = pad * 2 + boxH + 13;
      var startX = (w - rowW) / 2;
      setup(w, h);
      ctx.fillStyle = '#000000'; ctx.font = '8.5px Arial, Helvetica, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Share ' + total + ' into ' + groups + ' equal groups', w / 2, 11);
      for (var g = 0; g < gShow; g++) {
        var bx = startX + g * (boxW + gap);
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
        ctx.strokeRect(bx, 15, boxW, boxH);
      }
      return finish();
    }

    if (item.hasEquals || item.a === null || item.b === null || !item.op) return drawPartWhole('Show your thinking');
    if (item.op === 'add') return (item.a >= 0 && item.b >= 0 && item.a <= 10 && item.b <= 10 && item.a + item.b <= 20) ? drawTenFrame(item.a, item.b) : drawNumberLine(item.a, item.b, false);
    if (item.op === 'sub') return drawNumberLine(item.a, item.b, true);
    if (item.op === 'mul') return (item.a >= 1 && item.a <= 10 && item.b >= 1 && item.b <= 10) ? drawArrayGrid(item.a, item.b) : drawPartWhole(item.a + ' groups of ' + item.b);
    if (item.op === 'div') return (item.b >= 1 && item.b <= 10 && item.a >= 0 && item.a <= 100 && item.a % item.b === 0) ? drawEqualGroups(item.a, item.b) : drawPartWhole(item.a + ' split by ' + item.b);
    return drawPartWhole('Show your thinking');
  }
  function worksheetFactsWithAids(rawFacts, withAids) {
    return (Array.isArray(rawFacts) ? rawFacts : []).map(function (f) {
      var clone = Object.assign({}, f);
      if (withAids) {
        var norm = normalizeWorksheetFact(clone);
        if (norm) {
          clone.aidUri = renderMathAidPng(norm);
          clone.aidLabel = 'Visual model for ' + norm.expr;
        }
      }
      return clone;
    });
  }
  function downloadWorksheet() {
    if (!built) return;
    var opts = mathWorksheetOpts();
    var html = buildMathWorksheetHtml({
      title: built.title,
      facts: worksheetFactsFromBuilt(),
      scaffolded: opts.scaffolded,
      includeAnswerKey: opts.includeAnswerKey,
    });
    var slug = built.slug || built.plain.replace(/\.html$/i, '') || 'math-practice';
    downloadBlobWithRevoke(new Blob([html], { type: 'text/html' }), slug + '-math-worksheet.html');
  }
  function downloadDocx() {
    if (!built) return;
    var btn = $('download-docx');
    var prevText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Building Word file...'; }
    var restore = function () {
      if (btn) { btn.disabled = false; btn.textContent = prevText || 'Download Word (.docx)'; }
    };
    var opts = mathWorksheetOpts();
    Promise.all([ensureZip(), ensureDocx()]).then(function (mods) {
      var zipMod = mods[0], docxMod = mods[1];
      var slug = built.slug || built.plain.replace(/\.html$/i, '') || 'math-practice';
      var model = {
        title: built.title,
        directions: opts.scaffolded
          ? 'Use the visual model and workspace to solve each math fact.'
          : 'Write the answer to each math fact.',
        layout: opts.layout,
        density: opts.density,
        scaffolded: opts.scaffolded,
        facts: worksheetFactsWithAids(worksheetFactsFromBuilt(), opts.scaffolded),
        answerKeyOn: opts.includeAnswerKey,
      };
      var prep = opts.scaffolded && typeof docxMod.prepareImagesAsync === 'function'
        ? Promise.resolve().then(function () { return docxMod.prepareImagesAsync(model, window, doc); }).then(function (p) { return p || model; }, function () { return model; })
        : Promise.resolve(model);
      return prep.then(function (prepared) {
        var result = docxMod.buildMathWorksheetDocx(prepared, { zip: zipMod, filename: slug + '-math-worksheet.docx' });
        var ok = docxMod.downloadDocx(result, window, doc);
        restore();
        if (!ok) {
          problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
          return;
        }
        setText('making-said', 'Downloaded ' + result.filename + '.');
      });
    }, function (error) {
      restore();
      problem('The Word file could not be made (' + said(error) + ').');
    });
  }
  function downloadBundle() {
    if (!built || !built.html) return;
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') {
      return problem('This page could not load the part that makes .zip files. Load the page again.');
    }
    var btn = $('download-bundle');
    var prevText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Building bundle...'; }
    var restore = function () {
      if (btn) { btn.disabled = false; btn.textContent = prevText || 'Download classroom bundle (.zip)'; }
    };
    var opts = mathWorksheetOpts();
    var facts = worksheetFactsFromBuilt();
    var finishZip = function (docxEntries) {
      try {
        var zip = window.AlloPacketZip.create();
        var encoder = new TextEncoder();
        var wsScaffolded = buildMathWorksheetHtml({ title: built.title, facts: facts, scaffolded: true, includeAnswerKey: false });
        var wsIndependent = buildMathWorksheetHtml({ title: built.title, facts: facts, scaffolded: false, includeAnswerKey: false });
        var wsAnswerKey = buildMathWorksheetHtml({ title: built.title, facts: facts, scaffolded: false, includeAnswerKey: true });
        zip.add('01-Interactive-Math-Practice.html', encoder.encode(built.html));
        zip.add('02-Worksheet-Scaffolded.html', encoder.encode(wsScaffolded));
        zip.add('03-Worksheet-Independent.html', encoder.encode(wsIndependent));
        zip.add('04-Teacher-Answer-Key.html', encoder.encode(wsAnswerKey));
        (docxEntries || []).forEach(function (entry) {
          if (entry && entry.name && entry.bytes) zip.add(entry.name, entry.bytes);
        });
        var parts = zip.finish();
        var slug = built.slug || built.plain.replace(/\.html$/i, '') || 'math-practice';
        downloadBlobWithRevoke(new Blob(parts, { type: 'application/zip' }), slug + '-math-classroom-bundle.zip');
        restore();
      } catch (error) {
        restore();
        problem('The classroom bundle could not be made (' + said(error) + ').');
      }
    };
    ensureDocx().then(function (docxMod) {
      var scaffModel = {
        title: built.title,
        directions: 'Use the visual model and workspace to solve each math fact.',
        layout: opts.layout,
        density: opts.density,
        scaffolded: true,
        facts: worksheetFactsWithAids(facts, true),
        answerKeyOn: opts.includeAnswerKey,
      };
      var indepModel = {
        title: built.title,
        directions: 'Write the answer to each math fact.',
        layout: opts.layout,
        density: opts.density,
        scaffolded: false,
        facts: facts,
        answerKeyOn: opts.includeAnswerKey,
      };
      var prep = typeof docxMod.prepareImagesAsync === 'function'
        ? Promise.resolve().then(function () { return docxMod.prepareImagesAsync(scaffModel, window, doc); }).then(function (p) { return p || scaffModel; }, function () { return scaffModel; })
        : Promise.resolve(scaffModel);
      return prep.then(function (preparedScaff) {
        var d1 = docxMod.buildMathWorksheetDocx(preparedScaff, { zip: window.AlloPacketZip, filename: '05-Worksheet-Scaffolded.docx' });
        var d2 = docxMod.buildMathWorksheetDocx(indepModel, { zip: window.AlloPacketZip, filename: '06-Worksheet-Independent.docx' });
        finishZip([
          { name: '05-Worksheet-Scaffolded.docx', bytes: d1.bytes },
          { name: '06-Worksheet-Independent.docx', bytes: d2.bytes },
        ]);
      });
    }, function () {
      finishZip([]);
    });
  }
  function saveFile() {
    if (!built) return;
    var url = fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) return problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
    download(url, built.name);
    show('after-save', true);
    $('after-save').focus();
  }

  // ---------------------------------------------------------------------------
  // Saved Local Teacher Presets (localStorage key 'alloflow-math-presets/1', zero account)
  // ---------------------------------------------------------------------------
  function presetSlug(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'preset';
  }
  function sanitizePresetItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var name = String(raw.name || '').trim().slice(0, 60);
    if (!name) return null;
    var out = {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 60) : presetSlug(name),
      name: name,
      kind: KINDS.indexOf(raw.kind) >= 0 ? raw.kind : '',
      sets: { add: '', sub: '', mul: '', div: '' },
      facts: typeof raw.facts === 'string' ? raw.facts.slice(0, MAX_TYPED) : '',
      method: METHOD_IDS.indexOf(raw.method) >= 0 ? raw.method : '',
      recallFirst: !!raw.recallFirst,
      known: Object.create(null),
      title: typeof raw.title === 'string' ? raw.title.slice(0, 80) : '',
    };
    OPS.forEach(function (kind) {
      var id = raw.sets && typeof raw.sets === 'object' && has(raw.sets, kind) ? raw.sets[kind] : '';
      var row = typeof id === 'string' ? setRow(id) : null;
      if (row && row.op === kind) out.sets[kind] = id;
    });
    if (raw.known && typeof raw.known === 'object' && !Array.isArray(raw.known)) {
      Object.keys(raw.known).forEach(function (source) {
        var keys = raw.known[source];
        if ((source === OWN || setRow(source)) && Array.isArray(keys)) {
          out.known[source] = keys.filter(function (k) { return typeof k === 'string' && /^(add|sub|mul|div):\d{1,3}:\d{1,3}$/.test(k); }).slice(0, 60);
        }
      });
    }
    return out;
  }
  function readPresets() {
    var parsed = null;
    try {
      parsed = JSON.parse(window.localStorage.getItem(PRESET_KEY) || 'null', function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
    } catch (_) { parsed = null; }
    var rawList = Array.isArray(parsed) ? parsed : (parsed && parsed.v === 1 && Array.isArray(parsed.items) ? parsed.items : []);
    var list = [], seen = Object.create(null);
    rawList.forEach(function (entry) {
      var item = sanitizePresetItem(entry);
      if (!item || seen[item.id]) return;
      seen[item.id] = true;
      if (list.length < MAX_PRESETS) list.push(item);
    });
    return list;
  }
  function writePresets(list) {
    try {
      window.localStorage.setItem(PRESET_KEY, JSON.stringify({ v: 1, items: list }));
      return true;
    } catch (_) { return false; }
  }
  function renderPresets(selectedId) {
    var select = $('math-preset-select');
    var delBtn = $('math-preset-delete');
    if (!select) return;
    var list = readPresets();
    select.textContent = '';
    var blank = el('option', '', 'Choose a saved preset');
    blank.value = '';
    select.appendChild(blank);
    var found = false;
    list.forEach(function (item) {
      var opt = el('option', '', item.name);
      opt.value = item.id;
      if (selectedId && item.id === selectedId) { opt.selected = true; found = true; }
      select.appendChild(opt);
    });
    select.value = found ? selectedId : '';
    if (delBtn) delBtn.disabled = !select.value;
  }
  function savePreset() {
    var nameInput = $('math-preset-name');
    var name = String((nameInput && nameInput.value) || '').trim().slice(0, 60);
    if (!name) {
      setText('math-preset-status', 'Type a preset name first.');
      if (nameInput) nameInput.focus();
      return;
    }
    var list = readPresets();
    var id = presetSlug(name);
    var knownCopy = Object.create(null);
    Object.keys(state.known || {}).forEach(function (source) {
      if (Array.isArray(state.known[source])) knownCopy[source] = state.known[source].slice();
    });
    var entry = {
      id: id,
      name: name,
      kind: state.kind,
      sets: { add: state.sets.add, sub: state.sets.sub, mul: state.sets.mul, div: state.sets.div },
      facts: state.facts,
      method: state.method,
      recallFirst: !!state.recallFirst,
      known: knownCopy,
      title: state.title,
    };
    var replaced = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id || list[i].name.toLowerCase() === name.toLowerCase()) {
        list[i] = entry;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      if (list.length >= MAX_PRESETS) list.pop();
      list.unshift(entry);
    }
    if (!writePresets(list)) {
      setText('math-preset-status', 'This browser could not save the preset.');
      return;
    }
    if (nameInput) nameInput.value = '';
    renderPresets(entry.id);
    setText('math-preset-status', 'Saved preset "' + entry.name + '".');
  }
  function applyPreset(id) {
    var delBtn = $('math-preset-delete');
    if (!id) {
      if (delBtn) delBtn.disabled = true;
      setText('math-preset-status', '');
      return;
    }
    var list = readPresets(), match = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { match = list[i]; break; }
    }
    if (!match) {
      renderPresets('');
      setText('math-preset-status', 'That preset is no longer saved.');
      return;
    }
    resetPreview(true);
    var fresh = defaults();
    fresh.kind = match.kind;
    fresh.sets = { add: match.sets.add, sub: match.sets.sub, mul: match.sets.mul, div: match.sets.div };
    fresh.facts = match.facts;
    fresh.method = match.method;
    fresh.recallFirst = !!match.recallFirst;
    fresh.title = match.title;
    Object.keys(match.known || {}).forEach(function (source) {
      if (Array.isArray(match.known[source])) fresh.known[source] = match.known[source].slice();
    });
    state = fresh;
    remember();
    drawStep1();
    if (step === 2) drawStep2();
    if (step === 3) { drawTitle(); makeSoon(30); }
    if (delBtn) delBtn.disabled = false;
    setText('math-preset-status', 'Loaded preset "' + match.name + '".');
  }
  function deletePreset() {
    var select = $('math-preset-select');
    var id = select ? select.value : '';
    if (!id) return;
    var list = readPresets(), removedName = '';
    var next = list.filter(function (item) {
      if (item.id === id) { removedName = item.name; return false; }
      return true;
    });
    writePresets(next);
    renderPresets('');
    setText('math-preset-status', removedName ? 'Deleted preset "' + removedName + '".' : 'Preset deleted.');
  }

  // ---------------------------------------------------------------------------
  // Step 3: unified code-name / batch .zip fold: 1 line puts that code name into the single file above;
  // 2-40 lines saves one file per student in one .zip file in 1 click (packets_zip.js).
  // ---------------------------------------------------------------------------
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;
  var MAX_ROSTER_BYTES = 256 * 1024;
  function cleanRosterLine(raw) {
    var s = String(raw || '').replace(/^\uFEFF/, '').trim();
    if (!s) return '';
    s = s.replace(/^(?:\(\d{1,3}\)|\d{1,3}[.)]|[\u2022\u25CF\u25CB\u25AA\u2023\u2043*\u2013\u2014-])\s+/, '').trim();
    var col = s.indexOf('\t') >= 0 ? s.split('\t')[0] : (s.indexOf(',') >= 0 ? s.split(',')[0] : s);
    return col.trim().replace(/^["']+|["']+$/g, '').trim();
  }
  function batchList() {
    var seen = Object.create(null), out = { names: [], twice: [], unusable: [], over: 0 };
    String(($('f-batch-names') && $('f-batch-names').value) || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var cleaned = cleanRosterLine(line);
      var name = builder.codeName(cleaned);
      if (!name) { out.unusable.push((cleaned || line.trim()).slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }
  function activeSingleCode() {
    var list = batchList();
    return list.names.length === 1 ? list.names[0] : '';
  }
  function drawBatch() {
    var list = batchList(), n = list.names.length, parts = [];
    var btn = $('batch-make');
    if (n === 0) {
      parts.push('Leave empty so each student types a code name at the start.');
      if (btn) btn.hidden = true;
    } else if (n === 1) {
      parts.push('Using ' + list.names[0] + ' in the file above' + (built ? ' (' + built.name + ')' : '') + '. Add another line to save a .zip.');
      if (btn) btn.hidden = true;
    } else {
      parts.push(count(n, 'file') + (built ? ', about ' + fileSize(n * built.bytes) + ' in all.' : '. The size shows here once the file above is ready.'));
      if (btn) {
        btn.hidden = false;
        btn.textContent = 'Save .zip for ' + n + ' students';
      }
    }
    if (list.over) parts.push('Not used: ' + count(list.over, 'more code name') + '. At most ' + MAX_STUDENTS + ' go in one .zip file.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    setText('batch-said', parts.join(' '));
  }
  function saveBatchZip() {
    setText('batch-problem', '');
    var list = batchList();
    if (list.names.length < 2) { setText('batch-problem', 'Type at least 2 code names to save a .zip file.'); return; }
    if (!built || !built.baseHtml) { setText('batch-problem', 'The file above is not ready yet.'); return; }
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') { setText('batch-problem', 'This page could not load the part that makes .zip files. Load the page again.'); return; }
    try {
      var zip = window.AlloPacketZip.create(), encoder = new TextEncoder();
      list.names.forEach(function (name) { zip.add(withName(built.plain, name), encoder.encode(builder.withCodeName(built.baseHtml, name))); });
      var parts = zip.finish();
      var zipName = built.plain.replace(/\.html$/, '') + '__' + list.names.length + '-students.zip';
      var url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' }));
      download(url, zipName);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
      setText('batch-said', 'Saved ' + zipName + ' (' + fileSize(zip.bytes) + '). Each file\'s name ends with the student\'s code name. Send each student their own file.');
    } catch (error) { setText('batch-problem', 'The .zip file could not be made (' + said(error) + ').'); }
  }
  function loadRosterFile(file) {
    setText('batch-problem', '');
    if (!file) return;
    if (file.size > MAX_ROSTER_BYTES) { setText('batch-problem', 'That text file is too large. Choose a plain .txt list of code names.'); return; }
    if (typeof FileReader !== 'function') { setText('batch-problem', 'This browser cannot read local files here.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var input = $('f-batch-names');
      if (input) input.value = String(reader.result || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      applySingleCodeName();
      drawBatch();
    };
    reader.onerror = function () { setText('batch-problem', 'This browser could not read that file.'); };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // "Open a file I made" (2026-11-13): the page fills itself in from a practice file made earlier. packets_reopen.js
  // reads it (readMath, with packets_verify_core.js). The file is read in this tab only. Nothing in it is run.
  // ---------------------------------------------------------------------------
  var reopenKit = null;
  var reopenPending = null;
  function showReopen(line, items, page) {
    setText('reopen-line', line);
    var host = $('reopen-list');
    host.textContent = '';
    (items || []).forEach(function (text) { host.appendChild(el('li', '', text)); });
    host.hidden = !(items && items.length);
    var link = $('reopen-page');
    if (page) { link.setAttribute('href', page.href); link.textContent = 'Open ' + page.name; }
    link.hidden = !page;
    show('reopen-note', true);
    $('reopen-note').focus();
  }
  function applyReopen(result, name, bytes, recallFirst) {
    if (!result.ok) {
      var handoff = window.AlloPacketHandoff;
      var pageHref = result.page ? result.page.href : '';
      if (pageHref && bytes) {
        reopenPending = {
          file: { name: name, bytes: bytes },
          href: pageHref,
          hash: pageHref === 'packets-results.html' ? ((handoff && handoff.RESULTS_HASH) || '#import-results') : ((handoff && handoff.HASH) || '#open-file'),
        };
      } else {
        reopenPending = null;
      }
      showReopen(result.why, [], result.page);
      return;
    }
    reopenPending = null;
    var got = result.math, items = [];
    clearTimeout(buildTimer);
    resetPreview(true);
    clearBuilt();
    var fresh = defaults();
    fresh.sets = state.sets;
    fresh.known = state.known;
    fresh.kind = got.kind;
    fresh.method = got.method;
    fresh.recallFirst = !!recallFirst;
    if (got.kind === OWN) {
      fresh.facts = got.facts;
      if (got.method === 'rehearsal') fresh.known[OWN] = got.known.slice();
      items.push(capital(count(got.facts ? got.facts.split('\n').length : 0, 'fact')) + '. They are in step 1, under My own facts.');
    } else {
      var set = setRow(got.set);
      fresh.sets[got.kind] = got.set;
      if (got.method === 'rehearsal') { if (got.known) fresh.known[got.set] = got.known.slice(); else delete fresh.known[got.set]; }
      items.push(set.opName + ': ' + set.name + '.');
    }
    items.push(builder.METHODS[got.method].name + '.' + (got.method === 'rehearsal' ? ' The facts chosen as known are in step 2.' : ''));
    fresh.title = result.title;
    fresh.learner = result.learner || '';
    if ($('f-batch-names')) $('f-batch-names').value = fresh.learner;
    if (fresh.learner && $('batch')) $('batch').open = true;
    if (result.title) items.push('Title: ' + result.title + (/[.!?]$/.test(result.title) ? '' : '.'));
    result.notes.forEach(function (note) { items.push(note); });
    state = fresh;
    remember();
    goTo(1, true);
    showReopen('Filled in from ' + name + '. Change what you want, then make the new file in step 3.', items, null);
  }
  function reopenText(text, name, bytes) {
    if (!reopenKit) return;
    var rawBytes = bytes || (typeof TextEncoder === 'function' ? new TextEncoder().encode(String(text || '')).buffer : null);
    var recallFirst = false;
    try {
      var parts = window.AlloPacketVerify && typeof window.AlloPacketVerify.readParts === 'function' ? window.AlloPacketVerify.readParts(text) : null;
      var block = parts && parts.lesson && Array.isArray(parts.lesson.blocks) ? parts.lesson.blocks[0] : null;
      if (block && Array.isArray(block.items) && block.items.length) {
        recallFirst = block.items.every(function (it) { return it && it.study === false; });
      }
    } catch (_) { recallFirst = false; }
    applyReopen(reopenKit.readMath(text, { verify: window.AlloPacketVerify, builder: builder, codeName: builder.codeName }), String(name || 'the file').slice(0, 120), rawBytes, recallFirst);
  }
  function openReopenFile(file) {
    if (!file) return;
    if (file.size > MAX_REOPEN_BYTES) { reopenPending = null; showReopen('This file is too large to be a practice file made here.', [], null); return; }
    var done = function (buf) {
      var text = typeof TextDecoder === 'function' ? new TextDecoder('utf-8').decode(buf) : '';
      reopenText(text, file.name, buf);
    };
    if (typeof file.arrayBuffer === 'function') {
      file.arrayBuffer().then(done, function () { showReopen('This browser could not read the file.', [], null); });
    } else {
      var reader = new FileReader();
      reader.onload = function () { reopenText(String(reader.result || ''), file.name); };
      reader.onerror = function () { showReopen('This browser could not read the file.', [], null); };
      reader.readAsText(file);
    }
  }
  function wireReopen() {
    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      openReopenFile(file);
    });
    if ($('reopen-close')) {
      $('reopen-close').addEventListener('click', function () {
        show('reopen-note', false);
        reopenPending = null;
        if ($('reopen-choose')) $('reopen-choose').focus();
      });
    }
    var dropHost = doc.querySelector('main') || doc.body;
    var reopenBox = $('reopen');
    if (dropHost) {
      var dragDepth = 0;
      dropHost.addEventListener('dragenter', function (event) {
        if (!event.dataTransfer || !reopenKit) return;
        dragDepth++;
        if (reopenBox) reopenBox.classList.add('is-dropping');
      });
      dropHost.addEventListener('dragover', function (event) {
        if (!event.dataTransfer || !reopenKit) return;
        event.preventDefault();
        if (reopenBox) reopenBox.classList.add('is-dropping');
      });
      dropHost.addEventListener('dragleave', function () {
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth && reopenBox) reopenBox.classList.remove('is-dropping');
      });
      dropHost.addEventListener('drop', function (event) {
        dragDepth = 0;
        if (reopenBox) reopenBox.classList.remove('is-dropping');
        var files = event.dataTransfer && event.dataTransfer.files;
        if (!files || !files.length || !reopenKit) return;
        event.preventDefault();
        openReopenFile(files[0]);
      });
    }
    if ($('reopen-page')) {
      $('reopen-page').addEventListener('click', function (event) {
        var handoff = window.AlloPacketHandoff;
        if (!reopenPending || !handoff || typeof handoff.redirect !== 'function') return;
        event.preventDefault();
        var target = reopenPending;
        reopenPending = null;
        handoff.redirect(target.file, target.href, target.hash).catch(function () { $('reopen-page').click(); });
      });
    }
  }
  function applyRehearseHash() {
    var hash = window.location ? String(window.location.hash || '') : '';
    var match = /^#rehearse=([^&]+)(?:&known=(.+))?$/i.exec(hash);
    if (!match) return false;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    var decode = function (part) {
      try { return decodeURIComponent(part || ''); } catch (_) { return String(part || ''); }
    };
    var seen = Object.create(null), blockedKnown = Object.create(null);
    var missedFacts = [], knownFacts = [];
    decode(match[1]).split(/[,;\n]+/).forEach(function (tok) {
      var part = String(tok || '').trim();
      if (!part || missedFacts.length >= builder.MAX_FACTS) return;
      var parsed = [];
      try { parsed = builder.parseFacts(part); } catch (_) { parsed = []; }
      parsed.forEach(function (f) {
        var key = builder.factKey(f);
        if (seen[key] || missedFacts.length >= builder.MAX_FACTS) return;
        seen[key] = true;
        blockedKnown[key] = true;
        var turn = builder.turnaround(f);
        if (turn) blockedKnown[builder.factKey(turn)] = true;
        missedFacts.push(f);
      });
    });
    if (!missedFacts.length) return false;
    if (match[2]) {
      decode(match[2]).split(/[,;\n]+/).forEach(function (tok) {
        var part = String(tok || '').trim();
        if (!part || missedFacts.length + knownFacts.length >= builder.MAX_FACTS) return;
        var parsed = [];
        try { parsed = builder.parseFacts(part); } catch (_) { parsed = []; }
        parsed.forEach(function (f) {
          var key = builder.factKey(f);
          if (seen[key] || blockedKnown[key] || missedFacts.length + knownFacts.length >= builder.MAX_FACTS) return;
          seen[key] = true;
          knownFacts.push(f);
        });
      });
    }
    state.kind = OWN;
    resetPreview(true);
    state.facts = missedFacts.concat(knownFacts).map(word).join('\n');
    state.title = 'Practice missed math facts';
    if (knownFacts.length >= 3) {
      state.method = 'rehearsal';
      state.known[OWN] = knownFacts.map(builder.factKey);
    } else {
      state.method = 'ccc';
      delete state.known[OWN];
    }
    remember();
    drawStep1();
    setText('rehearse-note', 'Loaded ' + count(missedFacts.length, 'missed fact') + (knownFacts.length >= 3 ? ' and ' + count(knownFacts.length, 'known fact') : '') + ' from results. They are in step 1, under My own facts.');
    show('rehearse-note', true);
    goTo(2, true);
    return true;
  }

  function applyMathPracticeDraft(draft) {
    if (!draft || draft.kind !== 'math_practice') {
      setText('rehearse-note', 'The follow-up draft is no longer waiting. Choose a fact set or type your own facts in step 1.');
      show('rehearse-note', true);
      return false;
    }
    var rawMissed = Array.isArray(draft.missedFacts) && draft.missedFacts.length
      ? draft.missedFacts
      : (Array.isArray(draft.facts) ? draft.facts : []);
    var rawKnown = Array.isArray(draft.reviewFacts)
      ? draft.reviewFacts
      : (Array.isArray(draft.knownFacts) ? draft.knownFacts : []);
    var seen = Object.create(null), blockedKnown = Object.create(null);
    var missedFacts = [], knownFacts = [];
    rawMissed.forEach(function (tok) {
      var part = String(tok || '').trim();
      if (!part || missedFacts.length >= builder.MAX_FACTS) return;
      var parsed = [];
      try { parsed = builder.parseFacts(part); } catch (_) { parsed = []; }
      parsed.forEach(function (f) {
        var key = builder.factKey(f);
        if (seen[key] || missedFacts.length >= builder.MAX_FACTS) return;
        seen[key] = true;
        blockedKnown[key] = true;
        var turn = builder.turnaround(f);
        if (turn) blockedKnown[builder.factKey(turn)] = true;
        missedFacts.push(f);
      });
    });
    if (!missedFacts.length) {
      setText('rehearse-note', 'No usable math facts were found in that draft. Choose a fact set or type your own facts in step 1.');
      show('rehearse-note', true);
      return false;
    }
    rawKnown.forEach(function (tok) {
      var part = String(tok || '').trim();
      if (!part || missedFacts.length + knownFacts.length >= builder.MAX_FACTS) return;
      var parsed = [];
      try { parsed = builder.parseFacts(part); } catch (_) { parsed = []; }
      parsed.forEach(function (f) {
        var key = builder.factKey(f);
        if (seen[key] || blockedKnown[key] || missedFacts.length + knownFacts.length >= builder.MAX_FACTS) return;
        seen[key] = true;
        knownFacts.push(f);
      });
    });
    state.kind = OWN;
    resetPreview(true);
    state.facts = missedFacts.concat(knownFacts).map(word).join('\n');
    var draftTitle = typeof draft.title === 'string' ? draft.title.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    state.title = draftTitle || 'Follow-up math fact practice';
    if (knownFacts.length >= 3 && draft.method !== 'ccc') {
      state.method = 'rehearsal';
      state.known[OWN] = knownFacts.map(builder.factKey);
    } else {
      state.method = 'ccc';
      delete state.known[OWN];
    }
    remember();
    drawStep1();
    setText('rehearse-note', 'Loaded ' + count(missedFacts.length, 'missed fact') + (knownFacts.length ? ' and ' + count(knownFacts.length, 'review fact') : '') + ' from results. They are in step 1, under My own facts.');
    show('rehearse-note', true);
    goTo(2, true);
    return true;
  }

  // A file handed over by "Change this file" on Open a practice file (packets-open.html, packets_handoff.js),
  // or a follow-up draft handed over via #import-draft from Add up results.
  function takeHanded() {
    var handoff = window.AlloPacketHandoff;
    if (!handoff) return;
    var draftHash = handoff.DRAFT_HASH || '#import-draft';
    if (typeof handoff.takeDraft === 'function' && window.location.hash === draftHash) {
      try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
      handoff.takeDraft().then(function (draft) {
        applyMathPracticeDraft(draft);
      }, function () {
        setText('rehearse-note', 'This browser could not hand the follow-up draft over. Choose a fact set or type your own facts in step 1.');
        show('rehearse-note', true);
      });
      return;
    }
    if (!reopenKit || typeof handoff.take !== 'function' || window.location.hash !== handoff.HASH) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (!file) { showReopen('The file is not here any more. Choose it with Open a file I made.', [], null); return; }
      reopenText(new TextDecoder('utf-8').decode(file.bytes), file.name, file.bytes);
    }, function () { showReopen('This browser could not hand the file over. Choose it with Open a file I made.', [], null); });
  }

  // ---------------------------------------------------------------------------
  // Moving between the steps
  // ---------------------------------------------------------------------------
  function goTo(wanted, quiet) {
    var target = wanted, stop = '';
    if (target >= 2) {
      stop = stopAtStep1();
      if (stop) { target = 1; setText('step-1-problem', stop); }
    }
    if (target === 3) {
      stop = stopAtStep2();
      if (stop) target = 2;
    }
    if (target !== 3) { clearTimeout(buildTimer); stopPreview(); clearBuilt(); show('making', false); }
    // Sent back to the step already on screen: the reason is announced and the focus stays where it is.
    var stayed = target !== wanted && target === step;
    step = target;
    [1, 2, 3].forEach(function (n) { show('step-' + n, n === step); });
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      var n = Number(tab.getAttribute('data-go'));
      if (n === step) tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
      tab.classList.toggle('is-done', n < step);
    });
    var name = productName();
    doc.title = (name ? name + ': ' : '') + 'Make math fact practice, step ' + step + ' of 3';
    if (step === 1) drawStep1();
    if (step === 2) { drawStep2(); setText('step-2-problem', stop); }
    if (step === 3) { drawTitle(); syncCodeName(); drawBatch(); makeSoon(30); }
    if (!quiet && !stayed) {
      var heading = $('step-' + step + '-title');
      if (heading) { heading.focus(); if (typeof heading.scrollIntoView === 'function') heading.scrollIntoView({ block: 'start' }); }
    }
  }

  function wire() {
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      tab.addEventListener('click', function () { goTo(Number(tab.getAttribute('data-go'))); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="kind"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.kind = radio.value; resetPreview(false); remember(); setText('step-1-problem', ''); drawStep1(); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="method"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.method = radio.value; resetPreview(false); remember(); setText('step-2-problem', ''); drawStep2(); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="recall"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.recallFirst = radio.value === 'memory'; resetPreview(false); remember(); setText('step-2-problem', ''); drawStep2(); });
    });
    $('next-1').addEventListener('click', function () { goTo(2); });
    $('back-2').addEventListener('click', function () { goTo(1); });
    $('next-2').addEventListener('click', function () { goTo(3); });
    $('back-3').addEventListener('click', function () { goTo(2); });
    $('fix-choices').addEventListener('click', function () { goTo(2); });
    $('retry').addEventListener('click', function () { makeSoon(30); });
    $('f-facts').addEventListener('input', function () {
      state.facts = this.value.slice(0, MAX_TYPED);
      resetPreview(false);
      remember();
      clearTimeout(ownTimer);
      ownTimer = setTimeout(drawOwn, 250);
    });
    if ($('own-example')) {
      $('own-example').addEventListener('click', function () {
        state.facts = '6 x 4\n7 x 8\n12 - 5\n9 + 6\n56 / 8';
        $('f-facts').value = state.facts;
        resetPreview(false);
        remember();
        drawOwn();
        $('f-facts').focus();
      });
    }
    $('f-title').addEventListener('input', function () { state.title = this.value.slice(0, 80); remember(); if (step === 3) makeSoon(400); });
    $('f-batch-names').addEventListener('input', function () { setText('batch-problem', ''); applySingleCodeName(); drawBatch(); });
    $('batch-make').addEventListener('click', saveBatchZip);
    if ($('batch-load') && $('batch-file')) {
      $('batch-load').addEventListener('click', function () { $('batch-file').value = ''; $('batch-file').click(); });
      $('batch-file').addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        loadRosterFile(file);
      });
    }
    if ($('print')) $('print').addEventListener('click', printPaper);
    if ($('download-worksheet')) $('download-worksheet').addEventListener('click', downloadWorksheet);
    if ($('download-docx')) $('download-docx').addEventListener('click', downloadDocx);
    if ($('download-bundle')) $('download-bundle').addEventListener('click', downloadBundle);
    if ($('math-preset-save')) $('math-preset-save').addEventListener('click', savePreset);
    if ($('math-preset-select')) $('math-preset-select').addEventListener('change', function () { applyPreset(this.value); });
    if ($('math-preset-delete')) $('math-preset-delete').addEventListener('click', deletePreset);
    $('save').addEventListener('click', saveFile);
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      resetPreview(true);
      state = defaults();
      $('f-facts').value = '';
      $('f-title').value = '';
      if ($('f-batch-names')) $('f-batch-names').value = '';
      show('rehearse-note', false);
      show('reopen-note', false);
      reopenPending = null;
      goTo(1, true);
      setText('forget-said', 'Done. The page is back to how it started.');
    });
  }

  function start() {
    loader = window.AlloWordSoundsTakeHome;
    builder = window.AlloPacketMathPractice;
    var missing = [];
    var adapters = loader && loader.CHECK_ADAPTERS;
    if (!loader || typeof loader.buildHtml !== 'function' || !adapters || !adapters.math_computation || !adapters.math_ccc || !adapters.math_rehearsal) missing.push('the part that writes the file');
    if (!builder || typeof builder.planMathPractice !== 'function' || typeof builder.lessonFromMathPractice !== 'function' || typeof builder.buildMathPracticePacket !== 'function'
      || !Array.isArray(builder.FAMILIES) || !builder.FAMILIES.length) missing.push('the part that makes math fact practice');
    if (missing.length) {
      show('loading', false);
      setText('load-problem-text', 'Missing: ' + listed(missing) + '. Check the connection, then load the page again. Nothing has been lost.');
      show('load-problem', true);
      return;
    }
    state = recall();
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_work) setText('csv-label', loader.DEFAULT_LABELS.save_work);
    // "Open a file I made" and one file for each student are extras: without their scripts the page works as before.
    var kit = window.AlloPacketReopen;
    reopenKit = kit && typeof kit.readMath === 'function' && window.AlloPacketVerify && typeof window.AlloPacketVerify.readParts === 'function' && typeof FileReader === 'function' ? kit : null;
    wire();
    renderPresets('');
    if (reopenKit) wireReopen();
    show('reopen', !!reopenKit);
    show('batch', !!(window.AlloPacketZip && typeof builder.withCodeName === 'function'));
    show('loading', false);
    goTo(1, true);
    if (!applyRehearseHash()) takeHanded();
    window.addEventListener('pagehide', function () {
      if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
      stopPreview();
    });
  }

  try { start(); } catch (error) {
    show('loading', false);
    setText('load-problem-text', 'The page stopped while starting (' + said(error) + '). Load the page again. Nothing has been lost.');
    show('load-problem', true);
  }
})();
