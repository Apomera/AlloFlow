// AlloFlow check packets: makes a "check" file (one try, no feedback, an honest clock) from one of
// the app's fixed math forms or from a teacher's own list of problems. No AI and no app.
// One plain script for a browser page (window.AlloPacketChecks) and for node (module.exports).
// It calls nothing on the network and reads no clock; the caller hands it every input, and the
// same inputs give the same bytes.
//
// The file itself is made by the take-home loader (AlloWordSoundsTakeHome.buildHtml). The lessons
// made here hold their answers in the clear; buildHtml seals them (scrambled answers, hashed
// teacher code) before anything is written into a file. Never embed a lesson from here yourself.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-check-builder/0.1.0';
  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var PLAYER = 'alloflow-word-sounds-take-home/2';
  var MAX_PROBLEMS = 60;
  var MAX_NUMBER = 9999;

  // The three fixed-form measures. bank: the key in psychometric_math_probes.json. code: the
  // measure code the app's own records use. name: the app's visible name for the measure.
  // The time limit comes from the form (60 s, 120 s, 120 s today); timeLimitS is the fallback.
  // practice: sample items shown before the clock starts; they give feedback and are not scored.
  var MEASURES = {
    quantity_discrimination: { bank: 'QUANTITY_DISCRIMINATION_PROBES', code: 'quantity_discrimination', unit: 'items_correct', scoringVersion: 1, name: 'Quantity Discrimination',
      slug: 'quantity-discrimination', timeLimitS: 60, allowSkip: false, practice: [{ left: 2, right: 5 }, { left: 4, right: 1 }] },
    missing_number: { bank: 'MISSING_NUMBER_PROBES', code: 'missing_number', unit: 'items_correct', scoringVersion: 1, name: 'Missing Number',
      slug: 'missing-number', timeLimitS: 120, allowSkip: true, practice: [{ display: '2 + __ = 3', answer: 1 }] },
    // Scoring version 3 is math_fluency_module.js MF_SCORING_VERSION: digits correct per minute, prorated when every item is done early.
    math_computation: { bank: 'MATH_PROBE_BANKS', code: 'math_dcpm', unit: 'digits_correct_per_minute', scoringVersion: 3, name: 'Math Fluency',
      slug: 'math-computation', timeLimitS: 120, allowSkip: true, practice: [{ a: 1, b: 1, op: 'add' }] },
  };
  var OPS = { add: 'add', '+': 'add', sub: 'sub', '-': 'sub', mul: 'mul', x: 'mul', X: 'mul', '*': 'mul', div: 'div', '/': 'div', ':': 'div' };
  OPS[String.fromCharCode(0x2212)] = 'sub'; OPS[String.fromCharCode(0x2013)] = 'sub'; OPS[String.fromCharCode(0x2014)] = 'sub';
  OPS[String.fromCharCode(0xD7)] = 'mul'; OPS[String.fromCharCode(0xB7)] = 'mul'; OPS[String.fromCharCode(0x22C5)] = 'mul';
  OPS[String.fromCharCode(0xF7)] = 'div';
  var SIGNS = { add: '+', sub: '-', mul: 'x', div: String.fromCharCode(0xF7) };

  function text(value) { return value == null ? '' : String(value); }
  function own(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }
  // FNV-1a, as the loader's hashText: names a lesson by its content.
  function fnv(value) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function whole(value, max) { return value != null && value !== '' && typeof value !== 'boolean' && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= max; }

  // The revision names the content: a change to the items, the title or the timing gives a new
  // one, and so a new place in the browser's storage.
  function stamp(lesson) {
    lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.form, lesson.timeLimitS, lesson.check, lesson.blocks]));
    return lesson;
  }
  function makeLesson(spec) {
    var items = spec.practice.map(function (p, i) { return Object.assign({}, p, { id: spec.activity + '-p' + i, practice: true }); })
      .concat(spec.problems.map(function (p, i) { return Object.assign({}, p, { id: spec.activity + '-' + i }); }));
    var check = { measure: spec.measure, scoreUnit: spec.unit, scoringVersion: spec.scoringVersion, formVersion: spec.formVersion, allowSkip: !!spec.allowSkip };
    if (spec.grade) check.grade = spec.grade;
    // Untimed (an accommodation): the form's clock is taken away. usualTimeLimitS is the form's own limit, so the
    // results can say what was changed. A rate cannot be worked out without a clock.
    if (spec.untimed) { check.untimed = true; check.usualTimeLimitS = spec.usualTimeLimitS; }
    var lesson = { schema: LESSON_SCHEMA, player: PLAYER, lessonId: spec.lessonId, revision: '', language: 'en', title: spec.title, showLetters: false,
      mode: 'probe', form: spec.form, timeLimitS: spec.timeLimitS || null, check: check, activityTitles: {},
      blocks: [{ activity: spec.activity, items: items }], feedback: { correct: [], retry: null }, audio: {}, images: {}, submit: null };
    lesson.activityTitles[spec.activity] = spec.name;
    return stamp(lesson);
  }

  // The value of a problem written with numbers and + - x / (and the other signs of OPS) and brackets, worked out with
  // times and divide first; null when it holds anything else (words: then the stated answer is the teacher's to give).
  // 2026-11-13 (answer audit): "3 + 4 + 5 = 13" and "2 + 3 x 4 = 20" were taken with the answer as typed.
  function worked(display) {
    var tokens = text(display).replace(/\s+/g, '').match(/\d+|[^\d]/g) || [], at = 0, mixed = { add: false, mul: false }, zero = false;
    var sign = function (t) { return t === '(' || t === ')' ? t : own(OPS, t) ? OPS[t] : null; };
    if (!tokens.length || tokens.some(function (t) { return !/^\d+$/.test(t) && !sign(t); })) return null;
    var peek = function () { return at < tokens.length ? (/^\d+$/.test(tokens[at]) ? 'n' : sign(tokens[at])) : null; };
    var atom = function () {
      var k = peek();
      if (k === 'sub') { at++; var v = atom(); return v === null ? null : -v; }
      if (k === '(') { at++; var inner = sum(); if (peek() !== ')') return null; at++; return inner; }
      if (k !== 'n') return null;
      return Number(tokens[at++]);
    };
    var product = function () {
      var v = atom();
      while (v !== null && (peek() === 'mul' || peek() === 'div')) { var op = peek(); at++; var w = atom(); mixed.mul = true; if (op === 'div' && w === 0) zero = true; v = w === null || zero ? null : op === 'mul' ? v * w : v / w; }
      return v;
    };
    var sum = function () {
      var v = product();
      while (v !== null && (peek() === 'add' || peek() === 'sub')) { var op = peek(); at++; var w = product(); mixed.add = true; v = w === null ? null : op === 'add' ? v + w : v - w; }
      return v;
    };
    var value = sum();
    if (zero) return { zero: true };
    return value === null || at !== tokens.length || !isFinite(value) ? null : { value: value, mixed: mixed.add && mixed.mul && text(display).indexOf('(') < 0 };
  }

  // One problem of a teacher's list -> { a, b, op } or { display, answer }, or an Error with a plain reason.
  function checkProblem(raw, n, allowRemainders) {
    var p = raw && typeof raw === 'object' ? raw : {};
    var fail = function (reason) { throw new Error('Problem ' + n + ': ' + reason); };
    if (p.a == null && p.b == null && p.display != null) {
      var display = text(p.display).replace(/\s+/g, ' ').trim();
      if (!display) fail('the problem is empty.');
      if (display.length > 40) fail('the problem is longer than 40 characters.');
      if (p.answer == null || p.answer === '' || typeof p.answer === 'boolean' || !Number.isSafeInteger(Number(p.answer)) || Math.abs(Number(p.answer)) > 99999999) fail('the answer must be a whole number.');
      // A blank or a second = sign asks for something else than "type the answer" (2026-11-13, answer audit).
      if (/_{2,}/.test(display)) fail('it has a blank (__). Write the whole problem, like 3 + 4 + 5 = 12.');
      if (display.indexOf('=') >= 0) fail('write the problem with one = sign, before its answer.');
      // A problem made only of numbers and signs must have the answer it states.
      var got = worked(display);
      if (got && got.zero) fail(display + ' divides by 0.');
      if (got && Math.abs(got.value - Math.round(got.value)) > 1e-9) fail(display + ' does not come out to a whole number.');
      if (got && Math.round(got.value) !== Number(p.answer)) fail(display + ' is ' + Math.round(got.value) + ', not ' + Number(p.answer) + '.' + (got.mixed ? ' Times and divide are worked out before plus and minus: use brackets, like (2 + 3) x 4.' : ''));
      return { display: display, answer: Number(p.answer) };
    }
    if (!whole(p.a, MAX_NUMBER) || !whole(p.b, MAX_NUMBER)) fail('both numbers must be whole numbers from 0 to ' + MAX_NUMBER + '.');
    var op = own(OPS, text(p.op)) ? OPS[text(p.op)] : '';
    if (!op) fail('the operation must be add, sub, mul or div (or + - x /).');
    var a = Number(p.a), b = Number(p.b);
    var shown = a + ' ' + SIGNS[op] + ' ' + b;
    if (op === 'div' && b === 0) fail(shown + ' divides by 0.');
    if (op === 'div' && a % b !== 0 && !allowRemainders) fail(shown + ' has a remainder. Use a division that comes out even, or allow remainders.');
    // With remainders allowed the answer is the whole-number part, and every division of the check tells the student
    // to leave out the remainder (2026-11-13), so the words are no clue to which ones have one.
    if (op === 'div' && allowRemainders) return { a: a, b: b, op: op, allowRemainder: true };
    return { a: a, b: b, op: op };
  }
  function checkTimeLimit(value) {
    if (value == null || value === '' || value === 0 || value === false) return null;
    if (!whole(value, 3600) || Number(value) < 10) throw new Error('The time limit must be a whole number of seconds from 10 to 3600, or empty for no time limit.');
    return Number(value);
  }

  // The sample of a Math Fluency form (2026-11-13): one problem of the form's first operation, with numbers of as many
  // digits as its first problem of that operation (16 + 2 gives 10 + 1; 9 x 7 gives 2 x 3; 95 / 5 = 19 gives 20 / 2), easy
  // to work out, and never a problem of the form or the turnaround of one (1 + 1 is a problem of kindergarten form B).
  // null when no such problem is found; the measure's own sample is used then.
  function sampleFor(problems) {
    var list = (problems || []).filter(function (p) { return p && own(SIGNS, OPS[text(p.op)] || '') && whole(p.a, 99999999) && whole(p.b, 99999999); });
    if (!list.length) return null;
    var first = list[0], op = OPS[text(first.op)];
    var digits = function (n) { return String(Math.abs(Math.trunc(Number(n)))).length; };
    var low = function (n) { return n <= 1 ? 1 : Math.pow(10, n - 1); };
    var taken = {};
    list.forEach(function (p) { var o2 = OPS[text(p.op)]; taken[o2 + ':' + Number(p.a) + ':' + Number(p.b)] = true; if (o2 === 'add' || o2 === 'mul') taken[o2 + ':' + Number(p.b) + ':' + Number(p.a)] = true; });
    var la = digits(first.a), lb = digits(first.b), lq = op === 'div' && Number(first.b) ? digits(Number(first.a) / Number(first.b)) : 1;
    var steps = [[0, 0], [0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [0, 2], [2, 0], [2, 1], [1, 2], [2, 2], [0, 3], [3, 0], [3, 3]];
    for (var i = 0; i < steps.length; i++) {
      var da = steps[i][0], db = steps[i][1], a, b;
      if (op === 'add') { a = low(la) + da; b = low(lb) + db; }
      else if (op === 'sub') { b = low(lb) + db; a = (la === 1 ? 2 : low(la) + low(lb)) + da + db; }
      else if (op === 'mul') { a = (la === 1 ? 2 : low(la)) + da; b = (lb === 1 ? (la === 1 ? 3 : 2) : low(lb)) + db; }
      else { b = (lb === 1 ? 2 : low(lb)) + db; a = b * ((lq === 1 ? 3 : low(lq)) + da); }
      if (digits(a) !== la || digits(b) !== lb || taken[op + ':' + a + ':' + b]) continue;
      return { a: a, b: b, op: op };
    }
    return null;
  }

  // The title of a fixed form, in words (2026-11-13, owner-approved): "Missing Number, kindergarten, version A",
  // "Math Fluency, grade 3, version B, untimed". It was "Missing Number check (KA, untimed)": KA read as a code.
  // The student sees it at the top of the file and the results file's name starts with it. Readers group results by
  // the measure and the packet id (packets_results_reader.js seriesKey), never by this title.
  // 2026-11-18 (owner): the student sees this title, so it names no grade ("Missing Number, version A"); the grade is in
  // meta.grade and the packet id (-gk, -g3), which the results page reads. legacy = the 11-13 wording, for reopen.
  function formTitle(name, grade, form, untimed, legacy) {
    return name + (legacy ? ', ' + (grade === 'K' ? 'kindergarten' : 'grade ' + grade) : '') + ', version ' + form + (untimed ? ', untimed' : '');
  }

  // A fixed form of one of the three measures. bank = the parsed psychometric_math_probes.json.
  //   lessonFromMathForm({ bank, measure: 'math_computation', grade: '3', form: 'A' })
  // practice: false leaves the sample items out; an array gives your own. Left out, Math Fluency's sample is sampleFor(the form).
  // untimed: true is an accommodation: no clock, and the student does every item. The results say "untimed" and
  // keep the form's own time limit; a rate (digits correct per minute) is not worked out without a clock.
  function lessonFromMathForm(input) {
    var o = input || {};
    var id = text(o.measure);
    if (!own(MEASURES, id)) throw new Error('Unknown measure "' + id + '". Use one of: ' + Object.keys(MEASURES).join(', ') + '.');
    var m = MEASURES[id];
    var bank = o.bank && typeof o.bank === 'object' && own(o.bank, m.bank) ? o.bank[m.bank] : null;
    if (!bank || typeof bank !== 'object') throw new Error('The form bank has no ' + m.bank + '. Pass the parsed psychometric_math_probes.json as bank.');
    var grade = text(o.grade).trim().toUpperCase();
    var form = text(o.form == null ? 'A' : o.form).trim().toUpperCase();
    if (!own(bank, grade)) throw new Error('There is no ' + m.name + ' form for grade "' + grade + '". Grades with forms: ' + Object.keys(bank).sort().join(', ') + '.');
    if (!own(bank[grade], form)) throw new Error('There is no form "' + form + '" of ' + m.name + ' for grade ' + grade + '. Forms: ' + Object.keys(bank[grade]).sort().join(', ') + '.');
    var data = bank[grade][form] || {};
    var problems = Array.isArray(data.problems) ? data.problems : [];
    if (!problems.length || problems.length > MAX_PROBLEMS) throw new Error('Form ' + form + ' of ' + m.name + ' for grade ' + grade + ' has ' + problems.length + ' items; a check needs 1 to ' + MAX_PROBLEMS + '.');
    var version = Number(data.version);
    var limit = Number(data.timeLimit) > 0 ? Number(data.timeLimit) : m.timeLimitS;
    var untimed = o.untimed === true;
    var sample = id === 'math_computation' ? sampleFor(problems) : null;
    return makeLesson({ lessonId: m.slug + '-g' + grade.toLowerCase(), title: formTitle(m.name, grade, form, untimed), form: form, activity: id, name: m.name,
      measure: m.code, unit: m.unit, scoringVersion: m.scoringVersion, formVersion: Number.isInteger(version) && version > 0 ? version : 1,
      timeLimitS: untimed ? null : limit, untimed: untimed, usualTimeLimitS: limit, allowSkip: m.allowSkip, grade: grade,
      practice: o.practice === false ? [] : Array.isArray(o.practice) ? o.practice : sample ? [sample] : m.practice, problems: problems });
  }

  // A teacher's own problems, as one fixed list: every learner gets the same problems in the same order.
  //   lessonFromMathProblems({ title, problems: [{ a: 7, b: 8, op: 'add' }, { display: '3 + 4 + 5', answer: 12 }], timeLimitS: 120, allowSkip: true })
  // Answers of { a, b, op } problems are worked out here. Whole numbers only; a division must be
  // exact unless allowRemainders is true (then the answer is the whole-number part).
  // With a time limit the score is digits correct per minute; with none it is items correct.
  // Throws an Error whose message is a plain reason.
  function lessonFromMathProblems(input) {
    var o = input || {};
    var list = Array.isArray(o.problems) ? o.problems : [];
    if (list.length < 1 || list.length > MAX_PROBLEMS) throw new Error('A check needs 1 to ' + MAX_PROBLEMS + ' problems. This list has ' + list.length + '.');
    var problems = list.map(function (p, i) { return checkProblem(p, i + 1, o.allowRemainders === true); });
    var practice = (Array.isArray(o.practice) ? o.practice : []).slice(0, 5).map(function (p, i) { return checkProblem(p, 'practice ' + (i + 1), o.allowRemainders === true); });
    var limit = checkTimeLimit(o.timeLimitS);
    var m = MEASURES.math_computation;
    return makeLesson({ lessonId: 'math-custom-' + fnv(JSON.stringify(problems)), title: text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120) || 'Math check', form: 'custom',
      activity: 'math_computation', name: m.name, measure: limit ? 'math_dcpm' : 'math_items', unit: limit ? 'digits_correct_per_minute' : 'items_correct',
      scoringVersion: limit ? m.scoringVersion : 1, formVersion: 1, timeLimitS: limit, allowSkip: o.allowSkip !== false, practice: practice, problems: problems });
  }

  // "7+8, 12-5, 6x4, 20/4" -> [{ a, b, op }]; "3 + 4 + 5 = 12" -> { display, answer }. For the command line and a plain text box.
  // Also tolerates pasted worksheets: BOM, leading numbering/bullets, trailing blank = / = ? / = ___, typographic operators, and Unicode minus on negative answers.
  function parseProblems(value) {
    var simpleRe = new RegExp('^(\\d+)\\s*([-+xX*/:' + String.fromCharCode(0x2212, 0x2013, 0x2014, 0xD7, 0xB7, 0x22C5, 0xF7) + '])\\s*(\\d+)$');
    var statedRe = new RegExp('^(.*[^=\\s])\\s*=\\s*([-' + String.fromCharCode(0x2212, 0x2013) + ']?\\d+)$');
    return text(value).replace(/^\uFEFF/, '').split(/[,;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean).map(function (part, i) {
      var clean = part.replace(/^\uFEFF/, '').trim()
        .replace(/^(?:\(\d{1,3}\)|\d{1,3}[.)]|[\u2022\u25CF\u25CB\u25AA\u2023\u2043*\u2013\u2014-])\s+/, '')
        .replace(/\s*=\s*(?:\?|_+|[\u25A1\u2B1C])?$/, '').trim();
      var simple = simpleRe.exec(clean);
      if (simple) return { a: Number(simple[1]), b: Number(simple[3]), op: OPS[simple[2]] };
      var stated = statedRe.exec(clean);
      if (stated) return { display: stated[1].trim(), answer: Number(stated[2].replace(/[\u2212\u2013]/, '-')) };
      throw new Error('Problem ' + (i + 1) + ': "' + (clean || part) + '" is not a problem. Write it like 7+8, or like 3 + 4 + 5 = 12.');
    });
  }

  // 2026-11-17: spoken directions for the two checks given to the youngest students. The line of the Get ready screen
  // that says the time, as the file writes it (timeWords and check_ready_timed in the loader). L = the file's labels.
  function readyTimeLine(L, seconds) {
    var n = Math.round(Number(seconds));
    if (!(n > 0)) return text(L.check_ready_untimed);
    var time = n % 60 === 0 ? (n === 60 ? text(L.check_one_minute) : text(L.check_minutes).replace('{n}', n / 60)) : text(L.check_seconds).replace('{n}', n);
    return text(L.check_ready_timed).replace('{time}', time);
  }
  // The recordings of a check's own Get ready lines, from bank (packets_check_directions.js: { clips: { line: data URI } }).
  // Standard preset durations (1 min, 2 min, untimed) require all three recorded lines; translated labels or malformed/missing
  // clips return null. For a non-preset custom positive timer (e.g. 90 s, 3 min) whose exact time line is not recorded in
  // bank.clips, falls back to the duration-agnostic 2-clip set (task directions + one-try rule) when labels are untranslated
  // and both clips are valid, rather than speaking the wrong time or silently dropping spoken directions for K-1 students.
  var SPOKEN = { quantity_discrimination: true, missing_number: true };
  var TIME_LABELS = ['check_ready_timed', 'check_ready_untimed', 'check_one_minute', 'check_minutes', 'check_seconds'];
  function directionsFor(lesson, loader, bank, labels) {
    var block = lesson && lesson.blocks && lesson.blocks[0], activity = block ? text(block.activity) : '';
    if (!bank || typeof bank !== 'object' || !bank.clips || typeof bank.clips !== 'object' || !own(SPOKEN, activity) || !loader.CHECK_LABELS) return null;
    var baseL = loader.CHECK_LABELS;
    var L = Object.assign({}, baseL, loader.CHECK_ADAPTERS[activity].labels, labels || {});
    var howLine = text(L[activity + '_directions']);
    var timeLine = readyTimeLine(L, lesson.timeLimitS);
    var tryLine = text(L.check_ready_one_try);
    var isAudioUri = function (uri) { return /^data:audio\/(?:mpeg|wav);base64,[A-Za-z0-9+/]+=*$/.test(uri); };
    var clipFor = function (line) { return line && own(bank.clips, line) ? text(bank.clips[line]) : ''; };
    var lines = [howLine, timeLine, tryLine];
    var clips = lines.map(clipFor);
    if (clips.some(function (uri) { return !isAudioUri(uri); })) {
      var n = Math.round(Number(lesson.timeLimitS));
      var customTime = n > 0 && n !== 60 && n !== 120;
      var timeLabelsDefault = TIME_LABELS.every(function (k) { return text(L[k]) === text(baseL[k]); });
      if (customTime && timeLabelsDefault && !own(bank.clips, timeLine) && isAudioUri(clips[0]) && isAudioUri(clips[2])) {
        lines = [howLine, tryLine];
        clips = [clips[0], clips[2]];
      } else {
        return null;
      }
    }
    return { lines: lines, clips: clips, voice: text(bank.voice).slice(0, 120) || 'a machine voice' };
  }
  function safeParseManifest(raw) {
    return JSON.parse(raw, function (key, value) {
      return (key === '__proto__' || key === 'constructor' || key === 'prototype') ? undefined : value;
    });
  }
  // The manifest (the data block of the file) with more keys. Only the data block changes: the script and its hash do not.
  function withManifest(html, more) {
    var open = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(open);
    if (at < 0) return html;
    var from = at + open.length, to = html.indexOf('</script>', from), manifest;
    if (to < 0) return html;
    try { manifest = safeParseManifest(html.slice(from, to)); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    Object.keys(more).forEach(function (key) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
      manifest[key] = more[key];
    });
    var json = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }

  // The file. loader = AlloWordSoundsTakeHome (word_sounds_take_home_loader.js).
  //   buildCheckPacket({ lesson, title, teacherCode, loader, learner, directions }) -> { html, manifest, sha256 }
  // directions (2026-11-17): the recordings of packets_check_directions.js. Given, a check for the youngest students
  // carries the recording of each line of its Get ready screen, and that screen has a "Hear the directions" button.
  // Left out, the file has no sound, as before. The items, the answers and the file's version are the same either way.
  // teacherCode (4 or more characters) locks the "For the teacher" screen; it is kept in the file
  // only as a salted hash. It is a lock on a screen, not encryption.
  function buildCheckPacket(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || typeof loader.buildHtml !== 'function' || !loader.CHECK_ADAPTERS || typeof loader.sha256 !== 'function') throw new Error('buildCheckPacket needs loader (AlloWordSoundsTakeHome, with check mode)');
    if (!o.lesson || o.lesson.mode !== 'probe' || !Array.isArray(o.lesson.blocks)) throw new Error('buildCheckPacket needs a lesson from lessonFromMathForm or lessonFromMathProblems');
    var lesson = JSON.parse(JSON.stringify(o.lesson));
    var title = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (title) lesson.title = title;
    stamp(lesson);
    var code = text(o.teacherCode).trim();
    if (code && code.length < 4) throw new Error('The teacher code needs 4 or more characters.');
    if (code.length > 64) throw new Error('The teacher code can have 64 characters at most.');
    var spoken = o.directions ? directionsFor(lesson, loader, o.directions, o.labels) : null;
    var labels = o.labels || null, options = { teacherCode: code || null };
    if (spoken) {
      lesson.audio = lesson.audio && typeof lesson.audio === 'object' ? lesson.audio : {};
      lesson.directions = spoken.clips.map(function (uri, i) { var id = 'directions-' + (i + 1); lesson.audio[id] = uri; return id; });
      labels = Object.assign({ about_never: 'It never uses the microphone or the camera. It has no cookies and runs no AI. The voice that reads the directions is a set of recordings made ahead of time with a computer voice; this file makes no speech itself.' }, labels || {});
      options.attributions = ['Recordings of the directions: made ahead of time with ' + spoken.voice + '. No person has listened to each one.'];
    }
    options.labels = labels;
    var html = loader.buildHtml(lesson, options);
    if (spoken) html = withManifest(html, { speech: { engine: 'none', note: 'The file plays recordings of its directions, only when Hear the directions is pressed. It does not use the voice of the device and makes no speech.',
      recordings: { directions: spoken.clips.length, made: 'ahead of time, with ' + spoken.voice, humanReviewed: false } } });
    // learner (2026-11-13): a student's code name, put in last, exactly as withCodeName adds it to a finished file.
    if (o.learner) html = withCodeName(html, o.learner);
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return { html: html, manifest: block ? JSON.parse(block[1]) : null, sha256: loader.sha256(html).hex, spoken: spoken ? spoken.lines : null };
  }

  // A student's code name, as a file may carry it: the rule of word_sounds_packet_builder.js codeName (letters of any
  // language, digits, spaces, . _ and -, at most 40), so "Look inside a file" never reads one as code. 2026-11-13.
  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try { return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim(); } catch (_) { return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40); }
  }
  // The file with the code name in its manifest (key "learner"), which the file fills in when it opens. Only the data
  // block changes; the script and its hash do not, so one file per student is this applied to the file made with none.
  function withCodeName(html, name) {
    var clean = codeName(name), open = '<script type="application/json" id="packet-manifest">';
    var at = clean ? html.indexOf(open) : -1;
    if (at < 0) return html;
    var from = at + open.length, to = html.indexOf('</script>', from), manifest;
    if (to < 0) return html;
    try { manifest = safeParseManifest(html.slice(from, to)); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    manifest.learner = clean;
    var json = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }

  var api = { VERSION: VERSION, MEASURES: MEASURES, formTitle: formTitle, lessonFromMathForm: lessonFromMathForm, lessonFromMathProblems: lessonFromMathProblems, parseProblems: parseProblems, buildCheckPacket: buildCheckPacket,
    readyTimeLine: readyTimeLine, directionsFor: directionsFor,
    codeName: codeName, withCodeName: withCodeName };
  root.AlloPacketChecks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
