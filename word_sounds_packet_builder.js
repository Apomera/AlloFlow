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
  // The older rule (place in the reading-library frequency list, built from old books). It applies
  // only when the word list carries no child-book column, or when the caller passes maxRank.
  var DEFAULT_MAX_RANK = 4000;

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
    if (/<\s*(?:[\w-]+:)?script\b/i.test(plain)) return 'a script';
    if (/<\s*(?:[\w-]+:)?foreignObject\b/i.test(plain)) return 'a foreignObject';
    if (/<\s*(?:[\w-]+:)?(?:iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'an element that is not a drawing';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain)) return 'an event handler';
    if (/(?:java|vb|live)script:/i.test(packed)) return 'a script address';
    if (/xml:base\s*=/i.test(plain)) return 'a base address';
    // Every link must point inside the drawing itself ("#name"): no other file, no site, no data: address.
    var m, href = /(?:[\s"'\/])(?:[\w-]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    if (/[\s"'\/]src\s*=/i.test(plain)) return 'a link to something outside the drawing';
    // A style block may not load anything: no @import, no url(), no font.
    var style = /<\s*(?:[\w-]+:)?style\b[^>]*>/gi;
    while ((m = style.exec(plain))) {
      if (/\/\s*>$/.test(m[0])) continue;
      var end = plain.slice(style.lastIndex).search(/<\s*\/\s*(?:[\w-]+:)?style\s*>/i);
      var css = end < 0 ? plain.slice(style.lastIndex) : plain.slice(style.lastIndex, style.lastIndex + end);
      if (end < 0 || /@import|@font-face|@namespace|url\s*\(|expression\s*\(/i.test(css)) return 'a style block that loads something';
    }
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
    if (credit.own !== true && !OPEN_LICENSE.test(plainLine(credit.license, 60))) return 'the picture has no open license (public domain, CC0, CC BY or CC BY-SA)';
    return '';
  }
  // opts.own, checked, for the words asked: { byWord: { word: { sounds, spelling, clip, picture } }, refused, words }.
  function readOwn(given, asked, labels) {
    var out = { byWord: {}, refused: [], words: [] };
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
      if (entry.picture != null) {
        var noPicture = ownPictureRefusal(entry.picture);
        if (noPicture) refuse(word, 'picture', noPicture);
        else {
          var credit = entry.picture.credit.own === true ? { own: true } : entry.picture.credit;
          mine.picture = { uri: entry.picture.dataUri, own: credit.own === true, line: creditLine(credit), shareAlike: credit.own !== true && SHARE_ALIKE.test(plainLine(credit.license, 60)) };
        }
      }
      out.words.push(word);
      if (mine.sounds || mine.clip || mine.picture) out.byWord[word] = mine;
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

  // Choices (2026-11-13, the maker's "Choices": easy, medium or all). Below Hard the app shows fewer choices, with the
  // core's own functions: Find Sounds asks the first sound (Easy) or the first or last (Medium)
  // (isolationPositions) and shows 3 or 4 sounds; Blend Sounds and Rhyme Time show 3 or 4 words (choiceLimit +
  // trimChoices, as trimSoundChoices in word_sounds_module.js: the answer stays, far choices first, Medium keeps one
  // near one); Sound Counting shows the count with two either side (Easy) or 1-8 (Medium) (countingChoices). All
  // (and no level) leaves every board as built. Seeded by the version and the word, so a file is the same each time.
  var CHOICE_LEVELS = ['easy', 'medium', 'all'];
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
      var board = boards[id];
      if (board && Array.isArray(board.options) && board.answer && board.options.indexOf(board.answer) >= 0) board.options = trim(board.options, board.answer, undefined, core.wordCloseness);
    });
    var counting = boards.counting;
    var numbers = counting ? core.countingChoices(Number(counting.answer), level) : null;
    if (numbers) counting.options = numbers;
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
            if (letters.length > 1 && letters.join('') === word) [letters[0], letters[1]] = [letters[1], letters[0]];
            const hiddenIndex = word.length > 1 ? seed % word.length : 0;
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
  // A bank entry as { uri } (a data: address) or null. PCM entries ({ base64, sampleRate }) become WAV here.
  function entryUri(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') return AUDIO_URI.test(entry) ? entry : null;
    if (typeof entry === 'object' && typeof entry.base64 === 'string' && entry.base64) {
      if (typeof entry.mime === 'string' && /^audio\//i.test(entry.mime)) return 'data:' + entry.mime.trim().toLowerCase() + ';base64,' + entry.base64.replace(/\s+/g, '');
      try { return pcmToWavUri(entry.base64, entry.sampleRate); } catch (_) { return null; }
    }
    return null;
  }
  function own(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }
  function wordsOf(bank) { return bank && bank.words && typeof bank.words === 'object' && !bank.words.base64 ? bank.words : (bank || {}); }

  var SOURCE_NAMES = { recorded: 'recorded', kokoro: 'Kokoro bank', spoken: 'spoken now', teacher: 'teacher recording' };
  // teacherWords: the teacher's own recordings of practice words (opts.own, checked). They come first.
  function createAudio(banks, speak, toWav, allowUnconverted, teacherWords) {
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
    try { manifest = JSON.parse(html.slice(from, to)); } catch (_) { return { html: html, done: false }; }
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
    return (typeof value === 'string' ? value : '').normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
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
    var title = String(opts.title || 'Word Sounds practice').trim().slice(0, 120);
    var exceptions = [];
    var except = function (word, activity, reason) { exceptions.push({ word: word, activity: activity, reason: reason }); };
    var asked = (Array.isArray(opts.words) ? opts.words : String(opts.words || '').split(/[\s,]+/)).map(function (w) { return String(w || '').trim().toLowerCase(); }).filter(Boolean);
    var askedActivities = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : ['isolation']).map(String).filter(function (id, i, all) { return all.indexOf(id) === i; });
    var adapters = loader.ADAPTERS || {};
    var activities = askedActivities.filter(function (id) {
      if (SUPPORTED.indexOf(id) >= 0 && adapters[id]) return true;
      except(null, id, adapters[id] ? 'this activity cannot be built without AI or a teacher yet' : 'unknown activity');
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
    var limit = typeof opts.length === 'number' ? opts.length : LENGTHS[opts.length] || 40;
    var words = [];
    asked.forEach(function (word) {
      if (words.indexOf(word) >= 0) return;
      if (blocked(word)) return except(word, null, 'this word is on the blocklist');
      if (probeLogic.isUnusableAsPhonicsWord(word)) return except(word, null, 'not a usable practice word (letters only, 2 to 10 letters, with a vowel)');
      if (!soundCore.dictionarySounds(word)) return except(word, null, 'not in the sound dictionary');
      if (words.length >= limit) return except(word, null, 'over the length asked for (' + limit + ' words)');
      words.push(word);
    });
    // The teacher's recordings of the practice words, and of no other word.
    var teacherClips = {};
    words.forEach(function (word) { if (own(mine.byWord, word) && mine.byWord[word].clip) teacherClips[core.packAudioKey(word)] = mine.byWord[word].clip; });
    var audio = createAudio(opts.banks, opts.speak, opts.toWav, !!opts.allowUnconverted, teacherClips);
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
    var wantPictures = opts.pictures === true && !!opts.symbols && typeof opts.symbols.get === 'function';
    var pictureFiles = {}, pictureSets = {}, pictureRefused = [];
    var teacherPicture = function (word) { return opts.pictures === true && own(mine.byWord, word) && mine.byWord[word].picture ? mine.byWord[word].picture : null; };
    var ownPictureShown = {};
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
      if (wantPictures) rows.forEach(function (item) {
        if (ownPictureShown[item.word]) return;
        var symbol = null;
        try { symbol = opts.symbols.get(item.word); } catch (_) { symbol = null; }
        if (!symbol || typeof symbol.svg !== 'string') return;
        var why = svgRefusal(symbol.svg);
        if (why) { pictureRefused.push({ word: item.word, file: String(symbol.file || ''), reason: why }); return; }
        item.image = svgDataUri(symbol.svg);
        pictureFiles[item.word] = String(symbol.file || '');
        pictureSets[item.word] = symbol.set === 'openmoji' ? 'openmoji' : 'mulberry';
      });
      rows.forEach(function (item) {
        item.activityItems = Object.fromEntries(Object.entries(item.activityItems || {}).filter(function (pair) { return activities.indexOf(pair[0]) >= 0; }));
        item._preparedActivities = activities;
        // Last guard: a blocked word on a board removes that board. So does a soft word, unless it is one
        // of the words the teacher gave (their own word may sit among the choices of another of their words).
        activities.forEach(function (id) {
          var shown = boardWords(id, item.activityItems[id]);
          if (shown.some(blocked)) { delete item.activityItems[id]; except(item.word, id, 'an answer choice is on the blocklist'); }
          else if (shown.some(function (word) { return softWord(word) && words.indexOf(word) < 0; })) { delete item.activityItems[id]; except(item.word, id, 'an answer choice is a word the picker does not offer'); }
        });
        // A split the teacher gave is theirs to judge.
        if (item.activityItems.mapping && !spelledByTeacher(item.word) && suspectSplit(wordUnits(core, item.word, item.phonemes))) {
          delete item.activityItems.mapping;
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
        return { core: choiceCore, banks: banks, isEnglish: true, showLetters: !!opts.showLetters, activities: activities, title: title,
          lessonId: 'pb-' + hex8(fnv1a(JSON.stringify([VERSION, String(seed), title, words, activities]))) };
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
      var withMulberry = withSymbol.filter(function (word) { return pictureSets[word] !== 'openmoji'; });
      var omVersion = opts.symbols && opts.symbols.credits && opts.symbols.credits.openmoji && /^[\w.]{1,16}$/.test(String(opts.symbols.credits.openmoji.version || '')) ? String(opts.symbols.credits.openmoji.version) : '';
      if (withMulberry.length) {
        attributions.push(withOpenMoji.length ? pictureCredit(withMulberry) : pictureCredit());
        notices.push({ id: 'mulberry', name: MULBERRY_CREDIT.set, text: withOpenMoji.length ? mulberryNotice(withMulberry) : MULBERRY_NOTICE });
      }
      if (withOpenMoji.length) {
        attributions.push(openMojiCredit(withOpenMoji));
        notices.push({ id: 'openmoji', name: OPENMOJI_CREDIT.set, text: openMojiNotice(withOpenMoji, omVersion) });
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
      if (opts.picked && opts.picked.criteria && opts.picked.criteria.stage) manifest.stageNote = STAGE_NOTE;
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
      }
      // noFile: everything but the file itself (trialBuild asks only which questions there would be).
      if (!lesson || opts.noFile === true) return { html: '', lesson: lesson, manifest: manifest, exceptions: exceptions, sha256: '' };
      var html = loader.buildHtml(lesson, { core: core, attributions: attributions });
      var extra = { attributions: attributions, notices: notices,
        // choices: the maker's Choices, so "Open a file I made" can read it back (packets_reopen.js).
        builder: { name: VERSION, seed: seed, ai: 'none', words: usedWords.length, items: manifest.items.total, choices: choiceLevel } };
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
    var compiled = { byId: {}, list: [] };
    table.frameworks.forEach(function (framework) {
      var units = {}, anyUnit = false;
      (framework.stages || []).forEach(function (stage) {
        var bases = {}, sources = 0;
        (stage.groups || []).concat(stage.limits ? [stage.limits] : []).forEach(function (group) {
          if (group.basis) bases[group.basis] = true;
          sources += (group.sources || []).length;
        });
        (stage.groups || []).forEach(function (group) {
          String(group.units || '').split(' ').forEach(function (u) { if (u === '*') anyUnit = true; else if (u) units[u] = true; });
        });
        var limits = stage.limits || {}, avoidFinal = {}, mine = {};
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
    var stage = c.stage ? stageOf(c.stage, stageTable) : null;
    if (c.stage && !stageTable) throw new Error('pickWords needs the stage table (wordlist.stages or context.stages) to use a stage');
    if (c.stage && !stage) throw new Error('Unknown stage: ' + c.stage + ' (use ' + compileStages(stageTable).list.map(function (s) { return s.id; }).join(', ') + ')');
    // British spellings and words (colour, mum) are left out unless asked for, or the stage is an England row.
    var allowBritish = c.british === true || (c.british !== false && !!stage && stage.allowBritish);
    var syllables = c.syllables > 0 ? Math.floor(c.syllables) : 0;
    var shape = c.shape ? String(c.shape).toUpperCase() : '';
    var target = c.targetSound ? String(c.targetSound).replace(/^\/|\/$/g, '').trim().toLowerCase() : '';
    var spelling = c.spellingPattern ? String(c.spellingPattern).trim().toLowerCase() : '';
    var position = c.position || 'any';
    var exclude = {};
    (c.exclude || []).forEach(function (w) { exclude[String(w).trim().toLowerCase()] = true; });
    var soundsOf = function (word) {
      var found = dictionary && typeof dictionary.lookup === 'function' ? dictionary.lookup(word)[0] : null;
      if (found && found.length) return Array.prototype.slice.call(found);
      var entry = core.dictionarySounds(word);
      return entry ? entry.sounds : null;
    };
    // usedOnlyWhenTyped: the blocklist file's [soft] words. The picker never returns one, whatever is asked.
    var reasons = { fitsTheCriteria: 0, blocked: 0, soundsLikeABlockedWord: 0, oneDroppedSoundFromABlockedWord: 0, usedOnlyWhenTyped: 0, britishSpellingOrWord: 0, notFamiliarEnough: 0, noRecording: 0, excluded: 0 };
    var pool = [];
    wordlist.rows().forEach(function (row) {
      if (!/^[a-z]{2,10}$/.test(row.word) || !/[aeiouy]/.test(row.word)) return;
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
      if (!row.known && !(row.zipf >= minZipf && row.books >= minBooks) && !(maxRank > 0 && row.rank > 0 && row.rank <= maxRank)) { reasons.notFamiliarEnough++; return; }
      if (requireClip && !row.hasClip) { reasons.noRecording++; return; }
      if (exclude[row.word]) { reasons.excluded++; return; }
      pool.push(row.word);
    });
    pool.sort();
    var random = mulberry32(seedFor(seed, 'pickWords'));
    var order = pool.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var swap = order[i]; order[i] = order[j]; order[j] = swap;
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
    buildPacket: buildPacket, pickWords: pickWords, stageList: stageList, pcmToWavUri: pcmToWavUri,
    // A student's code name in a file (the file fills it in when it opens).
    codeName: codeName, withCodeName: withCodeName,
    // Pictures: the credit and notice a file with pictures carries, and the test every symbol must pass.
    MULBERRY_CREDIT: MULBERRY_CREDIT, MULBERRY_NOTICE: MULBERRY_NOTICE, pictureCredit: pictureCredit, mulberryNotice: mulberryNotice, svgRefusal: svgRefusal,
    OPENMOJI_CREDIT: OPENMOJI_CREDIT, openMojiCredit: openMojiCredit, openMojiNotice: openMojiNotice,
    // The teacher's own material (opts.own): what it may hold, and the credit sentence for a picture.
    SOUND_LABELS: SOUND_LABELS.slice(), OWN_LIMITS: OWN_LIMITS, OPEN_LICENSE: OPEN_LICENSE, SHARE_ALIKE_NOTICE: SHARE_ALIKE_NOTICE, OWN_PICTURE_LINE: OWN_PICTURE_LINE, creditLine: creditLine,
    _internals: { createPackLogic: createPackLogic, mulberry32: mulberry32, seedFor: seedFor, wordUnits: wordUnits, fitsStage: fitsStage, suspectSplit: suspectSplit, stageOf: stageOf, compileStages: compileStages, withCredits: withCredits, svgDataUri: svgDataUri, readOwn: readOwn },
  };
  if (root) root.AlloPacketBuilder = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
