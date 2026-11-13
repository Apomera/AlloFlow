// Check adapter: math computation ("7 + 8 =", type the answer).
// App source of truth (math_fluency_module.js):
//   countCorrectDigits (~1110): CBM digits correct, each correct digit in its
//   place value; an answer with the opposite sign earns no digit.
//   submitAnswer (~1952): a typed whole number, or Skip; a fixed form gives no
//   feedback; correct = the number typed === problem.answer.
//   finishProbe (~1505): digits correct per minute over the time used (see
//   checkScore in the loader for the rate; this file scores one item).
//   Forms: MATH_PROBE_BANKS in psychometric_math_probes.json, 120 seconds.
// Also plays a teacher's own problems: { a, b, op } or { display, answer }.
module.exports = {
  id: 'math_computation',
  title: 'Math Fluency',
  labels: {
    math_computation_directions: 'Type the answer to each one.',
    math_computation_label: '{problem}. Type the answer.',
    math_computation_remainder: 'Leave out the remainder.',
  },
  // p: { a, b, op } with op add, sub, mul or div (the answer is worked out
  // here; a given answer that disagrees is refused), or { display, answer }.
  // A division must be exact unless p.allowRemainder is true; then the answer
  // is the whole-number part, and the student is told to leave out the
  // remainder (item.remainder, on every division of such a check).
  // 2026-11-13: item.shown, when it differs from the plain text, is what the
  // screen shows: a teacher's own problem with the signs of the others (the
  // minus sign, times, divide), and a number of 10000 or more grouped in
  // threes with a narrow no-break space, the same in every language and on the
  // paper copy (packets-check.js). Worked out here, so the file carries no code
  // for it; the screen reader label has the number without the spaces. The
  // problem stays on one line (a long one gets a smaller size).
  prepare: function (p) {
    p = p || {};
    var whole = function (v) { return v != null && v !== '' && Number.isSafeInteger(Number(v)) && Math.abs(Number(v)) <= 99999999; };
    var grouped = function (t) { return t.replace(/\d{5,}/g, function (n) { return n.replace(/\B(?=(\d{3})+(?!\d))/g, String.fromCharCode(0x202F)); }); };
    if (p.a == null && p.b == null && p.display != null) {
      var display = String(p.display).replace(/\s+/g, ' ').trim();
      if (!display || display.length > 40) return { missing: ['a problem of 1 to 40 characters'] };
      if (!whole(p.answer)) return { missing: ['a whole-number answer'] };
      var own = { word: display, display: display, answer: String(Number(p.answer)) };
      var signs = display.replace(/(^|\s)-(?=\s|\d)/g, function (all, lead) { return lead + String.fromCharCode(0x2212); })
        .replace(/(\d) [xX*] (?=\d)/g, function (all, lead) { return lead + ' ' + String.fromCharCode(0xD7) + ' '; }).replace(/(\d) \/ (?=\d)/g, function (all, lead) { return lead + ' ' + String.fromCharCode(0xF7) + ' '; });
      // said: the label's text (the signs, the plain numbers).
      if (signs !== display) own.said = signs;
      if (grouped(signs) !== display) own.shown = grouped(signs);
      return { item: own };
    }
    if (!whole(p.a) || !whole(p.b)) return { missing: ['two whole numbers'] };
    var a = Number(p.a), b = Number(p.b);
    var symbol = p.op === 'add' ? '+' : p.op === 'sub' ? String.fromCharCode(0x2212) : p.op === 'mul' ? String.fromCharCode(0xD7) : p.op === 'div' ? String.fromCharCode(0xF7) : '';
    if (!symbol) return { missing: ['an operation: add, sub, mul or div'] };
    if (p.op === 'div' && b === 0) return { missing: ['a divisor that is not 0'] };
    if (p.op === 'div' && a % b !== 0 && p.allowRemainder !== true) return { missing: ['a division with no remainder'] };
    var answer = p.op === 'add' ? a + b : p.op === 'sub' ? a - b : p.op === 'mul' ? a * b : Math.trunc(a / b);
    if (!whole(answer)) return { missing: ['an answer of 8 digits or fewer'] };
    if (p.answer != null && Number(p.answer) !== answer) return { missing: ['an answer that matches the problem'] };
    var item = { word: a + ' ' + symbol + ' ' + b, a: a, b: b, symbol: symbol, answer: String(answer) };
    if (grouped(item.word) !== item.word) item.shown = grouped(item.word) + ' =';
    if (p.op === 'div' && p.allowRemainder === true) item.remainder = true;
    return { item: item };
  },
  render: function (item, ctx) {
    var problem = item.display || item.a + ' ' + item.symbol + ' ' + item.b, shown = item.shown || (item.display ? problem : problem + ' ='), n = shown.length;
    var note = item.remainder ? ' ' + ctx.L.math_computation_remainder : '';
    var pad = ctx.keypad({ label: ctx.fmt(ctx.L.math_computation_label, { problem: item.said || problem }) + note, onNext: function (value) { ctx.answer(value); } });
    ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true', style: 'white-space:nowrap;font-size:min(2.6rem,' + (137 / n | 0) + 'vw,' + (1130 / n | 0) + 'px)', text: shown }));
    if (note) ctx.root.appendChild(ctx.el('p', { class: 'muted', style: 'text-align:center', text: note }));
    ctx.root.appendChild(pad.node);
    pad.focus();
    return {
      // Practice items only: lock the keys.
      reveal: function () { pad.lock(); },
    };
  },
  score: function (item, answer, response) {
    // BEGIN COPY of countCorrectDigits (math_fluency_module.js). Keep the body
    // the same, line for line: tests/packet_check_mode.test.js compares the two.
    function countCorrectDigits(expected, actual) {
      if (!Number.isFinite(Number(expected)) || !Number.isFinite(Number(actual))) return 0;
      if (Number(expected) * Number(actual) < 0) return 0;
      var expectedDigits = String(Math.abs(Math.trunc(Number(expected))));
      var actualDigits = String(Math.abs(Math.trunc(Number(actual))));
      var len = Math.max(expectedDigits.length, actualDigits.length);
      expectedDigits = expectedDigits.padStart(len, ' ');
      actualDigits = actualDigits.padStart(len, ' ');
      var correct = 0;
      for (var i = 0; i < len; i++) {
        if (expectedDigits[i] !== ' ' && expectedDigits[i] === actualDigits[i]) correct++;
      }
      return correct;
    }
    // END COPY
    var typed = String(response == null ? '' : response);
    var valid = /^-?[0-9]+$/.test(typed) && Number.isSafeInteger(Number(typed));
    var expected = Number(answer);
    return { correct: valid && Number(typed) === expected, digitsCorrect: valid ? countCorrectDigits(expected, Number(typed)) : 0,
      digitsPossible: Math.max(1, String(Math.abs(expected)).length) };
  },
};
