// Check adapter: Missing Number (an equation with one blank; type the number).
// App source of truth (student_analytics_module.js, the Assessment Center):
//   the Missing Number runner (~9646-9800): the form's display string, e.g.
//   "__ + 8 = 14", with the typed answer shown in the blank; correct =
//   parseInt(typed) === problem.answer; one try, no feedback; a Skip button;
//   120 seconds; the result is the count of correct answers.
//   Forms: MISSING_NUMBER_PROBES in psychometric_math_probes.json. They are
//   missing-addend equations; the title is the app's own name for the measure.
module.exports = {
  id: 'missing_number',
  title: 'Missing Number',
  labels: {
    missing_number_directions: 'Type the missing number.',
    missing_number_question: 'What number is missing?',
    missing_number_blank: 'blank',
    missing_number_label: '{problem}. Type the missing number.',
  },
  // p: { display: "__ + 8 = 14", answer: 6 } as in the form bank.
  prepare: function (p) {
    p = p || {};
    var display = String(p.display == null ? '' : p.display).replace(/\s+/g, ' ').trim();
    if (!display || display.length > 40 || (display.match(/_{2,}/g) || []).length !== 1) return { missing: ['a problem with one blank written as __'] };
    if (p.answer == null || p.answer === '' || !Number.isSafeInteger(Number(p.answer)) || Math.abs(Number(p.answer)) > 99999999) return { missing: ['a whole-number answer'] };
    return { item: { word: display, display: display, answer: String(Number(p.answer)) } };
  },
  render: function (item, ctx) {
    // The blank shows what is being typed.
    var blank = ctx.el('span', { class: 'blank', text: '?' });
    var pieces = String(item.display).split(/(_{2,})/).filter(function (part) { return part !== ''; }).map(function (part) { return /^_{2,}$/.test(part) ? blank : part; });
    var pad = ctx.keypad({
      label: ctx.fmt(ctx.L.missing_number_label, { problem: String(item.display).replace(/_{2,}/, ctx.L.missing_number_blank) }),
      onChange: function (value) { blank.textContent = value || '?'; },
      onNext: function (value) { ctx.answer(value); },
    });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'text-align:center', text: ctx.L.missing_number_question }));
    ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true' }, pieces));
    ctx.root.appendChild(pad.node);
    pad.focus();
    return {
      // Practice items only: lock the keys and show the number in the blank.
      reveal: function (answer) { pad.lock(); if (answer != null) blank.textContent = String(answer); },
    };
  },
  score: function (item, answer, response) {
    var typed = String(response == null ? '' : response);
    return { correct: /^-?[0-9]+$/.test(typed) && Number(typed) === Number(answer), digitsCorrect: null, digitsPossible: null };
  },
};
