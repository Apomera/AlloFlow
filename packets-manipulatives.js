// Educator maker controller for packets-manipulatives.html (Base-Ten Blocks, Fraction Bars, Interactive Number Line, Balance-Scale Equations).
// Everything runs in this browser tab. Zero network, zero cookies, zero markup strings.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-manipulatives/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;

  var FORMAT_HINTS = {
    manip_base_ten: 'One problem per line: TargetNumber | Prompt | value or exact | optional start=H,T,O | optional hint. Example: 34 | Build 34 with base-ten blocks. | value',
    manip_fraction_bars: 'One problem per line: equiv|exact|add, TargetFrac (e.g. 2/4), Prompt, optional refs (1/2 or 1/2+1/4), optional hint. Or: compare | 2/3 > 3/6 | Prompt | optional hint.',
    manip_number_line: 'One problem per line: Start | Target | Min..Max (or Min..Max/4 for fourths) | Prompt | optional hint. Example: 6 | 13 | 0..20 | Start at 6 and hop +7.',
    manip_balance_scale: 'One problem per line: Equation (ax + b = c) | Prompt | optional hint. Example: 2x + 2 = 10 | Solve 2x + 2 = 10 on the balance scale.',
  };

  var $ = function (id) { return document.getElementById(id); };
  var builder = null;
  var loader = null;
  var bilingualMod = null;
  var verifyCore = null;
  var step = 1;
  var built = null;
  var builtLearner = '';
  var previewSession = null;
  var previewUrl = '';
  var activeFilter = 'all';
  var state = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function setText(id, text) {
    var node = $(id);
    if (node) node.textContent = text == null ? '' : String(text);
  }

  function announce(msg) {
    setText('live-status', '');
    setTimeout(function () { setText('live-status', msg); }, 25);
  }

  function fileSize(bytes) {
    if (!(bytes > 0)) return '0 KB';
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function splitLines(text) {
    return String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function parseGlossaryText(text) {
    var out = {};
    splitLines(text).slice(0, 60).forEach(function (line) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      var term = parts[0];
      if (!term || term === '__proto__' || term === 'constructor' || term === 'prototype') return;
      var entry = {};
      parts.slice(1).forEach(function (seg) {
        var m = /^(es|pt|fr|ar|vi|zh)\s*:\s*(.+)$/i.exec(seg);
        if (m) entry[m[1].toLowerCase()] = m[2].trim();
      });
      if (Object.keys(entry).length) out[term] = entry;
    });
    return out;
  }

  function formatGlossaryText(glossary) {
    if (!glossary || typeof glossary !== 'object') return '';
    return Object.keys(glossary).map(function (term) {
      var map = glossary[term] || {};
      var pairs = Object.keys(map).map(function (code) { return code + ':' + map[code]; });
      return pairs.length ? (term + ' | ' + pairs.join(' | ')) : '';
    }).filter(Boolean).join('\n');
  }

  function defaultState() {
    var first = builder.STARTER_SETS[0];
    var texts = {};
    builder.ACTIVITIES.forEach(function (act) {
      var st = builder.defaultStarterFor(act);
      texts[act] = builder.formatItemsText(act, st.items);
    });
    return {
      starterId: first.id,
      activity: first.activity,
      mode: 'practice',
      title: first.title,
      adaptiveScaffold: false,
      form: 'Form A',
      timeLimitMin: '',
      teacherCode: '',
      itemsByActivity: texts,
      homeLanguages: [],
      glossaryText: '',
      stationMode: false,
      qrPublicKey: '',
    };
  }

  function remember() {
    try {
      var toSave = Object.assign({}, state, { teacherCode: '' });
      localStorage.setItem(STORE_KEY, JSON.stringify(toSave));
    } catch (_) {}
  }

  function recall() {
    var base = defaultState();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw, function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
      if (!parsed || typeof parsed !== 'object') return base;
      if (builder.ACTIVITIES.indexOf(parsed.activity) >= 0) base.activity = parsed.activity;
      if (typeof parsed.starterId === 'string') base.starterId = parsed.starterId;
      if (parsed.mode === 'probe' || parsed.mode === 'practice') base.mode = parsed.mode;
      if (typeof parsed.title === 'string' && parsed.title.trim()) base.title = parsed.title;
      base.adaptiveScaffold = !!parsed.adaptiveScaffold;
      if (typeof parsed.form === 'string') base.form = parsed.form;
      if (parsed.timeLimitMin != null) base.timeLimitMin = String(parsed.timeLimitMin);
      if (parsed.itemsByActivity && typeof parsed.itemsByActivity === 'object') {
        builder.ACTIVITIES.forEach(function (act) {
          if (typeof parsed.itemsByActivity[act] === 'string' && parsed.itemsByActivity[act].trim()) {
            base.itemsByActivity[act] = parsed.itemsByActivity[act];
          }
        });
      }
      if (Array.isArray(parsed.homeLanguages)) {
        base.homeLanguages = parsed.homeLanguages.filter(function (c) { return /^(es|pt|fr|ar|vi|zh)$/.test(c); });
      }
      if (typeof parsed.glossaryText === 'string') base.glossaryText = parsed.glossaryText;
      base.stationMode = !!parsed.stationMode;
      if (typeof parsed.qrPublicKey === 'string') base.qrPublicKey = parsed.qrPublicKey;
    } catch (_) {}
    return base;
  }

  function applyStarter(starter) {
    state.starterId = starter.id;
    state.activity = starter.activity;
    state.title = starter.title;
    state.itemsByActivity[starter.activity] = builder.formatItemsText(starter.activity, starter.items);
    remember();
    drawStep1();
    if (step === 2) drawStep2();
    announce('Loaded starter set: ' + starter.name + '.');
  }

  function drawStarters() {
    var list = $('starter-list');
    if (!list) return;
    list.textContent = '';
    var shown = builder.STARTER_SETS.filter(function (s) {
      return activeFilter === 'all' || s.activity === activeFilter;
    });
    shown.forEach(function (s) {
      var actTitle = builder.ADAPTERS[s.activity] ? builder.ADAPTERS[s.activity].title : s.activity;
      var card = el('button', 'starter-card');
      card.type = 'button';
      card.setAttribute('data-starter-id', s.id);
      card.setAttribute('aria-pressed', state.starterId === s.id ? 'true' : 'false');
      var meta = el('span', 'starter-meta');
      meta.appendChild(el('span', 'starter-tag', actTitle));
      meta.appendChild(el('span', '', s.gradeBand));
      card.appendChild(meta);
      card.appendChild(el('span', 'starter-name', s.name));
      card.appendChild(el('span', 'starter-summary', s.summary));
      card.addEventListener('click', function () { applyStarter(s); });
      list.appendChild(card);
    });
  }

  function drawStep1() {
    drawStarters();
    var actRadios = document.querySelectorAll('input[name="activity"]');
    for (var i = 0; i < actRadios.length; i++) {
      actRadios[i].checked = actRadios[i].value === state.activity;
    }
    var modeRadios = document.querySelectorAll('input[name="mode"]');
    for (var j = 0; j < modeRadios.length; j++) {
      modeRadios[j].checked = modeRadios[j].value === state.mode;
    }
    $('practice-extra').hidden = state.mode === 'probe';
    $('check-extra').hidden = state.mode !== 'probe';
    $('f-adaptive').checked = !!state.adaptiveScaffold;
    $('f-check-form').value = state.form || 'Form A';
    $('f-check-time').value = state.timeLimitMin || '';
    $('f-check-code').value = state.teacherCode || '';
    setText('step-1-problem', '');
  }

  function drawBilingualPills() {
    var box = $('bilingual-langs');
    if (!box) return;
    box.textContent = '';
    var langs = (bilingualMod && bilingualMod.SUPPORTED_LANGUAGES) || ['es', 'pt', 'fr', 'ar', 'vi', 'zh'];
    var packs = (bilingualMod && bilingualMod.LANGUAGES) || {};
    langs.forEach(function (code) {
      var pack = packs[code] || { name: code.toUpperCase(), nativeName: code.toUpperCase() };
      var lbl = el('label', 'pill');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = code;
      cb.checked = state.homeLanguages.indexOf(code) >= 0;
      cb.addEventListener('change', function () {
        var idx = state.homeLanguages.indexOf(code);
        if (cb.checked && idx < 0) state.homeLanguages.push(code);
        else if (!cb.checked && idx >= 0) state.homeLanguages.splice(idx, 1);
        remember();
        updateSupportsSummary();
      });
      lbl.appendChild(cb);
      lbl.appendChild(el('span', 'pill-name', pack.name + ' (' + pack.nativeName + ')'));
      box.appendChild(lbl);
    });
  }

  function updateSupportsSummary() {
    var parts = [];
    if (state.homeLanguages.length) parts.push('Languages: ' + state.homeLanguages.join(', '));
    else parts.push('English only');
    if (state.stationMode) parts.push('Station Mode');
    if (state.qrPublicKey && state.qrPublicKey.trim()) parts.push('Sealed QR');
    setText('supports-now', parts.join(' \u00b7 '));
  }

  function updateParseNote() {
    var parsed = builder.parseItemsText(state.activity, state.itemsByActivity[state.activity] || '');
    if (!parsed.length) {
      setText('items-parse-note', 'No valid problems parsed yet. Follow the line format shown above.');
    } else {
      setText('items-parse-note', parsed.length + (parsed.length === 1 ? ' problem ready.' : ' problems ready.'));
    }
  }

  function drawStep2() {
    var actTitle = builder.ADAPTERS[state.activity] ? builder.ADAPTERS[state.activity].title : state.activity;
    setText('editor-heading', actTitle + ' problems');
    setText('editor-format-hint', FORMAT_HINTS[state.activity] || '');
    $('f-items').value = state.itemsByActivity[state.activity] || '';
    drawBilingualPills();
    $('f-glossary').value = state.glossaryText || '';
    $('f-station-mode').checked = !!state.stationMode;
    $('f-qr-key').value = state.qrPublicKey || '';
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountQrKeyHelper === 'function') window.AlloPacketHandoff.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto });
    updateParseNote();
    updateSupportsSummary();
    setText('step-2-problem', '');
  }

  function validateStep2() {
    var items = builder.parseItemsText(state.activity, state.itemsByActivity[state.activity] || '');
    if (!items.length) return 'Add at least 1 valid problem line before making the file.';
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && window.AlloPacketQrCrypto && !window.AlloPacketQrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key should start with AFPK1. Leave it blank or paste the key from Sealed QR setup.';
    }
    var code = String(state.teacherCode || '').trim();
    if (state.mode === 'probe' && code && (code.length < 4 || code.length > 64)) {
      return 'The teacher code needs 4 to 64 characters (or leave it blank).';
    }
    return '';
  }

  function buildLessonConfig() {
    var items = builder.parseItemsText(state.activity, state.itemsByActivity[state.activity] || '');
    var timeMin = Number(state.timeLimitMin);
    var starter = builder.findStarter(state.starterId) || builder.defaultStarterFor(state.activity);
    return {
      starterId: starter ? starter.id : '',
      activity: state.activity,
      mode: state.mode,
      title: String(state.title || '').trim() || (starter ? starter.title : 'Visual Math Manipulatives'),
      items: items,
      adaptiveScaffold: state.mode !== 'probe' && !!state.adaptiveScaffold,
      form: state.form || 'Form A',
      timeLimitS: state.mode === 'probe' && isFinite(timeMin) && timeMin > 0 ? Math.round(timeMin * 60) : null,
      teacherCode: state.mode === 'probe' ? String(state.teacherCode || '').trim() : '',
      homeLanguages: state.homeLanguages.slice(),
      bilingualGlossary: parseGlossaryText(state.glossaryText),
      stationMode: !!state.stationMode,
      qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
    };
  }

  function batchList() {
    var raw = $('f-batch-names') ? $('f-batch-names').value : '';
    var seen = Object.create(null);
    var names = [], twice = [], over = 0;
    splitLines(raw).forEach(function (line) {
      var clean = builder.codeName(line);
      if (!clean) return;
      var k = clean.toLowerCase();
      if (seen[k]) { if (twice.indexOf(clean) < 0) twice.push(clean); return; }
      seen[k] = true;
      if (names.length < MAX_STUDENTS) names.push(clean);
      else over++;
    });
    return { names: names, twice: twice, over: over };
  }

  function resetPreview() {
    if (previewSession && typeof previewSession.stop === 'function') {
      try { previewSession.stop(); } catch (_) {}
    }
    previewSession = null;
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch (_) {}
      previewUrl = '';
    }
  }

  function drawBatch() {
    var list = batchList();
    var n = list.names.length;
    var btn = $('batch-make');
    var parts = [];
    if (n === 0) {
      parts.push('Leave empty so each student types a code name at the start.');
      if (btn) btn.hidden = true;
    } else if (n === 1) {
      parts.push('Using ' + list.names[0] + ' in the file above. Add another line to save a .zip.');
      if (btn) btn.hidden = true;
    } else {
      parts.push(n + ' files ready' + (built ? ', about ' + fileSize(n * built.bytes) + ' total.' : '.'));
      if (btn) { btn.hidden = false; btn.textContent = 'Save .zip for ' + n + ' students'; }
    }
    if (list.over) parts.push('Not used: ' + list.over + ' extra names (max ' + MAX_STUDENTS + ').');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    setText('batch-said', parts.join(' '));
  }

  var builtCfg = null;

  function appendFractionStrip(parent, labelText, denom, shaded) {
    var d = Math.max(1, Math.min(12, Math.floor(Number(denom) || 4)));
    var s = Math.max(0, Math.min(d, Math.floor(Number(shaded) || 0)));
    var row = el('div', 'paper-manip-bar-row');
    row.appendChild(el('span', 'paper-manip-bar-lbl', labelText));
    var strip = el('div', 'paper-manip-strip');
    strip.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < d; i++) {
      strip.appendChild(el('span', 'paper-manip-seg' + (i < s ? ' paper-manip-seg-on' : '')));
    }
    row.appendChild(strip);
    parent.appendChild(row);
  }

  function formatStopVal(val, denom) {
    var d = Math.max(1, Math.floor(Number(denom) || 1));
    if (d === 1) return String(Math.round(val));
    var num = Math.round(val * d);
    if (num === 0) return '0';
    if (num % d === 0) return String(num / d);
    return num + '/' + d;
  }

  function drawPaperSheet(cfg, result) {
    var sheet = $('paper-manip-sheet');
    var fold = $('paper-manip-fold');
    var keyBox = $('f-paper-manip-key');
    var docxBtn = $('download-docx');
    if (!sheet) return;
    sheet.textContent = '';
    if (!cfg || !result) {
      sheet.setAttribute('data-ready', '0');
      sheet.hidden = true;
      if (docxBtn) docxBtn.hidden = true;
      return;
    }

    var header = el('div', 'paper-manip-header');
    header.appendChild(el('h4', 'paper-manip-title', cfg.title || 'Visual Math Mat'));
    header.appendChild(el('p', 'paper-manip-fields', 'Name: ________________________   Date: ______________'));
    sheet.appendChild(header);

    var itemsWrap = el('div', 'paper-manip-items');
    var items = Array.isArray(cfg.items) ? cfg.items : [];
    var keyEntries = [];

    items.forEach(function (it, idx) {
      var card = el('div', 'paper-manip-card');
      card.appendChild(el('p', 'paper-manip-prompt', (idx + 1) + '. ' + (it.prompt || it.word || 'Solve the problem.')));

      if (cfg.activity === 'manip_base_ten') {
        var pv = el('table', 'paper-manip-pv');
        var pvh = el('thead');
        var hr = el('tr');
        ['Hundreds (100)', 'Tens (10)', 'Ones (1)'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
        pvh.appendChild(hr);
        pv.appendChild(pvh);
        var pvb = el('tbody');
        var tr = el('tr');
        ['Draw squares', 'Draw rods', 'Draw dots'].forEach(function (hintTxt) { tr.appendChild(el('td', '', hintTxt)); });
        pvb.appendChild(tr);
        pv.appendChild(pvb);
        card.appendChild(pv);
        card.appendChild(el('p', 'paper-manip-ans', 'Hundreds: ____   Tens: ____   Ones: ____   Total = ________'));
        var tv = Math.max(0, Math.floor(Number(it.targetValue != null ? it.targetValue : it.target) || 0));
        var hCnt = it.targetBlocks ? Math.floor(Number(it.targetBlocks.hundreds) || 0) : Math.floor(tv / 100);
        var tCnt = it.targetBlocks ? Math.floor(Number(it.targetBlocks.tens) || 0) : Math.floor((tv % 100) / 10);
        var oCnt = it.targetBlocks ? Math.floor(Number(it.targetBlocks.ones) || 0) : (tv % 10);
        keyEntries.push('Problem ' + (idx + 1) + ': ' + tv + ' (' + hCnt + 'H, ' + tCnt + 'T, ' + oCnt + 'O)');
      } else if (cfg.activity === 'manip_fraction_bars') {
        var refs = Array.isArray(it.referenceBars) ? it.referenceBars : [];
        refs.forEach(function (rb) {
          appendFractionStrip(card, rb.label || (rb.num + '/' + rb.den), rb.den, rb.num);
        });
        if (it.task === 'compare') {
          var cmp = el('div', 'paper-manip-cmp');
          ['Less than (<)', 'Equal (=)', 'Greater than (>)'].forEach(function (lbl) {
            var opt = el('span', 'paper-manip-cmp-opt');
            var bx = el('span', 'paper-manip-box');
            bx.setAttribute('aria-hidden', 'true');
            opt.appendChild(bx);
            opt.appendChild(el('span', '', lbl));
            cmp.appendChild(opt);
          });
          card.appendChild(cmp);
          keyEntries.push('Problem ' + (idx + 1) + ': ' + (it.targetSymbol || it.target || '='));
        } else {
          var workDen = Number(it.startDenom) || Number(it.targetDen) || 4;
          if (it.forbidDenom && workDen === Number(it.forbidDenom)) {
            workDen = Number(it.targetDen) || (workDen * 2 <= 12 ? workDen * 2 : 6);
          }
          appendFractionStrip(card, 'Shade your fraction (' + workDen + ' equal parts):', workDen, 0);
          card.appendChild(el('p', 'paper-manip-ans', 'My Fraction = _____ / _____'));
          keyEntries.push('Problem ' + (idx + 1) + ': ' + (it.targetNum != null && it.targetDen ? (it.targetNum + '/' + it.targetDen) : String(it.target || '')) + (it.forbidDenom ? ' (different denominator than ' + it.forbidDenom + ')' : ''));
        }
      } else if (cfg.activity === 'manip_number_line') {
        var minV = Number(it.min != null ? it.min : 0);
        var maxV = Number(it.max != null ? it.max : 20);
        var denom = Math.max(1, Math.floor(Number(it.denom) || 1));
        var startV = Number(it.start != null ? it.start : minV);
        var span = Math.max(1, maxV - minV);
        var stopCount = Math.min(12, Math.max(4, Math.round(span * denom)));
        var stepV = span / stopCount;
        var nl = el('div', 'paper-manip-nl');
        var track = el('div', 'paper-manip-nl-track');
        for (var ti = 0; ti <= stopCount; ti++) {
          var val = minV + ti * stepV;
          var stopNode = el('div', 'paper-manip-nl-stop');
          stopNode.appendChild(el('span', 'paper-manip-nl-mark'));
          stopNode.appendChild(el('span', '', formatStopVal(val, denom)));
          track.appendChild(stopNode);
        }
        nl.appendChild(track);
        card.appendChild(nl);
        card.appendChild(el('p', 'paper-manip-ans', 'Start at: ' + formatStopVal(startV, denom) + '   Draw hops above the line.   Landing point = ________'));
        keyEntries.push('Problem ' + (idx + 1) + ': ' + (it.targetValue != null ? formatStopVal(Number(it.targetValue), denom) : String(it.target || '')));
      } else {
        var a = Math.max(1, Math.floor(Number(it.a) || 1));
        var b = Math.floor(Number(it.b) || 0);
        var c = Math.floor(Number(it.c) || 0);
        var tx = it.targetX != null ? Number(it.targetX) : (c - b) / a;
        var lhs = (a === 1 ? 'x' : (a + 'x')) + (b > 0 ? ' + ' + b : b < 0 ? ' \u2212 ' + Math.abs(b) : '');
        var scale = el('div', 'paper-manip-scale');
        scale.appendChild(el('div', 'paper-manip-pan', 'Left Pan: ' + lhs));
        scale.appendChild(el('span', 'paper-manip-eq', '='));
        scale.appendChild(el('div', 'paper-manip-pan', 'Right Pan: ' + c));
        card.appendChild(scale);
        card.appendChild(el('p', 'paper-manip-ans', 'Step 1 (same on both pans): ________________________   Result: ________________'));
        card.appendChild(el('p', 'paper-manip-ans', 'Step 2 (if needed): ________________________________   x = ________'));
        keyEntries.push('Problem ' + (idx + 1) + ': ' + lhs + ' = ' + c + ' \u2192 x = ' + tx);
      }

      itemsWrap.appendChild(card);
    });

    sheet.appendChild(itemsWrap);

    if (keyEntries.length && (!keyBox || keyBox.checked)) {
      var keySec = el('div', 'paper-manip-key');
      keySec.appendChild(el('h4', '', 'Teacher Answer Key \u2014 ' + (cfg.title || 'Visual Math Mat')));
      var kul = el('ul', 'paper-manip-key-list');
      keyEntries.forEach(function (line) { kul.appendChild(el('li', '', line)); });
      keySec.appendChild(kul);
      sheet.appendChild(keySec);
    }

    sheet.setAttribute('data-ready', '1');
    sheet.hidden = !(fold && fold.open);
    if (docxBtn) docxBtn.hidden = false;
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
        && typeof window.AlloPacketDocx.buildGeneralHandoutDocx === 'function'
        && typeof window.AlloPacketDocx.downloadDocx === 'function');
    };
    return loadLocalScript('packets_zip.js', 'data-allo-zip', hasZip).then(function (zipOk) {
      if (!zipOk) return null;
      return loadLocalScript('packets_docx.js', 'data-allo-docx', hasDocx).then(function (docxOk) {
        return docxOk ? window.AlloPacketDocx : null;
      });
    });
  }

  function buildManipDocxPayload(cfg) {
    if (!cfg) return null;
    var keyBox = $('f-paper-manip-key');
    var answerKeyOn = !keyBox || !!keyBox.checked;
    var items = Array.isArray(cfg.items) ? cfg.items : [];
    if (!items.length) return null;
    var sections = [];
    var keyEntries = [];

    items.forEach(function (it, idx) {
      var pTitle = 'Problem ' + (idx + 1);
      var promptTxt = it.prompt || it.word || 'Solve the problem.';

      if (cfg.activity === 'manip_base_ten') {
        sections.push({
          heading: pTitle,
          directions: promptTxt,
          type: 'table',
          columns: ['Hundreds (100)', 'Tens (10)', 'Ones (1)'],
          rows: [
            ['Draw squares', 'Draw rods', 'Draw dots'],
            ['Hundreds: ____', 'Tens: ____', 'Ones: ____   Total = ________'],
          ],
        });
        var tv = Math.max(0, Math.floor(Number(it.targetValue != null ? it.targetValue : it.target) || 0));
        var hCnt = it.targetBlocks ? Math.floor(Number(it.targetBlocks.hundreds) || 0) : Math.floor(tv / 100);
        var tCnt = it.targetBlocks ? Math.floor(Number(it.targetBlocks.tens) || 0) : Math.floor((tv % 100) / 10);
        var oCnt = it.targetBlocks ? Math.floor(Number(it.targetBlocks.ones) || 0) : (tv % 10);
        keyEntries.push(pTitle + ': ' + tv + ' (' + hCnt + 'H, ' + tCnt + 'T, ' + oCnt + 'O)');
      } else if (cfg.activity === 'manip_fraction_bars') {
        var refs = Array.isArray(it.referenceBars) ? it.referenceBars : [];
        var refText = refs.map(function (rb) {
          return (rb.label || (rb.num + '/' + rb.den)) + ' (' + rb.num + ' of ' + rb.den + ' shaded)';
        }).join('  |  ');
        if (it.task === 'compare') {
          sections.push({
            heading: pTitle,
            directions: refText ? ('Reference bars: ' + refText) : '',
            type: 'questions',
            items: [{ prompt: promptTxt, choices: ['Less than (<)', 'Equal (=)', 'Greater than (>)'] }],
          });
          keyEntries.push(pTitle + ': ' + (it.targetSymbol || it.target || '='));
        } else {
          var workDen = Number(it.startDenom) || Number(it.targetDen) || 4;
          if (it.forbidDenom && workDen === Number(it.forbidDenom)) {
            workDen = Number(it.targetDen) || (workDen * 2 <= 12 ? workDen * 2 : 6);
          }
          var dirLine = (refText ? ('Reference: ' + refText + ' — ') : '') + promptTxt + '  My Fraction = ____ / ____';
          if (workDen <= 8) {
            var cols = [];
            var row = [];
            for (var fi = 0; fi < workDen; fi++) {
              cols.push('1/' + workDen);
              row.push('');
            }
            sections.push({ heading: pTitle, directions: dirLine, type: 'table', columns: cols, rows: [row] });
          } else {
            sections.push({
              heading: pTitle,
              directions: dirLine,
              type: 'boxes',
              columns: 1,
              items: [{ title: 'Fraction Bar Workspace (' + workDen + ' equal parts)', detail: 'Shade your target fraction and write the numerator and denominator above.', writeLines: 1 }],
            });
          }
          keyEntries.push(pTitle + ': ' + (it.targetNum != null && it.targetDen ? (it.targetNum + '/' + it.targetDen) : String(it.target || '')) + (it.forbidDenom ? ' (different denominator than ' + it.forbidDenom + ')' : ''));
        }
      } else if (cfg.activity === 'manip_number_line') {
        var minV = Number(it.min != null ? it.min : 0);
        var maxV = Number(it.max != null ? it.max : 20);
        var denom = Math.max(1, Math.floor(Number(it.denom) || 1));
        var startV = Number(it.start != null ? it.start : minV);
        var span = Math.max(1, maxV - minV);
        var stopCount = Math.min(12, Math.max(4, Math.round(span * denom)));
        var stepV = span / stopCount;
        var stops = [];
        for (var ti = 0; ti <= stopCount; ti++) {
          stops.push(formatStopVal(minV + ti * stepV, denom));
        }
        sections.push({
          heading: pTitle,
          directions: promptTxt,
          type: 'boxes',
          columns: 1,
          items: [{
            title: 'Number Line:  ' + stops.join('   |   '),
            detail: 'Start at: ' + formatStopVal(startV, denom) + '   |   Draw hops above the line   |   Landing point = ________',
            writeLines: 1,
          }],
        });
        keyEntries.push(pTitle + ': ' + (it.targetValue != null ? formatStopVal(Number(it.targetValue), denom) : String(it.target || '')));
      } else {
        var a = Math.max(1, Math.floor(Number(it.a) || 1));
        var b = Math.floor(Number(it.b) || 0);
        var c = Math.floor(Number(it.c) || 0);
        var tx = it.targetX != null ? Number(it.targetX) : (c - b) / a;
        var lhs = (a === 1 ? 'x' : (a + 'x')) + (b > 0 ? ' + ' + b : b < 0 ? ' \u2212 ' + Math.abs(b) : '');
        sections.push({
          heading: pTitle,
          directions: promptTxt,
          type: 'table',
          columns: ['Left Pan', '=', 'Right Pan'],
          rows: [
            [lhs, '=', String(c)],
            ['Step 1 (same on both pans):', '=', 'Result:'],
            ['Step 2 (if needed):', '=', 'x = ________'],
          ],
        });
        keyEntries.push(pTitle + ': ' + lhs + ' = ' + c + ' \u2192 x = ' + tx);
      }
    });

    return {
      title: cfg.title || 'Visual Math Mat',
      subtitle: builder.ADAPTERS[cfg.activity] ? builder.ADAPTERS[cfg.activity].title : 'Visual Math Manipulatives',
      kind: cfg.activity || 'manipulatives',
      sections: sections,
      answerKey: keyEntries.length ? [{ heading: 'Problem Answers', lines: keyEntries }] : [],
      answerKeyOn: answerKeyOn,
    };
  }

  function downloadManipDocx() {
    if (!built || !builtCfg) buildNow();
    var payload = buildManipDocxPayload(builtCfg);
    if (!payload) {
      announce('Build a visual math packet first to download a Word math mat.');
      return Promise.resolve(false);
    }
    var btn = $('download-docx');
    if (btn) btn.disabled = true;
    announce('Preparing Word math mat (.docx)...');
    return ensureDocxTools().then(function (docxLib) {
      if (!docxLib || !window.AlloPacketZip) {
        announce('Could not load the Word math mat builder. Load the page again.');
        return false;
      }
      var res = docxLib.buildGeneralHandoutDocx(payload, { zip: window.AlloPacketZip });
      if (docxLib.downloadDocx(res, window, document)) {
        announce('Downloaded ' + res.filename + '.');
        return true;
      }
      announce('This browser could not save the Word file.');
      return false;
    }, function () {
      announce('Could not create the Word math mat.');
      return false;
    }).then(function (ok) {
      if (btn) btn.disabled = false;
      return ok;
    });
  }

  function buildNow() {
    resetPreview();
    built = null;
    builtCfg = null;
    builtLearner = '';
    $('build-problem').hidden = true;
    $('summary').hidden = true;
    $('save').hidden = true;
    $('try').hidden = true;
    $('after-save').hidden = true;
    $('making').hidden = false;
    drawPaperSheet(null, null);
    setText('making-line', 'Building the file in this browser tab...');

    try {
      var cfg = buildLessonConfig();
      var list = batchList();
      var singleCode = list.names.length === 1 ? list.names[0] : '';
      var result = builder.buildManipulativePacket(Object.assign({}, cfg, {
        loader: loader,
        stationBilingual: bilingualMod,
        qrCrypto: window.AlloPacketQrCrypto,
        learner: singleCode,
      }));
      built = result;
      builtCfg = cfg;
      builtLearner = singleCode;
      $('making').hidden = true;
      $('summary').hidden = false;
      $('save').hidden = false;
      $('try').hidden = false;

      var actTitle = builder.ADAPTERS[result.activity] ? builder.ADAPTERS[result.activity].title : result.activity;
      var modeLabel = result.mode === 'probe' ? 'Check mode (one try)' : 'Practice mode (feedback and retry)';
      setText('summary-facts', result.name + ' (' + fileSize(result.bytes) + ') \u2014 ' + actTitle + ', ' + result.itemCount + ' items, ' + modeLabel + '.');
      setText('making-said', 'The file is ready: ' + result.name);

      var rows = $('summary-rows');
      rows.textContent = '';
      var addRow = function (k, v) {
        rows.appendChild(el('dt', '', k));
        rows.appendChild(el('dd', '', v));
      };
      addRow('Manipulative', actTitle);
      addRow('Problems', String(result.itemCount));
      addRow('Mode', modeLabel);
      if (result.mode !== 'probe') addRow('Adaptive scaffolding', cfg.adaptiveScaffold ? 'On (hint card, reinforcement, Stretch Challenge)' : 'Off');
      addRow('File size', fileSize(result.bytes));
      addRow('Home languages', cfg.homeLanguages.length ? cfg.homeLanguages.join(', ') : 'English only');
      addRow('Station Mode', cfg.stationMode ? 'On (shared-device reset + QR deck)' : 'Off');
      addRow('Sealed QR', cfg.qrPublicKey ? 'Enabled' : 'Off');
      addRow('Network access', 'None (connect-src none)');

      if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        previewUrl = URL.createObjectURL(new Blob([result.html], { type: 'text/html;charset=utf-8' }));
        $('try').setAttribute('href', TRY_PAGE + '#' + previewUrl);
        if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.hostPreview === 'function') {
          previewSession = window.AlloPacketHandoff.hostPreview({ url: previewUrl, html: result.html });
        }
      } else {
        $('try').setAttribute('href', TRY_PAGE);
      }
      drawPaperSheet(cfg, result);
      drawBatch();
    } catch (err) {
      $('making').hidden = true;
      $('build-problem').hidden = false;
      setText('build-problem-text', (err && err.message) || 'Could not build the packet.');
    }
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
  }

  function saveFile() {
    if (!built) return;
    downloadBlob(new Blob([built.html], { type: 'text/html;charset=utf-8' }), built.name);
    $('after-save').hidden = false;
    $('after-save').focus();
    announce('Saved ' + built.name + '.');
  }

  function saveBatchZip() {
    setText('batch-problem', '');
    var list = batchList();
    if (list.names.length < 2) { setText('batch-problem', 'Enter at least 2 code names to save a .zip.'); return; }
    if (!built || !built.baseHtml) { setText('batch-problem', 'Build the file first.'); return; }
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') {
      setText('batch-problem', 'The zip helper did not load. Load the page again.');
      return;
    }
    try {
      var zip = window.AlloPacketZip.create();
      var enc = new TextEncoder();
      list.names.forEach(function (who) {
        var html = builder.withCodeName(built.baseHtml, who);
        var fname = builder.fileName(built.lesson.title, built.mode, who);
        zip.add(fname, enc.encode(html));
      });
      var parts = zip.finish();
      var zname = built.plain.replace(/\.html$/, '') + '__' + list.names.length + '-students.zip';
      downloadBlob(new Blob(parts, { type: 'application/zip' }), zname);
      setText('batch-said', 'Saved ' + zname + ' (' + fileSize(zip.bytes) + ').');
    } catch (err) {
      setText('batch-problem', (err && err.message) || 'Could not create the .zip file.');
    }
  }

  function gotoStep(next, focusHeading) {
    if (next === 3) {
      var problem = validateStep2();
      setText('step-2-problem', problem);
      if (problem) return;
    }
    step = next;
    [1, 2, 3].forEach(function (n) {
      var sec = $('step-' + n);
      if (sec) sec.hidden = n !== step;
      var tab = document.querySelector('.step-tab[data-go="' + n + '"]');
      if (tab) {
        if (n === step) tab.setAttribute('aria-current', 'step');
        else tab.removeAttribute('aria-current');
      }
    });
    if (step === 1) drawStep1();
    if (step === 2) drawStep2();
    if (step === 3) {
      $('f-title').value = state.title || '';
      buildNow();
    }
    if (focusHeading) {
      var h = $('step-' + step + '-title');
      if (h && typeof h.focus === 'function') h.focus();
    }
  }

  function showReopenNote(line, notes, page) {
    setText('reopen-line', line);
    var ul = $('reopen-list');
    ul.textContent = '';
    (notes || []).forEach(function (n) { ul.appendChild(el('li', '', n)); });
    var link = $('reopen-page');
    if (page && page.href) {
      link.href = page.href;
      link.textContent = 'Open ' + (page.name || 'that page');
      link.hidden = false;
    } else {
      link.hidden = true;
    }
    $('reopen-note').hidden = false;
    $('reopen-note').focus();
  }

  function applyReopened(res) {
    state.starterId = '';
    state.activity = res.activity;
    state.mode = res.mode || 'practice';
    state.title = res.title || state.title;
    state.adaptiveScaffold = !!res.adaptiveScaffold;
    state.form = res.form || 'Form A';
    state.timeLimitMin = res.timeLimitS ? String(Math.round(res.timeLimitS / 60)) : '';
    state.homeLanguages = Array.isArray(res.homeLanguages) ? res.homeLanguages.slice() : [];
    state.glossaryText = formatGlossaryText(res.bilingualGlossary || {});
    state.stationMode = !!res.stationMode;
    state.qrPublicKey = typeof res.qrPublicKey === 'string' ? res.qrPublicKey : '';
    state.teacherCode = '';
    if (Array.isArray(res.items) && res.items.length) {
      state.itemsByActivity[res.activity] = builder.formatItemsText(res.activity, res.items);
    }
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    remember();
    gotoStep(2, false);
  }

  var reopenPending = null;

  function handleReopenBytes(bytes, fileName) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var res = builder.readManipulativePacket(u8, verifyCore);
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(u8, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-manipulatives.html') ? owner : res.page;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && targetPage.href !== 'packets-manipulatives.html') {
        reopenPending = {
          file: { name: String(fileName || 'packet.html').slice(0, 120), bytes: u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) },
          href: targetPage.href,
          hash: targetPage.hash || (targetPage.href === 'packets-results.html' ? ((handoff && handoff.RESULTS_HASH) || '#import-results') : ((handoff && handoff.HASH) || '#open-file')),
        };
      } else {
        reopenPending = null;
      }
      showReopenNote(res.why || 'Could not read that file.', res.notes, targetPage);
      return;
    }
    reopenPending = null;
    applyReopened(res);
    showReopenNote('Loaded "' + res.title + '" into the editor.', res.notes, null);
  }

  function handleReopenFile(file) {
    if (!file) return;
    if (file.size > MAX_REOPEN_BYTES) {
      reopenPending = null;
      showReopenNote('That file is larger than 60 MB.', [], null);
      return;
    }
    var reader = new FileReader();
    reader.onload = function () { handleReopenBytes(new Uint8Array(reader.result), file.name); };
    reader.onerror = function () {
      reopenPending = null;
      showReopenNote('This browser could not read that file.', [], null);
    };
    reader.readAsArrayBuffer(file);
  }

  function checkHandoff() {
    var handoff = window.AlloPacketHandoff;
    if (!handoff || typeof handoff.take !== 'function') return;
    var h = window.location ? window.location.hash : '';
    if (h !== (handoff.HASH || '#open-file')) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (file && file.bytes) handleReopenBytes(file.bytes, file.name);
    }, function () {});
  }

  function wireEvents() {
    var filters = document.querySelectorAll('#tool-filters button[data-tool]');
    for (var fi = 0; fi < filters.length; fi++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          activeFilter = btn.getAttribute('data-tool') || 'all';
          for (var j = 0; j < filters.length; j++) {
            filters[j].setAttribute('aria-pressed', filters[j] === btn ? 'true' : 'false');
          }
          drawStarters();
        });
      })(filters[fi]);
    }

    var actRadios = document.querySelectorAll('input[name="activity"]');
    for (var ai = 0; ai < actRadios.length; ai++) {
      actRadios[ai].addEventListener('change', function (e) {
        var prevTitle = String(state.title || '').trim();
        var wasDefault = !prevTitle || builder.STARTER_SETS.some(function (s) { return s.title === prevTitle; });
        state.activity = e.target.value;
        var defStarter = builder.defaultStarterFor(state.activity);
        state.starterId = defStarter ? defStarter.id : '';
        if (defStarter && wasDefault) state.title = defStarter.title;
        remember();
        drawStep1();
      });
    }

    var modeRadios = document.querySelectorAll('input[name="mode"]');
    for (var mi = 0; mi < modeRadios.length; mi++) {
      modeRadios[mi].addEventListener('change', function (e) {
        state.mode = e.target.value === 'probe' ? 'probe' : 'practice';
        remember();
        drawStep1();
      });
    }

    $('f-adaptive').addEventListener('change', function (e) { state.adaptiveScaffold = !!e.target.checked; remember(); });
    $('f-check-form').addEventListener('input', function (e) { state.form = e.target.value; remember(); });
    $('f-check-time').addEventListener('input', function (e) { state.timeLimitMin = e.target.value; remember(); });
    $('f-check-code').addEventListener('input', function (e) { state.teacherCode = e.target.value; });

    $('f-items').addEventListener('input', function (e) {
      state.itemsByActivity[state.activity] = e.target.value;
      remember();
      updateParseNote();
    });
    $('btn-load-sample').addEventListener('click', function () {
      var st = builder.findStarter(state.starterId) || builder.defaultStarterFor(state.activity);
      if (st) {
        state.itemsByActivity[state.activity] = builder.formatItemsText(state.activity, st.items);
        remember();
        drawStep2();
        announce('Restored starter problems.');
      }
    });

    $('f-glossary').addEventListener('input', function (e) { state.glossaryText = e.target.value; remember(); });
    $('f-qr-key').addEventListener('input', function (e) { state.qrPublicKey = e.target.value; remember(); updateSupportsSummary(); });
    $('f-station-mode').addEventListener('change', function (e) { state.stationMode = !!e.target.checked; remember(); updateSupportsSummary(); });

    var titleTimer = 0;
    $('f-title').addEventListener('input', function (e) {
      state.title = e.target.value;
      remember();
      clearTimeout(titleTimer);
      titleTimer = setTimeout(function () { if (step === 3) buildNow(); }, 180);
    });

    $('f-batch-names').addEventListener('input', function () {
      var list = batchList();
      var nextSingle = list.names.length === 1 ? list.names[0] : '';
      drawBatch();
      if (step === 3 && nextSingle !== builtLearner) buildNow();
    });
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountBatchListHelper === 'function') {
      window.AlloPacketHandoff.mountBatchListHelper($('f-batch-names'), { maxNames: MAX_STUDENTS, announce: announce });
    }

    var tabs = document.querySelectorAll('.step-tab[data-go]');
    for (var ti = 0; ti < tabs.length; ti++) {
      (function (tab) {
        tab.addEventListener('click', function () { gotoStep(Number(tab.getAttribute('data-go')) || 1, true); });
      })(tabs[ti]);
    }
    $('next-1').addEventListener('click', function () { gotoStep(2, true); });
    $('back-2').addEventListener('click', function () { gotoStep(1, true); });
    $('next-2').addEventListener('click', function () { gotoStep(3, true); });
    $('back-3').addEventListener('click', function () { gotoStep(2, true); });
    $('retry').addEventListener('click', buildNow);
    $('fix-choices').addEventListener('click', function () { gotoStep(2, true); });
    $('save').addEventListener('click', saveFile);
    $('batch-make').addEventListener('click', saveBatchZip);

    var paperFold = $('paper-manip-fold');
    if (paperFold) {
      paperFold.addEventListener('toggle', function () {
        var sheet = $('paper-manip-sheet');
        if (sheet) sheet.hidden = !(paperFold.open && sheet.getAttribute('data-ready') === '1');
      });
    }
    var paperKey = $('f-paper-manip-key');
    if (paperKey) {
      paperKey.addEventListener('change', function () {
        if (built && builtCfg) drawPaperSheet(builtCfg, built);
      });
    }
    var paperBtn = $('print-paper-manip');
    if (paperBtn) {
      paperBtn.addEventListener('click', function () {
        if (!built) buildNow();
        var sheet = $('paper-manip-sheet');
        if (!sheet || sheet.getAttribute('data-ready') !== '1') return;
        if (paperFold) paperFold.open = true;
        sheet.hidden = false;
        announce('Opening print dialog for the paper math mat.');
        try { window.print(); } catch (_) {}
      });
    }
    var docxBtn = $('download-docx');
    if (docxBtn) {
      docxBtn.addEventListener('click', function () { downloadManipDocx(); });
    }

    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) handleReopenFile(e.target.files[0]);
      e.target.value = '';
    });
    $('reopen-close').addEventListener('click', function () { reopenPending = null; $('reopen-note').hidden = true; });
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
    var reopenBox = $('reopen');
    reopenBox.addEventListener('dragover', function (e) { e.preventDefault(); reopenBox.classList.add('is-dropping'); });
    reopenBox.addEventListener('dragleave', function () { reopenBox.classList.remove('is-dropping'); });
    reopenBox.addEventListener('drop', function (e) {
      e.preventDefault();
      reopenBox.classList.remove('is-dropping');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleReopenFile(e.dataTransfer.files[0]);
    });

    $('forget').addEventListener('click', function () {
      try { localStorage.removeItem(STORE_KEY); } catch (_) {}
      if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.clearSavedQrPublicKey === 'function') window.AlloPacketHandoff.clearSavedQrPublicKey();
      state = defaultState();
      if ($('f-qr-key') && $('f-qr-key')._alloQrHelper) $('f-qr-key')._alloQrHelper.sync('');
      setText('forget-said', 'Choices removed on this device.');
      gotoStep(1, false);
    });
  }

  function start() {
    builder = window.AlloPacketManipulatives || null;
    loader = window.AlloWordSoundsTakeHome || null;
    bilingualMod = window.AlloPacketStationBilingual || null;
    verifyCore = window.AlloPacketVerify || null;

    $('loading').hidden = true;
    if (!builder || !loader) {
      $('load-problem').hidden = false;
      return;
    }
    $('reopen').hidden = false;
    state = recall();
    wireEvents();
    gotoStep(1, false);
    checkHandoff();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
