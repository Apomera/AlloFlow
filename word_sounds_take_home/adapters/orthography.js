// Take-home adapter: Sight & Spell (orthography).
// App source of truth (word_sounds_module.js):
//   view        case "orthography" (~19589) renders OrthographyView (~4758): the
//               learner HEARS the word and SPELLS it in a text box (typing, or
//               dragging a-z letter tiles; tapping a tile only speaks its name).
//               The prepared misspelling board (activityItems.orthography.options)
//               is passed as data.options but the view never shows it.
//   grading     OrthographyView.handleSubmit: trimmed, lowercased spelling; the same
//               unchanged answer is not resubmitted; then checkAnswer(ans, word)
//               (~17060, soundAnswerMatches on lowercased strings = equality for
//               whole words). Default budget: 2 presentations (1 retry).
//   audio       inst_spelling_bee bank clip ("listen to the word and spell it") and the word.
// 2026-11-13 parity: as the app (b38ca18141), the tiles are letters only and the letters
// decide: an apostrophe, hyphen or space need not be typed.
module.exports = {
  id: 'orthography',
  title: 'Sight & Spell',
  labels: {
    orthography_question: 'Listen to the word, then spell it.',
    orthography_input: 'Spell the word',
    orthography_tiles: 'Letters',
    orthography_add: 'Add {letter}',
    orthography_backspace: 'Remove last letter',
    orthography_clear: 'Clear',
    orthography_slow: 'Hear it slowly',
    orthography_check: 'Check spelling',
    orthography_empty: 'Type or tap letters to spell the word first.',
    orthography_same: 'Change your spelling, then check it again.',
    orthography_correct: 'Yes! That is how to spell {word}.',
    orthography_missed: 'This is how to spell it: {word}. Listen.',
    orthography_answer: 'The word is spelled: {word}',
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
    // The app's tile bank is a-z. A letter of this word outside a-z is added so
    // a learner who can only tap can still spell it (the app relies on typing).
    // A word with no a-z letter at all (another script) would get a tile bank of
    // only its own letters, which spells it out; report it instead.
    if (!/[a-z]/.test(word.toLowerCase())) return { missing: ['letters outside a-z'] };
    // An apostrophe, hyphen or space is not a tile: the letters decide (wsSpellFixedChar / wsSpellSame, b38ca18141).
    var letterRe = null;
    try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}]', 'u'); } catch (_) {}
    var target = word.toLowerCase();
    var extra = [];
    target.split('').forEach(function (ch) {
      if (!/[a-z]/.test(ch) && extra.indexOf(ch) < 0 && ch.trim() && (letterRe ? letterRe.test(ch) : !/^['’\-.]$/.test(ch))) extra.push(ch);
    });
    var item = { target: target, extraTiles: extra, wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
    // A word written with a capital (a name): keep how it is written, matching spelling_bee.js.
    if (word !== target && word.length === target.length) item.shown = word;
    var board = (w && w.activityItems && w.activityItems.orthography) || {};
    var rawBank = Array.isArray(board.letterBank) ? board.letterBank : (Array.isArray(w && w.letterBank) ? w.letterBank : null);
    if (rawBank && rawBank.length) {
      var bank = [];
      rawBank.forEach(function (ch) {
        var c = String(ch == null ? '' : ch).trim().toLowerCase();
        if (c && c.length === 1 && bank.indexOf(c) < 0) bank.push(c);
      });
      target.split('').forEach(function (ch) {
        var isLtr = letterRe ? letterRe.test(ch) : !/^['’\- .]$/.test(ch);
        if (isLtr && ch.trim() && bank.indexOf(ch) < 0) bank.push(ch);
      });
      if (bank.length) item.letterBank = bank;
    }
    if (board.lengthHint || (w && w.lengthHint)) item.lengthHint = true;
    return { item: item };
  },
  render: function (item, ctx) {
    var target = String(item.target || '');
    var written = item.shown && String(item.shown).length === target.length ? String(item.shown) : target;
    var letterRe = null;
    try { letterRe = new RegExp('[\\p{L}\\p{M}\\p{N}_]', 'u'); } catch (_) {}
    var fixed = function (ch) { ch = String(ch || ''); return letterRe ? !letterRe.test(ch) : /^['’\- .]$/.test(ch); };
    var own = function (text) { return String(text || '').split('').filter(function (ch) { return !fixed(ch); }).join(''); };
    var hintLen = typeof item.lengthHint === 'number' && item.lengthHint > 0
      ? Math.floor(item.lengthHint)
      : item.lengthHint ? (own(target).length || target.length) : 0;
    var placeholder = hintLen ? Array(hintLen + 1).join('_ ').trim() : false;
    var lastSubmitted = null;
    var inputId = 'ortho-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
    var input = ctx.el('input', { id: inputId, type: 'text', dir: 'ltr', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
      inputmode: /[^a-z]/.test(own(target)) ? 'text' : 'none', placeholder: placeholder,
      maxlength: '40', style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-transform:lowercase;text-align:center', on: {
        input: function () { lastSubmitted = null; syncCheck(); },
        keydown: function (e) {
          if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          submit();
        },
      } });
    var syncCheck = function () {
      if (check) check.setAttribute('aria-disabled', ctx.isDone() || !String(input.value || '').trim() ? 'true' : 'false');
    };
    var edit = function (value) {
      if (ctx.isDone()) return;
      input.value = value;
      lastSubmitted = null;
      syncCheck();
    };
    var submit = function () {
      if (ctx.isDone()) return;
      var answer = String(input.value || '').trim().toLowerCase();
      if (!answer) { ctx.announce(ctx.L.orthography_empty); return; }
      // OrthographyView ignores a resubmit of the same unchanged spelling.
      if (answer === lastSubmitted) { ctx.announce(ctx.L.orthography_same); return; }
      lastSubmitted = answer;
      // wsSpellSame: the letters decide, so "dont" spells "don't" and "icecream" spells "ice-cream".
      var letters = function (text) { var re = null; try { re = new RegExp('[^\\p{L}\\p{M}\\p{N}]', 'gu'); } catch (_) {} return String(text || '').replace(re || /['’\- .]/g, ''); };
      ctx.answer(answer, letters(target) ? letters(answer) === letters(target) : answer === target, {
        correctText: ctx.fmt(ctx.L.orthography_correct, { word: written }),
        missedText: ctx.fmt(ctx.L.orthography_missed, { word: written }),
      });
      // On a retry the spelling stays in the box to be fixed, as in the app.
    };
    var letters = Array.isArray(item.letterBank) && item.letterBank.length
      ? item.letterBank.slice()
      : 'abcdefghijklmnopqrstuvwxyz'.split('').concat(item.extraTiles || []);
    var tiles = letters.map(function (letter) {
      return ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.orthography_add, { letter: letter }),
        style: 'min-width:44px;min-height:44px;font-size:1.15rem;font-weight:700;padding:4px 8px',
        on: { click: function () { edit(String(input.value || '') + letter); } } }, [letter]);
    });
    var back = ctx.el('button', { type: 'button', 'aria-label': ctx.L.orthography_backspace, style: 'min-width:44px;min-height:44px', on: { click: function () { edit(String(input.value || '').slice(0, -1)); } } }, ['⌫']);
    var clear = ctx.el('button', { type: 'button', style: 'min-height:44px', on: { click: function () { edit(''); } }, text: ctx.L.orthography_clear });
    var check = ctx.el('button', { type: 'button', class: 'primary', 'aria-disabled': 'true', on: { click: submit }, text: ctx.L.orthography_check });
    var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(ctx.L.orthography_answer, { word: written }) });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.orthography_question }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('slowReplays'); ctx.play(item.wordAudio, 0.5); } }, text: ctx.L.orthography_slow || 'Hear it slowly' }),
    ]));
    ctx.root.appendChild(ctx.el('label', { for: inputId, text: ctx.L.orthography_input }));
    ctx.root.appendChild(input);
    ctx.root.appendChild(ctx.el('div', { class: 'row', role: 'group', 'aria-label': ctx.L.orthography_tiles, style: 'flex-wrap:wrap;margin:8px 0;gap:4px' }, tiles));
    ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:8px;gap:6px' }, [back, clear, check]));
    ctx.root.appendChild(answerLine);
    syncCheck();
    return {
      reveal: function () {
        input.setAttribute('readonly', '');
        input.setAttribute('aria-readonly', 'true');
        tiles.concat([back, clear, check]).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
        answerLine.hidden = false;
      },
    };
  },
};
