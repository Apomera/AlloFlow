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
