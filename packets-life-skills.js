// Educator and family maker controller for packets-life-skills.html
// (Making Change & Budgeting, Transit Schedules, Kitchen Safety, Laundry Care Sorting, Community & Emergency Signs).
// Everything runs in this browser tab. Zero network, zero cookies, zero markup strings.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-life-skills/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;

  var FORMAT_HINTS = {
    life_money: 'One scenario per line: pay | 2.75 | Prompt | optional hint, OR change | 6.35 | 10.00 | Prompt, OR budget | 12.00 | min=3 | Bread=3.50*, Milk=3.25*, Apples=2.00 | Prompt.',
    life_transit: 'One scenario per line: Route | Stop1, Stop2, Stop3 | Bus A=8:10,8:25,8:40 / Bus B=8:35,8:50,9:05 | Prompt | Choice 1; *Correct Choice; Choice 3 (prefix correct choice with *).',
    life_kitchen: 'One scenario per line: decision | Area | Prompt | Choice 1; *Correct Choice; Choice 3, OR sequence | Area | Prompt | Step 1; Step 2; Step 3; Step 4 (in exact order).',
    life_laundry: 'One scenario per line: sort | Prompt | White Shirt=lights; Dark Jeans=darks; Wool Sweater=delicates, OR setting | Wool Sweater (Cold, Air Dry) | Prompt | Option 1; *Correct Option.',
    life_signs: 'One scenario per line: tone (exit|danger|caution|info|crosswalk|emergency) | SIGN TITLE | Subtitle | Prompt | Choice 1; *Correct Choice; Choice 3.',
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
      mixedDomains: builder.ACTIVITIES.slice(),
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
      if (parsed.activity === 'mixed' || builder.ACTIVITIES.indexOf(parsed.activity) >= 0) base.activity = parsed.activity;
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
      if (Array.isArray(parsed.mixedDomains)) {
        var validD = parsed.mixedDomains.filter(function (d) { return builder.ACTIVITIES.indexOf(d) >= 0; });
        if (validD.length >= 2) base.mixedDomains = validD;
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
    if (starter.activity !== 'mixed' && Array.isArray(starter.items)) {
      state.itemsByActivity[starter.activity] = builder.formatItemsText(starter.activity, starter.items);
    } else if (starter.activity === 'mixed') {
      state.mixedDomains = builder.ACTIVITIES.slice();
    }
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
      var actTitle = s.activity === 'mixed' ? 'All 5 Domains' : (builder.ADAPTERS[s.activity] ? builder.ADAPTERS[s.activity].title : s.activity);
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
    if (state.activity === 'mixed') {
      var n = state.mixedDomains.length;
      setText('mixed-parse-note', n < 2 ? 'Select at least 2 domains for a mixed transition packet.' : (n + ' domains selected (' + n + ' scenarios ready).'));
      return;
    }
    var parsed = builder.parseItemsText(state.activity, state.itemsByActivity[state.activity] || '');
    if (!parsed.length) {
      setText('items-parse-note', 'No valid scenarios parsed yet. Follow the line format shown above.');
    } else {
      setText('items-parse-note', parsed.length + (parsed.length === 1 ? ' scenario ready.' : ' scenarios ready.'));
    }
  }

  function drawStep2() {
    var isMix = state.activity === 'mixed';
    $('single-editor').hidden = isMix;
    $('mixed-editor').hidden = !isMix;
    if (isMix) {
      var boxes = document.querySelectorAll('#mixed-domains input[type="checkbox"]');
      for (var i = 0; i < boxes.length; i++) {
        boxes[i].checked = state.mixedDomains.indexOf(boxes[i].value) >= 0;
      }
    } else {
      var actTitle = builder.ADAPTERS[state.activity] ? builder.ADAPTERS[state.activity].title : state.activity;
      setText('editor-heading', actTitle + ' scenarios');
      setText('editor-format-hint', FORMAT_HINTS[state.activity] || '');
      $('f-items').value = state.itemsByActivity[state.activity] || '';
    }
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
    if (state.activity === 'mixed') {
      if (state.mixedDomains.length < 2) return 'Select at least 2 domains for a mixed transition packet.';
    } else {
      var items = builder.parseItemsText(state.activity, state.itemsByActivity[state.activity] || '');
      if (!items.length) return 'Add at least 1 valid scenario line before making the file.';
    }
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
    var timeMin = Number(state.timeLimitMin);
    var starter = builder.findStarter(state.starterId) || builder.defaultStarterFor(state.activity);
    var cfg = {
      starterId: starter ? starter.id : '',
      activity: state.activity,
      mode: state.mode,
      title: String(state.title || '').trim() || (starter ? starter.title : 'Life Skills Practice'),
      adaptiveScaffold: state.mode !== 'probe' && !!state.adaptiveScaffold,
      form: state.form || 'Form A',
      timeLimitS: state.mode === 'probe' && isFinite(timeMin) && timeMin > 0 ? Math.round(timeMin * 60) : null,
      teacherCode: state.mode === 'probe' ? String(state.teacherCode || '').trim() : '',
      homeLanguages: state.homeLanguages.slice(),
      bilingualGlossary: parseGlossaryText(state.glossaryText),
      stationMode: !!state.stationMode,
      qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
    };
    if (state.activity === 'mixed') {
      cfg.blocks = state.mixedDomains.map(function (dom) {
        var st = builder.defaultStarterFor(dom);
        return { activity: dom, items: [st.items[0]] };
      });
    } else {
      cfg.items = builder.parseItemsText(state.activity, state.itemsByActivity[state.activity] || '');
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

  function fmtCents(c) {
    var a = Math.abs(Math.round(Number(c) || 0));
    var d = Math.floor(a / 100);
    var rem = a % 100;
    return '$' + d + '.' + (rem < 10 ? '0' : '') + rem;
  }

  function paperMixedSteps(list) {
    var src = Array.isArray(list) ? list.slice() : [];
    if (src.length < 2) return src;
    var out = [];
    for (var s = 0; s < 2; s++) {
      for (var i = s; i < src.length; i += 2) out.push(src[i]);
    }
    if (out.length > 2 && out[0] === src[0]) out.push(out.shift());
    return out;
  }

  function appendChoiceList(card, choices) {
    var ul = el('ul', 'paper-ls-choices');
    (Array.isArray(choices) ? choices : []).forEach(function (ch) {
      var li = el('li');
      var bx = el('span', 'paper-ls-box');
      bx.setAttribute('aria-hidden', 'true');
      li.appendChild(bx);
      li.appendChild(el('span', '', ch && ch.label ? ch.label : String(ch || '')));
      ul.appendChild(li);
    });
    card.appendChild(ul);
  }

  function choiceLabelFor(choices, id) {
    var want = String(id || '').trim();
    var hit = (Array.isArray(choices) ? choices : []).filter(function (c) {
      return String(c && (c.id != null ? c.id : c.label)) === want;
    })[0];
    return hit && hit.label ? hit.label : want;
  }

  function drawPaperSheet(cfg, result) {
    var sheet = $('paper-ls-sheet');
    var fold = $('paper-ls-fold');
    var keyBox = $('f-paper-ls-key');
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

    var header = el('div', 'paper-ls-header');
    header.appendChild(el('h4', 'paper-ls-title', cfg.title || 'Life Skills Practice'));
    header.appendChild(el('p', 'paper-ls-fields', 'Name: ________________________   Date: ______________'));
    sheet.appendChild(header);

    var itemsWrap = el('div', 'paper-ls-items');
    var keyEntries = [];
    var idx = 0;

    blocks.forEach(function (blk) {
      var act = blk.activity;
      var domLabel = builder.ADAPTERS[act] ? builder.ADAPTERS[act].title : act;
      (Array.isArray(blk.items) ? blk.items : []).forEach(function (item) {
        idx += 1;
        var card = el('div', 'paper-ls-card');
        card.appendChild(el('p', 'paper-ls-kicker', 'Scenario ' + idx + ' \u00b7 ' + domLabel));
        card.appendChild(el('p', 'paper-ls-prompt', item.prompt || item.word || 'Complete the task below.'));

        if (act === 'life_money') {
          if (item.task === 'budget') {
            var tbl = el('table', 'paper-ls-table');
            var thead = el('thead');
            var hr = el('tr');
            ['Pick', 'Store Item', 'Price'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
            thead.appendChild(hr);
            tbl.appendChild(thead);
            var tbody = el('tbody');
            (Array.isArray(item.storeItems) ? item.storeItems : []).forEach(function (si) {
              var tr = el('tr');
              var tdPick = el('td');
              var bx = el('span', 'paper-ls-box');
              bx.setAttribute('aria-hidden', 'true');
              tdPick.appendChild(bx);
              tr.appendChild(tdPick);
              tr.appendChild(el('td', '', si.name + (si.required ? ' (required)' : '')));
              tr.appendChild(el('td', '', fmtCents(si.cents)));
              tbody.appendChild(tr);
            });
            tbl.appendChild(tbody);
            card.appendChild(tbl);
            card.appendChild(el('p', 'paper-ls-answer-line', 'My Basket Total: $________   (Budget limit: ' + fmtCents(item.budgetCents) + ')'));
            var reqNames = (Array.isArray(item.storeItems) ? item.storeItems : []).filter(function (s) { return s.required; }).map(function (s) { return s.name; });
            keyEntries.push('Scenario ' + idx + ': At least ' + (item.minItems || 1) + ' items at or under ' + fmtCents(item.budgetCents) + (reqNames.length ? ' (must include ' + reqNames.join(', ') + ')' : '') + '.');
          } else {
            var mTbl = el('table', 'paper-ls-table');
            var mHead = el('thead');
            var mhr = el('tr');
            ['$20', '$10', '$5', '$1', '25\u00a2', '10\u00a2', '5\u00a2', '1\u00a2'].forEach(function (d) { mhr.appendChild(el('th', '', d)); });
            mHead.appendChild(mhr);
            mTbl.appendChild(mHead);
            var mBody = el('tbody');
            var mtr = el('tr');
            for (var c = 0; c < 8; c++) mtr.appendChild(el('td', '', '\u00a0'));
            mBody.appendChild(mtr);
            mTbl.appendChild(mBody);
            card.appendChild(mTbl);
            card.appendChild(el('p', 'paper-ls-answer-line', 'Counted Amount: $________'));
            keyEntries.push('Scenario ' + idx + ': ' + (item.target || fmtCents(item.targetCents)) + '.');
          }
        } else if (act === 'life_transit') {
          if (item.route || item.serviceNote) {
            card.appendChild(el('p', 'paper-ls-sub', [item.route, item.serviceNote].filter(Boolean).join(' \u00b7 ')));
          }
          var stops = Array.isArray(item.stops) ? item.stops : [];
          var runs = Array.isArray(item.runs) ? item.runs : [];
          if (stops.length && runs.length) {
            var tt = el('table', 'paper-ls-table');
            var tth = el('thead');
            var tthr = el('tr');
            tthr.appendChild(el('th', '', 'Run'));
            stops.forEach(function (st) { tthr.appendChild(el('th', '', st)); });
            tth.appendChild(tthr);
            tt.appendChild(tth);
            var ttb = el('tbody');
            runs.forEach(function (run) {
              var tr = el('tr');
              tr.appendChild(el('td', '', run.label || ''));
              (Array.isArray(run.times) ? run.times : []).forEach(function (tm) { tr.appendChild(el('td', '', tm)); });
              ttb.appendChild(tr);
            });
            tt.appendChild(ttb);
            card.appendChild(tt);
          }
          appendChoiceList(card, item.choices);
          keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
        } else if (act === 'life_kitchen') {
          if (item.scenario) card.appendChild(el('p', 'paper-ls-sub', item.scenario));
          if (item.task === 'sequence' && Array.isArray(item.steps)) {
            item.steps.forEach(function (_, si) {
              var row = el('div', 'paper-ls-line-row');
              row.appendChild(el('span', '', (si + 1) + '.'));
              row.appendChild(el('span', 'paper-ls-line'));
              card.appendChild(row);
            });
            var bank = el('div', 'paper-ls-bank');
            bank.appendChild(el('p', 'paper-ls-sub', 'Steps to place in order (write step letter or text above):'));
            var bul = el('ul');
            paperMixedSteps(item.steps).forEach(function (st, si) {
              bul.appendChild(el('li', '', String.fromCharCode(65 + (si % 26)) + '. ' + (st.text || st)));
            });
            bank.appendChild(bul);
            card.appendChild(bank);
            keyEntries.push('Scenario ' + idx + ': ' + item.steps.map(function (st, si) { return (si + 1) + '. ' + (st.text || st); }).join(' \u2192 '));
          } else {
            appendChoiceList(card, item.choices);
            keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
          }
        } else if (act === 'life_laundry') {
          if (item.task === 'setting') {
            var g = item.garment || {};
            if (g.name) {
              var badgeStr = Array.isArray(g.badges) && g.badges.length ? ' [' + g.badges.join(' | ') + ']' : '';
              card.appendChild(el('p', 'paper-ls-sub', 'Garment care tag: ' + g.name + (g.color ? ' (' + g.color + ')' : '') + badgeStr));
            }
            appendChoiceList(card, item.choices);
            keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
          } else {
            var baskets = Array.isArray(item.baskets) ? item.baskets : [];
            var garments = Array.isArray(item.garments) ? item.garments : [];
            var basketMap = Object.create(null);
            baskets.forEach(function (b) { basketMap[b.id] = b.label; });
            var lt = el('table', 'paper-ls-table');
            var lth = el('thead');
            var lthr = el('tr');
            lthr.appendChild(el('th', '', 'Garment & Care Tags'));
            baskets.forEach(function (b) { lthr.appendChild(el('th', '', b.label)); });
            lth.appendChild(lthr);
            lt.appendChild(lth);
            var ltb = el('tbody');
            var ansParts = [];
            garments.forEach(function (gm) {
              var tr = el('tr');
              var tagTxt = Array.isArray(gm.badges) && gm.badges.length ? ' (' + gm.badges.join(', ') + ')' : '';
              tr.appendChild(el('td', '', gm.name + (gm.color ? ' \u2014 ' + gm.color : '') + tagTxt));
              baskets.forEach(function () {
                var td = el('td');
                var bx = el('span', 'paper-ls-box');
                bx.setAttribute('aria-hidden', 'true');
                td.appendChild(bx);
                tr.appendChild(td);
              });
              ltb.appendChild(tr);
              ansParts.push(gm.name + ' \u2192 ' + (basketMap[gm.basket] || gm.basket));
            });
            lt.appendChild(ltb);
            card.appendChild(lt);
            keyEntries.push('Scenario ' + idx + ': ' + ansParts.join('; ') + '.');
          }
        } else if (act === 'life_signs') {
          var placard = el('div', 'paper-ls-sign');
          placard.appendChild(el('p', 'paper-ls-sign-head', item.signTitle || 'SIGN'));
          if (item.signSub) placard.appendChild(el('p', 'paper-ls-sign-sub', item.signSub));
          card.appendChild(placard);
          if (item.location) card.appendChild(el('p', 'paper-ls-sub', 'Location: ' + item.location));
          appendChoiceList(card, item.choices);
          keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
        }

        itemsWrap.appendChild(card);
      });
    });

    sheet.appendChild(itemsWrap);

    if (keyEntries.length && (!keyBox || keyBox.checked)) {
      var keySec = el('div', 'paper-ls-key');
      keySec.appendChild(el('h4', '', 'Teacher Answer Key \u2014 ' + (cfg.title || 'Life Skills Practice')));
      var kul = el('ul', 'paper-ls-key-list');
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

  function buildLifeSkillsDocxPayload(cfg) {
    if (!cfg) return null;
    var keyBox = $('f-paper-ls-key');
    var answerKeyOn = !keyBox || !!keyBox.checked;
    var blocks = cfg.activity === 'mixed' && Array.isArray(cfg.blocks)
      ? cfg.blocks
      : [{ activity: cfg.activity, items: Array.isArray(cfg.items) ? cfg.items : [] }];
    var sections = [];
    var keyEntries = [];
    var idx = 0;

    blocks.forEach(function (blk) {
      var act = blk.activity;
      var domLabel = builder.ADAPTERS[act] ? builder.ADAPTERS[act].title : act;
      (Array.isArray(blk.items) ? blk.items : []).forEach(function (item) {
        idx += 1;
        var head = 'Scenario ' + idx + ' \u00b7 ' + domLabel;
        var promptTxt = item.prompt || item.word || 'Complete the task below.';
        var choiceTexts = (Array.isArray(item.choices) ? item.choices : []).map(function (c) {
          return c && c.label ? c.label : String(c || '');
        }).filter(Boolean);

        if (act === 'life_money') {
          if (item.task === 'budget') {
            var bRows = (Array.isArray(item.storeItems) ? item.storeItems : []).map(function (si) {
              return ['\u2610', si.name + (si.required ? ' (required)' : ''), fmtCents(si.cents)];
            });
            bRows.push(['', 'My Basket Total (Budget limit: ' + fmtCents(item.budgetCents) + ')', '$________']);
            sections.push({
              heading: head,
              directions: promptTxt,
              type: 'table',
              columns: ['Pick', 'Store Item', 'Price'],
              rows: bRows,
            });
            var reqNames = (Array.isArray(item.storeItems) ? item.storeItems : []).filter(function (s) { return s.required; }).map(function (s) { return s.name; });
            keyEntries.push('Scenario ' + idx + ': At least ' + (item.minItems || 1) + ' items at or under ' + fmtCents(item.budgetCents) + (reqNames.length ? ' (must include ' + reqNames.join(', ') + ')' : '') + '.');
          } else {
            sections.push({
              heading: head,
              directions: promptTxt + '  Counted Amount: $________',
              type: 'table',
              columns: ['$20', '$10', '$5', '$1', '25\u00a2', '10\u00a2', '5\u00a2', '1\u00a2'],
              rows: [['', '', '', '', '', '', '', '']],
            });
            keyEntries.push('Scenario ' + idx + ': ' + (item.target || fmtCents(item.targetCents)) + '.');
          }
        } else if (act === 'life_transit') {
          var stops = Array.isArray(item.stops) ? item.stops : [];
          var runs = Array.isArray(item.runs) ? item.runs : [];
          if (stops.length && runs.length) {
            var maxCols = Math.min(7, stops.length);
            var tCols = ['Run'].concat(stops.slice(0, maxCols));
            var tRows = runs.map(function (run) {
              return [run.label || ''].concat((Array.isArray(run.times) ? run.times : []).slice(0, maxCols));
            });
            sections.push({
              heading: head,
              directions: [item.route, item.serviceNote].filter(Boolean).join(' \u00b7 '),
              type: 'table',
              columns: tCols,
              rows: tRows,
            });
          }
          sections.push({
            heading: (stops.length && runs.length) ? ('Scenario ' + idx + ' Question') : head,
            type: 'questions',
            items: [{ prompt: promptTxt, choices: choiceTexts.length ? choiceTexts : undefined, writeLines: 2 }],
          });
          keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
        } else if (act === 'life_kitchen') {
          if (item.task === 'sequence' && Array.isArray(item.steps)) {
            sections.push({
              heading: head,
              directions: [item.scenario, promptTxt].filter(Boolean).join(' — '),
              type: 'table',
              columns: ['Step Order', 'Action'],
              rows: item.steps.map(function (_, si) { return [(si + 1) + '.', '']; }),
            });
            sections.push({
              heading: 'Scenario ' + idx + ' Steps to Order',
              type: 'checklist',
              items: paperMixedSteps(item.steps).map(function (st, si) {
                return String.fromCharCode(65 + (si % 26)) + '. ' + (st.text || st);
              }),
            });
            keyEntries.push('Scenario ' + idx + ': ' + item.steps.map(function (st, si) { return (si + 1) + '. ' + (st.text || st); }).join(' \u2192 '));
          } else {
            sections.push({
              heading: head,
              directions: item.scenario || '',
              type: 'questions',
              items: [{ prompt: promptTxt, choices: choiceTexts.length ? choiceTexts : undefined, writeLines: 2 }],
            });
            keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
          }
        } else if (act === 'life_laundry') {
          if (item.task === 'setting') {
            var g = item.garment || {};
            var tagLine = g.name
              ? ('Garment care tag: ' + g.name + (g.color ? ' (' + g.color + ')' : '') + (Array.isArray(g.badges) && g.badges.length ? ' [' + g.badges.join(' | ') + ']' : ''))
              : '';
            sections.push({
              heading: head,
              directions: tagLine,
              type: 'questions',
              items: [{ prompt: promptTxt, choices: choiceTexts.length ? choiceTexts : undefined, writeLines: 2 }],
            });
            keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
          } else {
            var baskets = Array.isArray(item.baskets) ? item.baskets : [];
            var garments = Array.isArray(item.garments) ? item.garments : [];
            var basketMap = Object.create(null);
            baskets.forEach(function (b) { basketMap[b.id] = b.label; });
            var ansParts = [];
            var lCols = ['Garment & Care Tags'].concat(baskets.map(function (b) { return b.label; }));
            var lRows = garments.map(function (gm) {
              var tagTxt = Array.isArray(gm.badges) && gm.badges.length ? ' (' + gm.badges.join(', ') + ')' : '';
              ansParts.push(gm.name + ' \u2192 ' + (basketMap[gm.basket] || gm.basket));
              return [gm.name + (gm.color ? ' \u2014 ' + gm.color : '') + tagTxt].concat(baskets.map(function () { return '\u2610'; }));
            });
            sections.push({
              heading: head,
              directions: promptTxt,
              type: 'table',
              columns: lCols,
              rows: lRows,
            });
            keyEntries.push('Scenario ' + idx + ': ' + ansParts.join('; ') + '.');
          }
        } else if (act === 'life_signs') {
          sections.push({
            heading: head,
            directions: item.location ? ('Location: ' + item.location) : '',
            type: 'boxes',
            columns: 1,
            items: [{ title: item.signTitle || 'SIGN', detail: item.signSub || '' }],
          });
          sections.push({
            heading: 'Scenario ' + idx + ' Action',
            type: 'questions',
            items: [{ prompt: promptTxt, choices: choiceTexts.length ? choiceTexts : undefined, writeLines: 2 }],
          });
          keyEntries.push('Scenario ' + idx + ': ' + choiceLabelFor(item.choices, item.targetId || item.target) + '.');
        }
      });
    });

    if (!sections.length) return null;
    return {
      title: cfg.title || 'Life Skills Practice',
      subtitle: 'Functional Life Skills & Transition Handout',
      kind: cfg.activity || 'life-skills',
      sections: sections,
      answerKey: keyEntries.length ? [{ heading: 'Scenario Answers', lines: keyEntries }] : [],
      answerKeyOn: answerKeyOn,
    };
  }

  function downloadLifeSkillsDocx() {
    if (!built || !builtCfg) buildNow();
    var payload = buildLifeSkillsDocxPayload(builtCfg);
    if (!payload) {
      announce('Build a life skills packet first to download a Word handout.');
      return Promise.resolve(false);
    }
    var btn = $('download-docx');
    if (btn) btn.disabled = true;
    announce('Preparing Word handout (.docx)...');
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
      announce('Could not create the Word handout.');
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
      var result = builder.buildLifeSkillsPacket(Object.assign({}, cfg, {
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

      var actTitle = result.activity === 'mixed'
        ? 'Community Transition Mix'
        : (builder.ADAPTERS[result.activity] ? builder.ADAPTERS[result.activity].title : result.activity);
      var modeLabel = result.mode === 'probe' ? 'Check mode (one try)' : 'Practice mode (feedback and retry)';
      setText('summary-facts', result.name + ' (' + fileSize(result.bytes) + ') \u2014 ' + actTitle + ', ' + result.itemCount + ' items, ' + modeLabel + '.');
      setText('making-said', 'The file is ready: ' + result.name);

      var rows = $('summary-rows');
      rows.textContent = '';
      var addRow = function (k, v) {
        rows.appendChild(el('dt', '', k));
        rows.appendChild(el('dd', '', v));
      };
      addRow('Domain', actTitle);
      addRow('Scenarios', String(result.itemCount));
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
    if (res.activity === 'mixed' && Array.isArray(res.blocks)) {
      state.mixedDomains = res.blocks.map(function (b) { return b.activity; });
    } else if (Array.isArray(res.items) && res.items.length) {
      state.itemsByActivity[res.activity] = builder.formatItemsText(res.activity, res.items);
    }
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    remember();
    gotoStep(2, false);
  }

  var reopenPending = null;

  function handleReopenBytes(bytes, fileName) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var res = builder.readLifeSkillsPacket(u8, verifyCore);
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(u8, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-life-skills.html') ? owner : res.page;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && targetPage.href !== 'packets-life-skills.html') {
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
    var filters = document.querySelectorAll('#domain-filters button[data-domain]');
    for (var fi = 0; fi < filters.length; fi++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          activeFilter = btn.getAttribute('data-domain') || 'all';
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
        var defStarter = state.activity === 'mixed' ? builder.findStarter('ls_community_mix') : builder.defaultStarterFor(state.activity);
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
      if (st && Array.isArray(st.items)) {
        state.itemsByActivity[state.activity] = builder.formatItemsText(state.activity, st.items);
        remember();
        drawStep2();
        announce('Restored starter scenarios.');
      }
    });

    var mixBoxes = document.querySelectorAll('#mixed-domains input[type="checkbox"]');
    for (var mx = 0; mx < mixBoxes.length; mx++) {
      mixBoxes[mx].addEventListener('change', function () {
        var picked = [];
        for (var k = 0; k < mixBoxes.length; k++) {
          if (mixBoxes[k].checked) picked.push(mixBoxes[k].value);
        }
        state.mixedDomains = picked;
        remember();
        updateParseNote();
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

    var paperFold = $('paper-ls-fold');
    if (paperFold) {
      paperFold.addEventListener('toggle', function () {
        var sheet = $('paper-ls-sheet');
        if (sheet) sheet.hidden = !(paperFold.open && sheet.getAttribute('data-ready') === '1');
      });
    }
    var paperKey = $('f-paper-ls-key');
    if (paperKey) {
      paperKey.addEventListener('change', function () {
        if (built && builtCfg) drawPaperSheet(builtCfg, built);
      });
    }
    var paperBtn = $('print-paper-ls');
    if (paperBtn) {
      paperBtn.addEventListener('click', function () {
        if (!built) buildNow();
        var sheet = $('paper-ls-sheet');
        if (!sheet || sheet.getAttribute('data-ready') !== '1') return;
        if (paperFold) paperFold.open = true;
        sheet.hidden = false;
        announce('Opening print dialog for the paper transition worksheet.');
        try { window.print(); } catch (_) {}
      });
    }
    var docxBtn = $('download-docx');
    if (docxBtn) {
      docxBtn.addEventListener('click', function () { downloadLifeSkillsDocx(); });
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
    builder = window.AlloPacketLifeSkills || null;
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
