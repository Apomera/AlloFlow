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
    missing_number_minus: 'minus',
    missing_number_times: 'times',
    missing_number_divided: 'divided by',
  },
  // p: { display: "__ + 8 = 14", answer: 6 } as in the form bank.
  // 2026-11-13: item.shown, when it differs from the form's text, is what the
  // screen shows: the signs as Math Fluency shows them (the minus sign, times,
  // divide, never a hyphen or an x), and a number of 10000 or more grouped in
  // threes with a narrow no-break space (as math_computation.js and the paper
  // copy). A screen reader hears the signs as words (the labels minus, times,
  // divided). The problem stays on one line (a long one gets a smaller size).
  prepare: function (p) {
    p = p || {};
    var display = String(p.display == null ? '' : p.display).replace(/\s+/g, ' ').trim();
    if (!display || display.length > 40 || (display.match(/_{2,}/g) || []).length !== 1) return { missing: ['a problem with one blank written as __'] };
    if (p.answer == null || p.answer === '' || !Number.isSafeInteger(Number(p.answer)) || Math.abs(Number(p.answer)) > 99999999) return { missing: ['a whole-number answer'] };
    var item = { word: display, display: display, answer: String(Number(p.answer)) };
    var shown = display.replace(/(^|\s)-(?=\s|\d)/g, function (all, lead) { return lead + String.fromCharCode(0x2212); })
      .replace(/([\d_]) [xX*] (?=[\d_])/g, function (all, lead) { return lead + ' ' + String.fromCharCode(0xD7) + ' '; }).replace(/([\d_]) \/ (?=[\d_])/g, function (all, lead) { return lead + ' ' + String.fromCharCode(0xF7) + ' '; })
      .replace(/\d{5,}/g, function (n) { return n.replace(/\B(?=(\d{3})+(?!\d))/g, String.fromCharCode(0x202F)); });
    if (shown !== display) item.shown = shown;
    return { item: item };
  },
  render: function (item, ctx) {
    var L = ctx.L, shown = item.shown || item.display, n = shown.length + 2;
    var said = shown.split(String.fromCharCode(0x202F)).join('').replace(/_{2,}/, L.missing_number_blank).split(String.fromCharCode(0x2212)).join(L.missing_number_minus + ' ')
      .split(String.fromCharCode(0xD7)).join(L.missing_number_times).split(String.fromCharCode(0xF7)).join(L.missing_number_divided).replace(/\s+/g, ' ');
    // The blank shows what is being typed.
    var blank = ctx.el('span', { class: 'blank', text: '?' });
    var pieces = shown.split(/(_{2,})/).filter(function (part) { return part !== ''; }).map(function (part) { return /^_{2,}$/.test(part) ? blank : part; });
    var pad = ctx.keypad({
      label: ctx.fmt(L.missing_number_label, { problem: said }),
      onChange: function (value) { blank.textContent = value || '?'; },
      onNext: function (value) { ctx.answer(value); },
    });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', style: 'text-align:center', text: L.missing_number_question }));
    ctx.root.appendChild(ctx.el('p', { class: 'prompt', 'aria-hidden': 'true', style: 'white-space:nowrap;font-size:min(2.6rem,' + (137 / n | 0) + 'vw,' + (1130 / n | 0) + 'px)' }, pieces));
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
