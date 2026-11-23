// Practice adapter: math facts by cover, copy, compare (math_ccc). A PRACTICE activity with
// feedback and more than one try, not a check. It sits with the check adapters because those are
// the ones the app's Word Sounds take-home dialog never lists; buildHtml runs it as practice
// (lesson.mode is not 'probe'). Made by packet_math_practice_builder.js.
// One card: the learner looks at the fact and its answer (7 × 8 = 56) and presses Cover it; the
// answer is covered and typed from memory on the number pad; then it is uncovered and compared.
// A wrong answer shows the fact again and is typed while looking, then it is covered and asked once
// more from memory. Each answer from memory is one try (item.maxAttempts = 3); a right one ends the
// card, so "first try" is right from memory at the first go. Each time the answer is typed while
// looking counts as the support "copied".
// render() is the same code as math_rehearsal.js render() apart from the label prefix
// (tests/packets_math_practice.test.js compares them). The fact is written by math_computation.js
// prepare(), so a fact reads the same here and in a check.
module.exports = {
  id: 'math_ccc',
  title: 'Cover, copy, compare',
  labels: {
    math_ccc_intro: 'Look at each math fact and its answer. Cover it, type the answer from memory, then see if it matches.',
    math_ccc_look: 'Look at the fact and its answer. Say it to yourself.',
    math_ccc_cover: 'Cover it',
    math_ccc_type: 'Type the answer from memory.',
    math_ccc_label: '{fact}. Type the answer.',
    math_ccc_done: 'Done',
    math_ccc_keys: 'Number keys',
    math_ccc_delete: 'Delete',
    math_ccc_correct: 'Yes! {fact} = {answer}.',
    math_ccc_retry: 'Not quite. You typed {typed}. Look: {fact} = {answer}. Type it while you look.',
    math_ccc_copy: 'Type it while you look.',
    math_ccc_copy_label: '{fact} = {answer}. Type {answer}.',
    math_ccc_copy_wrong: 'Type {answer}, the number you see.',
    math_ccc_again: 'Now it is covered. Type it from memory.',
    math_ccc_missed: 'Here is the answer: {fact} = {answer}.',
  },
  // p: a fact as math_computation.js prepare() writes it ({ word: '7 × 8', answer: '56' }). Every
  // card of this activity starts with the fact and its answer shown.
  prepare: function (p) {
    p = p || {};
    var fact = String(p.word == null ? '' : p.word).replace(/\s+/g, ' ').trim();
    if (!fact || fact.length > 40 || fact.indexOf('=') >= 0) return { missing: ['a fact of 1 to 40 characters, with no = sign'] };
    if (p.answer == null || p.answer === '' || typeof p.answer === 'boolean' || !Number.isSafeInteger(Number(p.answer)) || Number(p.answer) < 0 || Number(p.answer) > 99999999) {
      return { missing: ['a whole-number answer of 0 or more'] };
    }
    var answer = String(Number(p.answer));
    return { item: { word: fact, answer: answer, target: answer, study: true, maxAttempts: 3 } };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var fact = String(item.word);
    var answer = String(item.answer);
    var tag = String(item.id || 'fact').replace(/[^a-z0-9-]/gi, '');
    // look: the fact and its answer. type: covered, typed from memory. copy: after a miss, the
    // answer shows and is typed while looking. done: the card is over.
    var phase = item.study ? 'look' : 'type';
    var copyMisses = 0;
    var outcome = false;
    var slot = ctx.el('span', { 'data-slot': '', style: 'display:inline-block;min-width:2.2em;padding:0 .25em;border:3px solid var(--line);border-radius:12px;text-align:center' });
    var prompt = ctx.el('p', { id: tag + '-fact', 'data-fact': '', style: 'font-size:2.2rem;font-size:clamp(1.8rem,9vw,2.6rem);font-weight:700;text-align:center;margin:8px 0 12px;font-variant-numeric:tabular-nums' }, [fact + ' = ', slot]);
    var say = ctx.el('p', { id: tag + '-say', 'data-say': '', style: 'text-align:center;font-weight:600;margin:0 0 8px' });
    var coverButton = ctx.el('button', { type: 'button', class: 'primary', 'data-cover': '', 'aria-describedby': tag + '-fact ' + tag + '-say', on: { click: function () {
      if (phase !== 'look' || ctx.isDone()) return;
      phase = 'type';
      // The recall is timed from here to the first answer from memory.
      if (ctx.lap) ctx.lap('recall', true);
      set('');
      draw();
      focusPad();
    } } }, [L.math_ccc_cover]);
    var pad = ctx.keypad({
      minus: false, inline: true, padAttr: true,
      keysLabel: L.math_ccc_keys, deleteLabel: L.math_ccc_delete, nextLabel: L.math_ccc_done,
      canPress: function () { return phase === 'type' || phase === 'copy'; },
      onChange: function (v) { if (phase === 'type') slot.textContent = v || '?'; },
      onNext: function () { submit(); },
    });
    var input = pad.input;
    var set = pad.set;
    var focusPad = pad.focus;
    var draw = function () {
      var shown = phase !== 'type';
      slot.textContent = shown ? answer : (input.value || '?');
      slot.style.borderStyle = shown ? 'solid' : 'dashed';
      slot.style.borderColor = phase === 'look' ? 'var(--accent)' : phase === 'copy' ? 'var(--warn)' : phase === 'done' ? (outcome ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
      slot.style.background = phase === 'type' ? 'var(--soft)' : phase === 'copy' ? 'var(--warn-bg)' : phase === 'done' ? (outcome ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
      // Keep the visible problem readable to screen readers in every phase (only hidden when not rendered).
      prompt.removeAttribute('aria-hidden');
      coverButton.hidden = phase !== 'look';
      pad.node.hidden = phase === 'look' || phase === 'done';
      say.textContent = phase === 'look' ? L.math_ccc_look : phase === 'copy' ? L.math_ccc_copy
        : phase === 'type' ? (ctx.attempts() > 0 ? L.math_ccc_again : L.math_ccc_type) : '';
      input.setAttribute('aria-label', phase === 'copy' ? ctx.fmt(L.math_ccc_copy_label, { fact: fact, answer: answer }) : ctx.fmt(L.math_ccc_label, { fact: fact }));
    };
    var submit = function () {
      if (ctx.isDone()) return;
      var v = String(input.value || '');
      if (!/^[0-9]+$/.test(v)) return;
      if (phase === 'copy') {
        var copied = Number(v) === Number(answer);
        if (copied) ctx.support('copied');
        // Typed while looking: then covered and asked from memory. Three wrong copies go on to that too.
        if (copied || ++copyMisses >= 3) {
          phase = 'type';
          set('');
          draw();
          // The answer is covered again: the feedback line that showed it is cleared too.
          if (typeof ctx.feedback === 'function') ctx.feedback('');
          focusPad();
          ctx.announce(L.math_ccc_again);
        } else {
          set('');
          say.textContent = ctx.fmt(L.math_ccc_copy_wrong, { answer: answer });
          ctx.announce(say.textContent);
        }
        return;
      }
      if (phase !== 'type') return;
      if (ctx.lap && ctx.attempts() === 0) ctx.lap('recall');
      var right = Number(v) === Number(answer);
      var result = ctx.answer(v, right, {
        correctText: ctx.fmt(L.math_ccc_correct, { fact: fact, answer: answer }),
        retryText: ctx.fmt(L.math_ccc_retry, { typed: v, fact: fact, answer: answer }),
        missedText: ctx.fmt(L.math_ccc_missed, { fact: fact, answer: answer }),
      });
      if (result === 'retry') {
        phase = 'copy';
        copyMisses = 0;
        set('');
        draw();
        focusPad();
      }
    };
    set('');
    draw();
    ctx.root.appendChild(prompt);
    ctx.root.appendChild(say);
    ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [coverButton]));
    ctx.root.appendChild(pad.node);
    // A card that starts covered (a known fact) is timed from being shown.
    if (phase === 'look') { if (!ctx.noFocus) { try { coverButton.focus(); } catch (_) {} } } else { if (ctx.lap && !ctx.isDone()) ctx.lap('recall', true); if (!ctx.noFocus) focusPad(); }
    return {
      // The card is over (right, or every try used, or reopened when done): the answer shows, uncovered.
      reveal: function (correct) {
        phase = 'done';
        outcome = correct === true;
        pad.lock();
        draw();
      },
    };
  },
  // The same rule as render(): the whole number typed is the answer. Only a check would call it.
  score: function (item, answer, response) {
    var typed = String(response == null ? '' : response);
    return { correct: /^[0-9]+$/.test(typed) && Number(typed) === Number(answer), digitsCorrect: null, digitsPossible: null };
  },
};
