// AlloFlow read-along: makes a PRACTICE file in which a passage is read aloud one sentence at a time, each
// sentence marked while it is read. No AI and no app in the file: it plays recordings that were made ahead
// of time, on the teacher's device, by "Make a read-along" (packets-read-along.html).
// One plain script for a browser page (window.AlloPacketReadAlong) and for node (module.exports). It
// calls nothing on the network and reads no clock: the same passage and recordings give the same bytes.
// A sibling of packet_math_practice_builder.js and packet_vocab_builder.js.
//
// The file itself is made by the take-home loader (AlloWordSoundsTakeHome.buildHtml). Each page of the
// passage goes through the loader's read_along adapter (prepare: an allowlist), which is the code that
// plays it: the same line-by-line reading, with the line marked, that Read the Story uses for its story.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-read-along-builder/0.2.0';
  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var PLAYER = 'alloflow-word-sounds-take-home/2';
  var ACTIVITY = 'read_along';
  var MAX_CHARS = 6000;            // the passage a teacher gives
  var MAX_SENTENCES = 120;
  var MAX_SENTENCE_CHARS = 400;    // a longer run of words is cut at a comma or a space
  var PAGE_SENTENCES = 6;          // a page of the file: at most this many sentences
  var PAGE_CHARS = 420;            // or about this many letters, whichever comes first
  var MAX_CLIP_CHARS = 2 * 1024 * 1024;
  var CLIP = /^data:audio\/(?:mpeg|mp3|wav);base64,[A-Za-z0-9+/]+=*$/;
  // Words that end in a full stop without ending a sentence.
  var ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'vs', 'etc', 'e.g', 'i.e', 'no', 'mt', 'prof', 'gen', 'capt', 'sgt', 'rev'];

  function text(value) { return value == null ? '' : String(value); }
  // FNV-1a, as in the other builders: a short name for a text, not a secret.
  function fnv(value) {
    var h = 0x811c9dc5, s = text(value);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  // The passage as sentences, in order: [{ text, para }]. para is true for the first sentence of a
  // paragraph after the first (a blank line starts a paragraph). A line break always ends a sentence, so a
  // teacher who wants their own breaks writes one sentence on each line. Within a line a sentence ends at
  // . ! or ? (with any closing quote or bracket) followed by a space, unless the word is an abbreviation
  // (Mr., Dr., e.g.) or a single letter (an initial). Nothing is rewritten: the words are the teacher's.
  function splitPassage(value) { return everySentence(value).slice(0, MAX_SENTENCES); }
  // How many sentences the passage has before the limit, so a page can say when some are left out.
  function sentenceCount(value) { return everySentence(value).length; }
  function everySentence(value) {
    var source = text(value).replace(/\r\n?/g, '\n').slice(0, MAX_CHARS);
    var out = [];
    source.split(/\n[ \t]*\n+/).forEach(function (paragraph, pi) {
      var first = true;
      paragraph.split('\n').forEach(function (line) {
        var words = line.replace(/[ \t\u00a0]+/g, ' ').trim().split(' ').filter(Boolean), run = [];
        var push = function () {
          if (!run.length) return;
          cut(run.join(' ')).forEach(function (piece) {
            var row = { text: piece };
            if (first && pi > 0 && out.length) row.para = true;
            first = false;
            out.push(row);
          });
          run = [];
        };
        words.forEach(function (word, wi) {
          run.push(word);
          var end = /[.!?]+["'\u201d\u2019)\]]*$/.exec(word);
          if (!end) return;
          // The sentence goes on when the next word starts with a small letter: "Where is it?" he said.
          if (wi + 1 < words.length && /^[a-z]/.test(words[wi + 1])) return;
          var bare = word.slice(0, end.index).replace(/^["'\u201c\u2018(\[]+/, '').toLowerCase();
          var stop = word.charAt(end.index);
          if (stop === '.' && (ABBREVIATIONS.indexOf(bare) >= 0 || /^[a-z]$/.test(bare))) return;
          push();
        });
        push();
      });
    });
    return out;
  }
  // A run of words too long for one recording: cut after a comma, a semicolon or a colon, else at a space.
  function cut(sentence) {
    var rest = sentence, out = [];
    while (rest.length > MAX_SENTENCE_CHARS) {
      var head = rest.slice(0, MAX_SENTENCE_CHARS), at = Math.max(head.lastIndexOf(', '), head.lastIndexOf('; '), head.lastIndexOf(': '));
      if (at < MAX_SENTENCE_CHARS / 3) at = head.lastIndexOf(' ');
      if (at < 1) at = MAX_SENTENCE_CHARS - 1;
      out.push(rest.slice(0, at + 1).trim());
      rest = rest.slice(at + 1).trim();
    }
    if (rest) out.push(rest);
    return out;
  }

  // The sentences as pages: at most PAGE_SENTENCES sentences or about PAGE_CHARS letters each, and a new
  // paragraph starts a new page once the page has three sentences. -> [[sentence, ...], ...]
  function pagesOf(sentences) {
    var pages = [], page = [], chars = 0;
    (sentences || []).forEach(function (row) {
      var n = row.text.length;
      var full = page.length >= PAGE_SENTENCES || (page.length >= 2 && chars + n > PAGE_CHARS) || (row.para && page.length >= 3);
      if (page.length && full) { pages.push(page); page = []; chars = 0; }
      page.push(row);
      chars += n;
    });
    if (page.length) pages.push(page);
    return pages;
  }

  // What a recording is filed under: the sentence as it will be said (spaces tidied).
  function clipKey(sentence) { return text(sentence).replace(/\s+/g, ' ').trim(); }

  // The sentence with a middle dot at each syllable break of the words the lookup knows ("The kite sailed
  // o.ver the trees", with a raised dot), or '' when no word in it is split. lookup(word in small letters) ->
  // ['o', 'ver'], or null for a word it does not vouch for. The letters are never changed: a word whose parts do
  // not spell it exactly is left whole, and so is a word beside an apostrophe, a digit or a letter with an accent.
  var DOT = String.fromCharCode(183), APOSTROPHE = String.fromCharCode(8217);
  function joined(ch) { if (!ch) return false; if (ch === "'" || ch === APOSTROPHE) return true; try { return /[\p{L}\p{M}\p{N}]/u.test(ch); } catch (_) { return /[A-Za-z0-9]/.test(ch) || ch.charCodeAt(0) > 127; } }
  function syllableText(sentence, lookup) {
    var plain = clipKey(sentence), split = 0;
    if (typeof lookup !== 'function' || !plain || plain.indexOf(DOT) >= 0) return '';
    var out = plain.replace(/[A-Za-z]{3,}/g, function (word, at) {
      if (joined(plain.charAt(at - 1)) || joined(plain.charAt(at + word.length))) return word;
      var parts = null;
      try { parts = lookup(word.toLowerCase()); } catch (_) { parts = null; }
      if (!Array.isArray(parts) || parts.length < 2 || parts.some(function (part) { return typeof part !== 'string' || !part; }) || parts.join('') !== word.toLowerCase()) return word;
      var pieces = [], from = 0;
      parts.forEach(function (part) { pieces.push(word.slice(from, from + part.length)); from += part.length; });
      split++;
      return pieces.join(DOT);
    });
    return split ? out : '';
  }

  // lessonFromReadAlong({ loader, title, text | sentences, clips, voice, syllables, syllableSource })
  //   text: the passage (splitPassage is applied), or sentences: a list already split by splitPassage.
  //   clips: { "the sentence": "data:audio/mpeg;base64,..." } (the key is clipKey of the sentence).
  //   A sentence with no clip is shown and not read. At least one sentence needs a clip.
  //   syllables: lookup(word) -> parts or null (see syllableText). With it the file has a Syllables button.
  //   syllableSource: where the breaks come from, for the file's credits.
  function lessonFromReadAlong(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS[ACTIVITY]) throw new Error('lessonFromReadAlong needs loader (AlloWordSoundsTakeHome, with the read-along activity)');
    var adapter = loader.CHECK_ADAPTERS[ACTIVITY];
    var sentences = Array.isArray(o.sentences) ? o.sentences.map(function (row) { var out = { text: clipKey(row && row.text) }; if (row && row.para === true) out.para = true; return out; }).filter(function (row) { return row.text; }).slice(0, MAX_SENTENCES)
      : splitPassage(o.text);
    if (!sentences.length) throw new Error('There is no passage yet.');
    var clips = o.clips && typeof o.clips === 'object' ? o.clips : {};
    var audio = {}, idOf = {}, recorded = 0, next = 0, lookup = typeof o.syllables === 'function' ? o.syllables : null, split = 0, example = '';
    var clipFor = function (sentence) {
      var key = clipKey(sentence), uri = Object.prototype.hasOwnProperty.call(clips, key) ? clips[key] : null;
      if (typeof uri !== 'string' || uri.length > MAX_CLIP_CHARS || !CLIP.test(uri)) return '';
      if (!idOf[key]) { idOf[key] = 's' + (++next); audio[idOf[key]] = uri; }
      return idOf[key];
    };
    var title = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120) || 'Read along';
    var pages = pagesOf(sentences);
    var items = pages.map(function (page, i) {
      var raw = { lines: page.map(function (row) { var id = clipFor(row.text); if (id) recorded++; var line = { text: row.text, audio: id }, syl = lookup ? syllableText(row.text, lookup) : ''; if (syl) { line.syl = syl; split++; if (!example) example = (/[A-Za-z]+(?:\u00b7[A-Za-z]+)+/.exec(syl) || [''])[0]; } if (row.para) line.para = true; return line; }), page: i + 1, pages: pages.length, lang: 'en' };
      // The activity needs at least one recording on a page; a page with none is refused below, with the reason.
      var made = adapter.prepare(raw);
      if (!made || !made.item) {
        if (raw.lines.some(function (line) { return line.audio; })) throw new Error('Page ' + (i + 1) + ' cannot be used: ' + (made && made.missing ? made.missing.join(', ') : 'no reason given'));
        return null;
      }
      var n = (i < 9 ? '0' : '') + (i + 1);
      return Object.assign({ id: ACTIVITY + '-' + n }, made.item);
    });
    if (!recorded) throw new Error('No sentence has a recording yet.');
    if (items.some(function (item) { return !item; })) throw new Error('A page of the passage has no recording. Make the recordings for every page first.');
    var lesson = { schema: LESSON_SCHEMA, player: PLAYER, lessonId: 'read-along-' + fnv(sentences.map(function (row) { return row.text; }).join('\n')), revision: '', language: 'en', title: title, showLetters: false,
      mode: 'practice', activityTitles: {}, blocks: [{ activity: ACTIVITY, items: items }], feedback: { correct: [], retry: null }, audio: audio, images: {}, submit: null };
    lesson.activityTitles[ACTIVITY] = adapter.title;
    lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.blocks, Object.keys(audio).map(function (id) { return audio[id].length; })]));
    return { lesson: lesson, sentences: sentences.length, pages: pages.length, recorded: recorded, missing: sentences.length - recorded, voice: text(o.voice).slice(0, 60),
      syllables: split ? { sentences: split, example: example, source: text(o.syllableSource).replace(/\s+/g, ' ').trim().slice(0, 300) } : null };
  }

  // Nothing in a read-along is graded: the file's answer matcher is never a match.
  var NO_ANSWERS = { soundAnswerMatches: function () { return false; } };

  // The file. buildReadAlongPacket({ made (from lessonFromReadAlong), loader, learner }) -> { html, manifest, sha256, lesson }
  function buildReadAlongPacket(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || typeof loader.buildHtml !== 'function' || !loader.CHECK_ADAPTERS || typeof loader.sha256 !== 'function') throw new Error('buildReadAlongPacket needs loader (AlloWordSoundsTakeHome)');
    var made = o.made, given = made && made.lesson;
    if (!given || given.mode !== 'practice' || !Array.isArray(given.blocks) || given.blocks.length !== 1 || given.blocks[0].activity !== ACTIVITY) throw new Error('buildReadAlongPacket needs what lessonFromReadAlong made');
    var lesson = JSON.parse(JSON.stringify(given));
    var voice = made.voice || 'af_heart';
    var labels = {
      intro: loader.CHECK_ADAPTERS[ACTIVITY].labels.read_along_intro,
      about_never: 'It never uses the microphone or the camera. It has no cookies and runs no AI. The reading voice is a set of recordings made ahead of time with a computer voice; this file makes no speech itself.',
    };
    var credits = ['Recordings of the sentences: made ahead of time, on the device of the person who made this file, with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice. No person has listened to each one.'];
    if (made.syllables) credits.push('Syllable breaks: worked out when this file was made, from a word list' + (made.syllables.source ? ' (' + made.syllables.source + ')' : '') + '. No AI.');
    var html = loader.buildHtml(lesson, { core: NO_ANSWERS, labels: labels, attributions: credits });
    html = withManifest(html, {
      readAlong: { builder: VERSION, sentences: made.sentences, pages: made.pages, recordings: made.recorded, withoutRecording: made.missing, sentencesWithSyllables: made.syllables ? made.syllables.sentences : 0 },
      speech: { engine: 'none', note: 'The file plays recordings. It does not use the voice of the device and makes no speech.',
        recordings: { sentences: made.recorded, made: 'ahead of time, on the device of the person who made this file, with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice', humanReviewed: false } },
    });
    if (o.learner) html = withCodeName(html, o.learner);
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return { html: html, manifest: block ? JSON.parse(block[1]) : null, sha256: loader.sha256(html).hex, lesson: lesson };
  }

  // The manifest (the data block of the file) with more keys. Only the data block changes: the script and its hash do not.
  function editManifest(html, change) {
    var open = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(open);
    if (at < 0) return html;
    var from = at + open.length, to = html.indexOf('</script>', from), manifest;
    try { manifest = JSON.parse(html.slice(from, to)); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object') return html;
    change(manifest);
    var json = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }
  function withManifest(html, extra) { return editManifest(html, function (manifest) { Object.keys(extra).forEach(function (key) { manifest[key] = extra[key]; }); }); }
  // A student's code name, by the rule of the other builders: letters of any language, digits, spaces, . _ and -, at most 40.
  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try { return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim(); } catch (_) { return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40); }
  }
  function withCodeName(html, name) {
    var clean = codeName(name);
    return clean ? editManifest(html, function (manifest) { manifest.learner = clean; }) : html;
  }

  var api = { VERSION: VERSION, ACTIVITY: ACTIVITY, MAX_CHARS: MAX_CHARS, MAX_SENTENCES: MAX_SENTENCES, MAX_SENTENCE_CHARS: MAX_SENTENCE_CHARS, PAGE_SENTENCES: PAGE_SENTENCES, PAGE_CHARS: PAGE_CHARS, MAX_CLIP_CHARS: MAX_CLIP_CHARS,
    splitPassage: splitPassage, sentenceCount: sentenceCount, syllableText: syllableText, pagesOf: pagesOf, clipKey: clipKey, lessonFromReadAlong: lessonFromReadAlong, buildReadAlongPacket: buildReadAlongPacket, codeName: codeName, withCodeName: withCodeName };
  root.AlloPacketReadAlong = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
