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
  OPS[String.fromCharCode(0x2212)] = 'sub'; OPS[String.fromCharCode(0xD7)] = 'mul'; OPS[String.fromCharCode(0xF7)] = 'div';
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

  // One problem of a teacher's list -> { a, b, op } or { display, answer }, or an Error with a plain reason.
  function checkProblem(raw, n, allowRemainders) {
    var p = raw && typeof raw === 'object' ? raw : {};
    var fail = function (reason) { throw new Error('Problem ' + n + ': ' + reason); };
    if (p.a == null && p.b == null && p.display != null) {
      var display = text(p.display).replace(/\s+/g, ' ').trim();
      if (!display) fail('the problem is empty.');
      if (display.length > 40) fail('the problem is longer than 40 characters.');
      if (p.answer == null || p.answer === '' || typeof p.answer === 'boolean' || !Number.isSafeInteger(Number(p.answer)) || Math.abs(Number(p.answer)) > 99999999) fail('the answer must be a whole number.');
      return { display: display, answer: Number(p.answer) };
    }
    if (!whole(p.a, MAX_NUMBER) || !whole(p.b, MAX_NUMBER)) fail('both numbers must be whole numbers from 0 to ' + MAX_NUMBER + '.');
    var op = own(OPS, text(p.op)) ? OPS[text(p.op)] : '';
    if (!op) fail('the operation must be add, sub, mul or div (or + - x /).');
    var a = Number(p.a), b = Number(p.b);
    var shown = a + ' ' + SIGNS[op] + ' ' + b;
    if (op === 'div' && b === 0) fail(shown + ' divides by 0.');
    if (op === 'div' && a % b !== 0) {
      if (!allowRemainders) fail(shown + ' has a remainder. Use a division that comes out even, or allow remainders.');
      // With remainders allowed the answer is the whole-number part.
      return { a: a, b: b, op: op, allowRemainder: true };
    }
    return { a: a, b: b, op: op };
  }
  function checkTimeLimit(value) {
    if (value == null || value === '' || value === 0 || value === false) return null;
    if (!whole(value, 3600) || Number(value) < 10) throw new Error('The time limit must be a whole number of seconds from 10 to 3600, or empty for no time limit.');
    return Number(value);
  }

  // A fixed form of one of the three measures. bank = the parsed psychometric_math_probes.json.
  //   lessonFromMathForm({ bank, measure: 'math_computation', grade: '3', form: 'A' })
  // practice: false leaves the sample items out; an array gives your own.
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
    return makeLesson({ lessonId: m.slug + '-g' + grade.toLowerCase(), title: m.name + ' check (' + grade + form + (untimed ? ', untimed' : '') + ')', form: form, activity: id, name: m.name,
      measure: m.code, unit: m.unit, scoringVersion: m.scoringVersion, formVersion: Number.isInteger(version) && version > 0 ? version : 1,
      timeLimitS: untimed ? null : limit, untimed: untimed, usualTimeLimitS: limit, allowSkip: m.allowSkip, grade: grade,
      practice: o.practice === false ? [] : Array.isArray(o.practice) ? o.practice : m.practice, problems: problems });
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
  function parseProblems(value) {
    return text(value).split(/[,;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean).map(function (part, i) {
      var simple = new RegExp('^(\\d+)\\s*([-+xX*/:' + String.fromCharCode(0x2212, 0xD7, 0xF7) + '])\\s*(\\d+)$').exec(part);
      if (simple) return { a: Number(simple[1]), b: Number(simple[3]), op: OPS[simple[2]] };
      var stated = /^(.*[^=\s])\s*=\s*(-?\d+)$/.exec(part);
      if (stated) return { display: stated[1].trim(), answer: Number(stated[2]) };
      throw new Error('Problem ' + (i + 1) + ': "' + part + '" is not a problem. Write it like 7+8, or like 3 + 4 + 5 = 12.');
    });
  }

  // The file. loader = AlloWordSoundsTakeHome (word_sounds_take_home_loader.js).
  //   buildCheckPacket({ lesson, title, teacherCode, loader }) -> { html, manifest, sha256 }
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
    var html = loader.buildHtml(lesson, { teacherCode: code || null, labels: o.labels || null });
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return { html: html, manifest: block ? JSON.parse(block[1]) : null, sha256: loader.sha256(html).hex };
  }

  var api = { VERSION: VERSION, MEASURES: MEASURES, lessonFromMathForm: lessonFromMathForm, lessonFromMathProblems: lessonFromMathProblems, parseProblems: parseProblems, buildCheckPacket: buildCheckPacket };
  root.AlloPacketChecks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
