// Interactive activity adapters for Sort, Sequence, Tiered Writing, and Choice Board packets:
//   - concept_sort   : drag + keyboard/click category sorting with misconception logging
//   - sequence_order : accessible Up/Down + click-to-place sequencing and timelines
//   - tiered_writing : passage/prompt with 3 student-toggleable UDL scaffold levels + print sheet
//   - choice_board   : UDL Choice Board ("One Goal, Multi-Path Packet") with modality tracking
//
// Plain UMD script for browser pages (window.AlloPacketSortWriteAdapters) and Node (module.exports).
// Zero network, zero storage, zero markup strings, zero outer-closure references inside serialized render/score fns.
(function (root) {
  'use strict';

  var ACTIVITY_IDS = ['concept_sort', 'sequence_order', 'tiered_writing', 'choice_board'];
  var CHOICE_PATHWAY_KINDS = ['concept_sort', 'sequence_order', 'cloze_short', 'tiered_writing'];

  function str(v, max) {
    var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return max ? s.slice(0, max) : s;
  }

  function cleanMultiline(v, max) {
    var s = String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim();
    return max ? s.slice(0, max) : s;
  }

  function safeId(raw, fallback) {
    var s = String(raw == null ? '' : raw).toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
    return s || fallback;
  }

  function isSafeSvgDataUri(uri) {
    return typeof uri === 'string' && /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+=*$/.test(uri) && uri.length <= 24000;
  }

  function cleanIcon(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    if (isSafeSvgDataUri(s)) return s;
    return s.replace(/\s+/g, ' ').slice(0, 8);
  }

  function hashSeed(text) {
    var h = 2166136261 >>> 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function deterministicShuffle(list, seedText) {
    var out = list.slice();
    if (out.length < 2) return out;
    var state = hashSeed(seedText || 'seed') || 1;
    var next = function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(next() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    var same = out.every(function (entry, idx) { return entry === list[idx]; });
    if (same) {
      var first = out.shift();
      out.push(first);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Host-side normalizers (used by builders and check-mode prepare hooks)
  // ---------------------------------------------------------------------------
  function normalizeConceptSortItem(raw, idx) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var id = safeId(r.id, 'cs-' + ((idx || 0) + 1));
    var rawCats = Array.isArray(r.categories) ? r.categories.slice(0, 4) : [];
    var seenCat = Object.create(null);
    var categories = [];
    rawCats.forEach(function (c, ci) {
      var obj = typeof c === 'string' ? { label: c } : (c && typeof c === 'object' ? c : {});
      var label = str(obj.label || obj.name, 48);
      if (!label) return;
      var cid = safeId(obj.id, 'g' + (ci + 1));
      if (seenCat[cid]) cid = 'g' + (ci + 1);
      seenCat[cid] = true;
      categories.push({
        id: cid,
        label: label,
        description: str(obj.description || obj.hint, 120),
        icon: cleanIcon(obj.icon),
      });
    });
    var catIds = categories.map(function (c) { return c.id; });
    var rawCards = Array.isArray(r.cards) ? r.cards.slice(0, 12) : [];
    var seenCard = Object.create(null);
    var cards = [];
    rawCards.forEach(function (card, ci) {
      var obj = card && typeof card === 'object' ? card : {};
      var text = str(obj.text || obj.label || obj.word, 80);
      if (!text) return;
      var cid = safeId(obj.id, 'c' + (ci + 1));
      if (seenCard[cid]) cid = 'c' + (ci + 1);
      seenCard[cid] = true;
      var cat = safeId(obj.category || obj.group, '');
      if (catIds.indexOf(cat) < 0) {
        var byLabel = categories.filter(function (g) { return g.label.toLowerCase() === str(obj.category || obj.group, 48).toLowerCase(); })[0];
        cat = byLabel ? byLabel.id : (catIds[0] || '');
      }
      if (!cat) return;
      cards.push({
        id: cid,
        text: text,
        detail: str(obj.detail || obj.description, 120),
        icon: cleanIcon(obj.icon),
        category: cat,
      });
    });
    return {
      id: id,
      word: str(r.word || r.title || 'Concept Sort', 60),
      target: str(r.target || (cards.length + ' cards in ' + categories.length + ' groups'), 40),
      prompt: str(r.prompt || 'Sort each card into the best matching group.', 220),
      hint: str(r.hint, 220),
      categories: categories,
      cards: cards,
      maxAttempts: Math.max(1, Math.min(3, Math.floor(Number(r.maxAttempts) || 2))),
    };
  }

  function normalizeSequenceOrderItem(raw, idx) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var id = safeId(r.id, 'sq-' + ((idx || 0) + 1));
    var rawSteps = Array.isArray(r.steps) ? r.steps.slice(0, 8) : [];
    var seen = Object.create(null);
    var steps = [];
    rawSteps.forEach(function (st, si) {
      var obj = typeof st === 'string' ? { text: st } : (st && typeof st === 'object' ? st : {});
      var text = str(obj.text || obj.description, 160);
      if (!text) return;
      var sid = safeId(obj.id, 's' + (si + 1));
      if (seen[sid]) sid = 's' + (si + 1);
      seen[sid] = true;
      steps.push({
        id: sid,
        label: str(obj.label || obj.title, 48),
        text: text,
        order: steps.length,
      });
    });
    return {
      id: id,
      word: str(r.word || r.title || 'Sequence Order', 60),
      target: str(r.target || (steps.length + ' steps in order'), 40),
      prompt: str(r.prompt || 'Put these steps in order from first to last.', 220),
      hint: str(r.hint, 220),
      steps: steps,
      maxAttempts: Math.max(1, Math.min(3, Math.floor(Number(r.maxAttempts) || 2))),
    };
  }

  function normalizeTieredWritingItem(raw, idx) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var id = safeId(r.id, 'tw-' + ((idx || 0) + 1));
    var frames = (Array.isArray(r.frames) ? r.frames : []).map(function (f) { return str(f, 220); }).filter(Boolean).slice(0, 6);
    var starters = (Array.isArray(r.starters) ? r.starters : []).map(function (s) { return str(s, 180); }).filter(Boolean).slice(0, 6);
    var wordBank = (Array.isArray(r.wordBank) ? r.wordBank : []).map(function (w) { return str(w, 40); }).filter(Boolean).slice(0, 16);
    var checklist = (Array.isArray(r.checklist) ? r.checklist : []).map(function (c) { return str(c, 120); }).filter(Boolean).slice(0, 6);
    if (!frames.length) frames = ['One key idea is ___.', 'This matters because ___.'];
    if (!starters.length) starters = ['One key idea is...', 'An important detail is...', 'In conclusion...'];
    if (!checklist.length) checklist = ['I answered the prompt clearly.', 'I included details from the topic.', 'I read over my writing.'];
    var minWords = Math.max(3, Math.min(250, Math.floor(Number(r.minWords) || 12)));
    return {
      id: id,
      word: str(r.word || r.title || 'Tiered Writing', 60),
      target: str(r.target || ('Written response (' + minWords + '+ words)'), 40),
      prompt: str(r.prompt || 'Write a response that explains your thinking.', 280),
      passageTitle: str(r.passageTitle, 100),
      passage: cleanMultiline(r.passage, 1800),
      minWords: minWords,
      wordBank: wordBank,
      frames: frames,
      starters: starters,
      checklist: checklist,
      defaultLevel: r.defaultLevel === 'starters' || r.defaultLevel === 'independent' ? r.defaultLevel : 'frames',
      maxAttempts: 2,
    };
  }

  function normalizeClozeShortPathway(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var wordBank = (Array.isArray(r.wordBank) ? r.wordBank : []).map(function (w) { return str(w, 40); }).filter(Boolean).slice(0, 16);
    var rawQs = Array.isArray(r.questions) ? r.questions.slice(0, 8) : [];
    var questions = [];
    rawQs.forEach(function (q, qi) {
      var obj = q && typeof q === 'object' ? q : {};
      var text = str(obj.text || obj.prompt, 220);
      var answers = (Array.isArray(obj.answers) ? obj.answers : (obj.answer != null ? [obj.answer] : []))
        .map(function (a) { return str(a, 60); }).filter(Boolean).slice(0, 6);
      if (!text || !answers.length) return;
      questions.push({
        id: safeId(obj.id, 'q' + (qi + 1)),
        text: text,
        answers: answers,
      });
    });
    return {
      prompt: str(r.prompt || 'Fill in each blank to show what you know.', 220),
      hint: str(r.hint, 220),
      wordBank: wordBank,
      questions: questions,
    };
  }

  function normalizeChoiceBoardItem(raw, idx) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var id = safeId(r.id, 'cb-' + ((idx || 0) + 1));
    var rawPaths = Array.isArray(r.pathways) ? r.pathways.slice(0, 3) : [];
    var pathways = [];
    var seenKind = Object.create(null);
    rawPaths.forEach(function (p, pi) {
      var obj = p && typeof p === 'object' ? p : {};
      var kind = CHOICE_PATHWAY_KINDS.indexOf(obj.kind) >= 0 ? obj.kind : '';
      if (!kind || seenKind[kind]) return;
      seenKind[kind] = true;
      var data = obj.data && typeof obj.data === 'object' ? obj.data : obj;
      var normData = null;
      if (kind === 'concept_sort') {
        normData = normalizeConceptSortItem(data, pi);
        if (normData.categories.length < 2 || normData.cards.length < 2) return;
      } else if (kind === 'sequence_order') {
        normData = normalizeSequenceOrderItem(data, pi);
        if (normData.steps.length < 3) return;
      } else if (kind === 'cloze_short') {
        normData = normalizeClozeShortPathway(data);
        if (!normData.questions.length) return;
      } else if (kind === 'tiered_writing') {
        normData = normalizeTieredWritingItem(data, pi);
      }
      if (!normData) return;
      var defaultTitles = {
        concept_sort: 'Sort the Concepts',
        sequence_order: 'Build the Sequence',
        cloze_short: 'Complete the Statements',
        tiered_writing: 'Write an Explanation',
      };
      var defaultSummaries = {
        concept_sort: 'Place cards into matching categories.',
        sequence_order: 'Put the steps in order from first to last.',
        cloze_short: 'Fill in key terms in short sentences.',
        tiered_writing: 'Explain using frames, starters, or your own words.',
      };
      pathways.push({
        id: safeId(obj.id, 'path_' + kind),
        kind: kind,
        title: str(obj.title || defaultTitles[kind], 60),
        summary: str(obj.summary || defaultSummaries[kind], 160),
        data: normData,
      });
    });
    return {
      id: id,
      word: str(r.word || r.title || 'Choice Board', 60),
      target: str(r.target || 'Show mastery via chosen path', 40),
      goal: str(r.goal || r.prompt || 'Choose one way to show what you know.', 240),
      prompt: str(r.prompt || 'Pick the option that fits you best. You can switch before finishing.', 220),
      pathways: pathways,
      maxAttempts: Math.max(1, Math.min(3, Math.floor(Number(r.maxAttempts) || 2))),
    };
  }

  // ---------------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------------
  var CONCEPT_SORT_LABELS = {
    concept_sort_title: 'Concept Sort',
    cs_directions: 'Sort every card into a category. Drag a card, or select a card and choose a category.',
    cs_tray_title: 'Cards to sort',
    cs_tray_empty: 'All cards placed. Check your sort when ready.',
    cs_selected_note: 'Selected: {card}. Choose a category below to place it.',
    cs_place_here: 'Place here',
    cs_check: 'Check my sort',
    cs_reset: 'Reset sort',
    cs_hint_show: 'Show hint',
    cs_hint_hide: 'Hide hint',
    cs_unsorted: 'Place {left} more card(s) before checking.',
    cs_all_right: 'Every card is in the right group.',
    cs_try_again: '{right} of {total} cards match. Move the ones labeled Try another group.',
    cs_revealed: 'Here is where each card belongs.',
    cs_badge_right: 'Matches',
    cs_badge_wrong: 'Try another group',
    cs_remove: 'Move back',
    cs_choose_group: 'Category for {card}',
    cs_unsorted_option: 'Not placed yet',
    cs_correct_group: 'Correct group: {group}',
  };

  var SEQUENCE_ORDER_LABELS = {
    sequence_order_title: 'Sequence Order',
    sq_directions: 'Arrange the steps from first to last using Move up, Move down, or the position menu.',
    sq_check: 'Check order',
    sq_reset: 'Reset order',
    sq_up: 'Up',
    sq_down: 'Down',
    sq_select: 'Place',
    sq_cancel_select: 'Cancel',
    sq_place_here: 'Place at #{n}',
    sq_slot_label: 'Position for step',
    sq_hint_show: 'Show hint',
    sq_hint_hide: 'Hide hint',
    sq_all_right: 'Every step is in the right order.',
    sq_try_again: '{right} of {total} steps are in the right place. Adjust the rest and check again.',
    sq_revealed: 'Here is the order from first to last.',
    sq_badge_right: 'In place',
    sq_badge_wrong: 'Check position',
    sq_answer_heading: 'Order from first to last',
  };

  var TIERED_WRITING_LABELS = {
    tiered_writing_title: 'Tiered Writing',
    tw_directions: 'Pick the support level that helps you most. You can change levels while you write.',
    tw_level_group: 'Writing support level',
    tw_level_frames: 'Level 1: Full Sentence Frames + Word Bank',
    tw_level_starters: 'Level 2: Sentence Starters + Checklist',
    tw_level_independent: 'Level 3: Independent + Checklist',
    tw_word_bank: 'Word bank (tap a word to insert it)',
    tw_starters_label: 'Sentence starters (tap to add to your writing)',
    tw_checklist_label: 'Self-check checklist',
    tw_preview_label: 'Your assembled writing',
    tw_words_count: 'Words: {count} (goal: {goal})',
    tw_submit: 'Finish writing',
    tw_print: 'Print my writing',
    tw_empty_warn: 'Write a response before finishing.',
    tw_short_warn: 'You have {count} words (goal: {goal}). Add more details, or press Finish writing again to turn it in.',
    tw_done_note: 'Writing saved in your session results.',
    tw_editor_label: 'Your response',
    tw_blank_label: 'Blank {n}',
    tw_print_heading: 'Student Writing Sheet',
  };

  var CHOICE_BOARD_LABELS = Object.assign({}, CONCEPT_SORT_LABELS, SEQUENCE_ORDER_LABELS, TIERED_WRITING_LABELS, {
    choice_board_title: 'Choice Board',
    cb_directions: 'Choose one pathway to show what you know. You can switch pathways before finishing.',
    cb_goal_label: 'Learning goal',
    cb_pick_heading: 'Choose how to show what you know',
    cb_switch: 'Switch pathway',
    cb_start_path: 'Choose this path',
    cb_active_path: 'Current path: {title}',
    cb_cloze_check: 'Check answers',
    cb_cloze_hint_show: 'Show hint',
    cb_cloze_hint_hide: 'Hide hint',
    cb_cloze_blank_label: 'Answer {n}',
    cb_cloze_empty: 'Fill in every blank before checking.',
    cb_cloze_all_right: 'Every blank is right.',
    cb_cloze_try_again: '{right} of {total} blanks match. Check the highlighted ones and try again.',
    cb_cloze_revealed: 'Here are the completed answers.',
    cb_cloze_word_bank: 'Word bank (tap a word to insert it)',
  });

  // ---------------------------------------------------------------------------
  // Serialized Student Adapters (100% self-contained: NO outer references!)
  // ---------------------------------------------------------------------------
  function renderConceptSort(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var categories = Array.isArray(item.categories) ? item.categories : [];
    var cards = Array.isArray(item.cards) ? item.cards : [];
    var isCheck = !!ctx.check;
    var placed = Object.create(null);
    var grades = Object.create(null);
    var selectedId = '';
    var locked = false;
    var hintVisible = false;
    var root = ctx.root;

    var catById = Object.create(null);
    categories.forEach(function (g) { catById[g.id] = g; });
    var cardById = Object.create(null);
    cards.forEach(function (c) { cardById[c.id] = c; });

    var makeIcon = function (icon) {
      if (!icon) return null;
      if (String(icon).indexOf('data:image/') === 0) {
        return el('img', { class: 'cs-icon-img', src: icon, alt: '' });
      }
      return el('span', { class: 'cs-icon', 'aria-hidden': 'true', text: icon });
    };

    var promptEl = el('p', { class: 'sw-prompt', text: item.prompt || L.cs_directions || 'Sort each card into a group.' });
    var dirEl = el('p', { class: 'muted sw-sub', text: L.cs_directions || '' });
    var hintBox = item.hint ? el('p', { class: 'sw-hint', hidden: true, 'data-cs-hint': '', text: item.hint }) : null;
    var hintBtn = item.hint ? el('button', {
      type: 'button',
      class: 'sw-btn-sm',
      'data-cs-hint-btn': '',
      'aria-expanded': 'false',
      on: {
        click: function () {
          hintVisible = !hintVisible;
          hintBox.hidden = !hintVisible;
          hintBtn.setAttribute('aria-expanded', hintVisible ? 'true' : 'false');
          hintBtn.textContent = hintVisible ? (L.cs_hint_hide || 'Hide hint') : (L.cs_hint_show || 'Show hint');
          if (hintVisible && ctx.support) ctx.support('hint_shown');
        },
      },
      text: L.cs_hint_show || 'Show hint',
    }) : null;

    var selNote = el('p', { class: 'sw-select-note', role: 'status', 'aria-live': 'polite', hidden: true, 'data-cs-selected': '' });
    var trayWrap = el('section', { class: 'cs-tray', 'aria-label': L.cs_tray_title || 'Cards to sort' });
    var binsWrap = el('div', { class: 'cs-bins', 'data-cs-bins': '' });
    var revealBox = el('div', { class: 'sw-reveal', hidden: true, 'data-cs-reveal': '' });

    var focusCardControl = function (cardId, prefer) {
      var order = prefer === 'select'
        ? ['[data-cs-select="' + cardId + '"]', '[data-cs-card-btn="' + cardId + '"]']
        : ['[data-cs-card-btn="' + cardId + '"]', '[data-cs-select="' + cardId + '"]'];
      for (var i = 0; i < order.length; i++) {
        var node = root.querySelector(order[i]);
        if (node && !node.disabled && typeof node.focus === 'function') { node.focus(); return; }
      }
      if (checkBtn && !checkBtn.disabled && typeof checkBtn.focus === 'function') checkBtn.focus();
    };

    var assignCard = function (cardId, catId, focusKind) {
      if (locked || !cardById[cardId]) return;
      if (catId && catById[catId]) {
        placed[cardId] = catId;
        delete grades[cardId];
        selectedId = '';
        ctx.announce(cardById[cardId].text + ' placed in ' + catById[catId].label + '.');
      } else {
        delete placed[cardId];
        delete grades[cardId];
        ctx.announce(cardById[cardId].text + ' returned to unsorted cards.');
      }
      paint();
      focusCardControl(cardId, focusKind || 'btn');
    };

    var buildCardNode = function (card, inBin) {
      var isSel = selectedId === card.id;
      var grade = grades[card.id] || '';
      var cls = 'cs-card' + (isSel ? ' is-selected' : '') + (grade === 'right' ? ' is-right' : grade === 'wrong' ? ' is-wrong' : '');
      var selectEl = el('select', {
        class: 'cs-select',
        'data-cs-select': card.id,
        'aria-label': fmt(L.cs_choose_group || 'Category for {card}', { card: card.text }),
        disabled: locked,
        on: {
          change: function () { assignCard(card.id, selectEl.value, 'select'); },
        },
      }, [el('option', { value: '', text: L.cs_unsorted_option || 'Not placed yet' })].concat(categories.map(function (g) {
        return el('option', { value: g.id, text: g.label });
      })));
      selectEl.value = placed[card.id] || '';

      var pickBtn = el('button', {
        type: 'button',
        class: 'cs-card-pick',
        'data-cs-card-btn': card.id,
        'aria-pressed': isSel ? 'true' : 'false',
        disabled: locked,
        on: {
          click: function () {
            if (locked) return;
            selectedId = isSel ? '' : card.id;
            paint();
            focusCardControl(card.id, 'btn');
            if (selectedId) ctx.announce(fmt(L.cs_selected_note || 'Selected {card}. Choose a category.', { card: card.text }));
          },
        },
      }, [
        makeIcon(card.icon),
        el('span', { class: 'cs-card-body' }, [
          el('span', { class: 'cs-card-text', text: card.text }),
          card.detail ? el('span', { class: 'cs-card-detail', text: card.detail }) : null,
        ]),
      ]);

      var badge = grade ? el('span', {
        class: 'sw-badge ' + (grade === 'right' ? 'is-right' : 'is-wrong'),
        'data-cs-grade': grade,
        text: grade === 'right' ? (L.cs_badge_right || 'Matches') : (L.cs_badge_wrong || 'Try another group'),
      }) : null;

      var removeBtn = inBin && !locked ? el('button', {
        type: 'button',
        class: 'sw-btn-sm cs-remove',
        'data-cs-remove': card.id,
        'aria-label': (L.cs_remove || 'Move back') + ' ' + card.text,
        on: { click: function () { assignCard(card.id, '', 'btn'); } },
        text: L.cs_remove || 'Move back',
      }) : null;

      return el('div', {
        class: cls,
        'data-cs-card': card.id,
        draggable: locked ? 'false' : 'true',
        on: {
          dragstart: function (ev) {
            if (locked) return;
            selectedId = card.id;
            try { if (ev.dataTransfer) { ev.dataTransfer.setData('text/plain', card.id); ev.dataTransfer.effectAllowed = 'move'; } } catch (_) {}
          },
        },
      }, [
        pickBtn,
        badge,
        el('div', { class: 'cs-card-controls' }, [selectEl, removeBtn]),
      ]);
    };

    var paint = function () {
      trayWrap.textContent = '';
      binsWrap.textContent = '';

      if (selectedId && cardById[selectedId] && !locked) {
        selNote.hidden = false;
        selNote.textContent = fmt(L.cs_selected_note || 'Selected: {card}. Choose a category below to place it.', { card: cardById[selectedId].text });
      } else {
        selNote.hidden = true;
        selNote.textContent = '';
      }

      var unsorted = cards.filter(function (c) { return !placed[c.id]; });
      trayWrap.appendChild(el('h3', { class: 'sw-h3', text: (L.cs_tray_title || 'Cards to sort') + ' (' + unsorted.length + ')' }));
      if (!unsorted.length) {
        trayWrap.appendChild(el('p', { class: 'muted', text: L.cs_tray_empty || 'All cards placed.' }));
      } else {
        trayWrap.appendChild(el('div', { class: 'cs-card-grid', 'data-cs-tray': '' }, unsorted.map(function (c) { return buildCardNode(c, false); })));
      }

      categories.forEach(function (cat) {
        var inCat = cards.filter(function (c) { return placed[c.id] === cat.id; });
        var placeBtn = !locked ? el('button', {
          type: 'button',
          class: 'sw-btn-sm cs-place-btn',
          'data-cs-place': cat.id,
          hidden: !selectedId,
          on: { click: function () { if (selectedId) assignCard(selectedId, cat.id); } },
          text: (L.cs_place_here || 'Place here') + ': ' + cat.label,
        }) : null;
        var bin = el('section', {
          class: 'cs-bin' + (selectedId && !locked ? ' is-ready' : ''),
          'data-cs-bin': cat.id,
          'aria-label': cat.label,
          on: {
            dragover: function (ev) { if (!locked) { ev.preventDefault(); bin.classList.add('is-over'); } },
            dragleave: function () { bin.classList.remove('is-over'); },
            drop: function (ev) {
              if (locked) return;
              ev.preventDefault();
              bin.classList.remove('is-over');
              var dragged = '';
              try { dragged = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : ''; } catch (_) {}
              assignCard(dragged || selectedId, cat.id);
            },
          },
        }, [
          el('div', { class: 'cs-bin-head' }, [
            makeIcon(cat.icon),
            el('div', { class: 'cs-bin-titles' }, [
              el('h3', { class: 'sw-h3', text: cat.label + ' (' + inCat.length + ')' }),
              cat.description ? el('p', { class: 'muted cs-bin-desc', text: cat.description }) : null,
            ]),
          ]),
          placeBtn,
          el('div', { class: 'cs-bin-cards' }, inCat.map(function (c) { return buildCardNode(c, true); })),
        ]);
        binsWrap.appendChild(bin);
      });
    };

    var checkBtn = el('button', {
      type: 'button',
      class: 'primary',
      'data-cs-check': '',
      on: {
        click: function () {
          if (locked) return;
          var remaining = cards.filter(function (c) { return !placed[c.id]; }).length;
          if (remaining > 0) {
            var msg = fmt(L.cs_unsorted || 'Place {left} more card(s) before checking.', { left: remaining });
            if (ctx.feedback) ctx.feedback(msg);
            ctx.announce(msg);
            return;
          }
          if (isCheck) {
            var sortedCards = cards.slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
            var canonical = sortedCards.map(function (c) { return c.id + '=' + placed[c.id]; }).join(';');
            var res = ctx.answer(canonical);
            if (res === 'recorded' || res === 'correct' || res === 'missed') {
              locked = true;
              checkBtn.disabled = true;
              resetBtn.disabled = true;
              paint();
            }
            return;
          }
          var right = 0;
          var misses = [];
          cards.forEach(function (c) {
            var chosen = placed[c.id];
            if (chosen === c.category) {
              right++;
              grades[c.id] = 'right';
            } else {
              grades[c.id] = 'wrong';
              var chosenLabel = catById[chosen] ? catById[chosen].label : chosen;
              misses.push(c.text.slice(0, 14) + '->' + chosenLabel.slice(0, 12));
            }
          });
          var allRight = right === cards.length;
          var summary = allRight
            ? (right + '/' + cards.length + ' sorted')
            : (right + '/' + cards.length + ' | ' + misses.join(', ')).slice(0, 80);
          var outcome = ctx.answer(summary, allRight, {
            correctText: L.cs_all_right || 'Every card is in the right group.',
            retryText: fmt(L.cs_try_again || '{right} of {total} cards match.', { right: right, total: cards.length }),
            missedText: L.cs_revealed || 'Here is where each card belongs.',
          });
          if (outcome === 'correct' || outcome === 'missed') {
            locked = true;
            checkBtn.disabled = true;
            resetBtn.disabled = true;
          }
          paint();
        },
      },
      text: L.cs_check || 'Check my sort',
    });

    var resetBtn = el('button', {
      type: 'button',
      'data-cs-reset': '',
      on: {
        click: function () {
          if (locked) return;
          Object.keys(placed).forEach(function (k) { delete placed[k]; });
          Object.keys(grades).forEach(function (k) { delete grades[k]; });
          selectedId = '';
          if (ctx.feedback) ctx.feedback('');
          paint();
          ctx.announce('Sort cleared.');
        },
      },
      text: L.cs_reset || 'Reset sort',
    });

    root.appendChild(promptEl);
    if (dirEl.textContent) root.appendChild(dirEl);
    if (hintBtn) root.appendChild(el('div', { class: 'row sw-tools-row' }, [hintBtn]));
    if (hintBox) root.appendChild(hintBox);
    root.appendChild(selNote);
    root.appendChild(trayWrap);
    root.appendChild(binsWrap);
    root.appendChild(el('div', { class: 'row sw-actions' }, [checkBtn, resetBtn]));
    root.appendChild(revealBox);
    paint();

    return {
      reveal: function (correctOrAnswer) {
        locked = true;
        checkBtn.disabled = true;
        resetBtn.disabled = true;
        if (correctOrAnswer === true) { paint(); return; }
        var keyMap = Object.create(null);
        if (typeof correctOrAnswer === 'string' && correctOrAnswer.indexOf('=') >= 0) {
          correctOrAnswer.split(';').forEach(function (pair) {
            var parts = pair.split('=');
            if (parts.length === 2) keyMap[parts[0]] = parts[1];
          });
        } else {
          cards.forEach(function (c) { if (c.category) keyMap[c.id] = c.category; });
        }
        revealBox.textContent = '';
        revealBox.appendChild(el('h3', { class: 'sw-h3', text: L.cs_revealed || 'Here is where each card belongs.' }));
        revealBox.appendChild(el('ul', { class: 'sw-reveal-list' }, cards.map(function (c) {
          var gid = keyMap[c.id] || '';
          var gLabel = catById[gid] ? catById[gid].label : gid;
          return el('li', { text: c.text + ' — ' + gLabel });
        })));
        revealBox.hidden = false;
        paint();
      },
    };
  }

  function scoreConceptSort(item, answer, response) {
    var want = String(answer == null ? '' : answer).trim();
    var got = String(response == null ? '' : response).trim();
    return { correct: !!want && got === want, digitsCorrect: null, digitsPossible: null };
  }

  function renderSequenceOrder(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var isCheck = !!ctx.check;
    var rawSteps = Array.isArray(item.steps) ? item.steps.slice() : [];

    var shuffleSteps = function (list, seedText) {
      var out = list.slice();
      if (out.length < 2) return out;
      var h = 2166136261 >>> 0;
      var s = String(seedText || 'sq');
      for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      var st = h || 1;
      for (var k = out.length - 1; k > 0; k--) {
        st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
        var j = Math.floor((st / 4294967296) * (k + 1));
        var tmp = out[k]; out[k] = out[j]; out[j] = tmp;
      }
      var same = out.every(function (x, idx) { return x === list[idx]; });
      if (same) { var first = out.shift(); out.push(first); }
      return out;
    };

    var initialOrder = isCheck ? rawSteps.slice() : shuffleSteps(rawSteps, String(item.id || 'sq'));
    var current = initialOrder.slice();
    var grades = Object.create(null);
    var movingIdx = -1;
    var locked = false;
    var hintVisible = false;
    var root = ctx.root;

    var promptEl = el('p', { class: 'sw-prompt', text: item.prompt || L.sq_directions || 'Put these steps in order.' });
    var dirEl = el('p', { class: 'muted sw-sub', text: L.sq_directions || '' });
    var hintBox = item.hint ? el('p', { class: 'sw-hint', hidden: true, 'data-sq-hint': '', text: item.hint }) : null;
    var hintBtn = item.hint ? el('button', {
      type: 'button',
      class: 'sw-btn-sm',
      'data-sq-hint-btn': '',
      'aria-expanded': 'false',
      on: {
        click: function () {
          hintVisible = !hintVisible;
          hintBox.hidden = !hintVisible;
          hintBtn.setAttribute('aria-expanded', hintVisible ? 'true' : 'false');
          hintBtn.textContent = hintVisible ? (L.sq_hint_hide || 'Hide hint') : (L.sq_hint_show || 'Show hint');
          if (hintVisible && ctx.support) ctx.support('hint_shown');
        },
      },
      text: L.sq_hint_show || 'Show hint',
    }) : null;

    var listEl = el('ol', { class: 'sq-list', 'data-sq-list': '' });
    var revealBox = el('div', { class: 'sw-reveal', hidden: true, 'data-sq-reveal': '' });

    var focusStepControl = function (stepId, prefer) {
      var order = prefer === 'up'
        ? ['[data-sq-up="' + stepId + '"]', '[data-sq-down="' + stepId + '"]', '[data-sq-slot="' + stepId + '"]']
        : prefer === 'down'
          ? ['[data-sq-down="' + stepId + '"]', '[data-sq-up="' + stepId + '"]', '[data-sq-slot="' + stepId + '"]']
          : prefer === 'cancel'
            ? ['[data-sq-cancel="' + stepId + '"]', '[data-sq-pick="' + stepId + '"]', '[data-sq-slot="' + stepId + '"]']
            : prefer === 'pick'
              ? ['[data-sq-pick="' + stepId + '"]', '[data-sq-slot="' + stepId + '"]']
              : ['[data-sq-slot="' + stepId + '"]', '[data-sq-up="' + stepId + '"]', '[data-sq-down="' + stepId + '"]'];
      for (var i = 0; i < order.length; i++) {
        var target = listEl.querySelector(order[i]);
        if (target && !target.disabled && typeof target.focus === 'function') { target.focus(); return; }
      }
    };

    var moveTo = function (fromIdx, toIdx, prefer) {
      if (locked || fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= current.length || toIdx >= current.length) return;
      var moved = current.splice(fromIdx, 1)[0];
      current.splice(toIdx, 0, moved);
      grades = Object.create(null);
      movingIdx = -1;
      paint();
      ctx.announce((moved.label || moved.text) + ' moved to position ' + (toIdx + 1) + ' of ' + current.length + '.');
      focusStepControl(moved.id, prefer || 'slot');
    };

    var paint = function () {
      listEl.textContent = '';
      current.forEach(function (step, idx) {
        var grade = grades[step.id] || '';
        var isPicked = movingIdx === idx;
        var slotSel = el('select', {
          class: 'sq-slot',
          'data-sq-slot': step.id,
          'aria-label': (L.sq_slot_label || 'Position for step') + ' ' + (step.label || step.text),
          disabled: locked,
          on: { change: function () { moveTo(idx, Number(slotSel.value), 'slot'); } },
        }, current.map(function (_, pos) {
          return el('option', { value: String(pos), text: '#' + (pos + 1) });
        }));
        slotSel.value = String(idx);

        var upBtn = el('button', {
          type: 'button',
          class: 'sw-btn-sm',
          'data-sq-up': step.id,
          disabled: locked || idx === 0,
          'aria-label': 'Move ' + (step.label || step.text) + ' up',
          on: { click: function () { moveTo(idx, idx - 1, 'up'); } },
          text: L.sq_up || 'Up',
        });
        var downBtn = el('button', {
          type: 'button',
          class: 'sw-btn-sm',
          'data-sq-down': step.id,
          disabled: locked || idx === current.length - 1,
          'aria-label': 'Move ' + (step.label || step.text) + ' down',
          on: { click: function () { moveTo(idx, idx + 1, 'down'); } },
          text: L.sq_down || 'Down',
        });

        var placeAction = null;
        if (!locked) {
          if (movingIdx < 0) {
            placeAction = el('button', {
              type: 'button',
              class: 'sw-btn-sm',
              'data-sq-pick': step.id,
              on: { click: function () { movingIdx = idx; paint(); focusStepControl(step.id, 'cancel'); ctx.announce('Selected ' + (step.label || step.text) + '. Choose a slot button to place it.'); } },
              text: L.sq_select || 'Place',
            });
          } else if (isPicked) {
            placeAction = el('button', {
              type: 'button',
              class: 'sw-btn-sm',
              'data-sq-cancel': step.id,
              'aria-pressed': 'true',
              on: { click: function () { movingIdx = -1; paint(); focusStepControl(step.id, 'pick'); } },
              text: L.sq_cancel_select || 'Cancel',
            });
          } else {
            placeAction = el('button', {
              type: 'button',
              class: 'sw-btn-sm sq-place-target',
              'data-sq-place-at': String(idx),
              on: { click: function () { moveTo(movingIdx, idx, 'up'); } },
              text: fmt(L.sq_place_here || 'Place at #{n}', { n: idx + 1 }),
            });
          }
        }

        var badge = grade ? el('span', {
          class: 'sw-badge ' + (grade === 'right' ? 'is-right' : 'is-wrong'),
          'data-sq-grade': grade,
          text: grade === 'right' ? (L.sq_badge_right || 'In place') : (L.sq_badge_wrong || 'Check position'),
        }) : null;

        listEl.appendChild(el('li', {
          class: 'sq-row' + (isPicked ? ' is-selected' : '') + (grade === 'right' ? ' is-right' : grade === 'wrong' ? ' is-wrong' : ''),
          'data-sq-step': step.id,
        }, [
          el('span', { class: 'sq-num', 'aria-hidden': 'true', text: String(idx + 1) }),
          el('div', { class: 'sq-body' }, [
            step.label ? el('strong', { class: 'sq-label', text: step.label }) : null,
            el('span', { class: 'sq-text', text: step.text }),
            badge,
          ]),
          el('div', { class: 'sq-controls' }, [upBtn, downBtn, slotSel, placeAction]),
        ]));
      });
    };

    var checkBtn = el('button', {
      type: 'button',
      class: 'primary',
      'data-sq-check': '',
      on: {
        click: function () {
          if (locked) return;
          if (isCheck) {
            var idsStr = current.map(function (s) { return s.id; }).join(',');
            var res = ctx.answer(idsStr);
            if (res === 'recorded' || res === 'correct' || res === 'missed') {
              locked = true;
              checkBtn.disabled = true;
              resetBtn.disabled = true;
              paint();
            }
            return;
          }
          var right = 0;
          current.forEach(function (st, idx) {
            if (Number(st.order) === idx) { right++; grades[st.id] = 'right'; }
            else grades[st.id] = 'wrong';
          });
          var orderNums = current.map(function (st) { return Number(st.order) + 1; }).join(',');
          var summary = (right + '/' + current.length + ' | order:' + orderNums).slice(0, 80);
          var allRight = right === current.length;
          var outcome = ctx.answer(summary, allRight, {
            correctText: L.sq_all_right || 'Every step is in the right order.',
            retryText: fmt(L.sq_try_again || '{right} of {total} steps are in the right place.', { right: right, total: current.length }),
            missedText: L.sq_revealed || 'Here is the order from first to last.',
          });
          if (outcome === 'correct' || outcome === 'missed') {
            locked = true;
            checkBtn.disabled = true;
            resetBtn.disabled = true;
          }
          paint();
        },
      },
      text: L.sq_check || 'Check order',
    });

    var resetBtn = el('button', {
      type: 'button',
      'data-sq-reset': '',
      on: {
        click: function () {
          if (locked) return;
          current = initialOrder.slice();
          grades = Object.create(null);
          movingIdx = -1;
          if (ctx.feedback) ctx.feedback('');
          paint();
          ctx.announce('Sequence reset.');
        },
      },
      text: L.sq_reset || 'Reset order',
    });

    root.appendChild(promptEl);
    if (dirEl.textContent) root.appendChild(dirEl);
    if (hintBtn) root.appendChild(el('div', { class: 'row sw-tools-row' }, [hintBtn]));
    if (hintBox) root.appendChild(hintBox);
    root.appendChild(listEl);
    root.appendChild(el('div', { class: 'row sw-actions' }, [checkBtn, resetBtn]));
    root.appendChild(revealBox);
    paint();

    return {
      reveal: function (correctOrAnswer) {
        locked = true;
        checkBtn.disabled = true;
        resetBtn.disabled = true;
        if (correctOrAnswer === true) { paint(); return; }
        var ordered = [];
        if (typeof correctOrAnswer === 'string' && correctOrAnswer.indexOf(',') >= 0) {
          var byId = Object.create(null);
          rawSteps.forEach(function (s) { byId[s.id] = s; });
          correctOrAnswer.split(',').forEach(function (id) { if (byId[id]) ordered.push(byId[id]); });
        } else {
          ordered = rawSteps.slice().sort(function (a, b) { return Number(a.order) - Number(b.order); });
        }
        revealBox.textContent = '';
        revealBox.appendChild(el('h3', { class: 'sw-h3', text: L.sq_answer_heading || 'Order from first to last' }));
        revealBox.appendChild(el('ol', { class: 'sw-reveal-list' }, ordered.map(function (s) {
          return el('li', { text: (s.label ? s.label + ': ' : '') + s.text });
        })));
        revealBox.hidden = false;
        paint();
      },
    };
  }

  function scoreSequenceOrder(item, answer, response) {
    var want = String(answer == null ? '' : answer).trim();
    var got = String(response == null ? '' : response).trim();
    return { correct: !!want && got === want, digitsCorrect: null, digitsPossible: null };
  }

  function renderTieredWriting(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var doc = ctx.root.ownerDocument;
    var win = doc && doc.defaultView;
    var root = ctx.root;

    var frames = Array.isArray(item.frames) && item.frames.length ? item.frames : ['One key idea is ___.'];
    var starters = Array.isArray(item.starters) ? item.starters : [];
    var wordBank = Array.isArray(item.wordBank) ? item.wordBank : [];
    var checklist = Array.isArray(item.checklist) ? item.checklist : [];
    var minWords = Math.max(1, Number(item.minWords) || 12);
    var activeLevel = item.defaultLevel === 'starters' || item.defaultLevel === 'independent' ? item.defaultLevel : 'frames';
    var locked = false;
    var warnedShort = false;
    var lastBlank = null;
    var blankInputs = [];
    var frameSegments = [];
    var checkedBoxes = Object.create(null);
    var supportLogged = false;

    var levelLabelOf = function (lvl) {
      if (lvl === 'frames') return L.tw_level_frames || 'Level 1: Full Sentence Frames + Word Bank';
      if (lvl === 'starters') return L.tw_level_starters || 'Level 2: Sentence Starters + Checklist';
      return L.tw_level_independent || 'Level 3: Independent + Checklist';
    };
    var levelTagOf = function (lvl) {
      return lvl === 'frames' ? 'L1(frames)' : lvl === 'starters' ? 'L2(starters)' : 'L3(indep)';
    };
    var levelSupportKey = function (lvl) {
      return lvl === 'frames' ? 'scaffold_frames' : lvl === 'starters' ? 'scaffold_starters' : 'scaffold_independent';
    };

    var countWords = function (text) {
      var clean = String(text || '').replace(/\s+/g, ' ').trim();
      return clean ? clean.split(' ').length : 0;
    };

    var assembleFramesText = function () {
      var lines = [];
      frameSegments.forEach(function (seg) {
        var parts = [];
        var hasFilled = false;
        seg.forEach(function (piece) {
          if (typeof piece === 'string') {
            parts.push(piece);
          } else {
            var val = String(piece.value || '').trim();
            if (val) hasFilled = true;
            parts.push(val || '___');
          }
        });
        if (hasFilled || !blankInputs.length) lines.push(parts.join('').replace(/\s+/g, ' ').trim());
      });
      return lines.join(' ').trim();
    };

    var editorId = 'tw-ed-' + String(item.id || 'w').replace(/[^a-z0-9_-]+/gi, '_');
    var editor = el('textarea', {
      id: editorId,
      class: 'tw-editor',
      rows: '6',
      'data-tw-editor': '',
      'aria-label': L.tw_editor_label || 'Your response',
      on: { input: function () { warnedShort = false; updateCount(); } },
    });

    var currentText = function () {
      if (activeLevel === 'frames') {
        var filled = assembleFramesText();
        return filled.replace(/___/g, '').replace(/\s+/g, ' ').trim();
      }
      return String(editor.value || '').replace(/\s+/g, ' ').trim();
    };

    var countEl = el('p', { class: 'tw-count', role: 'status', 'aria-live': 'polite', 'data-tw-wordcount': '' });
    var previewEl = el('p', { class: 'tw-preview', 'data-tw-preview': '' });
    var printSheet = el('section', { class: 'tw-print-sheet', 'data-tw-print': '', 'aria-label': L.tw_print_heading || 'Student Writing Sheet' });

    var syncPrintSheet = function () {
      var text = activeLevel === 'frames' ? assembleFramesText() : String(editor.value || '').trim();
      var wc = countWords(currentText());
      var checksDone = Object.keys(checkedBoxes).filter(function (k) { return checkedBoxes[k]; }).length;
      printSheet.textContent = '';
      printSheet.appendChild(el('h3', { class: 'sw-h3', text: item.word || L.tw_print_heading || 'Student Writing Sheet' }));
      printSheet.appendChild(el('p', { class: 'tw-print-meta', text: levelLabelOf(activeLevel) + ' | Words: ' + wc + (checklist.length ? ' | Self-check: ' + checksDone + '/' + checklist.length : '') }));
      printSheet.appendChild(el('p', { class: 'tw-print-prompt', text: 'Prompt: ' + (item.prompt || '') }));
      if (item.passage) {
        printSheet.appendChild(el('p', { class: 'tw-print-passage', text: (item.passageTitle ? item.passageTitle + ': ' : '') + item.passage }));
      }
      printSheet.appendChild(el('div', { class: 'tw-print-body', 'data-tw-print-text': '', text: text || '(No response entered yet.)' }));
    };

    var updateCount = function () {
      var text = currentText();
      var wc = countWords(text);
      countEl.textContent = fmt(L.tw_words_count || 'Words: {count} (goal: {goal})', { count: wc, goal: minWords });
      if (activeLevel === 'frames') {
        var assembled = assembleFramesText();
        previewEl.textContent = assembled || 'Fill in the blanks above to build your response.';
      }
      syncPrintSheet();
    };

    // Level 1 panel: Full Sentence Frames + Word Bank
    var framesPanel = el('div', { class: 'tw-panel', 'data-tw-panel': 'frames' });
    var bankWrap = null;
    if (wordBank.length) {
      bankWrap = el('div', { class: 'tw-bank', 'data-tw-bank': '' }, [
        el('p', { class: 'sw-label', text: L.tw_word_bank || 'Word bank (tap a word to insert it)' }),
        el('div', { class: 'row tw-chips' }, wordBank.map(function (w) {
          return el('button', {
            type: 'button',
            class: 'sw-chip',
            'data-tw-bank-word': w,
            on: {
              click: function () {
                if (locked) return;
                var target = lastBlank && !lastBlank.disabled ? lastBlank : null;
                if (!target) {
                  for (var bi = 0; bi < blankInputs.length; bi++) {
                    if (!String(blankInputs[bi].value || '').trim()) { target = blankInputs[bi]; break; }
                  }
                }
                if (!target && blankInputs.length) target = blankInputs[0];
                if (target) {
                  target.value = w;
                  warnedShort = false;
                  if (ctx.support) ctx.support('word_bank_tap');
                  updateCount();
                  target.focus();
                }
              },
            },
            text: w,
          });
        })),
      ]);
      framesPanel.appendChild(bankWrap);
    }

    var blankIdx = 0;
    var framesList = el('div', { class: 'tw-frames' });
    frames.forEach(function (frameStr) {
      var seg = [];
      var lineEl = el('p', { class: 'tw-frame-line' });
      var parts = String(frameStr).split(/(_{2,}|\[\s*blank\s*\]|\(\s*blank\s*\))/i);
      var hadBlank = false;
      parts.forEach(function (part) {
        if (/^(?:_{2,}|\[\s*blank\s*\]|\(\s*blank\s*\))$/i.test(part)) {
          hadBlank = true;
          var myN = ++blankIdx;
          var inp = el('input', {
            type: 'text',
            class: 'tw-blank',
            'data-tw-blank': String(myN - 1),
            'aria-label': fmt(L.tw_blank_label || 'Blank {n}', { n: myN }),
            autocomplete: 'off',
            on: {
              focus: function () { lastBlank = inp; },
              input: function () { warnedShort = false; updateCount(); },
            },
          });
          blankInputs.push(inp);
          seg.push(inp);
          lineEl.appendChild(inp);
        } else if (part) {
          seg.push(part);
          lineEl.appendChild(doc.createTextNode(part));
        }
      });
      if (!hadBlank) {
        var extraN = ++blankIdx;
        var extraInp = el('input', {
          type: 'text',
          class: 'tw-blank',
          'data-tw-blank': String(extraN - 1),
          'aria-label': fmt(L.tw_blank_label || 'Blank {n}', { n: extraN }),
          autocomplete: 'off',
          on: {
            focus: function () { lastBlank = extraInp; },
            input: function () { warnedShort = false; updateCount(); },
          },
        });
        blankInputs.push(extraInp);
        seg.push(' ');
        seg.push(extraInp);
        lineEl.appendChild(doc.createTextNode(' '));
        lineEl.appendChild(extraInp);
      }
      frameSegments.push(seg);
      framesList.appendChild(lineEl);
    });
    framesPanel.appendChild(framesList);
    framesPanel.appendChild(el('p', { class: 'sw-label', text: L.tw_preview_label || 'Your assembled writing' }));
    framesPanel.appendChild(previewEl);

    // Level 2 & Level 3 writing panel
    var startersBox = el('div', { class: 'tw-starters', 'data-tw-starters': '' }, [
      el('p', { class: 'sw-label', text: L.tw_starters_label || 'Sentence starters (tap to add)' }),
      el('div', { class: 'row tw-chips' }, starters.map(function (st) {
        return el('button', {
          type: 'button',
          class: 'sw-chip',
          'data-tw-starter': st,
          on: {
            click: function () {
              if (locked) return;
              var cur = String(editor.value || '');
              var prefix = cur && !/\s$/.test(cur) ? cur + ' ' : cur;
              editor.value = prefix + st + ' ';
              warnedShort = false;
              if (ctx.support) ctx.support('starter_tap');
              updateCount();
              editor.focus();
            },
          },
          text: st,
        });
      })),
    ]);

    var checklistWrap = el('fieldset', { class: 'tw-checklist', 'data-tw-checklist': '' }, [
      el('legend', { text: L.tw_checklist_label || 'Self-check checklist' }),
    ].concat(checklist.map(function (cText, ci) {
      var cbId = 'tw-chk-' + String(item.id || 'w').replace(/[^a-z0-9_-]+/gi, '_') + '-' + ci;
      var cb = el('input', {
        type: 'checkbox',
        id: cbId,
        'data-tw-check': String(ci),
        on: {
          change: function () {
            checkedBoxes[ci] = !!cb.checked;
            if (cb.checked && ctx.support) ctx.support('checklist_checked');
            syncPrintSheet();
          },
        },
      });
      return el('label', { class: 'tw-check-row', for: cbId }, [cb, el('span', { text: cText })]);
    })));

    var editorPanel = el('div', { class: 'tw-panel', 'data-tw-panel': 'editor' }, [
      startersBox,
      el('label', { class: 'sw-label', for: editorId, text: L.tw_editor_label || 'Your response' }),
      editor,
      checklistWrap,
    ]);

    var levelBtns = {};
    var levels = ['frames', 'starters', 'independent'];
    var applyLevel = function (nextLevel, userAction) {
      if (locked) return;
      var prev = activeLevel;
      if (prev === 'frames' && nextLevel !== 'frames' && !String(editor.value || '').trim()) {
        var carried = assembleFramesText().replace(/___/g, '').replace(/\s+/g, ' ').trim();
        if (carried) editor.value = carried;
      }
      activeLevel = nextLevel;
      levels.forEach(function (lvl) {
        if (levelBtns[lvl]) levelBtns[lvl].setAttribute('aria-pressed', lvl === activeLevel ? 'true' : 'false');
      });
      framesPanel.hidden = activeLevel !== 'frames';
      editorPanel.hidden = activeLevel === 'frames';
      startersBox.hidden = activeLevel !== 'starters';
      warnedShort = false;
      if (userAction && prev !== activeLevel) {
        if (ctx.support) ctx.support('scaffold_switch');
        ctx.announce('Switched to ' + levelLabelOf(activeLevel) + '.');
      }
      updateCount();
    };

    var switcher = el('div', {
      class: 'tw-levels',
      role: 'group',
      'aria-label': L.tw_level_group || 'Writing support level',
    }, levels.map(function (lvl) {
      var btn = el('button', {
        type: 'button',
        class: 'tw-level-btn',
        'data-tw-level': lvl,
        'aria-pressed': lvl === activeLevel ? 'true' : 'false',
        on: { click: function () { applyLevel(lvl, true); } },
        text: levelLabelOf(lvl),
      });
      levelBtns[lvl] = btn;
      return btn;
    }));

    var submitBtn = el('button', {
      type: 'button',
      class: 'primary',
      'data-tw-submit': '',
      on: {
        click: function () {
          if (locked) return;
          var text = currentText();
          var wc = countWords(text);
          if (wc === 0) {
            var emptyMsg = L.tw_empty_warn || 'Write a response before finishing.';
            if (ctx.feedback) ctx.feedback(emptyMsg);
            ctx.announce(emptyMsg);
            return;
          }
          if (wc < minWords && !warnedShort && !ctx.check) {
            warnedShort = true;
            var shortMsg = fmt(L.tw_short_warn || 'You have {count} words (goal: {goal}). Press Finish writing again to turn it in.', { count: wc, goal: minWords });
            if (ctx.feedback) ctx.feedback(shortMsg);
            ctx.announce(shortMsg);
            return;
          }
          if (!supportLogged && ctx.support) {
            supportLogged = true;
            ctx.support(levelSupportKey(activeLevel));
          }
          var checksDone = Object.keys(checkedBoxes).filter(function (k) { return checkedBoxes[k]; }).length;
          var prefix = levelTagOf(activeLevel) + ' ' + wc + 'w' + (checklist.length ? ' c' + checksDone + '/' + checklist.length : '') + ': ';
          var resp = (prefix + text).slice(0, 80);
          var outcome = ctx.check
            ? ctx.answer(resp)
            : ctx.answer(resp, true, { correctText: L.tw_done_note || 'Writing saved in your session results.' });
          if (outcome === 'correct' || outcome === 'missed' || outcome === 'recorded') {
            locked = true;
            submitBtn.disabled = true;
            editor.readOnly = true;
            blankInputs.forEach(function (b) { b.readOnly = true; });
            levels.forEach(function (lvl) { if (levelBtns[lvl]) levelBtns[lvl].disabled = true; });
            syncPrintSheet();
          }
        },
      },
      text: L.tw_submit || 'Finish writing',
    });

    var printBtn = el('button', {
      type: 'button',
      'data-tw-print-btn': '',
      on: {
        click: function () {
          syncPrintSheet();
          if (ctx.support) ctx.support('print_writing');
          try { if (win && typeof win.print === 'function') win.print(); } catch (_) {}
        },
      },
      text: L.tw_print || 'Print my writing',
    });

    if (item.passage) {
      root.appendChild(el('section', { class: 'tw-passage', 'aria-label': item.passageTitle || 'Source text' }, [
        item.passageTitle ? el('h3', { class: 'sw-h3', text: item.passageTitle }) : null,
        el('p', { class: 'tw-passage-body', text: item.passage }),
      ]));
    }
    root.appendChild(el('p', { class: 'sw-prompt', text: item.prompt || '' }));
    root.appendChild(el('p', { class: 'muted sw-sub', text: L.tw_directions || '' }));
    root.appendChild(switcher);
    root.appendChild(framesPanel);
    root.appendChild(editorPanel);
    root.appendChild(countEl);
    root.appendChild(el('div', { class: 'row sw-actions' }, [submitBtn, printBtn]));
    root.appendChild(printSheet);
    applyLevel(activeLevel, false);

    return {
      reveal: function () {
        locked = true;
        submitBtn.disabled = true;
        editor.readOnly = true;
        blankInputs.forEach(function (b) { b.readOnly = true; });
        levels.forEach(function (lvl) { if (levelBtns[lvl]) levelBtns[lvl].disabled = true; });
        syncPrintSheet();
      },
    };
  }

  function scoreTieredWriting(item, answer, response) {
    var got = String(response == null ? '' : response).trim();
    return { correct: got.length > 0, digitsCorrect: null, digitsPossible: null };
  }

  // Self-contained UDL Choice Board renderer (bundles concept_sort, sequence_order, cloze_short, tiered_writing)
  function renderChoiceBoard(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var doc = ctx.root.ownerDocument;
    var win = doc && doc.defaultView;
    var pathways = Array.isArray(item.pathways) ? item.pathways : [];
    var root = ctx.root;

    var chosen = null;
    var done = false;
    var subHandle = null;
    var modalityLogged = Object.create(null);

    var goalBanner = el('section', { class: 'cb-goal', 'data-cb-goal': '', 'aria-label': L.cb_goal_label || 'Learning goal' }, [
      el('p', { class: 'cb-goal-kicker', text: L.cb_goal_label || 'Learning goal' }),
      el('p', { class: 'cb-goal-text', text: item.goal || item.prompt || '' }),
    ]);

    var pickerWrap = el('section', { class: 'cb-picker', 'data-cb-picker': '' });
    var activeBar = el('div', { class: 'cb-active-bar', hidden: true, 'data-cb-active': '' });
    var activeTitleEl = el('p', { class: 'cb-active-title' });
    var switchBtn = el('button', {
      type: 'button',
      class: 'sw-btn-sm',
      'data-cb-switch': '',
      on: {
        click: function () {
          if (done) return;
          if (ctx.support) ctx.support('modality_switch');
          chosen = null;
          subHandle = null;
          stageEl.textContent = '';
          activeBar.hidden = true;
          pickerWrap.hidden = false;
          if (ctx.feedback) ctx.feedback('');
          ctx.announce(L.cb_pick_heading || 'Choose how to show what you know.');
          var firstCard = pickerWrap.querySelector('button');
          if (firstCard && typeof firstCard.focus === 'function') firstCard.focus();
        },
      },
      text: L.cb_switch || 'Switch pathway',
    });
    activeBar.appendChild(activeTitleEl);
    activeBar.appendChild(switchBtn);
    var stageEl = el('div', { class: 'cb-stage', 'data-cb-stage': '' });

    var makeWrappedCtx = function (path) {
      return Object.assign({}, ctx, {
        root: stageEl,
        answer: function (resp, isCorrect, opts) {
          if (!modalityLogged[path.kind] && ctx.support) {
            modalityLogged[path.kind] = true;
            ctx.support('modality_' + path.kind);
          }
          var tagged = ('mod:' + path.kind + ' | ' + String(resp == null ? '' : resp)).slice(0, 80);
          var out = ctx.check ? ctx.answer(tagged) : ctx.answer(tagged, isCorrect, opts);
          if (out === 'correct' || out === 'missed' || out === 'recorded') {
            done = true;
            switchBtn.hidden = true;
          }
          return out;
        },
      });
    };

    var runConceptSortPath = function (subItem, subCtx) {
      var cats = Array.isArray(subItem.categories) ? subItem.categories : [];
      var cards = Array.isArray(subItem.cards) ? subItem.cards : [];
      var placed = Object.create(null);
      var grades = Object.create(null);
      var selectedId = '';
      var locked = false;
      var catById = Object.create(null);
      cats.forEach(function (g) { catById[g.id] = g; });
      var cardById = Object.create(null);
      cards.forEach(function (c) { cardById[c.id] = c; });
      var makeIcon = function (icon) {
        if (!icon) return null;
        if (String(icon).indexOf('data:image/') === 0) return el('img', { class: 'cs-icon-img', src: icon, alt: '' });
        return el('span', { class: 'cs-icon', 'aria-hidden': 'true', text: icon });
      };
      var tray = el('section', { class: 'cs-tray', 'aria-label': L.cs_tray_title || 'Cards to sort' });
      var bins = el('div', { class: 'cs-bins', 'data-cs-bins': '' });
      var revealBox = el('div', { class: 'sw-reveal', hidden: true, 'data-cs-reveal': '' });
      var focusCard = function (cid, prefer) {
        var sels = prefer === 'select'
          ? ['[data-cs-select="' + cid + '"]', '[data-cs-card-btn="' + cid + '"]']
          : ['[data-cs-card-btn="' + cid + '"]', '[data-cs-select="' + cid + '"]'];
        for (var i = 0; i < sels.length; i++) {
          var n = subCtx.root.querySelector(sels[i]);
          if (n && !n.disabled && typeof n.focus === 'function') { n.focus(); return; }
        }
        if (chk && !chk.disabled && typeof chk.focus === 'function') chk.focus();
      };
      var assign = function (cid, gid, prefer) {
        if (locked || !cardById[cid]) return;
        if (gid && catById[gid]) { placed[cid] = gid; delete grades[cid]; selectedId = ''; }
        else { delete placed[cid]; delete grades[cid]; }
        paint();
        focusCard(cid, prefer || 'btn');
      };
      var cardNode = function (card, inBin) {
        var isSel = selectedId === card.id;
        var gr = grades[card.id] || '';
        var sel = el('select', {
          class: 'cs-select',
          'data-cs-select': card.id,
          'aria-label': fmt(L.cs_choose_group || 'Category for {card}', { card: card.text }),
          disabled: locked,
          on: { change: function () { assign(card.id, sel.value, 'select'); } },
        }, [el('option', { value: '', text: L.cs_unsorted_option || 'Not placed yet' })].concat(cats.map(function (g) {
          return el('option', { value: g.id, text: g.label });
        })));
        sel.value = placed[card.id] || '';
        return el('div', {
          class: 'cs-card' + (isSel ? ' is-selected' : '') + (gr === 'right' ? ' is-right' : gr === 'wrong' ? ' is-wrong' : ''),
          'data-cs-card': card.id,
          draggable: locked ? 'false' : 'true',
          on: { dragstart: function (ev) { if (!locked) { selectedId = card.id; try { if (ev.dataTransfer) ev.dataTransfer.setData('text/plain', card.id); } catch (_) {} } } },
        }, [
          el('button', {
            type: 'button',
            class: 'cs-card-pick',
            'data-cs-card-btn': card.id,
            'aria-pressed': isSel ? 'true' : 'false',
            disabled: locked,
            on: { click: function () { if (!locked) { selectedId = isSel ? '' : card.id; paint(); focusCard(card.id, 'btn'); } } },
          }, [makeIcon(card.icon), el('span', { class: 'cs-card-body' }, [el('span', { class: 'cs-card-text', text: card.text }), card.detail ? el('span', { class: 'cs-card-detail', text: card.detail }) : null])]),
          gr ? el('span', { class: 'sw-badge ' + (gr === 'right' ? 'is-right' : 'is-wrong'), text: gr === 'right' ? (L.cs_badge_right || 'Matches') : (L.cs_badge_wrong || 'Try another group') }) : null,
          el('div', { class: 'cs-card-controls' }, [sel, inBin && !locked ? el('button', { type: 'button', class: 'sw-btn-sm cs-remove', on: { click: function () { assign(card.id, '', 'btn'); } }, text: L.cs_remove || 'Move back' }) : null]),
        ]);
      };
      var paint = function () {
        tray.textContent = '';
        bins.textContent = '';
        var un = cards.filter(function (c) { return !placed[c.id]; });
        tray.appendChild(el('h3', { class: 'sw-h3', text: (L.cs_tray_title || 'Cards to sort') + ' (' + un.length + ')' }));
        tray.appendChild(un.length ? el('div', { class: 'cs-card-grid', 'data-cs-tray': '' }, un.map(function (c) { return cardNode(c, false); })) : el('p', { class: 'muted', text: L.cs_tray_empty || 'All cards placed.' }));
        cats.forEach(function (g) {
          var inG = cards.filter(function (c) { return placed[c.id] === g.id; });
          var b = el('section', {
            class: 'cs-bin' + (selectedId && !locked ? ' is-ready' : ''),
            'data-cs-bin': g.id,
            'aria-label': g.label,
            on: {
              dragover: function (ev) { if (!locked) { ev.preventDefault(); b.classList.add('is-over'); } },
              dragleave: function () { b.classList.remove('is-over'); },
              drop: function (ev) {
                if (locked) return;
                ev.preventDefault();
                b.classList.remove('is-over');
                var dragged = '';
                try { dragged = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : ''; } catch (_) {}
                assign(dragged || selectedId, g.id);
              },
            },
          }, [
            el('div', { class: 'cs-bin-head' }, [makeIcon(g.icon), el('div', { class: 'cs-bin-titles' }, [el('h3', { class: 'sw-h3', text: g.label + ' (' + inG.length + ')' }), g.description ? el('p', { class: 'muted cs-bin-desc', text: g.description }) : null])]),
            !locked ? el('button', { type: 'button', class: 'sw-btn-sm cs-place-btn', 'data-cs-place': g.id, hidden: !selectedId, on: { click: function () { if (selectedId) assign(selectedId, g.id); } }, text: (L.cs_place_here || 'Place here') + ': ' + g.label }) : null,
            el('div', { class: 'cs-bin-cards' }, inG.map(function (c) { return cardNode(c, true); })),
          ]);
          bins.appendChild(b);
        });
      };
      var chk = el('button', {
        type: 'button',
        class: 'primary',
        'data-cs-check': '',
        on: {
          click: function () {
            if (locked) return;
            var left = cards.filter(function (c) { return !placed[c.id]; }).length;
            if (left > 0) { var m = fmt(L.cs_unsorted || 'Place {left} more card(s).', { left: left }); if (subCtx.feedback) subCtx.feedback(m); subCtx.announce(m); return; }
            var right = 0, misses = [];
            cards.forEach(function (c) {
              if (placed[c.id] === c.category) { right++; grades[c.id] = 'right'; }
              else { grades[c.id] = 'wrong'; misses.push(c.text.slice(0, 12) + '->' + (catById[placed[c.id]] ? catById[placed[c.id]].label.slice(0, 10) : placed[c.id])); }
            });
            var ok = right === cards.length;
            var res = subCtx.answer(ok ? (right + '/' + cards.length + ' sorted') : (right + '/' + cards.length + ' ' + misses.join(',')), ok, {
              correctText: L.cs_all_right || 'Every card is in the right group.',
              retryText: fmt(L.cs_try_again || '{right} of {total} cards match.', { right: right, total: cards.length }),
              missedText: L.cs_revealed || 'Here is where each card belongs.',
            });
            if (res === 'correct' || res === 'missed' || res === 'recorded') { locked = true; chk.disabled = true; }
            paint();
          },
        },
        text: L.cs_check || 'Check my sort',
      });
      subCtx.root.appendChild(el('p', { class: 'sw-prompt', text: subItem.prompt || '' }));
      subCtx.root.appendChild(tray);
      subCtx.root.appendChild(bins);
      subCtx.root.appendChild(el('div', { class: 'row sw-actions' }, [chk]));
      subCtx.root.appendChild(revealBox);
      paint();
      return {
        reveal: function (ok) {
          locked = true; chk.disabled = true;
          if (ok !== true) {
            revealBox.textContent = '';
            revealBox.appendChild(el('h3', { class: 'sw-h3', text: L.cs_revealed || 'Here is where each card belongs.' }));
            revealBox.appendChild(el('ul', { class: 'sw-reveal-list' }, cards.map(function (c) { return el('li', { text: c.text + ' — ' + (catById[c.category] ? catById[c.category].label : c.category) }); })));
            revealBox.hidden = false;
          }
          paint();
        },
      };
    };

    var runSequencePath = function (subItem, subCtx) {
      var rawSteps = Array.isArray(subItem.steps) ? subItem.steps.slice() : [];
      var cur = rawSteps.slice();
      if (cur.length > 1) {
        var h = 2166136261 >>> 0, s = String(subItem.id || item.id || 'sq');
        for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        var st = h || 1;
        for (var k = cur.length - 1; k > 0; k--) {
          st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
          var j = Math.floor((st / 4294967296) * (k + 1));
          var t = cur[k]; cur[k] = cur[j]; cur[j] = t;
        }
        if (cur.every(function (x, idx) { return x === rawSteps[idx]; })) cur.push(cur.shift());
      }
      var grades = Object.create(null);
      var locked = false;
      var listEl = el('ol', { class: 'sq-list', 'data-sq-list': '' });
      var revealBox = el('div', { class: 'sw-reveal', hidden: true, 'data-sq-reveal': '' });
      var focusSeq = function (sid, prefer) {
        var sels = prefer === 'up'
          ? ['[data-sq-up="' + sid + '"]', '[data-sq-down="' + sid + '"]', '[data-sq-slot="' + sid + '"]']
          : prefer === 'down'
            ? ['[data-sq-down="' + sid + '"]', '[data-sq-up="' + sid + '"]', '[data-sq-slot="' + sid + '"]']
            : ['[data-sq-slot="' + sid + '"]', '[data-sq-up="' + sid + '"]', '[data-sq-down="' + sid + '"]'];
        for (var i = 0; i < sels.length; i++) {
          var t = listEl.querySelector(sels[i]);
          if (t && !t.disabled && typeof t.focus === 'function') { t.focus(); return; }
        }
      };
      var move = function (from, to, prefer) {
        if (locked || from === to || to < 0 || to >= cur.length) return;
        var moved = cur.splice(from, 1)[0];
        cur.splice(to, 0, moved);
        grades = Object.create(null);
        paint();
        focusSeq(moved.id, prefer || 'slot');
      };
      var paint = function () {
        listEl.textContent = '';
        cur.forEach(function (step, idx) {
          var gr = grades[step.id] || '';
          var sel = el('select', { class: 'sq-slot', 'data-sq-slot': step.id, 'aria-label': (L.sq_slot_label || 'Position') + ' ' + (step.label || step.text), disabled: locked, on: { change: function () { move(idx, Number(sel.value), 'slot'); } } }, cur.map(function (_, p) { return el('option', { value: String(p), text: '#' + (p + 1) }); }));
          sel.value = String(idx);
          listEl.appendChild(el('li', { class: 'sq-row' + (gr === 'right' ? ' is-right' : gr === 'wrong' ? ' is-wrong' : ''), 'data-sq-step': step.id }, [
            el('span', { class: 'sq-num', 'aria-hidden': 'true', text: String(idx + 1) }),
            el('div', { class: 'sq-body' }, [step.label ? el('strong', { class: 'sq-label', text: step.label }) : null, el('span', { class: 'sq-text', text: step.text }), gr ? el('span', { class: 'sw-badge ' + (gr === 'right' ? 'is-right' : 'is-wrong'), text: gr === 'right' ? (L.sq_badge_right || 'In place') : (L.sq_badge_wrong || 'Check position') }) : null]),
            el('div', { class: 'sq-controls' }, [
              el('button', { type: 'button', class: 'sw-btn-sm', 'data-sq-up': step.id, disabled: locked || idx === 0, on: { click: function () { move(idx, idx - 1, 'up'); } }, text: L.sq_up || 'Up' }),
              el('button', { type: 'button', class: 'sw-btn-sm', 'data-sq-down': step.id, disabled: locked || idx === cur.length - 1, on: { click: function () { move(idx, idx + 1, 'down'); } }, text: L.sq_down || 'Down' }),
              sel,
            ]),
          ]));
        });
      };
      var chk = el('button', {
        type: 'button',
        class: 'primary',
        'data-sq-check': '',
        on: {
          click: function () {
            if (locked) return;
            var right = 0;
            cur.forEach(function (st, idx) { if (Number(st.order) === idx) { right++; grades[st.id] = 'right'; } else grades[st.id] = 'wrong'; });
            var ok = right === cur.length;
            var res = subCtx.answer(right + '/' + cur.length + ' ord:' + cur.map(function (st) { return Number(st.order) + 1; }).join(','), ok, {
              correctText: L.sq_all_right || 'Every step is in the right order.',
              retryText: fmt(L.sq_try_again || '{right} of {total} steps are in the right place.', { right: right, total: cur.length }),
              missedText: L.sq_revealed || 'Here is the order from first to last.',
            });
            if (res === 'correct' || res === 'missed' || res === 'recorded') { locked = true; chk.disabled = true; }
            paint();
          },
        },
        text: L.sq_check || 'Check order',
      });
      subCtx.root.appendChild(el('p', { class: 'sw-prompt', text: subItem.prompt || '' }));
      subCtx.root.appendChild(listEl);
      subCtx.root.appendChild(el('div', { class: 'row sw-actions' }, [chk]));
      subCtx.root.appendChild(revealBox);
      paint();
      return {
        reveal: function (ok) {
          locked = true; chk.disabled = true;
          if (ok !== true) {
            revealBox.textContent = '';
            revealBox.appendChild(el('h3', { class: 'sw-h3', text: L.sq_answer_heading || 'Order from first to last' }));
            revealBox.appendChild(el('ol', { class: 'sw-reveal-list' }, rawSteps.slice().sort(function (a, b) { return Number(a.order) - Number(b.order); }).map(function (s) { return el('li', { text: (s.label ? s.label + ': ' : '') + s.text }); })));
            revealBox.hidden = false;
          }
          paint();
        },
      };
    };

    var runClozePath = function (subItem, subCtx) {
      var qs = Array.isArray(subItem.questions) ? subItem.questions : [];
      var bank = Array.isArray(subItem.wordBank) ? subItem.wordBank : [];
      var inputs = [];
      var badges = [];
      var lastInput = null;
      var locked = false;
      var revealBox = el('div', { class: 'sw-reveal', hidden: true, 'data-cz-reveal': '' });

      subCtx.root.appendChild(el('p', { class: 'sw-prompt', text: subItem.prompt || 'Fill in each blank.' }));
      if (bank.length) {
        subCtx.root.appendChild(el('div', { class: 'tw-bank', 'data-cz-bank': '' }, [
          el('p', { class: 'sw-label', text: L.cb_cloze_word_bank || 'Word bank (tap a word to insert it)' }),
          el('div', { class: 'row tw-chips' }, bank.map(function (w) {
            return el('button', {
              type: 'button',
              class: 'sw-chip',
              'data-cz-word': w,
              on: {
                click: function () {
                  if (locked) return;
                  var tgt = lastInput && !lastInput.disabled ? lastInput : null;
                  if (!tgt) { for (var i = 0; i < inputs.length; i++) { if (!String(inputs[i].value || '').trim()) { tgt = inputs[i]; break; } } }
                  if (!tgt && inputs.length) tgt = inputs[0];
                  if (tgt) { tgt.value = w; if (subCtx.support) subCtx.support('word_bank_tap'); tgt.focus(); }
                },
              },
              text: w,
            });
          })),
        ]));
      }
      var listEl = el('ol', { class: 'cz-list', 'data-cz-list': '' });
      qs.forEach(function (q, qi) {
        var inp = el('input', {
          type: 'text',
          class: 'tw-blank cz-input',
          'data-cz-input': String(qi),
          'aria-label': fmt(L.cb_cloze_blank_label || 'Answer {n}', { n: qi + 1 }),
          autocomplete: 'off',
          on: { focus: function () { lastInput = inp; } },
        });
        inputs.push(inp);
        var bdg = el('span', { class: 'sw-badge', hidden: true });
        badges.push(bdg);
        var parts = String(q.text || '').split(/(_{2,}|\[\s*blank\s*\])/i);
        var rowBody = el('div', { class: 'cz-q' });
        var placedBlank = false;
        parts.forEach(function (p) {
          if (!placedBlank && /^(?:_{2,}|\[\s*blank\s*\])$/i.test(p)) { placedBlank = true; rowBody.appendChild(inp); }
          else if (p) rowBody.appendChild(doc.createTextNode(p));
        });
        if (!placedBlank) { rowBody.appendChild(doc.createTextNode(' ')); rowBody.appendChild(inp); }
        rowBody.appendChild(bdg);
        listEl.appendChild(el('li', { class: 'cz-row' }, [rowBody]));
      });
      var chk = el('button', {
        type: 'button',
        class: 'primary',
        'data-cz-check': '',
        on: {
          click: function () {
            if (locked) return;
            var empty = inputs.some(function (i) { return !String(i.value || '').trim(); });
            if (empty) { var m = L.cb_cloze_empty || 'Fill in every blank before checking.'; if (subCtx.feedback) subCtx.feedback(m); subCtx.announce(m); return; }
            var right = 0, misses = [];
            qs.forEach(function (q, qi) {
              var val = String(inputs[qi].value || '').replace(/\s+/g, ' ').trim().toLowerCase();
              var ok = (q.answers || []).some(function (a) { return String(a || '').replace(/\s+/g, ' ').trim().toLowerCase() === val; });
              badges[qi].hidden = false;
              badges[qi].className = 'sw-badge ' + (ok ? 'is-right' : 'is-wrong');
              badges[qi].textContent = ok ? (L.cs_badge_right || 'Matches') : (L.sq_badge_wrong || 'Check answer');
              if (ok) right++; else misses.push((qi + 1) + ':' + val.slice(0, 12));
            });
            var allOk = right === qs.length;
            var res = subCtx.answer(allOk ? (right + '/' + qs.length + ' cloze') : (right + '/' + qs.length + ' ' + misses.join(',')), allOk, {
              correctText: L.cb_cloze_all_right || 'Every blank is right.',
              retryText: fmt(L.cb_cloze_try_again || '{right} of {total} blanks match.', { right: right, total: qs.length }),
              missedText: L.cb_cloze_revealed || 'Here are the completed answers.',
            });
            if (res === 'correct' || res === 'missed' || res === 'recorded') {
              locked = true; chk.disabled = true; inputs.forEach(function (i) { i.readOnly = true; });
            }
          },
        },
        text: L.cb_cloze_check || 'Check answers',
      });
      subCtx.root.appendChild(listEl);
      subCtx.root.appendChild(el('div', { class: 'row sw-actions' }, [chk]));
      subCtx.root.appendChild(revealBox);
      return {
        reveal: function (ok) {
          locked = true; chk.disabled = true; inputs.forEach(function (i) { i.readOnly = true; });
          if (ok !== true) {
            revealBox.textContent = '';
            revealBox.appendChild(el('h3', { class: 'sw-h3', text: L.cb_cloze_revealed || 'Here are the completed answers.' }));
            revealBox.appendChild(el('ol', { class: 'sw-reveal-list' }, qs.map(function (q) {
              return el('li', { text: String(q.text || '').replace(/(?:_{2,}|\[\s*blank\s*\])/i, (q.answers && q.answers[0]) || '') });
            })));
            revealBox.hidden = false;
          }
        },
      };
    };

    var runWritingPath = function (subItem, subCtx) {
      var frames = Array.isArray(subItem.frames) && subItem.frames.length ? subItem.frames : ['One key idea is ___.'];
      var starters = Array.isArray(subItem.starters) ? subItem.starters : [];
      var bank = Array.isArray(subItem.wordBank) ? subItem.wordBank : [];
      var checklist = Array.isArray(subItem.checklist) ? subItem.checklist : [];
      var minW = Math.max(1, Number(subItem.minWords) || 12);
      var level = subItem.defaultLevel === 'starters' || subItem.defaultLevel === 'independent' ? subItem.defaultLevel : 'frames';
      var locked = false, warned = false, lastBlank = null, blanks = [], segs = [], checked = Object.create(null);

      var wordsOf = function (t) { var c = String(t || '').replace(/\s+/g, ' ').trim(); return c ? c.split(' ').length : 0; };
      var editor = el('textarea', { class: 'tw-editor', rows: '6', 'data-tw-editor': '', 'aria-label': L.tw_editor_label || 'Your response', on: { input: function () { warned = false; update(); } } });
      var assembledOf = function () {
        var out = [];
        segs.forEach(function (seg) {
          var p = [], any = false;
          seg.forEach(function (x) { if (typeof x === 'string') p.push(x); else { var v = String(x.value || '').trim(); if (v) any = true; p.push(v || '___'); } });
          if (any || !blanks.length) out.push(p.join('').replace(/\s+/g, ' ').trim());
        });
        return out.join(' ').trim();
      };
      var textNow = function () { return level === 'frames' ? assembledOf().replace(/___/g, '').replace(/\s+/g, ' ').trim() : String(editor.value || '').replace(/\s+/g, ' ').trim(); };
      var countEl = el('p', { class: 'tw-count', role: 'status', 'aria-live': 'polite', 'data-tw-wordcount': '' });
      var previewEl = el('p', { class: 'tw-preview', 'data-tw-preview': '' });
      var printSheet = el('section', { class: 'tw-print-sheet', 'data-tw-print': '', 'aria-label': L.tw_print_heading || 'Student Writing Sheet' });
      var update = function () {
        var txt = textNow();
        var wc = wordsOf(txt);
        countEl.textContent = fmt(L.tw_words_count || 'Words: {count} (goal: {goal})', { count: wc, goal: minW });
        if (level === 'frames') previewEl.textContent = assembledOf() || 'Fill in the blanks above.';
        printSheet.textContent = '';
        printSheet.appendChild(el('h3', { class: 'sw-h3', text: subItem.word || item.word || 'Student Writing Sheet' }));
        printSheet.appendChild(el('div', { class: 'tw-print-body', text: (level === 'frames' ? assembledOf() : String(editor.value || '').trim()) || '(No response entered yet.)' }));
      };
      var framesPanel = el('div', { class: 'tw-panel', 'data-tw-panel': 'frames' });
      if (bank.length) {
        framesPanel.appendChild(el('div', { class: 'tw-bank' }, [
          el('p', { class: 'sw-label', text: L.tw_word_bank || 'Word bank' }),
          el('div', { class: 'row tw-chips' }, bank.map(function (w) {
            return el('button', { type: 'button', class: 'sw-chip', 'data-tw-bank-word': w, on: { click: function () {
              if (locked) return;
              var t = lastBlank || blanks.filter(function (b) { return !String(b.value || '').trim(); })[0] || blanks[0];
              if (t) { t.value = w; if (subCtx.support) subCtx.support('word_bank_tap'); update(); t.focus(); }
            } }, text: w });
          })),
        ]));
      }
      var bIdx = 0;
      frames.forEach(function (f) {
        var seg = [], pEl = el('p', { class: 'tw-frame-line' }), gotB = false;
        String(f).split(/(_{2,}|\[\s*blank\s*\])/i).forEach(function (part) {
          if (/^(?:_{2,}|\[\s*blank\s*\])$/i.test(part)) {
            gotB = true;
            var inp = el('input', { type: 'text', class: 'tw-blank', 'data-tw-blank': String(bIdx++), 'aria-label': fmt(L.tw_blank_label || 'Blank {n}', { n: bIdx }), on: { focus: function () { lastBlank = inp; }, input: function () { warned = false; update(); } } });
            blanks.push(inp); seg.push(inp); pEl.appendChild(inp);
          } else if (part) { seg.push(part); pEl.appendChild(doc.createTextNode(part)); }
        });
        if (!gotB) {
          var inp2 = el('input', { type: 'text', class: 'tw-blank', 'data-tw-blank': String(bIdx++), 'aria-label': fmt(L.tw_blank_label || 'Blank {n}', { n: bIdx }), on: { focus: function () { lastBlank = inp2; }, input: function () { warned = false; update(); } } });
          blanks.push(inp2); seg.push(' '); seg.push(inp2); pEl.appendChild(doc.createTextNode(' ')); pEl.appendChild(inp2);
        }
        segs.push(seg); framesPanel.appendChild(pEl);
      });
      framesPanel.appendChild(previewEl);
      var startersBox = el('div', { class: 'tw-starters' }, [
        el('p', { class: 'sw-label', text: L.tw_starters_label || 'Sentence starters' }),
        el('div', { class: 'row tw-chips' }, starters.map(function (st) {
          return el('button', { type: 'button', class: 'sw-chip', 'data-tw-starter': st, on: { click: function () {
            if (locked) return;
            var v = String(editor.value || '');
            editor.value = (v && !/\s$/.test(v) ? v + ' ' : v) + st + ' ';
            if (subCtx.support) subCtx.support('starter_tap');
            update(); editor.focus();
          } }, text: st });
        })),
      ]);
      var chkField = el('fieldset', { class: 'tw-checklist' }, [el('legend', { text: L.tw_checklist_label || 'Self-check checklist' })].concat(checklist.map(function (ct, ci) {
        var cid = 'cb-tw-c-' + ci;
        var cb = el('input', { type: 'checkbox', id: cid, 'data-tw-check': String(ci), on: { change: function () { checked[ci] = !!cb.checked; if (cb.checked && subCtx.support) subCtx.support('checklist_checked'); } } });
        return el('label', { class: 'tw-check-row', for: cid }, [cb, el('span', { text: ct })]);
      })));
      var edPanel = el('div', { class: 'tw-panel', 'data-tw-panel': 'editor' }, [startersBox, editor, chkField]);
      var btns = {};
      var setLvl = function (nl, user) {
        if (locked) return;
        if (level === 'frames' && nl !== 'frames' && !String(editor.value || '').trim()) editor.value = assembledOf().replace(/___/g, '').replace(/\s+/g, ' ').trim();
        var prev = level; level = nl;
        ['frames', 'starters', 'independent'].forEach(function (l) { if (btns[l]) btns[l].setAttribute('aria-pressed', l === level ? 'true' : 'false'); });
        framesPanel.hidden = level !== 'frames'; edPanel.hidden = level === 'frames'; startersBox.hidden = level !== 'starters';
        if (user && prev !== level && subCtx.support) subCtx.support('scaffold_switch');
        update();
      };
      var sw = el('div', { class: 'tw-levels', role: 'group', 'aria-label': L.tw_level_group || 'Writing support level' }, [
        ['frames', L.tw_level_frames || 'Level 1: Full Sentence Frames + Word Bank'],
        ['starters', L.tw_level_starters || 'Level 2: Sentence Starters + Checklist'],
        ['independent', L.tw_level_independent || 'Level 3: Independent + Checklist'],
      ].map(function (pair) {
        var b = el('button', { type: 'button', class: 'tw-level-btn', 'data-tw-level': pair[0], on: { click: function () { setLvl(pair[0], true); } }, text: pair[1] });
        btns[pair[0]] = b; return b;
      }));
      var subBtn = el('button', {
        type: 'button',
        class: 'primary',
        'data-tw-submit': '',
        on: {
          click: function () {
            if (locked) return;
            var txt = textNow(), wc = wordsOf(txt);
            if (!wc) { if (subCtx.feedback) subCtx.feedback(L.tw_empty_warn || 'Write a response first.'); return; }
            if (wc < minW && !warned && !subCtx.check) { warned = true; if (subCtx.feedback) subCtx.feedback(fmt(L.tw_short_warn || 'Goal: {goal} words.', { count: wc, goal: minW })); return; }
            if (subCtx.support) subCtx.support(level === 'frames' ? 'scaffold_frames' : level === 'starters' ? 'scaffold_starters' : 'scaffold_independent');
            var tag = level === 'frames' ? 'L1' : level === 'starters' ? 'L2' : 'L3';
            var res = subCtx.answer(tag + ' ' + wc + 'w: ' + txt, true, { correctText: L.tw_done_note || 'Writing saved.' });
            if (res === 'correct' || res === 'missed' || res === 'recorded') {
              locked = true; subBtn.disabled = true; editor.readOnly = true; blanks.forEach(function (b) { b.readOnly = true; });
            }
          },
        },
        text: L.tw_submit || 'Finish writing',
      });
      var prBtn = el('button', { type: 'button', 'data-tw-print-btn': '', on: { click: function () { update(); try { if (win && typeof win.print === 'function') win.print(); } catch (_) {} } }, text: L.tw_print || 'Print my writing' });
      if (subItem.passage) subCtx.root.appendChild(el('section', { class: 'tw-passage', 'aria-label': subItem.passageTitle || 'Source text' }, [subItem.passageTitle ? el('h3', { class: 'sw-h3', text: subItem.passageTitle }) : null, el('p', { class: 'tw-passage-body', text: subItem.passage })]));
      subCtx.root.appendChild(el('p', { class: 'sw-prompt', text: subItem.prompt || '' }));
      subCtx.root.appendChild(sw);
      subCtx.root.appendChild(framesPanel);
      subCtx.root.appendChild(edPanel);
      subCtx.root.appendChild(countEl);
      subCtx.root.appendChild(el('div', { class: 'row sw-actions' }, [subBtn, prBtn]));
      subCtx.root.appendChild(printSheet);
      setLvl(level, false);
      return { reveal: function () { locked = true; subBtn.disabled = true; editor.readOnly = true; blanks.forEach(function (b) { b.readOnly = true; }); } };
    };

    var launchPathway = function (path) {
      chosen = path;
      pickerWrap.hidden = true;
      activeBar.hidden = false;
      activeTitleEl.textContent = fmt(L.cb_active_path || 'Current path: {title}', { title: path.title });
      switchBtn.hidden = done;
      stageEl.textContent = '';
      if (ctx.feedback) ctx.feedback('');
      var wrapped = makeWrappedCtx(path);
      if (path.kind === 'concept_sort') subHandle = runConceptSortPath(path.data || {}, wrapped);
      else if (path.kind === 'sequence_order') subHandle = runSequencePath(path.data || {}, wrapped);
      else if (path.kind === 'cloze_short') subHandle = runClozePath(path.data || {}, wrapped);
      else if (path.kind === 'tiered_writing') subHandle = runWritingPath(path.data || {}, wrapped);
      ctx.announce('Started ' + path.title + '.');
    };

    var kindLabel = function (kind) {
      if (kind === 'concept_sort') return 'Concept Sort';
      if (kind === 'sequence_order') return 'Sequence Order';
      if (kind === 'cloze_short') return 'Cloze / Short-Answer';
      return 'Tiered Writing';
    };

    pickerWrap.appendChild(el('h3', { class: 'sw-h3', text: L.cb_pick_heading || 'Choose how to show what you know' }));
    pickerWrap.appendChild(el('p', { class: 'muted sw-sub', text: item.prompt || L.cb_directions || '' }));
    pickerWrap.appendChild(el('div', { class: 'cb-grid' }, pathways.map(function (p, pi) {
      return el('button', {
        type: 'button',
        class: 'cb-card',
        'data-cb-pick': p.kind,
        'data-cb-path-id': p.id || ('p' + pi),
        on: { click: function () { launchPathway(p); } },
      }, [
        el('span', { class: 'cb-badge', text: kindLabel(p.kind) }),
        el('strong', { class: 'cb-card-title', text: p.title }),
        el('span', { class: 'cb-card-summary', text: p.summary }),
      ]);
    })));

    root.appendChild(goalBanner);
    root.appendChild(pickerWrap);
    root.appendChild(activeBar);
    root.appendChild(stageEl);

    return {
      reveal: function (ok) {
        done = true;
        switchBtn.hidden = true;
        if (subHandle && typeof subHandle.reveal === 'function') {
          try { subHandle.reveal(ok); } catch (_) {}
        }
      },
    };
  }

  function scoreChoiceBoard(item, answer, response) {
    var got = String(response == null ? '' : response).trim();
    return { correct: got.length > 0 && got.indexOf('mod:') === 0, digitsCorrect: null, digitsPossible: null };
  }

  // ---------------------------------------------------------------------------
  // Check-mode prepare hooks (used by sealCheck when lesson.mode === 'probe')
  // ---------------------------------------------------------------------------
  function prepareConceptSortCheck(raw) {
    var norm = normalizeConceptSortItem(raw, 0);
    if (norm.categories.length < 2 || norm.cards.length < 2) {
      return { item: null, missing: ['at least 2 categories and 2 cards'] };
    }
    var sorted = norm.cards.slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    var answer = sorted.map(function (c) { return c.id + '=' + c.category; }).join(';');
    var strippedCards = norm.cards.map(function (c) {
      return { id: c.id, text: c.text, detail: c.detail, icon: c.icon };
    });
    return {
      item: {
        id: norm.id,
        word: norm.word,
        prompt: norm.prompt,
        categories: norm.categories,
        cards: strippedCards,
        answer: answer,
      },
    };
  }

  function prepareSequenceOrderCheck(raw) {
    var norm = normalizeSequenceOrderItem(raw, 0);
    if (norm.steps.length < 3) {
      return { item: null, missing: ['at least 3 ordered steps'] };
    }
    var answer = norm.steps.map(function (s) { return s.id; }).join(',');
    var shuffled = deterministicShuffle(norm.steps, norm.id).map(function (s) {
      return { id: s.id, label: s.label, text: s.text };
    });
    return {
      item: {
        id: norm.id,
        word: norm.word,
        prompt: norm.prompt,
        steps: shuffled,
        answer: answer,
      },
    };
  }

  function prepareTieredWritingCheck(raw) {
    var norm = normalizeTieredWritingItem(raw, 0);
    return {
      item: Object.assign({}, norm, { answer: 'written' }),
    };
  }

  function prepareChoiceBoardCheck(raw) {
    var norm = normalizeChoiceBoardItem(raw, 0);
    if (norm.pathways.length < 2) {
      return { item: null, missing: ['at least 2 pathways'] };
    }
    return {
      item: Object.assign({}, norm, { answer: 'choice_board' }),
    };
  }

  // ---------------------------------------------------------------------------
  // Student Packet Extra CSS (inherits all student theme variables cleanly)
  // ---------------------------------------------------------------------------
  var EXTRA_CSS = [
    '.sw-prompt{font-size:1.15rem;font-weight:700;margin:0 0 8px;line-height:1.35}',
    '.sw-sub{margin:0 0 12px;font-size:.95rem}',
    '.sw-h3{margin:0 0 8px;font-size:1.02rem;line-height:1.3}',
    '.sw-label{margin:10px 0 6px;font-weight:700;font-size:.94rem;display:block}',
    '.sw-tools-row{margin:0 0 10px}',
    '.sw-actions{margin-top:16px}',
    '.sw-btn-sm{min-height:44px;min-width:44px;padding:6px 12px;font-size:.9rem;border-radius:10px}',
    '.sw-hint{margin:6px 0 12px;padding:10px 14px;border-radius:12px;border:1px solid var(--accent);background:var(--soft)}',
    '.sw-select-note{margin:8px 0;padding:8px 12px;border-radius:10px;background:var(--soft);border:1px solid var(--accent);font-weight:700;font-size:.94rem}',
    '.sw-badge{display:inline-block;align-self:flex-start;width:fit-content;margin-inline-start:8px;padding:2px 8px;border-radius:999px;font-size:.82rem;font-weight:700;border:1px solid var(--line)}.cs-card>.sw-badge{margin-inline-start:0}',
    '.sw-badge.is-right{background:var(--ok-bg);color:var(--ok);border-color:var(--ok)}',
    '.sw-badge.is-wrong{background:var(--warn-bg);color:var(--warn);border-color:var(--warn)}',
    '.sw-reveal{margin-top:14px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--soft)}',
    '.sw-reveal-list{margin:6px 0 0;padding-inline-start:1.35rem}',
    '.sw-reveal-list li{margin:4px 0}',
    '.sw-chip{min-height:44px;padding:6px 12px;border-radius:999px;font-size:.94rem;background:var(--card);border:1.5px solid var(--accent)}',
    // Concept Sort
    '.cs-tray{margin:10px 0 14px;padding:12px 14px;border:1px dashed var(--line);border-radius:14px;background:var(--bg)}',
    '.cs-card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}',
    '.cs-bins{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:12px 0}',
    '.cs-bin{padding:12px;border:2px solid var(--line);border-radius:14px;background:var(--card);display:flex;flex-direction:column;gap:8px}',
    '.cs-bin.is-ready{border-style:dashed;border-color:var(--accent)}',
    '.cs-bin.is-over{background:var(--soft);border-color:var(--accent)}',
    '.cs-bin-head{display:flex;align-items:flex-start;gap:8px}',
    '.cs-bin-desc{margin:2px 0 0;font-size:.88rem}',
    '.cs-bin-cards{display:flex;flex-direction:column;gap:8px}',
    '.cs-bin-cards:empty::after{content:"Drop or choose cards here";color:var(--muted);font-size:.85rem;padding:10px 8px;border:1.5px dashed var(--line);border-radius:10px;text-align:center}',
    '.cs-card{padding:8px;border:2px solid var(--line);border-radius:12px;background:var(--card);display:flex;flex-direction:column;gap:6px}',
    '.cs-card.is-selected{border-color:var(--accent);background:var(--soft)}',
    '.cs-card.is-right{border-color:var(--ok);background:var(--ok-bg)}',
    '.cs-card.is-wrong{border-color:var(--warn);background:var(--warn-bg)}',
    '.cs-card-pick{display:flex;align-items:center;gap:8px;width:100%;text-align:start;background:transparent;border:0;padding:4px;min-height:44px;font-weight:700}',
    '.cs-card-body{display:flex;flex-direction:column;gap:2px}',
    '.cs-card-detail{font-weight:400;font-size:.86rem;color:var(--muted)}',
    '.cs-icon{font-size:1.35rem;line-height:1}',
    '.cs-icon-img{width:28px;height:28px;flex:none;display:block}',
    '.cs-card-controls{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.cs-select,.sq-slot{font:inherit;font-size:.9rem;min-height:44px;padding:4px 8px;border-radius:8px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink)}',
    // Sequence Order
    '.sq-list{list-style:none;margin:12px 0;padding:0;display:flex;flex-direction:column;gap:10px}',
    '.sq-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 12px;border:2px solid var(--line);border-radius:14px;background:var(--card)}',
    '.sq-row.is-selected{border-color:var(--accent);background:var(--soft)}',
    '.sq-row.is-right{border-color:var(--ok);background:var(--ok-bg)}',
    '.sq-row.is-wrong{border-color:var(--warn);background:var(--warn-bg)}',
    '.sq-num{flex:none;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--soft);border:1.5px solid var(--accent);font-weight:700;font-size:.95rem}',
    '.sq-body{flex:1 1 220px;display:flex;flex-direction:column;gap:2px}',
    '.sq-label{font-size:1rem}',
    '.sq-controls{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.sq-place-target{border-style:dashed;background:var(--soft)}',
    // Tiered Writing & Cloze
    '.tw-passage{margin:0 0 14px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--bg)}',
    '.tw-passage-body{margin:0;white-space:pre-line}',
    '.tw-levels{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}',
    '.tw-level-btn{min-height:44px;padding:8px 12px;font-size:.92rem;text-align:start;background:var(--card)}',
    '.tw-level-btn[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '.tw-level-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.tw-bank,.tw-starters{margin:8px 0 12px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg)}',
    '.tw-chips{gap:8px}',
    '.tw-frame-line{margin:10px 0;line-height:2.25}',
    '.tw-blank{display:inline-block;width:clamp(120px,18ch,240px);max-width:calc(100% - 8px);min-height:44px;vertical-align:baseline;font:inherit;padding:4px 10px;margin:2px 4px;border:0;border-bottom:2.5px solid var(--accent);border-radius:8px 8px 0 0;background:var(--soft);color:var(--ink)}',
    '.tw-preview{margin:4px 0 10px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg)}',
    '.tw-editor{width:100%;min-height:140px;font:inherit;padding:10px 12px;border-radius:12px;border:2px solid var(--line);background:var(--bg);color:var(--ink);resize:vertical}',
    '.tw-checklist{margin:12px 0 0;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg)}',
    '.tw-checklist legend{font-weight:700;padding:0 6px}',
    '.tw-check-row{display:flex;align-items:center;min-height:44px;gap:10px;margin:4px 0;cursor:pointer}',
    '.tw-check-row input[type=checkbox]{width:22px;height:22px;min-width:22px;min-height:22px;margin:0;flex:none;accent-color:var(--accent)}',
    '.tw-count{margin:10px 0 4px;font-weight:700;font-size:.95rem;color:var(--muted)}',
    '.tw-print-sheet{display:none}',
    '.cz-list{margin:10px 0;padding-inline-start:1.4rem;display:flex;flex-direction:column;gap:10px}',
    '.cz-q{line-height:2}',
    // Choice Board
    '.cb-goal{margin:0 0 14px;padding:12px 14px;border-radius:14px;border:2px solid var(--accent);background:var(--soft)}',
    '.cb-goal-kicker{margin:0 0 2px;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)}',
    '.cb-goal-text{margin:0;font-weight:700;font-size:1.05rem}',
    '.cb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:10px}',
    '.cb-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:14px;border-radius:16px;border:2px solid var(--accent);background:var(--card);color:var(--ink);text-align:start}',
    '.cb-badge{font-size:.78rem;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--soft);color:var(--accent);border:1px solid var(--accent)}',
    '.cb-card-title{font-size:1.05rem;line-height:1.25}',
    '.cb-card-summary{font-size:.9rem;font-weight:400;color:var(--muted)}',
    '.cb-active-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px;padding:8px 12px;border-radius:12px;background:var(--soft);border:1px solid var(--line)}',
    '.cb-active-title{margin:0;font-weight:700;font-size:.94rem}',
    '@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}',
    '@media (forced-colors:active){.cs-card.is-selected,.sq-row.is-selected,.cb-card{border:2px solid Highlight}.tw-level-btn[aria-pressed=true]{forced-color-adjust:none;border:2px solid Highlight;background:Highlight;color:HighlightText}}',
    '@media print{body{background:#fff;color:#000}.card{border:1px solid #000;box-shadow:none}.sw-actions,.sw-tools-row,.tw-levels,.tw-panel,.tw-count,.cb-picker,.cb-active-bar,[data-next],[data-tools-open],[data-feedback]{display:none!important}.tw-print-sheet{display:block!important;margin:12px 0;padding:12px;border:1px solid #000}.tw-print-body{margin-top:10px;white-space:pre-wrap;line-height:1.6}}',
  ].join('\n');

  var ADAPTERS = {
    concept_sort: {
      title: 'Concept Sort',
      labels: CONCEPT_SORT_LABELS,
      render: renderConceptSort,
      prepare: prepareConceptSortCheck,
      score: scoreConceptSort,
    },
    sequence_order: {
      title: 'Sequence Order',
      labels: SEQUENCE_ORDER_LABELS,
      render: renderSequenceOrder,
      prepare: prepareSequenceOrderCheck,
      score: scoreSequenceOrder,
    },
    tiered_writing: {
      title: 'Tiered Writing',
      labels: TIERED_WRITING_LABELS,
      render: renderTieredWriting,
      prepare: prepareTieredWritingCheck,
      score: scoreTieredWriting,
    },
    choice_board: {
      title: 'Choice Board',
      labels: CHOICE_BOARD_LABELS,
      render: renderChoiceBoard,
      prepare: prepareChoiceBoardCheck,
      score: scoreChoiceBoard,
    },
  };

  var api = {
    ACTIVITY_IDS: ACTIVITY_IDS,
    CHOICE_PATHWAY_KINDS: CHOICE_PATHWAY_KINDS,
    ADAPTERS: ADAPTERS,
    EXTRA_CSS: EXTRA_CSS,
    normalizeConceptSortItem: normalizeConceptSortItem,
    normalizeSequenceOrderItem: normalizeSequenceOrderItem,
    normalizeTieredWritingItem: normalizeTieredWritingItem,
    normalizeClozeShortPathway: normalizeClozeShortPathway,
    normalizeChoiceBoardItem: normalizeChoiceBoardItem,
    isSafeSvgDataUri: isSafeSvgDataUri,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketSortWriteAdapters = api;
})(typeof window !== 'undefined' ? window : globalThis);
