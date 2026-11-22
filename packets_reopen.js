// "Open a file I made" on the maker page (packets-make.html): what a practice file made earlier says about how it
// was made, so that the page can fill itself in. One plain script for a browser page (window.AlloPacketReopen) and
// for node (module.exports). No imports. It loads nothing, sends nothing and runs nothing from the file: the file is
// read as text by packets_verify_core.js (readParts) and only its two JSON blocks are looked at.
//
// read(input, env) -> a plain object (never throws):
//   input  the file's bytes (ArrayBuffer or Uint8Array) or its text
//   env    { verify: AlloPacketVerify, creditLine: AlloPacketBuilder.creditLine, codeName: AlloPacketBuilder.codeName,
//            activities: the activity ids the page offers, wordSounds: every Word Sounds activity id,
//            labels: the sound labels of the dictionary, seeds: { A: 1, B: 2, C: 3 } }
//   { ok, kind: 'words' | 'check' | 'math' | 'vocab' | 'symbol' | 'results' | 'other',
//     why: one plain sentence when the file cannot be used here, page: { href, name } (the page that makes it),
//     teacherCode: true when a check had a teacher code (it cannot be read back),
//     title, activities, words, version ('A' | 'B' | 'C' | ''), pictures, learner, items,
//     tracing ('both' | 'capital' | 'lowercase'), choices ('easy' | 'medium' | 'all'),
//     own: { word: { sounds: { sounds, spelling }, clip: { dataUri, source }, picture: { dataUri, credit } } },
//     notes: plain sentences, each about something that could not be read back }
//
// What a file holds, and so what can come back: the title, the activities, each question's word (in order), the
// version (the builder's seed, in the manifest), whether it shows pictures, a student's code name, and the
// teacher's own sounds, recordings and pictures for the words the manifest names. A teacher code is never in a
// file (only a salted hash of it), and a word that got no question in any activity is not in the file at all.
//
// readCheck(input, env) and readMath(input, env) (2026-11-13) do the same for the math check maker (packets-check.html)
// and the math fact practice maker (packets-math-practice.html): see each one below.
(function (root) {
  'use strict';

  var PAGES = {
    words: { href: 'packets-make.html', name: 'Make Word Sounds practice' },
    check: { href: 'packets-check.html', name: 'Make a math check' },
    math: { href: 'packets-math-practice.html', name: 'Make math fact practice' },
    vocab: { href: 'packets-vocab.html', name: 'Make vocabulary practice' },
    symbol: { href: 'packets-symbol-runner.html', name: 'Make Symbol Runner practice' },
    read: { href: 'packets-read-along.html', name: 'Make a read-along' },
    results: { href: 'packets-results.html', name: 'Add up results' },
    verify: { href: 'packets-verify.html', name: 'Look inside a file' },
  };
  var WORD = /^[a-z]{2,24}$/;
  var READ_ALONG = 'This is a read-along. Make a read-along makes it, and can open it again.';
  var isObject = function (value) { return !!value && typeof value === 'object' && !Array.isArray(value); };
  var own = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  var list = function (value) { return Array.isArray(value) ? value : []; };
  var MAX_AUDIO_URI_CHARS = 2 * 1024 * 1024;
  var MAX_IMAGE_URI_CHARS = 600000;
  var SAFE_AUDIO_URI = /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3);base64,([A-Za-z0-9+/]+={0,2})$/i;
  var SAFE_IMAGE_URI = /^data:image\/(png|jpeg|svg\+xml);base64,([A-Za-z0-9+/]+={0,2})$/i;
  function decodeUtf8Base64(b64) {
    if (typeof atob === 'function') {
      var bin = atob(b64);
      if (typeof TextDecoder === 'function') {
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
      }
      return decodeURIComponent(escape(bin));
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    return '';
  }
  function isSafeSvgText(svg) {
    var s = typeof svg === 'string' ? svg : '';
    var stripped = s.replace(/^\s*<\?xml\s[^>]*\?>/i, '').replace(/^(?:\s*<!--[\s\S]*?-->)+/, '').trim();
    if (!/^\s*<svg[\s>]/i.test(stripped) || !/<\/svg>\s*$/i.test(stripped)) return false;
    if (s.length > 300000 || s.indexOf('\\') >= 0 || /<!(?:doctype|entity)/i.test(s) || /<\?(?!xml\s)/i.test(s)) return false;
    var plain = s.replace(/&#x([0-9a-f]+);?/gi, function (_, hex) { return String.fromCharCode(parseInt(hex, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (_, dec) { return String.fromCharCode(Number(dec) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (_, name) { return name.toLowerCase() === 'colon' ? ':' : ''; });
    var packed = plain.replace(/[\x00-\x20]+/g, '');
    var bare = function (value) { return String(value || '').replace(/[\x00-\x20]+/g, ''); };
    if (/<\s*(?:[^\s<>"'=/:]+:)?(?:script|foreignObject|iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return false;
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain) || /(?:java|vb|live)script:/i.test(packed) || /xml:base\s*=/i.test(plain)) return false;
    if (/[\s"'\/]src(?:doc)?\s*=/i.test(plain) || /(?:-(?:webkit|moz)-)?image-set\s*\(/i.test(plain)) return false;
    var m, href = /(?:[\s"'\/])(?:[^\s<>"'=/:]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return false;
    }
    var styleRe = /<\s*(?:[^\s<>"'=/:]+:)?style\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
    while ((m = styleRe.exec(plain))) {
      if (/\/\s*>$/.test(m[0])) continue;
      var end = plain.slice(styleRe.lastIndex).search(/<\s*\/\s*(?:[^\s<>"'=/:]+:)?style\s*>/i);
      var css = end < 0 ? plain.slice(styleRe.lastIndex) : plain.slice(styleRe.lastIndex, styleRe.lastIndex + end);
      if (end < 0 || /@import|@font-face|@namespace|url\s*\(|(?:-(?:webkit|moz)-)?image-set\s*\(|expression\s*\(/i.test(css)) return false;
    }
    var urlRe = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = urlRe.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return false;
    }
    return true;
  }
  function isSafeAudioDataUri(uri) {
    if (typeof uri !== 'string' || uri.length > MAX_AUDIO_URI_CHARS) return false;
    var m = SAFE_AUDIO_URI.exec(uri);
    return !!(m && m[1].length % 4 === 0);
  }
  function isSafeImageDataUri(uri, customRefusal) {
    if (typeof uri !== 'string' || uri.length > MAX_IMAGE_URI_CHARS) return false;
    var m = SAFE_IMAGE_URI.exec(uri);
    if (!m || m[2].length % 4 !== 0) return false;
    if (m[1].toLowerCase() === 'svg+xml') {
      try {
        var decoded = decodeUtf8Base64(m[2]);
        if (!decoded || !isSafeSvgText(decoded)) return false;
        if (typeof customRefusal === 'function' && customRefusal(decoded)) return false;
      } catch (_) { return false; }
    }
    return true;
  }
  function listed(names) { return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(''); }

  // The words of the file, in the order they were given: each activity keeps that order, and a word that got no
  // question in one activity is put back after the word before it in another.
  function wordOrder(blocks) {
    var lists = blocks.map(function (block) {
      var seen = Object.create(null);
      return list(block.items).map(function (item) { return isObject(item) ? String(item.word || '').trim().toLowerCase() : ''; })
        .filter(function (word) { if (!WORD.test(word) || seen[word]) return false; seen[word] = true; return true; });
    }).sort(function (a, b) { return b.length - a.length; });
    var order = [];
    lists.forEach(function (words) {
      var before = -1;
      words.forEach(function (word) {
        var at = order.indexOf(word);
        if (at >= 0) { before = at; return; }
        order.splice(before + 1, 0, word);
        before++;
      });
    });
    return order;
  }

  function itemsOf(blocks, activity, word) {
    var out = [];
    blocks.forEach(function (block) {
      if (activity && block.activity !== activity) return;
      list(block.items).forEach(function (item) { if (isObject(item) && String(item.word || '').toLowerCase() === word) out.push(item); });
    });
    return out;
  }

  // Which sound each phoneme clip says: every { label, audio } pair the file holds (Find Sounds choices, Break it
  // Down chips, Sound Sort chips).
  function soundOfClip(blocks) {
    var map = Object.create(null);
    var walk = function (value) {
      if (Array.isArray(value)) { value.forEach(walk); return; }
      if (!isObject(value)) return;
      if (typeof value.label === 'string' && typeof value.audio === 'string' && !own(map, value.audio)) map[value.audio] = value.label;
      Object.keys(value).forEach(function (key) { if (typeof value[key] === 'object') walk(value[key]); });
    };
    blocks.forEach(function (block) { walk(block.items); });
    return map;
  }

  // The teacher's sounds for a word: Break it Down lists them; else Blend Sounds plays them, one clip each.
  function soundsOf(blocks, word, clips, labels) {
    var known = function (sounds) { return sounds.length > 0 && sounds.length <= 24 && sounds.every(function (s) { return typeof s === 'string' && labels.indexOf(s) >= 0; }); };
    var found = null;
    itemsOf(blocks, 'segmentation', word).some(function (item) { var s = list(item.sounds); if (known(s)) { found = s.slice(); return true; } return false; });
    if (!found) itemsOf(blocks, 'blending', word).some(function (item) {
      var s = list(item.sounds).map(function (id) { return typeof id === 'string' && own(clips, id) ? clips[id] : ''; });
      if (known(s)) { found = s; return true; }
      return false;
    });
    return found;
  }

  // The letters for each sound, from Sound Mapping: its spellings in order, and how many sounds each covers (spans).
  function spellingOf(blocks, word, sounds) {
    var found = null;
    itemsOf(blocks, 'mapping', word).some(function (item) {
      var texts = list(item.graphemes);
      if (!texts.length || !texts.every(function (t) { return typeof t === 'string' && /^[a-z]{1,6}$/.test(t); }) || texts.join('') !== word) return false;
      var spans = list(item.spans);
      var sizes = spans.length === texts.length && spans.every(function (k) { return k === 1 || k === 2; }) ? spans.slice() : texts.map(function () { return 1; });
      if (sizes.reduce(function (a, b) { return a + b; }, 0) !== sounds.length) return false;
      found = texts.map(function (t, i) { return { text: t, size: sizes[i] }; });
      return true;
    });
    return found;
  }

  // A picture's credit back from its credit sentence. It is taken only when the builder's own sentence for it is
  // the same sentence, word for word.
  function creditOf(line, creditLine) {
    var text = String(line || '');
    if (typeof creditLine !== 'function' || !text) return null;
    if (text === creditLine({ own: true })) return { own: true };
    var m = /^(?:"(.*)"(?: by (.*?))?|Picture by (.*?)|Picture), (CC0|Public domain|CC BY(?:-SA)?(?: \d(?:\.\d)?)?(?: [a-z]{2,5})?)(?: \(([^()\s]+)\))?(?:, from (.*?)(?: \(([^()\s]+)\))?)?(, made smaller)?\.$/i.exec(text);
    if (!m) return null;
    var credit = { title: m[1] || '', author: m[2] || m[3] || '', license: m[4], licenseUrl: m[5] ? 'https://' + m[5] : '', source: m[6] || '', sourceUrl: m[7] ? 'https://' + m[7] : '' };
    if (m[8]) credit.resized = true;
    return creditLine(credit) === text ? credit : null;
  }

  function read(input, env) {
    var e = env || {};
    var out = { ok: false, kind: 'other', why: '', page: null, teacherCode: false, title: '', activities: [], words: [], version: '', pictures: false, directionsOnce: false, learner: '', items: 0, own: {}, notes: [] };
    var no = function (kind, why, page) { out.kind = kind; out.why = why; out.page = page || null; return out; };
    if (!e.verify || typeof e.verify.readParts !== 'function') return no('other', 'This page could not read the file. Load the page again.');
    var parts = e.verify.readParts(input);
    if (parts.refused === 'too_big') return no('other', 'This file is larger than 60 MB, so it is not a practice file made here.');
    if (parts.refused === 'empty') return no('other', 'This file is empty.');
    if (parts.refused) return no('other', 'This browser could not read the file.');
    if (parts.kind === 'results') return no('results', 'This is a results file, not a practice file. Add up results reads it.', PAGES.results);
    if (parts.kind === 'zip') return no('zip', 'This is a .zip folder. Unzip it first and choose one .html file inside, or open a results .zip on Add up results.', PAGES.results);
    if (!parts.ok || !parts.lesson) return no('other', 'This is not a practice file made with this page. Choose the .html file you saved in step 3.');
    var m = parts.manifest || {}, lesson = parts.lesson;
    var blocks = list(lesson.blocks).filter(function (block) { return isObject(block) && typeof block.activity === 'string' && Array.isArray(block.items); });
    var packet = isObject(m.packet) ? m.packet : {};
    // Vocabulary practice and vocabulary checks (packet_vocab_builder.js) are made, and opened again, on their own page.
    if (blocks.length && blocks.every(function (block) { return /^vocab_/.test(block.activity); })) return no('vocab', 'This is vocabulary ' + (packet.mode === 'check' || lesson.mode === 'probe' ? 'check' : 'practice') + '. Make vocabulary practice makes it, and can open it again.', PAGES.vocab);
    if (blocks.length && blocks.every(function (block) { return block.activity === 'symbol_runner'; })) return no('symbol', 'This is Symbol Runner ' + (packet.mode === 'check' || lesson.mode === 'probe' ? 'check' : 'practice') + '. Make Symbol Runner practice makes it, and can open it again.', PAGES.symbol);
    if (blocks.length && blocks.every(function (block) { return block.activity === 'read_along'; })) return no('read', READ_ALONG, PAGES.read);
    if (packet.mode === 'check' || packet.mode === 'probe' || lesson.mode === 'probe') {
      out.teacherCode = isObject(lesson.check) && isObject(lesson.check.lock);
      return no('check', 'This is a math check. Make a math check makes it.' + (out.teacherCode ? ' A teacher code cannot be read back from a file: set the teacher code again there.' : ''), PAGES.check);
    }
    if (blocks.length && blocks.every(function (block) { return /^math_/.test(block.activity); })) return no('math', 'This is math fact practice. Make math fact practice makes it.', PAGES.math);
    var wordSounds = list(e.wordSounds), offered = list(e.activities);
    var inFile = blocks.map(function (block) { return block.activity; }).filter(function (id, i, all) { return all.indexOf(id) === i; });
    if (!inFile.some(function (id) { return wordSounds.indexOf(id) >= 0; })) return no('other', 'This file has no Word Sounds activity this page can make.');

    out.ok = true;
    out.kind = 'words';
    var older = parts.kind === 'older' || !isObject(m.builder);
    out.title = String(lesson.title || m.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    out.activities = offered.filter(function (id) { return inFile.indexOf(id) >= 0; });
    var left = inFile.filter(function (id) { return out.activities.indexOf(id) < 0; });
    var name = function (id) { return isObject(lesson.activityTitles) && typeof lesson.activityTitles[id] === 'string' ? lesson.activityTitles[id] : id; };
    if (left.length) out.notes.push(listed(left.map(name)) + (left.length === 1 ? ' is' : ' are') + ' not offered on this page now, so ' + (left.length === 1 ? 'it was' : 'they were') + ' left out.');
    var kept = blocks.filter(function (block) { return out.activities.indexOf(block.activity) >= 0; });
    out.words = wordOrder(kept.length ? kept : blocks);
    out.items = kept.reduce(function (n, block) { return n + block.items.length; }, 0);
    if (out.words.length > 40) { out.notes.push('The file has ' + out.words.length + ' words. A file made here has at most 40, so the first 40 are used.'); out.words = out.words.slice(0, 40); }

    // The version: the builder's seed, in the manifest.
    var seeds = isObject(e.seeds) ? e.seeds : { A: 1, B: 2, C: 3 };
    var seed = isObject(m.builder) ? m.builder.seed : null;
    Object.keys(seeds).forEach(function (letter) { if (seeds[letter] === seed) out.version = letter; });
    if (!out.version) out.notes.push(seed == null ? 'The file does not say which version it is (A, B or C), so version A is chosen.'
      : 'The file was made with a version this page does not have, so version A is chosen. The new file will have a different mix.');

    out.pictures = isObject(lesson.pictures) && isObject(lesson.images) && Object.keys(lesson.images).length > 0;
    // Letter Trace (2026-11-13): which letters its items trace. Capital and lowercase unless every item traces one kind.
    var traced = [];
    kept.filter(function (block) { return block.activity === 'letter_tracing'; }).forEach(function (block) {
      block.items.forEach(function (item) { if (isObject(item) && Array.isArray(item.parts)) traced.push(item.parts.length === 1 && isObject(item.parts[0]) ? String(item.parts[0].kind || '') : 'both'); });
    });
    out.tracing = traced.length && traced.every(function (kind) { return kind === 'capital'; }) ? 'capital'
      : traced.length && traced.every(function (kind) { return kind === 'lowercase'; }) ? 'lowercase' : 'both';
    // Choices (2026-11-13): how many choices the boards show, as the maker's manifest says. A file made before it said
    // so showed every choice.
    var level = isObject(m.builder) ? m.builder.choices : null;
    out.choices = level === 'easy' || level === 'medium' || level === 'all' ? level : 'all';
    out.directionsOnce = !!(lesson && lesson.instructionsOnce === true) || !!(isObject(m.builder) && m.builder.directionsOnce === true);
    // 2026-11-17: the missed questions once more at the end.
    out.repeatMissed = !!(lesson && lesson.repeatMissed === true);
    // 2026-11-18: the questions' order: 'mixed' (with its mix, orderSeed), the teacher's own ('activity|word' keys), or
    // 'blocks', one activity at a time, which is also what a file made before 2026-11-18 did.
    var orderKind = isObject(m.builder) ? m.builder.order : null;
    out.order = 'blocks';
    if (Array.isArray(lesson.sequence) && orderKind === 'mixed') {
      out.order = 'mixed';
      if (typeof m.builder.orderSeed === 'number') out.orderSeed = m.builder.orderSeed;
    } else if (Array.isArray(lesson.sequence) && orderKind === 'own') {
      var keyOf = Object.create(null);
      blocks.forEach(function (block) { block.items.forEach(function (item) { if (isObject(item)) keyOf[String(item.id)] = block.activity + '|' + String(item.word || '').toLowerCase(); }); });
      var keys = lesson.sequence.map(function (id) { return own(keyOf, String(id)) ? keyOf[String(id)] : ''; }).filter(Boolean);
      if (keys.length) out.order = keys;
    }
    if (typeof m.learner === 'string') out.learner = typeof e.codeName === 'function' ? e.codeName(m.learner) : m.learner.slice(0, 40);

    // The teacher's own sounds, recordings and pictures, for the words the manifest names.
    var mine = isObject(m.own) ? m.own : null;
    var labels = list(e.labels);
    var clipsBySound = soundOfClip(blocks);
    var lost = { sounds: [], recordings: [], pictures: [] };
    var entry = function (word) { if (!own(out.own, word)) out.own[word] = {}; return out.own[word]; };
    if (mine) {
      list(mine.sounds).forEach(function (word) {
        if (typeof word !== 'string' || out.words.indexOf(word) < 0) return;
        var sounds = soundsOf(blocks, word, clipsBySound, labels);
        if (!sounds) { lost.sounds.push(word); return; }
        var set = { sounds: sounds };
        var spelling = spellingOf(blocks, word, sounds);
        if (spelling) set.spelling = spelling;
        entry(word).sounds = set;
      });
      list(mine.recordings).forEach(function (word) {
        if (typeof word !== 'string' || out.words.indexOf(word) < 0) return;
        var clip = '';
        itemsOf(blocks, null, word).some(function (item) {
          var uri = typeof item.wordAudio === 'string' && isObject(lesson.audio) && own(lesson.audio, item.wordAudio) ? lesson.audio[item.wordAudio] : '';
          if (isSafeAudioDataUri(uri)) { clip = uri; return true; }
          return false;
        });
        if (clip) entry(word).clip = { dataUri: clip, source: 'teacher' }; else lost.recordings.push(word);
      });
      list(mine.pictures).forEach(function (row) {
        if (!isObject(row) || typeof row.word !== 'string' || out.words.indexOf(row.word) < 0) return;
        var uri = '';
        itemsOf(blocks, null, row.word).some(function (item) {
          var at = typeof item.wordPicture === 'string' && isObject(lesson.images) && own(lesson.images, item.wordPicture) ? lesson.images[item.wordPicture] : '';
          if (isSafeImageDataUri(at, e.svgRefusal)) { uri = at; return true; }
          return false;
        });
        var credit = creditOf(row.credit, e.creditLine);
        if (uri && credit) entry(row.word).picture = { dataUri: uri, credit: credit }; else lost.pictures.push(row.word);
      });
    } else if (older) {
      out.notes.push('This file is from an older version, so it does not say which recordings or pictures were your own. Add them again with Edit this word.');
    }
    if (lost.sounds.length) out.notes.push('The sounds you set for ' + listed(lost.sounds) + ' could not be read back. Set them again with Edit this word.');
    if (lost.recordings.length) out.notes.push('Your recording of ' + listed(lost.recordings) + ' could not be read back. Record it again with Edit this word.');
    if (lost.pictures.length) out.notes.push('Your picture for ' + listed(lost.pictures) + ' could not be read back. Add it again with Edit this word.');
    if (!out.title) out.notes.push('The file has no title, so the page makes one.');
    return out;
  }

  // ---------------------------------------------------------------------------
  // 2026-11-13 (owner-approved): "Open a file I made" on the math check maker and the math fact practice maker.
  // Each reads only what its own kind of file holds, the same way read() does (readParts, the two JSON blocks).
  // ---------------------------------------------------------------------------
  // The parts of a file, or the reason it is not one of ours, for the makers other than Word Sounds.
  function partsFor(input, e, out) {
    var no = function (kind, why, page) { out.kind = kind; out.why = why; out.page = page || null; return null; };
    if (!e.verify || typeof e.verify.readParts !== 'function') return no('other', 'This page could not read the file. Load the page again.');
    var parts = e.verify.readParts(input);
    if (parts.refused === 'too_big') return no('other', 'This file is larger than 60 MB, so it is not a file made here.');
    if (parts.refused === 'empty') return no('other', 'This file is empty.');
    if (parts.refused) return no('other', 'This browser could not read the file.');
    if (parts.kind === 'results') return no('results', 'This is a results file, not a file made here. Add up results reads it.', PAGES.results);
    if (parts.kind === 'zip') return no('zip', 'This is a .zip folder. Unzip it first and choose one .html file inside, or open a results .zip on Add up results.', PAGES.results);
    if (!parts.ok || !parts.lesson) return no('other', 'This is not a file made with this page. Choose the .html file you saved in step 3.');
    var lesson = parts.lesson, m = parts.manifest || {}, packet = isObject(m.packet) ? m.packet : {};
    var blocks = list(lesson.blocks).filter(function (block) { return isObject(block) && typeof block.activity === 'string' && Array.isArray(block.items); });
    var check = packet.mode === 'check' || packet.mode === 'probe' || lesson.mode === 'probe';
    var kind = blocks.length && blocks.every(function (block) { return /^vocab_/.test(block.activity); }) ? 'vocab'
      : blocks.length && blocks.every(function (block) { return block.activity === 'symbol_runner'; }) ? 'symbol'
      : blocks.length && blocks.every(function (block) { return block.activity === 'read_along'; }) ? 'read'
      : check ? 'check' : blocks.length && blocks.every(function (block) { return /^math_/.test(block.activity); }) ? 'math' : 'words';
    return { parts: parts, lesson: lesson, manifest: m, blocks: blocks, kind: kind };
  }
  function elsewhere(kind, out) {
    var said = { vocab: 'This is vocabulary practice or a vocabulary check. Make vocabulary practice makes it, and can open it again.',
      symbol: 'This is Symbol Runner practice or a Symbol Runner check. Make Symbol Runner practice makes it, and can open it again.',
      check: 'This is a math check. Make a math check makes it, and can open it again.', math: 'This is math fact practice. Make math fact practice makes it, and can open it again.',
      words: 'This is Word Sounds practice. Make Word Sounds practice makes it, and can open it again.', read: READ_ALONG };
    out.kind = kind; out.why = said[kind] || 'This file was not made on this page.'; out.page = PAGES[kind] || null;
    return out;
  }
  function learnerOf(m, e) { return typeof m.learner === 'string' ? (typeof e.codeName === 'function' ? e.codeName(m.learner) : m.learner.slice(0, 40)) : ''; }
  // A problem or a fact as a teacher types it: 12 - 5, 6 x 4, 20 / 4.
  function typed(word) { return String(word || '').replace(/−/g, '-').replace(/×/g, 'x').replace(/÷/g, '/').replace(/[  ]/g, ''); }

  // readCheck(input, env) -> { ok, kind, why, page, teacherCode, title, learner, notes,
  //   check: { id ('quantity_discrimination' | 'missing_number' | 'math_computation' | 'own'), grade, version, untimed,
  //            problems (one on each line), time (seconds, 0 = no clock), skip } }
  // env: { verify: AlloPacketVerify, builder: AlloPacketChecks, codeName }. A check keeps its answers sealed and its
  // teacher code only as a salted hash, so neither comes back: a problem written with its own answer (3 + 4 + 5 = 12)
  // is named in a note, to be typed again.
  function readCheck(input, env) {
    var e = env || {};
    var out = { ok: false, kind: 'other', why: '', page: null, teacherCode: false, title: '', learner: '', notes: [], check: null };
    var got = partsFor(input, e, out);
    if (!got) return out;
    if (got.kind !== 'check') return elsewhere(got.kind, out);
    var lesson = got.lesson, meta = isObject(lesson.check) ? lesson.check : {}, measures = e.builder && isObject(e.builder.MEASURES) ? e.builder.MEASURES : {};
    out.teacherCode = isObject(meta.lock);
    out.learner = learnerOf(got.manifest, e);
    var title = String(lesson.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (lesson.form === 'custom') {
      var block = got.blocks.filter(function (b) { return b.activity === 'math_computation'; })[0];
      if (!block) return elsewhere('other', out);
      var lines = [], stated = [];
      block.items.forEach(function (item) {
        if (!isObject(item) || item.practice) return;
        if (typeof item.a === 'number' && typeof item.b === 'number' && typeof item.symbol === 'string') lines.push(typed(item.a + ' ' + item.symbol + ' ' + item.b));
        else if (typeof item.display === 'string') stated.push(item.display);
      });
      out.check = { id: 'own', grade: '', version: '', untimed: false, problems: lines.join('\n'), time: Number(lesson.timeLimitS) > 0 ? Number(lesson.timeLimitS) : 0, skip: meta.allowSkip !== false };
      out.title = title === 'Math check' ? '' : title;
      if (stated.length) out.notes.push((stated.length === 1 ? 'One problem was' : stated.length + ' problems were') + ' written with its own answer, and a check keeps its answers sealed, so '
        + (stated.length === 1 ? 'it' : 'they') + ' could not be read back: ' + listed(stated.map(typed)) + '. Type ' + (stated.length === 1 ? 'it' : 'them') + ' again with the answer, like 3 + 4 + 5 = 12.');
    } else {
      var id = Object.keys(measures).filter(function (key) { return isObject(measures[key]) && measures[key].code === meta.measure; })[0] || '';
      if (!id) return elsewhere('other', out);
      var rawForm = String(lesson.form || '').toUpperCase(), editedMatch = /^([A-Z0-9]+)-EDITED$/.exec(rawForm);
      var grade = String(meta.grade || '').toUpperCase(), version = editedMatch ? editedMatch[1] : rawForm, untimed = meta.untimed === true, editedForm = !!editedMatch;
      out.check = { id: id, grade: grade, version: version, untimed: untimed, problems: '', time: 0, skip: true };
      var baseTitle = editedForm ? title.replace(/\s+\(edited\)$/i, '') : title;
      // The title the builder gives this form, now or before 2026-11-13 ("Missing Number check (KA)"), is not the teacher's.
      var name = measures[id].name, made = typeof e.builder.formTitle === 'function' ? e.builder.formTitle(name, grade, version, untimed) : '';
      var madeBefore = typeof e.builder.formTitle === 'function' ? e.builder.formTitle(name, grade, version, untimed, true) : '';
      out.title = baseTitle === made || baseTitle === madeBefore || baseTitle === name + ' check (' + grade + version + (untimed ? ', untimed' : '') + ')' ? '' : baseTitle;
      if (editedForm) out.notes.push('Questions were removed from version ' + version + ' in Try it. Step 2 opens the full version ' + version + '.');
      if (untimed) out.notes.push('It is untimed, an accommodation for one student. Untimed is turned on in step 2.');
    }
    if (out.teacherCode) out.notes.push('A teacher code cannot be read back from a file. Set it again in step 2.');
    if (out.learner) out.notes.push('It was made for ' + out.learner + '. That code name is filled in at step 3.');
    out.ok = true;
    out.kind = 'check';
    return out;
  }

  // readMath(input, env) -> { ok, kind, why, page, title, learner, notes,
  //   math: { kind ('add' | 'sub' | 'mul' | 'div' | 'own'), set (a set's id), facts (one on each line), method ('ccc' | 'rehearsal'), known: [fact keys] } }
  // env: { verify, builder: AlloPacketMathPractice, codeName }. A practice file holds its facts and their roles in the clear.
  function readMath(input, env) {
    var e = env || {};
    var out = { ok: false, kind: 'other', why: '', page: null, teacherCode: false, title: '', learner: '', notes: [], math: null };
    var got = partsFor(input, e, out);
    if (!got) return out;
    if (got.kind !== 'math') return elsewhere(got.kind, out);
    var b = e.builder || {}, block = got.blocks[0], lesson = got.lesson;
    var method = block.activity === 'math_rehearsal' ? 'rehearsal' : block.activity === 'math_ccc' ? 'ccc' : '';
    var parse = function (word) { try { var f = b.parseFacts(typed(word)); return f.length === 1 ? f[0] : null; } catch (_) { return null; } };
    if (!method || typeof b.parseFacts !== 'function' || typeof b.factKey !== 'function') return elsewhere('other', out);
    var id = /^math-facts-(.+)-(?:ccc|rehearsal)$/.exec(String(lesson.lessonId || ''));
    var set = id ? list(b.FAMILIES).filter(function (f) { return isObject(f) && f.id === id[1]; })[0] : null;
    var facts = [], known = [], seen = Object.create(null), lost = 0;
    var cards = block.items.filter(isObject);
    // New facts first, in the order they come, then the known ones: the way the page lists a typed list for rehearsal.
    ['new', '', 'known'].forEach(function (role) {
      cards.forEach(function (item) {
        if (String(item.role || '') !== role) return;
        var f = parse(item.word);
        if (!f) { if (role !== 'known') lost++; return; }
        var key = b.factKey(f);
        if (role === 'known' && known.indexOf(key) < 0) known.push(key);
        if (!seen[key]) { seen[key] = true; facts.push(f); }
      });
    });
    var inSet = set ? set.facts.map(b.factKey) : [];
    var sign = { add: '+', sub: '-', mul: 'x', div: '/' };
    // known: the facts chosen as known. null = the teaching order's own choice (knownByOrder). The file names only the
    // known facts it uses, so they are the first of these that plan the same cards as the file: the teaching order's;
    // every fact of the set but the new ones; or the known facts in the file (and a note).
    var fileCards = cards.map(function (item) { var f = parse(item.word); return f ? b.factKey(f) : '?'; }).join(',');
    var same = function (input) { try { return b.planMathPractice(input).cards.map(function (c) { return b.factKey(c.fact); }).join(',') === fileCards; } catch (_) { return false; } };
    var newKeys = cards.filter(function (item) { return item.role === 'new'; }).map(function (item) { var f = parse(item.word); return f ? b.factKey(f) : ''; });
    var picks = [];
    if (method === 'rehearsal' && set) {
      var rest = inSet.filter(function (k) { return newKeys.indexOf(k) < 0; });
      var used = known.filter(function (k) { return inSet.indexOf(k) >= 0; });
      if (same({ mode: method, factSet: set.id })) picks = null;
      else if (same({ mode: method, factSet: set.id, known: used })) picks = used;
      else if (same({ mode: method, factSet: set.id, known: rest })) picks = rest;
      else { picks = used; out.notes.push('Check the facts chosen as known in step 2: the file does not say all of them.'); }
    } else if (method === 'rehearsal') {
      picks = known;
      if (!same({ mode: method, facts: facts, known: known })) out.notes.push('The cards may come in another order than in the file.');
    }
    out.math = { kind: set ? set.op : 'own', set: set ? set.id : '', facts: set ? '' : facts.map(function (f) { return f.a + ' ' + sign[f.op] + ' ' + f.b; }).join('\n'), method: method, known: picks };
    var title = String(lesson.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    var short = isObject(b.METHODS) && isObject(b.METHODS[method]) ? b.METHODS[method].short : '';
    out.title = title === (set ? set.title : 'My math facts') + ': ' + short ? '' : title;
    out.learner = learnerOf(got.manifest, e);
    if (lost) out.notes.push(lost === 1 ? 'One card could not be read back.' : lost + ' cards could not be read back.');
    if (!set && method === 'rehearsal') out.notes.push('Only the facts in the file come back. New facts that were waiting for another file are not in it: type them again.');
    if (out.learner) out.notes.push('It was made for ' + out.learner + '. That code name is filled in at step 3.');
    out.ok = true;
    out.kind = 'math';
    return out;
  }

  // identify(input, env) -> { ok: false, kind, why, page } for routing a file dropped on the wrong maker.
  function identify(input, env) {
    var e = env || {};
    var out = { ok: false, kind: 'other', why: '', page: null, teacherCode: false };
    var got = partsFor(input, e, out);
    if (!got) return out;
    if (got.kind === 'check' && isObject(got.lesson.check) && isObject(got.lesson.check.lock)) out.teacherCode = true;
    return elsewhere(got.kind, out);
  }

  // readVocab(input, env) -> { ok, kind, why, page, teacherCode, title, learner, notes, vocab }
  // Delegates full reconstruction to env.builder.readBack(parts) when provided; falls back cleanly to lesson blocks.
  function readVocab(input, env) {
    var e = env || {};
    var out = { ok: false, kind: 'other', why: '', page: null, teacherCode: false, title: '', learner: '', notes: [], vocab: null };
    var got = partsFor(input, e, out);
    if (!got) return out;
    if (got.kind !== 'vocab') return elsewhere(got.kind, out);
    if (e.builder && typeof e.builder.readBack === 'function') {
      var back = e.builder.readBack(got.parts);
      if (!back || !back.ok) {
        out.kind = 'other';
        out.why = (back && back.why) || 'This is not a file made with this page. Choose the .html file you saved in step 3.';
        return out;
      }
      out.ok = true;
      out.kind = 'vocab';
      out.vocab = back;
      out.title = back.title || '';
      out.learner = back.learner || '';
      out.teacherCode = !!back.teacherCode;
      return out;
    }
    var seen = Object.create(null), words = [], types = [];
    got.blocks.forEach(function (b) {
      var t = String(b.activity || '').replace(/^vocab_/, '');
      if (t && types.indexOf(t) < 0) types.push(t);
      list(b.items).forEach(function (it) {
        var w = isObject(it) ? String(it.word || '').trim() : '';
        var k = w.toLowerCase();
        if (w && !seen[k]) { seen[k] = true; words.push(w); }
      });
    });
    var mode = (isObject(got.manifest.packet) && got.manifest.packet.mode === 'check') || got.lesson.mode === 'probe' ? 'check' : 'practice';
    out.ok = true;
    out.kind = 'vocab';
    out.title = String(got.lesson.title || got.manifest.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    out.learner = learnerOf(got.manifest, e);
    out.teacherCode = isObject(got.lesson.check) && isObject(got.lesson.check.lock);
    out.vocab = { ok: true, words: words, types: types, mode: mode, title: out.title, learner: out.learner, teacherCode: out.teacherCode };
    return out;
  }

  // readReadAlong(input, env) -> { ok, kind, why, page, title, learner, notes, readAlong }
  // Delegates full reconstruction (including sentence clips) to env.builder.readBack(parts) when provided; falls back cleanly to lesson.blocks[0].items.
  function readReadAlong(input, env) {
    var e = env || {};
    var out = { ok: false, kind: 'other', why: '', page: null, teacherCode: false, title: '', learner: '', notes: [], readAlong: null };
    var got = partsFor(input, e, out);
    if (!got) return out;
    if (got.kind !== 'read') return elsewhere(got.kind, out);
    if (e.builder && typeof e.builder.readBack === 'function') {
      var back = e.builder.readBack(got.parts);
      if (!back || !back.ok) {
        out.kind = 'other';
        out.why = (back && back.why) || 'This is not a read-along file made on this page.';
        return out;
      }
      out.ok = true;
      out.kind = 'read';
      out.readAlong = back;
      out.title = back.title || '';
      out.learner = back.learner || '';
      return out;
    }
    var block = got.blocks[0], audio = isObject(got.lesson.audio) ? got.lesson.audio : {};
    var sentences = [], clips = Object.create(null);
    list(block && block.items).forEach(function (item) {
      list(isObject(item) ? item.lines : []).forEach(function (line) {
        var lineText = isObject(line) ? String(line.text || '').replace(/\s+/g, ' ').trim() : '';
        if (!lineText) return;
        var row = { text: lineText };
        if (line.para === true) row.para = true;
        sentences.push(row);
        var cid = typeof line.audio === 'string' ? line.audio : '';
        if (cid && own(audio, cid) && isSafeAudioDataUri(audio[cid])) clips[lineText] = audio[cid];
      });
    });
    if (!sentences.length) { out.kind = 'other'; out.why = 'This read-along file has no sentences.'; return out; }
    var passage = '';
    for (var i = 0; i < sentences.length; i++) {
      if (i > 0) passage += sentences[i].para ? '\n\n' : (/[.!?]["')\]]*$/.test(sentences[i - 1].text) ? ' ' : '\n');
      passage += sentences[i].text;
    }
    var title = String(got.manifest.title || got.lesson.title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (title === 'Read along') title = '';
    out.ok = true;
    out.kind = 'read';
    out.title = title;
    out.learner = learnerOf(got.manifest, e);
    out.readAlong = { ok: true, title: title, text: passage, sentences: sentences, voice: '', learner: out.learner, clips: clips, clipSources: {}, recordings: Object.keys(clips).length };
    return out;
  }

  var api = { read: read, readCheck: readCheck, readMath: readMath, readVocab: readVocab, readReadAlong: readReadAlong, identify: identify, wordOrder: wordOrder, creditOf: creditOf, PAGES: PAGES };
  root.AlloPacketReopen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
