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
  },
  // p: { a, b, op } with op add, sub, mul or div (the answer is worked out
  // here; a given answer that disagrees is refused), or { display, answer }.
  // A division must be exact unless p.allowRemainder is true; then the answer
  // is the whole-number part.
  prepare: function (p) {
    p = p || {};
    var whole = function (v) { return v != null && v !== '' && Number.isSafeInteger(Number(v)) && Math.abs(Number(v)) <= 99999999; };
    if (p.a == null && p.b == null && p.display != null) {
      var display = String(p.display).replace(/\s+/g, ' ').trim();
      if (!display || display.length > 40) return { missing: ['a problem of 1 to 40 characters'] };
      if (!whole(p.answer)) return { missing: ['a whole-number answer'] };
      return { item: { word: display, display: display, answer: String(Number(p.answer)) } };
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
    return { item: { word: a + ' ' + symbol + ' ' + b, a: a, b: b, symbol: symbol, answer: String(answer) } };
  },
  render: function (item, ctx) {
    var problem = item.display || (item.a + ' ' + item.symbol + ' ' + item.b);
    var pad = ctx.keypad({ label: ctx.fmt(ctx.L.math_computation_label, { problem: problem }), onNext: function (value) { ctx.answer(value); } });
    ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true', text: item.display ? problem : problem + ' =' }));
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
