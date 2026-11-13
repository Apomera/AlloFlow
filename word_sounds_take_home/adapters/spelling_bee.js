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
//           An apostrophe, hyphen or space is a fixed slot, filled in for the child,
//           with no box (wsSpellFixedChar / wsSpellAlign, b38ca18141).
//   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased typed
//           spelling === trimmed, lowercased word (on its letters only when the word
//           has a fixed slot: wsSpellSame); the same unchanged spelling is not
//           graded twice; checkAnswer("correct"|"incorrect","correct"). Default budget
//           2 tries (:17130). A first miss keeps the spelling to fix.
//   audio   inst_spelling_bee then the word (INST_KEY_MAP :16448, :16989-16995).
// 2026-11-13 (owner): the boxes show the letters as typed and the keys are lowercase;
// the answer line names the word as it is written. The app shows the boxes in capitals.
module.exports = {
  id: 'spelling_bee',
  title: 'Spelling Bee',
  labels: {
    spelling_bee_question: 'Listen to the word, then type it.',
    spelling_bee_input: 'Type the word',
    spelling_bee_slow: 'Hear it slowly',
    spelling_bee_check: 'Check spelling',
    spelling_bee_first_letter: 'First letter hint',
    spelling_bee_hint_vowels: 'Show vowels',
    spelling_bee_hint_more: 'Show more',
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
    var item = { target: word.toLowerCase(), wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
    // A word written with a capital (a name): how it is written, for the answer line and the hints.
    if (word !== item.target && word.length === item.target.length) item.shown = word;
    return { item: item };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var word = String(item.target);
    var written = item.shown && String(item.shown).length === word.length ? String(item.shown) : word;
    // wsSpellFixedChar: not a letter, mark or digit (an apostrophe, hyphen or space).
    var letterRe = null;
    try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u'); } catch (_) {}
    var fixed = function (ch) { ch = String(ch || ''); return letterRe ? !letterRe.test(ch) : /^['’\- .]$/.test(ch); };
    var hasFixed = word.split('').some(fixed);
    var own = function (text) { return String(text || '').split('').filter(function (ch) { return !fixed(ch); }).join(''); };
    var total = own(word).length || word.length;
    // wsSpellAlign: typed letters go into the word's letter slots, and a fixed slot is filled as soon as the letters
    // before it are in ("don" -> "don'"). "_" is a hint's place for a letter not typed yet.
    var align = function (typed) {
      var letters = own(typed).split(''), out = '', used = 0;
      for (var i = 0; i < written.length; i++) {
        var ch = written[i];
        if (fixed(ch)) { if (used < letters.length || used > 0) out += ch; else break; }
        else if (used < letters.length) out += letters[used++];
        else break;
      }
      return out;
    };
    var lastSubmitted = null;
    var before = '';
    var inputId = 'bee-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
    var input = ctx.el('input', { id: inputId, type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
      inputmode: 'text', dir: 'ltr', maxlength: String(word.length || 20),
      style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-align:center', on: {
        input: function () {
          if (hasFixed) {
            var raw = value(), letters = own(raw);
            // Backspace over a fixed slot takes the letter before it too, or the slot would come back at once.
            if (raw.length < before.length && letters === own(before)) letters = letters.slice(0, -1);
            input.value = align(letters);
          }
          before = value(); lastSubmitted = null; draw();
        },
        keydown: function (e) {
          if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          submit();
        },
      } });
    var value = function () { return String(input.value || ''); };
    var set = function (next) { input.value = next; before = next; lastSubmitted = null; draw(); };
    // One box per letter (aria-hidden: the count line below carries the result); a fixed slot is shown as it is.
    var boxes = written.split('').map(function (ch) {
      return fixed(ch) ? ctx.el('span', { 'data-fixed': '', style: 'display:flex;align-items:center;font-size:1.4rem;font-weight:700' }, [ch === ' ' ? ' ' : ch])
        : ctx.el('span', { class: 'slot', style: 'min-width:48px;min-height:56px' });
    });
    var boxRow = ctx.el('div', { class: 'slots', 'aria-hidden': 'true', dir: 'ltr' }, boxes);
    var countLine = ctx.el('p', { hidden: true });
    var draw = function () {
      var typed = value();
      var shown = ctx.attempts() > 0;
      var right = 0;
      boxes.forEach(function (box, i) {
        if (fixed(word[i])) return;
        var ch = typed[i] || '';
        var ok = shown && ch && ch.toLowerCase() === word[i];
        if (ok) right++;
        box.textContent = ch || '_';
        box.style.borderStyle = ch ? 'solid' : 'dashed';
        box.style.borderColor = shown && ch ? (ok ? 'var(--ok)' : 'var(--warn)') : 'var(--muted)';
        box.style.background = shown && ch ? (ok ? 'var(--ok-bg)' : 'var(--warn-bg)') : '';
      });
      countLine.hidden = !(shown && typed);
      countLine.textContent = ctx.fmt(L.spelling_bee_letters_correct, { count: right, total: total });
      moreBtn.textContent = typed.indexOf('_') >= 0 ? L.spelling_bee_hint_more : L.spelling_bee_hint_vowels;
    };
    var edit = function (next, clue) {
      if (ctx.isDone()) return;
      if (!next || next === value()) return;
      ctx.support(clue);
      set(next);
      ctx.announce(ctx.fmt(L.spelling_bee_hint_used, { answer: next.split('').join(' ') }));
    };
    var submit = function () {
      if (ctx.isDone()) return;
      var answer = value().trim().toLowerCase();
      if (!answer || (hasFixed && !own(answer))) { ctx.announce(L.spelling_bee_empty); return; }
      if (answer === lastSubmitted) { ctx.announce(L.spelling_bee_same); return; }
      lastSubmitted = answer;
      // wsSpellSame: a word with a fixed slot is judged on its letters.
      ctx.answer(answer, hasFixed ? own(answer) === own(word) : answer === word.trim().toLowerCase(), {
        correctText: ctx.fmt(L.spelling_bee_correct, { word: written }),
        missedText: ctx.fmt(L.spelling_bee_missed, { word: written }),
      });
      // A first miss keeps the spelling; the boxes now mark each letter.
      draw();
    };
    // "Slow" plays the same recording at half speed, as playSpellingWord(0.5) does.
    var playSlow = function () { ctx.play(item.wordAudio, 0.5); };
    var firstBtn = ctx.el('button', { type: 'button', on: { click: function () {
      // The first LETTER, after any fixed slot in front of it.
      var at = 0;
      while (at < written.length - 1 && fixed(written[at])) at++;
      edit(hasFixed ? align(written.slice(0, at + 1) + value().slice(at + 1)) : (written[0] || '') + value().slice(1), 'spelling_first_letter');
    } }, text: L.spelling_bee_first_letter });
    // "Show Vowels", then "Show More" one letter at a time (:19846-19863).
    var moreBtn = ctx.el('button', { type: 'button', on: { click: function () {
      var current = value().toLowerCase();
      var letters = written.split('');
      var isVowel = function (ch) { return 'aeiou'.indexOf(ch.toLowerCase()) >= 0; };
      var vowelsShown = letters.every(function (ch, i) { return !isVowel(ch) || current[i] === ch.toLowerCase(); });
      var filled = letters.map(function (ch, i) { return fixed(ch) || isVowel(ch) || current[i] === ch.toLowerCase() ? ch : '_'; });
      if (vowelsShown) { var nextBlank = filled.indexOf('_'); if (nextBlank >= 0) filled[nextBlank] = letters[nextBlank]; }
      edit(filled.join(''), vowelsShown ? 'spelling_more_letters' : 'spelling_vowels');
    } }, text: L.spelling_bee_hint_vowels });
    var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: submit }, text: L.spelling_bee_check });
    var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.spelling_bee_answer, { word: written }) });
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
        if (ctx.isDone() || own(value()).length >= total) return;
        set(hasFixed ? align(value() + ch) : value() + ch);
      } } }, [ch]);
    });
    var deleteKey = ctx.el('button', { type: 'button', 'aria-label': L.spelling_bee_delete, style: 'min-width:44px;min-height:44px', on: { click: function () {
      if (ctx.isDone() || !value()) return;
      set(hasFixed ? align(own(value()).slice(0, -1)) : value().slice(0, -1));
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
