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
//   { ok, kind: 'words' | 'check' | 'math' | 'vocab' | 'results' | 'other',
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
(function (root) {
  'use strict';

  var PAGES = {
    check: { href: 'packets-check.html', name: 'Make a math check' },
    math: { href: 'packets-math-practice.html', name: 'Make math fact practice' },
    vocab: { href: 'packets-vocab.html', name: 'Make vocabulary practice' },
    results: { href: 'packets-results.html', name: 'Add up results' },
    verify: { href: 'packets-verify.html', name: 'Look inside a file' },
  };
  var WORD = /^[a-z]{2,24}$/;
  var isObject = function (value) { return !!value && typeof value === 'object' && !Array.isArray(value); };
  var own = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  var list = function (value) { return Array.isArray(value) ? value : []; };
  function listed(names) { return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(''); }

  // The words of the file, in the order they were given: each activity keeps that order, and a word that got no
  // question in one activity is put back after the word before it in another.
  function wordOrder(blocks) {
    var lists = blocks.map(function (block) {
      var seen = {};
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
    var map = {};
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
    var out = { ok: false, kind: 'other', why: '', page: null, teacherCode: false, title: '', activities: [], words: [], version: '', pictures: false, learner: '', items: 0, own: {}, notes: [] };
    var no = function (kind, why, page) { out.kind = kind; out.why = why; out.page = page || null; return out; };
    if (!e.verify || typeof e.verify.readParts !== 'function') return no('other', 'This page could not read the file. Load the page again.');
    var parts = e.verify.readParts(input);
    if (parts.refused === 'too_big') return no('other', 'This file is larger than 60 MB, so it is not a practice file made here.');
    if (parts.refused === 'empty') return no('other', 'This file is empty.');
    if (parts.refused) return no('other', 'This browser could not read the file.');
    if (parts.kind === 'results') return no('results', 'This is a results file, not a practice file. Add up results reads it.', PAGES.results);
    if (!parts.ok || !parts.lesson) return no('other', 'This is not a practice file made with this page. Choose the .html file you saved in step 3.');
    var m = parts.manifest || {}, lesson = parts.lesson;
    var blocks = list(lesson.blocks).filter(function (block) { return isObject(block) && typeof block.activity === 'string' && Array.isArray(block.items); });
    var packet = isObject(m.packet) ? m.packet : {};
    // Vocabulary practice and vocabulary checks (packet_vocab_builder.js) are made, and opened again, on their own page.
    if (blocks.length && blocks.every(function (block) { return /^vocab_/.test(block.activity); })) return no('vocab', 'This is vocabulary ' + (packet.mode === 'check' || lesson.mode === 'probe' ? 'check' : 'practice') + '. Make vocabulary practice makes it, and can open it again.', PAGES.vocab);
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
          var uri = typeof item.wordAudio === 'string' && isObject(lesson.audio) ? lesson.audio[item.wordAudio] : '';
          if (typeof uri === 'string' && /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3);base64,/i.test(uri)) { clip = uri; return true; }
          return false;
        });
        if (clip) entry(word).clip = { dataUri: clip, source: 'teacher' }; else lost.recordings.push(word);
      });
      list(mine.pictures).forEach(function (row) {
        if (!isObject(row) || typeof row.word !== 'string' || out.words.indexOf(row.word) < 0) return;
        var uri = '';
        itemsOf(blocks, null, row.word).some(function (item) {
          var at = typeof item.wordPicture === 'string' && isObject(lesson.images) ? lesson.images[item.wordPicture] : '';
          if (typeof at === 'string' && /^data:image\/(?:png|jpeg|svg\+xml);base64,/.test(at)) { uri = at; return true; }
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

  var api = { read: read, wordOrder: wordOrder, creditOf: creditOf, PAGES: PAGES };
  root.AlloPacketReopen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
