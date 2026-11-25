// Educator maker controller for packets-maze.html (CBM-Maze 3-Minute Reading Comprehension Probes).
// Runs entirely in this browser tab. Zero network, zero cookies, zero markup strings.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-maze/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;

  var $ = function (id) { return document.getElementById(id); };
  var maze = null;
  var loader = null;
  var bilingualMod = null;
  var verifyCore = null;
  var wordlist = null;
  var step = 1;
  var built = null;
  var builtLearner = '';
  var previewSession = null;
  var previewUrl = '';
  var activeBlankIdx = -1;
  var activeBandFilter = 'all';
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
    splitLines(text).slice(0, 40).forEach(function (line) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      var en = parts[0] || '';
      if (!en) return;
      var translations = {};
      parts.slice(1).forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx > 0) {
          var code = pair.slice(0, idx).trim().toLowerCase();
          var val = pair.slice(idx + 1).trim();
          if (code && val) translations[code] = val;
        }
      });
      if (Object.keys(translations).length) out[en] = translations;
    });
    return out;
  }

  function formatGlossaryText(map) {
    if (!map || typeof map !== 'object') return '';
    return Object.keys(map).map(function (word) {
      var t = map[word] && typeof map[word] === 'object' ? map[word] : {};
      var pairs = Object.keys(t).map(function (code) { return code + ':' + t[code]; });
      return [word].concat(pairs).join(' | ');
    }).join('\n');
  }

  function defaultState() {
    var first = maze.passages()[0];
    return {
      passageId: first.id,
      title: first.title,
      passage: first.passage,
      mode: 'probe',
      everyN: maze.DEFAULT_EVERY_N,
      form: 'Form A',
      timeMin: 3,
      untimed: false,
      includeWarmup: true,
      overrides: {},
      homeLanguages: [],
      glossaryText: '',
      stationMode: false,
      qrPublicKey: '',
    };
  }

  function remember() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function recall() {
    var base = defaultState();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw, function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
      if (!parsed || typeof parsed !== 'object') return base;
      var next = Object.assign(base, parsed);
      if (!next.overrides || typeof next.overrides !== 'object' || Array.isArray(next.overrides)) next.overrides = {};
      if (!Array.isArray(next.homeLanguages)) next.homeLanguages = [];
      return next;
    } catch (_) {
      return base;
    }
  }

  function currentGenerated() {
    return maze.generateMaze(state.passage, {
      everyN: state.everyN,
      wordlist: wordlist,
      overrides: state.overrides,
    });
  }

  function updatePassageStats() {
    var gen = currentGenerated();
    setText(
      'passage-stats',
      gen.stats.totalWords + ' words total (' + gen.stats.sentenceOneWords + ' in intact sentence 1) \u2192 ' +
      gen.stats.targetCount + ' Maze blanks at every ' + gen.everyN + 'th eligible word.'
    );
  }

  function updateSupportsSummary() {
    var langs = Array.isArray(state.homeLanguages) ? state.homeLanguages : [];
    var parts = [langs.length ? (langs.length + ' home language' + (langs.length === 1 ? '' : 's')) : 'English only'];
    if (state.stationMode) parts.push('Station Mode on');
    if (String(state.qrPublicKey || '').trim()) parts.push('Sealed QR on');
    setText('supports-now', parts.join(' | '));
  }

  function drawBandFilter() {
    var bar = $('passage-band-bar');
    if (!bar) return;
    bar.textContent = '';
    var opts = [{ key: 'all', label: 'All (' + maze.passages().length + ')', aria: 'All readability bands (' + maze.passages().length + ' passages)' }];
    if (typeof maze.benchmarkBands === 'function') {
      maze.benchmarkBands().forEach(function (b) {
        opts.push({ key: b.bandKey, label: b.gradeBand, aria: b.gradeBand + ' (Forms A, B, and C)' });
      });
    }
    opts.forEach(function (opt) {
      var pill = el('button', 'band-pill', opt.label);
      pill.type = 'button';
      pill.setAttribute('data-band-filter', opt.key);
      pill.setAttribute('aria-label', opt.aria);
      pill.setAttribute('aria-pressed', activeBandFilter === opt.key ? 'true' : 'false');
      pill.addEventListener('click', function () {
        activeBandFilter = opt.key;
        drawBandFilter();
        drawPassages();
      });
      bar.appendChild(pill);
    });
  }

  function drawPassages() {
    var host = $('passage-list');
    if (!host) return;
    host.textContent = '';
    var list = maze.passages().filter(function (p) {
      return activeBandFilter === 'all' || p.bandKey === activeBandFilter;
    });
    list.forEach(function (p) {
      var btn = el('button', 'template-card');
      btn.type = 'button';
      btn.setAttribute('data-passage-id', p.id);
      btn.setAttribute('aria-pressed', state.passageId === p.id ? 'true' : 'false');
      var tags = el('span', 'template-tags');
      tags.appendChild(el('span', 'template-tag', p.gradeBand));
      if (p.form) tags.appendChild(el('span', 'template-form-tag', 'Form ' + p.form));
      btn.appendChild(tags);
      btn.appendChild(el('span', 'template-name', p.title));
      btn.appendChild(el('span', 'template-summary', p.summary));
      btn.addEventListener('click', function () {
        state.passageId = p.id;
        state.title = p.title;
        state.passage = p.passage;
        state.everyN = p.everyN || maze.DEFAULT_EVERY_N;
        if (p.form) state.form = p.form;
        state.overrides = {};
        activeBlankIdx = -1;
        remember();
        drawStep1();
        announce('Loaded ' + p.gradeBand + ' Form ' + (p.form || 'A') + ': ' + p.title + '.');
      });
      host.appendChild(btn);
    });
  }

  function drawStep1() {
    drawBandFilter();
    drawPassages();
    $('f-passage').value = state.passage || '';
    var radios = document.querySelectorAll('input[name="mode"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = radios[i].value === state.mode;
    }
    var isProbe = state.mode === 'probe';
    $('check-opts').hidden = !isProbe;
    $('f-form').value = state.form || 'Form A';
    $('f-time-min').value = String(state.timeMin || 3);
    $('f-time-min').disabled = !!state.untimed;
    $('f-untimed').checked = !!state.untimed;
    $('f-warmup').checked = state.includeWarmup !== false;
    updatePassageStats();
  }

  function drawBilingualPills() {
    var host = $('bilingual-langs');
    if (!host || !bilingualMod || !bilingualMod.LANGUAGES) return;
    var codes = Array.isArray(bilingualMod.SUPPORTED_LANGUAGES) ? bilingualMod.SUPPORTED_LANGUAGES : Object.keys(bilingualMod.LANGUAGES);
    host.textContent = '';
    codes.forEach(function (code) {
      var lang = bilingualMod.LANGUAGES[code];
      if (!lang) return;
      var on = state.homeLanguages.indexOf(lang.code) >= 0;
      var lbl = el('label', 'pill' + (on ? ' is-on' : ''));
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = lang.code;
      cb.checked = on;
      cb.setAttribute('data-lang-code', lang.code);
      cb.addEventListener('change', function () {
        var idx = state.homeLanguages.indexOf(lang.code);
        if (cb.checked && idx < 0) state.homeLanguages.push(lang.code);
        else if (!cb.checked && idx >= 0) state.homeLanguages.splice(idx, 1);
        lbl.className = 'pill' + (cb.checked ? ' is-on' : '');
        remember();
        updateSupportsSummary();
      });
      lbl.appendChild(cb);
      lbl.appendChild(el('span', 'pill-name', lang.nativeName));
      lbl.appendChild(el('span', 'pill-ex', lang.name + (lang.dir === 'rtl' ? ' (RTL)' : '')));
      host.appendChild(lbl);
    });
  }

  function drawStep2PreviewAndTargets() {
    var gen = currentGenerated();
    setText(
      'maze-summary-note',
      gen.items.length + ' Maze blanks ready (every ' + gen.everyN + 'th eligible word; first sentence intact).'
    );

    // 1. Live inline preview with clickable blank pills
    var prevHost = $('maze-preview');
    prevHost.textContent = '';
    if (!gen.items.length) {
      prevHost.appendChild(el('p', 'hint', 'Add at least two sentences in Step 1 to preview Maze blanks.'));
    } else {
      gen.items.forEach(function (it, idx) {
        if (it.before) prevHost.appendChild(document.createTextNode(it.before));
        var pill = el('button', 'maze-pill', '#' + it.blankNum + ' [' + it.choices.join(' / ') + ']');
        pill.type = 'button';
        pill.setAttribute('data-preview-blank', String(idx));
        pill.addEventListener('click', function () {
          activeBlankIdx = idx;
          var targetInput = $('mz-edit-' + idx + '-0');
          highlightActiveRow();
          if (targetInput && typeof targetInput.focus === 'function') {
            targetInput.focus();
            if (typeof targetInput.scrollIntoView === 'function') targetInput.scrollIntoView({ block: 'nearest' });
          }
        });
        prevHost.appendChild(pill);
        if (idx === gen.items.length - 1 && it.after) {
          prevHost.appendChild(document.createTextNode(it.after));
        }
      });
    }

    // 2. Editable choice rows for each target blank
    var tgtHost = $('maze-targets');
    tgtHost.textContent = '';
    gen.items.forEach(function (it, idx) {
      var ansLow = String(it.answer || '').toLowerCase();
      var distractors = it.choices.filter(function (c) { return c.toLowerCase() !== ansLow; });
      while (distractors.length < 2) distractors.push('');
      var answerPos = it.choices.findIndex(function (c) { return c.toLowerCase() === ansLow; });
      if (answerPos < 0) answerPos = 0;

      var row = el('div', 'maze-target-row' + (activeBlankIdx === idx ? ' is-active' : ''));
      row.setAttribute('data-target-row', String(idx));

      var rawBefore = String(it.before || '').replace(/\s+/g, ' ').trim();
      var rawAfter = String(it.after || '').replace(/\s+/g, ' ').trim();
      var beforePart = rawBefore.length > 40 ? '\u2026 ' + rawBefore.slice(-40).replace(/^\S*\s+/, '') : rawBefore;
      var afterPart = rawAfter.length > 40 ? rawAfter.slice(0, 40).replace(/\s+\S*$/, '') + ' \u2026' : rawAfter;
      var ctxSnippet = (beforePart + ' [___] ' + afterPart).replace(/\s+/g, ' ').trim();
      var head = el('p', 'maze-target-head');
      head.appendChild(el('strong', '', 'Blank #' + it.blankNum + ': '));
      head.appendChild(document.createTextNode(ctxSnippet));
      row.appendChild(head);

      var inputsWrap = el('div', 'maze-target-inputs');
      var vals = [it.answer, distractors[0], distractors[1]];
      var fieldLabels = ['Correct word', 'Distractor 1', 'Distractor 2'];

      var commitRow = function () {
        var c0 = String(($('mz-edit-' + idx + '-0') || {}).value || '').trim();
        var c1 = String(($('mz-edit-' + idx + '-1') || {}).value || '').trim();
        var c2 = String(($('mz-edit-' + idx + '-2') || {}).value || '').trim();
        var rowErr = '';
        if (!c0 || !c1 || !c2) {
          rowErr = 'Blank #' + it.blankNum + ' needs all 3 words filled in.';
        } else {
          var uniq = [c0.toLowerCase(), c1.toLowerCase(), c2.toLowerCase()];
          if (uniq[0] === uniq[1] || uniq[0] === uniq[2] || uniq[1] === uniq[2]) {
            rowErr = 'Blank #' + it.blankNum + ' needs 3 distinct words.';
          }
        }
        if (rowErr) {
          setText('step-2-problem', rowErr);
          return;
        }
        var ordered = [c1, c2];
        ordered.splice(answerPos, 0, c0);
        state.overrides[idx] = { choices: ordered, answer: c0 };
        remember();
        var pill = prevHost.querySelector('[data-preview-blank="' + idx + '"]');
        if (pill) pill.textContent = '#' + it.blankNum + ' [' + ordered.join(' / ') + ']';
        setText('step-2-problem', validateTargetInputs());
      };

      fieldLabels.forEach(function (lblText, fi) {
        var f = el('div', 'field');
        var id = 'mz-edit-' + idx + '-' + fi;
        var lbl = el('label', '', lblText + ' (blank ' + it.blankNum + ')');
        lbl.setAttribute('for', id);
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.id = id;
        inp.maxLength = 36;
        inp.autocomplete = 'off';
        inp.value = vals[fi];
        inp.setAttribute('data-mz-edit-blank', String(idx));
        inp.setAttribute('data-mz-edit-slot', String(fi));
        inp.addEventListener('input', commitRow);
        f.appendChild(lbl);
        f.appendChild(inp);
        inputsWrap.appendChild(f);
      });

      row.appendChild(inputsWrap);
      tgtHost.appendChild(row);
    });
  }

  function highlightActiveRow() {
    var rows = document.querySelectorAll('#maze-targets .maze-target-row');
    for (var i = 0; i < rows.length; i++) {
      rows[i].className = 'maze-target-row' + (Number(rows[i].getAttribute('data-target-row')) === activeBlankIdx ? ' is-active' : '');
    }
  }

  function drawStep2() {
    $('f-every-n').value = String(state.everyN || maze.DEFAULT_EVERY_N);
    $('f-glossary').value = state.glossaryText || '';
    $('f-station-mode').checked = !!state.stationMode;
    $('f-qr-key').value = state.qrPublicKey || '';
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountQrKeyHelper === 'function') window.AlloPacketHandoff.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto });
    drawBilingualPills();
    updateSupportsSummary();
    drawStep2PreviewAndTargets();
  }

  function validateStep1() {
    var gen = currentGenerated();
    if (!String(state.passage || '').trim()) return 'Enter or select a reading passage first.';
    if (gen.items.length < 2) return 'The passage needs at least two sentences with enough words to create 2 or more Maze blanks.';
    var tc = String(($('f-teacher-code') && $('f-teacher-code').value) || '').trim();
    if (state.mode === 'probe' && tc && (tc.length < 4 || tc.length > 64)) {
      return 'The teacher code must be 4 to 64 characters (or leave it empty).';
    }
    return '';
  }

  function validateTargetInputs() {
    var rows = document.querySelectorAll('#maze-targets [data-target-row]');
    for (var i = 0; i < rows.length; i++) {
      var idx = Number(rows[i].getAttribute('data-target-row'));
      var c0 = String(($('mz-edit-' + idx + '-0') || {}).value || '').trim();
      var c1 = String(($('mz-edit-' + idx + '-1') || {}).value || '').trim();
      var c2 = String(($('mz-edit-' + idx + '-2') || {}).value || '').trim();
      if (!c0 || !c1 || !c2) {
        return 'Blank #' + (idx + 1) + ' needs all 3 words filled in.';
      }
      var uniq = [c0.toLowerCase(), c1.toLowerCase(), c2.toLowerCase()];
      if (uniq[0] === uniq[1] || uniq[0] === uniq[2] || uniq[1] === uniq[2]) {
        return 'Blank #' + (idx + 1) + ' needs 3 distinct words.';
      }
    }
    return '';
  }

  function validateStep2() {
    var p1 = validateStep1();
    if (p1) return p1;
    var targetsErr = validateTargetInputs();
    if (targetsErr) return targetsErr;
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && window.AlloPacketQrCrypto && !window.AlloPacketQrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key must start with AFPK1.';
    }
    return '';
  }

  function resetPreview() {
    if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch (_) {} previewUrl = ''; }
    if (previewSession && typeof previewSession.stop === 'function') {
      try { previewSession.stop(); } catch (_) {}
    }
    previewSession = null;
  }

  function batchList() {
    var seen = Object.create(null);
    var out = { names: [], twice: [], over: 0 };
    var raw = String(($('f-batch-names') && $('f-batch-names').value) || '').replace(/^\uFEFF/, '');
    raw.split(/\r?\n/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var name = maze.codeName(trimmed);
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
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

  function buildNow() {
    resetPreview();
    built = null;
    builtLearner = '';
    $('build-problem').hidden = true;
    $('summary').hidden = true;
    $('save').hidden = true;
    $('try').hidden = true;
    if ($('download-docx')) $('download-docx').hidden = true;
    $('after-save').hidden = true;
    $('making').hidden = false;
    setText('making-line', 'Building the Maze file in this browser tab...');

    try {
      var gen = currentGenerated();
      var list = batchList();
      var singleCode = list.names.length === 1 ? list.names[0] : '';
      var teacherCode = String(($('f-teacher-code') && $('f-teacher-code').value) || '').trim();
      var gloss = parseGlossaryText(state.glossaryText);
      var mins = Math.max(1, Math.min(30, Number(state.timeMin) || 3));
      var res = maze.buildMazePacket({
        title: state.title || 'CBM-Maze Reading Probe',
        passage: state.passage,
        generated: gen,
        everyN: state.everyN,
        mode: state.mode,
        form: state.form || 'Form A',
        timeLimitS: state.untimed ? null : mins * 60,
        untimed: !!state.untimed,
        includeWarmup: state.includeWarmup !== false,
        teacherCode: state.mode === 'probe' && teacherCode ? teacherCode : undefined,
        homeLanguages: state.homeLanguages.length ? state.homeLanguages : undefined,
        bilingualGlossary: Object.keys(gloss).length ? gloss : undefined,
        stationMode: !!state.stationMode,
        qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
        learner: singleCode,
        loader: loader,
        stationBilingual: bilingualMod,
        qrCrypto: window.AlloPacketQrCrypto,
      });

      built = res;
      builtLearner = singleCode;
      $('making').hidden = true;
      $('summary').hidden = false;
      $('save').hidden = false;
      $('try').hidden = false;

      var timingText = res.mode === 'probe'
        ? (state.untimed ? 'Untimed accommodation' : (mins + '-minute countdown'))
        : 'Untimed practice';
      setText('summary-facts', res.name + ' (' + fileSize(res.bytes) + ') — ' + res.itemCount + ' Maze blanks, ' + timingText + '.');
      setText('making-said', 'The file is ready: ' + res.name);

      var rows = $('summary-rows');
      rows.textContent = '';
      var addRow = function (k, v) {
        rows.appendChild(el('dt', '', k));
        rows.appendChild(el('dd', '', v));
      };
      addRow('Mode', res.mode === 'probe' ? 'CBM-Maze Check (' + (state.form || 'Form A') + ')' : 'Maze Practice (feedback and retry)');
      addRow('Timing', timingText);
      addRow('Maze blanks', res.itemCount + ' blanks (every ' + state.everyN + 'th eligible word; first sentence intact)');
      if (res.warmupCount) addRow('Warm-up', res.warmupCount + ' practice items before the clock');
      addRow('Scoring', 'measure: maze_correct_3m | net score = max(0, correct - incorrect)');
      addRow('Home languages', state.homeLanguages.length ? state.homeLanguages.join(', ') : 'English only');
      addRow('Station Mode', state.stationMode ? 'On (shared-device kiosk reset)' : 'Off');
      addRow('Sealed QR', String(state.qrPublicKey || '').trim() ? 'Enabled' : 'Off');
      addRow('Network access', 'None (connect-src none)');

      if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        previewUrl = URL.createObjectURL(new Blob([res.html], { type: 'text/html;charset=utf-8' }));
        $('try').setAttribute('href', TRY_PAGE + '#' + previewUrl);
        if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.hostPreview === 'function') {
          previewSession = window.AlloPacketHandoff.hostPreview({ url: previewUrl, html: res.html });
        }
      } else {
        $('try').setAttribute('href', TRY_PAGE);
      }
      drawBatch();
      drawPaperSheet(gen, res);
    } catch (err) {
      $('making').hidden = true;
      $('build-problem').hidden = false;
      setText('build-problem-text', (err && err.message) || 'Could not build the Maze file.');
    }
  }

  function drawPaperSheet(gen, res) {
    var host = $('paper-maze-sheet');
    if (!host) return;
    host.textContent = '';
    if (!gen || !Array.isArray(gen.items) || !gen.items.length || !res) {
      host.removeAttribute('data-ready');
      host.hidden = true;
      if ($('download-docx')) $('download-docx').hidden = true;
      return;
    }
    var includeKey = !$('f-paper-key') || !!$('f-paper-key').checked;
    var mins = Math.max(1, Math.min(30, Number(state.timeMin) || 3));
    var timeLabel = res.mode === 'probe'
      ? (state.untimed ? 'Untimed accommodation' : (mins + ' minutes'))
      : 'Untimed practice';
    var formLabel = res.mode === 'probe' && state.form ? String(state.form).trim() : '';

    var page1 = el('section', 'paper-maze-student');
    var head = el('div', 'paper-maze-header');
    head.appendChild(el('h4', 'paper-maze-title', (res.lesson && res.lesson.title) || state.title || 'Reading Maze'));
    head.appendChild(el('p', 'paper-maze-meta', (formLabel ? formLabel + ' \u00b7 ' : '') + timeLabel + ' \u00b7 ' + gen.items.length + ' blanks'));
    page1.appendChild(head);

    var fields = el('p', 'paper-maze-fields');
    fields.appendChild(el('span', '', 'Name or code: ________________________'));
    fields.appendChild(el('span', '', 'Date: ________________'));
    page1.appendChild(fields);

    page1.appendChild(el(
      'p',
      'paper-maze-dir',
      'Directions: Read the passage quietly. At each bracketed box, circle the one word that makes the best sense in the sentence.' +
      (res.mode === 'probe' && !state.untimed ? ' Work steadily until the ' + mins + '-minute timer ends.' : '')
    ));

    if (res.mode === 'probe' && state.includeWarmup !== false && Array.isArray(maze.WARMUP_ITEMS) && maze.WARMUP_ITEMS.length) {
      var warm = el('div', 'paper-maze-warmup');
      warm.appendChild(el('p', 'paper-maze-warmup-lbl', 'Warm-up practice (does not count)'));
      var wLine = el('p', '');
      maze.WARMUP_ITEMS.forEach(function (wi, idx) {
        if (idx > 0) wLine.appendChild(document.createTextNode(' '));
        if (wi.before) wLine.appendChild(document.createTextNode(wi.before));
        wLine.appendChild(el('span', 'paper-maze-blank', '( ' + wi.choices.join(' / ') + ' )'));
        if (wi.after) wLine.appendChild(document.createTextNode(wi.after));
      });
      warm.appendChild(wLine);
      page1.appendChild(warm);
    }

    var body = el('div', 'paper-maze-body');
    gen.items.forEach(function (it, idx) {
      if (it.before) body.appendChild(document.createTextNode(it.before));
      body.appendChild(el('span', 'paper-maze-blank', it.blankNum + '. ( ' + it.choices.join(' / ') + ' )'));
      if (idx === gen.items.length - 1 && it.after) body.appendChild(document.createTextNode(it.after));
    });
    page1.appendChild(body);
    host.appendChild(page1);

    if (includeKey) {
      var page2 = el('section', 'paper-maze-key');
      page2.appendChild(el('h4', '', 'Teacher scoring key: ' + ((res.lesson && res.lesson.title) || state.title || 'Reading Maze') + (formLabel ? ' (' + formLabel + ')' : '')));
      var tally = el('div', 'paper-maze-tally');
      tally.appendChild(el('span', '', 'Correct: ______'));
      tally.appendChild(el('span', '', 'Incorrect: ______'));
      tally.appendChild(el('span', '', 'Maze net (Correct \u2212 Incorrect, floor 0): ______'));
      page2.appendChild(tally);
      var keyList = el('ol', 'paper-maze-key-list');
      gen.items.forEach(function (it) {
        var li = el('li', '');
        li.appendChild(el('strong', '', it.blankNum + '. ' + it.answer));
        var others = it.choices.filter(function (c) { return c.toLowerCase() !== String(it.answer || '').toLowerCase(); });
        if (others.length) li.appendChild(document.createTextNode('  (' + others.join(', ') + ')'));
        keyList.appendChild(li);
      });
      page2.appendChild(keyList);
      page2.appendChild(el('p', 'hint', 'Tip: Enter paper Maze net scores in Add up results under Add a paper score to plot alongside digital scores.'));
      host.appendChild(page2);
    }

    host.setAttribute('data-ready', '1');
    if ($('download-docx')) $('download-docx').hidden = false;
    var fold = $('paper-maze-fold');
    host.hidden = !(fold && fold.open);
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
      var existing = document.querySelector('script[data-allo-zip="1"]');
      if (existing) {
        if (existing.getAttribute('data-loaded') === '1') { finish(); return; }
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', function () { zipLoadPromise = null; reject(new Error('could not load packets_zip.js')); }, { once: true });
        return;
      }
      var s = document.createElement('script');
      s.src = 'packets_zip.js';
      s.async = true;
      s.setAttribute('data-allo-zip', '1');
      s.addEventListener('load', function () { s.setAttribute('data-loaded', '1'); finish(); }, { once: true });
      s.addEventListener('error', function () { zipLoadPromise = null; reject(new Error('could not load packets_zip.js')); }, { once: true });
      (document.head || document.body || document.documentElement).appendChild(s);
    });
    return zipLoadPromise;
  }

  function ensureDocx() {
    if (window.AlloPacketDocx && typeof window.AlloPacketDocx.buildMazeWorksheetDocx === 'function' && typeof window.AlloPacketDocx.downloadDocx === 'function') {
      return Promise.resolve(window.AlloPacketDocx);
    }
    if (docxLoadPromise) return docxLoadPromise;
    docxLoadPromise = new Promise(function (resolve, reject) {
      var finish = function () {
        if (window.AlloPacketDocx && typeof window.AlloPacketDocx.buildMazeWorksheetDocx === 'function' && typeof window.AlloPacketDocx.downloadDocx === 'function') {
          resolve(window.AlloPacketDocx);
        } else {
          docxLoadPromise = null;
          reject(new Error('Word export helper did not load'));
        }
      };
      var existing = document.querySelector('script[data-allo-docx="1"]');
      if (existing) {
        if (existing.getAttribute('data-loaded') === '1') { finish(); return; }
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', function () { docxLoadPromise = null; reject(new Error('could not load packets_docx.js')); }, { once: true });
        return;
      }
      var s = document.createElement('script');
      s.src = 'packets_docx.js';
      s.async = true;
      s.setAttribute('data-allo-docx', '1');
      s.addEventListener('load', function () { s.setAttribute('data-loaded', '1'); finish(); }, { once: true });
      s.addEventListener('error', function () { docxLoadPromise = null; reject(new Error('could not load packets_docx.js')); }, { once: true });
      (document.head || document.body || document.documentElement).appendChild(s);
    });
    return docxLoadPromise;
  }

  function mazeParagraphsFromGenerated(gen) {
    var paras = [[]];
    var pushText = function (raw) {
      var str = String(raw || '').replace(/\r\n?/g, '\n');
      if (!str) return;
      var parts = str.split(/\n\s*\n+/);
      parts.forEach(function (chunk, idx) {
        if (idx > 0) paras.push([]);
        var clean = chunk.replace(/\n/g, ' ');
        if (clean) paras[paras.length - 1].push({ type: 'text', text: clean });
      });
    };
    (gen && Array.isArray(gen.items) ? gen.items : []).forEach(function (it, idx, arr) {
      if (it.before) pushText(it.before);
      paras[paras.length - 1].push({
        type: 'blank',
        num: it.blankNum,
        choices: Array.isArray(it.choices) ? it.choices.slice() : [],
        answer: it.answer || '',
      });
      if (idx === arr.length - 1 && it.after) pushText(it.after);
    });
    return paras.filter(function (p) { return p.length > 0; });
  }

  function downloadDocx() {
    if (!built) return;
    var gen = currentGenerated();
    if (!gen || !Array.isArray(gen.items) || !gen.items.length) return;
    var btn = $('download-docx');
    var prevText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Building Word file...'; }
    var restore = function () {
      if (btn) { btn.disabled = false; btn.textContent = prevText || 'Download Word (.docx)'; }
    };
    Promise.all([ensureZip(), ensureDocx()]).then(function (mods) {
      var zipMod = mods[0], docxMod = mods[1];
      var includeKey = !$('f-paper-key') || !!$('f-paper-key').checked;
      var mins = Math.max(1, Math.min(30, Number(state.timeMin) || 3));
      var timeLimitLabel = built.mode === 'probe'
        ? (state.untimed ? 'Untimed accommodation' : (mins + ' minutes'))
        : 'Untimed practice';
      var formLabel = built.mode === 'probe' && state.form ? String(state.form).trim() : '';
      var title = (built.lesson && built.lesson.title) || state.title || 'Reading Maze';
      var wordCount = (gen.stats && Number(gen.stats.totalWords)) || 0;
      var warmup = (built.mode === 'probe' && state.includeWarmup !== false && Array.isArray(maze.WARMUP_ITEMS) && maze.WARMUP_ITEMS.length)
        ? maze.WARMUP_ITEMS.slice()
        : [];
      var directions = 'Directions: Read the passage quietly. At each bold bracketed group, circle the one word that makes the best sense in the sentence.' +
        (built.mode === 'probe' && !state.untimed ? ' Work steadily until the ' + mins + '-minute timer ends.' : '');
      var densityVal = $('f-docx-density') ? $('f-docx-density').value : 'standard';
      var density = (densityVal === 'primary' || densityVal === 'compact') ? densityVal : 'standard';
      var stem = (built.plain || 'reading-maze').replace(/\.html$/i, '');
      var result = docxMod.buildMazeWorksheetDocx({
        title: title,
        formLabel: formLabel,
        timeLimitLabel: timeLimitLabel,
        wordCount: wordCount,
        directions: directions,
        warmup: warmup,
        paragraphs: mazeParagraphsFromGenerated(gen),
        items: gen.items,
        density: density,
        answerKeyOn: includeKey,
      }, { zip: zipMod, filename: stem + '-maze-worksheet.docx', density: density });
      var ok = docxMod.downloadDocx(result, window, document);
      restore();
      if (!ok) {
        $('build-problem').hidden = false;
        setText('build-problem-text', 'This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
        return;
      }
      announce('Downloaded ' + result.filename + '.');
    }, function (err) {
      restore();
      $('build-problem').hidden = false;
      setText('build-problem-text', 'Could not create the Word file (' + ((err && err.message) || 'unknown error') + ').');
    });
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
        var html = maze.withCodeName(built.baseHtml, who);
        var fname = maze.fileName(built.lesson.title, built.mode, who);
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
    if (next >= 2) {
      var p1 = validateStep1();
      setText('step-1-problem', p1);
      if (p1) return;
    }
    if (next === 3) {
      var p2 = validateStep2();
      setText('step-2-problem', p2);
      if (p2) return;
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

  var reopenPending = null;

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

  function handleReopenBytes(bytes, fileName) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var res = maze.readMazePacket(u8, verifyCore);
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(u8, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-maze.html') ? owner : res.page;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && targetPage.href !== 'packets-maze.html') {
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
    state.passageId = res.passageId || '';
    state.title = res.title || state.title;
    state.passage = res.passage || state.passage;
    state.mode = res.mode || 'probe';
    state.everyN = res.everyN || maze.DEFAULT_EVERY_N;
    state.overrides = res.overrides || {};
    state.form = res.form || 'Form A';
    state.untimed = !!res.untimed;
    state.timeMin = res.timeLimitS ? Math.max(1, Math.round(res.timeLimitS / 60)) : 3;
    state.includeWarmup = res.includeWarmup !== false;
    state.homeLanguages = Array.isArray(res.homeLanguages) ? res.homeLanguages.slice() : [];
    state.glossaryText = formatGlossaryText(res.bilingualGlossary || {});
    state.stationMode = !!res.stationMode;
    state.qrPublicKey = typeof res.qrPublicKey === 'string' ? res.qrPublicKey : '';
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    if ($('f-teacher-code')) $('f-teacher-code').value = '';
    remember();
    gotoStep(2, false);
    showReopenNote('Loaded "' + res.title + '" into the Maze editor.', res.notes, null);
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
    $('f-passage').addEventListener('input', function (e) {
      state.passage = e.target.value;
      state.passageId = '';
      state.overrides = {};
      remember();
      updatePassageStats();
    });

    var modeRadios = document.querySelectorAll('input[name="mode"]');
    for (var mi = 0; mi < modeRadios.length; mi++) {
      modeRadios[mi].addEventListener('change', function (e) {
        state.mode = e.target.value === 'practice' ? 'practice' : 'probe';
        remember();
        drawStep1();
      });
    }

    $('f-form').addEventListener('input', function (e) { state.form = e.target.value; remember(); });
    $('f-time-min').addEventListener('input', function (e) { state.timeMin = Number(e.target.value) || 3; remember(); });
    $('f-untimed').addEventListener('change', function (e) {
      state.untimed = !!e.target.checked;
      $('f-time-min').disabled = state.untimed;
      remember();
    });
    $('f-warmup').addEventListener('change', function (e) { state.includeWarmup = !!e.target.checked; remember(); });

    $('f-every-n').addEventListener('change', function (e) {
      state.everyN = Number(e.target.value) || maze.DEFAULT_EVERY_N;
      state.overrides = {};
      activeBlankIdx = -1;
      remember();
      drawStep2PreviewAndTargets();
    });
    $('reset-overrides').addEventListener('click', function () {
      state.overrides = {};
      activeBlankIdx = -1;
      remember();
      drawStep2PreviewAndTargets();
      announce('Reset all blank choices to automatic selection.');
    });

    $('f-glossary').addEventListener('input', function (e) { state.glossaryText = e.target.value; remember(); updateSupportsSummary(); });
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
    if ($('paper-maze-fold')) {
      $('paper-maze-fold').addEventListener('toggle', function () {
        var sheet = $('paper-maze-sheet');
        if (sheet && sheet.getAttribute('data-ready') === '1') {
          sheet.hidden = !$('paper-maze-fold').open;
        }
      });
    }
    if ($('f-paper-key')) {
      $('f-paper-key').addEventListener('change', function () {
        if (built) drawPaperSheet(currentGenerated(), built);
      });
    }
    if ($('print-paper-maze')) {
      $('print-paper-maze').addEventListener('click', function () {
        if (!built) return;
        drawPaperSheet(currentGenerated(), built);
        if (typeof window.print === 'function') window.print();
      });
    }
    if ($('download-docx')) {
      $('download-docx').addEventListener('click', downloadDocx);
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
      if ($('f-teacher-code')) $('f-teacher-code').value = '';
      if ($('f-qr-key') && $('f-qr-key')._alloQrHelper) $('f-qr-key')._alloQrHelper.sync('');
      setText('forget-said', 'Choices removed on this device.');
      gotoStep(1, false);
    });
  }

  function start() {
    maze = window.AlloPacketMaze || null;
    loader = window.AlloWordSoundsTakeHome || null;
    bilingualMod = window.AlloPacketStationBilingual || null;
    verifyCore = window.AlloPacketVerify || null;
    if (typeof window.createWordSoundsWordlist === 'function') {
      try { wordlist = window.createWordSoundsWordlist(); } catch (_) { wordlist = null; }
    }

    $('loading').hidden = true;
    if (!maze || !loader) {
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
