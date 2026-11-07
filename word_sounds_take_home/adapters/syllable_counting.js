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
