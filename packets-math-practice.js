// The math fact practice maker (packets-math-practice.html): three steps, then one practice file.
// Everything happens in this tab. The page asks for nothing but the scripts it names: it fetches nothing,
// and its rule (connect-src 'none') makes the browser refuse if it tried. A practice file of math facts has
// no sound and no pictures, so there is nothing else to get. The page runs without AI, and there is no
// account and no cookie. What it keeps on the device is listed under "About this page".
// The sets of facts, the teaching order, the known facts a set starts with and the plan of a rehearsal file
// all come from packet_math_practice_builder.js; this page only shows them and passes the choices on.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-math-practice/1';
  var TRY_PAGE = 'packets-try.html';
  var OWN = 'own';
  var KINDS = ['add', 'mul', OWN];
  var METHOD_IDS = ['ccc', 'rehearsal'];
  var MAX_TYPED = 2000;

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
  var buildTimer = 0, buildRun = 0, built = null, fileUrl = '';

  function defaults() { return { kind: '', sets: { add: '', mul: '' }, facts: '', method: '', known: {} }; }
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
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, kind: state.kind, sets: state.sets, facts: state.facts, method: state.method, known: state.known }));
    } catch (_) { /* a browser that cannot keep them still works */ }
  }
  function recall() {
    var fresh = defaults(), saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
    if (!saved || saved.v !== 1) return fresh;
    if (KINDS.indexOf(saved.kind) >= 0) fresh.kind = saved.kind;
    ['add', 'mul'].forEach(function (kind) {
      var id = saved.sets && typeof saved.sets === 'object' && has(saved.sets, kind) ? saved.sets[kind] : '';
      var row = typeof id === 'string' ? setRow(id) : null;
      if (row && row.op === kind) fresh.sets[kind] = id;
    });
    if (typeof saved.facts === 'string') fresh.facts = saved.facts.slice(0, MAX_TYPED);
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
    if (state.kind !== 'add' && state.kind !== 'mul') return null;
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
    try { parsed = builder.parseFacts(part); } catch (error) { return { text: part, ok: false, says: reason(error) }; }
    if (parsed.length !== 1) return { text: part, ok: false, says: 'This is not a fact.' };
    var f = parsed[0], key = builder.factKey(f), written;
    try { written = builder.factWord(f, loader); } catch (error) { return { text: part, ok: false, says: reason(error) }; }
    if (seen[key]) return { text: written.word, ok: false, says: 'Already in the list.' };
    seen[key] = true;
    return { text: written.word, ok: true, fact: f, says: 'Ready. The answer is ' + written.answer + '.' };
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
    var sets = state.kind === 'add' || state.kind === 'mul';
    show('panel-sets', sets);
    show('panel-own', state.kind === OWN);
    if (sets) { drawSets(); drawSetResult(); } else show('set-result', false);
    if (state.kind === OWN) {
      if ($('f-facts').value !== state.facts) $('f-facts').value = state.facts;
      drawOwn();
    }
  }
  function stopAtStep1() {
    if (!state.kind) return 'Choose addition, multiplication or your own facts to go on.';
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
    var first = pick.set && builder.knownByOrder(pick.set.id).length === 0 && pick.set.id === setsOf(pick.set.op)[0].id;
    setText('known-hint', !pick.set ? 'Choose the facts the learner already knows. The others are new facts to learn.'
      : first ? pick.set.name + ' comes first in the order, so none are chosen yet. Choose the facts the learner already knows.'
        : 'Chosen from the teaching order: a fact is chosen when it, or its turnaround, is in a set that comes earlier. Change the choices to fit the learner.');
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
    var sub = [capital(count(plan.cards.length, 'card')) + '. ' + plan.cards.filter(function (c) { return c.role === 'known'; }).length + ' are facts the learner knows.'];
    if (plan.addedKnown.length) {
      var ticked = plan.knownFacts.length - plan.addedKnown.length;
      sub.push((ticked ? 'Only ' + count(ticked, 'fact is', 'facts are') + ' chosen' : 'No facts are chosen') + ', so ' + listed(plan.addedKnown.map(word)) + ' from ' + listed(plan.addedFrom)
        + (plan.addedFrom.length === 1 ? ', the set before,' : ', the sets before,') + ' are used as known facts too.');
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
  function clearBuilt() {
    buildRun++;
    built = null;
    if (fileUrl) { try { URL.revokeObjectURL(fileUrl); } catch (_) {} fileUrl = ''; }
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
      result = builder.buildMathPracticePacket({ lesson: lesson, loader: loader });
    } catch (error) {
      if (run === buildRun) problem('The file could not be put together (' + (said(error) || 'no reason was given') + '). Your choices are still here.');
      return;
    }
    if (run === buildRun) drawResult(result, pick, plan);
  }
  function drawResult(result, pick, plan) {
    show('making', false);
    var blob = new Blob([result.html], { type: 'text/html' });
    built = { html: result.html, name: result.lesson.lessonId + '.html', bytes: blob.size };
    try { fileUrl = URL.createObjectURL(blob); } catch (_) { fileUrl = ''; }
    var cards = plan.cards.length, knownCards = plan.cards.filter(function (c) { return c.role === 'known'; }).length;
    var rows = [['Facts', pick.set ? pick.set.opName + ': ' + pick.set.name + '. ' + capital(count(pick.facts.length, 'fact')) + '.' : capital(count(pick.facts.length, 'fact')) + ': ' + pick.facts.map(word).join(', ') + '.']];
    if (plan.mode === 'ccc') {
      rows.push(['How', plan.method + '. Every fact once, ' + (pick.set ? 'in a mixed order, so the learner cannot just count on.' : 'in the order you typed them.')]);
      rows.push(['Cards', capital(count(cards, 'card')) + '. Each one starts with the fact and its answer.']);
    } else {
      rows.push(['How', plan.method + '. New ' + (plan.newFacts.length === 1 ? 'fact' : 'facts') + ': ' + listed(plan.newFacts.map(word)) + '. Known facts: ' + listed(plan.knownFacts.map(word)) + '.']);
      rows.push(['Cards', capital(count(cards, 'card')) + '. ' + knownCards + ' are facts the learner knows. Each new fact is asked 4 times, and shown with its answer the first time.']);
    }
    rows.push(['Feedback', 'Right or wrong after every answer. After a wrong answer the file shows the answer, the learner types it while looking, and then answers again from memory. Up to 3 tries from memory on each card.']);
    rows.push(['Clock', 'None.']);
    rows.push(['Title', result.lesson.title]);
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
    show('after-save', true);
    $('after-save').focus();
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
    $('save').addEventListener('click', saveFile);
    $('forget').addEventListener('click', function () {
      try { window.localStorage.removeItem(STORE_KEY); } catch (_) {}
      state = defaults();
      $('f-facts').value = '';
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
