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
// 2026-11-13 parity: as in the app, a right answer is followed by the sentence read
// back by itself (payoff, after the praise clip; the button stays). Choices print as
// written, so a name keeps its capital; the app lower-cases its chips (word-bank
// convention, word_sounds_module.js ~24217): file has / app lacks.

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
    // One choice for each recording key. For the answer's key the word's own spelling is kept (2026-11-13, answer audit):
    // the first spelling was kept before, so a distractor written "ice  cream" stood for the answer and no choice was right.
    var answerKey = core.packAudioKey(word.normalize('NFC'));
    raw.forEach(function (o) {
      var k = core.packAudioKey(o.normalize('NFC'));
      if (!distinct[k]) { distinct[k] = o; options.push(o); }
      else if (k === answerKey && o === word.trim() && distinct[k] !== o) { options[options.indexOf(distinct[k])] = o; distinct[k] = o; }
    });
    var correct = distinct[answerKey];
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
    // The key prepare() uses (2026-11-13): spaces or an accent written two ways are one choice.
    var norm = function (s) { var t = String(s == null ? '' : s); try { t = t.normalize('NFC'); } catch (_) {} return t.toLowerCase().trim().replace(/\s+/g, ' '); };
    var picture = ctx.image(item.picture);
    var blank = ctx.el('span', { style: 'display:inline-block;min-width:4.5em;border-bottom:3px dashed var(--muted);text-align:center' }, [
      ctx.el('span', { 'aria-hidden': 'true', text: '\u00a0' }), ctx.el('span', { class: 'sr', text: ctx.L.read_sentence_blank })]);
    var after = ctx.el('div', { class: 'row' });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.read_sentence_prompt }));
    ctx.root.appendChild(ctx.el('p', { class: 'muted', text: picture ? ctx.L.read_sentence_picture_practice : ctx.L.read_sentence_matching_practice }));
    if (picture) ctx.root.appendChild(ctx.el('img', { class: 'picture', src: picture, alt: ctx.fmt(ctx.L.read_sentence_picture_clue, { word: item.target }) }));
    else ctx.root.appendChild(ctx.el('p', {}, [ctx.L.read_sentence_word_hint + ' ', ctx.el('span', { class: 'letters', lang: 'en', text: item.target })]));
    // data-read: running text, where the shell's reading focus can go.
    // dir: an English sentence keeps its full stop on the right in a right-to-left page.
    ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', dir: 'ltr', style: 'font-size:1.8rem;white-space:pre-wrap', 'data-read': '' }, [item.before, blank, item.after]));
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
        } } }, [ctx.el('span', { class: 'letters', lang: 'en', text: option })]);
      var box = ctx.el('li', { class: 'choice' }, [choose]);
      cards.push({ box: box, choose: choose, right: right });
      list.appendChild(box);
    });
    ctx.root.appendChild(list);
    ctx.root.appendChild(after);
    return {
      // After a right answer, once the praise is over, the sentence is read back by itself (the app's payoff). The
      // button below stays to hear it again.
      payoff: function () { if (item.sentenceAudio) ctx.play(item.sentenceAudio); },
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
