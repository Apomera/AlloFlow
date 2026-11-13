// AlloFlow math fact practice: makes a PRACTICE file (feedback on every fact, more than one try) for
// learning math facts, by one of two well-known ways to practice them:
//   cover, copy, compare (activity math_ccc), and
//   rehearsal with known facts (activity math_rehearsal), modelled on incremental rehearsal.
// No AI and no app. One plain script for a browser page (window.AlloPacketMathPractice) and for node
// (module.exports). It calls nothing on the network and reads no clock: the same choices give the
// same bytes. It is a sibling of packet_check_builder.js, which makes checks; nothing made here is a
// check, and its results are practice results.
//
// The file itself is made by the take-home loader (AlloWordSoundsTakeHome.buildHtml). Each fact is
// written by the loader's math check adapter (math_computation prepare), so "7 × 8" reads the same
// in a practice file and in a check, and each card then goes through its own practice adapter's
// prepare (word_sounds_take_home/check_adapters/math_ccc.js, math_rehearsal.js): an allowlist.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-math-practice-builder/0.1.0';
  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var PLAYER = 'alloflow-word-sounds-take-home/2';
  var MAX_FACTS = 30;        // facts in one file (cover, copy, compare) or in one list
  var MAX_NUMBER = 999;      // each number in a fact the teacher types
  var MAX_ANSWER = 9999;
  var MAX_NEW = 3;           // new facts in one rehearsal file
  var MIN_KNOWN = 3;         // known facts a rehearsal file needs
  var STEPS = 3;             // times a new fact is asked in its own run
  // short: the end of a file's title, so that a set's two kinds of file never save results under the same name.
  var METHODS = {
    ccc: { activity: 'math_ccc', name: 'Cover, copy, compare', short: 'cover, copy, compare' },
    rehearsal: { activity: 'math_rehearsal', name: 'Rehearsal with known facts', short: 'new and known facts' },
  };
  var OPS = { add: 'add', '+': 'add', sub: 'sub', '-': 'sub', mul: 'mul', x: 'mul', X: 'mul', '*': 'mul', div: 'div', '/': 'div', ':': 'div' };
  OPS[String.fromCharCode(0x2212)] = 'sub'; OPS[String.fromCharCode(0xD7)] = 'mul'; OPS[String.fromCharCode(0xF7)] = 'div';
  var OP_NAMES = { add: 'Addition', mul: 'Multiplication' };

  function text(value) { return value == null ? '' : String(value); }
  function own(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }
  function fnv(value) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function range(from, to) { var out = []; for (var n = from; n <= to; n++) out.push(n); return out; }
  function fact(a, b, op) { return { a: a, b: b, op: op }; }
  function keyOf(f) { return f.op + ':' + f.a + ':' + f.b; }
  // The same fact with its two numbers swapped (3 + 7 for 7 + 3). Only + and × have one.
  function turnaround(f) { return f.op === 'add' || f.op === 'mul' ? fact(f.b, f.a, f.op) : null; }
  // A fixed mix of a list: the same seed text gives the same order (xorshift32 seeded by FNV-1a).
  function mixed(list, seed) {
    var s = parseInt(fnv(seed), 16) || 1;
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      var j = s % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  // The fact families, in a common teaching order: easier facts and strategies first. This is common
  // practice, not a standard. Addition: + 0 and + 1, doubles, make 10, near doubles, then the rest.
  // Multiplication: × 2, × 10, × 5, × 1 and × 0, squares, × 3, × 4, × 9, × 6, × 7, × 8.
  // A fact may be in two families (1 + 1 is + 1 and a double); each family lists the facts a teacher
  // expects under its name. line: what the maker page says about it.
  var FAMILIES = (function () {
    var rows = [];
    // title: what a file of the set is called ("× 7 facts"); two sets read better with a title of their own.
    var add = function (id, name, line, facts, title) { rows.push({ id: id, op: 'add', name: name, title: title || name + ' facts', line: line, facts: facts }); };
    var mul = function (id, name, line, facts, title) { rows.push({ id: id, op: 'mul', name: name, title: title || name + ' facts', line: line, facts: facts }); };
    add('add-0-1', '+ 0 and + 1', 'Adding 0 or 1, like 6 + 0 and 6 + 1.', range(0, 9).map(function (n) { return fact(n, 0, 'add'); }).concat(range(0, 9).map(function (n) { return fact(n, 1, 'add'); })));
    add('add-doubles', 'Doubles', 'A number plus itself, 1 + 1 to 9 + 9.', range(1, 9).map(function (n) { return fact(n, n, 'add'); }));
    add('add-make-10', 'Make 10', 'Two numbers that make 10, 1 + 9 to 9 + 1.', range(1, 9).map(function (n) { return fact(n, 10 - n, 'add'); }));
    add('add-near-doubles', 'Near doubles', 'A double and one more, 1 + 2 to 8 + 9.', range(1, 8).map(function (n) { return fact(n, n + 1, 'add'); }));
    // The rest: two numbers from 2 to 9, smaller one first, that are not a double, do not make 10 and are not a near double.
    var rest = [];
    range(2, 9).forEach(function (a) { range(a + 1, 9).forEach(function (b) { if (a + b !== 10 && b !== a + 1) rest.push(fact(a, b, 'add')); }); });
    add('add-rest', 'The rest, up to 9 + 9', 'The other facts with two numbers from 2 to 9, like 4 + 8.', rest, 'Addition facts to 9 + 9');
    var times = function (n) { return range(1, 10).map(function (k) { return fact(n, k, 'mul'); }); };
    var x = String.fromCharCode(0xD7);
    mul('mul-2', x + ' 2', '2 ' + x + ' 1 to 2 ' + x + ' 10.', times(2));
    mul('mul-10', x + ' 10', '10 ' + x + ' 1 to 10 ' + x + ' 10.', times(10));
    mul('mul-5', x + ' 5', '5 ' + x + ' 1 to 5 ' + x + ' 10.', times(5));
    mul('mul-1-0', x + ' 1 and ' + x + ' 0', '1 ' + x + ' 1 to 1 ' + x + ' 10, and 0 ' + x + ' 1 to 0 ' + x + ' 10.', times(1).concat(times(0)));
    mul('mul-squares', 'Squares', 'A number times itself, 1 ' + x + ' 1 to 10 ' + x + ' 10.', range(1, 10).map(function (n) { return fact(n, n, 'mul'); }), 'Square facts');
    [3, 4, 9, 6, 7, 8].forEach(function (n) { mul('mul-' + n, x + ' ' + n, n + ' ' + x + ' 1 to ' + n + ' ' + x + ' 10.', times(n)); });
    return rows;
  })();
  var ORDER = { add: FAMILIES.filter(function (f) { return f.op === 'add'; }).map(function (f) { return f.id; }),
    mul: FAMILIES.filter(function (f) { return f.op === 'mul'; }).map(function (f) { return f.id; }) };
  function family(id) {
    for (var i = 0; i < FAMILIES.length; i++) if (FAMILIES[i].id === id) return FAMILIES[i];
    return null;
  }
  // The families that come before this one in the order of its operation, the nearest first.
  function earlier(fam) { var list = ORDER[fam.op]; return list.slice(0, list.indexOf(fam.id)).reverse().map(family); }
  function copyFamily(f) { return { id: f.id, op: f.op, opName: OP_NAMES[f.op], name: f.name, title: f.title, line: f.line, facts: f.facts.map(function (g) { return fact(g.a, g.b, g.op); }) }; }

  // One fact of a teacher's list -> { a, b, op }, or an Error with a plain reason.
  function checkFact(raw, n) {
    var p = raw && typeof raw === 'object' ? raw : {};
    var fail = function (reason) { throw new Error('Fact ' + n + ': ' + reason); };
    var whole = function (v) { return v != null && v !== '' && typeof v !== 'boolean' && Number.isSafeInteger(Number(v)) && Number(v) >= 0 && Number(v) <= MAX_NUMBER; };
    if (!whole(p.a) || !whole(p.b)) fail('both numbers must be whole numbers from 0 to ' + MAX_NUMBER + '.');
    var op = own(OPS, text(p.op)) ? OPS[text(p.op)] : '';
    if (!op) fail('the operation must be +, -, x or /.');
    var a = Number(p.a), b = Number(p.b);
    var answer = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : b === 0 ? NaN : a / b;
    if (op === 'div' && b === 0) fail('it divides by 0.');
    if (op === 'div' && a % b !== 0) fail('it does not come out even. Use a division with no remainder.');
    if (answer < 0) fail('the answer is below 0.');
    if (answer > MAX_ANSWER) fail('the answer is more than ' + MAX_ANSWER + '.');
    return fact(a, b, op);
  }
  // "7 x 8, 6+7; 12 - 5" -> [{ a, b, op }]. For a plain text box and the command line.
  function parseFacts(value) {
    var shape = new RegExp('^(\\d+)\\s*([-+xX*/:' + String.fromCharCode(0x2212, 0xD7, 0xF7) + '])\\s*(\\d+)(?:\\s*=\\s*(\\d+))?$');
    return text(value).split(/[,;\n]+/).map(function (part) { return part.trim(); }).filter(Boolean).map(function (part, i) {
      var m = shape.exec(part);
      if (!m) throw new Error('Fact ' + (i + 1) + ': "' + part + '" is not a fact. Write it like 7 x 8 or 6 + 7.');
      var f = checkFact({ a: Number(m[1]), b: Number(m[3]), op: OPS[m[2]] }, i + 1);
      if (m[4] != null && Number(m[4]) !== answerOf(f)) throw new Error('Fact ' + (i + 1) + ': ' + part + ' is not right. The answer is ' + answerOf(f) + '.');
      return f;
    });
  }
  function answerOf(f) { return f.op === 'add' ? f.a + f.b : f.op === 'sub' ? f.a - f.b : f.op === 'mul' ? f.a * f.b : f.a / f.b; }
  // A fact in a reason ("3 + 4"), with the signs the file shows (math_computation.js).
  function sayFact(f) { return f.a + ' ' + (f.op === 'add' ? '+' : String.fromCharCode(f.op === 'sub' ? 0x2212 : f.op === 'mul' ? 0xD7 : 0xF7)) + ' ' + f.b; }

  // A fact as the take-home loader writes it ("7 × 8"), by the loader's own math check adapter.
  function factWord(f, loader) {
    var made = loader.CHECK_ADAPTERS.math_computation.prepare({ a: f.a, b: f.b, op: f.op });
    if (!made || !made.item) throw new Error('A fact cannot be written: ' + (made && made.missing ? made.missing.join(', ') : keyOf(f)));
    return made.item;
  }

  // The facts a learner knows by the teaching order: a fact of the family is ticked when it, or its
  // turnaround, is a fact of a family that comes earlier for the same operation (7 × 2, because
  // 2 × 7 is a fact of × 2). The first family of each operation has none.
  function knownByOrder(familyId) {
    var fam = family(text(familyId));
    if (!fam) throw new Error('Unknown fact family "' + text(familyId) + '".');
    var seen = {};
    earlier(fam).forEach(function (e) { e.facts.forEach(function (f) { seen[keyOf(f)] = true; }); });
    return fam.facts.filter(function (f) { var t = turnaround(f); return seen[keyOf(f)] || (t && seen[keyOf(t)]); }).map(keyOf);
  }

  // What a set of choices makes, without making it: the facts, and for rehearsal the new facts, the
  // known facts and the cards in order. Throws an Error whose message is a plain reason.
  //   planMathPractice({ mode: 'ccc' | 'rehearsal', factSet: 'mul-7' })
  //   planMathPractice({ mode: 'rehearsal', facts: [{ a: 7, b: 8, op: 'mul' }, ...], known: ['mul:7:2', ...] })
  // known: fact keys ('mul:7:2') or facts. Left out for a fact family, it is knownByOrder(factSet).
  //
  // Cover, copy, compare: every fact once, each card starting with the fact and its answer shown.
  // A fact family is given in a fixed mixed order (so a learner cannot just count on); a typed list
  // keeps the teacher's order, but a fact is never right beside its turnaround (see apart).
  //
  // Rehearsal with known facts (STEPS = 3, MAX_NEW = 3, MIN_KNOWN = 3):
  //   new facts  = the facts not marked known, in the list's order; the first 3 are used.
  //   known      = the facts marked known, in a fixed mixed order. With fewer than 3, facts of the
  //                families before this one (the nearest first, each in a fixed mixed order) are added
  //                until there are 3. A typed list has no family before it. A known fact that is a new
  //                fact turned around is not used (held); a known fact and its turnaround count as one
  //                and take turns (pairs).
  //   each new fact gets one run: the new fact, then the next known fact; the new fact, then those
  //   2 known facts; the new fact, then those 3 known facts (new, known; new, known, known; new,
  //   known, known, known). The 3 known facts of a run are the next 3 in the known list, which
  //   then go to its end, so the known facts take turns.
  //   each new fact comes back once more, followed by the next 2 known facts: after the next new
  //   fact's run, and the last one at the end.
  //   So a new fact is asked 4 times, and 8 of every 12 cards are known facts. The first card of a
  //   new fact shows it with its answer first; every other card asks at once. A wrong answer is
  //   shown with its answer, typed while looking, then covered and asked again on the same card.
  function planMathPractice(input) {
    var o = input || {};
    var mode = text(o.mode || 'ccc');
    if (!own(METHODS, mode)) throw new Error('Unknown way to practice "' + mode + '". Use ccc or rehearsal.');
    var fam = null, facts;
    if (o.factSet != null && o.factSet !== '') {
      fam = family(text(o.factSet));
      if (!fam) throw new Error('Unknown fact family "' + text(o.factSet) + '". Use one of: ' + FAMILIES.map(function (f) { return f.id; }).join(', ') + '.');
      facts = fam.facts.slice();
    } else {
      var list = Array.isArray(o.facts) ? o.facts : typeof o.facts === 'string' ? parseFacts(o.facts) : [];
      if (list.length < 1 || list.length > MAX_FACTS) throw new Error('A list needs 1 to ' + MAX_FACTS + ' facts. This list has ' + list.length + '.');
      facts = list.map(function (f, i) { return checkFact(f, i + 1); });
      var seen = {};
      facts.forEach(function (f, i) {
        if (seen[keyOf(f)]) throw new Error('Fact ' + (i + 1) + ' is in the list twice.');
        seen[keyOf(f)] = true;
      });
    }
    var out = { mode: mode, activity: METHODS[mode].activity, method: METHODS[mode].name, factSet: fam ? fam.id : '', familyName: fam ? fam.name : '', familyTitle: fam ? fam.title : '',
      opName: fam ? OP_NAMES[fam.op] : '', facts: facts, newFacts: [], knownFacts: [], addedKnown: [], addedFrom: [], waiting: [], cards: [] };
    if (mode === 'ccc') {
      var order = fam ? mixed(facts, 'ccc|' + fam.id) : facts;
      out.cards = order.map(function (f) { return { fact: f, role: '', study: true }; });
      // A typed list keeps the teacher's order, except that a fact and its turnaround are moved apart (2026-11-13).
      apart(out.cards);
      return out;
    }
    var known = {};
    var marked = o.known == null && fam ? knownByOrder(fam.id) : Array.isArray(o.known) ? o.known : [];
    marked.forEach(function (k) { known[typeof k === 'string' ? k : keyOf(k || {})] = true; });
    var fresh = facts.filter(function (f) { return !known[keyOf(f)]; });
    var knownFacts = facts.filter(function (f) { return known[keyOf(f)]; });
    if (!fresh.length) throw new Error('Every fact is chosen as known. Leave at least one out: that is the new fact to learn.');
    out.newFacts = fresh.slice(0, MAX_NEW);
    out.waiting = fresh.slice(MAX_NEW);
    // 2026-11-13. A known fact that is a new fact turned around (4 + 3 for a new 3 + 4) would give the new one away: it is
    // not used (held, with the new fact it would give away). A known fact and its own turnaround (1 + 9 and 9 + 1 in Make
    // 10) are one known fact that takes turns: both are used, as the teacher chose, never in the same group of known
    // cards, so never side by side; it counts once toward the 3 known facts a rehearsal needs.
    var isNew = {};
    out.newFacts.forEach(function (f) { isNew[keyOf(f)] = true; });
    out.held = [];
    out.pairs = [];
    var inFile = {};
    facts.forEach(function (f) { inFile[keyOf(f)] = true; });
    var slots = [], slotOf = {};
    mixed(knownFacts, 'known|' + facts.map(keyOf).join(',') + '|' + knownFacts.map(keyOf).join(',')).forEach(function (f) {
      var t = turnaround(f), tk = t ? keyOf(t) : '';
      if (tk && isNew[tk]) { out.held.push({ fact: f, gives: t }); return; }
      if (tk && tk !== keyOf(f) && slotOf[tk]) { slotOf[tk].facts.push(f); slotOf[keyOf(f)] = slotOf[tk]; out.pairs.push([slotOf[tk].facts[0], f]); return; }
      var slot = { facts: [f], turn: 0 };
      slots.push(slot);
      slotOf[keyOf(f)] = slot;
    });
    out.chosenKnown = slots.length;
    if (slots.length < MIN_KNOWN && fam) {
      earlier(fam).forEach(function (e) {
        var took = false;
        mixed(e.facts, 'from|' + e.id).forEach(function (f) {
          // Not a fact whose turnaround is already in the file (2 × 10 beside 10 × 2): it is the same fact.
          var t = turnaround(f);
          if (slots.length >= MIN_KNOWN || inFile[keyOf(f)] || (t && inFile[keyOf(t)])) return;
          inFile[keyOf(f)] = true;
          slots.push({ facts: [f], turn: 0 });
          out.addedKnown.push(f);
          took = true;
        });
        if (took) out.addedFrom.push(e.name);
      });
    }
    if (slots.length < MIN_KNOWN) {
      var n = slots.length;
      throw new Error('Rehearsal needs at least ' + MIN_KNOWN + ' facts the student already knows. ' + (!n ? 'None are chosen.' : out.pairs.length
        ? 'Only ' + n + ' different ' + (n === 1 ? 'fact is' : 'facts are') + ' chosen: a fact and its turnaround (' + sayFact(out.pairs[0][0]) + ' and ' + sayFact(out.pairs[0][1]) + ') count as one.'
        : 'Only ' + n + (n === 1 ? ' is' : ' are') + ' chosen.')
        + out.held.map(function (h) { return ' ' + sayFact(h.fact) + ' is not used: it is the new fact ' + sayFact(h.gives) + ' turned around, so it would give it away.'; }).join(''));
    }
    out.knownFacts = [];
    slots.forEach(function (s) { out.knownFacts = out.knownFacts.concat(s.facts); });
    var queue = slots.slice();
    // The next n known facts: a pair's two facts take turns, one for each time it is taken.
    var take = function (n) { var got = queue.splice(0, n); queue = queue.concat(got); return got.map(function (s) { var f = s.facts[s.turn % s.facts.length]; s.turn++; return f; }); };
    var cards = out.cards;
    var run = function (f) {
      var window = take(STEPS);
      for (var step = 1; step <= STEPS; step++) {
        cards.push({ fact: f, role: 'new', study: step === 1 });
        window.slice(0, step).forEach(function (k) { cards.push({ fact: k, role: 'known', study: false }); });
      }
    };
    var review = function (f) {
      cards.push({ fact: f, role: 'new', study: false });
      take(2).forEach(function (k) { cards.push({ fact: k, role: 'known', study: false }); });
    };
    out.newFacts.forEach(function (f, i) {
      run(f);
      if (i > 0) review(out.newFacts[i - 1]);
    });
    review(out.newFacts[out.newFacts.length - 1]);
    apart(cards);
    return out;
  }
  // Never the same fact or its turnaround twice in a row (as the app's Math Fluency practice): the answer is still in
  // mind. Of two such cards the later one (in a rehearsal, the known one, so new facts stay where they are) swaps
  // places with the nearest card of the same role, later ones first, that leaves fewer such pairs in the list.
  // 2026-11-13.
  function apart(cards) {
    var same = function (x, y) { if (!x || !y) return false; var t = turnaround(x.fact); return keyOf(x.fact) === keyOf(y.fact) || (!!t && keyOf(t) === keyOf(y.fact)); };
    var pairs = function (list) { var n = 0; for (var p = 1; p < list.length; p++) if (same(list[p], list[p - 1])) n++; return n; };
    for (var round = 0, now = pairs(cards); now > 0 && round < cards.length; round++) {
      var moved = false;
      for (var i = 1; i < cards.length && !moved; i++) {
        if (!same(cards[i], cards[i - 1])) continue;
        var m = cards[i].role === 'new' ? i - 1 : i;
        if (cards[m].role === 'new') continue;
        var tries = [];
        for (var j = m + 1; j < cards.length; j++) tries.push(j);
        for (var k = m - 1; k >= 0; k--) tries.push(k);
        for (var n = 0; n < tries.length && !moved; n++) {
          if (cards[tries[n]].role !== cards[m].role) continue;
          var trial = cards.slice(), t = trial[m]; trial[m] = trial[tries[n]]; trial[tries[n]] = t;
          var left = pairs(trial);
          if (left < now) { cards[tries[n]] = trial[tries[n]]; cards[m] = trial[m]; now = left; moved = true; }
        }
      }
      if (!moved) break;
    }
    return cards;
  }

  // The lesson for a practice file. loader = AlloWordSoundsTakeHome (word_sounds_take_home_loader.js).
  //   lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' })
  //   lessonFromMathPractice({ loader, mode: 'rehearsal', facts: '7 x 8, 6 x 7, ...', known: ['mul:6:7', ...], title })
  // The lesson is mode "practice": feedback on every card, no clock, no teacher code, nothing scrambled.
  function lessonFromMathPractice(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS.math_computation || !loader.CHECK_ADAPTERS.math_ccc || !loader.CHECK_ADAPTERS.math_rehearsal) {
      throw new Error('lessonFromMathPractice needs loader (AlloWordSoundsTakeHome, with the math practice activities)');
    }
    var plan = planMathPractice(o);
    var adapter = loader.CHECK_ADAPTERS[plan.activity];
    var items = plan.cards.map(function (card, i) {
      var written = factWord(card.fact, loader);
      var raw = { word: written.word, answer: written.answer, study: card.study };
      if (card.role) raw.role = card.role;
      var made = adapter.prepare(raw);
      if (!made || !made.item) throw new Error('Card ' + (i + 1) + ' cannot be used: ' + (made && made.missing ? made.missing.join(', ') : 'no reason given'));
      var n = (i < 9 ? '0' : '') + (i + 1);
      return Object.assign({ id: plan.activity + '-' + n + (card.role ? '-' + card.role : '') }, made.item);
    });
    // "× 7 facts: cover, copy, compare", "Doubles facts: new and known facts", "My math facts: cover, copy, compare".
    // The results file is named after the title, so a set's two kinds of file save results under different names.
    var title = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120) || (plan.factSet ? plan.familyTitle : 'My math facts') + ': ' + METHODS[plan.mode].short;
    var source = plan.factSet || 'own-' + fnv(plan.facts.map(keyOf).join(','));
    var lesson = { schema: LESSON_SCHEMA, player: PLAYER, lessonId: 'math-facts-' + source + '-' + plan.mode, revision: '', language: 'en', title: title, showLetters: false,
      mode: 'practice', activityTitles: {}, blocks: [{ activity: plan.activity, items: items }], feedback: { correct: [], retry: null }, audio: {}, images: {}, submit: null };
    lesson.activityTitles[plan.activity] = adapter.title;
    lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.blocks]));
    return lesson;
  }

  // A practice file's answers are whole numbers. buildHtml embeds core.soundAnswerMatches in every
  // practice file as its answer matcher (ctx.matches); WS_CORE's compares sounds, which a math fact
  // does not need, so a math practice file is given this one: the same whole number.
  var WHOLE_NUMBER_ANSWERS = {
    soundAnswerMatches: function (given, answer) { var t = String(given == null ? '' : given).trim(); return /^[0-9]+$/.test(t) && Number(t) === Number(answer); },
  };

  // The file. buildMathPracticePacket({ lesson, loader, title, labels }) -> { html, manifest, sha256 }
  // labels: the file's words in another language (the loader's keys); the start screen's line is the
  // activity's own (<activity>_intro).
  function buildMathPracticePacket(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || typeof loader.buildHtml !== 'function' || !loader.CHECK_ADAPTERS || typeof loader.sha256 !== 'function') throw new Error('buildMathPracticePacket needs loader (AlloWordSoundsTakeHome)');
    var given = o.lesson;
    var activity = given && Array.isArray(given.blocks) && given.blocks.length === 1 ? text(given.blocks[0].activity) : '';
    if (!given || given.mode !== 'practice' || (activity !== 'math_ccc' && activity !== 'math_rehearsal') || !loader.CHECK_ADAPTERS[activity]) {
      throw new Error('buildMathPracticePacket needs a lesson from lessonFromMathPractice');
    }
    var lesson = JSON.parse(JSON.stringify(given));
    var title = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (title) { lesson.title = title; lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.blocks])); }
    var labels = Object.assign({}, o.labels || {});
    if (!labels.intro) labels.intro = labels[activity + '_intro'] || loader.CHECK_ADAPTERS[activity].labels[activity + '_intro'];
    var html = loader.buildHtml(lesson, { core: WHOLE_NUMBER_ANSWERS, labels: labels });
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return { html: html, manifest: block ? JSON.parse(block[1]) : null, sha256: loader.sha256(html).hex, lesson: lesson };
  }

  var api = { VERSION: VERSION, METHODS: METHODS, FAMILIES: FAMILIES.map(copyFamily), MAX_FACTS: MAX_FACTS, MAX_NEW: MAX_NEW, MIN_KNOWN: MIN_KNOWN, STEPS: STEPS,
    factKey: keyOf, turnaround: turnaround, answerOf: answerOf, factWord: factWord, checkFact: checkFact, parseFacts: parseFacts, knownByOrder: knownByOrder,
    planMathPractice: planMathPractice, lessonFromMathPractice: lessonFromMathPractice, buildMathPracticePacket: buildMathPracticePacket };
  root.AlloPacketMathPractice = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
