// Word Sounds take-home activities: turn a prepared, reviewed lesson into ONE
// self-contained HTML file a learner can open on any device, offline, plus a
// results file (and, when the teacher has a Class Mailbox, an automatic send).
// Loaded on demand with window.__alloLoadPlugin('word_sounds_take_home_loader.js').
//
// Shape: a player SHELL (start, progress, attempts, feedback, saving, finish)
// and one ADAPTER per activity. An adapter has two halves:
//   prepare(word, env) -> { item } | { missing: [...] }   runs in the app
//   render(item, ctx)  -> { reveal() }                     runs in the file
// render is embedded with Function.prototype.toString, so it may use ONLY its
// arguments: everything it needs comes through ctx (see makeCtx below).
//
// The file carries only what each activity needs (an allowlist, never a copy
// of the pack), plays prepared recordings only (no speech engine, no network
// except an optional mailbox send, strict CSP), and grades sounds with
// WS_CORE.soundAnswerMatches, the function the app itself uses. Answers travel
// with the file to be graded offline, so they can be read in its source: this
// is for practice, not for tests.
(function (root) {
  'use strict';
  if (root.AlloWordSoundsTakeHome) return;

  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var RESULT_KIND = 'alloflow-take-home-result';
  var RESULT_SCHEMA = 2;
  var PLAYER = 'alloflow-word-sounds-take-home/2';
  var ORDINAL_KEYS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  var FEEDBACK_CORRECT = ['fb_great_job', 'fb_nice', 'fb_correct'];
  var FEEDBACK_RETRY = 'fb_try_again_listen';
  var MAX_ITEMS = 40;

  // Words the learner sees. Activity adapters add their own under their id
  // prefix (e.g. isolation_question). Translated through
  // word_sounds.take_home_player_<key> in the app.
  var DEFAULT_LABELS = {
    lang: 'en',
    title: 'Word Sounds practice',
    intro: 'Listen carefully and answer each question. You can hear everything again as many times as you like.',
    name_label: 'Your name or initials (optional)',
    start: 'Start',
    continue: 'Continue where I left off',
    start_over: 'Start over',
    item_of: '{activity}: {n} of {total}',
    hear_word: 'Hear the word',
    hear_question: 'Hear the question',
    listen_sound: 'Listen to sound {n}',
    choose_sound: 'Choose sound {n}',
    choose_label: 'Choose {sound}',
    sound_n: 'Sound {n}',
    correct: 'Yes! That is right.',
    try_again: 'Not quite. Listen again and try once more.',
    missed: 'Here is the answer. Listen.',
    next: 'Next',
    finish: 'See my results',
    done_title: 'You finished!',
    done_summary: 'Right on the first try: {first} of {total}.',
    done_retry: 'Right after trying again: {retry}.',
    save: 'Save my work as a file',
    send: 'Send my work to my teacher',
    sending: 'Sending...',
    sent: 'Sent. Your teacher\'s mailbox received it ({receipt}).',
    send_failed: 'It did not send. Save your work as a file instead, and give the file to your teacher.',
    saved_device: 'Your work is kept on this device until you start over.',
    saved_device_off: 'This browser cannot keep your work. Save it as a file before you close this page.',
    saved_file: 'Saved as {file}. Give this file to your teacher.',
    not_sent: 'Saving does not send anything. Your teacher gets your work when you give them the file.',
    send_note: 'Sending goes only to your teacher\'s school mailbox.',
    send_closed: 'Sending closed on {date}. Save your work as a file and give it to your teacher.',
    practice_again: 'Practice again',
    audio_missing: 'This sound could not play.',
    ordinals: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'],
  };

  function str(value) { return value == null ? '' : String(value); }
  function hashText(text) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function randomId() {
    try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (_) {}
    return 'th-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // ---------------------------------------------------------------------------
  // Adapter: Find Sounds (isolation)
  // ---------------------------------------------------------------------------
  var isolation = {
    id: 'isolation',
    title: 'Find Sounds',
    labels: {
      isolation_question: 'What is the {position} sound in the word?',
      isolation_correct: 'Yes! That is the {position} sound.',
      isolation_missed: 'The {position} sound is {sound}. Listen.',
      isolation_missed_no_letters: 'Here is the {position} sound. Listen.',
    },
    prepare: function (w, env) {
      var board = w.activityItems && w.activityItems.isolation;
      if (!board) return { missing: ['board'] };
      var target = env.label(board.correctSound);
      var labels = env.uniqueLabels(board.options);
      var position = Number.isInteger(board.position) && board.position >= 0 ? board.position : 0;
      if (!target || labels.length < 2 || labels.indexOf(target) < 0) return { missing: ['board'] };
      var missing = [];
      var wordAudio = env.wordClip(env.word);
      if (!wordAudio) missing.push('word');
      var prompt = env.bankClip('isolation', ORDINAL_KEYS[position]) ||
        env.packClip('what is the ' + ORDINAL_KEYS[position] + ' sound?') ||
        env.packClip('what is the ' + (DEFAULT_LABELS.ordinals[position] || '') + ' sound in ' + env.word + '?');
      if (!prompt) missing.push('question');
      var choices = labels.map(function (label) {
        var clip = env.phonemeClip(label);
        if (!clip) missing.push('/' + label + '/');
        return { label: label, audio: clip };
      });
      if (missing.length) return { missing: missing };
      var answer = choices.filter(function (c) { return c.label === target; })[0];
      return { item: { position: position, target: target, wordAudio: wordAudio, promptAudio: prompt, choices: choices,
        introAudio: [prompt, wordAudio], answerAudio: [wordAudio, answer.audio] } };
    },
    render: function (item, ctx) {
      var position = ctx.ordinal(item.position);
      var cards = [];
      var list = ctx.el('ul', { class: 'choices' });
      item.choices.forEach(function (choice, i) {
        var n = i + 1;
        var shown = ctx.showLetters ? '/' + choice.label + '/' : ctx.fmt(ctx.L.sound_n, { n: n });
        var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.listen_sound, { n: n }),
          on: { click: function () { ctx.support('soundListens'); ctx.play(choice.audio); } } }, ['\u25B6 ', ctx.fmt(ctx.L.sound_n, { n: n })]);
        var choose = ctx.el('button', { type: 'button', class: 'primary',
          'aria-label': ctx.showLetters ? ctx.fmt(ctx.L.choose_label, { sound: shown }) : ctx.fmt(ctx.L.choose_sound, { n: n }),
          on: { click: function () {
            if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
            var outcome = ctx.answer(choice.label, ctx.matches(choice.label, item.target), {
              correctText: ctx.fmt(ctx.L.isolation_correct, { position: position }),
              missedText: ctx.showLetters ? ctx.fmt(ctx.L.isolation_missed, { position: position, sound: '/' + item.target + '/' })
                : ctx.fmt(ctx.L.isolation_missed_no_letters, { position: position }),
            });
            if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
          } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: shown }) : ctx.fmt(ctx.L.choose_sound, { n: n })]);
        var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
        cards.push({ box: box, choose: choose, label: choice.label });
        list.appendChild(box);
      });
      ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(ctx.L.isolation_question, { position: position }) }));
      ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
        ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
        ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
      ]));
      ctx.root.appendChild(list);
      return {
        // Called once the item is over (right, or missed twice): lock it and
        // show which choice was right.
        reveal: function () {
          cards.forEach(function (c) { c.choose.setAttribute('aria-disabled', 'true'); if (c.label === item.target) c.box.classList.add('right'); });
        },
      };
    },
  };

  var ADAPTERS = { isolation: isolation };
  // BEGIN GENERATED ADAPTERS (dev-tools/build_word_sounds_take_home.cjs)
  ADAPTERS["blending"] = (function () {
    var module = { exports: {} };
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
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('soundReplays'); run(soundSteps()); } }, text: ctx.L.blending_hear_sounds }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('optionReplays'); run(optionSteps(600)); } }, text: ctx.L.blending_play_all }),
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
    return module.exports;
  })();
  ADAPTERS["counting"] = (function () {
    var module = { exports: {} };
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
        return { item: { target: target, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+'];
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
          var box = ctx.el('li', { class: 'choice solo', style: 'padding:6px' }, [button]);
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
    return module.exports;
  })();
  ADAPTERS["decoding"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Read & Match (decoding).
    // App: board { choices: [word + 3 others] } (word_sounds_setup_source.jsx:4717,4816);
    // pictures from the pack's shared image manifest (_decodingAssets/_aacAssets on
    // the first row, row images win: word_sounds_module.js:8139-8152, setup
    // 5231-5254,5552); the grid shows only when EVERY choice has its picture
    // (word_sounds_module.js:20798-20805). The printed word is never spoken
    // (17169-17171). Graded at word_sounds_module.js:20808 ->
    // checkAnswer(choice, word): lower-cased, trimmed comparison
    // (17099-17113), 2 tries.

    // Pictures this export has seen so far, by the app's precedence. prepare()
    // receives one row; the manifest rides on the first row, which comes first.
    var lib = { key: null, manifest: {}, rows: {} };
    function remember(w, env) {
      if (lib.key !== env.packClip) lib = { key: env.packClip, manifest: {}, rows: {} };
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { lib.manifest[k] = bucket[k]; });
      });
      var key = String((w && (w.targetWord || w.word || w.term)) || '').trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image.indexOf('ref::') !== 0) lib.rows[key] = w.image;
    }
    function pictureFor(text, env) {
      var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
      if (!raw) { var lc = String(text || '').toLowerCase(); raw = lib.rows[lc] || lib.manifest[lc] || null; }
      if (typeof raw !== 'string' || !raw) return null;
      if (/^https?:/i.test(raw)) return null; // cannot travel inside an offline file
      return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
    }

    module.exports = {
      id: 'decoding',
      title: 'Read & Match',
      labels: {
        decoding_prompt: 'Read the word, then tap its picture!',
        decoding_hear_instructions: 'Hear the instructions',
        decoding_picture_of: 'Picture of {word}',
        decoding_correct: 'Yes! You read the word.',
        decoding_missed: 'This picture goes with {word}.',
        decoding_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        remember(w, env);
        var board = w && w.activityItems && w.activityItems.decoding;
        var word = String(env.word);
        var target = word.toLowerCase();
        var choices = board && Array.isArray(board.choices) ? board.choices.filter(function (c) { return typeof c === 'string' && c; }) : [];
        // word_sounds_module.js:13043-13048.
        if (choices.length < 2 || !choices.some(function (c) { return c.toLowerCase() === target; })) return { missing: ['board'] };
        var missing = [];
        var pics = choices.map(function (c) {
          var id = pictureFor(c, env);
          if (!id) missing.push('picture:' + c.toLowerCase());
          return id;
        });
        if (missing.length) return { missing: missing };
        // The app speaks only its prompt text; setup does not prepare a clip for
        // it, so a pack that has one is a bonus, not a requirement.
        var prompt = env.packClip('Read the word, then tap its picture!');
        return { item: { target: word, printed: word, prompt: prompt,
          choices: choices.map(function (c, i) { return { text: c, image: pics[i] }; }),
          introAudio: prompt ? [prompt] : [], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var cards = [];
        var norm = function (s) { return String(s == null ? '' : s).toLowerCase().trim(); };
        var list = ctx.el('ul', { class: 'choices' });
        item.choices.forEach(function (choice) {
          var right = norm(choice.text) === norm(item.target);
          var src = ctx.image(choice.image);
          var name = ctx.fmt(ctx.L.decoding_picture_of, { word: choice.text });
          var pick = ctx.el('button', { type: 'button', 'aria-label': name, style: 'width:100%;display:flex;justify-content:center;background:#fff',
            on: { click: function () {
              if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(choice.text, right, {
                correctText: ctx.L.decoding_correct,
                missedText: ctx.fmt(ctx.L.decoding_missed, { word: item.printed }),
              });
              if (outcome !== 'correct') { box.classList.add('tried'); pick.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.el('img', { class: 'picture', src: src || '', alt: '' })]);
          var box = ctx.el('li', { class: 'choice' }, [pick]);
          cards.push({ box: box, pick: pick, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.decoding_prompt }));
        // The printed word, as the app shows it (CSS capitalize).
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', style: 'font-size:3rem;text-transform:capitalize;margin:8px 0', text: item.printed }));
        if (item.prompt) {
          ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
            ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.decoding_hear_instructions }),
          ]));
        }
        ctx.root.appendChild(list);
        return {
          reveal: function () {
            cards.forEach(function (c) {
              c.pick.setAttribute('aria-disabled', 'true');
              if (c.right && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.pick.setAttribute('aria-label', c.pick.getAttribute('aria-label') + ' ' + ctx.L.decoding_answer_mark);
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["letter_tracing"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Letter Trace (letter_tracing).
    // App source of truth (word_sounds_module.js):
    //   board       activityItems.letter_tracing = { letter: word[0] } (setup), and the
    //               player traces the word's first letter; a board copied from another
    //               word is never used (the letter must be the word's first letter).
    //   grading     none: letter_tracing is in WS_NON_GRADED_ACTIVITIES, so the file
    //               records it as practice ("traced" or "skipped"), never right or wrong.
    //   access      pointer events cover mouse, touch and pen; "Skip (not traced)" is the
    //               path for a student who cannot trace (2026-11-07 parity audit).
    module.exports = {
      id: 'letter_tracing',
      title: 'Letter Trace',
      labels: {
        letter_tracing_question: 'Trace the letter {letter} with your finger, a pen or the mouse.',
        letter_tracing_canvas: 'Tracing area for the letter {letter}',
        letter_tracing_done: 'I traced it',
        letter_tracing_clear: 'Start again',
        letter_tracing_skip: 'Skip (not traced)',
        letter_tracing_more: 'Keep going. Trace over more of the letter.',
        letter_tracing_stay: 'Stay on the letter. Press Start again and trace inside its shape.',
        letter_tracing_traced: 'Nice tracing!',
        letter_tracing_skipped: 'Skipped. That is fine.',
      },
      prepare: function (w, env) {
        var word = String((w && (w.targetWord || w.word || w.term)) || '').trim();
        var first = Array.from(word)[0] || '';
        var board = w && w.activityItems && w.activityItems.letter_tracing;
        var letter = String((board && board.letter) || first).trim();
        if (!letter || !first || Array.from(letter).length !== 1 || letter.toLowerCase() !== first.toLowerCase()) return { missing: ['board'] };
        // Tracing is visual: the spoken instruction and the word are helpful, not required.
        var wordAudio = env.wordClip(word);
        var prompt = env.bankClip('instructions', 'inst_letter_tracing');
        var intro = [];
        if (prompt) intro.push(prompt);
        if (wordAudio) intro.push(wordAudio);
        return { item: { target: letter.toLowerCase(), letter: letter, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: intro, answerAudio: wordAudio ? [wordAudio] : [] } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var doc = ctx.root.ownerDocument;
        var size = 280;
        var wrap = ctx.el('div', { style: 'position:relative;width:' + size + 'px;height:' + size + 'px;max-width:100%;margin:12px auto;border:2px dashed var(--muted);border-radius:16px;touch-action:none' });
        var guide = doc.createElement('canvas');
        var pen = doc.createElement('canvas');
        [guide, pen].forEach(function (c) {
          c.width = size; c.height = size;
          c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none';
          wrap.appendChild(c);
        });
        pen.setAttribute('role', 'img');
        pen.setAttribute('aria-label', ctx.fmt(L.letter_tracing_canvas, { letter: item.letter }));
        var font = 'bold ' + Math.round(size * 0.78) + 'px system-ui, sans-serif';
        var paint = function (g, color) {
          g.clearRect(0, 0, size, size);
          g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(item.letter, size / 2, size * 0.54);
        };
        var gg = guide.getContext ? guide.getContext('2d') : null;
        var pg = pen.getContext ? pen.getContext('2d') : null;
        if (gg) paint(gg, 'rgba(100,116,139,0.35)');
        var drawing = false, last = null;
        var at = function (e) {
          var r = pen.getBoundingClientRect();
          return { x: (e.clientX - r.left) * size / (r.width || size), y: (e.clientY - r.top) * size / (r.height || size) };
        };
        var line = function (a, b) {
          if (!pg) return;
          pg.strokeStyle = '#1d4ed8'; pg.lineWidth = size * 0.08; pg.lineCap = 'round'; pg.lineJoin = 'round';
          pg.beginPath(); pg.moveTo(a.x, a.y); pg.lineTo(b.x, b.y); pg.stroke();
        };
        pen.addEventListener('pointerdown', function (e) {
          if (ctx.isDone()) return;
          drawing = true; last = at(e); line(last, last);
          try { pen.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
        });
        pen.addEventListener('pointermove', function (e) {
          if (!drawing) return;
          var p = at(e); line(last, p); last = p; e.preventDefault();
        });
        var stop = function () { drawing = false; last = null; };
        pen.addEventListener('pointerup', stop);
        pen.addEventListener('pointercancel', stop);
        // How much of the letter the strokes cover, and how much ink lands well away from it
        // (scribbling over the whole box is not tracing). Every 4th pixel is enough.
        var measure = function () {
          if (!gg || !pg) return { cover: 1, stray: 0 };
          var mask = doc.createElement('canvas'); mask.width = size; mask.height = size;
          var mg = mask.getContext('2d'); paint(mg, '#000');
          var halo = doc.createElement('canvas'); halo.width = size; halo.height = size;
          var hg = halo.getContext('2d'); paint(hg, '#000');
          hg.lineWidth = size * 0.14; hg.lineJoin = 'round'; hg.strokeStyle = '#000'; hg.strokeText(item.letter, size / 2, size * 0.54);
          var m = mg.getImageData(0, 0, size, size).data, hd = hg.getImageData(0, 0, size, size).data, p = pg.getImageData(0, 0, size, size).data;
          var inside = 0, covered = 0, ink = 0, away = 0;
          for (var i = 3; i < m.length; i += 16) {
            if (m[i] > 128) { inside++; if (p[i] > 0) covered++; }
            if (p[i] > 0) { ink++; if (hd[i] <= 128) away++; }
          }
          return { cover: inside ? covered / inside : 0, stray: ink ? away / ink : 0 };
        };
        var note = ctx.el('p', { class: 'letters', 'aria-live': 'polite' });
        var hear = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio || item.promptAudio); } }, text: ctx.L.hear_word });
        var done = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () {
          if (ctx.isDone()) return;
          var m = measure();
          if (m.stray > 0.5) { note.textContent = L.letter_tracing_stay; return; }
          if (m.cover < 0.45) { note.textContent = L.letter_tracing_more; return; }
          note.textContent = '';
          ctx.practice('traced', L.letter_tracing_traced);
        } }, text: L.letter_tracing_done });
        var clear = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; if (pg) pg.clearRect(0, 0, size, size); note.textContent = ''; } }, text: L.letter_tracing_clear });
        var skip = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.practice('skipped', L.letter_tracing_skipped); } }, text: L.letter_tracing_skip });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.letter_tracing_question, { letter: item.letter }) }));
        if (item.wordAudio || item.promptAudio) ctx.root.appendChild(ctx.el('div', { class: 'row' }, [hear]));
        ctx.root.appendChild(wrap);
        ctx.root.appendChild(note);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:12px' }, [done, clear, skip]));
        return {
          reveal: function () { [done, clear, skip].forEach(function (b) { b.setAttribute('aria-disabled', 'true'); }); },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["manipulation"] = (function () {
    var module = { exports: {} };
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
    module.exports = {
      id: 'manipulation',
      title: 'Sound Swap',
      labels: {
        manipulation_prompt: 'Swap the sound to make a new word!',
        manipulation_type_deletion: 'Phoneme Deletion',
        manipulation_type_substitution: 'Phoneme Substitution',
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
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
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
        ctx.root.appendChild(list);
        // Opening sequence (word_sounds_module.js:16890-16937): the instruction,
        // 400 ms, then every choice in turn with 350 ms between.
        if (!ctx.isDone()) {
          run(instructionSteps(400).concat(item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
        }
        return {
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
    return module.exports;
  })();
  ADAPTERS["mapping"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Sound Mapping (mapping).
    // App source of truth:
    //   board   compileActivityItems (word_sounds_setup_source.jsx:4678-4683, 4807-4809):
    //           { graphemes: one spelling per sound, joined = the word, chipOrder: shuffled
    //           [{ id, text }] } or { supported: false, contentStatus: 'teacher_review_required' }.
    //   data    soundMappingGraphemes (word_sounds_module.js:5018-5029): no board when
    //           unsupported/review-required; else the first of board.graphemes,
    //           item.graphemes, phoneme .grapheme fields, the word's letters whose length
    //           equals the phoneme count and whose join is the word.
    //   view    SoundMappingView (word_sounds_module.js:5030-5170): the word stays printed
    //           (SMART_TEXT_VISIBILITY mapping 'alwaysOn', :7563), one slot per spelling,
    //           a chip tray, tapping a chip fills the first empty slot and plays it,
    //           tapping a filled slot empties it, "Listen to Word".
    //   grading :5062-5066: as soon as the LAST slot fills, every slot's text must equal
    //           graphemes[i] (plain string compare); onCheckAnswer -> checkAnswer(ans,
    //           "correct") (:19681). Default budget 2 tries (:17130); a first miss stays
    //           on the board, editable.
    //   audio   instruction clip "mapping" (INST_KEY_MAP :16458); the word on request.
    module.exports = {
      id: 'mapping',
      title: 'Sound Mapping',
      labels: {
        mapping_question: 'Put the spellings in order to build the word.',
        mapping_how: 'Tap a spelling to pick it up, then tap a slot to put it there. Tap a filled slot to take it out.',
        mapping_word: 'The word: {word}',
        mapping_tray: 'Spellings to place',
        mapping_slots: 'Spelling slots',
        mapping_slot_empty: 'Slot {n}, empty',
        mapping_slot_filled: 'Slot {n}: {spelling}',
        mapping_pick: 'Pick up {spelling}',
        mapping_listen: 'Listen to the sound of {spelling}',
        mapping_picked: '{spelling} picked up. Now choose a slot.',
        mapping_dropped: '{spelling} put back.',
        mapping_placed: '{spelling} is in slot {n}.',
        mapping_removed: '{spelling} taken out of slot {n}.',
        mapping_cleared: 'All the slots are empty again.',
        mapping_clear: 'Empty the slots',
        mapping_auto: 'Your answer is checked when every slot is full.',
        mapping_retry: 'Not quite. Take out a spelling and move it, then try once more.',
        mapping_correct: 'Yes! You spelled every sound.',
        mapping_missed: 'This is how the sounds are spelled: {spellings}. Listen.',
      },
      prepare: function (w, env) {
        var board = w && w.activityItems && w.activityItems.mapping;
        if (!board) return { missing: ['board'] };
        if (board.supported === false || board.unavailable || /review_required|needs_review/.test(board.contentStatus || '')) return { missing: ['board'] };
        var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
        var spelling = String(env.word || '').trim().normalize('NFC').toLowerCase();
        var graphemes = [board.graphemes, w.graphemes, phonemes.map(function (p) { return p && typeof p === 'object' ? p.grapheme : ''; }), spelling.split('')]
          .filter(function (values) {
            return Array.isArray(values) && values.length > 0 && values.length === phonemes.length &&
              values.every(function (v) { return typeof v === 'string' && v.trim(); }) &&
              values.join('').trim().normalize('NFC').toLowerCase() === spelling;
          })[0];
        if (!graphemes) return { missing: ['board'] };
        graphemes = graphemes.map(String);
        // Tray order: the prepared chipOrder when it is a true shuffle of these
        // spellings. (The view reshuffles randomly; a file needs a fixed order.)
        var order = Array.isArray(board.chipOrder) && board.chipOrder.length === graphemes.length &&
          board.chipOrder.every(function (c) { return c && Number.isInteger(c.id) && graphemes[c.id] === String(c.text); }) &&
          board.chipOrder.map(function (c) { return c.id; }).filter(function (id, i, all) { return all.indexOf(id) === i; }).length === graphemes.length
          ? board.chipOrder.map(function (c) { return c.id; }) : graphemes.map(function (_, i) { return i; }).reverse();
        var inOrder = order.every(function (id, i) { return graphemes[id] === graphemes[i]; });
        if (inOrder && graphemes.length > 1) { var t = order[0]; order[0] = order[1]; order[1] = t; }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'mapping');
        if (!prompt) missing.push('question');
        // Each chip plays its sound: the word's own sound at that position.
        var clips = graphemes.map(function (g, i) {
          var label = env.label(phonemes[i]);
          var clip = (label && env.phonemeClip(label)) || env.phonemeClip(g);
          if (!clip) missing.push('/' + (label || g) + '/');
          return clip;
        });
        if (missing.length) return { missing: missing };
        return { item: {
          target: graphemes.join(' '), graphemes: graphemes,
          chips: order.map(function (id) { return { text: graphemes[id], audio: clips[id] }; }),
          wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt], answerAudio: [wordAudio],
        } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var n = item.graphemes.length;
        var slots = [];
        for (var s = 0; s < n; s++) slots.push(null);
        var picked = null;
        var locked = function () { return ctx.isDone(); };
        var text = function (ci) { return item.chips[ci].text; };

        var tray = ctx.el('ul', { class: 'row', 'aria-label': L.mapping_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
        var chipEls = item.chips.map(function (chip, ci) {
          var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false',
            'aria-label': ctx.fmt(L.mapping_pick, { spelling: chip.text }),
            style: 'min-width:72px;min-height:56px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onChip(ci); } } }, [chip.text]);
          var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(L.mapping_listen, { spelling: chip.text }),
            on: { click: function () { ctx.support('soundListens'); ctx.play(chip.audio); } } }, ['▶']);
          var li = ctx.el('li', { class: 'row', style: 'gap:6px;border:2px solid var(--line);border-radius:14px;padding:6px' }, [pick, listen]);
          tray.appendChild(li);
          return { li: li, pick: pick };
        });
        var slotList = ctx.el('ol', { class: 'slots', 'aria-label': L.mapping_slots });
        var slotEls = slots.map(function (_, si) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:80px;min-height:80px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onSlot(si); } } });
          slotList.appendChild(ctx.el('li', {}, [btn]));
          return btn;
        });
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          picked = null;
          for (var i = 0; i < n; i++) slots[i] = null;
          draw(); ctx.announce(L.mapping_cleared);
        } }, text: L.mapping_clear });

        var draw = function () {
          chipEls.forEach(function (c, ci) {
            c.li.hidden = slots.indexOf(ci) >= 0;
            c.pick.setAttribute('aria-pressed', picked === ci ? 'true' : 'false');
            if (locked()) c.pick.setAttribute('aria-disabled', 'true');
          });
          slotEls.forEach(function (btn, si) {
            var ci = slots[si];
            btn.textContent = ci == null ? String(si + 1) : text(ci);
            btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
            btn.style.borderColor = ci == null ? 'var(--muted)' : 'var(--accent)';
            btn.setAttribute('aria-label', ci == null ? ctx.fmt(L.mapping_slot_empty, { n: si + 1 }) : ctx.fmt(L.mapping_slot_filled, { n: si + 1, spelling: text(ci) }));
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
        };
        var onChip = function (ci) {
          if (locked() || slots.indexOf(ci) >= 0) return;
          if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_dropped, { spelling: text(ci) })); return; }
          picked = ci;
          draw();
          ctx.play(item.chips[ci].audio);
          ctx.announce(ctx.fmt(L.mapping_picked, { spelling: text(ci) }));
          var empty = slots.indexOf(null);
          slotEls[empty >= 0 ? empty : 0].focus();
        };
        var onSlot = function (si) {
          if (locked()) return;
          if (picked == null) {
            var out = slots[si];
            if (out == null) { ctx.announce(L.mapping_how); return; }
            slots[si] = null;
            draw();
            ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(out), n: si + 1 }));
            return;
          }
          var ci = picked;
          picked = null;
          slots[si] = ci; // a chip already there goes back to the tray
          draw();
          if (slots.indexOf(null) >= 0) {
            ctx.play(item.chips[ci].audio);
            ctx.announce(ctx.fmt(L.mapping_placed, { spelling: text(ci), n: si + 1 }));
            for (var k = 0; k < chipEls.length; k++) if (slots.indexOf(k) < 0) { chipEls[k].pick.focus(); break; }
            return;
          }
          // The last slot filled: grade the arrangement now (:5062-5066).
          var right = slots.every(function (c, i) { return String(text(c)) === String(item.graphemes[i]); });
          ctx.answer(slots.map(text).join(' '), right, {
            correctText: L.mapping_correct,
            retryText: L.mapping_retry,
            missedText: ctx.fmt(L.mapping_missed, { spellings: item.graphemes.join(' ') }),
          });
          // A first miss stays on the board to be fixed.
        };

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.mapping_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.mapping_word, { word: item.word }) }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.mapping_how + ' ' + L.mapping_auto }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
        ]));
        ctx.root.appendChild(slotList);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn]));
        ctx.root.appendChild(tray);
        draw();
        return {
          reveal: function (correct) {
            picked = null;
            if (!correct) {
              var used = [];
              for (var i = 0; i < n; i++) {
                var hit = -1;
                for (var ci = 0; ci < item.chips.length && hit < 0; ci++) if (used.indexOf(ci) < 0 && item.chips[ci].text === item.graphemes[i]) hit = ci;
                used.push(hit);
                slots[i] = hit;
              }
            }
            draw();
            slotEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["missing_letter"] = (function () {
    var module = { exports: {} };
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
          var box = ctx.el('li', { class: 'choice solo', style: 'padding:6px' }, [button]);
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
    return module.exports;
  })();
  ADAPTERS["orthography"] = (function () {
    var module = { exports: {} };
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
        var extra = [];
        word.toLowerCase().split('').forEach(function (ch) {
          if (!/[a-z]/.test(ch) && extra.indexOf(ch) < 0 && ch.trim()) extra.push(ch);
        });
        return { item: { target: word.toLowerCase(), extraTiles: extra, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var lastSubmitted = null;
        var inputId = 'ortho-' + String(item.id || 'x').replace(/[^a-z0-9-]/gi, '');
        var input = ctx.el('input', { id: inputId, type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
          maxlength: '40', style: 'font-size:1.6rem;font-weight:700;letter-spacing:.1em;text-transform:lowercase;text-align:center', on: {
            input: function () { lastSubmitted = null; },
            keydown: function (e) {
              if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              submit();
            },
          } });
        var edit = function (value) {
          if (ctx.isDone()) return;
          input.value = value;
          lastSubmitted = null;
        };
        var submit = function () {
          if (ctx.isDone()) return;
          var answer = String(input.value || '').trim().toLowerCase();
          if (!answer) { ctx.announce(ctx.L.orthography_empty); return; }
          // OrthographyView ignores a resubmit of the same unchanged spelling.
          if (answer === lastSubmitted) { ctx.announce(ctx.L.orthography_same); return; }
          lastSubmitted = answer;
          ctx.answer(answer, answer === item.target, {
            correctText: ctx.fmt(ctx.L.orthography_correct, { word: item.target }),
            missedText: ctx.fmt(ctx.L.orthography_missed, { word: item.target }),
          });
          // On a retry the spelling stays in the box to be fixed, as in the app.
        };
        var letters = 'abcdefghijklmnopqrstuvwxyz'.split('').concat(item.extraTiles || []);
        var tiles = letters.map(function (letter) {
          return ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.orthography_add, { letter: letter }),
            style: 'min-width:52px;font-size:1.3rem;font-weight:700;padding:6px 10px',
            on: { click: function () { edit(String(input.value || '') + letter); } } }, [letter]);
        });
        var back = ctx.el('button', { type: 'button', on: { click: function () { edit(String(input.value || '').slice(0, -1)); } }, text: ctx.L.orthography_backspace });
        var clear = ctx.el('button', { type: 'button', on: { click: function () { edit(''); } }, text: ctx.L.orthography_clear });
        var check = ctx.el('button', { type: 'button', class: 'primary', on: { click: submit }, text: ctx.L.orthography_check });
        var answerLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(ctx.L.orthography_answer, { word: item.target }) });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.orthography_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(ctx.el('label', { for: inputId, text: ctx.L.orthography_input }));
        ctx.root.appendChild(input);
        ctx.root.appendChild(ctx.el('div', { class: 'row', role: 'group', 'aria-label': ctx.L.orthography_tiles, style: 'margin:16px 0;gap:8px' }, tiles));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [back, clear, check]));
        ctx.root.appendChild(answerLine);
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
    return module.exports;
  })();
  ADAPTERS["read_passage"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Read the Story (read_passage).
    // App: board { story, parts: [{text} | {before, after}], options: [word + 3] }
    // built from a gated three-sentence story, one blank per sentence that holds
    // the word (word_sounds_setup_source.jsx:4742-4768, splitPackSentence
    // 2474-2483, packStoryIsUsable 2504-2527). The player takes it when story is
    // set, some part is a blank and options (>= 2) hold the word
    // (word_sounds_module.js:13128-13167) and prints every part, one choice
    // filling every blank (20929-21028). Picture clue, else "Your word:" card
    // (20938-20945,20978-20989). Graded by tap at 20946-20954 -> checkAnswer(w,
    // rpWord): lower-cased, trimmed comparison (17099-17113), 2 tries. The prompt,
    // story and per-sentence clips are packed by setup (5423-5436); after a right
    // answer the app reads the story back line by line when the sentence split
    // matches the parts, else the whole-story clip (17301-17337).

    var SPLIT = /(?<=[.!?])\s+/;
    function pictureFor(text, env) {
      var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
      if (typeof raw !== 'string' || !raw || /^https?:/i.test(raw)) return null;
      return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
    }
    // A blank line as printed: the authored sentence when the fragments locate the
    // word in it (WS_CORE.preparedSentenceParts), else the app's own layout of the
    // trimmed fragments, sentence-initial blanks capitalized (20973).
    function blankLine(core, sentence, part, word) {
      var located = typeof sentence === 'string' ? core.preparedSentenceParts(sentence, part.before, word, part.after) : null;
      if (located) return { before: located.before, answer: located.answer, after: located.after };
      return {
        before: part.before ? part.before + ' ' : '',
        answer: part.before ? word : word.charAt(0).toUpperCase() + word.slice(1),
        after: part.after ? (/^[.,!?;:]/.test(part.after) ? '' : ' ') + part.after : '',
      };
    }

    module.exports = {
      id: 'read_passage',
      title: 'Read the Story',
      labels: {
        read_passage_prompt: 'Read the story. Which word finishes it?',
        read_passage_picture_practice: 'Use the picture to choose a word.',
        read_passage_matching_practice: 'Match your word to a choice.',
        read_passage_word_hint: 'Your word:',
        read_passage_picture_clue: 'Picture clue: {word}',
        read_passage_story: 'Story',
        read_passage_blank: 'blank',
        read_passage_hear_instructions: 'Hear the instructions',
        read_passage_hear_story: 'Hear the story',
        read_passage_choose: 'Choose {word}',
        read_passage_correct: 'Yes! That word finishes the story.',
        read_passage_missed: 'The word {word} finishes the story.',
        read_passage_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        var core = env.core;
        var board = w && w.activityItems && w.activityItems.read_passage;
        var word = String(env.word);
        var lower = word.toLowerCase().trim();
        var story = board && typeof board.story === 'string' ? board.story.trim() : '';
        var parts = board && Array.isArray(board.parts) ? board.parts : [];
        var raw = board && Array.isArray(board.options) ? board.options.map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean) : [];
        // The player's gate (13137-13147).
        if (!story || !parts.some(function (p) { return p && !p.text; }) || raw.length < 2) return { missing: ['board'] };
        var options = [], seen = {};
        raw.forEach(function (o) { var k = o.toLowerCase(); if (!seen[k]) { seen[k] = true; options.push(o); } });
        if (!seen[lower] || options.length < 2) return { missing: ['board'] };
        var sentences = story.split(SPLIT).map(function (s) { return s.trim(); }).filter(Boolean);
        var aligned = sentences.length === parts.length;
        var lines = parts.map(function (p, i) {
          if (p && p.text) return { text: String(p.text) };
          var part = { before: String((p && p.before) || '').trim(), after: String((p && p.after) || '').trim() };
          return blankLine(core, aligned ? sentences[i] : null, part, word);
        });
        var prompt = env.packClip('Read the story. Which word finishes it?');
        if (!prompt) return { missing: ['question'] };
        // Read-back (17318-17336): line by line when the split matches the parts,
        // else the whole-story clip. Optional: the item is complete without it.
        var readBack = [];
        if (aligned && sentences.length > 1) {
          var lineClips = sentences.map(function (s) { return env.packClip(s); });
          if (lineClips.every(Boolean)) readBack = lineClips;
        }
        if (!readBack.length) { var whole = env.packClip(story); if (whole) readBack = [whole]; }
        return { item: { target: word, lines: lines, options: options, picture: pictureFor(word, env), prompt: prompt,
          readBack: readBack, readBackByLine: readBack.length > 1, introAudio: [prompt], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var norm = function (s) { return String(s == null ? '' : s).toLowerCase().trim(); };
        var picture = ctx.image(item.picture);
        var blanks = [];
        var lineNodes = [];
        var storyBox = ctx.el('div', { role: 'group', 'aria-label': ctx.L.read_passage_story, class: 'letters', lang: 'en',
          style: 'font-size:1.6rem;border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:12px 0' });
        item.lines.forEach(function (line) {
          var node;
          if (line.text != null) node = ctx.el('p', { style: 'margin:6px 0;padding:2px 6px;border-radius:8px', text: line.text });
          else {
            var blank = ctx.el('span', { style: 'display:inline-block;min-width:4.5em;border-bottom:3px dashed var(--muted);text-align:center' }, [
              ctx.el('span', { 'aria-hidden': 'true', text: '\u00a0' }), ctx.el('span', { class: 'sr', text: ctx.L.read_passage_blank })]);
            blanks.push({ node: blank, answer: line.answer });
            node = ctx.el('p', { style: 'margin:6px 0;padding:2px 6px;border-radius:8px;white-space:pre-wrap' }, [line.before, blank, line.after]);
          }
          lineNodes.push(node);
          storyBox.appendChild(node);
        });
        var after = ctx.el('div', { class: 'row' });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.read_passage_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: picture ? ctx.L.read_passage_picture_practice : ctx.L.read_passage_matching_practice }));
        if (picture) ctx.root.appendChild(ctx.el('img', { class: 'picture', src: picture, alt: ctx.fmt(ctx.L.read_passage_picture_clue, { word: item.target }) }));
        else ctx.root.appendChild(ctx.el('p', {}, [ctx.L.read_passage_word_hint + ' ', ctx.el('span', { class: 'letters', lang: 'en', text: item.target.toLowerCase() })]));
        ctx.root.appendChild(storyBox);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { run++; mark(-1); ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.read_passage_hear_instructions }),
        ]));
        var cards = [];
        var list = ctx.el('ul', { class: 'choices' });
        item.options.forEach(function (option) {
          var right = norm(option) === norm(item.target);
          var choose = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': ctx.fmt(ctx.L.read_passage_choose, { word: option }),
            on: { click: function () {
              if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(option, right, { correctText: ctx.L.read_passage_correct, missedText: ctx.fmt(ctx.L.read_passage_missed, { word: item.target }) });
              if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.el('span', { class: 'letters', lang: 'en', style: 'text-transform:lowercase', text: option })]);
          var box = ctx.el('li', { class: 'choice' }, [choose]);
          cards.push({ box: box, choose: choose, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(list);
        ctx.root.appendChild(after);
        // Follow-along read-back: each line is highlighted while its clip plays.
        // A newer run, or leaving the screen (which pauses the clip), ends the old one.
        var run = 0;
        var mark = function (index) {
          lineNodes.forEach(function (n, i) {
            var on = i === index;
            n.style.background = on ? 'var(--ok-bg)' : '';
            if (on) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current');
          });
        };
        var readBack = function () {
          var mine = ++run;
          ctx.support('storyReadBacks');
          if (!item.readBackByLine) { mark(-1); ctx.play(item.readBack[0]); return; }
          var step = function (i) {
            if (mine !== run) return;
            if (i >= item.readBack.length) { mark(-1); return; }
            mark(i);
            ctx.play(item.readBack[i]).then(function () { step(i + 1); });
          };
          step(0);
        };
        return {
          reveal: function () {
            // Every blank fills with the word as written in its sentence.
            blanks.forEach(function (b) {
              b.node.textContent = b.answer;
              b.node.style.borderBottomStyle = 'solid';
              b.node.style.color = 'var(--ok)';
            });
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.right && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.read_passage_answer_mark);
              }
            });
            if (item.readBack && item.readBack.length && !after.childNodes.length) {
              after.appendChild(ctx.el('button', { type: 'button', on: { click: readBack }, text: ctx.L.read_passage_hear_story }));
            }
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["read_sentence"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Finish the Sentence (read_sentence).
    // App: board { sentence, before, after, options: [word + 3] } built from a
    // gated sentence (word_sounds_setup_source.jsx:4725-4741,4817); the player
    // takes it when the sentence is set and options (>= 2) hold the word
    // (word_sounds_module.js:13083-13118). The blank is located in the authored
    // sentence with WS_CORE.preparedSentenceParts, as the app's printable copy
    // does (wsPresentSentenceParts, word_sounds_module.js:6205-6226,6367-6389).
    // A picture of the word anchors meaning; without one the app prints the word
    // ("Your word:") and the item becomes print matching (20838-20882). Graded at
    // word_sounds_module.js:20848-20855 -> checkAnswer(choice, word): lower-cased,
    // trimmed comparison (17099-17113), 2 tries. Instruction and read-back clips
    // are packed by setup (5414-5422), read-back after a right answer (17301-17337).

    var lib = { key: null, manifest: {}, rows: {} };
    function remember(w, env) {
      if (lib.key !== env.packClip) lib = { key: env.packClip, manifest: {}, rows: {} };
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { lib.manifest[k] = bucket[k]; });
      });
      var key = String((w && (w.targetWord || w.word || w.term)) || '').trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image.indexOf('ref::') !== 0) lib.rows[key] = w.image;
    }
    function pictureFor(text, env) {
      var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
      if (!raw) { var lc = String(text || '').toLowerCase(); raw = lib.rows[lc] || lib.manifest[lc] || null; }
      if (typeof raw !== 'string' || !raw) return null;
      if (/^https?:/i.test(raw)) return null;
      return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
    }
    // wsPresentSentenceParts (word_sounds_module.js:6205-6226).
    function sentenceParts(core, sentence, board, word) {
      if (board.before != null || board.after != null) {
        var part = core.preparedSentenceParts(sentence, board.before, word, board.after);
        if (part || board.before !== '' || board.after !== '') return part;
      }
      var literal = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var segments = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'word' }).segment(sentence) : null;
      var result = null;
      var re = new RegExp(literal, 'giu');
      var match;
      while ((match = re.exec(sentence))) {
        var start = match.index, end = start + match[0].length;
        var before = sentence.slice(0, start), after = sentence.slice(end);
        if (segments) {
          var last = segments.containing(end - 1);
          if (segments.containing(start).index !== start || last.index + last.segment.length !== end) continue;
        } else if (/[\p{L}\p{M}\p{N}_'’]$/u.test(before) || /^[\p{L}\p{M}\p{N}_'’]/u.test(after)) continue;
        if (result) return null;
        result = core.preparedSentenceParts(sentence, before, word, after);
      }
      return result;
    }

    module.exports = {
      id: 'read_sentence',
      title: 'Finish the Sentence',
      labels: {
        read_sentence_prompt: 'Read the sentence. Which word finishes it?',
        read_sentence_picture_practice: 'Use the picture to choose a word.',
        read_sentence_matching_practice: 'Match your word to a choice.',
        read_sentence_word_hint: 'Your word:',
        read_sentence_picture_clue: 'Picture clue: {word}',
        read_sentence_blank: 'blank',
        read_sentence_hear_instructions: 'Hear the instructions',
        read_sentence_hear_sentence: 'Hear the sentence',
        read_sentence_choose: 'Choose {word}',
        read_sentence_correct: 'Yes! That word finishes the sentence.',
        read_sentence_missed: 'The word {word} finishes the sentence.',
        read_sentence_answer_mark: '(the answer)',
      },
      prepare: function (w, env) {
        remember(w, env);
        var core = env.core;
        var board = w && w.activityItems && w.activityItems.read_sentence;
        var word = String(env.word);
        var text = board && board.sentence;
        var raw = board && Array.isArray(board.options) ? board.options.map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean) : [];
        if (typeof text !== 'string' || !text.trim() || raw.length < 2) return { missing: ['board'] };
        // One choice per spelling (word_sounds_module.js:6378-6385).
        var distinct = {}, options = [];
        raw.forEach(function (o) { var k = core.packAudioKey(o.normalize('NFC')); if (!distinct[k]) { distinct[k] = o; options.push(o); } });
        var correct = distinct[core.packAudioKey(word.normalize('NFC'))];
        if (options.length < 2 || !correct) return { missing: ['board'] };
        var parts = sentenceParts(core, text, board, word);
        if (!parts) return { missing: ['board'] };
        var prompt = env.packClip('Read the sentence. Which word finishes it?');
        if (!prompt) return { missing: ['question'] };
        var picture = pictureFor(word, env);
        return { item: { target: word, before: parts.before, after: parts.after, answer: parts.answer, options: options,
          picture: picture, prompt: prompt, sentenceAudio: env.packClip(text), introAudio: [prompt], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var norm = function (s) { return String(s == null ? '' : s).toLowerCase().trim(); };
        var picture = ctx.image(item.picture);
        var blank = ctx.el('span', { style: 'display:inline-block;min-width:4.5em;border-bottom:3px dashed var(--muted);text-align:center' }, [
          ctx.el('span', { 'aria-hidden': 'true', text: '\u00a0' }), ctx.el('span', { class: 'sr', text: ctx.L.read_sentence_blank })]);
        var after = ctx.el('div', { class: 'row' });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.read_sentence_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: picture ? ctx.L.read_sentence_picture_practice : ctx.L.read_sentence_matching_practice }));
        if (picture) ctx.root.appendChild(ctx.el('img', { class: 'picture', src: picture, alt: ctx.fmt(ctx.L.read_sentence_picture_clue, { word: item.target }) }));
        else ctx.root.appendChild(ctx.el('p', {}, [ctx.L.read_sentence_word_hint + ' ', ctx.el('span', { class: 'letters', lang: 'en', text: item.target.toLowerCase() })]));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', style: 'font-size:1.8rem;white-space:pre-wrap' }, [item.before, blank, item.after]));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.read_sentence_hear_instructions }),
        ]));
        var cards = [];
        var list = ctx.el('ul', { class: 'choices' });
        item.options.forEach(function (option) {
          var right = norm(option) === norm(item.target);
          var choose = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': ctx.fmt(ctx.L.read_sentence_choose, { word: option }),
            on: { click: function () {
              if (ctx.isDone() || choose.getAttribute('aria-disabled') === 'true') return;
              var outcome = ctx.answer(option, right, { correctText: ctx.L.read_sentence_correct, missedText: ctx.fmt(ctx.L.read_sentence_missed, { word: item.target }) });
              if (outcome !== 'correct') { box.classList.add('tried'); choose.setAttribute('aria-disabled', 'true'); }
            } } }, [ctx.el('span', { class: 'letters', lang: 'en', style: 'text-transform:lowercase', text: option })]);
          var box = ctx.el('li', { class: 'choice' }, [choose]);
          cards.push({ box: box, choose: choose, right: right });
          list.appendChild(box);
        });
        ctx.root.appendChild(list);
        ctx.root.appendChild(after);
        return {
          reveal: function () {
            // The blank fills with the word as written in the sentence.
            blank.textContent = item.answer;
            blank.style.borderBottomStyle = 'solid';
            blank.style.color = 'var(--ok)';
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.right && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + ctx.L.read_sentence_answer_mark);
              }
            });
            if (item.sentenceAudio && !after.childNodes.length) {
              after.appendChild(ctx.el('button', { type: 'button', on: { click: function () { ctx.support('sentenceReadBacks'); ctx.play(item.sentenceAudio); } }, text: ctx.L.read_sentence_hear_sentence }));
            }
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["rhyming"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Rhyme Time (rhyming).
    // App: board from WS_CORE.buildSessionRhymeBoard (word_sounds_setup_source.jsx:4629,4802);
    // the player re-checks a prepared board through the same builder and plays it
    // only when the pair is supported (word_sounds_module.js:15177-15198); opening
    // sequence inst_rhyming -> word -> each choice (word_sounds_module.js:16736-16754,
    // 16855-16888); graded at word_sounds_module.js:20348-20380: the designated
    // rhymeWord, or any other choice whose spelling rime (>= 2 letters) matches the
    // target's, then checkAnswer("correct"|"incorrect","correct"), 2 tries.

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
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          cards.push({ box: box, choose: choose, answer: choice.answer });
          list.appendChild(box);
        });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.showLetters ? ctx.fmt(ctx.L.rhyming_prompt_word, { word: item.word }) : ctx.L.rhyming_prompt }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio }]); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(list);
        if (!ctx.isDone()) {
          run([{ id: item.promptAudio, gap: 200 }, { id: item.wordAudio, gap: 200 }].concat(item.choices.map(function (c, i) { return { id: c.audio, gap: 350, hi: i }; })));
        }
        return {
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
    return module.exports;
  })();
  ADAPTERS["segmentation"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Break it Down (segmentation, Elkonin boxes).
    // App source of truth:
    //   board   compileActivityItems (word_sounds_setup_source.jsx:4603-4610, 4800):
    //           { chips: [{ id, phoneme, type, isDistractor }] (the word's sounds plus
    //           up to 5 distractor sounds, shuffled), slotCount: phonemeCount || phonemes.length }.
    //   view    word_sounds_module.js:19138-19364 ("segmentation"): one box per sound
    //           (boxes = phonemeCount || phonemes.length, :15077-15109), the chip tray,
    //           tap-to-pick + tap-to-place (:18269-18302), "Test Sequence" (:18795),
    //           Check enabled only when every box is filled.
    //   grading word_sounds_module.js:19311-19356: per box, a LOCAL normalizePhoneme
    //           (lowercase/trim + a small vowel/alias map) of the box chip must equal the
    //           same normalisation of the expected phoneme at that index; then
    //           checkAnswer("wrong","right") or ("correct","correct"). Default budget 2
    //           tries (:17130). A miss keeps the boxes and marks the wrong ones (:19349).
    //   audio   inst_segmentation then the word (INST_KEY_MAP :16453, :16847-16854);
    //           each chip plays its sound when picked or placed (:18239, :18294).
    module.exports = {
      id: 'segmentation',
      title: 'Break it Down',
      labels: {
        segmentation_question: 'Break the word into its sounds. Put each sound in a box, in order.',
        segmentation_how: 'Tap a sound to pick it up, then tap a box to put it there. Tap a filled box to take its sound out.',
        segmentation_tray: 'Sounds to place',
        segmentation_boxes: 'Sound boxes',
        segmentation_box_empty: 'Box {n}, empty',
        segmentation_box_filled: 'Box {n}: {sound}',
        segmentation_box_check: 'Box {n}: {sound}, check this one',
        segmentation_pick: 'Pick up {sound}',
        segmentation_picked: '{sound} picked up. Now choose a box.',
        segmentation_dropped: '{sound} put back.',
        segmentation_placed: '{sound} is in box {n}.',
        segmentation_removed: '{sound} taken out of box {n}.',
        segmentation_cleared: 'All the boxes are empty again.',
        segmentation_clear: 'Empty the boxes',
        segmentation_play_boxes: 'Play my sounds',
        segmentation_check: 'Check',
        segmentation_fill_first: 'Put a sound in every box first.',
        segmentation_retry: 'Not quite. Fix the boxes marked to check, then try once more.',
        segmentation_correct: 'Yes! You found every sound.',
        segmentation_missed: 'The sounds are {sounds}. Listen.',
        segmentation_missed_no_letters: 'Here are the sounds, in order. Listen.',
      },
      prepare: function (w, env) {
        var board = w && w.activityItems && w.activityItems.segmentation;
        if (!board || !Array.isArray(board.chips)) return { missing: ['board'] };
        var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
        var sounds = phonemes.map(function (p) { return env.label(p); });
        // The app's boxes come from phonemeCount || phonemes.length; its Check does
        // nothing when that differs from the expected phonemes (:19314).
        var boxes = Number(w.phonemeCount) || sounds.length;
        if (!sounds.length || sounds.some(function (s) { return !s; }) || boxes !== sounds.length) return { missing: ['board'] };
        var chips = board.chips.map(function (c) { return env.label(c && c.phoneme); });
        if (chips.length < sounds.length || chips.some(function (c) { return !c; })) return { missing: ['board'] };
        // Same local equivalence the grader uses: every expected sound needs its own chip.
        var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa' };
        var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
        var free = chips.map(norm);
        for (var i = 0; i < sounds.length; i++) {
          var at = free.indexOf(norm(sounds[i]));
          if (at < 0) return { missing: ['board'] };
          free[at] = null;
        }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_segmentation');
        if (!prompt) missing.push('question');
        var clipOf = {};
        chips.concat(sounds).forEach(function (label) {
          if (Object.prototype.hasOwnProperty.call(clipOf, label)) return;
          clipOf[label] = env.phonemeClip(label);
          if (!clipOf[label]) missing.push('/' + label + '/');
        });
        if (missing.length) return { missing: missing };
        return { item: {
          target: sounds.join(' '), sounds: sounds,
          chips: chips.map(function (label) { return { label: label, audio: clipOf[label] }; }),
          wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt, wordAudio],
          answerAudio: [wordAudio].concat(sounds.map(function (s) { return clipOf[s]; })),
        } };
      },
      render: function (item, ctx) {
        var win = ctx.root.ownerDocument.defaultView;
        var L = ctx.L;
        // word_sounds_module.js:19317-19336, copied exactly.
        var MAP = { 'ā': 'ay', 'ē': 'ee', 'ī': 'ie', 'ō': 'oa', 'ū': 'oo', 'ă': 'a', 'ĕ': 'e', 'ĭ': 'i', 'ŏ': 'o', 'ŭ': 'u', oi: 'oy', aw: 'au', ew: 'oo', oe: 'oa' };
        var norm = function (p) { var l = String(p || '').toLowerCase().trim(); return Object.prototype.hasOwnProperty.call(MAP, l) ? MAP[l] : l; };
        var n = item.sounds.length;
        var boxes = [];
        for (var b = 0; b < n; b++) boxes.push(null);
        var picked = null;
        var errors = [];
        var token = 0;
        var name = function (ci) { return ctx.showLetters ? '/' + item.chips[ci].label + '/' : ctx.fmt(L.sound_n, { n: ci + 1 }); };
        var locked = function () { return ctx.isDone(); };
        var halt = function () { token++; };

        var tray = ctx.el('ul', { class: 'row', 'aria-label': L.segmentation_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
        var chipEls = item.chips.map(function (chip, ci) {
          var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false',
            'aria-label': ctx.fmt(L.segmentation_pick, { sound: name(ci) }),
            style: 'min-width:72px;min-height:56px;font-size:1.3rem;font-weight:700',
            on: { click: function () { onChip(ci); } } }, [name(ci)]);
          var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(L.listen_sound, { n: ci + 1 }) + (ctx.showLetters ? ' ' + name(ci) : ''),
            on: { click: function () { halt(); ctx.support('soundListens'); ctx.play(chip.audio); } } }, ['▶']);
          var li = ctx.el('li', { class: 'row', style: 'gap:6px;border:2px solid var(--line);border-radius:14px;padding:6px' }, [pick, listen]);
          tray.appendChild(li);
          return { li: li, pick: pick };
        });
        var boxList = ctx.el('ol', { class: 'slots', 'aria-label': L.segmentation_boxes });
        var boxEls = boxes.map(function (_, bi) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:80px;min-height:80px;border-style:dashed;font-size:1.3rem;font-weight:700',
            on: { click: function () { onBox(bi); } } });
          boxList.appendChild(ctx.el('li', {}, [btn]));
          return btn;
        });
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.segmentation_check });
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          halt(); picked = null; errors = [];
          for (var i = 0; i < n; i++) boxes[i] = null;
          draw(); ctx.announce(L.segmentation_cleared);
        } }, text: L.segmentation_clear });
        // "Test Sequence" (:18795-18815): each box's sound, 500 ms apart; 600 ms for an empty box.
        var playBoxes = ctx.el('button', { type: 'button', on: { click: function () {
          ctx.support('sequenceReplays');
          var mine = ++token, i = 0;
          var step = function () {
            if (mine !== token || !ctx.root.isConnected || i >= n) return;
            var ci = boxes[i++];
            if (ci == null) { win.setTimeout(step, 600); return; }
            ctx.play(item.chips[ci].audio).then(function () { if (mine === token) win.setTimeout(step, 500); });
          };
          step();
        } }, text: L.segmentation_play_boxes });

        var draw = function () {
          var full = boxes.every(function (x) { return x != null; });
          chipEls.forEach(function (c, ci) {
            c.li.hidden = boxes.indexOf(ci) >= 0;
            c.pick.setAttribute('aria-pressed', picked === ci ? 'true' : 'false');
            if (locked()) c.pick.setAttribute('aria-disabled', 'true');
          });
          boxEls.forEach(function (btn, bi) {
            var ci = boxes[bi];
            btn.textContent = ci == null ? String(bi + 1) : name(ci);
            btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
            var bad = errors.indexOf(bi) >= 0 && ci != null;
            btn.style.borderColor = bad ? 'var(--warn)' : ci == null ? 'var(--muted)' : 'var(--accent)';
            btn.style.background = bad ? 'var(--warn-bg)' : '';
            btn.setAttribute('aria-label', ci == null ? ctx.fmt(L.segmentation_box_empty, { n: bi + 1 })
              : ctx.fmt(bad ? L.segmentation_box_check : L.segmentation_box_filled, { n: bi + 1, sound: name(ci) }));
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          checkBtn.setAttribute('aria-disabled', locked() || !full ? 'true' : 'false');
          if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
        };
        var nextFocus = function () {
          if (boxes.indexOf(null) < 0) return checkBtn;
          for (var ci = 0; ci < chipEls.length; ci++) if (boxes.indexOf(ci) < 0) return chipEls[ci].pick;
          return checkBtn;
        };
        var onChip = function (ci) {
          if (locked() || boxes.indexOf(ci) >= 0) return;
          halt();
          if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.segmentation_dropped, { sound: name(ci) })); return; }
          picked = ci;
          draw();
          ctx.play(item.chips[ci].audio);
          ctx.announce(ctx.fmt(L.segmentation_picked, { sound: name(ci) }));
          // Keyboard path: go straight to the first empty box.
          var empty = boxes.indexOf(null);
          boxEls[empty >= 0 ? empty : 0].focus();
        };
        var onBox = function (bi) {
          if (locked()) return;
          halt();
          errors = [];
          if (picked == null) {
            var out = boxes[bi];
            if (out == null) { ctx.announce(L.segmentation_how); return; }
            boxes[bi] = null;
            draw();
            ctx.announce(ctx.fmt(L.segmentation_removed, { sound: name(out), n: bi + 1 }));
            return;
          }
          var ci = picked;
          picked = null;
          boxes[bi] = ci; // a chip already there goes back to the tray
          draw();
          ctx.play(item.chips[ci].audio);
          ctx.announce(ctx.fmt(L.segmentation_placed, { sound: name(ci), n: bi + 1 }));
          nextFocus().focus();
        };
        var onCheck = function () {
          if (locked()) return;
          if (boxes.some(function (x) { return x == null; })) { ctx.announce(L.segmentation_fill_first); return; }
          halt();
          var bad = [];
          boxes.forEach(function (ci, i) { if (norm(item.chips[ci].label) !== norm(item.sounds[i])) bad.push(i); });
          var response = boxes.map(function (ci) { return item.chips[ci].label; }).join(' ');
          var outcome = ctx.answer(response, bad.length === 0, {
            correctText: L.segmentation_correct,
            retryText: L.segmentation_retry,
            missedText: ctx.showLetters ? ctx.fmt(L.segmentation_missed, { sounds: item.sounds.map(function (s) { return '/' + s + '/'; }).join(' ') })
              : L.segmentation_missed_no_letters,
          });
          // A first miss keeps the boxes and marks the wrong ones (:19348-19350).
          if (outcome === 'retry') { errors = bad; draw(); }
        };

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.segmentation_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.segmentation_how }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { halt(); ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
        ]));
        ctx.root.appendChild(boxList);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [playBoxes, clearBtn]));
        ctx.root.appendChild(tray);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [checkBtn]));
        draw();
        return {
          reveal: function (correct) {
            halt();
            picked = null; errors = [];
            if (!correct) {
              // Show the right sounds in the boxes, using the tray's own chips.
              var used = [];
              for (var i = 0; i < n; i++) {
                var hit = -1;
                for (var ci = 0; ci < item.chips.length && hit < 0; ci++) {
                  if (used.indexOf(ci) < 0 && norm(item.chips[ci].label) === norm(item.sounds[i])) hit = ci;
                }
                used.push(hit);
                boxes[i] = hit;
              }
            }
            draw();
            boxEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["sentence_match"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Picture the Sentence (sentence_match).
    // App: board { sentence, sequence: [word], extras: [up to 2 pack words not in
    // the sentence] } (word_sounds_setup_source.jsx:4770-4796,4819); the player
    // takes a prepared board when the sentence is set, sequence >= 1 and
    // sequence + extras >= 2 (word_sounds_module.js:13189-13213), shuffles the
    // tiles once, and shows the tray only when EVERY tile has its picture
    // (21037-21045). Tapping a tile fills the next empty slot, tapping a filled
    // slot empties it (21062-21076); a full tray is graded slot by slot against
    // the sequence, then checkAnswer("correct"|"incorrect","correct"), 2 tries
    // (21046-21061). The instruction is word_sounds.sentence_match_prompt, packed
    // by setup (setup 5437-5443); after a right answer the app reads the sentence
    // back (word_sounds_module.js:17301-17337).

    // Pictures this export has seen so far, by the app's precedence
    // (word_sounds_module.js:8139-8152). prepare() receives one row; the shared
    // manifest rides on the first row, which comes first.
    var lib = { key: null, manifest: {}, rows: {} };
    function remember(w, env) {
      if (lib.key !== env.packClip) lib = { key: env.packClip, manifest: {}, rows: {} };
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { lib.manifest[k] = bucket[k]; });
      });
      var key = String((w && (w.targetWord || w.word || w.term)) || '').trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image.indexOf('ref::') !== 0) lib.rows[key] = w.image;
    }
    function pictureFor(text, env) {
      var raw = typeof env.packImage === 'function' ? env.packImage(text) : null;
      if (!raw) { var lc = String(text || '').toLowerCase(); raw = lib.rows[lc] || lib.manifest[lc] || null; }
      if (typeof raw !== 'string' || !raw) return null;
      if (/^https?:/i.test(raw)) return null;
      return env.image(/^data:/i.test(raw) ? raw : 'data:image/png;base64,' + raw);
    }

    module.exports = {
      id: 'sentence_match',
      title: 'Picture the Sentence',
      labels: {
        sentence_match_prompt: 'Read the sentence. Match the pictures to it.',
        sentence_match_order_hint: 'Place the pictures in the order they appear',
        sentence_match_slot_empty: 'Slot {n}, empty',
        sentence_match_slot_filled: 'Slot {n}: {word}. Tap to take it out.',
        sentence_match_picture_of: 'Picture of {word}',
        sentence_match_hear_instructions: 'Hear the instructions',
        sentence_match_hear_sentence: 'Hear the sentence',
        sentence_match_correct: 'Yes! The pictures match the sentence.',
        sentence_match_missed: 'Here are the pictures that match the sentence.',
      },
      prepare: function (w, env) {
        remember(w, env);
        var board = w && w.activityItems && w.activityItems.sentence_match;
        var lower = function (v) { return String(v || '').toLowerCase(); };
        if (!board || typeof board.sentence !== 'string' || !board.sentence.trim() || !Array.isArray(board.sequence) || board.sequence.length < 1) return { missing: ['board'] };
        var sequence = board.sequence.map(lower);
        var extras = (Array.isArray(board.extras) ? board.extras : []).map(lower);
        var tiles = sequence.concat(extras);
        if (tiles.length < 2 || tiles.some(function (t) { return !t; })) return { missing: ['board'] };
        // One fixed tray order per item (the app shuffles once per board).
        var seed = 0;
        var key = String(env.word) + '|' + board.sentence;
        for (var s = 0; s < key.length; s++) seed = (seed * 31 + key.charCodeAt(s)) >>> 0;
        for (var i = tiles.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; var j = seed % (i + 1); var t = tiles[i]; tiles[i] = tiles[j]; tiles[j] = t; }
        var missing = [];
        var pics = tiles.map(function (t) {
          var id = pictureFor(t, env);
          if (!id) missing.push('picture:' + t);
          return id;
        });
        var prompt = env.packClip('Read the sentence. Match the pictures to it.');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        return { item: { target: sequence.join(' '), sentence: board.sentence, sequence: sequence, prompt: prompt,
          sentenceAudio: env.packClip(board.sentence),
          tiles: tiles.map(function (t, k) { return { text: t, image: pics[k] }; }),
          introAudio: [prompt], answerAudio: [] } };
      },
      render: function (item, ctx) {
        var slots = item.sequence.map(function () { return null; });
        var imageOf = {};
        item.tiles.forEach(function (t) { imageOf[t.text] = ctx.image(t.image); });
        var tileCards = [];
        var slotButtons = [];
        var tray = ctx.el('ul', { class: 'choices' });
        var slotRow = ctx.el('ul', { class: 'slots' });
        var after = ctx.el('div', { class: 'row' });
        var drawSlots = function (right) {
          slotButtons.forEach(function (b, i) {
            var word = slots[i];
            b.textContent = '';
            b.appendChild(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:1rem;margin-inline-end:6px', text: String(i + 1) }));
            b.appendChild(word ? ctx.el('img', { src: imageOf[word] || '', alt: '', style: 'width:72px;height:72px' }) : ctx.el('span', { 'aria-hidden': 'true', text: '?' }));
            b.setAttribute('aria-label', word ? ctx.fmt(ctx.L.sentence_match_slot_filled, { n: i + 1, word: word }) : ctx.fmt(ctx.L.sentence_match_slot_empty, { n: i + 1 }));
            if (!word || ctx.isDone()) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
            b.style.borderColor = right ? 'var(--ok)' : '';
            b.style.background = right ? 'var(--ok-bg)' : '';
          });
          tileCards.forEach(function (c) {
            var used = slots.indexOf(c.text) >= 0;
            if (used || c.tried || ctx.isDone()) c.pick.setAttribute('aria-disabled', 'true'); else c.pick.removeAttribute('aria-disabled');
            c.pick.style.opacity = used && !right ? '0.3' : '';
          });
        };
        var grade = function () {
          if (slots.some(function (s) { return !s; })) return;
          var ok = slots.every(function (w, i) { return w === item.sequence[i]; });
          var response = slots.join(' ');
          var outcome = ctx.answer(response, ok, { correctText: ctx.L.sentence_match_correct, missedText: ctx.L.sentence_match_missed });
          if (outcome === 'retry') {
            // One-picture boards: that picture is out. The app clears the tray
            // for the retry (word_sounds_module.js:21053-21060).
            if (item.sequence.length === 1) tileCards.forEach(function (c) { if (c.text === slots[0]) { c.tried = true; c.box.classList.add('tried'); } });
            slots = item.sequence.map(function () { return null; });
            drawSlots(false);
          }
        };
        item.tiles.forEach(function (tile) {
          var pick = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(ctx.L.sentence_match_picture_of, { word: tile.text }),
            style: 'width:100%;display:flex;justify-content:center;background:#fff',
            on: { click: function () {
              if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true' || slots.indexOf(tile.text) >= 0) return;
              var at = slots.indexOf(null);
              if (at < 0) return;
              slots[at] = tile.text;
              drawSlots(false);
              grade();
            } } }, [ctx.el('img', { class: 'picture', src: imageOf[tile.text] || '', alt: '' })]);
          var box = ctx.el('li', { class: 'choice' }, [pick]);
          tileCards.push({ text: tile.text, pick: pick, box: box, tried: false });
          tray.appendChild(box);
        });
        item.sequence.forEach(function (_, i) {
          var b = ctx.el('button', { type: 'button', class: 'slot', style: 'border-style:dashed;min-width:96px;min-height:96px',
            on: { click: function () {
              if (ctx.isDone() || !slots[i]) return;
              slots[i] = null;
              drawSlots(false);
            } } });
          slotButtons.push(b);
          slotRow.appendChild(ctx.el('li', {}, [b]));
        });
        drawSlots(false);
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.sentence_match_prompt }));
        ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', style: 'font-size:1.8rem', text: item.sentence }));
        if (item.sequence.length > 1) ctx.root.appendChild(ctx.el('p', { class: 'muted', text: ctx.L.sentence_match_order_hint }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.sentence_match_hear_instructions }),
        ]));
        ctx.root.appendChild(slotRow);
        ctx.root.appendChild(tray);
        ctx.root.appendChild(after);
        return {
          reveal: function () {
            slots = item.sequence.slice();
            drawSlots(true);
            tileCards.forEach(function (c) { if (item.sequence.indexOf(c.text) >= 0) c.box.classList.add('right'); });
            // The app's payoff: hear the finished sentence read back.
            if (item.sentenceAudio && !after.childNodes.length) {
              after.appendChild(ctx.el('button', { type: 'button', on: { click: function () { ctx.support('sentenceReadBacks'); ctx.play(item.sentenceAudio); } }, text: ctx.L.sentence_match_hear_sentence }));
            }
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["sound_sort"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Sound Sort (sound_sort).
    // App: board built at setup by WS_CORE.buildSoundSort over the whole pack +
    // WS_CORE.knownWords (word_sounds_setup_source.jsx:4699-4703, kept only for
    // English packs). The player re-checks it with WS_CORE.validSoundBoard and
    // rebuilds it from soundSortMatches when it fails (computeSoundSortItem,
    // word_sounds_module.js:7175-7186); no board = learner skip (7393-7404).
    // Opening sequence: sound_match_start|end (or "Find words that start|end with
    // the sound") -> the target sound -> "as in" -> the word (16648-16705), then
    // every chip in order once the instruction is done (WordFamiliesView,
    // 10176-10240). Grading (WordFamiliesView.handleWordClick, 10247-10277): a
    // member tap marks it found, all members found = correct; a distractor tap is
    // a wrong attempt; find-all budget maxAttempts = max(2, distractors + 1)
    // (20494-20504, checkAnswer 17126-17134).

    // Words this export has shown prepare() so far (the app's pool is the whole
    // pack; prepare sees one word at a time).
    var seen = { key: null, words: [] };

    module.exports = {
      id: 'sound_sort',
      title: 'Sound Sort',
      labels: {
        sound_sort_heading_first: 'Starts with {sound}',
        sound_sort_heading_last: 'Ends with {sound}',
        sound_sort_heading_first_hidden: 'Starts with the sound you hear',
        sound_sort_heading_last_hidden: 'Ends with the sound you hear',
        sound_sort_instruction: 'Tap each word to hear it. Find the ones that match!',
        sound_sort_instruction_letters: 'Find all words that match: {family}',
        sound_sort_found: '{found} of {total} found',
        sound_sort_listen: 'Listen',
        sound_sort_listen_option: 'Listen to option {n}',
        sound_sort_listen_word: 'Listen to {word}',
        sound_sort_choose_option: 'Choose option {n}',
        sound_sort_choose_word: 'Choose {word}',
        sound_sort_option_n: 'Option {n}',
        sound_sort_hear_all: 'Hear all words',
        sound_sort_found_mark: '(found)',
        sound_sort_answer_mark: '(matches)',
        sound_sort_match: 'Yes, that one matches! {found} of {total} found.',
        sound_sort_match_word: 'Yes, {word} matches! {found} of {total} found.',
        sound_sort_no_match: 'That word does not match the sound. Keep looking!',
        sound_sort_no_match_word: '{word} does not match the sound. Keep looking!',
        sound_sort_correct: 'All matched! You found every word.',
        sound_sort_missed: 'The words that match are: {words}. Listen.',
        sound_sort_missed_no_letters: 'Here are the words that match. Listen.',
      },
      prepare: function (w, env) {
        if (seen.key !== env.packClip) seen = { key: env.packClip, words: [] };
        seen.words.push(w);
        // Setup builds Sound Sort only for English packs (setup_source.jsx:4700).
        if (!env.isEnglish) return { missing: ['english_only'] };
        var core = env.core;
        var word = String(env.word).trim().toLowerCase();
        var fullPack = Array.isArray(env.packWords) ? env.packWords : null;
        var pool = (fullPack || seen.words).concat(core.knownWords || []);
        var prepared = w.activityItems && w.activityItems.sound_sort;
        if (!prepared && !fullPack) return { missing: ['board'] };
        var board = null;
        if (core.validSoundBoard(prepared, word, pool)) board = prepared;
        else if (fullPack) {
          // The app's rebuild (computeSoundSortItem): only with the whole pack,
          // or the board could differ from the one the app shows.
          var ai = w.soundSortMatches || null;
          var seed = word.split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 0);
          board = core.buildSoundSort({ word: word, phonemes: w.phonemes, pool: pool,
            mode: (ai && ai.position) || (seed % 2 === 0 ? 'first' : 'last'),
            matches: (ai && ai.words) || [], distractors: (ai && ai.distractors) || [],
            targetSound: ai && ai.phoneme, teacherEdited: !!(ai && ai.teacherEdited) });
        } else if (prepared && core.validSoundBoard(Object.assign({}, prepared, { teacherEdited: true }), word, pool)) {
          // Pack words later in the list are not visible yet. Accept the setup
          // board when its shape is valid and nothing we CAN check contradicts it
          // (a word not yet seen and not in the edge dictionary is unknown here,
          // and setup only places words whose edge sound it knew).
          var data = {};
          seen.words.forEach(function (p) { var k = String((p && (p.word || p.targetWord || p.term)) || '').trim().toLowerCase(); if (k) data[k] = p; });
          var key = core.soundKey(prepared.targetChar);
          var soundOf = function (x) { return core.edgeSound(x, prepared.mode, (data[x] || {}).phonemes); };
          var own = soundOf(word);
          var agrees = function (x, yes) { var s = soundOf(x); if (s == null) return !data[x]; return (core.soundKey(s) === key) === yes; };
          if (prepared.teacherEdited || (own != null && core.soundKey(own) === key &&
              prepared.options.every(function (x) { return agrees(String(x).trim().toLowerCase(), true); }) &&
              prepared.distractors.every(function (x) { return agrees(String(x).trim().toLowerCase(), false); }))) board = prepared;
        }
        if (!board) return { missing: ['sound_review_required'] };
        var mode = board.mode === 'last' ? 'last' : 'first';
        var sound = env.label(board.targetChar);
        if (!sound) return { missing: ['board'] };
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', mode === 'first' ? 'sound_match_start' : 'sound_match_end') ||
          env.packClip(mode === 'first' ? 'Find words that start with the sound' : 'Find words that end with the sound');
        if (!prompt) missing.push('question');
        var soundAudio = env.phonemeClip(sound);
        if (!soundAudio) missing.push('/' + sound + '/');
        var asIn = env.bankClip('instructions', 'as_in') || env.packClip('as in');
        if (!asIn) missing.push('as in');
        var chips = [];
        var add = function (text, member) {
          text = String(text == null ? '' : text);
          if (!text.trim() || chips.some(function (c) { return c.text === text; })) return;
          var clip = env.wordClip(text);
          if (!clip) missing.push('word:' + text.trim().toLowerCase());
          chips.push({ text: text, audio: clip, member: member });
        };
        (board.options || []).forEach(function (t) { add(t, true); });
        (board.distractors || []).forEach(function (t) { add(t, false); });
        if (!chips.some(function (c) { return c.member; })) return { missing: ['board'] };
        if (missing.length) return { missing: missing };
        // The app shuffles the chips on every mount; the file keeps one fixed,
        // word-seeded order so a resumed item looks the same.
        var s = 0;
        for (var i = 0; i < word.length; i++) s = (Math.imul(s, 31) + word.charCodeAt(i)) >>> 0;
        for (var j = chips.length - 1; j > 0; j--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; var k = s % (j + 1); var tmp = chips[j]; chips[j] = chips[k]; chips[k] = tmp; }
        var members = chips.filter(function (c) { return c.member; });
        return { item: {
          mode: mode, sound: sound, chips: chips, wordAudio: wordAudio,
          instruction: [prompt, soundAudio, asIn, wordAudio],
          maxAttempts: Math.max(2, (board.distractors || []).length + 1),
          target: members.map(function (c) { return c.text; }).join(', '),
          answerAudio: members.map(function (c) { return c.audio; }),
        } };
      },
      // Shared find-all board (identical in word_families.js). The label prefix
      // comes from the item id the shell assigns ("<activity>-<n>").
      render: function (item, ctx) {
        var P = String(item.id || '').replace(/-\d+$/, '') + '_';
        var T = function (key, params) { return ctx.fmt(ctx.L[P + key] || '', params); };
        var win = ctx.root.ownerDocument.defaultView;
        var cards = [];
        var found = [];
        var total = item.chips.filter(function (c) { return c.member; }).length;
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
        var heading = item.mode === 'rime'
          ? (ctx.showLetters ? T('heading_rime', { rime: '-' + item.rime }) : T('heading_rime_hidden'))
          : (ctx.showLetters ? T('heading_' + item.mode, { sound: '/' + item.sound + '/' }) : T('heading_' + item.mode + '_hidden'));
        var counter = ctx.el('p', { class: 'muted', text: T('found', { found: 0, total: total }) });
        var memberText = item.chips.filter(function (c) { return c.member; }).map(function (c) { return c.text; }).join(', ');
        var list = ctx.el('ul', { class: 'choices' });
        item.chips.forEach(function (chip, i) {
          var n = i + 1;
          var card = { chip: chip, found: false };
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? T('listen_word', { word: chip.text }) : T('listen_option', { n: n }),
            on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(chip.audio); } } }, ['▶ ', T('listen')]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? T('choose_word', { word: chip.text }) : T('choose_option', { n: n }),
            on: { click: function () {
              if (ctx.isDone() || card.found) return;
              halt();
              if (chip.member) {
                card.found = true;
                found.push(chip.text);
                box.classList.add('right');
                choose.setAttribute('aria-disabled', 'true');
                choose.setAttribute('aria-label', choose.getAttribute('aria-label') + ' ' + T('found_mark'));
                counter.textContent = T('found', { found: found.length, total: total });
                if (found.length >= total) {
                  ctx.answer(found.join(', '), true, { correctText: T('correct') });
                } else {
                  ctx.play(chip.audio);
                  ctx.announce(ctx.showLetters ? T('match_word', { word: chip.text, found: found.length, total: total }) : T('match', { found: found.length, total: total }));
                }
                return;
              }
              // A wrong tap costs one attempt; the chip stays on the board, as in
              // the app (tapping it again costs another).
              box.classList.add('tried');
              ctx.answer(chip.text, false, {
                retryText: ctx.showLetters ? T('no_match_word', { word: chip.text }) : T('no_match'),
                missedText: ctx.showLetters ? T('missed', { words: memberText }) : T('missed_no_letters'),
              });
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: chip.text }) : T('option_n', { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          card.box = box; card.choose = choose;
          cards.push(card);
          list.appendChild(box);
        });
        var chipSteps = function (onlyLeft) {
          return item.chips.map(function (c, i) { return { id: c.audio, gap: 350, hi: i, skip: onlyLeft && cards[i].found }; })
            .filter(function (s) { return !s.skip; });
        };
        var instructionSteps = function () { return item.instruction.map(function (id) { return { id: id, gap: 200 }; }); };
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: heading }));
        ctx.root.appendChild(ctx.el('p', { text: ctx.showLetters ? T('instruction_letters', { family: heading }) : T('instruction') }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps()); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('allWordListens'); run(chipSteps(true)); } }, text: T('hear_all') }),
        ]));
        ctx.root.appendChild(counter);
        ctx.root.appendChild(list);
        if (!ctx.isDone()) run(instructionSteps().concat(chipSteps(false)));
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.chip.member && !c.found && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + T('answer_mark'));
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["spelling_bee"] = (function () {
    var module = { exports: {} };
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
    return module.exports;
  })();
  ADAPTERS["syllable_blending"] = (function () {
    var module = { exports: {} };
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

    module.exports = {
      id: 'syllable_blending',
      title: 'Syllable Blending',
      labels: {
        syllable_blending_prompt: 'Listen to the syllables and blend them together',
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
        var row = ctx.el('div', { class: 'row', 'aria-hidden': 'true' });
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
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          card.box = box; card.choose = choose; card.listen = listen;
          cards.push(card);
          list.appendChild(box);
        });
        ctx.root.appendChild(list);
        setState();
        if (!ctx.isDone()) runSyllables(true);
        return {
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
    return module.exports;
  })();
  ADAPTERS["syllable_counting"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Syllable Claps (syllable_counting).
    // App source of truth (word_sounds_module.js):
    //   readiness   syllableCountReady (~4560): supported === true, integer count > 0,
    //               same target word. The count comes from WS_CORE.resolveSyllableCount
    //               with the board, the recorded syllable task and the AUDIO CONTEXT of
    //               the clip that will be played (syllableCountAudioFor ~4537): a
    //               teacher-reviewed count is bound to that exact clip.
    //               A teacher-SPOKEN count (reviewed with no clip) needs a teacher to
    //               say the word, so it cannot go home.
    //   view        SyllableCountingView (~4569) and case "syllable_counting" (~20228):
    //               tap once per syllable, Undo, Reset, Submit. Submit works only after
    //               the whole recorded word has played in this attempt and no audio is
    //               playing (syllableCountDeliveryReady ~4563, receipt ~9076).
    //   grading     onCheckAnswer: taps === count -> checkAnswer("correct"/"incorrect",
    //               "correct"); each submission resets taps and requires a fresh
    //               hearing (resetSyllableCountDelivery(false) ~17092). Budget: 2.
    //   audio       inst_syllable_counting bank clip, else the pack clip of
    //               "How many syllables do you hear? Clap for each one"; then the word.
    module.exports = {
      id: 'syllable_counting',
      title: 'Syllable Claps',
      labels: {
        syllable_counting_question: 'How many syllables do you hear? Clap for each one.',
        syllable_counting_tap: 'Tap to count syllables',
        syllable_counting_undo: 'Undo last tap',
        syllable_counting_reset: 'Reset',
        syllable_counting_submit: 'Submit',
        syllable_counting_taps_one: 'You tapped {count} time.',
        syllable_counting_taps_other: 'You tapped {count} times.',
        syllable_counting_wait_word: 'Hear the whole word before submitting.',
        syllable_counting_wait_audio: 'Wait for the word to finish before submitting.',
        syllable_counting_ready: 'Ready to submit.',
        syllable_counting_tap_each: 'Tap once for each syllable you hear.',
        syllable_counting_correct: 'Yes! {word} has {count}.',
        syllable_counting_missed: '{word} has {count}. Listen again.',
        syllable_counting_answer: '{word} has {count}.',
        syllable_counting_count_one: '1 syllable',
        syllable_counting_count_other: '{n} syllables',
      },
      prepare: function (w, env) {
        var core = env.core;
        var boards = w.activityItems || {};
        var board = boards.syllable_counting;
        if (!board) return { missing: ['board'] };
        var recordedTask = boards.syllable_blending || null;
        var language = (board.reviewedEvidence && board.reviewedEvidence.language) || board.language || (env.isEnglish ? 'en' : '');
        if (!language) return { missing: ['board language'] };
        var key = core.packAudioKey(env.word);
        // syllableCountAudioFor: the pack's saved clip for this word decides the
        // audio context a reviewed count is checked against.
        var asset = core.packAudioAssets([w])[key];
        var savedSource = typeof asset === 'string' ? asset : asset && asset.mime && asset.base64 ? 'data:' + asset.mime + ';base64,' + asset.base64 : null;
        var spoken = core.createSyllableCountAudioContext({ language: language });
        if (!savedSource && core.isTeacherSpokenSyllableCount(env.word, { language: language, prepared: board, recordedTask: recordedTask, audioContext: spoken })) {
          return { missing: ['teacher says this word aloud'] };
        }
        var approval = board.reviewedEvidence || board;
        var audioContext;
        if (savedSource) {
          var selected = core.selectSyllableCountAudio({ word: env.word, language: language, savedAsset: asset, bankAsset: null,
            prepared: board, recordedTask: recordedTask, allowSavedProfileMismatch: true });
          if (!selected.asset) return { missing: ['word'] };
          audioContext = core.createSyllableCountAudioContext({ asset: selected.asset, language: language });
        } else if (approval && approval.source === 'teacher_review') {
          // A reviewed count is bound to a specific clip; without the pack's clip
          // the export cannot show the word bank clip is the one that was reviewed.
          return { missing: ['reviewed word recording'] };
        }
        var resolved = core.resolveSyllableCount(env.word, { language: language, prepared: board, recordedTask: recordedTask,
          audioContext: audioContext, syllables: w.syllables });
        var sameWord = String(resolved.targetWord || '').normalize('NFC').trim().toLowerCase() === String(env.word).normalize('NFC').trim().toLowerCase();
        if (!(resolved.supported === true && Number.isInteger(resolved.count) && resolved.count > 0 && sameWord)) {
          return { missing: ['syllable count needs review' + (resolved.reason ? ' (' + resolved.reason + ')' : '')] };
        }
        if (resolved.source === 'teacher_review' && resolved.audioContext && !resolved.audioContext.fingerprint) {
          return { missing: ['teacher says this word aloud'] };
        }
        var missing = [];
        var wordAudio = savedSource ? env.packClip(env.word) : env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_syllable_counting') || env.packClip('How many syllables do you hear? Clap for each one');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        // introAudio stays empty: render plays the question and word itself, so it
        // can tell when the whole word has been heard (the app's delivery receipt).
        return { item: { count: resolved.count, target: String(resolved.count), wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var taps = 0;
        var attempt = 0;
        var delivered = false;
        var busy = false;
        var token = 0;
        var countText = function (n) { return n === 1 ? ctx.L.syllable_counting_count_one : ctx.fmt(ctx.L.syllable_counting_count_other, { n: n }); };
        var shown = ctx.el('p', { 'aria-hidden': 'true', style: 'font-size:3rem;font-weight:800;margin:8px 0;text-align:center', text: '0' });
        var status = ctx.el('p', { class: 'muted', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
        var canSubmit = function () { return !ctx.isDone() && taps > 0 && delivered && !busy; };
        var update = function () {
          shown.textContent = String(taps);
          var text = ctx.fmt(taps === 1 ? ctx.L.syllable_counting_taps_one : ctx.L.syllable_counting_taps_other, { count: taps }) + ' ' +
            (busy ? ctx.L.syllable_counting_wait_audio : !delivered ? ctx.L.syllable_counting_wait_word
              : taps > 0 ? ctx.L.syllable_counting_ready : ctx.L.syllable_counting_tap_each);
          if (!ctx.isDone()) status.textContent = text;
          submit.setAttribute('aria-disabled', canSubmit() ? 'false' : 'true');
          undo.setAttribute('aria-disabled', ctx.isDone() || taps === 0 ? 'true' : 'false');
        };
        // Plays a sequence; the word counts as heard only when ITS clip ends in this
        // attempt. A clip cut off by another one never settles, so it never counts.
        var hear = function (ids, wordLast) {
          var mine = ++token;
          var myAttempt = attempt;
          busy = true;
          if (wordLast) delivered = false;
          update();
          return ctx.playAll(ids).then(function (ok) {
            if (mine !== token) return;
            busy = false;
            if (wordLast && ok && myAttempt === attempt) delivered = true;
            update();
          });
        };
        var tap = ctx.el('button', { type: 'button', class: 'primary', 'aria-label': ctx.L.syllable_counting_tap, style: 'min-width:128px;min-height:128px;border-radius:64px;font-size:1.2rem',
          on: { click: function () { if (ctx.isDone()) return; taps++; update(); } } },
          [ctx.el('span', { 'aria-hidden': 'true', style: 'display:block;font-size:2.4rem', text: '👏' }), ctx.L.syllable_counting_tap]);
        var undo = ctx.el('button', { type: 'button', on: { click: function () {
          if (ctx.isDone() || taps === 0) return; taps--; update();
        } }, text: ctx.L.syllable_counting_undo });
        var reset = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; taps = 0; update(); } }, text: ctx.L.syllable_counting_reset });
        var submit = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () {
          if (!canSubmit()) { if (!ctx.isDone()) ctx.announce(status.textContent); return; }
          var answer = taps;
          var outcome = ctx.answer(String(answer), answer === item.count, {
            correctText: ctx.fmt(ctx.L.syllable_counting_correct, { word: item.word, count: countText(item.count) }),
            missedText: ctx.fmt(ctx.L.syllable_counting_missed, { word: item.word, count: countText(item.count) }),
          });
          // Every submission starts a new attempt: taps reset and the word must be
          // heard again before the next submission.
          attempt++;
          taps = 0;
          delivered = false;
          if (outcome === 'retry') update();
        } }, text: ctx.L.syllable_counting_submit });
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.syllable_counting_question }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); hear([item.promptAudio], false); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); hear([item.wordAudio], true); } }, text: ctx.L.hear_word }),
        ]));
        ctx.root.appendChild(shown);
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [tap]));
        ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center;margin-top:12px' }, [undo, reset]));
        ctx.root.appendChild(status);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [submit]));
        update();
        if (!ctx.isDone()) hear([item.promptAudio, item.wordAudio], true);
        return {
          reveal: function () {
            token++;
            busy = false;
            [tap, undo, reset, submit].forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
            shown.textContent = String(item.count);
            status.textContent = ctx.fmt(ctx.L.syllable_counting_answer, { word: item.word, count: countText(item.count) });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["word_families"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Word Families (word_families).
    // App: board built at setup (word_sounds_setup_source.jsx:4704-4716) and
    // kept only when WS_CORE.validWordFamilyBoard accepts it. The player resolves
    // the family with resolveWordFamilyRime (word_sounds_module.js:7192-7279): a
    // teacher edit (rimeFamilyMembers.teacherEdited) wins unless the prepared
    // board already equals it; otherwise a valid prepared board; otherwise a
    // runtime family from the module's RIME_FAMILIES table, which is not in
    // WS_CORE and so cannot be rebuilt here (reported as 'board').
    // buildWordFamilyBoard (7294-7356) uses prepared lists verbatim, teacher lists
    // sliced to 8, and drops a board with an issue (no member / a word on both
    // sides), which learners skip (7360-7392).
    // Opening: prepared -> "Find all words in the <rime> family" (WS_CORE.
    // wordFamilyInstruction); otherwise inst_word_families then the rime
    // (16706-16735); then every chip once the instruction is done
    // (WordFamiliesView 10176-10240). Grading as Sound Sort
    // (WordFamiliesView.handleWordClick 10247-10277): all members found = correct
    // (checkAnswer(word, word)); a distractor tap is a wrong attempt; budget
    // maxAttempts = max(2, distractors + 1) (20740-20752, 17126-17134).

    module.exports = {
      id: 'word_families',
      title: 'Word Families',
      labels: {
        word_families_heading_rime: '{rime} family',
        word_families_heading_rime_hidden: 'Sound Family',
        word_families_instruction: 'Tap each word to hear it. Find the ones that match!',
        word_families_instruction_letters: 'Find all words that match: {family}',
        word_families_found: '{found} of {total} found',
        word_families_listen: 'Listen',
        word_families_listen_option: 'Listen to option {n}',
        word_families_listen_word: 'Listen to {word}',
        word_families_choose_option: 'Choose option {n}',
        word_families_choose_word: 'Choose {word}',
        word_families_option_n: 'Option {n}',
        word_families_hear_all: 'Hear all words',
        word_families_found_mark: '(found)',
        word_families_answer_mark: '(in the family)',
        word_families_match: 'Yes, that one is in the family! {found} of {total} found.',
        word_families_match_word: 'Yes, {word} is in the family! {found} of {total} found.',
        word_families_no_match: 'That word is not in the family. Keep looking!',
        word_families_no_match_word: '{word} is not in the family. Keep looking!',
        word_families_correct: 'All matched! You found the whole family.',
        word_families_missed: 'The family words are: {words}. Listen.',
        word_families_missed_no_letters: 'Here are the family words. Listen.',
      },
      prepare: function (w, env) {
        // Word Families is English-only in the app (word_sounds_module.js:10928).
        if (!env.isEnglish) return { missing: ['english_only'] };
        var core = env.core;
        var word = String(env.word).toLowerCase();
        var board = w.activityItems && w.activityItems.word_families;
        var prepared = core.validWordFamilyBoard(board, word) ? board : null;
        var spec = w.rimeFamilyMembers;
        var rime = null, members = [], distractors = [], isPrepared = false;
        var usePrepared = function () { rime = prepared.rime; members = prepared.options.slice(); distractors = prepared.distractors.slice(); isPrepared = true; };
        if (spec && spec.teacherEdited && spec.rime) {
          var editedRime = String(spec.rime).toLowerCase().trim().replace(/^-/, '');
          var editedWords = function (values) {
            var out = [];
            (Array.isArray(values) ? values : []).filter(function (v) { return typeof v === 'string'; })
              .map(function (v) { return v.toLowerCase().trim(); })
              .filter(function (v) { return v && v !== word; }).slice(0, 8)
              .forEach(function (v) { if (out.indexOf(v) < 0) out.push(v); });
            return out;
          };
          if (prepared && prepared.rime === editedRime &&
              JSON.stringify(prepared.options) === JSON.stringify(editedWords(spec.words)) &&
              JSON.stringify(prepared.distractors) === JSON.stringify(editedWords(spec.distractors))) usePrepared();
          else {
            rime = editedRime;
            members = (spec.words || []).filter(function (v) { return v != null && String(v).toLowerCase() !== word; }).slice(0, 8);
            distractors = (spec.distractors || []).filter(function (v) { return v != null; }).slice(0, 8);
          }
        } else if (prepared) usePrepared();
        if (!rime) return { missing: ['board'] };
        // wordFamilyBoardIssue (word_sounds_module.js:7283-7290).
        var clean = function (values) { return values.map(function (v) { return String(v == null ? '' : v).toLowerCase().trim(); }).filter(Boolean); };
        var yes = clean(members), no = clean(distractors);
        if (!yes.length || yes.some(function (v) { return no.indexOf(v) >= 0; }) || no.indexOf(word.trim()) >= 0) return { missing: ['family_review_required'] };
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var instruction = null;
        var sentence = isPrepared ? env.packClip(core.wordFamilyInstruction(rime)) : null;
        if (sentence) instruction = [sentence];
        else {
          // Prepared boards speak the sentence; without its recording, the
          // recorded framing + the rime says the same thing (the app's
          // non-prepared path).
          var inst = env.bankClip('instructions', 'inst_word_families');
          var rimeAudio = env.wordClip(rime);
          if (inst && rimeAudio) instruction = [inst, rimeAudio];
        }
        if (!instruction) missing.push('question');
        var chips = [];
        var add = function (text, member) {
          text = String(text == null ? '' : text);
          if (!text.trim() || chips.some(function (c) { return c.text === text; })) return;
          var clip = env.wordClip(text);
          if (!clip) missing.push('word:' + text.trim().toLowerCase());
          chips.push({ text: text, audio: clip, member: member });
        };
        members.forEach(function (t) { add(t, true); });
        distractors.forEach(function (t) { add(t, false); });
        if (missing.length) return { missing: missing };
        // The app shuffles the chips on every mount; the file keeps one fixed,
        // word-seeded order so a resumed item looks the same.
        var s = 0;
        for (var i = 0; i < word.length; i++) s = (Math.imul(s, 31) + word.charCodeAt(i)) >>> 0;
        for (var j = chips.length - 1; j > 0; j--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; var k = s % (j + 1); var tmp = chips[j]; chips[j] = chips[k]; chips[k] = tmp; }
        var inFamily = chips.filter(function (c) { return c.member; });
        return { item: {
          mode: 'rime', rime: rime, chips: chips, wordAudio: wordAudio, instruction: instruction,
          maxAttempts: Math.max(2, distractors.length + 1),
          target: inFamily.map(function (c) { return c.text; }).join(', '),
          answerAudio: inFamily.map(function (c) { return c.audio; }),
        } };
      },
      // Shared find-all board (identical in sound_sort.js). The label prefix
      // comes from the item id the shell assigns ("<activity>-<n>").
      render: function (item, ctx) {
        var P = String(item.id || '').replace(/-\d+$/, '') + '_';
        var T = function (key, params) { return ctx.fmt(ctx.L[P + key] || '', params); };
        var win = ctx.root.ownerDocument.defaultView;
        var cards = [];
        var found = [];
        var total = item.chips.filter(function (c) { return c.member; }).length;
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
        var heading = item.mode === 'rime'
          ? (ctx.showLetters ? T('heading_rime', { rime: '-' + item.rime }) : T('heading_rime_hidden'))
          : (ctx.showLetters ? T('heading_' + item.mode, { sound: '/' + item.sound + '/' }) : T('heading_' + item.mode + '_hidden'));
        var counter = ctx.el('p', { class: 'muted', text: T('found', { found: 0, total: total }) });
        var memberText = item.chips.filter(function (c) { return c.member; }).map(function (c) { return c.text; }).join(', ');
        var list = ctx.el('ul', { class: 'choices' });
        item.chips.forEach(function (chip, i) {
          var n = i + 1;
          var card = { chip: chip, found: false };
          var listen = ctx.el('button', { type: 'button',
            'aria-label': ctx.showLetters ? T('listen_word', { word: chip.text }) : T('listen_option', { n: n }),
            on: { click: function () { halt(); ctx.support('optionListens'); ctx.play(chip.audio); } } }, ['▶ ', T('listen')]);
          var choose = ctx.el('button', { type: 'button', class: 'primary',
            'aria-label': ctx.showLetters ? T('choose_word', { word: chip.text }) : T('choose_option', { n: n }),
            on: { click: function () {
              if (ctx.isDone() || card.found) return;
              halt();
              if (chip.member) {
                card.found = true;
                found.push(chip.text);
                box.classList.add('right');
                choose.setAttribute('aria-disabled', 'true');
                choose.setAttribute('aria-label', choose.getAttribute('aria-label') + ' ' + T('found_mark'));
                counter.textContent = T('found', { found: found.length, total: total });
                if (found.length >= total) {
                  ctx.answer(found.join(', '), true, { correctText: T('correct') });
                } else {
                  ctx.play(chip.audio);
                  ctx.announce(ctx.showLetters ? T('match_word', { word: chip.text, found: found.length, total: total }) : T('match', { found: found.length, total: total }));
                }
                return;
              }
              // A wrong tap costs one attempt; the chip stays on the board, as in
              // the app (tapping it again costs another).
              box.classList.add('tried');
              ctx.answer(chip.text, false, {
                retryText: ctx.showLetters ? T('no_match_word', { word: chip.text }) : T('no_match'),
                missedText: ctx.showLetters ? T('missed', { words: memberText }) : T('missed_no_letters'),
              });
            } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: chip.text }) : T('option_n', { n: n })]);
          var box = ctx.el('li', { class: 'choice' }, [choose, listen]);
          card.box = box; card.choose = choose;
          cards.push(card);
          list.appendChild(box);
        });
        var chipSteps = function (onlyLeft) {
          return item.chips.map(function (c, i) { return { id: c.audio, gap: 350, hi: i, skip: onlyLeft && cards[i].found }; })
            .filter(function (s) { return !s.skip; });
        };
        var instructionSteps = function () { return item.instruction.map(function (id) { return { id: id, gap: 200 }; }); };
        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: heading }));
        ctx.root.appendChild(ctx.el('p', { text: ctx.showLetters ? T('instruction_letters', { family: heading }) : T('instruction') }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps()); } }, text: ctx.L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('allWordListens'); run(chipSteps(true)); } }, text: T('hear_all') }),
        ]));
        ctx.root.appendChild(counter);
        ctx.root.appendChild(list);
        if (!ctx.isDone()) run(instructionSteps().concat(chipSteps(false)));
        return {
          reveal: function () {
            halt();
            cards.forEach(function (c) {
              c.choose.setAttribute('aria-disabled', 'true');
              if (c.chip.member && !c.found && !c.box.classList.contains('right')) {
                c.box.classList.add('right');
                c.choose.setAttribute('aria-label', c.choose.getAttribute('aria-label') + ' ' + T('answer_mark'));
              }
            });
          },
        };
      },
    };
    return module.exports;
  })();
  ADAPTERS["word_scramble"] = (function () {
    var module = { exports: {} };
    // Take-home adapter: Word Scramble (word_scramble).
    // App source of truth:
    //   board   compileActivityItems (word_sounds_setup_source.jsx:4684-4689, 4811):
    //           { letters: the word's letters in a seeded shuffle that never equals the
    //           word, answer: word }. Without a board the view scrambles the word with
    //           the same seeded loop (scrambleWord, word_sounds_module.js:18916-18934).
    //   view    case "word_scramble" (word_sounds_module.js:19874-20027): letter tiles
    //           (tap adds the letter to the answer, a used tile is disabled), one answer
    //           box per letter, Clear, Check (enabled once the answer is not empty),
    //           "Play word", and a "Show word" support (:18774-18789; the word is
    //           otherwise hidden until answered, SMART_TEXT_VISIBILITY :7568).
    //   grading submitConstructionAnswer (:18887-18902): trimmed, lowercased answer
    //           === trimmed, lowercased word; the same unchanged answer is not graded
    //           twice; checkAnswer("correct"|"incorrect","correct"). Default budget 2
    //           tries (:17130). A first miss clears the answer and frees every tile
    //           (checkScramble :19875-19880).
    //   audio   inst_word_scramble (INST_KEY_MAP :16449); the word only on request.
    module.exports = {
      id: 'word_scramble',
      title: 'Word Scramble',
      labels: {
        word_scramble_question: 'Unscramble the letters to make the word.',
        word_scramble_how: 'Tap a letter to pick it up, then tap a box to put it there. Tap a filled box to take the letter out.',
        word_scramble_tray: 'Letters',
        word_scramble_boxes: 'Answer boxes',
        word_scramble_box_empty: 'Box {n}, empty',
        word_scramble_box_filled: 'Box {n}: {letter}',
        word_scramble_pick: 'Pick up {letter}',
        word_scramble_picked: '{letter} picked up. Now choose a box.',
        word_scramble_dropped: '{letter} put back.',
        word_scramble_placed: '{letter} is in box {n}.',
        word_scramble_removed: '{letter} taken out of box {n}.',
        word_scramble_cleared: 'All the boxes are empty again.',
        word_scramble_clear: 'Clear',
        word_scramble_check: 'Check',
        word_scramble_show_word: 'Show word',
        word_scramble_word: 'The word: {word}',
        word_scramble_empty: 'Put some letters in the boxes first.',
        word_scramble_same: 'Change your answer, then check it again.',
        word_scramble_retry: 'Not quite. The letters are back. Listen and try once more.',
        word_scramble_correct: 'Yes! The word is {word}.',
        word_scramble_missed: 'The word is {word}. Listen.',
      },
      prepare: function (w, env) {
        var word = String(env.word || '').trim().toLowerCase();
        if (!word) return { missing: ['word'] };
        var board = w && w.activityItems && w.activityItems.word_scramble;
        var letters = board && Array.isArray(board.letters) ? board.letters.map(function (l) { return String(l).toLowerCase(); }) : null;
        // The board must be exactly this word's letters (one tile per letter).
        if (letters && letters.slice().sort().join('\u0000') !== word.split('').sort().join('\u0000')) return { missing: ['board'] };
        if (!letters) {
          // scrambleWord (word_sounds_module.js:18916-18928), copied exactly.
          letters = word.split('');
          if (word.length > 2) {
            var seed = word.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
            for (var i = letters.length - 1; i > 0; i--) { var j = (seed + i) % (i + 1); var t = letters[i]; letters[i] = letters[j]; letters[j] = t; }
            if (letters.join('') === word) { var t2 = letters[0]; letters[0] = letters[1]; letters[1] = t2; }
          }
        }
        var missing = [];
        var wordAudio = env.wordClip(env.word);
        if (!wordAudio) missing.push('word');
        var prompt = env.bankClip('instructions', 'inst_word_scramble');
        if (!prompt) missing.push('question');
        if (missing.length) return { missing: missing };
        return { item: { target: word, letters: letters, wordAudio: wordAudio, promptAudio: prompt,
          introAudio: [prompt], answerAudio: [wordAudio] } };
      },
      render: function (item, ctx) {
        var L = ctx.L;
        var n = item.target.length;
        var boxes = [];
        for (var s = 0; s < n; s++) boxes.push(null);
        var picked = null;
        var lastSubmitted = null;
        var locked = function () { return ctx.isDone(); };
        var up = function (ti) { return String(item.letters[ti]).toUpperCase(); };
        var answerText = function () { return boxes.filter(function (x) { return x != null; }).map(function (ti) { return item.letters[ti]; }).join(''); };

        var tray = ctx.el('ul', { class: 'row', 'aria-label': L.word_scramble_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:10px' });
        var tiles = item.letters.map(function (letter, ti) {
          var btn = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false', 'aria-label': ctx.fmt(L.word_scramble_pick, { letter: up(ti) }),
            style: 'min-width:56px;min-height:56px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onTile(ti); } } }, [up(ti)]);
          var li = ctx.el('li', {}, [btn]);
          tray.appendChild(li);
          return { li: li, btn: btn };
        });
        var boxList = ctx.el('ol', { class: 'slots', 'aria-label': L.word_scramble_boxes });
        var boxEls = boxes.map(function (_, bi) {
          var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:60px;min-height:64px;font-size:1.5rem;font-weight:700',
            on: { click: function () { onBox(bi); } } });
          boxList.appendChild(ctx.el('li', {}, [btn]));
          return btn;
        });
        var wordLine = ctx.el('p', { class: 'letters', hidden: true, text: ctx.fmt(L.word_scramble_word, { word: item.target }) });
        var showWord = ctx.el('button', { type: 'button', 'aria-pressed': 'false', on: { click: function () {
          if (locked()) return;
          var on = wordLine.hidden;
          if (on) ctx.support('wordShown');
          wordLine.hidden = !on;
          showWord.setAttribute('aria-pressed', on ? 'true' : 'false');
        } }, text: L.word_scramble_show_word });
        var clearAll = function () { picked = null; for (var i = 0; i < n; i++) boxes[i] = null; };
        var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
          if (locked()) return;
          clearAll(); lastSubmitted = null; draw(); ctx.announce(L.word_scramble_cleared);
        } }, text: L.word_scramble_clear });
        var checkBtn = ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { onCheck(); } }, text: L.word_scramble_check });

        var draw = function () {
          tiles.forEach(function (t, ti) {
            t.li.hidden = boxes.indexOf(ti) >= 0;
            t.btn.setAttribute('aria-pressed', picked === ti ? 'true' : 'false');
            if (locked()) t.btn.setAttribute('aria-disabled', 'true');
          });
          boxEls.forEach(function (btn, bi) {
            var ti = boxes[bi];
            btn.textContent = ti == null ? '' : up(ti);
            btn.style.borderStyle = ti == null ? 'dashed' : 'solid';
            btn.style.borderColor = ti == null ? 'var(--muted)' : 'var(--accent)';
            btn.setAttribute('aria-label', ti == null ? ctx.fmt(L.word_scramble_box_empty, { n: bi + 1 }) : ctx.fmt(L.word_scramble_box_filled, { n: bi + 1, letter: up(ti) }));
            if (locked()) btn.setAttribute('aria-disabled', 'true');
          });
          checkBtn.setAttribute('aria-disabled', locked() || !answerText() ? 'true' : 'false');
          if (locked()) { clearBtn.setAttribute('aria-disabled', 'true'); showWord.setAttribute('aria-disabled', 'true'); }
        };
        var onTile = function (ti) {
          if (locked() || boxes.indexOf(ti) >= 0) return;
          if (picked === ti) { picked = null; draw(); ctx.announce(ctx.fmt(L.word_scramble_dropped, { letter: up(ti) })); return; }
          picked = ti;
          draw();
          ctx.announce(ctx.fmt(L.word_scramble_picked, { letter: up(ti) }));
          var empty = boxes.indexOf(null);
          boxEls[empty >= 0 ? empty : 0].focus();
        };
        var onBox = function (bi) {
          if (locked()) return;
          if (picked == null) {
            var out = boxes[bi];
            if (out == null) { ctx.announce(L.word_scramble_how); return; }
            boxes[bi] = null; lastSubmitted = null;
            draw();
            ctx.announce(ctx.fmt(L.word_scramble_removed, { letter: up(out), n: bi + 1 }));
            return;
          }
          var ti = picked;
          picked = null;
          boxes[bi] = ti; lastSubmitted = null;
          draw();
          ctx.announce(ctx.fmt(L.word_scramble_placed, { letter: up(ti), n: bi + 1 }));
          if (boxes.indexOf(null) < 0) { checkBtn.focus(); return; }
          for (var k = 0; k < tiles.length; k++) if (boxes.indexOf(k) < 0) { tiles[k].btn.focus(); return; }
        };
        var onCheck = function () {
          if (locked()) return;
          var answer = answerText().trim().toLowerCase();
          if (!answer) { ctx.announce(L.word_scramble_empty); return; }
          if (answer === lastSubmitted) { ctx.announce(L.word_scramble_same); return; }
          lastSubmitted = answer;
          var outcome = ctx.answer(answer, answer === String(item.target).trim().toLowerCase(), {
            correctText: ctx.fmt(L.word_scramble_correct, { word: item.target }),
            retryText: L.word_scramble_retry,
            missedText: ctx.fmt(L.word_scramble_missed, { word: item.target }),
          });
          // A first miss clears the answer and frees every tile (checkScramble).
          if (outcome === 'retry') { clearAll(); draw(); if (tiles[0]) tiles[0].btn.focus(); }
        };

        ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.word_scramble_question }));
        ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.word_scramble_how }));
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
          ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
          showWord,
        ]));
        ctx.root.appendChild(wordLine);
        ctx.root.appendChild(tray);
        ctx.root.appendChild(boxList);
        ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn, checkBtn]));
        draw();
        return {
          reveal: function (correct) {
            picked = null;
            if (!correct) {
              var used = [];
              for (var i = 0; i < n; i++) {
                var hit = -1;
                for (var ti = 0; ti < item.letters.length && hit < 0; ti++) if (used.indexOf(ti) < 0 && item.letters[ti] === item.target[i]) hit = ti;
                used.push(hit);
                boxes[i] = hit < 0 ? null : hit;
              }
            }
            wordLine.hidden = false;
            draw();
            boxEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
          },
        };
      },
    };
    return module.exports;
  })();
  // END GENERATED ADAPTERS

  // ---------------------------------------------------------------------------
  // Building the lesson (runs in the app)
  // ---------------------------------------------------------------------------
  function bankUri(bank, key) {
    try { var value = bank && bank[key]; return typeof value === 'string' && /^data:audio\//i.test(value) ? value : null; } catch (_) { return null; }
  }
  function imageUri(value) {
    if (typeof value !== 'string') return null;
    return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(value) && value.length < 1500000 ? value : null;
  }

  // Build the learner lesson from a prepared pack by ALLOWLIST: each adapter
  // copies only the fields and clips its activity plays. Nothing else in the
  // pack (other answers, review data, provenance, learner data) can reach the
  // file, because nothing else is copied.
  function lessonFromPack(words, options) {
    var opts = options || {};
    var core = opts.core;
    if (!core || typeof core.soundAnswerMatches !== 'function') throw new Error('lessonFromPack needs WS_CORE');
    var adapters = Object.assign({}, ADAPTERS, opts.adapters || {});
    var activities = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : ['isolation'])
      .filter(function (id, i, all) { return adapters[id] && all.indexOf(id) === i; });
    var banks = opts.banks || {};
    var isEnglish = opts.isEnglish !== false;
    var audio = {}, byUri = {}, images = {}, byImage = {};
    var addAudio = function (uri) {
      if (!uri) return null;
      if (byUri[uri]) return byUri[uri];
      var id = 'a' + Object.keys(audio).length;
      audio[id] = uri; byUri[uri] = id;
      return id;
    };
    var addImage = function (uri) {
      var safe = imageUri(uri);
      if (!safe) return null;
      if (byImage[safe]) return byImage[safe];
      var id = 'm' + Object.keys(images).length;
      images[id] = safe; byImage[safe] = id;
      return id;
    };
    var assets = core.packAudioAssets(words);
    // Pictures by word, pack-wide, with the player's precedence: a row's own
    // image wins over the shared _decodingAssets/_aacAssets manifest.
    var pictures = {};
    (Array.isArray(words) ? words : []).forEach(function (w) {
      [w && w._decodingAssets, w && w._aacAssets].forEach(function (bucket) {
        if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) Object.keys(bucket).forEach(function (k) { if (typeof bucket[k] === 'string') pictures[k.trim().toLowerCase()] = bucket[k]; });
      });
    });
    (Array.isArray(words) ? words : []).forEach(function (w) {
      var key = str(w && (w.targetWord || w.word || w.term)).trim().toLowerCase();
      if (key && w && typeof w.image === 'string' && w.image && w.image.indexOf('ref::') !== 0) pictures[key] = w.image;
    });
    var packUri = function (text) {
      var asset = assets[core.packAudioKey(text)];
      if (!asset) return null;
      if (typeof asset === 'string') return /^data:audio\/[a-z0-9.+-]+(;[^,]*)?,/i.test(asset) ? asset : null;
      if (!core.portablePackAsset(asset)) return null;
      return 'data:' + asset.mime.trim().toLowerCase() + ';base64,' + asset.base64.replace(/\s+/g, '');
    };
    var env = {
      core: core,
      isEnglish: isEnglish,
      ordinalKeys: ORDINAL_KEYS,
      label: function (value) { return core.phonemeLabel(value, isEnglish); },
      uniqueLabels: function (values) {
        var out = [];
        (Array.isArray(values) ? values : []).forEach(function (v) { var l = core.phonemeLabel(v, isEnglish); if (l && out.indexOf(l) < 0) out.push(l); });
        return out;
      },
      // A prepared recording from the pack, keyed by its text (a word, a
      // prompt, a sentence). The whole pack's recordings are searched, so
      // answer choices that are other lesson words resolve too.
      packClip: function (text) { return addAudio(packUri(text)); },
      wordClip: function (text) { return addAudio(packUri(text) || bankUri(banks.words, core.packAudioKey(text))); },
      bankClip: function (category, key) { return addAudio(bankUri(banks[category], key)); },
      phonemeClip: function (label) {
        var candidates = core.phonemeBankCandidates(label);
        for (var i = 0; i < candidates.length; i++) { var uri = bankUri(banks.phonemes, candidates[i]); if (uri) return addAudio(uri); }
        return null;
      },
      image: addImage,
      // The raw picture for a word (data: URI or base64), or null. Pass it
      // through image() to embed it; an http(s) URL cannot travel offline.
      packImage: function (text) { var v = pictures[str(text).trim().toLowerCase()]; return typeof v === 'string' && v ? v : null; },
      // The whole pack, read-only, for boards the app validates against every
      // lesson word (Sound Sort, Rhyme Time). Copy nothing from it you do not play.
      packWords: Array.isArray(words) ? words.slice() : [],
      language: str(opts.language || 'en'),
      // A prepared recording that lives inside a board (a teacher's syllable
      // recordings), given as a data: URI. Embedded only if it is audio.
      recordingClip: function (dataUri) {
        var v = typeof dataUri === 'string' ? dataUri : '';
        return /^data:audio\/[a-z0-9.+-]+(;[^,]*)?,/i.test(v) && v.length < 1400000 ? addAudio(v) : null;
      },
    };
    var blocks = [];
    var exceptions = [];
    activities.forEach(function (id) {
      var adapter = adapters[id];
      var items = [];
      var seen = {};
      (Array.isArray(words) ? words : []).forEach(function (w) {
        if (!w || items.length >= MAX_ITEMS) return;
        var word = str(w.targetWord || w.word || w.term).trim();
        var key = core.packAudioKey(word);
        if (!word || seen[key]) return;
        seen[key] = true;
        var made;
        try { made = adapter.prepare(w, Object.assign({ word: word }, env)); } catch (_) { made = { missing: ['board'] }; }
        if (!made || !made.item) { exceptions.push({ activity: id, word: word, missing: (made && made.missing) || ['board'] }); return; }
        items.push(Object.assign({ id: id + '-' + items.length, word: word }, made.item));
      });
      if (items.length) blocks.push({ activity: id, items: items });
    });
    var feedback = { correct: [], retry: null };
    FEEDBACK_CORRECT.forEach(function (k) { var c = env.bankClip('instructions', k); if (c) feedback.correct.push(c); });
    feedback.retry = env.bankClip('instructions', FEEDBACK_RETRY);
    // Keep only the clips and pictures a shipped item or the feedback uses:
    // a word that was left out may already have looked some up.
    var used = {};
    var walk = function (value) {
      if (typeof value === 'string') { if (audio[value] || images[value]) used[value] = true; return; }
      if (value && typeof value === 'object') Object.keys(value).forEach(function (k) { walk(value[k]); });
    };
    walk(blocks); walk(feedback);
    Object.keys(audio).forEach(function (id) { if (!used[id]) delete audio[id]; });
    Object.keys(images).forEach(function (id) { if (!used[id]) delete images[id]; });
    var title = str(opts.title).trim().slice(0, 120) || DEFAULT_LABELS.title;
    var content = { title: title, showLetters: !!opts.showLetters, blocks: blocks };
    var lesson = {
      schema: LESSON_SCHEMA,
      player: PLAYER,
      lessonId: str(opts.lessonId) || randomId(),
      revision: 'r' + hashText(JSON.stringify(content) + Object.keys(audio).map(function (k) { return audio[k].length; }).join(',')),
      createdAt: new Date().toISOString(),
      language: 'en',
      title: title,
      showLetters: !!opts.showLetters,
      activityTitles: blocks.reduce(function (acc, b) { acc[b.activity] = adapters[b.activity].title; return acc; }, {}),
      blocks: blocks,
      feedback: feedback,
      audio: audio,
      images: images,
      // Only a Google Apps Script web app can be a send target: that is all
      // the file's network policy allows, and all a Class Mailbox ever is.
      submit: opts.submit && /^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]+\/|macros\/)s\/[A-Za-z0-9_-]+\/exec$/.test(str(opts.submit.url)) && /^PK-[0-9a-f-]{36}$/i.test(str(opts.submit.packId))
        ? { url: str(opts.submit.url), packId: str(opts.submit.packId), secret: str(opts.submit.secret).slice(0, 64), expiresAt: str(opts.submit.expiresAt).slice(0, 40) } : null,
    };
    var ready = blocks.reduce(function (n, b) { return n + b.items.length; }, 0);
    var perActivity = activities.map(function (id) {
      var block = blocks.filter(function (b) { return b.activity === id; })[0];
      return { activity: id, title: adapters[id].title, ready: block ? block.items.length : 0, exceptions: exceptions.filter(function (e) { return e.activity === id; }) };
    });
    return { lesson: lesson, exceptions: exceptions, ready: ready, total: ready + exceptions.length, perActivity: perActivity };
  }

  // JSON inside a <script> block: no "</script>", no line separators.
  function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  function escapeHtml(value) {
    return str(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var CSS = [
    ':root{--bg:#f6f7fb;--card:#fff;--ink:#1d2433;--muted:#4a5468;--accent:#3d3aa8;--accent-ink:#fff;--ok:#1d6b3a;--ok-bg:#e3f4e9;--warn:#8a4b00;--warn-bg:#fff1dc;--line:#c9cede;--focus:#b54700}',
    '@media (prefers-color-scheme:dark){:root{--bg:#141824;--card:#1f2535;--ink:#eef1f8;--muted:#b7bfd2;--accent:#a9a7ff;--accent-ink:#141824;--ok:#8fe0ab;--ok-bg:#163423;--warn:#ffc77a;--warn-bg:#3a2a12;--line:#3a4258;--focus:#ffb070}}',
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'main{max-width:760px;margin:0 auto;padding:24px 16px 48px}h1{font-size:1.6rem;margin:0 0 12px}h2{font-size:1.3rem;margin:0 0 12px}',
    '.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin:16px 0}',
    'button{font:inherit;min-height:48px;min-width:48px;padding:10px 18px;border-radius:12px;border:2px solid var(--accent);background:var(--card);color:var(--ink);cursor:pointer}',
    'button.primary{background:var(--accent);color:var(--accent-ink)}button:disabled,button[aria-disabled=true]{opacity:.55;cursor:not-allowed}',
    'button[aria-pressed=true]{outline:3px solid var(--accent);outline-offset:2px}',
    ':focus-visible{outline:3px solid var(--focus);outline-offset:3px}h2[tabindex="-1"]:focus{outline:none}',
    '.row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.choices{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;list-style:none;padding:0;margin:16px 0}',
    '.choice{border:2px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px}.choice.tried{border-style:dashed}.choice.right{border-color:var(--ok);background:var(--ok-bg)}.choice.solo{border-color:transparent}.choice.solo.tried{border-color:var(--line)}.choice.solo.right{border-color:var(--ok)}',
    '.slots{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:16px 0}.slot{min-width:64px;min-height:64px;border:2px dashed var(--line);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700}',
    '.picture{max-width:160px;max-height:160px;border-radius:12px}',
    '.letters{font-size:1.5rem;font-weight:700}.status{min-height:1.5em;margin:12px 0;padding:8px 12px;border-radius:10px}.status.ok{background:var(--ok-bg);color:var(--ok)}.status.warn{background:var(--warn-bg);color:var(--warn)}',
    'label{display:block;margin:12px 0 4px;font-weight:600}input{font:inherit;width:100%;max-width:360px;min-height:48px;padding:8px 12px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink)}',
    '.muted{color:var(--muted)}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}',
  ].join('\n');

  // ---------------------------------------------------------------------------
  // The player shell (runs INSIDE the downloaded file). Self-contained: it
  // uses only its parameters. `matches` is WS_CORE.soundAnswerMatches and
  // `renders` maps activity id -> adapter.render, all embedded verbatim.
  // ---------------------------------------------------------------------------
  function takeHomeShell(doc, win, lesson, L, matches, renders) {
    var storageKey = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
    var main = doc.getElementById('app');
    var live = doc.getElementById('live');
    var storeOk = true;
    var state = null;
    var audioEl = null;
    var screenId = 0;
    var items = [];
    lesson.blocks.forEach(function (block) { block.items.forEach(function (item, i) { items.push({ activity: block.activity, item: item, n: i + 1, total: block.items.length }); }); });
    var fmt = function (template, params) {
      return String(template || '').replace(/\{(\w+)\}/g, function (m, k) { return params && params[k] != null ? params[k] : m; });
    };
    var announce = function (text) { live.textContent = ''; win.setTimeout(function () { live.textContent = text; }, 30); };
    var el = function (tag, attrs, children) {
      var node = doc.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { node.addEventListener(ev, attrs.on[ev]); });
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      });
      (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
      return node;
    };
    var fresh = function () {
      return { name: '', index: 0, startedAt: null, finishedAt: null, savedFile: null, sent: null,
        items: items.map(function (e) { return { itemId: e.item.id, activity: e.activity, responses: [], attempts: 0, firstTry: false, correct: false, done: false, supports: {} }; }) };
    };
    var save = function () {
      try { win.localStorage.setItem(storageKey, JSON.stringify(state)); storeOk = true; } catch (_) { storeOk = false; }
    };
    var load = function () {
      try {
        var raw = win.localStorage.getItem(storageKey);
        var parsed = raw && JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length === items.length) return parsed;
      } catch (_) { storeOk = false; }
      return null;
    };
    var stop = function () { if (audioEl) { try { audioEl.pause(); } catch (_) {} audioEl = null; } };
    // rate: optional playback speed (e.g. 0.5 for "Hear it slowly").
    var play = function (id, rate) {
      stop();
      var src = id && lesson.audio[id];
      if (!src) return Promise.resolve(false);
      var a = new win.Audio(src);
      if (rate > 0 && rate !== 1) { try { a.playbackRate = rate; } catch (_) {} }
      audioEl = a;
      return new Promise(function (resolve) {
        var settle = function (ok) { a.onended = a.onerror = null; resolve(ok); };
        a.onended = function () { settle(true); };
        a.onerror = function () { settle(false); };
        var p = a.play();
        if (p && p.catch) p.catch(function () { settle(false); });
      }).then(function (ok) {
        if (!ok && audioEl === a) announce(L.audio_missing);
        return ok;
      });
    };
    // A sequence belongs to the screen that started it: moving on cancels it.
    var playAll = function (ids) {
      var mine = screenId;
      return (ids || []).reduce(function (chain, id) {
        return chain.then(function () { return mine === screenId && id ? play(id) : false; });
      }, Promise.resolve(true));
    };
    var screen = function (heading, nodes, hideHeading) {
      screenId++;
      stop();
      main.textContent = '';
      // hideHeading: the page title already shows it; screen readers still hear it.
      var h = el('h2', hideHeading ? { tabindex: '-1', class: 'sr', text: heading } : { tabindex: '-1', text: heading });
      main.appendChild(h);
      nodes.forEach(function (n) { if (n) main.appendChild(n); });
      h.focus();
    };
    var statusLine = function (text, tone) { return el('p', { class: 'status' + (tone ? ' ' + tone : ''), role: 'status', text: text }); };
    var activityTitle = function (id) { return L[id + '_title'] || (lesson.activityTitles && lesson.activityTitles[id]) || id; };

    var renderStart = function () {
      var prior = load();
      var nameInput = el('input', { id: 'learner-name', type: 'text', autocomplete: 'off', maxlength: '60' });
      var resumable = prior && prior.index > 0 && !prior.finishedAt;
      var begin = function (keep) {
        state = keep && prior ? prior : fresh();
        state.name = String(nameInput.value || (keep && prior ? prior.name : '') || '').trim().slice(0, 60);
        if (!state.startedAt) state.startedAt = new Date().toISOString();
        save();
        renderItem();
      };
      var buttons = [el('button', { class: 'primary', type: 'button', on: { click: function () { begin(false); } }, text: resumable ? L.start_over : L.start })];
      if (resumable) buttons.unshift(el('button', { class: 'primary', type: 'button', on: { click: function () { begin(true); } }, text: L.continue }));
      if (prior && prior.name) nameInput.value = prior.name;
      screen(lesson.title, [
        el('div', { class: 'card' }, [
          el('p', { text: L.intro }),
          el('label', { for: 'learner-name', text: L.name_label }), nameInput,
          el('div', { class: 'row', style: 'margin-top:16px' }, buttons),
        ]),
      ], true);
    };

    var renderItem = function () {
      if (state.index >= items.length) { renderFinish(); return; }
      var entry = items[state.index];
      var item = entry.item;
      var rec = state.items[state.index];
      var render = renders[entry.activity];
      var feedback = statusLine('', '');
      var area = el('div', {});
      var handle = null;
      var nextButton = el('button', { class: 'primary', type: 'button', hidden: true, on: { click: function () { state.index++; save(); renderItem(); } },
        text: state.index === items.length - 1 ? L.finish : L.next });
      var finishPractice = function () {
        rec.done = true; rec.correct = false; rec.firstTry = false;
        save();
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(null); } catch (_) {} }
        nextButton.hidden = false;
        nextButton.focus();
      };
      var finishItem = function (correct) {
        rec.done = true; rec.correct = correct; rec.firstTry = correct && rec.attempts === 1;
        save();
        if (handle && typeof handle.reveal === 'function') { try { handle.reveal(correct); } catch (_) {} }
        nextButton.hidden = false;
        nextButton.focus();
      };
      var ctx = {
        root: area, el: el, fmt: fmt, L: L, item: item, matches: matches, showLetters: !!lesson.showLetters,
        play: play, playAll: playAll, stop: stop, announce: announce,
        image: function (id) { return (id && lesson.images && lesson.images[id]) || null; },
        ordinal: function (p) { return (L.ordinals && L.ordinals[p]) || String(p + 1); },
        support: function (name) { rec.supports[name] = (rec.supports[name] || 0) + 1; save(); },
        isDone: function () { return rec.done; },
        attempts: function () { return rec.attempts; },
        // Practice that is never scored (Letter Trace): 'traced' or 'skipped'.
        practice: function (status, text) {
          if (rec.done) return;
          rec.attempts++;
          rec.responses.push(status === 'skipped' ? 'skipped' : 'traced');
          rec.practice = status === 'skipped' ? 'skipped' : 'traced';
          feedback.className = 'status ok'; feedback.textContent = text || '';
          finishPractice();
        },
        // Grade one response. Returns 'correct', 'retry' (try again) or 'missed'
        // (attempts used up). The shell handles feedback, sounds and Next.
        answer: function (response, isCorrect, options) {
          if (rec.done) return rec.correct ? 'correct' : 'missed';
          var o = options || {};
          var max = Number(item.maxAttempts) > 0 ? Number(item.maxAttempts) : 2;
          rec.attempts++;
          rec.responses.push(typeof response === 'string' ? response.slice(0, 80) : JSON.stringify(response).slice(0, 200));
          if (isCorrect) {
            feedback.className = 'status ok'; feedback.textContent = o.correctText || L.correct;
            var praise = lesson.feedback.correct;
            finishItem(true);
            play(praise.length ? praise[state.index % praise.length] : null);
            return 'correct';
          }
          if (rec.attempts < max) {
            feedback.className = 'status warn'; feedback.textContent = o.retryText || L.try_again;
            save();
            play(lesson.feedback.retry);
            return 'retry';
          }
          feedback.className = 'status warn'; feedback.textContent = o.missedText || L.missed;
          finishItem(false);
          playAll(item.answerAudio || []);
          return 'missed';
        },
      };
      screen(fmt(L.item_of, { activity: activityTitle(entry.activity), n: entry.n, total: entry.total }), [
        el('div', { class: 'card' }, [area, feedback, nextButton]),
      ]);
      try { handle = render(item, ctx) || null; } catch (err) { area.appendChild(statusLine(L.audio_missing, 'warn')); }
      // Reopened on an answered item: show its outcome, do not ask again.
      if (rec.done) { if (rec.practice) finishPractice(); else finishItem(rec.correct); }
      else playAll(item.introAudio || []);
    };

    var resultFile = function () {
      return {
        kind: 'alloflow-take-home-result', schemaVersion: 2, player: lesson.player,
        lessonId: lesson.lessonId, revision: lesson.revision, lessonTitle: lesson.title, activityTitles: lesson.activityTitles || {},
        learnerName: state.name, startedAt: state.startedAt, finishedAt: state.finishedAt, timesAreFromTheLearnerDevice: true,
        items: items.map(function (e, i) {
          var r = state.items[i];
          return { itemId: e.item.id, activity: e.activity, word: e.item.word, target: e.item.target != null ? e.item.target : null,
            responses: r.responses.slice(), attempts: r.attempts, firstTry: r.firstTry, correct: r.correct, done: r.done, supports: r.supports,
            practice: r.practice || null };
        }),
        summary: summarize(),
      };
    };
    var summarize = function () {
      var s = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 };
      state.items.forEach(function (r, i) {
        // Practice items (Letter Trace) are counted apart and never scored.
        if (r.practice || (items[i] && items[i].activity === 'letter_tracing')) { if (r.done) s.practised++; return; }
        s.items++;
        if (!r.done) return; s.done++; if (r.firstTry) s.firstTry++; else if (r.correct) s.afterRetry++; else s.missed++;
      });
      return s;
    };
    // Mailbox send: the endpoint, pack capability (id + k) and chunked
    // `putsubmission` protocol a hosted homework link uses. Plain-text POST,
    // so there is no preflight. The submission id is kept per attempt, so a
    // retry is recognised by the mailbox instead of filed twice.
    var uuid = function () {
      try { if (win.crypto && win.crypto.randomUUID) return win.crypto.randomUUID(); } catch (_) {}
      var h = '0123456789abcdef', s = '';
      for (var i = 0; i < 36; i++) s += (i === 8 || i === 13 || i === 18 || i === 23) ? '-' : h[Math.floor(Math.random() * 16)];
      return s;
    };
    var post = function (url, payload) {
      return win.fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' })
        .then(function (r) { return r.json(); })
        .then(function (data) { if (!data || data.ok !== true) throw new Error((data && data.e) || 'not ok'); return data; });
    };
    var send = function () {
      var target = lesson.submit;
      if (!state.sendSid) { state.sendSid = 'SUB-' + uuid(); save(); }
      var payload = JSON.stringify({ kind: 'alloflow-take-home-submission', schemaVersion: 1, studentName: String(state.name || 'Student').slice(0, 80),
        submissionDate: state.finishedAt, takeHomeResult: resultFile() });
      var parts = [];
      for (var at = 0; at < payload.length; at += 60000) parts.push(payload.slice(at, at + 60000));
      return parts.reduce(function (chain, data, i) {
        return chain.then(function () { return post(target.url, { a: 'putsubmission', id: target.packId, k: target.secret, sid: state.sendSid, part: i + 1, of: parts.length, data: data }); });
      }, Promise.resolve(null));
    };
    var renderFinish = function () {
      if (!state.finishedAt) { state.finishedAt = new Date().toISOString(); save(); }
      var s = summarize();
      var fileStatus = statusLine(state.sent ? fmt(L.sent, { receipt: state.sent }) : state.savedFile ? fmt(L.saved_file, { file: state.savedFile }) : (storeOk ? L.saved_device : L.saved_device_off),
        state.sent || state.savedFile ? 'ok' : (storeOk ? '' : 'warn'));
      var safe = function (v) { return String(v || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40); };
      var saveButton = el('button', { class: state.sent ? '' : 'primary', type: 'button', on: { click: function () {
        var name = ['word-sounds', safe(lesson.title), safe(state.name) || 'results', 'results'].filter(Boolean).join('-') + '.json';
        var blob = new win.Blob([JSON.stringify(resultFile(), null, 2)], { type: 'application/json' });
        var url = win.URL.createObjectURL(blob);
        var a = el('a', { href: url, download: name });
        doc.body.appendChild(a); a.click(); a.remove();
        win.setTimeout(function () { win.URL.revokeObjectURL(url); }, 60000);
        state.savedFile = name; save();
        if (!state.sent) { fileStatus.className = 'status ok'; fileStatus.textContent = fmt(L.saved_file, { file: name }); announce(fileStatus.textContent); }
      } }, text: L.save });
      var sendButton = null;
      // The mailbox refuses sends after the teacher's closing date, so the
      // button goes away then instead of failing.
      var closesAt = lesson.submit ? Date.parse(lesson.submit.expiresAt || '') : NaN;
      var sendClosed = !state.sent && isFinite(closesAt) && closesAt <= Date.now();
      var closedDate = '';
      if (sendClosed) {
        try { closedDate = new Date(closesAt).toLocaleDateString(lesson.language || undefined); }
        catch (_) { closedDate = new Date(closesAt).toISOString().slice(0, 10); }
      }
      var closedNote = sendClosed ? fmt(L.send_closed, { date: closedDate }) : '';
      if (lesson.submit && lesson.submit.url && win.fetch && !sendClosed) {
        sendButton = el('button', { class: 'primary', type: 'button', on: { click: function () {
          if (sendButton.getAttribute('aria-disabled') === 'true') return;
          sendButton.setAttribute('aria-disabled', 'true');
          fileStatus.className = 'status'; fileStatus.textContent = L.sending; announce(L.sending);
          send().then(function (data) {
            state.sent = String((data && data.filename) || 'ok').slice(0, 120); save();
            fileStatus.className = 'status ok'; fileStatus.textContent = fmt(L.sent, { receipt: state.sent }); announce(fileStatus.textContent);
          }, function () {
            sendButton.removeAttribute('aria-disabled');
            fileStatus.className = 'status warn'; fileStatus.textContent = L.send_failed; announce(L.send_failed);
          });
        } }, text: L.send });
        if (state.sent) sendButton.setAttribute('aria-disabled', 'true');
      }
      screen(L.done_title, [
        el('div', { class: 'card' }, [
          el('p', { class: 'letters', text: fmt(L.done_summary, { first: s.firstTry, total: s.items }) }),
          s.afterRetry ? el('p', { text: fmt(L.done_retry, { retry: s.afterRetry }) }) : null,
          el('div', { class: 'row' }, [sendButton, saveButton, el('button', { type: 'button', on: { click: function () {
            try { win.localStorage.removeItem(storageKey); } catch (_) {}
            state = null; renderStart();
          } }, text: L.practice_again })]),
          fileStatus,
          el('p', { class: 'muted', text: closedNote || (sendButton ? L.send_note : L.not_sent) }),
        ]),
      ]);
    };
    renderStart();
    return { results: function () { return state && resultFile(); } };
  }

  function buildHtml(lesson, options) {
    var opts = options || {};
    var core = opts.core;
    if (!lesson || lesson.schema !== LESSON_SCHEMA || !lesson.blocks || !lesson.blocks.length) throw new Error('No ready items to export');
    if (!core || typeof core.soundAnswerMatches !== 'function') throw new Error('buildHtml needs WS_CORE');
    var adapters = Object.assign({}, ADAPTERS, opts.adapters || {});
    var used = lesson.blocks.map(function (b) { return b.activity; }).filter(function (id, i, all) { return all.indexOf(id) === i; });
    var labels = Object.assign({}, DEFAULT_LABELS);
    used.forEach(function (id) { Object.assign(labels, adapters[id].labels || {}); labels[id + '_title'] = labels[id + '_title'] || adapters[id].title; });
    Object.assign(labels, opts.labels || {});
    var renders = '{' + used.map(function (id) { return JSON.stringify(id) + ':' + adapters[id].render.toString(); }).join(',\n') + '}';
    var connect = lesson.submit && /^https:\/\/script\.google\.com\//.test(lesson.submit.url) ? ' https://script.google.com https://script.googleusercontent.com' : '';
    var csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src data: blob:; img-src data:" + (connect ? '; connect-src' + connect : '');
    // dir comes from the app (labels.dir) so Arabic, Farsi, Urdu, Hebrew... files read right to left.
    var dir = labels.dir === 'rtl' || labels.dir === 'ltr' ? ' dir="' + labels.dir + '"' : '';
    return '<!doctype html><html lang="' + escapeHtml(labels.lang || 'en') + '"' + dir + '><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<meta http-equiv="Content-Security-Policy" content="' + csp + '">'
      + '<meta name="generator" content="' + PLAYER + '">'
      + '<title>' + escapeHtml(lesson.title) + '</title><style>' + CSS + '</style></head>'
      + '<body><main><h1>' + escapeHtml(lesson.title) + '</h1><div id="app"></div><p id="live" class="sr" aria-live="polite"></p></main>'
      + '<script>\n(function(){"use strict";\nvar lesson=' + safeJson(lesson) + ';\nvar labels=' + safeJson(labels) + ';\nvar matches=' + core.soundAnswerMatches.toString()
      + ';\nvar renders=' + renders + ';\n(' + takeHomeShell.toString() + ')(document,window,lesson,labels,matches,renders);\n})();\n</script></body></html>';
  }

  // Teacher side: read returned result files (v1 Find Sounds files too).
  // Anything that is not exactly a result file is rejected with a reason.
  function parseResult(text) {
    var data;
    try { data = typeof text === 'string' ? JSON.parse(text) : text; } catch (_) { return { ok: false, error: 'not_json' }; }
    if (data && data.kind === 'alloflow-take-home-submission' && data.takeHomeResult) data = data.takeHomeResult;
    if (!data || data.kind !== RESULT_KIND) return { ok: false, error: 'not_a_result' };
    if (data.schemaVersion !== 1 && data.schemaVersion !== RESULT_SCHEMA) return { ok: false, error: 'unsupported_version' };
    if (!Array.isArray(data.items) || !data.lessonId) return { ok: false, error: 'incomplete' };
    var items = data.items.slice(0, 200).map(function (it) {
      return { activity: str((it && it.activity) || (data.schemaVersion === 1 ? 'isolation' : '')).slice(0, 40), word: str(it && it.word).slice(0, 60),
        target: str(it && it.target).slice(0, 40), attempts: Math.max(0, Math.min(9, Number(it && it.attempts) || 0)),
        firstTry: !!(it && it.firstTry), correct: !!(it && it.correct), done: !!(it && it.done),
        practice: it && (it.practice === 'traced' || it.practice === 'skipped') ? it.practice : null,
        responses: Array.isArray(it && it.responses) ? it.responses.slice(0, 6).map(function (r) { return str(r).slice(0, 80); }) : [],
        // Supports used (replays, hints): counts only, a bounded set of names.
        supports: (function (s) {
          var out = {};
          if (s && typeof s === 'object' && !Array.isArray(s)) Object.keys(s).slice(0, 12).forEach(function (k) {
            var n = Number(s[k]);
            if (/^[A-Za-z_]{1,40}$/.test(k) && Number.isFinite(n) && n > 0) out[k] = Math.min(999, Math.floor(n));
          });
          return out;
        })(it && it.supports) };
    });
    var summary = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 };
    var byActivity = {};
    items.forEach(function (r) {
      var a = byActivity[r.activity] || (byActivity[r.activity] = { items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 0 });
      // Practice (Letter Trace) is reported, never scored.
      if (r.practice || r.activity === 'letter_tracing') { if (r.done) { summary.practised++; a.practised++; } return; }
      summary.items++;
      a.items++;
      if (!r.done) return;
      summary.done++; a.done++;
      if (r.firstTry) { summary.firstTry++; a.firstTry++; } else if (r.correct) { summary.afterRetry++; a.afterRetry++; } else { summary.missed++; a.missed++; }
    });
    var titles = {};
    Object.keys(byActivity).forEach(function (id) {
      var given = data.activityTitles && typeof data.activityTitles === 'object' ? data.activityTitles[id] : null;
      titles[id] = str(given || (ADAPTERS[id] && ADAPTERS[id].title) || (id === 'isolation' ? 'Find Sounds' : id)).slice(0, 60);
    });
    return { ok: true, result: { activityTitles: titles, lessonId: str(data.lessonId).slice(0, 120), revision: str(data.revision).slice(0, 40), lessonTitle: str(data.lessonTitle).slice(0, 120),
      learnerName: str(data.learnerName).slice(0, 60), finishedAt: str(data.finishedAt).slice(0, 40), items: items, summary: summary, byActivity: byActivity } };
  }

  // Every recorded sound in the shipped file as WAV. The sound bank and most
  // browser recordings are WebM/Opus, which iPad and older Safari may not
  // play; 16-bit mono WAV plays in every browser. 22,050 Hz keeps the high
  // frequencies that tell /s/, /f/ and /th/ apart. Runs in the teacher's
  // browser before buildHtml; a clip it cannot decode is kept as it was.
  var PORTABLE_AUDIO = /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3)[;,]/i;
  var PORTABLE_RATE = 22050;
  function dataUriBytes(uri) {
    var comma = uri.indexOf(',');
    var meta = uri.slice(0, comma), body = uri.slice(comma + 1);
    if (/;base64$/i.test(meta)) {
      var bin = atob(body), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(body));
  }
  function wavDataUri(samples, rate) {
    var bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer);
    var tag = function (at, text) { for (var i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i)); };
    tag(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    tag(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (var s = 0; s < samples.length; s++) {
      var v = Math.max(-1, Math.min(1, samples[s]));
      view.setInt16(44 + s * 2, v < 0 ? v * 32768 : v * 32767, true);
    }
    var out = '';
    for (var c = 0; c < bytes.length; c += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(c, c + 0x8000));
    return 'data:audio/wav;base64,' + btoa(out);
  }
  function portableAudio(lesson, options) {
    var opts = options || {};
    var g = typeof window !== 'undefined' ? window : root;
    var Ctx = opts.AudioContext || g.AudioContext || g.webkitAudioContext;
    var Offline = opts.OfflineAudioContext || g.OfflineAudioContext || g.webkitOfflineAudioContext;
    var report = { converted: 0, kept: 0, failed: [] };
    var ids = Object.keys((lesson && lesson.audio) || {});
    var todo = ids.filter(function (id) { return !PORTABLE_AUDIO.test(lesson.audio[id]); });
    report.kept = ids.length - todo.length;
    if (!todo.length) return Promise.resolve(report);
    if (!Ctx || !Offline) { report.failed = todo.slice(); return Promise.resolve(report); }
    var ctx;
    try { ctx = new Ctx(); } catch (_) { report.failed = todo.slice(); return Promise.resolve(report); }
    var done = 0;
    var decode = function (bytes) {
      return new Promise(function (resolve, reject) {
        var p = ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      });
    };
    var convert = function (id) {
      return decode(dataUriBytes(lesson.audio[id])).then(function (buffer) {
        if (!buffer || !(buffer.duration > 0) || buffer.duration > 60) throw new Error('bad clip');
        var length = Math.max(1, Math.ceil(buffer.duration * PORTABLE_RATE));
        var offline = new Offline(1, length, PORTABLE_RATE);
        var source = offline.createBufferSource();
        source.buffer = buffer; source.connect(offline.destination); source.start(0);
        return new Promise(function (resolve, reject) {
          var p = offline.startRendering();
          if (p && p.then) p.then(resolve, reject);
          else offline.oncomplete = function (e) { resolve(e.renderedBuffer); };
        });
      }).then(function (rendered) {
        lesson.audio[id] = wavDataUri(rendered.getChannelData(0), PORTABLE_RATE);
        report.converted++;
      }, function () { report.failed.push(id); }).then(function () {
        done++;
        if (typeof opts.onProgress === 'function') { try { opts.onProgress(done, todo.length); } catch (_) {} }
      });
    };
    return todo.reduce(function (chain, id) { return chain.then(function () { return convert(id); }); }, Promise.resolve())
      .then(function () { try { if (ctx.close) ctx.close(); } catch (_) {} return report; });
  }

  // Which activities this build can export, with their names (for the dialog).
  function activities(extra) {
    var all = Object.assign({}, ADAPTERS, extra || {});
    return Object.keys(all).map(function (id) { return { id: id, title: all[id].title }; });
  }

  root.AlloWordSoundsTakeHome = {
    LESSON_SCHEMA: LESSON_SCHEMA, RESULT_KIND: RESULT_KIND, PLAYER: PLAYER, ORDINAL_KEYS: ORDINAL_KEYS, DEFAULT_LABELS: DEFAULT_LABELS,
    ADAPTERS: ADAPTERS, activities: activities,
    lessonFromPack: lessonFromPack, buildHtml: buildHtml, parseResult: parseResult, portableAudio: portableAudio,
    // v1 name kept for callers built against the first release.
    buildFindSoundsHtml: buildHtml,
    _shell: takeHomeShell,
  };
})(typeof window !== 'undefined' ? window : globalThis);
