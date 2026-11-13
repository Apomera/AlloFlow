// Take-home adapter: Rhyme Time (rhyming).
// App: board from WS_CORE.buildSessionRhymeBoard (word_sounds_setup_source.jsx:4629,4802);
// the player re-checks a prepared board through the same builder and plays it
// only when the pair is supported (word_sounds_module.js:15177-15198); opening
// sequence inst_rhyming -> word -> each choice (word_sounds_module.js:16736-16754,
// 16855-16888); graded at word_sounds_module.js:20348-20380: the designated
// rhymeWord, or any other choice whose spelling rime (>= 2 letters) matches the
// target's, then checkAnswer("correct"|"incorrect","correct"), 2 tries.
// 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
// large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
// per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
// (hear, then choose).
// Fewer choices: the app trims this board below Hard (WS_CORE.choiceLimit + trimChoices:
// Easy 3, Medium 4). A packet does the same when made with Choices Easy or Medium
// (word_sounds_packet_builder.js, choiceLevels); a board as built (All) is shown whole.

// Words this export has shown prepare() so far (the app's pool is the whole
// pack; prepare only sees one word, so later words cannot be consulted).
var seen = { key: null, words: [] };

module.exports = {
  id: 'rhyming',
  title: 'Rhyme Time',
  labels: {
    rhyming_prompt: 'Which word rhymes with this one?',
    rhyming_prompt_word: 'Which word rhymes with {word}?',
    rhyming_option_n: 'Option {n}',
    rhyming_listen: 'Listen',
    rhyming_listen_option: 'Listen to option {n}',
    rhyming_listen_word: 'Listen to {word}',
    rhyming_choose_option: 'Choose option {n}',
    rhyming_choose_word: 'Choose {word}',
    rhyming_correct: 'Yes! Those words rhyme.',
    rhyming_missed: '{answer} rhymes with {word}. Listen.',
    rhyming_missed_no_letters: 'Here is the word that rhymes. Listen.',
    rhyming_answer_mark: '(the answer)',
  },
  prepare: function (w, env) {
    if (seen.key !== env.packClip) seen = { key: env.packClip, words: [] };
    seen.words.push(w);
    var core = env.core;
    var board = w && w.activityItems && w.activityItems.rhyming;
    if (!board || !Array.isArray(board.options) || board.options.length < 2 || !board.answer || board.options.indexOf(board.answer) < 0) return { missing: ['board'] };
    var word = String(env.word);
    var checked = core.buildRhymeBoard({ word: word, prepared: board, phonemes: w.phonemes,
      pool: seen.words.concat(core.knownWords || []), isEnglish: env.isEnglish });
    if (!checked || checked.supported === false || !Array.isArray(checked.options) || checked.options.length < 2) return { missing: ['rhyme_review_required'] };
    var tw = word.toLowerCase();
    // The grader reads wordSoundsPhonemes.rhymeWord; setup keeps it equal to
    // the board answer. A pack without it falls back to the board answer.
    var rw = String(w.rhymeWord || checked.answer || '').toLowerCase();
    var rimeOf = function (s) {
      var vowels = 'aeiou';
      var start = s.length;
      for (var i = s.length - 1; i >= 0; i--) {
        if (vowels.indexOf(s[i]) >= 0) { start = i; while (i > 0 && vowels.indexOf(s[i - 1]) >= 0) i--; start = i; break; }
      }
      return s.slice(start);
    };
    var isRhyme = function (opt) {
      var a = String(opt || '').toLowerCase().trim();
      return !!((rw && a === rw) || (a && tw && a !== tw && rimeOf(a).length >= 2 && rimeOf(a) === rimeOf(tw)));
    };
    var missing = [];
    var wordAudio = env.wordClip(word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'inst_rhyming') || env.packClip('Which word rhymes with');
    if (!prompt) missing.push('question');
    var answerAudio = null;
    var choices = checked.options.map(function (text) {
      text = String(text);
      var clip = env.wordClip(text);
      if (!clip) missing.push('word:' + text.trim().toLowerCase());
      var designated = text.toLowerCase().trim() === rw;
      if (designated) answerAudio = clip;
      return { text: text, audio: clip, ok: isRhyme(text), answer: designated };
    });
    if (!choices.some(function (c) { return c.answer; })) return { missing: ['board'] };
    if (missing.length) return { missing: missing };
    return { item: { target: rw, promptAudio: prompt, wordAudio: wordAudio, choices: choices, answerAudio: [wordAudio, answerAudio] } };
  },
  render: function (item, ctx) {
    var win = ctx.root.ownerDocument.defaultView;
    var cards = [];
    var token = 0;
    var mark = function (index) {
      cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
    };
    var run = function (steps) {
      var mine = ++token;
      var i = 0;
      var step = function () {
        if (mine !== token || !ctx.root.isConnected) return;
        if (i >= steps.length) { mark(-1); return; }
        var s = steps[i++];
        mark(s.hi == null ? -1 : s.hi);
        ctx.play(s.id).then(function () { if (mine === token) win.setTimeout(step, s.gap || 0); });
      };
      step();
    };
    var halt = function () { token++; mark(-1); };
    var answerText = '';
    var list = ctx.el('ul', { class: 'choices' });
    item.choices.forEach(function (choice, i) {
      var n = i + 1;
      if (choice.answer) answerText = choice.text;
      var listen = ctx.el('button', { type: 'button',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.rhyming_listen_word, { word: choice.text }) : ctx.fmt(ctx.L.rhyming_listen_option, { n: n }),
        on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.rhyming_listen]);
      var choose = ctx.el('button', { type: 'button', class: 'primary',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.rhyming_choose_word, { word: choice.text }) : ctx.fmt(ctx.L.rhyming_choose_option, { n: n }),
        on: { click: function () {
          if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
          halt();
          var outcome = ctx.answer(choice.text, !!choice.ok, {
            correctText: ctx.L.rhyming_correct,
            missedText: ctx.showLetters ? ctx.fmt(ctx.L.rhyming_missed, { answer: answerText, word: item.word }) : ctx.L.rhyming_missed_no_letters,
          });
          if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
        } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: choice.text }) : ctx.fmt(ctx.L.rhyming_option_n, { n: n })]);
      var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
      cards.push({ box: box, choose: choose, answer: choice.answer });
      list.appendChild(box);
    });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.showLetters ? ctx.fmt(ctx.L.rhyming_prompt_word, { word: item.word }) : ctx.L.rhyming_prompt }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio }]); } }, text: ctx.L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
    ]));
    // Hear all (the player's ctx.hearAll): each choice in turn, marked with its number. The opening already plays them.
    var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ before: halt, auto: false,
      list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
    if (hear) ctx.root.appendChild(hear.node);
    ctx.root.appendChild(list);
    if (!ctx.isDone()) {
      run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio, gap: 200 }].concat(item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
    }
    return {
      // The R key: the question and the word again.
      replay: function () { run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio }]); },
      reveal: function () {
        halt();
        cards.forEach(function (c) {
          c.choose.setAttribute('aria-disabled', 'true');
          if (c.answer && !c.box.classList.contains('right')) {
            c.box.classList.add('right');
            c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.rhyming_answer_mark);
          }
        });
      },
    };
  },
};
