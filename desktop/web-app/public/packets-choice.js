// Educator maker controller for packets-choice.html (Concept Sort, Sequence Order, Tiered Writing, UDL Choice Board).
// Everything runs in this browser tab. Zero network, zero cookies, zero markup strings.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-choice/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;

  var $ = function (id) { return document.getElementById(id); };
  var builder = null;
  var adapters = null;
  var loader = null;
  var bilingualMod = null;
  var verifyCore = null;
  var step = 1;
  var built = null;
  var builtLearner = '';
  var previewSession = null;
  var previewUrl = '';
  var activeSubject = 'all';
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

  function parseCategoriesText(text) {
    return splitLines(text).slice(0, 4).map(function (line, i) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      return { id: 'g' + (i + 1), label: parts[0] || '', description: parts[1] || '' };
    }).filter(function (c) { return !!c.label; });
  }

  function formatCategoriesText(cats) {
    return (Array.isArray(cats) ? cats : []).map(function (c) {
      return c.description ? (c.label + ' | ' + c.description) : c.label;
    }).join('\n');
  }

  function parseCardsText(text, categories) {
    var byLabel = Object.create(null);
    (categories || []).forEach(function (c) {
      byLabel[c.label.toLowerCase()] = c.id;
      byLabel[c.id.toLowerCase()] = c.id;
    });
    var fallback = categories && categories[0] ? categories[0].id : '';
    return splitLines(text).slice(0, 12).map(function (line, i) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      var catKey = String(parts[1] || '').toLowerCase();
      return {
        id: 'c' + (i + 1),
        text: parts[0] || '',
        category: byLabel[catKey] || fallback,
        detail: parts[2] || '',
        icon: parts[3] || '',
      };
    }).filter(function (c) { return !!c.text && !!c.category; });
  }

  function formatCardsText(cards, categories) {
    var labelById = Object.create(null);
    (categories || []).forEach(function (c) { labelById[c.id] = c.label; });
    return (Array.isArray(cards) ? cards : []).map(function (c) {
      var catLabel = labelById[c.category] || c.category || '';
      var cols = [c.text, catLabel];
      if (c.detail || (c.icon && String(c.icon).indexOf('data:') !== 0)) cols.push(c.detail || '');
      if (c.icon && String(c.icon).indexOf('data:') !== 0) cols.push(c.icon);
      return cols.join(' | ');
    }).join('\n');
  }

  function parseStepsText(text) {
    return splitLines(text).slice(0, 8).map(function (line, i) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      if (parts.length >= 2) return { id: 's' + (i + 1), label: parts[0], text: parts.slice(1).join(' | '), order: i };
      return { id: 's' + (i + 1), label: '', text: parts[0], order: i };
    }).filter(function (s) { return !!s.text; });
  }

  function formatStepsText(steps) {
    return (Array.isArray(steps) ? steps : []).map(function (s) {
      return s.label ? (s.label + ' | ' + s.text) : s.text;
    }).join('\n');
  }

  function parseClozeQuestionsText(text) {
    return splitLines(text).slice(0, 8).map(function (line, i) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      var qText = parts[0] || '';
      var ans = splitComma(parts[1] || '');
      return { id: 'q' + (i + 1), text: qText, answers: ans };
    }).filter(function (q) { return !!q.text && q.answers.length > 0; });
  }

  function formatClozeQuestionsText(qs) {
    return (Array.isArray(qs) ? qs : []).map(function (q) {
      return q.text + ' | ' + (q.answers || []).join(', ');
    }).join('\n');
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

  function defaultStateFromTemplates() {
    var tpl = builder.templateById('sci_ecosystems_choice') || builder.templates()[0];
    var sortTpl = builder.templateById('sci_states_matter_sort');
    var seqTpl = builder.templateById('sci_water_cycle_seq');
    var writeTpl = builder.templateById('ela_claim_evidence_write');
    var elaChoice = builder.templateById('ela_story_elements_choice');
    var clozePath = elaChoice ? elaChoice.item.pathways.filter(function (p) { return p.kind === 'cloze_short'; })[0] : null;
    var ecoPaths = tpl.item.pathways;
    var pathByKind = function (k) { return ecoPaths.filter(function (p) { return p.kind === k; })[0] || null; };

    return {
      templateId: tpl.id,
      activity: tpl.activity,
      mode: 'practice',
      form: 'Form A',
      timeLimitMin: '',
      title: tpl.title,
      homeLanguages: [],
      glossaryText: '',
      stationMode: false,
      qrPublicKey: '',
      sort: {
        topic: sortTpl.item.word,
        prompt: sortTpl.item.prompt,
        hint: sortTpl.item.hint || '',
        catsText: formatCategoriesText(sortTpl.item.categories),
        cardsText: formatCardsText(sortTpl.item.cards, sortTpl.item.categories),
      },
      seq: {
        topic: seqTpl.item.word,
        prompt: seqTpl.item.prompt,
        hint: seqTpl.item.hint || '',
        stepsText: formatStepsText(seqTpl.item.steps),
      },
      write: {
        topic: writeTpl.item.word,
        prompt: writeTpl.item.prompt,
        passageTitle: writeTpl.item.passageTitle || '',
        passage: writeTpl.item.passage || '',
        minWords: writeTpl.item.minWords || 14,
        defaultLevel: 'frames',
        bankText: (writeTpl.item.wordBank || []).join(', '),
        framesText: (writeTpl.item.frames || []).join('\n'),
        startersText: (writeTpl.item.starters || []).join('\n'),
        checklistText: (writeTpl.item.checklist || []).join('\n'),
      },
      choice: {
        topic: tpl.item.word,
        goal: tpl.item.goal,
        prompt: tpl.item.prompt,
        enabled: { concept_sort: true, sequence_order: true, cloze_short: false, tiered_writing: true },
        sort: {
          title: pathByKind('concept_sort').title,
          summary: pathByKind('concept_sort').summary,
          catsText: formatCategoriesText(pathByKind('concept_sort').data.categories),
          cardsText: formatCardsText(pathByKind('concept_sort').data.cards, pathByKind('concept_sort').data.categories),
        },
        seq: {
          title: pathByKind('sequence_order').title,
          summary: pathByKind('sequence_order').summary,
          stepsText: formatStepsText(pathByKind('sequence_order').data.steps),
        },
        cloze: {
          title: clozePath ? clozePath.title : 'Complete Key Statements',
          summary: clozePath ? clozePath.summary : 'Fill in key terms in short sentences.',
          bankText: clozePath ? (clozePath.data.wordBank || []).join(', ') : '',
          qsText: clozePath ? formatClozeQuestionsText(clozePath.data.questions) : '',
        },
        write: {
          title: pathByKind('tiered_writing').title,
          summary: pathByKind('tiered_writing').summary,
          prompt: pathByKind('tiered_writing').data.prompt,
          passage: pathByKind('tiered_writing').data.passage || '',
          bankText: (pathByKind('tiered_writing').data.wordBank || []).join(', '),
          framesText: (pathByKind('tiered_writing').data.frames || []).join('\n'),
          startersText: (pathByKind('tiered_writing').data.starters || []).join('\n'),
          checklistText: (pathByKind('tiered_writing').data.checklist || []).join('\n'),
        },
      },
    };
  }

  function applyTemplate(tpl) {
    if (!tpl) return;
    state.templateId = tpl.id;
    state.activity = tpl.activity;
    state.mode = 'practice';
    state.title = tpl.title;
    if (tpl.activity === 'concept_sort') {
      state.sort = {
        topic: tpl.item.word,
        prompt: tpl.item.prompt,
        hint: tpl.item.hint || '',
        catsText: formatCategoriesText(tpl.item.categories),
        cardsText: formatCardsText(tpl.item.cards, tpl.item.categories),
      };
    } else if (tpl.activity === 'sequence_order') {
      state.seq = {
        topic: tpl.item.word,
        prompt: tpl.item.prompt,
        hint: tpl.item.hint || '',
        stepsText: formatStepsText(tpl.item.steps),
      };
    } else if (tpl.activity === 'tiered_writing') {
      state.write = {
        topic: tpl.item.word,
        prompt: tpl.item.prompt,
        passageTitle: tpl.item.passageTitle || '',
        passage: tpl.item.passage || '',
        minWords: tpl.item.minWords || 14,
        defaultLevel: tpl.item.defaultLevel || 'frames',
        bankText: (tpl.item.wordBank || []).join(', '),
        framesText: (tpl.item.frames || []).join('\n'),
        startersText: (tpl.item.starters || []).join('\n'),
        checklistText: (tpl.item.checklist || []).join('\n'),
      };
    } else if (tpl.activity === 'choice_board') {
      state.choice.topic = tpl.item.word;
      state.choice.goal = tpl.item.goal;
      state.choice.prompt = tpl.item.prompt;
      state.choice.enabled = { concept_sort: false, sequence_order: false, cloze_short: false, tiered_writing: false };
      (tpl.item.pathways || []).forEach(function (p) {
        state.choice.enabled[p.kind] = true;
        if (p.kind === 'concept_sort') {
          state.choice.sort = {
            title: p.title,
            summary: p.summary,
            catsText: formatCategoriesText(p.data.categories),
            cardsText: formatCardsText(p.data.cards, p.data.categories),
          };
        } else if (p.kind === 'sequence_order') {
          state.choice.seq = {
            title: p.title,
            summary: p.summary,
            stepsText: formatStepsText(p.data.steps),
          };
        } else if (p.kind === 'cloze_short') {
          state.choice.cloze = {
            title: p.title,
            summary: p.summary,
            bankText: (p.data.wordBank || []).join(', '),
            qsText: formatClozeQuestionsText(p.data.questions),
          };
        } else if (p.kind === 'tiered_writing') {
          state.choice.write = {
            title: p.title,
            summary: p.summary,
            prompt: p.data.prompt,
            passage: p.data.passage || '',
            bankText: (p.data.wordBank || []).join(', '),
            framesText: (p.data.frames || []).join('\n'),
            startersText: (p.data.starters || []).join('\n'),
            checklistText: (p.data.checklist || []).join('\n'),
          };
        }
      });
    }
    remember();
  }

  function remember() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function recall() {
    var base = defaultStateFromTemplates();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw, function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
      if (!parsed || typeof parsed !== 'object') return base;
      return Object.assign(base, parsed, {
        sort: Object.assign(base.sort, parsed.sort || {}),
        seq: Object.assign(base.seq, parsed.seq || {}),
        write: Object.assign(base.write, parsed.write || {}),
        choice: Object.assign(base.choice, parsed.choice || {}, {
          enabled: Object.assign(base.choice.enabled, (parsed.choice && parsed.choice.enabled) || {}),
          sort: Object.assign(base.choice.sort, (parsed.choice && parsed.choice.sort) || {}),
          seq: Object.assign(base.choice.seq, (parsed.choice && parsed.choice.seq) || {}),
          cloze: Object.assign(base.choice.cloze, (parsed.choice && parsed.choice.cloze) || {}),
          write: Object.assign(base.choice.write, (parsed.choice && parsed.choice.write) || {}),
        }),
      });
    } catch (_) {
      return base;
    }
  }

  function buildLessonConfig() {
    var act = state.activity;
    var item = null;
    if (act === 'concept_sort') {
      var cats = parseCategoriesText(state.sort.catsText);
      var cards = parseCardsText(state.sort.cardsText, cats);
      item = {
        id: 'cs-1',
        word: state.sort.topic || state.title || 'Concept Sort',
        prompt: state.sort.prompt,
        hint: state.sort.hint,
        categories: cats,
        cards: cards,
      };
    } else if (act === 'sequence_order') {
      item = {
        id: 'sq-1',
        word: state.seq.topic || state.title || 'Sequence Order',
        prompt: state.seq.prompt,
        hint: state.seq.hint,
        steps: parseStepsText(state.seq.stepsText),
      };
    } else if (act === 'tiered_writing') {
      item = {
        id: 'tw-1',
        word: state.write.topic || state.title || 'Tiered Writing',
        prompt: state.write.prompt,
        passageTitle: state.write.passageTitle,
        passage: state.write.passage,
        minWords: Math.max(3, Math.min(250, Number(state.write.minWords) || 14)),
        defaultLevel: state.write.defaultLevel || 'frames',
        wordBank: splitComma(state.write.bankText),
        frames: splitLines(state.write.framesText),
        starters: splitLines(state.write.startersText),
        checklist: splitLines(state.write.checklistText),
      };
    } else {
      var pathways = [];
      if (state.choice.enabled.concept_sort) {
        var cbCats = parseCategoriesText(state.choice.sort.catsText);
        pathways.push({
          id: 'path_sort',
          kind: 'concept_sort',
          title: state.choice.sort.title || 'Sort the Concepts',
          summary: state.choice.sort.summary || 'Group cards into categories.',
          data: { id: 'cb-cs', word: state.choice.topic, prompt: state.choice.sort.summary, categories: cbCats, cards: parseCardsText(state.choice.sort.cardsText, cbCats) },
        });
      }
      if (state.choice.enabled.sequence_order) {
        pathways.push({
          id: 'path_seq',
          kind: 'sequence_order',
          title: state.choice.seq.title || 'Order the Steps',
          summary: state.choice.seq.summary || 'Put the steps in order.',
          data: { id: 'cb-sq', word: state.choice.topic, prompt: state.choice.seq.summary, steps: parseStepsText(state.choice.seq.stepsText) },
        });
      }
      if (state.choice.enabled.cloze_short) {
        pathways.push({
          id: 'path_cloze',
          kind: 'cloze_short',
          title: state.choice.cloze.title || 'Complete the Statements',
          summary: state.choice.cloze.summary || 'Fill in key terms.',
          data: { prompt: state.choice.cloze.summary, wordBank: splitComma(state.choice.cloze.bankText), questions: parseClozeQuestionsText(state.choice.cloze.qsText) },
        });
      }
      if (state.choice.enabled.tiered_writing) {
        pathways.push({
          id: 'path_write',
          kind: 'tiered_writing',
          title: state.choice.write.title || 'Write an Explanation',
          summary: state.choice.write.summary || 'Explain with frames, starters, or your own words.',
          data: {
            id: 'cb-tw',
            word: state.choice.topic,
            prompt: state.choice.write.prompt,
            passage: state.choice.write.passage,
            minWords: 12,
            wordBank: splitComma(state.choice.write.bankText),
            frames: splitLines(state.choice.write.framesText),
            starters: splitLines(state.choice.write.startersText),
            checklist: splitLines(state.choice.write.checklistText),
          },
        });
      }
      item = {
        id: 'cb-1',
        word: state.choice.topic || state.title || 'UDL Choice Board',
        goal: state.choice.goal,
        prompt: state.choice.prompt,
        pathways: pathways.slice(0, 3),
      };
    }

    var mins = Number(state.timeLimitMin);
    return {
      title: state.title || (item && item.word) || 'Choice Packet',
      activity: act,
      mode: builder.CHECK_CAPABLE[act] && state.mode === 'probe' ? 'probe' : 'practice',
      form: state.form || 'Form A',
      timeLimitS: mins > 0 ? Math.round(mins * 60) : null,
      items: [item],
      homeLanguages: Array.isArray(state.homeLanguages) ? state.homeLanguages.slice() : [],
      bilingualGlossary: parseGlossaryText(state.glossaryText),
      stationMode: !!state.stationMode,
      qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
    };
  }

  function validateStep2() {
    var act = state.activity;
    if (act === 'concept_sort') {
      var cats = parseCategoriesText(state.sort.catsText);
      var cards = parseCardsText(state.sort.cardsText, cats);
      if (cats.length < 2) return 'Enter at least 2 categories (one per line).';
      if (cards.length < 2) return 'Enter at least 2 cards with matching categories.';
    } else if (act === 'sequence_order') {
      var steps = parseStepsText(state.seq.stepsText);
      if (steps.length < 3) return 'Enter at least 3 ordered steps (one per line).';
    } else if (act === 'tiered_writing') {
      if (!String(state.write.prompt || '').trim()) return 'Enter a writing prompt.';
      if (!splitLines(state.write.framesText).length) return 'Enter at least 1 Level 1 sentence frame.';
    } else if (act === 'choice_board') {
      var chosen = Object.keys(state.choice.enabled).filter(function (k) { return state.choice.enabled[k]; });
      if (chosen.length < 2 || chosen.length > 3) return 'Select 2 or 3 pathways for the Choice Board.';
      var cfg = buildLessonConfig();
      if (!cfg.items[0].pathways || cfg.items[0].pathways.length < 2) return 'At least 2 selected pathways need valid items.';
    }
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && window.AlloPacketQrCrypto && !window.AlloPacketQrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key must start with AFPK1.';
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Rendering Steps
  // ---------------------------------------------------------------------------
  function drawTemplates() {
    var host = $('template-list');
    if (!host) return;
    host.textContent = '';
    var list = builder.templates().filter(function (t) {
      return activeSubject === 'all' || t.subject === activeSubject;
    });
    list.forEach(function (tpl) {
      var actName = adapters.ADAPTERS[tpl.activity] ? adapters.ADAPTERS[tpl.activity].title : tpl.activity;
      var btn = el('button', 'template-card');
      btn.type = 'button';
      btn.setAttribute('data-template-id', tpl.id);
      btn.setAttribute('aria-pressed', state.templateId === tpl.id ? 'true' : 'false');
      var meta = el('span', 'template-meta');
      meta.appendChild(el('span', 'template-tag', tpl.subject));
      meta.appendChild(el('span', 'template-tag', tpl.gradeBand));
      meta.appendChild(el('span', 'template-tag', actName));
      btn.appendChild(meta);
      btn.appendChild(el('span', 'template-name', tpl.name));
      btn.appendChild(el('span', 'template-summary', tpl.summary));
      btn.addEventListener('click', function () {
        applyTemplate(tpl);
        drawStep1();
        announce('Loaded template ' + tpl.name + '.');
      });
      host.appendChild(btn);
    });
  }

  function drawStep1() {
    drawTemplates();
    var radios = document.querySelectorAll('input[name="activity"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = radios[i].value === state.activity;
    }
    var checkOk = !!builder.CHECK_CAPABLE[state.activity];
    var modeBlock = $('mode-block');
    if (modeBlock) modeBlock.hidden = !checkOk;
    if (!checkOk) state.mode = 'practice';
    var modeRadios = document.querySelectorAll('input[name="mode"]');
    for (var j = 0; j < modeRadios.length; j++) {
      modeRadios[j].checked = modeRadios[j].value === state.mode;
    }
    var checkExtra = $('check-extra');
    if (checkExtra) checkExtra.hidden = !(checkOk && state.mode === 'probe');
    if ($('f-check-form')) $('f-check-form').value = state.form || 'Form A';
    if ($('f-check-time')) $('f-check-time').value = state.timeLimitMin === '' ? '' : String(state.timeLimitMin);
  }

  function updateParseNotes() {
    if (state.activity === 'concept_sort') {
      var cats = parseCategoriesText(state.sort.catsText);
      var cards = parseCardsText(state.sort.cardsText, cats);
      setText('cs-parse-note', cats.length + ' categories, ' + cards.length + ' cards ready.');
    } else if (state.activity === 'sequence_order') {
      var steps = parseStepsText(state.seq.stepsText);
      setText('sq-parse-note', steps.length + ' ordered steps ready.');
    } else if (state.activity === 'choice_board') {
      var count = Object.keys(state.choice.enabled).filter(function (k) { return state.choice.enabled[k]; }).length;
      setText('cb-path-note', count + ' of 2-3 pathways selected.');
    }
    var langs = Array.isArray(state.homeLanguages) ? state.homeLanguages : [];
    var parts = [langs.length ? (langs.length + ' home language' + (langs.length === 1 ? '' : 's')) : 'English only'];
    if (state.stationMode) parts.push('Station Mode on');
    if (String(state.qrPublicKey || '').trim()) parts.push('Sealed QR on');
    setText('supports-now', parts.join(' | '));
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
        updateParseNotes();
      });
      lbl.appendChild(cb);
      lbl.appendChild(el('span', 'pill-name', lang.nativeName));
      lbl.appendChild(el('span', 'pill-ex', lang.name + (lang.dir === 'rtl' ? ' (RTL)' : '')));
      host.appendChild(lbl);
    });
  }

  function drawStep2() {
    $('ed-sort').hidden = state.activity !== 'concept_sort';
    $('ed-seq').hidden = state.activity !== 'sequence_order';
    $('ed-write').hidden = state.activity !== 'tiered_writing';
    $('ed-choice').hidden = state.activity !== 'choice_board';

    $('f-cs-topic').value = state.sort.topic || '';
    $('f-cs-prompt').value = state.sort.prompt || '';
    $('f-cs-hint').value = state.sort.hint || '';
    $('f-cs-cats').value = state.sort.catsText || '';
    $('f-cs-cards').value = state.sort.cardsText || '';

    $('f-sq-topic').value = state.seq.topic || '';
    $('f-sq-prompt').value = state.seq.prompt || '';
    $('f-sq-hint').value = state.seq.hint || '';
    $('f-sq-steps').value = state.seq.stepsText || '';

    $('f-tw-topic').value = state.write.topic || '';
    $('f-tw-prompt').value = state.write.prompt || '';
    $('f-tw-ptitle').value = state.write.passageTitle || '';
    $('f-tw-passage').value = state.write.passage || '';
    $('f-tw-minwords').value = String(state.write.minWords || 14);
    $('f-tw-default').value = state.write.defaultLevel || 'frames';
    $('f-tw-bank').value = state.write.bankText || '';
    $('f-tw-frames').value = state.write.framesText || '';
    $('f-tw-starters').value = state.write.startersText || '';
    $('f-tw-checklist').value = state.write.checklistText || '';

    $('f-cb-topic').value = state.choice.topic || '';
    $('f-cb-goal').value = state.choice.goal || '';
    $('f-cb-prompt').value = state.choice.prompt || '';
    $('cb-on-sort').checked = !!state.choice.enabled.concept_sort;
    $('cb-on-seq').checked = !!state.choice.enabled.sequence_order;
    $('cb-on-cloze').checked = !!state.choice.enabled.cloze_short;
    $('cb-on-write').checked = !!state.choice.enabled.tiered_writing;
    $('cb-fold-sort').hidden = !state.choice.enabled.concept_sort;
    $('cb-fold-seq').hidden = !state.choice.enabled.sequence_order;
    $('cb-fold-cloze').hidden = !state.choice.enabled.cloze_short;
    $('cb-fold-write').hidden = !state.choice.enabled.tiered_writing;

    $('f-cbs-title').value = state.choice.sort.title || '';
    $('f-cbs-summary').value = state.choice.sort.summary || '';
    $('f-cbs-cats').value = state.choice.sort.catsText || '';
    $('f-cbs-cards').value = state.choice.sort.cardsText || '';

    $('f-cbq-title').value = state.choice.seq.title || '';
    $('f-cbq-summary').value = state.choice.seq.summary || '';
    $('f-cbq-steps').value = state.choice.seq.stepsText || '';

    $('f-cbc-title').value = state.choice.cloze.title || '';
    $('f-cbc-summary').value = state.choice.cloze.summary || '';
    $('f-cbc-bank').value = state.choice.cloze.bankText || '';
    $('f-cbc-qs').value = state.choice.cloze.qsText || '';

    $('f-cbw-title').value = state.choice.write.title || '';
    $('f-cbw-summary').value = state.choice.write.summary || '';
    $('f-cbw-prompt').value = state.choice.write.prompt || '';
    $('f-cbw-passage').value = state.choice.write.passage || '';
    $('f-cbw-bank').value = state.choice.write.bankText || '';
    $('f-cbw-frames').value = state.choice.write.framesText || '';
    $('f-cbw-starters').value = state.choice.write.startersText || '';
    $('f-cbw-checklist').value = state.choice.write.checklistText || '';

    $('f-glossary').value = state.glossaryText || '';
    $('f-station-mode').checked = !!state.stationMode;
    $('f-qr-key').value = state.qrPublicKey || '';
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountQrKeyHelper === 'function') window.AlloPacketHandoff.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto });
    drawBilingualPills();
    updateParseNotes();
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
      var name = builder.codeName(trimmed);
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

  var builtCfg = null;

  function paperMixedOrder(list) {
    var src = Array.isArray(list) ? list.slice() : [];
    if (src.length < 2) return src;
    // Deterministic non-answer order so printed sort cards and sequence steps are mixed reproducibly.
    var out = [];
    for (var stride = 0; stride < 2; stride++) {
      for (var i = stride; i < src.length; i += 2) out.push(src[i]);
    }
    if (out.length > 2 && out[0] === src[0]) {
      var first = out.shift();
      out.push(first);
    }
    return out;
  }

  function appendWritingLines(host, count) {
    var box = el('div', 'paper-choice-lines');
    for (var i = 0; i < count; i++) box.appendChild(el('div', 'paper-choice-line'));
    host.appendChild(box);
  }

  function renderSortPaper(host, data, keyEntries, keyPrefix) {
    if (!data) return;
    if (data.prompt) host.appendChild(el('p', 'paper-choice-prompt', data.prompt));
    var cats = Array.isArray(data.categories) ? data.categories : [];
    var cards = Array.isArray(data.cards) ? data.cards : [];
    var catNames = Object.create(null);
    var grid = el('div', 'paper-choice-cat-grid');
    cats.forEach(function (c) {
      catNames[c.id] = c.label;
      var box = el('div', 'paper-choice-cat-box');
      box.appendChild(el('p', 'paper-choice-sub', c.label));
      if (c.description) box.appendChild(el('p', 'paper-choice-note', c.description));
      appendWritingLines(box, Math.max(3, Math.min(5, Math.ceil(cards.length / Math.max(1, cats.length)) + 1)));
      grid.appendChild(box);
    });
    host.appendChild(grid);

    if (cards.length) {
      var bank = el('div', 'paper-choice-bank');
      bank.appendChild(el('p', 'paper-choice-sub', 'Cards to sort (write each card into a category box, or cut and sort)'));
      var chips = el('ul', 'paper-choice-chips');
      paperMixedOrder(cards).forEach(function (card) {
        chips.appendChild(el('li', '', card.text + (card.detail ? ' \u2014 ' + card.detail : '')));
      });
      bank.appendChild(chips);
      host.appendChild(bank);

      cards.forEach(function (card) {
        keyEntries.push((keyPrefix ? keyPrefix + ': ' : '') + card.text + ' \u2192 ' + (catNames[card.category] || card.category));
      });
    }
  }

  function renderSequencePaper(host, data, keyEntries, keyPrefix) {
    if (!data) return;
    if (data.prompt) host.appendChild(el('p', 'paper-choice-prompt', data.prompt));
    var steps = Array.isArray(data.steps) ? data.steps : [];
    var grid = el('ol', 'paper-choice-seq-grid');
    steps.forEach(function (_, idx) {
      var row = el('li', 'paper-choice-seq-row');
      row.appendChild(el('span', 'paper-choice-seq-num', (idx + 1) + '.'));
      row.appendChild(el('span', 'paper-choice-line'));
      grid.appendChild(row);
    });
    host.appendChild(grid);

    if (steps.length) {
      var bank = el('div', 'paper-choice-bank');
      bank.appendChild(el('p', 'paper-choice-sub', 'Steps to put in order (write the step letter or text on the numbered lines above)'));
      var chips = el('ul', 'paper-choice-chips');
      paperMixedOrder(steps).forEach(function (st, idx) {
        var letter = String.fromCharCode(65 + (idx % 26));
        chips.appendChild(el('li', '', letter + '. ' + (st.label ? st.label + ': ' : '') + st.text));
      });
      bank.appendChild(chips);
      host.appendChild(bank);

      steps.forEach(function (st, idx) {
        keyEntries.push((keyPrefix ? keyPrefix + ' ' : '') + (idx + 1) + '. ' + (st.label ? st.label + ': ' : '') + st.text);
      });
    }
  }

  function renderClozePaper(host, data, keyEntries, keyPrefix) {
    if (!data) return;
    if (data.prompt) host.appendChild(el('p', 'paper-choice-prompt', data.prompt));
    var bankWords = Array.isArray(data.wordBank) ? data.wordBank : [];
    if (bankWords.length) {
      var bank = el('div', 'paper-choice-bank');
      bank.appendChild(el('p', 'paper-choice-sub', 'Word Bank'));
      var chips = el('ul', 'paper-choice-chips');
      bankWords.forEach(function (w) { chips.appendChild(el('li', '', w)); });
      bank.appendChild(chips);
      host.appendChild(bank);
    }
    var qs = Array.isArray(data.questions) ? data.questions : [];
    if (qs.length) {
      var ol = el('ol', 'paper-choice-cloze');
      qs.forEach(function (q, idx) {
        var text = String(q.text || '').replace(/_{2,}|\[blank\]/gi, '______________');
        ol.appendChild(el('li', '', text));
        var ans = Array.isArray(q.answers) ? q.answers.join(' / ') : '';
        if (ans) keyEntries.push((keyPrefix ? keyPrefix + ' ' : '') + 'Item ' + (idx + 1) + ': ' + ans);
      });
      host.appendChild(ol);
    }
  }

  function renderWritingPaper(host, data, compact) {
    if (!data) return;
    if (data.passage) {
      var pBox = el('div', 'paper-choice-passage');
      if (data.passageTitle) pBox.appendChild(el('p', 'paper-choice-sub', data.passageTitle));
      pBox.appendChild(document.createTextNode(data.passage));
      host.appendChild(pBox);
    }
    if (data.prompt) host.appendChild(el('p', 'paper-choice-prompt', data.prompt));
    if (data.minWords) host.appendChild(el('p', 'paper-choice-note', 'Aim for at least ' + data.minWords + ' words. Use the word bank, sentence frames, or your own words.'));
    var bankWords = Array.isArray(data.wordBank) ? data.wordBank : [];
    if (bankWords.length) {
      var bank = el('div', 'paper-choice-bank');
      bank.appendChild(el('p', 'paper-choice-sub', 'Academic Word Bank'));
      var chips = el('ul', 'paper-choice-chips');
      bankWords.forEach(function (w) { chips.appendChild(el('li', '', w)); });
      bank.appendChild(chips);
      host.appendChild(bank);
    }
    var frames = Array.isArray(data.frames) ? data.frames : [];
    var starters = Array.isArray(data.starters) ? data.starters : [];
    if (frames.length || starters.length) {
      var fBox = el('div', 'paper-choice-frames');
      fBox.appendChild(el('p', 'paper-choice-sub', frames.length ? 'Optional Sentence Frames (Level 1) or Starters (Level 2)' : 'Optional Sentence Starters'));
      var ul = el('ul');
      frames.forEach(function (f) { ul.appendChild(el('li', '', f)); });
      starters.slice(0, compact ? 2 : 4).forEach(function (s) { ul.appendChild(el('li', '', s)); });
      fBox.appendChild(ul);
      host.appendChild(fBox);
    }
    appendWritingLines(host, compact ? 5 : 8);
    var checks = Array.isArray(data.checklist) ? data.checklist : [];
    if (checks.length) {
      host.appendChild(el('p', 'paper-choice-sub', 'Self-Check Rubric'));
      var cul = el('ul', 'paper-choice-checklist');
      checks.forEach(function (ch) {
        var li = el('li');
        var bx = el('span', 'paper-choice-box');
        bx.setAttribute('aria-hidden', 'true');
        li.appendChild(bx);
        li.appendChild(el('span', '', ch));
        cul.appendChild(li);
      });
      host.appendChild(cul);
    }
  }

  function hasPrintableChoiceContent(cfg) {
    if (!cfg || !Array.isArray(cfg.items) || !cfg.items[0]) return false;
    var item = cfg.items[0];
    if (cfg.activity === 'concept_sort') {
      return (Array.isArray(item.categories) && item.categories.length > 0)
        || (Array.isArray(item.cards) && item.cards.length > 0);
    }
    if (cfg.activity === 'sequence_order') {
      return Array.isArray(item.steps) && item.steps.length > 0;
    }
    if (cfg.activity === 'tiered_writing') {
      return !!(item.prompt || item.passage
        || (Array.isArray(item.frames) && item.frames.length > 0)
        || (Array.isArray(item.starters) && item.starters.length > 0));
    }
    if (cfg.activity === 'choice_board') {
      return Array.isArray(item.pathways) && item.pathways.length > 0;
    }
    return false;
  }

  function drawPaperSheet(cfg, result) {
    var sheet = $('paper-choice-sheet');
    var fold = $('paper-choice-fold');
    var keyBox = $('f-paper-choice-key');
    var docxBtn = $('download-docx');
    if (!sheet) return;
    sheet.textContent = '';
    if (!cfg || !result || !hasPrintableChoiceContent(cfg)) {
      sheet.setAttribute('data-ready', '0');
      sheet.hidden = true;
      if (docxBtn) docxBtn.hidden = true;
      return;
    }

    var item = cfg.items[0];
    var header = el('div', 'paper-choice-header');
    header.appendChild(el('h4', 'paper-choice-title', cfg.title || item.word || 'Practice Worksheet'));
    header.appendChild(el('p', 'paper-choice-fields', 'Name: ________________________   Date: ______________'));
    sheet.appendChild(header);

    var keyEntries = [];
    if (cfg.activity === 'concept_sort') {
      renderSortPaper(sheet, item, keyEntries, '');
    } else if (cfg.activity === 'sequence_order') {
      renderSequencePaper(sheet, item, keyEntries, '');
    } else if (cfg.activity === 'tiered_writing') {
      renderWritingPaper(sheet, item, false);
    } else if (cfg.activity === 'choice_board') {
      if (item.goal) sheet.appendChild(el('p', 'paper-choice-goal', 'Learning Goal: ' + item.goal));
      sheet.appendChild(el('p', 'paper-choice-prompt', item.prompt || 'Choose ONE pathway below to show what you learned. Check the box beside the option you choose.'));
      (Array.isArray(item.pathways) ? item.pathways : []).forEach(function (pw, idx) {
        var card = el('div', 'paper-choice-option');
        var head = el('div', 'paper-choice-option-head');
        head.appendChild(el('p', 'paper-choice-sub', 'Option ' + (idx + 1) + ': ' + (pw.title || pw.kind)));
        var pick = el('span', 'paper-choice-option-pick');
        var bx = el('span', 'paper-choice-box');
        bx.setAttribute('aria-hidden', 'true');
        pick.appendChild(bx);
        pick.appendChild(el('span', '', 'I chose Option ' + (idx + 1)));
        head.appendChild(pick);
        card.appendChild(head);
        var pPrefix = 'Option ' + (idx + 1) + ' (' + (pw.title || pw.kind) + ')';
        if (pw.kind === 'concept_sort') renderSortPaper(card, pw.data, keyEntries, pPrefix);
        else if (pw.kind === 'sequence_order') renderSequencePaper(card, pw.data, keyEntries, pPrefix);
        else if (pw.kind === 'cloze_short') renderClozePaper(card, pw.data, keyEntries, pPrefix);
        else if (pw.kind === 'tiered_writing') renderWritingPaper(card, pw.data, true);
        sheet.appendChild(card);
      });
    }

    if (keyEntries.length && (!keyBox || keyBox.checked)) {
      var keySection = el('div', 'paper-choice-key');
      keySection.appendChild(el('h4', '', 'Teacher Answer Key \u2014 ' + (cfg.title || item.word || 'Worksheet')));
      var keyList = el('ul', 'paper-choice-key-list');
      keyEntries.forEach(function (line) { keyList.appendChild(el('li', '', line)); });
      keySection.appendChild(keyList);
      sheet.appendChild(keySection);
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
        && typeof window.AlloPacketDocx.buildChoiceWorksheetDocx === 'function'
        && typeof window.AlloPacketDocx.downloadDocx === 'function');
    };
    return loadLocalScript('packets_zip.js', 'data-allo-zip', hasZip).then(function (zipOk) {
      if (!zipOk) return null;
      return loadLocalScript('packets_docx.js', 'data-allo-docx', hasDocx).then(function (docxOk) {
        return docxOk ? window.AlloPacketDocx : null;
      });
    });
  }

  function prepareMixedCards(cards) {
    return paperMixedOrder(cards || []).map(function (c) {
      return {
        text: c.text || '',
        detail: c.detail || '',
        category: c.category || '',
      };
    });
  }

  function prepareMixedSteps(steps) {
    var indexed = (Array.isArray(steps) ? steps : []).map(function (st, idx) {
      return {
        label: st.label || '',
        text: st.text || '',
        order: typeof st.order === 'number' ? st.order : idx,
      };
    });
    return paperMixedOrder(indexed);
  }

  function buildChoiceDocxPayload(cfg) {
    if (!hasPrintableChoiceContent(cfg)) return null;
    var item = cfg.items[0];
    var keyBox = $('f-paper-choice-key');
    var answerKeyOn = !keyBox || !!keyBox.checked;
    var title = cfg.title || item.word || 'Practice Worksheet';

    if (cfg.activity === 'concept_sort') {
      return {
        title: title,
        activity: 'concept_sort',
        prompt: item.prompt || '',
        categories: Array.isArray(item.categories) ? item.categories.map(function (c) {
          return { id: c.id || '', label: c.label || '', description: c.description || '' };
        }) : [],
        cards: prepareMixedCards(item.cards),
        answerKeyOn: answerKeyOn,
      };
    }
    if (cfg.activity === 'sequence_order') {
      return {
        title: title,
        activity: 'sequence_order',
        prompt: item.prompt || '',
        steps: prepareMixedSteps(item.steps),
        answerKeyOn: answerKeyOn,
      };
    }
    if (cfg.activity === 'tiered_writing') {
      return {
        title: title,
        activity: 'tiered_writing',
        prompt: item.prompt || '',
        passageTitle: item.passageTitle || '',
        passage: item.passage || '',
        minWords: item.minWords || 0,
        wordBank: Array.isArray(item.wordBank) ? item.wordBank.slice() : [],
        frames: Array.isArray(item.frames) ? item.frames.slice() : [],
        starters: Array.isArray(item.starters) ? item.starters.slice() : [],
        writeLines: 8,
        checklist: Array.isArray(item.checklist) ? item.checklist.slice() : [],
        answerKeyOn: answerKeyOn,
      };
    }
    if (cfg.activity === 'choice_board') {
      var pathways = (Array.isArray(item.pathways) ? item.pathways : []).map(function (pw) {
        var data = pw && pw.data && typeof pw.data === 'object' ? pw.data : {};
        var cleanData = {};
        if (pw.kind === 'concept_sort') {
          cleanData = {
            prompt: data.prompt || '',
            categories: Array.isArray(data.categories) ? data.categories.map(function (c) {
              return { id: c.id || '', label: c.label || '', description: c.description || '' };
            }) : [],
            cards: prepareMixedCards(data.cards),
          };
        } else if (pw.kind === 'sequence_order') {
          cleanData = {
            prompt: data.prompt || '',
            steps: prepareMixedSteps(data.steps),
          };
        } else if (pw.kind === 'cloze_short') {
          cleanData = {
            prompt: data.prompt || '',
            wordBank: Array.isArray(data.wordBank) ? data.wordBank.slice() : [],
            questions: Array.isArray(data.questions) ? data.questions.map(function (q) {
              return { text: q.text || '', answers: Array.isArray(q.answers) ? q.answers.slice() : [] };
            }) : [],
          };
        } else if (pw.kind === 'tiered_writing') {
          cleanData = {
            prompt: data.prompt || '',
            passageTitle: data.passageTitle || '',
            passage: data.passage || '',
            minWords: data.minWords || 0,
            wordBank: Array.isArray(data.wordBank) ? data.wordBank.slice() : [],
            frames: Array.isArray(data.frames) ? data.frames.slice() : [],
            starters: Array.isArray(data.starters) ? data.starters.slice() : [],
            writeLines: 5,
            checklist: Array.isArray(data.checklist) ? data.checklist.slice() : [],
          };
        }
        return {
          kind: pw.kind || '',
          title: pw.title || pw.kind || '',
          summary: pw.summary || '',
          data: cleanData,
        };
      });
      return {
        title: title,
        activity: 'choice_board',
        goal: item.goal || '',
        prompt: item.prompt || '',
        pathways: pathways,
        answerKeyOn: answerKeyOn,
      };
    }
    return null;
  }

  function downloadChoiceDocx() {
    if (!built || !builtCfg) buildNow();
    var payload = buildChoiceDocxPayload(builtCfg);
    if (!payload) {
      announce('Build a worksheet with printable content first.');
      return Promise.resolve(false);
    }
    var btn = $('download-docx');
    if (btn) btn.disabled = true;
    announce('Preparing Word worksheet (.docx)...');
    return ensureDocxTools().then(function (docxLib) {
      if (!docxLib || !window.AlloPacketZip) {
        announce('Could not load the Word worksheet builder. Load the page again.');
        return false;
      }
      var denSel = $('f-docx-density');
      var density = denSel && (denSel.value === 'primary' || denSel.value === 'compact') ? denSel.value : 'standard';
      payload.density = density;
      var res = docxLib.buildChoiceWorksheetDocx(payload, { zip: window.AlloPacketZip, density: density });
      if (docxLib.downloadDocx(res, window, document)) {
        announce('Downloaded ' + res.filename + '.');
        return true;
      }
      announce('This browser could not save the Word file.');
      return false;
    }, function () {
      announce('Could not create the Word worksheet.');
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
      var result = builder.buildChoicePacket(Object.assign({}, cfg, {
        adapters: adapters,
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

      var actTitle = adapters.ADAPTERS[result.activity] ? adapters.ADAPTERS[result.activity].title : result.activity;
      var modeLabel = result.mode === 'probe' ? 'Check mode (one try)' : 'Practice mode (feedback and retry)';
      setText('summary-facts', result.name + ' (' + fileSize(result.bytes) + ') — ' + actTitle + ', ' + modeLabel + '.');
      setText('making-said', 'The file is ready: ' + result.name);

      var rows = $('summary-rows');
      rows.textContent = '';
      var addRow = function (k, v) {
        rows.appendChild(el('dt', '', k));
        rows.appendChild(el('dd', '', v));
      };
      addRow('Activity', actTitle);
      addRow('Mode', modeLabel);
      addRow('File size', fileSize(result.bytes));
      addRow('Home languages', cfg.homeLanguages.length ? cfg.homeLanguages.join(', ') : 'English only');
      addRow('Station Mode', cfg.stationMode ? 'On (shared-device kiosk reset)' : 'Off');
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

  // ---------------------------------------------------------------------------
  // Reopen an existing .html file
  // ---------------------------------------------------------------------------
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

  function applyReopened(res) {
    state.templateId = '';
    state.activity = res.activity;
    state.mode = res.mode || 'practice';
    state.title = res.title || state.title;
    state.form = res.form || 'Form A';
    state.timeLimitMin = res.timeLimitS ? Math.round(res.timeLimitS / 60) : '';
    state.homeLanguages = Array.isArray(res.homeLanguages) ? res.homeLanguages.slice() : [];
    state.glossaryText = formatGlossaryText(res.bilingualGlossary || []);
    state.stationMode = !!res.stationMode;
    state.qrPublicKey = typeof res.qrPublicKey === 'string' ? res.qrPublicKey : '';
    var first = res.items && res.items[0];
    if (first) {
      if (res.activity === 'concept_sort') {
        state.sort = {
          topic: first.word || res.title,
          prompt: first.prompt || '',
          hint: first.hint || '',
          catsText: formatCategoriesText(first.categories),
          cardsText: formatCardsText(first.cards, first.categories),
        };
      } else if (res.activity === 'sequence_order') {
        state.seq = {
          topic: first.word || res.title,
          prompt: first.prompt || '',
          hint: first.hint || '',
          stepsText: formatStepsText(first.steps),
        };
      } else if (res.activity === 'tiered_writing') {
        state.write = {
          topic: first.word || res.title,
          prompt: first.prompt || '',
          passageTitle: first.passageTitle || '',
          passage: first.passage || '',
          minWords: first.minWords || 14,
          defaultLevel: first.defaultLevel || 'frames',
          bankText: (first.wordBank || []).join(', '),
          framesText: (first.frames || []).join('\n'),
          startersText: (first.starters || []).join('\n'),
          checklistText: (first.checklist || []).join('\n'),
        };
      } else if (res.activity === 'choice_board') {
        applyTemplate({ id: '', activity: 'choice_board', title: res.title, item: first });
      }
    }
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    remember();
    gotoStep(2, false);
  }

  function handleReopenBytes(bytes, fileName) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var res = builder.readChoicePacket(u8, verifyCore);
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(u8, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-choice.html') ? owner : res.page;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && targetPage.href !== 'packets-choice.html') {
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

  // ---------------------------------------------------------------------------
  // Event Wiring
  // ---------------------------------------------------------------------------
  function bindInput(id, onValue) {
    var node = $(id);
    if (!node) return;
    var handler = function () { onValue(node.value); remember(); updateParseNotes(); };
    node.addEventListener('input', handler);
    node.addEventListener('change', handler);
  }

  function wireEvents() {
    var filters = document.querySelectorAll('#subject-filters button[data-subject]');
    for (var fi = 0; fi < filters.length; fi++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          activeSubject = btn.getAttribute('data-subject') || 'all';
          for (var j = 0; j < filters.length; j++) {
            filters[j].setAttribute('aria-pressed', filters[j] === btn ? 'true' : 'false');
          }
          drawTemplates();
        });
      })(filters[fi]);
    }

    var actRadios = document.querySelectorAll('input[name="activity"]');
    for (var ai = 0; ai < actRadios.length; ai++) {
      actRadios[ai].addEventListener('change', function (e) {
        state.activity = e.target.value;
        state.templateId = '';
        if (!builder.CHECK_CAPABLE[state.activity]) state.mode = 'practice';
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

    bindInput('f-check-form', function (v) { state.form = v; });
    bindInput('f-check-time', function (v) { state.timeLimitMin = v; });

    bindInput('f-cs-topic', function (v) { state.sort.topic = v; });
    bindInput('f-cs-prompt', function (v) { state.sort.prompt = v; });
    bindInput('f-cs-hint', function (v) { state.sort.hint = v; });
    bindInput('f-cs-cats', function (v) { state.sort.catsText = v; });
    bindInput('f-cs-cards', function (v) { state.sort.cardsText = v; });

    bindInput('f-sq-topic', function (v) { state.seq.topic = v; });
    bindInput('f-sq-prompt', function (v) { state.seq.prompt = v; });
    bindInput('f-sq-hint', function (v) { state.seq.hint = v; });
    bindInput('f-sq-steps', function (v) { state.seq.stepsText = v; });

    bindInput('f-tw-topic', function (v) { state.write.topic = v; });
    bindInput('f-tw-prompt', function (v) { state.write.prompt = v; });
    bindInput('f-tw-ptitle', function (v) { state.write.passageTitle = v; });
    bindInput('f-tw-passage', function (v) { state.write.passage = v; });
    bindInput('f-tw-minwords', function (v) { state.write.minWords = Number(v) || 14; });
    bindInput('f-tw-default', function (v) { state.write.defaultLevel = v; });
    bindInput('f-tw-bank', function (v) { state.write.bankText = v; });
    bindInput('f-tw-frames', function (v) { state.write.framesText = v; });
    bindInput('f-tw-starters', function (v) { state.write.startersText = v; });
    bindInput('f-tw-checklist', function (v) { state.write.checklistText = v; });

    bindInput('f-cb-topic', function (v) { state.choice.topic = v; });
    bindInput('f-cb-goal', function (v) { state.choice.goal = v; });
    bindInput('f-cb-prompt', function (v) { state.choice.prompt = v; });
    bindInput('f-cbs-title', function (v) { state.choice.sort.title = v; });
    bindInput('f-cbs-summary', function (v) { state.choice.sort.summary = v; });
    bindInput('f-cbs-cats', function (v) { state.choice.sort.catsText = v; });
    bindInput('f-cbs-cards', function (v) { state.choice.sort.cardsText = v; });
    bindInput('f-cbq-title', function (v) { state.choice.seq.title = v; });
    bindInput('f-cbq-summary', function (v) { state.choice.seq.summary = v; });
    bindInput('f-cbq-steps', function (v) { state.choice.seq.stepsText = v; });
    bindInput('f-cbc-title', function (v) { state.choice.cloze.title = v; });
    bindInput('f-cbc-summary', function (v) { state.choice.cloze.summary = v; });
    bindInput('f-cbc-bank', function (v) { state.choice.cloze.bankText = v; });
    bindInput('f-cbc-qs', function (v) { state.choice.cloze.qsText = v; });
    bindInput('f-cbw-title', function (v) { state.choice.write.title = v; });
    bindInput('f-cbw-summary', function (v) { state.choice.write.summary = v; });
    bindInput('f-cbw-prompt', function (v) { state.choice.write.prompt = v; });
    bindInput('f-cbw-passage', function (v) { state.choice.write.passage = v; });
    bindInput('f-cbw-bank', function (v) { state.choice.write.bankText = v; });
    bindInput('f-cbw-frames', function (v) { state.choice.write.framesText = v; });
    bindInput('f-cbw-starters', function (v) { state.choice.write.startersText = v; });
    bindInput('f-cbw-checklist', function (v) { state.choice.write.checklistText = v; });

    [
      ['cb-on-sort', 'concept_sort', 'cb-fold-sort'],
      ['cb-on-seq', 'sequence_order', 'cb-fold-seq'],
      ['cb-on-cloze', 'cloze_short', 'cb-fold-cloze'],
      ['cb-on-write', 'tiered_writing', 'cb-fold-write'],
    ].forEach(function (row) {
      var cb = $(row[0]);
      if (!cb) return;
      cb.addEventListener('change', function () {
        state.choice.enabled[row[1]] = !!cb.checked;
        $(row[2]).hidden = !cb.checked;
        remember();
        updateParseNotes();
      });
    });

    bindInput('f-glossary', function (v) { state.glossaryText = v; });
    bindInput('f-qr-key', function (v) { state.qrPublicKey = v; });
    if ($('f-station-mode')) {
      $('f-station-mode').addEventListener('change', function (e) {
        state.stationMode = !!e.target.checked;
        remember();
        updateParseNotes();
      });
    }

    var titleTimer = 0;
    if ($('f-title')) {
      $('f-title').addEventListener('input', function (e) {
        state.title = e.target.value;
        remember();
        clearTimeout(titleTimer);
        titleTimer = setTimeout(function () { if (step === 3) buildNow(); }, 180);
      });
    }

    if ($('f-batch-names')) {
      $('f-batch-names').addEventListener('input', function () {
        var list = batchList();
        var nextSingle = list.names.length === 1 ? list.names[0] : '';
        drawBatch();
        if (step === 3 && nextSingle !== builtLearner) buildNow();
      });
      if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountBatchListHelper === 'function') {
        window.AlloPacketHandoff.mountBatchListHelper($('f-batch-names'), { maxNames: MAX_STUDENTS, announce: announce });
      }
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

    var paperFold = $('paper-choice-fold');
    if (paperFold) {
      paperFold.addEventListener('toggle', function () {
        var sheet = $('paper-choice-sheet');
        if (sheet) sheet.hidden = !(paperFold.open && sheet.getAttribute('data-ready') === '1');
      });
    }
    var paperKey = $('f-paper-choice-key');
    if (paperKey) {
      paperKey.addEventListener('change', function () {
        if (built && builtCfg) drawPaperSheet(builtCfg, built);
      });
    }
    var paperBtn = $('print-paper-choice');
    if (paperBtn) {
      paperBtn.addEventListener('click', function () {
        if (!built) buildNow();
        var sheet = $('paper-choice-sheet');
        if (!sheet || sheet.getAttribute('data-ready') !== '1') return;
        if (paperFold) paperFold.open = true;
        sheet.hidden = false;
        announce('Opening print dialog for the paper worksheet.');
        try { window.print(); } catch (_) {}
      });
    }
    var docxBtn = $('download-docx');
    if (docxBtn) {
      docxBtn.addEventListener('click', function () { downloadChoiceDocx(); });
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
      state = defaultStateFromTemplates();
      if ($('f-qr-key') && $('f-qr-key')._alloQrHelper) $('f-qr-key')._alloQrHelper.sync('');
      setText('forget-said', 'Choices removed on this device.');
      gotoStep(1, false);
    });
  }

  function start() {
    builder = window.AlloPacketChoice || null;
    adapters = window.AlloPacketSortWriteAdapters || null;
    loader = window.AlloWordSoundsTakeHome || null;
    bilingualMod = window.AlloPacketStationBilingual || null;
    verifyCore = window.AlloPacketVerify || null;

    $('loading').hidden = true;
    if (!builder || !adapters || !loader) {
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
