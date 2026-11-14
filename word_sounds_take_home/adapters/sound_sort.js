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
// 2026-11-13 parity: the app's sound-only choices are now cards (a tap plays and selects, a
// large Check submits, a missed card is crossed out: 94704af0e4). The file keeps two buttons
// per choice, Listen first, then Choose, in every activity, as Find Sounds always had them
// (hear, then choose).
// The app does not trim a find-all board; neither does a packet.

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
    // 2026-11-13: without letters the choices say "Option 1": a tap on one chooses it, so "tap to hear" was wrong.
    sound_sort_instruction_listen: 'Press Listen to hear each word. Then choose every one that matches.',
    sound_sort_instruction_letters: 'Find all words that match: {family}',
    sound_sort_found: '{found} of {total} found',
    sound_sort_listen: 'Listen',
    sound_sort_listen_option: 'Listen to option {n}',
    sound_sort_listen_word: 'Listen to {word}',
    sound_sort_choose_option: 'Choose option {n}',
    sound_sort_choose_word: 'Choose {word}',
    sound_sort_option_n: 'Option {n}',
    sound_sort_hear_all: 'Hear all',
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
      : (ctx.showLetters ? T('heading_' + item.mode, { sound: typeof ctx.sound === 'function' ? ctx.sound(item.sound) : '/' + item.sound + '/' }) : T('heading_' + item.mode + '_hidden'));
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
          if (ctx.isDone() || card.found || card.tried) return;
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
          // A wrong tap costs one attempt. The chip stays on the board but cannot
          // be chosen again (the app counts a second tap of it as another miss).
          card.tried = true;
          box.classList.add('tried');
          choose.setAttribute('aria-disabled', 'true');
          ctx.answer(chip.text, false, {
            retryText: ctx.showLetters ? T('no_match_word', { word: chip.text }) : T('no_match'),
            missedText: ctx.showLetters ? T('missed', { words: memberText }) : T('missed_no_letters'),
          });
        } } }, [ctx.showLetters ? ctx.el('span', { class: 'letters', text: chip.text }) : T('option_n', { n: n })]);
      var box = ctx.el('li', { class: 'choice' }, [listen, choose]);
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
    ctx.root.appendChild(ctx.el('p', { text: ctx.showLetters ? T('instruction_letters', { family: heading }) : (T('instruction_listen') || T('instruction')) }));
    // Hear all words: the player's Hear all (ctx.hearAll), the words not found yet, each marked with its number.
    var hear = typeof ctx.hearAll === 'function' ? ctx.hearAll({ label: T('hear_all'), support: 'allWordListens', before: halt, auto: false,
      ready: function () { return !ctx.isDone(); },
      list: function () { return cards.map(function (c, i) { return c.found ? null : { box: c.box, n: i + 1, total: cards.length, say: function () { return ctx.play(c.chip.audio); } }; }); } }) : null;
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); run(instructionSteps()); } }, text: ctx.L.hear_question }),
      hear ? hear.button : ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.support('allWordListens'); run(chipSteps(true)); } }, text: T('hear_all') }),
      hear ? hear.note : null,
    ]));
    ctx.root.appendChild(counter);
    ctx.root.appendChild(list);
    if (!ctx.isDone()) run(instructionSteps().concat(chipSteps(false)));
    return {
      // The R key: the instruction again.
      replay: function () { run(instructionSteps()); },
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
