// The vocabulary maker (packets-vocab.html): type the words, check the questions, make one file.
// Everything happens in this tab. The page loads its own scripts and the word list (packets_vocab_bank_en.js and its
// data files, all from this site, the same files whatever words are typed); its rule (connect-src 'self') makes the
// browser refuse anything else. The page runs without AI, and there is no account and no cookie. What it keeps on the
// device is listed under "About this page": the last choices (STORE_KEY) and the teacher's changes to the questions
// (EDITS_KEY), both in this browser's local storage. The teacher code is never kept.
// The questions, their wrong answers and the checks on them come from packet_vocab_builder.js; this page shows them,
// keeps the teacher's changes and passes everything on.
// 2026-11-12: recordings made ahead of time for the words (the Word Sounds word store) and pictures (the Word Sounds
// picture set), both from this site through packets_vocab_media.js; and meanings found online on a page of their own
// (packets-vocab-lookup.html, the only Packets vocabulary page that may reach another site), read back from EDITS_KEY.
(function () {
  'use strict';

  var LOOKUP_PAGE = 'packets-vocab-lookup.html';
  var STORE_KEY = 'alloflow-packets-vocab/1';
  var EDITS_KEY = 'alloflow-packets-vocab-edits/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_TYPED = 2400;
  var MAX_STUDENTS = 40;
  var MAX_KEPT = 2000;     // words whose changes are kept; the oldest go first

  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  var add = function (parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; };
  var setText = function (id, text) { var node = $(id); if (node) node.textContent = text; };
  var show = function (id, on) { var node = $(id); if (node) node.hidden = !on; };
  var isObject = function (value) { return !!value && typeof value === 'object' && !Array.isArray(value); };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  var listed = function (names) { return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(''); };
  var capital = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };
  var fileSize = function (bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1000)) + ' KB'; };
  var productName = function () { var node = $('product-name'); return node ? String(node.textContent || '').trim() : ''; };
  var said = function (error) { return String((error && error.message) || error || ''); };
  var button = function (text, className, onClick, label) {
    var b = el('button', 'btn ' + (className || 'btn-small'), text);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  };

  var loader, builder, bank = null, bankState = 'loading';
  var state = null, edits = null, rows = [], step = 1;
  var editing = null;      // the one text box open on the check screens: { key, what: 'def' | 'example' | 'wrong', i }
  var focusAfter = '';     // a selector to focus once the rows are drawn again
  var openMenus = {};      // the words whose Change meaning menu is open, kept open when the rows are drawn again
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '', batchFile = null;
  var wordsTimer = 0;
  // Recordings and pictures (packets_vocab_media.js, word_sounds_symbols_en.js, word_sounds_packet_builder.js).
  var media = null, symbols = null, art = null, pictureState = 'idle', heard = null;

  function defaults() { return { words: '', types: ['meaning', 'word'], mode: 'practice', title: '', readAloud: true, voices: true, codeName: '' }; }

  // ---------------------------------------------------------------------------
  // What this page keeps, in this browser only
  // ---------------------------------------------------------------------------
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, words: state.words, types: state.types, mode: state.mode, title: state.title, readAloud: state.readAloud, voices: state.voices }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
    if (!isObject(saved) || saved.v !== 1) return fresh;
    if (typeof saved.words === 'string') fresh.words = saved.words.slice(0, MAX_TYPED);
    if (Array.isArray(saved.types)) fresh.types = builder.TYPES.map(function (t) { return t.id; }).filter(function (id) { return saved.types.indexOf(id) >= 0; });
    if (saved.mode === 'practice' || saved.mode === 'check') fresh.mode = saved.mode;
    if (typeof saved.title === 'string') fresh.title = saved.title.slice(0, 80);
    if (typeof saved.readAloud === 'boolean') fresh.readAloud = saved.readAloud;
    if (typeof saved.voices === 'boolean') fresh.voices = saved.voices;
    return fresh;
  }
  function freshEdits() { return { v: 1, words: {}, senses: {} }; }
  function recallEdits() {
    var saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(EDITS_KEY) || 'null'); } catch (_) { saved = null; }
    if (!isObject(saved) || saved.v !== 1) return freshEdits();
    return { v: 1, words: isObject(saved.words) ? saved.words : {}, senses: isObject(saved.senses) ? saved.senses : {} };
  }
  function keepEdits() {
    var keys = Object.keys(edits.words);
    if (keys.length > MAX_KEPT) keys.sort(function (a, b) { return (edits.words[a].at || 0) - (edits.words[b].at || 0); }).slice(0, keys.length - MAX_KEPT).forEach(function (k) { delete edits.words[k]; });
    try { window.localStorage.setItem(EDITS_KEY, JSON.stringify(edits)); } catch (_) { /* kept for this visit only */ }
  }
  function wordEdit(key) {
    if (!isObject(edits.words[key])) edits.words[key] = {};
    edits.words[key].at = Date.now();
    return edits.words[key];
  }
  function senseEdit(id) { if (!isObject(edits.senses[id])) edits.senses[id] = {}; return edits.senses[id]; }

  // ---------------------------------------------------------------------------
  // The rows: one for each word, made again after every change
  // ---------------------------------------------------------------------------
  function listNow() { return builder.parseWords(state.words); }
  function redraft() { rows = builder.draftRows({ words: listNow().words, bank: bankState === 'ready' ? bank : null, edits: edits, pictures: symbols }); }
  function rowOf(key) { return rows.filter(function (r) { return r.key === key; })[0] || null; }
  function changed() {
    keepEdits();
    redraft();
    clearBuilt();
    if (step === 2) drawRows();
    if (step === 3) { drawBlankRows(); drawPictureRows(); makeSoon(250); }
  }

  // ---------------------------------------------------------------------------
  // Step 1: the words
  // ---------------------------------------------------------------------------
  function drawWords() {
    clearTimeout(wordsTimer);
    var list = listNow(), host = $('words-list');
    redraft();
    host.textContent = '';
    rows.forEach(function (row) {
      var item = el('li', row.inBank ? 'is-ok' : '');
      item.appendChild(el('span', 'w', row.word));
      var line = bankState === 'loading' ? 'Looking it up.' : row.inBank
        ? (row.senses.length === 1 ? 'Found: 1 meaning.' : 'Found: ' + row.senses.length + ' meanings. The usual school meaning is used first.')
        : row.def ? 'Not in the word list. You typed a meaning for it.' : 'Not in the word list. You can type what it means in step 2.';
      item.appendChild(el('span', 's', line));
      host.appendChild(item);
    });
    list.unusable.forEach(function (text) {
      var item = el('li', 'is-out');
      item.appendChild(el('span', 'w', text));
      item.appendChild(el('span', 's', 'Not used: a word needs letters, and at most 40 characters.'));
      host.appendChild(item);
    });
    var found = rows.filter(function (r) { return r.inBank; }).length;
    var parts = [];
    if (!rows.length) parts.push('Type or paste your words above.');
    else parts.push(bankState === 'loading' ? count(rows.length, 'word') + '.' : found + ' of ' + count(rows.length, 'word') + ' found in the word list.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.over) parts.push('Not used: ' + count(list.over, 'more word') + '. A file holds ' + builder.MAX_WORDS + ' words at most.');
    setText('words-line', parts.join(' '));
  }
  function stopAtStep1() {
    if (!rows.length) return 'Type at least one word to go on.';
    if (bankState === 'loading') return 'The word list is still loading. Wait a moment, then press Next again.';
    if (rows.length < 4) return 'A question has 4 answers to choose from, so the list needs at least 4 words. Add ' + (4 - rows.length) + ' more.';
    return '';
  }

  // ---------------------------------------------------------------------------
  // Step 2: check the questions
  // ---------------------------------------------------------------------------
  function editBox(row, what, i, values, labels, onSave) {
    var box = el('div', 'v-edit');
    var fields = values.map(function (value, k) {
      var id = 'edit-' + row.key.replace(/[^a-z0-9]+/gi, '-') + '-' + what + '-' + i + '-' + k;
      var label = el('label', '', labels[k]);
      label.htmlFor = id;
      var field = el(k === values.length - 1 ? 'textarea' : 'input', '');
      if (field.tagName === 'INPUT') field.type = 'text';
      field.id = id;
      field.value = value || '';
      field.maxLength = k === values.length - 1 ? 300 : 60;
      add(box, label, field);
      return field;
    });
    var row2 = el('div', 'row');
    add(row2, button('Save', 'btn-small btn-primary', function () { onSave(fields.map(function (f) { return f.value; })); }),
      button('Cancel', 'btn-small', function () { editing = null; focusAfter = '[data-edit="' + row.key + '|' + what + '|' + i + '"]'; drawRowsHere(); }));
    box.appendChild(row2);
    focusAfter = focusAfter || '#' + fields[0].id;
    return box;
  }
  function isEditing(row, what, i) { return !!editing && editing.key === row.key && editing.what === what && editing.i === i; }
  function openEdit(row, what, i) { editing = { key: row.key, what: what, i: i }; focusAfter = ''; drawRowsHere(); }
  function drawRowsHere() { if (step === 2) drawRows(); else if (step === 3) drawBlankRows(); }
  function editButton(row, what, i, label) {
    var b = button('Edit', 'btn-small', function () { openEdit(row, what, i); }, label);
    b.setAttribute('data-edit', row.key + '|' + what + '|' + i);
    return b;
  }
  function saveRight(row, value) {
    var text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (row.own) { var w = wordEdit(row.key); if (text) w.def = text; else delete w.def; }
    else if (text && text !== String(row.sense.def || '').trim()) senseEdit(row.senseId).def = text;
    else if (edits.senses[row.senseId]) delete edits.senses[row.senseId].def;
    editing = null;
    focusAfter = '[data-edit="' + row.key + '|def|0"]';
    changed(row.key);
  }
  function saveExample(row, value) {
    var text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (row.own) { var w = wordEdit(row.key); if (text) w.example = text; else delete w.example; }
    else if (text !== String(row.sense.example || '').trim()) senseEdit(row.senseId).example = text;
    else if (edits.senses[row.senseId]) delete edits.senses[row.senseId].example;
    editing = null;
    focusAfter = '[data-edit="' + row.key + '|example|0"]';
    changed(row.key);
  }
  function setWrong(row, list) {
    var w = wordEdit(row.key);
    w.wrong = list.map(function (c) { return { id: c.id || '', word: c.word, def: c.def, from: c.from || 'bank' }; });
    w.wrongFor = row.senseId;
  }
  function drawRow(row) {
    var box = el('div', 'v-row');
    box.setAttribute('data-row', row.key);
    var head = el('div', 'v-head');
    add(head, el('h3', '', row.word), row.pos ? el('span', 'v-pos', row.pos) : null,
      row.own ? el('span', 'v-mark v-mark-not', row.net ? (row.net.changed ? 'from the internet, changed by you' : 'from the internet, not checked') : 'not in the word list') : row.checked ? el('span', 'v-mark', 'checked') : el('span', 'v-mark v-mark-not', 'not checked yet'),
      row.edited && !row.own ? el('span', 'v-pos', 'you changed it') : null);
    box.appendChild(head);
    // "cats" is looked up as "cat": the meaning is for that word, and the student sees the word as typed. 2026-11-13.
    // 2026-11-13: in Meaning to word the wrong words are written the same way ("dogs"), or, when they cannot all be, the
    // question asks for the word the meaning is for (builder.wordQuestion).
    if (row.base) {
      var asked = row.wordAsk || {};
      box.appendChild(el('p', 'v-out', 'The meaning is for ' + row.base + '. Students see ' + row.word + ' as you typed it'
        + (asked.base ? ', except in Meaning to word: there the answer is ' + asked.answer + ', because its wrong words cannot all be written like ' + row.word : '')
        + '. To ask about ' + row.base + ', type ' + row.base + ' in step 1.'
        + (asked.form && asked.wrong && asked.wrong.length ? ' In Meaning to word the wrong words are written the same way: ' + listed(asked.wrong) + '.' : '')));
    }
    // The right answer.
    var right = el('div', 'v-line v-right');
    if (isEditing(row, 'def', 0) || (row.own && !row.def)) {
      if (row.own && !row.def) box.appendChild(el('p', 'v-out', 'This word is not in the word list. Type what it means, in words a student knows.'));
      right.appendChild(editBox(row, 'def', 0, [row.def], ['What ' + row.word + ' means'], function (v) { saveRight(row, v[0]); }));
    } else {
      var p = el('p', 'v-text');
      add(p, el('span', 'v-tag', 'Right answer '), doc.createElement('br'), doc.createTextNode(row.def));
      add(right, p, add(el('div', 'v-tools'), editButton(row, 'def', 0, 'Edit the right answer for ' + row.word)));
    }
    box.appendChild(right);
    // A word the word list does not have: its meaning can be looked up online, on a page of its own (the only one that may).
    if (row.own) {
      // "again" only after a lookup: a meaning the teacher typed was not looked up (2026-11-13, teacher-journey pass).
      var look = el('a', 'btn btn-small', row.net ? 'Look it up online again' : 'Look it up online');
      look.href = LOOKUP_PAGE + '#word=' + encodeURIComponent(row.word);
      look.setAttribute('data-lookup', row.key);
      box.appendChild(add(el('p', 'v-own'), look, el('span', 'hint', ' Opens a page that sends only this word to a free online dictionary, after you allow it.')));
    }
    // The word's other meanings: the school meaning first. The teacher never has to choose one.
    if (row.senses.length > 1) {
      var more = el('details', 'v-meanings');
      if (openMenus[row.key] || (editing && editing.key === row.key && editing.what === 'sense')) more.open = true;
      more.addEventListener('toggle', function () { if (more.open) openMenus[row.key] = true; else delete openMenus[row.key]; });
      more.appendChild(el('summary', '', 'Change meaning (' + row.senses.length + ' meanings)'));
      var group = el('div', 'radios radios-stack');
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', 'Meaning of ' + row.word);
      row.senses.forEach(function (s, k) {
        var label = el('label', 'radio'), radio = el('input');
        radio.type = 'radio';
        radio.name = 'sense-' + row.key;
        radio.value = s.id;
        radio.checked = s.id === row.senseId;
        radio.addEventListener('change', function () {
          if (!radio.checked) return;
          wordEdit(row.key).sense = s.id;
          editing = { key: row.key, what: 'sense', i: 0 };
          focusAfter = 'input[name="sense-' + row.key + '"][value="' + s.id.replace(/"/g, '') + '"]';
          changed(row.key);
        });
        var words = el('span', '');
        words.appendChild(doc.createTextNode((s.pos ? s.pos + ': ' : '') + s.def));
        if (k === 0) words.appendChild(el('span', 'radio-sub', 'The usual school meaning.' + (s.checked ? ' Checked.' : '')));
        else if (s.checked) words.appendChild(el('span', 'radio-sub', 'Checked.'));
        add(label, radio, words);
        label.classList.toggle('is-on', radio.checked);
        group.appendChild(label);
      });
      more.appendChild(group);
      box.appendChild(more);
    }
    // The 3 wrong answers.
    if (row.def) {
      var list = el('ul', 'v-wrong');
      list.setAttribute('aria-label', 'Wrong answers for ' + row.word);
      row.wrong.forEach(function (c, i) {
        var item = el('li', 'v-line');
        if (isEditing(row, 'wrong', i)) {
          item.appendChild(editBox(row, 'wrong', i, [c.word, c.def], ['Wrong answer ' + (i + 1) + ': the word', 'Its meaning'], function (v) {
            var next = row.wrong.slice();
            var word = String(v[0] || '').replace(/\s+/g, ' ').trim().slice(0, 60), def = String(v[1] || '').replace(/\s+/g, ' ').trim().slice(0, 300);
            if (!word || !def) { focusAfter = ''; return; }
            next[i] = { id: '', word: word, def: def, from: 'teacher' };
            setWrong(row, next);
            editing = null;
            focusAfter = '[data-edit="' + row.key + '|wrong|' + i + '"]';
            changed(row.key);
          }));
        } else {
          var text = el('p', 'v-text');
          add(text, el('span', 'v-word', c.word), doc.createTextNode(c.def));
          var tools = el('div', 'v-tools');
          var swap = button('Swap', 'btn-small', function () {
            var next = builder.swap(row, i);
            if (!next) return;
            var list2 = row.wrong.slice(); list2[i] = next;
            setWrong(row, list2);
            focusAfter = '[data-swap="' + row.key + '|' + i + '"]';
            changed(row.key);
          }, 'Swap wrong answer ' + (i + 1) + ' for ' + row.word);
          swap.setAttribute('data-swap', row.key + '|' + i);
          if (row.pool.length <= row.wrong.length) swap.disabled = true;
          add(tools, swap, editButton(row, 'wrong', i, 'Edit wrong answer ' + (i + 1) + ' for ' + row.word));
          add(item, text, tools);
        }
        if (row.problems[i]) item.appendChild(el('p', 'v-warn', row.problems[i]));
        list.appendChild(item);
      });
      box.appendChild(list);
      if (row.wrong.length < builder.WRONG) box.appendChild(el('p', 'v-warn', 'There are not enough wrong answers for this word. Add more words to your list: their meanings can be used.'));
    }
    var mine = edits.words[row.key], theirs = row.senseId && edits.senses[row.senseId];
    if ((mine && (mine.sense || mine.wrong || mine.def || mine.example || mine.blank)) || (theirs && (theirs.def || theirs.example != null))) {
      var undo = button('Undo my changes to ' + row.word, 'btn-small btn-text', function () {
        delete edits.words[row.key];
        if (row.senseId) delete edits.senses[row.senseId];
        focusAfter = '[data-row="' + row.key + '"] h3';
        changed(row.key);
      });
      box.appendChild(add(el('p', ''), undo));
    }
    return box;
  }
  function drawRows() {
    var host = $('rows');
    host.textContent = '';
    rows.forEach(function (row) { host.appendChild(drawRow(row)); });
    var notYet = rows.filter(function (r) { return !r.own && !r.checked; }).length;
    var look = rows.filter(function (r) { return r.problems.some(Boolean) || !r.def || r.wrong.length < builder.WRONG; }).length;
    var parts = [capital(count(rows.length, 'word')) + '.'];
    if (notYet) parts.push(notYet + ' not checked yet.');
    if (look) parts.push(count(look, 'word needs', 'words need') + ' a look.');
    setText('rows-line', parts.join(' '));
    settleFocus();
  }
  function settleFocus() {
    if (!focusAfter) return;
    var target = null;
    try { target = doc.querySelector(focusAfter); } catch (_) { target = null; }
    focusAfter = '';
    if (target) { if (target.tagName === 'H3') target.tabIndex = -1; target.focus(); }
  }

  // ---------------------------------------------------------------------------
  // Step 3: what goes in the file, and the file
  // ---------------------------------------------------------------------------
  // Picture questions are offered when at least builder.MIN_PICTURES list words have a picture: with fewer, the
  // pictures to choose from would mostly be words the student has not met in this list.
  function picturesOffered() { return !!symbols && typeof builder.pictureCount === 'function' && builder.pictureCount(rows).offered; }
  function typesNow() { return state.types.filter(function (id) { var t = builder.TYPES.filter(function (x) { return x.id === id; })[0]; return !!t && (!t.pictures || picturesOffered()); }); }
  function drawTypes() {
    var host = $('types');
    host.textContent = '';
    var pics = symbols && typeof builder.pictureCount === 'function' ? builder.pictureCount(rows) : null;
    builder.TYPES.forEach(function (t) {
      if (t.pictures && !pics) return;
      var label = el('label', 'choice'), box = el('input');
      box.type = 'checkbox';
      box.value = t.id;
      box.checked = state.types.indexOf(t.id) >= 0;
      box.setAttribute('data-type', t.id);
      var closed = !!t.pictures && !pics.offered;
      if (closed) { box.disabled = true; box.checked = false; label.classList.add('is-off'); }
      box.addEventListener('change', function () {
        state.types = builder.TYPES.map(function (x) { return x.id; }).filter(function (id) { return id === t.id ? box.checked : state.types.indexOf(id) >= 0; });
        remember();
        label.classList.toggle('is-on', box.checked);
        drawBlankRows();
        drawPictureRows();
        makeSoon(30);
      });
      var usable = rows.filter(function (r) { return !builder.rowStop(r, t.id); }).length;
      var note = t.id === 'blank' ? usable + ' of ' + count(rows.length, 'word') + ' have a sentence that works.'
        : !t.pictures ? usable + ' of ' + count(rows.length, 'word') + ' can be asked this way.'
        // 2026-11-13 (teacher-journey pass): "None of the 12 words" rather than "Only 0 of 12 words"; "1 word has".
        : closed ? (pics.withPicture ? 'Only ' + pics.withPicture + ' of ' + count(rows.length, 'word') + ' have a picture.' : 'None of the ' + rows.length + ' words has a picture.') + ' Picture questions need at least ' + pics.need + ', so that the other pictures are mostly words from your list.'
        : usable + ' of ' + count(rows.length, 'word') + ' can be asked this way. ' + capital(count(pics.withPicture, 'word')) + (pics.withPicture === 1 ? ' has' : ' have') + ' a picture.';
      add(label, box, el('span', 'choice-name', t.name), el('span', 'choice-line', t.line + (t.on ? '' : ' Off unless you choose it.')), el('span', 'choice-note', note));
      label.classList.toggle('is-on', box.checked);
      host.appendChild(label);
    });
  }
  // The picture questions, to look at before the file is made: each word with its picture and the 3 others, and a box to
  // leave a word out (a picture can show another meaning of the word: a bat for baseball, not the animal).
  function drawPictureRows() {
    var on = typesNow().some(function (id) { return id === 'picture' || id === 'picword'; });
    show('picture-panel', on);
    var host = $('picture-rows');
    if (!host) return;
    host.textContent = '';
    if (!on) return;
    if (pictureState !== 'ready') {
      setText('picture-line', pictureState === 'failed' ? 'The pictures could not be downloaded. Check the connection, then load the page again.'
        : 'Getting the pictures' + (symbols.bytes > 0 ? ', about ' + fileSize(symbols.bytes) : '') + '. They come from this site, the same files whatever words you type.');
      getPictures();
      return;
    }
    setText('picture-line', '');
    var thumb = function (word, main) {
      var got = null;
      try { got = symbols.get(word); } catch (_) { got = null; }
      var fig = el('figure', main ? 'v-pic v-pic-main' : 'v-pic');
      if (got && typeof got.svg === 'string' && !(art && art.svgRefusal(got.svg))) {
        var img = el('img');
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(got.svg)));
        img.alt = '';
        img.width = 64; img.height = 64;
        fig.appendChild(img);
      }
      fig.appendChild(el('figcaption', '', word));
      return fig;
    };
    rows.forEach(function (row) {
      if (!row.picture && !row.pictureOff) return;
      var box = el('div', 'v-row');
      box.setAttribute('data-picture-row', row.key);
      box.appendChild(add(el('div', 'v-head'), el('h3', '', row.word)));
      if (row.picture) {
        var strip = el('div', 'v-pics');
        strip.appendChild(thumb(row.word, true));
        row.pictureWrong.forEach(function (c) { strip.appendChild(thumb(c.word, false)); });
        box.appendChild(strip);
        var why = builder.rowStop(row, 'picture');
        if (why) box.appendChild(el('p', 'v-out', 'Left out: ' + why.charAt(0).toLowerCase() + why.slice(1)));
      }
      var leave = el('label', 'radio'), omit = el('input');
      omit.type = 'checkbox';
      omit.checked = row.pictureOff;
      omit.setAttribute('data-no-picture', row.key);
      omit.addEventListener('change', function () {
        var w = wordEdit(row.key);
        if (omit.checked) w.noPicture = true; else delete w.noPicture;
        focusAfter = '[data-no-picture="' + row.key + '"]';
        changed(row.key);
      });
      add(leave, omit, el('span', '', 'Leave ' + row.word + ' out of the picture questions'));
      box.appendChild(leave);
      host.appendChild(box);
    });
    var none = rows.filter(function (r) { return !r.picture && !r.pictureOff; }).map(function (r) { return r.word; });
    if (none.length) host.appendChild(el('p', 'v-out', 'No picture in the picture set: ' + none.join(', ') + '.'));
    settleFocus();
  }
  function getPictures() {
    if (!media || !symbols || pictureState === 'loading' || pictureState === 'ready') return;
    pictureState = 'loading';
    media.pictures(symbols).then(function (ok) {
      pictureState = ok ? 'ready' : 'failed';
      if (step === 3) { drawPictureRows(); makeSoon(30); }
    }, function () {
      pictureState = 'failed';
      if (step === 3) { drawPictureRows(); makeSoon(30); }
    });
  }
  function drawBlankRows() {
    var on = state.types.indexOf('blank') >= 0;
    show('blank-panel', on);
    var host = $('blank-rows');
    host.textContent = '';
    if (!on) return;
    rows.forEach(function (row) {
      var box = el('div', 'v-row');
      box.setAttribute('data-blank-row', row.key);
      box.appendChild(add(el('div', 'v-head'), el('h3', '', row.word)));
      var line = el('div', 'v-line');
      if (isEditing(row, 'example', 0)) {
        line.appendChild(editBox(row, 'example', 0, [row.example], ['A sentence with the word ' + row.word + ' in it'], function (v) { saveExample(row, v[0]); }));
      } else {
        add(line, el('p', 'v-text', row.blank.ask || row.example || 'No sentence.'), add(el('div', 'v-tools'), editButton(row, 'example', 0, 'Edit the sentence for ' + row.word)));
      }
      box.appendChild(line);
      // The sentence has another form of the word ("predators"): that form is the answer, and the wrong words are written the same way. 2026-11-13.
      if (row.blank.ask && row.blank.answer && builder.keyOf(row.blank.answer) !== row.key) box.appendChild(el('p', 'v-out', 'The sentence has ' + row.blank.answer + ', so the answer is ' + row.blank.answer + (row.blank.why ? '.' : ', and the wrong words are written the same way.')));
      if (!row.def) box.appendChild(el('p', 'v-out', 'Left out: it has no meaning yet (step 2).'));
      else if (row.blank.why) box.appendChild(el('p', 'v-out', 'Left out: ' + row.blank.why.charAt(0).toLowerCase() + row.blank.why.slice(1)));
      else {
        var list = el('ul', 'v-wrong');
        list.setAttribute('aria-label', 'Wrong answers in the sentence for ' + row.word);
        row.blank.wrong.forEach(function (w, i) {
          var item = el('li', 'v-line');
          var swap = button('Swap', 'btn-small', function () {
            var next = builder.swap(row, i, 'blank');
            if (!next) return;
            var words = row.blank.wrong.slice(); words[i] = next;
            var e = wordEdit(row.key);
            e.blank = words; e.blankFor = row.senseId + '|' + row.blank.ask;
            focusAfter = '[data-blank-swap="' + row.key + '|' + i + '"]';
            changed(row.key);
          }, 'Swap wrong word ' + (i + 1) + ' for ' + row.word);
          swap.setAttribute('data-blank-swap', row.key + '|' + i);
          if (row.blank.pool.length <= builder.WRONG) swap.disabled = true;
          add(item, add(el('p', 'v-text'), el('span', 'v-word', w)), add(el('div', 'v-tools'), swap));
          if (row.blank.problems[i]) item.appendChild(el('p', 'v-warn', row.blank.problems[i]));
          list.appendChild(item);
        });
        box.appendChild(list);
      }
      host.appendChild(box);
    });
    settleFocus();
  }
  function syncMode() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="mode"]'), function (radio) {
      radio.checked = radio.value === state.mode;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
    show('code-panel', state.mode === 'check');
  }
  function drawStep3() {
    drawTypes();
    drawBlankRows();
    drawPictureRows();
    syncMode();
    if ($('f-title').value !== state.title) $('f-title').value = state.title;
    $('f-read').checked = state.readAloud;
    if ($('f-voices')) { $('f-voices').checked = state.voices; $('f-voices').disabled = !state.readAloud; }
  }
  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    dropBatch();
    show('summary', false);
    show('try', false);
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
  function codeNow() { return String($('f-code').value || '').trim(); }
  function buildWith(learner, types, clips) {
    var lesson = builder.lessonFromVocab({ loader: loader, rows: rows, types: types, mode: state.mode, title: state.title, readAloud: state.readAloud,
      voices: state.voices, clips: clips || null, pictures: pictureState === 'ready' ? symbols : null, art: art });
    return builder.buildVocabPacket({ lesson: lesson, loader: loader, rows: rows, bank: bankState === 'ready' ? bank : null, teacherCode: state.mode === 'check' ? codeNow() : '', learner: learner || '', voices: state.voices });
  }
  function isPictureType(id) { return id === 'picture' || id === 'picword'; }
  function make() {
    clearTimeout(buildTimer);
    clearBuilt();
    var run = buildRun, types = typesNow(), notes = [];
    if (!types.length) { problem('Choose at least one kind of question.'); return; }
    var code = codeNow();
    if (state.mode === 'check' && code && code.length < 4) { show('making', false); setText('code-line', 'The teacher code needs 4 or more characters. Leave it empty for no code.'); return; }
    setText('code-line', '');
    // Picture questions wait for the pictures (getPictures makes the file again when they are here).
    if (types.some(isPictureType)) {
      if (pictureState !== 'ready' && pictureState !== 'failed') { making('Getting the pictures.'); getPictures(); return; }
      if (pictureState === 'failed') { types = types.filter(function (id) { return !isPictureType(id); }); notes.push('The pictures could not be downloaded, so the file has no picture questions.'); }
      if (!types.length) { problem('The pictures could not be downloaded. Choose another kind of question, or load the page again.'); return; }
    }
    var go = function (clips) {
      if (run !== buildRun) return;
      var result;
      try { result = buildWith(state.codeName, types, clips); } catch (error) {
        problem('The file could not be put together (' + (said(error) || 'no reason was given') + '). Your words and changes are still here.');
        return;
      }
      drawResult(result, types, notes);
    };
    // Recordings made ahead of time, for the words the file says out loud (Read aloud on, recordings not turned off).
    if (!state.readAloud || !state.voices || !media || typeof loader.portableAudio !== 'function') { go(null); return; }
    making('Getting the recordings.');
    media.clips(builder.wordsToHear(rows, types), loader, function (text) { if (run === buildRun) making(text); }).then(go, function () {
      notes.push('The recordings could not be downloaded, so the device voice reads every word.');
      go(null);
    });
  }
  function fileName(title, tail) {
    var safe = String(title || 'vocabulary').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'vocabulary';
    return safe + tail;
  }
  function drawResult(result, types, notes) {
    types = types || state.types;
    show('making', false);
    var blob = new Blob([result.html], { type: 'text/html' });
    var lesson = result.lesson;
    built = { html: result.html, name: fileName(lesson.title, (state.codeName ? '__' + builder.codeName(state.codeName) : '') + '.html'), bytes: blob.size, lesson: lesson,
      coded: state.mode === 'check' && codeNow().length >= 4 };
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    var q = builder.questions(rows, types);
    // A check's sample question (2026-11-13) is not one of the questions: it is not scored.
    var scored = function (b) { return b.items.filter(function (it) { return !it.practice; }).length; };
    var samples = lesson.blocks.reduce(function (n, b) { return n + b.items.length - scored(b); }, 0);
    var total = lesson.blocks.reduce(function (n, b) { return n + scored(b); }, 0);
    var kinds = lesson.blocks.map(function (b) { var t = builder.TYPES.filter(function (x) { return x.activity === b.activity; })[0]; return scored(b) + ' ' + t.name; });
    var data = [['Questions', capital(count(total, 'question')) + ': ' + listed(kinds) + '. Each has 4 answers to choose from, in a mixed order.'
      + (lesson.blocks.length > 1 && types.indexOf('meaning') >= 0 && types.indexOf('word') >= 0 ? ' Meaning to word comes first, so no meaning is shown as a choice before it is asked.' : '')]];
    var left = q.left.map(function (l) { var t = builder.TYPES.filter(function (x) { return x.id === l.type; })[0]; return l.word + ' (' + t.name + '): ' + l.why; });
    data.push(['Left out', left.length ? left.join(' ') : 'Nothing.']);
    data.push(['How', state.mode === 'check' ? 'A check: one try for each question, no right or wrong shown, no clock. The score is the number right.' + (codeNow() ? ' The answers screen opens with your teacher code.' : ' With no teacher code the screen at the end shows only the score.')
      : 'Practice: right or wrong after each answer, and a second try after a wrong one. No clock.']);
    // "practice question", as the math check page and the file itself ("Practice 1 of 1") call it (2026-11-13, teacher-journey pass).
    if (state.mode === 'check') data.push(['Practice first', samples ? count(samples, 'practice question') + ', with right or wrong shown, not scored. Its words are not in your list.' : 'None: every practice question shares a word with your list.']);
    // The recordings in the file: how many words, and what they add to its size.
    var clips = Object.keys(lesson.audio || {}), clipBytes = clips.reduce(function (n, id) { return n + String(lesson.audio[id]).length; }, 0);
    var pictureIds = Object.keys(lesson.images || {}), pictureBytes = pictureIds.reduce(function (n, id) { return n + String(lesson.images[id]).length; }, 0);
    data.push(['Read aloud', !state.readAloud ? 'Off.' : clips.length
      ? 'On. ' + capital(count(clips.length, 'word')) + ' have a recording made ahead of time (a machine voice), about ' + fileSize(clipBytes) + ' of the file. The device voice reads the rest, where the device has a voice that runs on it.'
      : 'On, where the device has a voice that runs on it.']);
    if (pictureIds.length) data.push(['Pictures', capital(count(pictureIds.length, 'picture')) + ' from the Word Sounds picture set, about ' + fileSize(pictureBytes) + ' of the file. Their credits are under About this file.']);
    if (notes && notes.length) data.push(['Note', notes.join(' ')]);
    setText('voices-line', !state.readAloud ? 'Read aloud is off, so the file has no recordings.' : !state.voices ? 'Off: the device voice reads every word.'
      : clips.length ? capital(count(clips.length, 'word')) + ' in this file have a recording, about ' + fileSize(clipBytes) + '.' : 'No word in this file has a recording made ahead of time.');
    data.push(['Title', lesson.title]);
    if (state.codeName) data.push(['Code name', builder.codeName(state.codeName)]);
    data.push(['File', built.name + ', ' + fileSize(built.bytes) + '.']);
    var host = $('summary-rows');
    host.textContent = '';
    data.forEach(function (row) { host.appendChild(el('dt', '', row[0])); host.appendChild(el('dd', '', row[1])); });
    setText('summary-facts', capital(count(total, 'question')) + '. ' + (state.mode === 'check' ? 'A check.' : 'Practice.') + ' ' + fileSize(built.bytes) + '.');
    show('summary', true);
    if (fileUrl) { $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl); show('try', true); }
    show('save', true);
    setText('making-said', 'The file is ready: ' + count(total, 'question') + ', ' + fileSize(built.bytes) + '.');
    drawBatch();
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
  function saveFile() {
    if (!built) return;
    var url = fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) return problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
    download(url, built.name);
    show('after-code', !!built.coded);
    show('after-save', true);
    $('after-save').focus();
  }

  // "Make one for each student": the file above with each code name in its manifest, in one .zip file.
  function batchList() {
    var seen = {}, out = { names: [], twice: [], unusable: [], over: 0 };
    String($('f-batch-names').value || '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var name = builder.codeName(line);
      if (!name) { out.unusable.push(line.trim().slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }
  function drawBatch() {
    var list = batchList(), n = list.names.length, parts = [];
    if (!n) parts.push('Type or paste the code names, one on each line.');
    else parts.push(count(n, 'file') + (built ? ', about ' + fileSize(n * built.bytes) + ' in all.' : '. The size shows here once the file above is ready.'));
    if (list.over) parts.push('Not used: ' + count(list.over, 'more code name') + '. At most ' + MAX_STUDENTS + ' go in one .zip file.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    if (batchFile) parts = ['Ready: ' + count(batchFile.count, 'file') + ' in one .zip file, ' + fileSize(batchFile.bytes) + '.'];
    setText('batch-said', parts.join(' '));
  }
  function dropBatch() {
    if (batchFile && batchFile.url) { try { URL.revokeObjectURL(batchFile.url); } catch (_) {} }
    batchFile = null;
    show('batch-save', false);
  }
  function makeBatch() {
    setText('batch-problem', '');
    dropBatch();
    var list = batchList();
    if (!list.names.length) { setText('batch-problem', 'Type at least one code name.'); return; }
    if (!built) { setText('batch-problem', 'The file above is not ready yet.'); return; }
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') { setText('batch-problem', 'This page could not load the part that makes .zip files. Load the page again.'); return; }
    try {
      var zip = window.AlloPacketZip.create(), encoder = new TextEncoder();
      list.names.forEach(function (name) {
        zip.add(fileName(built.lesson.title, '__' + name + '.html'), encoder.encode(builder.withCodeName(built.html, name)));
      });
      var parts = zip.finish();
      batchFile = { parts: parts, bytes: zip.bytes, count: list.names.length, name: fileName(built.lesson.title, '__' + list.names.length + '-students.zip'), url: '' };
    } catch (error) { setText('batch-problem', 'The .zip file could not be made (' + said(error) + ').'); return; }
    show('batch-save', true);
    drawBatch();
  }
  function saveBatch() {
    if (!batchFile) return;
    if (!batchFile.url) { try { batchFile.url = URL.createObjectURL(new Blob(batchFile.parts, { type: 'application/zip' })); } catch (_) { batchFile.url = ''; } }
    if (!batchFile.url) { setText('batch-problem', 'This browser cannot save files from a page.'); return; }
    download(batchFile.url, batchFile.name);
    setText('batch-said', 'Saved ' + batchFile.name + '. Each file\'s name ends with the student\'s code name. Send each student their own file.');
  }

  // ---------------------------------------------------------------------------
  // "Open a file I made"
  // ---------------------------------------------------------------------------
  function reopenNote(line, notes) {
    setText('reopen-line', line);
    var list = $('reopen-list');
    list.textContent = '';
    (notes || []).forEach(function (text) { list.appendChild(el('li', '', text)); });
    show('reopen-note', true);
    $('reopen-note').focus();
  }
  function reopen(textOfFile) {
    var verify = window.AlloPacketVerify;
    var parts = verify && typeof verify.readParts === 'function' ? verify.readParts(textOfFile) : null;
    if (!parts) { reopenNote('This page could not read the file. Load the page again.'); return; }
    if (parts.kind === 'results') { reopenNote('This is a results file, not a file made here. Add up results reads it.'); return; }
    if (bankState === 'loading') { reopenNote('The word list is still loading. Wait a moment, then open the file again.'); return; }
    var back = builder.readBack(parts);
    if (!back.ok) { reopenNote(parts.ok ? 'This file was not made on this page. Open it on the page that made it.' : 'This is not a file made with this page. Choose the .html file you saved in step 3.'); return; }
    state.words = back.words.join('\n');
    if (back.types.length) state.types = back.types;
    state.mode = back.mode;
    state.title = back.title;
    state.readAloud = back.readAloud;
    state.voices = back.voices !== false;
    (back.noPicture || []).forEach(function (word) { wordEdit(builder.keyOf(word)).noPicture = true; });
    state.codeName = back.learner;
    $('f-code-name').value = back.learner;
    Object.keys(back.senses).forEach(function (key) { if (!/^own:/.test(back.senses[key])) wordEdit(key).sense = back.senses[key]; });
    back.rows.forEach(function (r) {
      var key = builder.keyOf(r.word), w = wordEdit(key);
      var s = !r.own && bankState === 'ready' && bank ? bank.sense(r.sense) : null;
      if (r.own || !s) { w.def = r.def; if (r.example) w.example = r.example; if (r.pos) w.pos = r.pos; }
      else {
        if (r.def && r.def !== String(s.def || '').trim()) senseEdit(r.sense).def = r.def;
        if (r.example !== String(s.example || '').trim()) senseEdit(r.sense).example = r.example;
      }
      if (r.wrong.length === builder.WRONG) { w.wrong = r.wrong; w.wrongFor = r.own || !s ? 'own:' + key : r.sense; }
      if (r.blank.length === builder.WRONG) { w.blank = r.blank; w.blankFor = (r.own || !s ? 'own:' + key : r.sense) + '|' + builder.blankSentence(r.example, r.word, { bank: bankState === 'ready' ? bank : null, pos: r.pos }).ask; }
    });
    keepEdits();
    remember();
    $('f-words').value = state.words;
    var notes = [capital(count(back.words.length, 'word')) + ', ' + (back.mode === 'check' ? 'a check' : 'practice') + '.'];
    if (back.mode === 'check') notes.push('A check keeps its wrong answers sealed, so they come from your changes kept on this device, or from the word list.');
    if (back.teacherCode) notes.push('A teacher code cannot be read back from a file. Set it again in step 3.');
    if (back.learner) notes.push('It was made for ' + back.learner + '. That code name is filled in under More choices.');
    reopenNote('Opened ' + (back.title || 'the file') + '.', notes);
    goTo(1, true);
  }

  // ---------------------------------------------------------------------------
  // Moving between the steps
  // ---------------------------------------------------------------------------
  function goTo(wanted, quiet) {
    var target = wanted, stop = '';
    if (target >= 2) {
      drawWords();
      stop = stopAtStep1();
      if (stop) { target = 1; setText('step-1-problem', stop); }
    }
    if (target !== 3) { clearTimeout(buildTimer); clearBuilt(); show('making', false); }
    var stayed = target !== wanted && target === step;
    step = target;
    editing = null;
    [1, 2, 3].forEach(function (n) { show('step-' + n, n === step); });
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      var n = Number(tab.getAttribute('data-go'));
      if (n === step) tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
      tab.classList.toggle('is-done', n < step);
    });
    var name = productName();
    doc.title = (name ? name + ': ' : '') + 'Make vocabulary practice, step ' + step + ' of 3';
    if (step === 1) { if ($('f-words').value !== state.words) $('f-words').value = state.words; drawWords(); }
    if (step === 2) { redraft(); drawRows(); setText('step-2-problem', ''); }
    if (step === 3) { redraft(); drawStep3(); makeSoon(30); }
    if (!quiet && !stayed) {
      var heading = $('step-' + step + '-title');
      if (heading) { heading.focus(); if (typeof heading.scrollIntoView === 'function') heading.scrollIntoView({ block: 'start' }); }
    }
  }

  function drawCredits() {
    var host = $('credits');
    host.textContent = '';
    (bank && Array.isArray(bank.credits) ? bank.credits : []).forEach(function (c) {
      if (!isObject(c) || !c.set) return;
      var bare = function (a) { return String(a || '').replace(/^https?:\/\//i, ''); };
      host.appendChild(el('li', '', String(c.set) + (c.author ? ', by ' + c.author : '') + (c.license ? ', license ' + c.license : '') + (c.deed ? ' (' + bare(c.deed) + ')' : '') + (c.url ? '. Source: ' + bare(c.url) : '') + '.'));
    });
  }
  // A file handed over by "Change this file" on Open a practice file (packets-open.html, packets_handoff.js): taken
  // once and deleted, then opened as if chosen here, when the word list is no longer loading.
  var handed = null;
  function openHanded() {
    if (handed === null || bankState === 'loading') return;
    var text = handed;
    handed = null;
    reopen(text);
  }
  function takeHanded() {
    var handoff = window.AlloPacketHandoff;
    if (!handoff || typeof handoff.take !== 'function' || window.location.hash !== handoff.HASH) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (!file) { reopenNote('The file is not here any more. Choose it with Open a file I made.'); return; }
      handed = new TextDecoder('utf-8').decode(file.bytes);
      openHanded();
    }, function () { reopenNote('This browser could not hand the file over. Choose it with Open a file I made.'); });
  }
  function startBank() {
    var given = window.AlloVocabBank;
    if (!given || typeof given.load !== 'function' || typeof given.senses !== 'function') {
      bankState = 'missing';
      setText('bank-line', 'The word list could not be loaded. You can still type the meaning of each word yourself in step 2.');
      openHanded();
      return;
    }
    bank = given;
    bankState = 'loading';
    setText('bank-line', 'Getting the word list' + (bank.bytes > 0 ? ', about ' + fileSize(bank.bytes) : '') + '. It comes from this site and stays on this device.');
    var done = function (ok) {
      bankState = ok ? 'ready' : 'failed';
      setText('bank-line', ok ? 'The word list is ready.' : 'The word list could not be loaded. Check the connection and load the page again, or type the meaning of each word yourself in step 2.');
      if (ok) drawCredits();
      if (step === 1) drawWords();
      if (step === 2) { redraft(); drawRows(); }
      openHanded();
    };
    var started;
    try { started = bank.load(); } catch (_) { started = null; }
    if (!started || typeof started.then !== 'function') { done(false); return; }
    started.then(function () { done(true); }, function () { done(false); });
  }

  function wire() {
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      tab.addEventListener('click', function () { goTo(Number(tab.getAttribute('data-go'))); });
    });
    $('f-words').addEventListener('input', function () {
      state.words = this.value.slice(0, MAX_TYPED);
      remember();
      setText('step-1-problem', '');
      clearTimeout(wordsTimer);
      wordsTimer = setTimeout(drawWords, 250);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="mode"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.mode = radio.value; remember(); syncMode(); makeSoon(30); });
    });
    $('f-title').addEventListener('input', function () { state.title = this.value.slice(0, 80); remember(); makeSoon(400); });
    $('f-read').addEventListener('change', function () { state.readAloud = this.checked; remember(); if ($('f-voices')) $('f-voices').disabled = !state.readAloud; makeSoon(30); });
    if ($('f-voices')) $('f-voices').addEventListener('change', function () { state.voices = this.checked; remember(); makeSoon(30); });
    // A meaning saved on the lookup page in another tab: read the changes again.
    window.addEventListener('storage', function (e) { if (e.key !== EDITS_KEY) return; edits = recallEdits(); redraft(); if (step === 1) drawWords(); if (step === 2) drawRows(); if (step === 3) { drawStep3(); makeSoon(30); } });
    $('f-code').addEventListener('input', function () { makeSoon(400); });
    $('f-code-name').addEventListener('input', function () { state.codeName = this.value.slice(0, 40); makeSoon(400); });
    $('f-batch-names').addEventListener('input', function () { dropBatch(); drawBatch(); });
    $('batch-make').addEventListener('click', makeBatch);
    $('batch-save').addEventListener('click', saveBatch);
    $('next-1').addEventListener('click', function () { goTo(2); });
    $('back-2').addEventListener('click', function () { goTo(1); });
    $('next-2').addEventListener('click', function () { goTo(3); });
    $('back-3').addEventListener('click', function () { goTo(2); });
    $('fix-rows').addEventListener('click', function () { goTo(2); });
    $('save').addEventListener('click', saveFile);
    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { reopenNote('This file is too large to be a file made here.'); return; }
      var reader = new FileReader();
      reader.onload = function () { reopen(String(reader.result || '')); };
      reader.onerror = function () { reopenNote('This browser could not read the file.'); };
      reader.readAsText(file);
    });
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      state = defaults();
      $('f-words').value = '';
      $('f-title').value = '';
      $('f-code-name').value = '';
      goTo(1, true);
      setText('forget-said', 'Done. Your choices are back to how they started.');
    });
    $('forget-edits').addEventListener('click', function () {
      try { window.localStorage.removeItem(EDITS_KEY); } catch (_) {}
      edits = freshEdits();
      redraft();
      if (step === 2) drawRows();
      if (step === 3) { drawStep3(); makeSoon(30); }
      setText('forget-said', 'Done. Your changes to the questions are gone. The questions are the ones the word list gives.');
    });
  }

  function start() {
    loader = window.AlloWordSoundsTakeHome;
    builder = window.AlloPacketVocab;
    var missing = [];
    var adapters = loader && loader.CHECK_ADAPTERS;
    if (!loader || typeof loader.buildHtml !== 'function' || !adapters || !adapters.vocab_meaning || !adapters.vocab_word || !adapters.vocab_blank) missing.push('the part that writes the file');
    if (!builder || typeof builder.draftRows !== 'function' || typeof builder.buildVocabPacket !== 'function') missing.push('the part that makes the questions');
    if (missing.length) {
      show('loading', false);
      setText('load-problem-text', 'Missing: ' + listed(missing) + '. Check the connection, then load the page again. Nothing has been lost.');
      show('load-problem', true);
      return;
    }
    state = recall();
    edits = recallEdits();
    // Recordings and pictures need the network (this site only); a browser without fetch makes files without them.
    media = window.AlloVocabMedia && typeof window.AlloVocabMedia.clips === 'function' && typeof window.fetch === 'function' ? window.AlloVocabMedia : null;
    var sym = window.AlloModules && window.AlloModules.WordSoundsSymbols;
    art = window.AlloPacketBuilder && typeof window.AlloPacketBuilder.svgRefusal === 'function' ? window.AlloPacketBuilder : null;
    symbols = media && art && sym && typeof sym.has === 'function' && typeof sym.file === 'function' && typeof sym.get === 'function' ? sym : null;
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_csv) setText('csv-label', loader.DEFAULT_LABELS.save_csv);
    wire();
    show('reopen', !!(window.AlloPacketVerify && typeof window.AlloPacketVerify.readParts === 'function' && typeof FileReader === 'function'));
    show('loading', false);
    startBank();
    goTo(1, true);
    takeHanded();
  }

  try { start(); } catch (error) {
    show('loading', false);
    setText('load-problem-text', 'The page stopped while starting (' + said(error) + '). Load the page again. Nothing has been lost.');
    show('load-problem', true);
  }
})();
