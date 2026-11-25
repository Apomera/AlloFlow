// Educator, SLP, and family maker for packets-aac.html (Offline AAC Communication Boards).
// Browser-local, deterministic, zero DOM markup from strings, zero network requests.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-aac:v1';
  var loader = window.AlloWordSoundsTakeHome;
  var aac = window.AlloPacketAac;
  var verify = window.AlloPacketVerify;
  var bilingual = window.AlloPacketStationBilingual;
  var qrCrypto = window.AlloPacketQrCrypto;
  var zipLib = window.AlloPacketZip;

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  };

  var state = null;
  var activeFolderIdx = 0;
  var activeTileIdx = 0;
  var currentStep = 1;
  var builtResult = null;
  var previewUrl = '';
  var previewSession = null;
  var batchNames = [];
  var nextIdSeq = 0;

  function stopPreview() {
    if (previewSession && typeof previewSession.stop === 'function') {
      try { previewSession.stop(); } catch (_) {}
    }
    previewSession = null;
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch (_) {}
      previewUrl = '';
    }
  }

  function announce(msg) {
    var live = $('live-status');
    if (live) live.textContent = msg || '';
  }

  function formatGlossaryText(map) {
    if (!map || typeof map !== 'object') return '';
    return Object.keys(map).map(function (term) {
      var row = map[term] || {};
      var pairs = Object.keys(row).map(function (code) { return code + ':' + row[code]; });
      return pairs.length ? (term + ' | ' + pairs.join(' | ')) : '';
    }).filter(Boolean).join('\n');
  }

  function parseGlossaryText(text) {
    var out = {};
    String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (line) {
      var parts = line.split('|').map(function (s) { return s.trim(); });
      var term = parts[0];
      if (!term) return;
      var entry = {};
      parts.slice(1).forEach(function (seg) {
        var c = seg.indexOf(':');
        if (c > 0) {
          var code = seg.slice(0, c).trim().toLowerCase();
          var val = seg.slice(c + 1).trim();
          if (code && val) entry[code] = val;
        }
      });
      if (Object.keys(entry).length) out[term] = entry;
    });
    return out;
  }

  function defaultState() {
    var first = aac.starterById('core_16_first_words');
    return {
      starterId: first.id,
      title: first.title,
      gridLayout: first.gridLayout,
      lang: first.lang || 'en',
      speakOnTap: true,
      defaultScanMode: 'auto',
      defaultScanMs: 1500,
      defaultRate: 1,
      folders: first.folders,
      images: {},
      audio: {},
      homeLanguages: first.defaultHomeLanguages || [],
      glossaryText: '',
      stationMode: false,
      qrPublicKey: '',
    };
  }

  function remember() {
    try {
      var light = Object.assign({}, state, { images: {}, audio: {} });
      localStorage.setItem(STORE_KEY, JSON.stringify(light));
    } catch (_) {}
  }

  function recall() {
    var base = defaultState();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw, function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
      if (!parsed || typeof parsed !== 'object') return base;
      var folders = aac.normalizeFolders(parsed.folders);
      return Object.assign(base, parsed, {
        folders: folders.length ? folders : base.folders,
        images: {},
        audio: {},
        homeLanguages: Array.isArray(parsed.homeLanguages) ? parsed.homeLanguages : [],
      });
    } catch (_) {
      return base;
    }
  }

  function applyStarter(starter) {
    if (!starter) return;
    state.starterId = starter.id;
    state.title = starter.title;
    state.gridLayout = starter.gridLayout;
    state.lang = starter.lang || 'en';
    state.folders = aac.normalizeFolders(starter.folders);
    state.images = {};
    state.audio = {};
    state.homeLanguages = Array.isArray(starter.defaultHomeLanguages) ? starter.defaultHomeLanguages.slice() : [];
    activeFolderIdx = 0;
    activeTileIdx = 0;
    remember();
  }

  function currentFolder() {
    if (!state.folders.length) {
      state.folders = [{ id: 'core', name: 'Core Words', kind: 'core', lang: state.lang || 'en', tiles: [{ id: 'c1', label: 'help', speak: 'help', category: 'verb', symbol: '' }] }];
    }
    activeFolderIdx = Math.max(0, Math.min(state.folders.length - 1, activeFolderIdx));
    return state.folders[activeFolderIdx];
  }

  function currentTile() {
    var f = currentFolder();
    if (!f.tiles.length) return null;
    activeTileIdx = Math.max(0, Math.min(f.tiles.length - 1, activeTileIdx));
    return f.tiles[activeTileIdx];
  }

  function drawStarters() {
    var host = $('starter-list');
    if (!host) return;
    host.textContent = '';
    aac.starters().forEach(function (st) {
      var btn = el('button', 'template-card');
      btn.type = 'button';
      btn.setAttribute('data-starter-id', st.id);
      btn.setAttribute('aria-pressed', state.starterId === st.id ? 'true' : 'false');
      var meta = el('span', 'template-meta');
      meta.appendChild(el('span', 'template-tag', st.gridLayout));
      meta.appendChild(el('span', 'template-tag', st.audience));
      btn.appendChild(meta);
      btn.appendChild(el('span', 'template-name', st.name));
      btn.appendChild(el('span', 'template-summary', st.summary));
      btn.addEventListener('click', function () {
        applyStarter(st);
        syncStep1();
        drawStarters();
        announce('Loaded starter board: ' + st.name);
      });
      host.appendChild(btn);
    });
  }

  function syncStep1() {
    if ($('f-grid-layout')) $('f-grid-layout').value = state.gridLayout || '4x4';
    if ($('f-board-lang')) $('f-board-lang').value = state.lang || 'en';
    if ($('f-default-rate')) $('f-default-rate').value = String(state.defaultRate || 1);
    if ($('f-scan-mode')) $('f-scan-mode').value = state.defaultScanMode === 'two_switch' ? 'two_switch' : 'auto';
    if ($('f-scan-ms')) $('f-scan-ms').value = String(state.defaultScanMs || 1500);
    if ($('f-speak-tap')) $('f-speak-tap').checked = state.speakOnTap !== false;
  }

  function drawBilingualPills() {
    var host = $('bilingual-langs');
    if (!host) return;
    host.textContent = '';
    var codes = bilingual && Array.isArray(bilingual.SUPPORTED_LANGUAGES)
      ? bilingual.SUPPORTED_LANGUAGES
      : ['es', 'pt', 'fr', 'ar', 'vi', 'zh'];
    var map = (bilingual && bilingual.LANGUAGES) || {};
    codes.forEach(function (code) {
      var info = map[code] || { code: code, name: code.toUpperCase(), nativeName: '' };
      var lbl = el('label', 'pill');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = code;
      cb.setAttribute('data-lang-code', code);
      cb.checked = state.homeLanguages.indexOf(code) >= 0;
      cb.addEventListener('change', function () {
        if (cb.checked) {
          if (state.homeLanguages.indexOf(code) < 0) state.homeLanguages.push(code);
        } else {
          state.homeLanguages = state.homeLanguages.filter(function (c) { return c !== code; });
        }
        remember();
        updateSupportsNow();
      });
      lbl.appendChild(cb);
      lbl.appendChild(el('span', '', info.name + (info.nativeName ? ' (' + info.nativeName + ')' : '')));
      host.appendChild(lbl);
    });
    updateSupportsNow();
  }

  function updateSupportsNow() {
    var parts = [];
    if (state.homeLanguages.length) parts.push('Languages: ' + state.homeLanguages.join(', ').toUpperCase());
    if (state.stationMode) parts.push('Station Mode');
    if (String(state.qrPublicKey || '').trim()) parts.push('Sealed QR');
    if ($('supports-now')) $('supports-now').textContent = parts.length ? parts.join(' + ') : 'English only';
  }

  function drawFolderEditor() {
    var bar = $('folder-bar');
    if (!bar) return;
    bar.textContent = '';
    var folder = currentFolder();
    state.folders.forEach(function (f, fi) {
      var b = el('button', 'btn btn-small', f.name + ' (' + f.tiles.length + ')');
      b.type = 'button';
      b.setAttribute('data-folder-idx', String(fi));
      b.setAttribute('aria-pressed', fi === activeFolderIdx ? 'true' : 'false');
      b.addEventListener('click', function () {
        activeFolderIdx = fi;
        activeTileIdx = 0;
        drawFolderEditor();
      });
      bar.appendChild(b);
    });

    if ($('f-folder-name')) $('f-folder-name').value = folder.name;
    if ($('f-folder-kind')) $('f-folder-kind').value = folder.kind === 'core' ? 'core' : 'fringe';
    if ($('remove-folder')) $('remove-folder').disabled = state.folders.length <= 1;

    drawTileList();
    drawSelectedTileEditor();
    if ($('f-bulk-tiles')) $('f-bulk-tiles').value = aac.formatTilesText(folder.tiles);
    if ($('bulk-count')) $('bulk-count').textContent = folder.tiles.length + (folder.tiles.length === 1 ? ' button' : ' buttons');
  }

  function drawTileList() {
    var host = $('tile-list');
    if (!host) return;
    host.textContent = '';
    var folder = currentFolder();
    folder.tiles.forEach(function (t, ti) {
      var cat = String(t.category || 'noun').replace(/[^a-z]/g, '') || 'noun';
      var btn = el('button', 'maker-tile-btn maker-cat-' + cat);
      btn.type = 'button';
      btn.setAttribute('data-edit-tile', String(ti));
      btn.setAttribute('data-cat', cat);
      btn.setAttribute('aria-pressed', ti === activeTileIdx ? 'true' : 'false');
      var imgUri = t.imageId && state.images[t.imageId];
      if (imgUri) {
        var img = document.createElement('img');
        img.className = 'maker-tile-img';
        img.src = imgUri;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        btn.appendChild(img);
      } else if (t.symbol) {
        var sym = el('span', 'maker-tile-sym', t.symbol);
        sym.setAttribute('aria-hidden', 'true');
        btn.appendChild(sym);
      }
      btn.appendChild(el('span', 'maker-tile-lbl', t.label));
      var metaText = t.category + (t.audioId && state.audio[t.audioId] ? ' | clip' : '');
      btn.appendChild(el('span', 'maker-tile-meta', metaText));
      btn.addEventListener('click', function () {
        activeTileIdx = ti;
        drawTileList();
        drawSelectedTileEditor();
      });
      host.appendChild(btn);
    });
  }

  function drawSelectedTileEditor() {
    var box = $('tile-editor');
    if (!box) return;
    var folder = currentFolder();
    var tile = currentTile();
    if (!tile) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    if ($('tile-editor-heading')) $('tile-editor-heading').textContent = 'Edit button ' + (activeTileIdx + 1) + ' of ' + folder.tiles.length;
    if ($('t-label')) $('t-label').value = tile.label || '';
    if ($('t-speak')) $('t-speak').value = tile.speak || tile.label || '';
    if ($('t-cat')) $('t-cat').value = tile.category || 'noun';
    if ($('t-symbol')) $('t-symbol').value = tile.symbol || '';
    if ($('t-lang')) $('t-lang').value = tile.lang || '';

    var hasImg = !!(tile.imageId && state.images[tile.imageId]);
    if ($('t-img-status')) $('t-img-status').textContent = hasImg ? 'Picture attached on this device.' : 'No picture uploaded (uses symbol or text).';
    if ($('t-img-clear')) $('t-img-clear').hidden = !hasImg;
    if ($('t-img-file')) $('t-img-file').value = '';

    var hasAud = !!(tile.audioId && state.audio[tile.audioId]);
    if ($('t-audio-status')) $('t-audio-status').textContent = hasAud ? 'Voice clip attached on this device.' : 'No clip uploaded (uses local device voice).';
    if ($('t-audio-clear')) $('t-audio-clear').hidden = !hasAud;
    if ($('t-audio-file')) $('t-audio-file').value = '';

    if ($('t-move-up')) $('t-move-up').disabled = activeTileIdx <= 0;
    if ($('t-move-down')) $('t-move-down').disabled = activeTileIdx >= folder.tiles.length - 1;
    if ($('t-delete')) $('t-delete').disabled = folder.tiles.length <= 1;
  }

  function syncStep2() {
    drawFolderEditor();
    drawBilingualPills();
    if ($('f-glossary')) $('f-glossary').value = state.glossaryText || '';
    if ($('f-station-mode')) $('f-station-mode').checked = !!state.stationMode;
    if ($('f-qr-key')) $('f-qr-key').value = state.qrPublicKey || '';
    var ho = window.AlloPacketHandoff;
    if ($('f-qr-key') && ho && typeof ho.mountQrKeyHelper === 'function') ho.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto || qrCrypto });
    updateSupportsNow();
  }

  function validateStep2() {
    var normalized = aac.normalizeFolders(state.folders);
    if (!normalized.length) return 'Add at least 1 folder with at least 1 word button.';
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && qrCrypto && !qrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key must start with AFPK1.';
    }
    return '';
  }

  function renderPrintableBackup() {
    var sheet = $('print-board-sheet');
    var host = $('print-board-preview');
    if (!sheet || !host) return;
    host.textContent = '';
    var cols = Number(String(state.gridLayout || '4x4').split('x')[0]) || 4;
    if (cols < 2 || cols > 6) cols = 4;
    var folders = aac.normalizeFolders(state.folders);
    folders.forEach(function (f) {
      var wrap = el('div', 'print-folder');
      wrap.appendChild(el('h4', '', (state.title || 'AAC Board') + ' — ' + f.name));
      var grid = el('div', 'print-grid print-cols-' + cols);
      f.tiles.forEach(function (t) {
        var cell = el('div', 'print-cell print-cat-' + (t.category || 'noun'));
        var imgUri = t.imageId && state.images[t.imageId];
        if (imgUri) {
          var img = document.createElement('img');
          img.className = 'print-cell-img';
          img.src = imgUri;
          img.alt = '';
          img.setAttribute('aria-hidden', 'true');
          cell.appendChild(img);
        } else if (t.symbol) {
          var sym = el('span', 'print-cell-sym', t.symbol);
          sym.setAttribute('aria-hidden', 'true');
          cell.appendChild(sym);
        }
        cell.appendChild(el('span', 'print-cell-lbl', t.label));
        cell.appendChild(el('span', 'print-cell-role', t.category));
        grid.appendChild(cell);
      });
      wrap.appendChild(grid);
      host.appendChild(wrap);
    });
    sheet.hidden = folders.length === 0;
  }

  var lazyScriptPromises = Object.create(null);
  function loadLocalScript(file, attr, isReady) {
    if (isReady()) return Promise.resolve(true);
    if (lazyScriptPromises[file]) return lazyScriptPromises[file];
    if (!document || typeof document.createElement !== 'function') return Promise.resolve(false);
    lazyScriptPromises[file] = new Promise(function (resolve) {
      var settled = false;
      var finish = function () {
        if (settled) return;
        settled = true;
        var ok = !!isReady();
        if (!ok) delete lazyScriptPromises[file];
        resolve(ok);
      };
      try {
        var existing = document.querySelector && document.querySelector('script[' + attr + '="1"]');
        if (existing) {
          existing.addEventListener('load', finish);
          existing.addEventListener('error', finish);
          if (typeof window.setTimeout === 'function') window.setTimeout(finish, 4000);
          return;
        }
        var sc = document.createElement('script');
        sc.setAttribute('src', file);
        sc.async = true;
        sc.setAttribute(attr, '1');
        sc.onload = finish;
        sc.onerror = finish;
        (document.head || document.documentElement || document.body).appendChild(sc);
      } catch (_) {
        delete lazyScriptPromises[file];
        resolve(false);
      }
    });
    return lazyScriptPromises[file];
  }

  function ensureDocxTools() {
    var hasZip = function () {
      return !!(window.AlloPacketZip && typeof window.AlloPacketZip.create === 'function');
    };
    var hasDocx = function () {
      return !!(window.AlloPacketDocx
        && typeof window.AlloPacketDocx.buildAacBoardDocx === 'function'
        && typeof window.AlloPacketDocx.downloadDocx === 'function');
    };
    return loadLocalScript('packets_zip.js', 'data-allo-zip', hasZip).then(function (zipOk) {
      if (!zipOk) return null;
      return loadLocalScript('packets_docx.js', 'data-allo-docx', hasDocx).then(function (docxOk) {
        return docxOk ? window.AlloPacketDocx : null;
      });
    });
  }

  var SVG_XMLNS = 'http:' + '//www.w3.org/2000/svg';
  var AAC_ACCENT_HEX = {
    pronoun: '#9e6c00',
    verb: '#1c743a',
    noun: '#b85000',
    descriptor: '#1a5a9e',
    social: '#a82460',
    question: '#663a99',
  };
  var AAC_BG_HEX = {
    pronoun: '#fff9c4',
    verb: '#dcfce7',
    noun: '#ffedd5',
    descriptor: '#dbeafe',
    social: '#fce7f3',
    question: '#ede9fe',
  };

  function svgEsc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (ch) {
      if (ch === '&') return '&amp;';
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      if (ch === '"') return '&quot;';
      return '&apos;';
    });
  }

  function makeAacSymbolSvgUri(tile) {
    var cat = String((tile && tile.category) || 'noun').toLowerCase();
    var stroke = AAC_ACCENT_HEX[cat] || '#334155';
    var fill = AAC_BG_HEX[cat] || '#f8fafc';
    var glyph = String((tile && tile.symbol) || '').trim();
    if (!glyph) {
      var lbl = String((tile && tile.label) || '?').trim();
      glyph = lbl.slice(0, 2).toUpperCase();
    }
    var fontSize = glyph.length > 2 ? 42 : 66;
    var markup = '<svg xmlns="' + SVG_XMLNS + '" width="180" height="180" viewBox="0 0 180 180">'
      + '<rect x="10" y="10" width="160" height="160" rx="28" fill="' + fill + '" stroke="' + stroke + '" stroke-width="8"/>'
      + '<text x="90" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="' + fontSize + '" font-weight="700" fill="#111827">'
      + svgEsc(glyph)
      + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  }

  function buildAacDocxModel() {
    var folders = aac.normalizeFolders(state.folders);
    if (!folders.length) return null;
    var folder = folders[Math.max(0, Math.min(folders.length - 1, activeFolderIdx))] || folders[0];
    var gridParts = String(state.gridLayout || '4x4').split('x');
    var cols = Math.max(2, Math.min(6, Number(gridParts[0]) || 4));
    var rows = Math.max(2, Math.min(6, Number(gridParts[1]) || 4));
    var cells = (Array.isArray(folder.tiles) ? folder.tiles : []).map(function (t) {
      var uploaded = t.imageId && state.images[t.imageId] ? String(state.images[t.imageId]) : '';
      var imgUri = uploaded || makeAacSymbolSvgUri(t);
      return {
        label: t.label || '',
        category: t.category || 'noun',
        core: folder.kind === 'core',
        picture: imgUri,
        imgUri: imgUri,
      };
    });
    if (!cells.length) return null;
    return {
      title: state.title || 'AAC Communication Board',
      subtitle: folder.name + ' (' + (state.gridLayout || '4x4') + ' Fitzgerald-key layout)',
      columns: cols,
      rows: Math.max(rows, Math.ceil(cells.length / cols)),
      colorMode: 'fitzgerald',
      includeSentenceStrip: true,
      cells: cells,
    };
  }

  function downloadAacDocx() {
    if (!builtResult) buildPacket();
    var boardModel = buildAacDocxModel();
    if (!boardModel) {
      announce('Build a communication board with at least one button first.');
      return Promise.resolve(false);
    }
    var btn = $('download-docx');
    if (btn) btn.disabled = true;
    announce('Preparing Word communication board (.docx)...');
    return ensureDocxTools().then(function (docxLib) {
      if (!docxLib || !window.AlloPacketZip) {
        announce('Could not load the Word board builder. Load the page again.');
        return false;
      }
      var prep = typeof docxLib.prepareImagesAsync === 'function'
        ? docxLib.prepareImagesAsync(boardModel, window, document)
        : Promise.resolve(boardModel);
      return Promise.resolve(prep).then(function (readyModel) {
        var res = docxLib.buildAacBoardDocx(readyModel || boardModel, { zip: window.AlloPacketZip });
        if (docxLib.downloadDocx(res, window, document)) {
          announce('Downloaded ' + res.filename + '.');
          return true;
        }
        announce('This browser could not save the Word file.');
        return false;
      });
    }, function () {
      announce('Could not create the Word communication board.');
      return false;
    }).then(function (ok) {
      if (btn) btn.disabled = false;
      return ok;
    });
  }

  function buildPacket() {
    var prob = $('build-problem');
    var sum = $('summary');
    var making = $('making');
    if (prob) prob.hidden = true;
    if (sum) sum.hidden = true;
    if ($('download-docx')) $('download-docx').hidden = true;
    if (making) {
      making.hidden = false;
      $('making-line').textContent = 'Assembling your offline communication board file...';
    }
    try {
      var gloss = parseGlossaryText(state.glossaryText);
      var singleName = batchNames.length === 1 ? batchNames[0] : '';
      builtResult = aac.buildAacPacket({
        title: state.title || 'AAC Communication Board',
        starterId: state.starterId,
        gridLayout: state.gridLayout,
        lang: state.lang || 'en',
        speakOnTap: state.speakOnTap !== false,
        defaultScanMode: state.defaultScanMode,
        defaultScanMs: state.defaultScanMs,
        defaultRate: state.defaultRate,
        folders: state.folders,
        images: state.images,
        audio: state.audio,
        homeLanguages: state.homeLanguages.length ? state.homeLanguages.slice() : undefined,
        bilingualGlossary: Object.keys(gloss).length ? gloss : undefined,
        stationMode: !!state.stationMode,
        qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
        learner: singleName || undefined,
        loader: loader,
        qrCrypto: qrCrypto,
        stationBilingual: bilingual,
      });

      if (making) making.hidden = true;
      var report = verify && typeof verify.verifyPacket === 'function' ? verify.verifyPacket(builtResult.html) : null;
      var kb = Math.max(1, Math.round(builtResult.html.length / 1024));
      var facts = builtResult.stats.folders + (builtResult.stats.folders === 1 ? ' folder, ' : ' folders, ')
        + builtResult.stats.tiles + (builtResult.stats.tiles === 1 ? ' button' : ' buttons')
        + ' (' + state.gridLayout + ' grid, ' + kb + ' KB). '
        + (report && report.result === 'closed' ? 'Verified offline: 0 network connections.' : 'Ready to save.');
      if ($('summary-facts')) $('summary-facts').textContent = facts;
      if (sum) sum.hidden = false;

      if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch (_) {} previewUrl = ''; }
      if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        previewUrl = URL.createObjectURL(new Blob([builtResult.html], { type: 'text/html;charset=utf-8' }));
        var tryLink = $('try');
        if (tryLink) {
          tryLink.href = 'packets-try.html#' + previewUrl;
          tryLink.hidden = false;
        }
        var ho = window.AlloPacketHandoff;
        if (ho && typeof ho.hostPreview === 'function') {
          if (previewSession && typeof previewSession.update === 'function') {
            previewSession.update({ url: previewUrl, html: builtResult.html });
          } else {
            previewSession = ho.hostPreview({ url: previewUrl, html: builtResult.html });
          }
        }
      }
      if ($('save')) $('save').hidden = false;
      if ($('print-board')) $('print-board').hidden = false;
      if ($('download-docx')) $('download-docx').hidden = false;

      renderSummaryRows();
      renderPrintableBackup();
      if ($('making-said')) $('making-said').textContent = 'The communication board file is ready.';
    } catch (err) {
      if (making) making.hidden = true;
      if (prob) prob.hidden = false;
      if ($('build-problem-text')) $('build-problem-text').textContent = (err && err.message) || 'Could not assemble the communication board file.';
    }
  }

  function renderSummaryRows() {
    var dl = $('summary-rows');
    if (!dl || !builtResult) return;
    dl.textContent = '';
    var rows = [
      ['Board title', state.title || 'AAC Communication Board'],
      ['Grid layout', state.gridLayout + ' Fitzgerald-key layout'],
      ['Folders', state.folders.map(function (f) { return f.name + ' (' + f.tiles.length + ')'; }).join(', ')],
      ['Speech output', 'Local device voice (on-device only)' + (builtResult.stats.audioClips ? ' + ' + builtResult.stats.audioClips + ' uploaded audio clips' : '')],
      ['Switch scanning', state.defaultScanMode === 'two_switch' ? 'Two-switch step-scan (plus 1-switch auto-scan)' : 'Auto-scan row-column (' + (state.defaultScanMs / 1000) + ' s pace, plus 2-switch mode)'],
      ['Family directions', state.homeLanguages.length ? 'English + ' + state.homeLanguages.join(', ').toUpperCase() : 'English'],
      ['Carryover logging', 'Optional non-scored tap count summary (CSV, JSON' + (String(state.qrPublicKey || '').trim() ? ', Sealed QR' : '') + ')'],
    ];
    rows.forEach(function (pair) {
      dl.appendChild(el('dt', '', pair[0]));
      dl.appendChild(el('dd', '', pair[1]));
    });
  }

  function fileStem(title, learner) {
    var base = String(title || 'aac-board').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'aac-board';
    var who = String(learner || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    return who ? (base + '__' + who) : base;
  }

  function triggerDownload(name, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
  }

  function parseBatchNames(raw) {
    var seen = Object.create(null);
    return String(raw || '').split(/\r?\n/).map(function (s) { return s.trim().slice(0, 60); }).filter(function (s) {
      if (!s) return false;
      var k = s.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    }).slice(0, 40);
  }

  function updateBatchUi() {
    var ta = $('f-batch-names');
    if (!ta) return;
    batchNames = parseBatchNames(ta.value);
    var said = $('batch-said');
    var btn = $('batch-make');
    if (batchNames.length === 0) {
      if (said) said.textContent = '';
      if (btn) btn.hidden = true;
    } else if (batchNames.length === 1) {
      if (said) said.textContent = '1 code name (' + batchNames[0] + ') will be placed inside the saved board file.';
      if (btn) btn.hidden = true;
    } else {
      if (said) said.textContent = batchNames.length + ' learner board files ready to package in one .zip.';
      if (btn) btn.hidden = false;
    }
    if (currentStep === 3 && builtResult) buildPacket();
  }

  function goStep(step, focusHeading) {
    if (step > 2) {
      var err2 = validateStep2();
      if (err2) {
        if ($('step-2-problem')) $('step-2-problem').textContent = err2;
        step = 2;
      } else if ($('step-2-problem')) {
        $('step-2-problem').textContent = '';
      }
    }
    currentStep = step;
    [1, 2, 3].forEach(function (n) {
      var sec = $('step-' + n);
      if (sec) sec.hidden = n !== step;
      var tab = document.querySelector('.step-tab[data-go="' + n + '"]');
      if (tab) {
        if (n === step) tab.setAttribute('aria-current', 'step');
        else tab.removeAttribute('aria-current');
      }
    });
    if (step === 1) { syncStep1(); drawStarters(); }
    if (step === 2) syncStep2();
    if (step === 3) {
      if ($('f-title')) $('f-title').value = state.title || 'AAC Communication Board';
      buildPacket();
    }
    if (focusHeading) {
      var h = $('step-' + step + '-title');
      if (h && typeof h.focus === 'function') h.focus();
    }
  }

  var reopenPending = null;

  function decodeBytes(bytes) {
    if (typeof bytes === 'string') return bytes;
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (typeof TextDecoder === 'function') return new TextDecoder('utf-8').decode(u8);
    var out = '';
    for (var i = 0; i < u8.length; i++) out += String.fromCharCode(u8[i]);
    return out;
  }

  function toArrayBuffer(bytes, fallbackText) {
    if (bytes instanceof ArrayBuffer) return bytes;
    if (bytes instanceof Uint8Array) return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(String(fallbackText || '')).buffer;
    return null;
  }

  function handleReopenText(text, fileName, rawBytes) {
    var verifyCore = window.AlloPacketVerify || verify;
    var res = aac.readAacPacket(text, verifyCore);
    var note = $('reopen-note');
    var line = $('reopen-line');
    var list = $('reopen-list');
    var link = $('reopen-page');
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(rawBytes || text, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-aac.html') ? owner : null;
      var buf = targetPage ? toArrayBuffer(rawBytes, text) : null;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && buf) {
        reopenPending = {
          file: { name: String(fileName || 'packet.html').slice(0, 120), bytes: buf },
          href: targetPage.href,
          hash: targetPage.hash || (targetPage.href === 'packets-results.html' ? ((handoff && handoff.RESULTS_HASH) || '#import-results') : ((handoff && handoff.HASH) || '#open-file')),
        };
      } else {
        reopenPending = null;
      }
      if (line) line.textContent = res.error || 'Could not open that file as an AAC communication board.';
      if (list) list.textContent = '';
      if (link) {
        if (targetPage && targetPage.href) {
          link.href = targetPage.href;
          link.textContent = 'Open ' + (targetPage.name || 'that page');
          link.hidden = false;
        } else {
          link.hidden = true;
        }
      }
      if (note) { note.hidden = false; note.focus(); }
      return;
    }
    reopenPending = null;
    if (link) link.hidden = true;
    state = {
      starterId: res.starterId || '',
      title: res.title,
      gridLayout: res.gridLayout,
      lang: res.lang,
      speakOnTap: res.speakOnTap,
      defaultScanMode: res.defaultScanMode,
      defaultScanMs: res.defaultScanMs,
      defaultRate: res.defaultRate,
      folders: res.folders,
      images: res.images || {},
      audio: res.audio || {},
      homeLanguages: res.homeLanguages || [],
      glossaryText: formatGlossaryText(res.bilingualGlossary),
      stationMode: !!res.stationMode,
      qrPublicKey: res.qrPublicKey || '',
    };
    activeFolderIdx = 0;
    activeTileIdx = 0;
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    batchNames = parseBatchNames(res.learner || '');
    remember();
    if (line) line.textContent = 'Loaded "' + state.title + '" (' + state.folders.length + ' folders, ' + state.gridLayout + ' grid).';
    if (list) {
      list.textContent = '';
      state.folders.forEach(function (f) {
        list.appendChild(el('li', '', f.name + ': ' + f.tiles.length + ' buttons'));
      });
    }
    if (note) note.hidden = false;
    goStep(2, false);
    announce('Loaded existing AAC board file: ' + state.title);
  }

  function handleReopenFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      handleReopenText(String(reader.result || ''), file.name, null);
    };
    reader.readAsText(file);
  }

  function checkHandoff() {
    var handoff = window.AlloPacketHandoff;
    if (!handoff || typeof handoff.take !== 'function') return;
    var h = window.location ? window.location.hash : '';
    if (h !== (handoff.HASH || '#open-file')) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (file && file.bytes) handleReopenText(decodeBytes(file.bytes), file.name, file.bytes);
    }, function () {});
  }

  function bindMediaUpload(inputId, kind, maxBytes) {
    var inp = $(inputId);
    if (!inp) return;
    inp.addEventListener('change', function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      var statusEl = $(kind === 'image' ? 't-img-status' : 't-audio-status');
      if (file.size > maxBytes) {
        if (statusEl) statusEl.textContent = 'File is too large. Choose a file under ' + Math.round(maxBytes / 1024) + ' KB.';
        inp.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var uri = aac.validateMediaDataUri(String(reader.result || ''), kind);
        if (!uri) {
          if (statusEl) statusEl.textContent = 'Unsupported file type for ' + kind + '.';
          return;
        }
        var tile = currentTile();
        if (!tile) return;
        var key = kind + '_' + tile.id + '_' + (++nextIdSeq) + '_' + Date.now().toString(36);
        if (kind === 'image') {
          state.images[key] = uri;
          tile.imageId = key;
        } else {
          state.audio[key] = uri;
          tile.audioId = key;
        }
        drawTileList();
        drawSelectedTileEditor();
        announce('Attached ' + kind + ' to ' + tile.label + '.');
      };
      reader.readAsDataURL(file);
    });
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    if (!loader || !aac) {
      if ($('loading')) $('loading').hidden = true;
      if ($('load-problem')) $('load-problem').hidden = false;
      return;
    }

    state = recall();
    if ($('loading')) $('loading').hidden = true;
    if ($('reopen')) $('reopen').hidden = false;

    // Step tabs
    document.querySelectorAll('.step-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { goStep(Number(tab.getAttribute('data-go')) || 1, true); });
    });

    // Step 1 controls
    if ($('f-grid-layout')) $('f-grid-layout').addEventListener('change', function () { state.gridLayout = $('f-grid-layout').value; remember(); });
    if ($('f-board-lang')) $('f-board-lang').addEventListener('change', function () { state.lang = $('f-board-lang').value; remember(); });
    if ($('f-default-rate')) $('f-default-rate').addEventListener('change', function () { state.defaultRate = Number($('f-default-rate').value) || 1; remember(); });
    if ($('f-scan-mode')) $('f-scan-mode').addEventListener('change', function () { state.defaultScanMode = $('f-scan-mode').value; remember(); });
    if ($('f-scan-ms')) $('f-scan-ms').addEventListener('change', function () { state.defaultScanMs = Number($('f-scan-ms').value) || 1500; remember(); });
    if ($('f-speak-tap')) $('f-speak-tap').addEventListener('change', function () { state.speakOnTap = $('f-speak-tap').checked; remember(); });
    if ($('next-1')) $('next-1').addEventListener('click', function () { goStep(2, true); });

    // Step 2 folder controls
    if ($('f-folder-name')) $('f-folder-name').addEventListener('input', function () {
      currentFolder().name = $('f-folder-name').value.trim().slice(0, 40) || 'Folder';
      remember();
      var tabBtn = document.querySelector('[data-folder-idx="' + activeFolderIdx + '"]');
      if (tabBtn) tabBtn.textContent = currentFolder().name + ' (' + currentFolder().tiles.length + ')';
    });
    if ($('f-folder-kind')) $('f-folder-kind').addEventListener('change', function () {
      currentFolder().kind = $('f-folder-kind').value === 'core' ? 'core' : 'fringe';
      remember();
    });
    if ($('add-folder')) $('add-folder').addEventListener('click', function () {
      if (state.folders.length >= 8) return;
      var n = state.folders.length + 1;
      state.folders.push({
        id: 'folder-' + n,
        name: 'Topic ' + n,
        kind: 'fringe',
        lang: state.lang || 'en',
        tiles: [{ id: 'f' + n + '-1', label: 'hello', speak: 'hello', category: 'social', symbol: '' }],
      });
      activeFolderIdx = state.folders.length - 1;
      activeTileIdx = 0;
      remember();
      drawFolderEditor();
    });
    if ($('remove-folder')) $('remove-folder').addEventListener('click', function () {
      if (state.folders.length <= 1) return;
      state.folders.splice(activeFolderIdx, 1);
      activeFolderIdx = Math.max(0, activeFolderIdx - 1);
      activeTileIdx = 0;
      remember();
      drawFolderEditor();
    });

    // Step 2 tile controls
    if ($('add-tile')) $('add-tile').addEventListener('click', function () {
      var f = currentFolder();
      if (f.tiles.length >= 48) return;
      f.tiles.push({
        id: f.id + '-' + (++nextIdSeq) + '-' + Date.now().toString(36),
        label: 'new word',
        speak: 'new word',
        category: 'noun',
        symbol: '',
        lang: f.lang || '',
      });
      activeTileIdx = f.tiles.length - 1;
      remember();
      drawFolderEditor();
      if ($('t-label')) $('t-label').focus();
    });

    var syncTileField = function (field, inputId, maxLen) {
      var inp = $(inputId);
      if (!inp) return;
      var evName = inp.tagName === 'SELECT' ? 'change' : 'input';
      inp.addEventListener(evName, function () {
        var t = currentTile();
        if (!t) return;
        var prevLabel = t.label;
        var val = String(inp.value || '').slice(0, maxLen || 120);
        t[field] = val;
        if (field === 'label' && (!t.speak || t.speak === prevLabel)) {
          t.speak = val;
          if ($('t-speak')) $('t-speak').value = val;
        }
        remember();
        drawTileList();
        if ($('f-bulk-tiles')) $('f-bulk-tiles').value = aac.formatTilesText(currentFolder().tiles);
      });
    };
    syncTileField('label', 't-label', 40);
    syncTileField('speak', 't-speak', 120);
    syncTileField('category', 't-cat', 20);
    syncTileField('symbol', 't-symbol', 12);
    syncTileField('lang', 't-lang', 12);

    bindMediaUpload('t-img-file', 'image', 400 * 1024);
    bindMediaUpload('t-audio-file', 'audio', 1024 * 1024);
    if ($('t-img-pick') && $('t-img-file')) $('t-img-pick').addEventListener('click', function () { $('t-img-file').click(); });
    if ($('t-audio-pick') && $('t-audio-file')) $('t-audio-pick').addEventListener('click', function () { $('t-audio-file').click(); });

    if ($('t-img-clear')) $('t-img-clear').addEventListener('click', function () {
      var t = currentTile();
      if (!t || !t.imageId) return;
      delete state.images[t.imageId];
      delete t.imageId;
      drawTileList();
      drawSelectedTileEditor();
    });
    if ($('t-audio-clear')) $('t-audio-clear').addEventListener('click', function () {
      var t = currentTile();
      if (!t || !t.audioId) return;
      delete state.audio[t.audioId];
      delete t.audioId;
      drawTileList();
      drawSelectedTileEditor();
    });

    if ($('t-move-up')) $('t-move-up').addEventListener('click', function () {
      var f = currentFolder();
      if (activeTileIdx <= 0) return;
      var tmp = f.tiles[activeTileIdx - 1];
      f.tiles[activeTileIdx - 1] = f.tiles[activeTileIdx];
      f.tiles[activeTileIdx] = tmp;
      activeTileIdx--;
      remember();
      drawFolderEditor();
    });
    if ($('t-move-down')) $('t-move-down').addEventListener('click', function () {
      var f = currentFolder();
      if (activeTileIdx >= f.tiles.length - 1) return;
      var tmp = f.tiles[activeTileIdx + 1];
      f.tiles[activeTileIdx + 1] = f.tiles[activeTileIdx];
      f.tiles[activeTileIdx] = tmp;
      activeTileIdx++;
      remember();
      drawFolderEditor();
    });
    if ($('t-delete')) $('t-delete').addEventListener('click', function () {
      var f = currentFolder();
      if (f.tiles.length <= 1) return;
      var removed = f.tiles.splice(activeTileIdx, 1)[0];
      if (removed && removed.imageId) delete state.images[removed.imageId];
      if (removed && removed.audioId) delete state.audio[removed.audioId];
      activeTileIdx = Math.max(0, activeTileIdx - 1);
      remember();
      drawFolderEditor();
    });

    if ($('apply-bulk')) $('apply-bulk').addEventListener('click', function () {
      var f = currentFolder();
      var parsed = aac.parseTilesText($('f-bulk-tiles').value, f.id, f.tiles);
      if (!parsed.length) {
        if ($('step-2-problem')) $('step-2-problem').textContent = 'Enter at least 1 valid button line (Label | role | Spoken phrase).';
        return;
      }
      if ($('step-2-problem')) $('step-2-problem').textContent = '';
      f.tiles = parsed;
      activeTileIdx = 0;
      remember();
      drawFolderEditor();
      announce('Updated ' + f.name + ' with ' + parsed.length + ' buttons.');
    });

    if ($('f-glossary')) $('f-glossary').addEventListener('input', function () { state.glossaryText = $('f-glossary').value; remember(); });
    if ($('f-station-mode')) $('f-station-mode').addEventListener('change', function () { state.stationMode = $('f-station-mode').checked; remember(); updateSupportsNow(); });
    if ($('f-qr-key')) $('f-qr-key').addEventListener('input', function () { state.qrPublicKey = $('f-qr-key').value.trim(); remember(); updateSupportsNow(); });

    if ($('back-2')) $('back-2').addEventListener('click', function () { goStep(1, true); });
    if ($('next-2')) $('next-2').addEventListener('click', function () { goStep(3, true); });

    // Step 3 controls
    if ($('back-3')) $('back-3').addEventListener('click', function () { goStep(2, true); });
    if ($('fix-choices')) $('fix-choices').addEventListener('click', function () { goStep(2, true); });
    if ($('retry')) $('retry').addEventListener('click', buildPacket);
    if ($('f-title')) $('f-title').addEventListener('input', function () {
      state.title = $('f-title').value.trim().slice(0, 80) || 'AAC Communication Board';
      remember();
      buildPacket();
    });
    if ($('print-board')) $('print-board').addEventListener('click', function () {
      try { window.print(); } catch (_) {}
    });
    if ($('download-docx')) $('download-docx').addEventListener('click', function () {
      downloadAacDocx();
    });
    if ($('save')) $('save').addEventListener('click', function () {
      if (!builtResult) return;
      var who = batchNames.length === 1 ? batchNames[0] : '';
      triggerDownload(fileStem(state.title, who) + '.html', builtResult.html, 'text/html;charset=utf-8');
      if ($('after-save')) { $('after-save').hidden = false; $('after-save').focus(); }
    });

    if ($('f-batch-names')) {
      $('f-batch-names').addEventListener('input', updateBatchUi);
      if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountBatchListHelper === 'function') {
        window.AlloPacketHandoff.mountBatchListHelper($('f-batch-names'), { maxNames: 40, announce: announce });
      }
    }
    if ($('batch-make')) $('batch-make').addEventListener('click', function () {
      if (!builtResult || batchNames.length < 2 || !zipLib || typeof zipLib.create !== 'function') return;
      try {
        var zip = zipLib.create();
        batchNames.forEach(function (name) {
          zip.add(fileStem(state.title, name) + '.html', aac.withCodeName(builtResult.html, name));
        });
        var parts = zip.finish();
        triggerDownload(fileStem(state.title, '') + '__boards.zip', new Blob(parts, { type: 'application/zip' }), 'application/zip');
        if ($('batch-problem')) $('batch-problem').textContent = '';
      } catch (err) {
        if ($('batch-problem')) $('batch-problem').textContent = (err && err.message) || 'Could not make the .zip file.';
      }
    });

    // Reopen file controls
    if ($('reopen-choose') && $('reopen-file')) {
      $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
      $('reopen-file').addEventListener('change', function () {
        if ($('reopen-file').files && $('reopen-file').files[0]) handleReopenFile($('reopen-file').files[0]);
      });
    }
    if ($('reopen-close') && $('reopen-note')) {
      $('reopen-close').addEventListener('click', function () { reopenPending = null; $('reopen-note').hidden = true; });
    }
    if ($('reopen-page')) {
      $('reopen-page').addEventListener('click', function (event) {
        var handoff = window.AlloPacketHandoff;
        if (!reopenPending || !handoff || typeof handoff.redirect !== 'function') return;
        event.preventDefault();
        var target = reopenPending;
        reopenPending = null;
        handoff.redirect(target.file, target.href, target.hash).catch(function () { window.location.href = target.href; });
      });
    }
    if ($('reopen')) {
      $('reopen').addEventListener('dragover', function (e) { e.preventDefault(); });
      $('reopen').addEventListener('drop', function (e) {
        e.preventDefault();
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleReopenFile(f);
      });
    }

    // Forget saved draft
    if ($('forget')) $('forget').addEventListener('click', function () {
      try { localStorage.removeItem(STORE_KEY); } catch (_) {}
      var ho = window.AlloPacketHandoff;
      if (ho && typeof ho.clearSavedQrPublicKey === 'function') ho.clearSavedQrPublicKey();
      stopPreview();
      state = defaultState();
      if ($('f-qr-key') && $('f-qr-key')._alloQrHelper) $('f-qr-key')._alloQrHelper.sync('');
      activeFolderIdx = 0;
      activeTileIdx = 0;
      goStep(1, false);
      if ($('forget-said')) $('forget-said').textContent = 'Saved choices removed from this browser.';
    });

    window.addEventListener('pagehide', stopPreview);
    goStep(1, false);
    checkHandoff();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
