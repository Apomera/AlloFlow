// AlloFlow vocabulary practice: makes a practice file (feedback on every question, two tries) or a check (one try,
// a score, an optional teacher code) of multiple-choice word meaning questions, from a teacher's word list and the
// definition bank (packets_vocab_bank_en.js, window.AlloVocabBank, prepared ahead of time). No AI and no app.
// One plain script for a browser page (window.AlloPacketVocab) and for node (module.exports). It calls nothing on
// the network and reads no clock: the same list, choices and changes give the same bytes.
//
// The file is made by the take-home loader (AlloWordSoundsTakeHome.buildHtml) with three activities:
// vocab_meaning (Word to meaning), vocab_word (Meaning to word) and vocab_blank (Fill the blank), in
// word_sounds_take_home/check_adapters. Each question goes through its adapter's prepare (an allowlist).
//
// What a machine-made question gets wrong, and so what the teacher's check screen is for (the trial of 2026-11-12,
// C:\tmp\packets_build_1111\vocab\NOTES.md): the meaning is not the one the unit means (cell, conductor), a wrong
// answer is also right or too close, a text is garbled. So the page shows every question before the file is made;
// the default is accepted, and anything can be changed. With multiple choice only one thing matters: exactly one
// choice is right. Any real meaning of the word may be the right one, and no wrong answer may match ANY meaning of
// the word (for "bat" the animal, "a stick used to hit a ball" would be a second right answer). For Meaning to word
// the wrong WORDS may not have the meaning shown. The bank promises this for its ranked wrong answers; this file
// checks it again, and warns about anything the teacher types or swaps in.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-vocab-builder/0.1.0';
  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var PLAYER = 'alloflow-word-sounds-take-home/2';
  var MAX_WORDS = 40;
  var MAX_TEXT = 300;   // a meaning, a sentence, a wrong answer
  var WRONG = 3;        // wrong answers in each question
  var POOL = 8;         // candidates a default trio is chosen from
  var TYPES = [
    { id: 'meaning', activity: 'vocab_meaning', name: 'Word to meaning', on: true, line: 'The word is shown. The student chooses its meaning.' },
    { id: 'word', activity: 'vocab_word', name: 'Meaning to word', on: true, line: 'The meaning is shown. The student chooses the word.' },
    { id: 'blank', activity: 'vocab_blank', name: 'Fill the blank', on: false, line: 'A sentence with a blank. The wrong answers are other words from your list.' },
    // Picture questions (2026-11-12): only for words with a picture in the Word Sounds picture set (word_sounds_symbols_en.js).
    { id: 'picture', activity: 'vocab_picture', name: 'Word to picture', on: false, pictures: true, line: 'The word is shown. The student chooses the picture that shows it, from 4 pictures.' },
    { id: 'picword', activity: 'vocab_picture_word', name: 'Picture to word', on: false, pictures: true, line: 'A picture is shown. The student chooses the word that goes with it.' },
  ];
  var MIN_PICTURES = 4;   // picture questions are offered when at least this many list words have a picture
  var MEDIA = typeof WeakMap === 'function' ? new WeakMap() : { get: function () { return null; }, set: function () {} };
  var MEASURE = { measure: 'vocab_items', scoreUnit: 'items_correct', scoringVersion: 1, formVersion: 1, allowSkip: false };

  function text(value) { return value == null ? '' : String(value); }
  function line(value, max) { return text(value).replace(/\s+/g, ' ').trim().slice(0, max || MAX_TEXT); }
  function own(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }
  function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function fnv(value) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  // A fixed mix of a list: the same seed text gives the same order (xorshift32 seeded by FNV-1a), as in
  // packet_math_practice_builder.js.
  function mixed(list, seed) {
    var s = parseInt(fnv(seed), 16) || 1;
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      var j = s % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  function typeOf(id) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id || TYPES[i].activity === id) return TYPES[i]; return null; }

  // ---------------------------------------------------------------------------
  // The list
  // ---------------------------------------------------------------------------
  // A word as a teacher types it: letters (any language), apostrophes, hyphens and single spaces, 1 to 40
  // characters, outer punctuation and quotes dropped. '' when nothing usable is left.
  function normalizeWord(value) {
    var t = text(value).normalize ? text(value).normalize('NFC') : text(value);
    t = t.replace(/\s+/g, ' ').trim().replace(/^[\s"'“”‘’.!?:()[\]{}]+|[\s"“”.!?:()[\]{}]+$/g, '');
    if (!t || t.length > 40) return '';
    var ok = true;
    try { ok = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M}'’ -]*$", 'u').test(t); } catch (_) { ok = /^[A-Za-z][A-Za-z' -]*$/.test(t); }
    return ok && !/ {2}|--/.test(t) ? t : '';
  }
  function keyOf(word) { return normalizeWord(word).toLowerCase().replace(/’/g, "'"); }
  // "habitat, prey\npredator" -> { words: [{ text, word, key }], unusable: [text], twice: [word], over: n }
  function parseWords(value) {
    var out = { words: [], unusable: [], twice: [], over: 0 }, seen = {};
    text(value).split(/[\n,;]+/).forEach(function (part) {
      var raw = part.trim();
      if (!raw) return;
      var word = normalizeWord(raw);
      if (!word) { out.unusable.push(raw.slice(0, 40)); return; }
      var key = keyOf(word);
      if (seen[key]) { if (out.twice.indexOf(word) < 0) out.twice.push(word); return; }
      seen[key] = true;
      if (out.words.length >= MAX_WORDS) { out.over++; return; }
      out.words.push({ text: raw, word: word, key: key });
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Close meanings
  // ---------------------------------------------------------------------------
  var STOP = {};
  ('a an the of to and or in on at for with by from that which who whom is are was were be been being it its as this these those your you '
    + 'they their them he she his her we our us something someone somebody thing things kind type sort way used use very can could may '
    + 'not no do does did has have had one some any such so if when where than then into out up about over').split(' ').forEach(function (w) { STOP[w] = true; });
  function contentWords(value) {
    return text(value).toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(function (w) { return w && !STOP[w]; })
      .map(function (w) { return w.length > 3 ? w.replace(/(?:es|s)$/, '') : w; });
  }
  function flat(value) { return contentWords(value).join(' '); }
  // Two meanings that say the same thing: the same words, most of the same words, or every word of the shorter one.
  function closeMeaning(a, b) {
    var x = contentWords(a), y = contentWords(b);
    if (!x.length || !y.length) return line(a).toLowerCase() === line(b).toLowerCase() && !!line(a);
    if (x.join(' ') === y.join(' ')) return true;
    var A = {}, B = {}, inter = 0, union = 0;
    x.forEach(function (w) { A[w] = true; });
    y.forEach(function (w) { B[w] = true; });
    Object.keys(A).forEach(function (w) { union++; if (B[w]) inter++; });
    Object.keys(B).forEach(function (w) { if (!A[w]) union++; });
    var small = Math.min(Object.keys(A).length, Object.keys(B).length);
    return inter / union >= 0.6 || (small >= 2 && inter === small);
  }
  function hasWord(sentence, word) {
    var w = keyOf(word);
    if (!w) return false;
    var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return new RegExp('(^|[^\\p{L}\\p{M}])' + esc + '(?![\\p{L}\\p{M}])', 'iu').test(text(sentence)); } catch (_) { return new RegExp('\\b' + esc + '\\b', 'i').test(text(sentence)); }
  }

  // ---------------------------------------------------------------------------
  // Drafting the questions: one row for each word
  // ---------------------------------------------------------------------------
  // The bank's senses of a word, school meaning first (common 1 first).
  function sensesOf(bank, word) {
    var list = [];
    try { list = bank && typeof bank.senses === 'function' ? bank.senses(word) || [] : []; } catch (_) { list = []; }
    return list.filter(function (s) { return isObject(s) && typeof s.id === 'string' && line(s.def); })
      .map(function (s, i) { return { s: s, i: i }; })
      .sort(function (a, b) { return (Number(a.s.common) || 99) - (Number(b.s.common) || 99) || a.i - b.i; })
      .map(function (p) { return p.s; });
  }
  function senseById(bank, id) { try { return bank && typeof bank.sense === 'function' ? bank.sense(id) : null; } catch (_) { return null; } }
  // Every meaning a word has: its bank senses and any meaning the teacher wrote for it.
  function meaningsOf(bank, word, extra) {
    return sensesOf(bank, word).map(function (s) { return line(s.def); }).concat((extra || []).map(function (d) { return line(d); })).filter(Boolean);
  }
  // Why a wrong answer cannot be used or should be looked at, in plain words; '' when it is fine.
  //   row: the row it belongs to. cand: { word, def }.
  function wrongProblem(row, cand, bank, others) {
    var def = line(cand.def), word = line(cand.word);
    if (!def) return 'This wrong answer is empty.';
    var mine = meaningsOf(bank, row.word, [row.def]);
    for (var i = 0; i < mine.length; i++) if (closeMeaning(def, mine[i])) return 'This could also be right: it is close to a meaning of "' + row.word + '".';
    if (word && keyOf(word) === row.key) return 'This is the word itself.';
    if (word) {
      var theirs = meaningsOf(bank, word, []);
      for (var j = 0; j < theirs.length; j++) if (closeMeaning(row.def, theirs[j])) return 'In Meaning to word, "' + word + '" could also be right: one of its meanings is close to this one.';
    }
    if (hasWord(def, row.word)) return 'It uses the word "' + row.word + '" itself.';
    var same = (others || []).filter(function (o) { return o !== cand && (closeMeaning(o.def, def) || (word && keyOf(o.word) === keyOf(word))); });
    if (same.length) return 'Two wrong answers say almost the same thing.';
    return '';
  }
  // Two words a student could take for one another (2026-11-13, the answer audit: C:\tmp\packets_build_1111\answer_audit):
  // one word with two spellings (afterward, afterwards), a word inside a longer one (sun, sunlight; hall, hallway), or a
  // meaning of one that names the other (photo: "A picture created by a camera"; seem: "To look like or appear to be").
  // The bank's own wrong answers were checked against WordNet when it was built; the words of a teacher's list never
  // were, and related words are what a unit list is made of.
  function namesWord(defs, word, bank) {
    var w = keyOf(word), h = keyOf(headOf(bank, w) || w);
    return (defs || []).some(function (d) {
      return [w, h].some(function (x) { return !!x && [x, x + 's', x + 'es', x + 'd', x + 'ed', x + 'ing', x.replace(/e$/, '') + 'ing'].some(function (f) { return hasWord(d, f); }); });
    });
  }
  function sameFamily(a, b, bank) {
    var x = keyOf(a), y = keyOf(b);
    if (!x || !y) return false;
    if (x === y || (headOf(bank, x) || x) === (headOf(bank, y) || y) || x + 's' === y || y + 's' === x) return true;
    var short = x.length <= y.length ? x : y, long = short === x ? y : x;
    return short.length >= 3 && /^[a-z]+$/.test(long) && long.indexOf(short) === 0;
  }
  function looksAlike(row, word, bank, defs) {
    var mine = meaningsOf(bank, row.base || row.word, [row.def]), theirs = meaningsOf(bank, word, defs || []);
    return sameFamily(row.base || row.word, word, bank) || sameFamily(row.word, word, bank) || namesWord(mine, word, bank) || namesWord(theirs, row.base || row.word, bank) ||
      mine.some(function (m) { return theirs.some(function (d) { return closeMeaning(m, d); }); });
  }
  // The candidates for a row's wrong answers, best first, one for each word: the bank's ranked wrong answers, then
  // the meanings of the other words in the list (the only ones a word the bank does not have can use).
  function poolFor(row, rows, bank) {
    var out = [], seen = {};
    var add = function (cand) {
      var k = keyOf(cand.word);
      if (!k || seen[k] || k === row.key || !line(cand.def)) return;
      if (wrongProblem(row, cand, bank, out)) return;
      // A word of the list that a student could take for this one (looksAlike).
      if (cand.from === 'list' && looksAlike(row, cand.word, bank, [cand.def])) return;
      seen[k] = true;
      out.push(cand);
    };
    (row.sense && Array.isArray(row.sense.distractors) ? row.sense.distractors : []).forEach(function (id) {
      var s = senseById(bank, id);
      if (s && line(s.def)) add({ id: s.id, word: line(s.word, 60), def: line(s.def), from: 'bank' });
    });
    // Words of the same kind (noun, verb...) first, so the kind of word is not a clue.
    var same = function (other) { return row.pos && other.pos === row.pos ? 0 : 1; };
    rows.filter(function (other) { return other !== row && other.def; }).map(function (other, i) { return { other: other, i: i }; })
      .sort(function (x, y) { return same(x.other) - same(y.other) || x.i - y.i; })
      .forEach(function (p) { add({ id: p.other.senseId, word: p.other.word, def: p.other.def, from: 'list' }); });
    return out;
  }
  // Three wrong answers from the first POOL candidates, chosen so that the right answer is not usually the longest or the
  // shortest: a seeded draw says how many of the three are shorter than the right answer (0 to 3), and the trio that
  // makes it true with the best-ranked candidates, nearest in length, is used (the trial's method).
  function balancedTrio(answer, pool, seed) {
    var top = pool.slice(0, POOL);
    if (top.length <= WRONG) return top.slice();
    var want = parseInt(fnv(seed), 16) % 4, size = line(answer).length, best = null, bestScore = Infinity;
    for (var i = 0; i < top.length; i++) for (var j = i + 1; j < top.length; j++) for (var k = j + 1; k < top.length; k++) {
      var trio = [top[i], top[j], top[k]];
      var shorter = trio.filter(function (c) { return c.def.length < size; }).length;
      var near = trio.reduce(function (n, c) { return n + Math.abs(c.def.length - size); }, 0);
      var score = Math.abs(shorter - want) * 1000 + (i + j + k) * 10 + near / 10;
      if (score < bestScore) { bestScore = score; best = trio; }
    }
    return best;
  }
  // ---------------------------------------------------------------------------
  // Word forms (2026-11-13): the plain English endings, so a sentence may have "predators" for predator, and the
  // wrong words can be written the same way ("habitats"). Only regular forms are made; a word that cannot be written
  // in the form safely (an irregular verb, a word for a thing that cannot be counted...) is left out, never guessed.
  // ---------------------------------------------------------------------------
  var FORMS = { noun: ['s'], verb: ['s', 'ed', 'ing'], adjective: ['er', 'est'], '': ['s', 'ed', 'ing'] };
  var IRREGULAR = {}, ODD_PLURAL = {}, ODD_ADJECTIVE = {};
  // Verbs whose past is not made with -ed (and the same with a prefix: become, understand, overcome).
  ('arise awake be bear beat begin bend bet bid bind bite bleed blow break breed bring build burn burst buy cast catch choose cling come cost creep cut deal dig dive do '
    + 'draw dream drink drive eat fall feed feel fight find flee fling fly forbid forget forgive freeze get give go grind grow hang have hear hide hit hold hurt keep '
    + 'kneel know lay lead lean leap learn leave lend let lie light lose make mean meet pay put quit read rid ride ring rise run say see seek sell send set sew shake '
    + 'shed shine shoot show shrink shut sing sink sit slay sleep slide sling slit smell speak speed spell spend spill spin spit split spoil spread spring stand steal '
    + 'stick sting stink stride strike string strive swear sweep swell swim swing take teach tear tell think throw thrust tread wake wear weave weep wet win wind wring write').split(' ').forEach(function (w) { IRREGULAR[w] = true; });
  ('man woman child person mouse louse goose foot tooth ox sheep deer fish moose species series aircraft cactus fungus nucleus radius stimulus alga larva '
    + 'bacterium datum medium criterion phenomenon analysis axis crisis hypothesis oasis thesis index appendix matrix vertex information '
    + 'prey offspring salmon trout bison swine cattle police people news equipment furniture luggage advice homework evidence knowledge').split(' ').forEach(function (w) { ODD_PLURAL[w] = true; });
  ('good bad far little many much well ill fun real right wrong just worth main live male female same').split(' ').forEach(function (w) { ODD_ADJECTIVE[w] = true; });
  function irregular(base) {
    return !!IRREGULAR[base] || ['be', 'for', 'fore', 'mis', 'out', 'over', 're', 'un', 'under', 'up', 'with'].some(function (p) { return base.length > p.length + 1 && base.indexOf(p) === 0 && !!IRREGULAR[base.slice(p.length)]; });
  }
  // The vowel sounds of a word, about (a silent last e is not one): stop 1, happy 2, visit 2.
  function beats(w) { return (w.replace(/^y/, '').replace(/([^aeiouy])e$/, '$1').match(/[aeiouy]+/g) || []).length; }
  // Which plain form of base a word is: '' (the word itself), 's', 'ed', 'ing', 'er' or 'est', or null. It reads the
  // forms a sentence may have (volcanoes, leaves, stopped), more than inflect() makes.
  function formOf(token, base, pos) {
    var t = keyOf(token), b = keyOf(base);
    if (!t || !b) return null;
    if (t === b) return '';
    var e = /e$/.test(b), d = b + b.charAt(b.length - 1), y = /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'i' : '';
    var c = { s: [b + 's', b + 'es'], ed: [b + 'ed', e ? b + 'd' : '', d + 'ed'], ing: [b + 'ing', b.replace(/e$/, '') + 'ing', d + 'ing', /ie$/.test(b) ? b.slice(0, -2) + 'ying' : ''],
      er: [b + 'er', e ? b + 'r' : '', d + 'er'], est: [b + 'est', e ? b + 'st' : '', d + 'est'] };
    if (y) { c.s.push(y + 'es'); c.ed.push(y + 'ed'); c.er.push(y + 'er'); c.est.push(y + 'est'); }
    if (/f$/.test(b)) c.s.push(b.slice(0, -1) + 'ves');
    if (/fe$/.test(b)) c.s.push(b.slice(0, -2) + 'ves');
    var allowed = own(FORMS, pos || '') ? FORMS[pos || ''] : [];
    for (var i = 0; i < allowed.length; i++) if (c[allowed[i]].indexOf(t) >= 0) return allowed[i];
    return null;
  }
  // A word in a form, made by the regular rules: '' when the word cannot be written in that form safely. def is the word's
  // meaning: a noun gets -s only when its meaning is written for one thing ("A place where...", "An animal that...", "The
  // natural place where..."), so "erosion" ("The loss of land") and "sand" ("Grains of rock") are never made plural.
  var ONE_THING = /^(?:(?:an?|one|any|someone|somebody)\b|the (?:[a-z]+ ){0,2}(?:place|part|area|home|room|piece|person|animal|plant|building|group|unit|object|tool|line|path|hole|shape|side|edge|point|space|body)\b)/i;
  function inflect(base, form, pos, def) {
    var b = keyOf(base);
    if (!b || /[^a-z]/.test(b)) return '';
    if (!form) return b;
    var cvc = /[^aeiou][aeiou][^aeiouwxy]$/.test(b) && !/qu/.test(b);
    if (form === 's') {
      if (pos === 'noun') {
        if (ODD_PLURAL[b] || /(?:us|is|[^f]fe?|[^aeiou]o|man|ach|och)$/.test(b) || !ONE_THING.test(line(def))) return '';
      } else if (pos !== 'verb' || b === 'be' || b === 'have') return '';
      if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ies';
      if (/z$/.test(b)) return '';
      if (/(?:s|x|ch|sh)$/.test(b)) return b + 'es';
      if (/[^aeiou]o$/.test(b)) return b + 'es';
      return b + 's';
    }
    if (form === 'ed' || form === 'ing') {
      if (pos !== 'verb' || /c$/.test(b) || (form === 'ed' && irregular(b))) return '';
      if (form === 'ed' && /e$/.test(b)) return b + 'd';
      if (form === 'ed' && /[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ied';
      if (form === 'ing' && b === 'be') return 'being';
      if (form === 'ing' && /ie$/.test(b)) return b.slice(0, -2) + 'ying';
      if (form === 'ing' && /[^eoy]e$/.test(b)) return b.slice(0, -1) + 'ing';
      // stop, stopped; a longer word ending -er, -en or -on is not stressed there (gathered, happened); but visit, visited
      // and admit, admitted hang on the stress, so any other longer one is left out.
      if (cvc) return beats(b) === 1 ? b + b.charAt(b.length - 1) + form : /(?:[^f]er|en|on)$/.test(b) ? b + form : '';
      return b + form;
    }
    if (form === 'er' || form === 'est') {
      if (pos !== 'adjective' || ODD_ADJECTIVE[b]) return '';
      if (/[^aeiou]y$/.test(b)) return beats(b) <= 2 ? b.slice(0, -1) + 'i' + form : '';
      if (beats(b) !== 1) return '';
      if (/e$/.test(b)) return b + form.slice(1);
      return cvc ? b + b.charAt(b.length - 1) + form : b + form;
    }
    return '';
  }
  function headOf(bank, word) { try { return bank && typeof bank.head === 'function' ? bank.head(word) || null : null; } catch (_) { return null; } }
  // A first capital stays a first capital: "Habitats" for a list typed "Habitat".
  function withCase(out, like) { var c = text(like).charAt(0); return c && c !== c.toLowerCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out; }
  // What the bank says about a word, for writing it in a form: { base, pos, def } of the sense id given or of its first
  // sense of that kind, or null when the bank does not have it.
  function wordInfo(bank, word, pos, id) {
    var s = id ? senseById(bank, id) : null;
    if (!s || (pos && s.pos !== pos)) s = sensesOf(bank, word).filter(function (x) { return !pos || x.pos === pos; })[0] || null;
    return s ? { base: keyOf(s.word), pos: line(s.pos, 20), def: line(s.def) } : null;
  }
  // A list row, for writing its word in a form. A word the bank does not have is only ever used as the teacher typed it.
  function rowInfo(o) { return o.sense ? { base: keyOf(o.base || o.word), pos: o.pos || '', def: o.def } : { base: o.key, pos: o.pos || '', def: o.def, own: true }; }
  // word, written in the form ('' for the word the meaning is for), or '' when it cannot be.
  function inForm(word, info, form, bank) {
    if (!info) return '';
    if (!form) return info.own ? normalizeWord(word) : withCase(info.base, word);
    if (info.own) return '';
    var out = inflect(info.base, form, info.pos, info.def), h = out ? headOf(bank, out) : null;
    return out && (!h || h === info.base) ? withCase(out, word) : '';
  }

  // Fill the blank: the sentence with the word as a blank. The word must be in it once, as written in the list or in a
  // plain form of it (2026-11-13: "The deer watched for predators" works for predator; the answer is then "predators").
  //   blankSentence(sentence, word, { bank, base, pos }) -> { ask, article, answer, form, why }
  // base: the word the meaning is for (bank.head(word) when left out); pos: its kind (noun, verb...), which forms it may have.
  function blankSentence(sentence, word, opts) {
    var s = line(sentence), w = keyOf(word), o = opts || {};
    if (!s || !w) return { ask: '', why: 'There is no example sentence.' };
    var base = keyOf(o.base || headOf(o.bank, w) || w), pos = line(o.pos, 20), found = [], re;
    if (/[ '’-]/.test(w)) {
      // A word of more than one part ("food chain") is found as written.
      var esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try { re = new RegExp('(^|[^\\p{L}\\p{M}])(' + esc + ')(?![\\p{L}\\p{M}])', 'giu'); } catch (_) { re = new RegExp('(^|\\W)(' + esc + ')(?!\\w)', 'gi'); }
      s.replace(re, function (m, before, at, offset) { found.push({ at: offset + before.length, text: at, form: base === w ? '' : null }); return m; });
    } else {
      try { re = /[\p{L}\p{M}]+/gu; } catch (_) { re = /[A-Za-z]+/g; }
      s.replace(re, function (token, offset) {
        var k = keyOf(token);
        if (k === w) { found.push({ at: offset, text: token, form: formOf(w, base, pos) }); return token; }
        var form = formOf(k, base, pos), h = form != null ? headOf(o.bank, k) : null;
        if (form != null && (!h || h === base)) found.push({ at: offset, text: token, form: form });
        return token;
      });
    }
    if (!found.length) return { ask: '', why: 'The sentence does not have the word as it is written in your list, or with a plain ending like -s, -ed or -ing. Edit the sentence.' };
    if (found.length > 1) return { ask: '', why: 'The word is in the sentence more than once. Edit the sentence.' };
    var f = found[0], a = /(?:^|\s)(an?)\s+$/i.exec(s.slice(0, f.at));
    // The answer is the word as the sentence has it, with the list's first letter (a capital where the list has one).
    var answer = keyOf(f.text) === w ? normalizeWord(word) : withCase(keyOf(f.text), word);
    return { ask: s.slice(0, f.at) + '___' + s.slice(f.at + f.text.length), article: a ? a[1].toLowerCase() : '', answer: answer, form: f.form, why: '' };
  }
  function vowelStart(word) { return /^[aeiou]/i.test(line(word)); }
  // Wrong words for a blank (2026-11-13: of the same kind as the word, noun with noun, and in the sentence's form).
  //   1. Words from the teacher's list (the trial: related words often fit the sentence too), the bank's "does not fit"
  //      words first, written in the sentence's form; a word that cannot be is left out.
  //   2. When the list has too few: the bank's own words that do not fit this sentence (sense.blanks, checked for it and
  //      already in its form), only while the sentence is the bank's own.
  //   3. Words of the list whose kind is not known (a word the bank does not have), as typed, when no form is needed.
  // After "a" the word must start with a consonant letter, after "an" with a vowel letter, so the article is not a clue.
  function blankPool(row, rows, b, bank) {
    var out = [], seen = {}, base = keyOf(row.base || row.word), form = b.form;
    seen[row.key] = seen[keyOf(b.answer)] = true;
    // After a or an every choice starts with the same kind of letter as the answer (a unified whole: then all with a vowel).
    // listed: a word of the teacher's list, which must not be one a student could take for this one (looksAlike).
    var add = function (w, listed) {
      var k = keyOf(w);
      if (!k || seen[k] || (b.article && vowelStart(w) !== vowelStart(b.answer))) return;
      var h = headOf(bank, k);
      if (h && h === base) return;
      if (sameFamily(base, k, bank) || (listed && looksAlike(row, k, bank, listed.def ? [listed.def] : []))) return;
      seen[k] = true;
      out.push(normalizeWord(w));
    };
    var fits = (row.sense && Array.isArray(row.sense.blanks) ? row.sense.blanks : []).map(keyOf);
    // A fixed mix for each word, so the same few list words are not the wrong answers everywhere.
    var others = mixed(rows.filter(function (o) { return o !== row && o.key !== row.key; }), 'blank|' + row.key);
    var written = function (o) { return form == null ? o.word : inForm(o.word, rowInfo(o), form, bank); };
    var same = others.filter(function (o) { return !row.pos || o.pos === row.pos; }).map(function (o, i) { return { w: written(o), i: i, o: o }; }).filter(function (p) { return !!p.w; });
    same.sort(function (x, y) { return (fits.indexOf(keyOf(x.w)) >= 0 ? 0 : 1) - (fits.indexOf(keyOf(y.w)) >= 0 ? 0 : 1) || x.i - y.i; }).forEach(function (p) { add(p.w, p.o); });
    if (row.sense && row.example === line(row.sense.example)) (row.sense.blanks || []).forEach(function (w) {
      // The curation chose these words for this sentence. One the bank has is used only when it has a meaning of the same kind.
      if (!headOf(bank, w) || !row.pos || sensesOf(bank, w).some(function (s) { return s.pos === row.pos; })) add(w);
    });
    if (row.pos && !form) others.filter(function (o) { return !o.pos; }).forEach(function (o) { add(o.word, o); });
    return out;
  }
  // Why a sentence has too few wrong words, in plain words.
  function blankShort(row, b) {
    var kind = row.pos ? row.pos + 's' : 'words';
    var how = b.form ? ' that can be written like ' + b.answer : '';
    // An answer whose first letter is not the article's kind (a unified whole) needs choices that start like it does.
    var odd = !!b.article && vowelStart(b.answer) !== (b.article === 'an');
    var after = odd ? ' start with a ' + (vowelStart(b.answer) ? 'vowel' : 'consonant') + ', as "' + b.answer + '" does after "' + b.article + '"' : ' can go after "' + b.article + '"';
    return 'Fill the blank needs 3 other ' + kind + ' from your list' + how + (b.article ? (how ? ' and' : ' that') + after : '')
      + '. Add words to the list' + (b.article || b.form ? ', or edit the sentence.' : '.');
  }
  // Meaning to word for a word typed in another form ("cats", with the meaning of "cat"): the wrong words are written the
  // same way ("dogs") when every one of them can be; else the question asks for the word the meaning is for ("cat"), and
  // step 2 says so. { answer, wrong: [word, ...], base: true when it asks for that word, form }. 2026-11-13.
  function wordQuestion(row, bank) {
    var plain = { answer: row.word, wrong: row.wrong.map(function (c) { return c.word; }), base: false, form: '' };
    if (!row.base || !row.def || row.wrong.length < WRONG) return plain;
    var form = formOf(row.word, row.base, row.pos);
    if (form) {
      var made = row.wrong.map(function (c) { var info = wordInfo(bank, c.word, '', c.id); return inForm(c.word, info, form, bank); });
      var keys = made.map(keyOf).concat(row.key);
      if (made.every(Boolean) && keys.every(function (k, i) { return keys.indexOf(k) === i; })) return { answer: row.word, wrong: made, base: false, form: form };
    }
    var back = row.wrong.map(function (c) { return inForm(c.word, wordInfo(bank, c.word, '', c.id), '', bank) || c.word; });
    var answer = withCase(row.base, row.word), all = back.map(keyOf).concat(keyOf(answer));
    if (!all.every(function (k, i) { return all.indexOf(k) === i; })) back = plain.wrong;
    return { answer: answer, wrong: back, base: true, form: '' };
  }

  // The questions for a list, as the teacher's check screen shows them.
  //   draftRows({ words: [word, ...] | parseWords(...).words, bank, edits })
  // edits (what the page keeps on the device; see packets-vocab.js):
  //   { words: { key: { sense, def, example, pos, wrong: [{ id, word, def }], wrongFor, blank: [word], blankFor } },
  //     senses: { senseId: { def, example } } }
  // Each row: { word, key, inBank, senses, senseId, sense, pos, def, example, edited, checked, own, pool, wrong,
  //   problems: [plain text for each wrong answer], blank: { ask, why, pool, wrong, problems } }
  function draftRows(input) {
    var o = input || {};
    var bank = o.bank || null;
    var pics = o.pictures && typeof o.pictures.has === 'function' && typeof o.pictures.file === 'function' ? o.pictures : null;
    var edits = isObject(o.edits) ? o.edits : {};
    var wordEdits = isObject(edits.words) ? edits.words : {};
    var senseEdits = isObject(edits.senses) ? edits.senses : {};
    var list = (Array.isArray(o.words) ? o.words : []).map(function (w) { return typeof w === 'string' ? w : w && w.word; }).map(normalizeWord).filter(Boolean);
    var seen = {};
    list = list.filter(function (w) { var k = keyOf(w); if (seen[k]) return false; seen[k] = true; return true; }).slice(0, MAX_WORDS);
    var rows = list.map(function (word) {
      var key = keyOf(word), mine = isObject(wordEdits[key]) ? wordEdits[key] : {};
      var senses = sensesOf(bank, word);
      var sense = senses.filter(function (s) { return s.id === mine.sense; })[0] || senses[0] || null;
      var row = { word: word, key: key, inBank: senses.length > 0, senses: senses, sense: sense, own: !sense, base: '' };
      if (sense) {
        var changed = isObject(senseEdits[sense.id]) ? senseEdits[sense.id] : {};
        row.senseId = sense.id;
        // The word the meaning is written for, when the list has another form of it ("cats": the meaning of "cat").
        if (line(sense.word, 60) && keyOf(sense.word) !== key) row.base = line(sense.word, 60);
        row.pos = line(sense.pos, 20);
        row.def = line(changed.def) || line(sense.def);
        row.example = changed.example != null ? line(changed.example) : line(sense.example);
        row.edited = !!(line(changed.def) && line(changed.def) !== line(sense.def)) || (changed.example != null && line(changed.example) !== line(sense.example));
        row.checked = sense.checked === 'good' || sense.checked === 'fixed' ? sense.checked : '';
      } else {
        row.senseId = 'own:' + key;
        row.pos = line(mine.pos, 20);
        row.def = line(mine.def);
        row.example = line(mine.example);
        row.edited = !!row.def;
        row.checked = '';
        // A meaning found online (packets-vocab-lookup.html): "from the internet, not checked", or changed by the teacher since.
        if (isObject(mine.net) && line(mine.net.def) && row.def) row.net = { source: line(mine.net.source, 120), license: line(mine.net.license, 40), changed: line(mine.net.def) !== row.def };
      }
      // Its picture, when the picture set has one and the teacher did not leave it out: the picture's file name.
      row.picture = '';
      row.pictureOff = mine.noPicture === true;
      row.group = isGroupWord(word);
      if (pics && !row.pictureOff && !row.group) { try { row.picture = pics.has(word) ? String(pics.file(word) || '') : ''; } catch (_) { row.picture = ''; } }
      row.mine = mine;
      return row;
    });
    rows.forEach(function (row) {
      row.pool = row.def ? poolFor(row, rows, bank) : [];
      var kept = row.mine.wrongFor === row.senseId && Array.isArray(row.mine.wrong) ? row.mine.wrong.filter(function (c) { return isObject(c) && line(c.def) && line(c.word); }).slice(0, WRONG)
        .map(function (c) { return { id: line(c.id, 80), word: line(c.word, 60), def: line(c.def), from: c.from === 'list' ? 'list' : c.from === 'teacher' ? 'teacher' : 'bank' }; }) : [];
      // A word typed in another form ("cats"): the 3 are chosen from the candidates that can be written the same way, when
      // there are 3, so Meaning to word can ask "cats" among "dogs", "owls"... (wordQuestion). 2026-11-13.
      var form = row.base && row.def ? formOf(row.word, row.base, row.pos) : '';
      var fit = form ? row.pool.filter(function (c) { return !!inForm(c.word, wordInfo(bank, c.word, '', c.id), form, bank); }) : [];
      row.wrong = kept.length === WRONG ? kept : row.def ? balancedTrio(row.def, fit.length >= WRONG ? fit : row.pool, row.key + '|' + row.senseId) : [];
      row.problems = row.wrong.map(function (c) { return wrongProblem(row, c, bank, row.wrong); });
      row.wordAsk = wordQuestion(row, bank);
      var b = blankSentence(row.example, row.word, { bank: bank, base: row.base || row.word, pos: row.pos });
      var bpool = b.ask ? blankPool(row, rows, b, bank) : [];
      var bkept = row.mine.blankFor === row.senseId + '|' + b.ask && Array.isArray(row.mine.blank) ? row.mine.blank.map(function (w) { return normalizeWord(w); }).filter(Boolean).slice(0, WRONG) : [];
      row.blank = { ask: b.ask, why: b.why, answer: b.ask ? b.answer : row.word, form: b.ask ? b.form : '', pool: bpool, wrong: bkept.length === WRONG ? bkept : bpool.slice(0, WRONG), problems: [] };
      if (b.ask && bpool.length < WRONG) row.blank.why = blankShort(row, b);
      var itself = keyOf(row.base || row.word);
      row.blank.problems = row.blank.wrong.map(function (w, i) {
        if (keyOf(w) === row.key || keyOf(w) === keyOf(row.blank.answer) || headOf(bank, w) === itself) return 'This is the word itself.';
        if (row.blank.wrong.some(function (x, j) { return j !== i && keyOf(x) === keyOf(w); })) return 'This word is listed twice.';
        return '';
      });
      delete row.mine;
    });
    rows.forEach(function (row) { row.pictureWrong = row.picture ? pictureWrong(row, rows, bank, pics) : []; });
    return rows;
  }
  // The 3 other words of a picture question: list words with a picture (a fixed mix, the same kind of word first),
  // then the bank's wrong-answer words that have one. Never a second right answer: not the word or a form of it, not a
  // picture already used, no meaning close to one of the word's, neither word in the other's meaning.
  // Words for a group of things (food, animal, toy...): in a picture question more than one picture could show one
  // (an orange is food), so they are never asked and never one of the other pictures. A form of one counts too (toys).
  var GROUP_WORDS = {};
  ('animal pet food fruit vegetable plant flower insect bug mammal reptile amphibian creature vehicle transport toy tool clothes clothing '
    + 'furniture drink meat snack meal dessert sweet candy shape color number letter sport game job person people family '
    + 'building place weather instrument machine container thing object baby child kid adult grown-up animal home').split(' ').forEach(function (w) { GROUP_WORDS[w] = true; });
  function isGroupWord(word) {
    var k = keyOf(word);
    return !!GROUP_WORDS[k] || (/s$/.test(k) && (!!GROUP_WORDS[k.slice(0, -1)] || (/es$/.test(k) && !!GROUP_WORDS[k.slice(0, -2)]))) || /ies$/.test(k) && !!GROUP_WORDS[k.slice(0, -3) + 'y'] || k === 'children';
  }
  function pictureWrong(row, rows, bank, pics) {
    var out = [], files = [row.picture];
    var base = function (w) { try { return bank && typeof bank.head === 'function' ? keyOf(bank.head(w) || w) : keyOf(w); } catch (_) { return keyOf(w); } };
    var mine = meaningsOf(bank, row.word, [row.def]);
    var add = function (word, pos, from) {
      if (out.length >= WRONG) return;
      var k = keyOf(word), file = '';
      if (!k || k === row.key || isGroupWord(word) || base(word) === base(row.word) || sameFamily(row.word, word, bank) || out.some(function (c) { return c.key === k; })) return;
      try { file = pics.has(word) ? String(pics.file(word) || '') : ''; } catch (_) { file = ''; }
      if (!file || files.indexOf(file) >= 0) return;
      var theirs = meaningsOf(bank, word, []);
      if (theirs.some(function (d) { return hasWord(d, row.word) || mine.some(function (m) { return closeMeaning(m, d); }); })) return;
      if (mine.some(function (m) { return hasWord(m, word); })) return;
      files.push(file);
      out.push({ word: line(word, 60), key: k, picture: file, from: from });
    };
    var same = function (o) { return row.pos && o.pos === row.pos ? 0 : 1; };
    mixed(rows.filter(function (o) { return o !== row && o.picture; }), 'picture|' + row.key).map(function (o, i) { return { o: o, i: i }; })
      .sort(function (x, y) { return same(x.o) - same(y.o) || x.i - y.i; })
      .forEach(function (p) { add(p.o.word, p.o.pos, 'list'); });
    (row.sense && Array.isArray(row.sense.distractors) ? row.sense.distractors : []).forEach(function (id) {
      var s = senseById(bank, id);
      if (s && line(s.word)) add(line(s.word, 60), s.pos, 'bank');
    });
    return out;
  }
  // How many words of a list have a picture, and whether picture questions can be offered.
  function pictureCount(rows) {
    var n = (rows || []).filter(function (r) { return !!r.picture; }).length;
    return { withPicture: n, offered: n >= MIN_PICTURES, need: MIN_PICTURES };
  }
  // The next candidate for wrong answer i of a row: the first in the pool that is not on screen now, after the one
  // there (it cycles). For Fill the blank pass kind 'blank'. Returns the new candidate, or null when there is none.
  function swap(row, i, kind) {
    if (kind === 'blank') {
      var words = row.blank.pool, nowB = row.blank.wrong;
      if (!words.length) return null;
      var atB = words.indexOf(nowB[i]);
      for (var s = 1; s <= words.length; s++) {
        var w = words[(atB + s + words.length) % words.length];
        if (nowB.indexOf(w) < 0 && keyOf(w) !== row.key) return w;
      }
      return null;
    }
    var pool = row.pool, now = row.wrong;
    if (!pool.length) return null;
    var at = -1;
    pool.forEach(function (c, k) { if (now[i] && keyOf(c.word) === keyOf(now[i].word)) at = k; });
    for (var t = 1; t <= pool.length; t++) {
      var c = pool[(at + t + pool.length) % pool.length];
      if (!now.some(function (x) { return keyOf(x.word) === keyOf(c.word); })) return c;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // The questions, the lesson and the file
  // ---------------------------------------------------------------------------
  // Why a row cannot give a question of this kind ('' when it can).
  function rowStop(row, type) {
    // A picture question needs the word's picture and 3 others, not a meaning.
    if (type === 'picture' || type === 'picword') {
      if (row.pictureOff) return 'You left it out of the picture questions.';
      if (row.group) return 'It is a word for a group of things, so more than one picture could show it.';
      if (!row.picture) return 'The picture set has no picture for it.';
      if ((row.pictureWrong || []).length < WRONG) return 'It needs 3 other words with a picture. Add more words that have one.';
      return '';
    }
    if (!row.def) return row.inBank ? 'It has no meaning.' : 'Type a meaning for it.';
    if (row.wrong.length < WRONG) return 'It needs 3 wrong answers. Add more words to the list, so their meanings can be used.';
    if (type === 'blank') {
      if (row.blank.why) return row.blank.why;
      if (row.blank.wrong.length < WRONG) return 'It needs 3 other words from your list.';
    }
    return '';
  }
  // The questions a set of rows and types makes: { items: { meaning: [...], word: [...], blank: [...] }, left: [{ word, type, why }] }
  function questions(rows, types) {
    var out = { items: {}, left: [] };
    TYPES.forEach(function (t) {
      if ((types || []).indexOf(t.id) < 0) return;
      out.items[t.id] = [];
      rows.forEach(function (row) {
        var why = rowStop(row, t.id);
        if (why) { out.left.push({ word: row.word, type: t.id, why: why }); return; }
        if (t.id === 'meaning') out.items[t.id].push({ row: row, ask: row.word, answer: row.def, wrong: row.wrong.map(function (c) { return c.def; }) });
        else if (t.id === 'word') { var wq = row.wordAsk || wordQuestion(row, null); out.items[t.id].push({ row: row, ask: row.def, answer: wq.answer, wrong: wq.wrong.slice() }); }
        else if (t.id === 'blank') out.items[t.id].push({ row: row, ask: row.blank.ask, answer: row.blank.answer || row.word, wrong: row.blank.wrong.slice() });
        else out.items[t.id].push({ row: row, ask: row.word, answer: row.word, wrong: row.pictureWrong.map(function (c) { return c.word; }) });
      });
    });
    return out;
  }
  // The words a file would play a recording for (in lower case): the word asked in Word to meaning and Word to
  // picture, and every word that is a choice.
  function wordsToHear(rows, types) {
    var q = questions(rows, types), out = [];
    var add = function (w) { var k = keyOf(w); if (k && out.indexOf(k) < 0) out.push(k); };
    Object.keys(q.items).forEach(function (id) {
      q.items[id].forEach(function (item) {
        if (id === 'meaning' || id === 'picture') add(item.row.word);
        if (id === 'word' || id === 'blank' || id === 'picword') { add(item.answer); item.wrong.forEach(add); }
      });
    });
    return out;
  }
  // Word choices that differ only in a first capital give the answer away: a list typed "Habitat, Prey" has "Habitat"
  // beside the word list's "lot" and "park". When the first letters are mixed, or the blank opens the sentence (force),
  // every choice starts with a capital. Nothing is made lower case, so a name keeps its capital. 2026-11-13.
  function alike(list, force) {
    var upper = function (w) { return w.charAt(0) !== w.charAt(0).toLowerCase(); };
    var caps = list.filter(upper).length;
    if (!force && (caps === 0 || caps === list.length)) return list;
    return list.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
  }
  var EXACT = { soundAnswerMatches: function (given, answer) { return String(given) === String(answer); } };
  // The sample question a check opens with (2026-11-13), as a math check has one: shown first, with right or wrong, never
  // scored. Easy everyday words; the first sample of the kind that shares no word with the list is used (a list word,
  // or a form of one, would be met before it is asked), and none when both do.
  var SAMPLES = {
    word: [{ ask: 'A seat for one person, with a back and four legs', answer: 'chair', wrong: ['cloud', 'spoon', 'river'] },
      { ask: 'A round fruit that grows on trees', answer: 'apple', wrong: ['shoe', 'pencil', 'cloud'] }],
    meaning: [{ ask: 'apple', answer: 'A round fruit that grows on trees', wrong: ['A tool that cuts paper and cloth', 'A room in a house where people sleep', 'A big bird that cannot fly'] },
      { ask: 'chair', answer: 'A seat for one person, with a back and four legs', wrong: ['A long, thin tool for writing', 'Water that falls from clouds', 'A small animal with long ears'] }],
    blank: [{ ask: 'The ___ barked at the cat.', answer: 'dog', wrong: ['spoon', 'cloud', 'pencil'] },
      { ask: 'I drink milk from a ___.', answer: 'cup', wrong: ['tree', 'shoe', 'road'] }],
    picture: [{ ask: 'dog', answer: 'dog', wrong: ['cup', 'sun', 'tree'] }, { ask: 'cat', answer: 'cat', wrong: ['ball', 'hat', 'fish'] }],
  };
  SAMPLES.picword = SAMPLES.picture;
  function sampleFor(id, rows, bank, imageOf) {
    var listed = function (token) {
      return (rows || []).some(function (r) {
        // The token is a form of the list word (chair, chairs), or the list word a form of it (chairs, chair).
        return [r.key, keyOf(r.base || r.word)].some(function (b) { return formOf(token, b, r.pos) != null || formOf(token, b, '') != null || formOf(b, token, '') != null || headOf(bank, token) === b; });
      });
    };
    var found = (own(SAMPLES, id) ? SAMPLES[id] : []).filter(function (s) {
      var words = contentWords([s.ask, s.answer].concat(s.wrong).join(' '));
      if (words.some(listed)) return false;
      return typeOf(id).pictures ? [s.answer].concat(s.wrong).every(function (w) { return !!imageOf(w); }) : true;
    })[0];
    if (!found) return null;
    var word = id === 'meaning' || typeOf(id).pictures ? found.ask : found.answer;
    return { sample: true, row: { key: 'sample', word: word, senseId: 'sample' }, ask: found.ask, answer: found.answer, wrong: found.wrong.slice() };
  }

  // The lesson. lessonFromVocab({ loader, rows, types: ['meaning', 'word'], mode: 'practice' | 'check', title, readAloud })
  // Practice: feedback on every question, two tries, no clock. Check: one try, no feedback, a score (items correct),
  // no clock; the answers are sealed by the loader. The order of the questions and of each question's choices is a
  // fixed mix of the content, so the same choices make the same file.
  function lessonFromVocab(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || !loader.CHECK_ADAPTERS || !TYPES.every(function (t) { return loader.CHECK_ADAPTERS[t.activity]; })) throw new Error('lessonFromVocab needs loader (AlloWordSoundsTakeHome, with the vocabulary activities)');
    var rows = Array.isArray(o.rows) ? o.rows : [];
    var types = TYPES.map(function (t) { return t.id; }).filter(function (id) { return (o.types || []).indexOf(id) >= 0; });
    if (!types.length) throw new Error('Choose at least one kind of question.');
    var check = o.mode === 'check';
    var q = questions(rows, types);
    var read = o.readAloud !== false;
    var blocks = [], titles = {};
    var all = rows.map(function (r) { return r.key; }).join(',');
    // Recordings made ahead of time (o.clips: word in lower case -> data:audio address, the word store's clip as WAV):
    // played for the word itself, only with Read aloud on and o.voices not false. The device voice reads the rest.
    var clips = read && o.voices !== false && isObject(o.clips) ? o.clips : {};
    var audio = {}, images = {}, recorded = [], pictured = {};
    var clipOf = function (word) {
      var k = keyOf(word), uri = own(clips, k) && typeof clips[k] === 'string' && /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3)[;,]/i.test(clips[k]) ? clips[k] : '';
      if (!uri) return null;
      var cid = 'w' + fnv('clip|' + k);
      if (!audio[cid]) { audio[cid] = uri; recorded.push(line(word, 60)); }
      return cid;
    };
    // Pictures (o.pictures: the Word Sounds picture set, its drawings added; o.art: word_sounds_packet_builder.js, whose
    // svgRefusal tests each drawing again as it goes into the file). A picture id says nothing about its word.
    var pics = o.pictures && typeof o.pictures.get === 'function' ? o.pictures : null, art = o.art && typeof o.art.svgRefusal === 'function' ? o.art : null;
    var imageOf = function (word) {
      var got = null;
      try { got = pics && art ? pics.get(word) : null; } catch (_) { got = null; }
      if (!got || typeof got.svg !== 'string' || art.svgRefusal(got.svg)) return null;
      var iid = 'p' + fnv('picture|' + String(got.file || keyOf(word)));
      if (!images[iid]) images[iid] = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(got.svg)));
      if (!own(pictured, keyOf(word))) pictured[keyOf(word)] = { word: line(word, 60), set: got.set === 'openmoji' ? 'openmoji' : 'mulberry' };
      return iid;
    };
    // The order of the kinds (2026-11-13): with Word to meaning and Meaning to word both on, Meaning to word comes first.
    // Its choices are words, so every meaning is asked before it is ever shown as a choice; Word to meaning then shows the
    // meanings as choices, each one already asked. Word to meaning keeps the words in the order Meaning to word asked them,
    // so a word's two questions are always a whole round apart, never side by side. The other kinds follow, as before.
    var order = types.slice();
    if (order.indexOf('meaning') >= 0 && order.indexOf('word') >= 0) { order.splice(order.indexOf('word'), 1); order.splice(order.indexOf('meaning'), 0, 'word'); }
    var asked = {};
    order.forEach(function (id) {
      var t = typeOf(id), adapter = loader.CHECK_ADAPTERS[t.activity];
      var list = mixed(q.items[id], 'order|' + id + '|' + all);
      if (id === 'meaning' && asked.word) list = list.map(function (item, i) { return { item: item, at: own(asked.word, item.row.key) ? asked.word[item.row.key] : 1e6 + i }; })
        .sort(function (x, y) { return x.at - y.at; }).map(function (p) { return p.item; });
      if (t.pictures) list = list.filter(function (item) {
        var ok = !!imageOf(item.answer) && item.wrong.every(function (w) { return !!imageOf(w); });
        if (!ok) q.left.push({ word: item.row.word, type: id, why: 'A picture could not be used.' });
        return ok;
      });
      if (!list.length) return;
      asked[id] = {};
      list.forEach(function (item, i) { asked[id][item.row.key] = i; });
      // A check opens with one sample question, not scored (as a math check does): see sampleFor.
      var sample = check && !blocks.length ? sampleFor(id, rows, o.bank, imageOf) : null;
      var made = (sample ? [sample] : []).concat(list).map(function (item, at) {
        var i = sample ? at - 1 : at;
        var choices = mixed([item.answer].concat(item.wrong), 'choices|' + id + '|' + item.row.key + '|' + item.ask + '|' + item.wrong.join('|'));
        var n = (i < 9 ? '0' : '') + (i + 1);
        // The sense id travels in the item id, except where it would name the answer in a check (the word is the answer there).
        var itemId = item.sample ? t.activity + '-p0' : t.activity + '-' + n + (!check || id === 'meaning' ? '@' + item.row.senseId : '');
        // Word choices look alike: see alike(). The recordings and pictures are still found by the word itself.
        var shown = id === 'word' || id === 'blank' || id === 'picword' ? alike(choices, id === 'blank' && /^_{2,}/.test(item.ask)) : choices;
        var raw = { id: itemId.slice(0, 80), word: check && id !== 'meaning' ? item.ask.slice(0, 120) : item.row.word, ask: item.ask, choices: shown, answer: shown[choices.indexOf(item.answer)], read: read, lang: 'en' };
        if (id === 'meaning') { var heard = clipOf(item.row.word); if (heard) raw.askAudio = heard; }
        if (id === 'word' || id === 'blank') { var voiced = choices.map(clipOf); if (voiced.some(Boolean)) raw.choiceAudio = voiced; }
        if (id === 'picture') {
          raw.word = item.row.word;
          raw.choices = choices.map(function (w) { return { text: w, image: imageOf(w) }; });
          var named = clipOf(item.row.word); if (named) raw.askAudio = named;
        }
        if (id === 'picword') {
          raw.word = check ? (item.sample ? 'Sample picture' : 'Picture ' + (i + 1)) : item.row.word;
          raw.ask = 'picture';
          raw.image = imageOf(item.row.word);
          raw.choices = choices.map(function (w, k) { var c = { text: shown[k] }, clip = clipOf(w); if (clip) c.audio = clip; return c; });
        }
        if (item.sample) raw.practice = true;
        var prepared = adapter.prepare(raw);
        if (!prepared || !prepared.item) throw new Error('The question for "' + item.row.word + '" (' + t.name + ') cannot be used: ' + (prepared && prepared.missing ? prepared.missing.join(', ') : 'no reason given') + '.');
        // A check keeps the raw item: the loader prepares and seals it (its answer is scrambled there).
        return check ? raw : Object.assign({ id: raw.id }, prepared.item, { target: prepared.item.answer });
      });
      blocks.push({ activity: t.activity, items: made });
      titles[t.activity] = adapter.title;
    });
    if (!blocks.length) throw new Error('No question can be made from this list yet.' + (q.left.length ? ' ' + q.left[0].word + ': ' + q.left[0].why : ''));
    var named = rows.map(function (r) { return r.word; });
    var lead = named.slice(0, 3).join(', ') + (named.length > 3 ? ' and ' + (named.length - 3) + ' more' : '');
    var title = line(o.title, 120) || ((check ? 'Vocabulary check: ' : 'Vocabulary practice: ') + lead).slice(0, 120);
    var content = JSON.stringify([types, check, read, rows.map(function (r) { return [r.senseId, r.def]; }), blocks]);
    var lesson = { schema: LESSON_SCHEMA, player: PLAYER, lessonId: 'vocab-' + fnv(content) + (check ? '-check' : '-practice'), revision: '', language: 'en', title: title, showLetters: false,
      mode: check ? 'probe' : 'practice', activityTitles: titles, blocks: blocks, feedback: { correct: [], retry: null }, audio: audio, images: images, submit: null };
    if (check) { lesson.form = 'custom'; lesson.timeLimitS = null; lesson.check = Object.assign({}, MEASURE); }
    lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.form || '', lesson.check || null, lesson.blocks]));
    // What the file's credits name (buildVocabPacket): the words with a recording, and the words whose picture is used, by set.
    MEDIA.set(lesson, { recorded: recorded, pictured: Object.keys(pictured).map(function (k) { return pictured[k]; }), art: art, left: q.left });
    return lesson;
  }

  // The credits a file carries ("About this file", and the manifest): each source of the bank's text with its license
  // and the address of the license deed (written without "https://", so the file holds no web address), and a plain
  // line that the teacher may have changed the meanings. Nothing here says that a person reviewed a meaning.
  function bare(address) { return line(address, 200).replace(/^https?:\/\//i, '').replace(/^\/\//, ''); }
  function creditLines(bank, rows) {
    var fromBank = (rows || []).some(function (r) { return r.inBank || (r.wrong || []).some(function (c) { return c.from === 'bank'; }); });
    var out = [];
    if (fromBank) (bank && Array.isArray(bank.credits) ? bank.credits : []).forEach(function (c) {
      if (!isObject(c) || !line(c.set)) return;
      out.push('Word meanings and related words from ' + line(c.set, 120) + (line(c.author) ? ', by ' + line(c.author, 120) : '') + (line(c.license) ? ', license ' + line(c.license, 40) : '')
        + (bare(c.deed) ? ' (' + bare(c.deed) + ')' : '') + (bare(c.url) ? '. Source: ' + bare(c.url) : '') + '.');
    });
    if (out.length) out.push('The meanings were shortened and cleaned up by a program when the word list was prepared. The teacher who made this file may have changed some of them.');
    // How the meanings were checked, as the word list itself says (bank.checking: "Checked and corrected with AI assistance
    // ... Not reviewed by a person."), so the file says it the way it says where its voice came from. Only the words of this
    // file that the word list marks checked and the teacher did not change are named. 2026-11-13 (teacher-journey R1).
    var listRows = (rows || []).filter(function (r) { return r.inBank && !r.own; });
    var checking = bank && typeof bank.checking === 'string' ? bank.checking : '';
    if (listRows.length && /\bAI\b/.test(checking) && /not reviewed by a person/i.test(checking)) {
      var aiChecked = listRows.filter(function (r) { return r.checked && !r.edited; }).map(function (r) { return r.word; });
      out.push(aiChecked.length ? 'Meanings checked and corrected with AI help when the word list was prepared: ' + aiChecked.join(', ') + '. No person has read each one.'
        + (aiChecked.length < listRows.length ? ' The other meanings from the word list were not checked.' : '')
        : 'The meanings from the word list in this file have not been checked.');
    }
    if ((rows || []).some(function (r) { return r.own && r.def && !r.net; })) out.push('Meanings written by the teacher: ' + rows.filter(function (r) { return r.own && r.def && !r.net; }).map(function (r) { return r.word; }).join(', ') + '.');
    // Meanings the teacher found online (packets-vocab-lookup.html) and used as found.
    var found = (rows || []).filter(function (r) { return r.own && r.def && r.net; });
    if (found.length) out.push('Meanings found on the internet and not checked: ' + found.map(function (r) { return r.word; }).join(', ') + ' (from '
      + (found[0].net.source || 'Wiktionary, through the Free Dictionary API (dictionaryapi.dev)') + (found[0].net.license ? ', license ' + found[0].net.license : '') + ').');
    if (fromBank && (bank && Array.isArray(bank.credits) ? bank.credits : []).some(function (c) { return /\bSA\b/.test(text(c.license)); })) {
      out.push('The word meanings in this file may be shared and changed under the same share-alike license. That license covers the word meanings, not the program in this file.');
    }
    return out;
  }
  function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  // More fields in the manifest block of a finished file. That block is data, not script: the script hash holds
  // (as withCredits in word_sounds_packet_builder.js).
  function withManifest(html, extra) {
    var open = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(open);
    if (at < 0) return html;
    var from = at + open.length, to = html.indexOf('</script>', from);
    var manifest;
    try { manifest = JSON.parse(html.slice(from, to)); } catch (_) { return html; }
    Object.keys(extra).forEach(function (k) { manifest[k] = extra[k]; });
    return html.slice(0, from) + safeJson(manifest) + html.slice(to);
  }
  // A student's code name, as a file may carry it (the same rule as word_sounds_packet_builder.js codeName).
  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try { return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim(); } catch (_) { return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40); }
  }
  function withCodeName(html, name) { var clean = codeName(name); return clean ? withManifest(html, { learner: clean }) : html; }

  // The file. buildVocabPacket({ lesson, loader, rows, bank, teacherCode, learner, readAloud }) -> { html, manifest, sha256 }
  function buildVocabPacket(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || typeof loader.buildHtml !== 'function' || typeof loader.sha256 !== 'function') throw new Error('buildVocabPacket needs loader (AlloWordSoundsTakeHome)');
    var lesson = o.lesson;
    if (!lesson || !Array.isArray(lesson.blocks) || !lesson.blocks.length || !lesson.blocks.every(function (b) { return !!typeOf(b.activity); })) throw new Error('buildVocabPacket needs a lesson from lessonFromVocab');
    var check = lesson.mode === 'probe';
    var code = text(o.teacherCode).trim();
    if (code && code.length < 4) throw new Error('The teacher code needs 4 or more characters.');
    if (code.length > 64) throw new Error('The teacher code can have 64 characters at most.');
    var first = loader.CHECK_ADAPTERS[lesson.blocks[0].activity];
    var labels = {
      intro: lesson.blocks.length > 1 ? 'Read each question. Choose the right answer.' : first.labels[lesson.blocks[0].activity + '_intro'],
      about_never: 'It never uses the microphone or the camera. It has no cookies and runs no AI. Read aloud uses the voice that is built into this device, and only a voice that runs on the device.',
    };
    var rows = Array.isArray(o.rows) ? o.rows : [];
    var credits = creditLines(o.bank, rows);
    var media = MEDIA.get(lesson) || { recorded: [], pictured: [], art: null };
    var notices = [];
    // Each picture set is credited, and its notice carried, only when one of its pictures is in the file (as in a Word Sounds file).
    var art = media.art;
    if (art && media.pictured.length) {
      var om = media.pictured.filter(function (p) { return p.set === 'openmoji'; }).map(function (p) { return p.word; });
      var mb = media.pictured.filter(function (p) { return p.set !== 'openmoji'; }).map(function (p) { return p.word; });
      if (mb.length) { credits.push(om.length ? art.pictureCredit(mb) : art.pictureCredit()); notices.push({ id: 'mulberry', name: art.MULBERRY_CREDIT.set, text: om.length ? art.mulberryNotice(mb) : art.MULBERRY_NOTICE }); }
      if (om.length) { credits.push(art.openMojiCredit(om)); notices.push({ id: 'openmoji', name: art.OPENMOJI_CREDIT.set, text: art.openMojiNotice(om, '') }); }
    }
    if (media.recorded.length) {
      credits.push('Recordings of ' + media.recorded.join(', ') + ': made ahead of time with Kokoro-82M text-to-speech (voice af_heart), a machine voice. They passed automatic checks; no person has listened to each one.');
      labels.about_never = 'It never uses the microphone or the camera. It has no cookies and runs no AI. Read aloud plays a recording made ahead of time for some words. For the rest it uses the voice that is built into this device, and only a voice that runs on the device.';
    }
    var html = loader.buildHtml(JSON.parse(JSON.stringify(lesson)), { core: check ? undefined : EXACT, teacherCode: check ? code || null : undefined, labels: labels, attributions: credits });
    var read = lesson.blocks.some(function (b) { return b.items.some(function (it) { return it.read === true; }); });
    // The kinds in the page's order (the file may ask them in another: see lessonFromVocab).
    var made = lesson.blocks.map(function (b) { return typeOf(b.activity).id; });
    var recipe = { builder: VERSION, types: TYPES.map(function (t) { return t.id; }).filter(function (id) { return made.indexOf(id) >= 0; }), mode: check ? 'check' : 'practice', readAloud: read,
      words: rows.map(function (r) { return { word: r.word, sense: r.senseId }; }) };
    if (media.recorded.length) recipe.recordings = media.recorded.length;
    if (o.voices === false) recipe.voices = false;
    var noPicture = rows.filter(function (r) { return r.pictureOff; }).map(function (r) { return r.word; });
    if (noPicture.length) recipe.noPicture = noPicture;
    // A practice file holds its answers anyway, so it also keeps what the teacher chose and changed, for "Open a file I made".
    if (!check) recipe.rows = rows.map(function (r) { return { word: r.word, sense: r.senseId, def: r.def, example: r.example, pos: r.pos || '', own: !!r.own, wrong: r.wrong.map(function (c) { return { id: c.id || '', word: c.word, def: c.def, from: c.from || '' }; }), blank: r.blank ? r.blank.wrong.slice() : [] }; });
    var speech = read ? { engine: 'speechSynthesis', when: 'only when the student presses Read aloud, Hear it or Hear all, or turns on Read the choices in the reading tools', voices: 'a voice that runs on this device (localService); none that needs the internet', sends: 'nothing' }
      : { engine: 'none', note: 'Read aloud is off in this file.' };
    if (read && media.recorded.length) speech.recordings = { words: media.recorded.length, made: 'ahead of time, Kokoro-82M text-to-speech (voice af_heart), a machine voice', humanReviewed: false };
    var extra = { vocab: recipe, speech: speech };
    if (notices.length) extra.notices = notices;
    html = withManifest(html, extra);
    if (o.learner) html = withCodeName(html, o.learner);
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return { html: html, manifest: block ? JSON.parse(block[1]) : null, sha256: loader.sha256(html).hex, lesson: lesson };
  }

  // "Open a file I made": what a file says about how it was made, from its manifest (read by
  // packets_verify_core.js readParts; nothing in the file is run). { ok, why, title, mode, types, readAloud, learner,
  // words: [word], senses: { key: senseId }, rows: [...] (a practice file only), teacherCode }
  function readBack(parts) {
    var p = parts || {}, m = isObject(p.manifest) ? p.manifest : {}, v = isObject(m.vocab) ? m.vocab : null, lesson = isObject(p.lesson) ? p.lesson : {};
    var out = { ok: false, why: '', title: '', mode: 'practice', types: [], readAloud: true, voices: true, noPicture: [], learner: '', words: [], senses: {}, rows: [], teacherCode: false };
    if (!v) { out.why = 'This file was not made on this page.'; return out; }
    out.ok = true;
    out.title = line(m.title || lesson.title, 120);
    out.mode = v.mode === 'check' ? 'check' : 'practice';
    out.types = (Array.isArray(v.types) ? v.types : []).filter(function (id) { return !!typeOf(id); });
    out.readAloud = v.readAloud !== false;
    out.voices = v.voices !== false;
    out.noPicture = (Array.isArray(v.noPicture) ? v.noPicture : []).map(normalizeWord).filter(Boolean).slice(0, MAX_WORDS);
    out.learner = codeName(m.learner);
    out.teacherCode = isObject(lesson.check) && isObject(lesson.check.lock);
    (Array.isArray(v.words) ? v.words : []).slice(0, MAX_WORDS).forEach(function (w) {
      var word = isObject(w) ? normalizeWord(w.word) : '';
      if (!word) return;
      out.words.push(word);
      if (typeof w.sense === 'string' && w.sense.length <= 80) out.senses[keyOf(word)] = w.sense;
    });
    out.rows = (Array.isArray(v.rows) ? v.rows : []).slice(0, MAX_WORDS).filter(isObject).map(function (r) {
      return { word: normalizeWord(r.word), sense: line(r.sense, 80), def: line(r.def), example: line(r.example), pos: line(r.pos, 20), own: r.own === true,
        wrong: (Array.isArray(r.wrong) ? r.wrong : []).filter(isObject).slice(0, WRONG).map(function (c) { return { id: line(c.id, 80), word: line(c.word, 60), def: line(c.def), from: line(c.from, 10) }; }),
        blank: (Array.isArray(r.blank) ? r.blank : []).map(normalizeWord).filter(Boolean).slice(0, WRONG) };
    }).filter(function (r) { return r.word; });
    return out;
  }

  var api = { VERSION: VERSION, MAX_WORDS: MAX_WORDS, WRONG: WRONG, TYPES: TYPES.map(function (t) { return Object.assign({}, t); }), MEASURE: Object.assign({}, MEASURE),
    normalizeWord: normalizeWord, keyOf: keyOf, parseWords: parseWords, closeMeaning: closeMeaning, contentWords: contentWords, flat: flat, wrongProblem: wrongProblem,
    balancedTrio: balancedTrio, blankSentence: blankSentence, formOf: formOf, inflect: inflect, draftRows: draftRows, swap: swap, rowStop: rowStop, questions: questions,
    lessonFromVocab: lessonFromVocab, creditLines: creditLines, MIN_PICTURES: MIN_PICTURES, pictureCount: pictureCount, pictureWrong: pictureWrong, wordsToHear: wordsToHear, buildVocabPacket: buildVocabPacket, withCodeName: withCodeName, codeName: codeName, readBack: readBack, mixed: mixed };
  root.AlloPacketVocab = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
