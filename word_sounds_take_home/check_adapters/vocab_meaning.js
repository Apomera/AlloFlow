// Practice and check adapter: Word to meaning (vocab_meaning). Vocabulary multiple choice, made by
// packet_vocab_builder.js from the teacher's checked list (packets-vocab.html). Its two siblings,
// vocab_word.js (Meaning to word) and vocab_blank.js (Fill the blank), are the same code apart from
// the prefix of their labels and their words (tests/packet_vocab_adapter.test.js compares them).
// Item: { word, ask (the text shown: the word, a meaning, or a sentence with ___), choices: [{ text }]
// in the order shown, answer (the first 80 characters of the right choice), read, lang }; a word with its own
// recorded voice also has a clip id (askAudio, or audio on its choice), played in place of the device voice.
// A response is the first 80 characters of the chosen text, because the player keeps 80 of a response.
// Read aloud uses the device's own speech voice, and only a voice the device says runs on the device
// (localService), so nothing is sent; with no such voice, or no speech engine, the buttons are not shown.
// prepare runs when the file is built; render and score are copied into the file with toString and use
// only their arguments (the speech engine is reached through ctx.root).
// 2026-11-13: a blank (___) in the question or a choice is shown as a line, and a screen reader hears the
// word "blank" instead (marked in render; as Word Sounds does, a visually hidden .sr span).
module.exports = {
  id: 'vocab_meaning',
  title: 'Word to meaning',
  labels: {
    vocab_meaning_intro: 'Read each word. Choose what it means.',
    vocab_meaning_directions: 'Read the word. Choose what it means.',
    vocab_meaning_question: 'What does this word mean?',
    vocab_meaning_read: 'Read aloud',
    // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
    vocab_meaning_read_choice: 'Hear it: choice {n}',
    vocab_meaning_hear: 'Hear it',
    vocab_meaning_correct: 'Yes. That is what it means.',
    vocab_meaning_retry: 'Not quite. Try once more.',
    vocab_meaning_missed: 'Here is the right answer.',
    vocab_meaning_practice_wrong: 'Not quite. Here is the right answer.',
    vocab_meaning_blank: 'blank',
  },
  // p: { word, ask, choices: [text, ...], answer: the right text, read: true | false, lang,
  //   askAudio: the clip id of the word asked (optional), choiceAudio: [clip id or null, ...] (optional) }
  // A clip id names a recording in lesson.audio: a word's own recorded voice, played in place of the device voice.
  prepare: function (p) {
    p = p || {};
    var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
    var clip = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
    var word = line(p.word, 300), ask = line(p.ask, 300);
    if (!word || !ask) return { missing: ['word'] };
    if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
    var texts = p.choices.map(function (c) { return line(c, 300); });
    var keys = texts.map(function (t) { return t.slice(0, 80); });
    if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
    var answer = line(p.answer, 300).slice(0, 80);
    if (!answer || keys.indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
    var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
    var heard = Array.isArray(p.choiceAudio) ? p.choiceAudio : [];
    var item = { word: word, ask: ask, choices: texts.map(function (t, i) { var c = { text: t }; if (clip(heard[i])) c.audio = clip(heard[i]); return c; }), answer: answer, read: p.read === true, lang: lang };
    if (clip(p.askAudio)) item.askAudio = clip(p.askAudio);
    return { item: item };
  },
  render: function (item, ctx) {
    return ctx.vocabChoice(item, 'vocab_meaning_');
  },
  score: function (item, answer, response) {
    var chosen = String(response == null ? '' : response);
    return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
  },
};
