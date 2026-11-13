// Take-home adapter: Sound Counting (counting).
// App source of truth (word_sounds_module.js):
//   board view  case "counting" (~20594): count = phonemeCount || phonemes.length,
//               expectedCount = count >= 11 ? "11+" : count; buttons 1..10 and "11+";
//               a tap grades at once: checkAnswer(num, expectedCount).
//   grading     checkAnswer (~17060): WS_CORE.soundAnswerMatches on the lowercased,
//               trimmed strings; for numbers that is plain string equality.
//               Default retry budget: 2 presentations (1 retry).
//   audio       runInstructionSequence (~16446, ~16996): inst_counting bank clip,
//               then the word.
//   difficulty  the app shows fewer numbers below Hard (WS_CORE.countingChoices: Easy
//               the count with two either side, Medium 1-8). A packet made with Easy or
//               Medium carries those numbers in board.options; key n presses the button
//               n (data-key). A board without them shows 1-10 and 11+, as before.
module.exports = {
  id: 'counting',
  title: 'Sound Counting',
  labels: {
    counting_question: 'How many sounds do you hear in the word?',
    counting_sounds_one: '1 sound',
    counting_sounds_n: '{n} sounds',
    counting_sounds_more: '11 or more sounds',
    counting_correct: 'Yes! The word has {count}.',
    counting_missed: 'The word has {count}. Listen to it again.',
  },
  prepare: function (w, env) {
    var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
    // Same expression the app grades against (case "counting").
    var count = Number(w.phonemeCount || phonemes.length || 0);
    if (!Number.isInteger(count) || count < 1) return { missing: ['board'] };
    var target = count >= 11 ? '11+' : String(count);
    var missing = [];
    var wordAudio = env.wordClip(env.word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'inst_counting');
    if (!prompt) missing.push('question');
    if (missing.length) return { missing: missing };
    var item = { target: target, wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt, wordAudio], answerAudio: [wordAudio] };
    // Fewer numbers (countingChoices), when the board has them and the answer is among them.
    var board = w.activityItems && w.activityItems.counting;
    var full = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+'];
    var shown = board && Array.isArray(board.options) ? board.options.map(function (v) { return String(v); }) : null;
    if (shown && shown.length >= 2 && shown.length < full.length && shown.indexOf(target) >= 0 &&
      shown.every(function (v, i) { return full.indexOf(v) >= 0 && shown.indexOf(v) === i; })) item.values = shown;
    return { item: item };
  },
  render: function (item, ctx) {
    var values = item.values && item.values.length ? item.values : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+'];
    var countText = function (v) {
      return v === '11+' ? ctx.L.counting_sounds_more : v === '1' ? ctx.L.counting_sounds_one : ctx.fmt(ctx.L.counting_sounds_n, { n: v });
    };
    var cards = [];
    var list = ctx.el('ul', { class: 'counting-numbers', style: 'display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:16px 0' });
    values.forEach(function (v) {
      var button = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': countText(v),
        style: 'min-width:64px;min-height:64px;font-size:1.4rem;font-weight:700',
        on: { click: function () {
          if (ctx.isDone() || button.getAttribute('aria-disabled') === 'true') return;
          var outcome = ctx.answer(v, v === item.target, {
            correctText: ctx.fmt(ctx.L.counting_correct, { count: countText(item.target) }),
            missedText: ctx.fmt(ctx.L.counting_missed, { count: countText(item.target) }),
          });
          if (outcome !== 'correct') { box.classList.add('tried'); button.setAttribute('aria-disabled', 'true'); }
        } } }, [v]);
      // data-key: the number key that presses it (the same as its label, also when fewer numbers are shown).
      var box = ctx.el('li', { class: 'choice solo', style: 'padding:6px', 'data-key': /^[1-9]$/.test(v) ? v : false }, [button]);
      cards.push({ box: box, button: button, value: v });
      list.appendChild(box);
    });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.counting_question }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
    ]));
    ctx.root.appendChild(list);
    return {
      reveal: function () {
        cards.forEach(function (c) { c.button.setAttribute('aria-disabled', 'true'); if (c.value === item.target) c.box.classList.add('right'); });
      },
    };
  },
};
