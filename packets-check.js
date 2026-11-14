// The math check maker (packets-check.html): three steps, then one check file.
// Everything happens in this tab. The page asks for nothing but the scripts it names: it fetches nothing,
// and its rule (connect-src 'none') makes the browser refuse if it tried. A check file has no sound and no
// pictures, so there is nothing else to get. The page runs without AI, and there is no account and no cookie.
// What it keeps on the device is listed under "About this page". The teacher code is never kept, and it is
// never put in an address: it is read from its box when the file is made and handed to the builder.
// 2026-11-13: a title for every check, a student's code name in the file, one file for each student in a .zip
// (packets_zip.js) and "Open a file I made" (packets_reopen.js readCheck), as on the other makers.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-check/1';
  var TRY_PAGE = 'packets-try.html';
  var OWN = 'own';
  // What each ready check asks of the learner. The name comes from the builder (the app's own name for it);
  // the grades, the time and the number of problems come from the problem sets, through the builder.
  // tests/packets_check_page.test.js compares every card with both.
  // item: what one thing to answer is called in the summary. Quantity Discrimination shows two numbers to
  // compare, which is a question; the other checks are problems to work out.
  var READY = [
    { id: 'quantity_discrimination', what: 'Tap the bigger of two numbers.', item: 'question' },
    { id: 'missing_number', what: 'Type the number that is missing from a number sentence, like {example}.' },
    { id: 'math_computation', what: 'Add, subtract, multiply or divide, a different mix for each grade.' },
  ];
  var OWN_NAME = 'My own problems';
  var GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  var TIME_CHOICES = [0, 60, 120, 180, 300];   // seconds; 0 is no clock
  var TIME_DEFAULT = 120;
  var OP_WORDS = [['add', 'add'], ['sub', 'subtract'], ['mul', 'multiply'], ['div', 'divide']];
  var CODE_MIN = 4, CODE_MAX = 64;             // the builder's own limits; it has the last word when the file is made
  var MAX_TYPED = 4000;
  var MAX_STUDENTS = 40;                       // "Make one for each student": files in one .zip, as on the other makers
  var NBSP = String.fromCharCode(0xA0);

  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  var setText = function (id, text) { var node = $(id); if (node) node.textContent = text; };
  var show = function (id, on) { var node = $(id); if (node) node.hidden = !on; };
  var has = function (object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  var listed = function (names) { return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names.join(''); };
  var capital = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };
  var fileSize = function (bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1000)) + ' KB'; };
  var productName = function () { var node = $('product-name'); return node ? String(node.textContent || '').trim() : ''; };
  var said = function (error) { return String((error && error.message) || error || ''); };

  var loader, builder;
  var bank = {};            // the problem sets, under the names the builder asks for
  var ready = [];           // the ready checks this page can make
  var lessons = {};         // one lesson for each check, grade and version, as the builder makes it
  var state = null;
  var step = 1;
  var ownRows = [], ownStop = '', ownTimer = 0;
  var fallbackTitle = '';
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '', batchFile = null, batchBusy = false;

  // untimed (an accommodation) is for one student's file: it is not kept, so the page never opens with it on.
  // title: the title of your own problems; readyTitle (2026-11-13): a title for a ready check, empty for the builder's own.
  // learner (2026-11-13): a student's code name for the file. It is not kept: the next file is often for someone else.
  function defaults() { return { check: '', grades: {}, version: '', problems: '', title: '', readyTitle: '', time: TIME_DEFAULT, skip: true, untimed: false, learner: '' }; }

  // ---------------------------------------------------------------------------
  // What this page keeps: the last choices, in this browser only. Never the teacher code or a code name.
  // ---------------------------------------------------------------------------
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, check: state.check, grades: state.grades, version: state.version,
        problems: state.problems, title: state.title, readyTitle: state.readyTitle, time: state.time, skip: state.skip }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
    if (!saved || saved.v !== 1) return fresh;
    if (saved.check === OWN || readyRow(saved.check)) fresh.check = saved.check;
    ready.forEach(function (row) {
      var grade = saved.grades && typeof saved.grades === 'object' && has(saved.grades, row.id) ? saved.grades[row.id] : '';
      if (row.grades.indexOf(grade) >= 0) fresh.grades[row.id] = grade;
    });
    if (typeof saved.version === 'string' && /^[A-Z]$/.test(saved.version)) fresh.version = saved.version;
    if (typeof saved.problems === 'string') fresh.problems = saved.problems.slice(0, MAX_TYPED);
    if (typeof saved.title === 'string') fresh.title = saved.title.slice(0, 80);
    if (typeof saved.readyTitle === 'string') fresh.readyTitle = saved.readyTitle.slice(0, 80);
    if (TIME_CHOICES.indexOf(saved.time) >= 0) fresh.time = saved.time;
    if (typeof saved.skip === 'boolean') fresh.skip = saved.skip;
    return fresh;
  }

  // ---------------------------------------------------------------------------
  // The ready checks, read from the problem sets through the builder
  // ---------------------------------------------------------------------------
  function byGrade(a, b) {
    var x = GRADE_ORDER.indexOf(a), y = GRADE_ORDER.indexOf(b);
    if (x < 0 || y < 0) return x < 0 && y < 0 ? (a < b ? -1 : a > b ? 1 : 0) : x < 0 ? 1 : -1;
    return x - y;
  }
  function formLesson(id, grade, version, untimed) {
    var key = id + '|' + grade + '|' + version + (untimed ? '|untimed' : '');
    if (!has(lessons, key)) {
      try { lessons[key] = builder.lessonFromMathForm({ bank: bank, measure: id, grade: grade, form: version, untimed: !!untimed }); } catch (_) { lessons[key] = null; }
    }
    return lessons[key];
  }
  function versionsOf(id, grade) {
    var measure = builder.MEASURES[id], sets = measure ? bank[measure.bank] : null;
    var forms = sets && has(sets, grade) && sets[grade] && typeof sets[grade] === 'object' ? sets[grade] : {};
    return Object.keys(forms).sort().filter(function (version) { return !!formLesson(id, grade, version); });
  }
  function readyRow(id) {
    for (var i = 0; i < ready.length; i++) if (ready[i].id === id) return ready[i];
    return null;
  }
  function scoredItems(lesson) { return lesson.blocks[0].items.filter(function (item) { return !item.practice; }); }
  function minutes(seconds) { return seconds % 60 === 0 ? count(seconds / 60, 'minute') : count(seconds, 'second'); }
  function gradeWord(grade, first) { return grade === 'K' ? (first ? 'Kindergarten' : 'kindergarten') : (first ? 'Grade ' : 'grade ') + grade; }
  // "Kindergarten and grade 1", "Kindergarten to grade 5": the grades a check has, in words.
  function gradeSpan(grades) {
    var names = grades.map(function (grade, i) { return gradeWord(grade, i === 0); });
    var at = grades.map(function (grade) { return GRADE_ORDER.indexOf(grade); });
    var inARow = at.every(function (n, i) { return n >= 0 && (i === 0 || n === at[i - 1] + 1); });
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.length > 2 && inARow ? names[0] + ' to ' + names[names.length - 1] : listed(names);
  }
  function readReady() {
    var out = [];
    READY.forEach(function (card) {
      var measure = builder.MEASURES && has(builder.MEASURES, card.id) ? builder.MEASURES[card.id] : null;
      var sets = measure ? window[measure.bank] : null;
      if (!measure || !sets || typeof sets !== 'object') return;
      bank[measure.bank] = sets;
      var grades = Object.keys(sets).filter(function (grade) { return versionsOf(card.id, grade).length > 0; }).sort(byGrade);
      if (!grades.length) return;
      var limits = [];
      grades.forEach(function (grade) {
        versionsOf(card.id, grade).forEach(function (version) {
          var limit = formLesson(card.id, grade, version).timeLimitS;
          if (limits.indexOf(limit) < 0) limits.push(limit);
        });
      });
      limits.sort(function (a, b) { return a - b; });
      // The example in a card's text is a real problem: the first one of grade 1, version A, when there is one.
      // Its spaces do not break (2026-11-13, teacher-journey L11): "__ + 8 = 14" stays on one line at any width.
      var shown = formLesson(card.id, '1', 'A') || formLesson(card.id, grades[0], versionsOf(card.id, grades[0])[0]);
      var example = String(scoredItems(shown)[0].display || '').replace(/ /g, NBSP);
      var what = card.what.replace('{example}', function () { return example; });
      var time = limits.length > 1 ? minutes(limits[0]) + ' to ' + minutes(limits[limits.length - 1]) : minutes(limits[0]);
      out.push({ id: card.id, name: measure.name, slug: measure.slug, what: what, grades: grades, item: card.item || 'problem',
        line: what + ' ' + capital(time) + '. ' + gradeSpan(grades) + '.' + (measure.unit === 'digits_correct_per_minute' ? ' Scored by digits correct per minute.' : '') });
    });
    return out;
  }
  // What one version holds, in numbers: said at step 2 and again in the summary.
  function mixOf(lesson) {
    var items = scoredItems(lesson), top = 0;
    var ops = OP_WORDS.filter(function (row) { return items.some(function (item) { return item.op === row[0]; }); }).map(function (row) { return row[1]; });
    items.forEach(function (item) {
      ['a', 'b', 'left', 'right', 'answer'].forEach(function (key) { if (typeof item[key] === 'number' && item[key] > top) top = item[key]; });
      (String(item.display || '').match(/\d+/g) || []).forEach(function (n) { if (Number(n) > top) top = Number(n); });
    });
    return (ops.length ? capital(listed(ops)) + '. ' : '') + 'Numbers up to ' + top + '.';
  }

  // ---------------------------------------------------------------------------
  // Step 1: which check
  // ---------------------------------------------------------------------------
  function drawCards() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="check"]'), function (radio) {
      if (radio.value === OWN) return;
      var row = readyRow(radio.value), label = radio.parentNode;
      label.hidden = !row;
      if (!row) return;
      label.querySelector('.choice-name').textContent = row.name;
      label.querySelector('.choice-line').textContent = row.line;
    });
  }
  function syncRadios(name, value) {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="' + name + '"]'), function (radio) {
      radio.checked = radio.value === value;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
  }
  function syncCheck() {
    var mine = state.check === OWN;
    syncRadios('check', state.check);
    setText('tab-2-name', mine ? 'Your problems' : 'Grade and version');
    setText('step-2-title', mine ? 'Your problems' : 'Grade and version');
    setText('next-1', mine ? 'Next: type the problems' : 'Next: grade and version');
    if (state.check) setText('step-1-problem', '');
  }

  // ---------------------------------------------------------------------------
  // Step 2, a ready check: grade and version
  // ---------------------------------------------------------------------------
  function drawRadios(hostId, name, rows, value, describedBy, onChange) {
    var host = $(hostId);
    host.textContent = '';
    rows.forEach(function (row) {
      var label = el('label', 'radio'), radio = el('input');
      radio.type = 'radio';
      radio.name = name;
      radio.value = row[0];
      if (describedBy) radio.setAttribute('aria-describedby', describedBy);
      radio.checked = row[0] === value;
      radio.addEventListener('change', function () { if (radio.checked) onChange(row[0]); });
      label.appendChild(radio);
      label.appendChild(doc.createTextNode(' ' + row[1]));
      label.classList.toggle('is-on', radio.checked);
      host.appendChild(label);
    });
  }
  function gradeNow() {
    var row = readyRow(state.check), grade = row && has(state.grades, row.id) ? state.grades[row.id] : '';
    return row && row.grades.indexOf(grade) >= 0 ? grade : '';
  }
  // The versions of the chosen grade (before a grade is chosen, of the first grade).
  function versionsNow() { var row = readyRow(state.check); return row ? versionsOf(row.id, gradeNow() || row.grades[0]) : []; }
  function versionNow() { var versions = versionsNow(); return versions.indexOf(state.version) >= 0 ? state.version : versions[0] || ''; }
  function drawVersions() {
    drawRadios('versions', 'version', versionsNow().map(function (version) { return [version, 'Version ' + version]; }), versionNow(), 'version-hint', function (version) {
      state.version = version;
      remember();
      syncRadios('version', version);
      drawFormLine();
    });
  }
  function drawFormLine() {
    var grade = gradeNow();
    if (!grade) { setText('form-line', 'Choose a grade.'); setText('form-sub', ''); return; }
    var lesson = formLesson(state.check, grade, versionNow(), state.untimed);
    var items = lesson.blocks[0].items, practice = items.length - scoredItems(lesson).length;
    setText('form-line', count(scoredItems(lesson).length, readyRow(state.check).item) + '. ' + (lesson.timeLimitS ? capital(minutes(lesson.timeLimitS)) : state.untimed ? 'Untimed: no clock' : 'No clock') + '. '
      + (practice ? count(practice, 'practice question') + ' first.' : 'No practice questions.'));
    setText('form-sub', mixOf(lesson));
    setText('step-2-problem', '');
  }
  function drawUntimed() {
    var row = readyRow(state.check), box = $('f-untimed');
    if (!row || !box) return;
    box.checked = !!state.untimed;
    box.parentNode.classList.toggle('is-on', box.checked);
    if (box.checked) $('untimed-box').open = true;
    setText('untimed-item', row.item);
    show('untimed-rate', builder.MEASURES[row.id].unit === 'digits_correct_per_minute');
  }
  function drawReady() {
    var row = readyRow(state.check);
    setText('ready-intro', row.name + '. ' + row.what);
    drawUntimed();
    drawRadios('grades', 'grade', row.grades.map(function (grade) { return [grade, gradeWord(grade, true)]; }), gradeNow(), '', function (grade) {
      state.grades[row.id] = grade;
      remember();
      syncRadios('grade', grade);
      drawVersions();
      drawFormLine();
    });
    drawVersions();
    drawFormLine();
  }

  // ---------------------------------------------------------------------------
  // Step 2, my own problems: each one is looked at by the builder, with its reason in plain words
  // ---------------------------------------------------------------------------
  function typedParts() {
    return String(state.problems || '').split(/[,;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean);
  }
  // The builder's reason for one problem, without its "Problem 1:" and without the choice this page does not offer.
  function reason(error) {
    return capital(said(error).replace(/^Problem [^:]*: /, '').replace(/^".*" is not a problem\./, 'This is not a problem.').replace(', or allow remainders.', '.'));
  }
  function checkPart(part) {
    var out = function (says) { return { text: part, ok: false, says: says }; };
    var parsed, problem, given = null, raw, made;
    // A number with a decimal point ("2.5 + 1") is a problem, with a number this check does not take.
    if (/\d\.\d|(?:^|[^\d])\.\d/.test(part)) return out('Whole numbers only.');
    try { parsed = builder.parseProblems(part); } catch (error) { return out(reason(error)); }
    if (parsed.length !== 1) return out('This is not a problem.');
    problem = parsed[0];
    // "7 + 8 = 15": the left side is a plain problem, so it is held to the same rules and the answer has to agree.
    if (problem.display != null) {
      var inner = null;
      try { inner = builder.parseProblems(problem.display); } catch (_) { inner = null; }
      if (inner && inner.length === 1 && inner[0].display == null) { given = problem.answer; problem = inner[0]; }
    }
    try { raw = builder.lessonFromMathProblems({ problems: [problem] }).blocks[0].items[0]; } catch (error) { return out(reason(error)); }
    try { made = loader.CHECK_ADAPTERS.math_computation.prepare(raw, {}); } catch (_) { made = null; }
    if (!made || !made.item) return out('This cannot be used' + (made && made.missing ? ': it needs ' + made.missing.join(', ') : '') + '.');
    if (given != null && String(given) !== made.item.answer) return out(made.item.word + ' is ' + made.item.answer + ', not ' + given + '.');
    // An answer below 0 is shown with the minus sign the problems use (U+2212), not a hyphen (2026-11-13, teacher-journey pass).
    return { text: made.item.word, ok: true, problem: problem, answer: made.item.answer, says: 'Ready. The answer ' + (problem.display != null ? 'you gave is ' : 'is ') + String(made.item.answer).replace(/^-/, '−') + '.' };
  }
  // Answers below 0 are allowed; the teacher is told, in case one was typed the wrong way round (3 - 5 for 5 - 3). 2026-11-13.
  function belowZero(rows) {
    var below = rows.filter(function (row) { return row.ok && /^-/.test(row.answer); });
    if (!below.length) return '';
    return (below.length === 1 ? below[0].text + ' has an answer below 0' : count(below.length, 'problem') + ' have an answer below 0 (' + listed(below.slice(0, 3).map(function (row) { return row.text; })) + (below.length > 3 ? ' and more' : '') + ')')
      + ': the keypad in the file gets a minus key. Change ' + (below.length === 1 ? 'it' : 'them') + ' if that is not what you meant.';
  }
  function ownLesson() {
    return builder.lessonFromMathProblems({ title: state.title, problems: ownRows.filter(function (row) { return row.ok; }).map(function (row) { return row.problem; }),
      timeLimitS: state.time || null, allowSkip: state.skip });
  }
  function drawOwn() {
    clearTimeout(ownTimer);
    var parts = typedParts(), list = $('own-list');
    ownRows = parts.map(checkPart);
    list.textContent = '';
    ownRows.forEach(function (row) {
      var item = el('li', row.ok ? 'is-ok' : 'is-out');
      item.appendChild(el('span', 'w', row.text));
      item.appendChild(el('span', 's', row.says));
      list.appendChild(item);
    });
    var good = ownRows.filter(function (row) { return row.ok; }).length, bad = ownRows.length - good;
    var line = good + ' of ' + count(ownRows.length, 'problem') + ' can be used.';
    ownStop = '';
    if (!parts.length) { line = 'Type or paste your problems above.'; ownStop = 'Type at least one problem to go on.'; }
    else if (bad) ownStop = count(bad, 'problem') + ' cannot be used. Change ' + (bad === 1 ? 'it' : 'them') + ' or take ' + (bad === 1 ? 'it' : 'them') + ' out to go on.';
    else { try { ownLesson(); } catch (error) { line = ownStop = said(error); } }
    if (!ownStop && belowZero(ownRows)) line += ' ' + belowZero(ownRows);
    setText('own-line', line);
    if (!ownStop) setText('step-2-problem', '');
  }
  function drawOwnPanel() {
    if ($('f-problems').value !== state.problems) $('f-problems').value = state.problems;
    drawRadios('times', 'time', TIME_CHOICES.map(function (seconds) { return [String(seconds), seconds ? minutes(seconds) : 'No clock']; }), String(state.time), 'time-hint', function (value) {
      state.time = Number(value);
      remember();
      syncRadios('time', value);
    });
    $('f-skip').checked = state.skip;
    $('f-skip').parentNode.classList.toggle('is-on', state.skip);
    drawOwn();
  }

  // ---------------------------------------------------------------------------
  // The teacher code: read from its box, never kept
  // ---------------------------------------------------------------------------
  function codeNow() { var box = $('f-code'); return box ? String(box.value || '').trim() : ''; }
  function codeProblem() {
    var code = codeNow();
    if (code && code.length < CODE_MIN) return 'The teacher code needs ' + CODE_MIN + ' or more characters.';
    if (code.length > CODE_MAX) return 'The teacher code can have ' + CODE_MAX + ' characters at most.';
    return '';
  }
  // The line under the box says only what the hints above do not (2026-11-13, teacher-journey L10): a problem with the
  // code, or that the answers screen will ask for it. With no code it is empty: the hint already says what that means.
  function drawCode() {
    var stop = codeProblem();
    setText('code-line', stop || (codeNow() ? 'The answers screen will ask for this code.' : ''));
  }
  // The box hides the code as it is typed: a class may be looking at the screen. "Show" lets the teacher read it
  // back. The button keeps its name and says, with aria-pressed, whether the code is shown.
  function showCode(on) {
    var box = $('f-code'), button = $('code-show');
    if (!box || !button) return;
    box.setAttribute('type', on ? 'text' : 'password');
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.classList.toggle('btn-primary', !!on);
  }

  // ---------------------------------------------------------------------------
  // Step 3: make the file
  // ---------------------------------------------------------------------------
  // The name of the file: for a ready check the builder's own short name with the grade and the version, as the
  // app names the same file; for a list of problems, its title. A student's code name comes last (...__BlueHeron7.html).
  function fileStem(title) {
    var stem = String(title == null ? '' : title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return stem || 'math-check';
  }
  function withName(name, learner) {
    var code = String(learner || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return code ? name.replace(/\.html$/, '__' + code + '.html') : name;
  }
  function codeNameNow() { return builder.codeName(state.learner); }
  // The title field (2026-11-13): the title of your own problems, or a title for a ready check. Left empty, the check's own.
  function titleFallback() {
    if (state.check === OWN) return fallbackTitle;
    var row = readyRow(state.check), grade = gradeNow();
    return row && grade ? builder.formTitle(row.name, grade, versionNow(), !!state.untimed) : '';
  }
  function drawTitle() {
    var field = $('f-title'), typed = state.check === OWN ? state.title : state.readyTitle;
    if (field && field.value !== typed) field.value = typed;
    setText('title-hint', 'The student sees it at the top of the file. The results file\'s name starts with it. Left empty, it is "' + titleFallback() + '".');
  }
  function syncCodeName() {
    var field = $('f-code-name');
    if (field && field.value !== state.learner) field.value = state.learner;
    var clean = codeNameNow(), typed = String(state.learner || '').trim();
    setText('code-name-said', typed && clean !== typed ? (clean ? 'The file will have: ' + clean + '. A code name keeps letters, digits, spaces, dots, dashes and underscores.' : 'A code name needs a letter or a number.') : '');
    if (typed) $('code-name-box').open = true;
  }
  // One check, as one version of it: the version picks the problems of a ready check. Your own problems have no versions.
  function planFor(version) {
    if (state.check === OWN) {
      var mine = ownLesson();
      return { own: true, lesson: mine, version: '', name: fileStem(mine.title) + '.html', problems: ownRows.filter(function (row) { return row.ok; }).map(function (row) { return row.text; }) };
    }
    var row = readyRow(state.check), grade = gradeNow(), lesson = formLesson(row.id, grade, version, state.untimed);
    if (!lesson) throw new Error('there is no version ' + version + ' for this grade');
    return { own: false, row: row, grade: grade, version: version, untimed: !!state.untimed, lesson: lesson, title: state.readyTitle,
      name: row.slug + '-g' + grade + '-' + version + (state.untimed ? '-untimed' : '') + '.html' };
  }
  function plan() { return planFor(state.check === OWN ? '' : versionNow()); }
  function buildFor(todo, learner) {
    return builder.buildCheckPacket({ lesson: todo.lesson, title: todo.own ? '' : todo.title, teacherCode: codeNow(), loader: loader, learner: learner || '' });
  }
  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    dropBatchFile();
    show('summary', false);
    show('try', false);
    show('save', false);
    show('after-save', false);
    show('build-problem', false);
    clearPaper();
  }
  function making(text) {
    show('making', true);
    setText('making-line', text);
  }
  function problem(text) {
    show('making', false);
    setText('build-problem-text', text);
    show('build-problem', true);
    setText('making-said', text);
  }
  function makeSoon(delay) {
    clearTimeout(buildTimer);
    clearBuilt();
    making('Putting the file together.');
    buildTimer = setTimeout(make, delay);
  }
  function make() {
    clearTimeout(buildTimer);
    clearBuilt();
    var run = buildRun, todo, result;
    try {
      todo = plan();
      result = buildFor(todo, state.learner);
    } catch (error) {
      if (run === buildRun) problem('The file could not be put together (' + (said(error) || 'no reason was given') + '). Your choices are still here.');
      return;
    }
    if (run === buildRun) drawResult(result, todo);
  }
  function drawResult(result, todo) {
    show('making', false);
    var check = result.manifest.check, limit = check.timeLimitS, items = check.items, practice = check.practiceItems;
    var coded = check.teacherCode !== 'none';
    var blob = new Blob([result.html], { type: 'text/html' });
    var learner = codeNameNow();
    built = { html: result.html, name: withName(todo.name, learner), bytes: blob.size, coded: coded, title: result.manifest.title, todo: todo };
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    // "question" for Quantity Discrimination, "problem" for every other check and for the teacher's own list.
    var item = todo.own ? 'problem' : todo.row.item;
    var skip = todo.lesson.check.allowSkip ? 'The student may skip a ' + item + '.' : 'There is no skip button.';
    var score = check.scoreUnit === 'digits_correct_per_minute' ? 'The score is digits correct per minute.' : 'The score is the number of ' + item + 's correct.';
    var rows = [['Check', todo.own ? OWN_NAME : todo.row.name]];
    if (!todo.own) rows.push(['Grade', gradeWord(todo.grade, true)], ['Version', todo.version]);
    rows.push([capital(item) + 's', todo.own ? items + ': ' + todo.problems.join(', ') + '. ' + skip : items + '. ' + mixOf(todo.lesson) + ' ' + skip]);
    var usual = todo.untimed && todo.lesson.check.usualTimeLimitS;
    if (usual && check.scoreUnit === 'digits_correct_per_minute') score = 'There is no score per minute: the results show the digits and the ' + item + 's correct.';
    rows.push(['Time', (limit ? capital(minutes(limit)) + '. The clock does not stop and does not give time back. '
      : usual ? 'Untimed (an accommodation): no clock, the student does every ' + item + '. The usual time is ' + minutes(usual) + '. The results say "untimed" and are kept apart from timed results. '
      : 'No clock. ') + score]);
    rows.push(['Practice first', practice ? count(practice, 'practice question') + ', not scored.' : 'None.']);
    rows.push(['Teacher screen', coded ? 'Opens only with your teacher code. It shows the score and each answer.' : 'Shows only the score, not each answer. No teacher code is set.']);
    rows.push(['Title', result.manifest.title]);
    if (learner) rows.push(['Code name', learner + '. The file opens with it filled in.']);
    rows.push(['File', built.name + ', ' + fileSize(built.bytes) + '.']);
    var host = $('summary-rows');
    host.textContent = '';
    rows.forEach(function (row) {
      host.appendChild(el('dt', '', row[0]));
      host.appendChild(el('dd', '', row[1]));
    });
    setText('summary-facts', count(items, item) + '. ' + (limit ? capital(minutes(limit)) : usual ? 'Untimed' : 'No clock') + '. ' + fileSize(built.bytes) + '.');
    show('summary', true);
    if (fileUrl) { $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl); show('try', true); }
    show('save', true);
    // The paper copy comes from the same lesson, under the file's title. If it cannot be drawn, there is no print button.
    try { drawPaper(Object.assign({}, todo.lesson, { title: result.manifest.title || todo.lesson.title })); } catch (_) { clearPaper(); }
    setText('making-said', 'The file is ready: ' + count(items, item) + ', ' + fileSize(built.bytes) + '.');
    drawBatch();
  }
  function download(url, name) {
    var link = doc.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
  }
  function saveFile() {
    if (!built) return;
    var url = fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) return problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
    download(url, built.name);
    show('after-code', built.coded);
    show('after-save', true);
    $('after-save').focus();
  }

  // ---------------------------------------------------------------------------
  // Step 3: "Make one for each student" (2026-11-13, as on the Word Sounds and vocabulary makers). One file for each
  // code name, in one .zip file (packets_zip.js). Each file is the one above with the code name in its manifest
  // (builder.withCodeName), which is exactly what a single make with that code name gives. A ready check can give the
  // students versions A, B and C in turn; each version is made once.
  // ---------------------------------------------------------------------------
  function batchList() {
    var seen = {}, out = { names: [], twice: [], unusable: [], over: 0 };
    String(($('f-batch-names') && $('f-batch-names').value) || '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var name = builder.codeName(line);
      if (!name) { out.unusable.push(line.trim().slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }
  function batchRotates() { return state.check !== OWN && !!($('f-batch-rotate') && $('f-batch-rotate').checked) && versionsNow().length > 1; }
  // The version of each student's file: the one chosen for all, or the versions in turn from the one chosen.
  function batchVersions(n) {
    var versions = versionsNow(), start = Math.max(0, versions.indexOf(versionNow())), out = [];
    for (var i = 0; i < n; i++) out.push(batchRotates() ? versions[(start + i) % versions.length] : '');
    return out;
  }
  function drawBatch() {
    show('batch-more', state.check !== OWN && versionsNow().length > 1);
    if (batchBusy) return;
    var list = batchList(), n = list.names.length, parts = [];
    if (!n) parts.push('Type or paste the code names, one on each line.');
    else parts.push(count(n, 'file') + (built ? ', about ' + fileSize(n * built.bytes) + ' in all.' : '. The size shows here once the file above is ready.'));
    if (n && batchRotates()) parts.push('Versions ' + listed(versionsNow()) + ' in turn, starting with ' + versionNow() + '.');
    if (list.over) parts.push('Not used: ' + count(list.over, 'more code name') + '. At most ' + MAX_STUDENTS + ' go in one .zip file.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    if (batchFile) parts = ['Ready: ' + count(batchFile.count, 'file') + ' in one .zip file, ' + fileSize(batchFile.bytes) + '.'];
    setText('batch-said', parts.join(' '));
  }
  function dropBatchFile() {
    if (batchFile && batchFile.url) { try { URL.revokeObjectURL(batchFile.url); } catch (_) {} }
    batchFile = null;
    show('batch-save', false);
  }
  function makeBatch() {
    setText('batch-problem', '');
    dropBatchFile();
    var list = batchList();
    if (!list.names.length) { setText('batch-problem', 'Type at least one code name.'); return; }
    if (!built) { setText('batch-problem', 'The file above is not ready yet.'); return; }
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') { setText('batch-problem', 'This page could not load the part that makes .zip files. Load the page again.'); return; }
    var versions = batchVersions(list.names.length), bases = {};
    try {
      var zip = window.AlloPacketZip.create(), encoder = new TextEncoder();
      list.names.forEach(function (name, i) {
        var version = versions[i];
        if (!bases[version]) {
          var todo = version ? planFor(version) : built.todo;
          bases[version] = { html: buildFor(todo, '').html, name: todo.name };
        }
        zip.add(withName(bases[version].name, name), encoder.encode(builder.withCodeName(bases[version].html, name)));
      });
      var parts = zip.finish();
      var todo0 = built.todo;
      var stem = todo0.own ? fileStem(built.title) : todo0.row.slug + '-g' + todo0.grade + (versions[0] ? '' : '-' + todo0.version) + (todo0.untimed ? '-untimed' : '');
      batchFile = { parts: parts, bytes: zip.bytes, count: list.names.length, name: stem + '__' + list.names.length + '-students.zip', url: '' };
    } catch (error) { setText('batch-problem', 'The .zip file could not be made (' + said(error) + ').'); return; }
    show('batch-save', true);
    drawBatch();
  }
  function saveBatch() {
    if (!batchFile) return;
    if (!batchFile.url) { try { batchFile.url = URL.createObjectURL(new Blob(batchFile.parts, { type: 'application/zip' })); } catch (_) { batchFile.url = ''; } }
    if (!batchFile.url) { setText('batch-problem', 'This browser cannot save files from a page.'); return; }
    download(batchFile.url, batchFile.name);
    setText('batch-said', 'Saved ' + batchFile.name + '. Each file\'s name ends with the student\'s code name. Send each student their own file.');
  }

  // ---------------------------------------------------------------------------
  // The paper copy: the same check on paper, for a learner with no device
  // ---------------------------------------------------------------------------
  // It is drawn from the lesson the file is made from, each item through the loader's own prepare step (the step that
  // seals it into the file), so the problems, their order and the answers are the file's. It is never shown on screen:
  // while a file is ready, printing the page prints it and nothing else (packets-check-print.css).
  // Sizes are in millimeters. A sheet holds what fits inside the print margins on the smaller of US Letter and A4
  // (180 mm across, 255 mm down on Letter), so either paper gives the same pages. The heights of the boxes are the ones
  // in packets-check-print.css: change them together.
  var PAPER = { across: 180, down: 238, page: 8, turn: 8, stack: 36, tall: 44, line: 18, pair: 24 };
  // What the learner reads on paper: the file's own directions, with the word for paper (tap and type become circle and write).
  var PAPER_HOW = { quantity_discrimination: 'Circle the bigger number.', missing_number: 'Write the missing number.', math_computation: 'Write the answer to each one.' };
  var DIVIDE = String.fromCharCode(0xF7);
  var BLANK = /_{2,}/;
  var paperOn = false;
  // Numbers and signs as the file shows them on screen (math_computation.js, missing_number.js; 2026-11-13): the minus sign,
  // times and divide, never a hyphen or an x, and a number of 10000 or more in groups of three with a narrow no-break space,
  // which reads the same in every language (a comma is a decimal mark in many).
  var GAP = String.fromCharCode(0x202F);
  function shown(text) {
    return String(text).replace(/(^|\s)-(?=\s|\d)/g, function (all, lead) { return lead + String.fromCharCode(0x2212); })
      .replace(/([\d_]) [xX*] (?=[\d_])/g, function (all, lead) { return lead + ' ' + String.fromCharCode(0xD7) + ' '; })
      .replace(/([\d_]) \/ (?=[\d_])/g, function (all, lead) { return lead + ' ' + DIVIDE + ' '; })
      .replace(/\d{5,}/g, function (n) { return n.replace(/\B(?=(\d{3})+(?!\d))/g, GAP); });
  }

  var fill = function (text, values) { return String(text).replace(/\{(\w+)\}/g, function (all, key) { return has(values, key) ? String(values[key]) : all; }); };
  // A time in the file's own words: "1 minute", "2 minutes", "90 seconds".
  function fileTime(seconds) {
    var words = loader.CHECK_LABELS, n = Math.round(seconds);
    if (n % 60 === 0) return n === 60 ? words.check_one_minute : fill(words.check_minutes, { n: n / 60 });
    return fill(words.check_seconds, { n: n });
  }
  // The check as the file holds it: the samples (the practice questions) and the scored items, in order, each with its answer.
  function paperOf(lesson) {
    var block = lesson.blocks[0], adapter = loader.CHECK_ADAPTERS[block.activity], check = lesson.check || {};
    var rows = block.items.map(function (raw, i) {
      var made = adapter && typeof adapter.prepare === 'function' ? adapter.prepare(raw || {}, {}) : null;
      if (!made || !made.item) throw new Error('item ' + (i + 1) + ' cannot be printed');
      return Object.assign({ practice: !!(raw && raw.practice) }, made.item);
    });
    return { kind: block.activity, title: lesson.title, limit: Number(lesson.timeLimitS) > 0 ? Number(lesson.timeLimitS) : null, skip: !!check.allowSkip, unit: check.scoreUnit,
      samples: rows.filter(function (row) { return row.practice; }), items: rows.filter(function (row) { return !row.practice; }) };
  }
  // About how wide a run of text is, in ems of the numeral size.
  function ems(text) {
    var n = 0;
    String(text).split('').forEach(function (ch) { n += /[0-9]/.test(ch) ? 0.56 : ch === ' ' || ch === GAP ? 0.3 : 0.64; });
    return n;
  }
  // One item on paper: a pair of numbers, a stacked problem (a division in its bracket) or a line, and the width it needs.
  // A stacked problem that takes more than one line of working (two numbers of two or more digits multiplied, a division
  // by a number of two or more digits or with an answer of two or more digits) gets a taller box.
  function shapeOf(kind, row) {
    if (kind === 'quantity_discrimination') return { shape: 'pair', mm: 34 };
    if (row.display != null) {
      var gap = BLANK.test(row.display);
      return { shape: 'line', mm: ems(gap ? row.display.replace(BLANK, '') : row.display + ' = ') * 7.1 + (gap ? 16 : Math.max(16, ems(row.answer) * 7.1 + 6)) + 14 };
    }
    var a = String(row.a), b = String(row.b), divide = row.symbol === DIVIDE;
    var tall = divide ? b.length > 1 || String(row.answer).replace('-', '').length > 1 : row.symbol === String.fromCharCode(0xD7) && Math.min(a.length, b.length) > 1;
    var wide = divide ? ems(a) + ems(b) + 0.8 : Math.max(ems(a), ems(b), ems(row.answer)) + 1;
    return { shape: 'stack', tall: tall, mm: wide * 7.8 + 12 };
  }
  // The columns of a list, and how many columns each item takes: a stacked problem or a pair takes one, a long line more.
  // A list of lines has two columns at most, so that one line never runs into the next.
  function layOut(kind, rows) {
    var shapes = rows.map(function (row) { return shapeOf(kind, row); });
    var boxes = shapes.filter(function (s) { return s.shape !== 'line'; });
    var widest = Math.max.apply(null, (boxes.length ? boxes : shapes).map(function (s) { return s.mm; }));
    var cols = Math.max(1, Math.min(boxes.length ? 5 : 2, Math.floor(PAPER.across / widest)));
    shapes.forEach(function (s) { s.span = s.shape === 'line' && boxes.length ? Math.min(cols, Math.ceil(s.mm / (PAPER.across / cols))) : 1; });
    return { cols: cols, shapes: shapes };
  }
  // The rows of a grid, as the browser places them: an item that does not fit in what is left of a row starts the next one.
  function rowsOf(shapes, cols) {
    var rows = [], row = null;
    shapes.forEach(function (s, i) {
      if (!row || row.used + s.span > cols) rows.push(row = { from: i, to: i, used: 0, mm: 0 });
      row.to = i + 1;
      row.used += s.span;
      row.mm = Math.max(row.mm, PAPER[s.tall ? 'tall' : s.shape]);
    });
    return rows;
  }
  // The sheets: as many rows as fit, never part of an item. The first sheet also holds the title, the name line, the
  // directions and the samples.
  function sheetsOf(rows, firstRoom) {
    var sheets = [[]], room = firstRoom;
    rows.forEach(function (row) {
      var sheet = sheets[sheets.length - 1];
      if (row.mm > room && sheet.length) { sheets.push(sheet = []); room = PAPER.down - PAPER.page - PAPER.turn; }
      sheet.push(row);
      room -= row.mm;
    });
    return sheets;
  }
  function paperItem(row, label, shape) {
    var item = el('li', 'pi pi-' + shape.shape + (shape.tall ? ' pi-tall' : '') + (shape.span > 1 ? ' wide-' + shape.span : ''));
    item.appendChild(el('span', 'pn', label));
    var box;
    if (shape.shape === 'pair') {
      box = el('span', 'pp');
      box.appendChild(el('span', 'pp-n', shown(row.left)));
      box.appendChild(el('span', 'pp-n', shown(row.right)));
    } else if (shape.shape === 'line') {
      // "__ + 8 = 14" as written (with the file's signs), with a line to write on for the blank. A line with no blank ends "= ____".
      box = el('span', 'pl');
      var parts = shown(row.display).split(/(_{2,})/).filter(Boolean);
      if (!BLANK.test(row.display)) parts.push(' = ', '__');
      parts.forEach(function (part) { box.appendChild(BLANK.test(part) ? el('span', row.answer.length > 3 ? 'pblank pblank-wide' : 'pblank') : doc.createTextNode(part)); });
    } else if (row.symbol === DIVIDE) {
      box = el('span', 'pdv');
      box.appendChild(el('span', 'pdv-by', shown(row.b)));
      box.appendChild(el('span', 'pdv-in', shown(row.a)));
    } else {
      box = el('span', 'ps');
      box.appendChild(el('span', 'ps-a', shown(row.a)));
      box.appendChild(el('span', 'ps-op', row.symbol));
      box.appendChild(el('span', 'ps-b', shown(row.b)));
    }
    item.appendChild(box);
    return item;
  }
  // How the paper is given and scored. Each sentence says what the file does (word_sounds_take_home_loader.js:
  // checkScore, and the score halves of the check adapters); none adds a rule of its own.
  function teacherWords(paper) {
    var noun = paper.kind === 'quantity_discrimination' ? 'question' : 'problem';
    var samples = paper.samples.length, limit = paper.limit, rate = paper.unit === 'digits_correct_per_minute';
    var minus = paper.samples.concat(paper.items).some(function (row) { return /^-/.test(row.answer); });
    var give = [], score = [], tally = [];
    // "Practice", as the screen says ("Practice 1 of 1"), not "Samples" (2026-11-13, teacher-journey L9).
    if (samples) give.push((samples === 1 ? 'Do the practice question first, with the student, and say the answer.' : 'Do the ' + samples + ' practice questions first, with the student, and say each answer.') + ' Practice questions do not count.');
    give.push(limit ? (samples ? 'Then start a clock for ' : 'Start a clock for ') + fileTime(limit) + '. When the time is up, the student stops.' : 'There is no clock. The student may take as long as needed.');
    if (paper.skip) give.push('The student may skip a ' + noun + ', as on screen.');
    if (rate && limit) give.push('If the student finishes every ' + noun + ' before the time is up, write down the number of seconds used.');
    if (rate) {
      score.push('Compare each answer with the key one place at a time: ones with ones, tens with tens, and so on. Each digit that matches is 1 digit correct.');
      var example = digitExample(paper);
      if (example) score.push(example);
      score.push('A ' + noun + ' left blank gets 0.' + (minus ? ' So does an answer with the wrong sign.' : ''));
      score.push('Add up the digits correct' + (samples ? ', leaving out the practice questions.' : '.'));
      if (!limit) score.push('With no clock there is no score in digits correct per minute.');
      else {
        score.push(limit === 60 ? 'If the time ran out: the score is the number of digits correct, because the time is 1 minute.'
          : 'If the time ran out: score = digits correct ' + DIVIDE + ' ' + (limit / 60) + ' (the minutes), rounded to a whole number.');
        score.push('If every ' + noun + ' was finished early: score = digits correct ' + String.fromCharCode(0xD7) + ' 60 ' + DIVIDE + ' seconds used, rounded to a whole number. Under 20 seconds, there is no score.');
      }
      tally.push(['Digits correct', '']);
      if (limit) tally.push(['Seconds used, if finished early', '']);
      tally.push(['Score', 'digits correct per minute']);
    } else {
      score.push(noun === 'question' ? 'A question is right when the circled number is the bigger one, the one in the key.' : 'A problem is right when the number written is the one in the key.');
      score.push('The score is the number of ' + noun + 's right' + (samples ? ', leaving out the practice questions.' : '.'));
      if (limit) score.push('If the student finishes before the time is up, the score is still the number right.');
      tally.push(['Number right', 'of ' + paper.items.length]);
    }
    score.push(limit ? 'If the check is stopped before the time is up and before the last ' + noun + ', there is no score.' : 'If the check is stopped before the last ' + noun + ', there is no score.');
    var note = 'The numbers are the ones the student sees on screen' + (samples ? '. In the results file the practice questions are numbered first, so ' + noun + ' 1 here is item ' + (samples + 1) + ' there.' : ' and in the results file.');
    return { give: give, score: score, tally: tally, note: note };
  }
  // A worked example of digits correct, counted by the file's own scoring of one item.
  function digitExample(paper) {
    var adapter = loader.CHECK_ADAPTERS.math_computation;
    var row = paper.items.filter(function (item) { return /^[0-9]{2,}$/.test(item.answer); })[0];
    if (!row || !adapter || typeof adapter.score !== 'function') return '';
    var key = row.answer, wrote = key.slice(0, -1) + ((Number(key.charAt(key.length - 1)) + 1) % 10);
    var got = adapter.score(row, key, wrote).digitsCorrect;
    return 'For example, if the key says ' + key + ' and the student wrote ' + wrote + ', that is ' + count(got, 'digit') + ' correct.';
  }
  function clearPaper() {
    paperOn = false;
    doc.body.classList.remove('paper-on');
    show('print', false);
    show('print-note', false);
    var learner = $('paper-learner');
    if (!learner) return;
    while (learner.children.length > 1) learner.removeChild(learner.lastElementChild);
    ['paper-page-1', 'paper-title', 'paper-how', 'paper-time', 'paper-samples', 'paper-items-1', 'paper-turn-1', 'paper-key-title', 'paper-give', 'paper-score', 'paper-tally', 'paper-key-note', 'paper-key']
      .forEach(function (id) { setText(id, ''); });
    setText('paper-answers-title', 'Answers');
    $('paper-answers').className = '';
  }
  function drawPaper(lesson) {
    clearPaper();
    var paper = paperOf(lesson), learner = $('paper-learner');
    var all = paper.samples.concat(paper.items), plan = layOut(paper.kind, all);
    var sampleShapes = plan.shapes.slice(0, paper.samples.length), itemShapes = plan.shapes.slice(paper.samples.length);
    var how = PAPER_HOW[paper.kind] + (all.some(function (row) { return row.remainder; }) ? ' Leave out the remainder.' : '') + (plan.cols > 1 ? ' Go across each row.' : '') + (paper.skip ? ' If you get stuck, go on to the next one.' : '');
    // The first sheet: the page line, the title (about 50 characters to a line), the name line, the directions (about 70 to a
    // line), the time, the samples and the start line. The rest of the sheet is for the problems.
    var head = PAPER.page + 12 * Math.ceil(paper.title.length / 50) + 15 + 8 * Math.ceil(how.length / 70) + 12 + 10
      + (paper.samples.length ? 12 + rowsOf(sampleShapes, plan.cols).reduce(function (sum, row) { return sum + row.mm; }, 0) : 0);
    var sheets = sheetsOf(rowsOf(itemShapes, plan.cols), PAPER.down - PAPER.turn - head);
    setText('paper-title', paper.title);
    setText('paper-how', how);
    setText('paper-time', paper.limit ? fill(loader.CHECK_LABELS.check_ready_timed, { time: fileTime(paper.limit) }) : loader.CHECK_LABELS.check_ready_untimed);
    show('paper-samples-part', paper.samples.length > 0);
    $('paper-samples').className = 'paper-items paper-samples cols-' + plan.cols;
    paper.samples.forEach(function (row, i) { $('paper-samples').appendChild(paperItem(row, 'Practice', sampleShapes[i])); });
    sheets.forEach(function (rows, n) {
      var list = n ? el('ol', '') : $('paper-items-1'), page = n ? el('p', 'paper-page') : $('paper-page-1'), turn = n ? el('p', 'paper-turn') : $('paper-turn-1');
      list.className = 'paper-items cols-' + plan.cols;
      if (sheets.length > 1) page.textContent = 'Page ' + (n + 1) + ' of ' + sheets.length;
      if (n < sheets.length - 1) turn.textContent = 'Go on to the next page.';
      rows.forEach(function (row) {
        for (var i = row.from; i < row.to; i++) list.appendChild(paperItem(paper.items[i], String(i + 1), itemShapes[i]));
      });
      if (!n) return;
      var sheet = el('section', 'paper-sheet');
      sheet.appendChild(page);
      sheet.appendChild(list);
      sheet.appendChild(turn);
      learner.appendChild(sheet);
    });
    // An odd number of learner pages gets a blank one, so that printed on both sides the answers are not on the back of a learner page.
    if (sheets.length % 2) {
      var blank = el('section', 'paper-sheet paper-empty');
      blank.appendChild(el('p', 'paper-empty-line', 'This page is blank on purpose, so that the teacher page starts on a sheet of its own.'));
      learner.appendChild(blank);
    }
    // The teacher page.
    var words = teacherWords(paper);
    setText('paper-key-title', 'Teacher page: ' + paper.title);
    words.give.forEach(function (text) { $('paper-give').appendChild(el('li', '', text)); });
    words.score.forEach(function (text) { $('paper-score').appendChild(el('li', '', text)); });
    words.tally.forEach(function (row) {
      var field = el('span', 'paper-field', row[0] + ' ');
      field.appendChild(el('span', 'paper-fill'));
      if (row[1]) field.appendChild(doc.createTextNode(' ' + row[1]));
      $('paper-tally').appendChild(field);
    });
    setText('paper-key-note', words.note);
    var longest = Math.max.apply(null, all.map(function (row) { return String(row.word).length; }));
    var keyCols = longest <= 12 ? 3 : longest <= 22 ? 2 : 1;
    $('paper-key').className = 'paper-key key-cols-' + keyCols;
    // The key stays on the teacher page while it fits under the directions (about 70 mm, in rows of 6.6 mm). A longer
    // one starts a sheet of its own, under its own heading.
    var apart = Math.ceil(all.length / keyCols) * 6.6 > 70;
    $('paper-answers').className = apart ? 'paper-apart' : '';
    setText('paper-answers-title', apart ? 'Answers: ' + paper.title : 'Answers');
    all.forEach(function (row, i) {
      var line = el('li', '');
      line.appendChild(el('span', 'kn', row.practice ? 'Practice' : String(i - paper.samples.length + 1)));
      line.appendChild(el('span', 'kw', shown(row.word)));
      line.appendChild(el('span', 'ka', shown(row.answer)));
      $('paper-key').appendChild(line);
    });
    paperOn = true;
    doc.body.classList.add('paper-on');
    show('print', true);
    show('print-note', true);
  }
  function printPaper() {
    if (!paperOn) return;
    try { window.print(); } catch (_) { /* the browser's own print menu still prints the paper copy */ }
  }

  // ---------------------------------------------------------------------------
  // "Open a file I made" (2026-11-13): the page fills itself in from a check made earlier. packets_reopen.js reads it
  // (readCheck, with packets_verify_core.js). The file is read in this tab only. Nothing in it is run.
  // ---------------------------------------------------------------------------
  var reopenKit = null;
  function showReopen(line, items, page) {
    setText('reopen-line', line);
    var host = $('reopen-list');
    host.textContent = '';
    (items || []).forEach(function (text) { host.appendChild(el('li', '', text)); });
    host.hidden = !(items && items.length);
    var link = $('reopen-page');
    if (page) { link.setAttribute('href', page.href); link.textContent = 'Open ' + page.name; }
    link.hidden = !page;
    show('reopen-note', true);
    $('reopen-note').focus();
  }
  function nearestTime(seconds) {
    if (!(seconds > 0)) return 0;
    return TIME_CHOICES.filter(Boolean).reduce(function (best, t) { return Math.abs(t - seconds) < Math.abs(best - seconds) ? t : best; }, TIME_DEFAULT);
  }
  function applyReopen(result, name) {
    if (!result.ok) { showReopen(result.why, [], result.page); return; }
    var got = result.check, items = [];
    clearTimeout(buildTimer);
    clearBuilt();
    var fresh = defaults();
    fresh.grades = state.grades;
    if (got.id === OWN) {
      fresh.check = OWN;
      fresh.problems = got.problems;
      fresh.title = result.title;
      fresh.time = nearestTime(got.time);
      fresh.skip = got.skip;
      var lines = got.problems ? got.problems.split('\n').length : 0;
      items.push(OWN_NAME + ': ' + count(lines, 'problem') + '. They are in step 2.');
      items.push('Time limit: ' + (fresh.time ? minutes(fresh.time) : 'no clock') + '. ' + (fresh.skip ? 'Students may skip a problem.' : 'No skip button.'));
      if (got.time > 0 && got.time !== fresh.time) items.push('The file had a clock of ' + minutes(got.time) + '. This page offers ' + listed(TIME_CHOICES.filter(Boolean).map(minutes)) + ', so ' + minutes(fresh.time) + ' is chosen.');
    } else {
      var row = readyRow(got.id);
      if (!row) { showReopen('This check is not offered on this page now.', [], null); return; }
      fresh.check = got.id;
      if (row.grades.indexOf(got.grade) >= 0) fresh.grades[got.id] = got.grade;
      else items.push('The file is for ' + (got.grade ? gradeWord(got.grade, false) : 'a grade') + ', which this page does not offer now. Choose a grade in step 2.');
      fresh.version = got.version;
      fresh.untimed = got.untimed;
      fresh.readyTitle = result.title;
      items.push(row.name + (fresh.grades[got.id] ? ', ' + gradeWord(got.grade, false) : '') + ', version ' + got.version + (got.untimed ? ', untimed' : '') + '.');
    }
    fresh.learner = result.learner || '';
    if (result.title) items.push('Title: ' + result.title + (/[.!?]$/.test(result.title) ? '' : '.'));
    result.notes.forEach(function (note) { items.push(note); });
    state = fresh;
    $('f-code').value = '';
    showCode(false);
    remember();
    goTo(1, true);
    showReopen('Filled in from ' + name + '. Change what you want, then make the new file in step 3.', items, null);
  }
  function reopenText(text, name) {
    if (!reopenKit) return;
    applyReopen(reopenKit.readCheck(text, { verify: window.AlloPacketVerify, builder: builder, codeName: builder.codeName }), String(name || 'the file').slice(0, 120));
  }
  function wireReopen() {
    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { showReopen('This file is too large to be a check made here.', [], null); return; }
      var reader = new FileReader();
      reader.onload = function () { reopenText(String(reader.result || ''), file.name); };
      reader.onerror = function () { showReopen('This browser could not read the file.', [], null); };
      reader.readAsText(file);
    });
  }
  // A file handed over by "Change this file" on Open a practice file or check (packets-open.html, packets_handoff.js).
  function takeHanded() {
    var handoff = window.AlloPacketHandoff;
    if (!reopenKit || !handoff || typeof handoff.take !== 'function' || window.location.hash !== handoff.HASH) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (!file) { showReopen('The file is not here any more. Choose it with Open a file I made.', [], null); return; }
      reopenText(new TextDecoder('utf-8').decode(file.bytes), file.name);
    }, function () { showReopen('This browser could not hand the file over. Choose it with Open a file I made.', [], null); });
  }

  // ---------------------------------------------------------------------------
  // Moving between the steps
  // ---------------------------------------------------------------------------
  // Why step 3 cannot be reached yet, or '' when it can.
  function stopAtStep2() {
    if (state.check === OWN) { drawOwn(); if (ownStop) return ownStop; }
    else if (!gradeNow()) return 'Choose a grade to go on.';
    var stop = codeProblem();
    if (stop) return stop + ' Make it longer, or leave it empty for no code.';
    return '';
  }
  function goTo(wanted, quiet) {
    var target = wanted, stop = '';
    if (target >= 2 && !state.check) {
      target = 1;
      setText('step-1-problem', 'Choose a check to go on.');
    }
    if (target === 3) {
      stop = stopAtStep2();
      if (stop) target = 2;
    }
    if (target !== 3) { clearTimeout(buildTimer); clearBuilt(); show('making', false); }
    // Sent back to the step already on screen: the reason is announced and the focus stays where it is.
    var stayed = target !== wanted && target === step;
    step = target;
    [1, 2, 3].forEach(function (n) { show('step-' + n, n === step); });
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      var n = Number(tab.getAttribute('data-go'));
      if (n === step) tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
      tab.classList.toggle('is-done', n < step);
    });
    var name = productName();
    doc.title = (name ? name + ': ' : '') + 'Make a math check, step ' + step + ' of 3';
    syncCheck();
    if (step === 2) {
      var mine = state.check === OWN;
      show('panel-ready', !mine);
      show('panel-own', mine);
      if (mine) drawOwnPanel(); else drawReady();
      drawCode();
      setText('step-2-problem', stop);
    }
    if (step === 3) { drawTitle(); syncCodeName(); drawBatch(); makeSoon(30); }
    if (!quiet && !stayed) {
      var heading = $('step-' + step + '-title');
      if (heading) { heading.focus(); if (typeof heading.scrollIntoView === 'function') heading.scrollIntoView({ block: 'start' }); }
    }
  }

  function wire() {
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      tab.addEventListener('click', function () { goTo(Number(tab.getAttribute('data-go'))); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="check"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.check = radio.value; remember(); syncCheck(); });
    });
    $('next-1').addEventListener('click', function () { goTo(2); });
    $('back-2').addEventListener('click', function () { goTo(1); });
    $('next-2').addEventListener('click', function () { goTo(3); });
    $('back-3').addEventListener('click', function () { goTo(2); });
    $('fix-choices').addEventListener('click', function () { goTo(2); });
    $('retry').addEventListener('click', function () { makeSoon(30); });
    $('f-problems').addEventListener('input', function () {
      state.problems = this.value.slice(0, MAX_TYPED);
      remember();
      clearTimeout(ownTimer);
      ownTimer = setTimeout(drawOwn, 250);
    });
    // The title is in step 3 (2026-11-13): the file is made again as it is typed.
    $('f-title').addEventListener('input', function () {
      var typed = this.value.slice(0, 80);
      if (state.check === OWN) state.title = typed; else state.readyTitle = typed;
      remember();
      if (step === 3) makeSoon(400);
    });
    $('f-code-name').addEventListener('input', function () { state.learner = this.value.slice(0, 40); syncCodeName(); if (step === 3) makeSoon(400); });
    $('f-batch-names').addEventListener('input', function () { dropBatchFile(); setText('batch-problem', ''); drawBatch(); });
    $('f-batch-rotate').addEventListener('change', function () { this.parentNode.classList.toggle('is-on', this.checked); dropBatchFile(); drawBatch(); });
    $('batch-make').addEventListener('click', makeBatch);
    $('batch-save').addEventListener('click', saveBatch);
    $('f-skip').addEventListener('change', function () { state.skip = this.checked; remember(); this.parentNode.classList.toggle('is-on', this.checked); });
    $('f-untimed').addEventListener('change', function () { state.untimed = this.checked; this.parentNode.classList.toggle('is-on', this.checked); drawFormLine(); });
    $('f-code').addEventListener('input', function () { drawCode(); if (!codeProblem()) setText('step-2-problem', ''); });
    $('code-show').addEventListener('click', function () { showCode(this.getAttribute('aria-pressed') !== 'true'); });
    $('save').addEventListener('click', saveFile);
    $('print').addEventListener('click', printPaper);
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      state = defaults();
      $('f-code').value = '';
      $('f-title').value = '';
      $('f-code-name').value = '';
      showCode(false);
      goTo(1, true);
      setText('forget-said', 'Done. The page is back to how it started.');
    });
  }

  function start() {
    loader = window.AlloWordSoundsTakeHome;
    builder = window.AlloPacketChecks;
    var missing = [];
    if (!loader || typeof loader.buildHtml !== 'function' || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS.math_computation) missing.push('the part that writes the file');
    if (!builder || typeof builder.buildCheckPacket !== 'function' || typeof builder.lessonFromMathForm !== 'function' || typeof builder.lessonFromMathProblems !== 'function'
      || typeof builder.parseProblems !== 'function') missing.push('the part that makes a check');
    if (!missing.length) {
      ready = readReady();
      if (ready.length < READY.length) missing.push('the problem sets');
    }
    if (missing.length) {
      show('loading', false);
      setText('load-problem-text', 'Missing: ' + listed(missing) + '. Check the connection, then load the page again. Nothing has been lost.');
      show('load-problem', true);
      return;
    }
    fallbackTitle = builder.lessonFromMathProblems({ problems: [{ a: 1, b: 1, op: 'add' }] }).title;
    drawCards();
    state = recall();
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_csv) setText('csv-label', loader.DEFAULT_LABELS.save_csv);
    // "Open a file I made" and one file for each student are extras: without their scripts the page works as before.
    var kit = window.AlloPacketReopen;
    reopenKit = kit && typeof kit.readCheck === 'function' && window.AlloPacketVerify && typeof window.AlloPacketVerify.readParts === 'function' && typeof FileReader === 'function' ? kit : null;
    wire();
    if (reopenKit) wireReopen();
    show('reopen', !!reopenKit);
    show('batch', !!(window.AlloPacketZip && typeof builder.withCodeName === 'function'));
    show('loading', false);
    goTo(1, true);
    takeHanded();
  }

  try { start(); } catch (error) {
    show('loading', false);
    setText('load-problem-text', 'The page stopped while starting (' + said(error) + '). Load the page again. Nothing has been lost.');
    show('load-problem', true);
  }
})();
