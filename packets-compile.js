// Educator UI for packets-compile.html (Compile Main-App Activity JSON to Offline Packet).
// Browser-local, deterministic, zero DOM markup from strings, zero network requests.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-compile:v1';
  var loader = window.AlloWordSoundsTakeHome;
  var compiler = window.AlloPacketCompiler;
  var choiceBuilder = window.AlloPacketChoice;
  var choiceAdapters = window.AlloPacketSortWriteAdapters;
  var verify = window.AlloPacketVerify;
  var bilingual = window.AlloPacketStationBilingual;
  var qrCrypto = window.AlloPacketQrCrypto;
  var handoff = window.AlloPacketHandoff;
  var zipLib = window.AlloPacketZip;

  var KIND_LABELS = {
    quiz: 'Quiz (Multiple-Choice & Short Answer)',
    cloze: 'Cloze (Fill in the Blanks)',
    concept_sort: 'Concept Sort',
    timeline: 'Timeline Sequence',
    writing: 'Sentence Frames / DBQ Writing',
    adventure: 'Branching Adventure / Escape Room',
    anchor_chart: 'Anchor Chart Study Guide',
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  };

  var state = null;
  var currentStep = 1;
  var lastInspected = null;
  var builtResult = null;
  var previewUrl = '';
  var previewSession = null;
  var batchNames = [];

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
    var first = compiler.sampleById('sample_quiz');
    return {
      sampleId: first.id,
      jsonText: JSON.stringify(first.artifact, null, 2),
      kindOverride: 'auto',
      title: first.artifact.title,
      mode: 'practice',
      form: 'Form A',
      timeMin: '',
      homeLanguages: [],
      glossaryText: '',
      stationMode: false,
      qrPublicKey: '',
    };
  }

  function remember() {
    try {
      var copy = Object.assign({}, state);
      if (copy.jsonText && copy.jsonText.length > 200000) copy.jsonText = '';
      localStorage.setItem(STORE_KEY, JSON.stringify(copy));
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
      return Object.assign(base, parsed, {
        homeLanguages: Array.isArray(parsed.homeLanguages) ? parsed.homeLanguages : [],
      });
    } catch (_) {
      return base;
    }
  }

  function drawSamples() {
    var host = $('sample-list');
    if (!host) return;
    host.textContent = '';
    compiler.samples().forEach(function (s) {
      var btn = el('button', 'template-card');
      btn.type = 'button';
      btn.setAttribute('data-sample-id', s.id);
      btn.setAttribute('aria-pressed', state.sampleId === s.id ? 'true' : 'false');
      var meta = el('span', 'template-meta');
      meta.appendChild(el('span', 'template-tag', KIND_LABELS[s.kind] || s.kind));
      btn.appendChild(meta);
      btn.appendChild(el('span', 'template-name', s.name));
      btn.appendChild(el('span', 'template-summary', s.summary));
      btn.addEventListener('click', function () {
        state.sampleId = s.id;
        state.kindOverride = 'auto';
        state.jsonText = JSON.stringify(s.artifact, null, 2);
        state.title = s.artifact.title || s.name;
        if ($('f-json')) $('f-json').value = state.jsonText;
        remember();
        drawSamples();
        inspectLive();
        announce('Loaded sample activity: ' + s.name);
      });
      host.appendChild(btn);
    });
  }

  function inspectLive() {
    var forced = state.kindOverride && state.kindOverride !== 'auto' ? state.kindOverride : '';
    lastInspected = compiler.inspectArtifact(state.jsonText, forced);
    var det = $('step-1-detect');
    if (det) {
      if (lastInspected.ok) {
        det.textContent = 'Detected: ' + (KIND_LABELS[lastInspected.kind] || lastInspected.kind)
          + ' — "' + lastInspected.title + '" (' + lastInspected.unitCount + ' items/parts).';
      } else {
        det.textContent = lastInspected.error || 'Waiting for valid activity JSON.';
      }
    }
    return lastInspected;
  }

  function renderStripReport(insp) {
    var head = $('strip-headline');
    var badges = $('strip-counts');
    var notes = $('strip-notes');
    if (!head || !badges || !notes) return;
    badges.textContent = '';
    notes.textContent = '';
    if (!insp || !insp.ok) {
      head.textContent = (insp && insp.error) || 'No valid activity loaded yet.';
      return;
    }
    var sr = insp.stripReport;
    head.textContent = 'Ready to compile as ' + (KIND_LABELS[insp.kind] || insp.kind) + ' (' + insp.unitCount + ' items/parts).';
    var pairs = [
      ['Prompt/model fields stripped', sr.promptFieldsStripped.length],
      ['Web addresses stripped', sr.urlsStripped],
      ['External images converted', sr.externalImagesConverted],
      ['Emails redacted', sr.emailsStripped],
      ['Markup tags cleaned', sr.htmlTagsStripped],
    ];
    pairs.forEach(function (pair) {
      badges.appendChild(el('span', 'strip-badge', pair[0] + ': ' + pair[1]));
    });
    (sr.notes || []).forEach(function (line) {
      notes.appendChild(el('li', '', line));
    });
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

  function syncModeUi() {
    var canCheck = !!(lastInspected && lastInspected.ok && lastInspected.checkCapable);
    var probeRadio = $('mode-probe');
    if (probeRadio) probeRadio.disabled = !canCheck;
    if (!canCheck && state.mode === 'probe') state.mode = 'practice';
    document.querySelectorAll('input[name="mode"]').forEach(function (r) {
      r.checked = r.value === state.mode;
    });
    if ($('mode-note')) {
      $('mode-note').textContent = canCheck
        ? 'Check mode scrambles answers and gives one try per item.'
        : 'This activity type runs in Practice / exploration mode (not scored as a Check).';
    }
    if ($('check-opts')) $('check-opts').hidden = state.mode !== 'probe' || !canCheck;
    if ($('f-form')) $('f-form').value = state.form || 'Form A';
    if ($('f-time-min')) $('f-time-min').value = state.timeMin || '';
  }

  function syncStep2() {
    var insp = inspectLive();
    renderStripReport(insp);
    if ($('f-kind-override')) $('f-kind-override').value = state.kindOverride || 'auto';
    if (insp.ok && (!state.title || state.title === 'Offline Activity')) state.title = insp.title;
    if ($('f-step2-title')) $('f-step2-title').value = state.title || (insp.ok ? insp.title : '');
    syncModeUi();
    drawBilingualPills();
    if ($('f-glossary')) $('f-glossary').value = state.glossaryText || '';
    if ($('f-station-mode')) $('f-station-mode').checked = !!state.stationMode;
    if ($('f-qr-key')) $('f-qr-key').value = state.qrPublicKey || '';
    var ho = window.AlloPacketHandoff || handoff;
    if ($('f-qr-key') && ho && typeof ho.mountQrKeyHelper === 'function') ho.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto || qrCrypto });
    updateSupportsNow();
  }

  function validateStep1() {
    var insp = inspectLive();
    if (!insp.ok) return insp.error || 'Enter valid activity JSON first.';
    return '';
  }

  function validateStep2() {
    var p1 = validateStep1();
    if (p1) return p1;
    var tc = String(($('f-teacher-code') && $('f-teacher-code').value) || '').trim();
    if (state.mode === 'probe' && tc && (tc.length < 4 || tc.length > 64)) {
      return 'The teacher code must be 4 to 64 characters (or leave it empty).';
    }
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && qrCrypto && !qrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key must start with AFPK1.';
    }
    return '';
  }

  function appendCompChoices(parent, choices) {
    var ul = el('ul', 'paper-comp-choices');
    (Array.isArray(choices) ? choices : []).forEach(function (ch) {
      var li = el('li');
      var bx = el('span', 'paper-comp-box');
      bx.setAttribute('aria-hidden', 'true');
      li.appendChild(bx);
      li.appendChild(el('span', '', ch));
      ul.appendChild(li);
    });
    parent.appendChild(ul);
  }

  function appendCompLines(parent, n) {
    var box = el('div', 'paper-comp-lines');
    for (var i = 0; i < n; i++) box.appendChild(el('div', 'paper-comp-line'));
    parent.appendChild(box);
  }

  function mixForPaper(list) {
    var src = Array.isArray(list) ? list.slice() : [];
    if (src.length < 2) return src;
    var out = [];
    for (var s = 0; s < 2; s++) {
      for (var i = s; i < src.length; i += 2) out.push(src[i]);
    }
    if (out.length > 2 && out[0] === src[0]) out.push(out.shift());
    return out;
  }

  function drawPaperSheet(res, insp) {
    var sheet = $('paper-comp-sheet');
    var fold = $('paper-comp-fold');
    var keyBox = $('f-paper-comp-key');
    var docxBtn = $('download-docx');
    if (!sheet) return;
    sheet.textContent = '';
    if (!res || !insp || !insp.ok || !Array.isArray(insp.items) || !insp.items.length) {
      sheet.setAttribute('data-ready', '0');
      sheet.hidden = true;
      if (docxBtn) docxBtn.hidden = true;
      return;
    }

    var titleText = state.title || insp.title || 'Offline Activity';
    var header = el('div', 'paper-comp-header');
    header.appendChild(el('h4', 'paper-comp-title', titleText));
    header.appendChild(el('p', 'paper-comp-fields', 'Name: ________________________   Date: ______________'));
    sheet.appendChild(header);

    var kind = res.kind;
    var items = insp.items;
    var keyEntries = [];

    if (kind === 'quiz') {
      var ol = el('ol', 'paper-comp-qs');
      items.forEach(function (it, idx) {
        var li = el('li', 'paper-comp-q');
        li.appendChild(el('span', '', it.prompt || ''));
        if (Array.isArray(it.choices) && it.choices.length) {
          appendCompChoices(li, it.choices);
        } else {
          appendCompLines(li, 2);
        }
        ol.appendChild(li);
        if (it.answer) keyEntries.push('Item ' + (idx + 1) + ': ' + it.answer);
      });
      sheet.appendChild(ol);
    } else if (kind === 'cloze') {
      var cl = items[0];
      if (cl.prompt) sheet.appendChild(el('p', 'paper-comp-prompt', cl.prompt));
      if (Array.isArray(cl.wordBank) && cl.wordBank.length) {
        var wb = el('div', 'paper-comp-bank');
        wb.appendChild(el('p', 'paper-comp-sub', 'Word Bank'));
        var chips = el('ul', 'paper-comp-chips');
        cl.wordBank.forEach(function (w) { chips.appendChild(el('li', '', w)); });
        wb.appendChild(chips);
        sheet.appendChild(wb);
      }
      var body = el('p', 'paper-comp-body');
      (Array.isArray(cl.segments) ? cl.segments : []).forEach(function (seg) {
        if (seg.type === 'blank') body.appendChild(document.createTextNode(' (' + (seg.blankIndex + 1) + ') ______________ '));
        else body.appendChild(document.createTextNode(seg.text || ''));
      });
      sheet.appendChild(body);
      (Array.isArray(cl.blanks) ? cl.blanks : []).forEach(function (b, idx) {
        if (b && b.answer) keyEntries.push('Blank ' + (idx + 1) + ': ' + b.answer);
      });
    } else if (kind === 'concept_sort') {
      var cs = items[0];
      if (cs.prompt) sheet.appendChild(el('p', 'paper-comp-prompt', cs.prompt));
      var cats = Array.isArray(cs.categories) ? cs.categories : [];
      var cards = Array.isArray(cs.cards) ? cs.cards : [];
      var catNames = Object.create(null);
      var grid = el('div', 'paper-comp-grid');
      cats.forEach(function (c) {
        catNames[c.id] = c.label;
        var box = el('div', 'paper-comp-card');
        box.appendChild(el('p', 'paper-comp-sub', c.label));
        appendCompLines(box, 4);
        grid.appendChild(box);
      });
      sheet.appendChild(grid);
      if (cards.length) {
        var cBank = el('div', 'paper-comp-bank');
        cBank.appendChild(el('p', 'paper-comp-sub', 'Cards to sort'));
        var cUl = el('ul', 'paper-comp-chips');
        mixForPaper(cards).forEach(function (cd) { cUl.appendChild(el('li', '', cd.text)); });
        cBank.appendChild(cUl);
        sheet.appendChild(cBank);
        cards.forEach(function (cd) { keyEntries.push(cd.text + ' \u2192 ' + (catNames[cd.category] || cd.category)); });
      }
    } else if (kind === 'timeline') {
      var sq = items[0];
      if (sq.prompt) sheet.appendChild(el('p', 'paper-comp-prompt', sq.prompt));
      var steps = Array.isArray(sq.steps) ? sq.steps : [];
      steps.forEach(function (_, idx) {
        var row = el('div', 'paper-comp-seq-row');
        row.appendChild(el('span', '', (idx + 1) + '.'));
        row.appendChild(el('span', 'paper-comp-line'));
        sheet.appendChild(row);
      });
      if (steps.length) {
        var sBank = el('div', 'paper-comp-bank');
        sBank.appendChild(el('p', 'paper-comp-sub', 'Events / steps to order'));
        var sUl = el('ul', 'paper-comp-chips');
        mixForPaper(steps).forEach(function (st, idx) {
          sUl.appendChild(el('li', '', String.fromCharCode(65 + (idx % 26)) + '. ' + (st.label ? st.label + ': ' : '') + st.text));
        });
        sBank.appendChild(sUl);
        sheet.appendChild(sBank);
        steps.forEach(function (st, idx) { keyEntries.push((idx + 1) + '. ' + (st.label ? st.label + ': ' : '') + st.text); });
      }
    } else if (kind === 'writing') {
      var tw = items[0];
      if (tw.passage) {
        var pBox = el('div', 'paper-comp-passage');
        if (tw.passageTitle) pBox.appendChild(el('p', 'paper-comp-sub', tw.passageTitle));
        pBox.appendChild(document.createTextNode(tw.passage));
        sheet.appendChild(pBox);
      }
      if (tw.prompt) sheet.appendChild(el('p', 'paper-comp-prompt', tw.prompt));
      if (Array.isArray(tw.wordBank) && tw.wordBank.length) {
        var twb = el('div', 'paper-comp-bank');
        twb.appendChild(el('p', 'paper-comp-sub', 'Word Bank'));
        var twc = el('ul', 'paper-comp-chips');
        tw.wordBank.forEach(function (w) { twc.appendChild(el('li', '', w)); });
        twb.appendChild(twc);
        sheet.appendChild(twb);
      }
      if (Array.isArray(tw.frames) && tw.frames.length) {
        var fr = el('div', 'paper-comp-card');
        fr.appendChild(el('p', 'paper-comp-sub', 'Optional Sentence Frames'));
        var ful = el('ul');
        tw.frames.forEach(function (f) { ful.appendChild(el('li', '', f)); });
        fr.appendChild(ful);
        sheet.appendChild(fr);
      }
      appendCompLines(sheet, 8);
      if (Array.isArray(tw.checklist) && tw.checklist.length) {
        sheet.appendChild(el('p', 'paper-comp-sub', 'Self-Check Rubric'));
        appendCompChoices(sheet, tw.checklist);
      }
    } else if (kind === 'anchor_chart') {
      var ac = items[0];
      (Array.isArray(ac.sections) ? ac.sections : []).forEach(function (sec) {
        var card = el('div', 'paper-comp-card');
        card.appendChild(el('p', 'paper-comp-sub', sec.heading));
        if (sec.summary) card.appendChild(el('p', '', sec.summary));
        if (Array.isArray(sec.bullets) && sec.bullets.length) {
          var bul = el('ul');
          sec.bullets.forEach(function (b) { bul.appendChild(el('li', '', b)); });
          card.appendChild(bul);
        }
        if (sec.example) card.appendChild(el('p', '', 'Example: ' + sec.example));
        if (sec.takeaway) card.appendChild(el('p', '', 'Key takeaway: ' + sec.takeaway));
        sheet.appendChild(card);
      });
      var checks = Array.isArray(ac.selfCheck) ? ac.selfCheck : [];
      if (checks.length) {
        sheet.appendChild(el('p', 'paper-comp-sub', 'Quick Self-Check'));
        var qol = el('ol', 'paper-comp-qs');
        checks.forEach(function (q, idx) {
          var li = el('li', 'paper-comp-q');
          li.appendChild(el('span', '', q.prompt));
          if (Array.isArray(q.choices) && q.choices.length) appendCompChoices(li, q.choices);
          qol.appendChild(li);
          if (q.answer) keyEntries.push('Check ' + (idx + 1) + ': ' + q.answer);
        });
        sheet.appendChild(qol);
      }
    } else if (kind === 'adventure') {
      var adv = items[0];
      (Array.isArray(adv.scenes) ? adv.scenes : []).forEach(function (sc, idx) {
        var scCard = el('div', 'paper-comp-card');
        scCard.appendChild(el('p', 'paper-comp-sub', 'Scene ' + (idx + 1) + ': ' + sc.title));
        if (sc.text) scCard.appendChild(el('p', '', sc.text));
        if (sc.puzzle && sc.puzzle.prompt) {
          scCard.appendChild(el('p', 'paper-comp-prompt', 'Challenge: ' + sc.puzzle.prompt));
          if (Array.isArray(sc.puzzle.choices) && sc.puzzle.choices.length) appendCompChoices(scCard, sc.puzzle.choices);
          else appendCompLines(scCard, 1);
          if (sc.puzzle.answer) keyEntries.push('Scene ' + (idx + 1) + ' (' + sc.title + '): ' + sc.puzzle.answer);
        }
        if (Array.isArray(sc.choices) && sc.choices.length) {
          appendCompChoices(scCard, sc.choices.map(function (c) { return c.label || c.text || ''; }).filter(Boolean));
        }
        sheet.appendChild(scCard);
      });
    }

    if (keyEntries.length && (!keyBox || keyBox.checked)) {
      var keySec = el('div', 'paper-comp-key');
      keySec.appendChild(el('h4', '', 'Teacher Answer Key \u2014 ' + titleText));
      var kul = el('ul', 'paper-comp-key-list');
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

  function buildCompileDocxPayload(res, insp) {
    if (!res || !insp || !insp.ok || !Array.isArray(insp.items) || !insp.items.length) return null;
    var keyBox = $('f-paper-comp-key');
    var answerKeyOn = !keyBox || !!keyBox.checked;
    var titleText = state.title || insp.title || 'Offline Activity';
    var kind = res.kind;
    var items = insp.items;
    var sections = [];
    var keyEntries = [];

    if (kind === 'quiz') {
      sections.push({
        heading: 'Questions',
        directions: 'Answer each question below.',
        type: 'questions',
        items: items.map(function (it, idx) {
          if (it.answer) keyEntries.push('Item ' + (idx + 1) + ': ' + it.answer);
          return {
            prompt: it.prompt || '',
            choices: Array.isArray(it.choices) && it.choices.length ? it.choices.slice() : undefined,
            writeLines: 2,
          };
        }),
      });
    } else if (kind === 'cloze') {
      var cl = items[0];
      var blanked = (Array.isArray(cl.segments) ? cl.segments : []).map(function (seg) {
        return seg.type === 'blank' ? (' (' + (seg.blankIndex + 1) + ') ______________ ') : (seg.text || '');
      }).join('');
      var clParas = blanked.replace(/\r\n?/g, '\n').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      sections.push({
        heading: 'Fill in the Blanks',
        directions: cl.prompt || 'Complete each numbered blank using the Word Bank.',
        type: 'cloze',
        wordBank: Array.isArray(cl.wordBank) ? cl.wordBank.slice() : [],
        items: clParas.length ? clParas : [blanked || 'Complete the passage.'],
      });
      (Array.isArray(cl.blanks) ? cl.blanks : []).forEach(function (b, idx) {
        if (b && b.answer) keyEntries.push('Blank ' + (idx + 1) + ': ' + b.answer);
      });
    } else if (kind === 'concept_sort') {
      var cs = items[0];
      var cats = Array.isArray(cs.categories) ? cs.categories : [];
      var cards = Array.isArray(cs.cards) ? cs.cards : [];
      var catNames = Object.create(null);
      cats.forEach(function (c) { catNames[c.id] = c.label; });
      if (cats.length) {
        sections.push({
          heading: 'Categories',
          directions: cs.prompt || 'Sort each card into the matching category below.',
          type: 'boxes',
          columns: cats.length === 1 ? 1 : 2,
          items: cats.map(function (c) { return { title: c.label || '', writeLines: 4 }; }),
        });
      }
      if (cards.length) {
        sections.push({
          heading: 'Cards to Sort',
          type: 'checklist',
          items: mixForPaper(cards).map(function (cd) { return cd.text || ''; }),
        });
        cards.forEach(function (cd) { keyEntries.push((cd.text || '') + ' \u2192 ' + (catNames[cd.category] || cd.category)); });
      }
    } else if (kind === 'timeline') {
      var sq = items[0];
      var steps = Array.isArray(sq.steps) ? sq.steps : [];
      if (steps.length) {
        sections.push({
          heading: 'Sequence Order',
          directions: sq.prompt || 'Write the letter or event in order from first to last.',
          type: 'table',
          columns: ['Order', 'Event / Step'],
          rows: steps.map(function (_, idx) { return [(idx + 1) + '.', '']; }),
        });
        sections.push({
          heading: 'Events / Steps to Order',
          type: 'checklist',
          items: mixForPaper(steps).map(function (st, idx) {
            return String.fromCharCode(65 + (idx % 26)) + '. ' + (st.label ? st.label + ': ' : '') + (st.text || '');
          }),
        });
        steps.forEach(function (st, idx) {
          keyEntries.push((idx + 1) + '. ' + (st.label ? st.label + ': ' : '') + (st.text || ''));
        });
      }
    } else if (kind === 'writing') {
      var tw = items[0];
      if (tw.passage) {
        sections.push({
          heading: tw.passageTitle || 'Reading Passage',
          type: 'boxes',
          columns: 1,
          items: [{ title: tw.passageTitle || 'Source Text', detail: tw.passage }],
        });
      }
      if (Array.isArray(tw.wordBank) && tw.wordBank.length) {
        sections.push({
          heading: 'Word Bank',
          type: 'boxes',
          columns: 1,
          items: [{ title: 'Key Vocabulary', detail: tw.wordBank.join('  \u2022  ') }],
        });
      }
      if (Array.isArray(tw.frames) && tw.frames.length) {
        sections.push({
          heading: 'Optional Sentence Frames',
          type: 'checklist',
          items: tw.frames.slice(),
        });
      }
      sections.push({
        heading: 'Written Response',
        directions: tw.prompt || 'Write your response on the lines below.',
        type: 'lines',
        writeLines: 8,
      });
      if (Array.isArray(tw.checklist) && tw.checklist.length) {
        sections.push({
          heading: 'Self-Check Rubric',
          type: 'checklist',
          items: tw.checklist.slice(),
        });
      }
    } else if (kind === 'anchor_chart') {
      var ac = items[0];
      var acSecs = Array.isArray(ac.sections) ? ac.sections : [];
      if (acSecs.length) {
        sections.push({
          heading: 'Anchor Chart Study Guide',
          type: 'boxes',
          columns: acSecs.length >= 2 ? 2 : 1,
          items: acSecs.map(function (sec) {
            var details = [];
            if (sec.summary) details.push(sec.summary);
            if (Array.isArray(sec.bullets) && sec.bullets.length) details.push(sec.bullets.map(function (b) { return '\u2022 ' + b; }).join('  '));
            if (sec.example) details.push('Example: ' + sec.example);
            if (sec.takeaway) details.push('Key takeaway: ' + sec.takeaway);
            return { title: sec.heading || 'Key Concept', detail: details.join(' | ') };
          }),
        });
      }
      var checks = Array.isArray(ac.selfCheck) ? ac.selfCheck : [];
      if (checks.length) {
        sections.push({
          heading: 'Quick Self-Check',
          type: 'questions',
          items: checks.map(function (q, idx) {
            if (q.answer) keyEntries.push('Check ' + (idx + 1) + ': ' + q.answer);
            return {
              prompt: q.prompt || '',
              choices: Array.isArray(q.choices) && q.choices.length ? q.choices.slice() : undefined,
              writeLines: 2,
            };
          }),
        });
      }
    } else if (kind === 'adventure') {
      var adv = items[0];
      var scenes = Array.isArray(adv.scenes) ? adv.scenes : [];
      if (scenes.length) {
        sections.push({
          heading: 'Adventure & Challenge Log',
          directions: 'Read each scene, solve the challenge, and check the path you choose.',
          type: 'questions',
          items: scenes.map(function (sc, idx) {
            var parts = ['Scene ' + (idx + 1) + ': ' + (sc.title || '')];
            if (sc.text) parts.push(sc.text);
            if (sc.puzzle && sc.puzzle.prompt) parts.push('Challenge: ' + sc.puzzle.prompt);
            if (sc.puzzle && sc.puzzle.answer) keyEntries.push('Scene ' + (idx + 1) + ' (' + (sc.title || '') + '): ' + sc.puzzle.answer);
            var ch = (sc.puzzle && Array.isArray(sc.puzzle.choices) && sc.puzzle.choices.length)
              ? sc.puzzle.choices.slice()
              : (Array.isArray(sc.choices) ? sc.choices.map(function (c) { return c.label || c.text || ''; }).filter(Boolean) : undefined);
            return {
              prompt: parts.join(' — '),
              choices: ch && ch.length ? ch : undefined,
              writeLines: 2,
            };
          }),
        });
      }
    }

    return {
      title: titleText,
      subtitle: KIND_LABELS[kind] || kind || '',
      kind: kind || 'compiled',
      sections: sections,
      answerKey: keyEntries.length ? [{ heading: 'Answers', lines: keyEntries }] : [],
      answerKeyOn: answerKeyOn,
    };
  }

  function downloadCompileDocx() {
    if (!builtResult) buildPacket();
    var payload = buildCompileDocxPayload(builtResult, lastInspected);
    if (!payload) {
      announce('Compile an activity first to download a Word handout.');
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

  function buildPacket() {
    var prob = $('build-problem');
    var sum = $('summary');
    var making = $('making');
    if (prob) prob.hidden = true;
    if (sum) sum.hidden = true;
    drawPaperSheet(null, null);
    if (making) {
      making.hidden = false;
      $('making-line').textContent = 'Compiling your zero-network offline student packet...';
    }
    try {
      var gloss = parseGlossaryText(state.glossaryText);
      var mins = Number(state.timeMin);
      var teacherCode = String(($('f-teacher-code') && $('f-teacher-code').value) || '').trim();
      var singleName = batchNames.length === 1 ? batchNames[0] : '';
      builtResult = compiler.compileActivityPacket({
        artifact: state.jsonText,
        kind: state.kindOverride !== 'auto' ? state.kindOverride : undefined,
        title: state.title || undefined,
        mode: state.mode,
        form: state.form || 'Form A',
        timeLimitS: state.mode === 'probe' && mins > 0 ? Math.round(mins * 60) : null,
        teacherCode: state.mode === 'probe' && teacherCode ? teacherCode : undefined,
        homeLanguages: state.homeLanguages.length ? state.homeLanguages.slice() : undefined,
        bilingualGlossary: Object.keys(gloss).length ? gloss : undefined,
        stationMode: !!state.stationMode,
        qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
        learner: singleName || undefined,
        loader: loader,
        choiceBuilder: choiceBuilder,
        choiceAdapters: choiceAdapters,
        qrCrypto: qrCrypto,
        stationBilingual: bilingual,
      });

      if (making) making.hidden = true;
      var report = verify && typeof verify.verifyPacket === 'function' ? verify.verifyPacket(builtResult.html) : null;
      var kb = Math.max(1, Math.round(builtResult.html.length / 1024));
      var sr = builtResult.stripReport;
      var strippedTotal = sr.promptFieldsStripped.length + sr.urlsStripped + sr.emailsStripped + sr.htmlTagsStripped;
      var facts = (KIND_LABELS[builtResult.kind] || builtResult.kind) + ' (' + builtResult.unitCount + ' items/parts, '
        + (builtResult.mode === 'probe' ? 'Check mode' : 'Practice mode') + ', ' + kb + ' KB). '
        + (strippedTotal > 0 ? 'Stripped ' + strippedTotal + ' external/metadata item(s). ' : '')
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
        var ho = window.AlloPacketHandoff || handoff;
        if (ho && typeof ho.hostPreview === 'function') {
          if (previewSession && typeof previewSession.update === 'function') {
            previewSession.update({ url: previewUrl, html: builtResult.html });
          } else {
            previewSession = ho.hostPreview({ url: previewUrl, html: builtResult.html });
          }
        }
      }
      if ($('save')) $('save').hidden = false;
      renderSummaryRows();
      drawPaperSheet(builtResult, lastInspected);
      if ($('making-said')) $('making-said').textContent = 'The offline packet is ready.';
    } catch (err) {
      if (making) making.hidden = true;
      if (prob) prob.hidden = false;
      if ($('build-problem-text')) $('build-problem-text').textContent = (err && err.message) || 'Could not compile that activity JSON.';
    }
  }

  function renderSummaryRows() {
    var dl = $('summary-rows');
    if (!dl || !builtResult) return;
    dl.textContent = '';
    var sr = builtResult.stripReport;
    var rows = [
      ['Compiled activity', KIND_LABELS[builtResult.kind] || builtResult.kind],
      ['Mode', builtResult.mode === 'probe' ? 'Check (scrambled answers, one try)' : 'Practice / exploration'],
      ['Items / parts', String(builtResult.unitCount)],
      ['Sanitizer strip summary', sr.promptFieldsStripped.length + ' prompt/model fields, ' + sr.urlsStripped + ' web addresses, ' + sr.externalImagesConverted + ' external images converted'],
      ['Languages', state.homeLanguages.length ? 'English + ' + state.homeLanguages.join(', ').toUpperCase() : 'English'],
      ['Station Mode & Sealed QR', (state.stationMode ? 'Station Mode on' : 'Standard') + (String(state.qrPublicKey || '').trim() ? ' + Sealed QR enabled' : '')],
    ];
    rows.forEach(function (pair) {
      dl.appendChild(el('dt', '', pair[0]));
      dl.appendChild(el('dd', '', pair[1]));
    });
  }

  function fileStem(title, learner) {
    var base = String(title || 'offline-activity').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'offline-activity';
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
      if (said) said.textContent = '1 code name (' + batchNames[0] + ') will be placed inside the saved packet file.';
      if (btn) btn.hidden = true;
    } else {
      if (said) said.textContent = batchNames.length + ' student files ready to package in one .zip.';
      if (btn) btn.hidden = false;
    }
    if (currentStep === 3 && builtResult) buildPacket();
  }

  function goStep(step, focusHeading) {
    if (step >= 2) {
      var err1 = validateStep1();
      if (err1) {
        if ($('step-1-problem')) $('step-1-problem').textContent = err1;
        step = 1;
      } else if ($('step-1-problem')) {
        $('step-1-problem').textContent = '';
      }
    }
    if (step >= 3) {
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
    if (step === 1) {
      drawSamples();
      if ($('f-json')) $('f-json').value = state.jsonText || '';
      inspectLive();
    }
    if (step === 2) syncStep2();
    if (step === 3) {
      if ($('f-title')) $('f-title').value = state.title || (lastInspected && lastInspected.title) || 'Offline Activity';
      buildPacket();
    }
    if (focusHeading) {
      var h = $('step-' + step + '-title');
      if (h && typeof h.focus === 'function') h.focus();
    }
  }

  function loadJsonFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      state.sampleId = '';
      state.kindOverride = 'auto';
      state.jsonText = String(reader.result || '');
      if ($('f-json')) $('f-json').value = state.jsonText;
      var insp = inspectLive();
      if (insp.ok) state.title = insp.title;
      remember();
      drawSamples();
      announce('Loaded JSON file: ' + (file.name || 'activity.json'));
    };
    reader.readAsText(file);
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
    var res = compiler.readCompiledPacket(text, verifyCore);
    var note = $('reopen-note');
    var line = $('reopen-line');
    var list = $('reopen-list');
    var link = $('reopen-page');
    if (!res.ok) {
      var ho = window.AlloPacketHandoff || handoff;
      var owner = ho && typeof ho.ownerPage === 'function' ? ho.ownerPage(rawBytes || text, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-compile.html') ? owner : null;
      var buf = targetPage ? toArrayBuffer(rawBytes, text) : null;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && buf) {
        reopenPending = {
          file: { name: String(fileName || 'packet.html').slice(0, 120), bytes: buf },
          href: targetPage.href,
          hash: targetPage.hash || (targetPage.href === 'packets-results.html' ? ((ho && ho.RESULTS_HASH) || '#import-results') : ((ho && ho.HASH) || '#open-file')),
        };
      } else {
        reopenPending = null;
      }
      if (line) line.textContent = res.error || 'Could not open that file as a compiled packet.';
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
      sampleId: '',
      jsonText: res.artifact ? JSON.stringify(res.artifact, null, 2) : '',
      kindOverride: res.kind || 'auto',
      title: res.title,
      mode: res.mode,
      form: res.form || 'Form A',
      timeMin: res.timeLimitS ? String(Math.round(res.timeLimitS / 60)) : '',
      homeLanguages: res.homeLanguages || [],
      glossaryText: formatGlossaryText(res.bilingualGlossary),
      stationMode: !!res.stationMode,
      qrPublicKey: res.qrPublicKey || '',
    };
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    batchNames = parseBatchNames(res.learner || '');
    if ($('f-teacher-code')) $('f-teacher-code').value = '';
    remember();
    if (line) line.textContent = 'Loaded "' + state.title + '" (' + (KIND_LABELS[res.kind] || res.kind) + ').';
    if (list) {
      list.textContent = '';
      (res.notes || []).forEach(function (n) { list.appendChild(el('li', '', n)); });
    }
    if (note) note.hidden = false;
    goStep(2, false);
    announce('Loaded existing compiled packet: ' + state.title);
  }

  function handleReopenFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      handleReopenText(String(reader.result || ''), file.name, null);
    };
    reader.readAsText(file);
  }

  function checkHandoffDraft() {
    var ho = window.AlloPacketHandoff || handoff;
    if (!ho) return;
    var hash = window.location ? window.location.hash : '';
    if (hash === (ho.DRAFT_HASH || '#import-draft') && typeof ho.takeDraft === 'function') {
      ho.takeDraft().then(function (draft) {
        if (!draft || typeof draft !== 'object') return;
        var payload = (draft.artifact && typeof draft.artifact === 'object') ? draft.artifact : draft;
        state.sampleId = '';
        state.kindOverride = 'auto';
        state.jsonText = JSON.stringify(payload, null, 2);
        var insp = inspectLive();
        if (insp.ok) state.title = draft.title || insp.title;
        remember();
        if ($('import-banner') && $('import-banner-text')) {
          $('import-banner-text').textContent = 'Imported activity draft: "' + (state.title || 'Activity') + '". Review the strip report below.';
          $('import-banner').hidden = false;
        }
        try {
          if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } catch (_) {}
        goStep(insp.ok ? 2 : 1, false);
      }, function () {});
    } else if (hash === (ho.HASH || '#open-file') && typeof ho.take === 'function') {
      try {
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (_) {}
      ho.take().then(function (file) {
        if (file && file.bytes) handleReopenText(decodeBytes(file.bytes), file.name, file.bytes);
      }, function () {});
    }
  }

  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    if (!loader || !compiler) {
      if ($('loading')) $('loading').hidden = true;
      if ($('load-problem')) $('load-problem').hidden = false;
      return;
    }

    state = recall();
    if ($('loading')) $('loading').hidden = true;
    if ($('reopen')) $('reopen').hidden = false;

    document.querySelectorAll('.step-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { goStep(Number(tab.getAttribute('data-go')) || 1, true); });
    });

    if ($('f-json')) $('f-json').addEventListener('input', function () {
      state.sampleId = '';
      state.jsonText = $('f-json').value;
      var insp = inspectLive();
      if (insp.ok) state.title = insp.title;
      remember();
      drawSamples();
    });

    if ($('json-choose') && $('json-file')) {
      $('json-choose').addEventListener('click', function () { $('json-file').click(); });
      $('json-file').addEventListener('change', function () {
        if ($('json-file').files && $('json-file').files[0]) loadJsonFile($('json-file').files[0]);
      });
    }
    if ($('json-drop')) {
      $('json-drop').addEventListener('dragover', function (e) { e.preventDefault(); $('json-drop').classList.add('is-over'); });
      $('json-drop').addEventListener('dragleave', function () { $('json-drop').classList.remove('is-over'); });
      $('json-drop').addEventListener('drop', function (e) {
        e.preventDefault();
        $('json-drop').classList.remove('is-over');
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) loadJsonFile(f);
      });
    }

    if ($('next-1')) $('next-1').addEventListener('click', function () { goStep(2, true); });

    if ($('f-kind-override')) $('f-kind-override').addEventListener('change', function () {
      state.kindOverride = $('f-kind-override').value;
      remember();
      syncStep2();
    });
    if ($('f-step2-title')) $('f-step2-title').addEventListener('input', function () {
      state.title = $('f-step2-title').value.trim().slice(0, 80);
      remember();
    });
    document.querySelectorAll('input[name="mode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (r.checked) {
          state.mode = r.value === 'probe' ? 'probe' : 'practice';
          remember();
          syncModeUi();
        }
      });
    });
    if ($('f-form')) $('f-form').addEventListener('input', function () { state.form = $('f-form').value.trim().slice(0, 40) || 'Form A'; remember(); });
    if ($('f-time-min')) $('f-time-min').addEventListener('input', function () { state.timeMin = $('f-time-min').value; remember(); });
    if ($('f-glossary')) $('f-glossary').addEventListener('input', function () { state.glossaryText = $('f-glossary').value; remember(); });
    if ($('f-station-mode')) $('f-station-mode').addEventListener('change', function () { state.stationMode = $('f-station-mode').checked; remember(); updateSupportsNow(); });
    if ($('f-qr-key')) $('f-qr-key').addEventListener('input', function () { state.qrPublicKey = $('f-qr-key').value.trim(); remember(); updateSupportsNow(); });

    if ($('back-2')) $('back-2').addEventListener('click', function () { goStep(1, true); });
    if ($('next-2')) $('next-2').addEventListener('click', function () { goStep(3, true); });

    if ($('back-3')) $('back-3').addEventListener('click', function () { goStep(2, true); });
    if ($('fix-choices')) $('fix-choices').addEventListener('click', function () { goStep(2, true); });
    if ($('retry')) $('retry').addEventListener('click', buildPacket);
    if ($('f-title')) $('f-title').addEventListener('input', function () {
      state.title = $('f-title').value.trim().slice(0, 80) || 'Offline Activity';
      remember();
      buildPacket();
    });
    if ($('save')) $('save').addEventListener('click', function () {
      if (!builtResult) return;
      var who = batchNames.length === 1 ? batchNames[0] : '';
      triggerDownload(fileStem(state.title, who) + '.html', builtResult.html, 'text/html;charset=utf-8');
      if ($('after-save')) { $('after-save').hidden = false; $('after-save').focus(); }
    });

    var paperFold = $('paper-comp-fold');
    if (paperFold) {
      paperFold.addEventListener('toggle', function () {
        var sheet = $('paper-comp-sheet');
        if (sheet) sheet.hidden = !(paperFold.open && sheet.getAttribute('data-ready') === '1');
      });
    }
    var paperKey = $('f-paper-comp-key');
    if (paperKey) {
      paperKey.addEventListener('change', function () {
        if (builtResult && lastInspected) drawPaperSheet(builtResult, lastInspected);
      });
    }
    var paperBtn = $('print-paper-comp');
    if (paperBtn) {
      paperBtn.addEventListener('click', function () {
        if (!builtResult) buildPacket();
        var sheet = $('paper-comp-sheet');
        if (!sheet || sheet.getAttribute('data-ready') !== '1') return;
        if (paperFold) paperFold.open = true;
        sheet.hidden = false;
        announce('Opening print dialog for the compiled paper worksheet.');
        try { window.print(); } catch (_) {}
      });
    }
    var docxBtn = $('download-docx');
    if (docxBtn) {
      docxBtn.addEventListener('click', function () { downloadCompileDocx(); });
    }

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
          zip.add(fileStem(state.title, name) + '.html', compiler.withCodeName(builtResult.html, name));
        });
        var parts = zip.finish();
        triggerDownload(fileStem(state.title, '') + '__packets.zip', new Blob(parts, { type: 'application/zip' }), 'application/zip');
        if ($('batch-problem')) $('batch-problem').textContent = '';
      } catch (err) {
        if ($('batch-problem')) $('batch-problem').textContent = (err && err.message) || 'Could not make the .zip file.';
      }
    });

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
        var ho = window.AlloPacketHandoff || handoff;
        if (!reopenPending || !ho || typeof ho.redirect !== 'function') return;
        event.preventDefault();
        var target = reopenPending;
        reopenPending = null;
        ho.redirect(target.file, target.href, target.hash).catch(function () { window.location.href = target.href; });
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

    if ($('forget')) $('forget').addEventListener('click', function () {
      try { localStorage.removeItem(STORE_KEY); } catch (_) {}
      var ho = window.AlloPacketHandoff || handoff;
      if (ho && typeof ho.clearSavedQrPublicKey === 'function') ho.clearSavedQrPublicKey();
      stopPreview();
      state = defaultState();
      if ($('f-qr-key') && $('f-qr-key')._alloQrHelper) $('f-qr-key')._alloQrHelper.sync('');
      if ($('f-batch-names')) $('f-batch-names').value = '';
      batchNames = [];
      if ($('f-teacher-code')) $('f-teacher-code').value = '';
      goStep(1, false);
      if ($('forget-said')) $('forget-said').textContent = 'Saved choices removed from this browser.';
    });

    window.addEventListener('pagehide', stopPreview);
    goStep(1, false);
    checkHandoffDraft();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
