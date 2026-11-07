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
