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
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '', batchFile = null, paperOn = false;
  var previewSession = null, inPreviewAction = false;
  function stopPreview() { if (previewSession) { try { previewSession.stop(); } catch (_) {} previewSession = null; } }

  // title (2026-11-13): the file's title, empty for the builder's own. learner: a student's code name for the file. It is
  // not kept: the next file is often for someone else.
  function defaults() { return { kind: '', sets: { add: '', sub: '', mul: '', div: '' }, facts: '', method: '', known: Object.create(null), title: '', learner: '' }; }
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
    try {
      saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null', function (k, v) {
        return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
      });
    } catch (_) { saved = null; }
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
  function typedParts() { return String(state.facts || '').replace(/^\uFEFF/, '').split(/[,;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean); }
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
    var field = $('f-batch-names');
    if (field && state.learner && !field.value.trim()) {
      field.value = state.learner;
      if ($('batch')) $('batch').open = true;
    }
  }
  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    clearPaper();
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
      result = builder.buildMathPracticePacket({ lesson: lesson, loader: loader, title: state.title });
    } catch (error) {
      var msg = 'The file could not be put together (' + (said(error) || 'no reason was given') + '). Your choices are still here.';
      if (run === buildRun) problem(msg);
      return Promise.resolve({ html: null, said: said(error) || msg });
    }
    if (run === buildRun) drawResult(result, pick, plan, lesson);
    return Promise.resolve(built && built.html ? { html: built.html, url: fileUrl } : { html: null, said: 'Could not update the file.' });
  }
  function describePreview(lesson) {
    var out = [], blocks = lesson && Array.isArray(lesson.blocks) ? lesson.blocks : [];
    blocks.forEach(function (block) {
      (Array.isArray(block.items) ? block.items : []).forEach(function (item) {
        out.push({
          itemId: String(item.id || ''),
          activity: String(block.activity || ''),
          word: String(item.word || ''),
          sample: false,
          label: String(item.word || item.id || ''),
          canSwap: false,
          canTogglePicture: false,
          noPicture: false,
        });
      });
    });
    return out;
  }
  function onPreviewAction(req) {
    if (!req || req.action !== 'remove') return { said: 'Nothing changed.' };
    var pick, plan;
    try {
      pick = chosen();
      if (!pick) return { said: 'No facts are chosen.' };
      plan = planNow(pick, state.method);
    } catch (err) {
      return { said: said(err) || 'Could not read the current facts.' };
    }
    var card = plan.cards[req.index];
    if (!card || !card.fact) return { said: 'Could not find that fact.' };
    var dropKey = builder.factKey(card.fact);
    var keptFacts = pick.facts.filter(function (f) { return builder.factKey(f) !== dropKey; });
    if (!keptFacts.length) return { said: 'A file needs at least one fact.' };
    var prevKind = state.kind, prevFacts = state.facts, hasPrevKnown = has(state.known, OWN), prevKnownOwn = hasPrevKnown ? state.known[OWN].slice() : null;
    if (state.kind !== OWN) {
      var keptKeys = {};
      keptFacts.forEach(function (f) { keptKeys[builder.factKey(f)] = true; });
      state.known[OWN] = knownNow(pick).filter(function (k) { return !!keptKeys[k]; });
      state.kind = OWN;
    } else if (hasPrevKnown) {
      state.known[OWN] = state.known[OWN].filter(function (k) { return k !== dropKey; });
    }
    state.facts = keptFacts.map(word).join('\n');
    $('f-facts').value = state.facts;
    syncRadios('kind', state.kind);
    show('panel-sets', false);
    show('panel-own', true);
    drawOwn();
    remember();
    drawTitle();
    inPreviewAction = true;
    return make().then(function (res) {
      inPreviewAction = false;
      if (!res || !res.html) {
        state.kind = prevKind;
        state.facts = prevFacts;
        if (hasPrevKnown) state.known[OWN] = prevKnownOwn; else delete state.known[OWN];
        $('f-facts').value = prevFacts;
        syncRadios('kind', state.kind);
        show('panel-sets', OPS.indexOf(state.kind) >= 0);
        show('panel-own', state.kind === OWN);
        drawOwn();
        remember();
        drawTitle();
        return make().then(function () { return { said: (res && res.said) || 'Could not remove that fact.' }; });
      }
      return { html: res.html, url: res.url, said: 'Removed fact.' };
    }, function (err) {
      inPreviewAction = false;
      return { said: said(err) || 'Could not remove that fact.' };
    });
  }
  function drawSummaryRows() {
    if (!built || !built.summaryBase) return;
    var rows = built.summaryBase.slice();
    if (built.codeName) rows.push(['Code name', built.codeName + '. The file opens with it filled in.']);
    rows.push(['File', built.name + ', ' + fileSize(built.bytes) + '.']);
    var host = $('summary-rows');
    host.textContent = '';
    rows.forEach(function (row) {
      host.appendChild(el('dt', '', row[0]));
      host.appendChild(el('dd', '', row[1]));
    });
  }
  function applySingleCodeName() {
    if (!built || !built.baseHtml) return;
    var single = activeSingleCode();
    state.learner = single;
    var html = single ? builder.withCodeName(built.baseHtml, single) : built.baseHtml;
    var blob = new Blob([html], { type: 'text/html' });
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
    built.html = html;
    built.codeName = single;
    built.name = withName(built.plain, single);
    built.bytes = blob.size;
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    drawSummaryRows();
    setText('summary-facts', capital(count(built.cards, 'card')) + '. No clock. ' + fileSize(built.bytes) + '.');
    if (fileUrl) {
      $('try').setAttribute('href', TRY_PAGE + '#' + fileUrl);
      show('try', true);
      var handoff = window.AlloPacketHandoff;
      if (!inPreviewAction && handoff && typeof handoff.hostPreview === 'function') {
        if (previewSession) previewSession.update({ url: fileUrl, html: built.html });
        else previewSession = handoff.hostPreview({ url: fileUrl, html: built.html, describe: describePreview, onAction: onPreviewAction });
      }
    }
  }
  function drawResult(result, pick, plan, lesson) {
    show('making', false);
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
    built = { baseHtml: result.html, html: result.html, name: result.lesson.lessonId + '.html', bytes: 0, lesson: lesson, plain: result.lesson.lessonId + '.html', cards: cards, summaryBase: rows, codeName: '' };
    applySingleCodeName();
    show('summary', true);
    show('save', true);
    try { drawPaper(result, plan); } catch (_) { clearPaper(); }
    setText('making-said', 'The file is ready: ' + count(cards, 'card') + ', ' + fileSize(built.bytes) + '.');
    drawBatch();
  }
  function clearPaper() {
    paperOn = false;
    var host = $('paper');
    if (host) host.textContent = '';
    if (doc.body) doc.body.classList.remove('paper-on');
    show('print', false);
    show('print-note', false);
  }
  function paperField(label, short) {
    var box = el('span', short ? 'paper-field paper-field-short' : 'paper-field');
    box.appendChild(doc.createTextNode(label + ':'));
    box.appendChild(el('span', 'paper-fill'));
    return box;
  }
  function drawPaper(result, plan) {
    var host = $('paper');
    if (!host || !plan || !Array.isArray(plan.cards) || !plan.cards.length) { clearPaper(); return; }
    var title = (result && result.lesson && result.lesson.title) || 'Math fact practice';
    var items = plan.cards.map(function (c) { return builder.factWord(c.fact, loader); });
    host.textContent = '';

    var sheet = el('section', 'paper-sheet');
    sheet.setAttribute('aria-label', 'Practice sheet');
    sheet.appendChild(el('h2', 'paper-title', title));
    var who = el('div', 'paper-who');
    who.appendChild(paperField('Name', false));
    who.appendChild(paperField('Date', true));
    sheet.appendChild(who);
    sheet.appendChild(el('p', 'paper-how', '1. Look at the fact on the left and say it to yourself. 2. Fold or cover the left column. 3. Write the answer from memory in the middle column. 4. Uncover and compare. If it does not match, write the whole fact once on the right.'));

    var table = el('table', 'paper-ccc');
    var thead = el('thead'), headRow = el('tr');
    [['No.', 'pc-n'], ['Look and cover', 'pc-look'], ['Cover and write', 'pc-try'], ['Write again if needed', 'pc-fix']].forEach(function (col) {
      var th = el('th', col[1], col[0]);
      th.scope = 'col';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    items.forEach(function (it, idx) {
      var tr = el('tr');
      tr.appendChild(el('td', 'pc-n', String(idx + 1) + '.'));
      tr.appendChild(el('td', 'pc-look', it.word + ' = ' + it.answer));
      var tryCell = el('td', 'pc-try');
      tryCell.appendChild(doc.createTextNode(it.word + ' ='));
      tryCell.appendChild(el('span', 'paper-blank'));
      tr.appendChild(tryCell);
      var fixCell = el('td', 'pc-fix');
      fixCell.appendChild(el('span', 'paper-blank paper-blank-wide'));
      tr.appendChild(fixCell);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    sheet.appendChild(table);
    host.appendChild(sheet);

    var teacher = el('section', 'paper-teacher');
    teacher.setAttribute('aria-label', 'Answer key');
    teacher.appendChild(el('h2', 'paper-title', title + ' \u2014 Answer key'));
    teacher.appendChild(el('p', 'paper-keep', 'For the teacher. Keep this sheet apart from the student copy.'));
    if (plan.mode === 'rehearsal') {
      teacher.appendChild(el('p', 'paper-meta', 'New ' + (plan.newFacts.length === 1 ? 'fact' : 'facts') + ': ' + listed(plan.newFacts.map(word)) + '. Known facts: ' + listed(plan.knownFacts.map(word)) + '.'));
    }
    var keyList = el('ol', items.length > 20 ? 'paper-key key-cols-3' : 'paper-key');
    items.forEach(function (it, idx) {
      var li = el('li');
      li.appendChild(el('span', 'kn', String(idx + 1) + '.'));
      li.appendChild(el('span', 'kw', it.word));
      li.appendChild(el('span', 'ka', '= ' + it.answer));
      keyList.appendChild(li);
    });
    teacher.appendChild(keyList);
    host.appendChild(teacher);

    if (doc.body) doc.body.classList.add('paper-on');
    paperOn = true;
    show('print', true);
    show('print-note', true);
  }
  function printPaper() {
    if (!paperOn || typeof window.print !== 'function') return;
    window.print();
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
  // Step 3: unified code-name / batch .zip fold: 1 line puts that code name into the single file above;
  // 2-40 lines saves one file per student in one .zip file in 1 click (packets_zip.js).
  // ---------------------------------------------------------------------------
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;
  var MAX_ROSTER_BYTES = 256 * 1024;
  function cleanRosterLine(raw) {
    var s = String(raw || '').replace(/^\uFEFF/, '').trim();
    if (!s) return '';
    s = s.replace(/^(?:\(\d{1,3}\)|\d{1,3}[.)]|[\u2022\u25CF\u25CB\u25AA\u2023\u2043*\u2013\u2014-])\s+/, '').trim();
    var col = s.indexOf('\t') >= 0 ? s.split('\t')[0] : (s.indexOf(',') >= 0 ? s.split(',')[0] : s);
    return col.trim().replace(/^["']+|["']+$/g, '').trim();
  }
  function batchList() {
    var seen = {}, out = { names: [], twice: [], unusable: [], over: 0 };
    String(($('f-batch-names') && $('f-batch-names').value) || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var cleaned = cleanRosterLine(line);
      var name = builder.codeName(cleaned);
      if (!name) { out.unusable.push((cleaned || line.trim()).slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }
  function activeSingleCode() {
    var list = batchList();
    return list.names.length === 1 ? list.names[0] : '';
  }
  function drawBatch() {
    var list = batchList(), n = list.names.length, parts = [];
    var btn = $('batch-make');
    if (n === 0) {
      parts.push('Leave empty so each student types a code name at the start.');
      if (btn) btn.hidden = true;
    } else if (n === 1) {
      parts.push('Using ' + list.names[0] + ' in the file above' + (built ? ' (' + built.name + ')' : '') + '. Add another line to save a .zip.');
      if (btn) btn.hidden = true;
    } else {
      parts.push(count(n, 'file') + (built ? ', about ' + fileSize(n * built.bytes) + ' in all.' : '. The size shows here once the file above is ready.'));
      if (btn) {
        btn.hidden = false;
        btn.textContent = 'Save .zip for ' + n + ' students';
      }
    }
    if (list.over) parts.push('Not used: ' + count(list.over, 'more code name') + '. At most ' + MAX_STUDENTS + ' go in one .zip file.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    setText('batch-said', parts.join(' '));
  }
  function saveBatchZip() {
    setText('batch-problem', '');
    var list = batchList();
    if (list.names.length < 2) { setText('batch-problem', 'Type at least 2 code names to save a .zip file.'); return; }
    if (!built || !built.baseHtml) { setText('batch-problem', 'The file above is not ready yet.'); return; }
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') { setText('batch-problem', 'This page could not load the part that makes .zip files. Load the page again.'); return; }
    try {
      var zip = window.AlloPacketZip.create(), encoder = new TextEncoder();
      list.names.forEach(function (name) { zip.add(withName(built.plain, name), encoder.encode(builder.withCodeName(built.baseHtml, name))); });
      var parts = zip.finish();
      var zipName = built.plain.replace(/\.html$/, '') + '__' + list.names.length + '-students.zip';
      var url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' }));
      download(url, zipName);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      setText('batch-said', 'Saved ' + zipName + ' (' + fileSize(zip.bytes) + '). Each file\'s name ends with the student\'s code name. Send each student their own file.');
    } catch (error) { setText('batch-problem', 'The .zip file could not be made (' + said(error) + ').'); }
  }
  function loadRosterFile(file) {
    setText('batch-problem', '');
    if (!file) return;
    if (file.size > MAX_ROSTER_BYTES) { setText('batch-problem', 'That text file is too large. Choose a plain .txt list of code names.'); return; }
    if (typeof FileReader !== 'function') { setText('batch-problem', 'This browser cannot read local files here.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var input = $('f-batch-names');
      if (input) input.value = String(reader.result || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      applySingleCodeName();
      drawBatch();
    };
    reader.onerror = function () { setText('batch-problem', 'This browser could not read that file.'); };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // "Open a file I made" (2026-11-13): the page fills itself in from a practice file made earlier. packets_reopen.js
  // reads it (readMath, with packets_verify_core.js). The file is read in this tab only. Nothing in it is run.
  // ---------------------------------------------------------------------------
  var reopenKit = null;
  var reopenPending = null;
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
  function applyReopen(result, name, bytes) {
    if (!result.ok) {
      var handoff = window.AlloPacketHandoff;
      var pageHref = result.page ? result.page.href : '';
      if (pageHref && bytes) {
        reopenPending = {
          file: { name: name, bytes: bytes },
          href: pageHref,
          hash: pageHref === 'packets-results.html' ? ((handoff && handoff.RESULTS_HASH) || '#import-results') : ((handoff && handoff.HASH) || '#open-file'),
        };
      } else {
        reopenPending = null;
      }
      showReopen(result.why, [], result.page);
      return;
    }
    reopenPending = null;
    var got = result.math, items = [];
    clearTimeout(buildTimer);
    stopPreview();
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
    if ($('f-batch-names')) $('f-batch-names').value = fresh.learner;
    if (fresh.learner && $('batch')) $('batch').open = true;
    if (result.title) items.push('Title: ' + result.title + (/[.!?]$/.test(result.title) ? '' : '.'));
    result.notes.forEach(function (note) { items.push(note); });
    state = fresh;
    remember();
    goTo(1, true);
    showReopen('Filled in from ' + name + '. Change what you want, then make the new file in step 3.', items, null);
  }
  function reopenText(text, name, bytes) {
    if (!reopenKit) return;
    var rawBytes = bytes || (typeof TextEncoder === 'function' ? new TextEncoder().encode(String(text || '')).buffer : null);
    applyReopen(reopenKit.readMath(text, { verify: window.AlloPacketVerify, builder: builder, codeName: builder.codeName }), String(name || 'the file').slice(0, 120), rawBytes);
  }
  function wireReopen() {
    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      if (file.size > MAX_REOPEN_BYTES) { reopenPending = null; showReopen('This file is too large to be a practice file made here.', [], null); return; }
      var done = function (buf) {
        var text = typeof TextDecoder === 'function' ? new TextDecoder('utf-8').decode(buf) : '';
        reopenText(text, file.name, buf);
      };
      if (typeof file.arrayBuffer === 'function') {
        file.arrayBuffer().then(done, function () { showReopen('This browser could not read the file.', [], null); });
      } else {
        var reader = new FileReader();
        reader.onload = function () { reopenText(String(reader.result || ''), file.name); };
        reader.onerror = function () { showReopen('This browser could not read the file.', [], null); };
        reader.readAsText(file);
      }
    });
    if ($('reopen-page')) {
      $('reopen-page').addEventListener('click', function (event) {
        var handoff = window.AlloPacketHandoff;
        if (!reopenPending || !handoff || typeof handoff.redirect !== 'function') return;
        event.preventDefault();
        var target = reopenPending;
        reopenPending = null;
        handoff.redirect(target.file, target.href, target.hash).catch(function () { $('reopen-page').click(); });
      });
    }
  }
  function applyRehearseHash() {
    var hash = window.location ? String(window.location.hash || '') : '';
    var match = /^#rehearse=([^&]+)(?:&known=(.+))?$/i.exec(hash);
    if (!match) return false;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    var decode = function (part) {
      try { return decodeURIComponent(part || ''); } catch (_) { return String(part || ''); }
    };
    var seen = Object.create(null), blockedKnown = Object.create(null);
    var missedFacts = [], knownFacts = [];
    decode(match[1]).split(/[,;\n]+/).forEach(function (tok) {
      var part = String(tok || '').trim();
      if (!part || missedFacts.length >= builder.MAX_FACTS) return;
      var parsed = [];
      try { parsed = builder.parseFacts(part); } catch (_) { parsed = []; }
      parsed.forEach(function (f) {
        var key = builder.factKey(f);
        if (seen[key] || missedFacts.length >= builder.MAX_FACTS) return;
        seen[key] = true;
        blockedKnown[key] = true;
        var turn = builder.turnaround(f);
        if (turn) blockedKnown[builder.factKey(turn)] = true;
        missedFacts.push(f);
      });
    });
    if (!missedFacts.length) return false;
    if (match[2]) {
      decode(match[2]).split(/[,;\n]+/).forEach(function (tok) {
        var part = String(tok || '').trim();
        if (!part || missedFacts.length + knownFacts.length >= builder.MAX_FACTS) return;
        var parsed = [];
        try { parsed = builder.parseFacts(part); } catch (_) { parsed = []; }
        parsed.forEach(function (f) {
          var key = builder.factKey(f);
          if (seen[key] || blockedKnown[key] || missedFacts.length + knownFacts.length >= builder.MAX_FACTS) return;
          seen[key] = true;
          knownFacts.push(f);
        });
      });
    }
    state.kind = OWN;
    state.facts = missedFacts.concat(knownFacts).map(word).join('\n');
    state.title = 'Practice missed math facts';
    if (knownFacts.length >= 3) {
      state.method = 'rehearsal';
      state.known[OWN] = knownFacts.map(builder.factKey);
    } else {
      state.method = 'ccc';
      delete state.known[OWN];
    }
    remember();
    drawStep1();
    setText('rehearse-note', 'Loaded ' + count(missedFacts.length, 'missed fact') + (knownFacts.length >= 3 ? ' and ' + count(knownFacts.length, 'known fact') : '') + ' from results. They are in step 1, under My own facts.');
    show('rehearse-note', true);
    goTo(2, true);
    return true;
  }

  // A file handed over by "Change this file" on Open a practice file or check (packets-open.html, packets_handoff.js).
  function takeHanded() {
    var handoff = window.AlloPacketHandoff;
    if (!reopenKit || !handoff || typeof handoff.take !== 'function' || window.location.hash !== handoff.HASH) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (!file) { showReopen('The file is not here any more. Choose it with Open a file I made.', [], null); return; }
      reopenText(new TextDecoder('utf-8').decode(file.bytes), file.name, file.bytes);
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
    if (target !== 3) { clearTimeout(buildTimer); stopPreview(); clearBuilt(); show('making', false); }
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
    $('f-batch-names').addEventListener('input', function () { setText('batch-problem', ''); applySingleCodeName(); drawBatch(); });
    $('batch-make').addEventListener('click', saveBatchZip);
    if ($('batch-load') && $('batch-file')) {
      $('batch-load').addEventListener('click', function () { $('batch-file').value = ''; $('batch-file').click(); });
      $('batch-file').addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        loadRosterFile(file);
      });
    }
    if ($('print')) $('print').addEventListener('click', printPaper);
    $('save').addEventListener('click', saveFile);
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      stopPreview();
      state = defaults();
      $('f-facts').value = '';
      $('f-title').value = '';
      if ($('f-batch-names')) $('f-batch-names').value = '';
      show('rehearse-note', false);
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
    if (loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_work) setText('csv-label', loader.DEFAULT_LABELS.save_work);
    // "Open a file I made" and one file for each student are extras: without their scripts the page works as before.
    var kit = window.AlloPacketReopen;
    reopenKit = kit && typeof kit.readMath === 'function' && window.AlloPacketVerify && typeof window.AlloPacketVerify.readParts === 'function' && typeof FileReader === 'function' ? kit : null;
    wire();
    if (reopenKit) wireReopen();
    show('reopen', !!reopenKit);
    show('batch', !!(window.AlloPacketZip && typeof builder.withCodeName === 'function'));
    show('loading', false);
    goTo(1, true);
    if (!applyRehearseHash()) takeHanded();
  }

  try { start(); } catch (error) {
    show('loading', false);
    setText('load-problem-text', 'The page stopped while starting (' + said(error) + '). Load the page again. Nothing has been lost.');
    show('load-problem', true);
  }
})();
