// Word Sounds packet builder: makes a practice file from a word list with no AI and no app.
// One plain script for a browser page (window.AlloPacketBuilder) and for node (module.exports).
// It calls nothing on the network; the caller hands it every input.
//
// The functions inside createPackLogic are COPIES of pure logic in word_sounds_setup_source.jsx
// (the app's "Prepare lesson"). tests/word_sounds_packet_builder.test.js runs both and compares,
// so keep the bodies close to the originals and change them together.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-packet-builder/0.1.0';
  var SUPPORTED = ['isolation', 'segmentation', 'counting', 'mapping', 'missing_letter', 'orthography', 'word_scramble',
    'spelling_bee', 'letter_tracing', 'blending', 'rhyming', 'word_families', 'sound_sort'];
  var LENGTHS = { short: 5, medium: 10, long: 15 };
  // Familiarity cut-off for pickWords: a word is familiar when the app's own K-2 lists hold it, or
  // children's books use it often enough: Zipf frequency in CYP-LEX books for ages 7-9 at or above
  // DEFAULT_MIN_ZIPF, in at least DEFAULT_MIN_BOOKS of its 400 books (a name is usually in few books).
  // Both numbers were chosen by reading real output on 2026-11-11; see data/vendor/cyplex/source.json
  // for what the data is and is not.
  var DEFAULT_MIN_ZIPF = 3.8;
  var DEFAULT_MIN_BOOKS = 20;
  // The wider levels (2026-11-16), for older students, enrichment and spelling practice. They are NOT grade levels: no
  // curriculum document is behind them, only how widely a word is used in the children's books. A word is in a wider
  // level when it is not familiar (the rule above), is on the list of words read and kept for this (row.wider), and
  //   'challenging': is in at least WIDER_MIN_BOOKS of the 400 books;   'advanced': is in fewer, or in none.
  var WIDER_LEVELS = ['challenging', 'advanced'];
  var WIDER_MIN_BOOKS = 10;
  // How long a practice word may be. The picker keeps to GRADE_MAX_LETTERS at a grade level (and with no level), as it
  // always has; at a wider level, and for a word a teacher types, the limit is MAX_LETTERS (2026-11-16: 10 until then,
  // which kept "photosynthesis" and 3,200 other read-and-kept words out). Each activity's screen was checked on a
  // phone with words of 11 to 15 letters before the limit moved (C:\tmp\overnight_1116\advanced\long_words_probe.cjs).
  var GRADE_MAX_LETTERS = 10;
  var MAX_LETTERS = 15;
  // A word that can be a practice TARGET: letters only, 2 to MAX_LETTERS letters, with a vowel. (The app's own rule,
  // isUnusableAsPhonicsWord below, still says 10: it is a copy of the app's and filters the pools of wrong answers.)
  function unusableTarget(word) {
    var v = String(word == null ? '' : word).trim();
    return !/^[a-zA-Z]+$/.test(v) || v.length < 2 || v.length > MAX_LETTERS || !/[aeiouy]/i.test(v);
  }
  // The older rule (place in the reading-library frequency list, built from old books). It applies
  // only when the word list carries no child-book column, or when the caller passes maxRank.
  var DEFAULT_MAX_RANK = 4000;
  // pickWords: the most common words first, mixed by the seed in runs of this many (see the end of pickWords).
  var COMMON_BAND = 30;

  // The notice of data/vendor/cmudict/LICENSE, word for word: the sound labels come from CMUdict.
  var CMUDICT_NOTICE = [
    'Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.',
    '',
    'Redistribution and use in source and binary forms, with or without',
    'modification, are permitted provided that the following conditions',
    'are met:',
    '',
    '1. Redistributions of source code must retain the above copyright',
    '   notice, this list of conditions and the following disclaimer.',
    '   The contents of this file are deemed to be source code.',
    '',
    '2. Redistributions in binary form must reproduce the above copyright',
    '   notice, this list of conditions and the following disclaimer in',
    '   the documentation and/or other materials provided with the',
    '   distribution.',
    '',
    'This work was supported in part by funding from the Defense Advanced',
    'Research Projects Agency, the Office of Naval Research and the National',
    'Science Foundation of the United States of America, and by member',
    'companies of the Carnegie Mellon Sphinx Speech Consortium. We acknowledge',
    'the contributions of many volunteers to the expansion and improvement of',
    'this dictionary.',
    '',
    "THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY ``AS IS'' AND",
    'ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,',
    'THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR',
    'PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY',
    'NOR ITS EMPLOYEES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,',
    'SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT',
    'LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,',
    'DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY',
    'THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT',
    '(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE',
    'OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',
  ].join('\n');
  var ATTRIBUTIONS = [
    'Word sounds: Carnegie Mellon Pronouncing Dictionary (CMUdict), Copyright (C) 1993-2015 Carnegie Mellon University, converted to sound labels by AlloFlow',
    'Machine-made recordings: Kokoro-82M text-to-speech (voice af_heart)',
    'Machine-made recordings: Google Gemini text-to-speech, made ahead of time',
  ];

  // ---------------------------------------------------------------------------
  // Pictures (only with pictures: true): Mulberry Symbols, vendored in data/vendor/mulberry, and OpenMoji
  // (data/vendor/openmoji) for words Mulberry has none for, handed in as `symbols` (word_sounds_symbols_en.js).
  // Nothing is fetched here.
  // ---------------------------------------------------------------------------
  // The credit holds what the app's MULBERRY_CREDIT holds (alt_text_source.jsx): set, author,
  // license and the two addresses, written out because a practice file has no links. The app adds
  // "via Global Symbols" because it searches there; these come from the set's own release.
  // The two addresses are written without "https" and its two slashes: a practice file, and this
  // file, hold no web address at all, and their checks look for that scheme.
  var MULBERRY_CREDIT = { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0',
    licenseUrl: 'creativecommons.org/licenses/by-sa/4.0/', url: 'mulberrysymbols.org' };
  // words (optional): named when the file also holds pictures of another set.
  function pictureCredit(words) {
    var c = MULBERRY_CREDIT;
    return (words && words.length ? 'Pictures for ' + words.join(', ') + ': ' : 'Pictures: ') + c.set + ' by ' + c.author + ', ' + c.license + ' (' + c.licenseUrl + '), ' + c.url;
  }
  // The second set, OpenMoji (data/vendor/openmoji), for words Mulberry has no symbol for. A symbol from it
  // says so (symbol.set === 'openmoji'). Its credit and notice are in a file only when one of its pictures is,
  // and name the words that show one. The wording follows the project's own suggestion ("All emojis designed
  // by OpenMoji - the open-source emoji and icon project. License: CC BY-SA 4.0"), for the emoji only.
  var OPENMOJI_CREDIT = { set: 'OpenMoji', author: 'the OpenMoji project', license: 'CC BY-SA 4.0',
    licenseUrl: 'creativecommons.org/licenses/by-sa/4.0/', url: 'openmoji.org' };
  function openMojiCredit(words) {
    var c = OPENMOJI_CREDIT;
    return 'Pictures for ' + words.join(', ') + ': designed by ' + c.set + ' - the open-source emoji and icon project. License: ' + c.license + ' (' + c.licenseUrl + '), ' + c.url;
  }
  function openMojiNotice(words, version) {
    var title = OPENMOJI_CREDIT.set + (version ? ' ' + version : '');
    return [
      title,
      new Array(title.length + 1).join('='),
      '',
      'Emoji pictures designed by OpenMoji - the open-source emoji and icon project. License: CC BY-SA 4.0',
      '',
      'OpenMoji graphics are licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.',
      '',
      'To view a copy of this license, visit creativecommons.org/licenses/by-sa/4.0/',
      '',
      'The pictures in this file for ' + words.join(', ') + ' are from that set (openmoji.org). They are a separate',
      'work from the program in this file and stay under that license (CC BY-SA 4.0): you may copy and share them,',
      'and change them, as long as you give this credit and share changed pictures under the same license.',
      'The drawings are unchanged but for the space between their parts. Each one is stored inside this file as text.',
    ].join('\n');
  }
  // Down to the license address this is data/vendor/mulberry/LICENSE.txt, word for word but for the
  // scheme of that address; the rest says what this file does with the pictures. Share-alike: they
  // stay a separately licensed work.
  var MULBERRY_NOTICE = [
    'The Mulberry Symbol set',
    '=======================',
    '',
    'Copyright 2018-2026 Steve Lee',
    '',
    'This work is licensed under the Creative Commons Attribution-Share Alike License.',
    '',
    'To view a copy of this license, visit creativecommons.org/licenses/by-sa/4.0/',
    '',
    'The pictures in this file are from that set (mulberrysymbols.org). They are a separate work from',
    'the program in this file and stay under that license (CC BY-SA 4.0): you may copy and share them, and',
    'change them, as long as you give this credit and share changed pictures under the same license.',
    'The drawings are unchanged. Each one is stored inside this file as text.',
  ].join('\n');
  // The same notice for a file that also holds OpenMoji pictures: it names the words whose pictures are Mulberry's.
  function mulberryNotice(words) {
    return words && words.length ? MULBERRY_NOTICE.replace('The pictures in this file are from that set', 'The pictures in this file for ' + words.join(', ') + ' are from that set') : MULBERRY_NOTICE;
  }
  // Why an SVG may not go into a file, or '' when it may. The symbols are vendored and were tested
  // when their data file was made; this tests each one again as it is written into a packet. A
  // drawing shown through <img> cannot run script or load anything, so every test is a second lock.
  var SVG_MAX = 300000;
  function svgRefusal(svg) {
    var text = typeof svg === 'string' ? svg : '';
    if (!/^\s*<svg[\s>]/.test(text) || !/<\/svg>\s*$/.test(text)) return 'not an SVG drawing';
    if (text.length > SVG_MAX) return 'the drawing is too large';
    if (text.indexOf('\\') >= 0) return 'an escape character';
    if (/<!(?:doctype|entity)/i.test(text)) return 'a document type or entity declaration';
    if (/<\?(?!xml\s)/i.test(text)) return 'a processing instruction';
    // Read character references the way a browser does, so "java&#115;cript:" is seen.
    var plain = text.replace(/&#x([0-9a-f]+);?/gi, function (m, hex) { return String.fromCharCode(parseInt(hex, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (m, dec) { return String.fromCharCode(Number(dec) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (m, name) { return name.toLowerCase() === 'colon' ? ':' : ''; });
    // A browser ignores spaces and control characters inside an address.
    var packed = plain.replace(/[\x00-\x20]+/g, '');
    var bare = function (value) { return String(value || '').replace(/[\x00-\x20]+/g, ''); };
    if (/<\s*(?:[^\s<>"'=/:]+:)?script\b/i.test(plain)) return 'a script';
    if (/<\s*(?:[^\s<>"'=/:]+:)?foreignObject\b/i.test(plain)) return 'a foreignObject';
    if (/<\s*(?:[^\s<>"'=/:]+:)?(?:iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'an element that is not a drawing';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain)) return 'an event handler';
    if (/(?:java|vb|live)script:/i.test(packed)) return 'a script address';
    if (/xml:base\s*=/i.test(plain)) return 'a base address';
    // Every link must point inside the drawing itself ("#name"): no other file, no site, no data: address.
    var m, href = /(?:[\s"'\/])(?:[^\s<>"'=/:]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    if (/[\s"'\/]src(?:doc)?\s*=/i.test(plain)) return 'a link to something outside the drawing';
    if (/(?:-[a-z]+-)?image-set\s*\(|expression\s*\(/i.test(plain)) return 'a style block that loads something';
    // A style block may not load anything: no @import, no url(), no font. Check both raw and decoded text so entity-encoded quotes cannot fake "/>".
    var checkStyleIn = function (src) {
      var style = /<\s*(?:[^\s<>"'=/:]+:)?style\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
      var sm;
      while ((sm = style.exec(src))) {
        var rest = src.slice(style.lastIndex);
        var end = rest.search(/<\s*\/\s*(?:[^\s<>"'=/:]+:)?style\s*>/i);
        if (/\/\s*>$/.test(sm[0]) && end < 0) continue;
        var css = end < 0 ? rest : rest.slice(0, end);
        if (end < 0 || /@import|@font-face|@namespace|url\s*\(|(?:-[a-z]+-)?image-set\s*\(|expression\s*\(/i.test(css)) return 'a style block that loads something';
      }
      return '';
    };
    var styleBad = checkStyleIn(text) || checkStyleIn(plain);
    if (styleBad) return styleBad;
    // Anywhere else, url(...) may only name something inside the drawing: fill="url(#a)".
    var url = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = url.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    return '';
  }
  // The address a practice file may show: its rule allows img-src data: and nothing else.
  function svgDataUri(svg) { return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); }

  // ---------------------------------------------------------------------------
  // The teacher's own material (opts.own): a split into sounds, a recording, a picture, for some of
  // the words. A page reads it from the device store (packets_my_words.js); the builder trusts none
  // of it. Every part is checked here, and a part that fails is left out and listed (manifest.own.refused).
  //
  //   opts.own = { zayden: { sounds, spelling, clip, picture }, ... }      keys: the practice words
  //     sounds    ['z', 'ay', 'd', 'schwa', 'n']: 1 to 24 labels, each one of the sound dictionary's
  //               labels (dictionary.labels, else SOUND_LABELS). Also taken as { sounds, spelling }, the
  //               store's shape. With sounds, a word that is not in the dictionary can be used.
  //     spelling  optional, [{ text: 'z', size: 1 }, ...]: the letters for each sound (core.alignGraphemes
  //               shape; size 2 = one spelling for two sounds, as x in box). The texts must spell the
  //               word and the sizes must add up to the number of sounds. Without it the aligner splits.
  //     clip      'data:audio/wav;base64,...' or { dataUri }: WAV or MP3 only, at most OWN_LIMITS.clipBytes,
  //               and its first bytes must be what its type says. It is the word's recording in the file.
  //     picture   { dataUri, credit }: PNG, JPEG or an SVG that passes svgRefusal, at most
  //               OWN_LIMITS.pictureBytes, first bytes checked. credit is { own: true } (the teacher's own
  //               file) or { title, author, license, licenseUrl, source, sourceUrl, resized } with an open
  //               license (OPEN_LICENSE). Shown only with pictures: true, in place of the word's symbol.
  //   A blocked word is refused before any of it is read, exactly as without it. Answer choices are taken
  //   as before: a teacher's word is a choice only where it is itself a practice word.
  //   With no opts.own (or none for these words) the file is byte for byte what it was before.
  // ---------------------------------------------------------------------------
  // The labels of word_sounds_phonemes_en.js (dictionary.labels); a test keeps the two the same.
  var SOUND_LABELS = ['a', 'e', 'i', 'o', 'u', 'ay', 'ee', 'ie', 'oa', 'oo', 'oo_short', 'oy', 'ow', 'aw', 'ar', 'or', 'er', 'ir', 'ur', 'air', 'ear', 'schwa',
    'b', 'ch', 'd', 'dh', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'ng', 'p', 'r', 's', 'sh', 't', 'th', 'v', 'w', 'y', 'z', 'zh'];
  // The limits of packets_my_words.js (LIMITS there): a test keeps them the same.
  var OWN_LIMITS = Object.freeze({ sounds: 24, clipBytes: 409600, pictureBytes: 204800 });
  // The licenses a picture of the teacher's may carry into a file: public domain, CC0, CC BY, CC BY-SA
  // (the ones packets-pictures.html shows). Anything else is refused.
  var OPEN_LICENSE = /^(?:CC0|Public domain|CC BY(?:-SA)?(?: \d(?:\.\d)?)?(?: [a-z]{2,5})?)$/i;
  var SHARE_ALIKE = /^CC BY-SA\b/i;
  var OWN_PICTURE_LINE = 'Picture added by the teacher.';
  var SHARE_ALIKE_NOTICE = [
    'Pictures under a share-alike license',
    '====================================',
    '',
    'Some pictures in this file were chosen by the teacher and are under a Creative Commons',
    'Attribution-ShareAlike license (CC BY-SA). Each one is a separate work from the program in this file',
    'and stays under its own license: you may copy and share it, and change it, as long as you give its',
    'credit and share a changed picture under the same license. A picture marked "made smaller" was',
    'resized to fit in this file. The credit for each one:',
  ].join('\n');

  function isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  // One line of plain text, the way packets_my_words.js keeps it: no control characters, single spaces.
  function plainLine(value, max) {
    return (typeof value === 'string' || typeof value === 'number' ? String(value) : '').replace(/[\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  // A credit's words come from a picture service. In a file they are data, but "Check a file" reads every
  // character of it: a title where a word such as open sits just before a bracket would read as code there. Brackets for parentheses,
  // and no colon after a script or data scheme, keep the words and lose the likeness. In an address the
  // same characters are written the other way an address may write them (%28, %29, %2E, %3A).
  function creditText(value, max) {
    return plainLine(value, max).replace(/[()]/g, function (p) { return p === '(' ? '[' : ']'; })
      .replace(/\b(javascript|vbscript|livescript|data)\s*:/gi, '$1 -').replace(/\.(\s*cookie)\b/gi, ' $1');
  }
  function addressText(value) {
    return plainLine(value, 500).replace(/^[a-z][a-z0-9+.-]*:\/*/i, '').replace(/[\s"'<>`]/g, '')
      .replace(/[()]/g, function (p) { return p === '(' ? '%28' : '%29'; }).replace(/\b(javascript|vbscript|livescript|data):/gi, '$1%3A').replace(/\.(cookie)\b/gi, '%2E$1');
  }
  // creditLine of packets_my_words.js, the same sentence (a test compares the two), from cleaned words.
  function creditLine(credit) {
    if (!isPlainObject(credit)) return '';
    if (credit.own === true) return OWN_PICTURE_LINE;
    var bare = addressText;
    var title = creditText(credit.title, 200).replace(/"/g, "'"), author = creditText(credit.author, 200), license = plainLine(credit.license, 60);
    var licenseAt = bare(credit.licenseUrl), source = creditText(credit.source, 80), sourceAt = bare(credit.sourceUrl);
    var parts = [];
    if (title) parts.push('"' + title + '"' + (author ? ' by ' + author : ''));
    else if (author) parts.push('Picture by ' + author);
    else parts.push('Picture');
    if (license) parts.push(license + (licenseAt ? ' (' + licenseAt + ')' : ''));
    if (source || sourceAt) parts.push('from ' + (source || sourceAt) + (source && sourceAt ? ' (' + sourceAt + ')' : ''));
    if (credit.resized === true) parts.push('made smaller');
    return (parts.join(', ') + '.').replace(/\b[a-z][a-z0-9+.-]{1,12}:\/\/+/gi, '').replace(/\/{2,}/g, '/').replace(/\.\.$/, '.');
  }

  // A base64 data: address -> { type, bytes, head (its first bytes, as text) }, or null.
  function readDataUri(uri) {
    var text = typeof uri === 'string' ? uri : '';
    var found = /^data:([a-z0-9.+\/-]+);base64,/i.exec(text.slice(0, 100));
    if (!found) return null;
    var body = text.slice(found[0].length);
    if (!body || body.length % 4 !== 0 || !/^[A-Za-z0-9+\/]+={0,2}$/.test(body)) return null;
    var head;
    try { head = atob(body.slice(0, 24)); } catch (_) { return null; }
    return { type: found[1].toLowerCase(), body: body, bytes: body.length / 4 * 3 - (body.slice(-2) === '==' ? 2 : body.slice(-1) === '=' ? 1 : 0), head: head };
  }
  var WAV_TYPES = /^audio\/(?:wav|x-wav|wave)$/, MP3_TYPES = /^audio\/(?:mpeg|mp3)$/;
  function ownClipRefusal(uri) {
    var got = readDataUri(uri);
    if (!got || !/^audio\//.test(got.type)) return 'not a recording';
    if (!WAV_TYPES.test(got.type) && !MP3_TYPES.test(got.type)) return 'not a WAV or MP3 recording';
    if (got.bytes > OWN_LIMITS.clipBytes) return 'the recording is larger than ' + Math.round(OWN_LIMITS.clipBytes / 1024) + ' KB';
    var head = got.head;
    var wav = head.slice(0, 4) === 'RIFF' && head.slice(8, 12) === 'WAVE';
    var mp3 = head.slice(0, 3) === 'ID3' || (head.charCodeAt(0) === 0xFF && (head.charCodeAt(1) & 0xE0) === 0xE0);
    if (WAV_TYPES.test(got.type) ? !wav : !mp3) return 'the recording is not the kind of file its type says';
    if (got.bytes < 64) return 'the recording is empty';
    return '';
  }
  function ownPictureRefusal(picture) {
    if (!isPlainObject(picture)) return 'not a picture';
    var got = readDataUri(picture.dataUri);
    if (!got || ['image/png', 'image/jpeg', 'image/svg+xml'].indexOf(got.type) < 0) return 'not a PNG, JPEG or SVG picture';
    if (got.bytes > OWN_LIMITS.pictureBytes) return 'the picture is larger than ' + Math.round(OWN_LIMITS.pictureBytes / 1024) + ' KB';
    var head = got.head;
    if (got.type === 'image/png' && head.slice(0, 8) !== '\x89PNG\r\n\x1a\n') return 'the picture is not the kind of file its type says';
    if (got.type === 'image/jpeg' && head.slice(0, 3) !== '\xFF\xD8\xFF') return 'the picture is not the kind of file its type says';
    if (got.type === 'image/svg+xml') {
      var svg;
      try { svg = decodeURIComponent(escape(atob(got.body))); } catch (_) { return 'the drawing could not be read'; }
      var why = svgRefusal(svg);
      if (why) return 'the drawing holds ' + why;
    }
    var credit = picture.credit;
    if (!isPlainObject(credit)) return 'the picture has no credit';
    var isBuiltinAlloFlow = plainLine(credit.license, 60) === 'AGPL-3.0'
      && plainLine(credit.author, 80) === 'AlloFlow'
      && plainLine(credit.source, 80) === 'AlloFlow Curriculum Diagrams';
    if (credit.own !== true && !isBuiltinAlloFlow && !OPEN_LICENSE.test(plainLine(credit.license, 60))) return 'the picture has no open license (public domain, CC0, CC BY or CC BY-SA)';
    return '';
  }
  // opts.own, checked, for the words asked: { byWord: { word: { sounds, spelling, clip, picture } }, refused, words }.
  function readOwn(given, asked, labels) {
    var out = { byWord: Object.create(null), refused: [], words: [] };
    if (!isPlainObject(given)) return out;
    var inventory = Array.isArray(labels) && labels.length ? labels : SOUND_LABELS;
    var refuse = function (word, part, reason) { out.refused.push({ word: word, part: part, reason: reason }); };
    asked.forEach(function (word) {
      if (out.byWord[word] || !own(given, word) || !isPlainObject(given[word])) return;
      var entry = given[word], mine = {};
      // Sounds, with their spelling: one part. The letters must spell the word.
      var soundsGiven = Array.isArray(entry.sounds) ? { sounds: entry.sounds, spelling: entry.spelling } : isPlainObject(entry.sounds) ? entry.sounds : null;
      if (soundsGiven) {
        var list = Array.isArray(soundsGiven.sounds) ? soundsGiven.sounds : [];
        var spelling = soundsGiven.spelling != null ? soundsGiven.spelling : entry.spelling;
        if (!list.length || list.length > OWN_LIMITS.sounds || !list.every(function (s) { return typeof s === 'string' && inventory.indexOf(s) >= 0; })) {
          refuse(word, 'sounds', 'not every sound is one this tool knows (1 to ' + OWN_LIMITS.sounds + ' sounds)');
        } else if (spelling != null) {
          var spelled = '', covered = 0, rows = [];
          var fine = Array.isArray(spelling) && spelling.length > 0 && spelling.every(function (chunk) {
            var text = typeof chunk === 'string' ? chunk : isPlainObject(chunk) ? chunk.text : null;
            var size = isPlainObject(chunk) && chunk.size === 2 ? 2 : 1;
            if (typeof text !== 'string' || !/^[a-z]{1,6}$/.test(text)) return false;
            rows.push({ text: text, start: covered, size: size, at: spelled.length });
            spelled += text; covered += size;
            return true;
          });
          if (!fine || spelled !== word || covered !== list.length) refuse(word, 'sounds', 'the letters for each sound do not spell the word');
          else { mine.sounds = list.slice(); mine.spelling = rows; }
        } else mine.sounds = list.slice();
      }
      if (entry.clip != null) {
        var clip = typeof entry.clip === 'string' ? entry.clip : isPlainObject(entry.clip) ? entry.clip.dataUri : null;
        var noClip = ownClipRefusal(clip);
        if (noClip) refuse(word, 'clip', noClip); else mine.clip = clip;
      }
      if (entry.picture === 'none' || (isPlainObject(entry.picture) && entry.picture.none === true)) {
        mine.noPicture = true;
      } else if (entry.picture != null) {
        var noPicture = ownPictureRefusal(entry.picture);
        if (noPicture) refuse(word, 'picture', noPicture);
        else {
          var credit = entry.picture.credit.own === true ? { own: true } : entry.picture.credit;
          mine.picture = { uri: entry.picture.dataUri, own: credit.own === true, line: creditLine(credit), shareAlike: credit.own !== true && SHARE_ALIKE.test(plainLine(credit.license, 60)) };
        }
      }
      out.words.push(word);
      if (mine.sounds || mine.clip || mine.picture || mine.noPicture) out.byWord[word] = mine;
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Seeded order
  // ---------------------------------------------------------------------------
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fnv1a(text) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function seedFor(seed, word) { return fnv1a(String(seed == null ? '' : seed) + '|' + String(word)); }
  function hex8(n) { return ('0000000' + (n >>> 0).toString(16)).slice(-8); }

  // The order of a file's questions across its activities (2026-11-18, owner): opts.order 'mixed' (the activities take
  // turns, in a seeded order) or the teacher's own order (an array of 'activity|word' keys, the keys the Preview page's
  // edits use). Anything else, one activity and a check: null, one activity at a time as before. Each activity keeps its
  // own order inside a mix. Returns the item ids in the order shown, or null when that is the usual order.
  function questionOrder(lesson, order, seed) {
    var blocks = (lesson.blocks || []).filter(function (b) { return b && Array.isArray(b.items) && b.items.length; });
    if (blocks.length < 2 || lesson.mode === 'probe') return null;
    var usual = [];
    blocks.forEach(function (b) { b.items.forEach(function (it) { usual.push(String(it.id)); }); });
    var ids;
    if (Array.isArray(order)) {
      var byKey = Object.create(null), used = Object.create(null);
      blocks.forEach(function (b) { b.items.forEach(function (it) { byKey[String(b.activity) + '|' + String(it.word || '').toLowerCase()] = String(it.id); }); });
      ids = [];
      order.forEach(function (key) {
        var text = String(key), at = text.indexOf('|');
        var id = at > 0 ? byKey[text.slice(0, at) + '|' + text.slice(at + 1).toLowerCase()] : null;
        if (id && !used[id]) { used[id] = true; ids.push(id); }
      });
      // A question the order does not name (a word added since it was set) comes after the others.
      usual.forEach(function (id) { if (!used[id]) ids.push(id); });
    } else if (order === 'mixed') {
      ids = mixedOrder(blocks, seed);
    } else return null;
    return ids.join(',') === usual.join(',') ? null : ids;
  }
  // A mix: the next question's activity is drawn by how many questions it has left, so the activities are spread
  // through the file, and no activity comes three times running while another still has questions.
  function mixedOrder(blocks, seed) {
    var random = mulberry32(seedFor(seed, 'question-order'));
    var left = blocks.map(function (b) { return b.items.map(function (it) { return String(it.id); }); });
    var total = left.reduce(function (n, l) { return n + l.length; }, 0);
    var out = [], last = -1, run = 0;
    while (out.length < total) {
      var open = [];
      left.forEach(function (l, i) { if (l.length && !(i === last && run >= 2)) open.push(i); });
      if (!open.length) open = [last];
      var weight = open.reduce(function (n, i) { return n + left[i].length; }, 0);
      var draw = random() * weight, chosen = open[open.length - 1];
      for (var k = 0; k < open.length; k++) { draw -= left[open[k]].length; if (draw < 0) { chosen = open[k]; break; } }
      out.push(left[chosen].shift());
      run = chosen === last ? run + 1 : 1;
      last = chosen;
    }
    return out;
  }

  // Choices (2026-11-13, the maker's "Choices": easy, medium or all). Below Hard the app shows fewer choices, with the
  // core's own functions: Find Sounds asks the first sound (Easy) or the first or last (Medium)
  // (isolationPositions) and shows 3 or 4 sounds; Rhyme Time shows 3 or 4 words (choiceLimit + trimChoices, as
  // trimSoundChoices in word_sounds_module.js: the answer stays, far choices first, Medium keeps one near one);
  // Blend Sounds shows 3 words at Easy and every word (6) at Medium (the owner, 2026-11-16: only Easy trims it; the
  // app still shows 4 at Medium); Sound Counting shows the count with two either side (Easy) or 1-8 (Medium)
  // (countingChoices). All (and no level) leaves every board as built. Seeded by the version and the word, so a file
  // is the same each time.
  var CHOICE_LEVELS = ['easy', 'medium', 'all'];
  // A row of consecutive numbers that holds the count n, slid by h (a hash): the row keeps its length, starts at 1 or
  // more, ends at 6 or at n + 1 at most (so the answer is not always the largest), and holds n.
  function slideCount(numbers, n, h) {
    var w = numbers.length, top = Math.max(6, n + 1);
    var lowMin = Math.max(1, n - w + 1), lowMax = Math.min(n, top - w + 1);
    if (!(w > 1) || lowMax < lowMin) return numbers;
    var low = lowMin + ((h >>> 0) % (lowMax - lowMin + 1));
    var out = [];
    for (var v = low; v < low + w; v++) out.push(v);
    return out;
  }
  function fewerChoices(boards, level, word, phonemes, core, seed) {
    var trim = function (options, answer, same, closeness) {
      var count = core.choiceLimit(level, options.length);
      if (!(count < options.length)) return options;
      return core.trimChoices({ options: options, answer: answer, count: count, difficulty: level, same: same, closeness: closeness });
    };
    var iso = boards.isolation;
    var sounds = (Array.isArray(phonemes) ? phonemes : []).map(function (p) { return core.phonemeLabel(p, true); }).filter(Boolean);
    if (iso && Array.isArray(iso.options) && iso.options.indexOf(iso.correctSound) >= 0) {
      var allowed = sounds.length ? core.isolationPositions(level, sounds.length) : [0];
      if (sounds.length && allowed.indexOf(iso.position) < 0) {
        var position = allowed[seedFor(seed, 'isolation|' + word) % allowed.length];
        var correct = sounds[position];
        if (correct) {
          // The same number of sounds, the new answer among them, in a seeded order.
          var random = mulberry32(seedFor(seed, 'isolation-order|' + word));
          var options = [correct].concat(iso.options.filter(function (o) { return o !== correct; })).slice(0, iso.options.length);
          for (var i = options.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)); var t = options[i]; options[i] = options[j]; options[j] = t; }
          iso = boards.isolation = { position: position, correctSound: correct, options: options };
        }
      }
      // Two spellings of one sound count as the same choice (the app's soundSame).
      var same = function (a, b) {
        var x = String(a == null ? '' : a).toLowerCase().trim(), y = String(b == null ? '' : b).toLowerCase().trim();
        return !!x && !!y && (x === y || core.soundAnswerMatches(x, y) || (typeof core.soundKey === 'function' && core.soundKey(x) === core.soundKey(y)));
      };
      iso.options = trim(iso.options, iso.correctSound, same, core.soundCloseness);
    }
    ['blending', 'rhyming'].forEach(function (id) {
      if (id === 'blending' && level !== 'easy') return;
      var board = boards[id];
      if (board && Array.isArray(board.options) && board.answer && board.options.indexOf(board.answer) >= 0) board.options = trim(board.options, board.answer, undefined, core.wordCloseness);
    });
    var counting = boards.counting;
    var numbers = counting ? core.countingChoices(Number(counting.answer), level) : null;
    // 2026-11-18 (review): Easy's row (the count with two either side, inside 1-6) puts the answer third for every
    // word of 3 or more sounds, and last from 6 on: a child could answer without counting. The same number of
    // buttons, slid so the answer can be in another place (seeded: a file is the same each time).
    if (numbers && level === 'easy') numbers = slideCount(numbers, Number(counting.answer), seedFor(seed, 'counting|' + word));
    if (numbers) counting.options = numbers;
    // Break it Down at Easy (2026-11-18, owner): the word's own sounds and one more, not up to five more. The order stays.
    var seg = boards.segmentation;
    if (level === 'easy' && seg && Array.isArray(seg.chips)) {
      var extra = 0;
      seg.chips = seg.chips.filter(function (c) { if (!c || !(c.isDistractor || c.type === 'distractor')) return true; extra += 1; return extra <= 1; });
    }
    // Sight & Spell at Easy (2026-11-19, Wave 6B parity with word_sounds_module.js:23504-23521):
    // scaffold the tile bank to the word's own letters plus up to 4 seeded distractors (sorted
    // alphabetically so tiles are easy to scan without leaking letter order) and show a word-length
    // placeholder. Omitted on Medium and Hard so existing packets stay unchanged.
    var ortho = boards.orthography;
    if (level === 'easy' && ortho) {
      var orthoLower = String(word || '').toLowerCase();
      var orthoLetterRe = null;
      try { orthoLetterRe = new RegExp('[\\p{L}\\p{M}\\p{N}]', 'u'); } catch (_) {}
      var orthoChars = orthoLower.split('').filter(function (ch) {
        return ch.trim() && (/[a-z]/.test(ch) || (orthoLetterRe ? orthoLetterRe.test(ch) : !/^['’\-.]$/.test(ch)));
      });
      if (orthoChars.length > 1) {
        var wordLetters = [];
        var inWord = Object.create(null);
        orthoChars.forEach(function (ch) {
          if (!inWord[ch]) { inWord[ch] = true; wordLetters.push(ch); }
        });
        var pool = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(function (l) { return !inWord[l]; });
        var randOrtho = mulberry32(seedFor(seed, 'orthography|' + orthoLower));
        var distractors = [];
        while (distractors.length < 4 && pool.length) {
          distractors.push(pool.splice(Math.floor(randOrtho() * pool.length), 1)[0]);
        }
        ortho.letterBank = wordLetters.concat(distractors).sort();
        ortho.lengthHint = true;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // One right answer (2026-11-13, the answer audit: C:\tmp\packets_build_1111\answer_audit\RESULTS.txt). A file is heard:
  // its choices are clips, not printed words. So after the boards are made (and trimmed by Choices) each one is judged
  // by the sound dictionary: a wrong choice that sounds the same as the answer (sun, son), or rhymes with the word, in
  // any way the dictionary says it (a recording says one of them: bow, read), or is
  // graded right by the player's spelling rule (rolled, glowed: both end in -ed) is taken off; a Word Families board
  // whose ending, said alone, is another sound (-own for down) is left out; a missing letter that spells a word that
  // sounds the same (see: "sea") is swapped for another letter of its kind; a word that sounds like another word a child
  // knows (bare, bear) gets no typed spelling, since hearing it cannot tell which spelling is meant. A board left with
  // one choice is left out. Each change happens only where the dictionary says so; every other board is as it was.
  // ---------------------------------------------------------------------------
  var SAME_SOUND = { ir: 'er', ur: 'er' };   // the dictionary spells the sound of her three ways (bird, burn, her)
  var GUARD_VOWELS = { a: 1, e: 1, i: 1, o: 1, u: 1, ay: 1, ee: 1, ie: 1, oa: 1, oo: 1, oo_short: 1, oy: 1, ow: 1, aw: 1, ar: 1, or: 1, er: 1, ir: 1, ur: 1, air: 1, ear: 1, schwa: 1 };
  function soundOf(label) { var l = String(label == null ? '' : label); return own(SAME_SOUND, l) ? SAME_SOUND[l] : l; }
  // The player's spelling rime (word_sounds_take_home/adapters/rhyming.js, rimeOf): from the last vowel letters on.
  function spelledRime(word) {
    var s = String(word || '').toLowerCase(), vowels = 'aeiou', start = s.length;
    for (var i = s.length - 1; i >= 0; i--) {
      if (vowels.indexOf(s[i]) >= 0) { while (i > 0 && vowels.indexOf(s[i - 1]) >= 0) i--; start = i; break; }
    }
    return s.slice(start);
  }
  var familiarTables = [];
  function answerTools(core, wordlist) {
    var prons = Object.create(null);
    var pron = function (word) {
      var w = String(word == null ? '' : word).trim().toLowerCase();
      if (own(prons, w)) return prons[w];
      var entry = null;
      try { entry = core.dictionarySounds(w); } catch (_) { entry = null; }
      return (prons[w] = entry && Array.isArray(entry.sounds) && entry.sounds.length ? entry.sounds.map(soundOf) : null);
    };
    var key = function (word) { var p = pron(word); return p ? p.join(' ') : ''; };
    var sameSound = function (a, b) { var x = key(a); return !!x && x === key(b); };
    var vowelsAt = function (p) { var out = []; p.forEach(function (s, i) { if (own(GUARD_VOWELS, s)) out.push(i); }); return out; };
    var rimeFrom = function (p, k) { var v = vowelsAt(p); return v.length >= k ? p.slice(v[v.length - k]).join(' ') : ''; };
    var lastRime = function (word) { var p = pron(word); return p ? rimeFrom(p, 1) : ''; };
    // A rhyme by sound: the sounds from the last vowel on, or from the one before it when both words are longer.
    var rhymePair = function (x, y) {
      if (!x || !y || x.join(' ') === y.join(' ')) return false;
      var k = vowelsAt(x).length > 1 && vowelsAt(y).length > 1 ? 2 : 1;
      var r = rimeFrom(x, k);
      return !!r && r === rimeFrom(y, k);
    };
    var rhymes = function (a, b) { return rhymePair(pron(a), pron(b)); };
    // Every way the dictionary says a word: a recording says one of them (bow, read, just), so a wrong choice is judged by all.
    var every = Object.create(null);
    var pronsOf = function (word) {
      var w = String(word == null ? '' : word).trim().toLowerCase();
      if (own(every, w)) return every[w];
      var entry = null;
      try { entry = core.dictionarySounds(w); } catch (_) { entry = null; }
      var list = entry && Array.isArray(entry.sounds) && entry.sounds.length ? [entry.sounds].concat(Array.isArray(entry.alternates) ? entry.alternates : []) : [];
      return (every[w] = list.filter(function (p) { return Array.isArray(p) && p.length; }).map(function (p) { return p.map(soundOf); }));
    };
    var maySound = function (a, b) { return pronsOf(a).some(function (x) { return pronsOf(b).some(function (y) { return x.join(' ') === y.join(' '); }); }); };
    var mayRhyme = function (a, b) { return pronsOf(a).some(function (x) { return pronsOf(b).some(function (y) { return rhymePair(x, y); }); }); };
    // Words a child knows that sound like this one: the picker's familiar words (word_sounds_wordlist_en.js), never a
    // blocked or British one (a soft word is still a word a child may type). Made once for each word list.
    var familiar = null;
    var homophones = function (word) {
      if (!wordlist || typeof wordlist.rows !== 'function') return [];
      if (!familiar) {
        for (var t = 0; t < familiarTables.length; t++) if (familiarTables[t].wordlist === wordlist && familiarTables[t].core === core) familiar = familiarTables[t].byKey;
        if (!familiar) {
          familiar = Object.create(null);
          wordlist.rows().forEach(function (row) {
            if (!row || row.blocked || row.nearBlocked || row.british || !(row.known || (row.zipf >= DEFAULT_MIN_ZIPF && row.books >= DEFAULT_MIN_BOOKS))) return;
            var k = key(row.word);
            if (k) (familiar[k] = familiar[k] || []).push(row.word);
          });
          if (familiarTables.length >= 8) familiarTables.shift();
          familiarTables.push({ wordlist: wordlist, core: core, byKey: familiar });
        }
      }
      var w = String(word || '').toLowerCase(), k = key(w);
      return k && own(familiar, k) ? familiar[k].filter(function (x) { return x !== w; }) : [];
    };
    return { pron: pron, sameSound: sameSound, rhymes: rhymes, lastRime: lastRime, homophones: homophones, maySound: maySound, mayRhyme: mayRhyme };
  }
  var REROLL_SOUNDS = 'b d f g k l m n p r s t v w y z h j a e i o u sh ch th ng ar or er ee ay oa oo'.split(' ');
  var REROLL_CHIPS = 's t m p k n r l b g f h d sh ch th a e i o u v z j w y'.split(' ');
  function rerollActivityBoard(id, board, item, bump, ctx) {
    if (!board || typeof board !== 'object') return;
    var word = String(item.word || '').toLowerCase(), core = ctx.core, tools = ctx.tools;
    var rng = mulberry32(seedFor(ctx.seed, 'reroll|' + id + '|' + word + '|' + bump));
    var shuffle = function (list) {
      var out = list.slice();
      for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = out[i]; out[i] = out[j]; out[j] = t; }
      return out;
    };
    // Put candidates not currently shown first so each click surfaces fresh wrong answers when available.
    var freshFirst = function (candidates, prev) {
      var seen = Object.create(null);
      (prev || []).forEach(function (v) { seen[String(v).toLowerCase()] = true; });
      return shuffle(candidates.filter(function (v) { return !seen[String(v).toLowerCase()]; }))
        .concat(shuffle(candidates.filter(function (v) { return seen[String(v).toLowerCase()]; })));
    };
    var pickWords = function (candidates, count, prev, allow) {
      var chosen = [];
      freshFirst(candidates, prev).forEach(function (w) {
        if (chosen.length >= count || !allow(w)) return;
        if (chosen.some(function (u) { return tools.maySound(u, w); })) return;
        chosen.push(w);
      });
      return chosen;
    };
    if (id === 'isolation' && Array.isArray(board.options) && board.correctSound) {
      var wantIso = Math.max(1, board.options.length - 1);
      var okSound = function (s) {
        if (!s || core.soundAnswerMatches(s, board.correctSound) || soundOf(s) === soundOf(board.correctSound)) return false;
        return core.phonemeBankCandidates(s).some(function (k) { return ctx.audio.hasClip('phonemes', k); });
      };
      var isoPool = [], seenS = Object.create(null);
      REROLL_SOUNDS.forEach(function (s) {
        var norm = soundOf(s);
        if (!seenS[norm] && okSound(s)) { seenS[norm] = true; isoPool.push(s); }
      });
      var prevIso = board.options.filter(function (o) { return o !== board.correctSound; });
      var pickedIso = freshFirst(isoPool, prevIso).slice(0, wantIso);
      if (pickedIso.length) board.options = shuffle([board.correctSound].concat(pickedIso));
      return;
    }
    if (id === 'segmentation' && Array.isArray(board.chips)) {
      var keep = board.chips.filter(function (c) { return !c.isDistractor; });
      var wantSeg = board.chips.length - keep.length;
      if (wantSeg < 1) return;
      var wordSounds = (item.phonemes || []).map(function (p) { return core.phonemeLabel(p, true); }).filter(Boolean);
      var prevSeg = board.chips.filter(function (c) { return c.isDistractor; }).map(function (c) { return c.phoneme; });
      var segPool = REROLL_CHIPS.filter(function (s) {
        return wordSounds.indexOf(s) < 0 && core.phonemeBankCandidates(s).some(function (k) { return ctx.audio.hasClip('phonemes', k); });
      });
      var pickedSeg = freshFirst(segPool, prevSeg).slice(0, wantSeg);
      if (pickedSeg.length) {
        board.chips = shuffle(keep.concat(pickedSeg.map(function (value, i) { return { id: 'distractor-' + i, phoneme: value, type: 'distractor', isDistractor: true }; })));
      }
      return;
    }
    if (id === 'blending' && Array.isArray(board.options) && board.answer) {
      var wantBlend = Math.max(1, board.options.length - 1);
      var prevBlend = board.options.filter(function (o) { return String(o).toLowerCase() !== String(board.answer).toLowerCase(); });
      var pickedBlend = pickWords(ctx.pool, wantBlend, prevBlend, function (w) { return w !== word && !tools.maySound(w, board.answer); });
      if (pickedBlend.length) board.options = shuffle([board.answer].concat(pickedBlend));
      return;
    }
    if (id === 'decoding' && Array.isArray(board.choices)) {
      var wantDec = Math.max(1, board.choices.length - 1);
      var prevDec = board.choices.filter(function (o) { return String(o).toLowerCase() !== word; });
      var pickedDec = pickWords(ctx.pool, wantDec, prevDec, function (w) { return w !== word && !tools.maySound(w, word); });
      if (pickedDec.length) board.choices = shuffle([word].concat(pickedDec));
      return;
    }
    if (id === 'rhyming' && Array.isArray(board.options) && board.answer) {
      var wantRhyme = Math.max(1, board.options.length - 1), rime = spelledRime(word);
      var prevRhyme = board.options.filter(function (o) { return o !== board.answer; });
      var pickedRhyme = pickWords(ctx.pool, wantRhyme, prevRhyme, function (w) {
        return w !== word && w !== board.answer && !tools.maySound(w, word) && !tools.maySound(w, board.answer) &&
          !tools.mayRhyme(word, w) && !(rime.length >= 2 && spelledRime(w) === rime);
      });
      if (pickedRhyme.length) board.options = shuffle([board.answer].concat(pickedRhyme));
      return;
    }
    if (id === 'missing_letter' && Array.isArray(board.options) && board.correctLetter) {
      var at = board.hiddenIndex, ok = board.correctLetter, wantLet = Math.max(1, board.options.length - 1);
      var vowel = 'aeiou'.indexOf(ok) >= 0 || (ok === 'y' && !/[aeiou]/.test(word));
      var homo = tools.homophones(word);
      var letPool = (vowel ? 'aeiou' : 'bcdfghjklmnprstvwz').split('').filter(function (o) {
        return o !== ok && homo.indexOf(word.slice(0, at) + o + word.slice(at + 1)) < 0;
      });
      var prevLet = board.options.filter(function (o) { return o !== ok; });
      var pickedLet = freshFirst(letPool, prevLet).slice(0, wantLet);
      if (pickedLet.length) board.options = shuffle([ok].concat(pickedLet));
      return;
    }
    if (id === 'word_families' && Array.isArray(board.distractors) && board.rime) {
      var wantFam = board.distractors.length || 2;
      var members = Array.isArray(board.options) ? board.options : [];
      var pickedFam = pickWords(ctx.pool, wantFam, board.distractors, function (w) {
        return w !== word && !w.endsWith(board.rime) && !members.some(function (m) { return tools.sameSound(m, w); });
      });
      if (pickedFam.length) board.distractors = pickedFam;
      return;
    }
    if (id === 'sound_sort' && Array.isArray(board.distractors) && board.targetChar) {
      var wantSort = board.distractors.length || 2, mode = board.mode === 'last' ? 'last' : 'first';
      var key = core.soundKey(board.targetChar), optSet = (board.options || []).map(function (w) { return String(w).toLowerCase(); });
      var pickedSort = [];
      freshFirst(ctx.pool, board.distractors).forEach(function (w) {
        if (pickedSort.length >= wantSort || w === word || optSet.indexOf(w) >= 0) return;
        var s = core.edgeSound(w, mode);
        if (s != null && core.soundKey(s) !== key && pickedSort.indexOf(w) < 0) pickedSort.push(w);
      });
      if (pickedSort.length) board.distractors = pickedSort;
    }
  }

  // Judges the boards of one word (item.activityItems, already only the activities asked) and changes them in place.
  // drop(activity, reason): the board is left out, with that reason.
  function oneRightAnswer(item, core, tools, drop) {
    var boards = item.activityItems || {};
    var word = String(item.word || '').toLowerCase();
    var quote = function (list) { return list.map(function (w) { return '"' + w + '"'; }).join(' and '); };
    // Choices that are not the answer: off when bad(choice) or when they sound like a wrong choice already kept.
    var keep = function (options, answer, bad) {
      var kept = [];
      options.forEach(function (o) {
        var t = String(o).toLowerCase();
        if (t === String(answer).toLowerCase()) { kept.push(o); return; }
        if (bad(t)) return;
        if (kept.some(function (k) { var u = String(k).toLowerCase(); return u !== String(answer).toLowerCase() && tools.maySound(u, t); })) return;
        kept.push(o);
      });
      return kept;
    };
    var iso = boards.isolation;
    if (iso && Array.isArray(iso.options)) {
      var right = iso.correctSound, seen = {};
      iso.options = iso.options.filter(function (o) {
        var s = soundOf(o);
        if (o !== right && (s === soundOf(right) || core.soundAnswerMatches(o, right))) return false;
        if (own(seen, s) && o !== right) return false;
        seen[s] = true;
        return true;
      });
      if (iso.options.length < 2) drop('isolation', 'the sounds to choose from were one sound');
    }
    var blend = boards.blending;
    if (blend && Array.isArray(blend.options)) {
      blend.options = keep(blend.options, blend.answer, function (t) { return tools.maySound(t, blend.answer); });
      if (blend.options.length < 2) drop('blending', 'every other word sounds the same as this one');
    }
    var rhyme = boards.rhyming;
    if (rhyme && Array.isArray(rhyme.options) && rhyme.answer) {
      var rime = spelledRime(word);
      rhyme.options = keep(rhyme.options, rhyme.answer, function (t) {
        return t === word || tools.maySound(t, word) || tools.maySound(t, rhyme.answer) || tools.mayRhyme(word, t) || (rime.length >= 2 && spelledRime(t) === rime);
      });
      if (rhyme.options.length < 2) drop('rhyming', 'every other word rhymes with it, or is spelled as if it did');
    }
    var family = boards.word_families;
    if (family && Array.isArray(family.options)) {
      // The family's sound: the ending as the file says it (the ending played as a word), else the sounds from the last vowel.
      var mine = tools.pron(word), said = tools.pron(family.rime);
      var tail = function (p, n) { return p && p.length >= n ? p.slice(p.length - n).join(' ') : ''; };
      var heard = said ? said.join(' ') : tools.lastRime(word);
      var endsLike = function (w) { var p = tools.pron(w); return !!p && !!heard && tail(p, heard.split(' ').length) === heard; };
      if (mine && said && tail(mine, said.length) !== heard) drop('word_families', 'the ending -' + family.rime + ', said alone, does not sound like the end of "' + word + '"');
      else if (heard) {
        family.options = family.options.filter(endsLike);
        family.distractors = (family.distractors || []).filter(function (d) { return !endsLike(d) && !family.options.some(function (m) { return tools.sameSound(m, d); }); });
        if (!family.options.length) drop('word_families', 'no word of the family sounds like "' + word + '"');
        else if (typeof core.validWordFamilyBoard === 'function' && !core.validWordFamilyBoard(family, word)) drop('word_families', 'every other word sounds like the family');
      }
    }
    // Missing Letter: the app's letters (createPackLogic) can spell a word that sounds the same (see: "sea"). That letter
    // is swapped for the next one of its kind that does not; the app's own Missing Letter still offers it.
    var letter = boards.missing_letter;
    if (letter && Array.isArray(letter.options) && letter.correctLetter) {
      var at = letter.hiddenIndex, ok = letter.correctLetter;
      var spells = function (o) { var other = word.slice(0, at) + o + word.slice(at + 1); return tools.homophones(word).indexOf(other) >= 0; };
      var vowel = 'aeiou'.indexOf(ok) >= 0 || (ok === 'y' && !/[aeiou]/.test(word));
      var spare = (vowel ? 'aeiou' : 'bcdfghjklmnprstvwz').split('').filter(function (o) { return o !== ok && letter.options.indexOf(o) < 0 && !spells(o); });
      letter.options = letter.options.map(function (o) { return o !== ok && spells(o) ? spare.shift() || null : o; }).filter(Boolean);
      if (letter.options.length < 2) drop('missing_letter', 'every other letter spells a word that sounds the same');
    }
    var same = (boards.spelling_bee || boards.orthography) ? tools.homophones(word) : [];
    if (same.length) {
      var why = 'it sounds the same as ' + quote(same.slice(0, 3)) + ', so a student who hears it cannot tell which spelling is meant';
      if (boards.spelling_bee) drop('spelling_bee', why);
      if (boards.orthography) drop('orthography', why);
    }
  }

  // ---------------------------------------------------------------------------
  // Copied from word_sounds_setup_source.jsx. Removed: every AI call (sentence, story, definition,
  // picture), the eSpeak rung, React state (reviewed syllable recordings and counts, the chosen
  // voice) and the three reading boards that need an AI sentence. Changed: shuffleForPack draws
  // from a generator seeded per word, and a row's id is its place in the list, not the clock.
  // Changed 2026-11-11: a dictionary word the aligner cannot split (except, worried, chocolate: 73 of
  // the picker's words) has no chipSpans, and "analysis.chipSpans.some" threw there; here it reads
  // "(analysis.chipSpans || [])", so the word gets every board but Sound Mapping. The app's line
  // (word_sounds_setup_source.jsx, preparePackWordAiFree) still throws: fix it the same way.
  // ---------------------------------------------------------------------------
  function createPackLogic(config) {
    const WS_CORE = config.core;
    const alloData = Array.isArray(config.knownWords) ? { SOUND_MATCH_POOL: config.knownWords } : (config.knownWords || {});
    const packSeed = config.seed;
    const wordSoundsLanguage = 'en';
    const instructionalProfile = {};
    let random = mulberry32(seedFor(packSeed, ''));

    const PACK_COMMON_WORDS = ['cat','dog','sun','map','bed','pig','cup','hat','fish','star','tree','frog','duck','book','run','red','sit','fan','hop','moon','pen','top','ring','rock','look','mug'];
    let _k2Known = null;
    const k2KnownWords = () => {
        if (_k2Known) return _k2Known;
        const set = new Set(PACK_COMMON_WORDS);
        const add = (w) => {
            const v = String(w || '').trim().toLowerCase();
            if (v) set.add(v);
        };
        try {
            const data = alloData;
            (data.SOUND_MATCH_POOL || []).forEach(add);
            Object.values(data.RIME_FAMILIES || {}).forEach((list) => (list || []).forEach(add));
            Object.values(data.SIGHT_WORD_PRESETS || {}).forEach((list) => (list || []).forEach(add));
            Object.values(data.WORD_FAMILY_PRESETS || {}).forEach((list) => {
                if (Array.isArray(list)) list.forEach(add);
                else if (list && Array.isArray(list.words)) list.words.forEach(add);
            });
        } catch (e) { /* the screen degrades to structure-only */ }
        _k2Known = set;
        return set;
    };
    // Hard rejects: not a candidate phonics word under any reading.
    const isUnusableAsPhonicsWord = (w) => {
        const v = String(w || '').trim();
        if (!v) return true;
        if (!/^[a-zA-Z]+$/.test(v)) return true;          // digits, punctuation, spaces
        if (v.length < 2 || v.length > 10) return true;   // "a" is a sight word, not a family member
        if (!/[aeiouy]/i.test(v)) return true;            // no vowel = not a word
        return false;
    };
    const packSoundNotes = (analysis) => {
        const notes = {};
        ['welded', 'units', 'twoSound', 'silentLetters', 'vowelPatterns'].forEach((key) => { if (analysis.flags[key].length) notes[key] = analysis.flags[key]; });
        if (analysis.flags.ed) notes.ed = analysis.flags.ed;
        if (analysis.flags.finalLe) notes.finalLe = true;
        if (analysis.flags.schwa) notes.schwa = true;
        return Object.keys(notes).length ? notes : undefined;
    };
    const preparePackWordAiFree = async (env) => {
        const { word: rawWord, index = 0, batchWords = [], isEnglish, estimate } = env;
        const word = String(rawWord || '').trim();
        if (!isEnglish || !word) return null;
        const loaded = await WS_CORE.loadPhonemeDictionary();
        const entry = loaded ? WS_CORE.dictionarySounds(word) : null;
        let sounds, source, alternates = [];
        if (entry) { sounds = entry.sounds; source = 'dictionary'; alternates = entry.alternates; }
        else { sounds = typeof estimate === 'function' ? estimate(word) : []; source = 'estimate'; }
        const labels = sounds.map((sound) => WS_CORE.phonemeLabel(sound, true)).filter(Boolean);
        const trusted = source !== 'estimate';
        const analysis = WS_CORE.soundAnalysis(word, trusted ? labels : []);
        const safePool = [...new Set([...PACK_COMMON_WORDS, ...k2KnownWords()])].filter((value) => !isUnusableAsPhonicsWord(value));
        const derived = WS_CORE.derivedAnswerSets({
            word, sounds: trusted ? labels : [], pool: safePool,
            sessionWords: batchWords.map((value) => String(typeof value === 'string' ? value : value?.word || value?.targetWord || '').trim().toLowerCase()).filter((value) => value && !isUnusableAsPhonicsWord(value)),
            soundsOf: (value) => { const found = WS_CORE.dictionarySounds(value); return found ? found.sounds : null; },
            // A real word = any sound-dictionary word (checked inside) or any word on the app's lists.
            isRealWord: (value) => k2KnownWords().has(value),
        });
        const text = {};
        const image = null;
        const glance = WS_CORE.soundsNeedGlance({ source, sounds: labels, alternates });
        const words = (values) => (Array.isArray(values) ? values : []).filter((value) => !isUnusableAsPhonicsWord(value));
        return {
            id: index + 1,
            term: word, word, targetWord: word, displayWord: word,
            phonemes: source === 'dictionary' ? labels : sounds,
            phonemeCount: sounds.length,
            syllableBlendingOptions: [],
            graphemes: source === 'dictionary' ? analysis.graphemes : [],
            // Sound Mapping: how many sound boxes each spelling chip covers (qu, x, the u of cute, le cover two).
            chipSpans: source === 'dictionary' && (analysis.chipSpans || []).some((n) => n === 2) ? analysis.chipSpans : undefined,
            rhymes: derived.rhymeWord ? [derived.rhymeWord] : [],
            rhymeWord: derived.rhymeWord,
            rhymePronunciation: derived.rhymeWord && derived.rhymePhonemes ? { word: derived.rhymeWord, phonemes: derived.rhymePhonemes } : undefined,
            _rhymeSource: derived.rhymeWord ? 'derived' : undefined,
            rhymeDistractors: derived.rhymeDistractors,
            blendingDistractors: derived.blendingDistractors,
            orthographyDistractors: derived.orthographyDistractors,
            sentence: typeof text.sentence === 'string' ? text.sentence.trim() : '',
            sentenceDistractors: words(text.sentenceDistractors),
            story: Array.isArray(text.story) ? text.story : [],
            familyEnding: derived.familyEnding,
            familyMembers: derived.familyMembers,
            firstSound: WS_CORE.phonemeLabel(sounds[0] || word[0], true),
            lastSound: WS_CORE.phonemeLabel(sounds[sounds.length - 1] || word[word.length - 1], true),
            definition: text.definition,
            image,
            manipulationTask: null,
            _fallbackUsed: source === 'estimate' || undefined,
            _phonemeSource: source === 'estimate' ? 'estimated' : source,
            phonemeSource: source,
            phonemeAlternates: alternates.length ? alternates : undefined,
            soundNotes: trusted ? packSoundNotes(analysis) : undefined,
            _soundsGlance: glance.length ? glance : undefined,
            _soundEvidence: derived.evidence.length ? derived.evidence : undefined,
            // The aligner decided: a missing spelling means "ask the teacher", never a letter-by-letter guess.
            _graphemeSource: source === 'dictionary' ? 'aligner' : undefined,
            _mappingNote: source === 'dictionary' && analysis.mapping.status !== 'ready' ? analysis.mapping.status : undefined,
        };
    };

    const normalizePackKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const shuffleForPack = (values) => {
        const out = [...(values || [])];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    };
    const packIsEnglish = true;
    const flatPackPhoneme = (p) => WS_CORE.phonemeLabel(p, packIsEnglish);
    const estimatePackPhonemes = (word) => {
        const w = normalizePackKey(word).replace(/[^a-z]/g, '');
        if (!w) return [];
        const trigraphs = ['igh', 'tch', 'dge'];
        const digraphs = ['sh','ch','th','wh','ph','ng','ck','qu','wr','kn','gn','mb','ar','er','ir','or','ur','ai','ay','au','aw','ea','ee','ei','ey','ew','ie','oa','oe','oi','oo','ou','ow','oy','ue'];
        const result = [];
        let i = 0;
        while (i < w.length) {
            if (i < w.length - 2 && trigraphs.includes(w.slice(i, i + 3))) {
                result.push(w.slice(i, i + 3));
                i += 3;
            } else if (i < w.length - 1 && digraphs.includes(w.slice(i, i + 2))) {
                result.push(w.slice(i, i + 2));
                i += 2;
            } else if (w[i] === 'c' && i < w.length - 1 && 'eiy'.includes(w[i + 1])) {
                result.push('s');
                i++;
            } else if (w[i] === 'g' && i < w.length - 1 && 'eiy'.includes(w[i + 1])) {
                result.push('j');
                i++;
            } else {
                result.push(w[i]);
                i++;
            }
        }
        return result;
    };
    const compileActivityItems = (items) => {
        const rhymeSession = WS_CORE.createRhymeSession();
        const commonWords = packIsEnglish ? PACK_COMMON_WORDS : [];
        const itemWords = items.map((item) => normalizePackKey(item.targetWord || item.word || item.term)).filter(Boolean);
        const wordPool = [...new Set([...itemWords, ...commonWords])];
        const allPackPhonemes = [...new Set(items.flatMap((it) => (it.phonemes || []).map(flatPackPhoneme)).filter(Boolean))];
        const allPackLetters = [...new Set(itemWords.join('').split(''))];
        const packRimeOf = (w) => {
            const v = normalizePackKey(w);
            if (packIsEnglish) return (v.match(/[aeiou][a-z]*$/) || [''])[0];
            return v.slice(-2);
        };
        items.forEach((item, itemIndex) => {
            const word = normalizePackKey(item.targetWord || item.word || item.term);
            random = mulberry32(seedFor(packSeed, word));
            const phonemes = (item.phonemes || []).map(flatPackPhoneme).filter(Boolean);
            const seed = word.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
            const position = phonemes.length ? seed % phonemes.length : 0;
            const correctSound = phonemes[position] || item.firstSound || estimatePackPhonemes(word)[0] || 'a';
            const isolationPool = packIsEnglish
                ? [...phonemes, 'b','d','f','g','k','l','m','n','p','r','s','t','a','e','i','o','u','sh','ch','th']
                : [...phonemes, ...allPackPhonemes];
            const isolationOptions = shuffleForPack([...new Set([correctSound, ...isolationPool.filter((value) => value && value !== correctSound)])].slice(0, 6));
            const chipDistractorPool = packIsEnglish
                ? ['s','t','m','p','k','n','r','l','b','g','f','h','d','sh','ch','th','a','e','i','o','u']
                : allPackPhonemes;
            const chipDistractors = shuffleForPack(chipDistractorPool.filter((value) => !phonemes.includes(value))).slice(0, 5);
            const chips = shuffleForPack([
                ...phonemes.map((value, index) => ({ id: `correct-${index}`, phoneme: value, type: 'correct', isDistractor: false })),
                ...chipDistractors.map((value, index) => ({ id: `distractor-${index}`, phoneme: value, type: 'distractor', isDistractor: true })),
            ]);
            const otherWords = wordPool.filter((value) => value !== word);
            const HOMOPHONE_SETS = [['sun','son'],['ate','eight'],['sea','see'],['eye','i'],['know','no'],['knight','night'],['right','write'],['meet','meat'],['whale','wail'],['bee','be'],['two','to','too'],['four','for'],['one','won'],['hear','here'],['blue','blew'],['red','read'],['pear','pair'],['flower','flour'],['dear','deer'],['bear','bare'],['tail','tale'],['sail','sale'],['mail','male'],['plane','plain'],['road','rode'],['hole','whole'],['week','weak'],['hair','hare']];
            const soundsLike = (a, b) => {
                const la = normalizePackKey(a), lb = normalizePackKey(b);
                if (!la || !lb) return false;
                if (la === lb) return true;
                return HOMOPHONE_SETS.some((set) => set.includes(la) && set.includes(lb));
            };
            const boardWithAnswer = (answer, pool, distractorCount) => shuffleForPack([
                answer,
                ...[...new Set(pool)].filter((value) => value && !soundsLike(value, answer)).slice(0, distractorCount),
            ]);
            const blending = boardWithAnswer(word, [...(item.blendingDistractors || []), ...otherWords], 5);
            const rhymeBoard = WS_CORE.buildSessionRhymeBoard({
                session: rhymeSession, occurrenceId: itemIndex,
                word, answer: item.rhymeWord || (item.rhymes || [])[0] || '',
                phonemes: item.phonemes,
                answerPhonemes: item.rhymePronunciation && normalizePackKey(item.rhymePronunciation.word) === normalizePackKey(item.rhymeWord || (item.rhymes || [])[0])
                    ? item.rhymePronunciation.phonemes : undefined,
                pool: [...items, ...(Array.isArray(item._soundEvidence) ? item._soundEvidence : []), ...commonWords],
                distractors: item.rhymeDistractors || [],
                prepared: item.activityItems?.rhyming,
                isEnglish: packIsEnglish,
            });
            const task = WS_CORE.resolveManipulationTask(word, item.manipulationTask, wordSoundsLanguage);
            if (!item.manipulationTask) item.manipulationTask = task;
            const manipulationFill = packIsEnglish ? ['sit','map','bed','pin','mud','fan'] : otherWords;
            const manipulation = WS_CORE.manipulationReady(task)
                ? boardWithAnswer(task.answer, [...(task.distractors || []), ...manipulationFill], 5) : [];
            const itemSyllable = item.activityItems?.syllable_blending;
            const storedSyllable = itemSyllable;
            const syllableTask = WS_CORE.resolveSyllableTask(word, storedSyllable, wordSoundsLanguage);
            const countAudio = item._ttsAssets?.[word];
            if (countAudio) item._ttsAssets = { ...(item._ttsAssets || {}), [word]: countAudio };
            const countContext = WS_CORE.createSyllableCountAudioContext({ asset: countAudio,
                voice: '', language: wordSoundsLanguage });
            const countingTask = WS_CORE.resolveSyllableCount(word, { language: wordSoundsLanguage,
                prepared: item.activityItems?.syllable_counting,
                audioContext: countContext,
                recordedTask: storedSyllable, syllables: item.syllables });
            const syllables = syllableTask.supported ? [...syllableTask.syllables] : [...countingTask.syllables];
            item.syllables = syllables;
            const recordingChoices = [...(item.syllableBlendingOptions || []), ...wordPool].filter(value => value !== word);
            const countDistance = value => {
                const resolved = WS_CORE.resolveSyllableCount(value, { language: wordSoundsLanguage });
                return resolved.supported ? Math.abs(resolved.count - syllableTask.syllables.length) : Infinity;
            };
            recordingChoices.sort((a, b) => countDistance(a) - countDistance(b));
            const choiceBoard = [storedSyllable, itemSyllable].find(board =>
                WS_CORE.validSyllableBoard(board) && WS_CORE.packAudioKey(board.targetWord) === word &&
                WS_CORE.resolveSyllableTask(word, board, wordSoundsLanguage).supported);
            const syllableOptions = syllableTask.supported
                ? choiceBoard ? [...choiceBoard.options]
                : boardWithAnswer(word, syllableTask.contentStatus === 'teacher_recorded' ? recordingChoices : shuffleForPack(WS_CORE.syllableWords().filter(value => value !== word)), 3) : [];
            const aligned = packIsEnglish && typeof WS_CORE.soundAnalysis === 'function' ? WS_CORE.soundAnalysis(word, phonemes) : null;
            const letterGuessAllowed = item._graphemeSource !== 'aligner' &&
                (!aligned || !aligned.chunks || (aligned.mapping.status === 'ready' && aligned.graphemes.join('|') === word.split('').join('|')));
            const spelling = [[item.graphemes, item.chipSpans],
                [(item.phonemes || []).map(p => p && typeof p === 'object' ? p.grapheme : ''), null],
                ...(aligned && aligned.mapping.status === 'ready' && !item._fallbackUsed ? [[aligned.graphemes, aligned.chipSpans]] : []), ...(letterGuessAllowed ? [[word.split(''), null]] : [])]
                .map(([values, spans]) => [values, Array.isArray(values) && values.length > 0 &&
                    values.every(value => typeof value === 'string' && value.trim()) &&
                    normalizePackKey(values.join('')).normalize('NFC') === word.normalize('NFC') ? WS_CORE.mappingChipSpans(values, phonemes.length, spans) : null])
                .find(([, spans]) => spans) || [[], null];
            const graphemes = spelling[0];
            const chipSpans = spelling[1] && spelling[1].some(n => n === 2) ? spelling[1] : null;
            item.graphemes = graphemes;
            if (chipSpans) item.chipSpans = chipSpans; else delete item.chipSpans;
            const letters = word.split('');
            for (let i = letters.length - 1; i > 0; i--) {
                const j = (seed + i) % (i + 1);
                [letters[i], letters[j]] = [letters[j], letters[i]];
            }
            // 2026-11-18: never the word itself, judged on the tiles a student gets (no ' or -) and never by swapping two
            // equal letters ("eek"); and the hidden letter is a letter, never the ' of "I'm". A word of letters only
            // gets the same board as before.
            const isTile = (ch) => !/^['’\- .]$/.test(ch);
            const tilePlaces = letters.map((ch, i) => (isTile(ch) ? i : -1)).filter((i) => i >= 0);
            const wordTiles = word.split('').filter(isTile).join('');
            if (tilePlaces.length > 1 && tilePlaces.map((i) => letters[i]).join('') === wordTiles) {
                const first = tilePlaces[0], other = tilePlaces.find((i) => letters[i] !== letters[first]);
                if (other != null) [letters[first], letters[other]] = [letters[other], letters[first]];
            }
            const letterPlaces = word.split('').map((ch, i) => (ch.toLowerCase() !== ch.toUpperCase() ? i : -1)).filter((i) => i >= 0);
            const hiddenIndex = word.length > 1 ? (letterPlaces.length ? letterPlaces[seed % letterPlaces.length] : seed % word.length) : 0;
            const correctLetter = word[hiddenIndex] || '';
            const letterRank = (value) => [...(value + word)].reduce((hash, c) => Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
            const vowelLetter = !!correctLetter && ('aeiou'.includes(correctLetter) || (correctLetter === 'y' && !/[aeiou]/.test(word)));
            const letterDistractorPool = packIsEnglish
                ? (vowelLetter ? 'aeiou' : 'bcdfghjklmnprstvwz').split('').sort((a, b) => (word.includes(a) - word.includes(b)) || (letterRank(a) - letterRank(b)))
                : shuffleForPack(allPackLetters);
            const letterOptions = shuffleForPack([...new Set([correctLetter, ...letterDistractorPool.filter((value) => value !== correctLetter)])].slice(0, 4));
            const mode = item.soundSortMatches?.position || (seed % 2 === 0 ? 'first' : 'last');
            const soundBoard = packIsEnglish ? WS_CORE.buildSoundSort({ word, phonemes: item.phonemes, mode,
                pool: [...items, ...WS_CORE.knownWords], matches: item.soundSortMatches?.words || [],
                teacherEdited: !!item.soundSortMatches?.teacherEdited, targetSound: item.soundSortMatches?.phoneme,
                distractors: item.soundSortMatches?.distractors || [] }) : null;
            const familySpec = item.rimeFamilyMembers;
            const teacherFamily = familySpec?.teacherEdited === true;
            const suppliedRime = normalizePackKey(familySpec?.rime || item.familyEnding || '').replace(/^-/, '');
            const rime = suppliedRime && (teacherFamily || word.endsWith(suppliedRime)) ? suppliedRime
                : (packIsEnglish ? (word.match(/[aeiou][a-z]*$/) || [''])[0] : packRimeOf(word));
            const familyWords = values => [...new Set((Array.isArray(values) ? values : []).filter(v => typeof v === 'string').map(normalizePackKey).filter(v => v && v !== word))];
            const familySource = familyWords(familySpec?.words || item.familyMembers).filter(value => teacherFamily || (rime && value.endsWith(rime) && value.length > rime.length));
            const familyOptions = teacherFamily ? familySource.slice(0, 8)
                : shuffleForPack(familySource.length ? familySource : wordPool.filter(value => value !== word && rime && value.endsWith(rime) && value.length > rime.length)).slice(0, word.length <= 3 ? 3 : 5);
            const familyDistractors = teacherFamily ? familyWords(familySpec.distractors).slice(0, 8)
                : shuffleForPack(wordPool.filter(value => value !== word && !value.endsWith(rime))).slice(0, word.length <= 3 ? 2 : 4);
            const familyCandidate = { rime, options: familyOptions, distractors: familyDistractors, ...(teacherFamily ? { teacherEdited: true } : {}) };
            const familyBoard = WS_CORE.validWordFamilyBoard(familyCandidate, word) ? familyCandidate : null;
            const decodingChoices = boardWithAnswer(word, [...itemWords, ...commonWords].filter((value) => value !== word), 3);
            item.activityItems = {
                counting: { options: [1,2,3,4,5,6,7,8,9,10,'11+'], answer: item.phonemeCount || phonemes.length },
                isolation: { position, correctSound, options: isolationOptions },
                segmentation: { chips, slotCount: item.phonemeCount || phonemes.length },
                blending: { options: blending, answer: word },
                rhyming: rhymeBoard,
                manipulation: { task, options: manipulation },
                syllable_blending: { ...syllableTask, options: syllableOptions, answer: word },
                syllable_counting: { ...countingTask, answer: countingTask.supported ? countingTask.count : null },
                orthography: { options: shuffleForPack([...new Set([word, ...(item.orthographyDistractors || [])])]), answer: word },
                mapping: graphemes.length
                    ? { graphemes, ...(chipSpans ? { chipSpans } : {}), chipOrder: shuffleForPack(graphemes.map((value, index) => ({ id: index, text: String(value) }))),
                        ...(item.soundNotes && (item.soundNotes.welded || item.soundNotes.units) ? { soundUnits: [...(item.soundNotes.welded || []), ...(item.soundNotes.units || [])] } : {}) }
                    : { supported: false, contentStatus: 'teacher_review_required', graphemes: [], chipOrder: [], ...(item._mappingNote ? { reason: item._mappingNote } : {}) },
                spelling_bee: { answer: word },
                word_scramble: { letters, answer: word },
                missing_letter: { hiddenIndex, correctLetter, options: letterOptions },
                ...(soundBoard ? { sound_sort: soundBoard } : {}),
                letter_tracing: { letter: word[0] || '' },
                ...(familyBoard ? { word_families: familyBoard } : {}),
                decoding: { choices: decodingChoices },
            };
        });
        items.forEach(item => {
            const text = [item.word || item.targetWord, item.activityItems?.read_sentence?.sentence, item.activityItems?.read_passage?.story].filter(Boolean).join(' ');
            item._instructionalProfile = instructionalProfile;
            item._instructionalCoverage = WS_CORE.profileCheck(text, instructionalProfile);
        });
        return items;
    };
    return { PACK_COMMON_WORDS, k2KnownWords, isUnusableAsPhonicsWord, normalizePackKey, estimatePackPhonemes, preparePackWordAiFree, compileActivityItems };
  }

  // ---------------------------------------------------------------------------
  // Audio: bank lookups only, unless the caller passes speak()
  // ---------------------------------------------------------------------------
  var PORTABLE = /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3)[;,]/i;
  var AUDIO_URI = /^data:audio\/[a-z0-9.+-]+(;[^,]*)?,/i;
  function pcmToWavUri(base64, sampleRate) {
    var pcm = atob(String(base64).replace(/\s+/g, ''));
    var rate = sampleRate || 24000, n = pcm.length;
    var u32 = function (v) { return String.fromCharCode(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); };
    var u16 = function (v) { return String.fromCharCode(v & 255, (v >>> 8) & 255); };
    var header = 'RIFF' + u32(36 + n) + 'WAVEfmt ' + u32(16) + u16(1) + u16(1) + u32(rate) + u32(rate * 2) + u16(2) + u16(16) + 'data' + u32(n);
    return 'data:audio/wav;base64,' + btoa(header + pcm);
  }
  var MAX_AUDIO_URI_CHARS = 2 * 1024 * 1024;
  // A bank entry as { uri } (a data: address) or null. PCM entries ({ base64, sampleRate }) become WAV here.
  function entryUri(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') return entry.length <= MAX_AUDIO_URI_CHARS && AUDIO_URI.test(entry) ? entry : null;
    if (typeof entry === 'object' && typeof entry.base64 === 'string' && entry.base64) {
      var cleaned = entry.base64.replace(/\s+/g, '');
      if (!cleaned || cleaned.length > MAX_AUDIO_URI_CHARS || cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null;
      if (typeof entry.mime === 'string') {
        var mime = entry.mime.trim().toLowerCase();
        if (!/^audio\/[a-z0-9.+-]+$/.test(mime)) return null;
        return 'data:' + mime + ';base64,' + cleaned;
      }
      try { return pcmToWavUri(cleaned, entry.sampleRate); } catch (_) { return null; }
    }
    return null;
  }
  function own(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }
  function wordsOf(bank) { return bank && bank.words && typeof bank.words === 'object' && !bank.words.base64 ? bank.words : (bank || {}); }

  var SOURCE_NAMES = { recorded: 'recorded', kokoro: 'Kokoro bank', spoken: 'spoken now', teacher: 'teacher recording' };
  // teacherWords: the teacher's own recordings of practice words (opts.own, checked). They come first.
  function createAudio(banks, speak, toWav, allowUnconverted, teacherWords, toMp3) {
    var b = banks || {}, gap = b.gapFill || {};
    var layers = {
      words: [[teacherWords || {}, 'teacher'], [b.words || {}, 'recorded'], [wordsOf(b.kokoroWords), 'kokoro']],
      phonemes: [[b.phonemes || {}, 'recorded'], [gap.phonemes || {}, 'kokoro']],
      isolation: [[b.isolation || {}, 'recorded'], [gap.isolation || {}, 'kokoro']],
      instructions: [[b.instructions || {}, 'recorded'], [gap.instructions || {}, 'kokoro']],
    };
    var found = {};
    var find = function (category, key) {
      var list = layers[category] || [];
      for (var i = 0; i < list.length; i++) if (own(list[i][0], key) && list[i][0][key]) return { entry: list[i][0][key], source: list[i][1] };
      return null;
    };
    var hasClip = function (category, key) { return !!find(category, key); };
    // Resolves one clip to a portable data: address, or says why not.
    var resolve = function (category, key) {
      var id = category + '|' + key;
      if (found[id]) return Promise.resolve(found[id]);
      var hit = find(category, key);
      var start = hit ? Promise.resolve({ uri: entryUri(hit.entry), source: hit.source })
        : category === 'words' && typeof speak === 'function'
          ? Promise.resolve().then(function () { return speak(key); }).then(function (made) { return { uri: entryUri(made), source: 'spoken' }; }, function () { return { uri: null, source: 'spoken' }; })
          : Promise.resolve({ uri: null, source: null });
      return start.then(function (got) {
        var out = { category: category, key: key, source: got.source ? SOURCE_NAMES[got.source] : null, uri: null, status: 'none', format: '' };
        if (!got.uri) return out;
        var format = got.uri.slice(5, got.uri.search(/[;,]/));
        if (PORTABLE.test(got.uri)) { out.uri = got.uri; out.status = 'ready'; out.format = format; return out; }
        var convert = typeof toWav === 'function'
          ? Promise.resolve().then(function () { return toWav(got.uri, { category: category, key: key }); }).then(function (v) { return typeof v === 'string' && PORTABLE.test(v) ? v : null; }, function () { return null; })
          : Promise.resolve(null);
        return convert.then(function (wav) {
          if (wav) { out.uri = wav; out.status = 'ready'; out.format = 'audio/wav (from ' + format + ')'; }
          else if (allowUnconverted) { out.uri = got.uri; out.status = 'ready'; out.format = format + ' (not converted: may not play on iPad or older Safari)'; }
          else out.status = typeof toWav === 'function' ? 'convert_failed' : 'needs_converter';
          return out;
        });
      }).then(function (out) {
        // 2026-11-17: a WAV made smaller as MP3 when the page gives an encoder (about 8 to 10 times smaller). Else the WAV.
        if (out.status !== 'ready' || typeof toMp3 !== 'function' || !/^data:audio\/(?:wav|x-wav|wave)[;,]/i.test(out.uri)) return out;
        return Promise.resolve().then(function () { return toMp3(out.uri, { category: category, key: key }); }).then(function (mp3) {
          if (typeof mp3 === 'string' && /^data:audio\/mpeg;base64,/i.test(mp3)) { out.uri = mp3; out.format = 'audio/mpeg (from ' + out.format + ')'; }
          return out;
        }, function () { return out; });
      }).then(function (out) { found[id] = out; return out; });
    };
    return { hasClip: hasClip, resolve: resolve, found: found };
  }

  var BOARD_WORDS = {
    blending: ['options'], rhyming: ['options', 'answer'], word_families: ['options', 'distractors'],
    sound_sort: ['options', 'distractors'], orthography: [], decoding: ['choices'],
  };
  function boardWords(activity, board) {
    var out = [];
    (BOARD_WORDS[activity] || []).forEach(function (field) {
      var value = board && board[field];
      (Array.isArray(value) ? value : [value]).forEach(function (v) {
        var text = typeof v === 'string' ? v : v && typeof v === 'object' ? (v.word || v.text || '') : '';
        if (text) out.push(String(text).trim().toLowerCase());
      });
    });
    return out;
  }

  var BOARD_REASONS = {
    rhyming: 'no rhyme partner', word_families: 'no word family for this word', sound_sort: 'no checked sound-sort set for this word',
    mapping: 'the spelling of this word does not map one sound at a time', blending: 'not enough answer choices',
  };
  function plainReason(activity, code, audio) {
    var status = function (category, key) { var f = audio.found[category + '|' + key]; return f ? f.status : 'none'; };
    var clip = function (what, state) {
      return state === 'needs_converter' ? 'the recording for ' + what + ' is WebM and no converter was supplied'
        : state === 'convert_failed' ? 'the recording for ' + what + ' could not be converted to WAV' : 'no recording for ' + what;
    };
    if (code === 'word') return null;
    if (code.indexOf('word:') === 0) return clip('the answer choice "' + code.slice(5) + '"', status('words', code.slice(5)));
    if (/^\/.+\/$/.test(code)) return clip('the sound ' + code, 'none');
    if (code === 'question' && activity === 'word_families') return 'no recording for the word ending';
    if (code === 'question' || code === 'as in') return 'no recording for the spoken question';
    if (code === 'board') return BOARD_REASONS[activity] || 'this word does not fit the activity';
    if (code === 'rhyme_review_required') return 'no rhyme partner that could be checked by sound';
    if (code === 'sound_review_required') return 'no checked sound-sort set for this word';
    return String(code).replace(/_/g, ' ');
  }

  function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  // The loader writes attributions: [] and has no option for it yet, so the credits are added to
  // the manifest block of the finished file. That block is data, not script: the script hash holds.
  function withCredits(html, extra) {
    var open = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(open);
    if (at < 0) return { html: html, done: false };
    var from = at + open.length, to = html.indexOf('</script>', from);
    if (to < 0) return { html: html, done: false };
    var manifest;
    try { manifest = JSON.parse(html.slice(from, to), function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; }); } catch (_) { return { html: html, done: false }; }
    if (!manifest || typeof manifest !== 'object') return { html: html, done: false };
    Object.keys(extra).forEach(function (key) {
      if (key === 'attributions') manifest.attributions = (Array.isArray(manifest.attributions) ? manifest.attributions : []).concat(extra.attributions.filter(function (line) { return (manifest.attributions || []).indexOf(line) < 0; }));
      else manifest[key] = extra[key];
    });
    return { html: html.slice(0, from) + safeJson(manifest) + html.slice(to), done: true };
  }
  // A student's code name, as a file may carry it: letters (any language), digits, spaces, . _ and -, at most 40.
  // Nothing else, so "Look inside a file" never reads a code name as code.
  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try { return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim(); } catch (_) { return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40); }
  }
  // The file with a code name in its manifest (key "learner"), which the file fills in when it opens. Only the
  // data block changes; the script and its hash do not. buildPacket ends with exactly this, so a file made for
  // one student is this function applied to the file made with no name.
  function withCodeName(html, name) {
    var clean = codeName(name);
    return clean ? withCredits(html, { learner: clean }).html : html;
  }

  // ---------------------------------------------------------------------------
  // buildPacket
  // ---------------------------------------------------------------------------
  function buildPacket(input) {
    var opts = input || {};
    var core = opts.core, loader = opts.loader, wordlist = opts.wordlist || null;
    if (!core || typeof core.soundAnalysis !== 'function') return Promise.reject(new Error('buildPacket needs core (createWordSoundsCore)'));
    if (!loader || typeof loader.lessonFromPack !== 'function' || typeof loader.buildHtml !== 'function') return Promise.reject(new Error('buildPacket needs loader (AlloWordSoundsTakeHome)'));
    var seed = opts.seed == null ? 1 : opts.seed;
    // How many choices a board shows (the maker's "Choices"): 'easy', 'medium' or 'all' (anything else: all).
    var choiceLevel = CHOICE_LEVELS.indexOf(opts.choices) >= 0 ? opts.choices : 'all';
    var directionsOnce = opts.directionsOnce === true || opts.instructionsOnce === true;
    var title = String(opts.title || 'Word Sounds practice').trim().slice(0, 120);
    var exceptions = [];
    var except = function (word, activity, reason) { exceptions.push({ word: word, activity: activity, reason: reason }); };
    var asked = (Array.isArray(opts.words) ? opts.words : String(opts.words || '').split(/[\s,]+/)).map(function (w) { return String(w || '').trim().toLowerCase(); }).filter(Boolean);
    var askedActivities = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : ['isolation']).map(String).filter(function (id, i, all) { return all.indexOf(id) === i; });
    var adapters = loader.ADAPTERS || {};
    var activities = askedActivities.filter(function (id) {
      if (SUPPORTED.indexOf(id) >= 0 && own(adapters, id)) return true;
      except(null, id, own(adapters, id) ? 'this activity cannot be built without AI or a teacher yet' : 'unknown activity');
      return false;
    });
    var blocked = function (word) { return !!wordlist && typeof wordlist.isBlocked === 'function' && wordlist.isBlocked(word); };
    // A soft word (the blocklist file's [soft] sections: fight, ghost, kiss) is one the teacher may use by
    // typing it, and nobody else: never a word the builder puts into a file on its own.
    var softWord = function (word) { var row = wordlist && typeof wordlist.get === 'function' ? wordlist.get(word) : null; return !!row && row.soft === true; };
    // The teacher's own material, checked (see readOwn). A blocked word's is never read.
    var mine = readOwn(opts.own, asked.filter(function (word) { return !blocked(word); }), opts.dictionary && opts.dictionary.labels);
    var ownSounds = function (word) { return own(mine.byWord, word) && mine.byWord[word].sounds ? mine.byWord[word] : null; };
    // The core, with the teacher's split in place of the dictionary's for their words: every part of the
    // build that asks how a word sounds asks dictionarySounds (the aligner is given the sounds it is to align).
    var soundCore = !mine.words.length ? core : Object.create(core, { dictionarySounds: { enumerable: true, value: function (word) {
      var set = ownSounds(String(word == null ? '' : word).trim().toLowerCase());
      return set ? { sounds: set.sounds.slice(), alternates: [], source: 'teacher' } : core.dictionarySounds(word);
    } } });
    var known = opts.knownWords || (wordlist ? wordlist.rows().filter(function (row) { return row.known; }).map(function (row) { return row.word; }) : []);
    var probeLogic = createPackLogic({ core: core, knownWords: known, seed: seed });
    var limit = typeof opts.length === 'number' && Number.isFinite(opts.length) && opts.length > 0 ? Math.floor(opts.length) : (own(LENGTHS, opts.length) ? LENGTHS[opts.length] : 40);
    var words = [];
    asked.forEach(function (word) {
      if (words.indexOf(word) >= 0) return;
      if (blocked(word)) return except(word, null, 'this word is on the blocklist');
      if (unusableTarget(word)) return except(word, null, 'not a usable practice word (letters only, 2 to ' + MAX_LETTERS + ' letters, with a vowel)');
      if (!soundCore.dictionarySounds(word)) return except(word, null, 'not in the sound dictionary');
      if (words.length >= limit) return except(word, null, 'over the length asked for (' + limit + ' words)');
      words.push(word);
    });
    // The teacher's recordings of the practice words, and of no other word.
    var teacherClips = {};
    words.forEach(function (word) { if (own(mine.byWord, word) && mine.byWord[word].clip) teacherClips[core.packAudioKey(word)] = mine.byWord[word].clip; });
    var audio = createAudio(opts.banks, opts.speak, opts.toWav, !!opts.allowUnconverted, teacherClips, opts.toMp3);
    // Answer choices come from the app's own word lists. Blocked and soft words leave that pool, and so
    // do words nobody can say aloud here (no clip in the banks handed in, and no speak), so a choice is
    // never silent. A caller that loads clips on demand loads them for the practice words before it
    // calls: the builder never invents a choice it would have to go and fetch.
    var mayChoose = function (word) { return !blocked(word) && !softWord(word) && (typeof opts.speak === 'function' || audio.hasClip('words', core.packAudioKey(word))); };
    var choicePool = Array.from(probeLogic.k2KnownWords()).filter(mayChoose);
    // Sound Sort takes its choices from another list, the core's own (core.knownWords): once in the board
    // logic, and again in the loader, which makes the board anew when it is handed none. Both are given a
    // core whose list has passed the same rules. (Until 2026-11-11 that list was not filtered: most
    // Sound Sort questions were lost to a choice with no clip, and a blocked word with a clip could be shown.)
    var choiceCore = Object.create(soundCore, { knownWords: { value: (core.knownWords || []).filter(mayChoose), enumerable: true } });
    var logic = createPackLogic({ core: choiceCore, knownWords: choicePool, seed: seed });

    var rows = [];
    var prepare = words.reduce(function (chain, word, index) {
      return chain.then(function () {
        return logic.preparePackWordAiFree({ word: word, index: index, batchWords: words, isEnglish: true, estimate: logic.estimatePackPhonemes });
      }).then(function (row) { if (row && row.phonemeSource === 'dictionary') rows.push(row); else except(word, null, 'not in the sound dictionary'); },
        // One word that cannot be prepared is left out and listed. It never stops the file.
        function (error) { except(word, null, 'this word could not be prepared (' + String((error && error.message) || error).slice(0, 120) + ')'); });
    }, Promise.resolve());

    // pictures: true puts each word's symbol in the file, where `symbols` has one, or the teacher's own
    // picture in its place. Off (the default) leaves the rows without an image, and the file is what it
    // was before pictures existed.
    var hasMatcher = !!(opts.matcher && typeof opts.matcher.matchWord === 'function');
    var wantPictures = opts.pictures === true && ((!!opts.symbols && typeof opts.symbols.get === 'function') || hasMatcher);
    var pictureFiles = Object.create(null), pictureSets = Object.create(null), pictureRefused = [];
    var teacherPicture = function (word) { return opts.pictures === true && own(mine.byWord, word) && mine.byWord[word].picture ? mine.byWord[word].picture : null; };
    var ownPictureShown = Object.create(null);
    // The teacher's letters for each sound, where they gave them: Sound Mapping uses these, not the aligner's.
    var spelledByTeacher = function (word) { var set = ownSounds(word); return set && set.spelling ? set.spelling : null; };

    return prepare.then(function () {
      rows.forEach(function (row) {
        var spelling = spelledByTeacher(row.word);
        if (!spelling) return;
        row.graphemes = spelling.map(function (chunk) { return chunk.text; });
        if (spelling.some(function (chunk) { return chunk.size === 2; })) row.chipSpans = spelling.map(function (chunk) { return chunk.size; }); else delete row.chipSpans;
        delete row._mappingNote;
      });
      logic.compileActivityItems(rows);
      rows.forEach(function (item) {
        var boards = item.activityItems || {};
        // Letter Trace: capital and lowercase (the default), or one of them (opts.tracingCases).
        if (boards.letter_tracing && (opts.tracingCases === 'capital' || opts.tracingCases === 'lowercase')) boards.letter_tracing.cases = opts.tracingCases;
        // Fewer choices (opts.choices 'easy' or 'medium'; see fewerChoices).
        if (choiceLevel !== 'all') fewerChoices(boards, choiceLevel, item.word, item.phonemes, core, seed);
        var picture = teacherPicture(item.word);
        if (picture) { item.image = picture.uri; ownPictureShown[item.word] = picture; }
      });
      var omitItems = Object.create(null);
      if (Array.isArray(opts.omitItems)) opts.omitItems.forEach(function (k) { if (typeof k === 'string' && k) omitItems[k.toLowerCase()] = true; });
      else if (isPlainObject(opts.omitItems)) Object.keys(opts.omitItems).forEach(function (k) { if (opts.omitItems[k]) omitItems[String(k).toLowerCase()] = true; });
      var itemSeeds = Object.create(null);
      if (isPlainObject(opts.itemSeeds)) Object.keys(opts.itemSeeds).forEach(function (k) {
        var b = opts.itemSeeds[k];
        if (b != null && b !== '' && b !== 0 && b !== false) itemSeeds[String(k).toLowerCase()] = String(b);
      });
      if (wantPictures) rows.forEach(function (item) {
        if (ownPictureShown[item.word] || (own(mine.byWord, item.word) && mine.byWord[item.word].noPicture)) return;
        var symbol = null;
        if (opts.symbols && typeof opts.symbols.get === 'function') {
          try { symbol = opts.symbols.get(item.word); } catch (_) { symbol = null; }
        }
        if ((!symbol || typeof symbol.svg !== 'string') && hasMatcher) {
          var symReady = !!(opts.symbols && typeof opts.symbols.get === 'function' && (typeof opts.symbols.ready !== 'function' || opts.symbols.ready()));
          try { symbol = opts.matcher.matchWord({ word: item.word }, { symbols: symReady ? opts.symbols : null, preferDiagrams: true }); } catch (_) { symbol = null; }
        }
        if (!symbol || typeof symbol.svg !== 'string') return;
        var why = svgRefusal(symbol.svg);
        if (why) { pictureRefused.push({ word: item.word, file: String(symbol.file || ''), reason: why }); return; }
        item.image = svgDataUri(symbol.svg);
        pictureFiles[item.word] = String(symbol.file || (symbol.matchType === 'diagram' ? 'diagram:' + item.word : ''));
        pictureSets[item.word] = symbol.set === 'openmoji' ? 'openmoji' : ((symbol.matchType === 'diagram' || symbol.set === 'diagram') ? 'diagram' : 'mulberry');
      });
      var tools = answerTools(soundCore, wordlist);
      var rerollCtx = Object.keys(itemSeeds).length ? { core: choiceCore, tools: tools, audio: audio, seed: seed, pool: choicePool.concat(words) } : null;
      // What oneRightAnswer left out. Spelling Bee and Sight & Spell need no board (they make the question from the word), so
      // the loader is handed their prepare() with these words refused (lessonFromPack's adapters option).
      var guarded = {};
      rows.forEach(function (item) {
        item.activityItems = Object.fromEntries(Object.entries(item.activityItems || {}).filter(function (pair) { return activities.indexOf(pair[0]) >= 0; }));
        activities.forEach(function (id) {
          var key = id + '|' + String(item.word || '').toLowerCase();
          if (omitItems[key]) { delete item.activityItems[id]; guarded[key] = true; except(item.word, id, 'removed by the teacher'); }
          else if (rerollCtx && own(itemSeeds, key) && item.activityItems[id]) rerollActivityBoard(id, item.activityItems[id], item, itemSeeds[key], rerollCtx);
        });
        item._preparedActivities = activities;
        // One right answer on every board, judged by sound (see oneRightAnswer).
        oneRightAnswer(item, soundCore, tools, function (id, reason) { delete item.activityItems[id]; guarded[id + '|' + item.word] = true; except(item.word, id, reason); });
        // Last guard: a blocked word on a board removes that board. So does a soft word, unless it is one
        // of the words the teacher gave (their own word may sit among the choices of another of their words).
        activities.forEach(function (id) {
          var shown = boardWords(id, item.activityItems[id]);
          if (shown.some(blocked)) { delete item.activityItems[id]; guarded[id + '|' + item.word] = true; except(item.word, id, 'an answer choice is on the blocklist'); }
          else if (shown.some(function (word) { return softWord(word) && words.indexOf(word) < 0; })) { delete item.activityItems[id]; guarded[id + '|' + item.word] = true; except(item.word, id, 'an answer choice is a word the picker does not offer'); }
        });
        // A split the teacher gave is theirs to judge.
        if (item.activityItems.mapping && !spelledByTeacher(item.word) && suspectSplit(wordUnits(core, item.word, item.phonemes))) {
          delete item.activityItems.mapping;
          guarded['mapping|' + item.word] = true;
          except(item.word, 'mapping', 'the spelling split for this word needs checking');
        }
      });
      // Pass 1: find out which clips the chosen activities ask for.
      var wanted = [];
      var probe = function (category) {
        return new Proxy({}, { get: function (_, key) {
          if (typeof key !== 'string') return undefined;
          if (category !== 'words' && !audio.hasClip(category, key)) return undefined;
          if (wanted.indexOf(category + '|' + key) < 0) wanted.push(category + '|' + key);
          return 'data:audio/x-probe;base64,' + category + '|' + encodeURIComponent(key);
        } });
      };
      var lessonOptions = function (banks) {
        var idParts = [VERSION, String(seed), title, words, activities];
        if (directionsOnce) idParts.push('once');
        var made = { core: choiceCore, banks: banks, isEnglish: true, showLetters: !!opts.showLetters, activities: activities, title: title,
          lessonId: 'pb-' + hex8(fnv1a(JSON.stringify(idParts))) };
        if (directionsOnce) made.instructionsOnce = true;
        var refused = activities.filter(function (id) { return Object.keys(guarded).some(function (k) { return k.indexOf(id + '|') === 0; }); });
        if (refused.length) made.adapters = refused.reduce(function (acc, id) {
          var base = adapters[id];
          acc[id] = Object.assign({}, base, { prepare: function (w, env) { return own(guarded, id + '|' + String(env.word).toLowerCase()) ? { missing: ['one right answer'] } : base.prepare(w, env); } });
          return acc;
        }, {});
        return made;
      };
      if (!activities.length || !rows.length) return { wanted: wanted, lessonOptions: lessonOptions };
      loader.lessonFromPack(rows, lessonOptions({ words: probe('words'), phonemes: probe('phonemes'), isolation: probe('isolation'), instructions: probe('instructions') }));
      return wanted.reduce(function (chain, id) {
        var at = id.indexOf('|');
        return chain.then(function () { return audio.resolve(id.slice(0, at), id.slice(at + 1)); });
      }, Promise.resolve()).then(function () { return { wanted: wanted, lessonOptions: lessonOptions }; });
    }).then(function (state) {
      // Pass 2: build with the clips that exist. Whatever lacks one is left out and listed.
      var banks = { words: {}, phonemes: {}, isolation: {}, instructions: {} };
      var byUri = {};
      state.wanted.forEach(function (id) {
        var f = audio.found[id];
        if (!f || f.status !== 'ready') return;
        banks[f.category][f.key] = f.uri;
        if (!byUri[f.uri]) byUri[f.uri] = f;
      });
      var built = activities.length && rows.length ? loader.lessonFromPack(rows, state.lessonOptions(banks)) : { lesson: null, exceptions: [], perActivity: [] };
      var already = {};
      exceptions.forEach(function (e) { already[e.activity + '|' + e.word] = true; });
      built.exceptions.forEach(function (e) {
        if (already[e.activity + '|' + e.word]) return;
        var codes = Array.isArray(e.missing) && e.missing.length ? e.missing : ['board'];
        var reasons = [];
        codes.forEach(function (code) {
          var f = audio.found['words|' + core.packAudioKey(e.word)];
          var reason = code === 'word'
            ? (f && f.status === 'needs_converter' ? 'the recording for this word is WebM and no converter was supplied'
              : f && f.status === 'convert_failed' ? 'the recording for this word could not be converted to WAV' : 'no recording for this word')
            : plainReason(e.activity, String(code), audio);
          if (reason && reasons.indexOf(reason) < 0) reasons.push(reason);
        });
        except(e.word, e.activity, reasons.join('; '));
      });
      var lesson = built.lesson && built.lesson.blocks && built.lesson.blocks.length ? built.lesson : null;
      // The questions' order (questionOrder). The revision follows it, so a student's saved place in one order is never
      // read against another; the file's id does not change.
      var sequence = lesson ? questionOrder(lesson, opts.order, opts.orderSeed == null ? seed : opts.orderSeed) : null;
      if (sequence) {
        lesson.sequence = sequence;
        lesson.revision = String(lesson.revision) + 'm' + hex8(fnv1a(sequence.join(',')));
      }
      var clips = [], bySource = {};
      if (lesson) {
        lesson.createdAt = typeof opts.createdAt === 'string' ? opts.createdAt : '';
        Object.keys(lesson.audio).forEach(function (id) {
          var f = byUri[lesson.audio[id]] || {};
          var kind = f.category === 'words' ? 'word' : f.category === 'phonemes' ? 'sound' : f.category === 'isolation' ? 'position question' : 'instruction';
          clips.push({ id: id, kind: kind, key: f.key || '', source: f.source || 'unknown', format: f.format || '' });
          bySource[f.source || 'unknown'] = (bySource[f.source || 'unknown'] || 0) + 1;
        });
      }
      var byActivity = {};
      activities.forEach(function (id) { byActivity[id] = 0; });
      if (lesson) lesson.blocks.forEach(function (block) { byActivity[block.activity] = block.items.length; });
      var usedWords = lesson ? words.filter(function (word) { return lesson.blocks.some(function (block) { return block.items.some(function (item) { return String(item.word).toLowerCase() === word; }); }); }) : [];
      words.forEach(function (word) {
        if (usedWords.indexOf(word) < 0 && !exceptions.some(function (e) { return e.word === word && e.activity === null; })) except(word, null, 'no activity could be built for this word');
      });
      var notices = [{ id: 'cmudict', name: 'Carnegie Mellon Pronouncing Dictionary', text: CMUDICT_NOTICE }];
      var attributions = ATTRIBUTIONS.filter(function (line, index) { return index === 0 || (index === 1 ? bySource[SOURCE_NAMES.kokoro] || bySource[SOURCE_NAMES.spoken] : bySource[SOURCE_NAMES.recorded]); });
      // A word counts as having a picture when the file shows one for it: an activity that never
      // shows the word's picture does not carry it.
      var withPicture = [], withoutPicture = [], withSymbol = [], withOwnPicture = [];
      if (opts.pictures === true) usedWords.forEach(function (word) {
        var shown = (wantPictures || !!ownPictureShown[word]) && lesson.blocks.some(function (block) { return block.items.some(function (item) { return item.wordPicture != null && String(item.word).toLowerCase() === word; }); });
        (shown ? withPicture : withoutPicture).push(word);
        if (shown) (ownPictureShown[word] ? withOwnPicture : withSymbol).push(word);
      });
      // Each set is credited, and its notice carried, only when one of its pictures is in the file. A file
      // with pictures of both sets names the words of each; a file with one set's is what it always was.
      var withOpenMoji = withSymbol.filter(function (word) { return pictureSets[word] === 'openmoji'; });
      var withDiagram = withSymbol.filter(function (word) { return pictureSets[word] === 'diagram'; });
      var withMulberry = withSymbol.filter(function (word) { return pictureSets[word] !== 'openmoji' && pictureSets[word] !== 'diagram'; });
      var omVersion = opts.symbols && opts.symbols.credits && opts.symbols.credits.openmoji && /^[\w.]{1,16}$/.test(String(opts.symbols.credits.openmoji.version || '')) ? String(opts.symbols.credits.openmoji.version) : '';
      var namedOthers = withOpenMoji.length || withDiagram.length;
      if (withMulberry.length) {
        attributions.push(namedOthers ? pictureCredit(withMulberry) : pictureCredit());
        notices.push({ id: 'mulberry', name: MULBERRY_CREDIT.set, text: namedOthers ? mulberryNotice(withMulberry) : MULBERRY_NOTICE });
      }
      if (withOpenMoji.length) {
        attributions.push(openMojiCredit(withOpenMoji));
        notices.push({ id: 'openmoji', name: OPENMOJI_CREDIT.set, text: openMojiNotice(withOpenMoji, omVersion) });
      }
      if (withDiagram.length) {
        attributions.push('Curriculum diagrams: AlloFlow Curriculum Diagrams (AGPL-3.0) (' + withDiagram.join(', ') + ')');
      }
      // The teacher's own material: which words carry it, in About this file, and each picture's credit.
      var ownFacts = null, ownManifest = null;
      if (mine.words.length) {
        var setSounds = usedWords.filter(function (word) { return !!ownSounds(word); });
        var recorded = usedWords.filter(function (word) { return clips.some(function (clip) { return clip.kind === 'word' && clip.key === core.packAudioKey(word) && clip.source === SOURCE_NAMES.teacher; }); });
        var pictured = withOwnPicture.map(function (word) { var p = ownPictureShown[word]; return { word: word, credit: p.line, own: p.own, shareAlike: p.shareAlike }; });
        if (setSounds.length) attributions.push('Sounds set by the teacher: ' + setSounds.join(', '));
        if (recorded.length) attributions.push('Recorded by the teacher: ' + recorded.join(', '));
        var theirs = pictured.filter(function (p) { return p.own; }).map(function (p) { return p.word; });
        if (theirs.length) attributions.push('Pictures added by the teacher: ' + theirs.join(', '));
        pictured.forEach(function (p) { if (!p.own) attributions.push('Picture for ' + p.word + ': ' + p.credit.replace(/\.$/, '')); });
        // Share-alike pictures stay a separately licensed work, as the Mulberry symbols do.
        var shareAlike = pictured.filter(function (p) { return p.shareAlike; });
        if (shareAlike.length) notices.push({ id: 'share-alike', name: 'Pictures under a share-alike license', text: SHARE_ALIKE_NOTICE + '\n' + shareAlike.map(function (p) { return p.word + ': ' + p.credit; }).join('\n') });
        var listed = pictured.map(function (p) { return { word: p.word, credit: p.credit }; });
        if (setSounds.length || recorded.length || listed.length) ownFacts = { sounds: setSounds, recordings: recorded, pictures: listed };
        ownManifest = { words: mine.words.slice(), sounds: setSounds, recordings: recorded, pictures: listed, refused: mine.refused.slice() };
      }
      var manifest = {
        kind: 'alloflow-packet-build-manifest', builder: VERSION, seed: seed, title: title,
        // How many choices the boards show (2026-11-13): 'easy', 'medium' or 'all'.
        choices: choiceLevel,
        learnerLabel: codeName(opts.learnerLabel),
        packet: lesson ? { id: lesson.lessonId, version: lesson.revision } : null,
        words: { asked: asked, used: usedWords },
        activities: { asked: askedActivities, built: Object.keys(byActivity).filter(function (id) { return byActivity[id] > 0; }) },
        items: { total: Object.keys(byActivity).reduce(function (n, id) { return n + byActivity[id]; }, 0), byActivity: byActivity },
        exceptions: exceptions,
        audio: { clips: clips.length, bySource: bySource, list: clips },
        safety: wordlist ? 'words and answer choices were checked against the blocklist (a first pass that needs human review)' : 'no word list was supplied: nothing was checked against the blocklist',
        choice: opts.picked && opts.picked.criteria ? opts.picked.criteria : null,
        ai: 'none', attributions: attributions, notices: notices, creditsInFile: false,
      };
      if (directionsOnce) manifest.directionsOnce = true;
      if (opts.picked && opts.picked.criteria && (opts.picked.criteria.stage || (Array.isArray(opts.picked.criteria.stages) && opts.picked.criteria.stages.some(function (id) { return !/^wider:/.test(id); })))) manifest.stageNote = STAGE_NOTE;
      if (manifest.learnerLabel) manifest.openWith = '#learner=' + encodeURIComponent(manifest.learnerLabel);
      if (ownManifest) manifest.own = ownManifest;
      // Only a packet asked for with pictures says anything about them.
      var pictureFacts = null;
      if (opts.pictures === true) {
        var version = opts.symbols && opts.symbols.credit && /^[\w.]{1,16}$/.test(String(opts.symbols.credit.version || '')) ? String(opts.symbols.credit.version) : '';
        pictureFacts = { set: MULBERRY_CREDIT.set, version: version, license: MULBERRY_CREDIT.license, wordsWithPicture: withPicture.length, wordsWithoutPicture: withoutPicture.length };
        manifest.pictures = { asked: true, symbols: wantPictures, set: MULBERRY_CREDIT.set, version: version, license: MULBERRY_CREDIT.license,
          withPicture: withPicture, withoutPicture: withoutPicture, counts: { withPicture: withPicture.length, withoutPicture: withoutPicture.length },
          files: withSymbol.reduce(function (acc, word) { acc[word] = pictureFiles[word] || ''; return acc; }, {}), refused: pictureRefused };
        // The teacher's pictures: counted apart, and the symbol set is named only when a symbol is shown.
        if (withOwnPicture.length) {
          manifest.pictures.teacher = withOwnPicture;
          manifest.pictures.counts.teacher = withOwnPicture.length;
          pictureFacts.wordsWithTeacherPicture = withOwnPicture.length;
          if (!withSymbol.length) { delete pictureFacts.set; delete pictureFacts.version; delete pictureFacts.license; }
        }
        // OpenMoji pictures: named apart; the Mulberry fields stay only when a Mulberry picture is shown.
        if (withOpenMoji.length) {
          var omFacts = { set: OPENMOJI_CREDIT.set, version: omVersion, license: OPENMOJI_CREDIT.license };
          manifest.pictures.openmoji = { set: omFacts.set, version: omVersion, license: omFacts.license, words: withOpenMoji };
          manifest.pictures.counts.openmoji = withOpenMoji.length;
          pictureFacts.openmoji = { set: omFacts.set, version: omVersion, license: omFacts.license, words: withOpenMoji.length };
          if (!withMulberry.length) { delete pictureFacts.set; delete pictureFacts.version; delete pictureFacts.license; }
        }
        if (withDiagram.length) {
          manifest.pictures.diagram = { set: 'AlloFlow Curriculum Diagrams', license: 'AGPL-3.0', words: withDiagram };
          manifest.pictures.counts.diagram = withDiagram.length;
          pictureFacts.diagram = { set: 'AlloFlow Curriculum Diagrams', license: 'AGPL-3.0', words: withDiagram.length };
          if (!withMulberry.length) { delete pictureFacts.set; delete pictureFacts.version; delete pictureFacts.license; }
        }
      }
      // noFile: everything but the file itself (trialBuild asks only which questions there would be).
      if (!lesson || opts.noFile === true) return { html: '', lesson: lesson, manifest: manifest, exceptions: exceptions, sha256: '' };
      // The missed questions once more at the end, as practice (opts.repeatMissed, 2026-11-17).
      if (opts.repeatMissed === true) lesson.repeatMissed = true;
      var html = loader.buildHtml(lesson, { core: core, attributions: attributions });
      var extra = { attributions: attributions, notices: notices,
        // choices: the maker's Choices, so "Open a file I made" can read it back (packets_reopen.js).
        builder: { name: VERSION, seed: seed, ai: 'none', words: usedWords.length, items: manifest.items.total, choices: choiceLevel } };
      if (directionsOnce) extra.builder.directionsOnce = true;
      // How the questions were put in order, for "Open a file I made": 'mixed' or 'own' (the order is lesson.sequence).
      if (sequence) extra.builder.order = Array.isArray(opts.order) ? 'own' : 'mixed';
      if (sequence && !Array.isArray(opts.order) && typeof opts.orderSeed === 'number' && opts.orderSeed !== seed) extra.builder.orderSeed = opts.orderSeed;
      // The file itself changes only when it really holds a picture.
      if (pictureFacts && withPicture.length) extra.pictures = pictureFacts;
      // And only when it really holds something of the teacher's.
      if (ownFacts) extra.own = ownFacts;
      var credited = withCredits(html, extra);
      manifest.creditsInFile = credited.done;
      // A student's code name goes in last, the way withCodeName adds it to a finished file.
      var finished = withCodeName(credited.html, manifest.learnerLabel);
      var digest = typeof loader.sha256 === 'function' ? loader.sha256(finished) : null;
      return { html: finished, lesson: lesson, manifest: manifest, exceptions: exceptions, sha256: digest ? digest.hex : '' };
    });
  }

  // ---------------------------------------------------------------------------
  // pickWords
  // ---------------------------------------------------------------------------
  // The stage table is DATA, not code: data/word_sounds_stages_en.json, with the document that
  // places each group of letter-sound units at its stage. word_sounds_wordlist_en.js carries a copy
  // (wordlist.stages) so a page needs no fetch; a caller may pass another table as context.stages.
  // A unit is "letters>sound" as core.soundAnalysis aligns them; "/pattern" marks a long vowel
  // written with one letter (silent_e, open_syllable, y_as_vowel, single_letter).
  // STAGE_IDS names the rows of the default (US, Common Core) table; a test keeps it equal to the data.
  var STAGE_IDS = ['K early', 'K late', 'G1 early', 'G1 late', 'G2', 'G3+'];
  var STAGE_NOTE = 'Stage rows follow the grade placements of the Common Core Reading Foundational Skills standards where the standards give one, ' +
    'and common classroom practice where they do not; the stage table says which. A row marked PROVISIONAL has not been checked against a source document.';
  var VOWEL_LABELS = 'a e i o u ay ee ie oa oo oo_short oy ow aw ar or er ir ur air ear schwa'.split(' ');
  var LONG_VOWELS = { ay: true, ee: true, ie: true, oa: true, oo: true };
  var compiledTables = [];
  // Turns the data table into one lookup per stage. Each stage holds its own units and those of the rows before it.
  function compileStages(table) {
    if (!table || !Array.isArray(table.frameworks)) return null;
    for (var k = 0; k < compiledTables.length; k++) if (compiledTables[k].table === table) return compiledTables[k].compiled;
    var compiled = { byId: Object.create(null), list: [] };
    table.frameworks.forEach(function (framework) {
      var units = Object.create(null), anyUnit = false;
      (framework.stages || []).forEach(function (stage) {
        var bases = Object.create(null), sources = 0;
        (stage.groups || []).concat(stage.limits ? [stage.limits] : []).forEach(function (group) {
          if (group.basis) bases[group.basis] = true;
          sources += (group.sources || []).length;
        });
        (stage.groups || []).forEach(function (group) {
          String(group.units || '').split(' ').forEach(function (u) { if (u === '*') anyUnit = true; else if (u) units[u] = true; });
        });
        var limits = stage.limits || {}, avoidFinal = Object.create(null), mine = Object.create(null);
        String(limits.avoidFinal || '').split(' ').forEach(function (s) { if (s) avoidFinal[s] = true; });
        Object.keys(units).forEach(function (u) { mine[u] = true; });
        var verified = stage.verified === true;
        var one = { id: stage.id, label: stage.label || stage.id, framework: framework.id, frameworkLabel: framework.label || framework.id,
          isDefault: framework.id === table.defaultFramework, verified: verified,
          basis: bases.standard && bases['common practice'] ? 'standard and common practice' : bases.standard ? 'standard' : 'common practice',
          sources: sources, units: mine, anyUnit: anyUnit, clusters: !!limits.clusters, silentE: !!limits.silentE,
          maxSyllables: limits.maxSyllables > 0 ? limits.maxSyllables : 0, maxSounds: limits.maxSounds > 0 ? limits.maxSounds : 0,
          longVowelsInLongerWords: limits.longVowelsInLongerWords !== false, avoidFinal: avoidFinal, allowBritish: !!framework.allowBritish,
          note: verified ? 'Checked on ' + (table.checked || 'an unrecorded date') + ' against ' + (framework.checkedAgainst || 'the source documents') + '. ' +
            (bases.standard && bases['common practice'] ? 'That document places part of this row at this grade or year; the rest follows common classroom practice, not a standard.'
              : bases.standard ? 'That document places everything in this row at this grade or year.' : 'This row follows common classroom practice, not a standard.')
            : (stage.provisional || 'PROVISIONAL: this stage row has not been checked against a source document.') };
        compiled.byId[String(stage.id).trim().toLowerCase().replace(/\s+/g, ' ')] = one;
        compiled.list.push(one);
      });
    });
    if (compiledTables.length >= 8) compiledTables.shift();
    compiledTables.push({ table: table, compiled: compiled });
    return compiled;
  }
  // The table a caller did not pass: the copy inside the word list script, when a page or node has loaded it.
  function defaultStageTable() {
    var loaded = root && root.AlloModules && root.AlloModules.WordSoundsWordlist;
    return loaded && loaded.stages ? loaded.stages : null;
  }
  function stageOf(name, table) {
    var compiled = compileStages(table || defaultStageTable());
    if (!compiled) return null;
    return compiled.byId[String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')] || null;
  }
  // For a page: the rows of a table, in order, with what to print beside each.
  function stageList(table) {
    var compiled = compileStages(table || defaultStageTable());
    return !compiled ? [] : compiled.list.map(function (s) {
      return { id: s.id, label: s.label, framework: s.framework, frameworkLabel: s.frameworkLabel, isDefault: s.isDefault, verified: s.verified, basis: s.basis, note: s.note,
        maxSyllables: s.maxSyllables, maxSounds: s.maxSounds };
    });
  }
  // The word as taught units: [{ letters, sounds, key, vowel, silentE }], or null when it does not align.
  function wordUnits(core, word, sounds) {
    var analysis = core.soundAnalysis(word, sounds);
    if (!analysis || !analysis.chunks || analysis.mapping.status !== 'ready') return null;
    var patterns = {};
    analysis.flags.vowelPatterns.forEach(function (p) { patterns[p.start] = p.pattern; });
    var units = analysis.chunks.map(function (chunk) {
      var letters = chunk.silentE ? chunk.text.slice(0, -1) : chunk.text;
      var mine = sounds.slice(chunk.start, chunk.start + chunk.size);
      var pattern = patterns[chunk.start];
      return { letters: letters, sounds: mine, silentE: !!chunk.silentE, vowel: mine.some(function (s) { return VOWEL_LABELS.indexOf(s) >= 0; }),
        pattern: pattern || '', key: letters + '>' + mine.join('+') + (pattern && pattern !== 'vowel_team' ? '/' + pattern : '') };
    });
    // nose, these, size, face, cage: the aligner gives the final e to the consonant (se, ze, ce, ge) and
    // calls the vowel a lone letter. For a teacher it is the same final-e pattern as make.
    // The aligner also names no pattern for u said as two sounds (cute, music): final e or open syllable.
    units.forEach(function (u, i) {
      var next = units[i + 1];
      var finalE = !!next && !next.vowel && (next.silentE || (next.letters.length === 2 && next.letters.charAt(1) === 'e'));
      var twoSoundU = !u.pattern && u.letters === 'u' && u.sounds.length === 2 && u.vowel;
      if ((u.pattern === 'single_letter' && finalE && !next.silentE) || twoSoundU) {
        u.pattern = twoSoundU && !finalE ? 'open_syllable' : 'silent_e';
        u.key = u.letters + '>' + u.sounds.join('+') + '/' + u.pattern;
      }
    });
    return units;
  }
  // Does the word stay inside the stage: only its units, and inside its length limits?
  function fitsStage(stage, units) {
    if (!units || !units.length || !stage) return false;
    var sounds = 0, syllables = 0, long = false;
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (!stage.anyUnit && !stage.units[u.key]) return false;
      if (u.silentE && !stage.silentE) return false;
      if (!stage.clusters && i > 0 && !u.vowel && !units[i - 1].vowel) return false;
      for (var j = 0; j < u.sounds.length; j++) {
        sounds++;
        if (VOWEL_LABELS.indexOf(u.sounds[j]) >= 0) { syllables++; if (LONG_VOWELS[u.sounds[j]]) long = true; }
      }
    }
    if (stage.maxSounds && sounds > stage.maxSounds) return false;
    if (stage.maxSyllables && syllables > stage.maxSyllables) return false;
    if (stage.longVowelsInLongerWords === false && syllables > 1 && long) return false;
    var last = units[units.length - 1];
    if (stage.avoidFinal && stage.avoidFinal[last.letters === 'x' ? 'x' : last.sounds[last.sounds.length - 1]]) return false;
    return true;
  }
  // The aligner splits shop as s + ho + p (the h goes with the vowel, as in honest). Until that is
  // fixed in word_sounds_core.js, such a split is not shown to a learner.
  function suspectSplit(units) {
    return !!units && units.some(function (u, i) {
      return i > 0 && u.vowel && /^h[aeiouy]/.test(u.letters) && /^[sctpwg]$/.test(units[i - 1].letters) && ['sh', 'ch', 'th', 'dh', 'f', 'w'].indexOf(units[i - 1].sounds[0]) >= 0;
    });
  }
  function atPosition(index, length, position) {
    return position === 'first' ? index === 0 : position === 'last' ? index === length - 1
      : position === 'middle' ? index > 0 && index < length - 1 : true;
  }

  function pickWords(criteria, context) {
    var c = criteria || {}, ctx = context || {};
    var wordlist = ctx.wordlist, core = ctx.core, dictionary = ctx.dictionary;
    if (!wordlist || typeof wordlist.rows !== 'function') throw new Error('pickWords needs wordlist (word_sounds_wordlist_en.js)');
    if (!core || typeof core.soundAnalysis !== 'function') throw new Error('pickWords needs core (createWordSoundsCore)');
    var seed = ctx.seed == null ? 1 : ctx.seed;
    var count = c.count > 0 ? Math.floor(c.count) : 10;
    // Familiar = on the app's own lists, OR common enough in children's books. maxRank (the older
    // reading-library rule) is one more way in, only when the caller passes it or the word list is an
    // old one with no child-book column.
    var hasChildBooks = !!(wordlist.meta && wordlist.meta.childBooks);
    var minZipf = c.minZipf > 0 ? Number(c.minZipf) : DEFAULT_MIN_ZIPF;
    var minBooks = typeof c.minBooks === 'number' && c.minBooks >= 0 ? c.minBooks : DEFAULT_MIN_BOOKS;
    var maxRank = c.maxRank > 0 ? c.maxRank : hasChildBooks ? 0 : DEFAULT_MAX_RANK;
    var requireClip = c.requireClip !== false;
    var stageTable = ctx.stages || wordlist.stages || defaultStageTable();
    var compiledStages = stageTable ? compileStages(stageTable) : null;
    var parseStageEntry = function (raw) {
      var text = String(raw || '').trim();
      if (!text) return null;
      var wideMatch = /^wider:(challenging|advanced)$/i.exec(text);
      var wideName = wideMatch ? wideMatch[1].toLowerCase() : (WIDER_LEVELS.indexOf(text.toLowerCase()) >= 0 ? text.toLowerCase() : '');
      if (wideName) return { kind: 'level', id: 'wider:' + wideName, level: wideName };
      if (!stageTable) throw new Error('pickWords needs the stage table (wordlist.stages or context.stages) to use a stage');
      var st = stageOf(text, stageTable);
      if (!st) throw new Error('Unknown stage: ' + text + ' (use ' + compiledStages.list.map(function (s) { return s.id; }).join(', ') + ')');
      return { kind: 'stage', id: st.id, stage: st };
    };
    var shapesList = [];
    if (Array.isArray(c.shapes)) {
      c.shapes.forEach(function (s) {
        var up = String(s || '').trim().toUpperCase();
        if (up && shapesList.indexOf(up) < 0) shapesList.push(up);
      });
    }
    if (!shapesList.length && c.shape) shapesList.push(String(c.shape).trim().toUpperCase());
    var stagesList = [], stageSeen = Object.create(null);
    var rawStages = [].concat(Array.isArray(c.stages) ? c.stages : [], Array.isArray(c.levels) ? c.levels : []);
    rawStages.forEach(function (raw) {
      var entry = parseStageEntry(raw);
      if (entry && !stageSeen[entry.id]) { stageSeen[entry.id] = true; stagesList.push(entry); }
    });
    var level = WIDER_LEVELS.indexOf(c.level) >= 0 ? c.level : '';
    if (c.level && !level) throw new Error('Unknown level: ' + c.level + ' (use ' + WIDER_LEVELS.join(', ') + ')');
    var stage = c.stage ? stageOf(c.stage, stageTable) : null;
    if (c.stage && !stageTable) throw new Error('pickWords needs the stage table (wordlist.stages or context.stages) to use a stage');
    if (c.stage && !stage) throw new Error('Unknown stage: ' + c.stage + ' (use ' + compiledStages.list.map(function (s) { return s.id; }).join(', ') + ')');
    if (!stagesList.length) {
      if (level) stagesList.push({ kind: 'level', id: 'wider:' + level, level: level });
      else if (stage) stagesList.push({ kind: 'stage', id: stage.id, stage: stage });
    } else if (stagesList.length === 1) {
      if (stagesList[0].kind === 'level') { level = stagesList[0].level; stage = null; }
      else { stage = stagesList[0].stage; level = ''; }
    }
    var isMulti = shapesList.length >= 2 || stagesList.length >= 2;
    // British spellings and words (colour, mum) are left out unless asked for, or the stage is an England row.
    var allowBritish = c.british === true || (c.british !== false && !!stage && stage.allowBritish);
    var syllables = c.syllables > 0 ? Math.floor(c.syllables) : 0;
    var shape = shapesList.length === 1 ? shapesList[0] : '';
    var target = c.targetSound ? String(c.targetSound).replace(/^\/|\/$/g, '').trim().toLowerCase() : '';
    var spelling = c.spellingPattern ? String(c.spellingPattern).trim().toLowerCase() : '';
    var position = c.position || 'any';
    var exclude = Object.create(null);
    (c.exclude || []).forEach(function (w) { exclude[String(w).trim().toLowerCase()] = true; });
    var soundsOf = function (word) {
      var found = dictionary && typeof dictionary.lookup === 'function' ? dictionary.lookup(word)[0] : null;
      if (found && found.length) return Array.prototype.slice.call(found);
      var entry = core.dictionarySounds(word);
      return entry ? entry.sounds : null;
    };
    if (isMulti) {
      var hasWider = stagesList.some(function (e) { return e.kind === 'level'; });
      var hasStage = stagesList.some(function (e) { return e.kind === 'stage'; });
      var multiAllowBritish = c.british === true || (c.british !== false && stagesList.some(function (e) { return e.kind === 'stage' && e.stage.allowBritish; }));
      var maxWordLen = hasWider ? MAX_LETTERS : GRADE_MAX_LETTERS;
      // For cumulative stages within the same framework, find each selected stage's immediately lower selected stage
      // so we prioritize its stage-exclusive band (falling back to overlap only if the exclusive band is sparse).
      var prevStageById = Object.create(null);
      if (hasStage && compiledStages) {
        var byFw = Object.create(null);
        stagesList.forEach(function (e) {
          if (e.kind !== 'stage') return;
          var fw = e.stage.framework || '';
          if (!byFw[fw]) byFw[fw] = [];
          byFw[fw].push(e);
        });
        Object.keys(byFw).forEach(function (fw) {
          var list = byFw[fw].slice().sort(function (a, b) {
            return compiledStages.list.indexOf(a.stage) - compiledStages.list.indexOf(b.stage);
          });
          for (var idx = 1; idx < list.length; idx++) prevStageById[list[idx].id] = list[idx - 1].stage;
        });
      }
      var stageSpecs = stagesList.length ? stagesList : [{ kind: 'any', id: '' }];
      var shapeSpecs = shapesList.length ? shapesList : [''];
      var buckets = [], bucketByKey = Object.create(null);
      stageSpecs.forEach(function (sp) {
        shapeSpecs.forEach(function (sh) {
          var key = sp.id + '|' + sh;
          var b = { key: key, stageSpec: sp, shape: sh, primary: [], fallback: [] };
          buckets.push(b);
          bucketByKey[key] = b;
        });
      });
      var mReasons = { fitsTheCriteria: 0, blocked: 0, soundsLikeABlockedWord: 0, oneDroppedSoundFromABlockedWord: 0, usedOnlyWhenTyped: 0, britishSpellingOrWord: 0, notFamiliarEnough: 0, noRecording: 0, excluded: 0 };
      if (hasWider) { mReasons.inTheGradeLevels = 0; mReasons.notReadForTheWiderLevels = 0; mReasons.inTheOtherWiderLevel = 0; }
      var mPool = [], mCommon = Object.create(null), mSoundCount = Object.create(null);
      var spellingSplit = spelling ? /^([a-z])_e$/.exec(spelling) : null;
      wordlist.rows().forEach(function (row) {
        if (!/^[a-z]+$/.test(row.word) || row.word.length < 2 || row.word.length > maxWordLen || !/[aeiouy]/.test(row.word)) return;
        if (c.sounds > 0 && row.sounds !== c.sounds) return;
        if (shapesList.length && shapesList.indexOf(row.shape) < 0) return;
        if (syllables && row.shape.split('V').length - 1 !== syllables) return;
        var needUnits = hasStage || !!spelling;
        var sounds = target || needUnits ? soundsOf(row.word) : null;
        if ((target || needUnits) && !sounds) return;
        if (target && !sounds.some(function (s, i) { return s === target && atPosition(i, sounds.length, position); })) return;
        var units = null;
        if (needUnits) {
          units = wordUnits(core, row.word, sounds);
          if (!units || suspectSplit(units)) return;
          if (spelling) {
            var hit = units.some(function (u, i) {
              if (!atPosition(i, units.length, position)) return false;
              return spellingSplit ? u.letters === spellingSplit[1] && u.pattern === 'silent_e' : u.letters === spelling;
            });
            if (!hit) return;
          }
        }
        var structural = stageSpecs.filter(function (sp) {
          if (sp.kind === 'level') return row.word.length <= MAX_LETTERS;
          if (sp.kind === 'stage') return row.word.length <= GRADE_MAX_LETTERS && fitsStage(sp.stage, units);
          return row.word.length <= GRADE_MAX_LETTERS;
        });
        if (!structural.length) return;
        mReasons.fitsTheCriteria++;
        if (row.blocked) { mReasons.blocked++; return; }
        if (row.nearBlocked) { mReasons.soundsLikeABlockedWord++; return; }
        if (c.avoidDroppedSound && row.dropBlocked) { mReasons.oneDroppedSoundFromABlockedWord++; return; }
        if (row.soft) { mReasons.usedOnlyWhenTyped++; return; }
        var familiar = row.known || (row.zipf >= minZipf && row.books >= minBooks) || (maxRank > 0 && row.rank > 0 && row.rank <= maxRank);
        var matched = [], failBrit = false, failFam = false, failWider = false, failOtherWider = false, failInGrade = false;
        structural.forEach(function (sp) {
          if (sp.kind === 'level') {
            if (row.british && c.british !== true) { failBrit = true; return; }
            if (familiar) { failInGrade = true; return; }
            if (!row.wider) { failWider = true; return; }
            if ((sp.level === 'challenging') !== (row.books >= WIDER_MIN_BOOKS)) { failOtherWider = true; return; }
            matched.push(sp);
          } else if (sp.kind === 'stage') {
            var spBrit = c.british === true || (c.british !== false && !!sp.stage.allowBritish);
            if (row.british && !spBrit) { failBrit = true; return; }
            if (!familiar) { failFam = true; return; }
            matched.push(sp);
          } else {
            if (row.british && c.british !== true) { failBrit = true; return; }
            if (!familiar) { failFam = true; return; }
            matched.push(sp);
          }
        });
        if (!matched.length) {
          if (failBrit) mReasons.britishSpellingOrWord++;
          else if (failFam) mReasons.notFamiliarEnough++;
          else if (failWider && hasWider) mReasons.notReadForTheWiderLevels++;
          else if (failOtherWider && hasWider) mReasons.inTheOtherWiderLevel++;
          else if (failInGrade && hasWider) mReasons.inTheGradeLevels++;
          return;
        }
        if (requireClip && !row.hasClip) { mReasons.noRecording++; return; }
        if (exclude[row.word]) { mReasons.excluded++; return; }
        mPool.push(row.word);
        mSoundCount[row.word] = row.sounds;
        mCommon[row.word] = hasChildBooks ? Number(row.zipf) || 0 : row.rank > 0 ? -row.rank : -1e9;
        var shKey = shapesList.length ? row.shape : '';
        matched.forEach(function (sp) {
          var b = bucketByKey[sp.id + '|' + shKey];
          if (!b) return;
          if (sp.kind === 'stage' && prevStageById[sp.id] && fitsStage(prevStageById[sp.id], units)) b.fallback.push(row.word);
          else b.primary.push(row.word);
        });
      });
      var mRand = mulberry32(seedFor(seed, 'pickWords'));
      var useFullMix = c.mix !== 'common';
      var shufflePart = function (arr) {
        var copy = arr.slice().sort();
        var bnd = useFullMix ? copy.length : COMMON_BAND;
        if (bnd < copy.length) copy.sort(function (a, b) { return mCommon[b] - mCommon[a] || (a < b ? -1 : a > b ? 1 : 0); });
        for (var f = 0; f < copy.length; f += bnd) {
          var t = Math.min(copy.length, f + bnd);
          for (var ii = t - 1; ii > f; ii--) {
            var jj = f + Math.floor(mRand() * (ii - f + 1));
            var sw = copy[ii]; copy[ii] = copy[jj]; copy[jj] = sw;
          }
        }
        return copy;
      };
      var activeBuckets = [];
      buckets.forEach(function (b) {
        if (!b.primary.length && !b.fallback.length) return;
        activeBuckets.push(shufflePart(b.primary).concat(shufflePart(b.fallback)));
      });
      var turn = activeBuckets.map(function (_, idx) { return idx; });
      for (var ti = turn.length - 1; ti > 0; ti--) {
        var tj = Math.floor(mRand() * (ti + 1));
        var ts = turn[ti]; turn[ti] = turn[tj]; turn[tj] = ts;
      }
      var ptr = activeBuckets.map(function () { return 0; });
      var seenWord = Object.create(null), mOrder = [];
      while (mOrder.length < mPool.length) {
        var progressed = false;
        for (var tk = 0; tk < turn.length; tk++) {
          var bi = turn[tk], list = activeBuckets[bi];
          while (ptr[bi] < list.length && seenWord[list[ptr[bi]]]) ptr[bi]++;
          if (ptr[bi] < list.length) {
            var w = list[ptr[bi]++];
            seenWord[w] = true;
            mOrder.push(w);
            progressed = true;
          }
        }
        if (!progressed) break;
      }
      if (c.spread === 'sounds') {
        var mBySounds = {}, mNums = [], mDealt = [];
        mOrder.forEach(function (word) { var n = mSoundCount[word]; if (!mBySounds[n]) { mBySounds[n] = []; mNums.push(n); } mBySounds[n].push(word); });
        mNums.sort(function (a, b) { return a - b; });
        [mNums.filter(function (n) { return n >= 2 && n <= 6; }), mNums.filter(function (n) { return n < 2 || n > 6; })].forEach(function (set) {
          var size = set.reduce(function (sum, n) { return sum + mBySounds[n].length; }, 0), start = mDealt.length;
          for (var round = 0; mDealt.length - start < size; round++) set.forEach(function (n) { if (round < mBySounds[n].length) mDealt.push(mBySounds[n][round]); });
        });
        mOrder = mDealt;
      }
      var mUsed = { count: count, sounds: c.sounds || null, shape: shapesList.length === 1 ? shapesList[0] : null, targetSound: target || null, spellingPattern: spelling || null,
        position: target || spelling ? position : null, stage: stagesList.length === 1 && stagesList[0].kind === 'stage' ? stagesList[0].id : null, syllables: syllables || null,
        familiarity: hasChildBooks ? 'on the app lists, or child-book Zipf >= ' + minZipf + ' in >= ' + minBooks + ' books' + (maxRank ? ', or reading-library rank <= ' + maxRank : '')
          : 'on the app lists, or reading-library rank <= ' + maxRank,
        minZipf: hasChildBooks ? minZipf : null, minBooks: hasChildBooks ? minBooks : null, maxRank: maxRank || null, british: multiAllowBritish, requireClip: requireClip, seed: seed };
      if (shapesList.length >= 2) mUsed.shapes = shapesList.slice();
      if (stagesList.length >= 2) mUsed.stages = stagesList.map(function (e) { return e.id; });
      if (stagesList.length === 1 && stagesList[0].kind === 'stage') {
        var sOne = stagesList[0].stage;
        mUsed.stageLabel = sOne.label; mUsed.framework = sOne.framework; mUsed.stageVerified = sOne.verified; mUsed.stageBasis = sOne.basis; mUsed.stageNote = sOne.note;
      }
      if (useFullMix) mUsed.mix = 'any';
      if (c.spread === 'sounds') mUsed.spread = 'sounds';
      return { words: mOrder.slice(0, count), pool: mPool.length, reasons: mReasons, criteria: mUsed };
    }
    // usedOnlyWhenTyped: the blocklist file's [soft] words. The picker never returns one, whatever is asked.
    var reasons = { fitsTheCriteria: 0, blocked: 0, soundsLikeABlockedWord: 0, oneDroppedSoundFromABlockedWord: 0, usedOnlyWhenTyped: 0, britishSpellingOrWord: 0, notFamiliarEnough: 0, noRecording: 0, excluded: 0 };
    // Counted only when a wider level is asked for, so the answer for a grade level is what it always was.
    if (level) { reasons.inTheGradeLevels = 0; reasons.notReadForTheWiderLevels = 0; reasons.inTheOtherWiderLevel = 0; }
    var pool = [], commonness = Object.create(null), soundCount = Object.create(null);
    wordlist.rows().forEach(function (row) {
      if (!/^[a-z]+$/.test(row.word) || row.word.length < 2 || row.word.length > (level ? MAX_LETTERS : GRADE_MAX_LETTERS) || !/[aeiouy]/.test(row.word)) return;
      if (c.sounds > 0 && row.sounds !== c.sounds) return;
      if (shape && row.shape !== shape) return;
      if (syllables && row.shape.split('V').length - 1 !== syllables) return;
      var needUnits = !!stage || !!spelling;
      var sounds = target || needUnits ? soundsOf(row.word) : null;
      if ((target || needUnits) && !sounds) return;
      if (target && !sounds.some(function (s, i) { return s === target && atPosition(i, sounds.length, position); })) return;
      if (needUnits) {
        var units = wordUnits(core, row.word, sounds);
        if (!units || suspectSplit(units)) return;
        if (stage && !fitsStage(stage, units)) return;
        if (spelling) {
          var split = /^([a-z])_e$/.exec(spelling);
          var hit = units.some(function (u, i) {
            if (!atPosition(i, units.length, position)) return false;
            return split ? u.letters === split[1] && u.pattern === 'silent_e' : u.letters === spelling;
          });
          if (!hit) return;
        }
      }
      reasons.fitsTheCriteria++;
      if (row.blocked) { reasons.blocked++; return; }
      if (row.nearBlocked) { reasons.soundsLikeABlockedWord++; return; }
      if (c.avoidDroppedSound && row.dropBlocked) { reasons.oneDroppedSoundFromABlockedWord++; return; }
      if (row.soft) { reasons.usedOnlyWhenTyped++; return; }
      if (row.british && !allowBritish) { reasons.britishSpellingOrWord++; return; }
      var familiar = row.known || (row.zipf >= minZipf && row.books >= minBooks) || (maxRank > 0 && row.rank > 0 && row.rank <= maxRank);
      if (!level) { if (!familiar) { reasons.notFamiliarEnough++; return; } }
      else {
        if (familiar) { reasons.inTheGradeLevels++; return; }
        if (!row.wider) { reasons.notReadForTheWiderLevels++; return; }
        if ((level === 'challenging') !== (row.books >= WIDER_MIN_BOOKS)) { reasons.inTheOtherWiderLevel++; return; }
      }
      if (requireClip && !row.hasClip) { reasons.noRecording++; return; }
      if (exclude[row.word]) { reasons.excluded++; return; }
      pool.push(row.word);
      soundCount[row.word] = row.sounds;
      // How common the word is: its Zipf in the children's books (CYP-LEX), else its reading-library rank.
      commonness[row.word] = hasChildBooks ? Number(row.zipf) || 0 : row.rank > 0 ? -row.rank : -1e9;
    });
    pool.sort();
    var random = mulberry32(seedFor(seed, 'pickWords'));
    var order = pool.slice();
    // 2026-11-13 (owner-approved, teacher-journey L3): the most common words first. The pool goes in order of how common
    // each word is (A to Z among equals), then each run of COMMON_BAND words is mixed by the seed, so versions A, B and C
    // differ while a file starts with the words children meet most ("had, red, cat" before "rig, rot"). mix: 'any' mixes
    // the whole pool, as before.
    // A wider level is mixed whole: most of its words are in few books or none, so "most common first" would be A to Z.
    var band = c.mix === 'any' || level ? order.length : COMMON_BAND;
    if (band < order.length) order.sort(function (a, b) { return commonness[b] - commonness[a] || (a < b ? -1 : a > b ? 1 : 0); });
    for (var from = 0; from < order.length; from += band) {
      var to = Math.min(order.length, from + band);
      for (var i = to - 1; i > from; i--) {
        var j = from + Math.floor(random() * (i - from + 1));
        var swap = order[i]; order[i] = order[j]; order[j] = swap;
      }
    }
    // spread: 'sounds' (the maker's mix for Sound Counting, 2026-11-16): the words are dealt out by their number of sounds,
    // fewest first, one of each number in turn, in the order made above within each number. Ten words that were all
    // two or three sounds long become a mix (2, 3, 4, 5, 2, 3 ...), as far as the pool has them.
    if (c.spread === 'sounds') {
      var bySounds = {}, numbers = [], dealt = [];
      order.forEach(function (word) { var n = soundCount[word]; if (!bySounds[n]) { bySounds[n] = []; numbers.push(n); } bySounds[n].push(word); });
      numbers.sort(function (a, b) { return a - b; });
      // Words of 2 to 6 sounds first: a one-sound word ("or") and an eight-sound word ("themselves") are poor counting
      // words. They follow, dealt the same way, so a small pool still gives every word it has.
      [numbers.filter(function (n) { return n >= 2 && n <= 6; }), numbers.filter(function (n) { return n < 2 || n > 6; })].forEach(function (set) {
        var size = set.reduce(function (sum, n) { return sum + bySounds[n].length; }, 0), start = dealt.length;
        for (var round = 0; dealt.length - start < size; round++) set.forEach(function (n) { if (round < bySounds[n].length) dealt.push(bySounds[n][round]); });
      });
      order = dealt;
    }
    var used = { count: count, sounds: c.sounds || null, shape: shape || null, targetSound: target || null, spellingPattern: spelling || null,
      position: target || spelling ? position : null, stage: stage ? stage.id : null, syllables: syllables || null,
      familiarity: hasChildBooks ? 'on the app lists, or child-book Zipf >= ' + minZipf + ' in >= ' + minBooks + ' books' + (maxRank ? ', or reading-library rank <= ' + maxRank : '')
        : 'on the app lists, or reading-library rank <= ' + maxRank,
      minZipf: hasChildBooks ? minZipf : null, minBooks: hasChildBooks ? minBooks : null, maxRank: maxRank || null, british: allowBritish, requireClip: requireClip, seed: seed };
    if (stage) {
      used.stageLabel = stage.label; used.framework = stage.framework; used.stageVerified = stage.verified; used.stageBasis = stage.basis;
      used.stageNote = stage.note;
    }
    // mix: 'any' (the maker's "Pick different words", 2026-11-16) is named only when asked for, so every other pick reads as before.
    if (c.mix === 'any') used.mix = 'any';
    if (c.spread === 'sounds') used.spread = 'sounds';
    return { words: order.slice(0, count), pool: pool.length, reasons: reasons, criteria: used };
  }

  // ---------------------------------------------------------------------------
  // trialBuild: which questions would these words get, knowing only WHICH words have a recording?
  // ---------------------------------------------------------------------------
  // For a page that must decide what to offer before it holds any sound file. input.voiced(word) says
  // whether the word has a recording the caller can hand to buildPacket. The other clips (sounds,
  // position questions, spoken instructions) are taken as present: they are fixed files, and
  // tests/word_sounds_packet_builder.test.js compares a trial with a build from the real ones. It
  // runs buildPacket itself, with stand-in clips and no file at the end, so the answer is the
  // builder's own. -> { words, byActivity: { id: { questions, noRecording, other } } }: for each
  // activity, the words that got a question, the words that lost it to a missing recording, and
  // the words that lost it for another reason (no rhyme partner, no word family ...).
  var RECORDING_REASON = /(?:^|; )(?:no recording for|the recording for) /;
  function trialBuild(input) {
    var opts = input || {};
    var voiced = typeof opts.voiced === 'function' ? opts.voiced : function () { return false; };
    var CLIP = 'data:audio/wav;base64,UklGRg==';
    var standIn = function (has) {
      var holds = function (key) { return typeof key === 'string' && !!has(key); };
      return new Proxy({}, {
        get: function (_, key) { return holds(key) ? CLIP : undefined; },
        has: function (_, key) { return holds(key); },
        getOwnPropertyDescriptor: function (_, key) { return holds(key) ? { value: CLIP, writable: true, enumerable: true, configurable: true } : undefined; },
      });
    };
    var any = function () { return true; };
    return buildPacket({ words: opts.words, activities: opts.activities, seed: opts.seed, core: opts.core, loader: opts.loader, wordlist: opts.wordlist,
      knownWords: opts.knownWords, length: opts.length, noFile: true,
      banks: { phonemes: standIn(any), isolation: standIn(any), instructions: standIn(any), kokoroWords: standIn(voiced) } }).then(function (result) {
      var by = {};
      result.manifest.activities.asked.forEach(function (id) { by[id] = { questions: result.manifest.items.byActivity[id] || 0, noRecording: 0, other: 0 }; });
      result.exceptions.forEach(function (e) {
        if (!e.word || !e.activity || !by[e.activity]) return;
        by[e.activity][RECORDING_REASON.test(e.reason) ? 'noRecording' : 'other']++;
      });
      return { words: result.manifest.words.asked.filter(function (word, i, all) { return all.indexOf(word) === i; }).length, byActivity: by };
    });
  }

  var api = {
    VERSION: VERSION, SUPPORTED_ACTIVITIES: SUPPORTED.slice(), STAGES: STAGE_IDS.slice(), STAGE_NOTE: STAGE_NOTE,
    // The maker's "Choices" (opts.choices), fewest first.
    CHOICE_LEVELS: CHOICE_LEVELS.slice(),
    trialBuild: trialBuild,
    DEFAULT_MAX_RANK: DEFAULT_MAX_RANK, DEFAULT_MIN_ZIPF: DEFAULT_MIN_ZIPF, DEFAULT_MIN_BOOKS: DEFAULT_MIN_BOOKS, CMUDICT_NOTICE: CMUDICT_NOTICE,
    buildPacket: buildPacket, pickWords: pickWords, MAX_LETTERS: MAX_LETTERS, GRADE_MAX_LETTERS: GRADE_MAX_LETTERS, WIDER_LEVELS: WIDER_LEVELS.slice(), stageList: stageList, pcmToWavUri: pcmToWavUri,
    // A student's code name in a file (the file fills it in when it opens).
    codeName: codeName, withCodeName: withCodeName,
    // Pictures: the credit and notice a file with pictures carries, and the test every symbol must pass.
    MULBERRY_CREDIT: MULBERRY_CREDIT, MULBERRY_NOTICE: MULBERRY_NOTICE, pictureCredit: pictureCredit, mulberryNotice: mulberryNotice, svgRefusal: svgRefusal,
    OPENMOJI_CREDIT: OPENMOJI_CREDIT, openMojiCredit: openMojiCredit, openMojiNotice: openMojiNotice,
    // The teacher's own material (opts.own): what it may hold, and the credit sentence for a picture.
    SOUND_LABELS: SOUND_LABELS.slice(), OWN_LIMITS: OWN_LIMITS, OPEN_LICENSE: OPEN_LICENSE, SHARE_ALIKE_NOTICE: SHARE_ALIKE_NOTICE, OWN_PICTURE_LINE: OWN_PICTURE_LINE, creditLine: creditLine,
    _internals: { questionOrder: questionOrder, mixedOrder: mixedOrder, createPackLogic: createPackLogic, mulberry32: mulberry32, seedFor: seedFor, wordUnits: wordUnits, fitsStage: fitsStage, suspectSplit: suspectSplit, stageOf: stageOf, compileStages: compileStages, withCredits: withCredits, svgDataUri: svgDataUri, readOwn: readOwn },
  };
  if (root) root.AlloPacketBuilder = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
