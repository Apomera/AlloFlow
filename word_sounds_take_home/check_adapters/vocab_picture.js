// Practice and check adapter: Word to picture (vocab_picture). "Which picture shows this word?": the word is
// shown, the choices are 4 pictures. Made by packet_vocab_builder.js for list words that have a picture in the
// Word Sounds picture set (word_sounds_symbols_en.js; each set is credited in the file by the builder). Its
// sibling vocab_picture_word.js (Picture to word: one picture, the choices are words) is the same code apart from
// the prefix of its labels and its words (tests/packets_vocab_pictures.test.js compares them).
// Item: { word, ask, image (the picture asked about, Picture to word only), choices: [{ text, image (Word to
// picture), audio (a word's own recorded voice, optional) }] in the order shown, answer (the first 80 characters of
// the right choice's word), read, lang, askAudio (optional) }. The pictures are lesson.images ids; a picture
// choice is named "Picture 1" until the question is over, so a screen reader does not give the answer away.
// Read aloud and Hear all work as in vocab_meaning.js: a recorded clip where the word has one, else only a voice
// that runs on the device. prepare runs when the file is built; render and score are copied into the file.
module.exports = {
  id: 'vocab_picture',
  title: 'Word to picture',
  labels: {
    vocab_picture_intro: 'Read each word. Choose the picture that shows it.',
    vocab_picture_directions: 'Read the word. Choose the picture that shows it.',
    vocab_picture_question: 'Which picture shows this word?',
    vocab_picture_read: 'Read aloud',
    // 2026-11-13: the name begins with the button's visible words, Hear it (WCAG 2.5.3 Label in Name).
    vocab_picture_read_choice: 'Hear it: choice {n}',
    vocab_picture_hear: 'Hear it',
    vocab_picture_picture: 'Picture {n}',
    vocab_picture_picture_of: 'Picture {n}: {word}',
    vocab_picture_correct: 'Yes. That picture shows it.',
    vocab_picture_retry: 'Not quite. Try once more.',
    vocab_picture_missed: 'Here is the right answer.',
    vocab_picture_practice_wrong: 'Not quite. Here is the right answer.',
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
    return ctx.vocabChoice(item, 'vocab_picture_', true);
  },
  score: function (item, answer, response) {
    var chosen = String(response == null ? '' : response);
    return { correct: chosen !== '' && chosen === String(answer).slice(0, 80), digitsCorrect: null, digitsPossible: null };
  },
};
