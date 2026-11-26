// Educator maker controller for packets-playlist.html (Multi-Activity Unit Playlists / Arc Builder).
// Everything runs in this browser tab. Zero network, zero cookies, zero markup strings.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-playlist/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;

  var $ = function (id) { return document.getElementById(id); };
  var builder = null;
  var loader = null;
  var bilingualMod = null;
  var verifyCore = null;
  var step = 1;
  var built = null;
  var previewSession = null;
  var previewUrl = '';
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

  function stageEntryFromCatalog(stageId) {
    var cat = builder.stageById(stageId);
    if (!cat) return null;
    return {
      stageId: cat.id,
      source: cat.source,
      activity: cat.activity,
      starterId: cat.starterId,
      domain: cat.domain,
      label: cat.label,
      summary: cat.summary || '',
      maxItems: cat.defaultMaxItems || 0,
    };
  }

  function stagesForArc(arc) {
    return (arc.stageIds || []).map(stageEntryFromCatalog).filter(Boolean);
  }

  function defaultState() {
    var arc = builder.STARTER_ARCS[0];
    return {
      arcId: arc.id,
      title: arc.title,
      stages: stagesForArc(arc),
      adaptiveScaffold: true,
      homeLanguages: [],
      glossaryText: '',
      stationMode: false,
      qrPublicKey: '',
    };
  }

  function remember() {
    try {
      var slim = Object.assign({}, state, {
        stages: (state.stages || []).map(function (st) {
          return {
            stageId: st.stageId || '',
            source: st.source || '',
            activity: st.activity || '',
            starterId: st.starterId || '',
            domain: st.domain || '',
            label: st.label || '',
            summary: st.summary || '',
            maxItems: st.maxItems != null ? st.maxItems : 0,
          };
        }),
      });
      localStorage.setItem(STORE_KEY, JSON.stringify(slim));
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
      if (typeof parsed.arcId === 'string') base.arcId = parsed.arcId;
      if (typeof parsed.title === 'string' && parsed.title.trim()) base.title = parsed.title;
      if (Array.isArray(parsed.stages) && parsed.stages.length >= builder.MIN_STAGES) {
        var cleanStages = parsed.stages.slice(0, builder.MAX_STAGES).filter(function (s) {
          return s && typeof s === 'object' && (s.stageId || s.activity);
        });
        if (cleanStages.length >= builder.MIN_STAGES) base.stages = cleanStages;
      }
      if (typeof parsed.adaptiveScaffold === 'boolean') base.adaptiveScaffold = parsed.adaptiveScaffold;
      if (Array.isArray(parsed.homeLanguages)) {
        base.homeLanguages = parsed.homeLanguages.filter(function (c) { return /^(es|pt|fr|ar|vi|zh)$/.test(c); });
      }
      if (typeof parsed.glossaryText === 'string') base.glossaryText = parsed.glossaryText;
      base.stationMode = !!parsed.stationMode;
      if (typeof parsed.qrPublicKey === 'string') base.qrPublicKey = parsed.qrPublicKey;
    } catch (_) {}
    return base;
  }

  function applyArc(arc) {
    state.arcId = arc.id;
    state.title = arc.title;
    state.stages = stagesForArc(arc);
    state.adaptiveScaffold = arc.adaptiveScaffold !== false;
    remember();
    drawStep1();
    if (step === 2) drawStep2();
    announce('Loaded unit arc: ' + arc.name + '.');
  }

  function drawStep1() {
    var list = $('arc-list');
    if (!list) return;
    list.textContent = '';
    builder.STARTER_ARCS.forEach(function (arc) {
      var card = el('button', 'arc-card');
      card.type = 'button';
      card.setAttribute('data-arc-id', arc.id);
      card.setAttribute('aria-pressed', state.arcId === arc.id ? 'true' : 'false');
      var meta = el('span', 'arc-meta');
      meta.appendChild(el('span', 'arc-tag', arc.stageIds.length + ' stages'));
      meta.appendChild(el('span', '', arc.gradeBand + ' \u00b7 ' + arc.subject));
      card.appendChild(meta);
      card.appendChild(el('span', 'arc-name', arc.name));
      card.appendChild(el('span', 'arc-summary', arc.summary));
      card.addEventListener('click', function () { applyArc(arc); });
      list.appendChild(card);
    });
    setText('step-1-problem', '');
  }

  function drawAddStageSelect() {
    var sel = $('f-add-stage');
    if (!sel) return;
    var prev = sel.value;
    sel.textContent = '';
    var groups = Object.create(null);
    var order = [];
    builder.STAGE_CATALOG.forEach(function (st) {
      var d = st.domain || 'Other';
      if (!groups[d]) { groups[d] = []; order.push(d); }
      groups[d].push(st);
    });
    order.forEach(function (domain) {
      var og = document.createElement('optgroup');
      og.label = domain;
      groups[domain].forEach(function (st) {
        var opt = document.createElement('option');
        opt.value = st.id;
        opt.textContent = st.label + ' (' + st.gradeBand + ')';
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
    if (prev && builder.stageById(prev)) sel.value = prev;
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
    parts.push(state.adaptiveScaffold ? 'Adaptive hints on' : 'Adaptive hints off');
    if (state.homeLanguages.length) parts.push('Languages: ' + state.homeLanguages.join(', '));
    if (state.stationMode) parts.push('Station Mode');
    if (state.qrPublicKey && state.qrPublicKey.trim()) parts.push('Sealed QR');
    setText('supports-now', parts.join(' \u00b7 '));
  }

  function drawStageList(focusTarget) {
    var list = $('stage-list');
    if (!list) return;
    list.textContent = '';
    var count = state.stages.length;
    setText('stage-count-note', count + ' of ' + builder.MAX_STAGES + ' stages in this unit (choose between ' + builder.MIN_STAGES + ' and ' + builder.MAX_STAGES + ').');
    var addBtn = $('btn-add-stage');
    if (addBtn) addBtn.disabled = count >= builder.MAX_STAGES;

    var focusRefs = [];
    state.stages.forEach(function (st, idx) {
      var info = (builder && typeof builder.describeActivity === 'function' && builder.describeActivity(st.activity)) || null;
      var domainLabel = st.domain || (info && info.domain) || '';
      var summaryText = st.summary || (info && info.summary) || '';
      var li = el('li', 'stage-card');
      li.setAttribute('data-stage-index', String(idx));
      if (st.activity) li.setAttribute('data-stage-activity', st.activity);
      if (domainLabel) li.setAttribute('data-stage-domain', domainLabel);

      var head = el('div', 'stage-head');
      head.appendChild(el('span', 'stage-badge', String(idx + 1)));
      var domNode = el('span', 'stage-domain', 'Stage ' + (idx + 1) + (domainLabel ? ' \u00b7 ' + domainLabel : ''));
      domNode.setAttribute('data-stage-badge', domainLabel);
      head.appendChild(domNode);

      var upBtn = el('button', 'btn btn-small', 'Move up');
      upBtn.type = 'button';
      upBtn.setAttribute('data-stage-up', String(idx));
      upBtn.disabled = idx === 0;
      upBtn.addEventListener('click', function () {
        if (idx <= 0) return;
        var tmp = state.stages[idx - 1];
        state.stages[idx - 1] = state.stages[idx];
        state.stages[idx] = tmp;
        state.arcId = '';
        remember();
        drawStageList({ idx: idx - 1, role: idx - 1 === 0 ? 'down' : 'up' });
        announce('Moved stage ' + st.label + ' to position ' + idx + '.');
      });

      var downBtn = el('button', 'btn btn-small', 'Move down');
      downBtn.type = 'button';
      downBtn.setAttribute('data-stage-down', String(idx));
      downBtn.disabled = idx >= count - 1;
      downBtn.addEventListener('click', function () {
        if (idx >= state.stages.length - 1) return;
        var tmp = state.stages[idx + 1];
        state.stages[idx + 1] = state.stages[idx];
        state.stages[idx] = tmp;
        state.arcId = '';
        remember();
        drawStageList({ idx: idx + 1, role: idx + 1 >= state.stages.length - 1 ? 'up' : 'down' });
        announce('Moved stage ' + st.label + ' to position ' + (idx + 2) + '.');
      });

      var remBtn = el('button', 'btn btn-small', 'Remove');
      remBtn.type = 'button';
      remBtn.setAttribute('data-stage-remove', String(idx));
      remBtn.disabled = count <= builder.MIN_STAGES;
      remBtn.addEventListener('click', function () {
        if (state.stages.length <= builder.MIN_STAGES) return;
        var removed = state.stages.splice(idx, 1)[0];
        state.arcId = '';
        remember();
        var nextIdx = Math.min(idx, state.stages.length - 1);
        drawStageList({ idx: nextIdx, role: 'label' });
        announce('Removed stage ' + (removed ? removed.label : '') + '.');
      });

      var ctrls = el('div', 'stage-controls');
      ctrls.appendChild(upBtn);
      ctrls.appendChild(downBtn);
      ctrls.appendChild(remBtn);

      var top = el('div', 'stage-top');
      top.appendChild(head);
      top.appendChild(ctrls);
      li.appendChild(top);

      var isMaze = st.activity === 'maze_reading';
      var fields = el('div', 'stage-fields' + (isMaze ? ' has-limit' : ''));
      var lblField = el('div', 'field');
      var lblId = 'f-stage-label-' + idx;
      var lbl = el('label', '', 'Stage ' + (idx + 1) + ' heading');
      lbl.setAttribute('for', lblId);
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.id = lblId;
      inp.maxLength = 80;
      inp.autocomplete = 'off';
      inp.value = st.label || '';
      inp.addEventListener('input', function (e) {
        st.label = e.target.value;
        remember();
      });
      lblField.appendChild(lbl);
      lblField.appendChild(inp);
      fields.appendChild(lblField);

      if (isMaze) {
        var limField = el('div', 'field');
        var limId = 'f-stage-limit-' + idx;
        var limLbl = el('label', '', 'Maze blanks');
        limLbl.setAttribute('for', limId);
        var limSel = document.createElement('select');
        limSel.id = limId;
        [['4', '4 blanks'], ['6', '6 blanks'], ['10', '10 blanks'], ['0', 'All blanks']].forEach(function (pair) {
          var o = document.createElement('option');
          o.value = pair[0];
          o.textContent = pair[1];
          limSel.appendChild(o);
        });
        limSel.value = String(st.maxItems != null ? st.maxItems : 6);
        limSel.addEventListener('change', function (e) {
          st.maxItems = Math.max(0, Math.floor(Number(e.target.value) || 0));
          delete st.items;
          remember();
        });
        limField.appendChild(limLbl);
        limField.appendChild(limSel);
        fields.appendChild(limField);
      }

      li.appendChild(fields);
      if (summaryText) {
        var sumNode = el('p', 'hint stage-summary', summaryText);
        sumNode.setAttribute('data-stage-summary', '');
        li.appendChild(sumNode);
      }
      list.appendChild(li);
      focusRefs.push({ up: upBtn, down: downBtn, rem: remBtn, label: inp });
    });

    if (focusTarget && focusRefs[focusTarget.idx]) {
      var ref = focusRefs[focusTarget.idx];
      var node = ref[focusTarget.role] || ref.label;
      if (node && !node.disabled) {
        try { node.focus(); } catch (_) {}
      } else if (ref.label) {
        try { ref.label.focus(); } catch (_) {}
      }
    }
  }

  function drawStep2() {
    drawAddStageSelect();
    drawStageList(null);
    $('f-adaptive').checked = !!state.adaptiveScaffold;
    drawBilingualPills();
    $('f-glossary').value = state.glossaryText || '';
    $('f-station-mode').checked = !!state.stationMode;
    $('f-qr-key').value = state.qrPublicKey || '';
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountQrKeyHelper === 'function') window.AlloPacketHandoff.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto });
    updateSupportsSummary();
    setText('step-2-problem', '');
  }

  function validateStep2() {
    if (!Array.isArray(state.stages) || state.stages.length < builder.MIN_STAGES) {
      return 'Add at least ' + builder.MIN_STAGES + ' stages before making the unit playlist.';
    }
    if (state.stages.length > builder.MAX_STAGES) {
      return 'A unit playlist can include at most ' + builder.MAX_STAGES + ' stages.';
    }
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && window.AlloPacketQrCrypto && !window.AlloPacketQrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key should start with AFPK1. Leave it blank or paste the key from Sealed QR setup.';
    }
    return '';
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

  function drawPaperSheet(result) {
    var sheet = $('paper-pl-sheet');
    var fold = $('paper-pl-fold');
    if (!sheet) return;
    sheet.textContent = '';
    if (!result || !Array.isArray(result.stages) || !result.stages.length) {
      sheet.setAttribute('data-ready', '0');
      sheet.hidden = true;
      return;
    }

    var titleText = String(state.title || '').trim() || 'Unit Learning Playlist';
    var header = el('div', 'paper-pl-header');
    header.appendChild(el('h4', 'paper-pl-title', titleText + ' \u2014 Unit Passport'));
    header.appendChild(el('p', 'paper-pl-fields', 'Name: ________________________   Date: ______________'));
    sheet.appendChild(header);

    var supportsLine = 'Complete each stage in order and check off your progress as you go.';
    if (state.homeLanguages && state.homeLanguages.length) {
      supportsLine += ' Home-language directions available in file: ' + state.homeLanguages.join(', ') + '.';
    }
    if (state.adaptiveScaffold) {
      supportsLine += ' Step-by-step hints and stretch challenges are turned on.';
    }
    sheet.appendChild(el('p', 'paper-pl-intro', supportsLine));

    var list = el('ol', 'paper-pl-stages');
    result.stages.forEach(function (st, idx) {
      var li = el('li', 'paper-pl-stage');
      var head = el('div', 'paper-pl-stage-head');
      head.appendChild(el('p', 'paper-pl-stage-name', 'Stage ' + (idx + 1) + ': ' + (st.label || st.activity || 'Activity')));
      var countTxt = st.itemCount ? (st.itemCount + (st.itemCount === 1 ? ' item' : ' items')) : '';
      var metaBits = [st.domain || '', countTxt].filter(Boolean);
      if (metaBits.length) head.appendChild(el('span', 'paper-pl-stage-meta', metaBits.join(' \u00b7 ')));
      li.appendChild(head);

      var checks = el('div', 'paper-pl-checks');
      ['Started', 'Finished stage', 'Checked feedback'].forEach(function (lbl) {
        var c = el('span', 'paper-pl-check');
        var bx = el('span', 'paper-pl-box');
        bx.setAttribute('aria-hidden', 'true');
        c.appendChild(bx);
        c.appendChild(el('span', '', lbl));
        checks.appendChild(c);
      });
      li.appendChild(checks);
      li.appendChild(el('p', 'paper-pl-note', 'My quick note or question: ________________________________________________'));
      list.appendChild(li);
    });
    sheet.appendChild(list);

    var foot = el('div', 'paper-pl-footer');
    var endCheck = el('span', 'paper-pl-check');
    var endBx = el('span', 'paper-pl-box');
    endBx.setAttribute('aria-hidden', 'true');
    endCheck.appendChild(endBx);
    endCheck.appendChild(el('span', '', 'All ' + result.stages.length + ' stages completed and final work saved.'));
    foot.appendChild(endCheck);
    foot.appendChild(el('p', 'paper-pl-note', 'One support that helped me during this unit: ________________________________________'));
    sheet.appendChild(foot);

    sheet.setAttribute('data-ready', '1');
    sheet.hidden = !(fold && fold.open);
  }

  function buildNow() {
    resetPreview();
    built = null;
    $('build-problem').hidden = true;
    $('summary').hidden = true;
    $('save').hidden = true;
    $('try').hidden = true;
    $('after-save').hidden = true;
    $('making').hidden = false;
    drawPaperSheet(null);
    setText('making-line', 'Assembling the unit playlist in this browser tab...');

    try {
      var list = batchList();
      var singleCode = list.names.length === 1 ? list.names[0] : '';
      var qrKey = String(state.qrPublicKey || '').trim() || undefined;
      var result = builder.buildPlaylistPacket({
        loader: loader,
        arcId: state.arcId || undefined,
        title: String(state.title || '').trim() || 'Unit Learning Playlist',
        stages: state.stages,
        adaptiveScaffold: !!state.adaptiveScaffold,
        homeLanguages: state.homeLanguages.slice(),
        bilingualGlossary: parseGlossaryText(state.glossaryText),
        stationMode: !!state.stationMode,
        qrPublicKey: qrKey,
        qrCrypto: window.AlloPacketQrCrypto,
        stationBilingual: bilingualMod,
        learner: singleCode,
      });
      built = result;
      $('making').hidden = true;
      $('summary').hidden = false;
      $('save').hidden = false;
      $('try').hidden = false;

      setText('summary-facts', result.name + ' (' + fileSize(result.bytes) + ') \u2014 ' + result.stages.length + ' stages, ' + result.itemCount + ' items, offline single file.');
      setText('making-said', 'The file is ready: ' + result.name);

      var rows = $('summary-rows');
      rows.textContent = '';
      var addRow = function (k, v) {
        rows.appendChild(el('dt', '', k));
        rows.appendChild(el('dd', '', v));
      };
      addRow('Unit stages', result.stages.map(function (s, i) { return (i + 1) + '. ' + s.label; }).join(' \u2192 '));
      var subjList = [];
      result.stages.forEach(function (s) {
        var d = s.domain || (builder && typeof builder.describeActivity === 'function' && builder.describeActivity(s.activity) && builder.describeActivity(s.activity).domain) || '';
        if (d && subjList.indexOf(d) < 0) subjList.push(d);
      });
      if (subjList.length) addRow('Subjects', subjList.join(', '));
      addRow('Total items', String(result.itemCount));
      addRow('Mastery branching', state.adaptiveScaffold ? 'On (deterministic hints & stretch items)' : 'Off');
      addRow('File size', fileSize(result.bytes));
      addRow('Home languages', state.homeLanguages.length ? state.homeLanguages.join(', ') : 'English only');
      addRow('Station Mode', state.stationMode ? 'On (shared-device reset)' : 'Off');
      addRow('Sealed QR', qrKey ? 'Enabled' : 'Off');
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
      drawPaperSheet(result);
      drawBatch();
    } catch (err) {
      $('making').hidden = true;
      $('build-problem').hidden = false;
      setText('build-problem-text', (err && err.message) || 'Could not build the unit playlist.');
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
        var fname = builder.fileName(built.lesson.title, who);
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
    state.arcId = res.arcId || '';
    state.title = res.title || state.title;
    state.stages = Array.isArray(res.stages) && res.stages.length >= builder.MIN_STAGES ? res.stages.slice(0, builder.MAX_STAGES) : state.stages;
    state.adaptiveScaffold = !!res.adaptiveScaffold;
    state.homeLanguages = Array.isArray(res.homeLanguages) ? res.homeLanguages.slice() : [];
    state.glossaryText = formatGlossaryText(res.bilingualGlossary || {});
    state.stationMode = !!res.stationMode;
    state.qrPublicKey = typeof res.qrPublicKey === 'string' ? res.qrPublicKey : '';
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    remember();
    gotoStep(2, false);
  }

  function applyDraft(draft) {
    if (!draft || typeof draft !== 'object' || draft.kind !== 'playlist') return;
    if (draft.arcId && builder.arcById(draft.arcId)) {
      var arc = builder.arcById(draft.arcId);
      state.arcId = arc.id;
      state.title = draft.title || arc.title;
      state.stages = stagesForArc(arc);
    } else if (Array.isArray(draft.stageIds) && draft.stageIds.length >= builder.MIN_STAGES) {
      state.arcId = '';
      state.title = draft.title || 'Unit Learning Playlist';
      state.stages = draft.stageIds.slice(0, builder.MAX_STAGES).map(stageEntryFromCatalog).filter(Boolean);
    }
    if (typeof draft.adaptiveScaffold === 'boolean') state.adaptiveScaffold = draft.adaptiveScaffold;
    if (Array.isArray(draft.homeLanguages)) {
      state.homeLanguages = draft.homeLanguages.filter(function (c) { return /^(es|pt|fr|ar|vi|zh)$/.test(c); });
    } else {
      state.homeLanguages = [];
    }
    state.glossaryText = '';
    state.stationMode = false;
    state.qrPublicKey = '';
    if ($('f-batch-names')) $('f-batch-names').value = '';
    remember();
    gotoStep(2, false);
    showReopenNote('Loaded starter playlist "' + state.title + '" from the Starter Pack Library.', [], null);
  }

  var reopenPending = null;

  function handleReopenBytes(bytes, fileName) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var res = builder.readPlaylistPacket(u8, verifyCore);
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(u8, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-playlist.html') ? owner : res.page;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && targetPage.href !== 'packets-playlist.html') {
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
    showReopenNote('Loaded "' + res.title + '" (' + res.stages.length + ' stages) into the editor.', res.notes, null);
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
    reader.onerror = function () { reopenPending = null; showReopenNote('This browser could not read that file.', [], null); };
    reader.readAsArrayBuffer(file);
  }

  function checkHandoff() {
    var handoff = window.AlloPacketHandoff;
    if (!handoff) return;
    var h = window.location.hash;
    if (h === (handoff.DRAFT_HASH || '#import-draft') && typeof handoff.takeDraft === 'function') {
      try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
      handoff.takeDraft().then(function (draft) {
        if (draft) applyDraft(draft);
      }, function () {});
    } else if (h === (handoff.HASH || '#open-file') && typeof handoff.take === 'function') {
      try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
      handoff.take().then(function (file) {
        if (file && file.bytes) handleReopenBytes(file.bytes, file.name);
      }, function () {});
    }
  }

  function wireEvents() {
    $('btn-add-stage').addEventListener('click', function () {
      if (state.stages.length >= builder.MAX_STAGES) return;
      var stageId = $('f-add-stage').value;
      var entry = stageEntryFromCatalog(stageId);
      if (!entry) return;
      state.stages.push(entry);
      state.arcId = '';
      remember();
      var addedIdx = state.stages.length - 1;
      drawStageList({ idx: addedIdx, role: 'label' });
      announce('Added stage ' + entry.label + '.');
    });

    $('f-adaptive').addEventListener('change', function (e) { state.adaptiveScaffold = !!e.target.checked; remember(); updateSupportsSummary(); });
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
      var prevSingle = built && built.learner ? built.learner : '';
      drawBatch();
      if (step === 3 && nextSingle !== prevSingle) buildNow();
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

    var paperFold = $('paper-pl-fold');
    if (paperFold) {
      paperFold.addEventListener('toggle', function () {
        var sheet = $('paper-pl-sheet');
        if (sheet) sheet.hidden = !(paperFold.open && sheet.getAttribute('data-ready') === '1');
      });
    }
    var paperBtn = $('print-paper-pl');
    if (paperBtn) {
      paperBtn.addEventListener('click', function () {
        if (!built) buildNow();
        var sheet = $('paper-pl-sheet');
        if (!sheet || sheet.getAttribute('data-ready') !== '1') return;
        if (paperFold) paperFold.open = true;
        sheet.hidden = false;
        announce('Opening print dialog for the student unit passport.');
        try { window.print(); } catch (_) {}
      });
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
      if ($('f-batch-names')) $('f-batch-names').value = '';
      if ($('f-qr-key') && $('f-qr-key')._alloQrHelper) $('f-qr-key')._alloQrHelper.sync('');
      setText('forget-said', 'Choices removed on this device.');
      gotoStep(1, false);
    });
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    builder = window.AlloPacketPlaylist || null;
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
