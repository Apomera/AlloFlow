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
  var ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'vs', 'etc', 'e.g', 'i.e', 'no', 'mt', 'prof', 'gen', 'capt', 'sgt', 'lt', 'rev',
    'gov', 'sen', 'rep', 'fig', 'ch', 'sec', 'vol', 'eq', 'ex', 'p', 'pp', 'apt', 'dept'];
  // Months and street/time/country abbreviations that stay joined before a number or continuation token,
  // while still allowing a genuine sentence end (e.g. "We arrived at 3 p.m. Then we ate.").
  var NUM_ABBREVIATIONS = ['jan', 'feb', 'mar', 'apr', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'ave', 'blvd', 'rd', 'ln', 'ct', 'u.s', 'a.m', 'p.m'];

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
          var nextWord = wi + 1 < words.length ? words[wi + 1] : '';
          if (stop === '.' && (ABBREVIATIONS.indexOf(bare) >= 0 || /^[a-z]$/.test(bare) || (run.length === 1 && /^\d{1,3}$/.test(bare) && nextWord) || (NUM_ABBREVIATIONS.indexOf(bare) >= 0 && /^[0-9(\[]/.test(nextWord)))) return;
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
  var DOT = String.fromCharCode(183), APOSTROPHE = String.fromCharCode(8217), OPEN_QUOTE = String.fromCharCode(8216);
  function wordChar(ch) { if (!ch) return false; try { return /[\p{L}\p{M}\p{N}]/u.test(ch); } catch (_) { return /[A-Za-z0-9]/.test(ch) || ch.charCodeAt(0) > 127; } }
  function syllableText(sentence, lookup) {
    var plain = clipKey(sentence), split = 0;
    if (typeof lookup !== 'function' || !plain || plain.indexOf(DOT) >= 0) return '';
    var out = plain.replace(/[A-Za-z]{3,}/g, function (word, at) {
      var prev = plain.charAt(at - 1), next = plain.charAt(at + word.length);
      if (wordChar(prev) || wordChar(next)) return word;
      if (prev === "'" || prev === APOSTROPHE) {
        if (wordChar(plain.charAt(at - 2))) return word;
        if (!/^[^A-Za-z0-9\s]*['\u2019]|['\u2019](?:$|[^A-Za-z0-9])/.test(plain.slice(at + word.length))) return word;
      }
      if (next === "'" || next === APOSTROPHE) {
        if (wordChar(plain.charAt(at + word.length + 1))) return word;
        if (prev !== "'" && prev !== OPEN_QUOTE && !/(?:^|[\s(["\u201c])['\u2018]/.test(plain.slice(0, at))) return word;
      }
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

  // lessonFromReadAlong({ loader, title, text | sentences, clips, clipSources, voice, syllables, syllableSource })
  //   text: the passage (splitPassage is applied), or sentences: a list already split by splitPassage.
  //   clips: { "the sentence": "data:audio/mpeg;base64,..." | { uri, source: 'teacher' | 'computer' } } (key is clipKey).
  //   0 clips (silent / syllable-only) and partial clips are both supported.
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
    var sourcesIn = o.clipSources && typeof o.clipSources === 'object' ? o.clipSources : {};
    var audio = {}, idOf = {}, teacherClips = [], recorded = 0, teacherRecorded = 0, computerRecorded = 0, next = 0, lookup = typeof o.syllables === 'function' ? o.syllables : null, split = 0, example = '';
    var clipFor = function (sentence) {
      var key = clipKey(sentence), raw = Object.prototype.hasOwnProperty.call(clips, key) ? clips[key] : null;
      var uri = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && typeof raw.uri === 'string' ? raw.uri : '');
      if (!uri) return { id: '', source: '' };
      if (uri.length > MAX_CLIP_CHARS || !CLIP.test(uri)) throw new Error('A recording must be an audio file.');
      var src = (raw && typeof raw === 'object' && raw.source === 'teacher') || sourcesIn[key] === 'teacher' ? 'teacher' : 'computer';
      if (!idOf[key]) { idOf[key] = 's' + (++next); audio[idOf[key]] = uri; }
      if (src === 'teacher' && teacherClips.indexOf(idOf[key]) < 0) teacherClips.push(idOf[key]);
      return { id: idOf[key], source: src };
    };
    var title = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120) || 'Read along';
    var pages = pagesOf(sentences);
    var items = pages.map(function (page, i) {
      var raw = { lines: page.map(function (row) {
        var got = clipFor(row.text);
        if (got.id) {
          recorded++;
          if (got.source === 'teacher') teacherRecorded++; else computerRecorded++;
        }
        var line = { text: row.text, audio: got.id }, syl = lookup ? syllableText(row.text, lookup) : '';
        if (syl) { line.syl = syl; split++; if (!example) example = (/[A-Za-z]+(?:\u00b7[A-Za-z]+)+/.exec(syl) || [''])[0]; }
        if (row.para) line.para = true;
        return line;
      }), page: i + 1, pages: pages.length, lang: 'en' };
      var made = adapter.prepare(raw);
      if (!made || !made.item) {
        throw new Error('Page ' + (i + 1) + ' cannot be used: ' + (made && made.missing ? made.missing.join(', ') : 'no reason given'));
      }
      var n = (i < 9 ? '0' : '') + (i + 1);
      return Object.assign({ id: ACTIVITY + '-' + n }, made.item);
    });
    var lesson = { schema: LESSON_SCHEMA, player: PLAYER, lessonId: 'read-along-' + fnv(sentences.map(function (row) { return row.text; }).join('\n')), revision: '', language: 'en', title: title, showLetters: false,
      mode: 'practice', activityTitles: {}, blocks: [{ activity: ACTIVITY, items: items }], feedback: { correct: [], retry: null }, audio: audio, images: {}, submit: null };
    lesson.activityTitles[ACTIVITY] = adapter.title;
    lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.blocks, Object.keys(audio).map(function (id) { return audio[id].length; })]));
    return { lesson: lesson, sentences: sentences.length, pages: pages.length, recorded: recorded, missing: sentences.length - recorded,
      teacherRecorded: teacherRecorded, computerRecorded: computerRecorded, teacherClips: teacherClips, voice: text(o.voice).slice(0, 60),
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
    var recTotal = Number(made.recorded) || 0;
    var teacherRec = Number(made.teacherRecorded) || 0;
    var computerRec = made.computerRecorded != null ? Number(made.computerRecorded) : Math.max(0, recTotal - teacherRec);
    var intro = recTotal > 0 ? loader.CHECK_ADAPTERS[ACTIVITY].labels.read_along_intro : 'Read the passage on screen. Use Reading tools to change text size, colors, spacing or syllables.';
    var aboutNever, speechNote, speechMade, humanReviewed = false, credits = [];
    if (recTotal === 0) {
      aboutNever = 'It never uses the microphone or the camera. It has no cookies and runs no AI. This file has no recordings and makes no speech.';
      speechNote = 'This file has no recordings. It does not use the voice of the device and makes no speech.';
      speechMade = 'none (text and reading tools only)';
    } else if (teacherRec > 0 && computerRec === 0) {
      aboutNever = 'It never uses the microphone or the camera. It has no cookies and runs no AI. The reading voice is a set of recordings made by the teacher; this file makes no speech itself.';
      speechNote = 'The file plays recordings made by the teacher. It does not use the voice of the device and makes no speech.';
      speechMade = 'recorded by the teacher on their device';
      humanReviewed = true;
      credits.push('Recordings of the sentences: recorded by the teacher on their device.');
    } else if (teacherRec > 0 && computerRec > 0) {
      aboutNever = 'It never uses the microphone or the camera. It has no cookies and runs no AI. The reading voice is a set of recordings made ahead of time (by the teacher and with a computer voice); this file makes no speech itself.';
      speechNote = 'The file plays recordings. It does not use the voice of the device and makes no speech.';
      speechMade = 'recorded by the teacher (' + teacherRec + ') and ahead of time with Kokoro-82M text-to-speech (voice ' + voice + ') (' + computerRec + ')';
      credits.push('Recordings of the sentences: ' + teacherRec + ' recorded by the teacher on their device, and ' + computerRec + ' made ahead of time with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice.');
    } else {
      aboutNever = 'It never uses the microphone or the camera. It has no cookies and runs no AI. The reading voice is a set of recordings made ahead of time with a computer voice; this file makes no speech itself.';
      speechNote = 'The file plays recordings. It does not use the voice of the device and makes no speech.';
      speechMade = 'ahead of time, on the device of the person who made this file, with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice';
      credits.push('Recordings of the sentences: made ahead of time, on the device of the person who made this file, with Kokoro-82M text-to-speech (voice ' + voice + '), a machine voice. No person has listened to each one.');
    }
    if (made.syllables) credits.push('Syllable breaks: worked out when this file was made, from a word list' + (made.syllables.source ? ' (' + made.syllables.source + ')' : '') + '. No AI.');
    var html = loader.buildHtml(lesson, { core: NO_ANSWERS, labels: { intro: intro, about_never: aboutNever }, attributions: credits });
    var readAlongMeta = { builder: VERSION, sentences: made.sentences, pages: made.pages, recordings: recTotal, withoutRecording: made.missing, sentencesWithSyllables: made.syllables ? made.syllables.sentences : 0 };
    if (teacherRec > 0 && computerRec > 0 && Array.isArray(made.teacherClips) && made.teacherClips.length) readAlongMeta.teacherClips = made.teacherClips.slice();
    html = withManifest(html, {
      readAlong: readAlongMeta,
      speech: { engine: 'none', note: speechNote,
        recordings: { sentences: recTotal, made: speechMade, humanReviewed: humanReviewed } },
    });
    if (o.learner) html = withCodeName(html, o.learner);
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return { html: html, manifest: block ? JSON.parse(block[1]) : null, sha256: loader.sha256(html).hex, lesson: lesson };
  }

  // Reconstructs passage, title, voice, code name and existing sentence MP3/WAV clips from AlloPacketVerify.readParts().
  function readBack(parts) {
    if (!parts || !parts.ok || !parts.lesson || !Array.isArray(parts.lesson.blocks) || parts.lesson.blocks.length !== 1 || parts.lesson.blocks[0].activity !== ACTIVITY) {
      return { ok: false, why: 'This is not a read-along file.' };
    }
    var lesson = parts.lesson;
    var manifest = parts.manifest && typeof parts.manifest === 'object' ? parts.manifest : {};
    var items = Array.isArray(lesson.blocks[0].items) ? lesson.blocks[0].items : [];
    var audio = lesson.audio && typeof lesson.audio === 'object' ? lesson.audio : {};
    var speechMade = String((manifest.speech && manifest.speech.recordings && manifest.speech.recordings.made) || '');
    var voiceMatch = /\(voice ([a-z0-9_]+)\)/i.exec(speechMade);
    var voice = voiceMatch ? voiceMatch[1] : '';
    var teacherOnly = /^recorded by the teacher/i.test(speechMade) && !/Kokoro/i.test(speechMade);
    var teacherClipIds = Array.isArray(manifest.readAlong && manifest.readAlong.teacherClips) ? manifest.readAlong.teacherClips : null;
    var sentences = [];
    var clips = {};
    var clipSources = {};
    items.forEach(function (item) {
      var lines = item && Array.isArray(item.lines) ? item.lines : [];
      lines.forEach(function (line) {
        var lineText = clipKey(line && line.text);
        if (!lineText) return;
        var row = { text: lineText };
        if (line && line.para === true) row.para = true;
        sentences.push(row);
        var cid = line && typeof line.audio === 'string' ? line.audio : '';
        var uri = cid && Object.prototype.hasOwnProperty.call(audio, cid) ? audio[cid] : '';
        if (typeof uri === 'string' && uri.length <= MAX_CLIP_CHARS && CLIP.test(uri)) {
          clips[lineText] = uri;
          clipSources[lineText] = teacherClipIds ? (teacherClipIds.indexOf(cid) >= 0 ? 'teacher' : 'computer') : (teacherOnly ? 'teacher' : 'computer');
        }
      });
    });
    if (!sentences.length) return { ok: false, why: 'This read-along file has no sentences.' };
    var passage = '';
    for (var i = 0; i < sentences.length; i++) {
      if (i > 0) {
        if (sentences[i].para) passage += '\n\n';
        else if (/[.!?]["')\]]*$/.test(sentences[i - 1].text)) passage += ' ';
        else passage += '\n';
      }
      passage += sentences[i].text;
    }
    var title = text(manifest.title || lesson.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (title === 'Read along') title = '';
    return {
      ok: true,
      title: title,
      text: passage,
      sentences: sentences,
      voice: voice,
      learner: codeName(manifest.learner || ''),
      clips: clips,
      clipSources: clipSources,
      recordings: Object.keys(clips).length,
    };
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
    splitPassage: splitPassage, sentenceCount: sentenceCount, syllableText: syllableText, pagesOf: pagesOf, clipKey: clipKey, lessonFromReadAlong: lessonFromReadAlong, buildReadAlongPacket: buildReadAlongPacket, readBack: readBack, codeName: codeName, withCodeName: withCodeName };
  root.AlloPacketReadAlong = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
