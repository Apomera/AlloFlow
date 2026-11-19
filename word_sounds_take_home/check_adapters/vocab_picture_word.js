// Practice and check adapter: Picture to word (vocab_picture_word). "Which word goes with this picture?": one
// picture is shown, the choices are words. It is vocab_picture.js apart from its id, its title and its words: see
// the notes there.
module.exports = {
  id: 'vocab_picture_word',
  title: 'Picture to word',
  labels: {
    vocab_picture_word_intro: 'Look at each picture. Choose the word that goes with it.',
    vocab_picture_word_directions: 'Look at the picture. Choose the word that goes with it.',
    vocab_picture_word_question: 'Which word goes with this picture?',
    vocab_picture_word_read: 'Read aloud',
    // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
    vocab_picture_word_read_choice: 'Hear it: choice {n}',
    vocab_picture_word_hear: 'Hear it',
    vocab_picture_word_picture: 'Picture {n}',
    vocab_picture_word_picture_of: 'Picture {n}: {word}',
    vocab_picture_word_correct: 'Yes. That is the word.',
    vocab_picture_word_retry: 'Not quite. Try once more.',
    vocab_picture_word_missed: 'Here is the right answer.',
    vocab_picture_word_practice_wrong: 'Not quite. Here is the right answer.',
  },
  // p: { word, ask, image (Picture to word), choices: [{ text, image, audio }], answer, read, lang, askAudio }
  prepare: function (p) {
    p = p || {};
    var line = function (v, max) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''; };
    var id = function (v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : ''; };
    var word = line(p.word, 300), ask = line(p.ask, 300);
    if (!word || !ask) return { missing: ['word'] };
    if (!Array.isArray(p.choices) || p.choices.length < 2 || p.choices.length > 6) return { missing: ['choices'] };
    var given = p.choices.map(function (c) { return c && typeof c === 'object' ? c : { text: c }; });
    var texts = given.map(function (c) { return line(c.text, 60); });
    var keys = texts.map(function (t) { return t.slice(0, 80).toLowerCase(); });
    if (texts.some(function (t) { return !t; }) || keys.some(function (k, i) { return keys.indexOf(k) !== i; })) return { missing: ['different choices'] };
    var image = id(p.image);
    // Each choice is a picture (Word to picture), or the question is (Picture to word): never both, never neither.
    var pictures = given.map(function (c) { return id(c.image); });
    var pictured = pictures.every(Boolean);
    if (pictured === !!image || (!pictured && pictures.some(Boolean))) return { missing: ['pictures'] };
    if (pictured && pictures.some(function (x, i) { return pictures.indexOf(x) !== i; })) return { missing: ['different pictures'] };
    var answer = line(p.answer, 60).slice(0, 80);
    if (!answer || texts.map(function (t) { return t.slice(0, 80); }).indexOf(answer) < 0) return { missing: ['an answer that is one of the choices'] };
    var lang = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(p.lang || '')) ? String(p.lang) : 'en';
    var item = { word: word, ask: ask, choices: given.map(function (c, i) {
      var out = { text: texts[i] };
      if (pictured) out.image = pictures[i];
      if (id(c.audio)) out.audio = id(c.audio);
      return out;
    }), answer: answer, read: p.read === true, lang: lang };
    if (image) item.image = image;
    if (id(p.askAudio)) item.askAudio = id(p.askAudio);
    return { item: item };
  },
  render: function (item, ctx) {
    return ctx.vocabChoice(item, 'vocab_picture_word_', true);
  },
  score: function (item, answer, response) {
    var chosen = String(response == null ? '' : response);
    return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
  },
};
