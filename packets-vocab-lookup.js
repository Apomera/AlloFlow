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

  var API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
  var EDITS_KEY = 'alloflow-packets-vocab-edits/1';
  var SOURCE = 'Wiktionary, through the Free Dictionary API (dictionaryapi.dev)';
  var MAX_MEANINGS = 8;
  var doc = document;
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

  var found = null, asked = '';
  function draw(result, word) {
    var host = $('meanings');
    host.textContent = '';
    $('found-legend').textContent = 'Meanings of ' + word;
    result.list.forEach(function (m, i) {
      var label = el('label', 'radio'), radio = el('input');
      radio.type = 'radio';
      radio.name = 'meaning';
      radio.value = String(i);
      radio.checked = i === 0;
      radio.addEventListener('change', function () { Array.prototype.forEach.call(host.querySelectorAll('.radio'), function (l) { l.classList.toggle('is-on', l.querySelector('input').checked); }); });
      var words = el('span', '', (m.pos ? m.pos + ': ' : '') + m.def);
      if (m.example) words.appendChild(el('span', 'radio-sub', 'Example: ' + m.example));
      label.appendChild(radio);
      label.appendChild(words);
      label.classList.toggle('is-on', radio.checked);
      host.appendChild(label);
    });
    setText('credit', 'Meanings from ' + SOURCE + (result.license ? ', license ' + result.license : '') + '.');
    setText('use-line', '');
    $('found').hidden = false;
    $('found-title').focus();
  }
  function look() {
    var word = wordOf($('word').value);
    setText('use-line', '');
    if (!$('online-on').checked) { setText('look-line', 'Turn on Allow this page to look up words online first. Nothing has been sent.'); return; }
    if (!word) { setText('look-line', 'Type a word: letters, and at most 40 characters.'); return; }
    if (typeof window.fetch !== 'function') { setText('look-line', 'This browser cannot look words up.'); return; }
    asked = word;
    $('found').hidden = true;
    setText('look-line', 'Looking up ' + word + '.');
    window.fetch(API + encodeURIComponent(word.toLowerCase()), { credentials: 'omit', referrerPolicy: 'no-referrer' }).then(function (reply) {
      if (reply.status === 404) return null;
      if (!reply.ok) throw new Error('answered ' + reply.status);
      return reply.json();
    }).then(function (rows) {
      if (asked !== word) return;
      var result = rows ? meaningsOf(rows, word) : { list: [] };
      if (!result.list.length) { found = null; setText('look-line', 'The dictionary has no meaning for ' + word + '. Type its meaning yourself in the vocabulary maker.'); return; }
      found = { word: word, result: result };
      setText('look-line', 'Found ' + result.list.length + (result.list.length === 1 ? ' meaning.' : ' meanings.'));
      draw(result, word);
    }, function () {
      if (asked !== word) return;
      setText('look-line', 'The dictionary did not answer. Check the connection, then try again.');
    });
  }
  function use() {
    if (!found) return;
    var picked = doc.querySelector('input[name="meaning"]:checked');
    var m = found.result.list[Number(picked ? picked.value : 0)] || found.result.list[0];
    var key = keyOf(found.word), edits;
    try { edits = JSON.parse(window.localStorage.getItem(EDITS_KEY) || 'null'); } catch (_) { edits = null; }
    if (!isObject(edits) || edits.v !== 1) edits = { v: 1, words: {}, senses: {} };
    if (!isObject(edits.words)) edits.words = {};
    if (!isObject(edits.senses)) edits.senses = {};
    var w = isObject(edits.words[key]) ? edits.words[key] : {};
    w.def = m.def;
    if (m.pos) w.pos = m.pos; else delete w.pos;
    if (m.example) w.example = m.example;
    w.net = { def: m.def, source: SOURCE, license: found.result.license || '' };
    delete w.wrong; delete w.wrongFor;
    w.at = Date.now();
    edits.words[key] = w;
    try { window.localStorage.setItem(EDITS_KEY, JSON.stringify(edits)); } catch (_) { $('not-keeping').hidden = false; setText('use-line', 'This browser could not keep it.'); return; }
    setText('use-line', 'Saved for ' + found.word + '. Go back to the vocabulary maker: the word shows this meaning, marked from the internet, not checked.');
  }
  function start() {
    var hashed = /(?:^#|&)word=([^&]*)/.exec(String(window.location.hash || ''));
    if (hashed) { try { $('word').value = wordOf(decodeURIComponent(hashed[1])); } catch (_) {} }
    try { window.localStorage.getItem(EDITS_KEY); } catch (_) { $('not-keeping').hidden = false; }
    $('look').addEventListener('click', look);
    $('word').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); look(); } });
    $('online-on').addEventListener('change', function () { setText('look-line', this.checked ? 'On for this visit. Press Look it up to send the word.' : 'Off. Nothing is sent.'); });
    $('use').addEventListener('click', use);
  }
  start();
})();
