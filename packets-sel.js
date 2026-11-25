// Educator maker controller for packets-sel.html (First-Then Checklist, Focus Timer, Calm-Down Cards, UDL Reflection).
// Everything runs in this browser tab. Zero network, zero cookies, zero markup strings.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-sel/1';
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

  function splitComma(text) {
    return String(text || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
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
    var ft = builder.defaultStarterFor('sel_first_then').items[0];
    var tm = builder.defaultStarterFor('sel_focus_timer').items[0];
    var cm = builder.defaultStarterFor('sel_calm_toolkit').items[0];
    var ur = builder.defaultStarterFor('sel_udl_reflect').items[0];
    var mix = builder.findStarter('sel_daily_toolkit_mix');
    return {
      starterId: mix.id,
      activity: 'mixed',
      title: mix.title,
      mixedTools: builder.ACTIVITIES.slice(),
      firstThen: {
        firstLabel: ft.firstLabel,
        thenLabel: ft.thenLabel,
        stepsText: ft.steps.join('\n'),
      },
      timer: {
        focusMinutes: tm.focusMinutes,
        breakMinutes: tm.breakMinutes,
        prompt: tm.prompt,
      },
      calm: {
        prompt: cm.prompt,
        breakMinutes: cm.breakMinutes,
        breakCardTitle: cm.breakCardTitle,
      },
      reflect: {
        goalQuestion: ur.goalQuestion,
        nextQuestion: ur.nextQuestion,
        supportsText: ur.supportOptions.map(function (s) { return s.label; }).join(', '),
      },
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
      var parsed = JSON.parse(raw, function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
      if (!parsed || typeof parsed !== 'object') return base;
      if (parsed.activity === 'mixed' || builder.ACTIVITIES.indexOf(parsed.activity) >= 0) base.activity = parsed.activity;
      if (typeof parsed.starterId === 'string') base.starterId = parsed.starterId;
      if (typeof parsed.title === 'string' && parsed.title.trim()) base.title = parsed.title;
      if (Array.isArray(parsed.mixedTools)) {
        var valid = parsed.mixedTools.filter(function (a) { return builder.ACTIVITIES.indexOf(a) >= 0; });
        if (valid.length >= 2) base.mixedTools = valid;
      }
      if (parsed.firstThen && typeof parsed.firstThen === 'object') Object.assign(base.firstThen, parsed.firstThen);
      if (parsed.timer && typeof parsed.timer === 'object') Object.assign(base.timer, parsed.timer);
      if (parsed.calm && typeof parsed.calm === 'object') Object.assign(base.calm, parsed.calm);
      if (parsed.reflect && typeof parsed.reflect === 'object') Object.assign(base.reflect, parsed.reflect);
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
    if (starter.activity === 'mixed') {
      state.mixedTools = builder.ACTIVITIES.slice();
    } else if (Array.isArray(starter.items) && starter.items[0]) {
      var it = starter.items[0];
      if (starter.activity === 'sel_first_then') {
        state.firstThen = { firstLabel: it.firstLabel, thenLabel: it.thenLabel, stepsText: (it.steps || []).join('\n') };
      } else if (starter.activity === 'sel_focus_timer') {
        state.timer = { focusMinutes: it.focusMinutes || 5, breakMinutes: it.breakMinutes || 2, prompt: it.prompt || '' };
      } else if (starter.activity === 'sel_calm_toolkit') {
        state.calm = { prompt: it.prompt || '', breakMinutes: it.breakMinutes || 3, breakCardTitle: it.breakCardTitle || '' };
      } else if (starter.activity === 'sel_udl_reflect') {
        state.reflect = {
          goalQuestion: it.goalQuestion || 'What goal did I work on?',
          nextQuestion: it.nextQuestion || 'My next step',
          supportsText: (it.supportOptions || []).map(function (s) { return typeof s === 'string' ? s : s.label; }).join(', '),
        };
      }
    }
    remember();
    drawStep1();
    if (step === 2) drawStep2();
    announce('Loaded starter toolkit: ' + starter.name + '.');
  }

  function drawStarters() {
    var list = $('starter-list');
    if (!list) return;
    list.textContent = '';
    builder.STARTER_SETS.forEach(function (s) {
      var actTitle = s.activity === 'mixed' ? 'All 4 Tools' : (builder.ADAPTERS[s.activity] ? builder.ADAPTERS[s.activity].title : s.activity);
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
    var radios = document.querySelectorAll('input[name="activity"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === state.activity;
    setText('step-1-problem', '');
  }

  function drawPrintPreview() {
    var box = $('ft-print-preview');
    if (!box) return;
    box.textContent = '';
    var b1 = el('div', 'print-preview-box');
    b1.appendChild(el('span', 'print-preview-kicker', 'First'));
    b1.appendChild(el('span', 'print-preview-val', state.firstThen.firstLabel || 'Finish my task steps'));
    var arr = el('span', '', '\u2192');
    arr.setAttribute('aria-hidden', 'true');
    var b2 = el('div', 'print-preview-box');
    b2.appendChild(el('span', 'print-preview-kicker', 'Then'));
    b2.appendChild(el('span', 'print-preview-val', state.firstThen.thenLabel || 'Take a short break'));
    box.appendChild(b1);
    box.appendChild(arr);
    box.appendChild(b2);
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

  function drawStep2() {
    var act = state.activity;
    $('ed-mixed').hidden = act !== 'mixed';
    $('ed-first-then').hidden = !(act === 'sel_first_then' || (act === 'mixed' && state.mixedTools.indexOf('sel_first_then') >= 0));
    $('ed-timer').hidden = !(act === 'sel_focus_timer' || (act === 'mixed' && state.mixedTools.indexOf('sel_focus_timer') >= 0));
    $('ed-calm').hidden = !(act === 'sel_calm_toolkit' || (act === 'mixed' && state.mixedTools.indexOf('sel_calm_toolkit') >= 0));
    $('ed-reflect').hidden = !(act === 'sel_udl_reflect' || (act === 'mixed' && state.mixedTools.indexOf('sel_udl_reflect') >= 0));

    $('f-ft-first').value = state.firstThen.firstLabel || '';
    $('f-ft-then').value = state.firstThen.thenLabel || '';
    $('f-ft-steps').value = state.firstThen.stepsText || '';
    drawPrintPreview();

    $('f-tm-focus').value = String(state.timer.focusMinutes || 5);
    $('f-tm-break').value = String(state.timer.breakMinutes || 2);
    $('f-tm-prompt').value = state.timer.prompt || '';

    $('f-cm-prompt').value = state.calm.prompt || '';
    $('f-cm-mins').value = String(state.calm.breakMinutes || 3);
    $('f-cm-title').value = state.calm.breakCardTitle || '';

    $('f-ur-goal').value = state.reflect.goalQuestion || '';
    $('f-ur-next').value = state.reflect.nextQuestion || '';
    $('f-ur-supports').value = state.reflect.supportsText || '';

    var boxes = document.querySelectorAll('#mixed-tools input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].checked = state.mixedTools.indexOf(boxes[i].value) >= 0;
    }
    setText('mixed-parse-note', state.mixedTools.length < 2
      ? 'Select at least 2 tools for a combined toolkit.'
      : (state.mixedTools.length + ' tools selected.'));

    drawBilingualPills();
    $('f-glossary').value = state.glossaryText || '';
    $('f-station-mode').checked = !!state.stationMode;
    $('f-qr-key').value = state.qrPublicKey || '';
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountQrKeyHelper === 'function') window.AlloPacketHandoff.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto });
    updateSupportsSummary();
    setText('step-2-problem', '');
  }

  function validateStep2() {
    if (state.activity === 'mixed' && state.mixedTools.length < 2) {
      return 'Select at least 2 tools for a combined daily toolkit.';
    }
    var hasFt = state.activity === 'sel_first_then' || (state.activity === 'mixed' && state.mixedTools.indexOf('sel_first_then') >= 0);
    if (hasFt && !splitLines(state.firstThen.stepsText).length) {
      return 'Add at least 1 checklist step before making the file.';
    }
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && window.AlloPacketQrCrypto && !window.AlloPacketQrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key should start with AFPK1. Leave it blank or paste the key from Sealed QR setup.';
    }
    return '';
  }

  function itemFor(act) {
    var def = builder.defaultStarterFor(act).items[0];
    if (act === 'sel_first_then') {
      var steps = splitLines(state.firstThen.stepsText).slice(0, 10);
      return Object.assign({}, def, {
        firstLabel: String(state.firstThen.firstLabel || def.firstLabel).trim(),
        thenLabel: String(state.firstThen.thenLabel || def.thenLabel).trim(),
        steps: steps.length ? steps : def.steps,
      });
    }
    if (act === 'sel_focus_timer') {
      return Object.assign({}, def, {
        focusMinutes: Math.max(1, Math.min(30, Math.floor(Number(state.timer.focusMinutes) || 5))),
        breakMinutes: Math.max(1, Math.min(15, Math.floor(Number(state.timer.breakMinutes) || 2))),
        prompt: String(state.timer.prompt || def.prompt).trim(),
      });
    }
    if (act === 'sel_calm_toolkit') {
      var mins = Math.max(1, Math.min(10, Math.floor(Number(state.calm.breakMinutes) || 3)));
      return Object.assign({}, def, {
        prompt: String(state.calm.prompt || def.prompt).trim(),
        breakMinutes: mins,
        breakCardTitle: String(state.calm.breakCardTitle || def.breakCardTitle).trim(),
        breakCardText: 'I need ' + mins + ' quiet minutes to reset, then I will return to my task.',
      });
    }
    if (act === 'sel_udl_reflect') {
      var known = {};
      (def.supportOptions || []).forEach(function (s) {
        if (s && s.label && s.id) known[s.label.toLowerCase()] = s.id;
      });
      var chips = splitComma(state.reflect.supportsText).slice(0, 10).map(function (lbl, idx) {
        return { id: known[lbl.toLowerCase()] || ('udlChip_' + (idx + 1)), label: lbl };
      });
      return Object.assign({}, def, {
        goalQuestion: String(state.reflect.goalQuestion || def.goalQuestion).trim(),
        nextQuestion: String(state.reflect.nextQuestion || def.nextQuestion).trim(),
        supportOptions: chips.length ? chips : def.supportOptions,
      });
    }
    return def;
  }

  function buildLessonConfig() {
    var starter = builder.findStarter(state.starterId) || builder.defaultStarterFor(state.activity);
    var cfg = {
      starterId: starter ? starter.id : '',
      activity: state.activity,
      title: String(state.title || '').trim() || (starter ? starter.title : 'Focus & UDL Toolkit'),
      homeLanguages: state.homeLanguages.slice(),
      bilingualGlossary: parseGlossaryText(state.glossaryText),
      stationMode: !!state.stationMode,
      qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
    };
    if (state.activity === 'mixed') {
      cfg.blocks = state.mixedTools.map(function (act) {
        return { activity: act, items: [itemFor(act)] };
      });
    } else {
      cfg.items = [itemFor(state.activity)];
    }
    return cfg;
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

  function drawPaperSheet(cfg, result) {
    var sheet = $('paper-sel-sheet');
    var fold = $('paper-sel-fold');
    var docxBtn = $('download-docx');
    if (!sheet) return;
    sheet.textContent = '';
    if (!cfg || !result) {
      sheet.setAttribute('data-ready', '0');
      sheet.hidden = true;
      if (docxBtn) docxBtn.hidden = true;
      return;
    }

    var blocks = cfg.activity === 'mixed' && Array.isArray(cfg.blocks)
      ? cfg.blocks
      : [{ activity: cfg.activity, items: Array.isArray(cfg.items) ? cfg.items : [] }];

    var header = el('div', 'paper-sel-header');
    header.appendChild(el('h4', 'paper-sel-title', cfg.title || 'Focus & UDL Toolkit'));
    header.appendChild(el('p', 'paper-sel-fields', 'Name: ________________________   Date: ______________'));
    sheet.appendChild(header);

    var cards = el('div', 'paper-sel-cards');
    blocks.forEach(function (blk) {
      var item = (blk && Array.isArray(blk.items) && blk.items[0]) ? blk.items[0] : null;
      if (!item) return;

      if (blk.activity === 'sel_first_then') {
        var ftCard = el('div', 'paper-sel-card paper-sel-card-cut');
        ftCard.appendChild(el('p', 'paper-sel-cut-note', 'Cut along dashed border for a desk First-Then strip'));
        var ftGrid = el('div', 'paper-sel-ft-grid');
        var firstBox = el('div', 'paper-sel-ft-box');
        firstBox.appendChild(el('span', 'paper-sel-ft-kicker', 'First'));
        firstBox.appendChild(el('span', 'paper-sel-ft-val', item.firstLabel || 'Finish current task'));
        var arrow = el('span', 'paper-sel-ft-arrow', '\u2192');
        arrow.setAttribute('aria-hidden', 'true');
        var thenBox = el('div', 'paper-sel-ft-box');
        thenBox.appendChild(el('span', 'paper-sel-ft-kicker', 'Then'));
        thenBox.appendChild(el('span', 'paper-sel-ft-val', item.thenLabel || 'Preferred choice or break'));
        ftGrid.appendChild(firstBox);
        ftGrid.appendChild(arrow);
        ftGrid.appendChild(thenBox);
        ftCard.appendChild(ftGrid);

        var ul = el('ul', 'paper-sel-checklist');
        (Array.isArray(item.steps) ? item.steps : []).forEach(function (stepText) {
          var li = el('li');
          var bx = el('span', 'paper-sel-box');
          bx.setAttribute('aria-hidden', 'true');
          li.appendChild(bx);
          li.appendChild(el('span', '', stepText));
          ul.appendChild(li);
        });
        for (var extra = 0; extra < 2; extra++) {
          var blankLi = el('li');
          var blankBx = el('span', 'paper-sel-box');
          blankBx.setAttribute('aria-hidden', 'true');
          blankLi.appendChild(blankBx);
          blankLi.appendChild(el('span', 'paper-sel-line'));
          ul.appendChild(blankLi);
        }
        ftCard.appendChild(ul);
        cards.appendChild(ftCard);
      } else if (blk.activity === 'sel_focus_timer') {
        var tmCard = el('div', 'paper-sel-card');
        tmCard.appendChild(el('p', 'paper-sel-card-title', 'Focus Session Plan (' + (item.focusMinutes || 5) + ' min focus / ' + (item.breakMinutes || 2) + ' min break)'));
        if (item.prompt) tmCard.appendChild(el('p', 'paper-sel-meta', item.prompt));
        var goalLines = el('div', 'paper-sel-write-lines');
        goalLines.appendChild(el('div', 'paper-sel-write-line'));
        tmCard.appendChild(goalLines);
        var rounds = el('div', 'paper-sel-rounds');
        for (var r = 1; r <= 3; r++) {
          var rd = el('span', 'paper-sel-round');
          var rbx = el('span', 'paper-sel-box');
          rbx.setAttribute('aria-hidden', 'true');
          rd.appendChild(rbx);
          rd.appendChild(el('span', '', 'Session ' + r + ' done'));
          rounds.appendChild(rd);
        }
        tmCard.appendChild(rounds);
        cards.appendChild(tmCard);
      } else if (blk.activity === 'sel_calm_toolkit') {
        var cmCard = el('div', 'paper-sel-card paper-sel-card-cut');
        cmCard.appendChild(el('p', 'paper-sel-cut-note', 'Cut along dashed border for a quiet break desk pass'));
        cmCard.appendChild(el('p', 'paper-sel-card-title', item.breakCardTitle || 'Quiet Break Pass'));
        cmCard.appendChild(el('p', '', item.breakCardText || ('I need ' + (item.breakMinutes || 3) + ' quiet minutes to reset, then I will return to my task.')));
        var breath = el('div', 'paper-sel-breath');
        ['1. Breathe in (4)', '2. Hold (4)', '3. Breathe out (4)', '4. Rest (4)'].forEach(function (lbl) {
          breath.appendChild(el('div', 'paper-sel-breath-step', lbl));
        });
        cmCard.appendChild(breath);
        if (item.prompt) cmCard.appendChild(el('p', 'paper-sel-meta', item.prompt));
        cards.appendChild(cmCard);
      } else if (blk.activity === 'sel_udl_reflect') {
        var rfCard = el('div', 'paper-sel-card');
        rfCard.appendChild(el('p', 'paper-sel-card-title', 'My Learning & Supports Check-In'));
        rfCard.appendChild(el('p', '', item.goalQuestion || 'What is one goal you want to focus on?'));
        var gLines = el('div', 'paper-sel-write-lines');
        gLines.appendChild(el('div', 'paper-sel-write-line'));
        gLines.appendChild(el('div', 'paper-sel-write-line'));
        rfCard.appendChild(gLines);

        rfCard.appendChild(el('p', '', 'Check the supports that helped you today:'));
        var chipList = el('ul', 'paper-sel-chips');
        (Array.isArray(item.supportOptions) ? item.supportOptions : []).forEach(function (opt) {
          var cli = el('li');
          var cbx = el('span', 'paper-sel-box');
          cbx.setAttribute('aria-hidden', 'true');
          cli.appendChild(cbx);
          cli.appendChild(el('span', '', opt && opt.label ? opt.label : String(opt || '')));
          chipList.appendChild(cli);
        });
        rfCard.appendChild(chipList);

        rfCard.appendChild(el('p', '', item.nextQuestion || 'What will you try next time?'));
        var nLines = el('div', 'paper-sel-write-lines');
        nLines.appendChild(el('div', 'paper-sel-write-line'));
        nLines.appendChild(el('div', 'paper-sel-write-line'));
        rfCard.appendChild(nLines);
        rfCard.appendChild(el('p', 'paper-sel-meta', 'Private reflection \u2014 keep for yourself or share only if you choose.'));
        cards.appendChild(rfCard);
      }
    });

    sheet.appendChild(cards);
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

  function buildSelDocxPayload(cfg) {
    if (!cfg) return null;
    var blocks = cfg.activity === 'mixed' && Array.isArray(cfg.blocks)
      ? cfg.blocks
      : [{ activity: cfg.activity, items: Array.isArray(cfg.items) ? cfg.items : [] }];
    var sections = [];

    blocks.forEach(function (blk) {
      var item = (blk && Array.isArray(blk.items) && blk.items[0]) ? blk.items[0] : null;
      if (!item) return;

      if (blk.activity === 'sel_first_then') {
        sections.push({
          heading: 'First-Then Board',
          directions: 'Cut along the border for a laminated desk First-Then schedule strip.',
          type: 'first_then',
          first: { label: item.firstLabel || 'Finish current task' },
          then: { label: item.thenLabel || 'Preferred choice or break' },
        });
        sections.push({
          heading: 'Task Steps Checklist',
          directions: 'Check each step as you finish it.',
          type: 'checklist',
          items: Array.isArray(item.steps) ? item.steps.slice() : [],
          writeLines: 2,
        });
      } else if (blk.activity === 'sel_focus_timer') {
        sections.push({
          heading: 'Focus Session Plan (' + (item.focusMinutes || 5) + ' min focus / ' + (item.breakMinutes || 2) + ' min break)',
          directions: item.prompt || 'Write your focus goal and check off each completed work block.',
          type: 'checklist',
          items: ['Session 1 done', 'Session 2 done', 'Session 3 done'],
          writeLines: 2,
        });
      } else if (blk.activity === 'sel_calm_toolkit') {
        sections.push({
          heading: item.breakCardTitle || 'Quiet Break Pass',
          directions: item.prompt || 'Cut out this quiet break pass for desk use.',
          type: 'boxes',
          columns: 1,
          items: [{
            title: item.breakCardTitle || 'Quiet Break Pass',
            detail: item.breakCardText || ('I need ' + (item.breakMinutes || 3) + ' quiet minutes to reset, then I will return to my task.'),
          }],
        });
        sections.push({
          heading: 'Paced Breathing Steps',
          type: 'boxes',
          columns: 4,
          items: [
            { title: '1. Breathe in (4)' },
            { title: '2. Hold (4)' },
            { title: '3. Breathe out (4)' },
            { title: '4. Rest (4)' },
          ],
        });
      } else if (blk.activity === 'sel_udl_reflect') {
        sections.push({
          heading: 'My Learning & Supports Check-In',
          type: 'lines',
          items: [item.goalQuestion || 'What is one goal you want to focus on?'],
          writeLines: 3,
        });
        var supLabels = (Array.isArray(item.supportOptions) ? item.supportOptions : []).map(function (opt) {
          return opt && opt.label ? opt.label : String(opt || '');
        }).filter(Boolean);
        if (supLabels.length) {
          sections.push({
            heading: 'Supports That Helped Me Today',
            type: 'checklist',
            items: supLabels,
          });
        }
        sections.push({
          heading: 'Next Step Reflection',
          directions: 'Private reflection \u2014 keep for yourself or share only if you choose.',
          type: 'lines',
          items: [item.nextQuestion || 'What will you try next time?'],
          writeLines: 3,
        });
      }
    });

    if (!sections.length) return null;
    return {
      title: cfg.title || 'Focus & UDL Toolkit',
      subtitle: 'Private, non-scored executive function and self-monitoring handout',
      kind: cfg.activity || 'sel-toolkit',
      sections: sections,
      answerKeyOn: false,
    };
  }

  function downloadSelDocx() {
    if (!built || !builtCfg) buildNow();
    var payload = buildSelDocxPayload(builtCfg);
    if (!payload) {
      announce('Build a toolkit first to download a Word handout.');
      return Promise.resolve(false);
    }
    var btn = $('download-docx');
    if (btn) btn.disabled = true;
    announce('Preparing Word toolkit handout (.docx)...');
    return ensureDocxTools().then(function (docxLib) {
      if (!docxLib || !window.AlloPacketZip) {
        announce('Could not load the Word handout builder. Load the page again.');
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
      announce('Could not create the Word toolkit handout.');
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
    $('build-problem').hidden = true;
    $('summary').hidden = true;
    $('save').hidden = true;
    $('try').hidden = true;
    $('after-save').hidden = true;
    $('making').hidden = false;
    drawPaperSheet(null, null);
    setText('making-line', 'Building the toolkit file in this browser tab...');

    try {
      var cfg = buildLessonConfig();
      var list = batchList();
      var singleCode = list.names.length === 1 ? list.names[0] : '';
      var result = builder.buildSelPacket(Object.assign({}, cfg, {
        loader: loader,
        stationBilingual: bilingualMod,
        qrCrypto: window.AlloPacketQrCrypto,
        learner: singleCode,
      }));
      built = result;
      builtCfg = cfg;
      $('making').hidden = true;
      $('summary').hidden = false;
      $('save').hidden = false;
      $('try').hidden = false;

      var actTitle = result.activity === 'mixed'
        ? 'Daily Executive Function & UDL Toolkit'
        : (builder.ADAPTERS[result.activity] ? builder.ADAPTERS[result.activity].title : result.activity);
      setText('summary-facts', result.name + ' (' + fileSize(result.bytes) + ') \u2014 ' + actTitle + ', non-scored, private reflections by default.');
      setText('making-said', 'The file is ready: ' + result.name);

      var rows = $('summary-rows');
      rows.textContent = '';
      var addRow = function (k, v) {
        rows.appendChild(el('dt', '', k));
        rows.appendChild(el('dd', '', v));
      };
      addRow('Toolkit', actTitle);
      addRow('Privacy default', 'Personal notes stay on screen unless student checks opt-in share box');
      addRow('Scoring', 'Non-scored student support toolkit');
      addRow('File size', fileSize(result.bytes));
      addRow('Home languages', cfg.homeLanguages.length ? cfg.homeLanguages.join(', ') : 'English only');
      addRow('Station Mode', cfg.stationMode ? 'On (shared-device reset)' : 'Off');
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
      setText('build-problem-text', (err && err.message) || 'Could not build the toolkit.');
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
    state.starterId = '';
    state.activity = res.activity;
    state.title = res.title || state.title;
    state.homeLanguages = Array.isArray(res.homeLanguages) ? res.homeLanguages.slice() : [];
    state.glossaryText = formatGlossaryText(res.bilingualGlossary || {});
    state.stationMode = !!res.stationMode;
    state.qrPublicKey = typeof res.qrPublicKey === 'string' ? res.qrPublicKey : '';
    if (res.activity === 'mixed' && Array.isArray(res.blocks)) {
      state.mixedTools = res.blocks.map(function (b) { return b.activity; });
    }
    (res.blocks || []).forEach(function (b) {
      var it = b.items && b.items[0];
      if (!it) return;
      if (b.activity === 'sel_first_then') {
        state.firstThen = { firstLabel: it.firstLabel || '', thenLabel: it.thenLabel || '', stepsText: (it.steps || []).join('\n') };
      } else if (b.activity === 'sel_focus_timer') {
        state.timer = { focusMinutes: it.focusMinutes || 5, breakMinutes: it.breakMinutes || 2, prompt: it.prompt || '' };
      } else if (b.activity === 'sel_calm_toolkit') {
        state.calm = { prompt: it.prompt || '', breakMinutes: it.breakMinutes || 3, breakCardTitle: it.breakCardTitle || '' };
      } else if (b.activity === 'sel_udl_reflect') {
        state.reflect = {
          goalQuestion: it.goalQuestion || '',
          nextQuestion: it.nextQuestion || '',
          supportsText: (it.supportOptions || []).map(function (s) { return typeof s === 'string' ? s : s.label; }).join(', '),
        };
      }
    });
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    remember();
    gotoStep(2, false);
  }

  var reopenPending = null;

  function handleReopenBytes(bytes, fileName) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var res = builder.readSelPacket(u8, verifyCore);
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(u8, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-sel.html') ? owner : res.page;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && targetPage.href !== 'packets-sel.html') {
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
    var actRadios = document.querySelectorAll('input[name="activity"]');
    for (var ai = 0; ai < actRadios.length; ai++) {
      actRadios[ai].addEventListener('change', function (e) {
        var prevTitle = String(state.title || '').trim();
        var wasDefault = !prevTitle || builder.STARTER_SETS.some(function (s) { return s.title === prevTitle; });
        state.activity = e.target.value;
        var defStarter = state.activity === 'mixed' ? builder.findStarter('sel_daily_toolkit_mix') : builder.defaultStarterFor(state.activity);
        state.starterId = defStarter ? defStarter.id : '';
        if (defStarter && wasDefault) state.title = defStarter.title;
        remember();
        drawStep1();
      });
    }

    $('f-ft-first').addEventListener('input', function (e) { state.firstThen.firstLabel = e.target.value; remember(); drawPrintPreview(); });
    $('f-ft-then').addEventListener('input', function (e) { state.firstThen.thenLabel = e.target.value; remember(); drawPrintPreview(); });
    $('f-ft-steps').addEventListener('input', function (e) { state.firstThen.stepsText = e.target.value; remember(); });

    $('f-tm-focus').addEventListener('input', function (e) { state.timer.focusMinutes = Number(e.target.value) || 5; remember(); });
    $('f-tm-break').addEventListener('input', function (e) { state.timer.breakMinutes = Number(e.target.value) || 2; remember(); });
    $('f-tm-prompt').addEventListener('input', function (e) { state.timer.prompt = e.target.value; remember(); });

    $('f-cm-prompt').addEventListener('input', function (e) { state.calm.prompt = e.target.value; remember(); });
    $('f-cm-mins').addEventListener('input', function (e) { state.calm.breakMinutes = Number(e.target.value) || 3; remember(); });
    $('f-cm-title').addEventListener('input', function (e) { state.calm.breakCardTitle = e.target.value; remember(); });

    $('f-ur-goal').addEventListener('input', function (e) { state.reflect.goalQuestion = e.target.value; remember(); });
    $('f-ur-next').addEventListener('input', function (e) { state.reflect.nextQuestion = e.target.value; remember(); });
    $('f-ur-supports').addEventListener('input', function (e) { state.reflect.supportsText = e.target.value; remember(); });

    var mixBoxes = document.querySelectorAll('#mixed-tools input[type="checkbox"]');
    for (var mx = 0; mx < mixBoxes.length; mx++) {
      mixBoxes[mx].addEventListener('change', function () {
        var picked = [];
        for (var k = 0; k < mixBoxes.length; k++) {
          if (mixBoxes[k].checked) picked.push(mixBoxes[k].value);
        }
        state.mixedTools = picked;
        remember();
        drawStep2();
      });
    }

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

    var paperFold = $('paper-sel-fold');
    if (paperFold) {
      paperFold.addEventListener('toggle', function () {
        var sheet = $('paper-sel-sheet');
        if (sheet) sheet.hidden = !(paperFold.open && sheet.getAttribute('data-ready') === '1');
      });
    }
    var paperBtn = $('print-paper-sel');
    if (paperBtn) {
      paperBtn.addEventListener('click', function () {
        if (!built) buildNow();
        var sheet = $('paper-sel-sheet');
        if (!sheet || sheet.getAttribute('data-ready') !== '1') return;
        if (paperFold) paperFold.open = true;
        sheet.hidden = false;
        announce('Opening print dialog for the desk toolkit sheet.');
        try { window.print(); } catch (_) {}
      });
    }
    var docxBtn = $('download-docx');
    if (docxBtn) {
      docxBtn.addEventListener('click', function () { downloadSelDocx(); });
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
    builder = window.AlloPacketSel || null;
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
