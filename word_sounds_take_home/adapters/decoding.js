// Take-home adapter: Read & Match (decoding).
// App: board { choices: [word + 3 others] } (word_sounds_setup_source.jsx:4717,4816);
// pictures from the pack's shared image manifest (_decodingAssets/_aacAssets on
// the first row, row images win: word_sounds_module.js:8139-8152, setup
// 5231-5254,5552); the grid shows only when EVERY choice has its picture
// (word_sounds_module.js:20798-20805). The printed word is never spoken
// (17169-17171). Graded at word_sounds_module.js:20808 ->
// checkAnswer(choice, word): lower-cased, trimmed comparison
// (17099-17113), 2 tries.
// 2026-11-13: each picture shows the number of its key, 1-9 (the player's keys
// choose the nth picture): file has / app lacks.

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
    item.choices.forEach(function (choice, i) {
      var right = norm(choice.text) === norm(item.target);
      var src = ctx.image(choice.image);
      var name = ctx.fmt(ctx.L.decoding_picture_of, { word: choice.text });
      // The picture's number, the key 1-9 that chooses it (2026-11-13).
      var number = i < 9 ? ctx.el('span', { 'aria-hidden': 'true', 'data-key-number': '', style: 'position:absolute;top:6px;inset-inline-start:6px;min-width:28px;height:28px;line-height:28px;border-radius:14px;background:var(--accent);color:var(--accent-ink);font-weight:700;font-size:1rem;text-align:center', text: String(i + 1) }) : null;
      var pick = ctx.el('button', { type: 'button', 'aria-label': name, style: 'position:relative;width:100%;display:flex;justify-content:center;background:#fff',
        on: { click: function () {
          if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true') return;
          var outcome = ctx.answer(choice.text, right, {
            correctText: ctx.L.decoding_correct,
            missedText: ctx.fmt(ctx.L.decoding_missed, { word: item.printed }),
          });
          if (outcome !== 'correct') { box.classList.add('tried'); pick.setAttribute('aria-disabled', 'true'); }
        } } }, [number, ctx.el('img', { class: 'picture', src: src || '', alt: '' })]);
      var box = ctx.el('li', { class: 'choice' }, [pick]);
      cards.push({ box: box, pick: pick, right: right });
      list.appendChild(box);
    });
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.decoding_prompt }));
    // The printed word, as the app shows it (CSS capitalize).
    ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', dir: 'ltr', style: 'font-size:3rem;text-transform:capitalize;margin:8px 0', text: item.printed }));
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
