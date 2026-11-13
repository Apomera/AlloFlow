// "Open a practice file" (packets-open.html): a practice file or a check, run on a phone or a tablet, where a saved
// .html file is shown as a preview that runs no script. The file is read in this tab (packets_verify_core.js,
// readParts, tells a packet from anything else) and runs in a sandboxed frame: scripts and downloads only, no
// allow-same-origin, so it runs on an origin of its own and cannot reach this site's storage (My words, the makers'
// choices) or this page.
//
// The student's place. A sandboxed file has no storage of its own. This page keeps the place for it, in this site's
// localStorage, under the name the file itself uses ('alloflow-take-home:<lessonId>:<revision>[:<code name>]'):
// - before the file starts, what is kept for it is put in the file as a data block that never runs
//   (<script type="application/json" id="packet-store-snapshot">);
// - the file (word_sounds_take_home_loader.js, takeHomeShell, linked()) reads its place from that block when its own
//   storage refuses, and sends each change here as a message; this page checks the message and keeps it;
// - a place is given back only to the same file, byte for byte (its SHA-256), so one file cannot read another's.
// Saving results: the file sends the results file here and this page saves it, as any page saves a download.
// A file made before 2026-11-12 has no such code: it runs, but cannot keep its place here, and saves by itself.
//
// "Change this file" hands the file to the maker that made it (packets_handoff.js), in this tab.
(function () {
  'use strict';
  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var show = function (id, on) { $(id).hidden = !on; };
  var setText = function (id, text) { $(id).textContent = text; };

  var KEY_PREFIX = 'alloflow-take-home:';
  var OWNERS = 'alloflow-packets-open:owners';
  var STORE_KIND = 'alloflow-packet-store';
  var SAVE_KIND = 'alloflow-packet-save';
  var MAX_VALUE = 512 * 1024;          // characters in one kept place
  var MAX_KEYS = 12;                   // places one opened file may keep (one for each code name)
  var MAX_SAVE = 20 * 1024 * 1024;     // characters in one results file
  var SAVE_TYPES = { csv: 'text/csv;charset=utf-8', json: 'application/json' };
  var MAKERS = {
    words: { href: 'packets-make.html', name: 'Make Word Sounds practice', reopens: true },
    vocab: { href: 'packets-vocab.html', name: 'Make vocabulary practice', reopens: true },
    math: { href: 'packets-math-practice.html', name: 'Make math fact practice', reopens: false },
    check: { href: 'packets-check.html', name: 'Make a math check', reopens: false },
  };

  var verify = null, handoff = null;
  var current = null;   // the chosen file: { name, bytes, html, title, kind, base, bridged, fingerprint }
  var session = null;   // the running file: { frame, keys, count, lastSave, file, warned }
  var pushed = false;

  var isObject = function (value) { return !!value && typeof value === 'object' && !Array.isArray(value); };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  var say = function (text) { setText('said', ''); window.setTimeout(function () { setText('said', text); }, 30); };

  // ---------------------------------------------------------------------------
  // This site's storage, for the places only
  // ---------------------------------------------------------------------------
  var storage = function () { try { return window.localStorage || null; } catch (_) { return null; } };
  function owners() {
    var s = storage();
    try { var held = s && JSON.parse(s.getItem(OWNERS) || '{}'); return isObject(held) ? held : {}; } catch (_) { return {}; }
  }
  function keepOwners(map) {
    var s = storage();
    if (!s) return;
    try { if (Object.keys(map).length) s.setItem(OWNERS, JSON.stringify(map)); else s.removeItem(OWNERS); } catch (_) {}
  }
  // A name the chosen file may use: its own, or its own with a code name after it.
  function ours(file, key) {
    return typeof key === 'string' && !!file.base && (key === file.base || (key.indexOf(file.base + ':') === 0 && key.length <= file.base.length + 200));
  }
  // What is kept for this file, by this same file.
  function keptFor(file) {
    var s = storage(), out = {};
    if (!s || !file.fingerprint) return out;
    var map = owners();
    try {
      for (var i = 0; i < s.length; i++) {
        var key = s.key(i);
        if (ours(file, key) && map[key] === file.fingerprint) { var value = s.getItem(key); if (typeof value === 'string') out[key] = value; }
      }
    } catch (_) {}
    return out;
  }
  function forgetAll() {
    var s = storage();
    if (!s) return false;
    try {
      var keys = [];
      for (var i = 0; i < s.length; i++) { var key = s.key(i); if (key && (key.indexOf(KEY_PREFIX) === 0 || key === OWNERS)) keys.push(key); }
      keys.forEach(function (key) { s.removeItem(key); });
      return true;
    } catch (_) { return false; }
  }

  // ---------------------------------------------------------------------------
  // Reading the chosen file
  // ---------------------------------------------------------------------------
  function readBytes(file) {
    if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(reader.error); };
        reader.readAsArrayBuffer(file);
      } catch (error) { reject(error); }
    });
  }
  function hex(buffer) {
    var bytes = new Uint8Array(buffer), out = '';
    for (var i = 0; i < bytes.length; i++) out += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return out;
  }
  // The file's SHA-256, by the browser where it can (fast), else by packets_verify_core.js.
  function fingerprintOf(bytes) {
    var subtle = window.crypto && window.crypto.subtle;
    var slow = function () { try { return verify.sha256(new Uint8Array(bytes)).hex; } catch (_) { return ''; } };
    if (!subtle || typeof subtle.digest !== 'function') return Promise.resolve(slow());
    return Promise.resolve().then(function () { return subtle.digest('SHA-256', bytes); }).then(hex, slow);
  }

  // What kind of file it is, from its two JSON blocks (as packets_reopen.js tells them apart).
  function describe(parts) {
    var m = parts.manifest || {}, lesson = isObject(parts.lesson) ? parts.lesson : {};
    var packet = isObject(m.packet) ? m.packet : {};
    var blocks = (Array.isArray(lesson.blocks) ? lesson.blocks : []).filter(function (block) { return isObject(block) && typeof block.activity === 'string' && Array.isArray(block.items); });
    var every = function (pattern) { return blocks.length > 0 && blocks.every(function (block) { return pattern.test(block.activity); }); };
    var check = packet.mode === 'check' || packet.mode === 'probe' || lesson.mode === 'probe';
    var kind = every(/^vocab_/) ? 'vocab' : check ? 'check' : every(/^math_/) ? 'math' : 'words';
    var label = kind === 'vocab' ? (check ? 'Vocabulary check' : 'Vocabulary practice') : kind === 'check' ? 'A check' : kind === 'math' ? 'Math fact practice' : 'Word Sounds practice';
    var all = blocks.reduce(function (list, block) { return list.concat(block.items); }, []);
    var items = isObject(m.check) && Number(m.check.items) > 0 ? Number(m.check.items) : all.filter(function (item) { return !(isObject(item) && item.practice); }).length;
    var title = String(m.title || lesson.title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    var learner = typeof m.learner === 'string' ? m.learner.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    var named = Array.isArray(m.stores) && isObject(m.stores[0]) && typeof m.stores[0].key === 'string' ? m.stores[0].key : '';
    var base = named.indexOf(KEY_PREFIX) === 0 && named.length <= 300 ? named
      : typeof lesson.lessonId === 'string' && lesson.lessonId ? KEY_PREFIX + lesson.lessonId + ':' + lesson.revision : '';
    return { kind: kind, label: label, check: check, items: items, title: title, learner: learner, base: base };
  }

  function problem(line, link) {
    show('found', false);
    show('drop', true);
    setText('problem-line', line);
    show('problem-more', !!link);
    if (link) { $('problem-link').setAttribute('href', link.href); $('problem-link').textContent = link.name; }
    show('problem', true);
    $('problem').focus();
    say(line);
  }

  function choose(file) {
    if (!file) return;
    show('problem', false);
    show('change-note', false);
    say('Reading the file.');
    readBytes(file).then(function (bytes) {
      var parts = verify.readParts(bytes);
      if (parts.refused === 'too_big') { problem('This file is larger than 60 MB, so it is not a practice file.'); return null; }
      if (parts.refused === 'empty') { problem('This file is empty. Ask your teacher to send it again.'); return null; }
      if (parts.refused) { problem('This browser could not read the file.'); return null; }
      if (parts.kind === 'results') { problem('This is a results file, not a practice file. A teacher adds it up on Add up results.', { href: 'packets-results.html', name: 'Add up results' }); return null; }
      if (!parts.ok || !parts.lesson) { problem('This is not a practice file or a check. Choose the .html file your teacher sent.'); return null; }
      var html = new TextDecoder('utf-8').decode(bytes);
      if (html.charCodeAt(0) === 0xFEFF) html = html.slice(1);
      var about = describe(parts);
      current = { name: String(file.name || 'file.html').slice(0, 160), bytes: bytes, html: html, title: about.title || 'Practice file', kind: about.kind, base: about.base,
        bridged: html.indexOf("getElementById('packet-store-snapshot')") >= 0, fingerprint: '', about: about };
      return fingerprintOf(bytes).then(function (sum) { current.fingerprint = sum; drawFound(); });
    }).catch(function () { problem('This browser could not read the file.'); });
  }

  function drawFound() {
    var about = current.about;
    setText('found-kind', about.label);
    setText('found-title', current.title);
    var line = [];
    if (about.items) line.push(count(about.items, 'question', 'questions') + '.');
    if (about.learner) line.push('Made for ' + about.learner + '.');
    setText('found-line', line.join(' '));
    show('found-line', line.length > 0);
    drawPlace();
    show('older-note', !current.bridged);
    show('change-note', false);
    show('drop', false);
    show('found', true);
    $('found').focus();
    say(about.label + ': ' + current.title + '. Press Start.');
  }
  function drawPlace() {
    var kept = current && current.bridged ? Object.keys(keptFor(current)).length : 0;
    setText('place-line', kept ? 'Your place in this file is kept on this device. Start goes on from there.' : '');
    show('place-line', kept > 0);
  }

  // ---------------------------------------------------------------------------
  // Running the file
  // ---------------------------------------------------------------------------
  // The data block goes in the head, before the file's own script runs. Every < in the JSON is written as its
  // escape (backslash, u003c), so the block can never be closed early.
  function withSnapshot(html, items) {
    var lt = new RegExp('<', 'g');
    var block = '<script type="application/json" id="packet-store-snapshot">' + JSON.stringify({ kind: STORE_KIND, items: items }).replace(lt, '\\' + 'u003c') + '</script>';
    var at = html.search(/<\/head\s*>/i);
    return at >= 0 ? html.slice(0, at) + block + html.slice(at) : block + html;
  }

  function start() {
    if (!current || session) return;
    var frame = doc.createElement('iframe');
    frame.className = 'run-frame';
    frame.title = current.title;
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    frame.setAttribute('allow', 'autoplay; clipboard-write');
    session = { frame: frame, keys: {}, count: 0, lastSave: 0, file: null, warned: false, of: current };
    frame.srcdoc = current.bridged ? withSnapshot(current.html, keptFor(current)) : current.html;
    setText('run-title', current.title);
    setText('run-said', '');
    show('run-again', false);
    $('run-host').appendChild(frame);
    show('run', true);
    doc.body.classList.add('is-running');
    try { window.history.pushState({ packetOpen: true }, ''); pushed = true; } catch (_) { pushed = false; }
    frame.addEventListener('load', function () { try { frame.focus(); } catch (_) {} });
  }

  function stop(fromHistory) {
    if (!session) return;
    session.frame.remove();
    session = null;
    show('run', false);
    doc.body.classList.remove('is-running');
    if (pushed && !fromHistory) { pushed = false; try { window.history.back(); } catch (_) {} }
    pushed = false;
    drawPlace();
    $('start').focus();
  }

  function note(text) { setText('run-said', text); }

  // A change of place, from the file. Only a plain object, as JSON, under one of the file's own names.
  function keep(data) {
    var file = session.of, key = data.key, value = data.value;
    if (!ours(file, key) || !file.fingerprint) return;
    if (value !== null && (typeof value !== 'string' || value.length > MAX_VALUE)) return;
    if (value !== null) { try { if (!isObject(JSON.parse(value))) return; } catch (_) { return; } }
    var s = storage(), map = owners();
    if (map[key] && map[key] !== file.fingerprint) {
      // Another file keeps its place under this name: it is left as it is.
      if (s && s.getItem(key) !== null) return;
    }
    if (!session.keys[key]) { if (session.count >= MAX_KEYS) return; session.keys[key] = true; session.count++; }
    try {
      if (!s) throw new Error('no storage');
      if (value === null) { s.removeItem(key); delete map[key]; } else { s.setItem(key, value); map[key] = file.fingerprint; }
      keepOwners(map);
    } catch (_) {
      if (!session.warned) { session.warned = true; note('This browser could not keep your place. Finish in one go.'); }
    }
  }

  function download(file) {
    var url = URL.createObjectURL(new Blob([file.text], { type: file.type }));
    var a = doc.createElement('a');
    a.href = url;
    a.download = file.name;
    a.hidden = true;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  // A results file, from the file: a plain name that ends .csv or .json, the type that goes with it, text only.
  function saveFor(data) {
    var name = data.name, ext = typeof name === 'string' ? (/\.(csv|json)$/.exec(name) || [])[1] : '';
    if (!ext || name.length > 160 || /[\\/:*?"<>|]/.test(name) || !Array.prototype.every.call(name, function (c) { return c.charCodeAt(0) >= 32; })) return;
    if (data.type !== SAVE_TYPES[ext] || typeof data.text !== 'string' || data.text.length > MAX_SAVE) return;
    var now = Date.now();
    if (now - session.lastSave < 800) return;
    session.lastSave = now;
    session.file = { name: name, text: data.text, type: data.type };
    // Saved at once after a press in the file; otherwise only when the student presses Save it again.
    var pressed = !navigator.userActivation || navigator.userActivation.isActive;
    if (pressed) download(session.file);
    note(pressed ? 'Results file: ' + name + '.' : 'Press Save it again to save ' + name + '.');
    show('run-again', true);
  }

  window.addEventListener('message', function (event) {
    if (!session || event.source !== session.frame.contentWindow || event.origin !== 'null') return;
    var data = event.data;
    if (!isObject(data)) return;
    if (data.kind === STORE_KIND) keep(data);
    else if (data.kind === SAVE_KIND) saveFor(data);
  });

  // ---------------------------------------------------------------------------
  // Change this file: the maker that made it opens it (Open a file I made)
  // ---------------------------------------------------------------------------
  function change() {
    if (!current) return;
    var maker = MAKERS[current.kind];
    var link = $('change-link');
    link.setAttribute('href', maker.href);
    link.textContent = 'Open ' + maker.name;
    var tell = function (line) { setText('change-line', line); show('change-note', true); $('change-note').focus(); };
    if (!maker.reopens) {
      tell(maker.name + ' cannot open a saved file yet. To change this one, make it again there.');
      return;
    }
    if (!handoff) { tell('Open ' + maker.name + ', then press Open a file I made there and choose this file.'); return; }
    handoff.put({ name: current.name, bytes: current.bytes }).then(function () {
      window.location.href = maker.href + handoff.HASH;
    }, function () {
      tell('This browser could not hand the file over. Open ' + maker.name + ', then press Open a file I made there and choose this file.');
    });
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function wire() {
    $('choose').addEventListener('click', function () { $('file').click(); });
    $('file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      choose(file);
    });
    $('another').addEventListener('click', function () { $('file').click(); });
    $('start').addEventListener('click', start);
    $('change').addEventListener('click', change);
    $('run-close').addEventListener('click', function () { stop(false); });
    $('run-again').addEventListener('click', function () { if (session && session.file) { download(session.file); note('Results file: ' + session.file.name + '.'); } });
    doc.addEventListener('keydown', function (event) { if (session && event.key === 'Escape' && doc.activeElement !== session.frame) stop(false); });
    window.addEventListener('popstate', function () { if (session) stop(true); });
    $('forget').addEventListener('click', function () {
      if (session) return;
      setText('forget-said', forgetAll() ? 'Done. No places are kept on this device now.' : 'This browser keeps no places for this page.');
      if (current) drawPlace();
    });
    // A file dropped anywhere on the page.
    var main = $('main');
    var isFiles = function (event) { var types = event.dataTransfer && event.dataTransfer.types; return !!types && Array.prototype.indexOf.call(types, 'Files') >= 0; };
    main.addEventListener('dragover', function (event) {
      if (!isFiles(event)) return;
      event.preventDefault();
      try { event.dataTransfer.dropEffect = 'copy'; } catch (_) {}
      show('drop-over', true);
    });
    main.addEventListener('dragleave', function (event) { if (!event.relatedTarget || !main.contains(event.relatedTarget)) show('drop-over', false); });
    main.addEventListener('drop', function (event) {
      show('drop-over', false);
      if (!isFiles(event)) return;
      event.preventDefault();
      choose(event.dataTransfer.files && event.dataTransfer.files[0]);
    });
  }

  function begin() {
    verify = window.AlloPacketVerify;
    var store = window.AlloPacketHandoff;
    handoff = store && typeof store.put === 'function' ? store : null;
    if (!verify || typeof verify.readParts !== 'function' || typeof TextDecoder !== 'function' || !('srcdoc' in doc.createElement('iframe'))) {
      problem('This browser cannot open a file on this page. Open the file in Chrome, Edge or Safari on a computer.');
      $('choose').disabled = true;
      return;
    }
    wire();
  }
  begin();
})();
