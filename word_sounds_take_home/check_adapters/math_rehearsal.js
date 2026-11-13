// Practice adapter: math facts by rehearsal with known facts (math_rehearsal), modelled on
// incremental rehearsal. A PRACTICE activity with feedback and more than one try, not a check. It
// sits with the check adapters because those are the ones the app's Word Sounds take-home dialog
// never lists; buildHtml runs it as practice (lesson.mode is not 'probe').
// The plan of cards (a few new facts folded in among facts the learner knows) is made by
// packet_math_practice_builder.js (planMathPractice); this file draws one card. A card of a new
// fact that is shown for the first time starts with the fact and its answer (study); every other
// card asks at once. A wrong answer is shown with its answer and typed while looking, then covered
// and asked again from memory on the same card. Each answer from memory is one try
// (item.maxAttempts = 3), and each time the answer is typed while looking counts as the support
// "copied".
// render() is the same code as math_ccc.js render() apart from the label prefix
// (tests/packets_math_practice.test.js compares them).
module.exports = {
  id: 'math_rehearsal',
  title: 'Fact rehearsal',
  labels: {
    math_rehearsal_intro: 'Type the answer to each math fact. Most are facts you know. When a new fact comes, look at it first.',
    math_rehearsal_look: 'A new fact. Look at it and its answer. Say it to yourself.',
    math_rehearsal_cover: 'Cover it',
    math_rehearsal_type: 'Type the answer.',
    math_rehearsal_label: '{fact}. Type the answer.',
    math_rehearsal_done: 'Done',
    math_rehearsal_keys: 'Number keys',
    math_rehearsal_delete: 'Delete',
    math_rehearsal_correct: 'Yes! {fact} = {answer}.',
    math_rehearsal_retry: 'Not quite. You typed {typed}. Look: {fact} = {answer}. Type it while you look.',
    math_rehearsal_copy: 'Type it while you look.',
    math_rehearsal_copy_label: '{fact} = {answer}. Type {answer}.',
    math_rehearsal_copy_wrong: 'Type {answer}, the number you see.',
    math_rehearsal_again: 'Now it is covered. Type it from memory.',
    math_rehearsal_missed: 'Here is the answer: {fact} = {answer}.',
  },
  // p: a fact as math_computation.js prepare() writes it ({ word: '7 × 8', answer: '56' }), with
  // role 'new' or 'known' and study: true on the first card of a new fact.
  prepare: function (p) {
    p = p || {};
    var fact = String(p.word == null ? '' : p.word).replace(/\s+/g, ' ').trim();
    if (!fact || fact.length > 40 || fact.indexOf('=') >= 0) return { missing: ['a fact of 1 to 40 characters, with no = sign'] };
    if (p.answer == null || p.answer === '' || typeof p.answer === 'boolean' || !Number.isSafeInteger(Number(p.answer)) || Number(p.answer) < 0 || Number(p.answer) > 99999999) {
      return { missing: ['a whole-number answer of 0 or more'] };
    }
    if (p.role !== 'new' && p.role !== 'known') return { missing: ['a role: new or known'] };
    if (p.study === true && p.role !== 'new') return { missing: ['a known fact that is asked, not shown first'] };
    var answer = String(Number(p.answer));
    return { item: { word: fact, answer: answer, target: answer, role: p.role, study: p.study === true, maxAttempts: 3 } };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var fact = String(item.word);
    var answer = String(item.answer);
    var win = ctx.root.ownerDocument.defaultView;
    var touch = false;
    try { touch = !!win.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (_) {}
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
      set('');
      draw();
      focusPad();
    } } }, [L.math_rehearsal_cover]);
    // The number pad: digits, delete and Done. The answer box takes a hardware keyboard too; on a
    // touch screen it has inputmode="none" so the system keyboard stays away.
    var input = ctx.el('input', { type: 'text', inputmode: touch ? 'none' : 'numeric', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'data-pad-input': '',
      style: 'display:block;margin:0 auto;max-width:200px;text-align:center;font-size:1.8rem;font-weight:700' });
    var checkButton = ctx.el('button', { type: 'button', class: 'primary', 'data-key': 'next', 'aria-disabled': 'true', style: 'grid-column:1/-1;min-height:56px;font-size:1.3rem;font-weight:700',
      on: { click: function () { press('next'); } } }, [L.math_rehearsal_done]);
    var set = function (raw) {
      var v = String(raw == null ? '' : raw).replace(/[^0-9]/g, '').slice(0, 8);
      if (input.value !== v) input.value = v;
      checkButton.setAttribute('aria-disabled', v ? 'false' : 'true');
      if (phase === 'type') slot.textContent = v || '?';
    };
    var press = function (key) {
      if (phase !== 'type' && phase !== 'copy') return;
      var v = String(input.value || '');
      if (key === 'back') set(v.slice(0, -1));
      else if (key === 'next') submit();
      else if (/^[0-9]$/.test(key)) set(v + key);
    };
    // A key pressed with a mouse or a finger leaves the focus in the answer box, so Enter then sends the answer
    // instead of pressing that key again. A key reached with Tab is still pressed with Enter.
    var keyButton = function (label, key, name) {
      return ctx.el('button', { type: 'button', 'data-key': key, 'aria-label': name || false, style: 'min-height:56px;font-size:1.5rem;font-weight:700;padding:6px',
        on: { mousedown: function (e) { e.preventDefault(); focusPad(); }, click: function () { press(key); } } }, [label]);
    };
    var keys = ctx.el('div', { role: 'group', 'aria-label': L.math_rehearsal_keys, style: 'display:grid;grid-template-columns:repeat(3,minmax(64px,96px));gap:10px;justify-content:center;margin:16px auto 0' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (d) { return keyButton(d, d); })
        .concat([ctx.el('span', {}), keyButton('0', '0'), keyButton(String.fromCharCode(0x2190), 'back', L.math_rehearsal_delete), checkButton]));
    var pad = ctx.el('div', { 'data-pad': '' }, [input, keys]);
    input.addEventListener('input', function () { set(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); press('next'); } });
    // A digit or Backspace typed while a key of the pad has the focus goes to the answer too.
    keys.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = String(e.key || '');
      if (/^[0-9]$/.test(k)) { e.preventDefault(); press(k); } else if (k === 'Backspace') { e.preventDefault(); press('back'); }
    });
    var focusPad = function () { try { input.focus(); } catch (_) {} };
    var draw = function () {
      var shown = phase !== 'type';
      slot.textContent = shown ? answer : (input.value || '?');
      slot.style.borderStyle = shown ? 'solid' : 'dashed';
      slot.style.borderColor = phase === 'look' ? 'var(--accent)' : phase === 'copy' ? 'var(--warn)' : phase === 'done' ? (outcome ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
      slot.style.background = phase === 'type' ? 'var(--line)' : phase === 'copy' ? 'var(--warn-bg)' : phase === 'done' ? (outcome ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
      // While the answer is covered the box below says what to do; the covered line is not read twice.
      if (phase === 'type') prompt.setAttribute('aria-hidden', 'true'); else prompt.removeAttribute('aria-hidden');
      coverButton.hidden = phase !== 'look';
      pad.hidden = phase === 'look' || phase === 'done';
      say.textContent = phase === 'look' ? L.math_rehearsal_look : phase === 'copy' ? L.math_rehearsal_copy
        : phase === 'type' ? (ctx.attempts() > 0 ? L.math_rehearsal_again : L.math_rehearsal_type) : '';
      input.setAttribute('aria-label', phase === 'copy' ? ctx.fmt(L.math_rehearsal_copy_label, { fact: fact, answer: answer }) : ctx.fmt(L.math_rehearsal_label, { fact: fact }));
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
          focusPad();
          ctx.announce(L.math_rehearsal_again);
        } else {
          set('');
          say.textContent = ctx.fmt(L.math_rehearsal_copy_wrong, { answer: answer });
          ctx.announce(say.textContent);
        }
        return;
      }
      if (phase !== 'type') return;
      var right = Number(v) === Number(answer);
      var result = ctx.answer(v, right, {
        correctText: ctx.fmt(L.math_rehearsal_correct, { fact: fact, answer: answer }),
        retryText: ctx.fmt(L.math_rehearsal_retry, { typed: v, fact: fact, answer: answer }),
        missedText: ctx.fmt(L.math_rehearsal_missed, { fact: fact, answer: answer }),
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
    ctx.root.appendChild(pad);
    if (phase === 'look') { try { coverButton.focus(); } catch (_) {} } else focusPad();
    return {
      // The card is over (right, or every try used, or reopened when done): the answer shows, uncovered.
      reveal: function (correct) {
        phase = 'done';
        outcome = correct === true;
        input.setAttribute('readonly', '');
        checkButton.setAttribute('aria-disabled', 'true');
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
