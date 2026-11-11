// The "Check a file" page (packets-verify.html).
// A file is read in this tab with the browser's file reader and handed, as bytes, to packets_verify_core.js,
// which reads it as text and gives back a report. This script draws the report.
// Nothing is sent: the page's rule (connect-src 'none') has the browser refuse every connection, and this
// script calls nothing that could make one. Nothing is kept on the device.
// Everything from a file is shown as text (textContent). The file is never run, and no markup is ever
// built from it: every element on the page is made here, one at a time, with a fixed tag name.
(function () {
  'use strict';

  var MAX_FILES = 10;
  var PARTS = [
    { key: 'about', title: 'What this file says about itself' },
    { key: 'reach', title: 'What its code can reach' },
    { key: 'keeps', title: 'What it keeps on the device' },
    { key: 'saves', title: 'What it saves' },
  ];
  var LOOK_TITLE = 'Things a person should look at';
  var NOTHING = 'Nothing was found that a person needs to look at.';
  var NOT_CHECKED = 'This file was not checked.';
  var KINDS = { practice: 'Practice file', check: 'Check', older: 'Older practice file' };

  var core = window.AlloPacketVerify;
  var samples = window.AlloPacketSamples || {};
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
  var productName = function () { var node = $('product-name'); return node ? String(node.textContent || '').trim() : ''; };
  var say = function (text) { setText('said', text); };

  var checked = [];      // { name, when, report }, in the order the files were read
  var busy = false;

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function now() { var d = new Date(); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()); }

  // ---------------------------------------------------------------------------
  // Reading files
  // ---------------------------------------------------------------------------
  function readBytes(file) {
    return new Promise(function (done, fail) {
      var fileReader = new FileReader();
      fileReader.onload = function () { done(new Uint8Array(fileReader.result)); };
      fileReader.onerror = function () { fail(new Error('unreadable')); };
      fileReader.readAsArrayBuffer(file);
    });
  }
  function keep(name, report) { checked.push({ name: String(name || 'file'), when: now(), report: report }); }
  function finish(read, leftOut) {
    busy = false;
    draw();
    var last = checked[checked.length - 1];
    var first = checked[checked.length - read];
    var said = [count(read, 'file') + ' read.'];
    if (read === 1 && last) said.push(last.report.headline || NOT_CHECKED + ' ' + last.report.why);
    if (leftOut) said.push(count(leftOut, 'more file was', 'more files were') + ' not read: ' + MAX_FILES + ' at a time.');
    say(said.join(' '));
    var heading = first ? $('verdict-' + checked.indexOf(first)) : null;
    if (heading) { heading.focus(); if (heading.scrollIntoView) heading.scrollIntoView(); }
  }
  async function takeFiles(list) {
    var all = Array.prototype.slice.call(list || []);
    if (!all.length) return;
    if (busy) { say('Still reading the last file.'); return; }
    busy = true;
    var files = all.slice(0, MAX_FILES);
    say('Reading ' + count(files.length, 'file') + '.');
    for (var i = 0; i < files.length; i++) {
      var file = files[i], report;
      if (Number(file.size) > core.MAX_BYTES) report = core.refusal('too_big', file.size);
      else {
        try { report = core.verifyPacket(await readBytes(file)); }
        catch (_) { report = core.refusal('unreadable', file.size); }
      }
      keep(file.name, report);
    }
    finish(files.length, all.length - files.length);
  }
  function takeSample(key) {
    if (busy) return;
    var sample = typeof samples[key] === 'function' ? samples[key]() : samples[key];
    if (!sample || typeof sample.text !== 'string') { say('The sample file did not load. Load the page again.'); return; }
    busy = true;
    keep(sample.name, core.verifyPacket(sample.text));
    checked[checked.length - 1].sample = true;
    finish(1, 0);
  }
  function clearPage() {
    checked = [];
    $('files').value = '';
    draw();
    say('The page is clear.');
    $('choose').focus();
  }

  // ---------------------------------------------------------------------------
  // Drawing a report
  // ---------------------------------------------------------------------------
  function listOf(items) {
    var list = el('ul', 'plain-list');
    items.forEach(function (item) { add(list, el('li', '', item)); });
    return list;
  }
  // The things to look at: the same words as the plain list of the report, with the name of each thing set strong.
  function lookList(r) {
    if (!r.look.length) return listOf([NOTHING]);
    var list = el('ul', 'plain-list look-list');
    r.look.forEach(function (f) {
      add(list, add(el('li'), el('span', 'look-line', f.line ? 'Line ' + f.line + ': ' : ''), el('strong', '', f.name), el('span', '', ' (' + f.cls + '). '), el('span', '', f.why)));
    });
    if (r.lookMore) add(list, el('li', '', r.lookMore));
    return list;
  }
  function part(title, body, extra) {
    var box = el('details', 'part');
    var summary = el('summary');
    add(summary, el('span', 'part-title', title), extra);
    add(box, summary, add(el('div', 'part-body'), body));
    return box;
  }
  function fact(list, name, value, mono) {
    var row = el('div');
    add(row, el('dt', '', name), mono ? add(el('dd'), el('code', '', value)) : el('dd', '', value));
    add(list, row);
  }
  // A table whose rows fold into labelled blocks on a narrow screen.
  function table(className, heads, rows) {
    var grid = el('table', 'grid ' + className);
    var head = el('tr');
    heads.forEach(function (text) { var cell = el('th', '', text); cell.scope = 'col'; add(head, cell); });
    add(grid, add(el('thead'), head));
    var body = el('tbody');
    rows.forEach(function (cells) {
      var row = el('tr');
      cells.forEach(function (cell, i) {
        var node = el('td', cell && cell.className ? cell.className : '');
        node.setAttribute('data-label', heads[i]);
        if (cell && cell.code) add(node, el('code', '', cell.code)); else node.textContent = cell && cell.text != null ? cell.text : String(cell == null ? '' : cell);
        add(row, node);
      });
      add(body, row);
    });
    add(grid, body);
    return grid;
  }
  function verdictClass(text) { return text === core.VERDICTS[0] ? 'is-agree' : text === core.VERDICTS[1] ? 'is-differs' : 'is-cannot'; }
  function findingClass(text) { return text === core.CLASSES[0] ? 'is-expected' : text === core.CLASSES[1] ? 'is-unexpected' : 'is-look'; }

  function drawForIt(item, index) {
    var r = item.report, body = el('div');
    add(body, el('h4', '', 'The policy line'));
    add(body, el('p', 'hint', 'The Content-Security-Policy line near the top of the file, word for word. The browser refuses anything it does not allow.'));
    add(body, el('code', 'rule-text', r.policy.found ? r.policy.text : 'This file has no policy line.'));
    add(body, table('grid-policy', ['Question', 'Answer', 'The part of the policy that says so'], r.policy.facts.map(function (row) {
      return [row.question, { text: row.answer, className: row.open ? 'is-open' : '' }, row.basis ? { code: row.basis } : ''];
    })));

    add(body, el('h4', '', 'The script and its hashes'));
    var hashes = el('dl', 'hashes');
    fact(hashes, 'Worked out from the file', r.script.sha256 || 'There is no script.', true);
    fact(hashes, 'In the policy', r.script.inPolicy || 'None.', true);
    fact(hashes, 'In the manifest', r.script.inManifest || 'None.', true);
    fact(hashes, 'Do the three agree?', r.script.verdict + '. ' + r.script.note);
    if (r.script.codeSha256) fact(hashes, 'The code without its data block', r.script.codeSha256, true);
    fact(hashes, 'The whole file', r.fingerprint.sha256, true);
    add(body, hashes);
    add(body, el('p', 'hint', 'Each value is a SHA-256. The script is hashed as a browser reads it, with every line end as one line feed (this file: ' + r.script.lineEnds + '). '
      + 'The whole-file value is of ' + r.fingerprint.of + ' (' + r.bytes + ' bytes): compare it with the value your own tools give.'
      + (r.script.codeSha256 ? ' The code without its data block is the script with its words, sounds and settings taken out: two files that show the same value here run the same code.' : '')));
    add(body, el('p', 'hint', r.hashLimit));
    if (r.mailbox.address) {
      add(body, el('h4', '', 'The class mailbox address in the file'));
      add(body, el('code', 'rule-text', r.mailbox.address));
    }

    add(body, el('h4', '', 'What the file says, beside what its code shows'));
    if (r.claims.length) {
      add(body, table('grid-claims', ['About', 'The file says', 'Its code shows', 'Result'], r.claims.map(function (row) {
        return [row.label, row.says, row.shows, { text: row.verdict, className: 'outcome ' + verdictClass(row.verdict) }];
      })));
    } else add(body, el('p', '', 'This file has no manifest block, so it says nothing to compare.'));

    add(body, el('h4', '', 'Everything the scan found'));
    var c = r.counts;
    add(body, el('p', '', count(c.places, 'place') + ': ' + c.notExpected + ' not expected, ' + c.look + ' for a person to look at, ' + c.expected + ' expected in this kind of file.'
      + (c.places > r.findings.length ? ' The first ' + r.findings.length + ' are listed.' : '')));
    if (r.findings.length) {
      add(body, table('grid-found', ['Line', 'Found', 'Kind', 'Why', 'In the file'], r.findings.map(function (f) {
        return [f.line ? f.line + ' (character ' + f.col + ')' : 'The whole file', f.name + (f.where && f.where !== 'the file' ? ', in ' + f.where : ''),
          { text: f.cls, className: 'outcome ' + findingClass(f.cls) }, f.why, f.excerpt ? { code: f.excerpt } : ''];
      })));
    }
    add(body, el('p', 'hint', r.limits));

    var status = el('p', 'copy-said');
    status.setAttribute('role', 'status');
    var box = el('div', 'copy-box');
    box.hidden = true;
    var copy = button('btn', 'Copy this report');
    copy.setAttribute('data-copy', String(index));
    copy.addEventListener('click', function () { copyReport(item, status, box); });
    var print = button('btn', 'Print');
    print.setAttribute('data-print', String(index));
    print.addEventListener('click', printPage);
    add(body, add(el('div', 'actions no-print'), copy, print), status, box);
    var box2 = part('For IT staff', body);
    box2.className += ' part-it';
    return box2;
  }

  function drawReport(item, index) {
    var r = item.report;
    var card = el('article', 'report');
    card.setAttribute('data-result', r.result);
    var top = el('div', 'verdict');
    var line = el('h3', 'verdict-line', r.headline || NOT_CHECKED);
    line.id = 'verdict-' + index;
    line.tabIndex = -1;
    add(top, el('p', 'kicker', (item.sample ? 'Sample file: ' : 'File: ') + item.name), line, el('p', 'verdict-sub', r.headline ? r.kindLine : r.why));
    var facts = el('dl', 'facts-row');
    if (r.headline) fact(facts, 'Kind', r.kind === 'older' ? KINDS.older : KINDS[r.identity.mode]);
    fact(facts, 'Size', r.sizeText);
    if (r.headline) { fact(facts, 'Recorded sounds', String(r.counts.sounds)); fact(facts, 'Pictures', String(r.counts.pictures)); }
    add(top, facts);
    if (r.fingerprint.sha256) add(top, add(el('p', 'fingerprint'), el('span', '', 'File fingerprint (SHA-256): '), el('code', '', r.fingerprint.sha256)));
    add(card, top);
    card.setAttribute('aria-labelledby', line.id);
    if (!r.headline) return card;

    PARTS.forEach(function (p) { add(card, part(p.title, listOf(r.plain[p.key]))); });
    var n = r.counts.notExpected + r.counts.look;
    var look = part(LOOK_TITLE, lookList(r), el('span', 'part-count', String(n)));
    // The one part that opens by itself: when the result says a person needs to look, here is what at.
    if (n) look.open = true;
    add(card, look, drawForIt(item, index));
    return card;
  }

  function draw() {
    var list = $('report-list');
    while (list.firstChild) list.removeChild(list.firstChild);
    checked.forEach(function (item, index) { add(list, drawReport(item, index)); });
    show('reports', checked.length > 0);
    setText('reports-line', checked.length ? count(checked.length, 'file') + ' on this page. Nothing here is kept: closing the tab clears it.' : '');
  }

  // ---------------------------------------------------------------------------
  // Copy and print
  // ---------------------------------------------------------------------------
  function copyReport(item, status, box) {
    var text = core.reportText(item.report, { product: productName(), file: item.name, when: item.when });
    var manual = function () {
      var area = el('textarea', 'copy-text');
      area.readOnly = true;
      area.rows = 10;
      area.setAttribute('aria-label', 'The report as text');
      area.value = text;
      while (box.firstChild) box.removeChild(box.firstChild);
      add(box, area);
      box.hidden = false;
      status.textContent = 'This browser did not let the page copy. Select all of the text below and copy it.';
      area.focus();
      area.select();
    };
    try {
      window.navigator.clipboard.writeText(text).then(function () { box.hidden = true; status.textContent = 'Copied. The report is on the clipboard as plain text.'; }, manual);
    } catch (_) { manual(); }
  }
  // On paper every part is open. What was closed on the screen is closed again when the browser says printing is over
  // (some browsers come back from print() before the page is on paper, so the parts are not closed here).
  var reopened = [];
  function openAll() {
    Array.prototype.forEach.call(doc.querySelectorAll('#report-list details'), function (box) { if (!box.open) { box.open = true; reopened.push(box); } });
  }
  function closeAgain() { reopened.forEach(function (box) { box.open = false; }); reopened = []; }
  function printPage() {
    openAll();
    if (typeof window.print === 'function') window.print();
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function hasFiles(event) {
    var types = event.dataTransfer && event.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, 'Files') >= 0;
  }
  function start() {
    if (!$('drop')) return;
    if (!core) {
      setText('drop-title', 'The page could not load all of its parts');
      setText('drop-sub', 'Check the connection, then load the page again.');
      $('choose').hidden = true;
      show('samples', false);
      return;
    }
    $('choose').addEventListener('click', function () { $('files').click(); });
    $('files').addEventListener('change', function () {
      var chosen = Array.prototype.slice.call($('files').files || []);
      $('files').value = '';
      takeFiles(chosen);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-sample]'), function (node) {
      node.addEventListener('click', function () { takeSample(node.getAttribute('data-sample')); });
    });
    $('clear').addEventListener('click', clearPage);
    // A file dropped anywhere on the page is read here; without this the browser would leave the page to open it.
    var depth = 0;
    var over = function (on) { show('drop-over', on && checked.length > 0); $('drop').classList.toggle('is-over', on); };
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
    window.addEventListener('beforeprint', openAll);
    window.addEventListener('afterprint', closeAgain);
  }

  start();
})();
