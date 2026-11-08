// Take-home adapter: Spelling Bee (spelling_bee).
// App source of truth:
//   board   compileActivityItems (word_sounds_setup_source.jsx:4810): { answer: word }.
//   view    case "spelling_bee" (word_sounds_module.js:19690-19873): "Hear the word",
//           "Slow" (playbackRate 0.5, playSpellingWord :18817), one box per letter
//           showing what was typed, a text box (maxLength = word length), Check
//           Spelling, "First letter hint" and "Show Vowels" / "Show More" hints that
//           edit the answer and are recorded as supports (recordSpellingSupport
//           :18870). The word is never printed (SMART_TEXT_VISIBILITY 'hidden', :7567).
//           After a try, each box is marked right/wrong and "{count}/{total} letters
//           correct" shows (:19691-19704, :19788-19794).
//   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased typed
//           spelling === trimmed, lowercased word; the same unchanged spelling is not
//           graded twice; checkAnswer("correct"|"incorrect","correct"). Default budget
//           2 tries (:17130). A first miss keeps the spelling to fix.
//   audio   inst_spelling_bee then the word (INST_KEY_MAP :16448, :16989-16995).
module.exports = {
  id: 'spelling_bee',
  title: 'Spelling Bee',
  labels: {
    spelling_bee_question: 'Listen to the word, then type it.',
    spelling_bee_input: 'Type the word',
    spelling_bee_slow: 'Hear it slowly',
    spelling_bee_check: 'Check Spelling',
    spelling_bee_first_letter: 'First letter hint',
    spelling_bee_hint_vowels: 'Show Vowels',
    spelling_bee_hint_more: 'Show More',
    spelling_bee_letters_correct: '{count}/{total} letters correct',
    spelling_bee_empty: 'Type the word first.',
    spelling_bee_same: 'Change your spelling, then check it again.',
    spelling_bee_hint_used: 'Hint used. Your spelling is now {answer}.',
    spelling_bee_correct: 'Yes! That is how to spell {word}.',
    spelling_bee_missed: 'This is how to spell it: {word}. Listen.',
    spelling_bee_answer: 'The word is spelled: {word}',
    spelling_bee_letter_keys: 'Letter keys',
    spelling_bee_delete: 'Delete the last letter',
  },
  prepare: function (w, env) {
    var word = String(env.word || '').trim();
    if (!word) return { missing: ['word'] };
    var missing = [];
    var wordAudio = env.wordClip(word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'inst_spelling_bee');
    if (!prompt) missing.push('question');
    if (missing.length) return { missing: missing };
    return { item: { target: word.toLowerCase(), wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var win = ctx.root.ownerDocument.defaultView;
    var word = String(item.target);
    var lastSubmitted = null;
    var inputId = 'bee-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
    var input = ctx.el('input', { id: inputId, type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
      inputmode: 'text', maxlength: String(word.length || 20),
      style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-align:center', on: {
        input: function () { lastSubmitted = null; draw(); },
        keydown: function (e) {
          if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          submit();
        },
      } });
    var value = function () { return String(input.value || ''); };
    // One box per letter (aria-hidden: the count line below carries the result).
    var boxes = word.split('').map(function () {
      return ctx.el('span', { class: 'slot', style: 'min-width:48px;min-height:56px;text-transform:uppercase' });
    });
    var boxRow = ctx.el('div', { class: 'slots', 'aria-hidden': 'true' }, boxes);
    var countLine = ctx.el('p', { hidden: true });
    var draw = function () {
      var typed = value();
      var shown = ctx.attempts() > 0;
      var right = 0;
      boxes.forEach(function (box, i) {
        var ch = typed[i] || '';
        var ok = shown && ch && ch.toLowerCase() === word[i];
        if (ok) right++;
        box.textContent = ch ? ch.toUpperCase() : '_';
        box.style.borderStyle = ch ? 'solid' : 'dashed';
        box.style.borderColor = shown && ch ? (ok ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
        box.style.background = shown && ch ? (ok ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
      });
      countLine.hidden = !(shown && typed);
      countLine.textContent = ctx.fmt(L.spelling_bee_letters_correct, { count: right, total: word.length });
      moreBtn.textContent = typed.indexOf('_') >= 0 ? L.spelling_bee_hint_more : L.spelling_bee_hint_vowels;
    };
    var edit = function (next, clue) {
      if (ctx.isDone()) return;
      if (!next || next === value()) return;
      ctx.support(clue);
      input.value = next;
      lastSubmitted = null;
      draw();
      ctx.announce(ctx.fmt(L.spelling_bee_hint_used, { answer: next.toUpperCase().split('').join(' ') }));
    };
    var submit = function () {
      if (ctx.isDone()) return;
      var answer = value().trim().toLowerCase();
      if (!answer) { ctx.announce(L.spelling_bee_empty); return; }
      if (answer === lastSubmitted) { ctx.announce(L.spelling_bee_same); return; }
      lastSubmitted = answer;
      ctx.answer(answer, answer === word.trim().toLowerCase(), {
        correctText: ctx.fmt(L.spelling_bee_correct, { word: word }),
        missedText: ctx.fmt(L.spelling_bee_missed, { word: word }),
      });
      // A first miss keeps the spelling; the boxes now mark each letter.
      draw();
    };
    // "Slow" plays the same recording at half speed, as playSpellingWord(0.5) does.
    var playSlow = function () { ctx.play(item.wordAudio, 0.5); };
    var firstBtn = ctx.el('button', { type: 'button', on: { click: function () {
      edit((word[0] || '') + value().slice(1), 'spelling_first_letter');
    } }, text: L.spelling_bee_first_letter });
    // "Show Vowels", then "Show More" one letter at a time (:19846-19863).
    var moreBtn = ctx.el('button', { type: 'button', on: { click: function () {
      var current = value().toLowerCase();
      var letters = word.split('');
      var isVowel = function (ch) { return 'aeiou'.indexOf(ch.toLowerCase()) >= 0; };
      var vowelsShown = letters.every(function (ch, i) { return !isVowel(ch) || current[i] === ch.toLowerCase(); });
      var filled = letters.map(function (ch, i) { return isVowel(ch) || current[i] === ch.toLowerCase() ? ch : '_'; });
      if (vowelsShown) { var nextBlank = filled.indexOf('_'); if (nextBlank >= 0) filled[nextBlank] = letters[nextBlank]; }
      edit(filled.join(''), vowelsShown ? 'spelling_more_letters' : 'spelling_vowels');
    } }, text: L.spelling_bee_hint_vowels });
    var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: submit }, text: L.spelling_bee_check });
    var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.spelling_bee_answer, { word: word }) });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.spelling_bee_question }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
      ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('slowReplays'); playSlow(); } }, text: L.spelling_bee_slow }),
    ]));
    ctx.root.appendChild(boxRow);
    ctx.root.appendChild(countLine);
    ctx.root.appendChild(ctx.el('label', { for: inputId, text: L.spelling_bee_input }));
    ctx.root.appendChild(input);
    // On-screen letters for students without a keyboard (2026-11-07 parity audit). Typing still works.
    var letterKeys = 'abcdefghijklmnopqrstuvwxyz'.split('').map(function (ch) {
      return ctx.el('button', { type: 'button', style: 'min-width:44px;min-height:44px;font-weight:700', on: { click: function () {
        if (ctx.isDone() || value().length >= (word.length || 20)) return;
        input.value = value() + ch; lastSubmitted = null; draw();
      } } }, [ch]);
    });
    var deleteKey = ctx.el('button', { type: 'button', 'aria-label': L.spelling_bee_delete, style: 'min-width:44px;min-height:44px', on: { click: function () {
      if (ctx.isDone() || !value()) return;
      input.value = value().slice(0, -1); lastSubmitted = null; draw();
    } } }, ['⌫']);
    ctx.root.appendChild(ctx.el('div', { class: 'row', role: 'group', 'aria-label': L.spelling_bee_letter_keys, style: 'flex-wrap:wrap;gap:4px;margin-top:8px' }, letterKeys.concat([deleteKey])));
    ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:12px' }, [checkBtn, firstBtn, moreBtn]));
    ctx.root.appendChild(answerLine);
    draw();
    return {
      reveal: function () {
        input.setAttribute('readonly', '');
        input.setAttribute('aria-readonly', 'true');
        [checkBtn, firstBtn, moreBtn, deleteKey].concat(letterKeys).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
        answerLine.hidden = false;
      },
    };
  },
};
