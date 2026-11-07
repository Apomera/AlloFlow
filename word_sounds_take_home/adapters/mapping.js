// Take-home adapter: Sound Mapping (mapping).
// App source of truth:
//   board   compileActivityItems (word_sounds_setup_source.jsx:4678-4683, 4807-4809):
//           { graphemes: one spelling per sound, joined = the word, chipOrder: shuffled
//           [{ id, text }] } or { supported: false, contentStatus: 'teacher_review_required' }.
//   data    soundMappingGraphemes (word_sounds_module.js:5018-5029): no board when
//           unsupported/review-required; else the first of board.graphemes,
//           item.graphemes, phoneme .grapheme fields, the word's letters whose length
//           equals the phoneme count and whose join is the word.
//   view    SoundMappingView (word_sounds_module.js:5030-5170): the word stays printed
//           (SMART_TEXT_VISIBILITY mapping 'alwaysOn', :7563), one slot per spelling,
//           a chip tray, tapping a chip fills the first empty slot and plays it,
//           tapping a filled slot empties it, "Listen to Word".
//   grading :5062-5066: as soon as the LAST slot fills, every slot's text must equal
//           graphemes[i] (plain string compare); onCheckAnswer -> checkAnswer(ans,
//           "correct") (:19681). Default budget 2 tries (:17130); a first miss stays
//           on the board, editable.
//   audio   instruction clip "mapping" (INST_KEY_MAP :16458); the word on request.
module.exports = {
  id: 'mapping',
  title: 'Sound Mapping',
  labels: {
    mapping_question: 'Put the spellings in order to build the word.',
    mapping_how: 'Tap a spelling to pick it up, then tap a slot to put it there. Tap a filled slot to take it out.',
    mapping_word: 'The word: {word}',
    mapping_tray: 'Spellings to place',
    mapping_slots: 'Spelling slots',
    mapping_slot_empty: 'Slot {n}, empty',
    mapping_slot_filled: 'Slot {n}: {spelling}',
    mapping_pick: 'Pick up {spelling}',
    mapping_listen: 'Listen to the sound of {spelling}',
    mapping_picked: '{spelling} picked up. Now choose a slot.',
    mapping_dropped: '{spelling} put back.',
    mapping_placed: '{spelling} is in slot {n}.',
    mapping_removed: '{spelling} taken out of slot {n}.',
    mapping_cleared: 'All the slots are empty again.',
    mapping_clear: 'Empty the slots',
    mapping_auto: 'Your answer is checked when every slot is full.',
    mapping_retry: 'Not quite. Take out a spelling and move it, then try once more.',
    mapping_correct: 'Yes! You spelled every sound.',
    mapping_missed: 'This is how the sounds are spelled: {spellings}. Listen.',
  },
  prepare: function (w, env) {
    var board = w && w.activityItems && w.activityItems.mapping;
    if (!board) return { missing: ['board'] };
    if (board.supported === false || board.unavailable || /review_required|needs_review/.test(board.contentStatus || '')) return { missing: ['board'] };
    var phonemes = Array.isArray(w.phonemes) ? w.phonemes : [];
    var spelling = String(env.word || '').trim().normalize('NFC').toLowerCase();
    var graphemes = [board.graphemes, w.graphemes, phonemes.map(function (p) { return p && typeof p === 'object' ? p.grapheme : ''; }), spelling.split('')]
      .filter(function (values) {
        return Array.isArray(values) && values.length > 0 && values.length === phonemes.length &&
          values.every(function (v) { return typeof v === 'string' && v.trim(); }) &&
          values.join('').trim().normalize('NFC').toLowerCase() === spelling;
      })[0];
    if (!graphemes) return { missing: ['board'] };
    graphemes = graphemes.map(String);
    // Tray order: the prepared chipOrder when it is a true shuffle of these
    // spellings. (The view reshuffles randomly; a file needs a fixed order.)
    var order = Array.isArray(board.chipOrder) && board.chipOrder.length === graphemes.length &&
      board.chipOrder.every(function (c) { return c && Number.isInteger(c.id) && graphemes[c.id] === String(c.text); }) &&
      board.chipOrder.map(function (c) { return c.id; }).filter(function (id, i, all) { return all.indexOf(id) === i; }).length === graphemes.length
      ? board.chipOrder.map(function (c) { return c.id; }) : graphemes.map(function (_, i) { return i; }).reverse();
    var inOrder = order.every(function (id, i) { return graphemes[id] === graphemes[i]; });
    if (inOrder && graphemes.length > 1) { var t = order[0]; order[0] = order[1]; order[1] = t; }
    var missing = [];
    var wordAudio = env.wordClip(env.word);
    if (!wordAudio) missing.push('word');
    var prompt = env.bankClip('instructions', 'mapping');
    if (!prompt) missing.push('question');
    // Each chip plays its sound: the word's own sound at that position.
    var clips = graphemes.map(function (g, i) {
      var label = env.label(phonemes[i]);
      var clip = (label && env.phonemeClip(label)) || env.phonemeClip(g);
      if (!clip) missing.push('/' + (label || g) + '/');
      return clip;
    });
    if (missing.length) return { missing: missing };
    return { item: {
      target: graphemes.join(' '), graphemes: graphemes,
      chips: order.map(function (id) { return { text: graphemes[id], audio: clips[id] }; }),
      wordAudio: wordAudio, promptAudio: prompt,
      introAudio: [prompt], answerAudio: [wordAudio],
    } };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var n = item.graphemes.length;
    var slots = [];
    for (var s = 0; s < n; s++) slots.push(null);
    var picked = null;
    var locked = function () { return ctx.isDone(); };
    var text = function (ci) { return item.chips[ci].text; };

    var tray = ctx.el('ul', { class: 'row', 'aria-label': L.mapping_tray, style: 'list-style:none;padding:0;margin:16px 0;gap:12px' });
    var chipEls = item.chips.map(function (chip, ci) {
      var pick = ctx.el('button', { type: 'button', class: 'primary', 'aria-pressed': 'false',
        'aria-label': ctx.fmt(L.mapping_pick, { spelling: chip.text }),
        style: 'min-width:72px;min-height:56px;font-size:1.5rem;font-weight:700',
        on: { click: function () { onChip(ci); } } }, [chip.text]);
      var listen = ctx.el('button', { type: 'button', 'aria-label': ctx.fmt(L.mapping_listen, { spelling: chip.text }),
        on: { click: function () { ctx.support('soundListens'); ctx.play(chip.audio); } } }, ['▶']);
      var li = ctx.el('li', { class: 'row', style: 'gap:6px;border:2px solid var(--line);border-radius:14px;padding:6px' }, [pick, listen]);
      tray.appendChild(li);
      return { li: li, pick: pick };
    });
    var slotList = ctx.el('ol', { class: 'slots', 'aria-label': L.mapping_slots });
    var slotEls = slots.map(function (_, si) {
      var btn = ctx.el('button', { type: 'button', class: 'slot', style: 'min-width:80px;min-height:80px;font-size:1.5rem;font-weight:700',
        on: { click: function () { onSlot(si); } } });
      slotList.appendChild(ctx.el('li', {}, [btn]));
      return btn;
    });
    var clearBtn = ctx.el('button', { type: 'button', on: { click: function () {
      if (locked()) return;
      picked = null;
      for (var i = 0; i < n; i++) slots[i] = null;
      draw(); ctx.announce(L.mapping_cleared);
    } }, text: L.mapping_clear });

    var draw = function () {
      chipEls.forEach(function (c, ci) {
        c.li.hidden = slots.indexOf(ci) >= 0;
        c.pick.setAttribute('aria-pressed', picked === ci ? 'true' : 'false');
        if (locked()) c.pick.setAttribute('aria-disabled', 'true');
      });
      slotEls.forEach(function (btn, si) {
        var ci = slots[si];
        btn.textContent = ci == null ? String(si + 1) : text(ci);
        btn.style.borderStyle = ci == null ? 'dashed' : 'solid';
        btn.style.borderColor = ci == null ? 'var(--muted)' : 'var(--accent)';
        btn.setAttribute('aria-label', ci == null ? ctx.fmt(L.mapping_slot_empty, { n: si + 1 }) : ctx.fmt(L.mapping_slot_filled, { n: si + 1, spelling: text(ci) }));
        if (locked()) btn.setAttribute('aria-disabled', 'true');
      });
      if (locked()) clearBtn.setAttribute('aria-disabled', 'true');
    };
    var onChip = function (ci) {
      if (locked() || slots.indexOf(ci) >= 0) return;
      if (picked === ci) { picked = null; draw(); ctx.announce(ctx.fmt(L.mapping_dropped, { spelling: text(ci) })); return; }
      picked = ci;
      draw();
      ctx.play(item.chips[ci].audio);
      ctx.announce(ctx.fmt(L.mapping_picked, { spelling: text(ci) }));
      var empty = slots.indexOf(null);
      slotEls[empty >= 0 ? empty : 0].focus();
    };
    var onSlot = function (si) {
      if (locked()) return;
      if (picked == null) {
        var out = slots[si];
        if (out == null) { ctx.announce(L.mapping_how); return; }
        slots[si] = null;
        draw();
        ctx.announce(ctx.fmt(L.mapping_removed, { spelling: text(out), n: si + 1 }));
        return;
      }
      var ci = picked;
      picked = null;
      slots[si] = ci; // a chip already there goes back to the tray
      draw();
      if (slots.indexOf(null) >= 0) {
        ctx.play(item.chips[ci].audio);
        ctx.announce(ctx.fmt(L.mapping_placed, { spelling: text(ci), n: si + 1 }));
        for (var k = 0; k < chipEls.length; k++) if (slots.indexOf(k) < 0) { chipEls[k].pick.focus(); break; }
        return;
      }
      // The last slot filled: grade the arrangement now (:5062-5066).
      var right = slots.every(function (c, i) { return String(text(c)) === String(item.graphemes[i]); });
      ctx.answer(slots.map(text).join(' '), right, {
        correctText: L.mapping_correct,
        retryText: L.mapping_retry,
        missedText: ctx.fmt(L.mapping_missed, { spellings: item.graphemes.join(' ') }),
      });
      // A first miss stays on the board to be fixed.
    };

    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: L.mapping_question }));
    ctx.root.appendChild(ctx.el('p', { class: 'letters', text: ctx.fmt(L.mapping_word, { word: item.word }) }));
    ctx.root.appendChild(ctx.el('p', { class: 'muted', text: L.mapping_how + ' ' + L.mapping_auto }));
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('questionReplays'); ctx.play(item.promptAudio); } }, text: L.hear_question }),
      ctx.el('button', { type: 'button', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio); } }, text: L.hear_word }),
    ]));
    ctx.root.appendChild(slotList);
    ctx.root.appendChild(ctx.el('div', { class: 'row' }, [clearBtn]));
    ctx.root.appendChild(tray);
    draw();
    return {
      reveal: function (correct) {
        picked = null;
        if (!correct) {
          var used = [];
          for (var i = 0; i < n; i++) {
            var hit = -1;
            for (var ci = 0; ci < item.chips.length && hit < 0; ci++) if (used.indexOf(ci) < 0 && item.chips[ci].text === item.graphemes[i]) hit = ci;
            used.push(hit);
            slots[i] = hit;
          }
        }
        draw();
        slotEls.forEach(function (btn) { btn.style.borderColor = 'var(--ok)'; btn.style.background = 'var(--ok-bg)'; });
      },
    };
  },
};
