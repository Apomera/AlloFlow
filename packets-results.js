// The "Add up results" page (packets-results.html).
// Results files are read in this tab with the browser's file reader, added up and drawn.
// Nothing is sent: the page's rule (connect-src 'none') has the browser refuse every connection, and
// this script calls nothing that could make one. Nothing is kept on the device unless the switch
// "Keep these results on this device" is turned on.
// Everything from a file is shown as text (textContent). No markup is ever built from a file.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-results/1';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // The three lines that say what a comparison inside a group is, and is not.
  var HONEST = 'This compares learners in these files with each other. It is not a published benchmark. Compare only results gathered the same way.';
  var GOAL_NOTE = 'Goal typed by the teacher';
  // A note on a result, in plain words. The short codes come from the reader.
  var NOTES = {
    left_the_page: 'left the page for more than 3 seconds',
    clock_changed: 'the device clock was set back',
    reloaded: 'the page was reloaded',
    stopped_early: 'stopped early, so there is no score',
    no_time_limit: 'no time limit, so there is no score per minute',
    too_fast: 'finished in under 20 seconds, so there is no score',
    score_unreadable: 'the score line in the file could not be read',
    no_score_line: 'the file has no score line',
    finished_early: 'finished before the time was up, so the score is for the time used',
    score_differs: 'the score line in the file does not match its answers; the score shown is counted from the answers',
    file_changed: 'this file was changed after it was saved',
    no_check_value: 'an older file, with no check value in it',
    not_checked: 'this browser could not check the file for changes',
    date_from_file: 'the date comes from the file, not from the results',
    no_date: 'no date in the file',
  };
  // Notes that say how to read a result. They do not put a ring on a chart dot.
  var QUIET = { finished_early: true, no_check_value: true };

  var reader = window.AlloPacketResults;
  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };
  var el = function (tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  var add = function (parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  };
  var button = function (className, text) { var node = el('button', className, text); node.type = 'button'; return node; };
  var setText = function (id, text) { var node = $(id); if (node) node.textContent = text; };
  var show = function (id, on) { var node = $(id); if (node) node.hidden = !on; };
  var count = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  var own = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
  var productName = function () { var node = $('product-name'); return node ? String(node.textContent || '').trim() : ''; };
  var say = function (text) { setText('said', text); };
  // The SVG namespace, read from the mark in the header: a chart is built with DOM calls only.
  var SVG_NS = (doc.querySelector('.brand svg') || doc.documentElement).namespaceURI;
  var svg = function (tag, attrs, text) {
    var node = doc.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (name) { node.setAttribute(name, attrs[name]); });
    if (text != null) node.textContent = text;
    return node;
  };

  var state = fresh();
  var model = null;
  var busy = false;
  var chartCount = 0;
  var redraws = [];

  function fresh() {
    return { screen: 'empty', sessions: [], byId: Object.create(null), notResults: [], duplicates: [], leftOut: 0, merges: Object.create(null), apart: Object.create(null),
      asked: Object.create(null), goals: Object.create(null), sample: false, view: 'group', learner: '', sort: { by: 'learner', down: false }, keep: false };
  }

  // ---------------------------------------------------------------------------
  // Words for dates, times and values
  // ---------------------------------------------------------------------------
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  function nowLocal() {
    var d = new Date(), off = -d.getTimezoneOffset(), a = Math.abs(off);
    return today() + 'T' + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()) + (off < 0 ? '-' : '+') + two(Math.floor(a / 60)) + ':' + two(a % 60);
  }
  function showDate(iso, short) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m || !MONTHS[Number(m[2]) - 1]) return 'No date';
    return MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + (short ? '' : ', ' + m[1]);
  }
  function dateRange(first, last) {
    if (!first) return '';
    if (first === last) return showDate(first);
    return showDate(first, first.slice(0, 4) === last.slice(0, 4)) + ' to ' + showDate(last);
  }
  function dayNumber(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000 : 0; }
  function timeTaken(seconds) {
    if (seconds === null || seconds === undefined) return '';
    return seconds < 60 ? seconds + ' s' : Math.floor(seconds / 60) + ' min' + (seconds % 60 ? ' ' + seconds % 60 + ' s' : '');
  }
  function valueText(value, percent) { return value === null || value === undefined ? 'No score' : value + (percent ? '%' : ''); }
  function sentence(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''; }
  function notesOf(s) {
    return s.flags.map(function (flag) {
      if (flag === 'left_the_page' && s.score && s.score.hiddenS >= 1) return NOTES.left_the_page + ' (' + count(Math.round(s.score.hiddenS), 'second') + ' away in all)';
      return own(NOTES, flag) ? NOTES[flag] : flag.replace(/_/g, ' ');
    });
  }
  function hasLoudNote(flags) { return flags.some(function (flag) { return !own(QUIET, flag); }); }
  function learnerNamed(key) { return model ? model.learners.filter(function (row) { return row.key === key; })[0] || null : null; }
  function labelFor(key) {
    var found = '';
    state.sessions.forEach(function (s) { if (!found && reader.labelKey(s.learner) === key) found = s.learner; });
    return found || key;
  }

  // ---------------------------------------------------------------------------
  // Reading files
  // ---------------------------------------------------------------------------
  function readText(file) {
    return new Promise(function (done, fail) {
      var fileReader = new FileReader();
      fileReader.onload = function () { done(String(fileReader.result == null ? '' : fileReader.result)); };
      fileReader.onerror = function () { fail(new Error('unreadable')); };
      fileReader.readAsText(file);
    });
  }
  function addSession(s, drop, fromFile) {
    var have = state.byId[s.sessionId];
    if (have) {
      if (fromFile) { state.duplicates.push({ file: s.sourceFile, first: have.sourceFile }); drop.look++; }
      // Of two copies of one result, the one that was not changed is the one kept.
      if (have.integrity !== 'ok' && s.integrity === 'ok') { state.sessions[state.sessions.indexOf(have)] = s; state.byId[s.sessionId] = s; }
      return;
    }
    if (state.sessions.length >= reader.MAX_SESSIONS) { state.leftOut++; return; }
    state.sessions.push(s);
    state.byId[s.sessionId] = s;
    if (fromFile && s.integrity === 'changed') drop.look++;
  }
  function takeBundle(bundle, drop) {
    bundle.sessions.forEach(function (s) { addSession(s, drop, false); });
    bundle.merges.forEach(function (row) { if (!(row.from in state.merges)) state.merges[row.from] = row.into; });
    bundle.apart.forEach(function (row) { state.apart[reader.pairKey(row[0], row[1])] = true; });
    bundle.goals.forEach(function (row) { var key = row.learner + '\n' + row.measure; if (!(key in state.goals)) state.goals[key] = row.value; });
  }
  function absorb(result, drop) {
    drop.read++;
    if (!result.ok) { state.notResults.push({ file: result.name, why: result.why }); drop.look++; return; }
    if (result.bundle) { takeBundle(result.bundle, drop); return; }
    result.sessions.forEach(function (s) { addSession(s, drop, true); });
  }
  function startDrop() {
    if (state.sample) { var keep = state.keep; state = fresh(); state.keep = keep; }
    return { read: 0, look: 0 };
  }
  function finishDrop(drop) {
    changed();
    var pairs = model.suggestions.filter(function (row) { return !state.asked[row.pair]; });
    pairs.forEach(function (row) { state.asked[row.pair] = true; });
    var look = drop.look + pairs.length;
    go(look || !state.sessions.length ? 'check' : 'results', true);
    say(count(drop.read, 'file') + ' read' + (look ? ', ' + look + (look === 1 ? ' needs' : ' need') + ' a look.' : '.'));
  }
  async function takeFiles(list) {
    var all = Array.prototype.slice.call(list || []);
    if (!all.length) return;
    if (busy) { say('Still reading the last files.'); return; }
    busy = true;
    var drop = startDrop();
    var files = all.slice(0, reader.MAX_FILES);
    state.leftOut += all.length - files.length;
    say('Reading ' + count(files.length, 'file') + '.');
    for (var i = 0; i < files.length; i++) {
      var file = files[i], result;
      if (Number(file.size) > reader.MAX_BYTES) result = reader.refuse('too_big', file.name);
      else {
        try { result = await reader.read(await readText(file), { name: file.name, lastModified: file.lastModified }); }
        catch (_) { result = reader.refuse('unreadable', file.name); }
      }
      absorb(result, drop);
    }
    busy = false;
    finishDrop(drop);
  }
  async function loadSamples() {
    if (busy) return;
    busy = true;
    state = fresh();
    state.sample = true;
    say('Reading the sample files.');
    var drop = { read: 0, look: 0 };
    for (var i = 0; i < SAMPLE_FILES.length; i++) {
      var text = String.fromCharCode(0xFEFF) + SAMPLE_FILES[i].lines.join('\r\n') + '\r\n';
      absorb(await reader.read(text, { name: SAMPLE_FILES[i].name }), drop);
    }
    busy = false;
    finishDrop(drop);
  }

  // ---------------------------------------------------------------------------
  // What this page keeps: nothing, unless the switch is on
  // ---------------------------------------------------------------------------
  function storage() { try { return window.localStorage; } catch (_) { return null; } }
  function bundleNow() {
    return reader.makeBundle({ sessions: state.sessions, savedLocal: nowLocal(),
      merges: Object.keys(state.merges).map(function (from) { return { from: from, into: state.merges[from] }; }),
      apart: Object.keys(state.apart).map(function (pair) { return pair.split('\n'); }),
      goals: Object.keys(state.goals).map(function (key) { var at = key.indexOf('\n'); return { learner: key.slice(0, at), measure: key.slice(at + 1), value: state.goals[key] }; }) });
  }
  function forgetStored() { try { storage().removeItem(STORE_KEY); } catch (_) { /* nothing was kept */ } }
  function persist() {
    if (!state.keep || state.sample) return;
    try {
      if (state.sessions.length) storage().setItem(STORE_KEY, JSON.stringify(bundleNow())); else forgetStored();
    } catch (_) {
      state.keep = false;
      forgetStored();
      drawKeep('This browser could not keep the results. Use "Save all of this as one file" instead.');
    }
  }
  function drawKeep(said) {
    var box = $('keep');
    box.checked = state.keep && !state.sample;
    box.disabled = state.sample;
    show('forget', state.keep && !state.sample);
    setText('keep-said', said != null ? said : state.sample ? 'Sample results are not kept.' : state.keep ? 'On. The results on this page are kept in this browser on this device.' : '');
  }
  function openStored() {
    var raw = null;
    try { raw = storage().getItem(STORE_KEY); } catch (_) { raw = null; }
    if (!raw) return false;
    var bundle = null;
    try { bundle = reader.readBundle(JSON.parse(raw)); } catch (_) { bundle = null; }
    if (!bundle || !bundle.ok || !bundle.sessions.length) { forgetStored(); return false; }
    takeBundle(bundle, { read: 0, look: 0 });
    state.keep = true;
    return true;
  }

  // ---------------------------------------------------------------------------
  // The three states of the page
  // ---------------------------------------------------------------------------
  function changed() {
    model = reader.addUp(state.sessions, { merges: state.merges, apart: state.apart });
    persist();
  }
  function lookCount() { return state.notResults.length + state.duplicates.length + model.changed.length + model.suggestions.length; }
  function go(screen, focus) {
    state.screen = screen;
    show('state-empty', screen === 'empty');
    show('state-check', screen === 'check');
    show('state-results', screen === 'results');
    if (screen === 'check') drawCheck();
    if (screen === 'results') drawResults();
    var heading = screen === 'check' ? $('check-title') : screen === 'results' ? $('results-title') : null;
    if (focus && heading) { heading.focus(); if (typeof heading.scrollIntoView === 'function') heading.scrollIntoView({ block: 'start' }); }
  }

  // State b: what needs a look.
  function checkGroup(title, intro, rows) {
    var group = el('div', 'check-group');
    add(group, el('h3', '', title), el('p', 'hint', intro));
    var list = el('ul', 'check-list');
    rows.forEach(function (row) { list.appendChild(row); });
    return add(group, list);
  }
  function fileRow(name, why) { return add(el('li'), el('span', 'check-file', name), el('span', 'check-why', why)); }
  function drawCheck() {
    var body = $('check-body');
    body.textContent = '';
    var results = state.sessions.length;
    setText('check-line', results ? count(results, 'result') + ' counted, from ' + count(model.learners.length, 'learner') + '. Look through the points below, then show the results.'
      : 'None of these files is a results file, so there is nothing to show yet.');
    if (state.notResults.length) add(body, checkGroup('Not results files', 'These files were not counted.',
      state.notResults.map(function (row) { return fileRow(row.file, row.why); })));
    if (state.duplicates.length) add(body, checkGroup('The same result more than once', 'Each result is counted once.',
      state.duplicates.map(function (row) { return fileRow(row.file, 'The same result as ' + row.first + '.'); })));
    if (model.changed.length) add(body, checkGroup('Changed after saving', 'These files were changed after they were saved. They are still counted, and each one carries a note.',
      model.changed.map(function (s) { return fileRow(s.sourceFile, (s.learner || reader.NO_NAME) + ', ' + showDate(s.date) + '.'); })));
    if (model.suggestions.length) add(body, checkGroup('One learner, written two ways?', 'These names are close. Nothing is put together unless you say so.',
      model.suggestions.map(function (row) {
        var item = el('li', 'pair');
        var line = add(el('p', 'pair-names'), el('strong', '', row.a.label), doc.createTextNode(' (' + count(row.a.count, 'result') + ') and '),
          el('strong', '', row.b.label), doc.createTextNode(' (' + count(row.b.count, 'result') + ')'));
        var same = button('btn btn-small', 'These are the same learner');
        var differ = button('btn btn-small', 'These are different learners');
        same.setAttribute('aria-label', row.a.label + ' and ' + row.b.label + ': these are the same learner');
        differ.setAttribute('aria-label', row.a.label + ' and ' + row.b.label + ': these are different learners');
        same.addEventListener('click', function () {
          // The name with fewer results joins the one with more.
          var from = row.a.count < row.b.count ? row.a : row.b, into = from === row.a ? row.b : row.a;
          state.merges[from.key] = into.key;
          answered(from.label + ' and ' + into.label + ' are counted as one learner.');
        });
        differ.addEventListener('click', function () {
          state.apart[row.pair] = true;
          answered(row.a.label + ' and ' + row.b.label + ' stay two learners.');
        });
        return add(item, line, add(el('p', 'pair-buttons'), same, differ));
      })));
    var merged = Object.keys(state.merges);
    if (merged.length) add(body, checkGroup('Counted as one learner', 'You said these are the same learner.', merged.map(function (from) {
      var item = el('li', 'pair');
      var undo = button('btn btn-small', 'Count them apart again');
      var line = labelFor(from) + ' is counted with ' + labelFor(state.merges[from]) + '.';
      undo.setAttribute('aria-label', line + ' Count them apart again');
      undo.addEventListener('click', function () { delete state.merges[from]; answered(labelFor(from) + ' is counted apart again.'); });
      return add(item, el('p', 'pair-names', line), add(el('p', 'pair-buttons'), undo));
    })));
    if (state.leftOut) add(body, el('p', 'note', 'Only the first ' + reader.MAX_FILES + ' files of a drop are read, and the page holds ' + reader.MAX_SESSIONS + ' results. Left out: ' + state.leftOut + '.'));
    if (!body.firstChild) add(body, el('p', 'hint', 'Nothing needs a look.'));
    show('show-results', results > 0);
  }
  function answered(text) {
    changed();
    drawCheck();
    var next = $('check-body').querySelector('.pair button') || $('show-results');
    if (next && !next.hidden) next.focus(); else $('check-title').focus();
    say(text);
  }

  // State c: the results.
  function drawResults() {
    var range = dateRange(model.firstDate, model.lastDate);
    setText('results-line', count(model.count, 'result') + ' from ' + count(model.learners.length, 'learner') + (range ? '. ' + range + '.' : '.'));
    var look = lookCount();
    show('open-check', look > 0 || Object.keys(state.merges).length > 0);
    setText('open-check', 'Check what was read' + (look ? ' (' + look + ')' : ''));
    show('sample-note', state.sample);
    show('start-over-ask', false);
    if (!learnerNamed(state.learner)) state.learner = model.learners.length ? model.learners[0].key : '';
    var pick = $('pick-learner');
    pick.textContent = '';
    model.learners.forEach(function (learner) {
      var option = el('option', '', learner.label + ' (' + count(learner.count, 'result') + ')');
      option.value = learner.key;
      pick.appendChild(option);
    });
    pick.value = state.learner;
    drawView();
    drawKeep();
  }
  function drawView() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="view"]'), function (radio) {
      radio.checked = radio.value === state.view;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
    show('view-group', state.view === 'group');
    show('view-learner', state.view === 'learner');
    // Only the view that is shown is on the page: the other one is emptied, not just hidden.
    $('middles').textContent = '';
    $('group-table').textContent = '';
    $('learner-body').textContent = '';
    if (state.view === 'group') drawGroup(); else drawLearner();
    setPrintHead();
  }
  function setPrintHead() {
    var learner = learnerNamed(state.learner);
    var what = state.view === 'learner' && learner ? learner.label : 'The group';
    setText('print-head', productName() + ': Add up results. ' + what + '. ' + (state.sample ? 'Sample results. ' : '') + 'Printed ' + showDate(today()) + '.');
  }

  // ---------------------------------------------------------------------------
  // The group: one row for each learner
  // ---------------------------------------------------------------------------
  function drawMiddles() {
    var host = $('middles');
    host.textContent = '';
    if (!model.middles.length) return;
    var row = el('div', 'middles');
    model.middles.forEach(function (mid) {
      var card = el('div', 'middle');
      add(card, el('p', 'middle-name', mid.label + (mid.form ? ', form ' + mid.form : '')), el('p', 'middle-label', 'Middle of this group (n = ' + mid.n + ')'),
        add(el('p', 'middle-value'), el('span', 'middle-number', String(mid.median)), doc.createTextNode(' ' + mid.unitName)),
        el('p', 'middle-range', 'Middle half: ' + mid.q1 + ' to ' + mid.q3 + '. Lowest ' + mid.min + ', highest ' + mid.max + '.'));
      row.appendChild(card);
    });
    add(host, row, el('p', 'honest', HONEST),
      el('p', 'hint', 'Each learner counts once, with the latest score on that form. The middle score is the median. The middle half leaves out the lowest quarter and the highest quarter of these scores.'));
  }
  function groupColumns() {
    var columns = [
      { id: 'learner', label: 'Learner', value: function (row) { return row.label.toLowerCase(); } },
      { id: 'count', label: 'Results', number: true, value: function (row) { return row.count; } },
      { id: 'last', label: 'Last date', number: true, value: function (row) { return row.lastDate || null; } },
    ];
    model.strands.forEach(function (strand) {
      columns.push({ id: 's:' + strand[0], label: strand[1], group: 'practice', number: true, value: function (row) { var cell = row.strands[strand[0]]; return cell ? cell.value : null; },
        cell: function (row) { var cell = row.strands[strand[0]]; return cell ? [cell.value + '%', cell.firstTry + ' of ' + cell.graded] : null; } });
    });
    model.checks.forEach(function (series) {
      columns.push({ id: 'c:' + series.key, label: series.label, sub: series.unitName, group: 'checks', number: true, value: function (row) { var cell = row.checks[series.key]; return cell ? cell.value : null; },
        cell: function (row) { var cell = row.checks[series.key]; return cell ? [valueText(cell.value, false), cell.form ? 'form ' + cell.form : ''] : null; } });
    });
    return columns;
  }
  function sortedLearners(columns) {
    var column = columns.filter(function (c) { return c.id === state.sort.by; })[0] || columns[0];
    var turn = state.sort.down ? -1 : 1;
    return model.learners.slice().sort(function (a, b) {
      var x = column.value(a), y = column.value(b);
      // A learner with nothing in this column goes last, whichever way the column is sorted.
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return x < y ? -turn : x > y ? turn : 0;
    });
  }
  function drawGroup() {
    drawMiddles();
    var host = $('group-table');
    host.textContent = '';
    var columns = groupColumns();
    var groups = [['practice', 'Practice: latest first-try percent'], ['checks', 'Checks: latest score']].filter(function (g) { return columns.some(function (c) { return c.group === g[0]; }); });
    var table = el('table', 'data');
    add(table, el('caption', 'sr-only', 'One row for each learner. Press a column heading to sort by it.'));
    var head = el('thead');
    var first = el('tr'), second = el('tr');
    var headCell = function (column, rows) {
      var th = el('th');
      th.scope = 'col';
      if (rows > 1) th.rowSpan = rows;
      var on = state.sort.by === column.id;
      th.setAttribute('aria-sort', on ? (state.sort.down ? 'descending' : 'ascending') : 'none');
      var sorter = button('sort');
      sorter.setAttribute('data-sort', column.id);
      add(sorter, el('span', 'sort-name', column.label), column.sub ? el('span', 'sort-sub', column.sub) : null);
      sorter.addEventListener('click', function () {
        state.sort = { by: column.id, down: on ? !state.sort.down : !!column.number };
        drawGroup();
        Array.prototype.forEach.call($('group-table').querySelectorAll('.sort'), function (again) { if (again.getAttribute('data-sort') === column.id) again.focus(); });
        say('Sorted by ' + column.label + ', ' + (column.number ? (state.sort.down ? 'high to low' : 'low to high') : (state.sort.down ? 'Z to A' : 'A to Z')) + '.');
      });
      return add(th, sorter);
    };
    columns.forEach(function (column) { if (!column.group) first.appendChild(headCell(column, groups.length ? 2 : 1)); });
    groups.forEach(function (g) {
      var th = el('th', 'data-group', g[1]);
      th.scope = 'colgroup';
      th.colSpan = columns.filter(function (c) { return c.group === g[0]; }).length;
      first.appendChild(th);
      columns.forEach(function (column) { if (column.group === g[0]) second.appendChild(headCell(column, 1)); });
    });
    add(head, first, groups.length ? second : null);
    var body = el('tbody');
    sortedLearners(columns).forEach(function (learner) {
      var row = el('tr');
      var name = el('th');
      name.scope = 'row';
      var open = button('btn btn-text name-link', learner.label);
      open.setAttribute('aria-label', learner.label + ': show this learner');
      open.addEventListener('click', function () { state.learner = learner.key; $('pick-learner').value = learner.key; state.view = 'learner'; drawView(); $('learner-title').focus(); });
      add(row, add(name, open, learner.labels.length > 1 ? el('span', 'cell-sub', 'also written ' + learner.labels.filter(function (l) { return l !== learner.label; }).join(', ')) : null),
        el('td', 'num', String(learner.count)), el('td', 'num', learner.lastDate ? showDate(learner.lastDate) : 'No date'));
      columns.forEach(function (column) {
        if (!column.group) return;
        var parts = column.cell(learner);
        var td = el('td', 'num');
        if (parts) add(td, el('span', 'cell-value', parts[0]), parts[1] ? el('span', 'cell-sub', parts[1]) : null);
        else add(td, el('span', 'sr-only', 'No result'));
        row.appendChild(td);
      });
      body.appendChild(row);
    });
    var scroll = el('div', 'table-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-labelledby', 'group-title');
    add(host, add(scroll, add(table, head, body)),
      el('p', 'hint', 'Practice shows the share of answers that were right on the first try, in the latest result that has that skill. Checks show the latest score. Choose a name to see that learner over time.'));
  }

  // ---------------------------------------------------------------------------
  // One learner: results over time
  // ---------------------------------------------------------------------------
  function niceTop(most) {
    // Whole-number steps (1, 2, 5, 10, 20 ...), about four of them, with room above the highest value.
    var raw = Math.max(1, most) / 4;
    var power = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var step = [1, 2, 5, 10].map(function (m) { return Math.max(1, m * power); }).filter(function (s) { return s >= raw; })[0];
    var top = step * Math.ceil(Math.max(1, most) / step);
    return { step: step, top: most > top * 0.92 ? top + step : top };
  }
  // A small line chart, built with DOM calls. The same numbers are in the table beside or under it.
  // It is drawn at the width of the box it sits in, so its text is the size it says it is.
  function drawChart(series, goal, width) {
    var points = series.points.filter(function (p) { return p.value !== null && p.date; });
    if (series.dates < 2) return null;
    var W = Math.max(280, Math.min(720, Math.round(width) || 680)), H = W < 420 ? 220 : 250;
    var left = 40, right = 34, top = 26, bottom = 46, inset = 16;
    var days = points.map(function (p) { return dayNumber(p.date); });
    var d0 = Math.min.apply(null, days), d1 = Math.max.apply(null, days);
    var most = Math.max.apply(null, points.map(function (p) { return p.value; }).concat(goal === null ? [] : [goal]));
    var scale = series.percent ? { step: 25, top: 100 } : niceTop(most);
    var x = function (day) { return Math.round((left + inset + (W - left - right - inset * 2) * (day - d0) / (d1 - d0)) * 10) / 10; };
    var y = function (value) { return Math.round((top + (H - top - bottom) * (1 - value / scale.top)) * 10) / 10; };
    var id = 'chart-' + (++chartCount);
    var unit = series.percent ? '%' : '';
    var firstPoint = points[0], lastPoint = points[points.length - 1];
    var chart = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': id + '-title ' + id + '-desc', focusable: 'false', 'class': 'chart-svg' });
    var title = svg('title', { id: id + '-title' }, series.name + ': ' + series.unitName + ' over time');
    var desc = svg('desc', { id: id + '-desc' }, count(points.length, 'result') + ' from ' + dateRange(firstPoint.date, lastPoint.date) + '. First ' + firstPoint.value + unit + ', latest ' + lastPoint.value + unit + '.'
      + (goal === null ? '' : ' ' + GOAL_NOTE + ': ' + goal + unit + '.') + ' The same numbers are in the table below.');
    add(chart, title, desc);
    for (var level = 0; level <= scale.top + 0.0001; level += scale.step) {
      add(chart, svg('line', { x1: left, x2: W - right, y1: y(level), y2: y(level), 'class': level === 0 ? 'chart-axis' : 'chart-grid' }),
        svg('text', { x: left - 6, y: y(level) + 4, 'text-anchor': 'end', 'class': 'chart-scale' }, level + unit));
    }
    var lastLabel = -100;
    var seen = Object.create(null);
    points.forEach(function (p, i) {
      if (seen[p.date]) return;
      seen[p.date] = true;
      var px = x(days[i]), end = x(d1);
      if (days[i] !== d1 && (px - lastLabel < 58 || end - px < 58)) return;
      lastLabel = px;
      add(chart, svg('line', { x1: px, x2: px, y1: H - bottom, y2: H - bottom + 5, 'class': 'chart-axis' }),
        svg('text', { x: px, y: H - bottom + 19, 'text-anchor': 'middle', 'class': 'chart-scale' }, showDate(p.date, true)));
    });
    var years = firstPoint.date.slice(0, 4) === lastPoint.date.slice(0, 4) ? firstPoint.date.slice(0, 4) : firstPoint.date.slice(0, 4) + ' to ' + lastPoint.date.slice(0, 4);
    add(chart, svg('text', { x: left, y: H - 6, 'text-anchor': 'start', 'class': 'chart-scale' }, years));
    if (goal !== null) {
      add(chart, svg('line', { x1: left, x2: W - right, y1: y(goal), y2: y(goal), 'class': 'chart-goal', 'stroke-dasharray': '7 5' }),
        svg('text', { x: (left + W - right) / 2, y: y(goal) - 6, 'text-anchor': 'middle', 'class': 'chart-goal-label' }, 'Goal ' + goal + unit));
    }
    add(chart, svg('polyline', { points: points.map(function (p, i) { return x(days[i]) + ',' + y(p.value); }).join(' '), 'class': 'chart-line', fill: 'none' }));
    var values = points.map(function (p) { return p.value; });
    var low = values.indexOf(Math.min.apply(null, values)), high = values.indexOf(Math.max.apply(null, values));
    var ring = false;
    points.forEach(function (p, i) {
      var px = x(days[i]), py = y(p.value);
      if (hasLoudNote(p.flags)) { ring = true; add(chart, svg('circle', { cx: px, cy: py, r: 9, 'class': 'chart-ring', fill: 'none' })); }
      add(chart, svg('circle', { cx: px, cy: py, r: 4.5, 'class': 'chart-point', 'data-date': p.date, 'data-value': p.value }));
      if (points.length <= 12 || i === 0 || i === points.length - 1 || i === low || i === high) {
        add(chart, svg('text', { x: px, y: py < top + 16 ? py + 20 : py - 11, 'text-anchor': 'middle', 'class': 'chart-value' }, p.value + unit));
      }
    });
    var figure = el('figure', 'chart');
    return add(figure, chart, el('figcaption', 'chart-key', 'Each dot is one result.' + (ring ? ' A ring around a dot means that result has a note in the table.' : '')
      + (goal === null ? '' : ' Dashed line: ' + GOAL_NOTE.charAt(0).toLowerCase() + GOAL_NOTE.slice(1) + '.')));
  }
  function plainTable(caption, heads, rows, size) {
    var table = el('table', 'data data-small' + (size === 'wide' ? ' data-wide' : size === 'measure' ? ' data-measure' : ''));
    add(table, el('caption', 'sr-only', caption));
    var headRow = el('tr');
    heads.forEach(function (text) { var th = el('th', '', text); th.scope = 'col'; headRow.appendChild(th); });
    var body = el('tbody');
    rows.forEach(function (cells) {
      var row = el('tr');
      cells.forEach(function (text, i) { var cell = el(i ? 'td' : 'th', '', text); if (!i) cell.scope = 'row'; row.appendChild(cell); });
      body.appendChild(row);
    });
    var scroll = el('div', 'table-scroll' + (size === 'narrow' ? ' table-narrow' : ''));
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', caption);
    return add(scroll, add(table, add(el('thead'), headRow), body));
  }
  function drawMeasure(learner, series, n) {
    var card = el('section', 'measure');
    var title = el('h4', '', series.name);
    title.id = 'measure-' + n;
    card.setAttribute('aria-labelledby', title.id);
    var scored = series.points.filter(function (p) { return p.value !== null; });
    var latest = scored[scored.length - 1];
    add(card, add(el('div', 'measure-head'), title, el('p', 'measure-unit', sentence(series.unitName))),
      el('p', 'measure-latest', latest ? 'Latest: ' + valueText(latest.value, series.percent) + ', ' + showDate(latest.date) + '.' : 'No score yet.'));
    var mid = series.formKey ? model.middles.filter(function (row) { return row.key === series.formKey; })[0] : null;
    if (mid) add(card, el('p', 'measure-middle', 'Middle of this group on ' + (mid.form ? 'form ' + mid.form : 'this form') + ' (n = ' + mid.n + '): ' + mid.median + '. Middle half: ' + mid.q1 + ' to ' + mid.q3 + '.'));
    var goalKey = learner.key + '\n' + series.key;
    var holder = el('div', 'measure-chart');
    var goalLine = el('p', 'goal-line');
    var redraw = function () {
      var goal = goalKey in state.goals ? state.goals[goalKey] : null;
      var width = holder.clientWidth;
      holder.textContent = '';
      add(holder, drawChart(series, goal, width) || el('p', 'hint', 'A chart is drawn when there are results from two dates.'));
      goalLine.textContent = goal === null ? '' : GOAL_NOTE + ': ' + goal + (series.percent ? '%' : ' ' + series.unitName) + '.';
      goalLine.hidden = goal === null;
    };
    redraws.push(redraw);
    var most = series.percent ? 100 : 100000;
    var field = el('div', 'goal no-print');
    var label = add(el('label'), doc.createTextNode('Goal'), el('span', 'sr-only', ' for ' + series.name), doc.createTextNode(' (optional)'));
    var input = el('input', 'goal-input');
    input.type = 'text';
    input.id = 'goal-' + n;
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('data-goal', series.key);
    input.setAttribute('aria-describedby', 'goal-' + n + '-hint');
    input.value = goalKey in state.goals ? String(state.goals[goalKey]) : '';
    label.htmlFor = input.id;
    var hint = el('span', 'hint', 'Type a number. It is drawn as a line on the chart.');
    hint.id = 'goal-' + n + '-hint';
    input.addEventListener('input', function () {
      var typed = input.value.trim().replace(/%$/, '').replace(',', '.');
      var value = typed === '' || !/^\d+(\.\d+)?$/.test(typed) ? null : Number(typed);
      var bad = typed !== '' && (value === null || value > most);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      if (bad) return;
      if (value === null) delete state.goals[goalKey]; else state.goals[goalKey] = value;
      persist();
      redraw();
    });
    var check = series.kind === 'check';
    var table = plainTable(series.name + ': each result', ['Date', sentence(series.unitName), 'Details', 'Notes'], series.points.map(function (p) {
      var details = (check ? (p.form ? 'Form ' + p.form + ', ' : '') + (p.attempt ? 'try ' + p.attempt + '. ' : '') : '') + sentence(p.detail) + '.';
      return [showDate(p.date), valueText(p.value, series.percent), details, sentence(notesOf(p.session).join('; '))];
    }), 'measure');
    // The chart and its goal on one side, the same numbers as a table on the other (under it on a narrow screen).
    return add(card, add(el('div', 'measure-body'), add(el('div', 'measure-side'), holder, add(field, label, input, hint), goalLine), table));
  }
  function drawLearner() {
    var body = $('learner-body');
    body.textContent = '';
    var learner = learnerNamed(state.learner);
    if (!learner) return;
    var first = learner.sessions.filter(function (s) { return s.date; })[0];
    add(body, add(el('p', 'learner-line'), el('strong', '', learner.label), doc.createTextNode('. ' + count(learner.count, 'result') + (first ? ', ' + dateRange(first.date, learner.lastDate) : '') + '.')));
    if (learner.labels.length > 1) add(body, el('p', 'hint', 'Written in the files as: ' + learner.labels.join(', ') + '.'));
    var measures = el('div', 'measures');
    redraws = [];
    reader.learnerSeries(learner, model).forEach(function (series, i) { measures.appendChild(drawMeasure(learner, series, i + 1)); });
    add(body, measures);
    // The cards are on the page now, so each chart can be drawn at the width it has.
    redraws.forEach(function (redraw) { redraw(); });
    var wrong = reader.wrongAnswers(learner.sessions, 8);
    if (wrong.length) {
      add(body, el('h4', 'learner-sub', 'Most frequent wrong answers in practice'),
        plainTable('Most frequent wrong answers in practice', ['Word', 'Answered', 'Times'], wrong.map(function (row) { return [row.word, row.answer, String(row.times)]; }), 'narrow'));
    }
    add(body, el('h4', 'learner-sub', 'Every result, in date order'),
      plainTable('Every result for ' + learner.label + ', in date order', ['Date', 'What', 'Result', 'Answered', 'Time taken', 'Notes'], learner.sessions.map(function (s) {
        var probe = s.mode === 'probe';
        var what = probe ? s.measureName + (s.form ? ', form ' + s.form : '') + (s.attempt ? ', try ' + s.attempt : '') : 'Practice: ' + s.title;
        var result = probe ? (s.value === null ? 'No score' : s.value + ' ' + s.unitName) : s.summary.firstTryPct === null ? 'Not scored' : s.summary.firstTryPct + '% on the first try';
        return [showDate(s.date), what, result, s.summary.attempted + ' of ' + s.summary.given, timeTaken(s.durationS), sentence(notesOf(s).join('; '))];
      }), 'wide'));
  }

  // ---------------------------------------------------------------------------
  // Take it with you
  // ---------------------------------------------------------------------------
  function saveFile(name, text, type) {
    var url = '';
    try { url = URL.createObjectURL(new Blob([text], { type: type })); } catch (_) { url = ''; }
    if (!url) { setText('take-said', 'This browser cannot save files from a page. Open this page in Chrome, Edge, Firefox or Safari.'); return false; }
    var link = doc.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) { /* already gone */ } }, 1500);
    return true;
  }
  function saveSummary() {
    var rows = [];
    model.learners.forEach(function (learner) { learner.sessions.forEach(function (session) { rows.push({ learner: learner.label, session: session }); }); });
    var name = (state.sample ? 'sample-' : '') + 'results-summary__' + today() + '.csv';
    if (saveFile(name, reader.summaryCsv(rows), 'text/csv;charset=utf-8')) setText('take-said', 'Saved ' + name + ': ' + count(rows.length, 'row') + ', one for each result.');
  }
  function saveBundle() {
    var name = (state.sample ? 'sample-' : '') + 'results-all__' + today() + '.json';
    if (saveFile(name, JSON.stringify(bundleNow()), 'application/json')) setText('take-said', 'Saved ' + name + '. Drop it on this page later to open where you left off.');
  }
  function printView(view) {
    if (!model || !model.learners.length) return;
    state.view = view;
    drawView();
    if (typeof window.print === 'function') window.print();
  }
  function startOver() {
    forgetStored();
    state = fresh();
    model = null;
    $('files').value = '';
    go('empty', false);
    drawKeep('');
    setText('take-said', '');
    say('The page is clear.');
    $('choose').focus();
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function hasFiles(event) {
    var types = event.dataTransfer && event.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, 'Files') >= 0;
  }
  function start() {
    if (!reader) {
      setText('drop-title', 'The page could not load all of its parts');
      setText('drop-sub', 'Check the connection, then load the page again.');
      $('choose').hidden = true;
      $('samples').hidden = true;
      return;
    }
    var pickFiles = function () { $('files').click(); };
    $('choose').addEventListener('click', pickFiles);
    $('add-more').addEventListener('click', pickFiles);
    $('check-more').addEventListener('click', pickFiles);
    $('files').addEventListener('change', function () {
      var chosen = Array.prototype.slice.call($('files').files || []);
      $('files').value = '';
      takeFiles(chosen);
    });
    $('samples').addEventListener('click', loadSamples);
    // A file dropped anywhere on the page is read here; without this the browser would leave the page to show it.
    var depth = 0;
    var over = function (on) { show('drop-over', on && state.screen !== 'empty'); $('drop').classList.toggle('is-over', on); };
    doc.addEventListener('dragenter', function (event) { if (!hasFiles(event)) return; event.preventDefault(); depth++; over(true); });
    doc.addEventListener('dragover', function (event) { if (!hasFiles(event)) return; event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
    doc.addEventListener('dragleave', function (event) { if (!hasFiles(event)) return; depth = Math.max(0, depth - 1); if (!depth) over(false); });
    doc.addEventListener('drop', function (event) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      over(false);
      takeFiles(event.dataTransfer.files);
    });
    $('show-results').addEventListener('click', function () { go('results', true); });
    $('open-check').addEventListener('click', function () { go('check', true); });
    $('start-over').addEventListener('click', function () { show('start-over-ask', true); $('start-over-yes').focus(); });
    $('start-over-no').addEventListener('click', function () { show('start-over-ask', false); $('start-over').focus(); });
    $('start-over-yes').addEventListener('click', startOver);
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="view"]'), function (radio) {
      radio.addEventListener('change', function () { if (radio.checked) { state.view = radio.value; drawView(); } });
    });
    $('pick-learner').addEventListener('change', function () { state.learner = $('pick-learner').value; drawLearner(); setPrintHead(); });
    $('print-group').addEventListener('click', function () { printView('group'); });
    $('print-learner').addEventListener('click', function () { printView('learner'); });
    $('save-csv').addEventListener('click', saveSummary);
    $('save-bundle').addEventListener('click', saveBundle);
    $('keep').addEventListener('change', function () {
      state.keep = $('keep').checked;
      if (state.keep) persist(); else forgetStored();
      drawKeep(state.keep ? null : 'Off. Nothing is kept on this device.');
    });
    $('forget').addEventListener('click', function () {
      state.keep = false;
      forgetStored();
      drawKeep('Removed from this device. The results stay on this page until you close it.');
      $('keep').focus();
    });
    window.addEventListener('beforeprint', setPrintHead);
    // A chart is drawn at the width of its box: draw the charts again when the window has settled at a new width.
    var settle = 0, lastWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(settle);
      settle = setTimeout(function () { if (state.screen === 'results' && state.view === 'learner') redraws.forEach(function (redraw) { redraw(); }); }, 150);
    });
    if (openStored()) {
      changed();
      go('results', false);
      say('Opened the results kept on this device.');
    }
  }

  // BEGIN SAMPLE FILES
  // Eight made-up results files for "Try with sample results". Each is a real results file as a check or a
  // practice file saves it, one line of the file per line here. The code names and the scores are invented.
  var SAMPLE_FILES = [
    { name: 'Math-Fluency-check-2A__RedFox3__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","8000","","","1","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","8000","","","1","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","9","0","0","1","8000","","","0","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","8000","","","1","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","24","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","76","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","probe","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","33","1","1","1","8000","","","2","2"',
      '"#summary","sample-redfox3-check-2a","items_given=12","attempted=12","correct=11","first_try=11","accuracy_pct=92","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-redfox3-check-2a","measure=math_dcpm","score=12","score_unit=digits_correct_per_minute","digits_correct=19","digits_possible=20","items_correct=11","items_attempted=12","time_limit_s=120","elapsed_s=96","hidden_s=0","completion=complete","prorated=1","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","f67a18f9ea6dbcac389333bf13312c1c8e351e79e5c7d73cff6a84fbcb025980","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__BlueHeron7__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","12000","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","9","0","0","1","12000","","","0","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","12000","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","12000","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","24","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","","0","0","0","0","","time_up","",""',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","probe","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","","0","0","0","0","","","",""',
      '"#summary","sample-blueheron7-check-2a","items_given=12","attempted=10","correct=9","first_try=9","accuracy_pct=75","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-blueheron7-check-2a","measure=math_dcpm","score=8","score_unit=digits_correct_per_minute","digits_correct=15","digits_possible=16","items_correct=9","items_attempted=10","time_limit_s=120","elapsed_s=120","hidden_s=0","completion=time","prorated=0","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","d48122f13fd463f36050cda40a1907f36244c9d7bdb7d1b6c5651c0e3ef9b790","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__GreenTurtle2__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","24","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","76","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","probe","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","33","1","1","1","6250","","","2","2"',
      '"#summary","sample-greenturtle2-check-2a","items_given=12","attempted=12","correct=12","first_try=12","accuracy_pct=100","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-greenturtle2-check-2a","measure=math_dcpm","score=16","score_unit=digits_correct_per_minute","digits_correct=20","digits_possible=20","items_correct=12","items_attempted=12","time_limit_s=120","elapsed_s=75","hidden_s=0","completion=complete","prorated=1","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","918b32f29b1eb07a2c4498932d6abefd6b1248def3ae348a1702c047f1665d96","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__GoldFinch5__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","17142","","","2","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","17142","","","1","1"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","14","0","0","1","17142","","","1","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","17142","","","1","1"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","17142","","","2","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","17142","","","1","1"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","12","0","0","1","17142","","","1","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","","0","0","0","0","","time_up","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","","0","0","0","0","","","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","","0","0","0","0","","","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","","0","0","0","0","","","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","probe","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","","0","0","0","0","","","",""',
      '"#summary","sample-goldfinch5-check-2a","items_given=12","attempted=7","correct=5","first_try=5","accuracy_pct=42","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-goldfinch5-check-2a","measure=math_dcpm","score=5","score_unit=digits_correct_per_minute","digits_correct=9","digits_possible=11","items_correct=5","items_attempted=7","time_limit_s=120","elapsed_s=120","hidden_s=0","completion=time","prorated=0","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","93b0d10903b7051a0b262e7a289b0853623e7ed16c8007a9176b971e4751be95","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__GrayOwl4__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","23","0","0","1","10909","","","1","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","76","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","probe","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","","0","0","0","0","","time_up","",""',
      '"#summary","sample-grayowl4-check-2a","items_given=12","attempted=11","correct=10","first_try=10","accuracy_pct=83","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-grayowl4-check-2a","measure=math_dcpm","score=9","score_unit=digits_correct_per_minute","digits_correct=17","digits_possible=18","items_correct=10","items_attempted=11","time_limit_s=120","elapsed_s=120","hidden_s=14","completion=time","prorated=0","scoring_version=3","form_version=2","attempt=1","flags=left_the_page"',
      '"#integrity","sha256","80859693743ebf2329e081a61a3d3e5cdd2d833545ccb6b39af58b9ceb0965ab","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Short-vowels__Blue-Heron-7__2026-10-13.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag"',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","1","isolation-0","isolation","Find Sounds","1","cat","k","k","1","1","1","4200","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","2","isolation-1","isolation","Find Sounds","1","map","m","p | m","1","0","2","4510","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","3","isolation-2","isolation","Find Sounds","1","sun","n","s | u","0","0","2","4820","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","4","blending-0","blending","Blend Sounds","1","ship","ship","ship","1","1","1","5130","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","5","blending-1","blending","Blend Sounds","1","frog","frog","fog | frog","1","0","2","5440","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","6","missing_letter-0","missing_letter","Missing Letter","1","bed","e","e","1","1","1","5750","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","7","missing_letter-1","missing_letter","Missing Letter","1","pig","i","e | i","1","0","2","6060","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-1","ws-short-vowels","r91b7d204","","practice","Blue Heron 7","2026-10-13T16:02:10-04:00","2026-10-13T16:05:18-04:00","188","8","missing_letter-2","missing_letter","Missing Letter","1","hop","o","o","1","1","1","6370","",""',
      '"#summary","sample-blueheron7-practice-1","items_given=8","attempted=8","correct=7","first_try=4","accuracy_pct=88","title=Short vowels"',
      '"#integrity","sha256","a3b02c767050f30bfbe605d2562849a56116cdbbfd190bcccb44f531ef495e00","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2B__BlueHeron7__2026-10-20.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","1","math_computation-0","math_computation","Math Fluency","1","9 + 7","16","16","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","2","math_computation-1","math_computation","Math Fluency","1","13 \u2212 6","7","7","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","3","math_computation-2","math_computation","Math Fluency","1","8 + 5","13","13","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","4","math_computation-3","math_computation","Math Fluency","1","16 \u2212 8","8","8","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","5","math_computation-4","math_computation","Math Fluency","1","7 + 7","14","14","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","6","math_computation-5","math_computation","Math Fluency","1","11 \u2212 4","7","7","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","7","math_computation-6","math_computation","Math Fluency","1","5 + 9","14","14","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","8","math_computation-7","math_computation","Math Fluency","1","18 \u2212 9","9","9","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","9","math_computation-8","math_computation","Math Fluency","1","32 + 15","47","47","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","10","math_computation-9","math_computation","Math Fluency","1","47 \u2212 23","24","34","0","0","1","9166","","","1","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","11","math_computation-10","math_computation","Math Fluency","1","21 + 64","85","85","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","probe","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","12","math_computation-11","math_computation","Math Fluency","1","69 \u2212 34","35","35","1","1","1","9166","","","2","2"',
      '"#summary","sample-blueheron7-check-2b","items_given=12","attempted=12","correct=11","first_try=11","accuracy_pct=92","attempt=1","title=Math Fluency check (2B)"',
      '"#score","sample-blueheron7-check-2b","measure=math_dcpm","score=10","score_unit=digits_correct_per_minute","digits_correct=19","digits_possible=20","items_correct=11","items_attempted=12","time_limit_s=120","elapsed_s=110","hidden_s=0","completion=complete","prorated=1","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","ba6d3bfb8c687bedf5351fa28fe506f4dd08ddbe6749dd55e78361abf2e0f05a","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Short-vowels__BlueHeron7__2026-10-27.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag"',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","1","isolation-0","isolation","Find Sounds","1","bat","b","b","1","1","1","4200","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","2","isolation-1","isolation","Find Sounds","1","pin","n","n","1","1","1","4510","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","3","isolation-2","isolation","Find Sounds","1","mud","u","o | u","1","0","2","4820","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","4","blending-0","blending","Blend Sounds","1","chip","chip","chip","1","1","1","5130","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","5","blending-1","blending","Blend Sounds","1","slug","slug","slug","1","1","1","5440","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","6","missing_letter-0","missing_letter","Missing Letter","1","web","e","e","1","1","1","5750","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","7","missing_letter-1","missing_letter","Missing Letter","1","fin","i","i","1","1","1","6060","",""',
      '"alloflow-packet-result/1","sample-blueheron7-practice-2","ws-short-vowels","r91b7d204","","practice","BlueHeron7","2026-10-27T16:05:44-04:00","2026-10-27T16:08:15-04:00","151","8","missing_letter-2","missing_letter","Missing Letter","1","log","o","o","1","1","1","6370","",""',
      '"#summary","sample-blueheron7-practice-2","items_given=8","attempted=8","correct=8","first_try=7","accuracy_pct=100","title=Short vowels"',
      '"#integrity","sha256","2fcc0747064ec7e90bf8ee2ea0ce7da14ac67bef04d9d49651cec76b03fb7c13","detects accidental edits, not deliberate ones"',
    ] },
  ];
  // END SAMPLE FILES

  start();
})();
