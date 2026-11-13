// Take-home adapter: Syllable Blending (syllable_blending).
// App: setup stores { ...WS_CORE.resolveSyllableTask(...), options, answer }
// (word_sounds_setup_source.jsx:4645-4677, 4804). The player re-resolves the
// task (generateSyllableData, word_sounds_module.js:8602-8621) and plays it
// only when WS_CORE.syllableReady: a curated compound (version 1, units keyed
// by their text, spoken from prepared clips) or a teacher-recorded,
// teacher-reviewed task (each unit's own recording). Choices: the board's own
// options when WS_CORE.validSyllableBoard holds and they pass
// buildSyllableOptions' authored check (3522-3536).
// Opening: inst_syllable_blending (or "Listen to the syllables and blend them
// together"), then each syllable unit with 350 ms between them
// (runSyllableSequence 4475-4493, playSyllables 9689-9715, 16939-16940).
// Choices stay disabled until a full syllable run has finished and while
// audio plays (SyllableBlendingView canAnswer / isAudioBusy, 4494-4534,
// 20194-20195). Graded at 20197-20209: the chosen option equals the word
// (trimmed, lower case) -> checkAnswer("correct"|"incorrect", "correct"),
// default 2 attempts.
// 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
// large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
// per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
// (hear, then choose).

