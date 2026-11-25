// Look up a word online (packets-vocab-lookup.html), 2026-11-12: a meaning for a word the vocabulary word list does
// not have, from the Free Dictionary API (api.dictionaryapi.dev, CORS-open, no key; its meanings come from Wiktionary),
// the service the app's dictionary_loader.js uses. This is the one vocabulary page whose rule lets it reach another
// site, and that one address only (connect-src https://api.dictionaryapi.dev, not even this site). Nothing is sent
// until the teacher turns on the switch and presses Look it up; then only the typed word is sent. The switch is never
// kept. The meaning chosen is written into the vocabulary maker's changes (EDITS_KEY of packets-vocab.js, this
// browser's local storage), as the teacher's meaning for that word, marked net: the maker shows it as "from the
// internet, not checked" and the file credits it.
(function () {
  'use strict';

  var win = typeof window === 'object' && window !== null ? window : null;
  var doc = typeof document === 'object' && document !== null ? document : (win && typeof win.document === 'object' ? win.document : null);
  if (!win || !doc || typeof doc.getElementById !== 'function') return;

  var API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
  var EDITS_KEY = 'alloflow-packets-vocab-edits/1';
  var SOURCE = 'Wiktionary, through the Free Dictionary API (dictionaryapi.dev)';
  var MAX_MEANINGS = 8;
  var MAX_QUEUE = 200;
  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, text) { var n = doc.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
  var setText = function (id, text) { var n = $(id); if (n) n.textContent = text; };
  var isObject = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
  var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max || 300) : ''; };

  // A word as the vocabulary maker keys it (packet_vocab_builder.js normalizeWord + keyOf): letters, apostrophes,
  // hyphens and single spaces, 1 to 40 characters, in lower case.
  function wordOf(value) {
    var t = String(value == null ? '' : value);
    t = (t.normalize ? t.normalize('NFC') : t).replace(/\s+/g, ' ').trim().replace(/^[\s"'“”‘’.!?:()[\]{}]+|[\s"“”.!?:()[\]{}]+$/g, '');
    if (!t || t.length > 40) return '';
    var ok;
    try { ok = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M}'’ -]*$", 'u').test(t); } catch (_) { ok = /^[A-Za-z][A-Za-z' -]*$/.test(t); }
    return ok && !/ {2}|--/.test(t) ? t : '';
  }
  function keyOf(word) { return wordOf(word).toLowerCase().replace(/’/g, "'"); }
  function hasWord(sentence, word) {
    var esc = keyOf(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!esc) return false;
    try { return new RegExp('(^|[^\\p{L}\\p{M}])' + esc + '(?![\\p{L}\\p{M}])', 'iu').test(sentence); } catch (_) { return false; }
  }

  // The answer, as a short list: { pos, def, example } for each meaning, the license named by the service.
  function meaningsOf(rows, word) {
    var out = [], license = '', url = '';
    (Array.isArray(rows) ? rows : []).filter(isObject).forEach(function (row) {
      if (!license && isObject(row.license)) license = line(row.license.name, 40);
      if (!url && Array.isArray(row.sourceUrls)) url = line(String(row.sourceUrls[0] || ''), 200);
      (Array.isArray(row.meanings) ? row.meanings : []).filter(isObject).forEach(function (m) {
        (Array.isArray(m.definitions) ? m.definitions : []).filter(isObject).forEach(function (d) {
          var def = line(d.definition).replace(/[.;:]+$/, '');
          if (!def || out.length >= MAX_MEANINGS || out.some(function (o) { return o.def === def; })) return;
          var example = line(d.example);
          out.push({ pos: line(m.partOfSpeech, 20), def: def, example: example && hasWord(example, word) ? example : '' });
        });
      });
    });
    return { list: out, license: license, url: url };
  }

  // Strictly in-memory tab state: consent is never persisted across visits or tabs.
  var allowed = false, queue = [], savedWords = [];
  var found = null, asked = '';
  function syncConsent() {
    var box = $('online-on');
    if (box && box.parentNode && box.parentNode.classList) box.parentNode.classList.toggle('is-on', !!box.checked);
  }
  function setBusy(on) {
    var btn = $('look');
    if (!btn) return;
    btn.disabled = !!on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    btn.textContent = on ? 'Looking it up...' : 'Look it up';
  }
  function drawQueue() {
    var note = $('queue-line'), skip = $('skip-word');
    if (!queue.length) {
      if (note) { note.textContent = ''; note.hidden = true; }
      if (skip) skip.hidden = true;
      return;
    }
    if (note) {
      var preview = queue.slice(0, 4).join(', ') + (queue.length > 4 ? ', and more' : '');
      note.textContent = 'Next in your list (' + queue.length + ' more): ' + preview + '.';
      note.hidden = false;
    }
    if (skip) skip.hidden = false;
  }
  function clearStaleFound() {
    found = null;
    if ($('found')) $('found').hidden = true;
    setText('use-line', '');
  }
  function skipWord() {
    if (!queue.length) return;
    abortActive();
    lookRun++;
    setBusy(false);
    clearStaleFound();
    var nextWord = queue.shift();
    $('word').value = nextWord;
    setText('look-line', 'Skipped. Next word ready above: ' + nextWord + '. Press Look it up, or go back to the vocabulary maker.');
    drawQueue();
    try { $('word').focus(); } catch (_) {}
  }
  function draw(result, word) {
    var host = $('meanings');
    if (!host) return;
    host.textContent = '';
    var legend = $('found-legend');
    if (legend) legend.textContent = 'Meanings of ' + word;
    result.list.forEach(function (m, i) {
      var label = el('label', 'radio'), radio = el('input');
      radio.type = 'radio';
      radio.name = 'meaning';
      radio.value = String(i);
      radio.checked = i === 0;
      radio.addEventListener('change', function () {
        Array.prototype.forEach.call(host.querySelectorAll('.radio'), function (l) {
          var inp = l.querySelector('input');
          l.classList.toggle('is-on', !!(inp && inp.checked));
        });
      });
      var words = el('span', '', (m.pos ? m.pos + ': ' : '') + m.def);
      if (m.example) words.appendChild(el('span', 'radio-sub', 'Example: ' + m.example));
      label.appendChild(radio);
      label.appendChild(words);
      label.classList.toggle('is-on', radio.checked);
      host.appendChild(label);
    });
    setText('credit', 'Meanings from ' + SOURCE + (result.license ? ', license ' + result.license : '') + '.');
    setText('use-line', '');
    var foundEl = $('found');
    if (foundEl) foundEl.hidden = false;
    var titleEl = $('found-title');
    if (titleEl && typeof titleEl.focus === 'function') titleEl.focus();
  }
  var LOOKUP_MS = 10000;
  var activeStop = null;
  var activeTimer = null;
  var lookRun = 0;
  function abortActive() {
    if (activeTimer !== null) { win.clearTimeout(activeTimer); activeTimer = null; }
    if (activeStop) { try { activeStop.abort(); } catch (_) {} activeStop = null; }
  }
  function look() {
    var wordEl = $('word');
    var onlineEl = $('online-on');
    if (!wordEl || !onlineEl) return;
    var word = wordOf(wordEl.value);
    setText('use-line', '');
    allowed = !!onlineEl.checked;
    syncConsent();
    if (!allowed) { setText('look-line', 'Turn on Allow this page to look up words online first. Nothing has been sent.'); return; }
    if (!word) { setText('look-line', 'Type a word: letters, and at most 40 characters.'); return; }
    if (typeof win.fetch !== 'function') { setText('look-line', 'This browser cannot look words up.'); return; }
    if (win._isDesktopBundledApp === true || win.__ALLOFLOW_DESKTOP_OFFLINE__ === true) { setText('look-line', 'Online word lookup is disabled in offline Desktop mode.'); return; }
    if (win.navigator && win.navigator.onLine === false) { setText('look-line', 'This device is offline. Connect to the internet, then try again.'); return; }
    abortActive();
    var run = ++lookRun;
    asked = word;
    found = null;
    if ($('found')) $('found').hidden = true;
    setBusy(true);
    setText('look-line', 'Looking up ' + word + '.');
    var control = typeof win.AbortController === 'function' ? new win.AbortController() : null;
    activeStop = control;
    var timedOut = false;
    var timer = win.setTimeout(function () { timedOut = true; if (control) { try { control.abort(); } catch (_) {} } }, LOOKUP_MS);
    activeTimer = timer;
    var opts = { credentials: 'omit', referrerPolicy: 'no-referrer' };
    if (control) opts.signal = control.signal;
    var finish = function () {
      win.clearTimeout(timer);
      if (activeTimer === timer) activeTimer = null;
      if (activeStop === control) activeStop = null;
      if (run === lookRun) setBusy(false);
    };
    var MAX_DICT_JSON_BYTES = 2 * 1024 * 1024;
    var safeJsonParse = function (raw) {
      return JSON.parse(raw, function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
    };
    window.fetch(API + encodeURIComponent(word.toLowerCase()), opts).then(function (reply) {
      if (reply.status === 404) return null;
      if (!reply.ok) { var err = new Error('answered ' + reply.status); err.status = reply.status; throw err; }
      var cl = Number(reply.headers && typeof reply.headers.get === 'function' ? reply.headers.get('content-length') : NaN);
      if (isFinite(cl) && cl > MAX_DICT_JSON_BYTES) {
        if (reply.body && typeof reply.body.cancel === 'function') { try { reply.body.cancel(); } catch (_) {} }
        throw new Error('response too large');
      }
      if (typeof reply.text === 'function') {
        return reply.text().then(function (text) {
          if (text.length > MAX_DICT_JSON_BYTES) throw new Error('response too large');
          return safeJsonParse(text);
        });
      }
      return reply.json();
    }).then(function (rows) {
      finish();
      if (run !== lookRun || asked !== word) return;
      var result = rows ? meaningsOf(rows, word) : { list: [] };
      if (!result.list.length) {
        found = null;
        drawQueue();
        setText('look-line', queue.length
          ? 'The dictionary has no meaning for ' + word + '. Type its meaning yourself in the vocabulary maker, or press Skip to next word (' + queue.length + ' left).'
          : 'The dictionary has no meaning for ' + word + '. Type its meaning yourself in the vocabulary maker.');
        return;
      }
      found = { word: word, result: result };
      setText('look-line', 'Found ' + result.list.length + (result.list.length === 1 ? ' meaning.' : ' meanings.'));
      draw(result, word);
    }, function (err) {
      finish();
      if (run !== lookRun || asked !== word) return;
      if (err && err.status === 429) {
        setText('look-line', 'The dictionary has had too many searches from this network for now. Try again later.');
      } else if (timedOut) {
        setText('look-line', 'The dictionary took too long to answer. Check the connection, then try again.');
      } else {
        setText('look-line', 'The dictionary did not answer. Check the connection, then try again.');
      }
    });
  }
  function use() {
    if (!found) return;
    var picked = doc.querySelector('input[name="meaning"]:checked');
    var m = found.result.list[Number(picked ? picked.value : 0)] || found.result.list[0];
    if (!m) return;
    var key = keyOf(found.word), edits;
    if (!key) return;
    try {
      edits = JSON.parse(win.localStorage.getItem(EDITS_KEY) || 'null', function (k, v) {
        return k === '__proto__' ? undefined : v;
      });
    } catch (_) { edits = null; }
    if (!isObject(edits) || edits.v !== 1) edits = { v: 1, words: Object.create(null), senses: Object.create(null) };
    var wordsMap = Object.create(null);
    if (isObject(edits.words)) Object.keys(edits.words).forEach(function (k) { wordsMap[k] = edits.words[k]; });
    edits.words = wordsMap;
    var sensesMap = Object.create(null);
    if (isObject(edits.senses)) Object.keys(edits.senses).forEach(function (k) { sensesMap[k] = edits.senses[k]; });
    edits.senses = sensesMap;
    var w = isObject(edits.words[key]) ? edits.words[key] : {};
    w.def = m.def;
    if (m.pos) w.pos = m.pos; else delete w.pos;
    if (m.example) w.example = m.example;
    w.net = { def: m.def, source: SOURCE, license: found.result.license || '' };
    delete w.wrong; delete w.wrongFor;
    w.at = Date.now();
    edits.words[key] = w;
    try { win.localStorage.setItem(EDITS_KEY, JSON.stringify(edits)); } catch (_) { if ($('not-keeping')) $('not-keeping').hidden = false; setText('use-line', 'This browser could not keep it.'); return; }
    if (savedWords.indexOf(key) < 0) savedWords.push(key);
    queue = queue.filter(function (item) { return keyOf(item) !== key; });
    var nextWord = queue.length ? queue.shift() : '';
    var savedNote = savedWords.length > 1 ? ' (' + savedWords.length + ' saved this visit)' : '';
    var savedWord = found.word;
    found = null;
    if ($('found')) $('found').hidden = true;
    var doneText = nextWord
      ? 'Saved for ' + savedWord + savedNote + '. Next word ready above: ' + nextWord + '. Press Look it up, or go back to the vocabulary maker.'
      : 'Saved for ' + savedWord + savedNote + '. Type another word above to look it up on this tab, or go back to the vocabulary maker.';
    if ($('word')) $('word').value = nextWord || '';
    drawQueue();
    setText('use-line', doneText);
    setText('look-line', doneText);
    try { if ($('word')) $('word').focus(); } catch (_) {}
  }
  function start() {
    var wordEl = $('word'), lookEl = $('look'), onlineEl = $('online-on'), useEl = $('use');
    if (!wordEl || !lookEl || !onlineEl || !useEl) return;
    var hash = String((win.location && win.location.hash) || '');
    var hashed = /(?:^#|&)word=([^&]*)/.exec(hash);
    var firstKey = '';
    if (hashed) {
      try {
        var first = wordOf(decodeURIComponent(hashed[1]));
        wordEl.value = first;
        firstKey = keyOf(first);
      } catch (_) {}
    }
    var more = /(?:^#|&)more=([^&]*)/.exec(hash);
    if (more) {
      try {
        var seen = Object.create(null);
        if (firstKey) seen[firstKey] = true;
        decodeURIComponent(more[1]).split(',').forEach(function (part) {
          if (queue.length >= MAX_QUEUE) return;
          var w = wordOf(part), k = keyOf(w);
          if (w && k && !seen[k]) { seen[k] = true; queue.push(w); }
        });
      } catch (_) {}
    }
    drawQueue();
    syncConsent();
    try { win.localStorage.getItem(EDITS_KEY); } catch (_) { if ($('not-keeping')) $('not-keeping').hidden = false; }
    lookEl.addEventListener('click', look);
    if ($('skip-word')) $('skip-word').addEventListener('click', skipWord);
    wordEl.addEventListener('input', function () {
      if (activeStop) { abortActive(); lookRun++; setBusy(false); }
      if (found || ($('found') && !$('found').hidden)) clearStaleFound();
    });
    wordEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.repeat && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (lookEl.disabled) return;
        look();
      }
    });
    onlineEl.addEventListener('change', function () {
      allowed = !!this.checked;
      syncConsent();
      if (!allowed) { abortActive(); lookRun++; setBusy(false); }
      setText('look-line', allowed ? 'On for this visit. Press Look it up to send the word.' : 'Off. Nothing is sent.');
    });
    useEl.addEventListener('click', use);
    if (typeof win.addEventListener === 'function') win.addEventListener('pagehide', abortActive);
  }
  start();
})();
