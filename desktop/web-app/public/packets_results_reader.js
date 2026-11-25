// Reads the results files that practice files and checks save, and adds them up.
// One plain script for a browser page (window.AlloPacketResults) and for node (module.exports).
// It has no imports and calls nothing on the network: it is handed a file's TEXT and returns plain
// objects. It keeps nothing.
//
// It reads the two files a practice file or a check saves (packetCsv in
// word_sounds_take_home_loader.js): the CSV "alloflow-packet-result/1" and the take-home JSON
// (schemaVersion 1 to 3). The reading rules are the ones the dashboard's importer uses
// (student_analytics_module.js, TAKE-HOME RESULTS IMPORT). tests/packets_results_page.test.js runs
// both on the same files and compares what they return, so change the two together.
// Nothing from a file is ever run, and nothing here builds markup: callers show text as text.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-packet-results-reader/1';
  var FORMAT = 'alloflow-packet-result/1';
  var RESULT_KIND = 'alloflow-take-home-result';
  var BUNDLE_KIND = 'alloflow-packet-results-bundle';
  var BUNDLE_VERSION = 1;
  var MAX_BYTES = 2 * 1024 * 1024;   // one file
  var MAX_FILES = 500;               // one drop
  var MAX_ITEMS = 600;               // one result
  var MAX_SESSIONS = 5000;           // one page
  // 2026-11-23, the note "same_answer" on a check (Aaron's rule, a note only: the score is as counted). At least SAME_MIN
  // answers given, at least SAME_SHARE of them the same answer, and at least half of those not right (so a check whose right
  // answers are often the same, as with four ink colors, gets no note when the child was right).
  var SAME_MIN = 8, SAME_SHARE = 0.8;
  var MIN_GROUP = 5;                 // learners needed before a "middle of this group" is shown
  var MIN_GROUP_HALF = 10;           // learners needed before its "middle half" is shown too (from 5 it moves with one learner)
  var NO_NAME = 'No name typed';
  var COLUMNS = ['format', 'session_id', 'packet_id', 'packet_version', 'form', 'mode', 'learner', 'started_local', 'finished_local', 'duration_s',
    'item_n', 'item_id', 'activity', 'activity_title', 'scored', 'word', 'target', 'responses', 'correct', 'first_try', 'tries', 'time_ms', 'supports', 'flag'];
  // A check (mode "check"; files saved before 2026-11-12 say "probe") has two more cells in every item row, after "flag".
  var PROBE_COLUMNS = ['digits_correct', 'digits_possible'];
  // Both file values are a check. Inside this reader (and in what it keeps on the device) a check is mode 'probe'.
  function isCheckMode(value) { return value === 'check' || value === 'probe'; }
  // 2026-11-13: four columns appended (append only: every earlier column keeps its place and its meaning).
  // accuracy_pct stays correct / items given (unreached items count); accuracy_of_attempted_pct is correct / items
  // attempted, the one to read for a timed check. active_s is the time on the items, when the file has it.
  var SUMMARY_COLUMNS = ['learner', 'date', 'measure', 'form', 'score', 'score_unit', 'accuracy_pct', 'first_try_pct', 'items_given', 'items_attempted',
    'duration_s', 'flags', 'session_id', 'packet_id', 'packet_version', 'integrity', 'source_file', 'title', 'measure_name', 'accuracy_of_attempted_pct', 'active_s'];
  // Activity -> skill strand, with the English names. A copy of SKILL_STRANDS and ACTIVITY_SKILLS in
  // word_sounds_core.js (and of _AC_WS_STRANDS / _AC_WS_ACTIVITIES in the dashboard), which this page
  // does not load. tests/packets_results_page.test.js fails when the copies differ.
  var STRANDS = [
    ['syllables_rhyme', 'Syllables and rhyme'],
    ['hearing_sounds', 'Hearing sounds'],
    ['letters_sounds', 'Letters and sounds'],
    ['spelling', 'Spelling'],
    ['reading_words', 'Reading words'],
    ['reading_sentences', 'Reading sentences'],
  ];
  var OTHER_STRAND = ['other', 'Other activities'];
  var ACTIVITIES = {
    rhyming: ['Rhyme Time', 'syllables_rhyme'],
    syllable_counting: ['Syllable Claps', 'syllables_rhyme'],
    syllable_blending: ['Syllable Blending', 'syllables_rhyme'],
    word_families: ['Word Families', 'syllables_rhyme'],
    isolation: ['Find Sounds', 'hearing_sounds'],
    sound_sort: ['Sound Sort', 'hearing_sounds'],
    blending: ['Blend Sounds', 'hearing_sounds'],
    segmentation: ['Break it Down', 'hearing_sounds'],
    counting: ['Sound Counting', 'hearing_sounds'],
    manipulation: ['Sound Swap', 'hearing_sounds'],
    mapping: ['Sound Mapping', 'letters_sounds'],
    letter_tracing: ['Letter Trace', 'letters_sounds'],
    missing_letter: ['Missing Letter', 'spelling'],
    orthography: ['Sight & Spell', 'spelling'],
    word_scramble: ['Word Scramble', 'spelling'],
    spelling_bee: ['Spelling Bee', 'spelling'],
    decoding: ['Read & Match', 'reading_words'],
    read_sentence: ['Finish the Sentence', 'reading_sentences'],
    sentence_match: ['Picture the Sentence', 'reading_sentences'],
    read_passage: ['Read the Story', 'reading_sentences'],
  };
  // Math fact PRACTICE (packet_math_practice_builder.js), a group of its own. Not a Word Sounds
  // strand, so it is not in the two copies above; never a check. A copy of _AC_MATH_FACT_STRANDS /
  // _AC_MATH_FACT_ACTIVITIES in the dashboard: tests/packets_results_page.test.js compares them.
  var MATH_STRANDS = [['math_facts', 'Math facts']];
  var MATH_ACTIVITIES = {
    math_ccc: ['Cover, copy, compare', 'math_facts'],
    math_rehearsal: ['Fact rehearsal', 'math_facts'],
  };
  // Vocabulary questions (packet_vocab_builder.js, 2026-11-12), a group of their own like the math facts. A copy of
  // _AC_VOCAB_STRANDS / _AC_VOCAB_ACTIVITIES in the dashboard: tests/packet_vocab_adapter.test.js compares them.
  // A vocabulary check is a check here (its score is the number right); VOCAB_MEASURES names it.
  var VOCAB_STRANDS = [['vocabulary', 'Vocabulary']];
  var VOCAB_ACTIVITIES = {
    vocab_meaning: ['Word to meaning', 'vocabulary'],
    vocab_word: ['Meaning to word', 'vocabulary'],
    vocab_blank: ['Fill the blank', 'vocabulary'],
    vocab_picture: ['Word to picture', 'vocabulary'],
    vocab_picture_word: ['Picture to word', 'vocabulary'],
  };
  var VOCAB_MEASURES = { vocab_items: 'Vocabulary check' };
  var SYMBOL_MEASURES = { symbol_naming: 'Symbol naming check' };
  var SYMBOL_STRANDS = [['symbol_naming', 'Symbol naming']];
  var SYMBOL_ACTIVITIES = {
    symbol_runner: ['Symbol runner', 'symbol_naming'],
  };
  var READ_ALONG_STRANDS = [['read_along', 'Read along']];
  var READ_ALONG_ACTIVITIES = {
    read_along: ['Read along', 'read_along'],
  };
  var EXTENDED_ACTIVITIES = {
    concept_sort: ['Concept Sort', OTHER_STRAND[0]],
    sequence_order: ['Sequencing & Timeline', OTHER_STRAND[0]],
    tiered_writing: ['Tiered Writing', OTHER_STRAND[0]],
    choice_board: ['UDL Choice Board', OTHER_STRAND[0]],
    maze_reading: ['Maze Reading', OTHER_STRAND[0]],
    manip_base_ten: ['Base-10 Blocks', OTHER_STRAND[0]],
    manip_fraction_bars: ['Fraction Bars', OTHER_STRAND[0]],
    manip_number_line: ['Number Line', OTHER_STRAND[0]],
    manip_balance_scale: ['Balance Scale', OTHER_STRAND[0]],
    stem_circuit: ['Circuit Lab', OTHER_STRAND[0]],
    stem_data_explorer: ['Data Explorer Lab', OTHER_STRAND[0]],
    stem_geometry_grid: ['Geometry Grid Lab', OTHER_STRAND[0]],
    life_money: ['Making Change & Budgeting', OTHER_STRAND[0]],
    life_transit: ['Transit & Schedules', OTHER_STRAND[0]],
    life_kitchen: ['Kitchen & Home Routines', OTHER_STRAND[0]],
    life_laundry: ['Laundry & Care Sorting', OTHER_STRAND[0]],
    life_signs: ['Community & Emergency Signs', OTHER_STRAND[0]],
    aac_board: ['AAC Communication Board', OTHER_STRAND[0]],
    sel_first_then: ['First-Then & Checklist', OTHER_STRAND[0]],
    sel_focus_timer: ['Visual Focus Timer', OTHER_STRAND[0]],
    sel_calm_toolkit: ['Calm-Down Strategy Cards', OTHER_STRAND[0]],
    sel_udl_reflect: ['UDL Reflection & Goal Check', OTHER_STRAND[0]],
    compiled_quiz: ['Quiz Activity', OTHER_STRAND[0]],
    compiled_cloze: ['Fill-in-the-Blank Activity', OTHER_STRAND[0]],
    branching_adventure: ['Branching Adventure', OTHER_STRAND[0]],
    anchor_study: ['Anchor Study Guide', OTHER_STRAND[0]],
    playlist_roadmap: ['Unit Roadmap', OTHER_STRAND[0]],
  };
  var EXTENDED_MEASURES = {
    maze_correct_3m: 'CBM-Maze (3 min)',
    concept_sort: 'Concept Sort check',
    sequence_order: 'Sequencing check',
    manip_base_ten: 'Base-10 Blocks check',
    manip_fraction_bars: 'Fraction Bars check',
    manip_number_line: 'Number Line check',
    manip_balance_scale: 'Balance Scale check',
    stem_circuit: 'Circuit Lab check',
    stem_data_explorer: 'Data Explorer check',
    stem_geometry_grid: 'Geometry Lab check',
    life_money: 'Money & Budgeting check',
    life_transit: 'Transit Schedule check',
    life_kitchen: 'Kitchen Routines check',
    life_laundry: 'Laundry Sorting check',
    life_signs: 'Community Signs check',
    compiled_quiz: 'Quiz check',
    compiled_cloze: 'Cloze check',
  };
  var EXTENDED_MEASURE_UNITS = {
    maze_correct_3m: 'items_correct',
  };
  // Every group a practice result is counted in, in the order they are shown.
  var GROUPS = STRANDS.concat(MATH_STRANDS, VOCAB_STRANDS, SYMBOL_STRANDS, READ_ALONG_STRANDS, [OTHER_STRAND]);
  // The check measures and their units, named as the check files name them (packet_check_builder.js
  // MEASURES, and check_unit_* in the take-home loader). The test compares these too.
  var MEASURES = { quantity_discrimination: 'Quantity Discrimination', missing_number: 'Missing Number', math_dcpm: 'Math Fluency' };
  var UNITS = { items_correct: 'items correct', digits_correct_per_minute: 'digits correct per minute' };
  // The unit each of those measures is scored in: used only when a file has lost its score line.
  var MEASURE_UNITS = { quantity_discrimination: 'items_correct', missing_number: 'items_correct', math_dcpm: 'digits_correct_per_minute' };
  var FIRST_TRY_UNIT = 'first-try percent';
  // Why a file was not counted, in plain words.
  var REASONS = {
    empty: 'This file is empty.',
    too_big: 'This file is larger than 2 MB. A results file is much smaller.',
    web_page: 'This is a web page, not a results file. It may be the practice file itself. The results file is the one a student saves at the end.',
    save_file: 'This is a save file from the AlloFlow app, not a results file from a practice file or a check.',
    not_results: 'This is not a results file from a practice file or a check.',
    newer: 'This results file was saved by a newer version than this page can read.',
    no_items: 'This results file has no answers in it.',
    nothing_done: 'Nothing was answered in this results file.',
    unreadable: 'This file could not be read.',
  };

  // ---------------------------------------------------------------------------
  // Small tools
  // ---------------------------------------------------------------------------
  function own(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }
  // Only text and numbers are read from a file; anything else reads as empty.
  function scalar(value) {
    return typeof value === 'string' ? value : typeof value === 'number' && isFinite(value) ? String(value) : '';
  }
  // One line of plain text: control characters out, spaces collapsed, clipped.
  function text(value, max) {
    var source = scalar(value).slice(0, 4000);
    var out = '';
    for (var i = 0; i < source.length; i++) { var code = source.charCodeAt(i); out += code < 32 || code === 127 ? ' ' : source.charAt(i); }
    return out.replace(/\s+/g, ' ').trim().slice(0, max || 80);
  }
  // A lower-case id made of letters, digits and underscores; never a name every object has.
  function idOf(value, max) {
    var id = text(value, max || 40).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return id && !(id in {}) ? id : '';
  }
  // A number, or null. Text that is not a number, true, false and objects are null.
  function number(value) {
    if (typeof value === 'string') { if (value.trim() === '') return null; value = Number(value); }
    return typeof value === 'number' && isFinite(value) ? value : null;
  }
  // A whole number from 0 to max, or null.
  function whole(value, max) {
    var n = number(value);
    return n === null ? null : Math.max(0, Math.min(max || 1000000, Math.round(n)));
  }
  // The leading apostrophe that guards = + - @ against a spreadsheet comes off on read.
  function unguard(cell) {
    cell = cell == null ? '' : String(cell);
    return /^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell;
  }
  function yes(value) { return /^(1|true|yes|y)$/i.test(text(value, 8)); }
  // A cell as every results file writes it (the same rules as _acCsvCell in the dashboard): always
  // quoted, " doubled, and text a spreadsheet would run as a formula gets a leading apostrophe.
  function csvCell(value) {
    var cell = value == null ? '' : String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(cell)) cell = "'" + cell;
    return '"' + cell.replace(/"/g, '""') + '"';
  }

  // CSV text to rows of cells. Reads the BOM, CRLF or LF, quoted cells with commas, line breaks and
  // doubled quotes, a "sep=" first line, and a spreadsheet's re-save that used ; or tab or dropped
  // the quotes.
  function parseCsv(source) {
    source = source == null ? '' : String(source);
    if (source.charCodeAt(0) === 0xFEFF) source = source.slice(1);
    var delimiter = '';
    var hint = /^sep=(.)\r?\n/i.exec(source);
    if (hint) { delimiter = hint[1]; source = source.slice(hint[0].length); }
    if (!delimiter) {
      var counts = { ',': 0, ';': 0, '\t': 0 };
      var inside = false;
      for (var k = 0; k < source.length && k < 20000; k++) {
        var ch = source.charAt(k);
        if (ch === '"') inside = !inside;
        else if (!inside && (ch === '\n' || ch === '\r')) break;
        else if (!inside && own(counts, ch)) counts[ch]++;
      }
      delimiter = counts[';'] > counts[','] && counts[';'] >= counts['\t'] ? ';' : counts['\t'] > counts[','] ? '\t' : ',';
    }
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    for (var i = 0; i < source.length; i++) {
      var c = source.charAt(i);
      if (quoted) {
        if (c !== '"') cell += c;
        else if (source.charAt(i + 1) === '"') { cell += '"'; i++; }
        else quoted = false;
      } else if (c === '"' && cell === '') quoted = true;
      else if (c === delimiter) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && source.charAt(i + 1) === '\n') i++;
        row.push(cell); cell = '';
        rows.push(row); row = [];
        if (rows.length >= 5000) return rows;
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return v !== ''; }); });
  }

  // The practice file's own short hash (hashText in the take-home loader), kept the same so its
  // values compare.
  function fnv1a(source) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < source.length; i++) { h ^= source.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  // SHA-256 of the UTF-8 bytes, made by the browser. '' where the browser cannot make it.
  async function sha256(source) {
    try {
      var cryptoApi = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);
      var Encoder = (typeof TextEncoder !== 'undefined' && TextEncoder) || (typeof window !== 'undefined' && window.TextEncoder);
      if (!cryptoApi || !cryptoApi.subtle || !Encoder) return '';
      var digest = await cryptoApi.subtle.digest('SHA-256', new Encoder().encode(source));
      return Array.prototype.map.call(new Uint8Array(digest), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
    } catch (_) { return ''; }
  }
  // A stamp such as 2026-11-12T23:30:05-05:00 is the learner's wall clock, so it is read as written:
  // the reader's time zone cannot move the date. An older file's UTC stamp (ends in Z) is turned
  // into this device's local time.
  function stamp(value) {
    var source = text(value, 40);
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(source);
    if (!m) return 0;
    var utc = m[4] != null && /Z$/i.test(source);
    var d = utc ? new Date(source) : new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), m[4] != null ? Number(m[4]) : 12, Number(m[5]) || 0, Number(m[6]) || 0);
    if (isNaN(d.getTime())) return 0;
    if (!utc && (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3]))) return 0;
    return d.getFullYear() >= 2000 && d.getFullYear() <= 2100 ? d.getTime() : 0;
  }
  // A spreadsheet that saved the file again may have rewritten its dates its own way: 11/16/2026 9:10 (US),
  // 16/11/2026 09:10 or 16.11.2026 09:10 (Europe). Such a date is read only when the order is not in doubt: a
  // number above 12, dots (day first), the finish date in the name the file was saved under, or the file's own
  // duration fitting one order only (or both orders giving the same days). Otherwise 0, and the file's
  // last-changed date stands in with its note. values: [finished, started, ...] as in raw.stamps.
  var SHEET_DATE = /^(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4}|\d{2})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?m\.?)?)?$/i;
  function sheetParts(value) {
    var m = SHEET_DATE.exec(text(value, 40));
    if (!m) return null;
    var hour = m[5] != null ? Number(m[5]) : 12;
    if (m[8]) { if (hour < 1 || hour > 12) return null; hour = hour % 12 + (m[8].toLowerCase() === 'p' ? 12 : 0); }
    return { a: Number(m[1]), b: Number(m[3]), dots: m[2] === '.', year: Number(m[4]) + (m[4].length === 2 ? 2000 : 0), hour: hour, minute: Number(m[6]) || 0, second: Number(m[7]) || 0 };
  }
  function sheetTime(p, dayFirst) {
    var month = dayFirst ? p.b : p.a, day = dayFirst ? p.a : p.b;
    if (p.hour > 23 || p.minute > 59 || p.second > 59) return 0;
    var d = new Date(p.year, month - 1, day, p.hour, p.minute, p.second);
    if (isNaN(d.getTime()) || d.getMonth() !== month - 1 || d.getDate() !== day) return 0;
    return p.year >= 2000 && p.year <= 2100 ? d.getTime() : 0;
  }
  function sheetStamp(values, fileName, durationS) {
    var parts = (values || []).map(sheetParts);
    var found = parts.filter(Boolean);
    if (!found.length) return 0;
    var fits = [false, true].filter(function (dayFirst) { return found.every(function (p) { return sheetTime(p, dayFirst) > 0 && !(p.dots && !dayFirst); }); });
    if (fits.length === 2 && !found.every(function (p) { return p.a === p.b; })) {
      // The finish date in the saved name (<title>__<learner>__2026-11-16.csv), when the finish date is in the file.
      var names = text(fileName, 120).match(/__\d{4}-\d{2}-\d{2}(?!\d)/g);
      var named = names && parts[0] ? names[names.length - 1].slice(2) : '';
      var byName = named ? fits.filter(function (dayFirst) { return localDate(sheetTime(parts[0], dayFirst)) === named; }) : [];
      // Start to finish as the file states it (whole seconds; a spreadsheet drops the seconds, a clock change moves an hour).
      var byDuration = parts[0] && parts[1] && durationS !== null && durationS !== undefined && durationS !== '' && isFinite(Number(durationS))
        ? fits.filter(function (dayFirst) { return Math.abs((sheetTime(parts[0], dayFirst) - sheetTime(parts[1], dayFirst)) / 1000 - Number(durationS)) <= 3720; }) : fits;
      fits = byName.length === 1 ? byName : byDuration.length === 1 ? byDuration : [];
    }
    if (fits.length < 1) return 0;
    for (var i = 0; i < parts.length; i++) if (parts[i]) return sheetTime(parts[i], fits[0]);
    return 0;
  }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function localDate(ms) {
    var d = new Date(ms);
    return !ms || isNaN(d.getTime()) ? '' : d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  }
  // The file's activity ids are the take-home activity ids. The math practice ids show under
  // "Math facts"; any other id is kept and shows under "Other activities"; an unusable one becomes 'unknown'.
  function activityId(value) { return idOf(value, 40) || 'unknown'; }
  function activityName(id, title) {
    if (own(ACTIVITIES, id)) return ACTIVITIES[id][0];
    if (title) return title;
    if (own(MATH_ACTIVITIES, id)) return MATH_ACTIVITIES[id][0];
    if (own(VOCAB_ACTIVITIES, id)) return VOCAB_ACTIVITIES[id][0];
    if (own(SYMBOL_ACTIVITIES, id)) return SYMBOL_ACTIVITIES[id][0];
    if (own(READ_ALONG_ACTIVITIES, id)) return READ_ALONG_ACTIVITIES[id][0];
    if (own(EXTENDED_ACTIVITIES, id)) return EXTENDED_ACTIVITIES[id][0];
    if (!id || id === 'unknown') return 'Activity not recorded';
    var plain = String(id).replace(/_/g, ' ').trim();
    return plain.charAt(0).toUpperCase() + plain.slice(1);
  }
  function strandOf(id) { return own(ACTIVITIES, id) ? ACTIVITIES[id][1] : own(MATH_ACTIVITIES, id) ? MATH_ACTIVITIES[id][1] : own(VOCAB_ACTIVITIES, id) ? VOCAB_ACTIVITIES[id][1] : own(SYMBOL_ACTIVITIES, id) ? SYMBOL_ACTIVITIES[id][1] : own(READ_ALONG_ACTIVITIES, id) ? READ_ALONG_ACTIVITIES[id][1] : OTHER_STRAND[0]; }
  // A file that folds a few new facts in among known ones (math_rehearsal; any file whose item ids end
  // in -new or -known) is counted again for the new ones: most of its items are known facts, so the
  // overall first-try count says little about how the new ones are going.
  var MAX_MISSED = 8;
  function roleOf(it) { var id = String(it.itemId || '').toLowerCase(); return /-new$/.test(id) ? 'new' : /-known$/.test(id) ? 'known' : ''; }
  function newKnown() { return { items: 0, firstTry: 0, missed: [], knownItems: 0, knownFirstTry: 0 }; }
  // 2026-11-17: a Symbol Runner item with something to ignore says in its id whether the two agree: "-match" or "-conflict"
  // (files made from that day; older files have neither).
  function agreeOf(it) { var m = /-(match|conflict)(?:-new|-known)?$/.exec(String(it.itemId || '').toLowerCase()); return m ? m[1] : ''; }
  function median(list) {
    if (!list.length) return null;
    var a = list.slice().sort(function (x, y) { return x - y; }), mid = a.length >> 1;
    return Math.round(a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2);
  }
  // The typical recall time a file states ({ items, medianMs }), or null.
  function cleanRecall(r) {
    if (!r || typeof r !== 'object') return null;
    var items = whole(r.items, 9999), ms = whole(r.medianMs, 86400000);
    return items && ms !== null ? { items: items, medianMs: ms } : null;
  }
  function addNewKnown(into, from) {
    into.items += from.items; into.firstTry += from.firstTry; into.knownItems += from.knownItems; into.knownFirstTry += from.knownFirstTry;
    from.missed.forEach(function (word) { if (into.missed.indexOf(word) < 0 && into.missed.length < MAX_MISSED) into.missed.push(word); });
    return into;
  }

  // ---------------------------------------------------------------------------
  // One answer, and the score block of a check
  // ---------------------------------------------------------------------------
  function makeItem(raw) {
    var activity = activityId(raw.activity);
    // 2026-11-23: a read-along page's answers hold "read" or "played" and then the student's answers to its
    // "Check your understanding" questions, typed ones up to 240 characters: those are kept whole.
    var answerMax = activity === 'read_along' ? 260 : 40;
    var responses = (Array.isArray(raw.responses) ? raw.responses : []).slice(0, 8).map(function (r) { return text(r, answerMax); }).filter(Boolean);
    var tries = Math.max(0, Math.min(99, Math.floor(Number(raw.tries)) || 0));
    var flag = idOf(raw.flag, 40);
    // 2026-11-17: a check's item set aside at a pause ("paused", done in the JSON) or left when the time ran out ("time_up", which may
    // now keep what was typed) is not an answer: never attempted, never right, as the check's own score counts it.
    var setAside = flag === 'paused' || flag === 'time_up';
    var correct = !setAside && raw.correct === true;
    return { n: whole(raw.n, 9999) || 0, itemId: text(raw.itemId, 80), activity: activity, activityTitle: text(raw.activityTitle, 60),
      word: text(raw.word, 40), target: text(raw.target, 40), responses: responses, correct: correct, firstTry: correct && raw.firstTry === true, tries: tries,
      // Letter Trace and unscored items are practice: counted, never graded.
      practice: raw.scored === false || activity === 'letter_tracing',
      attempted: !setAside && (raw.done === true || tries > 0 || responses.length > 0 || correct),
      timeMs: whole(raw.timeMs, 86400000) || 0, supports: text(raw.supports, 200), flag: flag,
      digitsCorrect: whole(raw.digitsCorrect), digitsPossible: whole(raw.digitsPossible) };
  }
  // 2026-11-23: what the pages of a read-along hold, counted from the answers (tally puts it on the result as readAlong;
  // null when the result has no read-along page). A page's first answer is "read" (the student started something on the
  // page) or "played" (the file turned to the page and read it aloud by itself); the rest are the answers to its "Check
  // your understanding" questions: "2: the words typed", "1: Mia (right)", "1: Mia (right, try 2)", "1: Soup (not right)",
  // "1: Soup (not right, 3 tries)". Anything else is kept as plain text. Nothing here is a score.
  // { pages, read, played, timeMs, answers, byPage: [{ page, word, answers: [{ question, text, result, tries }] }] }
  // result: 'right', 'not_right', or '' (typed words, or a choice with no keyed answer). A typed answer that itself ends
  // in "(right)" cannot be told from a choice: the file does not say which kind of question it was.
  var READ_ALONG_ANSWER_MAX = 240;
  // The answer most often given on a check, when it is a sign of guessing (see SAME_MIN); otherwise null.
  // { answer, count, of, wrong }: the answer as first written, how many gave it, of how many answers, how many of those were not right.
  function sameAnswerOf(items) {
    var given = [], counts = Object.create(null), shown = Object.create(null), best = '', bestN = 0;
    (items || []).forEach(function (it) {
      if (!it || it.practice || !it.attempted || !it.responses || !it.responses.length) return;
      var raw = String(it.responses[it.responses.length - 1]).trim(), a = raw.toLowerCase();
      if (!a) return;
      given.push({ a: a, right: !!it.correct });
      counts[a] = (counts[a] || 0) + 1;
      if (!(a in shown)) shown[a] = raw;
      if (counts[a] > bestN) { bestN = counts[a]; best = a; }
    });
    if (given.length < SAME_MIN || bestN < Math.ceil(given.length * SAME_SHARE)) return null;
    var wrong = given.filter(function (g) { return g.a === best && !g.right; }).length;
    if (wrong * 2 < bestN) return null;
    return { answer: shown[best].slice(0, 40), count: bestN, of: given.length, wrong: wrong };
  }
  function readAlongAnswer(entry) {
    var numbered = /^(\d{1,2}): ([\s\S]+)$/.exec(entry);
    var body = numbered ? numbered[2] : entry;
    var mark = numbered ? /^([\s\S]+) \((?:(right)(?:, try (\d{1,3}))?|(not right)(?:, (\d{1,3}) tries)?)\)$/.exec(body) : null;
    return { question: numbered ? Number(numbered[1]) : null, text: (mark ? mark[1] : body).slice(0, READ_ALONG_ANSWER_MAX),
      result: !mark ? '' : mark[2] ? 'right' : 'not_right', tries: !mark ? null : Number(mark[3] || mark[5]) || 1 };
  }
  function readAlongOf(items) {
    var pages = 0, read = 0, played = 0, timeMs = 0, answers = 0, byPage = [];
    (items || []).forEach(function (it) {
      if (!it || it.activity !== 'read_along') return;
      pages++;
      timeMs += it.timeMs || 0;
      var rest = it.responses;
      if (rest[0] === 'read') { read++; rest = rest.slice(1); } else if (rest[0] === 'played') { played++; rest = rest.slice(1); }
      if (!rest.length) return;
      byPage.push({ page: pages, word: it.word, answers: rest.map(readAlongAnswer) });
      answers += rest.length;
    });
    return pages ? { pages: pages, read: read, played: played, timeMs: timeMs, answers: answers, byPage: byPage } : null;
  }
  // The score as the file states it. It is not covered by the file's check value; the answers are,
  // and tally() counts them again and says when the two differ.
  function cleanTools(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (v) {
      var s = text(v, 40);
      if (/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(s) && out.indexOf(s) < 0 && out.length < 12) out.push(s);
    });
    return out;
  }
  function cleanScore(sc) {
    sc = sc && typeof sc === 'object' && !Array.isArray(sc) ? sc : {};
    var completion = text(sc.completion, 20);
    var score = number(sc.score);
    var tools = cleanTools(sc.tools);
    var out = { measure: idOf(sc.measure, 40), score: score === null ? null : Math.max(0, Math.min(1000000, score)), unit: idOf(sc.scoreUnit != null ? sc.scoreUnit : sc.unit, 40),
      digitsCorrect: whole(sc.digitsCorrect), digitsPossible: whole(sc.digitsPossible), itemsCorrect: whole(sc.itemsCorrect) || 0, itemsAttempted: whole(sc.itemsAttempted) || 0,
      timeLimitS: number(sc.timeLimitS), elapsedS: Math.max(0, number(sc.elapsedS) || 0), hiddenS: Math.max(0, number(sc.hiddenS) || 0),
      // time_up_away (2026-11-13): the time ran out while the page was hidden or closed. No score in any unit.
      completion: completion === 'time' || completion === 'ended_early' || completion === 'complete' || completion === 'time_up_away' ? completion : '',
      prorated: sc.prorated === true || yes(sc.prorated), scoringVersion: whole(sc.scoringVersion, 999), formVersion: text(sc.formVersion, 20),
      attempt: Math.max(1, whole(sc.attempt, 9999) || 1),
      flags: (Array.isArray(sc.flags) ? sc.flags : []).slice(0, 8).map(function (f) { return idOf(f, 40); }).filter(Boolean),
      // Untimed (an accommodation): the JSON says untimed: true, the CSV "timing=untimed".
      untimed: sc.untimed === true || yes(sc.untimed) || text(sc.timing, 20).toLowerCase() === 'untimed', usualTimeLimitS: number(sc.usualTimeLimitS) };
    if (tools.length) out.tools = tools;
    // 2026-11-17: a timed check that was paused says how long and how often (only then).
    var pauses = whole(sc.pauses, 9999);
    if (pauses) { out.pausedS = Math.max(0, Math.min(864000, number(sc.pausedS) || 0)); out.pauses = pauses; }
    // 2026-11-17: how often Hear the directions was pressed before the check began (only when it was).
    var heard = whole(sc.directionsHeard, 999);
    if (heard) out.directionsHeard = heard;
    return out;
  }
  // "key=value" cells of a trailer row.
  function pairs(cells) {
    var out = Object.create(null);
    (cells || []).forEach(function (cell) {
      var source = text(unguard(cell), 200), at = source.indexOf('=');
      if (at < 1) return;
      var key = source.slice(0, at).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (!(key in out)) out[key] = source.slice(at + 1);
    });
    return out;
  }
  function scoreFromPairs(kv) {
    return cleanScore({ measure: kv.measure, score: kv.score, scoreUnit: kv.score_unit, digitsCorrect: kv.digits_correct, digitsPossible: kv.digits_possible,
      itemsCorrect: kv.items_correct, itemsAttempted: kv.items_attempted, timeLimitS: kv.time_limit_s, elapsedS: kv.elapsed_s, hiddenS: kv.hidden_s,
      completion: kv.completion, prorated: kv.prorated, scoringVersion: kv.scoring_version, formVersion: kv.form_version, attempt: kv.attempt,
      flags: String(kv.flags || '').split(';'), tools: kv.tools_used ? String(kv.tools_used).split(';') : [], timing: kv.timing, usualTimeLimitS: kv.usual_time_limit_s,
      pausedS: kv.paused_s, pauses: kv.pauses, directionsHeard: kv.directions_heard });
  }

  // ---------------------------------------------------------------------------
  // The CSV: rows to raw results (one per session_id)
  // ---------------------------------------------------------------------------
  // Columns are found by their header names, in any order; columns this version does not know are
  // not read, and rows that start with # and are not known are skipped.
  function readCsv(source) {
    var rows = parseCsv(source);
    if (!rows.length) return { ok: false, reason: 'empty' };
    var index = {};
    var extra = [];
    var headerAt = -1;
    for (var r = 0; r < rows.length && r < 5 && headerAt < 0; r++) {
      var names = rows[r].map(function (c) { return text(unguard(c), 40).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); });
      if (names.indexOf('format') < 0 || names.indexOf('session_id') < 0 || (names.indexOf('item_id') < 0 && names.indexOf('activity') < 0)) continue;
      names.forEach(function (name, i) {
        if (COLUMNS.indexOf(name) >= 0 && !own(index, name)) { index[name] = i; return; }
        if (!name) return;
        extra.push(i);
        if (PROBE_COLUMNS.indexOf(name) >= 0 && !own(index, name)) index[name] = i;
      });
      headerAt = r;
    }
    if (headerAt < 0) {
      // No header row (deleted in a spreadsheet): the columns are in the saved order.
      if (!/^alloflow-packet-result\//.test(text(rows[0][0], 60)) || rows[0].length < COLUMNS.length) return { ok: false, reason: 'not_results' };
      COLUMNS.forEach(function (name, i) { index[name] = i; });
      if (rows[0].length >= COLUMNS.length + PROBE_COLUMNS.length) PROBE_COLUMNS.forEach(function (name, i) { index[name] = COLUMNS.length + i; extra.push(COLUMNS.length + i); });
    }
    var groups = {};
    var order = [];
    var integrity = null;
    var newer = false;
    var scores = [];
    var summaries = [];
    var quote = function (cell) { return '"' + cell.replace(/"/g, '""') + '"'; };
    rows.slice(headerAt + 1).forEach(function (row) {
      var first = text(unguard(row[0]), 60);
      if (first.charAt(0) === '#') {
        var tag = first.toLowerCase();
        if (tag === '#integrity') integrity = { method: text(row[1], 12).toLowerCase(), value: text(row[2], 80).toLowerCase() };
        else if (tag === '#score') scores.push({ sid: text(unguard(row[1]), 80), pairs: pairs(row.slice(2)) });
        else if (tag === '#summary') summaries.push({ sid: text(unguard(row[1]), 80), pairs: pairs(row.slice(2)) });
        return;
      }
      var rawCell = function (name) { return own(index, name) && row[index[name]] != null ? String(row[index[name]]) : ''; };
      var get = function (name) { return unguard(rawCell(name)); };
      var format = text(get('format'), 60);
      if (!/^alloflow-packet-result\//.test(format)) return;
      if (format !== FORMAT) { newer = true; return; }
      var key = 'k' + text(get('session_id'), 80);
      if (!own(groups, key)) {
        if (order.length >= 40) return;
        groups[key] = { source: 'csv', sid: text(get('session_id'), 80), learner: text(get('learner'), 60), packetId: text(get('packet_id'), 80),
          packetVersion: text(get('packet_version'), 40), form: text(get('form'), 40), mode: isCheckMode(text(get('mode'), 12).toLowerCase()) ? 'probe' : 'practice', title: '',
          stamps: [get('finished_local'), get('started_local')], startedLocal: text(get('started_local'), 40), finishedLocal: text(get('finished_local'), 40),
          startedText: text(get('started_local'), 40), durationS: whole(get('duration_s'), 864000),
          prefix: [get('packet_id'), get('packet_version'), get('form'), get('session_id')].join('|').slice(0, 600), items: [], lines: [], linesAll: [], integrity: null, score: null, attempt: null };
        order.push(key);
      }
      var group = groups[key];
      if (group.items.length >= MAX_ITEMS) return;
      // The row as it was saved: every cell quoted, cell text untouched. "lines" is the rule the
      // practice file follows (the 24 columns, and for a check its two digit cells). "linesAll" also
      // takes every other named column in file order, so a later version that adds a column to the
      // saved rows still checks out.
      var saved = COLUMNS.map(rawCell);
      group.lines.push(saved.concat(group.mode === 'probe' ? PROBE_COLUMNS.map(rawCell) : []).map(quote).join(','));
      group.linesAll.push(saved.concat(extra.map(function (i) { return row[i] != null ? String(row[i]) : ''; })).map(quote).join(','));
      var scored = text(get('scored'), 8);
      group.items.push(makeItem({ n: get('item_n'), itemId: get('item_id'), activity: get('activity'), activityTitle: get('activity_title'), word: get('word'), target: get('target'),
        responses: get('responses').split(' | '), correct: yes(get('correct')), firstTry: yes(get('first_try')), tries: get('tries'), scored: scored === '' ? true : yes(scored),
        timeMs: get('time_ms'), supports: get('supports'), flag: get('flag'), digitsCorrect: get('digits_correct'), digitsPossible: get('digits_possible') }));
    });
    if (!order.length) return { ok: false, reason: newer ? 'newer' : 'no_items' };
    // The check line covers the file's one result.
    if (order.length === 1) groups[order[0]].integrity = integrity;
    order.forEach(function (key) {
      var group = groups[key];
      var mine = function (list) {
        var hit = list.filter(function (row) { return row.sid === group.sid; });
        return hit.length ? hit[hit.length - 1].pairs : order.length === 1 && list.length ? list[list.length - 1].pairs : null;
      };
      var stated = mine(scores), counted = mine(summaries);
      // A file saved from 2026-11-11 carries its lesson or check title in the summary row ("title=Short vowels").
      // An older file has none, and the packet id is shown. The row is outside the check value.
      group.title = counted && typeof counted.title === 'string' ? text(counted.title, 80) : '';
      // From 2026-11-13 the row also says the time on the items ("active_s=252"); older files have none.
      group.activeS = counted && typeof counted.active_s === 'string' ? whole(counted.active_s, 864000) : null;
      // From 2026-11-17 a math fact practice file also says its typical recall time ("recall_items=8", "recall_median_ms=2100").
      group.recall = counted ? cleanRecall({ items: counted.recall_items, medianMs: counted.recall_median_ms }) : null;
      // From 2026-11-23 a file written by Collect by sealed QR says so ("source=sealed_qr"), and how much was left out
      // of the code to fit ("qr_left_out=0" to 3: nothing; the times; the wording of some questions). Every question is
      // always in it, so the counts are whole; what is left out is detail. The row is outside the check value.
      group.qrShort = counted && counted.source === 'sealed_qr' ? whole(counted.qr_left_out, 9) || 0 : 0;
      if (group.mode !== 'probe') return;
      group.score = stated ? scoreFromPairs(stated) : null;
      group.attempt = group.score ? group.score.attempt : counted && whole(counted.attempt, 9999) ? whole(counted.attempt, 9999) : null;
    });
    return { ok: true, sessions: order.map(function (key) { return groups[key]; }) };
  }

  // ---------------------------------------------------------------------------
  // The JSON: the take-home result, or a class mailbox copy of it, to one raw result
  // ---------------------------------------------------------------------------
  // The item rows as the practice file writes them (packetCsv in the take-home loader), rebuilt
  // from the JSON so its check value can be made again. Keep this the same as the loader.
  function writerLines(data, packet, titles, probe) {
    var plain = function (v) { return v == null ? '' : typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v); };
    var count = function (v) { return v == null || v === '' || !isFinite(Number(v)) ? '' : Math.max(0, Math.round(Number(v))); };
    var learner = plain(data.learner != null ? data.learner : data.learnerName);
    var session = plain(data.sessionId);
    var seconds = Math.round((Number(data.durationMs) || 0) / 1000);
    return data.items.slice(0, MAX_ITEMS).map(function (it, i) {
      it = it && typeof it === 'object' ? it : {};
      var activity = plain(it.activity);
      var practice = !!it.practice || activity === 'letter_tracing';
      var supports = it.supports && typeof it.supports === 'object' ? Object.keys(it.supports).map(function (k) { return k + ':' + plain(it.supports[k]); }).join(';') : '';
      return [FORMAT, session, plain(packet.id), plain(packet.version), plain(packet.form), plain(packet.mode), learner,
        plain(data.startedLocal), plain(data.finishedLocal), seconds, Number(it.n) || i + 1, plain(it.itemId), activity, plain(own(titles, activity) ? titles[activity] : ''),
        practice ? 0 : 1, plain(it.word), plain(it.target), (Array.isArray(it.responses) ? it.responses : []).map(plain).join(' | '),
        it.correct ? 1 : 0, it.firstTry ? 1 : 0, Number(it.attempts) || 0, Math.max(0, Math.round(Number(it.ms) || 0)), supports, plain(it.flag)]
        .concat(probe ? [count(it.digitsCorrect), count(it.digitsPossible)] : []).map(csvCell).join(',');
    });
  }
  function readJson(data) {
    if (data && typeof data === 'object' && data.kind === 'alloflow-take-home-submission' && data.takeHomeResult && typeof data.takeHomeResult === 'object') data = data.takeHomeResult;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, reason: 'not_results' };
    if (data.kind !== RESULT_KIND) {
      var saveFile = ['wordSoundsState', 'studentNickname', 'studentProgressSummary', 'fluencyAssessments', 'gameCompletions', 'adventureState', 'responses', 'timeOnTask', 'profile']
        .some(function (key) { return own(data, key); });
      return { ok: false, reason: saveFile ? 'save_file' : 'not_results' };
    }
    var version = Number(data.schemaVersion);
    if (version !== 1 && version !== 2 && version !== 3) return { ok: false, reason: version > 3 ? 'newer' : 'not_results' };
    if (!Array.isArray(data.items)) return { ok: false, reason: 'no_items' };
    var packet = data.packet && typeof data.packet === 'object' ? data.packet : {};
    var titles = data.activityTitles && typeof data.activityTitles === 'object' ? data.activityTitles : {};
    var probe = isCheckMode(packet.mode);
    var learner = scalar(data.learner) || scalar(data.learnerName);
    var integrity = data.integrity && typeof data.integrity === 'object' ? { method: text(data.integrity.method, 12).toLowerCase(), value: text(data.integrity.value, 80).toLowerCase() } : null;
    var lines = null;
    if (integrity && integrity.value) { try { lines = writerLines(data, packet, titles, probe); } catch (_) { lines = null; } }
    var score = probe && data.score && typeof data.score === 'object' ? cleanScore(data.score) : null;
    var seconds = number(data.durationMs);
    var active = number(data.activeMs);
    // The recall times of the facts right at the first try from memory, counted from the answers (item.recallMs).
    var recalls = [];
    data.items.slice(0, MAX_ITEMS).forEach(function (it) {
      if (!it || typeof it !== 'object' || it.firstTry !== true || it.practice || it.scored === false) return;
      var flag = idOf(it.flag, 40);
      if (flag === 'paused' || flag === 'time_up') return;
      var ms = number(it.recallMs);
      if (ms !== null && ms >= 0) recalls.push(Math.min(86400000, Math.round(ms)));
    });
    return { ok: true, sessions: [{ source: 'json', sid: text(data.sessionId, 80), learner: text(learner, 60), packetId: text(packet.id, 80) || text(data.lessonId, 80),
      packetVersion: text(packet.version, 40) || text(data.revision, 40), form: text(packet.form, 40), mode: probe ? 'probe' : 'practice',
      title: text(data.lessonTitle, 80) || text(packet.title, 80), activeS: active === null ? null : whole(active / 1000, 864000),
      recall: recalls.length ? { items: recalls.length, medianMs: median(recalls) } : null,
      stamps: [data.finishedLocal, data.finishedAt, data.startedLocal, data.startedAt], startedLocal: text(data.startedLocal, 40), finishedLocal: text(data.finishedLocal, 40),
      startedText: text(data.startedLocal, 40) || text(data.startedAt, 40), durationS: seconds === null ? null : whole(seconds / 1000, 864000),
      prefix: [packet.id, packet.version, packet.form, data.sessionId].map(scalar).join('|').slice(0, 600),
      items: data.items.slice(0, MAX_ITEMS).map(function (it, i) {
        it = it && typeof it === 'object' ? it : {};
        var activity = scalar(it.activity) || (version === 1 ? 'isolation' : '');
        var supports = it.supports && typeof it.supports === 'object' && !Array.isArray(it.supports) ? Object.keys(it.supports).slice(0, 12).map(function (k) { return k + ':' + scalar(it.supports[k]); }).join(';') : '';
        return makeItem({ n: it.n != null ? it.n : i + 1, itemId: it.itemId, activity: activity, activityTitle: own(titles, activity) ? titles[activity] : '', word: it.word, target: it.target,
          responses: it.responses, correct: it.correct === true, firstTry: it.firstTry === true, tries: it.attempts != null ? it.attempts : it.tries, done: it.done === true,
          scored: !(it.scored === false || it.practice), timeMs: it.ms, supports: supports, flag: it.flag, digitsCorrect: it.digitsCorrect, digitsPossible: it.digitsPossible });
      }), lines: lines, linesAll: null, integrity: integrity, score: score, attempt: score ? score.attempt : null }] };
  }

  // ---------------------------------------------------------------------------
  // A result, counted
  // ---------------------------------------------------------------------------
  // Everything that is counted from the answers: the summary, the rows by activity and by skill
  // strand, the wrong answers, the notes. It is made again whenever a result is opened, so the
  // numbers shown always come from the answers themselves.
  function tally(s) {
    var acts = Object.create(null), order = [];
    var wrong = Object.create(null), wrongList = [];
    var done = 0, graded = 0, firstTry = 0, correct = 0, given = 0, digits = 0, digitsPossible = 0, hasDigits = false;
    var split = null;
    s.items.forEach(function (it) {
      if (!it.practice) given++;
      if (!it.attempted) return;
      var a = acts[it.activity];
      if (!a) {
        if (order.length >= 24) return;
        a = acts[it.activity] = { activity: it.activity, name: activityName(it.activity, it.activityTitle), strand: strandOf(it.activity), items: 0, graded: 0, correct: 0, firstTry: 0 };
        order.push(a);
      }
      a.items++;
      // A check's sample question is practice before the scored items: not one of the items done (2026-11-13, as Class Analytics counts).
      if (!(it.practice && s.mode === 'probe')) done++;
      if (it.practice) return;
      a.graded++; graded++;
      if (it.correct) { a.correct++; correct++; }
      if (it.firstTry) { a.firstTry++; firstTry++; }
      // An activity has newFacts only when its items say new or known.
      var role = roleOf(it);
      if (role) {
        var nk = a.newFacts || (a.newFacts = newKnown());
        if (role === 'known') { nk.knownItems++; if (it.firstTry) nk.knownFirstTry++; }
        else { nk.items++; if (it.firstTry) nk.firstTry++; else if (it.word && nk.missed.indexOf(it.word) < 0 && nk.missed.length < MAX_MISSED) nk.missed.push(it.word); }
      }
      var agree = agreeOf(it);
      if (agree) {
        var half = (split || (split = { match: { items: 0, firstTry: 0, ms: [] }, conflict: { items: 0, firstTry: 0, ms: [] } }))[agree];
        half.items++;
        if (it.firstTry) { half.firstTry++; if (it.timeMs > 0) half.ms.push(it.timeMs); }
      }
      if (it.digitsPossible !== null) { hasDigits = true; digits += it.digitsCorrect || 0; digitsPossible += it.digitsPossible; }
      if (!it.word) return;
      (it.correct ? it.responses.slice(0, -1) : it.responses).slice(0, 4).forEach(function (picked) {
        if (picked === it.target) return;
        var key = it.word.toLowerCase() + '\t' + picked.slice(0, 24);
        if (wrong[key]) wrong[key].times++;
        else if (wrongList.length < 24) wrongList.push(wrong[key] = { word: it.word.toLowerCase(), answer: picked.slice(0, 24), times: 1 });
      });
    });
    var percent = function (part, of) { return of ? Math.round(part / of * 100) : null; };
    s.summary = { itemsInFile: s.items.length, done: done, given: given, attempted: graded, correct: correct, firstTry: firstTry,
      accuracyPct: percent(correct, given), firstTryPct: percent(firstTry, graded) };
    s.byActivity = order;
    s.byStrand = GROUPS.map(function (row) {
      var sum = { strand: row[0], name: row[1], graded: 0, correct: 0, firstTry: 0, firstTryPct: null };
      order.forEach(function (a) {
        if (a.strand !== row[0]) return;
        sum.graded += a.graded; sum.correct += a.correct; sum.firstTry += a.firstTry;
        if (a.newFacts) addNewKnown(sum.newFacts || (sum.newFacts = newKnown()), a.newFacts);
      });
      sum.firstTryPct = percent(sum.firstTry, sum.graded);
      return sum;
    }).filter(function (sum) { return sum.graded > 0; });
    // 2026-11-17: the matching and the conflicting items of the whole result (first-try count, and the typical time of
    // those right at the first try), or null.
    s.conflict = split ? { matchItems: split.match.items, matchFirstTry: split.match.firstTry, matchMedianMs: median(split.match.ms),
      conflictItems: split.conflict.items, conflictFirstTry: split.conflict.firstTry, conflictMedianMs: median(split.conflict.ms) } : null;
    // The new and known facts of the whole result, or null.
    s.newFacts = null;
    order.forEach(function (a) { if (a.newFacts) s.newFacts = addNewKnown(s.newFacts || newKnown(), a.newFacts); });
    s.wrong = wrongList;
    // 2026-11-23: the pages of a read-along (read, only played, the time, the answers to its questions), or null.
    s.readAlong = readAlongOf(s.items);
    var probe = s.mode === 'probe';
    var st = probe ? s.stated : null;
    var firstScored = s.items.filter(function (it) { return !it.practice; })[0] || s.items[0] || null;
    var activity = firstScored ? firstScored.activity : '';
    // With no score line the measure is read from the activity; a score cannot be.
    s.measure = !probe ? 'practice' : (st && st.measure) || (activity === 'math_computation' ? 'math_dcpm' : activity) || 'check';
    s.measureName = !probe ? 'Practice' : own(MEASURES, s.measure) ? MEASURES[s.measure] : own(VOCAB_MEASURES, s.measure) ? VOCAB_MEASURES[s.measure] : own(SYMBOL_MEASURES, s.measure) ? SYMBOL_MEASURES[s.measure] : own(EXTENDED_MEASURES, s.measure) ? EXTENDED_MEASURES[s.measure] : (firstScored && firstScored.activityTitle) || activityName(s.measure, '');
    s.unit = st ? st.unit : probe && own(MEASURE_UNITS, s.measure) ? MEASURE_UNITS[s.measure] : probe && own(EXTENDED_MEASURE_UNITS, s.measure) ? EXTENDED_MEASURE_UNITS[s.measure] : '';
    s.unitName = !probe ? FIRST_TRY_UNIT : own(UNITS, s.unit) ? UNITS[s.unit] : s.unit.replace(/_/g, ' ');
    // Notes, as short codes. The page says each one in plain words.
    var flags = [];
    var pushFlag = function (flag) { if (flag && flags.indexOf(flag) < 0) flags.push(flag); };
    s.score = null;
    if (probe) {
      // The score of a check. The answers are covered by the file's check value and the score
      // line is not, so the counts are made again from the answers. The time used, how the check
      // ended and the flags come from the score line. A rate follows the file's own rule
      // (checkScore in the take-home loader): digits correct over the minutes used, and no score
      // when the check was stopped early, had no time limit or was finished in under 20 seconds.
      var limit = st && st.timeLimitS > 0 ? st.timeLimitS : null;
      var elapsed = st && st.elapsedS > 0 ? st.elapsedS : 0;
      var completion = st ? st.completion : '';
      var score = null, noScore = '', prorated = false;
      if (!st) noScore = 'no_score_line';
      else if (completion === 'ended_early') noScore = 'stopped_early';
      else if (completion === 'time_up_away') noScore = 'time_up_away';
      else if (completion !== 'complete' && completion !== 'time') noScore = 'score_unreadable';
      else if (s.unit === 'digits_correct_per_minute') {
        var early = limit !== null && completion === 'complete' && elapsed < limit;
        if (limit === null) noScore = 'no_time_limit';
        else if (early && elapsed < 20) noScore = 'too_fast';
        else if (!(elapsed > 0)) noScore = 'score_unreadable';
        else { score = Math.round(digits / Math.max(1 / 60, elapsed / 60)); prorated = early; }
      } else if (s.unit === 'items_correct') score = correct;
      // A unit this version does not know: the number the file states, as it states it.
      else score = st.score;
      var recounted = !!st && st.score !== null && score !== null && st.score !== score;
      s.score = { measure: s.measure, score: score, stated: st ? st.score : null, unit: s.unit, digitsCorrect: hasDigits ? digits : null, digitsPossible: hasDigits ? digitsPossible : null,
        itemsCorrect: correct, itemsAttempted: graded, timeLimitS: limit, elapsedS: st ? st.elapsedS : null, hiddenS: st ? st.hiddenS : 0, completion: completion, prorated: prorated,
        noScore: noScore, recounted: recounted, scoringVersion: st ? st.scoringVersion : null, formVersion: st ? st.formVersion : '', attempt: st ? st.attempt : s.attempt || 1,
        flags: st ? st.flags.slice() : [] };
      if (st && Array.isArray(st.tools) && st.tools.length) s.score.tools = st.tools.slice();
      if (st && st.pauses) { s.score.pausedS = st.pausedS; s.score.pauses = st.pauses; }
      if (st && st.directionsHeard) s.score.directionsHeard = st.directionsHeard;
      s.score.flags.forEach(pushFlag);
      // Untimed (an accommodation): a fixed form with no time limit, said by the file or not. It is never put with
      // timed results: it has its own series (seriesKey), so its own middle and goal.
      s.untimed = !!st && (st.untimed || (own(MEASURES, s.measure) && s.form !== 'custom' && !/^math-custom-/.test(s.packetId) && limit === null));
      if (s.untimed) { s.score.untimed = true; s.score.usualTimeLimitS = st.usualTimeLimitS; pushFlag('untimed'); if (noScore === 'no_time_limit') noScore = 'untimed_no_rate'; s.score.noScore = noScore; }
      if (noScore) pushFlag(noScore);
      if (prorated) pushFlag('finished_early');
      if (recounted) pushFlag('score_differs');
      // A copy collected by QR code that left out the words of some answers (qr_left_out 2 or 3) cannot be judged fairly:
      // no note. The student's own results file, when added, replaces it and is judged in full.
      s.sameAnswer = s.qrShort >= 2 ? null : sameAnswerOf(s.items);
      if (s.sameAnswer) pushFlag('same_answer');
      if (s.measure === 'maze_correct_3m' && score !== null) {
        var mazeWrong = Math.max(0, graded - correct);
        s.mazeNet = { correct: correct, incorrect: mazeWrong, net: Math.max(0, correct - mazeWrong) };
      } else {
        s.mazeNet = null;
      }
    } else {
      s.mazeNet = null;
    }
    s.value = probe ? s.score.score : s.summary.firstTryPct;
    s.attempt = probe ? s.score.attempt : null;
    if (s.integrity === 'changed') pushFlag('file_changed');
    if (s.integrity === 'absent') pushFlag('no_check_value');
    if (s.integrity === 'unchecked') pushFlag('not_checked');
    if (s.qrShort) pushFlag('qr_short');
    if (s.dateFromFile) pushFlag(s.date ? 'date_from_file' : 'no_date');
    s.flags = flags;
    return s;
  }
  // A raw result to the plain object callers use: the date of record and the edit check, then the counts.
  async function finish(raw, lastModified, fileName) {
    var start = 0;
    raw.stamps.forEach(function (value) { if (!start) start = stamp(value); });
    // Dates a spreadsheet rewrote (11/16/2026 9:10), when the order of day and month is not in doubt (2026-11-13).
    if (!start) start = sheetStamp(raw.stamps, fileName, raw.durationS);
    var dateFromFile = !start;
    // No date in the results: the file's own "last changed" time stands in, and the result says so.
    if (!start) { var changed = Number(lastModified); start = changed > 0 && isFinite(changed) ? changed : 0; }
    var check = 'absent';
    if (raw.integrity && raw.integrity.value) {
      check = 'unchecked';
      var bases = raw.lines ? [raw.prefix + '\n' + raw.lines.join('\n')] : [];
      if (raw.linesAll) { var all = raw.prefix + '\n' + raw.linesAll.join('\n'); if (all !== bases[0]) bases.push(all); }
      for (var i = 0; i < bases.length; i++) {
        var got = raw.integrity.method === 'fnv1a' ? fnv1a(bases[i]) : raw.integrity.method === 'sha256' ? await sha256(bases[i]) : '';
        if (!got) { check = 'unchecked'; break; }
        check = got === raw.integrity.value ? 'ok' : 'changed';
        if (check === 'ok') break;
      }
    }
    // An older file has no session id: the same learner, start time and number of answers is taken
    // to be the same piece of work.
    var sid = raw.sid || 'old-' + fnv1a(raw.learner + '|' + raw.startedText + '|' + raw.items.length);
    // An older CSV file does not hold the title. For a teacher's own problem set, the name the file was
    // saved under starts with it.
    var title = raw.title;
    var named = /^(.+?)__/.exec(text(fileName, 120));
    if (!title && named && raw.mode === 'probe' && (raw.form === 'custom' || /^math-custom-/.test(raw.packetId))) title = text(named[1].replace(/[-_]+/g, ' '), 80);
    return tally({ sessionId: sid.slice(0, 64), learner: raw.learner, packetId: raw.packetId, packetVersion: raw.packetVersion, title: title || raw.packetId,
      mode: raw.mode, form: raw.form, startedLocal: raw.startedLocal, finishedLocal: raw.finishedLocal, start: start, date: localDate(start), dateFromFile: dateFromFile,
      durationS: raw.durationS, activeS: raw.activeS === undefined ? null : raw.activeS, recall: cleanRecall(raw.recall), items: raw.items, stated: raw.score, attempt: raw.attempt, integrity: check, source: raw.source,
      qrShort: whole(raw.qrShort, 9) || 0, sourceFile: text(fileName, 120) });
  }
  function refuse(reason, name) {
    reason = own(REASONS, reason) ? reason : 'not_results';
    return { ok: false, name: text(name, 120) || 'file', reason: reason, why: REASONS[reason], sessions: [], bundle: null };
  }
  // One file's text to { ok: true, sessions } or { ok: true, bundle } or { ok: false, reason, why }.
  // meta: { name, lastModified }. Files are recognized by what is in them, never by name. Never throws.
  async function read(source, meta) {
    var name = text(meta && meta.name, 120) || 'file';
    try {
      if (typeof source !== 'string') return refuse('unreadable', name);
      if (source.length > MAX_BYTES) return refuse('too_big', name);
      if (source.charCodeAt(0) === 0xFEFF) source = source.slice(1);
      var head = source.slice(0, 400).replace(/^\s+/, '').charAt(0);
      if (!head) return refuse('empty', name);
      if (head === '<') return refuse('web_page', name);
      var got;
      if (head === '{' || head === '[') {
        var data = null;
        try {
          data = JSON.parse(source, function (k, v) {
            return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
          });
        } catch (_) { data = null; }
        if (data && typeof data === 'object' && !Array.isArray(data) && data.kind === BUNDLE_KIND) {
          var bundle = readBundle(data);
          return bundle.ok ? { ok: true, name: name, reason: '', why: '', sessions: [], bundle: bundle } : refuse(bundle.reason, name);
        }
        got = readJson(data);
      } else got = readCsv(source);
      if (!got.ok) return refuse(got.reason, name);
      var sessions = [];
      for (var i = 0; i < got.sessions.length; i++) {
        var session = await finish(got.sessions[i], meta && meta.lastModified, name);
        if (session.summary.done > 0) sessions.push(session);
      }
      if (!sessions.length) return refuse('nothing_done', name);
      return { ok: true, name: name, reason: '', why: '', sessions: sessions, bundle: null };
    } catch (_) { return refuse('unreadable', name); }
  }

  // ---------------------------------------------------------------------------
  // "Save all of this as one file": the results as read, the merges and the goals
  // ---------------------------------------------------------------------------
  function cleanSession(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
    var items = (Array.isArray(s.items) ? s.items : []).slice(0, MAX_ITEMS).map(function (it) {
      it = it && typeof it === 'object' ? it : {};
      return makeItem({ n: it.n, itemId: it.itemId, activity: it.activity, activityTitle: it.activityTitle, word: it.word, target: it.target, responses: it.responses,
        correct: it.correct === true, firstTry: it.firstTry === true, tries: it.tries, done: it.attempted === true, scored: it.practice !== true, timeMs: it.timeMs,
        supports: it.supports, flag: it.flag, digitsCorrect: it.digitsCorrect, digitsPossible: it.digitsPossible });
    });
    var sid = text(s.sessionId, 64);
    if (!sid || !items.length) return null;
    var start = number(s.start);
    var date = /^\d{4}-\d{2}-\d{2}$/.test(scalar(s.date)) ? s.date : '';
    var probe = isCheckMode(s.mode);
    var packetId = text(s.packetId, 80);
    var integrity = ['ok', 'changed', 'absent', 'unchecked'].indexOf(s.integrity) >= 0 ? s.integrity : 'unchecked';
    var out = tally({ sessionId: sid, learner: text(s.learner, 60), packetId: packetId, packetVersion: text(s.packetVersion, 40), title: text(s.title, 80) || packetId,
      mode: probe ? 'probe' : 'practice', form: text(s.form, 40), startedLocal: text(s.startedLocal, 40), finishedLocal: text(s.finishedLocal, 40),
      start: date && start !== null && start > 0 ? start : 0, date: date, dateFromFile: s.dateFromFile === true || !date, durationS: whole(s.durationS, 864000), activeS: whole(s.activeS, 864000), recall: cleanRecall(s.recall),
      items: items, stated: probe && s.stated && typeof s.stated === 'object' ? cleanScore(s.stated) : null, attempt: whole(s.attempt, 9999), integrity: integrity,
      source: s.source === 'json' ? 'json' : 'csv', qrShort: whole(s.qrShort, 9) || 0, sourceFile: text(s.sourceFile, 120) });
    return out.summary.done > 0 ? out : null;
  }
  // state: { sessions, merges: [{ from, into }], apart: [[a, b]], goals: [{ learner, measure, value }], savedLocal }
  // 2026-11-23: readAlong repeats the answers the items already hold, so it is left out of the file; cleanSession
  // counts it again from the items when the file is read.
  function withoutReadAlong(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s) || !own(s, 'readAlong')) return s;
    var out = {};
    Object.keys(s).forEach(function (key) { if (key !== 'readAlong') out[key] = s[key]; });
    return out;
  }
  function makeBundle(state) {
    state = state || {};
    return { kind: BUNDLE_KIND, version: BUNDLE_VERSION,
      note: 'Results as read by the Add up results page, with the learners counted as one and the goals typed there. It holds what the results files hold. Made on this device.',
      savedLocal: text(state.savedLocal, 40), sessions: (state.sessions || []).slice(0, MAX_SESSIONS).map(withoutReadAlong),
      merges: (state.merges || []).map(function (row) { return { from: text(row.from, 80), into: text(row.into, 80) }; }),
      apart: (state.apart || []).map(function (row) { return [text(row[0], 80), text(row[1], 80)]; }),
      goals: (state.goals || []).map(function (row) { return { learner: text(row.learner, 80), measure: scalar(row.measure).slice(0, 200), value: number(row.value) }; }),
      // 2026-11-17: the goal dates and the paper scores typed on the page. A page made before reads the file without them.
      goalDates: cleanGoalDates(state.goalDates, false), paper: cleanPaper(state.paper, false) };
  }
  // 2026-11-17: a day as YYYY-MM-DD, a real one, or ''.
  function dayText(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(scalar(value));
    if (!m) return '';
    var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) && Number(m[1]) >= 2000 && Number(m[1]) <= 2100 ? m[0] : '';
  }
  // Goal dates: [{ learner, measure, date }]. keyed: the learner is read again as a label key (from a file).
  function cleanGoalDates(list, keyed) {
    return (Array.isArray(list) ? list : []).slice(0, MAX_SESSIONS).map(function (row) {
      if (!row || typeof row !== 'object') return null;
      var learner = keyed ? labelKey(text(row.learner, 80)) : text(row.learner, 80);
      return { learner: learner, measure: scalar(row.measure).slice(0, 200), date: dayText(row.date) };
    }).filter(function (row) { return row && row.measure && row.date; });
  }
  // Paper scores: [{ learner, measure, name, date, value, note }]. Kept apart from the results files' scores everywhere.
  function cleanPaper(list, keyed) {
    return (Array.isArray(list) ? list : []).slice(0, MAX_SESSIONS).map(function (row) {
      if (!row || typeof row !== 'object') return null;
      var learner = keyed ? labelKey(text(row.learner, 80)) : text(row.learner, 80);
      var value = number(row.value);
      return { learner: learner, measure: scalar(row.measure).slice(0, 200), name: text(row.name, 80), date: dayText(row.date),
        value: value === null || value < 0 || value > 1000000 ? null : value, note: text(row.note, 200) };
    }).filter(function (row) { return row && typeof row.learner === 'string' && row.measure && row.name && row.date && row.value !== null; });
  }
  // Every value is read again as untrusted text, and every count is made again from the answers.
  function readBundle(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.kind !== BUNDLE_KIND) return { ok: false, reason: 'not_results' };
    if (Number(data.version) !== BUNDLE_VERSION) return { ok: false, reason: Number(data.version) > BUNDLE_VERSION ? 'newer' : 'not_results' };
    var list = function (value) { return Array.isArray(value) ? value.slice(0, MAX_SESSIONS) : []; };
    var seen = Object.create(null);
    var sessions = list(data.sessions).map(cleanSession).filter(function (s) {
      if (!s || seen[s.sessionId]) return false;
      seen[s.sessionId] = true;
      return true;
    });
    var key = function (value) { return labelKey(text(value, 80)); };
    return { ok: true, reason: '', savedLocal: text(data.savedLocal, 40), sessions: sessions,
      merges: list(data.merges).map(function (row) { return row && typeof row === 'object' ? { from: key(row.from), into: key(row.into) } : null; })
        .filter(function (row) { return row && row.from && row.into && row.from !== row.into; }),
      apart: list(data.apart).map(function (row) { return Array.isArray(row) ? [key(row[0]), key(row[1])] : null; }).filter(function (row) { return row && row[0] && row[1]; }),
      goals: list(data.goals).map(function (row) { return row && typeof row === 'object' ? { learner: key(row.learner), measure: scalar(row.measure).slice(0, 200), value: number(row.value) } : null; })
        .filter(function (row) { return row && row.measure && row.value !== null && row.value >= 0 && row.value <= 1000000; }),
      goalDates: cleanGoalDates(data.goalDates, true), paper: cleanPaper(data.paper, true) };
  }

  // ---------------------------------------------------------------------------
  // Learners
  // ---------------------------------------------------------------------------
  var NOT_NAME = /[^a-z0-9]+/g;
  try { NOT_NAME = new RegExp('[^\\p{L}\\p{N}]+', 'gu'); } catch (_) { /* an older browser: letters a to z and digits */ }
  // Letters and digits only, any case: "blue-heron 7" and "BlueHeron7" are the same label.
  function labelKey(label) {
    var source = label == null ? '' : String(label);
    try { source = source.normalize('NFKC'); } catch (_) { /* as typed */ }
    return source.toLowerCase().replace(NOT_NAME, '').slice(0, 80);
  }
  function nearlySame(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0;
    while (i < a.length && i < b.length && a.charAt(i) === b.charAt(i)) i++;
    // One letter added, left out or changed, or two neighbors swapped.
    return a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i + 1)
      || (a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2));
  }
  // Two label keys that may be one learner written two ways. It only ever leads to a question:
  // nothing is merged on this. Labels whose numbers differ ("heron7", "heron8") are never offered.
  function looksAlike(a, b) {
    if (!a || !b || a === b) return false;
    var parts = function (key) { return { letters: key.replace(/[0-9]+/g, ''), digits: key.replace(/[^0-9]+/g, '').replace(/^0+(?=.)/, '') }; };
    var x = parts(a), y = parts(b);
    if (x.letters === y.letters) return x.digits === y.digits || (x.letters.length >= 3 && (x.digits === '') !== (y.digits === ''));
    if (x.digits !== y.digits) return false;
    return Math.min(x.letters.length, y.letters.length) >= 4 && nearlySame(x.letters, y.letters);
  }
  function pairKey(a, b) { return a < b ? a + '\n' + b : b + '\n' + a; }

  // The middle of a list of scores: the median and the range of the middle half, worked out the way
  // a spreadsheet's MEDIAN and QUARTILE functions do (the position between two scores is shared out).
  function middle(values) {
    var v = (values || []).filter(function (n) { return typeof n === 'number' && isFinite(n); }).sort(function (a, b) { return a - b; });
    var n = v.length;
    if (!n) return null;
    var at = function (p) { var h = (n - 1) * p, low = Math.floor(h), high = Math.ceil(h); return Math.round((v[low] + (v[high] - v[low]) * (h - low)) * 10) / 10; };
    return { n: n, median: at(0.5), q1: at(0.25), q3: at(0.75), min: v[0], max: v[n - 1] };
  }

  // A check's results over time belong together when the measure and the packet are the same
  // (forms A, B and C of one packet are one line). A group is compared on one form only.
  function seriesKey(s) { return 'check\t' + s.measure + '\t' + s.packetId + (s.untimed ? '\tuntimed' : ''); }
  function formKey(s) { return seriesKey(s) + '\t' + s.form; }
  function setName(packetId, title) {
    var band = /-g([0-9]{1,2}-[0-9]{1,2})$/i.exec(packetId);
    if (band) return 'grades ' + band[1];
    var grade = /-g([0-9]{1,2}|k)$/i.exec(packetId);
    if (grade) return 'grade ' + grade[1].toUpperCase();
    if (title && title !== packetId) return title;
    return /^math-custom-/.test(packetId) ? 'own problem set' : packetId;
  }

  // Results to the group: one row for each learner, the measures present, and the middle of the
  // group for each check form that 5 or more learners have a score on.
  // options: { merges: { fromKey: intoKey }, apart: { pairKey: true } }
  function addUp(sessions, options) {
    var o = options || {};
    var merges = o.merges || {};
    var apart = o.apart || {};
    var into = function (key) {
      for (var hop = 0; hop < 12 && key && own(merges, key) && merges[key] !== key; hop++) key = merges[key];
      return key;
    };
    var byKey = Object.create(null), learners = [];
    (sessions || []).forEach(function (s) {
      var key = into(labelKey(s.learner));
      var learner = byKey[key];
      if (!learner) learners.push(learner = byKey[key] = { key: key, label: '', labels: [], sessions: [] });
      learner.sessions.push(s);
    });
    var strandsSeen = Object.create(null), checks = [], checkByKey = Object.create(null), formsSeen = [], formByKey = Object.create(null);
    var first = '', last = '';
    learners.forEach(function (learner) {
      learner.sessions.sort(function (a, b) { return a.start - b.start || (a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0); });
      var counts = Object.create(null);
      learner.sessions.forEach(function (s) {
        if (!s.learner) return;
        if (!counts[s.learner]) { counts[s.learner] = 0; learner.labels.push(s.learner); }
        counts[s.learner]++;
      });
      learner.label = learner.labels.slice().sort(function (a, b) { return counts[b] - counts[a]; })[0] || NO_NAME;
      learner.count = learner.sessions.length;
      learner.lastDate = '';
      learner.strands = Object.create(null);
      learner.checks = Object.create(null);
      learner.forms = Object.create(null);
      learner.formMazeNets = Object.create(null);
      learner.notes = 0;
      learner.sessions.forEach(function (s) {
        if (s.date > learner.lastDate) learner.lastDate = s.date;
        if (s.date && (!first || s.date < first)) first = s.date;
        if (s.date > last) last = s.date;
        if (s.flags.some(function (flag) { return flag !== 'no_check_value' && flag !== 'finished_early'; })) learner.notes++;
        if (s.mode !== 'probe') {
          s.byStrand.forEach(function (row) {
            strandsSeen[row.strand] = true;
            learner.strands[row.strand] = { value: row.firstTryPct, firstTry: row.firstTry, graded: row.graded, date: s.date, sessionId: s.sessionId, newFacts: row.newFacts || null };
          });
          return;
        }
        var key = seriesKey(s), form = formKey(s);
        var series = checkByKey[key];
        if (!series) checks.push(series = checkByKey[key] = { key: key, measure: s.measure, name: s.measureName, unit: s.unit, unitName: s.unitName, packetId: s.packetId, title: '', forms: [], untimed: !!s.untimed });
        if (s.title && s.title !== s.packetId && !series.title) series.title = s.title;
        if (!series.unit && s.unit) { series.unit = s.unit; series.unitName = s.unitName; }
        if (series.forms.indexOf(s.form) < 0) series.forms.push(s.form);
        if (!formByKey[form]) formsSeen.push(formByKey[form] = { key: form, series: series, form: s.form });
        // One rule for "latest" (2026-11-13): the latest result WITH a score, in the table as in the middle of the
        // group (which takes it form by form). A later result with no score (a check stopped early) is kept as a note on
        // that cell, "after". A learner with no scored result yet shows the latest result, with no score.
        var cell = { value: s.value, form: s.form, date: s.date, sessionId: s.sessionId, attempt: s.attempt, flags: s.flags, noScore: s.score ? s.score.noScore : '',
          correct: s.summary.correct, attempted: s.summary.attempted, after: null };
        var had = learner.checks[key];
        if (s.value !== null || !had || had.value === null) learner.checks[key] = cell;
        else had.after = cell;
        if (s.value !== null) {
          learner.forms[form] = s.value;
          if (s.mazeNet) learner.formMazeNets[form] = s.mazeNet.net;
        }
      });
    });
    checks.forEach(function (series) {
      // A fixed form is named by its packet (the title in a file names one form); an own set by its title.
      series.set = setName(series.packetId, series.title);
      series.label = series.name + (series.set ? ' (' + series.set + ')' : '') + (series.untimed ? ', untimed' : '');
      series.forms.sort();
    });
    learners.sort(function (a, b) { return a.label.toLowerCase() < b.label.toLowerCase() ? -1 : a.label.toLowerCase() > b.label.toLowerCase() ? 1 : 0; });
    var middles = [];
    formsSeen.forEach(function (row) {
      var values = [], mazeNets = [];
      learners.forEach(function (learner) {
        if (row.key in learner.forms) values.push(learner.forms[row.key]);
        if (row.key in learner.formMazeNets) mazeNets.push(learner.formMazeNets[row.key]);
      });
      if (values.length < MIN_GROUP) return;
      var mid = middle(values);
      var entry = { key: row.key, seriesKey: row.series.key, label: row.series.label, form: row.form, unitName: row.series.unitName,
        n: mid.n, median: mid.median, q1: mid.n >= MIN_GROUP_HALF ? mid.q1 : null, q3: mid.n >= MIN_GROUP_HALF ? mid.q3 : null, min: mid.min, max: mid.max };
      if (row.series.measure === 'maze_correct_3m' && mazeNets.length >= MIN_GROUP) {
        var nm = middle(mazeNets);
        entry.mazeNet = { n: nm.n, median: nm.median, q1: nm.n >= MIN_GROUP_HALF ? nm.q1 : null, q3: nm.n >= MIN_GROUP_HALF ? nm.q3 : null, min: nm.min, max: nm.max };
      }
      middles.push(entry);
    });
    var suggestions = [];
    for (var i = 0; i < learners.length; i++) {
      for (var j = i + 1; j < learners.length && suggestions.length < 40; j++) {
        var a = learners[i], b = learners[j];
        if (looksAlike(a.key, b.key) && !own(apart, pairKey(a.key, b.key))) suggestions.push({ pair: pairKey(a.key, b.key), a: a, b: b });
      }
    }
    return { learners: learners, count: (sessions || []).length, firstDate: first, lastDate: last,
      strands: GROUPS.filter(function (row) { return strandsSeen[row[0]]; }),
      checks: checks, middles: middles, suggestions: suggestions,
      changed: (sessions || []).filter(function (s) { return s.integrity === 'changed'; }) };
  }
  // One learner's results over time: a list of points for each skill strand and each check.
  function learnerSeries(learner, model) {
    var out = [];
    var datesOf = function (points) {
      var seen = Object.create(null), n = 0;
      points.forEach(function (p) { if (p.value !== null && p.date && !seen[p.date]) { seen[p.date] = true; n++; } });
      return n;
    };
    model.strands.forEach(function (row) {
      var points = [];
      learner.sessions.forEach(function (s) {
        if (s.mode === 'probe') return;
        s.byStrand.forEach(function (sum) {
          if (sum.strand === row[0]) points.push({ sessionId: s.sessionId, date: s.date, value: sum.firstTryPct, detail: sum.firstTry + ' of ' + sum.graded + ' on the first try', form: '', attempt: null, flags: s.flags, session: s,
            newFacts: sum.newFacts || null });
        });
      });
      if (points.length) out.push({ key: 'strand\t' + row[0], kind: 'practice', name: row[1], unitName: FIRST_TRY_UNIT, percent: true, points: points, dates: datesOf(points), formKey: '' });
    });
    model.checks.forEach(function (series) {
      var points = learner.sessions.filter(function (s) { return s.mode === 'probe' && seriesKey(s) === series.key; }).map(function (s) {
        return { sessionId: s.sessionId, date: s.date, value: s.value, detail: s.summary.correct + ' of ' + s.summary.attempted + ' right', form: s.form, attempt: s.attempt, flags: s.flags, session: s };
      });
      if (points.length) out.push({ key: series.key, kind: 'check', name: series.label, unitName: series.unitName, percent: false, points: points, dates: datesOf(points),
        formKey: formKey(points[points.length - 1].session) });
    });
    return out;
  }
  // The most frequent wrong answers across a learner's practice results.
  function wrongAnswers(sessions, limit) {
    var map = Object.create(null), list = [];
    (sessions || []).forEach(function (s) {
      if (s.mode === 'probe') return;
      s.wrong.forEach(function (row) {
        var key = row.word + '\t' + row.answer;
        if (map[key]) map[key].times += row.times; else list.push(map[key] = { word: row.word, answer: row.answer, times: row.times });
      });
    });
    return list.sort(function (a, b) { return b.times - a.times || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0); }).slice(0, limit || 8);
  }
  // Items missed across a learner's checks (probe sessions), grouped by check and item.
  function checkMissedItems(sessions, limit) {
    var map = Object.create(null), list = [];
    (sessions || []).forEach(function (s) {
      if (s.mode !== 'probe') return;
      var checkName = String(s.measureName || s.title || 'Check');
      (s.items || []).forEach(function (it) {
        if (it.practice || !it.attempted || it.correct) return;
        var label = String(it.word || it.target || '').trim();
        if (!label) return;
        var ans = Array.isArray(it.responses) && it.responses.length ? String(it.responses[it.responses.length - 1] || '').trim().slice(0, 24) : '';
        var key = checkName + '\t' + label.toLowerCase();
        if (map[key]) {
          map[key].times++;
          if (ans && map[key].answers.indexOf(ans) < 0 && map[key].answers.length < 4) map[key].answers.push(ans);
        } else {
          list.push(map[key] = { check: checkName, item: label, answers: ans ? [ans] : [], times: 1 });
        }
      });
    });
    return list.sort(function (a, b) { return b.times - a.times || (a.item < b.item ? -1 : a.item > b.item ? 1 : 0); }).slice(0, limit || 20);
  }

  // ---------------------------------------------------------------------------
  // "Save a summary (CSV)": one row for each result
  // ---------------------------------------------------------------------------
  // rows: [{ learner, session }]. UTF-8 with BOM, CRLF, every cell quoted: the results files' own rules.
  function summaryCsv(rows) {
    var lines = [SUMMARY_COLUMNS].concat((rows || []).map(function (row) {
      var s = row.session, probe = s.mode === 'probe';
      var blank = function (value) { return value === null || value === undefined ? '' : value; };
      return [text(row.learner, 80), s.date, s.measure, s.form, probe ? blank(s.value) : '', probe ? s.unit : '', blank(s.summary.accuracyPct), blank(s.summary.firstTryPct),
        s.summary.given, s.summary.attempted, blank(s.durationS), s.flags.join(';'), s.sessionId, s.packetId, s.packetVersion, s.integrity, s.sourceFile,
        s.title, s.measureName, s.summary.attempted ? Math.round(s.summary.correct / s.summary.attempted * 100) : '', blank(s.activeS)];
    }));
    return String.fromCharCode(0xFEFF) + lines.map(function (cells) { return cells.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  // ---------------------------------------------------------------------------
  // Direct .zip reader (STORE + native DecompressionStream deflate-raw, zero external libs, DOM-free)
  // Enforces strict zip-bomb caps: <= MAX_FILES entries, <= MAX_BYTES per entry (checked declared AND streamed),
  // <= MAX_ZIP_TOTAL_OUT total bytes, rejecting nested .zip and non-CSV/JSON files.
  // ---------------------------------------------------------------------------
  var MAX_ZIP_BYTES = 50 * 1024 * 1024;
  var MAX_ZIP_TOTAL_OUT = MAX_BYTES * 40;
  function u16le(b, off) { return b[off] | (b[off + 1] << 8); }
  function u32le(b, off) { return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0; }
  function zipCleanName(raw) {
    var s = String(raw || '').replace(/\\/g, '/').replace(/[\u0000-\u001f\u007f]/g, '');
    var parts = s.split('/').filter(function (seg) { return seg && seg !== '.' && seg !== '..'; });
    if (!parts.length) return '';
    var clean = parts.join('/');
    if (clean.length <= 160) return clean;
    var base = parts[parts.length - 1];
    if (base.length <= 160) return base;
    var dot = base.lastIndexOf('.');
    if (dot > 0 && base.length - dot <= 16) {
      var ext = base.slice(dot);
      return base.slice(0, 160 - ext.length) + ext;
    }
    return base.slice(0, 160);
  }
  function zipSkipMeta(name) {
    if (!name || /\/$/.test(name)) return true;
    var parts = name.split('/');
    var base = parts[parts.length - 1];
    var low = base.toLowerCase();
    if (!base || low === '.ds_store' || low === 'thumbs.db' || low === 'desktop.ini' || base.indexOf('._') === 0) return true;
    for (var i = 0; i < parts.length; i++) if (parts[i] === '__MACOSX') return true;
    return false;
  }
  function inflateRawBounded(slice, maxBytes) {
    var DS = typeof DecompressionStream === 'function' ? DecompressionStream : (root && typeof root.DecompressionStream === 'function' ? root.DecompressionStream : null);
    if (!DS) return Promise.reject(new Error('no_deflate'));
    return new Promise(function (resolve, reject) {
      var ds;
      try { ds = new DS('deflate-raw'); } catch (err) { reject(err); return; }
      var writer = ds.writable.getWriter();
      var readerStream = ds.readable.getReader();
      var chunks = [], total = 0, settled = false;
      var fail = function (err) {
        if (settled) return;
        settled = true;
        try { Promise.resolve(readerStream.cancel()).catch(function () {}); } catch (_) {}
        try { Promise.resolve(writer.abort()).catch(function () {}); } catch (_) {}
        reject(err);
      };
      writer.write(slice).then(function () { return writer.close(); }).catch(function (err) { fail(err); });
      function pump() {
        readerStream.read().then(function (step) {
          if (settled) return;
          if (step.done) {
            settled = true;
            var out = new Uint8Array(total), pos = 0;
            for (var i = 0; i < chunks.length; i++) { out.set(chunks[i], pos); pos += chunks[i].length; }
            resolve(out);
            return;
          }
          var val = step.value instanceof Uint8Array ? step.value : new Uint8Array(step.value);
          total += val.byteLength;
          if (total > maxBytes) { fail(new Error('too_big')); return; }
          chunks.push(val);
          pump();
        }, fail);
      }
      pump();
    });
  }
  async function unpackZip(input, options) {
    var opts = options || {};
    var maxFiles = Math.max(1, Math.min(MAX_FILES, Number(opts.maxFiles) || MAX_FILES));
    var maxBytes = Math.max(1, Math.min(MAX_BYTES, Number(opts.maxBytes) || MAX_BYTES));
    var bytes = input instanceof Uint8Array
      ? input
      : (ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
        : (input && typeof input.byteLength === 'number' ? new Uint8Array(input) : null));
    if (!bytes || !bytes.byteLength) return { ok: false, why: REASONS.empty, entries: [], skipped: [], leftOut: 0 };
    if (bytes.byteLength > MAX_ZIP_BYTES) return { ok: false, why: 'This .zip file is larger than 50 MB. Unzip it on your device and drop the results files in smaller groups.', entries: [], skipped: [], leftOut: 0 };
    if (bytes.byteLength < 22) return { ok: false, why: 'This .zip file could not be read.', entries: [], skipped: [], leftOut: 0 };
    var eocd = -1, minOff = Math.max(0, bytes.byteLength - 65557);
    for (var pos = bytes.byteLength - 22; pos >= minOff; pos--) {
      if (bytes[pos] === 0x50 && bytes[pos + 1] === 0x4b && bytes[pos + 2] === 0x05 && bytes[pos + 3] === 0x06) { eocd = pos; break; }
    }
    if (eocd < 0) return { ok: false, why: 'This file is not a valid .zip folder.', entries: [], skipped: [], leftOut: 0 };
    var totalEntries = u16le(bytes, eocd + 10);
    var cdSize = u32le(bytes, eocd + 12);
    var cdOffset = u32le(bytes, eocd + 16);
    if (totalEntries === 0xFFFF || cdSize === 0xFFFFFFFF || cdOffset === 0xFFFFFFFF) {
      return { ok: false, why: 'This .zip format (ZIP64) is not supported here. Unzip it on your device and drop the results files.', entries: [], skipped: [], leftOut: 0 };
    }
    if (cdOffset + cdSize > bytes.byteLength) return { ok: false, why: 'This .zip file is damaged and could not be read.', entries: [], skipped: [], leftOut: 0 };
    var TD = typeof TextDecoder === 'function' ? TextDecoder : (root && typeof root.TextDecoder === 'function' ? root.TextDecoder : null);
    var decodeUtf8 = function (arr) {
      if (TD) return new TD('utf-8').decode(arr);
      var s = '';
      for (var k = 0; k < arr.length; k++) s += String.fromCharCode(arr[k]);
      return s;
    };
    var MAX_SKIPPED = 500, MAX_CD_ENTRIES = 2000;
    var entries = [], skipped = [], leftOut = 0, totalOut = 0, cursor = cdOffset, cdEnd = cdOffset + cdSize;
    var pushSkipped = function (name, why) {
      if (skipped.length < MAX_SKIPPED) skipped.push({ name: name, why: why });
      else leftOut++;
    };
    var entryLimit = Math.min(totalEntries, MAX_CD_ENTRIES);
    if (totalEntries > MAX_CD_ENTRIES) leftOut += totalEntries - MAX_CD_ENTRIES;
    for (var i = 0; i < entryLimit && cursor + 46 <= cdEnd; i++) {
      if (u32le(bytes, cursor) !== 0x02014b50) break;
      var flags = u16le(bytes, cursor + 8);
      var method = u16le(bytes, cursor + 10);
      var compSize = u32le(bytes, cursor + 20);
      var uncompSize = u32le(bytes, cursor + 24);
      var nameLen = u16le(bytes, cursor + 28);
      var extraLen = u16le(bytes, cursor + 30);
      var commentLen = u16le(bytes, cursor + 32);
      var localOff = u32le(bytes, cursor + 42);
      var nextCursor = cursor + 46 + nameLen + extraLen + commentLen;
      if (nextCursor > cdEnd) break;
      var rawName = decodeUtf8(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
      cursor = nextCursor;
      if (/[\/\\]$/.test(String(rawName || '').replace(/[\u0000-\u001f\u007f]/g, ''))) continue;
      var clean = zipCleanName(rawName);
      if (zipSkipMeta(clean)) continue;
      if (/\.zip$/i.test(clean)) { pushSkipped(clean, 'Nested .zip folders are not opened. Unzip it on your device first.'); continue; }
      if (/\.html?$/i.test(clean)) { pushSkipped(clean, 'This is a web page (.html), not a results file.'); continue; }
      if (!/\.(csv|json)$/i.test(clean)) { pushSkipped(clean, 'Not a CSV or JSON results file.'); continue; }
      if (entries.length >= maxFiles) { leftOut++; continue; }
      if (flags & 1) { pushSkipped(clean, 'Password-protected files inside a .zip cannot be read.'); continue; }
      var remainingBudget = Math.max(0, MAX_ZIP_TOTAL_OUT - totalOut);
      var entryCap = Math.min(maxBytes, remainingBudget);
      if (uncompSize > entryCap || remainingBudget === 0) { pushSkipped(clean, REASONS.too_big); continue; }
      if (localOff + 30 > bytes.byteLength || u32le(bytes, localOff) !== 0x04034b50) { pushSkipped(clean, REASONS.unreadable); continue; }
      var lNameLen = u16le(bytes, localOff + 26);
      var lExtraLen = u16le(bytes, localOff + 28);
      var dataStart = localOff + 30 + lNameLen + lExtraLen;
      var dataEnd = dataStart + compSize;
      if (dataEnd > bytes.byteLength) { pushSkipped(clean, REASONS.unreadable); continue; }
      var payload = bytes.subarray(dataStart, dataEnd);
      var outBytes = null;
      if (method === 0) {
        if (payload.byteLength > entryCap) { pushSkipped(clean, REASONS.too_big); continue; }
        outBytes = payload;
      } else if (method === 8) {
        try { outBytes = await inflateRawBounded(payload, entryCap); }
        catch (err) {
          var code = err && err.message;
          if (code === 'too_big') pushSkipped(clean, REASONS.too_big);
          else if (code === 'no_deflate') pushSkipped(clean, 'This browser cannot open compressed .zip files. Unzip the folder first, then drop the files here.');
          else pushSkipped(clean, REASONS.unreadable);
          continue;
        }
      } else {
        pushSkipped(clean, 'This file uses an unsupported .zip compression method.');
        continue;
      }
      totalOut += outBytes.byteLength;
      if (totalOut > MAX_ZIP_TOTAL_OUT) { pushSkipped(clean, REASONS.too_big); break; }
      entries.push({ name: clean, text: decodeUtf8(outBytes), bytes: outBytes.byteLength });
    }
    if (!entries.length && !skipped.length) return { ok: false, why: 'This .zip folder has no CSV or JSON results files in it.', entries: [], skipped: [], leftOut: leftOut };
    return { ok: true, why: '', entries: entries, skipped: skipped, leftOut: leftOut };
  }

  var api = {
    VERSION: VERSION, FORMAT: FORMAT, BUNDLE_KIND: BUNDLE_KIND, BUNDLE_VERSION: BUNDLE_VERSION, MAX_BYTES: MAX_BYTES, MAX_FILES: MAX_FILES, MAX_ITEMS: MAX_ITEMS,
    MAX_SESSIONS: MAX_SESSIONS, MIN_GROUP: MIN_GROUP, MIN_GROUP_HALF: MIN_GROUP_HALF, NO_NAME: NO_NAME, COLUMNS: COLUMNS.slice(), PROBE_COLUMNS: PROBE_COLUMNS.slice(), SUMMARY_COLUMNS: SUMMARY_COLUMNS.slice(),
    STRANDS: STRANDS.map(function (row) { return row.slice(); }), OTHER_STRAND: OTHER_STRAND.slice(), ACTIVITIES: ACTIVITIES, MEASURES: MEASURES, UNITS: UNITS,
    MATH_STRANDS: MATH_STRANDS.map(function (row) { return row.slice(); }), MATH_ACTIVITIES: MATH_ACTIVITIES,
    VOCAB_STRANDS: VOCAB_STRANDS.map(function (row) { return row.slice(); }), VOCAB_ACTIVITIES: VOCAB_ACTIVITIES, VOCAB_MEASURES: VOCAB_MEASURES,
    SYMBOL_STRANDS: SYMBOL_STRANDS.map(function (row) { return row.slice(); }), SYMBOL_ACTIVITIES: SYMBOL_ACTIVITIES, SYMBOL_MEASURES: SYMBOL_MEASURES,
    READ_ALONG_STRANDS: READ_ALONG_STRANDS.map(function (row) { return row.slice(); }), READ_ALONG_ACTIVITIES: READ_ALONG_ACTIVITIES,
    EXTENDED_ACTIVITIES: EXTENDED_ACTIVITIES, EXTENDED_MEASURES: EXTENDED_MEASURES, EXTENDED_MEASURE_UNITS: EXTENDED_MEASURE_UNITS,
    MEASURE_UNITS: MEASURE_UNITS, REASONS: REASONS,
    read: read, refuse: refuse, parseCsv: parseCsv, readCsv: readCsv, readJson: readJson, finish: finish, fnv1a: fnv1a, sha256: sha256, stamp: stamp, sheetStamp: sheetStamp, csvCell: csvCell,
    labelKey: labelKey, looksAlike: looksAlike, pairKey: pairKey, middle: middle, addUp: addUp, learnerSeries: learnerSeries, wrongAnswers: wrongAnswers, checkMissedItems: checkMissedItems,
    summaryCsv: summaryCsv, makeBundle: makeBundle, readBundle: readBundle, cleanSession: cleanSession, unpackZip: unpackZip,
    dayText: dayText, cleanGoalDates: cleanGoalDates, cleanPaper: cleanPaper,
  };
  if (root) root.AlloPacketResults = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
