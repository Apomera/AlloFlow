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
  var HONEST = 'This compares students in these files with each other. It does not compare them with any published scores. Compare only results gathered the same way.';
  // "1 digit correct per minute", "1 item correct": the unit with one of it.
  function unitFor(value, unitName) { return Number(value) === 1 ? String(unitName).replace(/^digits /, 'digit ').replace(/^items /, 'item ') : unitName; }
  var GOAL_NOTE = 'Goal typed by the teacher';
  // A note on a result, in plain words. The short codes come from the reader.
  var NOTES = {
    left_the_page: 'left the page for more than 3 seconds',
    clock_changed: 'the device clock was set back',
    reloaded: 'the page was reloaded',
    // 2026-11-13: three flags a check writes from today (word_sounds_take_home_loader.js).
    time_up_away: 'the time ran out while the page was hidden or closed, so there is no score',
    two_tabs: 'the check was open in two tabs or windows while it ran',
    attempt_unknown: 'that browser could not keep the count of tries, so the try number may be wrong',
    // 2026-11-17: a timed check can be paused ("Stop the check", then "Keep going"). The clock stops; the problem on screen is not counted.
    paused: 'paused; the problem on screen at each pause was set aside and not counted',
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
    untimed: 'untimed (an accommodation): kept apart from timed results and never compared with them',
    untimed_no_rate: 'no clock, so there is no score per minute; the answers right are in the table',
  };
  // Notes that say how to read a result. They do not put a ring on a chart dot.
  var QUIET = { finished_early: true, no_check_value: true, untimed: true, untimed_no_rate: true };
  var TOOL_NAMES = { textLarger: 'larger text', textLargest: 'largest text', textExtraLarge: 'extra large text', contrastHigh: 'high contrast',
    contrastSoft: 'soft contrast', colorsDark: 'dark colors', colorsOcean: 'ocean colors', colorsSunny: 'sunny colors',
    colorsForest: 'forest colors', colorsRose: 'rose colors', spacingWide: 'wider spacing', lettersLexend: 'Lexend letters', lettersAtkinson: 'Atkinson letters', lettersBook: 'book letters', lettersRounded: 'rounded letters', lettersMono: 'monospace letters', lettersOpenDyslexic: 'OpenDyslexic letters', readingFocus: 'reading focus line',
    magnifier: 'magnifier', readChoices: 'read choices aloud' };

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
  var unsavedEdits = false;
  var lastRemoved = null;
  // 2026-11-17: "To pick up here next week, save all of this as one file." Shown once in a visit, after a goal, a goal date or a
  // paper score is typed or more files are added, and never again in that visit: 'none', then 'shown', then 'done'.
  var nudge = 'none';
  function markEdited() { if (!state.sample) unsavedEdits = true; }
  function offerSave() {
    if (nudge !== 'none' || state.sample) return;
    nudge = 'shown';
    show('save-nudge', state.screen === 'results');
  }
  function endNudge() {
    if (nudge === 'shown') nudge = 'done';
    show('save-nudge', false);
  }
  function drawUndo() {
    var host = $('results-undo');
    if (!host) return;
    host.textContent = '';
    if (!lastRemoved) { host.hidden = true; return; }
    var info = lastRemoved.session;
    var label = (info.title || info.measureName || 'result') + (info.date ? ' (' + showDate(info.date) + ')' : '');
    var undoBtn = button('btn btn-small', 'Undo');
    undoBtn.id = 'results-undo-btn';
    undoBtn.addEventListener('click', function () {
      if (!lastRemoved) return;
      var back = lastRemoved;
      lastRemoved = null;
      if (!state.byId[back.session.sessionId]) {
        state.sessions.splice(Math.min(back.index, state.sessions.length), 0, back.session);
        state.byId[back.session.sessionId] = back.session;
      }
      changed();
      go('results', true);
      say('Restored ' + label + '.');
    });
    add(host, el('span', '', 'Removed ' + label + '.'), undoBtn);
    host.hidden = false;
  }

  function fresh() {
    return { screen: 'empty', sessions: [], byId: Object.create(null), notResults: [], duplicates: [], leftOut: 0, merges: Object.create(null), apart: Object.create(null),
      asked: Object.create(null), goals: Object.create(null), sample: false, view: 'group', learner: '',
      // 2026-11-17: a goal's date (the same keys as goals) and the paper scores typed on this page.
      goalDates: Object.create(null), paper: [],
      // Each table of the group sorts on its own (2026-11-13: checks and practice are two tables).
      sort: { checks: { by: 'learner', down: false }, practice: { by: 'learner', down: false } }, keep: false,
      groupQuery: '', sessionNewest: false, sessionKind: 'all' };
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
  // 2026-11-13: hours and days are named (a file finished on another day read "2610 min 28 s").
  function timeTaken(seconds) {
    if (seconds === null || seconds === undefined) return '';
    if (seconds < 60) return seconds + ' s';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min' + (seconds % 60 ? ' ' + seconds % 60 + ' s' : '');
    var minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' h' + (minutes % 60 ? ' ' + minutes % 60 + ' min' : '');
    return count(Math.floor(hours / 24), 'day') + (hours % 24 ? ' ' + hours % 24 + ' h' : '');
  }
  // The time a result took: a check's own clock (the time on the check, not the time the file was open),
  // else start to finish. A file started on one day and finished on another says so.
  // 2026-11-13: practice saved from today says its time on the items (activeS: each item from shown to done,
  // time on another tab left out). That comes first; start to finish is under it when it says more.
  function timeCell(s) {
    var check = s.mode === 'probe' && s.score && s.score.elapsedS > 0;
    var took = timeTaken(check ? Math.round(s.score.elapsedS) : s.durationS);
    var began = /^\d{4}-\d{2}-\d{2}/.exec(s.startedLocal || '');
    var days = !check && began && s.date && began[0] !== s.date ? 'started ' + showDate(began[0]) + ', finished ' + showDate(s.date) : '';
    var span = s.durationS !== null && s.durationS !== undefined;
    if (!check && s.activeS !== null && s.activeS !== undefined) {
      var lines = [timeTaken(s.activeS) + ' on the items'];
      if (days) lines.push((span ? 'open ' + took + ': ' : '') + days);
      else if (span && s.durationS - s.activeS >= 60) lines.push(took + ' start to finish');
      return lines.length > 1 ? lines : lines[0];
    }
    if (days) return [took, days];
    return took;
  }
  // Why a check has no score, in a few words for a table cell.
  var NO_SCORE_SHORT = { stopped_early: 'stopped early', too_fast: 'done in under 20 seconds', no_score_line: 'no score line', score_unreadable: 'score line unreadable',
    no_time_limit: 'no time limit', untimed_no_rate: 'no clock', time_up_away: 'time ran out while away' };
  function noScoreShort(code) { return own(NO_SCORE_SHORT, code) ? NO_SCORE_SHORT[code] : 'no score'; }
  // A check's form as a teacher reads it: a letter, or nothing for a teacher's own set ("custom" in the file).
  // On screen it is called a version, the makers' word (2026-11-16); the results file keeps its column name "form".
  function formText(form) { return form && form !== 'custom' ? form : ''; }
  function valueText(value, percent) { return value === null || value === undefined ? 'No score' : value + (percent ? '%' : ''); }
  function sentence(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''; }
  function notesOf(s) {
    var out = s.flags.map(function (flag) {
      if (flag === 'left_the_page' && s.score && s.score.hiddenS >= 1) return NOTES.left_the_page + ' (' + count(Math.round(s.score.hiddenS), 'second') + ' away in all)';
      if (flag === 'paused' && s.score && s.score.pausedS >= 1) return NOTES.paused + ' (' + count(Math.round(s.score.pausedS), 'second') + ' paused in all)';
      return own(NOTES, flag) ? NOTES[flag] : flag.replace(/_/g, ' ');
    });
    if (s.score && Array.isArray(s.score.tools) && s.score.tools.length) {
      out.push('reading tools used: ' + s.score.tools.map(function (t) { return own(TOOL_NAMES, t) ? TOOL_NAMES[t] : t; }).join(', '));
    }
    // 2026-11-17: a check for the youngest students may carry a recording of its directions.
    if (s.score && s.score.directionsHeard) out.push('pressed Hear the directions before starting' + (s.score.directionsHeard > 1 ? ' (' + count(s.score.directionsHeard, 'time') + ')' : ''));
    return out;
  }
  function hasLoudNote(flags) { return flags.some(function (flag) { return !own(QUIET, flag); }); }
  // A practice file that folds new facts in among known ones (newFacts from the reader): how the new
  // ones went, shown beside the overall line; the known facts come last.
  function newFactsLines(nk) {
    if (!nk) return [];
    var lines = [];
    if (nk.items) lines.push('New facts: ' + nk.firstTry + ' of ' + nk.items + ' on the first try.');
    if (nk.missed.length) lines.push('New facts missed on the first try: ' + nk.missed.join(', ') + '.');
    if (nk.knownItems) lines.push('Known facts: ' + nk.knownFirstTry + ' of ' + nk.knownItems + ' on the first try.');
    return lines;
  }
  // 2026-11-17: two more kinds of line for a result that has them.
  // Matching and conflicting items (Symbol Runner color words, middle letter, dots and digits): how many were right at the
  // first try, and the typical (median) time of those. Recall time (cover, copy, compare; rehearsal): the typical time
  // from the fact being covered to the first answer from memory, for the facts that were right.
  function tenths(ms) { return (Math.round(ms / 100) / 10) + ' s'; }
  function extraLines(s) {
    var lines = [];
    if (!s) return lines;
    var probe = s.mode === 'probe';
    var c = s.conflict;
    var half = function (name, items, firstTry, ms) {
      return name + ': ' + firstTry + ' of ' + items + (probe ? ' right' : ' on the first try') + (ms ? ', typical time ' + tenths(ms) : '') + '.';
    };
    if (c && c.matchItems) lines.push(half('Matching items', c.matchItems, c.matchFirstTry, c.matchMedianMs));
    if (c && c.conflictItems) lines.push(half('Conflicting items', c.conflictItems, c.conflictFirstTry, c.conflictMedianMs));
    var r = s.recall;
    if (r && r.items && r.medianMs !== null && r.medianMs !== undefined) lines.push('Typical time to answer from memory: ' + tenths(r.medianMs) + ' (' + count(r.items, 'fact') + ' right on the first try).');
    return lines;
  }
  function learnerNamed(key) { return model ? model.learners.filter(function (row) { return row.key === key; })[0] || null : null; }
  // Follow state.merges chains with cycle protection (matches reader.addUp).
  function canonKey(key) {
    var k = String(key == null ? '' : key);
    for (var hop = 0; hop < 12 && k && Object.prototype.hasOwnProperty.call(state.merges, k) && state.merges[k] !== k; hop++) {
      k = state.merges[k];
    }
    return k;
  }
  function wouldCycle(fromKey, intoKey) {
    var cur = String(intoKey == null ? '' : intoKey);
    for (var hop = 0; hop < 12 && cur; hop++) {
      if (cur === fromKey) return true;
      if (!Object.prototype.hasOwnProperty.call(state.merges, cur) || state.merges[cur] === cur) break;
      cur = state.merges[cur];
    }
    return false;
  }
  function mergedMapValue(map, learnerKey, measureKey) {
    var direct = learnerKey + '\n' + measureKey;
    if (direct in map) return map[direct];
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], at = k.indexOf('\n');
      if (at >= 0 && k.slice(at + 1) === measureKey && canonKey(k.slice(0, at)) === learnerKey) return map[k];
    }
    return undefined;
  }
  function clearMergedMap(map, learnerKey, measureKey) {
    delete map[learnerKey + '\n' + measureKey];
    Object.keys(map).forEach(function (k) {
      var at = k.indexOf('\n');
      if (at >= 0 && k.slice(at + 1) === measureKey && canonKey(k.slice(0, at)) === learnerKey) delete map[k];
    });
  }
  function labelFor(key) {
    var found = '';
    state.sessions.forEach(function (s) { if (!found && reader.labelKey(s.learner) === key) found = s.learner; });
    return found || key;
  }

  // ---------------------------------------------------------------------------
  // Reading files
  // ---------------------------------------------------------------------------
  var MAX_ZIP_BYTES = 50 * 1024 * 1024;
  function readText(file) {
    if (file && Number(file.size) > reader.MAX_BYTES) return Promise.reject(new Error('too_big'));
    if (file && file._bytes) {
      if (file._bytes.byteLength > reader.MAX_BYTES) return Promise.reject(new Error('too_big'));
      try { return Promise.resolve(new TextDecoder('utf-8').decode(file._bytes)); }
      catch (_) { return Promise.reject(new Error('unreadable')); }
    }
    return new Promise(function (done, fail) {
      var fileReader = new FileReader();
      fileReader.onload = function () { done(String(fileReader.result == null ? '' : fileReader.result)); };
      fileReader.onerror = function () { fail(new Error('unreadable')); };
      fileReader.readAsText(file);
    });
  }
  function readBuffer(file) {
    var zipLimit = Number(reader.MAX_ZIP_BYTES) || MAX_ZIP_BYTES;
    if (file && Number(file.size) > zipLimit) return Promise.reject(new Error('too_big'));
    if (file && file._bytes) {
      if (file._bytes.byteLength > zipLimit) return Promise.reject(new Error('too_big'));
      return Promise.resolve(file._bytes);
    }
    if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise(function (done, fail) {
      var fileReader = new FileReader();
      fileReader.onload = function () { done(fileReader.result); };
      fileReader.onerror = function () { fail(new Error('unreadable')); };
      fileReader.readAsArrayBuffer(file);
    });
  }
  function isZipFile(file) {
    var name = String((file && file.name) || '');
    var type = String((file && file.type) || '');
    return /\.zip$/i.test(name) || type === 'application/zip' || type === 'application/x-zip-compressed';
  }
  function addSession(s, drop, fromFile) {
    var have = state.byId[s.sessionId];
    if (have) {
      // Of two copies of one result, the one that was not changed is the one kept, and the list says which (2026-11-13).
      var swap = have.integrity !== 'ok' && s.integrity === 'ok';
      var note = swap && have.integrity === 'changed' ? ' That copy was changed after it was saved, so this one is counted.'
        : !swap && s.integrity === 'changed' && have.integrity === 'ok' ? ' This copy was changed after it was saved; the one that was not is counted.' : '';
      if (fromFile) { state.duplicates.push({ file: s.sourceFile, first: have.sourceFile, note: note }); drop.look++; }
      if (swap) {
        state.sessions[state.sessions.indexOf(have)] = s; state.byId[s.sessionId] = s;
        // 2026-11-13: the changed copy was counted as "needs a look" when it came in; now it is listed only once, as a copy.
        if (drop.changed && drop.changed[s.sessionId]) { drop.look--; delete drop.changed[s.sessionId]; }
      }
      return;
    }
    if (state.sessions.length >= reader.MAX_SESSIONS) { state.leftOut++; return; }
    state.sessions.push(s);
    state.byId[s.sessionId] = s;
    if (fromFile && s.integrity === 'changed') { drop.look++; if (drop.changed) drop.changed[s.sessionId] = true; }
  }
  function takeBundle(bundle, drop) {
    bundle.sessions.forEach(function (s) { addSession(s, drop, false); });
    bundle.merges.forEach(function (row) {
      if (row.from && row.into && !(row.from in state.merges) && !wouldCycle(row.from, row.into)) {
        state.merges[row.from] = canonKey(row.into);
      }
    });
    bundle.apart.forEach(function (row) { state.apart[reader.pairKey(row[0], row[1])] = true; });
    bundle.goals.forEach(function (row) { var key = row.learner + '\n' + row.measure; if (!(key in state.goals)) state.goals[key] = row.value; });
    // 2026-11-17: goal dates and paper scores, kept the way goals are. A paper score already on the page is not added twice.
    (bundle.goalDates || []).forEach(function (row) { var key = row.learner + '\n' + row.measure; if (!(key in state.goalDates)) state.goalDates[key] = row.date; });
    (bundle.paper || []).forEach(function (row) {
      if (state.paper.length >= 500) return;
      var same = state.paper.some(function (p) { return p.learner === row.learner && p.measure === row.measure && p.date === row.date && p.value === row.value && p.note === row.note; });
      if (!same) addPaper(row);
    });
  }
  var paperCount = 0;
  function addPaper(row) {
    var entry = { id: 'paper-' + (++paperCount), learner: row.learner, measure: row.measure, name: row.name, date: row.date, value: row.value, note: row.note || '' };
    state.paper.push(entry);
    return entry;
  }
  function absorb(result, drop) {
    drop.read++;
    if (!result.ok) { state.notResults.push({ file: result.name, why: result.why }); drop.look++; return; }
    if (result.bundle) { takeBundle(result.bundle, drop); return; }
    result.sessions.forEach(function (s) { addSession(s, drop, true); });
  }
  function startDrop() {
    if (state.sample) { var keep = state.keep; state = fresh(); state.keep = keep; }
    return { read: 0, look: 0, changed: Object.create(null), had: state.sessions.length };
  }
  function finishDrop(drop) {
    changed();
    // 2026-11-17: more files added to results already on the page: offer, once, to save it all for next week.
    if (drop.had > 0 && state.sessions.length > drop.had) offerSave();
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
    lastRemoved = null;
    var drop = startDrop();
    try {
      var files = all.slice(0, reader.MAX_FILES);
      state.leftOut += all.length - files.length;
      say('Reading ' + count(files.length, 'file') + '.');
      var budget = reader.MAX_FILES;
      for (var i = 0; i < files.length; i++) {
        var file = files[i], result;
        if (isZipFile(file) && typeof reader.unpackZip === 'function') {
          if (budget <= 0) { state.leftOut++; continue; }
          var zipLimit = Number(reader.MAX_ZIP_BYTES) || MAX_ZIP_BYTES;
          if (Number(file.size) > zipLimit) {
            absorb({ ok: false, name: String(file.name || 'archive.zip'), why: 'This .zip file is larger than 50 MB. Unzip it on your device and drop the results files in smaller groups.' }, drop);
            continue;
          }
          var unpacked;
          try { unpacked = await reader.unpackZip(await readBuffer(file), { maxFiles: budget }); }
          catch (_) { unpacked = { ok: false, why: reader.REASONS.unreadable, entries: [], skipped: [], leftOut: 0 }; }
          if (!unpacked.ok) {
            absorb({ ok: false, name: String(file.name || 'archive.zip'), why: unpacked.why }, drop);
            continue;
          }
          state.leftOut += unpacked.leftOut || 0;
          (unpacked.skipped || []).forEach(function (skip) {
            state.notResults.push({ file: skip.name, why: skip.why });
            drop.look++;
          });
          if (!unpacked.entries.length && (unpacked.skipped || []).length) drop.read++;
          for (var j = 0; j < unpacked.entries.length; j++) {
            if (budget <= 0) { state.leftOut++; continue; }
            budget--;
            var entry = unpacked.entries[j];
            try { result = await reader.read(entry.text, { name: entry.name, lastModified: file.lastModified }); }
            catch (_) { result = reader.refuse('unreadable', entry.name); }
            absorb(result, drop);
          }
          continue;
        }
        if (budget <= 0) { state.leftOut++; continue; }
        budget--;
        if (Number(file.size) > reader.MAX_BYTES) result = reader.refuse('too_big', file.name);
        else {
          try { result = await reader.read(await readText(file), { name: file.name, lastModified: file.lastModified }); }
          catch (_) { result = reader.refuse('unreadable', file.name); }
        }
        absorb(result, drop);
      }
    } finally {
      busy = false;
    }
    finishDrop(drop);
  }
  async function loadSamples() {
    if (busy) return;
    busy = true;
    lastRemoved = null;
    unsavedEdits = false;
    state = fresh();
    state.sample = true;
    say('Reading the sample files.');
    var drop = { read: 0, look: 0 };
    try {
      for (var i = 0; i < SAMPLE_FILES.length; i++) {
        var text = String.fromCharCode(0xFEFF) + SAMPLE_FILES[i].lines.join('\r\n') + '\r\n';
        absorb(await reader.read(text, { name: SAMPLE_FILES[i].name }), drop);
      }
    } finally {
      busy = false;
    }
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
      goals: Object.keys(state.goals).map(function (key) { var at = key.indexOf('\n'); return { learner: key.slice(0, at), measure: key.slice(at + 1), value: state.goals[key] }; }),
      goalDates: Object.keys(state.goalDates).map(function (key) { var at = key.indexOf('\n'); return { learner: key.slice(0, at), measure: key.slice(at + 1), date: state.goalDates[key] }; }),
      paper: state.paper.map(function (p) { return { learner: p.learner, measure: p.measure, name: p.name, date: p.date, value: p.value, note: p.note }; }) });
  }
  function forgetStored() { try { storage().removeItem(STORE_KEY); } catch (_) { /* nothing was kept */ } }
  function persist() {
    if (!state.keep || state.sample) return;
    try {
      if (state.sessions.length) storage().setItem(STORE_KEY, JSON.stringify(bundleNow())); else forgetStored();
      unsavedEdits = false;
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
    try {
      bundle = reader.readBundle(JSON.parse(raw, function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      }));
    } catch (_) { bundle = null; }
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
    setText('check-line', results ? count(results, 'result') + ' counted, from ' + count(model.learners.length, 'student') + '. Look through the points below, then show the results.'
      : 'None of these files is a results file, so there is nothing to show yet.');
    if (state.notResults.length) add(body, checkGroup('Not results files', 'These files were not counted.',
      state.notResults.map(function (row) { return fileRow(row.file, row.why); })));
    if (state.duplicates.length) add(body, checkGroup('The same result more than once', 'Each result is counted once.',
      state.duplicates.map(function (row) { return fileRow(row.file, 'The same result as ' + row.first + '.' + (row.note || '')); })));
    if (model.changed.length) add(body, checkGroup('Changed after saving', 'These files were changed after they were saved. They are still counted, and each one carries a note.',
      model.changed.map(function (s) { return fileRow(s.sourceFile, (s.learner || reader.NO_NAME) + ', ' + showDate(s.date) + '.'); })));
    if (model.suggestions.length) add(body, checkGroup('One student, written two ways?', 'These names are close. Nothing is put together unless you say so.',
      model.suggestions.map(function (row) {
        var item = el('li', 'pair');
        var line = add(el('p', 'pair-names'), el('strong', '', row.a.label), doc.createTextNode(' (' + count(row.a.count, 'result') + ') and '),
          el('strong', '', row.b.label), doc.createTextNode(' (' + count(row.b.count, 'result') + ')'));
        var same = button('btn btn-small', 'These are the same student');
        var differ = button('btn btn-small', 'These are different students');
        same.setAttribute('aria-label', row.a.label + ' and ' + row.b.label + ': these are the same student');
        differ.setAttribute('aria-label', row.a.label + ' and ' + row.b.label + ': these are different students');
        same.addEventListener('click', function () {
          // The name with fewer results joins the one with more.
          var from = row.a.count < row.b.count ? row.a : row.b, into = from === row.a ? row.b : row.a;
          if (!from.key || !into.key || wouldCycle(from.key, into.key)) return;
          state.merges[from.key] = canonKey(into.key);
          markEdited();
          answered(from.label + ' and ' + into.label + ' are counted as one student.');
        });
        differ.addEventListener('click', function () {
          state.apart[row.pair] = true;
          markEdited();
          answered(row.a.label + ' and ' + row.b.label + ' stay two students.');
        });
        return add(item, line, add(el('p', 'pair-buttons'), same, differ));
      })));
    var merged = Object.keys(state.merges);
    if (merged.length) add(body, checkGroup('Counted as one student', 'You said these are the same student.', merged.map(function (from) {
      var item = el('li', 'pair');
      var undo = button('btn btn-small', 'Count them apart again');
      var line = labelFor(from) + ' is counted with ' + labelFor(state.merges[from]) + '.';
      undo.setAttribute('aria-label', line + ' Count them apart again');
      undo.addEventListener('click', function () { delete state.merges[from]; markEdited(); answered(labelFor(from) + ' is counted apart again.'); });
      return add(item, el('p', 'pair-names', line), add(el('p', 'pair-buttons'), undo));
    })));
    if (state.leftOut) add(body, el('p', 'note', 'Only the first ' + reader.MAX_FILES + ' files of a drop are read, and the page holds ' + reader.MAX_SESSIONS + ' results. Left out: ' + state.leftOut + '.'));
    if (!body.firstChild) add(body, el('p', 'hint', 'Nothing needs a look.'));
    var mergeFold = $('manual-merge'), mergeHost = $('manual-merge-body');
    if (mergeFold && mergeHost) {
      mergeHost.textContent = '';
      var mergeable = model.learners.filter(function (l) { return !!l.key; });
      if (mergeable.length >= 2) {
        mergeFold.hidden = false;
        var fromSel = el('select');
        fromSel.id = 'merge-from';
        var intoSel = el('select');
        intoSel.id = 'merge-into';
        mergeable.forEach(function (l) {
          var o1 = el('option', '', l.label + ' (' + count(l.count, 'result') + ')'); o1.value = l.key; fromSel.appendChild(o1);
          var o2 = el('option', '', l.label + ' (' + count(l.count, 'result') + ')'); o2.value = l.key; intoSel.appendChild(o2);
        });
        intoSel.selectedIndex = 1;
        var fromLab = el('label', '', 'Move results from'); fromLab.htmlFor = 'merge-from';
        var intoLab = el('label', '', 'Into'); intoLab.htmlFor = 'merge-into';
        var mergeGo = button('btn btn-small', 'Combine names');
        mergeGo.id = 'merge-go';
        var mergeNote = el('p', 'hint', '');
        mergeNote.setAttribute('role', 'status');
        mergeGo.addEventListener('click', function () {
          var fKey = fromSel.value, tKey = intoSel.value;
          if (!fKey || !tKey || fKey === tKey || wouldCycle(fKey, tKey)) { mergeNote.textContent = 'Choose two different names to combine.'; return; }
          state.merges[fKey] = canonKey(tKey);
          markEdited();
          offerSave();
          answered(labelFor(fKey) + ' and ' + labelFor(tKey) + ' are counted as one student.');
        });
        add(mergeHost, el('p', 'hint', 'If one student typed two different names in their files, combine them here.'),
          add(el('div', 'manual-merge-row'), add(el('div', 'field'), fromLab, fromSel), add(el('div', 'field'), intoLab, intoSel), mergeGo), mergeNote);
      } else {
        mergeFold.hidden = true;
        mergeFold.open = false;
      }
    }
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
    setText('results-line', count(model.count, 'result') + ' from ' + count(model.learners.length, 'student') + (range ? '. ' + range + '.' : '.'));
    var look = lookCount();
    show('open-check', look > 0 || Object.keys(state.merges).length > 0 || model.learners.length >= 2);
    setText('open-check', 'Check what was read' + (look ? ' (' + look + ')' : ''));
    show('sample-note', state.sample);
    show('save-nudge', nudge === 'shown' && !state.sample);
    drawUndo();
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
    syncLearnerControls();
    drawKeep();
  }
  function syncLearnerControls() {
    var list = model && Array.isArray(model.learners) ? model.learners : [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].key === state.learner) { idx = i; break; }
    var prev = $('prev-learner'), next = $('next-learner'), printBtn = $('print-learner'), copyBtn = $('copy-summary');
    if (prev) prev.disabled = !(list.length > 1 && idx > 0);
    if (next) next.disabled = !(list.length > 1 && idx >= 0 && idx < list.length - 1);
    var cur = idx >= 0 ? list[idx] : null;
    if (printBtn) {
      printBtn.disabled = !cur;
      printBtn.textContent = cur ? 'Print ' + cur.label : 'Print this student';
    }
    if (copyBtn) {
      copyBtn.disabled = !cur;
      if (cur) copyBtn.setAttribute('aria-label', 'Copy student summary for ' + cur.label);
      else copyBtn.removeAttribute('aria-label');
    }
  }
  function hideSummaryBox() {
    var box = $('copy-summary-box');
    if (box) { box.textContent = ''; box.hidden = true; }
  }
  function drawView() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="view"]'), function (radio) {
      radio.checked = radio.value === state.view;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
    show('view-group', state.view === 'group');
    show('view-learner', state.view === 'learner');
    hideSummaryBox();
    // Only the view that is shown is on the page: the other one is emptied, not just hidden.
    $('middles').textContent = '';
    if ($('group-filter')) $('group-filter').remove();
    $('group-table').textContent = '';
    if ($('group-missed')) { $('group-missed').textContent = ''; $('group-missed').hidden = true; }
    $('learner-body').textContent = '';
    if (state.view === 'group') drawGroup(); else drawLearner();
    setPrintHead();
    syncLearnerControls();
    // A table measured while its view was hidden is measured again now it shows.
    measureCues();
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
      add(card, el('p', 'middle-name', mid.label + (formText(mid.form) ? ', version ' + mid.form : '')), el('p', 'middle-label', 'Middle of this group (n = ' + mid.n + ')'),
        add(el('p', 'middle-value'), el('span', 'middle-number', String(mid.median)), doc.createTextNode(' ' + unitFor(mid.median, mid.unitName))),
        el('p', 'middle-range', (mid.q1 !== null ? 'Middle half: ' + mid.q1 + ' to ' + mid.q3 + '. ' : '') + 'Lowest ' + mid.min + ', highest ' + mid.max + '.'));
      row.appendChild(card);
    });
    add(host, row, el('p', 'honest', HONEST),
      el('p', 'hint', 'Each student counts once, with the latest score on that form. The middle score is the median. From 10 students the middle half is shown too: it leaves out the lowest quarter and the highest quarter of these scores.'));
  }
  // A check's cell: the latest result with a score (the one the middle of the group counts), its form, and a
  // note when a later result has no score. With no scored result yet, the latest one and why it has none.
  function checkCell(cell) {
    if (!cell) return null;
    var parts = [valueText(cell.value, false), formText(cell.form) ? 'version ' + cell.form : ''];
    if (cell.value === null && cell.noScore) parts.push(cell.noScore === 'untimed_no_rate' ? 'no clock: ' + cell.correct + ' of ' + cell.attempted + ' right' : noScoreShort(cell.noScore));
    if (cell.after) parts.push('Later, ' + showDate(cell.after.date, true) + ': no score (' + noScoreShort(cell.after.noScore) + ')');
    return parts;
  }
  // 2026-11-17: a practice cell is the latest result for that skill from ANY file, so it says which file: its title, and its
  // version when it has one. Files are told apart by their packet id and version (the title when an old file has no id).
  function fileOfCell(cell) {
    var s = cell && state.byId[cell.sessionId];
    if (!s) return null;
    var label = (s.title || s.packetId || 'a file') + (formText(s.form) ? ', version ' + s.form : '');
    return { key: (s.packetId || s.title) + '\t' + s.form, label: label };
  }
  // The practice columns whose students' latest results come from more than one file.
  function mixedStrands() {
    return model.strands.filter(function (strand) {
      var seen = Object.create(null), n = 0;
      model.learners.forEach(function (learner) {
        var from = fileOfCell(learner.strands[strand[0]]);
        if (from && !seen[from.key]) { seen[from.key] = true; n++; }
      });
      return n > 1;
    }).map(function (strand) { return strand[1]; });
  }
  function listWords(words) { return words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]; }
  // The columns of the group's two tables (2026-11-13; one table of 2524 px before): checks first, then practice.
  // Each starts with the student's name; the first one shown also has the number of results and the last date.
  function groupColumns() {
    var base = [
      { id: 'learner', label: 'Student', value: function (row) { return row.label.toLowerCase(); } },
      { id: 'count', label: 'Results', number: true, value: function (row) { return row.count; } },
      { id: 'last', label: 'Last date', number: true, value: function (row) { return row.lastDate || null; } },
    ];
    var practice = model.strands.map(function (strand) {
      return { id: 's:' + strand[0], label: strand[1], number: true, value: function (row) { var cell = row.strands[strand[0]]; return cell ? cell.value : null; },
        cell: function (row) {
          var cell = row.strands[strand[0]];
          if (!cell) return null;
          var nk = cell.newFacts;
          var from = fileOfCell(cell);
          return [cell.value + '%', cell.firstTry + ' of ' + cell.graded].concat(nk && nk.items ? ['new facts ' + nk.firstTry + ' of ' + nk.items] : [], from ? ['from ' + from.label] : []);
        } };
    });
    var checks = model.checks.map(function (series) {
      return { id: 'c:' + series.key, label: series.label, sub: series.unitName, number: true, value: function (row) { var cell = row.checks[series.key]; return cell ? cell.value : null; },
        cell: function (row) { return checkCell(row.checks[series.key]); } };
    });
    var tables = [
      { id: 'checks', title: 'Checks: latest score', columns: checks,
        hint: 'Each check shows the latest result with a score, the one the middle of the group counts. A later result with no score is noted under it.' },
      { id: 'practice', title: 'Practice: latest first-try percent', columns: practice,
        hint: 'Practice shows the share of answers that were right on the first try, in the latest result that has that skill, from any file. Each cell names the file it came from.' },
    ].filter(function (table) { return table.columns.length; });
    tables.forEach(function (table, i) { table.columns = (i ? base.slice(0, 1) : base).concat(table.columns); });
    return tables;
  }
  function filteredLearners() {
    var q = String(state.groupQuery || '').trim().toLowerCase();
    if (!q || !model || model.learners.length < 8) return model ? model.learners.slice() : [];
    return model.learners.filter(function (row) {
      if (String(row.label || '').toLowerCase().indexOf(q) >= 0) return true;
      return Array.isArray(row.labels) && row.labels.some(function (alt) { return String(alt || '').toLowerCase().indexOf(q) >= 0; });
    });
  }
  function sortedLearners(columns, sort, list) {
    var column = columns.filter(function (c) { return c.id === sort.by; })[0] || columns[0];
    var turn = column.id === sort.by && sort.down ? -1 : 1;
    return (list || model.learners).slice().sort(function (a, b) {
      var x = column.value(a), y = column.value(b);
      // A learner with nothing in this column goes last, whichever way the column is sorted.
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return x < y ? -turn : x > y ? turn : 0;
    });
  }
  function mergeWordLists(first, second, max) {
    var seen = Object.create(null), out = [];
    (first || []).concat(second || []).forEach(function (word) {
      var text = String(word || '').trim();
      var key = text.toLowerCase();
      if (!text || seen[key] || (max && out.length >= max)) return;
      seen[key] = true;
      out.push(text);
    });
    return out;
  }
  // A box a table scrolls in, with a cue that shows when the table is wider than the box (2026-11-13).
  // measureCues() says which boxes are wider, once they are on the page.
  function scrollBox(extra) {
    var scroll = el('div', 'table-scroll' + (extra ? ' ' + extra : ''));
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    var cue = el('p', 'scroll-cue', 'More columns to the right: scroll this table sideways.');
    cue.setAttribute('aria-hidden', 'true');
    cue.hidden = true;
    return add(scroll, cue);
  }
  function measureCues() {
    Array.prototype.forEach.call(doc.querySelectorAll('#state-results .table-scroll'), function (box) {
      var wide = box.scrollWidth > box.clientWidth + 2;
      box.classList.toggle('is-wide', wide);
      var cue = box.querySelector('.scroll-cue');
      if (cue) cue.hidden = !wide;
    });
  }
  function parseMathFactText(raw) {
    var m = /^(\d{1,3})\s*([-+xX*/:\u2212\u00D7\u00F7])\s*(\d{1,3})$/.exec(String(raw || '').trim());
    if (!m) return null;
    var op = m[2] === '+' ? '+' : (m[2] === '-' || m[2] === '\u2212') ? '-' : (m[2] === 'x' || m[2] === 'X' || m[2] === '*' || m[2] === '\u00D7') ? 'x' : '/';
    return { text: m[0], a: m[1], b: m[3], op: op, key: m[1] + op + m[3] };
  }

  function mentalMathFlags(factTexts) {
    var flags = { make10: false, doubles: false, mult2510: false, squares: false };
    (factTexts || []).forEach(function (txt) {
      var parsed = parseMathFactText(txt);
      if (!parsed) return;
      var a = Number(parsed.a), b = Number(parsed.b);
      if (parsed.op === '+') {
        if (a >= 0 && b >= 0 && a + b === 10) flags.make10 = true;
        if (a >= 2 && b >= 2 && Math.abs(a - b) <= 1) flags.doubles = true;
      } else if (parsed.op === 'x') {
        if (a >= 1 && b >= 1 && a <= 12 && b <= 12 && (a === 2 || a === 5 || a === 10 || b === 2 || b === 5 || b === 10)) flags.mult2510 = true;
        if (a >= 2 && a <= 10 && a === b) flags.squares = true;
      }
    });
    return flags;
  }

  // 2026-11-17: a maker opens in a new tab, so this page and what is on it stay (it was the same tab, and the results were gone
  // unless "Keep these results" was on). The words "opens in a new tab" are part of the link's name, and a line under the links says it too.
  var NEW_TAB = ' (opens in a new tab)';
  function navButton(label, target) {
    var link = el('a', 'btn btn-small nav-new-tab', label);
    link.href = target;
    link.target = '_blank';
    link.rel = 'noopener';
    add(link, el('span', 'sr-only', NEW_TAB));
    return link;
  }
  function newTabHint() { return el('p', 'hint new-tab-hint no-print', 'These buttons open the maker in a new tab. This page stays open as it is.'); }
  function nextPracticeCard(links) {
    if (!links || !links.length) return null;
    var box = el('section', 'next-practice no-print');
    var row = el('div', 'next-practice-links');
    links.forEach(function (link) { if (link) row.appendChild(link); });
    return add(box, el('h4', 'next-practice-title', 'Next practice from missed items'), row, newTabHint());
  }

  var SR_CUSTOM_TOKEN = /^[A-Za-z0-9]{1,16}$/;
  var SR_SPECIAL_MODE = /(?:stroop|subitize|flanker|^math_)/i;
  var SR_MODE_LABELS = {
    color_word_stroop: 'ink color',
    number_size_stroop: 'number size',
    quantity_stroop: 'count the symbols',
    flanker_letters: 'center letter',
    subitize_dots: 'dot patterns',
    ras_switch: 'rapid switching',
    ras_triple: '3-way rapid switching',
    math_make_10: 'make-10 partners',
    math_doubles: 'doubles facts',
    math_mult_2_5_10: '2s, 5s, and 10s',
    math_squares: 'multiplication squares',
  };
  function srModeLabel(modeId) {
    var k = String(modeId || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(SR_MODE_LABELS, k) ? SR_MODE_LABELS[k] : k.replace(/_/g, ' ');
  }
  function srModeOf(session) {
    var m = /^symbol-runner-([a-z0-9_]+)-/i.exec(String((session && session.packetId) || ''));
    return m ? m[1].toLowerCase() : '';
  }
  function isSrSpecialMode(mode) { return !!mode && SR_SPECIAL_MODE.test(mode); }

  function drawGroupMissed() {
    var viewGroup = $('view-group');
    var groupTable = $('group-table');
    if (!viewGroup || !groupTable) return;
    var host = $('group-missed');
    if (!host) {
      host = el('div', 'group-missed');
      host.id = 'group-missed';
      viewGroup.appendChild(host);
    }
    host.textContent = '';
    if (!model || !Array.isArray(model.learners) || model.learners.length < 2) {
      host.hidden = true;
      return;
    }

    var byKey = Object.create(null);
    var list = [];
    var mathEverMastered = Object.create(null);
    var mathAnyMissed = Object.create(null);

    function ensureEntry(uid, display, kind) {
      if (!byKey[uid]) {
        byKey[uid] = { uid: uid, display: display, kind: kind, students: 0, misses: 0, wrongCounts: Object.create(null), names: [] };
        list.push(byKey[uid]);
      }
      return byKey[uid];
    }

    function recordMiss(learnerSeen, uid, display, kind, it) {
      var entry = ensureEntry(uid, display, kind);
      entry.misses += 1;
      if (!learnerSeen[uid]) {
        learnerSeen[uid] = true;
        entry.students += 1;
        entry.names.push(learnerNow);
      }
      var targetLower = String(it.target || it.word || display || '').trim().toLowerCase();
      var responses = Array.isArray(it.responses) ? it.responses : [];
      var wrongSeen = Object.create(null);
      responses.forEach(function (raw) {
        var r = String(raw || '').trim();
        var rl = r.toLowerCase();
        if (!rl || rl === targetLower || wrongSeen[rl]) return;
        wrongSeen[rl] = true;
        if (!entry.wrongCounts[rl]) entry.wrongCounts[rl] = { value: r, count: 0 };
        entry.wrongCounts[rl].count += 1;
      });
    }

    var learnerNow = '';
    model.learners.forEach(function (learner) {
      var learnerSeen = Object.create(null);
      learnerNow = learner.label;
      (learner.sessions || []).forEach(function (s) {
        var sMode = srModeOf(s);
        var srSpecial = isSrSpecialMode(sMode);
        (s.items || []).forEach(function (it) {
          if (it.practice || !it.attempted) return;
          var act = String(it.activity || '');
          if (/^math_(?:computation|ccc|rehearsal)$/i.test(act)) {
            var mf = parseMathFactText(it.word);
            if (!mf) return;
            if (it.firstTry && it.correct) {
              if (!mathEverMastered[mf.key]) mathEverMastered[mf.key] = mf;
            } else {
              mathAnyMissed[mf.key] = true;
              if (mf.op === '+' || mf.op === 'x') mathAnyMissed[mf.b + mf.op + mf.a] = true;
              recordMiss(learnerSeen, 'math:' + mf.key, mf.text, 'math', it);
            }
            return;
          }
          if (it.firstTry && it.correct) return;
          if (act === 'symbol_runner') {
            var sym = String(it.target || it.word || '').trim();
            if (!sym) return;
            var srKind = srSpecial ? ('sr_mode:' + sMode) : (SR_CUSTOM_TOKEN.test(sym) ? 'sr' : 'sr_other');
            recordMiss(learnerSeen, 'sr:' + sym.toLowerCase(), sym, srKind, it);
          } else if (/^vocab_/i.test(act)) {
            var vw = String(it.word || it.target || '').trim();
            if (!vw) return;
            recordMiss(learnerSeen, 'vocab:' + vw.toLowerCase(), vw, 'vocab', it);
          } else if (act === 'quantity_discrimination') {
            var qdDisp = String(it.word || it.target || '').trim();
            if (!qdDisp) return;
            recordMiss(learnerSeen, 'qd:' + qdDisp.toLowerCase(), qdDisp, 'qd', it);
          } else if (act === 'missing_number') {
            var mnDisp = String(it.word || it.target || '').trim();
            if (!mnDisp) return;
            recordMiss(learnerSeen, 'mn:' + mnDisp.toLowerCase(), mnDisp, 'mn', it);
          } else if (reader && reader.ACTIVITIES && own(reader.ACTIVITIES, act)) {
            var ww = String(it.word || it.target || '').trim();
            if (!ww || !/^[a-z]{2,16}$/i.test(ww)) return;
            recordMiss(learnerSeen, 'ws:' + ww.toLowerCase(), ww.toLowerCase(), 'ws', it);
          }
        });
      });
    });

    if (!list.length) {
      host.hidden = true;
      return;
    }

    list.sort(function (a, b) {
      return (b.students - a.students) || (b.misses - a.misses) || a.display.localeCompare(b.display);
    });

    function topWrongText(entry) {
      var best = null;
      Object.keys(entry.wrongCounts).forEach(function (k) {
        var row = entry.wrongCounts[k];
        if (!best || row.count > best.count || (row.count === best.count && row.value < best.value)) best = row;
      });
      if (!best) return '\u2014';
      return best.value + (best.count > 1 ? ' (' + best.count + ')' : '');
    }

    host.hidden = false;
    // 2026-11-17: the students' code names under each count, so a teacher can form a small group. More than 6: in a closed fold.
    function sortedNames(entry) {
      return entry.names.slice().sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0; });
    }
    function namesOf(entry) {
      var names = sortedNames(entry);
      if (names.length <= 6) return el('span', 'cell-sub missed-names', names.join(', '));
      var fold = el('details', 'missed-fold');
      add(fold, el('summary', '', 'Show the ' + names.length + ' names'), el('span', 'cell-sub missed-names', names.join(', ')));
      return fold;
    }
    var copySaid = el('p', 'copy-names-said no-print', '');
    copySaid.setAttribute('role', 'status');
    var copyBox = el('div', 'copy-names-wrap no-print');
    copyBox.hidden = true;
    function copyNamesBtn(entry) {
      var names = sortedNames(entry);
      var btn = button('btn btn-text btn-small no-print copy-names', 'Copy names');
      btn.setAttribute('aria-label', 'Copy student names for ' + entry.display);
      btn.addEventListener('click', function () {
        var text = names.join('\n');
        var manual = function () {
          copyBox.textContent = '';
          var area = el('textarea', 'copy-names-box');
          area.readOnly = true;
          area.rows = Math.min(6, Math.max(2, names.length));
          area.setAttribute('aria-label', 'Student code names to copy');
          area.value = text;
          copyBox.appendChild(area);
          copyBox.hidden = false;
          var msg = 'Select and copy the ' + count(names.length, 'name') + ' below to paste into a batch file.';
          copySaid.textContent = msg;
          say(msg);
          area.focus();
          area.select();
        };
        try {
          window.navigator.clipboard.writeText(text).then(function () {
            copyBox.hidden = true;
            var msg = 'Copied ' + count(names.length, 'name') + ' for ' + entry.display + ' (one per line for batch files).';
            copySaid.textContent = msg;
            say(msg);
          }, manual);
        } catch (_) { manual(); }
      });
      return btn;
    }
    add(host, el('h4', 'group-sub', 'Most missed across the group'));
    add(host, plainTable('Most missed across the group', ['Item', 'Students', 'Misses', 'Common wrong answer'],
      list.slice(0, 10).map(function (entry) {
        return [entry.display, [entry.students + ' of ' + model.learners.length, namesOf(entry), copyNamesBtn(entry)], String(entry.misses), topWrongText(entry)];
      }), 'narrow'));
    add(host, el('p', 'hint', 'Under each count are the students who missed it, by the names in their files. Use them to form a small group.'), copySaid, copyBox);

    var srList = list.filter(function (e) { return e.kind === 'sr'; }).slice(0, 6).map(function (e) { return e.display; });
    var srModes = [];
    list.forEach(function (e) {
      if (e.kind.indexOf('sr_mode:') === 0) {
        var modeId = e.kind.slice(8);
        if (modeId && srModes.indexOf(modeId) < 0 && srModes.length < 2) srModes.push(modeId);
      }
    });
    var vocabList = list.filter(function (e) { return e.kind === 'vocab'; }).slice(0, 12).map(function (e) { return e.display; });
    var wsList = list.filter(function (e) { return e.kind === 'ws'; }).slice(0, 12).map(function (e) { return e.display; });
    var mathList = list.filter(function (e) { return e.kind === 'math'; }).slice(0, 12).map(function (e) { return e.display; });
    var hasQd = list.some(function (e) { return e.kind === 'qd'; });
    var hasMn = list.some(function (e) { return e.kind === 'mn'; });

    var groupLinks = [];
    if (srList.length || srModes.length) {
      if (srList.length) groupLinks.push(navButton('Practice group missed symbols in Symbol Runner', 'packets-symbol-runner.html#rehearse=' + encodeURIComponent(srList.join(','))));
      srModes.forEach(function (modeId) {
        groupLinks.push(navButton('Practice group ' + srModeLabel(modeId) + ' in Symbol Runner', 'packets-symbol-runner.html#mode=' + encodeURIComponent(modeId)));
      });
    }
    if (vocabList.length) {
      groupLinks.push(navButton('Practice group missed words in Vocabulary', 'packets-vocab.html#rehearse=' + encodeURIComponent(vocabList.join(','))));
    }
    if (wsList.length) {
      groupLinks.push(navButton('Practice group missed words in Word Sounds', 'packets-make.html#rehearse=' + encodeURIComponent(wsList.join(','))));
    }
    var groupWordCards = mergeWordLists(vocabList, wsList, 24);
    if (groupWordCards.length) {
      groupLinks.push(navButton('Open group missed words in Present & print word cards', 'packets-present-export.html#words=' + encodeURIComponent(groupWordCards.join(','))));
    }
    if (mathList.length) {
      var groupKnown = [];
      Object.keys(mathEverMastered).forEach(function (k) {
        if (groupKnown.length >= 8 || mathAnyMissed[k]) return;
        groupKnown.push(mathEverMastered[k].text);
      });
      var mathGroupHref = 'packets-math-practice.html#rehearse=' + encodeURIComponent(mathList.join(',')) + (groupKnown.length >= 3 ? '&known=' + encodeURIComponent(groupKnown.join(',')) : '');
      // 2026-11-17: the maker's own name ("Make math fact practice"), not "Math Facts".
      groupLinks.push(navButton('Practice group missed facts in Math fact practice', mathGroupHref));
      var gMental = mentalMathFlags(mathList);
      if (gMental.make10) groupLinks.push(navButton('Practice group make-10 partners in Symbol Runner', 'packets-symbol-runner.html#mode=math_make_10'));
      if (gMental.doubles) groupLinks.push(navButton('Practice group doubles facts in Symbol Runner', 'packets-symbol-runner.html#mode=math_doubles'));
      if (gMental.mult2510) groupLinks.push(navButton('Practice group 2s, 5s, and 10s in Symbol Runner', 'packets-symbol-runner.html#mode=math_mult_2_5_10'));
      if (gMental.squares) groupLinks.push(navButton('Practice group multiplication squares in Symbol Runner', 'packets-symbol-runner.html#mode=math_squares'));
    }
    if (hasQd || hasMn) {
      if (hasQd) groupLinks.push(navButton('Practice group number comparison in Symbol Runner', 'packets-symbol-runner.html#mode=number_size_stroop'));
      if (hasMn) groupLinks.push(navButton('Practice group teen and decade numbers in Symbol Runner', 'packets-symbol-runner.html#mode=digits_teen_decade'));
    }
    add(host, nextPracticeCard(groupLinks));
  }

  function drawGroupTables() {
    var host = $('group-table');
    host.textContent = '';
    var tables = groupColumns();
    var shown = filteredLearners();
    var q = String(state.groupQuery || '').trim();
    var countEl = $('group-filter-count');
    if (countEl) {
      countEl.textContent = q ? (shown.length ? 'Showing ' + shown.length + ' of ' + model.learners.length + ' students.' : 'No students match "' + q + '".') : '';
    }
    // Results in which nothing is scored (a read-along, Letter Trace alone): say so; an empty space reads as a fault.
    if (!tables.length) add(host, el('p', 'group-none', 'Nothing in these results is scored: they are practice that is never scored, such as a read-along. Choose One student to see what each student did.'));
    else if (q && !shown.length) add(host, el('p', 'hint', 'No students match "' + q + '". Clear the search box to show all ' + model.learners.length + ' students.'));
    else tables.forEach(function (spec, n) {
      var sort = state.sort[spec.id];
      var title = el('h4', 'group-sub', spec.title);
      title.id = 'group-' + spec.id + '-title';
      var table = el('table', 'data data-group-table');
      add(table, el('caption', 'sr-only', spec.title + '. One row for each student. Press a column heading to sort by it.'));
      var headRow = el('tr');
      spec.columns.forEach(function (column) {
        var th = el('th');
        th.scope = 'col';
        var on = sort.by === column.id;
        th.setAttribute('aria-sort', on ? (sort.down ? 'descending' : 'ascending') : 'none');
        var sorter = button('sort');
        sorter.setAttribute('data-sort', column.id);
        sorter.setAttribute('data-table', spec.id);
        add(sorter, el('span', 'sort-name', column.label), column.sub ? el('span', 'sort-sub', column.sub) : null);
        sorter.addEventListener('click', function () {
          var next = state.sort[spec.id] = { by: column.id, down: on ? !sort.down : !!column.number };
          drawGroupTables();
          var again = Array.prototype.find.call($('group-table').querySelectorAll('.sort'), function (btn) {
            return btn.getAttribute('data-table') === spec.id && btn.getAttribute('data-sort') === column.id;
          });
          if (again) again.focus();
          say('Sorted by ' + column.label + ', ' + (column.number ? (next.down ? 'high to low' : 'low to high') : (next.down ? 'Z to A' : 'A to Z')) + '.');
        });
        headRow.appendChild(add(th, sorter));
      });
      var body = el('tbody');
      sortedLearners(spec.columns, sort, shown).forEach(function (learner) {
        var row = el('tr');
        var name = el('th');
        name.scope = 'row';
        var open = button('btn btn-text name-link', learner.label);
        open.setAttribute('aria-label', learner.label + ': show this student');
        open.addEventListener('click', function () { state.learner = learner.key; $('pick-learner').value = learner.key; state.view = 'learner'; drawView(); $('learner-title').focus(); });
        row.appendChild(add(name, open, learner.labels.length > 1 ? el('span', 'cell-sub', 'also written ' + learner.labels.filter(function (l) { return l !== learner.label; }).join(', ')) : null));
        spec.columns.forEach(function (column) {
          if (column.id === 'learner') return;
          if (column.id === 'count') { row.appendChild(el('td', 'num', String(learner.count))); return; }
          if (column.id === 'last') { row.appendChild(el('td', 'num', learner.lastDate ? showDate(learner.lastDate) : 'No date')); return; }
          var parts = column.cell(learner);
          var td = el('td', 'num');
          if (parts) parts.forEach(function (part, i) { if (part) add(td, el('span', i ? 'cell-sub' : 'cell-value', part)); });
          else add(td, el('span', 'sr-only', 'No result'));
          row.appendChild(td);
        });
        body.appendChild(row);
      });
      var scroll = scrollBox();
      scroll.setAttribute('aria-labelledby', title.id);
      // 2026-11-17: one plain sentence when a practice column puts results from different files side by side.
      var mixed = spec.id === 'practice' ? mixedStrands() : [];
      var warn = mixed.length ? el('p', 'note mixed-files', 'In ' + listWords(mixed) + ', the students\' latest results come from different files, so compare them with care.') : null;
      add(host, title, warn, add(scroll, add(table, add(el('thead'), headRow), body)),
        el('p', 'hint', spec.hint + (n === tables.length - 1 ? ' Choose a name to see that student over time.' : '')));
    });
    measureCues();
  }
  function drawGroup() {
    drawMiddles();
    var viewGroup = $('view-group');
    var groupTable = $('group-table');
    var existing = $('group-filter');
    if (model.learners.length >= 8) {
      if (!existing && viewGroup && groupTable) {
        var bar = el('div', 'group-filter no-print');
        bar.id = 'group-filter';
        var lab = el('label', '', 'Find a student');
        lab.htmlFor = 'group-search';
        var input = el('input');
        input.id = 'group-search';
        input.type = 'search';
        input.setAttribute('autocomplete', 'off');
        input.value = state.groupQuery || '';
        input.addEventListener('input', function () {
          state.groupQuery = input.value;
          drawGroupTables();
        });
        var countSpan = el('span', 'group-filter-count', '');
        countSpan.id = 'group-filter-count';
        countSpan.setAttribute('role', 'status');
        add(bar, lab, input, countSpan);
        viewGroup.insertBefore(bar, groupTable);
      } else if (existing && $('group-search')) {
        $('group-search').value = state.groupQuery || '';
      }
    } else {
      state.groupQuery = '';
      if (existing) existing.remove();
    }
    drawGroupTables();
    drawGroupMissed();
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
  // 2026-11-17: extra = { aim, paper }. aim (aimOf): a line from the first score to the goal on the goal date. paper: the paper
  // scores of this check, drawn as squares labeled "paper" and never joined to the line of screen scores.
  function drawChart(series, goal, width, extra) {
    extra = extra || {};
    var points = series.points.filter(function (p) { return p.value !== null && p.date; });
    var paper = (extra.paper || []).filter(function (p) { return p.value !== null && p.date; });
    var aim = extra.aim && !extra.aim.bad ? extra.aim : null;
    var dated = Object.create(null), dates = 0;
    points.concat(paper).forEach(function (p) { if (!dated[p.date]) { dated[p.date] = true; dates++; } });
    if (dates < 2) return null;
    var W = Math.max(280, Math.min(720, Math.round(width) || 680)), H = W < 420 ? 220 : 250;
    var left = 46, right = 34, top = 26, bottom = 46, inset = 16;
    var days = points.map(function (p) { return dayNumber(p.date); });
    var paperDays = paper.map(function (p) { return dayNumber(p.date); });
    var allDays = days.concat(paperDays, aim ? [dayNumber(aim.date)] : []);
    var d0 = Math.min.apply(null, allDays), d1 = Math.max.apply(null, allDays);
    if (!(d1 > d0)) return null;
    var most = Math.max.apply(null, points.concat(paper).map(function (p) { return p.value; }).concat(goal === null ? [] : [goal]));
    var scale = series.percent ? { step: 25, top: 100 } : niceTop(most);
    var x = function (day) { return Math.round((left + inset + (W - left - right - inset * 2) * (day - d0) / (d1 - d0)) * 10) / 10; };
    var y = function (value) { return Math.round((top + (H - top - bottom) * (1 - value / scale.top)) * 10) / 10; };
    var id = 'chart-' + (++chartCount);
    var unit = series.percent ? '%' : '';
    var firstPoint = points[0], lastPoint = points[points.length - 1];
    var chart = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': id + '-title ' + id + '-desc', focusable: 'false', 'class': 'chart-svg' });
    var title = svg('title', { id: id + '-title' }, series.name + ': ' + (series.unitName || 'scores') + ' over time');
    var said = (points.length ? count(points.length, 'result') + ' from ' + dateRange(firstPoint.date, lastPoint.date) + '. First ' + firstPoint.value + unit + ', latest ' + lastPoint.value + unit + '.' : '')
      + (paper.length ? (points.length ? ' ' : '') + count(paper.length, 'paper score') + ', drawn as squares: ' + paper.map(function (p) { return p.value + unit + ' on ' + showDate(p.date); }).join(', ') + '.' : '')
      + (goal === null ? '' : ' ' + GOAL_NOTE + ': ' + goal + unit + '.')
      + (aim ? ' Aim line from ' + aim.from.value + unit + ' on ' + showDate(aim.from.date) + ' to ' + aim.goal + unit + ' on ' + showDate(aim.date) + '.' : '')
      + ' The same numbers are in the table below.';
    var desc = svg('desc', { id: id + '-desc' }, said.replace(/^ /, ''));
    add(chart, title, desc);
    for (var level = 0; level <= scale.top + 0.0001; level += scale.step) {
      add(chart, svg('line', { x1: left, x2: W - right, y1: y(level), y2: y(level), 'class': level === 0 ? 'chart-axis' : 'chart-grid' }),
        svg('text', { x: left - 6, y: y(level) + 4, 'text-anchor': 'end', 'class': 'chart-scale' }, level + unit));
    }
    // The dates under the chart: of the results, the paper scores and the goal date, in order.
    var labelDates = Object.keys(dated).concat(aim && !dated[aim.date] ? [aim.date] : []).sort();
    var lastLabel = -100;
    labelDates.forEach(function (date) {
      var day = dayNumber(date), px = x(day), end = x(d1);
      if (day !== d1 && (px - lastLabel < 58 || end - px < 58)) return;
      lastLabel = px;
      add(chart, svg('line', { x1: px, x2: px, y1: H - bottom, y2: H - bottom + 5, 'class': 'chart-axis' }),
        svg('text', { x: px, y: H - bottom + 19, 'text-anchor': 'middle', 'class': 'chart-scale' }, showDate(date, true)));
    });
    var y0 = labelDates[0].slice(0, 4), y1 = labelDates[labelDates.length - 1].slice(0, 4);
    add(chart, svg('text', { x: left, y: H - 6, 'text-anchor': 'start', 'class': 'chart-scale' }, y0 === y1 ? y0 : y0 + ' to ' + y1));
    if (goal !== null) {
      add(chart, svg('line', { x1: left, x2: W - right, y1: y(goal), y2: y(goal), 'class': 'chart-goal', 'stroke-dasharray': '7 5' }),
        svg('text', { x: (left + W - right) / 2, y: y(goal) - 6, 'text-anchor': 'middle', 'class': 'chart-goal-label' }, 'Goal ' + goal + unit));
    }
    if (aim) {
      add(chart, svg('line', { x1: x(dayNumber(aim.from.date)), y1: y(aim.from.value), x2: x(dayNumber(aim.date)), y2: y(aim.goal), 'class': 'chart-aim' }),
        svg('circle', { cx: x(dayNumber(aim.date)), cy: y(aim.goal), r: 5, 'class': 'chart-aim-end', fill: 'none', 'data-date': aim.date, 'data-value': aim.goal }));
    }
    if (points.length) add(chart, svg('polyline', { points: points.map(function (p, i) { return x(days[i]) + ',' + y(p.value); }).join(' '), 'class': 'chart-line', fill: 'none' }));
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
    // A paper score: a square, its value above it and the word "paper" under it.
    paper.forEach(function (p, i) {
      var px = x(paperDays[i]), py = y(p.value);
      add(chart, svg('rect', { x: px - 5, y: py - 5, width: 10, height: 10, 'class': 'chart-paper', 'data-date': p.date, 'data-value': p.value }),
        svg('text', { x: px, y: py < top + 16 ? py + 20 : py - 11, 'text-anchor': 'middle', 'class': 'chart-value' }, p.value + unit),
        svg('text', { x: px, y: py + 19 > H - bottom ? py - 24 : py + 19, 'text-anchor': 'middle', 'class': 'chart-paper-label' }, 'paper'));
    });
    var figure = el('figure', 'chart');
    return add(figure, chart, el('figcaption', 'chart-key', (points.length ? 'Each dot is one result.' : '') + (ring ? ' A ring around a dot means that result has a note in the table.' : '')
      + (paper.length ? (points.length ? ' ' : '') + 'Each square labeled "paper" is a paper score. Paper scores are not joined to the line.' : '')
      + (goal === null ? '' : ' Dashed line: ' + GOAL_NOTE.charAt(0).toLowerCase() + GOAL_NOTE.slice(1) + '.')
      + (aim ? ' Thin line: the aim line, from the first score to the goal on the goal date.' : '')));
  }
  function plainTable(caption, heads, rows, size) {
    // 2026-11-13: on a phone, "Every result" and a measure's table read as one card per row (packets-results.css,
    // .data-cards): each cell carries its column's name. The roles keep it a table for a screen reader when the
    // stylesheet changes how its rows are laid out.
    var cards = size === 'wide' || size === 'measure';
    var table = el('table', 'data data-small' + (size === 'wide' ? ' data-wide' : size === 'measure' ? ' data-measure' : '') + (cards ? ' data-cards' : ''));
    var role = function (node, name) { if (cards) node.setAttribute('role', name); return node; };
    role(table, 'table');
    add(table, el('caption', 'sr-only', caption));
    var headRow = role(el('tr'), 'row');
    var headClasses = heads.map(function (h) { return h && typeof h === 'object' ? String(h.className || '') : ''; });
    var headTexts = heads.map(function (h) { return h && typeof h === 'object' ? String(h.text || '') : String(h); });
    headTexts.forEach(function (text, i) { var th = role(el('th', headClasses[i], text), 'columnheader'); th.scope = 'col'; headRow.appendChild(th); });
    var body = role(el('tbody'), 'rowgroup');
    rows.forEach(function (cells) {
      var row = role(el('tr'), 'row');
      // A cell is text, or a list: its first line, then smaller lines under it.
      cells.forEach(function (text, i) {
        var lines = Array.isArray(text) ? text : [text];
        var firstNode = lines[0] && lines[0].nodeType ? lines[0] : null;
        var cell = role(el(i ? 'td' : 'th', headClasses[i], firstNode ? '' : lines[0]), i ? 'cell' : 'rowheader');
        if (firstNode) cell.appendChild(firstNode);
        // A line can also be a node built here (2026-11-17: the names under a count, in a fold).
        lines.slice(1).forEach(function (line) { add(cell, line && line.nodeType ? line : el('span', 'cell-sub', line)); });
        if (!i) cell.scope = 'row';
        else if (cards) cell.setAttribute('data-label', headTexts[i]);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    var scroll = scrollBox(size === 'narrow' ? 'table-narrow' : '');
    scroll.setAttribute('aria-label', caption);
    return add(scroll, add(table, add(role(el('thead'), 'rowgroup'), headRow), body));
  }
  // ---------------------------------------------------------------------------
  // 2026-11-17: progress over time. A goal date gives an aim line; from 6 scores, growth per week; paper scores apart.
  // ---------------------------------------------------------------------------
  var MIN_GROWTH = 6;
  // A number with its sign, to one decimal place: "+1.2", "-0.5", "0".
  function signed(n) { var r = Math.round(n * 10) / 10; if (r === 0) return '0'; return (r > 0 ? '+' : '') + r; }
  // A score in its unit: "80%", "24 digits correct per minute", or the number alone when the unit is not known (a paper-only check).
  function amountText(value, series) {
    if (series.percent) return value + '%';
    return series.unitName ? value + ' ' + unitFor(value, series.unitName) : String(value);
  }
  // Growth per week in the score's own unit: "+1.2 digits correct per minute", "+3.1 percentage points".
  function perWeekText(slope, series) {
    var r = Math.round(slope * 10) / 10;
    if (series.percent) return signed(slope) + ' percentage ' + (Math.abs(r) === 1 ? 'point' : 'points');
    return signed(slope) + (series.unitName ? ' ' + unitFor(Math.abs(r), series.unitName) : '');
  }
  // The scores a line can be worked out from: each with a value and a date, in date order.
  function scoresOf(points) {
    return points.filter(function (p) { return p.value !== null && p.value !== undefined && p.date; })
      .slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  // Growth per week: the slope of the least-squares line through the scores, with time in weeks. Only from 6 scores on,
  // and only when they are on more than one date.
  function growthPerWeek(points) {
    var list = scoresOf(points);
    if (list.length < MIN_GROWTH) return { n: list.length, slope: null };
    var xs = list.map(function (p) { return dayNumber(p.date) / 7; }), ys = list.map(function (p) { return p.value; });
    var n = list.length, mx = 0, my = 0, sxx = 0, sxy = 0, i;
    for (i = 0; i < n; i++) { mx += xs[i] / n; my += ys[i] / n; }
    for (i = 0; i < n; i++) { sxx += (xs[i] - mx) * (xs[i] - mx); sxy += (xs[i] - mx) * (ys[i] - my); }
    return { n: n, slope: sxx > 0 ? sxy / sxx : null };
  }
  // The aim line: from the first score to the goal on the goal date. bad: 'no_start' (no score yet) or 'before' (the date is not after it).
  function aimOf(points, goal, goalDate) {
    if (goal === null || !goalDate) return null;
    var first = scoresOf(points)[0];
    if (!first) return { bad: 'no_start' };
    var weeks = (dayNumber(goalDate) - dayNumber(first.date)) / 7;
    if (!(weeks > 0)) return { bad: 'before', from: first };
    return { from: first, date: goalDate, goal: goal, perWeek: (goal - first.value) / weeks };
  }
  function aimText(aim, series) {
    if (!aim) return '';
    if (aim.bad === 'no_start') return 'There is no score yet to start an aim line from.';
    if (aim.bad === 'before') return 'The goal date is not after the first score (' + showDate(aim.from.date) + '), so no aim line is drawn.';
    return 'Aim line: from ' + amountText(aim.from.value, series) + ' on ' + showDate(aim.from.date) + ' (the first score) to the goal of ' + amountText(aim.goal, series) + ' on '
      + showDate(aim.date) + '. To get there: ' + perWeekText(aim.perWeek, series) + ' a week.';
  }
  // The paper scores typed for this learner (and any names merged into them) and this check, in date order.
  function paperFor(learner, series) {
    return state.paper.filter(function (p) { return canonKey(p.learner) === learner.key && p.measure === series.key; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  // A measure's table: each result from the files, then each paper score (its own row, labeled paper), then the goal and the
  // growth per week when there are any. The same numbers as the chart, in words.
  function measureTable(series, paper, goal, goalDate, aim, growth) {
    var check = series.kind === 'check';
    var rows = series.points.map(function (p) {
      var details = sentence((check ? (formText(p.form) ? 'version ' + p.form + ', ' : '') + (p.attempt ? 'try ' + p.attempt + '. ' : '') : '') + sentence(p.detail)) + '.';
      var more = (check ? [] : newFactsLines(p.newFacts)).concat(extraLines(p.session));
      return [showDate(p.date), valueText(p.value, series.percent), more.length ? [details].concat(more) : details, sentence(notesOf(p.session).join('; '))];
    });
    paper.forEach(function (p) {
      rows.push([showDate(p.date) + ', paper', valueText(p.value, series.percent), 'Paper score, typed on this page. Never averaged with the scores in the files.' + (p.note ? ' Note: ' + p.note : ''), '']);
    });
    if (goal !== null) {
      rows.push(['Goal' + (goalDate ? ', ' + showDate(goalDate) : ''), valueText(goal, series.percent), aim ? [GOAL_NOTE + '.', aimText(aim, series)] : GOAL_NOTE + '.', '']);
    }
    if (growth && growth.slope !== null) {
      rows.push(['Growth per week (6 or more scores)', perWeekText(growth.slope, series), 'A straight line fitted through ' + count(growth.n, series.kind === 'paper' ? 'paper score' : 'score') + '.', 'A rough guide only']);
    }
    return plainTable(series.name + ': each result', ['Date', series.unitName ? sentence(series.unitName) : 'Score', 'Details', 'Notes'], rows, 'measure');
  }
  function drawMeasure(learner, series, n) {
    var card = el('section', 'measure');
    var title = el('h4', '', series.name);
    title.id = 'measure-' + n;
    card.setAttribute('aria-labelledby', title.id);
    var scored = series.points.filter(function (p) { return p.value !== null; });
    var latest = scored[scored.length - 1];
    var paper = paperFor(learner, series);
    var lastPaper = paper[paper.length - 1];
    // A check typed only on paper has no line of its own scores: its paper scores are its points (and still say "paper").
    var scoresHere = series.kind === 'paper' ? paper : series.points;
    add(card, add(el('div', 'measure-head'), title, el('p', 'measure-unit', series.kind === 'paper' ? 'Paper scores' : sentence(series.unitName))),
      el('p', 'measure-latest', latest ? 'Latest: ' + valueText(latest.value, series.percent) + ', ' + showDate(latest.date) + '.' : series.kind === 'paper' ? 'Paper scores only. No results file has this check.' : 'No score yet.'),
      lastPaper ? el('p', 'measure-paper', 'Latest paper score: ' + amountText(lastPaper.value, series) + ', ' + showDate(lastPaper.date) + '. Paper scores are kept apart from the scores in the files.') : null);
    var mid = series.formKey ? model.middles.filter(function (row) { return row.key === series.formKey; })[0] : null;
    if (mid) add(card, el('p', 'measure-middle', 'Middle of this group on ' + (formText(mid.form) ? 'version ' + mid.form : 'this set') + ' (n = ' + mid.n + '): ' + mid.median + '. ' + (mid.q1 !== null ? 'Middle half: ' + mid.q1 + ' to ' + mid.q3 + '.' : 'Lowest ' + mid.min + ', highest ' + mid.max + '.')));
    var goalKey = learner.key + '\n' + series.key;
    var holder = el('div', 'measure-chart');
    var goalLine = el('p', 'goal-line');
    var aimLine = el('p', 'aim-line');
    var growthLine = el('p', 'growth-line');
    var caution = el('p', 'hint growth-caution');
    var tableBox = null;
    var goalNow = function () { var v = mergedMapValue(state.goals, learner.key, series.key); return v === undefined ? null : v; };
    var dateNow = function () { var d = mergedMapValue(state.goalDates, learner.key, series.key); return d === undefined ? '' : d; };
    var redraw = function () {
      var goal = goalNow(), goalDate = dateNow();
      var aim = aimOf(scoresHere, goal, goalDate);
      var growth = growthPerWeek(scoresHere);
      var width = holder.clientWidth;
      holder.textContent = '';
      add(holder, drawChart(series, goal, width, { aim: aim, paper: paper }) || el('p', 'hint', 'A chart is drawn when there are results from two dates.'));
      goalLine.textContent = goal === null ? '' : GOAL_NOTE + ': ' + amountText(goal, series) + (goalDate ? ', by ' + showDate(goalDate) : '') + '.';
      goalLine.hidden = goal === null;
      aimLine.textContent = aimText(aim, series);
      aimLine.hidden = !aim;
      if (growth.slope !== null) {
        growthLine.textContent = 'Growth per week (6 or more scores): ' + perWeekText(growth.slope, series) + '.';
        caution.textContent = 'A rough guide only: it is a straight line through these ' + count(growth.n, 'score') + ', and a few unusual days can change it a lot.';
      } else {
        growthLine.textContent = growth.n >= 2 ? 'Growth per week is shown from 6 scores on (' + growth.n + ' so far).' : '';
        caution.textContent = '';
      }
      growthLine.hidden = !growthLine.textContent;
      caution.hidden = !caution.textContent;
      var next = measureTable(series, paper, goal, goalDate, aim, growth);
      if (tableBox && tableBox.parentNode) tableBox.parentNode.replaceChild(next, tableBox);
      tableBox = next;
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
    input.value = goalNow() !== null ? String(goalNow()) : '';
    label.htmlFor = input.id;
    var hint = el('span', 'hint', 'Type a number. It is drawn as a line on the chart.');
    hint.id = 'goal-' + n + '-hint';
    input.addEventListener('input', function () {
      var typed = input.value.trim().replace(/%$/, '').replace(',', '.');
      var value = typed === '' || !/^\d+(\.\d+)?$/.test(typed) ? null : Number(typed);
      var bad = typed !== '' && (value === null || value > most);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      if (bad) return;
      if (value === null) clearMergedMap(state.goals, learner.key, series.key); else state.goals[goalKey] = value;
      markEdited();
      persist();
      redraw();
      if (value !== null) offerSave();
    });
    // The goal date (2026-11-17): with a goal, it draws the aim line. A date field; typed as year-month-day where there is no picker.
    var dateField = el('div', 'goal goal-when no-print');
    var dateLabel = add(el('label'), doc.createTextNode('Goal date'), el('span', 'sr-only', ' for ' + series.name), doc.createTextNode(' (optional)'));
    var dateInput = el('input', 'goal-input goal-date');
    dateInput.type = 'date';
    dateInput.id = 'goal-date-' + n;
    dateInput.setAttribute('data-goal-date', series.key);
    dateInput.setAttribute('aria-describedby', 'goal-date-' + n + '-hint');
    dateInput.value = dateNow();
    dateLabel.htmlFor = dateInput.id;
    var dateHint = el('span', 'hint', 'With a goal and a goal date, an aim line is drawn from the first score to the goal.');
    dateHint.id = 'goal-date-' + n + '-hint';
    var onDate = function () {
      var typed = String(dateInput.value || '').trim();
      var day = reader.dayText(typed);
      var bad = typed !== '' && !day;
      if (bad) dateInput.setAttribute('aria-invalid', 'true'); else dateInput.removeAttribute('aria-invalid');
      if (bad || (day || '') === dateNow()) return;
      if (!day) clearMergedMap(state.goalDates, learner.key, series.key); else state.goalDates[goalKey] = day;
      markEdited();
      persist();
      redraw();
      if (day) offerSave();
    };
    dateInput.addEventListener('input', onDate);
    dateInput.addEventListener('change', onDate);
    var goalFold = el('details', 'goal-fold no-print');
    goalFold.open = goalNow() !== null || !!dateNow();
    add(goalFold, el('summary', '', 'Goal & aim line'), add(field, label, input, hint), add(dateField, dateLabel, dateInput, dateHint));
    tableBox = measureTable(series, paper, goalNow(), dateNow(), aimOf(scoresHere, goalNow(), dateNow()), growthPerWeek(scoresHere));
    // The chart and its goal on one side, the same numbers as a table on the other (under it on a narrow screen).
    return add(card, add(el('div', 'measure-body'), add(el('div', 'measure-side'), holder, goalFold,
      goalLine, aimLine, growthLine, caution), tableBox));
  }
  // "Add a paper score" (2026-11-17): the check maker prints a paper version; its scores are typed here. Each is kept apart
  // from the scores in the files (its own row, its own mark on the chart) and saved the way goals are.
  function cleanTyped(value, max) { return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
  function drawPaperForm(learner, seriesList) {
    var box = el('section', 'paper-add no-print');
    var title = el('h4', 'learner-sub', 'Add a paper score');
    title.id = 'paper-title';
    box.setAttribute('aria-labelledby', title.id);
    var mine = state.paper.filter(function (p) { return canonKey(p.learner) === learner.key; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var fold = el('details', 'paper-fold');
    fold.open = mine.length > 0;
    var foldBody = el('div', 'paper-fold-body');
    add(fold, add(el('summary'), title), foldBody);
    add(box, fold);
    add(foldBody, el('p', 'hint', 'For a check given on paper, such as the printed version the check maker makes. A paper score is kept apart from the scores in the files: it has its own row in the table and its own mark on the chart, labeled "paper", and it is never averaged with them.'));
    var checksHere = seriesList.filter(function (s) { return s.kind === 'check' || s.kind === 'paper'; });
    var field = function (labelText, input, id) {
      input.id = id;
      var lab = el('label', '', labelText);
      lab.htmlFor = id;
      return add(el('div', 'field paper-field'), lab, input);
    };
    var date = el('input', 'paper-input');
    date.type = 'date';
    date.value = today();
    var pick = el('select', 'paper-input');
    checksHere.forEach(function (s) { var option = el('option', '', s.name); option.value = s.key; pick.appendChild(option); });
    var other = el('option', '', 'Another check (type its name)');
    other.value = '';
    pick.appendChild(other);
    var name = el('input', 'paper-input');
    name.type = 'text';
    name.setAttribute('autocomplete', 'off');
    name.maxLength = 80;
    var score = el('input', 'paper-input paper-score');
    score.type = 'text';
    score.setAttribute('inputmode', 'decimal');
    score.setAttribute('autocomplete', 'off');
    var note = el('input', 'paper-input');
    note.type = 'text';
    note.setAttribute('autocomplete', 'off');
    note.maxLength = 200;
    var pickField = checksHere.length ? field('Check', pick, 'paper-check') : null;
    var nameField = field('Name of the check', name, 'paper-name');
    nameField.hidden = checksHere.length > 0;
    pick.addEventListener('change', function () { nameField.hidden = pick.value !== ''; });
    var go = button('btn btn-primary paper-go', 'Add the paper score');
    go.id = 'paper-go';
    var said = el('p', 'paper-said');
    said.id = 'paper-said';
    said.setAttribute('role', 'status');
    var fields = [date, name, score, note];
    fields.forEach(function (input) { input.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); go.click(); } }); });
    go.addEventListener('click', function () {
      fields.forEach(function (input) { input.removeAttribute('aria-invalid'); });
      var day = reader.dayText(String(date.value || '').trim());
      var key = checksHere.length ? pick.value : '';
      var typedName = cleanTyped(name.value, 80);
      var raw = String(score.value || '').trim().replace(',', '.');
      var value = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
      var problem = !day ? [date, 'Type the date of the paper check, as year-month-day (for example ' + today() + ').']
        : !key && !typedName ? [name, 'Type the name of the check.']
        : value === null || value > 100000 ? [score, 'Type the score as a number, such as 12.'] : null;
      if (problem) {
        problem[0].setAttribute('aria-invalid', 'true');
        said.textContent = problem[1];
        problem[0].focus();
        return;
      }
      var target = key ? checksHere.filter(function (s) { return s.key === key; })[0] : null;
      // A typed name that is one of this student's checks goes with that check.
      if (!target) target = checksHere.filter(function (s) { return s.name.toLowerCase() === typedName.toLowerCase(); })[0] || null;
      var entry = addPaper({ learner: learner.key, measure: target ? target.key : 'paper\t' + typedName.toLowerCase(), name: target ? target.name : typedName, date: day, value: value, note: cleanTyped(note.value, 200) });
      markEdited();
      persist();
      offerSave();
      drawLearner();
      var done = 'Added a paper score of ' + entry.value + ' on ' + showDate(entry.date) + ' for ' + entry.name + '.';
      setText('paper-said', done);
      say(done);
      var again = $('paper-go');
      if (again) again.focus();
    });
    add(foldBody, add(el('div', 'paper-form'), field('Date', date, 'paper-date'), pickField, nameField, field('Score', score, 'paper-score'), field('Note (optional)', note, 'paper-note')),
      add(el('p', 'actions'), go), said);
    if (mine.length) {
      var list = el('ul', 'paper-list');
      mine.forEach(function (p) {
        var line = showDate(p.date) + ': ' + p.value + ', ' + p.name + (p.note ? ' (' + p.note + ')' : '') + '.';
        var remove = button('btn btn-small', 'Remove');
        remove.setAttribute('aria-label', 'Remove the paper score ' + line);
        remove.addEventListener('click', function () {
          state.paper = state.paper.filter(function (q) { return q.id !== p.id; });
          markEdited();
          persist();
          drawLearner();
          setText('paper-said', 'Removed the paper score ' + line);
          say('Removed the paper score ' + line);
          var again = $('paper-go');
          if (again) again.focus();
        });
        list.appendChild(add(el('li'), el('span', '', line), remove));
      });
      add(foldBody, el('p', 'paper-list-title', 'Paper scores typed for this student'), list);
    }
    return box;
  }
  function drawLearner() {
    var body = $('learner-body');
    body.textContent = '';
    hideSummaryBox();
    var learner = learnerNamed(state.learner);
    if (!learner) return;
    var first = learner.sessions.filter(function (s) { return s.date; })[0];
    add(body, add(el('p', 'learner-line'), el('strong', '', learner.label), doc.createTextNode('. ' + count(learner.count, 'result') + (first ? ', ' + dateRange(first.date, learner.lastDate) : '') + '.')));
    if (learner.labels.length > 1) add(body, el('p', 'hint', 'Written in the files as: ' + learner.labels.join(', ') + '.'));
    var measures = el('div', 'measures');
    redraws = [];
    var seriesList = reader.learnerSeries(learner, model);
    // 2026-11-17: a check that has only paper scores (typed under a name no results file has) gets a card of its own.
    var have = Object.create(null);
    seriesList.forEach(function (series) { have[series.key] = true; });
    state.paper.forEach(function (p) {
      if (canonKey(p.learner) !== learner.key || have[p.measure]) return;
      have[p.measure] = true;
      seriesList.push({ key: p.measure, kind: 'paper', name: p.name, unitName: '', percent: false, points: [], dates: 0, formKey: '' });
    });
    seriesList.forEach(function (series, i) { measures.appendChild(drawMeasure(learner, series, i + 1)); });
    add(body, measures);
    // The cards are on the page now, so each chart can be drawn at the width it has.
    redraws.forEach(function (redraw) { redraw(); });
    add(body, drawPaperForm(learner, seriesList));
    var wrong = reader.wrongAnswers(learner.sessions, 8);
    if (wrong.length) {
      add(body, el('h4', 'learner-sub', 'Most frequent wrong answers in practice'),
        plainTable('Most frequent wrong answers in practice', ['Word', 'Answered', 'Times'], wrong.map(function (row) { return [row.word, row.answer, String(row.times)]; }), 'narrow'));
    }
    var srSeen = Object.create(null), srMissed = [], srModes = [];
    var vocabSeen = Object.create(null), vocabMissed = [];
    var wsSeen = Object.create(null), wsMissed = [];
    var mathSeen = Object.create(null), mathMissed = [];
    var mathKnownSeen = Object.create(null), mathKnownCandidates = [];
    var qdMissedCount = 0, mnMissedCount = 0;
    var mathBlocked = Object.create(null);
    learner.sessions.forEach(function (s) {
      var sMode = srModeOf(s);
      var srSpecial = isSrSpecialMode(sMode);
      (s.items || []).forEach(function (it) {
        if (it.practice || !it.attempted) return;
        var act = String(it.activity || '');
        if (/^math_(?:computation|ccc|rehearsal)$/i.test(act)) {
          var mf = parseMathFactText(it.word);
          if (!mf) return;
          if (!(it.firstTry && it.correct)) {
            mathBlocked[mf.key] = true;
            if (mf.op === '+' || mf.op === 'x') mathBlocked[mf.b + mf.op + mf.a] = true;
            if (!mathSeen[mf.key] && mathMissed.length < 12) {
              mathSeen[mf.key] = true;
              mathMissed.push(mf.text);
            }
          } else if (!mathKnownSeen[mf.key] && mathKnownCandidates.length < 24) {
            mathKnownSeen[mf.key] = true;
            mathKnownCandidates.push(mf);
          }
          return;
        }
        if (it.firstTry && it.correct) return;
        if (act === 'symbol_runner') {
          var sym = String(it.target || it.word || '').trim();
          if (!sym) return;
          if (srSpecial) {
            if (srModes.indexOf(sMode) < 0 && srModes.length < 2) srModes.push(sMode);
            return;
          }
          if (!SR_CUSTOM_TOKEN.test(sym)) return;
          var key = sym.toLowerCase();
          if (srSeen[key] || srMissed.length >= 6) return;
          srSeen[key] = true;
          srMissed.push(sym);
        } else if (/^vocab_/i.test(act)) {
          var vw = String(it.word || it.target || '').trim();
          var vKey = vw.toLowerCase();
          if (!vw || vocabSeen[vKey] || vocabMissed.length >= 12) return;
          vocabSeen[vKey] = true;
          vocabMissed.push(vw);
        } else if (act === 'quantity_discrimination') {
          qdMissedCount += 1;
        } else if (act === 'missing_number') {
          mnMissedCount += 1;
        } else if (reader && reader.ACTIVITIES && own(reader.ACTIVITIES, act)) {
          var ww = String(it.word || it.target || '').trim();
          var wKey = ww.toLowerCase();
          if (!ww || !/^[a-z]{2,16}$/i.test(ww) || wsSeen[wKey] || wsMissed.length >= 12) return;
          wsSeen[wKey] = true;
          wsMissed.push(ww);
        }
      });
    });
    var mathKnown = [];
    mathKnownCandidates.forEach(function (cand) {
      if (mathKnown.length >= 8 || mathBlocked[cand.key]) return;
      mathKnown.push(cand.text);
    });
    var checkMissed = typeof reader.checkMissedItems === 'function' ? reader.checkMissedItems(learner.sessions, 20) : [];
    if (checkMissed.length) {
      var cmFold = el('details', 'check-missed-fold');
      add(cmFold, el('summary', '', 'Missed items on checks (' + checkMissed.length + ')'),
        plainTable('Missed items on checks for ' + learner.label, ['Item', 'Check', 'Answered', 'Times'],
          checkMissed.map(function (row) {
            return [row.item, row.check, row.answers.length ? row.answers.join(', ') : '\u2014', String(row.times)];
          }), 'narrow'));
      add(body, cmFold);
    }
    var learnerLinks = [];
    if (srMissed.length || srModes.length) {
      if (srMissed.length) learnerLinks.push(navButton('Practice missed symbols in Symbol Runner', 'packets-symbol-runner.html#rehearse=' + encodeURIComponent(srMissed.join(','))));
      srModes.forEach(function (modeId) {
        learnerLinks.push(navButton('Practice ' + srModeLabel(modeId) + ' in Symbol Runner', 'packets-symbol-runner.html#mode=' + encodeURIComponent(modeId)));
      });
    }
    if (vocabMissed.length) {
      learnerLinks.push(navButton('Practice missed words in Vocabulary', 'packets-vocab.html#rehearse=' + encodeURIComponent(vocabMissed.join(','))));
    }
    if (wsMissed.length) {
      learnerLinks.push(navButton('Practice missed words in Word Sounds', 'packets-make.html#rehearse=' + encodeURIComponent(wsMissed.join(','))));
    }
    var learnerWordCards = mergeWordLists(vocabMissed, wsMissed, 24);
    if (learnerWordCards.length) {
      learnerLinks.push(navButton('Open missed words in Present & print word cards', 'packets-present-export.html#words=' + encodeURIComponent(learnerWordCards.join(','))));
    }
    if (mathMissed.length) {
      var mathTarget = 'packets-math-practice.html#rehearse=' + encodeURIComponent(mathMissed.join(',')) + (mathKnown.length >= 3 ? '&known=' + encodeURIComponent(mathKnown.join(',')) : '');
      learnerLinks.push(navButton('Practice missed facts in Math fact practice', mathTarget));
      var lMental = mentalMathFlags(mathMissed);
      if (lMental.make10) learnerLinks.push(navButton('Practice make-10 partners in Symbol Runner', 'packets-symbol-runner.html#mode=math_make_10'));
      if (lMental.doubles) learnerLinks.push(navButton('Practice doubles facts in Symbol Runner', 'packets-symbol-runner.html#mode=math_doubles'));
      if (lMental.mult2510) learnerLinks.push(navButton('Practice 2s, 5s, and 10s in Symbol Runner', 'packets-symbol-runner.html#mode=math_mult_2_5_10'));
      if (lMental.squares) learnerLinks.push(navButton('Practice multiplication squares in Symbol Runner', 'packets-symbol-runner.html#mode=math_squares'));
    }
    if (qdMissedCount || mnMissedCount) {
      if (qdMissedCount) learnerLinks.push(navButton('Practice number comparison in Symbol Runner', 'packets-symbol-runner.html#mode=number_size_stroop'));
      if (mnMissedCount) learnerLinks.push(navButton('Practice teen and decade numbers in Symbol Runner', 'packets-symbol-runner.html#mode=digits_teen_decade'));
    }
    add(body, nextPracticeCard(learnerLinks));
    var showSessionControls = learner.sessions.length >= 6;
    if (!showSessionControls) {
      state.sessionNewest = false;
      state.sessionKind = 'all';
    }
    var everyHeading = el('h4', 'learner-sub', 'Every result, in date order');
    var sessionStatus = showSessionControls ? el('span', 'group-filter-count', '') : null;
    if (sessionStatus) sessionStatus.setAttribute('role', 'status');
    function buildEveryTable() {
      var list = learner.sessions.slice();
      if (showSessionControls && state.sessionKind === 'check') list = list.filter(function (s) { return s.mode === 'probe'; });
      else if (showSessionControls && state.sessionKind === 'practice') list = list.filter(function (s) { return s.mode !== 'probe'; });
      if (showSessionControls && state.sessionNewest) list.reverse();
      if (sessionStatus) {
        sessionStatus.textContent = (state.sessionKind !== 'all' || state.sessionNewest)
          ? 'Showing ' + list.length + ' of ' + learner.sessions.length + ' results.'
          : '';
      }
      var rows = list.length ? list.map(function (s) {
        var probe = s.mode === 'probe';
        var what = probe ? s.measureName + (formText(s.form) ? ', version ' + s.form : '') + (s.attempt ? ', try ' + s.attempt : '') : 'Practice: ' + s.title;
        var result = probe ? (s.value === null ? 'No score' : s.value + ' ' + unitFor(s.value, s.unitName)) : s.summary.firstTryPct === null ? 'Not scored' : s.summary.firstTryPct + '% on the first try';
        var more = (probe ? [] : newFactsLines(s.newFacts)).concat(extraLines(s));
        // Practice that is never scored (Letter Trace alone): how much was done, not "0 of 0".
        var answered = !probe && !s.summary.given ? s.summary.done + ' done (practice, not scored)' : s.summary.attempted + ' of ' + s.summary.given;
        var rem = button('btn btn-text btn-small no-print row-remove', 'Remove');
        rem.setAttribute('aria-label', 'Remove ' + what + ' from ' + showDate(s.date));
        rem.addEventListener('click', function () {
          var idx = state.sessions.indexOf(s);
          if (idx < 0) return;
          lastRemoved = { session: s, index: idx };
          state.sessions.splice(idx, 1);
          delete state.byId[s.sessionId];
          markEdited();
          changed();
          if (!state.sessions.length) {
            lastRemoved = null;
            go('empty', false);
            if ($('choose')) $('choose').focus();
            say('Removed the last result. The page is clear.');
            return;
          }
          drawResults();
          if ($('results-undo-btn')) $('results-undo-btn').focus();
          say('Removed ' + what + ' from ' + showDate(s.date) + '. Press Undo to restore it.');
        });
        return [showDate(s.date), what, more.length ? [result].concat(more) : result, answered, timeCell(s), sentence(notesOf(s).join('; ')), rem];
      }) : [['\u2014', state.sessionKind === 'check' ? 'No check results for this student.' : 'No practice results for this student.', '', '', '', '', '']];
      return plainTable('Every result for ' + learner.label + ', in date order', ['Date', 'What', 'Result', 'Answered', 'Time taken', 'Notes', { text: 'Action', className: 'no-print' }], rows, 'wide');
    }
    var everyBox = buildEveryTable();
    add(body, everyHeading);
    if (showSessionControls) {
      var controls = el('div', 'session-controls no-print');
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Filter and sort every result');
      var newestBtn = button('btn btn-small' + (state.sessionNewest ? ' is-on' : ''), 'Newest first');
      newestBtn.id = 'sessions-newest';
      newestBtn.setAttribute('aria-pressed', state.sessionNewest ? 'true' : 'false');
      var kindBtns = [
        ['all', 'All'],
        ['check', 'Checks'],
        ['practice', 'Practice'],
      ].map(function (pair) {
        var b = button('btn btn-small' + (state.sessionKind === pair[0] ? ' is-on' : ''), pair[1]);
        b.setAttribute('data-session-kind', pair[0]);
        b.setAttribute('aria-pressed', state.sessionKind === pair[0] ? 'true' : 'false');
        return b;
      });
      var refreshEvery = function () {
        newestBtn.classList.toggle('is-on', state.sessionNewest);
        newestBtn.setAttribute('aria-pressed', state.sessionNewest ? 'true' : 'false');
        kindBtns.forEach(function (b) {
          var on = b.getAttribute('data-session-kind') === state.sessionKind;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var nextBox = buildEveryTable();
        if (everyBox && everyBox.parentNode) everyBox.parentNode.replaceChild(nextBox, everyBox);
        everyBox = nextBox;
        measureCues();
      };
      newestBtn.addEventListener('click', function () {
        state.sessionNewest = !state.sessionNewest;
        refreshEvery();
        say(state.sessionNewest ? 'Sorted newest first.' : 'Sorted oldest first.');
      });
      kindBtns.forEach(function (b) {
        b.addEventListener('click', function () {
          state.sessionKind = b.getAttribute('data-session-kind');
          refreshEvery();
          say('Showing ' + b.textContent.toLowerCase() + ' results.');
        });
      });
      var kindGroup = el('span', 'session-controls-group');
      kindBtns.forEach(function (b) { kindGroup.appendChild(b); });
      add(controls, newestBtn, kindGroup, sessionStatus);
      add(body, controls);
    }
    add(body, everyBox);
    measureCues();
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
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) { /* already gone */ } }, 15000);
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
    if (saveFile(name, JSON.stringify(bundleNow()), 'application/json')) {
      unsavedEdits = false;
      setText('take-said', 'Saved ' + name + '. Drop it on this page later to open where you left off.');
      return name;
    }
    return '';
  }
  function studentSummaryText(learner) {
    var lines = [];
    var first = learner.sessions.filter(function (s) { return s.date; })[0];
    var range = first ? dateRange(first.date, learner.lastDate) : '';
    lines.push('Student: ' + learner.label);
    if (learner.labels.length > 1) {
      lines.push('Also written in files as: ' + learner.labels.filter(function (l) { return l !== learner.label; }).join(', '));
    }
    lines.push('Results: ' + count(learner.count, 'result') + (range ? ', ' + range : '') + '.');
    lines.push('Prepared: ' + showDate(today()) + '.');
    if (state.sample) lines.push('Note: Sample results with made-up code names and scores.');

    var seriesList = reader.learnerSeries(learner, model);
    var have = Object.create(null);
    seriesList.forEach(function (series) { have[series.key] = true; });
    state.paper.forEach(function (p) {
      if (canonKey(p.learner) !== learner.key || have[p.measure]) return;
      have[p.measure] = true;
      seriesList.push({ key: p.measure, kind: 'paper', name: p.name, unitName: '', percent: false, points: [], dates: 0, formKey: '' });
    });

    var checks = seriesList.filter(function (s) { return s.kind === 'check' || s.kind === 'paper'; });
    var strands = seriesList.filter(function (s) { return s.kind !== 'check' && s.kind !== 'paper'; });

    function pushSeriesLines(series) {
      var scored = series.points.filter(function (p) { return p.value !== null; });
      var latest = scored[scored.length - 1];
      var paper = paperFor(learner, series);
      var scoresHere = series.kind === 'paper' ? paper : series.points;
      var goalVal = mergedMapValue(state.goals, learner.key, series.key);
      var goal = goalVal === undefined ? null : goalVal;
      var goalDateVal = mergedMapValue(state.goalDates, learner.key, series.key);
      var goalDate = goalDateVal === undefined ? '' : goalDateVal;
      var aim = aimOf(scoresHere, goal, goalDate);
      var growth = growthPerWeek(scoresHere);
      var head = '- ' + series.name + ': ';
      if (latest) {
        head += 'latest ' + amountText(latest.value, series) + ' on ' + showDate(latest.date);
        if (scored.length > 1) head += ' (' + count(scored.length, 'scored result') + ')';
        head += '.';
      } else if (series.kind === 'paper') {
        head += 'paper scores only (no results file has this check).';
      } else {
        head += 'no score yet.';
      }
      lines.push(head);
      var mid = series.formKey ? model.middles.filter(function (row) { return row.key === series.formKey; })[0] : null;
      if (mid) {
        lines.push('  Middle of this group on ' + (formText(mid.form) ? 'version ' + mid.form : 'this set') + ' (n = ' + mid.n + '): ' + mid.median + '. '
          + (mid.q1 !== null ? 'Middle half: ' + mid.q1 + ' to ' + mid.q3 + '.' : 'Lowest ' + mid.min + ', highest ' + mid.max + '.'));
      }
      if (goal !== null) {
        lines.push('  ' + GOAL_NOTE + ': ' + amountText(goal, series) + (goalDate ? ', by ' + showDate(goalDate) : '') + '.');
      }
      if (aim && !aim.bad) lines.push('  ' + aimText(aim, series));
      if (growth.slope !== null) {
        lines.push('  Growth per week (6 or more scores): ' + perWeekText(growth.slope, series) + ' (rough guide across ' + count(growth.n, 'score') + ').');
      } else if (growth.n >= 2) {
        lines.push('  Growth per week is shown from 6 scores on (' + growth.n + ' so far).');
      }
      if (paper.length) {
        lines.push('  Paper scores (kept apart from file scores): ' + paper.map(function (p) {
          return showDate(p.date) + ': ' + amountText(p.value, series) + (p.note ? ' (' + p.note + ')' : '');
        }).join('; ') + '.');
      }
    }

    if (checks.length) {
      lines.push('');
      lines.push('Checks:');
      checks.forEach(pushSeriesLines);
    }
    if (strands.length) {
      lines.push('');
      lines.push('Practice strands:');
      strands.forEach(pushSeriesLines);
    }

    var toolSeen = Object.create(null), toolsUsed = [], untimedCount = 0;
    learner.sessions.forEach(function (s) {
      if (s.score && Array.isArray(s.score.tools)) {
        s.score.tools.forEach(function (t) {
          var label = own(TOOL_NAMES, t) ? TOOL_NAMES[t] : String(t);
          if (label && !toolSeen[label]) { toolSeen[label] = true; toolsUsed.push(label); }
        });
      }
      if (Array.isArray(s.flags) && s.flags.indexOf('untimed') >= 0) untimedCount++;
    });
    if (toolsUsed.length || untimedCount) {
      lines.push('');
      if (toolsUsed.length) lines.push('Reading tools used: ' + toolsUsed.join(', ') + '.');
      if (untimedCount) lines.push('Untimed check accommodation recorded on ' + count(untimedCount, 'check') + ' (kept apart from timed scores).');
    }

    var checkMissed = typeof reader.checkMissedItems === 'function' ? reader.checkMissedItems(learner.sessions, 8) : [];
    var wrong = reader.wrongAnswers(learner.sessions, 8);
    if (checkMissed.length || wrong.length) {
      lines.push('');
      if (checkMissed.length) {
        lines.push('Top missed items on checks: ' + checkMissed.map(function (row) {
          return row.item + ' (' + row.check + (row.answers.length ? ', answered ' + row.answers.join('/') : '') + ', ' + count(row.times, 'time') + ')';
        }).join('; ') + '.');
      }
      if (wrong.length) {
        lines.push('Most frequent wrong answers in practice: ' + wrong.map(function (row) {
          return row.word + ' (answered ' + row.answer + ', ' + count(row.times, 'time') + ')';
        }).join('; ') + '.');
      }
    }

    lines.push('');
    lines.push(HONEST);
    return lines.join('\n');
  }
  function copyStudentSummary() {
    var learner = learnerNamed(state.learner);
    if (!learner) return;
    var text = studentSummaryText(learner);
    var box = $('copy-summary-box');
    var manual = function () {
      if (box) {
        box.textContent = '';
        var area = el('textarea', 'copy-summary-box');
        area.readOnly = true;
        area.rows = 10;
        area.setAttribute('aria-label', 'Plain-text summary for ' + learner.label);
        area.value = text;
        box.appendChild(area);
        box.hidden = false;
        area.focus();
        area.select();
      }
      var msg = 'This browser did not let the page copy. Select all of the text below and copy it.';
      setText('take-said', msg);
      say(msg);
    };
    try {
      window.navigator.clipboard.writeText(text).then(function () {
        hideSummaryBox();
        var msg = 'Copied a plain-text summary for ' + learner.label + '.';
        setText('take-said', msg);
        say(msg);
      }, manual);
    } catch (_) { manual(); }
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
    unsavedEdits = false;
    lastRemoved = null;
    endNudge();
    drawUndo();
    hideSummaryBox();
    if ($('group-filter')) $('group-filter').remove();
    $('files').value = '';
    go('empty', false);
    syncLearnerControls();
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
    $('pick-learner').addEventListener('change', function () { state.learner = $('pick-learner').value; drawLearner(); setPrintHead(); syncLearnerControls(); });
    function stepLearner(delta) {
      if (!model || !model.learners.length) return;
      var idx = -1;
      for (var i = 0; i < model.learners.length; i++) if (model.learners[i].key === state.learner) { idx = i; break; }
      var next = idx < 0 ? 0 : Math.max(0, Math.min(model.learners.length - 1, idx + delta));
      if (next === idx) return;
      state.learner = model.learners[next].key;
      $('pick-learner').value = state.learner;
      drawLearner();
      setPrintHead();
      syncLearnerControls();
      say(model.learners[next].label + ', student ' + (next + 1) + ' of ' + model.learners.length + '.');
    }
    if ($('prev-learner')) $('prev-learner').addEventListener('click', function () { stepLearner(-1); });
    if ($('next-learner')) $('next-learner').addEventListener('click', function () { stepLearner(1); });
    syncLearnerControls();
    $('print-group').addEventListener('click', function () { printView('group'); });
    $('print-learner').addEventListener('click', function () { printView('learner'); });
    if ($('copy-summary')) $('copy-summary').addEventListener('click', copyStudentSummary);
    $('save-csv').addEventListener('click', saveSummary);
    $('save-bundle').addEventListener('click', function () { if (saveBundle()) endNudge(); });
    // The same action from the quiet line near the top. The line goes once the file is saved, and the page says so there.
    $('save-nudge-go').addEventListener('click', function () {
      var name = saveBundle();
      if (!name) return;
      endNudge();
      say('Saved ' + name + '. Drop it on this page later to open where you left off.');
      $('results-title').focus();
    });
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
    var openedMissed = [];
    function preparePrint() {
      setPrintHead();
      openedMissed = [];
      Array.prototype.forEach.call(doc.querySelectorAll('details.missed-fold, details.check-missed-fold'), function (box) {
        if (!box.open) { box.open = true; openedMissed.push(box); }
      });
    }
    function finishPrint() {
      openedMissed.forEach(function (box) { box.open = false; });
      openedMissed = [];
    }
    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', finishPrint);
    window.addEventListener('beforeunload', function (event) {
      if (!unsavedEdits || state.keep || state.sample || !state.sessions.length) return;
      event.preventDefault();
      event.returnValue = '';
    });
    // A chart is drawn at the width of its box: draw the charts again when the window has settled at a new width.
    var settle = 0, lastWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(settle);
      settle = setTimeout(function () {
        if (state.screen === 'results' && state.view === 'learner') redraws.forEach(function (redraw) { redraw(); });
        if (state.screen === 'results') measureCues();
      }, 150);
    });
    if (openStored()) {
      changed();
      go('results', false);
      say('Opened the results kept on this device.');
    }
    var handoff = window.AlloPacketHandoff;
    var resultsHash = (handoff && handoff.RESULTS_HASH) || '#import-results';
    if (handoff && typeof handoff.take === 'function' && window.location.hash === resultsHash) {
      try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
      handoff.take().then(function (handed) {
        if (handed && handed.bytes) {
          takeFiles([{ name: handed.name || 'results.csv', size: handed.bytes.byteLength, lastModified: Date.now(), _bytes: handed.bytes }]);
        } else {
          say('The results file was no longer waiting. Choose or drop it here.');
        }
      }, function () {
        say('This browser could not hand the results file over. Choose or drop it here.');
      });
    }
  }

  // BEGIN SAMPLE FILES
  // Eight made-up results files for "Try with sample results". Each is a real results file as a check or a
  // practice file saves it, one line of the file per line here. The code names and the scores are invented.
  var SAMPLE_FILES = [
    { name: 'Math-Fluency-check-2A__RedFox3__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","8000","","","1","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","8000","","","1","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","9","0","0","1","8000","","","0","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","8000","","","1","1"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","24","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","76","1","1","1","8000","","","2","2"',
      '"alloflow-packet-result/1","sample-redfox3-check-2a","math-computation-g2","r5a3c2e10","A","check","RedFox3","2026-10-06T09:12:05-04:00","2026-10-06T09:13:53-04:00","108","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","33","1","1","1","8000","","","2","2"',
      '"#summary","sample-redfox3-check-2a","items_given=12","attempted=12","correct=11","first_try=11","accuracy_pct=92","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-redfox3-check-2a","measure=math_dcpm","score=12","score_unit=digits_correct_per_minute","digits_correct=19","digits_possible=20","items_correct=11","items_attempted=12","time_limit_s=120","elapsed_s=96","hidden_s=0","completion=complete","prorated=1","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","548dc717fca9bedf71cb6c6972c7d78bedbbe22e1ec95748b12cb15201c98202","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__BlueHeron7__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","12000","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","9","0","0","1","12000","","","0","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","12000","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","12000","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","24","1","1","1","12000","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","","0","0","0","0","","time_up","",""',
      '"alloflow-packet-result/1","sample-blueheron7-check-2a","math-computation-g2","r5a3c2e10","A","check","BlueHeron7","2026-10-06T09:12:40-04:00","2026-10-06T09:14:52-04:00","132","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","","0","0","0","0","","","",""',
      '"#summary","sample-blueheron7-check-2a","items_given=12","attempted=10","correct=9","first_try=9","accuracy_pct=75","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-blueheron7-check-2a","measure=math_dcpm","score=8","score_unit=digits_correct_per_minute","digits_correct=15","digits_possible=16","items_correct=9","items_attempted=10","time_limit_s=120","elapsed_s=120","hidden_s=0","completion=time","prorated=0","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","01248c1c507943d09f01ca554731acabcca45ef9685246c22e11e7f05c0b13b8","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__GreenTurtle2__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","6250","","","1","1"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","24","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","76","1","1","1","6250","","","2","2"',
      '"alloflow-packet-result/1","sample-greenturtle2-check-2a","math-computation-g2","r5a3c2e10","A","check","GreenTurtle2","2026-10-06T09:13:02-04:00","2026-10-06T09:14:29-04:00","87","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","33","1","1","1","6250","","","2","2"',
      '"#summary","sample-greenturtle2-check-2a","items_given=12","attempted=12","correct=12","first_try=12","accuracy_pct=100","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-greenturtle2-check-2a","measure=math_dcpm","score=16","score_unit=digits_correct_per_minute","digits_correct=20","digits_possible=20","items_correct=12","items_attempted=12","time_limit_s=120","elapsed_s=75","hidden_s=0","completion=complete","prorated=1","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","7fd7ec5816d72a8572ec8eb9e1196fcbb659fbfef00d65d9983d4a55935ee8c2","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__GoldFinch5__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","17142","","","2","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","17142","","","1","1"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","14","0","0","1","17142","","","1","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","17142","","","1","1"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","17142","","","2","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","17142","","","1","1"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","12","0","0","1","17142","","","1","2"',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","","0","0","0","0","","time_up","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","","0","0","0","0","","","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","","0","0","0","0","","","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","","0","0","0","0","","","",""',
      '"alloflow-packet-result/1","sample-goldfinch5-check-2a","math-computation-g2","r5a3c2e10","A","check","GoldFinch5","2026-10-06T09:13:30-04:00","2026-10-06T09:15:42-04:00","132","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","","0","0","0","0","","","",""',
      '"#summary","sample-goldfinch5-check-2a","items_given=12","attempted=7","correct=5","first_try=5","accuracy_pct=42","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-goldfinch5-check-2a","measure=math_dcpm","score=5","score_unit=digits_correct_per_minute","digits_correct=9","digits_possible=11","items_correct=5","items_attempted=7","time_limit_s=120","elapsed_s=120","hidden_s=0","completion=time","prorated=0","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","289e4df0bd59cf2b458aebf1c743bdc84dc611a84dd9acf9d62de36deed8e963","detects accidental edits, not deliberate ones"',
    ] },
    { name: 'Math-Fluency-check-2A__GrayOwl4__2026-10-06.csv', lines: [
      '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag","digits_correct","digits_possible"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","1","math_computation-0","math_computation","Math Fluency","1","7 + 8","15","15","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","2","math_computation-1","math_computation","Math Fluency","1","12 \u2212 5","7","7","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","3","math_computation-2","math_computation","Math Fluency","1","9 + 6","15","15","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","4","math_computation-3","math_computation","Math Fluency","1","15 \u2212 7","8","8","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","5","math_computation-4","math_computation","Math Fluency","1","8 + 8","16","16","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","6","math_computation-5","math_computation","Math Fluency","1","14 \u2212 6","8","8","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","7","math_computation-6","math_computation","Math Fluency","1","6 + 7","13","13","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","8","math_computation-7","math_computation","Math Fluency","1","17 \u2212 9","8","8","1","1","1","10909","","","1","1"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","9","math_computation-8","math_computation","Math Fluency","1","23 + 14","37","37","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","10","math_computation-9","math_computation","Math Fluency","1","36 \u2212 12","24","23","0","0","1","10909","","","1","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","11","math_computation-10","math_computation","Math Fluency","1","45 + 31","76","76","1","1","1","10909","","","2","2"',
      '"alloflow-packet-result/1","sample-grayowl4-check-2a","math-computation-g2","r5a3c2e10","A","check","GrayOwl4","2026-10-06T09:14:11-04:00","2026-10-06T09:16:23-04:00","132","12","math_computation-11","math_computation","Math Fluency","1","58 \u2212 25","33","","0","0","0","0","","time_up","",""',
      '"#summary","sample-grayowl4-check-2a","items_given=12","attempted=11","correct=10","first_try=10","accuracy_pct=83","attempt=1","title=Math Fluency check (2A)"',
      '"#score","sample-grayowl4-check-2a","measure=math_dcpm","score=9","score_unit=digits_correct_per_minute","digits_correct=17","digits_possible=18","items_correct=10","items_attempted=11","time_limit_s=120","elapsed_s=120","hidden_s=14","completion=time","prorated=0","scoring_version=3","form_version=2","attempt=1","flags=left_the_page"',
      '"#integrity","sha256","b4d1529e562e5e3ccbbf83a90342438b906ce17d6444120855781945e4af2ae0","detects accidental edits, not deliberate ones"',
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
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","1","math_computation-0","math_computation","Math Fluency","1","9 + 7","16","16","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","2","math_computation-1","math_computation","Math Fluency","1","13 \u2212 6","7","7","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","3","math_computation-2","math_computation","Math Fluency","1","8 + 5","13","13","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","4","math_computation-3","math_computation","Math Fluency","1","16 \u2212 8","8","8","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","5","math_computation-4","math_computation","Math Fluency","1","7 + 7","14","14","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","6","math_computation-5","math_computation","Math Fluency","1","11 \u2212 4","7","7","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","7","math_computation-6","math_computation","Math Fluency","1","5 + 9","14","14","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","8","math_computation-7","math_computation","Math Fluency","1","18 \u2212 9","9","9","1","1","1","9166","","","1","1"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","9","math_computation-8","math_computation","Math Fluency","1","32 + 15","47","47","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","10","math_computation-9","math_computation","Math Fluency","1","47 \u2212 23","24","34","0","0","1","9166","","","1","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","11","math_computation-10","math_computation","Math Fluency","1","21 + 64","85","85","1","1","1","9166","","","2","2"',
      '"alloflow-packet-result/1","sample-blueheron7-check-2b","math-computation-g2","r5a3c2e10","B","check","BlueHeron7","2026-10-20T09:10:15-04:00","2026-10-20T09:12:17-04:00","122","12","math_computation-11","math_computation","Math Fluency","1","69 \u2212 34","35","35","1","1","1","9166","","","2","2"',
      '"#summary","sample-blueheron7-check-2b","items_given=12","attempted=12","correct=11","first_try=11","accuracy_pct=92","attempt=1","title=Math Fluency check (2B)"',
      '"#score","sample-blueheron7-check-2b","measure=math_dcpm","score=10","score_unit=digits_correct_per_minute","digits_correct=19","digits_possible=20","items_correct=11","items_attempted=12","time_limit_s=120","elapsed_s=110","hidden_s=0","completion=complete","prorated=1","scoring_version=3","form_version=2","attempt=1","flags="',
      '"#integrity","sha256","5fcf9b7d96d5b77a0c946fd51d5480b5e05d10bde74a95b3cbe1b51cdbad4c99","detects accidental edits, not deliberate ones"',
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
