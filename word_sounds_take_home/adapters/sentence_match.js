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
// 2026-11-13 parity: the file reads it back by itself too (payoff, after the praise
// clip; the button stays). A sentence that names a picture twice takes either tile of
// that word in either slot (before, the second tile was refused and the item could not
// be finished). The pictures carry their key numbers 1-9 (file has / app lacks).

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
    sentence_match_order_hint: 'Place the pictures in the order they appear.',
    sentence_match_slot_empty: 'Slot {n}, empty',
    sentence_match_slot_filled: 'Slot {n}: {word}. Tap to take it out.',
    sentence_match_picture_of: 'Picture of {word}',
    sentence_match_hear_instructions: 'Hear the instructions',
    sentence_match_hear_sentence: 'Hear the sentence',
    sentence_match_correct: 'Yes! The pictures match the sentence.',
    sentence_match_missed: 'Here are the pictures that match the sentence.',
    sentence_match_placed: '{word} is in slot {n}.',
    sentence_match_removed: '{word} taken out of slot {n}.',
    sentence_match_cleared: 'All the slots are empty again.',
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
    var win = ctx.root.ownerDocument.defaultView;
    // A slot holds a tile's place in the tray (not its word): a sentence that names a picture twice can be
    // finished with either tile of that word (2026-11-13).
    var slots = item.sequence.map(function () { return null; });
    var retryMarks = null;
    var retryTimer = null;
    var imageOf = {};
    item.tiles.forEach(function (t) { imageOf[t.text] = ctx.image(t.image); });
    var tileCards = [];
    var slotButtons = [];
    var tray = ctx.el('ul', { class: 'choices' });
    var slotRow = ctx.el('ul', { class: 'slots', dir: 'ltr' });
    var after = ctx.el('div', { class: 'row' });
    var wordIn = function (i) { return slots[i] == null ? null : item.tiles[slots[i]].text; };
    var stopRetryHold = function (clearSlots) {
      if (retryTimer != null) { try { win.clearTimeout(retryTimer); } catch (_) {} retryTimer = null; }
      if (!retryMarks) return;
      retryMarks = null;
      if (clearSlots) slots = item.sequence.map(function () { return null; });
    };
    var drawSlots = function (right) {
      slotButtons.forEach(function (b, i) {
        var word = wordIn(i);
        var mark = retryMarks ? retryMarks[i] : '';
        b.textContent = '';
        b.appendChild(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:1rem;margin-inline-end:6px', text: String(i + 1) }));
        b.appendChild(word ? ctx.el('img', { src: imageOf[word] || '', alt: '', style: 'width:clamp(48px,14vw,72px);height:clamp(48px,14vw,72px);object-fit:contain;background:#fff;border-radius:8px;padding:4px' }) : ctx.el('span', { 'aria-hidden': 'true', text: '?' }));
        b.setAttribute('aria-label', word
          ? (right || ctx.isDone() ? ctx.fmt(ctx.L.sentence_match_slot_filled, { n: i + 1, word: word }) : 'Slot ' + (i + 1) + ': Picture ' + (slots[i] + 1) + '. Tap to take it out.')
          : ctx.fmt(ctx.L.sentence_match_slot_empty, { n: i + 1 }));
        if (!word || ctx.isDone()) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
        if (mark) b.setAttribute('data-retry-mark', mark); else b.removeAttribute('data-retry-mark');
        b.style.borderColor = right || mark === 'ok' ? 'var(--ok)' : mark === 'warn' ? 'var(--warn)' : '';
        b.style.background = right || mark === 'ok' ? 'var(--ok-bg)' : mark === 'warn' ? 'var(--warn-bg)' : '';
      });
      tileCards.forEach(function (c, ti) {
        // While retryMarks is showing, non-tried tiles stay enabled so a learner can tap right away to start retrying.
        var used = retryMarks ? false : slots.indexOf(ti) >= 0;
        if (used || c.tried || ctx.isDone()) c.pick.setAttribute('aria-disabled', 'true'); else c.pick.removeAttribute('aria-disabled');
        c.pick.style.opacity = used && !right ? '0.3' : '';
      });
    };
    var grade = function () {
      if (slots.some(function (s) { return s == null; })) return;
      var ok = slots.every(function (ti, i) { return item.tiles[ti].text === item.sequence[i]; });
      var response = slots.map(function (ti) { return item.tiles[ti].text; }).join(' ');
      var outcome = ctx.answer(response, ok, { correctText: ctx.L.sentence_match_correct, missedText: ctx.L.sentence_match_missed });
      if (outcome === 'retry') {
        // One-picture boards: that picture is out. Show per-slot right/wrong feedback briefly (or until the next tap) before clearing.
        if (item.sequence.length === 1) { var out = tileCards[slots[0]]; out.tried = true; out.box.classList.add('tried'); }
        retryMarks = slots.map(function (ti, i) { return ti != null && item.tiles[ti].text === item.sequence[i] ? 'ok' : 'warn'; });
        drawSlots(false);
        if (win && typeof win.setTimeout === 'function') {
          retryTimer = win.setTimeout(function () {
            retryTimer = null;
            if (!retryMarks || !ctx.root.isConnected || ctx.isDone()) return;
            retryMarks = null;
            slots = item.sequence.map(function () { return null; });
            drawSlots(false);
          }, 1250);
        }
      }
    };
    var say = function (text) { if (typeof ctx.announce === 'function') ctx.announce(text); };
    item.tiles.forEach(function (tile, ti) {
      // The picture's number, the key 1-9 that chooses it.
      var number = ti < 9 ? ctx.el('span', { 'aria-hidden': 'true', 'data-key-number': '', style: 'position:absolute;top:6px;inset-inline-start:6px;min-width:28px;height:28px;line-height:26px;border-radius:14px;border:1px solid var(--accent-ink);background:var(--accent);color:var(--accent-ink);font-weight:700;font-size:1rem;text-align:center', text: String(ti + 1) }) : null;
      var pick = ctx.el('button', { type: 'button', 'aria-label': 'Picture ' + (ti + 1),
        style: 'position:relative;width:100%;display:flex;justify-content:center;background:#fff',
        on: { click: function () {
          if (ctx.isDone() || pick.getAttribute('aria-disabled') === 'true') return;
          if (retryMarks) stopRetryHold(true);
          if (slots.indexOf(ti) >= 0) return;
          var at = slots.indexOf(null);
          if (at < 0) return;
          slots[at] = ti;
          drawSlots(false);
          if (slots.indexOf(null) >= 0) {
            say(ctx.fmt(ctx.L.sentence_match_placed || '{word} is in slot {n}.', { word: 'Picture ' + (ti + 1), n: at + 1 }));
          } else {
            grade();
          }
        } } }, [number, ctx.el('img', { class: 'picture', src: imageOf[tile.text] || '', alt: '', style: 'max-width:min(100%,160px);height:auto;object-fit:contain' })]);
      var box = ctx.el('li', { class: 'choice' }, [pick]);
      tileCards.push({ text: tile.text, pick: pick, box: box, tried: false });
      tray.appendChild(box);
    });
    item.sequence.forEach(function (_, i) {
      var b = ctx.el('button', { type: 'button', class: 'slot', style: 'border-style:dashed;min-width:clamp(70px,21vw,96px);min-height:clamp(70px,21vw,96px);padding:6px',
        on: { click: function () {
          if (ctx.isDone()) return;
          if (retryMarks) {
            stopRetryHold(true);
            drawSlots(false);
            say(ctx.L.sentence_match_cleared || 'All the slots are empty again.');
            return;
          }
          if (slots[i] == null) return;
          var removedIdx = slots[i];
          slots[i] = null;
          drawSlots(false);
          say(ctx.fmt(ctx.L.sentence_match_removed || '{word} taken out of slot {n}.', { word: 'Picture ' + (removedIdx + 1), n: i + 1 }));
        } } });
      slotButtons.push(b);
      slotRow.appendChild(ctx.el('li', {}, [b]));
    });
    if (typeof ctx.keys === 'function') {
      ctx.keys(function (key) {
        if (ctx.isDone()) return false;
        var k = String(key == null ? '' : key);
        if (k === 'Backspace') {
          if (retryMarks) {
            stopRetryHold(true);
            drawSlots(false);
            say(ctx.L.sentence_match_cleared || 'All the slots are empty again.');
            return true;
          }
          for (var bi = slots.length - 1; bi >= 0; bi--) {
            if (slots[bi] != null) {
              var outIdx = slots[bi];
              slots[bi] = null;
              drawSlots(false);
              say(ctx.fmt(ctx.L.sentence_match_removed || '{word} taken out of slot {n}.', { word: 'Picture ' + (outIdx + 1), n: bi + 1 }));
              return true;
            }
          }
          return false;
        }
        if (k === 'Escape' || k === 'Esc') {
          if (retryMarks || slots.some(function (s) { return s != null; })) {
            stopRetryHold(true);
            slots = item.sequence.map(function () { return null; });
            drawSlots(false);
            say(ctx.L.sentence_match_cleared || 'All the slots are empty again.');
            return true;
          }
          return false;
        }
        return false;
      });
    }
    drawSlots(false);
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.L.sentence_match_prompt }));
    // data-read: running text, where the shell's reading focus can go.
    ctx.root.appendChild(ctx.el('p', { class: 'letters', lang: 'en', dir: 'ltr', style: 'font-size:clamp(1.25rem,5vw,1.8rem);overflow-wrap:anywhere', 'data-read': '', text: item.sentence }));
    if (item.sequence.length > 1) ctx.root.appendChild(ctx.el('p', { class: 'muted', text: ctx.L.sentence_match_order_hint }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.prompt); } }, text: ctx.L.sentence_match_hear_instructions }),
    ]));
    ctx.root.appendChild(slotRow);
    ctx.root.appendChild(tray);
    ctx.root.appendChild(after);
    return {
      stop: function () { stopRetryHold(false); },
      // After a right answer, once the praise is over, the sentence is read back by itself (the app's payoff).
      payoff: function () { if (item.sentenceAudio) ctx.play(item.sentenceAudio); },
      reveal: function () {
        stopRetryHold(false);
        // Each slot shows a tile of its word (the first one not used yet).
        var used = [];
        slots = item.sequence.map(function (word) {
          for (var k = 0; k < item.tiles.length; k++) if (item.tiles[k].text === word && used.indexOf(k) < 0) { used.push(k); return k; }
          return null;
        });
        drawSlots(true);
        tileCards.forEach(function (c) {
          c.pick.setAttribute('aria-label', ctx.fmt(ctx.L.sentence_match_picture_of, { word: c.text }));
          if (item.sequence.indexOf(c.text) >= 0) c.box.classList.add('right');
        });
        // The app's payoff: hear the finished sentence read back.
        if (item.sentenceAudio && !after.childNodes.length) {
          after.appendChild(ctx.el('button', { type: 'button', on: { click: function () { ctx.support('sentenceReadBacks'); ctx.play(item.sentenceAudio); } }, text: ctx.L.sentence_match_hear_sentence }));
        }
      },
    };
  },
};
