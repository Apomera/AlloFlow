// Check adapter: Quantity Discrimination (two numbers; tap the bigger one).
// App source of truth (student_analytics_module.js, the Assessment Center):
//   the QD runner (~9918-10046): "Which number is bigger?", two buttons,
//   correct = the chosen number === problem.answer, one try, no feedback;
//   60 seconds; the result is the count of correct answers.
//   Forms: QUANTITY_DISCRIMINATION_PROBES in psychometric_math_probes.json.
// The title is the app's own name for the measure.
// A check adapter has three halves: prepare (when the file is built), and
// render and score (copied into the file with toString, so they may use only
// their arguments). The answer never reaches render in a scored item.
module.exports = {
  id: 'quantity_discrimination',
  title: 'Quantity Discrimination',
  labels: {
    quantity_discrimination_directions: 'Tap the bigger number.',
    quantity_discrimination_question: 'Which number is bigger?',
    quantity_discrimination_practice_wrong: 'Not quite. The bigger number is {answer}.',
  },
  // p: { left, right } as in the form bank. The answer is worked out here; a
  // form whose own answer disagrees is refused.
  prepare: function (p) {
    p = p || {};
    var whole = function (v) { return v != null && v !== '' && Number.isSafeInteger(Number(v)) && Math.abs(Number(v)) <= 99999999; };
    if (!whole(p.left) || !whole(p.right)) return { missing: ['two whole numbers'] };
    var left = Number(p.left), right = Number(p.right);
    if (left === right) return { missing: ['two different numbers'] };
    var bigger = Math.max(left, right);
    if (p.answer != null && Number(p.answer) !== bigger) return { missing: ['an answer that is the bigger number'] };
    return { item: { word: left + ' or ' + right, left: left, right: right, answer: String(bigger) } };
  },
  render: function (item, ctx) {
    var buttons = [];
    var make = function (value) {
      var b = ctx.el('button', { type: 'button', 'data-choice': String(value), on: { click: function () { ctx.answer(String(value)); } }, text: String(value) });
      buttons.push(b);
      return ctx.el('li', {}, [b]);
    };
    ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'text-align:center', text: ctx.L.quantity_discrimination_question }));
    ctx.root.appendChild(ctx.el('ul', { class: 'pair' }, [make(item.left), make(item.right)]));
    // Keys 1 and 2 pick the first and the second number.
    ctx.keys(function (key) {
      if (key !== '1' && key !== '2') return false;
      ctx.answer(String(key === '1' ? item.left : item.right));
      return true;
    });
    return {
      // Practice items only: lock the two buttons and mark the bigger number.
      reveal: function (answer) {
        buttons.forEach(function (b) {
          b.setAttribute('aria-disabled', 'true');
          if (answer != null && b.getAttribute('data-choice') === String(answer)) b.classList.add('right');
        });
      },
    };
  },
  score: function (item, answer, response) {
    var chosen = String(response == null ? '' : response);
    return { correct: chosen !== '' && chosen === String(answer), digitsCorrect: null, digitsPossible: null };
  },
};
