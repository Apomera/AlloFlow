// Take-home adapter: Missing Letter (missing_letter).
// App source of truth (word_sounds_module.js):
//   board       preparedMissingLetter (~8221): the pack board is used only as a
//               whole and only when hiddenIndex is inside the displayed word, the
//               word holds correctLetter there, and the choices offer it exactly
//               once (all lowercased). Otherwise the app derives its own board;
//               this export requires the prepared board instead (see report).
//   view        case "missing_letter" (~20028): the word's letters (uppercase),
//               the hidden one shown as "?" or the chosen letter; letter buttons
//               only SELECT; "Check Answer" submits; "Show word" reveals the word.
//   grading     submitConstructionAnswer (~18887): trimmed, lowercased equality
//               with correctLetter; the same unchanged answer is not resubmitted.
//               checkAnswer default budget: 2 presentations (1 retry).
//   audio       inst_missing_letter bank clip (INST_KEY_MAP ~16446); "Hear the word".
module.exports = {
  id: 'missing_letter',
  title: 'Missing Letter',
  labels: {
    missing_letter_question: 'Fill in the missing letter.',
    missing_letter_word_sr: 'The word: {letters}.',
    missing_letter_blank: 'missing letter',
    missing_letter_choices: 'Letters to choose from',
    missing_letter_choose: 'Letter {letter}',
    missing_letter_check: 'Check answer',
    missing_letter_pick_first: 'Choose a letter first.',
    missing_letter_show_word: 'Show word',
    missing_letter_hide_word: 'Hide word',
    missing_letter_word_is: 'The word is {word}.',
    missing_letter_correct: 'Yes! The missing letter is {letter}.',
    missing_letter_missed: 'The missing letter is {letter}. Listen to the word.',
  },
  prepare: function (w, env) {
    var board = w.activityItems && w.activityItems.missing_letter;
    var word = String(env.word || '').toLowerCase();
    if (!board) return { missing: ['board'] };
    // Same usability rule as the app's preparedMissingLetter.
    var letter = String(board.correctLetter == null ? '' : board.correctLetter).toLowerCase();
    var choices = Array.isArray(board.options) ? board.options.map(function (o) { return typeof o === 'string' ? o.toLowerCase() : ''; }) : [];
    var usable = Number.isInteger(board.hiddenIndex) && board.hiddenIndex >= 0 && board.hiddenIndex < word.length &&
      !!letter && word[board.hiddenIndex] === letter && choices.length >= 2 && choices.every(Boolean) &&
      choices.filter(function (c, i) { return choices.indexOf(c) === i; }).length === choices.length && choices.indexOf(letter) >= 0;
    if (!usable) return { missing: ['board'] };
    var missing = [];
    var wordAudio = env.wordClip(env.word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'inst_missing_letter');
    if (!prompt) missing.push('question');
    if (missing.length) return { missing: missing };
    var letters = word.split('');
    letters[board.hiddenIndex] = '';
    return { item: { letters: letters, hiddenIndex: board.hiddenIndex, options: choices, target: letter,
      wordAudio: wordAudio, promptAudio: prompt, introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
  },
  render: function (item, ctx) {
    var selected = '';
    var shownOnce = false;
    var wordText = item.letters.map(function (l, i) { return i === item.hiddenIndex ? item.target : l; }).join('');
    var slots = item.letters.map(function (l, i) {
      return ctx.el('li', { class: 'slot', style: i === item.hiddenIndex ? 'border-style:dashed;border-color:var(--accent)' : 'border-style:solid' },
        [i === item.hiddenIndex ? '?' : l.toUpperCase()]);
    });
    var srWord = ctx.el('p', { class: 'sr' });
    var updateWord = function (letter) {
      slots[item.hiddenIndex].textContent = letter ? letter.toUpperCase() : '?';
      srWord.textContent = ctx.fmt(ctx.L.missing_letter_word_sr, { letters: item.letters.map(function (l, i) {
        return i === item.hiddenIndex ? (letter ? letter.toUpperCase() : ctx.L.missing_letter_blank) : l.toUpperCase();
      }).join(', ') });
    };
    var shownWord = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(ctx.L.missing_letter_word_is, { word: wordText }) });
    var showButton = ctx.el('button', { type: 'button', 'aria-pressed': 'false', on: { click: function () {
      if (ctx.isDone()) return;
      var on = shownWord.hidden;
      shownWord.hidden = !on;
      showButton.setAttribute('aria-pressed', on ? 'true' : 'false');
      showButton.textContent = on ? ctx.L.missing_letter_hide_word : ctx.L.missing_letter_show_word;
      // The app records this support once per item.
      if (on && !shownOnce) { shownOnce = true; ctx.support('wordShown'); }
    } }, text: ctx.L.missing_letter_show_word });
    var cards = [];
    var check = ctx.el('button', { type: 'button', class: 'primary', 'aria-disabled': 'true', on: { click: function () {
      if (ctx.isDone() || check.getAttribute('aria-disabled') === 'true') { if (!ctx.isDone() && !selected) ctx.announce(ctx.L.missing_letter_pick_first); return; }
      var answer = selected;
      var outcome = ctx.answer(answer, answer.trim().toLowerCase() === item.target, {
        correctText: ctx.fmt(ctx.L.missing_letter_correct, { letter: item.target.toUpperCase() }),
        missedText: ctx.fmt(ctx.L.missing_letter_missed, { letter: item.target.toUpperCase() }),
      });
      // A retry starts from an empty slot; choosing again counts as a new answer,
      // as an edit does in the app.
      if (outcome === 'retry') select('');
    } }, text: ctx.L.missing_letter_check });
    var select = function (letter) {
      selected = letter;
      cards.forEach(function (c) { c.button.setAttribute('aria-pressed', c.letter === letter ? 'true' : 'false'); });
      check.setAttribute('aria-disabled', letter ? 'false' : 'true');
      updateWord(letter);
    };
    var list = ctx.el('ul', { class: 'row', 'aria-label': ctx.L.missing_letter_choices, style: 'list-style:none;padding:0;margin:16px 0' });
    item.options.forEach(function (letter) {
      var button = ctx.el('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': ctx.fmt(ctx.L.missing_letter_choose, { letter: letter.toUpperCase() }),
        style: 'min-width:64px;min-height:64px;font-size:1.4rem;font-weight:700',
        on: { click: function () { if (!ctx.isDone()) select(letter); } } }, [letter.toUpperCase()]);
      var box = ctx.el('li', { class: 'choice', style: 'padding:6px' }, [button]);
      cards.push({ box: box, button: button, letter: letter });
      list.appendChild(box);
    });
    updateWord('');
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.missing_letter_question }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
      showButton,
    ]));
    ctx.root.appendChild(shownWord);
    ctx.root.appendChild(ctx.el('ul', { class: 'slots', 'aria-hidden': 'true' }, slots));
    ctx.root.appendChild(srWord);
    ctx.root.appendChild(list);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [check]));
    return {
      reveal: function () {
        cards.forEach(function (c) { c.button.setAttribute('aria-disabled', 'true'); if (c.letter === item.target) c.box.classList.add('right'); });
        check.setAttribute('aria-disabled', 'true');
        showButton.setAttribute('aria-disabled', 'true');
        updateWord(item.target);
        shownWord.hidden = false;
      },
    };
  },
};
