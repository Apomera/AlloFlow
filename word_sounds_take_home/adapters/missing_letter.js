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
//               An apostrophe, hyphen or space is shown plainly, not in a box
//               (wsSpellFixedChar, b38ca18141), and is never the hidden one.
//   grading     submitConstructionAnswer (~18887): trimmed, lowercased equality
//               with correctLetter; the same unchanged answer is not resubmitted.
//               checkAnswer default budget: 2 presentations (1 retry).
//   audio       inst_missing_letter bank clip (INST_KEY_MAP ~16446); "Hear the word".
// 2026-11-13 (owner): the letters, the choices and the sentence that names the
// word are in the case the word is written (lowercase for a normal word, a name's
// capital kept); the app shows capitals. Fixed characters as in the app.
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
    missing_letter_answer_mark: '(the answer)',
  },
  prepare: function (w, env) {
    var board = w.activityItems && w.activityItems.missing_letter;
    var written = String(env.word || '');
    var word = written.toLowerCase();
    if (!board) return { missing: ['board'] };
    // Same usability rule as the app's preparedMissingLetter.
    var letter = String(board.correctLetter == null ? '' : board.correctLetter).toLowerCase();
    var choices = Array.isArray(board.options) ? board.options.map(function (o) { return typeof o === 'string' ? o.toLowerCase() : ''; }) : [];
    // 2026-11-18: the hidden one is a letter (a letter has a capital), never the ' of "I'm" or the - of "t-shirt":
    // the only non-letter among the choices would be the answer.
    var usable = Number.isInteger(board.hiddenIndex) && board.hiddenIndex >= 0 && board.hiddenIndex < word.length &&
      !!letter && word[board.hiddenIndex] === letter && letter.toLowerCase() !== letter.toUpperCase() && choices.length >= 2 && choices.every(Boolean) &&
      choices.filter(function (c, i) { return choices.indexOf(c) === i; }).length === choices.length && choices.indexOf(letter) >= 0;
    if (!usable) return { missing: ['board'] };
    var missing = [];
    var wordAudio = env.wordClip(env.word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'inst_missing_letter');
    if (!prompt) missing.push('question');
    if (missing.length) return { missing: missing };
    // The letters as the word is written (lowercase if lower-casing changed its length).
    var shown = written.length === word.length ? written : word;
    var letters = shown.split('');
    letters[board.hiddenIndex] = '';
    var item = { letters: letters, hiddenIndex: board.hiddenIndex, options: choices, target: letter,
      wordAudio: wordAudio, promptAudio: prompt, introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
    // The hidden letter is a capital (a name): the choices are shown as capitals too.
    if (shown[board.hiddenIndex] !== letter && shown[board.hiddenIndex] === letter.toUpperCase()) item.capital = true;
    return { item: item };
  },
  render: function (item, ctx) {
    var selected = '';
    var shownOnce = false;
    // An apostrophe, hyphen or space is part of the word, shown as it is, not a letter box.
    var fixed = function (ch) { try { return !new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u').test(String(ch || '')); } catch (_) { return /^['’\- ]$/.test(String(ch || '')); } };
    var cased = function (letter) { return item.capital ? String(letter).toUpperCase() : String(letter); };
    var wordText = item.letters.map(function (l, i) { return i === item.hiddenIndex ? cased(item.target) : l; }).join('');
    var slots = item.letters.map(function (l, i) {
      if (i !== item.hiddenIndex && fixed(l)) return ctx.el('li', { 'data-fixed': '', style: 'display:flex;align-items:center;font-size:1.4rem;font-weight:700' }, [l === ' ' ? ' ' : l]);
      return ctx.el('li', { class: 'slot', style: (i === item.hiddenIndex ? 'border-style:dashed;border-color:var(--accent);' : 'border-style:solid;') + 'min-width:clamp(36px,11vw,56px);min-height:clamp(44px,12vw,60px)' },
        [i === item.hiddenIndex ? '?' : l]);
    });
    var srWord = ctx.el('p', { class: 'sr' });
    var updateWord = function (letter) {
      slots[item.hiddenIndex].textContent = letter ? cased(letter) : '?';
      srWord.textContent = ctx.fmt(ctx.L.missing_letter_word_sr, { letters: item.letters.map(function (l, i) {
        return i === item.hiddenIndex ? (letter ? cased(letter) : ctx.L.missing_letter_blank) : l;
      }).filter(function (l) { return String(l).trim(); }).join(', ') });
    };
    var shownWord = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(ctx.L.missing_letter_word_is, { word: wordText }) });
    var showButton = ctx.el('button', { type: 'button', hidden: true, 'aria-disabled': 'true', 'aria-pressed': 'false', on: { click: function () {
      if (ctx.isDone() || ctx.check || ctx.attempts() <= 0) return;
      var on = shownWord.hidden;
      shownWord.hidden = !on;
      showButton.setAttribute('aria-pressed', on ? 'true' : 'false');
      showButton.textContent = on ? ctx.L.missing_letter_hide_word : ctx.L.missing_letter_show_word;
      // The app records this support once per item.
      if (on && !shownOnce) { shownOnce = true; ctx.support('wordShown'); }
    } }, text: ctx.L.missing_letter_show_word });
    var syncShowButton = function () {
      var unlocked = !ctx.check && typeof ctx.attempts === 'function' && ctx.attempts() > 0;
      showButton.hidden = !unlocked;
      if (ctx.isDone() || !unlocked) showButton.setAttribute('aria-disabled', 'true');
      else showButton.removeAttribute('aria-disabled');
    };
    var doc = ctx.root.ownerDocument;
    var cards = [];
    var check = ctx.el('button', { type: 'button', class: 'primary', 'aria-disabled': 'true', on: { click: function () {
      if (ctx.isDone() || check.getAttribute('aria-disabled') === 'true') { if (!ctx.isDone() && !selected) ctx.announce(ctx.L.missing_letter_pick_first); return; }
      var answer = selected;
      var outcome = ctx.answer(answer, answer.trim().toLowerCase() === item.target, {
        correctText: ctx.fmt(ctx.L.missing_letter_correct, { letter: cased(item.target) }),
        missedText: ctx.fmt(ctx.L.missing_letter_missed, { letter: cased(item.target) }),
      });
      // A retry marks the wrong letter as tried (matching all other choice adapters) and clears the slot.
      if (outcome === 'retry') {
        syncShowButton();
        var missed = answer.trim().toLowerCase();
        cards.forEach(function (c) {
          if (c.letter === missed) {
            c.tried = true;
            c.box.classList.add('tried');
            c.button.setAttribute('aria-disabled', 'true');
          }
        });
        var wasOnCheck = !!(doc && doc.activeElement === check);
        select('');
        if (wasOnCheck && !ctx.noFocus) {
          var nextChoice = cards.filter(function (c) { return !c.tried; })[0];
          if (nextChoice && nextChoice.button && typeof nextChoice.button.focus === 'function') {
            try { nextChoice.button.focus(); } catch (_) {}
          }
        }
      }
    } }, text: ctx.L.missing_letter_check });
    var select = function (letter) {
      if (letter && cards.some(function (c) { return c.letter === letter && c.tried; })) return;
      selected = letter;
      cards.forEach(function (c) { c.button.setAttribute('aria-pressed', c.letter === letter ? 'true' : 'false'); });
      check.setAttribute('aria-disabled', letter ? 'false' : 'true');
      updateWord(letter);
    };
    var list = ctx.el('ul', { class: 'row', 'aria-label': ctx.L.missing_letter_choices, style: 'list-style:none;padding:0;margin:16px 0' });
    item.options.forEach(function (letter) {
      var card = { box: null, button: null, letter: letter, tried: false };
      var button = ctx.el('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': ctx.fmt(ctx.L.missing_letter_choose, { letter: cased(letter) }),
        style: 'min-width:64px;min-height:64px;font-size:1.4rem;font-weight:700',
        on: { click: function () { if (!ctx.isDone() && !card.tried && button.getAttribute('aria-disabled') !== 'true') select(letter); } } }, [cased(letter)]);
      var box = ctx.el('li', { class: 'choice solo', style: 'padding:6px' }, [button]);
      card.box = box; card.button = button;
      cards.push(card);
      list.appendChild(box);
    });
    if (typeof ctx.keys === 'function') {
      ctx.keys(function (key) {
        if (ctx.isDone()) return false;
        var k = String(key == null ? '' : key);
        if (k === 'Backspace' || k === 'Escape' || k === 'Esc') {
          if (!selected) return false;
          select('');
          return true;
        }
        if (k === 'Enter') {
          var ae = doc && doc.activeElement;
          var onSelectedChoice = cards.some(function (c) { return c.button === ae && c.letter === selected; });
          var onOtherBtn = !!(ae && String(ae.tagName || '').toUpperCase() === 'BUTTON' && ae !== check && !onSelectedChoice && !ae.closest('[hidden]') && !ae.disabled && ae.getAttribute('aria-disabled') !== 'true');
          if (onOtherBtn || !selected) return false;
          check.click();
          return true;
        }
        if (k.length === 1) {
          var lc = k.toLowerCase();
          var hit = cards.filter(function (c) { return c.letter === lc; })[0];
          if (hit) {
            if (!hit.tried) select(hit.letter);
            return true;
          }
        }
        return false;
      });
    }
    updateWord('');
    syncShowButton();
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.missing_letter_question }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
      showButton,
    ]));
    ctx.root.appendChild(shownWord);
    // dir: the word's letters run left to right in a right-to-left page too.
    ctx.root.appendChild(ctx.el('ul', { class: 'slots', 'aria-hidden': 'true', dir: 'ltr' }, slots));
    ctx.root.appendChild(srWord);
    ctx.root.appendChild(list);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [check]));
    return {
      reveal: function () {
        cards.forEach(function (c) {
          c.button.setAttribute('aria-disabled', 'true');
          if (c.letter === item.target && !c.box.classList.contains('right')) {
            c.box.classList.add('right');
            c.button.setAttribute('aria-label', c.button.getAttribute('aria-label') + ' ' + (ctx.L.missing_letter_answer_mark || '(the answer)'));
          }
        });
        check.setAttribute('aria-disabled', 'true');
        showButton.setAttribute('aria-disabled', 'true');
        updateWord(item.target);
        shownWord.hidden = false;
      },
    };
  },
};
