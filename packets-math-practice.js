// The math fact practice maker (packets-math-practice.html): three steps, then one practice file.
// Everything happens in this tab. The page asks for nothing but the scripts it names: it fetches nothing,
// and its rule (connect-src 'none') makes the browser refuse if it tried. A practice file of math facts has
// no sound and no pictures, so there is nothing else to get. The page runs without AI, and there is no
// account and no cookie. What it keeps on the device is listed under "About this page".
// The sets of facts, the teaching order, the known facts a set starts with and the plan of a rehearsal file
// all come from packet_math_practice_builder.js; this page only shows them and passes the choices on.
// 2026-11-13: subtraction and division sets, a title, a student's code name in the file, one file for each student in
// a .zip (packets_zip.js) and "Open a file I made" (packets_reopen.js readMath), as on the other makers.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-math-practice/1';
  var TRY_PAGE = 'packets-try.html';
  var OWN = 'own';
  // 2026-11-13: subtraction and division sets beside addition and multiplication (packet_math_practice_builder.js).
  var OPS = ['add', 'sub', 'mul', 'div'];
  var KINDS = OPS.concat([OWN]);
  var MAX_STUDENTS = 40;   // "Make one for each student": files in one .zip, as on the other makers
  var METHOD_IDS = ['ccc', 'rehearsal'];
  var MAX_TYPED = 2000;
  var MINUS = String.fromCharCode(0x2212), DIVIDE = String.fromCharCode(0xF7);

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
  var state = null;
  var step = 1;
  var ownRows = [], ownStop = '', ownTimer = 0;
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '', batchFile = null;

  // title (2026-11-13): the file's title, empty for the builder's own. learner: a student's code name for the file. It is
  // not kept: the next file is often for someone else.
  function defaults() { return { kind: '', sets: { add: '', sub: '', mul: '', div: '' }, facts: '', method: '', known: {}, title: '', learner: '' }; }
  function setsOf(kind) { return builder.FAMILIES.filter(function (set) { return set.op === kind; }); }
  function setRow(id) {
    for (var i = 0; i < builder.FAMILIES.length; i++) if (builder.FAMILIES[i].id === id) return builder.FAMILIES[i];
    return null;
  }
  function word(fact) { return builder.factWord(fact, loader).word; }

  // ---------------------------------------------------------------------------
  // What this page keeps: the last choices, in this browser only
  // ---------------------------------------------------------------------------
  function remember() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, kind: state.kind, sets: state.sets, facts: state.facts, method: state.method, known: state.known, title: state.title }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
    if (!saved || saved.v !== 1) return fresh;
    if (KINDS.indexOf(saved.kind) >= 0) fresh.kind = saved.kind;
    OPS.forEach(function (kind) {
      var id = saved.sets && typeof saved.sets === 'object' && has(saved.sets, kind) ? saved.sets[kind] : '';
      var row = typeof id === 'string' ? setRow(id) : null;
      if (row && row.op === kind) fresh.sets[kind] = id;
    });
    if (typeof saved.facts === 'string') fresh.facts = saved.facts.slice(0, MAX_TYPED);
    if (typeof saved.title === 'string') fresh.title = saved.title.slice(0, 80);
    if (METHOD_IDS.indexOf(saved.method) >= 0) fresh.method = saved.method;
    if (saved.known && typeof saved.known === 'object' && !Array.isArray(saved.known)) {
      Object.keys(saved.known).forEach(function (source) {
        var keys = saved.known[source];
        if ((source === OWN || setRow(source)) && Array.isArray(keys)) fresh.known[source] = keys.filter(function (k) { return typeof k === 'string' && /^(add|sub|mul|div):\d{1,3}:\d{1,3}$/.test(k); }).slice(0, 60);
      });
    }
    return fresh;
  }

  // ---------------------------------------------------------------------------
  // Step 1: what to practice
  // ---------------------------------------------------------------------------
  function syncRadios(name, value) {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="' + name + '"]'), function (radio) {
      radio.checked = radio.value === value;
      radio.parentNode.classList.toggle('is-on', radio.checked);
    });
  }
  function setNow() {
    if (OPS.indexOf(state.kind) < 0) return null;
    var row = setRow(state.sets[state.kind]);
    return row && row.op === state.kind ? row : null;
  }
  // The facts chosen in step 1, and where they come from: { source, facts, set } or null.
  function chosen() {
    if (state.kind === OWN) {
      var good = ownRows.filter(function (row) { return row.ok; });
      return !ownStop && good.length ? { source: OWN, facts: good.map(function (row) { return row.fact; }), set: null } : null;
    }
    var set = setNow();
    return set ? { source: set.id, facts: set.facts, set: set } : null;
  }
  function drawSets() {
    var host = $('sets');
    host.textContent = '';
    setsOf(state.kind).forEach(function (set) {
      var label = el('label', 'radio'), radio = el('input');
      radio.type = 'radio';
      radio.name = 'set';
      radio.value = set.id;
      radio.checked = state.sets[state.kind] === set.id;
      radio.setAttribute('aria-describedby', 'order-hint');
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        state.sets[state.kind] = set.id;
        remember();
        syncRadios('set', set.id);
        drawSetResult();
      });
      var words = el('span', '');
      words.appendChild(doc.createTextNode(set.name + ' '));
      words.appendChild(el('span', 'radio-sub',set.line + ' ' + capital(count(set.facts.length, 'fact')) + '.'));
      label.appendChild(radio);
      label.appendChild(words);
      label.classList.toggle('is-on', radio.checked);
      host.appendChild(label);
    });
  }
  function drawSetResult() {
    var set = setNow();
    show('set-result', !!set);
    if (!set) return;
    setText('set-line', set.opName + ': ' + set.name + '. ' + capital(count(set.facts.length, 'fact')) + '.');
    setText('set-facts', set.facts.map(word).join(', ') + '.');
    setText('step-1-problem', '');
  }
  // One typed fact, looked at by the builder, with its reason in plain words.
  function typedParts() { return String(state.facts || '').split(/[,;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean); }
  function reason(error) { return capital(said(error).replace(/^Fact [^:]*: /, '').replace(/^".*" is not a fact\./, 'This is not a fact.')); }
  function checkPart(part, seen) {
    var parsed;
    // A number with a decimal point ("2.5 + 1") is a fact, with a number this practice does not take.
    if (/\d\.\d|(?:^|[^\d])\.\d/.test(part)) return { text: part, ok: false, says: 'Whole numbers only.' };
    try { parsed = builder.parseFacts(part); } catch (error) { return { text: part, ok: false, says: reason(error) }; }
    if (parsed.length !== 1) return { text: part, ok: false, says: 'This is not a fact.' };
    var f = parsed[0], key = builder.factKey(f), written;
    try { written = builder.factWord(f, loader); } catch (error) { return { text: part, ok: false, says: reason(error) }; }
    if (seen[key]) return { text: written.word, ok: false, says: 'Already in the list.' };
    seen[key] = true;
    // A fact and its turnaround (3 + 4, 4 + 3) are both kept: the file never puts them side by side. 2026-11-13.
    var t = builder.turnaround(f), turned = t && builder.factKey(t) !== key && seen[builder.factKey(t)];
    return { text: written.word, ok: true, fact: f, says: 'Ready. The answer is ' + written.answer + '.' + (turned ? ' ' + word(t) + ' is in the list too, turned around: the file keeps the two apart.' : '') };
  }
  function drawOwn() {
    clearTimeout(ownTimer);
    var parts = typedParts(), list = $('own-list'), seen = {};
    ownRows = parts.map(function (part) { return checkPart(part, seen); });
    list.textContent = '';
    ownRows.forEach(function (row) {
      var item = el('li', row.ok ? 'is-ok' : 'is-out');
      item.appendChild(el('span', 'w', row.text));
      item.appendChild(el('span', 's', row.says));
      list.appendChild(item);
    });
    var good = ownRows.filter(function (row) { return row.ok; }).length, bad = ownRows.length - good;
    var line = good + ' of ' + count(ownRows.length, 'fact') + ' can be used.';
    ownStop = '';
    if (!parts.length) { line = 'Type or paste your facts above.'; ownStop = 'Type at least one fact to go on.'; }
    else if (bad) ownStop = count(bad, 'fact') + ' cannot be used. Change ' + (bad === 1 ? 'it' : 'them') + ' or take ' + (bad === 1 ? 'it' : 'them') + ' out to go on.';
    else if (good > builder.MAX_FACTS) ownStop = 'A file can hold ' + builder.MAX_FACTS + ' facts at most. Take ' + (good - builder.MAX_FACTS) + ' out to go on.';
    setText('own-line', line);
    if (!ownStop) setText('step-1-problem', '');
  }
  function drawStep1() {
    syncRadios('kind', state.kind);
    var sets = OPS.indexOf(state.kind) >= 0;
    show('panel-sets', sets);
    show('panel-own', state.kind === OWN);
    if (sets) { drawSets(); drawSetResult(); } else show('set-result', false);
    if (state.kind === OWN) {
      if ($('f-facts').value !== state.facts) $('f-facts').value = state.facts;
      drawOwn();
    }
  }
  function stopAtStep1() {
    if (!state.kind) return 'Choose the kind of facts to go on.';
    if (state.kind === OWN) { drawOwn(); return ownStop; }
    return setNow() ? '' : 'Choose a set of facts to go on.';
  }

  // ---------------------------------------------------------------------------
  // Step 2: how to practice, and for rehearsal the facts the learner knows
  // ---------------------------------------------------------------------------
  // The facts marked as known: the teacher's own marks for this set, or the builder's start (the teaching order).
  function knownNow(pick) {
    if (has(state.known, pick.source)) return state.known[pick.source].slice();
    return pick.set ? builder.knownByOrder(pick.set.id) : [];
  }
  function planNow(pick, mode) {
    var input = { mode: mode, known: knownNow(pick) };
    if (pick.set) input.factSet = pick.set.id; else input.facts = pick.facts;
    return builder.planMathPractice(input);
  }
  function drawKnown() {
    var pick = chosen();
    var on = state.method === 'rehearsal' && !!pick;
    show('panel-known', on);
    if (!on) return;
    var marked = {};
    knownNow(pick).forEach(function (key) { marked[key] = true; });
    var none = pick.set && builder.knownByOrder(pick.set.id).length === 0, first = none && pick.set.id === setsOf(pick.set.op)[0].id;
    // 2026-11-13: for subtraction and division the other fact of the same family counts as the turnaround does.
    var other = !pick.set ? '' : pick.set.op === 'sub' ? 'the other take-away of the same fact (7 ' + MINUS + ' 3 for 7 ' + MINUS + ' 4)' : pick.set.op === 'div' ? 'the other division of the same fact (14 ' + DIVIDE + ' 7 for 14 ' + DIVIDE + ' 2)' : 'its turnaround';
    setText('known-hint', !pick.set ? 'Choose the facts the student already knows. The others are new facts to learn.'
      : first ? pick.set.name + ' comes first in the order, so none are chosen yet. Choose the facts the student already knows.'
        : none ? 'No fact of ' + pick.set.name + ' is in a set that comes earlier, so none are chosen yet. Choose the facts the student already knows.'
          : 'Chosen from the teaching order: a fact is chosen when it, or ' + other + ', is in a set that comes earlier. Change the choices to fit the student.');
    var host = $('known');
    host.textContent = '';
    pick.facts.forEach(function (fact) {
      var key = builder.factKey(fact);
      var label = el('label', 'radio'), box = el('input');
      box.type = 'checkbox';
      box.value = key;
      box.checked = !!marked[key];
      box.setAttribute('data-known', key);
      box.addEventListener('change', function () {
        var keys = [];
        Array.prototype.forEach.call(host.querySelectorAll('input[type="checkbox"]'), function (other) { if (other.checked) keys.push(other.value); });
        state.known[pick.source] = keys;
        remember();
        label.classList.toggle('is-on', box.checked);
        drawPlanLine();
      });
      label.appendChild(box);
      label.appendChild(doc.createTextNode(' ' + word(fact)));
      label.classList.toggle('is-on', box.checked);
      host.appendChild(label);
    });
    drawPlanLine();
  }
  // What the rehearsal file will hold, said as the ticks change. '' when it can be made, else the reason.
  var planStop = '';
  function drawPlanLine() {
    var pick = chosen(), plan;
    planStop = '';
    try { plan = planNow(pick, 'rehearsal'); } catch (error) {
      planStop = said(error);
      setText('known-line', planStop);
      setText('known-sub', '');
      return;
    }
    setText('known-line', 'New ' + (plan.newFacts.length === 1 ? 'fact' : 'facts') + ' in this file: ' + listed(plan.newFacts.map(word)) + '.');
    var sub = [capital(count(plan.cards.length, 'card')) + '. ' + plan.cards.filter(function (c) { return c.role === 'known'; }).length + ' are facts the student knows.'];
    // 2026-11-13: a known fact and its turnaround take turns as one; a known fact that is a new fact turned around is not used.
    var pairs = plan.pairs || [], held = plan.held || [];
    if (pairs.length) sub.push(capital(listed(pairs.map(function (p) { return word(p[0]) + ' and ' + word(p[1]); })))
      + (pairs.length === 1 ? ' are the same fact turned around, so they take turns as one known fact and are never side by side.' : ': each pair is one fact turned around, so its two take turns as one known fact and are never side by side.'));
    held.forEach(function (h) { sub.push(word(h.fact) + ' is not used as a known fact here: it is ' + word(h.gives) + ' turned around, a new fact in this file, so it would give it away.'); });
    if (plan.addedKnown.length) {
      var ticked = plan.chosenKnown != null ? plan.chosenKnown : plan.knownFacts.length - plan.addedKnown.length;
      var fewer = pairs.length || held.length ? (ticked === 1 ? ' different fact can be used' : ' different facts can be used') : (ticked === 1 ? ' fact is chosen' : ' facts are chosen');
      sub.push((ticked ? 'Only ' + ticked + fewer : 'No facts are chosen') + ', so ' + listed(plan.addedKnown.map(word)) + ' from ' + listed(plan.addedFrom)
        + (plan.addedFrom.length === 1 ? ', the set before,' : ', the sets before,') + (plan.addedKnown.length === 1 ? ' is used as a known fact too.' : ' are used as known facts too.'));
    }
    if (plan.waiting.length) sub.push(capital(count(plan.waiting.length, 'more new fact waits', 'more new facts wait')) + ' for another file: ' + listed(plan.waiting.map(word)) + '.');
    setText('known-sub', sub.join(' '));
    setText('step-2-problem', '');
  }
  function drawStep2() {
    syncRadios('method', state.method);
    drawKnown();
  }
  function stopAtStep2() {
    if (!state.method) return 'Choose a way to practice to go on.';
    if (state.method === 'rehearsal') { drawPlanLine(); if (planStop) return planStop; }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Step 3: make the file
  // ---------------------------------------------------------------------------
  function codeNameNow() { return builder.codeName(state.learner); }
  // A student's code name comes last in the file's name (math-facts-mul-7-ccc__BlueHeron7.html).
  function withName(name, learner) {
    var code = String(learner || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return code ? name.replace(/\.html$/, '__' + code + '.html') : name;
  }
  // The title the builder gives these choices ("× 7 facts: cover, copy, compare"), shown when the field is empty (2026-11-13).
  function titleFallback() {
    var pick = chosen(), method = builder.METHODS[state.method];
    if (!pick || !method) return '';
    return (pick.set ? pick.set.title : 'My math facts') + ': ' + method.short;
  }
  function drawTitle() {
    var field = $('f-title');
    if (field && field.value !== state.title) field.value = state.title;
    setText('title-hint', 'The student sees it at the top of the file. The results file\'s name starts with it. Left empty, it is "' + titleFallback() + '".');
  }
  function syncCodeName() {
    var field = $('f-code-name');
    if (field && field.value !== state.learner) field.value = state.learner;
    var clean = codeNameNow(), typed = String(state.learner || '').trim();
    setText('code-name-said', typed && clean !== typed ? (clean ? 'The file will have: ' + clean + '. A code name keeps letters, digits, spaces, dots, dashes and underscores.' : 'A code name needs a letter or a number.') : '');
    if (typed) $('code-name-box').open = true;
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
  }
  function making(text) { show('making', true); setText('making-line', text); }
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
    var run = buildRun, pick, plan, lesson, result;
    try {
      pick = chosen();
      if (!pick) throw new Error('no facts are chosen');
      plan = planNow(pick, state.method);
      var input = { loader: loader, mode: state.method, known: knownNow(pick) };
      if (pick.set) input.factSet = pick.set.id; else input.facts = pick.facts;
      lesson = builder.lessonFromMathPractice(input);
      result = builder.buildMathPracticePacket({ lesson: lesson, loader: loader, title: state.title, learner: state.learner });
    } catch (error) {
      if (run === buildRun) problem('The file could not be put together (' + (said(error) || 'no reason was given') + '). Your choices are still here.');
      return;
    }
    if (run === buildRun) drawResult(result, pick, plan, lesson);
  }
  function drawResult(result, pick, plan, lesson) {
    show('making', false);
    var blob = new Blob([result.html], { type: 'text/html' });
    var learner = codeNameNow();
    built = { html: result.html, name: withName(result.lesson.lessonId + '.html', learner), bytes: blob.size, lesson: lesson, plain: result.lesson.lessonId + '.html' };
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    var cards = plan.cards.length, knownCards = plan.cards.filter(function (c) { return c.role === 'known'; }).length;
    var rows = [['Facts', pick.set ? pick.set.opName + ': ' + pick.set.name + '. ' + capital(count(pick.facts.length, 'fact')) + '.' : capital(count(pick.facts.length, 'fact')) + ': ' + pick.facts.map(word).join(', ') + '.']];
    if (plan.mode === 'ccc') {
      var moved = plan.cards.map(function (c) { return builder.factKey(c.fact); }).join(',') !== pick.facts.map(builder.factKey).join(',');
      rows.push(['How', plan.method + '. Every fact once, ' + (pick.set ? 'in a mixed order, so the student cannot just count on.'
        : moved ? 'in the order you typed them, except that a fact is never right beside its turnaround.' : 'in the order you typed them.')]);
      rows.push(['Cards', capital(count(cards, 'card')) + '. Each one starts with the fact and its answer.']);
    } else {
      rows.push(['How', plan.method + '. New ' + (plan.newFacts.length === 1 ? 'fact' : 'facts') + ': ' + listed(plan.newFacts.map(word)) + '. Known facts: ' + listed(plan.knownFacts.map(word)) + '.']);
      rows.push(['Cards', capital(count(cards, 'card')) + '. ' + knownCards + ' are facts the student knows. Each new fact is asked 4 times, and shown with its answer the first time.']);
    }
    rows.push(['Feedback', 'Right or wrong after every answer. After a wrong answer the file shows the answer, the student types it while looking, and then answers again from memory. Up to 3 tries from memory on each card.']);
    rows.push(['Clock', 'None.']);
    rows.push(['Title', result.lesson.title]);
    if (learner) rows.push(['Code name', learner + '. The file opens with it filled in.']);
    rows.push(['File', built.name + ', ' + fileSize(built.bytes) + '.']);
    var host = $('summary-rows');
    host.textContent = '';
    rows.forEach(function (row) {
      host.appendChild(el('dt', '', row[0]));
      host.appendChild(el('dd', '', row[1]));
    });
    setText('summary-facts', capital(count(cards, 'card')) + '. No clock. ' + fileSize(built.bytes) + '.');
    show('summary', true);
    if (fileUrl) { $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl); show('try', true); }
    show('save', true);
    setText('making-said', 'The file is ready: ' + count(cards, 'card') + ', ' + fileSize(built.bytes) + '.');
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
    show('after-save', true);
    $('after-save').focus();
  }

  // ---------------------------------------------------------------------------
  // Step 3: "Make one for each student" (2026-11-13, as on the other makers): the file above with each code name in its
  // manifest (builder.withCodeName), in one .zip file (packets_zip.js). Math fact practice has no versions.
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
  function drawBatch() {
    var list = batchList(), n = list.names.length, parts = [];
    if (!n) parts.push('Type or paste the code names, one on each line.');
    else parts.push(count(n, 'file') + (built ? ', about ' + fileSize(n * built.bytes) + ' in all.' : '. The size shows here once the file above is ready.'));
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
    try {
      var base = builder.buildMathPracticePacket({ lesson: built.lesson, loader: loader, title: state.title }).html;
      var zip = window.AlloPacketZip.create(), encoder = new TextEncoder();
      list.names.forEach(function (name) { zip.add(withName(built.plain, name), encoder.encode(builder.withCodeName(base, name))); });
      var parts = zip.finish();
      batchFile = { parts: parts, bytes: zip.bytes, count: list.names.length, name: built.plain.replace(/\.html$/, '') + '__' + list.names.length + '-students.zip', url: '' };
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
  // "Open a file I made" (2026-11-13): the page fills itself in from a practice file made earlier. packets_reopen.js
  // reads it (readMath, with packets_verify_core.js). The file is read in this tab only. Nothing in it is run.
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
  function applyReopen(result, name) {
    if (!result.ok) { showReopen(result.why, [], result.page); return; }
    var got = result.math, items = [];
    clearTimeout(buildTimer);
    clearBuilt();
    var fresh = defaults();
    fresh.sets = state.sets;
    fresh.known = state.known;
    fresh.kind = got.kind;
    fresh.method = got.method;
    if (got.kind === OWN) {
      fresh.facts = got.facts;
      if (got.method === 'rehearsal') fresh.known[OWN] = got.known.slice();
      items.push(capital(count(got.facts ? got.facts.split('\n').length : 0, 'fact')) + '. They are in step 1, under My own facts.');
    } else {
      var set = setRow(got.set);
      fresh.sets[got.kind] = got.set;
      if (got.method === 'rehearsal') { if (got.known) fresh.known[got.set] = got.known.slice(); else delete fresh.known[got.set]; }
      items.push(set.opName + ': ' + set.name + '.');
    }
    items.push(builder.METHODS[got.method].name + '.' + (got.method === 'rehearsal' ? ' The facts chosen as known are in step 2.' : ''));
    fresh.title = result.title;
    fresh.learner = result.learner || '';
    if (result.title) items.push('Title: ' + result.title + (/[.!?]$/.test(result.title) ? '' : '.'));
    result.notes.forEach(function (note) { items.push(note); });
    state = fresh;
    remember();
    goTo(1, true);
    showReopen('Filled in from ' + name + '. Change what you want, then make the new file in step 3.', items, null);
  }
  function reopenText(text, name) {
    if (!reopenKit) return;
    applyReopen(reopenKit.readMath(text, { verify: window.AlloPacketVerify, builder: builder, codeName: builder.codeName }), String(name || 'the file').slice(0, 120));
  }
  function wireReopen() {
    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { showReopen('This file is too large to be a practice file made here.', [], null); return; }
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
  function goTo(wanted, quiet) {
    var target = wanted, stop = '';
    if (target >= 2) {
      stop = stopAtStep1();
      if (stop) { target = 1; setText('step-1-problem', stop); }
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
    doc.title = (name ? name + ': ' : '') + 'Make math fact practice, step ' + step + ' of 3';
    if (step === 1) drawStep1();
    if (step === 2) { drawStep2(); setText('step-2-problem', stop); }
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
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="kind"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.kind = radio.value; remember(); setText('step-1-problem', ''); drawStep1(); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name="method"]'), function (radio) {
      radio.addEventListener('change', function () { if (!radio.checked) return; state.method = radio.value; remember(); setText('step-2-problem', ''); drawStep2(); });
    });
    $('next-1').addEventListener('click', function () { goTo(2); });
    $('back-2').addEventListener('click', function () { goTo(1); });
    $('next-2').addEventListener('click', function () { goTo(3); });
    $('back-3').addEventListener('click', function () { goTo(2); });
    $('fix-choices').addEventListener('click', function () { goTo(2); });
    $('retry').addEventListener('click', function () { makeSoon(30); });
    $('f-facts').addEventListener('input', function () {
      state.facts = this.value.slice(0, MAX_TYPED);
      remember();
      clearTimeout(ownTimer);
      ownTimer = setTimeout(drawOwn, 250);
    });
    $('f-title').addEventListener('input', function () { state.title = this.value.slice(0, 80); remember(); if (step === 3) makeSoon(400); });
    $('f-code-name').addEventListener('input', function () { state.learner = this.value.slice(0, 40); syncCodeName(); if (step === 3) makeSoon(400); });
    $('f-batch-names').addEventListener('input', function () { dropBatchFile(); setText('batch-problem', ''); drawBatch(); });
    $('batch-make').addEventListener('click', makeBatch);
    $('batch-save').addEventListener('click', saveBatch);
    $('save').addEventListener('click', saveFile);
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      state = defaults();
      $('f-facts').value = '';
      $('f-title').value = '';
      $('f-code-name').value = '';
      goTo(1, true);
      setText('forget-said', 'Done. The page is back to how it started.');
    });
  }

  function start() {
    loader = window.AlloWordSoundsTakeHome;
    builder = window.AlloPacketMathPractice;
    var missing = [];
    var adapters = loader && loader.CHECK_ADAPTERS;
    if (!loader || typeof loader.buildHtml !== 'function' || !adapters || !adapters.math_computation || !adapters.math_ccc || !adapters.math_rehearsal) missing.push('the part that writes the file');
    if (!builder || typeof builder.planMathPractice !== 'function' || typeof builder.lessonFromMathPractice !== 'function' || typeof builder.buildMathPracticePacket !== 'function'
      || !Array.isArray(builder.FAMILIES) || !builder.FAMILIES.length) missing.push('the part that makes math fact practice');
    if (missing.length) {
      show('loading', false);
      setText('load-problem-text', 'Missing: ' + listed(missing) + '. Check the connection, then load the page again. Nothing has been lost.');
      show('load-problem', true);
      return;
    }
    state = recall();
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_csv) setText('csv-label', loader.DEFAULT_LABELS.save_csv);
    // "Open a file I made" and one file for each student are extras: without their scripts the page works as before.
    var kit = window.AlloPacketReopen;
    reopenKit = kit && typeof kit.readMath === 'function' && window.AlloPacketVerify && typeof window.AlloPacketVerify.readParts === 'function' && typeof FileReader === 'function' ? kit : null;
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
