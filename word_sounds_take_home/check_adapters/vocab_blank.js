// Practice and check adapter: Fill the blank (vocab_blank). A sentence with ___ is shown; the choices are words.
// It is vocab_meaning.js apart from its id, its title and its words: see the notes there.
module.exports = {
  id: 'vocab_blank',
  title: 'Fill the blank',
  labels: {
    vocab_blank_intro: 'Read each sentence. Choose the word that fits.',
    vocab_blank_directions: 'Read the sentence. Choose the word that fits in the blank.',
    vocab_blank_question: 'Which word fits in the blank?',
    vocab_blank_read: 'Read aloud',
    // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
    vocab_blank_read_choice: 'Hear it: choice {n}',
    vocab_blank_hear: 'Hear it',
    vocab_blank_correct: 'Yes. That word fits.',
    vocab_blank_retry: 'Not quite. Try once more.',
    vocab_blank_missed: 'Here is the right answer.',
    vocab_blank_practice_wrong: 'Not quite. Here is the right answer.',
    vocab_blank_blank: 'blank',
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
    return ctx.vocabChoice(item, 'vocab_blank_');
  },
  score: function (item, answer, response) {
    var chosen = String(response == null ? '' : response);
    return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
  },
};
