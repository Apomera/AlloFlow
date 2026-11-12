// The math check maker (packets-check.html): three steps, then one check file.
// Everything happens in this tab. The page asks for nothing but the scripts it names: it fetches nothing,
// and its rule (connect-src 'none') makes the browser refuse if it tried. A check file has no sound and no
// pictures, so there is nothing else to get. The page runs without AI, and there is no account and no cookie.
// What it keeps on the device is listed under "About this page". The teacher code is never kept, and it is
// never put in an address: it is read from its box when the file is made and handed to the builder.
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
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '';

  function defaults() { return { check: '', grades: {}, version: '', problems: '', title: '', time: TIME_DEFAULT, skip: true }; }

  // ---------------------------------------------------------------------------
  // What this page keeps: the last choices, in this browser only. Never the teacher code.
  // ---------------------------------------------------------------------------
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, check: state.check, grades: state.grades, version: state.version,
        problems: state.problems, title: state.title, time: state.time, skip: state.skip }));
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
  function formLesson(id, grade, version) {
    var key = id + '|' + grade + '|' + version;
    if (!has(lessons, key)) {
      try { lessons[key] = builder.lessonFromMathForm({ bank: bank, measure: id, grade: grade, form: version }); } catch (_) { lessons[key] = null; }
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
      var shown = formLesson(card.id, '1', 'A') || formLesson(card.id, grades[0], versionsOf(card.id, grades[0])[0]);
      var example = String(scoredItems(shown)[0].display || '');
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
    var lesson = formLesson(state.check, grade, versionNow());
    var items = lesson.blocks[0].items, practice = items.length - scoredItems(lesson).length;
    setText('form-line', count(scoredItems(lesson).length, readyRow(state.check).item) + '. ' + (lesson.timeLimitS ? capital(minutes(lesson.timeLimitS)) : 'No clock') + '. '
      + (practice ? count(practice, 'practice question') + ' first.' : 'No practice questions.'));
    setText('form-sub', mixOf(lesson));
    setText('step-2-problem', '');
  }
  function drawReady() {
    var row = readyRow(state.check);
    setText('ready-intro', row.name + '. ' + row.what);
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
    return { text: made.item.word, ok: true, problem: problem, says: 'Ready. The answer ' + (problem.display != null ? 'you gave is ' : 'is ') + made.item.answer + '.' };
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
    setText('own-line', line);
    if (!ownStop) setText('step-2-problem', '');
  }
  function drawOwnPanel() {
    if ($('f-problems').value !== state.problems) $('f-problems').value = state.problems;
    if ($('f-title').value !== state.title) $('f-title').value = state.title;
    setText('title-hint', 'The student sees it at the top of the file. Left empty, it is "' + fallbackTitle + '".');
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
  function drawCode() {
    var stop = codeProblem();
    setText('code-line', stop || (codeNow() ? 'The answers screen will ask for this code.' : 'No code: the answers screen opens with one button when the check is finished.'));
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
  // app names the same file; for a list of problems, its title.
  function fileStem(title) {
    var stem = String(title == null ? '' : title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return stem || 'math-check';
  }
  function plan() {
    if (state.check === OWN) {
      var mine = ownLesson();
      return { own: true, lesson: mine, name: fileStem(mine.title) + '.html', problems: ownRows.filter(function (row) { return row.ok; }).map(function (row) { return row.text; }) };
    }
    var row = readyRow(state.check), grade = gradeNow(), version = versionNow();
    return { own: false, row: row, grade: grade, version: version, lesson: formLesson(row.id, grade, version), name: row.slug + '-g' + grade + '-' + version + '.html' };
  }
  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
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
      result = builder.buildCheckPacket({ lesson: todo.lesson, teacherCode: codeNow(), loader: loader });
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
    built = { html: result.html, name: todo.name, bytes: blob.size, coded: coded };
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    // "question" for Quantity Discrimination, "problem" for every other check and for the teacher's own list.
    var item = todo.own ? 'problem' : todo.row.item;
    var skip = todo.lesson.check.allowSkip ? 'The student may skip a ' + item + '.' : 'There is no skip button.';
    var score = check.scoreUnit === 'digits_correct_per_minute' ? 'The score is digits correct per minute.' : 'The score is the number of ' + item + 's correct.';
    var rows = [['Check', todo.own ? OWN_NAME : todo.row.name]];
    if (todo.own) rows.push(['Title', result.manifest.title]);
    else rows.push(['Grade', gradeWord(todo.grade, true)], ['Version', todo.version]);
    rows.push([capital(item) + 's', todo.own ? items + ': ' + todo.problems.join(', ') + '. ' + skip : items + '. ' + mixOf(todo.lesson) + ' ' + skip]);
    rows.push(['Time', (limit ? capital(minutes(limit)) + '. The clock does not stop and does not give time back. ' : 'No clock. ') + score]);
    rows.push(['Practice first', practice ? count(practice, 'practice question') + ', not scored.' : 'None.']);
    rows.push(['Answers screen', coded ? 'Opens only with your teacher code.' : 'Opens with one button when the check is finished. No teacher code is set.']);
    rows.push(['File', built.name + ', ' + fileSize(built.bytes) + '.']);
    var host = $('summary-rows');
    host.textContent = '';
    rows.forEach(function (row) {
      host.appendChild(el('dt', '', row[0]));
      host.appendChild(el('dd', '', row[1]));
    });
    setText('summary-facts', count(items, item) + '. ' + (limit ? capital(minutes(limit)) : 'No clock') + '. ' + fileSize(built.bytes) + '.');
    show('summary', true);
    if (fileUrl) { $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl); show('try', true); }
    show('save', true);
    // The paper copy comes from the same lesson. If it cannot be drawn, there is no print button; the file is unchanged.
    try { drawPaper(todo.lesson); } catch (_) { clearPaper(); }
    setText('making-said', 'The file is ready: ' + count(items, item) + ', ' + fileSize(built.bytes) + '.');
  }
  function saveFile() {
    if (!built) return;
    var link = doc.createElement('a');
    var url = fileUrl;
    if (!url) { try { url = URL.createObjectURL(new Blob([built.html], { type: 'text/html' })); } catch (_) { url = ''; } }
    if (!url) return problem('This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.');
    link.href = url;
    link.download = built.name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
    show('after-code', built.coded);
    show('after-save', true);
    $('after-save').focus();
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
    String(text).split('').forEach(function (ch) { n += /[0-9]/.test(ch) ? 0.56 : ch === ' ' ? 0.3 : 0.64; });
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
      box.appendChild(el('span', 'pp-n', String(row.left)));
      box.appendChild(el('span', 'pp-n', String(row.right)));
    } else if (shape.shape === 'line') {
      // "__ + 8 = 14" as written, with a line to write on for the blank. A line with no blank ends "= ____".
      box = el('span', 'pl');
      var parts = String(row.display).split(/(_{2,})/).filter(Boolean);
      if (!BLANK.test(row.display)) parts.push(' = ', '__');
      parts.forEach(function (part) { box.appendChild(BLANK.test(part) ? el('span', row.answer.length > 3 ? 'pblank pblank-wide' : 'pblank') : doc.createTextNode(part)); });
    } else if (row.symbol === DIVIDE) {
      box = el('span', 'pdv');
      box.appendChild(el('span', 'pdv-by', String(row.b)));
      box.appendChild(el('span', 'pdv-in', String(row.a)));
    } else {
      box = el('span', 'ps');
      box.appendChild(el('span', 'ps-a', String(row.a)));
      box.appendChild(el('span', 'ps-op', row.symbol));
      box.appendChild(el('span', 'ps-b', String(row.b)));
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
    if (samples) give.push((samples === 1 ? 'Do the sample first, with the student, and say the answer.' : 'Do the ' + samples + ' samples first, with the student, and say each answer.') + ' Samples do not count.');
    give.push(limit ? (samples ? 'Then start a clock for ' : 'Start a clock for ') + fileTime(limit) + '. When the time is up, the student stops.' : 'There is no clock. The student may take as long as needed.');
    if (paper.skip) give.push('The student may skip a ' + noun + ', as on screen.');
    if (rate && limit) give.push('If the student finishes every ' + noun + ' before the time is up, write down the number of seconds used.');
    if (rate) {
      score.push('Compare each answer with the key one place at a time: ones with ones, tens with tens, and so on. Each digit that matches is 1 digit correct.');
      var example = digitExample(paper);
      if (example) score.push(example);
      score.push('A ' + noun + ' left blank gets 0.' + (minus ? ' So does an answer with the wrong sign.' : ''));
      score.push('Add up the digits correct' + (samples ? ', leaving out the samples.' : '.'));
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
      score.push('The score is the number of ' + noun + 's right' + (samples ? ', leaving out the samples.' : '.'));
      if (limit) score.push('If the student finishes before the time is up, the score is still the number right.');
      tally.push(['Number right', 'of ' + paper.items.length]);
    }
    score.push(limit ? 'If the check is stopped before the time is up and before the last ' + noun + ', there is no score.' : 'If the check is stopped before the last ' + noun + ', there is no score.');
    var note = 'The numbers are the ones the student sees on screen' + (samples ? '. In the results file the samples are numbered first, so ' + noun + ' 1 here is item ' + (samples + 1) + ' there.' : ' and in the results file.');
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
    var how = PAPER_HOW[paper.kind] + (plan.cols > 1 ? ' Go across each row.' : '') + (paper.skip ? ' If you get stuck, go on to the next one.' : '');
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
    paper.samples.forEach(function (row, i) { $('paper-samples').appendChild(paperItem(row, 'Sample', sampleShapes[i])); });
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
      line.appendChild(el('span', 'kn', row.practice ? 'Sample' : String(i - paper.samples.length + 1)));
      line.appendChild(el('span', 'kw', String(row.word)));
      line.appendChild(el('span', 'ka', row.answer));
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
    if (step === 3) makeSoon(30);
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
    $('f-title').addEventListener('input', function () { state.title = this.value.slice(0, 80); remember(); });
    $('f-skip').addEventListener('change', function () { state.skip = this.checked; remember(); this.parentNode.classList.toggle('is-on', this.checked); });
    $('f-code').addEventListener('input', function () { drawCode(); if (!codeProblem()) setText('step-2-problem', ''); });
    $('code-show').addEventListener('click', function () { showCode(this.getAttribute('aria-pressed') !== 'true'); });
    $('save').addEventListener('click', saveFile);
    $('print').addEventListener('click', printPaper);
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      state = defaults();
      $('f-code').value = '';
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
    wire();
    show('loading', false);
    goTo(1, true);
  }

  try { start(); } catch (error) {
    show('loading', false);
    setText('load-problem-text', 'The page stopped while starting (' + said(error) + '). Load the page again. Nothing has been lost.');
    show('load-problem', true);
  }
})();
