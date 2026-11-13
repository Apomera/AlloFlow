// Take-home adapter: Sound Swap (manipulation).
// Only a checked task plays: WS_CORE.resolveManipulationTask + manipulationReady
// (word_sounds_core.js:1145-1160; the player skips any other word,
// word_sounds_module.js:7401, 8713-8723, 3346). Choices are the task's answer
// and its curated distractors (word_sounds_module.js:8717-8718; the setup board
// holds the same set, word_sounds_setup_source.jsx:4643). The instruction is
// spoken in parts, /x/ tokens from the phoneme bank
// (speakInstructionWithPhonemes, word_sounds_module.js:9748-9765; setup packs
// the text parts, word_sounds_setup_source.jsx:5384-5389,5413). Graded at
// word_sounds_module.js:20150-20155: choice.toLowerCase() ===
// task.answer.toLowerCase(), then checkAnswer("correct"|"incorrect","correct"),
// 2 tries.
// 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
// large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
// per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
// (hear, then choose).
// The task type is said plainly: "Take away a sound" / "Change a sound" (the app's card says
// Phoneme Deletion / Phoneme Substitution).
module.exports = {
  id: 'manipulation',
  title: 'Sound Swap',
  labels: {
    manipulation_prompt: 'Swap the sound to make a new word!',
    // 2026-11-13: plain words for the student (the app's task card says Phoneme Deletion / Substitution).
    manipulation_type_deletion: 'Take away a sound',
    manipulation_type_substitution: 'Change a sound',
    manipulation_hear_instruction: 'Hear the instruction',
    manipulation_option_n: 'Option {n}',
    manipulation_listen: 'Listen',
    manipulation_listen_option: 'Listen to option {n}',
    manipulation_listen_word: 'Listen to {word}',
    manipulation_choose_option: 'Choose option {n}',
    manipulation_choose_word: 'Choose {word}',
    manipulation_correct: 'Yes! That is the new word.',
    manipulation_missed: 'The new word is {word}. Listen.',
    manipulation_missed_no_letters: 'Here is the new word. Listen.',
    manipulation_answer_mark: '(the answer)',
  },
  prepare: function (w, env) {
    var core = env.core;
    var board = w && w.activityItems && w.activityItems.manipulation;
    var supplied = (w && w.manipulationTask) || (board && board.task) || null;
    var task = core.resolveManipulationTask(env.word, supplied, 'en');
    if (!env.isEnglish || !core.manipulationReady(task) || !task.answer) return { missing: ['sound_swap_not_checked'] };
    var answer = String(task.answer);
    var live = [answer].concat(task.distractors || []).filter(function (v, i, all) { return v && all.indexOf(v) === i; });
    // Keep the prepared board's order when it is the same set (the player
    // reshuffles at run time; a file needs one fixed order).
    var boardOptions = board && Array.isArray(board.options) ? board.options : [];
    var sameSet = boardOptions.length === live.length && live.every(function (v) { return boardOptions.indexOf(v) >= 0; });
    var options = sameSet ? boardOptions.slice() : live;
    if (!sameSet) {
      var seed = 0;
      for (var s = 0; s < answer.length; s++) seed = (seed * 31 + answer.charCodeAt(s)) >>> 0;
      for (var i = options.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; var j = seed % (i + 1); var t = options[i]; options[i] = options[j]; options[j] = t; }
    }
    var missing = [];
    var wordAudio = env.wordClip(env.word);
    if (!wordAudio) missing.push('word');
    var parts = String(task.instruction || '').split(/(\/[^\s/]{1,4}\/)/g)
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p && /[a-z0-9]/i.test(p); });
    var instruction = parts.map(function (part) {
      if (/^\/[^/]+\/$/.test(part)) {
        var label = env.label(part.slice(1, -1));
        var sound = label ? env.phonemeClip(label) : null;
        if (!sound) missing.push('/' + (label || part.slice(1, -1)) + '/');
        return sound;
      }
      var clip = env.packClip(part);
      if (!clip && missing.indexOf('question') < 0) missing.push('question');
      return clip;
    });
    if (!instruction.length) missing.push('question');
    var answerAudio = null;
    var choices = options.map(function (text) {
      var clip = env.wordClip(text);
      if (!clip) missing.push('word:' + String(text).trim().toLowerCase());
      if (String(text).toLowerCase() === answer.toLowerCase()) answerAudio = clip;
      return { text: String(text), audio: clip };
    });
    if (missing.length) return { missing: missing };
    return { item: { target: answer, type: task.type === 'deletion' ? 'deletion' : 'substitution', instructionText: String(task.instruction),
      instruction: instruction, wordAudio: wordAudio, choices: choices, answerAudio: [answerAudio] } };
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
    // 120 ms between instruction parts (word_sounds_module.js:9762).
    var instructionSteps = function (lastGap) {
      return item.instruction.map(function (id, i) { return { id: id, gap: i === item.instruction.length - 1 ? lastGap : 120 }; });
    };
    var list = ctx.el('ul', { class: 'choices' });
    item.choices.forEach(function (choice, i) {
      var n = i + 1;
      var right = choice.text.toLowerCase() === String(item.target).toLowerCase();
      var listen = ctx.el('button', { type: 'button',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.manipulation_listen_word, { word: choice.text }) : ctx.fmt(ctx.L.manipulation_listen_option, { n: n }),
        on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.manipulation_listen]);
      var choose = ctx.el('button', { type: 'button', class: 'primary',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.manipulation_choose_word, { word: choice.text }) : ctx.fmt(ctx.L.manipulation_choose_option, { n: n }),
        on: { click: function () {
          if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
          halt();
          var outcome = ctx.answer(choice.text, right, {
            correctText: ctx.L.manipulation_correct,
            missedText: ctx.showLetters ? ctx.fmt(ctx.L.manipulation_missed, { word: item.target }) : ctx.L.manipulation_missed_no_letters,
          });
          if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
        } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: choice.text }) : ctx.fmt(ctx.L.manipulation_option_n, { n: n })]);
      var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
      cards.push({ box: box, choose: choose, right: right });
      list.appendChild(box);
    });
    ctx.root.appendChild(ctx.el('p', { text: ctx.L.manipulation_prompt }));
    // The app prints the task card (type + instruction) for every learner.
    ctx.root.appendChild(ctx.el('p', { class: 'muted', text: item.type === 'deletion' ? ctx.L.manipulation_type_deletion : ctx.L.manipulation_type_substitution }));
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: item.instructionText }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps(0)); } }, text: ctx.L.manipulation_hear_instruction }),
      ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
    ]));
    // Hear all (the player's ctx.hearAll): each choice in turn, marked with its number. The opening already plays them.
    var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ before: halt, auto: false,
      list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
    if (hear) ctx.root.appendChild(hear.node);
    ctx.root.appendChild(list);
    // Opening sequence (word_sounds_module.js:16890-16937): the instruction,
    // 400 ms, then every choice in turn with 350 ms between.
    if (!ctx.isDone()) {
      run(instructionSteps(400).concat(item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
    }
    return {
      // The R key: the instruction again.
      replay: function () { run(instructionSteps(0)); },
      reveal: function () {
        halt();
        cards.forEach(function (c) {
          c.choose.setAttribute('aria-disabled', 'true');
          if (c.right && !c.box.classList.contains('right')) {
            c.box.classList.add('right');
            c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.manipulation_answer_mark);
          }
        });
      },
    };
  },
};
