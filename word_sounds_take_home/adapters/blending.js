// Take-home adapter: Blend Sounds (blending).
// App: board from compileActivityItems (word_sounds_setup_source.jsx:4628,4801)
// { options: [word + up to 5 distractors], answer: word }; played by
// playBlending + the instruction sequence (word_sounds_module.js:9767,16790);
// graded at word_sounds_module.js:19516-19523 (option.toLowerCase() ===
// word.toLowerCase(), then checkAnswer("correct"|"incorrect","correct"),
// default budget 2 tries, word_sounds_module.js:17130).
module.exports = {
  id: 'blending',
  title: 'Blend Sounds',
  labels: {
    blending_prompt: 'Blend these sounds together!',
    blending_question: 'Which word did you hear?',
    blending_hear_sounds: 'Hear the sounds',
    blending_play_all: 'Play all the words',
    blending_option_n: 'Option {n}',
    blending_listen: 'Listen',
    blending_listen_option: 'Listen to option {n}',
    blending_listen_word: 'Listen to {word}',
    blending_choose_option: 'Choose option {n}',
    blending_choose_word: 'Choose {word}',
    blending_correct: 'Yes! You blended the sounds.',
    blending_missed: 'The word was {word}. Listen.',
    blending_missed_no_letters: 'Here is the word. Listen.',
    blending_answer_mark: '(the answer)',
  },
  prepare: function (w, env) {
    var board = w && w.activityItems && w.activityItems.blending;
    if (!board) return { missing: ['board'] };
    var word = String(env.word);
    var target = word.trim().toLowerCase();
    // Same usable-board test as preparedBlendingOptionsFor
    // (word_sounds_module.js:12352-12358).
    var options = Array.isArray(board.options) ? board.options.filter(function (o) { return typeof o === 'string' && o.trim(); }) : [];
    if (options.length < 2 || !options.some(function (o) { return o.trim().toLowerCase() === target; })) return { missing: ['board'] };
    // playBlending speaks every phoneme; a one-sound "blend" is not a blend
    // (the printable presentation also requires 2+, word_sounds_module.js:6277).
    var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
    var labels = phonemes.map(function (p) { return env.label(p); });
    if (labels.length < 2 || labels.some(function (l) { return !l; })) return { missing: ['board'] };
    var missing = [];
    var sounds = labels.map(function (label) {
      var clip = env.phonemeClip(label);
      if (!clip) missing.push('/' + label + '/');
      return clip;
    });
    // Instruction: the bank clip the app plays first (INST_KEY_MAP blending ->
    // inst_blending), else the prompt text it would speak.
    var instruction = env.bankClip('instructions', 'inst_blending') || env.packClip('Blend these sounds together!');
    // playBlending ends with which_word_did_you_hear, else this text.
    var question = env.bankClip('instructions', 'which_word_did_you_hear') || env.packClip('Which word did you hear?');
    if (!question) missing.push('question');
    var answerClip = null;
    var choices = options.map(function (text) {
      var clip = env.wordClip(text);
      var isTarget = text.trim().toLowerCase() === target;
      if (!clip && !missing.some(function (m) { return m === (isTarget ? 'word' : 'word:' + text.trim().toLowerCase()); })) {
        missing.push(isTarget ? 'word' : 'word:' + text.trim().toLowerCase());
      }
      if (isTarget) answerClip = clip;
      return { text: text, audio: clip };
    });
    if (missing.length) return { missing: missing };
    return { item: { target: word, instruction: instruction, question: question, sounds: sounds, choices: choices,
      answerAudio: [answerClip] } };
  },
  render: function (item, ctx) {
    var win = ctx.root.ownerDocument.defaultView;
    var cards = [];
    var token = 0;
    var mark = function (index) {
      cards.forEach(function (c, i) { c.box.style.outline = i === index ? '4px solid var(--accent)' : ''; c.box.style.outlineOffset = i === index ? '2px' : ''; });
    };
    // Play a sequence with the app's pauses; any tap, answer or new screen
    // ends it (a stopped clip never resolves, and the token moves on).
    var run = function (steps) {
      var mine = ++token;
      var i = 0;
      var step = function () {
        if (mine !== token || !ctx.root.isConnected) return;
        if (i >= steps.length) { mark(-1); return; }
        var s = steps[i++];
        mark(s.hi == null ? -1 : s.hi);
        ctx.play(s.id).then(function () {
          if (mine === token) win.setTimeout(step, s.gap || 0);
        });
      };
      step();
    };
    var halt = function () { token++; mark(-1); };
    var soundSteps = function () {
      return item.sounds.map(function (id) { return { id: id, gap: 500 }; }).concat([{ id: item.question, gap: 100 }]);
    };
    var optionSteps = function (gap) {
      return item.choices.map(function (c, i) { return { id: c.audio, gap: gap, hi: i }; });
    };
    var list = ctx.el('ul', { class: 'choices' });
    item.choices.forEach(function (choice, i) {
      var n = i + 1;
      var shownWord = choice.text;
      var listen = ctx.el('button', { type: 'button',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.blending_listen_word, { word: shownWord }) : ctx.fmt(ctx.L.blending_listen_option, { n: n }),
        on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.blending_listen]);
      var choose = ctx.el('button', { type: 'button', class: 'primary',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.blending_choose_word, { word: shownWord }) : ctx.fmt(ctx.L.blending_choose_option, { n: n }),
        on: { click: function () {
          if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
          halt();
          // word_sounds_module.js:19517-19519: case-insensitive, exact otherwise.
          var right = String(choice.text).toLowerCase() === String(item.target).toLowerCase();
          var outcome = ctx.answer(choice.text, right, {
            correctText: ctx.L.blending_correct,
            missedText: ctx.showLetters ? ctx.fmt(ctx.L.blending_missed, { word: item.target }) : ctx.L.blending_missed_no_letters,
          });
          if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
        } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: shownWord }) : ctx.fmt(ctx.L.blending_option_n, { n: n })]);
      var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
      cards.push({ box: box, choose: choose, right: String(choice.text).toLowerCase() === String(item.target).toLowerCase() });
      list.appendChild(box);
    });
    ctx.root.appendChild(ctx.el('p', { text: ctx.L.blending_prompt }));
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.blending_question }));
    // Play all the words: the player's Hear all (ctx.hearAll), each choice marked with its number.
    var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ label: ctx.L.blending_play_all, support: 'optionReplays', before: halt, auto: false,
      list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('soundReplays'); run(soundSteps()); } }, text: ctx.L.blending_hear_sounds }),
      hear ? hear.button : ctx.el('button', { type: 'button', on: { click: function () { ctx.support('optionReplays'); run(optionSteps(600)); } }, text: ctx.L.blending_play_all }),
      hear ? hear.note : null,
    ]));
    ctx.root.appendChild(list);
    // Opening sequence (word_sounds_module.js:16790-16845): instruction, each
    // sound, "Which word did you hear?", then every choice in turn.
    if (!ctx.isDone()) {
      run([{ id: item.instruction, gap: 200 }].concat(soundSteps(), optionSteps(200)));
    }
    return {
      reveal: function () {
        halt();
        cards.forEach(function (c) {
          c.choose.setAttribute('aria-disabled', 'true');
          if (c.right && !c.box.classList.contains('right')) {
            c.box.classList.add('right');
            c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.blending_answer_mark);
          }
        });
      },
    };
  },
};