module.exports = {
  id: 'syllable_blending',
  title: 'Syllable Blending',
  labels: {
    syllable_blending_prompt: 'Listen to the syllables and blend them together.',
    syllable_blending_play: 'Play the syllables',
    syllable_blending_listen_first: 'Listen to all the syllables first, then choose.',
    syllable_blending_option_n: 'Option {n}',
    syllable_blending_listen: 'Listen',
    syllable_blending_listen_option: 'Listen to option {n}',
    syllable_blending_listen_word: 'Listen to {word}',
    syllable_blending_choose_option: 'Choose option {n}',
    syllable_blending_choose_word: 'Choose {word}',
    syllable_blending_try_again: 'Not quite. Play the syllables again and try once more.',
    syllable_blending_correct: 'Yes! The syllables make {word}.',
    syllable_blending_correct_no_letters: 'Yes! That is the word the syllables make.',
    syllable_blending_missed: 'The syllables make {word}. Listen.',
    syllable_blending_missed_no_letters: 'Here is the word the syllables make. Listen.',
    syllable_blending_answer_mark: '(the answer)',
  },
  prepare: function (w, env) {
    var core = env.core;
    var board = w && w.activityItems && w.activityItems.syllable_blending;
    if (!board) return { missing: ['board'] };
    var word = String(env.word).trim().toLowerCase();
    var language = env.language || (env.isEnglish ? 'en' : null);
    if (!language) return { missing: ['syllable_language_unknown'] };
    var task = core.resolveSyllableTask(word, board, language);
    if (!task || !task.supported || !core.syllableReady(task)) return { missing: ['syllable_audio_required'] };
    // Only the board's own choices: the app's fallback draws random words.
    var authored = core.validSyllableBoard(board) && core.packAudioKey(board.targetWord) === core.packAudioKey(word) && Array.isArray(board.options)
      ? board.options.map(function (v) { return typeof v === 'string' ? v.trim().toLowerCase() : ''; }) : [];
    var unique = authored.filter(function (v, i) { return authored.indexOf(v) === i; });
    if (authored.length < 2 || authored.length > 6 || authored.indexOf(word) < 0 || !authored.every(Boolean) || unique.length !== authored.length) return { missing: ['board'] };
    var missing = [];
    var prompt = env.bankClip('instructions', 'inst_syllable_blending') || env.packClip('Listen to the syllables and blend them together');
    if (!prompt) missing.push('question');
    var units = task.audioUnits.map(function (unit, i) {
      var clip = null;
      if (task.contentStatus === 'teacher_recorded') {
        // A reviewed teacher recording travels inside the board; embedding it
        // needs a loader helper that takes a data: URI (not available yet).
        var uri = core.syllableAssetSource(unit.asset);
        clip = uri && typeof env.recordingClip === 'function' ? env.recordingClip(uri) : null;
        if (!clip) missing.push(uri ? 'syllable_recordings_not_exportable' : 'syllable:' + (i + 1));
      } else {
        clip = env.wordClip(unit.audio || unit.key || unit.text);
        if (!clip) missing.push('syllable:' + unit.text);
      }
      return clip;
    });
    var answerAudio = null;
    var choices = authored.map(function (text) {
      var clip = env.wordClip(text);
      if (!clip) missing.push('word:' + text);
      if (text === word) answerAudio = clip;
      return { text: text, audio: clip };
    });
    if (missing.length) return { missing: missing.filter(function (m, i) { return missing.indexOf(m) === i; }) };
    return { item: { target: word, syllables: task.syllables.slice(), units: units, promptAudio: prompt, choices: choices,
      answerAudio: units.concat([answerAudio]) } };
  },
  render: function (item, ctx) {
    var win = ctx.root.ownerDocument.defaultView;
    var token = 0;
    var delivered = false;
    var busy = false;
    var hear = null;
    var cards = [];
    var parts = [];
    var answerText = item.target;
    var note = ctx.el('p', { class: 'muted', text: ctx.L.syllable_blending_listen_first });
    var setState = function () {
      cards.forEach(function (c) {
        var lockChoose = ctx.isDone() || c.tried || !delivered || busy;
        if (lockChoose) c.choose.setAttribute('aria-disabled', 'true'); else c.choose.removeAttribute('aria-disabled');
        if (busy) c.listen.setAttribute('aria-disabled', 'true'); else c.listen.removeAttribute('aria-disabled');
      });
      if (hear) { if (busy) hear.button.setAttribute('aria-disabled', 'true'); else hear.button.removeAttribute('aria-disabled'); }
      note.hidden = delivered || ctx.isDone();
    };
    var highlight = function (index) {
      parts.forEach(function (p, i) { p.style.background = i === index ? 'var(--accent)' : ''; p.style.color = i === index ? 'var(--accent-ink)' : ''; });
    };
    var halt = function () { token++; busy = false; highlight(-1); setState(); };
    // The syllable run the answer waits for: every unit must play through.
    var runSyllables = function (withPrompt) {
      var mine = ++token;
      delivered = false; busy = true; setState();
      var steps = (withPrompt ? [{ id: item.promptAudio, gap: 200, hi: -1 }] : [])
        .concat(item.units.map(function (id, i) { return { id: id, gap: i < item.units.length - 1 ? 350 : 0, hi: i }; }));
      var i = 0;
      var step = function () {
        if (mine !== token || !ctx.root.isConnected) return;
        if (i >= steps.length) { busy = false; delivered = true; highlight(-1); setState(); return; }
        var s = steps[i++];
        highlight(s.hi);
        ctx.play(s.id).then(function (ok) {
          if (mine !== token) return;
          if (!ok) { busy = false; highlight(-1); setState(); return; }
          win.setTimeout(step, s.gap || 0);
        });
      };
      step();
    };
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.syllable_blending_prompt }));
    var row = ctx.el('div', { class: 'row', 'aria-hidden': 'true', dir: 'ltr' });
    item.syllables.forEach(function (syllable) {
      var p = ctx.el('span', { class: 'slot', text: ctx.showLetters ? syllable : '●' });
      parts.push(p);
      row.appendChild(p);
    });
    ctx.root.appendChild(row);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { if (ctx.isDone()) return; ctx.support('syllableReplays'); runSyllables(false); } }, text: '▶ ' + ctx.L.syllable_blending_play }),
      ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('questionReplays'); runSyllables(true); } }, text: ctx.L.hear_question }),
    ]));
    ctx.root.appendChild(note);
    var list = ctx.el('ul', { class: 'choices' });
    item.choices.forEach(function (choice, i) {
      var n = i + 1;
      var card = { tried: false, answer: choice.text === item.target };
      var listen = ctx.el('button', { type: 'button',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_listen_word, { word: choice.text }) : ctx.fmt(ctx.L.syllable_blending_listen_option, { n: n }),
        on: { click: function () { if (busy) return; ctx.support('optionListens'); ctx.play(choice.audio); } } }, ['▶ ', ctx.L.syllable_blending_listen]);
      var choose = ctx.el('button', { type: 'button', class: 'primary',
        'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_choose_word, { word: choice.text }) : ctx.fmt(ctx.L.syllable_blending_choose_option, { n: n }),
        on: { click: function () {
          if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
          var right = String(choice.text || '').trim().toLowerCase() === String(item.target || '').trim().toLowerCase();
          var outcome = ctx.answer(choice.text, right, {
            correctText: ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_correct, { word: answerText }) : ctx.L.syllable_blending_correct_no_letters,
            retryText: ctx.L.syllable_blending_try_again,
            missedText: ctx.showLetters ? ctx.fmt(ctx.L.syllable_blending_missed, { word: answerText }) : ctx.L.syllable_blending_missed_no_letters,
          });
          if (outcome !== 'correct') { card.tried = true; box.classList.add('tried'); setState(); }
        } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: choice.text }) : ctx.fmt(ctx.L.syllable_blending_option_n, { n: n })]);
      var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
      card.box = box; card.choose = choose; card.listen = listen;
      cards.push(card);
      list.appendChild(box);
    });
    // Hear all (the player's ctx.hearAll): each choice in turn, marked with its number, once the syllables are not playing.
    hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ auto: false, ready: function () { return !busy; },
      list: function () { return cards.map(function (c, i) { return { box: c.box, say: function () { return ctx.play(item.choices[i].audio); } }; }); } }) : null;
    if (hear) ctx.root.appendChild(hear.node);
    ctx.root.appendChild(list);
    setState();
    if (!ctx.isDone()) runSyllables(true);
    return {
      // The R key: the question and the syllables again (the choices wait for them, as on the button).
      replay: function () { if (!ctx.isDone()) runSyllables(true); },
      reveal: function () {
        halt();
        cards.forEach(function (c) {
          c.choose.setAttribute('aria-disabled', 'true');
          if (c.answer && !c.box.classList.contains('right')) {
            c.box.classList.add('right');
            c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.syllable_blending_answer_mark);
          }
        });
      },
    };
  },
};
